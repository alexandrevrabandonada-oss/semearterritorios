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
