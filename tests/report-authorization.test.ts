import { describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const mocks = vi.hoisted(() => ({ createClient: vi.fn() }));
vi.mock("@supabase/supabase-js", () => ({ createClient: mocks.createClient }));
vi.mock("@/lib/report-extraction", () => ({ extractTextFromDocx: vi.fn(), extractTextFromPdf: vi.fn(), mapRawTextToReport: vi.fn() }));
import { POST as importReport } from "@/app/api/memoria/import-report/route";
import { POST as processReport } from "@/app/api/memoria/process-report/route";

describe("autorização de relatórios com cliente privilegiado", () => {
  it.each(["submitted", "approved", "reviewed"])("impede equipe de sobrescrever relatório %s", async (status) => {
    const download = vi.fn();
    const from = vi.fn((table: string) => {
      const data = table === "profiles" ? { id: "user", role: "equipe" }
        : { id: "attachment", uploaded_by: "user", weekly_team_reports: { profile_id: "user", status } };
      const query = { select: vi.fn(), eq: vi.fn(), single: vi.fn().mockResolvedValue({ data, error: null }) };
      query.select.mockReturnValue(query);
      query.eq.mockReturnValue(query);
      return query;
    });
    mocks.createClient.mockReturnValue({ auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: "user" } }, error: null }) }, from, storage: { from: download } });
    const response = await processReport(new NextRequest("https://local/api/memoria/process-report", { method: "POST", headers: { Authorization: "Bearer test" }, body: JSON.stringify({ attachmentId: "attachment" }) }));
    expect(response.status).toBe(403);
    expect(download).not.toHaveBeenCalled();
    expect(from).not.toHaveBeenCalledWith("weekly_team_reports");
  });

  it.each([null, "pendente"])("nega importação e processamento para papel %s", async (role) => {
    vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "test-only-key");
    const from = vi.fn((table: string) => {
      const data = table === "profiles" ? { id: "user", role }
        : table === "team_members" ? { id: "member", profile_id: "user" }
        : { id: "attachment", uploaded_by: "user", weekly_team_reports: { profile_id: "user" } };
      const query = { select: vi.fn(), eq: vi.fn(), single: vi.fn().mockResolvedValue({ data, error: null }) };
      query.select.mockReturnValue(query);
      query.eq.mockReturnValue(query);
      return query;
    });
    mocks.createClient.mockReturnValue({ auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: "user" } }, error: null }) }, from });
    try {
      const form = new FormData();
      form.set("file", new File(["Relatório de teste"], "test.txt"));
      form.set("week_start", "2026-09-01");
      form.set("week_end", "2026-09-07");
      form.set("team_member_id", "member");
      const imported = await importReport(new NextRequest("https://local/api/memoria/import-report", { method: "POST", headers: { Authorization: "Bearer test" }, body: form }));
      expect(imported.status).toBe(403);
      const processed = await processReport(new NextRequest("https://local/api/memoria/process-report", { method: "POST", headers: { Authorization: "Bearer test" }, body: JSON.stringify({ attachmentId: "attachment" }) }));
      expect(processed.status).toBe(403);
      expect(from).not.toHaveBeenCalledWith("weekly_team_reports");
    } finally {
      vi.unstubAllEnvs();
    }
  });
});
