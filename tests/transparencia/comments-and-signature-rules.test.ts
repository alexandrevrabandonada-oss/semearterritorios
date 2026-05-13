import { describe, expect, it } from "vitest";
import { buildSnapshotAuditStatus } from "@/lib/transparency-audit";
import { evaluateHomologationReadiness, freezeSnapshotPayload } from "@/lib/transparency-homologation";

function makeSnapshot(status: "draft" | "reviewed" | "approved" | "published" | "archived") {
  return {
    id: "snapshot-1",
    title: "Snapshot teste",
    status,
    territory_summary: {},
    totals: {},
    theme_summary: {},
    word_summary: {},
    action_timeline: {},
    debrief_links: {},
    review_checklist: {},
    current_risk_report: {},
    territorial_risk_override: false,
    territorial_risk_override_reason: null,
    created_at: "2026-01-01T00:00:00.000Z",
    updated_at: "2026-01-01T00:00:00.000Z",
    created_by: null,
    period_start: null,
    period_end: null,
    public_summary: null,
    generated_summary: null,
    edited_summary: null,
    methodology_notes: null,
    opening_text: null,
    listening_text: null,
    limits_text: null,
    next_steps_text: null,
    privacy_notes: null,
    approved_by: null,
    approved_at: null,
    published_at: null,
    territorial_risk_override_by: null,
    territorial_risk_override_at: null,
    last_reviewed_by: null,
    last_reviewed_at: null,
    last_edited_by: null,
    last_edited_at: null,
    source_type: null,
    source_filters: {}
  } as const;
}

function makePackage(overrides: Record<string, unknown> = {}) {
  return {
    id: "pkg-1",
    snapshot_id: "snapshot-1",
    snapshot_version_id: null,
    package_code: "SEMEAR-TV-2026-0001-TEST",
    status: "draft",
    title: "Pacote",
    period_start: null,
    period_end: null,
    institutional_summary: null,
    methodology_note: null,
    privacy_statement: null,
    approval_checklist: {
      content_reviewed: true,
      privacy_checklist_complete: true,
      no_cpf_phone_email: true,
      no_raw_quote: true,
      no_interviewer_or_team_email: true,
      rare_occupations_grouped: true,
      minimum_sample_respected: true,
      coverage_territorial_reviewed: true,
      territorial_risk_critical_justified: true,
      critical_comments_resolved: true,
      public_api_checked: true,
      validated_by_coordination: true
    },
    risk_report: { hasBlockingRisk: false },
    audit_export: null,
    frozen_payload: { ok: true },
    decision: null,
    decision_reason: null,
    prepared_by: null,
    prepared_at: null,
    signed_by: null,
    signed_at: null,
    territorial_risk_acknowledged: false,
    territorial_risk_justification: null,
    territorial_risk_acknowledged_by: null,
    territorial_risk_acknowledged_at: null,
    rejected_by: null,
    rejected_at: null,
    created_by: null,
    created_at: "2026-01-01T00:00:00.000Z",
    updated_at: "2026-01-01T00:00:00.000Z",
    ...overrides
  };
}

describe("audit and signature rules", () => {
  it("comentarios criticos pendentes bloqueiam e texto pendente vira aviso", () => {
    const status = buildSnapshotAuditStatus(
      [{ created_at: "2026-01-01T00:00:00Z" } as never],
      [
        { resolved: false, comment_type: "privacidade" },
        { resolved: false, comment_type: "texto" },
        { resolved: true, comment_type: "dados" }
      ] as never
    );

    expect(status.pendingCriticalComments).toBe(1);
    expect(status.pendingTextComments).toBe(1);
    expect(status.hasBlockingComments).toBe(true);
    expect(status.hasTextWarnings).toBe(true);
  });

  it("readiness falha quando snapshot nao esta approved/published", () => {
    const readiness = evaluateHomologationReadiness(
      makeSnapshot("reviewed") as never,
      makePackage() as never,
      [],
      false
    );

    expect(readiness.canSign).toBe(false);
    expect(readiness.blockers).toContain("Snapshot precisa estar approved ou published para assinatura.");
  });

  it("readiness falha com comentario critico, risco bloqueante, checklist incompleto e payload vazio", () => {
    const readiness = evaluateHomologationReadiness(
      makeSnapshot("approved") as never,
      makePackage({
        approval_checklist: { content_reviewed: true },
        frozen_payload: {}
      }) as never,
      [{ resolved: false, comment_type: "dados" } as never],
      true
    );

    expect(readiness.canSign).toBe(false);
    expect(readiness.blockers).toEqual(
      expect.arrayContaining([
        "Há comentários críticos pendentes.",
        "Há risco bloqueante detectado no pacote.",
        "Checklist multi-etapa incompleto.",
        "Frozen payload ainda não foi gerado."
      ])
    );
  });

  it("readiness permite assinatura quando tudo esta ok", () => {
    const readiness = evaluateHomologationReadiness(
      makeSnapshot("approved") as never,
      makePackage() as never,
      [],
      false
    );

    expect(readiness.canSign).toBe(true);
    expect(readiness.blockers).toHaveLength(0);
  });

  it("freezeSnapshotPayload nao inclui campos brutos proibidos", () => {
    const frozen = freezeSnapshotPayload(
      makeSnapshot("approved") as never,
      { version_number: 3 } as never
    );

    const serialized = JSON.stringify(frozen);
    expect(serialized).not.toMatch(/listening_records|raw_quote|interviewer|team_email/i);
    expect(frozen.snapshot_version).toBe(3);
  });
});
