type MetricsProps = {
  totals: Record<string, number>;
};

const metricLabels: Array<{ key: string; label: string }> = [
  { key: "actions_realized", label: "Ações realizadas" },
  { key: "listening_records_reviewed", label: "Escutas revisadas" },
  { key: "territories_reached", label: "Territórios alcançados" },
  { key: "approved_debriefs", label: "Devolutivas aprovadas" }
];

export function PublicTransparencyMetrics({ totals }: MetricsProps) {
  return (
    <section>
      <h2 className="text-xl font-semibold text-semear-green">Visão geral do recorte</h2>
      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {metricLabels.map((item) => (
          <article className="rounded-3xl border border-semear-green/10 bg-white p-5 shadow-soft" key={item.key}>
            <p className="text-sm text-stone-600">{item.label}</p>
            <p className="mt-2 text-4xl font-semibold text-semear-green">{totals[item.key] ?? 0}</p>
          </article>
        ))}
      </div>
    </section>
  );
}
