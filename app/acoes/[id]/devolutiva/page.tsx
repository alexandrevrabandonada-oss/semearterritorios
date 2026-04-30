import { AppShell } from "@/components/app-shell";
import { ActionDebriefPage } from "@/components/actions/action-debrief-page";

type DevolutivaPageProps = {
  params: {
    id: string;
  };
};

export default function DevolutivaPage({ params }: DevolutivaPageProps) {
  return (
    <AppShell activeHref="/acoes">
      <ActionDebriefPage actionId={params.id} />
    </AppShell>
  );
}
