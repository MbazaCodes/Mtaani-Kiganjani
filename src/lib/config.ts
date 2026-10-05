const hasSupabaseEnv = Boolean(
  import.meta.env.VITE_SUPABASE_URL &&
  (import.meta.env.VITE_SUPABASE_ANON_KEY ||
    import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
    import.meta.env.VITE_SUPABASE_PUBLISHABLE),
);

/**
 * Demo mode must be explicitly enabled. Production never falls back to demo
 * merely because Supabase/network configuration is missing.
 */
export const IS_DEMO_MODE: boolean = import.meta.env.VITE_DEMO_MODE === "true";

export const IS_SUPABASE_CONFIGURED: boolean = hasSupabaseEnv;

export const CAN_USE_DEMO_DATA: boolean = IS_DEMO_MODE;

export const IS_PRODUCTION_RUNTIME: boolean = !IS_DEMO_MODE;
