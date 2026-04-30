import { AppShell } from "@/components/app-shell";
import { NormalizationQualityPage } from "@/components/territories/normalization-quality-page";

export default function QualidadeNormalizacaoPage() {
  return (
    <AppShell activeHref="/territorios">
      <NormalizationQualityPage />
    </AppShell>
  );
}
