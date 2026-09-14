import { AppShell } from "@/components/app-shell";
import { PublicQuoteAuditHistory } from "@/components/listening-records/public-quote-audit-history";

type EscutasFalasHistoryPageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function EscutasFalasHistoryPage(props: EscutasFalasHistoryPageProps) {
  const params = await props.params;
  return (
    <AppShell activeHref="/escutas">
      <PublicQuoteAuditHistory quoteId={params.id} />
    </AppShell>
  );
}
