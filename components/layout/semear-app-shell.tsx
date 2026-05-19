"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { ChevronDown, Sprout, UsersRound } from "lucide-react";
import { MobileAppShell } from "@/components/layout/mobile-app-shell";
import { NotificationsBell } from "@/components/notifications/notifications-bell";
import { navigationItems } from "@/lib/semear-data";

type SemearAppShellProps = {
  activeHref: string;
  children: ReactNode;
};

export function SemearAppShell({ activeHref, children }: SemearAppShellProps) {
  const primaryAction = getPrimaryAction(activeHref);

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,rgba(228,184,78,0.15),transparent_36rem),radial-gradient(circle_at_bottom_right,rgba(23,74,55,0.04),transparent_48rem),linear-gradient(135deg,#fcfbfa_0%,#f5f2e8_100%)] text-stone-900">
      <div className="lg:grid lg:min-h-screen lg:grid-cols-[15.5rem_1fr]">
        <aside className="no-print hidden border-r border-white/10 bg-[radial-gradient(circle_at_top_left,rgba(255,207,49,0.22),transparent_18rem),linear-gradient(180deg,#093b2a_0%,#031f16_100%)] text-white shadow-[20px_0_50px_rgba(18,59,44,0.15)] lg:sticky lg:top-0 lg:flex lg:h-screen lg:flex-col transition-all duration-300">
          <div className="p-6">
            <div className="flex items-start justify-between gap-3">
              <Link className="flex items-center gap-4" href="/">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-semear-yellow text-semear-green shadow-[0_8px_24px_rgba(228,184,78,0.35)] transition-all duration-300 hover:scale-105">
                  <Sprout className="h-6 w-6" aria-hidden="true" />
                </div>
                <div>
                  <h1 className="text-lg font-bold leading-tight tracking-tight">SEMEAR<br />Territórios</h1>
                  <p className="mt-1 text-[0.68rem] font-bold uppercase tracking-[0.2em] text-semear-yellow">Sistema interno</p>
                </div>
              </Link>
              <NotificationsBell />
            </div>
          </div>

          <nav aria-label="Navegação principal" className="flex-1 space-y-1.5 px-4 overflow-y-auto py-2">
            {navigationItems.map((item) => {
              const Icon = item.icon;
              const active = isActiveRoute(activeHref, item.href);

              return (
                <Link
                  className={`group flex min-h-12 items-center gap-3 rounded-2xl px-4 text-sm font-bold transition-all duration-200 active:scale-[0.98] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-semear-yellow ${
                    active
                      ? "bg-semear-yellow text-semear-green shadow-[0_8px_20px_rgba(228,184,78,0.25)]"
                      : "text-white/80 hover:bg-white/8 hover:text-white hover:translate-x-1"
                  }`}
                  href={item.href}
                  key={item.label}
                >
                  <Icon className="h-[1.15rem] w-[1.15rem]" aria-hidden="true" />
                  {item.label}
                </Link>
              );
            })}
          </nav>

          <div className="border-t border-white/10 p-5">
            <Link
              className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.04] p-3 transition-all duration-200 hover:bg-white/[0.08] hover:border-white/20 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-semear-yellow active:scale-[0.98]"
              href="/equipe"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/12 text-semear-yellow">
                <UsersRound className="h-5 w-5" aria-hidden="true" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-bold">Equipe Semear</p>
                <p className="truncate text-xs text-white/60">Sistema interno</p>
              </div>
              <ChevronDown className="h-4 w-4 text-white/60" aria-hidden="true" />
            </Link>
          </div>
        </aside>

        <div className="min-w-0">
          <MobileAppShell activeHref={activeHref} items={navigationItems} primaryAction={primaryAction}>
            <div className="mx-auto w-full max-w-[98rem] px-4 py-5 sm:px-6 lg:px-8 lg:py-7">
              {children}
            </div>
          </MobileAppShell>
        </div>
      </div>
    </main>
  );
}

function isActiveRoute(activeHref: string, href: string) {
  if (href === "/") return activeHref === "/";
  return activeHref === href || activeHref.startsWith(`${href}/`);
}

function getPrimaryAction(activeHref: string) {
  if (activeHref.startsWith("/escutas/lote")) {
    return { href: "/escutas", label: "Revisar escutas", shortLabel: "Revisar" };
  }

  if (activeHref.startsWith("/escutas")) {
    return { href: "/escutas/lote", label: "Digitar fichas", shortLabel: "Digitar" };
  }

  if (activeHref.startsWith("/acoes")) {
    return { href: "/acoes/nova", label: "Nova ação", shortLabel: "Nova" };
  }

  if (activeHref.startsWith("/pos-banca")) {
    return { href: "/acoes", label: "Abrir ações", shortLabel: "Ações" };
  }

  return { href: "/escutas/lote", label: "Digitar fichas", shortLabel: "Digitar" };
}
