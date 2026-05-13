type MethodologyProps = {
  territorialStatus: "boa" | "atenção" | "crítica" | null;
  methodologyNote: string | null;
  institutionalJustification: string | null;
};

export function PublicTransparencyMethodologyNote({ territorialStatus, methodologyNote, institutionalJustification }: MethodologyProps) {
  const toneClass = territorialStatus === "boa"
    ? "border-semear-green/15 bg-semear-offwhite text-stone-700"
    : territorialStatus === "atenção"
      ? "border-amber-300 bg-amber-50 text-amber-950"
      : territorialStatus === "crítica"
        ? "border-red-300 bg-red-50 text-red-950"
        : "border-semear-green/15 bg-semear-offwhite text-stone-700";

  return (
    <section className={`rounded-[1.5rem] border p-5 shadow-soft ${toneClass}`}>
      <h2 className="text-lg font-semibold text-semear-green">Nota metodológica territorial</h2>
      <p className="mt-3 text-sm leading-7">{methodologyNote ?? "Nota metodológica ainda não disponível para este recorte."}</p>
      {territorialStatus === "atenção" ? (
        <p className="mt-3 rounded-xl border border-amber-300 bg-white/60 px-3 py-2 text-sm font-medium">
          Leitura parcial: há variação de cobertura territorial neste recorte.
        </p>
      ) : null}
      {territorialStatus === "crítica" ? (
        <p className="mt-3 rounded-xl border border-red-300 bg-white/70 px-3 py-2 text-sm font-medium">
          Cautela metodológica: cobertura territorial crítica. Leia os resultados como tendência agregada, sem generalização ampla.
        </p>
      ) : null}
      {territorialStatus === "crítica" && institutionalJustification ? (
        <p className="mt-3 rounded-xl border border-red-300 bg-white/70 px-3 py-2 text-sm">
          Justificativa institucional: {institutionalJustification}
        </p>
      ) : null}
    </section>
  );
}
