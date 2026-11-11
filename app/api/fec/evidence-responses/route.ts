import {createHash,randomUUID} from "node:crypto";
import {type NextRequest} from "next/server";
import type {SupabaseClient} from "@supabase/supabase-js";
import {fecResponse,fecSession} from "@/lib/fec-server";
import {withFecCapacity} from "@/lib/fec-intake-capacity";
import {verifyFecStoredFile} from "@/lib/fec-integrity-server";
import {isSameOriginRequest,readBoundedFormData,validFecFileType} from "@/lib/fec-intake-http";
import {extractFecPdf} from "@/lib/fec-pdf-isolated";
import {FEC_MAX_UPLOAD,uuidRx} from "@/lib/fec-import-persistence";
export const runtime="nodejs";
export const maxDuration=60;
const bucket="fec-evidence-private";
const missing=(error:{status?:number;statusCode?:string|number}|null)=>error?.status===404||String(error?.statusCode)==="404";
export async function POST(request:NextRequest){
 if(!isSameOriginRequest(request))return fecResponse({error:"Origem não permitida."},403);
 const session=await fecSession();if(session.response)return session.response;
 if(process.env.SEMEAR_FEC_DOCUMENT_INTAKE_ENABLED!=="true")return fecResponse({error:"Acervo indisponível."},503);
 if(!process.env.SUPABASE_SERVICE_ROLE_KEY)return fecResponse({error:"Conferência automática indisponível."},503);
 const db=session.db as unknown as SupabaseClient;
 return withFecCapacity(db,async()=>{
  let form:FormData;try{form=await readBoundedFormData(request,FEC_MAX_UPLOAD+262144);}catch{return fecResponse({error:"Envie um PDF de até 4 MB."},413);}
  const requestReviewId=form.get("requestReviewId"),formId=form.get("formId"),date=form.get("fieldDate"),method=form.get("method"),responsible=form.get("responsibleRef"),source=form.get("sourceRef"),explanation=form.get("explanation"),items=form.getAll("file");
  if(typeof requestReviewId!=="string"||!uuidRx.test(requestReviewId)||typeof formId!=="string"||!uuidRx.test(formId)||
   typeof date!=="string"||!/^20\d{2}-\d{2}-\d{2}$/.test(date)||typeof method!=="string"||method.trim().length<5||method.length>1000||
   typeof responsible!=="string"||responsible.trim().length<5||responsible.length>300||typeof source!=="string"||source.trim().length<5||source.length>600||
   typeof explanation!=="string"||explanation.trim().length<20||explanation.length>3000||items.length!==1||!(items[0] instanceof File))return fecResponse({error:"Resposta ou evidência inválida."},400);
  const file=items[0] as File;if(file.size<1||file.size>FEC_MAX_UPLOAD)return fecResponse({error:"O PDF precisa ter até 4 MB."},413);
  const bytes=Buffer.from(await file.arrayBuffer());if(!validFecFileType(file.name,file.type,bytes))return fecResponse({error:"Somente PDF válido é aceito."},415);
  try{await extractFecPdf(bytes);}catch{return fecResponse({error:"PDF inválido ou fora dos limites de processamento."},422);}
  const sha=createHash("sha256").update(bytes).digest("hex");
  const find=()=>db.from("fec_evidence_responses").select("id,form_id,owner_id,field_date,method,responsible_ref,source_ref,explanation,evidence_sha256,evidence_size,object_name,upload_state").eq("request_review_id",requestReviewId).maybeSingle();
  let found=await find();if(found.error)return fecResponse({error:"Resposta indisponível."},503);
  if(!found.data){const id=randomUUID();const inserted=await db.from("fec_evidence_responses").insert({id,request_review_id:requestReviewId,form_id:formId,owner_id:session.userId,field_date:date,method:method.trim(),responsible_ref:responsible.trim(),source_ref:source.trim(),explanation:explanation.trim(),evidence_sha256:sha,evidence_size:bytes.length,object_name:`${id}/${randomUUID()}.pdf`});
   if(inserted.error){found=await find();if(found.error||!found.data)return fecResponse({error:"Resposta não autorizada, evidência reutilizada ou solicitação encerrada."},409);}else found=await find();}
  const row=found.data;
  if(!row||row.form_id!==formId||row.owner_id!==session.userId||row.field_date!==date||row.method!==method.trim()||row.responsible_ref!==responsible.trim()||row.source_ref!==source.trim()||row.explanation!==explanation.trim()||row.evidence_sha256!==sha||row.evidence_size!==bytes.length)return fecResponse({error:"A tentativa diverge da resposta já registrada; nada foi substituído."},409);
  const storage=db.storage.from(bucket);let downloaded=await storage.download(row.object_name);
  if(!downloaded.data){if(!missing(downloaded.error)||row.upload_state!=="reserved")return fecResponse({error:"Evidência indisponível; nenhuma substituição foi feita."},409);
   await storage.upload(row.object_name,bytes,{contentType:"application/pdf",upsert:false,cacheControl:"0"});
   for(let attempt=0;attempt<5;attempt++){downloaded=await storage.download(row.object_name);if(downloaded.data||!missing(downloaded.error))break;if(attempt<4)await new Promise(resolve=>setTimeout(resolve,150*(attempt+1)));}}
  if(!downloaded.data||downloaded.data.size!==bytes.length||createHash("sha256").update(Buffer.from(await downloaded.data.arrayBuffer())).digest("hex")!==sha)return fecResponse({error:"Conferência de integridade pendente; tente novamente com o mesmo arquivo.",responseId:row.id},409);
  if(row.upload_state==="reserved"){const updated=await db.from("fec_evidence_responses").update({upload_state:"uploaded"}).eq("id",row.id).eq("upload_state","reserved").select("id").maybeSingle();if(updated.error||!updated.data){const current=await find();if(current.data?.upload_state!=="uploaded")return fecResponse({error:"Confirmação de armazenamento pendente.",responseId:row.id},409);}}
  try{await verifyFecStoredFile(db,"evidence",row.id);}catch{return fecResponse({error:"Não foi possível comprovar a integridade ou a independência do arquivo.",responseId:row.id},409);}
  return fecResponse({responseId:row.id,status:"response_and_evidence_received",interviewProven:false,requiresHumanReview:true},201);
 });
}
export async function GET(request:NextRequest){
 const session=await fecSession();if(session.response)return session.response;
 if(process.env.SEMEAR_FEC_DOCUMENT_INTAKE_ENABLED!=="true")return fecResponse({error:"Acervo indisponível."},503);
 const id=request.nextUrl.searchParams.get("id");if(!id||!uuidRx.test(id))return fecResponse({error:"Resposta inválida."},400);
 const db=session.db as unknown as SupabaseClient;const result=await db.from("fec_evidence_responses").select("object_name,upload_state").eq("id",id).maybeSingle();
 if(result.error||!result.data||result.data.upload_state!=="uploaded")return fecResponse({error:"Evidência indisponível."},404);
 const signed=await db.storage.from(bucket).createSignedUrl(result.data.object_name,60);if(signed.error||!signed.data)return fecResponse({error:"Acesso recusado."},403);
 return fecResponse({url:signed.data.signedUrl,expiresInSeconds:60});
}
