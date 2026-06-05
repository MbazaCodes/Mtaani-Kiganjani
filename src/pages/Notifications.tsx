/**
 * Notifications — Citizen-facing notification feed
 *
 * Shows two streams in one timeline:
 *  - general notifications (from public.notifications)
 *  - agreement notifications (from public.agreement_notifications)
 *    These get special UI: ACCEPT / REJECT buttons for the
 *    counterparty in Sales/Rental agreements.
 *
 * Auto-marks read on click. "Mark all read" button at top.
 */
import React, { useEffect, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Bell,
  MessageSquare,
  AlertTriangle,
  FileText,
  Megaphone,
  BellOff,
  CheckCircle,
  XCircle,
  AlertCircle,
  Info,
  Loader2,
  RefreshCw,
  MailOpen,
  ExternalLink,
  Check,
  CheckCheck,
  Trash2,
  Inbox,
  FileSignature,
  ShieldAlert,
  Clock,
  X,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";
import { useLanguage } from "@/context/LanguageContext";
import { useToast } from "@/context/ToastContext";
import {
  markNotificationRead,
  markAllNotificationsRead,
  actionAgreementNotification,
} from "@/lib/notifications";
import { useRouterView } from "@/components/layout/AppShell";

interface GeneralNotification {
  id: string;
  user_id: string;
  title: string;
  message: string | null;
  type: "info" | "success" | "warning" | "error";
  read: boolean;
  created_at: string;
}

interface AgreementNotification {
  id: string;
  application_id: string;
  sender_id: string;
  recipient_id: string;
  notification_type: string;
  message: string;
  is_read: boolean;
  is_actioned: boolean;
  action_taken: string | null;
  action_reason: string | null;
  created_at: string;
  actioned_at: string | null;
  sender?: { first_name: string; last_name: string; phone?: string; nida_number?: string };
}

type Tab = "all" | "unread" | "agreements";

export function Notifications() {
  const { user } = useAuth();
  const { lang } = useLanguage();
  const { showToast } = useToast();
  const { setView } = useRouterView();
  const L = (sw: string, en: string) => (lang === "sw" ? sw : en);

  const [tab, setTab] = useState<Tab>("all");
  const [general, setGeneral] = useState<GeneralNotification[]>([]);
  const [agreements, setAgreements] = useState<AgreementNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [actioningId, setActioningId] = useState<string | null>(null);
  const [rejectModal, setRejectModal] = useState<AgreementNotification | null>(null);
  const [rejectReason, setRejectReason] = useState("");

  const fetch = useCallback(async () => {
    if (!user?.id) return;
    setRefreshing(true);
    try {
      const [{ data: gd }, { data: ad }] = await Promise.all([
        supabase
          .from("notifications")
          .select("*")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false })
          .limit(100),
        supabase
          .from("agreement_notifications")
          .select(
            "*, sender:users!agreement_notifications_sender_id_fkey(first_name, last_name, phone, nida_number)",
          )
          .eq("recipient_id", user.id)
          .order("created_at", { ascending: false })
          .limit(50),
      ]);
      setGeneral((gd as GeneralNotification[]) || []);
      setAgreements((ad as AgreementNotification[]) || []);
    } catch (e) {
      console.error("fetch notifications", e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user?.id]);

  useEffect(() => {
    fetch();
  }, [fetch]);

  // ─── Actions ─────────────────────────────────────────────────────────────
  const handleMarkRead = async (id: string) => {
    setGeneral((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
    await markNotificationRead(id);
  };
  const handleMarkAllRead = async () => {
    if (!user?.id) return;
    setGeneral((prev) => prev.map((n) => ({ ...n, read: true })));
    await markAllNotificationsRead(user.id);
    showToast(L("Zote zimewekwa zimesomwa", "All marked as read"), "success");
  };

  const handleAcceptAgreement = async (an: AgreementNotification) => {
    setActioningId(an.id);
    try {
      const ok = await actionAgreementNotification(an.id, "accepted");
      if (ok) {
        // Also flip the buyer_accepted/tenant_accepted flag on the application row
        const isSales = an.notification_type.includes("sales");
        const flag = isSales ? "buyer_accepted" : "tenant_accepted";
        await supabase
          .from("applications")
          .update({ [flag]: true })
          .eq("application_number", an.application_id);
        // Notify the sender that you accepted
        await supabase.from("notifications").insert({
          user_id: an.sender_id,
          title: lang === "sw" ? "Makubaliano Yamekubaliwa" : "Agreement Accepted",
          message:
            lang === "sw"
              ? `${user?.first_name} ${user?.last_name} amekubali makubaliano ${an.application_id}.`
              : `${user?.first_name} ${user?.last_name} has accepted agreement ${an.application_id}.`,
          type: "success",
          read: false,
        });
        setAgreements((prev) =>
          prev.map((a) =>
            a.id === an.id ? { ...a, is_actioned: true, action_taken: "accepted" } : a,
          ),
        );
        showToast(L("Umekubali makubaliano", "You have accepted the agreement"), "success");
      }
    } finally {
      setActioningId(null);
    }
  };

  const handleRejectAgreement = async () => {
    if (!rejectModal || !rejectReason.trim()) return;
    setActioningId(rejectModal.id);
    try {
      const ok = await actionAgreementNotification(rejectModal.id, "rejected", rejectReason);
      if (ok) {
        // Notify sender that you rejected
        await supabase.from("notifications").insert({
          user_id: rejectModal.sender_id,
          title: lang === "sw" ? "Makubaliano Yamekataliwa" : "Agreement Rejected",
          message:
            (lang === "sw"
              ? `${user?.first_name} ${user?.last_name} amekataa makubaliano ${rejectModal.application_id}. Sababu: `
              : `${user?.first_name} ${user?.last_name} has rejected agreement ${rejectModal.application_id}. Reason: `) +
            rejectReason,
          type: "error",
          read: false,
        });
        setAgreements((prev) =>
          prev.map((a) =>
            a.id === rejectModal.id
              ? { ...a, is_actioned: true, action_taken: "rejected", action_reason: rejectReason }
              : a,
          ),
        );
        showToast(L("Umekataa makubaliano", "You have rejected the agreement"), "success");
        setRejectModal(null);
        setRejectReason("");
      }
    } finally {
      setActioningId(null);
    }
  };

  // ─── Derived ────────────────────────────────────────────────────────────
  const unreadCount = general.filter((n) => !n.read).length;
  const pendingActionCount = agreements.filter((a) => !a.is_actioned).length;

  const typeIcon = (t: string) => {
    if (t.startsWith("ticket")) return <MessageSquare size={16} className="text-blue-600" />;
    if (t.startsWith("report")) return <AlertTriangle size={16} className="text-amber-600" />;
    if (t === "announcement") return <Megaphone size={16} className="text-purple-600" />;
    if (t === "agreement_update") return <FileText size={16} className="text-indigo-600" />;
    switch (t) {
      case "success":
        return <CheckCircle size={16} className="text-emerald-600" />;
      case "warning":
        return <AlertCircle size={16} className="text-amber-600" />;
      case "error":
        return <XCircle size={16} className="text-red-600" />;
      default:
        return <Info size={16} className="text-blue-600" />;
    }
  };
  const typeBg = (t: string, read: boolean) => {
    if (read) return "bg-stone-50/50";
    if (t.startsWith("ticket") || t === "agreement_update") return "bg-blue-50/70";
    if (t.startsWith("report")) return "bg-amber-50/70";
    if (t === "announcement") return "bg-purple-50/70";
    if (t.includes("resolved")) return "bg-emerald-50/70";
    switch (t) {
      case "success": return "bg-emerald-50/70";
      case "warning": return "bg-amber-50/70";
      case "error": return "bg-red-50/70";
      default: return "bg-blue-50/70";
    }
  };

  // Combine and sort by date
  const combinedItems = (() => {
    const items: (
      | { kind: "general"; data: GeneralNotification }
      | { kind: "agreement"; data: AgreementNotification }
    )[] = [];
    general.forEach((n) => items.push({ kind: "general", data: n }));
    agreements.forEach((a) => items.push({ kind: "agreement", data: a }));
    return items.sort(
      (a, b) => new Date(b.data.created_at).getTime() - new Date(a.data.created_at).getTime(),
    );
  })();

  const filteredItems = (() => {
    if (tab === "unread")
      return combinedItems.filter((i) =>
        i.kind === "general" ? !i.data.read : !i.data.is_actioned,
      );
    if (tab === "agreements") return combinedItems.filter((i) => i.kind === "agreement");
    return combinedItems;
  })();

  // ─── Loading ────────────────────────────────────────────────────────────
  if (loading)
    return (
      <div className="flex items-center justify-center min-h-[40vh]">
        <Loader2 size={32} className="animate-spin text-stone-400" />
      </div>
    );

  return (
    <div className="max-w-3xl mx-auto px-3 sm:px-6 py-4 sm:py-6 space-y-4">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-stone-900 flex items-center gap-2">
            <Bell size={22} className="text-emerald-600" />
            {L("Arifa Zako", "Your Notifications")}
            {unreadCount + pendingActionCount > 0 && (
              <span className="text-xs font-black bg-red-500 text-white px-2 py-0.5 rounded-full">
                {unreadCount + pendingActionCount}
              </span>
            )}
          </h1>
          <p className="text-xs sm:text-sm text-stone-500 mt-0.5">
            {L(
              "Hapa utaona masasisho ya maombi yako, makubaliano, na taarifa kutoka kwa ofisi.",
              "Here you see updates on your applications, agreements, and messages from the office.",
            )}
          </p>
        </div>
        <div className="flex gap-2">
          {unreadCount > 0 && (
            <button
              onClick={handleMarkAllRead}
              className="px-3 py-2 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-lg text-xs font-bold flex items-center gap-1.5"
            >
              <CheckCheck size={14} />
              <span className="hidden sm:inline">{L("Soma Zote", "Mark All Read")}</span>
            </button>
          )}
          <button
            onClick={fetch}
            disabled={refreshing}
            className="p-2 text-stone-500 hover:text-stone-800 hover:bg-stone-100 rounded-lg disabled:opacity-50"
          >
            <RefreshCw size={16} className={refreshing ? "animate-spin" : ""} />
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1.5 overflow-x-auto pb-1 -mx-3 px-3 sm:mx-0 sm:px-0">
        {[
          { v: "all", sw: "Zote", en: "All", count: combinedItems.length },
          { v: "unread", sw: "Hazijasomwa", en: "Unread", count: unreadCount + pendingActionCount },
          { v: "agreements", sw: "Makubaliano", en: "Agreements", count: agreements.length },
        ].map((t) => (
          <button
            key={t.v}
            onClick={() => setTab(t.v as Tab)}
            className={`px-3 sm:px-4 py-2 rounded-full text-xs sm:text-sm font-bold whitespace-nowrap transition-all flex items-center gap-1.5 ${
              tab === t.v
                ? "bg-stone-800 text-white"
                : "bg-stone-100 text-stone-600 hover:bg-stone-200"
            }`}
          >
            {lang === "sw" ? t.sw : t.en}
            {t.count > 0 && (
              <span
                className={`text-[10px] font-black px-1.5 py-0.5 rounded-full ${
                  tab === t.v ? "bg-white/20 text-white" : "bg-stone-200 text-stone-700"
                }`}
              >
                {t.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* List */}
      <div className="space-y-2">
        {filteredItems.length === 0 ? (
          <div className="bg-white rounded-2xl border border-stone-200 p-12 text-center">
            <BellOff size={40} className="mx-auto text-stone-300 mb-3" />
            <p className="font-bold text-stone-600">{L("Hakuna arifa", "No notifications")}</p>
            <p className="text-xs text-stone-400 mt-1">
              {L("Arifa mpya zitaonekana hapa", "New notifications will appear here")}
            </p>
          </div>
        ) : (
          filteredItems.map((item) => {
            if (item.kind === "general") {
              const n = item.data;
              return (
                <div
                  key={`g-${n.id}`}
                  onClick={() => !n.read && handleMarkRead(n.id)}
                  className={`relative border rounded-xl p-4 transition-all cursor-pointer ${typeBg(n.type, n.read)} hover:shadow-sm`}
                >
                  <div className="flex items-start gap-3">
                    <div className="shrink-0 mt-0.5">{typeIcon(n.type)}</div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2 mb-0.5">
                        <h3
                          className={`font-bold text-sm ${n.read ? "text-stone-700" : "text-stone-900"}`}
                        >
                          {n.title}
                        </h3>
                        {!n.read && (
                          <span className="w-2 h-2 rounded-full bg-blue-500 shrink-0 mt-1.5" />
                        )}
                      </div>
                      {n.message && (
                        <p
                          className={`text-xs leading-relaxed ${n.read ? "text-stone-500" : "text-stone-700"}`}
                        >
                          {n.message}
                        </p>
                      )}
                      <p className="text-[10px] text-stone-400 font-medium mt-1.5">
                        {new Date(n.created_at).toLocaleString(lang === "sw" ? "sw-TZ" : "en-US")}
                      </p>
                    </div>
                  </div>
                </div>
              );
            }

            // Agreement notification
            const a = item.data;
            const isSales = a.notification_type.includes("sales");
            const senderName = a.sender
              ? `${a.sender.first_name} ${a.sender.last_name}`
              : L("Mtumiaji", "A user");
            const actioned = a.is_actioned;
            const acceptedNotRejected = a.action_taken === "accepted";
            const isPending = !actioned;

            return (
              <div
                key={`a-${a.id}`}
                className={`border-2 rounded-xl overflow-hidden ${
                  isPending
                    ? "bg-violet-50 border-violet-300"
                    : acceptedNotRejected
                      ? "bg-emerald-50/40 border-emerald-200"
                      : "bg-red-50/40 border-red-200"
                }`}
              >
                <div className="p-4">
                  <div className="flex items-start gap-3">
                    <div
                      className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                        isPending
                          ? "bg-violet-100"
                          : acceptedNotRejected
                            ? "bg-emerald-100"
                            : "bg-red-100"
                      }`}
                    >
                      <FileSignature
                        size={18}
                        className={
                          isPending
                            ? "text-violet-700"
                            : acceptedNotRejected
                              ? "text-emerald-700"
                              : "text-red-700"
                        }
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-black text-sm text-stone-900">
                          {isSales
                            ? L(
                                "Makubaliano ya Mauzo Yamewasilishwa Kwako",
                                "Sales Agreement Filed With You",
                              )
                            : L(
                                "Makubaliano ya Pango Yamewasilishwa Kwako",
                                "Rental Agreement Filed With You",
                              )}
                        </h3>
                        {isPending && (
                          <span className="text-[9px] font-black bg-violet-200 text-violet-800 px-2 py-0.5 rounded-full">
                            ⏳ {L("INAHITAJI HATUA", "ACTION REQUIRED")}
                          </span>
                        )}
                        {actioned && acceptedNotRejected && (
                          <span className="text-[9px] font-black bg-emerald-200 text-emerald-800 px-2 py-0.5 rounded-full">
                            ✓ {L("UMEKUBALI", "ACCEPTED")}
                          </span>
                        )}
                        {actioned && !acceptedNotRejected && (
                          <span className="text-[9px] font-black bg-red-200 text-red-800 px-2 py-0.5 rounded-full">
                            ✗ {L("UMEKATAA", "REJECTED")}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-stone-700 mt-1 leading-relaxed">{a.message}</p>

                      {/* Sender info */}
                      {a.sender && (
                        <div className="mt-2 bg-white/70 rounded-lg p-2 text-[11px] text-stone-600">
                          <p>
                            <span className="text-stone-400 font-bold">
                              {L("Kutoka:", "From:")}
                            </span>{" "}
                            <span className="font-bold text-stone-700">{senderName}</span>
                          </p>
                          {a.sender.phone && (
                            <p>
                              <span className="text-stone-400 font-bold">
                                {L("Simu:", "Phone:")}
                              </span>{" "}
                              <span className="font-mono">{a.sender.phone}</span>
                            </p>
                          )}
                        </div>
                      )}

                      {actioned && a.action_reason && (
                        <div className="mt-2 bg-white border border-stone-200 rounded-lg p-2 text-xs">
                          <p className="text-[10px] font-black text-stone-400 uppercase tracking-wider mb-0.5">
                            {L("Sababu Yako", "Your Reason")}
                          </p>
                          <p className="text-stone-700">{a.action_reason}</p>
                        </div>
                      )}

                      <p className="text-[10px] text-stone-400 font-medium mt-2">
                        {new Date(a.created_at).toLocaleString(lang === "sw" ? "sw-TZ" : "en-US")}
                      </p>
                    </div>
                  </div>

                  {/* Action buttons (only when pending) */}
                  {isPending && (
                    <div className="grid grid-cols-2 gap-2 mt-3 pt-3 border-t border-violet-200">
                      <button
                        onClick={() => setRejectModal(a)}
                        disabled={actioningId === a.id}
                        className="px-3 py-2.5 bg-white hover:bg-red-50 border border-red-300 text-red-700 rounded-lg font-bold text-xs flex items-center justify-center gap-1.5 disabled:opacity-50"
                      >
                        <XCircle size={14} /> {L("Kataa", "Reject")}
                      </button>
                      <button
                        onClick={() => handleAcceptAgreement(a)}
                        disabled={actioningId === a.id}
                        className="px-3 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold text-xs flex items-center justify-center gap-1.5 disabled:opacity-50 shadow"
                      >
                        {actioningId === a.id ? (
                          <Loader2 size={14} className="animate-spin" />
                        ) : (
                          <Check size={14} />
                        )}
                        {L("Kubali", "Accept")}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Reject modal */}
      <AnimatePresence>
        {rejectModal && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => {
                setRejectModal(null);
                setRejectReason("");
              }}
              className="fixed inset-0 bg-stone-900/60 z-50"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="fixed inset-x-4 top-1/2 -translate-y-1/2 sm:left-1/2 sm:-translate-x-1/2 sm:inset-x-auto sm:w-[500px] bg-white rounded-2xl p-5 shadow-2xl z-[60]"
            >
              <div className="flex items-start gap-3 mb-4">
                <div className="w-10 h-10 bg-red-100 rounded-xl flex items-center justify-center shrink-0">
                  <ShieldAlert size={20} className="text-red-600" />
                </div>
                <div>
                  <h3 className="font-black text-stone-900">
                    {L("Kataa Makubaliano", "Reject Agreement")}
                  </h3>
                  <p className="text-xs text-stone-500 mt-0.5">
                    {L(
                      "Eleza sababu — mtoa makubaliano ataona ujumbe huu",
                      "State a reason — the sender will see this message",
                    )}
                  </p>
                </div>
              </div>
              <textarea
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                rows={4}
                placeholder={L("Sababu ya kukataa...", "Reason for rejection...")}
                className="w-full px-3 py-2.5 border border-stone-200 rounded-xl text-sm focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none resize-none"
              />
              <div className="flex gap-2 mt-4">
                <button
                  onClick={() => {
                    setRejectModal(null);
                    setRejectReason("");
                  }}
                  className="flex-1 py-2.5 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-xl font-bold text-sm"
                >
                  {L("Ghairi", "Cancel")}
                </button>
                <button
                  onClick={handleRejectAgreement}
                  disabled={!rejectReason.trim() || actioningId !== null}
                  className="flex-1 py-2.5 bg-red-600 hover:bg-red-700 disabled:bg-stone-300 text-white rounded-xl font-bold text-sm flex items-center justify-center gap-1.5"
                >
                  {actioningId ? (
                    <Loader2 size={14} className="animate-spin" />
                  ) : (
                    <XCircle size={14} />
                  )}
                  {L("Kataa", "Reject")}
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

export default Notifications;
