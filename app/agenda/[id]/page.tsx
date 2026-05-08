import { Suspense } from "react";
import { AppShell } from "@/components/app-shell";
import { TeamCalendarEventDetail } from "@/components/agenda/team-calendar-event-detail";
import { TeamCalendarEventForm } from "@/components/agenda/team-calendar-event-form";

type AgendaDetalhePageProps = {
  params: {
    id: string;
  };
  searchParams?: {
    editar?: string;
  };
};

export default function AgendaDetalhePage({ params, searchParams }: AgendaDetalhePageProps) {
  const editing = searchParams?.editar === "1";

  return (
    <AppShell activeHref="/agenda">
      {editing ? (
        <Suspense fallback={<section className="rounded-[2rem] border border-white/80 bg-white/72 p-8 text-sm text-stone-600 shadow-soft">Carregando formulário da agenda...</section>}>
          <TeamCalendarEventForm eventId={params.id} />
        </Suspense>
      ) : (
        <TeamCalendarEventDetail eventId={params.id} />
      )}
    </AppShell>
  );
}
