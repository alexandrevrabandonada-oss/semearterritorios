"use client";

import { useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import Link from "next/link";
import { Clipboard, MapPinned, ShieldAlert } from "lucide-react";
import { InternalMapReadinessPanel } from "@/components/territories/internal-map-readiness-panel";
import { MapGoNoGoPanel } from "@/components/territories/map-go-no-go-panel";
import type { Neighborhood } from "@/lib/database.types";
import { buildTerritorialQualityByNeighborhood, buildTerritorialQualityReport, type TerritoryQuality } from "@/lib/territorial-quality";
import type { TerritorialReviewRecord } from "@/lib/territorial-review";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";

export function TerritorialQualityPage() {
  const supabase = useMemo(() => createBrowserSupabaseClient(), []);
  const [records, setRecords] = useState<TerritorialReviewRecord[]>([]);
  const [neighborhoods, setNeighborhoods] = useState<Neighborhood[]>([]);
  const [loading, setLoading] = useState(true);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let ignore = false;

    async function load() {
      if (!supabase) {
        setError("Configure NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_ANON_KEY para ver qualidade territorial.");
        setLoading(false);
        return;
      }

      const [recordsResult, neighborhoodsResult] = await Promise.all([
        supabase
          .from("listening_records")
          .select("*, listening_record_themes(themes:theme_id(id, name)), places_mentioned(id, place_name, place_type, notes, neighborhood_id, normalized_place_id, normalized_places:normalized_place_id(id, normalized_name, visibility, place_type))"),
        supabase.from("neighborhoods").select("*").order("name", { ascending: true })
      ]);

      if (ignore) return;

      if (recordsResult.error || neighborhoodsResult.error) {
        setError(recordsResult.error?.message ?? neighborhoodsResult.error?.message ?? "Erro ao carregar qualidade territorial.");
        setLoading(false);
        return;
      }

      setRecords((recordsResult.data ?? []) as TerritorialReviewRecord[]);
      setNeighborhoods(neighborhoodsResult.data ?? []);
      setLoading(false);
    }

    void load();
    return () => {
      ignore = true;
    };
  }, [supabase]);

  if (loading) return <StateBox>Carregando qualidade territorial...</StateBox>;
  if (error) return <StateBox tone="error">{error}</StateBox>;

  const quality = buildTerritorialQualityByNeighborhood(neighborhoods, records);
  const report = buildTerritorialQualityReport(quality);
  const ready = quality.filter((item) => item.recommendation === "bom para mapa interno").length;
  const blocked = quality.filter((item) => item.recommendation === "bloqueado por sensível").length;
  const territoryCount = new Set(records.map((record) => record.neighborhood_id).filter(Boolean)).size;

  return (
    <section className="pb-10">
      <div className="rounded-[2rem] border border-white/80 bg-white/78 p-6 shadow-soft">
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-semear-earth">Territórios</p>
        <h2 className="mt-3 text-4xl font-semibold tracking-tight text-semear-green">Qualidade territorial dos dados</h2>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-stone-600">
          Relatório interno por bairro para decidir se a base está pronta para um futuro mapa autenticado. Lugares sensíveis permanecem fora de qualquer material público.
        </p>
        <div className="mt-5 flex flex-wrap gap-3">
          <button className="inline-flex min-h-11 items-center gap-2 rounded-full bg-semear-green px-4 text-sm font-semibold text-white" onClick={() => void navigator.clipboard.writeText(report).then(() => setFeedback("Relatório territorial copiado."))} type="button">
            <Clipboard className="h-4 w-4" aria-hidden="true" />
            Copiar relatório territorial
          </button>
          <Link className="inline-flex min-h-11 items-center rounded-full border border-semear-green/15 bg-white px-4 text-sm font-semibold text-semear-green" href="/territorios/lugares">
            Normalizar lugares
          </Link>
          <Link className="inline-flex min-h-11 items-center rounded-full border border-semear-green/15 bg-white px-4 text-sm font-semibold text-semear-green" href="/territorios/normalizacao/qualidade">
            Qualidade da normalização
          </Link>
        </div>
        {feedback ? <p className="mt-3 text-sm font-semibold text-semear-green">{feedback}</p> : null}
      </div>

      <div className="mt-5">
        <InternalMapReadinessPanel neighborhoods={neighborhoods} records={records} territoryCount={territoryCount} />
      </div>

      <div className="mt-5">
        <MapGoNoGoPanel neighborhoods={neighborhoods} records={records} />
      </div>

      <div className="mt-5 grid gap-4 sm:grid-cols-3">
        <Metric label="Territórios avaliados" value={quality.length} />
        <Metric label="Prontos para mapa interno" value={ready} />
        <Metric label="Bloqueados por sensível" value={blocked} danger={blocked > 0} />
      </div>

      <div className="mt-5 grid gap-4 lg:grid-cols-2">
        {quality.length === 0 ? <StateBox>Nenhum bairro cadastrado para avaliar.</StateBox> : null}
        {quality.map((item) => <TerritoryCard item={item} key={item.neighborhoodId} />)}
      </div>
    </section>
  );
}

function TerritoryCard({ item }: { item: TerritoryQuality }) {
  const danger = item.recommendation === "bloqueado por sensível";
  const ready = item.recommendation === "bom para mapa interno";

  return (
    <article className={`rounded-[2rem] border p-5 shadow-soft ${danger ? "border-red-200 bg-red-50" : ready ? "border-semear-green/20 bg-[#edf6df]" : "border-white/80 bg-white"}`}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-semear-earth">Bairro/Território</p>
          <h3 className="mt-2 text-2xl font-semibold text-semear-green">{item.neighborhoodName}</h3>
        </div>
        <div className={`flex h-11 w-11 items-center justify-center rounded-2xl ${danger ? "bg-red-100 text-red-800" : "bg-semear-green-soft text-semear-green"}`}>
          {danger ? <ShieldAlert className="h-5 w-5" aria-hidden="true" /> : <MapPinned className="h-5 w-5" aria-hidden="true" />}
        </div>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-3">
        <SmallMetric label="Escutas" value={item.totalRecords} />
        <SmallMetric label="Revisadas" value={`${item.reviewPercent}%`} />
        <SmallMetric label="Rev. territorial" value={`${item.territorialReviewPercent}%`} />
        <SmallMetric label="Lugares" value={item.totalPlaces} />
        <SmallMetric label="Normalizados" value={item.normalizedPlaces} />
        <SmallMetric label="Sensíveis" value={item.sensitivePlaces} danger={item.sensitivePlaces > 0} />
      </div>

      <div className="mt-4 rounded-2xl bg-white/70 p-4">
        <p className="text-sm font-semibold text-semear-green">Recomendação</p>
        <p className="mt-2 text-sm leading-6 text-stone-700">{item.recommendation}</p>
        <p className="mt-2 text-xs font-semibold uppercase tracking-[0.12em] text-stone-500">Qualidade territorial: {item.qualityPercent}%</p>
      </div>
    </article>
  );
}

function Metric({ label, value, danger = false }: { label: string; value: number; danger?: boolean }) {
  return (
    <article className={`rounded-3xl border p-5 shadow-soft ${danger ? "border-red-200 bg-red-50" : "border-white/80 bg-white"}`}>
      <p className={`text-sm font-medium ${danger ? "text-red-800" : "text-stone-600"}`}>{label}</p>
      <strong className={`mt-2 block text-4xl font-semibold ${danger ? "text-red-900" : "text-semear-green"}`}>{value}</strong>
    </article>
  );
}

function SmallMetric({ label, value, danger = false }: { label: string; value: number | string; danger?: boolean }) {
  return (
    <div className={`rounded-2xl p-3 ${danger ? "bg-red-100 text-red-900" : "bg-white/72 text-stone-700"}`}>
      <p className="text-xs font-semibold uppercase tracking-[0.12em]">{label}</p>
      <strong className="mt-1 block text-lg">{value}</strong>
    </div>
  );
}

function StateBox({ children, tone = "neutral" }: { children: ReactNode; tone?: "neutral" | "error" }) {
  return <div className={`rounded-[1.5rem] p-5 text-sm shadow-soft ${tone === "error" ? "border border-red-200 bg-red-50 text-red-800" : "bg-white/72 text-stone-600"}`}>{children}</div>;
}
