import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  Database,
  InternalMapHomologation,
  InternalMapHomologationDecision,
  InternalMapHomologationStatus,
  Json,
  Profile
} from "@/lib/database.types";
import type { InternalMapGoNoGoResult } from "@/lib/internal-map-scope";
import type { MapHomologationManualChecks } from "@/lib/internal-map-homologation";

export type MapHomologationForm = MapHomologationManualChecks & {
  status: InternalMapHomologationStatus;
  decision: InternalMapHomologationDecision;
  decisionReason: string;
};

export type HomologationApprovalCheck = {
  ok: boolean;
  reasons: string[];
};

export function getHomologationStatusLabel(status?: InternalMapHomologationStatus | null) {
  if (status === "approved") return "Aprovada";
  if (status === "rejected") return "Rejeitada";
  if (status === "reviewed") return "Revisada";
  if (status === "draft") return "Rascunho";
  return "Sem homologação";
}

export function getHomologationDecisionLabel(decision?: InternalMapHomologationDecision | null) {
  const labels: Record<InternalMapHomologationDecision, string> = {
    no_go_dados_insuficientes: "NO-GO: dados insuficientes",
    no_go_privacidade: "NO-GO: privacidade",
    no_go_normalizacao: "NO-GO: normalização",
    go_desenho_tecnico: "GO: desenho técnico",
    go_prototipo_interno: "GO: protótipo interno",
    manter_mapa_lista: "Manter mapa-lista"
  };
  return decision ? labels[decision] : "Sem decisão";
}

export async function getLatestMapHomologation(supabase: SupabaseClient<Database>) {
  const result = await supabase
    .from("internal_map_homologations")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (result.error) throw new Error(result.error.message);
  return result.data as InternalMapHomologation | null;
}

export async function createDraftMapHomologation(supabase: SupabaseClient<Database>, input: {
  userId: string;
  form: MapHomologationForm;
  goNoGo: InternalMapGoNoGoResult;
}) {
  const payload = buildHomologationPayload(input.form, input.goNoGo, input.userId, "draft");
  const result = await supabase.from("internal_map_homologations").insert(payload).select("*").single();
  if (result.error) throw new Error(result.error.message);
  return result.data as InternalMapHomologation;
}

export async function updateMapHomologation(supabase: SupabaseClient<Database>, id: string, input: {
  form: MapHomologationForm;
  goNoGo: InternalMapGoNoGoResult;
  status?: InternalMapHomologationStatus;
}) {
  const { created_by: _createdBy, ...payload } = buildHomologationPayload(input.form, input.goNoGo, null, input.status ?? input.form.status);
  const result = await supabase.from("internal_map_homologations").update(payload).eq("id", id).select("*").single();
  if (result.error) throw new Error(result.error.message);
  return result.data as InternalMapHomologation;
}

export async function approveMapHomologation(supabase: SupabaseClient<Database>, id: string, input: {
  user: Pick<Profile, "id" | "role">;
  form: MapHomologationForm;
  goNoGo: InternalMapGoNoGoResult;
}) {
  const canApprove = validateHomologationApproval(input.form, input.goNoGo, input.user.role);
  if (!canApprove.ok) throw new Error(canApprove.reasons.join(" "));
  const { created_by: _createdBy, ...basePayload } = buildHomologationPayload({ ...input.form, decision: "go_prototipo_interno" }, input.goNoGo, null, "approved");
  const payload = {
    ...basePayload,
    approved_by: input.user.id,
    approved_at: new Date().toISOString(),
    rejected_by: null,
    rejected_at: null
  };
  const result = await supabase.from("internal_map_homologations").update(payload).eq("id", id).select("*").single();
  if (result.error) throw new Error(result.error.message);
  return result.data as InternalMapHomologation;
}

export async function rejectMapHomologation(supabase: SupabaseClient<Database>, id: string, input: {
  user: Pick<Profile, "id" | "role">;
  form: MapHomologationForm;
  goNoGo: InternalMapGoNoGoResult;
}) {
  if (input.user.role !== "admin" && input.user.role !== "coordenacao") {
    throw new Error("Apenas coordenação ou admin podem rejeitar homologação.");
  }
  if (!input.form.decisionReason.trim()) {
    throw new Error("Informe uma justificativa antes de rejeitar.");
  }
  const { created_by: _createdBy, ...basePayload } = buildHomologationPayload(input.form, input.goNoGo, null, "rejected");
  const payload = {
    ...basePayload,
    rejected_by: input.user.id,
    rejected_at: new Date().toISOString(),
    approved_by: null,
    approved_at: null
  };
  const result = await supabase.from("internal_map_homologations").update(payload).eq("id", id).select("*").single();
  if (result.error) throw new Error(result.error.message);
  return result.data as InternalMapHomologation;
}

export function buildHomologationSnapshot(goNoGo: InternalMapGoNoGoResult, form: MapHomologationForm): Json {
  return {
    generated_at: new Date().toISOString(),
    go_no_go_status: goNoGo.status,
    criteria: goNoGo.criteria.map((criterion) => ({
      label: criterion.label,
      ok: criterion.ok,
      category: criterion.category,
      detail: criterion.detail
    })),
    manual_checks: {
      rls_validated: form.rlsValidated,
      admin_tested: form.adminTested,
      coordenacao_tested: form.coordenacaoTested,
      equipe_tested: form.equipeTested,
      anon_blocked: form.anonBlocked,
      service_role_absent_frontend: form.serviceRoleAbsent,
      privacy_checked: isPrivacyChecked(form),
      no_geocoding_confirmed: form.noGeocoding
    },
    summary: goNoGo.summary
  } as Json;
}

export function formFromHomologation(record: InternalMapHomologation | null): MapHomologationForm {
  return {
    status: record?.status ?? "draft",
    decision: record?.decision ?? "manter_mapa_lista",
    decisionReason: record?.decision_reason ?? "Homologação do mapa interno ainda em rascunho.",
    rlsValidated: Boolean(record?.rls_validated),
    adminTested: Boolean(record?.admin_tested),
    coordenacaoTested: Boolean(record?.coordenacao_tested),
    equipeTested: Boolean(record?.equipe_tested),
    anonBlocked: Boolean(record?.anon_blocked),
    serviceRoleAbsent: Boolean(record?.service_role_absent_frontend),
    noOriginalSpeech: Boolean(record?.privacy_checked),
    noPersonalData: Boolean(record?.privacy_checked),
    sensitiveHidden: Boolean(record?.privacy_checked),
    sensitiveTypeHidden: Boolean(record?.privacy_checked),
    noGeocoding: Boolean(record?.no_geocoding_confirmed)
  };
}

export function validateHomologationApproval(form: MapHomologationForm, goNoGo: InternalMapGoNoGoResult, role?: Profile["role"]): HomologationApprovalCheck {
  const reasons: string[] = [];
  if (role !== "admin" && role !== "coordenacao") reasons.push("Apenas coordenação ou admin podem aprovar.");
  if (!form.rlsValidated) reasons.push("RLS manual não validada.");
  if (!form.adminTested) reasons.push("Usuário admin não testado.");
  if (!form.coordenacaoTested) reasons.push("Usuário coordenação não testado.");
  if (!form.equipeTested) reasons.push("Usuário equipe não testado.");
  if (!form.anonBlocked) reasons.push("Acesso anônimo não confirmado como bloqueado.");
  if (!form.serviceRoleAbsent) reasons.push("Ausência de service_role no frontend não confirmada.");
  if (!isPrivacyChecked(form)) reasons.push("Checklist de privacidade não confirmado.");
  if (!form.noGeocoding) reasons.push("Ausência de geocodificação não confirmada.");
  if (goNoGo.summary.sensitivePlaces > 0) reasons.push("Há sensíveis pendentes.");
  if (goNoGo.summary.duplicateWarnings > 0) reasons.push("Há duplicidades relevantes.");
  if (goNoGo.summary.reviewedRecords < 20) reasons.push("Há menos de 20 escutas revisadas.");
  if (goNoGo.summary.territoriesWithData < 3) reasons.push("Há menos de 3 territórios com dados.");
  return { ok: reasons.length === 0, reasons };
}

function buildHomologationPayload(
  form: MapHomologationForm,
  goNoGo: InternalMapGoNoGoResult,
  createdBy: string | null,
  status: InternalMapHomologationStatus
) {
  return {
    status,
    decision: form.decision,
    decision_reason: form.decisionReason.trim() || "Sem justificativa registrada.",
    rls_validated: form.rlsValidated,
    admin_tested: form.adminTested,
    coordenacao_tested: form.coordenacaoTested,
    equipe_tested: form.equipeTested,
    anon_blocked: form.anonBlocked,
    service_role_absent_frontend: form.serviceRoleAbsent,
    privacy_checked: isPrivacyChecked(form),
    no_geocoding_confirmed: form.noGeocoding,
    reviewed_records_count: goNoGo.summary.reviewedRecords,
    territories_count: goNoGo.summary.territoriesWithData,
    ready_territories_count: goNoGo.summary.readyTerritories,
    blocked_territories_count: goNoGo.summary.blockedTerritories,
    sensitive_pending_count: goNoGo.summary.sensitivePlaces,
    duplicate_warnings_count: goNoGo.summary.duplicateWarnings,
    safe_normalized_places_count: goNoGo.summary.safeNormalizedPlaces,
    snapshot: buildHomologationSnapshot(goNoGo, form),
    created_by: createdBy
  };
}

function isPrivacyChecked(form: MapHomologationForm) {
  return form.noOriginalSpeech && form.noPersonalData && form.sensitiveHidden && form.sensitiveTypeHidden;
}
