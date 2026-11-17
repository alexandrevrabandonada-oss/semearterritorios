import { NextResponse, type NextRequest } from "next/server";
import { parseFecCycleCreate } from "@/lib/fec-api-input";
import { fecSession } from "@/lib/fec-server";

/**
 * DESLIGADO POR PADRAO, inclusive em Preview e Production.
 * Exige sessão interna ativa e frente FEC institucional ativa no banco.
 * Auth JWT + RLS no banco: NUNCA aceitar owner_id informado pelo cliente.
 */
const enabled = () => process.env.SEMEAR_FEC_PERSISTENCE_ENABLED === "true";
const respond = (body: object, status: number) =>
  NextResponse.json(body, {
    status,
    headers: { "Cache-Control": "private, no-store" },
  });

export async function GET() {
  if (!enabled())
    return respond(
      { error: "Persistência FEC não habilitada neste ambiente." },
      503,
    );
  const session=await fecSession();
  if(session.response)return session.response;
  const { data, error } = await session.db
    .from("fec_cycles")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(501);
  if (error)
    return respond(
      { error: "Não foi possível ler os ciclos autorizados." },
      503,
    );
  if ((data?.length ?? 0) > 500)
    return respond(
      { error: "Volume exige paginação. A lista não foi truncada." },
      409,
    );
  return respond({ cycles: data ?? [] }, 200);
}

export async function PATCH(request: NextRequest) {
  if (!enabled())
    return respond(
      { error: "Persistência FEC não habilitada neste ambiente." },
      503,
    );
  const session=await fecSession();
  if(session.response)return session.response;
  const db=session.db;
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return respond({ error: "JSON inválido." }, 400);
  }
  if (!body || typeof body !== "object" || Array.isArray(body))
    return respond({ error: "Conteúdo inválido." }, 400);
  const { id, stage, ...input } = body as Record<string, unknown>;
  if (
    typeof id !== "string" ||
    !/^[0-9a-f-]{36}$/i.test(id) ||
    ![
      "preparation",
      "fieldwork",
      "systematization",
      "feedback",
      "closed",
    ].includes(String(stage))
  )
    return respond({ error: "Identificador ou etapa inválidos." }, 400);
  const parsed = parseFecCycleCreate(input, session.userId);
  if (!parsed.ok) return respond({ error: parsed.reason }, 400);
  const { data, error } = await db
    .from("fec_cycles")
    .update({
      ...parsed.value,
      stage: stage as
        | "preparation"
        | "fieldwork"
        | "systematization"
        | "feedback"
        | "closed",
    })
    .eq("id", id)
    .eq("owner_id", session.userId)
    .select("*")
    .maybeSingle();
  if (error || !data)
    return respond({ error: "Ciclo indisponível para edição." }, 409);
  return respond({ cycle: data }, 200);
}

export async function POST(request: NextRequest) {
  if (!enabled())
    return respond(
      { error: "Persistência FEC não habilitada neste ambiente." },
      503,
    );
  const session=await fecSession();
  if(session.response)return session.response;
  const supabase=session.db;
  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return respond({ error: "Corpo JSON inválido." }, 400);
  }
  const parsed = parseFecCycleCreate(payload, session.userId);
  if (!parsed.ok) return respond({ error: parsed.reason }, 400);
  // RLS exige perfil institucional permitido, vínculo ativo, autoria JWT e status draft.
  const { data, error } = await supabase
    .from("fec_cycles")
    .insert(parsed.value)
    .select(
      "id,engagement_id,neighborhood_id,owner_id,title,guiding_question,status,created_at",
    )
    .single();
  if (error)
    return respond(
      {
        error:
          "Ciclo não criado. Verifique o vínculo ativo da equipe e a frente FEC.",
      },
      403,
    );
  return respond({ cycle: data }, 201);
}
