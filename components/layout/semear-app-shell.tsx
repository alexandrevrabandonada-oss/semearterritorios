"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { ChevronDown, Sprout, UsersRound } from "lucide-react";
import { MobileAppShell } from "@/components/layout/mobile-app-shell";
import { navigationItems } from "@/lib/semear-data";

type SemearAppShellProps = {
  activeHref: string;
  children: ReactNode;
};

export function SemearAppShell({ activeHref, children }: SemearAppShellProps) {
  const primaryAction = getPrimaryAction(activeHref);

  return (
    <main className="min-h-screen bg-semear-offwhite text-stone-900">
      <div className="lg:grid lg:min-h-screen lg:grid-cols-[16rem_1fr]">
        <aside className="no-print hidden border-r border-white/10 bg-semear-green text-white shadow-[18px_0_45px_rgba(23,74,55,0.18)] lg:sticky lg:top-0 lg:flex lg:h-screen lg:flex-col">
          <div className="p-6">
            <Link className="flex items-center gap-4" href="/">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-semear-yellow text-semear-green shadow-sm">
                <Sprout className="h-7 w-7" aria-hidden="true" />
              </div>
              <div>
                <h1 className="text-xl font-semibold leading-tight tracking-tight">SEMEAR<br />Territórios</h1>
                <p className="mt-1 text-xs font-semibold uppercase tracking-[0.22em] text-semear-yellow">Sistema interno</p>
              </div>
            </Link>
          </div>

          <nav aria-label="Navegação principal" className="flex-1 space-y-1 px-3">
            {navigationItems.map((item) => {
              const Icon = item.icon;
              const active = isActiveRoute(activeHref, item.href);

              return (
                <Link
                  className={`group flex min-h-12 items-center gap-3 rounded-xl px-4 text-sm font-semibold transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-semear-yellow ${
                    active
                      ? "bg-white/12 text-semear-yellow shadow-inner"
                      : "text-white/88 hover:bg-white/8 hover:text-white"
                  }`}
                  href={item.href}
                  key={item.label}
                >
                  <Icon className="h-5 w-5" aria-hidden="true" />
                  {item.label}
                </Link>
              );
            })}
          </nav>

          <div className="p-5">
            <Link
              className="flex items-center gap-3 rounded-2xl border border-white/12 bg-white/8 p-3 transition hover:bg-white/12 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-semear-yellow"
              href="/equipe"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white/12 text-semear-yellow">
                <UsersRound className="h-5 w-5" aria-hidden="true" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold">Equipe Semear</p>
                <p className="truncate text-xs text-white/70">Sistema interno</p>
              </div>
              <ChevronDown className="h-4 w-4 text-white/70" aria-hidden="true" />
            </Link>
          </div>
        </aside>

        <div className="min-w-0">
          <MobileAppShell activeHref={activeHref} items={navigationItems} primaryAction={primaryAction}>
            <div className="mx-auto w-full max-w-[106rem] px-4 py-5 sm:px-6 lg:px-8 lg:py-7">
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
