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
import {
  getActionPilotMetrics,
  getActionReadiness,
  type ActionForPilot,
  type ListeningRecordForPilot
} from "@/lib/action-pilot";
import { getActionTypeLabel } from "@/lib/actions";
import type { ActionDebrief, DebriefStatus, Json, Profile } from "@/lib/database.types";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";

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
  const [profile, setProfile] = useState<Pick<Profile, "id" | "role"> | null>(null);
  const [form, setForm] = useState<DebriefForm>(emptyForm);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);

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

      const [actionResult, recordsResult, debriefResult, profileResult] = await Promise.all([
        supabase.from("actions").select("*, neighborhoods:neighborhood_id(id, name)").eq("id", actionId).single(),
        supabase
          .from("listening_records")
          .select("*, listening_record_themes(themes:theme_id(id, name))")
          .eq("action_id", actionId)
          .order("created_at", { ascending: true }),
        supabase.from("action_debriefs").select("*").eq("action_id", actionId).maybeSingle(),
        userId ? supabase.from("profiles").select("id, role").eq("id", userId).maybeSingle() : Promise.resolve({ data: null, error: null })
      ]);

      if (ignore) return;

      if (actionResult.error || recordsResult.error || debriefResult.error || profileResult.error) {
        setError(
          actionResult.error?.message ??
            recordsResult.error?.message ??
            debriefResult.error?.message ??
            profileResult.error?.message ??
            "Erro ao carregar devolutiva."
        );
        setLoading(false);
        return;
      }

      const loadedAction = actionResult.data as ActionForPilot;
      const loadedRecords = (recordsResult.data ?? []) as ListeningRecordForPilot[];
      const loadedDebrief = debriefResult.data as ActionDebrief | null;

      setAction(loadedAction);
      setRecords(loadedRecords);
      setDebrief(loadedDebrief);
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
  const markdown = buildPublicDebriefMarkdown({
    title: form.title,
    action: loadedAction,
    readiness,
    publicSummary: form.public_summary,
    keyFindings: form.key_findings,
    nextSteps: form.next_steps,
    methodologyNote: form.methodology_note
  });
  const publicText = `${form.title}\n\n${form.public_summary}\n\n${form.key_findings}\n\nPróximos passos:\n${form.next_steps}\n\n${form.methodology_note}\n\n${defaultPrivacyNote}`;

  function updateField<TField extends keyof DebriefForm>(field: TField, value: DebriefForm[TField]) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  function generateDraft() {
    setForm({
      title: generated.title,
      public_summary: generated.publicSummary,
      methodology_note: generated.methodologyNote,
      key_findings: generated.keyFindings,
      next_steps: generated.nextSteps,
      team_review_text: generated.teamReviewText
    });
    setFeedback("Rascunho determinístico gerado. Revise antes de salvar ou aprovar.");
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

    const result = debrief
      ? await supabase.from("action_debriefs").update(payload).eq("id", debrief.id).select("*").single()
      : await supabase.from("action_debriefs").insert(payload).select("*").single();

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
      <div className="no-print mb-5 flex flex-wrap gap-3">
        <Link className="inline-flex min-h-11 items-center gap-2 rounded-full border border-semear-green/15 bg-white/70 px-4 text-sm font-semibold text-semear-green" href={`/acoes/${actionId}`}>
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          Voltar para ação
        </Link>
        <button className="inline-flex min-h-11 items-center gap-2 rounded-full border border-semear-green/15 bg-white px-4 text-sm font-semibold text-semear-green" onClick={generateDraft} type="button">
          <Sparkles className="h-4 w-4" aria-hidden="true" />
          Gerar rascunho determinístico
        </button>
      </div>

      <article className="print-sheet rounded-[2rem] border border-white/80 bg-white/82 p-5 shadow-soft sm:p-8">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-semear-earth">O que ouvimos nesta ação</p>
            <h2 className="mt-3 text-4xl font-semibold tracking-tight text-semear-green">{form.title}</h2>
            <p className="mt-3 text-sm leading-6 text-stone-600">
              {loadedAction.title} · {new Date(`${loadedAction.action_date}T00:00:00`).toLocaleDateString("pt-BR")} · {loadedAction.neighborhoods?.name ?? "Sem bairro definido"} · {getActionTypeLabel(loadedAction.action_type)}
            </p>
            <p className="mt-2 text-sm leading-6 text-stone-600">
              Rascunho é preparação interna; revisada ainda precisa de aprovação; aprovada é a versão pronta para circular.
            </p>
          </div>
          <div className="rounded-2xl bg-semear-green-soft px-4 py-3 text-sm font-semibold text-semear-green">
            {statusLabels[currentStatus]} · {readiness}
          </div>
        </div>

        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Metric label="Escutas" value={metrics.total} />
          <Metric label="Revisadas" value={metrics.reviewed} />
          <Metric label="Rascunhos" value={metrics.draft} danger={metrics.draft > 0} />
          <Metric label="Possível dado sensível" value={metrics.possibleSensitive} danger={metrics.possibleSensitive > 0} />
        </div>

        <div className="mt-6 grid gap-4 lg:grid-cols-2">
          <MiniList title="Temas mais citados" items={metrics.topThemes.slice(0, 5).map((item) => `${item.label} (${item.count})`)} />
          <MiniList title="Palavras recorrentes" items={metrics.topWords.slice(0, 8).map((item) => `${item.label} (${item.count})`)} />
          <MiniList title="Lugares mencionados" items={metrics.places.slice(0, 6).map((item) => `${item.label} (${item.count})`)} />
          <MiniList title="Prioridades apontadas" items={metrics.priorities.slice(0, 6).map((item) => `${item.label} (${item.count})`)} />
        </div>

        <div className="mt-6 grid gap-5 xl:grid-cols-[1fr_360px]">
          <div className="space-y-5">
            <EditableBlock label="Título público" value={form.title} onChange={(value) => updateField("title", value)} />
            <EditableBlock area label="Texto público" value={form.public_summary} onChange={(value) => updateField("public_summary", value)} />
            <EditableBlock area label="Principais achados" value={form.key_findings} onChange={(value) => updateField("key_findings", value)} />
            <EditableBlock area label="Próximos passos" value={form.next_steps} onChange={(value) => updateField("next_steps", value)} />
          </div>

          <aside className="space-y-5">
            <InfoPanel icon={<FileText className="h-5 w-5" />} title="Nota metodológica">
              <EditableBlock area label="Aviso metodológico" value={form.methodology_note} onChange={(value) => updateField("methodology_note", value)} compact />
            </InfoPanel>
            <InfoPanel icon={<ShieldCheck className="h-5 w-5" />} title="Privacidade">
              <p className="text-sm leading-6 text-stone-700">{defaultPrivacyNote}</p>
            </InfoPanel>
            <InfoPanel icon={<AlertTriangle className="h-5 w-5" />} title="Revisão humana">
              <EditableBlock area label="Anotações da equipe" value={form.team_review_text} onChange={(value) => updateField("team_review_text", value)} compact />
            </InfoPanel>
          </aside>
        </div>

        <footer className="print-only mt-10 border-t border-semear-gray pt-4 text-sm font-semibold text-semear-green">
          Projeto SEMEAR — UFF + APS
        </footer>
      </article>

      <div className="no-print mt-5 grid gap-4 lg:grid-cols-[1fr_420px]">
        <div className="rounded-[2rem] border border-white/80 bg-white p-5 shadow-soft">
          <h3 className="font-semibold text-semear-green">Estados da devolutiva</h3>
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
          {feedback ? <p className="mt-4 text-sm font-semibold text-semear-green">{feedback}</p> : null}
          {error ? <p className="mt-4 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">{error}</p> : null}
        </div>

        <div className="rounded-[2rem] border border-white/80 bg-white p-5 shadow-soft">
          <h3 className="font-semibold text-semear-green">Exportação e fluxo</h3>
          <div className="mt-4 flex flex-wrap gap-3">
            <button className="inline-flex min-h-11 items-center gap-2 rounded-full border border-semear-green/15 bg-white px-4 text-sm font-semibold text-semear-green" onClick={() => void copyText(publicText, "Texto público")} type="button">
              <Copy className="h-4 w-4" aria-hidden="true" />
              Copiar texto público
            </button>
            <button className="inline-flex min-h-11 items-center gap-2 rounded-full border border-semear-green/15 bg-white px-4 text-sm font-semibold text-semear-green" onClick={() => void copyText(markdown, "Markdown")} type="button">
              <FileText className="h-4 w-4" aria-hidden="true" />
              Copiar Markdown
            </button>
            <button className="inline-flex min-h-11 items-center gap-2 rounded-full border border-semear-green/15 bg-white px-4 text-sm font-semibold text-semear-green" onClick={downloadMarkdown} type="button">
              <Download className="h-4 w-4" aria-hidden="true" />
              Baixar .md
            </button>
            <button className="inline-flex min-h-11 items-center gap-2 rounded-full border border-semear-green/15 bg-white px-4 text-sm font-semibold text-semear-green" onClick={() => window.print()} type="button">
              <Printer className="h-4 w-4" aria-hidden="true" />
              Imprimir
            </button>
          </div>
          <div className="mt-5 flex flex-wrap gap-3">
            <button className="inline-flex min-h-12 items-center gap-2 rounded-full bg-semear-green px-5 text-sm font-semibold text-white disabled:opacity-60" disabled={saving} onClick={() => void saveDebrief("draft")} type="button">
              <Save className="h-4 w-4" aria-hidden="true" />
              Salvar rascunho
            </button>
            <button className="inline-flex min-h-12 items-center gap-2 rounded-full bg-semear-earth px-5 text-sm font-semibold text-white disabled:opacity-60" disabled={saving} onClick={() => void saveDebrief("reviewed")} type="button">
              <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
              Marcar revisada
            </button>
            <button className="inline-flex min-h-12 items-center gap-2 rounded-full bg-stone-900 px-5 text-sm font-semibold text-white disabled:opacity-60" disabled={saving || !canApprove} onClick={() => void saveDebrief("approved")} type="button">
              <ShieldCheck className="h-4 w-4" aria-hidden="true" />
              Aprovar
            </button>
          </div>
          {!canApprove ? <p className="mt-3 text-sm text-stone-600">Aprovação final é restrita à coordenação ou admin.</p> : null}
        </div>
      </div>
    </section>
  );
}

function Metric({ label, value, danger = false }: { label: string; value: number; danger?: boolean }) {
  return (
    <div className={`rounded-2xl border p-4 ${danger ? "border-red-100 bg-red-50" : "border-semear-gray bg-semear-offwhite"}`}>
      <p className={`text-xs font-semibold uppercase tracking-[0.12em] ${danger ? "text-red-800" : "text-stone-500"}`}>{label}</p>
      <strong className={`mt-2 block text-3xl font-semibold ${danger ? "text-red-800" : "text-semear-green"}`}>{value}</strong>
    </div>
  );
}

function MiniList({ title, items }: { title: string; items: string[] }) {
  return (
    <section className="rounded-2xl border border-semear-gray bg-semear-offwhite p-4">
      <h3 className="font-semibold text-semear-green">{title}</h3>
      {items.length > 0 ? <p className="mt-2 text-sm leading-6 text-stone-700">{items.join(", ")}</p> : <p className="mt-2 text-sm text-stone-500">Não registrado.</p>}
    </section>
  );
}

function EditableBlock({ label, value, onChange, area = false, compact = false }: { label: string; value: string; onChange: (value: string) => void; area?: boolean; compact?: boolean }) {
  return (
    <label className="block">
      <span className="text-sm font-semibold text-semear-green">{label}</span>
      {area ? (
        <textarea className={`mt-2 w-full rounded-2xl border border-semear-gray bg-white px-4 py-3 text-sm leading-7 outline-none focus:border-semear-green ${compact ? "min-h-32" : "min-h-56"}`} value={value} onChange={(event) => onChange(event.target.value)} />
      ) : (
        <input className="mt-2 min-h-12 w-full rounded-2xl border border-semear-gray bg-white px-4 text-sm outline-none focus:border-semear-green" value={value} onChange={(event) => onChange(event.target.value)} />
      )}
    </label>
  );
}

function InfoPanel({ icon, title, children }: { icon: ReactNode; title: string; children: ReactNode }) {
  return (
    <section className="rounded-2xl border border-semear-green/15 bg-semear-offwhite p-5">
      <div className="mb-4 flex items-center gap-3 text-semear-green">
        {icon}
        <h3 className="font-semibold">{title}</h3>
      </div>
      {children}
    </section>
  );
}

function StatusNote({ active, title, text }: { active: boolean; title: string; text: string }) {
  return (
    <div className={`rounded-2xl border p-4 ${active ? "border-semear-green bg-semear-green-soft" : "border-semear-gray bg-semear-offwhite"}`}>
      <p className="font-semibold text-semear-green">{title}</p>
      <p className="mt-1 text-sm leading-5 text-stone-600">{text}</p>
    </div>
  );
}

function Warning({ text, danger = false }: { text: string; danger?: boolean }) {
  return <p className={`mt-4 rounded-2xl border p-4 text-sm font-medium ${danger ? "border-red-200 bg-red-50 text-red-800" : "border-amber-200 bg-amber-50 text-amber-900"}`}>{text}</p>;
}

function Ready({ text }: { text: string }) {
  return <p className="mt-4 rounded-2xl border border-green-200 bg-green-50 p-4 text-sm font-medium text-green-800">{text}</p>;
}

function StateBox({ children, tone = "neutral" }: { children: ReactNode; tone?: "neutral" | "error" }) {
  return <div className={`rounded-[1.5rem] p-6 text-sm shadow-soft ${tone === "error" ? "border border-red-200 bg-red-50 text-red-800" : "bg-white/72 text-stone-600"}`}>{children}</div>;
}
