"use client";

import { useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import Link from "next/link";
import { AlertTriangle, ArrowLeft, CheckCircle2, Copy, FileText, FolderCheck, Printer, RotateCcw, Save } from "lucide-react";
import {
  buildClosureMarkdown,
  defaultClosureChecklist,
  getClosureCanClose,
  getClosureStatusLabel,
  parseClosureChecklist,
  type ClosureChecklist
} from "@/lib/action-closures";
import { getActionPilotMetrics, getActionReadiness, type ActionForPilot, type ListeningRecordForPilot } from "@/lib/action-pilot";
import { getActionStatusLabel, getActionTypeLabel } from "@/lib/actions";
import type { ActionClosure, ActionDebrief, ClosureStatus, Json, Profile } from "@/lib/database.types";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";

type Props = {
  actionId: string;
};

type ClosureForm = {
  status: ClosureStatus;
  coordination_sufficiency: boolean;
  sufficiency_reason: string;
  evidence_notes: string;
  internal_notes: string;
  documentation_checklist: ClosureChecklist;
};

const emptyForm: ClosureForm = {
  status: "open",
  coordination_sufficiency: false,
  sufficiency_reason: "",
  evidence_notes: "",
  internal_notes: "",
  documentation_checklist: defaultClosureChecklist
};

export function ActionDossierPage({ actionId }: Props) {
  const supabase = useMemo(() => createBrowserSupabaseClient(), []);
  const [action, setAction] = useState<ActionForPilot | null>(null);
  const [records, setRecords] = useState<ListeningRecordForPilot[]>([]);
  const [debrief, setDebrief] = useState<ActionDebrief | null>(null);
  const [closure, setClosure] = useState<ActionClosure | null>(null);
  const [profile, setProfile] = useState<Pick<Profile, "id" | "role"> | null>(null);
  const [form, setForm] = useState<ClosureForm>(emptyForm);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);

  useEffect(() => {
    let ignore = false;

    async function load() {
      if (!supabase) {
        setError("Configure NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_ANON_KEY para abrir o dossiê.");
        setLoading(false);
        return;
      }

      const userResult = await supabase.auth.getUser();
      const userId = userResult.data.user?.id;
      const [actionResult, recordsResult, debriefResult, closureResult, profileResult] = await Promise.all([
        supabase.from("actions").select("*, neighborhoods:neighborhood_id(id, name)").eq("id", actionId).single(),
        supabase.from("listening_records").select("*, listening_record_themes(themes:theme_id(id, name))").eq("action_id", actionId).order("created_at", { ascending: true }),
        supabase.from("action_debriefs").select("*").eq("action_id", actionId).maybeSingle(),
        supabase.from("action_closures").select("*").eq("action_id", actionId).maybeSingle(),
        userId ? supabase.from("profiles").select("id, role").eq("id", userId).maybeSingle() : Promise.resolve({ data: null, error: null })
      ]);

      if (ignore) return;
      if (actionResult.error || recordsResult.error || debriefResult.error || closureResult.error || profileResult.error) {
        setError(actionResult.error?.message ?? recordsResult.error?.message ?? debriefResult.error?.message ?? closureResult.error?.message ?? profileResult.error?.message ?? "Erro ao carregar dossiê.");
        setLoading(false);
        return;
      }

      const loadedClosure = closureResult.data as ActionClosure | null;
      setAction(actionResult.data as ActionForPilot);
      setRecords((recordsResult.data ?? []) as ListeningRecordForPilot[]);
      setDebrief(debriefResult.data as ActionDebrief | null);
      setClosure(loadedClosure);
      setProfile(profileResult.data as Pick<Profile, "id" | "role"> | null);
      if (loadedClosure) {
        setForm({
          status: loadedClosure.status,
          coordination_sufficiency: loadedClosure.coordination_sufficiency,
          sufficiency_reason: loadedClosure.sufficiency_reason ?? "",
          evidence_notes: loadedClosure.evidence_notes ?? "",
          internal_notes: loadedClosure.internal_notes ?? "",
          documentation_checklist: parseClosureChecklist(loadedClosure.documentation_checklist)
        });
      }
      setLoading(false);
    }

    void load();
    return () => {
      ignore = true;
    };
  }, [actionId, supabase]);

  if (loading) return <StateBox>Carregando dossiê da ação...</StateBox>;
  if (error || !action) return <StateBox tone="error">{error ?? "Ação não encontrada."}</StateBox>;

  const loadedAction = action;
  const metrics = getActionPilotMetrics(records);
  const reviewedPercent = metrics.total > 0 ? Math.round((metrics.reviewed / metrics.total) * 100) : 0;
  const canCoordinate = profile?.role === "admin" || profile?.role === "coordenacao";
  const virtualClosure = closure ? { ...closure, ...form, documentation_checklist: form.documentation_checklist as unknown as Json } : null;
  const markdown = buildClosureMarkdown({ action: loadedAction, records, debrief, closure: virtualClosure as ActionClosure | null });
  const canClose = getClosureCanClose({ records, debrief, closure: virtualClosure });

  function updateField<TField extends keyof ClosureForm>(field: TField, value: ClosureForm[TField]) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  function updateChecklist(field: keyof ClosureChecklist, value: boolean) {
    setForm((current) => ({
      ...current,
      documentation_checklist: { ...current.documentation_checklist, [field]: value }
    }));
  }

  async function persist(status: ClosureStatus, extra?: Pick<ActionClosure, "closed_by" | "closed_at"> | Pick<ActionClosure, "reopened_by" | "reopened_at">) {
    if (!supabase) return null;
    const user = (await supabase.auth.getUser()).data.user;
    if (!user) {
      setError("Entre no sistema antes de salvar o dossiê.");
      return null;
    }

    const payload = {
      action_id: loadedAction.id,
      status,
      coordination_sufficiency: form.coordination_sufficiency,
      sufficiency_reason: form.coordination_sufficiency ? form.sufficiency_reason.trim() : null,
      documentation_checklist: form.documentation_checklist as unknown as Json,
      evidence_notes: form.evidence_notes.trim() || null,
      internal_notes: form.internal_notes.trim() || null,
      created_by: closure?.created_by ?? user.id,
      ...extra
    };

    const result = closure
      ? await supabase.from("action_closures").update(payload).eq("id", closure.id).select("*").single()
      : await supabase.from("action_closures").insert(payload).select("*").single();

    if (result.error) {
      setError(result.error.message);
      return null;
    }

    setClosure(result.data as ActionClosure);
    setForm((current) => ({ ...current, status: result.data.status as ClosureStatus }));
    return result.data as ActionClosure;
  }

  async function save(status: ClosureStatus = form.status) {
    setSaving(true);
    setError(null);
    setFeedback(null);
    const saved = await persist(status);
    setSaving(false);
    if (saved) setFeedback("Dossiê salvo.");
  }

  async function closeAction() {
    setError(null);
    setFeedback(null);
    if (!canCoordinate) {
      setError("Apenas coordenação ou admin podem fechar a ação.");
      return;
    }
    if (form.coordination_sufficiency && !form.sufficiency_reason.trim()) {
      setError("Informe a justificativa da suficiência antes de fechar.");
      return;
    }
    if (!canClose.ok) {
      setError(canClose.reason);
      return;
    }
    const user = (await supabase?.auth.getUser())?.data.user;
    if (!user) {
      setError("Entre no sistema antes de fechar a ação.");
      return;
    }
    setSaving(true);
    const saved = await persist("closed", { closed_by: user.id, closed_at: new Date().toISOString() });
    setSaving(false);
    if (saved) setFeedback("Ação fechada com registro de auditoria.");
  }

  async function reopenAction() {
    setError(null);
    setFeedback(null);
    if (!canCoordinate) {
      setError("Apenas coordenação ou admin podem reabrir a ação.");
      return;
    }
    if (!form.internal_notes.trim()) {
      setError("Registre a justificativa da reabertura nas notas internas.");
      return;
    }
    const user = (await supabase?.auth.getUser())?.data.user;
    if (!user) {
      setError("Entre no sistema antes de reabrir a ação.");
      return;
    }
    setSaving(true);
    const saved = await persist("reopened", { reopened_by: user.id, reopened_at: new Date().toISOString() });
    setSaving(false);
    if (saved) setFeedback("Ação reaberta com registro de auditoria.");
  }

  async function copyMarkdown() {
    await navigator.clipboard.writeText(markdown);
    setFeedback("Markdown do dossiê copiado.");
  }

  async function copySummary() {
    await navigator.clipboard.writeText(`Dossiê da ação ${loadedAction.title}: ${metrics.total} escutas, ${metrics.reviewed} revisadas (${reviewedPercent}%), ${metrics.pending} pendência(s), devolutiva ${debrief?.status ?? "não criada"}, dossiê ${getClosureStatusLabel(form.status)}.`);
    setFeedback("Resumo do dossiê copiado.");
  }

  return (
    <section className="pb-10">
      <div className="no-print mb-5 flex flex-wrap gap-3">
        <Link className="inline-flex min-h-11 items-center gap-2 rounded-full border border-semear-green/15 bg-white/70 px-4 text-sm font-semibold text-semear-green" href={`/acoes/${actionId}`}>
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          Voltar para ação
        </Link>
        <button className="inline-flex min-h-11 items-center gap-2 rounded-full border border-semear-green/15 bg-white px-4 text-sm font-semibold text-semear-green" onClick={() => window.print()} type="button">
          <Printer className="h-4 w-4" aria-hidden="true" />
          Imprimir dossiê
        </button>
        <button className="inline-flex min-h-11 items-center gap-2 rounded-full border border-semear-green/15 bg-white px-4 text-sm font-semibold text-semear-green" onClick={() => void copySummary()} type="button">
          <Copy className="h-4 w-4" aria-hidden="true" />
          Copiar resumo
        </button>
        <button className="inline-flex min-h-11 items-center gap-2 rounded-full border border-semear-green/15 bg-white px-4 text-sm font-semibold text-semear-green" onClick={() => void copyMarkdown()} type="button">
          <FileText className="h-4 w-4" aria-hidden="true" />
          Copiar markdown
        </button>
      </div>

      <article className="print-sheet rounded-[2rem] border border-white/80 bg-white/82 p-5 shadow-soft sm:p-8">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-semear-earth">Dossiê da ação</p>
            <h2 className="mt-3 text-4xl font-semibold tracking-tight text-semear-green">{loadedAction.title}</h2>
            <p className="mt-3 text-sm leading-6 text-stone-600">
              {new Date(`${loadedAction.action_date}T00:00:00`).toLocaleDateString("pt-BR")} · {loadedAction.neighborhoods?.name ?? "Sem bairro"} · {getActionTypeLabel(loadedAction.action_type)} · {getActionStatusLabel(loadedAction.status)}
            </p>
            <p className="mt-2 text-sm leading-6 text-stone-600">
              Dossiê aberto organiza pendências; fechado registra decisão operacional e memória interna da ação.
            </p>
            <p className="mt-2 text-sm leading-6 text-stone-600">
              O relatório pós-banca é documento interno para decidir se o próximo passo é mapa, melhoria operacional ou relatório institucional.
            </p>
          </div>
          <div className="rounded-2xl bg-semear-green-soft px-4 py-3 text-sm font-semibold text-semear-green">
            {getClosureStatusLabel(form.status)} · {getActionReadiness(records, form.coordination_sufficiency)}
          </div>
        </div>

        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          <Metric label="Escutas" value={metrics.total} />
          <Metric label="Revisadas" value={metrics.reviewed} />
          <Metric label="Rascunhos" value={metrics.draft} danger={metrics.draft > 0} />
          <Metric label="% revisado" value={reviewedPercent} />
          <Metric label="Dado sensível" value={metrics.possibleSensitive} danger={metrics.possibleSensitive > 0} />
        </div>

        <div className="mt-6 grid gap-5 lg:grid-cols-2">
          <Panel title="Checklist documental" icon={<FolderCheck className="h-5 w-5" />}>
            <ChecklistRow label="ação cadastrada" done={Boolean(loadedAction.id)} />
            <ChecklistRow label="bairro definido" done={Boolean(loadedAction.neighborhood_id)} />
            <ChecklistRow label="data definida" done={Boolean(loadedAction.action_date)} />
            <ChecklistRow label="equipe registrada" done={Boolean(loadedAction.team?.trim())} />
            <ChecklistRow label="fichas digitadas" done={metrics.total > 0} />
            <ChecklistRow label="escutas revisadas" done={metrics.reviewed > 0} />
            <ChecklistRow label="devolutiva gerada" done={Boolean(debrief)} />
            <ChecklistRow label="devolutiva aprovada" done={debrief?.status === "approved"} />
            <ChecklistToggle label="evidências organizadas" checked={form.documentation_checklist.evidenceOrganized} onChange={(value) => updateChecklist("evidenceOrganized", value)} />
            <ChecklistToggle label="relatório mensal vinculado/preparado" checked={form.documentation_checklist.monthlyReportPrepared} onChange={(value) => updateChecklist("monthlyReportPrepared", value)} />
          </Panel>

          <Panel title="Devolutiva" icon={<FileText className="h-5 w-5" />}>
            <p className="text-sm leading-6 text-stone-700">Status: <strong>{debrief ? debrief.status : "não criada"}</strong></p>
            <p className="mt-2 text-sm leading-6 text-stone-700">Aprovação: {debrief?.approved_at ? new Date(debrief.approved_at).toLocaleString("pt-BR") : "não aprovada"}</p>
            <p className="mt-2 text-sm leading-6 text-stone-700">Atualizada em: {debrief?.updated_at ? new Date(debrief.updated_at).toLocaleString("pt-BR") : "sem registro"}</p>
            <Link className="no-print mt-4 inline-flex min-h-11 items-center rounded-full bg-semear-green px-4 text-sm font-semibold text-white" href={`/acoes/${actionId}/devolutiva`}>
              Abrir devolutiva
            </Link>
            {debrief?.status !== "approved" ? <Warning text="A devolutiva ainda não está aprovada." /> : null}
          </Panel>
        </div>

        <div className="mt-6 grid gap-5 lg:grid-cols-2">
          <Panel title="Síntese determinística" icon={<FileText className="h-5 w-5" />}>
            <Mini title="Temas mais citados" items={metrics.topThemes.map((item) => `${item.label} (${item.count})`)} />
            <Mini title="Palavras recorrentes" items={metrics.topWords.map((item) => `${item.label} (${item.count})`)} />
            <Mini title="Lugares mencionados" items={metrics.places.map((item) => `${item.label} (${item.count})`)} />
            <Mini title="Prioridades apontadas" items={metrics.priorities.map((item) => `${item.label} (${item.count})`)} />
            <Mini title="Observações inesperadas" items={metrics.unexpected} />
          </Panel>

          <Panel title="Decisão da coordenação e notas" icon={<CheckCircle2 className="h-5 w-5" />}>
            <label className={`flex items-start gap-3 rounded-2xl border border-semear-gray bg-semear-offwhite p-4 text-sm ${!canCoordinate ? "opacity-60" : ""}`}>
              <input checked={form.coordination_sufficiency} disabled={!canCoordinate} onChange={(event) => updateField("coordination_sufficiency", event.target.checked)} type="checkbox" />
              <span>Coordenação considera a revisão suficiente para fechamento</span>
            </label>
            <Textarea label="Justificativa de suficiência" value={form.sufficiency_reason} onChange={(value) => updateField("sufficiency_reason", value)} disabled={!canCoordinate} />
            <Textarea label="Observações de documentação/evidências" value={form.evidence_notes} onChange={(value) => updateField("evidence_notes", value)} />
            <Textarea label="Observações internas da coordenação" value={form.internal_notes} onChange={(value) => updateField("internal_notes", value)} />
            <p className="text-sm text-stone-600">Fechado em: {closure?.closed_at ? new Date(closure.closed_at).toLocaleString("pt-BR") : "não fechado"}</p>
            <p className="text-sm text-stone-600">Reaberto em: {closure?.reopened_at ? new Date(closure.reopened_at).toLocaleString("pt-BR") : "não reaberto"}</p>
          </Panel>
        </div>

        <footer className="print-only mt-10 border-t border-semear-gray pt-4 text-sm font-semibold text-semear-green">
          Projeto SEMEAR — UFF + APS
        </footer>
      </article>

      <div className="no-print mt-5 rounded-[2rem] border border-white/80 bg-white p-5 shadow-soft">
        <div className="flex flex-wrap gap-3">
          <button className="inline-flex min-h-12 items-center gap-2 rounded-full bg-semear-green px-5 text-sm font-semibold text-white disabled:opacity-60" disabled={saving} onClick={() => void save()} type="button">
            <Save className="h-4 w-4" aria-hidden="true" />
            Salvar dossiê
          </button>
          <button className="inline-flex min-h-12 items-center gap-2 rounded-full bg-stone-900 px-5 text-sm font-semibold text-white disabled:opacity-60" disabled={saving || !canCoordinate} onClick={() => void closeAction()} type="button">
            <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
            Fechar ação
          </button>
          <button className="inline-flex min-h-12 items-center gap-2 rounded-full border border-semear-green/15 bg-white px-5 text-sm font-semibold text-semear-green disabled:opacity-60" disabled={saving || !canCoordinate} onClick={() => void reopenAction()} type="button">
            <RotateCcw className="h-4 w-4" aria-hidden="true" />
            Reabrir ação
          </button>
        </div>
        <p className="mt-4 text-sm text-stone-600">{canClose.reason}</p>
        {debrief?.status !== "approved" ? <Warning text="A devolutiva não aprovada gera alerta, mas não bloqueia o fechamento." /> : null}
        {feedback ? <p className="mt-4 text-sm font-semibold text-semear-green">{feedback}</p> : null}
        {error ? <p className="mt-4 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">{error}</p> : null}
      </div>
    </section>
  );
}

function Metric({ label, value, danger = false }: { label: string; value: number; danger?: boolean }) {
  return <div className={`rounded-2xl border p-4 ${danger ? "border-red-100 bg-red-50" : "border-semear-gray bg-semear-offwhite"}`}><p className={`text-xs font-semibold uppercase tracking-[0.12em] ${danger ? "text-red-800" : "text-stone-500"}`}>{label}</p><strong className={`mt-2 block text-3xl font-semibold ${danger ? "text-red-800" : "text-semear-green"}`}>{value}</strong></div>;
}

function Panel({ title, icon, children }: { title: string; icon: ReactNode; children: ReactNode }) {
  return <section className="rounded-[2rem] border border-white/80 bg-white p-5 shadow-soft"><div className="mb-4 flex items-center gap-3 text-semear-green">{icon}<h3 className="font-semibold">{title}</h3></div>{children}</section>;
}

function ChecklistRow({ label, done }: { label: string; done: boolean }) {
  return <div className="mb-2 flex items-center gap-3 rounded-2xl border border-semear-gray bg-semear-offwhite p-3 text-sm">{done ? <CheckCircle2 className="h-4 w-4 text-green-600" /> : <AlertTriangle className="h-4 w-4 text-amber-700" />}<span>{label}</span></div>;
}

function ChecklistToggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (value: boolean) => void }) {
  return <label className="mb-2 flex items-center gap-3 rounded-2xl border border-semear-gray bg-semear-offwhite p-3 text-sm"><input checked={checked} onChange={(event) => onChange(event.target.checked)} type="checkbox" /><span>{label}</span></label>;
}

function Mini({ title, items }: { title: string; items: string[] }) {
  return <div className="mb-4 rounded-2xl bg-semear-offwhite p-4"><p className="font-semibold text-semear-green">{title}</p><p className="mt-2 text-sm leading-6 text-stone-700">{items.length > 0 ? items.slice(0, 8).join(", ") : "Não registrado."}</p></div>;
}

function Textarea({ label, value, onChange, disabled = false }: { label: string; value: string; onChange: (value: string) => void; disabled?: boolean }) {
  return <label className="mt-4 block"><span className="text-sm font-semibold text-semear-green">{label}</span><textarea className="mt-2 min-h-28 w-full rounded-2xl border border-semear-gray bg-white px-4 py-3 text-sm leading-6 outline-none focus:border-semear-green disabled:opacity-60" disabled={disabled} value={value} onChange={(event) => onChange(event.target.value)} /></label>;
}

function Warning({ text }: { text: string }) {
  return <p className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm font-medium text-amber-900">{text}</p>;
}

function StateBox({ children, tone = "neutral" }: { children: ReactNode; tone?: "neutral" | "error" }) {
  return <div className={`rounded-[1.5rem] p-6 text-sm shadow-soft ${tone === "error" ? "border border-red-200 bg-red-50 text-red-800" : "bg-white/72 text-stone-600"}`}>{children}</div>;
}
