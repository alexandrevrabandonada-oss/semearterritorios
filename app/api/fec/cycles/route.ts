import { NextResponse, type NextRequest } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { parseFecCycleCreate } from "@/lib/fec-api-input";
import type { FecDatabase } from "@/lib/fec-persistence.types";

/**
 * DESLIGADO POR PADRAO, inclusive em Preview e Production.
 * Exige migração aplicada em banco homologado e grants institucionais revisados.
 * Auth JWT + RLS no banco: NUNCA aceitar owner_id informado pelo cliente.
 */
const enabled = () => process.env.SEMEAR_FEC_PERSISTENCE_ENABLED === "true";
const respond = (body: object, status: number) =>
  NextResponse.json(body, { status, headers: { "Cache-Control": "private, no-store" } });

export async function GET() {
  if (!enabled()) return respond({ error: "Persistência FEC não habilitada neste ambiente." }, 503);
  const supabase = await createSupabaseServerClient() as unknown as SupabaseClient<FecDatabase>;
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return respond({ error: "Autenticação necessária." }, 401);
  const { data, error } = await supabase.from("fec_cycles")
    .select("id,engagement_id,neighborhood_id,owner_id,title,guiding_question,status,created_at,updated_at")
    .order("created_at", { ascending: false }).limit(100);
  if (error) return respond({ error: "Não foi possível ler os ciclos autorizados." }, 503);
  return respond({ cycles: data ?? [] }, 200);
}

export async function POST(request: NextRequest) {
  if (!enabled()) return respond({ error: "Persistência FEC não habilitada neste ambiente." }, 503);
  const supabase = await createSupabaseServerClient() as unknown as SupabaseClient<FecDatabase>;
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return respond({ error: "Autenticação necessária." }, 401);
  let payload: unknown;
  try { payload = await request.json(); } catch { return respond({ error: "Corpo JSON inválido." }, 400); }
  const parsed = parseFecCycleCreate(payload, auth.user.id);
  if (!parsed.ok) return respond({ error: parsed.reason }, 400);
  // Política INSERT no Supabase exige grant executor ativo, proprietário JWT e status draft.
  const { data, error } = await supabase.from("fec_cycles").insert(parsed.value)
    .select("id,engagement_id,neighborhood_id,owner_id,title,guiding_question,status,created_at")
    .single();
  if (error) return respond({ error: "Ciclo não criado. Verifique vínculo FEC e permissões autorizadas." }, 403);
  return respond({ cycle: data }, 201);
}
