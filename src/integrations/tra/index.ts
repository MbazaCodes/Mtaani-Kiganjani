/**
 * TRA INTEGRATION — Tanzania Revenue Authority
 * ============================================
 * Looks up tax obligations / control numbers for a taxpayer.
 *
 * STATUS: STUB (mock). Returns demo data until enabled.
 *
 * TO GO LIVE:
 *   1. Obtain TRA API access (inter-agency agreement).
 *   2. Set env: VITE_ENABLE_TRA=true, VITE_TRA_API_URL=<url>
 *   3. Implement `lookupTraObligationsLive()` via a server-side route.
 */
import { INTEGRATIONS } from "../config";
import type { IntegrationResult, TraObligation } from "../types";

export async function lookupTraObligations(
  tinOrNida: string,
): Promise<IntegrationResult<TraObligation[]>> {
  if (INTEGRATIONS.tra.enabled) {
    return lookupTraObligationsLive(tinOrNida);
  }
  return lookupTraObligationsMock(tinOrNida);
}

async function lookupTraObligationsMock(
  _tinOrNida: string,
): Promise<IntegrationResult<TraObligation[]>> {
  // Demo: no real obligations in mock mode.
  return { ok: true, source: "mock", data: [] };
}

async function lookupTraObligationsLive(
  _tinOrNida: string,
): Promise<IntegrationResult<TraObligation[]>> {
  // TODO: Real TRA lookup via server-side route.
  return {
    ok: false,
    source: "live",
    error: "TRA live integration not implemented. See src/integrations/tra/index.ts",
  };
}
