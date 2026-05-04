"use client";

import { useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import Link from "next/link";
import { AlertTriangle, Filter, Link2, MapPinned, Plus } from "lucide-react";
import type { Action, ListeningRecord, Neighborhood, NormalizedPlace, NormalizedPlaceVisibility, PlaceMentioned } from "@/lib/database.types";
import { hasPossibleSensitiveData } from "@/lib/action-pilot";
import { isSensitivePlace, placeTypeOptions } from "@/lib/territorial-review";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";
import { formatNeighborhoodOption, sortNeighborhoodsBySectorAndName } from "@/lib/neighborhoods";

type RecordLite = Pick<ListeningRecord, "id" | "action_id" | "neighborhood_id" | "free_speech_text" | "team_summary" | "places_mentioned_text" | "territorial_review_status">;

type PlaceRow = PlaceMentioned & {
  neighborhoods: Pick<Neighborhood, "id" | "name"> | null;
  normalized_places: Pick<NormalizedPlace, "id" | "normalized_name" | "visibility" | "place_type"> | null;
};

type Filters = {
  mode: string;
  neighborhoodId: string;
  placeType: string;
  visibility: string;
  actionId: string;
};

const initialFilters: Filters = {
  mode: "unnormalized",
  neighborhoodId: "",
  placeType: "",
  visibility: "",
  actionId: ""
};

export function PlacesNormalizationPage() {
  const supabase = useMemo(() => createBrowserSupabaseClient(), []);
  const [places, setPlaces] = useState<PlaceRow[]>([]);
  const [records, setRecords] = useState<RecordLite[]>([]);
  const [actions, setActions] = useState<Action[]>([]);
  const [neighborhoods, setNeighborhoods] = useState<Neighborhood[]>([]);
  const [normalizedPlaces, setNormalizedPlaces] = useState<NormalizedPlace[]>([]);
  const [filters, setFilters] = useState<Filters>(initialFilters);
  const [selectedPlaceId, setSelectedPlaceId] = useState("");
  const [existingNormalizedPlaceId, setExistingNormalizedPlaceId] = useState("");
  const [normalizedName, setNormalizedName] = useState("");
  const [normalizedType, setNormalizedType] = useState("ponto_de_referencia");
  const [normalizedVisibility, setNormalizedVisibility] = useState<NormalizedPlaceVisibility>("internal");
  const [normalizedNotes, setNormalizedNotes] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    if (!supabase) {
      setError("Configure NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_ANON_KEY para normalizar lugares.");
      setLoading(false);
      return;
    }

    const [placesResult, recordsResult, actionsResult, neighborhoodsResult, normalizedResult] = await Promise.all([
      supabase
        .from("places_mentioned")
        .select("*, neighborhoods:neighborhood_id(id, name), normalized_places:normalized_place_id(id, normalized_name, visibility, place_type)")
        .order("created_at", { ascending: false }),
      supabase.from("listening_records").select("id, action_id, neighborhood_id, free_speech_text, team_summary, places_mentioned_text, territorial_review_status"),
      supabase.from("actions").select("*").order("action_date", { ascending: false }),
      supabase.from("neighborhoods").select("*").order("sector", { ascending: true }).order("name", { ascending: true }),
      supabase.from("normalized_places").select("*").order("normalized_name", { ascending: true })
    ]);

    if (placesResult.error || recordsResult.error || actionsResult.error || neighborhoodsResult.error || normalizedResult.error) {
      setError(placesResult.error?.message ?? recordsResult.error?.message ?? actionsResult.error?.message ?? neighborhoodsResult.error?.message ?? normalizedResult.error?.message ?? "Erro ao carregar lugares.");
      setLoading(false);
      return;
    }

    setPlaces((placesResult.data ?? []) as PlaceRow[]);
    setRecords((recordsResult.data ?? []) as RecordLite[]);
    setActions(actionsResult.data ?? []);
    setNeighborhoods(sortNeighborhoodsBySectorAndName(neighborhoodsResult.data ?? []));
    setNormalizedPlaces((normalizedResult.data ?? []) as NormalizedPlace[]);
    setLoading(false);
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [supabase]);

  const recordById = new Map(records.map((record) => [record.id, record]));
  const actionById = new Map(actions.map((action) => [action.id, action]));

  const filteredPlaces = places.filter((place) => {
    const record = recordById.get(place.listening_record_id);
    const normalized = place.normalized_places;
    if (filters.mode === "unnormalized" && place.normalized_place_id) return false;
    if (filters.mode === "sensitive" && !isSensitivePlace(place) && normalized?.visibility !== "sensitive") return false;
    if (filters.neighborhoodId && place.neighborhood_id !== filters.neighborhoodId) return false;
    if (filters.placeType && place.place_type !== filters.placeType) return false;
    if (filters.visibility && normalized?.visibility !== filters.visibility) return false;
    if (filters.actionId && record?.action_id !== filters.actionId) return false;
    return true;
  });

  const normalizedSummary = normalizedPlaces.map((normalized) => {
    const mentions = places.filter((place) => place.normalized_place_id === normalized.id);
    return {
      normalized,
      count: mentions.length,
      lastMention: mentions[0]?.created_at ?? null,
      neighborhoodName: neighborhoods.find((item) => item.id === normalized.neighborhood_id)?.name ?? "Sem bairro"
    };
  });

  function startNormalization(place: PlaceRow) {
    const linked = normalizedPlaces.find((item) => item.id === place.normalized_place_id);
    setSelectedPlaceId(place.id);
    setExistingNormalizedPlaceId(place.normalized_place_id ?? "");
    setNormalizedName(linked?.normalized_name ?? normalizePlaceName(place.place_name));
    setNormalizedType(linked?.place_type ?? place.place_type ?? "ponto_de_referencia");
    setNormalizedVisibility(linked?.visibility ?? (place.place_type === "sensivel_nao_publicar" ? "sensitive" : "internal"));
    setNormalizedNotes(linked?.notes ?? "");
  }

  async function linkExisting() {
    if (!supabase || !selectedPlaceId || !existingNormalizedPlaceId) return;
    setSaving(true);
    setError(null);
    const result = await supabase.from("places_mentioned").update({ normalized_place_id: existingNormalizedPlaceId }).eq("id", selectedPlaceId);
    setSaving(false);
    if (result.error) {
      setError(result.error.message);
      return;
    }
    setFeedback("Lugar vinculado a nome normalizado.");
    setSelectedPlaceId("");
    await load();
  }

  async function createAndLink() {
    if (!supabase || !selectedPlaceId) return;
    if (!normalizedName.trim()) {
      setError("Informe o nome normalizado.");
      return;
    }
    const selectedPlace = places.find((item) => item.id === selectedPlaceId);
    const user = (await supabase.auth.getUser()).data.user;
    if (!selectedPlace || !user) {
      setError("Entre no sistema antes de normalizar lugares.");
      return;
    }

    setSaving(true);
    setError(null);
    const created = await supabase
      .from("normalized_places")
      .insert({
        neighborhood_id: selectedPlace.neighborhood_id,
        normalized_name: normalizedName.trim(),
        place_type: normalizedType,
        visibility: normalizedVisibility,
        notes: normalizedNotes.trim() || null,
        created_by: user.id
      })
      .select("*")
      .single();

    if (created.error) {
      setSaving(false);
      setError(created.error.message);
      return;
    }

    const linked = await supabase.from("places_mentioned").update({ normalized_place_id: created.data.id }).eq("id", selectedPlaceId);
    setSaving(false);
    if (linked.error) {
      setError(linked.error.message);
      return;
    }
    setFeedback("Nome normalizado criado e vinculado.");
    setSelectedPlaceId("");
    await load();
  }

  function updateFilter<TField extends keyof Filters>(field: TField, value: Filters[TField]) {
    setFilters((current) => ({ ...current, [field]: value }));
  }

  if (loading) return <StateBox>Carregando normalização de lugares...</StateBox>;
  if (error) return <StateBox tone="error">{error}</StateBox>;

  const selectedPlace = places.find((place) => place.id === selectedPlaceId) ?? null;

  return (
    <section className="pb-10">
      <div className="rounded-[2rem] border border-white/80 bg-white/78 p-6 shadow-soft">
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-semear-earth">Territórios</p>
        <h2 className="mt-3 text-4xl font-semibold tracking-tight text-semear-green">Normalização de lugares</h2>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-stone-600">
          Padronize nomes como praça, equipamento público, área e bairro antes de qualquer mapa interno. Não geocodifique endereços nem publique referências sensíveis.
        </p>
      </div>

      <div className="mt-5 rounded-[1.5rem] border border-white/80 bg-white p-4 shadow-soft">
        <div className="mb-4 flex items-center gap-2 text-sm font-semibold text-semear-green">
          <Filter className="h-4 w-4" aria-hidden="true" />
          Filtros
        </div>
        <div className="grid gap-3 md:grid-cols-3 xl:grid-cols-6">
          <Select label="Lista" value={filters.mode} onChange={(value) => updateFilter("mode", value)}>
            <option value="">Todos</option>
            <option value="unnormalized">Não normalizados</option>
            <option value="sensitive">Sensíveis</option>
          </Select>
          <Select label="Bairro" value={filters.neighborhoodId} onChange={(value) => updateFilter("neighborhoodId", value)}>
            <option value="">Todos</option>
            {neighborhoods.map((neighborhood) => <option key={neighborhood.id} value={neighborhood.id}>{formatNeighborhoodOption(neighborhood)}</option>)}
          </Select>
          <Select label="Tipo" value={filters.placeType} onChange={(value) => updateFilter("placeType", value)}>
            <option value="">Todos</option>
            {placeTypeOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
          </Select>
          <Select label="Visibilidade" value={filters.visibility} onChange={(value) => updateFilter("visibility", value)}>
            <option value="">Todas</option>
            <option value="internal">Interna</option>
            <option value="public_safe">Pública segura</option>
            <option value="sensitive">Sensível</option>
          </Select>
          <Select label="Ação" value={filters.actionId} onChange={(value) => updateFilter("actionId", value)}>
            <option value="">Todas</option>
            {actions.map((action) => <option key={action.id} value={action.id}>{action.title}</option>)}
          </Select>
        </div>
      </div>

      {selectedPlace ? (
        <section className="mt-5 rounded-[2rem] border border-semear-green/15 bg-white p-5 shadow-soft">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.14em] text-semear-earth">Normalizar</p>
              <h3 className="mt-2 text-xl font-semibold text-semear-green">{selectedPlace.place_name}</h3>
            </div>
            <Link2 className="h-5 w-5 text-semear-green" aria-hidden="true" />
          </div>
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            <Select label="Vincular existente" value={existingNormalizedPlaceId} onChange={setExistingNormalizedPlaceId}>
              <option value="">Selecionar nome normalizado</option>
              {normalizedPlaces.map((place) => <option key={place.id} value={place.id}>{place.normalized_name} · {place.place_type} · {getVisibilityLabel(place.visibility)}</option>)}
            </Select>
            <div className="flex items-end">
              <button className="min-h-11 w-full rounded-full border border-semear-green/15 bg-white px-4 text-sm font-semibold text-semear-green disabled:opacity-60" disabled={saving || !existingNormalizedPlaceId} onClick={() => void linkExisting()} type="button">
                Vincular existente
              </button>
            </div>
            <Input label="Novo nome normalizado" value={normalizedName} onChange={setNormalizedName} />
            <Select label="Tipo" value={normalizedType} onChange={setNormalizedType}>
              {placeTypeOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
            </Select>
            <Select label="Visibilidade" value={normalizedVisibility} onChange={(value) => setNormalizedVisibility(value as NormalizedPlaceVisibility)}>
              <option value="internal">Interna</option>
              <option value="public_safe">Pública segura agregada</option>
              <option value="sensitive">Sensível/não publicar</option>
            </Select>
            <Input label="Nota" value={normalizedNotes} onChange={setNormalizedNotes} />
          </div>
          {(normalizedVisibility === "sensitive" || normalizedType === "sensivel_nao_publicar") ? (
            <p className="mt-3 rounded-2xl border border-red-200 bg-red-50 p-3 text-sm font-semibold text-red-800">Lugar sensível deve permanecer oculto em mapa, devolutiva pública e exportações comunitárias.</p>
          ) : null}
          <div className="mt-4 flex flex-wrap gap-3">
            <button className="inline-flex min-h-11 items-center gap-2 rounded-full bg-semear-green px-4 text-sm font-semibold text-white disabled:opacity-60" disabled={saving} onClick={() => void createAndLink()} type="button">
              <Plus className="h-4 w-4" aria-hidden="true" />
              Criar e vincular
            </button>
            <button className="min-h-11 rounded-full border border-semear-green/15 bg-white px-4 text-sm font-semibold text-semear-green" onClick={() => setSelectedPlaceId("")} type="button">
              Cancelar
            </button>
          </div>
        </section>
      ) : null}

      <div className="mt-5 grid gap-5 xl:grid-cols-[1.15fr_0.85fr]">
        <section className="rounded-[2rem] border border-white/80 bg-white p-5 shadow-soft">
          <h3 className="font-semibold text-semear-green">Lugares mencionados</h3>
          <div className="mt-4 space-y-3">
            {filteredPlaces.length === 0 ? <StateBox>Nenhum lugar encontrado para os filtros atuais.</StateBox> : null}
            {filteredPlaces.map((place) => {
              const record = recordById.get(place.listening_record_id);
              const action = record?.action_id ? actionById.get(record.action_id) : null;
              const sensitive = isSensitivePlace(place) || place.normalized_places?.visibility === "sensitive" || (record ? hasPossibleSensitiveData(record) : false);
              return (
                <article className="rounded-2xl border border-semear-gray bg-semear-offwhite p-4" key={place.id}>
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                    <div>
                      <div className="flex flex-wrap gap-2">
                        <Badge>{place.neighborhoods?.name ?? "Sem bairro"}</Badge>
                        <Badge>{place.place_type ?? "sem tipo"}</Badge>
                        {sensitive ? <DangerBadge /> : null}
                      </div>
                      <h4 className="mt-3 font-semibold text-semear-green">{place.place_name}</h4>
                      <p className="mt-1 text-sm text-stone-600">Normalizado: {place.normalized_places?.normalized_name ?? "não normalizado"}</p>
                      <p className="mt-1 text-sm text-stone-600">Ação: {action?.title ?? "não vinculada"} · Status territorial: {record?.territorial_review_status ?? "não informado"}</p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <button className="min-h-11 rounded-full bg-semear-green px-4 text-sm font-semibold text-white" onClick={() => startNormalization(place)} type="button">
                        Normalizar
                      </button>
                      <Link className="inline-flex min-h-11 items-center rounded-full border border-semear-green/15 bg-white px-4 text-sm font-semibold text-semear-green" href={`/escutas/${place.listening_record_id}`}>
                        Escuta
                      </Link>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        </section>

        <section className="rounded-[2rem] border border-white/80 bg-white p-5 shadow-soft">
          <h3 className="font-semibold text-semear-green">Lugares normalizados</h3>
          <div className="mt-4 space-y-3">
            {normalizedSummary.length === 0 ? <p className="text-sm text-stone-600">Nenhum nome normalizado cadastrado.</p> : null}
            {normalizedSummary.map((item) => (
              <article className="rounded-2xl border border-semear-gray bg-white p-4" key={item.normalized.id}>
                <div className="flex items-start gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-semear-green-soft text-semear-green">
                    <MapPinned className="h-4 w-4" aria-hidden="true" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-semear-green">{item.normalized.normalized_name}</h4>
                    <p className="mt-1 text-sm text-stone-600">{item.neighborhoodName} · {item.normalized.place_type} · {getVisibilityLabel(item.normalized.visibility)}</p>
                    <p className="mt-1 text-sm text-stone-600">{item.count} menção(ões) · última: {item.lastMention ? new Date(item.lastMention).toLocaleDateString("pt-BR") : "sem menção"}</p>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </section>
      </div>

      {feedback ? <p className="mt-4 text-sm font-semibold text-semear-green">{feedback}</p> : null}
    </section>
  );
}

function Input({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return <label><span className="text-sm font-semibold text-semear-green">{label}</span><input className="mt-2 min-h-11 w-full rounded-2xl border border-semear-gray bg-white px-3 text-sm outline-none focus:border-semear-green" value={value} onChange={(event) => onChange(event.target.value)} /></label>;
}

function Select({ label, value, onChange, children }: { label: string; value: string; onChange: (value: string) => void; children: ReactNode }) {
  return <label><span className="text-xs font-semibold uppercase tracking-[0.12em] text-stone-500">{label}</span><select className="mt-2 min-h-11 w-full rounded-2xl border border-semear-gray bg-white px-3 text-sm outline-none focus:border-semear-green" value={value} onChange={(event) => onChange(event.target.value)}>{children}</select></label>;
}

function Badge({ children }: { children: ReactNode }) {
  return <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-stone-700">{children}</span>;
}

function DangerBadge() {
  return <span className="inline-flex items-center gap-1 rounded-full bg-red-50 px-3 py-1 text-xs font-semibold text-red-800"><AlertTriangle className="h-3 w-3" />Sensível</span>;
}

function StateBox({ children, tone = "neutral" }: { children: ReactNode; tone?: "neutral" | "error" }) {
  return <div className={`rounded-[1.5rem] p-5 text-sm shadow-soft ${tone === "error" ? "border border-red-200 bg-red-50 text-red-800" : "bg-white/72 text-stone-600"}`}>{children}</div>;
}

function normalizePlaceName(value: string | null | undefined) {
  const normalized = (value ?? "").trim().replace(/\s+/g, " ");
  if (!normalized) return "";
  return normalized.charAt(0).toUpperCase() + normalized.slice(1);
}

function getVisibilityLabel(value: NormalizedPlaceVisibility) {
  if (value === "public_safe") return "pública segura";
  if (value === "sensitive") return "sensível";
  return "interna";
}
