"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Menu, Plus, Sprout, X } from "lucide-react";
import type { NavigationItem } from "@/lib/semear-data";
import { NotificationsBell } from "@/components/notifications/notifications-bell";

type MobileAction = {
  href: string;
  label: string;
  shortLabel?: string;
  icon?: typeof Plus;
};

type MobileHeaderProps = {
  activeHref: string;
  items: NavigationItem[];
  primaryAction?: MobileAction;
};

export function MobileHeader({ activeHref, items, primaryAction }: MobileHeaderProps) {
  const [menuOpen, setMenuOpen] = useState(false);

  const title = useMemo(() => {
    const activeItem = items.find((item) => isActiveRoute(activeHref, item.href));
    return activeItem?.label ?? "SEMEAR";
  }, [activeHref, items]);

  return (
    <>
      <header className="no-print sticky top-0 z-40 border-b border-white/60 bg-white/88 px-3 py-2.5 backdrop-blur-md shadow-premium-md lg:hidden">
        <div className="flex items-center gap-2.5">
          <button
            aria-controls="semear-mobile-drawer"
            aria-expanded={menuOpen}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/60 bg-white/80 text-semear-green shadow-premium-sm transition-all duration-200 hover:shadow-premium-md hover:bg-white active:scale-[0.98] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-semear-green"
            onClick={() => setMenuOpen(true)}
            type="button"
          >
            <Menu className="h-5 w-5" aria-hidden="true" />
            <span className="sr-only">Abrir menu principal</span>
          </button>

          <Link className="min-w-0 flex-1 animate-fade-in" href="/">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-semear-yellow text-semear-green shadow-premium-sm transition-all duration-200 hover:scale-[1.03] active:scale-[0.97]">
                <Sprout className="h-5 w-5" aria-hidden="true" />
              </div>
              <div className="min-w-0">
                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-semear-earth">SEMEAR</p>
                <p className="truncate text-sm font-extrabold text-semear-green">{title}</p>
              </div>
            </div>
          </Link>

          <NotificationsBell />

          {primaryAction ? (
            <Link
              className="inline-flex min-h-10 max-w-[5.9rem] shrink-0 items-center justify-center truncate rounded-full bg-semear-green px-3 text-xs font-bold text-white shadow-premium-sm transition-all duration-200 hover:bg-semear-green/92 active:scale-[0.98] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-semear-green"
              href={primaryAction.href}
            >
              {primaryAction.shortLabel ?? primaryAction.label}
            </Link>
          ) : null}
        </div>
      </header>

      {menuOpen ? (
        <div className="fixed inset-0 z-50 bg-semear-green/35 backdrop-blur-sm lg:hidden">
          <div className="absolute inset-y-0 left-0 flex w-[min(84vw,22rem)] flex-col border-r border-white/60 bg-white/90 backdrop-blur-lg shadow-premium-lg">
            <div className="flex items-center justify-between border-b border-stone-100 px-5 py-4">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-semear-earth">Sistema interno</p>
                <p className="text-lg font-extrabold text-semear-green">SEMEAR Territórios</p>
              </div>
              <button
                className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/60 bg-white/80 text-stone-600 shadow-premium-sm transition hover:bg-white active:scale-[0.98]"
                onClick={() => setMenuOpen(false)}
                type="button"
              >
                <X className="h-5 w-5" aria-hidden="true" />
                <span className="sr-only">Fechar menu</span>
              </button>
            </div>

            <nav aria-label="Navegação principal mobile" className="flex-1 space-y-1.5 overflow-y-auto px-4 py-4" id="semear-mobile-drawer">
              {items.map((item) => {
                const Icon = item.icon;
                const active = isActiveRoute(activeHref, item.href);

                return (
                  <Link
                    className={`flex min-h-12 items-center gap-3 rounded-2xl px-4 text-sm font-bold transition-all duration-200 active:scale-[0.98] ${
                      active 
                        ? "bg-semear-green text-white shadow-premium-sm" 
                        : "text-stone-700 hover:bg-semear-green-soft/40 hover:text-semear-green hover:translate-x-1"
                    }`}
                    href={item.href}
                    key={item.href}
                    onClick={() => setMenuOpen(false)}
                  >
                    <Icon className="h-5 w-5" aria-hidden="true" />
                    {item.label}
                  </Link>
                );
              })}
            </nav>

            <div className="border-t border-stone-100 px-5 py-4">
              <Link
                className="flex min-h-12 items-center justify-center rounded-full bg-semear-yellow px-4 text-sm font-bold text-semear-green shadow-premium-sm transition-all duration-200 active:scale-[0.98] hover:bg-semear-yellow/95 hover:shadow-premium-md"
                href="/escutas/lote"
                onClick={() => setMenuOpen(false)}
              >
                Digitar fichas no celular
              </Link>
            </div>
          </div>

          <button
            aria-label="Fechar menu"
            className="absolute inset-0 -z-10 cursor-default"
            onClick={() => setMenuOpen(false)}
            type="button"
          />
        </div>
      ) : null}
    </>
  );
}

function isActiveRoute(activeHref: string, href: string) {
  if (href === "/") return activeHref === "/";
  return activeHref === href || activeHref.startsWith(`${href}/`);
}
