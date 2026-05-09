import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getGoogleCalendarConfig } from "@/lib/google-calendar/google-calendar-api";
import type { GoogleCalendarSyncLog, Profile, TeamCalendarEvent } from "@/lib/database.types";
import { getGoogleCalendarSyncStatusLabel, getGoogleCalendarSyncStatusTone } from "@/lib/team-calendar";

type SafeEvent = Pick<TeamCalendarEvent, "id" | "title" | "google_sync_status" | "google_synced_at" | "updated_at">;

export default async function GoogleCalendarStatusPage() {
  const supabase = createSupabaseServerClient();
  const config = getGoogleCalendarConfig();
  const userResult = await supabase.auth.getUser();
  const user = userResult.data.user;

  if (!user) {
    return (
      <AppShell activeHref="/agenda">
        <StateBox tone="error">Sessão inválida.</StateBox>
      </AppShell>
    );
  }

  const profileResult = await supabase.from("profiles").select("id, role, full_name").eq("id", user.id).single();
  if (profileResult.error || !profileResult.data) {
    return (
      <AppShell activeHref="/agenda">
        <StateBox tone="error">Perfil não encontrado.</StateBox>
      </AppShell>
    );
  }

  const profile = profileResult.data as Pick<Profile, "id" | "role" | "full_name">;
  if (!["admin", "coordenacao"].includes(profile.role ?? "")) {
    return (
      <AppShell activeHref="/agenda">
        <StateBox>
          O painel de saúde do Google Calendar está disponível apenas para coordenação e admin. A equipe continua vendo status e histórico dentro de cada evento.
        </StateBox>
      </AppShell>
    );
  }

  const [connectionResult, logsResult, eventsResult] = await Promise.all([
    supabase
      .from("google_calendar_user_connections")
      .select("provider_user_email, refresh_token, updated_at")
      .eq("profile_id", profile.id)
      .maybeSingle(),
    supabase
      .from("google_calendar_sync_logs")
      .select("id, event_id, action, status, message, synced_at")
      .order("synced_at", { ascending: false })
      .limit(20),
    supabase
      .from("team_calendar_events")
      .select("id, title, google_sync_status, google_synced_at, updated_at")
      .order("updated_at", { ascending: false }),
  ]);

  if (connectionResult.error || logsResult.error || eventsResult.error) {
    return (
      <AppShell activeHref="/agenda">
        <StateBox tone="error">
          {connectionResult.error?.message ?? logsResult.error?.message ?? eventsResult.error?.message ?? "Falha ao carregar o painel de saúde."}
        </StateBox>
      </AppShell>
    );
  }

  const connection = connectionResult.data;
  const logs = (logsResult.data ?? []) as Pick<GoogleCalendarSyncLog, "id" | "event_id" | "action" | "status" | "message" | "synced_at">[];
  const events = (eventsResult.data ?? []) as SafeEvent[];
  const lastSuccess = logs.find((log) => log.status === "success") ?? null;
  const lastErrors = logs.filter((log) => log.status === "failed").slice(0, 5);
  const syncErrorEvents = events.filter((event) => event.google_sync_status === "sync_error").slice(0, 8);
  const pendingEvents = events
    .filter((event) => event.google_synced_at && ["synced", "cancelled"].includes(event.google_sync_status ?? "") && new Date(event.updated_at).getTime() > new Date(event.google_synced_at).getTime())
    .slice(0, 8);

  const counters = {
    synced: events.filter((event) => event.google_sync_status === "synced").length,
    cancelled: events.filter((event) => event.google_sync_status === "cancelled").length,
    unlinked: events.filter((event) => event.google_sync_status === "unlinked").length,
    errors: syncErrorEvents.length,
    pending: pendingEvents.length,
  };

  return (
    <AppShell activeHref="/agenda">
      <section className="pb-10">
        <div className="rounded-[2rem] border border-white/80 bg-white/78 p-6 shadow-soft sm:p-8">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-semear-earth">Google Calendar</p>
          <h2 className="mt-3 text-4xl font-semibold tracking-tight text-semear-green">Saúde da integração</h2>
          <p className="mt-4 max-w-3xl text-sm leading-6 text-stone-600">
            Painel operacional seguro para acompanhar conexão atual, últimos erros e eventos que ainda precisam de reprocessamento manual no Google Calendar.
          </p>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-3">
          <InfoCard label="Sync habilitado" value={config.enabled ? "Sim" : "Não"} />
          <InfoCard label="Conexão ativa do usuário atual" value={connection?.provider_user_email ? `Sim (${connection.provider_user_email})` : "Não"} />
          <InfoCard label="Refresh token presente" value={connection?.refresh_token ? "Sim" : "Não"} />
          <InfoCard label="Último sync bem-sucedido" value={lastSuccess ? new Date(lastSuccess.synced_at).toLocaleString("pt-BR") : "Nenhum"} />
          <InfoCard label="Eventos com sync_error" value={String(counters.errors)} />
          <InfoCard label="Alterações locais pendentes" value={String(counters.pending)} />
          <InfoCard label="Eventos sincronizados" value={String(counters.synced)} />
          <InfoCard label="Eventos cancelados" value={String(counters.cancelled)} />
          <InfoCard label="Eventos desvinculados" value={String(counters.unlinked)} />
        </div>

        <div className="mt-6 grid gap-5 xl:grid-cols-2">
          <Panel title="Últimos erros">
            {lastErrors.length === 0 ? <EmptyBox text="Nenhum erro recente registrado." /> : null}
            {lastErrors.map((log) => (
              <article className="rounded-2xl border border-semear-gray bg-semear-offwhite p-4" key={log.id}>
                <p className="font-semibold text-semear-green capitalize">{log.action}</p>
                <p className="mt-1 text-xs text-stone-500">{new Date(log.synced_at).toLocaleString("pt-BR")}</p>
                <p className="mt-2 text-sm leading-6 text-stone-700">{log.message ?? "Sem mensagem segura registrada."}</p>
              </article>
            ))}
          </Panel>

          <Panel title="Eventos com sync_error">
            {syncErrorEvents.length === 0 ? <EmptyBox text="Nenhum evento com sync_error neste momento." /> : null}
            {syncErrorEvents.map((event) => (
              <Link className="block rounded-2xl border border-semear-gray bg-semear-offwhite p-4" href={`/agenda/${event.id}`} key={event.id}>
                <div className="flex items-center justify-between gap-3">
                  <p className="font-semibold text-semear-green">{event.title}</p>
                  <StatusBadge tone={getGoogleCalendarSyncStatusTone(event.google_sync_status)} label={getGoogleCalendarSyncStatusLabel(event.google_sync_status)} />
                </div>
                <p className="mt-2 text-xs text-stone-500">Última atualização: {new Date(event.updated_at).toLocaleString("pt-BR")}</p>
              </Link>
            ))}
          </Panel>

          <Panel title="Alterações locais pendentes de sincronização">
            {pendingEvents.length === 0 ? <EmptyBox text="Nenhum evento com drift local pendente neste momento." /> : null}
            {pendingEvents.map((event) => (
              <Link className="block rounded-2xl border border-semear-gray bg-semear-offwhite p-4" href={`/agenda/${event.id}`} key={event.id}>
                <p className="font-semibold text-semear-green">{event.title}</p>
                <p className="mt-2 text-xs text-stone-500">
                  Atualizado em {new Date(event.updated_at).toLocaleString("pt-BR")} após o último sync de {event.google_synced_at ? new Date(event.google_synced_at).toLocaleString("pt-BR") : "—"}.
                </p>
              </Link>
            ))}
          </Panel>

          <Panel title="Operação assistida">
            <div className="space-y-3 text-sm leading-6 text-stone-700">
              <p>Use este painel para identificar conexão ativa, refresh token presente, erros recentes e eventos pendentes de reprocessamento.</p>
              <p>O reprocessamento continua manual, auditável e sem webhook reverso. Alterações feitas direto no Google não voltam automaticamente para o SEMEAR.</p>
              <p>Convites por e-mail seguem opcionais, por evento e desativados por padrão.</p>
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              <Link className="inline-flex min-h-11 items-center rounded-full bg-semear-green px-4 text-sm font-semibold text-white" href="/agenda">
                Voltar para agenda
              </Link>
              <Link className="inline-flex min-h-11 items-center rounded-full border border-semear-green/15 bg-white px-4 text-sm font-semibold text-semear-green" href="/avisos?categoria=google">
                Abrir avisos de Google
              </Link>
              <Link className="inline-flex min-h-11 items-center rounded-full border border-semear-green/15 bg-white px-4 text-sm font-semibold text-semear-green" href="/ajuda#google-calendar-manual">
                Abrir ajuda
              </Link>
            </div>
          </Panel>
        </div>
      </section>
    </AppShell>
  );
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-[2rem] border border-white/80 bg-white p-5 shadow-soft">
      <h3 className="text-xl font-semibold text-semear-green">{title}</h3>
      <div className="mt-4 space-y-3">{children}</div>
    </section>
  );
}

function InfoCard({ label, value }: { label: string; value: string }) {
  return (
    <section className="rounded-2xl border border-semear-gray bg-semear-offwhite p-4">
      <p className="text-xs font-semibold uppercase tracking-[0.12em] text-semear-earth">{label}</p>
      <p className="mt-2 text-sm font-semibold text-semear-green">{value}</p>
    </section>
  );
}

function StatusBadge({ label, tone }: { label: string; tone: "green" | "yellow" | "red" | "stone" }) {
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
