import { AppShell } from "@/components/app-shell";
import { TerritorialReviewQueue } from "@/components/listening-records/territorial-review-queue";

export default function RevisaoTerritorialPage() {
  return (
    <AppShell activeHref="/escutas">
      <TerritorialReviewQueue />
    </AppShell>
  );
}
