/**
 * Extrato tecnico de atividades aprovadas, NAO relatorio contratual nem fechamento financeiro.
 * Mantem FEC separada da APS e expõe apenas IDs, quantidades e referencias.
 */
import { FEC_WORKSTREAM, buildFecTechnicalMonth, type FecActivity, type FecCycle } from "@/lib/fec-technical-cycles";
import type { FecActivityRow, FecCycleRow } from "@/lib/fec-persistence.types";

export function buildFecMonthlyActivityExtract(
  month: string, engagementId: string, professionalId: string,
  cycles: FecCycleRow[], activities: FecActivityRow[],
) {
  const ownCycles = cycles.filter(c => c.engagement_id === engagementId && c.owner_id === professionalId);
  const cycleIds = new Set(ownCycles.map(c => c.id));
  const mappedCycles: FecCycle[] = ownCycles.map(c => ({
    id: c.id, workstreamId: FEC_WORKSTREAM, contractScopeId: c.engagement_id,
    professionalId: c.owner_id, title: c.title,
    territoryIds: [c.neighborhood_id], guidingQuestion: c.guiding_question,
    status: c.status === "approved" ? "active" : c.status === "submitted" ? "in_review" : "draft",
  }));
  const mappedActivities: FecActivity[] = activities.filter(a => cycleIds.has(a.cycle_id)).map(a => ({
    id: a.id, cycleId: a.cycle_id, workstreamId: FEC_WORKSTREAM,
    date: a.activity_date, type: a.activity_type, status: a.status,
    objective: a.objective, methodology: a.methodology,
    participation: { count: a.participation_count, kind: a.participation_kind },
  }));
  const summary = buildFecTechnicalMonth({
    month, professionalId, cycles: mappedCycles, activities: mappedActivities,
    products: [], findings: [], proposals: [],
  });
  return {
    ...summary,
    kind: "preliminary_fec_activity_extract" as const,
    engagementId,
    source: "approved_fec_activities" as const,
    incompleteDeliverables: [
      "Mapas sociais versionados e respectivos arquivos não estão integrados.",
      "Diagnósticos participativos, achados revisados e propostas documentadas não estão consolidados.",
      "O extrato não equivale a relatório contratual, aceite financeiro ou síntese pública.",
    ],
  };
}
