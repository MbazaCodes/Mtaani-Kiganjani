import React, { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Send,
  Loader2,
  CheckCircle2,
  Clock,
  AlertCircle,
  MessageSquare,
  ChevronRight,
  ChevronDown,
  Paperclip,
  ArrowLeft,
  User,
  Shield,
  X,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";
import { useLanguage } from "@/context/LanguageContext";
import { useToast } from "@/context/ToastContext";
import { cn } from "@/lib/utils";

// ── Categories ───────────────────────────────────────────────────────────────
const TICKET_CATEGORIES = [
  { value: "general_enquiry", en: "General Enquiry", sw: "Swali la Kawaida" },
  { value: "technical_support", en: "Technical Support", sw: "Msaada wa Kiufundi" },
  { value: "service_complaint", en: "Service Complaint", sw: "Malalamiko ya Huduma" },
  { value: "infrastructure_issue", en: "Infrastructure Issue", sw: "Tatizo la Miundombinu" },
  { value: "utilities_issue", en: "Utilities Issue", sw: "Tatizo la Huduma za Msingi" },
  { value: "corruption_report", en: "Corruption Report", sw: "Taarifa ya Rushwa" },
  { value: "security_concern", en: "Security Concern", sw: "Wasiwasi wa Usalama" },
  { value: "environmental_concern", en: "Environmental Concern", sw: "Wasiwasi wa Mazingira" },
  { value: "public_health_concern", en: "Public Health Concern", sw: "Wasiwasi wa Afya ya Umma" },
  { value: "other", en: "Other", sw: "Nyingine" },
];

const STATUS_CONFIG: Record<string, { color: string; label: { en: string; sw: string } }> = {
  submitted: { color: "bg-amber-100 text-amber-800", label: { en: "Submitted", sw: "Imetumwa" } },
  under_review: { color: "bg-blue-100 text-blue-800", label: { en: "Under Review", sw: "Inakaguliwa" } },
  assigned: { color: "bg-indigo-100 text-indigo-800", label: { en: "Assigned", sw: "Imepewa" } },
  in_progress: { color: "bg-purple-100 text-purple-800", label: { en: "In Progress", sw: "Inaendelea" } },
  escalated: { color: "bg-orange-100 text-orange-800", label: { en: "Escalated", sw: "Imepandishwa" } },
  resolved: { color: "bg-emerald-100 text-emerald-800", label: { en: "Resolved", sw: "Imemalizika" } },
  closed: { color: "bg-stone-100 text-stone-600", label: { en: "Closed", sw: "Imefungwa" } },
};

const PRIORITY_CONFIG: Record<string, { color: string; label: string }> = {
  low: { color: "bg-stone-100 text-stone-600", label: "Low" },
  normal: { color: "bg-blue-50 text-blue-700", label: "Normal" },
  high: { color: "bg-amber-50 text-amber-700", label: "High" },
  urgent: { color: "bg-red-50 text-red-700", label: "Urgent" },
};

// ── Types ────────────────────────────────────────────────────────────────────
interface Ticket {
  id: string;
  ticket_number: string;
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
  updated_at: string;
}

interface TicketResponse {
  id: string;
  ticket_id: string;
  user_id: string;
  message: string;
  is_internal_note: boolean;
  created_at: string;
  users?: { first_name: string; last_name: string; role: string };
}

// ── Component ────────────────────────────────────────────────────────────────
export function CitizenSupport() {
  const { user } = useAuth();
  const { lang } = useLanguage();
  const { showToast } = useToast();
  const L = useCallback((sw: string, en: string) => (lang === "sw" ? sw : en), [lang]);
  const sw = lang === "sw";

  const [view, setView] = useState<"list" | "create" | "detail">("list");
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [responses, setResponses] = useState<TicketResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Create form
  const [category, setCategory] = useState("");
  const [subject, setSubject] = useState("");
  const [description, setDescription] = useState("");
  const [replyText, setReplyText] = useState("");
  const [sendingReply, setSendingReply] = useState(false);

  // ── Fetch tickets ──────────────────────────────────────────────────────
  const fetchTickets = useCallback(async () => {
    if (!user?.id) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("support_tickets")
        .select("*")
        .eq("citizen_id", user.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      setTickets((data as Ticket[]) || []);
    } catch {
      // Table may not exist yet
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    fetchTickets();
  }, [fetchTickets]);

  // ── Submit ticket ──────────────────────────────────────────────────────
  const handleSubmit = async () => {
    if (!user || !category || !subject.trim() || !description.trim()) {
      showToast(L("Jaza sehemu zote zinazohitajika", "Fill all required fields"), "error");
      return;
    }
    setSubmitting(true);
    try {
      const ticketNumber = `TK-${new Date().getFullYear()}${String(new Date().getMonth() + 1).padStart(2, "0")}${String(new Date().getDate()).padStart(2, "0")}-${Math.floor(Math.random() * 9000 + 1000)}`;

      // Check for auto-routing
      let assignedDepartmentId: string | null = null;
      try {
        const { data: rule } = await supabase
          .from("department_routing_rules")
          .select("department_id")
          .eq("category", category)
          .eq("category_type", "ticket")
          .eq("active", true)
          .maybeSingle();
        if (rule?.department_id) assignedDepartmentId = rule.department_id;
      } catch {
        // Routing table may not exist
      }

      const { error } = await supabase.from("support_tickets").insert({
        ticket_number: ticketNumber,
        citizen_id: user.id,
        category,
        subject: subject.trim(),
        description: description.trim(),
        region: user.region || null,
        district: user.district || null,
        ward: user.ward || null,
        street: user.street || null,
        assigned_department_id: assignedDepartmentId,
        status: assignedDepartmentId ? "assigned" : "submitted",
      });

      if (error) throw error;

      showToast(
        L(`Tiketi ${ticketNumber} imetumwa!`, `Ticket ${ticketNumber} submitted!`),
        "success",
      );
      setCategory("");
      setSubject("");
      setDescription("");
      setView("list");
      fetchTickets();
    } catch (err: unknown) {
      const e = err as { message?: string };
      showToast(e.message || "Error", "error");
    } finally {
      setSubmitting(false);
    }
  };

  // ── Fetch responses ────────────────────────────────────────────────────
  const fetchResponses = async (ticketId: string) => {
    try {
      const { data } = await supabase
        .from("support_responses")
        .select("*, users:user_id(first_name, last_name, role)")
        .eq("ticket_id", ticketId)
        .eq("is_internal_note", false)
        .order("created_at", { ascending: true });
      setResponses((data as TicketResponse[]) || []);
    } catch {
      setResponses([]);
    }
  };

  const openTicketDetail = (ticket: Ticket) => {
    setSelectedTicket(ticket);
    fetchResponses(ticket.id);
    setReplyText("");
    setView("detail");
  };

  // ── Send reply ─────────────────────────────────────────────────────────
  const handleSendReply = async () => {
    if (!selectedTicket || !user || !replyText.trim()) return;
    setSendingReply(true);
    try {
      const { error } = await supabase.from("support_responses").insert({
        ticket_id: selectedTicket.id,
        user_id: user.id,
        message: replyText.trim(),
        is_internal_note: false,
      });
      if (error) throw error;
      setReplyText("");
      fetchResponses(selectedTicket.id);
      showToast(L("Jibu limetumwa", "Reply sent"), "success");
    } catch (err: unknown) {
      const e = err as { message?: string };
      showToast(e.message || "Error", "error");
    } finally {
      setSendingReply(false);
    }
  };

  // ── Stats ──────────────────────────────────────────────────────────────
  const stats = {
    total: tickets.length,
    open: tickets.filter((t) => !["resolved", "closed"].includes(t.status)).length,
    resolved: tickets.filter((t) => t.status === "resolved").length,
  };

  const getCategoryLabel = (val: string) => {
    const cat = TICKET_CATEGORIES.find((c) => c.value === val);
    return cat ? (sw ? cat.sw : cat.en) : val;
  };

  // ── RENDER ─────────────────────────────────────────────────────────────
  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-stone-900 tracking-tight">
            {view === "create"
              ? L("Tuma Tiketi", "Submit Ticket")
              : view === "detail"
                ? L("Maelezo ya Tiketi", "Ticket Details")
                : L("Msaada wa Raia", "Citizen Support")}
          </h1>
          {view === "list" && (
            <p className="text-sm text-stone-500 mt-0.5">
              {L("Tuma malalamiko, maswali, na masuala", "Submit complaints, enquiries, and issues")}
            </p>
          )}
        </div>
        {view === "list" ? (
          <button
            onClick={() => setView("create")}
            className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-sm flex items-center gap-2 transition-colors"
          >
            <Send size={16} />
            {L("Tiketi Mpya", "New Ticket")}
          </button>
        ) : (
          <button
            onClick={() => setView("list")}
            className="px-4 py-2 text-stone-600 hover:bg-stone-100 rounded-xl font-bold text-sm flex items-center gap-2"
          >
            <ArrowLeft size={16} />
            {L("Rudi", "Back")}
          </button>
        )}
      </div>

      {/* ── CREATE VIEW ─────────────────────────────────────────────────── */}
      {view === "create" && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="bg-white rounded-2xl border border-stone-200 p-6 space-y-5">
          {/* Category */}
          <div>
            <label className="block text-xs font-bold text-stone-600 uppercase tracking-wider mb-1.5">
              {L("Aina ya Tatizo", "Category")} *
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full px-4 py-3 border border-stone-200 rounded-xl focus:ring-2 focus:ring-emerald-500 text-sm bg-white"
            >
              <option value="">{L("-- Chagua --", "-- Select --")}</option>
              {TICKET_CATEGORIES.map((cat) => (
                <option key={cat.value} value={cat.value}>
                  {sw ? cat.sw : cat.en}
                </option>
              ))}
            </select>
          </div>

          {/* Subject */}
          <div>
            <label className="block text-xs font-bold text-stone-600 uppercase tracking-wider mb-1.5">
              {L("Mada", "Subject")} *
            </label>
            <input
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder={L("Eleza tatizo kwa ufupi", "Briefly describe the issue")}
              className="w-full px-4 py-3 border border-stone-200 rounded-xl focus:ring-2 focus:ring-emerald-500 text-sm"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-bold text-stone-600 uppercase tracking-wider mb-1.5">
              {L("Maelezo Kamili", "Full Description")} *
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={5}
              placeholder={L("Eleza tatizo lako kwa undani...", "Describe your issue in detail...")}
              className="w-full px-4 py-3 border border-stone-200 rounded-xl focus:ring-2 focus:ring-emerald-500 text-sm resize-none"
            />
          </div>

          {/* Location info */}
          <div className="bg-stone-50 rounded-xl p-3 text-xs text-stone-500">
            <p className="font-bold mb-1">{L("Eneo lako (kutoka wasifu)", "Your location (from profile)")}</p>
            <p>
              {user?.region || "—"} / {user?.district || "—"} / {user?.ward || "—"}
            </p>
          </div>

          <button
            onClick={handleSubmit}
            disabled={submitting || !category || !subject.trim() || !description.trim()}
            className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-sm flex items-center justify-center gap-2 disabled:opacity-50 transition-colors"
          >
            {submitting ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
            {L("Tuma Tiketi", "Submit Ticket")}
          </button>
        </motion.div>
      )}

      {/* ── LIST VIEW ───────────────────────────────────────────────────── */}
      {view === "list" && (
        <>
          {/* Stats */}
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-white border border-stone-200 rounded-xl p-4">
              <p className="text-2xl font-black text-stone-900">{stats.total}</p>
              <p className="text-xs font-bold text-stone-500">{L("Jumla", "Total")}</p>
            </div>
            <div className="bg-amber-50 border border-amber-100 rounded-xl p-4">
              <p className="text-2xl font-black text-amber-700">{stats.open}</p>
              <p className="text-xs font-bold text-stone-500">{L("Wazi", "Open")}</p>
            </div>
            <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-4">
              <p className="text-2xl font-black text-emerald-700">{stats.resolved}</p>
              <p className="text-xs font-bold text-stone-500">{L("Zimemalizika", "Resolved")}</p>
            </div>
          </div>

          {/* Ticket list */}
          {loading ? (
            <div className="flex items-center justify-center py-16 text-stone-400">
              <Loader2 size={24} className="animate-spin mr-2" />
            </div>
          ) : tickets.length === 0 ? (
            <div className="text-center py-16 bg-white rounded-2xl border border-stone-200">
              <MessageSquare size={40} className="mx-auto text-stone-300 mb-3" />
              <p className="font-bold text-stone-600">{L("Hakuna tiketi bado", "No tickets yet")}</p>
              <p className="text-sm text-stone-400 mt-1">
                {L("Tuma tiketi yako ya kwanza", "Submit your first ticket")}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {tickets.map((ticket) => {
                const statusCfg = STATUS_CONFIG[ticket.status] || STATUS_CONFIG.submitted;
                const priorityCfg = PRIORITY_CONFIG[ticket.priority] || PRIORITY_CONFIG.normal;
                return (
                  <div
                    key={ticket.id}
                    onClick={() => openTicketDetail(ticket)}
                    className="bg-white border border-stone-200 rounded-2xl p-4 hover:border-emerald-200 cursor-pointer transition-colors"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs font-mono text-stone-400">{ticket.ticket_number}</span>
                          <span className={cn("px-2 py-0.5 text-[10px] font-bold rounded-md uppercase", statusCfg.color)}>
                            {sw ? statusCfg.label.sw : statusCfg.label.en}
                          </span>
                          <span className={cn("px-2 py-0.5 text-[10px] font-bold rounded-md uppercase", priorityCfg.color)}>
                            {priorityCfg.label}
                          </span>
                        </div>
                        <p className="font-bold text-stone-900 text-sm truncate">{ticket.subject}</p>
                        <p className="text-xs text-stone-400 mt-0.5">
                          {getCategoryLabel(ticket.category)} · {new Date(ticket.created_at).toLocaleDateString("sw-TZ")}
                        </p>
                      </div>
                      <ChevronRight size={16} className="text-stone-300 shrink-0 mt-2" />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* ── DETAIL VIEW ─────────────────────────────────────────────────── */}
      {view === "detail" && selectedTicket && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
          {/* Ticket info card */}
          <div className="bg-white border border-stone-200 rounded-2xl p-5">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-xs font-mono text-stone-400">{selectedTicket.ticket_number}</span>
              <span className={cn("px-2 py-0.5 text-[10px] font-bold rounded-md uppercase", (STATUS_CONFIG[selectedTicket.status] || STATUS_CONFIG.submitted).color)}>
                {sw
                  ? (STATUS_CONFIG[selectedTicket.status] || STATUS_CONFIG.submitted).label.sw
                  : (STATUS_CONFIG[selectedTicket.status] || STATUS_CONFIG.submitted).label.en}
              </span>
            </div>
            <h2 className="text-lg font-black text-stone-900">{selectedTicket.subject}</h2>
            <p className="text-sm text-stone-600 mt-2 whitespace-pre-wrap">{selectedTicket.description}</p>
            <div className="flex items-center gap-4 mt-3 text-xs text-stone-400">
              <span>{getCategoryLabel(selectedTicket.category)}</span>
              <span>·</span>
              <span>{new Date(selectedTicket.created_at).toLocaleDateString("sw-TZ")}</span>
              {selectedTicket.ward && (
                <>
                  <span>·</span>
                  <span>{selectedTicket.ward}</span>
                </>
              )}
            </div>
            {selectedTicket.resolution_note && (
              <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-3 mt-3">
                <p className="text-xs font-bold text-emerald-700 mb-1">
                  {L("Jibu la Mwisho", "Resolution")}
                </p>
                <p className="text-sm text-stone-700">{selectedTicket.resolution_note}</p>
              </div>
            )}
          </div>

          {/* Response thread */}
          <div className="bg-white border border-stone-200 rounded-2xl p-5">
            <h3 className="text-sm font-bold text-stone-600 uppercase tracking-wider mb-4 flex items-center gap-2">
              <MessageSquare size={14} />
              {L("Mazungumzo", "Conversation")} ({responses.length})
            </h3>

            {responses.length === 0 ? (
              <p className="text-sm text-stone-400 py-4 text-center">
                {L("Hakuna majibu bado", "No responses yet")}
              </p>
            ) : (
              <div className="space-y-3 mb-4">
                {responses.map((r) => {
                  const isStaff = r.users?.role === "staff" || r.users?.role === "admin";
                  return (
                    <div
                      key={r.id}
                      className={cn(
                        "p-3 rounded-xl text-sm",
                        isStaff ? "bg-blue-50 border border-blue-100 ml-4" : "bg-stone-50 mr-4",
                      )}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        {isStaff ? (
                          <Shield size={12} className="text-blue-600" />
                        ) : (
                          <User size={12} className="text-stone-500" />
                        )}
                        <span className="text-xs font-bold text-stone-600">
                          {r.users?.first_name} {r.users?.last_name}
                        </span>
                        <span className="text-[10px] text-stone-400">
                          {new Date(r.created_at).toLocaleString("sw-TZ")}
                        </span>
                      </div>
                      <p className="text-stone-700 whitespace-pre-wrap">{r.message}</p>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Reply (only if not closed) */}
            {selectedTicket.status !== "closed" && (
              <div className="flex gap-2 pt-3 border-t border-stone-100">
                <input
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  placeholder={L("Andika jibu...", "Type a reply...")}
                  className="flex-1 px-4 py-2.5 border border-stone-200 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500"
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      handleSendReply();
                    }
                  }}
                />
                <button
                  onClick={handleSendReply}
                  disabled={sendingReply || !replyText.trim()}
                  className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-sm disabled:opacity-50 flex items-center gap-1.5 transition-colors"
                >
                  {sendingReply ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
                </button>
              </div>
            )}
          </div>
        </motion.div>
      )}
    </motion.div>
  );
}
