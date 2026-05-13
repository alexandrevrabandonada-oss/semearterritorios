import { AppShell } from "@/components/app-shell";
import { PublicQuoteAuditHistory } from "@/components/listening-records/public-quote-audit-history";

type EscutasFalasHistoryPageProps = {
  params: {
    id: string;
  };
};

export default function EscutasFalasHistoryPage({ params }: EscutasFalasHistoryPageProps) {
  return (
    <AppShell activeHref="/escutas">
      <PublicQuoteAuditHistory quoteId={params.id} />
    </AppShell>
  );
}
