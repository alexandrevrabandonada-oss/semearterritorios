import type { PublicQuoteStatus } from "@/lib/database.types";

export const publicQuoteStatusOptions: Array<{ value: PublicQuoteStatus; label: string }> = [
  { value: "draft", label: "Rascunho" },
  { value: "needs_review", label: "Aguardando revisao" },
  { value: "approved_internal", label: "Aprovada interna" },
  { value: "approved_public", label: "Aprovada publica" },
  { value: "rejected", label: "Rejeitada" },
  { value: "archived", label: "Arquivada" }
];

export function getPublicQuoteStatusLabel(status: PublicQuoteStatus) {
  const found = publicQuoteStatusOptions.find((item) => item.value === status);
  return found?.label ?? status;
}

export function isPublicQuoteEditableByEquipe(status: PublicQuoteStatus) {
  return status === "draft" || status === "needs_review" || status === "rejected";
}

export const publicQuoteAuditEventLabels: Record<string, string> = {
  created: "Criada",
  text_changed: "Texto original alterado",
  sanitized_text_changed: "Versão pública alterada",
  sent_to_review: "Enviada para revisão",
  approved_internal: "Aprovada internamente",
  approved_public: "Aprovada para publicação",
  rejected: "Rejeitada",
  archived: "Arquivada",
  restored: "Restaurada",
  risk_detected: "Risco de privacidade detectado",
  status_changed: "Status alterado"
};

export function getPublicQuoteAuditEventLabel(eventType: string): string {
  return publicQuoteAuditEventLabels[eventType] ?? eventType;
}
