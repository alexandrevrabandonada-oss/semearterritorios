import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const sql = readFileSync(join(process.cwd(),
  "supabase/migrations/20261019190000_fec_technical_cycles_staged.sql"), "utf8");

describe("contrato estatico da migração FEC — NAO substitui RLS em banco", () => {
  it("mantem tabelas exclusivas e transacao explicita", () => {
    expect(sql.trimStart().startsWith("-- SEMEAR")).toBe(true);
    expect(sql).toContain("begin;");
    expect(sql.trimEnd().endsWith("commit;")).toBe(true);
    for (const table of ["fec_engagements","fec_access_grants","fec_cycles","fec_activities","fec_review_log"]) {
      expect(sql).toContain("create table public." + table);
      expect(sql).toContain("alter table public." + table + " enable row level security");
    }
    expect(sql).not.toMatch(/(?:alter|drop|truncate)\s+table\s+public\.(?:actions|weekly_team_reports|workshop_records|listening_records)\b/i);
  });
  it("nao concede provisionamento de contrato a clientes autenticados", () => {
    expect(sql).not.toMatch(/grant\s+(?:insert|update|all)\s+on\s+public\.fec_access_grants\s+to\s+authenticated/i);
    expect(sql).not.toMatch(/grant\s+(?:insert|update|all)\s+on\s+public\.fec_engagements\s+to\s+authenticated/i);
    expect(sql).toContain("fec_has_assignment");
    expect(sql).toContain("fec_can_read_cycle");
    expect(sql).toContain("fec_can_edit_cycle");
    expect(sql).toContain("owner_id = auth.uid()");
  });
  it("exige supervisor nomeado, revisao independente e audit trail", () => {
    expect(sql).toContain("public.fec_has_assignment(v_engagement_id, 'supervisor')");
    expect(sql).toContain("auth.uid() = v_owner_id");
    expect(sql).toContain("v_status <> 'submitted'");
    expect(sql).toContain("insert into public.fec_review_log");
    expect(sql).toContain("revoke all on function public.fec_review_record");
  });
  it("nao permite contagem de publico em preparacao ou publicacao automatica", () => {
    expect(sql).toContain("activity_type not in ('preparation','systematization')");
    expect(sql).toContain("participation_kind = 'not_recorded'");
    expect(sql).not.toMatch(/create\s+policy\s+.*on\s+public\.fec_activities\s+for\s+select\s+to\s+anon/i);
  });
});
