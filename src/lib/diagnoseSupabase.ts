/**
 * diagnoseSupabase
 *
 * Runs at app startup (once) and logs the Supabase connection status
 * to the browser console. Useful for debugging auth issues in production.
 *
 * Does NOT block the UI — runs in the background.
 *
 * To see results: open browser DevTools → Console → look for [E-Mtaa Supabase]
 */

import { supabase } from "@/integrations/supabase/client";

let _ran = false;

export async function diagnoseSupabase(): Promise<void> {
  if (_ran) return;
  _ran = true;

  const url =
    import.meta.env.VITE_SUPABASE_URL || "https://nkpdvtwjbngmvlolytvt.supabase.co";

  console.group("[E-Mtaa Supabase] Connection Diagnostic");
  console.log("URL:", url);
  console.log("Online:", navigator.onLine);
  console.log("VITE_SUPABASE_URL set:", !!import.meta.env.VITE_SUPABASE_URL);
  console.log("VITE_SUPABASE_PUBLISHABLE_KEY set:", !!import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY);

  try {
    // Test 1: Can we reach the Supabase health endpoint?
    const healthRes = await fetch(`${url}/rest/v1/`, {
      headers: { apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || "" },
      signal: AbortSignal.timeout(5000),
    });
    console.log("REST API reachable:", healthRes.ok, `(status ${healthRes.status})`);
  } catch (e) {
    console.error("REST API unreachable:", (e as Error).message);
    console.warn(
      "→ This is likely why login fails.",
      "Check: Supabase project is active, Vercel env vars are set,",
      "and https://status.supabase.com shows no outages.",
    );
  }

  try {
    // Test 2: Auth session check (lightweight)
    const { data, error } = await supabase.auth.getSession();
    if (error) {
      console.error("Auth session error:", error.message);
    } else {
      console.log("Auth session:", data.session ? "active" : "none (not logged in)");
    }
  } catch (e) {
    console.error("Auth getSession failed:", (e as Error).message);
  }

  console.groupEnd();
}
