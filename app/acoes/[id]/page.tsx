import { AppShell } from "@/components/app-shell";
import { ActionDetail } from "@/components/actions/action-detail";

type AcaoDetalhePageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function AcaoDetalhePage(props: AcaoDetalhePageProps) {
  const params = await props.params;
  return (
    <AppShell activeHref="/acoes">
      <ActionDetail actionId={params.id} />
    </AppShell>
  );
}
