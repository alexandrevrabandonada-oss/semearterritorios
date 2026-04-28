"use client";

import { useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Save } from "lucide-react";
import type { Action, ActionStatus, ActionType, Neighborhood } from "@/lib/database.types";
import { actionStatusOptions, actionTypeOptions } from "@/lib/actions";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";

type ActionFormMode = "create" | "edit";

type ActionFormValues = {
  title: string;
  action_date: string;
  neighborhood_id: string;
  action_type: ActionType;
  location_reference: string;
  objective: string;
  team: string;
  estimated_public: string;
  summary: string;
  status: ActionStatus;
  notes: string;
};

const defaultValues: ActionFormValues = {
  title: "",
  action_date: new Date().toISOString().slice(0, 10),
  neighborhood_id: "",
  action_type: "banca_escuta",
  location_reference: "",
  objective: "",
  team: "",
  estimated_public: "",
  summary: "",
  status: "planejada",
  notes: ""
};

function mapActionToFormValues(action: Action): ActionFormValues {
  return {
    title: action.title,
    action_date: action.action_date,
    neighborhood_id: action.neighborhood_id ?? "",
    action_type: action.action_type,
    location_reference: action.location_reference ?? "",
    objective: action.objective ?? "",
    team: action.team ?? "",
    estimated_public: action.estimated_public?.toString() ?? "",
    summary: action.summary ?? "",
    status: action.status,
    notes: action.notes ?? ""
  };
}

type ActionFormProps = {
  actionId?: string;
  mode: ActionFormMode;
};

export function ActionForm({ actionId, mode }: ActionFormProps) {
  const router = useRouter();
  const supabase = useMemo(() => createBrowserSupabaseClient(), []);
  const [values, setValues] = useState<ActionFormValues>(defaultValues);
  const [neighborhoods, setNeighborhoods] = useState<Neighborhood[]>([]);
  const [loading, setLoading] = useState(mode === "edit");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let ignore = false;

    async function loadFormData() {
      if (!supabase) {
        setError("Configure NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_ANON_KEY para usar o Supabase.");
        setLoading(false);
        return;
      }

      setLoading(true);
      const neighborhoodsResult = await supabase
        .from("neighborhoods")
        .select("*")
        .order("name", { ascending: true });

      if (ignore) {
        return;
      }

      if (neighborhoodsResult.error) {
        setError(neighborhoodsResult.error.message);
        setLoading(false);
        return;
      }

      setNeighborhoods(neighborhoodsResult.data ?? []);

      if (mode !== "edit" || !actionId) {
        setLoading(false);
        return;
      }

      const actionResult = await supabase.from("actions").select("*").eq("id", actionId).single();

      if (ignore) {
        return;
      }

      if (actionResult.error) {
        setError(actionResult.error.message);
        setLoading(false);
        return;
      }

      if (actionResult.data) {
        setValues(mapActionToFormValues(actionResult.data));
      }

      setLoading(false);
    }

    void loadFormData();

    return () => {
      ignore = true;
    };
  }, [actionId, mode, supabase]);

  function updateField<TField extends keyof ActionFormValues>(
    field: TField,
    value: ActionFormValues[TField]
  ) {
    setValues((current) => ({ ...current, [field]: value }));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    if (!supabase) {
      setError("Configure as variáveis públicas do Supabase antes de salvar.");
      return;
    }

    if (!values.title.trim()) {
      setError("Informe o título da ação.");
      return;
    }

    if (!values.action_date) {
      setError("Informe a data da ação.");
      return;
    }

    const {
      data: { user },
      error: userError
    } = await supabase.auth.getUser();

    if (userError || !user) {
      setError("Entre no sistema antes de salvar ações.");
      return;
    }

    setSaving(true);

    const payload = {
      title: values.title.trim(),
      action_date: values.action_date,
      neighborhood_id: values.neighborhood_id || null,
      action_type: values.action_type,
      location_reference: values.location_reference.trim() || null,
      objective: values.objective.trim() || null,
      team: values.team.trim() || null,
      estimated_public: values.estimated_public ? Number(values.estimated_public) : null,
      summary: values.summary.trim() || null,
      status: values.status,
      notes: values.notes.trim() || null,
      created_by: user.id
    };

    const result =
      mode === "edit" && actionId
        ? await supabase.from("actions").update(payload).eq("id", actionId).select("id").single()
        : await supabase.from("actions").insert(payload).select("id").single();

    setSaving(false);

    if (result.error) {
      setError(result.error.message);
      return;
    }

    router.push(`/acoes/${result.data.id}`);
    router.refresh();
  }

  if (loading) {
    return (
      <section className="rounded-[2rem] border border-white/80 bg-white/72 p-8 shadow-soft">
        <p className="text-sm font-medium text-stone-600">Carregando formulário...</p>
      </section>
    );
  }

  return (
    <section className="pb-10">
      <Link
        className="mb-5 inline-flex min-h-11 items-center gap-2 rounded-full border border-semear-green/15 bg-white/70 px-4 text-sm font-semibold text-semear-green transition hover:bg-white"
        href="/acoes"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        Voltar para ações
      </Link>

      <form
        className="rounded-[2rem] border border-white/80 bg-white/78 p-5 shadow-soft sm:p-8"
        onSubmit={handleSubmit}
      >
        <div className="max-w-3xl">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-semear-earth">
            {mode === "create" ? "Nova ação" : "Editar ação"}
          </p>
          <h2 className="mt-3 text-3xl font-semibold tracking-tight text-semear-green">
            Dados da ação territorial
          </h2>
          <p className="mt-3 text-sm leading-6 text-stone-600">
            Registre informações coletivas da atividade. Não inclua CPF, telefone, endereço pessoal
            ou dados identificáveis de participantes.
          </p>
        </div>

        {error ? (
          <div className="mt-6 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
            {error}
          </div>
        ) : null}

        <div className="mt-8 grid gap-5 lg:grid-cols-2">
          <label className="lg:col-span-2">
            <span className="text-sm font-semibold text-semear-green">Título</span>
            <input
              className="mt-2 min-h-12 w-full rounded-2xl border border-semear-gray bg-white px-4 text-sm outline-none focus:border-semear-green"
              onChange={(event) => updateField("title", event.target.value)}
              required
              value={values.title}
            />
          </label>

          <label>
            <span className="text-sm font-semibold text-semear-green">Data</span>
            <input
              className="mt-2 min-h-12 w-full rounded-2xl border border-semear-gray bg-white px-4 text-sm outline-none focus:border-semear-green"
              onChange={(event) => updateField("action_date", event.target.value)}
              required
              type="date"
              value={values.action_date}
            />
          </label>

          <label>
            <span className="text-sm font-semibold text-semear-green">Bairro/Território</span>
            <select
              className="mt-2 min-h-12 w-full rounded-2xl border border-semear-gray bg-white px-4 text-sm outline-none focus:border-semear-green"
              onChange={(event) => updateField("neighborhood_id", event.target.value)}
              value={values.neighborhood_id}
            >
              <option value="">Sem bairro definido</option>
              {neighborhoods.map((neighborhood) => (
                <option key={neighborhood.id} value={neighborhood.id}>
                  {neighborhood.name}
                </option>
              ))}
            </select>
          </label>

          <label>
            <span className="text-sm font-semibold text-semear-green">Tipo de ação</span>
            <select
              className="mt-2 min-h-12 w-full rounded-2xl border border-semear-gray bg-white px-4 text-sm outline-none focus:border-semear-green"
              onChange={(event) => updateField("action_type", event.target.value as ActionType)}
              value={values.action_type}
            >
              {actionTypeOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          <label>
            <span className="text-sm font-semibold text-semear-green">Status</span>
            <select
              className="mt-2 min-h-12 w-full rounded-2xl border border-semear-gray bg-white px-4 text-sm outline-none focus:border-semear-green"
              onChange={(event) => updateField("status", event.target.value as ActionStatus)}
              value={values.status}
            >
              {actionStatusOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          <label>
            <span className="text-sm font-semibold text-semear-green">Local</span>
            <input
              className="mt-2 min-h-12 w-full rounded-2xl border border-semear-gray bg-white px-4 text-sm outline-none focus:border-semear-green"
              onChange={(event) => updateField("location_reference", event.target.value)}
              placeholder="Ex.: praça, escola, CRAS, feira"
              value={values.location_reference}
            />
          </label>

          <label>
            <span className="text-sm font-semibold text-semear-green">Equipe</span>
            <input
              className="mt-2 min-h-12 w-full rounded-2xl border border-semear-gray bg-white px-4 text-sm outline-none focus:border-semear-green"
              onChange={(event) => updateField("team", event.target.value)}
              placeholder="Nomes da equipe, sem dados pessoais do público"
              value={values.team}
            />
          </label>

          <label>
            <span className="text-sm font-semibold text-semear-green">Público estimado</span>
            <input
              className="mt-2 min-h-12 w-full rounded-2xl border border-semear-gray bg-white px-4 text-sm outline-none focus:border-semear-green"
              min={0}
              onChange={(event) => updateField("estimated_public", event.target.value)}
              type="number"
              value={values.estimated_public}
            />
          </label>

          <label className="lg:col-span-2">
            <span className="text-sm font-semibold text-semear-green">Objetivo</span>
            <textarea
              className="mt-2 min-h-28 w-full rounded-2xl border border-semear-gray bg-white px-4 py-3 text-sm outline-none focus:border-semear-green"
              onChange={(event) => updateField("objective", event.target.value)}
              value={values.objective}
            />
          </label>

          <label className="lg:col-span-2">
            <span className="text-sm font-semibold text-semear-green">Resumo</span>
            <textarea
              className="mt-2 min-h-32 w-full rounded-2xl border border-semear-gray bg-white px-4 py-3 text-sm outline-none focus:border-semear-green"
              onChange={(event) => updateField("summary", event.target.value)}
              value={values.summary}
            />
          </label>

          <label className="lg:col-span-2">
            <span className="text-sm font-semibold text-semear-green">Observações</span>
            <textarea
              className="mt-2 min-h-28 w-full rounded-2xl border border-semear-gray bg-white px-4 py-3 text-sm outline-none focus:border-semear-green"
              onChange={(event) => updateField("notes", event.target.value)}
              value={values.notes}
            />
          </label>
        </div>

        <div className="mt-8 flex flex-wrap gap-3">
          <button
            className="inline-flex min-h-12 items-center gap-2 rounded-full bg-semear-green px-5 text-sm font-semibold text-white transition hover:bg-semear-green/92 disabled:cursor-not-allowed disabled:opacity-60"
            disabled={saving}
            type="submit"
          >
            <Save className="h-4 w-4" aria-hidden="true" />
            {saving ? "Salvando..." : "Salvar ação"}
          </button>
          <Link
            className="inline-flex min-h-12 items-center rounded-full border border-semear-green/15 bg-white px-5 text-sm font-semibold text-semear-green"
            href="/acoes"
          >
            Cancelar
          </Link>
        </div>
      </form>
    </section>
  );
}
