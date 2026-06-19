/**
 * Applications.tsx — Citizen application tracker (V3 clean)
 *
 * Simple card list → click to open full detail sheet
 * Downloads use DocumentRenderer/DocumentPreview directly (already works)
 * Photos shown from form_data.uploaded_documents (base64)
 */
import React, { useState, useMemo, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search,
  Filter,
  RefreshCw,
  X,
  FileText,
  Clock,
  CreditCard,
  CheckCircle2,
  AlertCircle,
  Share2,
  Download,
  Lock,
  ChevronRight,
  MessageSquare,
  Image,
  ExternalLink,
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
import { DocumentRenderer, DocumentPreview } from "../components/DocumentRenderer";
import { cn } from "@/lib/utils";

import { PDFDownloadLink } from "@react-pdf/renderer";
import { RisitiMalipoPDF } from "@/components/documents/RisitiMalipoPDF";

interface ApplicationsProps {
  applications: Application[];
  drafts?: ApplicationDraft[];
  onPay: (app: Application) => void;
  onRefresh?: () => void;
  onResumeDraft?: (draft: ApplicationDraft) => void;
}

// ── Status stripe colours ──────────────────────────────────────────────────────
const stripe: Record<string, string> = {
  submitted: "bg-blue-500",
  pending_review: "bg-violet-500",
  pending_payment: "bg-amber-400",
  approved: "bg-amber-400",
  paid: "bg-teal-500",
  verified: "bg-teal-500",
  issued: "bg-emerald-500",
  rejected: "bg-red-500",
  refunded: "bg-stone-400",
  returned: "bg-orange-400",
};

export function Applications({
  applications,
  drafts = [],
  onPay,
  onRefresh,
  onResumeDraft,
}: ApplicationsProps) {
  const PDFLink = PDFDownloadLink as unknown as React.ComponentType<{
    document: React.ReactElement;
    fileName: string;
    children: (p: { loading: boolean; error: Error | null }) => React.ReactNode;
  }>;

  const { lang } = useLanguage();
  const { showToast } = useToast();
  const { user } = useAuth();
  const currency = getCurrencyForUser(user?.is_diaspora, user?.country_of_residence);
  const sw = lang === "sw";
  const L = (s: string, e: string) => (sw ? s : e);

  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [selected, setSelected] = useState<Application | null>(null);
  const [showDocModal, setShowDocModal] = useState(false);
  const [lightboxImg, setLightboxImg] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [showDrafts, setShowDrafts] = useState(false);
  const [processingId, setProcessingId] = useState<string | null>(null);

  // ── Helpers ──────────────────────────────────────────────────────────────
  const getFee = useCallback((app: Application) => {
    const f = app.services?.fee || 0;
    const ff = app.form_data?.service_fee;
    let base =
      f > 0 ? f : typeof ff === "number" ? ff : typeof ff === "string" ? parseFloat(ff) || 0 : 0;
    const extra = app.services?.extra_address_fee || 0;
    const n =
      parseInt(String((app.form_data as Record<string, unknown>)?.num_extra_addresses ?? "0")) || 0;
    if (extra > 0 && n > 0) base += n * extra;
    return base;
  }, []);

  const hasPaid = useCallback(
    (app: Application) =>
      !!(
        app.paid_at ||
        (app.form_data as Record<string, unknown>)?.payment_data ||
        (app.payment_data as Record<string, unknown>)?.transaction_id ||
        getFee(app) === 0
      ),
    [getFee],
  );

  const getPhotos = (app: Application) => {
    const docs = (app.form_data as Record<string, unknown>)?.uploaded_documents as
      | {
          type: string;
          name: string;
          dataUrl: string;
        }[]
      | undefined;
    return docs?.filter((d) => d.dataUrl?.startsWith("data:image")) ?? [];
  };

  // ── Auto approved → pending_payment ──────────────────────────────────────
  useEffect(() => {
    applications
      .filter((a) => a.status === "approved")
      .forEach(async (app) => {
        try {
          await supabase
            .from("applications")
            .update({ status: "pending_payment" })
            .eq("id", app.id)
            .eq("status", "approved");
          onRefresh?.();
        } catch {
          // caught and ignored — non-critical status update
        }
      });
  }, [applications, onRefresh]);

  // ── Refresh ───────────────────────────────────────────────────────────────
  const doRefresh = async () => {
    if (!onRefresh) return;
    setRefreshing(true);
    await onRefresh();
    setTimeout(() => setRefreshing(false), 600);
  };

  // ── Accept agreement ──────────────────────────────────────────────────────
  const acceptAgreement = async (app: Application) => {
    if (!user) return;
    setProcessingId(app.id);
    try {
      const fd = (app.form_data || {}) as Record<string, unknown>;
      const isBuyer =
        app.service_name?.includes("Mauzo") && String(fd.buyer_nida ?? "") === user.nida_number;
      const isTenant =
        app.service_name?.includes("Pango") && String(fd.tenant_nida ?? "") === user.nida_number;
      const patch: Record<string, unknown> = {};
      if (isBuyer) patch.buyer_accepted = true;
      if (isTenant) patch.tenant_accepted = true;
      if (!Object.keys(patch).length) {
        showToast(L("Si mwanachama wa mkataba huu", "Not party to this agreement"), "error");
        return;
      }
      await supabase.from("applications").update(patch).eq("id", app.id);
      showToast(L("Umekubali", "Accepted"), "success");
      onRefresh?.();
    } catch {
      showToast(L("Imeshindwa", "Failed"), "error");
    } finally {
      setProcessingId(null);
    }
  };

  // ── Filter + sort ─────────────────────────────────────────────────────────
  const list = useMemo(() => {
    return applications
      .map((a) => (a.status === "approved" ? { ...a, status: "pending_payment" as const } : a))
      .filter((a) => {
        const name = sw
          ? a.service_name || a.services?.name || ""
          : a.services?.name_en || a.service_name || a.services?.name || "";
        return (
          (name.toLowerCase().includes(search.toLowerCase()) ||
            a.application_number.toLowerCase().includes(search.toLowerCase())) &&
          (filter === "all" || a.status === filter)
        );
      })
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }, [applications, search, filter, sw]);

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-5">
      {/* Image lightbox */}
      <AnimatePresence>
        {lightboxImg && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] bg-black/90 flex items-center justify-center p-4"
            onClick={() => setLightboxImg(null)}
          >
            <button className="absolute top-4 right-4 text-white/70 hover:text-white">
              <X size={28} />
            </button>
            <img
              src={lightboxImg}
              className="max-w-full max-h-[90vh] rounded-xl object-contain"
              alt="Document"
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Document download modal */}
      {showDocModal && selected && (
        <DocumentPreview
          application={selected}
          lang={lang}
          onClose={() => setShowDocModal(false)}
        />
      )}

      {/* Header */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-xl font-black text-stone-900">
            {L("Maombi Yangu", "My Applications")}
          </h1>
          <p className="text-xs text-stone-400 mt-0.5">
            {list.length} {L("maombi", "total")}
            {drafts.length > 0 && ` · ${drafts.length} ${L("hayakukamilika", "drafts")}`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {drafts.length > 0 && (
            <div className="flex bg-stone-100 rounded-xl p-1 gap-1">
              <button
                onClick={() => setShowDrafts(false)}
                className={cn(
                  "px-3 h-8 rounded-lg text-xs font-bold transition-all",
                  !showDrafts ? "bg-white text-stone-900 shadow-sm" : "text-stone-500",
                )}
              >
                {L("Maombi", "Applications")}
              </button>
              <button
                onClick={() => setShowDrafts(true)}
                className={cn(
                  "px-3 h-8 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5",
                  showDrafts ? "bg-white text-amber-700 shadow-sm" : "text-stone-500",
                )}
              >
                <AlertCircle size={12} /> {L("Hayakukamilika", "Drafts")} ({drafts.length})
              </button>
            </div>
          )}
          <button
            onClick={doRefresh}
            disabled={refreshing}
            className="w-9 h-9 border border-stone-200 bg-white rounded-xl flex items-center justify-center text-stone-500 hover:bg-stone-50 transition-all"
          >
            <RefreshCw size={15} className={refreshing ? "animate-spin" : ""} />
          </button>
        </div>
      </div>

      {/* Search + Filter */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={L("Tafuta...", "Search...")}
            className="w-full h-10 pl-9 pr-3 bg-white border border-stone-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>
        <div className="relative">
          <Filter size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="h-10 pl-8 pr-6 bg-white border border-stone-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-emerald-500 appearance-none"
          >
            <option value="all">{L("Zote", "All")}</option>
            <option value="submitted">{L("Imetumwa", "Submitted")}</option>
            <option value="pending_payment">{L("Inasubiri Malipo", "Pending Payment")}</option>
            <option value="paid">{L("Imelipiwa", "Paid")}</option>
            <option value="issued">{L("Imetolewa", "Issued")}</option>
            <option value="rejected">{L("Imekataliwa", "Rejected")}</option>
          </select>
        </div>
      </div>

      {/* Drafts */}
      {showDrafts && (
        <div className="space-y-3">
          {drafts.map((d) => (
            <div
              key={d.id}
              className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-center gap-3"
            >
              <div className="w-10 h-10 bg-amber-100 rounded-xl flex items-center justify-center shrink-0">
                <FileText size={16} className="text-amber-600" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-bold text-stone-800 text-sm truncate">{d.service_name}</p>
                <p className="text-xs text-stone-500">
                  {new Date(d.updated_at || d.created_at).toLocaleDateString()}
                </p>
              </div>
              <button
                onClick={() => onResumeDraft?.(d)}
                className="flex items-center gap-1.5 px-3 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-xs font-bold transition-all"
              >
                <ExternalLink size={12} /> {L("Endelea", "Continue")}
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Application cards */}
      {!showDrafts && (
        <div className="space-y-3">
          {list.length === 0 && (
            <div className="bg-white border border-stone-200 rounded-2xl p-12 text-center">
              <FileText size={40} className="text-stone-300 mx-auto mb-3" />
              <p className="font-bold text-stone-500">
                {L("Hakuna maombi", "No applications found")}
              </p>
            </div>
          )}

          {list.map((app, i) => {
            const name = sw
              ? app.service_name || app.services?.name || "—"
              : app.services?.name_en || app.service_name || app.services?.name || "—";
            const fee = getFee(app);
            const paid = hasPaid(app);
            const isOpen = selected?.id === app.id;
            const photos = getPhotos(app);

            return (
              <motion.div
                key={app.id}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.03 }}
                className={cn(
                  "bg-white rounded-2xl border overflow-hidden shadow-sm transition-all",
                  isOpen
                    ? "border-emerald-400 ring-2 ring-emerald-100"
                    : "border-stone-200 hover:border-stone-300",
                )}
              >
                {/* Colour stripe */}
                <div className={cn("h-1", stripe[app.status] || "bg-stone-300")} />

                {/* Card header — always visible */}
                <button
                  className="w-full text-left p-4"
                  onClick={() => setSelected(isOpen ? null : app)}
                >
                  <div className="flex items-center gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <p className="font-black text-stone-900 text-sm leading-tight truncate">
                          {name}
                        </p>
                        <StatusBadge status={app.status} lang={lang} />
                      </div>
                      <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                        <span className="text-[11px] text-stone-400 font-mono">
                          {app.application_number}
                        </span>
                        <span className="text-[11px] text-stone-400 flex items-center gap-1">
                          <Clock size={9} />
                          {new Date(app.created_at).toLocaleDateString(sw ? "sw-TZ" : "en-TZ", {
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                          })}
                        </span>
                        {fee > 0 && (
                          <span
                            className={cn(
                              "text-[11px] font-bold flex items-center gap-1",
                              paid ? "text-emerald-600" : "text-amber-600",
                            )}
                          >
                            {paid ? <CheckCircle2 size={9} /> : <CreditCard size={9} />}
                            {paid ? L("Imelipwa", "Paid") : formatCurrency(fee, currency)}
                          </span>
                        )}
                      </div>
                    </div>
                    <ChevronRight
                      size={16}
                      className={cn(
                        "text-stone-400 shrink-0 transition-transform duration-200",
                        isOpen && "rotate-90",
                      )}
                    />
                  </div>
                </button>

                {/* ── Detail drawer ── */}
                <AnimatePresence>
                  {isOpen && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="overflow-hidden border-t border-stone-100"
                    >
                      <div className="p-4 space-y-4">
                        {/* Progress */}
                        <StatusTimeline status={app.status} lang={lang} />

                        {/* Staff feedback */}
                        {app.feedback && (
                          <div
                            className={cn(
                              "rounded-xl p-3 border text-sm",
                              app.status === "rejected"
                                ? "bg-red-50 border-red-200 text-red-800"
                                : "bg-amber-50 border-amber-200 text-amber-800",
                            )}
                          >
                            <p className="text-[10px] font-black uppercase tracking-widest mb-1 text-stone-500">
                              {L("Maoni ya Afisa", "Officer Feedback")}
                            </p>
                            {app.feedback}
                          </div>
                        )}

                        {/* ── PAYMENT GATE ── */}
                        {fee > 0 &&
                          !paid &&
                          app.status !== "rejected" &&
                          app.status !== "refunded" && (
                            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-center gap-4">
                              <div className="w-10 h-10 bg-amber-100 rounded-xl flex items-center justify-center shrink-0">
                                <Lock size={18} className="text-amber-600" />
                              </div>
                              <div className="flex-1">
                                <p className="font-black text-amber-900 text-sm">
                                  {L("Hati Imefungwa", "Document Locked")}
                                </p>
                                <p className="text-xs text-amber-700 mt-0.5">
                                  {L(
                                    "Lipa ili kufungua hati rasmi yako",
                                    "Pay to unlock your official document",
                                  )}
                                </p>
                                <p className="text-lg font-black text-amber-800 mt-1">
                                  {formatCurrency(fee, currency)}
                                </p>
                              </div>
                              <button
                                onClick={() => {
                                  onPay(app);
                                  setSelected(null);
                                }}
                                className="flex items-center gap-1.5 px-4 py-2.5 bg-amber-500 hover:bg-amber-600 text-white rounded-xl font-bold text-sm transition-all shadow-md shrink-0"
                              >
                                <CreditCard size={14} /> {L("Lipia Sasa", "Pay Now")}
                              </button>
                            </div>
                          )}

                        {/* ── DOCUMENT DOWNLOADS (issued + paid) ── */}
                        {app.status === "issued" && paid && (
                          <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 space-y-3">
                            <p className="text-xs font-black text-emerald-700 uppercase tracking-widest">
                              {L("Hati Rasmi Yako", "Your Official Document")}
                            </p>
                            <div className="flex gap-2 flex-wrap">
                              {/* Main doc — uses existing DocumentRenderer which WORKS */}
                              <DocumentRenderer application={app} lang={lang} />

                              {/* Receipt */}
                              <PDFLink
                                document={<RisitiMalipoPDF application={app} lang={lang} />}
                                fileName={`Risiti_${app.application_number}.pdf`}
                              >
                                {({ loading }) => (
                                  <button
                                    disabled={loading}
                                    className="flex items-center gap-1.5 px-3 py-2 bg-white border border-stone-200 hover:bg-stone-50 text-stone-700 rounded-xl font-bold text-sm transition-all disabled:opacity-50"
                                  >
                                    {loading ? (
                                      <RefreshCw size={13} className="animate-spin" />
                                    ) : (
                                      <Download size={13} />
                                    )}
                                    {L("Risiti", "Receipt")}
                                  </button>
                                )}
                              </PDFLink>

                              {/* Share */}
                              <button
                                onClick={async () => {
                                  try {
                                    if (navigator.share)
                                      await navigator.share({
                                        title: name,
                                        url: window.location.href,
                                      });
                                    else {
                                      await navigator.clipboard.writeText(window.location.href);
                                      showToast(L("Kiungo kimekopwa!", "Link copied!"), "success");
                                    }
                                  } catch {
                                    // caught and ignored — non-critical clipboard write
                                  }
                                }}
                                className="flex items-center gap-1.5 px-3 py-2 bg-white border border-stone-200 hover:bg-stone-50 text-stone-700 rounded-xl font-bold text-sm transition-all"
                              >
                                <Share2 size={13} /> {L("Shiriki", "Share")}
                              </button>
                            </div>
                          </div>
                        )}

                        {/* ── UPLOADED PHOTOS / DOCUMENTS ── */}
                        {photos.length > 0 && (
                          <div>
                            <p className="text-[10px] font-black text-stone-400 uppercase tracking-widest mb-2 flex items-center gap-1.5">
                              <Image size={10} /> {L("Picha Zilizopakiwa", "Uploaded Photos")}
                            </p>
                            <div className="flex gap-2 flex-wrap">
                              {photos.map((p, idx) => (
                                <button
                                  key={idx}
                                  onClick={() => setLightboxImg(p.dataUrl)}
                                  className="group relative w-20 h-20 rounded-xl overflow-hidden border border-stone-200 hover:border-emerald-400 transition-all shrink-0"
                                >
                                  <img
                                    src={p.dataUrl}
                                    alt={p.name}
                                    className="w-full h-full object-cover"
                                  />
                                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-all flex items-center justify-center">
                                    <Search
                                      size={14}
                                      className="text-white opacity-0 group-hover:opacity-100 transition-all"
                                    />
                                  </div>
                                  <p className="absolute bottom-0 left-0 right-0 text-[8px] text-white bg-black/50 px-1 py-0.5 text-center truncate">
                                    {p.type}
                                  </p>
                                </button>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* ── AGREEMENT ACCEPT ── */}
                        {(app.service_name?.includes("Mauzo") ||
                          app.service_name?.includes("Pango")) &&
                          !["rejected", "refunded"].includes(app.status) && (
                            <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 flex items-center justify-between gap-3">
                              <p className="text-xs text-blue-700 font-medium flex-1">
                                {app.agreement_status === "buyer_accepted"
                                  ? L("✅ Mkataba umekubaliwa", "✅ Agreement accepted")
                                  : L(
                                      "Mkataba unasubiri kukubaliwa",
                                      "Agreement awaiting acceptance",
                                    )}
                              </p>
                              {app.agreement_status === "pending" && (
                                <button
                                  onClick={() => acceptAgreement(app)}
                                  disabled={processingId === app.id}
                                  className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold transition-all disabled:opacity-50 shrink-0"
                                >
                                  {processingId === app.id ? (
                                    <RefreshCw size={11} className="animate-spin" />
                                  ) : (
                                    <CheckCircle2 size={11} />
                                  )}
                                  {L("Kubali", "Accept")}
                                </button>
                              )}
                            </div>
                          )}

                        {/* ── CHAT ── */}
                        <div>
                          <p className="text-[10px] font-black text-stone-400 uppercase tracking-widest mb-2 flex items-center gap-1.5">
                            <MessageSquare size={10} /> {L("Mawasiliano", "Messages")}
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
    </div>
  );
}

export default Applications;
