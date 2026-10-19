import assert from "node:assert/strict";
import fs from "node:fs";
import { PGlite } from "@electric-sql/pglite";
const db = new PGlite();
let passed = 0;
const id = (n) => `10000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
const [owner, other, supervisor, aps, scope, territory, cycle, activity] =
  Array.from({ length: 8 }, (_, i) => id(i + 1));
const exec = (sql) => db.exec(sql);
async function as(user, role = "authenticated") {
  await exec(
    `reset role;select set_config('request.jwt.claim.sub','${user ?? ""}',false);set role ${role};`,
  );
}
async function check(label, fn) {
  await fn();
  passed++;
  console.log("PASS " + label);
}
async function denied(label, fn) {
  await assert.rejects(fn);
  passed++;
  console.log("PASS bloqueado: " + label);
}
async function rpc(name, args) {
  const params = args.map((_, i) => "$" + (i + 1)).join(",");
  return (await db.query(`select to_jsonb(public.${name}(${params})) r`, args))
    .rows[0].r;
}
await exec(`create role anon;create role authenticated;create role service_role bypassrls;create schema auth;create schema storage;
create table auth.users(id uuid primary key);create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;grant usage on schema auth,storage to authenticated,anon;
create table neighborhoods(id uuid primary key,name text);create table actions(id uuid primary key,neighborhood_id uuid,action_date date,status text);
create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);create table storage.objects(id uuid primary key default gen_random_uuid(),bucket_id text,name text);alter table storage.objects enable row level security;grant select,insert,update,delete on storage.objects to authenticated;
grant select on neighborhoods,actions to authenticated;insert into auth.users values('${owner}'),('${other}'),('${supervisor}'),('${aps}');insert into neighborhoods values('${territory}','Território de homologação');`);
await exec(
  fs.readFileSync(
    "supabase/migrations/20261019190000_fec_technical_cycles_staged.sql",
    "utf8",
  ),
);
await exec(
  fs.readFileSync(
    "supabase/migrations/20261019190720_fec_monthly_report_versions.sql",
    "utf8",
  ),
);
passed++;
console.log("PASS migrações FEC integrais executadas");
await exec(
  `insert into fec_engagements(id,contract_reference,title,status) values('${scope}','TESTE-MENSAL','Aditivo isolado','active');insert into fec_access_grants(engagement_id,user_id,role,active) values('${scope}','${owner}','executor',true),('${scope}','${other}','executor',true),('${scope}','${supervisor}','supervisor',true);`,
);
await as(owner);
await exec(
  `insert into fec_cycles(id,engagement_id,owner_id,neighborhood_id,title,guiding_question,objectives,methodology) values('${cycle}','${scope}','${owner}','${territory}','Ciclo','Questão','Objetivos','Método');insert into fec_activities(id,cycle_id,owner_id,activity_date,activity_type,objective,methodology,participation_kind,participation_count) values('${activity}','${cycle}','${owner}','2026-10-19','training','Objetivo','Método','estimated',12);update fec_activities set status='submitted' where id='${activity}';`,
);
await as(supervisor);
await rpc("fec_review_record", ["activity", activity, "approved", "Conferido"]);
await as(null, "anon");
await denied("anônimo lê fechamento", () =>
  exec("select * from fec_monthly_reports"),
);
await denied("anônimo abre fechamento", () =>
  rpc("fec_monthly_open", [scope, "2026-10-01", null]),
);
await as(aps);
await denied("APS sem atribuição abre fechamento", () =>
  rpc("fec_monthly_open", [scope, "2026-10-01", null]),
);
await as(owner);
let row = await rpc("fec_monthly_open", [scope, "2026-10-01", null]);
await check("abertura congela fontes e hash SHA-256", async () => {
  assert.equal(row.owner_id, owner);
  assert.equal(row.version, 1);
  assert.match(row.source_hash, /^[a-f0-9]{64}$/);
  assert.equal(row.snapshot.activities[0].id, activity);
  assert.equal(row.snapshot.neighborhoods[0].name, "Território de homologação");
});
await check("abertura repetida retorna mesma versão", async () =>
  assert.equal(
    (await rpc("fec_monthly_open", [scope, "2026-10-01", null])).id,
    row.id,
  ),
);
await denied("cliente insere snapshot forjado", () =>
  exec(
    `insert into fec_monthly_reports(engagement_id,owner_id,reference_month,version,snapshot,source_hash) values('${scope}','${owner}','2026-10-01',9,'{}','${"a".repeat(64)}')`,
  ),
);
await denied("cliente altera snapshot diretamente", () =>
  exec(`update fec_monthly_reports set snapshot='{}' where id='${row.id}'`),
);
await denied("envio sem texto salvo", () =>
  rpc("fec_monthly_transition", [row.id, row.revision, "submitted", "", "{}"]),
);
const titles = [
  "1. Síntese do período",
  "2. Territórios trabalhados",
  "3. Ciclos técnicos em andamento",
  "4. Oficinas e atividades realizadas",
  "5. Mapa social",
  "6. Diagnóstico participativo",
  "7. Achado territorial",
  "8. Proposta e encaminhamento",
  "9. Dificuldades, limitações e lacunas",
  "10. Planejamento das próximas atividades",
  "11. Anexos e registros comprobatórios",
];
const blocks = titles.map((title) => ({
  title,
  text: "Texto conferível da seção.",
  sourceIds: [activity],
}));
const save = (r, b = blocks, reason = "") =>
  rpc("fec_monthly_save", [r.id, r.revision, JSON.stringify(b), reason]);
const transition = (r, d, reason = "", checks = {}) =>
  rpc("fec_monthly_transition", [
    r.id,
    r.revision,
    d,
    reason,
    JSON.stringify(checks),
  ]);
await denied("referência externa às fontes congeladas", () =>
  save(
    row,
    blocks.map((b, i) => (i === 0 ? { ...b, sourceIds: [other] } : b)),
  ),
);
await denied("estrutura sem onze seções", () => save(row, blocks.slice(0, 10)));
const originalSnapshot = JSON.stringify(row.snapshot),
  originalHash = row.source_hash;
const oldRevision = row.revision;
row = await save(row);
await check("edição textual não muda fontes nem indicadores", async () => {
  assert.equal(JSON.stringify(row.snapshot), originalSnapshot);
  assert.equal(row.source_hash, originalHash);
});
await denied("revisão concorrente perde atualização", () =>
  rpc("fec_monthly_save", [row.id, oldRevision, JSON.stringify(blocks), ""]),
);
await as(other);
await check("outro executor não vê fechamento nem histórico", async () => {
  assert.equal(
    (await db.query("select * from fec_monthly_reports")).rows.length,
    0,
  );
  assert.equal(
    (await db.query("select * from fec_monthly_history")).rows.length,
    0,
  );
});
await denied("outro executor modifica relatório", () => save(row));
await denied("outro executor consulta hash", () =>
  rpc("fec_monthly_check", [row.id]),
);
await as(owner);
await exec(
  `insert into fec_activities(cycle_id,owner_id,activity_date,activity_type,objective,methodology) values('${cycle}','${owner}','2026-10-20','preparation','Preparação','Leitura documental');`,
);
await check("mudança nas fontes é sinalizada", async () =>
  assert.equal((await rpc("fec_monthly_check", [row.id])).stale, true),
);
await denied("fontes desatualizadas impedem envio", () =>
  transition(row, "submitted"),
);
row = await rpc("fec_monthly_refresh", [row.id, row.revision]);
await check(
  "recomposição atualiza hash e limpa texto para conferência",
  async () => {
    assert.notEqual(row.source_hash, originalHash);
    assert.equal(row.blocks.length, 0);
  },
);
row = await save(row);
row = await transition(row, "submitted");
await denied("executor se aprova", () =>
  transition(row, "approved", "", {
    sources: true,
    methodology: true,
    privacy: true,
    deliverables: true,
  }),
);
await denied("executor edita versão enviada", () => save(row));
await as(supervisor);
await denied("aprovação antes de iniciar revisão", () =>
  transition(row, "approved"),
);
row = await transition(row, "in_review");
await denied("supervisor reescreve conteúdo do autor", () => save(row));
await denied("aprovação sem conferências", () => transition(row, "approved"));
await denied("ajustes sem justificativa", () =>
  transition(row, "needs_changes"),
);
await as(owner);
await exec(
  `insert into fec_activities(cycle_id,owner_id,activity_date,activity_type,objective,methodology) values('${cycle}','${owner}','2026-10-21','systematization','Sistematizar','Método');`,
);
await as(supervisor);
const checklist = {
  sources: true,
  methodology: true,
  privacy: true,
  deliverables: true,
};
await denied("fontes mudaram durante revisão: aprovação bloqueada", () =>
  transition(row, "approved", "Conferido", checklist),
);
row = await transition(row, "needs_changes", "Recompor as fontes do período");
await as(owner);
row = await rpc("fec_monthly_refresh", [row.id, row.revision]);
row = await save(row);
row = await transition(row, "submitted");
await as(supervisor);
row = await transition(row, "in_review");
row = await transition(row, "approved", "Revisão técnica concluída", checklist);
const frozen = JSON.stringify(row);
await check("aprovação registra responsável e conferências", async () => {
  assert.equal(row.reviewed_by, supervisor);
  assert.equal(row.review_checklist.privacy, true);
});
await denied("supervisor reabre versão aprovada", () =>
  transition(row, "needs_changes", "Alterar versão"),
);
await as(owner);
await denied("autor edita aprovação", () => save(row));
await denied("atualiza fontes de versão aprovada", () =>
  rpc("fec_monthly_refresh", [row.id, row.revision]),
);
await denied("nova versão sem intenção explícita", () =>
  rpc("fec_monthly_open", [scope, "2026-10-01", null]),
);
let next = await rpc("fec_monthly_open", [scope, "2026-10-01", row.id]);
await check("nova versão encadeada preserva aprovação anterior", async () => {
  assert.equal(next.version, 2);
  assert.equal(next.previous_id, row.id);
  assert.equal(
    JSON.stringify(
      (
        await db.query(
          "select to_jsonb(r) r from fec_monthly_reports r where id=$1",
          [row.id],
        )
      ).rows[0].r,
    ),
    frozen,
  );
});
await denied("segunda versão aberta em paralelo", () =>
  rpc("fec_monthly_open", [scope, "2026-10-01", row.id]),
);
await denied("histórico forjado", () =>
  exec(
    `insert into fec_monthly_history(report_id,actor_id,event,to_status,revision) values('${row.id}','${owner}','approved','approved',99)`,
  ),
);
await denied("histórico apagado", () =>
  exec(`delete from fec_monthly_history where report_id='${row.id}'`),
);
await check("histórico preserva envios, ajustes e aprovação", async () => {
  const events = (
    await db.query(
      "select event from fec_monthly_history where report_id=$1 order by revision",
      [row.id],
    )
  ).rows.map((r) => r.event);
  assert(events.includes("approved"));
  assert(events.includes("changes_requested"));
  assert.equal(events.filter((e) => e === "submitted").length, 2);
});
let empty = await rpc("fec_monthly_open", [scope, "2026-09-01", null]);
const emptyBlocks = blocks.map((b) => ({ ...b, sourceIds: [] }));
empty = await save(empty, emptyBlocks);
await denied("mês vazio exige justificativa", () =>
  transition(empty, "submitted"),
);
empty = await save(
  empty,
  emptyBlocks,
  "Mês destinado a preparação, ainda sem registros aprovados.",
);
empty = await transition(empty, "submitted");
await check("mês justificado não inventa atividades", async () =>
  assert.equal(empty.snapshot.activities.length, 0),
);
await check("hash independe do fuso da sessão", async () => {
  const a = await rpc("fec_monthly_check", [next.id]);
  await exec("set timezone='Pacific/Auckland'");
  const b = await rpc("fec_monthly_check", [next.id]);
  assert.deepEqual(a, b);
  await exec("set timezone='UTC'");
});
await exec("reset role");
await exec(`update fec_engagements set status='closed' where id='${scope}'`);
await as(owner);
await denied("aditivo fechado impede edição", () => save(next));
await check("aditivo fechado mantém histórico autorizado", async () =>
  assert.equal(
    (await db.query("select * from fec_monthly_reports")).rows.length,
    3,
  ),
);
await exec("reset role");
await exec(
  `update fec_access_grants set active=false where user_id='${owner}'`,
);
await as(owner);
await check(
  "atribuição revogada remove leitura de fontes e histórico",
  async () => {
    assert.equal(
      (await db.query("select * from fec_monthly_reports")).rows.length,
      0,
    );
    assert.equal(
      (await db.query("select * from fec_monthly_history")).rows.length,
      0,
    );
  },
);
await exec("reset role");
await check("nenhuma função FEC privilegiada no schema público", async () =>
  assert.equal(
    (
      await db.query(
        "select count(*)::int n from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname like 'fec_%' and p.prosecdef",
      )
    ).rows[0].n,
    0,
  ),
);
console.log(
  `${passed} verificações PostgreSQL/RLS do relatório mensal FEC passaram.`,
);
await db.close();
