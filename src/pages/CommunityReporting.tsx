import React, { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import {
  Send,
  Loader2,
  CheckCircle2,
  MapPin,
  Camera,
  X,
  ArrowLeft,
  MessageSquare,
  ChevronRight,
  User,
  Shield,
  AlertTriangle,
  Navigation,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";
import { useLanguage } from "@/context/LanguageContext";
import { useToast } from "@/context/ToastContext";
import { cn } from "@/lib/utils";

const REPORT_CATEGORIES = [
  { value: "road_damage", en: "Road Damage", sw: "Uharibifu wa Barabara", icon: "🛣️" },
  { value: "water_supply", en: "Water Supply", sw: "Usambazaji wa Maji", icon: "💧" },
  { value: "waste_collection", en: "Waste Collection", sw: "Ukusanyaji wa Taka", icon: "🗑️" },
  { value: "street_lights", en: "Street Lights", sw: "Taa za Barabara", icon: "💡" },
  { value: "flooding", en: "Flooding", sw: "Mafuriko", icon: "🌊" },
  { value: "security_issues", en: "Security Issues", sw: "Masuala ya Usalama", icon: "🔒" },
  { value: "environment", en: "Environment", sw: "Mazingira", icon: "🌿" },
  { value: "public_health", en: "Public Health", sw: "Afya ya Umma", icon: "🏥" },
  { value: "illegal_activities", en: "Illegal Activities", sw: "Shughuli Haramu", icon: "⚠️" },
  { value: "other", en: "Other", sw: "Nyingine", icon: "📋" },
];

const STATUS_CONFIG: Record<string, { color: string; en: string; sw: string }> = {
  submitted: { color: "bg-amber-100 text-amber-800", en: "Submitted", sw: "Imetumwa" },
  under_review: { color: "bg-blue-100 text-blue-800", en: "Under Review", sw: "Inakaguliwa" },
  assigned: { color: "bg-indigo-100 text-indigo-800", en: "Assigned", sw: "Imepewa" },
  in_progress: { color: "bg-purple-100 text-purple-800", en: "In Progress", sw: "Inaendelea" },
  escalated: { color: "bg-orange-100 text-orange-800", en: "Escalated", sw: "Imepandishwa" },
  resolved: { color: "bg-emerald-100 text-emerald-800", en: "Resolved", sw: "Imemalizika" },
  closed: { color: "bg-stone-100 text-stone-600", en: "Closed", sw: "Imefungwa" },
};

interface Report {
  id: string;
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
  resolution_note?: string;
  created_at: string;
}

interface ReportResponse {
  id: string;
  message: string;
  is_internal_note: boolean;
  created_at: string;
  users?: { first_name: string; last_name: string; role: string };
}

export function CommunityReporting() {
  const { user } = useAuth();
  const { lang } = useLanguage();
  const { showToast } = useToast();
  const L = useCallback((sw: string, en: string) => (lang === "sw" ? sw : en), [lang]);
  const sw = lang === "sw";

  const [view, setView] = useState<"list" | "create" | "detail">("list");
  const [reports, setReports] = useState<Report[]>([]);
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);
  const [responses, setResponses] = useState<ReportResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Create form state
  const [category, setCategory] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [street, setStreet] = useState("");
  const [gpsLat, setGpsLat] = useState<number | null>(null);
  const [gpsLng, setGpsLng] = useState<number | null>(null);
  const [gpsLoading, setGpsLoading] = useState(false);
  const [photos, setPhotos] = useState<{ data: string; name: string }[]>([]);

  // Reply
  const [replyText, setReplyText] = useState("");
  const [sendingReply, setSendingReply] = useState(false);

  // ── Fetch reports ──────────────────────────────────────────────────────
  const fetchReports = useCallback(async () => {
    if (!user?.id) return;
    setLoading(true);
    try {
      const { data } = await supabase
        .from("community_reports")
        .select("*")
        .eq("citizen_id", user.id)
        .order("created_at", { ascending: false });
      setReports((data as Report[]) || []);
    } catch {
      // Table may not exist
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    fetchReports();
  }, [fetchReports]);

  // ── GPS capture ────────────────────────────────────────────────────────
  const captureGPS = () => {
    if (!navigator.geolocation) {
      showToast(L("GPS haipatikani", "GPS not available"), "error");
      return;
    }
    setGpsLoading(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setGpsLat(pos.coords.latitude);
        setGpsLng(pos.coords.longitude);
        setGpsLoading(false);
        showToast(L("Eneo limepatikana!", "Location captured!"), "success");
      },
      () => {
        setGpsLoading(false);
        showToast(L("Imeshindwa kupata eneo", "Failed to get location"), "error");
      },
      { enableHighAccuracy: true, timeout: 10000 },
    );
  };

  // ── Photo upload ───────────────────────────────────────────────────────
  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (photos.length + files.length > 5) {
      showToast(L("Picha 5 tu zinaruhusiwa", "Maximum 5 photos"), "error");
      return;
    }
    files.forEach((file) => {
      if (file.size > 3_000_000) {
        showToast(L("Picha kubwa sana (max 3MB)", "Photo too large (max 3MB)"), "error");
        return;
      }
      const reader = new FileReader();
      reader.onload = () => {
        setPhotos((prev) => [...prev, { data: reader.result as string, name: file.name }]);
      };
      reader.readAsDataURL(file);
    });
  };

  // ── Submit report ──────────────────────────────────────────────────────
  const handleSubmit = async () => {
    if (!user || !category || !title.trim() || !description.trim()) {
      showToast(L("Jaza sehemu zote", "Fill all required fields"), "error");
      return;
    }
    setSubmitting(true);
    try {
      const reportNumber = `CR-${new Date().getFullYear()}${String(new Date().getMonth() + 1).padStart(2, "0")}${String(new Date().getDate()).padStart(2, "0")}-${Math.floor(Math.random() * 9000 + 1000)}`;

      // Auto-routing
      let deptId: string | null = null;
      try {
        const { data: rule } = await supabase
          .from("department_routing_rules")
          .select("department_id")
          .eq("category", category)
          .eq("category_type", "report")
          .eq("active", true)
          .maybeSingle();
        if (rule?.department_id) deptId = rule.department_id;
      } catch {
        // Routing table may not exist
      }

      const { data: inserted, error } = await supabase
        .from("community_reports")
        .insert({
          report_number: reportNumber,
          citizen_id: user.id,
          title: title.trim(),
          description: description.trim(),
          category,
          region: user.region || null,
          district: user.district || null,
          ward: user.ward || null,
          street: street.trim() || user.street || null,
          gps_lat: gpsLat,
          gps_lng: gpsLng,
          assigned_department_id: deptId,
          status: deptId ? "assigned" : "submitted",
        })
        .select("id")
        .single();

      if (error) throw error;

      // Upload photos
      if (inserted && photos.length > 0) {
        const mediaInserts = photos.map((p) => ({
          report_id: inserted.id,
          media_data: p.data,
          media_type: "image",
          file_name: p.name,
          uploaded_by: user.id,
        }));
        await supabase.from("community_report_media").insert(mediaInserts);
      }

      // Confirmation notification
      await supabase.from("notifications").insert({
        user_id: user.id,
        title: lang === "sw" ? "Taarifa Imetumwa" : "Report Submitted",
        message: lang === "sw"
          ? `Taarifa yako ${reportNumber} imetumwa. Tutashughulikia hivi karibuni.`
          : `Your report ${reportNumber} has been submitted. We will address it shortly.`,
        type: "report_submitted",
      });

      showToast(L(`Taarifa ${reportNumber} imetumwa!`, `Report ${reportNumber} submitted!`), "success");
      setCategory("");
      setTitle("");
      setDescription("");
      setStreet("");
      setGpsLat(null);
      setGpsLng(null);
      setPhotos([]);
      setView("list");
      fetchReports();
    } catch (err: unknown) {
      showToast((err as { message?: string }).message || "Error", "error");
    } finally {
      setSubmitting(false);
    }
  };

  // ── Fetch responses ────────────────────────────────────────────────────
  const fetchResponses = async (reportId: string) => {
    try {
      const { data } = await supabase
        .from("report_responses")
        .select("*, users:user_id(first_name, last_name, role)")
        .eq("report_id", reportId)
        .eq("is_internal_note", false)
        .order("created_at", { ascending: true });
      setResponses((data as ReportResponse[]) || []);
    } catch {
      setResponses([]);
    }
  };

  const openDetail = (report: Report) => {
    setSelectedReport(report);
    fetchResponses(report.id);
    setReplyText("");
    setView("detail");
  };

  const handleSendReply = async () => {
    if (!selectedReport || !user || !replyText.trim()) return;
    setSendingReply(true);
    try {
      await supabase.from("report_responses").insert({
        report_id: selectedReport.id,
        user_id: user.id,
        message: replyText.trim(),
        is_internal_note: false,
      });
      setReplyText("");
      fetchResponses(selectedReport.id);
      showToast(L("Jibu limetumwa", "Reply sent"), "success");
    } catch (err: unknown) {
      showToast((err as { message?: string }).message || "Error", "error");
    } finally {
      setSendingReply(false);
    }
  };

  const getCatLabel = (val: string) => {
    const cat = REPORT_CATEGORIES.find((c) => c.value === val);
    return cat ? `${cat.icon} ${sw ? cat.sw : cat.en}` : val;
  };

  const stats = {
    total: reports.length,
    open: reports.filter((r) => !["resolved", "closed"].includes(r.status)).length,
    resolved: reports.filter((r) => r.status === "resolved").length,
  };

  // ── RENDER ─────────────────────────────────────────────────────────────
  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-stone-900 tracking-tight">
            {view === "create"
              ? L("Toa Taarifa", "Submit Report")
              : view === "detail"
                ? L("Maelezo ya Taarifa", "Report Details")
                : L("Taarifa za Jamii", "Community Reports")}
          </h1>
          {view === "list" && (
            <p className="text-sm text-stone-500 mt-0.5">
              {L("Ripoti masuala ya miundombinu na jamii", "Report infrastructure and community issues")}
            </p>
          )}
        </div>
        {view === "list" ? (
          <button onClick={() => setView("create")} className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-sm flex items-center gap-2">
            <AlertTriangle size={16} />
            {L("Taarifa Mpya", "New Report")}
          </button>
        ) : (
          <button onClick={() => setView("list")} className="px-4 py-2 text-stone-600 hover:bg-stone-100 rounded-xl font-bold text-sm flex items-center gap-2">
            <ArrowLeft size={16} />
            {L("Rudi", "Back")}
          </button>
        )}
      </div>

      {/* ── CREATE ──────────────────────────────────────────────────────── */}
      {view === "create" && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="bg-white rounded-2xl border border-stone-200 p-6 space-y-5">
          {/* Category grid */}
          <div>
            <label className="block text-xs font-bold text-stone-600 uppercase tracking-wider mb-2">
              {L("Aina ya Tatizo", "Issue Category")} *
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {REPORT_CATEGORIES.map((cat) => (
                <button
                  key={cat.value}
                  type="button"
                  onClick={() => setCategory(cat.value)}
                  className={cn(
                    "p-3 rounded-xl border text-left text-sm font-medium transition-colors",
                    category === cat.value
                      ? "border-emerald-500 bg-emerald-50 text-emerald-800"
                      : "border-stone-200 hover:border-stone-300 text-stone-600",
                  )}
                >
                  <span className="text-lg">{cat.icon}</span>
                  <p className="mt-1 text-xs font-bold">{sw ? cat.sw : cat.en}</p>
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-stone-600 uppercase tracking-wider mb-1.5">
              {L("Kichwa cha Taarifa", "Report Title")} *
            </label>
            <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder={L("mfano: Shimo kubwa barabarani", "e.g. Large pothole on road")} className="w-full px-4 py-3 border border-stone-200 rounded-xl text-sm" />
          </div>

          <div>
            <label className="block text-xs font-bold text-stone-600 uppercase tracking-wider mb-1.5">
              {L("Maelezo Kamili", "Full Description")} *
            </label>
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={4} placeholder={L("Eleza tatizo kwa undani...", "Describe the issue in detail...")} className="w-full px-4 py-3 border border-stone-200 rounded-xl text-sm resize-none" />
          </div>

          {/* Location */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-stone-600 uppercase tracking-wider mb-1.5">
                {L("Mtaa / Eneo", "Street / Area")}
              </label>
              <input value={street} onChange={(e) => setStreet(e.target.value)} placeholder={L("mfano: Barabara ya Morogoro", "e.g. Morogoro Road")} className="w-full px-4 py-3 border border-stone-200 rounded-xl text-sm" />
            </div>
            <div>
              <label className="block text-xs font-bold text-stone-600 uppercase tracking-wider mb-1.5">
                GPS
              </label>
              <button
                type="button"
                onClick={captureGPS}
                disabled={gpsLoading}
                className={cn(
                  "w-full px-4 py-3 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-colors",
                  gpsLat
                    ? "bg-emerald-50 border border-emerald-200 text-emerald-700"
                    : "bg-stone-50 border border-stone-200 text-stone-600 hover:border-emerald-300",
                )}
              >
                {gpsLoading ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : gpsLat ? (
                  <>
                    <CheckCircle2 size={16} />
                    {gpsLat.toFixed(4)}, {gpsLng?.toFixed(4)}
                  </>
                ) : (
                  <>
                    <Navigation size={16} />
                    {L("Pata Eneo Langu", "Get My Location")}
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Photos */}
          <div>
            <label className="block text-xs font-bold text-stone-600 uppercase tracking-wider mb-1.5">
              {L("Picha", "Photos")} ({photos.length}/5)
            </label>
            <div className="flex flex-wrap gap-2 mb-2">
              {photos.map((p, i) => (
                <div key={i} className="relative w-20 h-20 rounded-xl overflow-hidden border border-stone-200">
                  <img src={p.data} alt="" className="w-full h-full object-cover" />
                  <button
                    type="button"
                    onClick={() => setPhotos((prev) => prev.filter((_, idx) => idx !== i))}
                    className="absolute top-0.5 right-0.5 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center"
                  >
                    <X size={10} />
                  </button>
                </div>
              ))}
              {photos.length < 5 && (
                <label className="w-20 h-20 rounded-xl border-2 border-dashed border-stone-200 flex flex-col items-center justify-center cursor-pointer hover:border-emerald-300 transition-colors">
                  <Camera size={20} className="text-stone-400" />
                  <span className="text-[10px] text-stone-400 mt-0.5">{L("Ongeza", "Add")}</span>
                  <input type="file" accept="image/*" multiple onChange={handlePhotoUpload} className="hidden" />
                </label>
              )}
            </div>
          </div>

          {/* Profile location */}
          <div className="bg-stone-50 rounded-xl p-3 text-xs text-stone-500">
            <p className="font-bold mb-1">{L("Eneo lako", "Your location")}</p>
            <p>{user?.region || "—"} / {user?.district || "—"} / {user?.ward || "—"}</p>
          </div>

          <button
            onClick={handleSubmit}
            disabled={submitting || !category || !title.trim() || !description.trim()}
            className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-sm flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {submitting ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
            {L("Tuma Taarifa", "Submit Report")}
          </button>
        </motion.div>
      )}

      {/* ── LIST ────────────────────────────────────────────────────────── */}
      {view === "list" && (
        <>
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

          {loading ? (
            <div className="flex items-center justify-center py-16 text-stone-400">
              <Loader2 size={24} className="animate-spin" />
            </div>
          ) : reports.length === 0 ? (
            <div className="text-center py-16 bg-white rounded-2xl border border-stone-200">
              <AlertTriangle size={40} className="mx-auto text-stone-300 mb-3" />
              <p className="font-bold text-stone-600">{L("Hakuna taarifa bado", "No reports yet")}</p>
              <p className="text-sm text-stone-400 mt-1">{L("Ripoti tatizo la kwanza", "Report your first issue")}</p>
            </div>
          ) : (
            <div className="space-y-3">
              {reports.map((report) => {
                const s = STATUS_CONFIG[report.status] || STATUS_CONFIG.submitted;
                return (
                  <div key={report.id} onClick={() => openDetail(report)} className="bg-white border border-stone-200 rounded-2xl p-4 hover:border-emerald-200 cursor-pointer transition-colors">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs font-mono text-stone-400">{report.report_number}</span>
                          <span className={cn("px-2 py-0.5 text-[10px] font-bold rounded-md uppercase", s.color)}>
                            {sw ? s.sw : s.en}
                          </span>
                        </div>
                        <p className="font-bold text-stone-900 text-sm truncate">{report.title}</p>
                        <p className="text-xs text-stone-400 mt-0.5">{getCatLabel(report.category)} · {new Date(report.created_at).toLocaleDateString("sw-TZ")}</p>
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

      {/* ── DETAIL ──────────────────────────────────────────────────────── */}
      {view === "detail" && selectedReport && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
          <div className="bg-white border border-stone-200 rounded-2xl p-5">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-xs font-mono text-stone-400">{selectedReport.report_number}</span>
              <span className={cn("px-2 py-0.5 text-[10px] font-bold rounded-md uppercase", (STATUS_CONFIG[selectedReport.status] || STATUS_CONFIG.submitted).color)}>
                {sw ? (STATUS_CONFIG[selectedReport.status] || STATUS_CONFIG.submitted).sw : (STATUS_CONFIG[selectedReport.status] || STATUS_CONFIG.submitted).en}
              </span>
            </div>
            <h2 className="text-lg font-black text-stone-900">{selectedReport.title}</h2>
            <p className="text-sm text-stone-600 mt-2 whitespace-pre-wrap">{selectedReport.description}</p>
            <div className="flex flex-wrap items-center gap-3 mt-3 text-xs text-stone-400">
              <span>{getCatLabel(selectedReport.category)}</span>
              <span>·</span>
              <span>{new Date(selectedReport.created_at).toLocaleDateString("sw-TZ")}</span>
              {selectedReport.ward && (<><span>·</span><span className="flex items-center gap-1"><MapPin size={10} />{selectedReport.ward}</span></>)}
              {selectedReport.gps_lat && (<><span>·</span><span>📍 {selectedReport.gps_lat.toFixed(4)}, {selectedReport.gps_lng?.toFixed(4)}</span></>)}
            </div>
            {selectedReport.resolution_note && (
              <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-3 mt-3">
                <p className="text-xs font-bold text-emerald-700 mb-1">{L("Jibu", "Resolution")}</p>
                <p className="text-sm text-stone-700">{selectedReport.resolution_note}</p>
              </div>
            )}
          </div>

          {/* Responses */}
          <div className="bg-white border border-stone-200 rounded-2xl p-5">
            <h3 className="text-sm font-bold text-stone-600 uppercase tracking-wider mb-4 flex items-center gap-2">
              <MessageSquare size={14} /> {L("Mazungumzo", "Conversation")} ({responses.length})
            </h3>
            {responses.length === 0 ? (
              <p className="text-sm text-stone-400 py-4 text-center">{L("Hakuna majibu bado", "No responses yet")}</p>
            ) : (
              <div className="space-y-3 mb-4">
                {responses.map((r) => {
                  const isStaff = r.users?.role !== "citizen";
                  return (
                    <div key={r.id} className={cn("p-3 rounded-xl text-sm", isStaff ? "bg-blue-50 border border-blue-100 ml-4" : "bg-stone-50 mr-4")}>
                      <div className="flex items-center gap-2 mb-1">
                        {isStaff ? <Shield size={12} className="text-blue-600" /> : <User size={12} className="text-stone-500" />}
                        <span className="text-xs font-bold text-stone-600">{r.users?.first_name} {r.users?.last_name}</span>
                        <span className="text-[10px] text-stone-400">{new Date(r.created_at).toLocaleString("sw-TZ")}</span>
                      </div>
                      <p className="text-stone-700 whitespace-pre-wrap">{r.message}</p>
                    </div>
                  );
                })}
              </div>
            )}
            {selectedReport.status !== "closed" && (
              <div className="flex gap-2 pt-3 border-t border-stone-100">
                <input value={replyText} onChange={(e) => setReplyText(e.target.value)} placeholder={L("Andika jibu...", "Type a reply...")} className="flex-1 px-4 py-2.5 border border-stone-200 rounded-xl text-sm" onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSendReply(); } }} />
                <button onClick={handleSendReply} disabled={sendingReply || !replyText.trim()} className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-sm disabled:opacity-50 flex items-center gap-1.5">
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
