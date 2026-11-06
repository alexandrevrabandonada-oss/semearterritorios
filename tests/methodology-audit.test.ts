import { describe, expect, it } from "vitest";
import { buildActionDebrief } from "@/lib/action-debriefs";
import { getActionReadiness } from "@/lib/action-pilot";
import { buildMonthlyReportCsv, buildMonthlyReportData, isMonthValue } from "@/lib/monthly-reports";
import { buildTransparencySnapshotDraft } from "@/lib/transparency-snapshots";

const action = { id: "a", title: "Ação", action_type: "banca_escuta", action_date: "2026-04-01", neighborhoods: null } as any;
const record = (overrides: Record<string, unknown> = {}) => ({
  id: "r", source_type: "feira", respondent_neighborhood_id: null,
  review_status: "draft", free_speech_text: "A comunidade relatou problemas de poeira",
  team_summary: null, places_mentioned_text: null, priority_mentioned: null,
  unexpected_notes: null, respondent_occupation: null, words_used: null,
  listening_record_themes: [], ...overrides
}) as any;

describe("garantias metodológicas", () => {
  it("não utiliza rascunhos como fonte quando não há registros revisados", () => {
    const result = buildActionDebrief(action, [record({ words_used: "palavraexclusiva" })]);
    expect(result.totalsSnapshot.source_records_for_public_text).toBe(0);
    expect(result.publicSummary).not.toContain("palavraexclusiva");
    expect(result.warnings.join(" ")).toContain("permanecer em rascunho");
  });

  it("não considera uma ação pronta quando há alerta sensível", () => {
    expect(getActionReadiness([record({ review_status: "reviewed", human_reviewed_at: "2026-01-01", free_speech_text: "Contato maria@example.com" })])).not.toBe("Pronta para relatório");
  });

  it("exclui da devolutiva um registro com contato no campo de prioridade", () => {
    const result = buildActionDebrief(action, [record({ review_status: "reviewed", human_reviewed_at: "2026-01-01", priority_mentioned: "contato maria@example.com" })]);
    expect(result.totalsSnapshot.source_records_for_public_text).toBe(0);
    expect(result.keyFindings).not.toContain("maria@example.com");
  });

  it("não inclui rascunhos no denominador territorial da síntese", () => {
    const result = buildActionDebrief(action, [
      record({ review_status: "reviewed", human_reviewed_at: "2026-01-01", respondent_neighborhood_id: "bairro-a" }),
      record({ id: "r2", respondent_neighborhood_id: null })
    ]);
    expect(result.totalsSnapshot.source_records_for_public_text).toBe(1);
    expect(result.totalsSnapshot.territorial_coverage_percent).toBe(100);
    expect(result.generatedMarkdown).not.toContain("bairro-a");
  });

  it("trata registros de uma ação de roda como relatos coletivos", () => {
    const result = buildActionDebrief({ ...action, action_type: "roda" }, [record({ review_status: "reviewed", human_reviewed_at: "2026-01-01" })]);
    expect(result.totalsSnapshot.individual_listening_records).toBe(0);
    expect(result.totalsSnapshot.conversation_circle_reports).toBe(1);
  });

  it("não confunde status automático com revisão humana", () => {
    const result = buildActionDebrief(action, [record({ review_status: "reviewed", words_used: "exclusivo" })]);
    expect(result.totalsSnapshot.source_records_for_public_text).toBe(0);
    expect(result.publicSummary).not.toContain("exclusivo");
    expect(getActionReadiness([record({ review_status: "reviewed" })], true)).not.toBe("Pronta para relatório");
  });

  it("snapshot público usa somente confirmações humanas e não reaproveita devolutiva anterior à confirmação", () => {
    const a = { ...action, status: "realizada", occurrence_confirmed_at: "2026-04-03T00:00:00Z", updated_at: "2026-04-03T00:00:00Z", neighborhood_id: null };
    const before = { id: "d", action_id: "a", status: "approved", approved_at: "2026-04-02T00:00:00Z" };
    const r1 = record({ id: "r1", action_id: "a", date: "2026-04-01", updated_at: "2026-04-03T00:00:00Z", review_status: "reviewed" });
    const r2 = record({ id: "r2", action_id: "a", date: "2026-04-01", updated_at: "2026-04-03T00:00:00Z", human_reviewed_at: "2026-04-03T00:00:00Z" });
    const snapshot = buildTransparencySnapshotDraft({ actions: [a], records: [r1, r2], debriefs: [before as any], closures: [] });
    expect(snapshot.totals.actions_realized).toBe(1);
    expect(snapshot.totals.listening_records).toBe(2);
    expect(snapshot.totals.listening_records_reviewed).toBe(1);
    expect(snapshot.totals.approved_debriefs).toBe(0);
    const unconfirmed = buildTransparencySnapshotDraft({ actions: [{ ...a, occurrence_confirmed_at: null }], records: [r1], debriefs: [], closures: [] });
    expect(unconfirmed.totals.actions_realized).toBe(0);
    expect(unconfirmed.totals.listening_records_reviewed).toBe(0);
  });

  it("rejeita meses fora do calendário", () => {
    expect(isMonthValue("2026-00")).toBe(false);
    expect(isMonthValue("2026-13")).toBe(false);
    expect(isMonthValue("2026-12")).toBe(true);
  });

  it("CSV diferencia revisão humana e neutraliza fórmulas em texto livre", () => {
    const item = record({ date: "2026-04-01", actions: null, neighborhoods: null, respondent_neighborhoods: null, priority_mentioned: "=1+1" });
    const csv = buildMonthlyReportCsv(buildMonthlyReportData("2026-04", [], [item]));
    expect(csv).toContain("revisao_humana_confirmada");
    expect(csv).toContain("não comprovada");
    expect(csv).toContain("'=1+1");
  });
});

