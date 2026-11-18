import { NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { FecDatabase } from "@/lib/fec-persistence.types";

export const fecResponse = (body: object, status = 200) =>
  NextResponse.json(body, {
    status,
    headers: { "Cache-Control": "private, no-store" },
  });
export async function fecSession() {
  if (process.env.SEMEAR_FEC_PERSISTENCE_ENABLED !== "true")
    return {
      response: fecResponse(
        { error: "Persistência FEC não habilitada neste ambiente." },
        503,
      ),
    } as const;
  const db =
    (await createSupabaseServerClient()) as unknown as SupabaseClient<FecDatabase>;
  const { data, error } = await db.auth.getUser();
  if (error || !data.user)
    return {
      response: fecResponse({ error: "Autenticação necessária." }, 401),
    } as const;
  // Qualquer perfil institucionalmente habilitado pode acessar a FEC.
  // O cadastro automático cria role NULL: inscrição sem habilitação não libera documentos.
  // O banco repete a autorização e impede aprovação pelo próprio autor.
  const { data: profile, error: profileError } = await db
    .from("profiles")
    .select("role")
    .eq("id", data.user.id)
    .maybeSingle();
  if (
    profileError ||
    !profile ||
    typeof profile.role !== "string" ||
    !profile.role.trim()
  )
    return {
      response: fecResponse(
        { error: "A FEC exige uma conta SEMEAR com perfil habilitado." },
        403,
      ),
    } as const;
  return { db, userId: data.user.id } as const;
}
export async function fecBody(request: Request): Promise<unknown> {
  const text = await request.text();
  if (Buffer.byteLength(text) > 150000) throw new Error("Corpo excede 150 KB.");
  return JSON.parse(text);
}
