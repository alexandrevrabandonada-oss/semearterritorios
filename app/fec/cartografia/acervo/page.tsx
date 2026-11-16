"use client";

import {useEffect,useMemo,useState,type FormEvent} from "react";
import {FecShell} from "@/components/fec/fec-shell";

type Cycle={id:string;title:string;engagement_id:string;owner_id:string;status:string;neighborhood_id:string};
type Catalog={userId:string;cycles:Cycle[];neighborhoods:{id:string;name:string}[];grants:{engagement_id:string;role:string;active:boolean}[]};
type Batch={id:string;cycle_id:string;reference_month:string;created_at:string;owner_id:string;description:string;suggestions?:{warnings?:string[];activities?:{date:string;description:string}[]}};
type ReportReview={id:string;revision:number;decision:string;reason:string;created_at:string};
type Document={id:string;source_name:string;kind:string;sha256:string;upload_state:string};
type Form={id:string;code:string;locality:string;simulated_overlap:boolean|null;comparison_verified:boolean;questions:{number:number;question:string;answer:string}[];source_pages:number[]};
type Review={id:string;form_id:string;revision:number;decision:string;reason:string;created_at:string};
type Evidence={id:string;request_review_id:string;form_id:string;field_date:string;method:string;responsible_ref:string;source_ref:string;explanation:string;upload_state:string};
type Detail={batch:Batch;documents:Document[];forms:Form[];reviews:Review[];responses:Evidence[];reportReviews:ReportReview[];activities:{id:string;activity_date:string;objective:string;status:string}[];activitiesTruncated:boolean};
const field="w-full rounded-lg border border-stone-300 bg-white p-2 text-sm";
async function requestJson<T>(url:string,options?:RequestInit):Promise<T>{
 const response=await fetch(url,{...options,credentials:"same-origin",cache:"no-store"});
 const json=await response.json();
 if(!response.ok)throw new Error(json.error??"Falha ao consultar o acervo FEC.");
 return json as T;
}
export default function FecAcervoPage(){
 const [catalog,setCatalog]=useState<Catalog|null>(null);
 const [cycleId,setCycleId]=useState("");
 const [month,setMonth]=useState(()=>new Date().toISOString().slice(0,7));
 const [summary,setSummary]=useState("");
 const [reportDecision,setReportDecision]=useState("document_checked");
 const [reportReason,setReportReason]=useState("");
 const [reportFile,setReportFile]=useState<File|null>(null);
 const [questionnairesFile,setQuestionnairesFile]=useState<File|null>(null);
 const [attachmentFiles,setAttachmentFiles]=useState<File[]>([]);
 const [batches,setBatches]=useState<Batch[]>([]);
 const [detail,setDetail]=useState<Detail|null>(null);
 const [selectedForm,setSelectedForm]=useState("");
 const [decision,setDecision]=useState("proof_requested");
 const [reason,setReason]=useState("");
 const [fieldDate,setFieldDate]=useState("");
 const [evidence,setEvidence]=useState("");
 const [interviewerRef,setInterviewerRef]=useState("");
 const [evidenceMethod,setEvidenceMethod]=useState("");
 const [evidenceOrigin,setEvidenceOrigin]=useState("");
 const [evidenceLocation,setEvidenceLocation]=useState("");
 const [evidenceFile,setEvidenceFile]=useState<File|null>(null);
 const [explanation,setExplanation]=useState("");
 const [confirmed,setConfirmed]=useState(false);
 const [reconciled,setReconciled]=useState(false);
 const [busy,setBusy]=useState(false);
 const [info,setInfo]=useState("");
 const [error,setError]=useState("");
 function validateSelectedFiles(files:(File|null)[]){
  const selected=files.filter((file):file is File=>file!==null);
  if(selected.length>6){setError("Envie até quatro anexos além do relatório e das fichas.");return false;}
  if(selected.some(file=>file.size<1||file.size>4*1024*1024)||selected.reduce((sum,file)=>sum+file.size,0)>4*1024*1024){
   setError("O total de PDFs/DOCX precisa ter até 4 MB.");return false;
  }
  setError("");return true;
 }
 useEffect(()=>{requestJson<Catalog>("/api/fec/catalog").then(setCatalog).catch(e=>setError(String(e)));},[]);
 const activeCycle=useMemo(()=>catalog?.cycles.find(c=>c.id===cycleId),[catalog,cycleId]);
 const current=detail?.forms.find(f=>f.id===selectedForm);
 const currentReview=detail?.reviews.find(r=>r.form_id===selectedForm);
 const currentEvidence=detail?.responses.find(r=>r.form_id===selectedForm&&r.request_review_id===currentReview?.id&&r.upload_state==="uploaded");
 const isOwner=Boolean(catalog&&detail&&catalog.userId===detail.batch.owner_id);
 const isSupervisor=Boolean(catalog&&detail&&detail.batch.owner_id!==catalog.userId&&
   catalog.grants.some(g=>g.active&&g.role==="supervisor"&&g.engagement_id===catalog.cycles.find(c=>c.id===detail.batch.cycle_id)?.engagement_id));
 async function listBatches(id=cycleId){setError("");setInfo("");try{
  const data=await requestJson<{batches:Batch[]}>(`/api/fec/import-batches?cycleId=${encodeURIComponent(id)}`);
  setBatches(data.batches);setDetail(null);
 }catch(e){setError(e instanceof Error?e.message:String(e));}}
 async function openBatch(id:string){setBusy(true);setError("");try{
  const data=await requestJson<Detail>(`/api/fec/import-batches?batchId=${encodeURIComponent(id)}`);
  setDetail(data);setSelectedForm(data.forms[0]?.id??"");setReason("");setDecision("proof_requested");
 }catch(e){setError(e instanceof Error?e.message:String(e));}finally{setBusy(false);}}
 async function upload(event:FormEvent){event.preventDefault();setError("");setInfo("");
  if(!reportFile||!cycleId){setError("Escolha um ciclo e o relatório principal.");return;}
  if(!validateSelectedFiles([reportFile,questionnairesFile,...attachmentFiles]))return;
  const data=new FormData();data.set("cycleId",cycleId);data.set("month",month);data.set("description",summary);
  data.set("report",reportFile);
  if(questionnairesFile)data.set("questionnaires",questionnairesFile);
  for(const file of attachmentFiles)data.append("attachments",file);
  setBusy(true);try{
   const result=await requestJson<{batchId:string;documentaryForms:number;simulatedExampleOverlaps:number}>("/api/fec/import-batches",{method:"POST",body:data});
   await listBatches(cycleId);await openBatch(result.batchId);
   setInfo(`Relatório enviado. ${result.documentaryForms} ficha(s) identificadas e ${result.simulatedExampleOverlaps} alerta(s) para conferência. Nenhum indicador foi atualizado.`);
  }catch(e){setError(e instanceof Error?e.message:String(e));}finally{setBusy(false);}
 }
 async function review(event:FormEvent){event.preventDefault();if(!current)return;setBusy(true);setError("");setInfo("");try{
  await requestJson("/api/fec/import-reviews",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({
   formId:current.id,expectedRevision:Math.max(0,...detail!.reviews.filter(r=>r.form_id===current.id).map(r=>r.revision)),decision,reason,fieldDate:fieldDate||null,independentEvidenceRef:evidence,
   responseId:["inconclusive","evidence_reviewed"].includes(decision)?currentEvidence?.id:null,
   interviewerRef,evidenceMethod,evidenceOrigin,evidenceLocation,interviewerConfirmation:confirmed,sixVsTenReconciled:reconciled,
  })});
  setInfo("Decisão registrada na trilha documental. Não equivale a aprovação técnica nem a contagem de entrevista.");
  setReason("");setEvidence("");setFieldDate("");setInterviewerRef("");setEvidenceMethod("");setEvidenceOrigin("");setEvidenceLocation("");setConfirmed(false);setReconciled(false);
  if(detail)await openBatch(detail.batch.id);
 }catch(e){setError(e instanceof Error?e.message:String(e));}finally{setBusy(false);}}
 async function submitEvidence(event:FormEvent){event.preventDefault();if(!current||!currentReview||!evidenceFile)return;setBusy(true);setError("");setInfo("");
  try{const data=new FormData();data.set("requestReviewId",currentReview.id);data.set("formId",current.id);data.set("fieldDate",fieldDate);data.set("method",evidenceMethod);data.set("responsibleRef",interviewerRef);data.set("sourceRef",evidenceOrigin);data.set("explanation",explanation);data.set("file",evidenceFile);
   await requestJson("/api/fec/evidence-responses",{method:"POST",body:data});setInfo("Resposta e PDF recebidos; a entrevista continua não comprovada e depende de conferência.");setEvidenceFile(null);setExplanation("");if(detail)await openBatch(detail.batch.id);
  }catch(e){setError(e instanceof Error?e.message:String(e));}finally{setBusy(false);}}
 async function openEvidence(id:string){setError("");try{const data=await requestJson<{url:string}>(`/api/fec/evidence-responses?id=${encodeURIComponent(id)}`);window.open(data.url,"_blank","noopener,noreferrer");}catch(e){setError(e instanceof Error?e.message:String(e));}}
 async function finishReport(event:FormEvent){event.preventDefault();if(!detail)return;setBusy(true);setError("");setInfo("");try{
  await requestJson("/api/fec/import-reviews",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({reportId:detail.batch.id,expectedRevision:detail.reportReviews[0]?.revision??0,decision:reportDecision,reason:reportReason})});
  const id=detail.batch.id;await openBatch(id);setReportReason("");setInfo(reportDecision==="document_checked"?"Relatório conferido. Isso não comprova entrevistas individuais.":"Pedido de ajustes registrado.");
 }catch(e){setError(e instanceof Error?e.message:String(e));}finally{setBusy(false);}}
 async function openOriginal(id:string){setError("");try{
  const data=await requestJson<{url:string}>(`/api/fec/import-documents?id=${encodeURIComponent(id)}`);
  window.open(data.url,"_blank","noopener,noreferrer");
 }catch(e){setError(e instanceof Error?e.message:String(e));}}
 return <FecShell><div className="space-y-6">
  <header><h1 className="text-2xl font-bold text-semear-green">Relatórios FEC</h1>
   <p className="mt-2 text-sm text-stone-700">Envie seu relatório, confira o conteúdo e registre a análise. Os arquivos ficam privados.</p></header>
  {error&&<div role="alert" className="rounded-lg border border-red-300 bg-red-50 p-3 text-sm text-red-900">{error}</div>}
  {info&&<div role="status" className="rounded-lg border border-stone-200 bg-white p-3 text-sm">{info}</div>}
  <section id="enviar" className="rounded-xl border bg-white p-5 space-y-4">
   <h2 className="text-lg font-bold">1. Enviar relatório</h2>
   <form onSubmit={upload} className="space-y-4">
    <label className="block text-sm font-semibold">Território e trabalho
     <select className={field} value={cycleId} onChange={e=>{setCycleId(e.target.value);setBatches([]);setDetail(null);}} required>
      <option value="">Selecione</option>{catalog?.cycles.map(c=><option key={c.id} value={c.id}>{catalog.neighborhoods.find(n=>n.id===c.neighborhood_id)?.name??"Território"} · {c.title}</option>)}
     </select></label>
    <label className="block text-sm font-semibold">Mês de referência
     <input className={field} type="month" value={month} onChange={e=>setMonth(e.target.value)} required/></label>
    <label className="block text-sm font-semibold">Resumo do trabalho
     <textarea className={field} required maxLength={2000} value={summary} onChange={e=>setSummary(e.target.value)}/></label>
    <label className="block text-sm font-semibold">Relatório principal (PDF ou DOCX)
     <input className={field} type="file" accept=".pdf,.docx" required onChange={e=>{const file=e.target.files?.[0]??null;if(validateSelectedFiles([file,questionnairesFile,...attachmentFiles]))setReportFile(file);else{setReportFile(null);e.currentTarget.value="";}}}/></label>
    {reportFile&&<p className="text-xs text-stone-600">Selecionado: {reportFile.name}</p>}
    <label className="block text-sm font-semibold">Fichas (opcional, PDF ou DOCX)
     <input className={field} type="file" accept=".pdf,.docx" onChange={e=>{const file=e.target.files?.[0]??null;if(validateSelectedFiles([reportFile,file,...attachmentFiles]))setQuestionnairesFile(file);else{setQuestionnairesFile(null);e.currentTarget.value="";}}}/></label>
    {questionnairesFile&&<p className="text-xs text-stone-600">Fichas selecionadas: {questionnairesFile.name}</p>}
    <label className="block text-sm font-semibold">Outros anexos autorizados (até 4 arquivos PDF/DOCX)
     <input className={field} type="file" accept=".pdf,.docx" multiple onChange={e=>{const files=Array.from(e.target.files??[]);if(files.length>4){setError("Envie até quatro anexos complementares.");setAttachmentFiles([]);e.currentTarget.value="";return;}if(validateSelectedFiles([reportFile,questionnairesFile,...files]))setAttachmentFiles(files);else{setAttachmentFiles([]);e.currentTarget.value="";}}}/></label>
    {attachmentFiles.length>0&&<p className="text-xs text-stone-600">Anexos selecionados: {attachmentFiles.map(file=>file.name).join(", ")}</p>}
    <p className="text-xs text-stone-600">Limite total: 4 MB por envio. Anexos complementares ficam privados e não são extraídos automaticamente.</p>
    <div className="flex gap-3 flex-wrap">
     <button type="submit" disabled={busy||!activeCycle||!reportFile} className="rounded-lg bg-semear-green px-4 py-2 text-white font-semibold disabled:opacity-50">{busy?"Enviando…":"Enviar relatório"}</button>

    </div>
   </form>
   <p className="text-xs text-stone-600">Você não precisa cadastrar fichas individualmente. O conteúdo extraído será apresentado para conferência.</p>
  </section>
  <section id="conferir" className="rounded-xl border bg-white p-4 space-y-2"><h2 className="font-bold">2. Conferir relatório</h2><p className="text-sm">Selecione o território acima e consulte os relatórios.</p><button type="button" disabled={!cycleId||busy} onClick={()=>listBatches()} className="rounded-lg border px-4 py-2 disabled:opacity-50">Ver relatórios</button>
   {batches.map(b=><button key={b.id} type="button" onClick={()=>openBatch(b.id)} className="block w-full rounded-lg border p-3 text-left text-sm hover:bg-stone-50"><strong>{b.reference_month.slice(0,7)}</strong> · recebido em {new Date(b.created_at).toLocaleDateString("pt-BR")} · <span className="underline">abrir conferência</span></button>)}
  </section>
  {detail&&<section id="finalizar" className="rounded-xl border bg-white p-5 space-y-4"><h2 className="font-bold text-lg">3. Finalizar análise</h2>
   <p className="text-sm"><strong>Resumo:</strong> {detail.batch.description||"Não informado"}</p>
   <div className="space-y-2">{detail.documents.map(d=><button key={d.id} type="button" disabled={d.upload_state!=="uploaded"} onClick={()=>openOriginal(d.id)} className="block underline disabled:opacity-50">Abrir {d.source_name}</button>)}</div>
   {detail.activities.length>0&&<div className="text-sm"><strong>Atividades cadastradas no território</strong>{detail.activities.map(a=><p key={a.id}>{a.activity_date}: {a.objective} · {a.status==="approved"?"aprovada":a.status==="submitted"?"aguardando revisão":"em elaboração"}</p>)}{detail.activitiesTruncated&&<p>Exibindo as 100 atividades mais recentes.</p>}</div>}
   {(detail.batch.suggestions?.activities?.length??0)>0&&<div className="text-sm"><strong>Atividades sugeridas pelo documento — conferir</strong>{detail.batch.suggestions?.activities?.map((a,i)=><p key={i}>{a.date}: {a.description}</p>)}</div>}
   {(detail.batch.suggestions?.warnings?.length??0)>0&&<div className="rounded-lg bg-amber-50 p-3 text-sm"><strong>Pontos para conferir</strong>{detail.batch.suggestions?.warnings?.map((w,i)=><p key={i}>{w}</p>)}</div>}
   <p className="text-sm">Conferir o relatório não comprova entrevistas individuais nem altera indicadores automaticamente.</p>
   {detail.reportReviews.map(r=><p key={r.id} className="text-sm">{r.decision==="document_checked"?"Relatório conferido":"Ajustes solicitados"}{r.reason?`: ${r.reason}`:""}</p>)}
   {isSupervisor&&<form onSubmit={finishReport} className="space-y-3"><label className="block text-sm">Decisão<select className={field} value={reportDecision} onChange={e=>setReportDecision(e.target.value)}><option value="document_checked">Relatório conferido</option><option value="needs_changes">Solicitar ajustes</option></select></label><label className="block text-sm">Justificativa {reportDecision==="needs_changes"?"(obrigatória)":"(opcional)"}<textarea className={field} maxLength={3000} minLength={reportDecision==="needs_changes"?20:undefined} required={reportDecision==="needs_changes"} value={reportReason} onChange={e=>setReportReason(e.target.value)}/></label><button disabled={busy} className="rounded-lg bg-semear-green px-4 py-2 text-white disabled:opacity-50">Registrar análise</button></form>}
  </section>}
  {detail&&<details className="rounded-xl border bg-white p-4"><summary className="cursor-pointer font-semibold">Ver fichas e evidências quando necessário</summary><section className="p-1 pt-4 space-y-4">
   <h2 className="font-bold text-lg">Detalhes do relatório {detail.batch.reference_month.slice(0,7)} · {detail.forms.length} fichas identificadas</h2>
   <p className="text-sm font-semibold">Entrevistas oficialmente verificadas: não determinadas. Pessoas únicas: não determinadas.</p>
   <div className="space-y-2">{detail.documents.map(d=><div key={d.id} className="flex gap-3 flex-wrap items-center rounded-lg border p-3 text-sm"><strong>{d.kind==="questionnaires"?"Fichas":d.kind==="supporting"?"Anexo":"Relatório"}</strong><span>{d.source_name}</span><span>{d.upload_state==="uploaded"?"Armazenado":"Pendente de reconciliação"}</span><button type="button" onClick={()=>openOriginal(d.id)} disabled={d.upload_state!=="uploaded"} className="underline disabled:opacity-50">Ver original privado</button></div>)}</div>
   {detail.forms.length>0&&<div className="grid gap-4 md:grid-cols-[220px_minmax(0,1fr)]">
    <nav aria-label="Fichas documentais" className="space-y-2 max-h-[600px] overflow-y-auto">{detail.forms.map(f=>{const r=detail.reviews.find(x=>x.form_id===f.id);return <button type="button" key={f.id} onClick={()=>{setSelectedForm(f.id);setReason("");setDecision("proof_requested");}} className={`w-full rounded-lg border p-3 text-left text-sm ${current?.id===f.id?"bg-stone-100":""}`}><strong>{f.code}</strong><span className="block">{f.locality}</span><span className="block text-xs">{f.simulated_overlap===true?"Coincide com simulação":f.simulated_overlap===null?"Comparação indisponível":"Pendente de prova"}</span><span className="block text-xs">{r?.decision??"Sem revisão"}</span></button>})}</nav>
    {current&&<div className="space-y-4"><h3 className="font-bold">{current.code} · {current.locality}</h3>
     <p className="text-sm">{current.simulated_overlap===true?"Alerta: exemplo simulado coincide com esta ficha; vedada atestação automática.":current.simulated_overlap===null?"Sem relatório comparável: não é possível descartar simulação.":"Sem coincidência identificada; autenticidade continua não demonstrada."}</p>
     <details className="rounded-lg border p-3"><summary className="cursor-pointer font-semibold text-sm">Mostrar respostas registradas no documento (acesso privado)</summary><p className="mt-2 text-xs text-stone-600">O texto pode ser resumo ou paráfrase do relatório, não transcrição literal de fala.</p><ol className="list-decimal pl-5 mt-3 space-y-2 text-sm">{current.questions.map(q=><li key={q.number}><strong>{q.question}</strong><p>{q.answer}</p></li>)}</ol></details>
     <div className="text-xs text-stone-600">Páginas: {current.source_pages.length?current.source_pages.join(", "):"não extraídas; conferir original"}</div>
     <h4 className="font-bold">Histórico de conferência</h4><div className="space-y-1 text-sm">{detail.reviews.filter(r=>r.form_id===current.id).map(r=><div key={r.id} className="rounded-lg border p-2"><strong>{r.decision}</strong> · {new Date(r.created_at).toLocaleString("pt-BR")}<p>{r.reason}</p></div>)}{!detail.reviews.some(r=>r.form_id===current.id)&&<p>Nenhuma decisão registrada.</p>}</div>
     <h4 className="font-bold">Respostas e evidências privadas</h4>
     {(detail.responses??[]).filter(r=>r.form_id===current.id).map(r=><div key={r.id} className="rounded-lg border p-3 text-sm"><p>Resposta apresentada · {r.upload_state==="uploaded"?"evidência recebida":"arquivo pendente de reconciliação"}</p><p>Data: {r.field_date} · Método: {r.method}</p><p>Responsável: {r.responsible_ref} · Origem: {r.source_ref}</p><p>{r.explanation}</p><button type="button" className="underline" disabled={r.upload_state!=="uploaded"} onClick={()=>openEvidence(r.id)}>Abrir evidência privada</button></div>)}
     {isOwner&&currentReview?.decision==="proof_requested"&&<form onSubmit={submitEvidence} className="rounded-lg border p-4 space-y-3"><h4 className="font-bold">Responder à solicitação</h4>
      <p className="text-xs">O PDF deve ser independente do documento de origem. Enviar não comprova aplicação de entrevista.</p>
      <label className="block text-sm">Data de campo<input type="date" required className={field} value={fieldDate} onChange={e=>setFieldDate(e.target.value)}/></label>
      <label className="block text-sm">Método<input required minLength={5} maxLength={1000} className={field} value={evidenceMethod} onChange={e=>setEvidenceMethod(e.target.value)}/></label>
      <label className="block text-sm">Referência do responsável<input required minLength={5} maxLength={300} className={field} value={interviewerRef} onChange={e=>setInterviewerRef(e.target.value)}/></label>
      <label className="block text-sm">Origem e localização da prova<input required minLength={5} maxLength={600} className={field} value={evidenceOrigin} onChange={e=>setEvidenceOrigin(e.target.value)}/></label>
      <label className="block text-sm">Esclarecimento<textarea required minLength={20} maxLength={3000} className={field} value={explanation} onChange={e=>setExplanation(e.target.value)}/></label>
      <label className="block text-sm">PDF de evidência<input required type="file" accept=".pdf" className={field} onChange={e=>setEvidenceFile(e.target.files?.[0]??null)}/></label>
      <button type="submit" disabled={busy||!evidenceFile} className="rounded-lg bg-semear-green px-4 py-2 text-white disabled:opacity-50">Enviar resposta privada</button>
     </form>}
     {isSupervisor&&<form onSubmit={review} className="rounded-lg border p-4 space-y-3"><h4 className="font-bold">Registrar decisão de supervisão</h4>
      <label className="block text-sm">Decisão<select className={field} value={decision} onChange={e=>setDecision(e.target.value)}><option value="proof_requested">Solicitar provas</option><option value="documentary_only">Manter somente como documento</option><option value="excluded">Excluir da análise</option><option value="evidence_reviewed" disabled={!currentEvidence}>Documento de apoio conferido</option><option value="inconclusive" disabled={!currentEvidence}>Conclusão inconclusiva</option><option value="attested_pending_technical_review" disabled>Atestação bloqueada</option></select></label>
      <label className="block text-sm">Fundamentação<textarea rows={3} required minLength={20} maxLength={3000} className={field} value={reason} onChange={e=>setReason(e.target.value)}/></label>
      <label className="block text-sm">Data de campo comprovada<input className={field} type="date" value={fieldDate} onChange={e=>setFieldDate(e.target.value)}/></label>
      <label className="block text-sm">Referência de prova independente<input className={field} maxLength={600} value={evidence} onChange={e=>setEvidence(e.target.value)} placeholder="ID de documento, sem nome de morador"/></label>
      {decision==="attested_pending_technical_review"&&<div className="space-y-3">
       <label className="block text-sm">Referência do aplicador<input className={field} maxLength={300} value={interviewerRef} onChange={e=>setInterviewerRef(e.target.value)} /></label>
       <label className="block text-sm">Método de conferência<input className={field} maxLength={300} value={evidenceMethod} onChange={e=>setEvidenceMethod(e.target.value)} /></label>
       <label className="block text-sm">Origem independente da prova<input className={field} maxLength={300} value={evidenceOrigin} onChange={e=>setEvidenceOrigin(e.target.value)} /></label>
       <label className="block text-sm">Localização privada da prova<input className={field} maxLength={600} value={evidenceLocation} onChange={e=>setEvidenceLocation(e.target.value)} /></label>
       <p className="text-xs">Utilize referências privadas mínimas; informações declaradas ainda exigem conferência independente.</p>
      </div>}
      <label className="flex gap-2 text-sm"><input type="checkbox" checked={confirmed} onChange={e=>setConfirmed(e.target.checked)}/>O aplicador confirmou documentalmente a entrevista</label>
      <label className="flex gap-2 text-sm"><input type="checkbox" checked={reconciled} onChange={e=>setReconciled(e.target.checked)}/>Foi esclarecida a diferença entre 6 e 10 perguntas</label>
      <button type="submit" disabled={busy} className="rounded-lg bg-semear-green px-4 py-2 text-white font-semibold disabled:opacity-50">Registrar decisão auditável</button>
      <p className="text-xs">A atestação exige comparação verificada por processo independente confiável; fichas simuladas ou não comparadas permanecem bloqueadas. Todas ficam fora de indicadores oficiais.</p>
     </form>}
    </div>}
   </div>}
  </section></details>}
 </div></FecShell>;
}
