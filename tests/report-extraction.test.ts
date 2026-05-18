import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { extractTextFromPdf, mapRawTextToReport } from "@/lib/report-extraction";
import { calculateExtractionQuality } from "@/lib/report-extraction-quality";

describe("extractTextFromPdf", () => {
  it("extrai texto de um PDF textual usando pdf-parse", async () => {
    const pdfBuffer = readFileSync("tests/fixtures/relatorio-semanal-07-05-a-14-05.pdf");

    const text = await extractTextFromPdf(pdfBuffer);

    expect(text).toContain("RELATÓRIO DE ATIVIDADES");
    expect(text).toContain("ATIVIDADES DESENVOLVIDAS");
    expect(text.length).toBeGreaterThan(1000);
  });

  it("mapeia os campos do relatório semanal extraído do PDF real", async () => {
    const pdfBuffer = readFileSync("tests/fixtures/relatorio-semanal-07-05-a-14-05.pdf");
    const text = await extractTextFromPdf(pdfBuffer);

    const report = mapRawTextToReport(text);

    expect(report.title).toContain("RELATÓRIO DE ATIVIDADES");
    expect(report.summary).toContain("Dar continuidade");
    expect(report.activities_done).toContain("Supervisão e acompanhamento");
    expect(report.learnings).toContain("fortalecimento da organização operacional");
    expect(report.next_steps).toContain("continuidade efetiva");
  });

  it("classifica como alta uma extração textual completa mesmo com alerta de privacidade", async () => {
    const pdfBuffer = readFileSync("tests/fixtures/relatorio-semanal-07-05-a-14-05.pdf");
    const text = await extractTextFromPdf(pdfBuffer);
    const report = mapRawTextToReport(text);
    const sectionsCount = [
      report.summary,
      report.activities_done,
      report.problems_found,
      report.learnings,
      report.pending_items,
      report.next_steps,
    ].filter(Boolean).length;

    const quality = calculateExtractionQuality({
      status: "extracted",
      text,
      sectionsCount,
      hasPrivacyAlerts: true,
    });

    expect(sectionsCount).toBeGreaterThanOrEqual(4);
    expect(quality).toBe("high");
  });
});
