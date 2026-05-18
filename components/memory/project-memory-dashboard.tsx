"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { CheckCircle2, Clock3, FileSearch, FileText, FolderClock, LibraryBig, MapPinned, Plus, Trash2, UsersRound } from "lucide-react";
import type { Action, Neighborhood, Profile, ProjectMemoryEntry, TeamMember, WeeklyTeamReport, WeeklyTeamReportStatus } from "@/lib/database.types";
import { FilterBar, FilterField, filterControlClassName } from "@/components/ui/filter-bar";
import { SemearButton, SemearCard, SemearMetricCard, SemearPageHeader, SemearStatusBadge } from "@/components/ui/semear-primitives";
import {
  formatDateLabel,
  formatWeekLabel,
  getProjectMemoryTypeLabel,
  getProjectMemoryVisibilityLabel,
  getStartOfWeekIso,
  getWeeklyReportStatusLabel,
  projectMemoryTypeOptions,
  summarizeProjectMemoryEntry,
  weeklyReportStatusOptions,
} from "@/lib/project-memory";
import { formatWeekTitle } from "@/lib/team-calendar";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";
import { NotificationsInlinePanel } from "@/components/notifications/notifications-inline-panel";

type ReportActionRow = {
  report_id: string;
  action_id: string;
  actions: Pick<Action, "id" | "title" | "action_date" | "neighborhood_id"> | null;
};

type ReportNeighborhoodRow = {
  report_id: string;
  neighborhood_id: string;
  neighborhoods: Pick<Neighborhood, "id" | "name"> | null;
};

type MemoryEntryWithAction = ProjectMemoryEntry & {
  actions: Pick<Action, "id" | "title" | "action_date" | "neighborhood_id"> | null;
  weekly_team_reports: Pick<WeeklyTeamReport, "id" | "title" | "week_start" | "week_end"> | null;
};

export function ProjectMemoryDashboard() {
  const supabase = useMemo(() => createBrowserSupabaseClient(), []);
  const currentWeekStart = getStartOfWeekIso(new Date());
  const [reports, setReports] = useState<WeeklyTeamReport[]>([]);
  const [reportActions, setReportActions] = useState<ReportActionRow[]>([]);
  const [reportNeighborhoods, setReportNeighborhoods] = useState<ReportNeighborhoodRow[]>([]);
  const [entries, setEntries] = useState<MemoryEntryWithAction[]>([]);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [actions, setActions] = useState<Action[]>([]);
  const [neighborhoods, setNeighborhoods] = useState<Neighborhood[]>([]);
  const [currentProfile, setCurrentProfile] = useState<Pick<Profile, "id" | "role"> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [deletingReportId, setDeletingReportId] = useState<string | null>(null);
  const [filters, setFilters] = useState({
    week: "",
    teamMemberId: "",
    status: "",
    actionId: "",
    neighborhoodId: "",
    memoryType: "",
  });

  const canReview = currentProfile?.role === "admin" || currentProfile?.role === "coordenacao";

  useEffect(() => {
    let ignore = false;

    async function loadData() {
      if (!supabase) {
        setError("Configure NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_ANON_KEY para carregar a memória do projeto.");
        setLoading(false);
        return;
      }

      const userResult = await supabase.auth.getUser();
      const userId = userResult.data.user?.id;

      const [reportsResult, reportActionsResult, reportNeighborhoodsResult, entriesResult, teamMembersResult, actionsResult, neighborhoodsResult, profileResult] = await Promise.all([
        supabase.from("weekly_team_reports").select("*").order("week_start", { ascending: false }).order("created_at", { ascending: false }),
        supabase.from("weekly_team_report_actions").select("report_id, action_id, actions:action_id(id, title, action_date, neighborhood_id)"),
        supabase.from("weekly_team_report_neighborhoods").select("report_id, neighborhood_id, neighborhoods:neighborhood_id(id, name)"),
        supabase.from("project_memory_entries").select("*, actions:action_id(id, title, action_date, neighborhood_id), weekly_team_reports:source_report_id(id, title, week_start, week_end)").order("entry_date", { ascending: false }).order("created_at", { ascending: false }),
        supabase.from("team_members").select("*").eq("active", true).order("display_name", { ascending: true }),
        supabase.from("actions").select("*").order("action_date", { ascending: false }),
        supabase.from("neighborhoods").select("*").order("name", { ascending: true }),
        userId ? supabase.from("profiles").select("id, role").eq("id", userId).maybeSingle() : Promise.resolve({ data: null, error: null }),
      ]);

      if (ignore) return;

      if (
        reportsResult.error ||
        reportActionsResult.error ||
        reportNeighborhoodsResult.error ||
        entriesResult.error ||
        teamMembersResult.error ||
        actionsResult.error ||
        neighborhoodsResult.error ||
        profileResult.error
      ) {
        setError(
          reportsResult.error?.message ??
            reportActionsResult.error?.message ??
            reportNeighborhoodsResult.error?.message ??
            entriesResult.error?.message ??
            teamMembersResult.error?.message ??
            actionsResult.error?.message ??
            neighborhoodsResult.error?.message ??
            profileResult.error?.message ??
            "Erro ao carregar a memória do projeto."
        );
        setLoading(false);
        return;
      }

      setReports((reportsResult.data ?? []) as WeeklyTeamReport[]);
      setReportActions((reportActionsResult.data ?? []) as unknown as ReportActionRow[]);
      setReportNeighborhoods((reportNeighborhoodsResult.data ?? []) as unknown as ReportNeighborhoodRow[]);
      setEntries((entriesResult.data ?? []) as unknown as MemoryEntryWithAction[]);
      setTeamMembers((teamMembersResult.data ?? []) as TeamMember[]);
      setActions((actionsResult.data ?? []) as Action[]);
      setNeighborhoods((neighborhoodsResult.data ?? []) as Neighborhood[]);
      setCurrentProfile((profileResult.data ?? null) as Pick<Profile, "id" | "role"> | null);
      setLoading(false);
    }

    void loadData();
    return () => {
      ignore = true;
    };
  }, [supabase]);

  const actionIdsByReport = useMemo(() => {
    const map = new Map<string, string[]>();
    reportActions.forEach((item) => {
      const current = map.get(item.report_id) ?? [];
      current.push(item.action_id);
      map.set(item.report_id, current);
    });
    return map;
  }, [reportActions]);

  const neighborhoodIdsByReport = useMemo(() => {
    const map = new Map<string, string[]>();
    reportNeighborhoods.forEach((item) => {
      const current = map.get(item.report_id) ?? [];
      current.push(item.neighborhood_id);
      map.set(item.report_id, current);
    });
    return map;
  }, [reportNeighborhoods]);

  const availableWeeks = useMemo(
    () => Array.from(new Set(reports.map((report) => report.week_start))).sort((left, right) => right.localeCompare(left)),
    [reports]
  );

  const filteredReports = useMemo(() => {
    return reports.filter((report) => {
      if (filters.week && report.week_start !== filters.week) return false;
      if (filters.teamMemberId && report.team_member_id !== filters.teamMemberId) return false;
      if (filters.status && report.status !== filters.status) return false;
      if (filters.actionId && !(actionIdsByReport.get(report.id) ?? []).includes(filters.actionId)) return false;
      if (filters.neighborhoodId && !(neighborhoodIdsByReport.get(report.id) ?? []).includes(filters.neighborhoodId)) return false;
      return true;
    });
  }, [actionIdsByReport, filters, neighborhoodIdsByReport, reports]);

  const filteredEntries = useMemo(() => {
    return entries.filter((entry) => {
      if (filters.memoryType && entry.memory_type !== filters.memoryType) return false;
      if (filters.week && entry.weekly_team_reports?.week_start !== filters.week) return false;
      if (filters.actionId) {
        const matchesDirectAction = entry.action_id === filters.actionId;
        const matchesSourceReportAction = entry.source_report_id ? (actionIdsByReport.get(entry.source_report_id) ?? []).includes(filters.actionId) : false;
        if (!matchesDirectAction && !matchesSourceReportAction) return false;
      }
      if (filters.neighborhoodId) {
        const directNeighborhood = entry.actions?.neighborhood_id === filters.neighborhoodId;
        const reportNeighborhood = entry.source_report_id ? (neighborhoodIdsByReport.get(entry.source_report_id) ?? []).includes(filters.neighborhoodId) : false;
        if (!directNeighborhood && !reportNeighborhood) return false;
      }
      return true;
    });
  }, [actionIdsByReport, entries, filters, neighborhoodIdsByReport]);

  const referenceWeek = filters.week || currentWeekStart;
  const weekReports = reports.filter((report) => report.week_start === referenceWeek);
  const sentMemberIds = new Set(weekReports.map((report) => report.team_member_id));
  const membersSent = teamMembers.filter((member) => sentMemberIds.has(member.id));
  const membersPending = teamMembers.filter((member) => !sentMemberIds.has(member.id));
  const countsByStatus = countReportsByStatus(filteredReports);

  async function deleteArchivedReport(report: WeeklyTeamReport) {
    if (!supabase) return;

    if (report.status !== "archived") {
      setError("Somente relatórios arquivados podem ser excluídos por esta tela.");
      return;
    }

    const confirmed = window.confirm(`Excluir definitivamente o relatório "${report.title}"? Esta ação não pode ser desfeita.`);
    if (!confirmed) return;

    setDeletingReportId(report.id);
    setError(null);
    setFeedback(null);

    const attachmentsResult = await supabase
      .from("weekly_team_report_attachments")
      .select("storage_path")
      .eq("report_id", report.id);

    if (attachmentsResult.error) {
      setError(attachmentsResult.error.message);
      setDeletingReportId(null);
      return;
    }

    const storagePaths = (attachmentsResult.data ?? [])
      .map((attachment) => attachment.storage_path)
      .filter(Boolean);

    if (storagePaths.length > 0) {
      const removeResult = await supabase.storage.from("project-memory-documents").remove(storagePaths);
      if (removeResult.error) {
        setError(removeResult.error.message);
        setDeletingReportId(null);
        return;
      }
    }

    const deleteResult = await supabase
      .from("weekly_team_reports")
      .delete()
      .eq("id", report.id)
      .eq("status", "archived");

    if (deleteResult.error) {
      setError(deleteResult.error.message);
      setDeletingReportId(null);
      return;
    }

    setReports((current) => current.filter((item) => item.id !== report.id));
    setReportActions((current) => current.filter((item) => item.report_id !== report.id));
    setReportNeighborhoods((current) => current.filter((item) => item.report_id !== report.id));
    setEntries((current) => current.map((entry) => (
      entry.source_report_id === report.id ? { ...entry, source_report_id: null, weekly_team_reports: null } : entry
    )));
    setFeedback("Relatório arquivado excluído.");
    setDeletingReportId(null);
  }

  if (loading) {
    return <StateBox>Carregando memória do projeto...</StateBox>;
  }

  if (error) {
    return <StateBox tone="error">{error}</StateBox>;
  }

  return (
    <section className="pb-10">
      <SemearPageHeader
        eyebrow="Arquivo vivo"
        title="Memória do Projeto"
        description="Relatórios semanais internos, anexos privados e linha do tempo da memória institucional. Não inclua CPF, telefone, endereço pessoal ou dado sensível desnecessário."
        actions={
          <>
            <SemearButton href={`/agenda/novo?eventType=relatorio_semanal&title=${encodeURIComponent(`Entrega dos relatórios semanais — ${formatWeekTitle(currentWeekStart)}`)}&startsAt=${currentWeekStart}T00:00&endsAt=${currentWeekStart}T23:59&allDay=1`} variant="secondary">
              <FileText className="h-4 w-4" aria-hidden="true" />
              Agendar prazo de relatório semanal
            </SemearButton>
            <SemearButton href="/memoria/novo" variant="primary">
              <Plus className="h-4 w-4" aria-hidden="true" />
              Novo relatório
            </SemearButton>
          </>
        }
      />

      {feedback ? <StateBox>{feedback}</StateBox> : null}

      {canReview && (
        <div className="mb-6 flex flex-wrap items-center gap-3 rounded-2xl border border-semear-earth/20 bg-semear-earth/5 p-4 shadow-sm">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-semear-earth">
            <CheckCircle2 className="h-5 w-5" />
          </div>
          <div className="flex-1">
            <h4 className="font-semibold text-semear-earth">Painel de Curadoria</h4>
            <p className="text-xs text-stone-500">Transforme relatórios em memória institucional curada.</p>
          </div>
          <div className="flex gap-2">
            <Link 
              href="/memoria/curadoria" 
              className="inline-flex h-10 items-center justify-center gap-2 rounded-full bg-semear-earth px-5 text-sm font-bold text-white shadow-soft hover:bg-semear-earth/90"
            >
              Acessar Curadoria
            </Link>
            <Link 
              href="/memoria/importacoes" 
              className="inline-flex h-10 items-center justify-center gap-2 rounded-full border border-semear-earth/20 bg-white px-5 text-sm font-bold text-semear-earth shadow-soft hover:bg-semear-earth/5"
            >
              <FileSearch className="h-4 w-4" />
              Qualidade das Importações
            </Link>
          </div>
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <SemearMetricCard icon={<FileText className="h-5 w-5" />} label="Desta semana" value={weekReports.length} note={referenceWeek ? formatDateLabel(referenceWeek) : "sem recorte"} />
        <SemearMetricCard icon={<FolderClock className="h-5 w-5" />} label="Pendentes" value={countsByStatus.draft + countsByStatus.submitted + countsByStatus.needs_changes} note="rascunho, enviado ou ajustes" tone="yellow" />
        <SemearMetricCard icon={<Clock3 className="h-5 w-5" />} label="Em revisão" value={countsByStatus.in_review} note="aguardando decisão" tone="earth" />
        <SemearMetricCard icon={<CheckCircle2 className="h-5 w-5" />} label="Aprovados" value={countsByStatus.approved} note="base para memória e prestação" />
      </div>

      <SemearCard className="mt-5">
        <FilterBar
          title="Filtros"
          onClear={() =>
            setFilters({
              week: "",
              teamMemberId: "",
              status: "",
              actionId: "",
              neighborhoodId: "",
              memoryType: "",
            })
          }
        >
          <FilterField label="Semana">
            <select className={filterControlClassName} value={filters.week} onChange={(event) => setFilters((current) => ({ ...current, week: event.target.value }))}>
              <option value="">Todas as semanas</option>
              {availableWeeks.map((week) => {
                const report = reports.find((item) => item.week_start === week);
                return (
                  <option key={week} value={week}>
                    {report ? formatWeekLabel(report.week_start, report.week_end) : formatDateLabel(week)}
                  </option>
                );
              })}
            </select>
          </FilterField>

          <FilterField label="Membro da equipe">
            <select className={filterControlClassName} value={filters.teamMemberId} onChange={(event) => setFilters((current) => ({ ...current, teamMemberId: event.target.value }))}>
              <option value="">Todos os membros</option>
              {teamMembers.map((member) => (
                <option key={member.id} value={member.id}>{member.display_name}</option>
              ))}
            </select>
          </FilterField>

          <FilterField label="Status">
            <select className={filterControlClassName} value={filters.status} onChange={(event) => setFilters((current) => ({ ...current, status: event.target.value }))}>
              <option value="">Todos os status</option>
              {weeklyReportStatusOptions.map((status) => (
                <option key={status.value} value={status.value}>{status.label}</option>
              ))}
            </select>
          </FilterField>

          <FilterField label="Ação">
            <select className={filterControlClassName} value={filters.actionId} onChange={(event) => setFilters((current) => ({ ...current, actionId: event.target.value }))}>
              <option value="">Todas as ações</option>
              {actions.map((action) => (
                <option key={action.id} value={action.id}>{action.title}</option>
              ))}
            </select>
          </FilterField>

          <FilterField label="Território">
            <select className={filterControlClassName} value={filters.neighborhoodId} onChange={(event) => setFilters((current) => ({ ...current, neighborhoodId: event.target.value }))}>
              <option value="">Todos os territórios</option>
              {neighborhoods.map((neighborhood) => (
                <option key={neighborhood.id} value={neighborhood.id}>{neighborhood.name}</option>
              ))}
            </select>
          </FilterField>

          <FilterField label="Tipo de memória">
            <select className={filterControlClassName} value={filters.memoryType} onChange={(event) => setFilters((current) => ({ ...current, memoryType: event.target.value }))}>
              <option value="">Todos os tipos</option>
              {projectMemoryTypeOptions.map((type) => (
                <option key={type.value} value={type.value}>{type.label}</option>
              ))}
            </select>
          </FilterField>
        </FilterBar>
      </SemearCard>

      <div className="mt-5 grid gap-5 xl:grid-cols-[1.05fr_0.95fr]">
        <SemearCard>
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-semear-earth">Relatórios semanais</p>
              <h3 className="mt-2 text-2xl font-semibold text-semear-green">Acompanhamento da semana e do histórico</h3>
            </div>
            <SemearStatusBadge tone="green">{filteredReports.length} relatório(s)</SemearStatusBadge>
          </div>

          <div className="mt-4 space-y-3">
            {filteredReports.map((report) => {
              const member = teamMembers.find((item) => item.id === report.team_member_id);
              const linkedActions = reportActions.filter((item) => item.report_id === report.id);
              const linkedNeighborhoods = reportNeighborhoods.filter((item) => item.report_id === report.id);

              return (
                <article className="rounded-xl border border-semear-gray bg-white p-4" key={report.id}>
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold uppercase tracking-[0.12em] text-semear-earth">{getWeeklyReportStatusLabel(report.status)}</span>
                        <span className="text-xs text-stone-500">{formatWeekLabel(report.week_start, report.week_end)}</span>
                      </div>
                      <h4 className="mt-3 text-lg font-semibold text-semear-green">{report.title}</h4>
                      <p className="mt-1 text-sm text-stone-600">{member?.display_name ?? "Membro não identificado"}</p>
                      {report.summary ? <p className="mt-3 text-sm leading-6 text-stone-700">{report.summary}</p> : null}
                    </div>
                    <div className="flex flex-col gap-2 sm:items-end">
                      <Link className="inline-flex min-h-10 items-center justify-center rounded-full border border-semear-green/15 bg-white px-4 text-sm font-semibold text-semear-green" href={`/memoria/${report.id}`}>
                        Abrir relatório
                      </Link>
                      {canReview && report.status === "archived" ? (
                        <button
                          className="inline-flex min-h-9 items-center justify-center gap-2 rounded-full border border-red-200 bg-red-50 px-3 text-xs font-bold text-red-800 transition hover:bg-red-100 disabled:opacity-60"
                          type="button"
                          onClick={() => void deleteArchivedReport(report)}
                          disabled={deletingReportId === report.id}
                        >
                          <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                          {deletingReportId === report.id ? "Excluindo..." : "Excluir"}
                        </button>
                      ) : null}
                    </div>
                  </div>
                  <div className="mt-4 flex flex-wrap gap-2 text-xs text-stone-600">
                    {linkedActions.map((item) => (
                      <span className="rounded-full bg-white px-3 py-1" key={item.action_id}>Ação: {item.actions?.title ?? "Ação vinculada"}</span>
                    ))}
                    {linkedNeighborhoods.map((item) => (
                      <span className="rounded-full bg-white px-3 py-1" key={item.neighborhood_id}>Território: {item.neighborhoods?.name ?? "Território"}</span>
                    ))}
                  </div>
                </article>
              );
            })}
            {filteredReports.length === 0 ? <EmptyCard text="Nenhum relatório encontrado para os filtros atuais." /> : null}
          </div>
        </SemearCard>

        <section className="space-y-5">
          <NotificationsInlinePanel
            title="Avisos de memória e relatórios"
            categories={["memoria", "relatorios"]}
            href="/avisos"
            emptyText="Sem avisos de memória no momento."
            limit={4}
          />

          <SemearCard>
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-full bg-semear-green-soft text-semear-green">
                <UsersRound className="h-5 w-5" aria-hidden="true" />
              </div>
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.18em] text-semear-earth">Envio da semana</p>
                <h3 className="text-xl font-semibold text-semear-green">Quem já enviou e quem ainda falta</h3>
              </div>
            </div>
            {canReview ? (
              <div className="mt-4 grid gap-4 md:grid-cols-2">
                <InfoList title="Enviaram" items={membersSent.map((member) => member.display_name)} emptyText="Nenhum envio ainda." />
                <InfoList title="Ainda não enviaram" items={membersPending.map((member) => member.display_name)} emptyText="Todos os membros ativos já enviaram." />
              </div>
            ) : (
              <div className="mt-4 rounded-2xl border border-semear-gray bg-semear-offwhite p-4 text-sm leading-6 text-stone-700">
                A coordenação acompanha a cobertura completa da semana. Aqui você vê seus próprios relatórios e a linha do tempo interna já consolidada.
              </div>
            )}
          </SemearCard>

          <SemearCard>
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-full bg-semear-green-soft text-semear-green">
                <LibraryBig className="h-5 w-5" aria-hidden="true" />
              </div>
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.18em] text-semear-earth">Linha do tempo do projeto</p>
                <h3 className="text-xl font-semibold text-semear-green">Entradas curadas da memória</h3>
              </div>
            </div>

            <div className="mt-4 space-y-3">
              {filteredEntries.map((entry) => (
                <article className="rounded-xl border border-semear-gray bg-white p-4" key={entry.id}>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold uppercase tracking-[0.12em] text-semear-earth">{getProjectMemoryTypeLabel(entry.memory_type)}</span>
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${getVisibilityStyle(entry.visibility)}`}>
                      {getProjectMemoryVisibilityLabel(entry.visibility)}
                    </span>
                    <span className="text-xs text-stone-500">{formatDateLabel(entry.entry_date)}</span>
                  </div>
                  <h4 className="mt-3 text-lg font-semibold text-semear-green">{entry.title}</h4>
                  <p className="mt-2 text-sm leading-6 text-stone-700">{summarizeProjectMemoryEntry(entry)}</p>
                  <div className="mt-3 flex flex-wrap gap-2 text-xs text-stone-600">
                    {entry.weekly_team_reports ? <Link className="rounded-full bg-white px-3 py-1" href={`/memoria/${entry.weekly_team_reports.id}`}>Origem: {entry.weekly_team_reports.title}</Link> : null}
                    {entry.actions ? <Link className="rounded-full bg-white px-3 py-1" href={`/acoes/${entry.actions.id}`}>Ação: {entry.actions.title}</Link> : null}
                  </div>
                </article>
              ))}
              {filteredEntries.length === 0 ? <EmptyCard text="Nenhuma entrada de memória encontrada para os filtros atuais." /> : null}
            </div>
          </SemearCard>
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

function countReportsByStatus(reports: WeeklyTeamReport[]) {
  return reports.reduce<Record<WeeklyTeamReportStatus, number>>(
    (accumulator, report) => {
      accumulator[report.status] += 1;
      return accumulator;
    },
    {
      draft: 0,
      submitted: 0,
      in_review: 0,
      approved: 0,
      needs_changes: 0,
      archived: 0,
    }
  );
}

function InfoList({ title, items, emptyText }: { title: string; items: string[]; emptyText: string }) {
  return (
    <section className="rounded-2xl border border-semear-gray bg-semear-offwhite p-4">
      <h4 className="font-semibold text-semear-green">{title}</h4>
      {items.length > 0 ? (
        <ul className="mt-3 space-y-2 text-sm text-stone-700">
          {items.map((item) => (
            <li className="rounded-xl bg-white px-3 py-2" key={item}>{item}</li>
          ))}
        </ul>
      ) : (
        <p className="mt-3 text-sm text-stone-500">{emptyText}</p>
      )}
    </section>
  );
}

function EmptyCard({ text }: { text: string }) {
  return <div className="rounded-2xl border border-dashed border-semear-green/20 bg-white px-4 py-5 text-sm text-stone-500">{text}</div>;
}

function StateBox({ children, tone = "neutral" }: { children: React.ReactNode; tone?: "neutral" | "error" }) {
  return <div className={`rounded-[1.5rem] p-6 text-sm shadow-soft ${tone === "error" ? "border border-red-200 bg-red-50 text-red-800" : "border border-white/80 bg-white/72 text-stone-600"}`}>{children}</div>;
}
