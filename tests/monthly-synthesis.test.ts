import { describe, expect, it } from "vitest";
import {
  buildMonthlySynthesis,
  publicPacket,
  validateSynthesisBlocks,
  type SynthesisInput,
  type MonthlySynthesis,
} from "@/lib/monthly-synthesis";
import { emptyActivityContent } from "@/lib/weekly-activities";

function input(): SynthesisInput {
  return {
    month: "2026-10",
    scope: "project",
    reports: [
      {
        id: "r1",
        team_member_id: "m1",
        status: "approved",
        week_start: "2026-09-28",
        week_end: "2026-10-04",
      },
      {
        id: "r2",
        team_member_id: "m2",
        status: "submitted",
        week_start: "2026-10-05",
        week_end: "2026-10-11",
      },
    ],
    items: [
      {
        ...emptyActivityContent,
        id: "i1",
        report_id: "r1",
        activity_date: "2026-10-01",
        kind: "field",
        action_id: "a1",
        title: "Oficina",
        fronts: ["education", "mapping"],
        participant_accounts: "Percepção de poeira",
        team_observations: "Anotação da equipe",
        research_references: "Referência de pesquisa",
      },
      {
        ...emptyActivityContent,
        id: "i2",
        report_id: "r1",
        activity_date: "2026-10-02",
        kind: "field",
        action_id: "a1",
        title: "Sistematização da mesma ação",
        fronts: ["mapping"],
      },
      {
        ...emptyActivityContent,
        id: "i3",
        report_id: "r2",
        activity_date: "2026-10-06",
        kind: "field",
        action_id: "a2",
        title: "Pendente",
        fronts: ["education"],
      },
    ],
    products: [
      {
        id: "p1",
        item_id: "i1",
        product_key: "key",
        version: 1,
        title: "Mapa",
        product_type: "social_map",
        description: "Primeira versão",
        map_context: "Oficina",
        map_legend: "Pontos",
      },
      {
        id: "p2",
        item_id: "i2",
        product_key: "key",
        version: 2,
        title: "Mapa",
        product_type: "social_map",
        description: "Revisão",
        map_context: "Oficina",
        map_legend: "Pontos",
      },
    ],
    actions: [
      {
        id: "a1",
        action_date: "2026-10-01",
        status: "realizada",
        title: "Oficina",
        objective: "Aprender",
        neighborhood_id: "n1",
      },
      {
        id: "a2",
        action_date: "2026-10-06",
        status: "planejada",
        title: "Planejada",
      },
      {
        id: "a3",
        action_date: "2026-10-07",
        status: "cancelada",
        title: "Cancelada",
      },
    ],
    workshops: [
      {
        id: "w1",
        action_id: "a1",
        workshop_date: "2026-10-01",
        status: "approved",
        participants_estimated: 12,
      },
    ],
    records: [],
  } as unknown as SynthesisInput;
}
describe("síntese mensal rastreável", () => {
  it("deduplica ações, frentes e produtos versionados", () => {
    const base = buildMonthlySynthesis(input());
    expect(base.metrics).toMatchObject({
      actions: 1,
      planned_actions: 1,
      cancelled_actions: 1,
      workshops: 1,
      estimated_participations: 12,
      products: 1,
    });
    expect(base.metrics.fronts.mapping).toBe(1);
    expect(
      base.sources.filter((s) => s.kind === "product").map((s) => s.id),
    ).toEqual(["p2"]);
  });
  it("exclui texto pendente mas mantém aviso", () => {
    const base = buildMonthlySynthesis(input());
    expect(base.sources.some((s) => s.id === "i3")).toBe(false);
    expect(base.metrics.pending_weeklies).toBe(1);
    expect(base.warnings.join(" ")).toContain("pendentes");
  });
  it("usa a data da atividade, não o início da semana", () => {
    const data = input();
    data.items[1].activity_date = "2026-09-30";
    const base = buildMonthlySynthesis(data);
    expect(base.sources.some((s) => s.id === "i2")).toBe(false);
    expect(base.sources.some((s) => s.id === "i1")).toBe(true);
  });
  it("recorta profissional sem atribuir as ações de todos a ele", () => {
    const data = input();
    data.scope = "m2";
    expect(buildMonthlySynthesis(data).metrics.actions).toBe(0);
    expect(buildMonthlySynthesis(data).sources).toEqual([]);
  });
  it("preparação não cria oficina nem público", () => {
    const data = input();
    data.actions = [];
    data.workshops = [];
    data.items = [{ ...data.items[0], kind: "preparation", action_id: null }];
    const b = buildMonthlySynthesis(data);
    expect(b.metrics.actions).toBe(0);
    expect(b.metrics.workshops).toBe(0);
    expect(b.metrics.estimated_participations).toBeNull();
    expect(b.sources[0].kind).toBe("weekly_activity");
  });
  it("não converte falta de estimativa em zero", () => {
    const data = input();
    data.workshops[0].participants_estimated = null;
    expect(buildMonthlySynthesis(data).metrics).toMatchObject({
      estimated_participations: null,
      workshops_without_estimate: 1,
    });
  });
  it("mantém relato, observação e referência em campos distintos", () => {
    const b = buildMonthlySynthesis(input());
    expect(b.sources[0].content).toMatchObject({
      participant_accounts: "Percepção de poeira",
      team_observations: "Anotação da equipe",
      research_references: "Referência de pesquisa",
    });
    expect(b.sources[0].preliminary).toBe(true);
  });
  it("omite contatos das fontes de geração", () => {
    const data = input();
    data.items[0].participant_accounts = "Contatar pessoa@example.com";
    const b = buildMonthlySynthesis(data);
    expect(JSON.stringify(b)).not.toContain("pessoa@example.com");
    expect(b.warnings.join(" ")).toContain("privacidade");
  });
  it("não envia falas brutas de escutas para a IA", () => {
    const data = input();
    data.records = [
      {
        id: "l1",
        date: "2026-10-01",
        review_status: "reviewed",
        action_id: "a1",
        main_complaint: "Texto sigiloso",
        record_type: "individual",
      },
    ] as unknown as SynthesisInput["records"];
    const b = buildMonthlySynthesis(data);
    expect(b.metrics.individual_listenings).toBe(1);
    expect(JSON.stringify(b.sources)).not.toContain("Texto sigiloso");
  });
  it("valida referências contra a versão das fontes", () => {
    const b = buildMonthlySynthesis(input());
    expect(
      validateSynthesisBlocks(
        [{ section: "Resultado", text: "Texto", source_ids: ["i1"] }],
        b,
      ),
    ).toBe(true);
    expect(
      validateSynthesisBlocks(
        [{ section: "Resultado", text: "Texto", source_ids: ["inventada"] }],
        b,
      ),
    ).toBe(false);
  });
  it("projeção pública não contém IDs internos, anexos ou contagens de equipe", () => {
    const base = buildMonthlySynthesis(input());
    const row = {
      id: "s1",
      version: 1,
      status: "approved",
      scope_key: "project",
      reference_month: "2026-10-01",
      approved_at: "2026-11-01T00:00:00Z",
      base,
      public_blocks: [
        { section: "Resultado", text: "Síntese revisada", source_ids: ["i1"] },
      ],
    } as MonthlySynthesis;
    const packet = publicPacket(row);
    expect(packet.blocks).toEqual([
      { section: "Resultado", text: "Síntese revisada" },
    ]);
    expect(JSON.stringify(packet)).not.toContain("source_ids");
    expect(packet.metrics).not.toHaveProperty("approved_weeklies");
    expect(() => publicPacket({ ...row, status: "draft" })).toThrow();
    expect(() => publicPacket({ ...row, scope_key: "m1" })).toThrow();
    expect(() =>
      publicPacket({
        ...row,
        public_blocks: [
          { section: "Contato", text: "pessoa@example.com", source_ids: [] },
        ],
      }),
    ).toThrow();
  });
});
