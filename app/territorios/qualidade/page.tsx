import { AppShell } from "@/components/app-shell";
import { TerritorialQualityPage } from "@/components/territories/territorial-quality-page";

export default function QualidadeTerritorialPage() {
  return (
    <AppShell activeHref="/territorios">
      <TerritorialQualityPage />
    </AppShell>
  );
}
