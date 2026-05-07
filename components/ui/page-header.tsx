import type { ReactNode } from "react";

type PageHeaderProps = {
  eyebrow?: string;
  title: string;
  description?: string;
  actions?: ReactNode;
  filters?: ReactNode;
};

export function PageHeader({ eyebrow, title, description, actions, filters }: PageHeaderProps) {
  return (
    <header className="mb-5 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
      <div className="min-w-0">
        {eyebrow ? (
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-semear-earth">{eyebrow}</p>
        ) : null}
        <h2 className="mt-1 text-3xl font-semibold tracking-tight text-semear-green sm:text-4xl">{title}</h2>
        {description ? <p className="mt-2 max-w-3xl text-sm leading-6 text-stone-600">{description}</p> : null}
      </div>
      {actions || filters ? (
        <div className="flex flex-col gap-3 lg:items-end">
          {filters ? <div className="flex flex-wrap gap-2">{filters}</div> : null}
          {actions ? <div className="flex flex-wrap gap-2">{actions}</div> : null}
        </div>
      ) : null}
    </header>
  );
}
