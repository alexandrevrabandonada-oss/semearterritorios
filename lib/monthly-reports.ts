import { getActionTypeLabel } from "@/lib/actions";
import type { Action, ListeningRecord, Neighborhood, Theme } from "@/lib/database.types";
import { getRespondentTerritoryRelationLabel, getReviewStatusLabel, getSourceTypeLabel } from "@/lib/listening-records";
import { summarizeOccupations } from "@/lib/action-pilot";
import {
  buildTerritorialQualityMethodologyNote,
  calculateRespondentTerritoryQuality,
  type RespondentTerritoryQualityMetrics,
  type TerritorialQualityMethodologyNote
} from "@/lib/territorial-quality";

type ActionWithNeighborhood = Action & {
  neighborhoods: Pick<Neighborhood, "id" | "name"> | null;
};

type RecordWithRelations = ListeningRecord & {
  actions: Pick<Action, "id" | "title" | "action_type"> | null;
  neighborhoods: Pick<Neighborhood, "id" | "name"> | null;
  respondent_neighborhoods?: Pick<Neighborhood, "id" | "name"> | null;
  listening_record_themes: Array<{ themes: Pick<Theme, "id" | "name"> | null }>;
};

export type MonthlyReportData = {
  month: string;
  title: string;
  executiveSummary: string;
  totalActions: number;
  totalRecords: number;
  operationNeighborhoods: string[];
  respondentNeighborhoods: string[];
  respondentWithoutNeighborhood: number;
  actionTypeCounts: Array<{ name: string; count: number }>;
  actionTerritoryCounts: Array<{ name: string; count: number }>;
  respondentTerritoryCounts: Array<{ name: string; count: number }>;
  territorialQuality: RespondentTerritoryQualityMetrics;
  territorialMethodologyNote: TerritorialQualityMethodologyNote;
  topThemes: Array<{ name: string; count: number }>;
  sourceTypeCounts: Array<{ name: string; count: number }>;
  occupationCounts: Array<{ name: string; count: number }>;
  priorities: Array<{ name: string; count: number }>;
  priorityGroups: Array<{ axis: PriorityMacroAxis; count: number; examples: string[] }>;
  unexpectedTopics: Array<{ name: string; count: number }>;
  qualitativeSignals: Array<{ type: QualitativeSignalType; count: number; examples: string[] }>;
  monthlyLearnings: string[];
  recommendedReferrals: string[];
  activeSearchSummary: string;
  pedagogicalSummary: string;
  actions: ActionWithNeighborhood[];
  records: RecordWithRelations[];
  pendingReviews: RecordWithRelations[];
};

export type MonthlyReportMode = "internal" | "public";

type PriorityMacroAxis =
  | "Fiscalização e poder público"
  | "Limpeza urbana e coleta"
  | "Ar, poluição e pó"
  | "Arborização e sombra"
  | "Saúde e qualidade de vida"
  | "Educação ambiental"
  | "Água e rio"
  | "Empresas e CSN"
  | "Outros";

type QualitativeSignalType =
  | "Saúde e desconforto"
  | "Rio e escória"
  | "Fiscalização"
  | "Percepção sobre poluição"
  | "Infraestrutura urbana"
  | "Cuidado coletivo";

export function getMonthValue(date: string) {
  return date.slice(0, 7);
}

export function isMonthValue(value: string) {
  return /^\d{4}-\d{2}$/.test(value);
}

export function formatMonthLabel(value: string) {
  const [year, month] = value.split("-");
  return new Date(Number(year), Number(month) - 1, 1).toLocaleDateString("pt-BR", {
    month: "long",
    year: "numeric"
  });
}

export function collectAvailableMonths(actions: Array<Pick<Action, "action_date">>, records: Array<Pick<ListeningRecord, "date">>) {
  const values = new Set<string>();
  actions.forEach((item) => values.add(getMonthValue(item.action_date)));
  records.forEach((item) => values.add(getMonthValue(item.date)));
  return Array.from(values).sort((a, b) => b.localeCompare(a, "pt-BR"));
}

export function buildMonthlyReportData(month: string, actions: ActionWithNeighborhood[], records: RecordWithRelations[]): MonthlyReportData {
  const operationNeighborhoods = Array.from(new Set([
    ...actions.map((item) => item.neighborhoods?.name).filter(Boolean)
  ] as string[])).sort((a, b) => a.localeCompare(b, "pt-BR"));
  const respondentNeighborhoods = Array.from(new Set([
    ...records.map((item) => item.respondent_neighborhoods?.name).filter(Boolean)
  ] as string[])).sort((a, b) => a.localeCompare(b, "pt-BR"));
  const respondentWithoutNeighborhood = records.filter((item) => !item.respondent_neighborhood_id).length;

  const actionTypeCounts = countBy(actions, (item) => getActionTypeLabel(item.action_type));
  const actionTerritoryCounts = countBy(actions, (item) => item.neighborhoods?.name ?? "Território da ação não informado");
  const respondentTerritoryCounts = countBy(records.filter((item) => Boolean(item.respondent_neighborhoods?.name)), (item) => item.respondent_neighborhoods?.name ?? "");
  const territorialQuality = calculateRespondentTerritoryQuality(records.length, records.length - respondentWithoutNeighborhood);
  const territorialMethodologyNote = buildTerritorialQualityMethodologyNote(territorialQuality);
  const topThemes = countThemes(records).slice(0, 8);
  const sourceTypeCounts = countBy(records, (item) => getSourceTypeLabel(item.source_type));
  const occupationSummary = summarizeOccupations(records);
  const occupationCounts = occupationSummary.groups.map((item) => ({ name: item.label, count: item.count }));
  const allPriorities = countTextValues(records, (item) => item.priority_mentioned);
  const priorities = allPriorities.slice(0, 8);
  const unexpectedTopics = countTextValues(records, (item) => item.unexpected_notes).slice(0, 8);
  const priorityGroups = groupPrioritiesByMacroAxis(allPriorities);
  const qualitativeSignals = groupQualitativeSignals(unexpectedTopics);
  const pendingReviews = records.filter((item) => item.review_status === "draft");
  const executiveSummary = buildExecutiveSummary(actions.length, records.length, topThemes, territorialMethodologyNote, priorityGroups);
  const monthlyLearnings = buildMonthlyLearnings(actions, records, topThemes, priorityGroups, qualitativeSignals, pendingReviews, territorialQuality);
  const recommendedReferrals = buildRecommendedReferrals(topThemes, priorityGroups, pendingReviews, territorialQuality, actions);

  return {
    month,
    title: `Relatório mensal interpretativo - ${formatMonthLabel(month)}`,
    executiveSummary,
    totalActions: actions.length,
    totalRecords: records.length,
    operationNeighborhoods,
    respondentNeighborhoods,
    respondentWithoutNeighborhood,
    actionTypeCounts,
    actionTerritoryCounts,
    respondentTerritoryCounts,
    territorialQuality,
    territorialMethodologyNote,
    topThemes,
    sourceTypeCounts,
    occupationCounts,
    priorities,
    priorityGroups,
    unexpectedTopics,
    qualitativeSignals,
    monthlyLearnings,
    recommendedReferrals,
    activeSearchSummary: buildActiveSearchSummary(month, actions, records, operationNeighborhoods, respondentNeighborhoods, respondentWithoutNeighborhood, sourceTypeCounts),
    pedagogicalSummary: buildPedagogicalSummary(month, records, topThemes, priorities, unexpectedTopics),
    actions,
    records,
    pendingReviews
  };
}

export function buildMonthlyReportPlainText(report: MonthlyReportData, mode: MonthlyReportMode = "internal") {
  const visibleLearnings = filterModeItems(report.monthlyLearnings, mode);
  const visibleReferrals = filterModeItems(report.recommendedReferrals, mode);
  return [
    report.title,
    "",
    `Mês de referência: ${formatMonthLabel(report.month)}`,
    `Versão: ${mode === "internal" ? "interna" : "pública"}`,
    `Total de ações: ${report.totalActions}`,
    `Total de escutas: ${report.totalRecords}`,
    `Cobertura territorial: ${report.territorialQuality.coveragePercent}% (${report.territorialQuality.qualityStatus})`,
    "",
    "Leitura executiva",
    report.executiveSummary,
    "",
    "O que escutamos",
    report.pedagogicalSummary,
    "",
    "Temas dominantes",
    formatCountList(report.topThemes),
    "",
    "Prioridades agrupadas",
    formatPriorityGroups(report.priorityGroups),
    "",
    "Sinais qualitativos relevantes",
    formatQualitativeSignals(report.qualitativeSignals),
    "",
    "Territórios da ação x territórios de referência",
    `Ações por território da ação: ${formatCountList(report.actionTerritoryCounts)}`,
    `Escutas por território de referência: ${formatCountList(report.respondentTerritoryCounts)}`,
    report.territorialQuality.qualityStatus === "crítica" ? "Alerta: a cobertura territorial é crítica; evitar conclusões fortes por bairro." : "",
    "",
    "Qualidade territorial e limites da leitura",
    buildMethodologyCardText(report),
    "",
    "O que aprendemos neste mês",
    formatSentenceList(visibleLearnings),
    "",
    "Encaminhamentos recomendados",
    formatSentenceList(visibleReferrals),
    "",
    "Ações realizadas:",
    ...report.actions.map((action) => `- ${formatDate(action.action_date)} | ${action.title} | ${getActionTypeLabel(action.action_type)} | ${action.neighborhoods?.name ?? "Território da ação não informado"}`),
    ...(mode === "internal" ? [
    "",
    "Pendências e próximos passos:",
    ...(report.pendingReviews.length > 0
      ? report.pendingReviews.map((record) => `- ${formatDate(record.date)} | ação em ${record.neighborhoods?.name ?? "Território da ação não informado"} | referência ${record.respondent_neighborhoods?.name ?? "Não informado"} | revisar cadastro antes de publicar.`)
      : ["- Nenhuma pendência de revisão no mês."])
    ] : [])
  ].join("\n");
}

export function buildMonthlyReportMarkdown(report: MonthlyReportData, mode: MonthlyReportMode = "internal") {
  const includeInternal = mode === "internal";
  const visibleLearnings = filterModeItems(report.monthlyLearnings, mode);
  const visibleReferrals = filterModeItems(report.recommendedReferrals, mode);
  return [
    `# ${report.title}`,
    "",
    `**Mês de referência:** ${formatMonthLabel(report.month)}  `,
    `**Versão:** ${includeInternal ? "interna" : "pública"}  `,
    `**Total de ações:** ${report.totalActions}  `,
    `Total de escutas: ${report.totalRecords}  `,
    `**Cobertura territorial:** ${report.territorialQuality.coveragePercent}% (${report.territorialQuality.qualityStatus})`,
    "",
    "## 1. Capa / resumo do mês",
    `Este relatório consolida, de forma interpretativa, as ações e escutas registradas em ${formatMonthLabel(report.month)}. A leitura é agregada, sem transcrição individual nem dado pessoal.`,
    "",
    "## 2. Indicadores principais",
    `- Ações realizadas: ${report.totalActions}`,
    `- Escutas registradas: ${report.totalRecords}`,
    `- Territórios onde houve ação: ${report.operationNeighborhoods.length}`,
    `- Territórios de referência informados: ${report.respondentNeighborhoods.length}`,
    `- Escutas sem território de referência: ${report.respondentWithoutNeighborhood}`,
    "",
    "## 3. Leitura executiva",
    report.executiveSummary,
    "",
    "## 4. O que escutamos",
    report.pedagogicalSummary,
    "",
    "## 5. Temas dominantes",
    formatBulletList(report.topThemes),
    "",
    "## 6. Prioridades agrupadas",
    formatPriorityGroups(report.priorityGroups),
    "",
    "## 7. Sinais qualitativos relevantes",
    formatQualitativeSignals(report.qualitativeSignals),
    "",
    "## 8. Territórios da ação x territórios de referência",
    `- Ações por território da ação: ${formatCountList(report.actionTerritoryCounts)}`,
    `- Escutas por território de referência: ${formatCountList(report.respondentTerritoryCounts)}`,
    report.territorialQuality.qualityStatus === "crítica" ? "- Alerta: cobertura territorial crítica. O relatório não deve produzir conclusão forte por bairro." : "",
    "",
    "## 9. Qualidade territorial e limites da leitura",
    `- Status: ${report.territorialMethodologyNote.status}`,
    `- Cobertura: ${report.territorialQuality.coveragePercent}% (${report.territorialQuality.recordsWithRespondentTerritory}/${report.territorialQuality.totalRecords})`,
    `- Escutas sem território de referência: ${report.territorialQuality.recordsWithoutRespondentTerritory}`,
    `- O que pode ser lido: ${buildWhatCanBeRead(report)}`,
    `- O que exige cautela: ${buildWhatRequiresCaution(report)}`,
    `- Recomendação: ${includeInternal ? report.territorialMethodologyNote.operationalRecommendation : report.territorialMethodologyNote.publicRecommendation}`,
    "",
    "## 10. O que aprendemos neste mês",
    formatSentenceList(visibleLearnings),
    "",
    "## 11. Encaminhamentos recomendados",
    formatSentenceList(visibleReferrals),
    "",
    "## 12. Ações realizadas",
    report.actions.length > 0
      ? report.actions.map((action) => `- ${formatDate(action.action_date)} | ${action.title} | ${getActionTypeLabel(action.action_type)} | ${action.neighborhoods?.name ?? "Território da ação não informado"}`).join("\n")
      : "- Nenhuma ação cadastrada no mês.",
    ...(includeInternal ? [
    "",
    "## 13. Pendências e próximos passos",
    report.pendingReviews.length > 0
      ? report.pendingReviews.map((record) => `- ${formatDate(record.date)} | ação em ${record.neighborhoods?.name ?? "Território da ação não informado"} | referência ${record.respondent_neighborhoods?.name ?? "Não informado"} | revisar cadastro antes de publicação.`).join("\n")
      : "- Nenhuma pendência de revisão no mês.",
    ] : []),
    "",
    "## 14. Anexo técnico",
    includeInternal
      ? [
          "### Tipos de ação",
          formatBulletList(report.actionTypeCounts),
          "",
          "### Ocupação / atividade principal (agregado seguro)",
          formatBulletList(report.occupationCounts),
          "",
          "### Território de referência do entrevistado",
          buildRespondentTerritoryMarkdown(report.records)
        ].join("\n")
      : "Versão pública sem lista individualizada, dado pessoal ou campo técnico interno."
  ].join("\n");
}

export function buildMonthlyReportCsv(report: MonthlyReportData) {
  const headers = [
    "data",
    "territorio_acao_registro",
    "territorio_acao",
    "acao",
    "tipo_acao",
    "origem_escuta",
    "status_revisao",
    "temas",
    "prioridade",
    "inesperado",
    "registro_sanitizado",
    "resumo_equipe",
    "municipio_referencia_entrevistado",
    "bairro_referencia_entrevistado",
    "vinculo_territorio"
    ,"ocupacao_atividade_principal"
    ,"cobertura_territorial_percentual"
    ,"escutas_sem_territorio_referencia"
    ,"status_qualidade_territorial"
  ];

  const rows = report.records.map((record) => [
    record.date,
    record.neighborhoods?.name ?? "",
    record.neighborhoods?.name ?? "",
    record.actions?.title ?? "",
    record.actions?.action_type ? getActionTypeLabel(record.actions.action_type) : "",
    getSourceTypeLabel(record.source_type),
    getReviewStatusLabel(record.review_status),
    record.listening_record_themes.map((item) => item.themes?.name).filter(Boolean).join(" | "),
    record.priority_mentioned ?? "",
    record.unexpected_notes ?? "",
    sanitizeCsv(record.team_summary ?? "Registro sem síntese da equipe"),
    sanitizeCsv(record.team_summary ?? ""),
    record.respondent_city ?? "",
    (record as RecordWithRelations).respondent_neighborhoods?.name ?? "",
    record.respondent_territory_relation ? getRespondentTerritoryRelationLabel(record.respondent_territory_relation) : "",
    record.respondent_occupation ?? "",
    report.territorialQuality.coveragePercent.toString(),
    report.territorialQuality.recordsWithoutRespondentTerritory.toString(),
    report.territorialQuality.qualityStatus
  ]);

  return [headers.join(","), ...rows.map((row) => row.map(escapeCsv).join(","))].join("\n");
}

function buildActiveSearchSummary(
  month: string,
  actions: ActionWithNeighborhood[],
  records: RecordWithRelations[],
  operationNeighborhoods: string[],
  respondentNeighborhoods: string[],
  respondentWithoutNeighborhood: number,
  sourceTypeCounts: Array<{ name: string; count: number }>
) {
  const sourceText = sourceTypeCounts.length > 0 ? formatCountList(sourceTypeCounts.slice(0, 3)) : "sem origem de escuta recorrente identificada";
  const actionText = actions.length > 0 ? formatCountList(countBy(actions, (item) => getActionTypeLabel(item.action_type)).slice(0, 3)) : "sem ações registradas";
  return `Em ${formatMonthLabel(month)}, a busca ativa registrada reuniu ${formatPlural(actions.length, "ação", "ações")} e ${formatPlural(records.length, "escuta", "escutas")}. Na operação territorial, houve ação em ${formatPlural(operationNeighborhoods.length, "território", "territórios")}: ${operationNeighborhoods.join(", ") || "nenhum território da ação informado"}. Na escuta territorial, apareceram ${formatPlural(respondentNeighborhoods.length, "território de referência", "territórios de referência")}: ${respondentNeighborhoods.join(", ") || "nenhum território de referência informado"}. Escutas sem território de referência: ${respondentWithoutNeighborhood}. Os tipos de ação mais presentes foram ${actionText}, enquanto as origens de escuta mais frequentes foram ${sourceText}.`;
}

function buildPedagogicalSummary(
  month: string,
  records: RecordWithRelations[],
  topThemes: Array<{ name: string; count: number }>,
  priorities: Array<{ name: string; count: number }>,
  unexpectedTopics: Array<{ name: string; count: number }>
) {
  const reviewedCount = records.filter((item) => item.review_status === "reviewed").length;
  const recordsWithTeamSummary = records.filter((item) => item.team_summary?.trim()).length;
  const topThemeText = topThemes.length > 0 ? formatCountList(topThemes.slice(0, 3)) : "sem temas recorrentes marcados";
  const priorityText = priorities.length > 0 ? formatCountList(priorities.slice(0, 3)) : "sem prioridade recorrente preenchida";
  const unexpectedText = unexpectedTopics.length > 0 ? formatCountList(unexpectedTopics.slice(0, 3)) : "sem temas inesperados registrados";
  return `Na leitura pedagógica de ${formatMonthLabel(month)}, foram identificadas ${formatPlural(reviewedCount, "escuta revisada", "escutas revisadas")} e ${formatPlural(recordsWithTeamSummary, "registro com síntese da equipe", "registros com síntese da equipe")} preenchida. Os temas mais recorrentes foram ${topThemeText}. Entre as prioridades apontadas, destacam-se ${priorityText}. Nos sinais qualitativos relevantes, apareceram ${unexpectedText}.`;
}

function buildExecutiveSummary(
  totalActions: number,
  totalRecords: number,
  topThemes: Array<{ name: string; count: number }>,
  note: TerritorialQualityMethodologyNote,
  priorityGroups: Array<{ axis: PriorityMacroAxis; count: number; examples: string[] }>
) {
  const themeText = topThemes.length > 0 ? topThemes.slice(0, 5).map((item) => item.name).join(", ") : "sem temas dominantes marcados";
  const mainPriority = priorityGroups[0]?.axis ?? "revisão dos registros e planejamento de nova escuta";
  return `O mês reuniu ${formatPlural(totalActions, "ação", "ações")} e ${formatPlural(totalRecords, "escuta", "escutas")}. Os temas dominantes foram ${themeText}. O principal alerta metodológico é: ${note.shortText} A principal recomendação operacional é priorizar ${mainPriority.toString().toLowerCase()} sem produzir conclusão territorial forte quando a cobertura estiver baixa.`;
}

function buildMonthlyLearnings(
  actions: ActionWithNeighborhood[],
  records: RecordWithRelations[],
  topThemes: Array<{ name: string; count: number }>,
  priorityGroups: Array<{ axis: PriorityMacroAxis; count: number; examples: string[] }>,
  qualitativeSignals: Array<{ type: QualitativeSignalType; count: number; examples: string[] }>,
  pendingReviews: RecordWithRelations[],
  quality: RespondentTerritoryQualityMetrics
) {
  const learnings = [
    topThemes.length > 0
      ? `Os temas dominantes do mês foram ${topThemes.slice(0, 5).map((item) => item.name).join(", ")}.`
      : "Ainda não há temas dominantes marcados para este mês.",
    actions.length > 0
      ? `O formato de ação mais presente foi ${countBy(actions, (item) => getActionTypeLabel(item.action_type))[0]?.name ?? "não identificado"}.`
      : "Não houve ação cadastrada para leitura de formato.",
    quality.qualityStatus === "crítica"
      ? "A qualidade territorial exige cautela: a cobertura está crítica e não sustenta conclusão forte por bairro."
      : `A qualidade territorial está em status ${quality.qualityStatus}, com ${quality.coveragePercent}% de cobertura.`,
    qualitativeSignals.length > 0
      ? `Os sinais qualitativos mais visíveis apareceram em ${qualitativeSignals.slice(0, 3).map((item) => item.type.toLowerCase()).join(", ")}.`
      : "Não houve sinais qualitativos relevantes registrados nos campos abertos.",
    priorityGroups.length > 0
      ? `As prioridades abertas se concentraram em ${priorityGroups.slice(0, 3).map((item) => item.axis.toLowerCase()).join(", ")}.`
      : "As prioridades abertas ainda são insuficientes para agrupamento analítico.",
    pendingReviews.length > 0
      ? `Há ${formatPlural(pendingReviews.length, "pendência de revisão", "pendências de revisão")} antes de uma publicação mais segura.`
      : "Não há pendência de revisão registrada no mês."
  ];

  return learnings;
}

function buildRecommendedReferrals(
  topThemes: Array<{ name: string; count: number }>,
  priorityGroups: Array<{ axis: PriorityMacroAxis; count: number; examples: string[] }>,
  pendingReviews: RecordWithRelations[],
  quality: RespondentTerritoryQualityMetrics,
  actions: ActionWithNeighborhood[]
) {
  const referrals = [
    quality.qualityStatus === "boa"
      ? "Manter a rotina de preenchimento do território de referência nas próximas ações."
      : "Revisar as escutas sem território de referência e orientar a equipe antes da próxima ação.",
    topThemes.length > 0
      ? `Preparar devolutiva sobre ${topThemes[0].name.toLowerCase()}, mantendo linguagem agregada e sem transcrição individual.`
      : "Aguardar novo volume de registros antes de preparar devolutiva temática.",
    priorityGroups.length > 0
      ? `Aprofundar o macroeixo ${priorityGroups[0].axis.toLowerCase()} no planejamento operacional.`
      : "Melhorar o preenchimento das prioridades abertas para permitir leitura por macroeixo.",
    actions.length > 0
      ? "Planejar nova ação considerando o território da ação e a qualidade do território de referência separadamente."
      : "Cadastrar ações do período antes de consolidar nova leitura mensal.",
    pendingReviews.length > 0
      ? "Resolver pendências de revisão antes de compartilhar versão pública."
      : "Registrar decisão de publicação ou arquivamento da versão pública."
  ];

  return referrals;
}

function groupPrioritiesByMacroAxis(items: Array<{ name: string; count: number }>) {
  const groups = new Map<PriorityMacroAxis, { axis: PriorityMacroAxis; count: number; examples: string[] }>();
  for (const item of items) {
    const axis = classifyPriorityAxis(item.name);
    const current = groups.get(axis) ?? { axis, count: 0, examples: [] };
    current.count += item.count;
    if (current.examples.length < 3) current.examples.push(sanitizeOpenTextExample(item.name));
    groups.set(axis, current);
  }
  return Array.from(groups.values()).sort((a, b) => b.count - a.count || a.axis.localeCompare(b.axis, "pt-BR"));
}

function groupQualitativeSignals(items: Array<{ name: string; count: number }>) {
  const groups = new Map<QualitativeSignalType, { type: QualitativeSignalType; count: number; examples: string[] }>();
  for (const item of items) {
    const type = classifyQualitativeSignal(item.name);
    const current = groups.get(type) ?? { type, count: 0, examples: [] };
    current.count += item.count;
    if (current.examples.length < 3) current.examples.push(sanitizeOpenTextExample(item.name));
    groups.set(type, current);
  }
  return Array.from(groups.values()).sort((a, b) => b.count - a.count || a.type.localeCompare(b.type, "pt-BR"));
}

function classifyPriorityAxis(value: string): PriorityMacroAxis {
  const text = normalizeForClassification(value);
  if (/(fiscal|prefeitura|governo|publico|poder|cobranca|multa|orgao)/.test(text)) return "Fiscalização e poder público";
  if (/(lixo|residuo|coleta|limpeza|varricao|entulho|sujeira)/.test(text)) return "Limpeza urbana e coleta";
  if (/(arvore|arborizacao|sombra|calor|verde)/.test(text)) return "Arborização e sombra";
  if (/(saude|respir|doenca|qualidade de vida|mal estar|desconforto)/.test(text)) return "Saúde e qualidade de vida";
  if (/(educacao|conscientizacao|ambiental|campanha|orientacao)/.test(text)) return "Educação ambiental";
  if (/(\bagua\b|\brio\b|corrego|enchente|esgoto|escoria)/.test(text)) return "Água e rio";
  if (/(empresa|csn|industria|siderurg)/.test(text)) return "Empresas e CSN";
  if (/(\bar\b|poluicao|poeira|\bpo\b|fumaca|fuligem|odor)/.test(text)) return "Ar, poluição e pó";
  return "Outros";
}

function classifyQualitativeSignal(value: string): QualitativeSignalType {
  const text = normalizeForClassification(value);
  if (/(saude|respir|tosse|alerg|mal estar|desconforto|ardencia)/.test(text)) return "Saúde e desconforto";
  if (/(\brio\b|escoria|\bagua\b|corrego|enchente|esgoto)/.test(text)) return "Rio e escória";
  if (/(fiscal|prefeitura|governo|publico|cobranca|multa)/.test(text)) return "Fiscalização";
  if (/(poluicao|poeira|\bpo\b|fumaca|fuligem|\bar\b|odor)/.test(text)) return "Percepção sobre poluição";
  if (/(rua|calcada|buraco|iluminacao|infraestrutura|bueiro|transporte)/.test(text)) return "Infraestrutura urbana";
  return "Cuidado coletivo";
}

function filterModeItems(items: string[], mode: MonthlyReportMode) {
  if (mode === "internal") return items;
  return items.filter((item) => !/(pend[eê]ncia|revis[aã]o antes de compartilhar|resolver pend)/i.test(item));
}

function buildMethodologyCardText(report: MonthlyReportData) {
  return [
    `Status: ${report.territorialMethodologyNote.status}.`,
    `Cobertura: ${report.territorialQuality.coveragePercent}%.`,
    `Escutas sem território: ${report.territorialQuality.recordsWithoutRespondentTerritory}.`,
    `O que pode ser lido: ${buildWhatCanBeRead(report)}.`,
    `O que exige cautela: ${buildWhatRequiresCaution(report)}.`,
    `Recomendação: ${report.territorialMethodologyNote.operationalRecommendation}`
  ].join(" ");
}

function buildWhatCanBeRead(report: MonthlyReportData) {
  return report.topThemes.length > 0
    ? "volumes gerais, temas dominantes e padrões agregados do mês"
    : "volumes gerais e situação operacional do mês";
}

function buildWhatRequiresCaution(report: MonthlyReportData) {
  if (report.territorialQuality.qualityStatus === "crítica") return "comparações por bairro e qualquer conclusão territorial forte";
  if (report.territorialQuality.qualityStatus === "atenção") return "rankings por território e generalizações para bairros com poucos registros";
  return "interpretações que confundam território da ação com território de referência";
}

function countThemes(records: RecordWithRelations[]) {
  const map = new Map<string, number>();
  records.forEach((record) => {
    record.listening_record_themes.forEach((item) => {
      if (!item.themes?.name) return;
      map.set(item.themes.name, (map.get(item.themes.name) ?? 0) + 1);
    });
  });
  return Array.from(map.entries()).map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count || a.name.localeCompare(b.name, "pt-BR"));
}

function countTextValues<TItem>(items: TItem[], pickValue: (item: TItem) => string | null) {
  const map = new Map<string, number>();
  items.forEach((item) => {
    pickValue(item)
      ?.split(/[,;\n]+/)
      .map((value) => normalizeTextToken(value))
      .filter(Boolean)
      .forEach((value) => map.set(value, (map.get(value) ?? 0) + 1));
  });
  return Array.from(map.entries()).map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count || a.name.localeCompare(b.name, "pt-BR"));
}

function countBy<TItem>(items: TItem[], getValue: (item: TItem) => string) {
  const map = new Map<string, number>();
  items.forEach((item) => {
    const value = getValue(item);
    if (!value) return;
    map.set(value, (map.get(value) ?? 0) + 1);
  });
  return Array.from(map.entries()).map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count || a.name.localeCompare(b.name, "pt-BR"));
}

function normalizeTextToken(value: string) {
  const normalized = value.trim().replace(/\s+/g, " ");
  if (!normalized) return "";
  return normalized.charAt(0).toUpperCase() + normalized.slice(1);
}

function formatCountList(items: Array<{ name: string; count: number }>) {
  return items.length > 0 ? items.map((item) => `${item.name} (${item.count})`).join(", ") : "Nenhum registro";
}

function formatBulletList(items: Array<{ name: string; count: number }>) {
  return items.length > 0 ? items.map((item) => `- ${item.name} (${item.count})`).join("\n") : "- Nenhum registro";
}

function formatPriorityGroups(items: Array<{ axis: PriorityMacroAxis; count: number; examples: string[] }>) {
  return items.length > 0
    ? items.map((item) => `- ${item.axis}: ${formatPlural(item.count, "citação", "citações")}${item.examples.length > 0 ? `; exemplos sanitizados: ${item.examples.join("; ")}` : ""}`).join("\n")
    : "- Nenhum agrupamento de prioridade identificado.";
}

function formatQualitativeSignals(items: Array<{ type: QualitativeSignalType; count: number; examples: string[] }>) {
  return items.length > 0
    ? items.map((item) => `- ${item.type}: ${formatPlural(item.count, "ocorrência", "ocorrências")}${item.examples.length > 0 ? `; exemplos sanitizados: ${item.examples.join("; ")}` : ""}`).join("\n")
    : "- Nenhum sinal qualitativo relevante registrado.";
}

function formatSentenceList(items: string[]) {
  return items.length > 0 ? items.map((item) => `- ${item}`).join("\n") : "- Nenhum item registrado.";
}

function formatPlural(count: number, singular: string, plural: string) {
  return `${count} ${count === 1 ? singular : plural}`;
}

function normalizeForClassification(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
}

function sanitizeOpenTextExample(value: string) {
  return normalizeTextToken(value)
    .replace(/\b\d{2,}\b/g, "[número removido]")
    .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, "[e-mail removido]")
    .replace(/\b(?:\+?55\s?)?(?:\(?\d{2}\)?\s?)?\d{4,5}[-\s]?\d{4}\b/g, "[telefone removido]")
    .slice(0, 90);
}

function sanitizeCsv(value: string) {
  return value.replace(/\r?\n+/g, " ").trim();
}

function escapeCsv(value: string) {
  return `"${value.replace(/"/g, '""')}"`;
}

function truncate(value: string, maxLength: number) {
  return value.length > maxLength ? `${value.slice(0, maxLength - 1)}...` : value;
}

function formatDate(value: string) {
  return new Date(`${value}T00:00:00`).toLocaleDateString("pt-BR");
}

function buildRespondentTerritoryMarkdown(records: RecordWithRelations[]): string {
  const groups = new Map<string, { name: string; count: number; relations: Set<string> }>();
  for (const r of records) {
    if (!r.respondent_neighborhood_id) continue;
    const name = r.respondent_neighborhoods?.name ?? r.respondent_neighborhood_id;
    const existing = groups.get(r.respondent_neighborhood_id);
    if (existing) {
      existing.count += 1;
      if (r.respondent_territory_relation) existing.relations.add(getRespondentTerritoryRelationLabel(r.respondent_territory_relation));
    } else {
      groups.set(r.respondent_neighborhood_id, {
        name,
        count: 1,
        relations: r.respondent_territory_relation ? new Set([getRespondentTerritoryRelationLabel(r.respondent_territory_relation)]) : new Set()
      });
    }
  }
  if (groups.size === 0) return "- Nenhum territorio de referencia registrado neste mes.";
  const lines: string[] = [];
  for (const group of Array.from(groups.values()).sort((a, b) => b.count - a.count)) {
    const relationText = group.relations.size > 0 ? ` (${Array.from(group.relations).join(", ")})` : "";
    lines.push(`- ${group.name}: ${group.count} escuta${group.count !== 1 ? "s" : ""}${relationText}`);
  }
  const withoutRef = records.filter((r) => !r.respondent_neighborhood_id).length;
  if (withoutRef > 0) lines.push(`- Sem territorio de referencia: ${withoutRef} escuta${withoutRef !== 1 ? "s" : ""}`);
  return lines.join("\n");
}
