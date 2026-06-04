import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  FileText,
  Clock,
  CheckCircle,
  AlertCircle,
  TrendingUp,
  UserCheck,
  HelpCircle,
  Building2,
  Loader2,
  RefreshCw,
  Search,
} from "lucide-react";
import { supabase, Application } from "@/lib/supabase";
import { IS_SUPABASE_CONFIGURED } from "@/lib/config";
import { useAuth } from "@/context/AuthContext";
import { useLanguage } from "@/context/LanguageContext";
import { StatCard } from "@/components/ui/StatCard";
import { StatusBadge } from "@/components/ui/StatusBadge";

interface StaffDashboardProps {
  setView: (view: string) => void;
}

export function StaffDashboard({ setView }: StaffDashboardProps) {
  const { user } = useAuth();
  const { lang } = useLanguage();
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    pending: 0,
    paid: 0,
    returned: 0,
    approved: 0,
    total: 0,
    pendingBusiness: 0, // Pending business registration applications
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch stats
      const isConfigured = IS_SUPABASE_CONFIGURED;

      if (!isConfigured || user?.id.startsWith("demo-")) {
        const demoApps = JSON.parse(localStorage.getItem("demo_applications") || "[]");

        // Filter by location if staff has assigned region/district
        const filteredApps = demoApps.filter((app: Application) => {
          if (["staff", "admin"].includes(user?.role || "")) {
            if (user?.assigned_district && app.district !== user.assigned_district) return false;
            if (user?.assigned_region && app.region !== user.assigned_region) return false;
          }
          return true;
        });

        setStats({
          pending: filteredApps.filter(
            (a: import("@/lib/supabase").Application) =>
              a.status === "submitted" || a.status === "pending_review",
          ).length,
          paid: filteredApps.filter(
            (a: import("@/lib/supabase").Application) => a.status === "paid",
          ).length,
          returned: filteredApps.filter(
            (a: import("@/lib/supabase").Application) => a.status === "returned",
          ).length,
          approved: filteredApps.filter(
            (a: import("@/lib/supabase").Application) =>
              a.status === "approved" || a.status === "issued",
          ).length,
          total: filteredApps.length,
          pendingBusiness: 0,
        });

        setApplications(
          filteredApps.slice(0, 10).map((app: Application) => ({
            ...app,
            services: { name: app.service_name || "Service" },
            users: { first_name: "Demo", last_name: "User" }, // Mock user data for demo
          })),
        );
        setLoading(false);
        return;
      }
      let statsQuery = supabase.from("applications").select("status", { count: "exact" });

      if (["staff", "admin"].includes(user?.role || "")) {
        if (user?.assigned_district) {
          statsQuery = statsQuery.eq("district", user.assigned_district);
        } else if (user?.assigned_region) {
          statsQuery = statsQuery.eq("region", user.assigned_region);
        }
      }

      const { data: allApps, error: statsError } = await statsQuery;

      // Also fetch pending business registrations count
      const { count: pendingBusinessCount } = await supabase
        .from("business_registrations")
        .select("id", { count: "exact", head: true })
        .eq("status", "pending");

      if (allApps) {
        setStats({
          pending: allApps.filter((a) => a.status === "submitted" || a.status === "pending_review")
            .length,
          paid: allApps.filter((a) => a.status === "paid").length,
          returned: allApps.filter((a) => a.status === "returned").length,
          approved: allApps.filter((a) => a.status === "approved" || a.status === "issued").length,
          total: allApps.length,
          pendingBusiness: pendingBusinessCount || 0,
        });
      }

      // Fetch recent applications (without service join to avoid empty results)
      let query = supabase
        .from("applications")
        .select("*")
        .order("created_at", { ascending: false });

      // Only filter by location if assigned - otherwise, staff can see all (small mtaa)
      if (["staff", "admin"].includes(user?.role || "")) {
        if (user?.assigned_district) {
          query = query.eq("district", user.assigned_district);
        } else if (user?.assigned_region) {
          query = query.eq("region", user.assigned_region);
        } else {
          // no region filter applied for this user role
        }
      }

      const { data, error } = await query.limit(10);

      if (!error && data) {
        setApplications(data);
      } else if (error) {
        console.error("Error fetching applications:", error);
      }
    } catch (error) {
      console.error("Error fetching staff dashboard data:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-8"
    >
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-black text-stone-900 tracking-tight">
            {lang === "sw" ? "Dashibodi ya Mtumishi" : "Staff Dashboard"}
          </h1>
          <p className="text-stone-500 font-medium">
            {lang === "sw"
              ? `Karibu, ${user?.first_name}. Ofisi: ${user?.assigned_district || user?.assigned_region || "Makao Makuu"}`
              : `Welcome, ${user?.first_name}. Office: ${user?.assigned_district || user?.assigned_region || "Headquarters"}`}
          </p>
        </div>
        <div className="flex gap-3">
          <div className="bg-emerald-50 text-emerald-600 px-4 py-2 rounded-xl font-bold text-sm flex items-center gap-2 border border-emerald-100">
            <TrendingUp size={16} />
            {lang === "sw" ? "Hali: Mtandaoni" : "Status: Online"}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
        <StatCard
          icon={<Clock className="text-blue-500" />}
          label={lang === "sw" ? "Maombi Mapya" : "New Applications"}
          value={stats.pending}
        />
        <StatCard
          icon={<AlertCircle className="text-amber-500" />}
          label={lang === "sw" ? "Zilizolipwa" : "Paid Applications"}
          value={stats.paid}
        />
        <StatCard
          icon={<RefreshCw className="text-orange-500" />}
          label={lang === "sw" ? "Zilizorudishwa" : "Returned"}
          value={stats.returned}
        />
        <StatCard
          icon={<CheckCircle className="text-emerald-500" />}
          label={lang === "sw" ? "Zilizoidhinishwa" : "Approved"}
          value={stats.approved}
        />
        <StatCard
          icon={<FileText className="text-stone-500" />}
          label={lang === "sw" ? "Jumla ya Maombi" : "Total Handled"}
          value={stats.total}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 bg-white rounded-4xl border border-stone-100 shadow-xl overflow-hidden">
          <div className="px-8 py-6 border-b border-stone-100 flex items-center justify-between">
            <h3 className="text-xl font-bold text-stone-900">
              {lang === "sw" ? "Maombi ya Karibuni" : "Recent Applications"}
            </h3>
            <button
              onClick={() => setView("application_review")}
              className="text-sm font-bold text-emerald-600 hover:underline"
            >
              {lang === "sw" ? "Tazama Yote" : "View All"}
            </button>
          </div>
          <div className="divide-y divide-stone-50">
            {loading ? (
              <div className="p-12 text-center">
                <Loader2 className="animate-spin mx-auto text-emerald-600 mb-2" />
                <p className="text-stone-400 font-bold">
                  {lang === "sw" ? "Inapakia..." : "Loading..."}
                </p>
              </div>
            ) : applications.length === 0 ? (
              <div className="p-12 text-center text-stone-400 font-bold">
                {lang === "sw" ? "Hakuna maombi mapya." : "No new applications."}
              </div>
            ) : (
              applications.map((app) => (
                <div
                  key={app.id}
                  onClick={() => setView("application_review")}
                  className="px-8 py-4 flex items-center justify-between hover:bg-stone-50 transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl bg-stone-100 flex items-center justify-center text-stone-500">
                      <FileText size={20} />
                    </div>
                    <div>
                      <p className="font-bold text-stone-900">{app.services?.name}</p>
                      <p className="text-xs text-stone-400 font-medium">
                        {app.users?.first_name} {app.users?.last_name} •{" "}
                        {app.application_number}
                      </p>
                    </div>
                  </div>
                  <StatusBadge status={app.status} lang={lang} />
                </div>
              ))
            )}
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-stone-900 rounded-4xl p-8 text-white relative overflow-hidden shadow-xl">
            <h3 className="text-xl font-bold mb-6 flex items-center gap-2">
              <UserCheck size={20} className="text-emerald-400" />
              {lang === "sw" ? "Njia za Mkato" : "Quick Access"}
            </h3>
            <div className="space-y-3 relative z-10">
              <button
                onClick={() => setView("customer_support")}
                className="w-full p-4 bg-white/10 backdrop-blur-md rounded-2xl border border-white/20 hover:bg-white/20 transition-all flex items-center gap-3"
              >
                <div className="w-10 h-10 rounded-xl bg-emerald-500/20 flex items-center justify-center text-emerald-400">
                  <HelpCircle size={20} />
                </div>
                <div className="text-left">
                  <p className="text-sm font-bold">
                    {lang === "sw" ? "Huduma kwa Wateja" : "Customer Support"}
                  </p>
                  <p className="text-[10px] text-white/60 uppercase tracking-widest font-bold">
                    {lang === "sw" ? "Tafuta Maombi" : "Search Applications"}
                  </p>
                </div>
              </button>
              <button
                onClick={() => setView("manual_verification")}
                className="w-full p-4 bg-white/10 backdrop-blur-md rounded-2xl border border-white/20 hover:bg-white/20 transition-all flex items-center gap-3"
              >
                <div className="w-10 h-10 rounded-xl bg-blue-500/20 flex items-center justify-center text-blue-400">
                  <UserCheck size={20} />
                </div>
                <div className="text-left">
                  <p className="text-sm font-bold">
                    {lang === "sw" ? "Uhakiki wa Mwongozo" : "Manual Verification"}
                  </p>
                  <p className="text-[10px] text-white/60 uppercase tracking-widest font-bold">
                    {lang === "sw" ? "Thibitisha Raia" : "Verify Citizen"}
                  </p>
                </div>
              </button>
              <button
                onClick={() => setView("business_approval")}
                className="w-full p-4 bg-white/10 backdrop-blur-md rounded-2xl border border-white/20 hover:bg-white/20 transition-all flex items-center gap-3 relative"
              >
                <div className="w-10 h-10 rounded-xl bg-purple-500/20 flex items-center justify-center text-purple-300">
                  <Building2 size={20} />
                </div>
                <div className="text-left flex-1">
                  <p className="text-sm font-bold">
                    {lang === "sw" ? "Idhini ya Biashara" : "Business Approval"}
                  </p>
                  <p className="text-[10px] text-white/60 uppercase tracking-widest font-bold">
                    {lang === "sw" ? "Wauzaji, Mpangishaji, Dalali" : "Sellers, Landlords, Brokers"}
                  </p>
                </div>
                {stats.pendingBusiness > 0 && (
                  <span className="absolute top-2 right-2 bg-amber-500 text-white text-[10px] font-black px-2 py-0.5 rounded-full shadow-lg animate-pulse">
                    {stats.pendingBusiness}
                  </span>
                )}
              </button>
              <button
                onClick={() => setView("verify_documents")}
                className="w-full p-4 bg-white/10 backdrop-blur-md rounded-2xl border border-white/20 hover:bg-white/20 transition-all flex items-center gap-3"
              >
                <div className="w-10 h-10 rounded-xl bg-indigo-500/20 flex items-center justify-center text-indigo-400">
                  <Search size={20} />
                </div>
                <div className="text-left">
                  <p className="text-sm font-bold">
                    {lang === "sw" ? "Hakiki Hati" : "Verify Documents"}
                  </p>
                  <p className="text-[10px] text-white/60 uppercase tracking-widest font-bold">
                    {lang === "sw" ? "Thibitisha Uhalali" : "Verify Authenticity"}
                  </p>
                </div>
              </button>
            </div>
            <Building2 className="absolute -right-7.5 -bottom-7.5 h-48 w-48 text-white/5 rotate-12" />
          </div>
        </div>
      </div>
    </motion.div>
  );
}
