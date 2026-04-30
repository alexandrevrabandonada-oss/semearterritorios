"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { AlertTriangle, ArrowLeft, CalendarDays, Edit3, FileText, FlaskConical, FolderCheck, MapPin, UsersRound } from "lucide-react";
import { ActionForm } from "@/components/actions/action-form";
import { ActionOperationChecklist } from "@/components/actions/action-operation-checklist";
import { ActionReadinessPanel } from "@/components/actions/action-readiness-panel";
import { ActionSynthesis } from "@/components/actions/action-synthesis";
import { getActionPilotMetrics, type ListeningRecordForPilot } from "@/lib/action-pilot";
import { getClosureStatusLabel } from "@/lib/action-closures";
import type { Action, ActionClosure, ActionDebrief, ActionStatus, ActionType, Neighborhood } from "@/lib/database.types";
import { getActionStatusLabel, getActionTypeLabel } from "@/lib/actions";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";

type ActionWithNeighborhood = Action & {
  neighborhoods: Pick<Neighborhood, "id" | "name"> | null;
};

type ActionDetailProps = {
  actionId: string;
};

export function ActionDetail({ actionId }: ActionDetailProps) {
  const supabase = useMemo(() => createBrowserSupabaseClient(), []);
  const [action, setAction] = useState<ActionWithNeighborhood | null>(null);
  const [records, setRecords] = useState<ListeningRecordForPilot[]>([]);
  const [debrief, setDebrief] = useState<ActionDebrief | null>(null);
  const [closure, setClosure] = useState<ActionClosure | null>(null);
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let ignore = false;

    async function loadAction() {
      if (!supabase) {
        setError("Configure NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_ANON_KEY para ver ações.");
        setLoading(false);
        return;
      }

      setLoading(true);
      const [result, recordsResult, debriefResult, closureResult] = await Promise.all([
        supabase
          .from("actions")
          .select("*, neighborhoods:neighborhood_id(id, name)")
          .eq("id", actionId)
          .single(),
        supabase
          .from("listening_records")
          .select("*, listening_record_themes(themes:theme_id(id, name))")
          .eq("action_id", actionId),
        supabase.from("action_debriefs").select("*").eq("action_id", actionId).maybeSingle(),
        supabase.from("action_closures").select("*").eq("action_id", actionId).maybeSingle()
      ]);

      if (ignore) {
        return;
      }

      if (result.error || recordsResult.error || debriefResult.error || closureResult.error) {
        setError(result.error?.message ?? recordsResult.error?.message ?? debriefResult.error?.message ?? closureResult.error?.message ?? "Erro ao carregar ação.");
        setLoading(false);
        return;
      }

      setAction(result.data as ActionWithNeighborhood);
      setRecords((recordsResult.data ?? []) as ListeningRecordForPilot[]);
      setDebrief(debriefResult.data as ActionDebrief | null);
      setClosure(closureResult.data as ActionClosure | null);
      setLoading(false);
    }

    void loadAction();

    return () => {
      ignore = true;
    };
  }, [actionId, supabase]);

  if (editing) {
    return <ActionForm actionId={actionId} mode="edit" />;
  }

  if (loading) {
    return (
      <section className="rounded-[2rem] border border-white/80 bg-white/72 p-8 shadow-soft">
        <p className="text-sm font-medium text-stone-600">Carregando ação...</p>
      </section>
    );
  }

  if (error || !action) {
    return (
      <section className="rounded-[2rem] border border-red-200 bg-red-50 p-8 text-sm text-red-800">
        {error ?? "Ação não encontrada."}
      </section>
    );
  }

  const detailItems = [
    ["Tipo", getActionTypeLabel(action.action_type as ActionType)],
    ["Status", getActionStatusLabel(action.status as ActionStatus)],
    ["Local", action.location_reference ?? "Não informado"],
    ["Equipe", action.team ?? "Não informada"],
    ["Público estimado", action.estimated_public?.toString() ?? "Não informado"]
  ];
  const metrics = getActionPilotMetrics(records);
  const reviewedPercent = metrics.total > 0 ? Math.round((metrics.reviewed / metrics.total) * 100) : 0;

  return (
    <section className="pb-10">
      <div className="mb-5 flex flex-wrap gap-3">
        <Link
          className="inline-flex min-h-11 items-center gap-2 rounded-full border border-semear-green/15 bg-white/70 px-4 text-sm font-semibold text-semear-green transition hover:bg-white"
          href="/acoes"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          Voltar para ações
        </Link>
        <button
          className="inline-flex min-h-11 items-center gap-2 rounded-full bg-semear-green px-4 text-sm font-semibold text-white transition hover:bg-semear-green/92"
          onClick={() => setEditing(true)}
          type="button"
        >
          <Edit3 className="h-4 w-4" aria-hidden="true" />
          Editar ação
        </button>
        <Link
          className="inline-flex min-h-11 items-center gap-2 rounded-full border border-semear-green/15 bg-white/70 px-4 text-sm font-semibold text-semear-green transition hover:bg-white"
          href={`/acoes/${actionId}/piloto`}
        >
          <FlaskConical className="h-4 w-4" aria-hidden="true" />
          Piloto da banca
        </Link>
      </div>

      <article className="rounded-[2rem] border border-white/80 bg-white/78 p-5 shadow-soft sm:p-8">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-semear-earth">
              Ação territorial
            </p>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight text-semear-green">
              {action.title}
            </h2>
            <div className="mt-4 flex flex-wrap gap-3 text-sm text-stone-600">
              <span className="inline-flex items-center gap-2">
                <CalendarDays className="h-4 w-4" aria-hidden="true" />
                {new Date(`${action.action_date}T00:00:00`).toLocaleDateString("pt-BR")}
              </span>
              <span className="inline-flex items-center gap-2">
                <MapPin className="h-4 w-4" aria-hidden="true" />
                {action.neighborhoods?.name ?? "Sem bairro definido"}
              </span>
            </div>
          </div>
          <div className="rounded-2xl bg-semear-green-soft px-4 py-3 text-sm font-semibold text-semear-green">
            Pode receber escutas vinculadas depois
          </div>
        </div>

        <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-5">
          {detailItems.map(([label, value]) => (
            <div className="rounded-2xl border border-semear-gray bg-semear-offwhite p-4" key={label}>
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-stone-500">
                {label}
              </p>
              <p className="mt-2 text-sm font-semibold text-semear-green">{value}</p>
            </div>
          ))}
        </div>

        <div className="mt-8 grid gap-5 lg:grid-cols-2">
          <TextBlock title="Objetivo" value={action.objective} />
          <TextBlock title="Resumo" value={action.summary} />
          <TextBlock title="Observações" value={action.notes} />
          <div className="rounded-2xl border border-dashed border-semear-green/25 bg-semear-offwhite p-5">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-semear-earth">
                <UsersRound className="h-5 w-5" aria-hidden="true" />
              </div>
              <div>
                <h3 className="font-semibold text-semear-green">Privacidade do público</h3>
                <p className="mt-1 text-sm leading-6 text-stone-600">
                  Este módulo registra dados coletivos da ação, sem CPF, telefone ou endereço
                  pessoal de participantes.
                </p>
              </div>
            </div>
          </div>
        </div>
      </article>

      <div className="mt-8 grid gap-5 lg:grid-cols-2">
        <ActionReadinessPanel records={records} />
        <ActionOperationChecklist action={action} records={records} />
      </div>

      <section className="mt-8 rounded-[2rem] border border-white/80 bg-white p-6 shadow-soft">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-semear-green-soft text-semear-green">
              <FileText className="h-6 w-6" aria-hidden="true" />
            </div>
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-semear-earth">Devolutiva da ação</p>
              <h3 className="mt-2 text-xl font-semibold text-semear-green">
                {debrief ? getDebriefStatusLabel(debrief.status) : "Não criada"}
              </h3>
              <p className="mt-2 text-sm leading-6 text-stone-600">
                Prepare o relatório bonito “O que ouvimos na feira” com revisão humana, privacidade e versão de impressão.
              </p>
            </div>
          </div>
          <Link className="inline-flex min-h-11 items-center justify-center rounded-full bg-semear-green px-5 text-sm font-semibold text-white" href={`/acoes/${actionId}/devolutiva`}>
            Abrir devolutiva
          </Link>
        </div>
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          {metrics.draft > 0 ? (
            <Alert text={`${metrics.draft} escuta(s) ainda em rascunho. Revise antes de aprovar a devolutiva.`} />
          ) : null}
          {metrics.possibleSensitive > 0 ? (
            <Alert text="Há possível dado sensível detectado. Não aprove sem revisão." danger />
          ) : null}
        </div>
      </section>

      <section className="mt-8 rounded-[2rem] border border-white/80 bg-white p-6 shadow-soft">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-semear-green-soft text-semear-green">
              <FolderCheck className="h-6 w-6" aria-hidden="true" />
            </div>
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-semear-earth">Dossiê da ação</p>
              <h3 className="mt-2 text-xl font-semibold text-semear-green">{getClosureStatusLabel(closure?.status)}</h3>
              <p className="mt-2 text-sm leading-6 text-stone-600">
                {reviewedPercent}% revisado · devolutiva {debrief?.status === "approved" ? "aprovada" : "não aprovada"} · {metrics.pending} pendência(s).
              </p>
            </div>
          </div>
          <Link className="inline-flex min-h-11 items-center justify-center rounded-full bg-semear-green px-5 text-sm font-semibold text-white" href={`/acoes/${actionId}/dossie`}>
            Abrir dossiê
          </Link>
        </div>
        {metrics.possibleSensitive > 0 ? <Alert text="Há pendência crítica de possível dado sensível." danger /> : null}
      </section>

      <ActionSynthesis actionId={actionId} />
    </section>
  );
}

function getDebriefStatusLabel(status: ActionDebrief["status"]) {
  if (status === "approved") return "Aprovada";
  if (status === "reviewed") return "Revisada";
  return "Rascunho";
}

function Alert({ text, danger = false }: { text: string; danger?: boolean }) {
  return (
    <p className={`flex gap-2 rounded-2xl border p-4 text-sm font-medium ${danger ? "border-red-200 bg-red-50 text-red-800" : "border-amber-200 bg-amber-50 text-amber-900"}`}>
      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
      {text}
    </p>
  );
}

function TextBlock({ title, value }: { title: string; value: string | null }) {
  return (
    <section className="rounded-2xl border border-semear-gray bg-white p-5">
      <h3 className="font-semibold text-semear-green">{title}</h3>
      <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-stone-600">
        {value || "Não informado."}
      </p>
    </section>
  );
}
