"use client";

import { useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import Link from "next/link";
import {
  BarChart3,
  CalendarDays,
  ClipboardList,
  FolderCheck,
  Keyboard,
  Layers3,
  MapPinned,
  MessageSquareText,
  Search,
  Tag
} from "lucide-react";
import type { Action, ActionClosure, ActionDebrief, ActionType, ListeningRecord, Neighborhood, Theme } from "@/lib/database.types";
import { actionTypeOptions, getActionTypeLabel } from "@/lib/actions";
import { getReviewStatusLabel } from "@/lib/listening-records";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";

type RecordWithRelations = ListeningRecord & {
  actions: Pick<Action, "id" | "title" | "action_type"> | null;
  neighborhoods: Pick<Neighborhood, "id" | "name"> | null;
  listening_record_themes: Array<{ themes: Pick<Theme, "id" | "name"> | null }>;
};

type ActionWithNeighborhood = Action & {
  neighborhoods: Pick<Neighborhood, "id" | "name"> | null;
};

type Filters = {
  month: string;
  neighborhoodId: string;
  actionType: string;
  themeId: string;
};

const initialFilters: Filters = {
  month: "",
  neighborhoodId: "",
  actionType: "",
  themeId: ""
};

export function Dashboard() {
  const supabase = useMemo(() => createBrowserSupabaseClient(), []);
  const [actions, setActions] = useState<ActionWithNeighborhood[]>([]);
  const [records, setRecords] = useState<RecordWithRelations[]>([]);
  const [neighborhoods, setNeighborhoods] = useState<Neighborhood[]>([]);
  const [themes, setThemes] = useState<Theme[]>([]);
  const [closures, setClosures] = useState<ActionClosure[]>([]);
  const [debriefs, setDebriefs] = useState<ActionDebrief[]>([]);
  const [filters, setFilters] = useState<Filters>(initialFilters);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let ignore = false;

    async function loadDashboard() {
      if (!supabase) {
        setError("Configure NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_ANON_KEY para carregar o dashboard.");
        setLoading(false);
        return;
      }

      const [actionsResult, recordsResult, neighborhoodsResult, themesResult, closuresResult, debriefsResult] = await Promise.all([
        supabase
          .from("actions")
          .select("*, neighborhoods:neighborhood_id(id, name)")
          .order("action_date", { ascending: false }),
        supabase
          .from("listening_records")
          .select("*, actions:action_id(id, title, action_type), neighborhoods:neighborhood_id(id, name), listening_record_themes(themes:theme_id(id, name))")
          .order("date", { ascending: false }),
        supabase.from("neighborhoods").select("*").order("name", { ascending: true }),
        supabase.from("themes").select("*").eq("is_active", true).order("name", { ascending: true }),
        supabase.from("action_closures").select("*"),
        supabase.from("action_debriefs").select("*")
      ]);

      if (ignore) return;

      if (actionsResult.error || recordsResult.error || neighborhoodsResult.error || themesResult.error || closuresResult.error || debriefsResult.error) {
        setError(
          actionsResult.error?.message ??
            recordsResult.error?.message ??
            neighborhoodsResult.error?.message ??
            themesResult.error?.message ??
            closuresResult.error?.message ??
            debriefsResult.error?.message ??
            "Erro ao carregar dados do dashboard."
        );
        setLoading(false);
        return;
      }

      setActions((actionsResult.data ?? []) as ActionWithNeighborhood[]);
      setRecords((recordsResult.data ?? []) as unknown as RecordWithRelations[]);
      setNeighborhoods(neighborhoodsResult.data ?? []);
      setThemes(themesResult.data ?? []);
      setClosures((closuresResult.data ?? []) as ActionClosure[]);
      setDebriefs((debriefsResult.data ?? []) as ActionDebrief[]);
      setLoading(false);
    }

    void loadDashboard();

    return () => {
      ignore = true;
    };
  }, [supabase]);

  const filteredRecords = records.filter((record) => {
    if (filters.month && record.date.slice(0, 7) !== filters.month) return false;
    if (filters.neighborhoodId && record.neighborhood_id !== filters.neighborhoodId) return false;
    if (filters.actionType && record.actions?.action_type !== filters.actionType) return false;
    if (filters.themeId && !record.listening_record_themes.some((item) => item.themes?.id === filters.themeId)) return false;
    return true;
  });

  const filteredActions = actions.filter((action) => {
    if (filters.month && action.action_date.slice(0, 7) !== filters.month) return false;
    if (filters.neighborhoodId && action.neighborhood_id !== filters.neighborhoodId) return false;
    if (filters.actionType && action.action_type !== filters.actionType) return false;
    return true;
  });

  const visitedNeighborhoodIds = new Set(
    [...filteredActions.map((action) => action.neighborhood_id), ...filteredRecords.map((record) => record.neighborhood_id)].filter(Boolean)
  );

  const recordsByMonth = countBy(filteredRecords, (record) => record.date.slice(0, 7));
  const themeCounts = countThemes(filteredRecords);
  const themesByNeighborhood = countThemesByNeighborhood(filteredRecords);
  const wordCounts = countWords(filteredRecords);
  const pendingRecords = filteredRecords.filter((record) => record.review_status === "draft");
  const latestRecords = filteredRecords.slice(0, 6);
  const actionsWithOpenDossier = filteredActions.filter((action) => closures.find((closure) => closure.action_id === action.id)?.status !== "closed");
  const actionsWithPendingDebrief = filteredActions.filter((action) => debriefs.find((debrief) => debrief.action_id === action.id)?.status !== "approved");
  const actionsWithDraftRecords = filteredActions.filter((action) => filteredRecords.some((record) => record.action_id === action.id && record.review_status === "draft"));
  const latestAction = filteredActions[0] ?? null;
  const latestActionRecords = latestAction ? filteredRecords.filter((record) => record.action_id === latestAction.id) : [];
  const latestActionDebrief = latestAction ? debriefs.find((debrief) => debrief.action_id === latestAction.id) : null;
  const latestActionClosure = latestAction ? closures.find((closure) => closure.action_id === latestAction.id) : null;

  const maxThemeCount = Math.max(...themeCounts.map((item) => item.count), 1);

  function updateFilter<TField extends keyof Filters>(field: TField, value: Filters[TField]) {
    setFilters((current) => ({ ...current, [field]: value }));
  }

  return (
    <section className="pb-10">
      <div className="rounded-[2rem] border border-white/80 bg-white/72 p-5 shadow-soft sm:p-7">
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-semear-earth">
          Dashboard de padrões
        </p>
        <h2 className="mt-3 max-w-3xl text-3xl font-semibold tracking-tight text-semear-green sm:text-5xl">
          Sínteses territoriais para leitura coletiva.
        </h2>
        <p className="mt-4 max-w-3xl text-sm leading-6 text-stone-600">
          Os indicadores são calculados a partir dos dados cadastrados no Supabase. O painel não
          classifica automaticamente a população: ele organiza padrões para a equipe revisar e
          devolver ao território.
        </p>
      </div>

      <div className="mt-5 rounded-[1.5rem] border border-white/80 bg-white/72 p-4 shadow-soft">
        <div className="mb-4 flex items-center gap-2 text-sm font-semibold text-semear-green">
          <Search className="h-4 w-4" aria-hidden="true" />
          Filtros
        </div>
        <div className="grid gap-3 md:grid-cols-4">
          <FilterInput label="Mês" value={filters.month} onChange={(value) => updateFilter("month", value)} />
          <FilterSelect label="Bairro" value={filters.neighborhoodId} onChange={(value) => updateFilter("neighborhoodId", value)}>
            <option value="">Todos</option>
            {neighborhoods.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
          </FilterSelect>
          <FilterSelect label="Tipo de ação" value={filters.actionType} onChange={(value) => updateFilter("actionType", value)}>
            <option value="">Todos</option>
            {actionTypeOptions.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
          </FilterSelect>
          <FilterSelect label="Tema" value={filters.themeId} onChange={(value) => updateFilter("themeId", value)}>
            <option value="">Todos</option>
            {themes.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
          </FilterSelect>
        </div>
      </div>

      {loading ? <StateBox>Carregando dados do dashboard...</StateBox> : null}
      {error ? <StateBox tone="error">{error}</StateBox> : null}

      {!loading && !error ? (
        <>
          <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <MetricCard icon={<ClipboardList className="h-5 w-5" />} label="Total de ações" value={filteredActions.length} />
            <MetricCard icon={<MessageSquareText className="h-5 w-5" />} label="Total de escutas" value={filteredRecords.length} />
            <MetricCard icon={<MapPinned className="h-5 w-5" />} label="Bairros visitados" value={visitedNeighborhoodIds.size} />
            <MetricCard icon={<Layers3 className="h-5 w-5" />} label="Pendências de revisão" value={pendingRecords.length} />
          </div>

          <section className="mt-5 rounded-[2rem] border border-white/80 bg-white p-5 shadow-soft">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.18em] text-semear-earth">Próxima operação</p>
                <h3 className="mt-2 text-2xl font-semibold text-semear-green">Atalhos para homologação e primeira banca</h3>
                <p className="mt-2 text-sm leading-6 text-stone-600">
                  {actionsWithOpenDossier.length} ação(ões) com dossiê aberto, {actionsWithPendingDebrief.length} com devolutiva pendente e {actionsWithDraftRecords.length} com escutas em rascunho.
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <QuickAction href="/escutas/lote" icon={<Keyboard className="h-4 w-4" />} label="Digitar fichas" />
                <QuickAction href="/escutas?status=draft" icon={<MessageSquareText className="h-4 w-4" />} label="Revisar escutas" />
                <QuickAction href={actionsWithOpenDossier[0] ? `/acoes/${actionsWithOpenDossier[0].id}/dossie` : "/acoes"} icon={<FolderCheck className="h-4 w-4" />} label="Fechar dossiê" />
              </div>
            </div>
            <div className="mt-4 grid gap-3 md:grid-cols-3">
              <OperationList title="Ações recentes" items={filteredActions.slice(0, 3).map((action) => action.title)} />
              <OperationList title="Dossiê aberto" items={actionsWithOpenDossier.slice(0, 3).map((action) => action.title)} />
              <OperationList title="Devolutiva pendente" items={actionsWithPendingDebrief.slice(0, 3).map((action) => action.title)} />
            </div>
          </section>

          <section className="mt-5 rounded-[2rem] border border-white/80 bg-white p-5 shadow-soft">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.18em] text-semear-earth">Última operação</p>
                <h3 className="mt-2 text-2xl font-semibold text-semear-green">
                  {latestAction?.title ?? "Nenhuma ação realizada"}
                </h3>
                <p className="mt-2 text-sm leading-6 text-stone-600">
                  {latestAction ? `${new Date(`${latestAction.action_date}T00:00:00`).toLocaleDateString("pt-BR")} · ${latestAction.neighborhoods?.name ?? "sem bairro"}` : "Cadastre a primeira ação para acompanhar o fechamento pós-banca."}
                </p>
              </div>
              {latestAction ? (
                <div className="flex flex-wrap gap-2">
                  <Link className="inline-flex min-h-11 items-center justify-center rounded-full bg-semear-green px-5 text-sm font-semibold text-white" href={`/acoes/${latestAction.id}`}>
                    Abrir ação
                  </Link>
                  <Link className="inline-flex min-h-11 items-center justify-center rounded-full border border-semear-green/15 bg-white px-5 text-sm font-semibold text-semear-green" href={`/acoes/${latestAction.id}/piloto`}>
                    Ver piloto
                  </Link>
                  <Link className="inline-flex min-h-11 items-center justify-center rounded-full border border-semear-green/15 bg-white px-5 text-sm font-semibold text-semear-green" href={`/acoes/${latestAction.id}/dossie`}>
                    Ver dossiê
                  </Link>
                </div>
              ) : null}
            </div>
            {latestAction ? (
              <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
                <SmallMetric label="Escutas" value={latestActionRecords.length.toString()} />
                <SmallMetric label="Revisadas" value={latestActionRecords.filter((record) => record.review_status === "reviewed").length.toString()} />
                <SmallMetric label="Rascunhos" value={latestActionRecords.filter((record) => record.review_status === "draft").length.toString()} />
                <SmallMetric label="Devolutiva" value={latestActionDebrief?.status === "approved" ? "aprovada" : latestActionDebrief?.status ?? "não criada"} />
                <SmallMetric label="Dossiê" value={latestActionClosure?.status ?? "aberto"} />
              </div>
            ) : null}
          </section>

          {filteredActions.length === 0 && filteredRecords.length === 0 ? (
            <EmptyDashboard />
          ) : (
            <div className="mt-5 grid gap-5 xl:grid-cols-[1.1fr_0.9fr]">
              <Panel title="Temas mais recorrentes" icon={<Tag className="h-5 w-5" />}>
                {themeCounts.length > 0 ? (
                  <div className="space-y-4">
                    {themeCounts.slice(0, 8).map((item) => (
                      <div key={item.name}>
                        <div className="mb-2 flex items-center justify-between gap-3 text-sm">
                          <span className="font-semibold text-semear-green">{item.name}</span>
                          <span className="text-stone-600">{item.count}</span>
                        </div>
                        <div className="h-3 rounded-full bg-semear-green-soft">
                          <div className="h-3 rounded-full bg-semear-green" style={{ width: `${(item.count / maxThemeCount) * 100}%` }} />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : <PedagogicEmpty text="Nenhum tema foi marcado nas escutas filtradas." />}
              </Panel>

              <Panel title="Escutas por mês" icon={<CalendarDays className="h-5 w-5" />}>
                {recordsByMonth.length > 0 ? (
                  <SimpleTable headers={["Mês", "Escutas"]} rows={recordsByMonth.map((item) => [formatMonth(item.name), item.count.toString()])} />
                ) : <PedagogicEmpty text="Ainda não há escutas com data no recorte selecionado." />}
              </Panel>

              <Panel title="Temas por bairro" icon={<BarChart3 className="h-5 w-5" />}>
                {themesByNeighborhood.length > 0 ? (
                  <SimpleTable headers={["Bairro", "Tema", "Qtd."]} rows={themesByNeighborhood.slice(0, 10).map((item) => [item.neighborhood, item.theme, item.count.toString()])} />
                ) : <PedagogicEmpty text="Marque temas em escutas com bairro para formar essa leitura territorial." />}
              </Panel>

              <Panel title="Palavras recorrentes" icon={<MessageSquareText className="h-5 w-5" />}>
                {wordCounts.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {wordCounts.slice(0, 24).map((item) => (
                      <span className="rounded-full bg-semear-offwhite px-3 py-1 text-sm font-semibold text-stone-700" key={item.name}>
                        {item.name} <span className="text-semear-earth">{item.count}</span>
                      </span>
                    ))}
                  </div>
                ) : <PedagogicEmpty text="Preencha o campo palavras usadas pela pessoa para ver recorrências." />}
              </Panel>

              <Panel title="Últimas escutas digitadas" icon={<MessageSquareText className="h-5 w-5" />}>
                {latestRecords.length > 0 ? (
                  <div className="space-y-3">
                    {latestRecords.map((record) => (
                      <Link className="block rounded-2xl border border-semear-gray bg-white p-4 transition hover:border-semear-green/30" href={`/escutas/${record.id}`} key={record.id}>
                        <div className="flex flex-wrap items-center gap-2 text-xs font-semibold text-stone-600">
                          <span>{new Date(`${record.date}T00:00:00`).toLocaleDateString("pt-BR")}</span>
                          <span>{getReviewStatusLabel(record.review_status)}</span>
                          <span>{record.neighborhoods?.name ?? "Sem bairro"}</span>
                        </div>
                        <p className="mt-2 line-clamp-2 text-sm leading-6 text-semear-green">{record.free_speech_text}</p>
                      </Link>
                    ))}
                  </div>
                ) : <PedagogicEmpty text="As escutas mais recentes aparecerão aqui após a digitação." />}
              </Panel>

              <Panel title="Pendências de revisão" icon={<Layers3 className="h-5 w-5" />}>
                {pendingRecords.length > 0 ? (
                  <SimpleTable headers={["Data", "Bairro", "Ação"]} rows={pendingRecords.slice(0, 8).map((record) => [
                    new Date(`${record.date}T00:00:00`).toLocaleDateString("pt-BR"),
                    record.neighborhoods?.name ?? "Sem bairro",
                    record.actions?.title ?? "Sem ação"
                  ])} />
                ) : <PedagogicEmpty text="Não há escutas em rascunho no recorte selecionado." />}
              </Panel>
            </div>
          )}
        </>
      ) : null}
    </section>
  );
}

function SmallMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-semear-gray bg-semear-offwhite p-4">
      <p className="text-xs font-semibold uppercase tracking-[0.12em] text-stone-500">{label}</p>
      <p className="mt-2 text-lg font-semibold text-semear-green">{value}</p>
    </div>
  );
}

function QuickAction({ href, icon, label }: { href: string; icon: ReactNode; label: string }) {
  return (
    <Link className="inline-flex min-h-11 items-center gap-2 rounded-full bg-semear-green px-4 text-sm font-semibold text-white" href={href}>
      {icon}
      {label}
    </Link>
  );
}

function OperationList({ title, items }: { title: string; items: string[] }) {
  return (
    <div className="rounded-2xl border border-semear-gray bg-semear-offwhite p-4">
      <p className="font-semibold text-semear-green">{title}</p>
      {items.length > 0 ? (
        <ul className="mt-2 space-y-1 text-sm leading-6 text-stone-700">
          {items.map((item) => <li key={item}>{item}</li>)}
        </ul>
      ) : (
        <p className="mt-2 text-sm text-stone-500">Nenhum item.</p>
      )}
    </div>
  );
}

function MetricCard({ icon, label, value }: { icon: ReactNode; label: string; value: number }) {
  return (
    <article className="rounded-3xl border border-white/80 bg-white p-5 shadow-soft">
      <div className="mb-5 flex h-11 w-11 items-center justify-center rounded-2xl bg-semear-green text-white">{icon}</div>
      <p className="text-sm font-medium text-stone-600">{label}</p>
      <strong className="mt-2 block text-4xl font-semibold tracking-tight text-semear-green">{value}</strong>
    </article>
  );
}

function Panel({ title, icon, children }: { title: string; icon: ReactNode; children: ReactNode }) {
  return (
    <section className="rounded-3xl border border-white/80 bg-white/78 p-5 shadow-soft">
      <div className="mb-5 flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-semear-green-soft text-semear-green">{icon}</div>
        <h3 className="text-lg font-semibold text-semear-green">{title}</h3>
      </div>
      {children}
    </section>
  );
}

function SimpleTable({ headers, rows }: { headers: string[]; rows: string[][] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-sm">
        <thead className="text-xs uppercase tracking-[0.12em] text-stone-500">
          <tr>{headers.map((header) => <th className="border-b border-semear-gray pb-3 pr-4" key={header}>{header}</th>)}</tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.join("|")}>{row.map((cell, index) => <td className="border-b border-semear-gray/70 py-3 pr-4 text-stone-700" key={`${cell}-${index}`}>{cell}</td>)}</tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function FilterInput({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return <label><span className="text-xs font-semibold uppercase tracking-[0.12em] text-stone-500">{label}</span><input className="mt-2 min-h-11 w-full rounded-2xl border border-semear-gray bg-white px-3 text-sm outline-none focus:border-semear-green" onChange={(event) => onChange(event.target.value)} type="month" value={value} /></label>;
}

function FilterSelect({ label, value, onChange, children }: { label: string; value: string; onChange: (value: string) => void; children: ReactNode }) {
  return <label><span className="text-xs font-semibold uppercase tracking-[0.12em] text-stone-500">{label}</span><select className="mt-2 min-h-11 w-full rounded-2xl border border-semear-gray bg-white px-3 text-sm outline-none focus:border-semear-green" onChange={(event) => onChange(event.target.value)} value={value}>{children}</select></label>;
}

function StateBox({ children, tone = "neutral" }: { children: ReactNode; tone?: "neutral" | "error" }) {
  return <div className={`mt-5 rounded-[1.5rem] p-6 text-sm shadow-soft ${tone === "error" ? "border border-red-200 bg-red-50 text-red-800" : "bg-white/72 text-stone-600"}`}>{children}</div>;
}

function PedagogicEmpty({ text }: { text: string }) {
  return <div className="rounded-2xl border border-dashed border-semear-green/25 bg-semear-offwhite p-5 text-sm leading-6 text-stone-600">{text}</div>;
}

function EmptyDashboard() {
  return (
    <div className="mt-5 rounded-[1.5rem] border border-dashed border-semear-green/25 bg-semear-offwhite p-8 text-center">
      <h3 className="text-lg font-semibold text-semear-green">Ainda não há dados para sintetizar</h3>
      <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-stone-600">
        Cadastre ações e escutas para que o dashboard mostre padrões por mês, bairro e tema.
      </p>
    </div>
  );
}

function countBy<TItem>(items: TItem[], getName: (item: TItem) => string) {
  const map = new Map<string, number>();
  items.forEach((item) => {
    const name = getName(item);
    if (name) map.set(name, (map.get(name) ?? 0) + 1);
  });
  return Array.from(map.entries()).map(([name, count]) => ({ name, count })).sort((a, b) => a.name.localeCompare(b.name));
}

function countThemes(records: RecordWithRelations[]) {
  const map = new Map<string, number>();
  records.forEach((record) => {
    record.listening_record_themes.forEach((item) => {
      if (item.themes?.name) map.set(item.themes.name, (map.get(item.themes.name) ?? 0) + 1);
    });
  });
  return Array.from(map.entries()).map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count);
}

function countThemesByNeighborhood(records: RecordWithRelations[]) {
  const map = new Map<string, { neighborhood: string; theme: string; count: number }>();
  records.forEach((record) => {
    const neighborhood = record.neighborhoods?.name ?? "Sem bairro";
    record.listening_record_themes.forEach((item) => {
      if (!item.themes?.name) return;
      const key = `${neighborhood}|${item.themes.name}`;
      const current = map.get(key);
      map.set(key, { neighborhood, theme: item.themes.name, count: (current?.count ?? 0) + 1 });
    });
  });
  return Array.from(map.values()).sort((a, b) => b.count - a.count);
}

function countWords(records: RecordWithRelations[]) {
  const map = new Map<string, number>();
  records.forEach((record) => {
    record.words_used
      ?.split(/[,;\n]+/)
      .map((word) => word.trim().toLocaleLowerCase("pt-BR"))
      .filter(Boolean)
      .forEach((word) => map.set(word, (map.get(word) ?? 0) + 1));
  });
  return Array.from(map.entries()).map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
}

function formatMonth(value: string) {
  const [year, month] = value.split("-");
  return new Date(Number(year), Number(month) - 1, 1).toLocaleDateString("pt-BR", {
    month: "long",
    year: "numeric"
  });
}
