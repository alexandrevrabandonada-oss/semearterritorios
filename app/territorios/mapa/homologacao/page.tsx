import { AppShell } from "@/components/app-shell";
import { MapHomologationPage } from "@/components/territories/map-homologation-page";

export default function HomologacaoMapaPage() {
  return (
    <AppShell activeHref="/territorios">
      <MapHomologationPage />
    </AppShell>
  );
}
