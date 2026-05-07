import type { ReactNode } from "react";
import { SemearAppShell } from "@/components/layout/semear-app-shell";

type AppShellProps = {
  activeHref: string;
  children: ReactNode;
};

export function AppShell({ activeHref, children }: AppShellProps) {
  return <SemearAppShell activeHref={activeHref}>{children}</SemearAppShell>;
}
