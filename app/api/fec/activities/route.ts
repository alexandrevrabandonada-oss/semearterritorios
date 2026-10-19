import { NextResponse, type NextRequest } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { parseFecActivityCreate } from "@/lib/fec-api-input";
import type { FecDatabase } from "@/lib/fec-persistence.types";

const enabled = () => process.env.SEMEAR_FEC_PERSISTENCE_ENABLED === "true";
const respond = (body: object, status: number) =>
  NextResponse.json(body, {
    status,
    headers: { "Cache-Control": "private, no-store" },
  });
const uuid = (value: string) =>
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);

export async function GET(request: NextRequest) {
  if (!enabled())
    return respond(
      { error: "Persistência FEC não habilitada neste ambiente." },
      503,
    );
  const supabase =
    (await createSupabaseServerClient()) as unknown as SupabaseClient<FecDatabase>;
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return respond({ error: "Autenticação necessária." }, 401);
  const cycleId = request.nextUrl.searchParams.get("cycleId") ?? "";
  if (!uuid(cycleId))
    return respond({ error: "Informe um ciclo válido." }, 400);
  const { data, error } = await supabase
    .from("fec_activities")
    .select("*")
    .eq("cycle_id", cycleId)
    .order("activity_date", { ascending: false })
    .limit(501);
  if (error)
    return respond(
      { error: "Não foi possível ler atividades autorizadas." },
      503,
    );
  if ((data?.length ?? 0) > 500)
    return respond(
      { error: "Volume exige paginação. A lista não foi truncada." },
      409,
    );
  // Detalhe privado filtrado por ciclo e RLS; não há projeção pública desta rota.
  return respond({ activities: data ?? [] }, 200);
}

export async function PATCH(request: NextRequest) {
  if (!enabled())
    return respond(
      { error: "Persistência FEC não habilitada neste ambiente." },
      503,
    );
  const db =
    (await createSupabaseServerClient()) as unknown as SupabaseClient<FecDatabase>;
  const { data: auth } = await db.auth.getUser();
  if (!auth.user) return respond({ error: "Autenticação necessária." }, 401);
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return respond({ error: "JSON inválido." }, 400);
  }
  if (!body || typeof body !== "object" || Array.isArray(body))
    return respond({ error: "Conteúdo inválido." }, 400);
  const { id, ...input } = body as Record<string, unknown>;
  if (typeof id !== "string" || !uuid(id))
    return respond({ error: "Atividade inválida." }, 400);
  const parsed = parseFecActivityCreate(input, auth.user.id);
  if (!parsed.ok) return respond({ error: parsed.reason }, 400);
  const { data, error } = await db
    .from("fec_activities")
    .update(parsed.value)
    .eq("id", id)
    .eq("owner_id", auth.user.id)
    .select("*")
    .maybeSingle();
  if (error || !data)
    return respond({ error: "Atividade indisponível para edição." }, 409);
  return respond({ activity: data }, 200);
}

export async function POST(request: NextRequest) {
  if (!enabled())
    return respond(
      { error: "Persistência FEC não habilitada neste ambiente." },
      503,
    );
  const supabase =
    (await createSupabaseServerClient()) as unknown as SupabaseClient<FecDatabase>;
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return respond({ error: "Autenticação necessária." }, 401);
  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return respond({ error: "Corpo JSON inválido." }, 400);
  }
  const parsed = parseFecActivityCreate(payload, auth.user.id);
  if (!parsed.ok) return respond({ error: parsed.reason }, 400);
  // O banco exige owner do ciclo, grant executor ativo e status draft.
  const { data, error } = await supabase
    .from("fec_activities")
    .insert(parsed.value)
    .select(
      "id,cycle_id,owner_id,activity_date,activity_type,status,created_at",
    )
    .single();
  if (error)
    return respond(
      {
        error: "Atividade não criada. Confira ciclo, vínculo FEC e permissões.",
      },
      403,
    );
  return respond({ activity: data }, 201);
}
