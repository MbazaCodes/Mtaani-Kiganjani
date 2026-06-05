import React, { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Building,
  Inbox,
  Clock,
  CheckCircle2,
  AlertCircle,
  MessageSquare,
  ChevronRight,
  ChevronDown,
  X,
  Loader2,
  FileText,
  User,
  MapPin,
  Phone,
  Mail,
  Shield,
  ArrowUpRight,
  Send,
} from "lucide-react";
import { supabase, Application } from "@/lib/supabase";
import { useLanguage } from "@/context/LanguageContext";
import { useToast } from "@/context/ToastContext";
import { useAuth } from "@/context/AuthContext";
import { cn } from "@/lib/utils";

// ── Types ────────────────────────────────────────────────────────────────────
interface DeptInfo {
  id: string;
  name: string;
  name_sw?: string;
  code: string;
  level: string;
  region?: string;
  district?: string;
}

interface Escalation {
  id: string;
  application_id: string;
  from_user_id: string;
  to_department_id: string;
  status: string;
  escalation_note?: string;
  response_note?: string;
  priority: string;
  resolved_by?: string;
  resolved_at?: string;
  created_at: string;
  // Joined
  applications?: Partial<Application>;
  from_user?: { first_name: string; last_name: string; email: string; phone?: string };
}

const PRIORITY_COLORS: Record<string, string> = {
  low: "bg-stone-100 text-stone-600",
  normal: "bg-blue-50 text-blue-700",
  high: "bg-amber-50 text-amber-700",
  urgent: "bg-red-50 text-red-700",
};

const STATUS_COLORS: Record<string, string> = {
  pending: "bg-amber-100 text-amber-800",
  accepted: "bg-blue-100 text-blue-800",
  responded: "bg-purple-100 text-purple-800",
  referred: "bg-stone-100 text-stone-700",
  resolved: "bg-emerald-100 text-emerald-800",
  rejected: "bg-red-100 text-red-800",
};

// ── Component ────────────────────────────────────────────────────────────────
export function DepartmentPortal() {
  const { lang } = useLanguage();
  const { showToast } = useToast();
  const { user } = useAuth();
  const L = useCallback((sw: string, en: string) => (lang === "sw" ? sw : en), [lang]);

  const [loading, setLoading] = useState(true);
  const [department, setDepartment] = useState<DeptInfo | null>(null);
  const [deptRole, setDeptRole] = useState<string>("");
  const [escalations, setEscalations] = useState<Escalation[]>([]);
  const [selectedEsc, setSelectedEsc] = useState<Escalation | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [activeTab, setActiveTab] = useState<"escalations" | "tickets" | "reports">("escalations");
  const [tickets, setTickets] = useState<any[]>([]);
  const [reports, setReports] = useState<any[]>([]);

  // Response modal
  const [showResponseModal, setShowResponseModal] = useState(false);
  const [responseAction, setResponseAction] = useState<string>("");
  const [responseNote, setResponseNote] = useState("");
  const [responding, setResponding] = useState(false);

  // ── Fetch department membership ────────────────────────────────────────
  const fetchDeptMembership = useCallback(async () => {
    if (!user?.id) return;
    try {
      const { data: membership } = await supabase
        .from("department_users")
        .select("department_id, role, government_departments(*)")
        .eq("user_id", user.id)
        .limit(1)
        .maybeSingle();

      if (membership) {
        const dept = membership.government_departments as unknown as DeptInfo;
        setDepartment(dept);
        setDeptRole(membership.role);
      }
    } catch {
      // Not a department member
    }
  }, [user?.id]);

  // ── Fetch escalations ─────────────────────────────────────────────────
  const fetchEscalations = useCallback(async () => {
    if (!department?.id) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("escalations")
        .select(
          `*,
          applications:application_id (
            id, application_number, service_name, status, form_data, created_at,
            user_id
          ),
          from_user:from_user_id (
            first_name, last_name, email, phone
          )`,
        )
        .eq("to_department_id", department.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setEscalations((data as Escalation[]) || []);
    } catch {
      showToast(L("Hitilafu kupata maombi", "Error fetching escalations"), "error");
    } finally {
      setLoading(false);
    }
  }, [department?.id, L, showToast]);

  useEffect(() => {
    fetchDeptMembership();
  }, [fetchDeptMembership]);

  useEffect(() => {
    if (department) {
      fetchEscalations();
      // Fetch tickets assigned to this department
      supabase
        .from("support_tickets")
        .select("*, citizen:citizen_id(first_name, last_name, email)")
        .eq("assigned_department_id", department.id)
        .order("created_at", { ascending: false })
        .then(({ data }) => setTickets(data || []));
      // Fetch reports assigned to this department
      supabase
        .from("community_reports")
        .select("*, citizen:citizen_id(first_name, last_name, email)")
        .eq("assigned_department_id", department.id)
        .order("created_at", { ascending: false })
        .then(({ data }) => setReports(data || []));
    }
  }, [department, fetchEscalations]);

  // ── Handle response actions ───────────────────────────────────────────
  const openResponseModal = (action: string, esc: Escalation) => {
    setSelectedEsc(esc);
    setResponseAction(action);
    setResponseNote("");
    setShowResponseModal(true);
  };

  const handleResponse = async () => {
    if (!selectedEsc || !user) return;
    setResponding(true);
    try {
      const patch: Record<string, unknown> = {
        status: responseAction,
        response_note: responseNote.trim() || null,
        updated_at: new Date().toISOString(),
      };
      if (responseAction === "resolved" || responseAction === "rejected") {
        patch.resolved_by = user.id;
        patch.resolved_at = new Date().toISOString();
      }

      const { error } = await supabase.from("escalations").update(patch).eq("id", selectedEsc.id);

      if (error) throw error;

      showToast(L("Jibu limetumwa kikamilifu!", "Response submitted successfully!"), "success");
      setShowResponseModal(false);
      fetchEscalations();
    } catch (err: unknown) {
      const e = err as { message?: string };
      showToast(e.message || "Error", "error");
    } finally {
      setResponding(false);
    }
  };

  // ── Stats ─────────────────────────────────────────────────────────────
  const stats = {
    total: escalations.length,
    pending: escalations.filter((e) => e.status === "pending").length,
    accepted: escalations.filter((e) => e.status === "accepted").length,
    responded: escalations.filter((e) => e.status === "responded").length,
    resolved: escalations.filter((e) => e.status === "resolved").length,
  };

  const filtered =
    statusFilter === "all" ? escalations : escalations.filter((e) => e.status === statusFilter);

  // ── No department ─────────────────────────────────────────────────────
  if (!loading && !department) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center py-20"
      >
        <Building size={48} className="mx-auto text-stone-300 mb-4" />
        <h2 className="text-lg font-bold text-stone-700">
          {L("Hujaunganishwa na idara yoyote", "You are not assigned to any department")}
        </h2>
        <p className="text-sm text-stone-400 mt-2 max-w-md mx-auto">
          {L(
            "Wasiliana na msimamizi ili akuongeze kwenye idara yako.",
            "Contact the administrator to be added to your department.",
          )}
        </p>
      </motion.div>
    );
  }

  // ── Render ────────────────────────────────────────────────────────────
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      {/* Department Header */}
      <div className="bg-gradient-to-r from-emerald-600 to-teal-600 rounded-2xl p-5 text-white">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
            <Building size={24} />
          </div>
          <div>
            <h1 className="text-xl font-black tracking-tight">
              {lang === "sw" ? department?.name_sw || department?.name : department?.name}
            </h1>
            <p className="text-emerald-100 text-sm">
              {department?.code} · {department?.level?.toUpperCase()}
              {department?.region ? ` · ${department.region}` : ""}
              {department?.district ? ` / ${department.district}` : ""}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 mt-2">
          <Shield size={14} className="text-emerald-200" />
          <span className="text-emerald-100 text-xs font-medium capitalize">{deptRole}</span>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          {
            label: L("Zinazosubiri", "Pending"),
            count: stats.pending,
            color: "text-amber-600 bg-amber-50",
            icon: Clock,
          },
          {
            label: L("Zimekubaliwa", "Accepted"),
            count: stats.accepted,
            color: "text-blue-600 bg-blue-50",
            icon: CheckCircle2,
          },
          {
            label: L("Zimejibiwa", "Responded"),
            count: stats.responded,
            color: "text-purple-600 bg-purple-50",
            icon: MessageSquare,
          },
          {
            label: L("Zimemalizika", "Resolved"),
            count: stats.resolved,
            color: "text-emerald-600 bg-emerald-50",
            icon: CheckCircle2,
          },
        ].map((s) => (
          <div
            key={s.label}
            className={cn("rounded-xl p-4 border", s.color.split(" ")[1], "border-transparent")}
          >
            <div className="flex items-center gap-2">
              <s.icon size={18} className={s.color.split(" ")[0]} />
              <span className="text-2xl font-black">{s.count}</span>
            </div>
            <p className="text-xs font-bold mt-1 opacity-70">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Tabs: Escalations | Tickets | Reports */}
      <div className="flex gap-1 bg-stone-100 rounded-xl p-1 mb-4">
        {([
          { key: "escalations", label: L("Maombi", "Escalations"), count: escalations.length },
          { key: "tickets", label: L("Tiketi", "Tickets"), count: tickets.length },
          { key: "reports", label: L("Taarifa", "Reports"), count: reports.length },
        ] as const).map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={cn(
              "flex-1 py-2 px-3 rounded-lg text-sm font-bold transition-colors",
              activeTab === tab.key
                ? "bg-white text-stone-900 shadow-sm"
                : "text-stone-500 hover:text-stone-700",
            )}
          >
            {tab.label} ({tab.count})
          </button>
        ))}
      </div>

      {/* Tickets tab */}
      {activeTab === "tickets" && (
        <div className="space-y-3">
          {tickets.length === 0 ? (
            <div className="text-center py-12 bg-stone-50 rounded-2xl">
              <p className="text-stone-500 font-bold">{L("Hakuna tiketi", "No tickets")}</p>
            </div>
          ) : tickets.map((t: any) => (
            <div key={t.id} className="bg-white border border-stone-200 rounded-2xl p-4">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs font-mono text-stone-400">{t.ticket_number}</span>
                <span className="px-2 py-0.5 text-[10px] font-bold rounded-md uppercase bg-blue-100 text-blue-800">{t.status?.replace(/_/g, " ")}</span>
                <span className="px-2 py-0.5 text-[10px] font-bold rounded-md uppercase bg-amber-50 text-amber-700">{t.priority}</span>
              </div>
              <p className="font-bold text-stone-900 text-sm">{t.subject}</p>
              <p className="text-xs text-stone-500 mt-1 line-clamp-2">{t.description}</p>
              <p className="text-xs text-stone-400 mt-1">
                {t.citizen?.first_name} {t.citizen?.last_name} · {t.ward || t.district} · {new Date(t.created_at).toLocaleDateString("sw-TZ")}
              </p>
            </div>
          ))}
        </div>
      )}

      {/* Reports tab */}
      {activeTab === "reports" && (
        <div className="space-y-3">
          {reports.length === 0 ? (
            <div className="text-center py-12 bg-stone-50 rounded-2xl">
              <p className="text-stone-500 font-bold">{L("Hakuna taarifa", "No reports")}</p>
            </div>
          ) : reports.map((r: any) => (
            <div key={r.id} className="bg-white border border-stone-200 rounded-2xl p-4">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs font-mono text-stone-400">{r.report_number}</span>
                <span className="px-2 py-0.5 text-[10px] font-bold rounded-md uppercase bg-blue-100 text-blue-800">{r.status?.replace(/_/g, " ")}</span>
              </div>
              <p className="font-bold text-stone-900 text-sm">{r.title}</p>
              <p className="text-xs text-stone-500 mt-1 line-clamp-2">{r.description}</p>
              <p className="text-xs text-stone-400 mt-1">
                {r.citizen?.first_name} {r.citizen?.last_name} · {r.ward || r.district} · {new Date(r.created_at).toLocaleDateString("sw-TZ")}
              </p>
            </div>
          ))}
        </div>
      )}

      {/* Escalations tab */}
      {activeTab === "escalations" && (
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-black text-stone-700 uppercase tracking-wider flex items-center gap-2">
            <Inbox size={16} />
            {L("Maombi Yaliyopandishwa", "Escalation Inbox")} ({filtered.length})
          </h2>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 border border-stone-200 rounded-xl text-sm bg-white"
          >
            <option value="all">
              {L("Zote", "All")} ({stats.total})
            </option>
            <option value="pending">
              {L("Zinazosubiri", "Pending")} ({stats.pending})
            </option>
            <option value="accepted">
              {L("Zimekubaliwa", "Accepted")} ({stats.accepted})
            </option>
            <option value="responded">
              {L("Zimejibiwa", "Responded")} ({stats.responded})
            </option>
            <option value="resolved">
              {L("Zimemalizika", "Resolved")} ({stats.resolved})
            </option>
          </select>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16 text-stone-400">
            <Loader2 size={24} className="animate-spin mr-2" />
            {L("Inapakia...", "Loading...")}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 bg-stone-50 rounded-2xl">
            <Inbox size={40} className="mx-auto text-stone-300 mb-3" />
            <p className="text-stone-500 font-bold">
              {statusFilter === "all"
                ? L("Hakuna maombi yaliyopandishwa bado", "No escalations yet")
                : L("Hakuna maombi katika hali hii", "No escalations with this status")}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map((esc) => {
              const app = esc.applications as Partial<Application> | undefined;
              const fd = (app?.form_data || {}) as Record<string, string>;
              const from = esc.from_user as Escalation["from_user"];
              const isExpanded = selectedEsc?.id === esc.id && !showResponseModal;

              return (
                <div
                  key={esc.id}
                  className="bg-white border border-stone-200 rounded-2xl overflow-hidden"
                >
                  {/* Row */}
                  <div
                    className="flex items-center justify-between px-4 sm:px-5 py-4 cursor-pointer hover:bg-stone-50/50 transition-colors"
                    onClick={() => setSelectedEsc(isExpanded ? null : esc)}
                  >
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <div
                        className={cn(
                          "w-10 h-10 rounded-xl flex items-center justify-center shrink-0",
                          esc.status === "pending"
                            ? "bg-amber-50 text-amber-600"
                            : esc.status === "resolved"
                              ? "bg-emerald-50 text-emerald-600"
                              : "bg-blue-50 text-blue-600",
                        )}
                      >
                        {esc.status === "pending" ? (
                          <Clock size={20} />
                        ) : esc.status === "resolved" ? (
                          <CheckCircle2 size={20} />
                        ) : (
                          <ArrowUpRight size={20} />
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="font-bold text-stone-900 text-sm truncate">
                          {app?.service_name || "—"}{" "}
                          <span className="font-mono text-xs text-stone-400">
                            {app?.application_number}
                          </span>
                        </p>
                        <p className="text-xs text-stone-400 truncate">
                          {L("Kutoka", "From")}: {from?.first_name} {from?.last_name} ·{" "}
                          {new Date(esc.created_at).toLocaleDateString("sw-TZ")}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0 ml-2">
                      <span
                        className={cn(
                          "px-2 py-0.5 text-[10px] font-bold rounded-md uppercase",
                          PRIORITY_COLORS[esc.priority],
                        )}
                      >
                        {esc.priority}
                      </span>
                      <span
                        className={cn(
                          "px-2 py-0.5 text-[10px] font-bold rounded-md uppercase",
                          STATUS_COLORS[esc.status],
                        )}
                      >
                        {esc.status}
                      </span>
                      {isExpanded ? (
                        <ChevronDown size={16} className="text-stone-400" />
                      ) : (
                        <ChevronRight size={16} className="text-stone-400" />
                      )}
                    </div>
                  </div>

                  {/* Expanded Detail */}
                  <AnimatePresence>
                    {isExpanded && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="border-t border-stone-100"
                      >
                        <div className="p-5 space-y-4">
                          {/* Escalation note */}
                          {esc.escalation_note && (
                            <div className="bg-amber-50 border border-amber-100 rounded-xl p-3">
                              <p className="text-xs font-bold text-amber-700 mb-1 flex items-center gap-1">
                                <MessageSquare size={12} />
                                {L("Maelezo ya Kupandisha", "Escalation Note")}
                              </p>
                              <p className="text-sm text-stone-700">{esc.escalation_note}</p>
                            </div>
                          )}

                          {/* Response note */}
                          {esc.response_note && (
                            <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-3">
                              <p className="text-xs font-bold text-emerald-700 mb-1 flex items-center gap-1">
                                <Send size={12} />
                                {L("Jibu la Idara", "Department Response")}
                              </p>
                              <p className="text-sm text-stone-700">{esc.response_note}</p>
                            </div>
                          )}

                          {/* Application details */}
                          <div className="bg-stone-50 rounded-xl p-4">
                            <p className="text-xs font-bold text-stone-500 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                              <FileText size={12} />
                              {L("Taarifa za Maombi", "Application Details")}
                            </p>
                            <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
                              <div>
                                <span className="text-stone-400 text-xs">
                                  {L("Huduma", "Service")}
                                </span>
                                <p className="font-bold text-stone-800">{app?.service_name}</p>
                              </div>
                              <div>
                                <span className="text-stone-400 text-xs">
                                  {L("Nambari", "Number")}
                                </span>
                                <p className="font-mono text-stone-800">
                                  {app?.application_number}
                                </p>
                              </div>
                              <div>
                                <span className="text-stone-400 text-xs">
                                  {L("Hali ya Maombi", "App Status")}
                                </span>
                                <p className="font-bold text-stone-800 capitalize">{app?.status}</p>
                              </div>
                              <div>
                                <span className="text-stone-400 text-xs">
                                  {L("Tarehe", "Date")}
                                </span>
                                <p className="text-stone-800">
                                  {app?.created_at
                                    ? new Date(app.created_at).toLocaleDateString("sw-TZ")
                                    : "—"}
                                </p>
                              </div>
                              {fd.applicant_name && (
                                <div className="col-span-2">
                                  <span className="text-stone-400 text-xs flex items-center gap-1">
                                    <User size={10} /> {L("Mwombaji", "Applicant")}
                                  </span>
                                  <p className="font-bold text-stone-800">
                                    {fd.applicant_name ||
                                      fd.complainant_name ||
                                      fd.payer_name ||
                                      fd.owner_name ||
                                      "—"}
                                  </p>
                                </div>
                              )}
                            </div>
                          </div>

                          {/* From staff */}
                          <div className="flex items-center gap-3 text-xs text-stone-400">
                            <User size={12} />
                            <span>
                              {L("Imepandishwa na", "Escalated by")}:{" "}
                              <span className="font-bold text-stone-600">
                                {from?.first_name} {from?.last_name}
                              </span>
                            </span>
                            {from?.email && (
                              <>
                                <Mail size={11} />
                                <span>{from.email}</span>
                              </>
                            )}
                            {from?.phone && (
                              <>
                                <Phone size={11} />
                                <span>{from.phone}</span>
                              </>
                            )}
                          </div>

                          {/* Action buttons */}
                          {esc.status !== "resolved" && esc.status !== "rejected" && (
                            <div className="flex flex-wrap gap-2 pt-2 border-t border-stone-100">
                              {esc.status === "pending" && (
                                <button
                                  onClick={() => openResponseModal("accepted", esc)}
                                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors"
                                >
                                  <CheckCircle2 size={13} />
                                  {L("Kubali", "Accept")}
                                </button>
                              )}
                              <button
                                onClick={() => openResponseModal("responded", esc)}
                                className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors"
                              >
                                <MessageSquare size={13} />
                                {L("Jibu", "Respond")}
                              </button>
                              <button
                                onClick={() => openResponseModal("resolved", esc)}
                                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors"
                              >
                                <CheckCircle2 size={13} />
                                {L("Maliza", "Resolve")}
                              </button>
                              <button
                                onClick={() => openResponseModal("rejected", esc)}
                                className="px-4 py-2 bg-stone-200 hover:bg-stone-300 text-stone-700 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors"
                              >
                                <X size={13} />
                                {L("Kataa", "Reject")}
                              </button>
                            </div>
                          )}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })}
          </div>
        )}
      </div>

      )}

      {/* Response Modal */}
      <AnimatePresence>
        {showResponseModal && selectedEsc && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4"
            onClick={() => setShowResponseModal(false)}
          >
            <motion.div
              initial={{ scale: 0.95 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.95 }}
              className="bg-white rounded-2xl shadow-2xl w-full max-w-md"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="px-6 py-4 border-b border-stone-100">
                <h3 className="text-lg font-black text-stone-900">
                  {responseAction === "accepted"
                    ? L("Kubali Ombi", "Accept Escalation")
                    : responseAction === "responded"
                      ? L("Jibu Ombi", "Respond to Escalation")
                      : responseAction === "resolved"
                        ? L("Maliza Ombi", "Resolve Escalation")
                        : L("Kataa Ombi", "Reject Escalation")}
                </h3>
                <p className="text-xs text-stone-400 mt-0.5">
                  {
                    (selectedEsc.applications as Partial<Application> | undefined)
                      ?.application_number
                  }
                </p>
              </div>
              <div className="p-6 space-y-4">
                <div>
                  <label className="block text-xs font-bold text-stone-600 uppercase tracking-wider mb-1.5">
                    {L("Maelezo / Maoni", "Notes / Comments")}
                    {(responseAction === "responded" || responseAction === "rejected") && " *"}
                  </label>
                  <textarea
                    value={responseNote}
                    onChange={(e) => setResponseNote(e.target.value)}
                    rows={4}
                    placeholder={
                      responseAction === "accepted"
                        ? L("Maoni ya ziada (hiari)...", "Additional notes (optional)...")
                        : L("Andika jibu lako hapa...", "Write your response here...")
                    }
                    className="w-full px-4 py-3 border border-stone-200 rounded-xl focus:ring-2 focus:ring-emerald-500 text-sm resize-none"
                  />
                </div>
              </div>
              <div className="px-6 py-4 border-t border-stone-100 flex justify-end gap-3">
                <button
                  onClick={() => setShowResponseModal(false)}
                  className="px-5 py-2.5 text-sm font-bold text-stone-600 hover:bg-stone-100 rounded-xl"
                >
                  {L("Ghairi", "Cancel")}
                </button>
                <button
                  onClick={handleResponse}
                  disabled={
                    responding ||
                    ((responseAction === "responded" || responseAction === "rejected") &&
                      !responseNote.trim())
                  }
                  className={cn(
                    "px-6 py-2.5 rounded-xl font-bold text-sm text-white disabled:opacity-50 flex items-center gap-2",
                    responseAction === "rejected"
                      ? "bg-red-600 hover:bg-red-700"
                      : responseAction === "resolved"
                        ? "bg-emerald-600 hover:bg-emerald-700"
                        : "bg-blue-600 hover:bg-blue-700",
                  )}
                >
                  {responding && <Loader2 size={14} className="animate-spin" />}
                  {responseAction === "accepted"
                    ? L("Kubali", "Accept")
                    : responseAction === "responded"
                      ? L("Tuma Jibu", "Send Response")
                      : responseAction === "resolved"
                        ? L("Maliza", "Resolve")
                        : L("Kataa", "Reject")}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
