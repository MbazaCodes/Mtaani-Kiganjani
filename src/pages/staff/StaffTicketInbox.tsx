import React, { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Inbox,
  Clock,
  CheckCircle2,
  MessageSquare,
  ChevronRight,
  ChevronDown,
  Loader2,
  Send,
  ArrowUpRight,
  User,
  Shield,
  X,
  AlertCircle,
  FileText,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";
import { useLanguage } from "@/context/LanguageContext";
import { useToast } from "@/context/ToastContext";
import { cn } from "@/lib/utils";

const STATUS_OPTIONS = [
  { value: "submitted", en: "Submitted", sw: "Imetumwa" },
  { value: "under_review", en: "Under Review", sw: "Inakaguliwa" },
  { value: "assigned", en: "Assigned", sw: "Imepewa" },
  { value: "in_progress", en: "In Progress", sw: "Inaendelea" },
  { value: "escalated", en: "Escalated", sw: "Imepandishwa" },
  { value: "resolved", en: "Resolved", sw: "Imemalizika" },
  { value: "closed", en: "Closed", sw: "Imefungwa" },
];

const STATUS_COLORS: Record<string, string> = {
  submitted: "bg-amber-100 text-amber-800",
  under_review: "bg-blue-100 text-blue-800",
  assigned: "bg-indigo-100 text-indigo-800",
  in_progress: "bg-purple-100 text-purple-800",
  escalated: "bg-orange-100 text-orange-800",
  resolved: "bg-emerald-100 text-emerald-800",
  closed: "bg-stone-100 text-stone-600",
};

const PRIORITY_COLORS: Record<string, string> = {
  low: "bg-stone-100 text-stone-600",
  normal: "bg-blue-50 text-blue-700",
  high: "bg-amber-50 text-amber-700",
  urgent: "bg-red-50 text-red-700",
};

const CATEGORIES: Record<string, { en: string; sw: string }> = {
  general_enquiry: { en: "General Enquiry", sw: "Swali la Kawaida" },
  technical_support: { en: "Technical Support", sw: "Msaada wa Kiufundi" },
  service_complaint: { en: "Service Complaint", sw: "Malalamiko ya Huduma" },
  infrastructure_issue: { en: "Infrastructure Issue", sw: "Tatizo la Miundombinu" },
  utilities_issue: { en: "Utilities Issue", sw: "Tatizo la Huduma za Msingi" },
  corruption_report: { en: "Corruption Report", sw: "Taarifa ya Rushwa" },
  security_concern: { en: "Security Concern", sw: "Wasiwasi wa Usalama" },
  environmental_concern: { en: "Environmental Concern", sw: "Wasiwasi wa Mazingira" },
  public_health_concern: { en: "Public Health Concern", sw: "Wasiwasi wa Afya ya Umma" },
  other: { en: "Other", sw: "Nyingine" },
};

interface Ticket {
  id: string;
  ticket_number: string;
  citizen_id: string;
  category: string;
  subject: string;
  description: string;
  priority: string;
  status: string;
  region?: string;
  district?: string;
  ward?: string;
  assigned_to?: string;
  assigned_department_id?: string;
  resolution_note?: string;
  created_at: string;
  citizen?: { first_name: string; last_name: string; email: string; phone?: string };
}

interface Response {
  id: string;
  user_id: string;
  message: string;
  is_internal_note: boolean;
  created_at: string;
  users?: { first_name: string; last_name: string; role: string };
}

export function StaffTicketInbox() {
  const { user } = useAuth();
  const { lang } = useLanguage();
  const { showToast } = useToast();
  const L = useCallback((sw: string, en: string) => (lang === "sw" ? sw : en), [lang]);
  const sw = lang === "sw";

  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("all");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [responses, setResponses] = useState<Response[]>([]);

  // Action state
  const [replyText, setReplyText] = useState("");
  const [isInternal, setIsInternal] = useState(false);
  const [sending, setSending] = useState(false);
  const [newStatus, setNewStatus] = useState("");
  const [resolutionNote, setResolutionNote] = useState("");
  const [updating, setUpdating] = useState(false);

  // ── Fetch tickets ──────────────────────────────────────────────────────
  const fetchTickets = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      let query = supabase
        .from("support_tickets")
        .select("*, citizen:citizen_id(first_name, last_name, email, phone)")
        .order("created_at", { ascending: false })
        .limit(200);

      // Filter by staff's assigned area
      if (user.ward && user.role === "staff") {
        query = query.eq("ward", user.ward);
      } else if (user.assigned_district) {
        query = query.eq("district", user.assigned_district);
      } else if (user.assigned_region) {
        query = query.eq("region", user.assigned_region);
      }

      const { data, error } = await query;
      if (error) throw error;
      setTickets((data as Ticket[]) || []);
    } catch {
      setTickets([]);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchTickets();
  }, [fetchTickets]);

  // ── Fetch responses ────────────────────────────────────────────────────
  const fetchResponses = async (ticketId: string) => {
    const { data } = await supabase
      .from("support_responses")
      .select("*, users:user_id(first_name, last_name, role)")
      .eq("ticket_id", ticketId)
      .order("created_at", { ascending: true });
    setResponses((data as Response[]) || []);
  };

  const toggleExpand = (ticket: Ticket) => {
    if (expandedId === ticket.id) {
      setExpandedId(null);
    } else {
      setExpandedId(ticket.id);
      fetchResponses(ticket.id);
      setReplyText("");
      setIsInternal(false);
      setNewStatus(ticket.status);
      setResolutionNote("");
    }
  };

  // ── Send response ──────────────────────────────────────────────────────
  const handleSendResponse = async (ticketId: string) => {
    if (!user || !replyText.trim()) return;
    setSending(true);
    try {
      const { error } = await supabase.from("support_responses").insert({
        ticket_id: ticketId,
        user_id: user.id,
        message: replyText.trim(),
        is_internal_note: isInternal,
      });
      if (error) throw error;
      setReplyText("");
      fetchResponses(ticketId);
      // Notify citizen (only for non-internal responses)
      if (!isInternal) {
        const ticket = tickets.find((t) => t.id === ticketId);
        if (ticket?.citizen_id) {
          await supabase.from("notifications").insert({
            user_id: ticket.citizen_id,
            title: "Jibu Jipya / New Response",
            message: `Tiketi ${ticket.ticket_number} imejibiwa. / Your ticket ${ticket.ticket_number} has a new response.`,
            type: "ticket_response",
          });
        }
      }
      showToast(L("Jibu limetumwa", "Response sent"), "success");
    } catch (err: unknown) {
      showToast((err as { message?: string }).message || "Error", "error");
    } finally {
      setSending(false);
    }
  };

  // ── Update status ──────────────────────────────────────────────────────
  const handleUpdateStatus = async (ticket: Ticket) => {
    if (!user || !newStatus || newStatus === ticket.status) return;
    setUpdating(true);
    try {
      const patch: Record<string, unknown> = {
        status: newStatus,
        updated_at: new Date().toISOString(),
      };
      if (newStatus === "assigned" || newStatus === "in_progress") {
        patch.assigned_to = user.id;
      }
      if (newStatus === "resolved") {
        patch.resolved_by = user.id;
        patch.resolved_at = new Date().toISOString();
        patch.resolution_note = resolutionNote.trim() || null;
      }

      const { error } = await supabase.from("support_tickets").update(patch).eq("id", ticket.id);
      if (error) throw error;

      // Notify citizen about status change
      if (ticket.citizen_id) {
        const statusLabel = STATUS_OPTIONS.find((s) => s.value === newStatus);
        await supabase.from("notifications").insert({
          user_id: ticket.citizen_id,
          title: "Hali ya Tiketi Imebadilika / Ticket Status Changed",
          message: `Tiketi ${ticket.ticket_number}: ${statusLabel?.sw || newStatus} / ${statusLabel?.en || newStatus}`,
          type: newStatus === "resolved" ? "ticket_resolved" : "ticket_updated",
        });
      }
      showToast(L("Hali imesasishwa", "Status updated"), "success");
      fetchTickets();
    } catch (err: unknown) {
      showToast((err as { message?: string }).message || "Error", "error");
    } finally {
      setUpdating(false);
    }
  };

  // ── Filter + stats ─────────────────────────────────────────────────────
  const filtered =
    statusFilter === "all" ? tickets : tickets.filter((t) => t.status === statusFilter);

  const stats = {
    total: tickets.length,
    submitted: tickets.filter((t) => t.status === "submitted").length,
    in_progress: tickets.filter((t) =>
      ["under_review", "assigned", "in_progress"].includes(t.status),
    ).length,
    resolved: tickets.filter((t) => ["resolved", "closed"].includes(t.status)).length,
  };

  // ── Render ─────────────────────────────────────────────────────────────
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      <h1 className="text-2xl font-black text-stone-900 tracking-tight flex items-center gap-2">
        <Inbox size={24} className="text-emerald-600" />
        {L("Tiketi za Msaada", "Support Tickets")}
      </h1>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-amber-50 border border-amber-100 rounded-xl p-4">
          <p className="text-2xl font-black text-amber-700">{stats.submitted}</p>
          <p className="text-xs font-bold text-stone-500">{L("Mpya", "New")}</p>
        </div>
        <div className="bg-blue-50 border border-blue-100 rounded-xl p-4">
          <p className="text-2xl font-black text-blue-700">{stats.in_progress}</p>
          <p className="text-xs font-bold text-stone-500">{L("Zinaendelea", "In Progress")}</p>
        </div>
        <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-4">
          <p className="text-2xl font-black text-emerald-700">{stats.resolved}</p>
          <p className="text-xs font-bold text-stone-500">{L("Zimemalizika", "Resolved")}</p>
        </div>
      </div>

      {/* Filter */}
      <div className="flex items-center justify-between">
        <span className="text-sm font-bold text-stone-500">
          {filtered.length} {L("tiketi", "tickets")}
        </span>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-3 py-2 border border-stone-200 rounded-xl text-sm bg-white"
        >
          <option value="all">
            {L("Zote", "All")} ({stats.total})
          </option>
          {STATUS_OPTIONS.map((s) => (
            <option key={s.value} value={s.value}>
              {sw ? s.sw : s.en} ({tickets.filter((t) => t.status === s.value).length})
            </option>
          ))}
        </select>
      </div>

      {/* Ticket list */}
      {loading ? (
        <div className="flex items-center justify-center py-16 text-stone-400">
          <Loader2 size={24} className="animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-2xl border border-stone-200">
          <Inbox size={40} className="mx-auto text-stone-300 mb-3" />
          <p className="font-bold text-stone-500">{L("Hakuna tiketi", "No tickets")}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((ticket) => {
            const isExpanded = expandedId === ticket.id;
            const citizen = ticket.citizen as Ticket["citizen"];
            const catLabel = CATEGORIES[ticket.category]
              ? sw
                ? CATEGORIES[ticket.category].sw
                : CATEGORIES[ticket.category].en
              : ticket.category;

            return (
              <div
                key={ticket.id}
                className="bg-white border border-stone-200 rounded-2xl overflow-hidden"
              >
                {/* Row */}
                <div
                  className="flex items-center justify-between px-5 py-4 cursor-pointer hover:bg-stone-50/50 transition-colors"
                  onClick={() => toggleExpand(ticket)}
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-mono text-stone-400">
                        {ticket.ticket_number}
                      </span>
                      <span
                        className={cn(
                          "px-2 py-0.5 text-[10px] font-bold rounded-md uppercase",
                          STATUS_COLORS[ticket.status],
                        )}
                      >
                        {ticket.status.replace(/_/g, " ")}
                      </span>
                      <span
                        className={cn(
                          "px-2 py-0.5 text-[10px] font-bold rounded-md uppercase",
                          PRIORITY_COLORS[ticket.priority],
                        )}
                      >
                        {ticket.priority}
                      </span>
                    </div>
                    <p className="font-bold text-stone-900 text-sm truncate">{ticket.subject}</p>
                    <p className="text-xs text-stone-400">
                      {citizen?.first_name} {citizen?.last_name} · {catLabel} ·{" "}
                      {new Date(ticket.created_at).toLocaleDateString("sw-TZ")}
                    </p>
                  </div>
                  {isExpanded ? (
                    <ChevronDown size={16} className="text-stone-400" />
                  ) : (
                    <ChevronRight size={16} className="text-stone-400" />
                  )}
                </div>

                {/* Expanded */}
                <AnimatePresence>
                  {isExpanded && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="border-t border-stone-100"
                    >
                      <div className="p-5 space-y-4">
                        {/* Description */}
                        <div className="bg-stone-50 rounded-xl p-4">
                          <p className="text-sm text-stone-700 whitespace-pre-wrap">
                            {ticket.description}
                          </p>
                          <div className="flex gap-4 mt-2 text-xs text-stone-400">
                            <span>
                              {ticket.region} / {ticket.district} / {ticket.ward}
                            </span>
                            {citizen?.phone && <span>📞 {citizen.phone}</span>}
                            {citizen?.email && <span>✉ {citizen.email}</span>}
                          </div>
                        </div>

                        {/* Response thread */}
                        {responses.length > 0 && (
                          <div className="space-y-2">
                            <p className="text-xs font-bold text-stone-500 uppercase tracking-wider">
                              {L("Mazungumzo", "Conversation")} ({responses.length})
                            </p>
                            {responses.map((r) => (
                              <div
                                key={r.id}
                                className={cn(
                                  "p-3 rounded-xl text-sm",
                                  r.is_internal_note
                                    ? "bg-amber-50 border border-amber-100 border-dashed"
                                    : r.users?.role !== "citizen"
                                      ? "bg-blue-50 border border-blue-100"
                                      : "bg-stone-50",
                                )}
                              >
                                <div className="flex items-center gap-2 mb-1">
                                  <span className="text-xs font-bold text-stone-600">
                                    {r.users?.first_name} {r.users?.last_name}
                                  </span>
                                  {r.is_internal_note && (
                                    <span className="text-[10px] text-amber-600 font-bold">
                                      [INTERNAL]
                                    </span>
                                  )}
                                  <span className="text-[10px] text-stone-400">
                                    {new Date(r.created_at).toLocaleString("sw-TZ")}
                                  </span>
                                </div>
                                <p className="text-stone-700">{r.message}</p>
                              </div>
                            ))}
                          </div>
                        )}

                        {/* Reply */}
                        <div className="space-y-2 pt-3 border-t border-stone-100">
                          <div className="flex gap-2">
                            <input
                              value={replyText}
                              onChange={(e) => setReplyText(e.target.value)}
                              placeholder={L("Andika jibu...", "Type response...")}
                              className="flex-1 px-4 py-2.5 border border-stone-200 rounded-xl text-sm"
                            />
                            <button
                              onClick={() => handleSendResponse(ticket.id)}
                              disabled={sending || !replyText.trim()}
                              className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-bold disabled:opacity-50 flex items-center gap-1.5"
                            >
                              {sending ? (
                                <Loader2 size={14} className="animate-spin" />
                              ) : (
                                <Send size={14} />
                              )}
                            </button>
                          </div>
                          <label className="flex items-center gap-2 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={isInternal}
                              onChange={(e) => setIsInternal(e.target.checked)}
                              className="w-3.5 h-3.5 rounded border-stone-300 text-amber-600"
                            />
                            <span className="text-xs text-stone-500">
                              {L(
                                "Maoni ya ndani (raia hataona)",
                                "Internal note (citizen won't see)",
                              )}
                            </span>
                          </label>
                        </div>

                        {/* Status update */}
                        <div className="flex flex-wrap items-end gap-3 pt-3 border-t border-stone-100">
                          <div className="flex-1 min-w-[160px]">
                            <label className="text-xs font-bold text-stone-500 uppercase mb-1 block">
                              {L("Badilisha Hali", "Change Status")}
                            </label>
                            <select
                              value={newStatus}
                              onChange={(e) => setNewStatus(e.target.value)}
                              className="w-full px-3 py-2 border border-stone-200 rounded-xl text-sm bg-white"
                            >
                              {STATUS_OPTIONS.map((s) => (
                                <option key={s.value} value={s.value}>
                                  {sw ? s.sw : s.en}
                                </option>
                              ))}
                            </select>
                          </div>
                          {newStatus === "resolved" && (
                            <div className="flex-1 min-w-[200px]">
                              <label className="text-xs font-bold text-stone-500 uppercase mb-1 block">
                                {L("Maelezo ya Utatuzi", "Resolution Note")}
                              </label>
                              <input
                                value={resolutionNote}
                                onChange={(e) => setResolutionNote(e.target.value)}
                                placeholder={L("Jinsi ilivyotatuliwa...", "How it was resolved...")}
                                className="w-full px-3 py-2 border border-stone-200 rounded-xl text-sm"
                              />
                            </div>
                          )}
                          <button
                            onClick={() => handleUpdateStatus(ticket)}
                            disabled={updating || newStatus === ticket.status}
                            className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-bold disabled:opacity-50 flex items-center gap-1.5"
                          >
                            {updating ? (
                              <Loader2 size={14} className="animate-spin" />
                            ) : (
                              <CheckCircle2 size={14} />
                            )}
                            {L("Sasisha", "Update")}
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </div>
      )}
    </motion.div>
  );
}
