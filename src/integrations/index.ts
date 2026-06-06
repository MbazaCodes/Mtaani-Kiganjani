/**
 * INTEGRATIONS — barrel export
 * ============================
 * Single import point for all external integrations.
 *
 *   import { verifyNida, processPayment, sendSms } from "@/integrations";
 *
 * Every function is safe to call now: it returns mock data in demonstration
 * mode and switches to the real API automatically once you enable the flag
 * in src/integrations/config.ts (or via VITE_ENABLE_* env vars).
 */
export { INTEGRATIONS, ANY_INTEGRATION_LIVE } from "./config";
export * from "./types";

export { verifyNida } from "./nida";
export { lookupTraObligations } from "./tra";
export { lookupPoliceRecords } from "./police";
export { processPayment } from "./payments";
export { sendSms } from "./sms";
