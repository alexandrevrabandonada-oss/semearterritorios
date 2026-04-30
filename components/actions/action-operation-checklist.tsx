"use client";

import { CheckCircle2, Circle } from "lucide-react";
import type { ActionForPilot, ListeningRecordForPilot } from "@/lib/action-pilot";
import { getActionPilotMetrics } from "@/lib/action-pilot";

type Props = {
  action: ActionForPilot;
  records: ListeningRecordForPilot[];
};

export function ActionOperationChecklist({ action, records }: Props) {
  const metrics = getActionPilotMetrics(records);
  const hasSynthesis = metrics.total > 0;
  const qualityResolved =
    metrics.total > 0 &&
    metrics.withoutTheme === 0 &&
    metrics.withoutSummary === 0 &&
    metrics.withoutPriority === 0 &&
    metrics.possibleSensitive === 0;

  const items = [
    { label: "ação cadastrada", done: Boolean(action.id) },
    { label: "bairro definido", done: Boolean(action.neighborhood_id) },
    { label: "data definida", done: Boolean(action.action_date) },
    { label: "equipe registrada", done: Boolean(action.team?.trim()) },
    { label: "fichas digitadas", done: metrics.total > 0 },
    { label: "escutas revisadas", done: metrics.reviewed > 0 },
    { label: "síntese da ação gerada", done: hasSynthesis },
    { label: "pendências de qualidade resolvidas", done: qualityResolved },
    { label: "relatório/devolutiva pronta", done: metrics.total > 0 && metrics.reviewed === metrics.total }
  ];

  return (
    <section className="rounded-[2rem] border border-white/80 bg-white p-6 shadow-soft">
      <p className="text-sm font-semibold uppercase tracking-[0.18em] text-semear-earth">
        Checklist de operação da banca
      </p>
      <div className="mt-5 grid gap-3 md:grid-cols-2">
        {items.map((item) => (
          <div className="flex items-center gap-3 rounded-2xl border border-semear-gray bg-semear-offwhite p-3 text-sm" key={item.label}>
            {item.done ? (
              <CheckCircle2 className="h-5 w-5 shrink-0 text-green-600" aria-hidden="true" />
            ) : (
              <Circle className="h-5 w-5 shrink-0 text-stone-400" aria-hidden="true" />
            )}
            <span className={item.done ? "font-semibold text-semear-green" : "text-stone-600"}>{item.label}</span>
          </div>
        ))}
      </div>
    </section>
  );
}
