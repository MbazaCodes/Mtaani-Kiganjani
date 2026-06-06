import React, { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Mail,
  Send,
  Inbox,
  ArrowLeft,
  Search,
  Loader2,
  ChevronRight,
  User,
  Shield,
  Building2,
  Plus,
  Reply,
  Paperclip,
  X,
  Clock,
  CheckCircle2,
  FileText,
  Download,
  MessageSquare,
  AlertCircle,
  Star,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";
import { useLanguage } from "@/context/LanguageContext";
import { useToast } from "@/context/ToastContext";
import { cn } from "@/lib/utils";

interface Message {
  id: string;
  sender_id: string;
  recipient_id?: string;
  recipient_department_id?: string;
  thread_id?: string;
  case_type?: string;
  case_id?: string;
  case_ref?: string;
  attachments?: { name: string; type: string; dataUrl: string; size: number }[];
  subject: string;
  body: string;
  priority: string;
  read: boolean;
  created_at: string;
  sender?: { first_name: string; last_name: string; role: string };
  recipient?: { first_name: string; last_name: string; role: string };
  department?: { name: string; code: string };
}

interface UserResult {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  role: string;
  position?: string;
}

interface DeptResult {
  id: string;
  name: string;
  code: string;
}

export function CommunicationsCenter() {
  const { user } = useAuth();
  const { lang } = useLanguage();
  const { showToast } = useToast();
  const L = useCallback((sw: string, en: string) => (lang === "sw" ? sw : en), [lang]);

  const [view, setView] = useState<"inbox" | "sent" | "compose" | "thread">("inbox");
  const [messages, setMessages] = useState<Message[]>([]);
  const [sentMessages, setSentMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedThread, setSelectedThread] = useState<Message | null>(null);
  const [threadReplies, setThreadReplies] = useState<Message[]>([]);

  // Compose state
  const [recipientType, setRecipientType] = useState<
    "user" | "department" | "regional" | "district" | "ward" | "support"
  >("user");
  const [recipientSearch, setRecipientSearch] = useState("");
  const [searchResults, setSearchResults] = useState<UserResult[]>([]);
  const [deptResults, setDeptResults] = useState<DeptResult[]>([]);
  const [selectedRecipient, setSelectedRecipient] = useState<UserResult | null>(null);
  const [selectedDept, setSelectedDept] = useState<DeptResult | null>(null);
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [priority, setPriority] = useState("normal");
  const [caseRef, setCaseRef] = useState("");
  const [userCases, setUserCases] = useState<{ ref: string; label: string; type: string }[]>([]);
  const [showCaseDropdown, setShowCaseDropdown] = useState(false);
  const [attachments, setAttachments] = useState<
    { name: string; type: string; dataUrl: string; size: number }[]
  >([]);
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const [sending, setSending] = useState(false);
  const [replyText, setReplyText] = useState("");
  const [sendingReply, setSendingReply] = useState(false);
  const [searching, setSearching] = useState(false);

  // ── Fetch inbox ────────────────────────────────────────────────────────
  const fetchInbox = useCallback(async () => {
    if (!user?.id) return;
    setLoading(true);
    try {
      const results: Message[] = [];

      // 1. Messages addressed directly to this user
      const { data: direct } = await supabase
        .from("messages")
        .select(
          "*, sender:sender_id(first_name, last_name, role), department:recipient_department_id(name, code)",
        )
        .eq("recipient_id", user.id)
        .is("thread_id", null)
        .eq("archived", false)
        .order("created_at", { ascending: false })
        .limit(100);
      if (direct) results.push(...(direct as Message[]));

      // 2. If this user is a department member, also fetch messages to their department(s)
      const deptIds: string[] = [];
      if (user.department_id) deptIds.push(user.department_id);
      // Also check department_users membership table
      const { data: memberships } = await supabase
        .from("department_users")
        .select("department_id")
        .eq("user_id", user.id);
      (memberships || []).forEach((m: { department_id: string }) => {
        if (m.department_id && !deptIds.includes(m.department_id)) deptIds.push(m.department_id);
      });

      if (deptIds.length > 0) {
        const { data: deptMsgs } = await supabase
          .from("messages")
          .select(
            "*, sender:sender_id(first_name, last_name, role), department:recipient_department_id(name, code)",
          )
          .in("recipient_department_id", deptIds)
          .is("thread_id", null)
          .eq("archived", false)
          .order("created_at", { ascending: false })
          .limit(100);
        if (deptMsgs) {
          for (const m of deptMsgs as Message[]) {
            if (!results.find((r) => r.id === m.id)) results.push(m);
          }
        }
      }

      // Sort by date
      results.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      setMessages(results);
    } catch {
      setMessages([]);
    } finally {
      setLoading(false);
    }
  }, [user?.id, user?.department_id]);

  const fetchSent = useCallback(async () => {
    if (!user?.id) return;
    try {
      const { data } = await supabase
        .from("messages")
        .select(
          "*, recipient:recipient_id(first_name, last_name, role), department:recipient_department_id(name, code)",
        )
        .eq("sender_id", user.id)
        .is("thread_id", null)
        .order("created_at", { ascending: false })
        .limit(100);
      setSentMessages((data as Message[]) || []);
    } catch {
      setSentMessages([]);
    }
  }, [user?.id]);

  useEffect(() => {
    fetchInbox();
    fetchSent();
  }, [fetchInbox, fetchSent]);

  // Fetch user's cases for the reference lookup
  useEffect(() => {
    if (!user?.id) return;
    const loadCases = async () => {
      const cases: { ref: string; label: string; type: string }[] = [];
      // Applications
      const { data: apps } = await supabase
        .from("applications")
        .select("application_number, service_name")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(30);
      (apps || []).forEach((a) => {
        if (a.application_number)
          cases.push({
            ref: a.application_number,
            label: a.service_name || "Application",
            type: "application",
          });
      });
      // Tickets
      const { data: tickets } = await supabase
        .from("support_tickets")
        .select("ticket_number, subject")
        .eq("citizen_id", user.id)
        .order("created_at", { ascending: false })
        .limit(20);
      (tickets || []).forEach((t) => {
        if (t.ticket_number)
          cases.push({ ref: t.ticket_number, label: t.subject || "Ticket", type: "ticket" });
      });
      // Reports
      const { data: reports } = await supabase
        .from("community_reports")
        .select("report_number, title")
        .eq("citizen_id", user.id)
        .order("created_at", { ascending: false })
        .limit(20);
      (reports || []).forEach((r) => {
        if (r.report_number)
          cases.push({ ref: r.report_number, label: r.title || "Report", type: "report" });
      });
      setUserCases(cases);
    };
    loadCases();
  }, [user?.id]);

  // ── Search recipients ──────────────────────────────────────────────────
  useEffect(() => {
    if (recipientType === "department") {
      // Fetch departments
      if (!recipientSearch.trim() || recipientSearch.length < 1) {
        // Show all departments
        supabase
          .from("government_departments")
          .select("id, name, code")
          .eq("active", true)
          .order("name")
          .limit(20)
          .then(({ data }) => {
            setDeptResults((data as DeptResult[]) || []);
            setSearching(false);
          });
        return;
      }
      setSearching(true);
      const timer = setTimeout(async () => {
        const { data } = await supabase
          .from("government_departments")
          .select("id, name, code")
          .or(`name.ilike.%${recipientSearch}%,code.ilike.%${recipientSearch}%`)
          .eq("active", true)
          .limit(10);
        setDeptResults((data as DeptResult[]) || []);
        setSearching(false);
      }, 300);
      return () => clearTimeout(timer);
    }

    // Staff categories
    setSearching(true);
    const timer = setTimeout(async () => {
      let query = supabase
        .from("users")
        .select("id, first_name, last_name, email, role, position")
        .eq("role", "staff")
        .neq("id", user?.id || "");

      if (recipientType === "regional") {
        query = query.not("assigned_region", "is", null);
        if (recipientSearch && recipientSearch !== "regional") {
          query = query.or(
            `first_name.ilike.%${recipientSearch}%,last_name.ilike.%${recipientSearch}%,assigned_region.ilike.%${recipientSearch}%`,
          );
        }
      } else if (recipientType === "district") {
        query = query.not("assigned_district", "is", null);
        if (recipientSearch && recipientSearch !== "district") {
          query = query.or(
            `first_name.ilike.%${recipientSearch}%,last_name.ilike.%${recipientSearch}%,assigned_district.ilike.%${recipientSearch}%`,
          );
        }
      } else if (recipientType === "ward") {
        query = query.not("ward", "is", null);
        if (recipientSearch && recipientSearch !== "ward") {
          query = query.or(
            `first_name.ilike.%${recipientSearch}%,last_name.ilike.%${recipientSearch}%,ward.ilike.%${recipientSearch}%`,
          );
        }
      } else if (recipientType === "support") {
        // Support team = any staff
        if (recipientSearch && recipientSearch !== "support") {
          query = query.or(
            `first_name.ilike.%${recipientSearch}%,last_name.ilike.%${recipientSearch}%`,
          );
        }
      } else {
        // Generic user search
        if (!recipientSearch.trim() || recipientSearch.length < 2) {
          setSearchResults([]);
          setSearching(false);
          return;
        }
        query = supabase
          .from("users")
          .select("id, first_name, last_name, email, role, position")
          .or(
            `first_name.ilike.%${recipientSearch}%,last_name.ilike.%${recipientSearch}%,email.ilike.%${recipientSearch}%`,
          )
          .neq("id", user?.id || "");
      }

      const { data } = await query.limit(10);
      setSearchResults((data as UserResult[]) || []);
      setSearching(false);
    }, 300);
    return () => clearTimeout(timer);
  }, [recipientSearch, recipientType, user?.id]);

  // ── Open thread ────────────────────────────────────────────────────────
  const openThread = async (msg: Message) => {
    setSelectedThread(msg);
    // Mark as read (direct or department message)
    if (!msg.read && (msg.recipient_id === user?.id || msg.recipient_department_id)) {
      await supabase.from("messages").update({ read: true }).eq("id", msg.id);
    }
    // Fetch replies
    const { data } = await supabase
      .from("messages")
      .select("*, sender:sender_id(first_name, last_name, role)")
      .eq("thread_id", msg.id)
      .order("created_at", { ascending: true });
    setThreadReplies((data as Message[]) || []);
    setReplyText("");
    setView("thread");
  };

  // ── File upload handler ──────────────────────────────────────────────────
  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;
    const newAttachments: typeof attachments = [];
    for (const file of files) {
      if (file.size > 3_000_000) {
        showToast(
          L(`${file.name} ni kubwa sana (max 3MB)`, `${file.name} too large (max 3MB)`),
          "error",
        );
        continue;
      }
      const dataUrl = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.readAsDataURL(file);
      });
      newAttachments.push({ name: file.name, type: file.type, dataUrl, size: file.size });
    }
    setAttachments((prev) => [...prev, ...newAttachments].slice(0, 5));
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const removeAttachment = (index: number) => {
    setAttachments((prev) => prev.filter((_, i) => i !== index));
  };

  // ── Send message ───────────────────────────────────────────────────────
  const handleSend = async () => {
    if (!user || !subject.trim() || !body.trim()) {
      showToast(L("Jaza sehemu zote", "Fill all fields"), "error");
      return;
    }
    if (recipientType !== "department" && !selectedRecipient) {
      showToast(L("Chagua mpokeaji", "Select a recipient"), "error");
      return;
    }
    if (recipientType === "department" && !selectedDept) {
      showToast(L("Chagua idara", "Select a department"), "error");
      return;
    }
    setSending(true);
    try {
      const { error } = await supabase.from("messages").insert({
        sender_id: user.id,
        recipient_id: recipientType !== "department" ? selectedRecipient?.id : null,
        recipient_department_id: recipientType === "department" ? selectedDept?.id : null,
        subject: subject.trim(),
        body: body.trim(),
        priority,
        case_ref: caseRef.trim() || null,
        case_type: caseRef.trim() ? "general" : null,
        attachments: attachments.length > 0 ? attachments : [],
      });
      if (error) throw error;

      // Notify recipient
      if (recipientType !== "department" && selectedRecipient) {
        await supabase.from("notifications").insert({
          user_id: selectedRecipient.id,
          title: L("Ujumbe Mpya", "New Message"),
          message: `${user.first_name} ${user.last_name}: ${subject.trim()}`,
          type: "message",
        });
      }

      // ── Department message: notify officers + CC area staff for oversight ──
      if (recipientType === "department" && selectedDept) {
        // 1. Find department officers
        const { data: deptOfficers } = await supabase
          .from("department_users")
          .select("user_id")
          .eq("department_id", selectedDept.id);
        const officerIds = (deptOfficers || []).map((o: { user_id: string }) => o.user_id);
        // Also include users with department_id set directly
        const { data: deptUsers } = await supabase
          .from("users")
          .select("id")
          .eq("department_id", selectedDept.id);
        (deptUsers || []).forEach((u: { id: string }) => {
          if (!officerIds.includes(u.id)) officerIds.push(u.id);
        });

        // 2. Notify each department officer
        for (const oid of officerIds) {
          await supabase.from("notifications").insert({
            user_id: oid,
            title: L("Ujumbe kwa Idara", "Message to Department"),
            message: `${user.first_name} ${user.last_name}: ${subject.trim()}`,
            type: "message",
          });
        }

        // 3. FALLBACK + STAFF OVERSIGHT: copy the citizen's area staff so they
        //    can intervene if the department doesn't respond.
        //    Find ward/district staff matching the sender's location.
        let staffQuery = supabase
          .from("users")
          .select("id, ward, assigned_district, assigned_region")
          .eq("role", "staff");
        if (user.ward) {
          staffQuery = staffQuery.eq("ward", user.ward);
        } else if (user.district) {
          staffQuery = staffQuery.eq("assigned_district", user.district);
        } else if (user.region) {
          staffQuery = staffQuery.eq("assigned_region", user.region);
        }
        const { data: areaStaff } = await staffQuery.limit(5);

        // If no officers OR for oversight, notify area staff
        const noOfficers = officerIds.length === 0;
        for (const st of areaStaff || []) {
          await supabase.from("notifications").insert({
            user_id: st.id,
            title: noOfficers
              ? L(
                  "Idara haina afisa — Ingilia kati",
                  "Department has no officer — Please intervene",
                )
              : L("Nakala: Ujumbe kwa Idara", "CC: Message to Department"),
            message: noOfficers
              ? `${user.first_name} ${user.last_name} → ${selectedDept.name}: ${subject.trim()}`
              : `${user.first_name} ${user.last_name} → ${selectedDept.name} (${L("fuatilia", "monitor")}): ${subject.trim()}`,
            type: "message",
          });
        }
      }

      showToast(L("Ujumbe umetumwa!", "Message sent!"), "success");
      resetCompose();
      setView("sent");
      fetchSent();
      fetchInbox();
    } catch (err: unknown) {
      showToast((err as { message?: string }).message || "Error", "error");
    } finally {
      setSending(false);
    }
  };

  // ── Reply ──────────────────────────────────────────────────────────────
  const handleReply = async () => {
    if (!user || !selectedThread || !replyText.trim()) return;
    setSendingReply(true);
    try {
      // Reply goes to the other party. For department messages received by an
      // officer, reply to the original sender (citizen/staff).
      const replyTo =
        selectedThread.sender_id === user.id
          ? selectedThread.recipient_id
          : selectedThread.sender_id;

      const { error } = await supabase.from("messages").insert({
        sender_id: user.id,
        recipient_id: replyTo,
        recipient_department_id: selectedThread.recipient_department_id,
        thread_id: selectedThread.id,
        subject: `Re: ${selectedThread.subject}`,
        body: replyText.trim(),
        case_ref: selectedThread.case_ref,
        case_type: selectedThread.case_type,
      });
      if (error) throw error;

      // Notify
      if (replyTo) {
        await supabase.from("notifications").insert({
          user_id: replyTo,
          title: L("Jibu Jipya", "New Reply"),
          message: `${user.first_name} ${user.last_name}: Re: ${selectedThread.subject}`,
          type: "message",
        });
      }

      setReplyText("");
      // Refresh thread
      const { data } = await supabase
        .from("messages")
        .select("*, sender:sender_id(first_name, last_name, role)")
        .eq("thread_id", selectedThread.id)
        .order("created_at", { ascending: true });
      setThreadReplies((data as Message[]) || []);
      showToast(L("Jibu limetumwa", "Reply sent"), "success");
    } catch (err: unknown) {
      showToast((err as { message?: string }).message || "Error", "error");
    } finally {
      setSendingReply(false);
    }
  };

  const resetCompose = () => {
    setSelectedRecipient(null);
    setSelectedDept(null);
    setRecipientSearch("");
    setSubject("");
    setBody("");
    setPriority("normal");
    setCaseRef("");
    setAttachments([]);
  };

  const unreadCount = messages.filter((m) => !m.read).length;
  const getSenderName = (m: Message) =>
    m.sender ? `${m.sender.first_name} ${m.sender.last_name}` : "Unknown";
  const getRecipientName = (m: Message) =>
    m.department
      ? `${m.department.name}`
      : m.recipient
        ? `${m.recipient.first_name} ${m.recipient.last_name}`
        : "—";
  const roleIcon = (role?: string) =>
    role === "admin" || role === "staff" ? (
      <Shield size={12} className="text-blue-600" />
    ) : (
      <User size={12} className="text-stone-400" />
    );

  // ── RENDER ─────────────────────────────────────────────────────────────
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-stone-900 tracking-tight flex items-center gap-2">
            <Mail size={24} className="text-emerald-600" />
            {view === "compose"
              ? L("Ujumbe Mpya", "New Message")
              : view === "thread"
                ? L("Mazungumzo", "Conversation")
                : L("Mawasiliano", "Communications")}
          </h1>
          {view === "inbox" && unreadCount > 0 && (
            <p className="text-sm text-emerald-600 font-bold mt-0.5">
              {unreadCount} {L("haijasomwa", "unread")}
            </p>
          )}
        </div>
        {view === "inbox" || view === "sent" ? (
          <button
            onClick={() => {
              resetCompose();
              setView("compose");
            }}
            className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-sm flex items-center gap-2"
          >
            <Plus size={16} /> {L("Andika", "Compose")}
          </button>
        ) : (
          <button
            onClick={() => setView("inbox")}
            className="px-4 py-2 text-stone-600 hover:bg-stone-100 rounded-xl font-bold text-sm flex items-center gap-2"
          >
            <ArrowLeft size={16} /> {L("Rudi", "Back")}
          </button>
        )}
      </div>

      {/* Tabs (inbox/sent) */}
      {(view === "inbox" || view === "sent") && (
        <div className="flex gap-1 bg-stone-100 rounded-xl p-1">
          <button
            onClick={() => setView("inbox")}
            className={cn(
              "flex-1 py-2.5 px-3 rounded-lg text-sm font-bold transition-colors",
              view === "inbox" ? "bg-white text-stone-900 shadow-sm" : "text-stone-500",
            )}
          >
            <Inbox size={14} className="inline mr-1.5" />
            {L("Zilizoingia", "Inbox")}
            {unreadCount > 0 && (
              <span className="ml-1.5 px-1.5 py-0.5 text-[10px] bg-emerald-100 text-emerald-700 rounded-full font-bold">
                {unreadCount}
              </span>
            )}
          </button>
          <button
            onClick={() => {
              setView("sent");
              fetchSent();
            }}
            className={cn(
              "flex-1 py-2.5 px-3 rounded-lg text-sm font-bold transition-colors",
              view === "sent" ? "bg-white text-stone-900 shadow-sm" : "text-stone-500",
            )}
          >
            <Send size={14} className="inline mr-1.5" />
            {L("Zilizotumwa", "Sent")} ({sentMessages.length})
          </button>
        </div>
      )}

      {/* ── INBOX ───────────────────────────────────────────────────────── */}
      {view === "inbox" &&
        (loading ? (
          <div className="flex items-center justify-center py-16 text-stone-400">
            <Loader2 size={24} className="animate-spin" />
          </div>
        ) : messages.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-2xl border border-stone-200">
            <Inbox size={40} className="mx-auto text-stone-300 mb-3" />
            <p className="font-bold text-stone-500">{L("Hakuna ujumbe", "No messages")}</p>
          </div>
        ) : (
          <div className="space-y-2">
            {messages.map((m) => (
              <div
                key={m.id}
                onClick={() => openThread(m)}
                className={cn(
                  "bg-white border rounded-2xl p-4 cursor-pointer hover:border-emerald-200 transition-colors flex items-center gap-4",
                  m.read ? "border-stone-200" : "border-emerald-300 bg-emerald-50/30",
                )}
              >
                <div
                  className={cn(
                    "w-10 h-10 rounded-full flex items-center justify-center shrink-0",
                    m.read ? "bg-stone-100" : "bg-emerald-100",
                  )}
                >
                  {roleIcon(m.sender?.role)}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="text-sm font-bold text-stone-900 truncate">
                      {getSenderName(m)}
                    </span>
                    {m.priority === "urgent" && (
                      <Star size={12} className="text-amber-500 fill-amber-500 shrink-0" />
                    )}
                    {!m.read && <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />}
                  </div>
                  <p className="text-sm text-stone-700 truncate font-medium flex items-center gap-1">
                    {m.attachments && m.attachments.length > 0 && (
                      <Paperclip size={11} className="text-stone-400 shrink-0" />
                    )}
                    {m.subject}
                  </p>
                  <p className="text-xs text-stone-400 truncate mt-0.5">{m.body}</p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-[10px] text-stone-400">
                    {new Date(m.created_at).toLocaleDateString("sw-TZ")}
                  </p>
                  {m.case_ref && (
                    <p className="text-[10px] text-blue-600 font-mono mt-0.5">{m.case_ref}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        ))}

      {/* ── SENT ────────────────────────────────────────────────────────── */}
      {view === "sent" &&
        (sentMessages.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-2xl border border-stone-200">
            <Send size={40} className="mx-auto text-stone-300 mb-3" />
            <p className="font-bold text-stone-500">
              {L("Hakuna ujumbe uliotumwa", "No sent messages")}
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {sentMessages.map((m) => (
              <div
                key={m.id}
                onClick={() => openThread(m)}
                className="bg-white border border-stone-200 rounded-2xl p-4 cursor-pointer hover:border-emerald-200 transition-colors flex items-center gap-4"
              >
                <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center shrink-0">
                  <Send size={14} className="text-blue-600" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs text-stone-400 mb-0.5">
                    {L("Kwa:", "To:")} {getRecipientName(m)}
                  </p>
                  <p className="text-sm text-stone-900 truncate font-bold">{m.subject}</p>
                  <p className="text-xs text-stone-400 truncate mt-0.5">{m.body}</p>
                </div>
                <p className="text-[10px] text-stone-400 shrink-0">
                  {new Date(m.created_at).toLocaleDateString("sw-TZ")}
                </p>
              </div>
            ))}
          </div>
        ))}

      {/* ── COMPOSE ─────────────────────────────────────────────────────── */}
      {view === "compose" && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="bg-white rounded-2xl border border-stone-200 p-6 space-y-4"
        >
          {/* Recipient category */}
          <div>
            <label className="block text-xs font-bold text-stone-600 uppercase tracking-wider mb-1.5">
              {L("Aina ya Mpokeaji", "Recipient Type")} *
            </label>
            <select
              value={recipientType}
              onChange={(e) => {
                setRecipientType(e.target.value as typeof recipientType);
                setRecipientSearch("");
                setSelectedRecipient(null);
                setSelectedDept(null);
                // Auto-search for staff categories
                const cat = e.target.value;
                if (cat === "regional") setRecipientSearch("regional");
                else if (cat === "district") setRecipientSearch("district");
                else if (cat === "ward") setRecipientSearch("ward");
                else if (cat === "support") setRecipientSearch("support");
              }}
              className="w-full px-4 py-3 border border-stone-200 rounded-xl text-sm bg-white"
              aria-label="Recipient type"
            >
              <option value="user">{L("-- Chagua Aina --", "-- Select Type --")}</option>
              <option value="regional">{L("Mtumishi wa Mkoa", "Regional Staff")}</option>
              <option value="district">{L("Mtumishi wa Wilaya", "District Staff")}</option>
              <option value="ward">{L("Afisa wa Kata", "Ward Officer")}</option>
              <option value="support">{L("Timu ya Msaada", "Support Team")}</option>
              <option value="department">{L("Idara ya Serikali", "Government Department")}</option>
            </select>
          </div>

          {/* Recipient search */}
          <div className="relative">
            <label className="block text-xs font-bold text-stone-600 uppercase tracking-wider mb-1.5">
              {recipientType === "user" ? L("Mpokeaji", "Recipient") : L("Idara", "Department")} *
            </label>
            {selectedRecipient || selectedDept ? (
              <div className="flex items-center gap-2 px-4 py-3 border border-emerald-200 bg-emerald-50 rounded-xl">
                {selectedRecipient && (
                  <span className="text-sm font-bold text-emerald-800 flex-1">
                    {selectedRecipient.first_name} {selectedRecipient.last_name}
                    <span className="text-xs text-emerald-600 ml-2">
                      ({selectedRecipient.role})
                    </span>
                  </span>
                )}
                {selectedDept && (
                  <span className="text-sm font-bold text-indigo-800 flex-1">
                    {selectedDept.name} ({selectedDept.code})
                  </span>
                )}
                <button
                  onClick={() => {
                    setSelectedRecipient(null);
                    setSelectedDept(null);
                    setRecipientSearch("");
                  }}
                  className="p-1 text-stone-400 hover:text-red-500"
                >
                  <X size={14} />
                </button>
              </div>
            ) : (
              <>
                <div className="relative">
                  <Search
                    size={16}
                    className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-400"
                  />
                  <input
                    value={recipientSearch}
                    onChange={(e) => setRecipientSearch(e.target.value)}
                    placeholder={
                      recipientType === "department"
                        ? L("Tafuta idara...", "Search department...")
                        : recipientType === "regional"
                          ? L("Tafuta mtumishi wa mkoa...", "Search regional staff...")
                          : recipientType === "district"
                            ? L("Tafuta mtumishi wa wilaya...", "Search district staff...")
                            : recipientType === "ward"
                              ? L("Tafuta afisa wa kata...", "Search ward officer...")
                              : recipientType === "support"
                                ? L("Tafuta timu ya msaada...", "Search support team...")
                                : L("Tafuta kwa jina...", "Search by name...")
                    }
                    className="w-full pl-11 pr-4 py-3 border border-stone-200 rounded-xl text-sm"
                  />
                  {searching && (
                    <Loader2
                      size={14}
                      className="absolute right-4 top-1/2 -translate-y-1/2 animate-spin text-stone-400"
                    />
                  )}
                </div>
                {/* Search results dropdown */}
                {recipientType !== "department" && searchResults.length > 0 && (
                  <div className="absolute z-10 left-0 right-0 mt-1 bg-white border border-stone-200 rounded-xl shadow-lg max-h-48 overflow-y-auto">
                    {searchResults.map((u) => (
                      <button
                        key={u.id}
                        onClick={() => {
                          setSelectedRecipient(u);
                          setRecipientSearch("");
                          setSearchResults([]);
                        }}
                        className="w-full px-4 py-2.5 text-left hover:bg-stone-50 flex items-center gap-3 text-sm border-b border-stone-50 last:border-0"
                      >
                        {roleIcon(u.role)}
                        <span className="font-bold text-stone-900">
                          {u.first_name} {u.last_name}
                        </span>
                        <span className="text-xs text-stone-400">{u.role}</span>
                      </button>
                    ))}
                  </div>
                )}
                {recipientType === "department" && deptResults.length > 0 && (
                  <div className="absolute z-10 left-0 right-0 mt-1 bg-white border border-stone-200 rounded-xl shadow-lg max-h-48 overflow-y-auto">
                    {deptResults.map((d) => (
                      <button
                        key={d.id}
                        onClick={() => {
                          setSelectedDept(d);
                          setRecipientSearch("");
                          setDeptResults([]);
                        }}
                        className="w-full px-4 py-2.5 text-left hover:bg-stone-50 flex items-center gap-3 text-sm border-b border-stone-50 last:border-0"
                      >
                        <Building2 size={14} className="text-indigo-600" />
                        <span className="font-bold text-stone-900">{d.name}</span>
                        <span className="text-xs text-stone-400">{d.code}</span>
                      </button>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>

          {/* Subject */}
          <div>
            <label className="block text-xs font-bold text-stone-600 uppercase tracking-wider mb-1.5">
              {L("Mada", "Subject")} *
            </label>
            <input
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder={L("Mada ya ujumbe...", "Message subject...")}
              className="w-full px-4 py-3 border border-stone-200 rounded-xl text-sm"
            />
          </div>

          {/* Body */}
          <div>
            <label className="block text-xs font-bold text-stone-600 uppercase tracking-wider mb-1.5">
              {L("Ujumbe", "Message")} *
            </label>
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={5}
              placeholder={L("Andika ujumbe wako hapa...", "Type your message here...")}
              className="w-full px-4 py-3 border border-stone-200 rounded-xl text-sm resize-none"
            />
          </div>

          {/* Case ref + Priority */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-stone-600 uppercase tracking-wider mb-1.5">
                {L("Nambari ya Kesi", "Case Reference")}
              </label>
              <div className="relative">
                <input
                  value={caseRef}
                  onChange={(e) => setCaseRef(e.target.value)}
                  onFocus={() => setShowCaseDropdown(true)}
                  placeholder={L("Chagua au andika...", "Select or type...")}
                  className="w-full px-4 py-3 border border-stone-200 rounded-xl text-sm font-mono"
                />
                {showCaseDropdown && userCases.length > 0 && (
                  <div className="absolute z-20 left-0 right-0 mt-1 bg-white border border-stone-200 rounded-xl shadow-lg max-h-52 overflow-y-auto">
                    {userCases
                      .filter(
                        (cs) =>
                          !caseRef.trim() ||
                          cs.ref.toLowerCase().includes(caseRef.toLowerCase()) ||
                          cs.label.toLowerCase().includes(caseRef.toLowerCase()),
                      )
                      .map((cs, i) => (
                        <button
                          key={i}
                          type="button"
                          onClick={() => {
                            setCaseRef(cs.ref);
                            setShowCaseDropdown(false);
                          }}
                          className="w-full px-3 py-2 text-left hover:bg-stone-50 border-b border-stone-50 last:border-0"
                        >
                          <div className="flex items-center gap-2">
                            {cs.type === "ticket" ? (
                              <MessageSquare size={12} className="text-blue-500 shrink-0" />
                            ) : cs.type === "report" ? (
                              <AlertCircle size={12} className="text-amber-500 shrink-0" />
                            ) : (
                              <FileText size={12} className="text-emerald-500 shrink-0" />
                            )}
                            <span className="text-xs font-mono font-bold text-stone-700">
                              {cs.ref}
                            </span>
                          </div>
                          <p className="text-[10px] text-stone-400 truncate ml-5">{cs.label}</p>
                        </button>
                      ))}
                    <button
                      type="button"
                      onClick={() => setShowCaseDropdown(false)}
                      className="w-full px-3 py-2 text-center text-[10px] text-stone-400 hover:bg-stone-50 border-t border-stone-100"
                    >
                      {L("Funga", "Close")}
                    </button>
                  </div>
                )}
              </div>
            </div>
            <div>
              <label className="block text-xs font-bold text-stone-600 uppercase tracking-wider mb-1.5">
                {L("Umuhimu", "Priority")}
              </label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value)}
                aria-label="Priority"
                className="w-full px-4 py-3 border border-stone-200 rounded-xl text-sm bg-white"
              >
                <option value="normal">{L("Kawaida", "Normal")}</option>
                <option value="urgent">{L("Haraka", "Urgent")}</option>
              </select>
            </div>
          </div>

          {/* Attachments */}
          <div>
            <label className="block text-xs font-bold text-stone-600 uppercase tracking-wider mb-1.5">
              {L("Viambatisho", "Attachments")} ({attachments.length}/5)
            </label>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept="image/*,application/pdf,.doc,.docx"
              onChange={handleFileSelect}
              className="hidden"
              aria-label="Upload attachments"
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={attachments.length >= 5}
              className="w-full py-3 border-2 border-dashed border-stone-200 rounded-xl text-sm font-bold text-stone-500 hover:border-emerald-300 hover:text-emerald-600 flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <Paperclip size={16} />
              {L("Pakia Hati au Picha", "Upload Documents or Media")}
            </button>
            {attachments.length > 0 && (
              <div className="mt-2 space-y-1.5">
                {attachments.map((att, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-2 bg-stone-50 rounded-lg px-3 py-2 text-sm"
                  >
                    {att.type.startsWith("image/") ? (
                      <img
                        src={att.dataUrl}
                        alt={att.name}
                        className="w-8 h-8 rounded object-cover shrink-0"
                      />
                    ) : (
                      <FileText size={16} className="text-stone-400 shrink-0" />
                    )}
                    <span className="flex-1 truncate text-stone-700">{att.name}</span>
                    <span className="text-xs text-stone-400 shrink-0">
                      {(att.size / 1024).toFixed(0)} KB
                    </span>
                    <button
                      onClick={() => removeAttachment(i)}
                      className="p-1 text-stone-400 hover:text-red-500 shrink-0"
                      aria-label="Remove attachment"
                    >
                      <X size={14} />
                    </button>
                  </div>
                ))}
              </div>
            )}
            <p className="text-[10px] text-stone-400 mt-1">
              {L("Picha, PDF, Word. Max 3MB kila moja.", "Images, PDF, Word. Max 3MB each.")}
            </p>
          </div>

          <button
            onClick={handleSend}
            disabled={sending || !subject.trim() || !body.trim()}
            className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-sm flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {sending ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
            {L("Tuma Ujumbe", "Send Message")}
          </button>
        </motion.div>
      )}

      {/* ── THREAD VIEW ─────────────────────────────────────────────────── */}
      {view === "thread" && selectedThread && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
          {/* Original message */}
          <div className="bg-white border border-stone-200 rounded-2xl p-5">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-8 h-8 rounded-full bg-stone-100 flex items-center justify-center">
                {roleIcon(selectedThread.sender?.role)}
              </div>
              <div>
                <p className="text-sm font-bold text-stone-900">{getSenderName(selectedThread)}</p>
                <p className="text-[10px] text-stone-400">
                  {new Date(selectedThread.created_at).toLocaleString("sw-TZ")}
                </p>
              </div>
              {selectedThread.priority === "urgent" && (
                <span className="ml-auto px-2 py-0.5 text-[10px] font-bold bg-amber-100 text-amber-700 rounded-md uppercase">
                  Urgent
                </span>
              )}
            </div>
            <h2 className="text-base font-black text-stone-900 mb-2">{selectedThread.subject}</h2>
            <p className="text-sm text-stone-700 whitespace-pre-wrap">{selectedThread.body}</p>
            {selectedThread.case_ref && (
              <p className="text-xs text-blue-600 font-mono mt-2 flex items-center gap-1">
                <Paperclip size={10} /> {selectedThread.case_ref}
              </p>
            )}
            {selectedThread.attachments && selectedThread.attachments.length > 0 && (
              <div className="mt-3 pt-3 border-t border-stone-100 space-y-1.5">
                <p className="text-[10px] font-bold text-stone-400 uppercase tracking-wider">
                  {L("Viambatisho", "Attachments")}
                </p>
                {selectedThread.attachments.map((att, i) => (
                  <a
                    key={i}
                    href={att.dataUrl}
                    download={att.name}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 bg-stone-50 rounded-lg px-3 py-2 text-sm hover:bg-stone-100"
                  >
                    {att.type.startsWith("image/") ? (
                      <img
                        src={att.dataUrl}
                        alt={att.name}
                        className="w-10 h-10 rounded object-cover shrink-0"
                      />
                    ) : (
                      <FileText size={18} className="text-stone-400 shrink-0" />
                    )}
                    <span className="flex-1 truncate text-stone-700 font-medium">{att.name}</span>
                    <Download size={14} className="text-emerald-600 shrink-0" />
                  </a>
                ))}
              </div>
            )}
          </div>

          {/* Replies */}
          {threadReplies.length > 0 && (
            <div className="space-y-2">
              {threadReplies.map((r) => {
                const isMe = r.sender_id === user?.id;
                return (
                  <div
                    key={r.id}
                    className={cn(
                      "p-4 rounded-2xl text-sm",
                      isMe
                        ? "bg-emerald-50 border border-emerald-100 ml-6"
                        : "bg-stone-50 border border-stone-100 mr-6",
                    )}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      {roleIcon(r.sender?.role)}
                      <span className="text-xs font-bold text-stone-600">
                        {r.sender?.first_name} {r.sender?.last_name}
                      </span>
                      <span className="text-[10px] text-stone-400">
                        {new Date(r.created_at).toLocaleString("sw-TZ")}
                      </span>
                    </div>
                    <p className="text-stone-700 whitespace-pre-wrap">{r.body}</p>
                  </div>
                );
              })}
            </div>
          )}

          {/* Reply input */}
          <div className="bg-white border border-stone-200 rounded-2xl p-4">
            <div className="flex gap-2">
              <input
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                placeholder={L("Andika jibu...", "Type a reply...")}
                className="flex-1 px-4 py-2.5 border border-stone-200 rounded-xl text-sm"
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleReply();
                  }
                }}
              />
              <button
                onClick={handleReply}
                disabled={sendingReply || !replyText.trim()}
                className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-bold disabled:opacity-50 flex items-center gap-1.5"
              >
                {sendingReply ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : (
                  <Reply size={14} />
                )}
                {L("Jibu", "Reply")}
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </motion.div>
  );
}
