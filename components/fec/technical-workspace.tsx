"use client";

import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import Link from "next/link";
import { FecMonthlyWorkspace } from "@/components/fec/monthly-workspace";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";
import { uploadFecFile } from "@/lib/fec-files";
import type { FecActivityRow, FecCycleRow } from "@/lib/fec-persistence.types";
import {
  knowledgeFields,
  knowledgeKinds,
  knowledgeLabels,
  type FecKnowledgeRow,
  type KnowledgeKind,
} from "@/lib/fec-knowledge";
import {
  emptyFecFieldDraft,
  fecFieldTypes,
  type FecFieldDraft,
} from "@/lib/fec-field-protocol";

type Catalog = {
  userId: string;
  scopes: {
    id: string;
    title: string;
    contract_reference: string;
    status: string;
  }[];
  grants: { engagement_id: string; role: string; active: boolean }[];
  neighborhoods: { id: string; name: string }[];
  cycles: FecCycleRow[];
  actions: {
    id: string;
    title: string;
    neighborhood_id: string | null;
    action_date: string;
    status: string;
  }[];
};
type Attachment = { id: string; record_id: string; title: string };
type History = {
  id: string;
  record_id: string;
  decision: string;
  reason: string | null;
  reviewer_id: string;
  decided_at: string;
};
type KnowledgeDraft = {
  id?: string;
  previousId?: string;
  kind: KnowledgeKind;
  title: string;
  content: Record<string, string>;
  sourceActivityIds: string[];
  sourceRecordIds: string[];
  communityStatus: FecKnowledgeRow["community_status"];
  communityNotes: string;
  proposalStatus: FecKnowledgeRow["proposal_status"];
};
const blankKnowledge = (): KnowledgeDraft => ({
  kind: "map",
  title: "",
  content: {},
  sourceActivityIds: [],
  sourceRecordIds: [],
  communityStatus: "not_requested",
  communityNotes: "",
  proposalStatus: "recorded",
});
const control =
  "mt-1 w-full rounded-xl border border-stone-300 bg-white p-3 text-sm text-stone-900 disabled:bg-stone-100";
const button =
  "rounded-xl border border-stone-300 bg-white px-4 py-2 text-sm font-semibold text-semear-green disabled:opacity-50";
const label = "block text-sm font-semibold text-stone-700";
async function api<T>(path: string, options?: RequestInit): Promise<T> {
  const r = await fetch("/api/fec/" + path, { ...options, cache: "no-store" });
  const data = await r.json();
  if (!r.ok) throw new Error(data.error ?? "Não foi possível concluir.");
  return data as T;
}
function send<T>(path: string, body: unknown, method = "POST") {
  return api<T>(path, {
    method,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}
function Area({
  title,
  value,
  onChange,
}: {
  title: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <label className={label}>
      {title}
      <textarea
        className={control}
        rows={3}
        maxLength={10000}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </label>
  );
}
function Box({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="mt-6 rounded-2xl border border-stone-200 bg-white p-4 sm:p-6">
      <h2 className="mb-4 text-xl font-semibold text-semear-green">{title}</h2>
      {children}
    </section>
  );
}

export function FecTechnicalWorkspace({ enabled }: { enabled: boolean }) {
  const [catalog, setCatalog] = useState<Catalog | null>(null),
    [cycleId, setCycleId] = useState("");
  const [activities, setActivities] = useState<FecActivityRow[]>([]),
    [records, setRecords] = useState<FecKnowledgeRow[]>([]),
    [files, setFiles] = useState<Attachment[]>([]),
    [history, setHistory] = useState<History[]>([]);
  const [message, setMessage] = useState(""),
    [busy, setBusy] = useState(false),
    [tab, setTab] = useState("cycles"),
    [reason, setReason] = useState("");
  const [cycleDraft, setCycleDraft] = useState({
    id: "",
    engagementId: "",
    neighborhoodId: "",
    title: "",
    guidingQuestion: "",
    objectives: "",
    methodology: "",
    stage: "preparation",
  });
  const [activityDraft, setActivityDraft] = useState<FecFieldDraft>({
      ...emptyFecFieldDraft,
    }),
    [activityId, setActivityId] = useState(""),
    [actionId, setActionId] = useState("");
  const [themes, setThemes] = useState(""),
    [fieldNotes, setFieldNotes] = useState(""),
    [results, setResults] = useState("");
  const [knowledge, setKnowledge] = useState<KnowledgeDraft>(blankKnowledge);
  const [monthlyDirty, setMonthlyDirty] = useState(false);
  const [territoryId, setTerritoryId] = useState(""),
    [territorial, setTerritorial] = useState<{
      note: string;
      officialActions: { id: string; title: string }[];
      cycles: FecCycleRow[];
      knowledge: Pick<
        FecKnowledgeRow,
        "id" | "kind" | "title" | "version" | "owner_id" | "status"
      >[];
      index: {
        eventCount: number;
        fecContributionIds: string[];
        officialActionIds: string[];
      };
    } | null>(null);
  const cycle = catalog?.cycles.find((c) => c.id === cycleId);
  const own = cycle?.owner_id === catalog?.userId;
  const supervisor =
    !!cycle &&
    !!catalog?.grants.some(
      (g) =>
        g.engagement_id === cycle.engagement_id &&
        g.role === "supervisor" &&
        g.active,
    ) &&
    !own;
  async function refreshCatalog() {
    const d = await api<Catalog>("catalog");
    setCatalog(d);
    return d;
  }
  async function refreshSources(id: string) {
    const [a, k] = await Promise.all([
      api<{ activities: FecActivityRow[] }>("activities?cycleId=" + id),
      api<{
        records: FecKnowledgeRow[];
        files: Attachment[];
        history: History[];
      }>("knowledge?cycleId=" + id),
    ]);
    setActivities(a.activities);
    setRecords(k.records);
    setFiles(k.files);
    setHistory(k.history);
  }
  useEffect(() => {
    if (!enabled) return;
    let alive = true;
    api<Catalog>("catalog")
      .then((d) => {
        if (alive) {
          setCatalog(d);
          setMessage(
            d.grants.length
              ? ""
              : "Nenhuma atribuição FEC ativa para esta sessão.",
          );
        }
      })
      .catch((e) => {
        if (alive) setMessage(e.message);
      });
    return () => {
      alive = false;
    };
  }, [enabled]);
  useEffect(() => {
    setActivities([]);
    setRecords([]);
    setFiles([]);
    setHistory([]);
    setKnowledge(blankKnowledge());
    setActivityId("");
    setActivityDraft({ ...emptyFecFieldDraft });
    if (!enabled || !cycleId) return;
    let alive = true;
    Promise.all([
      api<{ activities: FecActivityRow[] }>("activities?cycleId=" + cycleId),
      api<{
        records: FecKnowledgeRow[];
        files: Attachment[];
        history: History[];
      }>("knowledge?cycleId=" + cycleId),
    ])
      .then(([a, k]) => {
        if (alive) {
          setActivities(a.activities);
          setRecords(k.records);
          setFiles(k.files);
          setHistory(k.history);
        }
      })
      .catch((e) => {
        if (alive) setMessage(e.message);
      });
    return () => {
      alive = false;
    };
  }, [enabled, cycleId]);
  async function run(work: () => Promise<void>) {
    if (busy) return;
    setBusy(true);
    setMessage("");
    try {
      await work();
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Falha na operação.");
    } finally {
      setBusy(false);
    }
  }
  function setField<K extends keyof FecFieldDraft>(
    key: K,
    value: FecFieldDraft[K],
  ) {
    setActivityDraft((d) => ({ ...d, [key]: value }));
  }
  async function saveCycle(e: FormEvent) {
    e.preventDefault();
    await run(async () => {
      const d = await send<{ cycle: FecCycleRow }>(
        "cycles",
        cycleDraft,
        cycleDraft.id ? "PATCH" : "POST",
      );
      await refreshCatalog();
      setCycleId(d.cycle.id);
      setMessage("Ciclo salvo em rascunho.");
    });
  }
  async function saveActivity(e: FormEvent) {
    e.preventDefault();
    await run(async () => {
      await send(
        "activities",
        {
          ...activityDraft,
          cycleId,
          canonicalActionId: actionId || null,
          themes,
          fieldNotes,
          preliminaryResults: results,
          ...(activityId ? { id: activityId } : {}),
        },
        activityId ? "PATCH" : "POST",
      );
      await refreshSources(cycleId);
      setActivityId("");
      setActivityDraft({ ...emptyFecFieldDraft });
      setThemes("");
      setFieldNotes("");
      setResults("");
      setActionId("");
      setMessage("Atividade salva em rascunho.");
    });
  }
  async function saveKnowledge(e: FormEvent) {
    e.preventDefault();
    await run(async () => {
      await send(
        "knowledge",
        { ...knowledge, cycleId },
        knowledge.id ? "PATCH" : "POST",
      );
      await refreshSources(cycleId);
      setKnowledge(blankKnowledge());
      setMessage("Registro salvo. A situação da revisão aparece no acervo.");
    });
  }
  function editActivity(a: FecActivityRow) {
    setActivityId(a.id);
    setActivityDraft({
      ...emptyFecFieldDraft,
      activityDate: a.activity_date,
      activityType: a.activity_type as FecFieldDraft["activityType"],
      objective: a.objective,
      methodology: a.methodology,
      participationKind: a.participation_kind,
      participantCount:
        a.participation_count === null ? "" : String(a.participation_count),
      participantAccounts: a.participant_accounts ?? "",
      teamObservations: a.team_observations ?? "",
      externalSources: a.external_sources ?? "",
      mapMethod: a.map_method ?? "",
      mapLegend: a.map_legend ?? "",
      finding: a.finding_draft ?? "",
      proposal: a.proposal_draft ?? "",
      limits: a.limitations ?? "",
      nextSteps: a.next_steps ?? "",
    });
    setThemes(a.themes);
    setFieldNotes(a.field_notes);
    setResults(a.preliminary_results);
    setActionId(a.canonical_action_id ?? "");
  }
  function editKnowledge(r: FecKnowledgeRow, newVersion = false) {
    setKnowledge({
      ...(newVersion
        ? { previousId: r.id }
        : { id: r.id, previousId: r.previous_id ?? undefined }),
      kind: r.kind,
      title: r.title,
      content: { ...r.content },
      sourceActivityIds: [...r.source_activity_ids],
      sourceRecordIds: [...r.source_record_ids],
      communityStatus: r.community_status,
      communityNotes: r.community_notes,
      proposalStatus: r.proposal_status,
    });
  }
  async function decision(kind: string, id: string, value: string) {
    await run(async () => {
      await send("review", { kind, id, decision: value, reason });
      await Promise.all([refreshCatalog(), refreshSources(cycleId)]);
      setMessage("Situação atualizada e registrada no histórico.");
    });
  }
  function decisions(kind: string, id: string, status: string) {
    return (
      <div className="mt-3 flex flex-wrap gap-2">
        {own && ["draft", "needs_changes"].includes(status) && (
          <button
            type="button"
            className={button}
            disabled={busy}
            onClick={() => void decision(kind, id, "submitted")}
          >
            Enviar para revisão
          </button>
        )}
        {supervisor && status === "submitted" && (
          <>
            <button
              type="button"
              className={button}
              disabled={busy}
              onClick={() => void decision(kind, id, "approved")}
            >
              Aprovar tecnicamente
            </button>
            <button
              type="button"
              className={button}
              disabled={busy}
              onClick={() => void decision(kind, id, "needs_changes")}
            >
              Solicitar ajustes
            </button>
          </>
        )}
        {supervisor && status === "approved" && kind !== "knowledge" && (
          <button
            type="button"
            className={button}
            disabled={busy}
            onClick={() => void decision(kind, id, "needs_changes")}
          >
            Reabrir com justificativa
          </button>
        )}
      </div>
    );
  }
  const knowledgeSourceToggle = (
    key: "sourceActivityIds" | "sourceRecordIds",
    id: string,
    checked: boolean,
  ) =>
    setKnowledge((k) => ({
      ...k,
      [key]: checked ? [...k[key], id] : k[key].filter((v) => v !== id),
    }));
  return (
    <div className="pb-12">
      <header className="rounded-2xl border border-stone-200 bg-white p-5 sm:p-7">
        <p className="text-xs font-bold uppercase tracking-widest text-semear-earth">
          Frente técnica FEC · Cartografia social
        </p>
        <h1 className="mt-2 text-3xl font-semibold text-semear-green">
          Conhecimento territorial
        </h1>
        <p className="mt-3 max-w-3xl text-sm leading-6">
          Ciclos, oficinas, mapas e diagnósticos do profissional contratado por
          aditivo FEC. Cada contribuição preserva autoria, método e fontes. A
          leitura territorial reúne referências das frentes do projeto.
        </p>
        <Link
          href="/fec/cartografia/minuta"
          className="mt-3 inline-block text-sm text-semear-green underline"
        >
          Abrir protocolo de minuta local
        </Link>
      </header>
      {!enabled ? (
        <div
          role="status"
          className="mt-5 rounded-xl border border-amber-300 bg-amber-50 p-5"
        >
          Gravação FEC desativada neste ambiente. A homologação do banco e das
          atribuições contratuais precisa estar concluída para liberar os
          registros. O protocolo de minuta local continua disponível.
        </div>
      ) : (
        <>
          <div
            role="status"
            aria-live="polite"
            className="my-4 min-h-6 break-words text-sm text-stone-800"
          >
            {busy ? "Salvando ou consultando…" : message}
          </div>
          {catalog && (
            <>
              <label className={label}>
                Ciclo em consulta
                <select
                  aria-label="Ciclo em consulta"
                  className={control}
                  value={cycleId}
                  onChange={(e) => {
                    if (
                      monthlyDirty &&
                      !window.confirm(
                        "Há alterações mensais não salvas. Descartar e trocar o ciclo?",
                      )
                    )
                      return;
                    setCycleId(e.target.value);
                  }}
                >
                  <option value="">Escolha um ciclo</option>
                  {catalog.cycles.map((c) => (
                    <option value={c.id} key={c.id}>
                      {c.title} ·{" "}
                      {catalog.neighborhoods.find(
                        (n) => n.id === c.neighborhood_id,
                      )?.name ?? c.neighborhood_id}{" "}
                      · {c.status}
                    </option>
                  ))}
                </select>
              </label>
              <nav
                aria-label="Seções da trilha técnica"
                className="mt-4 flex flex-wrap gap-2"
              >
                {[
                  ["cycles", "Ciclos"],
                  ["activities", "Atividades"],
                  ["knowledge", "Produtos e evidências"],
                  ["monthly", "Relatório mensal"],
                  ["territory", "Leitura por território"],
                ].map(([id, text]) => (
                  <button
                    type="button"
                    key={id}
                    aria-current={tab === id ? "page" : undefined}
                    className={
                      button +
                      (tab === id
                        ? " bg-green-50 ring-2 ring-semear-green"
                        : "")
                    }
                    onClick={() => {
                      if (
                        tab === "monthly" &&
                        monthlyDirty &&
                        !window.confirm(
                          "Há alterações mensais não salvas. Descartar e sair do fechamento?",
                        )
                      )
                        return;
                      setTab(id);
                    }}
                  >
                    {text}
                  </button>
                ))}
              </nav>
              {supervisor &&
                ["cycles", "activities", "knowledge"].includes(tab) && (
                  <Box title="Observação da supervisão">
                    <Area
                      title="Justificativa para ajustes ou reabertura"
                      value={reason}
                      onChange={setReason}
                    />
                    <p className="mt-2 text-sm">
                      A aprovação técnica não equivale a aceite financeiro ou
                      validação comunitária.
                    </p>
                  </Box>
                )}
              {tab === "cycles" && (
                <Box title="Ciclo técnico territorial">
                  {cycle && (
                    <article className="mb-5 rounded-xl bg-stone-50 p-4">
                      <h3 className="font-semibold">{cycle.title}</h3>
                      <p className="mt-2 text-sm">
                        Responsável: {cycle.owner_id}
                        <br />
                        Aditivo:{" "}
                        {
                          catalog.scopes.find(
                            (s) => s.id === cycle.engagement_id,
                          )?.contract_reference
                        }
                        <br />
                        Etapa: {cycle.stage} · Revisão: {cycle.status}
                      </p>
                      <p className="mt-2 text-sm">{cycle.guiding_question}</p>
                      {decisions("cycle", cycle.id, cycle.status)}
                      {own &&
                        ["draft", "needs_changes"].includes(cycle.status) && (
                          <button
                            type="button"
                            className={button + " mt-3"}
                            onClick={() =>
                              setCycleDraft({
                                id: cycle.id,
                                engagementId: cycle.engagement_id,
                                neighborhoodId: cycle.neighborhood_id,
                                title: cycle.title,
                                guidingQuestion: cycle.guiding_question,
                                objectives: cycle.objectives,
                                methodology: cycle.methodology,
                                stage: cycle.stage,
                              })
                            }
                          >
                            Editar ciclo
                          </button>
                        )}
                    </article>
                  )}
                  <form onSubmit={saveCycle} className="space-y-4">
                    <h3 className="font-semibold">
                      {cycleDraft.id ? "Editar rascunho" : "Novo ciclo"}
                    </h3>
                    <label className={label}>
                      Aditivo
                      <select
                        aria-label="Aditivo"
                        required
                        className={control}
                        value={cycleDraft.engagementId}
                        onChange={(e) =>
                          setCycleDraft((d) => ({
                            ...d,
                            engagementId: e.target.value,
                          }))
                        }
                      >
                        <option value="">Escolha o aditivo</option>
                        {catalog.scopes
                          .filter(
                            (s) =>
                              s.status === "active" &&
                              catalog.grants.some(
                                (g) =>
                                  g.engagement_id === s.id &&
                                  g.role === "executor",
                              ),
                          )
                          .map((s) => (
                            <option key={s.id} value={s.id}>
                              {s.contract_reference} — {s.title}
                            </option>
                          ))}
                      </select>
                    </label>
                    <label className={label}>
                      Território oficial
                      <select
                        aria-label="Território oficial"
                        required
                        className={control}
                        value={cycleDraft.neighborhoodId}
                        onChange={(e) =>
                          setCycleDraft((d) => ({
                            ...d,
                            neighborhoodId: e.target.value,
                          }))
                        }
                      >
                        <option value="">Escolha um território</option>
                        {catalog.neighborhoods.map((n) => (
                          <option value={n.id} key={n.id}>
                            {n.name}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className={label}>
                      Título
                      <input
                        required
                        maxLength={180}
                        className={control}
                        value={cycleDraft.title}
                        onChange={(e) =>
                          setCycleDraft((d) => ({
                            ...d,
                            title: e.target.value,
                          }))
                        }
                      />
                    </label>
                    {(
                      ["guidingQuestion", "objectives", "methodology"] as const
                    ).map((key, i) => (
                      <Area
                        key={key}
                        title={
                          [
                            "Pergunta orientadora",
                            "Objetivos",
                            "Metodologia do ciclo",
                          ][i]
                        }
                        value={cycleDraft[key]}
                        onChange={(v) =>
                          setCycleDraft((d) => ({ ...d, [key]: v }))
                        }
                      />
                    ))}
                    <label className={label}>
                      Etapa
                      <select
                        className={control}
                        value={cycleDraft.stage}
                        onChange={(e) =>
                          setCycleDraft((d) => ({
                            ...d,
                            stage: e.target.value,
                          }))
                        }
                      >
                        {[
                          ["preparation", "Preparação"],
                          ["fieldwork", "Trabalho de campo"],
                          ["systematization", "Sistematização"],
                          ["feedback", "Devolutiva"],
                          ["closed", "Encerrado"],
                        ].map(([v, t]) => (
                          <option key={v} value={v}>
                            {t}
                          </option>
                        ))}
                      </select>
                    </label>
                    <button className={button} disabled={busy}>
                      Salvar ciclo
                    </button>
                    <button
                      type="button"
                      className={button + " ml-2"}
                      onClick={() =>
                        setCycleDraft({
                          id: "",
                          engagementId: "",
                          neighborhoodId: "",
                          title: "",
                          guidingQuestion: "",
                          objectives: "",
                          methodology: "",
                          stage: "preparation",
                        })
                      }
                    >
                      Limpar formulário
                    </button>
                  </form>
                </Box>
              )}
              {tab !== "cycles" && tab !== "territory" && !cycle && (
                <p className="mt-5">Escolha um ciclo para continuar.</p>
              )}
              {tab === "activities" && cycle && (
                <Box title="Oficinas e atividades formativas">
                  {activities.map((a) => (
                    <article key={a.id} className="mb-4 rounded-xl border p-4">
                      <h3 className="font-semibold">
                        {a.activity_date} · {a.objective}
                      </h3>
                      <p className="mt-2 text-sm">
                        {a.activity_type} · {a.status} ·{" "}
                        {a.participation_kind === "not_recorded"
                          ? "Participação não registrada"
                          : `${a.participation_count} participações (${a.participation_kind})`}
                      </p>
                      {a.canonical_action_id && (
                        <Link
                          className="text-sm underline"
                          href={"/acoes/" + a.canonical_action_id}
                        >
                          Abrir ação compartilhada
                        </Link>
                      )}
                      {decisions("activity", a.id, a.status)}
                      {own && ["draft", "needs_changes"].includes(a.status) && (
                        <button
                          type="button"
                          className={button + " mt-2"}
                          onClick={() => editActivity(a)}
                        >
                          Editar atividade
                        </button>
                      )}
                    </article>
                  ))}
                  {own && (
                    <form onSubmit={saveActivity} className="space-y-4">
                      <h3 className="font-semibold">
                        {activityId
                          ? "Editar atividade"
                          : "Registrar atividade"}
                      </h3>
                      <label className={label}>
                        Data
                        <input
                          required
                          type="date"
                          className={control}
                          value={activityDraft.activityDate}
                          onChange={(e) =>
                            setField("activityDate", e.target.value)
                          }
                        />
                      </label>
                      <label className={label}>
                        Tipo
                        <select
                          className={control}
                          value={activityDraft.activityType}
                          onChange={(e) =>
                            setField(
                              "activityType",
                              e.target.value as FecFieldDraft["activityType"],
                            )
                          }
                        >
                          {fecFieldTypes.map((t) => (
                            <option key={t.value} value={t.value}>
                              {t.label}
                            </option>
                          ))}
                        </select>
                      </label>
                      <label className={label}>
                        Ação oficial compartilhada (quando for o mesmo evento)
                        <select
                          className={control}
                          value={actionId}
                          onChange={(e) => setActionId(e.target.value)}
                        >
                          <option value="">
                            Atividade própria FEC, sem vínculo compartilhado
                          </option>
                          {catalog.actions
                            .filter(
                              (a) =>
                                a.neighborhood_id === cycle.neighborhood_id &&
                                a.action_date === activityDraft.activityDate &&
                                a.status === "realizada",
                            )
                            .map((a) => (
                              <option key={a.id} value={a.id}>
                                {a.title} · {a.action_date}
                              </option>
                            ))}
                        </select>
                      </label>
                      <Area
                        title="Objetivo pedagógico"
                        value={activityDraft.objective}
                        onChange={(v) => setField("objective", v)}
                      />
                      <Area
                        title="Metodologia realizada"
                        value={activityDraft.methodology}
                        onChange={(v) => setField("methodology", v)}
                      />
                      <Area
                        title="Temas abordados"
                        value={themes}
                        onChange={setThemes}
                      />
                      <Area
                        title="Registros de campo"
                        value={fieldNotes}
                        onChange={setFieldNotes}
                      />
                      <Area
                        title="Resultados preliminares"
                        value={results}
                        onChange={setResults}
                      />
                      <label className={label}>
                        Participação
                        <select
                          aria-label="Participação"
                          className={control}
                          value={activityDraft.participationKind}
                          onChange={(e) => {
                            const v = e.target
                              .value as FecFieldDraft["participationKind"];
                            setActivityDraft((d) => ({
                              ...d,
                              participationKind: v,
                              participantCount:
                                v === "not_recorded" ? "" : d.participantCount,
                            }));
                          }}
                        >
                          <option value="not_recorded">Não registrada</option>
                          <option value="recorded">
                            Participações registradas
                          </option>
                          <option value="estimated">
                            Participações estimadas
                          </option>
                        </select>
                      </label>
                      <label className={label}>
                        Quantidade — não pessoas únicas
                        <input
                          type="number"
                          min={0}
                          step={1}
                          disabled={
                            activityDraft.participationKind === "not_recorded"
                          }
                          className={control}
                          value={activityDraft.participantCount}
                          onChange={(e) =>
                            setField("participantCount", e.target.value)
                          }
                        />
                      </label>
                      {(
                        [
                          "participantAccounts",
                          "teamObservations",
                          "externalSources",
                          "mapMethod",
                          "mapLegend",
                          "limits",
                          "nextSteps",
                        ] as const
                      ).map((key, i) => (
                        <Area
                          key={key}
                          title={
                            [
                              "Relatos comunitários sem identificação",
                              "Observações diretas",
                              "Referências científicas e documentais",
                              "Método de construção cartográfica",
                              "Legenda da oficina cartográfica",
                              "Dificuldades e limites",
                              "Encaminhamentos e próximas atividades",
                            ][i]
                          }
                          value={activityDraft[key]}
                          onChange={(v) => setField(key, v)}
                        />
                      ))}
                      <button className={button} disabled={busy}>
                        Salvar atividade
                      </button>
                    </form>
                  )}
                </Box>
              )}
              {tab === "knowledge" && cycle && (
                <Box title="Acervo técnico com fontes e versões">
                  <p className="mb-4 text-sm leading-6">
                    Relatos, observações e referências são evidências distintas.
                    Registre os limites da interpretação. Produtos aprovados
                    ficam preservados; atualizações usam nova versão.
                  </p>
                  {records.map((r) => (
                    <article key={r.id} className="mb-4 rounded-xl border p-4">
                      <h3 className="font-semibold">
                        {knowledgeLabels[r.kind]} · {r.title} · v{r.version}
                      </h3>
                      <p className="mt-2 text-sm">
                        Revisão: {r.status} · Validação comunitária:{" "}
                        {r.community_status}
                        {r.kind === "proposal"
                          ? " · Encaminhamento: " + r.proposal_status
                          : ""}
                      </p>
                      <p className="mt-2 break-words text-xs">
                        Fontes:{" "}
                        {[
                          ...r.source_activity_ids,
                          ...r.source_record_ids,
                        ].join(", ")}
                      </p>
                      <details className="mt-3">
                        <summary className="cursor-pointer text-sm">
                          Ler conteúdo
                        </summary>
                        {Object.entries(r.content).map(([k, v]) => (
                          <p
                            key={k}
                            className="mt-2 whitespace-pre-wrap break-words text-sm"
                          >
                            <strong>{knowledgeFields[r.kind][k] ?? k}:</strong>{" "}
                            {v}
                          </p>
                        ))}
                      </details>
                      {decisions("knowledge", r.id, r.status)}
                      {own && ["draft", "needs_changes"].includes(r.status) && (
                        <button
                          type="button"
                          className={button + " mt-2"}
                          onClick={() => editKnowledge(r)}
                        >
                          Editar registro
                        </button>
                      )}
                      {own &&
                        r.status === "approved" &&
                        !records.some(
                          (v) =>
                            v.record_key === r.record_key &&
                            v.version > r.version,
                        ) && (
                          <button
                            type="button"
                            className={button + " mt-2"}
                            onClick={() => editKnowledge(r, true)}
                          >
                            Preparar nova versão
                          </button>
                        )}
                      {files
                        .filter((f) => f.record_id === r.id)
                        .map((f) => (
                          <button
                            type="button"
                            key={f.id}
                            className="mt-2 block text-left text-sm text-semear-green underline"
                            onClick={() =>
                              void run(async () => {
                                const signed = await api<{ url: string }>(
                                  "files?id=" + f.id,
                                );
                                window.open(
                                  signed.url,
                                  "_blank",
                                  "noopener,noreferrer",
                                );
                              })
                            }
                          >
                            {f.title} · abrir anexo privado
                          </button>
                        ))}
                      {own && ["draft", "needs_changes"].includes(r.status) && (
                        <label className={label + " mt-3"}>
                          Anexar arquivo privado (PDF, DOCX, PNG ou JPEG; até 10
                          MB)
                          <input
                            type="file"
                            className={control}
                            accept=".pdf,.docx,.png,.jpg,.jpeg"
                            disabled={busy}
                            onChange={(e) => {
                              const f = e.target.files?.[0];
                              if (!f) return;
                              void run(async () => {
                                const storage =
                                  createBrowserSupabaseClient()?.storage;
                                if (!storage)
                                  throw new Error(
                                    "Armazenamento indisponível.",
                                  );
                                const metadata = await uploadFecFile(
                                  storage,
                                  r.id,
                                  f,
                                );
                                await send("files", metadata);
                                await refreshSources(cycleId);
                                setMessage("Arquivo privado vinculado.");
                              });
                              e.target.value = "";
                            }}
                          />
                        </label>
                      )}
                    </article>
                  ))}
                  {own && (
                    <form className="space-y-4" onSubmit={saveKnowledge}>
                      <h3 className="font-semibold">
                        {knowledge.previousId && !knowledge.id
                          ? "Nova versão"
                          : knowledge.id
                            ? "Editar registro"
                            : "Novo registro técnico"}
                      </h3>
                      <label className={label}>
                        Tipo
                        <select
                          className={control}
                          disabled={!!knowledge.id || !!knowledge.previousId}
                          value={knowledge.kind}
                          onChange={(e) =>
                            setKnowledge({
                              ...blankKnowledge(),
                              kind: e.target.value as KnowledgeKind,
                            })
                          }
                        >
                          {knowledgeKinds.map((k) => (
                            <option key={k} value={k}>
                              {knowledgeLabels[k]}
                            </option>
                          ))}
                        </select>
                      </label>
                      <label className={label}>
                        Título
                        <input
                          required
                          maxLength={180}
                          className={control}
                          value={knowledge.title}
                          onChange={(e) =>
                            setKnowledge((k) => ({
                              ...k,
                              title: e.target.value,
                            }))
                          }
                        />
                      </label>
                      {Object.entries(knowledgeFields[knowledge.kind]).map(
                        ([key, title]) => (
                          <Area
                            key={key}
                            title={title}
                            value={knowledge.content[key] ?? ""}
                            onChange={(value) =>
                              setKnowledge((k) => ({
                                ...k,
                                content: { ...k.content, [key]: value },
                              }))
                            }
                          />
                        ),
                      )}
                      <fieldset className="space-y-2 rounded-xl border p-3">
                        <legend className="px-1 text-sm font-semibold">
                          Atividades de origem
                        </legend>
                        {activities.map((a) => (
                          <label
                            className="flex items-start gap-2 text-sm"
                            key={a.id}
                          >
                            <input
                              type="checkbox"
                              className="mt-1"
                              checked={knowledge.sourceActivityIds.includes(
                                a.id,
                              )}
                              onChange={(e) =>
                                knowledgeSourceToggle(
                                  "sourceActivityIds",
                                  a.id,
                                  e.target.checked,
                                )
                              }
                            />
                            {a.activity_date} · {a.objective} ({a.status})
                          </label>
                        ))}
                        {!activities.length && (
                          <p className="text-sm">
                            Registre a atividade de origem primeiro.
                          </p>
                        )}
                      </fieldset>
                      <fieldset className="space-y-2 rounded-xl border p-3">
                        <legend className="px-1 text-sm font-semibold">
                          Evidências e produtos de origem aprovados
                        </legend>
                        {records
                          .filter(
                            (r) =>
                              r.status === "approved" && r.id !== knowledge.id,
                          )
                          .map((r) => (
                            <label
                              className="flex items-start gap-2 text-sm"
                              key={r.id}
                            >
                              <input
                                type="checkbox"
                                className="mt-1"
                                checked={knowledge.sourceRecordIds.includes(
                                  r.id,
                                )}
                                onChange={(e) =>
                                  knowledgeSourceToggle(
                                    "sourceRecordIds",
                                    r.id,
                                    e.target.checked,
                                  )
                                }
                              />
                              {r.title} · v{r.version}
                            </label>
                          ))}
                      </fieldset>
                      <label className={label}>
                        Situação de validação comunitária
                        <select
                          className={control}
                          value={knowledge.communityStatus}
                          onChange={(e) =>
                            setKnowledge((k) => ({
                              ...k,
                              communityStatus: e.target
                                .value as FecKnowledgeRow["community_status"],
                            }))
                          }
                        >
                          {[
                            ["not_requested", "Não solicitada"],
                            ["pending", "Pendente"],
                            ["partial", "Parcial"],
                            ["confirmed", "Registrada como confirmada"],
                            ["divergent", "Com divergências"],
                          ].map(([v, t]) => (
                            <option key={v} value={v}>
                              {t}
                            </option>
                          ))}
                        </select>
                      </label>
                      <Area
                        title="Contexto e registro da devolutiva ou validação"
                        value={knowledge.communityNotes}
                        onChange={(v) =>
                          setKnowledge((k) => ({ ...k, communityNotes: v }))
                        }
                      />
                      {knowledge.kind === "proposal" && (
                        <label className={label}>
                          Situação do encaminhamento
                          <select
                            className={control}
                            value={knowledge.proposalStatus}
                            onChange={(e) =>
                              setKnowledge((k) => ({
                                ...k,
                                proposalStatus: e.target
                                  .value as FecKnowledgeRow["proposal_status"],
                              }))
                            }
                          >
                            {[
                              ["recorded", "Formulada"],
                              ["forwarded", "Encaminhada"],
                              ["answered", "Respondida"],
                              [
                                "implemented",
                                "Providência registrada como executada",
                              ],
                              ["closed", "Encerrada"],
                            ].map(([v, t]) => (
                              <option key={v} value={v}>
                                {t}
                              </option>
                            ))}
                          </select>
                        </label>
                      )}
                      <button disabled={busy} className={button}>
                        Salvar registro técnico
                      </button>
                      <button
                        type="button"
                        className={button + " ml-2"}
                        onClick={() => setKnowledge(blankKnowledge())}
                      >
                        Limpar formulário
                      </button>
                    </form>
                  )}
                </Box>
              )}
              {tab === "monthly" && cycle && (
                <FecMonthlyWorkspace
                  key={cycle.engagement_id + ":" + cycle.owner_id}
                  engagementId={cycle.engagement_id}
                  professionalId={cycle.owner_id}
                  userId={catalog.userId}
                  canReview={supervisor}
                  onDirtyChange={setMonthlyDirty}
                />
              )}
              {tab === "territory" && (
                <Box title="Contribuições por território">
                  <label className={label}>
                    Território oficial
                    <select
                      aria-label="Território oficial"
                      className={control}
                      value={territoryId}
                      onChange={(e) => {
                        setTerritoryId(e.target.value);
                        setTerritorial(null);
                      }}
                    >
                      <option value="">Escolha o território</option>
                      {catalog.neighborhoods.map((n) => (
                        <option key={n.id} value={n.id}>
                          {n.name}
                        </option>
                      ))}
                    </select>
                  </label>
                  <button
                    type="button"
                    className={button + " mt-3"}
                    disabled={busy || !territoryId}
                    onClick={() =>
                      void run(async () =>
                        setTerritorial(
                          await api(
                            "territories?neighborhoodId=" + territoryId,
                          ),
                        ),
                      )
                    }
                  >
                    Consultar contribuições autorizadas
                  </button>
                  {territorial && (
                    <div className="mt-4 space-y-3 text-sm">
                      <p>{territorial.note}</p>
                      <p>
                        {territorial.index.eventCount} eventos com identidade
                        distinta; {territorial.index.fecContributionIds.length}{" "}
                        contribuições FEC aprovadas.
                      </p>
                      <h3 className="font-semibold">
                        Ações oficiais do projeto
                      </h3>
                      {territorial.officialActions.map((a) => (
                        <Link
                          className="block underline"
                          href={"/acoes/" + a.id}
                          key={a.id}
                        >
                          {a.title}
                        </Link>
                      ))}
                      <h3 className="font-semibold">Ciclos da frente FEC</h3>
                      {territorial.cycles.map((c) => (
                        <button
                          type="button"
                          className={button}
                          key={c.id}
                          onClick={() => {
                            setCycleId(c.id);
                            setTab("cycles");
                          }}
                        >
                          {c.title} · responsável {c.owner_id}
                        </button>
                      ))}
                      <h3 className="font-semibold">Produtos e evidências</h3>
                      {territorial.knowledge.map((r) => (
                        <p key={r.id}>
                          {knowledgeLabels[r.kind]}: {r.title} · v{r.version} ·{" "}
                          {r.status}
                        </p>
                      ))}
                    </div>
                  )}
                </Box>
              )}
              {!!history.length && cycle && (
                <Box title="Histórico do ciclo e dos produtos">
                  <ol className="space-y-3 text-sm">
                    {history.map((h) => (
                      <li key={h.id} className="break-words border-b pb-2">
                        {new Date(h.decided_at).toLocaleString("pt-BR")} ·{" "}
                        {h.decision} · responsável {h.reviewer_id}
                        {h.reason ? " · " + h.reason : ""}
                      </li>
                    ))}
                  </ol>
                </Box>
              )}
            </>
          )}
        </>
      )}
    </div>
  );
}
