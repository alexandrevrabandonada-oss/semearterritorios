import { describe, expect, it } from "vitest";
import { buildFecFieldDraftMarkdown, emptyFecFieldDraft, validateFecFieldDraft, type FecFieldDraft } from "@/lib/fec-field-protocol";

const valid: FecFieldDraft = {
  ...emptyFecFieldDraft,
  territory: "Bairro demonstrativo",
  question: "Como participantes representam o ar e o território?",
  activityDate: "2026-10-19",
  activityType: "cartography_workshop",
  objective: "Construir mapa social com os participantes.",
  methodology: "Mapa-base, legendas coletivas e roda de diálogo.",
  participationKind: "estimated",
  participantCount: "12",
  participantAccounts: "Participantes descreveram poeira em locais coletivos.",
  mapMethod: "Mapa-base coletivo",
  mapLegend: "P: percepção comunitária de poeira",
  finding: "Percepção de poeira relatada no encontro.",
};

describe("protocolo de campo FEC — prévia local", () => {
  it("exige método e legenda da cartografia", () => {
    expect(validateFecFieldDraft(valid)).toEqual([]);
    expect(validateFecFieldDraft({ ...valid, mapLegend: "" })).toContain(
      "Oficina de cartografia exige método de construção do mapa e legenda."
    );
  });

  it("valida data real e não confunde participação ausente com zero", () => {
    expect(validateFecFieldDraft({ ...valid, activityDate: "2026-02-30" })).toContain(
      "Informe uma data real no formato AAAA-MM-DD."
    );
    const missing = { ...valid, participantCount: "", participationKind: "not_recorded" as const };
    expect(validateFecFieldDraft(missing)).toEqual([]);
    expect(buildFecFieldDraftMarkdown(missing)).toContain("Não registrado; não equivale a zero.");
  });

  it("impede público em trabalho de preparação e sistematização", () => {
    expect(validateFecFieldDraft({ ...valid, activityType: "preparation" })).toContain(
      "Preparação e sistematização não contabilizam público participante."
    );
  });

  it("impede achado sem fonte rastreável", () => {
    const noEvidence = { ...valid, participantAccounts: "", teamObservations: "", externalSources: "" };
    expect(validateFecFieldDraft(noEvidence)).toContain(
      "Para registrar achado, informe sua origem: relato, observação ou referência externa."
    );
  });

  it("alerta sobre identificadores pessoais, mesmo na prévia não persistida", () => {
    expect(validateFecFieldDraft({ ...valid, participantAccounts: "Escrever para contato@exemplo.org." })
      .some(message => message.includes("Possível dado pessoal"))).toBe(true);
  });

  it("distingue relato, observação, ciência e atribuição contratual no documento", () => {
    const text = buildFecFieldDraftMarkdown(valid);
    expect(text).toContain("**Executor:** frente técnica FEC");
    expect(text).toContain("Relatos de participantes — NÃO são medições");
    expect(text).toContain("Observações diretas da equipe");
    expect(text).toContain("Referências externas / estudos / medições identificadas");
    expect(text).toContain("12 participações estimadas");
    expect(text).toContain("NÃO enviada nem aprovada");
    expect(text).toContain("validação comunitária nem aceite financeiro FEC");
  });

  it("não gera minuta quando faltam obrigatórios", () => {
    expect(() => buildFecFieldDraftMarkdown(emptyFecFieldDraft)).toThrow();
  });
});