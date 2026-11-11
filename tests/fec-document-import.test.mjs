import test from 'node:test';
import assert from 'node:assert/strict';
import {parseFecDocument,buildFecImportPreview,questionnaireNameKeysInternal} from '../lib/fec-document-import.ts';
const report=`RELATÓRIO DE TRABALHO DE CAMPO (OUTUBRO)\nComplexo da Candelária\n2026\nAbaixo estão exemplos de respostas simuladas, exclusivamente para demonstrar como os depoimentos podem ser organizados.\nExemplo de ficha ilustrativa – Participante 01\nIdentificação: Participante Exemplo\nMais de 80% dos moradores.\n3. QUESTIONÁRIO DE PERCEPÇÃO SOCIOAMBIENTAL\n7. REGISTRO CRONOLÓGICO DAS ATIVIDADES DE CAMPO\n- 07 de outubro de 2026: atividade de campo com moradores.\n- 31 de outubro de 2026: sistematização das informações.\n9. CONSIDERAÇÕES FINAIS`;
const form=`ENTREVISTA DE CAMPO PROJETO SEMEAR (UFF)\nFICHA DE ENTREVISTA 01\nIdentificação: Participante Exemplo\nLocalidade: Rua E\n1. Você identifica problemas ambientais no bairro?\nSim. Lixo.\n2. Qual problema mais incomoda você?\nO descarte irregular.\n3. Existem lixeiras suficientes?\nNão.\n4. Você conhece o conceito de ecologia?\nSim.\n5. A poluição industrial pode atingir outros bairros?\nSim.\n6. Já teve contato com campanhas ambientais?\nNão.\n---`;
test('prévia preserva cautela e esconde identificação pessoal',()=>{
 const a=parseFecDocument(report,'relatorio.pdf','SHA-A');
 const b=parseFecDocument(form,'fichas.pdf','SHA-B');
 const response=buildFecImportPreview([a,b],questionnaireNameKeysInternal(form));
 assert.equal(response.figures.questionnairesInDocument,1);
 assert.equal(response.figures.daysDescribedAsFieldwork,1);
 assert.equal(response.figures.daysDescribedAsSystematization,1);
 assert.equal(response.simulatedExampleOverlaps,1);
 assert.equal(response.figures.verifiedInterviews,null);
 assert.equal(response.mayCountAsOfficialIndicators,false);
 assert.equal(response.questionnaires[0].answers.length,6);
 assert.equal(response.questionnaires[0].locality,'Rua E');
 assert.equal(response.referenceMonth,'2026-10');
 assert.ok(!JSON.stringify(response).includes('Participante Exemplo'));
});
test('falha de dados incompletos não é entrevista homologada',()=>{
 const b=parseFecDocument(form.replace('6. Já teve contato com campanhas ambientais?','6. JÁ TEVE CONTATO?'),'fichas.pdf','SHA');
 assert.equal(b.questionnaires[0].verifiedInterview,false);
 assert.ok(b.questionnaires.length===1);
});
