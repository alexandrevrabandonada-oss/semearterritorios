import { AppShell } from "@/components/app-shell";
import Link from "next/link";
import type { ReactNode } from "react";
import { ClipboardList, Link2, MapPinned, ShieldCheck } from "lucide-react";

export default function TerritoriosPage() {
  return (
    <AppShell activeHref="/territorios">
      <section className="pb-10">
        <div className="rounded-[2rem] border border-white/80 bg-white/78 p-6 shadow-soft">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-semear-earth">Territórios</p>
          <h2 className="mt-3 text-4xl font-semibold tracking-tight text-semear-green">Gestão territorial dos dados</h2>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-stone-600">
            Revise bairros, padronize lugares mencionados e acompanhe a qualidade territorial antes de qualquer mapa interno. Esta área não geocodifica endereços e não expõe lugares sensíveis.
          </p>
        </div>

        <div className="mt-6 grid gap-5 md:grid-cols-2 xl:grid-cols-4">
          <TerritoryLink href="/escutas/revisao-territorial" icon={<ClipboardList className="h-5 w-5" />} title="Revisão territorial" description="Conferir bairros, texto livre de lugares, status territorial e alertas sensíveis por escuta." />
          <TerritoryLink href="/territorios/lugares" icon={<MapPinned className="h-5 w-5" />} title="Normalização de lugares" description="Vincular variações de nome a lugares normalizados com visibilidade interna, pública segura ou sensível." />
          <TerritoryLink href="/territorios/qualidade" icon={<ShieldCheck className="h-5 w-5" />} title="Qualidade territorial" description="Ver relatório por bairro com recomendação para mapa interno autenticado ou revisão antes do mapa." />
          <TerritoryLink href="/territorios/normalizacao/qualidade" icon={<Link2 className="h-5 w-5" />} title="Qualidade da normalização" description="Detectar duplicidades, ambiguidade e sensíveis antes de autorizar desenho técnico do mapa." />
        </div>
      </section>
    </AppShell>
  );
}

function TerritoryLink({ href, icon, title, description }: { href: string; icon: ReactNode; title: string; description: string }) {
  return (
    <Link className="rounded-[2rem] border border-white/80 bg-white p-5 shadow-soft transition hover:-translate-y-0.5 hover:border-semear-green/25" href={href}>
      <div className="mb-5 flex h-11 w-11 items-center justify-center rounded-2xl bg-semear-green-soft text-semear-green">{icon}</div>
      <h3 className="text-xl font-semibold text-semear-green">{title}</h3>
      <p className="mt-3 text-sm leading-6 text-stone-600">{description}</p>
    </Link>
  );
}
