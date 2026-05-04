import "dotenv/config";
import { createClient } from "@supabase/supabase-js";
import { mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

type LinkedNeighborhood = {
  id: string;
  name: string;
};

type CleanupStatus = "SAFE_TO_REMOVE" | "BLOCKED";

const ROOT = process.cwd();
const outputDir = resolve(ROOT, "supabase/seeds/generated");
const reportOutputPath = resolve(outputDir, "neighborhoods.cleanup-safety.report.md");

async function main() {
  const supabaseUrl = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    throw new Error("Defina SUPABASE_URL/NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY/NEXT_PUBLIC_SUPABASE_ANON_KEY para gerar o relatorio.");
  }

  const supabase = createClient(supabaseUrl, supabaseKey, { auth: { persistSession: false } });
  const [neighborhoodsResult, actionsResult, recordsResult, placesResult, normalizedResult] = await Promise.all([
    supabase.from("neighborhoods").select("id, name").order("name", { ascending: true }),
    supabase.from("actions").select("neighborhood_id"),
    supabase.from("listening_records").select("neighborhood_id"),
    supabase.from("places_mentioned").select("neighborhood_id"),
    supabase.from("normalized_places").select("neighborhood_id")
  ]);

  const error =
    neighborhoodsResult.error ??
    actionsResult.error ??
    recordsResult.error ??
    placesResult.error ??
    normalizedResult.error;

  if (error) {
    throw new Error(error.message);
  }

  const actionLinks = countLinks(actionsResult.data ?? []);
  const recordLinks = countLinks(recordsResult.data ?? []);
  const placeLinks = countLinks(placesResult.data ?? []);
  const normalizedLinks = countLinks(normalizedResult.data ?? []);

  const rows = (neighborhoodsResult.data ?? []).map((neighborhood) => {
    const actionCount = actionLinks.get(neighborhood.id) ?? 0;
    const recordCount = recordLinks.get(neighborhood.id) ?? 0;
    const placeCount = placeLinks.get(neighborhood.id) ?? 0;
    const normalizedCount = normalizedLinks.get(neighborhood.id) ?? 0;
    const status: CleanupStatus = actionCount + recordCount + placeCount + normalizedCount === 0 ? "SAFE_TO_REMOVE" : "BLOCKED";

    return {
      ...neighborhood,
      actionCount,
      recordCount,
      placeCount,
      normalizedCount,
      status
    };
  });

  mkdirSync(outputDir, { recursive: true });
  writeFileSync(reportOutputPath, buildReport(rows), "utf8");

  console.log(`Relatorio gerado em: ${reportOutputPath}`);
}

function countLinks(rows: Array<{ neighborhood_id: string | null }>) {
  const counts = new Map<string, number>();
  rows.forEach((row) => {
    if (!row.neighborhood_id) return;
    counts.set(row.neighborhood_id, (counts.get(row.neighborhood_id) ?? 0) + 1);
  });
  return counts;
}

function buildReport(rows: Array<LinkedNeighborhood & {
  actionCount: number;
  recordCount: number;
  placeCount: number;
  normalizedCount: number;
  status: CleanupStatus;
}>) {
  const safe = rows.filter((row) => row.status === "SAFE_TO_REMOVE");
  const blocked = rows.filter((row) => row.status === "BLOCKED");

  return [
    "# Relatorio de limpeza segura de territorios",
    "",
    `- Total de territorios avaliados: ${rows.length}`,
    `- SAFE_TO_REMOVE: ${safe.length}`,
    `- BLOCKED: ${blocked.length}`,
    "",
    "## SAFE_TO_REMOVE",
    "",
    ...(safe.length > 0 ? safe.map((row) => `- ${row.name}`) : ["- Nenhum territorio sem vinculo."]),
    "",
    "## BLOCKED",
    "",
    ...(blocked.length > 0
      ? blocked.map((row) => `- ${row.name}: actions=${row.actionCount}, listening_records=${row.recordCount}, places_mentioned=${row.placeCount}, normalized_places=${row.normalizedCount}`)
      : ["- Nenhum territorio bloqueado."]),
    "",
    "## Regra",
    "",
    "- SAFE_TO_REMOVE apenas quando nao houver qualquer vinculo.",
    "- BLOCKED quando houver vinculo em actions, listening_records, places_mentioned ou normalized_places.",
    ""
  ].join("\n");
}

void main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
