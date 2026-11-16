import Link from "next/link";
import type { ReactNode } from "react";

/** Mantém a trilha FEC separada das escutas e dos relatórios da APS. */
export function FecShell({ children }: { children: ReactNode }) {
  return (
    <main className="min-h-screen bg-stone-50 text-stone-900">
      <nav
        aria-label="Navegação do escopo complementar FEC"
        className="border-b border-stone-200 bg-semear-green text-white"
      >
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-4 sm:px-6">
          <Link href="/fec/cartografia" className="font-semibold">
            SEMEAR Territórios · Escopo complementar FEC
          </Link>
          <div className="flex flex-wrap gap-x-4 gap-y-2 text-sm">
            <Link href="/fec/cartografia" className="underline underline-offset-4">
              Atividades
            </Link>
            <Link href="/fec/cartografia/acervo#enviar" className="underline underline-offset-4">
              Enviar relatório
            </Link>
            <Link href="/fec/cartografia/acervo#conferir" className="underline underline-offset-4">
              Conferir relatório
            </Link>
            <Link href="/fec/cartografia/acervo#finalizar" className="underline underline-offset-4">
              Finalizar análise
            </Link>
            <Link href="/fec/cartografia/minuta" className="underline underline-offset-4">
              Relatório mensal
            </Link>
            <a href="/auth/logout" className="underline underline-offset-4">
              Sair
            </a>
          </div>
        </div>
      </nav>
      <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6">{children}</div>
    </main>
  );
}
