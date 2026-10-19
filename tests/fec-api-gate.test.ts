import { afterEach, describe, expect, it, vi } from "vitest";
const factory = vi.hoisted(() => vi.fn());
vi.mock("@/lib/supabase/server", () => ({
  createSupabaseServerClient: factory,
}));
import { GET as catalog } from "@/app/api/fec/catalog/route";
import { GET as monthly } from "@/app/api/fec/monthly/route";
import {
  GET as knowledge,
  POST as createKnowledge,
} from "@/app/api/fec/knowledge/route";
import { POST as review } from "@/app/api/fec/review/route";
import { POST as upload } from "@/app/api/fec/files/route";
import { GET as territory } from "@/app/api/fec/territories/route";
import {
  GET as versions,
  POST as closeMonthly,
} from "@/app/api/fec/monthly/reports/route";
afterEach(() => {
  vi.unstubAllEnvs();
  factory.mockReset();
});
describe("flag e sessão antes de qualquer acesso FEC", () => {
  it("mantém consulta e mutação desligadas sem flag, inclusive upload e revisão", async () => {
    vi.stubEnv("SEMEAR_FEC_PERSISTENCE_ENABLED", "");
    const request = () => new Request("http://localhost/api/fec/test");
    const responses = await Promise.all([
      catalog(),
      monthly(request()),
      knowledge(request()),
      createKnowledge(request()),
      review(request()),
      upload(request()),
      territory(request()),
      versions(request()),
      closeMonthly(request()),
    ]);
    expect(responses.map((r) => r.status)).toEqual([
      503, 503, 503, 503, 503, 503, 503, 503, 503,
    ]);
    expect(factory).not.toHaveBeenCalled();
  });
  it("flag ativa não substitui autenticação nem cria acesso ao banco sem sessão", async () => {
    vi.stubEnv("SEMEAR_FEC_PERSISTENCE_ENABLED", "true");
    const from = vi.fn();
    factory.mockResolvedValue({
      auth: { getUser: async () => ({ data: { user: null }, error: null }) },
      from,
    });
    const r = await review(
      new Request("http://localhost/api/fec/review", {
        method: "POST",
        body: JSON.stringify({ decision: "approved" }),
      }),
    );
    expect(r.status).toBe(401);
    expect(from).not.toHaveBeenCalled();
  });
});
