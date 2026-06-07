import React, { useState, useEffect, useCallback, useMemo } from "react";
import { motion } from "framer-motion";
import {
  Wallet,
  Download,
  Search,
  Receipt,
  TrendingUp,
  Clock,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Calendar,
  FileText,
  ChevronRight,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { getApplicationAmount } from "@/lib/serviceFees";
import { useAuth } from "@/context/AuthContext";
import { useLanguage } from "@/context/LanguageContext";
import { cn } from "@/lib/utils";

interface PaymentRecord {
  id: string;
  amount: number;
  currency: string;
  payment_method?: string;
  transaction_id?: string;
  receipt_number?: string;
  status: string;
  created_at: string;
  application?: {
    id: string;
    application_number: string;
    service_name: string;
    status: string;
  };
}

interface IssuedDoc {
  id: string;
  application_number: string;
  service_name: string;
  status: string;
  created_at: string;
  form_data?: { service_fee?: number };
  payment_data?: { amount?: number; receipt_number?: string };
}

export function MyPayments() {
  const { user } = useAuth();
  const { lang } = useLanguage();
  const L = useCallback((sw: string, en: string) => (lang === "sw" ? sw : en), [lang]);

  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [issuedApps, setIssuedApps] = useState<IssuedDoc[]>([]);
  const [outstandingApps, setOutstandingApps] = useState<IssuedDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState<"history" | "receipts" | "outstanding">("history");

  // ── Fetch data ─────────────────────────────────────────────────────────
  useEffect(() => {
    if (!user?.id) return;
    setLoading(true);

    const fetchAll = async () => {
      // 1. Get user's application IDs first
      const { data: apps } = await supabase
        .from("applications")
        .select("id")
        .eq("user_id", user.id);
      const appIds = (apps || []).map((a) => a.id);

      // 2. Fetch payments for those applications
      let finalPayments: PaymentRecord[] = [];
      if (appIds.length > 0) {
        const { data: paymentData } = await supabase
          .from("payments")
          .select("*, application:application_id(id, application_number, service_name, status)")
          .in("application_id", appIds)
          .order("created_at", { ascending: false });
        finalPayments = (paymentData as PaymentRecord[]) || [];
      }

      // 3. Also build payment-like records from paid/issued applications
      //    (covers cases where payment was processed but no payments table entry)
      const { data: paidApps } = await supabase
        .from("applications")
        .select(
          "id, application_number, service_name, status, form_data, payment_data, created_at, updated_at",
        )
        .eq("user_id", user.id)
        .in("status", ["paid", "issued", "approved", "verified"]);

      if (paidApps) {
        for (const app of paidApps) {
          const pd = (app.payment_data || {}) as Record<string, unknown> & {
            amount?: number;
            payment_method?: string;
            transaction_id?: string;
            receipt_number?: string;
          };
          const fd = (app.form_data || {}) as Record<string, unknown> & { service_fee?: number };
          const amount = getApplicationAmount(app);
          // Skip if already in payments table
          if (finalPayments.find((p) => (p.application as { id?: string })?.id === app.id))
            continue;
          if (Number(amount) > 0) {
            finalPayments.push({
              id: app.id,
              amount: Number(amount),
              currency: "TZS",
              payment_method: pd.payment_method || "E-Mtaa",
              transaction_id: pd.transaction_id,
              receipt_number: pd.receipt_number || `RCP-${app.application_number}`,
              status: "completed",
              created_at: app.updated_at || app.created_at,
              application: {
                id: app.id,
                application_number: app.application_number,
                service_name: app.service_name,
                status: app.status,
              },
            });
          }
        }
      }

      // Sort by date
      finalPayments.sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
      );
      setPayments(finalPayments);

      // 2. Issued applications (receipt vault)
      const { data: issued } = await supabase
        .from("applications")
        .select("id, application_number, service_name, status, created_at, form_data, payment_data")
        .eq("user_id", user.id)
        .eq("status", "issued")
        .order("created_at", { ascending: false });
      setIssuedApps((issued as IssuedDoc[]) || []);

      // 3. Outstanding (pending_payment)
      const { data: outstanding } = await supabase
        .from("applications")
        .select("id, application_number, service_name, status, created_at, form_data, payment_data")
        .eq("user_id", user.id)
        .eq("status", "pending_payment")
        .order("created_at", { ascending: false });
      setOutstandingApps((outstanding as IssuedDoc[]) || []);

      setLoading(false);
    };

    fetchAll();
  }, [user?.id]);

  // ── Analytics ──────────────────────────────────────────────────────────
  const analytics = useMemo(() => {
    const now = new Date();
    const thisMonth = payments.filter((p) => {
      const d = new Date(p.created_at);
      return (
        d.getMonth() === now.getMonth() &&
        d.getFullYear() === now.getFullYear() &&
        p.status === "completed"
      );
    });
    const thisYear = payments.filter((p) => {
      const d = new Date(p.created_at);
      return d.getFullYear() === now.getFullYear() && p.status === "completed";
    });
    const totalMonth = thisMonth.reduce((s, p) => s + Number(p.amount || 0), 0);
    const totalYear = thisYear.reduce((s, p) => s + Number(p.amount || 0), 0);
    const outstandingAmount = outstandingApps.reduce((s, a) => {
      return s + getApplicationAmount(a);
    }, 0);

    // Most used service
    const serviceCounts: Record<string, number> = {};
    payments.forEach((p) => {
      const name = (p.application as PaymentRecord["application"])?.service_name || "Unknown";
      serviceCounts[name] = (serviceCounts[name] || 0) + 1;
    });
    const topService = Object.entries(serviceCounts).sort((a, b) => b[1] - a[1])[0];

    return {
      totalMonth,
      totalYear,
      outstandingAmount,
      outstandingCount: outstandingApps.length,
      topService,
    };
  }, [payments, outstandingApps]);

  // ── Search filter ──────────────────────────────────────────────────────
  const filteredPayments = searchQuery
    ? payments.filter(
        (p) =>
          (p.receipt_number || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
          (p.transaction_id || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
          ((p.application as PaymentRecord["application"])?.application_number || "")
            .toLowerCase()
            .includes(searchQuery.toLowerCase()) ||
          ((p.application as PaymentRecord["application"])?.service_name || "")
            .toLowerCase()
            .includes(searchQuery.toLowerCase()),
      )
    : payments;

  const filteredReceipts = searchQuery
    ? issuedApps.filter(
        (a) =>
          a.application_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
          a.service_name.toLowerCase().includes(searchQuery.toLowerCase()),
      )
    : issuedApps;

  const fmt = (n: number) => `TSh ${n.toLocaleString("en-US")}`;

  // ── RENDER ─────────────────────────────────────────────────────────────
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      {/* Header */}
      <div>
        <h1 className="text-2xl font-black text-stone-900 tracking-tight flex items-center gap-2">
          <Wallet size={24} className="text-emerald-600" />
          {L("Malipo Yangu", "My Payments")}
        </h1>
        <p className="text-sm text-stone-500 mt-0.5">
          {L(
            "Historia ya malipo, stakabadhi, na madeni",
            "Payment history, receipts, and obligations",
          )}
        </p>
      </div>

      {/* Analytics cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-emerald-50 border border-emerald-100 rounded-2xl p-4">
          <div className="flex items-center gap-2 mb-1">
            <Calendar size={14} className="text-emerald-600" />
            <span className="text-[10px] font-bold text-stone-500 uppercase">
              {L("Mwezi Huu", "This Month")}
            </span>
          </div>
          <p className="text-lg font-black text-emerald-700">{fmt(analytics.totalMonth)}</p>
        </div>
        <div className="bg-blue-50 border border-blue-100 rounded-2xl p-4">
          <div className="flex items-center gap-2 mb-1">
            <TrendingUp size={14} className="text-blue-600" />
            <span className="text-[10px] font-bold text-stone-500 uppercase">
              {L("Mwaka Huu", "This Year")}
            </span>
          </div>
          <p className="text-lg font-black text-blue-700">{fmt(analytics.totalYear)}</p>
        </div>
        <div
          className={cn(
            "border rounded-2xl p-4",
            analytics.outstandingCount > 0
              ? "bg-amber-50 border-amber-100"
              : "bg-stone-50 border-stone-100",
          )}
        >
          <div className="flex items-center gap-2 mb-1">
            <AlertCircle
              size={14}
              className={analytics.outstandingCount > 0 ? "text-amber-600" : "text-stone-400"}
            />
            <span className="text-[10px] font-bold text-stone-500 uppercase">
              {L("Madeni", "Outstanding")}
            </span>
          </div>
          <p
            className={cn(
              "text-lg font-black",
              analytics.outstandingCount > 0 ? "text-amber-700" : "text-stone-400",
            )}
          >
            {analytics.outstandingCount > 0 ? fmt(analytics.outstandingAmount) : "—"}
          </p>
          {analytics.outstandingCount > 0 && (
            <p className="text-[10px] text-amber-600 mt-0.5">
              {analytics.outstandingCount} {L("inasubiri", "pending")}
            </p>
          )}
        </div>
        <div className="bg-purple-50 border border-purple-100 rounded-2xl p-4">
          <div className="flex items-center gap-2 mb-1">
            <Receipt size={14} className="text-purple-600" />
            <span className="text-[10px] font-bold text-stone-500 uppercase">
              {L("Stakabadhi", "Receipts")}
            </span>
          </div>
          <p className="text-lg font-black text-purple-700">{issuedApps.length}</p>
          {analytics.topService && (
            <p className="text-[10px] text-stone-500 mt-0.5 truncate">
              {L("Huduma kuu:", "Top:")} {analytics.topService[0]}
            </p>
          )}
        </div>
      </div>

      {/* Tabs + Search */}
      <div className="space-y-3">
        <div className="flex gap-1 bg-stone-100 rounded-xl p-1">
          {(
            [
              { key: "history", label: L("Historia", "History"), count: payments.length },
              { key: "receipts", label: L("Stakabadhi", "Receipts"), count: issuedApps.length },
              {
                key: "outstanding",
                label: L("Madeni", "Outstanding"),
                count: outstandingApps.length,
              },
            ] as const
          ).map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={cn(
                "flex-1 py-2.5 px-3 rounded-lg text-sm font-bold transition-colors",
                activeTab === tab.key
                  ? "bg-white text-stone-900 shadow-sm"
                  : "text-stone-500 hover:text-stone-700",
              )}
            >
              {tab.label}
              {tab.count > 0 && (
                <span
                  className={cn(
                    "ml-1.5 text-[10px] px-1.5 py-0.5 rounded-full",
                    activeTab === tab.key
                      ? "bg-emerald-100 text-emerald-700"
                      : "bg-stone-200 text-stone-500",
                  )}
                >
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </div>

        {(activeTab === "history" || activeTab === "receipts") && (
          <div className="relative">
            <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-400" />
            <input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={L(
                "Tafuta kwa nambari au huduma...",
                "Search by reference or service...",
              )}
              className="w-full pl-11 pr-4 py-3 border border-stone-200 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500"
            />
          </div>
        )}
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex items-center justify-center py-16 text-stone-400">
          <Loader2 size={24} className="animate-spin" />
        </div>
      ) : (
        <>
          {/* HISTORY TAB */}
          {activeTab === "history" && (
            <div className="space-y-2">
              {filteredPayments.length === 0 ? (
                <div className="text-center py-16 bg-white rounded-2xl border border-stone-200">
                  <Wallet size={40} className="mx-auto text-stone-300 mb-3" />
                  <p className="font-bold text-stone-500">
                    {L("Hakuna malipo bado", "No payments yet")}
                  </p>
                </div>
              ) : (
                filteredPayments.map((p) => {
                  const app = p.application as PaymentRecord["application"];
                  return (
                    <div
                      key={p.id}
                      className="bg-white border border-stone-200 rounded-2xl p-4 flex items-center gap-4"
                    >
                      <div
                        className={cn(
                          "w-10 h-10 rounded-xl flex items-center justify-center shrink-0",
                          p.status === "completed"
                            ? "bg-emerald-50"
                            : p.status === "failed"
                              ? "bg-red-50"
                              : "bg-amber-50",
                        )}
                      >
                        {p.status === "completed" ? (
                          <CheckCircle2 size={18} className="text-emerald-600" />
                        ) : p.status === "failed" ? (
                          <AlertCircle size={18} className="text-red-500" />
                        ) : (
                          <Clock size={18} className="text-amber-600" />
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-bold text-stone-900 truncate">
                          {app?.service_name || L("Malipo", "Payment")}
                        </p>
                        <p className="text-xs text-stone-400">
                          {app?.application_number} ·{" "}
                          {new Date(p.created_at).toLocaleDateString("sw-TZ")}
                        </p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-sm font-black text-stone-900">{fmt(Number(p.amount))}</p>
                        <p
                          className={cn(
                            "text-[10px] font-bold uppercase",
                            p.status === "completed"
                              ? "text-emerald-600"
                              : p.status === "failed"
                                ? "text-red-500"
                                : "text-amber-600",
                          )}
                        >
                          {p.status === "completed"
                            ? L("Imelipwa", "Paid")
                            : p.status === "failed"
                              ? L("Imeshindwa", "Failed")
                              : L("Inasubiri", "Pending")}
                        </p>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}

          {/* RECEIPTS TAB */}
          {activeTab === "receipts" && (
            <div className="space-y-2">
              {filteredReceipts.length === 0 ? (
                <div className="text-center py-16 bg-white rounded-2xl border border-stone-200">
                  <Receipt size={40} className="mx-auto text-stone-300 mb-3" />
                  <p className="font-bold text-stone-500">
                    {L("Hakuna stakabadhi", "No receipts yet")}
                  </p>
                </div>
              ) : (
                filteredReceipts.map((app) => (
                  <div
                    key={app.id}
                    className="bg-white border border-stone-200 rounded-2xl p-4 flex items-center gap-4"
                  >
                    <div className="w-10 h-10 rounded-xl bg-purple-50 flex items-center justify-center shrink-0">
                      <FileText size={18} className="text-purple-600" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-bold text-stone-900 truncate">
                        {app.service_name}
                      </p>
                      <p className="text-xs text-stone-400">
                        {app.application_number} ·{" "}
                        {new Date(app.created_at).toLocaleDateString("sw-TZ")}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="px-2 py-1 bg-emerald-100 text-emerald-700 text-[10px] font-bold rounded-lg uppercase">
                        {L("Imetolewa", "Issued")}
                      </span>
                      <button
                        className="p-2 text-stone-400 hover:text-emerald-600 transition-colors"
                        title={L("Pakua", "Download")}
                        aria-label="Download receipt"
                      >
                        <Download size={16} />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {/* OUTSTANDING TAB */}
          {activeTab === "outstanding" && (
            <div className="space-y-2">
              {outstandingApps.length === 0 ? (
                <div className="text-center py-16 bg-white rounded-2xl border border-stone-200">
                  <CheckCircle2 size={40} className="mx-auto text-emerald-300 mb-3" />
                  <p className="font-bold text-emerald-600">
                    {L("Hakuna madeni!", "No outstanding payments!")}
                  </p>
                  <p className="text-sm text-stone-400 mt-1">
                    {L("Malipo yako yote yamelipwa", "All your payments are settled")}
                  </p>
                </div>
              ) : (
                outstandingApps.map((app) => {
                  const fee = app.form_data?.service_fee || app.payment_data?.amount || 0;
                  return (
                    <div
                      key={app.id}
                      className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-center gap-4"
                    >
                      <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center shrink-0">
                        <Clock size={18} className="text-amber-700" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-bold text-stone-900 truncate">
                          {app.service_name}
                        </p>
                        <p className="text-xs text-stone-500">
                          {app.application_number} · {L("Inasubiri malipo", "Pending payment")}
                        </p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-sm font-black text-amber-800">{fmt(Number(fee))}</p>
                        <p className="text-[10px] font-bold text-amber-600 uppercase">
                          {L("Madeni", "Due")}
                        </p>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}
        </>
      )}
    </motion.div>
  );
}
