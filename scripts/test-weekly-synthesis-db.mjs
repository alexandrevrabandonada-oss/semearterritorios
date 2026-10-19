/** Isolated PostgreSQL checks. Argument: absolute @electric-sql/pglite/dist/index.js path. */
import assert from "node:assert/strict";
import fs from "node:fs";
import { pathToFileURL } from "node:url";
const { PGlite } = await import(pathToFileURL(process.argv[2]).href);
const db = new PGlite();
await db.exec(`create role anon;create role authenticated;create role service_role bypassrls;
create schema auth;create schema private;create schema storage;grant usage on schema auth,private,storage to authenticated;
create table storage.objects(id uuid primary key default gen_random_uuid(),bucket_id text,name text);
create function storage.foldername(text) returns text[] language sql as $$select (string_to_array($1,'/'))[1:array_length(string_to_array($1,'/'),1)-1]$$;
grant select,insert,update,delete on storage.objects to authenticated;alter table storage.objects enable row level security;create policy storage_test on storage.objects for all to authenticated using(true) with check(true);
create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
create table profiles(id uuid primary key,role text);create table team_members(id uuid primary key,profile_id uuid,active boolean);
create table actions(id uuid primary key,action_date date);create table workshop_records(id uuid primary key,action_id uuid);
create table weekly_team_reports(id uuid primary key,team_member_id uuid,profile_id uuid,week_start date,week_end date,status text,created_by uuid,created_at timestamptz default now(),updated_at timestamptz default now(),review_notes text,reviewed_by uuid,reviewed_at timestamptz,title text);
create table weekly_team_report_attachments(id uuid primary key,report_id uuid);
create function get_user_role() returns text language sql stable set search_path='' as $$select role from public.profiles where id=auth.uid()$$;
grant select on profiles,team_members,actions,workshop_records to authenticated;grant select,insert,update on weekly_team_reports,weekly_team_report_attachments to authenticated;
alter table weekly_team_reports enable row level security;
create policy weekly_read on weekly_team_reports for select to authenticated using(get_user_role()='coordenacao' or exists(select 1 from team_members where id=team_member_id and profile_id=auth.uid()));
create policy weekly_write on weekly_team_reports for update to authenticated using(get_user_role()='coordenacao' or exists(select 1 from team_members where id=team_member_id and profile_id=auth.uid()));
`);
await db.exec(
  fs.readFileSync(
    "supabase/migrations/20261015232631_weekly_activity_monthly_synthesis.sql",
    "utf8",
  ),
);
const coord = "10000000-0000-0000-0000-000000000001",
  owner = "10000000-0000-0000-0000-000000000002",
  other = "10000000-0000-0000-0000-000000000003";
const member = "20000000-0000-0000-0000-000000000001",
  report = "30000000-0000-0000-0000-000000000001",
  action = "40000000-0000-0000-0000-000000000001",
  item = "50000000-0000-0000-0000-000000000001",
  product = "60000000-0000-0000-0000-000000000001",
  attachment = "70000000-0000-0000-0000-000000000001",
  synthesis = "80000000-0000-0000-0000-000000000001";
await db.exec(
  `insert into profiles values('${coord}','coordenacao'),('${owner}','equipe'),('${other}','equipe');insert into team_members values('${member}','${owner}',true);insert into actions values('${action}','2026-10-01');insert into weekly_team_reports(id,team_member_id,week_start,week_end,status,created_by,title) values('${report}','${member}','2026-09-28','2026-10-04','draft','${owner}','Semana');insert into weekly_team_report_attachments values('${attachment}','${report}',null,null);`,
);
let passed = 0;
async function as(id) {
  await db.exec(
    `reset role;select set_config('request.jwt.claim.sub','${id}',false);set role authenticated;`,
  );
}
async function ok(label, sql) {
  await db.exec(sql);
  passed++;
  console.log("PASS " + label);
}
async function blocked(label, sql) {
  await assert.rejects(db.exec(sql));
  passed++;
  console.log("PASS blocked " + label);
}
async function equal(sql, n) {
  assert.equal((await db.query(sql)).rows.length, n);
  passed++;
}
await as(owner);
await ok(
  "dated field activity",
  `insert into weekly_activity_items(id,report_id,activity_date,action_id,kind,title,fronts) values('${item}','${report}','2026-10-01','${action}','field','Oficina','["education","mapping"]');`,
);
await blocked(
  "date outside weekly period",
  `update weekly_activity_items set activity_date='2026-11-01' where id='${item}';`,
);
await blocked(
  "field without action",
  `update weekly_activity_items set action_id=null where id='${item}';`,
);
await blocked(
  "invalid front",
  `update weekly_activity_items set fronts='["invented"]' where id='${item}';`,
);
await blocked(
  "map without legend",
  `insert into weekly_activity_products(item_id,title,product_type) values('${item}','Mapa','social_map');`,
);
await ok(
  "map product",
  `insert into weekly_activity_products(id,item_id,title,product_type,map_context,map_legend) values('${product}','${item}','Mapa','social_map','Oficina','Pontos');`,
);
await ok(
  "attachment association",
  `update weekly_team_report_attachments set activity_item_id='${item}',product_version_id='${product}' where id='${attachment}';`,
);
await ok('private storage upload in draft',`insert into storage.objects(bucket_id,name) values('project-memory-documents','${report}/mapa.pdf');`);
await as(other);
await equal("select * from weekly_activity_items", 0);
await equal("select * from weekly_activity_products", 0);
await blocked(
  "other inserts item",
  `insert into weekly_activity_items(report_id,activity_date,kind,title) values('${report}','2026-10-02','preparation','Outro');`,
);
await as(owner);
await blocked(
  "self approval",
  `update weekly_team_reports set status='approved' where id='${report}';`,
);
await ok(
  "submit",
  `update weekly_team_reports set status='submitted' where id='${report}';`,
);
await equal(
  `update weekly_activity_items set title='late' where id='${item}' returning id`,
  0,
);
await blocked('private storage upload after submission',`insert into storage.objects(bucket_id,name) values('project-memory-documents','${report}/late.pdf');`);
await equal(`delete from storage.objects where bucket_id='project-memory-documents' returning id`,0);
await as(coord);
await blocked(
  "edit submitted content",
  `update weekly_team_reports set title='late' where id='${report}';`,
);
await ok(
  "review",
  `update weekly_team_reports set status='in_review' where id='${report}';`,
);
await ok(
  "approve weekly",
  `update weekly_team_reports set status='approved' where id='${report}';`,
);
await blocked(
  "erase approved attachment association",
  `update weekly_team_report_attachments set activity_item_id=null,product_version_id=null where id='${attachment}';`,
);
await blocked(
  "reopen without reason",
  `update weekly_team_reports set status='needs_changes' where id='${report}';`,
);
await ok(
  "reopen with reason",
  `update weekly_team_reports set status='needs_changes',review_notes='Detalhar método' where id='${report}';`,
);
await as(owner);
await ok(
  "revise item",
  `update weekly_activity_items set methodology='Roda dialogada' where id='${item}';`,
);
await ok(
  "new product version",
  `insert into weekly_activity_products(item_id,product_key,version,title,product_type) select '${item}',product_key,2,'Mapa revisto','diagnosis' from weekly_activity_products where id='${product}';`,
);
await blocked(
  "skip version",
  `insert into weekly_activity_products(item_id,product_key,version,title,product_type) select '${item}',product_key,4,'Outra','diagnosis' from weekly_activity_products where id='${product}';`,
);
await blocked(
  "staff creates synthesis",
  `insert into monthly_syntheses(reference_month,scope_key,version,base,source_hash) values('2026-10-01','project',1,'{}','hash');`,
);
await as(coord);
await ok(
  "create synthesis",
  `insert into monthly_syntheses(id,reference_month,scope_key,version,base,source_hash) values('${synthesis}','2026-10-01','${member}',1,'{}','hash');`,
);
await blocked(
  "approve missing checks",
  `update monthly_syntheses set status='approved' where id='${synthesis}';`,
);
await ok(
  "approve synthesis",
  `update monthly_syntheses set status='approved',edited_blocks='[{"section":"Síntese","text":"Revisada","source_ids":[]}]',review_checklist='{"sources":true,"methodology":true,"privacy":true,"public_version":true}' where id='${synthesis}';`,
);
await blocked(
  "edit frozen synthesis",
  `update monthly_syntheses set edited_blocks='[]' where id='${synthesis}';`,
);
await blocked(
  "forge history",
  `insert into monthly_synthesis_history(synthesis_id,actor_id,event,details) values('${synthesis}','${coord}','approved','{}');`,
);
await ok(
  "record delivery receipt",
  `update monthly_syntheses set sync_receipt='receipt' where id='${synthesis}';`,
);
await as(owner);
await equal("select * from monthly_syntheses", 1);
await equal("select * from weekly_activity_review_history", 4);
await as(other);
await equal("select * from monthly_syntheses", 0);
await equal("select * from monthly_synthesis_history", 0);
console.log(`${passed} isolated weekly/synthesis PostgreSQL checks passed.`);
await db.close();
