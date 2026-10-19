import { describe, expect, it } from "vitest";
import { isMonthlyEditable, isOutsideMonth, mapMonthlyText, monthlyExtractionQuality, monthlyFields } from "@/lib/professional-monthly-reports";
describe("professional monthly reports", () => {
  it("maps accented and numbered template headings without mixing evidence types", () => {
    const result = mapMonthlyText("1. Síntese do período\nOficina de outubro\n2. Relatos dos participantes\nPercebem poeira.\n3. Observações da equipe\nRegistro da dinâmica.\n4. Referências de medição ou pesquisa\nNão houve medição.");
    expect(result).toEqual({ summary: "Oficina de outubro", participant_accounts: "Percebem poeira.", team_observations: "Registro da dinâmica.", research_references: "Não houve medição." });
  });
  it("maps all form headings", () => {
    const text = monthlyFields.map(([,label]) => `${label}\nConteúdo da seção.`).join("\n");
    expect(Object.keys(mapMonthlyText(text))).toHaveLength(monthlyFields.length);
    expect(monthlyExtractionQuality(text, mapMonthlyText(text))).toBe("high");
  });
  it("does not invent content for scanned PDFs or unstructured documents", () => {
    expect(mapMonthlyText("")).toEqual({});
    expect(mapMonthlyText("Texto sem cabeçalhos.")).toEqual({});
    expect(monthlyExtractionQuality("", {})).toBe("low");
  });
  it("does not import template placeholders and the closing delivery instructions", () => {
    expect(mapMonthlyText("Planejamento do mês seguinte\n[Preencher]\nRetomar a oficina.\nMateriais e cuidados de envio\nInstruções do modelo.")).toEqual({ next_steps: "Retomar a oficina." });
  });
  it("handles month boundaries and undated activities", () => {
    expect(isOutsideMonth("2026-10-31", "2026-10-01")).toBe(false);
    expect(isOutsideMonth("2026-11-01", "2026-10")).toBe(true);
    expect(isOutsideMonth(null, "2026-10")).toBe(true);
  });
  it("only drafts and requested changes allow content editing", () => {
    expect(isMonthlyEditable("draft")).toBe(true); expect(isMonthlyEditable("needs_changes")).toBe(true);
    for (const s of ["submitted", "in_review", "approved"] as const) expect(isMonthlyEditable(s)).toBe(false);
  });
});
