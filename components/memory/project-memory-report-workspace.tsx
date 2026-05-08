"use client";

import { useEffect, useMemo, useState, type ChangeEvent } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Archive, CheckCircle2, Download, FileText, MapPinned, Save, Send, ShieldCheck, Upload, UsersRound } from "lucide-react";
import type {
  Action,
  Neighborhood,
  Profile,
  ProjectMemoryEntry,
  ProjectMemoryType,
  ProjectMemoryVisibility,
  TeamMember,
  WeeklyTeamReport,
  WeeklyTeamReportAttachment,
  WeeklyTeamReportStatus,
  TeamCalendarEvent,
} from "@/lib/database.types";
import {
  formatDateLabel,
  formatFileSize,
  formatWeekLabel,
  getEndOfWeekIso,
  getProjectMemoryTypeLabel,
  getProjectMemoryVisibilityLabel,
  getStartOfWeekIso,
  getWeeklyReportStatusLabel,
  projectMemoryAcceptedExtensions,
  projectMemoryMaxFileSizeBytes,
  projectMemoryTypeOptions,
  projectMemoryVisibilityOptions,
  sanitizeUploadFileName,
  validateProjectMemoryFile,
} from "@/lib/project-memory";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";
import { 
  detectMemoryPrivacyRisks, 
  MemoryChecklistState, 
  normalizeMemoryChecklist,
  isMemoryChecklistComplete
} from "@/lib/memory-privacy";
import { MemoryEntryPrivacyChecklist } from "@/components/memory/memory-entry-privacy-checklist";
import { ShieldAlert, AlertTriangle } from "lucide-react";

type ReportActionLink = {
  action_id: string;
  actions: Pick<Action, "id" | "title" | "action_date" | "neighborhood_id"> | null;
};

type ReportNeighborhoodLink = {
  neighborhood_id: string;
  neighborhoods: Pick<Neighborhood, "id" | "name"> | null;
};

type MemoryEntryWithAction = ProjectMemoryEntry & {
  actions: Pick<Action, "id" | "title"> | null;
};

type ReportFormValues = {
  week_start: string;
  week_end: string;
  team_member_id: string;
  title: string;
  summary: string;
  activities_done: string;
  territories_involved: string;
  problems_found: string;
  learnings: string;
  pending_items: string;
  next_steps: string;
  review_notes: string;
};

type MemoryFormValues = {
  entry_date: string;
  title: string;
  body: string;
  memory_type: ProjectMemoryType;
  visibility: ProjectMemoryVisibility;
  action_id: string;
};

const currentWeekStart = getStartOfWeekIso(new Date());

const defaultReportValues: ReportFormValues = {
  week_start: currentWeekStart,
  week_end: getEndOfWeekIso(currentWeekStart),
  team_member_id: "",
  title: "",
  summary: "",
  activities_done: "",
  territories_involved: "",
  problems_found: "",
  learnings: "",
  pending_items: "",
  next_steps: "",
  review_notes: "",
};

const defaultMemoryValues: MemoryFormValues = {
  entry_date: currentWeekStart,
  title: "",
  body: "",
  memory_type: "atividade",
  visibility: "internal",
  action_id: "",
};

export function ProjectMemoryReportWorkspace({ reportId }: { reportId?: string }) {
  const supabase = useMemo(() => createBrowserSupabaseClient(), []);
  const router = useRouter();
  const searchParams = useSearchParams();
  const [report, setReport] = useState<WeeklyTeamReport | null>(null);
  const [reportActions, setReportActions] = useState<ReportActionLink[]>([]);
  const [reportNeighborhoods, setReportNeighborhoods] = useState<ReportNeighborhoodLink[]>([]);
  const [attachments, setAttachments] = useState<WeeklyTeamReportAttachment[]>([]);
  const [memoryEntries, setMemoryEntries] = useState<MemoryEntryWithAction[]>([]);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [actions, setActions] = useState<Action[]>([]);
  const [neighborhoods, setNeighborhoods] = useState<Neighborhood[]>([]);
  const [calendarEvents, setCalendarEvents] = useState<TeamCalendarEvent[]>([]);
  const [currentProfile, setCurrentProfile] = useState<Pick<Profile, "id" | "role"> | null>(null);
  const [formValues, setFormValues] = useState<ReportFormValues>(defaultReportValues);
  const [selectedActionIds, setSelectedActionIds] = useState<string[]>([]);
  const [selectedNeighborhoodIds, setSelectedNeighborhoodIds] = useState<string[]>([]);
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [memoryValues, setMemoryValues] = useState<MemoryFormValues>(defaultMemoryValues);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [memoryChecklist, setMemoryChecklist] = useState<MemoryChecklistState>(normalizeMemoryChecklist({}));
  const [linkedEventId, setLinkedEventId] = useState(searchParams.get("eventId") ?? "");

  const riskReport = useMemo(() => detectMemoryPrivacyRisks(memoryValues.body + " " + memoryValues.title), [memoryValues.body, memoryValues.title]);
  const canApprovePublic = isMemoryChecklistComplete(memoryChecklist) && !riskReport.hasBlockingRisk;

  const canReview = currentProfile?.role === "admin" || currentProfile?.role === "coordenacao";
  const linkedTeamMember = teamMembers.find((member) => member.profile_id === currentProfile?.id);
  const isOwner = Boolean(report && currentProfile?.id && (report.created_by === currentProfile.id || report.profile_id === currentProfile.id));
  const canEditReport = !report ? true : canReview || (isOwner && ["draft", "needs_changes"].includes(report.status));

  const queryEventId = searchParams.get("eventId") ?? "";
  const queryActionId = searchParams.get("actionId") ?? "";

  useEffect(() => {
    let ignore = false;

    async function loadWorkspace() {
      if (!supabase) {
        setError("Configure NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_ANON_KEY para usar a memória do projeto.");
        setLoading(false);
        return;
      }

      const userResult = await supabase.auth.getUser();
      const userId = userResult.data.user?.id;

      const [profileResult, teamMembersResult, actionsResult, neighborhoodsResult, calendarEventsResult] = await Promise.all([
        userId ? supabase.from("profiles").select("id, role").eq("id", userId).maybeSingle() : Promise.resolve({ data: null, error: null }),
        supabase.from("team_members").select("*").eq("active", true).order("display_name", { ascending: true }),
        supabase.from("actions").select("*").order("action_date", { ascending: false }),
        supabase.from("neighborhoods").select("*").order("name", { ascending: true }),
        supabase.from("team_calendar_events").select("*").order("starts_at", { ascending: false }),
      ]);

      if (ignore) return;

      if (profileResult.error || teamMembersResult.error || actionsResult.error || neighborhoodsResult.error || calendarEventsResult.error) {
        setError(profileResult.error?.message ?? teamMembersResult.error?.message ?? actionsResult.error?.message ?? neighborhoodsResult.error?.message ?? calendarEventsResult.error?.message ?? "Erro ao carregar formulário da memória.");
        setLoading(false);
        return;
      }

      const loadedProfile = (profileResult.data ?? null) as Pick<Profile, "id" | "role"> | null;
      const loadedMembers = (teamMembersResult.data ?? []) as TeamMember[];
      const loadedActions = (actionsResult.data ?? []) as Action[];
      const loadedNeighborhoods = (neighborhoodsResult.data ?? []) as Neighborhood[];

      setCurrentProfile(loadedProfile);
      setTeamMembers(loadedMembers);
      setActions(loadedActions);
      setNeighborhoods(loadedNeighborhoods);
      setCalendarEvents((calendarEventsResult.data ?? []) as TeamCalendarEvent[]);

      if (!reportId) {
        const defaultTeamMember = loadedMembers.find((member) => member.profile_id === loadedProfile?.id);
        if (defaultTeamMember) {
          setFormValues((current) => ({ ...current, team_member_id: defaultTeamMember.id }));
        }
        if (queryActionId) {
          setSelectedActionIds([queryActionId]);
          setMemoryValues((current) => ({ ...current, action_id: queryActionId }));
        }
        if (queryEventId) {
          setLinkedEventId(queryEventId);
        }
        setLoading(false);
        return;
      }

      const [reportResult, reportActionsResult, reportNeighborhoodsResult, attachmentsResult, memoryEntriesResult] = await Promise.all([
        supabase.from("weekly_team_reports").select("*").eq("id", reportId).single(),
        supabase.from("weekly_team_report_actions").select("action_id, actions:action_id(id, title, action_date, neighborhood_id)").eq("report_id", reportId),
        supabase.from("weekly_team_report_neighborhoods").select("neighborhood_id, neighborhoods:neighborhood_id(id, name)").eq("report_id", reportId),
        supabase.from("weekly_team_report_attachments").select("*").eq("report_id", reportId).order("uploaded_at", { ascending: false }),
        supabase.from("project_memory_entries").select("*, actions:action_id(id, title)").eq("source_report_id", reportId).order("entry_date", { ascending: false }).order("created_at", { ascending: false }),
      ]);

      if (ignore) return;

      if (reportResult.error || reportActionsResult.error || reportNeighborhoodsResult.error || attachmentsResult.error || memoryEntriesResult.error) {
        setError(reportResult.error?.message ?? reportActionsResult.error?.message ?? reportNeighborhoodsResult.error?.message ?? attachmentsResult.error?.message ?? memoryEntriesResult.error?.message ?? "Erro ao carregar relatório semanal.");
        setLoading(false);
        return;
      }

      const loadedReport = reportResult.data as WeeklyTeamReport;
      const linkedActions = (reportActionsResult.data ?? []) as unknown as ReportActionLink[];
      const linkedNeighborhoods = (reportNeighborhoodsResult.data ?? []) as unknown as ReportNeighborhoodLink[];
      const linkedEntries = (memoryEntriesResult.data ?? []) as unknown as MemoryEntryWithAction[];

      setReport(loadedReport);
      setReportActions(linkedActions);
      setReportNeighborhoods(linkedNeighborhoods);
      setAttachments((attachmentsResult.data ?? []) as WeeklyTeamReportAttachment[]);
      setMemoryEntries(linkedEntries);
      setSelectedActionIds(linkedActions.map((item) => item.action_id));
      setSelectedNeighborhoodIds(linkedNeighborhoods.map((item) => item.neighborhood_id));
      setFormValues({
        week_start: loadedReport.week_start,
        week_end: loadedReport.week_end,
        team_member_id: loadedReport.team_member_id,
        title: loadedReport.title,
        summary: loadedReport.summary ?? "",
        activities_done: loadedReport.activities_done ?? "",
        territories_involved: loadedReport.territories_involved ?? "",
        problems_found: loadedReport.problems_found ?? "",
        learnings: loadedReport.learnings ?? "",
        pending_items: loadedReport.pending_items ?? "",
        next_steps: loadedReport.next_steps ?? "",
        review_notes: loadedReport.review_notes ?? "",
      });
      setLinkedEventId(loadedReport.team_calendar_event_id ?? queryEventId);
      setMemoryValues((current) => ({
        ...current,
        entry_date: loadedReport.week_end,
        action_id: linkedActions[0]?.action_id ?? current.action_id,
      }));
      setLoading(false);
    }

    void loadWorkspace();
    return () => {
      ignore = true;
    };
  }, [queryActionId, queryEventId, reportId, supabase]);

  async function saveReport() {
    if (!supabase || !currentProfile?.id) return;

    setSaving(true);
    setError(null);
    setFeedback(null);

    if (!formValues.title.trim()) {
      setError("Informe um título para o relatório semanal.");
      setSaving(false);
      return;
    }

    if (!formValues.team_member_id) {
      setError("Selecione o membro da equipe responsável pelo relatório.");
      setSaving(false);
      return;
    }

    if (formValues.week_end < formValues.week_start) {
      setError("A semana final não pode ser anterior ao início da semana.");
      setSaving(false);
      return;
    }

    const selectedMember = teamMembers.find((member) => member.id === formValues.team_member_id);
    const profileId = currentProfile.role === "equipe" ? currentProfile.id : selectedMember?.profile_id ?? null;
    const payload = {
      week_start: formValues.week_start,
      week_end: formValues.week_end,
      team_member_id: formValues.team_member_id,
      profile_id: profileId,
      title: formValues.title.trim(),
      summary: nullableText(formValues.summary),
      activities_done: nullableText(formValues.activities_done),
      territories_involved: nullableText(formValues.territories_involved),
      problems_found: nullableText(formValues.problems_found),
      learnings: nullableText(formValues.learnings),
      pending_items: nullableText(formValues.pending_items),
      next_steps: nullableText(formValues.next_steps),
      review_notes: canReview ? nullableText(formValues.review_notes) : null,
      team_calendar_event_id: linkedEventId || null,
    };

    const result = report
      ? await supabase.from("weekly_team_reports").update(payload).eq("id", report.id).select("*").single()
      : await supabase.from("weekly_team_reports").insert({ ...payload, status: "draft", created_by: currentProfile.id }).select("*").single();

    if (result.error) {
      setError(result.error.message);
      setSaving(false);
      return;
    }

    const savedReport = result.data as WeeklyTeamReport;
    const linksOk = await syncLinks(savedReport.id);
    if (!linksOk) {
      setSaving(false);
      return;
    }

    if (pendingFiles.length > 0) {
      const uploadOk = await uploadFiles(savedReport.id, pendingFiles);
      if (!uploadOk) {
        setSaving(false);
        return;
      }
    }

    setReport(savedReport);
    setFeedback(report ? "Relatório semanal atualizado." : "Relatório semanal criado.");
    setSaving(false);

    if (!report) {
      router.push(`/memoria/${savedReport.id}`);
      router.refresh();
    }
  }

  async function syncLinks(savedReportId: string) {
    if (!supabase || !currentProfile?.id) return false;

    const [deleteActionsResult, deleteNeighborhoodsResult] = await Promise.all([
      supabase.from("weekly_team_report_actions").delete().eq("report_id", savedReportId),
      supabase.from("weekly_team_report_neighborhoods").delete().eq("report_id", savedReportId),
    ]);

    if (deleteActionsResult.error || deleteNeighborhoodsResult.error) {
      setError(deleteActionsResult.error?.message ?? deleteNeighborhoodsResult.error?.message ?? "Erro ao sincronizar vínculos do relatório.");
      return false;
    }

    if (selectedActionIds.length > 0) {
      const insertActionsResult = await supabase.from("weekly_team_report_actions").insert(
        selectedActionIds.map((actionId) => ({ report_id: savedReportId, action_id: actionId, created_by: currentProfile.id }))
      );

      if (insertActionsResult.error) {
        setError(insertActionsResult.error.message);
        return false;
      }
    }

    if (selectedNeighborhoodIds.length > 0) {
      const insertNeighborhoodsResult = await supabase.from("weekly_team_report_neighborhoods").insert(
        selectedNeighborhoodIds.map((neighborhoodId) => ({ report_id: savedReportId, neighborhood_id: neighborhoodId, created_by: currentProfile.id }))
      );

      if (insertNeighborhoodsResult.error) {
        setError(insertNeighborhoodsResult.error.message);
        return false;
      }
    }

    setReportActions(
      actions
        .filter((action) => selectedActionIds.includes(action.id))
        .map((action) => ({ action_id: action.id, actions: { id: action.id, title: action.title, action_date: action.action_date, neighborhood_id: action.neighborhood_id } }))
    );
    setReportNeighborhoods(
      neighborhoods
        .filter((neighborhood) => selectedNeighborhoodIds.includes(neighborhood.id))
        .map((neighborhood) => ({ neighborhood_id: neighborhood.id, neighborhoods: { id: neighborhood.id, name: neighborhood.name } }))
    );

    return true;
  }

  async function uploadFiles(savedReportId: string, files: File[]) {
    if (!supabase || !currentProfile?.id) return false;

    setUploading(true);

    for (const file of files) {
      const validation = validateProjectMemoryFile(file);
      if (validation) {
        setError(validation);
        setUploading(false);
        return false;
      }

      const safeFileName = `${Date.now()}-${sanitizeUploadFileName(file.name)}`;
      const storagePath = `${savedReportId}/${safeFileName}`;
      const uploadResult = await supabase.storage.from("project-memory-documents").upload(storagePath, file, { upsert: false, contentType: file.type || undefined });

      if (uploadResult.error) {
        setError(uploadResult.error.message);
        setUploading(false);
        return false;
      }

      const attachmentResult = await supabase.from("weekly_team_report_attachments").insert({
        report_id: savedReportId,
        storage_path: storagePath,
        file_name: file.name,
        file_type: file.type || null,
        file_size: file.size,
        uploaded_by: currentProfile.id,
      }).select("*").single();

      if (attachmentResult.error) {
        setError(attachmentResult.error.message);
        setUploading(false);
        return false;
      }

      setAttachments((current) => [attachmentResult.data as WeeklyTeamReportAttachment, ...current]);
    }

    setPendingFiles([]);
    setUploading(false);
    return true;
  }

  async function changeStatus(nextStatus: WeeklyTeamReportStatus) {
    if (!supabase || !report || !currentProfile?.id) return;

    setSubmitting(true);
    setError(null);
    setFeedback(null);

    const payload: {
      status: WeeklyTeamReportStatus;
      review_notes?: string | null;
      reviewed_by?: string | null;
      reviewed_at?: string | null;
    } = {
      status: nextStatus,
    };

    if (canReview) {
      payload.review_notes = nullableText(formValues.review_notes);
      payload.reviewed_by = currentProfile.id;
      payload.reviewed_at = new Date().toISOString();
    } else {
      payload.reviewed_by = null;
      payload.reviewed_at = null;
    }

    const result = await supabase.from("weekly_team_reports").update(payload).eq("id", report.id).select("*").single();

    if (result.error) {
      setError(result.error.message);
      setSubmitting(false);
      return;
    }

    const updated = result.data as WeeklyTeamReport;
    setReport(updated);
    setFormValues((current) => ({ ...current, review_notes: updated.review_notes ?? current.review_notes }));
    setFeedback(`Relatório marcado como ${getWeeklyReportStatusLabel(nextStatus).toLocaleLowerCase("pt-BR")}.`);
    setSubmitting(false);
  }

  async function createMemoryEntry() {
    if (!supabase || !report || !currentProfile?.id) return;

    setSubmitting(true);
    setError(null);
    setFeedback(null);

    if (!memoryValues.title.trim() || !memoryValues.body.trim()) {
      setError("Preencha título e corpo da entrada de memória.");
      setSubmitting(false);
      return;
    }

    const visibility = canReview ? memoryValues.visibility : "internal";
    const result = await supabase.from("project_memory_entries").insert({
      source_report_id: report.id,
      entry_date: memoryValues.entry_date,
      title: memoryValues.title.trim(),
      body: memoryValues.body.trim(),
      memory_type: memoryValues.memory_type,
      visibility,
      action_id: memoryValues.action_id || null,
      team_calendar_event_id: linkedEventId || null,
      created_by: currentProfile.id,
      review_checklist: memoryChecklist as any,
    }).select("*, actions:action_id(id, title)").single();

    if (result.error) {
      setError(result.error.message);
      setSubmitting(false);
      return;
    }

    setMemoryEntries((current) => [result.data as unknown as MemoryEntryWithAction, ...current]);
    setMemoryValues({
      entry_date: report.week_end,
      title: "",
      body: "",
      memory_type: "atividade",
      visibility: "internal",
      action_id: selectedActionIds[0] ?? "",
    });
    setMemoryChecklist(normalizeMemoryChecklist({}));
    setFeedback("Entrada de memória criada.");
    setSubmitting(false);
  }

  async function downloadAttachment(attachment: WeeklyTeamReportAttachment) {
    if (!supabase) return;
    setError(null);
    const result = await supabase.storage.from("project-memory-documents").createSignedUrl(attachment.storage_path, 60);
    if (result.error) {
      setError(result.error.message);
      return;
    }
    window.open(result.data.signedUrl, "_blank", "noopener,noreferrer");
  }

  function handleFileSelection(event: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? []);
    const nextErrors = files.map(validateProjectMemoryFile).filter(Boolean) as string[];
    if (nextErrors.length > 0) {
      setError(nextErrors[0]);
      return;
    }
    setPendingFiles((current) => [...current, ...files]);
    event.target.value = "";
  }

  function toggleSelection(list: string[], value: string, setter: (values: string[]) => void) {
    setter(list.includes(value) ? list.filter((item) => item !== value) : [...list, value]);
  }

  if (loading) {
    return <StateBox>Carregando relatório semanal...</StateBox>;
  }

  if (!reportId && currentProfile?.role === "equipe" && !linkedTeamMember) {
    return (
      <StateBox tone="error">
        Seu perfil ainda não está vinculado a um cadastro em <strong>team_members</strong>. Peça para a coordenação abrir <strong>/equipe</strong> e associar seu <strong>profile</strong> antes de enviar relatório semanal.
      </StateBox>
    );
  }

  return (
    <section className="pb-10">
      <div className="mb-5 flex flex-wrap gap-3">
        <Link className="inline-flex min-h-11 items-center justify-center rounded-full border border-semear-green/15 bg-white px-4 text-sm font-semibold text-semear-green" href="/memoria">
          Voltar para memória
        </Link>
        {report ? <span className="inline-flex min-h-11 items-center rounded-full bg-semear-green-soft px-4 text-sm font-semibold text-semear-green">Status: {getWeeklyReportStatusLabel(report.status)}</span> : null}
      </div>

      <header className="rounded-[2rem] border border-white/80 bg-white/78 p-6 shadow-soft sm:p-8">
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-semear-earth">Memória do Projeto</p>
        <h2 className="mt-3 text-4xl font-semibold tracking-tight text-semear-green">{report ? report.title : "Novo relatório semanal"}</h2>
        <p className="mt-4 max-w-4xl text-sm leading-6 text-stone-600">
          Este relatório ajuda a construir a memória do projeto e apoiar a prestação de contas. Não inclua CPF, telefone, endereço pessoal ou dados sensíveis de entrevistados.
        </p>
      </header>

      {error ? <StateBox tone="error">{error}</StateBox> : null}
      {feedback ? <StateBox>{feedback}</StateBox> : null}

      <div className="mt-5 grid gap-5 xl:grid-cols-[1.05fr_0.95fr]">
        <section className="rounded-[2rem] border border-white/80 bg-white p-5 shadow-soft">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-full bg-semear-green-soft text-semear-green">
              <FileText className="h-5 w-5" aria-hidden="true" />
            </div>
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-semear-earth">Conteúdo do relatório</p>
              <h3 className="text-2xl font-semibold text-semear-green">Semana de referência e registro interno</h3>
            </div>
          </div>

          <div className="mt-5 grid gap-4 md:grid-cols-2">
            <Field label="Início da semana">
              <input className={inputClassName} type="date" value={formValues.week_start} onChange={(event) => setFormValues((current) => ({ ...current, week_start: event.target.value, week_end: getEndOfWeekIso(event.target.value) }))} disabled={!canEditReport} />
            </Field>
            <Field label="Fim da semana">
              <input className={inputClassName} type="date" value={formValues.week_end} onChange={(event) => setFormValues((current) => ({ ...current, week_end: event.target.value }))} disabled={!canEditReport} />
            </Field>
          </div>

          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <Field label="Membro da equipe">
              <select className={inputClassName} value={formValues.team_member_id} onChange={(event) => setFormValues((current) => ({ ...current, team_member_id: event.target.value }))} disabled={!canEditReport || currentProfile?.role === "equipe"}>
                <option value="">Selecione</option>
                {teamMembers.map((member) => (
                  <option key={member.id} value={member.id}>{member.display_name}{member.role_label ? ` · ${member.role_label}` : ""}</option>
                ))}
              </select>
            </Field>

            <Field label="Título">
              <input className={inputClassName} value={formValues.title} onChange={(event) => setFormValues((current) => ({ ...current, title: event.target.value }))} disabled={!canEditReport} placeholder="Ex.: Semana de preparação da banca" />
            </Field>
          </div>

          <Field className="mt-4" label="Resumo">
            <textarea className={textareaClassName} value={formValues.summary} onChange={(event) => setFormValues((current) => ({ ...current, summary: event.target.value }))} disabled={!canEditReport} />
          </Field>

          <Field className="mt-4" label="Atividades realizadas">
            <textarea className={textareaClassName} value={formValues.activities_done} onChange={(event) => setFormValues((current) => ({ ...current, activities_done: event.target.value }))} disabled={!canEditReport} />
          </Field>

          <Field className="mt-4" label="Territórios envolvidos (texto livre complementar)">
            <textarea className={textareaClassName} value={formValues.territories_involved} onChange={(event) => setFormValues((current) => ({ ...current, territories_involved: event.target.value }))} disabled={!canEditReport} />
          </Field>

          <Field className="mt-4" label="Problemas encontrados">
            <textarea className={textareaClassName} value={formValues.problems_found} onChange={(event) => setFormValues((current) => ({ ...current, problems_found: event.target.value }))} disabled={!canEditReport} />
          </Field>

          <Field className="mt-4" label="Aprendizados">
            <textarea className={textareaClassName} value={formValues.learnings} onChange={(event) => setFormValues((current) => ({ ...current, learnings: event.target.value }))} disabled={!canEditReport} />
          </Field>

          <Field className="mt-4" label="Pendências">
            <textarea className={textareaClassName} value={formValues.pending_items} onChange={(event) => setFormValues((current) => ({ ...current, pending_items: event.target.value }))} disabled={!canEditReport} />
          </Field>

          <Field className="mt-4" label="Próximos passos">
            <textarea className={textareaClassName} value={formValues.next_steps} onChange={(event) => setFormValues((current) => ({ ...current, next_steps: event.target.value }))} disabled={!canEditReport} />
          </Field>

          <div className="mt-5 grid gap-5 lg:grid-cols-2">
            <SelectionPanel
              title="Ações relacionadas"
              emptyText="Nenhuma ação cadastrada ainda."
              items={actions.map((action) => ({ id: action.id, title: action.title, subtitle: formatDateLabel(action.action_date) }))}
              selectedIds={selectedActionIds}
              onToggle={(value) => toggleSelection(selectedActionIds, value, setSelectedActionIds)}
              disabled={!canEditReport}
            />
            <SelectionPanel
              title="Territórios vinculados"
              emptyText="Nenhum território disponível."
              items={neighborhoods.map((neighborhood) => ({ id: neighborhood.id, title: neighborhood.name }))}
              selectedIds={selectedNeighborhoodIds}
              onToggle={(value) => toggleSelection(selectedNeighborhoodIds, value, setSelectedNeighborhoodIds)}
              disabled={!canEditReport}
            />
          </div>

          <Field className="mt-5" label="Evento da agenda (opcional)">
            <select className={inputClassName} value={linkedEventId} onChange={(event) => setLinkedEventId(event.target.value)} disabled={!canEditReport}>
              <option value="">Sem evento vinculado</option>
              {calendarEvents.map((calendarEvent) => (
                <option key={calendarEvent.id} value={calendarEvent.id}>{calendarEvent.title}</option>
              ))}
            </select>
          </Field>

          <div className="mt-5 flex flex-wrap gap-3">
            {canEditReport ? (
              <button className="inline-flex min-h-11 items-center gap-2 rounded-full bg-semear-green px-4 text-sm font-semibold text-white disabled:opacity-60" onClick={() => void saveReport()} type="button" disabled={saving || uploading || submitting}>
                <Save className="h-4 w-4" aria-hidden="true" />
                {saving ? "Salvando..." : report ? "Salvar alterações" : "Criar relatório"}
              </button>
            ) : null}
            {report && !canReview && isOwner && ["draft", "needs_changes"].includes(report.status) ? (
              <button className="inline-flex min-h-11 items-center gap-2 rounded-full border border-semear-green/15 bg-white px-4 text-sm font-semibold text-semear-green disabled:opacity-60" onClick={() => void changeStatus("submitted")} type="button" disabled={saving || uploading || submitting}>
                <Send className="h-4 w-4" aria-hidden="true" />
                Enviar para revisão
              </button>
            ) : null}
          </div>
        </section>

        <section className="space-y-5">
          <section className="rounded-[2rem] border border-white/80 bg-white p-5 shadow-soft">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-full bg-semear-green-soft text-semear-green">
                <Upload className="h-5 w-5" aria-hidden="true" />
              </div>
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.18em] text-semear-earth">Anexos privados</p>
                <h3 className="text-xl font-semibold text-semear-green">Documentos de apoio</h3>
              </div>
            </div>
            <p className="mt-3 text-sm leading-6 text-stone-600">Permitidos: {projectMemoryAcceptedExtensions.join(", ").toUpperCase()}. Limite padrão: {formatFileSize(projectMemoryMaxFileSizeBytes)}. Os arquivos ficam no bucket privado <strong>project-memory-documents</strong>.</p>

            {report && canEditReport ? (
              <div className="mt-4 rounded-2xl border border-dashed border-semear-green/25 bg-semear-offwhite p-4">
                <label className="inline-flex min-h-11 cursor-pointer items-center justify-center rounded-full border border-semear-green/15 bg-white px-4 text-sm font-semibold text-semear-green">
                  <input className="hidden" type="file" multiple onChange={handleFileSelection} />
                  Selecionar arquivos
                </label>
                {pendingFiles.length > 0 ? (
                  <div className="mt-3 space-y-2 text-sm text-stone-700">
                    {pendingFiles.map((file) => (
                      <div className="rounded-xl bg-white px-3 py-2" key={`${file.name}-${file.size}`}>{file.name} · {formatFileSize(file.size)}</div>
                    ))}
                    <button className="inline-flex min-h-10 items-center gap-2 rounded-full bg-semear-green px-4 text-sm font-semibold text-white disabled:opacity-60" type="button" onClick={() => void uploadFiles(report.id, pendingFiles)} disabled={uploading}>
                      <Upload className="h-4 w-4" aria-hidden="true" />
                      {uploading ? "Enviando..." : "Enviar anexos"}
                    </button>
                  </div>
                ) : null}
              </div>
            ) : null}

            <div className="mt-4 space-y-3">
              {attachments.map((attachment) => (
                <article className="rounded-2xl border border-semear-gray bg-semear-offwhite p-4" key={attachment.id}>
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <h4 className="font-semibold text-semear-green">{attachment.file_name}</h4>
                      <p className="mt-1 text-xs text-stone-500">{attachment.file_type ?? "tipo não informado"} · {attachment.file_size ? formatFileSize(attachment.file_size) : "tamanho não informado"} · enviado em {new Date(attachment.uploaded_at).toLocaleString("pt-BR")}</p>
                    </div>
                    <button className="inline-flex min-h-10 items-center gap-2 rounded-full border border-semear-green/15 bg-white px-4 text-sm font-semibold text-semear-green" onClick={() => void downloadAttachment(attachment)} type="button">
                      <Download className="h-4 w-4" aria-hidden="true" />
                      Link temporário
                    </button>
                  </div>
                </article>
              ))}
              {attachments.length === 0 ? <EmptyBox text="Nenhum anexo enviado ainda." /> : null}
            </div>
          </section>

          <section className="rounded-[2rem] border border-white/80 bg-white p-5 shadow-soft">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-full bg-semear-green-soft text-semear-green">
                <ShieldCheck className="h-5 w-5" aria-hidden="true" />
              </div>
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.18em] text-semear-earth">Revisão interna</p>
                <h3 className="text-xl font-semibold text-semear-green">Status, notas e histórico simples</h3>
              </div>
            </div>

            <div className="mt-4 rounded-2xl border border-semear-gray bg-semear-offwhite p-4 text-sm text-stone-700">
              <p><strong>Semana:</strong> {formatWeekLabel(formValues.week_start, formValues.week_end)}</p>
              {report ? <p className="mt-2"><strong>Criado em:</strong> {new Date(report.created_at).toLocaleString("pt-BR")}</p> : null}
              {report ? <p className="mt-2"><strong>Última atualização:</strong> {new Date(report.updated_at).toLocaleString("pt-BR")}</p> : null}
              {report?.reviewed_at ? <p className="mt-2"><strong>Última revisão:</strong> {new Date(report.reviewed_at).toLocaleString("pt-BR")}</p> : null}
            </div>

            <Field className="mt-4" label="Notas de revisão">
              <textarea className={textareaClassName} value={formValues.review_notes} onChange={(event) => setFormValues((current) => ({ ...current, review_notes: event.target.value }))} disabled={!canReview} placeholder="Use este campo para orientar ajustes, registrar aprovação ou justificar arquivamento." />
            </Field>

            {report && canReview ? (
              <div className="mt-4 grid gap-2 sm:grid-cols-2">
                {report.status === "submitted" ? (
                  <ActionButton label="Marcar em revisão" icon={<FileText className="h-4 w-4" />} onClick={() => void changeStatus("in_review")} disabled={submitting} />
                ) : null}
                {report.status !== "approved" ? (
                  <ActionButton label="Aprovar" icon={<CheckCircle2 className="h-4 w-4" />} onClick={() => void changeStatus("approved")} disabled={submitting} />
                ) : null}
                {report.status !== "needs_changes" ? (
                  <ActionButton label="Pedir ajustes" icon={<Send className="h-4 w-4" />} onClick={() => void changeStatus("needs_changes")} disabled={submitting} tone="secondary" />
                ) : null}
                {report.status !== "archived" ? (
                  <ActionButton label="Arquivar" icon={<Archive className="h-4 w-4" />} onClick={() => void changeStatus("archived")} disabled={submitting} tone="secondary" />
                ) : null}
              </div>
            ) : null}
          </section>

          {report?.status === "approved" ? (
            <section className="rounded-[2rem] border border-white/80 bg-white p-5 shadow-soft">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-full bg-semear-green-soft text-semear-green">
                  <MapPinned className="h-5 w-5" aria-hidden="true" />
                </div>
                <div>
                  <p className="text-sm font-semibold uppercase tracking-[0.18em] text-semear-earth">Memória do projeto</p>
                  <h3 className="text-xl font-semibold text-semear-green">Gerar entradas de memória a partir do relatório aprovado</h3>
                </div>
              </div>

              <div className="mt-4 grid gap-4 md:grid-cols-2">
                <Field label="Data da entrada">
                  <input className={inputClassName} type="date" value={memoryValues.entry_date} onChange={(event) => setMemoryValues((current) => ({ ...current, entry_date: event.target.value }))} />
                </Field>
                <Field label="Tipo">
                  <select className={inputClassName} value={memoryValues.memory_type} onChange={(event) => setMemoryValues((current) => ({ ...current, memory_type: event.target.value as ProjectMemoryType }))}>
                    {projectMemoryTypeOptions.map((option) => (
                      <option key={option.value} value={option.value}>{option.label}</option>
                    ))}
                  </select>
                </Field>
              </div>

              <Field className="mt-4" label="Título da entrada">
                <input className={inputClassName} value={memoryValues.title} onChange={(event) => setMemoryValues((current) => ({ ...current, title: event.target.value }))} placeholder="Ex.: Primeira banca na Vila Santa Cecília" />
              </Field>

              <Field className="mt-4" label="Corpo">
                <textarea className={textareaClassName} value={memoryValues.body} onChange={(event) => setMemoryValues((current) => ({ ...current, body: event.target.value }))} placeholder="Descreva a atividade, decisão, problema ou aprendizado que merece entrar na linha do tempo do projeto." />
              </Field>

              <div className="mt-4 grid gap-4 md:grid-cols-2">
                <Field label="Ação vinculada (opcional)">
                  <select className={inputClassName} value={memoryValues.action_id} onChange={(event) => setMemoryValues((current) => ({ ...current, action_id: event.target.value }))}>
                    <option value="">Sem ação vinculada</option>
                    {reportActions.map((actionLink) => (
                      <option key={actionLink.action_id} value={actionLink.action_id}>{actionLink.actions?.title ?? actionLink.action_id}</option>
                    ))}
                  </select>
                </Field>
                <Field label="Visibilidade">
                  <select className={inputClassName} value={memoryValues.visibility} onChange={(event) => setMemoryValues((current) => ({ ...current, visibility: event.target.value as ProjectMemoryVisibility }))} disabled={!canReview}>
                    {projectMemoryVisibilityOptions
                      .filter((option) => canReview || option.value === "internal")
                      .map((option) => (
                        <option key={option.value} value={option.value}>{option.label}</option>
                      ))}
                  </select>
                </Field>
              </div>

              <div className="mt-6 grid gap-6 lg:grid-cols-2">
                <div className="space-y-4">
                  <section className="rounded-2xl border border-white/80 bg-stone-50 p-5 shadow-sm">
                    <h4 className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-semear-green">
                      <ShieldAlert className="h-4 w-4" />
                      Análise de Privacidade
                    </h4>
                    <div className="mt-4 space-y-3">
                      {riskReport.blockers.length === 0 && riskReport.warnings.length === 0 && (
                        <div className="text-xs text-stone-500 italic">Nenhum risco detectado no texto atual.</div>
                      )}
                      {riskReport.blockers.map((risk, idx) => (
                        <div key={idx} className="rounded-xl bg-red-50 p-3 text-[11px] font-medium text-red-800">
                          <strong>{risk.key.toUpperCase()}:</strong> {risk.message}
                        </div>
                      ))}
                      {riskReport.warnings.map((risk, idx) => (
                        <div key={idx} className="rounded-xl bg-amber-50 p-3 text-[11px] font-medium text-amber-800">
                          <strong>{risk.key.toUpperCase()}:</strong> {risk.message}
                        </div>
                      ))}
                    </div>
                  </section>

                  <button 
                    className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-full bg-semear-green px-6 text-sm font-bold text-white shadow-soft transition hover:bg-semear-green/90 disabled:opacity-50" 
                    type="button" 
                    onClick={() => void createMemoryEntry()} 
                    disabled={submitting || (memoryValues.visibility === "public_approved" && !canApprovePublic)}
                  >
                    <Save className="h-4 w-4" aria-hidden="true" />
                    {submitting ? "Criando..." : "Criar entrada de memória"}
                  </button>
                  
                  {memoryValues.visibility === "public_approved" && !canApprovePublic && (
                    <div className="flex gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3 text-[11px] leading-4 text-amber-900">
                      <AlertTriangle className="h-4 w-4 shrink-0" />
                      Aprovação pública bloqueada. Verifique riscos e complete o checklist.
                    </div>
                  )}
                </div>

                <MemoryEntryPrivacyChecklist 
                  checklist={memoryChecklist}
                  onChange={(key, val) => setMemoryChecklist(c => ({ ...c, [key]: val }))}
                />
              </div>

              <div className="mt-5 space-y-3">
                {memoryEntries.map((entry) => (
                  <article className="rounded-2xl border border-semear-gray bg-semear-offwhite p-4" key={entry.id}>
                    <div className="flex flex-wrap items-center gap-2 text-xs text-stone-500">
                      <span className="rounded-full bg-white px-3 py-1 font-semibold uppercase tracking-[0.12em] text-semear-earth">{getProjectMemoryTypeLabel(entry.memory_type)}</span>
                      <span>{formatDateLabel(entry.entry_date)}</span>
                      <span>{getProjectMemoryVisibilityLabel(entry.visibility)}</span>
                    </div>
                    <h4 className="mt-3 font-semibold text-semear-green">{entry.title}</h4>
                    <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-stone-700">{entry.body}</p>
                    {entry.actions ? <p className="mt-2 text-xs text-stone-500">Ação vinculada: {entry.actions.title}</p> : null}
                  </article>
                ))}
                {memoryEntries.length === 0 ? <EmptyBox text="Nenhuma entrada de memória gerada a partir deste relatório ainda." /> : null}
              </div>
            </section>
          ) : null}
        </section>
      </div>
    </section>
  );
}

function nullableText(value: string) {
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

function Field({ label, children, className = "" }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <label className={`block ${className}`}>
      <span className="text-sm font-semibold text-semear-green">{label}</span>
      <div className="mt-2">{children}</div>
    </label>
  );
}

function SelectionPanel({
  title,
  items,
  selectedIds,
  onToggle,
  emptyText,
  disabled,
}: {
  title: string;
  items: Array<{ id: string; title: string; subtitle?: string | null }>;
  selectedIds: string[];
  onToggle: (value: string) => void;
  emptyText: string;
  disabled: boolean;
}) {
  return (
    <section className="rounded-2xl border border-semear-gray bg-semear-offwhite p-4">
      <h4 className="font-semibold text-semear-green">{title}</h4>
      {items.length > 0 ? (
        <div className="mt-3 space-y-2">
          {items.map((item) => (
            <label className="flex items-start gap-3 rounded-xl bg-white px-3 py-2 text-sm text-stone-700" key={item.id}>
              <input checked={selectedIds.includes(item.id)} disabled={disabled} onChange={() => onToggle(item.id)} type="checkbox" />
              <span>
                <span className="block font-medium text-semear-green">{item.title}</span>
                {item.subtitle ? <span className="text-xs text-stone-500">{item.subtitle}</span> : null}
              </span>
            </label>
          ))}
        </div>
      ) : (
        <p className="mt-3 text-sm text-stone-500">{emptyText}</p>
      )}
    </section>
  );
}

function ActionButton({ label, icon, onClick, disabled, tone = "primary" }: { label: string; icon: React.ReactNode; onClick: () => void; disabled: boolean; tone?: "primary" | "secondary" }) {
  return (
    <button
      className={`inline-flex min-h-11 items-center justify-center gap-2 rounded-full px-4 text-sm font-semibold disabled:opacity-60 ${tone === "primary" ? "bg-semear-green text-white" : "border border-semear-green/15 bg-white text-semear-green"}`}
      onClick={onClick}
      type="button"
      disabled={disabled}
    >
      {icon}
      {label}
    </button>
  );
}

function EmptyBox({ text }: { text: string }) {
  return <div className="rounded-2xl border border-dashed border-semear-green/20 bg-white px-4 py-5 text-sm text-stone-500">{text}</div>;
}

function StateBox({ children, tone = "neutral" }: { children: React.ReactNode; tone?: "neutral" | "error" }) {
  return <div className={`rounded-[1.5rem] p-6 text-sm shadow-soft ${tone === "error" ? "border border-red-200 bg-red-50 text-red-800" : "border border-white/80 bg-white/72 text-stone-600"}`}>{children}</div>;
}

const inputClassName = "min-h-11 w-full rounded-2xl border border-semear-gray bg-white px-3 text-sm outline-none focus:border-semear-green";
const textareaClassName = "min-h-28 w-full rounded-2xl border border-semear-gray bg-white px-3 py-2 text-sm outline-none focus:border-semear-green";
