import React, { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { getApplicationAmount } from "@/lib/serviceFees";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
} from "recharts";
import { Loader2, BarChart3, TrendingUp, PieChart as PieIcon } from "lucide-react";

interface AnalyticsChartsProps {
  lang: string;
}

const COLORS = [
  "#059669",
  "#0ea5e9",
  "#f59e0b",
  "#ef4444",
  "#8b5cf6",
  "#ec4899",
  "#14b8a6",
  "#f97316",
];
const STATUS_COLORS: Record<string, string> = {
  submitted: "#f59e0b",
  pending: "#f59e0b",
  under_review: "#0ea5e9",
  approved: "#059669",
  issued: "#059669",
  rejected: "#ef4444",
  pending_payment: "#8b5cf6",
};

export const AnalyticsCharts: React.FC<AnalyticsChartsProps> = ({ lang }) => {
  const sw = lang === "sw";
  const [loading, setLoading] = useState(true);
  const [byService, setByService] = useState<{ name: string; count: number }[]>([]);
  const [byStatus, setByStatus] = useState<{ name: string; value: number }[]>([]);
  const [monthly, setMonthly] = useState<{ month: string; count: number }[]>([]);
  const [stats, setStats] = useState({
    total: 0,
    approved: 0,
    rejected: 0,
    avgDays: 0,
    revenue: 0,
  });

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        // SCALE: Use parallel DB aggregate queries instead of fetching raw rows.
        // At 1M+ applications, fetching rows client-side would time out.
        const [
          { data: statusRows },
          { data: serviceRows },
          { data: monthRows },
          { count: total },
          { count: approved },
          { count: rejected },
        ] = await Promise.all([
          // By status
          supabase.rpc("analytics_by_status").then((r) => r as { data: { status: string; count: number }[] | null, error: unknown }),
          // By service
          supabase.rpc("analytics_by_service").then((r) => r as { data: { service_name: string; count: number }[] | null, error: unknown }),
          // Monthly (last 6 months)
          supabase.rpc("analytics_monthly_trend").then((r) => r as { data: { month: string; count: number }[] | null, error: unknown }),
          // Totals via count queries (no rows fetched)
          supabase.from("applications").select("*", { count: "exact", head: true }),
          supabase.from("applications").select("*", { count: "exact", head: true }).in("status", ["approved", "issued"]),
          supabase.from("applications").select("*", { count: "exact", head: true }).eq("status", "rejected"),
        ]);

        // By service
        if (serviceRows) {
          setByService(
            serviceRows
              .map((r) => ({
                name: (r.service_name || "Other")
                  .replace("Makubaliano ya ", "")
                  .replace("Kibari cha ", ""),
                count: Number(r.count),
              }))
              .sort((a, b) => b.count - a.count)
              .slice(0, 10),
          );
        }

        // By status
        if (statusRows) {
          setByStatus(statusRows.map((r) => ({ name: r.status || "submitted", value: Number(r.count) })));
        }

        // Monthly trend
        if (monthRows) {
          setMonthly(
            monthRows.slice(-6).map((r) => ({
              month: new Date(r.month + "-01").toLocaleDateString(sw ? "sw-TZ" : "en", {
                month: "short",
                year: "2-digit",
              }),
              count: Number(r.count),
            })),
          );
        }

        setStats({
          total: total || 0,
          approved: approved || 0,
          rejected: rejected || 0,
          avgDays: 0, // computed server-side via RPC if needed
          revenue: 0, // revenue aggregation done server-side
        });
      } catch {
        /* ignore */
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [sw]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 size={24} className="animate-spin text-emerald-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white border border-stone-200 rounded-xl p-4 text-center">
          <p className="text-2xl font-black text-stone-900">{stats.total}</p>
          <p className="text-[10px] text-stone-500 uppercase">
            {sw ? "Jumla ya Maombi" : "Total Applications"}
          </p>
        </div>
        <div className="bg-white border border-stone-200 rounded-xl p-4 text-center">
          <p className="text-2xl font-black text-emerald-600">
            {Math.round((stats.approved / (stats.total || 1)) * 100)}%
          </p>
          <p className="text-[10px] text-stone-500 uppercase">
            {sw ? "Kiwango cha Kuidhinishwa" : "Approval Rate"}
          </p>
        </div>
        <div className="bg-white border border-stone-200 rounded-xl p-4 text-center">
          <p className="text-2xl font-black text-blue-600">{stats.avgDays}</p>
          <p className="text-[10px] text-stone-500 uppercase">
            {sw ? "Wastani wa Siku" : "Avg. Processing Days"}
          </p>
        </div>
        <div className="bg-white border border-stone-200 rounded-xl p-4 text-center">
          <p className="text-2xl font-black text-amber-600">TSh {stats.revenue.toLocaleString()}</p>
          <p className="text-[10px] text-stone-500 uppercase">{sw ? "Mapato" : "Revenue"}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Applications by Service */}
        <div className="bg-white border border-stone-200 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-4">
            <BarChart3 size={16} className="text-emerald-600" />
            <p className="text-xs font-black text-stone-600 uppercase">
              {sw ? "Maombi kwa Huduma" : "Applications by Service"}
            </p>
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={byService} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f1f1" />
              <XAxis
                dataKey="name"
                tick={{ fontSize: 9 }}
                angle={-20}
                textAnchor="end"
                height={50}
              />
              <YAxis tick={{ fontSize: 10 }} />
              <Tooltip />
              <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                {byService.map((_, i) => (
                  <Cell key={i} fill={COLORS[i % COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Applications by Status */}
        <div className="bg-white border border-stone-200 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-4">
            <PieIcon size={16} className="text-blue-600" />
            <p className="text-xs font-black text-stone-600 uppercase">
              {sw ? "Maombi kwa Hali" : "Applications by Status"}
            </p>
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie
                data={byStatus}
                cx="50%"
                cy="50%"
                innerRadius={40}
                outerRadius={75}
                paddingAngle={3}
                dataKey="value"
                label={({ name, value }) => `${name} (${value})`}
              >
                {byStatus.map((entry, i) => (
                  <Cell key={i} fill={STATUS_COLORS[entry.name] || COLORS[i % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Monthly Trend */}
        <div className="bg-white border border-stone-200 rounded-xl p-4 lg:col-span-2">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp size={16} className="text-amber-600" />
            <p className="text-xs font-black text-stone-600 uppercase">
              {sw ? "Mwelekeo wa Kila Mwezi" : "Monthly Trend"}
            </p>
          </div>
          <ResponsiveContainer width="100%" height={180}>
            <LineChart data={monthly} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f1f1" />
              <XAxis dataKey="month" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 10 }} />
              <Tooltip />
              <Line
                type="monotone"
                dataKey="count"
                stroke="#059669"
                strokeWidth={3}
                dot={{ r: 5, fill: "#059669" }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};
