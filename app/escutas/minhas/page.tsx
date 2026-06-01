import { AppShell } from "@/components/app-shell";
import { MyListeningRecordsPage } from "@/components/listening-records/my-listening-records-page";

export default function MinhasEscutasPage() {
  return (
    <AppShell activeHref="/escutas">
      <MyListeningRecordsPage />
    </AppShell>
  );
}
