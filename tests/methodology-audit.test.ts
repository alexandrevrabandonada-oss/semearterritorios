import { describe, expect, it } from "vitest";
import { buildActionDebrief } from "@/lib/action-debriefs";
import { getActionReadiness } from "@/lib/action-pilot";
import { isMonthValue } from "@/lib/monthly-reports";

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
    expect(getActionReadiness([record({ review_status: "reviewed", free_speech_text: "Contato maria@example.com" })])).not.toBe("Pronta para relatório");
  });

  it("rejeita meses fora do calendário", () => {
    expect(isMonthValue("2026-00")).toBe(false);
    expect(isMonthValue("2026-13")).toBe(false);
    expect(isMonthValue("2026-12")).toBe(true);
  });
});

