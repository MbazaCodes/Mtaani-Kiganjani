/**
 * INTEGRATION CONFIGURATION
 * =========================
 * Central feature-flag switchboard for all external government integrations.
 *
 * Each government/external integration is OFF by default. Disabled integrations
 * must fail clearly; production must never synthesize a successful verification
 * or delivery result. Enable a flag only after a real server-side provider/API
 * implementation and credentials are in place.
 *
 * To enable an integration, set the corresponding VITE_ env var to "true"
 * (e.g. VITE_ENABLE_NIDA=true) OR change the default here.
 */

const flag = (envVar: string, fallback = false): boolean => {
  const v = (import.meta as { env?: Record<string, string> }).env?.[envVar];
  if (v === undefined || v === null || v === "") return fallback;
  return v === "true" || v === "1";
};

export const INTEGRATIONS = {
  /** NIDA — National ID verification. Requires NIDA API agreement + credentials. */
  nida: {
    enabled: flag("VITE_ENABLE_NIDA"),
    baseUrl: (import.meta as { env?: Record<string, string> }).env?.VITE_NIDA_API_URL || "",
    // API key/secret read server-side only — never expose in client bundle.
  },

  /** TRA — Tanzania Revenue Authority (tax, control numbers). */
  tra: {
    enabled: flag("VITE_ENABLE_TRA"),
    baseUrl: (import.meta as { env?: Record<string, string> }).env?.VITE_TRA_API_URL || "",
  },

  /** Police / TPF — Tanzania Police Force (traffic fines, clearance). */
  police: {
    enabled: flag("VITE_ENABLE_POLICE"),
    baseUrl: (import.meta as { env?: Record<string, string> }).env?.VITE_POLICE_API_URL || "",
  },

  /** Payments — GePG (Government e-Payment Gateway) / M-Pesa / bank PSP. */
  payments: {
    enabled: flag("VITE_ENABLE_PAYMENTS"),
    provider: ((import.meta as { env?: Record<string, string> }).env?.VITE_PAYMENT_PROVIDER ||
      "mock") as "mock" | "gepg" | "mpesa" | "tigopesa" | "airtelmoney",
    baseUrl: (import.meta as { env?: Record<string, string> }).env?.VITE_PAYMENT_API_URL || "",
  },

  /** SMS — transactional SMS provider (Beem, Africa's Talking, etc.). */
  sms: {
    enabled: flag("VITE_ENABLE_SMS"),
    provider: ((import.meta as { env?: Record<string, string> }).env?.VITE_SMS_PROVIDER ||
      "mock") as "mock" | "beem" | "africastalking" | "twilio",
    senderId: (import.meta as { env?: Record<string, string> }).env?.VITE_SMS_SENDER_ID || "E-MTAA",
  },
} as const;

/** True when ANY real integration is live (useful for hiding the demo banner). */
export const ANY_INTEGRATION_LIVE = Object.values(INTEGRATIONS).some((i) => i.enabled);
