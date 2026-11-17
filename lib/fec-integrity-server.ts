import "server-only";
import {createHash} from "node:crypto";
import {createClient,type SupabaseClient} from "@supabase/supabase-js";

type FecPrivateBucket = "fec-technical-private" | "fec-import-private" | "fec-evidence-private";
type FecDownloadKind = "technical_file" | "import_document" | "evidence_response";

function fecAdminClient() {
 const url=process.env.NEXT_PUBLIC_SUPABASE_URL,key=process.env.SUPABASE_SERVICE_ROLE_KEY;
 if(!url||!key)throw new Error("Acesso privado indisponível.");
 return createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false}});
}

/** Leitura interna do servidor; não cria evento de download humano. */
export async function readFecPrivateObject(bucket:FecPrivateBucket,objectName:string):Promise<{bytes:Buffer|null;missing:boolean}> {
 const result=await fecAdminClient().storage.from(bucket).download(objectName);
 if(result.error){
  const error=result.error as typeof result.error & {status?:number;statusCode?:number|string};
  if(error.status===404||String(error.statusCode)==="404")return {bytes:null,missing:true};
  throw new Error("Arquivo privado indisponível.");
 }
 if(!result.data)return {bytes:null,missing:false};
 return {bytes:Buffer.from(await result.data.arrayBuffer()),missing:false};
}

/** Baixa após autorização por RLS e grava auditoria append-only antes de responder. */
export async function downloadFecPrivateObject(input:{
 db:SupabaseClient;
 bucket:FecPrivateBucket;
 objectName:string;
 actorId:string;
 resourceKind:FecDownloadKind;
 resourceId:string;
 expectedSha256?:string;
 expectedByteSize?:number;
}):Promise<Buffer> {
 const {data:auth,error:authError}=await input.db.auth.getUser();
 const {data:member,error:memberError}=await input.db.rpc("fec_is_active_member");
 if(authError||auth.user?.id!==input.actorId||memberError||member!==true)
  throw new Error("A sessão ativa não autorizou o arquivo.");
 const admin=fecAdminClient();
 const result=await admin.storage.from(input.bucket).download(input.objectName);
 if(result.error||!result.data)throw new Error("Arquivo privado indisponível.");
 const bytes=Buffer.from(await result.data.arrayBuffer());
 if(input.expectedByteSize!==undefined&&bytes.length!==input.expectedByteSize)
  throw new Error("Arquivo privado diverge do tamanho registrado.");
 if(input.expectedSha256!==undefined&&createHash("sha256").update(bytes).digest("hex")!==input.expectedSha256)
  throw new Error("Arquivo privado diverge da integridade registrada.");
 const event=await admin.from("fec_file_access_events").insert({
  resource_kind:input.resourceKind,
  resource_id:input.resourceId,
  actor_id:input.actorId,
  action:"download_authorized",
  byte_size:bytes.length,
 });
 if(event.error)throw new Error("O acesso não pôde ser registrado; download bloqueado.");
 return bytes;
}

export function fecPrivateDownloadResponse(bytes:Buffer,fileName:string,contentType:string):Response {
 const safeName=(fileName.split(/[\\/]/).pop()||"documento-fec").replace(/[\r\n\u0000-\u001f\u007f";]/g,"_").slice(0,180)||"documento-fec";
 const asciiName=safeName.replace(/[^\x20-\x7e]/g,"_");
 const encodedName=encodeURIComponent(safeName).replace(/['()*]/g,(char)=>`%${char.charCodeAt(0).toString(16).toUpperCase()}`);
 const disposition=contentType==="application/pdf"||contentType==="image/png"||contentType==="image/jpeg"?"inline":"attachment";
 const allowedType=new Set(["application/pdf","image/png","image/jpeg","application/vnd.openxmlformats-officedocument.wordprocessingml.document"]);
 const body=new Uint8Array(bytes.byteLength);
 body.set(bytes);
 return new Response(body,{status:200,headers:{
  "Content-Type":allowedType.has(contentType)?contentType:"application/octet-stream",
  "Content-Length":String(bytes.length),
  "Content-Disposition":`${disposition}; filename="${asciiName}"; filename*=UTF-8''${encodedName}`,
  "Cache-Control":"private, no-store",
  "X-Content-Type-Options":"nosniff",
 }});
}

/** Somente servidor: hash sempre calculado do download autorizado do Storage. */
export async function verifyFecStoredFile(db:SupabaseClient,kind:"document"|"evidence",id:string):Promise<string>{
 const table=kind==="document"?"fec_import_documents":"fec_evidence_responses";
 const result=await db.from(table).select("*").eq("id",id).maybeSingle();
 const row=result.data;if(result.error||!row||row.upload_state!=="uploaded")throw new Error("Arquivo indisponível para conferência.");
 const bucket=kind==="document"?"fec-import-private":"fec-evidence-private";
 const downloaded=await readFecPrivateObject(bucket,row.object_name);
 if(!downloaded.bytes)throw new Error("Arquivo não pôde ser lido para conferência.");
 const bytes=downloaded.bytes;
 const digest=createHash("sha256").update(bytes).digest("hex");
 const expected=kind==="document"?row.sha256:row.evidence_sha256;
 const size=kind==="document"?row.byte_size:row.evidence_size;
 if(bytes.length!==size||digest!==expected)throw new Error("Os bytes armazenados não conferem com o registro.");
 if(kind==="evidence"){
  const source=await db.from("fec_import_forms").select("document_id").eq("id",row.form_id).maybeSingle();
  if(source.error||!source.data)throw new Error("Documento de origem indisponível.");
  const sourceHash=await verifyFecStoredFile(db,"document",source.data.document_id);
  if(sourceHash===digest)throw new Error("O próprio documento não pode ser usado como evidência.");
 }
 const column=kind==="document"?"document_id":"evidence_id";
 const admin=fecAdminClient();
 const found=await admin.from("fec_file_integrity").select("sha256,byte_size").eq(column,id).maybeSingle();
 if(found.error)throw new Error("Conferência de integridade indisponível.");
 if(found.data){if(found.data.sha256!==digest||found.data.byte_size!==bytes.length)throw new Error("Arquivo diverge da verificação anterior.");return digest;}
 const inserted=await admin.from("fec_file_integrity").insert({[column]:id,sha256:digest,byte_size:bytes.length});
 if(inserted.error){
  const again=await admin.from("fec_file_integrity").select("sha256,byte_size").eq(column,id).maybeSingle();
  if(again.error||!again.data||again.data.sha256!==digest||again.data.byte_size!==bytes.length)throw new Error("Evidência já utilizada ou integridade não registrada.");
 }
 return digest;
}
