import { AppShell } from "@/components/app-shell";
import { ProjectMemoryCurationDashboard } from "@/components/memory/project-memory-curation-dashboard";

export default function CuradoriaMemoriaPage() {
  return (
    <AppShell activeHref="/memoria">
      <ProjectMemoryCurationDashboard />
    </AppShell>
  );
}
