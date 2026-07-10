// Supabase is always configured — we have hardcoded fallback credentials.
// Set VITE_DEMO_MODE=true in Vercel to force offline/demo mode.
export const IS_SUPABASE_CONFIGURED: boolean =
  import.meta.env.VITE_DEMO_MODE !== "true";
