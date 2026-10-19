import { afterEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
const mocks = vi.hoisted(() => ({ create: vi.fn(), docx: vi.fn(), pdf: vi.fn() }));
vi.mock("@/lib/supabase/server", () => ({ createSupabaseServerClient: mocks.create }));
vi.mock("@/lib/report-extraction", () => ({ extractTextFromDocx: mocks.docx, extractTextFromPdf: mocks.pdf }));
import { POST } from "@/app/api/memoria/mensais/importar/route";

function setup(options: { status?: string; noUser?: boolean; denied?: boolean; persistError?: boolean } = {}) {
  const writes: { table: string; operation: string; payload: Record<string, unknown> }[] = [];
  const from = vi.fn((table: string) => {
    let operation = "select";
    const query = {
      select: () => query, eq: () => query,
      insert: (payload: Record<string, unknown>) => { operation = "insert"; writes.push({ table, operation, payload }); return query; },
      update: (payload: Record<string, unknown>) => { operation = "update"; writes.push({ table, operation, payload }); return query; },
      single: async () => table === "professional_monthly_reports"
        ? { data: options.denied ? null : { id: "report", status: options.status ?? "draft" }, error: options.denied ? { message: "denied" } : null }
        : { data: { id: "attachment", file_name: "old.pdf", storage_path: "report/old.pdf" }, error: options.persistError && operation === "update" ? { message: "write failed" } : null },
      then: (resolve: (v: unknown) => unknown) => Promise.resolve({ data: null, error: null }).then(resolve),
    };
    return query;
  });
  const upload = vi.fn().mockResolvedValue({ error: null });
  mocks.create.mockResolvedValue({ from, auth: { getUser: async () => ({ data: { user: options.noUser ? null : { id: "user" } } }) }, storage: { from: () => ({ upload, download: async () => ({ data: new Blob(["pdf bytes"]), error: null }) }) } });
  mocks.docx.mockResolvedValue("Síntese do período\nTrabalho realizado com as comunidades de Volta Redonda.");
  mocks.pdf.mockResolvedValue("Síntese do período\nDiagnóstico participativo realizado durante o mês de referência.");
  return { writes, upload };
}
function request(name = "relatorio.docx", attachmentId?: string) {
  const form = new FormData(); form.set("report_id", "report");
  if (attachmentId) form.set("attachment_id", attachmentId); else form.set("file", new File(["document bytes"], name));
  return new NextRequest("https://local/api/memoria/mensais/importar", { method: "POST", body: form });
}
describe("monthly import", () => {
  afterEach(() => vi.clearAllMocks());
  it("requires authentication", async () => { setup({ noUser: true }); expect((await POST(request())).status).toBe(401); });
  it("rejects reports without access", async () => { const { upload } = setup({ denied: true }); expect((await POST(request())).status).toBe(403); expect(upload).not.toHaveBeenCalled(); });
  it.each(["submitted", "in_review", "approved"])("rejects %s without upload", async status => { const { upload } = setup({ status }); expect((await POST(request())).status).toBe(409); expect(upload).not.toHaveBeenCalled(); });
  it("rejects unsupported files", async () => { const { upload } = setup(); expect((await POST(request("mapa.png"))).status).toBe(400); expect(upload).not.toHaveBeenCalled(); });
  it.each(["relatorio.docx", "relatorio.pdf"])("extracts %s into preview without overwriting report content", async name => {
    const { writes } = setup(); const response = await POST(request(name)); const body = await response.json();
    expect(response.status).toBe(200); expect(body.mapped.summary).toBeTruthy();
    expect(writes.every(w => w.table === "professional_monthly_attachments")).toBe(true);
  });
  it("keeps scanned PDFs for manual transcription", async () => {
    const { writes } = setup(); mocks.pdf.mockResolvedValue("");
    const response = await POST(request("scan.pdf")); const body = await response.json();
    expect(response.status).toBe(200); expect(body.extractionStatus).toBe("needs_manual_transcription");
    expect(body.mapped).toEqual({}); expect(writes.some(w=>w.operation==="insert")).toBe(true);
  });
  it("preserves files when extraction fails", async () => {
    const { writes } = setup(); mocks.docx.mockRejectedValue(new Error("invalid zip"));
    const body = await (await POST(request())).json(); expect(body.extractionStatus).toBe("failed"); expect(body.extractionError).toBeTruthy();
    expect(writes.find(w=>w.operation==="update")?.payload.extraction_quality).toBe("fail");
  });
  it("reprocesses existing attachments without uploading another version", async () => {
    const { upload, writes } = setup(); expect((await POST(request("", "attachment"))).status).toBe(200);
    expect(upload).not.toHaveBeenCalled(); expect(writes.every(w=>w.operation==="update")).toBe(true);
  });
  it("returns failure if extraction metadata is not saved", async () => { setup({ persistError: true }); expect((await POST(request())).status).toBe(400); });
  it("shows privacy warnings", async () => {
    setup(); mocks.docx.mockResolvedValue("Síntese do período\nContato pessoal morador@example.com");
    const body = await (await POST(request())).json(); expect(body.privacyAlerts).toContain("Possível endereço de e-mail detectado.");
  });
});
