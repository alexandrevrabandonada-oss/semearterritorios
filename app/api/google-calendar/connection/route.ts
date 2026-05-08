import { NextResponse } from "next/server";
import type { GoogleCalendarUserConnection, Profile } from "@/lib/database.types";
import { getGoogleCalendarConfig, getGoogleCalendarConnectionDiagnostics } from "@/lib/google-calendar/google-calendar-api";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type ConnectionBody = {
  provider_token?: string;
  provider_refresh_token?: string | null;
  provider_user_email?: string | null;
  provider_user_id?: string | null;
  scopes?: string | null;
};

type ConnectionRow = Pick<
  GoogleCalendarUserConnection,
  | "id"
  | "profile_id"
  | "provider"
  | "provider_user_email"
  | "provider_user_id"
  | "access_token"
  | "refresh_token"
  | "access_token_expires_at"
  | "scopes"
  | "updated_at"
>;

async function getAuthenticatedProfile() {
  const supabase = createSupabaseServerClient();
  const userResult = await supabase.auth.getUser();
  const user = userResult.data.user;

  if (!user) {
    return { supabase, profile: null, error: NextResponse.json({ error: "Sessao invalida." }, { status: 401 }) };
  }

  const profileResult = await supabase.from("profiles").select("id, role").eq("id", user.id).single();
  if (profileResult.error || !profileResult.data) {
    return { supabase, profile: null, error: NextResponse.json({ error: "Perfil nao encontrado." }, { status: 403 }) };
  }

  return {
    supabase,
    profile: profileResult.data as Pick<Profile, "id" | "role">,
    error: null,
  };
}

export async function GET() {
  const auth = await getAuthenticatedProfile();
  if (auth.error || !auth.profile) {
    return auth.error;
  }

  const connectionResult = await auth.supabase
    .from("google_calendar_user_connections")
    .select("id, profile_id, provider, provider_user_email, provider_user_id, access_token, refresh_token, access_token_expires_at, scopes, updated_at")
    .eq("profile_id", auth.profile.id)
    .maybeSingle();

  if (connectionResult.error) {
    return NextResponse.json({ error: connectionResult.error.message }, { status: 500 });
  }

  const config = getGoogleCalendarConfig();
  const diagnostics = getGoogleCalendarConnectionDiagnostics({
    connection: (connectionResult.data ?? null) as ConnectionRow | null,
  });

  return NextResponse.json({
    enabled: config.enabled,
    calendar_id: config.calendarId,
    service_account_available: diagnostics.serviceAccountAvailable,
    oauth_client_ready: diagnostics.oauthClientReady,
    oauth_connection_ready: diagnostics.oauthConnectionReady,
    auth_mode: diagnostics.authMode,
    requires_reconnect: Boolean(
      config.enabled &&
      !diagnostics.serviceAccountAvailable &&
      connectionResult.data &&
      (!connectionResult.data.refresh_token || !diagnostics.oauthClientReady)
    ),
    connection: connectionResult.data
      ? {
          connected: Boolean(connectionResult.data.access_token),
          provider_user_email: connectionResult.data.provider_user_email,
          has_refresh_token: Boolean(connectionResult.data.refresh_token),
          updated_at: connectionResult.data.updated_at,
        }
      : null,
  });
}

export async function POST(request: Request) {
  const auth = await getAuthenticatedProfile();
  if (auth.error || !auth.profile) {
    return auth.error;
  }

  if (!["admin", "coordenacao"].includes(auth.profile.role ?? "")) {
    return NextResponse.json({ error: "Apenas coordenacao ou admin podem conectar Google Calendar." }, { status: 403 });
  }

  const body = (await request.json().catch(() => null)) as ConnectionBody | null;
  const accessToken = body?.provider_token?.trim();
  if (!accessToken) {
    return NextResponse.json({ error: "provider_token obrigatorio para registrar a conexao Google." }, { status: 400 });
  }

  const upsertPayload = {
    profile_id: auth.profile.id,
    provider: "google" as const,
    provider_user_email: body?.provider_user_email?.trim() || null,
    provider_user_id: body?.provider_user_id?.trim() || null,
    access_token: accessToken,
    refresh_token: body?.provider_refresh_token?.trim() || null,
    scopes: body?.scopes?.trim() || null,
    access_token_expires_at: null,
  };

  const upsertResult = await auth.supabase
    .from("google_calendar_user_connections")
    .upsert(upsertPayload, { onConflict: "profile_id" })
    .select("updated_at")
    .single();

  if (upsertResult.error) {
    return NextResponse.json({ error: upsertResult.error.message }, { status: 500 });
  }

  return NextResponse.json({
    ok: true,
    message: "Conexao com Google Calendar registrada para sincronizacao manual.",
    updated_at: upsertResult.data.updated_at,
  });
}

export async function DELETE() {
  const auth = await getAuthenticatedProfile();
  if (auth.error || !auth.profile) {
    return auth.error;
  }

  if (!["admin", "coordenacao"].includes(auth.profile.role ?? "")) {
    return NextResponse.json({ error: "Apenas coordenacao ou admin podem desconectar Google Calendar." }, { status: 403 });
  }

  const deleteResult = await auth.supabase.from("google_calendar_user_connections").delete().eq("profile_id", auth.profile.id);
  if (deleteResult.error) {
    return NextResponse.json({ error: deleteResult.error.message }, { status: 500 });
  }

  return NextResponse.json({
    ok: true,
    message: "Conexao OAuth removida do SEMEAR. O calendario institucional continua sem sincronizacao automatica ate nova conexao manual.",
  });
}
