"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSearchParams } from "next/navigation";
import {
  AlertTriangle,
  Archive,
  CheckCircle2,
  ClipboardCopy,
  Eye,
  FileLock2,
  FileJson,
  MessageSquareText,
  RefreshCw,
  Save,
  Send,
  ShieldAlert
} from "lucide-react";
import type {
  ActionClosure,
  ActionDebrief,
  Profile,
  PublicTransparencySnapshot,
  PublicTransparencyHomologationPackage,
  PublicTransparencySnapshotReviewComment,
  PublicTransparencySnapshotVersion,
  SnapshotReviewCommentType
} from "@/lib/database.types";
import { TransparencyPrivacyChecklist } from "@/components/transparency/transparency-privacy-checklist";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";
import {
  addReviewComment,
  buildSnapshotAuditExport,
  buildSnapshotAuditStatus,
  getSnapshotReviewComments,
  getSnapshotVersions,
  resolveReviewComment,
  type SnapshotAuditStatus
} from "@/lib/transparency-audit";
import { createHomologationPackage, getHomologationPackages } from "@/lib/transparency-homologation";
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
  type TransparencyChecklistState,
  type TransparencyRiskReport
} from "@/lib/transparency-privacy";
import { getTerritorialRiskPublicationGuard } from "@/lib/transparency-territorial-risk";

type SnapshotEditorProps = {
  snapshotId: string;
};

type NamedProfile = Pick<Profile, "id" | "role" | "full_name">;
type EditorTab = "content" | "checklist" | "audit" | "comments";

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
  territorial_risk_override_reason: string;
};

const commentTypeOptions: Array<{ value: SnapshotReviewCommentType; label: string }> = [
  { value: "privacidade", label: "Privacidade" },
  { value: "texto", label: "Texto" },
  { value: "metodologia", label: "Metodologia" },
  { value: "dados", label: "Dados" },
  { value: "aprovacao", label: "Aprovação" },
  { value: "publicacao", label: "Publicação" },
  { value: "outro", label: "Outro" }
];

export function TransparencySnapshotEditorPage({ snapshotId }: SnapshotEditorProps) {
  const supabase = useMemo(() => createBrowserSupabaseClient(), []);
  const router = useRouter();
  const searchParams = useSearchParams();
  const [snapshot, setSnapshot] = useState<PublicTransparencySnapshot | null>(null);
  const [form, setForm] = useState<FormState | null>(null);
  const [checklist, setChecklist] = useState<TransparencyChecklistState>(createEmptyTransparencyChecklist());
  const [profile, setProfile] = useState<Pick<Profile, "id" | "role"> | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [people, setPeople] = useState<Record<string, string>>({});
  const [versions, setVersions] = useState<PublicTransparencySnapshotVersion[]>([]);
  const [comments, setComments] = useState<PublicTransparencySnapshotReviewComment[]>([]);
  const [homologationPackages, setHomologationPackages] = useState<PublicTransparencyHomologationPackage[]>([]);
  const [auditStatus, setAuditStatus] = useState<SnapshotAuditStatus>({
    pendingCriticalComments: 0,
    pendingTextComments: 0,
    pendingOtherComments: 0,
    hasBlockingComments: false,
    hasTextWarnings: false,
    lastVersionAt: null,
    totalVersions: 0
  });
  const [commentText, setCommentText] = useState("");
  const [commentType, setCommentType] = useState<SnapshotReviewCommentType>("texto");
  const [commentFilter, setCommentFilter] = useState<SnapshotReviewCommentType | "todos">("todos");
  const [activeTab, setActiveTab] = useState<EditorTab>("content");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);

  const riskReport = useMemo<TransparencyRiskReport>(
    () => detectTransparencyPrivacyRisks(
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
    ),
    [form]
  );

  const canCoordinate = profile?.role === "admin" || profile?.role === "coordenacao";
  const checklistComplete = isTransparencyChecklistComplete(checklist);
  const filteredComments = comments.filter((item) => commentFilter === "todos" || item.comment_type === commentFilter);
  const showCollectiveReadingNotice = searchParams.get("source") === "collective_reading";

  useEffect(() => {
    let ignore = false;

    async function load() {
      if (!supabase) {
        setError("Configure NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_ANON_KEY para editar snapshots.");
        setLoading(false);
        return;
      }

      try {
        const userResult = await supabase.auth.getUser();
        const userId = userResult.data.user?.id ?? null;
        setCurrentUserId(userId);

        const [snapshotResult, profileResult] = await Promise.all([
          supabase.from("public_transparency_snapshots").select("*").eq("id", snapshotId).maybeSingle(),
          userId ? supabase.from("profiles").select("id, role").eq("id", userId).maybeSingle() : Promise.resolve({ data: null, error: null })
        ]);

        if (ignore) return;
        if (snapshotResult.error || profileResult.error) {
          throw snapshotResult.error ?? profileResult.error;
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
        await refreshAuditCollections(loadedSnapshot, userId, ignore);
      } catch (loadError) {
        if (!ignore) {
          setError(getErrorMessage(loadError, "Erro ao carregar snapshot."));
        }
      } finally {
        if (!ignore) setLoading(false);
      }
    }

    void load();
    return () => {
      ignore = true;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [snapshotId, supabase]);

  async function refreshAuditCollections(baseSnapshot: PublicTransparencySnapshot, userId: string | null, ignore = false) {
    if (!supabase) return;
    const [versionsData, commentsData] = await Promise.all([
      getSnapshotVersions(supabase, baseSnapshot.id),
      getSnapshotReviewComments(supabase, baseSnapshot.id),
    ]);
    const packagesData = await getHomologationPackages(supabase, baseSnapshot.id);

    if (ignore) return;

    setVersions(versionsData);
    setComments(commentsData);
    setHomologationPackages(packagesData);
    setAuditStatus(buildSnapshotAuditStatus(versionsData, commentsData));

    const personIds = Array.from(new Set([
      baseSnapshot.created_by,
      baseSnapshot.last_edited_by,
      baseSnapshot.last_reviewed_by,
      baseSnapshot.approved_by,
      userId,
      ...versionsData.map((item) => item.created_by),
      ...commentsData.map((item) => item.author_id),
      ...commentsData.map((item) => item.resolved_by)
    ].filter(Boolean) as string[]));

    if (personIds.length > 0) {
      const peopleResult = await supabase.from("profiles").select("id, full_name").in("id", personIds);
      if (!peopleResult.error) {
        setPeople(((peopleResult.data ?? []) as Array<Pick<Profile, "id" | "full_name">>).reduce<Record<string, string>>((acc, item) => {
          acc[item.id] = item.full_name ?? item.id;
          return acc;
        }, {}));
      }
    }
  }

  async function saveSnapshot(explicitStatus?: PublicTransparencySnapshot["status"]) {
    if (!supabase || !snapshot || !form) return;
    setSaving(true);
    setError(null);
    setFeedback(null);

    const nextStatus = explicitStatus ?? (snapshot.status === "published" ? "reviewed" : snapshot.status);
    const contentForm = {
      title: form.title,
      period_start: form.period_start,
      period_end: form.period_end,
      public_summary: form.public_summary,
      privacy_notes: form.privacy_notes,
      methodology_notes: form.methodology_notes,
      opening_text: form.opening_text,
      listening_text: form.listening_text,
      limits_text: form.limits_text,
      next_steps_text: form.next_steps_text
    };

    const result = await supabase
      .from("public_transparency_snapshots")
      .update({
        ...contentForm,
        public_summary: form.public_summary.trim(),
        review_checklist: checklist,
        current_risk_report: riskReport,
        status: nextStatus
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
      await refreshAuditCollections(updated, currentUserId);
      setFeedback(snapshot.status === "published" && nextStatus === "reviewed"
        ? "Snapshot publicado foi reaberto para revisão após edição."
        : "Snapshot salvo.");
    }

    setSaving(false);
  }

  async function regenerateAutomaticBlocks() {
    if (!supabase || !snapshot || !form) return;
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
    const nextSummary = form.public_summary !== (snapshot.generated_summary ?? snapshot.public_summary ?? "")
      ? form.public_summary
      : (merged.public_summary ?? form.public_summary);

    const nextRiskReport = detectTransparencyPrivacyRisks(
      buildTransparencyTextBlob([
        form.title,
        nextSummary,
        form.privacy_notes,
        form.methodology_notes,
        form.opening_text,
        form.listening_text,
        form.limits_text,
        form.next_steps_text
      ])
    );

    const result = await supabase
      .from("public_transparency_snapshots")
      .update({
        period_start: merged.period_start,
        period_end: merged.period_end,
        generated_summary: merged.generated_summary,
        public_summary: nextSummary,
        edited_summary: nextSummary,
        totals: merged.totals,
        territory_summary: merged.territory_summary,
        theme_summary: merged.theme_summary,
        word_summary: merged.word_summary,
        action_timeline: merged.action_timeline,
        debrief_links: merged.debrief_links,
        current_risk_report: nextRiskReport,
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
      await refreshAuditCollections(updated, currentUserId);
      setFeedback("Blocos automáticos regenerados a partir dos dados agregados.");
    }

    setSaving(false);
  }

  async function transition(status: PublicTransparencySnapshot["status"]) {
    if (!supabase || !snapshot || !form) return;
    let overridePatch: {
      territorial_risk_override?: boolean;
      territorial_risk_override_reason?: string | null;
      territorial_risk_override_by?: string | null;
      territorial_risk_override_at?: string | null;
    } = {};

    if (status === "published") {
      const guard = getTerritorialRiskPublicationGuard(snapshot);
      if (!checklistComplete || riskReport.hasBlockingRisk) {
        setError("Checklist incompleto ou risco bloqueante detectado. A publicação foi bloqueada.");
        return;
      }
      if (auditStatus.hasBlockingComments) {
        setError("Há comentários críticos pendentes de privacidade, dados ou metodologia. A publicação foi bloqueada.");
        return;
      }
      if (guard.critical && !canCoordinate) {
        setError("A cobertura territorial deste snapshot está crítica. Para publicar, a coordenação precisa registrar justificativa institucional.");
        return;
      }
      if (guard.critical && !guard.hasOverride) {
        if (!form.territorial_risk_override_reason.trim()) {
          setError("A cobertura territorial deste snapshot está crítica. Para publicar, a coordenação precisa registrar justificativa institucional.");
          return;
        }
        overridePatch = {
          territorial_risk_override: true,
          territorial_risk_override_reason: form.territorial_risk_override_reason.trim(),
          territorial_risk_override_by: currentUserId,
          territorial_risk_override_at: new Date().toISOString()
        };
      }
      if (auditStatus.hasTextWarnings && canCoordinate) {
        setFeedback("Há comentários pendentes de texto. A regra adotada permite publicar apenas com validação de coordenação ou admin.");
      }
    }

    setSaving(true);
    setError(null);

    const contentForm = {
      title: form.title,
      period_start: form.period_start,
      period_end: form.period_end,
      public_summary: form.public_summary,
      privacy_notes: form.privacy_notes,
      methodology_notes: form.methodology_notes,
      opening_text: form.opening_text,
      listening_text: form.listening_text,
      limits_text: form.limits_text,
      next_steps_text: form.next_steps_text
    };

    const result = await supabase
      .from("public_transparency_snapshots")
      .update({
        ...contentForm,
        ...overridePatch,
        review_checklist: checklist,
        current_risk_report: riskReport,
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
      await refreshAuditCollections(updated, currentUserId);
      setFeedback(`Snapshot marcado como ${getSnapshotStatusLabel(updated.status)}.`);
    }

    setSaving(false);
  }

  async function registerTerritorialRiskOverride() {
    if (!supabase || !snapshot || !canCoordinate) {
      setError("Somente coordenação ou admin podem registrar justificativa institucional.");
      return;
    }

    const guard = getTerritorialRiskPublicationGuard(snapshot);
    if (!guard.critical) {
      setFeedback("Este snapshot não está em risco territorial crítico. Override não é necessário.");
      return;
    }

    const reason = form?.territorial_risk_override_reason.trim() ?? "";
    if (!reason) {
      setError("Preencha a justificativa institucional antes de registrar o override de risco territorial.");
      return;
    }

    setSaving(true);
    setError(null);
    setFeedback(null);

    const result = await supabase
      .from("public_transparency_snapshots")
      .update({
        territorial_risk_override: true,
        territorial_risk_override_reason: reason,
        territorial_risk_override_by: currentUserId,
        territorial_risk_override_at: new Date().toISOString()
      })
      .eq("id", snapshot.id)
      .select("*")
      .single();

    if (result.error) {
      setError(result.error.message);
      setSaving(false);
      return;
    }

    const updated = result.data as PublicTransparencySnapshot;
    setSnapshot(updated);
    setForm(toFormState(updated));
    setChecklist(normalizeTransparencyChecklist(updated.review_checklist));
    await refreshAuditCollections(updated, currentUserId);
    setFeedback("Justificativa institucional de risco territorial registrada.");
    setSaving(false);
  }

  async function handleAddComment() {
    if (!supabase || !snapshot || !commentText.trim()) return;
    setSaving(true);
    setError(null);
    setFeedback(null);

    try {
      await addReviewComment(supabase, snapshot.id, {
        comment: commentText,
        comment_type: commentType,
        author_id: currentUserId
      });
      const refreshed = await getSnapshotReviewComments(supabase, snapshot.id);
      setComments(refreshed);
      setAuditStatus(buildSnapshotAuditStatus(versions, refreshed));
      await refreshAuditCollections(snapshot, currentUserId);
      setCommentText("");
      setFeedback("Comentário editorial registrado.");
    } catch (commentError) {
      setError(getErrorMessage(commentError, "Erro ao registrar comentário."));
    } finally {
      setSaving(false);
    }
  }

  async function handleResolveComment(commentId: string) {
    if (!supabase || !snapshot) return;
    setSaving(true);
    setError(null);
    setFeedback(null);

    try {
      await resolveReviewComment(supabase, commentId, currentUserId);
      await refreshAuditCollections(snapshot, currentUserId);
      setFeedback("Comentário resolvido.");
    } catch (resolveError) {
      setError(getErrorMessage(resolveError, "Erro ao resolver comentário."));
    } finally {
      setSaving(false);
    }
  }

  async function copyAuditSummary() {
    if (!supabase || !snapshot) return;
    setSaving(true);
    setError(null);
    setFeedback(null);

    try {
      const audit = await buildSnapshotAuditExport(supabase, snapshot.id);
      await navigator.clipboard.writeText(audit.markdown);
      setFeedback("Resumo da auditoria copiado.");
    } catch (copyError) {
      setError(getErrorMessage(copyError, "Erro ao copiar resumo da auditoria."));
    } finally {
      setSaving(false);
    }
  }

  async function handleCreateHomologationPackage() {
    if (!supabase || !snapshot) return;
    setSaving(true);
    setError(null);
    setFeedback(null);

    try {
      const existing = homologationPackages[0];
      if (existing) {
        router.push(`/transparencia/homologacao/${existing.id}`);
        return;
      }

      const packageItem = await createHomologationPackage(supabase, snapshot.id, currentUserId);
      setFeedback(`Pacote ${packageItem.package_code} gerado.`);
      router.push(`/transparencia/homologacao/${packageItem.id}`);
    } catch (createError) {
      setError(getErrorMessage(createError, "Erro ao gerar pacote de homologação."));
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <StateBox>Carregando editor de snapshot...</StateBox>;
  if (error && !snapshot) return <StateBox tone="error">{error}</StateBox>;
  if (!snapshot || !form) return <StateBox>Snapshot não encontrado.</StateBox>;

  const diffItems = buildSummaryDiff(snapshot.generated_summary ?? "", form.public_summary);
  const territoryPayload = (snapshot.territory_summary ?? {}) as {
    action_territory_summary?: Array<{ territory: string; reviewed_records: number; public_status: string }>;
    respondent_territory_summary?: Array<{ territory: string; reviewed_records: number; public_status: string }>;
    respondent_without_territory?: number;
    territorial_quality_summary?: {
      status: "boa" | "atenção" | "crítica";
      coverage_percent: number;
      records_with_territory: number;
      records_without_territory: number;
      methodology_note: string;
      operational_recommendation: string;
    };
  };
  const territoriesAction = (territoryPayload.action_territory_summary ?? []).slice(0, 12);
  const territoriesRespondent = (territoryPayload.respondent_territory_summary ?? []).slice(0, 12);
  const respondentWithoutTerritory = territoryPayload.respondent_without_territory ?? 0;
  const territorialQuality = territoryPayload.territorial_quality_summary;
  const territorialRiskGuard = getTerritorialRiskPublicationGuard(snapshot);

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
        {showCollectiveReadingNotice ? (
          <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
            Snapshot criado a partir de Leituras Coletivas. Revise texto, checklist e privacidade antes de aprovar.
          </div>
        ) : null}
        {snapshot?.source_type === "collective_reading" ? (
          <div className="mt-3 rounded-2xl border border-semear-green/20 bg-semear-offwhite p-3 text-sm text-stone-700">
            <p><strong>Origem:</strong> collective_reading</p>
            <p className="mt-1"><strong>Gerado em:</strong> {snapshot.source_generated_at ? new Date(snapshot.source_generated_at).toLocaleString("pt-BR") : "-"}</p>
          </div>
        ) : null}
      </div>

      {error ? <StateBox tone="error">{error}</StateBox> : null}
      {feedback ? <StateBox>{feedback}</StateBox> : null}

      <div className="mt-6 flex flex-wrap gap-2">
        <TabButton active={activeTab === "content"} label="Conteúdo" onClick={() => setActiveTab("content")} />
        <TabButton active={activeTab === "checklist"} label="Checklist" onClick={() => setActiveTab("checklist")} />
        <TabButton active={activeTab === "audit"} label="Auditoria" onClick={() => setActiveTab("audit")} />
        <TabButton active={activeTab === "comments"} label={`Comentários${comments.length > 0 ? ` (${comments.length})` : ""}`} onClick={() => setActiveTab("comments")} />
      </div>

      <div className="mt-6 grid gap-5 xl:grid-cols-[1.1fr_0.9fr]">
        <section className="rounded-[2rem] border border-white/80 bg-white p-5 shadow-soft">
          <div className="mb-4 flex flex-wrap gap-2">
            <ActionButton disabled={saving} icon={<Save className="h-4 w-4" />} label="Salvar edição" onClick={() => void saveSnapshot()} />
            <ActionButton disabled={saving} icon={<RefreshCw className="h-4 w-4" />} label="Regerar blocos automáticos" onClick={() => void regenerateAutomaticBlocks()} />
            <ActionButton disabled={saving} icon={<ClipboardCopy className="h-4 w-4" />} label="Copiar resumo da auditoria" onClick={() => void copyAuditSummary()} />
            {canCoordinate ? <ActionButton disabled={saving} icon={<CheckCircle2 className="h-4 w-4" />} label="Marcar revisado" onClick={() => void transition("reviewed")} /> : null}
            {canCoordinate ? <ActionButton disabled={saving || !checklistComplete} icon={<CheckCircle2 className="h-4 w-4" />} label="Aprovar" onClick={() => void transition("approved")} /> : null}
            {canCoordinate ? <ActionButton disabled={saving || !checklistComplete || riskReport.hasBlockingRisk || auditStatus.hasBlockingComments} icon={<Send className="h-4 w-4" />} label="Publicar" onClick={() => void transition("published")} /> : null}
            {canCoordinate ? <ActionButton disabled={saving} icon={<Archive className="h-4 w-4" />} label="Arquivar" onClick={() => void transition("archived")} /> : null}
          </div>

          {activeTab === "content" ? (
            <>
              {territorialQuality ? (
                <div className={`mb-4 rounded-2xl border px-4 py-3 text-sm ${territorialQuality.status === "boa" ? "border-green-200 bg-green-50 text-green-900" : territorialQuality.status === "atenção" ? "border-amber-200 bg-amber-50 text-amber-900" : "border-red-200 bg-red-50 text-red-900"}`}>
                  <p><strong>Qualidade territorial automática:</strong> {territorialQuality.status} · cobertura {territorialQuality.coverage_percent}% ({territorialQuality.records_with_territory}/{territorialQuality.records_with_territory + territorialQuality.records_without_territory})</p>
                  <p className="mt-1">{territorialQuality.methodology_note}</p>
                  <p className="mt-1"><strong>Recomendação:</strong> {territorialQuality.operational_recommendation}</p>
                </div>
              ) : null}

              {territorialQuality ? (
                <div className={`mb-4 rounded-2xl border px-4 py-3 text-sm ${territorialRiskGuard.critical ? "border-red-300 bg-red-50 text-red-900" : "border-semear-gray bg-semear-offwhite text-stone-700"}`}>
                  <p className="font-semibold">Risco territorial de publicação</p>
                  <p className="mt-1">
                    Status: <strong>{territorialQuality.status}</strong> · cobertura: <strong>{territorialQuality.coverage_percent}%</strong> · sem território: <strong>{territorialQuality.records_without_territory}</strong>
                  </p>
                  <p className="mt-1">{territorialQuality.methodology_note}</p>
                  <p className="mt-2 text-xs">Use apenas quando a publicação pública for necessária mesmo com cobertura territorial crítica. A justificativa ficará registrada no pacote institucional.</p>
                  <TextArea
                    label="Justificativa institucional de risco territorial"
                    rows={3}
                    value={form.territorial_risk_override_reason}
                    onChange={(value) => setForm({ ...form, territorial_risk_override_reason: value })}
                  />
                  <div className="mt-3 flex flex-wrap gap-2">
                    <ActionButton
                      disabled={saving || !canCoordinate || !territorialRiskGuard.critical}
                      icon={<ShieldAlert className="h-4 w-4" />}
                      label="Registrar justificativa institucional"
                      onClick={() => void registerTerritorialRiskOverride()}
                    />
                    {snapshot.territorial_risk_override ? (
                      <span className="inline-flex min-h-10 items-center rounded-full border border-green-200 bg-green-50 px-3 text-xs font-semibold text-green-800">
                        Override ativo em {snapshot.territorial_risk_override_at ? new Date(snapshot.territorial_risk_override_at).toLocaleString("pt-BR") : "data não registrada"}
                      </span>
                    ) : null}
                  </div>
                </div>
              ) : null}

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
                <p className="mt-4 text-xs text-stone-500">Última edição: {formatMeta(snapshot.last_edited_at, snapshot.last_edited_by, people)}.</p>
                <p className="text-xs text-stone-500">Última revisão: {formatMeta(snapshot.last_reviewed_at, snapshot.last_reviewed_by, people)}.</p>
              </Panel>
            </>
          ) : null}

          {activeTab === "checklist" ? (
            <>
              <TransparencyPrivacyChecklist canPublishReview={canCoordinate} checklist={checklist} disabled={saving} onChange={setChecklist} riskReport={riskReport} />
              <section className="mt-5 rounded-[2rem] border border-white/80 bg-white p-5 shadow-soft">
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
                    {riskReport.blockers.map((risk) => <RiskBox key={risk.key} severity={risk.severity} title={risk.message} values={risk.matches} />)}
                    {riskReport.warnings.map((risk) => <RiskBox key={risk.key} severity={risk.severity} title={risk.message} values={risk.matches} />)}
                  </div>
                )}
              </section>
            </>
          ) : null}

          {activeTab === "audit" ? (
            <>
              <Panel title="Resumo da auditoria">
                <div className="grid gap-3 md:grid-cols-2">
                  <SmallInfo label="Total de versões" value={auditStatus.totalVersions.toString()} />
                  <SmallInfo label="Última versão" value={auditStatus.lastVersionAt ? new Date(auditStatus.lastVersionAt).toLocaleString("pt-BR") : "não registrada"} />
                  <SmallInfo label="Comentários críticos pendentes" value={auditStatus.pendingCriticalComments.toString()} />
                  <SmallInfo label="Comentários de texto pendentes" value={auditStatus.pendingTextComments.toString()} />
                </div>
              </Panel>

              <Panel className="mt-4" title="Versões registradas">
                <div className="space-y-3">
                  {versions.length > 0 ? versions.map((version) => (
                    <div className="rounded-xl border border-semear-gray bg-semear-offwhite p-3" key={version.id}>
                      <p className="text-sm font-semibold text-semear-green">v{version.version_number} · {version.status_at_time ?? "sem status"}</p>
                      <p className="mt-1 text-xs text-stone-600">{new Date(version.created_at).toLocaleString("pt-BR")} · {people[version.created_by ?? ""] ?? version.created_by ?? "autor não identificado"}</p>
                      <p className="mt-2 text-sm text-stone-700">{version.change_reason ?? "Sem motivo informado."}</p>
                    </div>
                  )) : <p className="text-sm text-stone-500">Nenhuma versão registrada ainda.</p>}
                </div>
              </Panel>

              <Panel className="mt-4" title="Blocos automáticos revisáveis">
                <JsonSummary title="Totais" data={snapshot.totals} />
                <JsonSummary title="Temas" data={snapshot.theme_summary} />
                <JsonSummary title="Palavras" data={snapshot.word_summary} />
                <JsonSummary title="Territórios (ação e referência)" data={snapshot.territory_summary} />
                <JsonSummary title="Linha do tempo" data={snapshot.action_timeline} />
              </Panel>
            </>
          ) : null}

          {activeTab === "comments" ? (
            <>
              <Panel title="Novo comentário editorial">
                <div className="grid gap-4">
                  <label>
                    <span className="text-xs font-semibold uppercase tracking-[0.12em] text-stone-500">Tipo</span>
                    <select className="mt-2 min-h-11 w-full rounded-2xl border border-semear-gray bg-white px-4 text-sm outline-none focus:border-semear-green" onChange={(event) => setCommentType(event.target.value as SnapshotReviewCommentType)} value={commentType}>
                      {commentTypeOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                    </select>
                  </label>
                  <TextArea label="Comentário" rows={4} value={commentText} onChange={setCommentText} />
                  <div className="flex flex-wrap gap-2">
                    <ActionButton disabled={saving || !commentText.trim()} icon={<MessageSquareText className="h-4 w-4" />} label="Adicionar comentário" onClick={() => void handleAddComment()} />
                  </div>
                </div>
              </Panel>

              <Panel className="mt-4" title="Comentários e pendências">
                <div className="mb-4 flex flex-wrap gap-2">
                  <TabButton active={commentFilter === "todos"} label="Todos" onClick={() => setCommentFilter("todos")} />
                  {commentTypeOptions.map((option) => <TabButton active={commentFilter === option.value} key={option.value} label={option.label} onClick={() => setCommentFilter(option.value)} />)}
                </div>
                <div className="space-y-3">
                  {filteredComments.length > 0 ? filteredComments.map((comment) => (
                    <div className="rounded-xl border border-semear-gray bg-semear-offwhite p-3" key={comment.id}>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold uppercase tracking-[0.12em] text-semear-green">{comment.comment_type}</span>
                        <span className={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.12em] ${comment.resolved ? "bg-green-50 text-green-800" : "bg-amber-50 text-amber-900"}`}>
                          {comment.resolved ? "resolvido" : "pendente"}
                        </span>
                      </div>
                      <p className="mt-3 text-sm leading-6 text-stone-700">{comment.comment}</p>
                      <p className="mt-2 text-xs text-stone-500">
                        {new Date(comment.created_at).toLocaleString("pt-BR")} · {people[comment.author_id ?? ""] ?? comment.author_id ?? "autor não identificado"}
                      </p>
                      {comment.resolved_at ? (
                        <p className="text-xs text-stone-500">Resolvido em {new Date(comment.resolved_at).toLocaleString("pt-BR")} por {people[comment.resolved_by ?? ""] ?? comment.resolved_by ?? "usuário não identificado"}</p>
                      ) : null}
                      {!comment.resolved && canCoordinate ? (
                        <div className="mt-3">
                          <ActionButton disabled={saving} icon={<CheckCircle2 className="h-4 w-4" />} label="Marcar como resolvido" onClick={() => void handleResolveComment(comment.id)} />
                        </div>
                      ) : null}
                    </div>
                  )) : <p className="text-sm text-stone-500">Nenhum comentário para o filtro selecionado.</p>}
                </div>
              </Panel>
            </>
          ) : null}
        </section>

        <div className="space-y-5">
          <section className="rounded-[2rem] border border-white/80 bg-white p-5 shadow-soft">
            <h3 className="font-semibold text-semear-green">Status editorial</h3>
            <div className="mt-4 grid gap-3">
              <SmallInfo label="Status do snapshot" value={getSnapshotStatusLabel(snapshot.status)} />
              <SmallInfo label="Comentários críticos pendentes" value={auditStatus.pendingCriticalComments.toString()} />
              <SmallInfo label="Comentários de texto pendentes" value={auditStatus.pendingTextComments.toString()} />
              <SmallInfo label="Última versão registrada" value={auditStatus.lastVersionAt ? new Date(auditStatus.lastVersionAt).toLocaleString("pt-BR") : "não registrada"} />
            </div>
            {auditStatus.hasBlockingComments ? (
              <WarningBox tone="error">Comentários críticos de privacidade, dados ou metodologia bloqueiam a publicação.</WarningBox>
            ) : null}
            {auditStatus.hasTextWarnings ? (
              <WarningBox tone="warning">Comentários pendentes de texto não bloqueiam sozinhos, mas exigem validação final de coordenação ou admin.</WarningBox>
            ) : null}
          </section>

          <section className="rounded-[2rem] border border-white/80 bg-white p-5 shadow-soft">
            <h3 className="font-semibold text-semear-green">Amostra mínima e territórios</h3>
            <p className="mt-2 text-xs text-stone-500">Territórios da ação e territórios de referência dos entrevistados são listados separadamente.</p>
            <div className="mt-4 space-y-2">
              {territoriesAction.map((territory) => (
                <div className="rounded-xl border border-semear-gray bg-semear-offwhite px-3 py-2 text-sm text-stone-700" key={`acao-${territory.territory}`}>
                  <strong className="text-semear-green">[Ação] {territory.territory}</strong>: {territory.reviewed_records} escuta(s) revisada(s) · {territory.public_status}
                </div>
              ))}
              {territoriesRespondent.map((territory) => (
                <div className="rounded-xl border border-semear-gray bg-semear-offwhite px-3 py-2 text-sm text-stone-700" key={`ref-${territory.territory}`}>
                  <strong className="text-semear-green">[Referência] {territory.territory}</strong>: {territory.reviewed_records} escuta(s) revisada(s) · {territory.public_status}
                </div>
              ))}
              <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
                Escutas sem território de referência informado: {respondentWithoutTerritory}
              </div>
            </div>
          </section>

          <section className="rounded-[2rem] border border-white/80 bg-white p-5 shadow-soft">
            <h3 className="font-semibold text-semear-green">Homologação institucional</h3>
            <p className="mt-3 text-sm leading-6 text-stone-700">
              O pacote institucional congela uma versão editorial do snapshot para assinatura interna e prestação institucional.
            </p>
            <div className="mt-4 grid gap-3">
              <SmallInfo label="Pacotes vinculados" value={homologationPackages.length.toString()} />
              <SmallInfo label="Status do pacote atual" value={homologationPackages[0] ? homologationPackages[0].status : "não criado"} />
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              <ActionButton disabled={saving} icon={<FileLock2 className="h-4 w-4" />} label="Gerar pacote de homologação" onClick={() => void handleCreateHomologationPackage()} />
              {homologationPackages[0] ? (
                <Link className="inline-flex min-h-10 items-center rounded-full border border-semear-green/15 bg-white px-3 text-sm font-semibold text-semear-green" href={`/transparencia/homologacao/${homologationPackages[0].id}`}>
                  Abrir pacote
                </Link>
              ) : null}
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
    next_steps_text: snapshot.next_steps_text ?? "",
    territorial_risk_override_reason: snapshot.territorial_risk_override_reason ?? ""
  };
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

function getErrorMessage(error: unknown, fallback: string) {
  if (error && typeof error === "object" && "message" in error && typeof (error as { message?: unknown }).message === "string") {
    return (error as { message: string }).message;
  }
  return fallback;
}

function TabButton({ active, label, onClick }: { active: boolean; label: string; onClick: () => void }) {
  return <button className={`inline-flex min-h-10 items-center rounded-full border px-4 text-sm font-semibold ${active ? "border-semear-green bg-semear-green text-white" : "border-semear-green/15 bg-white text-semear-green"}`} onClick={onClick} type="button">{label}</button>;
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

function SmallInfo({ label, value }: { label: string; value: string }) {
  return <div className="rounded-xl border border-semear-gray bg-semear-offwhite px-3 py-2"><p className="text-xs font-semibold uppercase tracking-[0.12em] text-stone-500">{label}</p><p className="mt-1 text-sm text-semear-green">{value}</p></div>;
}

function WarningBox({ children, tone }: { children: React.ReactNode; tone: "error" | "warning" }) {
  return <div className={`mt-4 rounded-xl border px-3 py-2 text-sm ${tone === "error" ? "border-red-200 bg-red-50 text-red-800" : "border-amber-200 bg-amber-50 text-amber-900"}`}><AlertTriangle className="mr-2 inline h-4 w-4" />{children}</div>;
}

function StateBox({ children, tone = "neutral" }: { children: React.ReactNode; tone?: "neutral" | "error" }) {
  return <div className={`rounded-[1.5rem] p-6 text-sm shadow-soft ${tone === "error" ? "border border-red-200 bg-red-50 text-red-800" : "border border-white/80 bg-white/72 text-stone-600"}`}>{children}</div>;
}
