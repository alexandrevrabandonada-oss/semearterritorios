"use client";

import { Copy, Filter } from "lucide-react";
import { useState } from "react";

type LeiturasHeaderProps = {
  overview: any;
  territoryDist: any;
  themeMatrix: any;
  wordSummary: any;
  gaps: any;
};

export function LeiturasHeader({ overview, territoryDist, themeMatrix, wordSummary, gaps }: LeiturasHeaderProps) {
  const [copying, setCopying] = useState(false);

  const copySynthesis = () => {
    setCopying(true);
    
    const topTerritories = territoryDist.slice(0, 5).map((t: any) => `${t.name} (${t.count})`).join(", ");
    
    const topThemesRaw: Record<string, number> = {};
    Object.values(themeMatrix.matrix).forEach((row: any) => {
      Object.entries(row).forEach(([tId, count]) => {
        topThemesRaw[tId] = (topThemesRaw[tId] || 0) + (count as number);
      });
    });
    const topThemes = Object.entries(topThemesRaw)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([tId, count]) => `${themeMatrix.themeMap[tId]} (${count})`)
      .join(", ");

    const text = `
# Leitura Coletiva das Escutas - SEMEAR Territórios

## Panorama Geral
- Total de escutas: ${overview.total_records}
- Escutas revisadas: ${overview.reviewed_records}
- Territórios alcançados: ${overview.territories_reached}

## Territórios mais escutados (Referência)
${topTerritories}

## Temas recorrentes
${topThemes}

## Silêncios e Lacunas Críticas
${gaps.filter((g: any) => g.status === "sem_escuta").slice(0, 5).map((g: any) => g.name).join(", ")}

---
*Relatório gerado automaticamente para síntese operacional. Não contém dados sensíveis ou pontos individuais.*
    `.trim();

    navigator.clipboard.writeText(text);
    setTimeout(() => setCopying(false), 2000);
  };

  return (
    <header className="rounded-[2rem] border border-white/80 bg-white/78 p-6 shadow-soft sm:p-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-semear-earth">Análise Territorial</p>
          <h1 className="mt-3 text-4xl font-semibold tracking-tight text-semear-green">Leituras Coletivas</h1>
          <p className="mt-4 max-w-2xl text-sm leading-6 text-stone-600">
            Visualização agregada das escutas para análise política e territorial. 
            Estes dados representam percepções coletadas em campo, não um censo estatístico.
          </p>
        </div>
        <div className="flex gap-2">
          <button 
            onClick={copySynthesis}
            className="inline-flex items-center gap-2 rounded-full border border-stone-200 bg-white px-4 py-2 text-sm font-bold text-stone-700 hover:bg-stone-50 transition-all shadow-sm"
          >
            <Copy className={copying ? "h-4 w-4 text-semear-green" : "h-4 w-4"} />
            {copying ? "Copiado!" : "Copiar Síntese"}
          </button>
          <button className="inline-flex items-center gap-2 rounded-full bg-semear-green px-4 py-2 text-sm font-bold text-white hover:bg-semear-green/90 transition-all shadow-sm">
            <Filter className="h-4 w-4" />
            Filtros
          </button>
        </div>
      </div>
    </header>
  );
}
