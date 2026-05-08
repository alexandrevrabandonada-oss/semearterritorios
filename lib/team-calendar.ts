import type {
  Action,
  ActionClosure,
  ActionDebrief,
  GoogleCalendarSyncStatus,
  ProjectMemoryEntry,
  TeamCalendarAttendanceStatus,
  TeamCalendarEvent,
  TeamCalendarEventStatus,
  TeamCalendarEventType,
  TeamMember,
  WeeklyTeamReport,
} from "@/lib/database.types";

export const teamCalendarEventTypeOptions: Array<{ value: TeamCalendarEventType; label: string }> = [
  { value: "acao_campo", label: "Ação de campo" },
  { value: "banca_escuta", label: "Banca de escuta" },
  { value: "reuniao", label: "Reunião" },
  { value: "relatorio_semanal", label: "Relatório semanal" },
  { value: "devolutiva", label: "Devolutiva" },
  { value: "dossie", label: "Dossiê" },
  { value: "memoria", label: "Memória" },
  { value: "prazo", label: "Prazo" },
  { value: "outro", label: "Outro" },
];

export const teamCalendarEventStatusOptions: Array<{ value: TeamCalendarEventStatus; label: string }> = [
  { value: "planned", label: "Planejado" },
  { value: "confirmed", label: "Confirmado" },
  { value: "done", label: "Concluído" },
  { value: "cancelled", label: "Cancelado" },
  { value: "postponed", label: "Adiado" },
];

export const teamCalendarAttendanceOptions: Array<{ value: TeamCalendarAttendanceStatus; label: string }> = [
  { value: "invited", label: "Convidado" },
  { value: "confirmed", label: "Confirmou" },
  { value: "declined", label: "Não vai" },
  { value: "attended", label: "Participou" },
  { value: "absent", label: "Faltou" },
  { value: "unknown", label: "Sem resposta" },
];

export const googleCalendarSyncStatusOptions: Array<{ value: GoogleCalendarSyncStatus; label: string }> = [
  { value: "not_synced", label: "Não sincronizado" },
  { value: "synced", label: "Sincronizado" },
  { value: "sync_error", label: "Erro de sincronização" },
  { value: "cancelled", label: "Cancelado no Google" },
  { value: "unlinked", label: "Desvinculado" },
];

export const teamCalendarViewOptions = [
  { value: "proximos", label: "Próximos" },
  { value: "semana", label: "Esta semana" },
  { value: "mes", label: "Mês" },
  { value: "lista", label: "Lista" },
] as const;

export type TeamCalendarView = (typeof teamCalendarViewOptions)[number]["value"];

export function getTeamCalendarEventTypeLabel(value: TeamCalendarEventType) {
  return teamCalendarEventTypeOptions.find((option) => option.value === value)?.label ?? value;
}

export function getTeamCalendarEventStatusLabel(value: TeamCalendarEventStatus) {
  return teamCalendarEventStatusOptions.find((option) => option.value === value)?.label ?? value;
}

export function getTeamCalendarAttendanceLabel(value: TeamCalendarAttendanceStatus) {
  return teamCalendarAttendanceOptions.find((option) => option.value === value)?.label ?? value;
}

export function getGoogleCalendarSyncStatusLabel(value: GoogleCalendarSyncStatus | null) {
  if (!value) return "Não sincronizado";
  return googleCalendarSyncStatusOptions.find((option) => option.value === value)?.label ?? value;
}

export function getTeamCalendarEventStatusTone(value: TeamCalendarEventStatus) {
  switch (value) {
    case "confirmed":
    case "done":
      return "green";
    case "cancelled":
      return "red";
    case "postponed":
      return "yellow";
    default:
      return "stone";
  }
}

export function getTeamCalendarAttendanceTone(value: TeamCalendarAttendanceStatus) {
  switch (value) {
    case "confirmed":
    case "attended":
      return "green";
    case "declined":
    case "absent":
      return "red";
    case "unknown":
      return "yellow";
    default:
      return "stone";
  }
}

export function getGoogleCalendarSyncStatusTone(value: GoogleCalendarSyncStatus | null) {
  switch (value) {
    case "synced":
      return "green";
    case "sync_error":
      return "red";
    case "cancelled":
    case "unlinked":
      return "yellow";
    default:
      return "stone";
  }
}

export function getEventDateLabel(event: Pick<TeamCalendarEvent, "starts_at" | "ends_at" | "all_day">) {
  const startsAt = new Date(event.starts_at);
  const endsAt = event.ends_at ? new Date(event.ends_at) : null;
  const dateLabel = startsAt.toLocaleDateString("pt-BR", { weekday: "short", day: "2-digit", month: "2-digit" });

  if (event.all_day) {
    return `${capitalize(dateLabel)} · Dia inteiro`;
  }

  const startTime = startsAt.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
  if (!endsAt) {
    return `${capitalize(dateLabel)} · ${startTime}`;
  }

  const endTime = endsAt.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
  const sameDay = startsAt.toDateString() === endsAt.toDateString();
  if (sameDay) {
    return `${capitalize(dateLabel)} · ${startTime}–${endTime}`;
  }

  return `${capitalize(dateLabel)} · ${startTime} até ${endsAt.toLocaleDateString("pt-BR")} ${endTime}`;
}

export function getActionScheduleLabel(action: Pick<Action, "action_date" | "starts_at" | "ends_at" | "all_day">) {
  if (action.starts_at) {
    return getEventDateLabel({
      starts_at: action.starts_at,
      ends_at: action.ends_at,
      all_day: action.all_day,
    });
  }

  const dateLabel = new Date(`${action.action_date}T00:00:00`).toLocaleDateString("pt-BR", {
    weekday: "short",
    day: "2-digit",
    month: "2-digit",
  });

  if (action.all_day) {
    return `${capitalize(dateLabel)} · Dia inteiro`;
  }

  return `${capitalize(dateLabel)} · Horário pendente`;
}

export function formatDateTimeLocalInput(value: string | null) {
  if (!value) return "";
  const date = new Date(value);
  const timezoneOffset = date.getTimezoneOffset();
  const localDate = new Date(date.getTime() - timezoneOffset * 60_000);
  return localDate.toISOString().slice(0, 16);
}

export function parseDateTimeLocalInput(value: string, fallbackAllDay = false) {
  if (!value) return null;
  if (fallbackAllDay && value.length === 10) return `${value}T00:00:00`;
  return new Date(value).toISOString();
}

export function getSuggestedActionEventStart(action: Pick<Action, "action_date" | "starts_at" | "all_day">) {
  if (action.starts_at) return formatDateTimeLocalInput(action.starts_at);
  if (action.all_day) return `${action.action_date}T00:00`;
  return `${action.action_date}T09:00`;
}

export function getSuggestedActionEventEnd(action: Pick<Action, "ends_at" | "action_date" | "all_day">) {
  if (action.ends_at) return formatDateTimeLocalInput(action.ends_at);
  if (action.all_day) return `${action.action_date}T23:59`;
  return "";
}

export function getStartOfDayIso(input: Date | string) {
  const date = new Date(typeof input === "string" ? input : input.toISOString());
  date.setHours(0, 0, 0, 0);
  return date.toISOString();
}

export function getEndOfDayIso(input: Date | string) {
  const date = new Date(typeof input === "string" ? input : input.toISOString());
  date.setHours(23, 59, 59, 999);
  return date.toISOString();
}

export function getWeekRange(reference = new Date()) {
  const current = new Date(reference);
  const weekday = current.getDay();
  const diff = weekday === 0 ? -6 : 1 - weekday;
  const start = new Date(current);
  start.setDate(current.getDate() + diff);
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  end.setHours(23, 59, 59, 999);
  return { start, end };
}

export function getMonthRange(reference = new Date()) {
  const start = new Date(reference.getFullYear(), reference.getMonth(), 1, 0, 0, 0, 0);
  const end = new Date(reference.getFullYear(), reference.getMonth() + 1, 0, 23, 59, 59, 999);
  return { start, end };
}

export function isSameDay(left: string | Date, right: string | Date) {
  const leftDate = new Date(left);
  const rightDate = new Date(right);
  return (
    leftDate.getFullYear() === rightDate.getFullYear() &&
    leftDate.getMonth() === rightDate.getMonth() &&
    leftDate.getDate() === rightDate.getDate()
  );
}

export function getEventAutoType(action: Pick<Action, "action_type"> | null | undefined): TeamCalendarEventType {
  if (!action) return "acao_campo";
  if (action.action_type === "banca_escuta") return "banca_escuta";
  if (action.action_type === "devolutiva") return "devolutiva";
  if (action.action_type === "reuniao_institucional") return "reuniao";
  return "acao_campo";
}

export function buildWeeklyReportReminderItems(reports: WeeklyTeamReport[], members: TeamMember[], referenceWeekStart: string) {
  const sent = new Set(reports.filter((report) => report.week_start === referenceWeekStart).map((report) => report.team_member_id));
  return members
    .filter((member) => member.active && !sent.has(member.id))
    .map((member) => member.display_name)
    .sort((left, right) => left.localeCompare(right, "pt-BR"));
}

export function buildDebriefReminderItems(actions: Action[], debriefs: ActionDebrief[]) {
  const approvedByAction = new Map(debriefs.map((debrief) => [debrief.action_id, debrief]));
  return actions
    .filter((action) => {
      const debrief = approvedByAction.get(action.id);
      return !debrief || debrief.status !== "approved";
    })
    .slice(0, 6);
}

export function buildClosureReminderItems(actions: Action[], closures: ActionClosure[]) {
  const closureByAction = new Map(closures.map((closure) => [closure.action_id, closure]));
  return actions
    .filter((action) => closureByAction.get(action.id)?.status !== "closed")
    .slice(0, 6);
}

export function buildEventsWithoutAgendaForActions(
  actions: Action[],
  events: TeamCalendarEvent[],
  options: { eventType?: TeamCalendarEventType; requireStatus?: string[] } = {}
) {
  const eventActionIds = new Set(
    events
      .filter((event) => !options.eventType || event.event_type === options.eventType)
      .map((event) => event.action_id)
      .filter(Boolean)
  );

  return actions.filter((action) => {
    if (options.requireStatus && !options.requireStatus.includes(action.status)) return false;
    return !eventActionIds.has(action.id);
  });
}

export function buildOverdueEvents(events: TeamCalendarEvent[], reference = new Date()) {
  return events.filter((event) => {
    if (["done", "cancelled"].includes(event.status)) return false;
    const endReference = event.ends_at ? new Date(event.ends_at) : new Date(event.starts_at);
    return endReference < reference;
  });
}

export function buildUpcomingEvents(events: TeamCalendarEvent[], daysAhead: number, reference = new Date()) {
  const limit = new Date(reference);
  limit.setDate(limit.getDate() + daysAhead);
  return events.filter((event) => {
    const startsAt = new Date(event.starts_at);
    return startsAt >= reference && startsAt <= limit;
  });
}

export function buildRecentDoneEvents(events: TeamCalendarEvent[], daysBack = 7, reference = new Date()) {
  const start = new Date(reference);
  start.setDate(start.getDate() - daysBack);
  return events.filter((event) => {
    if (event.status !== "done") return false;
    const startsAt = new Date(event.starts_at);
    return startsAt >= start && startsAt <= reference;
  });
}

export function formatWeekTitle(weekStart: string) {
  const start = new Date(`${weekStart}T00:00:00`);
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  return `${start.toLocaleDateString("pt-BR")} a ${end.toLocaleDateString("pt-BR")}`;
}

export function getRelatedMemoryEntriesForEvent(entries: ProjectMemoryEntry[], eventId: string) {
  return entries.filter((entry) => entry.team_calendar_event_id === eventId);
}

export function capitalize(value: string) {
  if (!value) return value;
  return value.charAt(0).toUpperCase() + value.slice(1);
}
