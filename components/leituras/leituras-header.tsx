"use client";

import { Copy, Filter, ShieldCheck, X } from "lucide-react";
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
  const [modalOpen, setModalOpen] = useState(false);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [creatingSnapshot, setCreatingSnapshot] = useState(false);
  const [confirmReady, setConfirmReady] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);
  const [preview, setPreview] = useState<null | {
    period: { start: string | null; end: string | null };
    reviewed_total: number;
    territories_reached: number;
    top_themes: Array<{ theme: string; count: number }>;
    top_words: Array<{ word: string; count: number }>;
    silences: Array<{ territory: string; reviewed: number; public_status: string }>;
    methodology_note: string;
    include_list: string[];
    exclude_list: string[];
    alerts: string[];
  }>(null);

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

  async function openSnapshotModal() {
    setModalError(null);
    setModalOpen(true);
    setLoadingPreview(true);
    setConfirmReady(false);

    const response = await fetch("/api/transparencia/snapshots/from-leituras", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mode: "preview", filters: {} })
    });

    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      setModalError(payload.error ?? "Não foi possível montar a prévia do snapshot.");
      setLoadingPreview(false);
      return;
    }

    setPreview(payload.preview ?? null);
    setLoadingPreview(false);
  }

  async function createSnapshotDraft() {
    setCreatingSnapshot(true);
    setModalError(null);

    const response = await fetch("/api/transparencia/snapshots/from-leituras", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mode: "create", filters: {} })
    });

    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      setModalError(payload.error ?? "Falha ao criar snapshot draft.");
      setCreatingSnapshot(false);
      return;
    }

    window.location.href = payload.redirect_to;
  }

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
          <button
            onClick={() => void openSnapshotModal()}
            className="inline-flex items-center gap-2 rounded-full bg-stone-900 px-4 py-2 text-sm font-bold text-white hover:bg-stone-800 transition-all shadow-sm"
          >
            <ShieldCheck className="h-4 w-4" />
            Preparar snapshot da Transparência Viva
          </button>
        </div>
      </div>

      {modalOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-950/50 p-3 sm:p-6">
          <div className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-3xl border border-white/80 bg-white p-4 shadow-soft sm:p-6">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="text-lg font-semibold text-semear-green">Prévia segura do snapshot</h3>
                <p className="mt-1 text-sm text-stone-600">O snapshot será criado como rascunho interno e precisará de revisão antes de publicação.</p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setModalOpen(false);
                  setModalError(null);
                }}
                className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-semear-gray text-stone-600"
                aria-label="Fechar modal"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {loadingPreview ? <p className="mt-4 text-sm text-stone-600">Montando prévia...</p> : null}

            {preview ? (
              <div className="mt-4 space-y-4">
                <div className="grid gap-3 sm:grid-cols-2">
                  <Mini label="Período" value={`${preview.period.start ?? "-"} até ${preview.period.end ?? "-"}`} />
                  <Mini label="Escutas revisadas" value={String(preview.reviewed_total)} />
                  <Mini label="Territórios alcançados" value={String(preview.territories_reached)} />
                  <Mini label="Silêncios/lacunas" value={String(preview.silences.length)} />
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="rounded-2xl border border-semear-gray bg-semear-offwhite p-3">
                    <p className="text-xs font-semibold uppercase tracking-[0.12em] text-stone-500">Temas principais</p>
                    <ul className="mt-2 space-y-1 text-sm text-stone-700">
                      {preview.top_themes.slice(0, 6).map((item) => (
                        <li key={item.theme}>{item.theme} ({item.count})</li>
                      ))}
                    </ul>
                  </div>
                  <div className="rounded-2xl border border-semear-gray bg-semear-offwhite p-3">
                    <p className="text-xs font-semibold uppercase tracking-[0.12em] text-stone-500">Palavras recorrentes</p>
                    <ul className="mt-2 space-y-1 text-sm text-stone-700">
                      {preview.top_words.slice(0, 8).map((item) => (
                        <li key={item.word}>{item.word} ({item.count})</li>
                      ))}
                    </ul>
                  </div>
                </div>

                <div className="rounded-2xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
                  <p className="font-semibold">Aviso metodológico</p>
                  <p className="mt-1">{preview.methodology_note}</p>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="rounded-2xl border border-green-200 bg-green-50 p-3">
                    <p className="text-sm font-semibold text-green-800">Será incluído</p>
                    <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-green-900">
                      {preview.include_list.map((item) => <li key={item}>{item}</li>)}
                    </ul>
                  </div>
                  <div className="rounded-2xl border border-red-200 bg-red-50 p-3">
                    <p className="text-sm font-semibold text-red-800">Nunca será incluído</p>
                    <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-red-900">
                      {preview.exclude_list.map((item) => <li key={item}>{item}</li>)}
                    </ul>
                  </div>
                </div>

                <div className="rounded-2xl border border-stone-200 bg-white p-3">
                  <p className="text-sm font-semibold text-stone-700">Alertas automáticos</p>
                  <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-stone-600">
                    {preview.alerts.map((item) => <li key={item}>{item}</li>)}
                  </ul>
                </div>

                <label className="flex items-start gap-3 rounded-2xl border border-semear-gray bg-semear-offwhite p-3 text-sm text-stone-700">
                  <input
                    type="checkbox"
                    className="mt-1 h-4 w-4 accent-semear-green"
                    checked={confirmReady}
                    onChange={(event) => setConfirmReady(event.target.checked)}
                  />
                  <span>Entendo que este snapshot será rascunho interno e precisará de revisão antes de publicação.</span>
                </label>
              </div>
            ) : null}

            {modalError ? <p className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800">{modalError}</p> : null}

            <div className="mt-5 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => {
                  setModalOpen(false);
                  setModalError(null);
                }}
                className="inline-flex min-h-11 items-center rounded-full border border-semear-green/15 bg-white px-4 text-sm font-semibold text-semear-green"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={!confirmReady || creatingSnapshot || loadingPreview}
                onClick={() => void createSnapshotDraft()}
                className="inline-flex min-h-11 items-center rounded-full bg-semear-green px-4 text-sm font-semibold text-white disabled:opacity-60"
              >
                {creatingSnapshot ? "Criando rascunho..." : "Criar snapshot draft"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </header>
  );
}

function Mini({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-semear-gray bg-semear-offwhite p-3">
      <p className="text-xs font-semibold uppercase tracking-[0.12em] text-stone-500">{label}</p>
      <p className="mt-1 text-sm font-semibold text-semear-green">{value}</p>
    </div>
  );
}
