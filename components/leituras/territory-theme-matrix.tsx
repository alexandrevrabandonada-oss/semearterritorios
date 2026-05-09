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
    <div className="overflow-x-auto rounded-2xl border border-stone-200 bg-white">
      <table className="w-full text-left text-xs border-collapse">
        <thead>
          <tr className="bg-stone-50 border-b border-stone-200">
            <th className="p-3 font-bold text-stone-900 border-r border-stone-200 sticky left-0 bg-stone-50 z-10">Território</th>
            {themes.map((tId) => (
              <th key={tId} className="p-3 font-bold text-stone-900 whitespace-nowrap min-w-[100px] text-center">
                {themeMap[tId]}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {territories.map((tId) => (
            <tr key={tId} className="border-b border-stone-100 hover:bg-stone-50/50 transition-colors">
              <td className="p-3 font-medium text-stone-900 border-r border-stone-200 sticky left-0 bg-white z-10 shadow-[2px_0_5px_rgba(0,0,0,0.05)]">
                {territoryNames[tId]}
              </td>
              {themes.map((themeId) => {
                const count = matrix[tId][themeId] || 0;
                const intensity = Math.min(count * 20, 100);
                return (
                  <td key={themeId} className="p-3 text-center">
                    <div 
                      className="inline-flex h-8 w-8 items-center justify-center rounded-lg font-bold transition-all"
                      style={{ 
                        backgroundColor: count > 0 ? `rgba(16, 185, 129, ${intensity / 100})` : 'transparent',
                        color: intensity > 50 ? 'white' : '#10b981',
                        border: count > 0 ? 'none' : '1px solid #f3f4f6'
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
