import { NextResponse } from "next/server";
import type { Profile } from "@/lib/database.types";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type Body = {
  event_id?: string;
  google_send_invites?: boolean;
};

export async function POST(request: Request) {
  const supabase = createSupabaseServerClient();
  const userResult = await supabase.auth.getUser();
  const user = userResult.data.user;

  if (!user) {
    return NextResponse.json({ error: "Sessão inválida." }, { status: 401 });
  }

  const profileResult = await supabase.from("profiles").select("id, role").eq("id", user.id).single();
  if (profileResult.error || !profileResult.data) {
    return NextResponse.json({ error: "Perfil não encontrado." }, { status: 403 });
  }

  const profile = profileResult.data as Pick<Profile, "id" | "role">;
  if (!["admin", "coordenacao"].includes(profile.role ?? "")) {
    return NextResponse.json({ error: "Apenas coordenação ou admin podem alterar convites do Google Calendar." }, { status: 403 });
  }

  const body = (await request.json().catch(() => null)) as Body | null;
  const eventId = body?.event_id?.trim();
  const googleSendInvites = body?.google_send_invites;

  if (!eventId || typeof googleSendInvites !== "boolean") {
    return NextResponse.json({ error: "Informe event_id e google_send_invites válidos." }, { status: 400 });
  }

  const updateResult = await supabase
    .from("team_calendar_events")
    .update({ google_send_invites: googleSendInvites })
    .eq("id", eventId)
    .select("id, google_send_invites")
    .single();

  if (updateResult.error || !updateResult.data) {
    return NextResponse.json({ error: updateResult.error?.message ?? "Não foi possível atualizar a política de convites." }, { status: 500 });
  }

  return NextResponse.json({
    ok: true,
    google_send_invites: updateResult.data.google_send_invites,
    message: googleSendInvites
      ? "Convites por e-mail ativados para este evento, sem disparo automático de e-mail nesta versão."
      : "Convites por e-mail desativados para este evento.",
  });
}
