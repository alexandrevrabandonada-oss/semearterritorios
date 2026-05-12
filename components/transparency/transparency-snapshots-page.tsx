"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Archive, CheckCircle2, Eye, FilePenLine, FileText, Send, ShieldCheck, Wand2 } from "lucide-react";
import type { Profile, PublicTransparencySnapshot } from "@/lib/database.types";
import { buildTransparencySnapshotDraft, getSnapshotStatusLabel, type SnapshotAction, type SnapshotRecord } from "@/lib/transparency-snapshots";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";
import { NotificationsInlinePanel } from "@/components/notifications/notifications-inline-panel";
import { getTerritorialRiskPublicationGuard } from "@/lib/transparency-territorial-risk";

export function TransparencySnapshotsPage() {
  const supabase = useMemo(() => createBrowserSupabaseClient(), []);
  const [snapshots, setSnapshots] = useState<PublicTransparencySnapshot[]>([]);
  const [profile, setProfile] = useState<Pick<Profile, "id" | "role"> | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);

  useEffect(() => {
    void loadSnapshots();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [supabase]);

  async function loadSnapshots() {
    if (!supabase) {
      setError("Configure NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_ANON_KEY para carregar snapshots.");
      setLoading(false);
      return;
    }
    const userResult = await supabase.auth.getUser();
    const userId = userResult.data.user?.id;
    const [result, profileResult] = await Promise.all([
      supabase.from("public_transparency_snapshots").select("*").order("updated_at", { ascending: false }),
      userId ? supabase.from("profiles").select("id, role").eq("id", userId).maybeSingle() : Promise.resolve({ data: null, error: null })
    ]);

    if (result.error || profileResult.error) {
      setError(result.error?.message ?? profileResult.error?.message ?? "Erro ao carregar snapshots.");
    } else {
      setSnapshots((result.data ?? []) as PublicTransparencySnapshot[]);
      setProfile((profileResult.data ?? null) as Pick<Profile, "id" | "role"> | null);
    }
    setLoading(false);
  }

  async function createDraft() {
    if (!supabase) return;
    setSaving(true);
    setError(null);
    setFeedback(null);
    const [userResult, actionsResult, recordsResult, debriefsResult, closuresResult] = await Promise.all([
      supabase.auth.getUser(),
      supabase.from("actions").select("*, neighborhoods:neighborhood_id(id, name)").order("action_date", { ascending: false }),
      supabase.from("listening_records").select("*, neighborhoods:neighborhood_id(id, name), respondent_neighborhood:respondent_neighborhood_id(id, name), listening_record_themes(themes:theme_id(id, name))"),
      supabase.from("action_debriefs").select("*"),
      supabase.from("action_closures").select("*")
    ]);

    if (actionsResult.error || recordsResult.error || debriefsResult.error || closuresResult.error || userResult.error) {
      setError(actionsResult.error?.message ?? recordsResult.error?.message ?? debriefsResult.error?.message ?? closuresResult.error?.message ?? userResult.error?.message ?? "Erro ao gerar rascunho.");
      setSaving(false);
      return;
    }

    const draft = buildTransparencySnapshotDraft({
      actions: (actionsResult.data ?? []) as SnapshotAction[],
      records: (recordsResult.data ?? []) as unknown as SnapshotRecord[],
      debriefs: debriefsResult.data ?? [],
      closures: closuresResult.data ?? []
    });

    const insertResult = await supabase.from("public_transparency_snapshots").insert({
      ...draft,
      status: "draft",
      created_by: userResult.data.user?.id ?? null,
      approved_by: null,
      approved_at: null,
      published_at: null
    }).select("*").single();

    if (insertResult.error) setError(insertResult.error.message);
    else {
      setSnapshots((current) => [insertResult.data as PublicTransparencySnapshot, ...current]);
      setFeedback("Rascunho determinístico gerado. Revise o texto antes de aprovar.");
    }
    setSaving(false);
  }

  async function transition(snapshot: PublicTransparencySnapshot, status: PublicTransparencySnapshot["status"]) {
    if (!supabase) return;
    const canCoordinate = profile?.role === "admin" || profile?.role === "coordenacao";

    if (status === "published") {
      const guard = getTerritorialRiskPublicationGuard(snapshot);
      if (guard.critical && !canCoordinate) {
        setError("A cobertura territorial deste snapshot está crítica. Para publicar, a coordenação precisa registrar justificativa institucional.");
        return;
      }
      if (guard.critical && !guard.hasOverride) {
        setError("A cobertura territorial deste snapshot está crítica. Para publicar, a coordenação precisa registrar justificativa institucional.");
        return;
      }
    }

    setSaving(true);
    setError(null);
    const userResult = await supabase.auth.getUser();
    const payload: {
      status: PublicTransparencySnapshot["status"];
      approved_by?: string | null;
      approved_at?: string | null;
      published_at?: string | null;
    } = { status };
    if (status === "approved") {
      payload.approved_by = userResult.data.user?.id ?? null;
      payload.approved_at = new Date().toISOString();
    }
    if (status === "published") {
      payload.published_at = new Date().toISOString();
      payload.approved_by = snapshot.approved_by ?? userResult.data.user?.id ?? null;
      payload.approved_at = snapshot.approved_at ?? new Date().toISOString();
    }
    const result = await supabase.from("public_transparency_snapshots").update(payload).eq("id", snapshot.id).select("*").single();
    if (result.error) setError(result.error.message);
    else {
      setSnapshots((current) => current.map((item) => item.id === snapshot.id ? result.data as PublicTransparencySnapshot : item));
      setFeedback(`Snapshot marcado como ${getSnapshotStatusLabel(status)}.`);
    }
    setSaving(false);
  }

  if (loading) return <StateBox>Carregando snapshots de transparência...</StateBox>;

  return (
    <section className="pb-10">
      <div className="rounded-[2rem] border border-white/80 bg-white/78 p-6 shadow-soft sm:p-8">
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-semear-earth">Transparência Viva</p>
        <h2 className="mt-3 text-4xl font-semibold tracking-tight text-semear-green">Snapshots públicos aprovados</h2>
        <p className="mt-4 max-w-3xl text-sm leading-6 text-stone-600">
          O painel público futuro não lê escutas brutas. Ele só consome snapshots agregados, sanitizados e aprovados pela coordenação.
        </p>
        <div className="mt-5 grid gap-3 sm:flex sm:flex-wrap">
          <button className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-full bg-semear-green px-4 text-sm font-semibold text-white disabled:opacity-60 sm:w-auto" disabled={saving} onClick={() => void createDraft()} type="button">
            <Wand2 className="h-4 w-4" /> Gerar rascunho
          </button>
          <Link className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-full border border-semear-green/15 bg-white px-4 text-sm font-semibold text-semear-green sm:w-auto" href="/transparencia/preview">
            <Eye className="h-4 w-4" /> Abrir preview interno
          </Link>
          <Link className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-full border border-semear-green/15 bg-white px-4 text-sm font-semibold text-semear-green sm:w-auto" href="/transparencia/homologacao">
            <ShieldCheck className="h-4 w-4" /> Homologação institucional
          </Link>
        </div>
      </div>

      {error ? <StateBox tone="error">{error}</StateBox> : null}
      {feedback ? <StateBox>{feedback}</StateBox> : null}

      <div className="mt-5">
        <NotificationsInlinePanel
          title="Avisos de transparência"
          categories={["transparencia"]}
          href="/avisos?categoria=transparencia"
          emptyText="Sem avisos de transparência pendentes."
          limit={4}
        />
      </div>

      <div className="mt-6 grid gap-4">
        {snapshots.map((snapshot) => (
          <article className="rounded-[2rem] border border-white/80 bg-white p-5 shadow-soft" key={snapshot.id}>
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <span className="inline-flex rounded-full bg-semear-green-soft px-3 py-1 text-xs font-semibold uppercase tracking-[0.12em] text-semear-green">{getSnapshotStatusLabel(snapshot.status)}</span>
                <h3 className="mt-3 text-2xl font-semibold text-semear-green">{snapshot.title}</h3>
                <p className="mt-2 max-w-4xl text-sm leading-6 text-stone-600">{snapshot.public_summary}</p>
              </div>
              <div className="grid gap-2 sm:flex sm:flex-wrap">
                <Link className="inline-flex min-h-10 w-full items-center justify-center gap-2 rounded-full border border-semear-green/15 bg-white px-3 text-sm font-semibold text-semear-green sm:w-auto" href={`/transparencia/snapshots/${snapshot.id}`}>
                  <FilePenLine className="h-4 w-4" /> Editar
                </Link>
                <SnapshotActions snapshot={snapshot} disabled={saving} onTransition={transition} />
              </div>
            </div>
            <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-6">
              {Object.entries((snapshot.totals ?? {}) as Record<string, number>).map(([key, value]) => (
                <div className="rounded-2xl bg-semear-offwhite p-3" key={key}>
                  <p className="text-xs text-stone-500">{key}</p>
                  <strong className="mt-1 block text-xl text-semear-green">{value}</strong>
                </div>
              ))}
            </div>
            <p className="mt-4 whitespace-pre-line text-xs leading-5 text-stone-500">{snapshot.privacy_notes}</p>
          </article>
        ))}
        {snapshots.length === 0 ? <StateBox>Nenhum snapshot criado ainda.</StateBox> : null}
      </div>
    </section>
  );
}

function SnapshotActions({ snapshot, disabled, onTransition }: { snapshot: PublicTransparencySnapshot; disabled: boolean; onTransition: (snapshot: PublicTransparencySnapshot, status: PublicTransparencySnapshot["status"]) => Promise<void> }) {
  return (
    <div className="grid gap-2 sm:flex sm:flex-wrap">
      {snapshot.status === "draft" ? <Button disabled={disabled} icon={<FileText className="h-4 w-4" />} label="Marcar revisado" onClick={() => onTransition(snapshot, "reviewed")} /> : null}
      {snapshot.status === "reviewed" ? <Button disabled={disabled} icon={<CheckCircle2 className="h-4 w-4" />} label="Aprovar" onClick={() => onTransition(snapshot, "approved")} /> : null}
      {snapshot.status === "approved" ? <Button disabled={disabled} icon={<Send className="h-4 w-4" />} label="Publicar" onClick={() => onTransition(snapshot, "published")} /> : null}
      {snapshot.status !== "archived" ? <Button disabled={disabled} icon={<Archive className="h-4 w-4" />} label="Arquivar" onClick={() => onTransition(snapshot, "archived")} /> : null}
    </div>
  );
}

function Button({ disabled, icon, label, onClick }: { disabled: boolean; icon: React.ReactNode; label: string; onClick: () => void }) {
  return <button className="inline-flex min-h-10 w-full items-center justify-center gap-2 rounded-full border border-semear-green/15 bg-white px-3 text-sm font-semibold text-semear-green disabled:opacity-60 sm:w-auto" disabled={disabled} onClick={onClick} type="button">{icon}{label}</button>;
}

function StateBox({ children, tone = "neutral" }: { children: React.ReactNode; tone?: "neutral" | "error" }) {
  return <div className={`mt-5 rounded-[1.5rem] p-5 text-sm shadow-soft ${tone === "error" ? "border border-red-200 bg-red-50 text-red-800" : "border border-white/80 bg-white/72 text-stone-600"}`}><ShieldCheck className="mr-2 inline h-4 w-4" />{children}</div>;
}
