type HeroProps = {
  periodStart: string | null;
  periodEnd: string | null;
  publicSummary: string | null;
};

function formatDate(value: string | null) {
  if (!value) return "não informado";
  return new Date(`${value}T00:00:00`).toLocaleDateString("pt-BR");
}

export function PublicTransparencyHero({ periodStart, periodEnd, publicSummary }: HeroProps) {
  return (
    <section className="rounded-[2rem] border border-semear-green/10 bg-white p-6 shadow-soft sm:p-8">
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-semear-earth">Transparência Viva</p>
      <h1 className="mt-3 text-3xl font-semibold tracking-tight text-semear-green sm:text-5xl">Transparência Viva SEMEAR</h1>
      <p className="mt-2 text-sm font-medium text-stone-700 sm:text-base">Escuta popular, território e ambiente em movimento</p>
      <p className="mt-4 rounded-2xl border border-semear-yellow/40 bg-semear-offwhite px-4 py-3 text-sm font-medium text-semear-green">
        Período: {formatDate(periodStart)} até {formatDate(periodEnd)}
      </p>
      <p className="mt-4 text-sm leading-7 text-stone-700">{publicSummary ?? "Resumo público ainda não disponível para este recorte."}</p>
    </section>
  );
}
