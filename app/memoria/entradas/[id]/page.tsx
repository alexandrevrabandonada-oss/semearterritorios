import { AppShell } from "@/components/app-shell";
import { ProjectMemoryEntryWorkspace } from "@/components/memory/project-memory-entry-workspace";

type EntradaMemoriaPageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function EntradaMemoriaPage(props: EntradaMemoriaPageProps) {
  const params = await props.params;
  return (
    <AppShell activeHref="/memoria">
      <ProjectMemoryEntryWorkspace entryId={params.id} />
    </AppShell>
  );
}
