"use client";

import { useMemo } from "react";

type TerritoryThemeMatrixProps = {
  matrix: Record<string, Record<string, number>>;
  themeMap: Record<string, string>;
  territoryNames: Record<string, string>;
};

export function TerritoryThemeMatrix({ matrix, themeMap, territoryNames }: TerritoryThemeMatrixProps) {
  const territories = useMemo(() => Object.keys(matrix).sort((a, b) => territoryNames[a].localeCompare(territoryNames[b])), [matrix, territoryNames]);
  const themes = useMemo(() => Object.keys(themeMap).sort((a, b) => themeMap[a].localeCompare(themeMap[b])), [themeMap]);

  if (territories.length === 0) {
    return <p className="text-sm text-stone-500 italic">Sem dados para exibir a matriz.</p>;
  }

  return (
    <div className="overflow-x-auto rounded-3xl border border-white/60 bg-white/80 shadow-premium-md backdrop-blur-md">
      <table className="w-full text-left text-xs border-collapse">
        <thead>
          <tr className="bg-stone-100/50 border-b border-white/60">
            <th className="p-4 font-bold text-stone-900 border-r border-white/60 sticky left-0 bg-stone-100/90 backdrop-blur-sm z-10">Território</th>
            {themes.map((tId) => (
              <th key={tId} className="p-4 font-bold text-stone-900 whitespace-nowrap min-w-[120px] text-center">
                {themeMap[tId]}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {territories.map((tId) => (
            <tr key={tId} className="border-b border-white/40 hover:bg-white/40 transition-all duration-200">
              <td className="p-4 font-bold text-stone-900 border-r border-white/60 sticky left-0 bg-white/90 z-10 shadow-[2px_0_10px_rgba(0,0,0,0.03)]">
                {territoryNames[tId]}
              </td>
              {themes.map((themeId) => {
                const count = matrix[tId][themeId] || 0;
                const intensity = Math.min(count * 20, 100);
                return (
                  <td key={themeId} className="p-3 text-center">
                    <div 
                      className="inline-flex h-9 w-9 items-center justify-center rounded-xl font-bold transition-all shadow-premium-sm"
                      style={{ 
                        backgroundColor: count > 0 ? `rgba(16, 185, 129, ${intensity / 100})` : 'transparent',
                        color: intensity > 50 ? 'white' : '#10b981',
                        border: count > 0 ? 'none' : '1px solid rgba(255,255,255,0.6)'
                      }}
                    >
                      {count > 0 ? count : '-'}
                    </div>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
