"use client";

import { useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import Link from "next/link";
import {
  BarChart3,
  CalendarDays,
  ClipboardList,
  FileText,
  FolderCheck,
  Keyboard,
  Layers3,
  MapIcon,
  MapPinned,
  MessageSquareText,
  Plus,
  Search,
  ShieldCheck,
  Sprout,
  Tag
} from "lucide-react";
import type { Action, ActionClosure, ActionDebrief, ActionType, InAppNotification, ListeningRecord, Neighborhood, NotificationPreference, Profile, PublicTransparencySnapshot, TeamCalendarEvent, TeamCalendarEventMember, TeamMember, Theme, WeeklyTeamReport } from "@/lib/database.types";
import { InternalRemindersPanel } from "@/components/agenda/internal-reminders-panel";
import { NotificationsInlinePanel } from "@/components/notifications/notifications-inline-panel";
import { DailyBriefingPanel } from "@/components/notifications/daily-briefing-panel";
import { OperationalOnboardingCard } from "@/components/onboarding/operational-onboarding-card";
import { actionTypeOptions } from "@/lib/actions";
import { getReviewStatusLabel } from "@/lib/listening-records";
import { buildClosureReminderItems, buildDebriefReminderItems, buildEventsWithoutAgendaForActions, buildOverdueEvents, buildWeeklyReportReminderItems, getActionScheduleLabel, getEventDateLabel } from "@/lib/team-calendar";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";
import { PageHeader } from "@/components/ui/page-header";
import { MetricCard } from "@/components/ui/metric-card";
import { FilterBar, FilterField, filterControlClassName } from "@/components/ui/filter-bar";
import { getStartOfWeekIso } from "@/lib/project-memory";
import { TerritorialQualityByAction, type TerritorialQualityByActionItem } from "@/components/dashboard/territorial-quality-by-action";
import { calculateRespondentTerritoryQuality, getRespondentQualityStatusLabel } from "@/lib/territorial-quality";

type RecordWithRelations = ListeningRecord & {
  actions: Pick<Action, "id" | "title" | "action_type"> | null;
  neighborhoods: Pick<Neighborhood, "id" | "name"> | null;
  respondent_neighborhoods: Pick<Neighborhood, "id" | "name"> | null;
  listening_record_themes: Array<{ themes: Pick<Theme, "id" | "name"> | null }>;
};

type ActionWithNeighborhood = Action & {
  neighborhoods: Pick<Neighborhood, "id" | "name"> | null;
};

type Filters = {
  month: string;
  actionNeighborhoodId: string;
  respondentNeighborhoodId: string;
  actionType: string;
  themeId: string;
};

type CountItem = { name: string; count: number };
type ThemeNeighborhoodCount = { neighborhood: string; theme: string; count: number };
type TerritoryCardData = { name: string; records: number; actions: number; themes: number; latestDate: string | null; status: "Pendente" | "Em revisão" | "Escutado" };

const initialFilters: Filters = {
  month: "",
  actionNeighborhoodId: "",
  respondentNeighborhoodId: "",
  actionType: "",
  themeId: ""
};

export function Dashboard() {
  const supabase = useMemo(() => createBrowserSupabaseClient(), []);
  const [actions, setActions] = useState<ActionWithNeighborhood[]>([]);
  const [records, setRecords] = useState<RecordWithRelations[]>([]);
  const [neighborhoods, setNeighborhoods] = useState<Neighborhood[]>([]);
  const [themes, setThemes] = useState<Theme[]>([]);
  const [closures, setClosures] = useState<ActionClosure[]>([]);
  const [debriefs, setDebriefs] = useState<ActionDebrief[]>([]);
  const [snapshots, setSnapshots] = useState<PublicTransparencySnapshot[]>([]);
  const [calendarEvents, setCalendarEvents] = useState<TeamCalendarEvent[]>([]);
  const [calendarMembers, setCalendarMembers] = useState<TeamCalendarEventMember[]>([]);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [weeklyReports, setWeeklyReports] = useState<WeeklyTeamReport[]>([]);
  const [notifications, setNotifications] = useState<InAppNotification[]>([]);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [preferences, setPreferences] = useState<NotificationPreference | null>(null);
  const [onboarding, setOnboarding] = useState<any | null>(null);
  const [filters, setFilters] = useState<Filters>(initialFilters);
  const [territorySearch, setTerritorySearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let ignore = false;

    async function loadDashboard() {
      if (!supabase) {
        setError("Configure NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_ANON_KEY para carregar o dashboard.");
        setLoading(false);
        return;
      }

      const [actionsResult, recordsResult, neighborhoodsResult, themesResult, closuresResult, debriefsResult, snapshotsResult, calendarEventsResult, calendarMembersResult, teamMembersResult, weeklyReportsResult, notificationsResult, userResult] = await Promise.all([
        supabase.from("actions").select("*, neighborhoods:neighborhood_id(id, name)").order("action_date", { ascending: false }),
        supabase.from("listening_records").select("*, actions:action_id(id, title, action_type), neighborhoods:neighborhood_id(id, name), respondent_neighborhoods:respondent_neighborhood_id(id, name), listening_record_themes(themes:theme_id(id, name))").order("date", { ascending: false }),
        supabase.from("neighborhoods").select("*").order("name", { ascending: true }),
        supabase.from("themes").select("*").eq("is_active", true).order("name", { ascending: true }),
        supabase.from("action_closures").select("*"),
        supabase.from("action_debriefs").select("*"),
        supabase.from("public_transparency_snapshots").select("*").in("status", ["approved", "published"]).order("updated_at", { ascending: false }),
        supabase.from("team_calendar_events").select("*").order("starts_at", { ascending: true }),
        supabase.from("team_calendar_event_members").select("*"),
        supabase.from("team_members").select("*").eq("active", true).order("display_name", { ascending: true }),
        supabase.from("weekly_team_reports").select("*").order("week_start", { ascending: false }),
        supabase.from("in_app_notifications").select("*").order("priority", { ascending: false }).order("created_at", { ascending: false }),
        supabase.auth.getUser()
      ]);

      if (ignore) return;

      const user = userResult.data.user;
      if (user) {
        const [prof, pref, onb] = await Promise.all([
          supabase.from("profiles").select("*").eq("id", user.id).single(),
          supabase.from("notification_preferences").select("*").eq("profile_id", user.id).maybeSingle(),
          supabase.from("user_onboarding_state").select("*").eq("profile_id", user.id).maybeSingle()
        ]);
        if (!ignore) {
          setProfile(prof.data as Profile | null);
          setPreferences(pref.data as NotificationPreference | null);
          setOnboarding(onb.data ?? null);
        }
      }

      if (actionsResult.error || recordsResult.error || neighborhoodsResult.error || themesResult.error || closuresResult.error || debriefsResult.error || snapshotsResult.error || calendarEventsResult.error || calendarMembersResult.error || teamMembersResult.error || weeklyReportsResult.error) {
        setError(
          actionsResult.error?.message ??
            recordsResult.error?.message ??
            neighborhoodsResult.error?.message ??
            themesResult.error?.message ??
            closuresResult.error?.message ??
            debriefsResult.error?.message ??
            snapshotsResult.error?.message ??
            calendarEventsResult.error?.message ??
            calendarMembersResult.error?.message ??
            teamMembersResult.error?.message ??
            weeklyReportsResult.error?.message ??
            "Erro ao carregar dados do dashboard."
        );
        setLoading(false);
        return;
      }

      setActions((actionsResult.data ?? []) as ActionWithNeighborhood[]);
      setRecords((recordsResult.data ?? []) as unknown as RecordWithRelations[]);
      setNeighborhoods(neighborhoodsResult.data ?? []);
      setThemes(themesResult.data ?? []);
      setClosures((closuresResult.data ?? []) as ActionClosure[]);
      setDebriefs((debriefsResult.data ?? []) as ActionDebrief[]);
      setSnapshots((snapshotsResult.data ?? []) as PublicTransparencySnapshot[]);
      setCalendarEvents((calendarEventsResult.data ?? []) as TeamCalendarEvent[]);
      setCalendarMembers((calendarMembersResult.data ?? []) as TeamCalendarEventMember[]);
      setTeamMembers((teamMembersResult.data ?? []) as TeamMember[]);
      setWeeklyReports((weeklyReportsResult.data ?? []) as WeeklyTeamReport[]);
      setNotifications((notificationsResult.data ?? []) as InAppNotification[]);
      setLoading(false);
    }

    void loadDashboard();

    return () => {
      ignore = true;
    };
  }, [supabase]);

  const filteredRecords = records.filter((record) => {
    if (filters.month && record.date.slice(0, 7) !== filters.month) return false;
    if (filters.actionNeighborhoodId && record.neighborhood_id !== filters.actionNeighborhoodId) return false;
    if (filters.respondentNeighborhoodId && record.respondent_neighborhood_id !== filters.respondentNeighborhoodId) return false;
    if (filters.actionType && record.actions?.action_type !== filters.actionType) return false;
    if (filters.themeId && !record.listening_record_themes.some((item) => item.themes?.id === filters.themeId)) return false;
    return true;
  });

  const filteredActions = actions.filter((action) => {
    if (filters.month && action.action_date.slice(0, 7) !== filters.month) return false;
    if (filters.actionNeighborhoodId && action.neighborhood_id !== filters.actionNeighborhoodId) return false;
    if (filters.actionType && action.action_type !== filters.actionType) return false;
    return true;
  });

  const actionNeighborhoodIds = new Set(filteredActions.map((action) => action.neighborhood_id).filter(Boolean));
  const respondentNeighborhoodIds = new Set(filteredRecords.map((record) => record.respondent_neighborhood_id).filter(Boolean));
  const recordsWithoutRespondentTerritory = filteredRecords.filter((record) => !record.respondent_neighborhood_id).length;

  const recordsByMonth = countBy(filteredRecords, (record) => record.date.slice(0, 7));
  const themeCounts = countThemes(filteredRecords);
  const themesByNeighborhood = countThemesByNeighborhood(filteredRecords);
  const wordCounts = countWords(filteredRecords);
  const pendingRecords = filteredRecords.filter((record) => record.review_status === "draft");
  const latestRecords = filteredRecords.slice(0, 6);
  const actionsWithOpenDossier = filteredActions.filter((action) => closures.find((closure) => closure.action_id === action.id)?.status !== "closed");
  const actionsWithPendingDebrief = filteredActions.filter((action) => debriefs.find((debrief) => debrief.action_id === action.id)?.status !== "approved");
  const actionsWithDraftRecords = filteredActions.filter((action) => filteredRecords.some((record) => record.action_id === action.id && record.review_status === "draft"));
  const territoryCards = buildTerritoryCards(filteredActions, filteredRecords).filter((item) => item.name.toLocaleLowerCase("pt-BR").includes(territorySearch.toLocaleLowerCase("pt-BR")));
  const maxThemeCount = Math.max(...themeCounts.map((item) => item.count), 1);
  const maxMonthCount = Math.max(...recordsByMonth.map((item) => item.count), 1);
  const latestSnapshot = snapshots[0] ?? null;
  const nextAction = filteredActions[0] ?? null;
  const nextEvent = calendarEvents.find((event) => new Date(event.starts_at) >= new Date() && ["planned", "confirmed"].includes(event.status)) ?? null;
  const nextEventAction = nextEvent ? actions.find((action) => action.id === nextEvent.action_id) ?? null : null;
  const nextEventNeighborhood = nextEvent ? neighborhoods.find((neighborhood) => neighborhood.id === nextEvent.neighborhood_id) ?? null : null;
  const nextEventTeam = nextEvent
    ? calendarMembers
        .filter((membership) => membership.event_id === nextEvent.id)
        .map((membership) => teamMembers.find((member) => member.id === membership.team_member_id)?.display_name)
        .filter(Boolean)
    : [];
  const pendingWeeklyReports = buildWeeklyReportReminderItems(weeklyReports, teamMembers, getStartOfWeekIso(new Date()));
  const pendingDebriefs = buildDebriefReminderItems(actions, debriefs);
  const pendingClosures = buildClosureReminderItems(actions, closures);
  const overdueEvents = buildOverdueEvents(calendarEvents);
  const debriefsWithoutAgenda = buildEventsWithoutAgendaForActions(actions, calendarEvents, { eventType: "devolutiva" });
  const dossiersWithoutAgenda = buildEventsWithoutAgendaForActions(actions, calendarEvents, { eventType: "dossie" });
  const actionsWithoutClosure = actions.filter((action) => action.status === "realizada" && !closures.some((closure) => closure.action_id === action.id && closure.status === "closed"));
  const topNeighborhoods = countBy(
    filteredRecords.filter((record) => Boolean(record.respondent_neighborhoods?.name)),
    (record) => record.respondent_neighborhoods?.name ?? ""
  ).slice(0, 3);
  const actionsByTerritory = countBy(
    filteredActions.filter((action) => Boolean(action.neighborhoods?.name)),
    (action) => action.neighborhoods?.name ?? ""
  ).slice(0, 6);
  const recordsByRespondentTerritory = countBy(
    filteredRecords.filter((record) => Boolean(record.respondent_neighborhoods?.name)),
    (record) => record.respondent_neighborhoods?.name ?? ""
  ).slice(0, 6);
  const reachedRespondentTerritoriesFromActions = new Set(
    filteredRecords
      .filter((record) => filteredActions.some((action) => action.id === record.action_id))
      .map((record) => record.respondent_neighborhood_id)
      .filter(Boolean)
  ).size;
  const respondentQualityMetrics = calculateRespondentTerritoryQuality(
    filteredRecords.length,
    filteredRecords.filter((record) => Boolean(record.respondent_neighborhood_id)).length
  );
  const respondentQualityLabel = getRespondentQualityStatusLabel(respondentQualityMetrics.qualityStatus);
  const actionQualityByAction = buildActionQualityByAction(filteredActions, filteredRecords);
  const actionsWithLowTerritorialCoverage = actionQualityByAction.filter((item) => item.totalRecords > 0 && item.coveragePercent < 80);
  const criticalActionsCount = actionsWithLowTerritorialCoverage.filter((item) => item.coveragePercent < 50).length;
  const attentionActionsCount = actionsWithLowTerritorialCoverage.filter((item) => item.coveragePercent >= 50).length;
  const canSeeTeamGuidance = profile?.role === "admin" || profile?.role === "coordenacao";
  const interviewerGuidance = buildInterviewerGuidance(filteredRecords, teamMembers).slice(0, 6);

  function updateFilter<TField extends keyof Filters>(field: TField, value: Filters[TField]) {
    setFilters((current) => ({ ...current, [field]: value }));
  }

  return (
    <section className="pb-10">
      <PageHeader
        actions={<PrimaryAction href="/acoes/nova" icon={<Plus className="h-4 w-4" />} label="Nova ação" />}
        description="Sínteses territoriais para leitura coletiva"
        filters={(
          <>
            <select aria-label="Período" className="min-h-11 rounded-xl border border-semear-gray bg-white px-3 text-sm font-semibold text-stone-700 shadow-sm outline-none focus:border-semear-green" onChange={(event) => updateFilter("month", event.target.value)} value={filters.month}>
              <option value="">Todo o período</option>
              {recordsByMonth.map((item) => <option key={item.name} value={item.name}>{formatMonth(item.name)}</option>)}
            </select>
            <select aria-label="Território da ação" className="min-h-11 rounded-xl border border-semear-gray bg-white px-3 text-sm font-semibold text-stone-700 shadow-sm outline-none focus:border-semear-green" onChange={(event) => updateFilter("actionNeighborhoodId", event.target.value)} value={filters.actionNeighborhoodId}>
              <option value="">Todos os territórios da ação</option>
              {neighborhoods.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
            </select>
            <select aria-label="Território de referência do entrevistado" className="min-h-11 rounded-xl border border-semear-gray bg-white px-3 text-sm font-semibold text-stone-700 shadow-sm outline-none focus:border-semear-green" onChange={(event) => updateFilter("respondentNeighborhoodId", event.target.value)} value={filters.respondentNeighborhoodId}>
              <option value="">Todos os territórios de referência</option>
              {neighborhoods.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
            </select>
            <select aria-label="Tema" className="min-h-11 rounded-xl border border-semear-gray bg-white px-3 text-sm font-semibold text-stone-700 shadow-sm outline-none focus:border-semear-green" onChange={(event) => updateFilter("themeId", event.target.value)} value={filters.themeId}>
              <option value="">Todos os temas</option>
              {themes.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
            </select>
          </>
        )}
        title="Dashboard de padrões"
      />

      <section className="rounded-2xl border border-semear-gray/80 bg-white p-4 shadow-[0_12px_32px_rgba(23,74,55,0.06)] lg:hidden">
        <div className="flex items-start gap-3">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-semear-green text-semear-yellow">
            <CalendarDays className="h-5 w-5" aria-hidden="true" />
          </div>
          <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-semear-earth">Hoje / próxima operação</p>
            <h3 className="mt-1 text-xl font-semibold text-semear-green">
              {nextEvent ? nextEvent.title : nextAction ? nextAction.title : "Nenhuma operação próxima cadastrada"}
            </h3>
            <p className="mt-1 text-sm leading-6 text-stone-600">
              {nextEvent
                ? `${getEventDateLabel(nextEvent)} · ${nextEventNeighborhood?.name ?? "Sem território"}`
                : nextAction
                  ? `${getActionScheduleLabel(nextAction)} · ${nextAction.neighborhoods?.name ?? "Território da ação não informado"}`
                    : "Cadastre uma ação ou evento para abrir a próxima operação no painel."}
            </p>
          </div>
        </div>

        <div className="mt-4 grid gap-2 sm:grid-cols-2">
          <SecondaryAction href="/escutas/lote" icon={<Keyboard className="h-4 w-4" />} label="Digitar fichas" strong />
          <SecondaryAction href="/escutas?status=draft" icon={<MessageSquareText className="h-4 w-4" />} label="Revisar escutas" strong />
          <SecondaryAction href={nextEvent ? "/agenda" : nextAction ? `/acoes/${nextAction.id}` : "/acoes"} icon={<ClipboardList className="h-4 w-4" />} label={nextEvent ? "Abrir agenda" : "Abrir ação"} />
          <SecondaryAction href={actionsWithOpenDossier[0] ? `/acoes/${actionsWithOpenDossier[0].id}/dossie` : "/acoes"} icon={<FolderCheck className="h-4 w-4" />} label="Fechar dossiê" tone="yellow" />
        </div>
      </section>

      <section className="mt-5 lg:hidden">
        <NotificationsInlinePanel 
          title="Avisos Urgentes" 
          categories={["agenda", "google", "relatorios", "escutas", "transparencia", "memoria"]} 
          href="/avisos" 
          emptyText="Sem avisos urgentes no momento." 
          limit={3}
        />
      </section>

      {onboarding && !onboarding.dismissed_onboarding && (
        <div className="mt-6">
          <OperationalOnboardingCard state={onboarding} onUpdate={(s) => setOnboarding(s)} />
        </div>
      )}

      {!loading && !error && (
        <div className="mt-4">
          <DailyBriefingPanel 
            notifications={notifications} 
            role={profile?.role ?? "equipe"} 
            preferences={preferences} 
            onboardingState={onboarding}
          />
        </div>
      )}

      <section className="hidden overflow-hidden rounded-2xl border border-semear-gray/80 bg-white shadow-[0_12px_32px_rgba(23,74,55,0.06)] lg:block">
        <div className="grid gap-5 p-5 lg:grid-cols-[1fr_25rem] lg:items-center">
          <div className="flex items-start gap-4">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-semear-green text-semear-yellow">
              <Sprout className="h-7 w-7" aria-hidden="true" />
            </div>
            <div>
              <p className="max-w-3xl text-sm leading-6 text-stone-700">
                Este painel reúne os principais indicadores e padrões das escutas realizadas nos territórios. Use os filtros para explorar os dados e apoiar decisões da equipe.
              </p>
              <Link className="mt-2 inline-flex text-sm font-semibold text-semear-green hover:underline" href="/ajuda">Saiba mais sobre os indicadores</Link>
            </div>
          </div>
          <div className="hidden h-24 rounded-xl bg-[linear-gradient(135deg,#eef5e8,#cfe0c2)] lg:block" aria-hidden="true" />
        </div>
      </section>

      {loading ? <StateBox>Carregando dados do dashboard...</StateBox> : null}
      {error ? <StateBox tone="error">{error}</StateBox> : null}

      {!loading && !error ? (
        <>
          <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <MetricCard icon={<ClipboardList className="h-5 w-5" />} label="Total de ações" note="Operação territorial" value={filteredActions.length} />
            <MetricCard icon={<MapPinned className="h-5 w-5" />} label="Bairros onde houve ação" note="Território da ação" value={actionNeighborhoodIds.size} />
            <MetricCard icon={<MessageSquareText className="h-5 w-5" />} label="Total de escutas" note="Escuta territorial" value={filteredRecords.length} />
            <MetricCard icon={<MapPinned className="h-5 w-5" />} label="Bairros de referência dos entrevistados" note="Território de referência" value={respondentNeighborhoodIds.size} />
          </div>

          <section className="mt-4 rounded-2xl border border-semear-gray/80 bg-white p-5 shadow-[0_12px_32px_rgba(23,74,55,0.06)]">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-semear-earth">Qualidade territorial</p>
                <h3 className="mt-2 text-2xl font-semibold tracking-tight text-semear-green">{respondentQualityMetrics.coveragePercent}% de cobertura</h3>
                <p className="mt-2 max-w-3xl text-sm leading-6 text-stone-600">
                  Mostra quantas escutas têm território de referência do entrevistado preenchido. Não é endereço nem geolocalização.
                </p>
              </div>
              <Link className="inline-flex min-h-12 items-center justify-center rounded-xl bg-semear-green px-4 text-sm font-semibold text-white" href="/escutas/revisao-territorial?tab=qualidade">
                Revisar escutas sem território
              </Link>
            </div>
            <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <div className="rounded-xl border border-semear-gray bg-semear-offwhite p-4 text-sm">
                <p className="font-semibold text-semear-green">Total de escutas</p>
                <p className="mt-2 text-2xl font-semibold text-stone-900">{respondentQualityMetrics.totalRecords}</p>
              </div>
              <div className="rounded-xl border border-semear-gray bg-semear-offwhite p-4 text-sm">
                <p className="font-semibold text-semear-green">Com território</p>
                <p className="mt-2 text-2xl font-semibold text-green-800">{respondentQualityMetrics.recordsWithRespondentTerritory}</p>
              </div>
              <div className="rounded-xl border border-semear-gray bg-semear-offwhite p-4 text-sm">
                <p className="font-semibold text-semear-green">Sem território</p>
                <p className="mt-2 text-2xl font-semibold text-amber-900">{respondentQualityMetrics.recordsWithoutRespondentTerritory}</p>
              </div>
              <div className="rounded-xl border border-semear-gray bg-semear-offwhite p-4 text-sm">
                <p className="font-semibold text-semear-green">Status</p>
                <p className="mt-2 inline-flex rounded-full bg-white px-3 py-1 text-sm font-semibold text-stone-800">
                  {respondentQualityLabel.icon} {respondentQualityLabel.label}
                </p>
              </div>
            </div>
            <div className="mt-4 h-2.5 rounded-full bg-semear-green-soft">
              <div className={`h-2.5 rounded-full ${respondentQualityMetrics.qualityStatus === "boa" ? "bg-green-600" : respondentQualityMetrics.qualityStatus === "atenção" ? "bg-amber-500" : "bg-red-600"}`} style={{ width: `${Math.min(respondentQualityMetrics.coveragePercent, 100)}%` }} />
            </div>
          </section>

          <section className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-950">
            <p className="font-semibold text-amber-900">Como ler este indicador</p>
            <p className="mt-1">
              Território de referência indica de onde a pessoa fala, mora, circula ou a qual território se refere. Quando a cobertura está baixa, leituras por bairro devem ser vistas com cautela.
            </p>
            <p className="mt-1 text-xs text-amber-900">
              Cobertura baixa afeta a interpretação de relatórios mensais e snapshots da Transparência Viva.
            </p>
          </section>

          <section className="mt-4 rounded-2xl border border-blue-200 bg-blue-50 p-4 text-sm leading-6 text-blue-900">
            <strong>Leitura territorial:</strong> Uma ação pode acontecer em um bairro e ouvir pessoas de vários territórios.
          </section>

          <section className="mt-4 grid gap-4 xl:grid-cols-2">
            <Panel title="Operação territorial" icon={<MapPinned className="h-5 w-5" />}>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-xl border border-semear-gray bg-semear-offwhite p-4 text-sm">
                  <p className="font-semibold text-semear-green">Escutas coletadas por ação</p>
                  <p className="mt-2 text-stone-700">{filteredActions.length > 0 ? (filteredRecords.length / filteredActions.length).toFixed(1) : "0.0"} em média</p>
                </div>
                <div className="rounded-xl border border-semear-gray bg-semear-offwhite p-4 text-sm">
                  <p className="font-semibold text-semear-green">Territórios de referência alcançados</p>
                  <p className="mt-2 text-stone-700">{reachedRespondentTerritoriesFromActions}</p>
                </div>
              </div>
              {actionsByTerritory.length > 0 ? <SimpleTable headers={["Território da ação", "Ações"]} rows={actionsByTerritory.map((item) => [item.name, item.count.toString()])} /> : <PedagogicEmpty text="Sem ações com território da ação definido neste recorte." />}
            </Panel>

            <Panel title="Escuta territorial" icon={<MessageSquareText className="h-5 w-5" />}>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-xl border border-semear-gray bg-semear-offwhite p-4 text-sm">
                  <p className="font-semibold text-semear-green">Escutas sem território de referência</p>
                  <p className="mt-2 text-stone-700">{recordsWithoutRespondentTerritory}</p>
                </div>
                <div className="rounded-xl border border-semear-gray bg-semear-offwhite p-4 text-sm">
                  <p className="font-semibold text-semear-green">Pendências de revisão</p>
                  <p className="mt-2 text-stone-700">{pendingRecords.length}</p>
                </div>
              </div>
              {recordsByRespondentTerritory.length > 0 ? <SimpleTable headers={["Território de referência", "Escutas"]} rows={recordsByRespondentTerritory.map((item) => [item.name, item.count.toString()])} /> : <PedagogicEmpty text="Sem território de referência preenchido no recorte atual." />}
            </Panel>
          </section>

          <section className="mt-4 rounded-2xl border border-semear-gray/80 bg-white p-5 shadow-[0_12px_32px_rgba(23,74,55,0.06)]">
            <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-semear-earth">Próxima operação</p>
                <h3 className="mt-2 text-2xl font-semibold tracking-tight text-semear-green">{nextEvent ? nextEvent.title : "Atalhos para homologação e primeira banca"}</h3>
                <p className="mt-1 text-sm leading-6 text-stone-600">
                  {nextEvent
                    ? `${getEventDateLabel(nextEvent)} · ${nextEventNeighborhood?.name ?? "Sem território"} · ${nextEvent.status}`
                    : "Acompanhe o andamento dos dossiês e acesse rapidamente suas próximas atividades."}
                </p>
                {respondentQualityMetrics.recordsWithoutRespondentTerritory > 0 ? (
                  <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-950">
                    Há {respondentQualityMetrics.recordsWithoutRespondentTerritory} escutas sem território de referência. Revise antes de publicar sínteses territoriais.
                  </div>
                ) : null}
              </div>
              <div className="flex flex-wrap gap-2">
                <SecondaryAction href="/agenda" icon={<CalendarDays className="h-4 w-4" />} label="Abrir agenda" strong />
                <SecondaryAction href={nextEventAction ? `/acoes/${nextEventAction.id}` : "/acoes"} icon={<ClipboardList className="h-4 w-4" />} label="Abrir ação" />
                <SecondaryAction href="/escutas/lote" icon={<Keyboard className="h-4 w-4" />} label="Digitar fichas" strong />
                {respondentQualityMetrics.recordsWithoutRespondentTerritory > 0 ? <SecondaryAction href="/escutas/revisao-territorial?tab=qualidade" icon={<MapPinned className="h-4 w-4" />} label="Corrigir território" strong /> : null}
                <SecondaryAction href={actionsWithOpenDossier[0] ? `/acoes/${actionsWithOpenDossier[0].id}/dossie` : "/acoes"} icon={<FolderCheck className="h-4 w-4" />} label="Fechar dossiê" tone="yellow" />
              </div>
            </div>
            <div className="mt-4 grid gap-4 lg:grid-cols-3">
              <OperationList count={nextEventTeam.length} title="Equipe escalada" items={nextEventTeam as string[]} empty="Nenhuma equipe vinculada ainda." />
              <OperationList count={pendingClosures.length} title="Dossiê pendente" tone="yellow" items={pendingClosures.slice(0, 3).map((action) => action.title)} />
              <OperationList count={pendingDebriefs.length + pendingWeeklyReports.length} title="Alertas internos" tone="earth" items={[...pendingDebriefs.slice(0, 2).map((action) => `Devolutiva: ${action.title}`), ...pendingWeeklyReports.slice(0, 2).map((member) => `Relatório: ${member}`)]} empty="Sem alertas internos imediatos." />
            </div>
          </section>

          <div className="mt-4 hidden lg:block">
            <InternalRemindersPanel
              title="Lembretes internos"
              description="Sem push ou e-mail. O painel sinaliza atrasos, pendências e lacunas de agenda."
              items={[
                { label: "Eventos atrasados", value: overdueEvents.length, text: overdueEvents.length > 0 ? overdueEvents.slice(0, 4).map((event) => event.title).join(" · ") : "Sem evento atrasado.", href: "/agenda", tone: overdueEvents.length > 0 ? "danger" : "default" },
                { label: "Relatórios pendentes", value: pendingWeeklyReports.length, text: pendingWeeklyReports.length > 0 ? pendingWeeklyReports.slice(0, 4).join(" · ") : "Sem relatório pendente.", href: "/memoria", tone: pendingWeeklyReports.length > 0 ? "warning" : "default" },
                { label: "Devolutivas sem agenda", value: debriefsWithoutAgenda.length, text: debriefsWithoutAgenda.length > 0 ? debriefsWithoutAgenda.slice(0, 4).map((action) => action.title).join(" · ") : "Sem devolutiva sem agenda.", href: "/acoes", tone: debriefsWithoutAgenda.length > 0 ? "warning" : "default" },
                { label: "Dossiês sem agenda", value: dossiersWithoutAgenda.length, text: dossiersWithoutAgenda.length > 0 ? dossiersWithoutAgenda.slice(0, 4).map((action) => action.title).join(" · ") : "Sem dossiê sem agenda.", href: "/acoes", tone: dossiersWithoutAgenda.length > 0 ? "warning" : "default" },
                { label: "Ações realizadas sem fechamento", value: actionsWithoutClosure.length, text: actionsWithoutClosure.length > 0 ? actionsWithoutClosure.slice(0, 4).map((action) => action.title).join(" · ") : "Sem ação realizada aguardando fechamento.", href: "/acoes", tone: actionsWithoutClosure.length > 0 ? "warning" : "default" },
              ]}
            />
          </div>

          <div className="mt-4">
            <NotificationsInlinePanel
              title="Pendências e avisos"
              categories={["agenda", "google", "relatorios", "debrief_dossie", "escutas", "transparencia", "memoria"]}
              href="/avisos"
              emptyText="Sem avisos urgentes neste momento."
              limit={3}
            />
          </div>

          <section className="mt-4 grid gap-4 lg:hidden">
            {respondentQualityMetrics.recordsWithoutRespondentTerritory > 0 ? (
              <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-950">
                Há {respondentQualityMetrics.recordsWithoutRespondentTerritory} escutas sem território de referência. Revise antes de publicar sínteses territoriais.
                <Link className="mt-3 inline-flex min-h-11 w-full items-center justify-center rounded-xl bg-semear-green px-4 font-semibold text-white" href="/escutas/revisao-territorial?tab=qualidade">
                  Corrigir território
                </Link>
              </div>
            ) : null}

            <Panel title="Ações com baixa cobertura territorial" icon={<MapPinned className="h-5 w-5" />}>
              <p className="text-sm text-stone-600">Crítica (&lt; 50%): {criticalActionsCount} · Atenção (50% a 79%): {attentionActionsCount}</p>
              <div className="mt-3">
                <TerritorialQualityByAction items={actionsWithLowTerritorialCoverage.slice(0, 4)} />
              </div>
            </Panel>

            <Panel title="Pendências do dia" icon={<Layers3 className="h-5 w-5" />}>
              <div className="grid gap-3 sm:grid-cols-2">
                <OperationList count={actionsWithOpenDossier.length} title="Dossiês abertos" items={actionsWithOpenDossier.slice(0, 3).map((action) => action.title)} empty="Nenhum dossiê aberto." tone="yellow" />
                <OperationList count={actionsWithPendingDebrief.length} title="Devolutivas pendentes" items={actionsWithPendingDebrief.slice(0, 3).map((action) => action.title)} empty="Nenhuma devolutiva pendente." tone="earth" />
              </div>
            </Panel>

            <InternalRemindersPanel
              title="Lembretes internos"
              description="Sem push ou e-mail. Use estes alertas para orientar a próxima operação."
              items={[
                { label: "Eventos atrasados", value: overdueEvents.length, text: overdueEvents.length > 0 ? overdueEvents.slice(0, 3).map((event) => event.title).join(" · ") : "Sem evento atrasado.", href: "/agenda", tone: overdueEvents.length > 0 ? "danger" : "default" },
                { label: "Relatórios pendentes", value: pendingWeeklyReports.length, text: pendingWeeklyReports.length > 0 ? pendingWeeklyReports.slice(0, 3).join(" · ") : "Sem relatório pendente.", href: "/memoria", tone: pendingWeeklyReports.length > 0 ? "warning" : "default" },
                { label: "Devolutivas sem agenda", value: debriefsWithoutAgenda.length, text: debriefsWithoutAgenda.length > 0 ? debriefsWithoutAgenda.slice(0, 3).map((action) => action.title).join(" · ") : "Sem devolutiva sem agenda.", href: "/acoes", tone: debriefsWithoutAgenda.length > 0 ? "warning" : "default" },
                { label: "Dossiês sem agenda", value: dossiersWithoutAgenda.length, text: dossiersWithoutAgenda.length > 0 ? dossiersWithoutAgenda.slice(0, 3).map((action) => action.title).join(" · ") : "Sem dossiê sem agenda.", href: "/acoes", tone: dossiersWithoutAgenda.length > 0 ? "warning" : "default" },
                { label: "Ações realizadas sem fechamento", value: actionsWithoutClosure.length, text: actionsWithoutClosure.length > 0 ? actionsWithoutClosure.slice(0, 3).map((action) => action.title).join(" · ") : "Sem ação realizada aguardando fechamento.", href: "/acoes", tone: actionsWithoutClosure.length > 0 ? "warning" : "default" },
              ]}
            />

            <Panel title="Padrões resumidos" icon={<BarChart3 className="h-5 w-5" />}>
              <div className="grid gap-4">
                <CompactRanking title="Top 3 temas" items={themeCounts.slice(0, 3).map((item) => `${item.name} (${item.count})`)} empty="Nenhum tema marcado." />
                <CompactRanking title="Top 3 palavras" items={wordCounts.slice(0, 3).map((item) => `${item.name} (${item.count})`)} empty="Nenhuma palavra recorrente." />
                <CompactRanking title="Territórios de referência com mais escutas" items={topNeighborhoods.map((item) => `${item.name} (${item.count})`)} empty="Sem território de referência no recorte." />
              </div>
            </Panel>
          </section>

          {filteredActions.length === 0 && filteredRecords.length === 0 ? (
            <EmptyDashboard />
          ) : (
            <>
              <div className="mt-4 hidden gap-4 lg:grid xl:grid-cols-4">
                <Panel title="Temas mais recorrentes" icon={<Tag className="h-5 w-5" />}>
                  {themeCounts.length > 0 ? (
                    <div className="space-y-3">
                      {themeCounts.slice(0, 7).map((item) => (
                        <div className="grid grid-cols-[minmax(0,7rem)_1fr_2rem] items-center gap-3 text-sm" key={item.name}>
                          <span className="truncate font-semibold text-semear-green">{item.name}</span>
                          <div className="h-2.5 rounded-full bg-semear-green-soft">
                            <div className="h-2.5 rounded-full bg-semear-green" style={{ width: `${(item.count / maxThemeCount) * 100}%` }} />
                          </div>
                          <span className="text-right font-semibold text-stone-700">{item.count}</span>
                        </div>
                      ))}
                    </div>
                  ) : <PedagogicEmpty text="Nenhum tema foi marcado nas escutas filtradas." />}
                </Panel>

                <Panel title="Escutas por mês" icon={<CalendarDays className="h-5 w-5" />}>
                  {recordsByMonth.length > 0 ? (
                    <div className="flex h-40 items-end gap-3 border-b border-l border-semear-gray px-3 pb-2">
                      {recordsByMonth.slice(-6).map((item) => (
                        <div className="flex flex-1 flex-col items-center gap-2" key={item.name}>
                          <span className="text-xs font-semibold text-semear-green">{item.count}</span>
                          <div className="w-full rounded-t-xl bg-semear-green" style={{ height: `${Math.max((item.count / maxMonthCount) * 110, 12)}px` }} />
                          <span className="text-[0.68rem] text-stone-500">{formatMonthShort(item.name)}</span>
                        </div>
                      ))}
                    </div>
                  ) : <PedagogicEmpty text="Ainda não há escutas com data no recorte selecionado." />}
                </Panel>

                <Panel title="Temas por território de referência" icon={<BarChart3 className="h-5 w-5" />}>
                  {themesByNeighborhood.length > 0 ? (
                    <SimpleTable headers={["Território ref.", "Tema", "Qtd."]} rows={themesByNeighborhood.slice(0, 6).map((item) => [item.neighborhood, item.theme, item.count.toString()])} />
                  ) : <PedagogicEmpty text="Marque temas em escutas com território de referência para formar essa leitura." />}
                </Panel>

                <Panel title="Palavras recorrentes" icon={<MessageSquareText className="h-5 w-5" />}>
                  {wordCounts.length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                      {wordCounts.slice(0, 16).map((item) => (
                        <span className="rounded-full border border-semear-gray bg-semear-offwhite px-2.5 py-1 text-xs font-semibold text-stone-700" key={item.name}>
                          {item.name} <span className="text-semear-earth">{item.count}</span>
                        </span>
                      ))}
                    </div>
                  ) : <PedagogicEmpty text="Preencha o campo palavras usadas pela pessoa para ver recorrências." />}
                </Panel>
              </div>

              <section className="mt-4 rounded-2xl border border-semear-gray/80 bg-white p-5 shadow-[0_12px_32px_rgba(23,74,55,0.06)]">
                <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                  <div className="flex items-start gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-semear-green-soft text-semear-green">
                      <MapIcon className="h-5 w-5" aria-hidden="true" />
                    </div>
                    <div>
                      <h3 className="text-xl font-semibold text-semear-green">Mapa-lista territorial</h3>
                      <p className="mt-1 text-sm text-stone-600">Lista viva dos bairros de referência dos entrevistados neste recorte.</p>
                    </div>
                  </div>
                  <div className="relative w-full max-w-sm">
                    <Search className="pointer-events-none absolute left-3 top-3.5 h-4 w-4 text-stone-400" aria-hidden="true" />
                    <input className="min-h-11 w-full rounded-xl border border-semear-gray bg-white pl-9 pr-3 text-sm outline-none focus:border-semear-green" onChange={(event) => setTerritorySearch(event.target.value)} placeholder="Buscar território de referência..." value={territorySearch} />
                  </div>
                </div>
                <div className="mt-4 grid gap-3 md:grid-cols-2 2xl:grid-cols-4">
                  {territoryCards.slice(0, 8).map((territory) => (
                    <TerritoryCard key={territory.name} territory={territory} />
                  ))}
                </div>
                {territoryCards.length === 0 ? <PedagogicEmpty text="Nenhum território de referência encontrado neste recorte. Ajuste os filtros ou revise as escutas." /> : null}
              </section>

              <section className="mt-4 rounded-2xl border border-semear-gray/80 bg-white p-5 shadow-[0_12px_32px_rgba(23,74,55,0.06)]">
                <div className="mb-4">
                  <h3 className="text-xl font-semibold text-semear-green">Ações com baixa cobertura territorial</h3>
                  <p className="mt-1 text-sm text-stone-600">
                    Crítica (&lt; 50%): {criticalActionsCount} · Atenção (50% a 79%): {attentionActionsCount}
                  </p>
                </div>
                <TerritorialQualityByAction items={actionsWithLowTerritorialCoverage.slice(0, 8)} />
              </section>

              {canSeeTeamGuidance && interviewerGuidance.length > 0 ? (
                <section className="mt-4 rounded-2xl border border-semear-gray/80 bg-white p-5 shadow-[0_12px_32px_rgba(23,74,55,0.06)]">
                  <h3 className="text-xl font-semibold text-semear-green">Onde orientar a equipe</h3>
                  <p className="mt-1 text-sm text-stone-600">
                    Visão interna para coordenação e admin, focada em suporte e treinamento para melhorar o preenchimento territorial.
                  </p>
                  <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                    {interviewerGuidance.map((item) => (
                      <div className="rounded-xl border border-semear-gray bg-semear-offwhite p-4 text-sm" key={item.teamMemberId}>
                        <p className="font-semibold text-semear-green">{item.teamMemberName}</p>
                        <p className="mt-2 text-stone-700">Escutas sem território: <strong>{item.recordsWithoutRespondentTerritory}</strong></p>
                        <p className="text-stone-700">Cobertura atual: <strong>{item.coveragePercent}%</strong></p>
                      </div>
                    ))}
                  </div>
                </section>
              ) : null}

              <section className="mt-4 rounded-2xl border border-semear-gray/80 bg-white p-5 shadow-[0_12px_32px_rgba(23,74,55,0.06)]">
                <div className="grid gap-5 lg:grid-cols-[1fr_28rem] lg:items-center">
                  <div className="flex items-start gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-semear-green-soft text-semear-green">
                      <ShieldCheck className="h-5 w-5" aria-hidden="true" />
                    </div>
                    <div>
                      <h3 className="text-xl font-semibold text-semear-green">Transparência Viva (futura área pública)</h3>
                      <p className="mt-1 text-sm leading-6 text-stone-600">
                        Aqui fica o acompanhamento dos snapshots aprovados para publicação pública, sempre por síntese agregada e sem dados brutos.
                      </p>
                    </div>
                  </div>
                  <div className="rounded-xl border border-semear-gray bg-semear-offwhite p-4">
                    <p className="text-sm font-semibold text-semear-green">{latestSnapshot ? latestSnapshot.title : "Área pública em desenvolvimento"}</p>
                    <p className="mt-1 text-xs text-stone-500">{latestSnapshot ? `Status: ${latestSnapshot.status}` : "Em breve disponível para a comunidade."}</p>
                    <Link className="mt-3 inline-flex min-h-10 items-center rounded-xl border border-semear-green/15 bg-white px-3 text-sm font-semibold text-semear-green" href="/transparencia/snapshots">Saiba mais</Link>
                  </div>
                </div>
              </section>
            </>
          )}

          <FilterBar title="Filtros detalhados" onClear={() => setFilters(initialFilters)}>
            <FilterField label="Mês">
              <input className={filterControlClassName} onChange={(event) => updateFilter("month", event.target.value)} type="month" value={filters.month} />
            </FilterField>
            <FilterField label="Território da ação">
              <select className={filterControlClassName} onChange={(event) => updateFilter("actionNeighborhoodId", event.target.value)} value={filters.actionNeighborhoodId}>
                <option value="">Todos os territórios da ação</option>
                {neighborhoods.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
              </select>
            </FilterField>
            <FilterField label="Território de referência do entrevistado">
              <select className={filterControlClassName} onChange={(event) => updateFilter("respondentNeighborhoodId", event.target.value)} value={filters.respondentNeighborhoodId}>
                <option value="">Todos os territórios de referência</option>
                {neighborhoods.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
              </select>
            </FilterField>
            <FilterField label="Tipo de ação">
              <select className={filterControlClassName} onChange={(event) => updateFilter("actionType", event.target.value)} value={filters.actionType}>
                <option value="">Todos os tipos</option>
                {actionTypeOptions.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
              </select>
            </FilterField>
            <FilterField label="Tema">
              <select className={filterControlClassName} onChange={(event) => updateFilter("themeId", event.target.value)} value={filters.themeId}>
                <option value="">Todos os temas</option>
                {themes.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
              </select>
            </FilterField>
          </FilterBar>
        </>
      ) : null}
    </section>
  );
}

function PrimaryAction({ href, icon, label }: { href: string; icon: ReactNode; label: string }) {
  return (
    <Link className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-semear-yellow px-4 text-sm font-semibold text-semear-green shadow-sm transition hover:brightness-95 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-semear-green" href={href}>
      {icon}
      {label}
    </Link>
  );
}

function SecondaryAction({ href, icon, label, tone = "green", strong = false }: { href: string; icon: ReactNode; label: string; tone?: "green" | "yellow"; strong?: boolean }) {
  const className = tone === "yellow"
    ? "bg-semear-yellow text-semear-green"
    : strong
      ? "bg-semear-green text-white"
      : "border border-semear-green/15 bg-white text-semear-green";
  return <Link className={`inline-flex min-h-11 items-center gap-2 rounded-xl px-4 text-sm font-semibold shadow-sm ${className}`} href={href}>{icon}{label}</Link>;
}

function OperationList({ title, items, count, empty = "Nenhum item.", tone = "green" }: { title: string; items: string[]; count: number; empty?: string; tone?: "green" | "yellow" | "earth" }) {
  const toneClass = tone === "yellow" ? "bg-semear-yellow text-semear-green" : tone === "earth" ? "bg-semear-earth text-white" : "bg-green-100 text-green-800";
  return (
    <div className="rounded-xl border border-semear-gray bg-white p-4">
      <div className="flex items-center gap-2">
        <p className="font-semibold text-semear-green">{title}</p>
        <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${toneClass}`}>{count}</span>
      </div>
      {items.length > 0 ? (
        <ul className="mt-3 divide-y divide-semear-gray text-sm leading-6 text-stone-700">
          {items.map((item) => <li className="py-2" key={item}>{item}</li>)}
        </ul>
      ) : (
        <p className="mt-3 text-sm text-stone-500">{empty}</p>
      )}
    </div>
  );
}

function CompactRanking({ title, items, empty }: { title: string; items: string[]; empty: string }) {
  return (
    <div className="rounded-xl border border-semear-gray bg-semear-offwhite/70 p-4">
      <p className="text-sm font-semibold text-semear-green">{title}</p>
      {items.length > 0 ? (
        <ul className="mt-3 space-y-2 text-sm leading-6 text-stone-700">
          {items.map((item) => (
            <li className="rounded-xl bg-white px-3 py-2" key={item}>
              {item}
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-3 text-sm text-stone-500">{empty}</p>
      )}
    </div>
  );
}

function Panel({ title, icon, children }: { title: string; icon: ReactNode; children: ReactNode }) {
  return (
    <section className="rounded-2xl border border-semear-gray/80 bg-white p-4 shadow-[0_12px_32px_rgba(23,74,55,0.06)]">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-semear-green-soft text-semear-green">{icon}</div>
          <h3 className="font-semibold text-semear-green">{title}</h3>
        </div>
        <span className="text-xs font-semibold text-semear-green">Ver todos</span>
      </div>
      {children}
    </section>
  );
}

function SimpleTable({ headers, rows }: { headers: string[]; rows: string[][] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-sm">
        <thead className="text-xs uppercase tracking-[0.12em] text-stone-500">
          <tr>{headers.map((header) => <th className="border-b border-semear-gray pb-2 pr-3" key={header}>{header}</th>)}</tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.join("|")}>{row.map((cell, index) => <td className="border-b border-semear-gray/70 py-2.5 pr-3 text-stone-700" key={`${cell}-${index}`}>{cell}</td>)}</tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function TerritoryCard({ territory }: { territory: TerritoryCardData }) {
  return (
    <article className="rounded-xl border border-semear-gray bg-white p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h4 className="font-semibold text-semear-green">{territory.name}</h4>
          <p className="mt-1 text-xs text-stone-500">{territory.status}</p>
        </div>
        <span className={`rounded-full px-3 py-1 text-xs font-semibold ${territory.status === "Escutado" ? "bg-green-50 text-green-800" : territory.status === "Em revisão" ? "bg-amber-50 text-amber-900" : "bg-orange-50 text-orange-800"}`}>
          {territory.status}
        </span>
      </div>
      <div className="mt-4 grid grid-cols-4 gap-2 text-xs">
        <TerritoryStat label="Escutas" value={territory.records.toString()} />
        <TerritoryStat label="Temas" value={territory.themes.toString()} />
        <TerritoryStat label="Ações" value={territory.actions.toString()} />
        <TerritoryStat label="Última escuta" value={territory.latestDate ? new Date(`${territory.latestDate}T00:00:00`).toLocaleDateString("pt-BR") : "--"} />
      </div>
    </article>
  );
}

function TerritoryStat({ label, value }: { label: string; value: string }) {
  return <div><p className="text-stone-500">{label}</p><p className="mt-1 font-semibold text-stone-900">{value}</p></div>;
}

function StateBox({ children, tone = "neutral" }: { children: ReactNode; tone?: "neutral" | "error" }) {
  return <div className={`mt-5 rounded-xl p-5 text-sm shadow-soft ${tone === "error" ? "border border-red-200 bg-red-50 text-red-800" : "border border-semear-gray bg-white text-stone-600"}`}>{children}</div>;
}

function PedagogicEmpty({ text }: { text: string }) {
  return <div className="rounded-xl border border-dashed border-semear-green/25 bg-semear-offwhite p-4 text-sm leading-6 text-stone-600">{text}</div>;
}

function EmptyDashboard() {
  return (
    <div className="mt-4 rounded-xl border border-dashed border-semear-green/25 bg-white p-8 text-center">
      <h3 className="text-lg font-semibold text-semear-green">Ainda não há dados para sintetizar</h3>
      <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-stone-600">Você ainda não tem escutas neste recorte. Comece digitando fichas de uma ação.</p>
      <Link className="mt-4 inline-flex min-h-11 items-center rounded-xl bg-semear-yellow px-4 text-sm font-semibold text-semear-green" href="/escutas/lote">Digitar fichas</Link>
    </div>
  );
}

function buildTerritoryCards(actions: ActionWithNeighborhood[], records: RecordWithRelations[]): TerritoryCardData[] {
  const map = new Map<string, { name: string; records: number; actions: number; themes: Set<string>; latestDate: string | null; draftRecords: number }>();

  actions.forEach((action) => {
    const name = action.neighborhoods?.name ?? "Sem território";
    const current = map.get(name) ?? { name, records: 0, actions: 0, themes: new Set<string>(), latestDate: null, draftRecords: 0 };
    current.actions += 1;
    map.set(name, current);
  });

  records.forEach((record) => {
    const name = record.respondent_neighborhoods?.name ?? "Não informado";
    const current = map.get(name) ?? { name, records: 0, actions: 0, themes: new Set<string>(), latestDate: null, draftRecords: 0 };
    current.records += 1;
    if (record.review_status === "draft") current.draftRecords += 1;
    if (!current.latestDate || record.date > current.latestDate) current.latestDate = record.date;
    record.listening_record_themes.forEach((item) => {
      if (item.themes?.name) current.themes.add(item.themes.name);
    });
    map.set(name, current);
  });

  return Array.from(map.values()).map((item): TerritoryCardData => {
    const status: TerritoryCardData["status"] = item.records === 0 ? "Pendente" : item.draftRecords > 0 ? "Em revisão" : "Escutado";
    return {
      name: item.name,
      records: item.records,
      actions: item.actions,
      themes: item.themes.size,
      latestDate: item.latestDate,
      status
    };
  }).sort((a, b) => b.records - a.records || a.name.localeCompare(b.name));
}

function countBy<TItem>(items: TItem[], getName: (item: TItem) => string): CountItem[] {
  const map = new Map<string, number>();
  items.forEach((item) => {
    const name = getName(item);
    if (name) map.set(name, (map.get(name) ?? 0) + 1);
  });
  return Array.from(map.entries()).map(([name, count]) => ({ name, count })).sort((a, b) => a.name.localeCompare(b.name));
}

function countThemes(records: RecordWithRelations[]): CountItem[] {
  const map = new Map<string, number>();
  records.forEach((record) => {
    record.listening_record_themes.forEach((item) => {
      if (item.themes?.name) map.set(item.themes.name, (map.get(item.themes.name) ?? 0) + 1);
    });
  });
  return Array.from(map.entries()).map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count);
}

function countThemesByNeighborhood(records: RecordWithRelations[]): ThemeNeighborhoodCount[] {
  const map = new Map<string, { neighborhood: string; theme: string; count: number }>();
  records.forEach((record) => {
    const neighborhood = record.respondent_neighborhoods?.name ?? "Não informado";
    record.listening_record_themes.forEach((item) => {
      if (!item.themes?.name) return;
      const key = `${neighborhood}|${item.themes.name}`;
      const current = map.get(key);
      map.set(key, { neighborhood, theme: item.themes.name, count: (current?.count ?? 0) + 1 });
    });
  });
  return Array.from(map.values()).sort((a, b) => b.count - a.count);
}

function countWords(records: RecordWithRelations[]): CountItem[] {
  const map = new Map<string, number>();
  records.forEach((record) => {
    record.words_used
      ?.split(/[,;\n]+/)
      .map((word) => word.trim().toLocaleLowerCase("pt-BR"))
      .filter(Boolean)
      .forEach((word) => map.set(word, (map.get(word) ?? 0) + 1));
  });
  return Array.from(map.entries()).map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
}

function formatMonth(value: string) {
  const [year, month] = value.split("-");
  return new Date(Number(year), Number(month) - 1, 1).toLocaleDateString("pt-BR", {
    month: "long",
    year: "numeric"
  });
}

function formatMonthShort(value: string) {
  const [year, month] = value.split("-");
  return new Date(Number(year), Number(month) - 1, 1).toLocaleDateString("pt-BR", {
    month: "short"
  });
}

function buildActionQualityByAction(actions: ActionWithNeighborhood[], records: RecordWithRelations[]): TerritorialQualityByActionItem[] {
  return actions
    .map((action) => {
      const actionRecords = records.filter((record) => record.action_id === action.id);
      const totalRecords = actionRecords.length;
      const withTerritory = actionRecords.filter((record) => Boolean(record.respondent_neighborhood_id)).length;
      const metrics = calculateRespondentTerritoryQuality(totalRecords, withTerritory);
      return {
        actionId: action.id,
        actionTitle: action.title,
        actionDate: action.action_date,
        actionNeighborhood: action.neighborhoods?.name ?? "Território da ação não informado",
        totalRecords,
        recordsWithoutRespondentTerritory: metrics.recordsWithoutRespondentTerritory,
        coveragePercent: metrics.coveragePercent,
        status: metrics.qualityStatus
      };
    })
    .sort((a, b) => a.coveragePercent - b.coveragePercent || b.recordsWithoutRespondentTerritory - a.recordsWithoutRespondentTerritory || b.totalRecords - a.totalRecords);
}

function buildInterviewerGuidance(records: RecordWithRelations[], teamMembers: TeamMember[]) {
  const byInterviewer = new Map<string, { total: number; withoutTerritory: number }>();
  records.forEach((record) => {
    const interviewerId = record.interviewer_team_member_id;
    if (!interviewerId) return;
    const current = byInterviewer.get(interviewerId) ?? { total: 0, withoutTerritory: 0 };
    current.total += 1;
    if (!record.respondent_neighborhood_id) current.withoutTerritory += 1;
    byInterviewer.set(interviewerId, current);
  });

  return Array.from(byInterviewer.entries())
    .map(([teamMemberId, totals]) => {
      const coveragePercent = totals.total > 0 ? Math.round(((totals.total - totals.withoutTerritory) / totals.total) * 1000) / 10 : 0;
      return {
        teamMemberId,
        teamMemberName: teamMembers.find((member) => member.id === teamMemberId)?.display_name ?? "Membro sem cadastro",
        recordsWithoutRespondentTerritory: totals.withoutTerritory,
        coveragePercent,
        totalRecords: totals.total
      };
    })
    .filter((item) => item.recordsWithoutRespondentTerritory > 0)
    .sort((a, b) => b.recordsWithoutRespondentTerritory - a.recordsWithoutRespondentTerritory || a.coveragePercent - b.coveragePercent);
}
