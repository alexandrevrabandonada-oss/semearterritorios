import { AppShell } from "@/components/app-shell";
import { InternalMapGate } from "@/components/mapa/internal-map-gate";

export default function MapaInternoPage() {
  return (
    <AppShell activeHref="/mapa">
      <InternalMapGate />
    </AppShell>
  );
}
