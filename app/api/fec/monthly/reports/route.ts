import type { SupabaseClient } from "@supabase/supabase-js";
import { fecBody, fecResponse, fecSession } from "@/lib/fec-server";
import { fecUuid } from "@/lib/fec-knowledge";
import {
  fecMonthlyPresentation,
  fecMonthValid,
  parseFecMonthlyCommand,
  type FecMonthlyRow,
} from "@/lib/fec-monthly-versions";
import type { FecDatabase } from "@/lib/fec-persistence.types";

function failure(error: { code?: string; message: string }) {
  if (error.code === "P0001")
    return fecResponse(
      { error: error.message },
      error.message.includes("não autorizado") ? 403 : 409,
    );
  return fecResponse(
    {
      error:
        "Fechamentos mensais FEC indisponíveis. Confira a migração e a conexão deste ambiente.",
    },
    503,
  );
}
async function present(db: SupabaseClient<FecDatabase>, record: FecMonthlyRow) {
  const [history, freshness] = await Promise.all([
    db
      .from("fec_monthly_history")
      .select("*")
      .eq("report_id", record.id)
      .order("revision")
      .limit(1001),
    db.rpc("fec_monthly_check", { p_id: record.id }),
  ]);
  if (history.error) return failure(history.error);
  if (freshness.error) return failure(freshness.error);
  if (history.data.length > 1000)
    return fecResponse(
      {
        error:
          "Histórico exige paginação; versão não apresentada com dados truncados.",
      },
      409,
    );
  return fecResponse({
    record,
    history: history.data,
    freshness: freshness.data,
    ...fecMonthlyPresentation(record),
  });
}
export async function GET(request: Request) {
  const session = await fecSession();
  if (session.response) return session.response;
  const p = new URL(request.url).searchParams,
    id = p.get("id");
  if (id) {
    if (!fecUuid(id)) return fecResponse({ error: "Versão inválida." }, 400);
    const { data, error } = await session.db
      .from("fec_monthly_reports")
      .select("*")
      .eq("id", id)
      .maybeSingle();
    if (error) return failure(error);
    if (!data) return fecResponse({ error: "Versão não encontrada." }, 404);
    return present(session.db, data);
  }
  const engagement = p.get("engagementId"),
    professional = p.get("professionalId"),
    month = p.get("month");
  if (!fecUuid(engagement) || !fecUuid(professional) || !fecMonthValid(month))
    return fecResponse(
      { error: "Aditivo, profissional ou mês inválidos." },
      400,
    );
  const { data, error } = await session.db
    .from("fec_monthly_reports")
    .select(
      "id,engagement_id,owner_id,reference_month,version,previous_id,status,revision,source_hash,reviewed_at,updated_at",
    )
    .eq("engagement_id", engagement)
    .eq("owner_id", professional)
    .eq("reference_month", month + "-01")
    .order("version", { ascending: false })
    .limit(101);
  if (error) return failure(error);
  if (data.length > 100)
    return fecResponse({ error: "Versões exigem paginação." }, 409);
  return fecResponse({ versions: data });
}
export async function POST(request: Request) {
  const session = await fecSession();
  if (session.response) return session.response;
  let input;
  try {
    input = await fecBody(request);
  } catch {
    return fecResponse({ error: "JSON inválido ou maior que 150 KB." }, 400);
  }
  const parsed = parseFecMonthlyCommand(input);
  if (!parsed.ok) return fecResponse({ error: parsed.reason }, 400);
  const c = parsed.value;
  const result =
    c.action === "open"
      ? await session.db.rpc("fec_monthly_open", {
          p_engagement_id: c.engagementId,
          p_month: c.month + "-01",
          p_previous_id: c.previousId,
        })
      : c.action === "save"
        ? await session.db.rpc("fec_monthly_save", {
            p_id: c.id,
            p_revision: c.revision,
            p_blocks: c.blocks,
            p_no_activity_reason: c.noActivityReason,
          })
        : c.action === "refresh"
          ? await session.db.rpc("fec_monthly_refresh", {
              p_id: c.id,
              p_revision: c.revision,
            })
          : await session.db.rpc("fec_monthly_transition", {
              p_id: c.id,
              p_revision: c.revision,
              p_decision: c.decision,
              p_reason: c.reason,
              p_checklist: c.checklist,
            });
  if (result.error) return failure(result.error);
  return present(session.db, result.data);
}
