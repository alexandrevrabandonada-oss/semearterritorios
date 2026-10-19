import { describe, expect, it } from "vitest";
import { buildFecMonthlyActivityExtract } from "@/lib/fec-monthly-activity-extract";
import type { FecActivityRow, FecCycleRow } from "@/lib/fec-persistence.types";

const cycle = {
  id: "cycle-a", engagement_id: "contract-fec", owner_id: "pro-fec",
  neighborhood_id: "bairro-a", title: "Leitura territorial",
  guiding_question: "Que questoes ambientais aparecem?", status: "approved",
  reviewed_by: "supervisor", reviewed_at: "2026-10-02", review_notes: null,
  created_at: "2026-10-01", updated_at: "2026-10-02",
} as FecCycleRow;
const row = (id: string, day: string, status: FecActivityRow["status"],
  activityType: FecActivityRow["activity_type"] = "cartography_workshop"): FecActivityRow => ({
    id, cycle_id: cycle.id, owner_id: cycle.owner_id, activity_date: day,
    activity_type: activityType, objective: "Leitura", methodology: "Mapa e debate",
    participation_kind: "estimated", participation_count: 13,
    participant_accounts: "Texto privado nao deve sair", team_observations: "Observacao privada",
    external_sources: "Documento privado", map_method: "Mapa-base", map_legend: "P: poeira",
    finding_draft: "Percepcao", proposal_draft: "Solicitar documento",
    limitations: null, next_steps: null, status,
    reviewed_by: status === "approved" ? "supervisor" : null,
    reviewed_at: status === "approved" ? "2026-10-20" : null,
    review_notes: null, created_at: day, updated_at: day,
  });

describe("extrato FEC preliminar de atividades", () => {
  it("conta atividades aprovadas no mes correto, nunca materiais nao aprovados", () => {
    const result = buildFecMonthlyActivityExtract("2026-10", cycle.engagement_id, cycle.owner_id,
      [cycle], [
        row("a1", "2026-10-12", "approved"),
        row("a2", "2026-10-13", "draft"),
        row("a3", "2026-11-02", "approved"),
      ]);
    expect(result.activityIds).toEqual(["a1"]);
    expect(result.activityCount).toBe(1);
    expect(result.workshopCount).toBe(1);
    expect(result.participation.estimated).toBe(13);
    expect(result.productIds).toEqual([]);
    expect(result.incompleteDeliverables).toHaveLength(3);
  });
  it("nao confunde executor ou contrato e nao expõe narrativas privadas", () => {
    const otherCycle: FecCycleRow = { ...cycle, id: "cycle-b", owner_id: "outro", engagement_id: "outro-contrato" };
    const result = buildFecMonthlyActivityExtract("2026-10", cycle.engagement_id, cycle.owner_id,
      [cycle, otherCycle], [
        row("a1", "2026-10-12", "approved"),
        { ...row("a2", "2026-10-12", "approved"), cycle_id: otherCycle.id, owner_id: otherCycle.owner_id },
      ]);
    expect(result.activityIds).toEqual(["a1"]);
    const serialized = JSON.stringify(result);
    expect(serialized).not.toContain("Texto privado nao deve sair");
    expect(serialized).not.toContain("Observacao privada");
  });
});