import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
const sql=(await readFile(new URL('../supabase/migrations/20261109182913_fec_import_documental_privado.sql',import.meta.url),'utf8')).toLowerCase();
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
