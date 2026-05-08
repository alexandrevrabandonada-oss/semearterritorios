import { createSign } from "crypto";
import type { GoogleCalendarUserConnection } from "@/lib/database.types";

type GoogleCalendarConfig = {
  enabled: boolean;
  calendarId: string | null;
  clientEmail: string | null;
  privateKey: string | null;
  oauthClientId: string | null;
  oauthClientSecret: string | null;
};

type ConfiguredGoogleCalendarConfig = GoogleCalendarConfig & {
  enabled: true;
  calendarId: string;
};

type ServiceAccountAuthContext = {
  mode: "service_account";
  calendarId: string;
  clientEmail: string;
  privateKey: string;
};

type OAuthUserConnection = Pick<
  GoogleCalendarUserConnection,
  | "id"
  | "access_token"
  | "refresh_token"
  | "access_token_expires_at"
  | "provider_user_email"
  | "updated_at"
>;

type OAuthUserAuthContext = {
  mode: "oauth_user";
  calendarId: string;
  accessToken: string;
  refreshToken: string | null;
  oauthClientId: string | null;
  oauthClientSecret: string | null;
};

export type GoogleCalendarAuthContext = ServiceAccountAuthContext | OAuthUserAuthContext;

export type GoogleCalendarWritableEvent = {
  summary: string;
  description: string;
  location?: string;
  start: { date?: string; dateTime?: string; timeZone?: string };
  end: { date?: string; dateTime?: string; timeZone?: string };
  attendees?: Array<{ email: string; displayName?: string }>;
  status?: "confirmed" | "cancelled";
};

export type GoogleCalendarOperationResult = {
  authMode: GoogleCalendarAuthContext["mode"];
  calendarId: string;
  eventId: string;
  htmlLink: string | null;
  status: string | null;
  connectionUpdate?: {
    accessToken: string;
    refreshToken: string | null;
    accessTokenExpiresAt: string | null;
  } | null;
};

export function getGoogleCalendarConfig(): GoogleCalendarConfig {
  return {
    enabled: process.env.GOOGLE_CALENDAR_SYNC_ENABLED === "true",
    calendarId: process.env.GOOGLE_CALENDAR_ID?.trim() || null,
    clientEmail: process.env.GOOGLE_SERVICE_ACCOUNT_CLIENT_EMAIL?.trim() || null,
    privateKey: process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY?.replace(/\\n/g, "\n") || null,
    oauthClientId: process.env.GOOGLE_OAUTH_CLIENT_ID?.trim() || null,
    oauthClientSecret: process.env.GOOGLE_OAUTH_CLIENT_SECRET?.trim() || null,
  };
}

export function getGoogleCalendarConnectionDiagnostics(params: {
  connection: OAuthUserConnection | null;
}) {
  const config = getGoogleCalendarConfig();
  const serviceAccountAvailable = Boolean(config.enabled && config.calendarId && config.clientEmail && config.privateKey);
  const oauthClientReady = Boolean(config.oauthClientId && config.oauthClientSecret);
  const oauthConnectionReady = Boolean(params.connection?.access_token);

  return {
    serviceAccountAvailable,
    oauthClientReady,
    oauthConnectionReady,
    authMode: serviceAccountAvailable ? "service_account" : oauthConnectionReady ? "oauth_user" : "not_configured",
  } as const;
}

function normalizeGoogleCalendarError(params: {
  prefix: string;
  mode: GoogleCalendarAuthContext["mode"];
  details?: string;
}) {
  const safeDetails = params.details?.toLowerCase() ?? "";

  if (safeDetails.includes("not found")) {
    return `${params.prefix} Calendario institucional ou evento externo nao encontrado.`;
  }

  if (safeDetails.includes("forbidden") || safeDetails.includes("insufficient permissions")) {
    return params.mode === "service_account"
      ? `${params.prefix} A service account nao possui permissao suficiente no calendario institucional.`
      : `${params.prefix} A conexao Google atual nao possui permissao para editar o calendario institucional compartilhado.`;
  }

  if (safeDetails.includes("invalid_grant") || safeDetails.includes("invalid jwt")) {
    return params.mode === "service_account"
      ? `${params.prefix} Credenciais institucionais invalidas ou expiradas.`
      : `${params.prefix} A conexao Google expirou ou perdeu autorizacao. Reconecte o Google Calendar.`;
  }

  if (safeDetails.includes("unauthorized") || safeDetails.includes("invalid credentials")) {
    return `${params.prefix} A autenticacao Google nao esta valida. Reconecte e tente novamente.`;
  }

  if (safeDetails.includes("invalid")) {
    return `${params.prefix} Configuracao invalida para Google Calendar.`;
  }

  return `${params.prefix} Verifique calendario institucional, conexao Google, envs e permissoes.`;
}

function base64UrlEncode(input: string | Buffer) {
  return Buffer.from(input)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

function assertGoogleCalendarEnabled() {
  const config = getGoogleCalendarConfig();
  if (!config.enabled || !config.calendarId) {
    throw new Error("Google Calendar nao esta habilitado neste ambiente.");
  }

  return config as ConfiguredGoogleCalendarConfig;
}

async function getServiceAccountAccessToken(config: ConfiguredGoogleCalendarConfig) {
  if (!config.clientEmail || !config.privateKey) {
    throw new Error("Credenciais da service account nao estao configuradas neste ambiente.");
  }

  const now = Math.floor(Date.now() / 1000);
  const header = { alg: "RS256", typ: "JWT" };
  const payload = {
    iss: config.clientEmail,
    scope: "https://www.googleapis.com/auth/calendar.events",
    aud: "https://oauth2.googleapis.com/token",
    exp: now + 3600,
    iat: now,
  };

  const signingInput = `${base64UrlEncode(JSON.stringify(header))}.${base64UrlEncode(JSON.stringify(payload))}`;
  const signer = createSign("RSA-SHA256");
  signer.update(signingInput);
  signer.end();

  const assertion = `${signingInput}.${base64UrlEncode(signer.sign(config.privateKey))}`;
  const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion,
    }),
    cache: "no-store",
  });

  if (!tokenResponse.ok) {
    const responseText = await tokenResponse.text();
    throw new Error(normalizeGoogleCalendarError({
      prefix: "Falha ao autenticar no Google Calendar.",
      mode: "service_account",
      details: responseText,
    }));
  }

  const tokenJson = (await tokenResponse.json()) as { access_token?: string };
  if (!tokenJson.access_token) {
    throw new Error("Token do Google Calendar retornou vazio.");
  }

  return tokenJson.access_token;
}

async function refreshOAuthUserAccessToken(config: ConfiguredGoogleCalendarConfig, connection: OAuthUserConnection) {
  if (!connection.refresh_token) {
    throw new Error("A conexao Google nao possui refresh token. Reconecte o Google Calendar com permissao de agenda.");
  }

  if (!config.oauthClientId || !config.oauthClientSecret) {
    throw new Error("Faltam GOOGLE_OAUTH_CLIENT_ID e GOOGLE_OAUTH_CLIENT_SECRET para renovar a conexao Google Calendar.");
  }

  const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: config.oauthClientId,
      client_secret: config.oauthClientSecret,
      refresh_token: connection.refresh_token,
      grant_type: "refresh_token",
    }),
    cache: "no-store",
  });

  if (!tokenResponse.ok) {
    const responseText = await tokenResponse.text();
    throw new Error(normalizeGoogleCalendarError({
      prefix: "Falha ao renovar a conexao Google Calendar.",
      mode: "oauth_user",
      details: responseText,
    }));
  }

  const tokenJson = (await tokenResponse.json()) as {
    access_token?: string;
    expires_in?: number;
    refresh_token?: string;
  };

  if (!tokenJson.access_token) {
    throw new Error("Google nao retornou access_token para a conexao OAuth.");
  }

  const expiresAt = typeof tokenJson.expires_in === "number"
    ? new Date(Date.now() + tokenJson.expires_in * 1000).toISOString()
    : null;

  return {
    accessToken: tokenJson.access_token,
    refreshToken: tokenJson.refresh_token ?? connection.refresh_token,
    accessTokenExpiresAt: expiresAt,
  };
}

export async function resolveGoogleCalendarAuthContext(params: {
  connection: OAuthUserConnection | null;
}) {
  const config = assertGoogleCalendarEnabled();

  if (config.clientEmail && config.privateKey) {
    return {
      authContext: {
        mode: "service_account",
        calendarId: config.calendarId,
        clientEmail: config.clientEmail,
        privateKey: config.privateKey,
      } satisfies ServiceAccountAuthContext,
      connectionUpdate: null,
    };
  }

  if (!params.connection?.access_token) {
    throw new Error("Conecte o Google Calendar da coordenacao ou admin para sincronizar manualmente com o calendario institucional.");
  }

  if (params.connection.refresh_token && config.oauthClientId && config.oauthClientSecret) {
    const refreshed = await refreshOAuthUserAccessToken(config, params.connection);
    return {
      authContext: {
        mode: "oauth_user",
        calendarId: config.calendarId,
        accessToken: refreshed.accessToken,
        refreshToken: refreshed.refreshToken,
        oauthClientId: config.oauthClientId,
        oauthClientSecret: config.oauthClientSecret,
      } satisfies OAuthUserAuthContext,
      connectionUpdate: refreshed,
    };
  }

  return {
    authContext: {
      mode: "oauth_user",
      calendarId: config.calendarId,
      accessToken: params.connection.access_token,
      refreshToken: params.connection.refresh_token,
      oauthClientId: config.oauthClientId,
      oauthClientSecret: config.oauthClientSecret,
    } satisfies OAuthUserAuthContext,
    connectionUpdate: null,
  };
}

async function callGoogleCalendar<T>(
  authContext: GoogleCalendarAuthContext,
  path: string,
  options: {
    method: "POST" | "PUT" | "PATCH";
    body?: unknown;
  }
) {
  const accessToken = authContext.mode === "service_account"
    ? await getServiceAccountAccessToken({
        ...getGoogleCalendarConfig(),
        enabled: true,
        calendarId: authContext.calendarId,
        clientEmail: authContext.clientEmail,
        privateKey: authContext.privateKey,
      })
    : authContext.accessToken;

  const response = await fetch(
    `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(authContext.calendarId)}${path}`,
    {
      method: options.method,
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: options.body ? JSON.stringify(options.body) : undefined,
      cache: "no-store",
    }
  );

  if (!response.ok) {
    const responseText = await response.text();
    throw new Error(normalizeGoogleCalendarError({
      prefix: "Falha ao sincronizar com Google Calendar.",
      mode: authContext.mode,
      details: responseText,
    }));
  }

  const json = (await response.json()) as T;
  return json;
}

export async function createGoogleCalendarEvent(
  authContext: GoogleCalendarAuthContext,
  payload: GoogleCalendarWritableEvent,
  connectionUpdate?: GoogleCalendarOperationResult["connectionUpdate"]
): Promise<GoogleCalendarOperationResult> {
  const json = await callGoogleCalendar<{ id: string; htmlLink?: string | null; status?: string | null }>(
    authContext,
    "/events?sendUpdates=none",
    { method: "POST", body: payload }
  );

  return {
    authMode: authContext.mode,
    calendarId: authContext.calendarId,
    eventId: json.id,
    htmlLink: json.htmlLink ?? null,
    status: json.status ?? null,
    connectionUpdate: connectionUpdate ?? null,
  };
}

export async function updateGoogleCalendarEvent(
  authContext: GoogleCalendarAuthContext,
  googleEventId: string,
  payload: GoogleCalendarWritableEvent,
  connectionUpdate?: GoogleCalendarOperationResult["connectionUpdate"]
): Promise<GoogleCalendarOperationResult> {
  const json = await callGoogleCalendar<{ id: string; htmlLink?: string | null; status?: string | null }>(
    authContext,
    `/events/${encodeURIComponent(googleEventId)}?sendUpdates=none`,
    { method: "PUT", body: payload }
  );

  return {
    authMode: authContext.mode,
    calendarId: authContext.calendarId,
    eventId: json.id,
    htmlLink: json.htmlLink ?? null,
    status: json.status ?? null,
    connectionUpdate: connectionUpdate ?? null,
  };
}

export async function cancelGoogleCalendarEvent(
  authContext: GoogleCalendarAuthContext,
  googleEventId: string,
  connectionUpdate?: GoogleCalendarOperationResult["connectionUpdate"]
): Promise<GoogleCalendarOperationResult> {
  const json = await callGoogleCalendar<{ id: string; htmlLink?: string | null; status?: string | null }>(
    authContext,
    `/events/${encodeURIComponent(googleEventId)}?sendUpdates=none`,
    { method: "PATCH", body: { status: "cancelled" } }
  );

  return {
    authMode: authContext.mode,
    calendarId: authContext.calendarId,
    eventId: json.id,
    htmlLink: json.htmlLink ?? null,
    status: json.status ?? null,
    connectionUpdate: connectionUpdate ?? null,
  };
}
