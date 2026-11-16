import { describe, expect, it } from "vitest";
import {
  buildFecTechnicalReport,
  buildFecTerritorialOverview,
  fecReportMarkdown,
} from "@/lib/fec-technical-report";
import type { FecCycleRow, FecActivityRow } from "@/lib/fec-persistence.types";
import type { FecKnowledgeRow } from "@/lib/fec-knowledge";
const cycle = {
  id: "c",
  engagement_id: "e",
  owner_id: "u",
  neighborhood_id: "n",
  title: "Ciclo",
  guiding_question: "Questão",
  objectives: "Objetivo",
  methodology: "Método",
  stage: "fieldwork",
  status: "approved",
} as FecCycleRow;
const activity = (id: string, date = "2026-10-19"): FecActivityRow =>
  ({
    id,
    cycle_id: "c",
    owner_id: "u",
    activity_date: date,
    activity_type: "cartography_workshop",
    objective: "O",
    methodology: "M",
    participation_kind: "estimated",
    participation_count: 12,
    canonical_action_id: null,
    themes: "Ar",
    preliminary_results: "Mapa coletivo",
    limitations: "Grupo pequeno",
    next_steps: "Devolutiva",
    status: "approved",
    participant_accounts: "Relato bruto não deve ser propagado",
    field_notes: "Campo privado",
  }) as FecActivityRow;
const record = (
  id: string,
  version = 1,
  date = "2026-10-20T12:00:00Z",
): FecKnowledgeRow =>
  ({
    id,
    record_key: "map-key",
    version,
    previous_id: null,
    cycle_id: "c",
    owner_id: "u",
    kind: "map",
    title: "Mapa",
    content: { methodology: "Coletiva", legend: "P: percepção" },
    source_activity_ids: ["a"],
    source_record_ids: [],
    community_status: "not_requested",
    community_notes: "",
    proposal_status: "recorded",
    status: "approved",
    reviewed_at: date,
    reviewed_by: "supervisor",
    review_notes: null,
    created_at: date,
    updated_at: date,
  }) as FecKnowledgeRow;
const build = (activities = [activity("a")], records = [record("m")]) =>
  buildFecTechnicalReport("2026-10", "e", "u", {
    cycles: [cycle],
    activities,
    records,
    files: [],
  });
describe("relatório técnico individual persistido", () => {
  it("produz onze blocos com referências e não propaga falas brutas", () => {
    const r = build();
    expect(r.blocks).toHaveLength(11);
    expect(r.metrics.uniquePeople).toBeNull();
    expect(r.metrics.estimatedParticipations).toBe(12);
    expect(fecReportMarkdown(r)).not.toContain("Relato bruto");
    expect(r.sourceIds).toEqual(["a", "m"]);
    expect(r.kind).toBe("fec_individual_technical_report_draft");
  });
  it("separa execução mensal e revisão de produto com origem em outro mês", () => {
    const r = build([activity("a", "2026-09-30")]);
    expect(r.metrics.activityCount).toBe(0);
    expect(r.metrics.newMapCount).toBe(1);
    expect(r.blocks[4].sourceIds).toEqual(["m"]);
  });
  it("versões aprovadas não inflam mapas novos; versão futura fica fora do período", () => {
    const r = build(
      [activity("a")],
      [
        record("old", 1, "2026-09-20T12:00:00Z"),
        record("revised", 2),
        record("future", 3, "2026-11-05T12:00:00Z"),
      ],
    );
    expect(r.metrics.newMapCount).toBe(0);
    expect(r.metrics.mapRevisions).toBe(1);
    expect(r.blocks[4].sourceIds).toEqual(["revised"]);
  });
  it("não conta rascunhos nem ciclos alheios", () => {
    const r = build(
      [
        { ...activity("a"), status: "draft" },
        { ...activity("other"), owner_id: "outro" },
      ],
      [{ ...record("m"), status: "draft" }],
    );
    expect(r.metrics.activityCount).toBe(0);
    expect(r.metrics.newMapCount).toBe(0);
    expect(r.warnings.length).toBeGreaterThan(0);
  });
  it("não soma público duplicado de evento compartilhado", () => {
    const r = build([
      { ...activity("a"), canonical_action_id: "event" },
      { ...activity("b"), canonical_action_id: "event" },
    ]);
    expect(r.metrics.eventCount).toBe(1);
    expect(r.metrics.workshopCount).toBe(1);
    expect(r.metrics.activityCount).toBe(2);
    expect(r.metrics.estimatedParticipations).toBe(0);
    expect(r.warnings.join(" ")).toContain("múltiplas contribuições");
  });
  it("não conta preparação como oficina, evento de público ou estimativa zero inventada", () => {
    const r = build(
      [
        {
          ...activity("a"),
          activity_type: "preparation",
          participation_kind: "not_recorded",
          participation_count: null,
        },
      ],
      [],
    );
    expect(r.metrics.workshopCount).toBe(0);
    expect(r.metrics.unknownParticipationEvents).toBe(0);
  });
  it("exclui cadeia de achados quando origem foi reaberta", () => {
    const finding = {
      ...record("f"),
      record_key: "f",
      kind: "finding" as const,
      source_activity_ids: [],
      source_record_ids: ["m"],
      content: { description: "Achado" },
    };
    const r = build(
      [{ ...activity("a"), status: "needs_changes" }],
      [record("m"), finding],
    );
    expect(r.metrics.findings).toBe(0);
    expect(r.metrics.newMapCount).toBe(0);
    expect(r.warnings.join(" ")).toContain("fontes reabertas");
  });
  it("inclui apenas anexos de registros selecionados e aprovados", () => {
    const r = buildFecTechnicalReport("2026-10", "e", "u", {
      cycles: [cycle],
      activities: [activity("a")],
      records: [record("m")],
      files: [
        { id: "file", record_id: "m", title: "Mapa.pdf" },
        { id: "other", record_id: "outro", title: "Outro.pdf" },
      ],
    });
    expect(r.blocks[10].sourceIds).toEqual(["file"]);
  });
  it("não atribui automaticamente cadastro de ações à APS", () => {
    const r = buildFecTerritorialOverview(
      [{ id: "shared", status: "realizada" }],
      [{ ...activity("a"), canonical_action_id: "shared" }],
    );
    expect(r.eventCount).toBe(1);
    expect(r.officialActionIds).toEqual(["shared"]);
    expect(r.fecContributionIds).toEqual(["a"]);
    expect(r).not.toHaveProperty("apsContributionIds");
  });
});
