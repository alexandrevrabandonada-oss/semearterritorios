import { AppShell } from "@/components/app-shell";
import { TransparencyHomologationListPage } from "@/components/transparency/transparency-homologation-workspace";

export default function TransparenciaHomologacaoPage() {
  return (
    <AppShell activeHref="/transparencia/snapshots">
      <TransparencyHomologationListPage />
    </AppShell>
  );
}
