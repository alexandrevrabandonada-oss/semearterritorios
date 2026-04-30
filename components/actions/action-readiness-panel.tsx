"use client";

import { Activity, CheckCircle2 } from "lucide-react";
import { getActionPilotMetrics, getActionReadiness, type ListeningRecordForPilot } from "@/lib/action-pilot";

type Props = {
  records: ListeningRecordForPilot[];
};

export function ActionReadinessPanel({ records }: Props) {
  const metrics = getActionPilotMetrics(records);
  const status = getActionReadiness(records);
  const reviewedPercent = metrics.total > 0 ? Math.round((metrics.reviewed / metrics.total) * 100) : 0;

  return (
    <section className="rounded-[2rem] border border-semear-green/15 bg-white p-6 shadow-soft">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-semear-earth">
            Prontidão da ação
          </p>
          <h3 className="mt-2 text-2xl font-semibold text-semear-green">{status}</h3>
        </div>
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-semear-green-soft text-semear-green">
          <Activity className="h-5 w-5" aria-hidden="true" />
        </div>
      </div>

      <div className="mt-5 h-3 overflow-hidden rounded-full bg-semear-gray">
        <div className="h-full rounded-full bg-semear-green" style={{ width: `${reviewedPercent}%` }} />
      </div>
      <p className="mt-2 text-sm text-stone-600">{reviewedPercent}% das escutas revisadas.</p>

      <div className="mt-5 grid gap-3 sm:grid-cols-3">
        <Metric label="Digitadas" value={metrics.total} />
        <Metric label="Rascunhos" value={metrics.draft} />
        <Metric label="Revisadas" value={metrics.reviewed} />
      </div>

      <div className="mt-5 rounded-2xl border border-dashed border-semear-green/20 bg-semear-offwhite p-4 text-sm leading-6 text-stone-700">
        <CheckCircle2 className="mr-2 inline h-4 w-4 text-semear-green" aria-hidden="true" />
        O indicador orienta a operação, mas não bloqueia digitação, revisão, síntese ou relatório.
      </div>
    </section>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl border border-semear-gray bg-semear-offwhite p-4">
      <p className="text-xs font-semibold uppercase tracking-[0.12em] text-stone-500">{label}</p>
      <strong className="mt-2 block text-2xl font-semibold text-semear-green">{value}</strong>
    </div>
  );
}
