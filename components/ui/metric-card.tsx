import type { ReactNode } from "react";

type MetricCardProps = {
  icon: ReactNode;
  label: string;
  value: string | number;
  note?: string;
  tone?: "green" | "yellow" | "earth";
};

const toneClasses = {
  green: "bg-semear-green text-white",
  yellow: "bg-semear-yellow text-semear-green",
  earth: "bg-semear-earth text-white"
};

export function MetricCard({ icon, label, value, note, tone = "green" }: MetricCardProps) {
  return (
    <article className="rounded-2xl border border-semear-gray/80 bg-white p-5 shadow-[0_12px_30px_rgba(23,74,55,0.07)]">
      <div className="flex items-center gap-4">
        <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full ${toneClasses[tone]}`}>{icon}</div>
        <div className="min-w-0">
          <p className="text-sm text-stone-600">{label}</p>
          <strong className="mt-1 block text-3xl font-semibold tracking-tight text-semear-green">{value}</strong>
          {note ? <p className="mt-1 text-xs text-stone-500">{note}</p> : null}
        </div>
      </div>
    </article>
  );
}
