import { getActionPilotMetrics, type ActionForPilot } from "@/lib/action-pilot";
import { getActionTypeLabel } from "@/lib/actions";
import { getClosureStatusLabel } from "@/lib/action-closures";
import { getTerritorialQualityMetrics, type TerritorialReviewRecord } from "@/lib/territorial-review";
import type { ActionClosure, ActionDebrief } from "@/lib/database.types";

export type PostActionDecision = {
  recommendation: string;
  justification: string;
  nextStep: string;
  severity: "ok" | "warning" | "blocker";
};

export function getPostActionDecision(input: {
  records: TerritorialReviewRecord[];
  territoryCount: number;
  debrief: ActionDebrief | null;
  closure: ActionClosure | null;
}): PostActionDecision {
  const metrics = getActionPilotMetrics(input.records);
  const territorialMetrics = getTerritorialQualityMetrics(input.records);

  if (metrics.possibleSensitive > 0) {
    return {
      recommendation: "Bloquear qualquer devolutiva/mapa até revisar dados sensíveis.",
      justification: "Há registros com possível dado sensível. Nenhum material de circulação ou visualização territorial deve avançar antes da revisão.",
      nextStep: "Revisar escutas sinalizadas, remover/generalizar dados pessoais e só depois retomar devolutiva, dossiê ou mapa.",
      severity: "blocker"
    };
  }

  if (territorialMetrics.sensitivePlaces > 0) {
    return {
      recommendation: "Bloquear qualquer devolutiva/mapa até revisar lugares sensíveis.",
      justification: "Há lugares marcados como sensível/não publicar. Eles não devem entrar em devolutiva pública, relatório público ou mapa.",
      nextStep: "Revisar lugares estruturados, manter sensíveis ocultos e concluir revisão territorial.",
      severity: "blocker"
    };
  }

  if (input.debrief?.status !== "approved" || input.closure?.status !== "closed") {
    return {
      recommendation: "Fechar ciclo da ação antes de avançar.",
      justification: "A devolutiva aprovada e o dossiê fechado são a base institucional mínima para usar a ação como referência consolidada.",
      nextStep: "Aprovar devolutiva, fechar dossiê e conferir relatório mensal.",
      severity: "warning"
    };
  }

  if (metrics.reviewed < 20) {
    return {
      recommendation: "Priorizar revisão/digitação antes de mapa.",
      justification: `Há ${metrics.reviewed} escuta(s) revisada(s). O critério mínimo sugerido para mapa é 20 escutas revisadas.`,
      nextStep: "Completar digitação, revisar rascunhos e consolidar relatório pós-banca.",
      severity: "warning"
    };
  }

  if (territorialMetrics.unstructuredPlaces > 0 || territorialMetrics.pendingTerritorialReview > 0 || territorialMetrics.needsAttention > 0) {
    return {
      recommendation: "Padronizar lugares antes do mapa.",
      justification: "Há lugares em texto livre, revisão territorial pendente ou registros que precisam de atenção.",
      nextStep: "Usar a fila de revisão territorial para estruturar lugares e marcar itens sensíveis antes de definir mapa.",
      severity: "warning"
    };
  }

  if (territorialMetrics.normalizedPlaces < territorialMetrics.structuredPlaceMentions) {
    return {
      recommendation: "Normalizar lugares antes do mapa.",
      justification: `Há ${Math.max(territorialMetrics.structuredPlaceMentions - territorialMetrics.normalizedPlaces, 0)} lugar(es) estruturado(s) sem nome normalizado. O mapa interno deve usar nomes padronizados, não texto livre.`,
      nextStep: "Abrir /territorios/lugares, vincular variações a nomes normalizados e revisar visibilidade antes de desenhar o mapa interno.",
      severity: "warning"
    };
  }

  if (input.territoryCount < 3) {
    return {
      recommendation: "Ainda não há base territorial suficiente para mapa. Priorizar novas ações em outros territórios.",
      justification: `Há ${input.territoryCount} território(s) com dados. O critério mínimo sugerido para mapa territorial é 3 ou mais territórios.`,
      nextStep: "Planejar novas ações em outros territórios ou manter painel por ação até ampliar a base.",
      severity: "warning"
    };
  }

  return {
    recommendation: "Pode avançar para escopo de mapa interno autenticado.",
    justification: "A ação possui volume revisado e base territorial suficientes, sem alerta sensível pendente e com ciclo institucional fechado.",
    nextStep: "Definir escopo de mapa interno autenticado, agregado por bairro/território, sem falas originais nem dados pessoais.",
    severity: "ok"
  };
}

export function buildPostActionDecisionText(input: {
  action: ActionForPilot;
  records: TerritorialReviewRecord[];
  territoryCount: number;
  debrief: ActionDebrief | null;
  closure: ActionClosure | null;
}) {
  const metrics = getActionPilotMetrics(input.records);
  const territorialMetrics = getTerritorialQualityMetrics(input.records);
  const decision = getPostActionDecision(input);
  const reviewedPercent = metrics.total > 0 ? Math.round((metrics.reviewed / metrics.total) * 100) : 0;

  return `# Decisão pós-banca — ${input.action.title}

## Dados da operação

- Data: ${new Date(`${input.action.action_date}T00:00:00`).toLocaleDateString("pt-BR")}
- Bairro/território da ação: ${input.action.neighborhoods?.name ?? "Não informado"}
- Tipo: ${getActionTypeLabel(input.action.action_type)}
- Total de escutas: ${metrics.total}
- Escutas revisadas: ${metrics.reviewed} (${reviewedPercent}%)
- Escutas em rascunho: ${metrics.draft}
- Bairros/territórios envolvidos: ${input.territoryCount}
- Alertas de dado sensível: ${metrics.possibleSensitive}
- Revisão territorial pendente: ${territorialMetrics.pendingTerritorialReview}
- Lugares estruturados: ${territorialMetrics.withStructuredPlaces}
- Lugares normalizados: ${territorialMetrics.normalizedPlaces}
- Lugares sensíveis/não publicáveis: ${territorialMetrics.sensitivePlaces}
- Devolutiva: ${input.debrief?.status ?? "não criada"}
- Dossiê: ${getClosureStatusLabel(input.closure?.status)}

## Leitura dos dados

- Temas mais citados: ${metrics.topThemes.map((item) => `${item.label} (${item.count})`).join(", ") || "Nenhum registro"}
- Palavras recorrentes: ${metrics.topWords.map((item) => `${item.label} (${item.count})`).join(", ") || "Nenhum registro"}
- Lugares mencionados: ${metrics.places.map((item) => `${item.label} (${item.count})`).join(", ") || "Nenhum registro"}
- Prioridades apontadas: ${metrics.priorities.map((item) => `${item.label} (${item.count})`).join(", ") || "Nenhum registro"}

## Pendências

- Pendências de qualidade: ${metrics.pending}
- Devolutiva aprovada: ${input.debrief?.status === "approved" ? "sim" : "não"}
- Dossiê fechado: ${input.closure?.status === "closed" ? "sim" : "não"}

## Decisão recomendada

${decision.recommendation}

Justificativa: ${decision.justification}

## Próximo passo

${decision.nextStep}
`;
}
