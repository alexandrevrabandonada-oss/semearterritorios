import type {
  Action,
  ActionClosure,
  ActionDebrief,
  ListeningRecord,
  PublicTransparencyHomologationPackage,
  PublicTransparencySnapshot,
  PublicTransparencySnapshotReviewComment,
  TeamCalendarEvent,
  TeamCalendarEventMember,
  TeamMember,
  WeeklyTeamReport,
} from "@/lib/database.types";

export type InternalNotificationType =
  | "agenda_event_today"
  | "agenda_event_tomorrow"
  | "agenda_event_overdue"
  | "google_sync_error"
  | "google_drift_pending"
  | "weekly_report_due"
  | "weekly_report_needs_changes"
  | "debrief_pending"
  | "dossier_pending"
  | "listening_review_pending"
  | "transparency_review_pending"
  | "memory_review_pending"
  | "system_notice"
  | "onboarding_welcome"
  | "outro";

export type InternalNotificationPriority = "low" | "normal" | "high" | "urgent";

export type NotificationPreferencesConfig = {
  agenda_reminders: boolean;
  google_calendar_alerts: boolean;
  weekly_report_alerts: boolean;
  debrief_dossier_alerts: boolean;
  listening_review_alerts: boolean;
  transparency_alerts: boolean;
  memory_alerts: boolean;
  quiet_mode: boolean;
};

export type BuiltInternalNotification = {
  profile_id: string | null;
  team_member_id: string | null;
  audience_role: "equipe" | "coordenacao" | "admin" | null;
  title: string;
  body: string | null;
  notification_type: InternalNotificationType;
  priority: InternalNotificationPriority;
  source_type: string | null;
  source_id: string | null;
  action_url: string | null;
  due_at: string | null;
};

export type BuildInternalNotificationsInput = {
  profileId: string;
  role: "equipe" | "coordenacao" | "admin";
  teamMember: TeamMember | null;
  preferences: NotificationPreferencesConfig;
  events: TeamCalendarEvent[];
  eventMembers: TeamCalendarEventMember[];
  weeklyReports: WeeklyTeamReport[];
  actions: Action[];
  debriefs: ActionDebrief[];
  closures: ActionClosure[];
  listeningRecords: ListeningRecord[];
  snapshots: PublicTransparencySnapshot[];
  homologationPackages: PublicTransparencyHomologationPackage[];
  snapshotComments: PublicTransparencySnapshotReviewComment[];
  now?: Date;
};

const cpfLikeRegex = /\b\d{3}\.?\d{3}\.?\d{3}-?\d{2}\b/;
const phoneLikeRegex = /\b(?:\+?55\s?)?(?:\(?\d{2}\)?\s?)?(?:9\d{4}|\d{4})-?\d{4}\b/;
const emailLikeRegex = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i;
const addressLikeRegex = /\b(rua|av\.?|avenida|travessa|alameda|rodovia|estrada|numero|n[o\.]|cep)\b/i;

export function buildInternalNotifications(input: BuildInternalNotificationsInput): BuiltInternalNotification[] {
  const now = input.now ?? new Date();
  const startToday = getStartOfDay(now);
  const endToday = getEndOfDay(now);
  const startTomorrow = new Date(startToday);
  startTomorrow.setDate(startTomorrow.getDate() + 1);
  const endTomorrow = getEndOfDay(startTomorrow);
  const weekStart = getWeekStartIso(now);

  const visibleEventIds = getVisibleEventIds(input);
  const visibleEvents = input.events.filter((event) => visibleEventIds.has(event.id));

  const notifications: BuiltInternalNotification[] = [];
  const push = (item: BuiltInternalNotification) => {
    notifications.push({
      ...item,
      profile_id: item.audience_role ? null : input.profileId,
      team_member_id: item.team_member_id ?? input.teamMember?.id ?? null,
    });
  };

  if (input.preferences.agenda_reminders) {
    for (const event of visibleEvents) {
      if (["done", "cancelled"].includes(event.status)) {
        continue;
      }
      const startsAt = new Date(event.starts_at);
      const endsAt = event.ends_at ? new Date(event.ends_at) : startsAt;

      if (startsAt >= startToday && startsAt <= endToday) {
        push({
          profile_id: null,
          team_member_id: null,
          audience_role: null,
          title: "Evento hoje",
          body: `"${safeTitle(event.title)}" acontece hoje na agenda da equipe.`,
          notification_type: "agenda_event_today",
          priority: "high",
          source_type: "team_calendar_events",
          source_id: event.id,
          action_url: `/agenda/${event.id}`,
          due_at: event.starts_at,
        });
      }

      if (startsAt >= startTomorrow && startsAt <= endTomorrow) {
        push({
          profile_id: null,
          team_member_id: null,
          audience_role: null,
          title: "Evento amanhã",
          body: `"${safeTitle(event.title)}" está previsto para amanhã.`,
          notification_type: "agenda_event_tomorrow",
          priority: "normal",
          source_type: "team_calendar_events",
          source_id: event.id,
          action_url: `/agenda/${event.id}`,
          due_at: event.starts_at,
        });
      }

      if (endsAt < now) {
        push({
          profile_id: null,
          team_member_id: null,
          audience_role: null,
          title: "Evento atrasado",
          body: `"${safeTitle(event.title)}" passou do horário previsto e ainda não foi concluído.`,
          notification_type: "agenda_event_overdue",
          priority: "urgent",
          source_type: "team_calendar_events",
          source_id: event.id,
          action_url: `/agenda/${event.id}`,
          due_at: event.ends_at ?? event.starts_at,
        });
      }
    }
  }

  if (input.preferences.google_calendar_alerts) {
    for (const event of visibleEvents) {
      if (event.google_sync_status === "sync_error") {
        push({
          profile_id: null,
          team_member_id: null,
          audience_role: null,
          title: "Erro de sincronização com Google",
          body: `O evento "${safeTitle(event.title)}" está com sync_error no Google Calendar.`,
          notification_type: "google_sync_error",
          priority: "urgent",
          source_type: "team_calendar_events",
          source_id: event.id,
          action_url: `/agenda/${event.id}`,
          due_at: event.updated_at,
        });
      }

      const hasDrift =
        Boolean(event.google_synced_at) &&
        ["synced", "cancelled"].includes(event.google_sync_status ?? "") &&
        new Date(event.updated_at).getTime() > new Date(event.google_synced_at as string).getTime();

      if (hasDrift) {
        push({
          profile_id: null,
          team_member_id: null,
          audience_role: null,
          title: "Atualizar Google",
          body: `O evento "${safeTitle(event.title)}" teve alteração local pendente de sincronização.`,
          notification_type: "google_drift_pending",
          priority: "high",
          source_type: "team_calendar_events",
          source_id: event.id,
          action_url: `/agenda/${event.id}`,
          due_at: event.updated_at,
        });
      }
    }
  }

  if (input.preferences.weekly_report_alerts) {
    if (input.teamMember) {
      const ownWeekReport = input.weeklyReports.find(
        (report) => report.team_member_id === input.teamMember?.id && report.week_start === weekStart
      );

      if (!ownWeekReport) {
        push({
          profile_id: null,
          team_member_id: input.teamMember.id,
          audience_role: null,
          title: "Relatório semanal pendente",
          body: "Sua entrega semanal ainda não foi registrada nesta semana.",
          notification_type: "weekly_report_due",
          priority: "high",
          source_type: "weekly_team_reports",
          source_id: input.teamMember.id,
          action_url: "/memoria/novo",
          due_at: toIso(startTomorrow),
        });
      }

      // Buscar relatórios de semanas anteriores não entregues (atrasados)
      const pastWeeks = [];
      for (let i = 1; i <= 4; i++) {
        const d = new Date(now);
        d.setDate(d.getDate() - (7 * i));
        pastWeeks.push(getWeekStartIso(d));
      }

      for (const pWeek of pastWeeks) {
        const hasReport = input.weeklyReports.some(
          (report) => report.team_member_id === input.teamMember?.id && report.week_start === pWeek
        );
        if (!hasReport) {
          push({
            profile_id: null,
            team_member_id: input.teamMember.id,
            audience_role: null,
            title: "Relatório semanal atrasado",
            body: `A entrega da semana de ${pWeek} está pendente e atrasada.`,
            notification_type: "weekly_report_due",
            priority: "urgent",
            source_type: "weekly_team_reports",
            source_id: `${input.teamMember.id}_${pWeek}`,
            action_url: "/memoria/novo",
            due_at: pWeek,
          });
        }
      }

      const ownNeedsChanges = input.weeklyReports.filter(
        (report) => report.team_member_id === input.teamMember?.id && report.status === "needs_changes"
      );

      for (const report of ownNeedsChanges) {
        push({
          profile_id: null,
          team_member_id: input.teamMember.id,
          audience_role: null,
          title: "Relatório precisa ajustes",
          body: `O relatório "${safeTitle(report.title)}" foi devolvido para ajustes.`,
          notification_type: "weekly_report_needs_changes",
          priority: "high",
          source_type: "weekly_team_reports",
          source_id: report.id,
          action_url: `/memoria/${report.id}`,
          due_at: report.updated_at,
        });
      }
    }

    // Relatórios aguardando revisão são agora agrupados no final da função
    // se as preferências de memória estiverem ativas.
  }


  if (input.preferences.debrief_dossier_alerts) {
    const debriefByActionId = new Map(input.debriefs.map((item) => [item.action_id, item]));
    const closureByActionId = new Map(input.closures.map((item) => [item.action_id, item]));

    for (const action of input.actions) {
      if (action.status !== "realizada") {
        continue;
      }

      const debrief = debriefByActionId.get(action.id);
      if (!debrief || debrief.status !== "approved") {
        push({
          profile_id: null,
          team_member_id: null,
          audience_role: null,
          title: "Devolutiva pendente",
          body: `A ação "${safeTitle(action.title)}" ainda não teve devolutiva aprovada.`,
          notification_type: "debrief_pending",
          priority: "high",
          source_type: "actions",
          source_id: action.id,
          action_url: `/acoes/${action.id}/devolutiva`,
          due_at: toIso(startTomorrow),
        });
      }

      const closure = closureByActionId.get(action.id);
      if (!closure || closure.status !== "closed") {
        push({
          profile_id: null,
          team_member_id: null,
          audience_role: null,
          title: "Dossiê pendente",
          body: `A ação "${safeTitle(action.title)}" ainda não teve dossiê fechado.`,
          notification_type: "dossier_pending",
          priority: "high",
          source_type: "actions",
          source_id: action.id,
          action_url: `/acoes/${action.id}/dossie`,
          due_at: toIso(startTomorrow),
        });
      }
    }
  }

  if (input.preferences.listening_review_alerts) {
    const drafts = input.listeningRecords.filter((record) => record.review_status === "draft");
    const territorialPending = input.listeningRecords.filter((record) =>
      ["pending", "needs_attention"].includes(record.territorial_review_status)
    );

    for (const record of drafts.slice(0, 50)) {
      push({
        profile_id: null,
        team_member_id: null,
        audience_role: null,
        title: "Escuta em rascunho",
        body: "Uma escuta ainda está em rascunho e precisa de revisão.",
        notification_type: "listening_review_pending",
        priority: "normal",
        source_type: "listening_records",
        source_id: record.id,
        action_url: `/escutas/${record.id}`,
        due_at: record.updated_at,
      });
    }

    for (const record of territorialPending.slice(0, 50)) {
      push({
        profile_id: null,
        team_member_id: null,
        audience_role: null,
        title: "Revisão territorial pendente",
        body: "Uma escuta aguarda validação territorial antes do fechamento.",
        notification_type: "listening_review_pending",
        priority: "high",
        source_type: "listening_records",
        source_id: record.id,
        action_url: `/escutas/${record.id}`,
        due_at: record.updated_at,
      });
    }

    const sensitiveCandidates = input.listeningRecords.filter((record) => hasPotentialSensitiveData(record));
    for (const record of sensitiveCandidates.slice(0, 50)) {
      push({
        profile_id: null,
        team_member_id: null,
        audience_role: input.role === "equipe" ? null : input.role,
        title: "Escuta com possível dado sensível",
        body: "Uma escuta precisa revisão de privacidade antes de avançar no fluxo.",
        notification_type: "listening_review_pending",
        priority: "urgent",
        source_type: "listening_records",
        source_id: record.id,
        action_url: `/escutas/${record.id}`,
        due_at: record.updated_at,
      });
    }
  }

  if (input.preferences.transparency_alerts) {
    const pendingSnapshots = input.snapshots.filter((snapshot) =>
      ["draft", "reviewed"].includes(snapshot.status)
    );

    for (const snapshot of pendingSnapshots.slice(0, 30)) {
      push({
        profile_id: null,
        team_member_id: null,
        audience_role: input.role === "equipe" ? null : input.role,
        title: "Snapshot aguardando revisão",
        body: `"${safeTitle(snapshot.title)}" ainda precisa de revisão editorial.`,
        notification_type: "transparency_review_pending",
        priority: "normal",
        source_type: "public_transparency_snapshots",
        source_id: snapshot.id,
        action_url: `/transparencia/snapshots/${snapshot.id}`,
        due_at: snapshot.updated_at,
      });
    }

    if (input.role !== "equipe") {
      const packagesForSignature = input.homologationPackages.filter((item) => item.status === "ready_for_signature");
      for (const item of packagesForSignature.slice(0, 30)) {
        push({
          profile_id: null,
          team_member_id: null,
          audience_role: input.role,
          title: "Pacote aguardando assinatura",
          body: `O pacote ${safeTitle(item.package_code)} está pronto para assinatura institucional.`,
          notification_type: "transparency_review_pending",
          priority: "high",
          source_type: "public_transparency_homologation_packages",
          source_id: item.id,
          action_url: `/transparencia/homologacao/${item.id}`,
          due_at: item.updated_at,
        });
      }

      const criticalComments = input.snapshotComments.filter(
        (comment) => !comment.resolved && ["privacidade", "dados", "metodologia"].includes(comment.comment_type)
      );
      for (const comment of criticalComments.slice(0, 30)) {
        push({
          profile_id: null,
          team_member_id: null,
          audience_role: input.role,
          title: "Comentário crítico pendente",
          body: "Existe comentário crítico pendente na homologação de transparência.",
          notification_type: "transparency_review_pending",
          priority: "urgent",
          source_type: "public_transparency_snapshot_review_comments",
          source_id: comment.id,
          action_url: `/transparencia/homologacao`,
          due_at: comment.created_at,
        });
      }
    }
  }

  if (input.preferences.memory_alerts && input.role !== "equipe") {
    const reportsWaiting = input.weeklyReports.filter((item) => ["submitted", "in_review"].includes(item.status));
    if (reportsWaiting.length > 0) {
      push({
        profile_id: null,
        team_member_id: null,
        audience_role: input.role,
        title: "Relatórios aguardando revisão",
        body: `${reportsWaiting.length} relatório(s) semanal(is) enviados aguardam revisão da coordenação.`,
        notification_type: "memory_review_pending",
        priority: "normal",
        source_type: "weekly_team_reports",
        source_id: "batch_review",
        action_url: "/memoria",
        due_at: reportsWaiting[0]?.updated_at ?? null,
      });
    }
  }

  /**
   * REGRAS DE PRIORIDADE (Tijolo 064)
   * 
   * urgent:
   * - dado sensível pendente (escutas);
   * - sync_error em evento próximo;
   * - evento atrasado;
   * - comentário crítico de transparência (privacidade/dados/metodologia);
   * - relatório semanal atrasado.
   * 
   * high:
   * - dossiê pendente;
   * - devolutiva pendente;
   * - escutas em revisão territorial;
   * - pacote de homologação aguardando assinatura;
   * - relatório semanal pendente (semana atual);
   * - relatório semanal que precisa de ajustes;
   * - alteração local pendente de sincronização com Google (drift).
   * 
   * normal:
   * - evento amanhã;
   * - relatório semanal aguardando revisão (coordenação);
   * - snapshot aguardando revisão editorial;
   * - escuta em rascunho.
   * 
   * low:
   * - avisos informativos;
   * - eventos futuros sem pendência.
   */

  return notifications;
}

function getVisibleEventIds(input: BuildInternalNotificationsInput) {
  if (input.role !== "equipe") {
    return new Set(input.events.map((event) => event.id));
  }

  if (!input.teamMember) {
    return new Set(input.events.map((event) => event.id));
  }

  const memberEventIds = new Set(
    input.eventMembers
      .filter((item) => item.team_member_id === input.teamMember?.id)
      .map((item) => item.event_id)
  );

  return new Set(
    input.events
      .filter((event) => memberEventIds.has(event.id) || event.created_by === input.profileId)
      .map((event) => event.id)
  );
}

function hasPotentialSensitiveData(record: ListeningRecord) {
  const fields = [record.free_speech_text, record.team_summary, record.unexpected_notes, record.places_mentioned_text]
    .filter(Boolean)
    .join("\n");

  if (!fields) return false;
  return (
    cpfLikeRegex.test(fields) ||
    phoneLikeRegex.test(fields) ||
    emailLikeRegex.test(fields) ||
    addressLikeRegex.test(fields)
  );
}

function getStartOfDay(date: Date) {
  const next = new Date(date);
  next.setHours(0, 0, 0, 0);
  return next;
}

function getEndOfDay(date: Date) {
  const next = new Date(date);
  next.setHours(23, 59, 59, 999);
  return next;
}

function getWeekStartIso(reference = new Date()) {
  const date = new Date(reference);
  const weekday = date.getDay();
  const diff = weekday === 0 ? -6 : 1 - weekday;
  date.setDate(date.getDate() + diff);
  date.setHours(0, 0, 0, 0);
  return date.toISOString().slice(0, 10);
}

function safeTitle(value: string) {
  const normalized = value.replace(/\s+/g, " ").trim();
  return normalized.length > 90 ? `${normalized.slice(0, 87)}...` : normalized;
}

function toIso(value: Date) {
  return value.toISOString();
}
