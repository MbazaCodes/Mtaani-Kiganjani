import { createClient } from "@supabase/supabase-js";
import type { Database } from "./types";

// ── Public (anon / publishable) credentials ──────────────────────────────────
// These are safe to expose to the browser — the anon key is designed to be
// public and Supabase Row-Level Security is the actual security boundary.
//
// SECURITY: We deliberately do NOT hardcode fallback credentials. A previous
// version of this file embedded a default URL + anon key, which meant a build
// with missing env vars would silently ship pointing at the original Supabase
// project — masking deploy misconfigurations and risking cross-project data
// leaks. Now: if the env vars are missing, the app fails loudly so the
// operator notices immediately.
const REQUIRED_ENV = {
  url: import.meta.env.VITE_SUPABASE_URL,
  anonKey:
    import.meta.env.VITE_SUPABASE_ANON_KEY ||
    import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
    import.meta.env.VITE_SUPABASE_PUBLISHABLE,
} as const;

if (!REQUIRED_ENV.url || !REQUIRED_ENV.anonKey) {
  // Surface the misconfiguration in the console for ops/debugging. The Supabase
  // client below will still be constructed, but every call will fail; the
  // AuthContext / ErrorBoundary already handle this gracefully.
  console.error(
    "[supabase] Missing required env vars. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY (or VITE_SUPABASE_PUBLISHABLE) at build time.",
  );
}

function createSupabaseClient() {
  const SUPABASE_URL = REQUIRED_ENV.url ?? "";
  const SUPABASE_KEY = REQUIRED_ENV.anonKey ?? "";

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
