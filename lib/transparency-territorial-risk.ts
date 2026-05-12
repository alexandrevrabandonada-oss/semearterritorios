import type { PublicTransparencySnapshot } from "@/lib/database.types";

export type TerritorialQualitySummary = {
  status: "boa" | "atenção" | "crítica";
  coveragePercent: number;
  recordsWithTerritory: number;
  recordsWithoutTerritory: number;
  methodologyNote: string;
  operationalRecommendation: string;
};

export function getTerritorialQualitySummary(snapshot: Pick<PublicTransparencySnapshot, "territory_summary">): TerritorialQualitySummary | null {
  const territorySummary = (snapshot.territory_summary ?? {}) as {
    territorial_quality_summary?: {
      status?: "boa" | "atenção" | "crítica";
      coverage_percent?: number;
      records_with_territory?: number;
      records_without_territory?: number;
      methodology_note?: string;
      operational_recommendation?: string;
    };
  };

  const quality = territorySummary.territorial_quality_summary;
  if (!quality?.status) return null;

  return {
    status: quality.status,
    coveragePercent: quality.coverage_percent ?? 0,
    recordsWithTerritory: quality.records_with_territory ?? 0,
    recordsWithoutTerritory: quality.records_without_territory ?? 0,
    methodologyNote: quality.methodology_note ?? "",
    operationalRecommendation: quality.operational_recommendation ?? ""
  };
}

export function isCriticalTerritorialQuality(snapshot: Pick<PublicTransparencySnapshot, "territory_summary">) {
  const summary = getTerritorialQualitySummary(snapshot);
  return summary?.status === "crítica";
}

export function hasTerritorialRiskOverride(snapshot: Pick<PublicTransparencySnapshot, "territorial_risk_override" | "territorial_risk_override_reason">) {
  return Boolean(snapshot.territorial_risk_override && snapshot.territorial_risk_override_reason?.trim());
}

export function getTerritorialRiskPublicationGuard(snapshot: Pick<
  PublicTransparencySnapshot,
  "territory_summary" | "territorial_risk_override" | "territorial_risk_override_reason"
>) {
  const summary = getTerritorialQualitySummary(snapshot);
  const critical = summary?.status === "crítica";
  return {
    summary,
    critical,
    hasOverride: hasTerritorialRiskOverride(snapshot),
    requiresInstitutionalJustification: Boolean(critical && !hasTerritorialRiskOverride(snapshot))
  };
}

export function sanitizeTerritorialJustificationForPublic(input: string) {
  return input
    .replace(/\b\d{3}\.\d{3}\.\d{3}-\d{2}\b/g, "[dado removido]")
    .replace(/\b\d{11}\b/g, "[dado removido]")
    .replace(/\b\d{4,5}[-.\s]?\d{4}\b/g, "[dado removido]")
    .replace(/\b[\w.%+-]+@[\w.-]+\.[a-zA-Z]{2,}\b/g, "[dado removido]")
    .replace(/\b(?:rua|avenida|av\.|travessa|alameda)\s+[^,.;\n]+,\s*\d+\b/gi, "local agregado")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 600);
}
