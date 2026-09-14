import { AppShell } from "@/components/app-shell";
import { ActionPilotPage } from "@/components/actions/action-pilot-page";

type PilotoPageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function PilotoPage(props: PilotoPageProps) {
  const params = await props.params;
  return (
    <AppShell activeHref="/acoes">
      <ActionPilotPage actionId={params.id} />
    </AppShell>
  );
}
