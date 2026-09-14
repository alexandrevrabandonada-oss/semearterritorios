import { AppShell } from "@/components/app-shell";
import { ActionDossierPage } from "@/components/actions/action-dossier-page";

type DossiePageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function DossiePage(props: DossiePageProps) {
  const params = await props.params;
  return (
    <AppShell activeHref="/acoes">
      <ActionDossierPage actionId={params.id} />
    </AppShell>
  );
}
