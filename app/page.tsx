import { AppShell } from "@/components/app-shell";
import { Dashboard } from "@/components/dashboard";

export default function DashboardPage() {
  return (
    <AppShell activeHref="/">
      <Dashboard />
    </AppShell>
  );
}
