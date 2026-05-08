import { Suspense } from "react";
import { AppShell } from "@/components/app-shell";
import { TeamCalendarEventForm } from "@/components/agenda/team-calendar-event-form";

export default function NovaAgendaPage() {
  return (
    <AppShell activeHref="/agenda">
      <Suspense fallback={<section className="rounded-[2rem] border border-white/80 bg-white/72 p-8 text-sm text-stone-600 shadow-soft">Carregando formulário da agenda...</section>}>
        <TeamCalendarEventForm />
      </Suspense>
    </AppShell>
  );
}
