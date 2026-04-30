import { AppShell } from "@/components/app-shell";
import { ActionDossierPage } from "@/components/actions/action-dossier-page";

type DossiePageProps = {
  params: {
    id: string;
  };
};

export default function DossiePage({ params }: DossiePageProps) {
  return (
    <AppShell activeHref="/acoes">
      <ActionDossierPage actionId={params.id} />
    </AppShell>
  );
}
