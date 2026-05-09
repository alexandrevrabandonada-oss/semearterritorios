"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Bell, BellDot } from "lucide-react";
import type { NotificationPreference } from "@/lib/database.types";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";

type NotificationRow = {
  id: string;
  title: string;
  status: "unread" | "read" | "archived" | "dismissed";
  priority: "low" | "normal" | "high" | "urgent";
  action_url: string | null;
  created_at: string;
};

export function NotificationsBell() {
  const supabase = useMemo(() => createBrowserSupabaseClient(), []);
  const [open, setOpen] = useState(false);
  const [recent, setRecent] = useState<NotificationRow[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [quietMode, setQuietMode] = useState(false);

  useEffect(() => {
    let ignore = false;

    async function load() {
      if (!supabase) {
        setLoading(false);
        return;
      }

      const userResult = await supabase.auth.getUser();
      const userId = userResult.data.user?.id;
      if (!userId) {
        setLoading(false);
        return;
      }

      const [recentResult, preferenceResult] = await Promise.all([
        supabase
          .from("in_app_notifications")
          .select("id, title, status, priority, action_url, created_at")
          .in("status", ["unread", "read"])
          .order("created_at", { ascending: false })
          .limit(5),
        supabase
          .from("notification_preferences")
          .select("*")
          .eq("profile_id", userId)
          .maybeSingle(),
      ]);

      if (ignore) return;

      const prefs = preferenceResult.data as NotificationPreference | null;
      const quiet = prefs?.quiet_mode ?? false;
      setQuietMode(quiet);

      const items = ((recentResult.data ?? []) as NotificationRow[]).filter((item) => item.status !== "archived" && item.status !== "dismissed");
      setRecent(items);

      const count = items.filter((item) => {
        if (item.status !== "unread") return false;
        if (!quiet) return true;
        return item.priority === "urgent";
      }).length;

      setUnreadCount(count);
      setLoading(false);
    }

    void load();

    return () => {
      ignore = true;
    };
  }, [supabase]);

  return (
    <div className="relative">
      <button
        className="relative inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-semear-green/15 bg-white text-semear-green shadow-sm"
        onClick={() => setOpen((current) => !current)}
        type="button"
      >
        {unreadCount > 0 ? <BellDot className="h-5 w-5" aria-hidden="true" /> : <Bell className="h-5 w-5" aria-hidden="true" />}
        <span className="sr-only">Abrir avisos</span>
        {unreadCount > 0 ? (
          <span className="absolute -right-1 -top-1 inline-flex min-h-5 min-w-5 items-center justify-center rounded-full bg-red-600 px-1 text-[10px] font-bold text-white">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        ) : null}
      </button>

      {open ? (
        <div className="absolute right-0 top-12 z-50 w-[20rem] rounded-2xl border border-semear-gray bg-white p-3 shadow-[0_16px_40px_rgba(23,74,55,0.16)]">
          <div className="mb-2 flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-semear-earth">Avisos</p>
            <Link className="text-xs font-semibold text-semear-green hover:underline" href="/avisos" onClick={() => setOpen(false)}>
              Ver todos
            </Link>
          </div>
          <div className="space-y-2">
            {loading ? <p className="text-sm text-stone-500">Carregando...</p> : null}
            {!loading && recent.length === 0 ? <p className="text-sm text-stone-500">Sem avisos recentes.</p> : null}
            {recent.map((item) => (
              <Link
                key={item.id}
                className="block rounded-xl border border-semear-gray bg-semear-offwhite p-3"
                href={item.action_url ?? "/avisos"}
                onClick={() => setOpen(false)}
              >
                <p className="line-clamp-2 text-sm font-semibold text-semear-green">{item.title}</p>
                <p className="mt-1 text-xs text-stone-500">{item.status === "unread" ? "Não lido" : "Lido"} · {formatDate(item.created_at)}</p>
              </Link>
            ))}
          </div>
          {quietMode ? <p className="mt-2 text-[11px] text-stone-500">Modo silencioso ativo: badge mostra só urgentes.</p> : null}
        </div>
      ) : null}
    </div>
  );
}

function formatDate(value: string) {
  return new Date(value).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
}
