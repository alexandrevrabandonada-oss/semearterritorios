"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowRight, CalendarDays, FileText, MapPinned, Plus } from "lucide-react";
import type { Action, ListeningRecord, Neighborhood } from "@/lib/database.types";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";
import { collectAvailableMonths, formatMonthLabel, getMonthValue } from "@/lib/monthly-reports";

type ActionWithNeighborhood = Action & {
  neighborhoods: Pick<Neighborhood, "id" | "name"> | null;
};

type RecordWithNeighborhood = ListeningRecord & {
  neighborhoods: Pick<Neighborhood, "id" | "name"> | null;
};

export function MonthlyReportsHub() {
  const supabase = useMemo(() => createBrowserSupabaseClient(), []);
  const [actions, setActions] = useState<ActionWithNeighborhood[]>([]);
  const [records, setRecords] = useState<RecordWithNeighborhood[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let ignore = false;

    async function loadMonths() {
      if (!supabase) {
        setError("Configure NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_ANON_KEY para carregar os relatórios.");
        setLoading(false);
        return;
      }

      const [actionsResult, recordsResult] = await Promise.all([
        supabase.from("actions").select("*, neighborhoods:neighborhood_id(id, name)").order("action_date", { ascending: false }),
        supabase.from("listening_records").select("*, neighborhoods:neighborhood_id(id, name)").order("date", { ascending: false })
      ]);

      if (ignore) return;

      if (actionsResult.error || recordsResult.error) {
        setError(actionsResult.error?.message ?? recordsResult.error?.message ?? "Erro ao carregar os relatórios mensais.");
        setLoading(false);
        return;
      }

      setActions((actionsResult.data ?? []) as ActionWithNeighborhood[]);
      setRecords((recordsResult.data ?? []) as unknown as RecordWithNeighborhood[]);
      setLoading(false);
    }

    void loadMonths();

    return () => {
      ignore = true;
    };
  }, [supabase]);

  const availableMonths = collectAvailableMonths(actions, records);
  const latestMonth = availableMonths[0] ?? getMonthValue(new Date().toISOString());

  return (
    <section className="pb-10">
      <div className="rounded-[2rem] border border-white/80 bg-white/72 p-5 shadow-soft sm:p-7">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-semear-earth">Relatório mensal</p>
            <h2 className="mt-3 max-w-4xl text-3xl font-semibold tracking-tight text-semear-green sm:text-5xl">
              Sínteses mensais geradas a partir das ações e escutas já cadastradas.
            </h2>
            <p className="mt-4 max-w-3xl text-sm leading-6 text-stone-600">
              O relatório não usa IA: ele consolida volume, temas, prioridades, pendências e campos preenchidos pela equipe para formar um texto-base de devolutiva interna.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-semear-green px-5 text-sm font-semibold text-white" href="/relatorios/novo">
              <Plus className="h-4 w-4" aria-hidden="true" />
              Novo relatório
            </Link>
            <Link className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full border border-semear-green/15 bg-white/70 px-5 text-sm font-semibold text-semear-green" href={`/relatorios/${latestMonth}`}>
              <FileText className="h-4 w-4" aria-hidden="true" />
              Abrir último mês
            </Link>
          </div>
        </div>
      </div>

      {loading ? <StateBox>Carregando meses disponíveis...</StateBox> : null}
      {error ? <StateBox tone="error">{error}</StateBox> : null}

      {!loading && !error ? (
        availableMonths.length > 0 ? (
          <div className="mt-5 grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
            {availableMonths.map((month) => {
              const monthActions = actions.filter((item) => getMonthValue(item.action_date) === month);
              const monthRecords = records.filter((item) => getMonthValue(item.date) === month);
              const neighborhoodsCount = new Set([
                ...monthActions.map((item) => item.neighborhoods?.name).filter(Boolean),
                ...monthRecords.map((item) => item.neighborhoods?.name).filter(Boolean)
              ]).size;

              return (
                <Link className="rounded-3xl border border-white/80 bg-white p-5 shadow-soft transition hover:-translate-y-0.5 hover:border-semear-green/25" href={`/relatorios/${month}`} key={month}>
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.12em] text-semear-earth">Mês de referência</p>
                      <h3 className="mt-2 text-2xl font-semibold tracking-tight text-semear-green">{formatMonthLabel(month)}</h3>
                    </div>
                    <ArrowRight className="h-5 w-5 text-semear-green" aria-hidden="true" />
                  </div>

                  <div className="mt-5 grid gap-3 sm:grid-cols-3">
                    <StatChip icon={<CalendarDays className="h-4 w-4" />} label="Ações" value={monthActions.length} />
                    <StatChip icon={<FileText className="h-4 w-4" />} label="Escutas" value={monthRecords.length} />
                    <StatChip icon={<MapPinned className="h-4 w-4" />} label="Bairros" value={neighborhoodsCount} />
                  </div>
                </Link>
              );
            })}
          </div>
        ) : (
          <div className="mt-5 rounded-[1.5rem] border border-dashed border-semear-green/25 bg-semear-offwhite p-8 text-center">
            <h3 className="text-lg font-semibold text-semear-green">Ainda não há meses disponíveis</h3>
            <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-stone-600">
              Cadastre ações e escutas com data para que o módulo mensal consiga organizar os relatórios por mês e ano.
            </p>
          </div>
        )
      ) : null}
    </section>
  );
}

function StatChip({ icon, label, value }: { icon: React.ReactNode; label: string; value: number }) {
  return (
    <div className="rounded-2xl bg-semear-offwhite p-3">
      <div className="flex items-center gap-2 text-sm font-semibold text-semear-green">{icon}{label}</div>
      <strong className="mt-2 block text-2xl font-semibold tracking-tight text-semear-green">{value}</strong>
    </div>
  );
}

function StateBox({ children, tone = "neutral" }: { children: React.ReactNode; tone?: "neutral" | "error" }) {
  return <div className={`mt-5 rounded-[1.5rem] p-6 text-sm shadow-soft ${tone === "error" ? "border border-red-200 bg-red-50 text-red-800" : "bg-white/72 text-stone-600"}`}>{children}</div>;
}