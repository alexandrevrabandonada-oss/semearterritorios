import { AppShell } from "@/components/app-shell";
import { WorkshopRecordForm } from "@/components/actions/workshop-record-form";
export default async function OficinaPage(props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  return <AppShell activeHref="/acoes"><WorkshopRecordForm actionId={params.id} /></AppShell>;
}
