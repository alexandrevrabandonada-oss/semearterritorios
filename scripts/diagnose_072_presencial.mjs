/**
 * Diagnóstico 072 - Fechamento Presencial Assistido
 * Verifica estado de profiles, team_members, rotas e dados operacionais
 */

import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = "https://gtpitwhslqjgbuwlsaqg.supabase.co";
const SERVICE_ROLE_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd0cGl0d2hzbHFqZ2J1d2xzYXFnIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2OTUzODk2MiwiZXhwIjoyMDg1MTE0OTYyfQ.4DIY5-CNDYXtp4Lqbn26hXAp3coAei3gdolOA3q9JSI";

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { persistSession: false }
});

function sep(title) {
  console.log("\n" + "=".repeat(60));
  console.log(`  ${title}`);
  console.log("=".repeat(60));
}

function ok(label, value) {
  console.log(`  ✅  ${label}: ${JSON.stringify(value)}`);
}

function warn(label, value) {
  console.log(`  ⚠️   ${label}: ${JSON.stringify(value)}`);
}

sep("DIAGNÓSTICO 072 - FECHAMENTO PRESENCIAL ASSISTIDO");

// 1. Profiles
const { data: profiles } = await supabase
  .from("profiles")
  .select("id, full_name, role")
  .order("full_name");

const roleCount = { admin: 0, coordenacao: 0, equipe: 0, null: 0 };
for (const p of profiles || []) {
  const key = p.role || "null";
  roleCount[key]++;
}

sep("1. DISTRIBUIÇÃO DE PAPÉIS");
ok("admin", roleCount.admin);
ok("coordenacao", roleCount.coordenacao);
ok("equipe", roleCount.equipe);
ok("role null", roleCount.null);
ok("total de perfis", (profiles || []).length);

// 2. Team members
const { data: teamMembers } = await supabase
  .from("team_members")
  .select("id, profile_id, display_name, role_label, active")
  .order("display_name");

sep("2. VÍNCULOS OPERACIONAIS");
ok("team_members total", (teamMembers || []).length);

const linked = new Set((teamMembers || []).map((t) => t.profile_id));
const unlinked = (profiles || []).filter((p) => !linked.has(p.id));
ok("perfis sem team_member", unlinked.length);

if (unlinked.length > 0) {
  unlinked.forEach((p) => {
    warn("Unlinked", `${p.full_name} [${p.role}]`);
  });
}

// 3. Rotas principais
sep("3. ROTAS DISPONÍVEIS PARA TESTE");
const mainRoutes = [
  "/acoes",
  "/escutas",
  "/escutas/lote",
  "/escutas/falas",
  "/acoes/[id]/dossie",
  "/acoes/[id]/devolutiva",
  "/memoria",
  "/escutas/revisao-territorial",
  "/publico/transparencia-viva"
];

mainRoutes.forEach((route) => {
  ok("Rota", route);
});

// 4. Ações disponíveis
const { data: actions } = await supabase
  .from("actions")
  .select("id, title, status, action_date")
  .order("action_date", { ascending: false })
  .limit(5);

sep("4. AÇÕES DISPONÍVEIS");
ok("Total (primeiras 5)", (actions || []).length);
(actions || []).forEach((a) => {
  console.log(`  ℹ️  ${a.title} [${a.status}]`);
});

// 5. Escutas
const { data: records, count: recordCount } = await supabase
  .from("listening_records")
  .select("id, action_id", { count: "exact" })
  .limit(1);

sep("5. ESCUTAS");
ok("Total de escutas no remoto", recordCount || 0);

// 6. Falas candidatas
const { data: quotes, count: quotesCount } = await supabase
  .from("listening_record_public_quotes")
  .select("id, status", { count: "exact" })
  .limit(1);

sep("6. FALAS CANDIDATAS");
ok("Total de falas candidatas", quotesCount || 0);

// 7. Relatórios semanais
const { data: reports, count: reportsCount } = await supabase
  .from("weekly_team_reports")
  .select("id, status", { count: "exact" })
  .limit(1);

sep("7. RELATÓRIOS SEMANAIS");
ok("Total de relatórios", reportsCount || 0);

// 8. Entradas de memória
const { data: memoryEntries, count: memoryCount } = await supabase
  .from("project_memory_entries")
  .select("id", { count: "exact" })
  .limit(1);

sep("8. ENTRADAS DE MEMÓRIA");
ok("Total de entradas internas", memoryCount || 0);

// Conclusão
sep("CONFIRMAÇÃO DE PRÉ-REQUISITOS");
if (
  roleCount.admin === 2 &&
  roleCount.coordenacao === 2 &&
  roleCount.equipe === 3 &&
  roleCount.null === 0 &&
  unlinked.length === 0
) {
  ok("Distribuição de papéis", "CONFIRMADA ✅");
  ok("Vínculos operacionais", "TODOS COMPLETOS ✅");
  ok("Status para Tijolo 072", "PRONTO PARA TESTE PRESENCIAL ✅");
} else {
  warn("Status", "Há pendências não resolvidas");
}

console.log("\n✅ Diagnóstico 072 concluído\n");
