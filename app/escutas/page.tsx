import { AppShell } from "@/components/app-shell";
import { ListeningRecordsList } from "@/components/listening-records/listening-records-list";

export default function EscutasPage() {
  return (
    <AppShell activeHref="/escutas">
      <ListeningRecordsList />
    </AppShell>
  );
}
