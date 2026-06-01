import type { ReactNode } from "react";
import type { NavigationItem } from "@/lib/semear-data";
import { MobileBottomNav } from "@/components/layout/mobile-bottom-nav";
import { MobileHeader } from "@/components/layout/mobile-header";

type MobileAction = {
  href: string;
  label: string;
  shortLabel?: string;
};

type MobileAppShellProps = {
  activeHref: string;
  items: NavigationItem[];
  primaryAction?: MobileAction;
  children: ReactNode;
};

export function MobileAppShell({ activeHref, items, primaryAction, children }: MobileAppShellProps) {
  return (
    <>
      <MobileHeader activeHref={activeHref} items={items} primaryAction={primaryAction} />
      <div className="pb-[calc(env(safe-area-inset-bottom,0px)+7.5rem)] md:pb-8 lg:pb-0">{children}</div>
      <MobileBottomNav activeHref={activeHref} />
    </>
  );
}
