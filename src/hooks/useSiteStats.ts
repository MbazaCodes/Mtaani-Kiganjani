import { useEffect, useState, useRef } from "react";
import { supabase } from "@/lib/supabase";

/**
 * useOnlineCount — live count of people currently using the app, via Supabase
 * Realtime Presence. Works for anonymous visitors too (landing page) and
 * signed-in users. Everyone joins a shared "online-users" channel; the count
 * is the number of tracked presences.
 */
export function useOnlineCount(): number {
  const [count, setCount] = useState(0);
  const idRef = useRef<string>(`${Date.now()}-${Math.random().toString(36).slice(2, 9)}`);

  useEffect(() => {
    const channel = supabase.channel("online-users", {
      config: { presence: { key: idRef.current } },
    });

    channel
      .on("presence", { event: "sync" }, () => {
        const state = channel.presenceState();
        setCount(Object.keys(state).length);
      })
      .subscribe(async (status: string) => {
        if (status === "SUBSCRIBED") {
          await channel.track({ online_at: new Date().toISOString() });
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return count;
}

/**
 * useSiteVisits — total cumulative site visits. Increments once per browser
 * session (sessionStorage guard) and returns the running total.
 */
export function useSiteVisits(): number | null {
  const [total, setTotal] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      try {
        const alreadyCounted =
          typeof window !== "undefined" &&
          window.sessionStorage.getItem("emtaa_visit_counted") === "1";

        if (!alreadyCounted) {
          // Atomic increment via RPC; returns the new total
          const { data, error } = await supabase.rpc("increment_site_visits");
          if (!error && typeof data === "number") {
            if (typeof window !== "undefined")
              window.sessionStorage.setItem("emtaa_visit_counted", "1");
            if (!cancelled) setTotal(data);
            return;
          }
        }

        // Otherwise just read the current total
        const { data: row } = await supabase
          .from("site_stats")
          .select("total_visits")
          .eq("id", "global")
          .maybeSingle();
        if (!cancelled && row) setTotal(Number(row.total_visits));
      } catch {
        // Stats are non-critical; leave as null if unavailable
      }
    };

    run();
    return () => {
      cancelled = true;
    };
  }, []);

  return total;
}
