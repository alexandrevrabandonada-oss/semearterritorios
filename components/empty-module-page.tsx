import Link from "next/link";
import { ArrowLeft, CircleDashed } from "lucide-react";
import type { EmptyModule } from "@/lib/semear-data";

type EmptyModulePageProps = {
  module: EmptyModule;
};

export function EmptyModulePage({ module }: EmptyModulePageProps) {
  const Icon = module.icon;

  return (
    <section className="pb-10">
      <Link
        className="mb-5 inline-flex min-h-11 items-center gap-2 rounded-full border border-semear-green/15 bg-white/70 px-4 text-sm font-semibold text-semear-green transition hover:bg-white"
        href="/"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        Voltar ao dashboard
      </Link>

      <div className="rounded-[2rem] border border-white/80 bg-white/72 p-6 shadow-soft sm:p-8">
        <div className="flex max-w-3xl flex-col gap-5">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-semear-green-soft text-semear-green">
            <Icon className="h-7 w-7" aria-hidden="true" />
          </div>
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-semear-earth">
              Módulo do MVP
            </p>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight text-semear-green sm:text-4xl">
              {module.title}
            </h2>
            <p className="mt-4 text-base leading-7 text-stone-700">{module.description}</p>
          </div>
        </div>

        <div className="mt-8 rounded-[1.5rem] border border-dashed border-semear-green/25 bg-semear-offwhite p-6 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-white text-semear-earth">
            <CircleDashed className="h-6 w-6" aria-hidden="true" />
          </div>
          <h3 className="mt-4 text-lg font-semibold text-semear-green">Nada cadastrado ainda</h3>
          <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-stone-600">
            Este espaço está reservado para o próximo tijolo. A estrutura visual já existe, mas
            nenhum dado real, banco ou integração Supabase foi conectado.
          </p>
        </div>
      </div>
    </section>
  );
}
