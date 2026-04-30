import type { ListeningRecord, NormalizedPlace, PlaceMentioned, TerritorialReviewStatus } from "@/lib/database.types";
import { hasPossibleSensitiveData, type ListeningRecordForPilot } from "@/lib/action-pilot";

export const territorialReviewStatusOptions: Array<{ value: TerritorialReviewStatus; label: string }> = [
  { value: "pending", label: "Pendente" },
  { value: "reviewed", label: "Revisada" },
  { value: "needs_attention", label: "Precisa atenção" }
];

export const placeTypeOptions = [
  { value: "bairro", label: "Bairro" },
  { value: "rua_ou_area", label: "Rua ou área" },
  { value: "equipamento_publico", label: "Equipamento público" },
  { value: "escola", label: "Escola" },
  { value: "cras", label: "CRAS" },
  { value: "praca", label: "Praça" },
  { value: "rio_ou_corpo_dagua", label: "Rio ou corpo d'água" },
  { value: "ponto_de_referencia", label: "Ponto de referência" },
  { value: "outro", label: "Outro" },
  { value: "sensivel_nao_publicar", label: "Sensível/não publicar" }
];

export type PlaceForTerritorialReview = Pick<PlaceMentioned, "id" | "place_name" | "place_type" | "notes" | "neighborhood_id" | "normalized_place_id"> & {
  normalized_places?: Pick<NormalizedPlace, "id" | "normalized_name" | "visibility" | "place_type"> | null;
};

export type TerritorialReviewRecord = ListeningRecordForPilot & {
  places_mentioned: PlaceForTerritorialReview[];
};

export function getTerritorialReviewStatusLabel(status: TerritorialReviewStatus) {
  return territorialReviewStatusOptions.find((option) => option.value === status)?.label ?? status;
}

export function isSensitivePlace(place: Pick<PlaceMentioned, "place_type">) {
  return place.place_type === "sensivel_nao_publicar";
}

export function hasUnstructuredPlaces(record: Pick<ListeningRecord, "places_mentioned_text"> & { places_mentioned?: PlaceForTerritorialReview[] }) {
  return Boolean(record.places_mentioned_text?.trim()) && (record.places_mentioned?.length ?? 0) === 0;
}

export function getTerritorialQualityMetrics(records: TerritorialReviewRecord[]) {
  const withNeighborhood = records.filter((record) => Boolean(record.neighborhood_id)).length;
  const withStructuredPlaces = records.filter((record) => record.places_mentioned.some((place) => !isSensitivePlace(place))).length;
  const structuredPlaceMentions = records.reduce((sum, record) => sum + record.places_mentioned.filter((place) => !isSensitivePlace(place)).length, 0);
  const pendingTerritorialReview = records.filter((record) => record.territorial_review_status === "pending").length;
  const needsAttention = records.filter((record) => record.territorial_review_status === "needs_attention").length;
  const sensitivePlaces = records.reduce((sum, record) => sum + record.places_mentioned.filter(isSensitivePlace).length, 0);
  const normalizedPlaces = records.reduce((sum, record) => sum + record.places_mentioned.filter((place) => Boolean(place.normalized_place_id)).length, 0);
  const unstructuredPlaces = records.filter(hasUnstructuredPlaces).length;
  const possibleSensitive = records.filter(hasPossibleSensitiveData).length;

  return {
    total: records.length,
    withNeighborhood,
    withStructuredPlaces,
    structuredPlaceMentions,
    pendingTerritorialReview,
    needsAttention,
    sensitivePlaces,
    normalizedPlaces,
    unstructuredPlaces,
    possibleSensitive,
    readyForInternalMap:
      records.length > 0 &&
      pendingTerritorialReview === 0 &&
      needsAttention === 0 &&
      sensitivePlaces === 0 &&
      possibleSensitive === 0 &&
      unstructuredPlaces === 0 &&
      (structuredPlaceMentions === 0 || normalizedPlaces >= structuredPlaceMentions)
  };
}

export function getTerritorialQualityRecommendation(records: TerritorialReviewRecord[]) {
  const metrics = getTerritorialQualityMetrics(records);
  if (metrics.sensitivePlaces > 0 || metrics.possibleSensitive > 0) {
    return "Bloquear mapa/devolutiva pública até revisar lugares ou dados sensíveis.";
  }
  if (metrics.unstructuredPlaces > 0) {
    return "Padronizar lugares mencionados antes do mapa.";
  }
  if (metrics.normalizedPlaces < metrics.structuredPlaceMentions) {
    return "Normalizar nomes de lugares antes do mapa interno.";
  }
  if (metrics.pendingTerritorialReview > 0 || metrics.needsAttention > 0) {
    return "Concluir revisão territorial antes do mapa interno.";
  }
  return metrics.readyForInternalMap ? "Pronto para avaliar mapa interno." : "Registrar bairros e lugares estruturados antes do mapa.";
}
