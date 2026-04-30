"use client";

import { useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import Link from "next/link";
import { AlertTriangle, Filter, MapPinned } from "lucide-react";
import { TerritorialReviewPanel } from "@/components/listening-records/territorial-review-panel";
import { hasPossibleSensitiveData } from "@/lib/action-pilot";
import type { Action, Neighborhood } from "@/lib/database.types";
import {
  getTerritorialReviewStatusLabel,
  hasUnstructuredPlaces,
  type TerritorialReviewRecord
} from "@/lib/territorial-review";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";

type RecordWithRelations = TerritorialReviewRecord & {
  actions: Pick<Action, "id" | "title"> | null;
  neighborhoods: Pick<Neighborhood, "id" | "name"> | null;
};

type Filters = {
  status: string;
  quality: string;
  actionId: string;
  neighborhoodId: string;
};

const initialFilters: Filters = {
  status: "pending",
  quality: "",
  actionId: "",
  neighborhoodId: ""
};

export function TerritorialReviewQueue() {
  const supabase = useMemo(() => createBrowserSupabaseClient(), []);
  const [records, setRecords] = useState<RecordWithRelations[]>([]);
  const [actions, setActions] = useState<Action[]>([]);
  const [neighborhoods, setNeighborhoods] = useState<Neighborhood[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [filters, setFilters] = useState<Filters>(initialFilters);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    if (!supabase) {
      setError("Configure NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_ANON_KEY para revisar territórios.");
      setLoading(false);
      return;
    }

    const [recordsResult, actionsResult, neighborhoodsResult] = await Promise.all([
      supabase
        .from("listening_records")
        .select("*, actions:action_id(id, title), neighborhoods:neighborhood_id(id, name), listening_record_themes(themes:theme_id(id, name)), places_mentioned(id, place_name, place_type, notes, neighborhood_id, normalized_place_id, normalized_places:normalized_place_id(id, normalized_name, visibility, place_type))")
        .order("date", { ascending: false }),
      supabase.from("actions").select("*").order("action_date", { ascending: false }),
      supabase.from("neighborhoods").select("*").order("name", { ascending: true })
    ]);

    if (recordsResult.error || actionsResult.error || neighborhoodsResult.error) {
      setError(recordsResult.error?.message ?? actionsResult.error?.message ?? neighborhoodsResult.error?.message ?? "Erro ao carregar fila territorial.");
      setLoading(false);
      return;
    }

    setRecords((recordsResult.data ?? []) as RecordWithRelations[]);
    setActions(actionsResult.data ?? []);
    setNeighborhoods(neighborhoodsResult.data ?? []);
    setLoading(false);
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [supabase]);

  const filteredRecords = records.filter((record) => {
    if (filters.status && record.territorial_review_status !== filters.status) return false;
    if (filters.actionId && record.action_id !== filters.actionId) return false;
    if (filters.neighborhoodId && record.neighborhood_id !== filters.neighborhoodId) return false;
    if (filters.quality === "without_neighborhood" && record.neighborhood_id) return false;
    if (filters.quality === "free_text_places" && !record.places_mentioned_text?.trim()) return false;
    if (filters.quality === "unstructured_places" && !hasUnstructuredPlaces(record)) return false;
    if (filters.quality === "possible_sensitive" && !hasPossibleSensitiveData(record)) return false;
    return true;
  });

  function updateFilter<TField extends keyof Filters>(field: TField, value: Filters[TField]) {
    setFilters((current) => ({ ...current, [field]: value }));
  }

  return (
    <section className="pb-10">
      <div className="rounded-[2rem] border border-white/80 bg-white/78 p-6 shadow-soft">
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-semear-earth">Qualidade territorial</p>
        <h2 className="mt-3 text-4xl font-semibold tracking-tight text-semear-green">Revisão territorial das escutas</h2>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-stone-600">
          Padronize bairros e lugares mencionados antes de qualquer mapa interno. Endereço pessoal ou lugar sensível deve ser marcado como sensível/não publicar.
        </p>
      </div>

      <div className="mt-5 rounded-[1.5rem] border border-white/80 bg-white p-4 shadow-soft">
        <div className="mb-4 flex items-center gap-2 text-sm font-semibold text-semear-green">
          <Filter className="h-4 w-4" aria-hidden="true" />
          Filtros
        </div>
        <div className="grid gap-3 md:grid-cols-4">
          <Select label="Status" value={filters.status} onChange={(value) => updateFilter("status", value)}>
            <option value="">Todos</option>
            <option value="pending">Pendente</option>
            <option value="reviewed">Revisada</option>
            <option value="needs_attention">Precisa atenção</option>
          </Select>
          <Select label="Qualidade" value={filters.quality} onChange={(value) => updateFilter("quality", value)}>
            <option value="">Todas</option>
            <option value="without_neighborhood">Sem bairro</option>
            <option value="free_text_places">Com lugares em texto livre</option>
            <option value="unstructured_places">Texto livre sem estrutura</option>
            <option value="possible_sensitive">Possível dado sensível</option>
          </Select>
          <Select label="Ação" value={filters.actionId} onChange={(value) => updateFilter("actionId", value)}>
            <option value="">Todas</option>
            {actions.map((action) => <option key={action.id} value={action.id}>{action.title}</option>)}
          </Select>
          <Select label="Bairro" value={filters.neighborhoodId} onChange={(value) => updateFilter("neighborhoodId", value)}>
            <option value="">Todos</option>
            {neighborhoods.map((neighborhood) => <option key={neighborhood.id} value={neighborhood.id}>{neighborhood.name}</option>)}
          </Select>
        </div>
      </div>

      {loading ? <StateBox>Carregando fila territorial...</StateBox> : null}
      {error ? <StateBox tone="error">{error}</StateBox> : null}

      {!loading && !error ? (
        <div className="mt-5 space-y-4">
          {filteredRecords.length === 0 ? <StateBox>Nenhuma escuta encontrada para os filtros atuais.</StateBox> : null}
          {filteredRecords.map((record) => (
            <article className="rounded-[2rem] border border-white/80 bg-white p-5 shadow-soft" key={record.id}>
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <div className="flex flex-wrap gap-2">
                    <Badge>{getTerritorialReviewStatusLabel(record.territorial_review_status)}</Badge>
                    <Badge>{record.neighborhoods?.name ?? "Sem bairro"}</Badge>
                    {hasPossibleSensitiveData(record) ? <DangerBadge /> : null}
                  </div>
                  <p className="mt-3 line-clamp-2 text-sm leading-6 text-stone-700">{record.team_summary || record.free_speech_text}</p>
                  <p className="mt-2 text-sm text-stone-600">Lugares livres: {record.places_mentioned_text || "não informado"}</p>
                  <p className="mt-2 text-sm text-stone-600">
                    Estruturados: {record.places_mentioned.length > 0 ? record.places_mentioned.map((place) => `${place.place_name}${place.normalized_places ? ` → ${place.normalized_places.normalized_name}` : ""} (${place.place_type ?? "sem tipo"})`).join(", ") : "nenhum"}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Link className="inline-flex min-h-11 items-center rounded-full border border-semear-green/15 bg-white px-4 text-sm font-semibold text-semear-green" href={`/escutas/${record.id}`}>
                    Editar escuta
                  </Link>
                  <button className="inline-flex min-h-11 items-center gap-2 rounded-full bg-semear-green px-4 text-sm font-semibold text-white" onClick={() => setExpandedId((current) => current === record.id ? null : record.id)} type="button">
                    <MapPinned className="h-4 w-4" aria-hidden="true" />
                    Revisar território
                  </button>
                </div>
              </div>
              {expandedId === record.id ? (
                <div className="mt-5">
                  <TerritorialReviewPanel record={record} neighborhoods={neighborhoods} onSaved={() => void load()} />
                </div>
              ) : null}
            </article>
          ))}
        </div>
      ) : null}
    </section>
  );
}

function Select({ label, value, onChange, children }: { label: string; value: string; onChange: (value: string) => void; children: ReactNode }) {
  return <label><span className="text-xs font-semibold uppercase tracking-[0.12em] text-stone-500">{label}</span><select className="mt-2 min-h-11 w-full rounded-2xl border border-semear-gray bg-white px-3 text-sm outline-none focus:border-semear-green" value={value} onChange={(event) => onChange(event.target.value)}>{children}</select></label>;
}

function Badge({ children }: { children: ReactNode }) {
  return <span className="rounded-full bg-semear-offwhite px-3 py-1 text-xs font-semibold text-stone-700">{children}</span>;
}

function DangerBadge() {
  return <span className="inline-flex items-center gap-1 rounded-full bg-red-50 px-3 py-1 text-xs font-semibold text-red-800"><AlertTriangle className="h-3 w-3" />Possível dado sensível</span>;
}

function StateBox({ children, tone = "neutral" }: { children: ReactNode; tone?: "neutral" | "error" }) {
  return <div className={`mt-5 rounded-[1.5rem] p-6 text-sm shadow-soft ${tone === "error" ? "border border-red-200 bg-red-50 text-red-800" : "bg-white/72 text-stone-600"}`}>{children}</div>;
}
