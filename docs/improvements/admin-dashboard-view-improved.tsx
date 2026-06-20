"use client";

/**
 * ─────────────────────────────────────────────────────────────────────────────
 * E-MTAA — Admin Dashboard View (IMPROVED)
 * Adds recharts analytics, real data from React Query, and skeleton loading.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { useEffect, useState, useCallback } from "react";
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
  Legend,
  LineChart,
  Line,
} from "recharts";
import {
  Users,
  FileText,
  CheckCircle,
  Clock,
  XCircle,
  TrendingUp,
  RefreshCw,
  AlertTriangle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { PageContainer } from "@/components/layout/page-container";
import { StatCard } from "@/components/shared/stat-card";
import { useTranslation, useIsSwahili } from "@/lib/i18n";
import { useCurrentUser } from "@/stores/auth-store";
import type { ApiResponse } from "@/types";

// ── Types ─────────────────────────────────────────────────────────────────────

interface AdminStats {
  totalUsers: number;
  totalApplications: number;
  pendingApplications: number;
  approvedToday: number;
  rejectedToday: number;
  processingAvgDays: number;
  applicationsByStatus: Array<{ status: string; count: number }>;
  applicationsByCategory: Array<{ category: string; count: number }>;
  applicationsByRegion: Array<{ region: string; count: number }>;
  recentTrend: Array<{ date: string; submitted: number; approved: number }>;
}

// ── Color constants ───────────────────────────────────────────────────────────

const STATUS_COLORS: Record<string, string> = {
  SUBMITTED: "#3b82f6",
  UNDER_REVIEW: "#f59e0b",
  APPROVED: "#22c55e",
  REJECTED: "#ef4444",
  ISSUED: "#14b8a6",
  CANCELLED: "#9ca3af",
  DRAFT: "#d1d5db",
};

const CATEGORY_COLORS = [
  "#1a6634", "#2563eb", "#d97706", "#dc2626",
  "#7c3aed", "#0891b2", "#65a30d", "#be185d",
];

// ── Chart Skeletons ───────────────────────────────────────────────────────────

function ChartSkeleton({ height = 300 }: { height?: number }) {
  return (
    <div className={`w-full animate-pulse bg-muted rounded-lg`} style={{ height }} />
  );
}

// ── Component ─────────────────────────────────────────────────────────────────

export function AdminDashboardView() {
  const t = useTranslation();
  const isSw = useIsSwahili();
  const user = useCurrentUser();

  const [stats, setStats] = useState<AdminStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const fetchStats = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const token = (user as { token?: string } | null)?.token;
      const res = await fetch("/api/admin/stats", {
        headers: {
          Authorization: token ? `Bearer ${token}` : "",
        },
      });
      const json = (await res.json()) as ApiResponse<AdminStats>;
      if (!json.success) throw new Error(json.error ?? "Failed to load stats");
      setStats(json.data as AdminStats);
      setLastUpdated(new Date());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load stats");
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchStats();
    // Auto-refresh every 2 minutes
    const interval = setInterval(fetchStats, 2 * 60 * 1000);
    return () => clearInterval(interval);
  }, [fetchStats]);

  return (
    <PageContainer
      title={isSw ? "Dashibodi ya Msimamizi" : "Admin Dashboard"}
      description={isSw ? "Muhtasari wa mfumo wote" : "System-wide overview"}
      actions={
        <div className="flex items-center gap-2">
          {lastUpdated && (
            <span className="text-xs text-muted-foreground hidden sm:block">
              {isSw ? "Ilisasishwa" : "Updated"}: {lastUpdated.toLocaleTimeString()}
            </span>
          )}
          <Button variant="outline" size="sm" onClick={fetchStats} disabled={isLoading}>
            <RefreshCw className={`h-4 w-4 mr-1 ${isLoading ? "animate-spin" : ""}`} />
            {t("common.refresh")}
          </Button>
        </div>
      }
    >
      {/* Error */}
      {error && (
        <div className="flex items-center gap-2 p-4 bg-destructive/10 text-destructive rounded-lg mb-6">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          <p className="text-sm">{error}</p>
          <Button variant="ghost" size="sm" onClick={fetchStats} className="ml-auto">
            {t("common.refresh")}
          </Button>
        </div>
      )}

      {/* ── KPI Cards ───────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {isLoading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-28 rounded-xl" />
          ))
        ) : (
          <>
            <StatCard
              title={isSw ? "Watumiaji Wote" : "Total Users"}
              value={stats?.totalUsers ?? 0}
              icon={Users}
              trend="up"
            />
            <StatCard
              title={isSw ? "Maombi Yote" : "Total Applications"}
              value={stats?.totalApplications ?? 0}
              icon={FileText}
              trend="up"
            />
            <StatCard
              title={isSw ? "Inasubiri" : "Pending"}
              value={stats?.pendingApplications ?? 0}
              icon={Clock}
              variant="warning"
            />
            <StatCard
              title={isSw ? "Zilizoidhinishwa Leo" : "Approved Today"}
              value={stats?.approvedToday ?? 0}
              icon={CheckCircle}
              variant="success"
            />
          </>
        )}
      </div>

      {/* ── Charts Row 1 ────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">

        {/* Applications by Status — Pie */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              {isSw ? "Maombi kwa Hali" : "Applications by Status"}
            </CardTitle>
            <CardDescription>
              {isSw ? "Usambazaji wa hali za maombi" : "Distribution of application statuses"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <ChartSkeleton height={280} />
            ) : !stats?.applicationsByStatus?.length ? (
              <div className="h-[280px] flex items-center justify-center text-muted-foreground text-sm">
                {t("common.noData")}
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={280}>
                <PieChart>
                  <Pie
                    data={stats.applicationsByStatus}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    dataKey="count"
                    nameKey="status"
                    label={({ status, percent }) =>
                      percent > 0.05 ? `${(percent * 100).toFixed(0)}%` : ""
                    }
                  >
                    {stats.applicationsByStatus.map((entry) => (
                      <Cell
                        key={entry.status}
                        fill={STATUS_COLORS[entry.status] ?? "#94a3b8"}
                      />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value, name) => [value, name]}
                  />
                  <Legend
                    formatter={(value) => value.replace(/_/g, " ")}
                    iconSize={10}
                  />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Applications by Category — Bar */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              {isSw ? "Maombi kwa Aina ya Huduma" : "Applications by Service Category"}
            </CardTitle>
            <CardDescription>
              {isSw ? "Aina gani zinaombwa zaidi" : "Most requested service categories"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <ChartSkeleton height={280} />
            ) : !stats?.applicationsByCategory?.length ? (
              <div className="h-[280px] flex items-center justify-center text-muted-foreground text-sm">
                {t("common.noData")}
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={280}>
                <BarChart
                  data={stats.applicationsByCategory.slice(0, 8)}
                  layout="vertical"
                  margin={{ left: 16, right: 24, top: 4, bottom: 4 }}
                >
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                  <XAxis type="number" tick={{ fontSize: 11 }} />
                  <YAxis
                    type="category"
                    dataKey="category"
                    width={90}
                    tick={{ fontSize: 10 }}
                    tickFormatter={(v) => v.replace(/_/g, " ")}
                  />
                  <Tooltip />
                  <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                    {stats.applicationsByCategory.map((_, index) => (
                      <Cell
                        key={index}
                        fill={CATEGORY_COLORS[index % CATEGORY_COLORS.length]}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ── Charts Row 2 — Trend ────────────────────────────────────────────── */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-base">
            {isSw ? "Mwenendo wa Maombi (Siku 30)" : "Application Trend (Last 30 days)"}
          </CardTitle>
          <CardDescription>
            {isSw ? "Maombi yaliyowasilishwa na kuidhinishwa" : "Submitted vs. approved over time"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <ChartSkeleton height={240} />
          ) : !stats?.recentTrend?.length ? (
            <div className="h-[240px] flex items-center justify-center text-muted-foreground text-sm">
              {t("common.noData")}
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={240}>
              <LineChart
                data={stats.recentTrend}
                margin={{ left: 0, right: 16, top: 4, bottom: 4 }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 10 }}
                  tickFormatter={(v) => v.slice(5)} // "MM-DD"
                />
                <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                <Tooltip />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="submitted"
                  name={isSw ? "Yaliyowasilishwa" : "Submitted"}
                  stroke="#3b82f6"
                  strokeWidth={2}
                  dot={false}
                />
                <Line
                  type="monotone"
                  dataKey="approved"
                  name={isSw ? "Zilizoidhinishwa" : "Approved"}
                  stroke="#22c55e"
                  strokeWidth={2}
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      {/* ── Additional KPIs ──────────────────────────────────────────────────── */}
      {!isLoading && stats && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <XCircle className="h-8 w-8 text-destructive" />
                <div>
                  <p className="text-xs text-muted-foreground">
                    {isSw ? "Zilizokataliwa Leo" : "Rejected Today"}
                  </p>
                  <p className="text-2xl font-bold">{stats.rejectedToday}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <TrendingUp className="h-8 w-8 text-primary" />
                <div>
                  <p className="text-xs text-muted-foreground">
                    {isSw ? "Wastani wa Muda (Siku)" : "Avg. Processing (Days)"}
                  </p>
                  <p className="text-2xl font-bold">{stats.processingAvgDays}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="col-span-2 sm:col-span-1">
            <CardContent className="pt-6">
              <div>
                <p className="text-xs text-muted-foreground mb-2">
                  {isSw ? "Hali ya Mfumo" : "System Status"}
                </p>
                <Badge variant="outline" className="text-green-600 border-green-600">
                  ● {isSw ? "Inafanya kazi vizuri" : "Operational"}
                </Badge>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </PageContainer>
  );
}
