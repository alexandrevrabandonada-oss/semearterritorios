"use client";

import { useEffect, useMemo, useState } from "react";
import { ClipboardList, Copy, CheckCircle2 } from "lucide-react";
import { getActionPilotMetrics, type ListeningRecordForPilot } from "@/lib/action-pilot";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";

type ActionSynthesisProps = {
  actionId: string;
};

export function ActionSynthesis({ actionId }: ActionSynthesisProps) {
  const supabase = useMemo(() => createBrowserSupabaseClient(), []);
  const [records, setRecords] = useState<ListeningRecordForPilot[]>([]);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState<string | null>(null);

  useEffect(() => {
    let ignore = false;
    async function load() {
      if (!supabase) return;
      
      const { data, error } = await supabase
        .from("listening_records")
        .select("*, listening_record_themes(themes:theme_id(id, name))")
        .eq("action_id", actionId);
        
      if (ignore) return;
      if (error) {
        console.error(error);
        setLoading(false);
        return;
      }
      
      setRecords((data ?? []) as ListeningRecordForPilot[]);
      setLoading(false);
    }
    void load();
    return () => { ignore = true; };
  }, [actionId, supabase]);

  if (loading) return <div className="p-5 text-sm text-stone-500">Carregando síntese...</div>;
  const data = getActionPilotMetrics(records);

  const shortText = `A ação registrou ${data.total} escuta(s), com ${data.reviewed} revisada(s) e ${data.draft} em rascunho. Os temas mais mencionados foram ${formatInline(data.topThemes.map((item) => item.label))}; as palavras recorrentes foram ${formatInline(data.topWords.map((item) => item.label))}.

Para a devolutiva, ainda devem ser observadas ${data.pending} pendência(s) de qualidade, incluindo rascunhos, campos incompletos ou possíveis dados sensíveis.`;

  const markdownText = `# Síntese Determinística da Ação

- Total de escutas: ${data.total}
- Revisadas: ${data.reviewed}
- Rascunhos: ${data.draft}

## Temas
${formatBullets(data.topThemes.map((item) => `${item.label} (${item.count})`))}

## Palavras recorrentes
${formatBullets(data.topWords.map((item) => `${item.label} (${item.count})`))}

## Lugares citados
${formatBullets(data.places.map((item) => `${item.label} (${item.count})`))}

## Prioridades
${formatBullets(data.priorities.map((item) => `${item.label} (${item.count})`))}

## Observações inesperadas
${formatBullets(data.unexpected)}

## Pendências
- Sem tema: ${data.withoutTheme}
- Sem resumo da equipe: ${data.withoutSummary}
- Sem prioridade: ${data.withoutPriority}
- Possível dado sensível: ${data.possibleSensitive}
`;

  const publicText = `# O que ouvimos na feira

Foram escutadas ${data.total} pessoa(s) nesta ação.

Temas mais mencionados: ${formatInline(data.topThemes.map((item) => item.label))}.

Palavras que apareceram: ${formatInline(data.topWords.map((item) => item.label))}.

O que será aprofundado depois: ${formatInline(data.priorities.map((item) => item.label))}.

Esta devolutiva não expõe falas identificáveis nem dados pessoais.`;

  const synthesisText = `SÍNTESE DA AÇÃO
Total de Escutas: ${data.total} (${data.reviewed} revisadas, ${data.pending} rascunhos pendentes)

TEMAS MAIS CITADOS:
${data.topThemes.length > 0 ? data.topThemes.map((item) => `${item.label} (${item.count})`).join(", ") : "Nenhum tema marcado."}

PALAVRAS RECORRENTES:
${data.topWords.length > 0 ? data.topWords.map((item) => `${item.label} (${item.count})`).join(", ") : "Não registradas."}

LUGARES CITADOS:
${formatBullets(data.places.map((item) => `${item.label} (${item.count})`), "Não citados.")}

PRIORIDADES APONTADAS:
${formatBullets(data.priorities.map((item) => `${item.label} (${item.count})`), "Não apontadas.")}

OBSERVAÇÕES INESPERADAS:
${formatBullets(data.unexpected, "Nenhuma.")}
`;

  async function handleCopy(label: string, text: string) {
    await navigator.clipboard.writeText(text);
    setCopied(label);
    setTimeout(() => setCopied(null), 2000);
  }

  return (
    <div className="mt-8 rounded-[2rem] border border-semear-green/15 bg-white p-6 shadow-soft">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-semear-green-soft text-semear-green">
            <ClipboardList className="h-5 w-5" />
          </div>
          <h3 className="text-lg font-semibold text-semear-green">Síntese Determinística da Ação</h3>
        </div>
        <div className="flex flex-wrap gap-2">
          <CopyButton copied={copied === "curto"} label="Texto curto" onClick={() => handleCopy("curto", shortText)} />
          <CopyButton copied={copied === "markdown"} label="Markdown" onClick={() => handleCopy("markdown", markdownText)} />
          <CopyButton copied={copied === "publica"} label="Devolutiva pública" onClick={() => handleCopy("publica", publicText)} />
        </div>
      </div>

      <pre className="whitespace-pre-wrap text-sm text-stone-700 bg-semear-offwhite p-5 rounded-2xl border border-semear-gray font-sans leading-7">
        {synthesisText}
      </pre>
    </div>
  );
}

function CopyButton({ copied, label, onClick }: { copied: boolean; label: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="inline-flex items-center gap-2 rounded-full border border-semear-green/15 bg-white px-4 py-2 text-sm font-semibold text-semear-green hover:bg-semear-green/5"
      type="button"
    >
      {copied ? <CheckCircle2 className="h-4 w-4 text-green-600" /> : <Copy className="h-4 w-4" />}
      {copied ? "Copiado!" : label}
    </button>
  );
}

function formatBullets(items: string[], emptyText = "Não registrado.") {
  return items.length > 0 ? items.map((item) => `- ${item}`).join("\n") : emptyText;
}

function formatInline(items: string[]) {
  return items.length > 0 ? items.slice(0, 5).join(", ") : "não registrado";
}
