"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, CalendarDays, FileText } from "lucide-react";
import { getMonthValue } from "@/lib/monthly-reports";

export function MonthlyReportMonthPicker() {
  const router = useRouter();
  const [month, setMonth] = useState(getMonthValue(new Date().toISOString()));

  return (
    <section className="pb-10">
      <div className="mb-5 flex flex-wrap gap-3">
        <Link className="inline-flex min-h-11 items-center gap-2 rounded-full border border-semear-green/15 bg-white/70 px-4 text-sm font-semibold text-semear-green transition hover:bg-white" href="/relatorios">
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          Voltar para relatórios
        </Link>
      </div>

      <div className="rounded-[2rem] border border-white/80 bg-white/78 p-5 shadow-soft sm:p-8">
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-semear-earth">Novo relatório mensal</p>
        <h2 className="mt-3 text-3xl font-semibold tracking-tight text-semear-green">Escolha o mês de referência</h2>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-stone-600">
          O sistema vai consolidar automaticamente ações, escutas, temas, prioridades e pendências do mês escolhido, sem gerar interpretação automática além dos dados registrados.
        </p>

        <form className="mt-8 grid gap-5 lg:grid-cols-[0.6fr_0.4fr]" onSubmit={(event) => {
          event.preventDefault();
          router.push(`/relatorios/${month}`);
        }}>
          <label>
            <span className="text-xs font-semibold uppercase tracking-[0.12em] text-stone-500">Mês e ano</span>
            <div className="mt-2 flex min-h-14 items-center gap-3 rounded-[1.5rem] border border-semear-gray bg-white px-4">
              <CalendarDays className="h-5 w-5 text-semear-green" aria-hidden="true" />
              <input className="w-full bg-transparent text-base text-semear-green outline-none" onChange={(event) => setMonth(event.target.value)} type="month" value={month} />
            </div>
          </label>

          <div className="rounded-[1.5rem] border border-semear-gray bg-semear-offwhite p-5">
            <p className="text-sm font-semibold text-semear-green">Saídas geradas</p>
            <ul className="mt-3 space-y-2 text-sm leading-6 text-stone-600">
              <li>Total de ações, escutas e bairros</li>
              <li>Temas, prioridades e pendências</li>
              <li>Texto copiado e markdown do relatório</li>
              <li>CSV das escutas do mês</li>
            </ul>
          </div>

          <button className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-semear-green px-5 text-sm font-semibold text-white lg:max-w-xs" type="submit">
            <FileText className="h-4 w-4" aria-hidden="true" />
            Gerar relatório
          </button>
        </form>
      </div>
    </section>
  );
}