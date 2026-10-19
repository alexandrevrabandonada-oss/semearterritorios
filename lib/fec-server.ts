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
  return { db, userId: data.user.id } as const;
}
export async function fecBody(request: Request): Promise<unknown> {
  const text = await request.text();
  if (Buffer.byteLength(text) > 150000) throw new Error("Corpo excede 150 KB.");
  return JSON.parse(text);
}
