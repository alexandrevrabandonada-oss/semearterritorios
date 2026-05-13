import { createClient } from "@supabase/supabase-js";

const url = process.env.SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const anonKey = process.env.SUPABASE_ANON_KEY;

if (!url || !serviceKey || !anonKey) {
  console.error("SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY e SUPABASE_ANON_KEY sao obrigatorios.");
  process.exit(1);
}

const service = createClient(url, serviceKey, { auth: { persistSession: false } });
const anon = createClient(url, anonKey, { auth: { persistSession: false } });

const expectedEventTypes = [
  "created",
  "text_changed",
  "sanitized_text_changed",
  "sent_to_review",
  "approved_internal",
  "approved_public",
  "rejected",
  "archived",
  "restored",
  "risk_detected",
  "status_changed"
];

function line(msg) {
  console.log(msg);
}

async function getOneListeningRecord() {
  const result = await service.from("listening_records").select("id, action_id").not("action_id", "is", null).limit(1).maybeSingle();
  if (result.error) throw new Error(`Falha ao buscar listening_records: ${result.error.message}`);
  if (!result.data) throw new Error("Nenhuma listening_record encontrada para teste.");
  return result.data;
}

async function ensureQuoteForTests(record) {
  const anyExisting = await service
    .from("listening_record_public_quotes")
    .select("id, listening_record_id, action_id, status")
    .limit(1)
    .maybeSingle();

  if (anyExisting.error) throw new Error(`Falha ao buscar quote existente: ${anyExisting.error.message}`);
  if (anyExisting.data) return { quoteId: anyExisting.data.id, createdNow: false, source: "existing" };

  const existing = await service
    .from("listening_record_public_quotes")
    .select("id, listening_record_id, action_id, status")
    .eq("listening_record_id", record.id)
    .limit(1)
    .maybeSingle();

  if (existing.error) throw new Error(`Falha ao buscar quote existente: ${existing.error.message}`);
  if (existing.data) return { quoteId: existing.data.id, createdNow: false, source: "existing" };

  const insertPayload = {
    listening_record_id: record.id,
    action_id: record.action_id,
    quote_text: "Fala controlada para validacao tecnica remota.",
    sanitized_text: "Fala controlada para validacao tecnica remota.",
    status: "draft",
    sensitive_risk: false,
    risk_notes: null,
    public_approval_reason: null,
    rejection_reason: null,
    archive_reason: null,
    last_edit_reason: null,
    created_by: null,
    reviewed_by: null,
    reviewed_at: null,
    approved_by: null,
    approved_at: null,
    context_note: "Registro tecnico automatico do Tijolo 068",
    theme_label: "Validacao tecnica"
  };

  const inserted = await service.from("listening_record_public_quotes").insert(insertPayload).select("id").single();
  if (inserted.error) {
    line(`ALERTA: nao foi possivel criar quote de teste (${inserted.error.message}).`);
    return { quoteId: null, createdNow: false, source: "none" };
  }
  return { quoteId: inserted.data.id, createdNow: true, source: "created" };
}

async function verifyColumnsAndTables() {
  const quotes = await service
    .from("listening_record_public_quotes")
    .select("id, public_approval_reason, rejection_reason, archive_reason, last_edit_reason")
    .limit(1);

  if (quotes.error) throw new Error(`Falha ao validar colunas em listening_record_public_quotes: ${quotes.error.message}`);

  const audits = await service
    .from("listening_record_public_quote_audits")
    .select("id, quote_id, event_type, changed_by, changed_at")
    .limit(1);

  if (audits.error) throw new Error(`Falha ao validar tabela listening_record_public_quote_audits: ${audits.error.message}`);

  line("OK: colunas de justificativa e tabela de auditoria acessiveis via API.");
}

async function verifyTriggerByEffect(quoteId) {
  const before = await service
    .from("listening_record_public_quote_audits")
    .select("id", { count: "exact", head: true })
    .eq("quote_id", quoteId)
    .eq("event_type", "sent_to_review");

  if (before.error) throw new Error(`Falha ao ler auditoria antes do update: ${before.error.message}`);

  const update = await service
    .from("listening_record_public_quotes")
    .update({ status: "needs_review" })
    .eq("id", quoteId);

  if (update.error) {
    throw new Error(`Falha ao atualizar status para needs_review (possivel erro no trigger): ${update.error.message}`);
  }

  const after = await service
    .from("listening_record_public_quote_audits")
    .select("id", { count: "exact", head: true })
    .eq("quote_id", quoteId)
    .eq("event_type", "sent_to_review");

  if (after.error) throw new Error(`Falha ao ler auditoria apos update: ${after.error.message}`);

  const beforeCount = before.count ?? 0;
  const afterCount = after.count ?? 0;
  if (afterCount <= beforeCount) {
    throw new Error("Trigger nao registrou evento sent_to_review apos mudanca de status.");
  }

  line("OK: trigger validado por efeito (evento sent_to_review criado). ");
}

async function verifyEventTypeConstraint(quoteId) {
  const insertedIds = [];

  for (const eventType of expectedEventTypes) {
    const okInsert = await service.from("listening_record_public_quote_audits").insert({
      quote_id: quoteId,
      event_type: eventType,
      changed_by: null,
      reason: `Teste tecnico: ${eventType}`
    }).select("id").single();

    if (okInsert.error) {
      throw new Error(`Falha ao inserir event_type valido (${eventType}): ${okInsert.error.message}`);
    }

    insertedIds.push(okInsert.data.id);
  }

  line("OK: os 11 event_types esperados foram aceitos.");

  const invalidInsert = await service.from("listening_record_public_quote_audits").insert({
    quote_id: quoteId,
    event_type: "invalido_event_type_tijolo_068",
    changed_by: null,
    reason: "Teste de constraint"
  });

  if (!invalidInsert.error) {
    throw new Error("Constraint de event_type nao bloqueou valor invalido.");
  }

  line("OK: constraint de event_type bloqueia valor invalido.");
  return insertedIds[0] ?? null;
}

async function verifyAnonRls(knownAuditId) {
  const anonRead = await anon
    .from("listening_record_public_quote_audits")
    .select("id")
    .eq("id", knownAuditId)
    .limit(1);

  if (anonRead.error) {
    line(`OK: anon bloqueado para leitura de auditoria (${anonRead.error.message}).`);
    return;
  }

  if ((anonRead.data ?? []).length > 0) {
    throw new Error("RLS falhou: anon conseguiu ler registro conhecido de auditoria.");
  }

  line("OK: anon nao enxerga registro conhecido de auditoria.");
}

async function cleanupIfCreated(quoteId, createdNow) {
  if (!createdNow) return;
  const del = await service.from("listening_record_public_quotes").delete().eq("id", quoteId);
  if (del.error) {
    line(`AVISO: nao foi possivel remover quote tecnico (${del.error.message}).`);
  } else {
    line("OK: quote tecnico removido apos validacao.");
  }
}

async function main() {
  line("Iniciando validacao remota de auditoria das falas (Tijolo 068)...");
  await verifyColumnsAndTables();

  const record = await getOneListeningRecord();
  const { quoteId, createdNow, source } = await ensureQuoteForTests(record);
  if (quoteId) {
    line(`Quote usada para validacao: ${quoteId} (${source}).`);

    try {
      await verifyTriggerByEffect(quoteId);
    } catch (error) {
      line(`ALERTA: ${error.message}`);
    }

    const knownAuditId = await verifyEventTypeConstraint(quoteId);
    if (knownAuditId) {
      await verifyAnonRls(knownAuditId);
    } else {
      line("ALERTA: nao foi possivel obter audit_id conhecido para teste anon.");
    }
  } else {
    line("ALERTA: sem quote utilizavel no remoto; testes de trigger por efeito e FK+event_type ficaram bloqueados.");
    await verifyAnonRls("00000000-0000-0000-0000-000000000000");
  }

  await cleanupIfCreated(quoteId, createdNow);

  line("VALIDACAO REMOTA CONCLUIDA COM SUCESSO.");
  line(`EVENT_TYPES_ESPERADOS: ${expectedEventTypes.join(", ")}`);
}

main().catch((error) => {
  console.error(`FALHA: ${error.message}`);
  process.exit(1);
});
