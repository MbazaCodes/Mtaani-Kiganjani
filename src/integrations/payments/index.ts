/**
 * PAYMENTS INTEGRATION — GePG / Mobile Money / Bank
 * =================================================
 * Processes a real payment and returns a transaction + receipt.
 *
 * STATUS: STUB (mock). Records a "completed" payment locally without moving
 *         real money until enabled.
 *
 * TO GO LIVE (recommended order):
 *   1. GePG (Government e-Payment Gateway) — the official route for government
 *      collections. Requires registration + a collection account, returns
 *      control numbers citizens pay via any bank/mobile-money.
 *      OR a licensed PSP (M-Pesa, Tigo Pesa, Airtel Money, bank).
 *   2. Set env:
 *        VITE_ENABLE_PAYMENTS=true
 *        VITE_PAYMENT_PROVIDER=gepg   (or mpesa / tigopesa / airtelmoney)
 *        VITE_PAYMENT_API_URL=<url>
 *      Keep merchant secrets SERVER-SIDE (Supabase Edge Function / serverless).
 *   3. Implement `processPaymentLive()` + a webhook/callback handler to
 *      confirm payment asynchronously (most gateways are async).
 *
 * IMPORTANT: In mock mode, "PAID" is a status only — no money moves. Do not
 * treat mock receipts as real financial records.
 */
import { INTEGRATIONS } from "../config";
import type { IntegrationResult, PaymentRequest, PaymentResult } from "../types";

export async function processPayment(
  req: PaymentRequest,
): Promise<IntegrationResult<PaymentResult>> {
  if (INTEGRATIONS.payments.enabled) {
    return processPaymentLive(req);
  }
  return processPaymentMock(req);
}

async function processPaymentMock(req: PaymentRequest): Promise<IntegrationResult<PaymentResult>> {
  // Demo: instantly "complete" the payment without moving money.
  const now = new Date().toISOString();
  return {
    ok: true,
    source: "mock",
    data: {
      transactionId: `MOCK-${Date.now()}`,
      receiptNumber: `RCP-${req.applicationId.slice(0, 8).toUpperCase()}`,
      status: "completed",
      amount: req.amount,
      paidAt: now,
      method: "E-Mtaa (Demo)",
    },
  };
}

async function processPaymentLive(req: PaymentRequest): Promise<IntegrationResult<PaymentResult>> {
  // TODO: Real payment via server-side route. Most gateways are ASYNC:
  //   1. Request a control number / push prompt from the gateway.
  //   2. Return status "pending" here.
  //   3. Confirm via a webhook/callback that updates the payment + application.
  //   const res = await fetch("/api/payments/initiate", {
  //     method: "POST",
  //     headers: { "Content-Type": "application/json" },
  //     body: JSON.stringify(req),
  //   });
  //   const data = await res.json();
  //   return { ok: true, source: "live", data };
  void req;
  return {
    ok: false,
    source: "live",
    error: "Payment live integration not implemented. See src/integrations/payments/index.ts",
  };
}
