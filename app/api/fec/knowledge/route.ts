import { fecBody, fecResponse, fecSession } from "@/lib/fec-server";
import { fecUuid, parseKnowledge } from "@/lib/fec-knowledge";

export async function GET(request: Request) {
  const session = await fecSession();
  if (session.response) return session.response;
  const cycleId = new URL(request.url).searchParams.get("cycleId");
  if (!fecUuid(cycleId)) return fecResponse({ error: "Ciclo inválido." }, 400);
  const [records, activities] = await Promise.all([
    session.db
      .from("fec_knowledge_records")
      .select("*")
      .eq("cycle_id", cycleId)
      .order("created_at")
      .limit(501),
    session.db
      .from("fec_activities")
      .select("id")
      .eq("cycle_id", cycleId)
      .limit(501),
  ]);
  if (records.error || activities.error)
    return fecResponse(
      { error: "Não foi possível consultar o acervo autorizado." },
      503,
    );
  if (records.data.length > 500 || activities.data.length > 500)
    return fecResponse(
      { error: "Volume exige paginação; acervo não foi truncado." },
      409,
    );
  const ids = records.data.map((r) => r.id);
  const [files, history] = await Promise.all([
    ids.length
      ? session.db
          .from("fec_knowledge_files")
          .select("*")
          .in("record_id", ids)
          .limit(1001)
      : Promise.resolve({ data: [], error: null }),
    session.db
      .from("fec_review_log")
      .select("*")
      .in("record_id", [cycleId, ...ids, ...activities.data.map((a) => a.id)])
      .order("decided_at", { ascending: false })
      .limit(1001),
  ]);
  if (files.error || history.error)
    return fecResponse({ error: "Histórico ou arquivos indisponíveis." }, 503);
  if ((files.data?.length ?? 0) > 1000 || (history.data?.length ?? 0) > 1000)
    return fecResponse(
      { error: "Volume exige paginação; acervo não foi truncado." },
      409,
    );
  return fecResponse({
    records: records.data,
    files: files.data,
    history: history.data,
  });
}
export async function POST(request: Request) {
  const session = await fecSession();
  if (session.response) return session.response;
  let body;
  try {
    body = await fecBody(request);
  } catch {
    return fecResponse({ error: "JSON inválido ou excessivo." }, 400);
  }
  const parsed = parseKnowledge(body, session.userId);
  if (!parsed.ok) return fecResponse({ error: parsed.reason }, 400);
  const { data, error } = await session.db
    .from("fec_knowledge_records")
    .insert(parsed.value)
    .select("*")
    .single();
  if (error)
    return fecResponse(
      {
        error:
          "Registro recusado. Confira autoria, fontes do mesmo ciclo, versão anterior e vínculo ativo.",
      },
      403,
    );
  return fecResponse({ record: data }, 201);
}
export async function PATCH(request: Request) {
  const session = await fecSession();
  if (session.response) return session.response;
  let body;
  try {
    body = await fecBody(request);
  } catch {
    return fecResponse({ error: "JSON inválido ou excessivo." }, 400);
  }
  if (!body || typeof body !== "object")
    return fecResponse({ error: "Conteúdo inválido." }, 400);
  const { id, ...payload } = body as Record<string, unknown>;
  if (!fecUuid(id)) return fecResponse({ error: "Registro inválido." }, 400);
  const parsed = parseKnowledge(payload, session.userId);
  if (!parsed.ok) return fecResponse({ error: parsed.reason }, 400);
  const { data, error } = await session.db
    .from("fec_knowledge_records")
    .update(parsed.value)
    .eq("id", id)
    .eq("owner_id", session.userId)
    .select("*")
    .maybeSingle();
  if (error || !data)
    return fecResponse(
      {
        error:
          "Registro indisponível para edição. Revise as fontes e a situação.",
      },
      409,
    );
  return fecResponse({ record: data });
}
