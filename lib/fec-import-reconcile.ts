import { createHash, randomUUID } from "node:crypto";
import type { StagedFile, StagedForm, ValidatedIntake } from "./fec-import-persistence";

export type ManifestEntry = {
  id: string; kind: "monthly_report" | "questionnaires"; source_name: string;
  sha256: string; mime_type: string; byte_size: number; object_name: string;
};
export function intakeKey(cycleId: string, ownerId: string, intake: ValidatedIntake): string {
  const files = intake.files.map(f=>`${f.parsed.kind}:${f.sha256}`).sort();
  return createHash("sha256").update(JSON.stringify([cycleId,ownerId,intake.month,files])).digest("hex");
}
export function makeManifest(files: StagedFile[]): ManifestEntry[] {
  return files.map(file=>{
    if(file.parsed.kind!=="monthly_report"&&file.parsed.kind!=="questionnaires")throw new Error("Modelo não reconhecido.");
    const id=randomUUID();
    return {id,kind:file.parsed.kind,source_name:file.fileName,sha256:file.sha256,mime_type:file.mimeType,
      byte_size:file.buffer.length,object_name:`${id}/${randomUUID()}.${file.extension}`};
  });
}
const uuid=/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i;
export function matchManifest(manifest: unknown, intake: ValidatedIntake): Array<{entry:ManifestEntry;file:StagedFile}> {
  if(!Array.isArray(manifest)||manifest.length!==intake.files.length||manifest.length<1||manifest.length>2)throw new Error("Manifesto incompleto; é necessária conferência manual.");
  const seen=new Set<string>();
  return manifest.map((raw:unknown)=>{
    if(!raw||typeof raw!=="object"||Array.isArray(raw))throw new Error("Manifesto inválido.");
    const e=raw as ManifestEntry;
    const file=intake.files.find(f=>f.sha256===e.sha256 && f.parsed.kind===e.kind);
    if(!file||seen.has(e.sha256)||!uuid.test(e.id)||typeof e.source_name!=="string"||!e.source_name.trim()||e.source_name.length>180||
      e.byte_size!==file.buffer.length||e.mime_type!==file.mimeType||
      typeof e.object_name!=="string"||!new RegExp(`^${e.id}/[a-f0-9-]{36}\\.${file.extension}$`,"i").test(e.object_name))
      throw new Error("O manifesto não corresponde aos arquivos apresentados; operação interrompida.");
    seen.add(e.sha256);return {entry:e,file};
  });
}
export type ReconcileStore = {
  ensureReservation(entry:ManifestEntry):Promise<void>;
  ensureOriginal(entry:ManifestEntry,bytes:Buffer):Promise<void>;
  markUploaded(entry:ManifestEntry):Promise<void>;
  ensureForms(documentId:string,forms:StagedForm[]):Promise<void>;
};
/** Sem exclusão nem sobrescrita. Chamadas repetidas completam apenas passos ausentes. */
export async function reconcileIntake(manifest:unknown,intake:ValidatedIntake,store:ReconcileStore) {
  const items=matchManifest(manifest,intake);
  for(const {entry,file} of items){
    await store.ensureReservation(entry);
    await store.ensureOriginal(entry,file.buffer);
    await store.markUploaded(entry);
  }
  const questionnaire=items.find(x=>x.entry.kind==="questionnaires");
  if(intake.forms.length && !questionnaire)throw new Error("Documento de fichas ausente.");
  if(questionnaire)await store.ensureForms(questionnaire.entry.id,intake.forms);
  return {documents:items.map(({entry})=>({id:entry.id,kind:entry.kind,sha256:entry.sha256,uploadState:"uploaded" as const})),documentaryForms:intake.forms.length};
}
