import { describe, expect, it } from "vitest";
import { buildMonthlyReportData, buildMonthlyReportMarkdown } from "@/lib/monthly-reports";

const themeIds = {
  air: "theme-air",
  publicPower: "theme-public-power",
  dust: "theme-dust",
  health: "theme-health",
  waste: "theme-waste"
};

const themes = {
  air: { id: themeIds.air, name: "ar/poluição" },
  publicPower: { id: themeIds.publicPower, name: "poder público" },
  dust: { id: themeIds.dust, name: "pó/sujeira" },
  health: { id: themeIds.health, name: "saúde" },
  waste: { id: themeIds.waste, name: "lixo/resíduos" }
};

describe("relatório mensal interpretativo", () => {
  const report = buildMonthlyReportData("2026-04", buildActions(), buildRecords());

  it("consolida o cenário de abril de 2026 sem conclusão forte por bairro", () => {
    expect(report.totalActions).toBe(2);
    expect(report.totalRecords).toBe(99);
    expect(report.territorialQuality.coveragePercent).toBe(34.3);
    expect(report.respondentWithoutNeighborhood).toBe(65);
    expect(report.territorialQuality.qualityStatus).toBe("crítica");
    expect(report.executiveSummary).toContain("não possui território de referência");
    expect(report.executiveSummary).toContain("sem produzir conclusão territorial forte");
    expect(report.topThemes.map((item) => item.name).slice(0, 5)).toEqual([
      "ar/poluição",
      "poder público",
      "pó/sujeira",
      "saúde",
      "lixo/resíduos"
    ]);
  });

  it("agrupa prioridades por macroeixo com exemplos sanitizados e fallback em Outros", () => {
    expect(report.priorityGroups.map((item) => item.axis)).toEqual(expect.arrayContaining([
      "Fiscalização e poder público",
      "Limpeza urbana e coleta",
      "Ar, poluição e pó",
      "Arborização e sombra",
      "Saúde e qualidade de vida",
      "Educação ambiental",
      "Água e rio",
      "Empresas e CSN",
      "Outros"
    ]));
    expect(report.priorityGroups.find((item) => item.axis === "Outros")?.examples).toContain("Tema novo sem vocabulário conhecido");
    expect(report.priorityGroups.flatMap((item) => item.examples).join(" ")).not.toContain("11999999999");
  });

  it("agrupa sinais qualitativos sem expor fala bruta ou dado identificável", () => {
    expect(report.qualitativeSignals.map((item) => item.type)).toEqual(expect.arrayContaining([
      "Saúde e desconforto",
      "Rio e escória",
      "Fiscalização",
      "Percepção sobre poluição",
      "Infraestrutura urbana",
      "Cuidado coletivo"
    ]));
    const examples = report.qualitativeSignals.flatMap((item) => item.examples).join(" ");
    expect(examples).not.toContain("maria@example.com");
    expect(examples).not.toContain("11999999999");
    expect(examples).not.toContain("12345678900");
  });

  it("remove pendências e anexos internos do markdown público", () => {
    const internal = buildMonthlyReportMarkdown(report, "internal");
    const publicVersion = buildMonthlyReportMarkdown(report, "public");

    expect(internal).toContain("Pendências e próximos passos");
    expect(publicVersion).not.toContain("Pendências e próximos passos");
    expect(publicVersion).not.toContain("fala original");
    expect(publicVersion).not.toContain("respondent_neighborhood_id");
    expect(publicVersion).not.toContain("draft");
    expect(publicVersion).toContain("Versão pública sem lista individualizada");
  });

  it("trata roda de conversa como relato coletivo separado das escutas individuais", () => {
    const rodaReport = buildMonthlyReportData("2026-04", [
      ...buildActions(),
      {
        id: "action-roda",
        title: "Roda de conversa no CRAS",
        action_date: "2026-04-22",
        action_type: "roda",
        neighborhoods: { id: "n-action-3", name: "Rústico" }
      }
    ] as any[], [
      ...buildRecords().slice(0, 2),
      {
        id: "record-roda-1",
        date: "2026-04-22",
        action_id: "action-roda",
        actions: { id: "action-roda", title: "Roda de conversa no CRAS", action_type: "roda" },
        neighborhoods: { id: "n-action-3", name: "Rústico" },
        respondent_neighborhood_id: null,
        respondent_neighborhoods: null,
        source_type: "roda",
        review_status: "reviewed",
        interviewer_team_member_id: "member-1",
        interviewer_name: "Entrevistadora",
        free_speech_text: "relato unificado da roda",
        team_summary: "síntese coletiva da roda",
        words_used: "poeira, medo",
        priority_mentioned: "fiscalização do poder público",
        unexpected_notes: "moradores citaram outros bairros afetados",
        respondent_city: null,
        respondent_territory_relation: null,
        respondent_occupation: null,
        places_mentioned_text: "Bairros citados na roda: Rústico, Retiro",
        listening_record_themes: [{ themes: themes.air }],
        listening_record_mentioned_neighborhoods: [
          { neighborhoods: { id: "n-rustico", name: "Rústico" } },
          { neighborhoods: { id: "n-retiro", name: "Retiro" } }
        ]
      }
    ] as any[]);

    expect(rodaReport.totalRecords).toBe(3);
    expect(rodaReport.individualListeningRecords).toBe(2);
    expect(rodaReport.conversationCircleSummary.reports).toBe(1);
    expect(rodaReport.territorialQuality.totalRecords).toBe(2);
    expect(rodaReport.respondentWithoutNeighborhood).toBe(0);
    expect(rodaReport.conversationCircleSummary.mentionedNeighborhoods.map((item) => item.name)).toEqual(["Retiro", "Rústico"]);

    const markdown = buildMonthlyReportMarkdown(rodaReport, "internal");
    expect(markdown).toContain("## 5. Rodas de conversa");
    expect(markdown).toContain("Bairros citados nas rodas: Retiro (1), Rústico (1)");
  });
});

function buildActions() {
  return [
    {
      id: "action-1",
      title: "Banca de escuta de abril",
      action_date: "2026-04-10",
      action_type: "listening_booth",
      neighborhoods: { id: "n-action-1", name: "Aterrado" }
    },
    {
      id: "action-2",
      title: "Busca ativa de abril",
      action_date: "2026-04-18",
      action_type: "active_search",
      neighborhoods: { id: "n-action-2", name: "Vila Santa Cecília" }
    }
  ] as any[];
}

function buildRecords() {
  const priorities = [
    "cobrança do poder público",
    "melhorar coleta de lixo",
    "reduzir pó e poluição do ar",
    "plantar árvores e criar sombra",
    "cuidar da saúde respiratória",
    "educação ambiental",
    "cuidar do rio e da água",
    "cobrar empresas e CSN",
    "tema novo sem vocabulário conhecido",
    "telefone 11999999999 deve sumir"
  ];
  const unexpected = [
    "desconforto respiratório",
    "rio com escória",
    "pedido de fiscalização",
    "percepção sobre poluição",
    "rua com infraestrutura ruim",
    "cuidado coletivo",
    "contato maria@example.com e 12345678900 devem sumir"
  ];

  return Array.from({ length: 99 }, (_, index) => {
    const hasTerritory = index < 34;
    return {
      id: `record-${index + 1}`,
      date: "2026-04-10",
      action_id: index < 50 ? "action-1" : "action-2",
      actions: index < 50
        ? { id: "action-1", title: "Banca de escuta de abril", action_type: "listening_booth" }
        : { id: "action-2", title: "Busca ativa de abril", action_type: "active_search" },
      neighborhoods: index < 50 ? { id: "n-action-1", name: "Aterrado" } : { id: "n-action-2", name: "Vila Santa Cecília" },
      respondent_neighborhood_id: hasTerritory ? `n-ref-${(index % 4) + 1}` : null,
      respondent_neighborhoods: hasTerritory ? { id: `n-ref-${(index % 4) + 1}`, name: `Território ${((index % 4) + 1)}` } : null,
      source_type: "in_person",
      review_status: index < 95 ? "reviewed" : "draft",
      free_speech_text: "fala bruta que não deve aparecer no modo público",
      team_summary: index % 3 === 0 ? "síntese da equipe" : null,
      priority_mentioned: priorities[index % priorities.length],
      unexpected_notes: unexpected[index % unexpected.length],
      respondent_city: "Volta Redonda",
      respondent_territory_relation: null,
      respondent_occupation: null,
      listening_record_themes: buildThemeLinks(index)
    };
  }) as any[];
}

function buildThemeLinks(index: number) {
  const links = [{ themes: themes.air }];
  if (index < 82) links.push({ themes: themes.publicPower });
  if (index < 64) links.push({ themes: themes.dust });
  if (index < 48) links.push({ themes: themes.health });
  if (index < 32) links.push({ themes: themes.waste });
  return links;
}
