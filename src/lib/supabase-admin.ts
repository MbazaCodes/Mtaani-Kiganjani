/**
 * Admin operations — SECURE client wrapper.
 *
 * IMPORTANT: The Supabase service role key is NEVER used in the browser. These
 * functions call the server-side Vercel function at /api/admin, which holds the
 * service key and verifies the caller is an authenticated admin/staff before
 * performing any privileged action.
 *
 * This keeps the same function signatures the rest of the app already uses, so
 * no callers needed to change.
 */
import { supabase } from "@/integrations/supabase/client";

async function callAdminApi(
  payload: Record<string, unknown>,
): Promise<{ data: Record<string, unknown> | null; error: string | null }> {
  // Attach the caller's session token so the server can verify their role.
  const {
    data: { session },
  } = await supabase.auth.getSession();
  const token = session?.access_token;

  if (!token) {
    return { data: null, error: "You must be signed in to perform this action." };
  }

  try {
    const res = await fetch("/api/admin", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(payload),
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      return { data: null, error: json.error || `Request failed (${res.status})` };
    }
    return { data: json, error: null };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Network error contacting admin service.";
    return { data: null, error: msg };
  }
}

/**
 * Create a staff/admin user with email already confirmed so they can log in
 * immediately with the provided password.
 */
export async function adminCreateUser(params: {
  email: string;
  password: string;
  role: "staff" | "admin";
  officeId?: string;
}): Promise<{ userId: string | null; error: string | null }> {
  const { data, error } = await callAdminApi({
    action: "createUser",
    email: params.email,
    password: params.password,
    role: params.role,
    officeId: params.officeId,
  });
  if (error) return { userId: null, error };
  return { userId: (data?.userId as string) ?? null, error: null };
}

/**
 * Reset a staff user's password directly — no email needed.
 */
export async function adminResetPassword(params: {
  userId: string;
  newPassword: string;
}): Promise<{ error: string | null }> {
  const { error } = await callAdminApi({
    action: "resetPassword",
    userId: params.userId,
    newPassword: params.newPassword,
  });
  return { error };
}

/**
 * Confirm a user's email in Supabase Auth so they can log in immediately.
 * Used by staff to unblock citizens who never received the confirmation email.
 */
export async function adminConfirmUserEmail(params: {
  userId: string;
}): Promise<{ error: string | null }> {
  const { error } = await callAdminApi({
    action: "confirmEmail",
    userId: params.userId,
  });
  return { error };
}
