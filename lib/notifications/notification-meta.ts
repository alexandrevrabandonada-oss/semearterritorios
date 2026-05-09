import type { InternalNotificationType } from "@/lib/notifications/build-internal-notifications";

export type NotificationCategory =
  | "agenda"
  | "google"
  | "relatorios"
  | "escutas"
  | "debrief_dossie"
  | "transparencia"
  | "memoria"
  | "sistema";

export const notificationCategoryLabel: Record<NotificationCategory, string> = {
  agenda: "Agenda",
  google: "Google Calendar",
  relatorios: "Relatórios semanais",
  escutas: "Escutas",
  debrief_dossie: "Devolutivas e dossiês",
  transparencia: "Transparência",
  memoria: "Memória",
  sistema: "Sistema",
};

export function getNotificationCategory(type: InternalNotificationType): NotificationCategory {
  if (["agenda_event_today", "agenda_event_tomorrow", "agenda_event_overdue"].includes(type)) return "agenda";
  if (["google_sync_error", "google_drift_pending"].includes(type)) return "google";
  if (["weekly_report_due", "weekly_report_needs_changes"].includes(type)) return "relatorios";
  if (["debrief_pending", "dossier_pending"].includes(type)) return "debrief_dossie";
  if (type === "listening_review_pending") return "escutas";
  if (type === "transparency_review_pending") return "transparencia";
  if (type === "memory_review_pending") return "memoria";
  return "sistema";
}

export function getPriorityLabel(priority: string) {
  if (priority === "urgent") return "Urgente";
  if (priority === "high") return "Alta";
  if (priority === "low") return "Baixa";
  return "Normal";
}
