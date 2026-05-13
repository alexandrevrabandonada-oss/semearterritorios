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
    <header className="mb-6 rounded-2xl border border-white bg-white p-5 shadow-[0_14px_36px_rgba(23,74,55,0.07)] sm:p-7">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          {eyebrow ? <p className="text-xs font-bold uppercase tracking-[0.18em] text-semear-earth">{eyebrow}</p> : null}
          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-semear-green sm:text-4xl">{title}</h1>
          {description ? <p className="mt-3 max-w-3xl text-sm leading-6 text-stone-600">{description}</p> : null}
          {meta ? <div className="mt-4 flex flex-wrap gap-2">{meta}</div> : null}
        </div>
        {actions ? <div className="no-print flex shrink-0 flex-wrap gap-2">{actions}</div> : null}
      </div>
      {filters ? <div className="mt-5 flex flex-wrap gap-2 border-t border-semear-gray/80 pt-4">{filters}</div> : null}
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
  return <Component className={`rounded-2xl border border-semear-gray/80 bg-white p-5 shadow-[0_12px_30px_rgba(23,74,55,0.06)] ${className}`}>{children}</Component>;
}

export function SemearSection({ title, eyebrow, children, aside }: { title: string; eyebrow?: string; children: ReactNode; aside?: ReactNode }) {
  return (
    <SemearCard>
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          {eyebrow ? <p className="text-xs font-bold uppercase tracking-[0.16em] text-semear-earth">{eyebrow}</p> : null}
          <h2 className="mt-1 text-xl font-semibold text-semear-green">{title}</h2>
        </div>
        {aside}
      </div>
      {children}
    </SemearCard>
  );
}

export function SemearMetricCard({ label, value, note, icon, tone = "green" }: { label: string; value: ReactNode; note?: string; icon?: ReactNode; tone?: Tone }) {
  return (
    <SemearCard as="article" className="p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-stone-500">{label}</p>
          <strong className="mt-2 block text-3xl font-semibold tracking-tight text-semear-green">{value}</strong>
          {note ? <p className="mt-1 text-xs leading-5 text-stone-500">{note}</p> : null}
        </div>
        {icon ? <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${toneClasses(tone).icon}`}>{icon}</div> : null}
      </div>
    </SemearCard>
  );
}

export function SemearAlert({ children, tone = "yellow" }: { children: ReactNode; tone?: Tone }) {
  return <div className={`rounded-2xl border px-4 py-3 text-sm leading-6 ${toneClasses(tone).alert}`}>{children}</div>;
}

export function SemearStatusBadge({ children, tone = "neutral" }: { children: ReactNode; tone?: Tone }) {
  return <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-bold uppercase tracking-[0.1em] ${toneClasses(tone).badge}`}>{children}</span>;
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
} & ButtonHTMLAttributes<HTMLButtonElement> & AnchorHTMLAttributes<HTMLAnchorElement>) {
  const classes = `inline-flex min-h-11 items-center justify-center gap-2 rounded-xl px-4 text-sm font-semibold transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-semear-green disabled:opacity-60 ${buttonClasses[variant]} ${className}`;
  if (href) {
    return <Link className={classes} href={href} {...props}>{children}</Link>;
  }
  return <button className={classes} type="button" {...props}>{children}</button>;
}

export function SemearFilterBar({ children, title = "Filtros", onClear }: { children: ReactNode; title?: string; onClear?: () => void }) {
  return (
    <SemearCard className="p-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h2 className="text-sm font-bold uppercase tracking-[0.16em] text-semear-green">{title}</h2>
        {onClear ? <button className="text-xs font-semibold text-semear-earth" onClick={onClear} type="button">Limpar</button> : null}
      </div>
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">{children}</div>
    </SemearCard>
  );
}

export const semearControlClassName = "mt-2 min-h-11 w-full rounded-xl border border-semear-gray bg-white px-3 text-sm outline-none focus:border-semear-green";

export function SemearDataList({ items, emptyText, renderItem }: { items: unknown[]; emptyText: string; renderItem: (item: any, index: number) => ReactNode }) {
  if (items.length === 0) return <div className="rounded-2xl border border-dashed border-semear-green/25 bg-white px-4 py-5 text-sm text-stone-500">{emptyText}</div>;
  return <div className="space-y-3">{items.map((item, index) => renderItem(item, index))}</div>;
}

const buttonClasses = {
  primary: "bg-semear-green text-white shadow-sm hover:bg-semear-green/92",
  secondary: "border border-semear-green/15 bg-white text-semear-green hover:bg-semear-green-soft/45",
  dark: "bg-stone-900 text-white hover:bg-stone-800",
  danger: "border border-red-200 bg-red-50 text-red-800 hover:bg-red-100",
  ghost: "bg-transparent text-semear-green hover:bg-white"
};

function toneClasses(tone: Tone) {
  const map = {
    neutral: {
      badge: "bg-stone-100 text-stone-700",
      alert: "border-stone-200 bg-white text-stone-700",
      icon: "bg-stone-100 text-stone-700"
    },
    green: {
      badge: "bg-semear-green-soft text-semear-green",
      alert: "border-green-200 bg-green-50 text-green-900",
      icon: "bg-semear-green text-white"
    },
    yellow: {
      badge: "bg-semear-yellow/35 text-semear-green",
      alert: "border-semear-yellow/50 bg-semear-yellow/15 text-semear-green",
      icon: "bg-semear-yellow text-semear-green"
    },
    earth: {
      badge: "bg-semear-earth/10 text-semear-earth",
      alert: "border-semear-earth/20 bg-semear-earth/5 text-semear-earth",
      icon: "bg-semear-earth text-white"
    },
    red: {
      badge: "bg-red-50 text-red-800",
      alert: "border-red-200 bg-red-50 text-red-800",
      icon: "bg-red-50 text-red-800"
    },
    blue: {
      badge: "bg-blue-50 text-blue-800",
      alert: "border-blue-200 bg-blue-50 text-blue-900",
      icon: "bg-blue-50 text-blue-800"
    }
  };
  return map[tone];
}
