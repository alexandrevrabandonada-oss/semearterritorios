"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  Archive,
  CheckCircle2,
  ClipboardCopy,
  Eye,
  FileCheck2,
  FileLock2,
  ShieldCheck
} from "lucide-react";
import type {
  Profile,
  PublicTransparencyHomologationPackage,
  PublicTransparencySnapshot,
  PublicTransparencySnapshotReviewComment,
  PublicTransparencySnapshotVersion
} from "@/lib/database.types";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";
import { buildSnapshotAuditExport } from "@/lib/transparency-audit";
import {
  buildHomologationMarkdown,
  createHomologationPackage,
  evaluateHomologationReadiness,
  freezeSnapshotPayload,
  getHomologationPackages,
  isHomologationChecklistComplete,
  normalizeHomologationChecklist,
  markPackageReadyForSignature,
  signHomologationPackage,
  rejectHomologationPackage,
  archiveHomologationPackage,
  type HomologationChecklistState,
  type HomologationReadiness
} from "@/lib/transparency-homologation";
import { TransparencyHomologationChecklist } from "@/components/transparency/transparency-homologation-checklist";
import { getSnapshotStatusLabel } from "@/lib/transparency-snapshots";

type PackageFormState = {
  title: string;
  period_start: string;
  period_end: string;
  institutional_summary: string;
  methodology_note: string;
  privacy_statement: string;
  decision_reason: string;
};

export function TransparencyHomologationListPage() {
  const supabase = useMemo(() => createBrowserSupabaseClient(), []);
  const router = useRouter();
  const [packages, setPackages] = useState<PublicTransparencyHomologationPackage[]>([]);
  const [snapshots, setSnapshots] = useState<PublicTransparencySnapshot[]>([]);
  const [people, setPeople] = useState<Record<string, string>>({});
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);

  useEffect(() => {
    let ignore = false;

    async function load() {
      if (!supabase) {
        setError("Configure NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_ANON_KEY para abrir a homologação.");
        setLoading(false);
        return;
      }

      try {
        const [userResult, packagesData, snapshotsResult] = await Promise.all([
          supabase.auth.getUser(),
          getHomologationPackages(supabase),
          supabase.from("public_transparency_snapshots").select("*").order("updated_at", { ascending: false })
        ]);

        if (ignore) return;
        if (snapshotsResult.error) throw snapshotsResult.error;

        setCurrentUserId(userResult.data.user?.id ?? null);
        setPackages(packagesData);
        setSnapshots((snapshotsResult.data ?? []) as PublicTransparencySnapshot[]);

        const peopleIds = Array.from(new Set(packagesData.flatMap((item) => [
          item.created_by,
          item.prepared_by,
          item.signed_by,
          item.rejected_by
        ]).filter(Boolean) as string[]));

        if (peopleIds.length > 0) {
          const peopleResult = await supabase.from("profiles").select("id, full_name").in("id", peopleIds);
          if (!peopleResult.error && !ignore) {
            setPeople(toPeopleMap((peopleResult.data ?? []) as Array<Pick<Profile, "id" | "full_name">>));
          }
        }
      } catch (loadError) {
        if (!ignore) setError(getErrorMessage(loadError, "Erro ao carregar pacotes."));
      } finally {
        if (!ignore) setLoading(false);
      }
    }

    void load();
    return () => {
      ignore = true;
    };
  }, [supabase]);

  async function handleCreatePackage(snapshotId: string) {
    if (!supabase) return;
    setSaving(true);
    setError(null);
    setFeedback(null);
    try {
      const item = await createHomologationPackage(supabase, snapshotId, currentUserId);
      setFeedback(`Pacote ${item.package_code} gerado.`);
      router.push(`/transparencia/homologacao/${item.id}`);
    } catch (createError) {
      setError(getErrorMessage(createError, "Erro ao gerar pacote de homologação."));
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <StateBox>Carregando homologação institucional...</StateBox>;

  const latestPackageBySnapshot = new Map<string, PublicTransparencyHomologationPackage>();
  for (const item of packages) {
    if (!latestPackageBySnapshot.has(item.snapshot_id)) {
      latestPackageBySnapshot.set(item.snapshot_id, item);
    }
  }

  return (
    <section className="pb-10">
      <div className="rounded-[2rem] border border-white/80 bg-white/78 p-6 shadow-soft sm:p-8">
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-semear-earth">Homologação institucional</p>
        <h2 className="mt-3 text-4xl font-semibold tracking-tight text-semear-green">Pacotes exportáveis da Transparência Viva</h2>
        <p className="mt-4 max-w-3xl text-sm leading-6 text-stone-600">
          O pacote congela uma versão editorial do snapshot, registra decisão institucional e prepara a futura integração pública sem abrir o banco bruto.
        </p>
        <div className="mt-5 grid gap-3 sm:flex sm:flex-wrap">
          <Link className="inline-flex min-h-11 w-full items-center justify-center rounded-full bg-semear-green px-4 text-sm font-semibold text-white sm:w-auto" href="/transparencia/snapshots">
            Voltar aos snapshots
          </Link>
        </div>
      </div>

      {error ? <StateBox tone="error">{error}</StateBox> : null}
      {feedback ? <StateBox>{feedback}</StateBox> : null}

      <section className="mt-6 rounded-[2rem] border border-white/80 bg-white p-5 shadow-soft">
        <div className="mb-4 flex items-center gap-3 text-semear-green">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-semear-green-soft">
            <FileLock2 className="h-5 w-5" />
          </div>
          <h3 className="font-semibold">Snapshots elegíveis para pacote</h3>
        </div>
        <div className="grid gap-4 lg:grid-cols-2">
          {snapshots.map((snapshot) => {
            const linkedPackage = latestPackageBySnapshot.get(snapshot.id);
            return (
              <article className="rounded-2xl border border-semear-gray bg-semear-offwhite p-4" key={snapshot.id}>
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-semear-earth">{getSnapshotStatusLabel(snapshot.status)}</p>
                <h4 className="mt-2 font-semibold text-semear-green">{snapshot.title}</h4>
                <p className="mt-2 text-sm leading-6 text-stone-600">{snapshot.public_summary}</p>
                <div className="mt-4 grid gap-2 sm:flex sm:flex-wrap">
                  <button
                    className="inline-flex min-h-10 w-full items-center justify-center gap-2 rounded-full bg-semear-green px-3 text-sm font-semibold text-white disabled:opacity-60 sm:w-auto"
                    disabled={saving}
                    onClick={() => void handleCreatePackage(snapshot.id)}
                    type="button"
                  >
                    <FileCheck2 className="h-4 w-4" /> Gerar pacote de homologação
                  </button>
                  {linkedPackage ? (
                    <Link className="inline-flex min-h-10 w-full items-center justify-center rounded-full border border-semear-green/15 bg-white px-3 text-sm font-semibold text-semear-green sm:w-auto" href={`/transparencia/homologacao/${linkedPackage.id}`}>
                      Abrir pacote atual
                    </Link>
                  ) : null}
                </div>
              </article>
            );
          })}
        </div>
      </section>

      <section className="mt-6 rounded-[2rem] border border-white/80 bg-white p-5 shadow-soft">
        <div className="mb-4 flex items-center gap-3 text-semear-green">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-semear-green-soft">
            <ShieldCheck className="h-5 w-5" />
          </div>
          <h3 className="font-semibold">Pacotes existentes</h3>
        </div>
        <div className="space-y-4">
          {packages.length > 0 ? packages.map((item) => (
            <article className="rounded-2xl border border-semear-gray bg-semear-offwhite p-4" key={item.id}>
              <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.12em] text-semear-earth">{item.package_code}</p>
                  <h4 className="mt-2 font-semibold text-semear-green">{item.title}</h4>
                  <p className="mt-2 text-sm text-stone-600">
                    Status: <strong>{renderPackageStatus(item.status)}</strong>{item.decision ? ` · decisão: ${renderDecision(item.decision)}` : ""}
                  </p>
                  <p className="mt-1 text-xs text-stone-500">
                    Preparado por {formatPerson(item.prepared_by, people)} · assinado por {formatPerson(item.signed_by, people)} · {formatDate(item.updated_at)}
                  </p>
                </div>
                <div className="grid gap-2 sm:flex sm:flex-wrap">
                  <Link className="inline-flex min-h-10 w-full items-center justify-center rounded-full border border-semear-green/15 bg-white px-3 text-sm font-semibold text-semear-green sm:w-auto" href={`/transparencia/homologacao/${item.id}`}>
                    Abrir
                  </Link>
                  <Link className="inline-flex min-h-10 w-full items-center justify-center rounded-full border border-semear-green/15 bg-white px-3 text-sm font-semibold text-semear-green sm:w-auto" href={`/transparencia/homologacao/${item.id}/preview`}>
                    Preview print
                  </Link>
                </div>
              </div>
            </article>
          )) : <p className="text-sm text-stone-500">Nenhum pacote criado ainda.</p>}
        </div>
      </section>
    </section>
  );
}

export function TransparencyHomologationDetailPage({ packageId }: { packageId: string }) {
  const supabase = useMemo(() => createBrowserSupabaseClient(), []);
  const [packageItem, setPackageItem] = useState<PublicTransparencyHomologationPackage | null>(null);
  const [snapshot, setSnapshot] = useState<PublicTransparencySnapshot | null>(null);
  const [snapshotVersion, setSnapshotVersion] = useState<PublicTransparencySnapshotVersion | null>(null);
  const [comments, setComments] = useState<PublicTransparencySnapshotReviewComment[]>([]);
  const [people, setPeople] = useState<Record<string, string>>({});
  const [form, setForm] = useState<PackageFormState | null>(null);
  const [checklist, setChecklist] = useState<HomologationChecklistState>(normalizeHomologationChecklist(null));
  const [readiness, setReadiness] = useState<HomologationReadiness>({ canSign: false, blockers: [], warnings: [] });
  const [profile, setProfile] = useState<Pick<Profile, "id" | "role"> | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);

  useEffect(() => {
    let ignore = false;

    async function load() {
      if (!supabase) {
        setError("Configure NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_ANON_KEY para editar o pacote.");
        setLoading(false);
        return;
      }

      try {
        const userResult = await supabase.auth.getUser();
        const userId = userResult.data.user?.id ?? null;
        setCurrentUserId(userId);
        await refreshPackage(userId, ignore);
      } catch (loadError) {
        if (!ignore) setError(getErrorMessage(loadError, "Erro ao carregar pacote de homologação."));
      } finally {
        if (!ignore) setLoading(false);
      }
    }

    void load();
    return () => {
      ignore = true;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [packageId, supabase]);

  async function refreshPackage(userId: string | null, ignore = false) {
    if (!supabase) return;

    const packageResult = await supabase.from("public_transparency_homologation_packages").select("*").eq("id", packageId).maybeSingle();
    if (packageResult.error) throw packageResult.error;
    const loadedPackage = (packageResult.data ?? null) as PublicTransparencyHomologationPackage | null;
    if (!loadedPackage) {
      setPackageItem(null);
      return;
    }

    const [profileResult, snapshotResult, versionsResult, commentsResult, auditExport] = await Promise.all([
      userId ? supabase.from("profiles").select("id, role").eq("id", userId).maybeSingle() : Promise.resolve({ data: null, error: null }),
      supabase.from("public_transparency_snapshots").select("*").eq("id", loadedPackage.snapshot_id).single(),
      supabase.from("public_transparency_snapshot_versions").select("*").eq("snapshot_id", loadedPackage.snapshot_id).order("version_number", { ascending: false }),
      supabase.from("public_transparency_snapshot_review_comments").select("*").eq("snapshot_id", loadedPackage.snapshot_id).order("created_at", { ascending: false }),
      buildSnapshotAuditExport(supabase, loadedPackage.snapshot_id)
    ]);

    if (profileResult.error || snapshotResult.error || versionsResult.error || commentsResult.error) {
      throw profileResult.error ?? snapshotResult.error ?? versionsResult.error ?? commentsResult.error;
    }

    const loadedSnapshot = snapshotResult.data as PublicTransparencySnapshot;
    const versions = (versionsResult.data ?? []) as PublicTransparencySnapshotVersion[];
    const loadedComments = (commentsResult.data ?? []) as PublicTransparencySnapshotReviewComment[];
    const selectedVersion = versions.find((item) => item.id === loadedPackage.snapshot_version_id) ?? versions[0] ?? null;
    const riskReport = normalizeRiskReport(loadedPackage.risk_report ?? auditExport.riskReport);
    const nextReadiness = evaluateHomologationReadiness(loadedSnapshot, {
      ...loadedPackage,
      risk_report: riskReport
    }, loadedComments, riskReport.hasBlockingRisk);

    const personIds = Array.from(new Set([
      loadedPackage.created_by,
      loadedPackage.prepared_by,
      loadedPackage.signed_by,
      loadedPackage.rejected_by,
      loadedSnapshot.created_by,
      loadedSnapshot.approved_by,
      loadedSnapshot.last_reviewed_by,
      ...versions.map((item) => item.created_by),
      ...loadedComments.map((item) => item.author_id),
      ...loadedComments.map((item) => item.resolved_by)
    ].filter(Boolean) as string[]));

    let peopleMap: Record<string, string> = {};
    if (personIds.length > 0) {
      const peopleResult = await supabase.from("profiles").select("id, full_name").in("id", personIds);
      if (!peopleResult.error) {
        peopleMap = toPeopleMap((peopleResult.data ?? []) as Array<Pick<Profile, "id" | "full_name">>);
      }
    }

    if (ignore) return;

    setPackageItem({ ...loadedPackage, risk_report: riskReport });
    setSnapshot(loadedSnapshot);
    setSnapshotVersion(selectedVersion);
    setComments(loadedComments);
    setProfile((profileResult.data ?? null) as Pick<Profile, "id" | "role"> | null);
    setPeople(peopleMap);
    setForm(toPackageFormState(loadedPackage, loadedSnapshot));
    setChecklist(normalizeHomologationChecklist(loadedPackage.approval_checklist));
    setReadiness(nextReadiness);
  }

  async function savePackage() {
    if (!supabase || !packageItem || !snapshot || !form) return;
    setSaving(true);
    setError(null);
    setFeedback(null);

    try {
      const audit = await buildSnapshotAuditExport(supabase, snapshot.id);
      const payload = freezeSnapshotPayload(snapshot, snapshotVersion);
      const updateResult = await supabase
        .from("public_transparency_homologation_packages")
        .update({
          title: form.title,
          period_start: form.period_start || null,
          period_end: form.period_end || null,
          institutional_summary: form.institutional_summary,
          methodology_note: form.methodology_note,
          privacy_statement: form.privacy_statement,
          decision_reason: form.decision_reason || null,
          approval_checklist: checklist,
          risk_report: audit.riskReport,
          audit_export: audit.markdown,
          frozen_payload: payload,
          snapshot_version_id: snapshotVersion?.id ?? null,
          prepared_by: currentUserId,
          prepared_at: new Date().toISOString()
        })
        .eq("id", packageItem.id)
        .select("*")
        .single();

      if (updateResult.error) throw updateResult.error;
      setFeedback("Pacote de homologação salvo.");
      await refreshPackage(currentUserId);
      return true;
    } catch (saveError) {
      setError(getErrorMessage(saveError, "Erro ao salvar pacote."));
      return false;
    } finally {
      setSaving(false);
    }
  }

  async function handleMarkReady() {
    if (!supabase || !packageItem) return;
    setSaving(true);
    setError(null);
    setFeedback(null);
    try {
      const saved = await savePackage();
      if (!saved) return;
      await markPackageReadyForSignature(supabase, packageItem.id);
      setFeedback("Pacote marcado como pronto para assinatura.");
      await refreshPackage(currentUserId);
    } catch (markError) {
      setError(getErrorMessage(markError, "Erro ao marcar pacote como pronto para assinatura."));
    } finally {
      setSaving(false);
    }
  }

  async function handleSign() {
    if (!supabase || !packageItem) return;
    setSaving(true);
    setError(null);
    setFeedback(null);
    try {
      const saved = await savePackage();
      if (!saved) return;
      await signHomologationPackage(supabase, packageItem.id, currentUserId);
      setFeedback("Pacote assinado e aprovado institucionalmente.");
      await refreshPackage(currentUserId);
    } catch (signError) {
      setError(getErrorMessage(signError, "Erro ao assinar pacote."));
    } finally {
      setSaving(false);
    }
  }

  async function handleReject() {
    if (!supabase || !packageItem || !form?.decision_reason.trim()) {
      setError("Informe o motivo da rejeição antes de rejeitar o pacote.");
      return;
    }
    setSaving(true);
    setError(null);
    setFeedback(null);
    try {
      await rejectHomologationPackage(supabase, packageItem.id, form.decision_reason.trim(), currentUserId);
      setFeedback("Pacote rejeitado.");
      await refreshPackage(currentUserId);
    } catch (rejectError) {
      setError(getErrorMessage(rejectError, "Erro ao rejeitar pacote."));
    } finally {
      setSaving(false);
    }
  }

  async function handleArchive() {
    if (!supabase || !packageItem) return;
    setSaving(true);
    setError(null);
    setFeedback(null);
    try {
      await archiveHomologationPackage(supabase, packageItem.id);
      setFeedback("Pacote arquivado.");
      await refreshPackage(currentUserId);
    } catch (archiveError) {
      setError(getErrorMessage(archiveError, "Erro ao arquivar pacote."));
    } finally {
      setSaving(false);
    }
  }

  async function handleCopyMarkdown() {
    if (!supabase || !packageItem) return;
    setSaving(true);
    setError(null);
    setFeedback(null);
    try {
      const saved = await savePackage();
      if (!saved) return;
      const markdown = await buildHomologationMarkdown(supabase, packageItem.id);
      await navigator.clipboard.writeText(markdown);
      setFeedback("Markdown institucional copiado.");
    } catch (copyError) {
      setError(getErrorMessage(copyError, "Erro ao copiar Markdown institucional."));
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <StateBox>Carregando pacote institucional...</StateBox>;
  if (error && !packageItem) return <StateBox tone="error">{error}</StateBox>;
  if (!packageItem || !snapshot || !form) return <StateBox>Pacote não encontrado.</StateBox>;

  const canCoordinate = profile?.role === "admin" || profile?.role === "coordenacao";
  const pendingComments = comments.filter((item) => !item.resolved);
  const criticalPendingComments = pendingComments.filter((item) => ["privacidade", "dados", "metodologia"].includes(item.comment_type));
  const checklistComplete = isHomologationChecklistComplete(checklist, snapshot.status);

  return (
    <section className="pb-10">
      <div className="rounded-[2rem] border border-white/80 bg-white/78 p-6 shadow-soft sm:p-8">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-semear-earth">Pacote institucional</p>
            <h2 className="mt-3 text-4xl font-semibold tracking-tight text-semear-green">{packageItem.package_code}</h2>
            <p className="mt-3 text-sm leading-6 text-stone-600">
              Snapshot: <strong>{snapshot.title}</strong> · status do pacote: <strong>{renderPackageStatus(packageItem.status)}</strong>
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link className="inline-flex min-h-11 items-center rounded-full border border-semear-green/15 bg-white px-4 text-sm font-semibold text-semear-green" href="/transparencia/homologacao">
              Voltar à homologação
            </Link>
            <Link className="inline-flex min-h-11 items-center gap-2 rounded-full border border-semear-green/15 bg-white px-4 text-sm font-semibold text-semear-green" href={`/transparencia/homologacao/${packageItem.id}/preview`}>
              <Eye className="h-4 w-4" /> Preview print
            </Link>
          </div>
        </div>
      </div>

      {error ? <StateBox tone="error">{error}</StateBox> : null}
      {feedback ? <StateBox>{feedback}</StateBox> : null}

      <div className="mt-6 grid gap-5 xl:grid-cols-[1.15fr_0.85fr]">
        <section className="space-y-5">
          <section className="rounded-[2rem] border border-white/80 bg-white p-5 shadow-soft">
            <div className="mb-4 flex flex-wrap gap-2">
              <ActionButton disabled={saving} icon={<ShieldCheck className="h-4 w-4" />} label="Salvar pacote" onClick={() => void savePackage()} />
              <ActionButton disabled={saving || !canCoordinate} icon={<FileCheck2 className="h-4 w-4" />} label="Marcar pronto para assinatura" onClick={() => void handleMarkReady()} />
              <ActionButton disabled={saving || !canCoordinate || !readiness.canSign} icon={<CheckCircle2 className="h-4 w-4" />} label="Assinar / aprovar" onClick={() => void handleSign()} />
              <ActionButton disabled={saving || !canCoordinate || !form.decision_reason.trim()} icon={<AlertTriangle className="h-4 w-4" />} label="Rejeitar" onClick={() => void handleReject()} />
              <ActionButton disabled={saving || !canCoordinate} icon={<Archive className="h-4 w-4" />} label="Arquivar" onClick={() => void handleArchive()} />
              <ActionButton disabled={saving} icon={<ClipboardCopy className="h-4 w-4" />} label="Copiar Markdown institucional" onClick={() => void handleCopyMarkdown()} />
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Código do pacote">
                <input className="mt-2 min-h-11 w-full rounded-2xl border border-semear-gray bg-semear-offwhite px-4 text-sm text-stone-500 outline-none" readOnly value={packageItem.package_code} />
              </Field>
              <Field label="Status do pacote">
                <input className="mt-2 min-h-11 w-full rounded-2xl border border-semear-gray bg-semear-offwhite px-4 text-sm text-stone-500 outline-none" readOnly value={renderPackageStatus(packageItem.status)} />
              </Field>
            </div>

            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <Field label="Título"><input className="mt-2 min-h-11 w-full rounded-2xl border border-semear-gray bg-white px-4 text-sm outline-none focus:border-semear-green" onChange={(event) => setForm({ ...form, title: event.target.value })} value={form.title} /></Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Período inicial"><input className="mt-2 min-h-11 w-full rounded-2xl border border-semear-gray bg-white px-4 text-sm outline-none focus:border-semear-green" onChange={(event) => setForm({ ...form, period_start: event.target.value })} type="date" value={form.period_start} /></Field>
                <Field label="Período final"><input className="mt-2 min-h-11 w-full rounded-2xl border border-semear-gray bg-white px-4 text-sm outline-none focus:border-semear-green" onChange={(event) => setForm({ ...form, period_end: event.target.value })} type="date" value={form.period_end} /></Field>
              </div>
            </div>

            <div className="mt-4 grid gap-4">
              <TextArea label="Resumo institucional" rows={5} value={form.institutional_summary} onChange={(value) => setForm({ ...form, institutional_summary: value })} />
              <TextArea label="Metodologia" rows={4} value={form.methodology_note} onChange={(value) => setForm({ ...form, methodology_note: value })} />
              <TextArea label="Declaração de privacidade" rows={4} value={form.privacy_statement} onChange={(value) => setForm({ ...form, privacy_statement: value })} />
              <TextArea label="Motivo da decisão institucional" rows={3} value={form.decision_reason} onChange={(value) => setForm({ ...form, decision_reason: value })} />
            </div>
          </section>

          <TransparencyHomologationChecklist
            canValidate={canCoordinate}
            checklist={checklist}
            disabled={saving}
            onChange={setChecklist}
            snapshotStatus={snapshot.status}
          />

          <section className="rounded-[2rem] border border-white/80 bg-white p-5 shadow-soft">
            <h3 className="font-semibold text-semear-green">Auditoria e congelamento</h3>
            <div className="mt-4 grid gap-4 lg:grid-cols-2">
              <JsonPanel title="Frozen payload" data={packageItem.frozen_payload} />
              <JsonPanel title="Relatório de risco" data={packageItem.risk_report} />
            </div>
            <div className="mt-4 rounded-2xl border border-semear-gray bg-semear-offwhite p-4">
              <p className="text-sm font-semibold text-semear-green">Versão congelada</p>
              <p className="mt-2 text-sm text-stone-700">
                {snapshotVersion ? `v${snapshotVersion.version_number} · ${snapshotVersion.status_at_time ?? "sem status"} · ${formatDate(snapshotVersion.created_at)}` : "Nenhuma versão editorial registrada."}
              </p>
            </div>
          </section>

          <section className="rounded-[2rem] border border-white/80 bg-white p-5 shadow-soft">
            <h3 className="font-semibold text-semear-green">Comentários pendentes e histórico</h3>
            <div className="mt-4 space-y-3">
              {comments.length > 0 ? comments.map((comment) => (
                <div className="rounded-2xl border border-semear-gray bg-semear-offwhite p-4" key={comment.id}>
                  <div className="flex flex-wrap gap-2">
                    <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold uppercase tracking-[0.12em] text-semear-green">{comment.comment_type}</span>
                    <span className={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.12em] ${comment.resolved ? "bg-green-50 text-green-800" : "bg-amber-50 text-amber-900"}`}>
                      {comment.resolved ? "resolvido" : "pendente"}
                    </span>
                  </div>
                  <p className="mt-3 text-sm leading-6 text-stone-700">{comment.comment}</p>
                  <p className="mt-2 text-xs text-stone-500">{formatDate(comment.created_at)} · {formatPerson(comment.author_id, people)}</p>
                </div>
              )) : <p className="text-sm text-stone-500">Sem comentários editoriais registrados.</p>}
            </div>
          </section>
        </section>

        <aside className="space-y-5">
          <section className="rounded-[2rem] border border-white/80 bg-white p-5 shadow-soft">
            <h3 className="font-semibold text-semear-green">Status de assinatura</h3>
            <div className="mt-4 grid gap-3">
              <SmallInfo label="Snapshot" value={getSnapshotStatusLabel(snapshot.status)} />
              <SmallInfo label="Checklist" value={checklistComplete ? "completo" : "pendente"} />
              <SmallInfo label="Comentários críticos" value={criticalPendingComments.length.toString()} />
              <SmallInfo label="Comentários pendentes" value={pendingComments.length.toString()} />
            </div>
            {readiness.blockers.length > 0 ? (
              <div className="mt-4 space-y-2">
                {readiness.blockers.map((blocker) => <WarningBox key={blocker} tone="error">{blocker}</WarningBox>)}
              </div>
            ) : null}
            {readiness.warnings.length > 0 ? (
              <div className="mt-4 space-y-2">
                {readiness.warnings.map((warning) => <WarningBox key={warning} tone="warning">{warning}</WarningBox>)}
              </div>
            ) : null}
          </section>

          <section className="rounded-[2rem] border border-white/80 bg-white p-5 shadow-soft">
            <h3 className="font-semibold text-semear-green">Decisão institucional</h3>
            <div className="mt-4 grid gap-3">
              <SmallInfo label="Decisão" value={packageItem.decision ? renderDecision(packageItem.decision) : "não registrada"} />
              <SmallInfo label="Preparado por" value={formatPerson(packageItem.prepared_by, people)} />
              <SmallInfo label="Assinado por" value={formatPerson(packageItem.signed_by, people)} />
              <SmallInfo label="Rejeitado por" value={formatPerson(packageItem.rejected_by, people)} />
            </div>
            <p className="mt-4 text-sm leading-6 text-stone-700">{form.decision_reason || "Sem motivo adicional registrado."}</p>
          </section>

          <section className="rounded-[2rem] border border-white/80 bg-white p-5 shadow-soft">
            <h3 className="font-semibold text-semear-green">Snapshot vinculado</h3>
            <p className="mt-3 text-sm leading-6 text-stone-700">{snapshot.title}</p>
            <p className="mt-2 text-xs text-stone-500">
              Revisado por {formatPerson(snapshot.last_reviewed_by, people)} · aprovado por {formatPerson(snapshot.approved_by, people)}
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              <Link className="inline-flex min-h-10 items-center rounded-full border border-semear-green/15 bg-white px-3 text-sm font-semibold text-semear-green" href={`/transparencia/snapshots/${snapshot.id}`}>
                Abrir snapshot
              </Link>
              <Link className="inline-flex min-h-10 items-center rounded-full border border-semear-green/15 bg-white px-3 text-sm font-semibold text-semear-green" href="/transparencia/preview">
                Abrir preview
              </Link>
            </div>
          </section>
        </aside>
      </div>
    </section>
  );
}

export function TransparencyHomologationPreviewPage({ packageId }: { packageId: string }) {
  const supabase = useMemo(() => createBrowserSupabaseClient(), []);
  const [packageItem, setPackageItem] = useState<PublicTransparencyHomologationPackage | null>(null);
  const [snapshot, setSnapshot] = useState<PublicTransparencySnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let ignore = false;

    async function load() {
      if (!supabase) {
        setError("Configure NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_ANON_KEY para abrir o preview institucional.");
        setLoading(false);
        return;
      }

      try {
        const packageResult = await supabase.from("public_transparency_homologation_packages").select("*").eq("id", packageId).maybeSingle();
        if (packageResult.error) throw packageResult.error;
        const loadedPackage = (packageResult.data ?? null) as PublicTransparencyHomologationPackage | null;
        if (!loadedPackage) {
          setPackageItem(null);
          setSnapshot(null);
          return;
        }
        const snapshotResult = await supabase.from("public_transparency_snapshots").select("*").eq("id", loadedPackage.snapshot_id).single();
        if (snapshotResult.error) throw snapshotResult.error;
        if (ignore) return;
        setPackageItem(loadedPackage);
        setSnapshot(snapshotResult.data as PublicTransparencySnapshot);
      } catch (loadError) {
        if (!ignore) setError(getErrorMessage(loadError, "Erro ao carregar preview institucional."));
      } finally {
        if (!ignore) setLoading(false);
      }
    }

    void load();
    return () => {
      ignore = true;
    };
  }, [packageId, supabase]);

  if (loading) return <StateBox>Carregando preview institucional...</StateBox>;
  if (error) return <StateBox tone="error">{error}</StateBox>;
  if (!packageItem || !snapshot) return <StateBox>Pacote não encontrado.</StateBox>;

  const checklist = normalizeHomologationChecklist(packageItem.approval_checklist);
  const frozenPayload = (packageItem.frozen_payload ?? {}) as Record<string, unknown>;
  const totals = (frozenPayload.totals ?? {}) as Record<string, number>;

  return (
    <>
      <style jsx global>{`
        @media print {
          body {
            background: white !important;
          }
          .no-print {
            display: none !important;
          }
          .print-shell {
            padding: 0 !important;
          }
        }
      `}</style>
      <section className="print-shell mx-auto max-w-5xl pb-10">
        <div className="no-print mb-6 flex flex-wrap gap-2">
          <Link className="inline-flex min-h-11 items-center rounded-full bg-semear-green px-4 text-sm font-semibold text-white" href={`/transparencia/homologacao/${packageItem.id}`}>
            Voltar ao pacote
          </Link>
          <button className="inline-flex min-h-11 items-center rounded-full border border-semear-green/15 bg-white px-4 text-sm font-semibold text-semear-green" onClick={() => window.print()} type="button">
            Imprimir
          </button>
        </div>

        <article className="rounded-[2rem] border border-white/80 bg-white p-8 shadow-soft">
          <header className="border-b border-semear-gray pb-6">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-semear-earth">SEMEAR Territórios</p>
            <h1 className="mt-3 text-4xl font-semibold tracking-tight text-semear-green">Pacote de Homologação — Transparência Viva</h1>
            <p className="mt-4 text-sm leading-6 text-stone-600">{packageItem.package_code}</p>
          </header>

          <section className="mt-6 grid gap-4 md:grid-cols-2">
            <PreviewBlock title="Snapshot">
              <p className="text-sm text-stone-700">{snapshot.title}</p>
              <p className="mt-2 text-xs text-stone-500">Status editorial: {getSnapshotStatusLabel(snapshot.status)}</p>
            </PreviewBlock>
            <PreviewBlock title="Período">
              <p className="text-sm text-stone-700">{snapshot.period_start ?? "não informado"} até {snapshot.period_end ?? "não informado"}</p>
            </PreviewBlock>
          </section>

          <PreviewBlock className="mt-6" title="Resumo público aprovado">
            <p className="whitespace-pre-line text-sm leading-6 text-stone-700">{packageItem.institutional_summary || snapshot.public_summary}</p>
          </PreviewBlock>

          <section className="mt-6 grid gap-4 md:grid-cols-2">
            <PreviewBlock title="Indicadores">
              <div className="grid gap-2 sm:grid-cols-2">
                {Object.entries(totals).map(([key, value]) => (
                  <div className="rounded-xl border border-semear-gray bg-semear-offwhite px-3 py-2" key={key}>
                    <p className="text-xs uppercase tracking-[0.12em] text-stone-500">{key}</p>
                    <p className="mt-1 text-sm font-semibold text-semear-green">{value}</p>
                  </div>
                ))}
              </div>
            </PreviewBlock>
            <PreviewBlock title="Metodologia">
              <p className="whitespace-pre-line text-sm leading-6 text-stone-700">{packageItem.methodology_note || snapshot.methodology_notes}</p>
            </PreviewBlock>
          </section>

          <section className="mt-6 grid gap-4 md:grid-cols-2">
            <PreviewBlock title="Checklist de privacidade">
              <div className="space-y-2">
                {Object.entries(checklist).map(([key, value]) => (
                  <p className="rounded-xl bg-semear-offwhite px-3 py-2 text-sm text-stone-700" key={key}>
                    <strong className={value ? "text-green-700" : "text-amber-900"}>{value ? "ok" : "pendente"}</strong> · {key}
                  </p>
                ))}
              </div>
            </PreviewBlock>
            <PreviewBlock title="Decisão institucional">
              <p className="text-sm text-stone-700">{packageItem.decision ? renderDecision(packageItem.decision) : "não registrada"}</p>
              <p className="mt-2 whitespace-pre-line text-sm leading-6 text-stone-700">{packageItem.decision_reason || "Sem motivo adicional."}</p>
            </PreviewBlock>
          </section>

          <PreviewBlock className="mt-6" title="Assinatura interna">
            <p className="text-sm text-stone-700">Responsável: {packageItem.signed_by ?? "não assinado"}</p>
            <p className="mt-2 text-sm text-stone-700">Data: {packageItem.signed_at ? formatDate(packageItem.signed_at) : "não assinada"}</p>
            <p className="mt-2 text-sm text-stone-700">Status: {renderPackageStatus(packageItem.status)}</p>
          </PreviewBlock>
        </article>
      </section>
    </>
  );
}

function toPackageFormState(
  packageItem: PublicTransparencyHomologationPackage,
  snapshot: PublicTransparencySnapshot
): PackageFormState {
  return {
    title: packageItem.title ?? snapshot.title,
    period_start: packageItem.period_start ?? snapshot.period_start ?? "",
    period_end: packageItem.period_end ?? snapshot.period_end ?? "",
    institutional_summary: packageItem.institutional_summary ?? snapshot.public_summary ?? "",
    methodology_note: packageItem.methodology_note ?? snapshot.methodology_notes ?? "",
    privacy_statement: packageItem.privacy_statement ?? snapshot.privacy_notes ?? "",
    decision_reason: packageItem.decision_reason ?? ""
  };
}

function normalizeRiskReport(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return { blockers: [], warnings: [], hasBlockingRisk: false, hasWarningRisk: false };
  }
  const source = value as Record<string, unknown>;
  return {
    blockers: Array.isArray(source.blockers) ? source.blockers : [],
    warnings: Array.isArray(source.warnings) ? source.warnings : [],
    hasBlockingRisk: Boolean(source.hasBlockingRisk),
    hasWarningRisk: Boolean(source.hasWarningRisk)
  };
}

function toPeopleMap(items: Array<Pick<Profile, "id" | "full_name">>) {
  return items.reduce<Record<string, string>>((acc, item) => {
    acc[item.id] = item.full_name ?? item.id;
    return acc;
  }, {});
}

function renderPackageStatus(status: PublicTransparencyHomologationPackage["status"]) {
  switch (status) {
    case "draft":
      return "rascunho";
    case "ready_for_signature":
      return "pronto para assinatura";
    case "signed":
      return "assinado";
    case "rejected":
      return "rejeitado";
    case "archived":
      return "arquivado";
    default:
      return status;
  }
}

function renderDecision(decision: NonNullable<PublicTransparencyHomologationPackage["decision"]>) {
  switch (decision) {
    case "aprovado_para_publicacao":
      return "aprovado para publicação";
    case "revisar_antes_de_publicar":
      return "revisar antes de publicar";
    case "rejeitado":
      return "rejeitado";
    case "arquivado":
      return "arquivado";
    default:
      return decision;
  }
}

function formatDate(value: string | null) {
  if (!value) return "não registrado";
  return new Date(value).toLocaleString("pt-BR");
}

function formatPerson(id: string | null, people: Record<string, string>) {
  if (!id) return "não registrado";
  return people[id] ?? id;
}

function getErrorMessage(error: unknown, fallback: string) {
  if (error && typeof error === "object" && "message" in error && typeof (error as { message?: unknown }).message === "string") {
    return (error as { message: string }).message;
  }
  return fallback;
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

function SmallInfo({ label, value }: { label: string; value: string }) {
  return <div className="rounded-xl border border-semear-gray bg-semear-offwhite px-3 py-2"><p className="text-xs font-semibold uppercase tracking-[0.12em] text-stone-500">{label}</p><p className="mt-1 text-sm text-semear-green">{value}</p></div>;
}

function WarningBox({ children, tone }: { children: React.ReactNode; tone: "error" | "warning" }) {
  return <div className={`rounded-xl border px-3 py-2 text-sm ${tone === "error" ? "border-red-200 bg-red-50 text-red-800" : "border-amber-200 bg-amber-50 text-amber-900"}`}><AlertTriangle className="mr-2 inline h-4 w-4" />{children}</div>;
}

function JsonPanel({ title, data }: { title: string; data: unknown }) {
  return (
    <div className="rounded-2xl border border-semear-gray bg-semear-offwhite p-4">
      <p className="text-sm font-semibold text-semear-green">{title}</p>
      <pre className="mt-3 overflow-x-auto whitespace-pre-wrap text-xs leading-5 text-stone-700">{JSON.stringify(data, null, 2)}</pre>
    </div>
  );
}

function PreviewBlock({ title, children, className = "" }: { title: string; children: React.ReactNode; className?: string }) {
  return <section className={`rounded-2xl border border-semear-gray bg-white p-4 ${className}`}><h2 className="text-sm font-semibold uppercase tracking-[0.12em] text-semear-earth">{title}</h2><div className="mt-3">{children}</div></section>;
}

function StateBox({ children, tone = "neutral" }: { children: React.ReactNode; tone?: "neutral" | "error" }) {
  return <div className={`mt-5 rounded-[1.5rem] p-5 text-sm shadow-soft ${tone === "error" ? "border border-red-200 bg-red-50 text-red-800" : "border border-white/80 bg-white/72 text-stone-600"}`}>{children}</div>;
}
