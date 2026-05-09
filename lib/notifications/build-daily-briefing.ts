import type { InAppNotification, NotificationPreference } from "@/lib/database.types";

export type DailyBriefing = {
  total_unread: number;
  total_urgent: number;
  due_today: number;
  overdue: number;
  coordination_pending: number;
  fieldwork_pending: number;
  transparency_pending: number;
  memory_pending: number;
  google_calendar_errors: number;
  recommended_next_action: string;
  sections: {
    hoje: GroupedNotification[];
    urgente: GroupedNotification[];
    esta_semana: GroupedNotification[];
    coordenacao: GroupedNotification[];
    equipe: GroupedNotification[];
  };
};

export type GroupedNotification = {
  id: string;
  title: string;
  count: number;
  priority: "low" | "normal" | "high" | "urgent";
  action_url: string | null;
  notification_type: string;
  items: InAppNotification[];
};

export function buildDailyBriefing(
  notifications: InAppNotification[],
  role: "equipe" | "coordenacao" | "admin",
  preferences: NotificationPreference | null
): DailyBriefing {
  const unread = notifications.filter((n) => n.status === "unread");
  
  const briefing: DailyBriefing = {
    total_unread: unread.length,
    total_urgent: unread.filter((n) => n.priority === "urgent").length,
    due_today: 0,
    overdue: 0,
    coordination_pending: 0,
    fieldwork_pending: 0,
    transparency_pending: 0,
    memory_pending: 0,
    google_calendar_errors: 0,
    recommended_next_action: "",
    sections: {
      hoje: [],
      urgente: [],
      esta_semana: [],
      coordenacao: [],
      equipe: [],
    },
  };

  const now = new Date();
  const todayStr = now.toISOString().slice(0, 10);

  // Agrupamento por tipo e prioridade para reduzir ruído
  const groups = new Map<string, InAppNotification[]>();
  for (const n of unread) {
    const key = `${n.notification_type}_${n.priority}`;
    if (!groups.has(key)) {
      groups.set(key, []);
    }
    groups.get(key)!.push(n);
  }

  const groupedNotifications: GroupedNotification[] = Array.from(groups.entries()).map(([key, items]) => {
    const first = items[0];
    const count = items.length;
    
    let title = first.title;
    if (count > 1) {
      if (first.notification_type === "listening_review_pending") {
        title = `${count} escutas aguardam revisão`;
      } else if (first.notification_type === "weekly_report_due") {
        title = `${count} relatórios semanais pendentes`;
      } else if (first.notification_type === "google_sync_error") {
        title = `${count} eventos com erro no Google Calendar`;
      } else if (first.notification_type === "dossier_pending") {
        title = `${count} dossiês abertos`;
      } else if (first.notification_type === "debrief_pending") {
        title = `${count} devolutivas pendentes`;
      } else {
        title = `${count} avisos de: ${first.title}`;
      }
    }

    return {
      id: key,
      title,
      count,
      priority: first.priority,
      action_url: first.action_url,
      notification_type: first.notification_type,
      items,
    };
  });

  // Distribuir nos baldes do briefing
  for (const gn of groupedNotifications) {
    const first = gn.items[0];

    // Métricas
    if (gn.priority === "urgent") briefing.total_urgent += 0; // Já contado acima individualmente
    if (first.due_at?.startsWith(todayStr)) briefing.due_today += gn.count;
    if (first.priority === "urgent") briefing.total_urgent; // redundant
    
    if (first.notification_type === "google_sync_error") briefing.google_calendar_errors += gn.count;
    if (first.notification_type === "listening_review_pending") briefing.fieldwork_pending += gn.count;
    if (first.notification_type === "transparency_review_pending") briefing.transparency_pending += gn.count;
    if (first.notification_type === "memory_review_pending") briefing.memory_pending += gn.count;
    if (first.audience_role === "coordenacao" || first.audience_role === "admin") briefing.coordination_pending += gn.count;

    // Seções
    if (gn.priority === "urgent") {
      briefing.sections.urgente.push(gn);
    } else if (first.notification_type === "agenda_event_today") {
      briefing.sections.hoje.push(gn);
    } else if (first.notification_type === "agenda_event_tomorrow" || gn.priority === "normal") {
      briefing.sections.esta_semana.push(gn);
    }

    if (first.audience_role === "coordenacao" || first.audience_role === "admin") {
      briefing.sections.coordenacao.push(gn);
    } else if (role === "equipe" || first.notification_type.includes("field") || first.notification_type.includes("listening")) {
      briefing.sections.equipe.push(gn);
    }
  }

  // Atrasados (Overdue)
  briefing.overdue = unread.filter(n => n.notification_type === "agenda_event_overdue" || (n.due_at && new Date(n.due_at) < now && n.priority === "urgent")).length;

  // Próxima ação recomendada (Texto determinístico)
  if (briefing.total_urgent > 0) {
    const urgentTypes = Array.from(new Set(unread.filter(n => n.priority === "urgent").map(n => n.title.toLowerCase())));
    briefing.recommended_next_action = `Você tem ${briefing.total_urgent} pendência(s) urgente(s): ${urgentTypes.join(", ")}.`;
  } else if (briefing.due_today > 0) {
    briefing.recommended_next_action = `Hoje há ${briefing.due_today} item(ns) na agenda aguardando atenção.`;
  } else {
    briefing.recommended_next_action = "Tudo em ordem por enquanto. Bom trabalho!";
  }

  return briefing;
}
