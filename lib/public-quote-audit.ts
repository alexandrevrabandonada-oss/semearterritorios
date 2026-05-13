import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, ListeningRecordPublicQuote, ListeningRecordPublicQuoteAudit } from "@/lib/database.types";

type DbClient = SupabaseClient<Database>;

export async function createPublicQuoteAuditEvent(
  supabase: DbClient,
  payload: Database["public"]["Tables"]["listening_record_public_quote_audits"]["Insert"]
) {
  const result = await supabase.from("listening_record_public_quote_audits").insert(payload).select("*").single();
  if (result.error) throw result.error;
  return result.data as ListeningRecordPublicQuoteAudit;
}

export async function getPublicQuoteAuditTrail(supabase: DbClient, quoteId: string) {
  const result = await supabase
    .from("listening_record_public_quote_audits")
    .select("*")
    .eq("quote_id", quoteId)
    .order("changed_at", { ascending: false });

  if (result.error) throw result.error;
  return (result.data ?? []) as ListeningRecordPublicQuoteAudit[];
}

export async function buildPublicQuoteAuditSummary(supabase: DbClient, actionId: string) {
  const [quotesResult, auditsResult] = await Promise.all([
    supabase.from("listening_record_public_quotes").select("*").eq("action_id", actionId),
    supabase.from("listening_record_public_quote_audits").select("*").eq("action_id", actionId)
  ]);

  if (quotesResult.error) throw quotesResult.error;
  if (auditsResult.error) throw auditsResult.error;

  const quotes = (quotesResult.data ?? []) as ListeningRecordPublicQuote[];
  const audits = (auditsResult.data ?? []) as ListeningRecordPublicQuoteAudit[];

  const quoteIdsWithAudit = new Set(audits.map((audit) => audit.quote_id));

  const byStatus = {
    total: quotes.length,
    draft: quotes.filter((item) => item.status === "draft").length,
    needs_review: quotes.filter((item) => item.status === "needs_review").length,
    approved_internal: quotes.filter((item) => item.status === "approved_internal").length,
    approved_public: quotes.filter((item) => item.status === "approved_public").length,
    rejected: quotes.filter((item) => item.status === "rejected").length,
    archived: quotes.filter((item) => item.status === "archived").length,
    with_risk: quotes.filter((item) => item.sensitive_risk).length,
    with_audit: quotes.filter((item) => quoteIdsWithAudit.has(item.id)).length,
    pending_justification: quotes.filter((item) => {
      if (item.status === "approved_public") return !(item.public_approval_reason ?? "").trim();
      if (item.status === "rejected") return !(item.rejection_reason ?? "").trim();
      if (item.status === "archived") return !(item.archive_reason ?? "").trim();
      return false;
    }).length
  };

  return {
    byStatus,
    quotes,
    audits
  };
}

export async function getPublicQuoteRiskGovernance(supabase: DbClient, actionId: string) {
  const summary = await buildPublicQuoteAuditSummary(supabase, actionId);

  const editedAfterApproval = summary.audits.filter(
    (audit) =>
      audit.event_type === "sanitized_text_changed" &&
      (audit.old_status === "approved_public" || audit.old_status === "approved_internal")
  ).length;

  const riskDetectedEvents = summary.audits.filter((audit) => audit.event_type === "risk_detected").length;

  return {
    totalQuotes: summary.byStatus.total,
    approvedPublic: summary.byStatus.approved_public,
    withRisk: summary.byStatus.with_risk,
    pendingJustification: summary.byStatus.pending_justification,
    editedAfterApproval,
    riskDetectedEvents,
    auditCoveragePercent:
      summary.byStatus.total > 0
        ? Math.round((summary.byStatus.with_audit / summary.byStatus.total) * 100)
        : 0
  };
}
