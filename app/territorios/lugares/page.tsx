import { AppShell } from "@/components/app-shell";
import { PlacesNormalizationPage } from "@/components/territories/places-normalization-page";

export default function LugaresPage() {
  return (
    <AppShell activeHref="/territorios">
      <PlacesNormalizationPage />
    </AppShell>
  );
}
