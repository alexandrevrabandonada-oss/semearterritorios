import { getActionTypeLabel } from "@/lib/actions";
import {
  getActionPilotMetrics,
  getActionReadiness,
  hasPossibleSensitiveData,
  type ActionForPilot,
  type ListeningRecordForPilot
} from "@/lib/action-pilot";

export const defaultMethodologyNote =
  "Esta devolutiva reúne percepções registradas durante a ação. Ela não substitui pesquisa estatística nem representa a totalidade da população. Seu objetivo é devolver ao território uma síntese inicial da escuta realizada.";

export const defaultPrivacyNote =
  "Nenhuma informação pessoal identificável deve ser publicada. Falas individuais só devem ser usadas de forma anônima, revisada e não identificável.";

export type GeneratedActionDebrief = {
  title: string;
  publicSummary: string;
  methodologyNote: string;
  keyFindings: string;
  nextSteps: string;
  generatedMarkdown: string;
  teamReviewText: string;
  totalsSnapshot: Record<string, unknown>;
  warnings: string[];
};

function formatInline(items: Array<{ label: string; count: number }>, emptyText = "não registrado") {
  return items.length > 0 ? items.map((item) => `${item.label} (${item.count})`).join(", ") : emptyText;
}

function formatBullets(items: string[], emptyText = "- Não registrado.") {
  return items.length > 0 ? items.map((item) => `- ${item}`).join("\n") : emptyText;
}

function sanitizePublicPlace(value: string) {
  return value
    .replace(/\b(?:rua|avenida|av\.|travessa|alameda)\s+[^,.;\n]+,\s*\d+\b/gi, "local do território")
    .replace(/\b\d{4,5}[-.\s]?\d{4}\b/g, "")
    .replace(/\b[\w.%+-]+@[\w.-]+\.[a-zA-Z]{2,}\b/g, "")
    .trim();
}

export function buildActionDebrief(action: ActionForPilot, records: ListeningRecordForPilot[]): GeneratedActionDebrief {
  const fullMetrics = getActionPilotMetrics(records);
  const safeReviewedRecords = records.filter(
    (record) => record.review_status === "reviewed" && !hasPossibleSensitiveData(record)
  );
  const sourceRecords = safeReviewedRecords.length > 0
    ? safeReviewedRecords
    : records.filter((record) => !hasPossibleSensitiveData(record));
  const metrics = getActionPilotMetrics(sourceRecords);
  const bairro = action.neighborhoods?.name ?? "território informado";
  const isFair = action.action_type === "banca_escuta" || action.title.toLowerCase().includes("feira");
  const title = isFair ? "O que ouvimos na feira" : "O que ouvimos nesta ação";
  const warnings: string[] = [];

  if (fullMetrics.draft > 0) {
    warnings.push("Há escutas ainda não revisadas. Recomenda-se revisar antes de aprovar a devolutiva.");
  }

  if (fullMetrics.possibleSensitive > 0) {
    warnings.push("Há registros com possível dado sensível. Revise antes de aprovar a devolutiva.");
  }

  if (safeReviewedRecords.length === 0 && records.length > 0) {
    warnings.push("Ainda não há escutas revisadas sem alerta sensível. A devolutiva deve permanecer em rascunho.");
  }

  const publicSummary = [
    `Nesta ação, foram registradas ${fullMetrics.total} escutas no território ${bairro}.`,
    `Para esta devolutiva, a síntese considera preferencialmente registros revisados e sem alerta de dado sensível. Até o momento, ${fullMetrics.reviewed} escuta(s) estão revisada(s) e ${fullMetrics.draft} permanecem em rascunho.`,
    `Os temas mais recorrentes foram: ${formatInline(metrics.topThemes.slice(0, 5))}. As palavras que mais apareceram foram: ${formatInline(metrics.topWords.slice(0, 8))}.`
  ].join("\n\n");

  const places = metrics.places.map((item) => `${sanitizePublicPlace(item.label)} (${item.count})`).filter(Boolean);
  const priorities = metrics.priorities.map((item) => `${item.label} (${item.count})`);
  const unexpected = metrics.unexpected.map((item) => item.replace(/\s+/g, " ").trim());

  const keyFindings = `Temas mais recorrentes:
${formatBullets(metrics.topThemes.slice(0, 5).map((item) => `${item.label} (${item.count})`))}

Palavras que apareceram:
${formatBullets(metrics.topWords.slice(0, 8).map((item) => `${item.label} (${item.count})`))}

Lugares mencionados:
${formatBullets(places, "- Nenhum lugar mencionado de forma agregada.")}

Prioridades apontadas:
${formatBullets(priorities, "- Nenhuma prioridade apontada.")}

Pontos inesperados:
${formatBullets(unexpected, "- Nenhum ponto inesperado registrado.")}`;

  const nextSteps =
    "A equipe deve revisar esta síntese, confirmar se as pendências foram tratadas e definir quais pontos serão aprofundados em diálogo com o território.";

  const generatedMarkdown = `# ${title}

## Dados da ação

- Ação: ${action.title}
- Data: ${new Date(`${action.action_date}T00:00:00`).toLocaleDateString("pt-BR")}
- Bairro/território: ${bairro}
- Tipo: ${getActionTypeLabel(action.action_type)}
- Prontidão: ${getActionReadiness(records)}

## Síntese pública

${publicSummary}

## Principais achados

${keyFindings}

## Próximos passos

${nextSteps}

## Nota metodológica

${defaultMethodologyNote}

## Privacidade

${defaultPrivacyNote}
`;

  return {
    title,
    publicSummary,
    methodologyNote: defaultMethodologyNote,
    keyFindings,
    nextSteps,
    generatedMarkdown,
    teamReviewText: warnings.length > 0 ? warnings.join("\n") : "Sem alertas críticos automáticos. Revisão humana ainda é obrigatória.",
    totalsSnapshot: {
      ...fullMetrics,
      readiness: getActionReadiness(records),
      source_records_for_public_text: sourceRecords.length
    },
    warnings
  };
}

export function buildPublicDebriefMarkdown(input: {
  title: string;
  action: ActionForPilot;
  readiness: string;
  publicSummary: string;
  keyFindings: string;
  nextSteps: string;
  methodologyNote: string;
}) {
  return `# ${input.title}

## Dados da ação

- Ação: ${input.action.title}
- Data: ${new Date(`${input.action.action_date}T00:00:00`).toLocaleDateString("pt-BR")}
- Bairro/território: ${input.action.neighborhoods?.name ?? "Não informado"}
- Tipo: ${getActionTypeLabel(input.action.action_type)}
- Prontidão: ${input.readiness}

## Síntese

${input.publicSummary}

## Principais achados

${input.keyFindings}

## Próximos passos

${input.nextSteps}

## Nota metodológica

${input.methodologyNote}

## Privacidade

${defaultPrivacyNote}
`;
}
