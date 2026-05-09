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
        <div className="rounded-2xl border border-stone-100 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-3 text-stone-400 mb-2">
            <CircleDashed className="h-5 w-5" />
            <span className="text-xs font-bold uppercase tracking-wider">Sem escuta</span>
          </div>
          <p className="text-2xl font-bold text-stone-900">{semEscuta.length}</p>
          <p className="text-[10px] text-stone-500 mt-1">Bairros oficiais sem nenhum registro.</p>
        </div>
        
        <div className="rounded-2xl border border-amber-100 bg-amber-50/30 p-5 shadow-sm">
          <div className="flex items-center gap-3 text-amber-600 mb-2">
            <AlertCircle className="h-5 w-5" />
            <span className="text-xs font-bold uppercase tracking-wider">Pouca escuta</span>
          </div>
          <p className="text-2xl font-bold text-amber-700">{poucaEscuta.length}</p>
          <p className="text-[10px] text-amber-600 mt-1">Bairros com menos de 5 escutas revisadas.</p>
        </div>

        <div className="rounded-2xl border border-semear-green/10 bg-semear-green-soft/20 p-5 shadow-sm">
          <div className="flex items-center gap-3 text-semear-green mb-2">
            <CheckCircle2 className="h-5 w-5" />
            <span className="text-xs font-bold uppercase tracking-wider">Coberto</span>
          </div>
          <p className="text-2xl font-bold text-semear-green">{coberto.length}</p>
          <p className="text-[10px] text-semear-green mt-1">Bairros com amostragem inicial razoável.</p>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <div className="rounded-2xl border border-stone-100 bg-stone-50/30 p-6">
          <h4 className="text-sm font-bold text-stone-900 mb-4">Territórios sem escuta</h4>
          <div className="flex flex-wrap gap-2">
            {semEscuta.length === 0 ? (
              <p className="text-xs text-stone-500 italic">Todos os bairros possuem ao menos uma escuta.</p>
            ) : (
              semEscuta.map(g => (
                <span key={g.id} className="rounded-full bg-white border border-stone-200 px-3 py-1 text-[10px] font-medium text-stone-600">
                  {g.name}
                </span>
              ))
            )}
          </div>
        </div>

        <div className="rounded-2xl border border-amber-100 bg-amber-50/20 p-6">
          <h4 className="text-sm font-bold text-amber-900 mb-4">Lacunas de cobertura (Amostra baixa)</h4>
          <div className="space-y-2">
            {poucaEscuta.length === 0 ? (
              <p className="text-xs text-stone-500 italic">Nenhuma lacuna crítica de amostragem.</p>
            ) : (
              poucaEscuta.map(g => (
                <div key={g.id} className="flex items-center justify-between gap-4 rounded-xl bg-white p-3 shadow-xs">
                  <span className="text-xs font-bold text-stone-700">{g.name}</span>
                  <div className="flex items-center gap-2">
                    <div className="h-1.5 w-24 rounded-full bg-stone-100 overflow-hidden">
                      <div 
                        className="h-full bg-amber-500 transition-all" 
                        style={{ width: `${(g.reviewed / 5) * 100}%` }}
                      ></div>
                    </div>
                    <span className="text-[10px] font-bold text-amber-700">{g.reviewed}/5</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-stone-200 bg-stone-100/50 p-4">
        <p className="text-[11px] leading-relaxed text-stone-600">
          <strong>Importante:</strong> O silêncio nos dados não significa ausência de problemas ou demandas no território. Significa que a equipe operacional ainda não alcançou uma amostra mínima que permita uma leitura coletiva segura para esse bairro. Priorize ações de campo nestes locais.
        </p>
      </div>
    </div>
  );
}
