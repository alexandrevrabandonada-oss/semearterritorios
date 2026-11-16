import { describe, it, expect } from "vitest";
import {
  monthlySectionTitles,
  parseFecMonthlyCommand,
  fecMonthlyPresentation,
  type FecMonthlyRow,
} from "@/lib/fec-monthly-versions";
import {
  fecReviewDay,
  buildFecTechnicalReport,
} from "@/lib/fec-technical-report";
import type { FecKnowledgeRow } from "@/lib/fec-knowledge";
import type { FecActivityRow, FecCycleRow } from "@/lib/fec-persistence.types";
const id = (n: number) =>
  `10000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
const blocks = monthlySectionTitles.map((title) => ({
  title,
  text: "Texto com fontes conferíveis.",
  sourceIds: [id(1)],
}));
describe("comandos e apresentação do fechamento mensal FEC", () => {
  it("não aceita autoria, fontes ou indicadores enviados pelo cliente", () => {
    expect(parseFecMonthlyCommand({ action: "__proto__" }).ok).toBe(false);
    expect(parseFecMonthlyCommand({ action: "constructor" }).ok).toBe(false);
    expect(
      parseFecMonthlyCommand({
        action: "open",
        engagementId: id(2),
        month: "2026-10",
        snapshot: {},
      }).ok,
    ).toBe(false);
    expect(
      parseFecMonthlyCommand({
        action: "save",
        id: id(3),
        revision: 1,
        blocks,
        noActivityReason: "",
        owner_id: id(9),
      }).ok,
    ).toBe(false);
  });
  it("valida mês real e versão anterior explícita", () => {
    expect(
      parseFecMonthlyCommand({
        action: "open",
        engagementId: id(2),
        month: "2026-13",
      }).ok,
    ).toBe(false);
    expect(
      parseFecMonthlyCommand({
        action: "open",
        engagementId: id(2),
        month: "0000-01",
      }).ok,
    ).toBe(false);
    expect(
      parseFecMonthlyCommand({
        action: "open",
        engagementId: id(2),
        month: "2026-10",
        previousId: id(4),
      }).ok,
    ).toBe(true);
  });
  it("reprocessamento exige confirmação de substituição", () => {
    expect(
      parseFecMonthlyCommand({ action: "refresh", id: id(3), revision: 1 }).ok,
    ).toBe(false);
    expect(
      parseFecMonthlyCommand({
        action: "refresh",
        id: id(3),
        revision: 1,
        confirmReplace: true,
      }).ok,
    ).toBe(true);
  });
  it("valida estrutura, referências e revisão otimista do texto", () => {
    expect(
      parseFecMonthlyCommand({
        action: "save",
        id: id(3),
        revision: 1,
        blocks,
        noActivityReason: "",
      }).ok,
    ).toBe(true);
    expect(
      parseFecMonthlyCommand({
        action: "save",
        id: id(3),
        revision: 1.5,
        blocks,
        noActivityReason: "",
      }).ok,
    ).toBe(false);
    expect(
      parseFecMonthlyCommand({
        action: "save",
        id: id(3),
        revision: 1,
        blocks: blocks.slice(0, 10),
        noActivityReason: "",
      }).ok,
    ).toBe(false);
    expect(
      parseFecMonthlyCommand({
        action: "save",
        id: id(3),
        revision: 1,
        blocks: blocks.map((b, i) =>
          i === 0 ? { ...b, sourceIds: [id(1), id(1)] } : b,
        ),
        noActivityReason: "",
      }).ok,
    ).toBe(false);
  });
  it("aprovação exige conferências booleanas e ajustes exigem motivo", () => {
    expect(
      parseFecMonthlyCommand({
        action: "transition",
        id: id(3),
        revision: 1,
        decision: "approved",
        reason: "",
        checklist: { sources: "true" },
      }).ok,
    ).toBe(false);
    expect(
      parseFecMonthlyCommand({
        action: "transition",
        id: id(3),
        revision: 1,
        decision: "needs_changes",
        reason: "",
      }).ok,
    ).toBe(false);
    expect(
      parseFecMonthlyCommand({
        action: "transition",
        id: id(3),
        revision: 1,
        decision: "approved",
        reason: "Conferido",
        checklist: {
          sources: true,
          methodology: true,
          privacy: true,
          deliverables: true,
        },
      }).ok,
    ).toBe(true);
  });
  it("exporta o texto salvo e a identidade da aprovação, sem regenerar a narrativa", () => {
    const row = {
      id: id(1),
      engagement_id: id(2),
      owner_id: id(3),
      reference_month: "2026-10-01",
      version: 2,
      status: "approved",
      snapshot: {
        cycles: [],
        activities: [],
        records: [],
        files: [],
        month: "2026-10",
        ownerId: id(3),
        engagementId: id(2),
      },
      blocks: blocks.map((b) => ({
        ...b,
        text: "Narrativa editada e revisada",
        sourceIds: [],
      })),
      previous_id: null,
      calculation_version: 1,
      metrics: buildFecTechnicalReport("2026-10", id(2), id(3), {
        cycles: [],
        activities: [],
        records: [],
        files: [],
      }).metrics,
      review_checklist: {
        sources: true,
        methodology: true,
        privacy: true,
        deliverables: true,
      },
      review_notes: "Conferido",
      revision: 5,
      created_by: id(3),
      created_at: "2026-10-19T10:00:00Z",
      updated_at: "2026-10-19T12:00:00Z",
      change_note: "Conferido",
      source_hash: "a".repeat(64),
      reviewed_by: id(4),
      reviewed_at: "2026-10-19T12:00:00Z",
      no_activity_reason: "Preparação documental",
    } as FecMonthlyRow;
    const view = fecMonthlyPresentation(row);
    expect(view.markdown).toContain("Narrativa editada e revisada");
    expect(view.markdown).toContain("Versão:** 2");
    expect(view.computed.approval).toBe("approved");
    expect(view.computed.metrics.activityCount).toBe(0);
    expect(view.markdown).toContain("não constitui aceite financeiro");
  });
  it("interpreta o mês da revisão pelo horário de Brasília", () => {
    expect(fecReviewDay("2026-10-01T01:00:00Z")).toBe("2026-09-30");
    expect(fecReviewDay("2026-11-01T01:00:00Z")).toBe("2026-10-31");
    expect(fecReviewDay("2026-10-01")).toBe("2026-10-01");
  });
  it("revisão na madrugada UTC pertence ao mês local e usa nome territorial congelado", () => {
    const cycle = {
      id: "c",
      owner_id: "u",
      engagement_id: "e",
      neighborhood_id: "n",
    } as FecCycleRow;
    const a = {
      id: "a",
      cycle_id: "c",
      owner_id: "u",
      activity_date: "2026-10-10",
      status: "approved",
      activity_type: "training",
      participation_kind: "not_recorded",
      participation_count: null,
      objective: "O",
      methodology: "M",
    } as FecActivityRow;
    const r = {
      id: "m",
      record_key: "k",
      version: 1,
      cycle_id: "c",
      owner_id: "u",
      kind: "map",
      title: "Mapa",
      status: "approved",
      reviewed_at: "2026-11-01T01:00:00Z",
      source_activity_ids: ["a"],
      source_record_ids: [],
      content: {},
      community_status: "not_requested",
      previous_id: null,
      community_notes: "",
      proposal_status: "recorded",
      reviewed_by: "supervisor",
      review_notes: null,
      created_at: "2026-10-19T10:00:00Z",
      updated_at: "2026-10-19T10:00:00Z",
    } as FecKnowledgeRow;
    const report = buildFecTechnicalReport("2026-10", "e", "u", {
      cycles: [cycle],
      activities: [a],
      records: [r],
      files: [],
      neighborhoods: [{ id: "n", name: "Território oficial" }],
    });
    expect(report.metrics.newMapCount).toBe(1);
    expect(report.blocks[1].text).toContain("Território oficial");
  });
});
