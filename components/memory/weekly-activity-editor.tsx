"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import type {
  Action,
  ActionType,
  Neighborhood,
  WeeklyTeamReport,
  WeeklyTeamReportAttachment,
  WorkshopRecord,
} from "@/lib/database.types";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";
import {
  activityFields,
  emptyActivityContent,
  productTypes,
  workFronts,
  type ActivityProduct,
  type WeeklyActivity,
} from "@/lib/weekly-activities";
const control =
  "mt-1 w-full rounded-xl border border-stone-300 bg-white p-3 disabled:bg-stone-100";
const button =
  "rounded-full border border-semear-green px-4 py-2 text-sm font-semibold text-semear-green disabled:opacity-40";
export function WeeklyActivityEditor({
  report,
  canEdit,
  actions,
  neighborhoods,
}: {
  report: WeeklyTeamReport;
  canEdit: boolean;
  actions: Action[];
  neighborhoods: Neighborhood[];
}) {
  const client = useMemo(() => createBrowserSupabaseClient(), []);
  const [createdActions, setCreatedActions] = useState<Action[]>([]);
  const availableActions = [
    ...actions,
    ...createdActions.filter(
      (created) => !actions.some((a) => a.id === created.id),
    ),
  ];
  const [items, setItems] = useState<WeeklyActivity[]>([]),
    [products, setProducts] = useState<ActivityProduct[]>([]),
    [workshops, setWorkshops] = useState<WorkshopRecord[]>([]),
    [attachments, setAttachments] = useState<WeeklyTeamReportAttachment[]>([]);
  const [editing, setEditing] = useState<string | null>(null),
    [error, setError] = useState(""),
    [message, setMessage] = useState(""),
    [busy, setBusy] = useState(false);
  const defaults = useCallback(
    () => ({
      ...emptyActivityContent,
      activity_date: report.week_start,
      title: "",
      kind: "field" as WeeklyActivity["kind"],
      action_id: "",
      workshop_id: "",
      fronts: [] as string[],
    }),
    [report.week_start],
  );
  const [form, setForm] = useState(defaults),
    [createAction, setCreateAction] = useState(false),
    [neighborhood, setNeighborhood] = useState("");
  const [productItem, setProductItem] = useState(""),
    [previousProduct, setPreviousProduct] = useState(""),
    [productTitle, setProductTitle] = useState(""),
    [productType, setProductType] =
      useState<ActivityProduct["product_type"]>("social_map"),
    [description, setDescription] = useState(""),
    [mapContext, setMapContext] = useState(""),
    [mapLegend, setMapLegend] = useState("");
  const [attachmentProduct, setAttachmentProduct] = useState("");
  const [actionType, setActionType] = useState<ActionType>("oficina");
  const load = useCallback(async () => {
    if (!client) return;
    const [i, p, w, a] = await Promise.all([
      client
        .from("weekly_activity_items")
        .select("*")
        .eq("report_id", report.id)
        .order("activity_date"),
      client
        .from("weekly_activity_products")
        .select("*")
        .order("version", { ascending: false }),
      client.from("workshop_records").select("*"),
      client
        .from("weekly_team_report_attachments")
        .select("*")
        .eq("report_id", report.id),
    ]);
    for (const result of [i, p, w, a])
      if (result.error) throw new Error(result.error.message);
    setItems(i.data ?? []);
    setProducts(p.data ?? []);
    setWorkshops(w.data ?? []);
    setAttachments(a.data ?? []);
  }, [client, report.id]);
  useEffect(() => {
    void load().catch((e) => setError(e.message));
  }, [load]);
  async function run(operation: () => Promise<void>) {
    setBusy(true);
    setError("");
    setMessage("");
    try {
      await operation();
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Não foi possível salvar.");
    } finally {
      setBusy(false);
    }
  }
  async function save() {
    if (!client) return;
    let actionId = form.action_id;
    if (createAction && form.kind === "field") {
      if (!form.title.trim() || !form.objective.trim())
        throw new Error(
          "Informe o título e o objetivo antes de cadastrar a ação.",
        );
      const user = await client.auth.getUser();
      const r = await client
        .from("actions")
        .insert({
          title: form.title,
          action_type: actionType,
          action_date: form.activity_date,
          objective: form.objective,
          neighborhood_id: neighborhood || null,
          status: "realizada",
          created_by: user.data.user!.id,
          summary: null,
          notes: null,
          location_reference: null,
          team: null,
          estimated_public: null,
        })
        .select("*")
        .single();
      if (r.error) throw new Error(r.error.message);
      actionId = r.data.id;
      setCreatedActions((current) => [...current, r.data]);
      setCreateAction(false);
      setForm((f) => ({ ...f, action_id: actionId }));
    }
    const payload = {
      ...form,
      report_id: report.id,
      action_id: actionId || null,
      workshop_id: form.workshop_id || null,
    };
    const r = editing
      ? await client
          .from("weekly_activity_items")
          .update(payload)
          .eq("id", editing)
      : await client.from("weekly_activity_items").insert(payload);
    if (r.error) throw new Error(r.error.message);
    setEditing(null);
    setForm(defaults());
    setMessage(
      "Atividade registrada. A consolidação usa a ação existente, sem duplicar contagens.",
    );
  }
  async function saveProduct() {
    if (!client) return;
    const previous = products.find((p) => p.id === previousProduct);
    const r = await client.from("weekly_activity_products").insert({
      item_id: productItem,
      product_key: previous?.product_key ?? crypto.randomUUID(),
      version: previous
        ? Math.max(
            ...products
              .filter((p) => p.product_key === previous.product_key)
              .map((p) => p.version),
          ) + 1
        : 1,
      title: productTitle,
      product_type: productType,
      description,
      map_context: mapContext,
      map_legend: mapLegend,
    });
    if (r.error) throw new Error(r.error.message);
    setProductTitle("");
    setPreviousProduct("");
    setMessage("Produto salvo com identidade e versão próprias.");
  }
  const currentIds = new Set(items.map((i) => i.id));
  return (
    <section className="col-span-full space-y-5 rounded-2xl border border-semear-green/20 bg-semear-offwhite p-5">
      <h3 className="text-xl font-semibold text-semear-green">
        Atividades da semana e roteiro metodológico
      </h3>
      <p className="text-sm">
        Registre cada atividade com sua data. Preparação e sistematização também
        entram, sem criar oficinas fictícias. Revisão técnica não equivale à
        confirmação dos participantes.
      </p>
      {error ? (
        <p role="alert" className="text-red-700">
          {error}
        </p>
      ) : null}
      {message ? <p role="status">{message}</p> : null}
      {items.map((item) => (
        <article key={item.id} className="space-y-2 rounded-xl bg-white p-4">
          <h4 className="font-semibold">
            {item.activity_date} · {item.title}
          </h4>
          <p>
            {item.kind === "field"
              ? "Atividade de campo"
              : item.kind === "preparation"
                ? "Preparação"
                : "Sistematização"}{" "}
            ·{" "}
            {item.fronts
              .map((f) => workFronts[f as keyof typeof workFronts])
              .join(", ")}
          </p>
          {item.action_id ? (
            <Link className="underline" href={`/acoes/${item.action_id}`}>
              Abrir ação vinculada
            </Link>
          ) : null}
          <details>
            <summary>Ler registro e evidências</summary>
            {activityFields.map(([key, label]) =>
              item[key] ? (
                <p key={key} className="whitespace-pre-wrap">
                  <strong>{label}:</strong> {item[key]}
                </p>
              ) : null,
            )}
          </details>
          {products
            .filter((p) => p.item_id === item.id)
            .map((p) => (
              <p key={p.id}>
                {p.title} · {productTypes[p.product_type]} · versão {p.version}
              </p>
            ))}
          {canEdit ? (
            <button
              className={button}
              disabled={busy}
              onClick={() => {
                setEditing(item.id);
                setForm({
                  ...item,
                  action_id: item.action_id ?? "",
                  workshop_id: item.workshop_id ?? "",
                });
              }}
            >
              Editar atividade
            </button>
          ) : null}
        </article>
      ))}
      {canEdit ? (
        <fieldset disabled={busy} className="space-y-4">
          <legend className="font-semibold">
            {editing ? "Editar atividade" : "Nova atividade datada"}
          </legend>
          <div className="grid gap-4 md:grid-cols-2">
            <label>
              Data
              <input
                type="date"
                min={report.week_start}
                max={report.week_end}
                className={control}
                value={form.activity_date}
                onChange={(e) =>
                  setForm({ ...form, activity_date: e.target.value })
                }
              />
            </label>
            <label>
              Natureza
              <select
                className={control}
                value={form.kind}
                onChange={(e) => {
                  setCreateAction(false);
                  setForm({
                    ...form,
                    kind: e.target.value as WeeklyActivity["kind"],
                  });
                }}
              >
                <option value="field">Atividade de campo</option>
                <option value="preparation">Preparação</option>
                <option value="systematization">Sistematização</option>
              </select>
            </label>
          </div>
          <label className="block">
            Título da atividade
            <input
              className={control}
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
            />
          </label>
          <label className="block">
            Ação existente
            <select
              className={control}
              value={form.action_id}
              onChange={(e) =>
                setForm({ ...form, action_id: e.target.value, workshop_id: "" })
              }
            >
              <option value="">Sem ação vinculada</option>
              {availableActions.map((a) => (
                <option value={a.id} key={a.id}>
                  {a.action_date} · {a.title}
                </option>
              ))}
            </select>
          </label>
          {!editing && form.kind === "field" ? (
            <label className="block">
              <input
                type="checkbox"
                checked={createAction}
                onChange={(e) => setCreateAction(e.target.checked)}
              />{" "}
              Cadastrar uma nova ação realizada usando título, data e objetivo
              deste registro
            </label>
          ) : null}
          {createAction ? (
            <label className="block">
              Tipo da nova ação
              <select
                className={control}
                value={actionType}
                onChange={(e) => setActionType(e.target.value as ActionType)}
              >
                {[
                  ["oficina", "Oficina"],
                  ["roda", "Roda"],
                  ["banca_escuta", "Banca de escuta"],
                  ["caminhada", "Caminhada"],
                  ["reuniao_institucional", "Reunião institucional"],
                  ["devolutiva", "Devolutiva"],
                  ["outro", "Outro"],
                ].map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </label>
          ) : null}
          {createAction ? (
            <label className="block">
              Território da nova ação
              <select
                className={control}
                value={neighborhood}
                onChange={(e) => setNeighborhood(e.target.value)}
              >
                <option value="">Não informado</option>
                {neighborhoods.map((n) => (
                  <option key={n.id} value={n.id}>
                    {n.name}
                  </option>
                ))}
              </select>
            </label>
          ) : null}
          <label className="block">
            Registro de oficina existente
            <select
              className={control}
              value={form.workshop_id}
              onChange={(e) =>
                setForm({ ...form, workshop_id: e.target.value })
              }
            >
              <option value="">Não se aplica</option>
              {workshops
                .filter((w) => w.action_id === form.action_id)
                .map((w) => (
                  <option key={w.id} value={w.id}>
                    {w.workshop_date ?? "Sem data"} · {w.status}
                  </option>
                ))}
            </select>
          </label>
          {form.action_id ? (
            <p>
              <Link
                className="underline"
                href={`/acoes/${form.action_id}/oficina`}
              >
                Preencher ou revisar a ficha de oficina
              </Link>
            </p>
          ) : null}
          <div className="grid gap-2 sm:grid-cols-2">
            {Object.entries(workFronts).map(([key, label]) => (
              <label key={key}>
                <input
                  type="checkbox"
                  checked={form.fronts.includes(key)}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      fronts: e.target.checked
                        ? [...form.fronts, key]
                        : form.fronts.filter((f) => f !== key),
                    })
                  }
                />{" "}
                {label}
              </label>
            ))}
          </div>
          {activityFields.map(([key, label]) => (
            <div key={key}>
              <label htmlFor={`activity-${key}`}>{label}</label>
              <textarea
                id={`activity-${key}`}
                rows={2}
                className={control}
                value={form[key]}
                onChange={(e) => setForm({ ...form, [key]: e.target.value })}
              />
            </div>
          ))}
          <button
            type="button"
            className={button}
            onClick={() => void run(save)}
          >
            Salvar atividade datada
          </button>
          {editing ? (
            <button
              className={button}
              type="button"
              onClick={() => {
                setEditing(null);
                setForm(defaults());
              }}
            >
              Cancelar edição
            </button>
          ) : null}
        </fieldset>
      ) : null}
      {canEdit && items.length ? (
        <details>
          <summary className="font-semibold">
            Produtos, versões e associação de anexos
          </summary>
          <fieldset disabled={busy} className="mt-4 space-y-3">
            <label className="block">
              Atividade de origem
              <select
                className={control}
                value={productItem}
                onChange={(e) => {
                  setProductItem(e.target.value);
                  setAttachmentProduct("");
                }}
              >
                <option value="">Selecione</option>
                {items.map((i) => (
                  <option key={i.id} value={i.id}>
                    {i.title}
                  </option>
                ))}
              </select>
            </label>
            <label className="block">
              Identidade do produto
              <select
                className={control}
                value={previousProduct}
                onChange={(e) => setPreviousProduct(e.target.value)}
              >
                <option value="">Produto novo</option>
                {products
                  .filter(
                    (p, index, all) =>
                      all.findIndex((q) => q.product_key === p.product_key) ===
                      index,
                  )
                  .map((p) => (
                    <option key={p.id} value={p.id}>
                      Nova versão de {p.title} (v{p.version})
                    </option>
                  ))}
              </select>
            </label>
            <label className="block">
              Tipo do produto
              <select
                className={control}
                value={productType}
                onChange={(e) =>
                  setProductType(
                    e.target.value as ActivityProduct["product_type"],
                  )
                }
              >
                {Object.entries(productTypes).map(([key, label]) => (
                  <option key={key} value={key}>
                    {label}
                  </option>
                ))}
              </select>
            </label>
            <label className="block">
              Título do produto
              <input
                className={control}
                value={productTitle}
                onChange={(e) => setProductTitle(e.target.value)}
              />
            </label>
            <label className="block">
              Descrição do produto
              <textarea
                className={control}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </label>
            {productType === "social_map" ? (
              <>
                <label className="block">
                  Contexto de construção do mapa
                  <textarea
                    className={control}
                    value={mapContext}
                    onChange={(e) => setMapContext(e.target.value)}
                  />
                </label>
                <label className="block">
                  Legenda do mapa
                  <textarea
                    className={control}
                    value={mapLegend}
                    onChange={(e) => setMapLegend(e.target.value)}
                  />
                </label>
              </>
            ) : null}
            <button
              type="button"
              disabled={!productItem || !productTitle.trim()}
              className={button}
              onClick={() => void run(saveProduct)}
            >
              Registrar produto ou nova versão
            </button>
            <label className="block">
              Produto para associar os anexos
              <select
                className={control}
                value={attachmentProduct}
                onChange={(e) => setAttachmentProduct(e.target.value)}
              >
                <option value="">Somente à atividade</option>
                {products
                  .filter((p) => p.item_id === productItem)
                  .map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.title} · v{p.version}
                    </option>
                  ))}
              </select>
            </label>
            <button
              type="button"
              className={button}
              onClick={() =>
                void run(async () => {
                  setMessage("Lista de anexos atualizada.");
                })
              }
            >
              Atualizar lista de anexos
            </button>
            <p>
              Envie materiais pela área de anexos do semanal. Depois, associe os
              arquivos à atividade e ao produto selecionados.
            </p>
            {attachments.map((a) => (
              <div key={a.id}>
                <span>
                  {a.file_name}
                  {a.activity_item_id ? " · associado" : ""}
                </span>
                <button
                  disabled={!productItem}
                  type="button"
                  className={button}
                  onClick={() =>
                    void run(async () => {
                      const r = await client!
                        .from("weekly_team_report_attachments")
                        .update({
                          activity_item_id: productItem,
                          product_version_id: attachmentProduct || null,
                        })
                        .eq("id", a.id);
                      if (r.error) throw new Error(r.error.message);
                      setMessage(
                        "Anexo associado. O arquivo continua privado.",
                      );
                    })
                  }
                >
                  Associar
                </button>
              </div>
            ))}
          </fieldset>
        </details>
      ) : null}
      {!canEdit && !items.length ? (
        <p>
          Semanal anterior ao roteiro guiado. O texto legado foi preservado e
          não será convertido automaticamente em atividades.
        </p>
      ) : null}
      <p className="text-xs">
        {products.filter((p) => currentIds.has(p.item_id)).length} versão(ões)
        de produtos neste semanal. A contagem mensal usa identidades únicas.
      </p>
    </section>
  );
}
