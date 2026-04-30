import { AppShell } from "@/components/app-shell";
import { ActionPilotPage } from "@/components/actions/action-pilot-page";

type PilotoPageProps = {
  params: {
    id: string;
  };
};

export default function PilotoPage({ params }: PilotoPageProps) {
  return (
    <AppShell activeHref="/acoes">
      <ActionPilotPage actionId={params.id} />
    </AppShell>
  );
}
