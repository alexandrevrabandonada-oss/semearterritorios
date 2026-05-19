"use client";

import Link from "next/link";

type SyncAction = "create" | "update" | "cancel" | "unlink";
type ConnectionAction = "connect" | "disconnect";

type RetryPanelProps = {
  syncErrorCode?: string;
  hint?: string;
  hasExternalEvent: boolean;
  showReconnect: boolean;
  showDocsLink: boolean;
  canRetry: boolean;
  syncActionLoading: SyncAction | null;
  connectionActionLoading: ConnectionAction | null;
  onRetry: () => void;
  onReconnect: () => void;
  onUnlink: () => void;
};

const errorLabels: Record<string, string> = {
  oauth_refresh_missing: "Refresh token ausente",
  oauth_refresh_revoked: "Refresh revogado",
  calendar_not_found: "Calendário não encontrado",
  calendar_write_forbidden: "Permissão insuficiente",
  calendar_api_disabled: "API desabilitada",
  rate_limited: "Quota ou rate limit",
  external_event_not_found: "Evento externo não encontrado",
  network_error: "Falha de rede",
};

export function GoogleCalendarRetryPanel({
  syncErrorCode,
  hint,
  hasExternalEvent,
  showReconnect,
  showDocsLink,
  canRetry,
  syncActionLoading,
  connectionActionLoading,
  onRetry,
  onReconnect,
  onUnlink,
}: RetryPanelProps) {
  return (
    <div className="mt-4 rounded-3xl border border-red-200 bg-red-50/80 p-4 text-sm leading-6 text-red-900 backdrop-blur-sm shadow-premium-sm font-semibold">
      <p className="font-extrabold uppercase tracking-wider text-red-800 text-xs">Erro de sincronização detectado</p>
      <p className="mt-2 text-stone-750">
        Tipo de erro: <strong className="text-red-700 font-extrabold">{syncErrorCode ? errorLabels[syncErrorCode] ?? syncErrorCode : "Erro operacional seguro"}</strong>.
      </p>
      <p className="mt-2 text-stone-600">{hint ?? "Confira calendário institucional, conexão Google, envs e permissões do compartilhamento."}</p>
      <div className="mt-4 flex flex-wrap gap-2">
        <button
          className="inline-flex min-h-10 items-center justify-center rounded-full bg-semear-green px-4 text-sm font-bold text-white shadow-premium-sm transition hover:bg-semear-green/90 active:scale-[0.98] duration-200 disabled:cursor-not-allowed disabled:opacity-60"
          disabled={syncActionLoading !== null || connectionActionLoading !== null || !canRetry}
          onClick={onRetry}
          type="button"
        >
          {syncActionLoading === "create" || syncActionLoading === "update" ? "Tentando..." : "Tentar novamente"}
        </button>
        {hasExternalEvent ? (
          <button
            className="inline-flex min-h-10 items-center justify-center rounded-full border border-white/60 bg-white/85 px-4 text-sm font-bold text-stone-700 shadow-premium-sm transition hover:bg-white active:scale-[0.98] duration-200 disabled:cursor-not-allowed disabled:opacity-60"
            disabled={syncActionLoading !== null || connectionActionLoading !== null}
            onClick={onUnlink}
            type="button"
          >
            Desvincular do Google
          </button>
        ) : null}
        {showReconnect ? (
          <button
            className="inline-flex min-h-10 items-center justify-center rounded-full border border-semear-green/30 bg-white/85 px-4 text-sm font-bold text-semear-green shadow-premium-sm transition hover:bg-white active:scale-[0.98] duration-200 disabled:cursor-not-allowed disabled:opacity-60"
            disabled={syncActionLoading !== null || connectionActionLoading !== null}
            onClick={onReconnect}
            type="button"
          >
            {connectionActionLoading === "connect" ? "Reconectando..." : "Reconectar Google Calendar"}
          </button>
        ) : null}
        {showDocsLink ? (
          <Link
            className="inline-flex min-h-10 items-center justify-center rounded-full border border-white/60 bg-white/85 px-4 text-sm font-bold text-stone-700 shadow-premium-sm transition hover:bg-white active:scale-[0.98] duration-200"
            href="/ajuda#google-calendar-manual"
          >
            Abrir ajuda
          </Link>
        ) : null}
      </div>
    </div>
  );
}
