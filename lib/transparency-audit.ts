import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  Database,
  Profile,
  PublicTransparencySnapshot,
  PublicTransparencySnapshotReviewComment,
  PublicTransparencySnapshotVersion,
  SnapshotReviewCommentType
} from "@/lib/database.types";
import {
  buildTransparencyTextBlob,
  detectTransparencyPrivacyRisks,
  normalizeTransparencyChecklist
} from "@/lib/transparency-privacy";
import { getSnapshotStatusLabel } from "@/lib/transparency-snapshots";

export type SnapshotCommentWithAuthor = PublicTransparencySnapshotReviewComment & {
  author?: Pick<Profile, "id" | "full_name"> | null;
  resolver?: Pick<Profile, "id" | "full_name"> | null;
};

export type SnapshotVersionWithAuthor = PublicTransparencySnapshotVersion & {
  author?: Pick<Profile, "id" | "full_name"> | null;
};

export type SnapshotAuditStatus = {
  pendingCriticalComments: number;
  pendingTextComments: number;
  pendingOtherComments: number;
  hasBlockingComments: boolean;
  hasTextWarnings: boolean;
  lastVersionAt: string | null;
  totalVersions: number;
};

export type SnapshotAuditExport = {
  snapshot: PublicTransparencySnapshot;
  versions: SnapshotVersionWithAuthor[];
  comments: SnapshotCommentWithAuthor[];
  checklist: ReturnType<typeof normalizeTransparencyChecklist>;
  riskReport: ReturnType<typeof detectTransparencyPrivacyRisks>;
  auditStatus: SnapshotAuditStatus;
  people: Record<string, string>;
  markdown: string;
};

type DbClient = SupabaseClient<Database>;

export async function createSnapshotVersion(supabase: DbClient, snapshotId: string, reason: string) {
  const result = await supabase.rpc("create_public_transparency_snapshot_version", {
    p_snapshot_id: snapshotId,
    p_reason: reason
  });

  if (result.error) throw result.error;
  return result.data as string | null;
}

export async function getSnapshotVersions(supabase: DbClient, snapshotId: string) {
  const result = await supabase
    .from("public_transparency_snapshot_versions")
    .select("*")
    .eq("snapshot_id", snapshotId)
    .order("version_number", { ascending: false });

  if (result.error) throw result.error;
  return (result.data ?? []) as PublicTransparencySnapshotVersion[];
}

export async function addReviewComment(
  supabase: DbClient,
  snapshotId: string,
  payload: { comment: string; comment_type: SnapshotReviewCommentType; author_id: string | null }
) {
  const result = await supabase
    .from("public_transparency_snapshot_review_comments")
    .insert({
      snapshot_id: snapshotId,
      comment: payload.comment.trim(),
      comment_type: payload.comment_type,
      author_id: payload.author_id
    })
    .select("*")
    .single();

  if (result.error) throw result.error;
  return result.data as PublicTransparencySnapshotReviewComment;
}

export async function resolveReviewComment(
  supabase: DbClient,
  commentId: string,
  resolverId: string | null
) {
  const result = await supabase
    .from("public_transparency_snapshot_review_comments")
    .update({
      resolved: true,
      resolved_by: resolverId,
      resolved_at: new Date().toISOString()
    })
    .eq("id", commentId)
    .select("*")
    .single();

  if (result.error) throw result.error;
  return result.data as PublicTransparencySnapshotReviewComment;
}

export async function getSnapshotAuditStatus(supabase: DbClient, snapshotId: string) {
  const [versions, comments] = await Promise.all([
    getSnapshotVersions(supabase, snapshotId),
    getSnapshotReviewComments(supabase, snapshotId)
  ]);

  return buildSnapshotAuditStatus(versions, comments);
}

export async function buildSnapshotAuditExport(supabase: DbClient, snapshotId: string) {
  const snapshotResult = await supabase.from("public_transparency_snapshots").select("*").eq("id", snapshotId).single();
  if (snapshotResult.error) throw snapshotResult.error;
  const snapshot = snapshotResult.data as PublicTransparencySnapshot;

  const [versions, comments] = await Promise.all([
    getSnapshotVersions(supabase, snapshotId),
    getSnapshotReviewComments(supabase, snapshotId)
  ]);

  const peopleIds = Array.from(
    new Set([
      snapshot.created_by,
      snapshot.last_reviewed_by,
      snapshot.last_edited_by,
      snapshot.approved_by,
      ...versions.map((item) => item.created_by),
      ...comments.map((item) => item.author_id),
      ...comments.map((item) => item.resolved_by)
    ].filter(Boolean) as string[])
  );

  const people = await fetchPeopleMap(supabase, peopleIds);
  const checklist = normalizeTransparencyChecklist(snapshot.review_checklist);
  const riskReport = detectTransparencyPrivacyRisks(
    buildTransparencyTextBlob([
      snapshot.title,
      snapshot.public_summary,
      snapshot.opening_text,
      snapshot.listening_text,
      snapshot.limits_text,
      snapshot.next_steps_text,
      snapshot.privacy_notes,
      snapshot.methodology_notes
    ])
  );
  const auditStatus = buildSnapshotAuditStatus(versions, comments);
  const versionsWithAuthor = versions.map((item) => ({
    ...item,
    author: item.created_by ? { id: item.created_by, full_name: people[item.created_by] ?? item.created_by } : null
  }));
  const commentsWithAuthor = comments.map((item) => ({
    ...item,
    author: item.author_id ? { id: item.author_id, full_name: people[item.author_id] ?? item.author_id } : null,
    resolver: item.resolved_by ? { id: item.resolved_by, full_name: people[item.resolved_by] ?? item.resolved_by } : null
  }));

  return {
    snapshot,
    versions: versionsWithAuthor,
    comments: commentsWithAuthor,
    checklist,
    riskReport,
    auditStatus,
    people,
    markdown: renderSnapshotAuditExport(snapshot, checklist, riskReport, auditStatus, versionsWithAuthor, commentsWithAuthor, people)
  } satisfies SnapshotAuditExport;
}

export async function getSnapshotReviewComments(supabase: DbClient, snapshotId: string) {
  const result = await supabase
    .from("public_transparency_snapshot_review_comments")
    .select("*")
    .eq("snapshot_id", snapshotId)
    .order("created_at", { ascending: false });

  if (result.error) throw result.error;
  return (result.data ?? []) as PublicTransparencySnapshotReviewComment[];
}

export function buildSnapshotAuditStatus(
  versions: PublicTransparencySnapshotVersion[],
  comments: PublicTransparencySnapshotReviewComment[]
): SnapshotAuditStatus {
  const pending = comments.filter((item) => !item.resolved);
  const pendingCriticalComments = pending.filter((item) => ["privacidade", "dados", "metodologia"].includes(item.comment_type)).length;
  const pendingTextComments = pending.filter((item) => item.comment_type === "texto").length;
  const pendingOtherComments = pending.filter((item) => !["privacidade", "dados", "metodologia", "texto"].includes(item.comment_type)).length;

  return {
    pendingCriticalComments,
    pendingTextComments,
    pendingOtherComments,
    hasBlockingComments: pendingCriticalComments > 0,
    hasTextWarnings: pendingTextComments > 0,
    lastVersionAt: versions[0]?.created_at ?? null,
    totalVersions: versions.length
  };
}

function renderSnapshotAuditExport(
  snapshot: PublicTransparencySnapshot,
  checklist: ReturnType<typeof normalizeTransparencyChecklist>,
  riskReport: ReturnType<typeof detectTransparencyPrivacyRisks>,
  auditStatus: SnapshotAuditStatus,
  versions: SnapshotVersionWithAuthor[],
  comments: SnapshotCommentWithAuthor[],
  people: Record<string, string>
) {
  const unresolved = comments.filter((item) => !item.resolved);
  const decision = snapshot.status === "published" && !auditStatus.hasBlockingComments
    ? "Snapshot publicado sem bloqueios críticos de auditoria."
    : snapshot.status === "approved"
      ? "Snapshot aprovado, ainda sem publicação."
      : "Snapshot ainda depende de revisão editorial antes da publicação.";

  return [
    "# Homologação da Transparência Viva",
    "",
    "## Snapshot",
    `- título: ${snapshot.title}`,
    `- período: ${snapshot.period_start ?? "não informado"} até ${snapshot.period_end ?? "não informado"}`,
    `- status: ${getSnapshotStatusLabel(snapshot.status)}`,
    `- criado por: ${formatPerson(snapshot.created_by, people)}`,
    `- revisado por: ${formatPerson(snapshot.last_reviewed_by, people)}`,
    `- aprovado por: ${formatPerson(snapshot.approved_by, people)}`,
    `- publicado em: ${snapshot.published_at ?? "não publicado"}`,
    "",
    "## Checklist de privacidade",
    ...Object.entries(checklist).map(([key, value]) => `- ${key}: ${value ? "ok" : "pendente"}`),
    "",
    "## Alertas de risco",
    ...(riskReport.blockers.length === 0 && riskReport.warnings.length === 0
      ? ["- nenhum alerta detectado no texto editável"]
      : [
          ...riskReport.blockers.map((risk) => `- bloqueante: ${risk.message} (${risk.matches.join(" | ") || "sem trecho"})`),
          ...riskReport.warnings.map((risk) => `- aviso: ${risk.message} (${risk.matches.join(" | ") || "sem trecho"})`)
        ]),
    "",
    "## Histórico de versões",
    ...(versions.length === 0
      ? ["- nenhuma versão registrada"]
      : versions.map((version) => `- v${version.version_number} · ${version.status_at_time ?? "sem status"} · ${version.created_at} · ${version.author?.full_name ?? "autor não identificado"} · ${version.change_reason ?? "sem motivo informado"}`)),
    "",
    "## Comentários e pendências",
    ...(comments.length === 0
      ? ["- nenhum comentário registrado"]
      : comments.map((comment) => `- [${comment.resolved ? "resolvido" : "pendente"}] ${comment.comment_type}: ${comment.comment} (${comment.author?.full_name ?? "autor não identificado"})`)),
    "",
    "## Decisão",
    `- ${decision}`,
    `- comentários críticos pendentes: ${auditStatus.pendingCriticalComments}`,
    `- comentários de texto pendentes: ${auditStatus.pendingTextComments}`,
    `- total de versões: ${auditStatus.totalVersions}`,
    `- último versionamento: ${auditStatus.lastVersionAt ?? "não registrado"}`,
    ...(unresolved.length > 0 ? ["- pendências ainda abertas exigem conferência humana antes da homologação institucional."] : [])
  ].join("\n");
}

async function fetchPeopleMap(supabase: DbClient, ids: string[]) {
  if (ids.length === 0) return {};
  const result = await supabase.from("profiles").select("id, full_name").in("id", ids);
  if (result.error) throw result.error;
  return ((result.data ?? []) as Array<Pick<Profile, "id" | "full_name">>).reduce<Record<string, string>>((acc, item) => {
    acc[item.id] = item.full_name ?? item.id;
    return acc;
  }, {});
}

function formatPerson(id: string | null, people: Record<string, string>) {
  if (!id) return "não registrado";
  return people[id] ?? id;
}
