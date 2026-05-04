"use client";

import { useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { AlertTriangle, Link2, MapPinned, Plus, Save } from "lucide-react";
import type { Neighborhood, NormalizedPlace, NormalizedPlaceVisibility, TerritorialReviewStatus } from "@/lib/database.types";
import {
  getTerritorialReviewStatusLabel,
  isSensitivePlace,
  placeTypeOptions,
  territorialReviewStatusOptions,
  type TerritorialReviewRecord
} from "@/lib/territorial-review";
import { hasPossibleSensitiveData } from "@/lib/action-pilot";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";
import { formatNeighborhoodOption } from "@/lib/neighborhoods";

type Props = {
  record: TerritorialReviewRecord;
  neighborhoods: Neighborhood[];
  onSaved?: () => void;
};

export function TerritorialReviewPanel({ record, neighborhoods, onSaved }: Props) {
  const supabase = useMemo(() => createBrowserSupabaseClient(), []);
  const [status, setStatus] = useState<TerritorialReviewStatus>(record.territorial_review_status);
  const [notes, setNotes] = useState(record.territorial_review_notes ?? "");
  const [placeName, setPlaceName] = useState("");
  const [placeType, setPlaceType] = useState("ponto_de_referencia");
  const [placeNeighborhoodId, setPlaceNeighborhoodId] = useState(record.neighborhood_id ?? "");
  const [placeNotes, setPlaceNotes] = useState("");
  const [normalizedPlaces, setNormalizedPlaces] = useState<NormalizedPlace[]>([]);
  const [selectedPlaceId, setSelectedPlaceId] = useState("");
  const [existingNormalizedPlaceId, setExistingNormalizedPlaceId] = useState("");
  const [normalizedName, setNormalizedName] = useState("");
  const [normalizedPlaceType, setNormalizedPlaceType] = useState("ponto_de_referencia");
  const [normalizedVisibility, setNormalizedVisibility] = useState<NormalizedPlaceVisibility>("internal");
  const [normalizedNotes, setNormalizedNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let ignore = false;

    async function loadNormalizedPlaces() {
      if (!supabase) return;
      const result = await supabase.from("normalized_places").select("*").order("normalized_name", { ascending: true });
      if (!ignore && !result.error) setNormalizedPlaces((result.data ?? []) as NormalizedPlace[]);
    }

    void loadNormalizedPlaces();
    return () => {
      ignore = true;
    };
  }, [supabase]);

  async function saveReview() {
    if (!supabase) return;
    setSaving(true);
    setError(null);
    const result = await supabase
      .from("listening_records")
      .update({
        territorial_review_status: status,
        territorial_review_notes: notes.trim() || null
      })
      .eq("id", record.id);
    setSaving(false);
    if (result.error) {
      setError(result.error.message);
      return;
    }
    setFeedback("Revisão territorial salva.");
    onSaved?.();
  }

  function startNormalizePlace(placeId: string) {
    const place = record.places_mentioned.find((item) => item.id === placeId);
    if (!place) return;
    const linked = normalizedPlaces.find((item) => item.id === place.normalized_place_id);
    setSelectedPlaceId(place.id);
    setExistingNormalizedPlaceId(place.normalized_place_id ?? "");
    setNormalizedName(linked?.normalized_name ?? normalizePlaceName(place.place_name));
    setNormalizedPlaceType(linked?.place_type ?? place.place_type ?? "ponto_de_referencia");
    setNormalizedVisibility(linked?.visibility ?? (place.place_type === "sensivel_nao_publicar" ? "sensitive" : "internal"));
    setNormalizedNotes(linked?.notes ?? "");
  }

  async function linkExistingNormalizedPlace() {
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
    onSaved?.();
  }

  async function createAndLinkNormalizedPlace() {
    if (!supabase || !selectedPlaceId) return;
    if (!normalizedName.trim()) {
      setError("Informe o nome normalizado.");
      return;
    }

    const selectedPlace = record.places_mentioned.find((item) => item.id === selectedPlaceId);
    const user = (await supabase.auth.getUser()).data.user;
    if (!user || !selectedPlace) {
      setError("Entre no sistema antes de criar nome normalizado.");
      return;
    }

    setSaving(true);
    setError(null);
    const created = await supabase
      .from("normalized_places")
      .insert({
        neighborhood_id: selectedPlace.neighborhood_id ?? record.neighborhood_id,
        normalized_name: normalizedName.trim(),
        place_type: normalizedPlaceType,
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

    const updated = await supabase.from("places_mentioned").update({ normalized_place_id: created.data.id }).eq("id", selectedPlaceId);
    setSaving(false);

    if (updated.error) {
      setError(updated.error.message);
      return;
    }

    setNormalizedPlaces((current) => [...current, created.data as NormalizedPlace].sort((a, b) => a.normalized_name.localeCompare(b.normalized_name, "pt-BR")));
    setFeedback("Nome normalizado criado e vinculado.");
    setSelectedPlaceId("");
    onSaved?.();
  }

  async function addPlace() {
    if (!supabase) return;
    if (!placeName.trim()) {
      setError("Informe o nome do lugar mencionado.");
      return;
    }

    const user = (await supabase.auth.getUser()).data.user;
    if (!user) {
      setError("Entre no sistema antes de adicionar lugar estruturado.");
      return;
    }

    setSaving(true);
    setError(null);
    const result = await supabase.from("places_mentioned").insert({
      listening_record_id: record.id,
      neighborhood_id: placeNeighborhoodId || record.neighborhood_id,
      place_name: placeName.trim(),
      place_type: placeType,
      notes: placeNotes.trim() || null,
      created_by: user.id
    });
    setSaving(false);

    if (result.error) {
      setError(result.error.message);
      return;
    }

    setPlaceName("");
    setPlaceNotes("");
    setFeedback("Lugar estruturado adicionado.");
    onSaved?.();
  }

  return (
    <section className="rounded-[2rem] border border-semear-green/15 bg-white p-5 shadow-soft">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-semear-earth">Revisão territorial</p>
          <h3 className="mt-2 text-xl font-semibold text-semear-green">{getTerritorialReviewStatusLabel(status)}</h3>
        </div>
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-semear-green-soft text-semear-green">
          <MapPinned className="h-5 w-5" aria-hidden="true" />
        </div>
      </div>

      {hasPossibleSensitiveData(record) ? (
        <p className="mt-4 flex gap-2 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-800">
          <AlertTriangle className="h-4 w-4 shrink-0" aria-hidden="true" />
          Há possível dado sensível nesta escuta. Não publicar nem usar em mapa até revisar.
        </p>
      ) : null}

      <div className="mt-5 rounded-2xl border border-semear-gray bg-semear-offwhite p-4">
        <p className="text-sm font-semibold text-semear-green">Texto livre de lugares</p>
        <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-stone-700">{record.places_mentioned_text || "Nenhum lugar em texto livre."}</p>
      </div>

      <div className="mt-5">
        <p className="text-sm font-semibold text-semear-green">Lugares estruturados</p>
        <div className="mt-3 flex flex-wrap gap-2">
          {record.places_mentioned.length > 0 ? record.places_mentioned.map((place) => (
            <button className={`rounded-full px-3 py-1 text-left text-xs font-semibold ${isSensitivePlace(place) || place.normalized_places?.visibility === "sensitive" ? "bg-red-50 text-red-800" : "bg-semear-offwhite text-stone-700"}`} key={place.id} onClick={() => startNormalizePlace(place.id)} type="button">
              {place.place_name} · {place.place_type ?? "sem tipo"}
              {place.normalized_places ? ` → ${place.normalized_places.normalized_name} (${getVisibilityLabel(place.normalized_places.visibility)})` : " · não normalizado"}
            </button>
          )) : <span className="text-sm text-stone-500">Nenhum lugar estruturado.</span>}
        </div>
      </div>

      <div className="mt-5 grid gap-4 md:grid-cols-2">
        <label>
          <span className="text-sm font-semibold text-semear-green">Status territorial</span>
          <select className="mt-2 min-h-11 w-full rounded-2xl border border-semear-gray bg-white px-3 text-sm outline-none focus:border-semear-green" value={status} onChange={(event) => setStatus(event.target.value as TerritorialReviewStatus)}>
            {territorialReviewStatusOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
          </select>
        </label>
        <label>
          <span className="text-sm font-semibold text-semear-green">Notas territoriais</span>
          <input className="mt-2 min-h-11 w-full rounded-2xl border border-semear-gray bg-white px-3 text-sm outline-none focus:border-semear-green" value={notes} onChange={(event) => setNotes(event.target.value)} />
        </label>
      </div>

      <div className="mt-5 rounded-[1.5rem] border border-dashed border-semear-green/25 bg-semear-offwhite p-4">
        <p className="font-semibold text-semear-green">Adicionar lugar estruturado</p>
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          <Input label="Lugar mencionado" value={placeName} onChange={setPlaceName} />
          <Select label="Tipo" value={placeType} onChange={setPlaceType}>
            {placeTypeOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
          </Select>
          <Select label="Bairro relacionado" value={placeNeighborhoodId} onChange={setPlaceNeighborhoodId}>
            <option value="">Usar bairro da escuta</option>
            {neighborhoods.map((neighborhood) => <option key={neighborhood.id} value={neighborhood.id}>{formatNeighborhoodOption(neighborhood)}</option>)}
          </Select>
          <Input label="Nota do lugar" value={placeNotes} onChange={setPlaceNotes} />
        </div>
        <p className="mt-3 text-xs font-semibold uppercase tracking-[0.12em] text-stone-500">
          Se parecer endereço pessoal ou identificar família/pessoa, use “sensível/não publicar”.
        </p>
      </div>

      {selectedPlaceId ? (
        <div className="mt-5 rounded-[1.5rem] border border-semear-green/15 bg-white p-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="font-semibold text-semear-green">Normalizar lugar selecionado</p>
              <p className="mt-1 text-sm leading-6 text-stone-600">Use um nome padrão para reduzir duplicidade entre revisores. Não geocodifique nem detalhe endereço pessoal.</p>
            </div>
            <Link2 className="h-5 w-5 text-semear-green" aria-hidden="true" />
          </div>

          <div className="mt-4 grid gap-3 md:grid-cols-2">
            <Select label="Vincular a nome existente" value={existingNormalizedPlaceId} onChange={setExistingNormalizedPlaceId}>
              <option value="">Selecionar nome normalizado</option>
              {normalizedPlaces.map((place) => (
                <option key={place.id} value={place.id}>{place.normalized_name} · {place.place_type} · {getVisibilityLabel(place.visibility)}</option>
              ))}
            </Select>
            <div className="flex items-end">
              <button className="min-h-11 w-full rounded-full border border-semear-green/15 bg-white px-4 text-sm font-semibold text-semear-green disabled:opacity-60" disabled={saving || !existingNormalizedPlaceId} onClick={() => void linkExistingNormalizedPlace()} type="button">
                Vincular existente
              </button>
            </div>
            <Input label="Novo nome normalizado" value={normalizedName} onChange={setNormalizedName} />
            <Select label="Tipo normalizado" value={normalizedPlaceType} onChange={setNormalizedPlaceType}>
              {placeTypeOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
            </Select>
            <Select label="Visibilidade" value={normalizedVisibility} onChange={(value) => setNormalizedVisibility(value as NormalizedPlaceVisibility)}>
              <option value="internal">Interna</option>
              <option value="public_safe">Segura para público agregado</option>
              <option value="sensitive">Sensível/não publicar</option>
            </Select>
            <Input label="Nota de normalização" value={normalizedNotes} onChange={setNormalizedNotes} />
          </div>
          {(normalizedVisibility === "sensitive" || normalizedPlaceType === "sensivel_nao_publicar") ? (
            <p className="mt-3 rounded-2xl border border-red-200 bg-red-50 p-3 text-sm font-semibold text-red-800">
              Este lugar ficará marcado como sensível. Não deve aparecer em devolutiva pública, mapa público ou exportação comunitária.
            </p>
          ) : null}
          <div className="mt-4 flex flex-wrap gap-3">
            <button className="min-h-11 rounded-full bg-semear-green px-4 text-sm font-semibold text-white disabled:opacity-60" disabled={saving} onClick={() => void createAndLinkNormalizedPlace()} type="button">
              Criar e vincular
            </button>
            <button className="min-h-11 rounded-full border border-semear-green/15 bg-white px-4 text-sm font-semibold text-semear-green" onClick={() => setSelectedPlaceId("")} type="button">
              Cancelar
            </button>
          </div>
        </div>
      ) : null}

      <div className="mt-5 flex flex-wrap gap-3">
        <button className="inline-flex min-h-11 items-center gap-2 rounded-full bg-semear-green px-4 text-sm font-semibold text-white disabled:opacity-60" disabled={saving} onClick={() => void saveReview()} type="button">
          <Save className="h-4 w-4" aria-hidden="true" />
          Salvar revisão territorial
        </button>
        <button className="inline-flex min-h-11 items-center gap-2 rounded-full border border-semear-green/15 bg-white px-4 text-sm font-semibold text-semear-green disabled:opacity-60" disabled={saving} onClick={() => void addPlace()} type="button">
          <Plus className="h-4 w-4" aria-hidden="true" />
          Adicionar lugar
        </button>
      </div>
      {feedback ? <p className="mt-3 text-sm font-semibold text-semear-green">{feedback}</p> : null}
      {error ? <p className="mt-3 rounded-2xl border border-red-200 bg-red-50 p-3 text-sm text-red-800">{error}</p> : null}
    </section>
  );
}

function Input({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return <label><span className="text-sm font-semibold text-semear-green">{label}</span><input className="mt-2 min-h-11 w-full rounded-2xl border border-semear-gray bg-white px-3 text-sm outline-none focus:border-semear-green" value={value} onChange={(event) => onChange(event.target.value)} /></label>;
}

function Select({ label, value, onChange, children }: { label: string; value: string; onChange: (value: string) => void; children: ReactNode }) {
  return <label><span className="text-sm font-semibold text-semear-green">{label}</span><select className="mt-2 min-h-11 w-full rounded-2xl border border-semear-gray bg-white px-3 text-sm outline-none focus:border-semear-green" value={value} onChange={(event) => onChange(event.target.value)}>{children}</select></label>;
}

function normalizePlaceName(value: string | null | undefined) {
  const normalized = (value ?? "").trim().replace(/\s+/g, " ");
  if (!normalized) return "";
  return normalized.charAt(0).toUpperCase() + normalized.slice(1);
}

function getVisibilityLabel(value: NormalizedPlaceVisibility) {
  if (value === "public_safe") return "público seguro";
  if (value === "sensitive") return "sensível";
  return "interno";
}
