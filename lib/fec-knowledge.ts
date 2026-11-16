import type { FecApprovalState } from "@/lib/fec-persistence.types";

export const knowledgeKinds = [
  "evidence",
  "map",
  "diagnosis",
  "finding",
  "proposal",
] as const;
export type KnowledgeKind = (typeof knowledgeKinds)[number];
export const knowledgeLabels: Record<KnowledgeKind, string> = {
  evidence: "Evidência",
  map: "Mapa social",
  diagnosis: "Diagnóstico participativo",
  finding: "Achado territorial",
  proposal: "Proposta e encaminhamento",
};
export const knowledgeFields: Record<KnowledgeKind, Record<string, string>> = {
  evidence: {
    evidence_class:
      "Tipo: participant_account, team_observation, document ou measurement_or_study",
    description: "Registro da evidência",
    reference: "Referência e contexto de origem",
  },
  map: {
    methodology: "Metodologia participativa",
    legend: "Legenda",
    categories: "Categorias de informação",
    authorship: "Autoria e participação coletiva (sem identificação pessoal)",
  },
  diagnosis: {
    questions: "Questões territoriais",
    preliminary_findings: "Leitura preliminar das evidências",
    divergences: "Divergências e incertezas",
    problems: "Problemas e potencialidades",
    community_proposals: "Propostas comunitárias",
  },
  finding: {
    description: "Achado e interpretação",
    uncertainty: "Limites e incertezas",
  },
  proposal: {
    description: "Proposta formulada",
    responsible: "Responsável pelo acompanhamento",
    response: "Resposta ou providência documentada",
  },
};
export type FecKnowledgeRow = {
  id: string;
  record_key: string;
  version: number;
  previous_id: string | null;
  cycle_id: string;
  owner_id: string;
  kind: KnowledgeKind;
  title: string;
  content: Record<string, string>;
  source_activity_ids: string[];
  source_record_ids: string[];
  community_status:
    | "not_requested"
    | "pending"
    | "partial"
    | "confirmed"
    | "divergent";
  community_notes: string;
  proposal_status:
    | "recorded"
    | "forwarded"
    | "answered"
    | "implemented"
    | "closed";
  status: FecApprovalState;
  reviewed_by: string | null;
  reviewed_at: string | null;
  review_notes: string | null;
  created_at: string;
  updated_at: string;
};
export type FecKnowledgeInsert = Pick<
  FecKnowledgeRow,
  | "cycle_id"
  | "owner_id"
  | "kind"
  | "title"
  | "content"
  | "source_activity_ids"
  | "source_record_ids"
  | "community_status"
  | "community_notes"
  | "proposal_status"
> & { previous_id?: string | null };
export const fecUuid = (value: unknown): value is string =>
  typeof value === "string" &&
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
export function parseKnowledge(
  input: unknown,
  ownerId: string,
): { ok: true; value: FecKnowledgeInsert } | { ok: false; reason: string } {
  const fail = (reason: string) => ({ ok: false as const, reason });
  if (
    !input ||
    typeof input !== "object" ||
    Array.isArray(input) ||
    !fecUuid(ownerId)
  )
    return fail("Corpo ou sessão inválida.");
  const d = input as Record<string, unknown>;
  const allowed = [
    "cycleId",
    "kind",
    "title",
    "content",
    "sourceActivityIds",
    "sourceRecordIds",
    "communityStatus",
    "communityNotes",
    "proposalStatus",
    "previousId",
  ];
  if (Object.keys(d).some((k) => !allowed.includes(k)))
    return fail("Há campos não aceitos, inclusive autoria ou revisão.");
  if (!fecUuid(d.cycleId) || !knowledgeKinds.includes(d.kind as KnowledgeKind))
    return fail("Ciclo ou tipo inválido.");
  const kind = d.kind as KnowledgeKind;
  if (typeof d.title !== "string" || !d.title.trim() || d.title.length > 180)
    return fail("Informe um título com até 180 caracteres.");
  if (!d.content || typeof d.content !== "object" || Array.isArray(d.content))
    return fail("Conteúdo inválido.");
  const content = d.content as Record<string, unknown>;
  if (
    Object.keys(content).some((k) => !Object.hasOwn(knowledgeFields[kind], k))
  )
    return fail("Campo incompatível com o tipo de produto.");
  if (
    Object.values(content).some(
      (v) => typeof v !== "string" || v.length > 10000,
    )
  )
    return fail("Texto inválido ou maior que 10.000 caracteres.");
  const required =
    kind === "map"
      ? ["methodology", "legend", "categories", "authorship"]
      : kind === "diagnosis"
        ? ["questions", "preliminary_findings", "divergences"]
        : kind === "evidence"
          ? ["evidence_class", "description", "reference"]
          : ["description"];
  if (
    required.some(
      (k) => typeof content[k] !== "string" || !String(content[k]).trim(),
    )
  )
    return fail("Preencha os campos obrigatórios do produto.");
  if (
    kind === "evidence" &&
    ![
      "participant_account",
      "team_observation",
      "document",
      "measurement_or_study",
    ].includes(String(content.evidence_class))
  )
    return fail("Classe de evidência inválida.");
  const ids = (v: unknown): v is string[] =>
    Array.isArray(v) &&
    v.length <= 50 &&
    v.every(fecUuid) &&
    new Set(v).size === v.length;
  if (!ids(d.sourceActivityIds) || !ids(d.sourceRecordIds))
    return fail(
      "Selecione fontes válidas, sem repetições (máximo 50 por tipo).",
    );
  if (
    (["map", "evidence", "proposal"].includes(kind) &&
      !d.sourceActivityIds.length) ||
    (["finding", "diagnosis"].includes(kind) &&
      !d.sourceActivityIds.length &&
      !d.sourceRecordIds.length)
  )
    return fail("Este registro exige origem identificada.");
  const community = d.communityStatus ?? "not_requested";
  const notes = d.communityNotes ?? "";
  if (
    !["not_requested", "pending", "partial", "confirmed", "divergent"].includes(
      String(community),
    ) ||
    typeof notes !== "string" ||
    notes.length > 5000 ||
    (community !== "not_requested" && !notes.trim())
  )
    return fail("A situação comunitária exige registro de contexto.");
  const proposal = d.proposalStatus ?? "recorded";
  if (
    !["recorded", "forwarded", "answered", "implemented", "closed"].includes(
      String(proposal),
    ) ||
    (kind !== "proposal" && proposal !== "recorded")
  )
    return fail("Situação de encaminhamento inválida.");
  if (
    kind === "proposal" &&
    proposal !== "recorded" &&
    !String(content.response ?? "").trim()
  )
    return fail(
      "Registre a resposta ou providência que fundamenta a situação.",
    );
  if (d.previousId != null && !fecUuid(d.previousId))
    return fail("Versão anterior inválida.");
  return {
    ok: true,
    value: {
      cycle_id: d.cycleId,
      owner_id: ownerId,
      kind,
      title: d.title.trim(),
      content: content as Record<string, string>,
      source_activity_ids: d.sourceActivityIds,
      source_record_ids: d.sourceRecordIds,
      community_status: community as FecKnowledgeRow["community_status"],
      community_notes: notes,
      proposal_status: proposal as FecKnowledgeRow["proposal_status"],
      previous_id: d.previousId as string | null | undefined,
    },
  };
}
