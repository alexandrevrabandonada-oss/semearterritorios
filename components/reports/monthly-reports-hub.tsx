"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowRight, CalendarDays, FileText, MapPinned, Plus, LibraryBig, ShieldCheck, Clock3 } from "lucide-react";
import type { Action, ListeningRecord, Neighborhood, WeeklyTeamReport, ProjectMemoryEntry } from "@/lib/database.types";
import { extractHighlights } from "@/lib/project-memory";
import { formatWeekTitle } from "@/lib/team-calendar";
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
  const [weeklyReports, setWeeklyReports] = useState<WeeklyTeamReport[]>([]);
  const [memoryEntries, setMemoryEntries] = useState<ProjectMemoryEntry[]>([]);
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

      const [actionsResult, recordsResult, weeklyReportsResult, entriesResult] = await Promise.all([
        supabase.from("actions").select("*, neighborhoods:neighborhood_id(id, name)").order("action_date", { ascending: false }),
        supabase.from("listening_records").select("*, neighborhoods:neighborhood_id(id, name)").order("date", { ascending: false }),
        supabase.from("weekly_team_reports").select("*").order("week_start", { ascending: false }),
        supabase.from("project_memory_entries").select("*").order("entry_date", { ascending: false })
      ]);

      if (ignore) return;

      if (actionsResult.error || recordsResult.error || weeklyReportsResult.error) {
        setError(actionsResult.error?.message ?? recordsResult.error?.message ?? weeklyReportsResult.error?.message ?? "Erro ao carregar os relatórios mensais.");
        setLoading(false);
        return;
      }

      setActions((actionsResult.data ?? []) as ActionWithNeighborhood[]);
      setRecords((recordsResult.data ?? []) as unknown as RecordWithNeighborhood[]);
      setWeeklyReports((weeklyReportsResult.data ?? []) as WeeklyTeamReport[]);
      setMemoryEntries((entriesResult.data ?? []) as ProjectMemoryEntry[]);
      setLoading(false);
    }

    void loadMonths();

    return () => {
      ignore = true;
    };
  }, [supabase]);

  const availableMonths = collectAvailableMonths(actions, records);
  const latestMonth = availableMonths[0] ?? getMonthValue(new Date().toISOString());
  const latestWeeklyReports = weeklyReports.filter((report) => getMonthValue(report.week_start) === latestMonth);
  const latestApprovedWeeklyReports = latestWeeklyReports.filter((report) => report.status === "approved");
  const latestPendingWeeklyReports = latestWeeklyReports.filter((report) => ["draft", "submitted", "in_review", "needs_changes"].includes(report.status));
  const weeklyLearnings = extractHighlights(latestApprovedWeeklyReports, "learnings");
  const weeklyProblems = extractHighlights(latestApprovedWeeklyReports, "problems_found");
  const weeklyNextSteps = extractHighlights(latestApprovedWeeklyReports, "next_steps");

  const latestMemoryEntries = memoryEntries.filter((entry) => getMonthValue(entry.entry_date) === latestMonth);
  const memoryStats = {
    total: latestMemoryEntries.length,
    public: latestMemoryEntries.filter(e => e.visibility === 'public_approved').length,
    candidate: latestMemoryEntries.filter(e => e.visibility === 'public_candidate').length,
    internal: latestMemoryEntries.filter(e => e.visibility === 'internal').length,
  };

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
            <Link className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full border border-semear-green/15 bg-white/70 px-5 text-sm font-semibold text-semear-green" href={`/agenda/novo?eventType=relatorio_semanal&title=${encodeURIComponent(`Entrega dos relatórios semanais — ${formatWeekTitle(new Date().toISOString().slice(0, 10))}`)}&startsAt=${new Date().toISOString().slice(0, 10)}T00:00&endsAt=${new Date().toISOString().slice(0, 10)}T23:59&allDay=1`}>
              <CalendarDays className="h-4 w-4" aria-hidden="true" />
              Agendar prazo de relatório semanal
            </Link>
            <Link className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full border border-semear-green/15 bg-white/70 px-5 text-sm font-semibold text-semear-green" href={`/relatorios/${latestMonth}`}>
              <FileText className="h-4 w-4" aria-hidden="true" />
              Abrir último mês
            </Link>
          </div>
        </div>
      </div>

      {!loading && !error ? (
        <section className="mt-5 rounded-[2rem] border border-white/80 bg-white p-5 shadow-soft sm:p-6">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-semear-earth">Relatórios semanais da equipe</p>
              <h3 className="mt-2 text-2xl font-semibold text-semear-green">Base complementar para memória do projeto e prestação de contas</h3>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-stone-600">
                Este bloco consolida os relatórios internos do mês de referência sem expor anexos publicamente.
              </p>
            </div>
            <Link className="inline-flex min-h-11 items-center justify-center rounded-full border border-semear-green/15 bg-white px-4 text-sm font-semibold text-semear-green" href="/memoria">
              Abrir memória do projeto
            </Link>
          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-3">
            <StatChip icon={<FileText className="h-4 w-4" />} label="Total no período" value={latestWeeklyReports.length} />
            <StatChip icon={<CalendarDays className="h-4 w-4" />} label="Aprovados" value={latestApprovedWeeklyReports.length} />
            <StatChip icon={<MapPinned className="h-4 w-4" />} label="Pendentes" value={latestPendingWeeklyReports.length} />
          </div>

          <div className="mt-5 grid gap-4 lg:grid-cols-3">
            <InsightList title="Principais aprendizados" items={weeklyLearnings} emptyText="Nenhum aprendizado destacado ainda." />
            <InsightList title="Principais problemas" items={weeklyProblems} emptyText="Nenhum problema consolidado ainda." />
            <InsightList title="Principais encaminhamentos" items={weeklyNextSteps} emptyText="Nenhum encaminhamento consolidado ainda." />
          </div>

          <div className="mt-6 border-t border-semear-gray pt-6">
            <h4 className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-semear-green">
              <LibraryBig className="h-4 w-4" />
              Memória curada no período
            </h4>
            <div className="mt-4 grid gap-3 sm:grid-cols-4">
              <StatChip icon={<LibraryBig className="h-4 w-4" />} label="Entradas totais" value={memoryStats.total} />
              <StatChip icon={<ShieldCheck className="h-4 w-4" />} label="Aprovadas públicas" value={memoryStats.public} />
              <StatChip icon={<Clock3 className="h-4 w-4" />} label="Candidatas públicas" value={memoryStats.candidate} />
              <StatChip icon={<FileText className="h-4 w-4" />} label="Internas" value={memoryStats.internal} />
            </div>
            {memoryStats.total > 0 && (
              <div className="mt-4 flex flex-wrap gap-2">
                {latestMemoryEntries.slice(0, 5).map(e => (
                  <span key={e.id} className="rounded-full bg-semear-offwhite px-3 py-1 text-xs font-medium text-stone-600">
                    {e.title}
                  </span>
                ))}
                {memoryStats.total > 5 && <span className="text-xs text-stone-400 self-center">+{memoryStats.total - 5} mais</span>}
              </div>
            )}
          </div>
        </section>
      ) : null}

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

function InsightList({ title, items, emptyText }: { title: string; items: string[]; emptyText: string }) {
  return (
    <section className="rounded-2xl border border-semear-gray bg-semear-offwhite p-4">
      <h4 className="font-semibold text-semear-green">{title}</h4>
      {items.length > 0 ? (
        <ul className="mt-3 space-y-2 text-sm leading-6 text-stone-700">
          {items.map((item) => (
            <li className="rounded-xl bg-white px-3 py-2" key={item}>{item}</li>
          ))}
        </ul>
      ) : (
        <p className="mt-3 text-sm text-stone-500">{emptyText}</p>
      )}
    </section>
  );
}
