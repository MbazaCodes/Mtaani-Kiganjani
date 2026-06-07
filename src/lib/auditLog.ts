/**
 * Audit Logger — records key user actions in activity_logs table.
 * Called from action handlers (approve, reject, create, update, delete).
 *
 * Usage:
 *   await logAction("approve_application", "application", appId, { status: "approved" });
 */
import { supabase } from "@/lib/supabase";

export async function logAction(
  action: string,
  entityType?: string,
  entityId?: string,
  details?: Record<string, unknown>,
): Promise<void> {
  try {
    await supabase.rpc("log_activity", {
      p_action: action,
      p_entity_type: entityType || null,
      p_entity_id: entityId || null,
      p_details: details || {},
    });
  } catch {
    // Silently fail — audit logging should never block the main action
  }
}

/** Common action names for consistency */
export const ACTIONS = {
  // Applications
  SUBMIT_APPLICATION: "submit_application",
  APPROVE_APPLICATION: "approve_application",
  REJECT_APPLICATION: "reject_application",
  ISSUE_DOCUMENT: "issue_document",
  // Agreements
  ACCEPT_AGREEMENT: "accept_agreement",
  REJECT_AGREEMENT: "reject_agreement",
  // Users
  CREATE_USER: "create_user",
  UPDATE_USER: "update_user",
  VERIFY_USER: "verify_user",
  // Admin
  UPDATE_SETTINGS: "update_settings",
  ESCALATE: "escalate",
  EXPORT_DATA: "export_data",
  // Auth
  LOGIN: "login",
  LOGOUT: "logout",
  PASSWORD_CHANGE: "password_change",
} as const;
