"use client";

import { ShieldCheck } from "lucide-react";
import {
  getHomologationChecklistItems,
  isHomologationChecklistComplete,
  type HomologationChecklistState
} from "@/lib/transparency-homologation";
import type { PublicTransparencySnapshotStatus } from "@/lib/database.types";

type TransparencyHomologationChecklistProps = {
  checklist: HomologationChecklistState;
  disabled?: boolean;
  canValidate?: boolean;
  snapshotStatus?: PublicTransparencySnapshotStatus | null;
  onChange: (next: HomologationChecklistState) => void;
};

export function TransparencyHomologationChecklist({
  checklist,
  disabled = false,
  canValidate = false,
  snapshotStatus,
  onChange
}: TransparencyHomologationChecklistProps) {
  const complete = isHomologationChecklistComplete(checklist, snapshotStatus);

  return (
    <section className="rounded-[2rem] border border-white/80 bg-white p-5 shadow-soft">
      <div className="mb-4 flex items-center gap-3 text-semear-green">
        <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-semear-green-soft">
          <ShieldCheck className="h-5 w-5" />
        </div>
        <div>
          <h3 className="font-semibold">Checklist multi-etapa</h3>
          <p className="text-sm text-stone-500">
            A assinatura institucional só é liberada quando as etapas obrigatórias estiverem completas.
          </p>
        </div>
      </div>

      <div className="space-y-3">
        {getHomologationChecklistItems().map((item) => {
          const optionalForApproved = item.key === "public_api_checked" && snapshotStatus !== "published";
          return (
            <label className="flex items-start gap-3 rounded-2xl border border-semear-gray bg-semear-offwhite px-4 py-3" key={item.key}>
              <input
                checked={checklist[item.key]}
                className="mt-1 h-4 w-4 rounded border-semear-gray text-semear-green focus:ring-semear-green"
                disabled={disabled || (item.key === "validated_by_coordination" && !canValidate)}
                onChange={(event) => onChange({ ...checklist, [item.key]: event.target.checked })}
                type="checkbox"
              />
              <span className="text-sm leading-6 text-stone-700">
                {item.label}
                {optionalForApproved ? <span className="ml-2 text-xs text-stone-500">(opcional antes de publicar)</span> : null}
              </span>
            </label>
          );
        })}
      </div>

      <div className={`mt-4 rounded-2xl px-4 py-3 text-sm ${complete ? "border border-green-200 bg-green-50 text-green-800" : "border border-amber-200 bg-amber-50 text-amber-900"}`}>
        {complete
          ? "Checklist institucional completo para assinatura."
          : "Ainda há etapas pendentes antes da assinatura institucional."}
      </div>
    </section>
  );
}
