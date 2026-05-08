"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { 
  ArrowRight, 
  CheckCircle2, 
  Clock3, 
  FileEdit, 
  FileText, 
  LibraryBig, 
  ShieldCheck, 
  UsersRound,
  Filter
} from "lucide-react";
import type { 
  Action, 
  Neighborhood, 
  Profile, 
  ProjectMemoryEntry, 
  TeamMember, 
  WeeklyTeamReport 
} from "@/lib/database.types";
import { FilterBar, FilterField, filterControlClassName } from "@/components/ui/filter-bar";
import { MetricCard } from "@/components/ui/metric-card";
import { PageHeader } from "@/components/ui/page-header";
import { 
  formatDateLabel, 
  formatWeekLabel, 
  getProjectMemoryTypeLabel, 
  getProjectMemoryVisibilityLabel,
  projectMemoryTypeOptions,
  projectMemoryVisibilityOptions,
  summarizeProjectMemoryEntry,
} from "@/lib/project-memory";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";

export function ProjectMemoryCurationDashboard() {
  const supabase = useMemo(() => createBrowserSupabaseClient(), []);
  const [reports, setReports] = useState<WeeklyTeamReport[]>([]);
  const [entries, setEntries] = useState<ProjectMemoryEntry[]>([]);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [actions, setActions] = useState<Action[]>([]);
  const [neighborhoods, setNeighborhoods] = useState<Neighborhood[]>([]);
  const [currentProfile, setCurrentProfile] = useState<Pick<Profile, "id" | "role"> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState({
    teamMemberId: "",
    status: "approved",
    visibility: "",
    memoryType: "",
    actionId: "",
  });

  useEffect(() => {
    let ignore = false;

    async function loadCurationData() {
      if (!supabase) {
        setError("Configure o Supabase para carregar a curadoria.");
        setLoading(false);
        return;
      }

      const userResult = await supabase.auth.getUser();
      const userId = userResult.data.user?.id;

      const [reportsResult, entriesResult, teamMembersResult, actionsResult, neighborhoodsResult, profileResult] = await Promise.all([
        supabase.from("weekly_team_reports").select("*").eq("status", "approved").order("week_start", { ascending: false }),
        supabase.from("project_memory_entries").select("*").order("entry_date", { ascending: false }),
        supabase.from("team_members").select("*").eq("active", true).order("display_name", { ascending: true }),
        supabase.from("actions").select("*").order("action_date", { ascending: false }),
        supabase.from("neighborhoods").select("*").order("name", { ascending: true }),
        userId ? supabase.from("profiles").select("id, role").eq("id", userId).maybeSingle() : Promise.resolve({ data: null, error: null }),
      ]);

      if (ignore) return;

      if (reportsResult.error || entriesResult.error || teamMembersResult.error || actionsResult.error || neighborhoodsResult.error || profileResult.error) {
        setError(reportsResult.error?.message ?? entriesResult.error?.message ?? "Erro ao carregar dados da curadoria.");
        setLoading(false);
        return;
      }

      setReports(reportsResult.data as WeeklyTeamReport[]);
      setEntries(entriesResult.data as ProjectMemoryEntry[]);
      setTeamMembers(teamMembersResult.data as TeamMember[]);
      setActions(actionsResult.data as Action[]);
      setNeighborhoods(neighborhoodsResult.data as Neighborhood[]);
      setCurrentProfile(profileResult.data as Pick<Profile, "id" | "role"> | null);
      setLoading(false);
    }

    void loadCurationData();
    return () => { ignore = false; };
  }, [supabase]);

  const filteredReports = useMemo(() => {
    return reports.filter((report) => {
      if (filters.teamMemberId && report.team_member_id !== filters.teamMemberId) return false;
      return true;
    });
  }, [filters.teamMemberId, reports]);

  const filteredEntries = useMemo(() => {
    return entries.filter((entry) => {
      if (filters.visibility && entry.visibility !== filters.visibility) return false;
      if (filters.memoryType && entry.memory_type !== filters.memoryType) return false;
      if (filters.actionId && entry.action_id !== filters.actionId) return false;
      return true;
    });
  }, [entries, filters.actionId, filters.memoryType, filters.visibility]);

  const stats = {
    approvedReports: reports.length,
    internalEntries: entries.filter(e => e.visibility === 'internal').length,
    publicCandidates: entries.filter(e => e.visibility === 'public_candidate').length,
    publicApproved: entries.filter(e => e.visibility === 'public_approved').length,
  };

  if (loading) return <StateBox>Carregando painel de curadoria...</StateBox>;
  if (error) return <StateBox tone="error">{error}</StateBox>;

  // Apenas coordenação e admin podem acessar curadoria
  if (currentProfile?.role !== "admin" && currentProfile?.role !== "coordenacao") {
    return (
      <StateBox tone="error">
        Acesso restrito. Apenas a coordenação e administradores podem realizar a curadoria da memória pública.
      </StateBox>
    );
  }

  return (
    <section className="pb-10">
      <PageHeader 
        eyebrow="Tijolo 053"
        title="Curadoria da Memória"
        description="Transforme relatórios internos em memória institucional curada. Revise falas, remova PII e prepare conteúdos para a Transparência Viva."
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard icon={<FileText className="h-5 w-5" />} label="Relatórios Aprovados" value={stats.approvedReports} note="Base para curadoria" />
        <MetricCard icon={<LibraryBig className="h-5 w-5" />} label="Memória Interna" value={stats.internalEntries} note="Somente equipe" tone="green" />
        <MetricCard icon={<Clock3 className="h-5 w-5" />} label="Candidatas Públicas" value={stats.publicCandidates} note="Aguardando revisão" tone="earth" />
        <MetricCard icon={<ShieldCheck className="h-5 w-5" />} label="Aprovadas Públicas" value={stats.publicApproved} note="Prontas para Transparência" tone="green" />
      </div>

      <div className="mt-5 rounded-[2rem] border border-white/80 bg-white/80 p-5 shadow-soft">
        <FilterBar 
          title="Filtros de Curadoria" 
          onClear={() => setFilters({ teamMemberId: "", status: "approved", visibility: "", memoryType: "", actionId: "" })}
        >
          <FilterField label="Membro da Equipe">
            <select className={filterControlClassName} value={filters.teamMemberId} onChange={(e) => setFilters(f => ({ ...f, teamMemberId: e.target.value }))}>
              <option value="">Todos</option>
              {teamMembers.map(m => <option key={m.id} value={m.id}>{m.display_name}</option>)}
            </select>
          </FilterField>
          <FilterField label="Visibilidade">
            <select className={filterControlClassName} value={filters.visibility} onChange={(e) => setFilters(f => ({ ...f, visibility: e.target.value }))}>
              <option value="">Todas</option>
              {projectMemoryVisibilityOptions.map(v => <option key={v.value} value={v.value}>{v.label}</option>)}
            </select>
          </FilterField>
          <FilterField label="Tipo">
            <select className={filterControlClassName} value={filters.memoryType} onChange={(e) => setFilters(f => ({ ...f, memoryType: e.target.value }))}>
              <option value="">Todos</option>
              {projectMemoryTypeOptions.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          </FilterField>
        </FilterBar>
      </div>

      <div className="mt-5 grid gap-5 xl:grid-cols-[1fr_1.2fr]">
        {/* Relatórios Aprovados aguardando curadoria */}
        <section className="rounded-[2rem] border border-white/80 bg-white p-5 shadow-soft">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-semear-earth">Relatórios Aprovados</p>
              <h3 className="text-xl font-semibold text-semear-green">Base para novas memórias</h3>
            </div>
            <span className="rounded-full bg-semear-green-soft px-3 py-1 text-xs font-semibold text-semear-green">{filteredReports.length}</span>
          </div>

          <div className="mt-4 space-y-3">
            {filteredReports.map((report) => {
              const member = teamMembers.find(m => m.id === report.team_member_id);
              const hasEntries = entries.some(e => e.source_report_id === report.id);
              
              return (
                <article key={report.id} className={`rounded-2xl border p-4 transition ${hasEntries ? "border-semear-gray bg-semear-offwhite/50" : "border-semear-green/10 bg-semear-green-soft/10"}`}>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-xs font-medium text-stone-500">{formatWeekLabel(report.week_start, report.week_end)}</p>
                      <h4 className="mt-1 font-semibold text-semear-green">{report.title}</h4>
                      <p className="mt-1 text-xs text-stone-600">{member?.display_name}</p>
                    </div>
                    <Link 
                      href={`/memoria/${report.id}`}
                      className="inline-flex h-9 items-center justify-center gap-2 rounded-full border border-semear-green/20 bg-white px-3 text-xs font-semibold text-semear-green hover:bg-semear-green-soft/20"
                    >
                      <FileEdit className="h-3.5 w-3.5" />
                      Curar
                    </Link>
                  </div>
                  {hasEntries && (
                    <div className="mt-3 flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider text-semear-green">
                      <CheckCircle2 className="h-3 w-3" />
                      Já possui entradas curadas
                    </div>
                  )}
                </article>
              );
            })}
            {filteredReports.length === 0 && <EmptyCard text="Nenhum relatório aprovado encontrado." />}
          </div>
        </section>

        {/* Entradas de Memória em Curadoria */}
        <section className="rounded-[2rem] border border-white/80 bg-white p-5 shadow-soft">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-semear-earth">Fluxo de Curadoria</p>
              <h3 className="text-xl font-semibold text-semear-green">Entradas e Visibilidade</h3>
            </div>
            <span className="rounded-full bg-semear-green-soft px-3 py-1 text-xs font-semibold text-semear-green">{filteredEntries.length}</span>
          </div>

          <div className="mt-4 space-y-3">
            {filteredEntries.map((entry) => (
              <article key={entry.id} className="rounded-2xl border border-semear-gray bg-white p-4 shadow-sm hover:shadow-md transition">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${getVisibilityStyle(entry.visibility)}`}>
                        {getProjectMemoryVisibilityLabel(entry.visibility)}
                      </span>
                      <span className="text-[10px] font-semibold text-stone-400 uppercase tracking-wider">{getProjectMemoryTypeLabel(entry.memory_type)}</span>
                      <span className="text-xs text-stone-500">{formatDateLabel(entry.entry_date)}</span>
                    </div>
                    <h4 className="mt-2 font-semibold text-semear-green">{entry.title}</h4>
                    <p className="mt-1 text-sm text-stone-600 line-clamp-2">{summarizeProjectMemoryEntry(entry)}</p>
                  </div>
                  <Link 
                    href={`/memoria/entradas/${entry.id}`}
                    className="inline-flex h-10 items-center justify-center gap-2 rounded-full bg-semear-green px-4 text-xs font-semibold text-white shadow-soft hover:bg-semear-green/90"
                  >
                    Revisar
                    <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                </div>
              </article>
            ))}
            {filteredEntries.length === 0 && <EmptyCard text="Nenhuma entrada de memória encontrada." />}
          </div>
        </section>
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

function StateBox({ children, tone = "neutral" }: { children: React.ReactNode; tone?: "neutral" | "error" }) {
  return <div className={`rounded-[1.5rem] p-6 text-sm shadow-soft ${tone === "error" ? "border border-red-200 bg-red-50 text-red-800" : "border border-white/80 bg-white/72 text-stone-600"}`}>{children}</div>;
}

function EmptyCard({ text }: { text: string }) {
  return <div className="rounded-2xl border border-dashed border-semear-green/20 bg-white px-4 py-8 text-center text-sm text-stone-400">{text}</div>;
}
