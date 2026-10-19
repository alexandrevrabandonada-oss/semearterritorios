import { AppShell } from "@/components/app-shell";
import { ProfessionalMonthlyWorkspace } from "@/components/memory/professional-monthly-workspace";
export default async function Page({ params }: { params: Promise<{ id: string }> }) { const { id } = await params; return <AppShell activeHref="/memoria"><ProfessionalMonthlyWorkspace reportId={id} /></AppShell>; }
