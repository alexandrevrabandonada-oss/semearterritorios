import { X } from "lucide-react";
import type { ReactNode } from "react";

type FilterBarProps = {
  title?: string;
  children: ReactNode;
  onClear?: () => void;
};

export function FilterBar({ title = "Filtros", children, onClear }: FilterBarProps) {
  return (
    <section className="rounded-2xl border border-semear-gray/80 bg-white p-3 shadow-[0_10px_24px_rgba(23,74,55,0.05)]">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div className="min-w-0 flex-1">
          <p className="mb-2 text-xs font-semibold uppercase tracking-[0.16em] text-stone-500">{title}</p>
          <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">{children}</div>
        </div>
        {onClear ? (
          <button
            className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-semear-green/15 bg-white px-3 text-sm font-semibold text-semear-green transition hover:bg-semear-green-soft focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-semear-green"
            onClick={onClear}
            type="button"
          >
            <X className="h-4 w-4" aria-hidden="true" />
            Limpar filtros
          </button>
        ) : null}
      </div>
    </section>
  );
}

type FilterFieldProps = {
  label: string;
  children: ReactNode;
};

export function FilterField({ label, children }: FilterFieldProps) {
  return (
    <label>
      <span className="sr-only">{label}</span>
      {children}
    </label>
  );
}

export const filterControlClassName =
  "min-h-11 w-full rounded-xl border border-semear-gray bg-white px-3 text-sm font-medium text-stone-700 outline-none transition focus:border-semear-green focus:ring-2 focus:ring-semear-green/15";
