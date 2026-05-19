"use client";

import { useMemo } from "react";
import { ArrowRight } from "lucide-react";

type ActionRespondentFlowProps = {
  flow: Record<string, Record<string, number>>;
  actionTerritoryNames: Record<string, string>;
  respTerritoryNames: Record<string, string>;
};

export function ActionRespondentFlow({ flow, actionTerritoryNames, respTerritoryNames }: ActionRespondentFlowProps) {
  const actionTerritories = Object.keys(flow).sort((a, b) => actionTerritoryNames[a].localeCompare(actionTerritoryNames[b]));

  if (actionTerritories.length === 0) {
    return <p className="text-sm text-stone-500 italic">Sem dados de fluxo para exibir.</p>;
  }

  return (
    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
      {actionTerritories.map((actionId) => {
        const respondents = Object.entries(flow[actionId]).sort((a, b) => b[1] - a[1]);
        const totalActionRecords = Object.values(flow[actionId]).reduce((sum, count) => sum + count, 0);

        return (
          <div key={actionId} className="rounded-3xl border border-white/60 bg-white/80 p-6 shadow-premium-sm backdrop-blur-sm">
            <h4 className="text-sm font-bold text-stone-900 flex items-center gap-2 mb-4">
              <span className="h-2 w-2 rounded-full bg-semear-green"></span>
              Ação em: {actionTerritoryNames[actionId]}
              <span className="ml-auto text-[10px] font-normal text-stone-400">{totalActionRecords} escutas</span>
            </h4>
            
            <div className="space-y-3">
              <p className="text-[10px] uppercase tracking-wider text-stone-500 font-bold mb-1">Pessoas de:</p>
              {respondents.map(([respId, count]) => (
                <div key={respId} className="flex items-center gap-3">
                  <div className="flex-1 rounded-2xl border border-white/40 bg-white/50 px-3.5 py-2 text-xs font-bold text-stone-700 shadow-premium-sm">
                    {respTerritoryNames[respId]}
                  </div>
                  <ArrowRight className="h-3 w-3 text-stone-300" />
                  <div className="w-10 text-right text-xs font-bold text-semear-green">
                    {count}
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
