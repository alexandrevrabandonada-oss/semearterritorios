import { AppShell } from "@/components/app-shell";
import { NotificationPreferencesPage } from "@/components/notifications/notification-preferences-page";

export default function AvisosPreferenciasPage() {
  return (
    <AppShell activeHref="/avisos/preferencias">
      <NotificationPreferencesPage />
    </AppShell>
  );
}
