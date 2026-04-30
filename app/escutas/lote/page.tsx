import { AppShell } from "@/components/app-shell";
import { ListeningRecordBatchForm } from "@/components/listening-records/listening-record-batch-form";

export default function LotePage() {
  return (
    <AppShell activeHref="/escutas">
      <ListeningRecordBatchForm />
    </AppShell>
  );
}
