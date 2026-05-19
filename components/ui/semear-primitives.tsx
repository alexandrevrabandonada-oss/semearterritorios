import Link from "next/link";
import type { AnchorHTMLAttributes, ButtonHTMLAttributes, ReactNode } from "react";

type Tone = "neutral" | "green" | "yellow" | "earth" | "red" | "blue";

export function SemearPageHeader({
  eyebrow,
  title,
  description,
  actions,
  meta,
  filters
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  actions?: ReactNode;
  meta?: ReactNode;
  filters?: ReactNode;
}) {
  return (
    <header className="mb-6 rounded-3xl border border-white/60 bg-white/80 p-6 shadow-premium-md backdrop-blur-md sm:p-8">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          {eyebrow ? (
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-semear-earth/90">
              {eyebrow}
            </p>
          ) : null}
          <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-semear-green sm:text-4xl">
            {title}
          </h1>
          {description ? (
            <p className="mt-3 max-w-3xl text-sm leading-relaxed text-stone-600">
              {description}
            </p>
          ) : null}
          {meta ? <div className="mt-4 flex flex-wrap gap-2">{meta}</div> : null}
        </div>
        {actions ? (
          <div className="no-print flex shrink-0 flex-wrap gap-2">{actions}</div>
        ) : null}
      </div>
      {filters ? (
        <div className="mt-6 flex flex-wrap gap-2 border-t border-stone-200/50 pt-5">
          {filters}
        </div>
      ) : null}
    </header>
  );
}

export function SemearCard({
  children,
  className = "",
  as: Component = "section"
}: {
  children: ReactNode;
  className?: string;
  as?: "section" | "article" | "div" | "aside";
}) {
  return (
    <Component
      className={`rounded-3xl border border-white/60 bg-white/80 p-5 shadow-premium-md backdrop-blur-md transition-all duration-300 hover:-translate-y-0.5 hover:shadow-premium-lg ${className}`}
    >
      {children}
    </Component>
  );
}

export function SemearSection({
  title,
  eyebrow,
  children,
  aside
}: {
  title: string;
  eyebrow?: string;
  children: ReactNode;
  aside?: ReactNode;
}) {
  return (
    <SemearCard>
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          {eyebrow ? (
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-semear-earth">
              {eyebrow}
            </p>
          ) : null}
          <h2 className="mt-1 text-xl font-bold text-semear-green">{title}</h2>
        </div>
        {aside}
      </div>
      {children}
    </SemearCard>
  );
}

export function SemearMetricCard({
  label,
  value,
  note,
  icon,
  tone = "green"
}: {
  label: string;
  value: ReactNode;
  note?: string;
  icon?: ReactNode;
  tone?: Tone;
}) {
  const tones = toneClasses(tone);
  return (
    <article
      className={`rounded-3xl border border-white/60 bg-white/80 p-5 shadow-premium-md backdrop-blur-md transition-all duration-300 hover:-translate-y-0.5 hover:shadow-premium-lg hover:ring-1 hover:ring-semear-green/5`}
    >
      <div className="flex items-start gap-4">
        {icon ? (
          <div
            className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl transition-all duration-300 group-hover:scale-110 ${tones.icon}`}
          >
            {icon}
          </div>
        ) : null}
        <div className="min-w-0 flex-1">
          <p className="text-xs font-bold uppercase tracking-wider text-stone-500">{label}</p>
          <strong className="mt-1 block text-3xl font-extrabold tracking-tight text-stone-900">
            {value}
          </strong>
          {note ? (
            <p className="mt-2 text-xs font-medium leading-relaxed text-stone-400">{note}</p>
          ) : null}
        </div>
      </div>
    </article>
  );
}

export function SemearAlert({
  children,
  tone = "yellow"
}: {
  children: ReactNode;
  tone?: Tone;
}) {
  return (
    <div
      className={`rounded-xl border px-4 py-3 text-sm leading-relaxed shadow-premium-sm backdrop-blur-sm ${
        toneClasses(tone).alert
      }`}
    >
      {children}
    </div>
  );
}

export function SemearStatusBadge({
  children,
  tone = "neutral"
}: {
  children: ReactNode;
  tone?: Tone;
}) {
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
        toneClasses(tone).badge
      }`}
    >
      {children}
    </span>
  );
}

export function SemearButton({
  children,
  href,
  variant = "secondary",
  className = "",
  ...props
}: {
  children: ReactNode;
  href?: string;
  variant?: "primary" | "secondary" | "dark" | "danger" | "ghost";
  className?: string;
} & ButtonHTMLAttributes<HTMLButtonElement> &
  AnchorHTMLAttributes<HTMLAnchorElement>) {
  const classes = `inline-flex min-h-11 items-center justify-center gap-2 rounded-full px-5 text-sm font-bold transition-all duration-200 active:scale-[0.98] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-semear-green disabled:opacity-60 disabled:pointer-events-none ${buttonClasses[variant]} ${className}`;
  if (href) {
    return (
      <Link className={classes} href={href} {...(props as any)}>
        {children}
      </Link>
    );
  }
  return (
    <button className={classes} type="button" {...(props as any)}>
      {children}
    </button>
  );
}

export function SemearFilterBar({
  children,
  title = "Filtros",
  onClear
}: {
  children: ReactNode;
  title?: string;
  onClear?: () => void;
}) {
  return (
    <SemearCard className="p-4 shadow-premium-sm">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="text-xs font-bold uppercase tracking-[0.16em] text-semear-green">
          {title}
        </h2>
        {onClear ? (
          <button
            className="text-xs font-bold text-semear-earth transition hover:text-semear-earth/80 active:scale-95"
            onClick={onClear}
            type="button"
          >
            Limpar tudo
          </button>
        ) : null}
      </div>
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">{children}</div>
    </SemearCard>
  );
}

export const semearControlClassName =
  "mt-2 min-h-11 w-full rounded-xl border border-stone-200 bg-white/90 px-3 text-sm font-semibold text-stone-700 outline-none shadow-premium-sm transition-all duration-200 focus:border-semear-green focus:ring-1 focus:ring-semear-green";

export function SemearDataList({
  items,
  emptyText,
  renderItem
}: {
  items: unknown[];
  emptyText: string;
  renderItem: (item: any, index: number) => ReactNode;
}) {
  if (items.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-stone-200 bg-white/60 px-4 py-8 text-center text-sm font-medium text-stone-400">
        {emptyText}
      </div>
    );
  }
  return <div className="space-y-3">{items.map((item, index) => renderItem(item, index))}</div>;
}

const buttonClasses = {
  primary:
    "bg-semear-yellow text-semear-green shadow-premium-sm hover:bg-semear-yellow/95 hover:shadow-premium-md hover:-translate-y-0.5 active:scale-[0.98]",
  secondary:
    "border border-white/60 bg-white/80 backdrop-blur-sm text-semear-green shadow-premium-sm hover:bg-stone-50 hover:-translate-y-0.5 hover:shadow-premium-md hover:border-semear-green/30 active:scale-[0.98]",
  dark: "bg-stone-900 text-white shadow-premium-sm hover:bg-stone-800 hover:-translate-y-0.5 active:scale-[0.98]",
  danger:
    "border border-red-200 bg-red-50 text-red-800 shadow-premium-sm hover:bg-red-100 hover:-translate-y-0.5 active:scale-[0.98]",
  ghost: "bg-transparent text-semear-green hover:bg-semear-green-soft/40 active:scale-[0.98]"
};

function toneClasses(tone: Tone) {
  const map = {
    neutral: {
      badge: "bg-stone-50 border-stone-200 text-stone-600",
      alert: "border-stone-200/60 bg-white/85 text-stone-600",
      icon: "bg-stone-50 text-stone-500"
    },
    green: {
      badge: "bg-green-50 border-green-200/50 text-green-700",
      alert: "border-green-200/40 bg-green-50/70 text-green-900",
      icon: "bg-semear-green-soft text-semear-green"
    },
    yellow: {
      badge: "bg-amber-50 border-amber-200/50 text-amber-700",
      alert: "border-semear-yellow/30 bg-amber-50/60 text-semear-950",
      icon: "bg-semear-yellow/30 text-semear-green"
    },
    earth: {
      badge: "bg-orange-50 border-orange-200/50 text-orange-700",
      alert: "border-semear-earth/20 bg-orange-50/50 text-orange-950",
      icon: "bg-semear-earth/10 text-semear-earth"
    },
    red: {
      badge: "bg-red-50 border-red-200/50 text-red-700",
      alert: "border-red-200/40 bg-red-50/70 text-red-950",
      icon: "bg-red-50 text-red-600"
    },
    blue: {
      badge: "bg-blue-50 border-blue-200/50 text-blue-700",
      alert: "border-blue-200/40 bg-blue-50/70 text-blue-950",
      icon: "bg-blue-50 text-blue-600"
    }
  };
  return map[tone];
}
