import { AppShell } from "@/components/app-shell";
import { MonthlyReportsHub } from "@/components/reports/monthly-reports-hub";

export default function RelatoriosPage() {
  return (
    <AppShell activeHref="/relatorios">
      <MonthlyReportsHub />
    </AppShell>
  );
}
