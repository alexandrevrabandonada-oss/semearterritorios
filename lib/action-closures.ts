import { getActionPilotMetrics, getActionReadiness, type ActionForPilot, type ListeningRecordForPilot } from "@/lib/action-pilot";
import { getActionTypeLabel } from "@/lib/actions";
import type { ActionClosure, ActionDebrief, ClosureStatus } from "@/lib/database.types";

export const closureStatusLabels: Record<ClosureStatus, string> = {
  open: "Aberto",
  in_review: "Em revisão",
  closed: "Fechado",
  reopened: "Reaberto"
};

export type ClosureChecklist = {
  evidenceOrganized: boolean;
  monthlyReportPrepared: boolean;
};

export const defaultClosureChecklist: ClosureChecklist = {
  evidenceOrganized: false,
  monthlyReportPrepared: false
};

export function parseClosureChecklist(value: unknown): ClosureChecklist {
  if (!value || typeof value !== "object" || Array.isArray(value)) return defaultClosureChecklist;
  const source = value as Partial<ClosureChecklist>;
  return {
    evidenceOrganized: Boolean(source.evidenceOrganized),
    monthlyReportPrepared: Boolean(source.monthlyReportPrepared)
  };
}

export function getClosureStatusLabel(status?: ClosureStatus | null) {
  return status ? closureStatusLabels[status] : "Aberto";
}

export function getClosureCanClose(input: {
  records: ListeningRecordForPilot[];
  debrief: ActionDebrief | null;
  closure: Pick<ActionClosure, "coordination_sufficiency" | "sufficiency_reason"> | null;
}) {
  const metrics = getActionPilotMetrics(input.records);
  const hasSufficiency = Boolean(input.closure?.coordination_sufficiency && input.closure.sufficiency_reason?.trim());

  if (metrics.possibleSensitive > 0) {
    return { ok: false, reason: "Há possível dado sensível pendente. Revise antes de fechar." };
  }

  if (metrics.draft > 0 && !hasSufficiency) {
    return { ok: false, reason: "Há escutas em rascunho. Feche apenas após revisar ou registrar suficiência pela coordenação." };
  }

  if (input.debrief?.status !== "approved") {
    return { ok: true, reason: "A devolutiva ainda não está aprovada. O fechamento é possível, mas revise o alerta institucional." };
  }

  return { ok: true, reason: "Critérios críticos atendidos para fechamento." };
}

export function buildClosureMarkdown(input: {
  action: ActionForPilot;
  records: ListeningRecordForPilot[];
  debrief: ActionDebrief | null;
  closure: ActionClosure | null;
}) {
  const metrics = getActionPilotMetrics(input.records);
  const checklist = parseClosureChecklist(input.closure?.documentation_checklist);
  const reviewedPercent = metrics.total > 0 ? Math.round((metrics.reviewed / metrics.total) * 100) : 0;

  return `# Dossiê da ação

## Dados da ação

- Título: ${input.action.title}
- Data: ${new Date(`${input.action.action_date}T00:00:00`).toLocaleDateString("pt-BR")}
- Bairro: ${input.action.neighborhoods?.name ?? "Não informado"}
- Tipo: ${getActionTypeLabel(input.action.action_type)}
- Status do dossiê: ${getClosureStatusLabel(input.closure?.status)}

## Resumo operacional

- Escutas digitadas: ${metrics.total}
- Escutas revisadas: ${metrics.reviewed}
- Escutas em rascunho: ${metrics.draft}
- Percentual revisado: ${reviewedPercent}%
- Possíveis dados sensíveis: ${metrics.possibleSensitive}
- Pendências de qualidade: ${metrics.pending}
- Prontidão: ${getActionReadiness(input.records, Boolean(input.closure?.coordination_sufficiency))}

## Checklist documental

- Evidências organizadas: ${checklist.evidenceOrganized ? "sim" : "não"}
- Relatório mensal preparado: ${checklist.monthlyReportPrepared ? "sim" : "não"}
- Devolutiva aprovada: ${input.debrief?.status === "approved" ? "sim" : "não"}

## Síntese determinística

Temas mais citados: ${metrics.topThemes.map((item) => `${item.label} (${item.count})`).join(", ") || "Nenhum registro"}

Palavras recorrentes: ${metrics.topWords.map((item) => `${item.label} (${item.count})`).join(", ") || "Nenhum registro"}

Lugares mencionados: ${metrics.places.map((item) => `${item.label} (${item.count})`).join(", ") || "Nenhum registro"}

Prioridades apontadas: ${metrics.priorities.map((item) => `${item.label} (${item.count})`).join(", ") || "Nenhum registro"}

Observações inesperadas:
${metrics.unexpected.length > 0 ? metrics.unexpected.map((item) => `- ${item}`).join("\n") : "- Nenhuma observação inesperada registrada."}

## Decisão da coordenação

- Considera suficiente: ${input.closure?.coordination_sufficiency ? "sim" : "não"}
- Justificativa: ${input.closure?.sufficiency_reason ?? "Não registrada"}
- Fechado em: ${input.closure?.closed_at ? new Date(input.closure.closed_at).toLocaleString("pt-BR") : "Não fechado"}
- Reaberto em: ${input.closure?.reopened_at ? new Date(input.closure.reopened_at).toLocaleString("pt-BR") : "Não reaberto"}

## Notas internas

Evidências: ${input.closure?.evidence_notes ?? "Não registrado"}

Observações internas: ${input.closure?.internal_notes ?? "Não registrado"}

Projeto SEMEAR — UFF + APS
`;
}
