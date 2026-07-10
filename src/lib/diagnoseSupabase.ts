/**
 * diagnoseSupabase — runs at startup, logs connection status to DevTools console
 */
import { supabase } from "@/integrations/supabase/client";

let _ran = false;

export async function diagnoseSupabase(): Promise<void> {
  if (_ran) return;
  _ran = true;

  const url = import.meta.env.VITE_SUPABASE_URL || "https://apaynuwvnqnxrigluvzo.supabase.co";
  const isLocal = import.meta.env.VITE_USE_LOCAL_SERVER === "true";

  console.group("[E-Mtaa] Connection Diagnostic");
  console.log("Mode:", isLocal ? "LOCAL SERVER" : "SUPABASE CLOUD");
  console.log("URL:", isLocal ? (import.meta.env.VITE_LOCAL_SERVER_URL || "http://localhost:3001") : url);
  console.log("Online:", navigator.onLine);

  if (!isLocal) {
    try {
      const healthRes = await fetch(`${url}/rest/v1/`, {
        headers: { apikey: import.meta.env.VITE_SUPABASE_ANON_KEY || "" },
        signal: AbortSignal.timeout(5000),
      });
      console.log("REST API:", healthRes.ok ? "✅ reachable" : `❌ status ${healthRes.status}`);
    } catch (e) {
      console.error("REST API: ❌ unreachable —", (e as Error).message);
    }
    try {
      const { data, error } = await supabase.auth.getSession();
      if (error) console.error("Auth:", error.message);
      else console.log("Auth session:", data.session ? "active" : "none");
    } catch (e) {
      console.error("Auth failed:", (e as Error).message);
    }
  }

  console.groupEnd();
}
