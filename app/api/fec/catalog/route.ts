import { fecResponse, fecSession } from "@/lib/fec-server";

export async function GET() {
  const session = await fecSession();
  if (session.response) return session.response;
  const [scopes, neighborhoods, cycles, actions] = await Promise.all([
    session.db.from("fec_engagements").select("*").limit(101),
    session.db.from("neighborhoods").select("id,name").order("name").limit(501),
    session.db
      .from("fec_cycles")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(501),
    session.db
      .from("actions")
      .select("id,title,action_date,neighborhood_id,status")
      .order("action_date", { ascending: false })
      .limit(501),
  ]);
  // O perfil SEMEAR habilitado autoriza a FEC; a API não amplia acesso aos registros APS.
  if (scopes.error || neighborhoods.error || cycles.error)
    return fecResponse(
      { error: "Catálogo FEC indisponível; confira a migração e seu perfil SEMEAR." },
      503,
    );
  if (
    scopes.data.length > 100 ||
    neighborhoods.data.length > 500 ||
    cycles.data.length > 500
  )
    return fecResponse(
      { error: "Catálogo excedeu o limite; é necessária paginação." },
      409,
    );
  return fecResponse({
    userId: session.userId,
    permissions: { canSubmit: true, canReview: true },
    scopes: scopes.data,
    neighborhoods: neighborhoods.data,
    cycles: cycles.data,
    actions: actions.error ? [] : actions.data,
  });
}
