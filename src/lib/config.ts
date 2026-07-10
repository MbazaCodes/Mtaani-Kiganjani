// Supabase is considered configured when both VITE_SUPABASE_URL and an anon
// key are present at build time, OR when the app is not explicitly in demo
// mode. Set VITE_DEMO_MODE=true to force offline/demo mode (useful for preview
// builds that should never touch the database).
const hasSupabaseEnv = Boolean(
  import.meta.env.VITE_SUPABASE_URL &&
  (import.meta.env.VITE_SUPABASE_ANON_KEY ||
    import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
    import.meta.env.VITE_SUPABASE_PUBLISHABLE),
);

export const IS_SUPABASE_CONFIGURED: boolean =
  import.meta.env.VITE_DEMO_MODE !== "true" && hasSupabaseEnv;
