import { AppShell } from "@/components/app-shell";
import { ListeningRecordDetail } from "@/components/listening-records/listening-record-detail";

type EscutaPageProps = {
  params: {
    id: string;
  };
};

export default function EscutaPage({ params }: EscutaPageProps) {
  return (
    <AppShell activeHref="/escutas">
      <ListeningRecordDetail recordId={params.id} />
    </AppShell>
  );
}
