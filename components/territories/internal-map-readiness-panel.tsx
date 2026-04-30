"use client";

import { CheckCircle2, CircleDashed, MapPinned, ShieldAlert } from "lucide-react";
import type { ActionClosure, ActionDebrief, Neighborhood } from "@/lib/database.types";
import { buildInternalMapGoNoGo } from "@/lib/internal-map-scope";
import type { TerritorialReviewRecord } from "@/lib/territorial-review";
import type { NormalizedPlacesQualitySummary } from "@/lib/normalized-places-quality";
import type { InternalMapReadiness } from "@/types/internal-map";

export type InternalMapReadinessResult =
  | "Não pronto"
  | "Quase pronto"
  | "Pronto para desenho técnico"
  | "Pronto para protótipo interno";

type Props = {
  neighborhoods?: Neighborhood[];
  records: TerritorialReviewRecord[];
  territoryCount: number;
  normalizedQuality?: NormalizedPlacesQualitySummary;
  debrief?: ActionDebrief | null;
  closure?: ActionClosure | null;
  actionContext?: boolean;
};

export function InternalMapReadinessPanel({ records, territoryCount, normalizedQuality, debrief, closure, actionContext = false }: Props) {
  const result = getInternalMapReadiness({ records, territoryCount, normalizedQuality, debrief, closure, actionContext });
  const tone = getTone(result.status);

  return (
    <section className={`rounded-[2rem] border p-5 shadow-soft ${tone.container}`}>
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-semear-earth">Prontidão do mapa interno</p>
          <h3 className={`mt-2 text-2xl font-semibold ${tone.title}`}>{result.status}</h3>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-stone-700">
            Este painel orienta a decisão técnica. Não cria mapa, não publica dados e não substitui validação da coordenação.
          </p>
        </div>
        <div className={`flex h-12 w-12 items-center justify-center rounded-2xl ${tone.iconBox}`}>
          {result.status === "Não pronto" ? <ShieldAlert className="h-6 w-6" aria-hidden="true" /> : <MapPinned className="h-6 w-6" aria-hidden="true" />}
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

export function getInternalMapReadiness(input: Props): { status: InternalMapReadinessResult; criteria: Array<{ label: string; detail: string; ok: boolean }> } {
  const neighborhoodIds = input.records.flatMap((record) => record.neighborhood_id ? [record.neighborhood_id] : []);
  const neighborhoods: Neighborhood[] = input.neighborhoods ?? Array.from(new Set(neighborhoodIds)).map((id) => ({
    id,
    name: "Território com dados",
    city: null,
    notes: null,
    created_by: null,
    created_at: "",
    updated_at: ""
  }));
  const goNoGo = buildInternalMapGoNoGo({
    neighborhoods,
    records: input.records,
    normalizedQuality: input.normalizedQuality,
    debrief: input.debrief,
    closure: input.closure,
    actionContext: input.actionContext,
    rlsValidated: true
  });

  const status = mapGoNoGoToReadiness(goNoGo.status, Boolean(input.actionContext));
  return {
    status,
    criteria: goNoGo.criteria
      .filter((criterion) => criterion.category !== "rls")
      .map((criterion) => ({ label: criterion.label, detail: criterion.detail, ok: criterion.ok }))
  };
}

function getTone(status: InternalMapReadinessResult) {
  if (status === "Não pronto") return { container: "border-red-200 bg-red-50", title: "text-red-900", iconBox: "bg-red-100 text-red-900" };
  if (status === "Quase pronto") return { container: "border-amber-200 bg-amber-50", title: "text-amber-950", iconBox: "bg-amber-100 text-amber-900" };
  return { container: "border-semear-green/20 bg-[#edf6df]", title: "text-semear-green", iconBox: "bg-semear-green-soft text-semear-green" };
}

function mapGoNoGoToReadiness(status: InternalMapReadiness, actionContext: boolean): InternalMapReadinessResult {
  if (status.startsWith("NO-GO")) return "Não pronto";
  if (status === "GO: desenho técnico") return "Pronto para desenho técnico";
  return actionContext ? "Pronto para protótipo interno" : "Pronto para desenho técnico";
}
