"use client";

import { useEffect, useMemo, useState } from "react";
import type { FormEvent, ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Save, ShieldAlert } from "lucide-react";
import type {
  Action,
  ListeningRecord,
  Neighborhood,
  ReviewStatus,
  SourceType,
  Theme
} from "@/lib/database.types";
import { reviewStatusOptions, sourceTypeOptions } from "@/lib/listening-records";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";

type FormMode = "create" | "edit";

type FormValues = {
  action_id: string;
  neighborhood_id: string;
  date: string;
  source_type: SourceType;
  interviewer_name: string;
  approximate_age_range: string;
  free_speech_text: string;
  team_summary: string;
  words_used: string;
  places_mentioned_text: string;
  priority_mentioned: string;
  unexpected_notes: string;
  review_status: ReviewStatus;
  theme_ids: string[];
};

const defaultValues: FormValues = {
  action_id: "",
  neighborhood_id: "",
  date: new Date().toISOString().slice(0, 10),
  source_type: "feira",
  interviewer_name: "",
  approximate_age_range: "",
  free_speech_text: "",
  team_summary: "",
  words_used: "",
  places_mentioned_text: "",
  priority_mentioned: "",
  unexpected_notes: "",
  review_status: "draft",
  theme_ids: []
};

type Props = {
  mode: FormMode;
  recordId?: string;
};

export function ListeningRecordForm({ mode, recordId }: Props) {
  const router = useRouter();
  const supabase = useMemo(() => createBrowserSupabaseClient(), []);
  const [values, setValues] = useState<FormValues>(defaultValues);
  const [actions, setActions] = useState<Action[]>([]);
  const [neighborhoods, setNeighborhoods] = useState<Neighborhood[]>([]);
  const [themes, setThemes] = useState<Theme[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let ignore = false;

    async function load() {
      if (!supabase) {
        setError("Configure NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_ANON_KEY para usar o Supabase.");
        setLoading(false);
        return;
      }

      const [actionsResult, neighborhoodsResult, themesResult] = await Promise.all([
        supabase.from("actions").select("*").order("action_date", { ascending: false }),
        supabase.from("neighborhoods").select("*").order("name", { ascending: true }),
        supabase.from("themes").select("*").eq("is_active", true).order("name", { ascending: true })
      ]);

      if (ignore) return;

      if (actionsResult.error || neighborhoodsResult.error || themesResult.error) {
        setError(
          actionsResult.error?.message ??
            neighborhoodsResult.error?.message ??
            themesResult.error?.message ??
            "Erro ao carregar dados."
        );
        setLoading(false);
        return;
      }

      setActions(actionsResult.data ?? []);
      setNeighborhoods(neighborhoodsResult.data ?? []);
      setThemes(themesResult.data ?? []);

      if (mode === "edit" && recordId) {
        const [recordResult, themesLinkResult] = await Promise.all([
          supabase.from("listening_records").select("*").eq("id", recordId).single(),
          supabase.from("listening_record_themes").select("theme_id").eq("listening_record_id", recordId)
        ]);

        if (ignore) return;

        if (recordResult.error || themesLinkResult.error) {
          setError(recordResult.error?.message ?? themesLinkResult.error?.message ?? "Erro ao carregar escuta.");
          setLoading(false);
          return;
        }

        const record = recordResult.data as ListeningRecord;
        setValues({
          action_id: record.action_id ?? "",
          neighborhood_id: record.neighborhood_id ?? "",
          date: record.date,
          source_type: record.source_type,
          interviewer_name: record.interviewer_name,
          approximate_age_range: record.approximate_age_range ?? "",
          free_speech_text: record.free_speech_text,
          team_summary: record.team_summary ?? "",
          words_used: record.words_used ?? "",
          places_mentioned_text: record.places_mentioned_text ?? "",
          priority_mentioned: record.priority_mentioned ?? "",
          unexpected_notes: record.unexpected_notes ?? "",
          review_status: record.review_status,
          theme_ids: (themesLinkResult.data ?? []).map((item) => item.theme_id)
        });
      }

      setLoading(false);
    }

    void load();

    return () => {
      ignore = true;
    };
  }, [mode, recordId, supabase]);

  function updateField<TField extends keyof FormValues>(field: TField, value: FormValues[TField]) {
    setValues((current) => ({ ...current, [field]: value }));
  }

  function toggleTheme(themeId: string) {
    setValues((current) => ({
      ...current,
      theme_ids: current.theme_ids.includes(themeId)
        ? current.theme_ids.filter((id) => id !== themeId)
        : [...current.theme_ids, themeId]
    }));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    if (!supabase) {
      setError("Configure as variáveis públicas do Supabase antes de salvar.");
      return;
    }

    if (!values.interviewer_name.trim() || !values.free_speech_text.trim() || !values.date) {
      setError("Informe data, entrevistador e fala original/síntese livre.");
      return;
    }

    const {
      data: { user }
    } = await supabase.auth.getUser();

    if (!user) {
      setError("Entre no sistema antes de salvar escutas.");
      return;
    }

    setSaving(true);
    const payload = {
      action_id: values.action_id || null,
      neighborhood_id: values.neighborhood_id || null,
      date: values.date,
      source_type: values.source_type,
      interviewer_name: values.interviewer_name.trim(),
      approximate_age_range: values.approximate_age_range.trim() || null,
      free_speech_text: values.free_speech_text.trim(),
      team_summary: values.team_summary.trim() || null,
      words_used: values.words_used.trim() || null,
      places_mentioned_text: values.places_mentioned_text.trim() || null,
      priority_mentioned: values.priority_mentioned.trim() || null,
      unexpected_notes: values.unexpected_notes.trim() || null,
      review_status: values.review_status,
      created_by: user.id
    };

    const recordResult =
      mode === "edit" && recordId
        ? await supabase.from("listening_records").update(payload).eq("id", recordId).select("id").single()
        : await supabase.from("listening_records").insert(payload).select("id").single();

    if (recordResult.error) {
      setSaving(false);
      setError(recordResult.error.message);
      return;
    }

    const savedId = recordResult.data.id;
    if (mode === "edit") {
      const deleteResult = await supabase.from("listening_record_themes").delete().eq("listening_record_id", savedId);
      if (deleteResult.error) {
        setSaving(false);
        setError(deleteResult.error.message);
        return;
      }
    }

    if (values.theme_ids.length > 0) {
      const insertResult = await supabase.from("listening_record_themes").insert(
        values.theme_ids.map((themeId) => ({
          listening_record_id: savedId,
          theme_id: themeId,
          created_by: user.id,
          notes: null
        }))
      );

      if (insertResult.error) {
        setSaving(false);
        setError(insertResult.error.message);
        return;
      }
    }

    setSaving(false);
    router.push(`/escutas/${savedId}`);
    router.refresh();
  }

  if (loading) {
    return <section className="rounded-[2rem] bg-white/72 p-8 shadow-soft">Carregando formulário...</section>;
  }

  return (
    <section className="pb-10">
      <Link className="mb-5 inline-flex min-h-11 items-center gap-2 rounded-full border border-semear-green/15 bg-white/70 px-4 text-sm font-semibold text-semear-green" href="/escutas">
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        Voltar para escutas
      </Link>

      <form className="rounded-[2rem] border border-white/80 bg-white/78 p-5 shadow-soft sm:p-8" onSubmit={handleSubmit}>
        <div className="max-w-3xl">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-semear-earth">
            {mode === "create" ? "Nova escuta" : "Editar escuta"}
          </p>
          <h2 className="mt-3 text-3xl font-semibold tracking-tight text-semear-green">Ficha de escuta territorial</h2>
          <div className="mt-4 flex gap-3 rounded-2xl border border-semear-yellow/40 bg-semear-yellow/20 p-4 text-sm leading-6 text-semear-green">
            <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" />
            Não registre CPF, endereço pessoal, telefone ou dados de saúde individual identificável.
          </div>
        </div>

        {error ? <div className="mt-6 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{error}</div> : null}

        <div className="mt-8 grid gap-5 lg:grid-cols-2">
          <Select label="Ação vinculada" value={values.action_id} onChange={(value) => updateField("action_id", value)}>
            <option value="">Sem ação vinculada</option>
            {actions.map((action) => (
              <option key={action.id} value={action.id}>{action.title}</option>
            ))}
          </Select>
          <Select label="Bairro/Território" value={values.neighborhood_id} onChange={(value) => updateField("neighborhood_id", value)}>
            <option value="">Sem bairro definido</option>
            {neighborhoods.map((neighborhood) => (
              <option key={neighborhood.id} value={neighborhood.id}>{neighborhood.name}</option>
            ))}
          </Select>
          <Input label="Data" type="date" value={values.date} onChange={(value) => updateField("date", value)} required />
          <Select label="Tipo de origem" value={values.source_type} onChange={(value) => updateField("source_type", value as SourceType)}>
            {sourceTypeOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
          </Select>
          <Input label="Entrevistador" value={values.interviewer_name} onChange={(value) => updateField("interviewer_name", value)} required />
          <Input label="Faixa etária aproximada opcional" value={values.approximate_age_range} onChange={(value) => updateField("approximate_age_range", value)} placeholder="Ex.: 30-39, pessoa idosa, jovem" />

          <label className="lg:col-span-2 rounded-[1.5rem] border-2 border-semear-green/35 bg-semear-green-soft/70 p-4">
            <span className="text-sm font-bold text-semear-green">Fala original / síntese livre</span>
            <textarea className="mt-3 min-h-64 w-full rounded-2xl border border-semear-green/20 bg-white px-4 py-3 text-base leading-7 outline-none focus:border-semear-green" required value={values.free_speech_text} onChange={(event) => updateField("free_speech_text", event.target.value)} />
          </label>

          <Textarea label="Resumo da equipe" value={values.team_summary} onChange={(value) => updateField("team_summary", value)} />
          <Textarea label="Palavras usadas pela pessoa" value={values.words_used} onChange={(value) => updateField("words_used", value)} />
          <Textarea label="Lugares citados" value={values.places_mentioned_text} onChange={(value) => updateField("places_mentioned_text", value)} />
          <Textarea label="Prioridade apontada" value={values.priority_mentioned} onChange={(value) => updateField("priority_mentioned", value)} />
          <Textarea label="Observações inesperadas" value={values.unexpected_notes} onChange={(value) => updateField("unexpected_notes", value)} />
          <Select label="Status" value={values.review_status} onChange={(value) => updateField("review_status", value as ReviewStatus)}>
            {reviewStatusOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
          </Select>
        </div>

        <div className="mt-8 rounded-[1.5rem] border border-dashed border-semear-green/25 bg-semear-offwhite p-5">
          <h3 className="font-semibold text-semear-green">Temas marcados pela equipe</h3>
          <p className="mt-1 text-sm text-stone-600">Essas tags são interpretação/codificação da equipe, separadas da fala original.</p>
          <div className="mt-4 flex flex-wrap gap-2">
            {themes.map((theme) => (
              <button
                className={`rounded-full border px-4 py-2 text-sm font-semibold transition ${values.theme_ids.includes(theme.id) ? "border-semear-green bg-semear-green text-white" : "border-semear-green/20 bg-white text-semear-green"}`}
                key={theme.id}
                onClick={() => toggleTheme(theme.id)}
                type="button"
              >
                {theme.name}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-8 flex flex-wrap gap-3">
          <button className="inline-flex min-h-12 items-center gap-2 rounded-full bg-semear-green px-5 text-sm font-semibold text-white disabled:opacity-60" disabled={saving} type="submit">
            <Save className="h-4 w-4" aria-hidden="true" />
            {saving ? "Salvando..." : "Salvar escuta"}
          </button>
          <Link className="inline-flex min-h-12 items-center rounded-full border border-semear-green/15 bg-white px-5 text-sm font-semibold text-semear-green" href="/escutas">Cancelar</Link>
        </div>
      </form>
    </section>
  );
}

function Input({ label, value, onChange, type = "text", required, placeholder }: { label: string; value: string; onChange: (value: string) => void; type?: string; required?: boolean; placeholder?: string }) {
  return <label><span className="text-sm font-semibold text-semear-green">{label}</span><input className="mt-2 min-h-12 w-full rounded-2xl border border-semear-gray bg-white px-4 text-sm outline-none focus:border-semear-green" onChange={(event) => onChange(event.target.value)} placeholder={placeholder} required={required} type={type} value={value} /></label>;
}

function Select({ label, value, onChange, children }: { label: string; value: string; onChange: (value: string) => void; children: ReactNode }) {
  return <label><span className="text-sm font-semibold text-semear-green">{label}</span><select className="mt-2 min-h-12 w-full rounded-2xl border border-semear-gray bg-white px-4 text-sm outline-none focus:border-semear-green" onChange={(event) => onChange(event.target.value)} value={value}>{children}</select></label>;
}

function Textarea({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return <label><span className="text-sm font-semibold text-semear-green">{label}</span><textarea className="mt-2 min-h-32 w-full rounded-2xl border border-semear-gray bg-white px-4 py-3 text-sm leading-6 outline-none focus:border-semear-green" onChange={(event) => onChange(event.target.value)} value={value} /></label>;
}
