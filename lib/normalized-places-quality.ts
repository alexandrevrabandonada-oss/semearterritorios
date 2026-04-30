import type { Neighborhood, NormalizedPlace, PlaceMentioned } from "@/lib/database.types";
import type { TerritoryQuality } from "@/lib/territorial-quality";

export type NormalizedPlaceWithMentions = NormalizedPlace & {
  mention_count?: number;
};

export type NormalizedPlaceDuplicate = {
  reason: "mesmo_nome_no_bairro" | "nome_parecido_no_bairro" | "mesmo_nome_em_bairros_diferentes";
  places: NormalizedPlaceWithMentions[];
  label: string;
};

export type NormalizedPlacesQualitySummary = {
  total: number;
  internal: number;
  publicSafe: number;
  sensitive: number;
  possibleDuplicates: NormalizedPlaceDuplicate[];
  ambiguousNames: NormalizedPlaceDuplicate[];
  sensitivePlaces: NormalizedPlaceWithMentions[];
  withoutMentions: NormalizedPlaceWithMentions[];
  manyMentions: NormalizedPlaceWithMentions[];
  withoutNeighborhood: NormalizedPlaceWithMentions[];
  neighborhoodsWithNormalizedPlaces: number;
  recommendation: string;
  recommendationSeverity: "ok" | "warning" | "blocker";
};

export function buildNormalizedPlacesQuality(input: {
  normalizedPlaces: NormalizedPlace[];
  placesMentioned: Pick<PlaceMentioned, "id" | "normalized_place_id" | "place_type">[];
  neighborhoods: Pick<Neighborhood, "id" | "name">[];
  territoryQuality?: TerritoryQuality[];
}): NormalizedPlacesQualitySummary {
  const mentionCount = new Map<string, number>();
  input.placesMentioned.forEach((place) => {
    if (!place.normalized_place_id) return;
    mentionCount.set(place.normalized_place_id, (mentionCount.get(place.normalized_place_id) ?? 0) + 1);
  });

  const withMentions = input.normalizedPlaces.map((place) => ({
    ...place,
    mention_count: mentionCount.get(place.id) ?? 0
  }));

  const possibleDuplicates = findPossibleDuplicates(withMentions);
  const ambiguousNames = findAmbiguousNames(withMentions);
  const sensitivePlaces = withMentions.filter((place) => place.visibility === "sensitive");
  const withoutMentions = withMentions.filter((place) => (place.mention_count ?? 0) === 0);
  const manyMentions = withMentions.filter((place) => (place.mention_count ?? 0) >= 5).sort((a, b) => (b.mention_count ?? 0) - (a.mention_count ?? 0));
  const withoutNeighborhood = withMentions.filter((place) => !place.neighborhood_id);
  const neighborhoodsWithNormalizedPlaces = new Set(withMentions.map((place) => place.neighborhood_id).filter(Boolean)).size;
  const readyTerritories = input.territoryQuality?.filter((item) => item.recommendation === "bom para mapa interno").length ?? 0;

  const { recommendation, recommendationSeverity } = getRecommendation({
    sensitivePlaces: sensitivePlaces.length,
    possibleDuplicates: possibleDuplicates.length,
    readyTerritories
  });

  return {
    total: withMentions.length,
    internal: withMentions.filter((place) => place.visibility === "internal").length,
    publicSafe: withMentions.filter((place) => place.visibility === "public_safe").length,
    sensitive: sensitivePlaces.length,
    possibleDuplicates,
    ambiguousNames,
    sensitivePlaces,
    withoutMentions,
    manyMentions,
    withoutNeighborhood,
    neighborhoodsWithNormalizedPlaces,
    recommendation,
    recommendationSeverity
  };
}

export function buildNormalizedPlacesQualityReport(input: {
  summary: NormalizedPlacesQualitySummary;
  territoryQuality: TerritoryQuality[];
  neighborhoods: Pick<Neighborhood, "id" | "name">[];
}) {
  const bestTerritories = input.territoryQuality
    .filter((item) => item.recommendation === "bom para mapa interno")
    .map((item) => `- ${item.neighborhoodName}: ${item.qualityPercent}% de qualidade territorial, ${item.normalizedPlaces} lugar(es) normalizado(s)`)
    .join("\n") || "- Nenhum território pronto.";

  return `# Qualidade da normalização territorial

## Síntese

- Lugares normalizados: ${input.summary.total}
- Internos: ${input.summary.internal}
- Públicos seguros: ${input.summary.publicSafe}
- Sensíveis: ${input.summary.sensitive}
- Possíveis duplicidades: ${input.summary.possibleDuplicates.length}
- Nomes ambíguos: ${input.summary.ambiguousNames.length}
- Lugares sem menção: ${input.summary.withoutMentions.length}
- Lugares com muitas menções: ${input.summary.manyMentions.length}
- Bairros com lugares normalizados: ${input.summary.neighborhoodsWithNormalizedPlaces}

## Possíveis duplicidades
${formatDuplicateList(input.summary.possibleDuplicates, input.neighborhoods)}

## Lugares sensíveis
${formatPlaceList(input.summary.sensitivePlaces, input.neighborhoods)}

## Territórios com melhor qualidade
${bestTerritories}

## Pendências antes do mapa

- Revisar duplicidades sem fazer merge automático.
- Conferir lugares sensíveis e garantir que não aparecem no mapa-lista.
- Validar RLS aplicada no banco de homologação ou produção.
- Copiar relatório territorial e registrar decisão formal do mapa interno.

## Recomendação

${input.summary.recommendation}
`;
}

function findPossibleDuplicates(places: NormalizedPlaceWithMentions[]) {
  const groups = new Map<string, NormalizedPlaceWithMentions[]>();
  places.forEach((place) => {
    const key = `${place.neighborhood_id ?? "sem-bairro"}:${normalizePlaceKey(place.normalized_name)}`;
    const current = groups.get(key) ?? [];
    current.push(place);
    groups.set(key, current);
  });

  const exact = Array.from(groups.values())
    .filter((group) => group.length > 1)
    .map((group) => ({
      reason: "mesmo_nome_no_bairro" as const,
      places: group,
      label: group[0]?.normalized_name ?? "Nome repetido"
    }));

  const fuzzy: NormalizedPlaceDuplicate[] = [];
  const byNeighborhood = groupBy(places, (place) => place.neighborhood_id ?? "sem-bairro");
  byNeighborhood.forEach((group) => {
    for (let index = 0; index < group.length; index += 1) {
      for (let otherIndex = index + 1; otherIndex < group.length; otherIndex += 1) {
        const first = group[index];
        const second = group[otherIndex];
        if (!first || !second) continue;
        const firstKey = normalizePlaceKey(first.normalized_name);
        const secondKey = normalizePlaceKey(second.normalized_name);
        if (firstKey === secondKey) continue;
        if (isVerySimilar(firstKey, secondKey)) {
          fuzzy.push({
            reason: "nome_parecido_no_bairro",
            places: [first, second],
            label: `${first.normalized_name} / ${second.normalized_name}`
          });
        }
      }
    }
  });

  return [...exact, ...fuzzy];
}

function findAmbiguousNames(places: NormalizedPlaceWithMentions[]) {
  const groups = new Map<string, NormalizedPlaceWithMentions[]>();
  places.forEach((place) => {
    const key = normalizePlaceKey(place.normalized_name);
    const current = groups.get(key) ?? [];
    current.push(place);
    groups.set(key, current);
  });

  return Array.from(groups.values())
    .filter((group) => new Set(group.map((place) => place.neighborhood_id ?? "sem-bairro")).size > 1)
    .map((group) => ({
      reason: "mesmo_nome_em_bairros_diferentes" as const,
      places: group,
      label: group[0]?.normalized_name ?? "Nome ambíguo"
    }));
}

export function normalizePlaceKey(value: string) {
  return value
    .trim()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .toLocaleLowerCase("pt-BR");
}

function isVerySimilar(first: string, second: string) {
  if (!first || !second) return false;
  if (first.includes(second) || second.includes(first)) return Math.min(first.length, second.length) >= 5;
  return levenshtein(first, second) <= 2;
}

function levenshtein(first: string, second: string) {
  const rows = Array.from({ length: first.length + 1 }, (_, index) => [index]);
  for (let column = 1; column <= second.length; column += 1) rows[0]![column] = column;

  for (let row = 1; row <= first.length; row += 1) {
    for (let column = 1; column <= second.length; column += 1) {
      rows[row]![column] = Math.min(
        rows[row - 1]![column]! + 1,
        rows[row]![column - 1]! + 1,
        rows[row - 1]![column - 1]! + (first[row - 1] === second[column - 1] ? 0 : 1)
      );
    }
  }

  return rows[first.length]![second.length]!;
}

function groupBy<TItem>(items: TItem[], key: (item: TItem) => string) {
  const groups = new Map<string, TItem[]>();
  items.forEach((item) => {
    const groupKey = key(item);
    const current = groups.get(groupKey) ?? [];
    current.push(item);
    groups.set(groupKey, current);
  });
  return groups;
}

function getRecommendation(input: { sensitivePlaces: number; possibleDuplicates: number; readyTerritories: number }) {
  if (input.sensitivePlaces > 0) {
    return {
      recommendation: "Não avançar para mapa enquanto houver lugar sensível pendente.",
      recommendationSeverity: "blocker" as const
    };
  }

  if (input.possibleDuplicates > 0) {
    return {
      recommendation: "Revisar normalização antes do mapa.",
      recommendationSeverity: "warning" as const
    };
  }

  if (input.readyTerritories < 3) {
    return {
      recommendation: "Ampliar escuta/revisão antes do mapa.",
      recommendationSeverity: "warning" as const
    };
  }

  return {
    recommendation: "Pode desenhar mapa interno autenticado.",
    recommendationSeverity: "ok" as const
  };
}

function formatDuplicateList(items: NormalizedPlaceDuplicate[], neighborhoods: Pick<Neighborhood, "id" | "name">[]) {
  return items.length > 0
    ? items.map((item) => `- ${item.label}: ${item.places.map((place) => `${place.normalized_name} (${getNeighborhoodName(place.neighborhood_id, neighborhoods)})`).join("; ")}`).join("\n")
    : "- Nenhuma duplicidade provável detectada.";
}

function formatPlaceList(items: NormalizedPlaceWithMentions[], neighborhoods: Pick<Neighborhood, "id" | "name">[]) {
  return items.length > 0
    ? items.map((place) => `- ${place.normalized_name} (${getNeighborhoodName(place.neighborhood_id, neighborhoods)}): ${place.mention_count ?? 0} menção(ões)`).join("\n")
    : "- Nenhum lugar sensível normalizado.";
}

function getNeighborhoodName(id: string | null, neighborhoods: Pick<Neighborhood, "id" | "name">[]) {
  return neighborhoods.find((item) => item.id === id)?.name ?? "sem bairro";
}
