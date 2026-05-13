type TimelineItem = {
  date?: string;
  title?: string;
  territory?: string;
  action_type?: string;
  debrief_status?: string;
};

type TimelineProps = {
  timeline: TimelineItem[];
};

function formatDate(value?: string) {
  if (!value) return "Data não informada";
  return new Date(`${value}T00:00:00`).toLocaleDateString("pt-BR");
}

export function PublicTransparencyTimeline({ timeline }: TimelineProps) {
  return (
    <section className="rounded-[1.5rem] border border-semear-green/10 bg-white p-5 shadow-soft">
      <h2 className="text-lg font-semibold text-semear-green">Linha do tempo de ações</h2>
      {timeline.length === 0 ? <p className="mt-3 text-sm text-stone-600">Linha do tempo pública ainda não disponível para este recorte.</p> : null}
      <div className="mt-3 grid gap-3 md:grid-cols-2">
        {timeline.slice(0, 24).map((item) => (
          <article className="rounded-xl border border-semear-green/10 bg-semear-offwhite p-3" key={`${item.date}-${item.title}-${item.territory}`}>
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-semear-earth">{formatDate(item.date)}</p>
            <p className="mt-1 font-semibold text-semear-green">{item.title ?? "Ação"}</p>
            <p className="mt-1 text-sm text-stone-700">Território: {item.territory ?? "não informado"}</p>
            <p className="mt-1 text-sm text-stone-700">Tipo: {item.action_type ?? "não informado"}</p>
            <p className="mt-1 text-sm text-stone-700">Devolutiva: {item.debrief_status ?? "não informada"}</p>
          </article>
        ))}
      </div>
    </section>
  );
}
