// src/pages/Applications.tsx - COMPLETELY FIXED
import React, { useState, useMemo, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { PDFDownloadLink } from "@react-pdf/renderer";
import {
  Search,
  Filter,
  ArrowUpDown,
  Calendar,
  CheckCircle,
  Loader2,
  X,
  Eye,
  FileText,
  Clock,
  CreditCard,
  RefreshCw,
  Receipt,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";
import { useLanguage } from "../context/LanguageContext";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import { supabase, Application } from "../lib/supabase";
import type { ApplicationDraft } from "../types";
import { StatusBadge } from "../components/ui/StatusBadge";
import { ApplicationProgressBar } from "../components/ui/ApplicationProgressBar";
import { formatCurrency, getCurrencyForUser } from "../lib/currency";
import { DocumentRenderer, DocumentPreview } from "../components/DocumentRenderer";
import { ReceiptPDF } from "../components/ReceiptPDF";

interface ApplicationsProps {
  applications: Application[];
  drafts?: ApplicationDraft[];
  onPay: (app: Application) => void;
  onRefresh?: () => void;
  onResumeDraft?: (draft: ApplicationDraft) => void;
}

export function Applications({
  applications,
  drafts = [],
  onPay,
  onRefresh,
  onResumeDraft,
}: ApplicationsProps) {
  const PDFDownloadLinkCompat = PDFDownloadLink as unknown as React.ComponentType<any>;
  const { lang } = useLanguage();
  const { showToast } = useToast();
  const { user } = useAuth();
  const displayCurrency = getCurrencyForUser(user?.is_diaspora, user?.country_of_residence);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [previewApp, setPreviewApp] = useState<Application | null>(null);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [selectedApp, setSelectedApp] = useState<Application | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showDraftsTab, setShowDraftsTab] = useState(false);

  const t = (key: string): string => {
    const translations: Record<string, Record<string, string>> = {
      myApplications: { en: "My Applications", sw: "Maombi Yangu" },
      services: { en: "Services", sw: "Huduma" },
      date: { en: "Date", sw: "Tarehe" },
      status: { en: "Status", sw: "Hali" },
      action: { en: "Action", sw: "Kitendo" },
      payNow: { en: "Pay Now", sw: "Lipia Sasa" },
      receipt: { en: "Receipt", sw: "Risiti" },
      download: { en: "Download", sw: "Pakua" },
      preview: { en: "Preview", sw: "Hakiki" },
      downloadDocument: { en: "Download Document", sw: "Pakua Hati" },
      close: { en: "Close", sw: "Funga" },
      acceptAgreement: { en: "Accept Agreement", sw: "Kubali Mkataba" },
      rejected: { en: "Rejected", sw: "Imekataliwa" },
      refunded: { en: "Refunded", sw: "Imerejeshwa" },
      inProgress: { en: "In Progress", sw: "Inashughulikiwa" },
    };
    return translations[key]?.[lang] || key;
  };

  const getPaymentAmount = (app: Application): number => {
    const serviceFee = (app as any).services?.fee || 0;
    const formServiceFee = app.form_data?.service_fee;
    const extraAddressFee = (app as any).services?.extra_address_fee || 0;

    let baseFee = 0;
    if (serviceFee > 0) {
      baseFee = serviceFee;
    } else if (formServiceFee && typeof formServiceFee === "number") {
      baseFee = formServiceFee;
    } else if (formServiceFee && typeof formServiceFee === "string") {
      const parsed = parseFloat(formServiceFee);
      if (!isNaN(parsed)) baseFee = parsed;
    }

    if (
      extraAddressFee > 0 &&
      Number((app.form_data as Record<string, unknown>)?.["num_extra_addresses"] ?? 0)
    ) {
      const numExtra =
        parseInt(
          String((app.form_data as Record<string, unknown>)["num_extra_addresses"] ?? "0"),
        ) || 0;
      baseFee += numExtra * extraAddressFee;
    }
    return baseFee;
  };

  useEffect(() => {
    const updateApprovedToPendingPayment = async () => {
      const approvedApps = applications.filter((app) => app.status === "approved");
      for (const app of approvedApps) {
        try {
          const { error } = await supabase
            .from("applications")
            .update({ status: "pending_payment" })
            .eq("id", app.id)
            .eq("status", "approved");
          if (error) throw error;
          if (onRefresh) await onRefresh();
        } catch (error) {
          console.error("Error updating approved application:", error);
        }
      }
    };
    updateApprovedToPendingPayment();
  }, [applications, onRefresh]);

  const handleRefresh = async () => {
    if (!onRefresh) return;
    setIsRefreshing(true);
    await onRefresh();
    setTimeout(() => setIsRefreshing(false), 500);
  };

  const handleAccept = async (app: Application) => {
    if (!user) return;
    setProcessingId(app.id);
    try {
      const serviceName = app.service_name || app.service_name || (app as any).services?.name || "—" || "";
      const fd = (app.form_data || {}) as Record<string, unknown>;
      const isBuyer =
        serviceName.includes("Mauzo") && String(fd.buyer_nida || "") === user.nida_number;
      const isTenant =
        serviceName.includes("Pango") && String(fd.tenant_nida || "") === user.nida_number;
      const updateData: Record<string, unknown> = {};
      if (isBuyer) updateData.buyer_accepted = true;
      if (isTenant) updateData.tenant_accepted = true;
      if (Object.keys(updateData).length === 0) {
        showToast(
          lang === "sw"
            ? "Huwezi kukubali — si mnunuzi wala mpangaji wa mkataba huu."
            : "Cannot accept — you are not the buyer or tenant of this agreement.",
          "error",
        );
        setProcessingId(null);
        return;
      }
      const { error } = await supabase.from("applications").update(updateData).eq("id", app.id);
      if (error) throw error;
      showToast(lang === "sw" ? "Umekubali mkataba." : "Agreement accepted.", "success");
      if (onRefresh) onRefresh();
    } catch (error) {
      showToast(
        lang === "sw" ? "Imeshindwa kukubali mkataba." : "Failed to accept agreement.",
        "error",
      );
    } finally {
      setProcessingId(null);
    }
  };

  const filteredAndSortedApplications = useMemo(() => {
    return applications
      .filter((app) => {
        const serviceName =
          lang === "sw"
            ? app.service_name || (app as any).services?.name || ""
            : (app as any).services?.name_en || app.service_name || (app as any).services?.name || "";
        const matchesSearch =
          serviceName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          app.application_number.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesStatus = statusFilter === "all" || app.status === statusFilter;
        return matchesSearch && matchesStatus;
      })
      .sort((a, b) => {
        const dateA = new Date(a.created_at).getTime();
        const dateB = new Date(b.created_at).getTime();
        return sortOrder === "desc" ? dateB - dateA : dateA - dateB;
      });
  }, [applications, searchTerm, statusFilter, sortOrder, lang]);

  const statuses = [
    { value: "all", label: lang === "sw" ? "Zote" : "All" },
    { value: "submitted", label: lang === "sw" ? "Imetumwa" : "Submitted" },
    { value: "approved", label: lang === "sw" ? "Imeidhinishwa" : "Approved" },
    { value: "pending_payment", label: lang === "sw" ? "Inasubiri Malipo" : "Pending Payment" },
    { value: "paid", label: lang === "sw" ? "Imelipiwa" : "Paid" },
    { value: "processing", label: lang === "sw" ? "Inashughulikiwa" : "Processing" },
    { value: "issued", label: lang === "sw" ? "Imetolewa" : "Issued" },
    { value: "rejected", label: lang === "sw" ? "Imekataliwa" : "Rejected" },
    { value: "refunded", label: lang === "sw" ? "Imerejeshwa" : "Refunded" },
  ];

  const displayApplications = useMemo(() => {
    return filteredAndSortedApplications.map((app) => {
      if (app.status === "approved") {
        return { ...app, status: "pending_payment" as const };
      }
      return app;
    });
  }, [filteredAndSortedApplications]);

  // Helper component for PDF download links (to avoid type issues)
  const ReceiptDownloadLink = ({ app }: { app: Application }) => {
    const [isClient, setIsClient] = useState(false);
    useEffect(() => setIsClient(true), []);
    if (!isClient) return <span className="text-amber-600 text-sm font-bold">Loading...</span>;
    return (
      <PDFDownloadLinkCompat
        document={
          <ReceiptPDF
            application={app}
            paymentData={{
              transaction_id:
                app.form_data?.payment_data?.transaction_id ||
                `TXN-${app.id.slice(0, 8).toUpperCase()}`,
              amount: getPaymentAmount(app),
              payment_method: app.form_data?.payment_data?.payment_method || "M-Pesa",
              paid_at: app.form_data?.payment_data?.paid_at || new Date().toISOString(),
            }}
            lang={lang}
          />
        }
        fileName={`Receipt_${app.application_number}.pdf`}
      >
        {({ loading }: { loading: boolean }) => (
          <span className="text-amber-600 text-sm font-bold hover:underline cursor-pointer">
            {loading ? "..." : t("receipt")}
          </span>
        )}
      </PDFDownloadLinkCompat>
    );
  };

  const CertificateDownloadLink = ({ app }: { app: Application }) => {
    const [isClient, setIsClient] = useState(false);
    useEffect(() => setIsClient(true), []);
    if (!isClient) return <span className="text-emerald-600 text-sm font-bold">Loading...</span>;
    return (
      <PDFDownloadLinkCompat
        document={<DocumentRenderer application={app} service={(app as any).services} />}
        fileName={`Certificate_${app.application_number}.pdf`}
      >
        {({ loading }: { loading: boolean }) => (
          <span className="text-emerald-600 text-sm font-bold hover:underline cursor-pointer">
            {loading ? "..." : t("download")}
          </span>
        )}
      </PDFDownloadLinkCompat>
    );
  };

  const MobileReceiptDownloadLink = ({ app }: { app: Application }) => {
    const [isClient, setIsClient] = useState(false);
    useEffect(() => setIsClient(true), []);
    if (!isClient)
      return (
        <div className="w-full h-10 bg-amber-50 rounded-xl flex items-center justify-center">
          Loading...
        </div>
      );
    return (
      <PDFDownloadLinkCompat
        document={
          <ReceiptPDF
            application={app}
            paymentData={{
              transaction_id:
                app.form_data?.payment_data?.transaction_id ||
                `TXN-${app.id.slice(0, 8).toUpperCase()}`,
              amount: getPaymentAmount(app),
              payment_method: app.form_data?.payment_data?.payment_method || "M-Pesa",
              paid_at: app.form_data?.payment_data?.paid_at || new Date().toISOString(),
            }}
            lang={lang}
          />
        }
        fileName={`Receipt_${app.application_number}.pdf`}
        className="w-full h-10 bg-amber-50 text-amber-600 rounded-xl text-xs font-bold flex items-center justify-center gap-2"
      >
        {({ loading }: { loading: boolean }) => (
          <>
            <Receipt size={14} />
            {loading ? "..." : lang === "sw" ? "Pakua Risiti" : "Download Receipt"}
          </>
        )}
      </PDFDownloadLinkCompat>
    );
  };

  const MobileCertificateDownloadLink = ({ app }: { app: Application }) => {
    const [isClient, setIsClient] = useState(false);
    useEffect(() => setIsClient(true), []);
    if (!isClient)
      return (
        <div className="flex-1 h-10 bg-emerald-50 rounded-xl flex items-center justify-center">
          Loading...
        </div>
      );
    return (
      <PDFDownloadLinkCompat
        document={<DocumentRenderer application={app} service={(app as any).services} />}
        fileName={`Certificate_${app.application_number}.pdf`}
        className="flex-1 h-10 bg-emerald-50 text-emerald-600 rounded-xl text-xs font-bold flex items-center justify-center"
      >
        {({ loading }: { loading: boolean }) => (loading ? "..." : t("downloadDocument"))}
      </PDFDownloadLinkCompat>
    );
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      className="space-y-6"
    >
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <h2 className="text-2xl font-bold text-stone-800">
            {showDraftsTab
              ? lang === "sw"
                ? "Ombi Zilizobaki"
                : "Unfinished Applications"
              : t("myApplications")}
          </h2>
          {onRefresh && (
            <button
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="flex items-center gap-2 px-4 py-2 bg-emerald-50 text-emerald-600 rounded-xl font-semibold text-sm hover:bg-emerald-100 transition-all disabled:opacity-50"
            >
              <RefreshCw size={16} className={isRefreshing ? "animate-spin" : ""} />
              {lang === "sw" ? "Onyesha Upya" : "Refresh"}
            </button>
          )}
        </div>

        {drafts.length > 0 && (
          <div className="flex items-center gap-2 bg-stone-100 p-1 rounded-xl">
            <button
              onClick={() => setShowDraftsTab(false)}
              className={`px-4 py-2 rounded-lg font-semibold text-sm transition-all ${!showDraftsTab ? "bg-white text-emerald-600 shadow-sm" : "text-stone-600"}`}
            >
              {t("myApplications")}
            </button>
            <button
              onClick={() => setShowDraftsTab(true)}
              className={`px-4 py-2 rounded-lg font-semibold text-sm transition-all flex items-center gap-2 ${showDraftsTab ? "bg-white text-orange-600 shadow-sm" : "text-stone-600"}`}
            >
              <AlertCircle size={16} />
              {lang === "sw" ? "Ombi Zilizobaki" : "Unfinished"} ({drafts.length})
            </button>
          </div>
        )}

        <div className="flex flex-wrap items-center gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" size={18} />
            <input
              type="text"
              placeholder={lang === "sw" ? "Tafuta..." : "Search..."}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-4 h-11 bg-white border border-stone-200 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 w-full md:w-64"
            />
          </div>

          <div className="relative">
            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" size={18} />
            <select
              title={lang === "sw" ? "Chuja kwa hali" : "Filter by status"}
              aria-label={lang === "sw" ? "Chuja kwa hali" : "Filter by status"}
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="pl-10 pr-8 h-11 bg-white border border-stone-200 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 appearance-none"
            >
              {statuses.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>
          </div>

          <button
            onClick={() => setSortOrder((prev) => (prev === "asc" ? "desc" : "asc"))}
            className="flex items-center gap-2 px-4 h-11 bg-white border border-stone-200 rounded-xl text-sm font-bold text-stone-600 hover:bg-stone-50"
          >
            <Calendar size={18} />
            {lang === "sw" ? "Tarehe" : "Date"}
            <ArrowUpDown
              size={14}
              className={
                sortOrder === "desc" ? "rotate-180 transition-transform" : "transition-transform"
              }
            />
          </button>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-stone-200 overflow-hidden shadow-sm">
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead className="bg-stone-50 border-b border-stone-200">
              <tr>
                <th className="px-3 sm:px-6 py-3 sm:py-4 text-xs font-bold text-stone-500 uppercase tracking-wider">
                  {t("services")}
                </th>
                <th className="px-3 sm:px-6 py-3 sm:py-4 text-xs font-bold text-stone-500 uppercase tracking-wider">
                  {lang === "sw" ? "Namba ya Maombi" : "App Number"}
                </th>
                <th className="px-3 sm:px-6 py-3 sm:py-4 text-xs font-bold text-stone-500 uppercase tracking-wider">
                  {t("date")}
                </th>
                <th className="px-3 sm:px-6 py-3 sm:py-4 text-xs font-bold text-stone-500 uppercase tracking-wider">
                  {t("status")}
                </th>
                <th className="px-3 sm:px-6 py-3 sm:py-4 text-xs font-bold text-stone-500 uppercase tracking-wider text-right">
                  {t("action")}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {displayApplications.map((app) => (
                <tr
                  key={app.id}
                  className="hover:bg-stone-50 transition-colors cursor-pointer"
                  onClick={() => setSelectedApp(app)}
                >
                  <td className="px-3 sm:px-6 py-3 sm:py-4">
                    <p className="font-semibold text-stone-800">
                      {lang === "sw"
                        ? app.service_name || (app as any).services?.name || "—"
                        : (app as any).services?.name_en || app.service_name || (app as any).services?.name || "—"}
                    </p>
                  </td>
                  <td className="px-3 sm:px-6 py-3 sm:py-4 text-sm text-stone-500 font-mono">
                    {app.application_number}
                  </td>
                  <td className="px-3 sm:px-6 py-3 sm:py-4">
                    <div className="flex flex-col">
                      <p className="text-sm text-stone-600">
                        {new Date(app.created_at).toLocaleDateString()}
                      </p>
                      <p className="text-xs text-stone-400">
                        {new Date(app.created_at).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </p>
                    </div>
                  </td>
                  <td className="px-3 sm:px-6 py-3 sm:py-4">
                    <div className="flex flex-col gap-2">
                      <div className="flex items-center gap-2">
                        <StatusBadge status={app.status} lang={lang} />
                        {["paid", "verified", "approved", "issued"].includes(app.status) ? (
                          <span className="flex items-center gap-1 text-emerald-600 text-[10px] font-bold">
                            <CheckCircle2 size={12} /> {lang === "sw" ? "Imelipiwa" : "Paid"}
                          </span>
                        ) : ["submitted", "pending_payment"].includes(app.status) &&
                          getPaymentAmount(app) > 0 ? (
                          <span className="flex items-center gap-1 text-orange-600 text-[10px] font-bold">
                            <CreditCard size={12} /> {lang === "sw" ? "Haijalipwa" : "Unpaid"}
                          </span>
                        ) : null}
                      </div>
                      <ApplicationProgressBar status={app.status} lang={lang} compact />
                    </div>
                  </td>
                  <td className="px-3 sm:px-6 py-3 sm:py-4 text-right">
                    {(app.status === "submitted" || app.status === "pending_payment") &&
                    getPaymentAmount(app) > 0 ? (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onPay(app);
                        }}
                        className="bg-emerald-600 text-white px-4 py-1.5 rounded-lg text-xs font-bold hover:bg-emerald-700 transition-all"
                      >
                        {t("payNow")} ({formatCurrency(getPaymentAmount(app), displayCurrency)})
                      </button>
                    ) : app.status === "issued" ? (
                      <div className="flex items-center justify-end gap-3">
                        <ReceiptDownloadLink app={app} />
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setPreviewApp(app);
                          }}
                          className="text-stone-600 text-sm font-bold hover:underline"
                        >
                          {t("preview")}
                        </button>
                        <CertificateDownloadLink app={app} />
                      </div>
                    ) : (
                      <button
                        className="text-stone-400 text-sm font-bold cursor-not-allowed"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {app.status === "rejected"
                          ? t("rejected")
                          : app.status === "refunded"
                            ? t("refunded")
                            : t("inProgress")}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="md:hidden divide-y divide-stone-100">
          {displayApplications.map((app) => (
            <div
              key={app.id}
              className="p-4 space-y-4 cursor-pointer hover:bg-stone-50"
              onClick={() => setSelectedApp(app)}
            >
              <div className="flex justify-between items-start">
                <div>
                  <p className="font-bold text-stone-900">
                    {lang === "sw"
                      ? app.service_name || (app as any).services?.name || "—"
                      : (app as any).services?.name_en || app.service_name || (app as any).services?.name || "—"}
                  </p>
                  <p className="text-xs text-stone-500 font-mono mt-1">{app.application_number}</p>
                </div>
                <StatusBadge status={app.status} lang={lang} />
              </div>
              <div className="flex items-center justify-between text-xs text-stone-500">
                <div className="flex items-center gap-1">
                  <Calendar size={14} /> {new Date(app.created_at).toLocaleDateString()}
                </div>
              </div>
              <div className="pt-2 border-t border-stone-50">
                {(app.status === "submitted" || app.status === "pending_payment") &&
                getPaymentAmount(app) > 0 ? (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onPay(app);
                    }}
                    className="w-full bg-emerald-600 text-white px-4 py-2 rounded-xl text-xs font-bold hover:bg-emerald-700"
                  >
                    {t("payNow")} ({formatCurrency(getPaymentAmount(app), displayCurrency)})
                  </button>
                ) : app.status === "issued" ? (
                  <div className="space-y-2">
                    <MobileReceiptDownloadLink app={app} />
                    <div className="flex gap-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setPreviewApp(app);
                        }}
                        className="flex-1 h-10 bg-stone-100 text-stone-600 rounded-xl text-xs font-bold"
                      >
                        {t("preview")}
                      </button>
                      <MobileCertificateDownloadLink app={app} />
                    </div>
                  </div>
                ) : (
                  <div className="text-stone-400 text-xs font-bold py-2 text-center">
                    {app.status === "rejected"
                      ? t("rejected")
                      : app.status === "refunded"
                        ? t("refunded")
                        : t("inProgress")}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        {displayApplications.length === 0 && !showDraftsTab && (
          <div className="px-6 py-12 text-center text-stone-400">
            <Search size={32} className="opacity-20 mx-auto mb-2" />
            <p>{lang === "sw" ? "Hakuna maombi yaliyopatikana." : "No applications found."}</p>
          </div>
        )}

        {showDraftsTab && (
          <div className="divide-y divide-stone-100">
            {drafts.map((draft) => (
              <div key={draft.id} className="p-6 hover:bg-stone-50">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <AlertCircle size={20} className="text-orange-500" />
                      <p className="font-bold text-stone-900 text-lg">{draft.service_name}</p>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-sm text-stone-600">
                      <div>
                        <span className="font-semibold">
                          {lang === "sw" ? "Iliyoanzishwa:" : "Started:"}
                        </span>{" "}
                        {(draft as unknown as Record<string, unknown>)["last_saved"]
                          ? new Date(
                              String((draft as unknown as Record<string, unknown>)["last_saved"]),
                            ).toLocaleDateString()
                          : "-"}
                      </div>
                      <div>
                        <span className="font-semibold">
                          {lang === "sw" ? "Hatua ya Mwisho:" : "Last Step:"}
                        </span>{" "}
                        {String(
                          (draft as unknown as Record<string, unknown>)["current_step"] ?? "draft",
                        )}
                      </div>
                      <div>
                        <span className="font-semibold">
                          {lang === "sw" ? "Sehemu Zilizojazwa:" : "Progress:"}
                        </span>{" "}
                        {Object.values(draft.form_data || {}).filter((v: unknown) => !!v).length}{" "}
                        {lang === "sw" ? "sehemu" : "fields"}
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => onResumeDraft?.(draft)}
                      className="px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-xl font-semibold text-sm"
                    >
                      {lang === "sw" ? "Endelea" : "Continue"}
                    </button>
                    <button
                      onClick={() => {
                        localStorage.removeItem(draft.id);
                        onRefresh?.();
                      }}
                      className="px-4 py-2 bg-red-50 hover:bg-red-100 text-red-600 rounded-xl font-semibold text-sm"
                    >
                      {lang === "sw" ? "Futa" : "Delete"}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {previewApp && (
        <DocumentPreview
          application={previewApp}
          service={(previewApp as any).services}
          onClose={() => setPreviewApp(null)}
        />
      )}
    </motion.div>
  );
}
