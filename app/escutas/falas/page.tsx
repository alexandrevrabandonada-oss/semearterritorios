import { AppShell } from "@/components/app-shell";
import { PublicQuotesQueue } from "@/components/listening-records/public-quotes-queue";

export default function EscutasFalasPage() {
  return (
    <AppShell activeHref="/escutas">
      <PublicQuotesQueue />
    </AppShell>
  );
}
