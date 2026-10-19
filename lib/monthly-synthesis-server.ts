import { createHash } from "node:crypto";
import type { createSupabaseServerClient } from "./supabase/server";
import { buildMonthlySynthesis, type SynthesisBase } from "./monthly-synthesis";
type Client = Awaited<ReturnType<typeof createSupabaseServerClient>>;
export function synthesisHash(base: SynthesisBase) {
  return createHash("sha256").update(JSON.stringify(base)).digest("hex");
}
export async function loadSynthesisBase(
  client: Client,
  month: string,
  scope: string,
) {
  if (
    !/^\d{4}-(0[1-9]|1[0-2])$/.test(month) ||
    !(scope === "project" || /^[0-9a-f-]{36}$/i.test(scope))
  )
    throw new Error("Mês ou recorte inválido.");
  const start = `${month}-01`;
  const [year, m] = month.split("-").map(Number);
  const end = `${m === 12 ? year + 1 : year}-${String(m === 12 ? 1 : m + 1).padStart(2, "0")}-01`;
  let reportsQuery = client
    .from("weekly_team_reports")
    .select("*")
    .lt("week_start", end)
    .gte("week_end", start)
    .order("id");
  if (scope !== "project")
    reportsQuery = reportsQuery.eq("team_member_id", scope);
  const [r, i, a, records] = await Promise.all([
    reportsQuery,
    client
      .from("weekly_activity_items")
      .select("*")
      .gte("activity_date", start)
      .lt("activity_date", end)
      .order("id"),
    client
      .from("actions")
      .select("*")
      .gte("action_date", start)
      .lt("action_date", end)
      .order("id"),
    client
      .from("listening_records")
      .select("*")
      .gte("date", start)
      .lt("date", end)
      .eq("review_status", "reviewed")
      .order("id"),
  ]);
  for (const result of [r, i, a, records])
    if (result.error) throw new Error(result.error.message);
  if (
    [r.data, i.data, a.data, records.data].some(
      (rows) => (rows?.length ?? 0) >= 1000,
    )
  )
    throw new Error(
      "Recorte excede o limite seguro de consulta. A síntese não foi truncada.",
    );
  const relatedIds = Array.from(
    new Set(
      (i.data ?? []).flatMap((item) =>
        item.action_id &&
        !a.data?.some((action) => action.id === item.action_id)
          ? [item.action_id]
          : [],
      ),
    ),
  );
  const [p, w, n, related] = await Promise.all([
    i.data?.length
      ? client
          .from("weekly_activity_products")
          .select("*")
          .in(
            "item_id",
            i.data.map((x) => x.id),
          )
          .order("id")
      : Promise.resolve({ data: [], error: null }),
    a.data?.length
      ? client
          .from("workshop_records")
          .select("*")
          .in(
            "action_id",
            a.data.map((x) => x.id),
          )
          .eq("status", "approved")
          .order("id")
      : Promise.resolve({ data: [], error: null }),
    client.from("neighborhoods").select("id,name").order("id"),
    relatedIds.length
      ? client.from("actions").select("*").in("id", relatedIds).order("id")
      : Promise.resolve({ data: [], error: null }),
  ]);
  if (p.error || w.error || n.error || related.error)
    throw new Error((p.error ?? w.error ?? n.error ?? related.error)!.message);
  if ((p.data?.length ?? 0) >= 1000 || (w.data?.length ?? 0) >= 1000)
    throw new Error("Base de produtos ou oficinas excede o limite seguro.");
  return buildMonthlySynthesis({
    month,
    scope,
    reports: r.data ?? [],
    items: i.data ?? [],
    products: p.data ?? [],
    actions: [...(a.data ?? []), ...(related.data ?? [])],
    workshops: w.data ?? [],
    records: records.data ?? [],
    neighborhoods: n.data ?? [],
  });
}
