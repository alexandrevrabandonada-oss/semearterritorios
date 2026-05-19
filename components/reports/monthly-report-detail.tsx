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
  UsersRound,
  Save,
  Tag,
  Sparkles,
  Bot,
  Printer
} from "lucide-react";
import type { ReactNode } from "react";
import type { Action, ActionClosure, ActionDebrief, ListeningRecord, Neighborhood, Theme } from "@/lib/database.types";
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
import { getActionPilotMetrics, hasPossibleSensitiveData, type ListeningRecordForPilot } from "@/lib/action-pilot";
import { getClosureStatusLabel } from "@/lib/action-closures";

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
  const [closures, setClosures] = useState<ActionClosure[]>([]);
  const [debriefs, setDebriefs] = useState<ActionDebrief[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [aiSuggestion, setAiSuggestion] = useState<string | null>(null);
  const [generatingAi, setGeneratingAi] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);

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

      const [actionsResult, recordsResult, closuresResult, debriefsResult] = await Promise.all([
        supabase.from("actions").select("*, neighborhoods:neighborhood_id(id, name)").gte("action_date", `${month}-01`).lt("action_date", nextMonth(month)).order("action_date", { ascending: true }),
        supabase.from("listening_records").select("*, actions:action_id(id, title, action_type), neighborhoods:neighborhood_id(id, name), respondent_neighborhoods:respondent_neighborhood_id(id, name), listening_record_themes(themes:theme_id(id, name))").gte("date", `${month}-01`).lt("date", nextMonth(month)).order("date", { ascending: true }),
        supabase.from("action_closures").select("*"),
        supabase.from("action_debriefs").select("*")
      ]);

      if (ignore) return;

      if (actionsResult.error || recordsResult.error || closuresResult.error || debriefsResult.error) {
        setError(actionsResult.error?.message ?? recordsResult.error?.message ?? closuresResult.error?.message ?? debriefsResult.error?.message ?? "Erro ao gerar o relatório mensal.");
        setLoading(false);
        return;
      }

      setActions((actionsResult.data ?? []) as ActionWithNeighborhood[]);
      setRecords((recordsResult.data ?? []) as unknown as RecordWithRelations[]);
      setClosures((closuresResult.data ?? []) as ActionClosure[]);
      setDebriefs((debriefsResult.data ?? []) as ActionDebrief[]);
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
  const actionsWithoutClosedDossier = actions.filter((action) => closures.find((closure) => closure.action_id === action.id)?.status !== "closed");

  async function handleGenerateAi() {
    setGeneratingAi(true);
    setAiError(null);
    try {
      const recordsData = report.records.map(r => ({
        territorio_acao: r.neighborhoods?.name ?? "Território da ação não informado",
        territorio_referencia_entrevistado: r.respondent_neighborhoods?.name ?? "Não informado",
        acao: r.actions?.title ?? "Sem ação",
        origem: getSourceTypeLabel(r.source_type),
        ocupacao: r.respondent_occupation ?? "não informado",
        temas: r.listening_record_themes.map(t => t.themes?.name).filter(Boolean),
        prioridade: r.priority_mentioned ?? "",
        inesperado: r.unexpected_notes ?? "",
        fala_limpa: r.free_speech_text
      }));
      const actionsSummary = report.actions.map(a => ({
        titulo: a.title,
        tipo: getActionTypeLabel(a.action_type),
        territorio_acao: a.neighborhoods?.name ?? "Território da ação não informado"
      }));

      const res = await fetch("/api/gerar-sintese", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          month: formatMonthLabel(month),
          actionsSummary,
          recordsData,
        })
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => null);
        throw new Error(errorData?.error ?? "Falha ao gerar síntese");
      }

      const data = await res.json();
      setAiSuggestion(data.text);
    } catch (err: any) {
      setAiError(err.message || "Erro desconhecido");
    } finally {
      setGeneratingAi(false);
    }
  }

  async function handleSaveReport() {
    setError(null);
    if (!supabase) return;

    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não autenticado.");

      const payload = {
        reference_month: `${month}-01`,
        title: report.title,
        free_speech_highlights: null,
        team_analysis: aiSuggestion || "Gerado sem IA",
        recurring_themes: null,
        territorial_notes: null,
        review_status: "reviewed" as const,
        created_by: user.id
      };

      const { error } = await supabase.from("monthly_reports").upsert(payload, { onConflict: "reference_month" });

      if (error) throw error;
      setFeedback("Relatório salvo no banco de dados.");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

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
    <>
    <section className="no-print pb-10">
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
              Texto-base determinístico a partir de ações, escutas, temas e campos preenchidos pela equipe. Os botões de copiar/exportar usam este relatório oficial, sem IA generativa.
              Dossiê fechado é a condição ideal para tratar a ação como consolidada no mês.
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
            <button className="inline-flex min-h-11 items-center gap-2 rounded-full bg-semear-green px-4 text-sm font-semibold text-white" onClick={handleSaveReport} type="button">
              <Save className="h-4 w-4" aria-hidden="true" />
              Salvar no banco
            </button>
            <button className="inline-flex min-h-11 items-center gap-2 rounded-full bg-stone-800 px-4 text-sm font-semibold text-white" onClick={exportCsv} type="button">
              <Download className="h-4 w-4" aria-hidden="true" />
              Exportar CSV
            </button>
            <button className="inline-flex min-h-11 items-center gap-2 rounded-full bg-semear-earth px-4 text-sm font-semibold text-white" onClick={() => window.print()} type="button">
              <Printer className="h-4 w-4" aria-hidden="true" />
              Exportar PDF
            </button>
          </div>
        </div>
        {feedback ? <p className="mt-4 text-sm font-medium text-semear-green">{feedback}</p> : null}
        {actionsWithoutClosedDossier.length > 0 ? (
          <p className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm font-semibold text-amber-900">
            Há ações do mês sem dossiê fechado.
          </p>
        ) : null}
      </div>

      <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <MetricCard icon={<ClipboardList className="h-5 w-5" />} label="Ações" value={report.totalActions} />
        <MetricCard icon={<MessageSquareText className="h-5 w-5" />} label="Escutas" value={report.totalRecords} />
        <MetricCard icon={<MapPinned className="h-5 w-5" />} label="Bairros onde houve ação" value={report.operationNeighborhoods.length} />
        <MetricCard icon={<Tag className="h-5 w-5" />} label="Temas" value={report.topThemes.length} />
        <MetricCard icon={<Layers3 className="h-5 w-5" />} label="Pendências" value={report.pendingReviews.length} />
      </div>

      <div className="mt-5 grid gap-5 xl:grid-cols-2">
        <Panel title="Operação territorial" icon={<MapPinned className="h-5 w-5" />}>
          <p className="text-sm leading-6 text-stone-700">Onde fizemos ações e volume coletado por território da ação.</p>
          <div className="mt-3 space-y-2">
            {report.actionTerritoryCounts.length > 0 ? report.actionTerritoryCounts.map((item) => (
              <p className="rounded-xl bg-semear-offwhite px-3 py-2 text-sm text-stone-700" key={item.name}>
                <strong className="text-semear-green">{item.name}</strong>: {item.count} ação(ões)
              </p>
            )) : <PedagogicEmpty text="Nenhum território da ação informado no mês." />}
          </div>
        </Panel>

        <Panel title="Escuta territorial" icon={<MessageSquareText className="h-5 w-5" />}>
          <p className="text-sm leading-6 text-stone-700">De onde vêm/as quais territórios se referem os entrevistados.</p>
          <div className="mt-3 space-y-2">
            {report.respondentTerritoryCounts.length > 0 ? report.respondentTerritoryCounts.map((item) => (
              <p className="rounded-xl bg-semear-offwhite px-3 py-2 text-sm text-stone-700" key={item.name}>
                <strong className="text-semear-green">{item.name}</strong>: {item.count} escuta(s)
              </p>
            )) : <PedagogicEmpty text="Nenhum território de referência informado no mês." />}
            <p className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
              Escutas sem território de referência: {report.respondentWithoutNeighborhood}
            </p>
          </div>
        </Panel>
      </div>

      <div className="mt-5">
      <Panel title="Nota metodológica territorial" icon={<AlertCircle className="h-5 w-5" />}>
        <div className={`rounded-2xl border p-4 text-sm leading-6 ${report.territorialMethodologyNote.status === "boa" ? "border-green-200 bg-green-50 text-green-900" : report.territorialMethodologyNote.status === "atenção" ? "border-amber-200 bg-amber-50 text-amber-900" : "border-red-200 bg-red-50 text-red-900"}`}>
          <p><strong>Status:</strong> {report.territorialMethodologyNote.status}</p>
          <p><strong>Cobertura territorial:</strong> {report.territorialQuality.coveragePercent}%</p>
          <p><strong>Total de escutas no período:</strong> {report.territorialQuality.totalRecords}</p>
          <p><strong>Escutas com território de referência:</strong> {report.territorialQuality.recordsWithRespondentTerritory}</p>
          <p><strong>Escutas sem território de referência:</strong> {report.territorialQuality.recordsWithoutRespondentTerritory}</p>
          <p className="mt-2">{report.territorialMethodologyNote.fullText}</p>
          <p className="mt-2"><strong>Recomendação operacional:</strong> {report.territorialMethodologyNote.operationalRecommendation}</p>
          {(report.territorialMethodologyNote.status === "atenção" || report.territorialMethodologyNote.status === "crítica") ? (
            <div className="mt-3 rounded-xl border border-amber-300 bg-white px-3 py-2 text-amber-950">
              Sugestão: revisar escutas sem território de referência antes de publicar síntese territorial.
            </div>
          ) : null}
        </div>
      </Panel>
      </div>

      <div className="mt-5 grid gap-5 xl:grid-cols-[1.2fr_0.8fr]">
        <div className="space-y-5">
          <Panel title="Síntese de busca ativa" icon={<CalendarDays className="h-5 w-5" />}>
            <p className="text-sm leading-7 text-stone-700">{report.activeSearchSummary}</p>
          </Panel>

          <Panel title="Síntese pedagógica" icon={<FileText className="h-5 w-5" />}>
            <p className="text-sm leading-7 text-stone-700">{report.pedagogicalSummary}</p>
          </Panel>

          <Panel title="Assistente de Síntese (IA)" icon={<Bot className="h-5 w-5" />}>
            <div className="space-y-4">
              <p className="text-sm leading-6 text-stone-600">
                Gere uma sugestão de texto contendo resumo do mês, temas recorrentes e padrões separados entre território da ação e território de referência do entrevistado. Nomes e identificadores não são enviados.
                Esta sugestão não é relatório oficial; use apenas como apoio exploratório e revise antes de qualquer uso.
              </p>
              {!aiSuggestion && !generatingAi ? (
                <button
                  onClick={() => void handleGenerateAi()}
                  className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-semear-earth px-5 text-sm font-semibold text-white transition hover:bg-semear-earth/90"
                  type="button"
                >
                  <Sparkles className="h-4 w-4" aria-hidden="true" />
                  Gerar sugestão de síntese
                </button>
              ) : null}
              {generatingAi ? (
                <p className="text-sm font-medium text-semear-earth animate-pulse">Gerando análise exploratória...</p>
              ) : null}
              {aiError ? (
                <p className="text-sm font-medium text-red-600">{aiError}</p>
              ) : null}
              {aiSuggestion ? (
                <div className="space-y-3">
                  <div className="rounded-2xl border border-semear-yellow/40 bg-semear-yellow/20 p-4 text-sm font-medium leading-6 text-semear-green">
                    ⚠️ Síntese gerada automaticamente, revisar antes de usar. A IA pode apresentar informações imprecisas ou errôneas.
                  </div>
                  <textarea
                    className="min-h-[400px] w-full rounded-2xl border border-semear-green/20 bg-white p-4 text-sm leading-7 text-stone-700 outline-none focus:border-semear-green"
                    value={aiSuggestion}
                    onChange={(e) => setAiSuggestion(e.target.value)}
                  />
                  <div className="flex justify-end gap-3">
                    <button
                      onClick={() => void copyContent(aiSuggestion, "Sugestão da IA")}
                      className="text-sm font-semibold text-semear-green hover:underline"
                      type="button"
                    >
                      Copiar texto
                    </button>
                  </div>
                </div>
              ) : null}
            </div>
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

          <Panel title="Ocupações informadas (agregado)" icon={<UsersRound className="h-5 w-5" />}>
            {report.occupationCounts.length > 0 ? <TagList items={report.occupationCounts.map((item) => `${item.name} (${item.count})`)} /> : <PedagogicEmpty text="Sem ocupações com frequência suficiente para leitura agregada segura." />}
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
                    <span>{action.neighborhoods?.name ?? "Território da ação não informado"}</span>
                  </div>
                  <p className="mt-2 text-sm font-semibold text-semear-green">{action.title}</p>
                  <ActionMonthlyStatus
                    action={action}
                    closure={closures.find((item) => item.action_id === action.id) ?? null}
                    debrief={debriefs.find((item) => item.action_id === action.id) ?? null}
                    records={records.filter((record) => record.action_id === action.id)}
                  />
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
                    <span>ação em {record.neighborhoods?.name ?? "Território da ação não informado"}</span>
                    <span>referência {record.respondent_neighborhoods?.name ?? "Não informado"}</span>
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
        <Panel title="Bairros onde houve ação" icon={<MapPinned className="h-5 w-5" />}>
          {report.operationNeighborhoods.length > 0 ? <TagList items={report.operationNeighborhoods} /> : <PedagogicEmpty text="Nenhum território da ação informado no mês." />}
        </Panel>

        <Panel title="Bairros de referência dos entrevistados" icon={<MapPinned className="h-5 w-5" />}>
          {report.respondentNeighborhoods.length > 0 ? <TagList items={report.respondentNeighborhoods} /> : <PedagogicEmpty text="Nenhum território de referência informado no mês." />}
        </Panel>

        <Panel title="Escutas do mês para exportação" icon={<MessageSquareText className="h-5 w-5" />}>
          {report.records.length > 0 ? (
            <div className="space-y-3">
              {report.records.slice(0, 4).map((record) => (
                <div className="rounded-2xl bg-semear-offwhite p-4" key={record.id}>
                  <div className="flex flex-wrap gap-2 text-xs font-semibold text-stone-500">
                    <span>{formatDate(record.date)}</span>
                    <span>ação em {record.neighborhoods?.name ?? "Território da ação não informado"}</span>
                    <span>referência {record.respondent_neighborhoods?.name ?? "Não informado"}</span>
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
    <MonthlyReportPrintSheet report={report} />
    </>
  );
}

function MonthlyReportPrintSheet({ report }: { report: MonthlyReportData }) {
  return (
    <article className="print-only print-sheet">
      <header className="mb-8 border-b border-semear-gray pb-5">
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-semear-earth">SEMEAR Territórios</p>
        <h1 className="mt-2 text-3xl font-semibold text-semear-green">{report.title}</h1>
        <p className="mt-3 text-sm leading-6 text-stone-700">
          Relatório mensal gerado a partir de ações, escutas, temas e campos preenchidos pela equipe.
        </p>
      </header>

      <section className="mb-6 grid grid-cols-2 gap-3">
        <PrintMetric label="Mês de referência" value={formatMonthLabel(report.month)} />
        <PrintMetric label="Ações" value={report.totalActions} />
        <PrintMetric label="Escutas" value={report.totalRecords} />
        <PrintMetric label="Cobertura territorial" value={`${report.territorialQuality.coveragePercent}%`} />
      </section>

      <PrintSection title="Síntese de busca ativa">
        <p>{report.activeSearchSummary}</p>
      </PrintSection>

      <PrintSection title="Síntese pedagógica">
        <p>{report.pedagogicalSummary}</p>
      </PrintSection>

      <PrintSection title="Nota metodológica territorial">
        <p><strong>Status:</strong> {report.territorialMethodologyNote.status}</p>
        <p><strong>Escutas sem território de referência:</strong> {report.territorialQuality.recordsWithoutRespondentTerritory}</p>
        <p>{report.territorialMethodologyNote.fullText}</p>
        <p><strong>Recomendação operacional:</strong> {report.territorialMethodologyNote.operationalRecommendation}</p>
      </PrintSection>

      <section className="mb-6 grid grid-cols-2 gap-5">
        <PrintCountList title="Ações por território" items={report.actionTerritoryCounts} />
        <PrintCountList title="Escutas por território de referência" items={report.respondentTerritoryCounts} />
        <PrintCountList title="Tipos de ação" items={report.actionTypeCounts} />
        <PrintCountList title="Temas mais recorrentes" items={report.topThemes} />
        <PrintCountList title="Prioridades apontadas" items={report.priorities} />
        <PrintCountList title="Temas inesperados" items={report.unexpectedTopics} />
      </section>

      <PrintSection title="Lista de ações do mês">
        {report.actions.length > 0 ? (
          <ul className="space-y-2">
            {report.actions.map((action) => (
              <li key={action.id}>
                {formatDate(action.action_date)} | {action.title} | {getActionTypeLabel(action.action_type)} | {action.neighborhoods?.name ?? "Território da ação não informado"}
              </li>
            ))}
          </ul>
        ) : (
          <p>Nenhuma ação cadastrada no mês.</p>
        )}
      </PrintSection>

      <PrintSection title="Pendências de revisão">
        {report.pendingReviews.length > 0 ? (
          <ul className="space-y-2">
            {report.pendingReviews.map((record) => (
              <li key={record.id}>
                {formatDate(record.date)} | ação em {record.neighborhoods?.name ?? "Território da ação não informado"} | referência {record.respondent_neighborhoods?.name ?? "Não informado"} | {truncatePrint(record.free_speech_text, 120)}
              </li>
            ))}
          </ul>
        ) : (
          <p>Nenhuma pendência de revisão no mês.</p>
        )}
      </PrintSection>

      <footer className="mt-8 border-t border-semear-gray pt-4 text-xs text-stone-600">
        Exportado em {new Date().toLocaleDateString("pt-BR")} pelo sistema interno SEMEAR Territórios.
      </footer>
    </article>
  );
}

function PrintMetric({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-2xl border border-semear-gray p-3">
      <p className="text-xs font-semibold uppercase tracking-[0.12em] text-stone-500">{label}</p>
      <p className="mt-1 text-lg font-semibold text-semear-green">{value}</p>
    </div>
  );
}

function PrintSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="mb-6 text-sm leading-6 text-stone-800">
      <h2 className="mb-2 text-lg font-semibold text-semear-green">{title}</h2>
      {children}
    </section>
  );
}

function PrintCountList({ title, items }: { title: string; items: Array<{ name: string; count: number }> }) {
  return (
    <section className="text-sm leading-6 text-stone-800">
      <h2 className="mb-2 text-base font-semibold text-semear-green">{title}</h2>
      {items.length > 0 ? (
        <ul className="space-y-1">
          {items.map((item) => <li key={item.name}>{item.name} ({item.count})</li>)}
        </ul>
      ) : (
        <p>Nenhum registro.</p>
      )}
    </section>
  );
}

function truncatePrint(value: string, maxLength: number) {
  return value.length > maxLength ? `${value.slice(0, maxLength - 1)}...` : value;
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

function ActionMonthlyStatus({ action, closure, debrief, records }: { action: ActionWithNeighborhood; closure: ActionClosure | null; debrief: ActionDebrief | null; records: RecordWithRelations[] }) {
  const pilotRecords = records as unknown as ListeningRecordForPilot[];
  const metrics = getActionPilotMetrics(pilotRecords);
  const critical = records.filter(hasPossibleSensitiveData).length;
  return (
    <div className="mt-3 flex flex-wrap gap-2 text-xs font-semibold">
      <span className="rounded-full bg-semear-offwhite px-3 py-1 text-stone-700">Dossiê: {getClosureStatusLabel(closure?.status)}</span>
      <span className="rounded-full bg-semear-offwhite px-3 py-1 text-stone-700">Devolutiva: {debrief?.status === "approved" ? "aprovada" : "não aprovada"}</span>
      <span className="rounded-full bg-semear-offwhite px-3 py-1 text-stone-700">Revisadas: {metrics.reviewed}/{metrics.total}</span>
      {critical > 0 || metrics.pending > 0 ? <span className="rounded-full bg-amber-50 px-3 py-1 text-amber-900">Pendências críticas: {critical + metrics.pending}</span> : null}
      <span className="sr-only">{action.title}</span>
    </div>
  );
}
