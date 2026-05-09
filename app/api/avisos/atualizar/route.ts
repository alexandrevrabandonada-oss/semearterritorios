import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { refreshInternalNotificationsForCurrentUser } from "@/lib/notifications/refresh-internal-notifications";

export async function POST(request: Request) {
  const supabase = createSupabaseServerClient();

  const body = (await request.json().catch(() => ({}))) as {
    scope?: "self" | "role" | "all";
  };

  const scope = body.scope === "all" ? "all" : body.scope === "role" ? "role" : "self";

  try {
    const summary = await refreshInternalNotificationsForCurrentUser(supabase, scope);
    return NextResponse.json({ ok: true, summary });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Falha ao recalcular avisos.";
    return NextResponse.json({ ok: false, error: message }, { status: 400 });
  }
}
