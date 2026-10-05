import { createClient } from "@supabase/supabase-js";
import type { Database } from "./types";

const USE_LOCAL = import.meta.env.VITE_USE_LOCAL_SERVER === "true";
const LOCAL_URL = import.meta.env.VITE_LOCAL_SERVER_URL || "http://localhost:3001";

function createSupabaseClient() {
  if (USE_LOCAL) {
    console.log("[E-Mtaa] Using LOCAL server:", LOCAL_URL);
    return createClient<Database>(LOCAL_URL, "local-dev-key", {
      auth: {
        storage: typeof window !== "undefined" ? localStorage : undefined,
        persistSession: true,
        autoRefreshToken: false,
        detectSessionInUrl: false,
      },
      global: {
        headers: { "x-client-info": "e-mtaa-local" },
        fetch: (url, options) => {
          const localUrl = url.toString();
          const controller = new AbortController();
          const timer = setTimeout(() => controller.abort(), 15000);
          return fetch(localUrl, { ...options, signal: controller.signal }).finally(() => clearTimeout(timer));
        },
      },
    });
  }

  const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
  const SUPABASE_KEY =
    import.meta.env.VITE_SUPABASE_ANON_KEY ||
    import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
    import.meta.env.VITE_SUPABASE_PUBLISHABLE;

  if (!SUPABASE_URL || !SUPABASE_KEY) {
    throw new Error(
      "Supabase is not configured. Set VITE_SUPABASE_URL and a publishable/anon key.",
    );
  }

  return createClient<Database>(SUPABASE_URL, SUPABASE_KEY, {
    auth: {
      storage: typeof window !== "undefined" ? localStorage : undefined,
      persistSession: true,
      autoRefreshToken: true,
    },
    realtime: { params: { eventsPerSecond: 10 } },
    global: {
      headers: { "x-client-info": "e-mtaa-tz" },
      fetch: (url, options) => {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), 15000);
        return fetch(url, { ...options, signal: controller.signal }).finally(() => clearTimeout(timer));
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
