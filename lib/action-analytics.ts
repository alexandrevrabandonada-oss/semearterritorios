/**
 * Motor de análise determinística da ação
 * Orquestra todas as análises analíticas sem IA, sem invenção, sem geocodificação
 * Deve ser a fonte única de dados analíticos para dossier e devolutiva
 */

import type {
  ListeningRecord,
  Theme,
  Neighborhood
} from "@/lib/database.types";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";
import { calculateRespondentTerritoryQuality, buildTerritorialQualityMethodologyNote } from "@/lib/territorial-quality";
import { getActionPilotMetrics, summarizeOccupations, hasPossibleSensitiveData } from "@/lib/action-pilot";

export type ListeningRecordAnalytic = ListeningRecord & {
  listening_record_themes: Array<{ themes: Pick<Theme, "id" | "name"> | null }>;
  respondent_neighborhood?: Pick<Neighborhood, "id" | "name"> | null;
};

export type ThemeRanking = {
  id: string;
  name: string;
  count: number;
  percentage: number;
  rank: number;
};

export type WordRanking = {
  word: string;
  count: number;
  percentage: number;
  rank: number;
};

export type PriorityRanking = {
  priority: string;
  count: number;
  percentage: number;
  rank: number;
};

export type PlaceRanking = {
  place: string;
  count: number;
  percentage: number;
  rank: number;
  isSensitive: boolean;
  isStructured: boolean;
};

export type OccupationDetail = {
  occupation: string;
  count: number;
  percentage: number;
  isSensitive: boolean;
  minFrequencyMet: boolean;
  topThemes: ThemeRanking[];
};

export type InterviewerDetail = {
  interviewerId: string;
  interviewerName: string;
  recordCount: number;
  percentage: number;
};

export type ThemeCooccurrence = {
  theme1: string;
  theme2: string;
  cooccurrenceCount: number;
  percentage: number;
};

export type ThemeByRespondentTerritory = {
  neighborhoodId: string;
  neighborhoodName: string;
  recordCount: number;
  topThemes: ThemeRanking[];
  topWords: WordRanking[];
};

export type ThemeByOccupation = {
  occupation: string;
  recordCount: number;
  isSensitive: boolean;
  topThemes: ThemeRanking[];
};

export type AnalyticalSignal = {
  type: "threshold_strength" | "cooccurrence_pattern" | "coverage_warning" | "review_alert" | "methodology_caution";
  severity: "info" | "warning" | "critical";
  title: string;
  description: string;
  actionable?: string;
};

export type MethodologicalWarning = {
  code: string;
  severity: "info" | "warning" | "critical";
  title: string;
  description: string;
  blocksPublish?: boolean;
};

export type SuggestedNextStep = {
  category: "territorial" | "thematic" | "operational" | "publication";
  title: string;
  description: string;
  priority: "low" | "medium" | "high";
};

export type PublicSafeSummary = {
  shouldPublish: boolean;
  publicityLevel: "ready" | "needs_review" | "blocked";
  blockedReason?: string;
  recommendations: string[];
};

export type ActionAnalytics = {
  // Basics
  actionId: string;
  totalRecords: number;
  reviewedCount: number;
  draftCount: number;
  sensitiveCount: number;

  // Review and readiness
  reviewStatus: {
    reviewedPercent: number;
    draftPercent: number;
    sensitivePercent: number;
    overallReadiness: "Em digitação" | "Pronta para revisão" | "Em revisão" | "Pronta para síntese" | "Pronta para relatório";
  };

  // Territorial quality
  territorialQuality: {
    totalRecords: number;
    recordsWithTerritory: number;
    recordsWithoutTerritory: number;
    coveragePercent: number;
    status: "boa" | "atenção" | "crítica";
    recommendation: string;
  };

  // Action territory (where action happened)
  actionTerritory: {
    id: string;
    name: string;
    recordsCollected: number;
  };

  // Respondent territories (where respondents are from)
  respondentTerritories: ThemeByRespondentTerritory[];

  // Theme analysis
  themeRanking: ThemeRanking[];
  themeTopCount: number; // Top themes to show (usually top 5)

  // Word analysis
  wordRanking: WordRanking[];
  wordTopCount: number; // Top words to show (usually top 8)

  // Priority analysis
  priorityRanking: PriorityRanking[];

  // Place analysis
  placeRanking: PlaceRanking[];

  // Occupation analysis
  occupationSummary: OccupationDetail[];
  occupationWithoutCount: number;

  // Interviewer analysis
  interviewerSummary: InterviewerDetail[];

  // Theme interconnections
  themeCooccurrences: ThemeCooccurrence[];

  // Multi-dimensional: theme by respondent territory
  themeByRespondentTerritory: ThemeByRespondentTerritory[];

  // Multi-dimensional: theme by occupation
  themeByOccupation: ThemeByOccupation[];

  // Analytical signals
  topSignals: AnalyticalSignal[];

  // Cautions and blockers
  methodologicalWarnings: MethodologicalWarning[];

  // Suggested next steps
  suggestedNextSteps: SuggestedNextStep[];

  // Public readiness
  publicSafeSummary: PublicSafeSummary;

  // Timestamps
  generatedAt: string;
};

/**
 * Main function: Build comprehensive analytics for an action
 * Called once per action page load, cached in component state
 */
export async function buildActionAnalytics(
  actionId: string,
  records: ListeningRecordAnalytic[],
  actionName?: string,
  actionTerritory?: { id: string; name: string; recordsCollected?: number }
): Promise<ActionAnalytics> {
  // 1. Basic counts
  const totalRecords = records.length;
  const reviewedCount = records.filter((r) => r.review_status === "reviewed").length;
  const draftCount = records.filter((r) => r.review_status === "draft").length;
  const sensitiveCount = records.filter((r) => hasPossibleSensitiveData(r)).length;

  // 2. Metrics from action-pilot
  const pilotMetrics = getActionPilotMetrics(records);
  const occupationSummaryRaw = summarizeOccupations(records);

  // 3. Territorial quality
  const territorialQuality = calculateRespondentTerritoryQuality(
    totalRecords,
    records.filter((r) => Boolean(r.respondent_neighborhood_id)).length
  );

  // 4. Theme ranking
  const themeRanking: ThemeRanking[] = pilotMetrics.topThemes.map((item, idx) => ({
    id: `theme-${idx}`,
    name: item.label,
    count: item.count,
    percentage: totalRecords > 0 ? Math.round((item.count / totalRecords) * 100) : 0,
    rank: idx + 1
  }));

  // 5. Word ranking
  const wordRanking: WordRanking[] = pilotMetrics.topWords.map((item, idx) => ({
    word: item.label,
    count: item.count,
    percentage: totalRecords > 0 ? Math.round((item.count / totalRecords) * 100) : 0,
    rank: idx + 1
  }));

  // 6. Priority ranking
  const priorityRanking: PriorityRanking[] = pilotMetrics.priorities.map((item, idx) => ({
    priority: item.label,
    count: item.count,
    percentage: totalRecords > 0 ? Math.round((item.count / totalRecords) * 100) : 0,
    rank: idx + 1
  }));

  // 7. Place ranking
  const placeRanking: PlaceRanking[] = pilotMetrics.places.map((item, idx) => ({
    place: item.label,
    count: item.count,
    percentage: totalRecords > 0 ? Math.round((item.count / totalRecords) * 100) : 0,
    rank: idx + 1,
    isSensitive: false, // TODO: Check against sensitive patterns
    isStructured: false // TODO: Check if place is normalized
  }));

  // 8. Occupation summary as detail array
  const occupationSummary: OccupationDetail[] = occupationSummaryRaw.groups.map((group) => {
    const minFreq = group.count >= 2;
    // Map top themes from occupationSummaryRaw
    const topThemes: ThemeRanking[] = [];
    return {
      occupation: group.label,
      count: group.count,
      percentage: totalRecords > 0 ? Math.round((group.count / totalRecords) * 100) : 0,
      isSensitive: false,
      minFrequencyMet: minFreq,
      topThemes
    };
  });

  // 9. Theme cooccurrence (themes appearing together in same record)
  const themeCooccurrences = calculateThemeCooccurrences(records, totalRecords);

  // 10. Theme by respondent territory
  const themeByRespondentTerritory = buildThemeByRespondentTerritory(records, totalRecords);

  // 11. Theme by occupation
  const themeByOccupation = buildThemeByOccupation(records, totalRecords);

  // 12. Analytical signals
  const topSignals = generateAnalyticalSignals(
    records,
    themeRanking,
    territorialQuality,
    reviewedCount,
    totalRecords,
    themeCooccurrences
  );

  // 13. Methodological warnings
  const methodologicalWarnings = generateMethodologicalWarnings(
    records,
    reviewedCount,
    totalRecords,
    sensitiveCount,
    territorialQuality
  );

  // 14. Suggested next steps
  const suggestedNextSteps = generateSuggestedNextSteps(
    records,
    themeRanking,
    territorialQuality,
    priorityRanking,
    occupationSummaryRaw
  );

  // 15. Public safety summary
  const publicSafeSummary = assessPublicSafety(
    records,
    reviewedCount,
    totalRecords,
    sensitiveCount,
    territorialQuality,
    methodologicalWarnings
  );

  // 16. Interviewer summary
  const interviewerSummary: InterviewerDetail[] = []; // TODO: Load from action_team_members

  return {
    actionId,
    totalRecords,
    reviewedCount,
    draftCount,
    sensitiveCount,

    reviewStatus: {
      reviewedPercent: totalRecords > 0 ? Math.round((reviewedCount / totalRecords) * 100) : 0,
      draftPercent: totalRecords > 0 ? Math.round((draftCount / totalRecords) * 100) : 0,
      sensitivePercent: totalRecords > 0 ? Math.round((sensitiveCount / totalRecords) * 100) : 0,
      overallReadiness: determineReadiness(reviewedCount, totalRecords, draftCount, sensitiveCount)
    },

    territorialQuality: {
      totalRecords,
      recordsWithTerritory: records.filter((r) => Boolean(r.respondent_neighborhood_id)).length,
      recordsWithoutTerritory: records.filter((r) => !r.respondent_neighborhood_id).length,
      coveragePercent: territorialQuality.coveragePercent,
      status: territorialQuality.qualityStatus,
      recommendation: `Cobertura ${territorialQuality.qualityStatus}. ${
        territorialQuality.qualityStatus === "crítica"
          ? "Análises por bairro não recomendadas."
          : territorialQuality.qualityStatus === "atenção"
            ? "Análises por bairro devem incluir ressalva."
            : "Análises por bairro podem prosseguir com confiança."
      }`
    },

    actionTerritory: actionTerritory
      ? { ...actionTerritory, recordsCollected: actionTerritory.recordsCollected ?? totalRecords }
      : { id: "", name: "Não informado", recordsCollected: totalRecords },

    respondentTerritories: themeByRespondentTerritory,

    themeRanking,
    themeTopCount: Math.min(5, themeRanking.length),

    wordRanking,
    wordTopCount: Math.min(8, wordRanking.length),

    priorityRanking,

    placeRanking,

    occupationSummary,
    occupationWithoutCount: occupationSummaryRaw.withoutOccupation,

    interviewerSummary,

    themeCooccurrences,

    themeByRespondentTerritory,

    themeByOccupation,

    topSignals,

    methodologicalWarnings,

    suggestedNextSteps,

    publicSafeSummary,

    generatedAt: new Date().toISOString()
  };
}

// ============= Helper functions =============

function calculateThemeCooccurrences(
  records: ListeningRecordAnalytic[],
  totalRecords: number
): ThemeCooccurrence[] {
  const cooccurrenceMap = new Map<string, number>();

  for (const record of records) {
    const themes = record.listening_record_themes
      ?.map((item) => item.themes?.name)
      .filter(Boolean) as string[];

    if (themes.length >= 2) {
      // Create pairs
      for (let i = 0; i < themes.length; i++) {
        for (let j = i + 1; j < themes.length; j++) {
          const pair = [themes[i], themes[j]].sort().join(" <-> ");
          cooccurrenceMap.set(pair, (cooccurrenceMap.get(pair) ?? 0) + 1);
        }
      }
    }
  }

  return Array.from(cooccurrenceMap.entries())
    .map(([pair, count]) => {
      const [theme1, theme2] = pair.split(" <-> ");
      return {
        theme1,
        theme2,
        cooccurrenceCount: count,
        percentage: totalRecords > 0 ? Math.round((count / totalRecords) * 100) : 0
      };
    })
    .sort((a, b) => b.cooccurrenceCount - a.cooccurrenceCount)
    .slice(0, 20); // Top 20 cooccurrences
}

function buildThemeByRespondentTerritory(
  records: ListeningRecordAnalytic[],
  totalRecords: number
): ThemeByRespondentTerritory[] {
  const territoryMap = new Map<string, { name: string; records: ListeningRecordAnalytic[] }>();

  for (const record of records) {
    if (!record.respondent_neighborhood_id) continue;

    const key = record.respondent_neighborhood_id;
    const current = territoryMap.get(key) || {
      name: record.respondent_neighborhood?.name || key,
      records: []
    };
    current.records.push(record);
    territoryMap.set(key, current);
  }

  const result: ThemeByRespondentTerritory[] = [];

  Array.from(territoryMap.entries()).forEach(([nbId, { name, records: terriRecords }]) => {
    const themeCounts = new Map<string, number>();
    const wordCounts = new Map<string, number>();

    for (const record of terriRecords) {
      record.listening_record_themes?.forEach((item) => {
        if (item.themes?.name) {
          themeCounts.set(item.themes.name, (themeCounts.get(item.themes.name) ?? 0) + 1);
        }
      });

      const source = record.words_used || record.free_speech_text;
      source
        .toLowerCase()
        .split(/\s+/)
        .filter((w) => w.length > 3)
        .forEach((w) => {
          wordCounts.set(w, (wordCounts.get(w) ?? 0) + 1);
        });
    }

    const topThemes = Array.from(themeCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([name, count], idx) => ({
        id: `${nbId}-theme-${idx}`,
        name,
        count,
        percentage: terriRecords.length > 0 ? Math.round((count / terriRecords.length) * 100) : 0,
        rank: idx + 1
      }));

    const topWords = Array.from(wordCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6)
      .map(([word, count], idx) => ({
        word,
        count,
        percentage: terriRecords.length > 0 ? Math.round((count / terriRecords.length) * 100) : 0,
        rank: idx + 1
      }));

    result.push({
      neighborhoodId: nbId,
      neighborhoodName: name,
      recordCount: terriRecords.length,
      topThemes,
      topWords
    });
  });

  return result.sort((a, b) => b.recordCount - a.recordCount);
}

function buildThemeByOccupation(
  records: ListeningRecordAnalytic[],
  totalRecords: number
): ThemeByOccupation[] {
  const occupationMap = new Map<string, ListeningRecordAnalytic[]>();

  for (const record of records) {
    const occ = record.respondent_occupation?.trim();
    if (!occ) continue;

    const key = occ.toLowerCase();
    const current = occupationMap.get(key) || [];
    current.push(record);
    occupationMap.set(key, current);
  }

  const result: ThemeByOccupation[] = [];

  Array.from(occupationMap.entries()).forEach(([occKey, occRecords]) => {
    if (occRecords.length < 2) return; // Skip low frequency

    const themeCounts = new Map<string, number>();

    for (const record of occRecords) {
      record.listening_record_themes?.forEach((item) => {
        if (item.themes?.name) {
          themeCounts.set(item.themes.name, (themeCounts.get(item.themes.name) ?? 0) + 1);
        }
      });
    }

    const topThemes = Array.from(themeCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([name, count], idx) => ({
        id: `${occKey}-theme-${idx}`,
        name,
        count,
        percentage: occRecords.length > 0 ? Math.round((count / occRecords.length) * 100) : 0,
        rank: idx + 1
      }));

    result.push({
      occupation: occRecords[0].respondent_occupation || occKey,
      recordCount: occRecords.length,
      isSensitive: false,
      topThemes
    });
  });

  return result.sort((a, b) => b.recordCount - a.recordCount);
}

function generateAnalyticalSignals(
  records: ListeningRecordAnalytic[],
  themeRanking: ThemeRanking[],
  territorialQuality: { qualityStatus: string; coveragePercent: number },
  reviewedCount: number,
  totalRecords: number,
  cooccurrences: ThemeCooccurrence[]
): AnalyticalSignal[] {
  const signals: AnalyticalSignal[] = [];

  // Signal 1: Theme dominance
  if (themeRanking.length > 0 && themeRanking[0].percentage >= 40) {
    signals.push({
      type: "threshold_strength",
      severity: "info",
      title: "Tema dominante detectado",
      description: `"${themeRanking[0].name}" aparece em ${themeRanking[0].percentage}% das escutas. Recomenda-se aprofundamento temático.`,
      actionable: "Preparar perguntas específicas ou materiais de aprofundamento sobre este tema."
    });
  }

  // Signal 2: Cooccurrence patterns
  if (cooccurrences.length > 0 && cooccurrences[0].percentage >= 20) {
    signals.push({
      type: "cooccurrence_pattern",
      severity: "info",
      title: "Padrão de coocorrência forte",
      description: `"${cooccurrences[0].theme1}" e "${cooccurrences[0].theme2}" aparecem juntas em ${cooccurrences[0].percentage}% dos casos. Possível elo metodológico.`,
      actionable: "Investigar relação entre estes temas na próxima devolutiva ou ação."
    });
  }

  // Signal 3: Low territorial coverage
  if (territorialQuality.qualityStatus === "crítica") {
    signals.push({
      type: "coverage_warning",
      severity: "critical",
      title: "Cobertura territorial crítica",
      description: `Apenas ${territorialQuality.coveragePercent}% das escutas possuem território de referência preenchido. Análises por bairro devem ser evitadas.`,
      actionable: "Revisar fichas sem território ou orientar equipe a perguntar antes da próxima ação."
    });
  }

  // Signal 4: High pending review
  const reviewPercent = totalRecords > 0 ? Math.round((reviewedCount / totalRecords) * 100) : 0;
  if (reviewPercent < 70) {
    signals.push({
      type: "review_alert",
      severity: "warning",
      title: "Muitas escutas ainda em rascunho",
      description: `Apenas ${reviewPercent}% das escutas foram revisadas. Devolutiva pública deve ser adiada até ${70}% revisado.`,
      actionable: "Priorizar revisão de escutas antes de aprovar devolutiva."
    });
  }

  return signals;
}

function generateMethodologicalWarnings(
  records: ListeningRecordAnalytic[],
  reviewedCount: number,
  totalRecords: number,
  sensitiveCount: number,
  territorialQuality: { qualityStatus: string }
): MethodologicalWarning[] {
  const warnings: MethodologicalWarning[] = [];

  if (sensitiveCount > 0) {
    warnings.push({
      code: "W001",
      severity: "warning",
      title: "Dados sensíveis detectados",
      description: `${sensitiveCount} escuta(s) contêm possível dado sensível (CPF, email, endereço, telefone). Revisar antes de publicação.`,
      blocksPublish: false
    });
  }

  if (territorialQuality.qualityStatus === "crítica") {
    warnings.push({
      code: "W002",
      severity: "critical",
      title: "Cobertura territorial insuficiente para leitura por bairro",
      description: "Menos de 50% das escutas têm território de referência. Análises agregadas recomendadas apenas.",
      blocksPublish: false
    });
  }

  const reviewPercent = totalRecords > 0 ? Math.round((reviewedCount / totalRecords) * 100) : 0;
  if (reviewPercent < 70) {
    warnings.push({
      code: "W003",
      severity: "warning",
      title: "Revisão incompleta",
      description: `${reviewPercent}% das escutas revisadas. Devolutiva pode ser gerada mas é recomendada revisão humana antes de publicação.`,
      blocksPublish: false
    });
  }

  return warnings;
}

function generateSuggestedNextSteps(
  records: ListeningRecordAnalytic[],
  themeRanking: ThemeRanking[],
  territorialQuality: { qualityStatus: string; coveragePercent: number },
  priorityRanking: PriorityRanking[],
  occupationSummary: any
): SuggestedNextStep[] {
  const steps: SuggestedNextStep[] = [];

  // Theme-based suggestions
  if (themeRanking.length > 0 && themeRanking[0].percentage >= 30) {
    steps.push({
      category: "thematic",
      title: `Aprofundar em "${themeRanking[0].name}"`,
      description: `Este tema aparece em ${themeRanking[0].percentage}% das escutas. Recomenda-se preparar materiais complementares ou perguntas específicas para próximas ações.`,
      priority: "high"
    });
  }

  // Territorial suggestions
  if (territorialQuality.qualityStatus === "crítica") {
    steps.push({
      category: "territorial",
      title: "Revisar território de referência",
      description: `Apenas ${territorialQuality.coveragePercent}% das escutas têm territorio informado. Antes de leitura por bairro, completar estes dados.`,
      priority: "high"
    });
  }

  // Priority-based suggestions
  if (priorityRanking.length > 0) {
    steps.push({
      category: "operational",
      title: `Encaminhar sobre "${priorityRanking[0].priority}"`,
      description: `Prioridade mais citada. Recomenda-se ação de encaminhamento institucional ou acompanhamento.`,
      priority: "medium"
    });
  }

  // Publication suggestions
  steps.push({
    category: "publication",
    title: "Preparar devolutiva pública",
    description: "Revisar sanitização de dados, aprovação de falas, e metodologia antes de publicação.",
    priority: "medium"
  });

  return steps;
}

function assessPublicSafety(
  records: ListeningRecordAnalytic[],
  reviewedCount: number,
  totalRecords: number,
  sensitiveCount: number,
  territorialQuality: { qualityStatus: string },
  warnings: MethodologicalWarning[]
): PublicSafeSummary {
  const reviewPercent = totalRecords > 0 ? Math.round((reviewedCount / totalRecords) * 100) : 0;

  let shouldPublish = true;
  let publicityLevel: "ready" | "needs_review" | "blocked" = "ready";
  let blockedReason: string | undefined;
  const recommendations: string[] = [];

  if (sensitiveCount > 0) {
    shouldPublish = false;
    publicityLevel = "blocked";
    blockedReason = `${sensitiveCount} escuta(s) com possível dado sensível.`;
    recommendations.push("Revisar e remover dados sensíveis antes de publicação.");
  }

  if (reviewPercent < 70) {
    shouldPublish = false;
    publicityLevel = "needs_review";
    recommendations.push("Completar revisão de escutas antes de publicar devolutiva.");
  }

  if (territorialQuality.qualityStatus === "crítica") {
    recommendations.push("Devolutiva por bairro não recomendada. Usar apenas agregados territoriais.");
  }

  const criticalWarnings = warnings.filter((w) => w.severity === "critical");
  if (criticalWarnings.length > 0) {
    shouldPublish = false;
    publicityLevel = "blocked";
    blockedReason = `${criticalWarnings.length} aviso(s) crítico(s) pendente(s).`;
  }

  return {
    shouldPublish,
    publicityLevel,
    blockedReason,
    recommendations
  };
}

function determineReadiness(
  reviewedCount: number,
  totalRecords: number,
  draftCount: number,
  sensitiveCount: number
): "Em digitação" | "Pronta para revisão" | "Em revisão" | "Pronta para síntese" | "Pronta para relatório" {
  if (totalRecords === 0) return "Em digitação";
  if (draftCount === 0 && sensitiveCount === 0) return "Pronta para relatório";
  if (draftCount === 0) return "Pronta para síntese";
  const reviewPercent = Math.round((reviewedCount / totalRecords) * 100);
  if (reviewPercent >= 50) return "Em revisão";
  return "Pronta para revisão";
}
