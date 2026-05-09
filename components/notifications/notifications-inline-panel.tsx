"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import type { InAppNotification } from "@/lib/database.types";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";
import { getNotificationCategory, type NotificationCategory } from "@/lib/notifications/notification-meta";

export function NotificationsInlinePanel({
  title,
  categories,
  href,
  emptyText,
  limit = 3,
}: {
  title: string;
  categories: NotificationCategory[];
  href: string;
  emptyText: string;
  limit?: number;
}) {
  const supabase = useMemo(() => createBrowserSupabaseClient(), []);
  const [items, setItems] = useState<InAppNotification[]>([]);

  useEffect(() => {
    let ignore = false;

    async function load() {
      const result = await supabase
        ?.from("in_app_notifications")
        .select("*")
        .in("status", ["unread", "read"])
        .order("priority", { ascending: false })
        .order("created_at", { ascending: false })
        .limit(30);

      if (ignore) return;
      const all = (result?.data ?? []) as InAppNotification[];
      const filtered = all
        .filter((item) => categories.includes(getNotificationCategory(item.notification_type)))
        .slice(0, limit);
      setItems(filtered);
    }

    void load();

    return () => {
      ignore = true;
    };
  }, [categories, limit, supabase]);

  return (
    <section className="rounded-[2rem] border border-white/80 bg-white p-5 shadow-soft">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h3 className="text-xl font-semibold text-semear-green">{title}</h3>
        <Link className="text-sm font-semibold text-semear-green hover:underline" href={href}>Ver avisos</Link>
      </div>
      <div className="space-y-2">
        {items.length === 0 ? <p className="text-sm text-stone-500">{emptyText}</p> : null}
        {items.map((item) => (
          <Link key={item.id} className="block rounded-2xl border border-semear-gray bg-semear-offwhite p-3" href={item.action_url ?? href}>
            <p className="text-sm font-semibold text-semear-green">{item.title}</p>
            {item.body ? <p className="mt-1 text-xs leading-5 text-stone-600">{item.body}</p> : null}
          </Link>
        ))}
      </div>
    </section>
  );
}
