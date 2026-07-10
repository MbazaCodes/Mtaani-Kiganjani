import React, { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Inbox,
  CheckCircle2,
  ChevronRight,
  ChevronDown,
  Loader2,
  Send,
  MapPin,
  AlertTriangle,
  Image,
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

const CATEGORIES: Record<string, { en: string; sw: string; icon: string }> = {
  road_damage: { en: "Road Damage", sw: "Uharibifu wa Barabara", icon: "🛣️" },
  water_supply: { en: "Water Supply", sw: "Usambazaji wa Maji", icon: "💧" },
  waste_collection: { en: "Waste Collection", sw: "Ukusanyaji wa Taka", icon: "🗑️" },
  street_lights: { en: "Street Lights", sw: "Taa za Barabara", icon: "💡" },
  flooding: { en: "Flooding", sw: "Mafuriko", icon: "🌊" },
  security_issues: { en: "Security Issues", sw: "Masuala ya Usalama", icon: "🔒" },
  environment: { en: "Environment", sw: "Mazingira", icon: "🌿" },
  public_health: { en: "Public Health", sw: "Afya ya Umma", icon: "🏥" },
  illegal_activities: { en: "Illegal Activities", sw: "Shughuli Haramu", icon: "⚠️" },
  other: { en: "Other", sw: "Nyingine", icon: "📋" },
};

interface Report {
  id: string;
  citizen_id: string;
  report_number: string;
  title: string;
  description: string;
  category: string;
  priority: string;
  status: string;
  region?: string;
  district?: string;
  ward?: string;
  street?: string;
  gps_lat?: number;
  gps_lng?: number;
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

interface Media {
  id: string;
  media_data: string;
  file_name: string;
  media_type: string;
}

export function StaffReportsInbox() {
  const { user } = useAuth();
  const { lang } = useLanguage();
  const { showToast } = useToast();
  const L = useCallback((sw: string, en: string) => (lang === "sw" ? sw : en), [lang]);
  const sw = lang === "sw";

  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("all");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [responses, setResponses] = useState<Response[]>([]);
  const [media, setMedia] = useState<Media[]>([]);

  const [replyText, setReplyText] = useState("");
  const [isInternal, setIsInternal] = useState(false);
  const [sending, setSending] = useState(false);
  const [newStatus, setNewStatus] = useState("");
  const [resolutionNote, setResolutionNote] = useState("");
  const [updating, setUpdating] = useState(false);

  const fetchReports = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      let query = supabase
        .from("community_reports")
        .select("*, citizen:citizen_id(first_name, last_name, email, phone)")
        .order("created_at", { ascending: false })
        .limit(200);

      if (user.ward && user.role === "staff") query = query.eq("ward", user.ward);
      else if (user.assigned_district) query = query.eq("district", user.assigned_district);
      else if (user.assigned_region) query = query.eq("region", user.assigned_region);

      const { data } = await query;
      setReports((data as Report[]) || []);
    } catch {
      setReports([]);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchReports();
  }, [fetchReports]);

  const fetchDetail = async (reportId: string) => {
    const [respData, mediaData] = await Promise.all([
      supabase
        .from("report_responses")
        .select("*, users:user_id(first_name, last_name, role)")
        .eq("report_id", reportId)
        .order("created_at"),
      supabase
        .from("community_report_media")
        .select("id, media_data, file_name, media_type")
        .eq("report_id", reportId),
    ]);
    setResponses((respData.data as Response[]) || []);
    setMedia((mediaData.data as Media[]) || []);
  };

  const toggleExpand = (report: Report) => {
    if (expandedId === report.id) {
      setExpandedId(null);
      return;
    }
    setExpandedId(report.id);
    fetchDetail(report.id);
    setReplyText("");
    setIsInternal(false);
    setNewStatus(report.status);
    setResolutionNote("");
  };

  const handleSendResponse = async (reportId: string) => {
    if (!user || !replyText.trim()) return;
    setSending(true);
    try {
      await supabase.from("report_responses").insert({
        report_id: reportId,
        user_id: user.id,
        message: replyText.trim(),
        is_internal_note: isInternal,
      });
      setReplyText("");
      fetchDetail(reportId);
      // Notify citizen
      if (!isInternal) {
        const report = reports.find((r) => r.id === reportId);
        if (report?.citizen_id) {
          await supabase.from("notifications").insert({
            user_id: report.citizen_id,
            title: "Jibu Jipya / New Response",
            message: `Taarifa ${report.report_number} imejibiwa. / Report ${report.report_number} has a new response.`,
            type: "report_response",
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

  const handleUpdateStatus = async (report: Report) => {
    if (!user || !newStatus || newStatus === report.status) return;
    setUpdating(true);
    try {
      const patch: Record<string, unknown> = { status: newStatus };
      if (["assigned", "in_progress"].includes(newStatus)) patch.assigned_to = user.id;
      if (newStatus === "resolved") {
        patch.resolved_by = user.id;
        patch.resolved_at = new Date().toISOString();
        patch.resolution_note = resolutionNote.trim() || null;
      }
      await supabase.from("community_reports").update(patch).eq("id", report.id);
      // Notify citizen
      const statusLabel = STATUS_OPTIONS.find((s) => s.value === newStatus);
      if (report.citizen_id) {
        await supabase.from("notifications").insert({
          user_id: report.citizen_id,
          title: "Hali ya Taarifa Imebadilika / Report Status Changed",
          message: `Taarifa ${report.report_number}: ${statusLabel?.sw || newStatus} / ${statusLabel?.en || newStatus}`,
          type: newStatus === "resolved" ? "report_resolved" : "report_updated",
        });
      }
      showToast(L("Hali imesasishwa", "Status updated"), "success");
      fetchReports();
    } catch (err: unknown) {
      showToast((err as { message?: string }).message || "Error", "error");
    } finally {
      setUpdating(false);
    }
  };

  const filtered =
    statusFilter === "all" ? reports : reports.filter((r) => r.status === statusFilter);
  const stats = {
    total: reports.length,
    submitted: reports.filter((r) => r.status === "submitted").length,
    active: reports.filter((r) => ["under_review", "assigned", "in_progress"].includes(r.status))
      .length,
    resolved: reports.filter((r) => ["resolved", "closed"].includes(r.status)).length,
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      <h1 className="text-2xl font-black text-stone-900 tracking-tight flex items-center gap-2">
        <AlertTriangle size={24} className="text-amber-600" />
        {L("Taarifa za Jamii", "Community Reports")}
      </h1>

      <div className="grid grid-cols-3 gap-3">
        <div className="bg-amber-50 border border-amber-100 rounded-xl p-4">
          <p className="text-2xl font-black text-amber-700">{stats.submitted}</p>
          <p className="text-xs font-bold text-stone-500">{L("Mpya", "New")}</p>
        </div>
        <div className="bg-blue-50 border border-blue-100 rounded-xl p-4">
          <p className="text-2xl font-black text-blue-700">{stats.active}</p>
          <p className="text-xs font-bold text-stone-500">{L("Zinaendelea", "Active")}</p>
        </div>
        <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-4">
          <p className="text-2xl font-black text-emerald-700">{stats.resolved}</p>
          <p className="text-xs font-bold text-stone-500">{L("Zimemalizika", "Resolved")}</p>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <span className="text-sm font-bold text-stone-500">
          {filtered.length} {L("taarifa", "reports")}
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
              {sw ? s.sw : s.en} ({reports.filter((r) => r.status === s.value).length})
            </option>
          ))}
        </select>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16 text-stone-400">
          <Loader2 size={24} className="animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-2xl border border-stone-200">
          <Inbox size={40} className="mx-auto text-stone-300 mb-3" />
          <p className="font-bold text-stone-500">{L("Hakuna taarifa", "No reports")}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((report) => {
            const isExpanded = expandedId === report.id;
            const citizen = report.citizen;
            const cat = CATEGORIES[report.category];

            return (
              <div
                key={report.id}
                className="bg-white border border-stone-200 rounded-2xl overflow-hidden"
              >
                <div
                  className="flex items-center justify-between px-5 py-4 cursor-pointer hover:bg-stone-50/50"
                  onClick={() => toggleExpand(report)}
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-mono text-stone-400">
                        {report.report_number}
                      </span>
                      <span
                        className={cn(
                          "px-2 py-0.5 text-[10px] font-bold rounded-md uppercase",
                          STATUS_COLORS[report.status],
                        )}
                      >
                        {report.status.replace(/_/g, " ")}
                      </span>
                    </div>
                    <p className="font-bold text-stone-900 text-sm truncate">
                      {cat?.icon} {report.title}
                    </p>
                    <p className="text-xs text-stone-400">
                      {citizen?.first_name} {citizen?.last_name} · {report.ward || report.district}{" "}
                      · {new Date(report.created_at).toLocaleDateString("sw-TZ")}
                    </p>
                  </div>
                  {isExpanded ? (
                    <ChevronDown size={16} className="text-stone-400" />
                  ) : (
                    <ChevronRight size={16} className="text-stone-400" />
                  )}
                </div>

                <AnimatePresence>
                  {isExpanded && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="border-t border-stone-100"
                    >
                      <div className="p-5 space-y-4">
                        <div className="bg-stone-50 rounded-xl p-4">
                          <p className="text-sm text-stone-700 whitespace-pre-wrap">
                            {report.description}
                          </p>
                          <div className="flex flex-wrap gap-3 mt-2 text-xs text-stone-400">
                            <span className="flex items-center gap-1">
                              <MapPin size={10} />
                              {report.region} / {report.district} / {report.ward}
                            </span>
                            {report.street && <span>📍 {report.street}</span>}
                            {report.gps_lat && (
                              <a
                                href={`https://maps.google.com/?q=${report.gps_lat},${report.gps_lng}`}
                                target="_blank"
                                rel="noreferrer"
                                className="text-blue-600 underline"
                              >
                                GPS: {report.gps_lat.toFixed(4)}, {report.gps_lng?.toFixed(4)}
                              </a>
                            )}
                            {citizen?.phone && <span>📞 {citizen.phone}</span>}
                          </div>
                        </div>

                        {/* Photos */}
                        {media.length > 0 && (
                          <div>
                            <p className="text-xs font-bold text-stone-500 uppercase tracking-wider mb-2 flex items-center gap-1">
                              <Image size={12} /> {L("Picha", "Photos")} ({media.length})
                            </p>
                            <div className="flex flex-wrap gap-2">
                              {media.map((m) => (
                                <img
                                  key={m.id}
                                  src={m.media_data}
                                  alt={m.file_name}
                                  className="w-24 h-24 object-cover rounded-xl border border-stone-200"
                                />
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Responses */}
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
                                    ? "bg-amber-50 border-dashed border border-amber-100"
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
                              onClick={() => handleSendResponse(report.id)}
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
                              {L("Maoni ya ndani", "Internal note")}
                            </span>
                          </label>
                        </div>

                        {/* Status */}
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
                                {L("Maelezo", "Resolution Note")}
                              </label>
                              <input
                                value={resolutionNote}
                                onChange={(e) => setResolutionNote(e.target.value)}
                                placeholder={L("Jinsi ilivyotatuliwa...", "How resolved...")}
                                className="w-full px-3 py-2 border border-stone-200 rounded-xl text-sm"
                              />
                            </div>
                          )}
                          <button
                            onClick={() => handleUpdateStatus(report)}
                            disabled={updating || newStatus === report.status}
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
