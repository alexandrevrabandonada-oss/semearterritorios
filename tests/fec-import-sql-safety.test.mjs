import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
const sql=(await readFile(new URL('../supabase/migrations/20261117011958_fec_import_documental_privado.sql',import.meta.url),'utf8')).toLowerCase();
const supportingSql=(await readFile(new URL('../supabase/migrations/20261117012218_fec_supporting_documents.sql',import.meta.url),'utf8')).toLowerCase();
test('schema privado com RLS, retenção sem delete e comparação confiável separada',()=>{
 for(const t of ['fec_import_batches','fec_import_documents','fec_import_forms','fec_import_reviews']){
  assert.ok(sql.includes(`create table public.${t}`));assert.ok(sql.includes(`alter table public.${t} enable row level security`));
 }
 assert.ok(sql.includes('comparison_verified is distinct from true'));
 assert.ok(sql.includes('fec_import_storage_restrict_anon'));
 assert.ok(sql.includes("'fec-import-private','fec-import-private',false"));
 assert.ok(!sql.includes('grant delete on public.fec_import_reviews'));
});
test('migração não escreve APS, atividades nem relatórios aprovados',()=>{
 for(const name of ['public.listening_records','public.weekly_team_reports','public.fec_activities','public.fec_monthly_reports'])assert.ok(!sql.includes(`insert into ${name}`));
});
test('migração complementar limita os documentos e preserva RLS/Storage privado',()=>{
 assert.match(supportingSql,/jsonb_array_length\(manifest\)\s+between\s+1\s+and\s+6/);
 assert.match(supportingSql,/kind\s+in\s+\('monthly_report',\s*'questionnaires',\s*'supporting'\)/);
 assert.match(supportingSql,/create unique index fec_import_documents_one_primary_kind/);
 assert.match(supportingSql,/create trigger fec_import_document_count_limit/);
 assert.match(supportingSql,/if document_count >= 6 then/);
 assert.match(supportingSql,/set file_size_limit = 4194304/);
 assert.doesNotMatch(supportingSql,/drop policy|disable row level security|grant .* to authenticated|grant .* to anon|delete from/);
});
