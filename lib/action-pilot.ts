import type { Action, ListeningRecord, Neighborhood, Theme } from "@/lib/database.types";

export type ListeningRecordForPilot = ListeningRecord & {
  listening_record_themes: Array<{ themes: Pick<Theme, "id" | "name"> | null }>;
};

export type ActionForPilot = Action & {
  neighborhoods?: Pick<Neighborhood, "id" | "name"> | null;
};

export type ReadinessStatus =
  | "Em digitação"
  | "Pronta para revisão"
  | "Em revisão"
  | "Pronta para síntese"
  | "Pronta para relatório";

const sensitivePatterns = [
  /\b\d{3}[-.\s]?\d{3}[-.\s]?\d{3}[-.\s]?\d{2}\b/,
  /\b\d{4,5}[-.\s]?\d{4}\b/,
  /\b[\w.%+-]+@[\w.-]+\.[a-zA-Z]{2,}\b/,
  /\b(?:rua|avenida|av\.|travessa|alameda)\s+[^,.;\n]+,\s*\d+\b/i
];

const stopWords = new Set([
  "a",
  "o",
  "as",
  "os",
  "de",
  "da",
  "do",
  "das",
  "dos",
  "e",
  "em",
  "no",
  "na",
  "nos",
  "nas",
  "para",
  "por",
  "com",
  "que",
  "uma",
  "um",
  "mais",
  "tem",
  "foi",
  "ser",
  "sem",
  "como",
  "muito"
]);

export function hasPossibleSensitiveData(record: Pick<ListeningRecord, "free_speech_text" | "team_summary" | "places_mentioned_text">) {
  const text = [record.free_speech_text, record.team_summary, record.places_mentioned_text].filter(Boolean).join(" ");
  return sensitivePatterns.some((pattern) => pattern.test(text));
}

export function isVeryShortSpeech(record: Pick<ListeningRecord, "free_speech_text">) {
  return record.free_speech_text.trim().split(/\s+/).filter(Boolean).length < 5;
}

export function hasNoWordsUsed(record: Pick<ListeningRecord, "words_used">) {
  return !record.words_used?.trim();
}

function countList(values: string[]) {
  return values
    .flatMap((value) => value.split(/[,;\n]+/))
    .map((value) => value.trim().toLowerCase())
    .filter(Boolean)
    .reduce<Record<string, number>>((acc, value) => {
      acc[value] = (acc[value] ?? 0) + 1;
      return acc;
    }, {});
}

function topEntries(counts: Record<string, number>, limit: number) {
  return Object.entries(counts)
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], "pt-BR"))
    .slice(0, limit)
    .map(([label, count]) => ({ label, count }));
}

export function getActionPilotMetrics(records: ListeningRecordForPilot[]) {
  const themeCounts: Record<string, number> = {};
  const recurringWords: Record<string, number> = {};

  records.forEach((record) => {
    record.listening_record_themes.forEach((item) => {
      if (item.themes?.name) {
        themeCounts[item.themes.name] = (themeCounts[item.themes.name] ?? 0) + 1;
      }
    });

    const source = record.words_used?.trim() || record.free_speech_text;
    source
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .split(/[^a-z0-9]+/)
      .filter((word) => word.length > 3 && !stopWords.has(word))
      .forEach((word) => {
        recurringWords[word] = (recurringWords[word] ?? 0) + 1;
      });
  });

  const draft = records.filter((record) => record.review_status === "draft").length;
  const reviewed = records.filter((record) => record.review_status === "reviewed").length;

  return {
    total: records.length,
    draft,
    reviewed,
    withoutTheme: records.filter((record) => record.listening_record_themes.length === 0).length,
    withoutSummary: records.filter((record) => !record.team_summary?.trim()).length,
    withoutPriority: records.filter((record) => !record.priority_mentioned?.trim()).length,
    possibleSensitive: records.filter(hasPossibleSensitiveData).length,
    veryShort: records.filter(isVeryShortSpeech).length,
    withoutWordsUsed: records.filter(hasNoWordsUsed).length,
    topThemes: topEntries(themeCounts, 8),
    topWords: topEntries(recurringWords, 12),
    places: topEntries(countList(records.map((record) => record.places_mentioned_text ?? "")), 10),
    priorities: topEntries(countList(records.map((record) => record.priority_mentioned ?? "")), 10),
    unexpected: records.map((record) => record.unexpected_notes?.trim()).filter(Boolean).slice(0, 8) as string[],
    pending: records.filter(
      (record) =>
        record.review_status === "draft" ||
        record.listening_record_themes.length === 0 ||
        !record.team_summary?.trim() ||
        !record.priority_mentioned?.trim() ||
        hasPossibleSensitiveData(record)
    ).length
  };
}

export function getActionReadiness(records: ListeningRecordForPilot[], sufficientWithJustification = false): ReadinessStatus {
  const metrics = getActionPilotMetrics(records);
  const reviewedRatio = metrics.total > 0 ? metrics.reviewed / metrics.total : 0;
  const hasSeriousPending = metrics.possibleSensitive > 0;

  if (metrics.total > 0 && (metrics.reviewed === metrics.total || sufficientWithJustification)) {
    return "Pronta para relatório";
  }

  if (metrics.total > 0 && reviewedRatio >= 0.8) {
    return "Pronta para síntese";
  }

  if (metrics.reviewed > 0 && metrics.draft > 0) {
    return "Em revisão";
  }

  if (metrics.total > 0 && !hasSeriousPending) {
    return "Pronta para revisão";
  }

  return "Em digitação";
}

export function getOperationRecommendation(status: ReadinessStatus) {
  if (status === "Pronta para relatório") return "pronta para relatório";
  if (status === "Pronta para síntese") return "pronta para síntese";
  if (status === "Em revisão" || status === "Pronta para revisão") return "revisar pendências";
  return "continuar digitando";
}
