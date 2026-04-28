import { AppShell } from "@/components/app-shell";
import { ListeningRecordForm } from "@/components/listening-records/listening-record-form";

export default function NovaEscutaPage() {
  return (
    <AppShell activeHref="/escutas">
      <ListeningRecordForm mode="create" />
    </AppShell>
  );
}
