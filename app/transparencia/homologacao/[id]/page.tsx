import { AppShell } from "@/components/app-shell";
import { TransparencyHomologationDetailPage } from "@/components/transparency/transparency-homologation-workspace";

export default async function TransparenciaHomologacaoByIdPage(props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  return (
    <AppShell activeHref="/transparencia/snapshots">
      <TransparencyHomologationDetailPage packageId={params.id} />
    </AppShell>
  );
}
