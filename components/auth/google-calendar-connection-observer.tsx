"use client";

import { useEffect } from "react";
import type { Session } from "@supabase/supabase-js";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";
import {
  GOOGLE_CALENDAR_CONNECT_PENDING_KEY,
  GOOGLE_CALENDAR_CONNECT_RESULT_KEY,
  GOOGLE_CALENDAR_OAUTH_SCOPE,
} from "@/lib/google-calendar/browser";

function getPendingConnectionFlag() {
  if (typeof window === "undefined") {
    return null;
  }

  return window.localStorage.getItem(GOOGLE_CALENDAR_CONNECT_PENDING_KEY);
}

function clearPendingConnectionFlag() {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.removeItem(GOOGLE_CALENDAR_CONNECT_PENDING_KEY);
}

function setConnectionResult(result: { tone: "success" | "error"; text: string }) {
  if (typeof window === "undefined") {
    return;
  }

  window.sessionStorage.setItem(GOOGLE_CALENDAR_CONNECT_RESULT_KEY, JSON.stringify(result));
}

async function storeGoogleCalendarConnection(session: Session) {
  const googleIdentity = session.user.identities?.find((identity) => identity.provider === "google");
  const response = await fetch("/api/google-calendar/connection", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      provider_token: session.provider_token,
      provider_refresh_token: session.provider_refresh_token,
      provider_user_email: session.user.email ?? null,
      provider_user_id: googleIdentity?.id ?? null,
      scopes: GOOGLE_CALENDAR_OAUTH_SCOPE,
    }),
  });

  const payload = (await response.json().catch(() => null)) as { error?: string; message?: string } | null;
  if (!response.ok || payload?.error) {
    throw new Error(payload?.error ?? "Nao foi possivel salvar a conexao com Google Calendar.");
  }

  setConnectionResult({
    tone: "success",
    text: payload?.message ?? "Conexao com Google Calendar registrada no SEMEAR.",
  });
}

export function GoogleCalendarConnectionObserver() {
  useEffect(() => {
    const supabase = createBrowserSupabaseClient();
    if (!supabase) {
      return;
    }

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session?.provider_token || !getPendingConnectionFlag()) {
        return;
      }

      void storeGoogleCalendarConnection(session)
        .catch((error) => {
          setConnectionResult({
            tone: "error",
            text: error instanceof Error ? error.message : "Falha ao registrar a conexao com Google Calendar.",
          });
        })
        .finally(() => {
          clearPendingConnectionFlag();
        });
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  return null;
}
