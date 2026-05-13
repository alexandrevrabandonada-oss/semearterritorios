import Link from "next/link";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export default async function AguardandoLiberacaoPage() {
  const supabase = createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const profileResult = user
    ? await supabase
        .from("profiles")
        .select("id, full_name, role")
        .eq("id", user.id)
        .maybeSingle()
    : { data: null, error: null };

  const profile = profileResult.data;

  return (
    <main className="flex min-h-screen items-center justify-center p-4">
      <section className="w-full max-w-2xl rounded-[2rem] border border-white/80 bg-white/78 p-8 shadow-soft sm:p-10">
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-semear-earth">Acesso interno</p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight text-semear-green sm:text-4xl">
          Aguardando liberação
        </h1>
        <p className="mt-4 text-sm leading-6 text-stone-700">
          Seu login com Google foi autenticado, mas o acesso ao sistema interno ainda precisa ser liberado pela coordenação.
        </p>
        <p className="mt-2 text-sm leading-6 text-stone-600">
          A coordenação deve cadastrar ou ajustar seu perfil na tabela profiles com um dos papéis permitidos: admin, coordenacao ou equipe.
          Não é necessário criar senha para esse fluxo.
        </p>

        <div className="mt-6 rounded-2xl border border-stone-200 bg-stone-50 p-4 text-xs leading-5 text-stone-700">
          <p className="font-semibold uppercase tracking-[0.12em] text-stone-600">Diagnóstico da sessão</p>
          <p className="mt-2"><strong>Conta logada:</strong> {user?.email ?? "não identificada"}</p>
          <p><strong>UID:</strong> {user?.id ?? "não identificado"}</p>
          <p><strong>Role no profiles:</strong> {profile?.role ?? "sem role"}</p>
          <p><strong>Nome no profiles:</strong> {profile?.full_name ?? "não encontrado"}</p>
          <p className="mt-2 text-stone-600">
            Se este email não for o esperado, clique em Sair e entre novamente com a conta correta.
          </p>
        </div>

        <div className="mt-6 flex flex-wrap gap-2">
          <Link
            className="inline-flex min-h-11 items-center rounded-full border border-semear-green/20 bg-white px-4 text-sm font-semibold text-semear-green"
            href="/auth/logout"
          >
            Sair
          </Link>
        </div>
      </section>
    </main>
  );
}
