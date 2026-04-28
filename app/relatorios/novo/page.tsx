import { AppShell } from "@/components/app-shell";
import { MonthlyReportMonthPicker } from "@/components/reports/monthly-report-month-picker";

export default function NovoRelatorioPage() {
  return (
    <AppShell activeHref="/relatorios">
      <MonthlyReportMonthPicker />
    </AppShell>
  );
}