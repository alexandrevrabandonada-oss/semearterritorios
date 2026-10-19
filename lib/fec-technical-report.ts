import type { FecActivityRow, FecCycleRow } from "@/lib/fec-persistence.types";
import {
  knowledgeFields,
  knowledgeLabels,
  type FecKnowledgeRow,
} from "@/lib/fec-knowledge";

type FileRef = { id: string; record_id: string; title: string };
export type FecReportSources = {
  cycles: FecCycleRow[];
  activities: FecActivityRow[];
  records: FecKnowledgeRow[];
  files: FileRef[];
};
const workshops = new Set([
  "cartography_workshop",
  "territorial_reading_workshop",
  "environmental_education_workshop",
  "planting_workshop",
]);
export function buildFecTechnicalReport(
  month: string,
  engagementId: string,
  professionalId: string,
  sources: FecReportSources,
) {
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(month)) throw new Error("Mês inválido.");
  const own = sources.cycles.filter(
    (c) => c.engagement_id === engagementId && c.owner_id === professionalId,
  );
  const cycleIds = new Set(own.map((c) => c.id));
  const approvedActivities = sources.activities.filter(
    (a) =>
      cycleIds.has(a.cycle_id) &&
      a.owner_id === professionalId &&
      a.status === "approved",
  );
  const activityIds = new Set(approvedActivities.map((a) => a.id));
  const activities = approvedActivities.filter((a) =>
    a.activity_date.startsWith(month + "-"),
  );
  const [year, m] = month.split("-").map(Number);
  const until = `${m === 12 ? year + 1 : year}-${String(m === 12 ? 1 : m + 1).padStart(2, "0")}-01`;
  const eligible = sources.records.filter(
    (r) =>
      cycleIds.has(r.cycle_id) &&
      r.owner_id === professionalId &&
      r.status === "approved" &&
      r.reviewed_at &&
      r.reviewed_at.slice(0, 10) < until,
  );
  const eligibleIds = new Set(eligible.map((r) => r.id));
  // Uma origem que foi reaberta não pode sustentar silenciosamente a leitura mensal.
  const valid = new Set(
    eligible
      .filter((r) => r.source_activity_ids.every((id) => activityIds.has(id)))
      .map((r) => r.id),
  );
  let changed = true;
  while (changed) {
    changed = false;
    for (const r of eligible)
      if (
        valid.has(r.id) &&
        r.source_record_ids.some((id) => !eligibleIds.has(id) || !valid.has(id))
      ) {
        valid.delete(r.id);
        changed = true;
      }
  }
  const latest = new Map<string, FecKnowledgeRow>();
  for (const r of eligible.filter((r) => valid.has(r.id))) {
    const old = latest.get(r.record_key);
    if (!old || r.version > old.version) latest.set(r.record_key, r);
  }
  const records = Array.from(latest.values()).sort(
    (a, b) =>
      a.kind.localeCompare(b.kind) || a.record_key.localeCompare(b.record_key),
  );
  const firstApproval = (key: string) =>
    eligible
      .filter((r) => r.record_key === key)
      .map((r) => r.reviewed_at!)
      .sort()[0];
  const newMaps = records.filter(
    (r) => r.kind === "map" && firstApproval(r.record_key)?.startsWith(month),
  );
  const thisMonth = records.filter((r) => r.reviewed_at?.startsWith(month));
  const mapVersions = eligible.filter(
    (r) =>
      valid.has(r.id) && r.kind === "map" && r.reviewed_at?.startsWith(month),
  );
  const activeCycleIds = new Set([
    ...activities.map((a) => a.cycle_id),
    ...thisMonth.map((r) => r.cycle_id),
  ]);
  const cycles = own.filter((c) => activeCycleIds.has(c.id));
  const eventGroups = new Map<string, FecActivityRow[]>();
  for (const a of activities) {
    const key = a.canonical_action_id
      ? "action:" + a.canonical_action_id
      : "fec:" + a.id;
    const group = eventGroups.get(key) ?? [];
    group.push(a);
    eventGroups.set(key, group);
  }
  let recorded = 0,
    estimated = 0,
    unknown = 0;
  const warnings: string[] = [];
  for (const group of Array.from(eventGroups.values())) {
    const publicActivities = group.filter(
      (a) => !["preparation", "systematization"].includes(a.activity_type),
    );
    if (publicActivities.length > 1) {
      warnings.push(
        `Evento ${group[0].canonical_action_id}: múltiplas contribuições; público excluído da soma até conferência.`,
      );
      unknown++;
      continue;
    }
    const a = publicActivities[0];
    if (!a) continue;
    if (a.participation_kind === "recorded")
      recorded += a.participation_count ?? 0;
    else if (a.participation_kind === "estimated")
      estimated += a.participation_count ?? 0;
    else unknown++;
  }
  if (eligible.some((r) => !valid.has(r.id)))
    warnings.push(
      "Há produtos com fontes reabertas ou indisponíveis; eles foram excluídos da consolidação.",
    );
  const pending = sources.activities.filter(
    (a) =>
      cycleIds.has(a.cycle_id) &&
      a.owner_id === professionalId &&
      a.activity_date.startsWith(month + "-") &&
      a.status !== "approved",
  );
  if (pending.length)
    warnings.push(
      `${pending.length} atividade(s) do período aguardam aprovação e não entram nos indicadores.`,
    );
  if (!activities.length && !thisMonth.length)
    warnings.push(
      "Sem registros aprovados neste recorte; isso não comprova ausência de trabalho nem entrega contratual.",
    );
  const reportRecords = [
    ...thisMonth.filter((r) => r.kind !== "map"),
    ...mapVersions,
  ];
  const selectedRecordIds = new Set(reportRecords.map((r) => r.id));
  const files = sources.files.filter((f) => selectedRecordIds.has(f.record_id));
  const blocks = [
    {
      title: "1. Síntese do período",
      text: `${activities.length} contribuições FEC aprovadas; ${cycles.length} ciclos com atividade ou produto revisado no mês.`,
      sourceIds: activities.map((a) => a.id),
    },
    {
      title: "2. Territórios trabalhados",
      text:
        Array.from(new Set(cycles.map((c) => c.neighborhood_id))).join("\n") ||
        "Nenhum território com registro aprovado no período.",
      sourceIds: cycles.map((c) => c.id),
    },
    {
      title: "3. Ciclos técnicos em andamento",
      text:
        cycles
          .map(
            (c) =>
              `${c.title} — etapa ${c.stage}; pergunta: ${c.guiding_question}; objetivos: ${c.objectives}; método: ${c.methodology}`,
          )
          .join("\n") || "Sem ciclos com contribuição aprovada no período.",
      sourceIds: cycles.map((c) => c.id),
    },
    {
      title: "4. Oficinas e atividades realizadas",
      text:
        activities
          .map(
            (a) =>
              `${a.activity_date} — ${a.activity_type}: ${a.objective}. Método: ${a.methodology}. Temas: ${a.themes || "não informados"}. Resultados: ${a.preliminary_results || "não informados"}.`,
          )
          .join("\n") || "Sem atividade aprovada.",
      sourceIds: activities.map((a) => a.id),
    },
    ...(["map", "diagnosis", "finding", "proposal"] as const).map(
      (kind, i) => ({
        title: `${i + 5}. ${knowledgeLabels[kind]}`,
        text:
          reportRecords
            .filter((r) => r.kind === kind)
            .map(
              (r) =>
                `${r.title} — versão ${r.version}; revisão ${r.reviewed_at}; situação comunitária: ${r.community_status}${kind === "proposal" ? `; encaminhamento: ${r.proposal_status}` : ""}.\n${Object.entries(
                  r.content,
                )
                  .map(([k, v]) => `${knowledgeFields[kind][k] ?? k}: ${v}`)
                  .join(
                    "\n",
                  )}\nFontes: ${[...r.source_activity_ids, ...r.source_record_ids].join(", ")}`,
            )
            .join("\n\n") || "Nenhum registro aprovado nesta categoria no mês.",
        sourceIds: reportRecords
          .filter((r) => r.kind === kind)
          .map((r) => r.id),
      }),
    ),
    {
      title: "9. Dificuldades, limitações e lacunas",
      text:
        [
          ...activities.map((a) => a.limitations).filter(Boolean),
          ...warnings,
        ].join("\n") || "Não registradas; conferir com o executor.",
      sourceIds: activities.filter((a) => a.limitations).map((a) => a.id),
    },
    {
      title: "10. Planejamento das próximas atividades",
      text:
        activities
          .map((a) => a.next_steps)
          .filter(Boolean)
          .join("\n") || "Planejamento ainda não registrado.",
      sourceIds: activities.filter((a) => a.next_steps).map((a) => a.id),
    },
    {
      title: "11. Anexos e registros comprobatórios",
      text:
        files
          .map(
            (f) => `${f.title} — anexo privado ${f.id}; produto ${f.record_id}`,
          )
          .join("\n") ||
        "Sem anexos vinculados aos produtos aprovados no período.",
      sourceIds: files.map((f) => f.id),
    },
  ];
  return {
    kind: "fec_individual_technical_report_draft" as const,
    month,
    engagementId,
    professionalId,
    workstream: "fec_cartografia" as const,
    approval: "not_submitted" as const,
    metrics: {
      activityCount: activities.length,
      workshopCount: new Set(
        activities
          .filter((a) => workshops.has(a.activity_type))
          .map((a) =>
            a.canonical_action_id
              ? "action:" + a.canonical_action_id
              : "fec:" + a.id,
          ),
      ).size,
      eventCount: eventGroups.size,
      recordedParticipations: recorded,
      estimatedParticipations: estimated,
      unknownParticipationEvents: unknown,
      uniquePeople: null,
      newMapCount: newMaps.length,
      mapRevisions: mapVersions.length,
      diagnoses: thisMonth.filter((r) => r.kind === "diagnosis").length,
      findings: thisMonth.filter((r) => r.kind === "finding").length,
      proposals: thisMonth.filter((r) => r.kind === "proposal").length,
    },
    blocks,
    warnings,
    sourceIds: [
      ...activities.map((a) => a.id),
      ...reportRecords.map((r) => r.id),
    ],
    caveats: [
      "Minuta técnica individual FEC; exige revisão e não constitui aceite financeiro.",
      "Participações não equivalem a pessoas únicas.",
      "Percepções e mapas sociais não comprovam concentração de poluentes ou causalidade.",
      "Síntese integrada do projeto e publicação exigem curadoria própria.",
    ],
  };
}
export function fecReportMarkdown(
  report: ReturnType<typeof buildFecTechnicalReport>,
) {
  return [
    "# Relatório técnico individual FEC — " + report.month,
    "",
    `Profissional: ${report.professionalId} | Aditivo: ${report.engagementId}`,
    "",
    ...report.caveats.map((s) => "- " + s),
    "",
    ...report.blocks.flatMap((b) => [
      "## " + b.title,
      b.text,
      "Fontes: " + (b.sourceIds.join(", ") || "sem registro"),
      "",
    ]),
  ].join("\n");
}

/** Cadastro geral não é automaticamente atribuído à APS: a origem contratual precisa ser explícita. */
export function buildFecTerritorialOverview(
  actions: { id: string; status: string }[],
  activities: Pick<
    FecActivityRow,
    "id" | "status" | "activity_type" | "canonical_action_id"
  >[],
) {
  const official = actions.filter((a) => a.status === "realizada");
  const fec = activities.filter(
    (a) =>
      a.status === "approved" &&
      !["preparation", "systematization"].includes(a.activity_type),
  );
  return {
    eventCount: new Set([
      ...official.map((a) => "event:" + a.id),
      ...fec.map((a) =>
        a.canonical_action_id
          ? "event:" + a.canonical_action_id
          : "fec:" + a.id,
      ),
    ]).size,
    officialActionIds: official.map((a) => a.id),
    fecContributionIds: fec.map((a) => a.id),
  };
}
