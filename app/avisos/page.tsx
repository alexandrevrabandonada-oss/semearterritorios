import { AppShell } from "@/components/app-shell";
import { NotificationsCenterPage } from "@/components/notifications/notifications-center-page";

export default function AvisosPage() {
  return (
    <AppShell activeHref="/avisos">
      <NotificationsCenterPage />
    </AppShell>
  );
}
