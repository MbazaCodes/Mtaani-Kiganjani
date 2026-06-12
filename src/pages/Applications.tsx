/**
 * Applications.tsx — Citizen application tracker (V2 redesign)
 *
 * Design: card-per-application, status-driven colour strips,
 * slide-in detail drawer, payment gate before download.
 */
import React, { useState, useMemo, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { PDFDownloadLink } from "@react-pdf/renderer";
import {
  Search, Filter, RefreshCw, X, FileText, Clock, CreditCard,
  CheckCircle2, AlertCircle, Share2, Download, Receipt,
  ChevronRight, Lock, Zap, FileCheck, MessageSquare,
  ExternalLink, RotateCcw,
} from "lucide-react";
import { useLanguage } from "../context/LanguageContext";
import { useAuth } from "../context/AuthContext";
import { ApplicationChat } from "../components/ApplicationChat";
import { StatusTimeline } from "../components/StatusTimeline";
import { useToast } from "../context/ToastContext";
import { supabase, Application } from "../lib/supabase";
import type { ApplicationDraft } from "../types";
import { StatusBadge } from "../components/ui/StatusBadge";
import { formatCurrency, getCurrencyForUser } from "../lib/currency";
import { DocumentPreview, CertificatePDFDocument } from "../components/DocumentRenderer";
import { generateQRDataUrl } from "@/lib/qr";
import { ReceiptPDF } from "../components/ReceiptPDF";
import { cn } from "@/lib/utils";

interface ApplicationsProps {
  applications: Application[];
  drafts?: ApplicationDraft[];
  onPay: (app: Application) => void;
  onRefresh?: () => void;
  onResumeDraft?: (draft: ApplicationDraft) => void;
}

// ── Status config ─────────────────────────────────────────────────────────────
const STATUS_CONFIG: Record<string, {
  color: string; bg: string; border: string; icon: React.ReactNode; step: number;
}> = {
  submitted:       { color: "text-blue-700",   bg: "bg-blue-50",   border: "border-blue-300",   icon: <FileText size={14} />,    step: 1 },
  pending_review:  { color: "text-violet-700",  bg: "bg-violet-50", border: "border-violet-300", icon: <Clock size={14} />,       step: 2 },
  pending_payment: { color: "text-amber-700",   bg: "bg-amber-50",  border: "border-amber-300",  icon: <CreditCard size={14} />,  step: 3 },
  approved:        { color: "text-amber-700",   bg: "bg-amber-50",  border: "border-amber-300",  icon: <CreditCard size={14} />,  step: 3 },
  paid:            { color: "text-teal-700",    bg: "bg-teal-50",   border: "border-teal-300",   icon: <CheckCircle2 size={14} />, step: 4 },
  verified:        { color: "text-emerald-700", bg: "bg-emerald-50",border: "border-emerald-300",icon: <CheckCircle2 size={14} />, step: 4 },
  issued:          { color: "text-emerald-700", bg: "bg-emerald-50",border: "border-emerald-300",icon: <FileCheck size={14} />,   step: 5 },
  rejected:        { color: "text-red-700",     bg: "bg-red-50",    border: "border-red-300",    icon: <X size={14} />,           step: 0 },
  refunded:        { color: "text-stone-600",   bg: "bg-stone-50",  border: "border-stone-300",  icon: <RotateCcw size={14} />,   step: 0 },
  returned:        { color: "text-orange-700",  bg: "bg-orange-50", border: "border-orange-300", icon: <AlertCircle size={14} />, step: 2 },
};

const getStatus = (s: string) => STATUS_CONFIG[s] ?? STATUS_CONFIG.submitted;

// ── Progress strip ────────────────────────────────────────────────────────────
const ProgressStrip: React.FC<{ status: string; lang: string }> = ({ status, lang }) => {
  const sw = lang === "sw";
  const steps = [
    { key: "submitted",       sw: "Imetumwa",    en: "Submitted" },
    { key: "review",          sw: "Kukaguliwa",  en: "Review" },
    { key: "pending_payment", sw: "Malipo",       en: "Payment" },
    { key: "issued",          sw: "Imetolewa",   en: "Issued" },
  ];
  const current = getStatus(status).step;
  if (current === 0) return null; // rejected/refunded — no strip
  return (
    <div className="flex items-center gap-0 w-full">
      {steps.map((step, i) => {
        const done = current > i;
        const active = current === i + 1;
        return (
          <React.Fragment key={step.key}>
            <div className="flex flex-col items-center gap-0.5 shrink-0">
              <div className={cn(
                "w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-black transition-all",
                done ? "bg-emerald-500 text-white" : active ? "bg-emerald-600 text-white ring-2 ring-emerald-200" : "bg-stone-200 text-stone-400",
              )}>
                {done ? "✓" : i + 1}
              </div>
              <span className={cn("text-[9px] font-medium whitespace-nowrap", done || active ? "text-emerald-700" : "text-stone-400")}>
                {sw ? step.sw : step.en}
              </span>
            </div>
            {i < steps.length - 1 && (
              <div className={cn("h-0.5 flex-1 mx-1 mb-3 rounded transition-all", done ? "bg-emerald-400" : "bg-stone-200")} />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
};

export function Applications({
  applications, drafts = [], onPay, onRefresh, onResumeDraft,
}: ApplicationsProps) {
  const PDFDownloadLinkCompat = PDFDownloadLink as unknown as React.ComponentType<{
    document: React.ReactElement; fileName: string; className?: string;
    children: (props: { loading: boolean; error: Error | null }) => React.ReactNode;
  }>;

  const { lang } = useLanguage();
  const { showToast } = useToast();
  const { user } = useAuth();
  const displayCurrency = getCurrencyForUser(user?.is_diaspora, user?.country_of_residence);
  const sw = lang === "sw";
  const L = (s: string, e: string) => (sw ? s : e);

  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [selected, setSelected] = useState<Application | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showDrafts, setShowDrafts] = useState(false);
  const [processingId, setProcessingId] = useState<string | null>(null);

  // ── Payment amount ────────────────────────────────────────────────────────
  const getPaymentAmount = useCallback((app: Application): number => {
    const fee = app.services?.fee || 0;
    const formFee = app.form_data?.service_fee;
    const extraFee = app.services?.extra_address_fee || 0;
    let base = fee > 0 ? fee : typeof formFee === "number" ? formFee : typeof formFee === "string" ? (parseFloat(formFee) || 0) : 0;
    const numExtra = parseInt(String((app.form_data as Record<string, unknown>)?.num_extra_addresses ?? "0")) || 0;
    if (extraFee > 0 && numExtra > 0) base += numExtra * extraFee;
    return base;
  }, []);

  const isPaid = useCallback((app: Application): boolean => {
    return !!(
      app.paid_at ||
      (app.form_data as Record<string, unknown>)?.payment_data ||
      (app.payment_data as Record<string, unknown>)?.transaction_id ||
      getPaymentAmount(app) === 0
    );
  }, [getPaymentAmount]);

  // ── Auto-update approved → pending_payment ────────────────────────────────
  useEffect(() => {
    applications
      .filter((a) => a.status === "approved")
      .forEach(async (app) => {
        try {
          await supabase.from("applications").update({ status: "pending_payment" }).eq("id", app.id).eq("status", "approved");
          onRefresh?.();
        } catch {}
      });
  }, [applications, onRefresh]);

  // ── Refresh ───────────────────────────────────────────────────────────────
  const handleRefresh = async () => {
    if (!onRefresh) return;
    setIsRefreshing(true);
    await onRefresh();
    setTimeout(() => setIsRefreshing(false), 500);
  };

  // ── Agreement accept ──────────────────────────────────────────────────────
  const handleAccept = async (app: Application) => {
    if (!user) return;
    setProcessingId(app.id);
    try {
      const fd = (app.form_data || {}) as Record<string, unknown>;
      const isBuyer = app.service_name?.includes("Mauzo") && String(fd.buyer_nida || "") === user.nida_number;
      const isTenant = app.service_name?.includes("Pango") && String(fd.tenant_nida || "") === user.nida_number;
      const patch: Record<string, unknown> = {};
      if (isBuyer) patch.buyer_accepted = true;
      if (isTenant) patch.tenant_accepted = true;
      if (!Object.keys(patch).length) { showToast(L("Si mwanachama wa mkataba huu", "Not a party to this agreement"), "error"); return; }
      await supabase.from("applications").update(patch).eq("id", app.id);
      showToast(L("Umekubali mkataba", "Agreement accepted"), "success");
      onRefresh?.();
    } catch { showToast(L("Imeshindwa", "Failed"), "error"); }
    finally { setProcessingId(null); }
  };

  // ── Filter + sort ─────────────────────────────────────────────────────────
  const displayApps = useMemo(() => {
    return applications
      .map((a) => a.status === "approved" ? { ...a, status: "pending_payment" as const } : a)
      .filter((a) => {
        const name = (sw ? a.service_name : (a.services?.name_en || a.service_name)) ?? "";
        const matchSearch = name.toLowerCase().includes(search.toLowerCase()) ||
          a.application_number.toLowerCase().includes(search.toLowerCase());
        const matchFilter = filter === "all" || a.status === filter;
        return matchSearch && matchFilter;
      })
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }, [applications, search, filter, sw]);

  // ── PDF helpers ───────────────────────────────────────────────────────────
  const CertDownload = ({ app }: { app: Application }) => {
    const [qrUrl, setQrUrl] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const gen = async () => {
      if (qrUrl) return;
      setLoading(true);
      try { setQrUrl(await generateQRDataUrl(app, "DOC")); }
      finally { setLoading(false); }
    };
    if (!qrUrl) return (
      <button onClick={gen} disabled={loading}
        className="flex items-center gap-1.5 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-sm transition-all disabled:opacity-50">
        {loading ? <RefreshCw size={14} className="animate-spin" /> : <Download size={14} />}
        {L("Pakua Hati", "Download Document")}
      </button>
    );
    return (
      <PDFDownloadLinkCompat document={<CertificatePDFDocument application={app} lang={lang} qrDataUrl={qrUrl} />} fileName={`Hati_${app.application_number}.pdf`}>
        {({ loading: l, error: e }) => e ? (
          <span className="text-red-500 text-xs">PDF Error</span>
        ) : (
          <button className="flex items-center gap-1.5 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-sm transition-all">
            {l ? <RefreshCw size={14} className="animate-spin" /> : <Download size={14} />}
            {l ? L("Inaandaa...", "Preparing...") : L("Pakua Hati", "Download Document")}
          </button>
        )}
      </PDFDownloadLinkCompat>
    );
  };

  const ReceiptDownload = ({ app }: { app: Application }) => (
    <PDFDownloadLinkCompat document={<ReceiptPDF application={app} lang={lang} />} fileName={`Risiti_${app.application_number}.pdf`}>
      {({ loading: l }) => (
        <button className="flex items-center gap-1.5 px-3 py-2.5 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-xl font-bold text-sm transition-all">
          <Receipt size={14} />
          {l ? "..." : L("Risiti", "Receipt")}
        </button>
      )}
    </PDFDownloadLinkCompat>
  );

  const ShareBtn = ({ app }: { app: Application }) => {
    const [sharing, setSharing] = useState(false);
    const share = async (e: React.MouseEvent) => {
      e.stopPropagation();
      setSharing(true);
      try {
        const shareData = { title: app.service_name, text: app.application_number, url: window.location.href };
        if (navigator.share && navigator.canShare?.(shareData)) await navigator.share(shareData);
        else { await navigator.clipboard.writeText(shareData.url); showToast(L("Kiungo kimekopwa!", "Link copied!"), "success"); }
      } catch {} finally { setSharing(false); }
    };
    return (
      <button onClick={share} disabled={sharing}
        className="flex items-center gap-1.5 px-3 py-2.5 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-xl font-bold text-sm transition-all">
        <Share2 size={14} />
        {L("Shiriki", "Share")}
      </button>
    );
  };

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-5">

      {/* ── Header ── */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-xl font-black text-stone-900">{L("Maombi Yangu", "My Applications")}</h1>
          <p className="text-xs text-stone-500 mt-0.5">
            {applications.length} {L("maombi", "applications")}
            {drafts.length > 0 && ` · ${drafts.length} ${L("hayakukamilika", "unfinished")}`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {drafts.length > 0 && (
            <div className="flex bg-stone-100 rounded-xl p-1 gap-1">
              <button onClick={() => setShowDrafts(false)}
                className={cn("px-3 h-8 rounded-lg text-xs font-bold transition-all", !showDrafts ? "bg-white text-stone-900 shadow-sm" : "text-stone-500 hover:text-stone-700")}>
                {L("Maombi", "Applications")}
              </button>
              <button onClick={() => setShowDrafts(true)}
                className={cn("px-3 h-8 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5", showDrafts ? "bg-white text-amber-700 shadow-sm" : "text-stone-500 hover:text-stone-700")}>
                <AlertCircle size={12} />
                {L("Hayakukamilika", "Unfinished")} ({drafts.length})
              </button>
            </div>
          )}
          <button onClick={handleRefresh} disabled={isRefreshing}
            className="w-9 h-9 bg-white border border-stone-200 rounded-xl flex items-center justify-center text-stone-500 hover:bg-stone-50 transition-all disabled:opacity-50">
            <RefreshCw size={15} className={isRefreshing ? "animate-spin" : ""} />
          </button>
        </div>
      </div>

      {/* ── Search + Filter ── */}
      <div className="flex gap-2 flex-wrap">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" size={15} />
          <input type="text" value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder={L("Tafuta maombi...", "Search applications...")}
            className="w-full h-10 pl-9 pr-3 bg-white border border-stone-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-emerald-500" />
        </div>
        <div className="relative">
          <Filter className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" size={14} />
          <select value={filter} onChange={(e) => setFilter(e.target.value)}
            className="h-10 pl-8 pr-8 bg-white border border-stone-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-emerald-500 appearance-none">
            <option value="all">{L("Hali Zote", "All Statuses")}</option>
            <option value="submitted">{L("Imetumwa", "Submitted")}</option>
            <option value="pending_payment">{L("Inasubiri Malipo", "Pending Payment")}</option>
            <option value="paid">{L("Imelipiwa", "Paid")}</option>
            <option value="issued">{L("Imetolewa", "Issued")}</option>
            <option value="rejected">{L("Imekataliwa", "Rejected")}</option>
          </select>
        </div>
      </div>

      {/* ── Drafts ── */}
      {showDrafts && (
        <div className="space-y-3">
          {drafts.map((d) => (
            <div key={d.id} className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-center gap-4">
              <div className="w-10 h-10 bg-amber-100 rounded-xl flex items-center justify-center shrink-0">
                <FileText size={18} className="text-amber-600" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-bold text-stone-800 text-sm truncate">{d.service_name}</p>
                <p className="text-xs text-stone-500">{L("Hajakamilika", "Not completed")} · {new Date(d.updated_at || d.created_at).toLocaleDateString()}</p>
              </div>
              <button onClick={() => onResumeDraft?.(d)}
                className="shrink-0 flex items-center gap-1.5 px-3 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-xs font-bold transition-all">
                <ExternalLink size={12} /> {L("Endelea", "Continue")}
              </button>
            </div>
          ))}
        </div>
      )}

      {/* ── Application Cards ── */}
      {!showDrafts && (
        <>
          {displayApps.length === 0 ? (
            <div className="bg-white border border-stone-200 rounded-2xl p-12 text-center space-y-3">
              <div className="w-14 h-14 bg-stone-100 rounded-2xl flex items-center justify-center mx-auto">
                <FileText size={24} className="text-stone-400" />
              </div>
              <p className="font-bold text-stone-600">{L("Hakuna maombi yaliyopatikana", "No applications found")}</p>
              <p className="text-sm text-stone-400">{L("Jaribu kutumia maombi ya huduma", "Try applying for a service")}</p>
            </div>
          ) : (
            <div className="space-y-3">
              {displayApps.map((app, idx) => {
                const cfg = getStatus(app.status);
                const fee = getPaymentAmount(app);
                const paid = isPaid(app);
                const serviceName = sw ? (app.service_name || app.services?.name || "—") : (app.services?.name_en || app.service_name || app.services?.name || "—");
                const isRejected = app.status === "rejected";
                const isIssued = app.status === "issued";
                const needsPayment = (app.status === "pending_payment" || app.status === "paid") && fee > 0 && !paid;

                return (
                  <motion.div
                    key={app.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.04 }}
                    className={cn(
                      "bg-white rounded-2xl border overflow-hidden shadow-sm transition-all hover:shadow-md cursor-pointer",
                      selected?.id === app.id ? "border-emerald-400 ring-2 ring-emerald-100" : "border-stone-200",
                    )}
                    onClick={() => setSelected(selected?.id === app.id ? null : app)}
                  >
                    {/* Status colour strip */}
                    <div className={cn("h-1", cfg.bg.replace("bg-", "bg-").replace("50", "400"))}
                      style={{ background: isIssued ? "#10b981" : isRejected ? "#ef4444" : needsPayment ? "#f59e0b" : undefined }} />

                    <div className="p-4">
                      {/* Top row */}
                      <div className="flex items-start gap-3">
                        {/* Service icon */}
                        <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center shrink-0 text-base", cfg.bg)}>
                          {isIssued ? "📄" : isRejected ? "❌" : needsPayment ? "💳" : "📋"}
                        </div>

                        {/* Main info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2 flex-wrap">
                            <div>
                              <p className="font-black text-stone-900 text-sm leading-tight">{serviceName}</p>
                              <p className="text-[10px] text-stone-400 font-mono mt-0.5">{app.application_number}</p>
                            </div>
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className={cn("inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border", cfg.bg, cfg.color, cfg.border)}>
                                {cfg.icon}
                                <StatusBadge status={app.status} lang={lang} />
                              </span>
                            </div>
                          </div>

                          {/* Progress strip */}
                          <div className="mt-3">
                            <ProgressStrip status={app.status} lang={lang} />
                          </div>
                        </div>

                        {/* Chevron */}
                        <ChevronRight size={16} className={cn("text-stone-400 shrink-0 transition-transform mt-1", selected?.id === app.id && "rotate-90")} />
                      </div>

                      {/* Bottom metadata row */}
                      <div className="mt-3 pt-3 border-t border-stone-100 flex items-center justify-between gap-2 flex-wrap">
                        <div className="flex items-center gap-3">
                          <span className="text-[11px] text-stone-400 flex items-center gap-1">
                            <Clock size={10} />
                            {new Date(app.created_at).toLocaleDateString(sw ? "sw-TZ" : "en-TZ", { day: "numeric", month: "short", year: "numeric" })}
                          </span>
                          {fee > 0 && (
                            <span className={cn("text-[11px] font-bold flex items-center gap-1", paid ? "text-emerald-600" : "text-amber-600")}>
                              {paid ? <CheckCircle2 size={10} /> : <CreditCard size={10} />}
                              {paid ? L("Imelipwa", "Paid") : formatCurrency(fee, displayCurrency)}
                            </span>
                          )}
                        </div>

                        {/* Quick action */}
                        {needsPayment && (
                          <button onClick={(e) => { e.stopPropagation(); onPay(app); }}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-white rounded-lg text-xs font-bold transition-all">
                            <CreditCard size={11} /> {L("Lipia", "Pay")} {fee > 0 && formatCurrency(fee, displayCurrency)}
                          </button>
                        )}
                        {isIssued && paid && (
                          <span className="text-[11px] font-bold text-emerald-600 flex items-center gap-1">
                            <Zap size={10} /> {L("Tayari Kupakua", "Ready to Download")}
                          </span>
                        )}
                        {isIssued && !paid && (
                          <button onClick={(e) => { e.stopPropagation(); onPay(app); }}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-white rounded-lg text-xs font-bold transition-all">
                            <Lock size={11} /> {L("Lipia Kufungua", "Pay to Unlock")}
                          </button>
                        )}
                      </div>
                    </div>

                    {/* ── Expanded detail drawer ── */}
                    <AnimatePresence>
                      {selected?.id === app.id && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.25 }}
                          className="overflow-hidden border-t border-stone-100"
                        >
                          <div className="px-4 pb-4 pt-3 space-y-4">

                            {/* ── Status timeline ── */}
                            <div className="bg-stone-50 rounded-xl p-3">
                              <p className="text-[10px] font-black text-stone-400 uppercase tracking-widest mb-2">
                                {L("Maendeleo ya Maombi", "Application Progress")}
                              </p>
                              <StatusTimeline status={app.status} lang={lang} />
                            </div>

                            {/* ── Staff feedback ── */}
                            {app.feedback && (
                              <div className={cn("rounded-xl p-3 border", isRejected ? "bg-red-50 border-red-200" : "bg-amber-50 border-amber-200")}>
                                <p className="text-[10px] font-black uppercase tracking-widest mb-1 text-stone-500">
                                  {L("Maoni ya Afisa", "Officer Feedback")}
                                </p>
                                <p className={cn("text-sm leading-relaxed", isRejected ? "text-red-700" : "text-amber-800")}>
                                  {app.feedback}
                                </p>
                              </div>
                            )}

                            {/* ── Payment section ── */}
                            {fee > 0 && !paid && (
                              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3">
                                <div className="w-9 h-9 bg-amber-100 rounded-xl flex items-center justify-center shrink-0">
                                  <Lock size={16} className="text-amber-600" />
                                </div>
                                <div className="flex-1">
                                  <p className="font-black text-amber-900 text-sm">
                                    {L("Hati Imefungwa — Malipo Yanahitajika", "Document Locked — Payment Required")}
                                  </p>
                                  <p className="text-xs text-amber-700 mt-0.5">
                                    {L("Lipa ili kufungua na kupakua hati rasmi yako.", "Pay to unlock and download your official document.")}
                                  </p>
                                  <p className="text-lg font-black text-amber-800 mt-2">
                                    {formatCurrency(fee, displayCurrency)}
                                  </p>
                                </div>
                                <button onClick={() => { onPay(app); setSelected(null); }}
                                  className="shrink-0 flex items-center gap-1.5 px-4 py-2.5 bg-amber-500 hover:bg-amber-600 text-white rounded-xl font-bold text-sm transition-all shadow-lg shadow-amber-100">
                                  <CreditCard size={14} /> {L("Lipia Sasa", "Pay Now")}
                                </button>
                              </div>
                            )}

                            {/* ── Document downloads (issued + paid) ── */}
                            {isIssued && paid && (
                              <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 space-y-3">
                                <div className="flex items-center gap-2">
                                  <div className="w-8 h-8 bg-emerald-100 rounded-lg flex items-center justify-center">
                                    <FileCheck size={15} className="text-emerald-600" />
                                  </div>
                                  <div>
                                    <p className="font-black text-emerald-900 text-sm">{L("Hati Rasmi Yako Iko Tayari", "Your Official Document is Ready")}</p>
                                    <p className="text-[11px] text-emerald-700">{app.application_number}</p>
                                  </div>
                                </div>
                                <div className="flex gap-2 flex-wrap">
                                  <CertDownload app={app} />
                                  <ReceiptDownload app={app} />
                                  <ShareBtn app={app} />
                                </div>
                              </div>
                            )}

                            {/* ── Agreement acceptance ── */}
                            {(app.service_name?.includes("Mauzo") || app.service_name?.includes("Pango")) &&
                              app.status !== "rejected" && app.status !== "refunded" && (
                              <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 flex items-center justify-between gap-3">
                                <p className="text-xs text-blue-700 font-medium flex-1">
                                  {app.agreement_status === "buyer_accepted"
                                    ? L("✅ Mkataba umekubaliwa", "✅ Agreement accepted")
                                    : L("Mkataba unasubiri kukubaliwa pande zote mbili", "Agreement pending both parties")}
                                </p>
                                {app.agreement_status === "pending" && (
                                  <button onClick={() => handleAccept(app)} disabled={processingId === app.id}
                                    className="shrink-0 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all disabled:opacity-50">
                                    {processingId === app.id ? <RefreshCw size={11} className="animate-spin" /> : <CheckCircle2 size={11} />}
                                    {L("Kubali", "Accept")}
                                  </button>
                                )}
                              </div>
                            )}

                            {/* ── Chat thread ── */}
                            <div>
                              <p className="text-[10px] font-black text-stone-400 uppercase tracking-widest mb-2 flex items-center gap-1.5">
                                <MessageSquare size={10} /> {L("Mawasiliano na Afisa", "Communication with Officer")}
                              </p>
                              <ApplicationChat
                                applicationId={app.id}
                                applicationNumber={app.application_number}
                                applicantId={app.user_id || user?.id || ""}
                                lang={lang}
                              />
                            </div>

                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.div>
                );
              })}
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default Applications;
