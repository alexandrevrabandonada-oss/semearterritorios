import { NextResponse } from "next/server";
import type { Action, GoogleCalendarUserConnection, Json, Neighborhood, Profile, TeamCalendarEvent, TeamMember } from "@/lib/database.types";
import {
  assertGoogleCalendarSyncReady,
  cancelGoogleCalendarEvent,
  createGoogleCalendarEvent,
  getGoogleCalendarSendUpdatesMode,
  resolveGoogleCalendarAuthContext,
  updateGoogleCalendarEvent,
} from "@/lib/google-calendar/google-calendar-api";
import { mapGoogleCalendarError } from "@/lib/google-calendar/google-calendar-errors";
import { sanitizeCalendarEvent } from "@/lib/google-calendar/sanitize-calendar-event";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type SyncAction = "create" | "update" | "cancel" | "unlink";

type EventWithRelations = TeamCalendarEvent & {
  neighborhoods: Pick<Neighborhood, "id" | "name"> | null;
  actions: Pick<Action, "id" | "title"> | null;
};

type SyncableMember = Pick<TeamMember, "id" | "display_name" | "email" | "active">;
type SyncConnection = Pick<
  GoogleCalendarUserConnection,
  "id" | "access_token" | "refresh_token" | "access_token_expires_at" | "provider_user_email" | "updated_at"
>;

async function insertLog(params: {
  supabase: ReturnType<typeof createSupabaseServerClient>;
  eventId: string;
  userId: string;
  action: "create" | "update" | "cancel" | "unlink" | "error";
  status: "success" | "failed" | "skipped";
  message: string;
  googleCalendarId?: string | null;
  googleCalendarEventId?: string | null;
  payloadSummary?: Json | null;
}) {
  await params.supabase.from("google_calendar_sync_logs").insert({
    event_id: params.eventId,
    action: params.action,
    status: params.status,
    message: params.message,
    google_calendar_id: params.googleCalendarId ?? null,
    google_calendar_event_id: params.googleCalendarEventId ?? null,
    payload_summary: params.payloadSummary ?? null,
    synced_by: params.userId,
  });
}

export async function POST(request: Request) {
  const supabase = createSupabaseServerClient();
  const requestUrl = new URL(request.url);
  const body = (await request.json().catch(() => null)) as { event_id?: string; action?: SyncAction } | null;
  const eventId = body?.event_id?.trim();
  const action = body?.action;

  if (!eventId || !action) {
    return NextResponse.json({ error: "Informe event_id e action válidos." }, { status: 400 });
  }

  const userResult = await supabase.auth.getUser();
  const user = userResult.data.user;
  if (!user) {
    return NextResponse.json({ error: "Sessão inválida." }, { status: 401 });
  }

  const profileResult = await supabase.from("profiles").select("id, role, full_name").eq("id", user.id).single();
  if (profileResult.error || !profileResult.data) {
    return NextResponse.json({ error: "Perfil não encontrado." }, { status: 403 });
  }

  const profile = profileResult.data as Pick<Profile, "id" | "role" | "full_name">;
  if (!["admin", "coordenacao"].includes(profile.role ?? "")) {
    return NextResponse.json({ error: "Apenas coordenação ou admin podem sincronizar com Google Calendar." }, { status: 403 });
  }

  const [eventResult, membershipsResult, connectionResult] = await Promise.all([
    supabase.from("team_calendar_events").select("*, neighborhoods:neighborhood_id(id, name), actions:action_id(id, title)").eq("id", eventId).single(),
    supabase.from("team_calendar_event_members").select("*").eq("event_id", eventId),
    supabase
      .from("google_calendar_user_connections")
      .select("id, access_token, refresh_token, access_token_expires_at, provider_user_email, updated_at")
      .eq("profile_id", user.id)
      .maybeSingle(),
  ]);

  if (eventResult.error || !eventResult.data) {
    return NextResponse.json({ error: eventResult.error?.message ?? "Evento não encontrado." }, { status: 404 });
  }

  if (membershipsResult.error || connectionResult.error) {
    return NextResponse.json({ error: membershipsResult.error?.message ?? connectionResult.error?.message ?? "Erro ao carregar sincronização Google." }, { status: 500 });
  }

  const event = eventResult.data as unknown as EventWithRelations;
  const membershipRows = membershipsResult.data ?? [];
  const teamMemberIds = membershipRows.map((membership) => membership.team_member_id);

  const teamMembersResult = teamMemberIds.length > 0
    ? await supabase.from("team_members").select("id, display_name, email, active").in("id", teamMemberIds)
    : { data: [], error: null };

  if (teamMembersResult.error) {
    return NextResponse.json({ error: teamMembersResult.error.message }, { status: 500 });
  }

  const participants = (teamMembersResult.data ?? []) as SyncableMember[];
  const internalEventUrl = `${requestUrl.origin}/agenda/${event.id}`;
  const { payload, payloadSummary } = sanitizeCalendarEvent({
    id: event.id,
    title: event.title,
    event_type: event.event_type,
    status: event.status,
    starts_at: event.starts_at,
    ends_at: event.ends_at,
    all_day: event.all_day,
    neighborhood_name: event.neighborhoods?.name ?? null,
    googleSendInvites: event.google_send_invites,
    participants,
    internalEventUrl,
  });
  const sendUpdates = getGoogleCalendarSendUpdatesMode(event.google_send_invites);

  const connection = (connectionResult.data ?? null) as SyncConnection | null;

  try {
    if (action !== "unlink") {
      assertGoogleCalendarSyncReady({ connection });
    }

    if (action === "create") {
      if (event.google_calendar_event_id) {
        await insertLog({
          supabase,
          eventId: event.id,
          userId: user.id,
          action,
          status: "skipped",
          message: "O evento já possui vínculo com Google Calendar. Use atualizar ou desvincular.",
          googleCalendarId: event.google_calendar_id,
          googleCalendarEventId: event.google_calendar_event_id,
          payloadSummary,
        });

        return NextResponse.json({ ok: false, skipped: true, message: "O evento já está vinculado ao Google Calendar." });
      }

      const authResolution = await resolveGoogleCalendarAuthContext({ connection });
      const googleResult = await createGoogleCalendarEvent(authResolution.authContext, payload, sendUpdates, authResolution.connectionUpdate);
      if (authResolution.connectionUpdate && connection?.id) {
        await supabase
          .from("google_calendar_user_connections")
          .update({
            access_token: authResolution.connectionUpdate.accessToken,
            refresh_token: authResolution.connectionUpdate.refreshToken,
            access_token_expires_at: authResolution.connectionUpdate.accessTokenExpiresAt,
          })
          .eq("id", connection.id);
      }
      await supabase.from("team_calendar_events").update({
        google_calendar_event_id: googleResult.eventId,
        google_calendar_id: googleResult.calendarId,
        google_sync_status: "synced",
        google_synced_at: new Date().toISOString(),
      }).eq("id", event.id);

      await insertLog({
        supabase,
        eventId: event.id,
        userId: user.id,
        action,
        status: "success",
        message: "Evento criado manualmente no Google Calendar.",
        googleCalendarId: googleResult.calendarId,
        googleCalendarEventId: googleResult.eventId,
        payloadSummary,
      });

      return NextResponse.json({
        ok: true,
        message: "Evento sincronizado com Google Calendar.",
        google_calendar_id: googleResult.calendarId,
        google_calendar_event_id: googleResult.eventId,
        html_link: googleResult.htmlLink,
        members_without_email: payloadSummary.members_without_email,
      });
    }

    if (action === "update") {
      if (!event.google_calendar_event_id) {
        await insertLog({
          supabase,
          eventId: event.id,
          userId: user.id,
          action,
          status: "skipped",
          message: "Não existe evento Google vinculado para atualizar.",
          payloadSummary,
        });

        return NextResponse.json({ ok: false, skipped: true, message: "Sincronize o evento primeiro." });
      }

      const authResolution = await resolveGoogleCalendarAuthContext({ connection });
      const googleResult = await updateGoogleCalendarEvent(
        authResolution.authContext,
        event.google_calendar_event_id,
        payload,
        sendUpdates,
        authResolution.connectionUpdate
      );
      if (authResolution.connectionUpdate && connection?.id) {
        await supabase
          .from("google_calendar_user_connections")
          .update({
            access_token: authResolution.connectionUpdate.accessToken,
            refresh_token: authResolution.connectionUpdate.refreshToken,
            access_token_expires_at: authResolution.connectionUpdate.accessTokenExpiresAt,
          })
          .eq("id", connection.id);
      }
      await supabase.from("team_calendar_events").update({
        google_calendar_id: googleResult.calendarId,
        google_sync_status: "synced",
        google_synced_at: new Date().toISOString(),
      }).eq("id", event.id);

      await insertLog({
        supabase,
        eventId: event.id,
        userId: user.id,
        action,
        status: "success",
        message: "Evento Google atualizado manualmente.",
        googleCalendarId: googleResult.calendarId,
        googleCalendarEventId: googleResult.eventId,
        payloadSummary,
      });

      return NextResponse.json({
        ok: true,
        message: "Evento Google atualizado.",
        google_calendar_id: googleResult.calendarId,
        google_calendar_event_id: googleResult.eventId,
        html_link: googleResult.htmlLink,
        members_without_email: payloadSummary.members_without_email,
      });
    }

    if (action === "cancel") {
      if (!event.google_calendar_event_id) {
        await insertLog({
          supabase,
          eventId: event.id,
          userId: user.id,
          action,
          status: "skipped",
          message: "Não existe evento Google vinculado para cancelar.",
          payloadSummary,
        });

        return NextResponse.json({ ok: false, skipped: true, message: "Não existe evento Google vinculado para cancelar." });
      }

      const authResolution = await resolveGoogleCalendarAuthContext({ connection });
      const googleResult = await cancelGoogleCalendarEvent(
        authResolution.authContext,
        event.google_calendar_event_id,
        sendUpdates,
        authResolution.connectionUpdate
      );
      if (authResolution.connectionUpdate && connection?.id) {
        await supabase
          .from("google_calendar_user_connections")
          .update({
            access_token: authResolution.connectionUpdate.accessToken,
            refresh_token: authResolution.connectionUpdate.refreshToken,
            access_token_expires_at: authResolution.connectionUpdate.accessTokenExpiresAt,
          })
          .eq("id", connection.id);
      }
      await supabase.from("team_calendar_events").update({
        google_calendar_id: googleResult.calendarId,
        google_sync_status: "cancelled",
        google_synced_at: new Date().toISOString(),
      }).eq("id", event.id);

      await insertLog({
        supabase,
        eventId: event.id,
        userId: user.id,
        action,
        status: "success",
        message: "Evento Google cancelado manualmente.",
        googleCalendarId: googleResult.calendarId,
        googleCalendarEventId: googleResult.eventId,
        payloadSummary,
      });

      return NextResponse.json({
        ok: true,
        message: "Evento Google cancelado.",
        google_calendar_id: googleResult.calendarId,
        google_calendar_event_id: googleResult.eventId,
      });
    }

    await supabase.from("team_calendar_events").update({
      google_calendar_event_id: null,
      google_calendar_id: null,
      google_sync_status: "unlinked",
      google_synced_at: new Date().toISOString(),
    }).eq("id", event.id);

    await insertLog({
      supabase,
      eventId: event.id,
      userId: user.id,
      action: "unlink",
      status: "success",
      message: "Vínculo com Google Calendar removido manualmente no SEMEAR.",
      payloadSummary,
    });

    return NextResponse.json({
      ok: true,
      message: "Vínculo com Google Calendar removido do SEMEAR.",
      reprocess_hint: "Se precisar sincronizar novamente, confirme os dados do evento interno, a conexão Google e o calendário institucional.",
    });
  } catch (error) {
    const mappedError = mapGoogleCalendarError({
      error,
      mode: connection ? "oauth_user" : "unknown",
      operation: action,
    });

    await supabase
      .from("team_calendar_events")
      .update({ google_sync_status: "sync_error", google_synced_at: new Date().toISOString() })
      .eq("id", event.id);

    await insertLog({
      supabase,
      eventId: event.id,
      userId: user.id,
      action: "error",
      status: "failed",
      message: mappedError.safeMessage,
      googleCalendarId: event.google_calendar_id,
      googleCalendarEventId: event.google_calendar_event_id,
      payloadSummary,
    });

    return NextResponse.json({
      error: mappedError.safeMessage,
      error_code: mappedError.code,
      reprocess_hint: mappedError.recommendation,
      has_external_event: Boolean(event.google_calendar_event_id),
      suggest_reconnect: mappedError.shouldReconnect,
      suggest_check_permissions: mappedError.shouldCheckPermissions,
      suggest_check_google_setup: mappedError.shouldCheckGoogleSetup,
    }, { status: 500 });
  }
}
