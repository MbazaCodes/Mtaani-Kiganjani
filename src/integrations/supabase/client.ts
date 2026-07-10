import { createClient } from "@supabase/supabase-js";
import type { Database } from "./types";

// ── New Supabase project credentials ─────────────────────────────────────────
const DEFAULT_SUPABASE_URL = "https://apaynuwvnqnxrigluvzo.supabase.co";
const DEFAULT_SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFwYXludXd2bnFueHJpZ2x1dnpvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODM3MDY2OTMsImV4cCI6MjA5OTI4MjY5M30.EIZzCdwcOaBgV2alnizzZIZszziS8HT4KNluUow7lfY";

function createSupabaseClient() {
  const SUPABASE_URL =
    import.meta.env.VITE_SUPABASE_URL ||
    DEFAULT_SUPABASE_URL;

  const SUPABASE_KEY =
    import.meta.env.VITE_SUPABASE_ANON_KEY ||
    import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
    import.meta.env.VITE_SUPABASE_PUBLISHABLE ||
    DEFAULT_SUPABASE_ANON_KEY;

  return createClient<Database>(SUPABASE_URL, SUPABASE_KEY, {
    auth: {
      storage: typeof window !== "undefined" ? localStorage : undefined,
      persistSession: true,
      autoRefreshToken: true,
    },
    realtime: {
      params: { eventsPerSecond: 10 },
    },
    global: {
      headers: { "x-client-info": "e-mtaa-tz" },
      fetch: (url, options) => {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), 15000);
        return fetch(url, { ...options, signal: controller.signal }).finally(() =>
          clearTimeout(timer),
        );
      },
    },
  });
}

let _supabase: ReturnType<typeof createSupabaseClient> | undefined;

export const supabase = new Proxy({} as ReturnType<typeof createSupabaseClient>, {
  get(_, prop, receiver) {
    if (!_supabase) _supabase = createSupabaseClient();
    return Reflect.get(_supabase, prop, receiver);
  },
});
