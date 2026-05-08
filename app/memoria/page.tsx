import { AppShell } from "@/components/app-shell";
import { ProjectMemoryDashboard } from "@/components/memory/project-memory-dashboard";

export default function MemoriaPage() {
  return (
    <AppShell activeHref="/memoria">
      <ProjectMemoryDashboard />
    </AppShell>
  );
}
