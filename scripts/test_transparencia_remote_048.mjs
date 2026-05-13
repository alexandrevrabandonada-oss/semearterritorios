/**
 * Tijolo 048 - smoke remoto de fluxo editorial e institucional.
 *
 * Uso:
 *   SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... node scripts/test_transparencia_remote_048.mjs
 */

import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error("SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY sao obrigatorios.");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false }
});

const now = Date.now();
const randomTag = Math.random().toString(36).slice(2, 8).toUpperCase();
const stamp = `TV-${randomTag}`;

const checklistCompleto = {
  data_from_aggregates: true,
  no_raw_quote: true,
  no_interviewer_name: true,
  no_team_email: true,
  no_cpf: true,
  no_phone: true,
  no_address: true,
  no_health_data: true,
  rare_occupations_grouped: true,
  minimum_sample_respected: true,
  words_sanitized: true,
  sensitive_places_hidden: true,
  no_census_claim: true,
  reviewed_by_coordination: true
};

const homologationChecklistCompleto = {
  content_reviewed: true,
  privacy_checklist_complete: true,
  no_cpf_phone_email: true,
  no_raw_quote: true,
  no_interviewer_or_team_email: true,
  rare_occupations_grouped: true,
  minimum_sample_respected: true,
  coverage_territorial_reviewed: true,
  territorial_risk_critical_justified: true,
  critical_comments_resolved: true,
  public_api_checked: true,
  validated_by_coordination: true
};

function fail(message) {
  throw new Error(message);
}

async function countVersions(snapshotId) {
  const result = await supabase
    .from("public_transparency_snapshot_versions")
    .select("id", { count: "exact", head: true })
    .eq("snapshot_id", snapshotId);
  if (result.error) fail(`Falha ao contar versoes: ${result.error.message}`);
  return result.count ?? 0;
}

let snapshotId = null;
let packageId = null;
let commentId = null;

try {
  const insertSnapshot = await supabase
    .from("public_transparency_snapshots")
    .insert({
      title: `Smoke Transparencia Viva ${stamp}`,
      status: "draft",
      public_summary: "Resumo institucional agregado sem dado pessoal.",
      generated_summary: "Resumo institucional agregado sem dado pessoal.",
      edited_summary: "Resumo institucional agregado sem dado pessoal.",
      opening_text: "Abertura publica agregada.",
      listening_text: "Sintese de escutas agregadas.",
      limits_text: "Sem dados pessoais, sem endereco, sem fala bruta.",
      next_steps_text: "Revisao humana continua.",
      methodology_notes: "Metodo agregado e sanitizado.",
      privacy_notes: "Sem CPF, telefone ou e-mail.",
      totals: {},
      territory_summary: {},
      theme_summary: {},
      word_summary: {},
      action_timeline: {},
      debrief_links: {},
      review_checklist: checklistCompleto,
      current_risk_report: { hasBlockingRisk: false }
    })
    .select("id,status,published_at")
    .single();

  if (insertSnapshot.error) fail(`Falha ao criar snapshot: ${insertSnapshot.error.message}`);
  snapshotId = insertSnapshot.data.id;

  let versions = await countVersions(snapshotId);
  if (versions !== 0) fail("Snapshot novo deveria iniciar sem versao de auditoria.");

  const markReviewed = await supabase
    .from("public_transparency_snapshots")
    .update({ status: "reviewed" })
    .eq("id", snapshotId)
    .select("id,status")
    .single();
  if (markReviewed.error) fail(`Falha ao marcar reviewed: ${markReviewed.error.message}`);

  versions = await countVersions(snapshotId);
  if (versions < 1) fail("Esperava ao menos 1 versao apos reviewed.");

  const markApproved = await supabase
    .from("public_transparency_snapshots")
    .update({ status: "approved" })
    .eq("id", snapshotId)
    .select("id,status")
    .single();
  if (markApproved.error) fail(`Falha ao marcar approved: ${markApproved.error.message}`);

  versions = await countVersions(snapshotId);
  if (versions < 2) fail("Esperava ao menos 2 versoes apos approved.");

  const insertComment = await supabase
    .from("public_transparency_snapshot_review_comments")
    .insert({
      snapshot_id: snapshotId,
      comment: "Pendencia critica de privacidade para smoke 048",
      comment_type: "privacidade"
    })
    .select("id,resolved")
    .single();
  if (insertComment.error) fail(`Falha ao criar comentario critico: ${insertComment.error.message}`);
  commentId = insertComment.data.id;

  const blockedPublish = await supabase
    .from("public_transparency_snapshots")
    .update({ status: "published" })
    .eq("id", snapshotId);

  if (!blockedPublish.error) {
    fail("Publicacao deveria falhar com comentario critico pendente.");
  }

  const resolveComment = await supabase
    .from("public_transparency_snapshot_review_comments")
    .update({ resolved: true, resolved_at: new Date().toISOString() })
    .eq("id", commentId);
  if (resolveComment.error) fail(`Falha ao resolver comentario: ${resolveComment.error.message}`);

  const publish = await supabase
    .from("public_transparency_snapshots")
    .update({ status: "published" })
    .eq("id", snapshotId)
    .select("id,status,published_at")
    .single();
  if (publish.error) fail(`Falha ao publicar snapshot: ${publish.error.message}`);
  if (!publish.data.published_at) fail("published_at deveria ser preenchido na publicacao.");

  versions = await countVersions(snapshotId);
  if (versions < 3) fail("Esperava ao menos 3 versoes apos published.");

  const editPublished = await supabase
    .from("public_transparency_snapshots")
    .update({ public_summary: `Resumo atualizado ${stamp}` })
    .eq("id", snapshotId)
    .select("id,status,published_at")
    .single();
  if (editPublished.error) fail(`Falha ao editar snapshot publicado: ${editPublished.error.message}`);
  if (editPublished.data.status !== "reviewed") fail("Edicao de published deveria retornar status para reviewed.");
  if (editPublished.data.published_at !== null) fail("Edicao de published deveria limpar published_at.");

  const createPackage = await supabase
    .from("public_transparency_homologation_packages")
    .insert({
      snapshot_id: snapshotId,
      package_code: `SEMEAR-TV-048-${randomTag}-${String(now).slice(-4)}`,
      title: `Pacote ${stamp}`,
      status: "draft",
      approval_checklist: { content_reviewed: true },
      risk_report: { hasBlockingRisk: true },
      frozen_payload: {}
    })
    .select("id,status")
    .single();
  if (createPackage.error) fail(`Falha ao criar pacote: ${createPackage.error.message}`);
  packageId = createPackage.data.id;

  const blockedSign = await supabase
    .from("public_transparency_homologation_packages")
    .update({ status: "signed" })
    .eq("id", packageId);

  if (!blockedSign.error) {
    fail("Assinatura deveria falhar com checklist/risk/payload invalidos.");
  }

  const reapprove = await supabase
    .from("public_transparency_snapshots")
    .update({ status: "approved" })
    .eq("id", snapshotId);
  if (reapprove.error) fail(`Falha ao reaprovar snapshot: ${reapprove.error.message}`);

  const preparePackage = await supabase
    .from("public_transparency_homologation_packages")
    .update({
      approval_checklist: homologationChecklistCompleto,
      risk_report: { hasBlockingRisk: false },
      frozen_payload: { safe: true }
    })
    .eq("id", packageId);
  if (preparePackage.error) fail(`Falha ao preparar pacote para assinatura: ${preparePackage.error.message}`);

  const signPackage = await supabase
    .from("public_transparency_homologation_packages")
    .update({ status: "signed" })
    .eq("id", packageId)
    .select("id,status,decision,signed_at")
    .single();

  if (signPackage.error) fail(`Falha ao assinar pacote: ${signPackage.error.message}`);
  if (signPackage.data.status !== "signed") fail("Status final do pacote deveria ser signed.");
  if (!signPackage.data.signed_at) fail("signed_at deveria ser preenchido na assinatura.");

  console.log("SMOKE 048 PASSOU");
  console.log(`snapshot_id=${snapshotId}`);
  console.log(`package_id=${packageId}`);
} catch (error) {
  console.error(`SMOKE 048 FALHOU: ${error.message}`);
  process.exitCode = 1;
} finally {
  if (packageId) {
    await supabase.from("public_transparency_homologation_packages").delete().eq("id", packageId);
  }
  if (commentId) {
    await supabase.from("public_transparency_snapshot_review_comments").delete().eq("id", commentId);
  }
  if (snapshotId) {
    await supabase.from("public_transparency_snapshots").delete().eq("id", snapshotId);
  }
}
