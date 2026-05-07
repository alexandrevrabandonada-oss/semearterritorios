"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Save } from "lucide-react";
import type {
  Action,
  ActionStatus,
  ActionTeamMember,
  ActionType,
  Neighborhood,
  TeamMember
} from "@/lib/database.types";
import { actionStatusOptions, actionTypeOptions } from "@/lib/actions";
import { formatNeighborhoodOption, getOfficialNeighborhoodsForSelect } from "@/lib/neighborhoods";
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
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [selectedTeamMembers, setSelectedTeamMembers] = useState<Record<string, string>>({});
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
      const [neighborhoodsResult, teamMembersResult] = await Promise.all([
        supabase
          .from("neighborhoods")
          .select("*")
          .eq("status", "oficial")
          .order("sector", { ascending: true })
          .order("name", { ascending: true }),
        supabase
          .from("team_members")
          .select("*")
          .eq("active", true)
          .eq("can_join_actions", true)
          .order("display_name", { ascending: true })
      ]);

      if (ignore) {
        return;
      }

      if (neighborhoodsResult.error || teamMembersResult.error) {
        setError(neighborhoodsResult.error?.message ?? teamMembersResult.error?.message ?? "Erro ao carregar formulário.");
        setLoading(false);
        return;
      }

      setNeighborhoods(getOfficialNeighborhoodsForSelect(neighborhoodsResult.data ?? []));
      setTeamMembers((teamMembersResult.data ?? []) as TeamMember[]);

      if (mode !== "edit" || !actionId) {
        setLoading(false);
        return;
      }

      const [actionResult, participantsResult] = await Promise.all([
        supabase.from("actions").select("*").eq("id", actionId).single(),
        supabase.from("action_team_members").select("*").eq("action_id", actionId)
      ]);

      if (ignore) {
        return;
      }

      if (actionResult.error || participantsResult.error) {
        setError(actionResult.error?.message ?? participantsResult.error?.message ?? "Erro ao carregar ação.");
        setLoading(false);
        return;
      }

      if (actionResult.data) {
        setValues(mapActionToFormValues(actionResult.data));
      }

      const participantMap = new Map<string, string>();
      ((participantsResult.data ?? []) as ActionTeamMember[]).forEach((participant) => {
        participantMap.set(participant.team_member_id, participant.responsibility ?? "");
      });
      setSelectedTeamMembers(Object.fromEntries(participantMap.entries()));

      setLoading(false);
    }

    void loadFormData();

    return () => {
      ignore = true;
    };
  }, [actionId, mode, supabase]);

  function updateField<TField extends keyof ActionFormValues>(field: TField, value: ActionFormValues[TField]) {
    setValues((current) => ({ ...current, [field]: value }));
  }

  function showError(message: string) {
    setError(message);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function updateParticipantSelection(teamMemberId: string, checked: boolean) {
    setSelectedTeamMembers((current) => {
      const next = { ...current };
      if (checked) {
        next[teamMemberId] = next[teamMemberId] ?? "";
      } else {
        delete next[teamMemberId];
      }
      return next;
    });
  }

  function updateParticipantResponsibility(teamMemberId: string, responsibility: string) {
    setSelectedTeamMembers((current) => ({ ...current, [teamMemberId]: responsibility }));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    if (!supabase) {
      showError("Configure as variáveis públicas do Supabase antes de salvar.");
      return;
    }

    if (!values.title.trim()) {
      showError("Informe o título da ação.");
      return;
    }

    if (!values.action_date) {
      showError("Informe a data da ação.");
      return;
    }

    const {
      data: { user },
      error: userError
    } = await supabase.auth.getUser();

    if (userError || !user) {
      showError("Entre no sistema antes de salvar ações.");
      return;
    }

    setSaving(true);

    const basePayload = {
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
      notes: values.notes.trim() || null
    };

    const result =
      mode === "edit" && actionId
        ? await supabase.from("actions").update(basePayload).eq("id", actionId).select("id").single()
        : await supabase.from("actions").insert({ ...basePayload, created_by: user.id }).select("id").single();

    if (result.error) {
      setSaving(false);
      showError(result.error.message);
      return;
    }

    const actionDbId = result.data.id;
    const participantRows = Object.entries(selectedTeamMembers).map(([teamMemberId, responsibility]) => ({
      action_id: actionDbId,
      team_member_id: teamMemberId,
      responsibility: responsibility.trim() || null,
      created_by: user.id
    }));

    const clearParticipantsResult = await supabase.from("action_team_members").delete().eq("action_id", actionDbId);

    if (clearParticipantsResult.error) {
      setSaving(false);
      showError(clearParticipantsResult.error.message);
      return;
    }

    if (participantRows.length > 0) {
      const participantsInsertResult = await supabase.from("action_team_members").insert(participantRows);

      if (participantsInsertResult.error) {
        setSaving(false);
        showError(participantsInsertResult.error.message);
        return;
      }
    }

    setSaving(false);
    router.push(`/acoes/${actionDbId}`);
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

      <form className="rounded-[2rem] border border-white/80 bg-white/78 p-5 shadow-soft sm:p-8" onSubmit={handleSubmit}>
        <div className="max-w-3xl">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-semear-earth">{mode === "create" ? "Nova ação" : "Editar ação"}</p>
          <h2 className="mt-3 text-3xl font-semibold tracking-tight text-semear-green">Dados da ação territorial</h2>
          <p className="mt-3 text-sm leading-6 text-stone-600">
            Para a primeira Banca de Escuta, use o tipo banca de escuta e registre apenas informações coletivas da atividade. Não inclua CPF, telefone, endereço pessoal ou dados identificáveis de participantes.
          </p>
          <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-950">
            Use apenas local coletivo: feira, praça, escola, CRAS, associação. Nunca residência ou endereço pessoal. Selecione apenas bairro oficial - territórios provisórios não aparecem neste formulário.
          </div>
        </div>

        {error ? <div className="mt-6 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{error}</div> : null}

        <div className="mt-8 grid gap-5 lg:grid-cols-2">
          <label className="lg:col-span-2">
            <span className="text-sm font-semibold text-semear-green">Título</span>
            <input
              className="mt-2 min-h-12 w-full rounded-2xl border border-semear-gray bg-white px-4 text-sm outline-none focus:border-semear-green"
              onChange={(event) => updateField("title", event.target.value)}
              placeholder={mode === "create" ? "Ex.: Banca de Escuta - Feira Livre - [bairro]" : undefined}
              required
              value={values.title}
            />
            {mode === "create" ? <p className="mt-1.5 text-xs leading-5 text-stone-500">Sugestão de título: <em>Banca de Escuta - Feira Livre - [nome do bairro]</em></p> : null}
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
                <option key={neighborhood.id} value={neighborhood.id}>{formatNeighborhoodOption(neighborhood)}</option>
              ))}
            </select>
            <p className="mt-1.5 text-xs leading-5 text-stone-500">São exibidos apenas bairros oficiais validados. Territórios provisórios ficam disponíveis apenas na área administrativa.</p>
          </label>

          <label>
            <span className="text-sm font-semibold text-semear-green">Tipo de ação</span>
            <select
              className="mt-2 min-h-12 w-full rounded-2xl border border-semear-gray bg-white px-4 text-sm outline-none focus:border-semear-green"
              onChange={(event) => updateField("action_type", event.target.value as ActionType)}
              value={values.action_type}
            >
              {actionTypeOptions.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
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
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
          </label>

          <label>
            <span className="text-sm font-semibold text-semear-green">Local</span>
            <input
              className="mt-2 min-h-12 w-full rounded-2xl border border-semear-gray bg-white px-4 text-sm outline-none focus:border-semear-green"
              onChange={(event) => updateField("location_reference", event.target.value)}
              placeholder="Ex.: feira, praça, escola, CRAS ou equipamento coletivo"
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
            <p className="mt-1.5 text-xs leading-5 text-stone-500">Campo legado para observações de equipe. Use a seleção abaixo para participantes padronizados.</p>
          </label>

          <fieldset className="lg:col-span-2 rounded-2xl border border-semear-gray bg-semear-offwhite/60 p-4">
            <legend className="px-1 text-sm font-semibold text-semear-green">Selecione quem participou da ação</legend>
            <div className="mt-2 space-y-3">
              {teamMembers.map((member) => {
                const checked = Object.prototype.hasOwnProperty.call(selectedTeamMembers, member.id);
                return (
                  <div className="rounded-xl border border-semear-gray bg-white p-3" key={member.id}>
                    <label className="flex min-h-14 cursor-pointer items-center gap-3 text-sm font-medium text-stone-700">
                      <input checked={checked} className="h-5 w-5 rounded border-semear-gray text-semear-green focus:ring-semear-green" onChange={(event) => updateParticipantSelection(member.id, event.target.checked)} type="checkbox" />
                      <span className="flex-1">
                        <span className="block font-semibold text-semear-green">{member.display_name}</span>
                        <span className="text-xs text-stone-500">{member.role_label ?? "Sem função informada"}</span>
                      </span>
                    </label>
                    {checked ? (
                      <input
                        className="mt-3 min-h-11 w-full rounded-xl border border-semear-gray bg-white px-3 text-sm outline-none focus:border-semear-green"
                        onChange={(event) => updateParticipantResponsibility(member.id, event.target.value)}
                        placeholder="Responsabilidade na ação (opcional)"
                        value={selectedTeamMembers[member.id] ?? ""}
                      />
                    ) : null}
                  </div>
                );
              })}
            </div>
          </fieldset>

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
            <textarea className="mt-2 min-h-28 w-full rounded-2xl border border-semear-gray bg-white px-4 py-3 text-sm outline-none focus:border-semear-green" onChange={(event) => updateField("objective", event.target.value)} value={values.objective} />
          </label>

          <label className="lg:col-span-2">
            <span className="text-sm font-semibold text-semear-green">Resumo</span>
            <textarea className="mt-2 min-h-32 w-full rounded-2xl border border-semear-gray bg-white px-4 py-3 text-sm outline-none focus:border-semear-green" onChange={(event) => updateField("summary", event.target.value)} value={values.summary} />
          </label>

          <label className="lg:col-span-2">
            <span className="text-sm font-semibold text-semear-green">Observações</span>
            <textarea className="mt-2 min-h-28 w-full rounded-2xl border border-semear-gray bg-white px-4 py-3 text-sm outline-none focus:border-semear-green" onChange={(event) => updateField("notes", event.target.value)} value={values.notes} />
          </label>
        </div>

        <div className="sticky bottom-20 z-20 mt-8 flex flex-wrap gap-3 rounded-[1.5rem] border border-semear-green/15 bg-white/95 p-4 shadow-soft backdrop-blur md:bottom-4">
          <button className="inline-flex min-h-12 flex-1 items-center justify-center gap-2 rounded-full bg-semear-green px-5 text-sm font-semibold text-white transition hover:bg-semear-green/92 disabled:cursor-not-allowed disabled:opacity-60" disabled={saving} type="submit">
            <Save className="h-4 w-4" aria-hidden="true" />
            {saving ? "Salvando..." : "Salvar ação"}
          </button>
          <Link className="inline-flex min-h-12 flex-1 items-center justify-center rounded-full border border-semear-green/15 bg-white px-5 text-sm font-semibold text-semear-green" href="/acoes">Cancelar</Link>
        </div>
      </form>
    </section>
  );
}
