import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  Database,
  Profile,
  PublicTransparencyHomologationPackage,
  PublicTransparencySnapshot,
  PublicTransparencySnapshotReviewComment,
  PublicTransparencySnapshotVersion
} from "@/lib/database.types";
import { buildSnapshotAuditExport, buildSnapshotAuditStatus, getSnapshotReviewComments, getSnapshotVersions } from "@/lib/transparency-audit";
import { normalizeTransparencyChecklist } from "@/lib/transparency-privacy";
import { getSnapshotStatusLabel } from "@/lib/transparency-snapshots";
import { getTerritorialRiskPublicationGuard } from "@/lib/transparency-territorial-risk";

type DbClient = SupabaseClient<Database>;

export type HomologationChecklistState = {
  content_reviewed: boolean;
  privacy_checklist_complete: boolean;
  no_cpf_phone_email: boolean;
  no_raw_quote: boolean;
  no_interviewer_or_team_email: boolean;
  rare_occupations_grouped: boolean;
  minimum_sample_respected: boolean;
  coverage_territorial_reviewed: boolean;
  territorial_risk_critical_justified: boolean;
  critical_comments_resolved: boolean;
  public_api_checked: boolean;
  validated_by_coordination: boolean;
};

export type HomologationReadiness = {
  canSign: boolean;
  blockers: string[];
  warnings: string[];
};

export type HomologationPackageBundle = {
  snapshot: PublicTransparencySnapshot;
  snapshotVersion: PublicTransparencySnapshotVersion | null;
  versions: PublicTransparencySnapshotVersion[];
  comments: PublicTransparencySnapshotReviewComment[];
  packageItem: PublicTransparencyHomologationPackage;
  readiness: HomologationReadiness;
  markdown: string;
};

export function createEmptyHomologationChecklist(): HomologationChecklistState {
  return {
    content_reviewed: false,
    privacy_checklist_complete: false,
    no_cpf_phone_email: false,
    no_raw_quote: false,
    no_interviewer_or_team_email: false,
    rare_occupations_grouped: false,
    minimum_sample_respected: false,
    coverage_territorial_reviewed: false,
    territorial_risk_critical_justified: false,
    critical_comments_resolved: false,
    public_api_checked: false,
    validated_by_coordination: false
  };
}

export function normalizeHomologationChecklist(value: unknown): HomologationChecklistState {
  const fallback = createEmptyHomologationChecklist();
  if (!value || typeof value !== "object" || Array.isArray(value)) return fallback;
  const source = value as Record<string, unknown>;
  return {
    content_reviewed: Boolean(source.content_reviewed),
    privacy_checklist_complete: Boolean(source.privacy_checklist_complete),
    no_cpf_phone_email: Boolean(source.no_cpf_phone_email),
    no_raw_quote: Boolean(source.no_raw_quote),
    no_interviewer_or_team_email: Boolean(source.no_interviewer_or_team_email),
    rare_occupations_grouped: Boolean(source.rare_occupations_grouped),
    minimum_sample_respected: Boolean(source.minimum_sample_respected),
    coverage_territorial_reviewed: Boolean(source.coverage_territorial_reviewed),
    territorial_risk_critical_justified: Boolean(source.territorial_risk_critical_justified),
    critical_comments_resolved: Boolean(source.critical_comments_resolved),
    public_api_checked: Boolean(source.public_api_checked),
    validated_by_coordination: Boolean(source.validated_by_coordination)
  };
}

export function isHomologationChecklistComplete(
  checklist: HomologationChecklistState,
  snapshotStatus?: PublicTransparencySnapshot["status"] | null
) {
  return getHomologationChecklistItems().every((item) => {
    if (item.key === "public_api_checked" && snapshotStatus !== "published") {
      return true;
    }
    return checklist[item.key];
  });
}

export function getHomologationChecklistItems() {
  return [
    { key: "content_reviewed", label: "Conteúdo revisado." },
    { key: "privacy_checklist_complete", label: "Checklist de privacidade completo." },
    { key: "no_cpf_phone_email", label: "Sem CPF, telefone ou e-mail." },
    { key: "no_raw_quote", label: "Sem fala original bruta." },
    { key: "no_interviewer_or_team_email", label: "Sem entrevistador ou e-mail da equipe." },
    { key: "rare_occupations_grouped", label: "Ocupações raras agrupadas." },
    { key: "minimum_sample_respected", label: "Territórios com amostra menor que 5 marcados como dados insuficientes." },
    { key: "coverage_territorial_reviewed", label: "Cobertura territorial revisada." },
    { key: "territorial_risk_critical_justified", label: "Risco territorial crítico justificado institucionalmente." },
    { key: "critical_comments_resolved", label: "Comentários críticos resolvidos." },
    { key: "public_api_checked", label: "API pública conferida, se já publicado." },
    { key: "validated_by_coordination", label: "Coordenação ou admin validou." }
  ] as const;
}

export async function buildHomologationPackage(supabase: DbClient, snapshotId: string) {
  const [snapshotResult, versions, comments, packages] = await Promise.all([
    supabase.from("public_transparency_snapshots").select("*").eq("id", snapshotId).single(),
    getSnapshotVersions(supabase, snapshotId),
    getSnapshotReviewComments(supabase, snapshotId),
    getHomologationPackages(supabase, snapshotId)
  ]);

  if (snapshotResult.error) throw snapshotResult.error;
  const snapshot = snapshotResult.data as PublicTransparencySnapshot;
  const latestVersion = versions[0] ?? null;
  const existing = packages[0] ?? null;
  const audit = await buildSnapshotAuditExport(supabase, snapshotId);
  const frozenPayload = freezeSnapshotPayload(snapshot, latestVersion);
  const territorialGuard = getTerritorialRiskPublicationGuard(snapshot);
  const approvalChecklist = existing ? normalizeHomologationChecklist(existing.approval_checklist) : inferHomologationChecklist(snapshot, comments, audit.riskReport.hasBlockingRisk);
  const packageItem = existing ?? {
    id: "",
    snapshot_id: snapshot.id,
    snapshot_version_id: latestVersion?.id ?? null,
    package_code: buildPackageCode(packages.length + 1, snapshot.id),
    status: "draft",
    title: snapshot.title,
    period_start: snapshot.period_start,
    period_end: snapshot.period_end,
    institutional_summary: snapshot.public_summary,
    methodology_note: snapshot.methodology_notes,
    privacy_statement: snapshot.privacy_notes,
    approval_checklist: approvalChecklist,
    risk_report: audit.riskReport,
    audit_export: audit.markdown,
    frozen_payload: frozenPayload,
    decision: null,
    decision_reason: null,
    prepared_by: null,
    prepared_at: null,
    signed_by: null,
    signed_at: null,
    territorial_risk_acknowledged: territorialGuard.critical ? true : false,
    territorial_risk_justification: snapshot.territorial_risk_override_reason,
    territorial_risk_acknowledged_by: snapshot.territorial_risk_override_by,
    territorial_risk_acknowledged_at: snapshot.territorial_risk_override_at,
    rejected_by: null,
    rejected_at: null,
    created_by: null,
    created_at: "",
    updated_at: ""
  } as PublicTransparencyHomologationPackage;

  const readiness = evaluateHomologationReadiness(snapshot, packageItem, comments, audit.riskReport.hasBlockingRisk);
  return {
    snapshot,
    snapshotVersion: latestVersion,
    versions,
    comments,
    packageItem,
    readiness,
    markdown: buildHomologationMarkdownFromData(snapshot, latestVersion, packageItem, comments, audit.markdown)
  } satisfies HomologationPackageBundle;
}

export function freezeSnapshotPayload(snapshot: PublicTransparencySnapshot, version: PublicTransparencySnapshotVersion | null) {
  const territorialSummary = (snapshot.territory_summary ?? {}) as {
    territorial_quality_summary?: { methodology_note?: string; status?: string; coverage_percent?: number };
  };
  return {
    title: snapshot.title,
    public_summary: snapshot.public_summary ?? snapshot.edited_summary ?? "",
    totals: snapshot.totals,
    territory_summary: snapshot.territory_summary,
    territorial_methodology_note: territorialSummary.territorial_quality_summary?.methodology_note ?? snapshot.methodology_notes,
    territorial_quality_status: territorialSummary.territorial_quality_summary?.status ?? null,
    territorial_coverage_percent: territorialSummary.territorial_quality_summary?.coverage_percent ?? null,
    territorial_risk_override: snapshot.territorial_risk_override,
    territorial_risk_override_reason: snapshot.territorial_risk_override_reason,
    theme_summary: snapshot.theme_summary,
    word_summary: snapshot.word_summary,
    action_timeline: snapshot.action_timeline,
    privacy_notes: snapshot.privacy_notes,
    snapshot_status: snapshot.status,
    snapshot_version: version ? version.version_number : null
  };
}

export async function createHomologationPackage(supabase: DbClient, snapshotId: string, userId: string | null) {
  const bundle = await buildHomologationPackage(supabase, snapshotId);
  const checklist = normalizeHomologationChecklist(bundle.packageItem.approval_checklist);
  const insertResult = await supabase
    .from("public_transparency_homologation_packages")
    .insert({
      snapshot_id: bundle.snapshot.id,
      snapshot_version_id: bundle.snapshotVersion?.id ?? null,
      package_code: bundle.packageItem.package_code,
      title: bundle.snapshot.title,
      period_start: bundle.snapshot.period_start,
      period_end: bundle.snapshot.period_end,
      institutional_summary: bundle.snapshot.public_summary,
      methodology_note: bundle.snapshot.methodology_notes,
      privacy_statement: bundle.snapshot.privacy_notes,
      approval_checklist: checklist,
      risk_report: bundle.packageItem.risk_report,
      audit_export: bundle.markdown,
      frozen_payload: freezeSnapshotPayload(bundle.snapshot, bundle.snapshotVersion),
      created_by: userId,
      prepared_by: userId,
      territorial_risk_acknowledged: bundle.snapshot.territorial_risk_override,
      territorial_risk_justification: bundle.snapshot.territorial_risk_override_reason,
      territorial_risk_acknowledged_by: bundle.snapshot.territorial_risk_override_by,
      territorial_risk_acknowledged_at: bundle.snapshot.territorial_risk_override_at
    })
    .select("*")
    .single();

  if (insertResult.error) throw insertResult.error;
  return insertResult.data as PublicTransparencyHomologationPackage;
}

export async function markPackageReadyForSignature(supabase: DbClient, packageId: string) {
  const result = await supabase
    .from("public_transparency_homologation_packages")
    .update({ status: "ready_for_signature" })
    .eq("id", packageId)
    .select("*")
    .single();
  if (result.error) throw result.error;
  return result.data as PublicTransparencyHomologationPackage;
}

export async function signHomologationPackage(supabase: DbClient, packageId: string, signerId: string | null) {
  const result = await supabase
    .from("public_transparency_homologation_packages")
    .update({
      status: "signed",
      signed_by: signerId,
      decision: "aprovado_para_publicacao"
    })
    .eq("id", packageId)
    .select("*")
    .single();
  if (result.error) throw result.error;
  return result.data as PublicTransparencyHomologationPackage;
}

export async function rejectHomologationPackage(supabase: DbClient, packageId: string, reason: string, rejectorId: string | null) {
  const result = await supabase
    .from("public_transparency_homologation_packages")
    .update({
      status: "rejected",
      decision: "rejeitado",
      decision_reason: reason,
      rejected_by: rejectorId
    })
    .eq("id", packageId)
    .select("*")
    .single();
  if (result.error) throw result.error;
  return result.data as PublicTransparencyHomologationPackage;
}

export async function archiveHomologationPackage(supabase: DbClient, packageId: string) {
  const result = await supabase
    .from("public_transparency_homologation_packages")
    .update({
      status: "archived",
      decision: "arquivado"
    })
    .eq("id", packageId)
    .select("*")
    .single();
  if (result.error) throw result.error;
  return result.data as PublicTransparencyHomologationPackage;
}

export async function buildHomologationMarkdown(supabase: DbClient, packageId: string) {
  const result = await supabase.from("public_transparency_homologation_packages").select("*").eq("id", packageId).single();
  if (result.error) throw result.error;
  const packageItem = result.data as PublicTransparencyHomologationPackage;
  const bundle = await buildHomologationPackage(supabase, packageItem.snapshot_id);
  return buildHomologationMarkdownFromData(bundle.snapshot, bundle.snapshotVersion, packageItem, bundle.comments, bundle.packageItem.audit_export ?? bundle.markdown);
}

export async function getHomologationPackages(supabase: DbClient, snapshotId?: string) {
  let query = supabase.from("public_transparency_homologation_packages").select("*").order("created_at", { ascending: false });
  if (snapshotId) query = query.eq("snapshot_id", snapshotId);
  const result = await query;
  if (result.error) throw result.error;
  return (result.data ?? []) as PublicTransparencyHomologationPackage[];
}

export function evaluateHomologationReadiness(
  snapshot: PublicTransparencySnapshot,
  packageItem: PublicTransparencyHomologationPackage,
  comments: PublicTransparencySnapshotReviewComment[],
  hasBlockingRisk: boolean
): HomologationReadiness {
  const blockers: string[] = [];
  const warnings: string[] = [];
  const checklist = normalizeHomologationChecklist(packageItem.approval_checklist);
  const pendingCritical = comments.filter((item) => !item.resolved && ["privacidade", "dados", "metodologia"].includes(item.comment_type)).length;
  const pendingText = comments.filter((item) => !item.resolved && item.comment_type === "texto").length;
  const frozenPayloadEmpty = !packageItem.frozen_payload || JSON.stringify(packageItem.frozen_payload) === "{}";
  const territorialGuard = getTerritorialRiskPublicationGuard(snapshot);
  const hasTerritorialJustification = Boolean(
    packageItem.territorial_risk_acknowledged && packageItem.territorial_risk_justification?.trim()
  );

  if (!["approved", "published"].includes(snapshot.status)) blockers.push("Snapshot precisa estar approved ou published para assinatura.");
  if (pendingCritical > 0) blockers.push("Há comentários críticos pendentes.");
  if (hasBlockingRisk) blockers.push("Há risco bloqueante detectado no pacote.");
  if (!isHomologationChecklistComplete(checklist, snapshot.status)) blockers.push("Checklist multi-etapa incompleto.");
  if (territorialGuard.critical && !hasTerritorialJustification) {
    blockers.push("Risco territorial crítico sem justificativa institucional registrada no pacote.");
  }
  if (frozenPayloadEmpty) blockers.push("Frozen payload ainda não foi gerado.");
  if (["rejected", "archived"].includes(packageItem.status)) blockers.push("Pacote rejeitado ou arquivado não pode ser assinado.");
  if (pendingText > 0) warnings.push("Há comentários pendentes de texto para validação final.");

  return {
    canSign: blockers.length === 0,
    blockers,
    warnings
  };
}

export function buildPackageCode(sequence: number, snapshotId: string) {
  const date = new Date();
  const y = date.getFullYear();
  const short = snapshotId.slice(0, 4).toUpperCase();
  return `SEMEAR-TV-${y}-${String(sequence).padStart(4, "0")}-${short}`;
}

function inferHomologationChecklist(
  snapshot: PublicTransparencySnapshot,
  comments: PublicTransparencySnapshotReviewComment[],
  hasBlockingRisk: boolean
) {
  const checklist = normalizeTransparencyChecklist(snapshot.review_checklist);
  const territorialGuard = getTerritorialRiskPublicationGuard(snapshot);
  const pendingCritical = comments.some((item) => !item.resolved && ["privacidade", "dados", "metodologia"].includes(item.comment_type));
  return {
    content_reviewed: snapshot.status === "approved" || snapshot.status === "published",
    privacy_checklist_complete: Object.values(checklist).every(Boolean),
    no_cpf_phone_email: !hasBlockingRisk,
    no_raw_quote: checklist.no_raw_quote,
    no_interviewer_or_team_email: checklist.no_interviewer_name && checklist.no_team_email,
    rare_occupations_grouped: checklist.rare_occupations_grouped,
    minimum_sample_respected: checklist.minimum_sample_respected,
    coverage_territorial_reviewed: checklist.minimum_sample_respected,
    territorial_risk_critical_justified: territorialGuard.critical
      ? Boolean(snapshot.territorial_risk_override && snapshot.territorial_risk_override_reason?.trim())
      : true,
    critical_comments_resolved: !pendingCritical,
    public_api_checked: snapshot.status === "published",
    validated_by_coordination: checklist.reviewed_by_coordination
  } satisfies HomologationChecklistState;
}

function buildHomologationMarkdownFromData(
  snapshot: PublicTransparencySnapshot,
  version: PublicTransparencySnapshotVersion | null,
  packageItem: PublicTransparencyHomologationPackage,
  comments: PublicTransparencySnapshotReviewComment[],
  auditExport: string
) {
  const checklist = normalizeHomologationChecklist(packageItem.approval_checklist);
  const territorialSummary = (snapshot.territory_summary ?? {}) as {
    territorial_quality_summary?: { methodology_note?: string; status?: string; coverage_percent?: number };
  };
  const territorialMethodology = territorialSummary.territorial_quality_summary?.methodology_note;
  const territorialStatus = territorialSummary.territorial_quality_summary?.status;
  const territorialCoverage = territorialSummary.territorial_quality_summary?.coverage_percent;
  return [
    "# Pacote de Homologação — Transparência Viva SEMEAR",
    "",
    "## Código",
    packageItem.package_code,
    "",
    "## Snapshot",
    `- título: ${snapshot.title}`,
    `- status: ${getSnapshotStatusLabel(snapshot.status)}`,
    `- versão congelada: ${version ? `v${version.version_number}` : "não registrada"}`,
    "",
    "## Período",
    `- ${snapshot.period_start ?? "não informado"} até ${snapshot.period_end ?? "não informado"}`,
    "",
    "## Resumo público aprovado",
    snapshot.public_summary ?? "",
    "",
    "## Metodologia",
    packageItem.methodology_note ?? snapshot.methodology_notes ?? "",
    "",
    "## Nota metodológica territorial",
    territorialMethodology ?? "Não registrada no snapshot.",
    ...(territorialStatus ? [`- status: ${territorialStatus}`] : []),
    ...(typeof territorialCoverage === "number" ? [`- cobertura territorial: ${territorialCoverage}%`] : []),
    `- override institucional registrado: ${snapshot.territorial_risk_override ? "sim" : "não"}`,
    `- justificativa institucional: ${packageItem.territorial_risk_justification ?? snapshot.territorial_risk_override_reason ?? "não registrada"}`,
    "",
    "## Checklist de privacidade",
    ...Object.entries(checklist).map(([key, value]) => `- ${key}: ${value ? "ok" : "pendente"}`),
    "",
    "## Alertas de risco",
    JSON.stringify(packageItem.risk_report, null, 2),
    "",
    "## Histórico editorial",
    auditExport,
    "",
    "## Comentários de revisão",
    ...(comments.length > 0 ? comments.map((comment) => `- [${comment.resolved ? "resolvido" : "pendente"}] ${comment.comment_type}: ${comment.comment}`) : ["- sem comentários registrados"]),
    "",
    "## Decisão institucional",
    `- decisão: ${packageItem.decision ?? "não registrada"}`,
    `- motivo: ${packageItem.decision_reason ?? "não informado"}`,
    "",
    "## Assinatura interna",
    `- Responsável: ${packageItem.signed_by ?? "não assinado"}`,
    `- Data: ${packageItem.signed_at ?? "não assinada"}`,
    `- Status: ${packageItem.status}`
  ].join("\n");
}
