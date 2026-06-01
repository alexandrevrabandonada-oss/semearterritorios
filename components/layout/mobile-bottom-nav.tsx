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
    <nav className="no-print fixed inset-x-0 bottom-0 z-40 border-t border-white/60 bg-white/90 px-2 pb-[calc(env(safe-area-inset-bottom,0px)+0.45rem)] pt-1.5 shadow-premium-lg backdrop-blur-md md:hidden" aria-label="Atalhos principais">
      <div className="grid grid-cols-4 gap-1.5">
        {bottomItems.map((item) => {
          const Icon = item.icon;
          const active = isActiveRoute(activeHref, item.href);

          return (
            <Link
              className={`flex min-h-[3.85rem] flex-col items-center justify-center rounded-xl px-2 py-1.5 text-center text-[0.68rem] font-bold leading-tight transition-all duration-200 active:scale-95 ${
                item.highlight
                  ? active
                    ? "bg-semear-yellow text-semear-green shadow-premium-sm"
                    : "bg-semear-green text-white shadow-premium-sm hover:bg-semear-green/92 hover:shadow-premium-md"
                  : active
                    ? "bg-semear-green-soft/50 text-semear-green border border-semear-green/10"
                    : "text-stone-500 border border-transparent hover:bg-white/40 hover:text-semear-green hover:shadow-premium-sm"
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
