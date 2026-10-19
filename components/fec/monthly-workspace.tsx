"use client";

import { useEffect, useState, type Dispatch, type SetStateAction } from "react";
import type {
  FecMonthlyBlock,
  FecMonthlyView,
  FecMonthlyStatus,
} from "@/lib/fec-monthly-versions";

type Version = {
  id: string;
  version: number;
  status: FecMonthlyStatus;
  revision: number;
  updated_at: string;
};
const statusLabels: Record<string, string> = {
  draft: "Rascunho",
  submitted: "Enviado",
  in_review: "Em revisão",
  needs_changes: "Ajustes solicitados",
  approved: "Aprovado",
  created: "Criado",
  saved: "Texto salvo",
  sources_refreshed: "Fontes recompostas",
  review_started: "Revisão iniciada",
  changes_requested: "Ajustes solicitados",
};
const field =
  "mt-1 w-full rounded-xl border border-stone-300 bg-white p-3 text-sm disabled:bg-stone-100";
const button =
  "rounded-xl border border-stone-300 bg-white px-4 py-2 text-sm font-semibold text-semear-green disabled:opacity-50";
const checks = [
  ["sources", "Conferi as fontes congeladas e seus vínculos"],
  ["methodology", "Conferi metodologia, limites e unidades dos indicadores"],
  ["privacy", "Conferi os cuidados de privacidade"],
  ["deliverables", "Conferi as entregas e os anexos relacionados"],
] as const;
async function request<T>(suffix: string, options?: RequestInit): Promise<T> {
  const response = await fetch("/api/fec/monthly/reports" + suffix, {
    ...options,
    cache: "no-store",
  });
  const body = await response.json();
  if (!response.ok)
    throw new Error(body.error ?? "Não foi possível consultar o fechamento.");
  return body as T;
}

export function FecMonthlyWorkspace({
  engagementId,
  professionalId,
  userId,
  canReview,
  onDirtyChange,
}: {
  engagementId: string;
  professionalId: string;
  userId: string;
  canReview: boolean;
  onDirtyChange: Dispatch<SetStateAction<boolean>>;
}) {
  const [month, setMonth] = useState(() =>
    new Date()
      .toLocaleDateString("sv-SE", { timeZone: "America/Sao_Paulo" })
      .slice(0, 7),
  );
  const [versions, setVersions] = useState<Version[]>([]),
    [view, setView] = useState<FecMonthlyView | null>(null);
  const [blocks, setBlocks] = useState<FecMonthlyBlock[]>([]),
    [noActivityReason, setNoActivityReason] = useState("");
  const [busy, setBusy] = useState(false),
    [message, setMessage] = useState(""),
    [dirty, setDirty] = useState(false),
    [reviewReason, setReviewReason] = useState(""),
    [checklist, setChecklist] = useState<Record<string, boolean>>({});
  const own = professionalId === userId;
  const editable =
    !!view && own && ["draft", "needs_changes"].includes(view.record.status);
  const query = `?month=${month}&engagementId=${engagementId}&professionalId=${professionalId}`;
  function accept(value: FecMonthlyView) {
    setView(value);
    setBlocks(
      value.computed.blocks.map((b) => ({ ...b, sourceIds: [...b.sourceIds] })),
    );
    setNoActivityReason(value.record.no_activity_reason);
    setDirty(false);
    setReviewReason("");
    setChecklist({});
  }
  useEffect(() => {
    onDirtyChange(dirty);
    return () => onDirtyChange(false);
  }, [dirty, onDirtyChange]);
  useEffect(() => {
    if (!dirty) return;
    const guard = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", guard);
    return () => window.removeEventListener("beforeunload", guard);
  }, [dirty]);
  useEffect(() => {
    const controller = new AbortController();
    let alive = true;
    setBusy(true);
    setView(null);
    setVersions([]);
    setMessage("");
    setDirty(false);
    request<{ versions: Version[] }>(query, { signal: controller.signal })
      .then(async (data) => {
        if (!alive) return;
        setVersions(data.versions);
        if (data.versions[0]) {
          const detail = await request<FecMonthlyView>(
            "?id=" + data.versions[0].id,
            { signal: controller.signal },
          );
          if (alive) accept(detail);
        }
      })
      .catch((e) => {
        if (alive && e.name !== "AbortError") setMessage(e.message);
      })
      .finally(() => {
        if (alive) setBusy(false);
      });
    return () => {
      alive = false;
      controller.abort();
    };
  }, [query]);
  function discardConfirmed() {
    return (
      !dirty ||
      window.confirm(
        "Há alterações ainda não salvas neste relatório. Descartar essas alterações?",
      )
    );
  }
  async function perform(work: () => Promise<void>) {
    if (busy) return;
    setBusy(true);
    setMessage("");
    try {
      await work();
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Não foi possível concluir.");
    } finally {
      setBusy(false);
    }
  }
  async function command(body: object) {
    const value = await request<FecMonthlyView>("", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    accept(value);
    const list = await request<{ versions: Version[] }>(query);
    setVersions(list.versions);
    return value;
  }
  async function transition(decision: string) {
    if (!view) return;
    await perform(async () => {
      await command({
        action: "transition",
        id: view.record.id,
        revision: view.record.revision,
        decision,
        reason: reviewReason,
        checklist,
      });
      setMessage("Situação registrada no histórico.");
    });
  }
  function download() {
    if (!view) return;
    const url = URL.createObjectURL(
      new Blob([view.markdown], { type: "text/markdown;charset=utf-8" }),
    );
    const a = document.createElement("a");
    a.href = url;
    a.download = `relatorio-fec-${month}-v${view.record.version}.md`;
    a.click();
    URL.revokeObjectURL(url);
  }
  return (
    <section
      className="mt-6 rounded-2xl border border-stone-200 bg-white p-4 sm:p-6"
      aria-labelledby="fec-monthly-title"
    >
      <h2
        id="fec-monthly-title"
        className="text-xl font-semibold text-semear-green"
      >
        Relatório técnico mensal individual FEC
      </h2>
      <p className="mt-3 text-sm leading-6">
        Cada versão preserva suas fontes e indicadores. A aprovação é técnica e
        não substitui o aceite financeiro da FEC ou a curadoria pública do
        projeto.
      </p>
      <label className="mt-4 block text-sm font-semibold">
        Mês de referência
        <input
          type="month"
          className={field}
          value={month}
          disabled={busy}
          onChange={(e) => {
            if (discardConfirmed()) setMonth(e.target.value);
          }}
        />
      </label>
      <div role="status" aria-live="polite" className="mt-3 min-h-6 text-sm">
        {busy ? "Consultando ou salvando o fechamento…" : message}
      </div>
      {!!versions.length && (
        <label className="mt-3 block text-sm font-semibold">
          Versão do relatório
          <select
            aria-label="Versão do relatório"
            className={field}
            value={view?.record.id ?? ""}
            disabled={busy}
            onChange={(e) => {
              if (!discardConfirmed()) return;
              void perform(async () =>
                accept(await request<FecMonthlyView>("?id=" + e.target.value)),
              );
            }}
          >
            {versions.map((v) => (
              <option key={v.id} value={v.id}>
                Versão {v.version} · {statusLabels[v.status]}
              </option>
            ))}
          </select>
        </label>
      )}
      {!versions.length && own && (
        <button
          type="button"
          className={button + " mt-3"}
          disabled={busy}
          onClick={() =>
            void perform(async () => {
              await command({ action: "open", engagementId, month });
              setMessage(
                "Rascunho criado com fontes congeladas. Confira o texto e salve antes de enviar.",
              );
            })
          }
        >
          Criar fechamento do mês
        </button>
      )}
      {!versions.length && !own && !busy && (
        <p className="mt-4 text-sm">
          O profissional ainda não abriu um fechamento para este mês.
        </p>
      )}
      {view && (
        <>
          <div className="mt-4 rounded-xl bg-stone-50 p-4 text-sm">
            <p className="font-semibold">
              Versão {view.record.version} · {statusLabels[view.record.status]}
            </p>
            <p className="mt-2">
              Texto {view.record.blocks.length ? "salvo" : "ainda não salvo"}
              {dirty ? " · há alterações locais pendentes" : ""}.
            </p>
            <p className="mt-2 break-all text-xs">
              Referência das fontes: {view.record.source_hash}
            </p>
            {view.record.review_notes && (
              <p className="mt-2 whitespace-pre-wrap">
                Observação da supervisão: {view.record.review_notes}
              </p>
            )}
          </div>
          {view.freshness.stale && (
            <p
              role="alert"
              className="mt-4 rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm"
            >
              As fontes atuais mudaram.{" "}
              {view.record.status === "approved"
                ? "Esta versão histórica permanece preservada. Uma atualização deve usar nova versão."
                : "Envio e aprovação ficam bloqueados até o executor recompor e conferir o fechamento."}
            </p>
          )}
          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              ["Atividades aprovadas", view.computed.metrics.activityCount],
              ["Oficinas", view.computed.metrics.workshopCount],
              ["Mapas novos", view.computed.metrics.newMapCount],
              ["Versões de mapas", view.computed.metrics.mapRevisions],
            ].map(([title, n]) => (
              <div className="rounded-xl border p-3" key={String(title)}>
                <p className="text-xs text-stone-600">{title}</p>
                <p className="mt-1 text-xl font-semibold">{n}</p>
              </div>
            ))}
          </div>
          <p className="mt-3 text-sm">
            Participações registradas:{" "}
            {view.computed.metrics.recordedParticipations}; estimadas:{" "}
            {view.computed.metrics.estimatedParticipations}. Pessoas únicas não
            foram apuradas.
          </p>
          {!!view.computed.warnings.length && (
            <ul className="my-4 list-disc space-y-2 pl-5 text-sm">
              {view.computed.warnings.map((w) => (
                <li key={w}>{w}</li>
              ))}
            </ul>
          )}
          <div className="mt-5 space-y-3">
            {blocks.map((b, i) => (
              <details
                key={b.title}
                open={i === 0}
                className="rounded-xl border p-4"
              >
                <summary className="cursor-pointer text-sm font-semibold text-semear-green">
                  {b.title}
                </summary>
                {editable ? (
                  <textarea
                    aria-label={b.title}
                    className={field}
                    maxLength={10000}
                    rows={5}
                    disabled={busy}
                    value={b.text}
                    onChange={(e) => {
                      const text = e.target.value;
                      setBlocks((old) =>
                        old.map((value, j) =>
                          i === j ? { ...value, text } : value,
                        ),
                      );
                      setDirty(true);
                    }}
                  />
                ) : (
                  <p className="mt-3 whitespace-pre-wrap break-words text-sm leading-6">
                    {b.text}
                  </p>
                )}
                <p className="mt-2 break-words text-xs text-stone-500">
                  Fontes:{" "}
                  {b.sourceIds.join(", ") ||
                    "sem referência específica nesta seção"}
                </p>
              </details>
            ))}
          </div>
          <label className="mt-4 block text-sm font-semibold">
            Justificativa de mês sem registros aprovados
            <textarea
              className={field}
              rows={3}
              maxLength={5000}
              disabled={!editable || busy}
              value={noActivityReason}
              onChange={(e) => {
                setNoActivityReason(e.target.value);
                setDirty(true);
              }}
            />
          </label>
          <div className="mt-4 flex flex-wrap gap-3">
            {editable && (
              <>
                <button
                  type="button"
                  className={button}
                  disabled={busy}
                  onClick={() =>
                    void perform(async () => {
                      await command({
                        action: "save",
                        id: view.record.id,
                        revision: view.record.revision,
                        blocks,
                        noActivityReason,
                      });
                      setMessage(
                        "Texto salvo na versão atual. As fontes e os indicadores foram preservados.",
                      );
                    })
                  }
                >
                  Salvar texto do fechamento
                </button>
                <button
                  type="button"
                  className={button}
                  disabled={
                    busy ||
                    dirty ||
                    !view.record.blocks.length ||
                    view.freshness.stale
                  }
                  onClick={() => void transition("submitted")}
                >
                  Enviar fechamento para revisão
                </button>
                <button
                  type="button"
                  className={button}
                  disabled={busy}
                  onClick={() => {
                    if (
                      !window.confirm(
                        "Recompor as fontes substituirá os textos editados desta versão. Deseja continuar?",
                      )
                    )
                      return;
                    void perform(async () => {
                      await command({
                        action: "refresh",
                        id: view.record.id,
                        revision: view.record.revision,
                        confirmReplace: true,
                      });
                      setMessage(
                        "Fontes recompostas. Confira e salve o texto antes de reenviar.",
                      );
                    });
                  }}
                >
                  Recompor fontes e texto
                </button>
              </>
            )}
            {own &&
              view.record.status === "approved" &&
              versions[0]?.id === view.record.id && (
                <button
                  type="button"
                  className={button}
                  disabled={busy}
                  onClick={() =>
                    void perform(async () => {
                      await command({
                        action: "open",
                        engagementId,
                        month,
                        previousId: view.record.id,
                      });
                      setMessage(
                        "Nova versão criada; a aprovação anterior foi preservada.",
                      );
                    })
                  }
                >
                  Criar nova versão do fechamento
                </button>
              )}
            <button
              type="button"
              className={button}
              disabled={busy || dirty}
              onClick={download}
            >
              Baixar versão em Markdown
            </button>
          </div>
          {canReview && !own && view.record.status === "submitted" && (
            <button
              type="button"
              className={button + " mt-4"}
              disabled={busy}
              onClick={() => void transition("in_review")}
            >
              Iniciar revisão mensal
            </button>
          )}
          {canReview && !own && view.record.status === "in_review" && (
            <fieldset className="mt-6 space-y-3 rounded-xl border p-4">
              <legend className="px-1 font-semibold">
                Revisão técnica mensal
              </legend>
              {checks.map(([k, title]) => (
                <label className="flex items-start gap-2 text-sm" key={k}>
                  <input
                    type="checkbox"
                    className="mt-1"
                    disabled={busy}
                    checked={checklist[k] ?? false}
                    onChange={(e) =>
                      setChecklist((c) => ({ ...c, [k]: e.target.checked }))
                    }
                  />
                  {title}
                </label>
              ))}
              <label className="block text-sm font-semibold">
                Observação da revisão mensal
                <textarea
                  className={field}
                  rows={3}
                  maxLength={5000}
                  value={reviewReason}
                  onChange={(e) => setReviewReason(e.target.value)}
                  disabled={busy}
                />
              </label>
              <div className="flex flex-wrap gap-3">
                <button
                  type="button"
                  className={button}
                  disabled={
                    busy ||
                    view.freshness.stale ||
                    !checks.every(([k]) => checklist[k])
                  }
                  onClick={() => void transition("approved")}
                >
                  Aprovar fechamento mensal
                </button>
                <button
                  type="button"
                  className={button}
                  disabled={busy || !reviewReason.trim()}
                  onClick={() => void transition("needs_changes")}
                >
                  Solicitar ajustes no fechamento
                </button>
              </div>
            </fieldset>
          )}
          <details className="mt-6 rounded-xl border p-4">
            <summary className="cursor-pointer font-semibold text-semear-green">
              Consultar fontes congeladas
            </summary>
            <div className="mt-3 space-y-3 text-sm">
              {view.record.snapshot.cycles.map((c) => (
                <p key={c.id} className="break-words">
                  <strong>{c.title}</strong> · ciclo {c.id}
                  <br />
                  {c.guiding_question}
                </p>
              ))}
              {view.record.snapshot.activities.map((a) => (
                <p key={a.id} className="break-words">
                  {a.activity_date.slice(0, 10)} · {a.objective} · {a.status}
                  <br />
                  Atividade {a.id}
                </p>
              ))}
              {view.record.snapshot.records.map((r) => (
                <p key={r.id} className="break-words">
                  {r.title} · versão {r.version} · produto {r.id}
                </p>
              ))}
              {view.record.snapshot.files.map((f) => (
                <p key={f.id} className="break-words">
                  Anexo privado: {f.title} · {f.id}
                </p>
              ))}
            </div>
          </details>
          <details className="mt-4 rounded-xl border p-4">
            <summary className="cursor-pointer font-semibold text-semear-green">
              Histórico do fechamento mensal
            </summary>
            <ol className="mt-3 space-y-3 text-sm">
              {view.history.map((h) => (
                <li key={h.id} className="break-words border-b pb-2">
                  {new Date(h.occurred_at).toLocaleString("pt-BR")} ·{" "}
                  {statusLabels[h.event] ?? h.event} · responsável {h.actor_id}
                  {h.reason ? " · " + h.reason : ""}
                </li>
              ))}
            </ol>
          </details>
        </>
      )}
    </section>
  );
}
