import { AppShell } from "@/components/app-shell";
import { MonthlyReportDetail } from "@/components/reports/monthly-report-detail";

type RelatorioMensalPageProps = {
  params: Promise<{
    mes: string;
  }>;
};

export default async function RelatorioMensalPage(props: RelatorioMensalPageProps) {
  const params = await props.params;
  return (
    <AppShell activeHref="/relatorios">
      <MonthlyReportDetail month={params.mes} />
    </AppShell>
  );
}