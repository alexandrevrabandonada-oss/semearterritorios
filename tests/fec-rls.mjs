import assert from "node:assert/strict";
import fs from "node:fs";
import { PGlite } from "@electric-sql/pglite";

// PostgreSQL real em WASM: nenhuma conexão, credencial ou dado de produção.
const db = new PGlite();
let passed = 0;
const id = (n) => `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
const [
  owner,
  other,
  supervisor,
  aps,
  contract,
  contract2,
  territory,
  cycle,
  activity,
  map,
  evidence,
  finding,
] = Array.from({ length: 12 }, (_, n) => id(n + 1));
const execute = (sql) => db.exec(sql);
async function as(user, role = "authenticated") {
  await execute(
    `reset role;select set_config('request.jwt.claim.sub','${user ?? ""}',false);set role ${role};`,
  );
}
async function ok(label, sql) {
  await execute(sql);
  passed++;
  console.log("PASS " + label);
}
async function denied(label, sql) {
  await assert.rejects(execute(sql));
  passed++;
  console.log("PASS bloqueado: " + label);
}
async function count(label, sql, n) {
  assert.equal((await db.query(sql)).rows.length, n);
  passed++;
  console.log("PASS " + label);
}
await execute(`create role anon;create role authenticated;create role service_role bypassrls;
 create schema auth;create schema storage;create table auth.users(id uuid primary key);
 create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
 grant usage on schema auth,storage to authenticated,anon;
 create table public.neighborhoods(id uuid primary key,name text);
 create table public.actions(id uuid primary key,neighborhood_id uuid,action_date date,status text);
 create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);
 create table storage.objects(id uuid primary key default gen_random_uuid(),bucket_id text,name text,unique(bucket_id,name));
 alter table storage.objects enable row level security;grant select,insert,update,delete on storage.objects to authenticated;
 grant select on storage.objects to anon;
 create policy existing_permissive_storage_fixture on storage.objects for all to authenticated,anon using(true) with check(true);
 grant select on public.neighborhoods,public.actions to authenticated;
 insert into auth.users values('${owner}'),('${other}'),('${supervisor}'),('${aps}');
 insert into neighborhoods values('${territory}','Território isolado');
 insert into actions values('${id(90)}','${territory}','2026-10-19','realizada'),('${id(91)}','${territory}','2026-10-20','realizada'),('${id(92)}','${territory}','2026-10-19','planejada');
`);
await execute(
  fs.readFileSync(
    "supabase/migrations/20261019190000_fec_technical_cycles_staged.sql",
    "utf8",
  ),
);
passed++;
console.log("PASS migração integral executada");
await execute(`insert into fec_engagements(id,contract_reference,title,status) values('${contract}','TESTE ISOLADO','Teste','active'),('${contract2}','OUTRO TESTE','Outro','active');
 insert into fec_access_grants(engagement_id,user_id,role,active) values('${contract}','${owner}','executor',true),('${contract}','${other}','executor',true),('${contract}','${supervisor}','supervisor',true),('${contract2}','${aps}','executor',true);`);
await as(null, "anon");
await denied("anônimo lê registros", `select * from fec_knowledge_records;`);
await denied(
  "anônimo chama revisão",
  `select fec_review_record('cycle','${cycle}','approved',null);`,
);
await as(owner);
await denied(
  "executor concede acesso",
  `insert into fec_access_grants(engagement_id,user_id,role) values('${contract}','${aps}','supervisor');`,
);
await denied(
  "executor inventa revisão no INSERT",
  `insert into fec_cycles(engagement_id,owner_id,neighborhood_id,title,guiding_question,reviewed_by) values('${contract}','${owner}','${territory}','C','Q','${owner}');`,
);
await ok(
  "ciclo com território oficial",
  `insert into fec_cycles(id,engagement_id,owner_id,neighborhood_id,title,guiding_question,objectives,methodology) values('${cycle}','${contract}','${owner}','${territory}','Ciclo','Questão','Objetivos','Método');`,
);
await denied(
  "outro executor como autor",
  `insert into fec_cycles(engagement_id,owner_id,neighborhood_id,title,guiding_question) values('${contract}','${other}','${territory}','C','Q');`,
);
await ok(
  "atividade datada",
  `insert into fec_activities(id,cycle_id,owner_id,activity_date,activity_type,objective,methodology) values('${activity}','${cycle}','${owner}','2026-10-19','cartography_workshop','Objetivo','Método');`,
);
await denied('ação compartilhada em outra data',`update fec_activities set canonical_action_id='${id(91)}' where id='${activity}';`);
await denied('ação compartilhada ainda planejada',`update fec_activities set canonical_action_id='${id(92)}' where id='${activity}';`);
await ok('vínculo explícito ao mesmo evento realizado',`update fec_activities set canonical_action_id='${id(90)}' where id='${activity}';`);
await denied(
  "público em preparação",
  `insert into fec_activities(cycle_id,owner_id,activity_date,activity_type,objective,methodology,participation_kind,participation_count) values('${cycle}','${owner}','2026-10-19','preparation','O','M','estimated',4);`,
);
await denied(
  "mapa sem legenda",
  `insert into fec_knowledge_records(cycle_id,owner_id,kind,title,content,source_activity_ids) values('${cycle}','${owner}','map','Mapa','{"methodology":"M"}',array['${activity}']::uuid[]);`,
);
await denied(
  "achado sem fonte",
  `insert into fec_knowledge_records(cycle_id,owner_id,kind,title,content) values('${cycle}','${owner}','finding','Achado','{"description":"Poeira percebida"}');`,
);
await denied(
  "fonte inexistente",
  `insert into fec_knowledge_records(cycle_id,owner_id,kind,title,content,source_activity_ids) values('${cycle}','${owner}','finding','Achado','{"description":"Poeira percebida"}',array['${id(999)}']::uuid[]);`,
);
await ok(
  "mapa rastreável privado",
  `insert into fec_knowledge_records(id,cycle_id,owner_id,kind,title,content,source_activity_ids) values('${map}','${cycle}','${owner}','map','Mapa social','{"methodology":"Mapa coletivo","legend":"P = percepção","categories":"Experiências","authorship":"Grupo da oficina"}',array['${activity}']::uuid[]);`,
);
await denied('executor fabrica solicitação de ajustes',`update fec_knowledge_records set status='needs_changes' where id='${map}';`);
await ok(
  "arquivo privado do mapa",
  `insert into storage.objects(bucket_id,name) values('fec-technical-private','${map}/mapa.pdf');insert into fec_knowledge_files(record_id,object_name,title) values('${map}','${map}/mapa.pdf','Mapa');`,
);
await as(null, "anon");
await count(
  "anônimo não lê arquivo apesar de política anterior permissiva",
  `select * from storage.objects`,
  0,
);
await as(owner);
await denied(
  "metadado sem objeto",
  `insert into fec_knowledge_files(record_id,object_name,title) values('${map}','${map}/nao-existe.pdf','Ausente');`,
);
await denied(
  "validação comunitária sem contexto",
  `update fec_knowledge_records set community_status='confirmed' where id='${map}';`,
);
await denied(
  "campos de medição inventados",
  `update fec_knowledge_records set content=content||'{"concentration":"999"}' where id='${map}';`,
);
await as(other);
await count("outro executor não lê ciclo", `select * from fec_cycles`, 0);
await count(
  "outro executor não lê mapa",
  `select * from fec_knowledge_records`,
  0,
);
await count(
  "outro executor não lê arquivos",
  `select * from storage.objects`,
  0,
);
await count(
  "outro executor não lê metadados",
  `select * from fec_knowledge_files`,
  0,
);
await denied(
  "outro executor usa ciclo alheio",
  `insert into fec_activities(cycle_id,owner_id,activity_date,activity_type,objective,methodology) values('${cycle}','${other}','2026-10-19','training','O','M');`,
);
await as(aps);
await count(
  "APS sem grant do aditivo não lê FEC",
  `select * from fec_cycles`,
  0,
);
await denied(
  "supervisão de outro contrato",
  `select fec_review_record('cycle','${cycle}','approved',null);`,
);
await as(owner);
await denied(
  "autoaprovação por RPC",
  `select fec_review_record('cycle','${cycle}','approved',null);`,
);
await denied(
  "aprovação direta",
  `update fec_cycles set status='approved' where id='${cycle}';`,
);
await ok(
  "envio do ciclo",
  `update fec_cycles set status='submitted' where id='${cycle}';`,
);
await count(
  "conteúdo enviado não é editável",
  `update fec_cycles set title='Alterado' where id='${cycle}' returning id`,
  0,
);
await as(supervisor);
await count("supervisor lê mapa", `select * from fec_knowledge_records`, 1);
await count(
  "supervisor não reescreve ciclo",
  `update fec_cycles set title='Reescrito' where id='${cycle}' returning id`,
  0,
);
await denied(
  "decisão nula",
  `select fec_review_record('cycle','${cycle}',null,null);`,
);
await ok(
  "supervisão aprova ciclo",
  `select fec_review_record('cycle','${cycle}','approved','Conferido');`,
);
await as(owner);
await denied(
  "atividade cartográfica enviada sem método e legenda",
  `update fec_activities set status='submitted' where id='${activity}';`,
);
await ok(
  "completa e envia atividade",
  `update fec_activities set map_method='Coletivo',map_legend='P = percepção',status='submitted' where id='${activity}';`,
);
await ok(
  "envia mapa",
  `update fec_knowledge_records set status='submitted' where id='${map}';`,
);
await denied(
  "upload após envio",
  `insert into storage.objects(bucket_id,name) values('fec-technical-private','${map}/tardio.pdf');`,
);
await count(
  "arquivo revisado preservado",
  `delete from storage.objects returning id`,
  0,
);
await count(
  "arquivo não pode ser renomeado após envio",
  `update storage.objects set name='${map}/renomeado.pdf' returning id`,
  0,
);
await as(supervisor);
await denied(
  "aprova produto antes da origem",
  `select fec_review_record('knowledge','${map}','approved',null);`,
);
await ok(
  "aprova origem",
  `select fec_review_record('activity','${activity}','approved',null);`,
);
await ok(
  "aprova mapa sem presumir validação comunitária",
  `select fec_review_record('knowledge','${map}','approved',null);`,
);
assert.equal(
  (
    await db.query(
      `select community_status from fec_knowledge_records where id='${map}'`,
    )
  ).rows[0].community_status,
  "not_requested",
);
passed++;
await denied(
  "reabre sem motivo",
  `select fec_review_record('knowledge','${map}','needs_changes','');`,
);
await denied(
  "histórico forjado",
  `insert into fec_review_log(engagement_id,record_kind,record_id,decision,reviewer_id) values('${contract}','knowledge','${map}','approved','${supervisor}');`,
);
await as(owner);
await count(
  "aprovação congela mapa",
  `update fec_knowledge_records set title='Tardio' where id='${map}' returning id`,
  0,
);
await ok(
  "nova versão mantém identidade",
  `insert into fec_knowledge_records(cycle_id,owner_id,kind,title,content,source_activity_ids,previous_id) select cycle_id,owner_id,kind,'Mapa v2',content,source_activity_ids,id from fec_knowledge_records where id='${map}';`,
);
assert.equal(
  (
    await db.query(
      `select version from fec_knowledge_records where previous_id='${map}'`,
    )
  ).rows[0].version,
  2,
);
passed++;
await denied(
  "bifurcação da versão antiga",
  `insert into fec_knowledge_records(cycle_id,owner_id,kind,title,content,source_activity_ids,previous_id) select cycle_id,owner_id,kind,'Mapa v2 extra',content,source_activity_ids,id from fec_knowledge_records where id='${map}';`,
);
await ok(
  "achado com mapa-fonte aprovado",
  `insert into fec_knowledge_records(id,cycle_id,owner_id,kind,title,content,source_record_ids) values('${finding}','${cycle}','${owner}','finding','Achado','{"description":"Percepção coletiva, sem causalidade comprovada","uncertainty":"Grupo limitado"}',array['${map}']::uuid[]);`,
);
await denied(
  "providência executada sem resposta",
  `insert into fec_knowledge_records(cycle_id,owner_id,kind,title,content,source_activity_ids,proposal_status) values('${cycle}','${owner}','proposal','Proposta','{"description":"Encaminhar demanda"}',array['${activity}']::uuid[],'implemented');`,
);
await as(supervisor);
await denied(
  "produto aprovado preservado mesmo com motivo",
  `select fec_review_record('knowledge','${map}','needs_changes','Conferir legenda');`,
);
await ok(
  "reabre atividade com justificativa",
  `select fec_review_record('activity','${activity}','needs_changes','Conferir metodologia');`,
);
await as(owner);
await ok(
  "ajuste da atividade devolvida",
  `update fec_activities set methodology='Método corrigido',status='draft' where id='${activity}';`,
);
await execute("reset role");
await execute(
  `update fec_access_grants set role='supervisor' where engagement_id='${contract}' and user_id='${owner}';`,
);
await as(owner);
await denied(
  "autor com grant supervisor também não se aprova",
  `select fec_review_record('knowledge','${finding}','approved',null);`,
);
await execute("reset role");
await execute(
  `update fec_access_grants set role='executor' where engagement_id='${contract}' and user_id='${owner}';update fec_access_grants set active=false where engagement_id='${contract}' and user_id='${other}';`,
);
await as(other);
await count("atribuição inativa não lê", `select * from fec_cycles`, 0);
await denied(
  "atribuição inativa não cria ciclo",
  `insert into fec_cycles(engagement_id,owner_id,neighborhood_id,title,guiding_question) values('${contract}','${other}','${territory}','Inativo','Q');`,
);
await execute("reset role");
await execute(
  `update fec_engagements set status='closed' where id='${contract}';`,
);
await as(owner);
await count("aditivo fechado mantém leitura", `select * from fec_cycles`, 1);
await count(
  "aditivo fechado impede edição",
  `update fec_knowledge_records set title='Fechado' where id='${map}' returning id`,
  0,
);
await as(supervisor);
await denied(
  "aditivo fechado impede revisão",
  `select fec_review_record('knowledge','${finding}','approved',null);`,
);
await execute("reset role");
assert.equal(
  (
    await db.query(
      `select count(*)::int n from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname like 'fec_%' and p.prosecdef`,
    )
  ).rows[0].n,
  0,
);
passed++;
assert.equal(
  (await db.query(`select count(*)::int n from fec_review_log`)).rows[0].n > 10,
  true,
);
passed++;
console.log(`${passed} verificações PostgreSQL/RLS FEC passaram.`);
await db.close();
