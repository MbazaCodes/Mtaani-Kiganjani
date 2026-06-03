/**
 * Supabase Admin client — uses the service role key to bypass RLS and
 * create email-confirmed users. Only ever called from admin-protected
 * components (StaffManagement). Never import this in citizen-facing code.
 *
 * Required env var: VITE_SUPABASE_SERVICE_ROLE_KEY
 * Add it to your Vercel project settings and local .env file.
 */
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

function getAdminClient() {
  const url = import.meta.env.VITE_SUPABASE_URL as string;
  const serviceKey = import.meta.env.VITE_SUPABASE_SERVICE_ROLE_KEY as string;

  if (!url || !serviceKey) {
    return null;
  }

  return createClient<Database>(url, serviceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

/**
 * Create a staff/admin user with email already confirmed so they can
 * log in immediately with the provided password.
 */
export async function adminCreateUser(params: {
  email: string;
  password: string;
  role: "staff" | "admin";
  officeId?: string;
}): Promise<{ userId: string | null; error: string | null }> {
  const adminClient = getAdminClient();

  if (!adminClient) {
    return {
      userId: null,
      error:
        "VITE_SUPABASE_SERVICE_ROLE_KEY is not set. Add it to your .env and Vercel environment variables.",
    };
  }

  const { data, error } = await adminClient.auth.admin.createUser({
    email: params.email,
    password: params.password,
    email_confirm: true, // skips email confirmation — user can log in immediately
    user_metadata: {
      role: params.role,
      office_id: params.officeId ?? "",
    },
  });

  if (error) {
    return { userId: null, error: error.message };
  }

  return { userId: data.user?.id ?? null, error: null };
}

/**
 * Reset a staff user's password directly — no email needed.
 */
export async function adminResetPassword(params: {
  userId: string;
  newPassword: string;
}): Promise<{ error: string | null }> {
  const adminClient = getAdminClient();

  if (!adminClient) {
    return {
      error:
        "VITE_SUPABASE_SERVICE_ROLE_KEY is not set. Add it to your .env and Vercel environment variables.",
    };
  }

  const { error } = await adminClient.auth.admin.updateUserById(params.userId, {
    password: params.newPassword,
  });

  return { error: error?.message ?? null };
}

/**
 * Confirm a user's email in Supabase Auth so they can log in immediately.
 * Used by staff to unblock citizens who never received the confirmation email.
 */
export async function adminConfirmUserEmail(params: {
  userId: string;
}): Promise<{ error: string | null }> {
  const adminClient = getAdminClient();

  if (!adminClient) {
    return {
      error:
        "VITE_SUPABASE_SERVICE_ROLE_KEY is not set. Add it to your Vercel environment variables.",
    };
  }

  const { error } = await adminClient.auth.admin.updateUserById(params.userId, {
    email_confirm: true,
  });

  return { error: error?.message ?? null };
}
