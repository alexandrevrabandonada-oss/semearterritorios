/**
 * Domínio de pré-ingestão privada. Somente representa fontes recebidas.
 * Não cria escuta APS, atividade técnica, aprovação ou pessoa única.
 */
import { createHash } from "node:crypto";
import { FEC_MAX_UPLOAD, FEC_MAX_TOTAL_BYTES } from "./fec-upload-limits.mjs";
import {
  buildFecImportPreview,
  parseFecDocument,
  questionnaireNameKeysInternal,
  type FecDocumentPreview,
} from "./fec-document-import";

export const FEC_IMPORT_BUCKET = "fec-import-private";
// Uploads pass through a Vercel Function: leave headroom for multipart fields
// beneath the platform's 4.5 MB request-body limit.
export { FEC_MAX_UPLOAD, FEC_MAX_TOTAL_BYTES };
export type FecIntakeKind = "monthly_report" | "questionnaires" | "supporting";
export type IntakeInput = { fileName: string; buffer: Buffer; text: string; kind?: FecIntakeKind };
export type StagedFile = IntakeInput & {
  kind: FecIntakeKind;
  extension: "pdf" | "docx";
  mimeType: string;
  sha256: string;
  parsed: FecDocumentPreview;
};
export type StagedForm = {
  code: string;
  sourceCode: string;
  kind: "questionnaires";
  sourceSha256: string;
  locality: string;
  questions: { number: number; question: string; answer: string }[];
  simulatedOverlap: boolean | null;
  sourcePages: number[]; // não inferir número sem recuperação verificável
};
export type ValidatedIntake = {
  month: string;
  files: StagedFile[];
  forms: StagedForm[];
  preview: ReturnType<typeof buildFecImportPreview>;
};

const monthRx = /^20\d{2}-(0[1-9]|1[0-2])$/;
const trimName = (name: string) => name.replace(/[\x00-\x1f]/g, " ").trim().slice(0, 180);
const normalize = (value: string) => value.normalize("NFD")
  .replace(/[\u0300-\u036f]/g, "")
  .replace(/\s+/g, " ").trim().toLocaleLowerCase("pt-BR");

export function validFecMonth(month: unknown): month is string {
  return typeof month === "string" && monthRx.test(month);
}
export function validateFecIntake(month: string, inputs: IntakeInput[]): ValidatedIntake {
  if (!validFecMonth(month)) throw new Error("Mês inválido. Use AAAA-MM.");
  if (!Array.isArray(inputs) || inputs.length < 1 || inputs.length > 6)
    throw new Error("Envie o relatório, fichas opcionais e até quatro anexos PDF/DOCX.");
  const files: StagedFile[] = [];
  const kinds = new Set<string>();
  const digests = new Set<string>();
  let totalBytes = 0;
  for (const input of inputs) {
    const filename = trimName(input.fileName);
    if (!filename || !Buffer.isBuffer(input.buffer) || !input.buffer.length || input.buffer.length > FEC_MAX_UPLOAD)
      throw new Error("Nome ou tamanho de arquivo inválido (máximo 4 MB).");
    totalBytes += input.buffer.length;
    if (totalBytes > FEC_MAX_TOTAL_BYTES) throw new Error("O total dos documentos excede 4 MB.");
    const ext = filename.split(".").at(-1)?.toLowerCase();
    if (ext !== "pdf" && ext !== "docx") throw new Error("Arquivamento privado aceita somente PDF e DOCX.");
    if (ext === "pdf" && input.buffer.subarray(0, 5).toString("ascii") !== "%PDF-")
      throw new Error("Assinatura de PDF inválida.");
    if (ext === "docx" && input.buffer.subarray(0, 2).toString("ascii") !== "PK")
      throw new Error("Assinatura de DOCX inválida.");
    if (input.kind !== "supporting" && (!input.text || input.text.trim().length < 25 || input.text.length > 500_000))
      throw new Error("Texto do documento ilegível ou excessivo; revisão manual necessária.");
    const sha256 = createHash("sha256").update(input.buffer).digest("hex");
    if (digests.has(sha256)) throw new Error("Os arquivos recebidos são idênticos.");
    digests.add(sha256);
    const parsed = parseFecDocument(input.text, filename, sha256, input.kind);
    if (input.kind) parsed.kind = input.kind;
    if (parsed.kind === "unrecognized") { parsed.kind="monthly_report"; parsed.warnings.push("Documento recebido para conferência; a extração é sugestão e não comprova atividades ou entrevistas."); }
    if (parsed.kind === "questionnaires" && !parsed.questionnaires.length) {
      if (!input.kind) parsed.kind = "monthly_report";
      parsed.warnings.push("Fichas não identificadas com segurança; conferir o documento original.");
    }
    if (parsed.kind !== "supporting" && kinds.has(parsed.kind)) throw new Error("Inclua no máximo um relatório e um arquivo de fichas por lote.");
    if (parsed.kind !== "supporting" && parsed.referenceMonth && parsed.referenceMonth !== month)
      throw new Error("Mês do documento diverge do mês informado.");
    if (parsed.kind !== "supporting") kinds.add(parsed.kind);
    files.push({ ...input, kind: parsed.kind, fileName: filename, extension: ext,
      mimeType: ext === "pdf" ? "application/pdf" : "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      sha256, parsed });
  }
  const names = files.flatMap(f => f.parsed.kind === "questionnaires" ? questionnaireNameKeysInternal(f.text) : []);
  const preview = buildFecImportPreview(files.map(f => f.parsed), names);
  const tooManyForms=preview.questionnaires.length>200;
  if(tooManyForms)preview.warnings.push("Muitas fichas para extração automática; o documento segue para conferência manual.");
  const report = files.find(f => f.parsed.kind === "monthly_report");
  // Documento sem exemplos extraíveis não permite concluir ausência de coincidência.
  const simulatedKeys = report?.parsed.illustrativeParticipantKeys.length
    ? new Set(report.parsed.illustrativeParticipantKeys.map(normalize)) : null;
  const forms: StagedForm[] = [];
  const sourceIds = new Set<string>();
  const questionnairesFiles = files.filter(f => f.parsed.kind === "questionnaires");
  for (const f of questionnairesFiles) {
    if(tooManyForms)continue;
    const sourceNames = questionnaireNameKeysInternal(f.text);
    const qrows=f.parsed.questionnaires;
    const incomplete=sourceNames.length!==qrows.length || new Set(qrows.map(q=>q.code)).size!==qrows.length || qrows.some(q=>q.questionCount!==6||q.answers.length!==6||q.answers.some((a,i)=>a.number!==i+1||!a.question.trim()||!a.answer||a.answer.length>5000));
    if(incomplete){preview.warnings.push("Algumas fichas não foram extraídas com segurança. O documento foi recebido para conferência manual.");continue;}
    f.parsed.questionnaires.forEach((q, i) => {
      if (sourceIds.has(q.code)) throw new Error("Há código duplicado entre fichas.");
      sourceIds.add(q.code);
      forms.push({code:`FEC-${month}-F${String(forms.length+1).padStart(2,"0")}`,
        sourceCode:q.code, kind:"questionnaires", sourceSha256:f.sha256,
        locality:q.locality ?? "Localidade não indicada",questions:q.answers,
        simulatedOverlap:simulatedKeys ? simulatedKeys.has(normalize(sourceNames[i])) : null,
        sourcePages:[] });
    });
  }
  return {month,files,forms,preview};
}

export type FecReviewDecision =
  | "proof_requested" | "documentary_only" | "excluded" | "inconclusive" | "evidence_reviewed" | "attested_pending_technical_review";
export type FecReviewRequest = {
  formId:string; expectedRevision:number; decision:FecReviewDecision; reason:string;
  independentEvidenceRef:string; fieldDate:string|null; interviewerRef:string; evidenceMethod:string; evidenceOrigin:string; evidenceLocation:string;
  interviewerConfirmation:boolean; sixVsTenReconciled:boolean;
};
export function reviewSubmissionIssues(data:unknown, simulatedOverlap:boolean|null):string[] {
  const errors:string[]=[];
  if (!data || typeof data!=="object" || Array.isArray(data)) return ["Decisão de revisão inválida."];
  const d=data as Record<string,unknown>;
  const valid = ["proof_requested","documentary_only","excluded","inconclusive","evidence_reviewed","attested_pending_technical_review"];
  if(typeof d.formId!=="string"||!uuidRx.test(d.formId))errors.push("Ficha inválida.");
  if(!Number.isInteger(d.expectedRevision) || Number(d.expectedRevision)<0 || Number(d.expectedRevision)>2147483646)errors.push("Versão da revisão inválida.");
  if(!valid.includes(String(d.decision)))errors.push("Decisão não permitida.");
  if(typeof d.reason!=="string"||d.reason.trim().length<20||d.reason.length>3000)errors.push("Justificativa entre 20 e 3.000 caracteres obrigatória.");
  if(typeof d.independentEvidenceRef!=="string"||d.independentEvidenceRef.length>600)errors.push("Referência de prova inválida.");
  for(const [key,max] of [["interviewerRef",300],["evidenceMethod",300],["evidenceOrigin",300],["evidenceLocation",600]] as const) {
    const value=d[key];
    if(value!==undefined && (typeof value!=="string" || value.length>max))errors.push("Campo de evidência inválido.");
    if(d.decision==="attested_pending_technical_review" && (typeof value!=="string" || value.trim().length<5))errors.push("Aplicador, método, origem e localização da prova são obrigatórios.");
  }
  if(d.decision==="attested_pending_technical_review")errors.push("Atestação bloqueada até verificação independente confiável.");
  if(["inconclusive","evidence_reviewed"].includes(String(d.decision)) && (typeof d.responseId!=="string" || !uuidRx.test(d.responseId)))errors.push("Selecione resposta com evidência disponível.");
  if(d.responseId!==undefined && d.responseId!==null && (typeof d.responseId!=="string" || !uuidRx.test(d.responseId)))errors.push("Resposta inválida.");
  if(d.decision==="attested_pending_technical_review"){
    if(simulatedOverlap!==false)errors.push("Ficha simulada ou ainda não comparada: exigir apuração independente antes de qualquer atestação.");
    if(typeof d.fieldDate!=="string"||!validDate(d.fieldDate))errors.push("Data comprovada de campo obrigatória.");
    if(d.interviewerConfirmation!==true)errors.push("Confirmação documentada do aplicador obrigatória.");
    if(d.sixVsTenReconciled!==true)errors.push("Divergência entre 6 e 10 perguntas precisa ser esclarecida.");
    if(typeof d.independentEvidenceRef!=="string"||d.independentEvidenceRef.trim().length<15)errors.push("Referência independente da ficha obrigatória.");
  }
  if(d.interviewerConfirmation!==true&&d.interviewerConfirmation!==false)errors.push("Confirmação do aplicador inválida.");
  if(d.sixVsTenReconciled!==true&&d.sixVsTenReconciled!==false)errors.push("Conferência metodológica inválida.");
  if(d.fieldDate!==null&&d.fieldDate!==undefined&&(typeof d.fieldDate!=="string"||!validDate(d.fieldDate)))errors.push("Data inválida.");
  const keys = ["formId","expectedRevision","decision","reason","independentEvidenceRef","fieldDate","interviewerConfirmation","sixVsTenReconciled","interviewerRef","evidenceMethod","evidenceOrigin","evidenceLocation","responseId"];
  if(Object.keys(d).some(k=>!keys.includes(k)))errors.push("Campos extras não aceitos.");
  return errors;
}
export const uuidRx=/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i;
function validDate(s:string) {
  if(!/^20\d{2}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/.test(s))return false;
  const d=new Date(s+"T12:00:00Z");return !Number.isNaN(d.valueOf())&&d.toISOString().slice(0,10)===s;
}
