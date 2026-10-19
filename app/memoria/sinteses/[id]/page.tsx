import { AppShell } from "@/components/app-shell";
import { MonthlySynthesisWorkspace } from "@/components/memory/monthly-synthesis-workspace";
export default async function Page({params}:{params:Promise<{id:string}>}){const {id}=await params;return <AppShell activeHref="/memoria"><MonthlySynthesisWorkspace synthesisId={id}/></AppShell>;}
