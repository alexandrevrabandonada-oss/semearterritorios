"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, CalendarPlus, Save } from "lucide-react";
import type {
  Action,
  Neighborhood,
  Profile,
  TeamCalendarAttendanceStatus,
  TeamCalendarEvent,
  TeamCalendarEventMember,
  TeamCalendarEventStatus,
  TeamCalendarEventType,
  TeamMember,
} from "@/lib/database.types";
import {
  formatDateTimeLocalInput,
  getEventAutoType,
  getSuggestedActionEventEnd,
  getSuggestedActionEventStart,
  parseDateTimeLocalInput,
  teamCalendarAttendanceOptions,
  teamCalendarEventStatusOptions,
  teamCalendarEventTypeOptions,
} from "@/lib/team-calendar";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";

type EventFormProps = {
  eventId?: string;
};

type EventFormValues = {
  title: string;
  description: string;
  event_type: TeamCalendarEventType;
  starts_at: string;
  ends_at: string;
  all_day: boolean;
  status: TeamCalendarEventStatus;
  action_id: string;
  neighborhood_id: string;
};

type ParticipantState = {
  selected: boolean;
  responsibility: string;
  attendance_status: TeamCalendarAttendanceStatus;
};

const now = new Date();
const nextHour = new Date(now.getFullYear(), now.getMonth(), now.getDate(), now.getHours() + 1, 0, 0, 0);

const defaultValues: EventFormValues = {
  title: "",
  description: "",
  event_type: "reuniao",
  starts_at: formatDateTimeLocalInput(nextHour.toISOString()),
  ends_at: "",
  all_day: false,
  status: "planned",
  action_id: "",
  neighborhood_id: "",
};

function mapEventToFormValues(event: TeamCalendarEvent): EventFormValues {
  return {
    title: event.title,
    description: event.description ?? "",
    event_type: event.event_type,
    starts_at: formatDateTimeLocalInput(event.starts_at),
    ends_at: formatDateTimeLocalInput(event.ends_at),
    all_day: event.all_day,
    status: event.status,
    action_id: event.action_id ?? "",
    neighborhood_id: event.neighborhood_id ?? "",
  };
}

export function TeamCalendarEventForm({ eventId }: EventFormProps) {
  const supabase = useMemo(() => createBrowserSupabaseClient(), []);
  const router = useRouter();
  const searchParams = useSearchParams();
  const [values, setValues] = useState<EventFormValues>(defaultValues);
  const [actions, setActions] = useState<Action[]>([]);
  const [neighborhoods, setNeighborhoods] = useState<Neighborhood[]>([]);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [currentProfile, setCurrentProfile] = useState<Pick<Profile, "id" | "role"> | null>(null);
  const [participants, setParticipants] = useState<Record<string, ParticipantState>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canManage = currentProfile?.role === "admin" || currentProfile?.role === "coordenacao";
  const fromActionId = searchParams.get("actionId") ?? "";
  const queryTitle = searchParams.get("title") ?? "";
  const queryEventType = searchParams.get("eventType") ?? "";
  const queryStartsAt = searchParams.get("startsAt") ?? "";
  const queryEndsAt = searchParams.get("endsAt") ?? "";
  const queryAllDay = searchParams.get("allDay") ?? "";
  const queryNeighborhoodId = searchParams.get("neighborhoodId") ?? "";

  useEffect(() => {
    let ignore = false;

    async function loadForm() {
      if (!supabase) {
        setError("Configure NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_ANON_KEY para usar a agenda.");
        setLoading(false);
        return;
      }

      const userResult = await supabase.auth.getUser();
      const userId = userResult.data.user?.id;

      const [profileResult, actionsResult, neighborhoodsResult, teamMembersResult] = await Promise.all([
        userId ? supabase.from("profiles").select("id, role").eq("id", userId).maybeSingle() : Promise.resolve({ data: null, error: null }),
        supabase.from("actions").select("*").order("action_date", { ascending: false }),
        supabase.from("neighborhoods").select("*").eq("status", "oficial").order("sector", { ascending: true }).order("name", { ascending: true }),
        supabase.from("team_members").select("*").eq("active", true).order("display_name", { ascending: true }),
      ]);

      if (ignore) return;

      if (profileResult.error || actionsResult.error || neighborhoodsResult.error || teamMembersResult.error) {
        setError(profileResult.error?.message ?? actionsResult.error?.message ?? neighborhoodsResult.error?.message ?? teamMembersResult.error?.message ?? "Erro ao carregar formulário da agenda.");
        setLoading(false);
        return;
      }

      const loadedActions = (actionsResult.data ?? []) as Action[];
      const loadedNeighborhoods = (neighborhoodsResult.data ?? []) as Neighborhood[];
      const loadedTeamMembers = (teamMembersResult.data ?? []) as TeamMember[];

      setCurrentProfile((profileResult.data ?? null) as Pick<Profile, "id" | "role"> | null);
      setActions(loadedActions);
      setNeighborhoods(loadedNeighborhoods);
      setTeamMembers(loadedTeamMembers);

      if (eventId) {
        const [eventResult, eventMembersResult] = await Promise.all([
          supabase.from("team_calendar_events").select("*").eq("id", eventId).single(),
          supabase.from("team_calendar_event_members").select("*").eq("event_id", eventId),
        ]);

        if (ignore) return;

        if (eventResult.error || eventMembersResult.error) {
          setError(eventResult.error?.message ?? eventMembersResult.error?.message ?? "Erro ao carregar evento.");
          setLoading(false);
          return;
        }

        const loadedEvent = eventResult.data as TeamCalendarEvent;
        setValues(mapEventToFormValues(loadedEvent));
        const participantMap: Record<string, ParticipantState> = {};
        ((eventMembersResult.data ?? []) as TeamCalendarEventMember[]).forEach((member) => {
          participantMap[member.team_member_id] = {
            selected: true,
            responsibility: member.responsibility ?? "",
            attendance_status: member.attendance_status,
          };
        });
        setParticipants(participantMap);
        setLoading(false);
        return;
      }

      if (fromActionId) {
        const action = loadedActions.find((item) => item.id === fromActionId);
        if (action) {
          await prefillFromAction(action, loadedTeamMembers);
        }
      }

      setValues((current) => ({
        ...current,
        title: queryTitle || current.title,
        event_type: (queryEventType as TeamCalendarEventType) || current.event_type,
        starts_at: queryStartsAt || current.starts_at,
        ends_at: queryEndsAt || current.ends_at,
        all_day: queryAllDay ? queryAllDay === "1" : current.all_day,
        neighborhood_id: queryNeighborhoodId || current.neighborhood_id,
      }));

      setLoading(false);
    }

    async function prefillFromAction(action: Action, loadedTeamMembers: TeamMember[]) {
      const participantsResult = await supabase
        ?.from("action_team_members")
        .select("*")
        .eq("action_id", action.id);

      setValues({
        title: queryTitle || action.title,
        description: action.summary ?? action.notes ?? "",
        event_type: (queryEventType as TeamCalendarEventType) || getEventAutoType(action),
        starts_at: queryStartsAt || getSuggestedActionEventStart(action),
        ends_at: queryEndsAt || getSuggestedActionEventEnd(action),
        all_day: queryAllDay ? queryAllDay === "1" : action.all_day,
        status: action.status === "cancelada" ? "cancelled" : action.status === "realizada" ? "done" : "planned",
        action_id: action.id,
        neighborhood_id: queryNeighborhoodId || (action.neighborhood_id ?? ""),
      });

      if (participantsResult?.error) {
        return;
      }

      const participantMap: Record<string, ParticipantState> = {};
      (participantsResult?.data ?? []).forEach((member) => {
        participantMap[member.team_member_id] = {
          selected: true,
          responsibility: member.responsibility ?? "",
          attendance_status: "invited",
        };
      });

      loadedTeamMembers.forEach((member) => {
        if (!participantMap[member.id]) return;
      });

      setParticipants(participantMap);
    }

    void loadForm();

    return () => {
      ignore = true;
    };
  }, [eventId, fromActionId, queryAllDay, queryEndsAt, queryEventType, queryNeighborhoodId, queryStartsAt, queryTitle, supabase]);

  function updateField<TField extends keyof EventFormValues>(field: TField, value: EventFormValues[TField]) {
    setValues((current) => ({ ...current, [field]: value }));
  }

  function updateParticipant(teamMemberId: string, patch: Partial<ParticipantState>) {
    setParticipants((current) => {
      const previous = current[teamMemberId] ?? {
        selected: false,
        responsibility: "",
        attendance_status: "invited" as TeamCalendarAttendanceStatus,
      };

      return {
        ...current,
        [teamMemberId]: {
          ...previous,
          ...patch,
        },
      };
    });
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    if (!supabase || !currentProfile?.id) {
      setError("Entre no sistema antes de salvar eventos.");
      return;
    }

    if (!canManage) {
      setError("Apenas coordenação ou admin podem criar e editar eventos da agenda.");
      return;
    }

    if (!values.title.trim()) {
      setError("Informe o título do evento.");
      return;
    }

    const startsAt = values.all_day
      ? parseDateTimeLocalInput(`${values.starts_at.slice(0, 10)}T00:00`)
      : parseDateTimeLocalInput(values.starts_at);
    const endsAt = values.ends_at
      ? values.all_day
        ? parseDateTimeLocalInput(`${values.ends_at.slice(0, 10)}T23:59`)
        : parseDateTimeLocalInput(values.ends_at)
      : null;

    if (!startsAt) {
      setError("Informe a data e hora de início.");
      return;
    }

    if (endsAt && new Date(endsAt) < new Date(startsAt)) {
      setError("A data final não pode ser anterior ao início.");
      return;
    }

    setSaving(true);

    const payload = {
      title: values.title.trim(),
      description: values.description.trim() || null,
      event_type: values.event_type,
      starts_at: startsAt,
      ends_at: endsAt,
      all_day: values.all_day,
      status: values.status,
      action_id: values.action_id || null,
      neighborhood_id: values.neighborhood_id || null,
    };

    const result = eventId
      ? await supabase.from("team_calendar_events").update(payload).eq("id", eventId).select("id").single()
      : await supabase.from("team_calendar_events").insert({ ...payload, created_by: currentProfile.id }).select("id").single();

    if (result.error) {
      setSaving(false);
      setError(result.error.message);
      return;
    }

    const savedEventId = result.data.id;
    const deleteMembersResult = await supabase.from("team_calendar_event_members").delete().eq("event_id", savedEventId);

    if (deleteMembersResult.error) {
      setSaving(false);
      setError(deleteMembersResult.error.message);
      return;
    }

    const memberRows = Object.entries(participants)
      .filter(([, state]) => state.selected)
      .map(([teamMemberId, state]) => ({
        event_id: savedEventId,
        team_member_id: teamMemberId,
        responsibility: state.responsibility.trim() || null,
        attendance_status: state.attendance_status,
      }));

    if (memberRows.length > 0) {
      const insertMembersResult = await supabase.from("team_calendar_event_members").insert(memberRows);
      if (insertMembersResult.error) {
        setSaving(false);
        setError(insertMembersResult.error.message);
        return;
      }
    }

    setSaving(false);
    router.push(`/agenda/${savedEventId}`);
    router.refresh();
  }

  if (loading) {
    return <section className="rounded-3xl border border-white/60 bg-white/80 p-8 text-xs font-semibold text-stone-500 shadow-premium-md backdrop-blur-sm">Carregando formulário da agenda...</section>;
  }

  if (!canManage) {
    return (
      <section className="rounded-3xl border border-amber-200 bg-amber-50 p-8 text-xs leading-relaxed font-semibold text-amber-950 shadow-premium-md">
        A agenda é visível para a equipe toda, mas apenas coordenação e admin podem criar ou editar eventos.
      </section>
    );
  }

  return (
    <section className="pb-10">
      <Link className="mb-5 inline-flex min-h-11 items-center gap-2 rounded-full border border-stone-200 bg-white/90 px-4 text-xs font-bold text-stone-700 shadow-premium-sm transition hover:bg-white active:scale-[0.98]" href="/agenda">
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        Voltar para agenda
      </Link>

      <form className="rounded-3xl border border-white/60 bg-white/80 p-5 shadow-premium-md backdrop-blur-sm sm:p-8" onSubmit={handleSubmit}>
        <div className="max-w-3xl">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-semear-earth">{eventId ? "Editar evento" : "Novo evento"}</p>
          <h2 className="mt-3 text-3xl font-extrabold tracking-tight text-semear-green">Agenda da Equipe</h2>
          <p className="mt-3 text-xs font-semibold leading-relaxed text-stone-555">
            Organize ações de campo, bancas, reuniões, prazos e atividades internas da equipe.
          </p>
          <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50/70 p-4 text-xs leading-relaxed font-bold text-amber-900 shadow-premium-sm">
            Esta agenda é interna da equipe SEMEAR. Não inclua dados pessoais de entrevistados.
          </div>
        </div>

        {error ? <div className="mt-6 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-xs font-bold text-red-800 shadow-premium-sm">{error}</div> : null}

        <div className="mt-8 grid gap-5 lg:grid-cols-2">
          <label className="lg:col-span-2">
            <span className="text-xs font-bold uppercase tracking-wider text-semear-green">Título</span>
            <input className={inputClassName} value={values.title} onChange={(event) => updateField("title", event.target.value)} required />
          </label>

          <label>
            <span className="text-xs font-bold uppercase tracking-wider text-semear-green">Tipo</span>
            <select className={inputClassName} value={values.event_type} onChange={(event) => updateField("event_type", event.target.value as TeamCalendarEventType)}>
              {teamCalendarEventTypeOptions.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
          </label>

          <label>
            <span className="text-xs font-bold uppercase tracking-wider text-semear-green">Status</span>
            <select className={inputClassName} value={values.status} onChange={(event) => updateField("status", event.target.value as TeamCalendarEventStatus)}>
              {teamCalendarEventStatusOptions.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
          </label>

          <label className="rounded-2xl border border-white/60 bg-white/60 px-4 py-3 text-xs font-bold text-stone-750 shadow-premium-sm flex items-center cursor-pointer select-none">
            <span className="flex items-center gap-3">
              <input checked={values.all_day} onChange={(event) => updateField("all_day", event.target.checked)} type="checkbox" className="h-4 w-4 rounded border-stone-200 text-semear-green focus:ring-semear-green" />
              Dia inteiro
            </span>
          </label>

          <div className="rounded-2xl border border-white/60 bg-white/65 px-4 py-3 text-xs leading-relaxed font-bold text-stone-500 shadow-premium-sm">
            Se o evento veio de uma ação, revise o horário antes de salvar. Quando a ação já tiver `starts_at` e `ends_at`, a agenda herda esse período. Se não tiver, você pode ajustar a sugestão manualmente.
          </div>

          <label>
            <span className="text-xs font-bold uppercase tracking-wider text-semear-green">Início</span>
            <input
              className={inputClassName}
              type={values.all_day ? "date" : "datetime-local"}
              value={values.all_day ? values.starts_at.slice(0, 10) : values.starts_at}
              onChange={(event) => updateField("starts_at", values.all_day ? `${event.target.value}T00:00` : event.target.value)}
              required
            />
          </label>

          <label>
            <span className="text-xs font-bold uppercase tracking-wider text-semear-green">Fim</span>
            <input
              className={inputClassName}
              type={values.all_day ? "date" : "datetime-local"}
              value={values.all_day ? values.ends_at.slice(0, 10) : values.ends_at}
              onChange={(event) => updateField("ends_at", values.all_day ? `${event.target.value}T23:59` : event.target.value)}
            />
          </label>

          <label>
            <span className="text-xs font-bold uppercase tracking-wider text-semear-green">Território</span>
            <select className={inputClassName} value={values.neighborhood_id} onChange={(event) => updateField("neighborhood_id", event.target.value)}>
              <option value="">Sem território definido</option>
              {neighborhoods.map((neighborhood) => (
                <option key={neighborhood.id} value={neighborhood.id}>{neighborhood.name}</option>
              ))}
            </select>
          </label>

          <label>
            <span className="text-xs font-bold uppercase tracking-wider text-semear-green">Ação vinculada</span>
            <select className={inputClassName} value={values.action_id} onChange={(event) => updateField("action_id", event.target.value)}>
              <option value="">Sem ação vinculada</option>
              {actions.map((action) => (
                <option key={action.id} value={action.id}>{action.title}</option>
              ))}
            </select>
          </label>

          <label className="lg:col-span-2">
            <span className="text-xs font-bold uppercase tracking-wider text-semear-green">Descrição</span>
            <textarea className={textareaClassName} value={values.description} onChange={(event) => updateField("description", event.target.value)} />
          </label>

          <fieldset className="lg:col-span-2 rounded-3xl border border-white/60 bg-white/40 p-5 shadow-premium-sm">
            <legend className="px-2 text-xs font-bold uppercase tracking-wider text-semear-green">Equipe participante e presença</legend>
            <div className="mt-4 space-y-3">
              {teamMembers.map((member) => {
                const state = participants[member.id] ?? { selected: false, responsibility: "", attendance_status: "invited" as TeamCalendarAttendanceStatus };
                return (
                  <div className="rounded-2xl border border-white/40 bg-white/95 p-4 shadow-premium-sm transition duration-200 hover:-translate-y-0.5" key={member.id}>
                    <label className="flex min-h-14 cursor-pointer items-center gap-3 text-sm font-semibold text-stone-700">
                      <input checked={state.selected} className="h-5 w-5 rounded border-stone-300 text-semear-green focus:ring-semear-green" onChange={(event) => updateParticipant(member.id, { selected: event.target.checked })} type="checkbox" />
                      <span className="flex-1">
                        <span className="block font-bold text-semear-green">{member.display_name}</span>
                        <span className="text-[10px] font-bold text-stone-450 uppercase tracking-wider">{member.role_label ?? "Sem função informada"}</span>
                      </span>
                    </label>
                    {state.selected ? (
                      <div className="mt-3 grid gap-3 md:grid-cols-2">
                        <input className="min-h-11 rounded-2xl border border-stone-200 bg-white px-4 text-xs font-bold outline-none focus:border-semear-green shadow-premium-sm" placeholder="Responsabilidade" value={state.responsibility} onChange={(event) => updateParticipant(member.id, { responsibility: event.target.value })} />
                        <select className="min-h-11 rounded-2xl border border-stone-200 bg-white px-4 text-xs font-bold outline-none focus:border-semear-green shadow-premium-sm text-stone-750" value={state.attendance_status} onChange={(event) => updateParticipant(member.id, { attendance_status: event.target.value as TeamCalendarAttendanceStatus })}>
                          {teamCalendarAttendanceOptions.map((option) => (
                            <option key={option.value} value={option.value}>{option.label}</option>
                          ))}
                        </select>
                      </div>
                    ) : null}
                  </div>
                );
              })}
            </div>
          </fieldset>
        </div>

        <div className="sticky bottom-20 z-20 mt-8 flex flex-wrap gap-3 rounded-2xl border border-white/60 bg-white/95 p-4 shadow-premium-md backdrop-blur md:bottom-4">
          <button className="inline-flex min-h-12 flex-1 items-center justify-center gap-2 rounded-full bg-semear-green px-5 text-xs font-bold text-white shadow-premium-sm transition hover:bg-semear-green/90 disabled:cursor-not-allowed disabled:opacity-60 active:scale-[0.98] duration-200" disabled={saving} type="submit">
            {eventId ? <Save className="h-4 w-4" aria-hidden="true" /> : <CalendarPlus className="h-4 w-4" aria-hidden="true" />}
            {saving ? "Salvando..." : eventId ? "Salvar evento" : "Criar evento"}
          </button>
          <Link className="inline-flex min-h-12 flex-1 items-center justify-center rounded-full border border-white/60 bg-white px-5 text-xs font-bold text-stone-750 shadow-premium-sm transition hover:bg-stone-50 active:scale-[0.98] duration-200" href="/agenda">Cancelar</Link>
        </div>
      </form>
    </section>
  );
}

const inputClassName = "mt-2 min-h-12 w-full rounded-2xl border border-stone-200 bg-white/95 px-4 text-xs font-bold text-stone-750 outline-none focus:border-semear-green shadow-premium-sm";
const textareaClassName = "mt-2 min-h-28 w-full rounded-2xl border border-stone-200 bg-white/95 px-4 py-3 text-xs font-bold text-stone-750 outline-none focus:border-semear-green shadow-premium-sm";

