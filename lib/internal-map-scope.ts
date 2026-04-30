import { getActionPilotMetrics } from "@/lib/action-pilot";
import type { ActionClosure, ActionDebrief, Neighborhood, NormalizedPlaceVisibility, Theme } from "@/lib/database.types";
import type { NormalizedPlacesQualitySummary } from "@/lib/normalized-places-quality";
import { buildTerritorialQualityByNeighborhood, type TerritoryQuality } from "@/lib/territorial-quality";
import { getTerritorialQualityMetrics, isSensitivePlace, type TerritorialReviewRecord } from "@/lib/territorial-review";
import type { InternalMapPlaceSummary, InternalMapReadiness, InternalMapTerritory, InternalMapThemeSummary } from "@/types/internal-map";

export type InternalMapScopeSummary = {
  reviewedRecords: number;
  totalRecords: number;
  territoriesWithData: number;
  readyTerritories: number;
  blockedTerritories: number;
  safeNormalizedPlaces: number;
  sensitivePlaces: number;
  sensitivePlaceTypes: number;
  duplicateWarnings: number;
  pendingTerritorialReview: number;
  unnormalizedStructuredPlaces: number;
  aggregatedThemesByTerritory: Array<{ neighborhoodId: string; neighborhoodName: string; themes: InternalMapThemeSummary[] }>;
  recommendation: InternalMapReadiness;
  justification: string;
};

export type InternalMapGoNoGoCriterion = {
  label: string;
  detail: string;
  ok: boolean;
  category: "dados" | "privacidade" | "normalizacao" | "institucional" | "rls";
};

export type InternalMapGoNoGoResult = {
  status: InternalMapReadiness;
  criteria: InternalMapGoNoGoCriterion[];
  summary: InternalMapScopeSummary;
};

type RecordForInternalMap = TerritorialReviewRecord & {
  listening_record_themes?: Array<{ themes: Pick<Theme, "id" | "name"> | null }>;
};

export function buildInternalMapScope(input: {
  neighborhoods: Neighborhood[];
  records: RecordForInternalMap[];
  normalizedQuality?: NormalizedPlacesQualitySummary;
}): InternalMapScopeSummary {
  const actionMetrics = getActionPilotMetrics(input.records);
  const territorialMetrics = getTerritorialQualityMetrics(input.records);
  const territoryQuality = buildTerritorialQualityByNeighborhood(input.neighborhoods, input.records);
  const territoriesWithData = new Set(input.records.map((record) => record.neighborhood_id).filter(Boolean)).size;
  const readyTerritories = territoryQuality.filter((territory) => territory.recommendation === "bom para mapa interno").length;
  const blockedTerritories = territoryQuality.filter((territory) => territory.recommendation === "bloqueado por sensível").length;
  const safeNormalizedPlaces = countSafeNormalizedPlaces(input.records);
  const sensitivePlaceTypes = input.records.reduce((sum, record) => sum + record.places_mentioned.filter(isSensitivePlace).length, 0);
  const duplicateWarnings = input.normalizedQuality?.possibleDuplicates.length ?? 0;
  const unnormalizedStructuredPlaces = Math.max(territorialMetrics.structuredPlaceMentions - territorialMetrics.normalizedPlaces, 0);
  const recommendation = getScopeRecommendation({
    reviewedRecords: actionMetrics.reviewed,
    territoriesWithData,
    blockedTerritories,
    sensitivePlaces: territorialMetrics.sensitivePlaces + (input.normalizedQuality?.sensitive ?? 0),
    duplicateWarnings,
    pendingTerritorialReview: territorialMetrics.pendingTerritorialReview,
    needsAttention: territorialMetrics.needsAttention,
    unnormalizedStructuredPlaces
  });

  return {
    reviewedRecords: actionMetrics.reviewed,
    totalRecords: actionMetrics.total,
    territoriesWithData,
    readyTerritories,
    blockedTerritories,
    safeNormalizedPlaces,
    sensitivePlaces: territorialMetrics.sensitivePlaces + (input.normalizedQuality?.sensitive ?? 0),
    sensitivePlaceTypes,
    duplicateWarnings,
    pendingTerritorialReview: territorialMetrics.pendingTerritorialReview,
    unnormalizedStructuredPlaces,
    aggregatedThemesByTerritory: buildThemesByTerritory(input.neighborhoods, input.records),
    recommendation,
    justification: getScopeJustification(recommendation)
  };
}

export function buildInternalMapTerritories(input: {
  neighborhoods: Neighborhood[];
  records: RecordForInternalMap[];
}): InternalMapTerritory[] {
  const quality = new Map(buildTerritorialQualityByNeighborhood(input.neighborhoods, input.records).map((item) => [item.neighborhoodId, item]));

  return input.neighborhoods.map((neighborhood) => {
    const records = input.records.filter((record) => record.neighborhood_id === neighborhood.id);
    const territoryQuality = quality.get(neighborhood.id);
    const reviewedRecords = records.filter((record) => record.review_status === "reviewed").length;
    const sensitivePlaceTypes = records.some((record) => record.places_mentioned.some(isSensitivePlace));
    const hasSensitivePlaces = records.some((record) => record.places_mentioned.some((place) => place.normalized_places?.visibility === "sensitive"));

    return {
      neighborhoodId: neighborhood.id,
      neighborhoodName: neighborhood.name,
      totalRecords: records.length,
      reviewedRecords,
      reviewPercent: records.length > 0 ? Math.round((reviewedRecords / records.length) * 100) : 0,
      territorialQuality: territoryQuality?.recommendation ?? "insuficiente",
      themes: buildThemeSummary(records),
      places: buildPlaceSummary(records),
      privacy: {
        hasSensitivePlaces,
        hasSensitivePlaceTypes: sensitivePlaceTypes,
        hasPossibleSensitiveData: false,
        safeForInternalMap: !hasSensitivePlaces && !sensitivePlaceTypes
      }
    };
  });
}

export function buildInternalMapGoNoGo(input: {
  neighborhoods: Neighborhood[];
  records: RecordForInternalMap[];
  normalizedQuality?: NormalizedPlacesQualitySummary;
  debrief?: ActionDebrief | null;
  closure?: ActionClosure | null;
  actionContext?: boolean;
  rlsValidated?: boolean;
}): InternalMapGoNoGoResult {
  const summary = buildInternalMapScope(input);
  const actionMetrics = getActionPilotMetrics(input.records);
  const territorialMetrics = getTerritorialQualityMetrics(input.records);
  const unnormalized = Math.max(territorialMetrics.structuredPlaceMentions - territorialMetrics.normalizedPlaces, 0);

  const criteria: InternalMapGoNoGoCriterion[] = [
    { label: "20+ escutas revisadas", detail: `${actionMetrics.reviewed} escuta(s) revisada(s).`, ok: actionMetrics.reviewed >= 20, category: "dados" },
    { label: "3+ territórios com dados", detail: `${summary.territoriesWithData} território(s) com dados.`, ok: summary.territoriesWithData >= 3, category: "dados" },
    { label: "Revisão territorial concluída", detail: `${territorialMetrics.pendingTerritorialReview} pendente(s), ${territorialMetrics.needsAttention} precisa(m) atenção.`, ok: territorialMetrics.pendingTerritorialReview === 0 && territorialMetrics.needsAttention === 0, category: "dados" },
    { label: "Lugares normalizados", detail: `${unnormalized} lugar(es) estruturado(s) sem normalização.`, ok: unnormalized === 0, category: "normalizacao" },
    { label: "Sem lugares sensíveis pendentes", detail: `${summary.sensitivePlaces} lugar(es) sensível(is) no recorte.`, ok: summary.sensitivePlaces === 0, category: "privacidade" },
    { label: "Sem duplicidades relevantes", detail: `${summary.duplicateWarnings} possível(is) duplicidade(s).`, ok: summary.duplicateWarnings === 0, category: "normalizacao" },
    { label: "RLS validada manualmente", detail: input.rlsValidated ? "Validação manual registrada." : "Pendente de validação no banco aplicado.", ok: Boolean(input.rlsValidated), category: "rls" },
    { label: "Devolutiva aprovada", detail: input.actionContext ? `Status: ${input.debrief?.status ?? "não criada"}.` : "Critério aplicado quando há ação principal.", ok: !input.actionContext || input.debrief?.status === "approved", category: "institucional" },
    { label: "Dossiê fechado", detail: input.actionContext ? `Status: ${input.closure?.status ?? "não criado"}.` : "Critério aplicado quando há ação principal.", ok: !input.actionContext || input.closure?.status === "closed", category: "institucional" }
  ];

  return {
    status: getGoNoGoStatus(criteria),
    criteria,
    summary
  };
}

function getScopeRecommendation(input: {
  reviewedRecords: number;
  territoriesWithData: number;
  blockedTerritories: number;
  sensitivePlaces: number;
  duplicateWarnings: number;
  pendingTerritorialReview: number;
  needsAttention: number;
  unnormalizedStructuredPlaces: number;
}): InternalMapReadiness {
  if (input.sensitivePlaces > 0 || input.blockedTerritories > 0) return "NO-GO: privacidade";
  if (input.duplicateWarnings > 0 || input.unnormalizedStructuredPlaces > 0) return "NO-GO: normalização";
  if (input.reviewedRecords < 20 || input.territoriesWithData < 3 || input.pendingTerritorialReview > 0 || input.needsAttention > 0) return "NO-GO: dados insuficientes";
  return "GO: desenho técnico";
}

function getGoNoGoStatus(criteria: InternalMapGoNoGoCriterion[]): InternalMapReadiness {
  const failed = criteria.filter((criterion) => !criterion.ok);
  if (failed.some((criterion) => criterion.category === "privacidade")) return "NO-GO: privacidade";
  if (failed.some((criterion) => criterion.category === "normalizacao")) return "NO-GO: normalização";
  if (failed.some((criterion) => criterion.category === "dados")) return "NO-GO: dados insuficientes";
  if (failed.some((criterion) => criterion.category === "rls" || criterion.category === "institucional")) return "GO: desenho técnico";
  return "GO: protótipo interno";
}

function getScopeJustification(status: InternalMapReadiness) {
  if (status === "NO-GO: privacidade") return "Há lugar sensível ou território bloqueado. Não avançar até ocultar e revisar.";
  if (status === "NO-GO: normalização") return "Há lugares sem normalização ou duplicidades relevantes.";
  if (status === "NO-GO: dados insuficientes") return "Ainda falta volume revisado, territórios ou revisão territorial concluída.";
  if (status === "GO: protótipo interno") return "Critérios técnicos e institucionais atendidos para protótipo interno autenticado.";
  return "Base adequada para desenho técnico, ainda sem implementar mapa geográfico.";
}

function countSafeNormalizedPlaces(records: RecordForInternalMap[]) {
  const ids = new Set<string>();
  records.forEach((record) => {
    record.places_mentioned.forEach((place) => {
      const normalized = place.normalized_places;
      if (!place.normalized_place_id || !normalized) return;
      if (normalized.visibility === "sensitive" || isSensitivePlace(place)) return;
      ids.add(place.normalized_place_id);
    });
  });
  return ids.size;
}

function buildThemesByTerritory(neighborhoods: Neighborhood[], records: RecordForInternalMap[]) {
  return neighborhoods.map((neighborhood) => ({
    neighborhoodId: neighborhood.id,
    neighborhoodName: neighborhood.name,
    themes: buildThemeSummary(records.filter((record) => record.neighborhood_id === neighborhood.id))
  }));
}

function buildThemeSummary(records: RecordForInternalMap[]): InternalMapThemeSummary[] {
  const counts = new Map<string, { themeName: string; count: number }>();
  records.forEach((record) => {
    record.listening_record_themes?.forEach((item) => {
      if (!item.themes) return;
      const current = counts.get(item.themes.id) ?? { themeName: item.themes.name, count: 0 };
      counts.set(item.themes.id, { ...current, count: current.count + 1 });
    });
  });
  return Array.from(counts.entries())
    .map(([themeId, item]) => ({ themeId, themeName: item.themeName, count: item.count }))
    .sort((a, b) => b.count - a.count || a.themeName.localeCompare(b.themeName, "pt-BR"));
}

function buildPlaceSummary(records: RecordForInternalMap[]): InternalMapPlaceSummary[] {
  const counts = new Map<string, InternalMapPlaceSummary>();
  records.forEach((record) => {
    record.places_mentioned.forEach((place) => {
      const normalized = place.normalized_places;
      if (!place.normalized_place_id || !normalized || isSensitivePlace(place) || normalized.visibility === "sensitive") return;
      const visibility = normalized.visibility as Exclude<NormalizedPlaceVisibility, "sensitive">;
      const current = counts.get(place.normalized_place_id) ?? {
        normalizedPlaceId: place.normalized_place_id,
        normalizedName: normalized.normalized_name,
        placeType: normalized.place_type,
        visibility,
        count: 0
      };
      counts.set(place.normalized_place_id, { ...current, count: current.count + 1 });
    });
  });
  return Array.from(counts.values()).sort((a, b) => b.count - a.count || a.normalizedName.localeCompare(b.normalizedName, "pt-BR"));
}
