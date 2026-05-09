export type GoogleCalendarErrorMode = "service_account" | "oauth_user" | "unknown";

export type GoogleCalendarErrorCode =
  | "sync_disabled"
  | "calendar_not_configured"
  | "calendar_api_disabled"
  | "calendar_not_found"
  | "calendar_write_forbidden"
  | "oauth_connection_missing"
  | "oauth_refresh_missing"
  | "oauth_client_not_configured"
  | "oauth_token_expired"
  | "oauth_refresh_revoked"
  | "external_event_not_found"
  | "rate_limited"
  | "network_error"
  | "unknown";

export type GoogleCalendarErrorDetails = {
  code: GoogleCalendarErrorCode;
  safeMessage: string;
  recommendation: string;
  shouldReconnect: boolean;
  shouldCheckPermissions: boolean;
  shouldCheckGoogleSetup: boolean;
};

function normalizeText(value: unknown) {
  if (value instanceof Error) return value.message.toLowerCase();
  if (typeof value === "string") return value.toLowerCase();
  return "";
}

function buildDetails(
  code: GoogleCalendarErrorCode,
  safeMessage: string,
  recommendation: string,
  options: Partial<Pick<GoogleCalendarErrorDetails, "shouldReconnect" | "shouldCheckPermissions" | "shouldCheckGoogleSetup">> = {}
): GoogleCalendarErrorDetails {
  return {
    code,
    safeMessage,
    recommendation,
    shouldReconnect: Boolean(options.shouldReconnect),
    shouldCheckPermissions: Boolean(options.shouldCheckPermissions),
    shouldCheckGoogleSetup: Boolean(options.shouldCheckGoogleSetup),
  };
}

export function mapGoogleCalendarError(params: {
  error: unknown;
  mode?: GoogleCalendarErrorMode;
  operation?: "auth" | "refresh" | "create" | "update" | "cancel" | "unlink";
}) {
  const mode = params.mode ?? "unknown";
  const text = normalizeText(params.error);
  const eventOperation = params.operation === "update" || params.operation === "cancel";

  if (text.includes("nao esta habilitado neste ambiente")) {
    return buildDetails(
      "sync_disabled",
      "A sincronização com Google Calendar está desabilitada neste ambiente.",
      "Confira a flag GOOGLE_CALENDAR_SYNC_ENABLED antes de tentar novamente.",
      { shouldCheckGoogleSetup: true }
    );
  }

  if (text.includes("google_calendar_id") || text.includes("calendario institucional nao configurado")) {
    return buildDetails(
      "calendar_not_configured",
      "O calendário institucional ainda não foi configurado neste ambiente.",
      "Confira GOOGLE_CALENDAR_ID e a configuração do ambiente antes de sincronizar.",
      { shouldCheckGoogleSetup: true }
    );
  }

  if (text.includes("service_disabled") || text.includes("accessnotconfigured")) {
    return buildDetails(
      "calendar_api_disabled",
      "A Google Calendar API não está habilitada para este projeto OAuth.",
      "Confira se a API Google Calendar está habilitada no projeto Google Cloud do client OAuth.",
      { shouldCheckGoogleSetup: true }
    );
  }

  if (text.includes("conecte o google calendar") || text.includes("oauth manual")) {
    return buildDetails(
      "oauth_connection_missing",
      "Nenhuma conexão Google ativa foi encontrada para esta coordenação/admin.",
      "Use “Conectar Google Calendar” para autorizar a conta antes de sincronizar.",
      { shouldReconnect: true }
    );
  }

  if (text.includes("nao possui refresh token")) {
    return buildDetails(
      "oauth_refresh_missing",
      "A conexão Google não possui refresh token para reprocessamento seguro.",
      "Reconecte Google Calendar com consentimento offline para renovar a conexão.",
      { shouldReconnect: true }
    );
  }

  if (text.includes("faltam google_oauth_client_id") || text.includes("faltam google_oauth_client_secret")) {
    return buildDetails(
      "oauth_client_not_configured",
      "O ambiente ainda não está pronto para renovar a conexão OAuth do Google Calendar.",
      "Confira GOOGLE_OAUTH_CLIENT_ID e GOOGLE_OAUTH_CLIENT_SECRET no ambiente.",
      { shouldCheckGoogleSetup: true, shouldReconnect: true }
    );
  }

  if (text.includes("invalid_grant") || text.includes("token has been expired or revoked") || text.includes("token foi revogado")) {
    return buildDetails(
      "oauth_refresh_revoked",
      "A conexão Google expirou ou foi revogada pela conta conectada.",
      "Reconecte Google Calendar e confirme novamente o consentimento.",
      { shouldReconnect: true }
    );
  }

  if (text.includes("unauthorized") || text.includes("invalid credentials") || text.includes("invalid_token") || text.includes("token expirado")) {
    return buildDetails(
      "oauth_token_expired",
      "A autenticação Google desta conexão não está mais válida.",
      "Reconecte Google Calendar e tente novamente.",
      { shouldReconnect: true }
    );
  }

  if (text.includes("requiredaccesslevel") || text.includes("writer access") || text.includes("insufficient permissions")) {
    return buildDetails(
      "calendar_write_forbidden",
      mode === "service_account"
        ? "A service account configurada não tem permissão para editar este calendário."
        : "A conta conectada não tem permissão para editar este calendário.",
      mode === "service_account"
        ? "Compartilhe o calendário institucional com a service account com permissão de edição."
        : "Compartilhe o calendário institucional com a conta conectada usando permissão de edição.",
      { shouldCheckPermissions: true }
    );
  }

  if (text.includes("forbidden")) {
    return buildDetails(
      "calendar_write_forbidden",
      "A conta conectada não tem permissão suficiente para concluir esta operação no calendário.",
      "Verifique se a conta tem permissão de edição no calendário institucional.",
      { shouldCheckPermissions: true }
    );
  }

  if (text.includes("ratelimitexceeded") || text.includes("userratelimitexceeded") || text.includes("quotaexceeded") || text.includes("too many requests")) {
    return buildDetails(
      "rate_limited",
      "O Google Calendar recusou a operação por limite temporário de uso.",
      "Aguarde alguns instantes e tente novamente. Se persistir, revise a cota no Google Cloud.",
      { shouldCheckGoogleSetup: true }
    );
  }

  if (text.includes("fetch failed") || text.includes("network") || text.includes("econnreset") || text.includes("etimedout")) {
    return buildDetails(
      "network_error",
      "Houve uma falha de rede ao falar com o Google Calendar.",
      "Tente novamente em alguns instantes e confirme se o ambiente continua com acesso à internet."
    );
  }

  if (text.includes("not found")) {
    if (eventOperation || text.includes("evento externo")) {
      return buildDetails(
        "external_event_not_found",
        "O evento já não existe mais no Google Calendar.",
        "Desvincule o evento no SEMEAR e sincronize novamente se precisar recriá-lo."
      );
    }

    return buildDetails(
      "calendar_not_found",
      "O calendário institucional informado não foi encontrado para a conta conectada.",
      "Confira GOOGLE_CALENDAR_ID e confirme se a conta conectada tem acesso ao calendário compartilhado.",
      { shouldCheckPermissions: true, shouldCheckGoogleSetup: true }
    );
  }

  return buildDetails(
    "unknown",
    "Falha ao sincronizar com Google Calendar.",
    "Confira conexão Google, calendário institucional, permissões e configuração do ambiente antes de tentar novamente.",
    { shouldCheckGoogleSetup: true }
  );
}
