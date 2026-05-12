import type { Neighborhood } from "@/lib/database.types";
import { getTerritorialQualityMetrics, isSensitivePlace, type TerritorialReviewRecord } from "@/lib/territorial-review";

export type TerritoryQualityStatus =
  | "insuficiente"
  | "em revisão"
  | "bom para mapa interno"
  | "bloqueado por sensível";

export type TerritoryQuality = {
  neighborhoodId: string;
  neighborhoodName: string;
  totalRecords: number;
  reviewedRecords: number;
  pendingTerritorialReview: number;
  territorialReviewed: number;
  needsAttention: number;
  totalPlaces: number;
  structuredPlaces: number;
  normalizedPlaces: number;
  sensitivePlaces: number;
  reviewPercent: number;
  territorialReviewPercent: number;
  qualityPercent: number;
  recommendation: TerritoryQualityStatus;
};

export function buildTerritorialQualityByNeighborhood(neighborhoods: Neighborhood[], records: TerritorialReviewRecord[]): TerritoryQuality[] {
  return neighborhoods.map((neighborhood) => {
    const neighborhoodRecords = records.filter((record) => record.neighborhood_id === neighborhood.id);
    const totalRecords = neighborhoodRecords.length;
    const reviewedRecords = neighborhoodRecords.filter((record) => record.review_status === "reviewed").length;
    const pendingTerritorialReview = neighborhoodRecords.filter((record) => record.territorial_review_status === "pending").length;
    const territorialReviewed = neighborhoodRecords.filter((record) => record.territorial_review_status === "reviewed").length;
    const needsAttention = neighborhoodRecords.filter((record) => record.territorial_review_status === "needs_attention").length;
    const places = neighborhoodRecords.flatMap((record) => record.places_mentioned);
    const structuredPlaces = places.filter((place) => !isSensitivePlace(place)).length;
    const normalizedPlaces = places.filter((place) => Boolean(place.normalized_place_id)).length;
    const sensitivePlaces = places.filter(isSensitivePlace).length;
    const reviewPercent = percent(reviewedRecords, totalRecords);
    const territorialReviewPercent = percent(territorialReviewed, totalRecords);
    const qualityPercent = Math.round((reviewPercent + territorialReviewPercent + percent(normalizedPlaces, Math.max(structuredPlaces, 1))) / 3);
    const recommendation = getTerritoryRecommendation({
      reviewedRecords,
      territorialReviewPercent,
      normalizedPlaces,
      structuredPlaces,
      sensitivePlaces,
      needsAttention
    });

    return {
      neighborhoodId: neighborhood.id,
      neighborhoodName: neighborhood.name,
      totalRecords,
      reviewedRecords,
      pendingTerritorialReview,
      territorialReviewed,
      needsAttention,
      totalPlaces: places.length,
      structuredPlaces,
      normalizedPlaces,
      sensitivePlaces,
      reviewPercent,
      territorialReviewPercent,
      qualityPercent,
      recommendation
    };
  }).sort((a, b) => b.totalRecords - a.totalRecords || a.neighborhoodName.localeCompare(b.neighborhoodName, "pt-BR"));
}

export function buildTerritorialQualityReport(items: TerritoryQuality[]) {
  const ready = items.filter((item) => item.recommendation === "bom para mapa interno");
  const reviewing = items.filter((item) => item.recommendation === "em revisão");
  const blocked = items.filter((item) => item.recommendation === "bloqueado por sensível");
  const insufficient = items.filter((item) => item.recommendation === "insuficiente");

  return `# Qualidade territorial dos dados

## Síntese geral

- Territórios avaliados: ${items.length}
- Prontos para mapa interno: ${ready.length}
- Em revisão: ${reviewing.length}
- Bloqueados por sensível: ${blocked.length}
- Insuficientes: ${insufficient.length}

## Territórios prontos para mapa interno
${formatItems(ready)}

## Territórios em revisão
${formatItems([...reviewing, ...insufficient])}

## Pendências
${formatItems(blocked)}

## Recomendação

${ready.length >= 3 ? "Há base territorial para discutir mapa interno autenticado, mantendo dados agregados e sem lugares sensíveis." : "Priorizar revisão territorial e normalização de lugares antes do mapa interno."}
`;
}

function getTerritoryRecommendation(input: {
  reviewedRecords: number;
  territorialReviewPercent: number;
  normalizedPlaces: number;
  structuredPlaces: number;
  sensitivePlaces: number;
  needsAttention: number;
}): TerritoryQualityStatus {
  if (input.sensitivePlaces > 0) return "bloqueado por sensível";
  if (input.reviewedRecords < 5) return "insuficiente";
  if (input.territorialReviewPercent < 80 || input.needsAttention > 0) return "em revisão";
  if (input.structuredPlaces > 0 && input.normalizedPlaces < input.structuredPlaces) return "em revisão";
  return "bom para mapa interno";
}

function percent(value: number, total: number) {
  return total > 0 ? Math.round((value / total) * 100) : 0;
}

function formatItems(items: TerritoryQuality[]) {
  return items.length > 0
    ? items.map((item) => `- ${item.neighborhoodName}: ${item.reviewedRecords}/${item.totalRecords} revisadas, ${item.normalizedPlaces} lugares normalizados, ${item.recommendation}`).join("\n")
    : "- Nenhum território.";
}

export function summarizeTerritorialQuality(records: TerritorialReviewRecord[]) {
  return getTerritorialQualityMetrics(records);
}

// ============= Novo para Tijolo 059 =============

export interface RespondentTerritoryQualityMetrics {
  totalRecords: number;
  recordsWithRespondentTerritory: number;
  recordsWithoutRespondentTerritory: number;
  coveragePercent: number;
  qualityStatus: "boa" | "atenção" | "crítica";
}

export interface ActionRespondentQuality extends RespondentTerritoryQualityMetrics {
  actionId: string;
  actionName?: string;
  actionNeighborhood?: string;
}

export interface TeammemberRespondentQuality extends RespondentTerritoryQualityMetrics {
  teamMemberId: string;
  teamMemberName?: string;
}

export interface TerritorialQualityMethodologyNote {
  status: "boa" | "atenção" | "crítica";
  shortText: string;
  fullText: string;
  operationalRecommendation: string;
  publicRecommendation: string;
}

/**
 * Calcula qualidade de cobertura de "respondent_neighborhood_id"
 * Tijolo 059: Governança de Qualidade Territorial de Referência
 */
export function calculateRespondentTerritoryQuality(
  totalRecords: number,
  recordsWithTerritory: number
): RespondentTerritoryQualityMetrics {
  const recordsWithout = totalRecords - recordsWithTerritory;
  const coveragePercent = totalRecords > 0 ? (recordsWithTerritory / totalRecords) * 100 : 0;

  let qualityStatus: "boa" | "atenção" | "crítica";
  if (coveragePercent >= 80) {
    qualityStatus = "boa";
  } else if (coveragePercent >= 50) {
    qualityStatus = "atenção";
  } else {
    qualityStatus = "crítica";
  }

  return {
    totalRecords,
    recordsWithRespondentTerritory: recordsWithTerritory,
    recordsWithoutRespondentTerritory: recordsWithout,
    coveragePercent: Math.round(coveragePercent * 10) / 10,
    qualityStatus,
  };
}

/**
 * Obtém status label para UI
 */
export function getRespondentQualityStatusLabel(
  status: "boa" | "atenção" | "crítica"
): { label: string; color: string; icon: string } {
  const labels = {
    boa: { label: "Boa cobertura", color: "green", icon: "✓" },
    atenção: { label: "Cobertura moderada", color: "yellow", icon: "⚠" },
    crítica: { label: "Cobertura baixa", color: "red", icon: "✕" },
  };
  return labels[status];
}

/**
 * Tijolo 061: nota metodológica automática para leitura territorial.
 */
export function buildTerritorialQualityMethodologyNote(
  metrics: RespondentTerritoryQualityMetrics
): TerritorialQualityMethodologyNote {
  if (metrics.qualityStatus === "boa") {
    return {
      status: "boa",
      shortText:
        "A maioria das escutas possui território de referência preenchido. As leituras por bairro têm boa cobertura para o recorte analisado.",
      fullText:
        "A maioria das escutas possui território de referência do entrevistado preenchido. Neste recorte, as leituras por bairro têm boa cobertura e podem apoiar decisões territoriais com maior segurança, mantendo o cuidado de não confundir território da ação com território de referência.",
      operationalRecommendation:
        "Manter rotina de revisão e reforçar preenchimento em cada banca para sustentar cobertura >= 80%.",
      publicRecommendation:
        "Publicar com nota metodológica simples, destacando que os dados são agregados e não representam endereço nem geolocalização."
    };
  }

  if (metrics.qualityStatus === "atenção") {
    return {
      status: "atenção",
      shortText:
        "Parte das escutas não possui território de referência preenchido. As leituras por bairro devem ser interpretadas como parciais.",
      fullText:
        "Parte relevante das escutas não possui território de referência do entrevistado preenchido. Por isso, as leituras por bairro neste recorte devem ser tratadas como parciais e usadas com cautela metodológica.",
      operationalRecommendation:
        "Revisar escutas sem território de referência antes de consolidar sínteses territoriais e reforçar a pergunta territorial na próxima banca.",
      publicRecommendation:
        "Publicar apenas com aviso explícito de leitura parcial e evitar conclusões fortes por bairro."
    };
  }

  return {
    status: "crítica",
    shortText:
      "A maioria das escutas não possui território de referência preenchido. Evite conclusões fortes por bairro neste recorte.",
    fullText:
      "A maioria das escutas não possui território de referência do entrevistado preenchido. Neste cenário, leituras por bairro são frágeis e não devem sustentar conclusões fortes sobre distribuição territorial.",
    operationalRecommendation:
      "Priorizar revisão territorial das escutas pendentes antes de qualquer síntese por bairro e orientar equipe para melhorar cobertura imediatamente.",
    publicRecommendation:
      "Se publicar, explicitar limitação crítica e evitar ranking territorial como conclusão principal."
  };
}
