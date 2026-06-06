/**
 * NIDA INTEGRATION — National Identification Authority
 * ====================================================
 * Verifies a citizen's NIDA (National ID) number against the NIDA database.
 *
 * STATUS: STUB (mock). Returns demo data until enabled.
 *
 * TO GO LIVE:
 *   1. Sign a data-access agreement with NIDA (government-to-government).
 *   2. Receive API endpoint + credentials (typically a server-side API key).
 *   3. Set env: VITE_ENABLE_NIDA=true, VITE_NIDA_API_URL=<url>
 *      Keep the secret key SERVER-SIDE (Supabase Edge Function or serverless
 *      route) — never put the NIDA secret in the client bundle.
 *   4. Implement the real call in `verifyNidaLive()` below.
 */
import { INTEGRATIONS } from "../config";
import type { IntegrationResult, NidaVerification } from "../types";

/** Public entry point — automatically routes to live or mock. */
export async function verifyNida(nidaNumber: string): Promise<IntegrationResult<NidaVerification>> {
  if (INTEGRATIONS.nida.enabled) {
    return verifyNidaLive(nidaNumber);
  }
  return verifyNidaMock(nidaNumber);
}

/** MOCK — demonstration mode. Treats any 20-digit NIDA as structurally valid. */
async function verifyNidaMock(nidaNumber: string): Promise<IntegrationResult<NidaVerification>> {
  const clean = (nidaNumber || "").replace(/\D/g, "");
  return {
    ok: true,
    source: "mock",
    data: {
      nidaNumber,
      verified: clean.length === 20,
      // No real personal data is returned in mock mode.
    },
  };
}

/** LIVE — implement the real NIDA API call here when credentials are ready. */
async function verifyNidaLive(nidaNumber: string): Promise<IntegrationResult<NidaVerification>> {
  // TODO: Replace with the real NIDA API request via a SERVER-SIDE route.
  //   const res = await fetch("/api/nida/verify", {
  //     method: "POST",
  //     headers: { "Content-Type": "application/json" },
  //     body: JSON.stringify({ nidaNumber }),
  //   });
  //   if (!res.ok) return { ok: false, source: "live", error: `HTTP ${res.status}` };
  //   const data = await res.json();
  //   return { ok: true, source: "live", data };
  return {
    ok: false,
    source: "live",
    error: "NIDA live integration not implemented. See src/integrations/nida/index.ts",
  };
}
