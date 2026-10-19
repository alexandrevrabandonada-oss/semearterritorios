/**
 * Fronteira de entrada da API FEC. Aceita apenas campos previstos, nunca
 * owner_id, reviewed_by, status, engagement_id da atividade ou autoria do cliente.
 */
import {
  fecFieldTypes,
  validateFecFieldDraft,
  type FecFieldDraft,
} from "@/lib/fec-field-protocol";
import type {
  FecActivityInsert,
  FecCycleInsert,
} from "@/lib/fec-persistence.types";

type ParseResult<T> = { ok: true; value: T } | { ok: false; reason: string };
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const raw = (value: unknown): Record<string, unknown> | null =>
  value !== null && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
const text = (value: unknown): string =>
  typeof value === "string" ? value.trim() : "";
const safeText = (value: unknown, limit: number): string | null => {
  if (value !== undefined && value !== null && typeof value !== "string")
    return null;
  const valueText = text(value);
  return valueText.length <= limit ? valueText : null;
};
const uuid = (value: unknown): value is string =>
  typeof value === "string" && UUID.test(value);

export function parseFecCycleCreate(
  value: unknown,
  signedInUserId: string,
): ParseResult<FecCycleInsert> {
  const data = raw(value);
  if (!data || !uuid(signedInUserId))
    return { ok: false, reason: "Autenticação ou corpo inválido." };
  if (!uuid(data.engagementId) || !uuid(data.neighborhoodId)) {
    return {
      ok: false,
      reason: "É necessário escolher aditivo e bairro válidos.",
    };
  }
  const title = safeText(data.title, 180);
  const question = safeText(data.guidingQuestion, 2000);
  const objectives = safeText(data.objectives, 6000);
  const methodology = safeText(data.methodology, 6000);
  if (objectives === null || methodology === null)
    return { ok: false, reason: "Objetivos ou metodologia inválidos." };
  if (!title || !question)
    return {
      ok: false,
      reason: "Título e pergunta orientadora são obrigatórios.",
    };
  return {
    ok: true,
    value: {
      engagement_id: data.engagementId,
      neighborhood_id: data.neighborhoodId,
      owner_id: signedInUserId,
      title,
      guiding_question: question,
      objectives,
      methodology,
      status: "draft",
    },
  };
}

export function parseFecActivityCreate(
  value: unknown,
  signedInUserId: string,
): ParseResult<FecActivityInsert> {
  const data = raw(value);
  if (!data || !uuid(signedInUserId) || !uuid(data.cycleId)) {
    return { ok: false, reason: "Sessão ou ciclo inválido." };
  }
  if (
    data.canonicalActionId != null &&
    data.canonicalActionId !== "" &&
    !uuid(data.canonicalActionId)
  )
    return { ok: false, reason: "Ação compartilhada inválida." };
  const themes = safeText(data.themes, 5000),
    fieldNotes = safeText(data.fieldNotes, 10000),
    results = safeText(data.preliminaryResults, 10000);
  if (themes === null || fieldNotes === null || results === null)
    return {
      ok: false,
      reason: "Temas, registros de campo ou resultados inválidos.",
    };
  const activityType = text(data.activityType);
  const validType = fecFieldTypes.find((item) => item.value === activityType);
  if (!validType) return { ok: false, reason: "Tipo de atividade inválido." };
  const kind = text(data.participationKind);
  if (kind !== "recorded" && kind !== "estimated" && kind !== "not_recorded") {
    return { ok: false, reason: "Tipo de participação inválido." };
  }
  const mapping = {
    objective: safeText(data.objective, 2500),
    methodology: safeText(data.methodology, 6000),
    participantAccounts: safeText(data.participantAccounts, 10000),
    teamObservations: safeText(data.teamObservations, 10000),
    externalSources: safeText(data.externalSources, 5000),
    mapMethod: safeText(data.mapMethod, 5000),
    mapLegend: safeText(data.mapLegend, 5000),
    finding: safeText(data.finding, 5000),
    proposal: safeText(data.proposal, 5000),
    limits: safeText(data.limits, 5000),
    nextSteps: safeText(data.nextSteps, 5000),
  };
  if (Object.values(mapping).some((item) => item === null)) {
    return {
      ok: false,
      reason: "Campo maior que o limite permitido ou com formato inválido.",
    };
  }
  const participants =
    kind === "not_recorded"
      ? ""
      : typeof data.participantCount === "number" &&
          Number.isInteger(data.participantCount)
        ? String(data.participantCount)
        : text(data.participantCount);
  const draft: FecFieldDraft = {
    territory: "Território confirmado no ciclo",
    question: "Pergunta orientadora confirmada no ciclo",
    activityDate: text(data.activityDate),
    activityType: validType.value,
    objective: mapping.objective ?? "",
    methodology: mapping.methodology ?? "",
    participationKind: kind,
    participantCount: participants,
    participantAccounts: mapping.participantAccounts ?? "",
    teamObservations: mapping.teamObservations ?? "",
    externalSources: mapping.externalSources ?? "",
    mapMethod: mapping.mapMethod ?? "",
    mapLegend: mapping.mapLegend ?? "",
    finding: mapping.finding ?? "",
    proposal: mapping.proposal ?? "",
    limits: mapping.limits ?? "",
    nextSteps: mapping.nextSteps ?? "",
  };
  const errors = validateFecFieldDraft(draft);
  if (errors.length) return { ok: false, reason: errors.join(" | ") };
  const participantCount =
    kind === "not_recorded" ? null : Number(participants);
  return {
    ok: true,
    value: {
      cycle_id: data.cycleId,
      owner_id: signedInUserId,
      activity_date: draft.activityDate,
      activity_type: draft.activityType,
      objective: draft.objective,
      methodology: draft.methodology,
      participation_kind: kind,
      participation_count: participantCount,
      themes,
      field_notes: fieldNotes,
      preliminary_results: results,
      canonical_action_id: uuid(data.canonicalActionId)
        ? data.canonicalActionId
        : null,
      participant_accounts: draft.participantAccounts || null,
      team_observations: draft.teamObservations || null,
      external_sources: draft.externalSources || null,
      map_method: draft.mapMethod || null,
      map_legend: draft.mapLegend || null,
      finding_draft: draft.finding || null,
      proposal_draft: draft.proposal || null,
      limitations: draft.limits || null,
      next_steps: draft.nextSteps || null,
      status: "draft",
    },
  };
}
