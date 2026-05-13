import type { Action, ActionClosure, ActionDebrief, ListeningRecord, Neighborhood, PublicTransparencySnapshot, Theme } from "@/lib/database.types";
import { getActionStatusLabel, getActionTypeLabel } from "@/lib/actions";
import { createEmptyTransparencyChecklist, normalizeTransparencyChecklist } from "@/lib/transparency-privacy";
import { buildTerritorialQualityMethodologyNote, calculateRespondentTerritoryQuality } from "@/lib/territorial-quality";

export const MIN_PUBLIC_TERRITORY_SAMPLE = 5;
export const MIN_PUBLIC_OCCUPATION_SAMPLE = 3;

const sensitiveWords = new Set([
  "cpf", "telefone", "celular", "whatsapp", "endereco", "endereço", "rua", "numero", "número", "cep",
  "casa", "apartamento", "doenca", "doença", "diagnostico", "diagnóstico", "remedio", "remédio", "hospital"
]);

const stopWords = new Set([
  "para", "com", "uma", "umas", "uns", "dos", "das", "que", "por", "mais", "menos", "muito", "muita",
  "como", "sobre", "essa", "esse", "isso", "aqui", "ali", "tambem", "também", "nao", "não", "sim"
]);

export type SnapshotRecord = ListeningRecord & {
  neighborhoods?: Pick<Neighborhood, "id" | "name"> | null;
  respondent_neighborhood?: Pick<Neighborhood, "id" | "name"> | null;
  listening_record_themes?: Array<{ themes: Pick<Theme, "id" | "name"> | null }>;
};

export type SnapshotAction = Action & {
  neighborhoods?: Pick<Neighborhood, "id" | "name"> | null;
};

export type TransparencyDraftInput = {
  title?: string;
  actions: SnapshotAction[];
  records: SnapshotRecord[];
  debriefs: ActionDebrief[];
  closures: ActionClosure[];
  approvedPublicQuotesByAction?: Record<string, number>;
};

export function buildTransparencySnapshotDraft(input: TransparencyDraftInput) {
  const reviewedRecords = input.records.filter((record) => record.review_status === "reviewed");
  const periodDates = [
    ...input.actions.map((action) => action.action_date),
    ...input.records.map((record) => record.date)
  ].filter(Boolean).sort();
  const periodStart = periodDates[0] ?? null;
  const periodEnd = periodDates[periodDates.length - 1] ?? null;
  const actionTerritories = new Set(input.actions.map((action) => action.neighborhood_id).filter(Boolean));
  const respondentTerritories = new Set(reviewedRecords.map((record) => record.respondent_neighborhood_id).filter(Boolean));
  const respondentWithoutTerritory = reviewedRecords.filter((record) => !record.respondent_neighborhood_id).length;
  const territorialQuality = calculateRespondentTerritoryQuality(
    reviewedRecords.length,
    reviewedRecords.filter((record) => Boolean(record.respondent_neighborhood_id)).length
  );
  const territorialMethodology = buildTerritorialQualityMethodologyNote(territorialQuality);
  const approvedDebriefs = input.debriefs.filter((debrief) => debrief.status === "approved");
  const closedDossiers = input.closures.filter((closure) => closure.status === "closed");

  const totals = {
    actions_realized: input.actions.filter((action) => action.status === "realizada").length,
    listening_records: input.records.length,
    listening_records_reviewed: reviewedRecords.length,
    territories_reached: new Set([...Array.from(actionTerritories), ...Array.from(respondentTerritories)]).size,
    approved_debriefs: approvedDebriefs.length,
    closed_dossiers: closedDossiers.length
  };

  const themeSummary = rankThemes(reviewedRecords);
  const wordSummary = rankWords(reviewedRecords);
  const territorySummary = {
    action_territory_summary: summarizeActionTerritories(input.actions, reviewedRecords, approvedDebriefs),
    respondent_territory_summary: summarizeRespondentTerritories(reviewedRecords),
    respondent_without_territory: respondentWithoutTerritory,
    territorial_quality_summary: {
      status: territorialMethodology.status,
      coverage_percent: territorialQuality.coveragePercent,
      records_with_territory: territorialQuality.recordsWithRespondentTerritory,
      records_without_territory: territorialQuality.recordsWithoutRespondentTerritory,
      methodology_note: territorialMethodology.fullText,
      operational_recommendation: territorialMethodology.operationalRecommendation
    }
  };
  const actionTimeline = input.actions
    .filter((action) => action.status === "realizada")
    .sort((a, b) => a.action_date.localeCompare(b.action_date))
    .map((action) => {
      const debrief = approvedDebriefs.find((item) => item.action_id === action.id);
      return {
        date: action.action_date,
        title: action.title,
        territory: action.neighborhoods?.name ?? "Território não informado",
        action_type: getActionTypeLabel(action.action_type),
        action_status: getActionStatusLabel(action.status),
        debrief_status: debrief ? "devolutiva aprovada" : "devolutiva não publicada"
      };
    });

  const debriefLinks = approvedDebriefs.map((debrief) => ({
    id: debrief.id,
    action_id: debrief.action_id,
    title: debrief.title,
    status: debrief.status,
    approved_at: debrief.approved_at
  }));

  const summary = buildPublicSummary(totals);

  return {
    title: input.title ?? buildDefaultTitle(periodStart, periodEnd),
    period_start: periodStart,
    period_end: periodEnd,
    public_summary: summary,
    generated_summary: summary,
    edited_summary: summary,
    current_risk_report: {},
    totals,
    territory_summary: territorySummary,
    theme_summary: themeSummary,
    word_summary: wordSummary,
    action_timeline: actionTimeline,
    debrief_links: debriefLinks,
    methodology_notes: `Síntese pública produzida a partir de dados revisados, agregados e sanitizados pela equipe SEMEAR. ${territorialMethodology.fullText} Cobertura territorial: ${territorialQuality.coveragePercent}% (${territorialQuality.recordsWithRespondentTerritory}/${territorialQuality.totalRecords}).`,
    opening_text: "Esta leitura pública apresenta apenas recortes agregados e aprovados pela coordenação.",
    listening_text: "O que estamos ouvindo aparece aqui em linguagem pública, sem fala original e sem identificar pessoas.",
    limits_text: territorialMethodology.status === "boa"
      ? `Territórios com menos de ${MIN_PUBLIC_TERRITORY_SAMPLE} escutas revisadas aparecem como dados insuficientes para síntese pública.`
      : `Territórios com menos de ${MIN_PUBLIC_TERRITORY_SAMPLE} escutas revisadas aparecem como dados insuficientes para síntese pública. Além disso, a cobertura de território de referência está em nível ${territorialMethodology.status}, exigindo cautela na leitura territorial.`,
    next_steps_text: "A publicação pública depende de revisão editorial, checklist de privacidade e aprovação institucional.",
    review_checklist: createEmptyTransparencyChecklist(),
    privacy_notes: [
      "Snapshot gerado de forma determinística a partir de dados revisados e agregados.",
      "Falas originais, entrevistadores, e-mails, dados pessoais, endereços e dados de saúde individuais não entram no snapshot.",
      `Territórios com menos de ${MIN_PUBLIC_TERRITORY_SAMPLE} escutas revisadas são marcados como dados insuficientes para síntese pública.`,
      `Ocupações com contagem menor que ${MIN_PUBLIC_OCCUPATION_SAMPLE} devem ser agrupadas como outras ocupações quando usadas em análises futuras.`
    ].join("\n")
  };
}

export function countApprovedPublicQuotesByAction(quotes: Array<{ action_id: string; status: string }>) {
  return quotes.reduce<Record<string, number>>((acc, quote) => {
    if (quote.status !== "approved_public") return acc;
    acc[quote.action_id] = (acc[quote.action_id] ?? 0) + 1;
    return acc;
  }, {});
}

export function getLatestPreviewSnapshot(snapshots: PublicTransparencySnapshot[]) {
  return snapshots
    .filter((snapshot) => snapshot.status === "published" || snapshot.status === "approved" || snapshot.status === "reviewed")
    .sort((a, b) => (b.published_at ?? b.approved_at ?? b.updated_at).localeCompare(a.published_at ?? a.approved_at ?? a.updated_at))[0] ?? null;
}

export function mergeTransparencyDraftIntoSnapshot(snapshot: PublicTransparencySnapshot, draft: ReturnType<typeof buildTransparencySnapshotDraft>) {
  const keepEditedSummary = snapshot.public_summary && snapshot.public_summary !== snapshot.generated_summary;

  return {
    ...snapshot,
    title: snapshot.title || draft.title,
    period_start: draft.period_start,
    period_end: draft.period_end,
    generated_summary: draft.generated_summary,
    public_summary: keepEditedSummary ? snapshot.public_summary : draft.public_summary,
    edited_summary: keepEditedSummary ? snapshot.public_summary : draft.public_summary,
    totals: draft.totals,
    territory_summary: draft.territory_summary,
    theme_summary: draft.theme_summary,
    word_summary: draft.word_summary,
    action_timeline: draft.action_timeline,
    debrief_links: draft.debrief_links,
    privacy_notes: snapshot.privacy_notes || draft.privacy_notes,
    methodology_notes: snapshot.methodology_notes || draft.methodology_notes,
    opening_text: snapshot.opening_text || draft.opening_text,
    listening_text: snapshot.listening_text || draft.listening_text,
    limits_text: snapshot.limits_text || draft.limits_text,
    next_steps_text: snapshot.next_steps_text || draft.next_steps_text,
    current_risk_report: snapshot.current_risk_report ?? {},
    review_checklist: normalizeTransparencyChecklist(snapshot.review_checklist)
  };
}

export function getSnapshotStatusLabel(status: PublicTransparencySnapshot["status"]) {
  return {
    draft: "rascunho",
    reviewed: "revisado",
    approved: "aprovado",
    published: "publicado",
    archived: "arquivado"
  }[status];
}

function buildDefaultTitle(periodStart: string | null, periodEnd: string | null) {
  if (!periodStart || !periodEnd) return "Transparência Viva SEMEAR";
  return `Transparência Viva SEMEAR - ${formatDate(periodStart)} a ${formatDate(periodEnd)}`;
}

function buildPublicSummary(totals: Record<string, number>) {
  return `Síntese pública agregada com ${totals.actions_realized} ação(ões) realizada(s), ${totals.listening_records_reviewed} escuta(s) revisada(s), ${totals.territories_reached} território(s) de referência alcançado(s), ${totals.approved_debriefs} devolutiva(s) aprovada(s) e ${totals.closed_dossiers} dossiê(s) fechado(s).`;
}

function rankThemes(records: SnapshotRecord[]) {
  const counts = new Map<string, { count: number; territories: Map<string, number> }>();
  for (const record of records) {
    const territory = record.respondent_neighborhood?.name ?? record.neighborhoods?.name ?? "Território não informado";
    for (const item of record.listening_record_themes ?? []) {
      const name = item.themes?.name?.trim();
      if (!name) continue;
      const current = counts.get(name) ?? { count: 0, territories: new Map<string, number>() };
      current.count += 1;
      current.territories.set(territory, (current.territories.get(territory) ?? 0) + 1);
      counts.set(name, current);
    }
  }
  return Array.from(counts.entries())
    .map(([theme, data]) => ({
      theme,
      count: data.count,
      territories: Array.from(data.territories.entries())
        .filter(([, count]) => count >= MIN_PUBLIC_TERRITORY_SAMPLE)
        .map(([territory, count]) => ({ territory, count }))
    }))
    .sort((a, b) => b.count - a.count || a.theme.localeCompare(b.theme, "pt-BR"));
}

function rankWords(records: SnapshotRecord[]) {
  const counts = new Map<string, number>();
  for (const record of records) {
    for (const word of tokenizeWords(record.words_used ?? "")) {
      counts.set(word, (counts.get(word) ?? 0) + 1);
    }
  }
  return Array.from(counts.entries())
    .map(([word, count]) => ({ word, count }))
    .sort((a, b) => b.count - a.count || a.word.localeCompare(b.word, "pt-BR"))
    .slice(0, 30);
}

function summarizeActionTerritories(actions: SnapshotAction[], reviewedRecords: SnapshotRecord[], approvedDebriefs: ActionDebrief[]) {
  const groups = new Map<string, { territory: string; action_records: number; respondent_records: number; reviewed_records: number; action_count: number; approved_debriefs: number }>();
  const ensure = (id: string, territory: string) => {
    const existing = groups.get(id);
    if (existing) return existing;
    const created = { territory, action_records: 0, respondent_records: 0, reviewed_records: 0, action_count: 0, approved_debriefs: 0 };
    groups.set(id, created);
    return created;
  };

  for (const action of actions) {
    if (!action.neighborhood_id) continue;
    const group = ensure(action.neighborhood_id, action.neighborhoods?.name ?? "Território não informado");
    group.action_count += 1;
    if (approvedDebriefs.some((debrief) => debrief.action_id === action.id)) group.approved_debriefs += 1;
  }
  for (const record of reviewedRecords) {
    if (record.neighborhood_id) {
      const group = ensure(record.neighborhood_id, record.neighborhoods?.name ?? "Território não informado");
      group.action_records += 1;
      group.reviewed_records += 1;
    }
  }

  return Array.from(groups.values())
    .map((group) => ({
      ...group,
      public_status: group.reviewed_records < MIN_PUBLIC_TERRITORY_SAMPLE
        ? "dados insuficientes para síntese pública"
        : group.approved_debriefs > 0
          ? "devolutiva publicada"
          : "em revisão"
    }))
    .sort((a, b) => b.reviewed_records - a.reviewed_records || a.territory.localeCompare(b.territory, "pt-BR"));
}

function summarizeRespondentTerritories(reviewedRecords: SnapshotRecord[]) {
  const groups = new Map<string, { territory: string; respondent_records: number; reviewed_records: number }>();
  const ensure = (id: string, territory: string) => {
    const existing = groups.get(id);
    if (existing) return existing;
    const created = { territory, respondent_records: 0, reviewed_records: 0 };
    groups.set(id, created);
    return created;
  };

  for (const record of reviewedRecords) {
    if (!record.respondent_neighborhood_id) continue;
    const group = ensure(record.respondent_neighborhood_id, record.respondent_neighborhood?.name ?? "Território não informado");
    group.respondent_records += 1;
    group.reviewed_records += 1;
  }

  return Array.from(groups.values())
    .map((group) => ({
      ...group,
      public_status: group.reviewed_records < MIN_PUBLIC_TERRITORY_SAMPLE
        ? "dados insuficientes para síntese pública"
        : "apto para síntese pública"
    }))
    .sort((a, b) => b.reviewed_records - a.reviewed_records || a.territory.localeCompare(b.territory, "pt-BR"));
}

function tokenizeWords(text: string) {
  return text
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .map((word) => word.trim())
    .filter((word) => word.length >= 4)
    .filter((word) => !stopWords.has(word))
    .filter((word) => !sensitiveWords.has(word))
    .filter((word) => !/\d/.test(word))
    .filter((word) => word === word.toLowerCase());
}

function formatDate(value: string) {
  return new Date(`${value}T00:00:00`).toLocaleDateString("pt-BR");
}
