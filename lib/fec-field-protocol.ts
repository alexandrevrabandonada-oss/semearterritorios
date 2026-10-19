/**
 * Protocolo guiado de registro de campo do prestador FEC.
 *
 * Este contrato de entrada é usado APENAS em prévia local; não cria registros no
 * Supabase, não infere aceite da FEC nem converte relatos em medição científica.
 */
export const fecFieldTypes = [
  { value: "cartography_workshop", label: "Oficina de cartografia social" },
  { value: "territorial_reading_workshop", label: "Oficina de leitura territorial" },
  { value: "environmental_education_workshop", label: "Educação ambiental popular" },
  { value: "planting_workshop", label: "Oficina de plantio educativo" },
  { value: "training", label: "Atividade formativa" },
  { value: "technical_visit", label: "Visita técnica" },
  { value: "community_feedback", label: "Devolutiva comunitária" },
  { value: "preparation", label: "Preparação" },
  { value: "systematization", label: "Sistematização" },
] as const;

export type FecFieldType = (typeof fecFieldTypes)[number]["value"];
export type ParticipationKind = "recorded" | "estimated" | "not_recorded";

export type FecFieldDraft = {
  territory: string;
  question: string;
  activityDate: string;
  activityType: FecFieldType;
  objective: string;
  methodology: string;
  participationKind: ParticipationKind;
  participantCount: string;
  participantAccounts: string;
  teamObservations: string;
  externalSources: string;
  mapMethod: string;
  mapLegend: string;
  finding: string;
  proposal: string;
  limits: string;
  nextSteps: string;
};

export const emptyFecFieldDraft: FecFieldDraft = {
  territory: "", question: "", activityDate: "",
  activityType: "cartography_workshop", objective: "", methodology: "",
  participationKind: "not_recorded", participantCount: "",
  participantAccounts: "", teamObservations: "", externalSources: "",
  mapMethod: "", mapLegend: "", finding: "", proposal: "", limits: "", nextSteps: "",
};

const dateIsValid = (date: string): boolean => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return false;
  const parsed = new Date(date + "T12:00:00Z");
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === date;
};

const hasPersonalData = (s: string): boolean =>
  /[\w.+-]+@[\w.-]+\.[a-z]{2,}/i.test(s) ||
  /\b\d{3}\.?\d{3}\.?\d{3}-?\d{2}\b/.test(s) ||
  /\b(?:\+?55\s?)?(?:\(?\d{2}\)?[\s.-]?)?9\d{4}[\s.-]?\d{4}\b/.test(s);

export function validateFecFieldDraft(input: FecFieldDraft): string[] {
  const problems: string[] = [];
  if (!input.territory.trim()) problems.push("Informe o território do trabalho.");
  if (!input.question.trim()) problems.push("Informe a pergunta orientadora.");
  if (!dateIsValid(input.activityDate)) problems.push("Informe uma data real no formato AAAA-MM-DD.");
  if (!fecFieldTypes.some(t => t.value === input.activityType)) problems.push("Selecione um tipo de atividade válido.");
  if (!input.objective.trim()) problems.push("Informe o objetivo da atividade.");
  if (!input.methodology.trim()) problems.push("Descreva a metodologia efetivamente utilizada.");
  const isDeskWork = input.activityType === "preparation" || input.activityType === "systematization";
  if (isDeskWork && input.participationKind !== "not_recorded") {
    problems.push("Preparação e sistematização não contabilizam público participante.");
  }
  if (input.participationKind === "not_recorded" && input.participantCount.trim()) {
    problems.push("Deixe a quantidade em branco quando a participação não foi registrada.");
  }
  if (input.participationKind !== "not_recorded") {
    const number = Number(input.participantCount);
    if (!input.participantCount.trim() || !Number.isInteger(number) || number < 0) {
      problems.push("Informe a quantidade de participações, em número inteiro não negativo.");
    }
  }
  if (input.activityType === "cartography_workshop" && (!input.mapMethod.trim() || !input.mapLegend.trim())) {
    problems.push("Oficina de cartografia exige método de construção do mapa e legenda.");
  }
  if (input.finding.trim() && ![input.participantAccounts, input.teamObservations, input.externalSources].some(t => t.trim())) {
    problems.push("Para registrar achado, informe sua origem: relato, observação ou referência externa.");
  }
  // Bloqueio cautelar da prévia: possíveis identificadores exigem revisão fora do formulário.
  if ([input.participantAccounts, input.teamObservations, input.externalSources, input.finding].some(hasPersonalData)) {
    problems.push("Possível dado pessoal detectado. Generalize o conteúdo antes de produzir a minuta.");
  }
  return problems;
}

const shown = (s: string): string => s.trim() || "Não informado.";
export function buildFecFieldDraftMarkdown(input: FecFieldDraft): string {
  const errors = validateFecFieldDraft(input);
  if (errors.length) throw new Error(errors.join(" | "));
  const kind = fecFieldTypes.find(t => t.value === input.activityType)?.label ?? input.activityType;
  const participants = input.participationKind === "not_recorded"
    ? "Não registrado; não equivale a zero."
    : input.participantCount + " participações " + (input.participationKind === "estimated" ? "estimadas" : "registradas") + " (não pessoas únicas).";
  return [
    "# SEMEAR — minuta de registro técnico FEC",
    "",
    "**Estado:** minuta local NÃO enviada nem aprovada. Requer vinculação à atividade oficial e análise da coordenação competente.",
    "**Executor:** frente técnica FEC, independente das atividades contratadas à APS.",
    "**Território:** " + shown(input.territory),
    "**Data da atividade:** " + input.activityDate,
    "**Tipo:** " + kind,
    "**Pergunta orientadora:** " + shown(input.question),
    "**Participação:** " + participants,
    "",
    "## Objetivo", shown(input.objective), "",
    "## Metodologia realizada", shown(input.methodology), "",
    "## Relatos de participantes — NÃO são medições", shown(input.participantAccounts), "",
    "## Observações diretas da equipe", shown(input.teamObservations), "",
    "## Referências externas / estudos / medições identificadas", shown(input.externalSources), "",
    "## Cartografia social — método e legenda", "**Método:** " + shown(input.mapMethod),
    "**Legenda:** " + shown(input.mapLegend), "",
    "## Achado preliminar — depende das fontes acima", shown(input.finding), "",
    "## Proposta / encaminhamento surgido", shown(input.proposal), "",
    "## Limites, dissensos e cautelas", shown(input.limits), "",
    "## Próximos passos e eventual devolutiva", shown(input.nextSteps), "",
    "## Comprovação e revisão pendentes",
    "- Vincular ciclo territorial, contrato/aditivo e profissional responsável.",
    "- Vincular ação ou oficina oficial sem duplicar registros ou participantes.",
    "- Anexar mapa, fotos autorizadas e fontes ao repositório PRIVADO após revisão.",
    "- Revisar riscos de identificação territorial e obter autorização para versão pública.",
    "- A aprovação técnica não substitui validação comunitária nem aceite financeiro FEC.",
    "",
  ].join("\n");
}
