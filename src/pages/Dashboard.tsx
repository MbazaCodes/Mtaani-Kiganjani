import { cn } from "@/lib/utils";
/**
 * Citizen Dashboard — the main view after login
 *
 * Shows: welcome card with business badges, stat cards, quick
 * actions, pending agreements banner, recent applications.
 */
import React, { useState, useEffect } from "react";
import type { ViewName } from "@/types";
import { motion } from "framer-motion";
import {
  FileText,
  Clock,
  CheckCircle,
  CheckCircle2,
  AlertCircle,
  Building2,
  RefreshCw,
  ArrowRight,
  Bell,
  Briefcase,
  Plus,
  DollarSign,
  Scale,
  ShieldCheck,
  Eye,
  Loader2,
  Star,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { ApplicationChat } from "@/components/ApplicationChat";
import { StatusTimeline } from "@/components/StatusTimeline";
import { useLanguage } from "@/context/LanguageContext";
import { StatCard } from "@/components/ui/StatCard";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { Application } from "@/lib/supabase";
import { countUnreadNotifications } from "@/lib/notifications";
import { supabase } from "@/lib/supabase";
import { VerificationStatusCard } from "@/components/VerificationStatusCard";
import { getUserTier, getProfileCompletion } from "@/lib/verification";
import { CompleteProfileModal } from "@/components/CompleteProfileModal";

interface DashboardProps {
  applications: Application[];
  setView: (view: ViewName) => void;
  onRefresh?: () => void;
}

export function Dashboard({ applications, setView, onRefresh }: DashboardProps) {
  const { user, refreshProfile } = useAuth();
  const { lang } = useLanguage();
  const L = (sw: string, en: string) => (lang === "sw" ? sw : en);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [localUser, setLocalUser] = useState(user);
  const [pendingAgreements, setPendingAgreements] = useState(0);
  const [selectedDashApp, setSelectedDashApp] = useState<Application | null>(null);

  // Keep localUser in sync with auth context user (important on page refresh —
  // the auth user re-fetches from DB asynchronously after mount)
  useEffect(() => {
    if (user) setLocalUser(user);
  }, [user]);

  useEffect(() => {
    if (!user?.id) return;
    countUnreadNotifications(user.id).then(setUnreadCount);
    // Count pending agreement notifications
    supabase
      .from("agreement_notifications")
      .select("id", { count: "exact", head: true })
      .eq("recipient_id", user.id)
      .eq("is_actioned", false)
      .then(({ count }) => setPendingAgreements(count || 0));
  }, [user?.id]);

  const handleRefresh = async () => {
    if (!onRefresh) return;
    setIsRefreshing(true);
    await onRefresh();
    if (user?.id) {
      const n = await countUnreadNotifications(user.id);
      setUnreadCount(n);
    }
    setTimeout(() => setIsRefreshing(false), 500);
  };

  // Stats
  const total = applications.length;
  const pending = applications.filter((a) =>
    ["submitted", "pending_review", "pending_payment", "paid", "verified"].includes(a.status),
  ).length;
  const approved = applications.filter(
    (a) => a.status === "approved" || a.status === "issued",
  ).length;
  const rejected = applications.filter((a) => a.status === "rejected").length;
  const recent = applications.slice(0, 5);

  // Module 2-4 stats
  const [ticketStats, setTicketStats] = useState({ total: 0, open: 0 });
  const [reportStats, setReportStats] = useState({ total: 0, open: 0 });
  const [announcementCount, setAnnouncementCount] = useState(0);
  const [paymentStats, setPaymentStats] = useState({ outstanding: 0, amount: 0 });

  useEffect(() => {
    if (!user?.id) return;
    // Tickets
    supabase
      .from("support_tickets")
      .select("id, status")
      .eq("citizen_id", user.id)
      .then(({ data }) => {
        const t = data || [];
        setTicketStats({
          total: t.length,
          open: t.filter((x: { status: string }) => !["resolved", "closed"].includes(x.status))
            .length,
        });
      });
    // Reports
    supabase
      .from("community_reports")
      .select("id, status")
      .eq("citizen_id", user.id)
      .then(({ data }) => {
        const r = data || [];
        setReportStats({
          total: r.length,
          open: r.filter((x: { status: string }) => !["resolved", "closed"].includes(x.status))
            .length,
        });
      });
    // Payments
    supabase
      .from("applications")
      .select("id, form_data, payment_data")
      .eq("user_id", user.id)
      .eq("status", "pending_payment")
      .then(({ data }) => {
        const outstanding = data || [];
        const total = outstanding.reduce(
          (
            s: number,
            a: { form_data?: { service_fee?: number }; payment_data?: { amount?: number } },
          ) => s + Number(a.form_data?.service_fee || a.payment_data?.amount || 0),
          0,
        );
        setPaymentStats({ outstanding: outstanding.length, amount: total });
      });
    // Announcements
    supabase
      .from("announcements")
      .select("id", { count: "exact", head: true })
      .eq("is_active", true)
      .or(
        `level.eq.national,ward.eq.${user.ward || "NONE"},district.eq.${user.district || "NONE"},region.eq.${user.region || "NONE"}`,
      )
      .then(({ count }) => setAnnouncementCount(count || 0));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  const hasBizRole = !!(user?.seller_id || user?.landlord_id || user?.broker_id);

  // Profile completion — prefer DB-stored value (updated by CompleteProfileModal),
  // fall back to client-side calculation. Both must agree before hiding the banner.
  const profileCompletion = Math.max(
    localUser?.profile_completion_pct ?? 0,
    getProfileCompletion(localUser),
  );
  const currentTier = getUserTier(localUser);
  // Hide the banner if: tier says done, OR DB says ≥ 100%, OR user is verified
  const profileDone =
    currentTier === "PROFILE_COMPLETED" ||
    currentTier === "NIDA_VERIFIED" ||
    (localUser?.profile_completion_pct ?? 0) >= 100 ||
    localUser?.is_verified === true;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-5 sm:space-y-6"
    >
      {/* Profile completion reminder — shown when profile < 60% */}
      {user?.role === "citizen" && !profileDone && profileCompletion < 100 && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-300 rounded-2xl p-4 flex items-start gap-4"
        >
          <div className="w-10 h-10 bg-amber-100 rounded-xl flex items-center justify-center shrink-0">
            <span className="text-xl">📋</span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-black text-amber-900 text-sm">
              {L("Kamilisha Wasifu Wako", "Complete Your Profile")}
            </p>
            <p className="text-xs text-amber-700 mt-0.5 leading-relaxed">
              {L(
                `Wasifu wako umekamilika ${profileCompletion}%. Ongeza taarifa zaidi kufungua huduma zote na kupata usindikaji wa haraka.`,
                `Your profile is ${profileCompletion}% complete. Add more details to unlock all services and get faster processing.`,
              )}
            </p>
            <div className="mt-2 flex items-center gap-3">
              <div className="flex-1 h-1.5 bg-amber-200 rounded-full overflow-hidden">
                <div
                  className="h-full bg-amber-500 rounded-full transition-all"
                  style={{ width: `${profileCompletion}%` }}
                />
              </div>
              <span className="text-[11px] font-black text-amber-700 shrink-0">
                {profileCompletion}%
              </span>
            </div>
          </div>
          <button
            onClick={() => setShowProfileModal(true)}
            className="shrink-0 flex items-center gap-1 px-3 h-8 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-xs font-bold transition-all"
          >
            {L("Kamilisha", "Complete")} →
          </button>
        </motion.div>
      )}

      {/* Welcome Card */}
      <div className="bg-gradient-to-br from-stone-800 via-stone-700 to-emerald-900 rounded-2xl sm:rounded-3xl p-5 sm:p-8 text-white shadow-xl relative overflow-hidden">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZGVmcz48cGF0dGVybiBpZD0iZyIgd2lkdGg9IjIwIiBoZWlnaHQ9IjIwIiBwYXR0ZXJuVW5pdHM9InVzZXJTcGFjZU9uVXNlIj48Y2lyY2xlIGN4PSIxMCIgY3k9IjEwIiByPSIxIiBmaWxsPSJyZ2JhKDI1NSwyNTUsMjU1LDAuMDUpIi8+PC9wYXR0ZXJuPjwvZGVmcz48cmVjdCBmaWxsPSJ1cmwoI2cpIiB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIvPjwvc3ZnPg==')] opacity-50" />
        <div className="relative z-10">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-stone-300 text-sm font-medium mb-1">
                {L("Karibu", "Welcome back")},
              </p>
              <h1 className="text-xl sm:text-2xl font-black mb-2">
                {user?.first_name} {user?.last_name}
              </h1>
              <div className="flex flex-wrap gap-1.5">
                {user?.is_verified && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[9px] font-bold bg-emerald-500/30 text-emerald-200 backdrop-blur-sm">
                    <ShieldCheck size={10} /> {L("Raia Aliyethibitishwa", "Verified Citizen")}
                  </span>
                )}
                {user?.seller_id && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[9px] font-bold bg-blue-500/30 text-blue-200 backdrop-blur-sm">
                    🏪 {L("Muuzaji", "Seller")}
                  </span>
                )}
                {user?.landlord_id && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[9px] font-bold bg-teal-500/30 text-teal-200 backdrop-blur-sm">
                    🔑 {L("Mpangishaji", "Landlord")}
                  </span>
                )}
                {user?.broker_id && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[9px] font-bold bg-purple-500/30 text-purple-200 backdrop-blur-sm">
                    👥 {L("Dalali", "Broker")}
                  </span>
                )}
              </div>
            </div>
            <button
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="p-2 text-white/60 hover:text-white hover:bg-white/10 rounded-lg transition-colors disabled:opacity-50"
            >
              <RefreshCw size={18} className={isRefreshing ? "animate-spin" : ""} />
            </button>
          </div>
        </div>
      </div>

      {/* Pending Agreements Banner */}
      {pendingAgreements > 0 && (
        <motion.button
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          onClick={() => setView("notifications")}
          className="w-full bg-violet-50 border-2 border-violet-300 rounded-2xl p-4 flex items-center gap-3 text-left hover:bg-violet-100 transition-all"
        >
          <div className="w-10 h-10 rounded-xl bg-violet-200 flex items-center justify-center shrink-0 animate-pulse">
            <Scale size={20} className="text-violet-700" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-black text-violet-800 text-sm">
              {pendingAgreements}{" "}
              {L(
                "Makubaliano Yanasubiri Kukubaliwa Kwako",
                "Agreement(s) Awaiting Your Acceptance",
              )}
            </p>
            <p className="text-xs text-violet-600">
              {L(
                "Bonyeza hapa kufungua na kukubali au kukataa",
                "Tap here to open and accept or reject",
              )}
            </p>
          </div>
          <ArrowRight size={18} className="text-violet-400 shrink-0" />
        </motion.button>
      )}

      {/* Stat Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard
          icon={<FileText className="text-blue-500" size={20} />}
          label={L("Jumla", "Total")}
          value={String(total)}
          description={L("Maombi yote", "All applications")}
        />
        <StatCard
          icon={<Clock className="text-amber-500" size={20} />}
          label={L("Inaendelea", "In Progress")}
          value={String(pending)}
          description={L("Zinasubiri", "Pending action")}
        />
        <StatCard
          icon={<CheckCircle className="text-emerald-500" size={20} />}
          label={L("Imekamilika", "Completed")}
          value={String(approved)}
          description={L("Zimeidhinishwa", "Approved/Issued")}
        />
        <button onClick={() => setView("notifications")} className="text-left">
          <StatCard
            icon={<Bell className="text-rose-500" size={20} />}
            label={L("Arifa", "Notifications")}
            value={String(unreadCount)}
            description={L("Hazijasomwa", "Unread")}
          />
        </button>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          {
            icon: Plus,
            color: "emerald",
            sw: "Omba Huduma",
            en: "Apply for Service",
            view: "services" as ViewName,
          },
          {
            icon: FileText,
            color: "blue",
            sw: "Maombi Yangu",
            en: "My Applications",
            view: "applications" as ViewName,
          },
          {
            icon: Briefcase,
            color: "stone",
            sw: "Lango la Biashara",
            en: "Business Portal",
            view: "agreement" as ViewName,
          },
          {
            icon: Bell,
            color: "rose",
            sw: "Arifa Zangu",
            en: "My Notifications",
            view: "notifications" as ViewName,
          },
        ].map((action) => {
          const Icon = action.icon;
          const colorClasses: Record<string, { bg: string; icon: string; label: string }> = {
            emerald: {
              bg: "bg-emerald-50 hover:bg-emerald-100 border-emerald-200",
              icon: "text-emerald-600",
              label: "text-emerald-800",
            },
            blue: {
              bg: "bg-blue-50 hover:bg-blue-100 border-blue-200",
              icon: "text-blue-600",
              label: "text-blue-800",
            },
            stone: {
              bg: "bg-stone-50 hover:bg-stone-100 border-stone-200",
              icon: "text-stone-600",
              label: "text-stone-800",
            },
            rose: {
              bg: "bg-rose-50 hover:bg-rose-100 border-rose-200",
              icon: "text-rose-600",
              label: "text-rose-800",
            },
          };
          const c = colorClasses[action.color] ?? colorClasses.stone;
          return (
            <button
              key={action.view}
              onClick={() => setView(action.view)}
              className={`p-4 ${c.bg} border rounded-2xl transition-all text-left group`}
            >
              <Icon
                size={22}
                className={`${c.icon} mb-2 group-hover:scale-110 transition-transform`}
              />
              <p className={`text-sm font-bold ${c.label}`}>
                {lang === "sw" ? action.sw : action.en}
              </p>
            </button>
          );
        })}
      </div>

      {/* Business Role CTA (if no business role yet) */}
      {!hasBizRole && user?.is_verified && (
        <button
          onClick={() => setView("agreement")}
          className="w-full bg-gradient-to-r from-stone-50 to-amber-50 border-2 border-dashed border-stone-300 hover:border-amber-400 rounded-2xl p-5 flex items-center gap-4 text-left transition-all group"
        >
          <div className="w-12 h-12 rounded-2xl bg-amber-100 group-hover:bg-amber-200 flex items-center justify-center shrink-0 transition-colors">
            <Star size={24} className="text-amber-600" />
          </div>
          <div className="flex-1">
            <p className="font-black text-stone-800">
              {L("Kuwa Muuzaji, Mpangishaji, au Dalali", "Become a Seller, Landlord, or Broker")}
            </p>
            <p className="text-xs text-stone-500 mt-0.5">
              {L(
                "Jisajili kufanya biashara kupitia mfumo na kutumia huduma za Makubaliano ya Mauzo na Pango.",
                "Register to do business through the system and use Sales and Rental Agreement services.",
              )}
            </p>
          </div>
          <ArrowRight size={18} className="text-stone-400 group-hover:text-amber-600 shrink-0" />
        </button>
      )}

      {/* Verification Status Widget */}
      <VerificationStatusCard
        user={localUser}
        lang={lang}
        onCompleteProfile={() => setShowProfileModal(true)}
        onUploadId={() => setShowProfileModal(true)}
        onBookVisit={() => setView("profile")}
      />

      {/* Complete Profile Popup */}
      <CompleteProfileModal
        open={showProfileModal}
        user={localUser}
        lang={lang}
        onClose={() => setShowProfileModal(false)}
        onSaved={async (updated) => {
          setLocalUser((prev) => (prev ? { ...prev, ...updated } : prev));
          setShowProfileModal(false);
          await refreshProfile();
        }}
      />

      {/* New Module Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        <div
          onClick={() => setView("my_payments")}
          className={cn(
            "border rounded-2xl p-4 cursor-pointer transition-colors",
            paymentStats.outstanding > 0
              ? "bg-red-50 border-red-100 hover:border-red-300"
              : "bg-emerald-50 border-emerald-100 hover:border-emerald-300",
          )}
        >
          <p className="text-xl font-black text-stone-900">
            {paymentStats.outstanding > 0 ? `TSh ${paymentStats.amount.toLocaleString()}` : "✓"}
          </p>
          <p className="text-xs font-bold text-stone-500 mt-0.5">
            {paymentStats.outstanding > 0
              ? lang === "sw"
                ? `${paymentStats.outstanding} Madeni`
                : `${paymentStats.outstanding} Due`
              : lang === "sw"
                ? "Hakuna Madeni"
                : "No Dues"}
          </p>
        </div>
        <div
          onClick={() => setView("citizen_support")}
          className="bg-blue-50 border border-blue-100 rounded-2xl p-4 cursor-pointer hover:border-blue-300 transition-colors"
        >
          <p className="text-xl font-black text-blue-700">{ticketStats.open}</p>
          <p className="text-xs font-bold text-stone-500 mt-0.5">
            {lang === "sw" ? "Tiketi Wazi" : "Open Tickets"}
          </p>
          <p className="text-[10px] text-stone-400">
            {ticketStats.total} {lang === "sw" ? "jumla" : "total"}
          </p>
        </div>
        <div
          onClick={() => setView("community_reports")}
          className="bg-amber-50 border border-amber-100 rounded-2xl p-4 cursor-pointer hover:border-amber-300 transition-colors"
        >
          <p className="text-xl font-black text-amber-700">{reportStats.open}</p>
          <p className="text-xs font-bold text-stone-500 mt-0.5">
            {lang === "sw" ? "Taarifa Wazi" : "Open Reports"}
          </p>
          <p className="text-[10px] text-stone-400">
            {reportStats.total} {lang === "sw" ? "jumla" : "total"}
          </p>
        </div>
        <div
          onClick={() => setView("announcements")}
          className="bg-emerald-50 border border-emerald-100 rounded-2xl p-4 cursor-pointer hover:border-emerald-300 transition-colors"
        >
          <p className="text-xl font-black text-emerald-700">{announcementCount}</p>
          <p className="text-xs font-bold text-stone-500 mt-0.5">
            {lang === "sw" ? "Matangazo" : "Announcements"}
          </p>
        </div>
      </div>

      {/* Recent Applications */}
      <div className="bg-white rounded-2xl border border-stone-200 overflow-hidden">
        <div className="px-5 py-4 border-b border-stone-100 flex items-center justify-between">
          <h2 className="font-black text-stone-900 text-sm">
            {L("Maombi ya Hivi Karibuni", "Recent Applications")}
          </h2>
          {total > 5 && (
            <button
              onClick={() => setView("applications")}
              className="text-xs font-bold text-emerald-600 hover:text-emerald-700 flex items-center gap-1"
            >
              {L("Ona Yote", "View All")} <ArrowRight size={12} />
            </button>
          )}
        </div>
        {recent.length === 0 ? (
          <div className="p-8 text-center">
            <FileText size={40} className="mx-auto text-stone-300 mb-3" />
            <p className="font-bold text-stone-600 text-sm">
              {L("Bado huna maombi yoyote", "No applications yet")}
            </p>
            <p className="text-xs text-stone-400 mt-1">
              {L('Bonyeza "Omba Huduma" kuanza', 'Click "Apply for Service" to get started')}
            </p>
            <button
              onClick={() => setView("services")}
              className="mt-4 px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-sm inline-flex items-center gap-1.5"
            >
              <Plus size={14} /> {L("Omba Sasa", "Apply Now")}
            </button>
          </div>
        ) : (
          <div className="divide-y divide-stone-50">
            {recent.map((app) => {
              const icons: Record<string, string> = {
                "Utambulisho wa Mkazi": "🪪",
                "Kibari cha Mazishi": "🕊",
                "Kibari cha Sherehe": "🎉",
                "Kibari cha Ujezi Mdogo": "🏗",
                "Barua ya Utambulisho": "📝",
                "Makubaliano ya Mauzo": "🤝",
                "Makubaliano ya Pango": "🔑",
                "Malipo na Michango": "💰",
                "Migogoro na Mashauri": "⚖",
              };
              const icon = icons[app.service_name] || "📋";
              return (
                <div
                  key={app.id}
                  onClick={() => setSelectedDashApp(app)}
                  className="px-5 py-3.5 hover:bg-stone-50 cursor-pointer transition-colors flex items-center gap-3"
                >
                  <div className="w-9 h-9 rounded-xl bg-stone-100 flex items-center justify-center text-base shrink-0">
                    {icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-stone-800 truncate">{app.service_name}</p>
                    <p className="text-xs text-stone-400 font-mono">{app.application_number}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <StatusBadge status={app.status} lang={lang} />
                    <p className="text-[10px] text-stone-400 mt-1">
                      {new Date(app.created_at).toLocaleDateString(
                        lang === "sw" ? "sw-TZ" : "en-US",
                        { day: "numeric", month: "short" },
                      )}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </motion.div>
  );
}

export default Dashboard;
