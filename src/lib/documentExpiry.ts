/**
 * Document Expiry Tracking
 * Checks which documents are expiring soon and generates alerts.
 *
 * Documents with expiry:
 * - Kibari cha Sherehe (Event Permit): expires on event date
 * - Kibari cha Ujezi Mdogo (Construction Permit): expires on end_date
 * - Makubaliano ya Pango (Rental Agreement): expires on lease end
 * - Barua ya Utambulisho (Introduction Letter): typically 30-90 days
 */

import { supabase } from "@/lib/supabase";

export interface ExpiringDocument {
  applicationId: string;
  applicationNumber: string;
  serviceName: string;
  userId: string;
  userName: string;
  expiryDate: string;
  daysLeft: number;
  status: "expiring_soon" | "expired" | "valid";
}

/**
 * Fetch documents expiring within the next N days for a ward/region.
 */
export async function getExpiringDocuments(
  daysAhead = 30,
  filters?: { ward?: string; district?: string; region?: string },
): Promise<ExpiringDocument[]> {
  const results: ExpiringDocument[] = [];
  const now = new Date();
  const cutoff = new Date(now.getTime() + daysAhead * 24 * 60 * 60 * 1000);

  // Fetch issued applications with date fields in form_data
  let query = supabase
    .from("applications")
    .select(
      "id, application_number, service_name, user_id, form_data, users:user_id(first_name, last_name, ward)",
    )
    .eq("status", "issued")
    .in("service_name", [
      "Kibari cha Sherehe",
      "Kibari cha Ujezi Mdogo",
      "Makubaliano ya Pango",
      "Barua ya Utambulisho",
    ]);

  if (filters?.ward) query = query.eq("users.ward", filters.ward);

  const { data } = await query.limit(200);

  for (const app of data || []) {
    const fd = (app.form_data || {}) as Record<string, string>;
    const expiryStr = fd.end_date || fd.event_date || fd.expiry_date || fd.valid_until;
    if (!expiryStr) continue;

    const expiry = new Date(expiryStr);
    if (isNaN(expiry.getTime())) continue;

    const daysLeft = Math.ceil((expiry.getTime() - now.getTime()) / (24 * 60 * 60 * 1000));

    if (expiry <= cutoff) {
      const user = app.users as {
        first_name?: string;
        last_name?: string;
      } | null;
      results.push({
        applicationId: app.id,
        applicationNumber: app.application_number || "",
        serviceName: app.service_name || "",
        userId: app.user_id || "",
        userName: user ? `${user.first_name || ""} ${user.last_name || ""}`.trim() : "Unknown",
        expiryDate: expiryStr,
        daysLeft,
        status: daysLeft < 0 ? "expired" : daysLeft <= 7 ? "expiring_soon" : "valid",
      });
    }
  }

  return results.sort((a, b) => a.daysLeft - b.daysLeft);
}
