"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { CalendarDays, MapPinned, MessageSquareText, Plus, Search, SlidersHorizontal } from "lucide-react";
import type { Action, ListeningRecord, Neighborhood, ReviewStatus, Theme } from "@/lib/database.types";
import { getReviewStatusLabel, getSourceTypeLabel, reviewStatusOptions } from "@/lib/listening-records";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";
import { hasNoWordsUsed, hasPossibleSensitiveData, isVeryShortSpeech } from "@/lib/action-pilot";

type RecordWithRelations = ListeningRecord & {
  actions: Pick<Action, "id" | "title"> | null;
  neighborhoods: Pick<Neighborhood, "id" | "name"> | null;
  listening_record_themes: Array<{ themes: Pick<Theme, "id" | "name"> | null }>;
};

type Filters = {
  month: string;
  neighborhoodId: string;
  actionId: string;
  themeId: string;
  status: string;
  quality: string;
};

const initialFilters: Filters = { month: "", neighborhoodId: "", actionId: "", themeId: "", status: "", quality: "" };

export function ListeningRecordsList() {
  const supabase = useMemo(() => createBrowserSupabaseClient(), []);
  const [records, setRecords] = useState<RecordWithRelations[]>([]);
  const [actions, setActions] = useState<Action[]>([]);
  const [neighborhoods, setNeighborhoods] = useState<Neighborhood[]>([]);
  const [themes, setThemes] = useState<Theme[]>([]);
  const [filters, setFilters] = useState<Filters>(initialFilters);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let ignore = false;

    async function load() {
      if (!supabase) {
        setError("Configure NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_ANON_KEY para listar escutas.");
        setLoading(false);
        return;
      }

      const [recordsResult, actionsResult, neighborhoodsResult, themesResult] = await Promise.all([
        supabase
          .from("listening_records")
          .select("*, actions:action_id(id, title), neighborhoods:neighborhood_id(id, name), listening_record_themes(themes:theme_id(id, name))")
          .order("date", { ascending: false }),
        supabase.from("actions").select("*").order("action_date", { ascending: false }),
        supabase.from("neighborhoods").select("*").order("name", { ascending: true }),
        supabase.from("themes").select("*").eq("is_active", true).order("name", { ascending: true })
      ]);

      if (ignore) return;

      if (recordsResult.error || actionsResult.error || neighborhoodsResult.error || themesResult.error) {
        setError(recordsResult.error?.message ?? actionsResult.error?.message ?? neighborhoodsResult.error?.message ?? themesResult.error?.message ?? "Erro ao carregar escutas.");
        setLoading(false);
        return;
      }

      setRecords((recordsResult.data ?? []) as RecordWithRelations[]);
      setActions(actionsResult.data ?? []);
      setNeighborhoods(neighborhoodsResult.data ?? []);
      setThemes(themesResult.data ?? []);
      const params = new URLSearchParams(window.location.search);
      setFilters((current) => ({
        ...current,
        actionId: params.get("actionId") ?? current.actionId,
        status: params.get("status") ?? current.status
      }));
      setLoading(false);
    }

    void load();
    return () => {
      ignore = true;
    };
  }, [supabase]);

  const filteredRecords = records.filter((record) => {
    if (filters.month && record.date.slice(0, 7) !== filters.month) return false;
    if (filters.neighborhoodId && record.neighborhood_id !== filters.neighborhoodId) return false;
    if (filters.actionId && record.action_id !== filters.actionId) return false;
    if (filters.status && record.review_status !== filters.status) return false;
    if (filters.themeId && !record.listening_record_themes.some((item) => item.themes?.id === filters.themeId)) return false;
    if (filters.quality === "no_theme" && record.listening_record_themes.length > 0) return false;
    if (filters.quality === "no_summary" && record.team_summary?.trim()) return false;
    if (filters.quality === "no_priority" && record.priority_mentioned?.trim()) return false;
    if (filters.quality === "very_short" && !isVeryShortSpeech(record)) return false;
    if (filters.quality === "possible_sensitive" && !hasPossibleSensitiveData(record)) return false;
    if (filters.quality === "no_words_used" && !hasNoWordsUsed(record)) return false;
    
    return true;
  });

  function updateFilter<TField extends keyof Filters>(field: TField, value: Filters[TField]) {
    setFilters((current) => ({ ...current, [field]: value }));
  }

  return (
    <section className="pb-10">
      <div className="flex flex-col gap-4 rounded-[2rem] border border-white/80 bg-white/72 p-5 shadow-soft sm:p-7 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-semear-earth">Escutas</p>
          <h2 className="mt-3 text-3xl font-semibold tracking-tight text-semear-green">Fichas de escuta em papel</h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-stone-600">Digite a fala original e registre a codificação da equipe em campos separados.</p>
        </div>
        <div className="flex gap-2">
          <Link className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full border border-semear-green/15 bg-white px-5 text-sm font-semibold text-semear-green hover:bg-semear-green/5" href="/escutas/nova">
            <Plus className="h-4 w-4" aria-hidden="true" />
            Nova individual
          </Link>
          <Link className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-semear-green px-5 text-sm font-semibold text-white" href="/escutas/lote">
            <Plus className="h-4 w-4" aria-hidden="true" />
            Modo Lote (Banca)
          </Link>
          <Link className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full border border-semear-green/15 bg-white px-5 text-sm font-semibold text-semear-green hover:bg-semear-green/5" href="/escutas/revisao-territorial">
            <MapPinned className="h-4 w-4" aria-hidden="true" />
            Revisão territorial
          </Link>
        </div>
      </div>

      <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-3xl border border-white/80 bg-white p-5 shadow-soft">
          <p className="text-sm font-medium text-stone-600">Total filtradas</p>
          <strong className="mt-2 block text-3xl font-semibold text-semear-green">{filteredRecords.length}</strong>
        </div>
        <div className="rounded-3xl border border-white/80 bg-white p-5 shadow-soft">
          <p className="text-sm font-medium text-stone-600">Rascunhos</p>
          <strong className="mt-2 block text-3xl font-semibold text-semear-earth">{filteredRecords.filter(r => r.review_status === 'draft').length}</strong>
        </div>
        <div className="rounded-3xl border border-white/80 bg-white p-5 shadow-soft">
          <p className="text-sm font-medium text-stone-600">Revisadas</p>
          <strong className="mt-2 block text-3xl font-semibold text-semear-green">{filteredRecords.filter(r => r.review_status === 'reviewed').length}</strong>
        </div>
        <div className="rounded-3xl border border-red-100 bg-red-50 p-5 shadow-soft">
          <p className="text-sm font-medium text-red-800">Sem tema marcado</p>
          <strong className="mt-2 block text-3xl font-semibold text-red-800">{filteredRecords.filter(r => r.listening_record_themes.length === 0).length}</strong>
        </div>
      </div>

      <div className="mt-5 rounded-[1.5rem] border border-white/80 bg-white/72 p-4 shadow-soft">
        <div className="mb-4 flex items-center gap-2 text-sm font-semibold text-semear-green"><SlidersHorizontal className="h-4 w-4" aria-hidden="true" />Filtros</div>
        <div className="grid gap-3 md:grid-cols-5">
          <FilterInput label="Mês" type="month" value={filters.month} onChange={(value) => updateFilter("month", value)} />
          <FilterSelect label="Bairro" value={filters.neighborhoodId} onChange={(value) => updateFilter("neighborhoodId", value)}><option value="">Todos</option>{neighborhoods.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</FilterSelect>
          <FilterSelect label="Ação" value={filters.actionId} onChange={(value) => updateFilter("actionId", value)}><option value="">Todas</option>{actions.map((item) => <option key={item.id} value={item.id}>{item.title}</option>)}</FilterSelect>
          <FilterSelect label="Tema" value={filters.themeId} onChange={(value) => updateFilter("themeId", value)}><option value="">Todos</option>{themes.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</FilterSelect>
          <FilterSelect label="Status" value={filters.status} onChange={(value) => updateFilter("status", value)}><option value="">Todos</option>{reviewStatusOptions.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</FilterSelect>
          <FilterSelect label="Qualidade" value={filters.quality} onChange={(value) => updateFilter("quality", value)}>
            <option value="">Todas</option>
            <option value="no_theme">Sem tema marcado</option>
            <option value="no_summary">Sem resumo da equipe</option>
            <option value="no_priority">Sem prioridade apontada</option>
            <option value="very_short">Fala muito curta</option>
            <option value="possible_sensitive">Possível dado sensível</option>
            <option value="no_words_used">Sem palavras usadas</option>
          </FilterSelect>
        </div>
      </div>

      {loading ? <div className="mt-5 rounded-[1.5rem] bg-white/72 p-6 text-sm font-medium text-stone-600 shadow-soft">Carregando escutas...</div> : null}
      {error ? <div className="mt-5 rounded-[1.5rem] border border-red-200 bg-red-50 p-6 text-sm text-red-800">{error}</div> : null}
      {!loading && !error && filteredRecords.length === 0 ? (
        <div className="mt-5 rounded-[1.5rem] border border-dashed border-semear-green/25 bg-semear-offwhite p-8 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-white text-semear-earth"><Search className="h-6 w-6" aria-hidden="true" /></div>
          <h3 className="mt-4 text-lg font-semibold text-semear-green">Nenhuma escuta encontrada</h3>
          <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-stone-600">Cadastre a primeira ficha ou ajuste os filtros.</p>
        </div>
      ) : null}

      <div className="mt-5 grid gap-4 lg:grid-cols-2">
        {filteredRecords.map((record) => (
          <Link className="rounded-3xl border border-white/80 bg-white p-5 shadow-soft transition hover:-translate-y-0.5 hover:border-semear-green/25" href={`/escutas/${record.id}`} key={record.id}>
            <div className="flex flex-wrap gap-2">
              <span className="rounded-full bg-semear-green-soft px-3 py-1 text-xs font-semibold text-semear-green">{getSourceTypeLabel(record.source_type)}</span>
              <span className="rounded-full bg-semear-yellow/35 px-3 py-1 text-xs font-semibold text-semear-green">{getReviewStatusLabel(record.review_status)}</span>
            </div>
            <p className="mt-4 line-clamp-3 text-base font-semibold leading-7 text-semear-green">{record.free_speech_text}</p>
            <div className="mt-4 flex flex-wrap gap-3 text-sm text-stone-600">
              <span className="inline-flex items-center gap-2"><CalendarDays className="h-4 w-4" aria-hidden="true" />{new Date(`${record.date}T00:00:00`).toLocaleDateString("pt-BR")}</span>
              <span className="inline-flex items-center gap-2"><MessageSquareText className="h-4 w-4" aria-hidden="true" />{record.actions?.title ?? "Sem ação"}</span>
            </div>
            <div className="mt-4 flex flex-wrap gap-2">{record.listening_record_themes.slice(0, 4).map((item) => item.themes ? <span className="rounded-full bg-semear-offwhite px-3 py-1 text-xs font-semibold text-stone-600" key={item.themes.id}>{item.themes.name}</span> : null)}</div>
            <div className="mt-3 flex flex-wrap gap-2">
              {isVeryShortSpeech(record) ? <QualityBadge label="Fala muito curta" /> : null}
              {hasNoWordsUsed(record) ? <QualityBadge label="Sem palavras usadas" /> : null}
              {hasPossibleSensitiveData(record) ? <QualityBadge label="Possível dado sensível" danger /> : null}
              {record.listening_record_themes.length === 0 ? <QualityBadge label="Sem tema" /> : null}
              {record.review_status === "reviewed" && !record.team_summary?.trim() ? <QualityBadge label="Revisada sem resumo" danger /> : null}
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}

function QualityBadge({ label, danger = false }: { label: string; danger?: boolean }) {
  return (
    <span className={`rounded-full px-3 py-1 text-xs font-semibold ${danger ? "bg-red-50 text-red-800" : "bg-amber-50 text-amber-800"}`}>
      {label}
    </span>
  );
}

function FilterInput({ label, value, onChange, type }: { label: string; value: string; onChange: (value: string) => void; type: string }) {
  return <label><span className="text-xs font-semibold uppercase tracking-[0.12em] text-stone-500">{label}</span><input className="mt-2 min-h-11 w-full rounded-2xl border border-semear-gray bg-white px-3 text-sm outline-none focus:border-semear-green" onChange={(event) => onChange(event.target.value)} type={type} value={value} /></label>;
}

function FilterSelect({ label, value, onChange, children }: { label: string; value: string; onChange: (value: string) => void; children: React.ReactNode }) {
  return <label><span className="text-xs font-semibold uppercase tracking-[0.12em] text-stone-500">{label}</span><select className="mt-2 min-h-11 w-full rounded-2xl border border-semear-gray bg-white px-3 text-sm outline-none focus:border-semear-green" onChange={(event) => onChange(event.target.value)} value={value}>{children}</select></label>;
}
