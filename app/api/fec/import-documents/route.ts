import {type NextRequest} from "next/server";
import type {SupabaseClient} from "@supabase/supabase-js";
import {fecSession,fecResponse} from "@/lib/fec-server";
import {FEC_IMPORT_BUCKET,uuidRx} from "@/lib/fec-import-persistence";

/** URL temporária: somente usuário autenticado autorizado na tabela e no Storage. */
export async function GET(req:NextRequest){
 const session=await fecSession();if(session.response)return session.response;
 if(process.env.SEMEAR_FEC_DOCUMENT_INTAKE_ENABLED!=="true")
  return fecResponse({error:"Acesso ao acervo não habilitado."},503);
 const id=req.nextUrl.searchParams.get("id");
 if(!id||!uuidRx.test(id))return fecResponse({error:"Documento inválido."},400);
 const db=session.db as unknown as SupabaseClient;
 const {data:doc,error}=await db.from("fec_import_documents")
  .select("id,object_name,upload_state").eq("id",id).maybeSingle();
 if(error||!doc||doc.upload_state!=="uploaded")return fecResponse({error:"Documento indisponível."},404);
 const {data:signed,error:signedError}=await db.storage.from(FEC_IMPORT_BUCKET)
  .createSignedUrl(doc.object_name,60);
 if(signedError||!signed)return fecResponse({error:"Acesso temporário recusado."},403);
 return fecResponse({url:signed.signedUrl,expiresInSeconds:60});
}
