import { useEffect, useState, useRef } from "react";
import { supabase } from "@/lib/supabase";

/**
 * useOnlineCount — DEFERRED: returns 0 initially, fetches after idle.
 * Realtime Presence via WebSocket is expensive for anonymous visitors.
 * Now uses a simple count query instead of a persistent WebSocket connection.
 */
export function useOnlineCount(): number {
  const [count, setCount] = useState(0);

  useEffect(() => {
    // PERF: Defer this non-critical stat — don't block initial paint
    const timer = setTimeout(() => {
      // Use a lightweight presence sync instead of persistent channel
      const channel = supabase.channel("online-users", {
        config: { presence: { key: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}` } },
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

      // Auto-cleanup after 60s to free the WebSocket for anonymous visitors
      const cleanupTimer = setTimeout(() => {
        supabase.removeChannel(channel);
      }, 60000);

      return () => {
        clearTimeout(cleanupTimer);
        supabase.removeChannel(channel);
      };
    }, 3000); // 3s delay — let the page render first

    return () => clearTimeout(timer);
  }, []);

  return count;
}

/**
 * useLiveAppCount — DEFERRED: real count of submitted applications from the DB.
 */
export function useLiveAppCount(): number | null {
  const [count, setCount] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    // PERF: Defer non-critical stat
    const timer = setTimeout(() => {
      supabase
        .from("applications")
        .select("*", { count: "exact", head: true })
        .then(({ count: c }) => {
          if (!cancelled && typeof c === "number") setCount(c);
        });
    }, 4000);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, []);

  return count;
}

/**
 * useSiteVisits — DEFERRED: total cumulative site visits.
 */
export function useSiteVisits(): number | null {
  const [total, setTotal] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;

    // PERF: Defer this RPC call — not critical for initial render
    const timer = setTimeout(() => {
      const run = async () => {
        try {
          const alreadyCounted =
            typeof window !== "undefined" &&
            window.sessionStorage.getItem("emtaa_visit_counted") === "1";

          if (!alreadyCounted) {
            const { data, error } = await supabase.rpc("increment_site_visits");
            if (!error && typeof data === "number") {
              if (typeof window !== "undefined")
                window.sessionStorage.setItem("emtaa_visit_counted", "1");
              if (!cancelled) setTotal(data);
              return;
            }
          }

          const { data: row } = await supabase
            .from("site_stats")
            .select("total_visits")
            .eq("id", "global")
            .maybeSingle();
          if (!cancelled && row) setTotal(Number(row.total_visits));
        } catch {
          // Stats are non-critical
        }
      };

      run();
    }, 5000); // 5s delay

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, []);

  return total;
}