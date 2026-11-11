import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { PGlite } from '@electric-sql/pglite';

// PostgreSQL local descartável; usuários, contratos, fichas e objetos sintéticos.
const db = new PGlite();
const id = n => `20000000-0000-4000-8000-${String(n).padStart(12,'0')}`;
const [owner,other,supervisor,outsider,unassigned,contract,contract2,territory,cycle,cycle2,batch,doc,form] = Array.from({length:13},(_,i)=>id(i+1));
const object = `${doc}/${id(50)}.pdf`;
const sha = 'a'.repeat(64);
const exec = sql => db.exec(sql);
let passed=0;
async function as(user,role='authenticated'){await exec(`reset role;select set_config('request.jwt.claim.sub','${user??''}',false);set role ${role}`);}
async function ok(label,sql){await exec(sql);passed++;console.log('PASS '+label);}
async function denied(label,sql){await assert.rejects(exec(sql));passed++;console.log('PASS bloqueado: '+label);}
async function count(label,sql,n){assert.equal((await db.query(sql)).rows.length,n);passed++;console.log('PASS '+label);}
await exec(`create role anon;create role authenticated;create role service_role bypassrls;
 create schema auth;create schema storage;create table auth.users(id uuid primary key);
 create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
 grant usage on schema auth,storage to authenticated,anon;
 create table public.neighborhoods(id uuid primary key,name text);
 create table public.actions(id uuid primary key,neighborhood_id uuid,action_date date,status text);
 create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);
 create table storage.objects(id uuid primary key default gen_random_uuid(),bucket_id text,name text,unique(bucket_id,name));
 alter table storage.objects enable row level security;grant select,insert,update,delete on storage.objects to authenticated,anon;
 create policy existing_permissive on storage.objects for all to authenticated,anon using(true) with check(true);
 grant select on public.neighborhoods,public.actions to authenticated;
 insert into auth.users values('${owner}'),('${other}'),('${supervisor}'),('${outsider}'),('${unassigned}');
 insert into public.neighborhoods values('${territory}','Território sintético');`);
for(const file of ['20261019190000_fec_technical_cycles_staged.sql','20261109182913_fec_import_documental_privado.sql'])
 await exec(readFileSync(`supabase/migrations/${file}`,'utf8'));
await exec(`insert into fec_engagements(id,contract_reference,title,status) values('${contract}','FEC-TEST-1','Contrato 1','active'),('${contract2}','FEC-TEST-2','Contrato 2','active');
 insert into fec_access_grants(engagement_id,user_id,role,active) values('${contract}','${owner}','executor',true),('${contract}','${other}','executor',true),('${contract}','${supervisor}','supervisor',true),('${contract2}','${outsider}','executor',true);
 insert into storage.objects(bucket_id,name) values('outro-bucket','semear-fixture');`);
await as(owner);
await exec(`insert into fec_cycles(id,engagement_id,owner_id,neighborhood_id,title,guiding_question) values('${cycle}','${contract}','${owner}','${territory}','Ciclo','Questão')`);
await as(other);
await exec(`insert into fec_cycles(id,engagement_id,owner_id,neighborhood_id,title,guiding_question) values('${cycle2}','${contract}','${other}','${territory}','Outro ciclo','Questão')`);
await as(owner);
await ok('executor cria lote próprio',`insert into fec_import_batches(id,cycle_id,owner_id,reference_month,intake_key,manifest) values('${batch}','${cycle}','${owner}','2026-10-01','${'c'.repeat(64)}','[{}]')`);
await denied('executor não cria lote em outro ciclo',`insert into fec_import_batches(cycle_id,owner_id,reference_month,intake_key,manifest) values('${cycle2}','${owner}','2026-10-01','${'d'.repeat(64)}','[{}]')`);
await ok('reserva documental',`insert into fec_import_documents(id,batch_id,cycle_id,owner_id,kind,source_name,sha256,mime_type,byte_size,object_name) values('${doc}','${batch}','${cycle}','${owner}','questionnaires','ficcao.pdf','${sha}','application/pdf',100,'${object}')`);
await denied('reserva não vira upload sem objeto',`update fec_import_documents set upload_state='uploaded' where id='${doc}'`);
await denied('hash duplicado no ciclo',`insert into fec_import_documents(id,batch_id,cycle_id,owner_id,kind,source_name,sha256,mime_type,byte_size,object_name) values('${id(30)}','${batch}','${cycle}','${owner}','monthly_report','ficcao.pdf','${sha}','application/pdf',100,'${id(30)}/${id(31)}.pdf')`);
await ok('original privado e confirmação do envio',`insert into storage.objects(bucket_id,name) values('fec-import-private','${object}');update fec_import_documents set upload_state='uploaded' where id='${doc}';`);
await denied('metadados imutáveis',`update fec_import_documents set sha256='${'b'.repeat(64)}' where id='${doc}'`);
await count('original não pode ser excluído',`delete from storage.objects where bucket_id='fec-import-private' and name='${object}' returning *`,0);
await denied('comparação não pode ser forjada pelo executor',`insert into fec_import_forms(id,document_id,code,source_code,locality,questions,simulated_overlap,comparison_verified,comparison_verification_ref) values('${form}','${doc}','FEC-2026-10-F01','TESTE','Rua fictícia','[1,2,3,4,5,6]',false,true,'prova independente falsa')`);
await ok('ficha documental pendente',`insert into fec_import_forms(id,document_id,code,source_code,locality,questions,simulated_overlap) values('${form}','${doc}','FEC-2026-10-F01','TESTE','Rua fictícia','[1,2,3,4,5,6]',false)`);
await denied('executor não pode revisar a própria ficha',`insert into fec_import_reviews(form_id,revision,reviewer_id,decision,reason) values('${form}',1,'${owner}','proof_requested','Justificativa sintética suficiente')`);
for(const [user,label] of [[other,'outro ciclo'],[outsider,'outro contrato'],[unassigned,'sem grant']]) {await as(user);await count(label+' não vê lote','select * from fec_import_batches',0);await count(label+' não vê ficha','select * from fec_import_forms',0);await count(label+' não vê original',`select * from storage.objects where bucket_id='fec-import-private'`,0);}
await as(null,'anon');await denied('anônimo não acessa fichas','select * from fec_import_forms');await count('anônimo não acessa bucket privado',`select * from storage.objects where bucket_id='fec-import-private'`,0);
await as(supervisor);await count('supervisão independente lê ficha','select * from fec_import_forms',1);await count('supervisão lê original privado',`select * from storage.objects where bucket_id='fec-import-private'`,1);
const attestation = `insert into fec_import_reviews(form_id,revision,reviewer_id,decision,reason,independent_evidence_ref,field_date,interviewer_ref,evidence_method,evidence_origin,evidence_location,interviewer_confirmation,six_vs_ten_reconciled) values('${form}',1,'${supervisor}','attested_pending_technical_review','Justificativa sintética suficientemente longa','Documento independente de teste','2026-10-07','Aplicador fictício','Conferência de diário','Acervo independente','Arquivo privado 2',true,true)`;
await denied('comparação informada pelo executor não comprova origem',attestation);
await as(null,'postgres');await exec(`update fec_import_forms set comparison_verified=true,comparison_verification_ref='Conferência independente sintética' where id='${form}'`);
await as(supervisor);
await denied('sem data não atesta',attestation.replace("'2026-10-07'",'null'));
await denied('data fora do mês não atesta',attestation.replace('2026-10-07','2026-11-07'));
await denied('sem confirmação do aplicador não atesta',attestation.replace('true,true','false,true'));
await denied('sem reconciliação de roteiro não atesta',attestation.replace('true,true','true,false'));
await denied('sem método de conferência não atesta',attestation.replace('Conferência de diário',''));
await denied('sem localização de prova não atesta',attestation.replace('Arquivo privado 2',''));
await denied('sem prova independente não atesta',attestation.replace('Documento independente de teste','curta'));
await denied('o próprio documento não é prova independente',attestation.replace('Documento independente de teste',doc));
await ok('supervisão registra apenas atestação documental condicionada',attestation);
await denied('revisão concorrente com versão antiga',attestation);
await denied('histórico imutável',`delete from fec_import_reviews where form_id='${form}'`);
await as(null,'postgres');await exec(`update fec_import_forms set simulated_overlap=true where id='${form}'`);await as(supervisor);await denied('coincidência simulada bloqueia atestação',attestation);
await as(null,'postgres');await exec(`update fec_import_forms set simulated_overlap=null where id='${form}'`);await as(supervisor);await denied('comparação ausente bloqueia atestação',attestation);
await as(unassigned);assert.equal((await db.query('select public.fec_import_acquire_capacity() as lease')).rows[0].lease,null);passed++;console.log('PASS sem atribuição não adquire capacidade');
await as(owner);const lease1=(await db.query('select public.fec_import_acquire_capacity() as lease')).rows[0].lease;assert.ok(lease1);passed++;console.log('PASS executor adquire capacidade');
const lease2=(await db.query('select public.fec_import_acquire_capacity() as lease')).rows[0].lease;assert.ok(lease2);passed++;console.log('PASS segundo limite global de capacidade');
assert.equal((await db.query('select public.fec_import_acquire_capacity() as lease')).rows[0].lease,null);passed++;console.log('PASS saturação recusa antes do parser');
await as(other);await exec(`select public.fec_import_release_capacity('${lease1}')`);assert.equal((await db.query('select public.fec_import_acquire_capacity() as lease')).rows[0].lease,null);passed++;console.log('PASS outro usuário não libera reserva');
await as(owner);await exec(`select public.fec_import_release_capacity('${lease1}');select public.fec_import_release_capacity('${lease2}')`);const lease3=(await db.query('select public.fec_import_acquire_capacity() as lease')).rows[0].lease;assert.ok(lease3);await exec(`select public.fec_import_release_capacity('${lease3}')`);passed++;console.log('PASS capacidade liberada volta a ficar disponível');
for(let i=0;i<17;i++){const lease=(await db.query('select public.fec_import_acquire_capacity() as lease')).rows[0].lease;assert.ok(lease);await exec(`select public.fec_import_release_capacity('${lease}')`);}
assert.equal((await db.query('select public.fec_import_acquire_capacity() as lease')).rows[0].lease,null);passed++;console.log('PASS taxa horária bloqueia novas extrações');
const k='f'.repeat(64);const lock=(await db.query(`select public.fec_import_acquire_batch('${cycle}','${k}') as lease`)).rows[0].lease;assert.ok(lock);passed++;console.log('PASS reserva de reconciliação do lote');
assert.equal((await db.query(`select public.fec_import_acquire_batch('${cycle}','${k}') as lease`)).rows[0].lease,null);passed++;console.log('PASS segunda reconciliação aguarda a mesma chave');
await as(other);await exec(`select public.fec_import_release_batch('${lock}')`);await as(owner);assert.equal((await db.query(`select public.fec_import_acquire_batch('${cycle}','${k}') as lease`)).rows[0].lease,null);passed++;console.log('PASS outra pessoa não libera reserva de lote');
await exec(`select public.fec_import_release_batch('${lock}')`);assert.ok((await db.query(`select public.fec_import_acquire_batch('${cycle}','${k}') as lease`)).rows[0].lease);passed++;console.log('PASS reserva de lote liberada');
await as(null,'postgres');await exec(`update public.fec_access_grants set active=false where user_id='${owner}' and engagement_id='${contract}'`);
await as(owner);assert.equal((await db.query('select public.fec_import_acquire_capacity() as lease')).rows[0].lease,null);passed++;console.log('PASS atribuição revogada não adquire capacidade');
await count('atribuição revogada não vê ficha','select * from fec_import_forms',0);
await as(null,'postgres');await exec(`update public.fec_access_grants set active=true where user_id='${owner}' and engagement_id='${contract}'`);
await as(owner);await count('outra policy de Storage permanece funcional',`select * from storage.objects where bucket_id='outro-bucket'`,1);
for(let i=1;i<=9;i++)await exec(`insert into fec_import_batches(cycle_id,owner_id,reference_month,intake_key,manifest) values('${cycle}','${owner}','2026-10-01','${i.toString(16).padStart(64,'0')}','[{}]')`);
await denied('limite persistente de lotes por hora',`insert into fec_import_batches(cycle_id,owner_id,reference_month,intake_key,manifest) values('${cycle}','${owner}','2026-10-01','${'f'.repeat(64)}','[{}]')`);
console.log(`Matriz FEC privada: ${passed} verificações passaram.`);
await db.close();
