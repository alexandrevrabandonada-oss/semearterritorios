import Link from "next/link";

export type TerritorialQualityByActionItem = {
  actionId: string;
  actionTitle: string;
  actionDate: string;
  actionNeighborhood: string;
  totalRecords: number;
  recordsWithoutRespondentTerritory: number;
  coveragePercent: number;
  status: "boa" | "atenção" | "crítica";
};

export function TerritorialQualityByAction({ items }: { items: TerritorialQualityByActionItem[] }) {
  if (items.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-semear-green/25 bg-semear-offwhite p-4 text-sm leading-6 text-stone-600">
        Nenhuma ação com cobertura territorial baixa no recorte atual.
      </div>
    );
  }

  return (
    <div className="grid gap-3 md:grid-cols-2">
      {items.map((item) => (
        <article className="rounded-xl border border-semear-gray bg-white p-4" key={item.actionId}>
          <div className="flex items-start justify-between gap-3">
            <div>
              <h4 className="font-semibold text-semear-green">{item.actionTitle}</h4>
              <p className="mt-1 text-xs text-stone-500">
                {formatDate(item.actionDate)} · {item.actionNeighborhood}
              </p>
            </div>
            <span className={`rounded-full px-3 py-1 text-xs font-semibold ${statusClassName(item.status)}`}>
              {statusLabel(item.status)}
            </span>
          </div>

          <div className="mt-3 grid grid-cols-3 gap-2 text-xs">
            <Metric label="Cobertura" value={`${item.coveragePercent}%`} />
            <Metric label="Escutas" value={item.totalRecords.toString()} />
            <Metric label="Sem território" value={item.recordsWithoutRespondentTerritory.toString()} />
          </div>

          <p className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-medium text-amber-900">
            Esta ação precisa de revisão territorial antes de gerar leitura por bairro.
          </p>

          <div className="mt-3 flex flex-wrap gap-2">
            <Link
              className="inline-flex min-h-10 items-center rounded-lg border border-semear-green/20 bg-white px-3 text-xs font-semibold text-semear-green"
              href={`/pos-banca?actionId=${item.actionId}`}
            >
              Abrir pós-banca
            </Link>
            <Link
              className="inline-flex min-h-10 items-center rounded-lg bg-semear-green px-3 text-xs font-semibold text-white"
              href={`/escutas/revisao-territorial?tab=qualidade&actionId=${item.actionId}`}
            >
              Revisar
            </Link>
          </div>
        </article>
      ))}
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-semear-offwhite px-2 py-2">
      <p className="text-stone-500">{label}</p>
      <p className="mt-1 font-semibold text-stone-900">{value}</p>
    </div>
  );
}

function statusLabel(status: TerritorialQualityByActionItem["status"]) {
  if (status === "crítica") return "Crítica";
  if (status === "atenção") return "Atenção";
  return "Boa";
}

function statusClassName(status: TerritorialQualityByActionItem["status"]) {
  if (status === "crítica") return "bg-red-50 text-red-800";
  if (status === "atenção") return "bg-amber-50 text-amber-900";
  return "bg-green-50 text-green-800";
}

function formatDate(value: string) {
  return new Date(`${value}T00:00:00`).toLocaleDateString("pt-BR");
}
