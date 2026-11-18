import { afterEach, describe, expect, it, vi } from "vitest";

const factory = vi.hoisted(() => vi.fn());
vi.mock("@/lib/supabase/server", () => ({
  createSupabaseServerClient: factory,
}));
import { fecSession } from "@/lib/fec-server";

function provideProfile(role: string | null, profileFound = true) {
  const from = vi.fn().mockReturnValue({
    select: () => ({
      eq: () => ({
        maybeSingle: async () => ({
          data: profileFound ? { role } : null,
          error: null,
        }),
      }),
    }),
  });
  factory.mockResolvedValue({
    auth: {
      getUser: async () => ({
        data: { user: { id: "00000000-0000-4000-8000-000000000001" } },
        error: null,
      }),
    },
    from,
  });
  return from;
}

afterEach(() => {
  vi.unstubAllEnvs();
  factory.mockReset();
});

describe("FEC: perfil SEMEAR habilitado sem vínculo em equipe", () => {
  it.each(["admin", "equipe", "coordenacao", "externo"])(
    "permite login com role %s sem consultar team_members",
    async (role) => {
      vi.stubEnv("SEMEAR_FEC_PERSISTENCE_ENABLED", "true");
      const from = provideProfile(role);
      const session = await fecSession();
      expect(session).toHaveProperty("userId", "00000000-0000-4000-8000-000000000001");
      expect(from).toHaveBeenCalledTimes(1);
      expect(from).toHaveBeenCalledWith("profiles");
    },
  );

  it.each([null, "", " "])(
    "não libera inscrições sem habilitação institucional (%s)",
    async (role) => {
      vi.stubEnv("SEMEAR_FEC_PERSISTENCE_ENABLED", "true");
      provideProfile(role);
      const session = await fecSession();
      expect(session).toHaveProperty("response.status", 403);
    },
  );

  it("nega conta autenticada sem perfil no SEMEAR", async () => {
    vi.stubEnv("SEMEAR_FEC_PERSISTENCE_ENABLED", "true");
    provideProfile(null, false);
    const session = await fecSession();
    expect(session).toHaveProperty("response.status", 403);
  });
});
