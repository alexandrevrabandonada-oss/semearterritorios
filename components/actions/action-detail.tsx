"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { AlertTriangle, ArrowLeft, CalendarDays, ClipboardList, Edit3, FileText, FlaskConical, FolderCheck, MapPin, UsersRound } from "lucide-react";
import { ActionForm } from "@/components/actions/action-form";
import { ActionOperationChecklist } from "@/components/actions/action-operation-checklist";
import { ActionReadinessPanel } from "@/components/actions/action-readiness-panel";
import { ActionSynthesis } from "@/components/actions/action-synthesis";
import { InternalRemindersPanel } from "@/components/agenda/internal-reminders-panel";
import { getActionPilotMetrics, type ListeningRecordForPilot } from "@/lib/action-pilot";
import { getClosureStatusLabel } from "@/lib/action-closures";
import type {
  Action,
  ActionClosure,
  ActionDebrief,
  ProjectMemoryEntry,
  ActionStatus,
  ActionTeamMember,
  ActionType,
  Neighborhood,
  TeamMember,
  TeamCalendarEvent,
  WeeklyTeamReport,
  WeeklyTeamReportAttachment,
} from "@/lib/database.types";
import { getActionStatusLabel, getActionTypeLabel } from "@/lib/actions";
import { getActionScheduleLabel, getGoogleCalendarSyncStatusLabel, getSuggestedActionEventEnd, getSuggestedActionEventStart } from "@/lib/team-calendar";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";

type ActionWithNeighborhood = Action & {
  neighborhoods: Pick<Neighborhood, "id" | "name"> | null;
};

type ActionDetailProps = {
  actionId: string;
};

type ParticipantWithTeamMember = ActionTeamMember & {
  team_members: Pick<TeamMember, "id" | "display_name" | "role_label"> | null;
};

type LinkedWeeklyReport = WeeklyTeamReport & {
  team_members: Pick<TeamMember, "id" | "display_name"> | null;
};

type MemoryEntryWithReport = ProjectMemoryEntry & {
  weekly_team_reports: Pick<WeeklyTeamReport, "id" | "title"> | null;
};

export function ActionDetail({ actionId }: ActionDetailProps) {
  const supabase = useMemo(() => createBrowserSupabaseClient(), []);
  const [action, setAction] = useState<ActionWithNeighborhood | null>(null);
  const [records, setRecords] = useState<ListeningRecordForPilot[]>([]);
  const [participants, setParticipants] = useState<ParticipantWithTeamMember[]>([]);
  const [debrief, setDebrief] = useState<ActionDebrief | null>(null);
  const [closure, setClosure] = useState<ActionClosure | null>(null);
  const [weeklyReports, setWeeklyReports] = useState<LinkedWeeklyReport[]>([]);
  const [weeklyReportAttachments, setWeeklyReportAttachments] = useState<WeeklyTeamReportAttachment[]>([]);
  const [memoryEntries, setMemoryEntries] = useState<MemoryEntryWithReport[]>([]);
  const [calendarEvents, setCalendarEvents] = useState<TeamCalendarEvent[]>([]);
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let ignore = false;

    async function loadAction() {
      if (!supabase) {
        setError("Configure NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_ANON_KEY para ver ações.");
        setLoading(false);
        return;
      }

      setLoading(true);
      const [result, recordsResult, participantsResult, debriefResult, closureResult, linkedReportsResult, memoryEntriesResult, calendarEventsResult] = await Promise.all([
        supabase
          .from("actions")
          .select("*, neighborhoods:neighborhood_id(id, name)")
          .eq("id", actionId)
          .single(),
        supabase
          .from("listening_records")
          .select("*, listening_record_themes(themes:theme_id(id, name))")
          .eq("action_id", actionId),
        supabase
          .from("action_team_members")
          .select("*, team_members:team_member_id(id, display_name, role_label)")
          .eq("action_id", actionId)
          .order("created_at", { ascending: true }),
        supabase.from("action_debriefs").select("*").eq("action_id", actionId).maybeSingle(),
        supabase.from("action_closures").select("*").eq("action_id", actionId).maybeSingle(),
        supabase.from("weekly_team_report_actions").select("report_id, weekly_team_reports:report_id(*, team_members:team_member_id(id, display_name))").eq("action_id", actionId),
        supabase.from("project_memory_entries").select("*, weekly_team_reports:source_report_id(id, title)").eq("action_id", actionId).order("entry_date", { ascending: false }),
        supabase.from("team_calendar_events").select("*").eq("action_id", actionId).order("starts_at", { ascending: true })
      ]);

      if (ignore) {
        return;
      }

      if (result.error || recordsResult.error || participantsResult.error || debriefResult.error || closureResult.error || linkedReportsResult.error || memoryEntriesResult.error || calendarEventsResult.error) {
        setError(
          result.error?.message ??
            recordsResult.error?.message ??
            participantsResult.error?.message ??
            debriefResult.error?.message ??
            closureResult.error?.message ??
            linkedReportsResult.error?.message ??
            memoryEntriesResult.error?.message ??
            calendarEventsResult.error?.message ??
            "Erro ao carregar ação."
        );
        setLoading(false);
        return;
      }

      setAction(result.data as ActionWithNeighborhood);
      setRecords((recordsResult.data ?? []) as ListeningRecordForPilot[]);
      setParticipants((participantsResult.data ?? []) as ParticipantWithTeamMember[]);
      setDebrief(debriefResult.data as ActionDebrief | null);
      setClosure(closureResult.data as ActionClosure | null);

      const linkedReports = ((linkedReportsResult.data ?? []) as unknown as Array<{ weekly_team_reports: LinkedWeeklyReport | null }>)
        .map((item) => item.weekly_team_reports)
        .filter(Boolean) as LinkedWeeklyReport[];
      setWeeklyReports(linkedReports);
      setMemoryEntries((memoryEntriesResult.data ?? []) as unknown as MemoryEntryWithReport[]);
      setCalendarEvents((calendarEventsResult.data ?? []) as TeamCalendarEvent[]);

      if (linkedReports.length > 0) {
        const attachmentsResult = await supabase.from("weekly_team_report_attachments").select("*").in("report_id", linkedReports.map((item) => item.id)).order("uploaded_at", { ascending: false });
        if (attachmentsResult.error) {
          setError(attachmentsResult.error.message);
          setLoading(false);
          return;
        }
        setWeeklyReportAttachments((attachmentsResult.data ?? []) as WeeklyTeamReportAttachment[]);
      } else {
        setWeeklyReportAttachments([]);
      }

      setLoading(false);
    }

    void loadAction();

    return () => {
      ignore = true;
    };
  }, [actionId, supabase]);

  if (editing) {
    return <ActionForm actionId={actionId} mode="edit" />;
  }

  if (loading) {
    return (
      <section className="rounded-[2rem] border border-white/80 bg-white/72 p-8 shadow-soft">
        <p className="text-sm font-medium text-stone-600">Carregando ação...</p>
      </section>
    );
  }

  if (error || !action) {
    return (
      <section className="rounded-[2rem] border border-red-200 bg-red-50 p-8 text-sm text-red-800">
        {error ?? "Ação não encontrada."}
      </section>
    );
  }

  const detailItems = [
    ["Tipo", getActionTypeLabel(action.action_type as ActionType)],
    ["Status", getActionStatusLabel(action.status as ActionStatus)],
    ["Horário", getActionScheduleLabel(action)],
    ["Local", action.location_reference ?? "Não informado"],
    ["Equipe", action.team ?? "Não informada"],
    ["Público estimado", action.estimated_public?.toString() ?? "Não informado"]
  ];
  const metrics = getActionPilotMetrics(records);
  const reviewedPercent = metrics.total > 0 ? Math.round((metrics.reviewed / metrics.total) * 100) : 0;
  const nextWeek = new Date();
  nextWeek.setDate(nextWeek.getDate() + 7);
  const nextWeekIso = nextWeek.toISOString().slice(0, 10);
  const hasDebriefEvent = calendarEvents.some((event) => event.event_type === "devolutiva");
  const hasDossierEvent = calendarEvents.some((event) => event.event_type === "dossie");
  const hasReviewEvent = calendarEvents.some((event) => event.event_type === "reuniao" || event.event_type === "prazo");
  const suggestedEventStart = getSuggestedActionEventStart(action);
  const suggestedEventEnd = getSuggestedActionEventEnd(action);
  const primaryCalendarEvent = calendarEvents[0] ?? null;

  return (
    <section className="pb-10">
      <div className="mb-5 flex flex-wrap gap-3">
        <Link
          className="inline-flex min-h-11 items-center gap-2 rounded-full border border-semear-green/15 bg-white/70 px-4 text-sm font-semibold text-semear-green transition hover:bg-white"
          href="/acoes"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          Voltar para ações
        </Link>
        <button
          className="inline-flex min-h-11 items-center gap-2 rounded-full bg-semear-green px-4 text-sm font-semibold text-white transition hover:bg-semear-green/92"
          onClick={() => setEditing(true)}
          type="button"
        >
          <Edit3 className="h-4 w-4" aria-hidden="true" />
          Editar ação
        </button>
        <Link
          className="inline-flex min-h-11 items-center gap-2 rounded-full border border-semear-green/15 bg-white/70 px-4 text-sm font-semibold text-semear-green transition hover:bg-white"
          href={`/acoes/${actionId}/piloto`}
        >
          <FlaskConical className="h-4 w-4" aria-hidden="true" />
          Piloto da banca
        </Link>
        <Link
          className="inline-flex min-h-11 items-center gap-2 rounded-full border border-semear-green/15 bg-white/70 px-4 text-sm font-semibold text-semear-green transition hover:bg-white"
          href="/escutas/lote"
        >
          <ClipboardList className="h-4 w-4" aria-hidden="true" />
          Digitalizar fichas
        </Link>
        <Link
          className="inline-flex min-h-11 items-center gap-2 rounded-full border border-semear-green/15 bg-white/70 px-4 text-sm font-semibold text-semear-green transition hover:bg-white"
          href={calendarEvents[0] ? `/agenda/${calendarEvents[0].id}` : `/agenda/novo?actionId=${actionId}&startsAt=${encodeURIComponent(suggestedEventStart)}&endsAt=${encodeURIComponent(suggestedEventEnd)}&allDay=${action.all_day ? "1" : "0"}`}
        >
          <CalendarDays className="h-4 w-4" aria-hidden="true" />
          {calendarEvents[0] ? "Abrir agenda" : "Criar evento na agenda"}
        </Link>
      </div>

      <article className="rounded-[2rem] border border-white/80 bg-white/78 p-5 shadow-soft sm:p-8">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-semear-earth">
              Ação territorial
            </p>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight text-semear-green">
              {action.title}
            </h2>
            <div className="mt-4 flex flex-wrap gap-3 text-sm text-stone-600">
              <span className="inline-flex items-center gap-2">
                <CalendarDays className="h-4 w-4" aria-hidden="true" />
                {getActionScheduleLabel(action)}
              </span>
              <span className="inline-flex items-center gap-2">
                <MapPin className="h-4 w-4" aria-hidden="true" />
                {action.neighborhoods?.name ?? "Sem bairro definido"}
              </span>
            </div>
          </div>
          <div className="rounded-2xl bg-semear-green-soft px-4 py-3 text-sm font-semibold text-semear-green">
            {action.status === "realizada"
              ? "Banca realizada — digitalize as fichas em /escutas/lote"
              : "Ação planejada — fichas podem ser digitadas após a banca"}
          </div>
        </div>

        <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-5">
          {detailItems.map(([label, value]) => (
            <div className="rounded-2xl border border-semear-gray bg-semear-offwhite p-4" key={label}>
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-stone-500">
                {label}
              </p>
              <p className="mt-2 text-sm font-semibold text-semear-green">{value}</p>
            </div>
          ))}
        </div>

        <div className="mt-8 grid gap-5 lg:grid-cols-2">
          <TextBlock title="Objetivo" value={action.objective} />
          <TextBlock title="Resumo" value={action.summary} />
          <TextBlock title="Observações" value={action.notes} />
          <section className="rounded-2xl border border-semear-gray bg-white p-5">
            <h3 className="font-semibold text-semear-green">Participantes da ação</h3>
            {participants.length > 0 ? (
              <ul className="mt-3 space-y-3">
                {participants.map((participant) => (
                  <li className="rounded-xl border border-semear-gray bg-semear-offwhite p-3" key={participant.id}>
                    <p className="text-sm font-semibold text-semear-green">
                      {participant.team_members?.display_name ?? "Membro não encontrado"}
                    </p>
                    <p className="mt-1 text-xs text-stone-600">
                      {participant.team_members?.role_label ?? "Função não informada"}
                    </p>
                    <p className="mt-2 text-xs text-stone-600">
                      {participant.responsibility ? `Responsabilidade: ${participant.responsibility}` : "Responsabilidade não informada."}
                    </p>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-3 text-sm leading-6 text-stone-600">
                Nenhum participante padronizado foi vinculado. Use o campo legado de equipe apenas como observação.
              </p>
            )}
            {action.team ? (
              <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs leading-5 text-amber-900">
                Registro legado de equipe: {action.team}
              </div>
            ) : null}
          </section>
          <div className="rounded-2xl border border-dashed border-semear-green/25 bg-semear-offwhite p-5">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-semear-earth">
                <UsersRound className="h-5 w-5" aria-hidden="true" />
              </div>
              <div>
                <h3 className="font-semibold text-semear-green">Privacidade do público</h3>
                <p className="mt-1 text-sm leading-6 text-stone-600">
                  Este módulo registra dados coletivos da ação, sem CPF, telefone ou endereço
                  pessoal de participantes.
                </p>
              </div>
            </div>
          </div>
        </div>
      </article>

      <div className="mt-8 grid gap-5 lg:grid-cols-2">
        <ActionReadinessPanel records={records} />
        <ActionOperationChecklist action={action} records={records} />
      </div>

      <section className="mt-8 rounded-[2rem] border border-white/80 bg-white p-6 shadow-soft">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-semear-green-soft text-semear-green">
              <FileText className="h-6 w-6" aria-hidden="true" />
            </div>
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-semear-earth">Devolutiva da ação</p>
              <h3 className="mt-2 text-xl font-semibold text-semear-green">
                {debrief ? getDebriefStatusLabel(debrief.status) : "Não criada"}
              </h3>
              <p className="mt-2 text-sm leading-6 text-stone-600">
                Prepare o relatório bonito “O que ouvimos na feira” com revisão humana, privacidade e versão de impressão.
              </p>
            </div>
          </div>
          <Link className="inline-flex min-h-11 items-center justify-center rounded-full bg-semear-green px-5 text-sm font-semibold text-white" href={`/acoes/${actionId}/devolutiva`}>
            Abrir devolutiva
          </Link>
        </div>
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          {metrics.draft > 0 ? (
            <Alert text={`${metrics.draft} escuta(s) ainda em rascunho. Revise antes de aprovar a devolutiva.`} />
          ) : null}
          {metrics.possibleSensitive > 0 ? (
            <Alert text="Há possível dado sensível detectado. Não aprove sem revisão." danger />
          ) : null}
        </div>
      </section>

      <section className="mt-8 rounded-[2rem] border border-white/80 bg-white p-6 shadow-soft">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-semear-green-soft text-semear-green">
              <FolderCheck className="h-6 w-6" aria-hidden="true" />
            </div>
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-semear-earth">Dossiê da ação</p>
              <h3 className="mt-2 text-xl font-semibold text-semear-green">{getClosureStatusLabel(closure?.status)}</h3>
              <p className="mt-2 text-sm leading-6 text-stone-600">
                {reviewedPercent}% revisado · devolutiva {debrief?.status === "approved" ? "aprovada" : "não aprovada"} · {metrics.pending} pendência(s).
              </p>
            </div>
          </div>
          <Link className="inline-flex min-h-11 items-center justify-center rounded-full bg-semear-green px-5 text-sm font-semibold text-white" href={`/acoes/${actionId}/dossie`}>
            Abrir dossiê
          </Link>
        </div>
        {metrics.possibleSensitive > 0 ? <Alert text="Há pendência crítica de possível dado sensível." danger /> : null}
      </section>

      <section className="mt-8 rounded-[2rem] border border-white/80 bg-white p-6 shadow-soft">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-semear-earth">Agenda da Equipe</p>
            <h3 className="mt-2 text-xl font-semibold text-semear-green">Operação vinculada à agenda coletiva</h3>
            <p className="mt-2 text-sm leading-6 text-stone-600">
              Use a agenda interna para consolidar horário, presença, lembretes e próximos passos desta ação.
            </p>
          </div>
          <Link className="inline-flex min-h-11 items-center justify-center rounded-full bg-semear-green px-5 text-sm font-semibold text-white" href={calendarEvents[0] ? `/agenda/${calendarEvents[0].id}` : `/agenda/novo?actionId=${actionId}&startsAt=${encodeURIComponent(suggestedEventStart)}&endsAt=${encodeURIComponent(suggestedEventEnd)}&allDay=${action.all_day ? "1" : "0"}`}>
            {calendarEvents[0] ? "Abrir agenda" : "Criar evento"}
          </Link>
        </div>

        <div className="mt-5 grid gap-3 md:grid-cols-2">
          {calendarEvents.map((calendarEvent) => (
            <article className="rounded-2xl border border-semear-gray bg-semear-offwhite p-4" key={calendarEvent.id}>
              <p className="font-semibold text-semear-green">{calendarEvent.title}</p>
              <p className="mt-1 text-xs text-stone-500">
                {new Date(calendarEvent.starts_at).toLocaleString("pt-BR")} · {calendarEvent.status}
              </p>
              <p className="mt-2 text-xs text-stone-600">
                Google Calendar: {getGoogleCalendarSyncStatusLabel(calendarEvent.google_sync_status)}
              </p>
              <Link className="mt-3 inline-flex min-h-10 items-center justify-center rounded-full border border-semear-green/15 bg-white px-3 text-xs font-semibold text-semear-green" href={`/agenda/${calendarEvent.id}`}>
                Ver evento
              </Link>
            </article>
          ))}
          {calendarEvents.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-semear-green/25 bg-semear-offwhite p-4 text-sm text-stone-600">
              Nenhum evento da agenda foi vinculado ainda. A criação é opcional e não acontece automaticamente.
            </div>
          ) : null}
        </div>

        <div className="mt-5 flex flex-wrap gap-2">
          <Link className="inline-flex min-h-11 items-center justify-center rounded-full border border-semear-green/15 bg-white px-4 text-sm font-semibold text-semear-green" href={`/agenda/novo?actionId=${actionId}&eventType=devolutiva&title=${encodeURIComponent(`Devolutiva — ${action.title}`)}&startsAt=${nextWeekIso}T18:00&endsAt=${nextWeekIso}T20:00&allDay=0&neighborhoodId=${action.neighborhood_id ?? ""}`}>
            Agendar devolutiva
          </Link>
          <Link className="inline-flex min-h-11 items-center justify-center rounded-full border border-semear-green/15 bg-white px-4 text-sm font-semibold text-semear-green" href={`/agenda/novo?actionId=${actionId}&eventType=dossie&title=${encodeURIComponent(`Fechamento do dossiê — ${action.title}`)}&startsAt=${nextWeekIso}T14:00&endsAt=${nextWeekIso}T15:00&allDay=0&neighborhoodId=${action.neighborhood_id ?? ""}`}>
            Agendar fechamento do dossiê
          </Link>
          <Link className="inline-flex min-h-11 items-center justify-center rounded-full border border-semear-green/15 bg-white px-4 text-sm font-semibold text-semear-green" href={`/agenda/novo?actionId=${actionId}&eventType=reuniao&title=${encodeURIComponent(`Revisão das escutas — ${action.title}`)}&startsAt=${nextWeekIso}T10:00&endsAt=${nextWeekIso}T12:00&allDay=0&neighborhoodId=${action.neighborhood_id ?? ""}`}>
            Agendar revisão das escutas
          </Link>
        </div>

        {primaryCalendarEvent ? (
          <div className="mt-5 rounded-2xl border border-semear-gray bg-semear-offwhite p-4 text-sm leading-6 text-stone-700">
            <strong className="text-semear-green">Google Calendar:</strong> {getGoogleCalendarSyncStatusLabel(primaryCalendarEvent.google_sync_status)}. A sincronização manual acontece no evento interno da agenda para evitar duplicação de lógica.
          </div>
        ) : null}
      </section>

      <div className="mt-8">
        <InternalRemindersPanel
          title="Sugestões operacionais desta ação"
          description="Use a agenda para não depender de criação manual em devolutiva, dossiê e revisão."
          items={[
            { label: "Devolutiva sem agenda", value: hasDebriefEvent ? 0 : 1, text: hasDebriefEvent ? "Já existe evento sugerido ou criado para devolutiva." : "Ainda não há evento de devolutiva vinculado a esta ação.", href: hasDebriefEvent ? `/agenda/${calendarEvents.find((event) => event.event_type === "devolutiva")?.id}` : `/agenda/novo?actionId=${actionId}&eventType=devolutiva&title=${encodeURIComponent(`Devolutiva — ${action.title}`)}&startsAt=${nextWeekIso}T18:00&endsAt=${nextWeekIso}T20:00&allDay=0&neighborhoodId=${action.neighborhood_id ?? ""}`, tone: hasDebriefEvent ? "default" : "warning" },
            { label: "Dossiê sem agenda", value: hasDossierEvent ? 0 : 1, text: hasDossierEvent ? "Já existe evento de fechamento do dossiê." : "Ainda não há evento de fechamento do dossiê para esta ação.", href: hasDossierEvent ? `/agenda/${calendarEvents.find((event) => event.event_type === "dossie")?.id}` : `/agenda/novo?actionId=${actionId}&eventType=dossie&title=${encodeURIComponent(`Fechamento do dossiê — ${action.title}`)}&startsAt=${nextWeekIso}T14:00&endsAt=${nextWeekIso}T15:00&allDay=0&neighborhoodId=${action.neighborhood_id ?? ""}`, tone: hasDossierEvent ? "default" : "warning" },
            { label: "Revisão das escutas", value: hasReviewEvent ? 0 : 1, text: hasReviewEvent ? "Já existe evento de revisão ou prazo relacionado." : "Ainda não há evento de revisão das escutas para esta ação.", href: hasReviewEvent ? `/agenda/${calendarEvents.find((event) => event.event_type === "reuniao" || event.event_type === "prazo")?.id}` : `/agenda/novo?actionId=${actionId}&eventType=reuniao&title=${encodeURIComponent(`Revisão das escutas — ${action.title}`)}&startsAt=${nextWeekIso}T10:00&endsAt=${nextWeekIso}T12:00&allDay=0&neighborhoodId=${action.neighborhood_id ?? ""}`, tone: hasReviewEvent ? "default" : "warning" },
          ]}
        />
      </div>

      <section className="mt-8 rounded-[2rem] border border-white/80 bg-white p-6 shadow-soft">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-semear-earth">Memória do Projeto</p>
            <h3 className="mt-2 text-xl font-semibold text-semear-green">Relatórios semanais, anexos relacionados e entradas de memória</h3>
            <p className="mt-2 text-sm leading-6 text-stone-600">
              Este bloco cruza a ação com os relatórios semanais já vinculados no módulo de memória do projeto.
            </p>
          </div>
          <Link className="inline-flex min-h-11 items-center justify-center rounded-full border border-semear-green/15 bg-white px-4 text-sm font-semibold text-semear-green" href="/memoria">
            Abrir memória
          </Link>
        </div>

        <div className="mt-5 grid gap-5 lg:grid-cols-2">
          <section className="rounded-2xl border border-semear-gray bg-semear-offwhite p-4">
            <h4 className="font-semibold text-semear-green">Relatórios semanais vinculados</h4>
            <div className="mt-3 space-y-3">
              {weeklyReports.map((weeklyReport) => (
                <article className="rounded-xl bg-white p-3" key={weeklyReport.id}>
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <p className="font-semibold text-semear-green">{weeklyReport.title}</p>
                      <p className="mt-1 text-xs text-stone-500">{weeklyReport.team_members?.display_name ?? "Membro não identificado"} · {new Date(`${weeklyReport.week_start}T00:00:00`).toLocaleDateString("pt-BR")} até {new Date(`${weeklyReport.week_end}T00:00:00`).toLocaleDateString("pt-BR")}</p>
                    </div>
                    <Link className="inline-flex min-h-10 items-center justify-center rounded-full border border-semear-green/15 px-3 text-xs font-semibold text-semear-green" href={`/memoria/${weeklyReport.id}`}>
                      Abrir
                    </Link>
                  </div>
                </article>
              ))}
              {weeklyReports.length === 0 ? <p className="text-sm text-stone-500">Nenhum relatório semanal vinculado a esta ação ainda.</p> : null}
            </div>
          </section>

          <section className="rounded-2xl border border-semear-gray bg-semear-offwhite p-4">
            <h4 className="font-semibold text-semear-green">Anexos relacionados</h4>
            <div className="mt-3 space-y-3">
              {weeklyReportAttachments.map((attachment) => (
                <article className="rounded-xl bg-white p-3" key={attachment.id}>
                  <p className="font-semibold text-semear-green">{attachment.file_name}</p>
                  <p className="mt-1 text-xs text-stone-500">{attachment.file_type ?? "tipo não informado"}</p>
                  <p className="mt-1 text-xs text-stone-500">Abra o relatório semanal para gerar link temporário de download.</p>
                </article>
              ))}
              {weeklyReportAttachments.length === 0 ? <p className="text-sm text-stone-500">Nenhum anexo relacionado encontrado.</p> : null}
            </div>
          </section>
        </div>

        <section className="mt-5 rounded-2xl border border-semear-gray bg-semear-offwhite p-4">
          <h4 className="font-semibold text-semear-green">Entradas de memória relacionadas</h4>
          <div className="mt-3 space-y-3">
            {memoryEntries.map((entry) => (
              <article className="rounded-xl bg-white p-3" key={entry.id}>
                <p className="font-semibold text-semear-green">{entry.title}</p>
                <p className="mt-1 text-xs text-stone-500">{new Date(`${entry.entry_date}T00:00:00`).toLocaleDateString("pt-BR")} · {entry.memory_type}</p>
                <p className="mt-2 text-sm leading-6 text-stone-700">{entry.body}</p>
                {entry.weekly_team_reports ? <p className="mt-2 text-xs text-stone-500">Origem: {entry.weekly_team_reports.title}</p> : null}
              </article>
            ))}
            {memoryEntries.length === 0 ? <p className="text-sm text-stone-500">Nenhuma entrada de memória vinculada diretamente a esta ação.</p> : null}
          </div>
        </section>
      </section>

      <ActionSynthesis actionId={actionId} />
    </section>
  );
}

function getDebriefStatusLabel(status: ActionDebrief["status"]) {
  if (status === "approved") return "Aprovada";
  if (status === "reviewed") return "Revisada";
  return "Rascunho";
}

function Alert({ text, danger = false }: { text: string; danger?: boolean }) {
  return (
    <p className={`flex gap-2 rounded-2xl border p-4 text-sm font-medium ${danger ? "border-red-200 bg-red-50 text-red-800" : "border-amber-200 bg-amber-50 text-amber-900"}`}>
      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
      {text}
    </p>
  );
}

function TextBlock({ title, value }: { title: string; value: string | null }) {
  return (
    <section className="rounded-2xl border border-semear-gray bg-white p-5">
      <h3 className="font-semibold text-semear-green">{title}</h3>
      <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-stone-600">
        {value || "Não informado."}
      </p>
    </section>
  );
}
