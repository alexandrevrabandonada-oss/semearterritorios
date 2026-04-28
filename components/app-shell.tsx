import Link from "next/link";
import type { ReactNode } from "react";
import { Sprout } from "lucide-react";
import { navigationItems } from "@/lib/semear-data";

type AppShellProps = {
  activeHref: string;
  children: ReactNode;
};

export function AppShell({ activeHref, children }: AppShellProps) {
  return (
    <main className="min-h-screen">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-8 px-4 py-5 sm:px-6 lg:px-8">
        <header className="rounded-[2rem] border border-white/70 bg-semear-green px-5 py-5 text-white shadow-soft sm:px-7">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <Link className="flex items-center gap-4" href="/">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-semear-yellow text-semear-green shadow-sm">
                <Sprout className="h-7 w-7" aria-hidden="true" />
              </div>
              <div>
                <p className="text-sm font-medium uppercase tracking-[0.18em] text-semear-yellow">
                  Sistema interno
                </p>
                <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
                  SEMEAR Territórios
                </h1>
                <p className="mt-1 text-sm text-white/78 sm:text-base">
                  Escuta, memória e cartografia popular
                </p>
              </div>
            </Link>

            <nav aria-label="Navegação principal" className="flex flex-wrap gap-2">
              {navigationItems.map((item) => {
                const Icon = item.icon;
                const active = item.href === activeHref;

                return (
                  <Link
                    className={`inline-flex min-h-11 items-center gap-2 rounded-full border px-4 text-sm font-medium transition ${
                      active
                        ? "border-semear-yellow bg-semear-yellow text-semear-green"
                        : "border-white/15 bg-white/8 text-white hover:border-white/35 hover:bg-white/14"
                    }`}
                    href={item.href}
                    key={item.label}
                  >
                    <Icon className="h-4 w-4" aria-hidden="true" />
                    {item.label}
                  </Link>
                );
              })}
            </nav>
          </div>
        </header>

        {children}
      </div>
    </main>
  );
}
