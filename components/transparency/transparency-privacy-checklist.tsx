"use client";

import { AlertTriangle, CheckCircle2, ShieldCheck } from "lucide-react";
import type { TransparencyChecklistState, TransparencyRiskReport } from "@/lib/transparency-privacy";
import { getTransparencyChecklistItems, isTransparencyChecklistComplete } from "@/lib/transparency-privacy";

export function TransparencyPrivacyChecklist({
  checklist,
  disabled = false,
  riskReport,
  canPublishReview,
  onChange
}: {
  checklist: TransparencyChecklistState;
  disabled?: boolean;
  riskReport: TransparencyRiskReport;
  canPublishReview: boolean;
  onChange: (next: TransparencyChecklistState) => void;
}) {
  const complete = isTransparencyChecklistComplete(checklist);
  const items = getTransparencyChecklistItems();

  function update(key: keyof TransparencyChecklistState, checked: boolean) {
    onChange({ ...checklist, [key]: checked });
  }

  return (
    <section className="rounded-[2rem] border border-white/80 bg-white p-5 shadow-soft">
      <div className="mb-4 flex items-center gap-3 text-semear-green">
        <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-semear-green-soft">
          <ShieldCheck className="h-5 w-5" />
        </div>
        <div>
          <h3 className="font-semibold">Checklist de privacidade</h3>
          <p className="text-xs text-stone-500">A publicação fica bloqueada enquanto houver item obrigatório pendente ou risco bloqueante.</p>
        </div>
      </div>

      <div className="space-y-2">
        {items.map((item) => (
          <label className="flex items-start gap-3 rounded-2xl border border-semear-gray bg-semear-offwhite px-4 py-3 text-sm text-stone-700" key={item.key}>
            <input checked={checklist[item.key]} className="mt-1 h-4 w-4 accent-semear-green" disabled={disabled} onChange={(event) => update(item.key, event.target.checked)} type="checkbox" />
            <span>{item.label}</span>
          </label>
        ))}
      </div>

      {!canPublishReview ? (
        <AlertBox tone="warning">A revisão final e a publicação só podem ser concluídas por coordenação ou admin.</AlertBox>
      ) : null}
      {riskReport.hasBlockingRisk ? (
        <AlertBox tone="error">Possível dado identificável. Revise antes de publicar.</AlertBox>
      ) : null}
      {riskReport.hasWarningRisk ? (
        <AlertBox tone="warning">Há alertas que não bloqueiam sozinhos, mas exigem revisão humana.</AlertBox>
      ) : null}
      {complete && !riskReport.hasBlockingRisk ? (
        <AlertBox tone="success">Checklist obrigatório completo para seguir à aprovação e publicação.</AlertBox>
      ) : null}
    </section>
  );
}

function AlertBox({ children, tone }: { children: React.ReactNode; tone: "error" | "warning" | "success" }) {
  const className = tone === "error"
    ? "mt-4 border-red-200 bg-red-50 text-red-800"
    : tone === "warning"
      ? "mt-4 border-amber-200 bg-amber-50 text-amber-900"
      : "mt-4 border-green-200 bg-green-50 text-green-800";

  const icon = tone === "error"
    ? <AlertTriangle className="h-4 w-4" />
    : tone === "warning"
      ? <AlertTriangle className="h-4 w-4" />
      : <CheckCircle2 className="h-4 w-4" />;

  return <div className={`flex items-start gap-2 rounded-xl border px-3 py-2 text-sm ${className}`}>{icon}<span>{children}</span></div>;
}
