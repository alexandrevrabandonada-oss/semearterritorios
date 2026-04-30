"use client";

import { Clipboard, ShieldCheck, ShieldAlert } from "lucide-react";
import type { InternalMapGoNoGoResult } from "@/lib/internal-map-scope";
import {
  buildMapHomologation,
  buildMapHomologationMarkdown,
  type MapHomologationManualChecks
} from "@/lib/internal-map-homologation";
import type { NormalizedPlacesQualitySummary } from "@/lib/normalized-places-quality";

type Props = {
  goNoGo: InternalMapGoNoGoResult;
  normalizedQuality?: NormalizedPlacesQualitySummary;
  checks: MapHomologationManualChecks;
  onCopied?: (message: string) => void;
};

export function MapHomologationPanel({ goNoGo, normalizedQuality, checks, onCopied }: Props) {
  const homologation = buildMapHomologation({ goNoGo, normalizedQuality, checks });
  const markdown = buildMapHomologationMarkdown({ goNoGo, homologation, checks });
  const positive = homologation.status === "Homologado para protótipo interno";
  const warning = homologation.status === "Homologação pendente" || homologation.status === "Manter mapa-lista";

  return (
    <section className={`rounded-[2rem] border p-5 shadow-soft ${positive ? "border-semear-green/20 bg-[#edf6df]" : warning ? "border-amber-200 bg-amber-50" : "border-red-200 bg-red-50"}`}>
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-semear-earth">Homologação do mapa</p>
          <h3 className={`mt-2 text-2xl font-semibold ${positive ? "text-semear-green" : warning ? "text-amber-950" : "text-red-900"}`}>{homologation.status}</h3>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-stone-700">Recomendação: {homologation.recommendation}. A validação de RLS é manual; este painel apenas registra a declaração da equipe.</p>
        </div>
        <div className={`flex h-12 w-12 items-center justify-center rounded-2xl ${positive ? "bg-semear-green-soft text-semear-green" : warning ? "bg-amber-100 text-amber-900" : "bg-red-100 text-red-900"}`}>
          {positive ? <ShieldCheck className="h-6 w-6" aria-hidden="true" /> : <ShieldAlert className="h-6 w-6" aria-hidden="true" />}
        </div>
      </div>

      <div className="mt-5 grid gap-3 md:grid-cols-2">
        <CriteriaBlock title="Dados" items={[
          `${goNoGo.summary.reviewedRecords} escuta(s) revisada(s)`,
          `${goNoGo.summary.territoriesWithData} território(s) com dados`,
          `${goNoGo.summary.readyTerritories} território(s) pronto(s)`,
          `${goNoGo.summary.blockedTerritories} território(s) bloqueado(s)`
        ]} />
        <CriteriaBlock title="Privacidade" items={[
          `${goNoGo.summary.sensitivePlaces} sensível(is) pendente(s)`,
          checks.noOriginalSpeech ? "sem fala original no mapa" : "fala original ainda precisa ser conferida",
          checks.noPersonalData ? "sem dados pessoais" : "dados pessoais precisam ser conferidos",
          checks.noGeocoding ? "sem geocodificação" : "geocodificação precisa ser descartada"
        ]} />
        <CriteriaBlock title="Normalização" items={[
          `${goNoGo.summary.safeNormalizedPlaces} lugar(es) seguro(s) normalizado(s)`,
          `${goNoGo.summary.duplicateWarnings} duplicidade(s) pendente(s)`,
          `${goNoGo.summary.unnormalizedStructuredPlaces} lugar(es) estruturado(s) sem normalização`
        ]} />
        <CriteriaBlock title="RLS manual" items={[
          checks.rlsValidated ? "RLS validada" : "RLS pendente",
          checks.adminTested ? "admin testado" : "admin pendente",
          checks.coordenacaoTested ? "coordenação testada" : "coordenação pendente",
          checks.equipeTested ? "equipe testada" : "equipe pendente",
          checks.anonBlocked ? "anônimo bloqueado" : "anônimo pendente"
        ]} />
      </div>

      <div className="mt-5 rounded-2xl bg-white/70 p-4">
        <p className="font-semibold text-semear-green">Pendências</p>
        {homologation.pendingItems.length > 0 ? (
          <ul className="mt-3 space-y-2 text-sm leading-6 text-stone-700">
            {homologation.pendingItems.slice(0, 10).map((item) => <li key={item}>- {item}</li>)}
          </ul>
        ) : (
          <p className="mt-2 text-sm text-stone-600">Nenhuma pendência registrada neste painel.</p>
        )}
      </div>

      <button className="mt-5 inline-flex min-h-11 items-center gap-2 rounded-full bg-semear-green px-4 text-sm font-semibold text-white" onClick={() => void navigator.clipboard.writeText(markdown).then(() => onCopied?.("Relatório de homologação copiado."))} type="button">
        <Clipboard className="h-4 w-4" aria-hidden="true" />
        Copiar relatório de homologação
      </button>
    </section>
  );
}

function CriteriaBlock({ title, items }: { title: string; items: string[] }) {
  return (
    <div className="rounded-2xl border border-white/80 bg-white/70 p-4">
      <p className="font-semibold text-semear-green">{title}</p>
      <ul className="mt-3 space-y-1 text-sm leading-6 text-stone-700">
        {items.map((item) => <li key={item}>- {item}</li>)}
      </ul>
    </div>
  );
}
