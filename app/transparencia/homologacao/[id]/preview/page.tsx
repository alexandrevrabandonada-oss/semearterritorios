import { TransparencyHomologationPreviewPage } from "@/components/transparency/transparency-homologation-workspace";

export default async function TransparenciaHomologacaoPreviewByIdPage(props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  return <TransparencyHomologationPreviewPage packageId={params.id} />;
}
