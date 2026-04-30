import { AppShell } from "@/components/app-shell";
import { PostActionConsolidationPage } from "@/components/post-action/post-action-consolidation-page";

export default function PosBancaPage() {
  return (
    <AppShell activeHref="/pos-banca">
      <PostActionConsolidationPage />
    </AppShell>
  );
}
