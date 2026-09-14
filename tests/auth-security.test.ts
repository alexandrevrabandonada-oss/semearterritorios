import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { getSafeNextPath, hasAuthorizedRole } from "@/lib/auth-policy";

const mocks = vi.hoisted(() => ({ client: vi.fn(), ssr: vi.fn(), generate: vi.fn() }));
vi.mock("@/lib/supabase/server", () => ({ createSupabaseServerClient: mocks.client }));
vi.mock("@supabase/ssr", () => ({ createServerClient: mocks.ssr }));
vi.mock("ai", () => ({ generateText: mocks.generate }));
vi.mock("@ai-sdk/openai", () => ({ openai: vi.fn() }));
import { POST } from "@/app/api/gerar-sintese/route";
import { updateSession } from "@/lib/supabase/middleware";

function client(user: unknown, role: unknown) {
  const query = { select: vi.fn(), eq: vi.fn(), maybeSingle: vi.fn().mockResolvedValue({ data: { role }, error: null }) };
  query.select.mockReturnValue(query);
  query.eq.mockReturnValue(query);
  return { auth: { getUser: vi.fn().mockResolvedValue({ data: { user }, error: null }) }, from: vi.fn().mockReturnValue(query) };
}

describe("proteção de autenticação", () => {
  beforeEach(() => { mocks.generate.mockReset(); });

  it.each([null, "", "pendente", "visitante", "ADMIN"])("rejeita papel não autorizado %s", (role) => {
    expect(hasAuthorizedRole(role)).toBe(false);
  });
  it.each(["admin", "coordenacao", "equipe"])("aceita papel %s", (role) => {
    expect(hasAuthorizedRole(role)).toBe(true);
  });
  it.each(["//evil.test", "/\\evil.test", "/\t/evil.test", "https://evil.test", null])("bloqueia destino externo %s", (path) => {
    expect(getSafeNextPath(path)).toBe("/");
  });
  it("preserva destino interno com query", () => {
    expect(getSafeNextPath("/agenda?view=month")).toBe("/agenda?view=month");
  });
  it("bloqueia geração anônima antes de chamar IA", async () => {
    mocks.client.mockReturnValue(client(null, null));
    const response = await POST(new Request("https://local/api/gerar-sintese", { method: "POST" }));
    expect(response.status).toBe(401);
    expect(mocks.generate).not.toHaveBeenCalled();
  });
  it("bloqueia geração por perfil não liberado", async () => {
    mocks.client.mockReturnValue(client({ id: "user" }, null));
    const response = await POST(new Request("https://local/api/gerar-sintese", { method: "POST" }));
    expect(response.status).toBe(403);
    expect(mocks.generate).not.toHaveBeenCalled();
  });
  it("responde 400 para JSON inválido", async () => {
    mocks.client.mockReturnValue(client({ id: "user" }, "equipe"));
    const response = await POST(new Request("https://local/api/gerar-sintese", { method: "POST", body: "{" }));
    expect(response.status).toBe(400);
  });
  it("preserva cookies renovados ao redirecionar", async () => {
    mocks.ssr.mockImplementation((_url, _key, options) => {
      const supabase = client({ id: "user" }, "equipe");
      supabase.auth.getUser.mockImplementation(async () => {
        options.cookies.setAll([{ name: "session", value: "renewed", options: { httpOnly: true, path: "/" } }]);
        return { data: { user: { id: "user" } }, error: null };
      });
      return supabase;
    });
    const response = await updateSession(new NextRequest("https://local/login"));
    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe("https://local/");
    expect(response.cookies.get("session")?.value).toBe("renewed");
    expect(response.headers.get("set-cookie")).toContain("HttpOnly");
  });
});
