/**
 * SEMEAR / FEC: extração documental conservadora, apenas para PREVISUALIZAÇÃO.
 * Nenhuma entrevista é atestada, nenhum registro é escrito, nenhuma conclusão é pública.
 * Sem dependências externas: adequado para testar com Node 22.
 */
export type FecDocumentKind = "monthly_report" | "questionnaires" | "unrecognized";
export type FecQuestion = { number: number; question: string; answer: string };
export type FecQuestionnairePreview = {
  code: string;
  locality: string | null;
  questionCount: number;
  answers: FecQuestion[];
  status: "pending_authenticity_review";
  verifiedInterview: false;
  simulatedOverlap?: boolean | null;
};
export type FecActivityPreview = {
  date: string;
  category: "technical_visit" | "systematization" | "other";
  description: string;
  verifiedWorkshop: false;
};
export type FecDocumentPreview = {
  kind: FecDocumentKind;
  sourceFile: string;
  digestSha256: string;
  territory: string | null;
  referenceMonth: string | null;
  questionnaires: FecQuestionnairePreview[];
  illustrativeParticipantKeys: string[]; // somente para uso temporário em memória; NÃO enviar ao frontend
  activities: FecActivityPreview[];
  warnings: string[];
};
export type FecImportPreview = {
  schema: "semear.fec.preview.1";
  territory: string | null;
  referenceMonth: string | null;
  sources: Array<{ name: string; sha256: string; kind: FecDocumentKind }>;
  questionnaires: FecQuestionnairePreview[];
  activities: FecActivityPreview[];
  figures: {
    questionnairesInDocument: number;
    localities: Record<string, number>;
    daysDescribedAsFieldwork: number;
    daysDescribedAsSystematization: number;
    verifiedInterviews: null;
    verifiedUniqueParticipants: null;
    verifiedWorkshops: 0;
    verifiedSocialMaps: 0;
    verifiedPlantingWorkshops: 0;
    verifiedAirMeasurements: 0;
  };
  simulatedExampleOverlaps: number;
  warnings: string[];
  status: "needs_human_review";
  mayCountAsOfficialIndicators: false;
};

const cleanup = (s: string) => s.replace(/\s+/g, " ").trim();
const normalize = (s: string) => cleanup(s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("pt-BR"));
const monthNames: Record<string, string> = {
  janeiro:"01", fevereiro:"02", marco:"03", abril:"04", maio:"05", junho:"06",
  julho:"07", agosto:"08", setembro:"09", outubro:"10", novembro:"11", dezembro:"12",
};
function findMonth(text: string): string | null {
  const m = normalize(text).match(/(?:janeiro|fevereiro|marco|abril|maio|junho|julho|agosto|setembro|outubro|novembro|dezembro)\s+(?:de\s+)?(20\d\d)/);
  if (!m) return null;
  const mm = m[0].match(/^[a-z]+/)?.[0];
  return mm ? `${m[1]}-${monthNames[mm]}` : null;
}
function findTerritory(text: string): string | null {
  const n=normalize(text);
  return n.includes("complexo da candelaria") ? "Complexo da Candelária" : null;
}
function classifyActivity(description:string): FecActivityPreview["category"] {
  const n=normalize(description);
  if (/(sistematiz|compilac|consolidac)/.test(n)) return "systematization";
  if (/(campo|moradores|questionario|levantamento territorial|conversas|dialogo)/.test(n)) return "technical_visit";
  return "other";
}
function extractActivities(text: string): FecActivityPreview[] {
  const m=text.match(/REGISTRO CRONOL[ÓO]GICO DAS ATIVIDADES DE CAMPO([\s\S]*?)(?:\n\s*(?:8|9)\.\s+[A-ZÁÂÃÉÊÍÓÔÕÚ]|$)/i);
  if (!m) return [];
  const pattern=/[-•]\s*(\d{1,2})\s+de\s+([a-zç]+)\s+de\s+(20\d\d)\s*:\s*([\s\S]*?)(?=\n\s*[-•]\s*\d{1,2}\s+de\s+|$)/gi;
  const results: FecActivityPreview[]=[];
  for(const match of Array.from(m[1].matchAll(pattern))){
    const month=monthNames[normalize(match[2])];
    if(!month)continue;
    const description=cleanup(match[4]);
    results.push({date:`${match[3]}-${month}-${match[1].padStart(2,"0")}`,category:classifyActivity(description),description,verifiedWorkshop:false});
  }
  return results;
}
function extractQuestionnaires(text: string): {records:FecQuestionnairePreview[]; names:string[]} {
  const start=/FICHA DE ENTREVISTA\s+(\d+)\s*\n\s*Identifica[cç][aã]o:\s*([^\n]+)\s*\n\s*Localidade:\s*([^\n]+)/gi;
  const matches=Array.from(text.matchAll(start));
  const records:FecQuestionnairePreview[]=[];
  const names:string[]=[];
  for(let i=0;i<matches.length;i++){
    const m=matches[i]; const from=(m.index??0)+m[0].length; const to=matches[i+1]?.index??text.length;
    const block=text.slice(from,to);
    const qs=Array.from(block.matchAll(/^\s*([1-6])\.\s*([^\n]+?\?)\s*$/gm));
    const answers=qs.map((q,j)=>{
      const until=qs[j+1]?.index??block.length;
      return {number:Number(q[1]),question:cleanup(q[2]),answer:cleanup(block.slice((q.index??0)+q[0].length,until).replace(/---/g," "))};
    });
    records.push({code:`FEC-Q${String(m[1]).padStart(2,"0")}`,locality:cleanup(m[3]),questionCount:answers.length,answers,status:"pending_authenticity_review",verifiedInterview:false});
    names.push(normalize(m[2]));
  }
  return {records,names};
}
function extractSimulatedNames(text:string):string[]{
  return Array.from(text.matchAll(/Exemplo de ficha ilustrativa\s*[–-]\s*Participante\s*\d+\s*\n\s*Identifica[cç][aã]o:\s*([^\n]+)/gi)).map(m=>normalize(m[1]));
}
export function parseFecDocument(text: string, sourceFile: string, digestSha256: string): FecDocumentPreview {
  const monthly=/RELAT[ÓO]RIO DE TRABALHO DE CAMPO/i.test(text);
  const questionnaires=/FICHA DE ENTREVISTA\s*\d+/i.test(text);
  const {records}=extractQuestionnaires(text);
  const warnings:string[]=[];
  if(monthly && /respostas simuladas/i.test(text)) warnings.push("Há exemplos explicitamente declarados SIMULADOS no relatório.");
  if(questionnaires && records.some(x=>x.questionCount!==6)) warnings.push("Há fichas que não apresentam seis perguntas/respostas: revisar extração.");
  if(monthly && />?80\s*%/i.test(text)) warnings.push("Percentual sobre campanhas citado sem denominador demonstrado; não contabilizar automaticamente.");
  if(monthly && /QUESTION[ÁA]RIO DE PERCEP[ÇC][ÃA]O SOCIOAMBIENTAL/i.test(text)) warnings.push("Conferir se o roteiro metodológico de dez perguntas corresponde às seis perguntas das fichas.");
  return {
    kind:monthly?"monthly_report":questionnaires?"questionnaires":"unrecognized",
    sourceFile,digestSha256,territory:findTerritory(text),referenceMonth:findMonth(text),
    questionnaires:records,illustrativeParticipantKeys:extractSimulatedNames(text),activities:monthly?extractActivities(text):[],warnings,
  };
}
export function buildFecImportPreview(documents: FecDocumentPreview[], matchedNamesPerQuestionnaire: string[] = []): FecImportPreview {
  const reports=documents.filter(d=>d.kind==="monthly_report");
  const questionnaireDocs=documents.filter(d=>d.kind==="questionnaires");
  const rawQuestionnaires=questionnaireDocs.flatMap(d=>d.questionnaires);
  const activities=reports.flatMap(d=>d.activities);
  const simulated=new Set(reports.flatMap(r=>r.illustrativeParticipantKeys));
  const comparable = reports.length > 0 && simulated.size > 0 && matchedNamesPerQuestionnaire.length === rawQuestionnaires.length;
  const questionnaires=rawQuestionnaires.map((q,i)=>({...q,simulatedOverlap:comparable ? simulated.has(normalize(matchedNamesPerQuestionnaire[i])) : null}));
  const overlaps=questionnaires.filter(q=>q.simulatedOverlap===true).length;
  const localities:Record<string,number>={};
  for(const q of questionnaires) if(q.locality) localities[q.locality]=(localities[q.locality]??0)+1;
  const warnings=documents.flatMap(d=>d.warnings);
  if(overlaps)warnings.push(`${overlaps} fichas têm identificação coincidente com exemplos explicitamente simulados no relatório mensal. Autenticidade não comprovada.`);
  if(questionnaires.length) warnings.push("Fichas sem datas individuais e evidência de aplicação; não integrar à base APS nem contar como entrevistas reais sem verificação.");
  if(!reports.length) warnings.push("Relatório mensal não incluído: não é possível estabelecer cronologia a partir das fichas.");
  if(!questionnaireDocs.length) warnings.push("Fichas não incluídas: o relatório mensal não prova o número de entrevistas.");
  const month=reports.find(d=>d.referenceMonth)?.referenceMonth??null;
  if (documents.some(d=>d.kind==="unrecognized"))warnings.push("Um documento não corresponde aos modelos conhecidos; revisar antes de importar.");
  if (documents.some(d=>d.referenceMonth&&month&&d.referenceMonth!==month))warnings.push("Os arquivos apresentam referências de mês divergentes.");
  return {
    schema:"semear.fec.preview.1",territory:documents.find(d=>d.territory)?.territory??null,referenceMonth:month,
    sources:documents.map(({sourceFile,digestSha256,kind})=>({name:sourceFile,sha256:digestSha256,kind})),
    questionnaires,activities,
    figures:{questionnairesInDocument:questionnaires.length,localities,
      daysDescribedAsFieldwork:activities.filter(a=>a.category==="technical_visit").length,
      daysDescribedAsSystematization:activities.filter(a=>a.category==="systematization").length,
      verifiedInterviews:null,verifiedUniqueParticipants:null,verifiedWorkshops:0,verifiedSocialMaps:0,verifiedPlantingWorkshops:0,verifiedAirMeasurements:0,
    },simulatedExampleOverlaps:overlaps,warnings,status:"needs_human_review",mayCountAsOfficialIndicators:false,
  };
}
/** Mantém identificação pessoal só durante o cruzamento em memória do servidor; NUNCA incluir os nomes no JSON da resposta. */
export function questionnaireNameKeysInternal(text:string):string[] {return extractQuestionnaires(text).names;}
