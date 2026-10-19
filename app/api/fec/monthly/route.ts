import { fecResponse, fecSession } from "@/lib/fec-server";
import { fecUuid } from "@/lib/fec-knowledge";
import {
  buildFecTechnicalReport,
  fecReportMarkdown,
} from "@/lib/fec-technical-report";

export async function GET(request: Request) {
  const session = await fecSession();
  if (session.response) return session.response;
  const params = new URL(request.url).searchParams;
  const month = params.get("month") ?? "",
    engagementId = params.get("engagementId") ?? "",
    professionalId = params.get("professionalId") ?? "";
  if (
    !/^\d{4}-(0[1-9]|1[0-2])$/.test(month) ||
    !fecUuid(engagementId) ||
    !fecUuid(professionalId)
  )
    return fecResponse(
      { error: "Mês, aditivo ou profissional inválidos." },
      400,
    );
  const cycles = await session.db
    .from("fec_cycles")
    .select("*")
    .eq("engagement_id", engagementId)
    .eq("owner_id", professionalId)
    .limit(501);
  if (cycles.error) return fecResponse({ error: "Ciclos indisponíveis." }, 503);
  if (cycles.data.length > 500)
    return fecResponse({ error: "Volume exige paginação." }, 409);
  const ids = cycles.data.map((c) => c.id);
  if (!ids.length)
    return fecResponse(
      {
        error:
          "Nenhum ciclo autorizado neste recorte. Isso não comprova relatório entregue.",
      },
      404,
    );
  const [activities, records, files] = await Promise.all([
    session.db
      .from("fec_activities")
      .select("*")
      .in("cycle_id", ids)
      .order("activity_date")
      .limit(1001),
    session.db
      .from("fec_knowledge_records")
      .select("*")
      .in("cycle_id", ids)
      .limit(1001),
    session.db
      .from("fec_knowledge_files")
      .select("id,record_id,title")
      .limit(1001),
  ]);
  if (activities.error || records.error || files.error)
    return fecResponse({ error: "Fontes mensais indisponíveis." }, 503);
  if (
    activities.data.length > 1000 ||
    records.data.length > 1000 ||
    files.data.length > 1000
  )
    return fecResponse(
      {
        error:
          "Volume exige paginação. Relatório não foi emitido com fontes truncadas.",
      },
      409,
    );
  try {
    const report = buildFecTechnicalReport(
      month,
      engagementId,
      professionalId,
      {
        cycles: cycles.data,
        activities: activities.data,
        records: records.data,
        files: files.data,
      },
    );
    return fecResponse({ report, markdown: fecReportMarkdown(report) });
  } catch {
    return fecResponse(
      { error: "Fontes inconsistentes; relatório não emitido." },
      409,
    );
  }
}
