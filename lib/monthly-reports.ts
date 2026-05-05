import { getActionTypeLabel } from "@/lib/actions";
import type { Action, ListeningRecord, Neighborhood, Theme } from "@/lib/database.types";
import { getRespondentTerritoryRelationLabel, getReviewStatusLabel, getSourceTypeLabel } from "@/lib/listening-records";

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
  totalActions: number;
  totalRecords: number;
  involvedNeighborhoods: string[];
  actionTypeCounts: Array<{ name: string; count: number }>;
  topThemes: Array<{ name: string; count: number }>;
  sourceTypeCounts: Array<{ name: string; count: number }>;
  priorities: Array<{ name: string; count: number }>;
  unexpectedTopics: Array<{ name: string; count: number }>;
  activeSearchSummary: string;
  pedagogicalSummary: string;
  actions: ActionWithNeighborhood[];
  records: RecordWithRelations[];
  pendingReviews: RecordWithRelations[];
};

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
  const involvedNeighborhoods = Array.from(new Set([
    ...actions.map((item) => item.neighborhoods?.name).filter(Boolean),
    ...records.map((item) => item.neighborhoods?.name).filter(Boolean)
  ] as string[])).sort((a, b) => a.localeCompare(b, "pt-BR"));

  const actionTypeCounts = countBy(actions, (item) => getActionTypeLabel(item.action_type));
  const topThemes = countThemes(records).slice(0, 8);
  const sourceTypeCounts = countBy(records, (item) => getSourceTypeLabel(item.source_type));
  const priorities = countTextValues(records, (item) => item.priority_mentioned).slice(0, 8);
  const unexpectedTopics = countTextValues(records, (item) => item.unexpected_notes).slice(0, 8);
  const pendingReviews = records.filter((item) => item.review_status === "draft");

  return {
    month,
    title: `Relatório mensal - ${formatMonthLabel(month)}`,
    totalActions: actions.length,
    totalRecords: records.length,
    involvedNeighborhoods,
    actionTypeCounts,
    topThemes,
    sourceTypeCounts,
    priorities,
    unexpectedTopics,
    activeSearchSummary: buildActiveSearchSummary(month, actions, records, involvedNeighborhoods, sourceTypeCounts),
    pedagogicalSummary: buildPedagogicalSummary(month, records, topThemes, priorities, unexpectedTopics),
    actions,
    records,
    pendingReviews
  };
}

export function buildMonthlyReportPlainText(report: MonthlyReportData) {
  return [
    report.title,
    "",
    `Mes de referencia: ${formatMonthLabel(report.month)}`,
    `Total de acoes: ${report.totalActions}`,
    `Total de escutas: ${report.totalRecords}`,
    `Bairros envolvidos: ${report.involvedNeighborhoods.join(", ") || "Nenhum bairro informado"}`,
    `Tipos de acao: ${formatCountList(report.actionTypeCounts)}`,
    `Temas mais recorrentes: ${formatCountList(report.topThemes)}`,
    `Sintese de busca ativa: ${report.activeSearchSummary}`,
    `Sintese pedagogica: ${report.pedagogicalSummary}`,
    `Temas inesperados: ${formatCountList(report.unexpectedTopics)}`,
    `Prioridades apontadas: ${formatCountList(report.priorities)}`,
    "",
    "Lista de acoes do mes:",
    ...report.actions.map((action) => `- ${formatDate(action.action_date)} | ${action.title} | ${getActionTypeLabel(action.action_type)} | ${action.neighborhoods?.name ?? "Sem bairro"}`),
    "",
    "Pendencias de revisao:",
    ...(report.pendingReviews.length > 0
      ? report.pendingReviews.map((record) => `- ${formatDate(record.date)} | ${record.neighborhoods?.name ?? "Sem bairro"} | ${truncate(record.free_speech_text, 110)}`)
      : ["- Nenhuma pendencia de revisao no mes."])
  ].join("\n");
}

export function buildMonthlyReportMarkdown(report: MonthlyReportData) {
  return [
    `# ${report.title}`,
    "",
    `Mes de referencia: ${formatMonthLabel(report.month)}  `,
    `Total de acoes: ${report.totalActions}  `,
    `Total de escutas: ${report.totalRecords}  `,
    `Bairros envolvidos: ${report.involvedNeighborhoods.join(", ") || "Nenhum bairro informado"}`,
    "",
    "## Tipos de acao",
    formatBulletList(report.actionTypeCounts),
    "",
    "## Temas mais recorrentes",
    formatBulletList(report.topThemes),
    "",
    "## Sintese de busca ativa",
    report.activeSearchSummary,
    "",
    "## Sintese pedagogica",
    report.pedagogicalSummary,
    "",
    "## Temas inesperados",
    formatBulletList(report.unexpectedTopics),
    "",
    "## Prioridades apontadas",
    formatBulletList(report.priorities),
    "",
    "## Lista de acoes do mes",
    report.actions.length > 0
      ? report.actions.map((action) => `- ${formatDate(action.action_date)} | ${action.title} | ${getActionTypeLabel(action.action_type)} | ${action.neighborhoods?.name ?? "Sem bairro"}`).join("\n")
      : "- Nenhuma acao cadastrada no mes.",
    "",
    "## Pendencias de revisao",
    report.pendingReviews.length > 0
      ? report.pendingReviews.map((record) => `- ${formatDate(record.date)} | ${record.neighborhoods?.name ?? "Sem bairro"} | ${truncate(record.free_speech_text, 110)}`).join("\n")
      : "- Nenhuma pendencia de revisao no mes.",
    "",
    "## Territorio de referencia do entrevistado",
    buildRespondentTerritoryMarkdown(report.records)
  ].join("\n");
}

export function buildMonthlyReportCsv(report: MonthlyReportData) {
  const headers = [
    "data",
    "bairro",
    "acao",
    "tipo_acao",
    "origem_escuta",
    "status_revisao",
    "temas",
    "prioridade",
    "inesperado",
    "fala_original",
    "resumo_equipe",
    "municipio_referencia_entrevistado",
    "bairro_referencia_entrevistado",
    "vinculo_territorio"
  ];

  const rows = report.records.map((record) => [
    record.date,
    record.neighborhoods?.name ?? "",
    record.actions?.title ?? "",
    record.actions?.action_type ? getActionTypeLabel(record.actions.action_type) : "",
    getSourceTypeLabel(record.source_type),
    getReviewStatusLabel(record.review_status),
    record.listening_record_themes.map((item) => item.themes?.name).filter(Boolean).join(" | "),
    record.priority_mentioned ?? "",
    record.unexpected_notes ?? "",
    sanitizeCsv(record.free_speech_text),
    sanitizeCsv(record.team_summary ?? ""),
    record.respondent_city ?? "",
    (record as RecordWithRelations).respondent_neighborhoods?.name ?? "",
    record.respondent_territory_relation ? getRespondentTerritoryRelationLabel(record.respondent_territory_relation) : ""
  ]);

  return [headers.join(","), ...rows.map((row) => row.map(escapeCsv).join(","))].join("\n");
}

function buildActiveSearchSummary(
  month: string,
  actions: ActionWithNeighborhood[],
  records: RecordWithRelations[],
  neighborhoods: string[],
  sourceTypeCounts: Array<{ name: string; count: number }>
) {
  const sourceText = sourceTypeCounts.length > 0 ? formatCountList(sourceTypeCounts.slice(0, 3)) : "sem origem de escuta recorrente identificada";
  const actionText = actions.length > 0 ? formatCountList(countBy(actions, (item) => getActionTypeLabel(item.action_type)).slice(0, 3)) : "sem acoes registradas";
  return `Em ${formatMonthLabel(month)}, a busca ativa registrada pelo sistema reuniu ${actions.length} acao(oes) e ${records.length} escuta(s), envolvendo ${neighborhoods.length} bairro(s): ${neighborhoods.join(", ") || "nenhum bairro informado"}. Os tipos de acao mais presentes foram ${actionText}, enquanto as origens de escuta mais frequentes foram ${sourceText}.`;
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
  return `Na leitura pedagogica de ${formatMonthLabel(month)}, o sistema identificou ${reviewedCount} escuta(s) revisada(s) e ${recordsWithTeamSummary} registro(s) com sintese da equipe preenchida. Os temas mais recorrentes foram ${topThemeText}. Entre as prioridades apontadas, destacam-se ${priorityText}. No campo de observacoes inesperadas, apareceram ${unexpectedText}.`;
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