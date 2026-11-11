import {verifyFecStoredFile} from "@/lib/fec-integrity-server";
import {type NextRequest} from "next/server";
import type {SupabaseClient} from "@supabase/supabase-js";
import {fecSession,fecResponse} from "@/lib/fec-server";
import {reviewSubmissionIssues,uuidRx} from "@/lib/fec-import-persistence";
import {isSameOriginRequest,readBoundedBody} from "@/lib/fec-intake-http";

export async function POST(req:NextRequest){
 if(!isSameOriginRequest(req))return fecResponse({error:"Origem da solicitação não permitida."},403);
 const session=await fecSession();if(session.response)return session.response;
 if(process.env.SEMEAR_FEC_DOCUMENT_INTAKE_ENABLED!=="true")
   return fecResponse({error:"Revisão documental ainda não habilitada."},503);
 let data:unknown;
 try{const raw=await readBoundedBody(req,16000);data=JSON.parse(new TextDecoder().decode(raw));}
 catch{return fecResponse({error:"JSON inválido ou excessivo."},400);}
 if(data&&typeof data==="object"&&!Array.isArray(data)&&"reportId" in data){
  const p=data as Record<string,unknown>;const keys=["reportId","expectedRevision","decision","reason"];
  if(Object.keys(p).some(k=>!keys.includes(k))||typeof p.reportId!=="string"||!uuidRx.test(p.reportId)||!Number.isInteger(p.expectedRevision)||Number(p.expectedRevision)<0||Number(p.expectedRevision)>2147483646||!["document_checked","needs_changes"].includes(String(p.decision))||typeof p.reason!=="string"||p.reason.length>3000||(p.decision==="needs_changes"&&p.reason.trim().length<20))return fecResponse({error:"Conferência inválida; justifique pedidos de ajuste."},400);
  const db=session.db as unknown as SupabaseClient;
  const batch=await db.from("fec_import_batches").select("id,owner_id,cycle_id").eq("id",p.reportId).maybeSingle();
  if(batch.error||!batch.data||batch.data.owner_id===session.userId)return fecResponse({error:"Relatório indisponível para conferência."},403);
  const cycle=await db.from("fec_cycles").select("engagement_id").eq("id",batch.data.cycle_id).maybeSingle();
  if(cycle.error||!cycle.data)return fecResponse({error:"Relatório indisponível."},403);
  const grant=await db.from("fec_access_grants").select("id").eq("engagement_id",cycle.data.engagement_id).eq("user_id",session.userId).eq("role","supervisor").eq("active",true).limit(1);
  if(grant.error||!grant.data?.length)return fecResponse({error:"Conferência disponível à coordenação designada."},403);
  const docs=await db.from("fec_import_documents").select("id,upload_state").eq("batch_id",p.reportId);
  if(docs.error||!docs.data?.length||docs.data.some(d=>d.upload_state!=="uploaded"))return fecResponse({error:"Arquivos ainda não estão disponíveis."},409);
  try{for(const d of docs.data)await verifyFecStoredFile(db,"document",d.id);}catch{return fecResponse({error:"Não foi possível conferir os arquivos. Tente novamente."},409);}
  const result=await db.from("fec_report_reviews").insert({batch_id:p.reportId,reviewer_id:session.userId,revision:Number(p.expectedRevision)+1,decision:p.decision,reason:p.reason.trim()}).select("id,revision,decision,created_at").single();
  if(result.error||!result.data)return fecResponse({error:"Conferência alterada ou indisponível; atualize e tente novamente."},409);
  return fecResponse({review:result.data,interviewsProven:false,officialIndicatorsUpdated:false},201);
 }
 const preliminary=reviewSubmissionIssues(data,false);
 if(preliminary.length)return fecResponse({error:"Campos inválidos.",issues:preliminary},400);
 const payload=data as Record<string,unknown>;
 const db=session.db as unknown as SupabaseClient;
 const {data:form,error:formError}=await db.from("fec_import_forms")
  .select("id,simulated_overlap,comparison_verified,document_id").eq("id",payload.formId).maybeSingle();
 if(formError||!form)return fecResponse({error:"Ficha inacessível."},404);
 const issues=reviewSubmissionIssues(data,form.simulated_overlap);
 if(issues.length)return fecResponse({error:"Decisão bloqueada.",issues},409);
 if(payload.decision==="attested_pending_technical_review" && form.comparison_verified!==true)
  return fecResponse({error:"Comparação independente ainda não verificada por processo confiável; a atestação permanece bloqueada."},409);
 const {data:document,error:docError}=await db.from("fec_import_documents")
  .select("id,batch_id,upload_state").eq("id",form.document_id).maybeSingle();
 if(docError||!document||document.upload_state!=="uploaded")
  return fecResponse({error:"Documento original ainda não está arquivado integralmente."},409);
 const {data:batch,error:batchError}=await db.from("fec_import_batches")
  .select("id,owner_id,cycle_id").eq("id",document.batch_id).maybeSingle();
 if(batchError||!batch)return fecResponse({error:"Lote não disponível."},404);
 if(batch.owner_id===session.userId)return fecResponse({error:"O executor não pode revisar a própria fonte."},403);
 const {data:cycle,error:cycleError}=await db.from("fec_cycles")
   .select("id,engagement_id").eq("id",batch.cycle_id).maybeSingle();
 if(cycleError||!cycle)return fecResponse({error:"Ciclo de origem indisponível."},403);
 const {data:grants,error:grantError}=await db.from("fec_access_grants")
  .select("id").eq("engagement_id",cycle.engagement_id).eq("user_id",session.userId)
  .eq("role","supervisor").eq("active",true).limit(1);
 if(grantError||!grants?.length)return fecResponse({error:"Somente supervisor formalmente designado pode revisar."},403);
 if(payload.decision==="inconclusive"||payload.decision==="evidence_reviewed"){
  const evidence=await db.from("fec_evidence_responses").select("id,form_id,upload_state").eq("id",payload.responseId).maybeSingle();
  if(evidence.error||!evidence.data||evidence.data.form_id!==payload.formId||evidence.data.upload_state!=="uploaded")return fecResponse({error:"Resposta ou evidência indisponível."},409);
  try{await verifyFecStoredFile(db,"evidence",evidence.data.id);}catch{return fecResponse({error:"Evidência não pôde ser conferida ou sua integridade diverge."},409);}
 }
 const {data:review,error}=await db.from("fec_import_reviews").insert({
  form_id:payload.formId,response_id:payload.responseId??null,revision:(payload.expectedRevision as number)+1,reviewer_id:session.userId,decision:payload.decision,
  reason:(payload.reason as string).trim(),independent_evidence_ref:(payload.independentEvidenceRef as string).trim(),
  field_date:payload.fieldDate??null,interviewer_ref:typeof payload.interviewerRef==="string"?payload.interviewerRef.trim():"",
  evidence_method:typeof payload.evidenceMethod==="string"?payload.evidenceMethod.trim():"",evidence_origin:typeof payload.evidenceOrigin==="string"?payload.evidenceOrigin.trim():"",
  evidence_location:typeof payload.evidenceLocation==="string"?payload.evidenceLocation.trim():"",interviewer_confirmation:payload.interviewerConfirmation,
  six_vs_ten_reconciled:payload.sixVsTenReconciled,
 }).select("id,decision,created_at").single();
 if(error||!review)return fecResponse({error:"A revisão não foi registrada. Atualize o histórico e confira autorização e bloqueios de origem."},409);
 return fecResponse({review,status:"documentary_review_recorded",officialIndicatorsUpdated:false,
  automaticPromotion:false,requiresTechnicalApproval:true},201);
}
