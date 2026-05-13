import { MIN_PUBLIC_OCCUPATION_SAMPLE, MIN_PUBLIC_TERRITORY_SAMPLE } from "@/lib/transparency-snapshots";

export type CollectiveReadingSnapshotFilters = {
  period_start?: string | null;
  period_end?: string | null;
  action_ids?: string[];
  include_places?: boolean;
  include_occupations?: boolean;
};

export type CollectiveReadingInputData = {
  overview: {
    total_records: number;
    reviewed_records: number;
    territories_reached: number;
    records_without_review: number;
  };
  territoryDistribution: Array<{ id: string; name: string; count: number }>;
  territoryGaps: Array<{ id: string; name: string; total: number; reviewed: number; status: string }>;
  themeSummary: Array<{ theme: string; count: number }>;
  wordSummary: Array<{ word: string; count: number }>;
  occupationSummary: Array<{ name: string; count: number }>;
  actionTimeline: Array<{ date: string; title: string; territory: string; action_type?: string; action_status?: string }>;
  places: Array<{ name: string; territory: string; count: number; visibility: string }>;
};

export type CollectiveReadingSnapshotDraft = {
  title: string;
  period_start: string | null;
  period_end: string | null;
  public_summary: string;
  totals: Record<string, number>;
  territory_summary: {
    reached: number;
    respondent_distribution: Array<{ territory: string; count: number; public_status: string }>;
    silences_and_gaps: Array<{ territory: string; reviewed: number; public_status: string }>;
    occupation_summary: Array<{ name: string; count: number }>;
    safe_places_summary: Array<{ name: string; territory: string; count: number }>;
  };
  theme_summary: Array<{ theme: string; count: number }>;
  word_summary: Array<{ word: string; count: number }>;
  action_timeline: Array<{ date: string; title: string; territory: string; action_type?: string; action_status?: string }>;
  privacy_notes: string;
  methodology_notes: string;
  limits_text: string;
  source_type: "collective_reading";
  source_filters: CollectiveReadingSnapshotFilters;
  source_generated_at: string;
  checklist_defaults: {
    data_from_aggregates: boolean;
    no_raw_quote: boolean;
    no_interviewer_name: boolean;
    no_team_email: boolean;
    no_cpf: boolean;
    no_phone: boolean;
    no_address: boolean;
    no_health_data: boolean;
    rare_occupations_grouped: boolean;
    minimum_sample_respected: boolean;
    words_sanitized: boolean;
    sensitive_places_hidden: boolean;
    no_census_claim: boolean;
    reviewed_by_coordination: boolean;
  };
};

const stopwords = new Set([
  "para", "com", "uma", "umas", "uns", "dos", "das", "que", "por", "mais", "menos", "muito", "muita",
  "como", "sobre", "essa", "esse", "isso", "aqui", "ali", "tambem", "também", "nao", "não", "sim"
]);

const sensitiveWordHints = new Set([
  "cpf", "telefone", "celular", "whatsapp", "email", "e-mail", "endereco", "endereço", "rua", "numero", "número", "cep"
]);

function sanitizeToken(raw: string) {
  return raw
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function isLikelyProperName(raw: string) {
  return /^[A-ZÁÀÂÃÉÊÍÓÔÕÚÇ][a-záàâãéêíóôõúç]{2,}$/.test(raw);
}

function isSensitiveToken(token: string) {
  if (!token) return true;
  if (token.length < 4) return true;
  if (stopwords.has(token)) return true;
  if (sensitiveWordHints.has(token)) return true;
  if (/\d/.test(token)) return true;
  if (/\b\d{3}\.?\d{3}\.?\d{3}-?\d{2}\b/.test(token)) return true;
  if (/(?:\+?55\s?)?(?:\(?\d{2}\)?\s?)?(?:9?\d{4}-?\d{4})/.test(token)) return true;
  if (/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i.test(token)) return true;
  return false;
}

export function sanitizeCollectiveReadingForPublicSnapshot(data: CollectiveReadingInputData) {
  const safeWordsMap = new Map<string, number>();
  for (const item of data.wordSummary ?? []) {
    const rawWord = item.word?.trim() ?? "";
    const token = sanitizeToken(rawWord);
    if (!token) continue;
    if (isLikelyProperName(rawWord)) continue;
    if (isSensitiveToken(token)) continue;
    safeWordsMap.set(token, (safeWordsMap.get(token) ?? 0) + (item.count ?? 0));
  }

  const safeWords = Array.from(safeWordsMap.entries())
    .map(([word, count]) => ({ word, count }))
    .sort((a, b) => b.count - a.count || a.word.localeCompare(b.word, "pt-BR"))
    .slice(0, 30);

  const safeOccupations = (data.occupationSummary ?? [])
    .reduce<Array<{ name: string; count: number }>>((acc, item) => {
      const count = item.count ?? 0;
      if (count < MIN_PUBLIC_OCCUPATION_SAMPLE && item.name !== "Não informada") {
        const existing = acc.find((entry) => entry.name === "Outras ocupações");
        if (existing) existing.count += count;
        else acc.push({ name: "Outras ocupações", count });
        return acc;
      }
      acc.push({ name: item.name, count });
      return acc;
    }, [])
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name, "pt-BR"));

  const safePlaces = (data.places ?? [])
    .filter((place) => place.visibility === "public_safe")
    .map((place) => ({ name: place.name, territory: place.territory, count: place.count }));

  const territoryDistribution = (data.territoryDistribution ?? []).map((item) => ({
    territory: item.name,
    count: item.count,
    public_status: item.count < MIN_PUBLIC_TERRITORY_SAMPLE ? "dados insuficientes para síntese pública" : "apto para síntese pública"
  }));

  const silences = (data.territoryGaps ?? []).map((item) => ({
    territory: item.name,
    reviewed: item.reviewed,
    public_status: item.reviewed < MIN_PUBLIC_TERRITORY_SAMPLE ? "dados insuficientes para síntese pública" : "apto para síntese pública"
  }));

  return {
    safeWords,
    safeOccupations,
    safePlaces,
    territoryDistribution,
    silences,
    sanitizedWordCount: safeWords.length
  };
}

export function buildPublicReadingSummary(data: CollectiveReadingInputData) {
  return `Leitura coletiva agregada com ${data.overview.reviewed_records} escutas revisadas, ${data.overview.territories_reached} territórios alcançados e ${data.overview.total_records} escutas registradas no período analisado.`;
}

export function buildReadingMethodologyNote(data: CollectiveReadingInputData) {
  return `Síntese pública derivada de agregados internos de Leituras Coletivas. Territórios com menos de ${MIN_PUBLIC_TERRITORY_SAMPLE} escutas revisadas são marcados como dados insuficientes para síntese pública. Ocupações com frequência menor que ${MIN_PUBLIC_OCCUPATION_SAMPLE} são agrupadas.`;
}

export function buildReadingLimitationsNote(data: CollectiveReadingInputData) {
  return `Esta leitura não é pesquisa estatística censitária. O painel representa escutas revisadas no período operacional e pode ter cobertura desigual entre territórios (sem revisão: ${data.overview.records_without_review}).`;
}

export function buildTransparencySnapshotFromCollectiveReading(filters: {
  filters: CollectiveReadingSnapshotFilters;
  data: CollectiveReadingInputData;
}) : CollectiveReadingSnapshotDraft {
  const sanitized = sanitizeCollectiveReadingForPublicSnapshot(filters.data);

  const title = filters.filters.period_start && filters.filters.period_end
    ? `Transparência Viva - Leituras Coletivas (${filters.filters.period_start} a ${filters.filters.period_end})`
    : "Transparência Viva - Leituras Coletivas";

  const totals = {
    listening_records_total: filters.data.overview.total_records,
    listening_records_reviewed: filters.data.overview.reviewed_records,
    territories_reached: filters.data.overview.territories_reached
  };

  const privacyNotes = [
    "Origem: agregados de Leituras Coletivas internas.",
    "Falas originais, escutas brutas, entrevistadores e dados pessoais não entram no snapshot.",
    `Palavras recorrentes foram sanitizadas (${sanitized.sanitizedWordCount} termos públicos mantidos).`,
    `Lugares sensíveis e internos foram excluídos; apenas visibility=public_safe entra no snapshot.`,
    `Territórios com menos de ${MIN_PUBLIC_TERRITORY_SAMPLE} escutas revisadas ficam marcados como dados insuficientes para síntese pública.`,
    `Ocupações com contagem menor que ${MIN_PUBLIC_OCCUPATION_SAMPLE} são agrupadas em Outras ocupações.`
  ].join("\n");

  return {
    title,
    period_start: filters.filters.period_start ?? null,
    period_end: filters.filters.period_end ?? null,
    public_summary: buildPublicReadingSummary(filters.data),
    totals,
    territory_summary: {
      reached: filters.data.overview.territories_reached,
      respondent_distribution: sanitized.territoryDistribution,
      silences_and_gaps: sanitized.silences,
      occupation_summary: sanitized.safeOccupations,
      safe_places_summary: sanitized.safePlaces
    },
    theme_summary: (filters.data.themeSummary ?? []).slice(0, 20),
    word_summary: sanitized.safeWords,
    action_timeline: (filters.data.actionTimeline ?? []).slice(0, 30),
    privacy_notes: privacyNotes,
    methodology_notes: buildReadingMethodologyNote(filters.data),
    limits_text: buildReadingLimitationsNote(filters.data),
    source_type: "collective_reading",
    source_filters: filters.filters,
    source_generated_at: new Date().toISOString(),
    checklist_defaults: {
      data_from_aggregates: true,
      no_raw_quote: true,
      no_interviewer_name: true,
      no_team_email: true,
      no_cpf: true,
      no_phone: true,
      no_address: true,
      no_health_data: true,
      rare_occupations_grouped: true,
      minimum_sample_respected: true,
      words_sanitized: true,
      sensitive_places_hidden: true,
      no_census_claim: true,
      reviewed_by_coordination: false
    }
  };
}
