"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { 
  ArrowLeft, 
  CheckCircle2, 
  ChevronRight, 
  FileText, 
  Save, 
  ShieldAlert, 
  ShieldCheck,
  Trash2,
  AlertTriangle,
  History
} from "lucide-react";
import type { 
  Action, 
  Profile, 
  ProjectMemoryEntry, 
  ProjectMemoryType, 
  ProjectMemoryVisibility, 
  WeeklyTeamReport 
} from "@/lib/database.types";
import { 
  formatDateLabel, 
  formatWeekLabel,
  projectMemoryTypeOptions,
  projectMemoryVisibilityOptions,
  getProjectMemoryTypeLabel,
  getProjectMemoryVisibilityLabel
} from "@/lib/project-memory";
import { 
  detectMemoryPrivacyRisks, 
  MemoryChecklistState, 
  MemoryRiskReport, 
  normalizeMemoryChecklist,
  isMemoryChecklistComplete
} from "@/lib/memory-privacy";
import { MemoryEntryPrivacyChecklist } from "@/components/memory/memory-entry-privacy-checklist";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";

type ProjectMemoryEntryWorkspaceProps = {
  entryId: string;
};

export function ProjectMemoryEntryWorkspace({ entryId }: ProjectMemoryEntryWorkspaceProps) {
  const supabase = useMemo(() => createBrowserSupabaseClient(), []);
  const router = useRouter();
  const [entry, setEntry] = useState<ProjectMemoryEntry | null>(null);
  const [report, setReport] = useState<WeeklyTeamReport | null>(null);
  const [action, setAction] = useState<Action | null>(null);
  const [currentProfile, setCurrentProfile] = useState<Pick<Profile, "id" | "role"> | null>(null);
  
  const [formValues, setFormValues] = useState({
    title: "",
    body: "",
    entry_date: "",
    memory_type: "" as ProjectMemoryType,
    visibility: "" as ProjectMemoryVisibility,
  });
  const [checklist, setChecklist] = useState<MemoryChecklistState>(normalizeMemoryChecklist({}));
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);

  const riskReport = useMemo(() => detectMemoryPrivacyRisks(formValues.body + " " + formValues.title), [formValues.body, formValues.title]);
  const canApprovePublic = isMemoryChecklistComplete(checklist) && !riskReport.hasBlockingRisk;
  const isCoordOrAdmin = currentProfile?.role === "admin" || currentProfile?.role === "coordenacao";

  useEffect(() => {
    let ignore = false;

    async function loadEntry() {
      if (!supabase) {
        setError("Supabase não configurado.");
        setLoading(false);
        return;
      }

      const userResult = await supabase.auth.getUser();
      const userId = userResult.data.user?.id;

      const { data, error: entryError } = await supabase
        .from("project_memory_entries")
        .select("*, actions:action_id(*), weekly_team_reports:source_report_id(*)")
        .eq("id", entryId)
        .single();

      if (ignore) return;

      if (entryError || !data) {
        setError(entryError?.message ?? "Entrada não encontrada.");
        setLoading(false);
        return;
      }

      const entryData = data as any;
      setEntry(entryData);
      setReport(entryData.weekly_team_reports);
      setAction(entryData.actions);
      
      setFormValues({
        title: entryData.title,
        body: entryData.body,
        entry_date: entryData.entry_date,
        memory_type: entryData.memory_type,
        visibility: entryData.visibility,
      });
      setChecklist(normalizeMemoryChecklist(entryData.review_checklist));

      if (userId) {
        const { data: profile } = await supabase.from("profiles").select("id, role").eq("id", userId).maybeSingle();
        setCurrentProfile(profile);
      }

      setLoading(false);
    }

    void loadEntry();
    return () => { ignore = true; };
  }, [entryId, supabase]);

  async function handleSave() {
    if (!supabase || !entry || !isCoordOrAdmin) return;

    setSaving(true);
    setError(null);
    setFeedback(null);

    if (formValues.visibility === "public_approved" && !canApprovePublic) {
      setError("Não é possível aprovar para o público sem completar o checklist ou com riscos bloqueantes.");
      setSaving(false);
      return;
    }

    const payload = {
      title: formValues.title,
      body: formValues.body,
      entry_date: formValues.entry_date,
      memory_type: formValues.memory_type,
      visibility: formValues.visibility,
      review_checklist: checklist as any,
      reviewed_by: currentProfile?.id,
      reviewed_at: new Date().toISOString(),
    };

    const { error: updateError } = await supabase
      .from("project_memory_entries")
      .update(payload)
      .eq("id", entry.id);

    if (updateError) {
      setError(updateError.message);
      setSaving(false);
      return;
    }

    setFeedback("Entrada de memória atualizada com sucesso.");
    setSaving(false);
  }

  async function handleDelete() {
    if (!supabase || !entry || !isCoordOrAdmin) return;
    if (!confirm("Tem certeza que deseja remover esta entrada de memória?")) return;

    setSaving(true);
    const { error: deleteError } = await supabase.from("project_memory_entries").delete().eq("id", entry.id);

    if (deleteError) {
      setError(deleteError.message);
      setSaving(false);
      return;
    }

    router.push("/memoria/curadoria");
  }

  if (loading) return <StateBox>Carregando entrada...</StateBox>;
  if (error) return <StateBox tone="error">{error}</StateBox>;

  return (
    <section className="pb-10">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <Link 
          href="/memoria/curadoria" 
          className="inline-flex min-h-11 items-center gap-2 rounded-full border border-semear-green/15 bg-white px-4 text-sm font-semibold text-semear-green hover:bg-semear-green-soft/10"
        >
          <ArrowLeft className="h-4 w-4" />
          Voltar para Curadoria
        </Link>
        <div className="flex gap-3">
          <button 
            onClick={handleDelete}
            className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-red-100 bg-white text-red-600 hover:bg-red-50"
            title="Remover entrada"
          >
            <Trash2 className="h-5 w-5" />
          </button>
          <button 
            onClick={handleSave}
            disabled={saving}
            className="inline-flex min-h-11 items-center gap-2 rounded-full bg-semear-green px-5 text-sm font-semibold text-white shadow-soft hover:bg-semear-green/90 disabled:opacity-50"
          >
            <Save className="h-4 w-4" />
            {saving ? "Salvando..." : "Salvar Alterações"}
          </button>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <section className="space-y-6">
          <article className="rounded-[2rem] border border-white/80 bg-white p-6 shadow-soft sm:p-8">
            <header>
              <div className="flex items-center gap-2">
                <span className={`rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-wider ${getVisibilityStyle(formValues.visibility)}`}>
                  {getProjectMemoryVisibilityLabel(formValues.visibility)}
                </span>
                <span className="text-[10px] font-semibold text-stone-400 uppercase tracking-wider">
                  Origem: {report ? "Relatório Semanal" : action ? "Ação Territorial" : "Manual"}
                </span>
              </div>
              <input 
                className="mt-4 w-full bg-transparent text-3xl font-semibold tracking-tight text-semear-green outline-none placeholder:text-stone-300"
                value={formValues.title}
                onChange={(e) => setFormValues(f => ({ ...f, title: e.target.value }))}
                placeholder="Título da Entrada de Memória"
              />
            </header>

            <div className="mt-8 grid gap-4 sm:grid-cols-2">
              <Field label="Data da Entrada">
                <input 
                  type="date" 
                  className={inputClassName} 
                  value={formValues.entry_date} 
                  onChange={(e) => setFormValues(f => ({ ...f, entry_date: e.target.value }))} 
                />
              </Field>
              <Field label="Tipo de Memória">
                <select 
                  className={inputClassName} 
                  value={formValues.memory_type} 
                  onChange={(e) => setFormValues(f => ({ ...f, memory_type: e.target.value as ProjectMemoryType }))}
                >
                  {projectMemoryTypeOptions.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                </select>
              </Field>
            </div>

            <div className="mt-6">
              <Field label="Corpo da Memória">
                <textarea 
                  className={`${textareaClassName} min-h-[300px] leading-relaxed`}
                  value={formValues.body}
                  onChange={(e) => setFormValues(f => ({ ...f, body: e.target.value }))}
                  placeholder="Descreva o aprendizado, decisão ou atividade de forma clara..."
                />
              </Field>
            </div>
            
            {feedback && (
              <div className="mt-6 flex items-center gap-2 rounded-xl bg-semear-green-soft/30 p-4 text-sm font-medium text-semear-green">
                <CheckCircle2 className="h-5 w-5" />
                {feedback}
              </div>
            )}
          </article>

          {/* Origem e Contexto */}
          <section className="rounded-[2rem] border border-white/80 bg-white/70 p-6 shadow-soft">
            <h3 className="flex items-center gap-2 font-semibold text-semear-green">
              <History className="h-5 w-5" />
              Origem e Contexto
            </h3>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              {report && (
                <div className="rounded-2xl border border-semear-gray bg-white p-4">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-stone-400">Relatório de Origem</p>
                  <p className="mt-1 text-sm font-semibold text-semear-green">{report.title}</p>
                  <p className="text-xs text-stone-500">{formatWeekLabel(report.week_start, report.week_end)}</p>
                  <Link href={`/memoria/${report.id}`} className="mt-3 inline-flex items-center gap-1 text-xs font-bold text-semear-earth hover:underline">
                    Ver relatório completo <ChevronRight className="h-3 w-3" />
                  </Link>
                </div>
              )}
              {action && (
                <div className="rounded-2xl border border-semear-gray bg-white p-4">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-stone-400">Ação Relacionada</p>
                  <p className="mt-1 text-sm font-semibold text-semear-green">{action.title}</p>
                  <p className="text-xs text-stone-500">{formatDateLabel(action.action_date)}</p>
                  <Link href={`/acoes/${action.id}`} className="mt-3 inline-flex items-center gap-1 text-xs font-bold text-semear-earth hover:underline">
                    Ver detalhes da ação <ChevronRight className="h-3 w-3" />
                  </Link>
                </div>
              )}
            </div>
          </section>
        </section>

        <aside className="space-y-6">
          {/* Governança e Visibilidade */}
          <section className="rounded-[2rem] border border-white/80 bg-white p-6 shadow-soft">
            <h3 className="flex items-center gap-2 font-semibold text-semear-green">
              <ShieldCheck className="h-5 w-5" />
              Governança e Visibilidade
            </h3>
            <div className="mt-4 space-y-4">
              <Field label="Definir Visibilidade">
                <select 
                  className={inputClassName} 
                  value={formValues.visibility} 
                  onChange={(e) => setFormValues(f => ({ ...f, visibility: e.target.value as ProjectMemoryVisibility }))}
                >
                  {projectMemoryVisibilityOptions.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                </select>
              </Field>
              
              <div className="rounded-xl border border-semear-gray bg-semear-offwhite p-4 text-xs leading-5 text-stone-600">
                <p><strong>Interno:</strong> Visível apenas para a equipe SEMEAR.</p>
                <p className="mt-1"><strong>Candidata:</strong> Marque quando o texto estiver pronto para revisão da coordenação.</p>
                <p className="mt-1"><strong>Aprovada:</strong> O conteúdo poderá ser usado em sínteses públicas da Transparência Viva.</p>
              </div>
            </div>
          </section>

          {/* Detector de Riscos */}
          <section className="rounded-[2rem] border border-white/80 bg-white p-6 shadow-soft">
            <h3 className="flex items-center gap-2 font-semibold text-semear-green">
              <ShieldAlert className="h-5 w-5" />
              Detector de Riscos de Privacidade
            </h3>
            <div className="mt-4 space-y-3">
              {riskReport.blockers.length === 0 && riskReport.warnings.length === 0 && (
                <div className="flex items-center gap-2 rounded-xl bg-semear-green-soft/20 p-4 text-xs font-medium text-semear-green">
                  <CheckCircle2 className="h-4 w-4" />
                  Nenhum risco óbvio detectado no texto.
                </div>
              )}

              {riskReport.blockers.map((risk, idx) => (
                <div key={idx} className="rounded-xl border border-red-200 bg-red-50 p-4">
                  <div className="flex gap-2 text-xs font-bold text-red-800">
                    <ShieldAlert className="h-4 w-4 shrink-0" />
                    {risk.message}
                  </div>
                  <div className="mt-2 flex flex-wrap gap-1">
                    {risk.matches.map((m, i) => <span key={i} className="rounded bg-red-100 px-1.5 py-0.5 text-[10px] font-mono text-red-900">{m}</span>)}
                  </div>
                </div>
              ))}

              {riskReport.warnings.map((risk, idx) => (
                <div key={idx} className="rounded-xl border border-amber-200 bg-amber-50 p-4">
                  <div className="flex gap-2 text-xs font-bold text-amber-800">
                    <AlertTriangle className="h-4 w-4 shrink-0" />
                    {risk.message}
                  </div>
                  <div className="mt-2 flex flex-wrap gap-1">
                    {risk.matches.map((m, i) => <span key={i} className="rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-mono text-amber-900">{m}</span>)}
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Checklist */}
          <MemoryEntryPrivacyChecklist 
            checklist={checklist} 
            onChange={(key, val) => setChecklist(c => ({ ...c, [key]: val }))}
          />
        </aside>
      </div>
    </section>
  );
}

function getVisibilityStyle(visibility: string) {
  switch (visibility) {
    case 'public_approved': return 'bg-semear-green-soft text-semear-green';
    case 'public_candidate': return 'bg-amber-50 text-amber-700 border border-amber-100';
    default: return 'bg-stone-100 text-stone-600';
  }
}

function Field({ label, children, className = "" }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={className}>
      <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-stone-500">{label}</label>
      {children}
    </div>
  );
}

const inputClassName = "w-full rounded-xl border-semear-gray bg-semear-offwhite px-4 py-3 text-sm font-medium text-semear-green focus:border-semear-green focus:ring-semear-green transition shadow-sm";
const textareaClassName = "w-full rounded-2xl border-semear-gray bg-semear-offwhite px-4 py-4 text-sm font-medium text-semear-green focus:border-semear-green focus:ring-semear-green transition shadow-sm outline-none resize-y";

function StateBox({ children, tone = "neutral" }: { children: React.ReactNode; tone?: "neutral" | "error" }) {
  return <div className={`rounded-[1.5rem] p-6 text-sm shadow-soft ${tone === "error" ? "border border-red-200 bg-red-50 text-red-800" : "border border-white/80 bg-white/72 text-stone-600"}`}>{children}</div>;
}
