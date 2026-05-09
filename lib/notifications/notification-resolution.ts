import type { InAppNotification } from "@/lib/database.types";

export type ResolutionSuggestion = {
  is_resolved: boolean;
  reason: string | null;
};

/**
 * Define quais tipos de avisos devem passar pela "limpeza inteligente" 
 * em vez de arquivamento automático silencioso.
 */
export const SMART_CLEANUP_TYPES = [
  "debrief_pending",
  "dossier_pending",
  "google_sync_error",
  "google_drift_pending",
  "weekly_report_due",
  "weekly_report_needs_changes",
  "listening_review_pending",
  "transparency_review_pending",
  "memory_review_pending",
];

/**
 * Constrói a sugestão de resolução baseada no tipo de aviso.
 * Esta função é chamada quando um aviso não é mais gerado pelo motor determinístico,
 * indicando que a condição de origem mudou.
 */
export function buildResolutionSuggestion(notification: InAppNotification): ResolutionSuggestion {
  if (!SMART_CLEANUP_TYPES.includes(notification.notification_type)) {
    return { is_resolved: false, reason: null };
  }

  const reasons: Record<string, string> = {
    debrief_pending: "A devolutiva parece ter sido aprovada ou a ação não está mais como realizada.",
    dossier_pending: "O dossiê desta ação parece ter sido fechado.",
    google_sync_error: "O erro de sincronização com o Google Calendar foi resolvido.",
    google_drift_pending: "O evento foi sincronizado com sucesso no Google.",
    weekly_report_due: "O relatório semanal foi enviado ou a pendência não é mais válida.",
    weekly_report_needs_changes: "O relatório foi corrigido e reenviado.",
    listening_review_pending: "A escuta foi revisada ou não está mais em rascunho.",
    transparency_review_pending: "O snapshot ou pacote de transparência avançou no fluxo.",
    memory_review_pending: "A entrada de memória foi revisada ou aprovada.",
  };

  return {
    is_resolved: true,
    reason: reasons[notification.notification_type] ?? "A condição de origem foi resolvida.",
  };
}
