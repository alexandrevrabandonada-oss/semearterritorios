"use client";

import { useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import Link from "next/link";
import { Compass, Filter, MapPinned, MessageSquareText, Route, Tag } from "lucide-react";
import type { ListeningRecord, Neighborhood, NormalizedPlace, PlaceMentioned, Theme } from "@/lib/database.types";
import type { InternalMapHomologation } from "@/lib/database.types";
import { getHomologationDecisionLabel, getHomologationStatusLabel } from "@/lib/internal-map-homologation-records";
import { buildTerritorialQualityByNeighborhood } from "@/lib/territorial-quality";
import { getTerritorialQualityMetrics, isSensitivePlace, type TerritorialReviewRecord } from "@/lib/territorial-review";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";

type RecordWithRelations = ListeningRecord & {
  neighborhoods: Pick<Neighborhood, "id" | "name"> | null;
  listening_record_themes: Array<{ themes: Pick<Theme, "id" | "name"> | null }>;
  places_mentioned: Array<Pick<PlaceMentioned, "id" | "place_name" | "place_type" | "notes" | "neighborhood_id" | "normalized_place_id"> & {
    normalized_places?: Pick<NormalizedPlace, "id" | "normalized_name" | "visibility" | "place_type"> | null;
  }>;
};

type Filters = {
  month: string;
  themeId: string;
};

type TerritorialCard = {
  neighborhoodId: string;
  neighborhoodName: string;
  totalRecords: number;
  totalPlaces: number;
  freeTextPlaces: number;
  topThemes: Array<{ name: string; count: number }>;
  topPlaces: Array<{ name: string; count: number }>;
  latestDate: string | null;
  qualityRecommendation: string;
};

const initialFilters: Filters = {
  month: "",
  themeId: ""
};

export function TerritorialListeningMap() {
  const supabase = useMemo(() => createBrowserSupabaseClient(), []);
  const [records, setRecords] = useState<RecordWithRelations[]>([]);
  const [neighborhoods, setNeighborhoods] = useState<Neighborhood[]>([]);
  const [themes, setThemes] = useState<Theme[]>([]);
  const [homologation, setHomologation] = useState<InternalMapHomologation | null>(null);
  const [filters, setFilters] = useState<Filters>(initialFilters);
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

      const [recordsResult, neighborhoodsResult, themesResult, homologationResult] = await Promise.all([
        supabase
          .from("listening_records")
          .select("*, neighborhoods:neighborhood_id(id, name), listening_record_themes(themes:theme_id(id, name)), places_mentioned(id, place_name, place_type, notes, neighborhood_id, normalized_place_id, normalized_places:normalized_place_id(id, normalized_name, visibility, place_type))")
          .order("date", { ascending: false }),
        supabase.from("neighborhoods").select("*").order("name", { ascending: true }),
        supabase.from("themes").select("*").eq("is_active", true).order("name", { ascending: true }),
        supabase.from("internal_map_homologations").select("*").order("created_at", { ascending: false }).limit(1).maybeSingle()
      ]);

      if (ignore) return;

      if (recordsResult.error || neighborhoodsResult.error || themesResult.error || homologationResult.error) {
        setError(
          recordsResult.error?.message ??
            neighborhoodsResult.error?.message ??
            themesResult.error?.message ??
            homologationResult.error?.message ??
            "Erro ao carregar o mapa territorial."
        );
        setLoading(false);
        return;
      }

      setRecords((recordsResult.data ?? []) as RecordWithRelations[]);
      setNeighborhoods(neighborhoodsResult.data ?? []);
      setThemes(themesResult.data ?? []);
      setHomologation(homologationResult.data as InternalMapHomologation | null);
      setLoading(false);
    }

    void loadMapData();

    return () => {
      ignore = true;
    };
  }, [supabase]);

  const filteredRecords = records.filter((record) => {
    if (filters.month && record.date.slice(0, 7) !== filters.month) return false;
    if (filters.themeId && !record.listening_record_themes.some((item) => item.themes?.id === filters.themeId)) return false;
    return true;
  });

  const territorialCards = buildTerritorialCards(neighborhoods, filteredRecords);
  const territorialQuality = getTerritorialQualityMetrics(filteredRecords as TerritorialReviewRecord[]);
  const freeTextPlacesCount = filteredRecords.filter((record) => record.places_mentioned_text?.trim()).length;
  const mappedNeighborhoodsCount = territorialCards.filter((item) => item.totalRecords > 0).length;
  const totalPlacesMentioned = territorialCards.reduce((sum, item) => sum + item.totalPlaces, 0);
  const strongestTerritory = territorialCards.find((item) => item.totalRecords > 0) ?? null;
  const overallThemeRanking = countThemes(filteredRecords);
  const maxRecords = Math.max(...territorialCards.map((item) => item.totalRecords), 1);

  function updateFilter<TField extends keyof Filters>(field: TField, value: Filters[TField]) {
    setFilters((current) => ({ ...current, [field]: value }));
  }

  return (
    <section className="pb-10">
      <div className="rounded-[2rem] border border-white/80 bg-white/72 p-5 shadow-soft sm:p-7">
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-semear-earth">Mapa-lista V0</p>
        <h2 className="mt-3 max-w-4xl text-3xl font-semibold tracking-tight text-semear-green sm:text-5xl">
          Uma cartografia inicial feita como lista territorial viva.
        </h2>
        <p className="mt-4 max-w-3xl text-sm leading-6 text-stone-600">
          Este ainda é o mapa-lista: não há precisão geográfica, geocodificação, GeoJSON ou camada visual de mapa. O mapa interno autenticado está em desenho técnico; lugares sensíveis ficam ocultos e territórios em revisão podem mudar.
        </p>
        <div className={`mt-4 inline-flex rounded-full border px-4 py-2 text-sm font-semibold ${homologation?.status === "approved" ? "border-green-200 bg-green-50 text-green-800" : homologation?.status === "rejected" ? "border-red-200 bg-red-50 text-red-800" : "border-amber-200 bg-amber-50 text-amber-950"}`}>
          Homologação: {getHomologationStatusLabel(homologation?.status)} · {getHomologationDecisionLabel(homologation?.decision)}
        </div>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-stone-600">
          Mapa geográfico só pode ser prototipado se houver homologação aprovada com decisão GO para protótipo interno. O portão técnico em /mapa/interno verifica essa regra sem renderizar mapa visual.
        </p>
        <div className={`mt-4 rounded-2xl border p-4 ${homologation?.status === "approved" && homologation.decision === "go_prototipo_interno" ? "border-green-200 bg-green-50" : "border-amber-200 bg-amber-50"}`}>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h3 className="font-semibold text-semear-green">Mapa Interno Autenticado</h3>
              <p className="mt-1 text-sm leading-6 text-stone-700">
                {homologation?.status === "approved" && homologation.decision === "go_prototipo_interno"
                  ? "Portão liberado para iniciar protótipo interno autenticado, ainda sem publicação externa."
                  : "Sem GO persistente para protótipo. Continue usando o mapa-lista V0 e conclua a homologação."}
              </p>
              <p className="mt-1 text-xs font-semibold uppercase tracking-[0.12em] text-stone-500">
                {getHomologationStatusLabel(homologation?.status)} · {getHomologationDecisionLabel(homologation?.decision)}
              </p>
            </div>
            <Link className="inline-flex min-h-11 items-center justify-center rounded-full bg-semear-green px-4 text-sm font-semibold text-white" href="/mapa/interno">
              Abrir portão do mapa interno
            </Link>
          </div>
        </div>
        <div className="mt-5 flex flex-wrap gap-2">
          <Link className="inline-flex min-h-11 items-center rounded-full bg-semear-green px-4 text-sm font-semibold text-white" href="/territorios/qualidade">
            Ver qualidade territorial
          </Link>
          <Link className="inline-flex min-h-11 items-center rounded-full border border-semear-green/15 bg-white px-4 text-sm font-semibold text-semear-green" href="/territorios/normalizacao/qualidade">
            Ver qualidade da normalização
          </Link>
          <Link className="inline-flex min-h-11 items-center rounded-full border border-semear-green/15 bg-white px-4 text-sm font-semibold text-semear-green" href="/territorios/mapa/homologacao">
            Homologar mapa interno
          </Link>
        </div>
      </div>

      <div className="mt-5 rounded-[1.5rem] border border-white/80 bg-white/72 p-4 shadow-soft">
        <div className="mb-4 flex items-center gap-2 text-sm font-semibold text-semear-green">
          <Filter className="h-4 w-4" aria-hidden="true" />
          Filtros territoriais
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          <FilterInput label="Mês" value={filters.month} onChange={(value) => updateFilter("month", value)} />
          <FilterSelect label="Tema" value={filters.themeId} onChange={(value) => updateFilter("themeId", value)}>
            <option value="">Todos</option>
            {themes.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name}
              </option>
            ))}
          </FilterSelect>
        </div>
      </div>

      {loading ? <StateBox>Carregando cartografia territorial...</StateBox> : null}
      {error ? <StateBox tone="error">{error}</StateBox> : null}

      {!loading && !error ? (
        <>
          <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <MetricCard icon={<MapPinned className="h-5 w-5" />} label="Bairros com escutas" value={mappedNeighborhoodsCount} />
            <MetricCard icon={<MessageSquareText className="h-5 w-5" />} label="Escutas no recorte" value={filteredRecords.length} />
            <MetricCard icon={<Route className="h-5 w-5" />} label="Lugares mencionados" value={totalPlacesMentioned} />
            <MetricCard icon={<Compass className="h-5 w-5" />} label="Território mais intenso" value={strongestTerritory?.totalRecords ?? 0} helper={strongestTerritory?.neighborhoodName ?? "Sem dados"} />
          </div>
          {(territorialQuality.pendingTerritorialReview > 0 || territorialQuality.unstructuredPlaces > 0 || territorialQuality.sensitivePlaces > 0) ? (
            <div className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm font-semibold text-amber-900">
              Dados territoriais em revisão: {territorialQuality.pendingTerritorialReview} escuta(s) pendente(s), {territorialQuality.unstructuredPlaces} com texto livre sem estrutura e {territorialQuality.sensitivePlaces} lugar(es) sensíveis ocultos.
            </div>
          ) : null}

          {filteredRecords.length === 0 ? (
            <EmptyTerritorialMap />
          ) : (
            <div className="mt-5 grid gap-5 xl:grid-cols-[1.3fr_0.7fr]">
              <section className="rounded-3xl border border-white/80 bg-white/78 p-5 shadow-soft">
                <div className="mb-5 flex items-center justify-between gap-3">
                  <div>
                    <h3 className="text-lg font-semibold text-semear-green">Mapa-lista territorial</h3>
                    <p className="mt-1 text-sm text-stone-600">Cards ordenados pelo volume de escutas no recorte atual.</p>
                  </div>
                  <span className="rounded-full bg-semear-green-soft px-3 py-1 text-xs font-semibold text-semear-green">
                    Mapa-lista sem precisão geográfica
                  </span>
                </div>

                <div className="grid gap-4 lg:grid-cols-2">
                  {territorialCards.map((card) => (
                    <article
                      className={`rounded-[1.75rem] border p-5 shadow-sm transition ${getIntensityClasses(card.totalRecords, maxRecords)}`}
                      key={card.neighborhoodId}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-semear-earth">Bairro</p>
                          <h4 className="mt-2 text-2xl font-semibold tracking-tight text-semear-green">{card.neighborhoodName}</h4>
                          <span className={`mt-2 inline-flex rounded-full px-3 py-1 text-xs font-semibold ${card.qualityRecommendation === "bom para mapa interno" ? "bg-green-50 text-green-800" : "bg-amber-50 text-amber-900"}`}>
                            {card.qualityRecommendation === "bom para mapa interno" ? "pronto para mapa interno" : "dados territoriais em revisão"}
                          </span>
                        </div>
                        <div className="rounded-2xl bg-white/80 px-3 py-2 text-right shadow-sm">
                          <span className="block text-xs font-semibold uppercase tracking-[0.12em] text-stone-500">Escutas</span>
                          <strong className="text-2xl font-semibold text-semear-green">{card.totalRecords}</strong>
                        </div>
                      </div>

                      <div className="mt-4 h-3 overflow-hidden rounded-full bg-white/75">
                        <div className="h-3 rounded-full bg-semear-green" style={{ width: `${getIntensityWidth(card.totalRecords, maxRecords)}%` }} />
                      </div>

                      <div className="mt-5 grid gap-4 sm:grid-cols-2">
                        <InfoBlock
                          icon={<Tag className="h-4 w-4" />}
                          title="Temas mais citados"
                          empty="Ainda não há temas marcados neste bairro."
                          items={card.topThemes.map((item) => `${item.name} (${item.count})`)}
                        />
                        <InfoBlock
                          icon={<MapPinned className="h-4 w-4" />}
                          title="Lugares estruturados"
                          empty="Nenhum lugar estruturado seguro neste bairro."
                          items={card.topPlaces.map((item) => `${item.name} (${item.count})`)}
                        />
                      </div>

                      <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-semear-gray/70 pt-4 text-sm text-stone-600">
                        <span>Última escuta: {card.latestDate ? formatDate(card.latestDate) : "Sem registro"}</span>
                        <span>{card.totalPlaces} estruturados · {card.freeTextPlaces} em texto livre</span>
                      </div>
                    </article>
                  ))}
                </div>
              </section>

              <div className="space-y-5">
                <Panel title="Ranking geral de temas" icon={<Tag className="h-5 w-5" />}>
                  {overallThemeRanking.length > 0 ? (
                    <div className="space-y-4">
                      {overallThemeRanking.slice(0, 8).map((item) => (
                        <div key={item.name}>
                          <div className="mb-2 flex items-center justify-between gap-3 text-sm">
                            <span className="font-semibold text-semear-green">{item.name}</span>
                            <span className="text-stone-600">{item.count}</span>
                          </div>
                          <div className="h-3 rounded-full bg-semear-green-soft">
                            <div
                              className="h-3 rounded-full bg-semear-green"
                              style={{ width: `${(item.count / Math.max(overallThemeRanking[0]?.count ?? 1, 1)) * 100}%` }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <PedagogicEmpty text="Marque temas nas escutas para formar um ranking territorial comparável." />
                  )}
                </Panel>

                <Panel title="Leitura do recorte" icon={<Compass className="h-5 w-5" />}>
                  <div className="space-y-3 text-sm leading-6 text-stone-700">
                    <p>
                      O mapa-lista prioriza bairros com maior volume de escutas e mantém visíveis os demais para evitar apagamento territorial. Lugares sensíveis ficam ocultos, nomes normalizados aparecem antes do texto livre e não há coordenada ou ponto individual.
                    </p>
                    <p>
                      Antes de qualquer camada geográfica, revise lugares em texto livre e conclua a revisão territorial. Há {freeTextPlacesCount} escuta(s) com lugares em texto livre no recorte.
                    </p>
                  </div>
                </Panel>

                <Panel title="Acessos rápidos" icon={<Route className="h-5 w-5" />}>
                  <div className="space-y-3">
                    <Link className="block rounded-2xl border border-semear-gray bg-white px-4 py-3 text-sm font-semibold text-semear-green transition hover:border-semear-green/30" href="/escutas">
                      Ver todas as escutas
                    </Link>
                    <Link className="block rounded-2xl border border-semear-gray bg-white px-4 py-3 text-sm font-semibold text-semear-green transition hover:border-semear-green/30" href="/territorios">
                      Abrir módulo de territórios
                    </Link>
                  </div>
                </Panel>
              </div>
            </div>
          )}
        </>
      ) : null}
    </section>
  );
}

function MetricCard({ icon, label, value, helper }: { icon: ReactNode; label: string; value: number; helper?: string }) {
  return (
    <article className="rounded-3xl border border-white/80 bg-white p-5 shadow-soft">
      <div className="mb-5 flex h-11 w-11 items-center justify-center rounded-2xl bg-semear-green text-white">{icon}</div>
      <p className="text-sm font-medium text-stone-600">{label}</p>
      <strong className="mt-2 block text-4xl font-semibold tracking-tight text-semear-green">{value}</strong>
      {helper ? <p className="mt-2 text-sm text-stone-500">{helper}</p> : null}
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

function InfoBlock({ icon, title, items, empty }: { icon: ReactNode; title: string; items: string[]; empty: string }) {
  return (
    <div className="rounded-2xl bg-white/70 p-4">
      <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-semear-green">
        {icon}
        {title}
      </div>
      {items.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          {items.slice(0, 4).map((item) => (
            <span className="rounded-full bg-semear-offwhite px-3 py-1 text-xs font-semibold text-stone-700" key={item}>
              {item}
            </span>
          ))}
        </div>
      ) : (
        <p className="text-sm leading-6 text-stone-600">{empty}</p>
      )}
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

function EmptyTerritorialMap() {
  return (
    <div className="mt-5 rounded-[1.5rem] border border-dashed border-semear-green/25 bg-semear-offwhite p-8 text-center">
      <h3 className="text-lg font-semibold text-semear-green">Ainda não há escutas para mapear</h3>
      <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-stone-600">
        Cadastre escutas com bairro e temas para que o mapa-lista territorial comece a mostrar intensidade e padrões locais.
      </p>
    </div>
  );
}

function buildTerritorialCards(neighborhoods: Neighborhood[], records: RecordWithRelations[]): TerritorialCard[] {
  const groupedRecords = new Map<string, RecordWithRelations[]>();
  const qualityByNeighborhood = new Map(buildTerritorialQualityByNeighborhood(neighborhoods, records as TerritorialReviewRecord[]).map((item) => [item.neighborhoodId, item.recommendation]));

  records.forEach((record) => {
    if (!record.neighborhood_id) return;
    const current = groupedRecords.get(record.neighborhood_id) ?? [];
    current.push(record);
    groupedRecords.set(record.neighborhood_id, current);
  });

  return neighborhoods
    .map((neighborhood) => {
      const neighborhoodRecords = groupedRecords.get(neighborhood.id) ?? [];
      const topThemes = countThemes(neighborhoodRecords).slice(0, 3);
      const topPlaces = countPlaces(neighborhoodRecords).slice(0, 4);

      return {
        neighborhoodId: neighborhood.id,
        neighborhoodName: neighborhood.name,
        totalRecords: neighborhoodRecords.length,
        totalPlaces: neighborhoodRecords.reduce((sum, record) => sum + countRecordPlaces(record).length, 0),
        freeTextPlaces: neighborhoodRecords.filter((record) => record.places_mentioned_text?.trim()).length,
        topThemes,
        topPlaces,
        latestDate: neighborhoodRecords[0]?.date ?? null,
        qualityRecommendation: qualityByNeighborhood.get(neighborhood.id) ?? "insuficiente"
      } satisfies TerritorialCard;
    })
    .sort((a, b) => b.totalRecords - a.totalRecords || a.neighborhoodName.localeCompare(b.neighborhoodName, "pt-BR"));
}

function countThemes(records: RecordWithRelations[]) {
  const map = new Map<string, number>();

  records.forEach((record) => {
    record.listening_record_themes.forEach((item) => {
      if (!item.themes?.name) return;
      map.set(item.themes.name, (map.get(item.themes.name) ?? 0) + 1);
    });
  });

  return Array.from(map.entries())
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name, "pt-BR"));
}

function countPlaces(records: RecordWithRelations[]) {
  const map = new Map<string, number>();

  records.forEach((record) => {
    countRecordPlaces(record).forEach((place) => {
      map.set(place, (map.get(place) ?? 0) + 1);
    });
  });

  return Array.from(map.entries())
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name, "pt-BR"));
}

function countRecordPlaces(record: RecordWithRelations) {
  const normalizedPlaces = new Set<string>();

  record.places_mentioned.filter((place) => !isSensitivePlace(place) && place.normalized_places?.visibility !== "sensitive").forEach((place) => {
    const value = normalizePlaceName(place.normalized_places?.normalized_name ?? place.place_name);
    if (value) normalizedPlaces.add(value);
  });

  return Array.from(normalizedPlaces);
}

function normalizePlaceName(value: string | null | undefined) {
  if (!value) return "";
  const normalized = value.trim().replace(/\s+/g, " ");
  if (!normalized) return "";
  return normalized.charAt(0).toUpperCase() + normalized.slice(1);
}

function getIntensityWidth(total: number, max: number) {
  if (total <= 0) return 6;
  return Math.max(14, Math.round((total / max) * 100));
}

function getIntensityClasses(total: number, max: number) {
  if (total === 0) return "border-semear-gray/70 bg-stone-50";
  const ratio = total / max;
  if (ratio >= 0.75) return "border-semear-green/30 bg-[#dff0d6]";
  if (ratio >= 0.4) return "border-semear-green/20 bg-[#edf6df]";
  return "border-semear-gray/70 bg-[#f7f5ea]";
}

function formatDate(value: string) {
  return new Date(`${value}T00:00:00`).toLocaleDateString("pt-BR");
}
