type ThemeItem = { theme?: string; count?: number };

type ThemesProps = {
  themes: ThemeItem[];
};

export function PublicTransparencyThemes({ themes }: ThemesProps) {
  return (
    <section className="rounded-[1.5rem] border border-semear-green/10 bg-white p-5 shadow-soft">
      <h2 className="text-lg font-semibold text-semear-green">Temas mais citados</h2>
      <div className="mt-3 space-y-2">
        {themes.length === 0 ? <p className="text-sm text-stone-600">Temas públicos ainda não disponíveis para este recorte.</p> : null}
        {themes.slice(0, 10).map((item, index) => (
          <p className="rounded-xl bg-semear-offwhite px-3 py-2 text-sm text-stone-700" key={`${item.theme ?? "tema"}-${index}`}>
            <strong className="text-semear-green">{item.theme ?? "Tema não informado"}</strong> ({item.count ?? 0})
          </p>
        ))}
      </div>
    </section>
  );
}
