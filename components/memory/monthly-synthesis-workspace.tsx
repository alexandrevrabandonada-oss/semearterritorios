"use client";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";
import type { TeamMember } from "@/lib/database.types";
import type { MonthlySynthesis, SynthesisBlock } from "@/lib/monthly-synthesis";
import { activityFields, workFronts } from "@/lib/weekly-activities";
const control =
  "mt-1 w-full rounded-xl border border-stone-300 bg-white p-3 disabled:bg-stone-100";
const button =
  "rounded-full border border-semear-green px-4 py-2 text-sm font-semibold text-semear-green disabled:opacity-40";
const checks = {
  sources: "Conferi as fontes e suas datas",
  methodology: "Conferi unidades, divergências e limites metodológicos",
  privacy: "Conferi a privacidade das fontes e dos textos",
  public_version:
    "Conferi a versão pública ou sua não aplicação ao recorte individual",
};
const metricLabels = {
  actions: "Ações realizadas",
  planned_actions: "Planejadas/reprogramadas",
  cancelled_actions: "Canceladas",
  workshops: "Oficinas aprovadas",
  estimated_participations: "Participações estimadas em oficinas",
  workshops_without_estimate: "Oficinas sem estimativa",
  individual_listenings: "Escutas individuais revisadas",
  round_reports: "Relatos de roda revisados",
  products: "Produtos distintos",
  approved_weeklies: "Semanais aprovados",
  pending_weeklies: "Semanais pendentes",
};
export function MonthlySynthesisWorkspace({
  month: initialMonth,
  professional = false,
  synthesisId,
}: {
  month?: string;
  professional?: boolean;
  synthesisId?: string;
}) {
  const client = useMemo(() => createBrowserSupabaseClient(), []);
  const router = useRouter();
  const [month, setMonth] = useState(
    initialMonth ??
      new Intl.DateTimeFormat("sv-SE", {
        timeZone: "America/Sao_Paulo",
        year: "numeric",
        month: "2-digit",
      }).format(new Date()),
  );
  const [scope, setScope] = useState(professional ? "" : "project"),
    [members, setMembers] = useState<TeamMember[]>([]),
    [reviewer, setReviewer] = useState(false),
    [ready, setReady] = useState(false);
  const [row, setRow] = useState<MonthlySynthesis | null>(null),
    [versions, setVersions] = useState<MonthlySynthesis[]>([]),
    [edited, setEdited] = useState<SynthesisBlock[]>([]),
    [publicBlocks, setPublicBlocks] = useState<SynthesisBlock[]>([]),
    [selected, setSelected] = useState<number[]>([]),
    [checklist, setChecklist] = useState<Record<string, boolean>>({}),
    [note, setNote] = useState("");
  const [error, setError] = useState(""),
    [message, setMessage] = useState(""),
    [busy, setBusy] = useState(false),
    [printPublic, setPrintPublic] = useState(false);
  const [history, setHistory] = useState<
    { id: string; actor_id: string; event: string; created_at: string }[]
  >([]);
  const historyId = row?.id,
    historyVersion = row?.updated_at;
  useEffect(() => {
    let active = true;
    if (!client || !historyId) return;
    void client
      .from("monthly_synthesis_history")
      .select("id,actor_id,event,created_at")
      .eq("synthesis_id", historyId)
      .order("created_at")
      .then((result) => {
        if (active) {
          if (result.error) setError(result.error.message);
          else setHistory(result.data ?? []);
        }
      });
    return () => {
      active = false;
    };
  }, [client, historyId, historyVersion]);
  function apply(r: MonthlySynthesis) {
    setRow(r);
    setEdited(r.edited_blocks);
    setPublicBlocks(r.public_blocks);
    setChecklist(r.review_checklist);
    setNote(r.review_note);
    setSelected([]);
  }
  useEffect(() => {
    let active = true;
    async function load() {
      if (!client) return;
      try {
        const auth = await client.auth.getUser();
        if (!auth.data.user) throw new Error("Entre novamente.");
        const [p, m, r] = await Promise.all([
          client
            .from("profiles")
            .select("role")
            .eq("id", auth.data.user.id)
            .single(),
          client.from("team_members").select("*").order("display_name"),
          synthesisId
            ? client
                .from("monthly_syntheses")
                .select("*")
                .eq("id", synthesisId)
                .single()
            : Promise.resolve({ data: null, error: null }),
        ]);
        if (p.error || m.error || r.error)
          throw new Error((p.error ?? m.error ?? r.error)!.message);
        if (!active) return;
        const canReview = ["admin", "coordenacao"].includes(p.data?.role ?? "");
        setReviewer(canReview);
        const available = (m.data ?? []).filter(
          (member) => canReview || member.profile_id === auth.data.user!.id,
        );
        setMembers(available);
        if (r.data) {
          setMonth(r.data.reference_month.slice(0, 7));
          setScope(r.data.scope_key);
          apply(r.data);
        } else if (!canReview) {
          setScope(available.find((member) => member.active)?.id ?? "");
        }
        setReady(true);
      } catch (e) {
        if (active)
          setError(e instanceof Error ? e.message : "Falha ao carregar.");
      }
    }
    void load();
    return () => {
      active = false;
    };
  }, [client, synthesisId]);
  useEffect(() => {
    let active = true;
    async function loadVersions() {
      if (!client || !ready || !scope) return;
      const result = await client
        .from("monthly_syntheses")
        .select("*")
        .eq("reference_month", `${month}-01`)
        .eq("scope_key", scope)
        .order("version", { ascending: false });
      if (!active) return;
      if (result.error) {
        setError(result.error.message);
        return;
      }
      setVersions(result.data ?? []);
      if (!synthesisId) {
        if (reviewer) {
          setBusy(true);
          try {
            const response = await fetch("/api/memoria/sinteses", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ operation: "build", month, scope }),
            });
            const data = await response.json();
            if (!response.ok) throw new Error(data.error);
            if (active) apply(data.synthesis);
          } catch (e) {
            if (active)
              setError(e instanceof Error ? e.message : "Falha ao consolidar.");
          } finally {
            if (active) setBusy(false);
          }
        } else if (result.data?.[0]) apply(result.data[0]);
        else setRow(null);
      }
    }
    void loadVersions();
    return () => {
      active = false;
    };
  }, [client, month, scope, ready, reviewer, synthesisId]);
  async function operate(
    operation: string,
    extra: Record<string, unknown> = {},
  ) {
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const response = await fetch("/api/memoria/sinteses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          operation,
          id: row?.id,
          updated_at: row?.updated_at,
          month,
          scope,
          edited_blocks: edited,
          public_blocks: publicBlocks,
          review_checklist: checklist,
          review_note: note,
          ...extra,
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      if (operation === "ai") {
        setRow(data.synthesis);
        setMessage(
          "Rascunho assistido disponível. Seus textos editados foram preservados; confira as fontes antes de aplicar.",
        );
      } else {
        apply(data.synthesis);
        if (operation === "build" && extra.force)
          router.replace(`/memoria/sinteses/${data.synthesis.id}`);
      }
      if (operation === "sync")
        setMessage(
          "Pacote recebido pelo site para revisão editorial. Isso não significa publicação.",
        );
      else if (operation === "approve")
        setMessage(
          "Síntese aprovada e congelada. Novas alterações exigem nova versão.",
        );
    } catch (e) {
      setError(e instanceof Error ? e.message : "Operação não concluída.");
    } finally {
      setBusy(false);
    }
  }
  const editable = reviewer && row?.status === "draft";
  const title =
    scope === "project"
      ? "Síntese institucional do Semear"
      : `Fechamento mensal — ${members.find((m) => m.id === scope)?.display_name ?? "profissional"}`;
  function editBlock(
    index: number,
    patch: Partial<SynthesisBlock>,
    isPublic = false,
  ) {
    const setter = isPublic ? setPublicBlocks : setEdited;
    setter((current) =>
      current.map((b, i) => (i === index ? { ...b, ...patch } : b)),
    );
  }
  return (
    <section className="space-y-5">
      <div className="no-print space-y-5 rounded-2xl border bg-white p-5">
        <h2 className="text-2xl font-semibold text-semear-green">{title}</h2>
        <p>
          O fechamento reúne registros aprovados e atividades oficiais. A
          interpretação é revisável e mantém referência às fontes. O
          profissional não precisa redigitar um documento mensal.
        </p>
        <div className="grid gap-4 md:grid-cols-2">
          <label>
            Mês da síntese
            <input
              disabled={Boolean(synthesisId) || busy}
              type="month"
              className={control}
              value={month}
              onChange={(e) => {
                setRow(null);
                setMonth(e.target.value);
              }}
            />
          </label>
          <label>
            Recorte
            <select
              disabled={Boolean(synthesisId) || busy}
              className={control}
              value={scope}
              onChange={(e) => {
                setRow(null);
                setScope(e.target.value);
              }}
            >
              {reviewer && !professional ? (
                <option value="project">Projeto inteiro</option>
              ) : null}
              <option value="">Selecione o profissional</option>
              {members.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.display_name}
                </option>
              ))}
            </select>
          </label>
        </div>
        {error ? (
          <p role="alert" className="text-red-700">
            {error}
          </p>
        ) : null}
        {message ? <p role="status">{message}</p> : null}
        {busy ? <p role="status">Processando…</p> : null}
        {!ready && !error ? <p>Carregando permissões…</p> : null}
        {versions.length ? (
          <div className="flex flex-wrap gap-3">
            {versions.map((v) => (
              <Link
                key={v.id}
                className="underline"
                href={`/memoria/sinteses/${v.id}`}
              >
                Versão {v.version} ·{" "}
                {v.status === "approved" ? "Aprovada" : "Rascunho"}
              </Link>
            ))}
          </div>
        ) : null}
        {row ? (
          <>
            <p>
              <strong>
                Versão {row.version} ·{" "}
                {row.status === "approved"
                  ? "Aprovada e congelada"
                  : "Rascunho em revisão"}
              </strong>
            </p>
            <div className="grid gap-3 sm:grid-cols-3">
              {Object.entries(metricLabels).map(([key, label]) => (
                <div className="rounded-xl bg-semear-offwhite p-3" key={key}>
                  <p className="text-sm">{label}</p>
                  <strong>
                    {row.base.metrics[key as keyof typeof metricLabels] ??
                      "Não informado"}
                  </strong>
                </div>
              ))}
            </div>
            <p>
              Frentes nas ações de campo realizadas:{" "}
              {Object.entries(row.base.metrics.fronts)
                .map(
                  ([key, count]) =>
                    `${workFronts[key as keyof typeof workFronts]}: ${count}`,
                )
                .join(" · ")}
              . As frentes podem se sobrepor e não devem ser somadas como ações
              distintas.
            </p>
            <ul className="list-disc space-y-2 pl-5 text-sm">
              {row.base.warnings.map((w) => (
                <li key={w}>{w}</li>
              ))}
            </ul>
            <details>
              <summary className="font-semibold">
                Fontes da versão e evidências
              </summary>
              {row.base.sources.map((source) => (
                <article key={source.id} className="my-3 border-b pb-3">
                  <h3 className="font-semibold">
                    {source.date} · {source.title}
                  </h3>
                  <p>
                    {source.preliminary
                      ? "Interpretação preliminar ou confirmação coletiva não registrada"
                      : "Há evidência de resultado coletivo na fonte"}
                  </p>
                  {source.report_id ? (
                    <Link
                      className="underline"
                      href={`/memoria/${source.report_id}`}
                    >
                      Abrir semanal de origem
                    </Link>
                  ) : null}
                  {Object.entries(source.content)
                    .filter(([, value]) => value)
                    .map(([key, value]) => (
                      <p key={key} className="whitespace-pre-wrap text-sm">
                        <strong>
                          {activityFields.find(
                            ([field]) => field === key,
                          )?.[1] ??
                            (
                              {
                                territory: "Território",
                                territory_id: "Identificador do território",
                                work_fronts: "Frentes de trabalho",
                                activity_kind: "Natureza",
                                action_id: "Ação vinculada",
                                type: "Tipo",
                                version: "Versão",
                                description: "Descrição",
                                context: "Contexto",
                                legend: "Legenda",
                                summary: "Síntese",
                                diagnosis: "Diagnóstico",
                                conclusions: "Conclusões",
                                agreements: "Encaminhamentos",
                                divergences: "Divergências",
                              } as Record<string, string>
                            )[key] ??
                            key}
                          :
                        </strong>{" "}
                        {value}
                      </p>
                    ))}
                </article>
              ))}
            </details>
            {editable ? (
              <>
                <button
                  className={button}
                  disabled={busy}
                  onClick={() => void operate("ai")}
                >
                  Solicitar rascunho qualitativo com IA
                </button>
                <p className="text-sm">
                  Antes de solicitar, confira as fontes e a privacidade e salve
                  a revisão abaixo. As contagens são calculadas pelo sistema,
                  nunca pela IA.
                </p>
              </>
            ) : null}
            {row.generated_blocks.length ? (
              <details>
                <summary>Rascunho gerado e suas referências</summary>
                {row.generated_blocks.map((b, i) => (
                  <article key={i} className="my-3">
                    <h3 className="font-semibold">{b.section}</h3>
                    <p className="whitespace-pre-wrap">{b.text}</p>
                    <p className="text-xs">
                      Fontes: {b.source_ids.join(", ") || "Nota metodológica"}
                    </p>
                  </article>
                ))}
                {editable ? (
                  <button
                    className={button}
                    onClick={() => {
                      if (
                        window.confirm(
                          "Substituir o texto em edição pelo rascunho gerado?",
                        )
                      )
                        setEdited(row.generated_blocks);
                    }}
                  >
                    Aplicar rascunho aos textos em edição
                  </button>
                ) : null}
              </details>
            ) : null}
            <h3 className="text-xl font-semibold">Interpretação em revisão</h3>
            {edited.map((b, index) => (
              <fieldset
                disabled={busy || !editable}
                key={index}
                className="space-y-2 rounded-xl border p-4"
              >
                <label className="block">
                  Título do bloco
                  <input
                    className={control}
                    value={b.section}
                    onChange={(e) =>
                      editBlock(index, { section: e.target.value })
                    }
                  />
                </label>
                <div>
                  <label htmlFor={`synthesis-block-${index}`} className="block">
                    Texto do bloco
                  </label>
                  <textarea
                    id={`synthesis-block-${index}`}
                    rows={4}
                    className={control}
                    value={b.text}
                    onChange={(e) => editBlock(index, { text: e.target.value })}
                  />
                </div>
                <details>
                  <summary>
                    Referências do bloco ({b.source_ids.length})
                  </summary>
                  {row.base.sources.map((source) => (
                    <label key={source.id} className="block">
                      <input
                        type="checkbox"
                        checked={b.source_ids.includes(source.id)}
                        onChange={(e) =>
                          editBlock(index, {
                            source_ids: e.target.checked
                              ? [...b.source_ids, source.id]
                              : b.source_ids.filter((id) => id !== source.id),
                          })
                        }
                      />
                      {source.date} · {source.title}
                    </label>
                  ))}
                </details>
                {scope === "project" ? (
                  <label className="block">
                    <input
                      type="checkbox"
                      checked={selected.includes(index)}
                      onChange={(e) =>
                        setSelected(
                          e.target.checked
                            ? [...selected, index]
                            : selected.filter((i) => i !== index),
                        )
                      }
                    />{" "}
                    Selecionar este bloco para preparar versão pública
                  </label>
                ) : null}
              </fieldset>
            ))}
            {editable ? (
              <button
                className={button}
                onClick={() =>
                  setEdited([
                    ...edited,
                    { section: "Novo bloco", text: "", source_ids: [] },
                  ])
                }
              >
                Adicionar bloco
              </button>
            ) : null}
            {scope === "project" ? (
              <>
                <h3 className="text-xl font-semibold">
                  Versão pública separada
                </h3>
                <p>
                  Selecione somente resultados adequados à divulgação. Anexos,
                  dados pessoais e fontes internas não são enviados.
                </p>
                {editable ? (
                  <button
                    className={button}
                    disabled={busy || !selected.length}
                    onClick={() => {
                      if (
                        !publicBlocks.length ||
                        window.confirm(
                          "Substituir a versão pública pelos blocos selecionados?",
                        )
                      )
                        setPublicBlocks(
                          edited.filter((_, i) => selected.includes(i)),
                        );
                    }}
                  >
                    Preparar versão pública da seleção
                  </button>
                ) : null}
                {publicBlocks.map((b, index) => (
                  <div key={index}>
                    <label className="block">
                      {b.section}
                      <textarea
                        disabled={busy || !editable}
                        className={control}
                        rows={4}
                        value={b.text}
                        onChange={(e) =>
                          editBlock(index, { text: e.target.value }, true)
                        }
                      />
                    </label>
                  </div>
                ))}
                <p>
                  Mapas e imagens precisam de uma versão pública revisada na
                  biblioteca do site; os anexos privados não são transferidos.
                </p>
              </>
            ) : null}
            {editable ? (
              <fieldset disabled={busy} className="space-y-3">
                <legend className="font-semibold">
                  Conferência da coordenação
                </legend>
                {Object.entries(checks).map(([key, label]) => (
                  <label key={key} className="block">
                    <input
                      type="checkbox"
                      checked={Boolean(checklist[key])}
                      onChange={(e) =>
                        setChecklist({ ...checklist, [key]: e.target.checked })
                      }
                    />{" "}
                    {label}
                  </label>
                ))}
                <label className="block">
                  Nota de revisão
                  <textarea
                    className={control}
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                  />
                </label>
                <button className={button} onClick={() => void operate("save")}>
                  Salvar revisão
                </button>
                <button
                  disabled={!Object.keys(checks).every((k) => checklist[k])}
                  className={button}
                  onClick={() => void operate("approve")}
                >
                  Aprovar e congelar versão
                </button>
              </fieldset>
            ) : null}
            <div className="flex flex-wrap gap-3">
              {reviewer ? (
                <button
                  className={button}
                  disabled={busy}
                  onClick={() => void operate("build", { force: true })}
                >
                  Consolidar fontes em nova versão
                </button>
              ) : null}
              <button
                className={button}
                onClick={() => {
                  setPrintPublic(false);
                  setTimeout(() => window.print(), 0);
                }}
              >
                Exportar/imprimir fechamento interno
              </button>
              {scope === "project" && publicBlocks.length ? (
                <button
                  className={button}
                  onClick={() => {
                    setPrintPublic(true);
                    setTimeout(() => window.print(), 0);
                  }}
                >
                  Exportar/imprimir versão pública
                </button>
              ) : null}
              {reviewer && row.status === "approved" && scope === "project" ? (
                <button
                  className={button}
                  disabled={busy}
                  onClick={() => void operate("sync")}
                >
                  Enviar pacote público para revisão no site
                </button>
              ) : null}
            </div>
            {row.sync_receipt ? (
              <p>
                Recebimento confirmado: {row.sync_receipt}. A publicação é
                decidida no painel editorial do semearsf.org.
              </p>
            ) : null}
            {row.sync_error ? (
              <p className="text-red-700">{row.sync_error}</p>
            ) : null}
            <details>
              <summary>Histórico e versão congelada</summary>
              <p>
                Criada em {new Date(row.created_at).toLocaleString("pt-BR")};
                última edição {new Date(row.updated_at).toLocaleString("pt-BR")}
                ; aprovação{" "}
                {row.approved_at
                  ? new Date(row.approved_at).toLocaleString("pt-BR")
                  : "pendente"}
                .
              </p>
              <p>Identificador das fontes: {row.source_hash}</p>
              <ul className="mt-3 space-y-2">
                {history.map((event) => (
                  <li key={event.id}>
                    {new Date(event.created_at).toLocaleString("pt-BR")} ·{" "}
                    {(
                      {
                        created: "Criação",
                        edited: "Edição",
                        approved: "Aprovação técnica",
                        sent: "Envio confirmado",
                      } as Record<string, string>
                    )[event.event] ?? event.event}{" "}
                    · responsável{" "}
                    {members.find((m) => m.profile_id === event.actor_id)
                      ?.display_name ?? event.actor_id}
                  </li>
                ))}
              </ul>
            </details>
          </>
        ) : !busy ? (
          <p>
            {reviewer
              ? "Selecione um recorte para consolidar."
              : "A coordenação ainda não disponibilizou um fechamento aprovado neste recorte."}
          </p>
        ) : null}
      </div>
      {row ? (
        <section className="hidden print:block">
          <h1>
            {title} — {month} — versão {row.version}
          </h1>
          <p>
            {row.status === "approved"
              ? "Versão aprovada"
              : "Rascunho — revisão pendente"}
          </p>
          {Object.entries(metricLabels)
            .filter(
              ([key]) =>
                !printPublic ||
                !["approved_weeklies", "pending_weeklies"].includes(key),
            )
            .map(([key, label]) => (
              <p key={key}>
                {label}:{" "}
                {row.base.metrics[key as keyof typeof metricLabels] ??
                  "Não informado"}
              </p>
            ))}
          {(printPublic ? publicBlocks : edited).map((b, i) => (
            <article key={i}>
              <h2>{b.section}</h2>
              <p className="whitespace-pre-wrap">{b.text}</p>
              {!printPublic && b.source_ids.length ? (
                <p>
                  Fontes:{" "}
                  {b.source_ids
                    .map((id) => {
                      const source = row.base.sources.find((s) => s.id === id);
                      return source
                        ? `${source.date} · ${source.title} [${id}]`
                        : id;
                    })
                    .join("; ")}
                </p>
              ) : null}
            </article>
          ))}
          <p>
            Participações estimadas não representam pessoas únicas. A revisão
            técnica não equivale à confirmação dos participantes.
          </p>
          {!printPublic ? (
            <p>
              Base de fontes: {row.source_hash}. Aprovação:{" "}
              {row.approved_at ?? "pendente"}.
            </p>
          ) : null}
        </section>
      ) : null}
    </section>
  );
}
