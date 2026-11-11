/**
 * Revisão da origem documental FEC. Não produz aprovação técnica, aceite contratual
 * ou contagem oficial. Não inclui identificações pessoais.
 */
export type ReviewState =
  | "pending"
  | "proof_requested"
  | "documentary_only"
  | "excluded"
  | "field_attested_pending_supervision";
export type SourceQuestion = { pergunta: number; enunciado: string; resposta_relato: string };
export type FecReviewCase = {
  code: string;
  locality: string;
  sourcePages: number[];
  originalSha256: string;
  questions: SourceQuestion[];
  simulatedOverlap: boolean | null;
  status: ReviewState;
  fieldDate: string | null;
  supportingEvidenceReference: string;
  supportingEvidenceKind: "" | "dated_field_record" | "contemporaneous_log" | "supervisor_document" | "other_independent_document";
  interviewerConfirmed: boolean;
  questionsProtocolReconciled: boolean;
  reviewerNote: string;
  revisedBy: string;
  revisedAt: string | null;
};
export const REVIEW_STATES: ReadonlyArray<{value:ReviewState;label:string}> = [
  {value:"pending",label:"Aguardando conferência"},
  {value:"proof_requested",label:"Solicitar prova de aplicação"},
  {value:"documentary_only",label:"Apenas registro documental"},
  {value:"excluded",label:"Excluir da análise"},
  {value:"field_attested_pending_supervision",label:"Aplicação atestada; supervisão pendente"},
];
const text = (v:unknown):v is string => typeof v === "string";
export function validFieldDate(s:string|null): boolean {
  if(!s || !/^20\d\d-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/.test(s))return false;
  const d=new Date(s+"T12:00:00Z");
  return !Number.isNaN(d.valueOf())&&d.toISOString().slice(0,10)===s;
}
export function reviewIssues(c:FecReviewCase): string[] {
  const issues:string[]=[];
  if(!/^FEC-2026-10-F\d{2}$/.test(c.code))issues.push("Código de ficha inválido.");
  if(!Array.isArray(c.questions)||c.questions.length!==6||c.questions.some((q,i)=>q.pergunta!==i+1||!text(q.enunciado)||!q.enunciado.trim()||!text(q.resposta_relato)||!q.resposta_relato.trim()))issues.push("As seis respostas precisam ser conferidas com o PDF.");
  if(!Array.isArray(c.sourcePages)||!c.sourcePages.every(p=>Number.isInteger(p)&&p>0)||(c.status==="field_attested_pending_supervision"&&c.sourcePages.length===0))issues.push("Informe a página de origem verificada antes de atestar.");
  if(!/^[a-f0-9]{64}$/.test(c.originalSha256))issues.push("Hash da origem inválido.");
  if(c.status!=="pending" && c.reviewerNote.trim().length<20)issues.push("Registre justificativa descritiva (mínimo 20 caracteres).");
  if(c.status==="field_attested_pending_supervision"){
    if(!validFieldDate(c.fieldDate))issues.push("Uma data real de aplicação é obrigatória.");
    if(!c.interviewerConfirmed)issues.push("Confirmação documental do aplicador é obrigatória.");
    if(!c.questionsProtocolReconciled)issues.push("Justifique a diferença entre o roteiro de dez e a ficha de seis perguntas.");
    if(c.supportingEvidenceReference.trim().length<15 || !c.supportingEvidenceKind)
      issues.push("Inclua referência verificável de prova de campo independente das fichas importadas.");
    if(c.simulatedOverlap!==false)issues.push("Exemplo simulado ou comparação indisponível: a atestação exige análise independente pela supervisão.");
  }
  return issues;
}
export function summarizeReview(cases:FecReviewCase[]){
  const states:Record<ReviewState,number>={pending:0,proof_requested:0,documentary_only:0,excluded:0,field_attested_pending_supervision:0};
  for(const c of cases)states[c.status]++;
  return {totalDocumentaryForms:cases.length,simulatedExampleOverlaps:cases.filter(c=>c.simulatedOverlap).length,
    states,validReadyForSupervisor:cases.filter(c=>c.status==="field_attested_pending_supervision"&&reviewIssues(c).length===0).length,
    officialInterviews:null,uniqueParticipants:null,publicReleaseAllowed:false,automaticPromotionAllowed:false} as const;
}
/** Recebe apenas pacotes anônimos produzidos pelo extrator anterior; exige hashes e páginas. */
export function makeReviewCases(data:unknown):FecReviewCase[] {
  if(!data||typeof data!=="object"||Array.isArray(data))throw new Error("Pacote inválido.");
  const v=data as Record<string,unknown>;
  if(v.schema==="semear.fec.preview.1" && Array.isArray(v.questionnaires) && Array.isArray(v.sources)) {
    const source=(v.sources as Array<Record<string,unknown>>).find(s=>s.kind==="questionnaires");
    if(typeof source?.sha256!=="string"||!/^[a-f0-9]{64}$/.test(source.sha256))throw new Error("Falta SHA-256 de origem.");
    return v.questionnaires.map((raw:unknown,i:number)=>{
      if(!raw||typeof raw!=="object"||Array.isArray(raw))throw new Error("Ficha inválida.");
      const q=raw as Record<string,unknown>;
      if(!Array.isArray(q.answers)||q.answers.length!==6||!(q.simulatedOverlap===true||q.simulatedOverlap===false||q.simulatedOverlap===null))throw new Error("Prévia incompleta.");
      const c:FecReviewCase={code:`FEC-2026-10-F${String(i+1).padStart(2,"0")}`,locality:typeof q.locality==="string"?q.locality:"Localidade não indicada",sourcePages:[],originalSha256:source.sha256 as string,
        questions:q.answers.map((a:unknown)=>{const item=a as Record<string,unknown>;return {pergunta:Number(item.number),enunciado:String(item.question??""),resposta_relato:String(item.answer??"")};}),
        simulatedOverlap:q.simulatedOverlap as boolean|null,status:"pending",fieldDate:null,supportingEvidenceReference:"",supportingEvidenceKind:"",interviewerConfirmed:false,questionsProtocolReconciled:false,reviewerNote:"",revisedBy:"",revisedAt:null};
      if(reviewIssues(c).length)throw new Error("Ficha requer correção antes de abrir revisão.");
      return c;
    });
  }
  if(v.versao_schema!=="semear.fec.pre_importacao.1"||!Array.isArray(v.fichas_documentais))throw new Error("Modelo de pré-importação desconhecido.");
  const sources=v.fontes as Record<string,{sha256?:unknown}>;
  const sha=sources?.fichas?.sha256;
  if(typeof sha!=="string"||!/^[a-f0-9]{64}$/.test(sha))throw new Error("Falta SHA-256 de origem.");
  return v.fichas_documentais.map((raw:unknown,i:number)=>{
    if(!raw || typeof raw!=="object" || Array.isArray(raw))throw new Error("Ficha inválida.");
    const q=raw as Record<string,unknown>;
    if(typeof q.codigo!=="string"||typeof q.localidade!=="string"||!Array.isArray(q.respostas)||!Array.isArray(q.paginas_fonte))throw new Error("Campos de ficha incompletos.");
    if(typeof q.coincide_com_exemplo_simulado!=="boolean")throw new Error("Falta sinalização auditável da comparação com exemplos simulados.");
    const c:FecReviewCase={code:q.codigo,locality:q.localidade,sourcePages:q.paginas_fonte as number[],originalSha256:sha,
      questions:q.respostas as SourceQuestion[],simulatedOverlap:q.coincide_com_exemplo_simulado as boolean,status:"pending",fieldDate:null,supportingEvidenceReference:"",supportingEvidenceKind:"",
      interviewerConfirmed:false,questionsProtocolReconciled:false,reviewerNote:"",revisedBy:"",revisedAt:null};
    if(reviewIssues(c).length)throw new Error("Ficha "+c.code+" requer correção antes de abrir revisão.");
    return c;
  });
}
export function exportReviewPacket(cases:FecReviewCase[]){
  if(cases.some(c=>reviewIssues(c).length))throw new Error("Existem decisões incompletas ou sem prova; corrija antes de exportar.");
  if(new Set(cases.map(c=>c.code)).size!==cases.length)throw new Error("Há fichas duplicadas.");
  return {schema:"semear.fec.review.1",scope:"FEC; conferência documental ainda não homologada",createdAt:new Date().toISOString(),cases,
    summary:summarizeReview(cases),publish:false,writeToOfficialIndicators:false};
}
