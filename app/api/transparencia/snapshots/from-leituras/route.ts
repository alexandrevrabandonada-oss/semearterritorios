import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/database.types";
import {
  buildTransparencySnapshotFromCollectiveReading,
  type CollectiveReadingInputData,
  type CollectiveReadingSnapshotFilters
} from "@/lib/collective-reading-to-snapshot";

function tokenizeWords(text: string) {
  return text
    .split(/[,;\n\r\t\s]+/)
    .map((word) => word.trim())
    .filter(Boolean);
}

export async function POST(request: Request) {
  const supabase = createSupabaseServerClient();
  const body = await request.json().catch(() => ({}));
  const mode = body?.mode === "create" ? "create" : "preview";
  const filters = (body?.filters ?? {}) as CollectiveReadingSnapshotFilters;

  const userResult = await supabase.auth.getUser();
  const userId = userResult.data.user?.id ?? null;
  if (!userId) {
    return NextResponse.json({ error: "Faça login para preparar snapshot a partir de Leituras Coletivas." }, { status: 401 });
  }

  const profileResult = await supabase.from("profiles").select("id, role").eq("id", userId).maybeSingle();
  if (profileResult.error) {
    return NextResponse.json({ error: "Não foi possível validar seu perfil." }, { status: 500 });
  }

  const role = profileResult.data?.role ?? null;
  if (!role || !["admin", "coordenacao", "equipe"].includes(role)) {
    return NextResponse.json({ error: "Seu perfil não está habilitado para preparar snapshot." }, { status: 403 });
  }

  const [
    recordsResult,
    actionsResult,
    neighborhoodsResult,
    recordThemesResult,
    placesResult
  ] = await Promise.all([
    supabase
      .from("listening_records")
      .select("id, action_id, date, review_status, words_used, respondent_occupation, neighborhood_id, respondent_neighborhood_id, neighborhoods:neighborhood_id(id,name), respondent_neighborhood:respondent_neighborhood_id(id,name)")
      .order("date", { ascending: true }),
    supabase
      .from("actions")
      .select("id, title, action_date, action_type, status, neighborhood_id, neighborhoods:neighborhood_id(id,name)")
      .order("action_date", { ascending: true }),
    supabase.from("neighborhoods").select("id, name"),
    supabase
      .from("listening_record_themes")
      .select("listening_record_id, themes:theme_id(id,name)"),
    supabase
      .from("place_mentioned")
      .select("normalized_places!inner(id, normalized_name, visibility, neighborhoods(name))")
      .eq("normalized_places.visibility", "public_safe")
  ]);

  if (recordsResult.error || actionsResult.error || neighborhoodsResult.error || recordThemesResult.error || placesResult.error) {
    return NextResponse.json(
      {
        error:
          recordsResult.error?.message ??
          actionsResult.error?.message ??
          neighborhoodsResult.error?.message ??
          recordThemesResult.error?.message ??
          placesResult.error?.message ??
          "Falha ao carregar dados de Leituras Coletivas."
      },
      { status: 500 }
    );
  }

  const allRecords = recordsResult.data ?? [];
  const allActions = actionsResult.data ?? [];
  const neighborhoods = neighborhoodsResult.data ?? [];

  const start = filters.period_start ? new Date(`${filters.period_start}T00:00:00`) : null;
  const end = filters.period_end ? new Date(`${filters.period_end}T23:59:59`) : null;

  const selectedActions = allActions.filter((action) => {
    if (filters.action_ids && filters.action_ids.length > 0 && !filters.action_ids.includes(action.id)) return false;
    if (start && new Date(`${action.action_date}T00:00:00`) < start) return false;
    if (end && new Date(`${action.action_date}T00:00:00`) > end) return false;
    return true;
  });

  const selectedActionIds = new Set(selectedActions.map((action) => action.id));
  const selectedRecords = allRecords.filter((record) => {
    if (filters.action_ids && filters.action_ids.length > 0 && !selectedActionIds.has(record.action_id as string)) return false;
    if (start && new Date(`${record.date}T00:00:00`) < start) return false;
    if (end && new Date(`${record.date}T00:00:00`) > end) return false;
    return true;
  });

  const reviewedRecords = selectedRecords.filter((record) => record.review_status === "reviewed");

  const territoryDistributionMap = new Map<string, { id: string; name: string; count: number }>();
  for (const record of reviewedRecords) {
    const neighborhood = (record as any).respondent_neighborhood;
    if (!neighborhood?.id) continue;
    const current = territoryDistributionMap.get(neighborhood.id) ?? { id: neighborhood.id, name: neighborhood.name, count: 0 };
    current.count += 1;
    territoryDistributionMap.set(neighborhood.id, current);
  }

  const territoryDistribution = Array.from(territoryDistributionMap.values()).sort((a, b) => b.count - a.count || a.name.localeCompare(b.name, "pt-BR"));

  const reviewedByTerritory = new Map<string, number>();
  for (const record of reviewedRecords) {
    const territoryId = record.respondent_neighborhood_id;
    if (!territoryId) continue;
    reviewedByTerritory.set(territoryId, (reviewedByTerritory.get(territoryId) ?? 0) + 1);
  }

  const territoryGaps = neighborhoods.map((n) => {
    const reviewed = reviewedByTerritory.get(n.id) ?? 0;
    return {
      id: n.id,
      name: n.name,
      total: reviewed,
      reviewed,
      status: reviewed === 0 ? "sem_escuta" : reviewed < 5 ? "pouca_escuta" : "coberto"
    };
  });

  const recordThemeMap = new Map<string, Array<{ id: string; name: string }>>();
  for (const row of recordThemesResult.data ?? []) {
    const theme = (row as any).themes;
    if (!theme?.id || !theme?.name) continue;
    const current = recordThemeMap.get(row.listening_record_id) ?? [];
    current.push({ id: theme.id, name: theme.name });
    recordThemeMap.set(row.listening_record_id, current);
  }

  const themeCounter = new Map<string, number>();
  for (const record of reviewedRecords) {
    for (const theme of recordThemeMap.get(record.id) ?? []) {
      themeCounter.set(theme.name, (themeCounter.get(theme.name) ?? 0) + 1);
    }
  }

  const themeSummary = Array.from(themeCounter.entries())
    .map(([theme, count]) => ({ theme, count }))
    .sort((a, b) => b.count - a.count || a.theme.localeCompare(b.theme, "pt-BR"))
    .slice(0, 20);

  const wordCounter = new Map<string, number>();
  for (const record of reviewedRecords) {
    for (const token of tokenizeWords(record.words_used ?? "")) {
      wordCounter.set(token, (wordCounter.get(token) ?? 0) + 1);
    }
  }

  const wordSummary = Array.from(wordCounter.entries())
    .map(([word, count]) => ({ word, count }))
    .sort((a, b) => b.count - a.count || a.word.localeCompare(b.word, "pt-BR"))
    .slice(0, 50);

  const occupationCounter = new Map<string, number>();
  for (const record of reviewedRecords) {
    const occupation = (record.respondent_occupation ?? "Não informada").trim() || "Não informada";
    occupationCounter.set(occupation, (occupationCounter.get(occupation) ?? 0) + 1);
  }

  const occupationSummary = Array.from(occupationCounter.entries())
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name, "pt-BR"));

  const actionTimeline = selectedActions
    .filter((action) => action.status === "realizada")
    .map((action) => ({
      date: action.action_date,
      title: action.title,
      territory: (action as any).neighborhoods?.name ?? "Território não informado",
      action_type: action.action_type,
      action_status: action.status
    }));

  const placeMap = new Map<string, { name: string; territory: string; count: number; visibility: string }>();
  for (const row of placesResult.data ?? []) {
    const normalizedPlace = (row as any).normalized_places;
    if (!normalizedPlace?.id) continue;
    const key = normalizedPlace.id;
    const current = placeMap.get(key) ?? {
      name: normalizedPlace.normalized_name,
      territory: normalizedPlace.neighborhoods?.name ?? "Sem território",
      count: 0,
      visibility: normalizedPlace.visibility
    };
    current.count += 1;
    placeMap.set(key, current);
  }

  const places = Array.from(placeMap.values()).sort((a, b) => b.count - a.count || a.name.localeCompare(b.name, "pt-BR"));

  const data: CollectiveReadingInputData = {
    overview: {
      total_records: selectedRecords.length,
      reviewed_records: reviewedRecords.length,
      territories_reached: new Set(reviewedRecords.map((item) => item.respondent_neighborhood_id).filter(Boolean)).size,
      records_without_review: selectedRecords.filter((item) => item.review_status !== "reviewed").length
    },
    territoryDistribution,
    territoryGaps,
    themeSummary,
    wordSummary,
    occupationSummary,
    actionTimeline,
    places
  };

  const built = buildTransparencySnapshotFromCollectiveReading({ filters, data });

  const preview = {
    period: {
      start: built.period_start,
      end: built.period_end
    },
    reviewed_total: data.overview.reviewed_records,
    territories_reached: data.overview.territories_reached,
    top_themes: built.theme_summary.slice(0, 5),
    top_words: built.word_summary.slice(0, 10),
    silences: built.territory_summary.silences_and_gaps.filter((item) => item.public_status.includes("insuficientes")).slice(0, 8),
    methodology_note: built.methodology_notes,
    include_list: [
      "Período selecionado",
      "Totais de escutas revisadas",
      "Territórios alcançados",
      "Temas agregados",
      "Palavras recorrentes sanitizadas",
      "Silêncios/lacunas com baixa amostra"
    ],
    exclude_list: [
      "Fala original bruta",
      "Escuta bruta individual",
      "Entrevistador",
      "CPF/telefone/e-mail/endereço",
      "Lugar sensível",
      "Coordenada individual"
    ],
    alerts: [
      "Territórios com menos de 5 escutas revisadas serão marcados como dados insuficientes para síntese pública.",
      "Ocupações raras serão agrupadas.",
      "Falas originais não entram."
    ]
  };

  if (mode === "preview") {
    return NextResponse.json({ preview, draft: built });
  }

  const insertResult = await supabase
    .from("public_transparency_snapshots")
    .insert({
      title: built.title,
      period_start: built.period_start,
      period_end: built.period_end,
      status: "draft",
      public_summary: built.public_summary,
      generated_summary: built.public_summary,
      edited_summary: built.public_summary,
      totals: built.totals,
      territory_summary: built.territory_summary,
      theme_summary: built.theme_summary,
      word_summary: built.word_summary,
      action_timeline: built.action_timeline,
      privacy_notes: built.privacy_notes,
      methodology_notes: built.methodology_notes,
      limits_text: built.limits_text,
      review_checklist: built.checklist_defaults,
      source_type: built.source_type,
      source_filters: built.source_filters,
      source_generated_at: built.source_generated_at,
      created_by: userId
    })
    .select("id")
    .single();

  if (insertResult.error) {
    return NextResponse.json({ error: insertResult.error.message }, { status: 500 });
  }

  const notificationPayload: Database["public"]["Tables"]["in_app_notifications"]["Insert"][] = [
    {
      profile_id: null,
      team_member_id: null,
      audience_role: "coordenacao",
      title: "Novo snapshot de leitura coletiva aguardando revisão.",
      body: "Um snapshot draft foi criado a partir de Leituras Coletivas e precisa de revisão editorial.",
      notification_type: "transparency_review_pending",
      priority: "high",
      source_type: "public_transparency_snapshots",
      source_id: insertResult.data.id,
      action_url: `/transparencia/snapshots/${insertResult.data.id}`,
      due_at: new Date().toISOString(),
      created_by: userId,
      read_at: null,
      dismissed_at: null
    },
    {
      profile_id: null,
      team_member_id: null,
      audience_role: "admin",
      title: "Novo snapshot de leitura coletiva aguardando revisão.",
      body: "Um snapshot draft foi criado a partir de Leituras Coletivas e precisa de revisão editorial.",
      notification_type: "transparency_review_pending",
      priority: "high",
      source_type: "public_transparency_snapshots",
      source_id: insertResult.data.id,
      action_url: `/transparencia/snapshots/${insertResult.data.id}`,
      due_at: new Date().toISOString(),
      created_by: userId,
      read_at: null,
      dismissed_at: null
    }
  ];

  await supabase.from("in_app_notifications").insert(notificationPayload);

  return NextResponse.json({
    id: insertResult.data.id,
    redirect_to: `/transparencia/snapshots/${insertResult.data.id}?source=collective_reading`,
    message: "Snapshot criado a partir de Leituras Coletivas. Revise texto, checklist e privacidade antes de aprovar."
  });
}
