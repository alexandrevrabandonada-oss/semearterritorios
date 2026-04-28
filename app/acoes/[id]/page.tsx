import { AppShell } from "@/components/app-shell";
import { ActionDetail } from "@/components/actions/action-detail";

type AcaoDetalhePageProps = {
  params: {
    id: string;
  };
};

export default function AcaoDetalhePage({ params }: AcaoDetalhePageProps) {
  return (
    <AppShell activeHref="/acoes">
      <ActionDetail actionId={params.id} />
    </AppShell>
  );
}
