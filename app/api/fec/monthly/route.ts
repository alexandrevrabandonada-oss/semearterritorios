import { NextResponse, type NextRequest } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { buildFecMonthlyActivityExtract } from "@/lib/fec-monthly-activity-extract";
import type { FecDatabase, FecCycleRow, FecActivityRow } from "@/lib/fec-persistence.types";

const enabled = () => process.env.SEMEAR_FEC_PERSISTENCE_ENABLED === "true";
const respond = (body: object, status: number) =>
  NextResponse.json(body, { status, headers: { "Cache-Control": "private, no-store" } });
const uuid = (value: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
const monthValid = (m: string) => /^\d{4}-(0[1-9]|1[0-2])$/.test(m);

export async function GET(request: NextRequest) {
  if (!enabled()) return respond({ error: "Persistência FEC não habilitada neste ambiente." }, 503);
  const supabase = await createSupabaseServerClient() as unknown as SupabaseClient<FecDatabase>;
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return respond({ error: "Autenticação necessária." }, 401);
  const params = request.nextUrl.searchParams;
  const month = params.get("month") ?? "";
  const engagementId = params.get("engagementId") ?? "";
  const professionalId = params.get("professionalId") ?? "";
  if (!monthValid(month) || !uuid(engagementId) || !uuid(professionalId)) {
    return respond({ error: "Mês, aditivo e profissional precisam de identificadores válidos." }, 400);
  }
  // A lista de ciclos é filtrada por RLS, além do filtro de contrato/profissional.
  const cycleResult = await supabase.from("fec_cycles")
    .select("id,engagement_id,owner_id,neighborhood_id,title,guiding_question,status,reviewed_by,reviewed_at,review_notes,created_at,updated_at")
    .eq("engagement_id", engagementId).eq("owner_id", professionalId)
    .order("created_at", { ascending: false }).limit(101);
  if (cycleResult.error) return respond({ error: "Falha na leitura dos ciclos autorizados." }, 503);
  const cycles = (cycleResult.data ?? []) as FecCycleRow[];
  if (cycles.length > 100) return respond({ error: "Volume de ciclos excede o limite desta prévia; pagine antes de consolidar." }, 409);
  const cycleIds = cycles.map(c => c.id);
  if (!cycleIds.length) return respond({
    kind: "preliminary_fec_activity_extract", month, engagementId, professionalId,
    activityCount: 0, activityIds: [],
    caveat: "Nenhum ciclo visível neste recorte; isso não equivale a relatório entregue."
  }, 200);

  const [year, monthNumber] = month.split("-").map(Number);
  const nextMonth = monthNumber === 12
    ? String(year + 1) + "-01-01"
    : String(year) + "-" + String(monthNumber + 1).padStart(2, "0") + "-01";
  const activityResult = await supabase.from("fec_activities")
    .select("*").in("cycle_id", cycleIds)
    .gte("activity_date", month + "-01").lt("activity_date", nextMonth)
    .order("activity_date", { ascending: true }).limit(501);
  if (activityResult.error) return respond({ error: "Falha na leitura das atividades autorizadas." }, 503);
  const activities = (activityResult.data ?? []) as FecActivityRow[];
  if (activities.length > 500) return respond({ error: "Volume excedido. Paginação e revisão necessárias." }, 409);
  try {
    const report = buildFecMonthlyActivityExtract(month, engagementId, professionalId, cycles, activities);
    return respond({ report }, 200);
  } catch {
    return respond({ error: "Inconsistência nos registros: extrato não emitido." }, 409);
  }
}
