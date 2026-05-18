import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { extractTextFromPdf, mapRawTextToReport } from "@/lib/report-extraction";

describe("extractTextFromPdf", () => {
  it("extrai texto de um PDF textual usando a API atual do pdf-parse", async () => {
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

    expect(report.summary).toContain("Dar continuidade");
    expect(report.activities_done).toContain("Supervisão e acompanhamento");
  });
});
