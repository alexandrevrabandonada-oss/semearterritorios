import { AppShell } from "@/components/app-shell";
import { ActionDebriefPage } from "@/components/actions/action-debrief-page";

type DevolutivaPageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function DevolutivaPage(props: DevolutivaPageProps) {
  const params = await props.params;
  return (
    <AppShell activeHref="/acoes">
      <ActionDebriefPage actionId={params.id} />
    </AppShell>
  );
}
