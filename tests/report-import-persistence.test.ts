import { afterEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const mocks = vi.hoisted(() => ({ createClient: vi.fn() }));
vi.mock("@supabase/supabase-js", () => ({ createClient: mocks.createClient }));
vi.mock("@/lib/report-extraction", () => ({ extractTextFromDocx: vi.fn(), extractTextFromPdf: vi.fn(), mapRawTextToReport: vi.fn().mockReturnValue(null) }));
import { POST } from "@/app/api/memoria/import-report/route";

function setup(failure: string) {
  vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "test-only");
  const from = vi.fn((table: string) => {
    let error: unknown = null;
    let data: unknown = table === "profiles" ? { id: "user", role: "admin" } : { id: "member", profile_id: "user" };
    const query: any = {
      select: () => query,
      eq: () => query,
      single: async () => ({ data, error }),
      then: (resolve: (value: unknown) => unknown) => Promise.resolve({ data, error }).then(resolve),
      insert: (payload: unknown) => {
        data = table === "weekly_team_reports" ? { id: "report" } : { id: "attachment" };
        if (failure === "links" && table === "weekly_team_report_actions") error = { message: "test failure" };
        return query;
      },
      update: (payload: Record<string, unknown>) => {
        if ((failure === "attachment-link" && "imported_attachment_id" in payload)
          || (failure === "extraction" && table === "weekly_team_report_attachments")
          || (failure === "report" && "imported_raw_text" in payload)) error = { message: "test failure" };
        return query;
      },
    };
    return query;
  });
  mocks.createClient.mockReturnValue({ from, auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: "user" } }, error: null }) }, storage: { from: () => ({ upload: async () => ({ error: null }) }) } });
  return from;
}

function request(actionIds = '["action"]') {
  const form = new FormData();
  form.set("file", new File(["Relatório de atividades comunitárias"], "test.txt"));
  form.set("week_start", "2026-09-01");
  form.set("week_end", "2026-09-07");
  form.set("team_member_id", "member");
  form.set("action_ids", actionIds);
  return new NextRequest("https://local/api/memoria/import-report", { method: "POST", headers: { Authorization: "Bearer test" }, body: form });
}

describe("persistência de importação", () => {
  afterEach(() => vi.unstubAllEnvs());
  it.each(["attachment-link", "links", "extraction", "report"])("não informa sucesso quando falha %s", async (failure) => {
    setup(failure);
    const response = await POST(request());
    expect(response.status).toBe(500);
    const body = await response.json();
    expect(body.success).toBeUndefined();
    expect(body.reportId).toBe("report");
  });
  it("retorna sucesso quando todas as gravações funcionam", async () => {
    setup("");
    const response = await POST(request());
    expect(response.status).toBe(200);
    expect((await response.json()).success).toBe(true);
  });
  it.each(['{"id":"action"}', 'null', '[5]', '{'])("rejeita vínculos inválidos %s antes de gravar", async (ids) => {
    const from = setup("");
    expect((await POST(request(ids))).status).toBe(400);
    expect(from).not.toHaveBeenCalled();
  });
});
