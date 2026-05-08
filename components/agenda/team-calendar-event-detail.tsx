"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeft, CalendarCheck2, Edit3, FileText, LibraryBig, MapPin, UsersRound } from "lucide-react";
import type {
  Action,
  GoogleCalendarSyncLog,
  Neighborhood,
  Profile,
  ProjectMemoryEntry,
  TeamCalendarAttendanceStatus,
  TeamCalendarEvent,
  TeamCalendarEventMember,
  TeamMember,
  WeeklyTeamReport,
} from "@/lib/database.types";
import {
  getEventDateLabel,
  getGoogleCalendarSyncStatusLabel,
  getGoogleCalendarSyncStatusTone,
  getTeamCalendarAttendanceLabel,
  getTeamCalendarAttendanceTone,
  getTeamCalendarEventStatusLabel,
  getTeamCalendarEventStatusTone,
  getTeamCalendarEventTypeLabel,
  teamCalendarAttendanceOptions,
} from "@/lib/team-calendar";
import {
  GOOGLE_CALENDAR_CONNECT_PENDING_KEY,
  GOOGLE_CALENDAR_CONNECT_RESULT_KEY,
  GOOGLE_CALENDAR_OAUTH_SCOPE,
} from "@/lib/google-calendar/browser";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";

type EventDetailProps = {
  eventId: string;
};

type EventWithRelations = TeamCalendarEvent & {
  actions: Pick<Action, "id" | "title" | "action_date"> | null;
  neighborhoods: Pick<Neighborhood, "id" | "name"> | null;
};

type WeeklyReportWithMember = WeeklyTeamReport & {
  team_members: Pick<TeamMember, "id" | "display_name"> | null;
};

type SyncAction = "create" | "update" | "cancel" | "unlink";
type ConnectionAction = "connect" | "disconnect";
type GoogleConnectionStatus = {
  enabled: boolean;
  calendar_id: string | null;
  service_account_available: boolean;
  oauth_client_ready: boolean;
  oauth_connection_ready: boolean;
  auth_mode: "service_account" | "oauth_user" | "not_configured";
  requires_reconnect: boolean;
  connection: {
    connected: boolean;
    provider_user_email: string | null;
    has_refresh_token: boolean;
    updated_at: string;
  } | null;
};

export function TeamCalendarEventDetail({ eventId }: EventDetailProps) {
  const supabase = useMemo(() => createBrowserSupabaseClient(), []);
  const [event, setEvent] = useState<EventWithRelations | null>(null);
  const [memberships, setMemberships] = useState<TeamCalendarEventMember[]>([]);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [weeklyReports, setWeeklyReports] = useState<WeeklyReportWithMember[]>([]);
  const [memoryEntries, setMemoryEntries] = useState<ProjectMemoryEntry[]>([]);
  const [syncLogs, setSyncLogs] = useState<GoogleCalendarSyncLog[]>([]);
  const [syncAuthors, setSyncAuthors] = useState<Record<string, string>>({});
  const [currentProfile, setCurrentProfile] = useState<Pick<Profile, "id" | "role"> | null>(null);
  const [googleConnection, setGoogleConnection] = useState<GoogleConnectionStatus | null>(null);
  const [syncMessage, setSyncMessage] = useState<{ tone: "success" | "error" | "info"; text: string; hint?: string; hasExternalEvent?: boolean } | null>(null);
  const [syncActionLoading, setSyncActionLoading] = useState<SyncAction | null>(null);
  const [connectionActionLoading, setConnectionActionLoading] = useState<ConnectionAction | null>(null);
  const [reloadToken, setReloadToken] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const canManage = currentProfile?.role === "admin" || currentProfile?.role === "coordenacao";
  const linkedTeamMember = teamMembers.find((member) => member.profile_id === currentProfile?.id) ?? null;
  const ownMembership = linkedTeamMember ? memberships.find((membership) => membership.team_member_id === linkedTeamMember.id) ?? null : null;
  const participantMembers = memberships
    .map((membership) => teamMembers.find((member) => member.id === membership.team_member_id))
    .filter(Boolean) as TeamMember[];
  const membersWithoutEmail = participantMembers.filter((member) => !member.email?.trim()).map((member) => member.display_name);
  const membersWithEmailCount = participantMembers.filter((member) => member.email?.trim()).length;
  const hasPendingLocalChanges =
    Boolean(event?.google_synced_at) &&
    Boolean(event?.updated_at) &&
    ["synced", "cancelled"].includes(event?.google_sync_status ?? "") &&
    new Date(event!.updated_at).getTime() > new Date(event!.google_synced_at!).getTime();
  const syncUnavailable = googleConnection ? !googleConnection.enabled || googleConnection.auth_mode === "not_configured" : false;
  const shouldOfferReconnect = Boolean(
    googleConnection?.requires_reconnect ||
      syncMessage?.text?.toLowerCase().includes("reconecte") ||
      syncMessage?.text?.toLowerCase().includes("autenticacao")
  );
  const connectionLabel =
    googleConnection?.auth_mode === "service_account"
      ? "Service account institucional ativa"
      : googleConnection?.connection?.provider_user_email
        ? `Conexao Google: ${googleConnection.connection.provider_user_email}`
        : googleConnection?.enabled
          ? "Google Calendar ainda nao conectado"
          : "Google Calendar desabilitado neste ambiente";

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const rawResult = window.sessionStorage.getItem(GOOGLE_CALENDAR_CONNECT_RESULT_KEY);
    if (!rawResult) {
      return;
    }

    window.sessionStorage.removeItem(GOOGLE_CALENDAR_CONNECT_RESULT_KEY);

    try {
      const parsed = JSON.parse(rawResult) as { tone?: "success" | "error"; text?: string };
      if (parsed?.text) {
        setSyncMessage({
          tone: parsed.tone === "error" ? "error" : "success",
          text: parsed.text,
        });
      }
    } catch {
      // Ignora payloads corrompidos no sessionStorage.
    }
  }, []);

  useEffect(() => {
    let ignore = false;

    async function loadData() {
      if (!supabase) {
        setError("Configure NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_ANON_KEY para usar a agenda.");
        setLoading(false);
        return;
      }

      const userResult = await supabase.auth.getUser();
      const userId = userResult.data.user?.id;

      const googleConnectionResultPromise = userId
        ? fetch("/api/google-calendar/connection", { cache: "no-store" })
            .then(async (response) => {
              const payload = (await response.json().catch(() => null)) as GoogleConnectionStatus | { error?: string } | null;
              if (!response.ok || (payload && "error" in payload && payload.error)) {
                return { data: null, error: payload && "error" in payload ? payload.error ?? "Erro ao carregar conexao Google." : "Erro ao carregar conexao Google." };
              }

              return { data: payload as GoogleConnectionStatus, error: null };
            })
        : Promise.resolve({ data: null, error: null as string | null });

      const [profileResult, eventResult, membershipsResult, teamMembersResult, weeklyReportsResult, memoryEntriesResult, syncLogsResult, googleConnectionResult] = await Promise.all([
        userId ? supabase.from("profiles").select("id, role").eq("id", userId).maybeSingle() : Promise.resolve({ data: null, error: null }),
        supabase.from("team_calendar_events").select("*, actions:action_id(id, title, action_date), neighborhoods:neighborhood_id(id, name)").eq("id", eventId).single(),
        supabase.from("team_calendar_event_members").select("*").eq("event_id", eventId),
        supabase.from("team_members").select("*").eq("active", true).order("display_name", { ascending: true }),
        supabase.from("weekly_team_reports").select("*, team_members:team_member_id(id, display_name)").eq("team_calendar_event_id", eventId).order("week_start", { ascending: false }),
        supabase.from("project_memory_entries").select("*").eq("team_calendar_event_id", eventId).order("entry_date", { ascending: false }),
        supabase.from("google_calendar_sync_logs").select("*").eq("event_id", eventId).order("synced_at", { ascending: false }),
        googleConnectionResultPromise,
      ]);

      if (ignore) return;

      if (profileResult.error || eventResult.error || membershipsResult.error || teamMembersResult.error || weeklyReportsResult.error || memoryEntriesResult.error || syncLogsResult.error || googleConnectionResult.error) {
        setError(
          profileResult.error?.message ??
            eventResult.error?.message ??
            membershipsResult.error?.message ??
            teamMembersResult.error?.message ??
            weeklyReportsResult.error?.message ??
            memoryEntriesResult.error?.message ??
            syncLogsResult.error?.message ??
            googleConnectionResult.error ??
            "Erro ao carregar evento."
        );
        setLoading(false);
        return;
      }

      const loadedSyncLogs = (syncLogsResult.data ?? []) as GoogleCalendarSyncLog[];
      const syncAuthorIds = loadedSyncLogs.map((log) => log.synced_by).filter(Boolean) as string[];
      let authorMap: Record<string, string> = {};

      if (syncAuthorIds.length > 0) {
        const syncAuthorsResult = await supabase.from("profiles").select("id, full_name").in("id", syncAuthorIds);
        if (syncAuthorsResult.error) {
          setError(syncAuthorsResult.error.message);
          setLoading(false);
          return;
        }

        authorMap = Object.fromEntries(
          (syncAuthorsResult.data ?? []).map((profile) => [profile.id, profile.full_name ?? "Coordenação SEMEAR"])
        );
      }

      setCurrentProfile((profileResult.data ?? null) as Pick<Profile, "id" | "role"> | null);
      setEvent((eventResult.data ?? null) as unknown as EventWithRelations | null);
      setMemberships((membershipsResult.data ?? []) as TeamCalendarEventMember[]);
      setTeamMembers((teamMembersResult.data ?? []) as TeamMember[]);
      setWeeklyReports((weeklyReportsResult.data ?? []) as unknown as WeeklyReportWithMember[]);
      setMemoryEntries((memoryEntriesResult.data ?? []) as ProjectMemoryEntry[]);
      setSyncLogs(loadedSyncLogs);
      setSyncAuthors(authorMap);
      setGoogleConnection(googleConnectionResult.data ?? null);
      setLoading(false);
    }

    void loadData();

    return () => {
      ignore = true;
    };
  }, [eventId, reloadToken, supabase]);

  async function updateAttendance(attendanceStatus: TeamCalendarAttendanceStatus) {
    if (!ownMembership) return;

    const result = await supabase?.from("team_calendar_event_members").update({ attendance_status: attendanceStatus }).eq("id", ownMembership.id);
    if (result?.error) {
      setError(result.error.message);
      return;
    }

    setMemberships((current) => current.map((item) => (item.id === ownMembership.id ? { ...item, attendance_status: attendanceStatus } : item)));
  }

  async function handleGoogleSync(action: SyncAction) {
    setSyncActionLoading(action);
    setSyncMessage(null);

    try {
      const response = await fetch("/api/google-calendar/sync-event", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ event_id: eventId, action }),
      });

      const payload = (await response.json().catch(() => null)) as { error?: string; message?: string; skipped?: boolean; reprocess_hint?: string; has_external_event?: boolean } | null;
      if (!response.ok || payload?.error) {
        setSyncMessage({
          tone: "error",
          text: payload?.error ?? "Não foi possível sincronizar o evento com Google Calendar.",
          hint: payload?.reprocess_hint,
          hasExternalEvent: payload?.has_external_event,
        });
      } else {
        setSyncMessage({
          tone: payload?.skipped ? "info" : "success",
          text: payload?.message ?? "Sincronização concluída.",
          hint: payload?.reprocess_hint,
        });
      }
    } catch (syncError) {
      setSyncMessage({
        tone: "error",
        text: syncError instanceof Error ? syncError.message : "Falha inesperada ao sincronizar.",
        hint: "Confira calendário institucional, conexao Google, envs e permissoes antes de tentar novamente.",
      });
    } finally {
      setSyncActionLoading(null);
      setReloadToken((current) => current + 1);
    }
  }

  async function handleConnectGoogleCalendar() {
    if (!supabase) {
      setSyncMessage({
        tone: "error",
        text: "Configure NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_ANON_KEY para conectar o Google Calendar.",
      });
      return;
    }

    setConnectionActionLoading("connect");
    setSyncMessage(null);

    try {
      window.localStorage.setItem(
        GOOGLE_CALENDAR_CONNECT_PENDING_KEY,
        JSON.stringify({ eventId, requestedAt: new Date().toISOString() })
      );

      const redirectTo = `${window.location.origin}/auth/callback?google_calendar=connect&next=${encodeURIComponent(`/agenda/${eventId}`)}`;
      const identitiesResult = await supabase.auth.getUserIdentities();
      const hasGoogleIdentity = Boolean(
        identitiesResult.data?.identities?.some((identity) => identity.provider === "google")
      );

      const authOptions = {
        redirectTo,
        scopes: GOOGLE_CALENDAR_OAUTH_SCOPE,
        queryParams: {
          access_type: "offline",
          prompt: "consent",
          include_granted_scopes: "true",
        },
      };

      const authResult = hasGoogleIdentity
        ? await supabase.auth.signInWithOAuth({
            provider: "google",
            options: authOptions,
          })
        : await supabase.auth.linkIdentity({
            provider: "google",
            options: authOptions,
          });

      if (authResult.error) {
        window.localStorage.removeItem(GOOGLE_CALENDAR_CONNECT_PENDING_KEY);
        setSyncMessage({
          tone: "error",
          text: authResult.error.message,
          hint: "Confira se o login Google desta pessoa tem acesso ao calendario institucional compartilhado.",
        });
        setConnectionActionLoading(null);
      }
    } catch (connectionError) {
      window.localStorage.removeItem(GOOGLE_CALENDAR_CONNECT_PENDING_KEY);
      setSyncMessage({
        tone: "error",
        text: connectionError instanceof Error ? connectionError.message : "Nao foi possivel iniciar a conexao com Google Calendar.",
      });
      setConnectionActionLoading(null);
    }
  }

  async function handleDisconnectGoogleCalendar() {
    setConnectionActionLoading("disconnect");
    setSyncMessage(null);

    try {
      const response = await fetch("/api/google-calendar/connection", {
        method: "DELETE",
      });

      const payload = (await response.json().catch(() => null)) as { error?: string; message?: string } | null;
      if (!response.ok || payload?.error) {
        setSyncMessage({
          tone: "error",
          text: payload?.error ?? "Nao foi possivel remover a conexao Google do SEMEAR.",
        });
      } else {
        setSyncMessage({
          tone: "success",
          text: payload?.message ?? "Conexao Google removida do SEMEAR.",
        });
      }
    } catch (disconnectError) {
      setSyncMessage({
        tone: "error",
        text: disconnectError instanceof Error ? disconnectError.message : "Falha inesperada ao remover a conexao Google.",
      });
    } finally {
      setConnectionActionLoading(null);
      setReloadToken((current) => current + 1);
    }
  }

  if (loading) {
    return <StateBox>Carregando evento...</StateBox>;
  }

  if (error || !event) {
    return <StateBox tone="error">{error ?? "Evento não encontrado."}</StateBox>;
  }

  return (
    <section className="pb-10">
      <div className="mb-5 flex flex-wrap gap-3">
        <Link className="inline-flex min-h-11 items-center gap-2 rounded-full border border-semear-green/15 bg-white/70 px-4 text-sm font-semibold text-semear-green transition hover:bg-white" href="/agenda">
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          Voltar para agenda
        </Link>
        {canManage ? (
          <Link className="inline-flex min-h-11 items-center gap-2 rounded-full bg-semear-green px-4 text-sm font-semibold text-white transition hover:bg-semear-green/92" href={`/agenda/${eventId}?editar=1`}>
            <Edit3 className="h-4 w-4" aria-hidden="true" />
            Editar evento
          </Link>
        ) : null}
      </div>

      <article className="rounded-[2rem] border border-white/80 bg-white/80 p-5 shadow-soft sm:p-8">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <div className="flex flex-wrap gap-2">
              <Badge tone="stone" label={getTeamCalendarEventTypeLabel(event.event_type)} />
              <Badge tone={getTeamCalendarEventStatusTone(event.status)} label={getTeamCalendarEventStatusLabel(event.status)} />
            </div>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight text-semear-green">{event.title}</h2>
            <p className="mt-2 text-sm leading-6 text-stone-600">{getEventDateLabel(event)}</p>
            {event.description ? <p className="mt-4 max-w-3xl text-sm leading-6 text-stone-700">{event.description}</p> : null}
          </div>
          <div className="rounded-2xl bg-semear-green-soft px-4 py-3 text-sm font-semibold text-semear-green">
            Evento interno da equipe
          </div>
        </div>

        <div className="mt-8 grid gap-4 md:grid-cols-3">
          <InfoCard icon={<MapPin className="h-5 w-5" />} label="Território" value={event.neighborhoods?.name ?? "Sem território"} />
          <InfoCard icon={<CalendarCheck2 className="h-5 w-5" />} label="Ação vinculada" value={event.actions?.title ?? "Sem ação vinculada"} />
          <InfoCard icon={<UsersRound className="h-5 w-5" />} label="Participantes" value={memberships.length.toString()} />
        </div>
      </article>

      <div className="mt-6 grid gap-5 xl:grid-cols-[1.05fr_0.95fr]">
        <section className="rounded-[2rem] border border-white/80 bg-white p-5 shadow-soft">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-full bg-semear-green-soft text-semear-green">
              <UsersRound className="h-5 w-5" aria-hidden="true" />
            </div>
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-semear-earth">Presença</p>
              <h3 className="text-xl font-semibold text-semear-green">Equipe participante</h3>
            </div>
          </div>

          <div className="mt-4 space-y-3">
            {memberships.map((membership) => {
              const teamMember = teamMembers.find((item) => item.id === membership.team_member_id);
              return (
                <article className="rounded-2xl border border-semear-gray bg-semear-offwhite p-4" key={membership.id}>
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="font-semibold text-semear-green">{teamMember?.display_name ?? "Membro"}</p>
                      <p className="mt-1 text-xs text-stone-500">{teamMember?.role_label ?? "Sem função informada"}</p>
                      <p className="mt-2 text-sm text-stone-700">{membership.responsibility ? `Responsabilidade: ${membership.responsibility}` : "Responsabilidade não informada."}</p>
                      {!teamMember?.profile_id ? (
                        <p className="mt-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs leading-5 text-amber-950">
                          Este membro não pode atualizar presença sozinho porque não há login vinculado.
                        </p>
                      ) : null}
                    </div>
                    <Badge tone={getTeamCalendarAttendanceTone(membership.attendance_status)} label={getTeamCalendarAttendanceLabel(membership.attendance_status)} />
                  </div>
                </article>
              );
            })}
            {memberships.length === 0 ? <EmptyBox text="Nenhum participante vinculado ao evento." /> : null}
          </div>

          {ownMembership ? (
            <div className="mt-5 rounded-2xl border border-semear-gray bg-white p-4">
              <p className="text-sm font-semibold text-semear-green">Atualizar sua presença</p>
              <select className="mt-3 min-h-11 w-full rounded-xl border border-semear-gray bg-white px-3 text-sm outline-none focus:border-semear-green" value={ownMembership.attendance_status} onChange={(event) => void updateAttendance(event.target.value as TeamCalendarAttendanceStatus)}>
                {teamCalendarAttendanceOptions.map((option) => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
            </div>
          ) : null}
          {!ownMembership && linkedTeamMember ? (
            <div className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-950">
              Seu login não está vinculado a este evento como participante. A presença continua sendo controlada sem conceder acesso automático.
            </div>
          ) : null}
        </section>

        <section className="space-y-5">
          <section className="rounded-[2rem] border border-white/80 bg-white p-5 shadow-soft">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-full bg-semear-green-soft text-semear-green">
                <CalendarCheck2 className="h-5 w-5" aria-hidden="true" />
              </div>
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.18em] text-semear-earth">Google Calendar</p>
                <h3 className="text-xl font-semibold text-semear-green">Espelho operacional manual</h3>
              </div>
            </div>

            <div className="mt-4 grid gap-3 md:grid-cols-2">
              <InfoCard icon={<CalendarCheck2 className="h-5 w-5" />} label="Status" value={getGoogleCalendarSyncStatusLabel(event.google_sync_status)} />
              <InfoCard icon={<CalendarCheck2 className="h-5 w-5" />} label="Último sync" value={event.google_synced_at ? new Date(event.google_synced_at).toLocaleString("pt-BR") : "Ainda não sincronizado"} />
              <InfoCard icon={<CalendarCheck2 className="h-5 w-5" />} label="Calendário" value={event.google_calendar_id ?? "Não informado"} />
              <InfoCard icon={<CalendarCheck2 className="h-5 w-5" />} label="Evento Google" value={event.google_calendar_event_id ?? "Ainda não vinculado"} />
            </div>

            <div className="mt-4 flex flex-wrap items-center gap-2">
              <Badge tone={getGoogleCalendarSyncStatusTone(event.google_sync_status)} label={getGoogleCalendarSyncStatusLabel(event.google_sync_status)} />
              <span className="rounded-full bg-stone-100 px-3 py-1 text-xs font-semibold text-stone-700">
                {membersWithEmailCount} participante(s) com e-mail para convite operacional
              </span>
              <span className="rounded-full bg-stone-100 px-3 py-1 text-xs font-semibold text-stone-700">
                {connectionLabel}
              </span>
              {hasPendingLocalChanges ? (
                <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-900">
                  Alterações locais ainda não sincronizadas
                </span>
              ) : null}
            </div>

            {membersWithoutEmail.length > 0 ? (
              <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-950">
                Participantes sem e-mail para convite no Google: {membersWithoutEmail.join(", ")}.
              </div>
            ) : null}

            <div className="mt-4 rounded-2xl border border-semear-gray bg-semear-offwhite p-4 text-sm leading-6 text-stone-700">
              O SEMEAR continua como fonte principal. O Google Calendar recebe apenas resumo operacional sanitizado, sem escutas, relatórios completos, anexos ou dados sensíveis.
            </div>

            <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-950">
              O SEMEAR é a fonte principal deste evento. Alterações feitas diretamente no Google Calendar não voltam automaticamente para o SEMEAR nesta versão.
            </div>

            {canManage && !googleConnection?.service_account_available ? (
              <div className="mt-4 rounded-2xl border border-semear-gray bg-white p-4 text-sm leading-6 text-stone-700">
                <p><strong>Conexao Google da coordenação/admin:</strong> {googleConnection?.connection?.connected ? "ativa" : "pendente"}.</p>
                <p className="mt-2">
                  Quando a service account institucional nao estiver disponivel, o SEMEAR usa a autorizacao manual da pessoa coordenadora/admin para escrever no calendario institucional compartilhado.
                </p>
                {googleConnection?.connection?.has_refresh_token ? (
                  <p className="mt-2 text-xs text-stone-500">Refresh token presente para reprocessamento server-side sem expor segredo no frontend.</p>
                ) : (
                  <p className="mt-2 text-xs text-amber-800">Ainda sem refresh token salvo. Reconecte o Google Calendar com consentimento offline se a conexao expirar.</p>
                )}
              </div>
            ) : null}

            {syncMessage ? (
              <div className={`mt-4 rounded-2xl border p-4 text-sm ${syncMessage.tone === "success" ? "border-green-200 bg-green-50 text-green-800" : syncMessage.tone === "info" ? "border-stone-200 bg-stone-50 text-stone-700" : "border-red-200 bg-red-50 text-red-800"}`}>
                <p>{syncMessage.text}</p>
                {syncMessage.hint ? <p className="mt-2">{syncMessage.hint}</p> : null}
              </div>
            ) : null}

            {canManage ? (
              <div className="mt-5 space-y-3">
                {!googleConnection?.service_account_available ? (
                  <div className="grid gap-2 sm:grid-cols-2">
                    <button
                      className="inline-flex min-h-11 items-center justify-center rounded-full border border-semear-green/15 bg-white px-4 text-sm font-semibold text-semear-green disabled:cursor-not-allowed disabled:opacity-60"
                      disabled={connectionActionLoading !== null || syncActionLoading !== null}
                      onClick={() => void handleConnectGoogleCalendar()}
                      type="button"
                    >
                      {connectionActionLoading === "connect"
                        ? "Conectando..."
                        : googleConnection?.connection?.connected
                          ? "Reconectar Google Calendar"
                          : "Conectar Google Calendar"}
                    </button>
                    <button
                      className="inline-flex min-h-11 items-center justify-center rounded-full border border-stone-300 bg-stone-100 px-4 text-sm font-semibold text-stone-700 disabled:cursor-not-allowed disabled:opacity-60"
                      disabled={!googleConnection?.connection?.connected || connectionActionLoading !== null || syncActionLoading !== null}
                      onClick={() => void handleDisconnectGoogleCalendar()}
                      type="button"
                    >
                      {connectionActionLoading === "disconnect" ? "Desconectando..." : "Remover conexao Google"}
                    </button>
                  </div>
                ) : null}

                <div className="grid gap-2 sm:grid-cols-2">
                  <button className="inline-flex min-h-11 items-center justify-center rounded-full bg-semear-green px-4 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60" disabled={syncActionLoading !== null || connectionActionLoading !== null || syncUnavailable} onClick={() => void handleGoogleSync("create")} type="button">
                  {syncActionLoading === "create" ? "Sincronizando..." : "Sincronizar com Google"}
                  </button>
                  <button className="inline-flex min-h-11 items-center justify-center rounded-full border border-semear-green/15 bg-white px-4 text-sm font-semibold text-semear-green disabled:cursor-not-allowed disabled:opacity-60" disabled={syncActionLoading !== null || connectionActionLoading !== null || syncUnavailable} onClick={() => void handleGoogleSync("update")} type="button">
                  {syncActionLoading === "update" ? "Atualizando..." : "Atualizar evento Google"}
                  </button>
                  <button className="inline-flex min-h-11 items-center justify-center rounded-full border border-amber-300 bg-amber-50 px-4 text-sm font-semibold text-amber-900 disabled:cursor-not-allowed disabled:opacity-60" disabled={syncActionLoading !== null || connectionActionLoading !== null || syncUnavailable} onClick={() => void handleGoogleSync("cancel")} type="button">
                  {syncActionLoading === "cancel" ? "Cancelando..." : "Cancelar evento Google"}
                  </button>
                  <button className="inline-flex min-h-11 items-center justify-center rounded-full border border-stone-300 bg-stone-100 px-4 text-sm font-semibold text-stone-700 disabled:cursor-not-allowed disabled:opacity-60" disabled={syncActionLoading !== null || connectionActionLoading !== null} onClick={() => void handleGoogleSync("unlink")} type="button">
                  {syncActionLoading === "unlink" ? "Desvinculando..." : "Desvincular do Google"}
                  </button>
                </div>

                {shouldOfferReconnect ? (
                  <button
                    className="inline-flex min-h-11 items-center justify-center rounded-full border border-semear-green/15 bg-white px-4 text-sm font-semibold text-semear-green disabled:cursor-not-allowed disabled:opacity-60"
                    disabled={connectionActionLoading !== null || syncActionLoading !== null}
                    onClick={() => void handleConnectGoogleCalendar()}
                    type="button"
                  >
                    {connectionActionLoading === "connect" ? "Reconectando..." : "Reconectar Google Calendar"}
                  </button>
                ) : null}
              </div>
            ) : (
              <div className="mt-5 rounded-2xl border border-semear-gray bg-semear-offwhite p-4 text-sm leading-6 text-stone-700">
                Apenas coordenação e admin podem acionar sincronização manual. A equipe visualiza o status e o histórico sem ganhar acesso externo.
              </div>
            )}

            {canManage && event.google_sync_status === "sync_error" ? (
              <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm leading-6 text-red-800">
                <p className="font-semibold">Erro de sincronização detectado</p>
                <p className="mt-2">Confira calendário institucional, conexão Google, envs e permissões do compartilhamento.</p>
                <div className="mt-4 flex flex-wrap gap-2">
                  <button className="inline-flex min-h-10 items-center justify-center rounded-full bg-semear-green px-4 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60" disabled={syncActionLoading !== null || connectionActionLoading !== null || syncUnavailable} onClick={() => void handleGoogleSync(event.google_calendar_event_id ? "update" : "create")} type="button">
                    {syncActionLoading === "create" || syncActionLoading === "update" ? "Tentando..." : "Tentar novamente"}
                  </button>
                  {event.google_calendar_event_id ? (
                    <button className="inline-flex min-h-10 items-center justify-center rounded-full border border-stone-300 bg-white px-4 text-sm font-semibold text-stone-700 disabled:cursor-not-allowed disabled:opacity-60" disabled={syncActionLoading !== null || connectionActionLoading !== null} onClick={() => void handleGoogleSync("unlink")} type="button">
                      Desvincular
                    </button>
                  ) : null}
                  {shouldOfferReconnect ? (
                    <button
                      className="inline-flex min-h-10 items-center justify-center rounded-full border border-semear-green/15 bg-white px-4 text-sm font-semibold text-semear-green disabled:cursor-not-allowed disabled:opacity-60"
                      disabled={syncActionLoading !== null || connectionActionLoading !== null}
                      onClick={() => void handleConnectGoogleCalendar()}
                      type="button"
                    >
                      {connectionActionLoading === "connect" ? "Reconectando..." : "Reconectar"}
                    </button>
                  ) : null}
                </div>
              </div>
            ) : null}
          </section>

          <section className="rounded-[2rem] border border-white/80 bg-white p-5 shadow-soft">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-full bg-semear-green-soft text-semear-green">
                <FileText className="h-5 w-5" aria-hidden="true" />
              </div>
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.18em] text-semear-earth">Relatórios semanais</p>
                <h3 className="text-xl font-semibold text-semear-green">Vínculo com fechamento interno</h3>
              </div>
            </div>

            <div className="mt-4 space-y-3">
              {weeklyReports.map((report) => (
                <Link className="block rounded-2xl border border-semear-gray bg-semear-offwhite p-4" href={`/memoria/${report.id}`} key={report.id}>
                  <p className="font-semibold text-semear-green">{report.title}</p>
                  <p className="mt-1 text-xs text-stone-500">{report.team_members?.display_name ?? "Equipe"} · {report.week_start} a {report.week_end}</p>
                </Link>
              ))}
              {weeklyReports.length === 0 ? <EmptyBox text="Nenhum relatório semanal vinculado a este evento ainda." /> : null}
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              <Link className="inline-flex min-h-11 items-center justify-center rounded-full bg-semear-green px-4 text-sm font-semibold text-white" href={`/memoria/novo?eventId=${event.id}${event.action_id ? `&actionId=${event.action_id}` : ""}`}>
                Vincular relatório semanal
              </Link>
            </div>
          </section>

          <section className="rounded-[2rem] border border-white/80 bg-white p-5 shadow-soft">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-full bg-semear-green-soft text-semear-green">
                <LibraryBig className="h-5 w-5" aria-hidden="true" />
              </div>
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.18em] text-semear-earth">Memória do projeto</p>
                <h3 className="text-xl font-semibold text-semear-green">Evento concluído pode virar memória</h3>
              </div>
            </div>

            <div className="mt-4 space-y-3">
              {memoryEntries.map((entry) => (
                <Link className="block rounded-2xl border border-semear-gray bg-semear-offwhite p-4" href={`/memoria/entradas/${entry.id}`} key={entry.id}>
                  <p className="font-semibold text-semear-green">{entry.title}</p>
                  <p className="mt-1 text-xs text-stone-500">{entry.entry_date} · {entry.memory_type}</p>
                </Link>
              ))}
              {memoryEntries.length === 0 ? <EmptyBox text="Nenhuma entrada de memória vinculada a este evento ainda." /> : null}
            </div>

            {event.status === "done" ? (
              <div className="mt-4 flex flex-wrap gap-2">
                <Link className="inline-flex min-h-11 items-center justify-center rounded-full bg-semear-green px-4 text-sm font-semibold text-white" href={`/memoria/novo?eventId=${event.id}${event.action_id ? `&actionId=${event.action_id}` : ""}`}>
                  Criar memória relacionada
                </Link>
              </div>
            ) : (
              <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950">
                Marque o evento como concluído para usar este fluxo como base de memória institucional.
              </div>
            )}
          </section>

          <section className="rounded-[2rem] border border-white/80 bg-white p-5 shadow-soft">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-full bg-semear-green-soft text-semear-green">
                <FileText className="h-5 w-5" aria-hidden="true" />
              </div>
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.18em] text-semear-earth">Histórico de sync</p>
                <h3 className="text-xl font-semibold text-semear-green">Rastro auditável</h3>
              </div>
            </div>

            <div className="mt-4 space-y-3">
              {syncLogs.map((log) => (
                <article className="rounded-2xl border border-semear-gray bg-semear-offwhite p-4" key={log.id}>
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <p className="font-semibold capitalize text-semear-green">{log.action}</p>
                      <p className="mt-1 text-xs text-stone-500">
                        {new Date(log.synced_at).toLocaleString("pt-BR")} · {syncAuthors[log.synced_by ?? ""] ?? "Coordenação SEMEAR"}
                      </p>
                    </div>
                    <Badge tone={log.status === "success" ? "green" : log.status === "failed" ? "red" : "yellow"} label={log.status === "success" ? "Sucesso" : log.status === "failed" ? "Falha" : "Ignorado"} />
                  </div>
                  {log.message ? <p className="mt-3 text-sm leading-6 text-stone-700">{log.message}</p> : null}
                </article>
              ))}
              {syncLogs.length === 0 ? <EmptyBox text="Nenhuma sincronização com Google Calendar foi registrada para este evento." /> : null}
            </div>
          </section>
        </section>
      </div>
    </section>
  );
}

function InfoCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <section className="rounded-2xl border border-semear-gray bg-semear-offwhite p-4">
      <div className="flex items-center gap-2 text-semear-green">
        {icon}
        <p className="text-xs font-semibold uppercase tracking-[0.12em]">{label}</p>
      </div>
      <p className="mt-2 text-sm font-semibold text-semear-green">{value}</p>
    </section>
  );
}

function Badge({ label, tone }: { label: string; tone: "green" | "yellow" | "red" | "stone" }) {
  const className =
    tone === "green"
      ? "bg-green-100 text-green-800"
      : tone === "yellow"
        ? "bg-amber-100 text-amber-900"
        : tone === "red"
          ? "bg-red-100 text-red-800"
          : "bg-stone-100 text-stone-700";

  return <span className={`rounded-full px-3 py-1 text-xs font-semibold ${className}`}>{label}</span>;
}

function EmptyBox({ text }: { text: string }) {
  return <div className="rounded-2xl border border-dashed border-semear-green/20 bg-white px-4 py-5 text-sm text-stone-500">{text}</div>;
}

function StateBox({ children, tone = "neutral" }: { children: React.ReactNode; tone?: "neutral" | "error" }) {
  return <div className={`rounded-[1.5rem] p-6 text-sm shadow-soft ${tone === "error" ? "border border-red-200 bg-red-50 text-red-800" : "border border-white/80 bg-white/72 text-stone-600"}`}>{children}</div>;
}
