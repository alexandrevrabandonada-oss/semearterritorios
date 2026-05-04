import type { Neighborhood } from "@/lib/database.types";

/**
 * Retorna apenas os territórios com status = 'oficial', ordenados por setor e nome.
 * Use em selects operacionais: formulários de ação, escuta e filtros de listagem.
 * Territórios provisórios ficam ocultos dos formulários operacionais por padrão.
 */
export function getOfficialNeighborhoodsForSelect<T extends Pick<Neighborhood, "name" | "sector" | "official_code" | "status">>(
  neighborhoods: T[]
): T[] {
  return sortNeighborhoodsBySectorAndName(neighborhoods.filter((n) => n.status === "oficial"));
}

/**
 * Retorna todos os territórios ordenados por setor e nome, sem filtro de status.
 * Use apenas em telas administrativas, como /territorios.
 */
export function getAllNeighborhoodsForAdmin<T extends Pick<Neighborhood, "name" | "sector" | "official_code">>(
  neighborhoods: T[]
): T[] {
  return sortNeighborhoodsBySectorAndName(neighborhoods);
}

/**
 * Alias de formatNeighborhoodOption.
 * Label operacional: "Retiro — SCN", "Aterrado — SCS"
 */
export function formatNeighborhoodLabel(neighborhood: Pick<Neighborhood, "name" | "sector">): string {
  return formatNeighborhoodOption(neighborhood);
}

export const neighborhoodStatusOptions = [
  { value: "oficial", label: "Oficial" },
  { value: "provisorio", label: "Provisório" },
  { value: "revisar", label: "Revisar" },
  { value: "nao_usar", label: "Não usar" }
] as const;

export const neighborhoodSectorOptions = [
  { value: "SCN", label: "Setor Centro Norte" },
  { value: "SCS", label: "Setor Centro Sul" },
  { value: "SN", label: "Setor Norte" },
  { value: "SL", label: "Setor Leste" },
  { value: "SO", label: "Setor Oeste" },
  { value: "SS", label: "Setor Sul" },
  { value: "SSO", label: "Setor Sudoeste" }
] as const;

export function formatNeighborhoodOption(neighborhood: Pick<Neighborhood, "name" | "sector">) {
  return neighborhood.sector ? `${neighborhood.name} — ${neighborhood.sector}` : neighborhood.name;
}

export function sortNeighborhoodsBySectorAndName<T extends Pick<Neighborhood, "name" | "sector" | "official_code">>(items: T[]) {
  const sectorOrder = new Map(neighborhoodSectorOptions.map((option, index) => [option.value, index]));

  return [...items].sort((a, b) => {
    const sectorA = a.sector ? sectorOrder.get(a.sector) ?? 99 : 99;
    const sectorB = b.sector ? sectorOrder.get(b.sector) ?? 99 : 99;
    if (sectorA !== sectorB) return sectorA - sectorB;
    return a.name.localeCompare(b.name, "pt-BR");
  });
}

export function getNeighborhoodStatusLabel(status: string | null) {
  return neighborhoodStatusOptions.find((option) => option.value === status)?.label ?? "Sem status";
}

export function getNeighborhoodSectorLabel(sector: string | null) {
  return neighborhoodSectorOptions.find((option) => option.value === sector)?.label ?? "Sem setor";
}
