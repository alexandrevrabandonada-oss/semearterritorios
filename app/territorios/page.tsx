import { AppShell } from "@/components/app-shell";
import { EmptyModulePage } from "@/components/empty-module-page";
import { emptyModules } from "@/lib/semear-data";

export default function TerritoriosPage() {
  return (
    <AppShell activeHref="/territorios">
      <EmptyModulePage module={emptyModules[2]} />
    </AppShell>
  );
}
