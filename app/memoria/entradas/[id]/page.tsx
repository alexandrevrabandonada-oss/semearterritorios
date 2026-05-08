import { AppShell } from "@/components/app-shell";
import { ProjectMemoryEntryWorkspace } from "@/components/memory/project-memory-entry-workspace";

type EntradaMemoriaPageProps = {
  params: {
    id: string;
  };
};

export default function EntradaMemoriaPage({ params }: EntradaMemoriaPageProps) {
  return (
    <AppShell activeHref="/memoria">
      <ProjectMemoryEntryWorkspace entryId={params.id} />
    </AppShell>
  );
}
