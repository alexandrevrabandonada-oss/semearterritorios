import { describe, expect, it, vi } from "vitest";

const { mockedCreateSupabaseServerClient } = vi.hoisted(() => ({
  mockedCreateSupabaseServerClient: vi.fn()
}));

vi.mock("@/lib/supabase/server", () => ({
  createSupabaseServerClient: mockedCreateSupabaseServerClient
}));

import { GET } from "@/app/api/public/transparencia-viva/route";

type QueryResult = { data: unknown; error: unknown };

function withSupabaseResult(result: QueryResult) {
  const maybeSingle = vi.fn().mockResolvedValue(result);
  const limit = vi.fn().mockReturnValue({ maybeSingle });
  const order = vi.fn().mockReturnValue({ limit });
  const eq = vi.fn().mockReturnValue({ order });
  const select = vi.fn().mockReturnValue({ eq });
  const from = vi.fn().mockReturnValue({ select });
  mockedCreateSupabaseServerClient.mockReturnValue({ from });
}

describe("GET /api/public/transparencia-viva", () => {
  it("retorna snapshot nulo quando nao ha publicacao", async () => {
    withSupabaseResult({ data: null, error: null });

    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual({ snapshot: null });
  });

  it("retorna erro 500 quando a consulta falha", async () => {
    withSupabaseResult({ data: null, error: { message: "db down" } });

    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(500);
    expect(body.error).toMatch(/Não foi possível carregar a Transparência Viva/i);
  });

  it("remove campos de override interno e expande nota territorial sanitizada", async () => {
    withSupabaseResult({
      data: {
        id: "snap-1",
        title: "Publicacao",
        status: "published",
        public_summary: "Texto publico",
        period_start: "2026-05-01",
        period_end: "2026-05-07",
        opening_text: null,
        listening_text: null,
        limits_text: null,
        next_steps_text: null,
        methodology_notes: null,
        totals: {},
        territory_summary: {
          territorial_quality_summary: {
            status: "crítica",
            methodology_note: "Cobertura territorial incompleta"
          }
        },
        theme_summary: {},
        word_summary: {},
        action_timeline: {},
        debrief_links: {},
        privacy_notes: null,
        published_at: "2026-05-07T12:00:00.000Z",
        updated_at: "2026-05-07T12:00:00.000Z",
        territorial_risk_override: true,
        territorial_risk_override_reason: "Rua das Flores, 123 contato 11988887777"
      },
      error: null
    });

    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.snapshot.territorial_risk_override).toBeUndefined();
    expect(body.snapshot.territorial_risk_override_reason).toBeUndefined();
    expect(body.territorial_publication_note).not.toBeNull();

    const note = JSON.stringify(body.territorial_publication_note);
    expect(note).not.toMatch(/11988887777/);
  });
});
