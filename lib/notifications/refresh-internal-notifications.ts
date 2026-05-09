import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  Database,
  NotificationPreference,
  Profile,
  TeamMember,
} from "@/lib/database.types";
import {
  buildInternalNotifications,
  type BuiltInternalNotification,
  type NotificationPreferencesConfig,
} from "@/lib/notifications/build-internal-notifications";
import { SMART_CLEANUP_TYPES, buildResolutionSuggestion } from "@/lib/notifications/notification-resolution";

type RefreshScope = "self" | "role" | "all";

const DEFAULT_PREFERENCES: NotificationPreferencesConfig = {
  agenda_reminders: true,
  google_calendar_alerts: true,
  weekly_report_alerts: true,
  debrief_dossier_alerts: true,
  listening_review_alerts: true,
  transparency_alerts: false,
  memory_alerts: true,
  quiet_mode: false,
};

export async function refreshInternalNotificationsForCurrentUser(
  supabase: SupabaseClient<Database>,
  scope: RefreshScope = "self"
) {
  const authResult = await supabase.auth.getUser();
  const user = authResult.data.user;

  if (!user) {
    throw new Error("Sessão inválida para recalcular avisos.");
  }

  const profileResult = await supabase
    .from("profiles")
    .select("id, role")
    .eq("id", user.id)
    .single();

  if (profileResult.error || !profileResult.data?.role) {
    throw new Error(profileResult.error?.message ?? "Perfil não encontrado.");
  }

  const profile = profileResult.data as Pick<Profile, "id" | "role">;
  if (!profile.role) {
    throw new Error("Perfil sem papel definido.");
  }

  const teamMemberResult = await supabase
    .from("team_members")
    .select("*")
    .eq("profile_id", profile.id)
    .eq("active", true)
    .maybeSingle();

  const preference = await getOrCreateNotificationPreferences(supabase, profile.id);

  const [
    eventsResult,
    eventMembersResult,
    reportsResult,
    actionsResult,
    debriefsResult,
    closuresResult,
    recordsResult,
    snapshotsResult,
    packagesResult,
    commentsResult,
    onboardingStateResult,
  ] = await Promise.all([
    supabase.from("team_calendar_events").select("*").order("starts_at", { ascending: true }),
    supabase.from("team_calendar_event_members").select("*"),
    supabase.from("weekly_team_reports").select("*").order("week_start", { ascending: false }),
    supabase.from("actions").select("*").order("action_date", { ascending: false }),
    supabase.from("action_debriefs").select("*"),
    supabase.from("action_closures").select("*"),
    supabase.from("listening_records").select("*").order("updated_at", { ascending: false }),
    supabase.from("public_transparency_snapshots").select("*").order("updated_at", { ascending: false }),
    supabase.from("public_transparency_homologation_packages").select("*").order("updated_at", { ascending: false }),
    supabase.from("public_transparency_snapshot_review_comments").select("*").order("created_at", { ascending: false }),
    supabase.from("user_onboarding_state").select("*").eq("profile_id", profile.id).maybeSingle(),
  ]);

  const onboardingState = (onboardingStateResult?.data ?? null);

  const sourceError =
    eventsResult.error ??
    eventMembersResult.error ??
    reportsResult.error ??
    actionsResult.error ??
    debriefsResult.error ??
    closuresResult.error ??
    recordsResult.error ??
    snapshotsResult.error ??
    packagesResult.error ??
    commentsResult.error;

  if (sourceError) {
    throw new Error(sourceError.message);
  }

  const generated = buildInternalNotifications({
    profileId: profile.id,
    role: profile.role,
    teamMember: (teamMemberResult.data ?? null) as TeamMember | null,
    preferences: preference,
    events: eventsResult.data ?? [],
    eventMembers: eventMembersResult.data ?? [],
    weeklyReports: reportsResult.data ?? [],
    actions: actionsResult.data ?? [],
    debriefs: debriefsResult.data ?? [],
    closures: closuresResult.data ?? [],
    listeningRecords: recordsResult.data ?? [],
    snapshots: snapshotsResult.data ?? [],
    homologationPackages: packagesResult.data ?? [],
    snapshotComments: commentsResult.data ?? [],
  });

  // Task 6: Onboarding Notifications
  if (!onboardingState || !onboardingState.seen_welcome) {
    generated.push({
      profile_id: profile.id,
      team_member_id: teamMemberResult.data?.id ?? null,
      audience_role: null,
      title: "Bem-vindo(a) ao SEMEAR Territórios",
      body: "Clique aqui para entender como funciona o sistema e sua rotina de avisos.",
      notification_type: "onboarding_welcome",
      priority: "high",
      source_type: "onboarding",
      source_id: profile.id,
      action_url: "/avisos?onboarding=true",
      due_at: null,
    });

    // Se é o primeiro acesso total, podemos inicializar o estado de onboarding
    if (!onboardingState) {
      await supabase.from("user_onboarding_state").insert({ profile_id: profile.id });
    }
  }

  const scopedGenerated = generated.filter((item) => {
    if (scope === "all") {
      return Boolean(item.audience_role);
    }

    if (scope === "role") {
      return item.audience_role === profile.role;
    }

    return !item.audience_role;
  });

  const currentNotificationsResult = await supabase
    .from("in_app_notifications")
    .select("id, profile_id, team_member_id, audience_role, notification_type, source_type, source_id, status, read_at")
    .in("status", ["unread", "read"])
    .or(
      scope === "all" 
        ? "audience_role.neq.null" 
        : scope === "role" 
          ? `audience_role.eq.${profile.role}` 
          : `profile_id.eq.${profile.id}`
    );

  if (currentNotificationsResult.error) {
    throw new Error(currentNotificationsResult.error.message);
  }

  const currentRows = currentNotificationsResult.data ?? [];
  const currentByKey = new Map(currentRows.map((row) => [buildDedupKey(row), row]));
  const nextByKey = new Map(scopedGenerated.map((item) => [buildDedupKey(item), item]));

  const smartCleanupIds: string[] = [];
  const silentArchiveIds: string[] = [];

  for (const row of currentRows) {
    const key = buildDedupKey(row);
    if (!nextByKey.has(key)) {
      if (SMART_CLEANUP_TYPES.includes(row.notification_type)) {
        smartCleanupIds.push(row.id);
      } else {
        silentArchiveIds.push(row.id);
      }
    }
  }

  if (silentArchiveIds.length > 0) {
    const archiveResult = await supabase
      .from("in_app_notifications")
      .update({ status: "archived" })
      .in("id", silentArchiveIds);

    if (archiveResult.error) {
      throw new Error(archiveResult.error.message);
    }
  }

  if (smartCleanupIds.length > 0) {
    // Para smart cleanup, marcamos como sugestão em vez de arquivar silenciosamente
    const updatePromises = currentRows
      .filter((row) => smartCleanupIds.includes(row.id))
      .map((row) => {
        const suggestion = buildResolutionSuggestion(row as any);
        return supabase
          .from("in_app_notifications")
          .update({
            auto_resolution_suggested: true,
            resolution_reason: suggestion.reason,
            resolved_at: new Date().toISOString(),
          })
          .eq("id", row.id);
      });

    await Promise.all(updatePromises);
  }

  const payload: Database["public"]["Tables"]["in_app_notifications"]["Insert"][] = scopedGenerated.map((item) => {
    const current = currentByKey.get(buildDedupKey(item));
    return {
      profile_id: item.profile_id,
      team_member_id: item.team_member_id,
      audience_role: item.audience_role,
      title: item.title,
      body: item.body,
      notification_type: item.notification_type as Database["public"]["Tables"]["in_app_notifications"]["Insert"]["notification_type"],
      priority: item.priority as Database["public"]["Tables"]["in_app_notifications"]["Insert"]["priority"],
      status: (current?.status === "read" ? "read" : "unread") as Database["public"]["Tables"]["in_app_notifications"]["Insert"]["status"],
      source_type: item.source_type,
      source_id: item.source_id,
      action_url: item.action_url,
      due_at: item.due_at,
      created_by: profile.id,
      read_at: current?.status === "read" ? current.read_at : null,
      dismissed_at: null,
    };
  });

  if (payload.length > 0) {
    const upsertResult = await supabase
      .from("in_app_notifications")
      .upsert(payload, {
        onConflict:
          "dedupe_profile_id,dedupe_team_member_id,dedupe_audience_role,notification_type,dedupe_source_type,dedupe_source_id,is_active",
      });

    if (upsertResult.error) {
      throw new Error(upsertResult.error.message);
    }
  }

  return {
    created: payload.length,
    updated: 0,
    ignored: generated.length - payload.length,
    archived: silentArchiveIds.length,
    suggested_cleanup: smartCleanupIds.length,
    scope,
    role: profile.role,
  };
}

async function getOrCreateNotificationPreferences(
  supabase: SupabaseClient<Database>,
  profileId: string
): Promise<NotificationPreferencesConfig> {
  const result = await supabase
    .from("notification_preferences")
    .select("*")
    .eq("profile_id", profileId)
    .maybeSingle();

  if (result.error) {
    throw new Error(result.error.message);
  }

  if (result.data) {
    return normalizePreferences(result.data as NotificationPreference);
  }

  const insertResult = await supabase
    .from("notification_preferences")
    .insert({ profile_id: profileId, ...DEFAULT_PREFERENCES })
    .select("*")
    .single();

  if (insertResult.error || !insertResult.data) {
    throw new Error(insertResult.error?.message ?? "Falha ao criar preferência de avisos.");
  }

  return normalizePreferences(insertResult.data as NotificationPreference);
}

function normalizePreferences(preference: NotificationPreference): NotificationPreferencesConfig {
  return {
    agenda_reminders: preference.agenda_reminders,
    google_calendar_alerts: preference.google_calendar_alerts,
    weekly_report_alerts: preference.weekly_report_alerts,
    debrief_dossier_alerts: preference.debrief_dossier_alerts,
    listening_review_alerts: preference.listening_review_alerts,
    transparency_alerts: preference.transparency_alerts,
    memory_alerts: preference.memory_alerts,
    quiet_mode: preference.quiet_mode,
  };
}

function buildDedupKey(item: {
  profile_id?: string | null;
  team_member_id?: string | null;
  audience_role?: string | null;
  notification_type: string;
  source_type?: string | null;
  source_id?: string | null;
}) {
  return [
    item.profile_id ?? "",
    item.team_member_id ?? "",
    item.audience_role ?? "",
    item.notification_type,
    item.source_type ?? "",
    item.source_id ?? "",
  ].join("|");
}
