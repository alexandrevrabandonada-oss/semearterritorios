import { fecUuid } from "@/lib/fec-knowledge";
import {
  buildFecTechnicalReport,
  fecReportMarkdown,
  type FecReportSources,
} from "@/lib/fec-technical-report";

export type FecMonthlyStatus =
  | "draft"
  | "submitted"
  | "in_review"
  | "needs_changes"
  | "approved";
export type FecMonthlyBlock = {
  title: string;
  text: string;
  sourceIds: string[];
};
export type FecMonthlySnapshot = FecReportSources & {
  month: string;
  ownerId: string;
  engagementId: string;
};
export type FecMonthlyRow = {
  id: string;
  engagement_id: string;
  owner_id: string;
  reference_month: string;
  version: number;
  previous_id: string | null;
  status: FecMonthlyStatus;
  snapshot: FecMonthlySnapshot;
  source_hash: string;
  blocks: FecMonthlyBlock[];
  calculation_version: 1;
  metrics: ReturnType<typeof buildFecTechnicalReport>["metrics"];
  no_activity_reason: string;
  review_checklist: Record<string, boolean>;
  reviewed_by: string | null;
  reviewed_at: string | null;
  review_notes: string | null;
  revision: number;
  created_by: string;
  created_at: string;
  updated_at: string;
  change_note: string | null;
};
export type FecMonthlyHistory = {
  id: string;
  report_id: string;
  actor_id: string;
  event: string;
  from_status: string | null;
  to_status: FecMonthlyStatus;
  reason: string | null;
  revision: number;
  occurred_at: string;
};
export const monthlySectionTitles = [
  "1. Síntese do período",
  "2. Territórios trabalhados",
  "3. Ciclos técnicos em andamento",
  "4. Oficinas e atividades realizadas",
  "5. Mapa social",
  "6. Diagnóstico participativo",
  "7. Achado territorial",
  "8. Proposta e encaminhamento",
  "9. Dificuldades, limitações e lacunas",
  "10. Planejamento das próximas atividades",
  "11. Anexos e registros comprobatórios",
];
type MonthlyCommand =
  | {
      action: "open";
      engagementId: string;
      month: string;
      previousId: string | null;
    }
  | {
      action: "save";
      id: string;
      revision: number;
      blocks: FecMonthlyBlock[];
      noActivityReason: string;
    }
  | { action: "refresh"; id: string; revision: number; confirmReplace: true }
  | {
      action: "transition";
      id: string;
      revision: number;
      decision: "submitted" | "in_review" | "needs_changes" | "approved";
      reason: string;
      checklist: Record<string, boolean>;
    };
export const fecMonthValid = (v: unknown): v is string =>
  typeof v === "string" && /^[1-9]\d{3}-(0[1-9]|1[0-2])$/.test(v);
export function parseFecMonthlyCommand(
  input: unknown,
): { ok: true; value: MonthlyCommand } | { ok: false; reason: string } {
  const fail = (reason: string) => ({ ok: false as const, reason });
  if (!input || typeof input !== "object" || Array.isArray(input))
    return fail("Pedido mensal inválido.");
  const d = input as Record<string, unknown>;
  const allowed: Record<string, string[]> = {
    open: ["action", "engagementId", "month", "previousId"],
    save: ["action", "id", "revision", "blocks", "noActivityReason"],
    refresh: ["action", "id", "revision", "confirmReplace"],
    transition: ["action", "id", "revision", "decision", "reason", "checklist"],
  };
  if (
    typeof d.action !== "string" ||
    !Object.prototype.hasOwnProperty.call(allowed, d.action) ||
    Object.keys(d).some((k) => !allowed[d.action as string].includes(k))
  )
    return fail(
      "Operação ou campos não aceitos. Autoria e fontes são definidas pelo banco.",
    );
  if (d.action === "open") {
    if (
      !fecUuid(d.engagementId) ||
      !fecMonthValid(d.month) ||
      (d.previousId != null && !fecUuid(d.previousId))
    )
      return fail("Aditivo, mês ou versão anterior inválidos.");
    return {
      ok: true,
      value: {
        action: "open",
        engagementId: d.engagementId,
        month: d.month,
        previousId: (d.previousId as string | null) ?? null,
      },
    };
  }
  if (
    !fecUuid(d.id) ||
    !Number.isInteger(d.revision) ||
    Number(d.revision) < 1 ||
    Number(d.revision) > 2147483647
  )
    return fail("Relatório ou revisão inválidos.");
  const identity = { id: d.id, revision: Number(d.revision) };
  if (d.action === "refresh")
    return d.confirmReplace === true
      ? {
          ok: true,
          value: { action: "refresh", ...identity, confirmReplace: true },
        }
      : fail("Confirme a substituição dos campos editados antes de recompor.");
  if (d.action === "save") {
    if (
      !Array.isArray(d.blocks) ||
      d.blocks.length !== 11 ||
      typeof d.noActivityReason !== "string" ||
      d.noActivityReason.length > 5000
    )
      return fail("Informe os onze blocos e uma justificativa válida.");
    for (let i = 0; i < 11; i++) {
      const b = d.blocks[i];
      if (
        !b ||
        typeof b !== "object" ||
        Array.isArray(b) ||
        Object.keys(b).some(
          (k) => !["title", "text", "sourceIds"].includes(k),
        ) ||
        b.title !== monthlySectionTitles[i] ||
        typeof b.text !== "string" ||
        !b.text.trim() ||
        b.text.length > 10000 ||
        !Array.isArray(b.sourceIds) ||
        b.sourceIds.length > 1000 ||
        !b.sourceIds.every(fecUuid) ||
        new Set(b.sourceIds).size !== b.sourceIds.length
      )
        return fail("Bloco mensal ou referências inválidos.");
    }
    return {
      ok: true,
      value: {
        action: "save",
        ...identity,
        blocks: d.blocks as FecMonthlyBlock[],
        noActivityReason: d.noActivityReason,
      },
    };
  }
  if (
    !["submitted", "in_review", "needs_changes", "approved"].includes(
      String(d.decision),
    ) ||
    typeof d.reason !== "string" ||
    d.reason.length > 5000
  )
    return fail("Decisão ou justificativa inválidas.");
  const checks = d.checklist ?? {};
  if (
    !checks ||
    typeof checks !== "object" ||
    Array.isArray(checks) ||
    Object.entries(checks).some(
      ([k, v]) =>
        !["sources", "methodology", "privacy", "deliverables"].includes(k) ||
        typeof v !== "boolean",
    )
  )
    return fail("Conferências inválidas.");
  if (d.decision === "needs_changes" && !d.reason.trim())
    return fail("A solicitação de ajustes exige justificativa.");
  if (
    d.decision === "approved" &&
    !["sources", "methodology", "privacy", "deliverables"].every(
      (k) => (checks as Record<string, unknown>)[k] === true,
    )
  )
    return fail("Conclua as quatro conferências antes de aprovar.");
  return {
    ok: true,
    value: {
      action: "transition",
      ...identity,
      decision: d.decision as
        | "submitted"
        | "in_review"
        | "needs_changes"
        | "approved",
      reason: d.reason,
      checklist: checks as Record<string, boolean>,
    },
  };
}
export function fecMonthlyPresentation(row: FecMonthlyRow) {
  const base = buildFecTechnicalReport(
    row.reference_month.slice(0, 7),
    row.engagement_id,
    row.owner_id,
    row.snapshot,
  );
  const blocks = row.blocks.length ? row.blocks : base.blocks;
  const report = {
    ...base,
    metrics: row.metrics,
    blocks,
    caveats: [
      row.status === "approved"
        ? "Versão com aprovação técnica; não constitui aceite financeiro da FEC."
        : "Versão de trabalho sujeita à revisão técnica; não constitui aceite financeiro da FEC.",
      ...base.caveats.slice(1),
    ],
  };
  const markdown = [
    `**Versão:** ${row.version} · **Situação:** ${row.status}`,
    `**Fontes congeladas:** ${row.source_hash}`,
    `**Revisão técnica:** ${row.reviewed_by ?? "não realizada"} · ${row.reviewed_at ?? "sem data"}`,
    row.no_activity_reason
      ? "**Justificativa do período:** " + row.no_activity_reason
      : "",
    "",
    fecReportMarkdown(report),
  ]
    .filter(Boolean)
    .join("\n");
  return {
    computed: {
      ...report,
      kind: "fec_individual_technical_report" as const,
      approval: row.status,
    },
    markdown,
  };
}
export type FecMonthlyView = ReturnType<typeof fecMonthlyPresentation> & {
  record: FecMonthlyRow;
  history: FecMonthlyHistory[];
  freshness: { stale: boolean; source_hash: string; current_hash: string };
};
