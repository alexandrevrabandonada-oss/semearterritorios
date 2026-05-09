"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Archive, CheckCheck, RefreshCcw, XCircle, PlayCircle, Eye, Calendar, Settings, FileText, FileCheck, Trash2, Sparkles } from "lucide-react";
import type { InAppNotification, NotificationPreference, Profile } from "@/lib/database.types";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";
import { getNotificationCategory, notificationCategoryLabel, type NotificationCategory } from "@/lib/notifications/notification-meta";
import { DailyBriefingPanel } from "./daily-briefing-panel";
import { OperationalOnboardingCard } from "@/components/onboarding/operational-onboarding-card";

type FilterType = "todos" | NotificationCategory;
type ReadFilter = "todos" | "nao_lidos" | "lidos";

export function NotificationsCenterPage() {
  const supabase = useMemo(() => createBrowserSupabaseClient(), []);
  const [items, setItems] = useState<InAppNotification[]>([]);
  const [role, setRole] = useState<Profile["role"]>(null);
  const [preferences, setPreferences] = useState<NotificationPreference | null>(null);
  const [onboarding, setOnboarding] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [cleaning, setCleaning] = useState(false);
  const [lastRefresh, setLastRefresh] = useState<string | null>(null);
  const [refreshStats, setRefreshStats] = useState<{ created: number; updated: number; ignored: number; suggested_cleanup?: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<FilterType>("todos");
  const [readFilter, setReadFilter] = useState<ReadFilter>("todos");
  const [showOnboarding, setShowOnboarding] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const categoria = params.get("categoria") as FilterType | null;
    const leitura = params.get("leitura") as ReadFilter | null;
    const onboardingParam = params.get("onboarding");

    if (categoria && (categoria === "todos" || categoria in notificationCategoryLabel)) {
      setFilter(categoria);
    }

    if (leitura && ["todos", "nao_lidos", "lidos"].includes(leitura)) {
      setReadFilter(leitura);
    }

    if (onboardingParam === "true") {
      setShowOnboarding(true);
    }
  }, []);

  useEffect(() => {
    void loadNotifications();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [supabase]);

  async function loadNotifications() {
    if (!supabase) {
      setLoading(false);
      return;
    }

    setError(null);
    const userResult = await supabase.auth.getUser();
    const userId = userResult.data.user?.id;

    if (!userId) {
      setError("Sessão inválida.");
      setLoading(false);
      return;
    }

    const [profileResult, notificationsResult, preferencesResult, onboardingResult] = await Promise.all([
      supabase.from("profiles").select("id, role").eq("id", userId).single(),
      supabase
        .from("in_app_notifications")
        .select("*")
        .order("priority", { ascending: false })
        .order("due_at", { ascending: true, nullsFirst: false })
        .order("created_at", { ascending: false }),
      supabase.from("notification_preferences").select("*").eq("profile_id", userId).maybeSingle(),
      supabase.from("user_onboarding_state").select("*").eq("profile_id", userId).maybeSingle(),
    ]);

    if (profileResult.error || notificationsResult.error) {
      setError(profileResult.error?.message ?? notificationsResult.error?.message ?? "Erro ao carregar avisos.");
      setLoading(false);
      return;
    }

    setRole((profileResult.data as Pick<Profile, "role">).role);
    setItems((notificationsResult.data ?? []) as InAppNotification[]);
    setPreferences(preferencesResult.data as NotificationPreference | null);
    setOnboarding(onboardingResult?.data ?? null);
    setLoading(false);
  }

  async function bulkArchiveResolved() {
    if (!supabase) return;
    setCleaning(true);
    const resolvedIds = items.filter(i => i.auto_resolution_suggested && ["unread", "read"].includes(i.status)).map(i => i.id);
    
    if (resolvedIds.length === 0) {
      setCleaning(false);
      return;
    }

    const { error } = await supabase.from("in_app_notifications").update({ status: "archived" }).in("id", resolvedIds);
    
    if (error) {
      setError(error.message);
    } else {
      setItems(current => current.map(item => resolvedIds.includes(item.id) ? { ...item, status: "archived" } as InAppNotification : item));
    }
    setCleaning(false);
  }

  async function refresh(scope: "self" | "role" | "all") {
    setRefreshing(true);
    setError(null);
    setRefreshStats(null);
    const start = new Date();
    
    const response = await fetch("/api/avisos/atualizar", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ scope }),
    });

    if (!response.ok) {
      const payload = (await response.json().catch(() => ({}))) as { error?: string };
      setError(payload.error ?? "Falha ao atualizar avisos.");
      setRefreshing(false);
      return;
    }

    const result = (await response.json()) as { created: number; updated: number; ignored: number };
    setRefreshStats(result);
    setLastRefresh(start.toLocaleTimeString("pt-BR"));
    
    await loadNotifications();
    setRefreshing(false);
  }

  async function updateStatus(id: string, status: InAppNotification["status"]) {
    const payload: {
      status: InAppNotification["status"];
      read_at?: string | null;
      dismissed_at?: string | null;
    } = { status };
    if (status === "read") payload.read_at = new Date().toISOString();
    if (status === "dismissed") payload.dismissed_at = new Date().toISOString();

    const result = await supabase?.from("in_app_notifications").update(payload).eq("id", id);
    if (result?.error) {
      setError(result.error.message);
      return;
    }

    setItems((current) =>
      current.map((item) => {
        if (item.id !== id) return item;
        return {
          ...item,
          ...payload,
        } as InAppNotification;
      })
    );
  }

  const filteredItems = items.filter((item) => {
    if (filter !== "todos" && getNotificationCategory(item.notification_type) !== filter) return false;
    if (readFilter === "nao_lidos" && item.status !== "unread") return false;
    if (readFilter === "lidos" && item.status !== "read") return false;
    return true;
  });

  const unread = filteredItems.filter((item) => item.status === "unread");
  const urgent = filteredItems.filter((item) => item.priority === "urgent" && ["unread", "read"].includes(item.status));
  const today = filteredItems.filter((item) => {
    const due = item.due_at ?? item.created_at;
    const date = new Date(due);
    const now = new Date();
    return date.getFullYear() === now.getFullYear() && date.getMonth() === now.getMonth() && date.getDate() === now.getDate();
  });
  const archived = filteredItems.filter((item) => ["archived", "dismissed"].includes(item.status));
  const suggestedResolved = items.filter((item) => item.auto_resolution_suggested && ["unread", "read"].includes(item.status));

  const groupedByCategory = Object.entries(notificationCategoryLabel).map(([key, label]) => ({
    category: key as NotificationCategory,
    label,
    items: filteredItems.filter((item) => 
      getNotificationCategory(item.notification_type) === key && 
      ["unread", "read"].includes(item.status) &&
      !item.auto_resolution_suggested
    ),
  }));

  const onboardingNotices = items.filter(i => i.notification_type === "onboarding_welcome" && ["unread", "read"].includes(i.status));

  return (
    <section className="pb-10">
      <div className="rounded-[2rem] border border-white/80 bg-white/78 p-6 shadow-soft sm:p-8">
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-semear-earth">Tijolo 063</p>
        <h2 className="mt-3 text-4xl font-semibold tracking-tight text-semear-green">Central de Avisos</h2>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-stone-600">
          Avisos internos do app para priorização operacional. Sem push, sem e-mail e sem webhook externo.
        </p>
        <div className="mt-5 flex flex-wrap gap-2">
          <button
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-semear-green px-4 text-sm font-semibold text-white disabled:opacity-60 transition-transform active:scale-95"
            disabled={refreshing}
            onClick={() => void refresh("self")}
            type="button"
          >
            <RefreshCcw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} aria-hidden="true" />
            Atualizar meus avisos
          </button>
          {role === "admin" || role === "coordenacao" ? (
            <>
              <button
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full border border-semear-green/15 bg-white px-4 text-sm font-semibold text-semear-green disabled:opacity-60"
                disabled={refreshing}
                onClick={() => void refresh("role")}
                type="button"
              >
                <RefreshCcw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} aria-hidden="true" />
                Avisos do papel
              </button>
              <button
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full border border-semear-green/15 bg-white px-4 text-sm font-semibold text-semear-green disabled:opacity-60"
                disabled={refreshing}
                onClick={() => void refresh("all")}
                type="button"
              >
                <RefreshCcw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} aria-hidden="true" />
                Avisos gerais
              </button>
            </>
          ) : null}
          <Link className="inline-flex min-h-11 items-center justify-center rounded-full border border-semear-green/15 bg-white px-4 text-sm font-semibold text-semear-green" href="/avisos/preferencias">
            <Settings className="h-4 w-4 mr-2" />
            Preferências
          </Link>
        </div>

        {(lastRefresh || refreshStats) && (
          <div className="mt-4 flex flex-wrap items-center gap-4 text-xs font-medium text-stone-500">
            {lastRefresh && <span>Última atualização: {lastRefresh}</span>}
            {refreshStats && (
              <div className="flex gap-3">
                <span className="text-semear-green">{refreshStats.created} novos</span>
                <span className="text-amber-600">{refreshStats.updated} atualizados</span>
                {refreshStats.suggested_cleanup && (
                  <span className="text-blue-600 font-bold">✨ {refreshStats.suggested_cleanup} resolvidos sugeridos</span>
                )}
                <span className="text-stone-400">{refreshStats.ignored} ignorados</span>
              </div>
            )}
          </div>
        )}
      </div>

      {onboarding && (showOnboarding || !onboarding.dismissed_onboarding) && (
        <div className="mt-6">
          <OperationalOnboardingCard state={onboarding} onUpdate={(s) => setOnboarding(s)} />
        </div>
      )}

      <div className="mt-6">
        <DailyBriefingPanel 
          notifications={items} 
          role={role ?? "equipe"} 
          preferences={preferences} 
          onboardingState={onboarding}
        />
      </div>

      <section className="mt-5 rounded-[2rem] border border-white/80 bg-white p-4 shadow-soft sm:p-5">
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          <label className="text-sm font-semibold text-semear-green">
            Filtro de categoria
            <select
              className="mt-2 min-h-11 w-full rounded-xl border border-semear-gray bg-white px-3 text-sm"
              onChange={(event) => setFilter(event.target.value as FilterType)}
              value={filter}
            >
              <option value="todos">Todos</option>
              {Object.entries(notificationCategoryLabel).map(([key, label]) => (
                <option key={key} value={key}>{label}</option>
              ))}
            </select>
          </label>
          <label className="text-sm font-semibold text-semear-green">
            Lidos e não lidos
            <select
              className="mt-2 min-h-11 w-full rounded-xl border border-semear-gray bg-white px-3 text-sm"
              onChange={(event) => setReadFilter(event.target.value as ReadFilter)}
              value={readFilter}
            >
              <option value="todos">Todos</option>
              <option value="nao_lidos">Não lidos</option>
              <option value="lidos">Lidos</option>
            </select>
          </label>
          <div className="rounded-xl border border-semear-gray bg-semear-offwhite px-4 py-3 text-sm text-stone-600">
            {loading ? "Carregando..." : `${filteredItems.length} aviso(s) no recorte atual.`}
          </div>
        </div>
      </section>

      {error ? <StateBox tone="error">{error}</StateBox> : null}

      {!loading ? (
        <div className="mt-5 space-y-5">
          {onboardingNotices.length > 0 && (
            <NotificationSection 
              title="Boas-vindas" 
              items={onboardingNotices} 
              onArchive={(id) => void updateStatus(id, "archived")} 
              onDismiss={(id) => void updateStatus(id, "dismissed")} 
              onRead={(id) => void updateStatus(id, "read")} 
              tone="blue"
            />
          )}

          {suggestedResolved.length > 0 && (
            <section className="rounded-[2rem] border border-blue-200 bg-blue-50/50 p-6 shadow-soft">
              <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
                <div>
                  <h3 className="text-xl font-semibold text-blue-900 flex items-center gap-2">
                    <Sparkles className="h-5 w-5 text-blue-600" />
                    Resolvidos na origem
                  </h3>
                  <p className="text-sm text-blue-700 mt-1">
                    O sistema detectou que estes avisos parecem ter sido concluídos.
                  </p>
                </div>
                <button
                  onClick={bulkArchiveResolved}
                  disabled={cleaning}
                  className="inline-flex items-center gap-2 rounded-full bg-blue-600 px-4 py-2 text-sm font-bold text-white hover:bg-blue-700 disabled:opacity-50 transition-all"
                >
                  <Archive className="h-4 w-4" />
                  Arquivar todos os resolvidos
                </button>
              </div>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {suggestedResolved.map(item => (
                  <article key={item.id} className="rounded-xl border border-blue-200 bg-white p-4 shadow-sm">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[10px] font-bold uppercase text-blue-600 tracking-wider">Sugestão de Limpeza</span>
                      <button onClick={() => updateStatus(item.id, "archived")} className="text-blue-400 hover:text-blue-600 p-1">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                    <h4 className="mt-2 text-sm font-bold text-stone-900">{item.title}</h4>
                    <p className="mt-1 text-xs text-stone-500 italic">{item.resolution_reason ?? "Parece resolvido."}</p>
                    <div className="mt-3 flex gap-2">
                      <button 
                        onClick={() => updateStatus(item.id, "read")}
                        className="text-[11px] font-bold text-blue-600 hover:underline"
                      >
                        Manter aviso
                      </button>
                      <Link href={item.action_url ?? "#"} className="text-[11px] font-bold text-stone-400 hover:text-stone-600 ml-auto">
                        Ver origem
                      </Link>
                    </div>
                  </article>
                ))}
              </div>
            </section>
          )}

          <NotificationSection title="Não lidos" items={unread.filter(i => !i.auto_resolution_suggested && i.notification_type !== "onboarding_welcome")} onArchive={(id) => void updateStatus(id, "archived")} onDismiss={(id) => void updateStatus(id, "dismissed")} onRead={(id) => void updateStatus(id, "read")} />
          <NotificationSection title="Urgentes" items={urgent.filter(i => !i.auto_resolution_suggested)} onArchive={(id) => void updateStatus(id, "archived")} onDismiss={(id) => void updateStatus(id, "dismissed")} onRead={(id) => void updateStatus(id, "read")} />
          <NotificationSection title="Hoje" items={today.filter(i => !i.auto_resolution_suggested)} onArchive={(id) => void updateStatus(id, "archived")} onDismiss={(id) => void updateStatus(id, "dismissed")} onRead={(id) => void updateStatus(id, "read")} />

          {groupedByCategory.map((group) => (
            <NotificationSection
              key={group.category}
              title={group.label}
              items={group.items}
              onArchive={(id) => void updateStatus(id, "archived")}
              onDismiss={(id) => void updateStatus(id, "dismissed")}
              onRead={(id) => void updateStatus(id, "read")}
            />
          ))}

          <NotificationSection title="Arquivados e dispensados" items={archived} onArchive={(id) => void updateStatus(id, "archived")} onDismiss={(id) => void updateStatus(id, "dismissed")} onRead={(id) => void updateStatus(id, "read")} />
        </div>
      ) : (
        <StateBox>Carregando avisos...</StateBox>
      )}
    </section>
  );
}

function NotificationSection({
  title,
  items,
  onRead,
  onDismiss,
  onArchive,
  tone = "green",
}: {
  title: string;
  items: InAppNotification[];
  onRead: (id: string) => void;
  onDismiss: (id: string) => void;
  onArchive: (id: string) => void;
  tone?: "green" | "blue";
}) {
  if (items.length === 0 && tone === "green") return null;

  const titleColor = tone === "blue" ? "text-blue-900" : "text-semear-green";
  const badgeColor = tone === "blue" ? "bg-blue-100 text-blue-700" : "bg-semear-green-soft text-semear-green";

  return (
    <section className={`rounded-[2rem] border p-4 shadow-soft sm:p-5 ${tone === "blue" ? "border-blue-100 bg-blue-50/30" : "border-white/80 bg-white"}`}>
      <div className="mb-3 flex items-center justify-between gap-3">
        <h3 className={`text-xl font-semibold ${titleColor}`}>{title}</h3>
        <span className={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.12em] ${badgeColor}`}>
          {items.length}
        </span>
      </div>
      {items.length === 0 ? <p className="text-sm text-stone-500">Sem avisos nesta seção.</p> : null}
      <div className="space-y-3">
        {items.map((item) => (
          <article key={item.id} className="rounded-2xl border border-semear-gray bg-semear-offwhite p-4">
            <div className="flex flex-wrap items-center gap-2">
              <span className={badgeClass(item.priority)}>{getPriorityLabel(item.priority)}</span>
              <span className="rounded-full bg-white px-2 py-0.5 text-[11px] font-semibold text-semear-earth">{item.status === "unread" ? "Não lido" : item.status === "read" ? "Lido" : item.status}</span>
              <span className="text-xs text-stone-500">{formatDate(item.due_at ?? item.created_at)}</span>
            </div>
            <h4 className="mt-2 text-lg font-semibold text-semear-green">{item.title}</h4>
            {item.body ? <p className="mt-1 text-sm leading-6 text-stone-700">{item.body}</p> : null}

            <div className="mt-4 grid gap-2 sm:flex sm:flex-wrap">
              <button className="inline-flex min-h-10 items-center justify-center gap-2 rounded-full border border-semear-green/15 bg-white px-3 text-sm font-semibold text-semear-green hover:bg-semear-green hover:text-white transition-colors" onClick={() => onRead(item.id)} type="button">
                <CheckCheck className="h-4 w-4" aria-hidden="true" />
                Marcar como lido
              </button>
              <button className="inline-flex min-h-10 items-center justify-center gap-2 rounded-full border border-semear-green/15 bg-white px-3 text-sm font-semibold text-stone-600 hover:bg-red-50 hover:text-red-600 hover:border-red-200 transition-colors" onClick={() => onDismiss(item.id)} type="button">
                <XCircle className="h-4 w-4" aria-hidden="true" />
                Dispensar
              </button>
              <button className="inline-flex min-h-10 items-center justify-center gap-2 rounded-full border border-semear-green/15 bg-white px-3 text-sm font-semibold text-stone-600 hover:bg-stone-100 transition-colors" onClick={() => onArchive(item.id)} type="button">
                <Archive className="h-4 w-4" aria-hidden="true" />
                Arquivar
              </button>
              <Link className="inline-flex min-h-10 items-center justify-center gap-2 rounded-full bg-semear-green px-4 text-sm font-semibold text-white shadow-sm hover:brightness-95 transition-all" href={item.action_url ?? "/avisos"}>
                <RecommendedActionIcon type={item.notification_type} />
                {getRecommendedActionLabel(item.notification_type)}
              </Link>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

function RecommendedActionIcon({ type }: { type: string }) {
  if (type === "listening_review_pending") return <Eye className="h-4 w-4" />;
  if (type === "dossier_pending") return <FileCheck className="h-4 w-4" />;
  if (type === "debrief_pending") return <PlayCircle className="h-4 w-4" />;
  if (type.includes("agenda")) return <Calendar className="h-4 w-4" />;
  if (type.includes("report")) return <FileText className="h-4 w-4" />;
  return <PlayCircle className="h-4 w-4" />;
}

function getRecommendedActionLabel(type: string) {
  if (type === "listening_review_pending") return "Revisar escutas";
  if (type === "dossier_pending") return "Abrir dossiê";
  if (type === "debrief_pending") return "Abrir devolutiva";
  if (type === "google_sync_error") return "Reconectar Google";
  if (type === "transparency_review_pending") return "Revisar snapshot";
  if (type === "weekly_report_due") return "Abrir relatório semanal";
  if (type.includes("agenda")) return "Abrir evento";
  return "Abrir origem";
}

function StateBox({ children, tone = "neutral" }: { children: React.ReactNode; tone?: "neutral" | "error" }) {
  return (
    <div className={`mt-5 rounded-[1.5rem] p-5 text-sm shadow-soft ${tone === "error" ? "border border-red-200 bg-red-50 text-red-800" : "border border-white/80 bg-white/72 text-stone-600"}`}>
      {children}
    </div>
  );
}

function getPriorityLabel(priority: string) {
  if (priority === "urgent") return "Urgente";
  if (priority === "high") return "Alta";
  if (priority === "low") return "Baixa";
  return "Normal";
}

function badgeClass(priority: string) {
  if (priority === "urgent") return "rounded-full bg-red-100 px-2 py-0.5 text-[11px] font-semibold text-red-800";
  if (priority === "high") return "rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-semibold text-amber-900";
  if (priority === "low") return "rounded-full bg-stone-100 px-2 py-0.5 text-[11px] font-semibold text-stone-700";
  return "rounded-full bg-semear-green-soft px-2 py-0.5 text-[11px] font-semibold text-semear-green";
}

function formatDate(value: string) {
  return new Date(value).toLocaleString("pt-BR");
}
