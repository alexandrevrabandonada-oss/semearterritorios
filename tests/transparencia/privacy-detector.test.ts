import { describe, expect, it } from "vitest";
import { buildTransparencyTextBlob, detectTransparencyPrivacyRisks } from "@/lib/transparency-privacy";

describe("transparency privacy detector", () => {
  it("detecta bloqueios para CPF, telefone e e-mail", () => {
    const text = [
      "Contato: maria@dominio.com",
      "CPF 123.456.789-09",
      "Fone 11987654321"
    ].join("\n");

    const report = detectTransparencyPrivacyRisks(text);

    expect(report.hasBlockingRisk).toBe(true);
    expect(report.blockers.map((risk) => risk.key)).toEqual(expect.arrayContaining(["cpf", "phone", "email"]));
  });

  it("detecta avisos para CEP, URL externa e dica de endereco", () => {
    const text = [
      "CEP 01001-000",
      "Veja https://example.com/recurso",
      "rua das flores 123"
    ].join("\n");

    const report = detectTransparencyPrivacyRisks(text);

    expect(report.hasWarningRisk).toBe(true);
    expect(report.warnings.map((risk) => risk.key)).toEqual(
      expect.arrayContaining(["cep", "suspicious_url", "address_hint"])
    );
  });

  it("nao marca url do proprio projeto como suspeita", () => {
    const text = "Painel: https://gtpitwhslqjgbuwlsaqg.supabase.co";
    const report = detectTransparencyPrivacyRisks(text);
    expect(report.warnings.some((risk) => risk.key === "suspicious_url")).toBe(false);
  });

  it("monta blob de texto sem nulos", () => {
    const blob = buildTransparencyTextBlob(["A", null, undefined, "B"]);
    expect(blob).toBe("A\nB");
  });
});
