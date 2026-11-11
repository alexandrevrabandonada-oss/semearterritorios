import {createHash} from "node:crypto";
import {createClient,type SupabaseClient} from "@supabase/supabase-js";

/** Somente servidor: hash sempre calculado do download autorizado do Storage. */
export async function verifyFecStoredFile(db:SupabaseClient,kind:"document"|"evidence",id:string):Promise<string>{
 const url=process.env.NEXT_PUBLIC_SUPABASE_URL,key=process.env.SUPABASE_SERVICE_ROLE_KEY;
 if(!url||!key)throw new Error("Verificação de integridade indisponível.");
 const admin=createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false}});
 const table=kind==="document"?"fec_import_documents":"fec_evidence_responses";
 const result=await db.from(table).select("*").eq("id",id).maybeSingle();
 const row=result.data;if(result.error||!row||row.upload_state!=="uploaded")throw new Error("Arquivo indisponível para conferência.");
 const bucket=kind==="document"?"fec-import-private":"fec-evidence-private";
 const downloaded=await db.storage.from(bucket).download(row.object_name);
 if(downloaded.error||!downloaded.data)throw new Error("Arquivo não pôde ser lido para conferência.");
 const bytes=Buffer.from(await downloaded.data.arrayBuffer());
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
