"use client";

import { useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import Link from "next/link";
import { Compass, MapPinned, MessageSquareText, Route, Tag } from "lucide-react";
import type { Action, ListeningRecord, Neighborhood, Theme } from "@/lib/database.types";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";
import { SemearAlert, SemearButton, SemearCard, SemearFilterBar, SemearMetricCard, SemearPageHeader, semearControlClassName } from "@/components/ui/semear-primitives";

type ActionWithNeighborhood = Action & {
  neighborhoods: Pick<Neighborhood, "id" | "name"> | null;
};

type RecordWithRelations = ListeningRecord & {
  neighborhoods: Pick<Neighborhood, "id" | "name"> | null;
  respondent_neighborhoods: Pick<Neighborhood, "id" | "name"> | null;
  actions: Pick<Action, "id" | "title"> | null;
  listening_record_themes: Array<{ themes: Pick<Theme, "id" | "name"> | null }>;
};

type Filters = {
  month: string;
  actionNeighborhoodId: string;
  respondentNeighborhoodId: string;
  themeId: string;
};

type ViewMode = "operacao" | "escuta";

type ActionTerritoryCard = {
  neighborhoodId: string;
  neighborhoodName: string;
  actionsCount: number;
  recordsCollectedThere: number;
  respondentTerritoriesReached: number;
  latestActionDate: string | null;
};

type RespondentTerritoryCard = {
  neighborhoodId: string;
  neighborhoodName: string;
  recordsCount: number;
  topThemes: Array<{ name: string; count: number }>;
  actionsWhereAppeared: string[];
  predominantRelation: string | null;
};

const initialFilters: Filters = {
  month: "",
  actionNeighborhoodId: "",
  respondentNeighborhoodId: "",
  themeId: ""
};

export function TerritorialListeningMap() {
  const supabase = useMemo(() => createBrowserSupabaseClient(), []);
  const [actions, setActions] = useState<ActionWithNeighborhood[]>([]);
  const [records, setRecords] = useState<RecordWithRelations[]>([]);
  const [neighborhoods, setNeighborhoods] = useState<Neighborhood[]>([]);
  const [themes, setThemes] = useState<Theme[]>([]);
  const [filters, setFilters] = useState<Filters>(initialFilters);
  const [mode, setMode] = useState<ViewMode>("operacao");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let ignore = false;

    async function loadMapData() {
      if (!supabase) {
        setError("Configure NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_ANON_KEY para carregar o mapa territorial.");
        setLoading(false);
        return;
      }

      const [actionsResult, recordsResult, neighborhoodsResult, themesResult] = await Promise.all([
        supabase.from("actions").select("*, neighborhoods:neighborhood_id(id, name)").order("action_date", { ascending: false }),
        supabase
          .from("listening_records")
          .select("*, neighborhoods:neighborhood_id(id, name), respondent_neighborhoods:respondent_neighborhood_id(id, name), actions:action_id(id, title), listening_record_themes(themes:theme_id(id, name))")
          .order("date", { ascending: false }),
        supabase.from("neighborhoods").select("*").order("name", { ascending: true }),
        supabase.from("themes").select("*").eq("is_active", true).order("name", { ascending: true })
      ]);

      if (ignore) return;

      if (actionsResult.error || recordsResult.error || neighborhoodsResult.error || themesResult.error) {
        setError(
          actionsResult.error?.message ??
            recordsResult.error?.message ??
            neighborhoodsResult.error?.message ??
            themesResult.error?.message ??
            "Erro ao carregar o mapa-lista territorial."
        );
        setLoading(false);
        return;
      }

      setActions((actionsResult.data ?? []) as ActionWithNeighborhood[]);
      setRecords((recordsResult.data ?? []) as unknown as RecordWithRelations[]);
      setNeighborhoods(neighborhoodsResult.data ?? []);
      setThemes(themesResult.data ?? []);
      setLoading(false);
    }

    void loadMapData();

    return () => {
      ignore = true;
    };
  }, [supabase]);

  const filteredActions = actions.filter((action) => {
    if (filters.month && action.action_date.slice(0, 7) !== filters.month) return false;
    if (filters.actionNeighborhoodId && action.neighborhood_id !== filters.actionNeighborhoodId) return false;
    return true;
  });

  const filteredRecords = records.filter((record) => {
    if (filters.month && record.date.slice(0, 7) !== filters.month) return false;
    if (filters.actionNeighborhoodId && record.neighborhood_id !== filters.actionNeighborhoodId) return false;
    if (filters.respondentNeighborhoodId && record.respondent_neighborhood_id !== filters.respondentNeighborhoodId) return false;
    if (filters.themeId && !record.listening_record_themes.some((item) => item.themes?.id === filters.themeId)) return false;
    return true;
  });

  const operationCards = buildOperationCards(neighborhoods, filteredActions, filteredRecords);
  const respondentCards = buildRespondentCards(filteredRecords);
  const recordsWithoutRespondentNeighborhood = filteredRecords.filter((record) => !record.respondent_neighborhood_id).length;

  function updateFilter<TField extends keyof Filters>(field: TField, value: Filters[TField]) {
    setFilters((current) => ({ ...current, [field]: value }));
  }

  return (
    <section className="pb-10">
      <SemearPageHeader
        eyebrow="Mapa-lista territorial"
        title="Leitura territorial sem ambiguidade"
        description="Separação clara entre território da ação e território de referência das pessoas escutadas."
      />
      <SemearCard>
        <SemearAlert tone="neutral">
          <strong>Mapa-lista sem precisão geográfica.</strong> Não há geocodificação nem ponto individual.
        </SemearAlert>
        <div className="mt-5 flex flex-wrap gap-2">
          <TabButton active={mode === "operacao"} label="Onde realizamos ações" onClick={() => setMode("operacao")} />
          <TabButton active={mode === "escuta"} label="De onde vêm as pessoas escutadas" onClick={() => setMode("escuta")} />
        </div>
      </SemearCard>

      <section className="mt-5">
        <SemearFilterBar title="Filtros territoriais">
          <FilterInput label="Mês" value={filters.month} onChange={(value) => updateFilter("month", value)} />
          <FilterSelect label="Território da ação" value={filters.actionNeighborhoodId} onChange={(value) => updateFilter("actionNeighborhoodId", value)}>
            <option value="">Todos</option>
            {neighborhoods.map((item) => (
              <option key={item.id} value={item.id}>{item.name}</option>
            ))}
          </FilterSelect>
          <FilterSelect label="Território de referência do entrevistado" value={filters.respondentNeighborhoodId} onChange={(value) => updateFilter("respondentNeighborhoodId", value)}>
            <option value="">Todos</option>
            {neighborhoods.map((item) => (
              <option key={item.id} value={item.id}>{item.name}</option>
            ))}
          </FilterSelect>
          <FilterSelect label="Tema" value={filters.themeId} onChange={(value) => updateFilter("themeId", value)}>
            <option value="">Todos</option>
            {themes.map((item) => (
              <option key={item.id} value={item.id}>{item.name}</option>
            ))}
          </FilterSelect>
        </SemearFilterBar>
      </section>

      {loading ? <StateBox>Carregando mapa-lista territorial...</StateBox> : null}
      {error ? <StateBox tone="error">{error}</StateBox> : null}

      {!loading && !error ? (
        mode === "operacao" ? (
          <>
            <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <SemearMetricCard icon={<MapPinned className="h-5 w-5" />} label="Territórios com ação" value={operationCards.length} />
              <SemearMetricCard icon={<Route className="h-5 w-5" />} label="Total de ações" value={filteredActions.length} />
              <SemearMetricCard icon={<MessageSquareText className="h-5 w-5" />} label="Escutas coletadas nas ações" value={filteredRecords.length} />
              <SemearMetricCard icon={<Compass className="h-5 w-5" />} label="Territórios de referência alcançados" value={new Set(filteredRecords.map((item) => item.respondent_neighborhood_id).filter(Boolean)).size} />
            </div>

            <SemearCard className="mt-5">
              <h3 className="text-xl font-extrabold text-semear-green">Cards por território da ação</h3>
              <div className="mt-4 grid gap-4 lg:grid-cols-2">
                {operationCards.map((card) => (
                  <article className="rounded-2xl border border-white/60 bg-white/60 p-5 shadow-premium-sm hover:shadow-premium-md hover:bg-white/80 transition-all duration-200" key={card.neighborhoodId}>
                    <h4 className="text-xl font-extrabold text-semear-green">{card.neighborhoodName}</h4>
                    <p className="mt-2 text-sm text-stone-700 font-semibold">{card.actionsCount} ação(ões) realizada(s)</p>
                    <p className="text-sm text-stone-700 font-semibold">{card.recordsCollectedThere} escuta(s) coletada(s) em ações neste território</p>
                    <p className="text-sm text-stone-700 font-semibold">entrevistados vieram de {card.respondentTerritoriesReached} território(s)</p>
                    <p className="mt-3 text-xs text-stone-500 font-bold">última ação: {card.latestActionDate ? new Date(`${card.latestActionDate}T00:00:00`).toLocaleDateString("pt-BR") : "não informado"}</p>
                  </article>
                ))}
                {operationCards.length === 0 ? <PedagogicEmpty text="Sem ações no recorte selecionado." /> : null}
              </div>
            </SemearCard>
          </>
        ) : (
          <>
            <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <SemearMetricCard icon={<MapPinned className="h-5 w-5" />} label="Bairros de referência" value={respondentCards.length} />
              <SemearMetricCard icon={<MessageSquareText className="h-5 w-5" />} label="Escutas por referência" value={filteredRecords.filter((record) => Boolean(record.respondent_neighborhood_id)).length} />
              <SemearMetricCard icon={<Tag className="h-5 w-5" />} label="Temas mapeados" value={countThemes(filteredRecords).length} />
              <SemearMetricCard icon={<AlertMarker />} label="Sem território informado" value={recordsWithoutRespondentNeighborhood} tone={recordsWithoutRespondentNeighborhood > 0 ? "yellow" : "green"} />
            </div>

            <SemearCard className="mt-5">
              <h3 className="text-xl font-extrabold text-semear-green">Cards por território de referência do entrevistado</h3>
              <div className="mt-4 grid gap-4 lg:grid-cols-2">
                {respondentCards.map((card) => (
                  <article className="rounded-2xl border border-white/60 bg-white/60 p-5 shadow-premium-sm hover:shadow-premium-md hover:bg-white/80 transition-all duration-200" key={card.neighborhoodId}>
                    <h4 className="text-xl font-extrabold text-semear-green">{card.neighborhoodName}</h4>
                    <p className="mt-2 text-sm text-stone-700 font-semibold">{card.recordsCount} escuta(s) de pessoas deste território</p>
                    <p className="text-sm text-stone-700 font-semibold">temas mais citados: {card.topThemes.length > 0 ? card.topThemes.map((item) => `${item.name} (${item.count})`).join(", ") : "não informado"}</p>
                    <p className="text-sm text-stone-700 font-semibold">ações onde apareceram: {card.actionsWhereAppeared.length > 0 ? card.actionsWhereAppeared.join(", ") : "não informado"}</p>
                    <p className="mt-3 text-xs text-stone-500 font-bold">vínculo predominante: {card.predominantRelation ?? "não informado"}</p>
                  </article>
                ))}
                {respondentCards.length === 0 ? <PedagogicEmpty text="Sem territórios de referência no recorte selecionado." /> : null}
              </div>
            </SemearCard>
          </>
        )
      ) : null}

      <SemearCard className="mt-5">
        <h3 className="text-lg font-extrabold text-semear-green">Acessos rápidos</h3>
        <div className="mt-4 flex flex-wrap gap-2">
          <SemearButton href="/escutas" variant="secondary">
            Abrir escutas
          </SemearButton>
          <SemearButton href="/territorios" variant="secondary">
            Abrir territórios
          </SemearButton>
        </div>
      </SemearCard>
    </section>
  );
}

function buildOperationCards(
  neighborhoods: Neighborhood[],
  actions: ActionWithNeighborhood[],
  records: RecordWithRelations[]
): ActionTerritoryCard[] {
  const actionByNeighborhood = new Map<string, ActionWithNeighborhood[]>();
  actions.forEach((action) => {
    if (!action.neighborhood_id) return;
    const list = actionByNeighborhood.get(action.neighborhood_id) ?? [];
    list.push(action);
    actionByNeighborhood.set(action.neighborhood_id, list);
  });

  return neighborhoods
    .map((neighborhood) => {
      const territoryActions = actionByNeighborhood.get(neighborhood.id) ?? [];
      const recordsCollectedThere = records.filter((record) => record.neighborhood_id === neighborhood.id);
      const respondentTerritoriesReached = new Set(recordsCollectedThere.map((record) => record.respondent_neighborhood_id).filter(Boolean)).size;
      const latestActionDate = territoryActions.map((item) => item.action_date).sort().reverse()[0] ?? null;
      return {
        neighborhoodId: neighborhood.id,
        neighborhoodName: neighborhood.name,
        actionsCount: territoryActions.length,
        recordsCollectedThere: recordsCollectedThere.length,
        respondentTerritoriesReached,
        latestActionDate
      } satisfies ActionTerritoryCard;
    })
    .filter((item) => item.actionsCount > 0)
    .sort((a, b) => b.actionsCount - a.actionsCount || a.neighborhoodName.localeCompare(b.neighborhoodName, "pt-BR"));
}

function buildRespondentCards(records: RecordWithRelations[]): RespondentTerritoryCard[] {
  const grouped = new Map<string, RecordWithRelations[]>();
  records.forEach((record) => {
    if (!record.respondent_neighborhood_id) return;
    const list = grouped.get(record.respondent_neighborhood_id) ?? [];
    list.push(record);
    grouped.set(record.respondent_neighborhood_id, list);
  });

  return Array.from(grouped.entries())
    .map(([neighborhoodId, group]) => {
      const themeRanking = countThemes(group).slice(0, 4);
      const actionNames = Array.from(new Set(group.map((record) => record.actions?.title).filter(Boolean))) as string[];
      const relationRanking = countBy(group, (record) => record.respondent_territory_relation ?? "");
      return {
        neighborhoodId,
        neighborhoodName: group[0]?.respondent_neighborhoods?.name ?? "Não informado",
        recordsCount: group.length,
        topThemes: themeRanking,
        actionsWhereAppeared: actionNames.slice(0, 4),
        predominantRelation: relationRanking[0]?.name || null
      } satisfies RespondentTerritoryCard;
    })
    .sort((a, b) => b.recordsCount - a.recordsCount || a.neighborhoodName.localeCompare(b.neighborhoodName, "pt-BR"));
}

function countThemes(records: RecordWithRelations[]) {
  const map = new Map<string, number>();
  records.forEach((record) => {
    record.listening_record_themes.forEach((item) => {
      if (!item.themes?.name) return;
      map.set(item.themes.name, (map.get(item.themes.name) ?? 0) + 1);
    });
  });
  return Array.from(map.entries()).map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count || a.name.localeCompare(b.name, "pt-BR"));
}

function countBy<TItem>(items: TItem[], getValue: (item: TItem) => string) {
  const map = new Map<string, number>();
  items.forEach((item) => {
    const value = getValue(item);
    if (!value) return;
    map.set(value, (map.get(value) ?? 0) + 1);
  });
  return Array.from(map.entries()).map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count || a.name.localeCompare(b.name, "pt-BR"));
}

function TabButton({ active, label, onClick }: { active: boolean; label: string; onClick: () => void }) {
  return (
    <button
      className={`inline-flex min-h-11 items-center rounded-full px-4 text-sm font-bold shadow-premium-sm transition duration-200 active:scale-[0.98] ${active ? "bg-semear-yellow text-semear-green" : "border border-white/60 bg-white/80 text-semear-green hover:bg-white"}`}
      onClick={onClick}
      type="button"
    >
      {label}
    </button>
  );
}

function AlertMarker() {
  return <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-amber-100 text-xs font-bold text-amber-900 shadow-premium-sm">!</span>;
}

function MetricCard({ icon, label, value }: { icon: ReactNode; label: string; value: number }) {
  return (
    <article className="rounded-3xl border border-white/60 bg-white/80 backdrop-blur-md p-5 shadow-premium-md">
      <div className="mb-5 flex h-11 w-11 items-center justify-center rounded-2xl bg-semear-green text-white shadow-premium-sm">{icon}</div>
      <p className="text-sm font-bold text-stone-600">{label}</p>
      <strong className="mt-2 block text-4xl font-extrabold tracking-tight text-semear-green">{value}</strong>
    </article>
  );
}

function FilterInput({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return <label><span className="text-xs font-bold uppercase tracking-[0.12em] text-stone-500">{label}</span><input className={semearControlClassName} onChange={(event) => onChange(event.target.value)} type="month" value={value} /></label>;
}

function FilterSelect({ label, value, onChange, children }: { label: string; value: string; onChange: (value: string) => void; children: ReactNode }) {
  return <label><span className="text-xs font-bold uppercase tracking-[0.12em] text-stone-500">{label}</span><select className={semearControlClassName} onChange={(event) => onChange(event.target.value)} value={value}>{children}</select></label>;
}

function StateBox({ children, tone = "neutral" }: { children: ReactNode; tone?: "neutral" | "error" }) {
  return <div className={`mt-5 rounded-3xl p-6 text-sm shadow-premium-md backdrop-blur-md ${tone === "error" ? "border border-red-200 bg-red-50 text-red-800 font-bold" : "border border-white/60 bg-white/80 text-stone-650 font-semibold"}`}>{children}</div>;
}

function PedagogicEmpty({ text }: { text: string }) {
  return <div className="rounded-2xl border border-dashed border-semear-green/30 bg-white/60 p-5 text-sm leading-6 text-stone-700 font-bold shadow-premium-sm">{text}</div>;
}
