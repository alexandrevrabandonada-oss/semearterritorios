import { beforeAll, afterAll, describe, it, expect } from "vitest";
import fs from "node:fs";
import { PGlite } from "@electric-sql/pglite";
import {
  buildFecTechnicalReport,
  type FecReportSources,
} from "@/lib/fec-technical-report";
import type { FecActivityRow, FecCycleRow } from "@/lib/fec-persistence.types";
import type { FecKnowledgeRow } from "@/lib/fec-knowledge";
let db: PGlite;
beforeAll(async () => {
  db = new PGlite();
  await db.exec("create schema private");
  const sql = fs
    .readFileSync(
      "supabase/migrations/20261019190720_fec_monthly_report_versions.sql",
      "utf8",
    )
    .match(/create function private\.fec_monthly_metrics\([\s\S]*?\$\$;/)?.[0];
  if (!sql) throw Error("Função de métricas não encontrada");
  await db.exec(sql);
}, 20000);
afterAll(async () => db?.close());
const cycle = {
  id: "c",
  owner_id: "u",
  engagement_id: "e",
  neighborhood_id: "n",
} as FecCycleRow;
const activity = (id: string, extra: Partial<FecActivityRow> = {}) =>
  ({
    id,
    cycle_id: "c",
    owner_id: "u",
    activity_date: "2026-10-19",
    activity_type: "cartography_workshop",
    objective: "O",
    methodology: "M",
    participation_kind: "estimated",
    participation_count: 12,
    status: "approved",
    ...extra,
  }) as FecActivityRow;
const record = (id: string, extra: Partial<FecKnowledgeRow> = {}) =>
  ({
    id,
    record_key: "map",
    cycle_id: "c",
    owner_id: "u",
    version: 1,
    kind: "map",
    title: "Mapa",
    content: {},
    source_activity_ids: ["a"],
    source_record_ids: [],
    reviewed_at: "2026-10-20T12:00:00Z",
    status: "approved",
    community_status: "not_requested",
    ...extra,
  }) as FecKnowledgeRow;
async function compare(
  activities: FecActivityRow[],
  records: FecKnowledgeRow[] = [],
) {
  const sources: FecReportSources = {
    cycles: [cycle],
    activities,
    records,
    files: [],
  };
  const js = buildFecTechnicalReport("2026-10", "e", "u", sources).metrics;
  const sql = (
    await db.query<{ metrics: unknown }>(
      "select private.fec_monthly_metrics($1::jsonb,$2::date) metrics",
      [JSON.stringify(sources), "2026-10-01"],
    )
  ).rows[0].metrics;
  expect(sql).toEqual(js);
  return js;
}
describe("indicadores persistidos no PostgreSQL correspondem às fontes do relatório", () => {
  it("contagem registrada, estimativa, ausência e preparação permanecem distintas", async () => {
    await compare([
      activity("a"),
      activity("b", {
        activity_type: "training",
        participation_kind: "recorded",
        participation_count: 7,
      }),
      activity("c", {
        participation_kind: "not_recorded",
        participation_count: null,
      }),
      activity("d", {
        activity_type: "preparation",
        participation_kind: "not_recorded",
        participation_count: null,
      }),
    ]);
  });
  it("contribuições de um evento não duplicam oficinas ou público", async () => {
    const r = await compare(
      [
        activity("a", { canonical_action_id: "shared" }),
        activity("b", { canonical_action_id: "shared" }),
      ],
      [record("map")],
    );
    expect(r.workshopCount).toBe(1);
    expect(r.estimatedParticipations).toBe(0);
  });
  it("mapa antigo revisado não é produto novo", async () => {
    const r = await compare(
      [activity("a")],
      [
        record("v1", { reviewed_at: "2026-09-20T12:00:00Z" }),
        record("v2", { version: 2 }),
      ],
    );
    expect(r.newMapCount).toBe(0);
    expect(r.mapRevisions).toBe(1);
  });
  it("várias versões aprovadas no mês contam um mapa e preservam revisões", async () => {
    const r = await compare(
      [activity("a")],
      [record("v1"), record("v2", { version: 2 })],
    );
    expect(r.newMapCount).toBe(1);
    expect(r.mapRevisions).toBe(2);
  });
  it("origem reaberta invalida mapa e achado dependente sem inventar entregas", async () => {
    const r = await compare(
      [activity("a", { status: "needs_changes" })],
      [
        record("m"),
        record("f", {
          kind: "finding",
          record_key: "finding",
          source_activity_ids: [],
          source_record_ids: ["m"],
        }),
      ],
    );
    expect(r.findings).toBe(0);
    expect(r.newMapCount).toBe(0);
  });
  it("produto revisado no mês pode ter atividade de origem no mês anterior", async () => {
    const r = await compare(
      [activity("a", { activity_date: "2026-09-20" })],
      [record("m")],
    );
    expect(r.activityCount).toBe(0);
    expect(r.newMapCount).toBe(1);
  });
  it("revisão na madrugada UTC respeita o mês no Brasil", async () => {
    const r = await compare(
      [activity("a")],
      [record("m", { reviewed_at: "2026-11-01T01:00:00Z" })],
    );
    expect(r.newMapCount).toBe(1);
  });
  it("ausência de registros mantém zero quantitativo e pessoas únicas não apuradas", async () => {
    const r = await compare([]);
    expect(r.activityCount).toBe(0);
    expect(r.uniquePeople).toBeNull();
  });
});
