/**
 * POLICE / TPF INTEGRATION — Tanzania Police Force
 * ================================================
 * Looks up police records (e.g. traffic fines, clearance) for a citizen/vehicle.
 *
 * STATUS: STUB (mock). Returns demo data until enabled.
 *
 * TO GO LIVE:
 *   1. Obtain TPF API access (inter-agency agreement).
 *   2. Set env: VITE_ENABLE_POLICE=true, VITE_POLICE_API_URL=<url>
 *   3. Implement `lookupPoliceRecordsLive()` via a server-side route.
 */
import { INTEGRATIONS } from "../config";
import type { IntegrationResult, PoliceRecord } from "../types";

export async function lookupPoliceRecords(
  identifier: string,
): Promise<IntegrationResult<PoliceRecord[]>> {
  if (INTEGRATIONS.police.enabled) {
    return lookupPoliceRecordsLive(identifier);
  }
  return lookupPoliceRecordsMock(identifier);
}

async function lookupPoliceRecordsMock(
  _identifier: string,
): Promise<IntegrationResult<PoliceRecord[]>> {
  return { ok: true, source: "mock", data: [] };
}

async function lookupPoliceRecordsLive(
  _identifier: string,
): Promise<IntegrationResult<PoliceRecord[]>> {
  // TODO: Real TPF lookup via server-side route.
  return {
    ok: false,
    source: "live",
    error: "Police live integration not implemented. See src/integrations/police/index.ts",
  };
}
