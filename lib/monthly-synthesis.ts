import type {
  Action,
  ListeningRecord,
  WeeklyTeamReport,
  WorkshopRecord,
} from "./database.types";
import {
  activityFields,
  workFronts,
  type WeeklyActivity,
  type ActivityProduct,
} from "./weekly-activities";
import { isConversationCircleRecord } from "./listening-record-methodology";
import { detectImportPrivacyRisks } from "./report-import-privacy";

export type SynthesisBlock = {
  section: string;
  text: string;
  source_ids: string[];
};
export type SynthesisMetrics = {
  actions: number;
  planned_actions: number;
  cancelled_actions: number;
  workshops: number;
  estimated_participations: number | null;
  workshops_without_estimate: number;
  individual_listenings: number;
  round_reports: number;
  products: number;
  approved_weeklies: number;
  pending_weeklies: number;
  fronts: Record<string, number>;
};
export type SynthesisSource = {
  id: string;
  kind: "weekly_activity" | "product" | "action" | "workshop" | "listening";
  title: string;
  date: string;
  report_id?: string;
  content: Record<string, string>;
  preliminary: boolean;
};
export type SynthesisInput = {
  month: string;
  scope: string;
  reports: WeeklyTeamReport[];
  items: WeeklyActivity[];
  products: ActivityProduct[];
  actions: Action[];
  workshops: WorkshopRecord[];
  records: ListeningRecord[];
  neighborhoods?: { id: string; name: string }[];
};
export type SynthesisBase = {
  month: string;
  scope: string;
  metrics: SynthesisMetrics;
  sources: SynthesisSource[];
  warnings: string[];
  methodology_version: "weekly-evidence-v1";
};
export type MonthlySynthesis = {
  id: string;
  reference_month: string;
  scope_key: string;
  version: number;
  status: "draft" | "approved";
  base: SynthesisBase;
  source_hash: string;
  generated_blocks: SynthesisBlock[];
  edited_blocks: SynthesisBlock[];
  public_blocks: SynthesisBlock[];
  review_note: string;
  review_checklist: Record<string, boolean>;
  created_by: string;
  approved_by: string | null;
  approved_at: string | null;
  created_at: string;
  updated_at: string;
  sync_receipt: string | null;
  sync_error: string | null;
  sync_payload_hash: string | null;
};

function monthOf(value: string | null | undefined) {
  return value?.slice(0, 7);
}
function safe(value: string | null | undefined) {
  const text = value?.trim() ?? "";
  return detectImportPrivacyRisks(text).hasRisk
    ? "[Trecho exige revisão de privacidade na fonte.]"
    : text;
}
export function buildMonthlySynthesis(input: SynthesisInput): SynthesisBase {
  const { month, scope } = input;
  const reports = input.reports.filter(
    (r) => scope === "project" || r.team_member_id === scope,
  );
  const approved = new Set(
    reports.filter((r) => r.status === "approved").map((r) => r.id),
  );
  const items = input.items
    .filter(
      (i) => approved.has(i.report_id) && monthOf(i.activity_date) === month,
    )
    .sort((a, b) => a.id.localeCompare(b.id));
  const actionIds = new Set(
    items.flatMap((i) => (i.action_id ? [i.action_id] : [])),
  );
  const actions = input.actions.filter(
    (a) =>
      monthOf(a.action_date) === month &&
      (scope === "project" || actionIds.has(a.id)),
  );
  const performed = actions.filter((a) => a.status === "realizada");
  const performedIds = new Set(performed.map((a) => a.id));
  const workshops = input.workshops.filter(
    (w) =>
      w.status === "approved" &&
      performedIds.has(w.action_id) &&
      monthOf(
        w.workshop_date ??
          input.actions.find((a) => a.id === w.action_id)?.action_date,
      ) === month,
  );
  const groupedProducts = new Map<string, ActivityProduct>();
  const itemIds = new Set(items.map((i) => i.id));
  for (const p of input.products.filter((p) => itemIds.has(p.item_id))) {
    if ((groupedProducts.get(p.product_key)?.version ?? 0) < p.version)
      groupedProducts.set(p.product_key, p);
  }
  const records = input.records.filter(
    (r) =>
      r.review_status === "reviewed" &&
      monthOf(r.date) === month &&
      (scope === "project" ||
        (r.action_id !== null && performedIds.has(r.action_id))),
  );
  const sources: SynthesisSource[] = items.map((i) => ({
    id: i.id,
    kind: "weekly_activity",
    title: safe(i.title),
    date: i.activity_date,
    report_id: i.report_id,
    content: {
      ...Object.fromEntries(activityFields.map(([key]) => [key, safe(i[key])])),
      activity_kind: i.kind,
      work_fronts: i.fronts
        .map((f) => workFronts[f as keyof typeof workFronts])
        .join("; "),
      action_id: i.action_id ?? "",
      territory:
        safe(
          input.neighborhoods?.find(
            (n) =>
              n.id ===
              input.actions.find((a) => a.id === i.action_id)?.neighborhood_id,
          )?.name,
        ) || "Território não informado",
    },
    preliminary: !i.consensus_evidence.trim(),
  }));
  for (const p of Array.from(groupedProducts.values()).sort((a, b) =>
    a.id.localeCompare(b.id),
  ))
    sources.push({
      id: p.id,
      kind: "product",
      title: safe(p.title),
      date: items.find((i) => i.id === p.item_id)!.activity_date,
      report_id: items.find((i) => i.id === p.item_id)!.report_id,
      content: {
        type: p.product_type,
        version: String(p.version),
        description: safe(p.description),
        context: safe(p.map_context),
        legend: safe(p.map_legend),
      },
      preliminary: true,
    });
  for (const a of performed.sort((a, b) => a.id.localeCompare(b.id)))
    sources.push({
      id: a.id,
      kind: "action",
      title: safe(a.title),
      date: a.action_date,
      content: {
        objective: safe(a.objective),
        summary: safe(a.summary),
        territory_id: a.neighborhood_id ?? "",
        territory:
          safe(
            input.neighborhoods?.find((n) => n.id === a.neighborhood_id)?.name,
          ) || "Território não informado",
      },
      preliminary: true,
    });
  for (const w of workshops.sort((a, b) => a.id.localeCompare(b.id)))
    sources.push({
      id: w.id,
      kind: "workshop",
      title: "Oficina aprovada",
      date:
        w.workshop_date ??
        input.actions.find((a) => a.id === w.action_id)!.action_date,
      content: {
        methodology: safe(w.methodology),
        diagnosis: safe(w.collective_diagnosis),
        conclusions: safe(w.main_conclusions),
        divergences: safe(w.disagreements_or_tensions),
        proposals: safe(w.proposals),
        agreements: safe(w.agreements),
      },
      preliminary: !w.consensus_points,
    });
  // Raw listening text is never supplied to the generator; only counts enter the base.
  const fronts: Record<string, number> = {};
  for (const front of Object.keys(workFronts))
    fronts[front] = new Set(
      items
        .filter(
          (i) =>
            i.kind === "field" &&
            i.fronts.includes(front) &&
            i.action_id &&
            performedIds.has(i.action_id),
        )
        .map((i) => i.action_id),
    ).size;
  const estimates = workshops.filter((w) => w.participants_estimated !== null);
  const overlapReports = reports.filter(
    (r) => r.week_start.slice(0, 7) <= month && r.week_end.slice(0, 7) >= month,
  );
  const warnings = [
    "Participações estimadas não representam pessoas únicas. Relatos, observações e medições são fontes distintas.",
    "A revisão da coordenação não equivale à confirmação dos participantes. As interpretações sem evidência de consenso são preliminares.",
  ];
  if (
    items.some(
      (item) =>
        item.action_id &&
        input.actions.some(
          (action) =>
            action.id === item.action_id &&
            monthOf(action.action_date) !== month,
        ),
    )
  )
    warnings.push(
      "Há acompanhamento de ações de outro mês. As atividades e produtos usam suas datas de registro; a contagem de ações permanece no mês da data oficial, sem duplicação.",
    );
  if (overlapReports.some((r) => r.status !== "approved"))
    warnings.push(
      "Há relatórios semanais pendentes. Seu conteúdo não integra esta síntese.",
    );
  if (
    overlapReports.some(
      (r) =>
        r.status === "approved" &&
        !input.items.some((i) => i.report_id === r.id),
    )
  )
    warnings.push(
      "Há semanais aprovados anteriores ao roteiro guiado. Seus textos não foram atribuídos automaticamente a datas ou territórios.",
    );
  if (
    sources.some((s) =>
      Object.values(s.content).some((v) => v.includes("[Trecho exige")),
    )
  )
    warnings.push(
      "Trechos com alerta de privacidade foram omitidos da base de geração.",
    );
  if (!items.length)
    warnings.push(
      "Não há itens semanais aprovados e datados neste mês. Ausência de relato não significa ausência de trabalho.",
    );
  return {
    month,
    scope,
    methodology_version: "weekly-evidence-v1",
    metrics: {
      actions: performed.length,
      planned_actions: actions.filter(
        (a) => a.status === "planejada" || a.status === "reprogramada",
      ).length,
      cancelled_actions: actions.filter((a) => a.status === "cancelada").length,
      workshops: workshops.length,
      estimated_participations: estimates.length
        ? estimates.reduce((n, w) => n + (w.participants_estimated ?? 0), 0)
        : null,
      workshops_without_estimate: workshops.length - estimates.length,
      individual_listenings: records.filter(
        (r) => !isConversationCircleRecord(r),
      ).length,
      round_reports: records.filter((r) => isConversationCircleRecord(r))
        .length,
      products: groupedProducts.size,
      approved_weeklies: overlapReports.filter((r) => r.status === "approved")
        .length,
      pending_weeklies: overlapReports.filter(
        (r) => r.status !== "approved" && r.status !== "archived",
      ).length,
      fronts,
    },
    sources,
    warnings,
  };
}
export function initialSynthesisBlocks(base: SynthesisBase): SynthesisBlock[] {
  return [
    {
      section: "Trabalho realizado",
      text:
        base.sources
          .filter((s) => s.kind === "action")
          .map((s) => s.title)
          .join("; ") || "Nenhuma ação realizada registrada neste recorte.",
      source_ids: base.sources
        .filter((s) => s.kind === "action")
        .map((s) => s.id),
    },
    {
      section: "Resultados e aprendizados",
      text: "Revise as fontes da atividade para redigir a interpretação qualitativa ou solicitar um rascunho assistido.",
      source_ids: [],
    },
    {
      section: "Limites metodológicos",
      text: base.warnings.join("\n"),
      source_ids: [],
    },
  ];
}
export function validateSynthesisBlocks(
  blocks: unknown,
  base: SynthesisBase,
): blocks is SynthesisBlock[] {
  if (!Array.isArray(blocks) || blocks.length > 20) return false;
  const ids = new Set(base.sources.map((s) => s.id));
  return blocks.every(
    (b) =>
      b &&
      typeof b.section === "string" &&
      b.section.length <= 150 &&
      typeof b.text === "string" &&
      b.text.length <= 12000 &&
      Array.isArray(b.source_ids) &&
      b.source_ids.every(
        (id: unknown) => typeof id === "string" && ids.has(id),
      ),
  );
}
export function publicPacket(synthesis: MonthlySynthesis) {
  if (synthesis.status !== "approved" || synthesis.scope_key !== "project")
    throw new Error(
      "Somente a síntese institucional aprovada pode ser enviada ao site.",
    );
  if (
    !synthesis.public_blocks.length ||
    !validateSynthesisBlocks(synthesis.public_blocks, synthesis.base)
  )
    throw new Error("Revise a versão pública.");
  const publicBlocks = synthesis.public_blocks.map(({ section, text }) => ({
    section,
    text,
  }));
  if (
    detectImportPrivacyRisks(
      publicBlocks.map((b) => `${b.section}\n${b.text}`).join("\n"),
    ).hasBlockingRisk
  )
    throw new Error("A versão pública contém possíveis dados pessoais.");
  const {
    actions,
    workshops,
    estimated_participations,
    workshops_without_estimate,
    individual_listenings,
    round_reports,
    products,
    fronts,
  } = synthesis.base.metrics;
  return {
    schema_version: 1,
    source_id: synthesis.id,
    source_version: synthesis.version,
    month: synthesis.reference_month.slice(0, 7),
    methodology_version: synthesis.base.methodology_version,
    approved_at: synthesis.approved_at,
    metrics: {
      actions,
      workshops,
      estimated_participations,
      workshops_without_estimate,
      individual_listenings,
      round_reports,
      products,
      fronts,
    },
    blocks: publicBlocks,
    methodology_notes:
      "Relatório institucional baseado em atividades e registros semanais revisados. Participações estimadas não representam pessoas únicas. Percepções não equivalem a medições ou comprovação causal. Revisão técnica não substitui confirmação dos participantes.",
  };
}
