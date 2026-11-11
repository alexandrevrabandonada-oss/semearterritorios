import test from 'node:test';
import assert from 'node:assert/strict';
import {makeReviewCases,reviewIssues,summarizeReview,exportReviewPacket} from '../lib/fec-import-review.ts';
const sha='f'.repeat(64);
const sample={versao_schema:'semear.fec.pre_importacao.1',fontes:{fichas:{sha256:sha}},fichas_documentais:Array.from({length:15},(_,i)=>({codigo:`FEC-2026-10-F${String(i+1).padStart(2,'0')}`,localidade:i<8?'Rua E':'Rua A',respostas:Array.from({length:6},(_,j)=>({pergunta:j+1,enunciado:'Pergunta?',resposta_relato:'Resposta documental'})),paginas_fonte:[1+Math.floor(i/2)],coincide_com_exemplo_simulado:i<3}))};
test('15 fichas, três conflitos, zero entrevistas comprovadas',()=>{
 const cases=makeReviewCases(sample);
 assert.equal(cases.length,15);
 assert.deepEqual(cases.filter(x=>x.simulatedOverlap).map(x=>x.code),['FEC-2026-10-F01','FEC-2026-10-F02','FEC-2026-10-F03']);
 const s=summarizeReview(cases);assert.equal(s.officialInterviews,null);assert.equal(s.automaticPromotionAllowed,false);
 assert.equal(exportReviewPacket(cases).writeToOfficialIndicators,false);
});
test('não permite atestar campo sem documento independente, data, confirmação e reconciliação metodológica',()=>{
 const c=makeReviewCases(sample)[3];c.status='field_attested_pending_supervision';c.reviewerNote='Conferência sobre documento adicional.';
 assert.ok(reviewIssues(c).length>=4);
 c.fieldDate='2026-10-10';c.interviewerConfirmed=true;c.questionsProtocolReconciled=true;
 c.supportingEvidenceKind='dated_field_record';c.supportingEvidenceReference='Registro de campo independente 001';
 assert.deepEqual(reviewIssues(c),[]);
 assert.equal(summarizeReview([c]).officialInterviews,null);
});
test('exemplo simulado segue impedido de atestação sem supervisão',()=>{
 const c=makeReviewCases(sample)[0];Object.assign(c,{status:'field_attested_pending_supervision',reviewerNote:'Foi incluído documento de apoio, mas há conflito.',fieldDate:'2026-10-10',interviewerConfirmed:true,questionsProtocolReconciled:true,supportingEvidenceKind:'dated_field_record',supportingEvidenceReference:'Registro independente registrado no livro 1'});
 assert.ok(reviewIssues(c).some(x=>x.includes('simulado')));
 assert.throws(()=>exportReviewPacket([c]));
});
test('prova solicitada requer justificativa',()=>{
 const c=makeReviewCases(sample)[4];c.status='proof_requested';assert.ok(reviewIssues(c).some(x=>x.includes('justificativa')));
 c.reviewerNote='Solicitar data e registro contemporâneo ao aplicador.';assert.deepEqual(reviewIssues(c),[]);
});
