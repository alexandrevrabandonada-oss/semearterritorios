import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";
import { getNotificationCategory } from "./notifications/notification-meta";

type ListeningRecord = Database["public"]["Tables"]["listening_records"]["Row"];
type Theme = Database["public"]["Tables"]["themes"]["Row"];
type RecordTheme = Database["public"]["Tables"]["listening_record_themes"]["Row"];
type Neighborhood = Database["public"]["Tables"]["neighborhoods"]["Row"];

export type CollectiveOverview = {
  total_records: number;
  reviewed_records: number;
  territories_reached: number;
  total_themes: number;
  total_occupations: number;
  records_without_respondent_neighborhood: number;
  records_without_review: number;
  total_territories: number;
  territories_without_records: number;
};

export type TerritoryStats = {
  id: string;
  name: string;
  count: number;
  percentage: number;
  top_themes: { id: string; name: string; count: number }[];
  top_occupations: { name: string; count: number }[];
};

export async function getCollectiveOverview(supabase: SupabaseClient<Database>): Promise<CollectiveOverview> {
  const [recordsRes, neighborhoodsRes, themesRes] = await Promise.all([
    supabase.from("listening_records").select("id, review_status, respondent_neighborhood_id, respondent_occupation"),
    supabase.from("neighborhoods").select("id"),
    supabase.from("themes").select("id"),
  ]);

  const records = recordsRes.data ?? [];
  const neighborhoods = neighborhoodsRes.data ?? [];
  const themes = themesRes.data ?? [];

  const reviewed = records.filter((r) => r.review_status === "reviewed");
  const territoriesReached = new Set(records.map((r) => r.respondent_neighborhood_id).filter(Boolean)).size;
  const occupations = new Set(records.map((r) => r.respondent_occupation).filter(Boolean)).size;

  return {
    total_records: records.length,
    reviewed_records: reviewed.length,
    territories_reached: territoriesReached,
    total_themes: themes.length,
    total_occupations: occupations,
    records_without_respondent_neighborhood: records.filter((r) => !r.respondent_neighborhood_id).length,
    records_without_review: records.filter((r) => r.review_status !== "reviewed").length,
    total_territories: neighborhoods.length,
    territories_without_records: neighborhoods.length - territoriesReached,
  };
}

export async function getRespondentTerritoryDistribution(supabase: SupabaseClient<Database>) {
  const { data: records } = await supabase
    .from("listening_records")
    .select("respondent_neighborhood_id, neighborhoods!listening_records_respondent_neighborhood_id_fkey(id, name)");

  const stats: Record<string, { name: string; count: number }> = {};
  
  (records ?? []).forEach((r) => {
    const neighborhood = r.neighborhoods as unknown as Neighborhood;
    if (!neighborhood) return;
    if (!stats[neighborhood.id]) {
      stats[neighborhood.id] = { name: neighborhood.name, count: 0 };
    }
    stats[neighborhood.id].count++;
  });

  return Object.entries(stats)
    .map(([id, s]) => ({ id, ...s }))
    .sort((a, b) => b.count - a.count);
}

export async function getTerritoryThemeMatrix(supabase: SupabaseClient<Database>) {
  const { data: records } = await supabase
    .from("listening_records")
    .select("id, respondent_neighborhood_id, neighborhoods!listening_records_respondent_neighborhood_id_fkey(id, name)");
  
  const { data: recordThemes } = await supabase
    .from("listening_record_themes")
    .select("listening_record_id, theme_id, themes(id, name)");

  const themeMap: Record<string, string> = {};
  (recordThemes ?? []).forEach((rt) => {
    const theme = rt.themes as unknown as Theme;
    if (theme) themeMap[theme.id] = theme.name;
  });

  const matrix: Record<string, Record<string, number>> = {};
  const territoryNames: Record<string, string> = {};

  (records ?? []).forEach((r) => {
    const neighborhood = r.neighborhoods as unknown as Neighborhood;
    if (!neighborhood) return;
    const tId = neighborhood.id;
    territoryNames[tId] = neighborhood.name;
    
    if (!matrix[tId]) matrix[tId] = {};
    
    const themesForRecord = (recordThemes ?? []).filter((rt) => rt.listening_record_id === r.id);
    themesForRecord.forEach((rt) => {
      matrix[tId][rt.theme_id] = (matrix[tId][rt.theme_id] || 0) + 1;
    });
  });

  return { matrix, themeMap, territoryNames };
}

export async function getTerritoryWordSummary(supabase: SupabaseClient<Database>) {
  const { data: records } = await supabase
    .from("listening_records")
    .select("respondent_neighborhood_id, words_used, neighborhoods!listening_records_respondent_neighborhood_id_fkey(id, name)");

  const territoryWords: Record<string, Record<string, number>> = {};
  const territoryNames: Record<string, string> = {};

  (records ?? []).forEach((r) => {
    const neighborhood = r.neighborhoods as unknown as Neighborhood;
    if (!neighborhood || !r.words_used) return;
    const tId = neighborhood.id;
    territoryNames[tId] = neighborhood.name;

    if (!territoryWords[tId]) territoryWords[tId] = {};
    
    const words = r.words_used.split(",").map((w) => w.trim().toLowerCase()).filter(Boolean);
    words.forEach((w) => {
      territoryWords[tId][w] = (territoryWords[tId][w] || 0) + 1;
    });
  });

  return { territoryWords, territoryNames };
}

export async function getOccupationSummary(supabase: SupabaseClient<Database>) {
  const { data: records } = await supabase
    .from("listening_records")
    .select("respondent_occupation");

  const counts: Record<string, number> = {};
  (records ?? []).forEach((r) => {
    const occ = r.respondent_occupation || "Não informada";
    counts[occ] = (counts[occ] || 0) + 1;
  });

  // Group rare occupations (< 3)
  const finalCounts: Record<string, number> = {};
  let otherCount = 0;

  Object.entries(counts).forEach(([occ, count]) => {
    if (count < 3 && occ !== "Não informada") {
      otherCount += count;
    } else {
      finalCounts[occ] = count;
    }
  });

  if (otherCount > 0) {
    finalCounts["Outras"] = (finalCounts["Outras"] || 0) + otherCount;
  }

  return Object.entries(finalCounts)
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count);
}

export async function getActionVsRespondentTerritoryFlow(supabase: SupabaseClient<Database>) {
  const { data: records } = await supabase
    .from("listening_records")
    .select(`
      neighborhood_id, 
      action_neighborhood:neighborhoods!listening_records_neighborhood_id_fkey(id, name),
      respondent_neighborhood_id,
      resp_neighborhood:neighborhoods!listening_records_respondent_neighborhood_id_fkey(id, name)
    `);

  const flow: Record<string, Record<string, number>> = {};
  const actionTerritoryNames: Record<string, string> = {};
  const respTerritoryNames: Record<string, string> = {};

  (records ?? []).forEach((r) => {
    const actionN = r.action_neighborhood as unknown as Neighborhood;
    const respN = r.resp_neighborhood as unknown as Neighborhood;
    
    if (!actionN || !respN) return;
    
    actionTerritoryNames[actionN.id] = actionN.name;
    respTerritoryNames[respN.id] = respN.name;

    if (!flow[actionN.id]) flow[actionN.id] = {};
    flow[actionN.id][respN.id] = (flow[actionN.id][respN.id] || 0) + 1;
  });

  return { flow, actionTerritoryNames, respTerritoryNames };
}

export async function getSafeMentionedPlacesSummary(supabase: SupabaseClient<Database>) {
  const { data: places } = await supabase
    .from("place_mentioned")
    .select(`
      normalized_place_id,
      normalized_places!inner(id, normalized_name, visibility, neighborhood_id, neighborhoods(name))
    `)
    .in("normalized_places.visibility", ["internal", "public_safe"]);

  const counts: Record<string, { name: string; territory: string; count: number }> = {};
  
  (places ?? []).forEach((p: any) => {
    const np = p.normalized_places;
    if (!np) return;
    
    if (!counts[np.id]) {
      counts[np.id] = { 
        name: np.normalized_name, 
        territory: np.neighborhoods?.name || "Desconhecido",
        count: 0 
      };
    }
    counts[np.id].count++;
  });

  return Object.values(counts).sort((a, b) => b.count - a.count);
}

export async function getSilenceAndCoverageGaps(supabase: SupabaseClient<Database>) {
  const [recordsRes, neighborhoodsRes] = await Promise.all([
    supabase.from("listening_records").select("respondent_neighborhood_id, review_status"),
    supabase.from("neighborhoods").select("id, name").order("name"),
  ]);

  const records = recordsRes.data ?? [];
  const neighborhoods = neighborhoodsRes.data ?? [];

  const reachCount: Record<string, { total: number; reviewed: number }> = {};
  neighborhoods.forEach((n) => {
    reachCount[n.id] = { total: 0, reviewed: 0 };
  });

  records.forEach((r) => {
    if (r.respondent_neighborhood_id && reachCount[r.respondent_neighborhood_id]) {
      reachCount[r.respondent_neighborhood_id].total++;
      if (r.review_status === "reviewed") {
        reachCount[r.respondent_neighborhood_id].reviewed++;
      }
    }
  });

  const gaps = neighborhoods.map((n) => ({
    id: n.id,
    name: n.name,
    total: reachCount[n.id].total,
    reviewed: reachCount[n.id].reviewed,
    status: reachCount[n.id].total === 0 ? "sem_escuta" : reachCount[n.id].reviewed < 5 ? "pouca_escuta" : "coberto",
  }));

  return gaps.sort((a, b) => a.total - b.total);
}
