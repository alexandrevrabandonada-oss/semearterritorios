import { createHash } from "node:crypto";
import { type NextRequest } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { fecResponse, fecSession } from "@/lib/fec-server";
import {withFecCapacity} from "@/lib/fec-intake-capacity";
import {verifyFecStoredFile} from "@/lib/fec-integrity-server";
import { extractFecPdf } from "@/lib/fec-pdf-isolated";
import { extractFecDocx } from "@/lib/fec-docx-isolated";
import { FEC_IMPORT_BUCKET, FEC_MAX_UPLOAD, FEC_MAX_TOTAL_BYTES, uuidRx, validFecMonth, validateFecIntake, type IntakeInput } from "@/lib/fec-import-persistence";
import { isSameOriginRequest, readBoundedFormData, validFecFileType } from "@/lib/fec-intake-http";
import { intakeKey, makeManifest, reconcileIntake, type ManifestEntry, type ReconcileStore } from "@/lib/fec-import-reconcile";

export const runtime = "nodejs";
export const maxDuration = 60;
// Flag separada: PREVIEW FEC pode estar disponível sem permitir gravação documental.
const enabled = () => process.env.SEMEAR_FEC_DOCUMENT_INTAKE_ENABLED === "true";
const privateResponse = (body:object,status=200) => fecResponse(body,status);

export async function POST(req: NextRequest) {
  if(!isSameOriginRequest(req))return privateResponse({error:"Origem da solicitação não permitida."},403);
  const session = await fecSession();
  if(session.response)return session.response;
  if(!enabled())return privateResponse({error:"Arquivamento privado ainda não habilitado."},503);
  if(!process.env.SUPABASE_SERVICE_ROLE_KEY)return privateResponse({error:"Conferência automática indisponível."},503);
  const db = session.db as unknown as SupabaseClient;
  return withFecCapacity(db,async()=>{
  let form:FormData;
  try{form=await readBoundedFormData(req,FEC_MAX_TOTAL_BYTES+262144);}catch{return privateResponse({error:"Envie PDF/DOCX com até 4 MB no total por este formulário."},413);}
  const cycleId=form.get("cycleId");const month=form.get("month");
  const descriptionValue=form.get("description");
  if(descriptionValue!==null&&(typeof descriptionValue!=="string"||descriptionValue.length>2000))return privateResponse({error:"Resumo inválido."},400);
  const description=typeof descriptionValue==="string"?descriptionValue.trim():"";
  if(typeof cycleId!=="string"||!uuidRx.test(cycleId)||!validFecMonth(month))
    return privateResponse({error:"Selecione ciclo FEC e mês de referência válidos."},400);
  const reportPart=form.get("report");
  const questionnairesPart=form.get("questionnaires");
  const attachmentParts=form.getAll("attachments");
  if(!(reportPart instanceof File)||
     (questionnairesPart!==null&&!(questionnairesPart instanceof File))||
     attachmentParts.length>4||attachmentParts.some(item=>!(item instanceof File)))
    return privateResponse({error:"Selecione o relatório e confira os arquivos anexados."},400);
  const picked=[
    {file:reportPart,kind:"monthly_report" as const},
    ...(questionnairesPart instanceof File?[{file:questionnairesPart,kind:"questionnaires" as const}]:[]),
    ...attachmentParts.map(file=>({file:file as File,kind:"supporting" as const})),
  ];
  if(picked.length>6)return privateResponse({error:"Envie até quatro anexos além do relatório e das fichas."},400);
  if(picked.some(({file})=>file.size<1||file.size>FEC_MAX_UPLOAD)||
     picked.reduce((sum,{file})=>sum+file.size,0)>FEC_MAX_TOTAL_BYTES)
    return privateResponse({error:"O total de PDFs/DOCX precisa ter até 4 MB."},413);
  const {data:cycle,error:cycleError}=await db.from("fec_cycles")
    .select("id,owner_id,engagement_id,status").eq("id",cycleId).maybeSingle();
  if(cycleError||!cycle||cycle.owner_id!==session.userId||!(["draft","needs_changes"] as string[]).includes(cycle.status))
    return privateResponse({error:"O ciclo FEC não está disponível para inclusão pelo executor."},403);
  const {data:grants,error:grantError}=await db.from("fec_access_grants")
    .select("id").eq("engagement_id",cycle.engagement_id).eq("user_id",session.userId)
    .eq("role","executor").eq("active",true).limit(1);
  if(grantError||!grants?.length)return privateResponse({error:"Atribuição contratual FEC não autorizada."},403);
  const inputs:IntakeInput[]=[];
  for(const {file,kind} of picked){
    const buffer=Buffer.from(await file.arrayBuffer());
    const ext=file.name.split(".").at(-1)?.toLowerCase();
    if(ext!=="pdf"&&ext!=="docx")return privateResponse({error:"Aceitamos somente PDF e DOCX neste fluxo."},415);
    if(!validFecFileType(file.name,file.type,buffer))return privateResponse({error:"Extensão, tipo ou assinatura do arquivo inválidos."},415);
    try{
      const text=kind==="supporting"?"":ext==="pdf"?await extractFecPdf(buffer):await extractFecDocx(buffer);
      inputs.push({fileName:file.name,buffer,text,kind});
    }
    catch{return privateResponse({error:"Falha de extração. Nenhum lote foi criado."},422);}
  }
  let intake;
  try{intake=validateFecIntake(month,inputs);}catch(err){return privateResponse({error:err instanceof Error?err.message:"Documentos inválidos."},422);}
  const key=intakeKey(cycleId,session.userId,intake);
  let batchLease:string|null=null;
  for(let attempt=0;attempt<30;attempt++){
    const acquired=await db.rpc("fec_import_acquire_batch",{p_cycle:cycleId,p_key:key});
    if(acquired.error)return privateResponse({error:"Controle de reconciliação indisponível."},503);
    if(typeof acquired.data==="string"){batchLease=acquired.data;break;}
    if(attempt<29)await new Promise(resolve=>setTimeout(resolve,200));
  }
  if(!batchLease)return privateResponse({error:"Outra importação está em andamento; tente novamente com os mesmos arquivos.",retryWithSameFiles:true},409);
  try {
  const lookup=()=>db.from("fec_import_batches").select("id,manifest,description").eq("cycle_id",cycleId).eq("intake_key",key).maybeSingle();
  let found=await lookup();
  if(found.error)return privateResponse({error:"Não foi possível consultar o lote; tente novamente."},503);
  let batch=found.data;
  if(!batch){
    const created=await db.from("fec_import_batches").insert({cycle_id:cycleId,owner_id:session.userId,reference_month:month+"-01",intake_key:key,manifest:makeManifest(intake.files),description,suggestions:{activities:intake.preview.activities.slice(0,100).map(a=>({...a,description:a.description.slice(0,600)})),warnings:intake.preview.warnings.slice(0,50)}}).select("id,manifest,description").single();
    if(created.error){found=await lookup();if(found.error||!found.data)return privateResponse({error:"Falha ao criar lote ou limite atingido."},409);batch=found.data;}
    else batch=created.data;
  }
  if(!batch)return privateResponse({error:"Lote indisponível."},503);
  if(batch.description!==description)return privateResponse({error:"O resumo difere do envio anterior. Use o mesmo resumo para retomar."},409);
  const state=new Map<string,string>();
  const stable=(value:unknown):string=>JSON.stringify(value,(_key,item)=>item&&typeof item==="object"&&!Array.isArray(item)?Object.fromEntries(Object.entries(item).sort(([a],[b])=>a.localeCompare(b))):item);
  const docFields="id,batch_id,cycle_id,owner_id,kind,source_name,sha256,mime_type,byte_size,object_name,upload_state";
  const getDocument=(id:string)=>db.from("fec_import_documents").select(docFields).eq("id",id).maybeSingle();
  const storage=db.storage.from(FEC_IMPORT_BUCKET);
  const adapter:ReconcileStore={
    async ensureReservation(entry){
      let result=await getDocument(entry.id);
      if(result.error)throw new Error("Não foi possível consultar a reserva.");
      if(!result.data){
        const inserted=await db.from("fec_import_documents").insert({...entry,batch_id:batch!.id,cycle_id:cycleId,owner_id:session.userId,upload_state:"reserved"});
        if(inserted.error){result=await getDocument(entry.id);if(result.error||!result.data)throw new Error("Reserva indisponível ou documento já usado em outro lote.");}
        else result=await getDocument(entry.id);
      }
      const doc=result.data;
      if(!doc||doc.batch_id!==batch!.id||doc.cycle_id!==cycleId||doc.owner_id!==session.userId||
        (["kind","source_name","sha256","mime_type","byte_size","object_name"] as const).some(k=>doc[k]!==entry[k])||
        !["reserved","uploaded"].includes(doc.upload_state))throw new Error("Metadados da reserva divergentes; interrompido.");
      state.set(entry.id,doc.upload_state);
    },
    async ensureOriginal(entry,bytes){
      let result=await storage.download(entry.object_name);
      if(!result.data){
        if((result.error?.status!==404 && String(result.error?.statusCode)!=="404") || state.get(entry.id)!=="reserved")throw new Error("Original indisponível; não foi sobrescrito.");
        const upload=await storage.upload(entry.object_name,bytes,{contentType:entry.mime_type,upsert:false,cacheControl:"0"});
        // Uma concorrência pode ter concluído o upload; sempre verificar os bytes guardados.
        for(let attempt=0;attempt<5;attempt++) {
          result=await storage.download(entry.object_name);
          if(result.data)break;
          if(result.error?.status!==404 && String(result.error?.statusCode)!=="404")break;
          if(attempt<4)await new Promise(resolve=>setTimeout(resolve,150*(attempt+1)));
        }
        if(!result.data)throw new Error(upload.error?"Upload privado não concluído; tente reconciliar novamente.":"Não foi possível verificar o original.");
      }
      if(result.data.size!==entry.byte_size||createHash("sha256").update(Buffer.from(await result.data.arrayBuffer())).digest("hex")!==entry.sha256)
        throw new Error("Original armazenado difere do SHA-256; não foi sobrescrito.");
    },
    async markUploaded(entry){
      if(state.get(entry.id)==="uploaded"){await verifyFecStoredFile(db,"document",entry.id);return;}
      const updated=await db.from("fec_import_documents").update({upload_state:"uploaded"}).eq("id",entry.id).eq("upload_state","reserved").select("id").maybeSingle();
      if(updated.error||!updated.data){const current=await getDocument(entry.id);if(current.error||current.data?.upload_state!=="uploaded")throw new Error("Confirmação de upload pendente.");}
      state.set(entry.id,"uploaded");
      await verifyFecStoredFile(db,"document",entry.id);
    },
    async ensureForms(documentId,forms){
      const expected=forms.map(f=>({document_id:documentId,code:f.code,source_code:f.sourceCode,locality:f.locality,source_pages:f.sourcePages,questions:f.questions,simulated_overlap:f.simulatedOverlap}));
      const read=()=>db.from("fec_import_forms").select("document_id,code,source_code,locality,source_pages,questions,simulated_overlap").eq("document_id",documentId).order("code").limit(201);
      let current=await read();if(current.error||!current.data||current.data.length>expected.length)throw new Error("Fichas existentes não conferem com o lote.");
      const expectedByCode=new Map(expected.map(row=>[row.code,row]));
      if(current.data.some(row=>!expectedByCode.has(row.code)||stable(row)!==stable(expectedByCode.get(row.code))))throw new Error("Transcrição existente diverge; nenhuma ficha foi substituída.");
      const existing=new Set(current.data.map(row=>row.code));const missing=expected.filter(row=>!existing.has(row.code));
      if(missing.length){await db.from("fec_import_forms").insert(missing);current=await read();}
      if(current.error||!current.data||current.data.length!==expected.length||current.data.some(row=>!expectedByCode.has(row.code)||stable(row)!==stable(expectedByCode.get(row.code))))throw new Error("Fichas pendentes de reconciliação; nenhum conteúdo foi sobrescrito.");
    }
  };
  let result;
  try{result=await reconcileIntake(batch.manifest,intake,adapter);}catch(err){return privateResponse({error:err instanceof Error?err.message:"Reconciliação pendente.",batchId:batch.id,retryWithSameFiles:true},409);}
  // Indicadores permanecem NULL. Dados não homologados nunca entram na APS.
  return privateResponse({batchId:batch.id,documents:result.documents,documentaryForms:result.documentaryForms,
    simulatedExampleOverlaps:intake.forms.filter(f=>f.simulatedOverlap===true).length,
    comparisonUnassessed:intake.forms.filter(f=>f.simulatedOverlap===null).length,
    status:"pending_human_review",officialInterviewCount:null,uniquePeopleCount:null,
    published:false,monthlyReportUpdated:false},201);
  } finally { try { await db.rpc("fec_import_release_batch",{p_lease:batchLease}); } catch { /* A expiração libera a reserva. */ } }
  });
}

export async function GET(req:NextRequest){
  const session=await fecSession();if(session.response)return session.response;
  if(!enabled())return privateResponse({error:"Arquivamento privado não habilitado."},503);
  const db=session.db as unknown as SupabaseClient;
  const batchId=req.nextUrl.searchParams.get("batchId");
  const cycleId=req.nextUrl.searchParams.get("cycleId");
  if(batchId && !uuidRx.test(batchId))return privateResponse({error:"Lote inválido."},400);
  if(!batchId&&(!cycleId||!uuidRx.test(cycleId)))return privateResponse({error:"Informe batchId ou cycleId."},400);
  if(!batchId){
    const {data,error}=await db.from("fec_import_batches").select("id,cycle_id,reference_month,created_at,description")
      .eq("cycle_id",cycleId).order("created_at",{ascending:false}).limit(51);
    if(error)return privateResponse({error:"Lotes indisponíveis."},503);
    if((data?.length??0)>50)return privateResponse({error:"Volume exige paginação."},409);
    return privateResponse({batches:data??[],private:true});
  }
  const {data:batch,error}=await db.from("fec_import_batches").select("id,cycle_id,reference_month,created_at,owner_id,description,suggestions")
    .eq("id",batchId).maybeSingle();
  if(error||!batch)return privateResponse({error:"Lote não encontrado ou acesso negado."},404);
  const {data:documents,error:documentsError}=await db.from("fec_import_documents")
    .select("id,kind,source_name,sha256,byte_size,upload_state,created_at")
    .eq("batch_id",batchId).limit(6);
  if(documentsError||!documents)return privateResponse({error:"Documentos inacessíveis."},503);
  const docIds=documents.map(d=>d.id);
  const forms=docIds.length?await db.from("fec_import_forms")
    .select("id,document_id,code,source_code,locality,source_pages,questions,simulated_overlap,comparison_verified")
    .in("document_id",docIds).order("code").limit(201):{data:[],error:null};
  if(forms.error||(forms.data?.length??0)>200)return privateResponse({error:"Fichas indisponíveis ou excedem o limite."},503);
  const ids=(forms.data??[]).map(f=>f.id);
  const reviews=ids.length?await db.from("fec_import_reviews")
    .select("id,form_id,response_id,revision,reviewer_id,decision,reason,independent_evidence_ref,field_date,interviewer_confirmation,six_vs_ten_reconciled,created_at")
    .in("form_id",ids).order("revision",{ascending:false}).limit(501):{data:[],error:null};
  if(reviews.error||(reviews.data?.length??0)>500)return privateResponse({error:"Histórico exige paginação."},409);
  const responses=ids.length?await db.from("fec_evidence_responses").select("id,request_review_id,form_id,field_date,method,responsible_ref,source_ref,explanation,evidence_sha256,evidence_size,upload_state,created_at").in("form_id",ids).order("created_at",{ascending:false}).limit(501):{data:[],error:null};
  if(responses.error||(responses.data?.length??0)>500)return privateResponse({error:"Respostas exigem paginação."},409);
  const reportReviews=await db.from("fec_report_reviews").select("id,revision,reviewer_id,decision,reason,created_at").eq("batch_id",batch.id).order("revision",{ascending:false}).limit(101);
  if(reportReviews.error||(reportReviews.data?.length??0)>100)return privateResponse({error:"Histórico indisponível."},503);
  const activities=await db.from("fec_activities").select("id,activity_date,objective,status").eq("cycle_id",batch.cycle_id).order("activity_date",{ascending:false}).limit(101);
  if(activities.error)return privateResponse({error:"Atividades indisponíveis."},503);
  return privateResponse({batch,documents,forms:forms.data??[],reviews:reviews.data??[],responses:responses.data??[],reportReviews:reportReviews.data??[],activities:(activities.data??[]).slice(0,100),activitiesTruncated:(activities.data?.length??0)>100,
    source:"private_documentary_intake",countsAreOfficial:false,uniquePeopleCount:null});
}
