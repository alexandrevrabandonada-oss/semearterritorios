"use client";

import { Copy, Lightbulb } from "lucide-react";
import { buildPostActionDecisionText, getPostActionDecision } from "@/lib/post-action-decision";
import type { ActionForPilot } from "@/lib/action-pilot";
import type { TerritorialReviewRecord } from "@/lib/territorial-review";
import type { ActionClosure, ActionDebrief } from "@/lib/database.types";

type Props = {
  action: ActionForPilot;
  records: TerritorialReviewRecord[];
  territoryCount: number;
  debrief: ActionDebrief | null;
  closure: ActionClosure | null;
  onCopied: (message: string) => void;
};

export function PostActionDecisionPanel({ action, records, territoryCount, debrief, closure, onCopied }: Props) {
  const decision = getPostActionDecision({ records, territoryCount, debrief, closure });
  const tone =
    decision.severity === "blocker"
      ? "border-red-200 bg-red-50 text-red-900"
      : decision.severity === "warning"
        ? "border-amber-200 bg-amber-50 text-amber-950"
        : "border-green-200 bg-green-50 text-green-900";

  async function copyDecision() {
    await navigator.clipboard.writeText(buildPostActionDecisionText({ action, records, territoryCount, debrief, closure }));
    onCopied("Decisão pós-banca copiada.");
  }

  return (
    <section className={`rounded-[2rem] border p-6 shadow-soft ${tone}`}>
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="flex gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white/70">
            <Lightbulb className="h-5 w-5" aria-hidden="true" />
          </div>
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.18em]">Decisão formal do próximo passo</p>
            <h3 className="mt-2 text-2xl font-semibold">{decision.recommendation}</h3>
            <p className="mt-3 text-sm leading-6">{decision.justification}</p>
            <p className="mt-3 text-sm font-semibold leading-6">Próximo passo: {decision.nextStep}</p>
          </div>
        </div>
        <button className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-white px-4 text-sm font-semibold text-semear-green" onClick={() => void copyDecision()} type="button">
          <Copy className="h-4 w-4" aria-hidden="true" />
          Copiar decisão pós-banca
        </button>
      </div>
    </section>
  );
}
