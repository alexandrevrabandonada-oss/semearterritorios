import Link from "next/link";
import { ClipboardList, Home, MessageSquareText, PenSquare } from "lucide-react";

type MobileBottomNavProps = {
  activeHref: string;
};

const bottomItems = [
  { label: "Início", href: "/", icon: Home },
  { label: "Ações", href: "/acoes", icon: ClipboardList },
  { label: "Digitar", href: "/escutas/lote", icon: PenSquare, highlight: true },
  { label: "Escutas", href: "/escutas", icon: MessageSquareText }
];

export function MobileBottomNav({ activeHref }: MobileBottomNavProps) {
  return (
    <nav className="no-print fixed inset-x-0 bottom-0 z-40 border-t border-semear-gray/80 bg-white/96 px-2 pb-[calc(env(safe-area-inset-bottom,0px)+0.5rem)] pt-2 shadow-[0_-12px_32px_rgba(23,74,55,0.12)] md:hidden" aria-label="Atalhos principais">
      <div className="grid grid-cols-4 gap-2">
        {bottomItems.map((item) => {
          const Icon = item.icon;
          const active = isActiveRoute(activeHref, item.href);

          return (
            <Link
              className={`flex min-h-[4.25rem] flex-col items-center justify-center rounded-2xl px-2 py-2 text-center text-[0.72rem] font-semibold leading-tight transition ${
                item.highlight
                  ? active
                    ? "bg-semear-yellow text-semear-green"
                    : "bg-semear-green text-white"
                  : active
                    ? "bg-semear-green-soft text-semear-green"
                    : "text-stone-500 hover:bg-semear-offwhite hover:text-semear-green"
              }`}
              href={item.href}
              key={item.href}
            >
              <Icon className="mb-1 h-5 w-5" aria-hidden="true" />
              {item.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

function isActiveRoute(activeHref: string, href: string) {
  if (href === "/") return activeHref === "/";
  return activeHref === href || activeHref.startsWith(`${href}/`);
}