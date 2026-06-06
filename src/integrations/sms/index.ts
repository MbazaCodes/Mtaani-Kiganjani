/**
 * SMS INTEGRATION — Transactional SMS
 * ===================================
 * Sends SMS notifications (e.g. application approved, payment due).
 *
 * STATUS: STUB (mock). Logs instead of sending until enabled.
 *
 * TO GO LIVE:
 *   1. Pick a provider: Beem Africa, Africa's Talking, or Twilio.
 *   2. Register a Sender ID (e.g. "E-MTAA") with the provider/TCRA.
 *   3. Set env:
 *        VITE_ENABLE_SMS=true
 *        VITE_SMS_PROVIDER=beem   (or africastalking / twilio)
 *        VITE_SMS_SENDER_ID=E-MTAA
 *      Keep the API secret SERVER-SIDE (Supabase Edge Function / serverless).
 *   4. Implement `sendSmsLive()` to call your serverless SMS route.
 */
import { INTEGRATIONS } from "../config";
import type { IntegrationResult, SmsMessage, SmsResult } from "../types";

export async function sendSms(msg: SmsMessage): Promise<IntegrationResult<SmsResult>> {
  if (INTEGRATIONS.sms.enabled) {
    return sendSmsLive(msg);
  }
  return sendSmsMock(msg);
}

async function sendSmsMock(msg: SmsMessage): Promise<IntegrationResult<SmsResult>> {
  // Demo: do not actually send. (No console noise in production.)
  void msg;
  return {
    ok: true,
    source: "mock",
    data: {
      messageId: `MOCK-SMS-${Date.now()}`,
      status: "queued",
    },
  };
}

async function sendSmsLive(msg: SmsMessage): Promise<IntegrationResult<SmsResult>> {
  // TODO: Real SMS via server-side route.
  //   const res = await fetch("/api/sms/send", {
  //     method: "POST",
  //     headers: { "Content-Type": "application/json" },
  //     body: JSON.stringify({ ...msg, senderId: INTEGRATIONS.sms.senderId }),
  //   });
  //   const data = await res.json();
  //   return { ok: true, source: "live", data };
  void msg;
  return {
    ok: false,
    source: "live",
    error: "SMS live integration not implemented. See src/integrations/sms/index.ts",
  };
}
