import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {intakeKey,makeManifest,matchManifest,reconcileIntake} from '../lib/fec-import-reconcile.ts';

const bytes=Buffer.from('%PDF-1.4 sintético');
const sha=createHash('sha256').update(bytes).digest('hex');
const intake={month:'2026-10',files:[{fileName:'sintetico.pdf',buffer:bytes,text:'sintético',extension:'pdf',mimeType:'application/pdf',sha256:sha,parsed:{kind:'questionnaires'}}],forms:[{code:'FEC-2026-10-F01'}]};

test('reconciliação retoma falhas sem apagar ou duplicar original e fichas',async()=>{
 const manifest=makeManifest(intake.files);const reserved=new Map(),objects=new Map(),forms=new Map();let fail=true;
 const store={
  async ensureReservation(e){if(!reserved.has(e.id))reserved.set(e.id,e);},
  async ensureOriginal(e,b){if(!objects.has(e.id))objects.set(e.id,Buffer.from(b));},
  async markUploaded(){if(fail){fail=false;throw Error('falha simulada após upload');}},
  async ensureForms(id,rows){if(!forms.has(id))forms.set(id,rows);}
 };
 await assert.rejects(reconcileIntake(manifest,intake,store));
 assert.equal(objects.size,1);assert.equal(forms.size,0);
 await reconcileIntake(manifest,intake,store);await reconcileIntake(manifest,intake,store);
 assert.equal(reserved.size,1);assert.equal(objects.size,1);assert.equal(forms.size,1);
 assert.deepEqual(objects.get(manifest[0].id),bytes);
});
test('manifesto divergente bloqueia antes de qualquer gravação',async()=>{
 const manifest=makeManifest(intake.files);manifest[0].sha256='0'.repeat(64);let writes=0;
 const store={ensureReservation:async()=>{writes++;},ensureOriginal:async()=>{writes++;},markUploaded:async()=>{writes++;},ensureForms:async()=>{writes++;}};
 await assert.rejects(reconcileIntake(manifest,intake,store));assert.equal(writes,0);
});
test('chave é estável para mesmos bytes e muda com ciclo ou mês',()=>{
 assert.equal(intakeKey('ciclo','pessoa',intake),intakeKey('ciclo','pessoa',intake));
 assert.notEqual(intakeKey('ciclo','pessoa',intake),intakeKey('outro','pessoa',intake));
 assert.notEqual(intakeKey('ciclo','pessoa',intake),intakeKey('ciclo','pessoa',{...intake,month:'2026-11'}));
 assert.equal(matchManifest(makeManifest(intake.files),intake).length,1);
});

test('duas tentativas simultâneas usam as mesmas reservas no armazenamento simulado',async()=>{
 const manifest=makeManifest(intake.files);const reserved=new Map(),objects=new Map(),forms=new Map();
 const store={async ensureReservation(e){await Promise.resolve();if(!reserved.has(e.id))reserved.set(e.id,e);},async ensureOriginal(e,b){await Promise.resolve();if(!objects.has(e.id))objects.set(e.id,Buffer.from(b));},async markUploaded(){await Promise.resolve();},async ensureForms(id,rows){await Promise.resolve();if(!forms.has(id))forms.set(id,rows);}};
 await Promise.all([reconcileIntake(manifest,intake,store),reconcileIntake(manifest,intake,store)]);
 assert.equal(reserved.size,1);assert.equal(objects.size,1);assert.equal(forms.size,1);
});
