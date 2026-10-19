import Link from "next/link";
import type { ReactNode } from "react";

/** A navegação da frente contratual não oferece digitação de escutas APS ao executor FEC. */
export function FecShell({children}:{children:ReactNode}){
  return <main className="min-h-screen bg-stone-50 text-stone-900">
    <nav aria-label="Navegação da frente técnica FEC" className="border-b border-stone-200 bg-semear-green text-white">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-4 sm:px-6">
        <Link href="/fec/cartografia" className="font-semibold">SEMEAR Territórios · Frente técnica FEC</Link>
        <div className="flex flex-wrap gap-4 text-sm"><Link href="/fec/cartografia" className="underline underline-offset-4">Trilha técnica</Link><Link href="/fec/cartografia/minuta" className="underline underline-offset-4">Minuta local</Link><Link href="/" className="underline underline-offset-4">Sistema interno</Link><a href="/auth/logout" className="underline underline-offset-4">Sair</a></div>
      </div>
    </nav>
    <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6">{children}</div>
  </main>;
}
