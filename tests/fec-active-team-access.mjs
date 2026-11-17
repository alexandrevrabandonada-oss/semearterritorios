import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {PGlite} from "@electric-sql/pglite";

const db=new PGlite();
const id=n=>`30000000-0000-4000-8000-${String(n).padStart(12,"0")}`;
const [author,reviewerB,reviewerC,inactive,noLink,external,scope,neighborhood,cycle,activityB,activityC,activityRevoked,batch,document,objectId,apsId]=Array.from({length:16},(_,i)=>id(i+1));
const exec=sql=>db.exec(sql);
const as=async(user,role="authenticated")=>exec(`reset role;select set_config('request.jwt.claim.sub','${user??""}',false);set role ${role}`);
let checks=0;
async function pass(label){checks++;console.log(`PASS ${label}`);}
async function denied(label,sql){await assert.rejects(exec(sql));await pass(`bloqueado: ${label}`);}
async function visible(label,sql,count){assert.equal((await db.query(sql)).rows.length,count);await pass(label);}

await exec(`create role anon;create role authenticated;create role service_role bypassrls;
create schema auth;create schema storage;create table auth.users(id uuid primary key);
create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
grant usage on schema auth,storage to authenticated,anon;
create table public.profiles(id uuid primary key,role text not null);
create table public.team_members(profile_id uuid not null,active boolean not null);
create table public.neighborhoods(id uuid primary key,name text not null);
create table public.actions(id uuid primary key,neighborhood_id uuid,action_date date,status text);
create table public.aps_private_fixture(id uuid primary key,body text not null);
alter table public.aps_private_fixture enable row level security;
grant select,insert,update,delete on public.aps_private_fixture to authenticated;
create policy aps_fixture_deny on public.aps_private_fixture for all to authenticated using(false) with check(false);
create table storage.buckets(id text primary key,name text not null,public boolean not null,file_size_limit bigint,allowed_mime_types text[]);
create table storage.objects(id uuid primary key default gen_random_uuid(),bucket_id text not null,name text not null,unique(bucket_id,name));
alter table storage.objects enable row level security;
grant select,insert,update,delete on storage.objects to authenticated,anon;
create policy preexisting_permissive_fixture on storage.objects for all to authenticated,anon using(true) with check(true);
grant select on public.neighborhoods,public.actions to authenticated;
insert into auth.users values ${[author,reviewerB,reviewerC,inactive,noLink,external].map(x=>`('${x}')`).join(",")};
insert into profiles values ('${author}','admin'),('${reviewerB}','equipe'),('${reviewerC}','coordenacao'),('${inactive}','admin'),('${noLink}','equipe'),('${external}','externo');
insert into team_members values ('${author}',true),('${reviewerB}',true),('${reviewerC}',true),('${inactive}',false),('${external}',true);
insert into public.aps_private_fixture values('${apsId}','APS sintético');
insert into neighborhoods values('${neighborhood}','Território sintético');`);

const migrations=[
 "20261117011729_fec_technical_cycles_staged.sql",
 "20261117011834_fec_monthly_report_versions.sql",
 "20261117011958_fec_import_documental_privado.sql",
 "20261117012052_fec_resposta_evidencia_privada.sql",
 "20261117012135_fec_integridade_documental.sql",
 "20261117012218_fec_supporting_documents.sql",
 "20261117012344_fec_vinculo_ativo_referencia_pendente.sql",
 "20261117140527_fec_active_team_review_access.sql",
];
for(const migration of migrations)await exec(readFileSync(`supabase/migrations/${migration}`,"utf8"));
await exec(`insert into fec_engagements(id,contract_reference,title,status) values('${scope}',null,'Frente sintética','active');
insert into fec_access_grants(engagement_id,user_id,role,active) values('${scope}','${inactive}','supervisor',true);`);
await as(author);
await exec(`
insert into fec_cycles(id,engagement_id,owner_id,neighborhood_id,title,guiding_question,objectives,methodology)
 values('${cycle}','${scope}','${author}','${neighborhood}','Ciclo sintético','Pergunta sintética','Objetivo sintético','Método sintético');
insert into fec_activities(id,cycle_id,owner_id,activity_date,activity_type,objective,methodology)
 values('${activityB}','${cycle}','${author}','2026-10-02','technical_visit','Objetivo sintético','Método sintético'),
 ('${activityC}','${cycle}','${author}','2026-10-03','training','Objetivo sintético','Método sintético'),
 ('${activityRevoked}','${cycle}','${author}','2026-10-04','other','Objetivo sintético','Método sintético');`);
await pass("ambiente descartável com as sete migrations-base e a nova migration");

await as(author);
assert.equal((await db.query(`select public.fec_can_submit('${scope}') as allowed`)).rows[0].allowed,true);
assert.equal((await db.query(`select public.fec_can_review('${scope}','${author}') as allowed`)).rows[0].allowed,false);
await pass("permissões refletem vínculo ativo e bloqueiam revisão própria");
await visible("autor ativo lê o ciclo FEC",`select id from fec_cycles where id='${cycle}'`,1);
await exec(`update fec_activities set status='submitted' where id in ('${activityB}','${activityC}','${activityRevoked}')`);
await assert.rejects(exec(`select public.fec_review_record('activity','${activityB}','approved','Autoaprovação')`));
await pass("banco bloqueia autoaprovação do autor");
await exec(`insert into fec_import_batches(id,cycle_id,owner_id,reference_month,intake_key,manifest)
 values('${batch}','${cycle}','${author}','2026-10-01',repeat('a',64),'[{}]');
insert into fec_import_documents(id,batch_id,cycle_id,owner_id,kind,source_name,sha256,mime_type,byte_size,object_name)
 values('${document}','${batch}','${cycle}','${author}','monthly_report','synthetic.pdf',repeat('b',64),'application/pdf',20,'${document}/${objectId}.pdf');
insert into storage.objects(bucket_id,name) values('fec-import-private','${document}/${objectId}.pdf');
update fec_import_documents set upload_state='uploaded' where id='${document}';`);
await as(null,"postgres");
await visible("upload autorizado persiste no bucket privado",`select name from storage.objects where bucket_id='fec-import-private' and name='${document}/${objectId}.pdf'`,1);
await as(null,"service_role");
await exec(`insert into fec_file_integrity(document_id,sha256,byte_size) values('${document}',repeat('b',64),20)`);
await pass("integridade sintética registrada apenas pelo servidor privilegiado");
await as(author);
await visible("nenhum membro pode ler objetos FEC diretamente do Storage",`select name from storage.objects where bucket_id='fec-import-private'`,0);
await visible("autor lê metadados próprios do documento via RLS",`select id from fec_import_documents where id='${document}'`,1);
await denied("autor não insere conferência do próprio relatório",`insert into fec_report_reviews(batch_id,revision,reviewer_id,decision,reason) values('${batch}',1,'${author}','document_checked','')`);

await as(reviewerB);
await visible("revisor B, sem atribuição individual, lê ciclo e documento",`select id from fec_cycles where id='${cycle}'`,1);
await visible("revisor B não lê diretamente bytes privados",`select name from storage.objects where bucket_id='fec-import-private'`,0);
await exec(`select public.fec_review_record('activity','${activityB}','approved','Revisão independente sintética')`);
await exec(`insert into fec_report_reviews(batch_id,revision,reviewer_id,decision,reason) values('${batch}',1,'${reviewerB}','document_checked','')`);
await pass("revisor B aprova atividade de outro usuário");
await as(author);
await visible("conteúdo aprovado não pode ser alterado silenciosamente",`update fec_activities set objective='alteração silenciosa' where id='${activityB}' returning id`,0);
await as(reviewerB);
await visible("histórico preserva autoria da revisão",`select id from fec_review_log where record_kind='activity' and record_id='${activityB}' and reviewer_id='${reviewerB}' and decision='approved'`,1);
await as(reviewerC);
await exec(`select public.fec_review_record('activity','${activityC}','needs_changes','Ajuste sintético necessário')`);
await exec(`insert into fec_report_reviews(batch_id,revision,reviewer_id,decision,reason) values('${batch}',2,'${reviewerC}','needs_changes','Ajustes sintéticos para conferência independente')`);
await pass("revisor C independente solicita ajustes sem atribuição individual");
await as(author);
await exec(`update fec_activities set objective='Resposta sintética aos ajustes' where id='${activityC}'`);
await pass("autor atualiza o próprio registro após solicitação de ajustes");

await as(noLink);
await visible("usuário sem vínculo ativo não lê FEC",`select id from fec_cycles where id='${cycle}'`,0);
await denied("usuário sem vínculo não cria ciclo",`insert into fec_cycles(engagement_id,owner_id,neighborhood_id,title,guiding_question) values('${scope}','${noLink}','${neighborhood}','Ciclo inválido','Pergunta')`);
await as(inactive);
await visible("usuário inativo não lê FEC mesmo com grant legado ativo",`select id from fec_cycles where id='${cycle}'`,0);
assert.equal((await db.query(`select public.fec_import_acquire_capacity() as lease`)).rows[0].lease,null);
await pass("grant legado não permite adquirir capacidade FEC");
await as(external);
await visible("perfil institucional não permitido não lê FEC apesar de vínculo ativo",`select id from fec_cycles where id='${cycle}'`,0);

await as(null,"anon");
await denied("anônimo não lê registros FEC",`select id from fec_cycles`);
await visible("anônimo não lê objetos privados do Storage",`select name from storage.objects where bucket_id like 'fec-%-private'`,0);

await as(null,"postgres");
await exec(`update public.team_members set active=false where profile_id='${author}'`);
await as(author);
await visible("autor inativado perde leitura após envio",`select id from fec_cycles where id='${cycle}'`,0);
await visible("autor inativado não altera atividade enviada",`update fec_activities set objective='alteração' where id='${activityRevoked}' returning id`,0);
await denied("autor inativado não revisa depois da submissão",`select public.fec_review_record('activity','${activityRevoked}','approved','Tentativa autorrevogada')`);
await as(reviewerC);
await exec(`select public.fec_review_record('activity','${activityRevoked}','approved','Revisão após inativação do autor')`);
await pass("revisor ativo ainda revisa após inativação do autor");

await as(reviewerB);
await denied("membro não pode inserir evento de acesso por conta própria",`insert into fec_file_access_events(resource_kind,resource_id,actor_id,byte_size) values('import_document','${document}','${reviewerB}',20)`);
await as(reviewerC,"service_role");
await exec(`insert into fec_file_access_events(resource_kind,resource_id,actor_id,byte_size) values('import_document','${document}','${reviewerB}',20)`);
await pass("service_role registra auditoria de download");
await denied("histórico de download não pode ser editado",`update fec_file_access_events set byte_size=21`);
await denied("histórico de download não pode ser apagado",`delete from fec_file_access_events`);
await as(reviewerB);
await visible("membro ativo pode consultar auditoria",`select id from fec_file_access_events where resource_id='${document}'`,1);

await visible("FEC não concede leitura da tabela APS protegida",`select id from aps_private_fixture`,0);
await visible("FEC não concede escrita na tabela APS protegida",`update aps_private_fixture set body='alteração indevida' where id='${apsId}' returning id`,0);
await denied("FEC não concede inserção na tabela APS protegida",`insert into aps_private_fixture values('${id(90)}','indevido')`);

const routeFiles=[
 "app/api/fec/cycles/route.ts",
 "app/api/fec/activities/route.ts",
 "app/api/fec/import-batches/route.ts",
 "app/api/fec/import-reviews/route.ts",
 "app/api/fec/files/route.ts",
 "app/api/fec/import-documents/route.ts",
 "app/api/fec/evidence-responses/route.ts",
];
for(const file of routeFiles){
 const source=readFileSync(file,"utf8");
 assert.doesNotMatch(source,/from\(["']fec_access_grants["']\)/,`${file} ainda consulta grants antigos`);
 assert.doesNotMatch(source,/createSignedUrl\(/,`${file} ainda emite URL assinada`);
}
const server=readFileSync("lib/fec-server.ts","utf8");
assert.match(server,/team_members/);assert.match(server,/active/);assert.doesNotMatch(server,/fec_access_grants/);
const workspace=readFileSync("components/fec/technical-workspace.tsx","utf8");
assert.doesNotMatch(workspace,/catalog\.grants/);
const privateFiles=readFileSync("lib/fec-integrity-server.ts","utf8");
assert.match(privateFiles,/import ["']server-only["']/);
assert.match(privateFiles,/input\.db\.rpc\(["']fec_is_active_member["']\)/);
assert.match(privateFiles,/fec_file_access_events/);
assert.match(privateFiles,/expectedSha256/);
await pass("APIs e interfaces não dependem de grants nem emitem URLs assinadas");

console.log(`Matriz de acesso por equipe ativa: ${checks} verificações passaram.`);
await db.close();
