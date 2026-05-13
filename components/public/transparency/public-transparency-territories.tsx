type TerritoryItem = {
  territory?: string;
  reviewed_records?: number;
  respondent_records?: number;
  action_records?: number;
  action_count?: number;
  public_status?: string;
};

type TerritoriesProps = {
  actionTerritories: TerritoryItem[];
  respondentTerritories: TerritoryItem[];
};

function TerritoryList({ items, emptyText }: { items: TerritoryItem[]; emptyText: string }) {
  if (items.length === 0) return <p className="text-sm text-stone-600">{emptyText}</p>;
  return (
    <div className="space-y-2">
      {items.slice(0, 12).map((item) => (
        <article className="rounded-xl border border-semear-green/10 bg-semear-offwhite p-3" key={`${item.territory}-${item.reviewed_records ?? 0}`}>
          <p className="font-semibold text-semear-green">{item.territory ?? "Território não informado"}</p>
          <p className="mt-1 text-xs text-stone-700">
            {item.action_count ?? 0} ação(ões) · {item.action_records ?? item.reviewed_records ?? 0} escuta(s) revisada(s)
          </p>
          {item.public_status ? <p className="mt-1 text-xs text-stone-500">{item.public_status}</p> : null}
        </article>
      ))}
    </div>
  );
}

export function PublicTransparencyTerritories({ actionTerritories, respondentTerritories }: TerritoriesProps) {
  return (
    <section className="grid gap-4 lg:grid-cols-2">
      <div className="rounded-[1.5rem] border border-semear-green/10 bg-white p-5 shadow-soft">
        <h2 className="text-lg font-semibold text-semear-green">Onde realizamos ações</h2>
        <div className="mt-3">
          <TerritoryList items={actionTerritories} emptyText="Territórios de ação ainda não disponíveis para este recorte." />
        </div>
      </div>
      <div className="rounded-[1.5rem] border border-semear-green/10 bg-white p-5 shadow-soft">
        <h2 className="text-lg font-semibold text-semear-green">De onde vêm as pessoas escutadas</h2>
        <div className="mt-3">
          <TerritoryList items={respondentTerritories} emptyText="Territórios de referência ainda não disponíveis para este recorte." />
        </div>
      </div>
    </section>
  );
}
