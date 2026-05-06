import { AppShell } from "@/components/app-shell";
import { TransparencySnapshotsPage } from "@/components/transparency/transparency-snapshots-page";

export default function SnapshotsPage() {
  return (
    <AppShell activeHref="/transparencia/snapshots">
      <TransparencySnapshotsPage />
    </AppShell>
  );
}
