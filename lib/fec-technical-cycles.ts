/**
 * SEMEAR — domínio da frente técnica FEC (proposta isolada; sem persistência).
 * Não altera os registros APS, não concede permissões nem aprova pagamentos.
 * A entrada deve vir de serviços autenticados com RLS e supervisão autorizada.
 */
export const FEC_WORKSTREAM = "fec_cartografia" as const;
export const APS_WORKSTREAM = "aps_mobilizacao" as const;
export type WorkstreamId = typeof FEC_WORKSTREAM | typeof APS_WORKSTREAM;

export type CycleStage = "draft" | "active" | "synthesizing" | "in_review" | "closed";
export type ActivityStatus = "draft" | "submitted" | "needs_changes" | "approved";
export type TechnicalActivityType =
  | "cartography_workshop"
  | "territorial_reading_workshop"
  | "environmental_education_workshop"
  | "planting_workshop"
  | "training"
  | "technical_visit"
  | "community_feedback"
  | "preparation"
  | "systematization"
  | "other";
export type ProductType = "social_map" | "territorial_diagnosis" | "workshop_record" | "educational_material" | "proposal_document" | "other";
export type EvidenceClass = "participant_account" | "team_observation" | "document" | "measurement_or_study";
export type PublicReview = "private" | "awaiting_privacy_review" | "public_candidate";

export type FecCycle = {
  id: string;
  workstreamId: typeof FEC_WORKSTREAM;
  contractScopeId: string;
  professionalId: string;
  title: string;
  territoryIds: string[];
  guidingQuestion: string;
  status: CycleStage;
};

export type FecActivity = {
  id: string;
  cycleId: string;
  workstreamId: typeof FEC_WORKSTREAM;
  date: string; // YYYY-MM-DD, horário local da atividade
  type: TechnicalActivityType;
  status: ActivityStatus;
  objective: string;
  methodology: string;
  canonicalEventId?: string | null; // vínculo opcional; não replica a atividade APS
  participation: { count: number | null; kind: "recorded" | "estimated" | "not_recorded" };
};

export type FecProductRevision = {
  id: string; // identidade do produto, preservada entre versões
  cycleId: string;
  kind: ProductType;
  version: number;
  sourceActivityIds: string[];
  status: ActivityStatus;
  firstApprovedAt: string | null; // data da PRIMEIRA aprovação do produto, não da revisão
  method?: string | null;
  legend?: string | null;
  privacyReview: PublicReview;
};

export type EvidenceRef = { sourceId: string; kind: EvidenceClass };
export type FecFinding = {
  id: string;
  cycleId: string;
  description: string;
  evidence: EvidenceRef[];
  status: "draft" | "reviewed";
  reviewedAt: string | null; // mês próprio do achado, não herdado da atividade
};
export type FecProposal = {
  id: string;
  cycleId: string;
  text: string;
  sourceActivityId: string;
  date: string;
  status: "recorded" | "under_review" | "forwarded" | "answered" | "closed";
};

export type FecMonthInput = {
  month: string;
  professionalId: string;
  cycles: FecCycle[];
  activities: FecActivity[];
  products: FecProductRevision[];
  findings: FecFinding[];
  proposals: FecProposal[];
};

const WORKSHOP_TYPES: ReadonlySet<TechnicalActivityType> = new Set<TechnicalActivityType>([
  "cartography_workshop", "territorial_reading_workshop", "environmental_education_workshop", "planting_workshop",
]);
const NO_PUBLIC_TYPES: ReadonlySet<TechnicalActivityType> = new Set<TechnicalActivityType>(["preparation", "systematization"]);
const ISO_MONTH = /^\d{4}-(0[1-9]|1[0-2])$/;
const ISO_DATE = /^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/;
const filled = (value: string | null | undefined) => Boolean(value?.trim());
const unique = (values: string[]) => Array.from(new Set(values));
const validIsoDate = (value: string) => ISO_DATE.test(value) && !Number.isNaN(Date.parse(`${value}T12:00:00Z`)) && new Date(`${value}T12:00:00Z`).toISOString().slice(0, 10) === value;

export function validateFecCycle(cycle: FecCycle): string[] {
  const errors: string[] = [];
  if (cycle.workstreamId !== FEC_WORKSTREAM) errors.push("Frente incorreta: o ciclo deve pertencer ao aditivo FEC.");
  if (!filled(cycle.id) || !filled(cycle.contractScopeId) || !filled(cycle.professionalId)) errors.push("Identificação, contrato/aditivo e profissional são obrigatórios.");
  if (!filled(cycle.title) || !filled(cycle.guidingQuestion)) errors.push("Título e pergunta orientadora são obrigatórios.");
  if (!cycle.territoryIds.length || cycle.territoryIds.some(id => !filled(id))) errors.push("É necessário vincular território válido.");
  return errors;
}

export function validateFecActivity(activity: FecActivity): string[] {
  const errors: string[] = [];
  if (activity.workstreamId !== FEC_WORKSTREAM) errors.push("Atividade não pertence à frente FEC.");
  if (!filled(activity.id) || !filled(activity.cycleId)) errors.push("Atividade e ciclo devem possuir identificadores.");
  if (!validIsoDate(activity.date)) errors.push("Data inválida.");
  if (!filled(activity.objective) || !filled(activity.methodology)) errors.push("Objetivo e método executado são obrigatórios.");
  const { count, kind } = activity.participation;
  if (count !== null && (!Number.isInteger(count) || count < 0)) errors.push("Participação não pode ser negativa ou fracionária.");
  if (kind === "not_recorded" && count !== null) errors.push("Participação não registrada não deve ter quantidade.");
  if (kind !== "not_recorded" && count === null) errors.push("Participação registrada/estimada exige quantidade explícita.");
  if (NO_PUBLIC_TYPES.has(activity.type) && count !== null) errors.push("Preparação e sistematização não geram contagem de público.");
  return errors;
}

export function validateFecProduct(product: FecProductRevision): string[] {
  const errors: string[] = [];
  if (!filled(product.id) || !filled(product.cycleId)) errors.push("Produto precisa de ID e ciclo.");
  if (!Number.isInteger(product.version) || product.version < 1) errors.push("Versão deve ser um inteiro positivo.");
  if (!product.sourceActivityIds.length || product.sourceActivityIds.some(id => !filled(id))) errors.push("Produto exige pelo menos uma atividade-fonte.");
  if (product.kind === "social_map" && (!filled(product.method) || !filled(product.legend))) errors.push("Mapa social exige método de construção e legenda.");
  if (product.status === "approved" && (!product.firstApprovedAt || !validIsoDate(product.firstApprovedAt))) errors.push("Produto aprovado exige data da primeira aprovação.");
  return errors;
}

export function validateFecFinding(finding: FecFinding): string[] {
  const errors: string[] = [];
  if (!filled(finding.id) || !filled(finding.cycleId) || !filled(finding.description)) errors.push("Achado exige identificação, ciclo e descrição.");
  if (!finding.evidence.length || finding.evidence.some(item => !filled(item.sourceId))) errors.push("Nenhum achado sem fonte: informar ao menos uma evidência rastreável.");
  if (finding.status === "reviewed" && (!finding.reviewedAt || !validIsoDate(finding.reviewedAt))) errors.push("Achado revisado exige data de revisão válida.");
  return errors;
}

/**
 * Síntese interna individual — não possui campos para divulgar mapas, relatos brutos ou dados pessoais.
 * Contagens derivam exclusivamente de registros aprovados e da data da execução real.
 */
export function buildFecTechnicalMonth(input: FecMonthInput) {
  if (!ISO_MONTH.test(input.month)) throw new Error("Mês deve seguir YYYY-MM.");
  const cycles = new Map(input.cycles.filter(c => c.professionalId === input.professionalId && c.workstreamId === FEC_WORKSTREAM).map(c => [c.id, c]));
  const allActivities = input.activities.filter(a => cycles.has(a.cycleId) && a.workstreamId === FEC_WORKSTREAM);
  const bad = allActivities.flatMap(a => validateFecActivity(a).map(message => `${a.id}: ${message}`));
  if (bad.length) throw new Error(`Atividades inconsistentes: ${bad.join(" | ")}`);
  const performed = unique(allActivities.filter(a => a.status === "approved" && a.date.startsWith(`${input.month}-`)).map(a => a.id));
  const performedSet = new Set(performed);
  const selected = Array.from(new Map(allActivities.filter(a => performedSet.has(a.id) && a.status === "approved").map(a => [a.id, a])).values());
  const workshops = selected.filter(a => WORKSHOP_TYPES.has(a.type));
  const declaredParticipation = selected.filter(a => a.participation.kind !== "not_recorded");
  const products = new Map<string, FecProductRevision>();
  for (const product of input.products) {
    if (!cycles.has(product.cycleId) || product.status !== "approved") continue;
    const errors = validateFecProduct(product);
    if (errors.length) throw new Error(`Produto ${product.id}: ${errors.join(" | ")}`);
    const previous = products.get(product.id);
    if (!previous || product.version > previous.version) products.set(product.id, product);
  }
  const approvedActivities = new Set(allActivities.filter(a => a.status === "approved").map(a => `${a.cycleId}:${a.id}`));
  const approvedProducts = Array.from(products.values());
  for (const product of approvedProducts) {
    if (!product.sourceActivityIds.some(id => approvedActivities.has(`${product.cycleId}:${id}`))) {
      throw new Error(`Produto ${product.id}: não há atividade-fonte aprovada no mesmo ciclo.`);
    }
  }
  const newProducts = approvedProducts.filter(p => p.firstApprovedAt?.startsWith(`${input.month}-`));
  const approvedSources = new Set(Array.from(approvedActivities).concat(approvedProducts.map(p => `${p.cycleId}:${p.id}`)));
  const monthlyFindings = input.findings.filter(f => cycles.has(f.cycleId) && f.status === "reviewed" && f.reviewedAt?.startsWith(`${input.month}-`) && validateFecFinding(f).length === 0 && f.evidence.some(e => approvedSources.has(`${f.cycleId}:${e.sourceId}`)));
  const monthlyProposals = input.proposals.filter(p => cycles.has(p.cycleId) && p.date.startsWith(`${input.month}-`) && approvedActivities.has(`${p.cycleId}:${p.sourceActivityId}`));
  return {
    month: input.month,
    workstreamId: FEC_WORKSTREAM,
    professionalId: input.professionalId,
    cycleIds: Array.from(cycles.keys()).sort(),
    activityIds: performed.sort(),
    activityCount: performed.length,
    workshopCount: workshops.length,
    preparationAndSystematizationCount: selected.filter(a => NO_PUBLIC_TYPES.has(a.type)).length,
    participation: {
      recorded: declaredParticipation.filter(a => a.participation.kind === "recorded").reduce((sum, a) => sum + (a.participation.count ?? 0), 0),
      estimated: declaredParticipation.filter(a => a.participation.kind === "estimated").reduce((sum, a) => sum + (a.participation.count ?? 0), 0),
      unknownActivityCount: selected.filter(a => a.participation.kind === "not_recorded").length,
      unit: "participações por atividade, não pessoas únicas" as const,
    },
    productIds: newProducts.map(p => p.id).sort(),
    mapIds: newProducts.filter(p => p.kind === "social_map").map(p => p.id).sort(),
    findingIds: unique(monthlyFindings.map(f => f.id)).sort(),
    proposalIds: unique(monthlyProposals.map(p => p.id)).sort(),
    caveats: [
      "Relatos e cartografias participativas não constituem, isoladamente, medição de poluentes ou comprovação de causalidade.",
      "Aprovação técnica não corresponde ao aceite financeiro da FEC ou à validação comunitária.",
      "Este fechamento individual é privado e não autoriza publicação automática.",
    ],
  };
}

/** Índice de contribuição territorial: une referências, não textos brutos nem participantes. */
export type TerritorialContribution = {
  id: string;
  workstreamId: WorkstreamId;
  territoryId: string;
  eventId: string | null;
  status: "planned" | "performed" | "cancelled";
};
export function buildTerritorialContributionIndex(contributions: TerritorialContribution[]) {
  const performed = contributions.filter(c => c.status === "performed");
  const identities = new Set(performed.map(c => c.eventId ? `event:${c.eventId}` : `source:${c.workstreamId}:${c.id}`));
  return {
    eventCount: identities.size,
    apsContributionIds: unique(performed.filter(c => c.workstreamId === APS_WORKSTREAM).map(c => c.id)).sort(),
    fecContributionIds: unique(performed.filter(c => c.workstreamId === FEC_WORKSTREAM).map(c => c.id)).sort(),
    eventIdentities: Array.from(identities).sort(),
    note: "Um evento partilhado tem uma identidade; contribuições e responsáveis permanecem atribuídos por frente.",
  };
}
