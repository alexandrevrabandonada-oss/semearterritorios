import type { ReactNode } from "react";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default function FecLayout({ children }: { children: ReactNode }) {
  if (process.env.SEMEAR_FEC_PERSISTENCE_ENABLED !== "true") {
    return (
      <main className="mx-auto max-w-3xl px-6 py-12 text-stone-900">
        <h1 className="text-2xl font-bold">Escopo complementar FEC</h1>
        <p className="mt-4">Esta área ainda não foi liberada para uso.</p>
        <Link href="/acoes" className="mt-6 inline-block underline">Voltar para Ações</Link>
      </main>
    );
  }
  return children;
}
