import { AppShell } from "@/components/app-shell";
import { TransparencyHomologationDetailPage } from "@/components/transparency/transparency-homologation-workspace";

export default function TransparenciaHomologacaoByIdPage({ params }: { params: { id: string } }) {
  return (
    <AppShell activeHref="/transparencia/snapshots">
      <TransparencyHomologationDetailPage packageId={params.id} />
    </AppShell>
  );
}
