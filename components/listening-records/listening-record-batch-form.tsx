"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import Link from "next/link";
import { ArrowLeft, AlertTriangle, PlayCircle } from "lucide-react";
import type { Action, Neighborhood, RespondentTerritoryRelation, SourceType, TeamMember, Theme } from "@/lib/database.types";
import { respondentTerritoryRelationOptions } from "@/lib/listening-records";
import { hasPossibleSensitiveOccupation } from "@/lib/action-pilot";
import { formatNeighborhoodOption, getOfficialNeighborhoodsForSelect } from "@/lib/neighborhoods";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";
import { SemearAlert, SemearButton, SemearCard, SemearPageHeader, SemearStatusBadge } from "@/components/ui/semear-primitives";

type BatchFormValues = {
  free_speech_text: string;
  words_used: string;
  places_mentioned_text: string;
  priority_mentioned: string;
  unexpected_notes: string;
  interviewer_team_member_id: string;
  interviewer_name: string;
  approximate_age_range: string;
  theme_ids: string[];
  respondent_city: string;
  respondent_neighborhood_id: string;
  respondent_territory_relation: string;
  respondent_occupation: string;
};

type SubmitMode = "next" | "draft";

const initialFormValues: BatchFormValues = {
  free_speech_text: "",
  words_used: "",
  places_mentioned_text: "",
  priority_mentioned: "",
  unexpected_notes: "",
  interviewer_team_member_id: "",
  interviewer_name: "",
  approximate_age_range: "",
  theme_ids: [],
  respondent_city: "Volta Redonda",
  respondent_neighborhood_id: "",
  respondent_territory_relation: "",
  respondent_occupation: "",
};

type ActionWithRelations = Action & {
  neighborhoods: Pick<Neighborhood, "id" | "name"> | null;
};

export function ListeningRecordBatchForm() {
  const supabase = useMemo(() => createBrowserSupabaseClient(), []);
  const [actions, setActions] = useState<ActionWithRelations[]>([]);
  const [interviewers, setInterviewers] = useState<TeamMember[]>([]);
  const [themes, setThemes] = useState<Theme[]>([]);
  const [neighborhoods, setNeighborhoods] = useState<Neighborhood[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitMode, setSubmitMode] = useState<SubmitMode>("next");

  // Travas da sessão
  const [lockedActionId, setLockedActionId] = useState<string>("");
  const [lockedSourceType, setLockedSourceType] = useState<SourceType>("feira");
  const [lockedInterviewerTeamMemberId, setLockedInterviewerTeamMemberId] = useState<string>("");

  function handleSelectAction(actionId: string) {
    setLockedActionId(actionId);
    const action = actions.find((a) => a.id === actionId);
    if (action?.action_type === "banca_escuta") {
      setLockedSourceType("feira");
    }
  }

  function handleSelectInterviewer(teamMemberId: string) {
    setLockedInterviewerTeamMemberId(teamMemberId);
    const interviewer = interviewers.find((item) => item.id === teamMemberId);
    setValues((prev) => ({
      ...prev,
      interviewer_team_member_id: teamMemberId,
      interviewer_name: interviewer?.display_name ?? prev.interviewer_name
    }));
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
      const [actionsRes, themesRes, neighborhoodsRes, interviewersRes] = await Promise.all([
        supabase.from("actions").select("*, neighborhoods:neighborhood_id(id, name)").order("action_date", { ascending: false }),
        supabase.from("themes").select("*").eq("is_active", true).order("name", { ascending: true }),
        supabase.from("neighborhoods").select("*").eq("status", "oficial").order("sector", { ascending: true }).order("name", { ascending: true }),
        supabase.from("team_members").select("*").eq("active", true).eq("can_interview", true).order("display_name", { ascending: true })
      ]);
      if (ignore) return;
      setActions((actionsRes.data ?? []) as ActionWithRelations[]);
      setThemes(themesRes.data ?? []);
      setNeighborhoods(getOfficialNeighborhoodsForSelect(neighborhoodsRes.data ?? []));
      setInterviewers((interviewersRes.data ?? []) as TeamMember[]);
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

    const respondentCityIsVoltaRedonda = isVoltaRedondaCity(values.respondent_city);

    const payload = {
      action_id: action.id,
      neighborhood_id: action.neighborhood_id,
      date: action.action_date,
      source_type: lockedSourceType,
      interviewer_name: values.interviewer_name.trim(),
      interviewer_team_member_id: values.interviewer_team_member_id || null,
      approximate_age_range: values.approximate_age_range.trim() || null,
      free_speech_text: values.free_speech_text.trim(),
      team_summary: null,
      words_used: values.words_used.trim() || null,
      places_mentioned_text: values.places_mentioned_text.trim() || null,
      priority_mentioned: values.priority_mentioned.trim() || null,
      unexpected_notes: values.unexpected_notes.trim() || null,
      review_status: "draft" as const,
      created_by: user.id,
      respondent_city: values.respondent_city.trim() || null,
      respondent_neighborhood_id: (respondentCityIsVoltaRedonda && values.respondent_neighborhood_id) ? values.respondent_neighborhood_id : null,
      respondent_territory_relation: (values.respondent_territory_relation as RespondentTerritoryRelation) || null,
      respondent_occupation: values.respondent_occupation.trim() || null
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

    if (submitMode === "draft") {
      setSaving(false);
      void window.scrollTo({ top: 0, behavior: "smooth" });
      window.location.assign(`/escutas?actionId=${action.id}&status=draft`);
      return;
    }
    
    // Keep interviewer_name and respondent fields across records (common for same person)
    setValues({
      ...initialFormValues,
      interviewer_team_member_id: lockedInterviewerTeamMemberId,
      interviewer_name: values.interviewer_name,
      respondent_city: values.respondent_city,
      respondent_neighborhood_id: values.respondent_neighborhood_id,
      respondent_territory_relation: values.respondent_territory_relation,
      respondent_occupation: values.respondent_occupation,
    });
    setSensitiveAlert(null);
    setSaving(false);
  }

  if (loading) return <div className="p-8">Carregando...</div>;

  const selectedAction = actions.find(a => a.id === lockedActionId);
  const respondentCityIsVoltaRedonda = isVoltaRedondaCity(values.respondent_city);

  return (
    <section className="mx-auto max-w-6xl pb-6">
      <SemearButton className="mb-5" href="/escutas" variant="secondary">
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        Voltar para escutas
      </SemearButton>

      <SemearPageHeader
        eyebrow="Ficha de Escuta Territorial - v4"
        title="Digitalização da ficha de campo"
        description="Digite a ficha seguindo a ordem usada em campo, preservando a metodologia e os campos estruturados do sistema."
        meta={<SemearStatusBadge tone="yellow">Privacidade: sem CPF, telefone ou endereço</SemearStatusBadge>}
      />

      <div className="lg:hidden sticky top-[4.25rem] z-20 mb-5 rounded-2xl border border-semear-green/15 bg-white/95 p-3 shadow-[0_12px_30px_rgba(23,74,55,0.1)] backdrop-blur">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-semear-earth">Sessão em campo</p>
            <p className="mt-1 truncate text-sm font-semibold text-semear-green">{selectedAction?.title ?? "Selecione a ação"}</p>
            <p className="mt-1 text-xs leading-5 text-stone-600">
              {selectedAction ? `${selectedAction.action_date} · ${selectedAction.neighborhoods?.name || "Sem bairro"}` : "Escolha a ação, o entrevistador e depois digite ficha por ficha."}
            </p>
          </div>
          <div className="rounded-xl bg-semear-green-soft px-3 py-2 text-right">
            <p className="text-[0.68rem] font-semibold uppercase tracking-[0.16em] text-semear-earth">Sessão</p>
            <p className="text-2xl font-semibold text-semear-green">{sessionCount}</p>
          </div>
        </div>
        <div className="mt-2 grid gap-2 sm:grid-cols-2">
          <div className="rounded-xl bg-white px-3 py-2 text-xs text-stone-600">
            <strong className="text-semear-green">Entrevistador:</strong> {values.interviewer_name || "Selecione acima"}
          </div>
          <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-medium text-amber-950">
            Não registre CPF, telefone ou endereço. Salve como rascunho e revise depois.
          </div>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_18rem]">
        <div>
          {/* TRAVA DE AÇÃO */}
          <SemearCard className="mb-6">
            <p className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-semear-earth">Folha 2 - identificação da escuta</p>
            <h2 className="text-xl font-semibold tracking-tight text-semear-green mb-4">1. Dados da ação</h2>
            <p className="mb-4 text-sm leading-6 text-stone-600">Selecione a ação vinculada, a origem/local da ação e a pessoa da equipe que conduziu a escuta. Esses dados ficam fixos para acelerar a digitação em campo.</p>
            <div className="grid gap-4 md:grid-cols-2">
              <label>
                <span className="text-sm font-semibold text-semear-green">Ação vinculada / nome da atividade</span>
                <select className="mt-2 min-h-12 w-full rounded-2xl border border-semear-gray bg-white px-4 text-sm outline-none focus:border-semear-green" value={lockedActionId} onChange={e => handleSelectAction(e.target.value)}>
                  <option value="">Selecione a ação...</option>
                  {actions.map(a => <option key={a.id} value={a.id}>{a.title} ({a.action_date})</option>)}
                </select>
              </label>
              <label>
                <span className="text-sm font-semibold text-semear-green">Local da ação</span>
                <select className="mt-2 min-h-12 w-full rounded-2xl border border-semear-gray bg-white px-4 text-sm outline-none focus:border-semear-green" value={lockedSourceType} onChange={e => setLockedSourceType(e.target.value as SourceType)}>
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
              <label className="md:col-span-2">
                <span className="text-sm font-semibold text-semear-green">2. Entrevistadora - nome da pessoa da equipe</span>
                <select className="mt-2 min-h-12 w-full rounded-2xl border border-semear-gray bg-white px-4 text-sm outline-none focus:border-semear-green" value={lockedInterviewerTeamMemberId} onChange={e => handleSelectInterviewer(e.target.value)}>
                  <option value="">Selecione...</option>
                  {interviewers.map((interviewer) => (
                    <option key={interviewer.id} value={interviewer.id}>{interviewer.display_name}</option>
                  ))}
                </select>
              </label>
            </div>
            {selectedAction && (
              <div className="mt-4 flex gap-4 rounded-xl border border-semear-green/10 bg-white p-4 text-sm text-semear-green shadow-[0_8px_18px_rgba(23,74,55,0.04)]">
                <span><strong>Data:</strong> {selectedAction.action_date}</span>
                <span><strong>Território da ação / bairro onde aconteceu:</strong> {selectedAction.neighborhoods?.name || "Sem bairro"}</span>
              </div>
            )}
          </SemearCard>

          {/* FORMULÁRIO */}
          <form className={`transition-opacity ${!lockedActionId ? 'opacity-50 pointer-events-none' : ''}`} onSubmit={handleSubmit}>
            <SemearCard>
              <SemearAlert tone="yellow">
                <div className="flex gap-3">
                <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" />
                Não registre CPF, telefone, endereço pessoal ou relato médico individual. Preserve a fala da pessoa, mas remova identificadores.
                </div>
              </SemearAlert>

              {error && <div className="mb-6 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">{error}</div>}
              {sensitiveAlert && <div className="mb-6 rounded-2xl border border-orange-300 bg-orange-50 p-4 text-sm text-orange-800 font-medium">{sensitiveAlert}</div>}

              <div className="space-y-8">
                <section className="rounded-2xl border border-semear-green/15 bg-white p-5 shadow-[0_10px_24px_rgba(23,74,55,0.04)]">
                  <div className="mb-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-semear-earth">3. Pessoa escutada - dados gerais e opcionais</p>
                    <h3 className="mt-1 text-lg font-semibold text-semear-green">Território de referência da fala</h3>
                    <p className="mt-1 text-xs leading-5 text-stone-600">Não identifique a pessoa. O objetivo é entender o território de referência da fala, não registrar endereço.</p>
                  </div>
                  <div className="grid gap-4 md:grid-cols-3">
                    <label>
                      <span className="text-sm font-semibold text-semear-green">Município de referência</span>
                      <input
                        className="mt-2 min-h-12 w-full rounded-2xl border border-semear-gray bg-white px-4 text-sm outline-none focus:border-semear-green"
                        placeholder="Volta Redonda"
                        value={values.respondent_city}
                        onChange={e => updateField("respondent_city", e.target.value)}
                      />
                    </label>
                    {respondentCityIsVoltaRedonda && (
                      <label>
                        <span className="text-sm font-semibold text-semear-green">Bairro / território de referência</span>
                        <select
                          className="mt-2 min-h-12 w-full rounded-2xl border border-semear-gray bg-white px-4 text-sm outline-none focus:border-semear-green"
                          value={values.respondent_neighborhood_id}
                          onChange={e => updateField("respondent_neighborhood_id", e.target.value)}
                        >
                          <option value="">Selecione o bairro...</option>
                          {neighborhoods.map(n => (
                            <option key={n.id} value={n.id}>{formatNeighborhoodOption(n)}</option>
                          ))}
                        </select>
                      </label>
                    )}
                    <label>
                      <span className="text-sm font-semibold text-semear-green">Vínculo com o território</span>
                      <select
                        className="mt-2 min-h-12 w-full rounded-2xl border border-semear-gray bg-white px-4 text-sm outline-none focus:border-semear-green"
                        value={values.respondent_territory_relation}
                        onChange={e => updateField("respondent_territory_relation", e.target.value)}
                      >
                        <option value="">Selecione...</option>
                        {respondentTerritoryRelationOptions.map(o => (
                          <option key={o.value} value={o.value}>{o.label}</option>
                        ))}
                      </select>
                    </label>
                    <label>
                      <span className="text-sm font-semibold text-semear-green">Faixa etária aprox.</span>
                      <input className="mt-2 min-h-12 w-full rounded-2xl border border-semear-gray bg-white px-4 text-sm outline-none focus:border-semear-green" value={values.approximate_age_range} onChange={e => updateField("approximate_age_range", e.target.value)} />
                    </label>
                    <label className="md:col-span-2">
                      <span className="text-sm font-semibold text-semear-green">Ocupação / atividade principal <span className="text-xs font-medium text-stone-500">(opcional)</span></span>
                      <input
                        className="mt-2 min-h-12 w-full rounded-2xl border border-semear-gray bg-white px-4 text-sm outline-none focus:border-semear-green"
                        placeholder="Ex.: aposentada, estudante, comerciante, trabalhador da indústria"
                        value={values.respondent_occupation}
                        onChange={e => updateField("respondent_occupation", e.target.value)}
                      />
                      <p className="mt-2 text-xs leading-5 text-stone-600">Sem nome de empresa, escola, setor específico ou local de trabalho.</p>
                    </label>
                  </div>
                  {hasPossibleSensitiveOccupation(values.respondent_occupation) ? (
                    <p className="mt-3 rounded-2xl border border-amber-200 bg-amber-50 p-3 text-sm font-semibold text-amber-900">
                      Verifique se a ocupação não identifica a pessoa. Prefira descrição geral.
                    </p>
                  ) : null}
                </section>

                <section>
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-semear-earth">4. Resumo fiel da fala</p>
                  <label className="mt-4 block rounded-2xl border border-semear-green/20 bg-white p-4 shadow-[0_10px_24px_rgba(23,74,55,0.04)]">
                    <span className="text-sm font-bold text-semear-green">Escreva com fidelidade o sentido da fala da pessoa</span>
                    <textarea className="mt-3 min-h-48 w-full rounded-2xl border border-semear-green/20 bg-white px-4 py-3 text-base leading-7 outline-none focus:border-semear-green" required value={values.free_speech_text} onChange={e => updateField("free_speech_text", e.target.value)} />
                    <p className="mt-2 text-xs leading-5 text-stone-600">Não transforme em opinião da equipe. Não registre identificação pessoal.</p>
                  </label>
                  <label className="mt-4 block">
                    <span className="text-sm font-semibold text-semear-green">Nome da entrevistadora</span>
                    <input className="mt-2 min-h-12 w-full rounded-2xl border border-semear-gray bg-white px-4 text-sm outline-none focus:border-semear-green" readOnly={Boolean(lockedInterviewerTeamMemberId)} required value={values.interviewer_name} onChange={e => updateField("interviewer_name", e.target.value)} />
                  </label>
                </section>

                <section className="rounded-2xl border border-dashed border-semear-green/25 bg-white p-5">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-semear-earth">Folha 3 - codificação e revisão</p>
                  <h3 className="mt-1 font-semibold text-semear-green">5. Temas percebidos na fala</h3>
                  <div className="mt-4 flex flex-wrap gap-2">
                  {themes.map(theme => (
                    <button
                      className={`rounded-full border px-4 py-3 text-sm font-semibold transition ${values.theme_ids.includes(theme.id) ? "border-semear-green bg-semear-green text-white" : "border-semear-green/20 bg-white text-semear-green"}`}
                      key={theme.id}
                      onClick={() => toggleTheme(theme.id)}
                      type="button"
                    >
                      {theme.name}
                    </button>
                  ))}
                  </div>
                </section>

                <section>
                  <div className="mt-4 grid gap-4 md:grid-cols-2">
                    <label>
                      <span className="text-sm font-semibold text-semear-green">6. Lugares citados</span>
                      <input className="mt-2 min-h-12 w-full rounded-2xl border border-semear-gray bg-white px-4 text-sm outline-none focus:border-semear-green" value={values.places_mentioned_text} onChange={e => updateField("places_mentioned_text", e.target.value)} />
                      <p className="mt-2 text-xs leading-5 text-stone-600">Anote lugares coletivos citados na fala. Não registre endereço pessoal.</p>
                    </label>
                    <label>
                      <span className="text-sm font-semibold text-semear-green">Palavras citadas</span>
                      <input className="mt-2 min-h-12 w-full rounded-2xl border border-semear-gray bg-white px-4 text-sm outline-none focus:border-semear-green" value={values.words_used} onChange={e => updateField("words_used", e.target.value)} />
                    </label>
                    <label className="md:col-span-2">
                      <span className="text-sm font-semibold text-semear-green">7. Prioridade apontada pela pessoa</span>
                      <input className="mt-2 min-h-12 w-full rounded-2xl border border-semear-gray bg-white px-4 text-sm outline-none focus:border-semear-green" value={values.priority_mentioned} onChange={e => updateField("priority_mentioned", e.target.value)} />
                    </label>
                    <label className="md:col-span-2">
                      <span className="text-sm font-semibold text-semear-green">8. Observações inesperadas / algo que a equipe não imaginava</span>
                      <input className="mt-2 min-h-12 w-full rounded-2xl border border-semear-gray bg-white px-4 text-sm outline-none focus:border-semear-green" value={values.unexpected_notes} onChange={e => updateField("unexpected_notes", e.target.value)} />
                    </label>
                  </div>
                </section>

                <div className="sticky bottom-[calc(env(safe-area-inset-bottom,0px)+5.85rem)] z-20 mt-8 rounded-2xl border border-semear-green/15 bg-white/95 p-3 shadow-[0_18px_42px_rgba(23,74,55,0.14)] backdrop-blur md:bottom-4 md:p-4">
                  <div className="grid gap-3 sm:grid-cols-2">
                    <button className="inline-flex min-h-14 w-full items-center justify-center gap-2 rounded-xl bg-semear-green px-5 text-base font-semibold text-white disabled:opacity-60" disabled={saving || !lockedActionId} onClick={() => setSubmitMode("next")} type="submit">
                      <PlayCircle className="h-5 w-5" aria-hidden="true" />
                      {saving && submitMode === "next" ? "Salvando..." : "Salvar e digitar próxima"}
                    </button>
                    <button className="inline-flex min-h-14 w-full items-center justify-center rounded-xl border border-semear-green/20 bg-white px-5 text-base font-semibold text-semear-green disabled:opacity-60" disabled={saving || !lockedActionId} onClick={() => setSubmitMode("draft")} type="submit">
                      {saving && submitMode === "draft" ? "Salvando..." : "Salvar rascunho"}
                    </button>
                  </div>
                  <p className="mt-3 text-center text-xs text-stone-500 uppercase tracking-widest font-semibold">No celular, digite agora e revise depois com calma.</p>
                </div>
              </div>
            </SemearCard>
          </form>
        </div>

        {/* SIDEBAR */}
        <div className="hidden space-y-6 xl:block">
          <div className="rounded-2xl border border-semear-green/15 bg-white p-6 shadow-[0_14px_34px_rgba(23,74,55,0.06)]">
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
            <div className="rounded-2xl border border-semear-green/15 bg-white p-6 shadow-[0_14px_34px_rgba(23,74,55,0.06)]">
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

function isVoltaRedondaCity(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase() === "volta redonda";
}
