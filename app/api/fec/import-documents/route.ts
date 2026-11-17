import {type NextRequest} from "next/server";
import type {SupabaseClient} from "@supabase/supabase-js";
import {fecSession,fecResponse} from "@/lib/fec-server";
import {FEC_IMPORT_BUCKET,uuidRx} from "@/lib/fec-import-persistence";
import {downloadFecPrivateObject,fecPrivateDownloadResponse,verifyFecStoredFile} from "@/lib/fec-integrity-server";

/** Streaming privado: autoriza via RLS, verifica integridade e audita antes da resposta. */
export async function GET(req:NextRequest){
 const session=await fecSession();if(session.response)return session.response;
 if(process.env.SEMEAR_FEC_DOCUMENT_INTAKE_ENABLED!=="true")
  return fecResponse({error:"Acesso ao acervo não habilitado."},503);
 const id=req.nextUrl.searchParams.get("id");
 if(!id||!uuidRx.test(id))return fecResponse({error:"Documento inválido."},400);
 const db=session.db as unknown as SupabaseClient;
 const {data:doc,error}=await db.from("fec_import_documents")
  .select("id,object_name,source_name,mime_type,byte_size,sha256,upload_state").eq("id",id).maybeSingle();
 if(error||!doc||doc.upload_state!=="uploaded")return fecResponse({error:"Documento indisponível."},404);
 try{
  await verifyFecStoredFile(db,"document",doc.id);
  const bytes=await downloadFecPrivateObject({db,bucket:FEC_IMPORT_BUCKET,objectName:doc.object_name,actorId:session.userId,
   resourceKind:"import_document",resourceId:doc.id,expectedSha256:doc.sha256,expectedByteSize:doc.byte_size});
  return fecPrivateDownloadResponse(bytes,doc.source_name,doc.mime_type);
 }catch{return fecResponse({error:"Documento sem integridade confirmada ou acesso não pôde ser registrado."},403);}
}
