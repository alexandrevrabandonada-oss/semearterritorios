import { AppShell } from "@/components/app-shell";
import { MonthlyReportDetail } from "@/components/reports/monthly-report-detail";

type RelatorioMensalPageProps = {
  params: {
    mes: string;
  };
};

export default function RelatorioMensalPage({ params }: RelatorioMensalPageProps) {
  return (
    <AppShell activeHref="/relatorios">
      <MonthlyReportDetail month={params.mes} />
    </AppShell>
  );
}