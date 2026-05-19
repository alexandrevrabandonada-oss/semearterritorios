"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  CalendarClock,
  CalendarDays,
  CheckCircle2,
  ClipboardList,
  FileText,
  FolderClock,
  LibraryBig,
  Plus,
  UsersRound,
} from "lucide-react";
import type {
  Action,
  ActionClosure,
  ActionDebrief,
  Neighborhood,
  Profile,
  ProjectMemoryEntry,
  TeamCalendarAttendanceStatus,
  TeamCalendarEvent,
  TeamCalendarEventMember,
  TeamMember,
  WeeklyTeamReport,
} from "@/lib/database.types";
import { InternalRemindersPanel } from "@/components/agenda/internal-reminders-panel";
import { NotificationsInlinePanel } from "@/components/notifications/notifications-inline-panel";
import { FilterBar, FilterField, filterControlClassName } from "@/components/ui/filter-bar";
import { MetricCard } from "@/components/ui/metric-card";
import { PageHeader } from "@/components/ui/page-header";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";
import {
  buildEventsWithoutAgendaForActions,
  buildClosureReminderItems,
  buildDebriefReminderItems,
  buildOverdueEvents,
  buildRecentDoneEvents,
  buildUpcomingEvents,
  buildWeeklyReportReminderItems,
  getEventDateLabel,
  getMonthRange,
  getRelatedMemoryEntriesForEvent,
  getTeamCalendarAttendanceLabel,
  getTeamCalendarAttendanceTone,
  getTeamCalendarEventStatusLabel,
  getTeamCalendarEventStatusTone,
  getTeamCalendarEventTypeLabel,
  getWeekRange,
  isSameDay,
  teamCalendarAttendanceOptions,
  teamCalendarEventStatusOptions,
  teamCalendarEventTypeOptions,
  teamCalendarViewOptions,
  type TeamCalendarView,
} from "@/lib/team-calendar";
import { getStartOfWeekIso } from "@/lib/project-memory";

type EventWithRelations = TeamCalendarEvent & {
  actions: Pick<Action, "id" | "title" | "action_date"> | null;
  neighborhoods: Pick<Neighborhood, "id" | "name"> | null;
};

type Filters = {
  type: string;
  status: string;
  neighborhoodId: string;
  teamMemberId: string;
  period: string;
};

const initialFilters: Filters = {
  type: "",
  status: "",
  neighborhoodId: "",
  teamMemberId: "",
  period: "30",
};

export function TeamCalendarPage() {
  const supabase = useMemo(() => createBrowserSupabaseClient(), []);
  const [events, setEvents] = useState<EventWithRelations[]>([]);
  const [memberships, setMemberships] = useState<TeamCalendarEventMember[]>([]);
  const [actions, setActions] = useState<Action[]>([]);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [neighborhoods, setNeighborhoods] = useState<Neighborhood[]>([]);
  const [weeklyReports, setWeeklyReports] = useState<WeeklyTeamReport[]>([]);
  const [debriefs, setDebriefs] = useState<ActionDebrief[]>([]);
  const [closures, setClosures] = useState<ActionClosure[]>([]);
  const [memoryEntries, setMemoryEntries] = useState<ProjectMemoryEntry[]>([]);
  const [currentProfile, setCurrentProfile] = useState<Pick<Profile, "id" | "role"> | null>(null);
  const [view, setView] = useState<TeamCalendarView>("proximos");
  const [filters, setFilters] = useState<Filters>(initialFilters);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const canManage = currentProfile?.role === "admin" || currentProfile?.role === "coordenacao";
  const linkedTeamMember = useMemo(
    () => teamMembers.find((member) => member.profile_id === currentProfile?.id) ?? null,
    [currentProfile?.id, teamMembers]
  );

  useEffect(() => {
    let ignore = false;

    async function loadData() {
      if (!supabase) {
        setError("Configure NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_ANON_KEY para carregar a agenda.");
        setLoading(false);
        return;
      }

      const userResult = await supabase.auth.getUser();
      const userId = userResult.data.user?.id;

      const [
        profileResult,
        eventsResult,
        membershipsResult,
        actionsResult,
        teamMembersResult,
        neighborhoodsResult,
        weeklyReportsResult,
        debriefsResult,
        closuresResult,
        memoryEntriesResult,
      ] = await Promise.all([
        userId ? supabase.from("profiles").select("id, role").eq("id", userId).maybeSingle() : Promise.resolve({ data: null, error: null }),
        supabase.from("team_calendar_events").select("*, actions:action_id(id, title, action_date), neighborhoods:neighborhood_id(id, name)").order("starts_at", { ascending: true }),
        supabase.from("team_calendar_event_members").select("*"),
        supabase.from("actions").select("*").order("action_date", { ascending: false }),
        supabase.from("team_members").select("*").eq("active", true).order("display_name", { ascending: true }),
        supabase.from("neighborhoods").select("*").order("name", { ascending: true }),
        supabase.from("weekly_team_reports").select("*").order("week_start", { ascending: false }),
        supabase.from("action_debriefs").select("*"),
        supabase.from("action_closures").select("*"),
        supabase.from("project_memory_entries").select("*").order("entry_date", { ascending: false }),
      ]);

      if (ignore) return;

      if (
        profileResult.error ||
        eventsResult.error ||
        membershipsResult.error ||
        actionsResult.error ||
        teamMembersResult.error ||
        neighborhoodsResult.error ||
        weeklyReportsResult.error ||
        debriefsResult.error ||
        closuresResult.error ||
        memoryEntriesResult.error
      ) {
        setError(
          profileResult.error?.message ??
            eventsResult.error?.message ??
            membershipsResult.error?.message ??
            actionsResult.error?.message ??
            teamMembersResult.error?.message ??
            neighborhoodsResult.error?.message ??
            weeklyReportsResult.error?.message ??
            debriefsResult.error?.message ??
            closuresResult.error?.message ??
            memoryEntriesResult.error?.message ??
            "Erro ao carregar agenda."
        );
        setLoading(false);
        return;
      }

      setCurrentProfile((profileResult.data ?? null) as Pick<Profile, "id" | "role"> | null);
      setEvents((eventsResult.data ?? []) as unknown as EventWithRelations[]);
      setMemberships((membershipsResult.data ?? []) as TeamCalendarEventMember[]);
      setActions((actionsResult.data ?? []) as Action[]);
      setTeamMembers((teamMembersResult.data ?? []) as TeamMember[]);
      setNeighborhoods((neighborhoodsResult.data ?? []) as Neighborhood[]);
      setWeeklyReports((weeklyReportsResult.data ?? []) as WeeklyTeamReport[]);
      setDebriefs((debriefsResult.data ?? []) as ActionDebrief[]);
      setClosures((closuresResult.data ?? []) as ActionClosure[]);
      setMemoryEntries((memoryEntriesResult.data ?? []) as ProjectMemoryEntry[]);
      setLoading(false);
    }

    void loadData();

    return () => {
      ignore = true;
    };
  }, [supabase]);

  const filteredEvents = useMemo(() => {
    const now = new Date();
    const periodLimit = new Date(now);
    periodLimit.setDate(periodLimit.getDate() + Number(filters.period || 30));

    return events.filter((event) => {
      if (filters.type && event.event_type !== filters.type) return false;
      if (filters.status && event.status !== filters.status) return false;
      if (filters.neighborhoodId && event.neighborhood_id !== filters.neighborhoodId) return false;
      if (filters.teamMemberId && !memberships.some((membership) => membership.event_id === event.id && membership.team_member_id === filters.teamMemberId)) return false;
      if (filters.period && new Date(event.starts_at) > periodLimit) return false;
      return true;
    });
  }, [events, filters, memberships]);

  const nextEvents = filteredEvents.filter((event) => new Date(event.starts_at) >= new Date()).slice(0, 6);
  const weekRange = getWeekRange();
  const monthRange = getMonthRange();
  const weekEvents = filteredEvents.filter((event) => {
    const date = new Date(event.starts_at);
    return date >= weekRange.start && date <= weekRange.end;
  });
  const monthEvents = filteredEvents.filter((event) => {
    const date = new Date(event.starts_at);
    return date >= monthRange.start && date <= monthRange.end;
  });

  const todayEvents = events.filter((event) => isSameDay(event.starts_at, new Date()));
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowEvents = events.filter((event) => isSameDay(event.starts_at, tomorrow));
  const pendingWeeklyReports = buildWeeklyReportReminderItems(weeklyReports, teamMembers, getStartOfWeekIso(new Date()));
  const pendingDebriefs = buildDebriefReminderItems(actions, debriefs);
  const pendingClosures = buildClosureReminderItems(actions, closures);
  const overdueEvents = buildOverdueEvents(events) as EventWithRelations[];
  const nextSevenDaysEvents = buildUpcomingEvents(events, 7) as EventWithRelations[];
  const recentDoneEvents = buildRecentDoneEvents(events, 7) as EventWithRelations[];
  const actionsDoneWithoutClosure = actions.filter((action) => action.status === "realizada" && !closures.some((closure) => closure.action_id === action.id && closure.status === "closed"));
  const debriefsWithoutAgenda = buildEventsWithoutAgendaForActions(actions, events, { eventType: "devolutiva" });
  const dossiersWithoutAgenda = buildEventsWithoutAgendaForActions(actions, events, { eventType: "dossie", requireStatus: ["planejada", "realizada", "reprogramada"] });
  const doneEvents = events.filter((event) => event.status === "done").length;
  const confirmedEvents = events.filter((event) => event.status === "confirmed").length;

  async function updateAttendance(membershipId: string, attendanceStatus: TeamCalendarAttendanceStatus) {
    const result = await supabase?.from("team_calendar_event_members").update({ attendance_status: attendanceStatus }).eq("id", membershipId);
    if (result?.error) {
      setError(result.error.message);
      return;
    }

    setMemberships((current) => current.map((item) => (item.id === membershipId ? { ...item, attendance_status: attendanceStatus } : item)));
  }

  if (loading) {
    return <StateBox>Carregando agenda da equipe...</StateBox>;
  }

  if (error) {
    return <StateBox tone="error">{error}</StateBox>;
  }

  return (
    <section className="pb-10">
      <PageHeader
        eyebrow="Tijolo 054"
        title="Agenda da Equipe"
        description="Agenda interna para ações de campo, bancas, reuniões, prazos, devolutivas, dossiês e memória. Não inclua dados pessoais de entrevistados."
        actions={canManage ? (
          <>
            <Link className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full border border-stone-200 bg-white/90 px-4 text-xs font-bold text-stone-700 shadow-premium-sm transition hover:bg-white active:scale-[0.98]" href="/agenda">
              <CalendarDays className="h-4 w-4" aria-hidden="true" />
              Hoje
            </Link>
            <Link className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full border border-stone-200 bg-white/90 px-4 text-xs font-bold text-stone-700 shadow-premium-sm transition hover:bg-white active:scale-[0.98]" href="/agenda">
              <CalendarClock className="h-4 w-4" aria-hidden="true" />
              Esta semana
            </Link>
            <Link className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full border border-stone-200 bg-white/90 px-4 text-xs font-bold text-stone-700 shadow-premium-sm transition hover:bg-white active:scale-[0.98]" href="/agenda/google/status">
              <AlertTriangle className="h-4 w-4" aria-hidden="true" />
              Saúde Google
            </Link>
            <Link className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-semear-green px-4 text-xs font-bold text-white shadow-premium-sm transition hover:bg-semear-green/90 active:scale-[0.98]" href="/agenda/novo">
              <Plus className="h-4 w-4" aria-hidden="true" />
              Novo evento
            </Link>
          </>
        ) : undefined}
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard icon={<CalendarDays className="h-5 w-5" />} label="Próximos eventos" note="recorte filtrado" value={nextEvents.length} />
        <MetricCard icon={<CheckCircle2 className="h-5 w-5" />} label="Confirmados" note="agenda pronta" value={confirmedEvents} />
        <MetricCard icon={<UsersRound className="h-5 w-5" />} label="Eventos de hoje" note="alerta operacional" value={todayEvents.length} tone="yellow" />
        <MetricCard icon={<LibraryBig className="h-5 w-5" />} label="Concluídos" note="base para memória" value={doneEvents} />
      </div>

      <section className="mt-5 grid gap-5 xl:grid-cols-[1.1fr_0.9fr]">
        <section className="rounded-3xl border border-white/60 bg-white/80 p-5 shadow-premium-md backdrop-blur-sm sm:p-6">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between border-b border-stone-200/55 pb-4">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-semear-earth">Visões</p>
              <h3 className="mt-1 text-2xl font-extrabold tracking-tight text-semear-green">Calendário e Escopo</h3>
            </div>
            <div className="flex flex-wrap gap-1 bg-stone-100 p-1.5 rounded-2xl border border-stone-200/40">
              {teamCalendarViewOptions.map((option) => (
                <button
                  key={option.value}
                  className={`rounded-xl px-4 py-1.5 text-xs font-bold transition duration-200 active:scale-[0.96] ${view === option.value ? "bg-white text-semear-green shadow-premium-sm" : "text-stone-500 hover:text-stone-700"}`}
                  onClick={() => setView(option.value)}
                  type="button"
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          <div className="mt-5">
            {view === "proximos" ? <EventList events={nextEvents} memberships={memberships} teamMembers={teamMembers} linkedTeamMember={linkedTeamMember} onAttendanceChange={updateAttendance} /> : null}
            {view === "semana" ? (
              <div className="space-y-6">
                <SectionedEventList title="Hoje" events={todayEvents} memberships={memberships} teamMembers={teamMembers} linkedTeamMember={linkedTeamMember} onAttendanceChange={updateAttendance} />
                <SectionedEventList title="Amanhã" events={tomorrowEvents} memberships={memberships} teamMembers={teamMembers} linkedTeamMember={linkedTeamMember} onAttendanceChange={updateAttendance} />
                <SectionedEventList title="Próximos 7 dias" events={nextSevenDaysEvents} memberships={memberships} teamMembers={teamMembers} linkedTeamMember={linkedTeamMember} onAttendanceChange={updateAttendance} />
                <SectionedEventList title="Atrasados" events={overdueEvents} memberships={memberships} teamMembers={teamMembers} linkedTeamMember={linkedTeamMember} onAttendanceChange={updateAttendance} />
                <SectionedEventList title="Concluídos recentes" events={recentDoneEvents} memberships={memberships} teamMembers={teamMembers} linkedTeamMember={linkedTeamMember} onAttendanceChange={updateAttendance} />
              </div>
            ) : null}
            {view === "lista" ? <EventList events={filteredEvents} memberships={memberships} teamMembers={teamMembers} linkedTeamMember={linkedTeamMember} onAttendanceChange={updateAttendance} /> : null}
            {view === "mes" ? <MonthList events={monthEvents} /> : null}
          </div>
        </section>

        <section className="space-y-5">
          <InternalRemindersPanel
            title="Lembretes internos simples"
            description="Acompanhe pendências operacionais e compromissos importantes do portal."
            items={[
              { label: "Hoje", value: todayEvents.length, text: todayEvents.length > 0 ? todayEvents.map((event) => event.title).join(" · ") : "Nenhum evento hoje.", href: "/agenda" },
              { label: "Amanhã", value: tomorrowEvents.length, text: tomorrowEvents.length > 0 ? tomorrowEvents.map((event) => event.title).join(" · ") : "Nenhum evento amanhã.", href: "/agenda" },
              { label: "Eventos atrasados", value: overdueEvents.length, text: overdueEvents.length > 0 ? overdueEvents.map((event) => event.title).join(" · ") : "Sem evento atrasado.", href: "/agenda", tone: overdueEvents.length > 0 ? "danger" : "default" },
              { label: "Relatórios pendentes", value: pendingWeeklyReports.length, text: pendingWeeklyReports.length > 0 ? pendingWeeklyReports.join(" · ") : "Sem pendência semanal no recorte.", href: "/memoria", tone: pendingWeeklyReports.length > 0 ? "warning" : "default" },
              { label: "Devolutivas sem agenda", value: debriefsWithoutAgenda.length, text: debriefsWithoutAgenda.length > 0 ? debriefsWithoutAgenda.slice(0, 4).map((action) => action.title).join(" · ") : "Toda ação já tem devolutiva prevista ou vinculada.", href: "/acoes", tone: debriefsWithoutAgenda.length > 0 ? "warning" : "default" },
              { label: "Dossiês sem agenda", value: dossiersWithoutAgenda.length, text: dossiersWithoutAgenda.length > 0 ? dossiersWithoutAgenda.slice(0, 4).map((action) => action.title).join(" · ") : "Todos os dossiês já têm agenda ou não precisam de novo evento.", href: "/acoes", tone: dossiersWithoutAgenda.length > 0 ? "warning" : "default" },
              { label: "Ações realizadas sem fechamento", value: actionsDoneWithoutClosure.length, text: actionsDoneWithoutClosure.length > 0 ? actionsDoneWithoutClosure.slice(0, 4).map((action) => action.title).join(" · ") : "Sem ação realizada aguardando fechamento.", href: "/acoes", tone: actionsDoneWithoutClosure.length > 0 ? "warning" : "default" },
            ]}
          />

          <NotificationsInlinePanel
            title="Avisos da agenda"
            categories={["agenda", "google"]}
            href="/avisos"
            emptyText="Sem avisos de agenda pendentes."
            limit={4}
          />

          <DiagnosticPanel
            totalActions={actions.length}
            totalReports={weeklyReports.length}
            pendingDebriefs={pendingDebriefs.length}
            pendingClosures={pendingClosures.length}
          />

          <section className="rounded-3xl border border-white/60 bg-white/80 p-5 shadow-premium-md backdrop-blur-sm">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-full bg-amber-50 text-amber-600 border border-amber-200">
                <AlertTriangle className="h-5 w-5" aria-hidden="true" />
              </div>
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.2em] text-semear-earth">Privacidade</p>
                <h3 className="text-xl font-bold tracking-tight text-semear-green">Agenda interna, sem dado sensível</h3>
              </div>
            </div>
            <div className="mt-4 space-y-2 text-xs leading-relaxed text-stone-600 font-medium">
              <p>Não registrar CPF, telefone, endereço pessoal, e-mail ou nome de entrevistado.</p>
              <p>Presença na agenda não é folha de ponto.</p>
              <p>Participação em evento não concede acesso ao sistema.</p>
              <p>Google Calendar já funciona como espelho operacional manual e auditável, sem webhook, push ou envio de e-mail próprio.</p>
            </div>
          </section>
        </section>
      </section>

      <div className="mt-5 rounded-3xl border border-white/60 bg-white/85 p-5 shadow-premium-md backdrop-blur-sm">
        <FilterBar title="Filtros" onClear={() => setFilters(initialFilters)}>
          <FilterField label="Tipo">
            <select className={filterControlClassName} value={filters.type} onChange={(event) => setFilters((current) => ({ ...current, type: event.target.value }))}>
              <option value="">Todos</option>
              {teamCalendarEventTypeOptions.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
          </FilterField>

          <FilterField label="Status">
            <select className={filterControlClassName} value={filters.status} onChange={(event) => setFilters((current) => ({ ...current, status: event.target.value }))}>
              <option value="">Todos</option>
              {teamCalendarEventStatusOptions.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
          </FilterField>

          <FilterField label="Território">
            <select className={filterControlClassName} value={filters.neighborhoodId} onChange={(event) => setFilters((current) => ({ ...current, neighborhoodId: event.target.value }))}>
              <option value="">Todos</option>
              {neighborhoods.map((neighborhood) => (
                <option key={neighborhood.id} value={neighborhood.id}>{neighborhood.name}</option>
              ))}
            </select>
          </FilterField>

          <FilterField label="Responsável">
            <select className={filterControlClassName} value={filters.teamMemberId} onChange={(event) => setFilters((current) => ({ ...current, teamMemberId: event.target.value }))}>
              <option value="">Toda a equipe</option>
              {teamMembers.map((member) => (
                <option key={member.id} value={member.id}>{member.display_name}</option>
              ))}
            </select>
          </FilterField>

          <FilterField label="Período">
            <select className={filterControlClassName} value={filters.period} onChange={(event) => setFilters((current) => ({ ...current, period: event.target.value }))}>
              <option value="7">7 dias</option>
              <option value="30">30 dias</option>
              <option value="90">90 dias</option>
            </select>
          </FilterField>
        </FilterBar>
      </div>

      <section className="mt-5 rounded-3xl border border-white/60 bg-white/80 p-5 shadow-premium-md backdrop-blur-sm sm:p-6">
        <div className="flex items-center justify-between gap-3 border-b border-stone-200/55 pb-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-semear-earth">Memória e histórico</p>
            <h3 className="mt-1 text-2xl font-extrabold tracking-tight text-semear-green">Relatórios e Memória</h3>
          </div>
          <Link className="inline-flex min-h-11 items-center justify-center rounded-full border border-stone-200 bg-white px-4 text-xs font-bold text-stone-700 shadow-premium-sm transition hover:bg-stone-50 active:scale-[0.98]" href="/memoria">
            Abrir memória
          </Link>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-2">
          {events.filter((event) => event.status === "done").slice(0, 4).map((event) => {
            const relatedEntries = getRelatedMemoryEntriesForEvent(memoryEntries, event.id);
            return (
              <article className="rounded-2xl border border-stone-200/60 bg-white/95 p-5 shadow-premium-sm transition duration-200 hover:-translate-y-0.5 flex flex-col justify-between" key={event.id}>
                <div>
                  <p className="font-bold text-semear-green text-base">{event.title}</p>
                  <p className="mt-1 text-[10px] font-bold text-stone-400 uppercase tracking-wider">{getEventDateLabel(event)}</p>
                  <p className="mt-3 text-xs leading-relaxed text-stone-600 font-medium">
                    {relatedEntries.length > 0
                      ? `${relatedEntries.length} entrada(s) de memória já vinculada(s).`
                      : "Evento concluído pronto para gerar memória ou ganhar vínculo com relatório semanal."}
                  </p>
                </div>
                <div className="mt-4 flex flex-wrap gap-2 pt-2 border-t border-stone-100">
                  <Link className="inline-flex min-h-9 items-center justify-center rounded-lg bg-semear-green px-3 text-xs font-bold text-white shadow-premium-sm active:scale-[0.98] transition hover:bg-semear-green/90" href={`/agenda/${event.id}`}>
                    Abrir evento
                  </Link>
                  <Link className="inline-flex min-h-9 items-center justify-center rounded-lg border border-stone-200 bg-white px-3 text-xs font-bold text-stone-700 shadow-premium-sm active:scale-[0.98] transition hover:bg-stone-50" href={`/memoria/novo?eventId=${event.id}${event.action_id ? `&actionId=${event.action_id}` : ""}`}>
                    Vincular relatório
                  </Link>
                </div>
              </article>
            );
          })}
        </div>
      </section>
    </section>
  );
}

function EventList({
  events,
  memberships,
  teamMembers,
  linkedTeamMember,
  onAttendanceChange,
}: {
  events: EventWithRelations[];
  memberships: TeamCalendarEventMember[];
  teamMembers: TeamMember[];
  linkedTeamMember: TeamMember | null;
  onAttendanceChange: (membershipId: string, attendanceStatus: TeamCalendarAttendanceStatus) => void;
}) {
  if (events.length === 0) {
    return <EmptyCard text="Nenhum evento encontrado nesta visão." />;
  }

  return (
    <div className="grid gap-5">
      {events.map((event) => {
        const eventMembers = memberships.filter((membership) => membership.event_id === event.id);
        const ownMembership = linkedTeamMember ? eventMembers.find((membership) => membership.team_member_id === linkedTeamMember.id) ?? null : null;

        return (
          <article className="rounded-3xl border border-white/60 bg-white/95 p-5 shadow-premium-sm md:p-6 transition duration-200 hover:-translate-y-0.5" key={event.id}>
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-1.5">
                  <StatusBadge label={getTeamCalendarEventTypeLabel(event.event_type)} tone="stone" />
                  <StatusBadge label={getTeamCalendarEventStatusLabel(event.status)} tone={getTeamCalendarEventStatusTone(event.status)} />
                </div>
                <h4 className="mt-3 text-xl font-extrabold tracking-tight text-semear-green">{event.title}</h4>
                <p className="mt-1 text-xs font-bold text-stone-400 uppercase tracking-wider">{getEventDateLabel(event)}</p>
                {event.description ? <p className="mt-3 text-xs leading-relaxed text-stone-600 font-medium">{event.description}</p> : null}
                <div className="mt-3 flex flex-wrap gap-1.5 text-[10px] text-stone-500 font-bold uppercase tracking-wider">
                  {event.actions ? <span className="rounded-full bg-stone-100 px-3 py-1">Ação: {event.actions.title}</span> : null}
                  {event.neighborhoods ? <span className="rounded-full bg-stone-100 px-3 py-1">Território: {event.neighborhoods.name}</span> : null}
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <Link className="inline-flex min-h-10 items-center justify-center rounded-full border border-stone-200 bg-white px-4 text-xs font-bold text-stone-700 shadow-premium-sm transition hover:bg-stone-50 active:scale-[0.98]" href={`/agenda/${event.id}`}>
                  Abrir
                </Link>
                <Link className="inline-flex min-h-10 items-center justify-center rounded-full bg-semear-green px-4 text-xs font-bold text-white shadow-premium-sm transition hover:bg-semear-green/90 active:scale-[0.98]" href={`/agenda/${event.id}`}>
                  Detalhes
                </Link>
              </div>
            </div>

            <div className="mt-5 grid gap-4 lg:grid-cols-[1fr_18rem] border-t border-stone-100 pt-4">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-stone-400">Equipe participante</p>
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {eventMembers.map((membership) => {
                    const member = teamMembers.find((item) => item.id === membership.team_member_id);
                    return (
                      <span className="rounded-full border border-stone-200/50 bg-stone-50 px-3 py-1 text-xs font-semibold text-stone-700 shadow-premium-sm" key={membership.id}>
                        {member?.display_name ?? "Membro"} · <span className="font-bold text-[10px] text-stone-400">{getTeamCalendarAttendanceLabel(membership.attendance_status)}</span>
                      </span>
                    );
                  })}
                  {eventMembers.length === 0 ? <span className="text-xs text-stone-500 font-medium">Nenhum participante vinculado.</span> : null}
                </div>
              </div>

              {ownMembership ? (
                <div className="rounded-2xl border border-white/60 bg-white/70 p-4 shadow-premium-sm backdrop-blur-sm">
                  <p className="text-xs font-bold uppercase tracking-wider text-semear-green font-bold">Sua presença</p>
                  <select className="mt-3 min-h-11 w-full rounded-xl border border-stone-200 bg-white/90 px-3 text-xs font-bold text-stone-700 shadow-premium-sm outline-none focus:border-semear-green" value={ownMembership.attendance_status} onChange={(event) => onAttendanceChange(ownMembership.id, event.target.value as TeamCalendarAttendanceStatus)}>
                    {teamCalendarAttendanceOptions.map((option) => (
                      <option key={option.value} value={option.value}>{option.label}</option>
                    ))}
                  </select>
                </div>
              ) : (
                <div className="rounded-2xl border border-white/60 bg-white/60 p-4 text-xs font-semibold text-stone-500 shadow-premium-sm backdrop-blur-sm flex items-center">
                  Se seu profile estiver vinculado em <strong className="mx-1 text-semear-green">team_members</strong>, sua presença poderá ser marcada aqui com segurança.
                </div>
              )}
            </div>
          </article>
        );
      })}
    </div>
  );
}

function MonthList({ events }: { events: EventWithRelations[] }) {
  if (events.length === 0) {
    return <EmptyCard text="Nenhum evento no mês atual." />;
  }

  const grouped = events.reduce<Record<string, EventWithRelations[]>>((accumulator, event) => {
    const key = new Date(event.starts_at).toLocaleDateString("pt-BR");
    accumulator[key] = accumulator[key] ? [...accumulator[key], event] : [event];
    return accumulator;
  }, {});

  return (
    <div className="space-y-4">
      {Object.entries(grouped).map(([date, dayEvents]) => (
        <section className="rounded-2xl border border-white/60 bg-white/70 p-4 shadow-premium-sm backdrop-blur-sm" key={date}>
          <p className="text-xs font-bold uppercase tracking-[0.12em] text-semear-earth">{date}</p>
          <div className="mt-3 space-y-2">
            {dayEvents.map((event) => (
              <Link className="block rounded-xl border border-stone-200/50 bg-white/95 px-4 py-3 text-sm font-bold text-semear-green shadow-premium-sm transition duration-200 hover:-translate-y-0.5" href={`/agenda/${event.id}`} key={event.id}>
                <span className="block font-bold">{event.title}</span>
                <span className="text-xs font-semibold text-stone-500 mt-0.5">{getEventDateLabel(event)}</span>
              </Link>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}

function DiagnosticPanel({
  totalActions,
  totalReports,
  pendingDebriefs,
  pendingClosures,
}: {
  totalActions: number;
  totalReports: number;
  pendingDebriefs: number;
  pendingClosures: number;
}) {
  return (
    <section className="rounded-3xl border border-white/60 bg-white/80 p-5 shadow-premium-md backdrop-blur-sm">
      <div className="flex items-center gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-full bg-stone-50 text-semear-green border border-stone-200">
          <ClipboardList className="h-5 w-5" aria-hidden="true" />
        </div>
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-semear-earth">Diagnóstico do sistema</p>
          <h3 className="text-xl font-bold tracking-tight text-semear-green">Escopo de Integração</h3>
        </div>
      </div>
      <div className="mt-4 space-y-3 text-xs leading-relaxed text-stone-600 font-medium">
        <p><strong>Ações cadastradas:</strong> {totalActions}. São a fonte mais direta para eventos de campo, bancas, reuniões institucionais e devolutivas.</p>
        <p><strong>Relatórios semanais:</strong> {totalReports}. Funcionam como prazos e lembretes internos de fechamento semanal.</p>
        <p><strong>Devolutivas pendentes:</strong> {pendingDebriefs}. Entram como itens de acompanhamento interno até aprovação.</p>
        <p><strong>Dossiês pendentes:</strong> {pendingClosures}. Aparecem como pendência operacional para fechamento.</p>
      </div>
    </section>
  );
}

function SectionedEventList({
  title,
  events,
  memberships,
  teamMembers,
  linkedTeamMember,
  onAttendanceChange,
}: {
  title: string;
  events: EventWithRelations[];
  memberships: TeamCalendarEventMember[];
  teamMembers: TeamMember[];
  linkedTeamMember: TeamMember | null;
  onAttendanceChange: (membershipId: string, attendanceStatus: TeamCalendarAttendanceStatus) => void;
}) {
  return (
    <section>
      <h4 className="mb-3 text-xs font-bold uppercase tracking-[0.12em] text-semear-earth">{title}</h4>
      <EventList events={events} memberships={memberships} teamMembers={teamMembers} linkedTeamMember={linkedTeamMember} onAttendanceChange={onAttendanceChange} />
    </section>
  );
}

function StatusBadge({ label, tone }: { label: string; tone: "green" | "yellow" | "red" | "stone" }) {
  const className =
    tone === "green"
      ? "bg-green-50 text-green-700 border border-green-150"
      : tone === "yellow"
        ? "bg-amber-50 text-amber-800 border border-amber-150"
        : tone === "red"
          ? "bg-red-50 text-red-700 border border-red-150"
          : "bg-stone-50 text-stone-600 border border-stone-150";

  return <span className={`rounded-lg px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider ${className}`}>{label}</span>;
}

function EmptyCard({ text }: { text: string }) {
  return <div className="rounded-2xl border border-dashed border-stone-200 bg-white/70 px-4 py-6 text-xs text-stone-500 font-bold text-center">{text}</div>;
}

function StateBox({ children, tone = "neutral" }: { children: React.ReactNode; tone?: "neutral" | "error" }) {
  return <div className={`rounded-2xl p-6 text-sm font-semibold shadow-premium-sm border ${tone === "error" ? "border-red-200 bg-red-50 text-red-800" : "border-white/60 bg-white/80 text-stone-600"}`}>{children}</div>;
}
