import { AppShell } from "@/components/app-shell";
import { TeamCalendarPage } from "@/components/agenda/team-calendar-page";

export default function AgendaPage() {
  return (
    <AppShell activeHref="/agenda">
      <TeamCalendarPage />
    </AppShell>
  );
}
