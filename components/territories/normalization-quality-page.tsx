"use client";

import { useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import Link from "next/link";
import { AlertTriangle, Clipboard, Filter, Link2, MapPinned, ShieldAlert } from "lucide-react";
import { InternalMapReadinessPanel } from "@/components/territories/internal-map-readiness-panel";
import { MapGoNoGoPanel } from "@/components/territories/map-go-no-go-panel";
import type { Neighborhood, NormalizedPlace, NormalizedPlaceVisibility, PlaceMentioned } from "@/lib/database.types";
import {
  buildNormalizedPlacesQuality,
  buildNormalizedPlacesQualityReport,
  type NormalizedPlaceDuplicate,
  type NormalizedPlacesQualitySummary
} from "@/lib/normalized-places-quality";
import { buildTerritorialQualityByNeighborhood } from "@/lib/territorial-quality";
import type { TerritorialReviewRecord } from "@/lib/territorial-review";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";

type PlaceMentionForQuality = Pick<PlaceMentioned, "id" | "normalized_place_id" | "place_type">;

type Filters = {
  neighborhoodId: string;
  visibility: string;
  placeType: string;
  issue: string;
};

const initialFilters: Filters = {
  neighborhoodId: "",
  visibility: "",
  placeType: "",
  issue: ""
};

export function NormalizationQualityPage() {
  const supabase = useMemo(() => createBrowserSupabaseClient(), []);
  const [normalizedPlaces, setNormalizedPlaces] = useState<NormalizedPlace[]>([]);
  const [placesMentioned, setPlacesMentioned] = useState<PlaceMentionForQuality[]>([]);
  const [records, setRecords] = useState<TerritorialReviewRecord[]>([]);
  const [neighborhoods, setNeighborhoods] = useState<Neighborhood[]>([]);
  const [filters, setFilters] = useState<Filters>(initialFilters);
  const [loading, setLoading] = useState(true);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let ignore = false;

    async function load() {
      if (!supabase) {
        setError("Configure NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_ANON_KEY para ver qualidade da normalização.");
        setLoading(false);
        return;
      }

      const [normalizedResult, placesResult, recordsResult, neighborhoodsResult] = await Promise.all([
        supabase.from("normalized_places").select("*").order("normalized_name", { ascending: true }),
        supabase.from("places_mentioned").select("id, normalized_place_id, place_type"),
        supabase
          .from("listening_records")
          .select("*, listening_record_themes(themes:theme_id(id, name)), places_mentioned(id, place_name, place_type, notes, neighborhood_id, normalized_place_id, normalized_places:normalized_place_id(id, normalized_name, visibility, place_type))"),
        supabase.from("neighborhoods").select("*").order("name", { ascending: true })
      ]);

      if (ignore) return;

      if (normalizedResult.error || placesResult.error || recordsResult.error || neighborhoodsResult.error) {
        setError(normalizedResult.error?.message ?? placesResult.error?.message ?? recordsResult.error?.message ?? neighborhoodsResult.error?.message ?? "Erro ao carregar qualidade da normalização.");
        setLoading(false);
        return;
      }

      setNormalizedPlaces((normalizedResult.data ?? []) as NormalizedPlace[]);
      setPlacesMentioned((placesResult.data ?? []) as PlaceMentionForQuality[]);
      setRecords((recordsResult.data ?? []) as TerritorialReviewRecord[]);
      setNeighborhoods(neighborhoodsResult.data ?? []);
      setLoading(false);
    }

    void load();
    return () => {
      ignore = true;
    };
  }, [supabase]);

  if (loading) return <StateBox>Carregando qualidade da normalização...</StateBox>;
  if (error) return <StateBox tone="error">{error}</StateBox>;

  const territoryQuality = buildTerritorialQualityByNeighborhood(neighborhoods, records);
  const summary = buildNormalizedPlacesQuality({ normalizedPlaces, placesMentioned, neighborhoods, territoryQuality });
  const report = buildNormalizedPlacesQualityReport({ summary, territoryQuality, neighborhoods });
  const duplicateIds = new Set(summary.possibleDuplicates.flatMap((item) => item.places.map((place) => place.id)));
  const mentionCount = new Map<string, number>();
  placesMentioned.forEach((place) => {
    if (!place.normalized_place_id) return;
    mentionCount.set(place.normalized_place_id, (mentionCount.get(place.normalized_place_id) ?? 0) + 1);
  });

  const filteredPlaces = normalizedPlaces.filter((place) => {
    if (filters.neighborhoodId && place.neighborhood_id !== filters.neighborhoodId) return false;
    if (filters.visibility && place.visibility !== filters.visibility) return false;
    if (filters.placeType && place.place_type !== filters.placeType) return false;
    if (filters.issue === "duplicate" && !duplicateIds.has(place.id)) return false;
    if (filters.issue === "sensitive" && place.visibility !== "sensitive") return false;
    if (filters.issue === "without_mentions" && (mentionCount.get(place.id) ?? 0) > 0) return false;
    return true;
  });

  const territoryCount = new Set(records.map((record) => record.neighborhood_id).filter(Boolean)).size;

  function updateFilter<TField extends keyof Filters>(field: TField, value: Filters[TField]) {
    setFilters((current) => ({ ...current, [field]: value }));
  }

  return (
    <section className="pb-10">
      <div className="rounded-[2rem] border border-white/80 bg-white/78 p-6 shadow-soft">
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-semear-earth">Territórios</p>
        <h2 className="mt-3 text-4xl font-semibold tracking-tight text-semear-green">Qualidade da normalização</h2>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-stone-600">
          Painel interno para detectar duplicidades, ambiguidade, lugares sensíveis e pendências antes de autorizar desenho técnico do mapa interno.
        </p>
        <div className="mt-5 flex flex-wrap gap-3">
          <button className="inline-flex min-h-11 items-center gap-2 rounded-full bg-semear-green px-4 text-sm font-semibold text-white" onClick={() => void navigator.clipboard.writeText(report).then(() => setFeedback("Relatório de normalização copiado."))} type="button">
            <Clipboard className="h-4 w-4" aria-hidden="true" />
            Copiar relatório de normalização
          </button>
          <Link className="inline-flex min-h-11 items-center rounded-full border border-semear-green/15 bg-white px-4 text-sm font-semibold text-semear-green" href="/territorios/lugares">
            Editar normalização
          </Link>
        </div>
        {feedback ? <p className="mt-3 text-sm font-semibold text-semear-green">{feedback}</p> : null}
      </div>

      <div className="mt-5">
        <InternalMapReadinessPanel neighborhoods={neighborhoods} records={records} territoryCount={territoryCount} normalizedQuality={summary} />
      </div>

      <div className="mt-5">
        <MapGoNoGoPanel neighborhoods={neighborhoods} records={records} normalizedQuality={summary} />
      </div>

      <SummaryGrid summary={summary} />

      <div className="mt-5 rounded-[1.5rem] border border-white/80 bg-white p-4 shadow-soft">
        <div className="mb-4 flex items-center gap-2 text-sm font-semibold text-semear-green">
          <Filter className="h-4 w-4" aria-hidden="true" />
          Filtros
        </div>
        <div className="grid gap-3 md:grid-cols-4">
          <Select label="Bairro" value={filters.neighborhoodId} onChange={(value) => updateFilter("neighborhoodId", value)}>
            <option value="">Todos</option>
            {neighborhoods.map((neighborhood) => <option key={neighborhood.id} value={neighborhood.id}>{neighborhood.name}</option>)}
          </Select>
          <Select label="Visibilidade" value={filters.visibility} onChange={(value) => updateFilter("visibility", value)}>
            <option value="">Todas</option>
            <option value="internal">Interna</option>
            <option value="public_safe">Pública segura</option>
            <option value="sensitive">Sensível</option>
          </Select>
          <Select label="Tipo" value={filters.placeType} onChange={(value) => updateFilter("placeType", value)}>
            <option value="">Todos</option>
            {Array.from(new Set(normalizedPlaces.map((place) => place.place_type))).map((type) => <option key={type} value={type}>{type}</option>)}
          </Select>
          <Select label="Problema" value={filters.issue} onChange={(value) => updateFilter("issue", value)}>
            <option value="">Todos</option>
            <option value="duplicate">Com possível duplicidade</option>
            <option value="sensitive">Sensíveis</option>
            <option value="without_mentions">Sem menção</option>
          </Select>
        </div>
      </div>

      <div className="mt-5 grid gap-5 xl:grid-cols-[1fr_0.9fr]">
        <section className="rounded-[2rem] border border-white/80 bg-white p-5 shadow-soft">
          <h3 className="font-semibold text-semear-green">Alertas</h3>
          <div className="mt-4 space-y-3">
            <AlertList title="Possíveis duplicidades" items={summary.possibleDuplicates} neighborhoods={neighborhoods} />
            <AlertList title="Nomes ambíguos em bairros diferentes" items={summary.ambiguousNames} neighborhoods={neighborhoods} />
            <SimpleAlert title="Lugares sensíveis" count={summary.sensitivePlaces.length} danger />
            <SimpleAlert title="Lugares sem bairro" count={summary.withoutNeighborhood.length} />
            <SimpleAlert title="Lugares sensíveis usados em menções" count={summary.sensitivePlaces.filter((place) => (place.mention_count ?? 0) > 0).length} danger />
          </div>
        </section>

        <section className="rounded-[2rem] border border-white/80 bg-white p-5 shadow-soft">
          <h3 className="font-semibold text-semear-green">Lugares normalizados filtrados</h3>
          <div className="mt-4 space-y-3">
            {filteredPlaces.length === 0 ? <p className="text-sm text-stone-600">Nenhum lugar encontrado para os filtros atuais.</p> : null}
            {filteredPlaces.map((place) => (
              <article className="rounded-2xl border border-semear-gray bg-semear-offwhite p-4" key={place.id}>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex flex-wrap gap-2">
                      <Badge>{getNeighborhoodName(place.neighborhood_id, neighborhoods)}</Badge>
                      <Badge>{place.place_type}</Badge>
                      <VisibilityBadge visibility={place.visibility} />
                    </div>
                    <h4 className="mt-3 font-semibold text-semear-green">{place.normalized_name}</h4>
                    <p className="mt-1 text-sm text-stone-600">{mentionCount.get(place.id) ?? 0} menção(ões). {duplicateIds.has(place.id) ? "Possível duplicidade." : "Sem duplicidade provável."}</p>
                  </div>
                  {place.visibility === "sensitive" ? <ShieldAlert className="h-5 w-5 text-red-800" aria-hidden="true" /> : <MapPinned className="h-5 w-5 text-semear-green" aria-hidden="true" />}
                </div>
              </article>
            ))}
          </div>
        </section>
      </div>
    </section>
  );
}

function SummaryGrid({ summary }: { summary: NormalizedPlacesQualitySummary }) {
  return (
    <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <Metric label="Normalizados" value={summary.total} />
      <Metric label="Internos" value={summary.internal} />
      <Metric label="Públicos seguros" value={summary.publicSafe} />
      <Metric label="Sensíveis" value={summary.sensitive} danger={summary.sensitive > 0} />
      <Metric label="Duplicidades" value={summary.possibleDuplicates.length} danger={summary.possibleDuplicates.length > 0} />
      <Metric label="Sem menção" value={summary.withoutMentions.length} danger={summary.withoutMentions.length > 0} />
      <Metric label="Muitas menções" value={summary.manyMentions.length} />
      <Metric label="Bairros com lugares" value={summary.neighborhoodsWithNormalizedPlaces} />
    </div>
  );
}

function AlertList({ title, items, neighborhoods }: { title: string; items: NormalizedPlaceDuplicate[]; neighborhoods: Neighborhood[] }) {
  return (
    <div className="rounded-2xl border border-semear-gray bg-semear-offwhite p-4">
      <p className="font-semibold text-semear-green">{title}</p>
      {items.length > 0 ? (
        <ul className="mt-3 space-y-2 text-sm leading-6 text-stone-700">
          {items.slice(0, 6).map((item) => (
            <li key={`${item.reason}-${item.label}`}><Link2 className="mr-1 inline h-3 w-3" aria-hidden="true" />{item.label}: {item.places.map((place) => `${place.normalized_name} (${getNeighborhoodName(place.neighborhood_id, neighborhoods)})`).join("; ")}</li>
          ))}
        </ul>
      ) : (
        <p className="mt-2 text-sm text-stone-600">Nenhum alerta.</p>
      )}
    </div>
  );
}

function SimpleAlert({ title, count, danger = false }: { title: string; count: number; danger?: boolean }) {
  return (
    <div className={`flex items-center justify-between gap-3 rounded-2xl border p-4 ${danger && count > 0 ? "border-red-200 bg-red-50 text-red-900" : "border-semear-gray bg-semear-offwhite text-stone-700"}`}>
      <span className="font-semibold">{title}</span>
      <span className="inline-flex items-center gap-1 rounded-full bg-white px-3 py-1 text-sm font-semibold">{danger && count > 0 ? <AlertTriangle className="h-3 w-3" aria-hidden="true" /> : null}{count}</span>
    </div>
  );
}

function Metric({ label, value, danger = false }: { label: string; value: number; danger?: boolean }) {
  return (
    <article className={`rounded-3xl border p-5 shadow-soft ${danger ? "border-red-200 bg-red-50" : "border-white/80 bg-white"}`}>
      <p className={`text-sm font-medium ${danger ? "text-red-800" : "text-stone-600"}`}>{label}</p>
      <strong className={`mt-2 block text-3xl font-semibold ${danger ? "text-red-900" : "text-semear-green"}`}>{value}</strong>
    </article>
  );
}

function Select({ label, value, onChange, children }: { label: string; value: string; onChange: (value: string) => void; children: ReactNode }) {
  return <label><span className="text-xs font-semibold uppercase tracking-[0.12em] text-stone-500">{label}</span><select className="mt-2 min-h-11 w-full rounded-2xl border border-semear-gray bg-white px-3 text-sm outline-none focus:border-semear-green" value={value} onChange={(event) => onChange(event.target.value)}>{children}</select></label>;
}

function Badge({ children }: { children: ReactNode }) {
  return <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-stone-700">{children}</span>;
}

function VisibilityBadge({ visibility }: { visibility: NormalizedPlaceVisibility }) {
  const classes = visibility === "sensitive" ? "bg-red-50 text-red-800" : visibility === "public_safe" ? "bg-green-50 text-green-800" : "bg-white text-stone-700";
  return <span className={`rounded-full px-3 py-1 text-xs font-semibold ${classes}`}>{visibility === "public_safe" ? "pública segura" : visibility === "sensitive" ? "sensível" : "interna"}</span>;
}

function StateBox({ children, tone = "neutral" }: { children: ReactNode; tone?: "neutral" | "error" }) {
  return <div className={`rounded-[1.5rem] p-5 text-sm shadow-soft ${tone === "error" ? "border border-red-200 bg-red-50 text-red-800" : "bg-white/72 text-stone-600"}`}>{children}</div>;
}

function getNeighborhoodName(id: string | null, neighborhoods: Neighborhood[]) {
  return neighborhoods.find((item) => item.id === id)?.name ?? "Sem bairro";
}
