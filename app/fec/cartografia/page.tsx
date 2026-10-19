import { FecShell } from "@/components/fec/fec-shell";
import { FecTechnicalWorkspace } from "@/components/fec/technical-workspace";
export const dynamic = "force-dynamic";

export default function FecCartografiaPage() {
  return (
    <FecShell>
      <FecTechnicalWorkspace
        enabled={process.env.SEMEAR_FEC_PERSISTENCE_ENABLED === "true"}
      />
    </FecShell>
  );
}
