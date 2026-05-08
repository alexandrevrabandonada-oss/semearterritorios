import Link from "next/link";
import { AlertTriangle, CalendarClock } from "lucide-react";

export type InternalReminderItem = {
  label: string;
  value: number;
  text: string;
  href?: string;
  tone?: "default" | "warning" | "danger";
};

export function InternalRemindersPanel({
  title = "Lembretes internos",
  description,
  items,
}: {
  title?: string;
  description?: string;
  items: InternalReminderItem[];
}) {
  return (
    <section className="rounded-[2rem] border border-white/80 bg-white p-5 shadow-soft">
      <div className="flex items-center gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-full bg-semear-green-soft text-semear-green">
          <CalendarClock className="h-5 w-5" aria-hidden="true" />
        </div>
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-semear-earth">Alertas visuais</p>
          <h3 className="text-xl font-semibold text-semear-green">{title}</h3>
        </div>
      </div>
      {description ? <p className="mt-3 text-sm leading-6 text-stone-600">{description}</p> : null}
      <div className="mt-4 space-y-3">
        {items.map((item) => (
          <article className={`rounded-2xl border p-4 ${getToneClassName(item.tone)}`} key={item.label}>
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                {item.tone === "danger" ? <AlertTriangle className="h-4 w-4 text-red-700" aria-hidden="true" /> : null}
                <p className="font-semibold text-semear-green">{item.label}</p>
              </div>
              <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-semear-earth">{item.value}</span>
            </div>
            <p className="mt-2 text-sm leading-6 text-stone-700">{item.text}</p>
            {item.href ? (
              <Link className="mt-3 inline-flex min-h-10 items-center justify-center rounded-full border border-semear-green/15 bg-white px-4 text-sm font-semibold text-semear-green" href={item.href}>
                Abrir
              </Link>
            ) : null}
          </article>
        ))}
      </div>
    </section>
  );
}

function getToneClassName(tone: InternalReminderItem["tone"]) {
  if (tone === "danger") return "border-red-200 bg-red-50";
  if (tone === "warning") return "border-amber-200 bg-amber-50";
  return "border-semear-gray bg-semear-offwhite";
}
