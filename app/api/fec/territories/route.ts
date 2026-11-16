import { fecResponse, fecSession } from "@/lib/fec-server";
import { fecUuid } from "@/lib/fec-knowledge";
import { buildFecTerritorialOverview } from "@/lib/fec-technical-report";

export async function GET(request: Request) {
  const session = await fecSession();
  if (session.response) return session.response;
  const id = new URL(request.url).searchParams.get("neighborhoodId");
  if (!fecUuid(id)) return fecResponse({ error: "Território inválido." }, 400);
  const [cycleResult, actionResult] = await Promise.all([
    session.db
      .from("fec_cycles")
      .select("*")
      .eq("neighborhood_id", id)
      .limit(501),
    session.db
      .from("actions")
      .select("id,title,action_date,status")
      .eq("neighborhood_id", id)
      .limit(501),
  ]);
  if (cycleResult.error)
    return fecResponse(
      { error: "Contribuições territoriais indisponíveis." },
      503,
    );
  if (cycleResult.data.length > 500 || (actionResult.data?.length ?? 0) > 500)
    return fecResponse({ error: "Volume exige paginação." }, 409);
  const cycles = cycleResult.data,
    ids = cycles.map((c) => c.id);
  const [activities, knowledge] = ids.length
    ? await Promise.all([
        session.db
          .from("fec_activities")
          .select(
            "id,cycle_id,owner_id,activity_date,activity_type,status,canonical_action_id",
          )
          .in("cycle_id", ids)
          .limit(1001),
        session.db
          .from("fec_knowledge_records")
          .select(
            "id,cycle_id,owner_id,kind,title,version,record_key,source_activity_ids,source_record_ids,status,community_status",
          )
          .in("cycle_id", ids)
          .limit(1001),
      ])
    : [
        { data: [], error: null },
        { data: [], error: null },
      ];
  if (activities.error || knowledge.error)
    return fecResponse({ error: "Fontes territoriais indisponíveis." }, 503);
  if (
    (activities.data?.length ?? 0) > 1000 ||
    (knowledge.data?.length ?? 0) > 1000
  )
    return fecResponse({ error: "Volume exige paginação." }, 409);
  const actions = actionResult.error ? [] : (actionResult.data ?? []);
  const index = buildFecTerritorialOverview(actions, activities.data ?? []);
  // Apenas referências autorizadas, sem falas brutas, nomes de participantes ou arquivos.
  return fecResponse({
    neighborhoodId: id,
    cycles,
    activities: activities.data,
    knowledge: knowledge.data,
    officialActions: actions,
    index,
    apsReadable: !actionResult.error,
    note: "Vínculos entre frentes são explícitos. Bairro ou tema semelhante não comprova evento compartilhado. Ações oficiais são referências do cadastro existente; sua atribuição contratual precisa ser conferida.",
  });
}
