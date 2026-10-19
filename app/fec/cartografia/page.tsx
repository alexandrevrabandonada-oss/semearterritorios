"use client";

import { useState } from "react";
import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import {
  buildFecFieldDraftMarkdown,
  emptyFecFieldDraft,
  fecFieldTypes,
  validateFecFieldDraft,
  type FecFieldDraft,
  type FecFieldType,
  type ParticipationKind,
} from "@/lib/fec-field-protocol";

type Step = 1 | 2 | 3;

const fieldStyle = "mt-1 w-full rounded-xl border border-stone-300 bg-white px-3 py-3 text-sm text-stone-900 outline-none focus:border-semear-green focus:ring-2 focus:ring-semear-green/20";
const labelStyle = "block text-sm font-semibold text-stone-700";

export default function FecCartografiaPage() {
  const [draft, setDraft] = useState<FecFieldDraft>({ ...emptyFecFieldDraft });
  const [step, setStep] = useState<Step>(1);
  const [errors, setErrors] = useState<string[]>([]);
  const [preview, setPreview] = useState("");
  const [copyStatus, setCopyStatus] = useState("");

  function update<K extends keyof FecFieldDraft>(key: K, value: FecFieldDraft[K]) {
    setDraft(previous => ({ ...previous, [key]: value }));
    setErrors([]);
    setPreview("");
    setCopyStatus("");
  }

  function generate() {
    const issues = validateFecFieldDraft(draft);
    setErrors(issues);
    if (issues.length) {
      setPreview("");
      return;
    }
    setPreview(buildFecFieldDraftMarkdown(draft));
    setCopyStatus("");
  }

  async function copyDraft() {
    if (!preview) return;
    try {
      await navigator.clipboard.writeText(preview);
      setCopyStatus("Minuta copiada. Guarde-a em um documento institucional privado.");
    } catch {
      setCopyStatus("Não foi possível copiar automaticamente. Selecione e copie o texto abaixo.");
    }
  }

  return (
    <AppShell activeHref="/fec/cartografia">
      <section className="pb-12">
        <header className="rounded-[2rem] border border-white/80 bg-white/90 px-6 py-7 shadow-soft">
          <p className="text-xs font-bold uppercase tracking-[0.19em] text-semear-earth">Frente técnica FEC · Versão de teste</p>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight text-semear-green">Cartografia social e diagnóstico participativo</h1>
          <p className="mt-3 max-w-4xl text-sm leading-7 text-stone-700">
            Protocolo orientado para o profissional contratado diretamente pela FEC. As oficinas e mapas desta frente
            possuem origem e entregas próprias; não substituem as bancas de escuta, rodas de conversa e mobilização executadas pela APS.
          </p>
          <div role="status" className="mt-5 rounded-2xl border border-amber-300 bg-amber-50 p-4 text-sm leading-6 text-amber-950">
            <strong>Prévia sem salvamento:</strong> esta tela organiza uma minuta apenas na memória do navegador.
            Não envia nem salva dados no SEMEAR, não substitui o relatório contratual da FEC e não deve receber nomes, endereços pessoais,
            contatos ou fotografias identificáveis. Copie o texto antes de sair. Ainda não existe vínculo com ciclos e produtos oficiais.
          </div>
          <div className="mt-4 flex flex-wrap gap-3 text-sm font-semibold">
            <Link className="text-semear-green underline underline-offset-4" href="/memoria">Consultar memória atual</Link>
            <Link className="text-semear-green underline underline-offset-4" href="/territorios">Consultar territórios</Link>
          </div>
        </header>

        <div className="mt-6 grid gap-3 sm:grid-cols-3" aria-label="Etapas do protocolo">
          {([
            [1, "1. Contexto e pergunta"],
            [2, "2. Oficina ou atividade"],
            [3, "3. Conhecimento produzido"],
          ] as const).map(([number, title]) => (
            <button
              type="button"
              key={number}
              onClick={() => setStep(number)}
              aria-current={step === number ? "step" : undefined}
              className={"rounded-xl border p-4 text-left text-sm font-semibold transition " +
                (step === number ? "border-semear-green bg-semear-green text-white" : "border-stone-200 bg-white text-stone-700 hover:border-semear-green/40")}
            >
              {title}
            </button>
          ))}
        </div>

        <div className="mt-5 rounded-[2rem] border border-white/80 bg-white p-6 shadow-soft">
          {step === 1 && (
            <div className="space-y-5">
              <h2 className="text-xl font-semibold text-semear-green">Qual território e qual questão?</h2>
              <TextField label="Território / bairro (sem endereço pessoal)" value={draft.territory} onChange={value => update("territory", value)} />
              <AreaField label="Pergunta orientadora da leitura territorial" value={draft.question} onChange={value => update("question", value)} hint="Ex.: como participantes relacionam ambiente, ar e cotidiano no território?" />
              <p className="text-sm leading-6 text-stone-600">Ao integrar com o banco, esta etapa deverá apontar para o ciclo técnico e o bairro oficial, sem criar um bairro duplicado.</p>
              <div className="flex justify-end"><button type="button" className="rounded-xl bg-semear-green px-5 py-3 text-sm font-semibold text-white" onClick={() => setStep(2)}>Continuar</button></div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-5">
              <h2 className="text-xl font-semibold text-semear-green">O que foi efetivamente realizado?</h2>
              <div className="grid gap-4 md:grid-cols-2">
                <label className={labelStyle}>Data da atividade
                  <input className={fieldStyle} type="date" value={draft.activityDate} onChange={e => update("activityDate", e.target.value)} />
                </label>
                <label className={labelStyle}>Tipo de atividade
                  <select className={fieldStyle} value={draft.activityType} onChange={e => update("activityType", e.target.value as FecFieldType)}>
                    {fecFieldTypes.map(type => <option key={type.value} value={type.value}>{type.label}</option>)}
                  </select>
                </label>
              </div>
              <AreaField label="Objetivo pedagógico e territorial" value={draft.objective} onChange={value => update("objective", value)} />
              <AreaField label="Metodologia efetivamente utilizada" value={draft.methodology} onChange={value => update("methodology", value)} hint="Descreva técnicas, dinâmica coletiva, materiais e limites de participação." />
              <div className="grid gap-4 md:grid-cols-2">
                <label className={labelStyle}>Tipo de participação
                  <select className={fieldStyle} value={draft.participationKind} onChange={e => {
                    const kind = e.target.value as ParticipationKind;
                    setDraft(previous => ({ ...previous, participationKind: kind, participantCount: kind === "not_recorded" ? "" : previous.participantCount }));
                    setErrors([]); setPreview("");
                  }}>
                    <option value="not_recorded">Não registrada</option>
                    <option value="estimated">Estimativa de participações</option>
                    <option value="recorded">Contagem registrada de participações</option>
                  </select>
                </label>
                <label className={labelStyle}>Número de participações (não pessoas únicas)
                  <input className={fieldStyle} type="number" min="0" step="1" disabled={draft.participationKind === "not_recorded"} value={draft.participantCount} onChange={e => update("participantCount", e.target.value)} />
                </label>
              </div>
              <div className="flex justify-between gap-2">
                <button type="button" className="rounded-xl border border-stone-300 px-5 py-3 text-sm font-semibold" onClick={() => setStep(1)}>Voltar</button>
                <button type="button" className="rounded-xl bg-semear-green px-5 py-3 text-sm font-semibold text-white" onClick={() => setStep(3)}>Continuar</button>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-5">
              <h2 className="text-xl font-semibold text-semear-green">Que conhecimento foi produzido?</h2>
              <p className="text-sm leading-6 text-stone-600">
                Separe relatos, observações da equipe e referências externas. Não atribua causalidade a percepções.
                Identificadores pessoais, arquivos e pontos sensíveis deverão ser tratados no fluxo privado oficial.
              </p>
              <AreaField label="Relatos coletivos de participantes (sem identificação)" value={draft.participantAccounts} onChange={value => update("participantAccounts", value)} />
              <AreaField label="Observações diretas da equipe" value={draft.teamObservations} onChange={value => update("teamObservations", value)} />
              <AreaField label="Referências de medição, documentos ou pesquisas" value={draft.externalSources} onChange={value => update("externalSources", value)} />
              <div className="grid gap-4 md:grid-cols-2">
                <AreaField label="Cartografia — método de construção" value={draft.mapMethod} onChange={value => update("mapMethod", value)} />
                <AreaField label="Cartografia — legenda e suas categorias" value={draft.mapLegend} onChange={value => update("mapLegend", value)} />
              </div>
              <AreaField label="Achado preliminar com fonte mencionada acima" value={draft.finding} onChange={value => update("finding", value)} />
              <AreaField label="Proposta ou encaminhamento decorrente" value={draft.proposal} onChange={value => update("proposal", value)} />
              <AreaField label="Limites, divergências e cautelas" value={draft.limits} onChange={value => update("limits", value)} />
              <AreaField label="Próximos passos / devolutiva" value={draft.nextSteps} onChange={value => update("nextSteps", value)} />
              <div className="flex flex-wrap items-center justify-between gap-3">
                <button type="button" className="rounded-xl border border-stone-300 px-5 py-3 text-sm font-semibold" onClick={() => setStep(2)}>Voltar</button>
                <button type="button" className="rounded-xl bg-semear-green px-5 py-3 text-sm font-semibold text-white" onClick={generate}>Validar e gerar minuta</button>
              </div>
            </div>
          )}

          {errors.length > 0 && (
            <div role="alert" className="mt-6 rounded-2xl border border-rose-300 bg-rose-50 p-4">
              <h3 className="font-semibold text-rose-900">Corrigir antes de gerar a minuta</h3>
              <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-rose-900">
                {errors.map(message => <li key={message}>{message}</li>)}
              </ul>
            </div>
          )}
        </div>

        {preview && (
          <section className="mt-6 rounded-[2rem] border border-white/80 bg-white p-6 shadow-soft">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-xl font-semibold text-semear-green">Minuta do registro — não enviada</h2>
              <button type="button" className="rounded-xl bg-semear-green px-5 py-3 text-sm font-semibold text-white" onClick={() => void copyDraft()}>Copiar minuta</button>
            </div>
            {copyStatus && <p role="status" className="mt-3 text-sm text-stone-700">{copyStatus}</p>}
            <pre className="mt-4 max-h-[34rem] overflow-auto whitespace-pre-wrap break-words rounded-xl border bg-stone-50 p-4 font-mono text-xs leading-6 text-stone-800">{preview}</pre>
          </section>
        )}
      </section>
    </AppShell>
  );
}

function TextField({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return <label className={labelStyle}>{label}<input className={fieldStyle} type="text" value={value} onChange={e => onChange(e.target.value)} /></label>;
}

function AreaField({ label, value, onChange, hint }: { label: string; value: string; onChange: (value: string) => void; hint?: string }) {
  return <label className={labelStyle}>{label}{hint && <span className="mt-1 block text-xs font-normal text-stone-500">{hint}</span>}<textarea className={fieldStyle} rows={3} value={value} onChange={e => onChange(e.target.value)} /></label>;
}