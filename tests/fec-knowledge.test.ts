import { describe, expect, it } from "vitest";
import { parseKnowledge } from "@/lib/fec-knowledge";
const id = (n: number) =>
  `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
const map = {
  cycleId: id(1),
  kind: "map",
  title: "Mapa coletivo",
  content: {
    methodology: "Desenho dialogado",
    legend: "P: percepção",
    categories: "Experiências",
    authorship: "Grupo",
  },
  sourceActivityIds: [id(2)],
  sourceRecordIds: [],
};
describe("registros territoriais com fontes e versões", () => {
  it("mapa exige método, legenda, categorias e autoria coletiva", () => {
    expect(parseKnowledge(map, id(3)).ok).toBe(true);
    expect(
      parseKnowledge({ ...map, content: { methodology: "M" } }, id(3)).ok,
    ).toBe(false);
  });
  it("não aceita campos autorais ou de revisão do cliente", () => {
    expect(parseKnowledge({ ...map, owner_id: id(8) }, id(3)).ok).toBe(false);
    expect(parseKnowledge({ ...map, status: "approved" }, id(3)).ok).toBe(
      false,
    );
  });
  it("achado ou diagnóstico não existe sem fonte", () => {
    expect(
      parseKnowledge(
        {
          ...map,
          kind: "finding",
          content: { description: "Percepção" },
          sourceActivityIds: [],
        },
        id(3),
      ).ok,
    ).toBe(false);
  });
  it("diferencia classe de evidência de interpretação causal", () => {
    expect(
      parseKnowledge(
        {
          ...map,
          kind: "evidence",
          content: {
            evidence_class: "participant_account",
            description: "Relato agregado",
            reference: "Oficina de origem",
          },
        },
        id(3),
      ).ok,
    ).toBe(true);
    expect(
      parseKnowledge(
        {
          ...map,
          kind: "evidence",
          content: {
            evidence_class: "automatic_causality",
            description: "D",
            reference: "R",
          },
        },
        id(3),
      ).ok,
    ).toBe(false);
  });
  it("validação comunitária não é presumida", () => {
    const r = parseKnowledge(map, id(3));
    if (r.ok) expect(r.value.community_status).toBe("not_requested");
    expect(
      parseKnowledge({ ...map, communityStatus: "confirmed" }, id(3)).ok,
    ).toBe(false);
  });
  it("não transforma proposta em providência sem resposta documentada", () => {
    expect(
      parseKnowledge(
        {
          ...map,
          kind: "proposal",
          content: { description: "Solicitar estudo" },
          proposalStatus: "implemented",
        },
        id(3),
      ).ok,
    ).toBe(false);
    expect(
      parseKnowledge(
        {
          ...map,
          kind: "proposal",
          content: {
            description: "Solicitar estudo",
            response: "Resposta oficial vinculada",
          },
          proposalStatus: "answered",
        },
        id(3),
      ).ok,
    ).toBe(true);
  });
  it("rejeita duplicatas, fontes nulas e campos de outro tipo", () => {
    expect(
      parseKnowledge({ ...map, sourceActivityIds: [id(2), id(2)] }, id(3)).ok,
    ).toBe(false);
    expect(
      parseKnowledge(
        { ...map, content: { ...map.content, measurement: "999" } },
        id(3),
      ).ok,
    ).toBe(false);
  });
  it("preserva a referência da versão anterior, sem aceitar versão inventada", () => {
    const r = parseKnowledge({ ...map, previousId: id(7) }, id(3));
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.value.previous_id).toBe(id(7));
    expect(parseKnowledge({ ...map, version: 99 }, id(3)).ok).toBe(false);
  });
});
