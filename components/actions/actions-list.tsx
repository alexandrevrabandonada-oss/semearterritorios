"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { CalendarDays, FileText, FolderCheck, Keyboard, MapPin, MessageSquareText, Plus, Search, SlidersHorizontal } from "lucide-react";
import type { Action, ActionClosure, ActionDebrief, ActionStatus, ActionType, ListeningRecord, Neighborhood } from "@/lib/database.types";
import {
  actionStatusOptions,
  actionTypeOptions,
  getActionStatusLabel,
  getActionTypeLabel,
  getMonthValue
} from "@/lib/actions";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";
import { formatNeighborhoodOption, getOfficialNeighborhoodsForSelect } from "@/lib/neighborhoods";

type ActionWithNeighborhood = Action & {
  neighborhoods: Pick<Neighborhood, "id" | "name" | "sector"> | null;
};

type ActionFilters = {
  month: string;
  neighborhoodId: string;
  actionType: string;
  status: string;
};

const initialFilters: ActionFilters = {
  month: "",
  neighborhoodId: "",
  actionType: "",
  status: ""
};

export function ActionsList() {
  const supabase = useMemo(() => createBrowserSupabaseClient(), []);
  const [actions, setActions] = useState<ActionWithNeighborhood[]>([]);
  const [neighborhoods, setNeighborhoods] = useState<Neighborhood[]>([]);
  const [records, setRecords] = useState<Pick<ListeningRecord, "action_id" | "review_status">[]>([]);
  const [debriefs, setDebriefs] = useState<ActionDebrief[]>([]);
  const [closures, setClosures] = useState<ActionClosure[]>([]);
  const [filters, setFilters] = useState<ActionFilters>(initialFilters);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let ignore = false;

    async function loadActions() {
      if (!supabase) {
        setError("Configure NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_ANON_KEY para listar ações.");
        setLoading(false);
        return;
      }

      setLoading(true);
      const [actionsResult, neighborhoodsResult, recordsResult, debriefsResult, closuresResult] = await Promise.all([
        supabase
          .from("actions")
          .select(
            "*, neighborhoods:neighborhood_id(id, name, sector)"
          )
          .order("action_date", { ascending: false }),
        supabase.from("neighborhoods").select("*").eq("status", "oficial").order("sector", { ascending: true }).order("name", { ascending: true }),
        supabase.from("listening_records").select("action_id, review_status"),
        supabase.from("action_debriefs").select("*"),
        supabase.from("action_closures").select("*")
      ]);

      if (ignore) {
        return;
      }

      if (actionsResult.error || recordsResult.error || debriefsResult.error || closuresResult.error) {
        setError(
          actionsResult.error?.message ??
            recordsResult.error?.message ??
            debriefsResult.error?.message ??
            closuresResult.error?.message ??
            "Erro ao carregar ações."
        );
        setLoading(false);
        return;
      }

      if (neighborhoodsResult.error) {
        setError(neighborhoodsResult.error.message);
        setLoading(false);
        return;
      }

      setActions((actionsResult.data ?? []) as ActionWithNeighborhood[]);
      setNeighborhoods(getOfficialNeighborhoodsForSelect(neighborhoodsResult.data ?? []));
      setRecords((recordsResult.data ?? []) as Pick<ListeningRecord, "action_id" | "review_status">[]);
      setDebriefs((debriefsResult.data ?? []) as ActionDebrief[]);
      setClosures((closuresResult.data ?? []) as ActionClosure[]);
      setLoading(false);
    }

    void loadActions();

    return () => {
      ignore = true;
    };
  }, [supabase]);

  const filteredActions = actions.filter((action) => {
    if (filters.month && getMonthValue(action.action_date) !== filters.month) {
      return false;
    }

    if (filters.neighborhoodId && action.neighborhood_id !== filters.neighborhoodId) {
      return false;
    }

    if (filters.actionType && action.action_type !== filters.actionType) {
      return false;
    }

    if (filters.status && action.status !== filters.status) {
      return false;
    }

    return true;
  });

  const actionMeta = new Map(
    filteredActions.map((action) => {
      const actionRecords = records.filter((record) => record.action_id === action.id);
      const reviewedCount = actionRecords.filter((record) => record.review_status === "reviewed").length;
      const draftCount = actionRecords.filter((record) => record.review_status === "draft").length;
      const debrief = debriefs.find((item) => item.action_id === action.id) ?? null;
      const closure = closures.find((item) => item.action_id === action.id) ?? null;
      return [
        action.id,
        {
          totalRecords: actionRecords.length,
          draftCount,
          reviewedCount,
          debriefStatus: debrief?.status ?? "pendente",
          closureStatus: closure?.status ?? "aberto"
        }
      ] as const;
    })
  );

  const filterFields = (
    <div className="grid gap-3 md:grid-cols-4">
      <label>
        <span className="text-xs font-semibold uppercase tracking-[0.12em] text-stone-500">
          Mês
        </span>
        <input
          className="mt-2 min-h-11 w-full rounded-2xl border border-semear-gray bg-white px-3 text-sm outline-none focus:border-semear-green"
          onChange={(event) => updateFilter("month", event.target.value)}
          type="month"
          value={filters.month}
        />
      </label>
      <label>
        <span className="text-xs font-semibold uppercase tracking-[0.12em] text-stone-500">
          Bairro
        </span>
        <select
          className="mt-2 min-h-11 w-full rounded-2xl border border-semear-gray bg-white px-3 text-sm outline-none focus:border-semear-green"
          onChange={(event) => updateFilter("neighborhoodId", event.target.value)}
          value={filters.neighborhoodId}
        >
          <option value="">Todos</option>
          {neighborhoods.map((neighborhood) => (
            <option key={neighborhood.id} value={neighborhood.id}>
              {formatNeighborhoodOption(neighborhood)}
            </option>
          ))}
        </select>
      </label>
      <label>
        <span className="text-xs font-semibold uppercase tracking-[0.12em] text-stone-500">
          Tipo
        </span>
        <select
          className="mt-2 min-h-11 w-full rounded-2xl border border-semear-gray bg-white px-3 text-sm outline-none focus:border-semear-green"
          onChange={(event) => updateFilter("actionType", event.target.value)}
          value={filters.actionType}
        >
          <option value="">Todos</option>
          {actionTypeOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </label>
      <label>
        <span className="text-xs font-semibold uppercase tracking-[0.12em] text-stone-500">
          Status
        </span>
        <select
          className="mt-2 min-h-11 w-full rounded-2xl border border-semear-gray bg-white px-3 text-sm outline-none focus:border-semear-green"
          onChange={(event) => updateFilter("status", event.target.value)}
          value={filters.status}
        >
          <option value="">Todos</option>
          {actionStatusOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </label>
    </div>
  );

  function updateFilter<TFilter extends keyof ActionFilters>(
    filter: TFilter,
    value: ActionFilters[TFilter]
  ) {
    setFilters((current) => ({ ...current, [filter]: value }));
  }

  return (
    <section className="pb-10">
      <div className="flex flex-col gap-4 rounded-[2rem] border border-white/80 bg-white/72 p-5 shadow-soft sm:p-7 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-semear-earth">
            Ações territoriais
          </p>
          <h2 className="mt-3 text-3xl font-semibold tracking-tight text-semear-green">
            Planejamento e memória das atividades
          </h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-stone-600">
            Cadastre ações antes das escutas. Depois, cada escuta poderá ser vinculada a uma ação
            para manter contexto territorial e rastreabilidade.
          </p>
        </div>
        <Link
          className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-semear-green px-5 text-sm font-semibold text-white transition hover:bg-semear-green/92"
          href="/acoes/nova"
        >
          <Plus className="h-4 w-4" aria-hidden="true" />
          Nova ação
        </Link>
      </div>

      <details className="mt-5 rounded-[1.5rem] border border-white/80 bg-white/72 p-4 shadow-soft md:hidden">
        <summary className="flex cursor-pointer list-none items-center gap-2 text-sm font-semibold text-semear-green">
          <SlidersHorizontal className="h-4 w-4" aria-hidden="true" />
          Filtrar ações
        </summary>
        <div className="mt-4">{filterFields}</div>
      </details>

      <div className="mt-5 hidden rounded-[1.5rem] border border-white/80 bg-white/72 p-4 shadow-soft md:block">
        <div className="mb-4 flex items-center gap-2 text-sm font-semibold text-semear-green">
          <SlidersHorizontal className="h-4 w-4" aria-hidden="true" />
          Filtros
        </div>
        {filterFields}
      </div>

      {loading ? (
        <div className="mt-5 rounded-[1.5rem] border border-white/80 bg-white/72 p-6 text-sm font-medium text-stone-600 shadow-soft">
          Carregando ações...
        </div>
      ) : null}

      {error ? (
        <div className="mt-5 rounded-[1.5rem] border border-red-200 bg-red-50 p-6 text-sm text-red-800">
          {error}
        </div>
      ) : null}

      {!loading && !error && filteredActions.length === 0 ? (
        <div className="mt-5 rounded-[1.5rem] border border-dashed border-semear-green/25 bg-semear-offwhite p-8 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-white text-semear-earth">
            <Search className="h-6 w-6" aria-hidden="true" />
          </div>
          <h3 className="mt-4 text-lg font-semibold text-semear-green">
            Nenhuma ação encontrada
          </h3>
          <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-stone-600">
            Cadastre a primeira ação territorial ou ajuste os filtros para ver outros registros.
          </p>
        </div>
      ) : null}

      {!loading && !error && filteredActions.length > 0 ? (
        <div className="mt-5 grid gap-4 lg:grid-cols-2">
          {filteredActions.map((action) => (
            <article className="rounded-3xl border border-white/80 bg-white p-5 shadow-soft transition hover:-translate-y-0.5 hover:border-semear-green/25" key={action.id}>
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-full bg-semear-green-soft px-3 py-1 text-xs font-semibold text-semear-green">
                  {getActionTypeLabel(action.action_type as ActionType)}
                </span>
                <span className="rounded-full bg-semear-yellow/35 px-3 py-1 text-xs font-semibold text-semear-green">
                  {getActionStatusLabel(action.status as ActionStatus)}
                </span>
                <span className="rounded-full bg-semear-offwhite px-3 py-1 text-xs font-semibold text-stone-700">
                  {actionMeta.get(action.id)?.totalRecords ?? 0} escutas
                </span>
              </div>
              <h3 className="mt-4 text-xl font-semibold text-semear-green">{action.title}</h3>
              <div className="mt-4 flex flex-wrap gap-3 text-sm text-stone-600">
                <span className="inline-flex items-center gap-2">
                  <CalendarDays className="h-4 w-4" aria-hidden="true" />
                  {new Date(`${action.action_date}T00:00:00`).toLocaleDateString("pt-BR")}
                </span>
                <span className="inline-flex items-center gap-2">
                  <MapPin className="h-4 w-4" aria-hidden="true" />
                  {action.neighborhoods ? formatNeighborhoodOption(action.neighborhoods) : "Sem bairro definido"}
                </span>
              </div>
              <div className="mt-4 grid gap-2 sm:grid-cols-2">
                <StatusStrip icon={<MessageSquareText className="h-4 w-4" />} label="Escutas" value={`${actionMeta.get(action.id)?.reviewedCount ?? 0} revisadas · ${actionMeta.get(action.id)?.draftCount ?? 0} rascunhos`} />
                <StatusStrip icon={<FileText className="h-4 w-4" />} label="Devolutiva" value={String(actionMeta.get(action.id)?.debriefStatus ?? "pendente")} />
                <StatusStrip icon={<FolderCheck className="h-4 w-4" />} label="Dossiê" value={String(actionMeta.get(action.id)?.closureStatus ?? "aberto")} />
                <StatusStrip icon={<Keyboard className="h-4 w-4" />} label="Operação" value="Abrir, digitar ou revisar" />
              </div>
              {action.summary ? (
                <p className="mt-4 line-clamp-3 text-sm leading-6 text-stone-600">
                  {action.summary}
                </p>
              ) : (
                <p className="mt-4 text-sm leading-6 text-stone-500">Sem resumo cadastrado.</p>
              )}
              <div className="mt-4 grid gap-2 sm:grid-cols-3">
                <Link className="inline-flex min-h-11 items-center justify-center rounded-full border border-semear-green/15 bg-white px-4 text-sm font-semibold text-semear-green" href={`/acoes/${action.id}`}>
                  Abrir
                </Link>
                <Link className="inline-flex min-h-11 items-center justify-center rounded-full bg-semear-green px-4 text-sm font-semibold text-white" href="/escutas/lote">
                  Digitar fichas
                </Link>
                <Link className="inline-flex min-h-11 items-center justify-center rounded-full border border-semear-green/15 bg-white px-4 text-sm font-semibold text-semear-green" href={`/escutas?actionId=${action.id}`}>
                  Revisar
                </Link>
              </div>
            </article>
          ))}
        </div>
      ) : null}
    </section>
  );
}

function StatusStrip({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-semear-offwhite px-3 py-3 text-sm text-stone-700">
      <span className="flex items-center gap-2 font-semibold text-semear-green">{icon}{label}</span>
      <p className="mt-1 text-xs leading-5 text-stone-600">{value}</p>
    </div>
  );
}
