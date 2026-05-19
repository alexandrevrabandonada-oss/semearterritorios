"use client";

import { useMemo, useState } from "react";

type WordPatternsPanelProps = {
  territoryWords: Record<string, Record<string, number>>;
  territoryNames: Record<string, string>;
};

export function WordPatternsPanel({ territoryWords, territoryNames }: WordPatternsPanelProps) {
  const [selectedTerritory, setSelectedTerritory] = useState<string>("all");

  const aggregatedWords = useMemo(() => {
    const counts: Record<string, number> = {};
    const source = selectedTerritory === "all" 
      ? Object.values(territoryWords) 
      : [territoryWords[selectedTerritory] || {}];

    source.forEach((words) => {
      Object.entries(words).forEach(([word, count]) => {
        counts[word] = (counts[word] || 0) + count;
      });
    });

    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 50);
  }, [territoryWords, selectedTerritory]);

  const territories = Object.keys(territoryWords).sort((a, b) => territoryNames[a].localeCompare(territoryNames[b]));

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <span className="text-sm font-extrabold text-stone-700">Filtrar por território:</span>
        <select 
          value={selectedTerritory}
          onChange={(e) => setSelectedTerritory(e.target.value)}
          className="rounded-full border border-white/60 bg-white/80 px-4 py-2 text-xs font-bold text-stone-700 shadow-premium-sm outline-none transition-all duration-200 focus:border-semear-green focus:ring-1 focus:ring-semear-green"
        >
          <option value="all">Todos os territórios</option>
          {territories.map((tId) => (
            <option key={tId} value={tId}>{territoryNames[tId]}</option>
          ))}
        </select>
      </div>

      <div className="rounded-3xl border border-white/60 bg-white/60 p-6 shadow-premium-sm">
        <h4 className="text-sm font-extrabold text-stone-900 mb-4 uppercase tracking-wider">Palavras recorrentes ({selectedTerritory === "all" ? "Geral" : territoryNames[selectedTerritory]})</h4>
        <div className="flex flex-wrap gap-2">
          {aggregatedWords.length === 0 ? (
            <p className="text-xs text-stone-500 italic font-semibold">Nenhuma palavra identificada.</p>
          ) : (
            aggregatedWords.map(([word, count]) => (
              <div 
                key={word} 
                className="group flex items-center gap-2 rounded-full border border-white/60 bg-white/90 px-3 py-1.5 shadow-premium-sm transition-all hover:bg-white/40 active:scale-[0.98] duration-200"
              >
                <span className="text-xs font-bold text-stone-750">{word}</span>
                <span className="flex h-5 min-w-[20px] items-center justify-center rounded-full bg-semear-green-soft/80 border border-semear-green-soft/40 px-1.5 text-[10px] font-extrabold text-semear-green">
                  {count}
                </span>
              </div>
            ))
          )}
        </div>
      </div>

      <p className="text-[10px] text-stone-500 font-semibold italic">
        * As palavras são extraídas automaticamente do campo &quot;Palavras utilizadas&quot; nas escutas revisadas. 
        Dados sensíveis detectados manualmente são removidos pela equipe durante a revisão.
      </p>
    </div>
  );
}
