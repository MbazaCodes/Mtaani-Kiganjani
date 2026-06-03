/**
 * Notifications utility library
 *
 * Two table system:
 *   - notifications: general notifications (title, message, type, read)
 *   - agreement_notifications: counterparty workflow for Sales/Rental
 *     (sender + recipient + application_id + is_actioned + action_taken)
 *
 * Helpers below create notifications without throwing — they log errors
 * but never reject so a failure here doesn't break the user-facing flow.
 */
import { supabase } from "./supabase";

export type NotificationType = "info" | "success" | "warning" | "error";

interface CreateNotificationInput {
  user_id: string;
  title: string;
  message?: string;
  type?: NotificationType;
}

/** Insert a general notification — best-effort, never throws */
export async function createNotification(input: CreateNotificationInput): Promise<void> {
  try {
    const { error } = await supabase.from("notifications").insert({
      user_id: input.user_id,
      title: input.title,
      message: input.message || null,
      type: input.type || "info",
      read: false,
    });
    if (error) console.warn("createNotification failed:", error);
  } catch (e) {
    console.warn("createNotification exception:", e);
  }
}

interface CreateAgreementNotificationInput {
  application_id: string;
  sender_id: string;
  recipient_id: string;
  recipient_citizen_id?: string | null;
  notification_type?: string;
  message: string;
}

/** Insert an agreement_notification — used for Sales/Rental counterparty workflow */
export async function createAgreementNotification(
  input: CreateAgreementNotificationInput,
): Promise<void> {
  try {
    const { error } = await supabase.from("agreement_notifications").insert({
      application_id: input.application_id,
      sender_id: input.sender_id,
      recipient_id: input.recipient_id,
      recipient_citizen_id: input.recipient_citizen_id || null,
      notification_type: input.notification_type || "agreement_approval",
      message: input.message,
      is_read: false,
      is_actioned: false,
    });
    if (error) console.warn("createAgreementNotification failed:", error);
  } catch (e) {
    console.warn("createAgreementNotification exception:", e);
  }
}

/** Mark a notification as read */
export async function markNotificationRead(id: string): Promise<void> {
  try {
    await supabase.from("notifications").update({ read: true }).eq("id", id);
  } catch (e) {
    console.warn(e);
  }
}

/** Mark all notifications for a user as read */
export async function markAllNotificationsRead(user_id: string): Promise<void> {
  try {
    await supabase
      .from("notifications")
      .update({ read: true })
      .eq("user_id", user_id)
      .eq("read", false);
  } catch (e) {
    console.warn(e);
  }
}

/** Action an agreement notification — buyer/tenant accept or reject */
export async function actionAgreementNotification(
  id: string,
  action: "accepted" | "rejected",
  reason?: string,
): Promise<boolean> {
  try {
    const { error } = await supabase
      .from("agreement_notifications")
      .update({
        is_actioned: true,
        action_taken: action,
        action_reason: reason || null,
        actioned_at: new Date().toISOString(),
      })
      .eq("id", id);
    if (error) {
      console.warn(error);
      return false;
    }
    return true;
  } catch (e) {
    console.warn(e);
    return false;
  }
}

/** Count unread notifications for header badge */
export async function countUnreadNotifications(user_id: string): Promise<number> {
  try {
    const [{ count: generalCount }, { count: agreementCount }] = await Promise.all([
      supabase
        .from("notifications")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user_id)
        .eq("read", false),
      supabase
        .from("agreement_notifications")
        .select("id", { count: "exact", head: true })
        .eq("recipient_id", user_id)
        .eq("is_actioned", false),
    ]);
    return (generalCount || 0) + (agreementCount || 0);
  } catch (e) {
    console.warn(e);
    return 0;
  }
}
