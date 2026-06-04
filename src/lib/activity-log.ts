/**
 * Activity logging — records key user actions in the activity_logs table.
 *
 * Usage:
 *   import { logActivity } from "@/lib/activity-log";
 *   await logActivity(userId, "approve_application", { applicationId, serviceName });
 *
 * Fires-and-forgets so it never blocks the calling action.
 */
import { supabase } from "@/lib/supabase";

export type ActivityAction =
  | "login"
  | "logout"
  | "signup"
  | "submit_application"
  | "approve_application"
  | "reject_application"
  | "return_application"
  | "confirm_email"
  | "create_staff"
  | "reset_password"
  | "verify_citizen"
  | "delete_citizen"
  | "update_profile"
  | "download_document"
  | "make_payment"
  | "create_office"
  | "update_office"
  | "delete_office"
  | "save_signature";

// Map actions to their display categories and severity
const ACTION_META: Record<ActivityAction, { type: string; severity: string; description: string }> =
  {
    login: { type: "login", severity: "info", description: "User logged in" },
    logout: { type: "logout", severity: "info", description: "User logged out" },
    signup: { type: "create", severity: "info", description: "New user registered" },
    submit_application: {
      type: "create",
      severity: "info",
      description: "Application submitted",
    },
    approve_application: {
      type: "approve",
      severity: "info",
      description: "Application approved",
    },
    reject_application: {
      type: "reject",
      severity: "warning",
      description: "Application rejected",
    },
    return_application: {
      type: "update",
      severity: "warning",
      description: "Application returned for info",
    },
    confirm_email: { type: "update", severity: "info", description: "Email confirmed for user" },
    create_staff: { type: "create", severity: "info", description: "Staff account created" },
    reset_password: { type: "update", severity: "warning", description: "Password reset" },
    verify_citizen: { type: "update", severity: "info", description: "Citizen verified" },
    delete_citizen: {
      type: "delete",
      severity: "critical",
      description: "Citizen account deleted",
    },
    update_profile: { type: "update", severity: "info", description: "Profile updated" },
    download_document: {
      type: "view",
      severity: "info",
      description: "Document downloaded",
    },
    make_payment: { type: "payment", severity: "info", description: "Payment processed" },
    create_office: { type: "create", severity: "info", description: "Office created" },
    update_office: { type: "update", severity: "info", description: "Office updated" },
    delete_office: { type: "delete", severity: "critical", description: "Office deleted" },
    save_signature: { type: "update", severity: "info", description: "Signature/stamp saved" },
  };

/**
 * Log an activity. Fire-and-forget — errors are swallowed so they
 * never interfere with the user's primary action.
 */
export async function logActivity(
  userId: string | null | undefined,
  action: ActivityAction,
  details?: Record<string, unknown>,
  options?: { severity?: string; status?: string; userRole?: string },
): Promise<void> {
  try {
    const meta = ACTION_META[action] || {
      type: "other",
      severity: "info",
      description: action,
    };
    await supabase.from("activity_logs").insert({
      user_id: userId ?? null,
      action,
      action_type: meta.type,
      severity: options?.severity ?? meta.severity,
      status: options?.status ?? "success",
      description: meta.description,
      user_role: options?.userRole ?? null,
      details: details ?? null,
    });
  } catch {
    // Logging must never break the app — silently fail
  }
}
