import { AppShell } from "@/components/app-shell";
import { ActionsList } from "@/components/actions/actions-list";

export default function AcoesPage() {
  return (
    <AppShell activeHref="/acoes">
      <ActionsList />
    </AppShell>
  );
}
