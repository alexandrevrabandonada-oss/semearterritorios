"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Menu, Plus, Sprout, X } from "lucide-react";
import type { NavigationItem } from "@/lib/semear-data";

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
      <header className="no-print sticky top-0 z-40 border-b border-semear-gray/80 bg-semear-offwhite/95 px-4 py-3 backdrop-blur lg:hidden">
        <div className="flex items-center gap-3">
          <button
            aria-controls="semear-mobile-drawer"
            aria-expanded={menuOpen}
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-semear-gray bg-white text-semear-green shadow-sm transition hover:bg-semear-green-soft focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-semear-green"
            onClick={() => setMenuOpen(true)}
            type="button"
          >
            <Menu className="h-5 w-5" aria-hidden="true" />
            <span className="sr-only">Abrir menu principal</span>
          </button>

          <Link className="min-w-0 flex-1" href="/">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-semear-yellow text-semear-green shadow-sm">
                <Sprout className="h-5 w-5" aria-hidden="true" />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-semear-earth">SEMEAR</p>
                <p className="truncate text-base font-semibold text-semear-green">{title}</p>
              </div>
            </div>
          </Link>

          {primaryAction ? (
            <Link
              className="inline-flex min-h-11 items-center justify-center rounded-2xl bg-semear-green px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-semear-green/90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-semear-green"
              href={primaryAction.href}
            >
              {primaryAction.shortLabel ?? primaryAction.label}
            </Link>
          ) : null}
        </div>
      </header>

      {menuOpen ? (
        <div className="fixed inset-0 z-50 bg-semear-green/35 backdrop-blur-[1px] lg:hidden">
          <div className="absolute inset-y-0 left-0 flex w-[min(84vw,22rem)] flex-col border-r border-semear-green/10 bg-white shadow-[24px_0_48px_rgba(23,74,55,0.2)]">
            <div className="flex items-center justify-between border-b border-semear-gray/70 px-4 py-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-semear-earth">Sistema interno</p>
                <p className="text-lg font-semibold text-semear-green">SEMEAR Territórios</p>
              </div>
              <button
                className="flex h-11 w-11 items-center justify-center rounded-2xl border border-semear-gray bg-semear-offwhite text-semear-green"
                onClick={() => setMenuOpen(false)}
                type="button"
              >
                <X className="h-5 w-5" aria-hidden="true" />
                <span className="sr-only">Fechar menu</span>
              </button>
            </div>

            <nav aria-label="Navegação principal mobile" className="flex-1 space-y-1 overflow-y-auto px-3 py-4" id="semear-mobile-drawer">
              {items.map((item) => {
                const Icon = item.icon;
                const active = isActiveRoute(activeHref, item.href);

                return (
                  <Link
                    className={`flex min-h-12 items-center gap-3 rounded-2xl px-4 text-sm font-semibold transition ${
                      active ? "bg-semear-green text-white" : "text-semear-green hover:bg-semear-green-soft"
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

            <div className="border-t border-semear-gray/70 px-4 py-4">
              <Link
                className="flex min-h-12 items-center justify-center rounded-2xl bg-semear-yellow px-4 text-sm font-semibold text-semear-green"
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