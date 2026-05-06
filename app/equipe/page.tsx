import { AppShell } from "@/components/app-shell";
import { TeamMembersPage } from "@/components/team/team-members-page";

export default function EquipePage() {
  return (
    <AppShell activeHref="/equipe">
      <TeamMembersPage />
    </AppShell>
  );
}
