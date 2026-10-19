"use client";
import { useEffect, useMemo, useState } from "react";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";
type Event = {
  id: string;
  actor_id: string;
  from_status: string;
  to_status: string;
  note: string | null;
  created_at: string;
};
export function WeeklyReviewHistory({
  reportId,
  updatedAt,
}: {
  reportId: string;
  updatedAt: string;
}) {
  const client = useMemo(() => createBrowserSupabaseClient(), []);
  const [events, setEvents] = useState<Event[]>([]),
    [error, setError] = useState("");
  useEffect(() => {
    let active = true;
    if (!client) return;
    void client
      .from("weekly_activity_review_history")
      .select("*")
      .eq("report_id", reportId)
      .order("created_at")
      .then((result) => {
        if (!active) return;
        if (result.error) setError(result.error.message);
        else setEvents(result.data ?? []);
      });
    return () => {
      active = false;
    };
  }, [client, reportId, updatedAt]);
  return (
    <details className="mt-4 text-sm">
      <summary>Histórico registrado da revisão semanal</summary>
      {error ? (
        <p role="alert">{error}</p>
      ) : !events.length ? (
        <p>Nenhuma transição registrada no novo fluxo.</p>
      ) : (
        <ul className="mt-3 space-y-3">
          {events.map((event) => (
            <li key={event.id}>
              <p>
                {new Date(event.created_at).toLocaleString("pt-BR")} ·{" "}
                {event.from_status} → {event.to_status} · responsável{" "}
                {event.actor_id}
              </p>
              {event.note ? (
                <p className="whitespace-pre-wrap">{event.note}</p>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </details>
  );
}
