import type { ActionType } from "@/lib/database.types";
import type { TerritoryQualityStatus } from "@/lib/territorial-quality";

export type InternalMapReadiness =
  | "NO-GO: dados insuficientes"
  | "NO-GO: privacidade"
  | "NO-GO: normalização"
  | "GO: desenho técnico"
  | "GO: protótipo interno";

export type InternalMapPrivacyStatus = {
  hasSensitivePlaces: boolean;
  hasSensitivePlaceTypes: boolean;
  hasPossibleSensitiveData: boolean;
  safeForInternalMap: boolean;
};

export type InternalMapThemeSummary = {
  themeId: string;
  themeName: string;
  count: number;
};

export type InternalMapPlaceSummary = {
  normalizedPlaceId: string;
  normalizedName: string;
  placeType: string;
  visibility: "internal" | "public_safe";
  count: number;
};

export type InternalMapTerritory = {
  neighborhoodId: string;
  neighborhoodName: string;
  totalRecords: number;
  reviewedRecords: number;
  reviewPercent: number;
  territorialQuality: TerritoryQualityStatus;
  themes: InternalMapThemeSummary[];
  places: InternalMapPlaceSummary[];
  privacy: InternalMapPrivacyStatus;
};

export type InternalMapFilters = {
  month?: string;
  themeId?: string;
  neighborhoodId?: string;
  actionType?: ActionType;
};
