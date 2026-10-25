import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

export type Announcement = Database["public"]["Tables"]["announcements"]["Row"];

export function useAnnouncements(onNew?: (a: Announcement) => void) {
  const [items, setItems] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    try {
      const { data } = await supabase
        .from("announcements")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(50);
      setItems(data ?? []);
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    try {
      const channel = supabase
        .channel(`announcements-live-${crypto.randomUUID()}`)
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "announcements" },
          (payload) => {
            if (payload.eventType === "INSERT") {
              const row = payload.new as Announcement;
              setItems((prev) => [row, ...prev.filter((a) => a.id !== row.id)].slice(0, 50));
              onNew?.(row);
            } else if (payload.eventType === "DELETE") {
              const id = (payload.old as { id: string }).id;
              setItems((prev) => prev.filter((a) => a.id !== id));
            }
          },
        )
        .subscribe();
      return () => {
        try {
          supabase.removeChannel(channel);
        } catch {
          // Ignore channel cleanup errors
        }
      };
    } catch {
      // Supabase unconfigured or offline
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { items, loading, reload: load };
}
