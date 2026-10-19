import { describe, expect, it } from "vitest";
import {
  APS_WORKSTREAM, FEC_WORKSTREAM, buildFecTechnicalMonth, buildTerritorialContributionIndex,
  validateFecCycle, validateFecActivity, validateFecFinding, validateFecProduct,
  type FecActivity, type FecCycle, type FecProductRevision,
} from "@/lib/fec-technical-cycles";

const cycle: FecCycle = {
  id: "cycle-1", workstreamId: FEC_WORKSTREAM, contractScopeId: "aditivo-a-confirmar", professionalId: "professional-fec",
  territoryIds: ["bairro-1"], title: "Território e ar", guidingQuestion: "O que pode ser compreendido?", status: "active",
};
const activity = (id: string, date: string, type: FecActivity["type"], count: number | null = 12): FecActivity => ({
  id, cycleId: cycle.id, workstreamId: FEC_WORKSTREAM, date, type, status: "approved",
  objective: "Registrar leitura territorial", methodology: "Oficina com mapa-base coletivo",
  participation: count === null ? { count: null, kind: "not_recorded" } : { count, kind: "estimated" },
});
const map = (version: number): FecProductRevision => ({
  id: "map-1", cycleId: cycle.id, kind: "social_map", version, sourceActivityIds: ["workshop-1"],
  status: "approved", firstApprovedAt: "2026-10-17", method: "Mapeamento coletivo", legend: "X: relato de poeira",
  privacyReview: "private",
});

describe("trilha técnica FEC independente da APS", () => {
  it("exige vínculo formal, questão territorial e território sem vincular à APS", () => {
    expect(validateFecCycle(cycle)).toEqual([]);
    expect(validateFecCycle({ ...cycle, guidingQuestion: "", territoryIds: [] })).toHaveLength(2);
  });

  it("não conta preparação como atividade com público", () => {
    const prep = activity("prep", "2026-10-16", "preparation", null);
    expect(validateFecActivity(prep)).toEqual([]);
    expect(validateFecActivity({ ...prep, participation: { count: 5, kind: "estimated" } })).toContain(
      "Preparação e sistematização não geram contagem de público.",
    );
  });

  it("exige legenda e metodologia do mapa e fonte de cada achado", () => {
    expect(validateFecProduct(map(1))).toEqual([]);
    expect(validateFecProduct({ ...map(1), legend: "" })).toContain("Mapa social exige método de construção e legenda.");
    expect(validateFecFinding({ id: "f1", cycleId: cycle.id, status: "reviewed", description: "Relato de poeira", evidence: [] })).toHaveLength(1);
  });

  it("consolida o mês, preserva datas, categorias e revisões sem inflar produtos", () => {
    const report = buildFecTechnicalMonth({
      month: "2026-10", professionalId: cycle.professionalId, cycles: [cycle],
      activities: [activity("workshop-1", "2026-10-12", "cartography_workshop"), activity("prep", "2026-10-13", "preparation", null), activity("other-month", "2026-11-01", "planting_workshop"), { ...activity("draft", "2026-10-15", "training"), status: "draft" }],
      products: [map(1), map(2)],
      findings: [
        { id: "finding-1", cycleId: cycle.id, description: "Percepção comunitária", evidence: [{ sourceId: "workshop-1", kind: "participant_account" }], status: "reviewed" },
        { id: "finding-invalid", cycleId: cycle.id, description: "Sem fonte", evidence: [], status: "reviewed" },
      ],
      proposals: [{ id: "proposal-1", cycleId: cycle.id, text: "Solicitar dados", sourceActivityId: "workshop-1", date: "2026-10-12", status: "recorded" }],
    });
    expect(report.activityCount).toBe(2);
    expect(report.workshopCount).toBe(1);
    expect(report.preparationAndSystematizationCount).toBe(1);
    expect(report.participation.estimated).toBe(12);
    expect(report.participation.unknownActivityCount).toBe(1);
    expect(report.mapIds).toEqual(["map-1"]);
    expect(report.findingIds).toEqual(["finding-1"]);
    expect(report.proposalIds).toEqual(["proposal-1"]);
    expect(report.caveats).toHaveLength(3);
  });

  it("não transforma versão 2 de mapa antigo em um novo produto no mês", () => {
    const report = buildFecTechnicalMonth({ month: "2026-11", professionalId: cycle.professionalId, cycles: [cycle],
      activities: [], products: [{ ...map(2), firstApprovedAt: "2026-10-17" }], findings: [], proposals: [] });
    expect(report.mapIds).toEqual([]);
  });

  it("um evento compartilhado conta uma vez e mantém duas atribuições institucionais", () => {
    const index = buildTerritorialContributionIndex([
      { id: "aps-1", workstreamId: APS_WORKSTREAM, territoryId: "bairro-1", eventId: "shared-event", status: "performed" },
      { id: "fec-1", workstreamId: FEC_WORKSTREAM, territoryId: "bairro-1", eventId: "shared-event", status: "performed" },
      { id: "fec-2", workstreamId: FEC_WORKSTREAM, territoryId: "bairro-1", eventId: null, status: "planned" },
    ]);
    expect(index.eventCount).toBe(1);
    expect(index.apsContributionIds).toEqual(["aps-1"]);
    expect(index.fecContributionIds).toEqual(["fec-1"]);
  });
});