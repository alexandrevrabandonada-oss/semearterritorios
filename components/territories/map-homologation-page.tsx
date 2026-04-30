"use client";

import { useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import Link from "next/link";
import { CheckCircle2, ClipboardList, Save, ShieldCheck, XCircle } from "lucide-react";
import { MapGoNoGoPanel } from "@/components/territories/map-go-no-go-panel";
import { MapHomologationPanel } from "@/components/territories/map-homologation-panel";
import type { Neighborhood, NormalizedPlace, PlaceMentioned } from "@/lib/database.types";
import { buildInternalMapGoNoGo } from "@/lib/internal-map-scope";
import type { MapHomologationManualChecks } from "@/lib/internal-map-homologation";
import {
  approveMapHomologation,
  createDraftMapHomologation,
  formFromHomologation,
  getHomologationDecisionLabel,
  getHomologationStatusLabel,
  getLatestMapHomologation,
  rejectMapHomologation,
  updateMapHomologation,
  validateHomologationApproval,
  type MapHomologationForm
} from "@/lib/internal-map-homologation-records";
import { buildNormalizedPlacesQuality } from "@/lib/normalized-places-quality";
import { buildTerritorialQualityByNeighborhood } from "@/lib/territorial-quality";
import type { TerritorialReviewRecord } from "@/lib/territorial-review";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";
import type { InternalMapHomologation, InternalMapHomologationDecision, Profile } from "@/lib/database.types";

type PlaceMentionForQuality = Pick<PlaceMentioned, "id" | "normalized_place_id" | "place_type">;

const initialChecks: MapHomologationManualChecks = {
  rlsValidated: false,
  adminTested: false,
  coordenacaoTested: false,
  equipeTested: false,
  anonBlocked: false,
  serviceRoleAbsent: false,
  noOriginalSpeech: true,
  noPersonalData: true,
  sensitiveHidden: true,
  sensitiveTypeHidden: true,
  noGeocoding: true
};

const initialForm: MapHomologationForm = {
  ...initialChecks,
  status: "draft",
  decision: "manter_mapa_lista",
  decisionReason: "Homologação do mapa interno ainda em rascunho."
};

export function MapHomologationPage() {
  const supabase = useMemo(() => createBrowserSupabaseClient(), []);
  const [records, setRecords] = useState<TerritorialReviewRecord[]>([]);
  const [neighborhoods, setNeighborhoods] = useState<Neighborhood[]>([]);
  const [normalizedPlaces, setNormalizedPlaces] = useState<NormalizedPlace[]>([]);
  const [placesMentioned, setPlacesMentioned] = useState<PlaceMentionForQuality[]>([]);
  const [homologation, setHomologation] = useState<InternalMapHomologation | null>(null);
  const [profile, setProfile] = useState<Pick<Profile, "id" | "role"> | null>(null);
  const [form, setForm] = useState<MapHomologationForm>(initialForm);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let ignore = false;

    async function load() {
      if (!supabase) {
        setError("Configure NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_ANON_KEY para homologar o mapa.");
        setLoading(false);
        return;
      }

      const user = (await supabase.auth.getUser()).data.user;
      const [recordsResult, neighborhoodsResult, normalizedResult, placesResult, homologationResult, profileResult] = await Promise.all([
        supabase
          .from("listening_records")
          .select("*, listening_record_themes(themes:theme_id(id, name)), places_mentioned(id, place_name, place_type, notes, neighborhood_id, normalized_place_id, normalized_places:normalized_place_id(id, normalized_name, visibility, place_type))"),
        supabase.from("neighborhoods").select("*").order("name", { ascending: true }),
        supabase.from("normalized_places").select("*").order("normalized_name", { ascending: true }),
        supabase.from("places_mentioned").select("id, normalized_place_id, place_type"),
        getLatestMapHomologation(supabase).then((data) => ({ data, error: null })).catch((error: Error) => ({ data: null, error })),
        user ? supabase.from("profiles").select("id, role").eq("id", user.id).maybeSingle() : Promise.resolve({ data: null, error: null })
      ]);

      if (ignore) return;

      if (recordsResult.error || neighborhoodsResult.error || normalizedResult.error || placesResult.error || homologationResult.error || profileResult.error) {
        setError(recordsResult.error?.message ?? neighborhoodsResult.error?.message ?? normalizedResult.error?.message ?? placesResult.error?.message ?? homologationResult.error?.message ?? profileResult.error?.message ?? "Erro ao carregar homologação do mapa.");
        setLoading(false);
        return;
      }

      setRecords((recordsResult.data ?? []) as TerritorialReviewRecord[]);
      setNeighborhoods(neighborhoodsResult.data ?? []);
      setNormalizedPlaces((normalizedResult.data ?? []) as NormalizedPlace[]);
      setPlacesMentioned((placesResult.data ?? []) as PlaceMentionForQuality[]);
      setHomologation(homologationResult.data);
      setForm(formFromHomologation(homologationResult.data));
      setProfile(profileResult.data as Pick<Profile, "id" | "role"> | null);
      setLoading(false);
    }

    void load();
    return () => {
      ignore = true;
    };
  }, [supabase]);

  if (loading) return <StateBox>Carregando homologação do mapa...</StateBox>;
  if (error) return <StateBox tone="error">{error}</StateBox>;

  const territoryQuality = buildTerritorialQualityByNeighborhood(neighborhoods, records);
  const normalizedQuality = buildNormalizedPlacesQuality({ normalizedPlaces, placesMentioned, neighborhoods, territoryQuality });
  const checks = form;
  const goNoGo = buildInternalMapGoNoGo({ neighborhoods, records, normalizedQuality, rlsValidated: form.rlsValidated });
  const approvalCheck = validateHomologationApproval(form, goNoGo, profile?.role);
  const canCoordinate = profile?.role === "admin" || profile?.role === "coordenacao";

  function updateCheck(field: keyof MapHomologationManualChecks, value: boolean) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  function updateForm<TField extends keyof MapHomologationForm>(field: TField, value: MapHomologationForm[TField]) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  async function saveHomologation(status: MapHomologationForm["status"] = form.status) {
    if (!supabase) return;
    const user = (await supabase.auth.getUser()).data.user;
    if (!user) {
      setError("Entre no sistema antes de salvar a homologação.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const saved = homologation
        ? await updateMapHomologation(supabase, homologation.id, { form, goNoGo, status })
        : await createDraftMapHomologation(supabase, { userId: user.id, form: { ...form, status }, goNoGo });
      setHomologation(saved);
      setForm(formFromHomologation(saved));
      setFeedback(status === "reviewed" ? "Homologação marcada como revisada." : "Homologação salva.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao salvar homologação.");
    } finally {
      setSaving(false);
    }
  }

  async function approve() {
    if (!supabase || !homologation || !profile) return;
    setSaving(true);
    setError(null);
    try {
      const approved = await approveMapHomologation(supabase, homologation.id, { user: profile, form, goNoGo });
      setHomologation(approved);
      setForm(formFromHomologation(approved));
      setFeedback("Homologação aprovada para protótipo interno.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao aprovar homologação.");
    } finally {
      setSaving(false);
    }
  }

  async function reject() {
    if (!supabase || !homologation || !profile) return;
    setSaving(true);
    setError(null);
    try {
      const rejected = await rejectMapHomologation(supabase, homologation.id, { user: profile, form, goNoGo });
      setHomologation(rejected);
      setForm(formFromHomologation(rejected));
      setFeedback("Homologação rejeitada com auditoria.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao rejeitar homologação.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="pb-10">
      <div className="rounded-[2rem] border border-white/80 bg-white/78 p-6 shadow-soft">
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-semear-earth">Mapa interno</p>
        <h2 className="mt-3 text-4xl font-semibold tracking-tight text-semear-green">Homologação do mapa interno</h2>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-stone-600">
          Etapa formal antes de qualquer protótipo visual. A RLS deve ser validada manualmente no banco aplicado; este painel apenas organiza critérios e relatório.
        </p>
        <div className="mt-5 flex flex-wrap gap-2">
          <Link className="inline-flex min-h-11 items-center rounded-full bg-semear-green px-4 text-sm font-semibold text-white" href="/mapa">Abrir mapa-lista V0</Link>
          <Link className="inline-flex min-h-11 items-center rounded-full border border-semear-green/15 bg-white px-4 text-sm font-semibold text-semear-green" href="/territorios/qualidade">Qualidade territorial</Link>
          <Link className="inline-flex min-h-11 items-center rounded-full border border-semear-green/15 bg-white px-4 text-sm font-semibold text-semear-green" href="/territorios/normalizacao/qualidade">Qualidade da normalização</Link>
        </div>
      </div>

      <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Metric label="Status" value={0} helper={getHomologationStatusLabel(homologation?.status)} />
        <Metric label="Escutas revisadas" value={goNoGo.summary.reviewedRecords} />
        <Metric label="Territórios" value={goNoGo.summary.territoriesWithData} />
        <Metric label="Territórios prontos" value={goNoGo.summary.readyTerritories} />
        <Metric label="Territórios bloqueados" value={goNoGo.summary.blockedTerritories} danger={goNoGo.summary.blockedTerritories > 0} />
        <Metric label="Lugares seguros" value={goNoGo.summary.safeNormalizedPlaces} />
        <Metric label="Sensíveis" value={goNoGo.summary.sensitivePlaces} danger={goNoGo.summary.sensitivePlaces > 0} />
        <Metric label="Duplicidades" value={goNoGo.summary.duplicateWarnings} danger={goNoGo.summary.duplicateWarnings > 0} />
        <Metric label="Sem normalização" value={goNoGo.summary.unnormalizedStructuredPlaces} danger={goNoGo.summary.unnormalizedStructuredPlaces > 0} />
      </div>

      <section className="mt-5 rounded-[2rem] border border-white/80 bg-white p-5 shadow-soft">
        <h3 className="font-semibold text-semear-green">Registro persistente</h3>
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          <label>
            <span className="text-sm font-semibold text-semear-green">Decisão</span>
            <select className="mt-2 min-h-11 w-full rounded-2xl border border-semear-gray bg-white px-3 text-sm outline-none focus:border-semear-green" value={form.decision} onChange={(event) => updateForm("decision", event.target.value as InternalMapHomologationDecision)}>
              <option value="no_go_dados_insuficientes">NO-GO: dados insuficientes</option>
              <option value="no_go_privacidade">NO-GO: privacidade</option>
              <option value="no_go_normalizacao">NO-GO: normalização</option>
              <option value="go_desenho_tecnico">GO: desenho técnico</option>
              <option value="go_prototipo_interno">GO: protótipo interno</option>
              <option value="manter_mapa_lista">Manter mapa-lista</option>
            </select>
          </label>
          <div className="rounded-2xl border border-semear-gray bg-semear-offwhite p-4 text-sm text-stone-700">
            <p><strong>Status:</strong> {getHomologationStatusLabel(homologation?.status)}</p>
            <p className="mt-1"><strong>Decisão salva:</strong> {getHomologationDecisionLabel(homologation?.decision)}</p>
            <p className="mt-1"><strong>Aprovada em:</strong> {homologation?.approved_at ? new Date(homologation.approved_at).toLocaleString("pt-BR") : "não aprovada"}</p>
            <p className="mt-1"><strong>Rejeitada em:</strong> {homologation?.rejected_at ? new Date(homologation.rejected_at).toLocaleString("pt-BR") : "não rejeitada"}</p>
          </div>
        </div>
        <label className="mt-4 block">
          <span className="text-sm font-semibold text-semear-green">Justificativa da decisão</span>
          <textarea className="mt-2 min-h-28 w-full rounded-2xl border border-semear-gray bg-white px-4 py-3 text-sm leading-6 outline-none focus:border-semear-green" value={form.decisionReason} onChange={(event) => updateForm("decisionReason", event.target.value)} />
        </label>
      </section>

      <section className="mt-5 rounded-[2rem] border border-white/80 bg-white p-5 shadow-soft">
        <div className="mb-4 flex items-center gap-3 text-semear-green">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-semear-green-soft">
            <ClipboardList className="h-5 w-5" aria-hidden="true" />
          </div>
          <h3 className="font-semibold">Checklist manual de homologação</h3>
        </div>
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          <Check label="RLS validada manualmente" checked={checks.rlsValidated} onChange={(value) => updateCheck("rlsValidated", value)} />
          <Check label="Usuário admin testado" checked={checks.adminTested} onChange={(value) => updateCheck("adminTested", value)} />
          <Check label="Usuário coordenação testado" checked={checks.coordenacaoTested} onChange={(value) => updateCheck("coordenacaoTested", value)} />
          <Check label="Usuário equipe testado" checked={checks.equipeTested} onChange={(value) => updateCheck("equipeTested", value)} />
          <Check label="Anônimo sem acesso" checked={checks.anonBlocked} onChange={(value) => updateCheck("anonBlocked", value)} />
          <Check label="service_role ausente do frontend" checked={checks.serviceRoleAbsent} onChange={(value) => updateCheck("serviceRoleAbsent", value)} />
          <Check label="Mapa sem fala original" checked={checks.noOriginalSpeech} onChange={(value) => updateCheck("noOriginalSpeech", value)} />
          <Check label="Mapa sem CPF/telefone/e-mail/endereço" checked={checks.noPersonalData} onChange={(value) => updateCheck("noPersonalData", value)} />
          <Check label="visibility sensitive oculto" checked={checks.sensitiveHidden} onChange={(value) => updateCheck("sensitiveHidden", value)} />
          <Check label="sensivel_nao_publicar oculto" checked={checks.sensitiveTypeHidden} onChange={(value) => updateCheck("sensitiveTypeHidden", value)} />
          <Check label="Sem geocodificação" checked={checks.noGeocoding} onChange={(value) => updateCheck("noGeocoding", value)} />
        </div>
        <p className="mt-4 text-sm leading-6 text-stone-600">
          Marcar um item aqui não executa teste automático. Registre evidências em `docs/homologacao-mapa-interno.md`.
        </p>
      </section>

      <section className="mt-5 rounded-[2rem] border border-white/80 bg-white p-5 shadow-soft">
        <div className="mb-4 flex items-center gap-3 text-semear-green">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-semear-green-soft">
            <ShieldCheck className="h-5 w-5" aria-hidden="true" />
          </div>
          <div>
            <h3 className="font-semibold">Evidências necessárias antes de aprovar</h3>
            <p className="mt-1 text-sm text-stone-600">Esta lista orienta o teste manual. O sistema não executa validação automática de RLS.</p>
          </div>
        </div>
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {[
            "RLS testada com admin",
            "RLS testada com coordenação",
            "RLS testada com equipe",
            "Anônimo bloqueado",
            "service_role ausente do frontend",
            "Relatório de qualidade territorial copiado",
            "Relatório de qualidade da normalização copiado",
            "Decisão formal preenchida"
          ].map((item) => (
            <div className="rounded-2xl border border-semear-gray bg-semear-offwhite p-3 text-sm leading-6 text-stone-700" key={item}>
              {item}
            </div>
          ))}
        </div>
        <p className="mt-4 text-sm leading-6 text-stone-600">
          Use os arquivos <strong>docs/checklist-homologacao-real-mapa.md</strong>, <strong>docs/teste-manual-rls-mapa.md</strong> e <strong>docs/evidencias-homologacao-mapa.md</strong> para registrar as evidências antes de aprovar.
        </p>
      </section>

      <div className="mt-5">
        <MapGoNoGoPanel neighborhoods={neighborhoods} records={records} normalizedQuality={normalizedQuality} rlsValidated={checks.rlsValidated} />
      </div>

      <div className="mt-5">
        <MapHomologationPanel checks={checks} goNoGo={goNoGo} normalizedQuality={normalizedQuality} onCopied={setFeedback} />
        {feedback ? <p className="mt-3 text-sm font-semibold text-semear-green">{feedback}</p> : null}
        {error ? <p className="mt-3 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">{error}</p> : null}
      </div>

      <section className="mt-5 rounded-[2rem] border border-white/80 bg-white p-5 shadow-soft">
        <h3 className="font-semibold text-semear-green">Ações de homologação</h3>
        {!approvalCheck.ok ? (
          <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-950">
            <p className="font-semibold">Pendências que bloqueiam aprovação:</p>
            <ul className="mt-2 list-disc pl-5">
              {approvalCheck.reasons.map((reason) => <li key={reason}>{reason}</li>)}
            </ul>
          </div>
        ) : null}
        <div className="mt-4 flex flex-wrap gap-3">
          <button className="inline-flex min-h-11 items-center gap-2 rounded-full bg-semear-green px-4 text-sm font-semibold text-white disabled:opacity-60" disabled={saving} onClick={() => void saveHomologation("draft")} type="button">
            <Save className="h-4 w-4" aria-hidden="true" />
            Salvar rascunho
          </button>
          <button className="inline-flex min-h-11 items-center gap-2 rounded-full border border-semear-green/15 bg-white px-4 text-sm font-semibold text-semear-green disabled:opacity-60" disabled={saving} onClick={() => void saveHomologation("reviewed")} type="button">
            <ClipboardList className="h-4 w-4" aria-hidden="true" />
            Marcar como revisada
          </button>
          <button className="inline-flex min-h-11 items-center gap-2 rounded-full bg-stone-900 px-4 text-sm font-semibold text-white disabled:opacity-60" disabled={saving || !homologation || !canCoordinate} onClick={() => void approve()} type="button">
            <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
            Aprovar GO
          </button>
          <button className="inline-flex min-h-11 items-center gap-2 rounded-full border border-red-200 bg-red-50 px-4 text-sm font-semibold text-red-800 disabled:opacity-60" disabled={saving || !homologation || !canCoordinate} onClick={() => void reject()} type="button">
            <XCircle className="h-4 w-4" aria-hidden="true" />
            Rejeitar
          </button>
        </div>
      </section>
    </section>
  );
}

function Check({ label, checked, onChange }: { label: string; checked: boolean; onChange: (value: boolean) => void }) {
  return (
    <label className="flex min-h-12 items-center gap-3 rounded-2xl border border-semear-gray bg-semear-offwhite px-4 py-3 text-sm font-semibold text-stone-700">
      <input checked={checked} className="h-4 w-4 accent-semear-green" onChange={(event) => onChange(event.target.checked)} type="checkbox" />
      {label}
    </label>
  );
}

function Metric({ label, value, danger = false, helper }: { label: string; value: number; danger?: boolean; helper?: string }) {
  return (
    <article className={`rounded-3xl border p-5 shadow-soft ${danger ? "border-red-200 bg-red-50" : "border-white/80 bg-white"}`}>
      <div className={`mb-4 flex h-10 w-10 items-center justify-center rounded-2xl ${danger ? "bg-red-100 text-red-900" : "bg-semear-green-soft text-semear-green"}`}>
        <ShieldCheck className="h-5 w-5" aria-hidden="true" />
      </div>
      <p className={`text-sm font-medium ${danger ? "text-red-800" : "text-stone-600"}`}>{label}</p>
      {helper ? <strong className={`mt-2 block text-xl font-semibold ${danger ? "text-red-900" : "text-semear-green"}`}>{helper}</strong> : <strong className={`mt-2 block text-3xl font-semibold ${danger ? "text-red-900" : "text-semear-green"}`}>{value}</strong>}
    </article>
  );
}

function StateBox({ children, tone = "neutral" }: { children: ReactNode; tone?: "neutral" | "error" }) {
  return <div className={`rounded-[1.5rem] p-5 text-sm shadow-soft ${tone === "error" ? "border border-red-200 bg-red-50 text-red-800" : "bg-white/72 text-stone-600"}`}>{children}</div>;
}
