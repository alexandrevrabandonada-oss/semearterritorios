"use client";

import { useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { AlertTriangle, ClipboardList, MapPinned, ShieldCheck } from "lucide-react";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";
import type { Neighborhood } from "@/lib/database.types";
import { getNeighborhoodSectorLabel, getNeighborhoodStatusLabel, neighborhoodSectorOptions, neighborhoodStatusOptions, sortNeighborhoodsBySectorAndName } from "@/lib/neighborhoods";

type TerritoryUsageSummary = {
  neighborhoodsTotal: number;
  neighborhoodsWithActions: number;
  neighborhoodsWithRecords: number;
  neighborhoodsWithRespondentRef: number;
  territoriesWithoutUsage: number;
  actionsTotal: number;
  recordsTotal: number;
  recordsWithRespondentRef: number;
  officialCount: number;
  provisionalCount: number;
  provisionalWithLink: number;
  provisionalWithoutLink: number;
  respondentByNeighborhood: Map<string, number>;
  actionByNeighborhood: Map<string, number>;
};

const emptySummary: TerritoryUsageSummary = {
  neighborhoodsTotal: 0,
  neighborhoodsWithActions: 0,
  neighborhoodsWithRecords: 0,
  neighborhoodsWithRespondentRef: 0,
  territoriesWithoutUsage: 0,
  actionsTotal: 0,
  recordsTotal: 0,
  recordsWithRespondentRef: 0,
  officialCount: 0,
  provisionalCount: 0,
  provisionalWithLink: 0,
  provisionalWithoutLink: 0,
  respondentByNeighborhood: new Map(),
  actionByNeighborhood: new Map()
};

export function TerritoriesAdminOverview() {
  const supabase = useMemo(() => createBrowserSupabaseClient(), []);
  const [summary, setSummary] = useState<TerritoryUsageSummary>(emptySummary);
  const [neighborhoods, setNeighborhoods] = useState<Neighborhood[]>([]);
  const [sectorFilter, setSectorFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [cityFilter, setCityFilter] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let ignore = false;

    async function load() {
      if (!supabase) {
        setError("Configure NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_ANON_KEY para ver o uso territorial do banco remoto.");
        setLoading(false);
        return;
      }

      const [neighborhoodsResult, actionsResult, recordsResult] = await Promise.all([
        supabase.from("neighborhoods").select("*").order("name", { ascending: true }),
        supabase.from("actions").select("id, neighborhood_id").order("created_at", { ascending: false }),
        supabase.from("listening_records").select("id, neighborhood_id, respondent_neighborhood_id").order("created_at", { ascending: false })
      ]);

      if (ignore) return;

      if (neighborhoodsResult.error || actionsResult.error || recordsResult.error) {
        setError(neighborhoodsResult.error?.message ?? actionsResult.error?.message ?? recordsResult.error?.message ?? "Erro ao carregar resumo territorial.");
        setLoading(false);
        return;
      }

      const neighborhoods = neighborhoodsResult.data ?? [];
      const actions = actionsResult.data ?? [];
      const records = recordsResult.data ?? [];
      const actionNeighborhoods = new Set(actions.map((item) => item.neighborhood_id).filter(Boolean));
      const recordNeighborhoods = new Set(records.map((item) => item.neighborhood_id).filter(Boolean));
      const usedNeighborhoods = new Set(Array.from(actionNeighborhoods).concat(Array.from(recordNeighborhoods)));
      const provisionalNeighborhoods = neighborhoods.filter((item) => item.status !== "oficial");
      const provisionalWithLink = provisionalNeighborhoods.filter((item) => usedNeighborhoods.has(item.id)).length;

      const respondentByNeighborhood = new Map<string, number>();
      const actionByNeighborhood = new Map<string, number>();
      for (const r of records) {
        if (r.respondent_neighborhood_id) respondentByNeighborhood.set(r.respondent_neighborhood_id, (respondentByNeighborhood.get(r.respondent_neighborhood_id) ?? 0) + 1);
        if (r.neighborhood_id) actionByNeighborhood.set(r.neighborhood_id, (actionByNeighborhood.get(r.neighborhood_id) ?? 0) + 1);
      }

      setSummary({
        neighborhoodsTotal: neighborhoods.length,
        neighborhoodsWithActions: actionNeighborhoods.size,
        neighborhoodsWithRecords: recordNeighborhoods.size,
        neighborhoodsWithRespondentRef: respondentByNeighborhood.size,
        territoriesWithoutUsage: Math.max(neighborhoods.length - usedNeighborhoods.size, 0),
        actionsTotal: actions.length,
        recordsTotal: records.length,
        recordsWithRespondentRef: records.filter((r) => r.respondent_neighborhood_id).length,
        officialCount: neighborhoods.filter((item) => item.status === "oficial").length,
        provisionalCount: provisionalNeighborhoods.length,
        provisionalWithLink,
        provisionalWithoutLink: provisionalNeighborhoods.length - provisionalWithLink,
        respondentByNeighborhood,
        actionByNeighborhood
      });
      setNeighborhoods(sortNeighborhoodsBySectorAndName((neighborhoodsResult.data ?? []) as Neighborhood[]));
      setLoading(false);
    }

    void load();

    return () => {
      ignore = true;
    };
  }, [supabase]);

  if (loading) return <StateBox>Carregando uso territorial...</StateBox>;
  if (error) return <StateBox tone="error">{error}</StateBox>;

  const provisional = summary.actionsTotal === 0 && summary.recordsTotal === 0;
  const filteredNeighborhoods = neighborhoods.filter((neighborhood) => {
    if (sectorFilter && neighborhood.sector !== sectorFilter) return false;
    if (statusFilter && neighborhood.status !== statusFilter) return false;
    if (cityFilter && neighborhood.city !== cityFilter) return false;
    return true;
  });
  const cities = Array.from(new Set(neighborhoods.map((item) => item.city).filter(Boolean))).sort((a, b) => String(a).localeCompare(String(b), "pt-BR"));

  return (
    <section className="mt-6 rounded-[2rem] border border-white/80 bg-white p-5 shadow-soft">
      <div className="flex items-start gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-semear-green-soft text-semear-green">
          <MapPinned className="h-5 w-5" aria-hidden="true" />
        </div>
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-semear-earth">Lista territorial em validação</p>
          <h3 className="mt-2 text-2xl font-semibold text-semear-green">Painel administrativo de territórios</h3>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-stone-600">
            Valide a lista oficial antes de ampliar o uso. Territórios servem para agregação territorial, não para localizar pessoas, casas ou pontos individuais.
          </p>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-stone-600">
            A lista oficial tem 52 bairros no CSV conferido. Após aplicar as migrations, setor, região e código oficial ficam em campos estruturados para relatórios e futuro mapa interno.
          </p>
        </div>
      </div>

      <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <Metric icon={<MapPinned className="h-5 w-5" />} label="Total de territórios" value={summary.neighborhoodsTotal} />
        <Metric icon={<ShieldCheck className="h-5 w-5" />} label="Oficiais" value={summary.officialCount} />
        <Metric icon={<AlertTriangle className="h-5 w-5" />} label="Sem uso" value={summary.territoriesWithoutUsage} />
        <Metric icon={<ClipboardList className="h-5 w-5" />} label="Com ações" value={summary.neighborhoodsWithActions} />
        <Metric icon={<ShieldCheck className="h-5 w-5" />} label="Com escutas" value={summary.neighborhoodsWithRecords} />
      </div>

      {summary.recordsWithRespondentRef > 0 && (
        <div className="mt-5 rounded-2xl border border-blue-200 bg-blue-50 p-4">
          <p className="mb-2 text-sm font-semibold text-blue-900">Escutas por território de referência do entrevistado</p>
          <p className="mb-3 text-xs text-blue-700">{summary.recordsWithRespondentRef} de {summary.recordsTotal} escutas ({Math.round(summary.recordsWithRespondentRef / summary.recordsTotal * 100)}%) têm território de referência registrado — {summary.neighborhoodsWithRespondentRef} bairro(s) distintos.</p>
          <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
            {Array.from(summary.respondentByNeighborhood.entries())
              .sort((a, b) => b[1] - a[1])
              .map(([neighborhoodId, count]) => {
                const n = neighborhoods.find((item) => item.id === neighborhoodId);
                const actionCount = summary.actionByNeighborhood.get(neighborhoodId) ?? 0;
                return (
                  <div className="flex items-center justify-between rounded-xl border border-blue-200 bg-white px-3 py-2 text-sm" key={neighborhoodId}>
                    <span className="font-medium text-semear-green">{n?.name ?? neighborhoodId}</span>
                    <div className="flex items-center gap-2 text-xs">
                      <span className="rounded-full bg-blue-100 px-2 py-0.5 text-blue-800">{count} ref.</span>
                      {actionCount > 0 && <span className="rounded-full bg-semear-green-soft px-2 py-0.5 text-semear-green">{actionCount} ação</span>}
                    </div>
                  </div>
                );
              })}
          </div>
        </div>
      )}

      <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Metric icon={<ShieldCheck className="h-5 w-5" />} label="Bairros oficiais" value={summary.officialCount} tone="green" />
        <Metric icon={<AlertTriangle className="h-5 w-5" />} label="Territórios provisórios" value={summary.provisionalCount} tone="amber" />
        <Metric icon={<AlertTriangle className="h-5 w-5" />} label="Provisórios com vínculo" value={summary.provisionalWithLink} tone="amber" />
        <Metric icon={<ShieldCheck className="h-5 w-5" />} label="Provisórios sem vínculo" value={summary.provisionalWithoutLink} tone="neutral" />
      </div>

      <div className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-950">
        <strong>Territórios provisórios estão ocultos dos formulários operacionais.</strong>{" "}
        Apenas os {summary.officialCount} bairros oficiais aparecem nos selects de ações, escutas e filtros.
        Os {summary.provisionalCount} territórios provisórios permanecem nesta área administrativa para revisão futura.
        <span className="mt-2 block text-amber-800">
          Qualquer limpeza futura deve ser feita por migration própria e revisão humana.
          Nenhum território foi apagado automaticamente. Documento de referência: docs/decisao-territorios-provisorios.md.
        </span>
      </div>

      <div className={`mt-5 rounded-2xl border p-4 text-sm leading-6 ${provisional ? "border-amber-200 bg-amber-50 text-amber-950" : "border-green-200 bg-green-50 text-green-900"}`}>
        <strong>{provisional ? "Lista operacional/provisória." : "Lista em uso ativo."}</strong> {provisional
          ? "Ainda não há ações nem escutas vinculadas. Este é o momento mais seguro para validar ou substituir a lista territorial oficial antes da primeira operação real."
          : "Já existem vínculos operacionais. Qualquer substituição precisa passar por checagem segura antes de limpeza."}
        <span className="mt-2 block">Documento de apoio: docs/validacao-lista-oficial-territorios.md.</span>
      </div>

      <div className="mt-5 rounded-2xl border border-semear-gray bg-semear-offwhite p-4">
        <div className="grid gap-3 md:grid-cols-3">
          <FilterSelect label="Setor" value={sectorFilter} onChange={setSectorFilter}>
            <option value="">Todos</option>
            {neighborhoodSectorOptions.map((option) => <option key={option.value} value={option.value}>{option.value} - {option.label}</option>)}
          </FilterSelect>
          <FilterSelect label="Status" value={statusFilter} onChange={setStatusFilter}>
            <option value="">Todos</option>
            {neighborhoodStatusOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
          </FilterSelect>
          <FilterSelect label="Cidade" value={cityFilter} onChange={setCityFilter}>
            <option value="">Todas</option>
            {cities.map((city) => <option key={city} value={city ?? ""}>{city}</option>)}
          </FilterSelect>
        </div>
      </div>

      <div className="mt-5 overflow-hidden rounded-2xl border border-semear-gray bg-white">
        <div className="grid grid-cols-12 gap-2 border-b border-semear-gray bg-semear-offwhite px-4 py-3 text-xs font-semibold uppercase tracking-[0.12em] text-stone-500">
          <span className="col-span-4">Nome</span>
          <span className="col-span-2">Cidade</span>
          <span className="col-span-1">Setor</span>
          <span className="col-span-2">Região</span>
          <span className="col-span-1">Código</span>
          <span className="col-span-2">Status</span>
        </div>
        {filteredNeighborhoods.map((neighborhood) => (
          <div className="grid grid-cols-12 gap-2 border-b border-semear-gray px-4 py-3 text-sm last:border-b-0" key={neighborhood.id}>
            <strong className="col-span-4 text-semear-green">{neighborhood.name}</strong>
            <span className="col-span-2 text-stone-600">{neighborhood.city ?? "Sem cidade"}</span>
            <span className="col-span-1 text-stone-700">{neighborhood.sector ?? "-"}</span>
            <span className="col-span-2 text-stone-600">{neighborhood.region ?? getNeighborhoodSectorLabel(neighborhood.sector)}</span>
            <span className="col-span-1 text-stone-700">{neighborhood.official_code ?? "-"}</span>
            <span className={`col-span-2 font-semibold ${neighborhood.status === "oficial" ? "text-semear-green" : "text-amber-800"}`}>
              {getNeighborhoodStatusLabel(neighborhood.status)}
              {neighborhood.status !== "oficial" ? " · revisar" : ""}
            </span>
          </div>
        ))}
      </div>
    </section>
  );
}

function Metric({ icon, label, value, tone = "neutral" }: { icon: ReactNode; label: string; value: number; tone?: "neutral" | "green" | "amber" }) {
  const valueColor = tone === "green" ? "text-semear-green" : tone === "amber" ? "text-amber-700" : "text-semear-green";
  return (
    <article className="rounded-3xl border border-semear-gray bg-semear-offwhite p-4">
      <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-2xl bg-white text-semear-green">{icon}</div>
      <p className="text-sm text-stone-600">{label}</p>
      <strong className={`mt-2 block text-3xl font-semibold ${valueColor}`}>{value}</strong>
    </article>
  );
}

function StateBox({ children, tone = "neutral" }: { children: ReactNode; tone?: "neutral" | "error" }) {
  return <div className={`mt-6 rounded-[1.5rem] p-5 text-sm shadow-soft ${tone === "error" ? "border border-red-200 bg-red-50 text-red-800" : "bg-white/72 text-stone-600"}`}>{children}</div>;
}

function FilterSelect({ label, value, onChange, children }: { label: string; value: string; onChange: (value: string) => void; children: ReactNode }) {
  return (
    <label>
      <span className="text-xs font-semibold uppercase tracking-[0.12em] text-stone-500">{label}</span>
      <select className="mt-2 min-h-11 w-full rounded-2xl border border-semear-gray bg-white px-3 text-sm outline-none focus:border-semear-green" value={value} onChange={(event) => onChange(event.target.value)}>
        {children}
      </select>
    </label>
  );
}
