import { Suspense } from "react";
import { AppShell } from "@/components/app-shell";
import { ProjectMemoryReportWorkspace } from "@/components/memory/project-memory-report-workspace";

type MemoriaDetalhePageProps = {
  params: {
    id: string;
  };
};

export default function MemoriaDetalhePage({ params }: MemoriaDetalhePageProps) {
  return (
    <AppShell activeHref="/memoria">
      <Suspense fallback={<section className="rounded-[2rem] border border-white/80 bg-white/72 p-8 shadow-soft text-sm text-stone-600">Carregando relatório semanal...</section>}>
        <ProjectMemoryReportWorkspace reportId={params.id} />
      </Suspense>
    </AppShell>
  );
}
