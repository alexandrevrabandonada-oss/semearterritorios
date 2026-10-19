/** Execute against an isolated PGlite PostgreSQL instance, never the production database.
 * Usage: node scripts/test-professional-monthly-db.mjs <absolute path to @electric-sql/pglite/dist/index.js>
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import { pathToFileURL } from "node:url";
const { PGlite } = await import(pathToFileURL(process.argv[2]).href);
const db = new PGlite();
await db.exec(`
create role anon; create role authenticated; create role service_role bypassrls;
create schema auth; create schema storage;
create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
create table public.profiles(id uuid primary key,role text);
create table public.team_members(id uuid primary key,profile_id uuid,active boolean);
create table public.actions(id uuid primary key,action_date date);
create table public.workshop_records(id uuid primary key,action_id uuid references public.actions(id),workshop_date date);
create table public.neighborhoods(id uuid primary key);
create table public.project_memory_entries(id uuid primary key default gen_random_uuid(),source_report_id uuid,visibility text,created_by uuid);
create table storage.buckets(id text primary key,name text,public boolean,file_size_limit integer,allowed_mime_types text[]);
create table storage.objects(id uuid primary key default gen_random_uuid(),bucket_id text,name text);
alter table storage.objects enable row level security;
create function storage.foldername(text) returns text[] language sql as $$select (string_to_array($1,'/'))[1:array_length(string_to_array($1,'/'),1)-1]$$;
create function public.get_user_role() returns text language sql stable as $$select role from public.profiles where id=auth.uid()$$;
grant usage on schema public,auth,storage to authenticated;
grant select on public.profiles,public.team_members,public.actions,public.workshop_records,public.neighborhoods to authenticated;
grant all on public.project_memory_entries to authenticated;
grant select,insert,update,delete on storage.objects to authenticated;
`);
await db.exec(fs.readFileSync("supabase/migrations/20261014213804_professional_monthly_reports.sql", "utf8"));
const reviewer = "10000000-0000-0000-0000-000000000001", owner = "10000000-0000-0000-0000-000000000002", other = "10000000-0000-0000-0000-000000000003";
const member = "20000000-0000-0000-0000-000000000002", otherMember = "20000000-0000-0000-0000-000000000003";
const report = "30000000-0000-0000-0000-000000000001", action = "40000000-0000-0000-0000-000000000001", outside = "40000000-0000-0000-0000-000000000002", workshop = "50000000-0000-0000-0000-000000000001";
const doc = "60000000-0000-0000-0000-000000000001", doc2 = "60000000-0000-0000-0000-000000000002";
await db.exec(`insert into profiles values('${reviewer}','coordenacao'),('${owner}','equipe'),('${other}','equipe'); insert into team_members values('${member}','${owner}',true),('${otherMember}','${other}',true); insert into actions values('${action}','2026-10-04'),('${outside}','2026-09-04'); insert into workshop_records values('${workshop}','${action}','2026-10-04');`);
async function as(id) { await db.exec(`reset role; select set_config('request.jwt.claim.sub','${id}',false); set role authenticated;`); }
let count = 0;
async function pass(label, sql) { await db.exec(sql); count++; console.log(`PASS ${label}`); }
async function blocked(label, sql) { await assert.rejects(db.exec(sql)); count++; console.log(`PASS blocked: ${label}`); }
async function rows(sql) { return (await db.query(sql)).rows; }
await as(owner);
await pass("owner creates draft",`insert into professional_monthly_reports(id,team_member_id,reference_month,title,summary) values('${report}','${member}','2026-10-01','Outubro','Síntese');`);
await blocked("duplicate month",`insert into professional_monthly_reports(team_member_id,reference_month,title) values('${member}','2026-10-01','Duplicado');`);
await blocked("impersonate professional",`insert into professional_monthly_reports(team_member_id,reference_month,title) values('${otherMember}','2026-10-01','Outro');`);
await blocked("submission without document",`update professional_monthly_reports set status='submitted' where id='${report}';`);
await blocked("out of month without explanation",`insert into professional_monthly_activity_links(report_id,action_id) values('${report}','${outside}');`);
await pass("outside month justified",`insert into professional_monthly_activity_links(report_id,action_id,period_justification) values('${report}','${outside}','Retomada no diagnóstico deste mês');`);
await pass("workshop link",`insert into professional_monthly_activity_links(report_id,workshop_id) values('${report}','${workshop}');`);
await blocked("no field month with links",`update professional_monthly_reports set no_field_activity=true,no_field_justification='Planejamento' where id='${report}';`);
await blocked("social map without context",`insert into professional_monthly_deliveries(report_id,delivery_type,title) values('${report}','social_map','Mapa');`);
await pass("social map with legend",`insert into professional_monthly_deliveries(report_id,delivery_type,title,map_context,map_legend) values('${report}','social_map','Mapa','Oficina coletiva','Pontos vermelhos indicam problemas percebidos');`);
async function document(id, name) { await db.exec(`insert into storage.objects(bucket_id,name) values('professional-monthly-documents','${report}/${id}-${name}'); insert into professional_monthly_attachments(id,report_id,storage_path,file_name,file_size) values('${id}','${report}','${report}/${id}-${name}','${name}',100);`); }
await document(doc,"outubro.docx");
await pass("select main document",`update professional_monthly_reports set main_attachment_id='${doc}' where id='${report}';`);
await blocked("spoof review fields",`update professional_monthly_reports set reviewed_by='${owner}' where id='${report}';`);
await as(other);
assert.equal((await rows("select * from professional_monthly_reports")).length,0); count++;
assert.equal((await rows("select * from professional_monthly_attachments")).length,0); count++;
assert.equal((await rows("select * from storage.objects")).length,0); count++;
await blocked("other user upload",`insert into storage.objects(bucket_id,name) values('professional-monthly-documents','${report}/other.pdf');`);
await as(owner);
await pass("submit",`update professional_monthly_reports set status='submitted' where id='${report}';`);
await blocked("alter child after submission",`insert into professional_monthly_deliveries(report_id,delivery_type,title) values('${report}','proposals','Injeção');`);
await blocked("alter storage version",`insert into storage.objects(bucket_id,name) values('professional-monthly-documents','${report}/late.pdf');`);
// An UPDATE rejected by RLS may return zero rows without an exception.
assert.equal((await rows(`update professional_monthly_reports set status='approved' where id='${report}' returning id`)).length,0); count++;
await as(reviewer);
await pass("start review",`update professional_monthly_reports set status='in_review' where id='${report}';`);
await blocked("approve without checks",`update professional_monthly_reports set status='approved' where id='${report}';`);
await blocked("request changes without reason",`update professional_monthly_reports set status='needs_changes' where id='${report}';`);
await pass("approve",`update professional_monthly_reports set status='approved',review_checklist='{"document":true,"links":true,"deliveries":true,"privacy":true}' where id='${report}';`);
assert.equal((await rows(`select reviewed_attachment_id from professional_monthly_reports where id='${report}'`))[0].reviewed_attachment_id,doc); count++;
await blocked("edit approved report",`update professional_monthly_reports set summary='alterado' where id='${report}';`);
await blocked("change approved document",`update professional_monthly_reports set main_attachment_id=null where id='${report}';`);
assert.equal((await rows(`update professional_monthly_deliveries set title='alterado' where report_id='${report}' returning id`)).length,0); count++;
await blocked("forge history",`insert into professional_monthly_history(report_id,actor_id,to_status) values('${report}','${owner}','approved');`);
await blocked("reopen without justification",`update professional_monthly_reports set status='needs_changes' where id='${report}';`);
await pass("internal memory from approved report",`insert into project_memory_entries(source_monthly_report_id,visibility,created_by) values('${report}','internal','${reviewer}');`);
await pass("reopen with reason",`update professional_monthly_reports set status='needs_changes',review_note='Corrigir metodologia' where id='${report}';`);
await blocked("memory from unapproved report",`insert into project_memory_entries(source_monthly_report_id,visibility,created_by) values('${report}','internal','${reviewer}');`);
await as(owner);
await document(doc2,"outubro-v2.pdf");
await pass("new main version",`update professional_monthly_reports set main_attachment_id='${doc2}' where id='${report}';`);
assert.equal((await rows("select * from professional_monthly_attachments")).length,2); count++;
await blocked("replace old attachment path",`update professional_monthly_attachments set storage_path='${report}/overwrite.pdf' where id='${doc}';`);
await pass("resubmit revised document",`update professional_monthly_reports set status='submitted' where id='${report}';`);
await as(reviewer);
await pass("review and reapprove",`update professional_monthly_reports set status='in_review' where id='${report}'; update professional_monthly_reports set status='approved',review_checklist='{"document":true,"links":true,"deliveries":true,"privacy":true}' where id='${report}';`);
const audit = await rows(`select * from professional_monthly_history where report_id='${report}' order by created_at`);
assert.equal(audit.filter(h=>h.to_status==='approved').length,2); assert.equal(audit.filter(h=>h.to_status==='approved').at(-1).attachment_id,doc2); count++;
await as(owner);
await blocked("no field missing reason",`insert into professional_monthly_reports(team_member_id,reference_month,title,no_field_activity) values('${member}','2026-11-01','Novembro',true);`);
await pass("no field month justified",`insert into professional_monthly_reports(team_member_id,reference_month,title,no_field_activity,no_field_justification) values('${member}','2026-11-01','Novembro',true,'Planejamento e sistematização');`);
console.log(`${count} PostgreSQL checks passed.`);
await db.close();
