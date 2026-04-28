"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeft, CalendarDays, Edit3, MapPin, UsersRound } from "lucide-react";
import { ActionForm } from "@/components/actions/action-form";
import type { Action, ActionStatus, ActionType, Neighborhood } from "@/lib/database.types";
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
      const result = await supabase
        .from("actions")
        .select("*, neighborhoods:neighborhood_id(id, name)")
        .eq("id", actionId)
        .single();

      if (ignore) {
        return;
      }

      if (result.error) {
        setError(result.error.message);
        setLoading(false);
        return;
      }

      setAction(result.data as ActionWithNeighborhood);
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
    </section>
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
