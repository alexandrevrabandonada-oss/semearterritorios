import type { TeamCalendarEventType, TeamCalendarEventStatus } from "@/lib/database.types";
import { getTeamCalendarEventStatusLabel, getTeamCalendarEventTypeLabel } from "@/lib/team-calendar";

type SanitizedParticipant = {
  display_name: string;
  email: string | null;
};

const operationalEmailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/i;

export type SanitizedGoogleCalendarInput = {
  id: string;
  title: string;
  event_type: TeamCalendarEventType;
  status: TeamCalendarEventStatus;
  starts_at: string;
  ends_at: string | null;
  all_day: boolean;
  neighborhood_name?: string | null;
  participants: SanitizedParticipant[];
  internalEventUrl: string;
};

export type SanitizedGoogleCalendarPayload = {
  summary: string;
  description: string;
  location?: string;
  start: { date?: string; dateTime?: string; timeZone?: string };
  end: { date?: string; dateTime?: string; timeZone?: string };
  attendees: Array<{ email: string; displayName?: string }>;
  status: "confirmed" | "cancelled";
};

export type SanitizedGoogleCalendarSummary = {
  summary: string;
  location: string | null;
  attendees_count: number;
  members_without_email: string[];
  all_day: boolean;
  starts_at: string;
  ends_at: string | null;
  neighborhood_name: string | null;
  event_type: TeamCalendarEventType;
  event_status: TeamCalendarEventStatus;
};

function addOneDay(dateText: string) {
  const date = new Date(`${dateText}T00:00:00`);
  date.setDate(date.getDate() + 1);
  return date.toISOString().slice(0, 10);
}

function uniqueAttendees(participants: SanitizedParticipant[]) {
  const seen = new Set<string>();

  return participants
    .filter((participant) => participant.email && operationalEmailPattern.test(participant.email.trim()))
    .map((participant) => ({
      email: participant.email!.trim().toLowerCase(),
      displayName: participant.display_name.trim() || undefined,
    }))
    .filter((participant) => {
      if (seen.has(participant.email)) return false;
      seen.add(participant.email);
      return true;
    });
}

export function sanitizeCalendarEvent(input: SanitizedGoogleCalendarInput): {
  payload: SanitizedGoogleCalendarPayload;
  payloadSummary: SanitizedGoogleCalendarSummary;
} {
  const summary = `[SEMEAR] ${input.title}`;
  const attendees = uniqueAttendees(input.participants);
  const membersWithoutEmail = input.participants
    .filter((participant) => !participant.email?.trim() || !operationalEmailPattern.test(participant.email.trim()))
    .map((participant) => participant.display_name);
  const participantNames = input.participants.map((participant) => participant.display_name).filter(Boolean).slice(0, 8);

  const descriptionLines = [
    `Tipo: ${getTeamCalendarEventTypeLabel(input.event_type)}`,
    input.neighborhood_name ? `Território: ${input.neighborhood_name}` : null,
    `Status no SEMEAR: ${getTeamCalendarEventStatusLabel(input.status)}`,
    participantNames.length > 0 ? `Equipe participante: ${participantNames.join(", ")}` : null,
    `Evento interno: ${input.internalEventUrl}`,
    "Este evento contém apenas resumo operacional. Escutas, relatórios internos e dados sensíveis permanecem no SEMEAR.",
  ].filter(Boolean);

  const start = input.all_day
    ? { date: input.starts_at.slice(0, 10) }
    : { dateTime: input.starts_at, timeZone: "America/Sao_Paulo" };

  const endDateTime = input.ends_at ?? new Date(new Date(input.starts_at).getTime() + 60 * 60 * 1000).toISOString();
  const end = input.all_day
    ? { date: addOneDay((input.ends_at ?? input.starts_at).slice(0, 10)) }
    : { dateTime: endDateTime, timeZone: "America/Sao_Paulo" };

  return {
    payload: {
      summary,
      description: descriptionLines.join("\n"),
      location: input.neighborhood_name?.trim() || undefined,
      start,
      end,
      attendees,
      status: input.status === "cancelled" ? "cancelled" : "confirmed",
    },
    payloadSummary: {
      summary,
      location: input.neighborhood_name?.trim() || null,
      attendees_count: attendees.length,
      members_without_email: membersWithoutEmail,
      all_day: input.all_day,
      starts_at: input.starts_at,
      ends_at: input.ends_at,
      neighborhood_name: input.neighborhood_name?.trim() || null,
      event_type: input.event_type,
      event_status: input.status,
    },
  };
}
