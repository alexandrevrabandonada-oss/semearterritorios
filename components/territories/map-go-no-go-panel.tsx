"use client";

import { CheckCircle2, CircleDashed, MapPinned, ShieldAlert } from "lucide-react";
import type { ActionClosure, ActionDebrief, Neighborhood } from "@/lib/database.types";
import { buildInternalMapGoNoGo } from "@/lib/internal-map-scope";
import type { NormalizedPlacesQualitySummary } from "@/lib/normalized-places-quality";
import type { TerritorialReviewRecord } from "@/lib/territorial-review";
import type { InternalMapReadiness } from "@/types/internal-map";

type Props = {
  neighborhoods: Neighborhood[];
  records: TerritorialReviewRecord[];
  normalizedQuality?: NormalizedPlacesQualitySummary;
  debrief?: ActionDebrief | null;
  closure?: ActionClosure | null;
  actionContext?: boolean;
  rlsValidated?: boolean;
};

export function MapGoNoGoPanel(props: Props) {
  const result = buildInternalMapGoNoGo(props);
  const tone = getTone(result.status);

  return (
    <section className={`rounded-[2rem] border p-5 shadow-soft ${tone.container}`}>
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-semear-earth">Matriz GO/NO-GO</p>
          <h3 className={`mt-2 text-2xl font-semibold ${tone.title}`}>{result.status}</h3>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-stone-700">
            Critérios para decidir se o próximo passo é apenas desenho técnico ou protótipo interno autenticado. A validação de RLS é manual e deve ser registrada em `docs/decisao-mapa-interno.md`.
          </p>
        </div>
        <div className={`flex h-12 w-12 items-center justify-center rounded-2xl ${tone.iconBox}`}>
          {result.status.startsWith("NO-GO") ? <ShieldAlert className="h-6 w-6" aria-hidden="true" /> : <MapPinned className="h-6 w-6" aria-hidden="true" />}
        </div>
      </div>

      <div className="mt-5 grid gap-3 md:grid-cols-2">
        {result.criteria.map((criterion) => (
          <div className={`flex items-start gap-3 rounded-2xl border p-3 ${criterion.ok ? "border-green-100 bg-green-50 text-green-900" : "border-amber-100 bg-amber-50 text-amber-950"}`} key={criterion.label}>
            {criterion.ok ? <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" /> : <CircleDashed className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />}
            <div>
              <p className="text-sm font-semibold">{criterion.label}</p>
              <p className="mt-1 text-xs leading-5">{criterion.detail}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function getTone(status: InternalMapReadiness) {
  if (status.startsWith("NO-GO")) return { container: "border-red-200 bg-red-50", title: "text-red-900", iconBox: "bg-red-100 text-red-900" };
  if (status === "GO: desenho técnico") return { container: "border-amber-200 bg-amber-50", title: "text-amber-950", iconBox: "bg-amber-100 text-amber-900" };
  return { container: "border-semear-green/20 bg-[#edf6df]", title: "text-semear-green", iconBox: "bg-semear-green-soft text-semear-green" };
}
