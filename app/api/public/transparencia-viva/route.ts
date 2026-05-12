import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getTerritorialRiskPublicationGuard, sanitizeTerritorialJustificationForPublic } from "@/lib/transparency-territorial-risk";

export async function GET() {
  const supabase = createSupabaseServerClient();
  const result = await supabase
    .from("public_transparency_snapshots")
    .select("id,title,period_start,period_end,status,public_summary,opening_text,listening_text,limits_text,next_steps_text,methodology_notes,totals,territory_summary,theme_summary,word_summary,action_timeline,debrief_links,privacy_notes,published_at,updated_at,territorial_risk_override,territorial_risk_override_reason")
    .eq("status", "published")
    .order("published_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (result.error) {
    return NextResponse.json({ error: "Não foi possível carregar a Transparência Viva." }, { status: 500 });
  }

  const snapshot = result.data;
  if (!snapshot) {
    return NextResponse.json({ snapshot: null });
  }

  const publicSnapshot = { ...snapshot };
  delete (publicSnapshot as { territorial_risk_override?: boolean }).territorial_risk_override;
  delete (publicSnapshot as { territorial_risk_override_reason?: string | null }).territorial_risk_override_reason;
  const territorialRiskGuard = getTerritorialRiskPublicationGuard(snapshot);
  const territorialPublicationNote = territorialRiskGuard.critical
    ? {
        methodology_note: territorialRiskGuard.summary?.methodologyNote ?? null,
        institutional_justification: snapshot.territorial_risk_override_reason
          ? sanitizeTerritorialJustificationForPublic(snapshot.territorial_risk_override_reason)
          : null
      }
    : null;

  return NextResponse.json({
    snapshot: publicSnapshot,
    territorial_publication_note: territorialPublicationNote
  });
}
