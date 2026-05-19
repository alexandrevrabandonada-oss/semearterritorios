"use client";

import { useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  Copy,
  Download,
  FileText,
  Printer,
  Save,
  ShieldCheck,
  Sparkles
} from "lucide-react";
import {
  buildActionDebrief,
  buildPublicDebriefMarkdown,
  defaultPrivacyNote
} from "@/lib/action-debriefs";
import { buildActionAnalytics, type ActionAnalytics } from "@/lib/action-analytics";
import {
  getActionPilotMetrics,
  getActionReadiness,
  type ActionForPilot,
  type ListeningRecordForPilot
} from "@/lib/action-pilot";
import { getActionTypeLabel } from "@/lib/actions";
import { buildTerritorialQualityMethodologyNote, calculateRespondentTerritoryQuality } from "@/lib/territorial-quality";
import type {
  ActionDebrief,
  DebriefStatus,
  Json,
  Profile
} from "@/lib/database.types";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";
import { MethodologicalWarningsPanel } from "@/components/actions/analytical-panels";
import { SemearAlert, SemearButton, SemearCard, SemearMetricCard, SemearPageHeader, SemearStatusBadge } from "@/components/ui/semear-primitives";

type Props = {
  actionId: string;
};

type DebriefForm = {
  title: string;
  public_summary: string;
  methodology_note: string;
  key_findings: string;
  next_steps: string;
  team_review_text: string;
};

type PublicQuoteRow = {
  id: string;
  status: string;
  quote_text: string;
  sanitized_text: string | null;
  public_approval_reason: string | null;
};

type PublicQuoteAuditRow = {
  quote_id: string;
};

const emptyForm: DebriefForm = {
  title: "O que ouvimos nesta ação",
  public_summary: "",
  methodology_note: "",
  key_findings: "",
  next_steps: "",
  team_review_text: ""
};

const statusLabels: Record<DebriefStatus, string> = {
  draft: "Rascunho",
  reviewed: "Revisada",
  approved: "Aprovada"
};

export function ActionDebriefPage({ actionId }: Props) {
  const supabase = useMemo(() => createBrowserSupabaseClient(), []);
  const [action, setAction] = useState<ActionForPilot | null>(null);
  const [records, setRecords] = useState<ListeningRecordForPilot[]>([]);
  const [debrief, setDebrief] = useState<ActionDebrief | null>(null);
  const [allQuotes, setAllQuotes] = useState<PublicQuoteRow[]>([]);
  const [publicQuotes, setPublicQuotes] = useState<PublicQuoteRow[]>([]);
  const [quoteAudits, setQuoteAudits] = useState<PublicQuoteAuditRow[]>([]);
  const [analytics, setAnalytics] = useState<ActionAnalytics | null>(null);
  const [mode, setMode] = useState<"interno" | "publico">("publico");
  const [profile, setProfile] = useState<Pick<Profile, "id" | "role"> | null>(null);
  const [form, setForm] = useState<DebriefForm>(emptyForm);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [draftRefreshLabel, setDraftRefreshLabel] = useState<string | null>(null);

  useEffect(() => {
    let ignore = false;

    async function load() {
      if (!supabase) {
        setError("Configure NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_ANON_KEY para abrir a devolutiva.");
        setLoading(false);
        return;
      }

      const userResult = await supabase.auth.getUser();
      const userId = userResult.data.user?.id;

      const [actionResult, recordsResult, debriefResult, quotesResult, auditsResult, profileResult] = await Promise.all([
        supabase.from("actions").select("*, neighborhoods:neighborhood_id(id, name)").eq("id", actionId).single(),
        supabase
          .from("listening_records")
          .select("*, listening_record_themes(themes:theme_id(id, name))")
          .eq("action_id", actionId)
          .order("created_at", { ascending: true }),
        supabase.from("action_debriefs").select("*").eq("action_id", actionId).maybeSingle(),
        supabase
          .from("listening_record_public_quotes")
          .select("*")
          .eq("action_id", actionId)
          .in("status", ["draft", "needs_review", "approved_internal", "approved_public", "rejected", "archived"])
          .order("updated_at", { ascending: false }),
        supabase.from("listening_record_public_quote_audits").select("*").eq("action_id", actionId).order("changed_at", { ascending: false }),
        userId ? supabase.from("profiles").select("id, role").eq("id", userId).maybeSingle() : Promise.resolve({ data: null, error: null })
      ]);

      if (ignore) return;

      if (actionResult.error || recordsResult.error || debriefResult.error || quotesResult.error || auditsResult.error || profileResult.error) {
        setError(
          actionResult.error?.message ??
            recordsResult.error?.message ??
            debriefResult.error?.message ??
            quotesResult.error?.message ??
            auditsResult.error?.message ??
            profileResult.error?.message ??
            "Erro ao carregar devolutiva."
        );
        setLoading(false);
        return;
      }

      const loadedAction = actionResult.data as ActionForPilot;
      const loadedRecords = (recordsResult.data ?? []) as ListeningRecordForPilot[];
      const loadedDebrief = debriefResult.data as ActionDebrief | null;
      const builtAnalytics = await buildActionAnalytics(
        actionId,
        loadedRecords,
        loadedAction.title,
        loadedAction.neighborhoods ? { id: loadedAction.neighborhoods.id, name: loadedAction.neighborhoods.name } : undefined
      );

      const loadedQuotes = (quotesResult.data ?? []) as PublicQuoteRow[];

      setAction(loadedAction);
      setRecords(loadedRecords);
      setDebrief(loadedDebrief);
      setAllQuotes(loadedQuotes);
      setPublicQuotes(loadedQuotes.filter((quote) => quote.status === "approved_public"));
      setQuoteAudits((auditsResult.data ?? []) as PublicQuoteAuditRow[]);
      setAnalytics(builtAnalytics);
      setProfile(profileResult.data as Pick<Profile, "id" | "role"> | null);

      if (loadedDebrief) {
        setForm({
          title: loadedDebrief.title,
          public_summary: loadedDebrief.public_summary,
          methodology_note: loadedDebrief.methodology_note,
          key_findings: loadedDebrief.key_findings,
          next_steps: loadedDebrief.next_steps,
          team_review_text: loadedDebrief.team_review_text
        });
      } else {
        const generated = buildActionDebrief(loadedAction, loadedRecords);
        setForm({
          title: generated.title,
          public_summary: generated.publicSummary,
          methodology_note: generated.methodologyNote,
          key_findings: generated.keyFindings,
          next_steps: generated.nextSteps,
          team_review_text: generated.teamReviewText
        });
      }

      setLoading(false);
    }

    void load();
    return () => {
      ignore = true;
    };
  }, [actionId, supabase]);

  if (loading) return <StateBox>Carregando devolutiva da ação...</StateBox>;
  if (error || !action) return <StateBox tone="error">{error ?? "Ação não encontrada."}</StateBox>;

  const loadedAction = action;
  const metrics = getActionPilotMetrics(records);
  const readiness = getActionReadiness(records);
  const generated = buildActionDebrief(loadedAction, records);
  const currentStatus = debrief?.status ?? "draft";
  const canApprove = profile?.role === "admin" || profile?.role === "coordenacao";
  const respondentTerritoryMetrics = calculateRespondentTerritoryQuality(
    records.length,
    records.filter((record) => Boolean(record.respondent_neighborhood_id)).length
  );
  const respondentTerritoryNote = buildTerritorialQualityMethodologyNote(respondentTerritoryMetrics);
  const publicCautionText = respondentTerritoryMetrics.qualityStatus === "crítica"
    ? "Leitura territorial com cobertura critica. Esta devolutiva evita conclusoes fortes por bairro e prioriza analise agregada."
    : respondentTerritoryMetrics.qualityStatus === "atenção"
      ? "Leitura territorial com cobertura em atencao. Interpretacoes por bairro exigem cautela metodologica."
      : "Cobertura territorial adequada para leitura agregada responsavel.";
  const approvedPublicQuotes = allQuotes.filter((quote) => quote.status === "approved_public");
  const approvedPublicIds = new Set(approvedPublicQuotes.map((quote) => quote.id));
  const approvedPublicWithAudit = new Set(
    quoteAudits.filter((audit) => approvedPublicIds.has(audit.quote_id)).map((audit) => audit.quote_id)
  ).size;
  const approvedPublicWithJustification = approvedPublicQuotes.filter((quote) => (quote.public_approval_reason ?? "").trim().length > 0).length;
  const voicesText = publicQuotes.length > 0
    ? `\n\nVozes do territorio:\n${publicQuotes.slice(0, 5).map((quote) => `- ${(quote.sanitized_text?.trim() || quote.quote_text).trim()}`).join("\n")}`
    : "\n\nVozes do territorio:\n- Ainda nao ha falas aprovadas para publicacao nesta acao.";
  const markdown = `${buildPublicDebriefMarkdown({
    title: form.title,
    action: loadedAction,
    readiness,
    publicSummary: `${form.public_summary}\n\n${publicCautionText}`,
    keyFindings: form.key_findings,
    nextSteps: form.next_steps,
    methodologyNote: form.methodology_note
  })}${voicesText}`;
  const publicText = `${form.title}\n\n${form.public_summary}\n\n${publicCautionText}\n\n${form.key_findings}${voicesText}\n\nPróximos passos:\n${form.next_steps}\n\n${form.methodology_note}\n\n${defaultPrivacyNote}`;

  function updateField<TField extends keyof DebriefForm>(field: TField, value: DebriefForm[TField]) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  function generateDraft() {
    console.log("[generateDraft] Iniciando...");
    try {
      setError(null);
      const nextDraft = {
        title: generated.title,
        public_summary: generated.publicSummary,
        methodology_note: generated.methodologyNote,
        key_findings: generated.keyFindings,
        next_steps: generated.nextSteps,
        team_review_text: generated.teamReviewText
      };
      const alreadyUpToDate =
        form.title === nextDraft.title &&
        form.public_summary === nextDraft.public_summary &&
        form.methodology_note === nextDraft.methodology_note &&
        form.key_findings === nextDraft.key_findings &&
        form.next_steps === nextDraft.next_steps &&
        form.team_review_text === nextDraft.team_review_text;

      setForm(nextDraft);
      setFeedback(
        alreadyUpToDate
          ? "Rascunho recalculado. O texto já estava atualizado."
          : "Rascunho determinístico aplicado. Revise antes de salvar ou aprovar."
      );
      setDraftRefreshLabel(`Última geração: ${new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}`);
      console.log("[generateDraft] Sucesso");
      // Limpar feedback após 5 segundos
      setTimeout(() => setFeedback(null), 5000);
    } catch (err) {
      console.error("[generateDraft] Erro:", err);
      setError(`Erro ao gerar rascunho: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  async function saveDebrief(status: DebriefStatus) {
    setError(null);
    setFeedback(null);

    if (!supabase) return;
    if (status === "approved" && !canApprove) {
      setError("Apenas coordenação ou admin podem aprovar devolutivas.");
      return;
    }
    if (status === "approved" && metrics.possibleSensitive > 0) {
      setError("Há registros com possível dado sensível. Revise antes de aprovar a devolutiva.");
      return;
    }

    const userResult = await supabase.auth.getUser();
    const user = userResult.data.user;
    if (!user) {
      setError("Entre no sistema antes de salvar a devolutiva.");
      return;
    }

    setSaving(true);
    const payload = {
      action_id: loadedAction.id,
      title: form.title.trim() || generated.title,
      public_summary: form.public_summary.trim(),
      methodology_note: form.methodology_note.trim() || generated.methodologyNote,
      key_findings: form.key_findings.trim(),
      next_steps: form.next_steps.trim(),
      generated_markdown: markdown,
      team_review_text: form.team_review_text.trim(),
      status,
      totals_snapshot: generated.totalsSnapshot as Json,
      created_by: debrief?.created_by ?? user.id,
      approved_by: status === "approved" ? user.id : null,
      approved_at: status === "approved" ? new Date().toISOString() : null
    };

    // RLS em action_debriefs permite INSERT apenas em draft/reviewed.
    // Se a primeira operação já for aprovação, inserimos como reviewed e promovemos em seguida.
    let result = debrief
      ? await supabase.from("action_debriefs").update(payload).eq("id", debrief.id).select("*").single()
      : await supabase
          .from("action_debriefs")
          .insert({
            ...payload,
            status: status === "approved" ? "reviewed" : status,
            approved_by: status === "approved" ? null : payload.approved_by,
            approved_at: status === "approved" ? null : payload.approved_at
          })
          .select("*")
          .single();

    if (!result.error && !debrief && status === "approved") {
      result = await supabase
        .from("action_debriefs")
        .update({
          status: "approved",
          approved_by: user.id,
          approved_at: new Date().toISOString(),
          generated_markdown: markdown,
          totals_snapshot: generated.totalsSnapshot as Json
        })
        .eq("id", result.data.id)
        .select("*")
        .single();
    }

    setSaving(false);

    if (result.error) {
      setError(result.error.message);
      return;
    }

    setDebrief(result.data as ActionDebrief);
    setFeedback(
      status === "approved"
        ? "Devolutiva aprovada e pronta para circular internamente."
        : status === "reviewed"
          ? "Devolutiva marcada como revisada. Ainda precisa de aprovação para circular."
          : "Rascunho salvo."
    );
  }

  async function copyText(text: string, label: string) {
    await navigator.clipboard.writeText(text);
    setFeedback(`${label} copiado.`);
  }

  function downloadMarkdown() {
    const blob = new Blob([markdown], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `devolutiva-${loadedAction.title.toLowerCase().replace(/[^a-z0-9]+/g, "-")}.md`;
    link.click();
    URL.revokeObjectURL(url);
    setFeedback("Arquivo Markdown baixado.");
  }

  return (
    <section className="pb-10">
      <div className="no-print mb-5 flex flex-wrap gap-3 items-center">
        <SemearButton href={`/acoes/${actionId}`} variant="secondary">
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          Voltar para ação
        </SemearButton>
        <SemearButton onClick={generateDraft} variant="secondary">
          <Sparkles className="h-4 w-4" aria-hidden="true" />
          Gerar rascunho determinístico
        </SemearButton>
        {draftRefreshLabel ? <p className="inline-flex min-h-11 items-center text-sm font-bold text-semear-green">{draftRefreshLabel}</p> : null}
        <div className="inline-flex rounded-full border border-white/60 bg-white/80 p-1 shadow-premium-sm">
          <button
            className={`rounded-full px-4 py-2 text-xs font-bold transition-all duration-200 active:scale-95 ${
              mode === "interno" 
                ? "bg-semear-green text-white shadow-premium-sm" 
                : "text-semear-green hover:bg-white/40"
            }`}
            onClick={() => setMode("interno")}
            type="button"
          >
            Modo técnico interno
          </button>
          <button
            className={`rounded-full px-4 py-2 text-xs font-bold transition-all duration-200 active:scale-95 ${
              mode === "publico" 
                ? "bg-semear-green text-white shadow-premium-sm" 
                : "text-semear-green hover:bg-white/40"
            }`}
            onClick={() => setMode("publico")}
            type="button"
          >
            Modo público
          </button>
        </div>
      </div>

      <article className="print-sheet">
        <SemearPageHeader
          eyebrow={mode === "publico" ? "Devolutiva pública" : "Devolutiva técnica"}
          title={form.title}
          description={`${loadedAction.title} · ${new Date(`${loadedAction.action_date}T00:00:00`).toLocaleDateString("pt-BR")} · ${loadedAction.neighborhoods?.name ?? "Sem bairro definido"} · ${getActionTypeLabel(loadedAction.action_type)}`}
          meta={<><SemearStatusBadge tone="green">{statusLabels[currentStatus]}</SemearStatusBadge><SemearStatusBadge tone="yellow">{readiness}</SemearStatusBadge></>}
        />
        <SemearCard as="div" className="sm:p-7">

        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <SemearMetricCard label="Escutas" value={metrics.total} />
          <SemearMetricCard label="Revisadas" value={metrics.reviewed} />
          <SemearMetricCard label="Rascunhos" value={metrics.draft} tone={metrics.draft > 0 ? "red" : "green"} />
          <SemearMetricCard label="Possível dado sensível" value={metrics.possibleSensitive} tone={metrics.possibleSensitive > 0 ? "red" : "green"} />
        </div>

        <div className="mt-6 grid gap-4 lg:grid-cols-2">
          <MiniList title="Temas mais citados" items={metrics.topThemes.slice(0, 5).map((item) => `${item.label} (${item.count})`)} />
          <MiniList title="Palavras recorrentes" items={metrics.topWords.slice(0, 8).map((item) => `${item.label} (${item.count})`)} />
          <MiniList title="Lugares mencionados" items={metrics.places.slice(0, 6).map((item) => `${item.label} (${item.count})`)} />
          <MiniList title="Prioridades apontadas" items={metrics.priorities.slice(0, 6).map((item) => `${item.label} (${item.count})`)} />
        </div>

        <div className="mt-6 grid gap-5 xl:grid-cols-[1fr_360px]">
          <div className="space-y-5">
            {mode === "publico" ? (
              <>
                <EditableBlock label="Título público" value={form.title} onChange={(value) => updateField("title", value)} />
                <EditableBlock area label="Texto público sugerido" value={form.public_summary} onChange={(value) => updateField("public_summary", value)} />
                <EditableBlock area label="Principais achados" value={form.key_findings} onChange={(value) => updateField("key_findings", value)} />
                <EditableBlock area label="Próximos passos" value={form.next_steps} onChange={(value) => updateField("next_steps", value)} />
                <SemearAlert tone="yellow">
                  <p className="text-sm font-semibold text-amber-900">Ressalva metodológica automática</p>
                  <p className="mt-1 text-sm text-amber-900">{publicCautionText}</p>
                </SemearAlert>
                <section className="rounded-3xl border border-white/60 bg-white/60 p-5 shadow-premium-md backdrop-blur-md">
                  <p className="text-sm font-bold text-semear-green">Vozes do território</p>
                  <p className="mt-1 text-xs text-stone-600 font-medium">Trechos curtos revisados e sem identificação pessoal.</p>
                  {publicQuotes.length > 0 ? (
                    <ul className="mt-3 space-y-2 text-sm leading-relaxed text-stone-700 font-medium">
                      {publicQuotes.slice(0, 5).map((quote) => (
                        <li className="rounded-2xl border border-white/60 bg-white/80 p-3 shadow-premium-sm" key={quote.id}>
                          {(quote.sanitized_text?.trim() || quote.quote_text).trim()}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="mt-3 text-sm text-stone-500 font-medium">Ainda não há falas aprovadas para publicação nesta ação.</p>
                  )}
                </section>
              </>
            ) : (
              <>
                <EditableBlock label="Título interno" value={form.title} onChange={(value) => updateField("title", value)} />
                <EditableBlock area label="Notas internas de contexto" value={form.team_review_text} onChange={(value) => updateField("team_review_text", value)} />
                <EditableBlock area label="Leitura interna dos achados" value={form.key_findings} onChange={(value) => updateField("key_findings", value)} />
                <EditableBlock area label="Encaminhamentos internos" value={form.next_steps} onChange={(value) => updateField("next_steps", value)} />
                <section className="rounded-3xl border border-white/60 bg-white/60 p-5 shadow-premium-md backdrop-blur-md">
                  <p className="text-sm font-bold text-semear-green">Governança das falas representativas</p>
                  <p className="mt-1 text-sm text-stone-700 font-medium">Aprovadas públicas: {approvedPublicQuotes.length}</p>
                  <p className="mt-1 text-sm text-stone-700 font-medium">Com evento de auditoria: {approvedPublicWithAudit}/{approvedPublicQuotes.length}</p>
                  <p className="mt-1 text-sm text-stone-700 font-medium">Com justificativa de aprovação pública: {approvedPublicWithJustification}/{approvedPublicQuotes.length}</p>
                  {approvedPublicQuotes.length > 0 && approvedPublicWithAudit === approvedPublicQuotes.length && approvedPublicWithJustification === approvedPublicQuotes.length ? (
                    <p className="mt-2 rounded-xl border border-green-200 bg-green-50 px-3 py-2 text-xs font-semibold text-green-800">Conformidade editorial completa para uso interno.</p>
                  ) : (
                    <p className="mt-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-900">Há pendências de auditoria/justificativa em falas aprovadas para público.</p>
                  )}
                </section>
              </>
            )}
          </div>

          <aside className="space-y-5">
            <InfoPanel icon={<AlertTriangle className="h-5 w-5" />} title="Qualidade territorial da devolutiva">
              <div className={`rounded-xl border px-3 py-2.5 text-sm font-medium ${respondentTerritoryNote.status === "boa" ? "border-green-200 bg-green-50 text-green-900" : respondentTerritoryNote.status === "atenção" ? "border-amber-200 bg-amber-50 text-amber-900" : "border-red-200 bg-red-50 text-red-900"}`}>
                <p><strong>Cobertura territorial:</strong> {respondentTerritoryMetrics.coveragePercent}% ({respondentTerritoryMetrics.recordsWithRespondentTerritory}/{respondentTerritoryMetrics.totalRecords})</p>
                <p className="mt-1">{respondentTerritoryNote.shortText}</p>
                {respondentTerritoryNote.status !== "boa" ? (
                  <>
                    <p className="mt-1">Entre as escutas com território de referência preenchido, observam-se os padrões descritos nesta devolutiva.</p>
                    <Link className="mt-2 inline-flex min-h-10 items-center justify-center rounded-xl bg-semear-green px-3 text-xs font-bold text-white shadow-premium-sm hover:bg-semear-green/92 active:scale-95 transition-all duration-200" href={`/escutas/revisao-territorial?tab=qualidade&actionId=${loadedAction.id}`}>
                      Revisar escutas sem território
                    </Link>
                  </>
                ) : null}
              </div>
            </InfoPanel>
            <InfoPanel icon={<FileText className="h-5 w-5" />} title="Nota metodológica">
              <EditableBlock area label="Aviso metodológico" value={form.methodology_note} onChange={(value) => updateField("methodology_note", value)} compact />
            </InfoPanel>
            <InfoPanel icon={<ShieldCheck className="h-5 w-5" />} title="Privacidade">
              <p className="text-sm leading-relaxed text-stone-700 font-medium">{defaultPrivacyNote}</p>
            </InfoPanel>
            <InfoPanel icon={<AlertTriangle className="h-5 w-5" />} title="Revisão humana">
              <EditableBlock area label="Anotações da equipe" value={form.team_review_text} onChange={(value) => updateField("team_review_text", value)} compact />
            </InfoPanel>
          </aside>
        </div>

        {analytics && analytics.methodologicalWarnings.length > 0 ? (
          <div className="mt-6">
            <MethodologicalWarningsPanel warnings={analytics.methodologicalWarnings} />
          </div>
        ) : null}

        <footer className="print-only mt-10 border-t border-semear-gray pt-4 text-sm font-semibold text-semear-green">
          Projeto SEMEAR — UFF + APS
        </footer>
        </SemearCard>
      </article>

      <div className="no-print mt-5 grid gap-4 lg:grid-cols-[1fr_420px]">
        <div className="rounded-3xl border border-white/60 bg-white/80 p-5 shadow-premium-md backdrop-blur-md">
          <h3 className="font-bold text-semear-green">Estados da devolutiva</h3>
          <div className="mt-4 grid gap-3 md:grid-cols-3">
            <StatusNote active={currentStatus === "draft"} title="Rascunho" text="Texto em preparação, não é versão final." />
            <StatusNote active={currentStatus === "reviewed"} title="Revisada" text="Equipe revisou, mas ainda não aprovou circulação." />
            <StatusNote active={currentStatus === "approved"} title="Aprovada" text="Pronta para circular institucionalmente." />
          </div>
          {records.length === 0 ? <Warning text="Ainda não há escutas vinculadas a esta ação." /> : null}
          {debrief?.status === "approved" ? <Warning text="Esta devolutiva está aprovada. Se for editada e salva como rascunho ou revisada, deixa de ser versão aprovada." /> : null}
          {metrics.reviewed === 0 && records.length > 0 ? <Warning text="Ainda não há escutas revisadas. Mantenha como rascunho." /> : null}
          {metrics.draft > 0 ? <Warning text="Há escutas em rascunho. Recomenda-se revisar antes de aprovar." /> : null}
          {metrics.possibleSensitive > 0 ? <Warning text="Há registros com possível dado sensível. Revise antes de aprovar a devolutiva." danger /> : null}
          {metrics.draft === 0 && metrics.possibleSensitive === 0 && metrics.reviewed > 0 ? <Ready text="Pronta para devolutiva, após revisão humana final." /> : null}
          {feedback ? <p className="mt-4 text-sm font-bold text-semear-green">{feedback}</p> : null}
          {error ? <p className="mt-4 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-800 shadow-premium-sm">{error}</p> : null}
        </div>

        <div className="sticky bottom-4 rounded-3xl border border-white/60 bg-white/90 p-5 shadow-premium-lg backdrop-blur-lg">
          <h3 className="font-bold text-semear-green">Exportação e fluxo</h3>
          <div className="mt-4 flex flex-wrap gap-2">
            <button className="inline-flex min-h-10 items-center gap-2 rounded-full border border-white/60 bg-white px-4 text-xs font-bold text-semear-green shadow-premium-sm transition hover:bg-stone-50 active:scale-[0.98] transition-all duration-200" onClick={() => void copyText(publicText, "Texto público")} type="button">
              <Copy className="h-4 w-4" aria-hidden="true" />
              Copiar texto público
            </button>
            <button className="inline-flex min-h-10 items-center gap-2 rounded-full border border-white/60 bg-white px-4 text-xs font-bold text-semear-green shadow-premium-sm transition hover:bg-stone-50 active:scale-[0.98] transition-all duration-200" onClick={() => void copyText(markdown, "Markdown")} type="button">
              <FileText className="h-4 w-4" aria-hidden="true" />
              Copiar Markdown
            </button>
            <button className="inline-flex min-h-10 items-center gap-2 rounded-full border border-white/60 bg-white px-4 text-xs font-bold text-semear-green shadow-premium-sm transition hover:bg-stone-50 active:scale-[0.98] transition-all duration-200" onClick={downloadMarkdown} type="button">
              <Download className="h-4 w-4" aria-hidden="true" />
              Baixar .md
            </button>
            <button className="inline-flex min-h-10 items-center gap-2 rounded-full border border-white/60 bg-white px-4 text-xs font-bold text-semear-green shadow-premium-sm transition hover:bg-stone-50 active:scale-[0.98] transition-all duration-200" onClick={() => window.print()} type="button">
              <Printer className="h-4 w-4" aria-hidden="true" />
              Imprimir
            </button>
          </div>
          <div className="mt-5 flex flex-wrap gap-2.5">
            <button className="inline-flex min-h-12 items-center gap-2 rounded-full bg-semear-green px-5 text-sm font-bold text-white shadow-premium-sm hover:bg-semear-green/92 active:scale-[0.98] transition-all duration-200 disabled:opacity-60" disabled={saving} onClick={() => void saveDebrief("draft")} type="button">
              <Save className="h-4 w-4" aria-hidden="true" />
              Salvar rascunho
            </button>
            <button className="inline-flex min-h-12 items-center gap-2 rounded-full bg-semear-earth px-5 text-sm font-bold text-white shadow-premium-sm hover:bg-semear-earth/92 active:scale-[0.98] transition-all duration-200 disabled:opacity-60" disabled={saving} onClick={() => void saveDebrief("reviewed")} type="button">
              <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
              Marcar revisada
            </button>
            <button className="inline-flex min-h-12 items-center gap-2 rounded-full bg-stone-900 px-5 text-sm font-bold text-white shadow-premium-sm hover:bg-stone-800 active:scale-[0.98] transition-all duration-200 disabled:opacity-60" disabled={saving || !canApprove} onClick={() => void saveDebrief("approved")} type="button">
              <ShieldCheck className="h-4 w-4" aria-hidden="true" />
              Aprovar
            </button>
          </div>
          {!canApprove ? <p className="mt-3 text-xs text-stone-500 font-medium">Aprovação final é restrita à coordenação ou admin.</p> : null}
        </div>
      </div>
    </section>
  );
}

function Metric({ label, value, danger = false }: { label: string; value: number; danger?: boolean }) {
  return (
    <div className={`rounded-2xl border p-4 shadow-premium-sm ${danger ? "border-red-200 bg-red-50" : "border-white/60 bg-white/80"}`}>
      <p className={`text-xs font-semibold uppercase tracking-[0.12em] ${danger ? "text-red-850" : "text-stone-500"}`}>{label}</p>
      <strong className={`mt-2 block text-3xl font-extrabold ${danger ? "text-red-800" : "text-semear-green"}`}>{value}</strong>
    </div>
  );
}

function MiniList({ title, items }: { title: string; items: string[] }) {
  return (
    <section className="rounded-2xl border border-white/60 bg-white/60 p-4 shadow-premium-sm backdrop-blur-md">
      <h3 className="font-bold text-semear-green">{title}</h3>
      {items.length > 0 ? (
        <p className="mt-2 text-sm leading-relaxed text-stone-700 font-medium">{items.join(", ")}</p>
      ) : (
        <p className="mt-2 text-sm text-stone-400 font-medium">Não registrado.</p>
      )}
    </section>
  );
}

function EditableBlock({ label, value, onChange, area = false, compact = false }: { label: string; value: string; onChange: (value: string) => void; area?: boolean; compact?: boolean }) {
  return (
    <label className="block">
      <span className="text-sm font-bold text-semear-green">{label}</span>
      {area ? (
        <textarea className={`mt-2 w-full rounded-2xl border border-stone-200 bg-white/95 px-4 py-3 text-sm leading-relaxed text-stone-750 outline-none shadow-premium-sm transition-all duration-200 focus:border-semear-green focus:ring-1 focus:ring-semear-green ${compact ? "min-h-32" : "min-h-56"}`} value={value} onChange={(event) => onChange(event.target.value)} />
      ) : (
        <input className="mt-2 min-h-12 w-full rounded-2xl border border-stone-200 bg-white/95 px-4 text-sm font-bold text-stone-750 outline-none shadow-premium-sm transition-all duration-200 focus:border-semear-green focus:ring-1 focus:ring-semear-green" value={value} onChange={(event) => onChange(event.target.value)} />
      )}
    </label>
  );
}

function InfoPanel({ icon, title, children }: { icon: ReactNode; title: string; children: ReactNode }) {
  return (
    <section className="rounded-3xl border border-white/60 bg-white/60 p-5 shadow-premium-sm backdrop-blur-md">
      <div className="mb-4 flex items-center gap-3 text-semear-green">
        <div className="text-semear-green">{icon}</div>
        <h3 className="font-bold">{title}</h3>
      </div>
      {children}
    </section>
  );
}

function StatusNote({ active, title, text }: { active: boolean; title: string; text: string }) {
  return (
    <div className={`rounded-2xl border p-4 shadow-premium-sm transition-all duration-200 ${active ? "border-semear-green bg-semear-green-soft/40" : "border-white/60 bg-white/80"}`}>
      <p className="font-bold text-semear-green">{title}</p>
      <p className="mt-1 text-sm leading-relaxed text-stone-600 font-medium">{text}</p>
    </div>
  );
}

function Warning({ text, danger = false }: { text: string; danger?: boolean }) {
  return (
    <p className={`mt-4 rounded-2xl border p-4 text-sm font-semibold shadow-premium-sm ${danger ? "border-red-200 bg-red-50 text-red-800" : "border-amber-200 bg-amber-50 text-amber-900"}`}>
      {text}
    </p>
  );
}

function Ready({ text }: { text: string }) {
  return (
    <p className="mt-4 rounded-2xl border border-green-200 bg-green-50 p-4 text-sm font-semibold text-green-800 shadow-premium-sm">
      {text}
    </p>
  );
}

function StateBox({ children, tone = "neutral" }: { children: ReactNode; tone?: "neutral" | "error" }) {
  return (
    <div className={`rounded-3xl p-6 text-sm font-medium shadow-premium-md backdrop-blur-md ${tone === "error" ? "border border-red-200 bg-red-50 text-red-800" : "border border-white/60 bg-white/80 text-stone-600"}`}>
      {children}
    </div>
  );
}
