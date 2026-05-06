import { AppShell } from "@/components/app-shell";
import { TransparencySnapshotEditorPage } from "@/components/transparency/transparency-snapshot-editor-page";

export default function TransparencySnapshotByIdPage({ params }: { params: { id: string } }) {
  return (
    <AppShell activeHref="/transparencia/snapshots">
      <TransparencySnapshotEditorPage snapshotId={params.id} />
    </AppShell>
  );
}
