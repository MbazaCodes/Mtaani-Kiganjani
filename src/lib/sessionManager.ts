/**
 * Multi-Device Session Management
 * Lists active sessions and allows signing out other devices.
 *
 * Note: Supabase doesn't directly expose session lists,
 * so this tracks sessions via a client-side session record.
 */
import { supabase } from "@/lib/supabase";

interface SessionInfo {
  id: string;
  device: string;
  browser: string;
  lastActive: string;
  isCurrent: boolean;
}

/** Get the current device name from user agent */
export function getDeviceName(): string {
  const ua = navigator.userAgent;
  if (/iPhone|iPad|iPod/.test(ua)) return "iPhone/iPad";
  if (/Android/.test(ua)) return "Android";
  if (/Windows/.test(ua)) return "Windows PC";
  if (/Mac/.test(ua)) return "Mac";
  if (/Linux/.test(ua)) return "Linux";
  return "Unknown Device";
}

/** Get browser name from user agent */
export function getBrowserName(): string {
  const ua = navigator.userAgent;
  if (/Chrome/.test(ua) && !/Edge/.test(ua)) return "Chrome";
  if (/Safari/.test(ua) && !/Chrome/.test(ua)) return "Safari";
  if (/Firefox/.test(ua)) return "Firefox";
  if (/Edge/.test(ua)) return "Edge";
  return "Browser";
}

/** Record the current session */
export async function recordSession(): Promise<void> {
  try {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session) return;

    const sessionId = session.access_token.slice(-8);
    const key = `emtaa_session_${session.user.id}`;
    const existing = JSON.parse(localStorage.getItem(key) || "[]") as SessionInfo[];

    // Update or add current session
    const current: SessionInfo = {
      id: sessionId,
      device: getDeviceName(),
      browser: getBrowserName(),
      lastActive: new Date().toISOString(),
      isCurrent: true,
    };

    const updated = existing
      .filter((s) => s.id !== sessionId)
      .map((s) => ({ ...s, isCurrent: false }));
    updated.push(current);

    // Keep only last 5 sessions
    localStorage.setItem(key, JSON.stringify(updated.slice(-5)));
  } catch {
    // ignore
  }
}

/** Get list of tracked sessions */
export function getTrackedSessions(userId: string): SessionInfo[] {
  try {
    const key = `emtaa_session_${userId}`;
    return JSON.parse(localStorage.getItem(key) || "[]");
  } catch {
    return [];
  }
}

/** Sign out all other sessions (Supabase global sign out) */
export async function signOutAllOtherSessions(): Promise<void> {
  // Supabase doesn't support selective session revocation,
  // but we can sign out globally and re-authenticate
  await supabase.auth.signOut({ scope: "global" });
}
