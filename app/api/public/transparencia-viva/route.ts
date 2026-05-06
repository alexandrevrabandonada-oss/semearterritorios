import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function GET() {
  const supabase = createSupabaseServerClient();
  const result = await supabase
    .from("public_transparency_snapshots")
    .select("id,title,period_start,period_end,status,public_summary,opening_text,listening_text,limits_text,next_steps_text,methodology_notes,totals,territory_summary,theme_summary,word_summary,action_timeline,debrief_links,privacy_notes,published_at,updated_at")
    .eq("status", "published")
    .order("published_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (result.error) {
    return NextResponse.json({ error: "Não foi possível carregar a Transparência Viva." }, { status: 500 });
  }

  return NextResponse.json({ snapshot: result.data ?? null });
}
