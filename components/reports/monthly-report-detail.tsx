"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  AlertCircle,
  CalendarDays,
  ClipboardList,
  Copy,
  Download,
  FileText,
  Layers3,
  MapPinned,
  MessageSquareText,
  Tag
} from "lucide-react";
import type { ReactNode } from "react";
import type { Action, ListeningRecord, Neighborhood, Theme } from "@/lib/database.types";
import { getActionTypeLabel } from "@/lib/actions";
import { getReviewStatusLabel, getSourceTypeLabel } from "@/lib/listening-records";
import {
  buildMonthlyReportData,
  buildMonthlyReportMarkdown,
  buildMonthlyReportPlainText,
  buildMonthlyReportCsv,
  formatMonthLabel,
  isMonthValue,
  type MonthlyReportData
} from "@/lib/monthly-reports";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";

type ActionWithNeighborhood = Action & {
  neighborhoods: Pick<Neighborhood, "id" | "name"> | null;
};

type RecordWithRelations = ListeningRecord & {
  actions: Pick<Action, "id" | "title" | "action_type"> | null;
  neighborhoods: Pick<Neighborhood, "id" | "name"> | null;
  listening_record_themes: Array<{ themes: Pick<Theme, "id" | "name"> | null }>;
};

type MonthlyReportDetailProps = {
  month: string;
};

export function MonthlyReportDetail({ month }: MonthlyReportDetailProps) {
  const supabase = useMemo(() => createBrowserSupabaseClient(), []);
  const [actions, setActions] = useState<ActionWithNeighborhood[]>([]);
  const [records, setRecords] = useState<RecordWithRelations[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);

  useEffect(() => {
    let ignore = false;

    async function loadReportData() {
      if (!isMonthValue(month)) {
        setError("Mês inválido. Use o formato AAAA-MM.");
        setLoading(false);
        return;
      }

      if (!supabase) {
        setError("Configure NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_ANON_KEY para gerar relatórios.");
        setLoading(false);
        return;
      }

      const [actionsResult, recordsResult] = await Promise.all([
        supabase.from("actions").select("*, neighborhoods:neighborhood_id(id, name)").gte("action_date", `${month}-01`).lt("action_date", nextMonth(month)).order("action_date", { ascending: true }),
        supabase.from("listening_records").select("*, actions:action_id(id, title, action_type), neighborhoods:neighborhood_id(id, name), listening_record_themes(themes:theme_id(id, name))").gte("date", `${month}-01`).lt("date", nextMonth(month)).order("date", { ascending: true })
      ]);

      if (ignore) return;

      if (actionsResult.error || recordsResult.error) {
        setError(actionsResult.error?.message ?? recordsResult.error?.message ?? "Erro ao gerar o relatório mensal.");
        setLoading(false);
        return;
      }

      setActions((actionsResult.data ?? []) as ActionWithNeighborhood[]);
      setRecords((recordsResult.data ?? []) as RecordWithRelations[]);
      setLoading(false);
    }

    void loadReportData();

    return () => {
      ignore = true;
    };
  }, [month, supabase]);

  const report = useMemo<MonthlyReportData>(() => buildMonthlyReportData(month, actions, records), [actions, month, records]);
  const plainText = useMemo(() => buildMonthlyReportPlainText(report), [report]);
  const markdown = useMemo(() => buildMonthlyReportMarkdown(report), [report]);

  async function copyContent(content: string, label: string) {
    try {
      await navigator.clipboard.writeText(content);
      setFeedback(`${label} copiado.`);
    } catch {
      setFeedback(`Não foi possível copiar ${label.toLowerCase()}.`);
    }
  }

  function exportCsv() {
    const csv = buildMonthlyReportCsv(report);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `relatorio-mensal-${month}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    setFeedback("CSV exportado.");
  }

  if (loading) {
    return <StateBox>Gerando relatório mensal...</StateBox>;
  }

  if (error) {
    return <StateBox tone="error">{error}</StateBox>;
  }

  return (
    <section className="pb-10">
      <div className="mb-5 flex flex-wrap gap-3">
        <Link className="inline-flex min-h-11 items-center gap-2 rounded-full border border-semear-green/15 bg-white/70 px-4 text-sm font-semibold text-semear-green transition hover:bg-white" href="/relatorios">
          Voltar para relatórios
        </Link>
        <Link className="inline-flex min-h-11 items-center gap-2 rounded-full border border-semear-green/15 bg-white/70 px-4 text-sm font-semibold text-semear-green transition hover:bg-white" href="/relatorios/novo">
          Gerar outro mês
        </Link>
      </div>

      <div className="rounded-[2rem] border border-white/80 bg-white/78 p-5 shadow-soft sm:p-8">
        <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-semear-earth">Relatório mensal</p>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight text-semear-green sm:text-5xl">{report.title}</h2>
            <p className="mt-4 max-w-3xl text-sm leading-6 text-stone-600">
              Texto-base gerado automaticamente a partir de ações, escutas, temas e campos de análise preenchidos pela equipe. Nenhum trecho abaixo foi produzido por IA generativa.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <button className="inline-flex min-h-11 items-center gap-2 rounded-full border border-semear-green/15 bg-white px-4 text-sm font-semibold text-semear-green" onClick={() => void copyContent(plainText, "Texto do relatório")} type="button">
              <Copy className="h-4 w-4" aria-hidden="true" />
              Copiar texto
            </button>
            <button className="inline-flex min-h-11 items-center gap-2 rounded-full border border-semear-green/15 bg-white px-4 text-sm font-semibold text-semear-green" onClick={() => void copyContent(markdown, "Markdown do relatório")} type="button">
              <FileText className="h-4 w-4" aria-hidden="true" />
              Copiar markdown
            </button>
            <button className="inline-flex min-h-11 items-center gap-2 rounded-full bg-semear-green px-4 text-sm font-semibold text-white" onClick={exportCsv} type="button">
              <Download className="h-4 w-4" aria-hidden="true" />
              Exportar CSV
            </button>
          </div>
        </div>
        {feedback ? <p className="mt-4 text-sm font-medium text-semear-green">{feedback}</p> : null}
      </div>

      <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <MetricCard icon={<ClipboardList className="h-5 w-5" />} label="Ações" value={report.totalActions} />
        <MetricCard icon={<MessageSquareText className="h-5 w-5" />} label="Escutas" value={report.totalRecords} />
        <MetricCard icon={<MapPinned className="h-5 w-5" />} label="Bairros" value={report.involvedNeighborhoods.length} />
        <MetricCard icon={<Tag className="h-5 w-5" />} label="Temas" value={report.topThemes.length} />
        <MetricCard icon={<Layers3 className="h-5 w-5" />} label="Pendências" value={report.pendingReviews.length} />
      </div>

      <div className="mt-5 grid gap-5 xl:grid-cols-[1.2fr_0.8fr]">
        <div className="space-y-5">
          <Panel title="Síntese de busca ativa" icon={<CalendarDays className="h-5 w-5" />}>
            <p className="text-sm leading-7 text-stone-700">{report.activeSearchSummary}</p>
          </Panel>

          <Panel title="Síntese pedagógica" icon={<FileText className="h-5 w-5" />}>
            <p className="text-sm leading-7 text-stone-700">{report.pedagogicalSummary}</p>
          </Panel>

          <Panel title="Markdown do relatório" icon={<FileText className="h-5 w-5" />}>
            <pre className="overflow-x-auto whitespace-pre-wrap rounded-2xl bg-semear-offwhite p-4 text-sm leading-6 text-stone-700">{markdown}</pre>
          </Panel>
        </div>

        <div className="space-y-5">
          <Panel title="Temas mais recorrentes" icon={<Tag className="h-5 w-5" />}>
            {report.topThemes.length > 0 ? <TagList items={report.topThemes.map((item) => `${item.name} (${item.count})`)} /> : <PedagogicEmpty text="Nenhum tema marcado nas escutas do mês." />}
          </Panel>

          <Panel title="Tipos de ação" icon={<ClipboardList className="h-5 w-5" />}>
            {report.actionTypeCounts.length > 0 ? <TagList items={report.actionTypeCounts.map((item) => `${item.name} (${item.count})`)} /> : <PedagogicEmpty text="Nenhuma ação registrada neste mês." />}
          </Panel>

          <Panel title="Prioridades apontadas" icon={<AlertCircle className="h-5 w-5" />}>
            {report.priorities.length > 0 ? <TagList items={report.priorities.map((item) => `${item.name} (${item.count})`)} /> : <PedagogicEmpty text="Nenhuma prioridade apontada nas escutas do mês." />}
          </Panel>

          <Panel title="Temas inesperados" icon={<Layers3 className="h-5 w-5" />}>
            {report.unexpectedTopics.length > 0 ? (
              <div className="space-y-3">
                {report.unexpectedTopics.map((item) => (
                  <div className="rounded-2xl bg-semear-offwhite p-4" key={item.name}>
                    <p className="text-sm font-semibold text-semear-green">{item.name}</p>
                    <p className="mt-1 text-xs uppercase tracking-[0.12em] text-stone-500">{item.count} ocorrência(s)</p>
                  </div>
                ))}
              </div>
            ) : <PedagogicEmpty text="Nenhuma observação inesperada foi preenchida no mês." />}
          </Panel>
        </div>
      </div>

      <div className="mt-5 grid gap-5 xl:grid-cols-2">
        <Panel title="Lista de ações do mês" icon={<ClipboardList className="h-5 w-5" />}>
          {report.actions.length > 0 ? (
            <div className="space-y-3">
              {report.actions.map((action) => (
                <Link className="block rounded-2xl border border-semear-gray bg-white p-4 transition hover:border-semear-green/30" href={`/acoes/${action.id}`} key={action.id}>
                  <div className="flex flex-wrap gap-2 text-xs font-semibold text-stone-500">
                    <span>{formatDate(action.action_date)}</span>
                    <span>{getActionTypeLabel(action.action_type)}</span>
                    <span>{action.neighborhoods?.name ?? "Sem bairro"}</span>
                  </div>
                  <p className="mt-2 text-sm font-semibold text-semear-green">{action.title}</p>
                </Link>
              ))}
            </div>
          ) : <PedagogicEmpty text="Nenhuma ação foi cadastrada para o mês selecionado." />}
        </Panel>

        <Panel title="Pendências de revisão" icon={<Layers3 className="h-5 w-5" />}>
          {report.pendingReviews.length > 0 ? (
            <div className="space-y-3">
              {report.pendingReviews.map((record) => (
                <Link className="block rounded-2xl border border-semear-gray bg-white p-4 transition hover:border-semear-green/30" href={`/escutas/${record.id}`} key={record.id}>
                  <div className="flex flex-wrap gap-2 text-xs font-semibold text-stone-500">
                    <span>{formatDate(record.date)}</span>
                    <span>{record.neighborhoods?.name ?? "Sem bairro"}</span>
                    <span>{getReviewStatusLabel(record.review_status)}</span>
                  </div>
                  <p className="mt-2 text-sm font-semibold text-semear-green">{record.free_speech_text}</p>
                </Link>
              ))}
            </div>
          ) : <PedagogicEmpty text="Nenhuma escuta em rascunho neste mês." />}
        </Panel>
      </div>

      <div className="mt-5 grid gap-5 xl:grid-cols-2">
        <Panel title="Bairros envolvidos" icon={<MapPinned className="h-5 w-5" />}>
          {report.involvedNeighborhoods.length > 0 ? <TagList items={report.involvedNeighborhoods} /> : <PedagogicEmpty text="Nenhum bairro informado nas ações ou escutas do mês." />}
        </Panel>

        <Panel title="Escutas do mês para exportação" icon={<MessageSquareText className="h-5 w-5" />}>
          {report.records.length > 0 ? (
            <div className="space-y-3">
              {report.records.slice(0, 4).map((record) => (
                <div className="rounded-2xl bg-semear-offwhite p-4" key={record.id}>
                  <div className="flex flex-wrap gap-2 text-xs font-semibold text-stone-500">
                    <span>{formatDate(record.date)}</span>
                    <span>{record.neighborhoods?.name ?? "Sem bairro"}</span>
                    <span>{getSourceTypeLabel(record.source_type)}</span>
                  </div>
                  <p className="mt-2 text-sm leading-6 text-semear-green">{record.team_summary ?? record.free_speech_text}</p>
                </div>
              ))}
            </div>
          ) : <PedagogicEmpty text="O CSV será habilitado quando houver escutas no mês selecionado." />}
        </Panel>
      </div>
    </section>
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

function TagList({ items }: { items: string[] }) {
  return (
    <div className="flex flex-wrap gap-2">
      {items.map((item) => (
        <span className="rounded-full bg-semear-offwhite px-3 py-1 text-sm font-semibold text-stone-700" key={item}>{item}</span>
      ))}
    </div>
  );
}

function StateBox({ children, tone = "neutral" }: { children: ReactNode; tone?: "neutral" | "error" }) {
  return <div className={`rounded-[1.5rem] p-6 text-sm shadow-soft ${tone === "error" ? "border border-red-200 bg-red-50 text-red-800" : "bg-white/72 text-stone-600"}`}>{children}</div>;
}

function PedagogicEmpty({ text }: { text: string }) {
  return <div className="rounded-2xl border border-dashed border-semear-green/25 bg-semear-offwhite p-5 text-sm leading-6 text-stone-600">{text}</div>;
}

function formatDate(value: string) {
  return new Date(`${value}T00:00:00`).toLocaleDateString("pt-BR");
}

function nextMonth(month: string) {
  const [year, monthNumber] = month.split("-").map(Number);
  const next = new Date(year, monthNumber, 1);
  return next.toISOString().slice(0, 10);
}