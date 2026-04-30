"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeft, CheckCircle2, Edit3 } from "lucide-react";
import { ListeningRecordForm } from "@/components/listening-records/listening-record-form";
import { ListeningQualityChecklist } from "@/components/listening-records/listening-quality-checklist";
import { TerritorialReviewPanel } from "@/components/listening-records/territorial-review-panel";
import type { Action, ListeningRecord, Neighborhood, PlaceMentioned, NormalizedPlace, Theme } from "@/lib/database.types";
import { getReviewStatusLabel, getSourceTypeLabel } from "@/lib/listening-records";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";

type RecordWithRelations = ListeningRecord & {
  actions: Pick<Action, "id" | "title"> | null;
  neighborhoods: Pick<Neighborhood, "id" | "name"> | null;
  listening_record_themes: Array<{ themes: Pick<Theme, "id" | "name"> | null }>;
  places_mentioned: Array<Pick<PlaceMentioned, "id" | "place_name" | "place_type" | "notes" | "neighborhood_id" | "normalized_place_id"> & {
    normalized_places?: Pick<NormalizedPlace, "id" | "normalized_name" | "visibility" | "place_type"> | null;
  }>;
};

export function ListeningRecordDetail({ recordId }: { recordId: string }) {
  const supabase = useMemo(() => createBrowserSupabaseClient(), []);
  const [record, setRecord] = useState<RecordWithRelations | null>(null);
  const [neighborhoods, setNeighborhoods] = useState<Neighborhood[]>([]);
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    if (!supabase) {
      setError("Configure NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_ANON_KEY para ver escutas.");
      setLoading(false);
      return;
    }

    const [result, neighborhoodsResult] = await Promise.all([
      supabase
        .from("listening_records")
        .select("*, actions:action_id(id, title), neighborhoods:neighborhood_id(id, name), listening_record_themes(themes:theme_id(id, name)), places_mentioned(id, place_name, place_type, notes, neighborhood_id, normalized_place_id, normalized_places:normalized_place_id(id, normalized_name, visibility, place_type))")
        .eq("id", recordId)
        .single(),
      supabase.from("neighborhoods").select("*").order("name", { ascending: true })
    ]);

    if (result.error || neighborhoodsResult.error) {
      setError(result.error?.message ?? neighborhoodsResult.error?.message ?? "Erro ao carregar escuta.");
      setLoading(false);
      return;
    }

    setRecord(result.data as RecordWithRelations);
    setNeighborhoods(neighborhoodsResult.data ?? []);
    setLoading(false);
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [recordId, supabase]);

  async function markReviewed() {
    if (!supabase) return;
    setSaving(true);
    const result = await supabase.from("listening_records").update({ review_status: "reviewed" }).eq("id", recordId);
    setSaving(false);
    if (result.error) {
      setError(result.error.message);
      return;
    }
    await load();
  }

  if (editing) return <ListeningRecordForm mode="edit" recordId={recordId} />;
  if (loading) return <section className="rounded-[2rem] bg-white/72 p-8 shadow-soft">Carregando escuta...</section>;
  if (error || !record) return <section className="rounded-[2rem] border border-red-200 bg-red-50 p-8 text-sm text-red-800">{error ?? "Escuta não encontrada."}</section>;

  return (
    <section className="pb-10">
      <div className="mb-5 flex flex-wrap gap-3">
        <Link className="inline-flex min-h-11 items-center gap-2 rounded-full border border-semear-green/15 bg-white/70 px-4 text-sm font-semibold text-semear-green" href="/escutas"><ArrowLeft className="h-4 w-4" aria-hidden="true" />Voltar para escutas</Link>
        <button className="inline-flex min-h-11 items-center gap-2 rounded-full bg-semear-green px-4 text-sm font-semibold text-white" onClick={() => setEditing(true)} type="button"><Edit3 className="h-4 w-4" aria-hidden="true" />Editar escuta</button>
        {record.review_status !== "reviewed" ? (
          <button className="inline-flex min-h-11 items-center gap-2 rounded-full bg-semear-earth px-4 text-sm font-semibold text-white disabled:opacity-60" disabled={saving} onClick={markReviewed} type="button"><CheckCircle2 className="h-4 w-4" aria-hidden="true" />{saving ? "Marcando..." : "Marcar como revisada"}</button>
        ) : null}
      </div>

      <article className="rounded-[2rem] border border-white/80 bg-white/78 p-5 shadow-soft sm:p-8">
        <div className="flex flex-wrap gap-2">
          <span className="rounded-full bg-semear-green-soft px-3 py-1 text-xs font-semibold text-semear-green">{getSourceTypeLabel(record.source_type)}</span>
          <span className="rounded-full bg-semear-yellow/35 px-3 py-1 text-xs font-semibold text-semear-green">{getReviewStatusLabel(record.review_status)}</span>
          <span className="rounded-full bg-semear-offwhite px-3 py-1 text-xs font-semibold text-stone-600">{new Date(`${record.date}T00:00:00`).toLocaleDateString("pt-BR")}</span>
        </div>
        <h2 className="mt-5 text-3xl font-semibold tracking-tight text-semear-green">Escuta registrada</h2>

        <section className="mt-8 rounded-[1.5rem] border-2 border-semear-green/30 bg-semear-green-soft/70 p-5">
          <h3 className="text-sm font-bold uppercase tracking-[0.12em] text-semear-green">Fala original / síntese livre</h3>
          <p className="mt-4 whitespace-pre-wrap text-base leading-8 text-stone-800">{record.free_speech_text}</p>
        </section>

        <div className="mt-6 grid gap-4 lg:grid-cols-3">
          <Info title="Ação" value={record.actions?.title} />
          <Info title="Bairro/Território" value={record.neighborhoods?.name} />
          <Info title="Entrevistador" value={record.interviewer_name} />
          <Info title="Faixa etária aproximada" value={record.approximate_age_range} />
          <Info title="Palavras usadas" value={record.words_used} />
          <Info title="Lugares citados" value={record.places_mentioned_text} />
          <Info title="Prioridade apontada" value={record.priority_mentioned} />
          <Info title="Resumo da equipe" value={record.team_summary} />
          <Info title="Observações inesperadas" value={record.unexpected_notes} />
        </div>

        <section className="mt-6 rounded-[1.5rem] border border-dashed border-semear-green/25 bg-semear-offwhite p-5">
          <h3 className="font-semibold text-semear-green">Temas marcados pela equipe</h3>
          <div className="mt-3 flex flex-wrap gap-2">
            {record.listening_record_themes.length > 0 ? record.listening_record_themes.map((item) => item.themes ? <span className="rounded-full bg-white px-3 py-1 text-sm font-semibold text-semear-green" key={item.themes.id}>{item.themes.name}</span> : null) : <p className="text-sm text-stone-600">Nenhum tema marcado.</p>}
          </div>
        </section>

        <div className="mt-6">
          <ListeningQualityChecklist 
            record={{
              ...record,
              theme_count: record.listening_record_themes.length
            }} 
          />
        </div>

        <div className="mt-6">
          <TerritorialReviewPanel record={record} neighborhoods={neighborhoods} onSaved={() => void load()} />
        </div>
      </article>
    </section>
  );
}

function Info({ title, value }: { title: string; value?: string | null }) {
  return <section className="rounded-2xl border border-semear-gray bg-white p-4"><h3 className="text-xs font-semibold uppercase tracking-[0.12em] text-stone-500">{title}</h3><p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-stone-700">{value || "Não informado."}</p></section>;
}
