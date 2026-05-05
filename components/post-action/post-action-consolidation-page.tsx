"use client";

import { useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import Link from "next/link";
import { AlertTriangle, ClipboardList, FileText, FolderCheck, MapPinned, MessageSquareText } from "lucide-react";
import { PostActionDecisionPanel } from "@/components/post-action/post-action-decision-panel";
import { InternalMapReadinessPanel } from "@/components/territories/internal-map-readiness-panel";
import { MapGoNoGoPanel } from "@/components/territories/map-go-no-go-panel";
import { getActionPilotMetrics, type ActionForPilot } from "@/lib/action-pilot";
import { getActionStatusLabel, getActionTypeLabel } from "@/lib/actions";
import { getClosureStatusLabel } from "@/lib/action-closures";
import { getRespondentTerritoryRelationLabel } from "@/lib/listening-records";
import type { ActionClosure, ActionDebrief, Neighborhood } from "@/lib/database.types";
import { buildTerritorialQualityByNeighborhood, buildTerritorialQualityReport } from "@/lib/territorial-quality";
import { getTerritorialQualityMetrics, getTerritorialQualityRecommendation, type TerritorialReviewRecord } from "@/lib/territorial-review";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";

export function PostActionConsolidationPage() {
  const supabase = useMemo(() => createBrowserSupabaseClient(), []);
  const [actions, setActions] = useState<ActionForPilot[]>([]);
  const [records, setRecords] = useState<TerritorialReviewRecord[]>([]);
  const [debriefs, setDebriefs] = useState<ActionDebrief[]>([]);
  const [closures, setClosures] = useState<ActionClosure[]>([]);
  const [neighborhoods, setNeighborhoods] = useState<Neighborhood[]>([]);
  const [selectedActionId, setSelectedActionId] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);

  useEffect(() => {
    let ignore = false;

    async function load() {
      if (!supabase) {
        setError("Configure NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_ANON_KEY para consolidar o pós-banca.");
        setLoading(false);
        return;
      }

      const [actionsResult, recordsResult, debriefsResult, closuresResult, neighborhoodsResult] = await Promise.all([
        supabase.from("actions").select("*, neighborhoods:neighborhood_id(id, name)").order("action_date", { ascending: false }),
        supabase.from("listening_records").select("*, listening_record_themes(themes:theme_id(id, name)), places_mentioned(id, place_name, place_type, notes, neighborhood_id, normalized_place_id, normalized_places:normalized_place_id(id, normalized_name, visibility, place_type))").order("date", { ascending: false }),
        supabase.from("action_debriefs").select("*"),
        supabase.from("action_closures").select("*"),
        supabase.from("neighborhoods").select("*").order("name", { ascending: true })
      ]);

      if (ignore) return;

      if (actionsResult.error || recordsResult.error || debriefsResult.error || closuresResult.error || neighborhoodsResult.error) {
        setError(actionsResult.error?.message ?? recordsResult.error?.message ?? debriefsResult.error?.message ?? closuresResult.error?.message ?? neighborhoodsResult.error?.message ?? "Erro ao carregar consolidação pós-banca.");
        setLoading(false);
        return;
      }

      const loadedActions = (actionsResult.data ?? []) as ActionForPilot[];
      setActions(loadedActions);
      setRecords((recordsResult.data ?? []) as TerritorialReviewRecord[]);
      setDebriefs((debriefsResult.data ?? []) as ActionDebrief[]);
      setClosures((closuresResult.data ?? []) as ActionClosure[]);
      setNeighborhoods(neighborhoodsResult.data ?? []);
      setSelectedActionId(loadedActions[0]?.id ?? "");
      setLoading(false);
    }

    void load();
    return () => {
      ignore = true;
    };
  }, [supabase]);

  if (loading) return <StateBox>Carregando consolidação pós-banca...</StateBox>;
  if (error) return <StateBox tone="error">{error}</StateBox>;

  const selectedAction = actions.find((action) => action.id === selectedActionId) ?? null;
  const actionRecords = selectedAction ? records.filter((record) => record.action_id === selectedAction.id) : [];
  const debrief = selectedAction ? debriefs.find((item) => item.action_id === selectedAction.id) ?? null : null;
  const closure = selectedAction ? closures.find((item) => item.action_id === selectedAction.id) ?? null : null;
  const metrics = getActionPilotMetrics(actionRecords);
  const territorialMetrics = getTerritorialQualityMetrics(actionRecords);
  const territorialRecommendation = getTerritorialQualityRecommendation(actionRecords);
  const territoryQuality = buildTerritorialQualityByNeighborhood(neighborhoods, actionRecords).filter((item) => item.totalRecords > 0);
  const readyTerritories = territoryQuality.filter((item) => item.recommendation === "bom para mapa interno").length;
  const blockedTerritories = territoryQuality.filter((item) => item.recommendation === "bloqueado por sensível").length;
  const territorialQualityText = selectedAction ? `${buildTerritorialQualityReport(territoryQuality)}

## Recorte da ação

Ação: ${selectedAction.title}
Recomendação da ação: ${territorialRecommendation}
` : "";
  const reviewedPercent = metrics.total > 0 ? Math.round((metrics.reviewed / metrics.total) * 100) : 0;
  const territoryCount = new Set(actionRecords.map((record) => record.neighborhood_id).filter(Boolean)).size;
  const diagnostics = getDiagnostics(metrics, debrief, closure);

  return (
    <section className="pb-10">
      <div className="rounded-[2rem] border border-white/80 bg-white/78 p-6 shadow-soft sm:p-8">
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-semear-earth">Pós-banca</p>
        <h2 className="mt-3 text-4xl font-semibold tracking-tight text-semear-green">Consolidação pós-banca</h2>
        <p className="mt-4 max-w-3xl text-sm leading-6 text-stone-600">
          Selecione uma ação para consolidar dados reais, pendências e decisão formal do próximo passo. Esta tela não usa IA e não cria mapa.
        </p>
      </div>

      <div className="mt-6 rounded-[2rem] border border-white/80 bg-white p-5 shadow-soft">
        <label>
          <span className="text-sm font-semibold text-semear-green">Ação</span>
          <select className="mt-2 min-h-12 w-full rounded-2xl border border-semear-gray bg-white px-4 text-sm outline-none focus:border-semear-green" value={selectedActionId} onChange={(event) => setSelectedActionId(event.target.value)}>
            {actions.map((action) => (
              <option key={action.id} value={action.id}>{action.title} · {new Date(`${action.action_date}T00:00:00`).toLocaleDateString("pt-BR")}</option>
            ))}
          </select>
        </label>
      </div>

      {!selectedAction ? (
        <StateBox>Nenhuma ação encontrada. Cadastre uma ação antes de consolidar o pós-banca.</StateBox>
      ) : (
        <>
          <article className="mt-6 rounded-[2rem] border border-white/80 bg-white p-6 shadow-soft">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.18em] text-semear-earth">Dados da ação</p>
                <h3 className="mt-2 text-2xl font-semibold text-semear-green">{selectedAction.title}</h3>
                <p className="mt-2 text-sm leading-6 text-stone-600">
                  {new Date(`${selectedAction.action_date}T00:00:00`).toLocaleDateString("pt-BR")} · {selectedAction.neighborhoods?.name ?? "sem território"} · {getActionTypeLabel(selectedAction.action_type)} · {getActionStatusLabel(selectedAction.status)}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <ActionLink href={`/acoes/${selectedAction.id}`} label="Ação" />
                <ActionLink href={`/acoes/${selectedAction.id}/piloto`} label="Piloto" />
                <ActionLink href={`/acoes/${selectedAction.id}/devolutiva`} label="Devolutiva" />
                <ActionLink href={`/acoes/${selectedAction.id}/dossie`} label="Dossiê" />
              </div>
            </div>
          </article>

          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Metric icon={<MessageSquareText className="h-5 w-5" />} label="Escutas" value={metrics.total.toString()} />
            <Metric icon={<ClipboardList className="h-5 w-5" />} label="Revisadas" value={`${metrics.reviewed} (${reviewedPercent}%)`} />
            <Metric icon={<AlertTriangle className="h-5 w-5" />} label="Rascunhos" value={metrics.draft.toString()} danger={metrics.draft > 0} />
            <Metric icon={<AlertTriangle className="h-5 w-5" />} label="Dado sensível" value={metrics.possibleSensitive.toString()} danger={metrics.possibleSensitive > 0} />
            <Metric icon={<MapPinned className="h-5 w-5" />} label="Territórios" value={territoryCount.toString()} />
            <Metric icon={<FileText className="h-5 w-5" />} label="Devolutiva" value={debrief?.status ?? "não criada"} danger={debrief?.status !== "approved"} />
            <Metric icon={<FolderCheck className="h-5 w-5" />} label="Dossiê" value={getClosureStatusLabel(closure?.status)} danger={closure?.status !== "closed"} />
            <Metric icon={<ClipboardList className="h-5 w-5" />} label="Pendências" value={metrics.pending.toString()} danger={metrics.pending > 0} />
            <Metric icon={<MapPinned className="h-5 w-5" />} label="Rev. territorial pendente" value={territorialMetrics.pendingTerritorialReview.toString()} danger={territorialMetrics.pendingTerritorialReview > 0} />
            <Metric icon={<MapPinned className="h-5 w-5" />} label="Lugares estruturados" value={territorialMetrics.withStructuredPlaces.toString()} />
            <Metric icon={<MapPinned className="h-5 w-5" />} label="Lugares normalizados" value={territorialMetrics.normalizedPlaces.toString()} danger={territorialMetrics.normalizedPlaces < territorialMetrics.structuredPlaceMentions} />
            <Metric icon={<AlertTriangle className="h-5 w-5" />} label="Não normalizados" value={Math.max(territorialMetrics.structuredPlaceMentions - territorialMetrics.normalizedPlaces, 0).toString()} danger={territorialMetrics.normalizedPlaces < territorialMetrics.structuredPlaceMentions} />
            <Metric icon={<AlertTriangle className="h-5 w-5" />} label="Lugares sensíveis" value={territorialMetrics.sensitivePlaces.toString()} danger={territorialMetrics.sensitivePlaces > 0} />
            <Metric icon={<MapPinned className="h-5 w-5" />} label="Texto livre sem estrutura" value={territorialMetrics.unstructuredPlaces.toString()} danger={territorialMetrics.unstructuredPlaces > 0} />
            <Metric icon={<MapPinned className="h-5 w-5" />} label="Territórios prontos" value={readyTerritories.toString()} />
            <Metric icon={<AlertTriangle className="h-5 w-5" />} label="Territórios bloqueados" value={blockedTerritories.toString()} danger={blockedTerritories > 0} />
          </div>

          <div className="mt-6 grid gap-5 lg:grid-cols-2">
            <ListPanel title="Temas mais citados" items={metrics.topThemes.map((item) => `${item.label} (${item.count})`)} />
            <ListPanel title="Palavras recorrentes" items={metrics.topWords.map((item) => `${item.label} (${item.count})`)} />
            <ListPanel title="Lugares mencionados" items={metrics.places.map((item) => `${item.label} (${item.count})`)} />
            <ListPanel title="Prioridades apontadas" items={metrics.priorities.map((item) => `${item.label} (${item.count})`)} />
          </div>

          {/* LEITURA POR TERRITÓRIO DE REFERÊNCIA DO ENTREVISTADO */}
          {(() => {
            const respondentGroups = buildRespondentTerritoryGroups(actionRecords as ActionRecordForRespondent[], neighborhoods);
            if (respondentGroups.length === 0) return null;
            return (
              <section className="mt-6 rounded-[2rem] border border-white/80 bg-white p-6 shadow-soft">
                <h3 className="font-semibold text-semear-green">Leitura por território de referência do entrevistado</h3>
                <p className="mt-2 text-xs leading-5 text-stone-500">
                  Separação entre território da ação (onde a banca ocorreu) e território de referência de cada entrevistado.<br />
                  Dados agregados por bairro oficial. Sem endereço ou ponto individual.
                </p>
                <div className="mt-5 space-y-4">
                  {respondentGroups.map((group) => (
                    <div className="rounded-2xl border border-semear-gray bg-semear-offwhite p-4" key={group.neighborhoodName}>
                      <div className="flex flex-wrap items-center gap-3">
                        <span className="rounded-full bg-semear-green-soft px-3 py-1 text-sm font-semibold text-semear-green">{group.neighborhoodName}</span>
                        <span className="text-sm text-stone-600">{group.count} escuta{group.count !== 1 ? "s" : ""}</span>
                        {group.relations.length > 0 && (
                          <span className="text-xs text-stone-500">{group.relations.join(", ")}</span>
                        )}
                      </div>
                      {group.topThemes.length > 0 && (
                        <p className="mt-2 text-sm leading-6 text-stone-700">
                          <strong className="font-semibold text-semear-green">Temas:</strong>{" "}
                          {group.topThemes.slice(0, 5).join(", ")}
                        </p>
                      )}
                      {group.topWords.length > 0 && (
                        <p className="mt-1 text-sm leading-6 text-stone-700">
                          <strong className="font-semibold text-semear-green">Palavras:</strong>{" "}
                          {group.topWords.slice(0, 8).join(", ")}
                        </p>
                      )}
                      {group.priorities.length > 0 && (
                        <p className="mt-1 text-sm leading-6 text-stone-700">
                          <strong className="font-semibold text-semear-green">Prioridades:</strong>{" "}
                          {group.priorities.slice(0, 4).join(", ")}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
                <p className="mt-4 text-xs text-stone-400">
                  {actionRecords.filter((r) => !r.respondent_neighborhood_id).length} escuta(s) sem território de referência preenchido.
                </p>
              </section>
            );
          })()}

          <section className="mt-6 rounded-[2rem] border border-white/80 bg-white p-6 shadow-soft">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <h3 className="font-semibold text-semear-green">Diagnóstico automático</h3>
                <p className="mt-2 text-sm leading-6 text-stone-600">Qualidade territorial: {territorialRecommendation}</p>
              </div>
              <button className="inline-flex min-h-11 items-center justify-center rounded-full border border-semear-green/15 bg-white px-4 text-sm font-semibold text-semear-green" onClick={() => void navigator.clipboard.writeText(territorialQualityText).then(() => setFeedback("Relatório de qualidade territorial copiado."))} type="button">
                Copiar qualidade territorial
              </button>
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              {diagnostics.map((item) => (
                <span className={`rounded-full px-3 py-1 text-sm font-semibold ${item.good ? "bg-green-50 text-green-800" : "bg-amber-50 text-amber-900"}`} key={item.label}>
                  {item.label}
                </span>
              ))}
            </div>
          </section>

          <div className="mt-6">
            <InternalMapReadinessPanel neighborhoods={neighborhoods} records={actionRecords} territoryCount={territoryCount} debrief={debrief} closure={closure} actionContext />
          </div>

          <div className="mt-6">
            <MapGoNoGoPanel neighborhoods={neighborhoods} records={actionRecords} debrief={debrief} closure={closure} actionContext />
          </div>

          <div className="mt-6">
            <PostActionDecisionPanel action={selectedAction} records={actionRecords} territoryCount={territoryCount} debrief={debrief} closure={closure} onCopied={setFeedback} />
            {feedback ? <p className="mt-3 text-sm font-semibold text-semear-green">{feedback}</p> : null}
          </div>
        </>
      )}
    </section>
  );
}

type RespondentGroup = {
  neighborhoodName: string;
  neighborhoodId: string;
  count: number;
  relations: string[];
  topThemes: string[];
  topWords: string[];
  priorities: string[];
};

type ActionRecordForRespondent = TerritorialReviewRecord & {
  listening_record_themes?: Array<{ themes: { id: string; name: string } | null }>;
};

function buildRespondentTerritoryGroups(
  records: ActionRecordForRespondent[],
  neighborhoods: Neighborhood[]
): RespondentGroup[] {
  const neighborhoodMap = new Map(neighborhoods.map((n) => [n.id, n.name]));
  const groups = new Map<string, { records: ActionRecordForRespondent[]; relations: Set<string> }>();

  for (const record of records) {
    if (!record.respondent_neighborhood_id) continue;
    const existing = groups.get(record.respondent_neighborhood_id);
    if (existing) {
      existing.records.push(record);
      if (record.respondent_territory_relation) existing.relations.add(record.respondent_territory_relation);
    } else {
      groups.set(record.respondent_neighborhood_id, {
        records: [record],
        relations: record.respondent_territory_relation ? new Set([record.respondent_territory_relation]) : new Set()
      });
    }
  }

  const result: RespondentGroup[] = [];
  for (const [neighborhoodId, group] of Array.from(groups.entries())) {
    const themeCount = new Map<string, number>();
    const wordCount = new Map<string, number>();
    const priorityFragments: string[] = [];

    for (const r of group.records) {
      for (const lt of (r.listening_record_themes ?? [])) {
        if (lt.themes?.name) themeCount.set(lt.themes.name, (themeCount.get(lt.themes.name) ?? 0) + 1);
      }
      for (const word of (r.words_used ?? "").split(/[,;\s]+/).map((w) => w.trim().toLowerCase()).filter((w) => w.length > 3)) {
        wordCount.set(word, (wordCount.get(word) ?? 0) + 1);
      }
      if (r.priority_mentioned?.trim()) priorityFragments.push(r.priority_mentioned.trim());
    }

    const topThemes = Array.from(themeCount.entries()).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([label, count]) => `${label} (${count})`);
    const topWords = Array.from(wordCount.entries()).sort((a, b) => b[1] - a[1]).slice(0, 8).map(([w]) => w);
    const relations = Array.from(group.relations).map((r) => getRespondentTerritoryRelationLabel(r as import("@/lib/database.types").RespondentTerritoryRelation));

    result.push({
      neighborhoodId,
      neighborhoodName: neighborhoodMap.get(neighborhoodId) ?? neighborhoodId,
      count: group.records.length,
      relations,
      topThemes,
      topWords,
      priorities: priorityFragments.slice(0, 3)
    });
  }

  return result.sort((a, b) => b.count - a.count);
}

function getDiagnostics(metrics: ReturnType<typeof getActionPilotMetrics>, debrief: ActionDebrief | null, closure: ActionClosure | null) {
  return [
    { label: metrics.total > 0 ? "operação com escutas" : "operação incompleta", good: metrics.total > 0 },
    { label: metrics.reviewed >= 20 ? "revisão suficiente para avaliar mapa" : "revisão insuficiente para mapa", good: metrics.reviewed >= 20 },
    { label: metrics.draft === 0 ? "sem rascunhos" : "há rascunhos", good: metrics.draft === 0 },
    { label: metrics.possibleSensitive === 0 ? "sem alerta sensível" : "dado sensível pendente", good: metrics.possibleSensitive === 0 },
    { label: debrief?.status === "approved" ? "devolutiva aprovada" : "devolutiva pendente", good: debrief?.status === "approved" },
    { label: closure?.status === "closed" ? "dossiê fechado" : "dossiê pendente", good: closure?.status === "closed" }
  ];
}

function ActionLink({ href, label }: { href: string; label: string }) {
  return <Link className="inline-flex min-h-11 items-center rounded-full border border-semear-green/15 bg-white px-4 text-sm font-semibold text-semear-green" href={href}>{label}</Link>;
}

function Metric({ icon, label, value, danger = false }: { icon: ReactNode; label: string; value: string; danger?: boolean }) {
  return (
    <div className={`rounded-3xl border p-5 shadow-soft ${danger ? "border-amber-200 bg-amber-50" : "border-white/80 bg-white"}`}>
      <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-2xl bg-semear-green-soft text-semear-green">{icon}</div>
      <p className={`text-sm font-medium ${danger ? "text-amber-900" : "text-stone-600"}`}>{label}</p>
      <strong className={`mt-2 block text-2xl font-semibold ${danger ? "text-amber-950" : "text-semear-green"}`}>{value}</strong>
    </div>
  );
}

function ListPanel({ title, items }: { title: string; items: string[] }) {
  return (
    <section className="rounded-[2rem] border border-white/80 bg-white p-5 shadow-soft">
      <h3 className="font-semibold text-semear-green">{title}</h3>
      {items.length > 0 ? (
        <p className="mt-3 text-sm leading-6 text-stone-700">{items.slice(0, 8).join(", ")}</p>
      ) : (
        <p className="mt-3 text-sm text-stone-500">Não registrado.</p>
      )}
    </section>
  );
}

function StateBox({ children, tone = "neutral" }: { children: ReactNode; tone?: "neutral" | "error" }) {
  return <div className={`rounded-[1.5rem] p-6 text-sm shadow-soft ${tone === "error" ? "border border-red-200 bg-red-50 text-red-800" : "bg-white/72 text-stone-600"}`}>{children}</div>;
}
