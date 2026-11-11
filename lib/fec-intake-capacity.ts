import type { SupabaseClient } from "@supabase/supabase-js";
import { fecResponse } from "@/lib/fec-server";
/** Shared lease: unavailable database or saturated capacity fails closed. */
export async function withFecCapacity(db:SupabaseClient, task:()=>Promise<Response>):Promise<Response> {
 let lease:unknown;
 try{const result=await db.rpc("fec_import_acquire_capacity");if(result.error||typeof result.data!=="string")return fecResponse({error:"Capacidade de importação indisponível; tente novamente mais tarde."},503);lease=result.data;}
 catch{return fecResponse({error:"Capacidade de importação indisponível; tente novamente mais tarde."},503);}
 try{return await task();}
 finally{try{await db.rpc("fec_import_release_capacity",{p_lease:lease});}catch{/* TTL releases a failed lease. */}}
}
