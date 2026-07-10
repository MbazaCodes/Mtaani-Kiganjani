/**
 * Supabase configuration.
 *
 * The client (src/integrations/supabase/client.ts) always has a working
 * Supabase URL and anon key — either from Vercel environment variables
 * or from the hardcoded fallback credentials.
 *
 * IS_SUPABASE_CONFIGURED is therefore always true in production.
 * It can be set to false explicitly via VITE_DEMO_MODE=true for
 * fully-offline demo deployments.
 */
export const IS_SUPABASE_CONFIGURED: boolean =
  import.meta.env.VITE_DEMO_MODE !== "true";
