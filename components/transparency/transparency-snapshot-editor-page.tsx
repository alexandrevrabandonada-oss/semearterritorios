"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Archive, CheckCircle2, Eye, FileJson, RefreshCw, Save, Send, ShieldAlert } from "lucide-react";
import type { ActionClosure, ActionDebrief, Profile, PublicTransparencySnapshot } from "@/lib/database.types";
import { TransparencyPrivacyChecklist } from "@/components/transparency/transparency-privacy-checklist";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";
import {
  buildTransparencySnapshotDraft,
  getSnapshotStatusLabel,
  mergeTransparencyDraftIntoSnapshot,
  type SnapshotAction,
  type SnapshotRecord
} from "@/lib/transparency-snapshots";
import {
  buildTransparencyTextBlob,
  createEmptyTransparencyChecklist,
  detectTransparencyPrivacyRisks,
  isTransparencyChecklistComplete,
  normalizeTransparencyChecklist,
  type TransparencyChecklistState
} from "@/lib/transparency-privacy";

type SnapshotEditorProps = {
  snapshotId: string;
};

type NamedProfile = Pick<Profile, "id" | "role" | "full_name">;

type FormState = {
  title: string;
  period_start: string;
  period_end: string;
  public_summary: string;
  privacy_notes: string;
  methodology_notes: string;
  opening_text: string;
  listening_text: string;
  limits_text: string;
  next_steps_text: string;
};

export function TransparencySnapshotEditorPage({ snapshotId }: SnapshotEditorProps) {
  const supabase = useMemo(() => createBrowserSupabaseClient(), []);
  const [snapshot, setSnapshot] = useState<PublicTransparencySnapshot | null>(null);
  const [form, setForm] = useState<FormState | null>(null);
  const [checklist, setChecklist] = useState<TransparencyChecklistState>(createEmptyTransparencyChecklist());
  const [profile, setProfile] = useState<Pick<Profile, "id" | "role"> | null>(null);
  const [people, setPeople] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);

  useEffect(() => {
    let ignore = false;
    async function load() {
      if (!supabase) {
        setError("Configure NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_ANON_KEY para editar snapshots.");
        setLoading(false);
        return;
      }

      const userResult = await supabase.auth.getUser();
      const userId = userResult.data.user?.id ?? null;
      const [snapshotResult, profileResult] = await Promise.all([
        supabase.from("public_transparency_snapshots").select("*").eq("id", snapshotId).maybeSingle(),
        userId ? supabase.from("profiles").select("id, role").eq("id", userId).maybeSingle() : Promise.resolve({ data: null, error: null })
      ]);

      if (ignore) return;

      if (snapshotResult.error || profileResult.error) {
        setError(snapshotResult.error?.message ?? profileResult.error?.message ?? "Erro ao carregar snapshot.");
        setLoading(false);
        return;
      }

      const loadedSnapshot = (snapshotResult.data ?? null) as PublicTransparencySnapshot | null;
      setSnapshot(loadedSnapshot);
      setProfile((profileResult.data ?? null) as Pick<Profile, "id" | "role"> | null);

      if (!loadedSnapshot) {
        setLoading(false);
        return;
      }

      setForm(toFormState(loadedSnapshot));
      setChecklist(normalizeTransparencyChecklist(loadedSnapshot.review_checklist));

      const personIds = [loadedSnapshot.created_by, loadedSnapshot.last_edited_by, loadedSnapshot.last_reviewed_by, loadedSnapshot.approved_by].filter(Boolean) as string[];
      if (personIds.length > 0) {
        const peopleResult = await supabase.from("profiles").select("id, full_name, role").in("id", personIds);
        if (!ignore && !peopleResult.error) {
          setPeople(buildPeopleMap((peopleResult.data ?? []) as NamedProfile[]));
        }
      }

      setLoading(false);
    }

    void load();
    return () => {
      ignore = true;
    };
  }, [snapshotId, supabase]);

  const riskReport = detectTransparencyPrivacyRisks(
    buildTransparencyTextBlob(form ? [
      form.title,
      form.public_summary,
      form.privacy_notes,
      form.methodology_notes,
      form.opening_text,
      form.listening_text,
      form.limits_text,
      form.next_steps_text
    ] : [])
  );

  const canCoordinate = profile?.role === "admin" || profile?.role === "coordenacao";
  const checklistComplete = isTransparencyChecklistComplete(checklist);

  async function saveDraft(explicitStatus?: PublicTransparencySnapshot["status"]) {
    if (!supabase || !snapshot || !form) return;
    setSaving(true);
    setError(null);
    setFeedback(null);

    const nextStatus = explicitStatus ?? (snapshot.status === "published" ? "reviewed" : snapshot.status);
    const payload = {
      ...form,
      public_summary: form.public_summary.trim(),
      review_checklist: checklist,
      status: nextStatus
    };

    const result = await supabase
      .from("public_transparency_snapshots")
      .update(payload)
      .eq("id", snapshot.id)
      .select("*")
      .single();

    if (result.error) {
      setError(result.error.message);
    } else {
      const updated = result.data as PublicTransparencySnapshot;
      setSnapshot(updated);
      setForm(toFormState(updated));
      setChecklist(normalizeTransparencyChecklist(updated.review_checklist));
      setFeedback(
        snapshot.status === "published" && nextStatus === "reviewed"
          ? "Snapshot publicado foi reaberto para revisão após edição."
          : "Snapshot salvo."
      );
    }

    setSaving(false);
  }

  async function regenerateAutomaticBlocks() {
    if (!supabase || !snapshot) return;
    setSaving(true);
    setError(null);
    setFeedback(null);

    const [actionsResult, recordsResult, debriefsResult, closuresResult] = await Promise.all([
      supabase.from("actions").select("*, neighborhoods:neighborhood_id(id, name)").order("action_date", { ascending: false }),
      supabase.from("listening_records").select("*, neighborhoods:neighborhood_id(id, name), respondent_neighborhood:respondent_neighborhood_id(id, name), listening_record_themes(themes:theme_id(id, name))"),
      supabase.from("action_debriefs").select("*"),
      supabase.from("action_closures").select("*")
    ]);

    if (actionsResult.error || recordsResult.error || debriefsResult.error || closuresResult.error) {
      setError(actionsResult.error?.message ?? recordsResult.error?.message ?? debriefsResult.error?.message ?? closuresResult.error?.message ?? "Erro ao regenerar blocos automáticos.");
      setSaving(false);
      return;
    }

    const draft = buildTransparencySnapshotDraft({
      actions: (actionsResult.data ?? []) as SnapshotAction[],
      records: (recordsResult.data ?? []) as unknown as SnapshotRecord[],
      debriefs: (debriefsResult.data ?? []) as ActionDebrief[],
      closures: (closuresResult.data ?? []) as ActionClosure[]
    });

    const merged = mergeTransparencyDraftIntoSnapshot(snapshot, draft);
    const result = await supabase
      .from("public_transparency_snapshots")
      .update({
        period_start: merged.period_start,
        period_end: merged.period_end,
        generated_summary: merged.generated_summary,
        public_summary: merged.public_summary,
        edited_summary: merged.edited_summary,
        totals: merged.totals,
        territory_summary: merged.territory_summary,
        theme_summary: merged.theme_summary,
        word_summary: merged.word_summary,
        action_timeline: merged.action_timeline,
        debrief_links: merged.debrief_links,
        status: snapshot.status === "published" ? "reviewed" : snapshot.status
      })
      .eq("id", snapshot.id)
      .select("*")
      .single();

    if (result.error) {
      setError(result.error.message);
    } else {
      const updated = result.data as PublicTransparencySnapshot;
      setSnapshot(updated);
      setForm(toFormState(updated));
      setChecklist(normalizeTransparencyChecklist(updated.review_checklist));
      setFeedback("Blocos automáticos regenerados a partir dos dados agregados.");
    }

    setSaving(false);
  }

  async function transition(status: PublicTransparencySnapshot["status"]) {
    if (!supabase || !snapshot) return;
    if (status === "published" && (!checklistComplete || riskReport.hasBlockingRisk)) {
      setError("Checklist incompleto ou risco bloqueante detectado. A publicação foi bloqueada.");
      return;
    }

    setSaving(true);
    setError(null);
    setFeedback(null);

    const result = await supabase
      .from("public_transparency_snapshots")
      .update({
        ...form,
        review_checklist: checklist,
        status
      })
      .eq("id", snapshot.id)
      .select("*")
      .single();

    if (result.error) {
      setError(result.error.message);
    } else {
      const updated = result.data as PublicTransparencySnapshot;
      setSnapshot(updated);
      setForm(toFormState(updated));
      setChecklist(normalizeTransparencyChecklist(updated.review_checklist));
      setFeedback(`Snapshot marcado como ${getSnapshotStatusLabel(updated.status)}.`);
    }

    setSaving(false);
  }

  if (loading) return <StateBox>Carregando editor de snapshot...</StateBox>;
  if (error && !snapshot) return <StateBox tone="error">{error}</StateBox>;
  if (!snapshot || !form) return <StateBox>Snapshot não encontrado.</StateBox>;

  const diffItems = buildSummaryDiff(snapshot.generated_summary ?? "", form.public_summary);
  const territories = ((snapshot.territory_summary ?? []) as Array<{ territory: string; reviewed_records: number; public_status: string }>).slice(0, 12);

  return (
    <section className="pb-10">
      <div className="rounded-[2rem] border border-white/80 bg-white/78 p-6 shadow-soft sm:p-8">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-semear-earth">Editor revisável de snapshot</p>
            <h2 className="mt-3 text-4xl font-semibold tracking-tight text-semear-green">{form.title}</h2>
            <p className="mt-3 text-sm leading-6 text-stone-600">
              Status atual: <strong>{getSnapshotStatusLabel(snapshot.status)}</strong>. O payload público continua restrito a `published`.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link className="inline-flex min-h-11 items-center gap-2 rounded-full border border-semear-green/15 bg-white px-4 text-sm font-semibold text-semear-green" href="/transparencia/snapshots">
              Voltar à lista
            </Link>
            <Link className="inline-flex min-h-11 items-center gap-2 rounded-full border border-semear-green/15 bg-white px-4 text-sm font-semibold text-semear-green" href="/transparencia/preview">
              <Eye className="h-4 w-4" /> Preview
            </Link>
          </div>
        </div>
      </div>

      {error ? <StateBox tone="error">{error}</StateBox> : null}
      {feedback ? <StateBox>{feedback}</StateBox> : null}

      <div className="mt-6 grid gap-5 xl:grid-cols-[1.1fr_0.9fr]">
        <section className="rounded-[2rem] border border-white/80 bg-white p-5 shadow-soft">
          <div className="mb-4 flex flex-wrap gap-2">
            <ActionButton disabled={saving} icon={<Save className="h-4 w-4" />} label="Salvar edição" onClick={() => void saveDraft()} />
            <ActionButton disabled={saving} icon={<RefreshCw className="h-4 w-4" />} label="Regerar blocos automáticos" onClick={() => void regenerateAutomaticBlocks()} />
            {canCoordinate ? <ActionButton disabled={saving} icon={<CheckCircle2 className="h-4 w-4" />} label="Marcar revisado" onClick={() => void transition("reviewed")} /> : null}
            {canCoordinate ? <ActionButton disabled={saving || !checklistComplete || riskReport.hasBlockingRisk} icon={<CheckCircle2 className="h-4 w-4" />} label="Aprovar" onClick={() => void transition("approved")} /> : null}
            {canCoordinate ? <ActionButton disabled={saving || !checklistComplete || riskReport.hasBlockingRisk} icon={<Send className="h-4 w-4" />} label="Publicar" onClick={() => void transition("published")} /> : null}
            {canCoordinate ? <ActionButton disabled={saving} icon={<Archive className="h-4 w-4" />} label="Arquivar" onClick={() => void transition("archived")} /> : null}
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Título"><input className="mt-2 min-h-11 w-full rounded-2xl border border-semear-gray bg-white px-4 text-sm outline-none focus:border-semear-green" onChange={(event) => setForm({ ...form, title: event.target.value })} value={form.title} /></Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Período inicial"><input className="mt-2 min-h-11 w-full rounded-2xl border border-semear-gray bg-white px-4 text-sm outline-none focus:border-semear-green" onChange={(event) => setForm({ ...form, period_start: event.target.value })} type="date" value={form.period_start} /></Field>
              <Field label="Período final"><input className="mt-2 min-h-11 w-full rounded-2xl border border-semear-gray bg-white px-4 text-sm outline-none focus:border-semear-green" onChange={(event) => setForm({ ...form, period_end: event.target.value })} type="date" value={form.period_end} /></Field>
            </div>
          </div>

          <div className="mt-4 grid gap-4">
            <TextArea label="Resumo público" rows={5} value={form.public_summary} onChange={(value) => setForm({ ...form, public_summary: value })} />
            <TextArea label="Texto de abertura" rows={4} value={form.opening_text} onChange={(value) => setForm({ ...form, opening_text: value })} />
            <TextArea label="O que estamos ouvindo" rows={4} value={form.listening_text} onChange={(value) => setForm({ ...form, listening_text: value })} />
            <TextArea label="Notas metodológicas" rows={4} value={form.methodology_notes} onChange={(value) => setForm({ ...form, methodology_notes: value })} />
            <TextArea label="Limites desta leitura" rows={4} value={form.limits_text} onChange={(value) => setForm({ ...form, limits_text: value })} />
            <TextArea label="Próximos passos" rows={4} value={form.next_steps_text} onChange={(value) => setForm({ ...form, next_steps_text: value })} />
            <TextArea label="Notas de privacidade" rows={5} value={form.privacy_notes} onChange={(value) => setForm({ ...form, privacy_notes: value })} />
          </div>

          <div className="mt-6 grid gap-4 lg:grid-cols-2">
            <Panel title="Texto gerado originalmente">
              <p className="whitespace-pre-line text-sm leading-6 text-stone-700">{snapshot.generated_summary || "Não registrado."}</p>
            </Panel>
            <Panel title="Texto editado atualmente">
              <p className="whitespace-pre-line text-sm leading-6 text-stone-700">{form.public_summary || "Não preenchido."}</p>
            </Panel>
          </div>

          <Panel className="mt-4" title="Diff básico do resumo">
            <div className="space-y-2 text-sm">
              {diffItems.map((item, index) => (
                <p className={`rounded-xl px-3 py-2 ${item.kind === "added" ? "bg-green-50 text-green-800" : item.kind === "removed" ? "bg-red-50 text-red-800" : "bg-semear-offwhite text-stone-700"}`} key={`${item.kind}-${index}-${item.text}`}>
                  <strong>{item.kind === "added" ? "+" : item.kind === "removed" ? "-" : "="}</strong> {item.text || "linha vazia"}
                </p>
              ))}
            </div>
            <p className="mt-4 text-xs text-stone-500">
              Última edição: {formatMeta(snapshot.last_edited_at, snapshot.last_edited_by, people)}.
            </p>
            <p className="text-xs text-stone-500">
              Última revisão: {formatMeta(snapshot.last_reviewed_at, snapshot.last_reviewed_by, people)}.
            </p>
          </Panel>
        </section>

        <div className="space-y-5">
          <TransparencyPrivacyChecklist canPublishReview={canCoordinate} checklist={checklist} disabled={saving} onChange={setChecklist} riskReport={riskReport} />

          <section className="rounded-[2rem] border border-white/80 bg-white p-5 shadow-soft">
            <div className="mb-4 flex items-center gap-3 text-semear-green">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-semear-green-soft">
                <ShieldAlert className="h-5 w-5" />
              </div>
              <h3 className="font-semibold">Alertas de risco</h3>
            </div>
            {riskReport.blockers.length === 0 && riskReport.warnings.length === 0 ? (
              <p className="text-sm text-stone-600">Nenhum padrão sensível detectado no texto editável.</p>
            ) : (
              <div className="space-y-3">
                {riskReport.blockers.map((risk) => (
                  <RiskBox key={risk.key} severity={risk.severity} title={risk.message} values={risk.matches} />
                ))}
                {riskReport.warnings.map((risk) => (
                  <RiskBox key={risk.key} severity={risk.severity} title={risk.message} values={risk.matches} />
                ))}
              </div>
            )}
          </section>

          <section className="rounded-[2rem] border border-white/80 bg-white p-5 shadow-soft">
            <div className="mb-4 flex items-center gap-3 text-semear-green">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-semear-green-soft">
                <FileJson className="h-5 w-5" />
              </div>
              <h3 className="font-semibold">Blocos automáticos revisáveis</h3>
            </div>
            <JsonSummary title="Totais" data={snapshot.totals} />
            <JsonSummary title="Temas" data={snapshot.theme_summary} />
            <JsonSummary title="Palavras" data={snapshot.word_summary} />
            <JsonSummary title="Territórios" data={snapshot.territory_summary} />
            <JsonSummary title="Linha do tempo" data={snapshot.action_timeline} />
          </section>

          <section className="rounded-[2rem] border border-white/80 bg-white p-5 shadow-soft">
            <h3 className="font-semibold text-semear-green">Amostra mínima e territórios</h3>
            <div className="mt-4 space-y-2">
              {territories.map((territory) => (
                <div className="rounded-xl border border-semear-gray bg-semear-offwhite px-3 py-2 text-sm text-stone-700" key={territory.territory}>
                  <strong className="text-semear-green">{territory.territory}</strong>: {territory.reviewed_records} escuta(s) revisada(s) · {territory.public_status}
                </div>
              ))}
            </div>
          </section>
        </div>
      </div>
    </section>
  );
}

function toFormState(snapshot: PublicTransparencySnapshot): FormState {
  return {
    title: snapshot.title ?? "",
    period_start: snapshot.period_start ?? "",
    period_end: snapshot.period_end ?? "",
    public_summary: snapshot.public_summary ?? "",
    privacy_notes: snapshot.privacy_notes ?? "",
    methodology_notes: snapshot.methodology_notes ?? "",
    opening_text: snapshot.opening_text ?? "",
    listening_text: snapshot.listening_text ?? "",
    limits_text: snapshot.limits_text ?? "",
    next_steps_text: snapshot.next_steps_text ?? ""
  };
}

function buildPeopleMap(items: NamedProfile[]) {
  return items.reduce<Record<string, string>>((acc, item) => {
    acc[item.id] = item.full_name ?? item.id;
    return acc;
  }, {});
}

function buildSummaryDiff(generated: string, edited: string) {
  const left = generated.split(/\r?\n/);
  const right = edited.split(/\r?\n/);
  const max = Math.max(left.length, right.length);
  const items: Array<{ kind: "added" | "removed" | "unchanged"; text: string }> = [];

  for (let index = 0; index < max; index += 1) {
    const previous = left[index] ?? "";
    const current = right[index] ?? "";
    if (previous === current) {
      items.push({ kind: "unchanged", text: current });
    } else {
      if (previous) items.push({ kind: "removed", text: previous });
      if (current) items.push({ kind: "added", text: current });
    }
  }

  return items.slice(0, 24);
}

function formatMeta(date: string | null, userId: string | null, people: Record<string, string>) {
  if (!date) return "não registrada";
  const by = userId ? people[userId] ?? userId : "usuário não identificado";
  return `${new Date(date).toLocaleString("pt-BR")} por ${by}`;
}

function ActionButton({ disabled, icon, label, onClick }: { disabled: boolean; icon: React.ReactNode; label: string; onClick: () => void }) {
  return <button className="inline-flex min-h-10 items-center gap-2 rounded-full border border-semear-green/15 bg-white px-3 text-sm font-semibold text-semear-green disabled:opacity-60" disabled={disabled} onClick={onClick} type="button">{icon}{label}</button>;
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label><span className="text-xs font-semibold uppercase tracking-[0.12em] text-stone-500">{label}</span>{children}</label>;
}

function TextArea({ label, rows, value, onChange }: { label: string; rows: number; value: string; onChange: (value: string) => void }) {
  return <label><span className="text-xs font-semibold uppercase tracking-[0.12em] text-stone-500">{label}</span><textarea className="mt-2 w-full rounded-2xl border border-semear-gray bg-white px-4 py-3 text-sm leading-6 outline-none focus:border-semear-green" onChange={(event) => onChange(event.target.value)} rows={rows} value={value} /></label>;
}

function Panel({ title, children, className = "" }: { title: string; children: React.ReactNode; className?: string }) {
  return <section className={`rounded-[1.5rem] border border-semear-gray bg-white p-4 ${className}`}><h3 className="font-semibold text-semear-green">{title}</h3><div className="mt-3">{children}</div></section>;
}

function JsonSummary({ title, data }: { title: string; data: unknown }) {
  return (
    <div className="mb-3 rounded-xl border border-semear-gray bg-semear-offwhite p-3">
      <p className="mb-2 text-sm font-semibold text-semear-green">{title}</p>
      <pre className="overflow-x-auto whitespace-pre-wrap text-xs leading-5 text-stone-700">{JSON.stringify(data, null, 2)}</pre>
    </div>
  );
}

function RiskBox({ severity, title, values }: { severity: "blocking" | "warning"; title: string; values: string[] }) {
  return (
    <div className={`rounded-xl border px-3 py-2 text-sm ${severity === "blocking" ? "border-red-200 bg-red-50 text-red-800" : "border-amber-200 bg-amber-50 text-amber-900"}`}>
      <p className="font-semibold">{title}</p>
      {values.length > 0 ? <p className="mt-1 text-xs">{values.join(" | ")}</p> : null}
    </div>
  );
}

function StateBox({ children, tone = "neutral" }: { children: React.ReactNode; tone?: "neutral" | "error" }) {
  return <div className={`rounded-[1.5rem] p-6 text-sm shadow-soft ${tone === "error" ? "border border-red-200 bg-red-50 text-red-800" : "border border-white/80 bg-white/72 text-stone-600"}`}>{children}</div>;
}
