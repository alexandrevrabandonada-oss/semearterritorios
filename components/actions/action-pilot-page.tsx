"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeft, ClipboardCheck, FileText, Keyboard, SearchCheck } from "lucide-react";
import { ActionOperationChecklist } from "@/components/actions/action-operation-checklist";
import { ActionReadinessPanel } from "@/components/actions/action-readiness-panel";
import {
  getActionPilotMetrics,
  getActionReadiness,
  getOperationRecommendation,
  type ActionForPilot,
  type ListeningRecordForPilot
} from "@/lib/action-pilot";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";

type Props = {
  actionId: string;
};

export function ActionPilotPage({ actionId }: Props) {
  const supabase = useMemo(() => createBrowserSupabaseClient(), []);
  const [action, setAction] = useState<ActionForPilot | null>(null);
  const [records, setRecords] = useState<ListeningRecordForPilot[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let ignore = false;

    async function load() {
      if (!supabase) {
        setError("Configure NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_ANON_KEY para abrir o piloto.");
        setLoading(false);
        return;
      }

      const [actionResult, recordsResult] = await Promise.all([
        supabase.from("actions").select("*, neighborhoods:neighborhood_id(id, name)").eq("id", actionId).single(),
        supabase
          .from("listening_records")
          .select("*, listening_record_themes(themes:theme_id(id, name))")
          .eq("action_id", actionId)
          .order("created_at", { ascending: true })
      ]);

      if (ignore) return;

      if (actionResult.error || recordsResult.error) {
        setError(actionResult.error?.message ?? recordsResult.error?.message ?? "Erro ao carregar piloto.");
        setLoading(false);
        return;
      }

      setAction(actionResult.data as ActionForPilot);
      setRecords((recordsResult.data ?? []) as ListeningRecordForPilot[]);
      setLoading(false);
    }

    void load();
    return () => {
      ignore = true;
    };
  }, [actionId, supabase]);

  if (loading) return <section className="rounded-[2rem] bg-white/72 p-8 shadow-soft">Carregando piloto...</section>;
  if (error || !action) return <section className="rounded-[2rem] border border-red-200 bg-red-50 p-8 text-sm text-red-800">{error ?? "Ação não encontrada."}</section>;

  const metrics = getActionPilotMetrics(records);
  const readiness = getActionReadiness(records);
  const recommendation = getOperationRecommendation(readiness);

  return (
    <section className="pb-10">
      <div className="mb-5 flex flex-wrap gap-3">
        <Link className="inline-flex min-h-11 items-center gap-2 rounded-full border border-semear-green/15 bg-white/70 px-4 text-sm font-semibold text-semear-green" href={`/acoes/${actionId}`}>
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          Voltar para ação
        </Link>
        <Link className="inline-flex min-h-11 items-center gap-2 rounded-full bg-semear-green px-4 text-sm font-semibold text-white" href="/escutas/lote">
          <Keyboard className="h-4 w-4" aria-hidden="true" />
          Digitar mais fichas
        </Link>
        <Link className="inline-flex min-h-11 items-center gap-2 rounded-full border border-semear-green/15 bg-white px-4 text-sm font-semibold text-semear-green" href={`/escutas?actionId=${actionId}&status=draft`}>
          <SearchCheck className="h-4 w-4" aria-hidden="true" />
          Revisar escutas
        </Link>
      </div>

      <article className="rounded-[2rem] border border-white/80 bg-white/78 p-6 shadow-soft">
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-semear-earth">Piloto controlado</p>
        <h2 className="mt-3 text-3xl font-semibold tracking-tight text-semear-green">Piloto da Banca de Escuta</h2>
        <p className="mt-2 text-sm leading-6 text-stone-600">
          {action.title} · {action.neighborhoods?.name ?? "sem bairro definido"} · rascunhos são fichas digitadas; revisadas são fichas conferidas pela equipe.
        </p>
        <p className="mt-2 text-sm leading-6 text-stone-600">
          Use este painel para decidir o pós-banca. Mapa geográfico real só deve avançar depois de dados revisados e agregados.
        </p>
      </article>

      <div className="mt-6 grid gap-5 lg:grid-cols-2">
        <ActionReadinessPanel records={records} />
        <ActionOperationChecklist action={action} records={records} />
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Metric label="Total digitado" value={metrics.total} />
        <Metric label="Em rascunho" value={metrics.draft} />
        <Metric label="Revisadas" value={metrics.reviewed} />
        <Metric label="Possível dado sensível" value={metrics.possibleSensitive} danger={metrics.possibleSensitive > 0} />
        <Metric label="Sem tema" value={metrics.withoutTheme} danger={metrics.withoutTheme > 0} />
        <Metric label="Sem resumo da equipe" value={metrics.withoutSummary} danger={metrics.withoutSummary > 0} />
        <Metric label="Sem prioridade" value={metrics.withoutPriority} danger={metrics.withoutPriority > 0} />
        <Metric label="Fala muito curta" value={metrics.veryShort} danger={metrics.veryShort > 0} />
      </div>

      <div className="mt-6 grid gap-5 lg:grid-cols-2">
        <ListPanel title="Temas mais citados" items={metrics.topThemes.map((item) => `${item.label} (${item.count})`)} />
        <ListPanel title="Palavras recorrentes" items={metrics.topWords.map((item) => `${item.label} (${item.count})`)} />
        <ListPanel title="Lugares mencionados" items={metrics.places.map((item) => `${item.label} (${item.count})`)} />
        <ListPanel title="Prioridades apontadas" items={metrics.priorities.map((item) => `${item.label} (${item.count})`)} />
        <ListPanel title="Observações inesperadas" items={metrics.unexpected} />
        <section className="rounded-[2rem] border border-semear-green/15 bg-white p-6 shadow-soft">
          <div className="flex items-center gap-3">
            <ClipboardCheck className="h-5 w-5 text-semear-green" aria-hidden="true" />
            <h3 className="font-semibold text-semear-green">Relatório da Operação da Banca</h3>
          </div>
          <dl className="mt-5 space-y-3 text-sm text-stone-700">
            <Row label="Primeira digitação" value={records[0]?.created_at ? new Date(records[0].created_at).toLocaleString("pt-BR") : "Sem fichas"} />
            <Row label="Última digitação" value={records.at(-1)?.created_at ? new Date(records.at(-1)!.created_at).toLocaleString("pt-BR") : "Sem fichas"} />
            <Row label="Pendências" value={`${metrics.pending} item(ns) para revisar`} />
            <Row label="Recomendação" value={recommendation} />
          </dl>
        </section>
      </div>
    </section>
  );
}

function Metric({ label, value, danger = false }: { label: string; value: number; danger?: boolean }) {
  return (
    <div className={`rounded-3xl border p-5 shadow-soft ${danger ? "border-red-100 bg-red-50" : "border-white/80 bg-white"}`}>
      <p className={`text-sm font-medium ${danger ? "text-red-800" : "text-stone-600"}`}>{label}</p>
      <strong className={`mt-2 block text-3xl font-semibold ${danger ? "text-red-800" : "text-semear-green"}`}>{value}</strong>
    </div>
  );
}

function ListPanel({ title, items }: { title: string; items: string[] }) {
  return (
    <section className="rounded-[2rem] border border-white/80 bg-white p-6 shadow-soft">
      <div className="flex items-center gap-3">
        <FileText className="h-5 w-5 text-semear-green" aria-hidden="true" />
        <h3 className="font-semibold text-semear-green">{title}</h3>
      </div>
      {items.length > 0 ? (
        <ul className="mt-4 space-y-2 text-sm leading-6 text-stone-700">
          {items.map((item) => <li key={item}>{item}</li>)}
        </ul>
      ) : (
        <p className="mt-4 text-sm text-stone-500">Nada registrado.</p>
      )}
    </section>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-semear-gray pb-3 last:border-0">
      <dt className="font-semibold text-semear-green">{label}</dt>
      <dd className="text-right">{value}</dd>
    </div>
  );
}
