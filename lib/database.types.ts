export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type SourceType =
  | "feira"
  | "cras"
  | "escola"
  | "praca"
  | "roda"
  | "oficina"
  | "caminhada"
  | "outro";

export type ReviewStatus = "draft" | "reviewed";
export type TerritorialReviewStatus = "pending" | "reviewed" | "needs_attention";
export type NormalizedPlaceVisibility = "internal" | "public_safe" | "sensitive";
export type DebriefStatus = "draft" | "reviewed" | "approved";
export type ClosureStatus = "open" | "in_review" | "closed" | "reopened";
export type InternalMapHomologationStatus = "draft" | "reviewed" | "approved" | "rejected";
export type InternalMapHomologationDecision =
  | "no_go_dados_insuficientes"
  | "no_go_privacidade"
  | "no_go_normalizacao"
  | "go_desenho_tecnico"
  | "go_prototipo_interno"
  | "manter_mapa_lista";
export type PublicTransparencySnapshotStatus = "draft" | "reviewed" | "approved" | "published" | "archived";
export type SnapshotReviewCommentType = "privacidade" | "texto" | "metodologia" | "dados" | "aprovacao" | "publicacao" | "outro";
export type TransparencyHomologationPackageStatus = "draft" | "ready_for_signature" | "signed" | "rejected" | "archived";
export type TransparencyHomologationDecision = "aprovado_para_publicacao" | "revisar_antes_de_publicar" | "rejeitado" | "arquivado";
export type WeeklyTeamReportStatus = "draft" | "submitted" | "in_review" | "approved" | "needs_changes" | "archived";
export type ProjectMemoryType = "atividade" | "decisao" | "aprendizado" | "problema" | "encaminhamento" | "marco" | "outro";
export type ProjectMemoryVisibility = "internal" | "public_candidate" | "public_approved";
export type InAppNotificationType =
  | "agenda_event_today"
  | "agenda_event_tomorrow"
  | "agenda_event_overdue"
  | "google_sync_error"
  | "google_drift_pending"
  | "weekly_report_due"
  | "weekly_report_needs_changes"
  | "debrief_pending"
  | "dossier_pending"
  | "listening_review_pending"
  | "transparency_review_pending"
  | "memory_review_pending"
  | "system_notice"
  | "onboarding_welcome"
  | "outro";
export type InAppNotificationPriority = "low" | "normal" | "high" | "urgent";
export type InAppNotificationStatus = "unread" | "read" | "archived" | "dismissed";
export type TeamCalendarEventType = "acao_campo" | "banca_escuta" | "reuniao" | "relatorio_semanal" | "devolutiva" | "dossie" | "memoria" | "prazo" | "outro";
export type TeamCalendarEventStatus = "planned" | "confirmed" | "done" | "cancelled" | "postponed";
export type TeamCalendarAttendanceStatus = "invited" | "confirmed" | "declined" | "attended" | "absent" | "unknown";
export type GoogleCalendarSyncStatus = "not_synced" | "synced" | "sync_error" | "cancelled" | "unlinked";
export type GoogleCalendarSyncAction = "create" | "update" | "cancel" | "unlink" | "error";
export type GoogleCalendarSyncLogStatus = "success" | "failed" | "skipped";
export type GoogleCalendarConnectionProvider = "google";
export type PublicQuoteStatus = "draft" | "needs_review" | "approved_internal" | "approved_public" | "rejected" | "archived";
export type PublicQuoteAuditEventType =
  | "created"
  | "text_changed"
  | "sanitized_text_changed"
  | "sent_to_review"
  | "approved_internal"
  | "approved_public"
  | "rejected"
  | "archived"
  | "restored"
  | "risk_detected"
  | "status_changed";

export type NeighborhoodStatus = "oficial" | "provisorio" | "revisar" | "nao_usar";
export type NeighborhoodSector = "SCN" | "SO" | "SN" | "SL" | "SS" | "SCS" | "SSO";

export type ActionType =
  | "banca_escuta"
  | "roda"
  | "oficina"
  | "caminhada"
  | "reuniao_institucional"
  | "devolutiva"
  | "outro";

export type ActionStatus = "planejada" | "realizada" | "reprogramada" | "cancelada";

type TimestampedRow = {
  created_at: string;
  updated_at: string;
};

type CreatedByRow = {
  created_by: string | null;
};

export type Profile = TimestampedRow & {
  id: string;
  full_name: string | null;
  role: "equipe" | "coordenacao" | "admin" | null;
};

export type Neighborhood = TimestampedRow &
  CreatedByRow & {
    id: string;
    name: string;
    city: string | null;
    official_code: number | null;
    sector: NeighborhoodSector | null;
    region: string | null;
    aliases: string | null;
    status: NeighborhoodStatus | null;
    notes: string | null;
  };

export type Action = TimestampedRow &
  CreatedByRow & {
    id: string;
    title: string;
    action_type: ActionType;
    action_date: string;
    starts_at: string | null;
    ends_at: string | null;
    all_day: boolean;
    neighborhood_id: string | null;
    location_reference: string | null;
    objective: string | null;
    team: string | null;
    estimated_public: number | null;
    summary: string | null;
    status: ActionStatus;
    notes: string | null;
  };

export type TeamMember = TimestampedRow &
  CreatedByRow & {
    id: string;
    profile_id: string | null;
    display_name: string;
    email: string | null;
    role_label: string | null;
    active: boolean;
    can_interview: boolean;
    can_join_actions: boolean;
    notes: string | null;
  };

export type ActionTeamMember = TimestampedRow &
  CreatedByRow & {
    id: string;
    action_id: string;
    team_member_id: string;
    responsibility: string | null;
  };

/** Vínculo do entrevistado com o território de referência (Tijolo 039). */
export type RespondentTerritoryRelation =
  | "mora"
  | "trabalha_estuda"
  | "circula"
  | "fala_sobre"
  | "nao_informado";

export type ListeningRecord = TimestampedRow &
  CreatedByRow & {
    id: string;
    action_id: string | null;
    neighborhood_id: string | null;
    date: string;
    source_type: SourceType;
    interviewer_name: string;
    approximate_age_range: string | null;
    free_speech_text: string;
    team_summary: string | null;
    words_used: string | null;
    places_mentioned_text: string | null;
    priority_mentioned: string | null;
    unexpected_notes: string | null;
    review_status: ReviewStatus;
    territorial_review_status: TerritorialReviewStatus;
    territorial_review_notes: string | null;
    /** Município de referência do entrevistado (Tijolo 039). Não armazena endereço. */
    respondent_city: string | null;
    /** Bairro oficial de referência do entrevistado (Tijolo 039). FK → neighborhoods. */
    respondent_neighborhood_id: string | null;
    /** Vínculo do entrevistado com o território de referência (Tijolo 039). */
    respondent_territory_relation: RespondentTerritoryRelation | null;
    /** Ocupação/atividade principal informada de forma agregada (Tijolo 041). */
    respondent_occupation: string | null;
    /** Entrevistador padronizado por membro da equipe (Tijolo 042). */
    interviewer_team_member_id: string | null;
  };

export type Theme = TimestampedRow &
  CreatedByRow & {
    id: string;
    name: string;
    description: string | null;
    is_active: boolean;
  };

export type ListeningRecordTheme = TimestampedRow &
  CreatedByRow & {
    id: string;
    listening_record_id: string;
    theme_id: string;
    notes: string | null;
  };

export type ListeningRecordMentionedNeighborhood = TimestampedRow &
  CreatedByRow & {
    id: string;
    listening_record_id: string;
    neighborhood_id: string;
  };

export type ListeningRecordPublicQuote = TimestampedRow &
  CreatedByRow & {
    id: string;
    listening_record_id: string;
    action_id: string;
    quote_text: string;
    sanitized_text: string | null;
    theme_label: string | null;
    context_note: string | null;
    status: PublicQuoteStatus;
    sensitive_risk: boolean;
    risk_notes: string | null;
    reviewed_by: string | null;
    reviewed_at: string | null;
    approved_by: string | null;
    approved_at: string | null;
    public_approval_reason: string | null;
    rejection_reason: string | null;
    archive_reason: string | null;
    last_edit_reason: string | null;
  };

export type ListeningRecordPublicQuoteAudit = {
  id: string;
  quote_id: string;
  listening_record_id: string | null;
  action_id: string | null;
  event_type: PublicQuoteAuditEventType;
  old_status: string | null;
  new_status: string | null;
  old_sanitized_text: string | null;
  new_sanitized_text: string | null;
  old_quote_text: string | null;
  new_quote_text: string | null;
  risk_report: Json;
  reason: string | null;
  changed_by: string | null;
  changed_at: string;
};

export type PlaceMentioned = TimestampedRow &
  CreatedByRow & {
    id: string;
    listening_record_id: string;
    neighborhood_id: string | null;
    normalized_place_id: string | null;
    place_name: string;
    place_type: string | null;
    notes: string | null;
  };

export type NormalizedPlace = TimestampedRow &
  CreatedByRow & {
    id: string;
    neighborhood_id: string | null;
    normalized_name: string;
    place_type: string;
    visibility: NormalizedPlaceVisibility;
    notes: string | null;
  };

export type MonthlyReport = TimestampedRow &
  CreatedByRow & {
    id: string;
    reference_month: string;
    title: string;
    free_speech_highlights: string | null;
    team_analysis: string | null;
    recurring_themes: string | null;
    territorial_notes: string | null;
    review_status: ReviewStatus;
  };

export type ActionDebrief = TimestampedRow &
  CreatedByRow & {
    id: string;
    action_id: string;
    title: string;
    public_summary: string;
    methodology_note: string;
    key_findings: string;
    next_steps: string;
    generated_markdown: string;
    team_review_text: string;
    status: DebriefStatus;
    totals_snapshot: Json;
    approved_by: string | null;
    approved_at: string | null;
  };

export type ActionClosure = TimestampedRow &
  CreatedByRow & {
    id: string;
    action_id: string;
    status: ClosureStatus;
    coordination_sufficiency: boolean;
    sufficiency_reason: string | null;
    documentation_checklist: Json;
    evidence_notes: string | null;
    internal_notes: string | null;
    closed_by: string | null;
    closed_at: string | null;
    reopened_by: string | null;
    reopened_at: string | null;
  };

export type InternalMapHomologation = TimestampedRow &
  CreatedByRow & {
    id: string;
    status: InternalMapHomologationStatus;
    decision: InternalMapHomologationDecision;
    decision_reason: string;
    rls_validated: boolean;
    admin_tested: boolean;
    coordenacao_tested: boolean;
    equipe_tested: boolean;
    anon_blocked: boolean;
    service_role_absent_frontend: boolean;
    privacy_checked: boolean;
    no_geocoding_confirmed: boolean;
    reviewed_records_count: number;
    territories_count: number;
    ready_territories_count: number;
    blocked_territories_count: number;
    sensitive_pending_count: number;
    duplicate_warnings_count: number;
    safe_normalized_places_count: number;
    snapshot: Json;
    approved_by: string | null;
    approved_at: string | null;
    rejected_by: string | null;
    rejected_at: string | null;
  };

export type PublicTransparencySnapshot = TimestampedRow &
  CreatedByRow & {
    id: string;
    title: string;
    period_start: string | null;
    period_end: string | null;
    status: PublicTransparencySnapshotStatus;
    public_summary: string | null;
    generated_summary: string | null;
    edited_summary: string | null;
    methodology_notes: string | null;
    opening_text: string | null;
    listening_text: string | null;
    limits_text: string | null;
    next_steps_text: string | null;
    current_risk_report: Json;
    totals: Json;
    territory_summary: Json;
    theme_summary: Json;
    word_summary: Json;
    action_timeline: Json;
    debrief_links: Json;
    review_checklist: Json;
    privacy_notes: string | null;
    approved_by: string | null;
    approved_at: string | null;
    published_at: string | null;
    territorial_risk_override: boolean;
    territorial_risk_override_reason: string | null;
    territorial_risk_override_by: string | null;
    territorial_risk_override_at: string | null;
    last_reviewed_by: string | null;
    last_reviewed_at: string | null;
    last_edited_by: string | null;
    last_edited_at: string | null;
    source_type: string | null;
    source_filters: Json;
    source_generated_at: string | null;
  };

export type PublicTransparencySnapshotVersion = {
  id: string;
  snapshot_id: string;
  version_number: number;
  status_at_time: string | null;
  title: string | null;
  public_summary: string | null;
  edited_summary: string | null;
  privacy_notes: string | null;
  totals: Json;
  territory_summary: Json;
  theme_summary: Json;
  word_summary: Json;
  action_timeline: Json;
  review_checklist: Json;
  risk_report: Json;
  change_reason: string | null;
  created_by: string | null;
  created_at: string;
};

export type PublicTransparencySnapshotReviewComment = {
  id: string;
  snapshot_id: string;
  author_id: string | null;
  comment: string;
  comment_type: SnapshotReviewCommentType;
  resolved: boolean;
  resolved_by: string | null;
  resolved_at: string | null;
  created_at: string;
};

export type PublicTransparencyHomologationPackage = TimestampedRow &
  CreatedByRow & {
    id: string;
    snapshot_id: string;
    snapshot_version_id: string | null;
    package_code: string;
    status: TransparencyHomologationPackageStatus;
    title: string;
    period_start: string | null;
    period_end: string | null;
    institutional_summary: string | null;
    methodology_note: string | null;
    privacy_statement: string | null;
    approval_checklist: Json;
    risk_report: Json;
    audit_export: string | null;
    frozen_payload: Json;
    decision: TransparencyHomologationDecision | null;
    decision_reason: string | null;
    prepared_by: string | null;
    prepared_at: string | null;
    signed_by: string | null;
    signed_at: string | null;
    territorial_risk_acknowledged: boolean;
    territorial_risk_justification: string | null;
    territorial_risk_acknowledged_by: string | null;
    territorial_risk_acknowledged_at: string | null;
    rejected_by: string | null;
    rejected_at: string | null;
  };

export type WeeklyTeamReport = TimestampedRow &
  CreatedByRow & {
    id: string;
    week_start: string;
    week_end: string;
    team_member_id: string;
    profile_id: string | null;
    title: string;
    summary: string | null;
    activities_done: string | null;
    territories_involved: string | null;
    problems_found: string | null;
    learnings: string | null;
    pending_items: string | null;
    next_steps: string | null;
    status: WeeklyTeamReportStatus;
    team_calendar_event_id: string | null;
    review_notes: string | null;
    reviewed_by: string | null;
    reviewed_at: string | null;
    import_source: "manual" | "uploaded_doc" | "uploaded_pdf" | null;
    imported_attachment_id: string | null;
    imported_raw_text: string | null;
    import_status: "manual" | "pending_extraction" | "extracted_draft" | "needs_review" | "extraction_failed" | "approved" | null;
    extraction_quality: "high" | "medium" | "low" | "fail" | null;
  };

export type InAppNotification = {
  id: string;
  profile_id: string | null;
  team_member_id: string | null;
  audience_role: "equipe" | "coordenacao" | "admin" | null;
  title: string;
  body: string | null;
  notification_type: InAppNotificationType;
  priority: InAppNotificationPriority;
  status: InAppNotificationStatus;
  source_type: string | null;
  source_id: string | null;
  action_url: string | null;
  due_at: string | null;
  created_by: string | null;
  created_at: string;
  read_at: string | null;
  dismissed_at: string | null;
  resolved_at: string | null;
  resolution_reason: string | null;
  resolution_source: string | null;
  auto_resolution_suggested: boolean;
};

export type NotificationPreference = TimestampedRow & {
  id: string;
  profile_id: string;
  agenda_reminders: boolean;
  google_calendar_alerts: boolean;
  weekly_report_alerts: boolean;
  debrief_dossier_alerts: boolean;
  listening_review_alerts: boolean;
  transparency_alerts: boolean;
  memory_alerts: boolean;
  quiet_mode: boolean;
};

export type WeeklyTeamReportAction = TimestampedRow &
  CreatedByRow & {
    id: string;
    report_id: string;
    action_id: string;
  };

export type WeeklyTeamReportNeighborhood = TimestampedRow &
  CreatedByRow & {
    id: string;
    report_id: string;
    neighborhood_id: string;
  };

export type WeeklyTeamReportAttachment = TimestampedRow & {
  id: string;
  report_id: string;
  storage_path: string;
  file_name: string;
  file_type: string | null;
  file_size: number | null;
  uploaded_by: string | null;
  uploaded_at: string;
  extraction_status: "pending" | "extracted" | "failed" | "unsupported" | "needs_manual_transcription" | null;
  extracted_text: string | null;
  extraction_error: string | null;
  extracted_at: string | null;
  extraction_quality: "high" | "medium" | "low" | "fail" | null;
  sections_detected_count: number | null;
};

export type WeeklyReportImportReview = TimestampedRow & {
  id: string;
  report_id: string;
  attachment_id: string;
  reviewer_id: string | null;
  file_format: string | null;
  used_standard_template: boolean;
  extraction_quality: "high" | "medium" | "low" | "fail" | null;
  sections_detected: number;
  privacy_alerts_count: number;
  manual_corrections_needed: string | null;
  review_time_minutes: number | null;
  decision: "aprovado" | "precisa_ajuste" | "transcricao_manual" | "rejeitado" | null;
  feedback_category: string | null;
  notes: string | null;
};

export type ProjectMemoryEntry = TimestampedRow &
  CreatedByRow & {
    id: string;
    source_report_id: string | null;
    action_id: string | null;
    entry_date: string;
    title: string;
    body: string;
    memory_type: ProjectMemoryType;
    visibility: ProjectMemoryVisibility;
    team_calendar_event_id: string | null;
    review_checklist: Json;
    reviewed_by: string | null;
    reviewed_at: string | null;
  };

export type TeamCalendarEvent = TimestampedRow &
  CreatedByRow & {
    id: string;
    title: string;
    description: string | null;
    event_type: TeamCalendarEventType;
    starts_at: string;
    ends_at: string | null;
    all_day: boolean;
    status: TeamCalendarEventStatus;
    action_id: string | null;
    neighborhood_id: string | null;
    google_calendar_event_id: string | null;
    google_calendar_id: string | null;
    google_send_invites: boolean;
    google_sync_status: GoogleCalendarSyncStatus | null;
    google_synced_at: string | null;
  };

export type GoogleCalendarSyncLog = {
  id: string;
  event_id: string;
  action: GoogleCalendarSyncAction;
  google_calendar_id: string | null;
  google_calendar_event_id: string | null;
  status: GoogleCalendarSyncLogStatus;
  message: string | null;
  payload_summary: Json | null;
  synced_by: string | null;
  synced_at: string;
};

export type GoogleCalendarUserConnection = {
  id: string;
  profile_id: string;
  provider: GoogleCalendarConnectionProvider;
  provider_user_email: string | null;
  provider_user_id: string | null;
  access_token: string | null;
  refresh_token: string | null;
  access_token_expires_at: string | null;
  scopes: string | null;
  created_at: string;
  updated_at: string;
};

export type TeamCalendarEventMember = TimestampedRow & {
  id: string;
  event_id: string;
  team_member_id: string;
  responsibility: string | null;
  attendance_status: TeamCalendarAttendanceStatus;
  created_at: string;
};

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: Profile;
        Insert: Omit<Profile, "created_at" | "updated_at" | "role"> & Partial<Pick<Profile, "role">>;
        Update: Partial<Omit<Profile, "id" | "created_at" | "updated_at">>;
        Relationships: [];
      };
      neighborhoods: {
        Row: Neighborhood;
        Insert: Omit<Neighborhood, "id" | "created_at" | "updated_at" | "official_code" | "sector" | "region" | "aliases" | "status"> & {
          id?: string;
          official_code?: number | null;
          sector?: NeighborhoodSector | null;
          region?: string | null;
          aliases?: string | null;
          status?: NeighborhoodStatus | null;
        };
        Update: Partial<Omit<Neighborhood, "id" | "created_at" | "updated_at">>;
        Relationships: [];
      };
      actions: {
        Row: Action;
        Insert: Omit<Action, "id" | "created_at" | "updated_at" | "action_type" | "status" | "starts_at" | "ends_at" | "all_day"> & {
          id?: string;
          action_type?: ActionType;
          status?: ActionStatus;
          starts_at?: string | null;
          ends_at?: string | null;
          all_day?: boolean;
        };
        Update: Partial<Omit<Action, "id" | "created_at" | "updated_at">>;
        Relationships: [
          {
            foreignKeyName: "actions_neighborhood_id_fkey";
            columns: ["neighborhood_id"];
            referencedRelation: "neighborhoods";
            referencedColumns: ["id"];
          }
        ];
      };
      team_members: {
        Row: TeamMember;
        Insert: Omit<TeamMember, "id" | "created_at" | "updated_at" | "active" | "can_interview" | "can_join_actions"> & {
          id?: string;
          active?: boolean;
          can_interview?: boolean;
          can_join_actions?: boolean;
        };
        Update: Partial<Omit<TeamMember, "id" | "created_at" | "updated_at">>;
        Relationships: [
          {
            foreignKeyName: "team_members_profile_id_fkey";
            columns: ["profile_id"];
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          }
        ];
      };
      action_team_members: {
        Row: ActionTeamMember;
        Insert: Omit<ActionTeamMember, "id" | "created_at" | "updated_at"> & { id?: string };
        Update: Partial<Omit<ActionTeamMember, "id" | "created_at" | "updated_at">>;
        Relationships: [
          {
            foreignKeyName: "action_team_members_action_id_fkey";
            columns: ["action_id"];
            referencedRelation: "actions";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "action_team_members_team_member_id_fkey";
            columns: ["team_member_id"];
            referencedRelation: "team_members";
            referencedColumns: ["id"];
          }
        ];
      };
      weekly_team_reports: {
        Row: WeeklyTeamReport;
        Insert: Omit<WeeklyTeamReport, "id" | "created_at" | "updated_at" | "status" | "reviewed_by" | "reviewed_at" | "team_calendar_event_id" | "import_source" | "imported_attachment_id" | "imported_raw_text" | "import_status" | "extraction_quality"> & {
          id?: string;
          status?: WeeklyTeamReportStatus;
          team_calendar_event_id?: string | null;
          reviewed_by?: string | null;
          reviewed_at?: string | null;
          import_source?: "manual" | "uploaded_doc" | "uploaded_pdf" | null;
          imported_attachment_id?: string | null;
          imported_raw_text?: string | null;
          import_status?: "manual" | "pending_extraction" | "extracted_draft" | "needs_review" | "extraction_failed" | "approved" | null;
          extraction_quality?: "high" | "medium" | "low" | "fail" | null;
        };
        Update: Partial<Omit<WeeklyTeamReport, "id" | "created_at" | "updated_at">>;
        Relationships: [
          {
            foreignKeyName: "weekly_team_reports_profile_id_fkey";
            columns: ["profile_id"];
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "weekly_team_reports_reviewed_by_fkey";
            columns: ["reviewed_by"];
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "weekly_team_reports_team_member_id_fkey";
            columns: ["team_member_id"];
            referencedRelation: "team_members";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "weekly_team_reports_team_calendar_event_id_fkey";
            columns: ["team_calendar_event_id"];
            referencedRelation: "team_calendar_events";
            referencedColumns: ["id"];
          }
        ];
      };
      weekly_report_import_reviews: {
        Row: WeeklyReportImportReview;
        Insert: Omit<WeeklyReportImportReview, "id" | "created_at" | "updated_at"> & { id?: string; created_at?: string; updated_at?: string };
        Update: Partial<Omit<WeeklyReportImportReview, "id" | "created_at" | "updated_at">>;
        Relationships: [
          {
            foreignKeyName: "weekly_report_import_reviews_report_id_fkey";
            columns: ["report_id"];
            referencedRelation: "weekly_team_reports";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "weekly_report_import_reviews_attachment_id_fkey";
            columns: ["attachment_id"];
            referencedRelation: "weekly_team_report_attachments";
            referencedColumns: ["id"];
          }
        ];
      };
      weekly_team_report_actions: {
        Row: WeeklyTeamReportAction;
        Insert: Omit<WeeklyTeamReportAction, "id" | "created_at" | "updated_at"> & { id?: string };
        Update: Partial<Omit<WeeklyTeamReportAction, "id" | "created_at" | "updated_at">>;
        Relationships: [
          {
            foreignKeyName: "weekly_team_report_actions_action_id_fkey";
            columns: ["action_id"];
            referencedRelation: "actions";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "weekly_team_report_actions_report_id_fkey";
            columns: ["report_id"];
            referencedRelation: "weekly_team_reports";
            referencedColumns: ["id"];
          }
        ];
      };
      weekly_team_report_neighborhoods: {
        Row: WeeklyTeamReportNeighborhood;
        Insert: Omit<WeeklyTeamReportNeighborhood, "id" | "created_at" | "updated_at"> & { id?: string };
        Update: Partial<Omit<WeeklyTeamReportNeighborhood, "id" | "created_at" | "updated_at">>;
        Relationships: [
          {
            foreignKeyName: "weekly_team_report_neighborhoods_neighborhood_id_fkey";
            columns: ["neighborhood_id"];
            referencedRelation: "neighborhoods";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "weekly_team_report_neighborhoods_report_id_fkey";
            columns: ["report_id"];
            referencedRelation: "weekly_team_reports";
            referencedColumns: ["id"];
          }
        ];
      };
      weekly_team_report_attachments: {
        Row: WeeklyTeamReportAttachment;
        Insert: Omit<WeeklyTeamReportAttachment, "id" | "created_at" | "updated_at" | "uploaded_at" | "extraction_status" | "extracted_text" | "extraction_error" | "extracted_at" | "extraction_quality" | "sections_detected_count"> & {
          id?: string;
          uploaded_at?: string;
          extraction_status?: "pending" | "extracted" | "failed" | "unsupported" | "needs_manual_transcription" | null;
          extracted_text?: string | null;
          extraction_error?: string | null;
          extracted_at?: string | null;
          extraction_quality?: "high" | "medium" | "low" | "fail" | null;
          sections_detected_count?: number | null;
        };
        Update: Partial<Omit<WeeklyTeamReportAttachment, "id" | "created_at" | "updated_at">>;
        Relationships: [
          {
            foreignKeyName: "weekly_team_report_attachments_report_id_fkey";
            columns: ["report_id"];
            referencedRelation: "weekly_team_reports";
            referencedColumns: ["id"];
          }
        ];
      };
      project_memory_entries: {
        Row: ProjectMemoryEntry;
        Insert: Omit<ProjectMemoryEntry, "id" | "created_at" | "updated_at" | "visibility" | "review_checklist" | "reviewed_by" | "reviewed_at" | "team_calendar_event_id"> & {
          id?: string;
          visibility?: ProjectMemoryVisibility;
          team_calendar_event_id?: string | null;
          review_checklist?: Json;
          reviewed_by?: string | null;
          reviewed_at?: string | null;
        };
        Update: Partial<Omit<ProjectMemoryEntry, "id" | "created_at" | "updated_at">>;
        Relationships: [
          {
            foreignKeyName: "project_memory_entries_action_id_fkey";
            columns: ["action_id"];
            referencedRelation: "actions";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "project_memory_entries_source_report_id_fkey";
            columns: ["source_report_id"];
            referencedRelation: "weekly_team_reports";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "project_memory_entries_team_calendar_event_id_fkey";
            columns: ["team_calendar_event_id"];
            referencedRelation: "team_calendar_events";
            referencedColumns: ["id"];
          }
        ];
      };
      team_calendar_events: {
        Row: TeamCalendarEvent;
        Insert: Omit<TeamCalendarEvent, "id" | "created_at" | "updated_at" | "all_day" | "status" | "google_calendar_event_id" | "google_calendar_id" | "google_send_invites" | "google_sync_status" | "google_synced_at"> & {
          id?: string;
          all_day?: boolean;
          status?: TeamCalendarEventStatus;
          google_calendar_event_id?: string | null;
          google_calendar_id?: string | null;
          google_send_invites?: boolean;
          google_sync_status?: string | null;
          google_synced_at?: string | null;
        };
        Update: Partial<Omit<TeamCalendarEvent, "id" | "created_at" | "updated_at">>;
        Relationships: [
          {
            foreignKeyName: "team_calendar_events_action_id_fkey";
            columns: ["action_id"];
            referencedRelation: "actions";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "team_calendar_events_neighborhood_id_fkey";
            columns: ["neighborhood_id"];
            referencedRelation: "neighborhoods";
            referencedColumns: ["id"];
          }
        ];
      };
      in_app_notifications: {
        Row: InAppNotification;
        Insert: Omit<InAppNotification, "id" | "created_at" | "status" | "priority" | "resolved_at" | "resolution_reason" | "resolution_source" | "auto_resolution_suggested"> & {
          id?: string;
          status?: InAppNotificationStatus;
          priority?: InAppNotificationPriority;
          resolved_at?: string | null;
          resolution_reason?: string | null;
          resolution_source?: string | null;
          auto_resolution_suggested?: boolean;
        };
        Update: Partial<Omit<InAppNotification, "id" | "created_at">>;
        Relationships: [
          {
            foreignKeyName: "in_app_notifications_profile_id_fkey";
            columns: ["profile_id"];
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "in_app_notifications_team_member_id_fkey";
            columns: ["team_member_id"];
            referencedRelation: "team_members";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "in_app_notifications_created_by_fkey";
            columns: ["created_by"];
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          }
        ];
      };
      notification_preferences: {
        Row: NotificationPreference;
        Insert: Omit<NotificationPreference, "id" | "created_at" | "updated_at"> & {
          id?: string;
        };
        Update: Partial<Omit<NotificationPreference, "id" | "created_at" | "updated_at" | "profile_id">>;
        Relationships: [
          {
            foreignKeyName: "notification_preferences_profile_id_fkey";
            columns: ["profile_id"];
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          }
        ];
      };
      google_calendar_sync_logs: {
        Row: GoogleCalendarSyncLog;
        Insert: Omit<GoogleCalendarSyncLog, "id" | "synced_at"> & {
          id?: string;
          synced_at?: string;
        };
        Update: Partial<Omit<GoogleCalendarSyncLog, "id" | "synced_at">>;
        Relationships: [
          {
            foreignKeyName: "google_calendar_sync_logs_event_id_fkey";
            columns: ["event_id"];
            referencedRelation: "team_calendar_events";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "google_calendar_sync_logs_synced_by_fkey";
            columns: ["synced_by"];
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          }
        ];
      };
      google_calendar_user_connections: {
        Row: GoogleCalendarUserConnection;
        Insert: Omit<GoogleCalendarUserConnection, "id" | "created_at" | "updated_at" | "provider"> & {
          id?: string;
          provider?: GoogleCalendarConnectionProvider;
        };
        Update: Partial<Omit<GoogleCalendarUserConnection, "id" | "created_at" | "updated_at" | "profile_id">>;
        Relationships: [
          {
            foreignKeyName: "google_calendar_user_connections_profile_id_fkey";
            columns: ["profile_id"];
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          }
        ];
      };
      team_calendar_event_members: {
        Row: TeamCalendarEventMember;
        Insert: Omit<TeamCalendarEventMember, "id" | "created_at" | "updated_at" | "attendance_status"> & {
          id?: string;
          attendance_status?: TeamCalendarAttendanceStatus;
        };
        Update: Partial<Omit<TeamCalendarEventMember, "id" | "created_at" | "updated_at">>;
        Relationships: [
          {
            foreignKeyName: "team_calendar_event_members_event_id_fkey";
            columns: ["event_id"];
            referencedRelation: "team_calendar_events";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "team_calendar_event_members_team_member_id_fkey";
            columns: ["team_member_id"];
            referencedRelation: "team_members";
            referencedColumns: ["id"];
          }
        ];
      };
      listening_records: {
        Row: ListeningRecord;
        Insert: Omit<
          ListeningRecord,
          "id" | "created_at" | "updated_at" | "source_type" | "review_status" | "territorial_review_status" | "territorial_review_notes"
        > & {
          id?: string;
          source_type?: SourceType;
          review_status?: ReviewStatus;
          territorial_review_status?: TerritorialReviewStatus;
          territorial_review_notes?: string | null;
        };
        Update: Partial<Omit<ListeningRecord, "id" | "created_at" | "updated_at">>;
        Relationships: [
          {
            foreignKeyName: "listening_records_action_id_fkey";
            columns: ["action_id"];
            referencedRelation: "actions";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "listening_records_neighborhood_id_fkey";
            columns: ["neighborhood_id"];
            referencedRelation: "neighborhoods";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "listening_records_respondent_neighborhood_id_fkey";
            columns: ["respondent_neighborhood_id"];
            referencedRelation: "neighborhoods";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "listening_records_interviewer_team_member_id_fkey";
            columns: ["interviewer_team_member_id"];
            referencedRelation: "team_members";
            referencedColumns: ["id"];
          }
        ];
      };
      themes: {
        Row: Theme;
        Insert: Omit<Theme, "id" | "created_at" | "updated_at" | "is_active"> & {
          id?: string;
          is_active?: boolean;
        };
        Update: Partial<Omit<Theme, "id" | "created_at" | "updated_at">>;
        Relationships: [];
      };
      listening_record_themes: {
        Row: ListeningRecordTheme;
        Insert: Omit<ListeningRecordTheme, "id" | "created_at" | "updated_at"> & { id?: string };
        Update: Partial<Omit<ListeningRecordTheme, "id" | "created_at" | "updated_at">>;
        Relationships: [
          {
            foreignKeyName: "listening_record_themes_listening_record_id_fkey";
            columns: ["listening_record_id"];
            referencedRelation: "listening_records";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "listening_record_themes_theme_id_fkey";
            columns: ["theme_id"];
            referencedRelation: "themes";
            referencedColumns: ["id"];
          }
        ];
      };
      listening_record_mentioned_neighborhoods: {
        Row: ListeningRecordMentionedNeighborhood;
        Insert: Omit<ListeningRecordMentionedNeighborhood, "id" | "created_at" | "updated_at"> & { id?: string };
        Update: Partial<Omit<ListeningRecordMentionedNeighborhood, "id" | "created_at" | "updated_at">>;
        Relationships: [
          {
            foreignKeyName: "listening_record_mentioned_neighborhoods_listening_record_id_fkey";
            columns: ["listening_record_id"];
            referencedRelation: "listening_records";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "listening_record_mentioned_neighborhoods_neighborhood_id_fkey";
            columns: ["neighborhood_id"];
            referencedRelation: "neighborhoods";
            referencedColumns: ["id"];
          }
        ];
      };
      listening_record_public_quotes: {
        Row: ListeningRecordPublicQuote;
        Insert: Omit<
          ListeningRecordPublicQuote,
          "id" | "created_at" | "updated_at" | "status" | "sensitive_risk" | "reviewed_by" | "reviewed_at" | "approved_by" | "approved_at"
        > & {
          id?: string;
          status?: PublicQuoteStatus;
          sensitive_risk?: boolean;
          reviewed_by?: string | null;
          reviewed_at?: string | null;
          approved_by?: string | null;
          approved_at?: string | null;
        };
        Update: Partial<Omit<ListeningRecordPublicQuote, "id" | "created_at" | "updated_at">>;
        Relationships: [
          {
            foreignKeyName: "listening_record_public_quotes_action_id_fkey";
            columns: ["action_id"];
            referencedRelation: "actions";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "listening_record_public_quotes_listening_record_id_fkey";
            columns: ["listening_record_id"];
            referencedRelation: "listening_records";
            referencedColumns: ["id"];
          }
        ];
      };
      listening_record_public_quote_audits: {
        Row: ListeningRecordPublicQuoteAudit;
        Insert: Omit<ListeningRecordPublicQuoteAudit, "id" | "changed_at"> & {
          id?: string;
          changed_at?: string;
        };
        Update: never;
        Relationships: [
          {
            foreignKeyName: "listening_record_public_quote_audits_quote_id_fkey";
            columns: ["quote_id"];
            referencedRelation: "listening_record_public_quotes";
            referencedColumns: ["id"];
          }
        ];
      };
      places_mentioned: {
        Row: PlaceMentioned;
        Insert: Omit<PlaceMentioned, "id" | "created_at" | "updated_at" | "normalized_place_id"> & {
          id?: string;
          normalized_place_id?: string | null;
        };
        Update: Partial<Omit<PlaceMentioned, "id" | "created_at" | "updated_at">>;
        Relationships: [
          {
            foreignKeyName: "places_mentioned_listening_record_id_fkey";
            columns: ["listening_record_id"];
            referencedRelation: "listening_records";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "places_mentioned_neighborhood_id_fkey";
            columns: ["neighborhood_id"];
            referencedRelation: "neighborhoods";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "places_mentioned_normalized_place_id_fkey";
            columns: ["normalized_place_id"];
            referencedRelation: "normalized_places";
            referencedColumns: ["id"];
          }
        ];
      };
      normalized_places: {
        Row: NormalizedPlace;
        Insert: Omit<NormalizedPlace, "id" | "created_at" | "updated_at" | "visibility"> & {
          id?: string;
          visibility?: NormalizedPlaceVisibility;
        };
        Update: Partial<Omit<NormalizedPlace, "id" | "created_at" | "updated_at">>;
        Relationships: [
          {
            foreignKeyName: "normalized_places_neighborhood_id_fkey";
            columns: ["neighborhood_id"];
            referencedRelation: "neighborhoods";
            referencedColumns: ["id"];
          }
        ];
      };
      monthly_reports: {
        Row: MonthlyReport;
        Insert: Omit<MonthlyReport, "id" | "created_at" | "updated_at" | "review_status"> & {
          id?: string;
          review_status?: ReviewStatus;
        };
        Update: Partial<Omit<MonthlyReport, "id" | "created_at" | "updated_at">>;
        Relationships: [];
      };
      action_debriefs: {
        Row: ActionDebrief;
        Insert: Omit<ActionDebrief, "id" | "created_at" | "updated_at" | "status" | "totals_snapshot"> & {
          id?: string;
          status?: DebriefStatus;
          totals_snapshot?: Json;
        };
        Update: Partial<Omit<ActionDebrief, "id" | "created_at" | "updated_at">>;
        Relationships: [
          {
            foreignKeyName: "action_debriefs_action_id_fkey";
            columns: ["action_id"];
            referencedRelation: "actions";
            referencedColumns: ["id"];
          }
        ];
      };
      action_closures: {
        Row: ActionClosure;
        Insert: Partial<Omit<ActionClosure, "id" | "created_at" | "updated_at">> & {
          id?: string;
          action_id: string;
        };
        Update: Partial<Omit<ActionClosure, "id" | "created_at" | "updated_at">>;
        Relationships: [
          {
            foreignKeyName: "action_closures_action_id_fkey";
            columns: ["action_id"];
            referencedRelation: "actions";
            referencedColumns: ["id"];
          }
        ];
      };
      internal_map_homologations: {
        Row: InternalMapHomologation;
        Insert: Partial<Omit<
          InternalMapHomologation,
          "id" | "created_at" | "updated_at" | "status" | "decision" | "snapshot"
        >> & {
          id?: string;
          decision_reason: string;
          created_by: string | null;
          status?: InternalMapHomologationStatus;
          decision?: InternalMapHomologationDecision;
          snapshot?: Json;
        };
        Update: Partial<Omit<InternalMapHomologation, "id" | "created_at" | "updated_at">>;
        Relationships: [
          {
            foreignKeyName: "internal_map_homologations_approved_by_fkey";
            columns: ["approved_by"];
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "internal_map_homologations_rejected_by_fkey";
            columns: ["rejected_by"];
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          }
        ];
      };
      public_transparency_snapshots: {
        Row: PublicTransparencySnapshot;
        Insert: Partial<Omit<PublicTransparencySnapshot, "created_at" | "updated_at">> & {
          title: string;
          id?: string;
          status?: PublicTransparencySnapshotStatus;
          totals?: Json;
          territory_summary?: Json;
          theme_summary?: Json;
          word_summary?: Json;
          action_timeline?: Json;
          debrief_links?: Json;
          review_checklist?: Json;
        };
        Update: Partial<Omit<PublicTransparencySnapshot, "id" | "created_at" | "updated_at">>;
        Relationships: [
          {
            foreignKeyName: "public_transparency_snapshots_approved_by_fkey";
            columns: ["approved_by"];
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "public_transparency_snapshots_territorial_risk_override_by_fkey";
            columns: ["territorial_risk_override_by"];
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "public_transparency_snapshots_last_reviewed_by_fkey";
            columns: ["last_reviewed_by"];
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "public_transparency_snapshots_last_edited_by_fkey";
            columns: ["last_edited_by"];
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          }
        ];
      };
      public_transparency_snapshot_versions: {
        Row: PublicTransparencySnapshotVersion;
        Insert: Partial<Omit<PublicTransparencySnapshotVersion, "created_at">> & {
          snapshot_id: string;
          version_number: number;
        };
        Update: Partial<Omit<PublicTransparencySnapshotVersion, "id" | "created_at">>;
        Relationships: [
          {
            foreignKeyName: "public_transparency_snapshot_versions_snapshot_id_fkey";
            columns: ["snapshot_id"];
            referencedRelation: "public_transparency_snapshots";
            referencedColumns: ["id"];
          }
        ];
      };
      public_transparency_snapshot_review_comments: {
        Row: PublicTransparencySnapshotReviewComment;
        Insert: Partial<Omit<PublicTransparencySnapshotReviewComment, "created_at" | "resolved" | "resolved_by" | "resolved_at">> & {
          snapshot_id: string;
          comment: string;
          comment_type: SnapshotReviewCommentType;
        };
        Update: Partial<Omit<PublicTransparencySnapshotReviewComment, "id" | "created_at">>;
        Relationships: [
          {
            foreignKeyName: "public_transparency_snapshot_review_comments_snapshot_id_fkey";
            columns: ["snapshot_id"];
            referencedRelation: "public_transparency_snapshots";
            referencedColumns: ["id"];
          }
        ];
      };
      public_transparency_homologation_packages: {
        Row: PublicTransparencyHomologationPackage;
        Insert: Partial<Omit<PublicTransparencyHomologationPackage, "created_at" | "updated_at">> & {
          snapshot_id: string;
          package_code: string;
          title: string;
        };
        Update: Partial<Omit<PublicTransparencyHomologationPackage, "id" | "created_at" | "updated_at">>;
        Relationships: [
          {
            foreignKeyName: "public_transparency_homologation_packages_snapshot_id_fkey";
            columns: ["snapshot_id"];
            referencedRelation: "public_transparency_snapshots";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "public_transparency_homologation_packages_territorial_risk_acknowledged_by_fkey";
            columns: ["territorial_risk_acknowledged_by"];
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "public_transparency_homologation_packages_snapshot_version_id_fkey";
            columns: ["snapshot_version_id"];
            referencedRelation: "public_transparency_snapshot_versions";
            referencedColumns: ["id"];
          }
        ];
      };
      user_onboarding_state: {
        Row: {
          id: string;
          profile_id: string;
          seen_welcome: boolean;
          opened_agenda: boolean;
          opened_listening_help: boolean;
          opened_notifications: boolean;
          completed_privacy_ack: boolean;
          dismissed_onboarding: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          profile_id: string;
          seen_welcome?: boolean;
          opened_agenda?: boolean;
          opened_listening_help?: boolean;
          opened_notifications?: boolean;
          completed_privacy_ack?: boolean;
          dismissed_onboarding?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          profile_id?: string;
          seen_welcome?: boolean;
          opened_agenda?: boolean;
          opened_listening_help?: boolean;
          opened_notifications?: boolean;
          completed_privacy_ack?: boolean;
          dismissed_onboarding?: boolean;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "user_onboarding_state_profile_id_fkey";
            columns: ["profile_id"];
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          }
        ];
      };
    };
    Views: Record<string, never>;
    Functions: {
      create_public_transparency_snapshot_version: {
        Args: {
          p_snapshot_id: string;
          p_reason?: string | null;
        };
        Returns: string;
      };
    };
    Enums: {
      source_type: SourceType;
      review_status: ReviewStatus;
      action_type: ActionType;
      action_status: ActionStatus;
    };
    CompositeTypes: Record<string, never>;
  };
};
