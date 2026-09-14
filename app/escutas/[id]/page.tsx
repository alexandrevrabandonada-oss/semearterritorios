import { AppShell } from "@/components/app-shell";
import { ListeningRecordDetail } from "@/components/listening-records/listening-record-detail";

type EscutaPageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function EscutaPage(props: EscutaPageProps) {
  const params = await props.params;
  return (
    <AppShell activeHref="/escutas">
      <ListeningRecordDetail recordId={params.id} />
    </AppShell>
  );
}
