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
  Profile,
  TeamCalendarAttendanceStatus,
  TeamMember
} from "@/lib/database.types";
import { actionStatusOptions, actionTypeOptions } from "@/lib/actions";
import { formatNeighborhoodOption, getOfficialNeighborhoodsForSelect } from "@/lib/neighborhoods";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";
import { formatDateTimeLocalInput, getActionScheduleLabel, getEventAutoType, getSuggestedActionEventEnd, getSuggestedActionEventStart } from "@/lib/team-calendar";

type ActionFormMode = "create" | "edit";

type ActionFormValues = {
  title: string;
  action_date: string;
  starts_at: string;
  ends_at: string;
  all_day: boolean;
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
  starts_at: "",
  ends_at: "",
  all_day: false,
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
    starts_at: formatDateTimeLocalInput(action.starts_at),
    ends_at: formatDateTimeLocalInput(action.ends_at),
    all_day: action.all_day,
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
  const [currentProfile, setCurrentProfile] = useState<Pick<Profile, "id" | "role"> | null>(null);
  const [selectedTeamMembers, setSelectedTeamMembers] = useState<Record<string, string>>({});
  const [createCalendarEvent, setCreateCalendarEvent] = useState(false);
  const [calendarAllDay, setCalendarAllDay] = useState(false);
  const [calendarStartsAt, setCalendarStartsAt] = useState(`${defaultValues.action_date}T09:00`);
  const [calendarEndsAt, setCalendarEndsAt] = useState("");
  const [loading, setLoading] = useState(mode === "edit");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const canManageCalendar = currentProfile?.role === "admin" || currentProfile?.role === "coordenacao";

  useEffect(() => {
    let ignore = false;

    async function loadFormData() {
      if (!supabase) {
        setError("Configure NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_ANON_KEY para usar o Supabase.");
        setLoading(false);
        return;
      }

      setLoading(true);
      const userResult = await supabase.auth.getUser();
      const userId = userResult.data.user?.id;

      const [neighborhoodsResult, teamMembersResult, profileResult] = await Promise.all([
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
          .order("display_name", { ascending: true }),
        userId ? supabase.from("profiles").select("id, role").eq("id", userId).maybeSingle() : Promise.resolve({ data: null, error: null })
      ]);

      if (ignore) {
        return;
      }

      if (neighborhoodsResult.error || teamMembersResult.error || profileResult.error) {
        setError(neighborhoodsResult.error?.message ?? teamMembersResult.error?.message ?? profileResult.error?.message ?? "Erro ao carregar formulário.");
        setLoading(false);
        return;
      }

      setNeighborhoods(getOfficialNeighborhoodsForSelect(neighborhoodsResult.data ?? []));
      setTeamMembers((teamMembersResult.data ?? []) as TeamMember[]);
      setCurrentProfile((profileResult.data ?? null) as Pick<Profile, "id" | "role"> | null);

      if (mode !== "edit" || !actionId) {
        setCalendarStartsAt(getSuggestedActionEventStart(defaultValues));
        setCalendarEndsAt(getSuggestedActionEventEnd(defaultValues));
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
        setCalendarAllDay(actionResult.data.all_day);
        setCalendarStartsAt(getSuggestedActionEventStart(actionResult.data));
        setCalendarEndsAt(getSuggestedActionEventEnd(actionResult.data));
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

  useEffect(() => {
    if (!createCalendarEvent) return;

    setCalendarAllDay(values.all_day);
    setCalendarStartsAt(values.starts_at || `${values.action_date}T09:00`);
    setCalendarEndsAt(values.ends_at || (values.all_day ? `${values.action_date}T23:59` : ""));
  }, [createCalendarEvent, values.action_date, values.all_day, values.ends_at, values.starts_at]);

  function updateField<TField extends keyof ActionFormValues>(field: TField, value: ActionFormValues[TField]) {
    setValues((current) => ({ ...current, [field]: value }));
  }

  function updateActionDate(date: string) {
    setValues((current) => {
      const nextStartsAt = current.starts_at
        ? `${date}T${current.starts_at.slice(11, 16)}`
        : "";
      const nextEndsAt = current.ends_at
        ? `${date}T${current.ends_at.slice(11, 16)}`
        : "";
      return {
        ...current,
        action_date: date,
        starts_at: nextStartsAt,
        ends_at: nextEndsAt,
      };
    });

    setCalendarStartsAt((current) => (current ? `${date}T${current.slice(11, 16) || "09:00"}` : `${date}T09:00`));
    setCalendarEndsAt((current) => (current ? `${date}T${current.slice(11, 16) || "23:59"}` : current));
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

    const actionStartsAt = values.starts_at ? new Date(values.starts_at).toISOString() : null;
    const actionEndsAt = values.ends_at ? new Date(values.ends_at).toISOString() : null;

    if (actionStartsAt && actionEndsAt && new Date(actionEndsAt) < new Date(actionStartsAt)) {
      showError("O horário final da ação não pode ser anterior ao início.");
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
      starts_at: actionStartsAt,
      ends_at: actionEndsAt,
      all_day: values.all_day,
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

    if (createCalendarEvent && canManageCalendar) {
      const startsAtIso = calendarAllDay ? new Date(`${values.action_date}T00:00:00`).toISOString() : new Date(calendarStartsAt).toISOString();
      const endsAtIso = calendarEndsAt
        ? calendarAllDay
          ? new Date(`${calendarEndsAt.slice(0, 10)}T23:59:00`).toISOString()
          : new Date(calendarEndsAt).toISOString()
        : null;

      const calendarEventResult = await supabase
        .from("team_calendar_events")
        .insert({
          title: values.title.trim(),
          description: values.summary.trim() || values.notes.trim() || null,
          event_type: getEventAutoType({ action_type: values.action_type }),
          starts_at: startsAtIso,
          ends_at: endsAtIso,
          all_day: calendarAllDay,
          status: values.status === "cancelada" ? "cancelled" : values.status === "realizada" ? "done" : "planned",
          action_id: actionDbId,
          neighborhood_id: values.neighborhood_id || null,
          created_by: user.id
        })
        .select("id")
        .single();

      if (calendarEventResult.error) {
        setSaving(false);
        showError(calendarEventResult.error.message);
        return;
      }

      if (participantRows.length > 0) {
        const eventParticipantsResult = await supabase.from("team_calendar_event_members").insert(
          participantRows.map((participant) => ({
            event_id: calendarEventResult.data.id,
            team_member_id: participant.team_member_id,
            responsibility: participant.responsibility,
            attendance_status: "invited" as TeamCalendarAttendanceStatus
          }))
        );

        if (eventParticipantsResult.error) {
          setSaving(false);
          showError(eventParticipantsResult.error.message);
          return;
        }
      }
    }

    setSaving(false);
    router.push(`/acoes/${actionDbId}`);
    router.refresh();
  }

  if (loading) {
    return (
      <section className="rounded-3xl border border-white/60 bg-white/80 p-8 shadow-premium-md backdrop-blur-sm">
        <p className="text-sm font-semibold text-stone-600 animate-pulse">Carregando formulário...</p>
      </section>
    );
  }

  return (
    <section className="pb-10">
      <Link
        className="mb-5 inline-flex min-h-11 items-center gap-2 rounded-full border border-white/60 bg-white/80 px-4 text-sm font-bold text-semear-green shadow-premium-sm transition hover:bg-white active:scale-[0.98] duration-200"
        href="/acoes"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        Voltar para ações
      </Link>

      <form className="rounded-3xl border border-white/60 bg-white/85 p-6 shadow-premium-md backdrop-blur-sm sm:p-8" onSubmit={handleSubmit}>
        <div className="max-w-3xl">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-semear-earth">{mode === "create" ? "Nova ação" : "Editar ação"}</p>
          <h2 className="mt-3 text-3xl font-extrabold tracking-tight text-semear-green">Dados da ação territorial</h2>
          <p className="mt-3 text-sm leading-relaxed text-stone-600 font-medium">
            Para a primeira Banca de Escuta, use o tipo banca de escuta e registre apenas informações coletivas da atividade. Não inclua CPF, telefone, endereço pessoal ou dados identificáveis de participantes.
          </p>
          <div className="mt-4 rounded-2xl border border-amber-200/50 bg-amber-50/70 p-4 text-xs leading-relaxed text-amber-950 font-medium">
            Use apenas local coletivo: feira, praça, escola, CRAS, associação. Nunca residência ou endereço pessoal. Selecione apenas bairro oficial - territórios provisórios não aparecem neste formulário.
          </div>
        </div>

        {error ? <div className="mt-6 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-800">{error}</div> : null}

        <div className="mt-8 grid gap-5 lg:grid-cols-2">
          <label className="lg:col-span-2 block">
            <span className="text-xs font-bold uppercase tracking-[0.15em] text-stone-500">Título</span>
            <input
              className="mt-2 min-h-12 w-full rounded-2xl border border-stone-200 bg-white/95 px-4 text-sm font-bold text-stone-750 outline-none shadow-premium-sm transition-all duration-200 focus:border-semear-green focus:ring-1 focus:ring-semear-green"
              onChange={(event) => updateField("title", event.target.value)}
              placeholder={mode === "create" ? "Ex.: Banca de Escuta - Feira Livre - [bairro]" : undefined}
              required
              value={values.title}
            />
            {mode === "create" ? <p className="mt-1.5 text-[10px] font-semibold text-stone-400">Sugestão de título: <em>Banca de Escuta - Feira Livre - [nome do bairro]</em></p> : null}
          </label>

          <label className="block">
            <span className="text-xs font-bold uppercase tracking-[0.15em] text-stone-500">Data</span>
            <input
              className="mt-2 min-h-12 w-full rounded-2xl border border-stone-200 bg-white/95 px-4 text-sm font-bold text-stone-750 outline-none shadow-premium-sm transition-all duration-200 focus:border-semear-green focus:ring-1 focus:ring-semear-green"
              onChange={(event) => updateActionDate(event.target.value)}
              required
              type="date"
              value={values.action_date}
            />
          </label>

          <label className="rounded-2xl border border-white/60 bg-white/90 px-4 py-3 text-sm text-stone-750 shadow-premium-sm flex items-center h-12 mt-6 cursor-pointer select-none">
            <span className="flex items-center gap-3 font-bold text-stone-600">
              <input checked={values.all_day} className="h-5 w-5 rounded border-stone-300 text-semear-green focus:ring-semear-green" onChange={(event) => updateField("all_day", event.target.checked)} type="checkbox" />
              Dia inteiro
            </span>
          </label>

          <div className="rounded-2xl border border-white/40 bg-white/50 px-4 py-3 text-xs leading-relaxed text-stone-500 font-bold shadow-premium-sm flex items-center h-12 mt-6">
            Informe horário quando a atividade tiver período definido. Se ainda não souber, deixe como dia inteiro ou pendente.
          </div>

          <label className="block">
            <span className="text-xs font-bold uppercase tracking-[0.15em] text-stone-500">Início da atividade</span>
            <input
              className="mt-2 min-h-12 w-full rounded-2xl border border-stone-200 bg-white/95 px-4 text-sm font-bold text-stone-750 outline-none shadow-premium-sm transition-all duration-200 focus:border-semear-green focus:ring-1 focus:ring-semear-green"
              onChange={(event) => updateField("starts_at", values.all_day ? `${event.target.value}T00:00` : event.target.value)}
              type={values.all_day ? "date" : "datetime-local"}
              value={values.all_day ? values.starts_at.slice(0, 10) : values.starts_at}
            />
          </label>

          <label className="block">
            <span className="text-xs font-bold uppercase tracking-[0.15em] text-stone-500">Fim da atividade</span>
            <input
              className="mt-2 min-h-12 w-full rounded-2xl border border-stone-200 bg-white/95 px-4 text-sm font-bold text-stone-750 outline-none shadow-premium-sm transition-all duration-200 focus:border-semear-green focus:ring-1 focus:ring-semear-green"
              onChange={(event) => updateField("ends_at", values.all_day ? `${event.target.value}T23:59` : event.target.value)}
              type={values.all_day ? "date" : "datetime-local"}
              value={values.all_day ? values.ends_at.slice(0, 10) : values.ends_at}
            />
          </label>

          <label className="block">
            <span className="text-xs font-bold uppercase tracking-[0.15em] text-stone-500">Bairro/Território</span>
            <select
              className="mt-2 min-h-12 w-full rounded-2xl border border-stone-200 bg-white/95 px-4 text-sm font-bold text-stone-750 outline-none shadow-premium-sm transition-all duration-200 focus:border-semear-green focus:ring-1 focus:ring-semear-green"
              onChange={(event) => updateField("neighborhood_id", event.target.value)}
              value={values.neighborhood_id}
            >
              <option value="">Sem bairro definido</option>
              {neighborhoods.map((neighborhood) => (
                <option key={neighborhood.id} value={neighborhood.id}>{formatNeighborhoodOption(neighborhood)}</option>
              ))}
            </select>
            <p className="mt-1.5 text-[10px] font-semibold text-stone-400">São exibidos apenas bairros oficiais validados. Territórios provisórios ficam disponíveis apenas na área administrativa.</p>
          </label>

          <label className="block">
            <span className="text-xs font-bold uppercase tracking-[0.15em] text-stone-500">Tipo de ação</span>
            <select
              className="mt-2 min-h-12 w-full rounded-2xl border border-stone-200 bg-white/95 px-4 text-sm font-bold text-stone-750 outline-none shadow-premium-sm transition-all duration-200 focus:border-semear-green focus:ring-1 focus:ring-semear-green"
              onChange={(event) => updateField("action_type", event.target.value as ActionType)}
              value={values.action_type}
            >
              {actionTypeOptions.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="text-xs font-bold uppercase tracking-[0.15em] text-stone-500">Status</span>
            <select
              className="mt-2 min-h-12 w-full rounded-2xl border border-stone-200 bg-white/95 px-4 text-sm font-bold text-stone-750 outline-none shadow-premium-sm transition-all duration-200 focus:border-semear-green focus:ring-1 focus:ring-semear-green"
              onChange={(event) => updateField("status", event.target.value as ActionStatus)}
              value={values.status}
            >
              {actionStatusOptions.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="text-xs font-bold uppercase tracking-[0.15em] text-stone-500">Local</span>
            <input
              className="mt-2 min-h-12 w-full rounded-2xl border border-stone-200 bg-white/95 px-4 text-sm font-bold text-stone-750 outline-none shadow-premium-sm transition-all duration-200 focus:border-semear-green focus:ring-1 focus:ring-semear-green"
              onChange={(event) => updateField("location_reference", event.target.value)}
              placeholder="Ex.: feira, praça, escola, CRAS ou equipamento coletivo"
              value={values.location_reference}
            />
          </label>

          <label className="block">
            <span className="text-xs font-bold uppercase tracking-[0.15em] text-stone-500">Equipe</span>
            <input
              className="mt-2 min-h-12 w-full rounded-2xl border border-stone-200 bg-white/95 px-4 text-sm font-bold text-stone-750 outline-none shadow-premium-sm transition-all duration-200 focus:border-semear-green focus:ring-1 focus:ring-semear-green"
              onChange={(event) => updateField("team", event.target.value)}
              placeholder="Nomes da equipe, sem dados pessoais do público"
              value={values.team}
            />
            <p className="mt-1.5 text-[10px] font-semibold text-stone-400">Campo legado para observações de equipe. Use a seleção abaixo para participantes padronizados.</p>
          </label>

          <fieldset className="lg:col-span-2 rounded-2xl border border-white/60 bg-white/80 p-5 shadow-premium-sm backdrop-blur-sm">
            <legend className="px-2 text-xs font-bold uppercase tracking-wider text-semear-green">Selecione quem participou da ação</legend>
            <div className="mt-4 space-y-3">
              {teamMembers.map((member) => {
                const checked = Object.prototype.hasOwnProperty.call(selectedTeamMembers, member.id);
                return (
                  <div className="rounded-2xl border border-white/40 bg-white/90 p-4 shadow-premium-sm transition duration-200 hover:-translate-y-0.5" key={member.id}>
                    <label className="flex min-h-14 cursor-pointer items-center gap-3 text-sm font-medium text-stone-700">
                      <input checked={checked} className="h-5 w-5 rounded border-stone-300 text-semear-green focus:ring-semear-green" onChange={(event) => updateParticipantSelection(member.id, event.target.checked)} type="checkbox" />
                      <span className="flex-1">
                        <span className="block font-bold text-semear-green">{member.display_name}</span>
                        <span className="text-xs font-semibold text-stone-400">{member.role_label ?? "Sem função informada"}</span>
                      </span>
                    </label>
                    {checked ? (
                      <input
                        className="mt-3 min-h-11 w-full rounded-2xl border border-stone-200 bg-white px-4 text-sm font-bold text-stone-750 outline-none shadow-premium-sm transition-all duration-200 focus:border-semear-green focus:ring-1 focus:ring-semear-green"
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

          <label className="lg:col-span-2 block">
            <span className="text-xs font-bold uppercase tracking-[0.15em] text-stone-500">Público estimado</span>
            <input
              className="mt-2 min-h-12 w-full rounded-2xl border border-stone-200 bg-white/95 px-4 text-sm font-bold text-stone-750 outline-none shadow-premium-sm transition-all duration-200 focus:border-semear-green focus:ring-1 focus:ring-semear-green"
              min={0}
              onChange={(event) => updateField("estimated_public", event.target.value)}
              type="number"
              value={values.estimated_public}
            />
          </label>

          <label className="lg:col-span-2 block">
            <span className="text-xs font-bold uppercase tracking-[0.15em] text-stone-500">Objetivo</span>
            <textarea className="mt-2 min-h-28 w-full rounded-2xl border border-stone-200 bg-white/95 px-4 py-3 text-sm leading-relaxed text-stone-750 outline-none shadow-premium-sm transition-all duration-200 focus:border-semear-green focus:ring-1 focus:ring-semear-green" onChange={(event) => updateField("objective", event.target.value)} value={values.objective} />
          </label>

          <label className="lg:col-span-2 block">
            <span className="text-xs font-bold uppercase tracking-[0.15em] text-stone-500">Resumo</span>
            <textarea className="mt-2 min-h-32 w-full rounded-2xl border border-stone-200 bg-white/95 px-4 py-3 text-sm leading-relaxed text-stone-750 outline-none shadow-premium-sm transition-all duration-200 focus:border-semear-green focus:ring-1 focus:ring-semear-green" onChange={(event) => updateField("summary", event.target.value)} value={values.summary} />
          </label>

          <label className="lg:col-span-2 block">
            <span className="text-xs font-bold uppercase tracking-[0.15em] text-stone-500">Observações</span>
            <textarea className="mt-2 min-h-28 w-full rounded-2xl border border-stone-200 bg-white/95 px-4 py-3 text-sm leading-relaxed text-stone-750 outline-none shadow-premium-sm transition-all duration-200 focus:border-semear-green focus:ring-1 focus:ring-semear-green" onChange={(event) => updateField("notes", event.target.value)} value={values.notes} />
          </label>

          <fieldset className="lg:col-span-2 rounded-2xl border border-white/60 bg-white/80 p-5 shadow-premium-sm backdrop-blur-sm">
            <legend className="px-2 text-xs font-bold uppercase tracking-wider text-semear-green">Agenda da equipe</legend>
            <div className="mt-4">
              {mode === "create" && canManageCalendar ? (
                <>
                  <label className="flex items-center gap-3 rounded-2xl bg-white px-4 py-3 text-sm text-stone-750 shadow-premium-sm font-bold cursor-pointer select-none">
                    <input checked={createCalendarEvent} className="h-5 w-5 rounded border-stone-300 text-semear-green focus:ring-semear-green" onChange={(event) => setCreateCalendarEvent(event.target.checked)} type="checkbox" />
                    Criar evento na agenda da equipe
                  </label>
                  {createCalendarEvent ? (
                    <div className="mt-4 grid gap-4 lg:grid-cols-2">
                      <label className="rounded-2xl border border-white/40 bg-white px-4 py-3 text-sm text-stone-750 shadow-premium-sm flex items-center font-bold cursor-pointer select-none">
                        <span className="flex items-center gap-3">
                          <input checked={calendarAllDay} className="h-5 w-5 rounded border-stone-300 text-semear-green focus:ring-semear-green" onChange={(event) => setCalendarAllDay(event.target.checked)} type="checkbox" />
                          Dia inteiro
                        </span>
                      </label>
                      <div className="rounded-2xl border border-white/40 bg-white/50 px-4 py-3 text-xs leading-relaxed text-stone-500 font-bold shadow-premium-sm">
                        O evento usa título, território, ação vinculada, horário estruturado e equipe participante desta ação. Se a ação ainda não tiver horário definido, o sistema sugere um horário padrão editável. Nada será criado sem sua confirmação ao salvar.
                      </div>
                      <label className="block">
                        <span className="text-xs font-bold uppercase tracking-[0.15em] text-stone-500">Início do evento</span>
                        <input className="mt-2 min-h-12 w-full rounded-2xl border border-stone-200 bg-white px-4 text-sm font-bold text-stone-750 outline-none shadow-premium-sm transition focus:border-semear-green focus:ring-1 focus:ring-semear-green" type={calendarAllDay ? "date" : "datetime-local"} value={calendarAllDay ? calendarStartsAt.slice(0, 10) : calendarStartsAt} onChange={(event) => setCalendarStartsAt(calendarAllDay ? `${event.target.value}T00:00` : event.target.value)} />
                      </label>
                      <label className="block">
                        <span className="text-xs font-bold uppercase tracking-[0.15em] text-stone-500">Fim do evento</span>
                        <input className="mt-2 min-h-12 w-full rounded-2xl border border-stone-200 bg-white px-4 text-sm font-bold text-stone-750 outline-none shadow-premium-sm transition focus:border-semear-green focus:ring-1 focus:ring-semear-green" type={calendarAllDay ? "date" : "datetime-local"} value={calendarAllDay ? calendarEndsAt.slice(0, 10) : calendarEndsAt} onChange={(event) => setCalendarEndsAt(calendarAllDay ? `${event.target.value}T23:59` : event.target.value)} />
                      </label>
                    </div>
                  ) : null}
                </>
              ) : mode === "edit" ? (
                <div className="rounded-2xl border border-white/40 bg-white/50 px-4 py-3 text-xs leading-relaxed text-stone-500 font-bold shadow-premium-sm">
                  Para ações já cadastradas, use os atalhos da página da ação para criar evento, agendar devolutiva, dossiê ou revisão. A criação continua sendo opcional e sem automatismo.
                </div>
              ) : (
                <div className="rounded-2xl border border-amber-200/50 bg-amber-50/70 px-4 py-3 text-xs leading-relaxed text-amber-950 font-bold shadow-premium-sm">
                  A agenda é visível para toda a equipe, mas somente coordenação e admin podem criar eventos nela. A ação continua podendo ser cadastrada normalmente.
                </div>
              )}
            </div>
          </fieldset>
        </div>

        <div className="sticky bottom-20 z-20 mt-8 flex flex-wrap gap-3 rounded-2xl border border-white/60 bg-white/90 p-4 shadow-premium-md backdrop-blur-sm md:bottom-4">
          <button className="inline-flex min-h-12 flex-1 items-center justify-center gap-2 rounded-full bg-semear-green px-5 text-sm font-bold text-white shadow-premium-sm transition hover:bg-semear-green/90 active:scale-[0.98] duration-200 disabled:cursor-not-allowed disabled:opacity-60" disabled={saving} type="submit">
            <Save className="h-4 w-4" aria-hidden="true" />
            {saving ? "Salvando..." : "Salvar ação"}
          </button>
          <Link className="inline-flex min-h-12 flex-1 items-center justify-center rounded-full border border-white/60 bg-white px-5 text-sm font-bold text-semear-green shadow-premium-sm transition hover:bg-stone-50 active:scale-[0.98] duration-200" href="/acoes">Cancelar</Link>
        </div>
      </form>
    </section>
  );
}
