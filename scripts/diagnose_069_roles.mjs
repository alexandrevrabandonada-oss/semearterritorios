/**
 * Script de diagnóstico para Tijolo 069
 * Verifica usuários reais, roles, falas e auditorias no remoto
 *
 * Uso: node scripts/diagnose_069_roles.mjs
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

function fail(label, err) {
  console.log(`  ❌  ${label}: ${err}`);
}

// ─────────────────────────────────────────────
// 1. Perfis / roles
// ─────────────────────────────────────────────
sep("1. Perfis disponíveis");
const { data: profiles, error: profilesError } = await supabase
  .from("profiles")
  .select("id, full_name, role")
  .order("role", { ascending: true });

if (profilesError) {
  fail("Erro ao buscar profiles", profilesError.message);
} else {
  const roles = { admin: [], coordenacao: [], equipe: [], outros: [] };
  for (const p of profiles ?? []) {
    const key = roles[p.role] ? p.role : "outros";
    roles[key].push(`${p.full_name ?? "(sem nome)"} [${p.role}]`);
  }
  ok("admin", roles.admin);
  ok("coordenacao", roles.coordenacao);
  ok("equipe", roles.equipe);
  if (roles.outros.length) warn("outros roles", roles.outros);
  console.log(`  → Total de perfis: ${profiles?.length ?? 0}`);
}

// ─────────────────────────────────────────────
// 2. Ações disponíveis
// ─────────────────────────────────────────────
sep("2. Ações disponíveis");
const { data: actions, error: actionsError } = await supabase
  .from("actions")
  .select("id, title, status, action_date")
  .order("action_date", { ascending: false })
  .limit(10);

if (actionsError) {
  fail("Erro ao buscar ações", actionsError.message);
} else {
  console.log(`  → Total de ações (primeiras 10): ${actions?.length ?? 0}`);
  for (const a of actions ?? []) {
    ok(`Ação [${a.id.slice(0, 8)}...]`, `${a.title} | status: ${a.status} | data: ${a.action_date}`);
  }
}

// ─────────────────────────────────────────────
// 3. Falas candidatas
// ─────────────────────────────────────────────
sep("3. Falas candidatas (listening_record_public_quotes)");
const { data: quotes, error: quotesError } = await supabase
  .from("listening_record_public_quotes")
  .select("id, status, sensitive_risk, public_approval_reason, rejection_reason, archive_reason, sanitized_text")
  .order("updated_at", { ascending: false })
  .limit(20);

if (quotesError) {
  fail("Erro ao buscar falas", quotesError.message);
} else {
  const byStatus = {};
  for (const q of quotes ?? []) {
    byStatus[q.status] = (byStatus[q.status] ?? 0) + 1;
  }
  ok("Distribuição por status (últimas 20)", byStatus);
  const withRisk = (quotes ?? []).filter((q) => q.sensitive_risk).length;
  ok("Com has_critical_risk=true", withRisk);
  const withApprovalReason = (quotes ?? []).filter((q) => q.public_approval_reason).length;
  ok("Com public_approval_reason preenchido", withApprovalReason);
}

// ─────────────────────────────────────────────
// 4. Auditoria
// ─────────────────────────────────────────────
sep("4. Auditoria de falas (listening_record_public_quote_audits)");
const { data: audits, error: auditsError } = await supabase
  .from("listening_record_public_quote_audits")
  .select("id, event_type, changed_by")
  .order("changed_at", { ascending: false })
  .limit(50);

if (auditsError) {
  fail("Erro ao buscar auditorias", auditsError.message);
} else {
  const byEvent = {};
  for (const a of audits ?? []) {
    byEvent[a.event_type] = (byEvent[a.event_type] ?? 0) + 1;
  }
  ok("Distribuição por event_type (últimas 50)", byEvent);
  const uniqueActors = new Set((audits ?? []).map((a) => a.changed_by)).size;
  ok("Atores únicos na auditoria", uniqueActors);
}

// ─────────────────────────────────────────────
// 5. Trigger ativo
// ─────────────────────────────────────────────
sep("5. Verificação do trigger apply_public_quote_workflow_guard");
let triggers = null;
let triggersError = null;
try {
  const rpcResult = await supabase.rpc("pg_catalog_triggers_check", {});
  triggers = rpcResult.data;
  triggersError = rpcResult.error;
} catch {
  triggersError = { message: "rpc não disponível" };
}

// Fallback: tentar via information_schema diretamente
if (!triggers) {
  // Verificação indireta: tentar update sem justificativa e ver se trigger bloqueia
  console.log("  → Verificação via RPC não disponível. Usando teste de comportamento.");

  // Buscar uma fala em needs_review
  const { data: testQuote } = await supabase
    .from("listening_record_public_quotes")
    .select("id, status")
    .eq("status", "needs_review")
    .limit(1)
    .maybeSingle();

  if (testQuote) {
    // Tentar approved_public sem justificativa — deve ser bloqueado pelo trigger
    const { error: triggerTestError } = await supabase
      .from("listening_record_public_quotes")
      .update({ status: "approved_public", public_approval_reason: null })
      .eq("id", testQuote.id);

    if (triggerTestError) {
      ok("Trigger BLOQUEOU approved_public sem justificativa", triggerTestError.message.slice(0, 120));
    } else {
      // Reverter
      await supabase
        .from("listening_record_public_quotes")
        .update({ status: "needs_review" })
        .eq("id", testQuote.id);
      fail("Trigger NÃO bloqueou — approved_public sem justificativa foi aceito", "FALHA DE SEGURANÇA");
    }
  } else {
    warn("Sem fala em needs_review para testar trigger", "pulando teste de comportamento");
  }
} else {
  ok("Triggers encontrados", triggers);
}

// ─────────────────────────────────────────────
// 6. Teste de bloqueio por risco crítico
// ─────────────────────────────────────────────
sep("6. Bloqueio por risco crítico (CPF fake)");

// Buscar uma ação e escuta para criar fala temporária
const { data: testAction } = await supabase
  .from("actions")
  .select("id")
  .limit(1)
  .maybeSingle();

const { data: testRecord } = testAction
  ? await supabase
      .from("listening_records")
      .select("id")
      .eq("action_id", testAction.id)
      .limit(1)
      .maybeSingle()
  : { data: null };

if (testAction && testRecord) {
  const userResult = await supabase.auth.admin.listUsers();
  const adminUser = userResult.data?.users?.find((u) => u.email?.includes("admin") || u.user_metadata?.role === "admin");
  const anyUser = userResult.data?.users?.[0];
  const actorId = adminUser?.id ?? anyUser?.id ?? null;

  if (actorId) {
    // Criar fala temporária com CPF fake
    const cpfFakeText = "A moradora disse: meu CPF é 123.456.789-09 e preciso de ajuda.";
    const { data: riskQuote, error: riskInsertError } = await supabase
      .from("listening_record_public_quotes")
      .insert({
        listening_record_id: testRecord.id,
        action_id: testAction.id,
        quote_text: cpfFakeText,
        sanitized_text: cpfFakeText,
        status: "needs_review",
        sensitive_risk: true,
        risk_notes: "CPF detectado"
      })
      .select()
      .single();

    if (riskInsertError) {
      warn("Não foi possível inserir fala de teste de risco", riskInsertError.message);
    } else {
      ok("Fala com CPF fake inserida em needs_review", riskQuote.id.slice(0, 8) + "...");

      // Tentar aprovar publicamente — deve ser bloqueado pelo trigger
      const { error: riskApproveError } = await supabase
        .from("listening_record_public_quotes")
        .update({
          status: "approved_public",
          public_approval_reason: "Teste de bloqueio por risco"
        })
        .eq("id", riskQuote.id);

      if (riskApproveError) {
        ok("Trigger BLOQUEOU approved_public com CPF detectado", riskApproveError.message.slice(0, 120));
      } else {
        fail("Trigger NÃO bloqueou fala com CPF — FALHA DE SEGURANÇA", "approved_public aceito com has_critical_risk=true");
        // Reverter
        await supabase
          .from("listening_record_public_quotes")
          .update({ status: "needs_review" })
          .eq("id", riskQuote.id);
      }

      // Limpar fala de teste
      await supabase
        .from("listening_record_public_quotes")
        .delete()
        .eq("id", riskQuote.id);
      ok("Fala de teste removida", "limpeza concluída");
    }
  } else {
    warn("Sem usuário disponível para criar fala de teste", "pulando teste de risco crítico");
  }
} else {
  warn("Sem ação/escuta disponível para teste de risco crítico", "pulando");
}

// ─────────────────────────────────────────────
// 7. Teste RLS anon
// ─────────────────────────────────────────────
sep("7. RLS anon — falas e auditorias");
const ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd0cGl0d2hzbHFqZ2J1d2xzYXFnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk1Mzg5NjIsImV4cCI6MjA4NTExNDk2Mn0.xkQ7Lvg5XuT44fVTfL5qxxC8yfBDvXo7I1-ZcIFhmi8";

const anonClient = createClient(SUPABASE_URL, ANON_KEY, {
  auth: { persistSession: false }
});

const { data: anonQuotes, error: anonQuotesError } = await anonClient
  .from("listening_record_public_quotes")
  .select("id")
  .limit(1);

if (anonQuotesError || (anonQuotes?.length ?? 0) === 0) {
  ok("Anon bloqueado em listening_record_public_quotes", anonQuotesError?.message ?? "0 linhas retornadas");
} else {
  fail("Anon VÊ falas — FALHA DE RLS", `${anonQuotes.length} linha(s) retornada(s)`);
}

const { data: anonAudits, error: anonAuditsError } = await anonClient
  .from("listening_record_public_quote_audits")
  .select("id")
  .limit(1);

if (anonAuditsError || (anonAudits?.length ?? 0) === 0) {
  ok("Anon bloqueado em listening_record_public_quote_audits", anonAuditsError?.message ?? "0 linhas retornadas");
} else {
  fail("Anon VÊ auditorias — FALHA DE RLS", `${anonAudits.length} linha(s) retornada(s)`);
}

// ─────────────────────────────────────────────
// 8. Teste de bloqueio: rejected sem reason
// ─────────────────────────────────────────────
sep("8. Bloqueio: rejected sem rejection_reason");

const { data: needsReviewQuote } = await supabase
  .from("listening_record_public_quotes")
  .select("id, status")
  .eq("status", "needs_review")
  .limit(1)
  .maybeSingle();

if (needsReviewQuote) {
  const { error: rejectNoReasonError } = await supabase
    .from("listening_record_public_quotes")
    .update({ status: "rejected", rejection_reason: null })
    .eq("id", needsReviewQuote.id);

  if (rejectNoReasonError) {
    ok("Trigger BLOQUEOU rejected sem rejection_reason", rejectNoReasonError.message.slice(0, 120));
  } else {
    fail("Trigger NÃO bloqueou rejected sem razão", "status alterado para rejected sem motivo");
    // Reverter
    await supabase
      .from("listening_record_public_quotes")
      .update({ status: "needs_review" })
      .eq("id", needsReviewQuote.id);
  }
} else {
  warn("Sem fala em needs_review para testar bloqueio de rejected", "pulando");
}

// ─────────────────────────────────────────────
// 9. Teste de bloqueio: archived sem reason
// ─────────────────────────────────────────────
sep("9. Bloqueio: archived sem archive_reason");

const { data: approvedInternalQuote } = await supabase
  .from("listening_record_public_quotes")
  .select("id, status")
  .in("status", ["needs_review", "approved_internal"])
  .limit(1)
  .maybeSingle();

if (approvedInternalQuote) {
  const { error: archiveNoReasonError } = await supabase
    .from("listening_record_public_quotes")
    .update({ status: "archived", archive_reason: null })
    .eq("id", approvedInternalQuote.id);

  if (archiveNoReasonError) {
    ok("Trigger BLOQUEOU archived sem archive_reason", archiveNoReasonError.message.slice(0, 120));
  } else {
    fail("Trigger NÃO bloqueou archived sem razão", "status alterado para archived sem motivo");
    // Reverter
    await supabase
      .from("listening_record_public_quotes")
      .update({ status: approvedInternalQuote.status })
      .eq("id", approvedInternalQuote.id);
  }
} else {
  warn("Sem fala disponível para testar bloqueio de archived", "pulando");
}

// ─────────────────────────────────────────────
// 10. Resumo final
// ─────────────────────────────────────────────
sep("DIAGNÓSTICO 069 CONCLUÍDO");
console.log("  Execute 'node scripts/diagnose_069_roles.mjs' para re-rodar.");
console.log("  Resultados acima devem ser copiados para reports/aceite-operacional-falas-auditadas-069.md\n");
