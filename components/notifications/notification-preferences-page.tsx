"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Save } from "lucide-react";
import type { NotificationPreference } from "@/lib/database.types";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";

type FormState = {
  agenda_reminders: boolean;
  google_calendar_alerts: boolean;
  weekly_report_alerts: boolean;
  debrief_dossier_alerts: boolean;
  listening_review_alerts: boolean;
  transparency_alerts: boolean;
  memory_alerts: boolean;
  quiet_mode: boolean;
};

const initialState: FormState = {
  agenda_reminders: true,
  google_calendar_alerts: true,
  weekly_report_alerts: true,
  debrief_dossier_alerts: true,
  listening_review_alerts: true,
  transparency_alerts: false,
  memory_alerts: true,
  quiet_mode: false,
};

export function NotificationPreferencesPage() {
  const supabase = useMemo(() => createBrowserSupabaseClient(), []);
  const [preferenceId, setPreferenceId] = useState<string | null>(null);
  const [profileId, setProfileId] = useState<string | null>(null);
  const [state, setState] = useState<FormState>(initialState);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let ignore = false;

    async function load() {
      const userResult = await supabase?.auth.getUser();
      const userId = userResult?.data.user?.id;

      if (!userId) {
        setError("Sessão inválida.");
        setLoading(false);
        return;
      }

      if (ignore) return;
      setProfileId(userId);

      const result = await supabase
        ?.from("notification_preferences")
        .select("*")
        .eq("profile_id", userId)
        .maybeSingle();

      if (result?.error) {
        setError(result.error.message);
        setLoading(false);
        return;
      }

      if (result?.data) {
        const data = result.data as NotificationPreference;
        setPreferenceId(data.id);
        setState({
          agenda_reminders: data.agenda_reminders,
          google_calendar_alerts: data.google_calendar_alerts,
          weekly_report_alerts: data.weekly_report_alerts,
          debrief_dossier_alerts: data.debrief_dossier_alerts,
          listening_review_alerts: data.listening_review_alerts,
          transparency_alerts: data.transparency_alerts,
          memory_alerts: data.memory_alerts,
          quiet_mode: data.quiet_mode,
        });
      }

      setLoading(false);
    }

    void load();

    return () => {
      ignore = true;
    };
  }, [supabase]);

  async function save() {
    if (!profileId) return;

    setSaving(true);
    setError(null);
    setMessage(null);

    if (preferenceId) {
      const updateResult = await supabase
        ?.from("notification_preferences")
        .update(state)
        .eq("id", preferenceId);

      if (updateResult?.error) {
        setError(updateResult.error.message);
        setSaving(false);
        return;
      }
    } else {
      const insertResult = await supabase
        ?.from("notification_preferences")
        .insert({ profile_id: profileId, ...state })
        .select("id")
        .single();

      if (insertResult?.error) {
        setError(insertResult.error.message);
        setSaving(false);
        return;
      }

      setPreferenceId(insertResult?.data?.id ?? null);
    }

    setMessage("Preferências salvas.");
    setSaving(false);
  }

  if (loading) {
    return <StateBox>Carregando preferências...</StateBox>;
  }

  return (
    <section className="pb-10">
      <div className="rounded-[2rem] border border-white/80 bg-white/78 p-6 shadow-soft sm:p-8">
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-semear-earth">Central de Avisos</p>
        <h2 className="mt-3 text-4xl font-semibold tracking-tight text-semear-green">Preferências de avisos</h2>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-stone-600">
          Controle os lembretes internos por categoria. O modo silencioso mantém os avisos acessíveis na central e oculta badges não urgentes.
        </p>
      </div>

      <section className="mt-5 rounded-[2rem] border border-white/80 bg-white p-5 shadow-soft">
        <div className="space-y-3">
          <Toggle label="Agenda" checked={state.agenda_reminders} onChange={(checked) => setState((current) => ({ ...current, agenda_reminders: checked }))} />
          <Toggle label="Google Calendar" checked={state.google_calendar_alerts} onChange={(checked) => setState((current) => ({ ...current, google_calendar_alerts: checked }))} />
          <Toggle label="Relatórios semanais" checked={state.weekly_report_alerts} onChange={(checked) => setState((current) => ({ ...current, weekly_report_alerts: checked }))} />
          <Toggle label="Devolutivas e dossiês" checked={state.debrief_dossier_alerts} onChange={(checked) => setState((current) => ({ ...current, debrief_dossier_alerts: checked }))} />
          <Toggle label="Revisão de escutas" checked={state.listening_review_alerts} onChange={(checked) => setState((current) => ({ ...current, listening_review_alerts: checked }))} />
          <Toggle label="Transparência" checked={state.transparency_alerts} onChange={(checked) => setState((current) => ({ ...current, transparency_alerts: checked }))} />
          <Toggle label="Memória" checked={state.memory_alerts} onChange={(checked) => setState((current) => ({ ...current, memory_alerts: checked }))} />
          <Toggle label="Modo silencioso (oculta badges não urgentes)" checked={state.quiet_mode} onChange={(checked) => setState((current) => ({ ...current, quiet_mode: checked }))} />
        </div>

        <div className="mt-5 flex flex-wrap gap-2">
          <button
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-semear-green px-4 text-sm font-semibold text-white disabled:opacity-60"
            disabled={saving}
            onClick={() => void save()}
            type="button"
          >
            <Save className="h-4 w-4" aria-hidden="true" />
            Salvar preferências
          </button>
          <Link className="inline-flex min-h-11 items-center justify-center rounded-full border border-semear-green/15 bg-white px-4 text-sm font-semibold text-semear-green" href="/avisos">
            Voltar para avisos
          </Link>
        </div>
      </section>

      {error ? <StateBox tone="error">{error}</StateBox> : null}
      {message ? <StateBox>{message}</StateBox> : null}
    </section>
  );
}

function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (checked: boolean) => void }) {
  return (
    <label className="flex min-h-12 items-center justify-between gap-3 rounded-2xl border border-semear-gray bg-semear-offwhite px-4 py-3">
      <span className="text-sm font-semibold text-semear-green">{label}</span>
      <input checked={checked} className="h-5 w-5" onChange={(event) => onChange(event.target.checked)} type="checkbox" />
    </label>
  );
}

function StateBox({ children, tone = "neutral" }: { children: React.ReactNode; tone?: "neutral" | "error" }) {
  return (
    <div className={`mt-5 rounded-[1.5rem] p-5 text-sm shadow-soft ${tone === "error" ? "border border-red-200 bg-red-50 text-red-800" : "border border-white/80 bg-white/72 text-stone-600"}`}>
      {children}
    </div>
  );
}
