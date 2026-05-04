"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import Link from "next/link";
import { ArrowLeft, Save, AlertTriangle, PlayCircle } from "lucide-react";
import type { Action, Neighborhood, Theme } from "@/lib/database.types";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";

type BatchFormValues = {
  free_speech_text: string;
  words_used: string;
  places_mentioned_text: string;
  priority_mentioned: string;
  unexpected_notes: string;
  interviewer_name: string;
  approximate_age_range: string;
  theme_ids: string[];
};

const initialFormValues: BatchFormValues = {
  free_speech_text: "",
  words_used: "",
  places_mentioned_text: "",
  priority_mentioned: "",
  unexpected_notes: "",
  interviewer_name: "",
  approximate_age_range: "",
  theme_ids: [],
};

type ActionWithRelations = Action & {
  neighborhoods: Pick<Neighborhood, "id" | "name"> | null;
};

export function ListeningRecordBatchForm() {
  const supabase = useMemo(() => createBrowserSupabaseClient(), []);
  const [actions, setActions] = useState<ActionWithRelations[]>([]);
  const [themes, setThemes] = useState<Theme[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Travas da sessão
  const [lockedActionId, setLockedActionId] = useState<string>("");
  const [lockedSourceType, setLockedSourceType] = useState<string>("feira");

  function handleSelectAction(actionId: string) {
    setLockedActionId(actionId);
    const action = actions.find((a) => a.id === actionId);
    if (action?.action_type === "banca_escuta") {
      setLockedSourceType("feira");
    }
  }
  
  // Dados do form
  const [values, setValues] = useState<BatchFormValues>(initialFormValues);
  
  // Contadores
  const [sessionCount, setSessionCount] = useState(0);
  const [lastSavedId, setLastSavedId] = useState<string | null>(null);
  const [sensitiveAlert, setSensitiveAlert] = useState<string | null>(null);

  function showError(message: string) {
    setError(message);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  useEffect(() => {
    let ignore = false;
    async function load() {
      if (!supabase) return;
      const [actionsRes, themesRes] = await Promise.all([
        supabase.from("actions").select("*, neighborhoods:neighborhood_id(id, name)").order("action_date", { ascending: false }),
        supabase.from("themes").select("*").eq("is_active", true).order("name", { ascending: true })
      ]);
      if (ignore) return;
      setActions((actionsRes.data ?? []) as ActionWithRelations[]);
      setThemes(themesRes.data ?? []);
      setLoading(false);
    }
    void load();
    return () => { ignore = true; };
  }, [supabase]);

  function updateField<K extends keyof BatchFormValues>(field: K, value: BatchFormValues[K]) {
    setValues((prev) => {
      const next = { ...prev, [field]: value };
      if (field === "free_speech_text") {
        checkSensitiveData(value as string);
      }
      return next;
    });
  }

  function checkSensitiveData(text: string) {
    const phoneRegex = /\b\d{4,5}[-.\s]?\d{4}\b/;
    const cpfRegex = /\b\d{3}[-.\s]?\d{3}[-.\s]?\d{3}[-.\s]?\d{2}\b/;
    const emailRegex = /\S+@\S+\.\S+/;
    if (phoneRegex.test(text) || cpfRegex.test(text) || emailRegex.test(text)) {
      setSensitiveAlert("Possível dado sensível detectado (telefone, CPF ou e-mail). Revise antes de salvar.");
    } else {
      setSensitiveAlert(null);
    }
  }

  function toggleTheme(themeId: string) {
    setValues((current) => ({
      ...current,
      theme_ids: current.theme_ids.includes(themeId)
        ? current.theme_ids.filter((id) => id !== themeId)
        : [...current.theme_ids, themeId]
    }));
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!supabase) return;
    if (!lockedActionId) {
      showError("Selecione e trave uma ação primeiro.");
      return;
    }
    
    const action = actions.find(a => a.id === lockedActionId);
    if (!action) return;

    if (!values.interviewer_name.trim() || !values.free_speech_text.trim()) {
      showError("Entrevistador e fala original são obrigatórios.");
      return;
    }

    setSaving(true);
    setError(null);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      showError("Usuário não autenticado");
      setSaving(false);
      return;
    }

    const payload = {
      action_id: action.id,
      neighborhood_id: action.neighborhood_id,
      date: action.action_date,
      source_type: lockedSourceType as any,
      interviewer_name: values.interviewer_name.trim(),
      approximate_age_range: values.approximate_age_range.trim() || null,
      free_speech_text: values.free_speech_text.trim(),
      team_summary: null,
      words_used: values.words_used.trim() || null,
      places_mentioned_text: values.places_mentioned_text.trim() || null,
      priority_mentioned: values.priority_mentioned.trim() || null,
      unexpected_notes: values.unexpected_notes.trim() || null,
      review_status: "draft" as const,
      created_by: user.id
    };

    const res = await supabase.from("listening_records").insert(payload).select("id").single();
    
    if (res.error) {
      showError(res.error.message);
      setSaving(false);
      return;
    }

    if (values.theme_ids.length > 0) {
      await supabase.from("listening_record_themes").insert(
        values.theme_ids.map(id => ({
          listening_record_id: res.data.id,
          theme_id: id,
          created_by: user.id,
          notes: null
        }))
      );
    }

    setSessionCount(c => c + 1);
    setLastSavedId(res.data.id);
    
    // Keep interviewer_name, reset the rest
    setValues({
      ...initialFormValues,
      interviewer_name: values.interviewer_name,
    });
    setSensitiveAlert(null);
    setSaving(false);
  }

  if (loading) return <div className="p-8">Carregando...</div>;

  const selectedAction = actions.find(a => a.id === lockedActionId);

  return (
    <section className="pb-10 max-w-5xl mx-auto">
      <Link className="mb-5 inline-flex min-h-11 items-center gap-2 rounded-full border border-semear-green/15 bg-white/70 px-4 text-sm font-semibold text-semear-green" href="/escutas">
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        Voltar para escutas
      </Link>

      <div className="grid gap-6 lg:grid-cols-[1fr_300px]">
        <div>
          {/* TRAVA DE AÇÃO */}
          <div className="rounded-[2rem] border border-white/80 bg-white/78 p-6 shadow-soft mb-6">
            <h2 className="text-xl font-semibold tracking-tight text-semear-green mb-4">Sessão de digitação — fixar ação</h2>
            <div className="grid gap-4 md:grid-cols-2">
              <label>
                <span className="text-sm font-semibold text-semear-green">Ação</span>
                <select className="mt-2 min-h-12 w-full rounded-2xl border border-semear-gray bg-white px-4 text-sm outline-none focus:border-semear-green" value={lockedActionId} onChange={e => handleSelectAction(e.target.value)}>
                  <option value="">Selecione a ação...</option>
                  {actions.map(a => <option key={a.id} value={a.id}>{a.title} ({a.action_date})</option>)}
                </select>
              </label>
              <label>
                <span className="text-sm font-semibold text-semear-green">Origem</span>
                <select className="mt-2 min-h-12 w-full rounded-2xl border border-semear-gray bg-white px-4 text-sm outline-none focus:border-semear-green" value={lockedSourceType} onChange={e => setLockedSourceType(e.target.value)}>
                  <option value="feira">Feira</option>
                  <option value="cras">CRAS</option>
                  <option value="escola">Escola</option>
                  <option value="praca">Praça</option>
                  <option value="roda">Roda</option>
                  <option value="oficina">Oficina</option>
                  <option value="caminhada">Caminhada</option>
                  <option value="outro">Outro</option>
                </select>
              </label>
            </div>
            {selectedAction && (
              <div className="mt-4 p-4 rounded-xl bg-semear-green-soft text-sm text-semear-green flex gap-4">
                <span><strong>Data:</strong> {selectedAction.action_date}</span>
                <span><strong>Bairro:</strong> {selectedAction.neighborhoods?.name || "Sem bairro"}</span>
              </div>
            )}
          </div>

          {/* FORMULÁRIO */}
          <form className={`transition-opacity ${!lockedActionId ? 'opacity-50 pointer-events-none' : ''}`} onSubmit={handleSubmit}>
            <div className="rounded-[2rem] border border-white/80 bg-white/78 p-6 shadow-soft">
              <div className="mb-6 flex gap-3 rounded-2xl border border-semear-yellow/40 bg-semear-yellow/20 p-4 text-sm leading-6 text-semear-green">
                <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" />
                Não registre CPF, telefone, endereço pessoal ou relato médico individual. Preserve a fala da pessoa, mas remova identificadores.
              </div>

              {error && <div className="mb-6 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">{error}</div>}
              {sensitiveAlert && <div className="mb-6 rounded-2xl border border-orange-300 bg-orange-50 p-4 text-sm text-orange-800 font-medium">{sensitiveAlert}</div>}

              <div className="grid gap-5 md:grid-cols-2">
                <label className="md:col-span-2 rounded-[1.5rem] border-2 border-semear-green/35 bg-semear-green-soft/70 p-4">
                  <span className="text-sm font-bold text-semear-green">Fala original / síntese livre</span>
                  <textarea className="mt-3 min-h-48 w-full rounded-2xl border border-semear-green/20 bg-white px-4 py-3 text-base leading-7 outline-none focus:border-semear-green" required value={values.free_speech_text} onChange={e => updateField("free_speech_text", e.target.value)} />
                </label>

                <label><span className="text-sm font-semibold text-semear-green">Entrevistador</span><input className="mt-2 min-h-12 w-full rounded-2xl border border-semear-gray bg-white px-4 text-sm outline-none focus:border-semear-green" required value={values.interviewer_name} onChange={e => updateField("interviewer_name", e.target.value)} /></label>
                <label><span className="text-sm font-semibold text-semear-green">Faixa etária opcional</span><input className="mt-2 min-h-12 w-full rounded-2xl border border-semear-gray bg-white px-4 text-sm outline-none focus:border-semear-green" value={values.approximate_age_range} onChange={e => updateField("approximate_age_range", e.target.value)} /></label>

                <label><span className="text-sm font-semibold text-semear-green">Palavras citadas</span><input className="mt-2 min-h-12 w-full rounded-2xl border border-semear-gray bg-white px-4 text-sm outline-none focus:border-semear-green" value={values.words_used} onChange={e => updateField("words_used", e.target.value)} /></label>
                <label><span className="text-sm font-semibold text-semear-green">Lugares citados</span><input className="mt-2 min-h-12 w-full rounded-2xl border border-semear-gray bg-white px-4 text-sm outline-none focus:border-semear-green" value={values.places_mentioned_text} onChange={e => updateField("places_mentioned_text", e.target.value)} /></label>

                <label className="md:col-span-2"><span className="text-sm font-semibold text-semear-green">Prioridade apontada</span><input className="mt-2 min-h-12 w-full rounded-2xl border border-semear-gray bg-white px-4 text-sm outline-none focus:border-semear-green" value={values.priority_mentioned} onChange={e => updateField("priority_mentioned", e.target.value)} /></label>
                <label className="md:col-span-2"><span className="text-sm font-semibold text-semear-green">Observações inesperadas</span><input className="mt-2 min-h-12 w-full rounded-2xl border border-semear-gray bg-white px-4 text-sm outline-none focus:border-semear-green" value={values.unexpected_notes} onChange={e => updateField("unexpected_notes", e.target.value)} /></label>
              </div>

              <div className="mt-8 rounded-[1.5rem] border border-dashed border-semear-green/25 bg-semear-offwhite p-5">
                <h3 className="font-semibold text-semear-green">Temas (Codificação preliminar)</h3>
                <div className="mt-4 flex flex-wrap gap-2">
                  {themes.map(theme => (
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

              <div className="mt-8">
                <button className="inline-flex min-h-14 w-full items-center justify-center gap-2 rounded-full bg-semear-green px-5 text-base font-semibold text-white disabled:opacity-60" disabled={saving || !lockedActionId} type="submit">
                  <PlayCircle className="h-5 w-5" aria-hidden="true" />
                  {saving ? "Salvando..." : "Salvar e digitar próxima"}
                </button>
                <p className="text-center mt-3 text-xs text-stone-500 uppercase tracking-widest font-semibold">Digite a ficha como rascunho. A revisão será feita depois, com calma.</p>
              </div>
            </div>
          </form>
        </div>

        {/* SIDEBAR */}
        <div className="space-y-6">
          <div className="rounded-[2rem] border border-semear-green/15 bg-white/78 p-6 shadow-soft">
            <h3 className="text-sm font-semibold uppercase tracking-[0.18em] text-semear-earth mb-2">Sessão Atual</h3>
            <p className="text-4xl font-semibold text-semear-green">{sessionCount}</p>
            <p className="text-sm text-stone-600">fichas digitadas por você agora.</p>
            {lastSavedId && (
              <Link className="mt-4 block text-sm font-semibold text-semear-green hover:underline" href={`/escutas/${lastSavedId}`} target="_blank">
                Ver última salva
              </Link>
            )}
          </div>
          
          {selectedAction && (
            <div className="rounded-[2rem] border border-semear-green/15 bg-white/78 p-6 shadow-soft">
              <h3 className="text-sm font-semibold uppercase tracking-[0.18em] text-semear-earth mb-4">Ação Selecionada</h3>
              <p className="text-sm text-stone-700 font-medium">{selectedAction.title}</p>
              <Link className="mt-4 block text-sm font-semibold text-semear-green hover:underline" href={`/escutas?actionId=${selectedAction.id}`}>
                Ver fila de revisão desta ação &rarr;
              </Link>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
