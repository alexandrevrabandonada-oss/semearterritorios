import { AppShell } from "@/components/app-shell";
import { TerritorialListeningMap } from "@/components/mapa/territorial-listening-map";

export default function MapaPage() {
  return (
    <AppShell activeHref="/mapa">
      <TerritorialListeningMap />
    </AppShell>
  );
}
