"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";
import type { Action, Neighborhood, TeamMember, WorkshopRecord } from "@/lib/database.types";
import { approvalChecks, deliveryTypes, emptyMonthlyContent, isMonthlyEditable, isOutsideMonth, monthlyFields, monthlyStatuses, type DeliveryType, type MonthlyActivityLink, type MonthlyAttachment, type MonthlyContent, type MonthlyDelivery, type MonthlyHistory, type MonthlyReport, type MonthlyStatus } from "@/lib/professional-monthly-reports";
import { formatDateLabel, projectMemoryAcceptedExtensions, sanitizeUploadFileName, validateProjectMemoryFile } from "@/lib/project-memory";
import { detectImportPrivacyRisks } from "@/lib/report-import-privacy";
import { SemearButton, SemearPageHeader } from "@/components/ui/semear-primitives";

const bucket = "professional-monthly-documents";
const control = "mt-1 w-full rounded-xl border border-stone-300 bg-white p-3 text-stone-900 disabled:bg-stone-100";
const button = "rounded-xl border border-semear-green px-4 py-2 text-semear-green disabled:opacity-40";
const panel = "space-y-4 rounded-2xl border border-stone-200 bg-white p-5";
const defaultDelivery = { delivery_type: "workshop_record" as DeliveryType, title: "", description: "", activity_link_id: "", map_context: "", map_legend: "" };
type Bootstrap = { members: TeamMember[]; actions: Action[]; workshops: WorkshopRecord[]; neighborhoods: Neighborhood[]; userId: string; reviewer: boolean };

export function ProfessionalMonthlyWorkspace({ reportId }: { reportId?: string }) {
  const supabase = useMemo(() => createBrowserSupabaseClient(), []);
  const router = useRouter();
  const [data, setData] = useState<Bootstrap | null>(null);
  const [report, setReport] = useState<MonthlyReport | null>(null);
  const [content, setContent] = useState<MonthlyContent>({ ...emptyMonthlyContent });
  const [title, setTitle] = useState("Relatório mensal do profissional");
  const [month, setMonth] = useState(() => new Intl.DateTimeFormat("sv-SE", { timeZone: "America/Sao_Paulo", year: "numeric", month: "2-digit" }).format(new Date()));
  const [memberId, setMemberId] = useState("");
  const [noField, setNoField] = useState(false); const [noFieldReason, setNoFieldReason] = useState("");
  const [mainId, setMainId] = useState(""); const [note, setNote] = useState(""); const [checks, setChecks] = useState<Record<string, boolean>>({});
  const [links, setLinks] = useState<MonthlyActivityLink[]>([]); const [neighborhoodIds, setNeighborhoodIds] = useState<string[]>([]);
  const [deliveries, setDeliveries] = useState<MonthlyDelivery[]>([]); const [attachments, setAttachments] = useState<MonthlyAttachment[]>([]); const [history, setHistory] = useState<MonthlyHistory[]>([]);
  const [selectedActivity, setSelectedActivity] = useState(""); const [periodReason, setPeriodReason] = useState("");
  const [delivery, setDelivery] = useState({ ...defaultDelivery }); const [editingDelivery, setEditingDelivery] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null); const [fileDelivery, setFileDelivery] = useState("");
  const [preview, setPreview] = useState<Partial<MonthlyContent> | null>(null);
  const [busy, setBusy] = useState(false); const [loading, setLoading] = useState(true); const [error, setError] = useState(""); const [message, setMessage] = useState("");
  const [memoryTitle, setMemoryTitle] = useState(""); const [memoryBody, setMemoryBody] = useState("");
  const editable = !report || isMonthlyEditable(report.status);

  const loadChildren = useCallback(async (id: string) => {
    if (!supabase) return;
    const results = await Promise.all([
      supabase.from("professional_monthly_activity_links").select("*").eq("report_id", id),
      supabase.from("professional_monthly_neighborhoods").select("*").eq("report_id", id),
      supabase.from("professional_monthly_deliveries").select("*").eq("report_id", id),
      supabase.from("professional_monthly_attachments").select("*").eq("report_id", id).order("created_at", { ascending: false }),
      supabase.from("professional_monthly_history").select("*").eq("report_id", id).order("created_at", { ascending: false }),
    ]);
    for (const result of results) if (result.error) throw new Error(result.error.message);
    setLinks(results[0].data ?? []); setNeighborhoodIds((results[1].data ?? []).map(n => n.neighborhood_id));
    setDeliveries(results[2].data ?? []); setAttachments(results[3].data ?? []); setHistory(results[4].data ?? []);
  }, [supabase]);

  useEffect(() => { let active = true; async function load() {
    if (!supabase) { setError("Conexão não configurada."); setLoading(false); return; }
    try {
      const { data: auth, error: authError } = await supabase.auth.getUser();
      if (authError || !auth.user) throw new Error("Entre novamente para acessar os relatórios.");
      const [members, actions, workshops, neighborhoods, profile, existing] = await Promise.all([
        supabase.from("team_members").select("*").order("display_name"),
        supabase.from("actions").select("*").order("action_date", { ascending: false }),
        supabase.from("workshop_records").select("*"),
        supabase.from("neighborhoods").select("*").order("name"),
        supabase.from("profiles").select("role").eq("id", auth.user.id).single(),
        reportId ? supabase.from("professional_monthly_reports").select("*").eq("id", reportId).single() : Promise.resolve({ data: null, error: null }),
      ]);
      for (const result of [members, actions, workshops, neighborhoods, profile, existing]) if (result.error) throw new Error(result.error.message);
      if (!active) return;
      const reviewer = ["admin", "coordenacao"].includes(profile.data?.role ?? "");
      setData({ members: members.data ?? [], actions: actions.data ?? [], workshops: workshops.data ?? [], neighborhoods: neighborhoods.data ?? [], userId: auth.user.id, reviewer });
      if (existing.data) {
        const r = existing.data; setReport(r); setTitle(r.title); setMonth(r.reference_month.slice(0,7)); setMemberId(r.team_member_id);
        setContent(Object.fromEntries(monthlyFields.map(([key]) => [key, r[key]])) as MonthlyContent);
        setNoField(r.no_field_activity); setNoFieldReason(r.no_field_justification); setMainId(r.main_attachment_id ?? ""); setChecks(r.review_checklist);
        await loadChildren(r.id);
      } else {
        const own = members.data?.find(m => m.profile_id === auth.user!.id && m.active); if (own) setMemberId(own.id);
      }
    } catch (e) { if (active) setError(e instanceof Error ? e.message : "Falha ao carregar."); }
    finally { if (active) setLoading(false); }
  } void load(); return () => { active = false; }; }, [supabase, reportId, loadChildren]);

  async function run(operation: () => Promise<void>) {
    setBusy(true); setError(""); setMessage("");
    try { await operation(); } catch (e) { setError(e instanceof Error ? e.message : "Operação não concluída."); } finally { setBusy(false); }
  }
  async function save() {
    if (!supabase || !data) throw new Error("Sessão indisponível.");
    if (!title.trim() || !month || !memberId) throw new Error("Informe título, mês e profissional.");
    const values = { title: title.trim(), ...content, no_field_activity: noField, no_field_justification: noFieldReason, main_attachment_id: mainId || null };
    const result = report
      ? await supabase.from("professional_monthly_reports").update(values).eq("id", report.id).eq("updated_at", report.updated_at).select("*").single()
      : await supabase.from("professional_monthly_reports").insert({ ...values, reference_month: `${month}-01`, team_member_id: memberId, created_by: data.userId }).select("*").single();
    if (result.error || !result.data) throw new Error(result.error?.code === "23505" ? "Já existe um relatório desse profissional neste mês. Abra o fechamento existente na listagem." : result.error?.code === "PGRST116" ? "O relatório foi alterado em outra sessão. Recarregue antes de salvar." : result.error?.message ?? "Não foi possível salvar.");
    setReport(result.data); return result.data;
  }
  async function transition(status: MonthlyStatus) {
    if (!supabase || !report) return;
    const saved = editable ? await save() : report;
    if (!saved) return;
    const result = await supabase.from("professional_monthly_reports").update({ status, ...(data?.reviewer ? { review_note: note, review_checklist: checks } : {}) }).eq("id", saved.id).eq("status", saved.status).eq("updated_at", saved.updated_at).select("*").single();
    if (result.error) throw new Error(result.error.message);
    setReport(result.data); setChecks(result.data.review_checklist); setNote(""); await loadChildren(saved.id); setMessage("Situação atualizada e registrada no histórico.");
  }
  function actionFor(link: MonthlyActivityLink) { return data?.actions.find(a => a.id === (link.action_id ?? data.workshops.find(w => w.id === link.workshop_id)?.action_id)); }
  function linkLabel(link: MonthlyActivityLink) {
    const action = actionFor(link); const workshop = data?.workshops.find(w => w.id === link.workshop_id);
    const neighborhood = data?.neighborhoods.find(n => n.id === action?.neighborhood_id);
    const date = workshop?.workshop_date ?? action?.action_date;
    return `${workshop ? "Oficina — " : ""}${action?.title ?? "Atividade"} · ${date ? formatDateLabel(date) : "Sem data"} · ${neighborhood?.name ?? "Território não informado"}`;
  }
  async function addActivity() {
    if (!supabase || !report || !selectedActivity) throw new Error("Selecione uma atividade.");
    const [kind, id] = selectedActivity.split(":");
    const result = await supabase.from("professional_monthly_activity_links").insert({ report_id: report.id, action_id: kind === "action" ? id : null, workshop_id: kind === "workshop" ? id : null, period_justification: periodReason });
    if (result.error) throw new Error(result.error.message);
    setSelectedActivity(""); setPeriodReason(""); await loadChildren(report.id);
  }
  async function toggleNeighborhood(id: string) {
    if (!supabase || !report) return;
    const result = neighborhoodIds.includes(id)
      ? await supabase.from("professional_monthly_neighborhoods").delete().eq("report_id", report.id).eq("neighborhood_id", id)
      : await supabase.from("professional_monthly_neighborhoods").insert({ report_id: report.id, neighborhood_id: id });
    if (result.error) throw new Error(result.error.message); await loadChildren(report.id);
  }
  async function saveDelivery() {
    if (!supabase || !report) return;
    const values = { ...delivery, report_id: report.id, activity_link_id: delivery.activity_link_id || null };
    const result = editingDelivery ? await supabase.from("professional_monthly_deliveries").update(values).eq("id", editingDelivery).eq("report_id", report.id) : await supabase.from("professional_monthly_deliveries").insert(values);
    if (result.error) throw new Error(result.error.message); setDelivery({ ...defaultDelivery }); setEditingDelivery(null); await loadChildren(report.id);
  }
  async function upload() {
    if (!supabase || !report || !file || !data) return;
    const validation = validateProjectMemoryFile(file); if (validation) throw new Error(validation);
    if (!file.size || file.size > 10485760) throw new Error("Envie arquivo de até 10 MB.");
    const id = crypto.randomUUID(), path = `${report.id}/${id}-${sanitizeUploadFileName(file.name)}`;
    const result = await supabase.storage.from(bucket).upload(path, file, { upsert: false }); if (result.error) throw new Error(result.error.message);
    const insert = await supabase.from("professional_monthly_attachments").insert({ id, report_id: report.id, delivery_id: fileDelivery || null, storage_path: path, file_name: file.name, file_size: file.size, uploaded_by: data.userId });
    if (insert.error) throw new Error(insert.error.message); setFile(null); await loadChildren(report.id); setMessage("Anexo preservado como nova versão. Se for o documento mensal, selecione-o como principal e salve.");
  }
  async function extract(attachmentId?: string) {
    if (!report || (!file && !attachmentId)) throw new Error("Selecione um DOCX ou PDF.");
    const form = new FormData(); form.set("report_id", report.id);
    if (attachmentId) form.set("attachment_id", attachmentId); else form.set("file", file!);
    const response = await fetch("/api/memoria/mensais/importar", { method: "POST", body: form });
    const result = await response.json(); if (!response.ok) throw new Error(result.error);
    setPreview(result.mapped); if (!attachmentId) setMainId(result.attachmentId);
    await loadChildren(report.id);
    setMessage(result.extractionError ?? (result.extractionStatus === "needs_manual_transcription" ? "Texto insuficiente ou PDF escaneado. Preencha manualmente; o documento foi preservado." : `${result.sections} seções identificadas. Confira a prévia antes de aplicar.`));
  }
  async function openAttachment(attachment: MonthlyAttachment) {
    if (!supabase) return;
    const result = await supabase.storage.from(bucket).createSignedUrl(attachment.storage_path, 60);
    if (result.error) throw new Error(result.error.message);
    window.open(result.data.signedUrl, "_blank", "noopener,noreferrer");
  }
  async function createMemory() {
    if (!supabase || !report || !data) return;
    if (!memoryTitle.trim() || !memoryBody.trim()) throw new Error("Preencha título e conteúdo da entrada de memória.");
    const result = await supabase.from("project_memory_entries").insert({ source_report_id: null, source_monthly_report_id: report.id, action_id: null, entry_date: report.reference_month, title: memoryTitle, body: memoryBody, memory_type: "aprendizado", visibility: "internal", created_by: data.userId });
    if (result.error) throw new Error(result.error.message); setMemoryTitle(""); setMemoryBody(""); setMessage("Entrada interna criada com referência ao relatório mensal.");
  }
  if (loading) return <p>Carregando relatório mensal…</p>;
  if (!data) return <p role="alert">{error}</p>;
  const availableMembers = data.members.filter(m => m.active && (data.reviewer || m.profile_id === data.userId));
  const currentMember = data.members.find(m => m.id === memberId);
  const risks = detectImportPrivacyRisks(Object.values(content).join("\n")).risks;
  return <section className="space-y-6 pb-12">
    <SemearPageHeader eyebrow="Memória do Projeto" title={report ? report.title : "Novo relatório mensal do profissional"} description="Reúna o trabalho realizado em Volta Redonda e suas entregas. A aprovação é uma revisão técnica; publicação e pagamento têm fluxos próprios." actions={<SemearButton href="/memoria/mensais" variant="secondary">Voltar à listagem</SemearButton>} />
    {error ? <p role="alert" className="rounded-xl bg-red-50 p-4 text-red-800">{error}</p> : null}
    {message ? <p role="status" className="rounded-xl bg-green-50 p-4 text-green-900">{message}</p> : null}
    <fieldset disabled={busy || !editable} className={panel}>
      <legend className="font-semibold">Identificação e período</legend>
      <label className="block">Título<input className={control} value={title} onChange={e => setTitle(e.target.value)} /></label>
      <div className="grid gap-4 md:grid-cols-2"><label>Mês de referência<input disabled={Boolean(report)} type="month" className={control} value={month} onChange={e => setMonth(e.target.value)} /></label>
      <label>Profissional responsável<select disabled={Boolean(report)} className={control} value={memberId} onChange={e => setMemberId(e.target.value)}><option value="">Selecione</option>{availableMembers.map(m => <option key={m.id} value={m.id}>{m.display_name}</option>)}{report && !availableMembers.some(m => m.id === memberId) ? <option value={memberId}>{currentMember?.display_name ?? "Profissional inativo"}</option> : null}</select></label></div>
      {!availableMembers.length && !report ? <p>É necessário cadastrar um membro ativo da equipe e vinculá-lo ao login do profissional. A coordenação pode lançar em nome de membros ativos.</p> : null}
      <label className="block"><input type="checkbox" checked={noField} onChange={e => setNoField(e.target.checked)} /> Mês sem atividade de campo</label>
      {noField ? <label className="block">Justificativa<textarea className={control} value={noFieldReason} onChange={e => setNoFieldReason(e.target.value)} /></label> : null}
      {monthlyFields.map(([key, label]) => <div key={key}><label className="block" htmlFor={`monthly-${key}`}>{label}</label><textarea id={`monthly-${key}`} rows={3} className={control} value={content[key]} onChange={e => setContent(previous => ({ ...previous, [key]: e.target.value }))} /></div>)}
      {risks.length ? <p className="text-amber-800">Atenção: possíveis dados pessoais no texto. Revise antes de enviar.</p> : null}
      <button type="button" className={button} onClick={() => void run(async () => { const r = await save(); setMessage("Rascunho salvo."); if (r && !reportId) router.replace(`/memoria/mensais/${r.id}`); })}>Salvar {report ? "alterações" : "rascunho e continuar"}</button>
    </fieldset>
    {!report ? <p>Salve o rascunho para vincular atividades, registrar entregas e importar o documento mensal. <a href="/modelos/relatorio-mensal-profissional.docx" className="underline">Baixar modelo Word</a></p> : <>
      <p>Situação: <strong>{monthlyStatuses[report.status]}</strong> · Profissional: {currentMember?.display_name} · Autor do lançamento: {data.members.find(m => m.profile_id === report.created_by)?.display_name ?? report.created_by}</p>
      <div className={panel}><h2 className="text-lg font-semibold">Atividades e territórios</h2>
        {links.length ? <ul className="space-y-3">{links.map(link => <li key={link.id}><Link className="underline" href={`/acoes/${actionFor(link)?.id ?? ""}${link.workshop_id ? "/oficina" : ""}`}>{linkLabel(link)}</Link>{link.period_justification ? <p>Justificativa do período: {link.period_justification}</p> : null}{editable ? <button disabled={busy} className={`${button} ml-2`} onClick={() => void run(async () => { const r = await supabase!.from("professional_monthly_activity_links").delete().eq("id", link.id); if (r.error) throw new Error("Remova a atividade de origem das entregas antes de desvincular."); await loadChildren(report.id); })}>Desvincular</button> : null}</li>)}</ul> : <p>Nenhuma atividade vinculada.</p>}
        {editable ? <fieldset disabled={busy || noField} className="space-y-3"><label className="block">Adicionar atividade existente<select className={control} value={selectedActivity} onChange={e => setSelectedActivity(e.target.value)}><option value="">Selecione</option><optgroup label="Ações">{data.actions.map(a => <option key={a.id} value={`action:${a.id}`}>{a.title} · {a.action_date ?? "Sem data"}{isOutsideMonth(a.action_date, month) ? " — fora do mês ou sem data" : ""}</option>)}</optgroup><optgroup label="Oficinas">{data.workshops.map(w => <option key={w.id} value={`workshop:${w.id}`}>Oficina — {data.actions.find(a => a.id === w.action_id)?.title} · {w.workshop_date ?? "Sem data"}</option>)}</optgroup></select></label><label className="block">Justificativa para atividade fora do mês ou sem data<input className={control} value={periodReason} onChange={e => setPeriodReason(e.target.value)} /></label><button type="button" className={button} onClick={() => void run(addActivity)}>Vincular atividade</button></fieldset> : null}
        <details><summary>Bairros relacionados</summary><fieldset disabled={busy || !editable} className="grid gap-2 py-3 md:grid-cols-3">{data.neighborhoods.map(n => <label key={n.id}><input type="checkbox" checked={neighborhoodIds.includes(n.id)} onChange={() => void run(() => toggleNeighborhood(n.id))} /> {n.name}</label>)}</fieldset></details>
      </div>
      <div className={panel}><h2 className="text-lg font-semibold">Entregas técnicas</h2>
        {deliveries.map(d => <article key={d.id} className="space-y-1 border-b py-3"><h3 className="font-semibold">{d.title} · {deliveryTypes[d.delivery_type]}</h3><p className="whitespace-pre-wrap">{d.description}</p>{d.activity_link_id ? <p>Origem: {links.find(l => l.id === d.activity_link_id) ? linkLabel(links.find(l => l.id === d.activity_link_id)!) : "Atividade indisponível"}</p> : null}{d.delivery_type === "social_map" ? <><p>Contexto: {d.map_context}</p><p>Legenda: {d.map_legend}</p></> : null}<p>{attachments.filter(a => a.delivery_id === d.id).length} anexo(s)</p>{editable ? <button disabled={busy} className={button} onClick={() => { setEditingDelivery(d.id); setDelivery({ ...d, activity_link_id: d.activity_link_id ?? "" }); }}>Editar entrega</button> : null}</article>)}
        {editable ? <fieldset disabled={busy} className="space-y-3"><legend>{editingDelivery ? "Editar entrega" : "Nova entrega"}</legend>
          <label className="block">Tipo<select className={control} value={delivery.delivery_type} onChange={e => setDelivery({ ...delivery, delivery_type: e.target.value as DeliveryType })}>{Object.entries(deliveryTypes).map(([k,v]) => <option key={k} value={k}>{v}</option>)}</select></label>
          <label className="block">Título da entrega<input className={control} value={delivery.title} onChange={e => setDelivery({ ...delivery, title: e.target.value })} /></label>
          <label className="block">Descrição<textarea className={control} value={delivery.description} onChange={e => setDelivery({ ...delivery, description: e.target.value })} /></label>
          <label className="block">Atividade de origem<select className={control} value={delivery.activity_link_id} onChange={e => setDelivery({ ...delivery, activity_link_id: e.target.value })}><option value="">Não se aplica</option>{links.map(l => <option key={l.id} value={l.id}>{linkLabel(l)}</option>)}</select></label>
          {delivery.delivery_type === "social_map" ? <><label className="block">Contexto de construção<textarea className={control} value={delivery.map_context} onChange={e => setDelivery({ ...delivery, map_context: e.target.value })} /></label><label className="block">Explicação da legenda<textarea className={control} value={delivery.map_legend} onChange={e => setDelivery({ ...delivery, map_legend: e.target.value })} /></label></> : null}
          <button type="button" className={button} onClick={() => void run(saveDelivery)}>Salvar entrega</button>{editingDelivery ? <button type="button" className={button} onClick={() => { setEditingDelivery(null); setDelivery({ ...defaultDelivery }); }}>Cancelar edição</button> : null}
        </fieldset> : null}
      </div>
      <div className={panel}><h2 className="text-lg font-semibold">Documento mensal e materiais</h2><p>DOCX ou PDF principal obrigatório. Cada envio preserva uma versão; arquivos privados de até 10 MB.</p>
        <label className="block">Documento principal<select disabled={busy || !editable} className={control} value={mainId} onChange={e => setMainId(e.target.value)}><option value="">Selecione e salve</option>{attachments.filter(a => /\.(docx|pdf)$/i.test(a.file_name)).map(a => <option key={a.id} value={a.id}>{a.file_name} — {new Date(a.created_at).toLocaleString("pt-BR")}</option>)}</select></label>
        {attachments.map(a => <article className="space-y-2 border-b py-3" key={a.id}><p className="font-semibold">{a.file_name}{a.id === report.main_attachment_id ? " · Principal salvo" : ""}{a.id === report.reviewed_attachment_id ? " · Versão revisada" : ""}</p><p>{new Date(a.created_at).toLocaleString("pt-BR")} · {a.delivery_id ? deliveries.find(d => d.id === a.delivery_id)?.title : "Documento do relatório"}</p><button disabled={busy} className={button} onClick={() => void run(() => openAttachment(a))}>Abrir arquivo privado</button>{editable && /\.(docx|pdf)$/i.test(a.file_name) ? <button disabled={busy} className={`${button} ml-2`} onClick={() => void run(() => extract(a.id))}>Extrair novamente para prévia</button> : null}<p>Extração: {a.extraction_status} · Qualidade: {a.extraction_quality}</p>{a.privacy_alerts.length ? <p className="text-amber-800">Possíveis dados pessoais: revise o documento e o texto antes da aprovação.</p> : null}{a.extracted_text ? <details><summary>Texto extraído</summary><pre className="max-h-80 overflow-auto whitespace-pre-wrap text-sm">{a.extracted_text}</pre></details> : null}</article>)}
        {editable ? <fieldset disabled={busy} className="space-y-3"><label className="block">Arquivo<input className={control} type="file" accept={projectMemoryAcceptedExtensions.map(e => `.${e}`).join(",")} onChange={e => setFile(e.target.files?.[0] ?? null)} /></label><label className="block">Entrega associada ao anexo<select className={control} value={fileDelivery} onChange={e => setFileDelivery(e.target.value)}><option value="">Documento do relatório</option>{deliveries.map(d => <option key={d.id} value={d.id}>{d.title}</option>)}</select></label><div className="flex flex-wrap gap-3"><button type="button" disabled={!file} className={button} onClick={() => void run(upload)}>Anexar material</button><button type="button" disabled={!file || Boolean(fileDelivery)} className={button} onClick={() => void run(() => extract())}>Importar DOCX/PDF para prévia</button></div></fieldset> : null}
        {preview ? <div className="space-y-3"><h3 className="font-semibold">Prévia de preenchimento</h3>{monthlyFields.filter(([key]) => preview[key]).map(([key,label]) => <div key={key}><strong>{label}</strong><p className="whitespace-pre-wrap">{preview[key]}</p></div>)}<p>Aplicar substitui somente as seções identificadas. Confira e salve o rascunho depois.</p><button disabled={busy || !editable} className={button} onClick={() => { if (window.confirm("Substituir os campos identificados pela prévia? Alterações manuais nessas seções serão substituídas.")) { setContent(previous => ({ ...previous, ...preview })); setPreview(null); setMessage("Prévia aplicada. Confira os campos e salve o rascunho."); } }}>Aplicar prévia aos campos</button><button className={button} onClick={() => setPreview(null)}>Descartar prévia</button></div> : null}
      </div>
      <div className={panel}><h2 className="text-lg font-semibold">Revisão técnica</h2>
        {editable ? <button disabled={busy} className={button} onClick={() => void run(() => transition("submitted"))}>Salvar e enviar para revisão</button> : null}
        {data.reviewer && report.status === "submitted" ? <button disabled={busy} className={button} onClick={() => void run(() => transition("in_review"))}>Iniciar revisão</button> : null}
        {data.reviewer && (report.status === "in_review" || report.status === "approved") ? <fieldset disabled={busy} className="space-y-3"><label className="block">Observação ou justificativa<textarea className={control} value={note} onChange={e => setNote(e.target.value)} /></label>{report.status === "in_review" ? <>{Object.entries(approvalChecks).map(([key,label]) => <label className="block" key={key}><input type="checkbox" checked={Boolean(checks[key])} onChange={e => setChecks({ ...checks, [key]: e.target.checked })} /> {label}</label>)}<button className={button} disabled={!Object.keys(approvalChecks).every(k => checks[k])} onClick={() => void run(() => transition("approved"))}>Aprovar revisão técnica</button></> : null}<button className={button} disabled={!note.trim()} onClick={() => void run(() => transition("needs_changes"))}>{report.status === "approved" ? "Reabrir com justificativa" : "Solicitar ajustes"}</button></fieldset> : null}
        <h3 className="font-semibold">Histórico de revisão</h3><ul className="space-y-2">{history.map(h => <li key={h.id}>{new Date(h.created_at).toLocaleString("pt-BR")} · {h.from_status ? `${monthlyStatuses[h.from_status]} → ` : ""}{monthlyStatuses[h.to_status]} · {data.members.find(m => m.profile_id === h.actor_id)?.display_name ?? h.actor_id}{h.note ? ` · ${h.note}` : ""}{h.attachment_id ? ` · Documento: ${attachments.find(a => a.id === h.attachment_id)?.file_name ?? h.attachment_id}` : ""}</li>)}</ul>
      </div>
      {data.reviewer && report.status === "approved" ? <div className={panel}><h2 className="text-lg font-semibold">Criar entrada interna de memória</h2><p>Selecione e adapte um resultado aprovado. A entrada manterá a referência deste relatório e não será publicada automaticamente.</p><label className="block">Título da entrada<input className={control} value={memoryTitle} onChange={e => setMemoryTitle(e.target.value)} /></label><label className="block">Conteúdo selecionado<textarea rows={5} className={control} value={memoryBody} onChange={e => setMemoryBody(e.target.value)} /></label><button disabled={busy} className={button} onClick={() => void run(createMemory)}>Criar memória interna</button></div> : null}
    </>}
  </section>;
}
