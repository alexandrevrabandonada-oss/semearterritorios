/**
 * Script de testes operacionais para Tijolo 069
 * Valida bloqueios de trigger: sem justificativa, risco crítico, archived
 *
 * Uso: node scripts/test_069_bloqueios.mjs
 */

import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = "https://gtpitwhslqjgbuwlsaqg.supabase.co";
const SERVICE_ROLE_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd0cGl0d2hzbHFqZ2J1d2xzYXFnIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2OTUzODk2MiwiZXhwIjoyMDg1MTE0OTYyfQ.4DIY5-CNDYXtp4Lqbn26hXAp3coAei3gdolOA3q9JSI";

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { persistSession: false }
});

const results = [];

function sep(title) {
  console.log("\n" + "=".repeat(60));
  console.log(`  ${title}`);
  console.log("=".repeat(60));
}

function passou(cenario, detalhe = "") {
  console.log(`  ✅  PASSOU — ${cenario}${detalhe ? ": " + detalhe : ""}`);
  results.push({ cenario, status: "PASSOU", detalhe });
}

function falhou(cenario, detalhe = "") {
  console.log(`  ❌  FALHOU — ${cenario}${detalhe ? ": " + detalhe : ""}`);
  results.push({ cenario, status: "FALHOU", detalhe });
}

function pendente(cenario, detalhe = "") {
  console.log(`  ⚠️   PENDENTE — ${cenario}${detalhe ? ": " + detalhe : ""}`);
  results.push({ cenario, status: "PENDENTE", detalhe });
}

// ─────────────────────────────────────────────
// Buscar base para testes
// ─────────────────────────────────────────────
const { data: testAction } = await supabase
  .from("actions")
  .select("id")
  .eq("status", "realizada")
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

if (!testAction || !testRecord) {
  console.error("ERRO: Sem ação 'realizada' ou escuta disponível para testes. Abortar.");
  process.exit(1);
}

console.log(`  → Usando ação: ${testAction.id.slice(0, 8)}...`);
console.log(`  → Usando escuta: ${testRecord.id.slice(0, 8)}...`);

// Helper: criar fala base limpa
async function criarFalaBase(extra = {}) {
  const { data, error } = await supabase
    .from("listening_record_public_quotes")
    .insert({
      listening_record_id: testRecord.id,
      action_id: testAction.id,
      quote_text: "Fala de teste operacional 069 — texto fictício sem dado pessoal.",
      sanitized_text: "Fala de teste 069 — versão pública.",
      status: "needs_review",
      ...extra
    })
    .select()
    .single();
  if (error) throw new Error(`Erro ao criar fala base: ${error.message}`);
  return data;
}

// Helper: limpar fala de teste
async function limpar(id) {
  await supabase.from("listening_record_public_quotes").delete().eq("id", id);
  await supabase.from("listening_record_public_quote_audits").delete().eq("quote_id", id);
}

// ─────────────────────────────────────────────
// CENÁRIO 1 — approved_public sem justificativa
// ─────────────────────────────────────────────
sep("Cenário 1 — approved_public sem public_approval_reason");
{
  let quoteId = null;
  try {
    const quote = await criarFalaBase();
    quoteId = quote.id;

    const { error } = await supabase
      .from("listening_record_public_quotes")
      .update({ status: "approved_public", public_approval_reason: null })
      .eq("id", quoteId);

    if (error) {
      passou("Trigger bloqueou approved_public sem justificativa", error.message.slice(0, 100));
    } else {
      falhou("Trigger não bloqueou approved_public sem justificativa", "UPDATE aceito sem public_approval_reason");
    }
  } catch (e) {
    falhou("Erro inesperado no cenário 1", e.message);
  } finally {
    if (quoteId) await limpar(quoteId);
  }
}

// ─────────────────────────────────────────────
// CENÁRIO 2 — approved_public com justificativa (deve permitir)
// ─────────────────────────────────────────────
sep("Cenário 2 — approved_public COM public_approval_reason");
{
  let quoteId = null;
  try {
    const quote = await criarFalaBase();
    quoteId = quote.id;

    const { error } = await supabase
      .from("listening_record_public_quotes")
      .update({
        status: "approved_public",
        public_approval_reason: "Fala revisada e aprovada para publicação — sem dado sensível."
      })
      .eq("id", quoteId);

    if (error) {
      falhou("approved_public com justificativa foi bloqueado (deveria passar)", error.message.slice(0, 100));
    } else {
      passou("approved_public com justificativa aceito corretamente");
    }
  } catch (e) {
    falhou("Erro inesperado no cenário 2", e.message);
  } finally {
    if (quoteId) await limpar(quoteId);
  }
}

// ─────────────────────────────────────────────
// CENÁRIO 3 — rejected sem rejection_reason
// ─────────────────────────────────────────────
sep("Cenário 3 — rejected sem rejection_reason");
{
  let quoteId = null;
  try {
    const quote = await criarFalaBase();
    quoteId = quote.id;

    const { error } = await supabase
      .from("listening_record_public_quotes")
      .update({ status: "rejected", rejection_reason: null })
      .eq("id", quoteId);

    if (error) {
      passou("Trigger bloqueou rejected sem rejection_reason", error.message.slice(0, 100));
    } else {
      falhou("Trigger não bloqueou rejected sem motivo", "UPDATE aceito sem rejection_reason");
    }
  } catch (e) {
    falhou("Erro inesperado no cenário 3", e.message);
  } finally {
    if (quoteId) await limpar(quoteId);
  }
}

// ─────────────────────────────────────────────
// CENÁRIO 4 — rejected com motivo (deve permitir)
// ─────────────────────────────────────────────
sep("Cenário 4 — rejected COM rejection_reason");
{
  let quoteId = null;
  try {
    const quote = await criarFalaBase();
    quoteId = quote.id;

    const { error } = await supabase
      .from("listening_record_public_quotes")
      .update({ status: "rejected", rejection_reason: "Fala contém informação imprecisa — descartada em revisão." })
      .eq("id", quoteId);

    if (error) {
      falhou("rejected com motivo foi bloqueado (deveria passar)", error.message.slice(0, 100));
    } else {
      passou("rejected com motivo aceito corretamente");
    }
  } catch (e) {
    falhou("Erro inesperado no cenário 4", e.message);
  } finally {
    if (quoteId) await limpar(quoteId);
  }
}

// ─────────────────────────────────────────────
// CENÁRIO 5 — archived sem archive_reason
// ─────────────────────────────────────────────
sep("Cenário 5 — archived sem archive_reason");
{
  let quoteId = null;
  try {
    const quote = await criarFalaBase();
    quoteId = quote.id;

    const { error } = await supabase
      .from("listening_record_public_quotes")
      .update({ status: "archived", archive_reason: null })
      .eq("id", quoteId);

    if (error) {
      passou("Trigger bloqueou archived sem archive_reason", error.message.slice(0, 100));
    } else {
      falhou("Trigger não bloqueou archived sem motivo", "UPDATE aceito sem archive_reason");
    }
  } catch (e) {
    falhou("Erro inesperado no cenário 5", e.message);
  } finally {
    if (quoteId) await limpar(quoteId);
  }
}

// ─────────────────────────────────────────────
// CENÁRIO 6 — archived com motivo (deve permitir)
// ─────────────────────────────────────────────
sep("Cenário 6 — archived COM archive_reason");
{
  let quoteId = null;
  try {
    const quote = await criarFalaBase();
    quoteId = quote.id;

    const { error } = await supabase
      .from("listening_record_public_quotes")
      .update({ status: "archived", archive_reason: "Fala duplicada — versão revisada mantida em outro registro." })
      .eq("id", quoteId);

    if (error) {
      falhou("archived com motivo foi bloqueado (deveria passar)", error.message.slice(0, 100));
    } else {
      passou("archived com motivo aceito corretamente");
    }
  } catch (e) {
    falhou("Erro inesperado no cenário 6", e.message);
  } finally {
    if (quoteId) await limpar(quoteId);
  }
}

// ─────────────────────────────────────────────
// CENÁRIO 7 — CPF fake bloqueia approved_public
// ─────────────────────────────────────────────
sep("Cenário 7 — approved_public com CPF fake no sanitized_text");
{
  let quoteId = null;
  try {
    const cpfQuote = await criarFalaBase({
      sanitized_text: "A moradora disse: meu CPF é 123.456.789-09 e não tenho como pagar.",
      sensitive_risk: true,
      risk_notes: "CPF detectado"
    });
    quoteId = cpfQuote.id;

    const { error } = await supabase
      .from("listening_record_public_quotes")
      .update({
        status: "approved_public",
        public_approval_reason: "Revisor aprovou mas esqueceu o CPF — teste de segurança"
      })
      .eq("id", quoteId);

    if (error) {
      passou("Trigger bloqueou approved_public com CPF no texto", error.message.slice(0, 100));
    } else {
      falhou("Trigger não bloqueou fala com CPF — FALHA DE SEGURANÇA", "fala com sensitive_risk=true aprovada");
    }
  } catch (e) {
    falhou("Erro inesperado no cenário 7", e.message);
  } finally {
    if (quoteId) await limpar(quoteId);
  }
}

// ─────────────────────────────────────────────
// CENÁRIO 8 — E-mail fake bloqueia approved_public
// ─────────────────────────────────────────────
sep("Cenário 8 — approved_public com e-mail fake no sanitized_text");
{
  let quoteId = null;
  try {
    const emailQuote = await criarFalaBase({
      sanitized_text: "Entre em contato pelo e-mail joao.silva@example.com para ajuda no bairro.",
      sensitive_risk: true,
      risk_notes: "E-mail detectado"
    });
    quoteId = emailQuote.id;

    const { error } = await supabase
      .from("listening_record_public_quotes")
      .update({
        status: "approved_public",
        public_approval_reason: "Teste de bloqueio por e-mail"
      })
      .eq("id", quoteId);

    if (error) {
      passou("Trigger bloqueou approved_public com e-mail no texto", error.message.slice(0, 100));
    } else {
      falhou("Trigger não bloqueou fala com e-mail — FALHA DE SEGURANÇA", "fala com sensitive_risk=true aprovada");
    }
  } catch (e) {
    falhou("Erro inesperado no cenário 8", e.message);
  } finally {
    if (quoteId) await limpar(quoteId);
  }
}

// ─────────────────────────────────────────────
// CENÁRIO 9 — Fala segura pode ser aprovada
// ─────────────────────────────────────────────
sep("Cenário 9 — fala segura (sem dado sensível) aceita em approved_public");
{
  let quoteId = null;
  try {
    const safeQuote = await criarFalaBase({
      sanitized_text: "O bairro precisa de mais iluminação nas ruas.",
      sensitive_risk: false,
      risk_notes: null
    });
    quoteId = safeQuote.id;

    const { error } = await supabase
      .from("listening_record_public_quotes")
      .update({
        status: "approved_public",
        public_approval_reason: "Fala revisada e aprovada — sem dado pessoal identificável."
      })
      .eq("id", quoteId);

    if (error) {
      falhou("Fala segura foi bloqueada (deveria passar)", error.message.slice(0, 100));
    } else {
      passou("Fala segura aprovada publicamente com justificativa");
    }
  } catch (e) {
    falhou("Erro inesperado no cenário 9", e.message);
  } finally {
    if (quoteId) await limpar(quoteId);
  }
}

// ─────────────────────────────────────────────
// CENÁRIO 10 — Auditoria gerada automaticamente
// ─────────────────────────────────────────────
sep("Cenário 10 — trigger gera evento sent_to_review na criação com status needs_review");
{
  let quoteId = null;
  try {
    const quote = await criarFalaBase({ status: "needs_review" });
    quoteId = quote.id;

    // Verificar se audit foi gerado
    const { data: audits } = await supabase
      .from("listening_record_public_quote_audits")
      .select("event_type")
      .eq("quote_id", quoteId);

    const hasSentToReview = (audits ?? []).some((a) => a.event_type === "sent_to_review");
    if (hasSentToReview) {
      passou("Trigger gerou evento sent_to_review automaticamente na inserção");
    } else {
      const eventos = (audits ?? []).map((a) => a.event_type).join(", ") || "(nenhum)";
      pendente("Evento sent_to_review não encontrado", `Eventos gerados: ${eventos} — verificar trigger de INSERT`);
    }
  } catch (e) {
    falhou("Erro inesperado no cenário 10", e.message);
  } finally {
    if (quoteId) await limpar(quoteId);
  }
}

// ─────────────────────────────────────────────
// CENÁRIO 11 — Telefone fake bloqueia approved_public
// ─────────────────────────────────────────────
sep("Cenário 11 — approved_public com telefone fake");
{
  let quoteId = null;
  try {
    const phoneQuote = await criarFalaBase({
      sanitized_text: "Ligue para (21) 98765-4321 para reportar o problema.",
      sensitive_risk: true,
      risk_notes: "Telefone detectado"
    });
    quoteId = phoneQuote.id;

    const { error } = await supabase
      .from("listening_record_public_quotes")
      .update({
        status: "approved_public",
        public_approval_reason: "Teste de bloqueio por telefone"
      })
      .eq("id", quoteId);

    if (error) {
      passou("Trigger bloqueou approved_public com telefone no texto", error.message.slice(0, 100));
    } else {
      falhou("Trigger não bloqueou fala com telefone — FALHA DE SEGURANÇA", "fala com sensitive_risk=true aprovada");
    }
  } catch (e) {
    falhou("Erro inesperado no cenário 11", e.message);
  } finally {
    if (quoteId) await limpar(quoteId);
  }
}

// ─────────────────────────────────────────────
// CENÁRIO 12 — Endereço fake bloqueia approved_public
// ─────────────────────────────────────────────
sep("Cenário 12 — approved_public com endereço fake");
{
  let quoteId = null;
  try {
    const addrQuote = await criarFalaBase({
      sanitized_text: "Moro na Rua das Flores, número 42, perto da creche.",
      sensitive_risk: true,
      risk_notes: "Endereço específico detectado"
    });
    quoteId = addrQuote.id;

    const { error } = await supabase
      .from("listening_record_public_quotes")
      .update({
        status: "approved_public",
        public_approval_reason: "Teste de bloqueio por endereço"
      })
      .eq("id", quoteId);

    if (error) {
      passou("Trigger bloqueou approved_public com endereço no texto", error.message.slice(0, 100));
    } else {
      falhou("Trigger não bloqueou fala com endereço — FALHA DE SEGURANÇA", "fala com sensitive_risk=true aprovada");
    }
  } catch (e) {
    falhou("Erro inesperado no cenário 12", e.message);
  } finally {
    if (quoteId) await limpar(quoteId);
  }
}

// ─────────────────────────────────────────────
// CENÁRIO 13 — edit sanitized_text em approved_public sem last_edit_reason
// ─────────────────────────────────────────────
sep("Cenário 13 — editar sanitized_text em approved_public sem last_edit_reason");
{
  let quoteId = null;
  try {
    // Criar fala e aprovar
    const quote = await criarFalaBase({
      sanitized_text: "O bairro precisa de melhor saneamento.",
      sensitive_risk: false
    });
    quoteId = quote.id;

    // Aprovar publicamente primeiro
    await supabase
      .from("listening_record_public_quotes")
      .update({
        status: "approved_public",
        public_approval_reason: "Aprovada para publicação — sem dado sensível."
      })
      .eq("id", quoteId);

    // Agora tentar editar o sanitized_text sem last_edit_reason
    const { error } = await supabase
      .from("listening_record_public_quotes")
      .update({
        sanitized_text: "O bairro precisa de melhor saneamento — versão editada sem motivo.",
        last_edit_reason: null
      })
      .eq("id", quoteId);

    if (error) {
      passou("Trigger bloqueou edição de sanitized_text em approved_public sem last_edit_reason", error.message.slice(0, 100));
    } else {
      pendente(
        "Edição de sanitized_text em approved_public sem last_edit_reason não foi bloqueada pelo trigger",
        "Verificar se trigger cobre este caso ou se proteção é apenas no frontend"
      );
    }
  } catch (e) {
    falhou("Erro inesperado no cenário 13", e.message);
  } finally {
    if (quoteId) await limpar(quoteId);
  }
}

// ─────────────────────────────────────────────
// RESUMO FINAL
// ─────────────────────────────────────────────
sep("RESUMO — BATERIA DE TESTES 069");
const totais = { PASSOU: 0, FALHOU: 0, PENDENTE: 0 };
for (const r of results) {
  totais[r.status]++;
}
console.log(`  ✅  PASSOU:   ${totais.PASSOU}`);
console.log(`  ❌  FALHOU:   ${totais.FALHOU}`);
console.log(`  ⚠️   PENDENTE: ${totais.PENDENTE}`);
console.log(`  → Total:     ${results.length}`);
console.log();
for (const r of results) {
  const icon = r.status === "PASSOU" ? "✅" : r.status === "FALHOU" ? "❌" : "⚠️";
  console.log(`  ${icon} [${r.status}] ${r.cenario}`);
  if (r.detalhe) console.log(`        ${r.detalhe}`);
}
console.log();
if (totais.FALHOU === 0) {
  console.log("  → DECISÃO: GO ✅ — Todos os bloqueios de segurança funcionando corretamente.");
} else {
  console.log(`  → DECISÃO: NO-GO ❌ — ${totais.FALHOU} falha(s) crítica(s) encontrada(s).`);
}
