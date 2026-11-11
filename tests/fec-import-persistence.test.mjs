import test, {after} from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {mkdtemp,readFile,writeFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {pathToFileURL,fileURLToPath} from 'node:url';
// Adaptador só para executar ESM TypeScript com Node sem dependências instaladas.
// A versão real do Next utiliza resolução bundler normal e import sem extensão.
const root=fileURLToPath(new URL('../lib/',import.meta.url));
const temp=await mkdtemp(join(tmpdir(),'fec-import-unit-'));
await writeFile(join(temp,'fec-document-import.ts'),await readFile(join(root,'fec-document-import.ts')));
await writeFile(join(temp,'fec-upload-limits.mjs'),await readFile(join(root,'fec-upload-limits.mjs')));
const source=(await readFile(join(root,'fec-import-persistence.ts'),'utf8')).replace('from "./fec-document-import";','from "./fec-document-import.ts";');
await writeFile(join(temp,'fec-import-persistence.ts'),source);
after(async()=>{await rm(temp,{recursive:true,force:true});});
const {FEC_MAX_UPLOAD,FEC_MAX_TOTAL_BYTES,validateFecIntake,reviewSubmissionIssues}=await import(pathToFileURL(join(temp,'fec-import-persistence.ts')).href);
const report=`RELATÓRIO DE TRABALHO DE CAMPO (OUTUBRO)\nComplexo da Candelária\noutubro de 2026\nExemplos de respostas simuladas\nExemplo de ficha ilustrativa – Participante 01\nIdentificação: Pessoa Exemplo\n7. REGISTRO CRONOLÓGICO DAS ATIVIDADES DE CAMPO\n- 07 de outubro de 2026: campo\n- 31 de outubro de 2026: sistematização\n9. CONSIDERAÇÕES FINAIS`;
const questionnaire=`FICHA DE ENTREVISTA 01\nIdentificação: Pessoa Exemplo\nLocalidade: Rua E\n1. Pergunta sobre o lixo?\nHá lixo.\n2. Pergunta sobre lixeiras?\nNão há.\n3. Pergunta sobre a saúde?\nPode prejudicar.\n4. Pergunta sobre ar?\nNão sabe.\n5. Pergunta sobre o bairro?\nGosta do bairro.\n6. Pergunta sobre campanhas?\nNunca ouviu.\n---`;
const pdf=(name,text,suffix='')=>({fileName:name,buffer:Buffer.from('%PDF-1.4\n'+suffix),text});
test('lote privado detecta exemplo simulado e não inventa entrevistados',()=>{
 const batch=validateFecIntake('2026-10',[pdf('relatorio.pdf',report,'a'),pdf('fichas.pdf',questionnaire,'b')]);
 assert.equal(batch.forms.length,1);
 assert.equal(batch.forms[0].simulatedOverlap,true);
 assert.deepEqual(batch.forms[0].sourcePages,[]);
 assert.equal(batch.preview.figures.verifiedInterviews,null);
 assert.equal(batch.preview.mayCountAsOfficialIndicators,false);
 assert.ok(!JSON.stringify(batch.forms).includes('Pessoa Exemplo'));
});
test('sem relato mensal, conflito simulado fica indeterminado e não vira false',()=>{
 const batch=validateFecIntake('2026-10',[pdf('fichas.pdf',questionnaire)]);
 assert.equal(batch.forms[0].simulatedOverlap,null);
});
test('rejeita arquivo falso e duplicado, mês inconsistente e formato proibido',()=>{
 assert.throws(()=>validateFecIntake('2026-10',[{fileName:'relatorio.pdf',buffer:Buffer.from('notPDF'),text:report}]),/Assinatura/);
 assert.throws(()=>validateFecIntake('2026-10',[pdf('a.pdf',report),pdf('b.pdf',report)]),/idênticos/);
 assert.throws(()=>validateFecIntake('2026-11',[pdf('relatorio.pdf',report)]),/diverge/);
 assert.throws(()=>validateFecIntake('2026-10',[{fileName:'relatorio.txt',buffer:Buffer.from('hello'),text:report}]),/PDF e DOCX/);
});
const uuid='11111111-1111-4111-a111-111111111111';
const proposal={formId:uuid,expectedRevision:0,decision:'attested_pending_technical_review',reason:'Uma declaração do aplicador foi conferida pela supervisão.',independentEvidenceRef:'Diário de campo privado n. 23',fieldDate:'2026-10-07',interviewerConfirmation:true,sixVsTenReconciled:true,interviewerRef:'Aplicador fictício',evidenceMethod:'Conferência de diário',evidenceOrigin:'Acervo independente',evidenceLocation:'Arquivo privado 2'};
test('bloqueia atestação para ficha simulada ou sem comparação',()=>{
 assert.ok(reviewSubmissionIssues(proposal,true).some(x=>x.includes('simulada')));
 assert.ok(reviewSubmissionIssues(proposal,null).some(x=>x.includes('não comparada')));
 assert.ok(reviewSubmissionIssues(proposal,false).some(x=>x.includes("Atestação bloqueada")));
});
test('exige evidência e data para atestação e rejeita campos de autoria forjada',()=>{
 assert.ok(reviewSubmissionIssues({...proposal,independentEvidenceRef:'',fieldDate:null},false).length>=2);
 assert.ok(reviewSubmissionIssues({...proposal,reviewerId:uuid},false).some(x=>x.includes('extras')));
});
test('não confunde solicitar prova com validação de entrevista',()=>{
 const request={formId:uuid,expectedRevision:0,decision:'proof_requested',reason:'Faltam datas e confirmação de origem pelas fontes.',independentEvidenceRef:'',fieldDate:null,interviewerConfirmation:false,sixVsTenReconciled:false};
 assert.deepEqual(reviewSubmissionIssues(request,true),[]);
});


test('recebe relatório genérico sem exigir cadastro de fichas',()=>{
 const batch=validateFecIntake('2026-10',[pdf('relatorio.pdf','Descrição sintética de trabalho territorial sem modelo fixo.','generic')]);
 assert.equal(batch.files[0].parsed.kind,'monthly_report');assert.equal(batch.forms.length,0);assert.ok(batch.preview.warnings.some(w=>w.includes('conferência')));
});
test('ficha incompleta não impede entrega e permanece para conferência manual',()=>{
 const broken=questionnaire.replace('6. Pergunta sobre campanhas?\nNunca ouviu.','');
 const batch=validateFecIntake('2026-10',[pdf('fichas.pdf',broken,'incomplete')]);
 assert.equal(batch.files.length,1);assert.equal(batch.forms.length,0);assert.ok(batch.preview.warnings.some(w=>w.includes('não foram extraídas')));
});

test('relatório com muitas fichas também é recebido sem cadastrá-las individualmente',()=>{
 const many=Array.from({length:201},(_,i)=>questionnaire.replace('FICHA DE ENTREVISTA 01',`FICHA DE ENTREVISTA ${i+1}`)).join('\n');
 const batch=validateFecIntake('2026-10',[pdf('fichas.pdf',many,'many')]);
 assert.equal(batch.files.length,1);assert.equal(batch.forms.length,0);assert.ok(batch.preview.warnings.some(w=>w.includes('Muitas fichas')));
});

test('limita o upload do formulário a 4 MB, incluindo a soma dos arquivos',()=>{
 assert.equal(FEC_MAX_UPLOAD,4*1024*1024);
 assert.equal(FEC_MAX_TOTAL_BYTES,4*1024*1024);
 const exact=Buffer.concat([Buffer.from('%PDF-1.4'),Buffer.alloc(FEC_MAX_UPLOAD-8,1)]);
 assert.equal(validateFecIntake('2026-10',[{fileName:'relatorio.pdf',buffer:exact,text:report}]).files.length,1);
 assert.throws(()=>validateFecIntake('2026-10',[{fileName:'relatorio.pdf',buffer:Buffer.concat([exact,Buffer.from('x')]),text:report}]),/4 MB/);
 const twoA=Buffer.concat([Buffer.from('%PDF-1.4a'),Buffer.alloc(2*1024*1024,1)]);
 const twoB=Buffer.concat([Buffer.from('%PDF-1.4b'),Buffer.alloc(2*1024*1024,2)]);
 assert.throws(()=>validateFecIntake('2026-10',[
  {fileName:'relatorio.pdf',buffer:twoA,text:report},
  {fileName:'fichas.pdf',buffer:twoB,text:questionnaire},
 ]),/total dos documentos excede 4 MB/);
});
