import { AppShell } from "@/components/app-shell";
import { ActionForm } from "@/components/actions/action-form";

export default function NovaAcaoPage() {
  return (
    <AppShell activeHref="/acoes">
      <ActionForm mode="create" />
    </AppShell>
  );
}
