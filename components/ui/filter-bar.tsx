import { X } from "lucide-react";
import type { ReactNode } from "react";

type FilterBarProps = {
  title?: string;
  children: ReactNode;
  onClear?: () => void;
};

export function FilterBar({ title = "Filtros", children, onClear }: FilterBarProps) {
  return (
    <section className="rounded-3xl border border-white/60 bg-white/80 p-4 shadow-premium-md backdrop-blur-md transition-all duration-300">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div className="min-w-0 flex-1">
          <p className="mb-2.5 text-xs font-bold uppercase tracking-[0.18em] text-stone-500">{title}</p>
          <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">{children}</div>
        </div>
        {onClear ? (
          <button
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-white/60 bg-white px-4 text-sm font-bold text-semear-green shadow-premium-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-premium-md hover:bg-stone-50 active:scale-[0.98] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-semear-green"
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
  "min-h-11 w-full rounded-xl border border-stone-200 bg-white/90 px-3 text-sm font-semibold text-stone-700 outline-none transition-all duration-200 shadow-premium-sm focus:border-semear-green focus:ring-1 focus:ring-semear-green";
