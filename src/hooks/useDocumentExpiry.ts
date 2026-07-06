/**
 * useDocumentExpiry
 *
 * Checks the citizen's issued documents for upcoming expiry and
 * fires a notification for each one within 30 days.
 * Runs once per session (after login) — avoids spamming the user.
 *
 * Notification logic:
 *   - 0–7  days  → "expiring_soon" → type: "error"
 *   - 8–30 days  → "valid" but close → type: "warning"
 *   - Already expired → type: "error"
 *
 * Already-notified docs are tracked in sessionStorage so the user
 * only sees the alert once per browser session.
 */

import { useEffect } from "react";
import { getExpiringDocuments } from "@/lib/documentExpiry";
import { createNotification } from "@/lib/notifications";
import type { UserProfile } from "@/lib/supabase";

const SESSION_KEY = "expiry_notified_ids";

function getNotifiedIds(): Set<string> {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    return new Set(raw ? JSON.parse(raw) : []);
  } catch {
    return new Set();
  }
}

function markNotified(ids: string[]): void {
  try {
    const existing = getNotifiedIds();
    ids.forEach((id) => existing.add(id));
    sessionStorage.setItem(SESSION_KEY, JSON.stringify([...existing]));
  } catch {
    /* noop */
  }
}

export function useDocumentExpiry(user: UserProfile | null): void {
  useEffect(() => {
    if (!user?.id || user.id.startsWith("demo-")) return;

    let cancelled = false;

    const run = async () => {
      try {
        const expiring = await getExpiringDocuments(30, {
          ward: user.ward ?? undefined,
          district: user.district ?? undefined,
          region: user.region ?? undefined,
        });

        if (cancelled) return;

        // Only docs belonging to this citizen
        const mine = expiring.filter((d) => d.userId === user.id);
        if (mine.length === 0) return;

        const alreadyNotified = getNotifiedIds();
        const toNotify = mine.filter((d) => !alreadyNotified.has(d.applicationId));
        if (toNotify.length === 0) return;

        await Promise.all(
          toNotify.map((doc) => {
            const isSw = true; // we always create bilingual-ish messages
            const daysLabel =
              doc.daysLeft < 0
                ? isSw
                  ? "imekwisha muda"
                  : "has expired"
                : isSw
                  ? `inakwisha siku ${doc.daysLeft}`
                  : `expires in ${doc.daysLeft} day${doc.daysLeft === 1 ? "" : "s"}`;

            const title =
              doc.daysLeft < 0
                ? `⚠️ ${doc.serviceName} — Imekwisha Muda / Expired`
                : `🔔 ${doc.serviceName} — ${doc.daysLeft <= 7 ? "Inakwisha Hivi Karibuni / Expiring Soon" : "Inakwisha / Expiring"}`;

            const message = isSw
              ? `Hati yako (${doc.applicationNumber}) ${daysLabel}. Tafadhali fanya upya kabla ya muda kumalizika.`
              : `Your document (${doc.applicationNumber}) ${daysLabel}. Please renew before it expires.`;

            const type =
              doc.daysLeft < 0 || doc.daysLeft <= 7 ? ("error" as const) : ("warning" as const);

            return createNotification({ user_id: user.id, title, message, type });
          }),
        );

        markNotified(toNotify.map((d) => d.applicationId));
      } catch {
        // Non-critical — never surface to user
      }
    };

    // Defer by 5s so it doesn't compete with page load
    const timer = setTimeout(run, 5000);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [user?.id]); // eslint-disable-line react-hooks/exhaustive-deps
}
