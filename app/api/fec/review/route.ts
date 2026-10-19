import { fecBody, fecResponse, fecSession } from "@/lib/fec-server";
import { fecUuid } from "@/lib/fec-knowledge";

export async function POST(request: Request) {
  const session = await fecSession();
  if (session.response) return session.response;
  let body;
  try {
    body = await fecBody(request);
  } catch {
    return fecResponse({ error: "JSON inválido." }, 400);
  }
  if (!body || typeof body !== "object")
    return fecResponse({ error: "Pedido inválido." }, 400);
  const d = body as Record<string, unknown>;
  if (
    !fecUuid(d.id) ||
    !["cycle", "activity", "knowledge"].includes(String(d.kind)) ||
    !["submitted", "approved", "needs_changes"].includes(String(d.decision)) ||
    typeof d.reason !== "string" ||
    d.reason.length > 5000
  )
    return fecResponse(
      { error: "Registro, decisão ou observação inválidos." },
      400,
    );
  if (d.decision === "submitted") {
    const table =
      d.kind === "cycle"
        ? "fec_cycles"
        : d.kind === "activity"
          ? "fec_activities"
          : "fec_knowledge_records";
    const { data, error } = await session.db
      .from(table)
      .update({ status: "submitted" })
      .eq("id", d.id)
      .eq("owner_id", session.userId)
      .select("id")
      .maybeSingle();
    if (error || !data)
      return fecResponse(
        {
          error:
            "Envio recusado. Confira campos obrigatórios, autoria e situação.",
        },
        409,
      );
  } else {
    if (d.decision === "needs_changes" && !d.reason.trim())
      return fecResponse(
        { error: "Justifique os ajustes ou a reabertura." },
        400,
      );
    const { error } = await session.db.rpc("fec_review_record", {
      p_record_kind: d.kind as "cycle" | "activity" | "knowledge",
      p_record_id: d.id,
      p_decision: d.decision as "approved" | "needs_changes",
      p_reason: d.reason,
    });
    if (error)
      return fecResponse(
        {
          error:
            "Revisão recusada. Exige supervisor designado, distinto do executor, situação compatível e fontes aprovadas.",
        },
        403,
      );
  }
  return fecResponse({ ok: true });
}
