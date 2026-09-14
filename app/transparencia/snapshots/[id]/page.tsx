import { AppShell } from "@/components/app-shell";
import { TransparencySnapshotEditorPage } from "@/components/transparency/transparency-snapshot-editor-page";

export default async function TransparencySnapshotByIdPage(props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  return (
    <AppShell activeHref="/transparencia/snapshots">
      <TransparencySnapshotEditorPage snapshotId={params.id} />
    </AppShell>
  );
}
