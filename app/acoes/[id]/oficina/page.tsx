import { AppShell } from "@/components/app-shell";
import { WorkshopRecordForm } from "@/components/actions/workshop-record-form";
export default function OficinaPage({ params }: { params: { id: string } }) { return <AppShell activeHref="/acoes"><WorkshopRecordForm actionId={params.id} /></AppShell>; }
