/**
 * Application Review — Staff Portal
 *
 * Central queue for reviewing citizen applications across all 9 services.
 *
 * List view:
 *   - Stat cards (pending, paid, approved, rejected counts)
 *   - Filters by status, service, region/ward, urgency
 *   - Search by application number, citizen name, or NIDA
 *   - Sortable table with key fields
 *
 * Detail view (right-side panel on desktop, full screen on mobile):
 *   - Citizen info card
 *   - Full form_data rendered as key/value (categorized where possible)
 *   - Documents (uploaded URLs from form data)
 *   - Status history / audit trail
 *   - Action panel: Approve / Reject (reason) / Request More Info /
 *     Mark Paid (for cash) / Issue Document
 */
import React, { useState, useEffect, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ClipboardCheck,
  Search,
  Filter,
  Loader2,
  CheckCircle,
  XCircle,
  Clock,
  AlertCircle,
  Eye,
  X,
  User,
  FileText,
  Calendar,
  MapPin,
  CreditCard,
  MessageSquare,
  RefreshCw,
  ChevronRight,
  ArrowLeft,
  Download,
  Send,
  ShieldAlert,
  Banknote,
  Award,
  Inbox,
  ListFilter,
  ChevronDown,
  Hash,
  Phone,
  Mail,
  ExternalLink,
  CheckCircle2,
  AlertTriangle,
  FileCheck,
  DollarSign,
  ArrowUpRight,
} from "lucide-react";
import { supabase, Application, UserProfile } from "@/lib/supabase";
import { logActivity } from "@/lib/activity-log";
import { createNotification } from "@/lib/notifications";
import { useAuth } from "@/context/AuthContext";
import { useLanguage } from "@/context/LanguageContext";
import { useToast } from "@/context/ToastContext";
import { StatusBadge } from "@/components/ui/StatusBadge";
import type { ApplicationStatus } from "@/types";

// ─── Types ────────────────────────────────────────────────────────────────────

interface AppRecord extends Application {
  user?: {
    id?: string;
    first_name: string;
    last_name: string;
    middle_name?: string;
    nida_number?: string;
    citizen_id?: string;
    phone?: string;
    email?: string;
    ward?: string;
    district?: string;
    region?: string;
  };
}

type StatusFilter = "all" | ApplicationStatus;
type ServiceFilter = "all" | string;

interface ApplicationReviewProps {
  lang: string;
}

// ─── Constants ───────────────────────────────────────────────────────────────

const SERVICE_FILTERS = [
  { value: "all", sw: "Huduma Zote", en: "All Services", icon: "📋" },
  { value: "Utambulisho wa Mkazi", sw: "Utambulisho", en: "Resident ID", icon: "🪪" },
  { value: "Kibari cha Mazishi", sw: "Mazishi", en: "Burial", icon: "🕊" },
  { value: "Kibari cha Sherehe", sw: "Sherehe", en: "Celebration", icon: "🎉" },
  { value: "Kibari cha Ujezi Mdogo", sw: "Ujezi", en: "Construction", icon: "🏗" },
  { value: "Barua ya Utambulisho", sw: "Barua", en: "Intro Letter", icon: "📝" },
  { value: "Makubaliano ya Mauzo", sw: "Mauzo", en: "Sales", icon: "🤝" },
  { value: "Makubaliano ya Pango", sw: "Pango", en: "Rental", icon: "🔑" },
  { value: "Malipo na Michango", sw: "Malipo", en: "Payments", icon: "💰" },
  { value: "Migogoro na Mashauri", sw: "Migogoro", en: "Disputes", icon: "⚖" },
];

const STATUS_FILTERS = [
  { value: "all", sw: "Zote", en: "All", color: "stone" },
  { value: "submitted", sw: "Mpya", en: "New", color: "blue" },
  { value: "pending_review", sw: "Inakaguliwa", en: "Under Review", color: "amber" },
  { value: "pending_payment", sw: "Inasubiri Malipo", en: "Awaiting Payment", color: "yellow" },
  { value: "paid", sw: "Imelipiwa", en: "Paid", color: "emerald" },
  { value: "verified", sw: "Imethibitishwa", en: "Verified", color: "teal" },
  { value: "approved", sw: "Imeidhinishwa", en: "Approved", color: "green" },
  { value: "issued", sw: "Imetolewa", en: "Issued", color: "indigo" },
  { value: "rejected", sw: "Imekataliwa", en: "Rejected", color: "red" },
  { value: "returned", sw: "Imerudishwa", en: "Returned", color: "orange" },
];

// Fields we always hide in form_data preview (already shown elsewhere or noise)
const HIDDEN_FORM_FIELDS = new Set([
  "service_name",
  "application_reference",
  "total_fee",
  "document_count",
  "terms_accepted",
  "data_confirmed",
  "seller_confirmed",
  "landlord_confirmed",
  "applicant_signature",
  "weo_signature",
  "weo_stamp",
  "weo_name",
  "photo_url",
  "applicant_name",
  "uploaded_documents",
]);

// ─── Helpers ─────────────────────────────────────────────────────────────────

const fmtKey = (k: string) => k.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

const fmtVal = (v: unknown): string => {
  if (v == null || v === "") return "—";
  if (typeof v === "boolean") return v ? "✓ Yes" : "✗ No";
  if (Array.isArray(v)) return v.length ? v.join(", ") : "—";
  if (typeof v === "object") return JSON.stringify(v);
  return String(v);
};

const isDocUrl = (v: unknown): boolean =>
  typeof v === "string" &&
  ((/^https?:\/\//.test(v) && /\.(jpg|jpeg|png|webp|pdf)$/i.test(v)) ||
    /^data:(image\/(jpeg|jpg|png|webp)|application\/pdf);base64,/i.test(v));

// ─── Main Component ──────────────────────────────────────────────────────────

export function ApplicationReview({ lang }: ApplicationReviewProps) {
  const { user } = useAuth();
  const { showToast } = useToast();
  const L = (sw: string, en: string) => (lang === "sw" ? sw : en);

  // Data state
  const [apps, setApps] = useState<AppRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Filter state
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("pending_review");
  const [serviceFilter, setServiceFilter] = useState<ServiceFilter>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [showFilters, setShowFilters] = useState(false);

  // Detail panel state
  const [selected, setSelected] = useState<AppRecord | null>(null);
  const [processing, setProcessing] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectionReason, setRejectionReason] = useState("");
  const [showInfoRequestModal, setShowInfoRequestModal] = useState(false);
  const [showEscalateModal, setShowEscalateModal] = useState(false);
  const [departments, setDepartments] = useState<
    { id: string; name: string; code: string; region?: string; district?: string }[]
  >([]);
  const [escalateDeptId, setEscalateDeptId] = useState("");
  const [escalateNote, setEscalateNote] = useState("");
  const [escalating, setEscalating] = useState(false);
  const [infoRequest, setInfoRequest] = useState("");

  // ─── Fetch applications ─────────────────────────────────────────────────
  const fetchApps = useCallback(async () => {
    setRefreshing(true);
    try {
      let query = supabase
        .from("applications")
        .select(
          `
          *,
          user:users!applications_user_id_fkey (
            id, first_name, middle_name, last_name,
            nida_number, citizen_id, phone, email,
            ward, district, region
          )
        `,
        )
        .order("created_at", { ascending: false })
        .limit(200);

      // Scope to staff's assigned region/district if applicable
      if (user?.assigned_district) {
        query = query.eq("district", user.assigned_district);
      } else if (user?.assigned_region) {
        query = query.eq("region", user.assigned_region);
      }

      const { data, error } = await query;
      if (error) {
        console.error("fetch apps", error);
        return;
      }
      setApps((data as AppRecord[]) || []);
    } catch (e) {
      console.error("fetch apps exception", e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user?.assigned_region, user?.assigned_district]);

  useEffect(() => {
    fetchApps();
  }, [fetchApps]);

  // ─── Filtered list ──────────────────────────────────────────────────────
  const filteredApps = useMemo(() => {
    return apps.filter((a) => {
      if (statusFilter !== "all" && a.status !== statusFilter) return false;
      if (serviceFilter !== "all" && a.service_name !== serviceFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matches =
          a.application_number?.toLowerCase().includes(q) ||
          a.user?.first_name?.toLowerCase().includes(q) ||
          a.user?.last_name?.toLowerCase().includes(q) ||
          a.user?.nida_number?.toLowerCase().includes(q) ||
          a.user?.citizen_id?.toLowerCase().includes(q) ||
          a.user?.phone?.toLowerCase().includes(q);
        if (!matches) return false;
      }
      return true;
    });
  }, [apps, statusFilter, serviceFilter, searchQuery]);

  // ─── Stats ──────────────────────────────────────────────────────────────
  const stats = useMemo(
    () => ({
      pending_review: apps.filter((a) => a.status === "pending_review" || a.status === "submitted")
        .length,
      pending_payment: apps.filter((a) => a.status === "pending_payment").length,
      paid: apps.filter((a) => a.status === "paid").length,
      approved_today: apps.filter(
        (a) =>
          a.status === "approved" &&
          a.approved_at &&
          new Date(a.approved_at).toDateString() === new Date().toDateString(),
      ).length,
      total: apps.length,
    }),
    [apps],
  );

  // ─── Action handlers ────────────────────────────────────────────────────
  const updateApp = async (id: string, patch: Partial<Application>): Promise<boolean> => {
    setProcessing(true);
    try {
      const { error } = await supabase
        .from("applications")
        .update({
          ...patch,
          updated_at: new Date().toISOString(),
        })
        .eq("id", id);
      if (error) throw error;
      // refresh
      setApps((prev) => prev.map((a) => (a.id === id ? ({ ...a, ...patch } as AppRecord) : a)));
      if (selected?.id === id)
        setSelected((prev) => (prev ? ({ ...prev, ...patch } as AppRecord) : prev));
      return true;
    } catch (e: unknown) {
      console.error("updateApp", e);
      showToast(L("Imeshindwa kusasisha", "Failed to update"), "error");
      return false;
    } finally {
      setProcessing(false);
    }
  };

  // Fetch departments for escalation dropdown
  const fetchDepartments = async () => {
    const { data } = await supabase
      .from("government_departments")
      .select("id, name, code, region, district")
      .eq("active", true)
      .order("name");
    setDepartments(data || []);
  };

  const handleEscalate = async () => {
    if (!selected || !escalateDeptId || !user) return;
    setEscalating(true);
    try {
      const { error } = await supabase.from("escalations").insert({
        application_id: selected.id,
        from_user_id: user.id,
        to_department_id: escalateDeptId,
        escalation_note: escalateNote.trim() || null,
        priority: "normal",
      });
      if (error) throw error;
      logActivity(user.id, "submit_application", {
        action: "escalate",
        applicationId: selected.id,
        department: escalateDeptId,
      });
      showToast(
        lang === "sw" ? "Maombi yamepandishwa kwa idara!" : "Application escalated to department!",
        "success",
      );
      setShowEscalateModal(false);
      setEscalateNote("");
      setEscalateDeptId("");
    } catch (err: unknown) {
      const e = err as { message?: string };
      showToast(e.message || "Error", "error");
    } finally {
      setEscalating(false);
    }
  };

  const handleApprove = async () => {
    if (!selected || !user) return;

    // Embed the approving officer's signature, stamp and name into form_data so
    // they render in the Ward Executive Officer section of the certificate.
    const existingFormData = (selected.form_data as Record<string, unknown>) || {};
    const officerName = `${user.first_name ?? ""} ${user.middle_name ?? ""} ${user.last_name ?? ""}`
      .replace(/\s+/g, " ")
      .trim();
    const mergedFormData = {
      ...existingFormData,
      weo_signature: user.signature_url ?? existingFormData.weo_signature ?? null,
      weo_stamp: user.stamp_url ?? existingFormData.weo_stamp ?? null,
      weo_name: officerName || existingFormData.weo_name || "",
    };

    if (!user.signature_url) {
      showToast(
        lang === "sw"
          ? "Kidokezo: Ongeza saini yako kwenye Wasifu > Saini & Muhuri ili ionekane kwenye cheti."
          : "Tip: Add your signature in Profile > Signature & Stamp so it appears on the certificate.",
        "info",
      );
    }

    const ok = await updateApp(selected.id, {
      status: "approved",
      approved_at: new Date().toISOString(),
      approved_by: user.id,
      form_data: mergedFormData as Application["form_data"],
    });
    if (ok) {
      showToast(L("Maombi yameidhinishwa", "Application approved"), "success");
      if (selected.user_id) {
        await createNotification({
          user_id: selected.user_id,
          title: lang === "sw" ? "Maombi Yameidhinishwa" : "Application Approved",
          message:
            lang === "sw"
              ? `Maombi yako ya ${selected.service_name} (${selected.application_number}) yameidhinishwa.`
              : `Your ${selected.service_name} application (${selected.application_number}) has been approved.`,
          type: "success",
        });
      }
    }
  };

  const handleReject = async () => {
    if (!selected || !user || !rejectionReason.trim()) return;
    const ok = await updateApp(selected.id, {
      status: "rejected",
      rejected_by: user.id,
      feedback: rejectionReason,
    });
    if (ok) {
      showToast(L("Maombi yamekataliwa", "Application rejected"), "success");
      setShowRejectModal(false);
      if (selected.user_id) {
        await createNotification({
          user_id: selected.user_id,
          title: lang === "sw" ? "Maombi Yamekataliwa" : "Application Rejected",
          message:
            (lang === "sw"
              ? `Maombi yako ya ${selected.service_name} (${selected.application_number}) yamekataliwa. Sababu: `
              : `Your ${selected.service_name} application (${selected.application_number}) has been rejected. Reason: `) +
            rejectionReason,
          type: "error",
        });
      }
      setRejectionReason("");
    }
  };

  const handleRequestInfo = async () => {
    if (!selected || !infoRequest.trim()) return;
    const ok = await updateApp(selected.id, {
      status: "returned",
      returned_by: user?.id,
      feedback: infoRequest,
    });
    if (ok) {
      showToast(L("Ombi la taarifa zaidi limetumwa", "Info request sent to citizen"), "success");
      setShowInfoRequestModal(false);
      if (selected.user_id) {
        await createNotification({
          user_id: selected.user_id,
          title: lang === "sw" ? "Taarifa Zaidi Zinahitajika" : "Additional Info Required",
          message:
            (lang === "sw"
              ? `Ofisi imeomba taarifa zaidi kuhusu maombi yako ya ${selected.service_name}: `
              : `The office has requested more info on your ${selected.service_name} application: `) +
            infoRequest,
          type: "warning",
        });
      }
      setInfoRequest("");
    }
  };

  const handleMarkPaid = async () => {
    if (!selected) return;
    const ok = await updateApp(selected.id, {
      status: "paid",
      paid_at: new Date().toISOString(),
    });
    if (ok) {
      showToast(L("Imewekwa kuwa imelipiwa", "Marked as paid"), "success");
      if (selected.user_id) {
        await createNotification({
          user_id: selected.user_id,
          title: lang === "sw" ? "Malipo Yamethibitishwa" : "Payment Confirmed",
          message:
            lang === "sw"
              ? `Malipo ya maombi yako (${selected.application_number}) yamethibitishwa.`
              : `Payment for your application (${selected.application_number}) has been confirmed.`,
          type: "success",
        });
      }
    }
  };

  const handleVerify = async () => {
    if (!selected || !user) return;
    const ok = await updateApp(selected.id, {
      status: "verified",
      verified_at: new Date().toISOString(),
      verified_by: user.id,
    });
    if (ok) {
      showToast(L("Imethibitishwa", "Verified"), "success");
      if (selected.user_id) {
        await createNotification({
          user_id: selected.user_id,
          title: lang === "sw" ? "Maombi Yamethibitishwa" : "Application Verified",
          message:
            lang === "sw"
              ? `Maombi yako (${selected.application_number}) yamethibitishwa.`
              : `Your application (${selected.application_number}) has been verified.`,
          type: "success",
        });
      }
    }
  };

  const handleIssue = async () => {
    if (!selected || !user) return;
    const ok = await updateApp(selected.id, {
      status: "issued",
      issued_at: new Date().toISOString(),
      issued_by: user.id,
    });
    if (ok) {
      showToast(L("Hati imetolewa", "Document issued"), "success");
      if (selected.user_id) {
        await createNotification({
          user_id: selected.user_id,
          title: lang === "sw" ? "Hati Yako Iko Tayari" : "Your Document Is Ready",
          message:
            lang === "sw"
              ? `Hati rasmi ya ${selected.service_name} iko tayari. Pakua kutoka Maombi Yangu.`
              : `Your official ${selected.service_name} document is ready. Download from My Applications.`,
          type: "success",
        });
      }
    }
  };

  // ─── Categorized form_data ──────────────────────────────────────────────
  const formDataEntries = useMemo(() => {
    if (!selected?.form_data) return { fields: [], docs: [] };
    const entries = Object.entries(selected.form_data as Record<string, unknown>);
    const fields: [string, unknown][] = [];
    const docs: { key: string; url: string }[] = [];

    // Structured uploads saved by submitApplication (selfie, id_front, etc.)
    const uploaded = (selected.form_data as Record<string, unknown>).uploaded_documents;
    if (Array.isArray(uploaded)) {
      uploaded.forEach((d) => {
        const doc = d as { type?: string; name?: string; dataUrl?: string };
        if (doc?.dataUrl) {
          docs.push({ key: doc.type || doc.name || "document", url: doc.dataUrl });
        }
      });
    }

    for (const [k, v] of entries) {
      if (HIDDEN_FORM_FIELDS.has(k)) continue;
      if (k === "uploaded_documents") continue; // already handled above
      if (isDocUrl(v)) {
        docs.push({ key: k, url: v as string });
      } else if (Array.isArray(v) && v.length > 0 && v.every(isDocUrl)) {
        v.forEach((url, i) => docs.push({ key: `${k}_${i + 1}`, url: url as string }));
      } else {
        fields.push([k, v]);
      }
    }
    return { fields, docs };
  }, [selected]);

  // ─── Helpers ───────────────────────────────────────────────────────────
  const closeDetail = () => {
    setSelected(null);
    setShowRejectModal(false);
    setShowInfoRequestModal(false);
  };
  const serviceMeta = (name: string) =>
    SERVICE_FILTERS.find((s) => s.value === name) || SERVICE_FILTERS[0];

  // ─── Loading ────────────────────────────────────────────────────────────
  if (loading)
    return (
      <div className="flex items-center justify-center min-h-[40vh]">
        <Loader2 size={32} className="animate-spin text-stone-400" />
      </div>
    );

  // ─── Render ─────────────────────────────────────────────────────────────
  return (
    <div className="max-w-7xl mx-auto px-3 sm:px-6 py-4 sm:py-6 space-y-4">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-stone-900 flex items-center gap-2">
            <ClipboardCheck size={22} className="text-emerald-600" />
            {L("Uhakiki wa Maombi", "Application Review")}
          </h1>
          <p className="text-xs sm:text-sm text-stone-500 mt-0.5">
            {L(
              "Pitia, idhinisha, au katalia maombi ya wananchi",
              "Review, approve, or reject citizen applications",
            )}
            {user?.assigned_district && ` · ${user.assigned_district}`}
          </p>
        </div>
        <button
          onClick={fetchApps}
          disabled={refreshing}
          className="p-2 text-stone-500 hover:text-stone-800 hover:bg-stone-100 rounded-lg transition-colors disabled:opacity-50"
        >
          <RefreshCw size={18} className={refreshing ? "animate-spin" : ""} />
        </button>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 sm:gap-3">
        {[
          {
            label: L("Inakaguliwa", "Under Review"),
            value: stats.pending_review,
            color: "amber",
            icon: Clock,
          },
          {
            label: L("Malipo Mada", "Awaiting Pay"),
            value: stats.pending_payment,
            color: "yellow",
            icon: DollarSign,
          },
          { label: L("Imelipiwa", "Paid"), value: stats.paid, color: "emerald", icon: Banknote },
          {
            label: L("Leo Idhini", "Approved Today"),
            value: stats.approved_today,
            color: "green",
            icon: CheckCircle,
          },
          { label: L("Jumla", "Total"), value: stats.total, color: "stone", icon: Inbox },
        ].map((s) => {
          const Icon = s.icon;
          return (
            <div
              key={s.label}
              className={`bg-${s.color}-50 border border-${s.color}-200 rounded-xl p-3 sm:p-4`}
            >
              <div className="flex items-center justify-between mb-1">
                <Icon size={15} className={`text-${s.color}-600`} />
                <span className={`text-xl sm:text-2xl font-black text-${s.color}-700`}>
                  {s.value}
                </span>
              </div>
              <p
                className={`text-[10px] sm:text-xs font-bold text-${s.color}-600 uppercase tracking-wide leading-tight`}
              >
                {s.label}
              </p>
            </div>
          );
        })}
      </div>

      {/* Search + Filter toggle */}
      <div className="bg-white rounded-xl border border-stone-200 p-3 space-y-3">
        <div className="flex gap-2">
          <div className="flex-1 relative">
            <Search
              size={16}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400 pointer-events-none"
            />
            <input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={L(
                "Tafuta jina, NIDA, CT ID, simu, au namba ya maombi",
                "Search name, NIDA, CT ID, phone, or application number",
              )}
              className="w-full pl-10 pr-4 py-2.5 border border-stone-200 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
            />
          </div>
          <button
            onClick={() => setShowFilters((s) => !s)}
            className={`px-3 py-2.5 rounded-xl border-2 text-sm font-bold transition-colors flex items-center gap-1.5 ${
              showFilters || statusFilter !== "all" || serviceFilter !== "all"
                ? "bg-emerald-50 border-emerald-300 text-emerald-700"
                : "bg-white border-stone-200 text-stone-600 hover:bg-stone-50"
            }`}
          >
            <ListFilter size={15} />
            <span className="hidden sm:inline">{L("Chuja", "Filter")}</span>
            {(statusFilter !== "all" || serviceFilter !== "all") && (
              <span className="text-[10px] bg-emerald-200 text-emerald-800 px-1.5 py-0.5 rounded-full font-black">
                {[statusFilter !== "all", serviceFilter !== "all"].filter(Boolean).length}
              </span>
            )}
          </button>
        </div>

        {/* Status filter chips */}
        {showFilters && (
          <motion.div
            initial={{ opacity: 0, y: -5 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-3 pt-2 border-t border-stone-100"
          >
            <div>
              <p className="text-[10px] font-black text-stone-500 uppercase tracking-wider mb-1.5">
                {L("Hali", "Status")}
              </p>
              <div className="flex gap-1.5 overflow-x-auto pb-1">
                {STATUS_FILTERS.map((s) => (
                  <button
                    key={s.value}
                    onClick={() => setStatusFilter(s.value as StatusFilter)}
                    className={`px-3 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-all ${
                      statusFilter === s.value
                        ? `bg-${s.color}-600 text-white`
                        : `bg-${s.color}-50 text-${s.color}-700 hover:bg-${s.color}-100`
                    }`}
                  >
                    {lang === "sw" ? s.sw : s.en}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <p className="text-[10px] font-black text-stone-500 uppercase tracking-wider mb-1.5">
                {L("Huduma", "Service")}
              </p>
              <div className="flex gap-1.5 overflow-x-auto pb-1">
                {SERVICE_FILTERS.map((s) => (
                  <button
                    key={s.value}
                    onClick={() => setServiceFilter(s.value)}
                    className={`px-3 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-all flex items-center gap-1.5 ${
                      serviceFilter === s.value
                        ? "bg-stone-800 text-white"
                        : "bg-stone-100 text-stone-700 hover:bg-stone-200"
                    }`}
                  >
                    <span>{s.icon}</span>
                    {lang === "sw" ? s.sw : s.en}
                  </button>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </div>

      {/* Results count */}
      <div className="flex items-center justify-between text-xs text-stone-500">
        <span>
          <span className="font-black text-stone-700">{filteredApps.length}</span>{" "}
          {L("maombi yamepatikana", "applications found")}
        </span>
      </div>

      {/* Applications List */}
      <div className="space-y-2">
        {filteredApps.length === 0 ? (
          <div className="bg-white rounded-2xl border border-stone-200 p-12 text-center">
            <Inbox size={40} className="mx-auto text-stone-300 mb-3" />
            <p className="font-bold text-stone-600">
              {L("Hakuna maombi yanayolingana", "No matching applications")}
            </p>
            <p className="text-xs text-stone-400 mt-1">
              {L("Badilisha vichujio kuona zaidi", "Adjust filters to see more")}
            </p>
          </div>
        ) : (
          filteredApps.map((app) => {
            const svc = serviceMeta(app.service_name);
            const citizen =
              `${app.user?.first_name || ""} ${app.user?.last_name || ""}`.trim() ||
              L("Hahanijulikani", "Unknown");
            return (
              <button
                key={app.id}
                onClick={() => setSelected(app)}
                className="w-full bg-white hover:bg-stone-50 border border-stone-200 hover:border-emerald-300 rounded-xl p-4 transition-all text-left"
              >
                <div className="flex items-start gap-3">
                  {/* Service icon */}
                  <div className="w-10 h-10 rounded-xl bg-stone-100 flex items-center justify-center text-lg shrink-0">
                    {svc.icon}
                  </div>

                  {/* Main info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2 flex-wrap">
                      <div className="min-w-0">
                        <h3 className="font-bold text-stone-800 text-sm truncate">{citizen}</h3>
                        <p className="text-xs text-stone-500 truncate">{app.service_name}</p>
                      </div>
                      <StatusBadge status={app.status} lang={lang} />
                    </div>

                    <div className="flex items-center gap-x-3 gap-y-1 mt-2 text-xs text-stone-400 flex-wrap">
                      <span className="font-mono font-bold text-stone-600">
                        {app.application_number}
                      </span>
                      {app.user?.nida_number && (
                        <span className="flex items-center gap-1">
                          <Hash size={10} />
                          {app.user.nida_number}
                        </span>
                      )}
                      {app.user?.ward && (
                        <span className="flex items-center gap-1">
                          <MapPin size={10} />
                          {app.user.ward}
                        </span>
                      )}
                      <span className="flex items-center gap-1">
                        <Calendar size={10} />
                        {new Date(app.created_at).toLocaleDateString(
                          lang === "sw" ? "sw-TZ" : "en-US",
                          { day: "numeric", month: "short" },
                        )}
                      </span>
                    </div>
                  </div>

                  <ChevronRight size={18} className="text-stone-300 shrink-0 mt-2" />
                </div>
              </button>
            );
          })
        )}
      </div>

      {/* ──────────── Detail Panel (slide-over) ──────────── */}
      <AnimatePresence>
        {selected && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={closeDetail}
              className="fixed inset-0 bg-stone-900/40 backdrop-blur-sm z-40"
            />
            <motion.div
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "tween", duration: 0.25 }}
              className="fixed inset-y-0 right-0 w-full sm:w-[640px] max-w-full bg-white shadow-2xl z-50 flex flex-col"
            >
              {/* Detail header */}
              <div className="px-4 py-3 sm:px-6 sm:py-4 border-b border-stone-200 flex items-center justify-between gap-3 shrink-0">
                <div className="flex items-center gap-3 min-w-0">
                  <button
                    onClick={closeDetail}
                    className="p-1.5 -ml-1 text-stone-500 hover:text-stone-800 hover:bg-stone-100 rounded-lg"
                  >
                    <ArrowLeft size={20} />
                  </button>
                  <div className="min-w-0">
                    <p className="text-[10px] font-bold text-stone-400 uppercase tracking-wider">
                      {selected.service_name}
                    </p>
                    <p className="text-base font-black text-stone-900 truncate">
                      {selected.application_number}
                    </p>
                  </div>
                </div>
                <StatusBadge status={selected.status} lang={lang} />
              </div>

              {/* Detail body */}
              <div className="flex-1 overflow-y-auto px-4 py-4 sm:px-6 sm:py-5 space-y-4">
                {/* Citizen Card */}
                <div className="bg-stone-50 border border-stone-200 rounded-2xl p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <User size={14} className="text-stone-600" />
                    <p className="text-[10px] font-black text-stone-600 uppercase tracking-wider">
                      {L("Mwombaji", "Applicant")}
                    </p>
                  </div>
                  <p className="font-black text-stone-900 text-base">
                    {`${selected.user?.first_name || ""} ${selected.user?.middle_name || ""} ${selected.user?.last_name || ""}`
                      .replace(/\s+/g, " ")
                      .trim()}
                  </p>
                  <div className="grid grid-cols-2 gap-x-3 gap-y-1.5 mt-3 text-xs">
                    {selected.user?.nida_number && (
                      <div>
                        <span className="text-stone-400">NIDA:</span>{" "}
                        <span className="font-bold text-stone-700">
                          {selected.user.nida_number}
                        </span>
                      </div>
                    )}
                    {selected.user?.citizen_id && (
                      <div>
                        <span className="text-stone-400">CT ID:</span>{" "}
                        <span className="font-bold text-stone-700">{selected.user.citizen_id}</span>
                      </div>
                    )}
                    {selected.user?.phone && (
                      <div>
                        <span className="text-stone-400">{L("Simu:", "Phone:")}</span>{" "}
                        <span className="font-bold text-stone-700">{selected.user.phone}</span>
                      </div>
                    )}
                    {selected.user?.email && (
                      <div className="truncate">
                        <span className="text-stone-400">Email:</span>{" "}
                        <span className="font-bold text-stone-700">{selected.user.email}</span>
                      </div>
                    )}
                    {selected.user?.ward && (
                      <div>
                        <span className="text-stone-400">{L("Kata:", "Ward:")}</span>{" "}
                        <span className="font-bold text-stone-700">{selected.user.ward}</span>
                      </div>
                    )}
                    {selected.user?.district && (
                      <div>
                        <span className="text-stone-400">{L("Wilaya:", "District:")}</span>{" "}
                        <span className="font-bold text-stone-700">{selected.user.district}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Form Data */}
                {formDataEntries.fields.length > 0 && (
                  <div className="bg-white border border-stone-200 rounded-2xl overflow-hidden">
                    <div className="bg-stone-50 px-4 py-2.5 border-b border-stone-200 flex items-center gap-2">
                      <FileText size={13} className="text-stone-600" />
                      <p className="text-[10px] font-black text-stone-600 uppercase tracking-wider">
                        {L("Taarifa za Maombi", "Application Details")}
                      </p>
                    </div>
                    <div className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-2.5">
                      {formDataEntries.fields.map(([k, v]) => (
                        <div key={k} className="min-w-0">
                          <p className="text-[10px] font-bold text-stone-400 uppercase tracking-wider mb-0.5">
                            {fmtKey(k)}
                          </p>
                          <p className="text-xs text-stone-800 font-semibold break-words">
                            {fmtVal(v)}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Documents */}
                {formDataEntries.docs.length > 0 && (
                  <div className="bg-white border border-stone-200 rounded-2xl overflow-hidden">
                    <div className="bg-stone-50 px-4 py-2.5 border-b border-stone-200 flex items-center gap-2">
                      <FileCheck size={13} className="text-stone-600" />
                      <p className="text-[10px] font-black text-stone-600 uppercase tracking-wider">
                        {L("Nyaraka", "Documents")} ({formDataEntries.docs.length})
                      </p>
                    </div>
                    <div className="p-3 grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {formDataEntries.docs.map((doc, i) => {
                        const isPdf =
                          doc.url.toLowerCase().endsWith(".pdf") ||
                          doc.url.startsWith("data:application/pdf");
                        return (
                          <a
                            key={i}
                            href={doc.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="group block bg-stone-50 hover:bg-stone-100 border border-stone-200 rounded-xl overflow-hidden transition-all"
                          >
                            <div className="aspect-square bg-stone-100 flex items-center justify-center">
                              {isPdf ? (
                                <FileText size={32} className="text-stone-500" />
                              ) : (
                                <img
                                  src={doc.url}
                                  alt=""
                                  className="w-full h-full object-cover"
                                  loading="lazy"
                                />
                              )}
                            </div>
                            <div className="px-2 py-1.5 flex items-center justify-between gap-1">
                              <p className="text-[10px] text-stone-600 font-bold truncate">
                                {fmtKey(doc.key)}
                              </p>
                              <ExternalLink
                                size={10}
                                className="text-stone-400 group-hover:text-stone-700 shrink-0"
                              />
                            </div>
                          </a>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Fee */}
                {Number((selected.form_data as Record<string, unknown>)?.total_fee ?? 0) > 0 && (
                  <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 flex justify-between items-center">
                    <span className="text-xs font-bold text-emerald-800">{L("Ada:", "Fee:")}</span>
                    <span className="text-lg font-black text-emerald-700">
                      TSh{" "}
                      {(
                        (selected.form_data as Record<string, unknown>)?.total_fee as number
                      ).toLocaleString()}
                    </span>
                  </div>
                )}

                {/* Feedback / rejection reason */}
                {selected.feedback && (
                  <div
                    className={`border rounded-xl p-3 ${
                      selected.status === "rejected"
                        ? "bg-red-50 border-red-200"
                        : selected.status === "returned"
                          ? "bg-amber-50 border-amber-200"
                          : "bg-blue-50 border-blue-200"
                    }`}
                  >
                    <p
                      className={`text-[10px] font-bold uppercase tracking-wider mb-1 ${
                        selected.status === "rejected"
                          ? "text-red-700"
                          : selected.status === "returned"
                            ? "text-amber-700"
                            : "text-blue-700"
                      }`}
                    >
                      {selected.status === "rejected"
                        ? L("Sababu ya Kukataliwa", "Rejection Reason")
                        : selected.status === "returned"
                          ? L("Ombi la Taarifa Zaidi", "Info Request")
                          : L("Maoni", "Feedback")}
                    </p>
                    <p
                      className={`text-xs ${
                        selected.status === "rejected"
                          ? "text-red-700"
                          : selected.status === "returned"
                            ? "text-amber-700"
                            : "text-blue-700"
                      }`}
                    >
                      {selected.feedback}
                    </p>
                  </div>
                )}

                {/* Audit Trail */}
                <div className="bg-white border border-stone-200 rounded-2xl overflow-hidden">
                  <div className="bg-stone-50 px-4 py-2.5 border-b border-stone-200 flex items-center gap-2">
                    <Clock size={13} className="text-stone-600" />
                    <p className="text-[10px] font-black text-stone-600 uppercase tracking-wider">
                      {L("Historia", "Timeline")}
                    </p>
                  </div>
                  <div className="p-4 space-y-2 text-xs">
                    {[
                      {
                        label: L("Iliwasilishwa", "Submitted"),
                        date: selected.created_at,
                        icon: "📤",
                      },
                      selected.paid_at && {
                        label: L("Ilipiwa", "Paid"),
                        date: selected.paid_at,
                        icon: "💰",
                      },
                      selected.verified_at && {
                        label: L("Imethibitishwa", "Verified"),
                        date: selected.verified_at,
                        icon: "✅",
                      },
                      selected.approved_at && {
                        label: L("Imeidhinishwa", "Approved"),
                        date: selected.approved_at,
                        icon: "👍",
                      },
                      selected.issued_at && {
                        label: L("Imetolewa", "Issued"),
                        date: selected.issued_at,
                        icon: "🎉",
                      },
                    ]
                      .filter(
                        (e): e is { label: string; date: string; icon: string } =>
                          typeof e === "object" && e !== null,
                      )
                      .map((e, i) => (
                        <div key={i} className="flex items-center gap-2.5">
                          <span className="text-base">{e.icon}</span>
                          <p className="flex-1 text-stone-600 font-semibold">{e.label}</p>
                          <p className="text-stone-400">
                            {new Date(e.date).toLocaleString(lang === "sw" ? "sw-TZ" : "en-US", {
                              day: "numeric",
                              month: "short",
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </p>
                        </div>
                      ))}
                  </div>
                </div>
              </div>

              {/* Action footer */}
              {!["approved", "issued", "rejected", "refunded"].includes(selected.status) && (
                <div className="border-t border-stone-200 bg-stone-50 px-4 py-3 sm:px-6 sm:py-4 shrink-0">
                  <div className="grid grid-cols-2 gap-2">
                    {/* Reject button — always available unless terminal */}
                    <button
                      onClick={() => setShowRejectModal(true)}
                      disabled={processing}
                      className="px-3 py-2.5 bg-red-50 hover:bg-red-100 border border-red-200 text-red-700 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition-colors disabled:opacity-50"
                    >
                      <XCircle size={14} /> {L("Kataa", "Reject")}
                    </button>
                    <button
                      onClick={() => setShowInfoRequestModal(true)}
                      disabled={processing}
                      className="px-3 py-2.5 bg-amber-50 hover:bg-amber-100 border border-amber-200 text-amber-700 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition-colors disabled:opacity-50"
                    >
                      <MessageSquare size={14} /> {L("Omba Taarifa", "Request Info")}
                    </button>
                    <button
                      onClick={() => {
                        fetchDepartments();
                        setShowEscalateModal(true);
                      }}
                      disabled={processing}
                      className="col-span-2 px-3 py-2.5 bg-blue-50 hover:bg-blue-100 border border-blue-200 text-blue-700 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition-colors disabled:opacity-50"
                    >
                      <ArrowUpRight size={14} /> {L("Pandisha kwa Idara", "Escalate to Department")}
                    </button>

                    {/* Status-specific primary action */}
                    {["submitted", "pending_review"].includes(selected.status) && (
                      <button
                        onClick={handleApprove}
                        disabled={processing}
                        className="col-span-2 px-3 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-sm flex items-center justify-center gap-1.5 transition-colors disabled:opacity-50 shadow-lg"
                      >
                        {processing ? (
                          <Loader2 size={15} className="animate-spin" />
                        ) : (
                          <CheckCircle size={15} />
                        )}
                        {L("Idhinisha", "Approve")}
                      </button>
                    )}
                    {selected.status === "pending_payment" && (
                      <button
                        onClick={handleMarkPaid}
                        disabled={processing}
                        className="col-span-2 px-3 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-sm flex items-center justify-center gap-1.5 transition-colors disabled:opacity-50 shadow-lg"
                      >
                        {processing ? (
                          <Loader2 size={15} className="animate-spin" />
                        ) : (
                          <Banknote size={15} />
                        )}
                        {L("Weka Imelipiwa", "Mark as Paid")}
                      </button>
                    )}
                    {selected.status === "paid" && (
                      <button
                        onClick={handleVerify}
                        disabled={processing}
                        className="col-span-2 px-3 py-3 bg-teal-600 hover:bg-teal-700 text-white rounded-xl font-bold text-sm flex items-center justify-center gap-1.5 transition-colors disabled:opacity-50 shadow-lg"
                      >
                        {processing ? (
                          <Loader2 size={15} className="animate-spin" />
                        ) : (
                          <FileCheck size={15} />
                        )}
                        {L("Thibitisha", "Verify")}
                      </button>
                    )}
                    {selected.status === "verified" && (
                      <button
                        onClick={handleApprove}
                        disabled={processing}
                        className="col-span-2 px-3 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-sm flex items-center justify-center gap-1.5 transition-colors disabled:opacity-50 shadow-lg"
                      >
                        {processing ? (
                          <Loader2 size={15} className="animate-spin" />
                        ) : (
                          <CheckCircle size={15} />
                        )}
                        {L("Idhinisha", "Approve")}
                      </button>
                    )}
                    {selected.status === "returned" && (
                      <button
                        onClick={handleApprove}
                        disabled={processing}
                        className="col-span-2 px-3 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-sm flex items-center justify-center gap-1.5 transition-colors disabled:opacity-50 shadow-lg"
                      >
                        {processing ? (
                          <Loader2 size={15} className="animate-spin" />
                        ) : (
                          <CheckCircle size={15} />
                        )}
                        {L("Idhinisha", "Approve")}
                      </button>
                    )}
                  </div>
                </div>
              )}

              {/* If approved/issued — show issue button */}
              {selected.status === "approved" && (
                <div className="border-t border-stone-200 bg-stone-50 px-4 py-3 sm:px-6 sm:py-4 shrink-0">
                  <button
                    onClick={handleIssue}
                    disabled={processing}
                    className="w-full px-3 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-sm flex items-center justify-center gap-1.5 transition-colors disabled:opacity-50 shadow-lg"
                  >
                    {processing ? (
                      <Loader2 size={15} className="animate-spin" />
                    ) : (
                      <Award size={15} />
                    )}
                    {L("Toa Hati Rasmi", "Issue Official Document")}
                  </button>
                </div>
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Escalate modal */}
      <AnimatePresence>
        {showEscalateModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4"
            onClick={() => setShowEscalateModal(false)}
          >
            <motion.div
              initial={{ scale: 0.95 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.95 }}
              className="bg-white rounded-2xl shadow-2xl w-full max-w-md"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="px-6 py-4 border-b border-stone-100">
                <h3 className="text-lg font-black text-stone-900 flex items-center gap-2">
                  <ArrowUpRight size={20} className="text-blue-600" />
                  {L("Pandisha kwa Idara", "Escalate to Department")}
                </h3>
              </div>
              <div className="p-6 space-y-4">
                <div>
                  <label className="block text-xs font-bold text-stone-600 uppercase tracking-wider mb-1.5">
                    {L("Chagua Idara", "Select Department")} *
                  </label>
                  <select
                    value={escalateDeptId}
                    onChange={(e) => setEscalateDeptId(e.target.value)}
                    className="w-full px-4 py-3 border border-stone-200 rounded-xl focus:ring-2 focus:ring-blue-500 text-sm"
                  >
                    <option value="">{L("-- Chagua --", "-- Select --")}</option>
                    {departments.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.name} ({d.code}){d.region ? ` — ${d.region}` : ""}
                      </option>
                    ))}
                  </select>
                  {departments.length === 0 && (
                    <p className="text-xs text-amber-600 mt-1 flex items-center gap-1">
                      <AlertCircle size={11} />
                      {L(
                        "Hakuna idara zilizoundwa. Msimamizi aunde idara kwanza.",
                        "No departments created. Admin must create departments first.",
                      )}
                    </p>
                  )}
                </div>
                <div>
                  <label className="block text-xs font-bold text-stone-600 uppercase tracking-wider mb-1.5">
                    {L("Maelezo ya Kupandisha", "Escalation Note")}
                  </label>
                  <textarea
                    value={escalateNote}
                    onChange={(e) => setEscalateNote(e.target.value)}
                    rows={3}
                    placeholder={L(
                      "Eleza kwa nini maombi haya yanahitaji kushughulikiwa na idara...",
                      "Explain why this application needs department involvement...",
                    )}
                    className="w-full px-4 py-3 border border-stone-200 rounded-xl focus:ring-2 focus:ring-blue-500 text-sm resize-none"
                  />
                </div>
              </div>
              <div className="px-6 py-4 border-t border-stone-100 flex justify-end gap-3">
                <button
                  onClick={() => setShowEscalateModal(false)}
                  className="px-5 py-2.5 text-sm font-bold text-stone-600 hover:bg-stone-100 rounded-xl"
                >
                  {L("Ghairi", "Cancel")}
                </button>
                <button
                  onClick={handleEscalate}
                  disabled={escalating || !escalateDeptId}
                  className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-sm disabled:opacity-50 flex items-center gap-2"
                >
                  {escalating && <Loader2 size={14} className="animate-spin" />}
                  {L("Pandisha", "Escalate")}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Reject modal */}
      <AnimatePresence>
        {showRejectModal && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowRejectModal(false)}
              className="fixed inset-0 bg-stone-900/60 z-[60]"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="fixed inset-x-4 top-1/2 -translate-y-1/2 sm:left-1/2 sm:-translate-x-1/2 sm:inset-x-auto sm:w-[500px] bg-white rounded-2xl p-5 shadow-2xl z-[70]"
            >
              <div className="flex items-start gap-3 mb-4">
                <div className="w-10 h-10 bg-red-100 rounded-xl flex items-center justify-center shrink-0">
                  <ShieldAlert size={20} className="text-red-600" />
                </div>
                <div>
                  <h3 className="font-black text-stone-900">
                    {L("Kataa Maombi Haya", "Reject This Application")}
                  </h3>
                  <p className="text-xs text-stone-500 mt-0.5">
                    {L(
                      "Eleza sababu — mwombaji ataona ujumbe huu",
                      "State a reason — the applicant will see this message",
                    )}
                  </p>
                </div>
              </div>
              <textarea
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                rows={4}
                placeholder={L(
                  "Eleza kwa nini maombi yanakataliwa...",
                  "Explain why this application is being rejected...",
                )}
                className="w-full px-3 py-2.5 border border-stone-200 rounded-xl text-sm focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none resize-none"
              />
              <div className="flex gap-2 mt-4">
                <button
                  onClick={() => setShowRejectModal(false)}
                  className="flex-1 py-2.5 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-xl font-bold text-sm"
                >
                  {L("Ghairi", "Cancel")}
                </button>
                <button
                  onClick={handleReject}
                  disabled={!rejectionReason.trim() || processing}
                  className="flex-1 py-2.5 bg-red-600 hover:bg-red-700 disabled:bg-stone-300 text-white rounded-xl font-bold text-sm flex items-center justify-center gap-1.5"
                >
                  {processing ? (
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

      {/* Info request modal */}
      <AnimatePresence>
        {showInfoRequestModal && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowInfoRequestModal(false)}
              className="fixed inset-0 bg-stone-900/60 z-[60]"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="fixed inset-x-4 top-1/2 -translate-y-1/2 sm:left-1/2 sm:-translate-x-1/2 sm:inset-x-auto sm:w-[500px] bg-white rounded-2xl p-5 shadow-2xl z-[70]"
            >
              <div className="flex items-start gap-3 mb-4">
                <div className="w-10 h-10 bg-amber-100 rounded-xl flex items-center justify-center shrink-0">
                  <MessageSquare size={20} className="text-amber-600" />
                </div>
                <div>
                  <h3 className="font-black text-stone-900">
                    {L("Omba Taarifa Zaidi", "Request More Information")}
                  </h3>
                  <p className="text-xs text-stone-500 mt-0.5">
                    {L(
                      "Mwombaji ataona ujumbe huu na atatakiwa kuwasilisha tena",
                      "The applicant will see this and be asked to resubmit",
                    )}
                  </p>
                </div>
              </div>
              <textarea
                value={infoRequest}
                onChange={(e) => setInfoRequest(e.target.value)}
                rows={4}
                placeholder={L(
                  "Mfano: Tafadhali pakia upya picha ya NIDA — picha ni hafifu...",
                  "E.g. Please re-upload the NIDA photo — the image is unclear...",
                )}
                className="w-full px-3 py-2.5 border border-stone-200 rounded-xl text-sm focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none resize-none"
              />
              <div className="flex gap-2 mt-4">
                <button
                  onClick={() => setShowInfoRequestModal(false)}
                  className="flex-1 py-2.5 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-xl font-bold text-sm"
                >
                  {L("Ghairi", "Cancel")}
                </button>
                <button
                  onClick={handleRequestInfo}
                  disabled={!infoRequest.trim() || processing}
                  className="flex-1 py-2.5 bg-amber-600 hover:bg-amber-700 disabled:bg-stone-300 text-white rounded-xl font-bold text-sm flex items-center justify-center gap-1.5"
                >
                  {processing ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
                  {L("Tuma", "Send")}
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

export default ApplicationReview;
