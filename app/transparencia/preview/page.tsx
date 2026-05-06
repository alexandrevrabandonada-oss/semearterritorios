import { AppShell } from "@/components/app-shell";
import { TransparencyPreviewPage } from "@/components/transparency/transparency-preview-page";

export default function TransparenciaPreviewPage() {
  return (
    <AppShell activeHref="/transparencia/snapshots">
      <TransparencyPreviewPage />
    </AppShell>
  );
}
