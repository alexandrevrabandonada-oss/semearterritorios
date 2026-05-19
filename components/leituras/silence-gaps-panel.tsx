"use client";

import { useMemo } from "react";
import { AlertCircle, CheckCircle2, CircleDashed } from "lucide-react";

type Gap = {
  id: string;
  name: string;
  total: number;
  reviewed: number;
  status: string;
};

type SilenceGapsPanelProps = {
  gaps: Gap[];
};

export function SilenceGapsPanel({ gaps }: SilenceGapsPanelProps) {
  const semEscuta = gaps.filter(g => g.status === "sem_escuta");
  const poucaEscuta = gaps.filter(g => g.status === "pouca_escuta");
  const coberto = gaps.filter(g => g.status === "coberto");

  return (
    <div className="space-y-8">
      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-2xl border border-white/60 bg-white/80 p-5 shadow-premium-sm">
          <div className="flex items-center gap-3 text-stone-400 mb-2">
            <CircleDashed className="h-5 w-5" />
            <span className="text-xs font-extrabold uppercase tracking-wider text-stone-500">Sem escuta</span>
          </div>
          <p className="text-2xl font-extrabold text-stone-900">{semEscuta.length}</p>
          <p className="text-[10px] text-stone-600 mt-1 font-semibold">Bairros oficiais sem nenhum registro.</p>
        </div>
        
        <div className="rounded-2xl border border-amber-200 bg-amber-50/60 p-5 shadow-premium-sm">
          <div className="flex items-center gap-3 text-amber-600 mb-2">
            <AlertCircle className="h-5 w-5" />
            <span className="text-xs font-extrabold uppercase tracking-wider">Pouca escuta</span>
          </div>
          <p className="text-2xl font-extrabold text-amber-700">{poucaEscuta.length}</p>
          <p className="text-[10px] text-amber-600 mt-1 font-semibold">Bairros com menos de 5 escutas revisadas.</p>
        </div>

        <div className="rounded-2xl border border-semear-green/20 bg-semear-green-soft/40 p-5 shadow-premium-sm">
          <div className="flex items-center gap-3 text-semear-green mb-2">
            <CheckCircle2 className="h-5 w-5" />
            <span className="text-xs font-extrabold uppercase tracking-wider">Coberto</span>
          </div>
          <p className="text-2xl font-extrabold text-semear-green">{coberto.length}</p>
          <p className="text-[10px] text-semear-green mt-1 font-semibold">Bairros com amostragem inicial razoável.</p>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <div className="rounded-3xl border border-white/60 bg-white/60 p-6 shadow-premium-sm">
          <h4 className="text-sm font-extrabold text-stone-900 mb-4 uppercase tracking-wider">Territórios sem escuta</h4>
          <div className="flex flex-wrap gap-2">
            {semEscuta.length === 0 ? (
              <p className="text-xs text-stone-500 italic font-semibold">Todos os bairros possuem ao menos uma escuta.</p>
            ) : (
              semEscuta.map(g => (
                <span key={g.id} className="rounded-full border border-white/60 bg-white px-3 py-1 text-[10px] font-bold text-stone-700 shadow-premium-sm">
                  {g.name}
                </span>
              ))
            )}
          </div>
        </div>

        <div className="rounded-3xl border border-amber-200 bg-amber-50/45 p-6 shadow-premium-sm">
          <h4 className="text-sm font-extrabold text-amber-900 mb-4 uppercase tracking-wider">Lacunas de cobertura (Amostra baixa)</h4>
          <div className="space-y-2">
            {poucaEscuta.length === 0 ? (
              <p className="text-xs text-stone-500 italic font-semibold">Nenhuma lacuna crítica de amostragem.</p>
            ) : (
              poucaEscuta.map(g => (
                <div key={g.id} className="flex items-center justify-between gap-4 rounded-2xl border border-white/60 bg-white/80 p-3.5 shadow-premium-sm">
                  <span className="text-xs font-bold text-stone-700">{g.name}</span>
                  <div className="flex items-center gap-2">
                    <div className="h-2 w-24 rounded-full bg-stone-100/50 overflow-hidden border border-stone-200/20 shadow-inner">
                      <div 
                        className="h-full bg-amber-500 transition-all" 
                        style={{ width: `${(g.reviewed / 5) * 100}%` }}
                      ></div>
                    </div>
                    <span className="text-[10px] font-extrabold text-amber-700">{g.reviewed}/5</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-white/60 bg-white/80 p-5 shadow-premium-sm">
        <p className="text-[11px] leading-relaxed text-stone-600 font-semibold">
          <strong className="text-semear-green">Importante:</strong> O silêncio nos dados não significa ausência de problemas ou demandas no território. Significa que a equipe operacional ainda não alcançou uma amostra mínima que permita uma leitura coletiva segura para esse bairro. Priorize ações de campo nestes locais.
        </p>
      </div>
    </div>
  );
}
