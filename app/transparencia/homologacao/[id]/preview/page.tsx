import { TransparencyHomologationPreviewPage } from "@/components/transparency/transparency-homologation-workspace";

export default function TransparenciaHomologacaoPreviewByIdPage({ params }: { params: { id: string } }) {
  return <TransparencyHomologationPreviewPage packageId={params.id} />;
}
