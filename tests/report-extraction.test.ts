import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { extractTextFromPdf } from "@/lib/report-extraction";

describe("extractTextFromPdf", () => {
  it("extrai texto de um PDF textual usando a API atual do pdf-parse", async () => {
    const pdfBuffer = readFileSync("C:/Users/Micro/Downloads/00_guia_pacote_pl_veco_v0_2_3.pdf");

    const text = await extractTextFromPdf(pdfBuffer);

    expect(text).toContain("GUIA DO PACOTE");
    expect(text.length).toBeGreaterThan(1000);
  });
});
