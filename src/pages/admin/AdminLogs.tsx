import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Activity,
  Search,
  Filter,
  Download,
  Clock,
  AlertCircle,
  FileText,
  X,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  AlertTriangle,
  Info,
  Terminal,
  Globe,
  Smartphone,
  Laptop,
  Eye,
  RefreshCw,
  Copy,
  Printer,
  Loader2,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useLanguage } from "@/context/LanguageContext";
import { useToast } from "@/context/ToastContext";
import { cn } from "@/lib/utils";

interface ActivityLog {
  id: string;
  user_id: string;
  action: string;
  action_type:
    | "create"
    | "update"
    | "delete"
    | "view"
    | "login"
    | "logout"
    | "payment"
    | "approve"
    | "reject"
    | "other";
  details: string | Record<string, unknown> | null;
  ip_address?: string;
  user_agent?: string;
  device_type?: "desktop" | "mobile" | "tablet" | "unknown";
  severity: "info" | "warning" | "error" | "critical";
  status: "success" | "pending" | "failed";
  resource_type?: string;
  resource_id?: string;
  created_at: string;
  users?: {
    id: string;
    first_name: string;
    last_name: string;
    email: string;
    role: string;
  };
}

interface LogStats {
  totalLogs: number;
  infoCount: number;
  warningCount: number;
  errorCount: number;
  criticalCount: number;
  uniqueUsers: number;
  topActions: { action: string; count: number }[];
  logsByHour: { hour: number; count: number }[];
}

interface FilterOptions {
  search: string;
  severity: string[];
  actionType: string[];
  userRole: string[];
  dateRange: {
    start: Date | null;
    end: Date | null;
  };
  userId: string | null;
  resourceType: string | null;
  status: string[];
}

const SEVERITY_COLORS = {
  info: "bg-blue-50 text-blue-600 border-blue-100",
  warning: "bg-amber-50 text-amber-600 border-amber-100",
  error: "bg-red-50 text-red-600 border-red-100",
  critical: "bg-purple-50 text-purple-600 border-purple-100",
};

const ACTION_TYPE_COLORS = {
  create: "bg-emerald-50 text-emerald-600",
  update: "bg-blue-50 text-blue-600",
  delete: "bg-red-50 text-red-600",
  view: "bg-stone-50 text-stone-600",
  login: "bg-green-50 text-green-600",
  logout: "bg-stone-50 text-stone-600",
  payment: "bg-amber-50 text-amber-600",
  approve: "bg-emerald-50 text-emerald-600",
  reject: "bg-red-50 text-red-600",
  other: "bg-stone-50 text-stone-600",
};

const STATUS_COLORS = {
  success: "bg-emerald-50 text-emerald-600",
  pending: "bg-amber-50 text-amber-600",
  failed: "bg-red-50 text-red-600",
};

export function AdminLogs() {
  const { lang } = useLanguage();
  const { showToast } = useToast();

  // State management
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [filteredLogs, setFilteredLogs] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [streaming, setStreaming] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [selectedLog, setSelectedLog] = useState<ActivityLog | null>(null);
  const [stats, setStats] = useState<LogStats>({
    totalLogs: 0,
    infoCount: 0,
    warningCount: 0,
    errorCount: 0,
    criticalCount: 0,
    uniqueUsers: 0,
    topActions: [],
    logsByHour: [],
  });

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(50);
  const [totalPages, setTotalPages] = useState(1);

  // Filters
  const [filters, setFilters] = useState<FilterOptions>({
    search: "",
    severity: [],
    actionType: [],
    userRole: [],
    dateRange: {
      start: null,
      end: null,
    },
    userId: null,
    resourceType: null,
    status: [],
  });

  // Auto-refresh
  const [autoRefresh, setAutoRefresh] = useState(false);
  const refreshInterval = useRef<NodeJS.Timeout | undefined>(undefined);

  const uniqueUsers = useMemo(() => {
    const users = new Map();
    logs.forEach((log) => {
      if (log.users) {
        users.set(log.users.id, log.users);
      }
    });
    return Array.from(users.values());
  }, [logs]);

  const uniqueResourceTypes = useMemo(() => {
    const types = new Set();
    logs.forEach((log) => {
      if (log.resource_type) {
        types.add(log.resource_type);
      }
    });
    return Array.from(types);
  }, [logs]);

  // Data fetching
  const fetchLogs = useCallback(
    async (page = currentPage) => {
      setLoading(true);
      try {
        let query = supabase.from("activity_logs").select(
          `
          *,
          users:user_id (
            id,
            first_name,
            last_name,
            email,
            role
          )
        `,
          { count: "exact" },
        );

        // Apply filters
        if (filters.search) {
          query = query.or(`
          action.ilike.%${filters.search}%,
          details.ilike.%${filters.search}%,
          users.first_name.ilike.%${filters.search}%,
          users.last_name.ilike.%${filters.search}%,
          users.email.ilike.%${filters.search}%
        `);
        }

        if (filters.severity.length > 0) {
          query = query.in("severity", filters.severity);
        }

        if (filters.actionType.length > 0) {
          query = query.in("action_type", filters.actionType);
        }

        if (filters.status.length > 0) {
          query = query.in("status", filters.status);
        }

        if (filters.userId) {
          query = query.eq("user_id", filters.userId);
        }

        if (filters.resourceType) {
          query = query.eq("resource_type", filters.resourceType);
        }

        if (filters.dateRange.start) {
          query = query.gte("created_at", filters.dateRange.start.toISOString());
        }

        if (filters.dateRange.end) {
          query = query.lte("created_at", filters.dateRange.end.toISOString());
        }

        // Apply role filter through users table
        if (filters.userRole.length > 0) {
          // This would need a more complex query with join filtering
          // For now, we'll fetch and filter client-side
        }

        // Pagination
        const from = (page - 1) * itemsPerPage;
        const to = from + itemsPerPage - 1;

        const { data, error, count } = await query
          .order("created_at", { ascending: false })
          .range(from, to);

        if (error) throw error;

        if (data) {
          setLogs(data as ActivityLog[]);
          setTotalPages(Math.ceil((count || 0) / itemsPerPage));
          calculateStats(data as ActivityLog[]);
        }
      } catch (error) {
        console.error("Error fetching logs:", error);
        showToast(lang === "sw" ? "Hitilafu kupakia kumbukumbu" : "Error loading logs", "error");
        setLogs([]);
        calculateStats([]);
      } finally {
        setLoading(false);
      }
    },
    [filters, currentPage, itemsPerPage, lang, showToast],
  );

  const calculateStats = (logsData: ActivityLog[]) => {
    const stats: LogStats = {
      totalLogs: logsData.length,
      infoCount: logsData.filter((l) => l.severity === "info").length,
      warningCount: logsData.filter((l) => l.severity === "warning").length,
      errorCount: logsData.filter((l) => l.severity === "error").length,
      criticalCount: logsData.filter((l) => l.severity === "critical").length,
      uniqueUsers: new Set(logsData.map((l) => l.user_id)).size,
      topActions: [],
      logsByHour: [],
    };

    // Calculate top actions
    const actionCounts = new Map();
    logsData.forEach((log) => {
      actionCounts.set(log.action, (actionCounts.get(log.action) || 0) + 1);
    });
    stats.topActions = Array.from(actionCounts.entries())
      .map(([action, count]) => ({ action, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    // Calculate logs by hour
    const hourCounts = new Array(24).fill(0);
    logsData.forEach((log) => {
      const hour = new Date(log.created_at).getHours();
      hourCounts[hour]++;
    });
    stats.logsByHour = hourCounts.map((count, hour) => ({ hour, count }));

    setStats(stats);
  };

  // Apply client-side filters
  useEffect(() => {
    if (!logs.length) return;

    let filtered = [...logs];

    // Apply role filter (client-side)
    if (filters.userRole.length > 0) {
      filtered = filtered.filter((log) => log.users && filters.userRole.includes(log.users.role));
    }

    setFilteredLogs(filtered);
  }, [logs, filters]);

  // Auto-refresh setup
  useEffect(() => {
    if (autoRefresh) {
      refreshInterval.current = setInterval(() => {
        fetchLogs(1);
      }, 30000); // Refresh every 30 seconds
    }

    return () => {
      if (refreshInterval.current) {
        clearInterval(refreshInterval.current);
      }
    };
  }, [autoRefresh, fetchLogs]);

  // Real-time subscription
  useEffect(() => {
    const subscription = supabase
      .channel("activity-logs")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "activity_logs" },
        (payload) => {
          setStreaming(true);
          // Fetch new log and add to list
          fetchNewLog(payload.new.id);
          setTimeout(() => setStreaming(false), 1000);
        },
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const fetchNewLog = async (logId: string) => {
    try {
      const { data, error } = await supabase
        .from("activity_logs")
        .select(
          `
          *,
          users:user_id (
            id,
            first_name,
            last_name,
            email,
            role
          )
        `,
        )
        .eq("id", logId)
        .single();

      if (error) throw error;

      if (data) {
        setLogs((prev) => [data as ActivityLog, ...prev.slice(0, -1)]);
      }
    } catch (error) {
      console.error("Error fetching new log:", error);
    }
  };

  useEffect(() => {
    fetchLogs(1);
  }, [fetchLogs]);

  // Filter handlers
  const toggleSeverity = (severity: string) => {
    setFilters((prev) => ({
      ...prev,
      severity: prev.severity.includes(severity)
        ? prev.severity.filter((s) => s !== severity)
        : [...prev.severity, severity],
    }));
  };

  const toggleActionType = (type: string) => {
    setFilters((prev) => ({
      ...prev,
      actionType: prev.actionType.includes(type)
        ? prev.actionType.filter((t) => t !== type)
        : [...prev.actionType, type],
    }));
  };

  const toggleUserRole = (role: string) => {
    setFilters((prev) => ({
      ...prev,
      userRole: prev.userRole.includes(role)
        ? prev.userRole.filter((r) => r !== role)
        : [...prev.userRole, role],
    }));
  };

  const toggleStatus = (status: string) => {
    setFilters((prev) => ({
      ...prev,
      status: prev.status.includes(status)
        ? prev.status.filter((s) => s !== status)
        : [...prev.status, status],
    }));
  };

  const clearFilters = () => {
    setFilters({
      search: "",
      severity: [],
      actionType: [],
      userRole: [],
      dateRange: { start: null, end: null },
      userId: null,
      resourceType: null,
      status: [],
    });
    setCurrentPage(1);
  };

  // Export functions
  const exportLogs = (format: "csv" | "json") => {
    try {
      const dataToExport = filteredLogs.map((log) => ({
        id: log.id,
        action: log.action,
        type: log.action_type,
        details: log.details,
        user: log.users ? `${log.users.first_name} ${log.users.last_name}` : "Unknown",
        role: log.users?.role || "unknown",
        email: log.users?.email || "",
        severity: log.severity,
        status: log.status,
        ip: log.ip_address || "",
        device: log.device_type || "",
        resource: log.resource_type || "",
        timestamp: log.created_at,
      }));

      let content: string;
      let filename: string;
      let type: string;

      if (format === "csv") {
        // Convert to CSV
        const headers = Object.keys(dataToExport[0]).join(",");
        const rows = dataToExport.map((row) =>
          Object.values(row)
            .map((val) => (typeof val === "string" ? `"${val.replace(/"/g, '""')}"` : val))
            .join(","),
        );
        content = [headers, ...rows].join("\n");
        filename = `logs_export_${new Date().toISOString()}.csv`;
        type = "text/csv";
      } else {
        content = JSON.stringify(dataToExport, null, 2);
        filename = `logs_export_${new Date().toISOString()}.json`;
        type = "application/json";
      }

      const blob = new Blob([content], { type });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);

      showToast(
        lang === "sw" ? "Kumbukumbu zimepakuliwa" : "Logs exported successfully",
        "success",
      );
    } catch (_error) {
      showToast(lang === "sw" ? "Hitilafu kupakua kumbukumbu" : "Error exporting logs", "error");
    }
  };

  const copyLogToClipboard = (log: ActivityLog) => {
    const logText = `
ID: ${log.id}
Action: ${log.action}
Type: ${log.action_type}
Details: ${typeof log.details === "object" ? JSON.stringify(log.details) : log.details}
User: ${log.users ? `${log.users.first_name} ${log.users.last_name} (${log.users.email})` : "Unknown"}
Role: ${log.users?.role || "unknown"}
Severity: ${log.severity}
Status: ${log.status}
IP: ${log.ip_address || "N/A"}
Device: ${log.device_type || "N/A"}
Resource: ${log.resource_type || "N/A"} ${log.resource_id ? `(${log.resource_id})` : ""}
Timestamp: ${new Date(log.created_at).toLocaleString()}
    `.trim();

    navigator.clipboard.writeText(logText);
    showToast(lang === "sw" ? "Kumbukumbu imenakiliwa" : "Log copied to clipboard", "success");
  };

  const formatTimeAgo = (timestamp: string) => {
    const now = new Date();
    const past = new Date(timestamp);
    const diffMs = now.getTime() - past.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return lang === "sw" ? "sasa hivi" : "just now";
    if (diffMins < 60)
      return `${diffMins} ${lang === "sw" ? "dakika" : "min"} ${lang === "sw" ? "zilizopita" : "ago"}`;
    if (diffHours < 24)
      return `${diffHours} ${lang === "sw" ? "saa" : "hour"}${diffHours > 1 ? "s" : ""} ${lang === "sw" ? "zilizopita" : "ago"}`;
    return `${diffDays} ${lang === "sw" ? "siku" : "day"}${diffDays > 1 ? "s" : ""} ${lang === "sw" ? "zilizopita" : "ago"}`;
  };

  const getDeviceIcon = (deviceType?: string) => {
    switch (deviceType) {
      case "desktop":
        return <Laptop size={14} />;
      case "mobile":
        return <Smartphone size={14} />;
      case "tablet":
        return <Smartphone size={14} />;
      default:
        return <Globe size={14} />;
    }
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case "info":
        return <Info size={14} />;
      case "warning":
        return <AlertTriangle size={14} />;
      case "error":
        return <AlertCircle size={14} />;
      case "critical":
        return <AlertCircle size={14} />;
      default:
        return <Activity size={14} />;
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-8"
    >
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-stone-900 tracking-tight">
            {lang === "sw" ? "Kumbukumbu za Mfumo" : "System Activity Logs"}
          </h1>
          <p className="text-stone-500 font-medium">
            {lang === "sw"
              ? "Fuatilia shughuli zote zinazofanyika kwenye mfumo"
              : "Monitor all activities happening within the system"}
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Auto-refresh Toggle */}
          <button
            onClick={() => setAutoRefresh(!autoRefresh)}
            className={cn(
              "h-12 px-4 rounded-xl font-medium transition-all flex items-center gap-2",
              autoRefresh
                ? "bg-emerald-50 text-emerald-600 border border-emerald-200"
                : "bg-white border border-stone-200 text-stone-600 hover:bg-stone-50",
            )}
            title={lang === "sw" ? "Onyesha upya kiotomatiki" : "Auto refresh"}
          >
            <RefreshCw size={18} className={cn(autoRefresh && "animate-spin")} />
            <span className="hidden sm:inline">
              {autoRefresh
                ? lang === "sw"
                  ? "Inaonyesha"
                  : "Auto-refresh"
                : lang === "sw"
                  ? "Onyesha mwenyewe"
                  : "Manual"}
            </span>
          </button>

          {/* Export Dropdown */}
          <div className="relative group">
            <button className="h-12 px-4 bg-white border border-stone-200 rounded-xl font-medium text-stone-600 hover:bg-stone-50 transition-all flex items-center gap-2">
              <Download size={18} />
              <span className="hidden sm:inline">{lang === "sw" ? "Pakua" : "Export"}</span>
              <ChevronDown size={16} />
            </button>
            <div className="absolute right-0 mt-2 w-48 bg-white rounded-2xl shadow-xl border border-stone-100 py-2 hidden group-hover:block z-50">
              <button
                onClick={() => exportLogs("csv")}
                className="w-full px-4 py-2 text-left text-sm text-stone-700 hover:bg-stone-50 flex items-center gap-2"
              >
                <FileText size={16} />
                Export as CSV
              </button>
              <button
                onClick={() => exportLogs("json")}
                className="w-full px-4 py-2 text-left text-sm text-stone-700 hover:bg-stone-50 flex items-center gap-2"
              >
                <Terminal size={16} />
                Export as JSON
              </button>
            </div>
          </div>

          {/* Filter Toggle */}
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={cn(
              "h-12 px-4 rounded-xl font-medium transition-all flex items-center gap-2",
              showFilters
                ? "bg-stone-900 text-white"
                : "bg-white border border-stone-200 text-stone-600 hover:bg-stone-50",
            )}
          >
            <Filter size={18} />
            <span className="hidden sm:inline">{lang === "sw" ? "Chuja" : "Filters"}</span>
            {Object.values(filters)
              .flat()
              .filter((v) => (Array.isArray(v) ? v.length > 0 : v)).length > 0 && (
              <span className="w-5 h-5 rounded-full bg-emerald-500 text-white text-xs flex items-center justify-center">
                {
                  Object.values(filters)
                    .flat()
                    .filter((v) => (Array.isArray(v) ? v.length > 0 : v)).length
                }
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Log Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <div className="bg-white p-4 rounded-2xl border border-stone-100 shadow-sm">
          <p className="text-xs text-stone-400 font-bold uppercase tracking-widest mb-1">
            {lang === "sw" ? "Jumla" : "Total"}
          </p>
          <p className="text-2xl font-black text-stone-900">{stats.totalLogs.toLocaleString()}</p>
        </div>
        <div className="bg-blue-50 p-4 rounded-2xl border border-blue-100">
          <p className="text-xs text-blue-600 font-bold uppercase tracking-widest mb-1 flex items-center gap-1">
            <Info size={12} /> Info
          </p>
          <p className="text-2xl font-black text-blue-600">{stats.infoCount}</p>
        </div>
        <div className="bg-amber-50 p-4 rounded-2xl border border-amber-100">
          <p className="text-xs text-amber-600 font-bold uppercase tracking-widest mb-1 flex items-center gap-1">
            <AlertTriangle size={12} /> Warning
          </p>
          <p className="text-2xl font-black text-amber-600">{stats.warningCount}</p>
        </div>
        <div className="bg-red-50 p-4 rounded-2xl border border-red-100">
          <p className="text-xs text-red-600 font-bold uppercase tracking-widest mb-1 flex items-center gap-1">
            <AlertCircle size={12} /> Error
          </p>
          <p className="text-2xl font-black text-red-600">{stats.errorCount}</p>
        </div>
        <div className="bg-purple-50 p-4 rounded-2xl border border-purple-100">
          <p className="text-xs text-purple-600 font-bold uppercase tracking-widest mb-1 flex items-center gap-1">
            <AlertCircle size={12} /> Critical
          </p>
          <p className="text-2xl font-black text-purple-600">{stats.criticalCount}</p>
        </div>
      </div>

      {/* Filters Panel */}
      <AnimatePresence>
        {showFilters && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="bg-white rounded-3xl p-6 border border-stone-100 shadow-xl space-y-6">
              {/* Search */}
              <div className="relative">
                <Search
                  className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-400"
                  size={20}
                />
                <input
                  type="text"
                  placeholder={lang === "sw" ? "Tafuta kumbukumbu..." : "Search logs..."}
                  value={filters.search}
                  onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                  className="w-full h-12 pl-12 pr-4 bg-stone-50 border border-stone-200 rounded-xl focus:ring-2 focus:ring-stone-900 transition-all font-medium"
                />
              </div>

              {/* Filter Grid */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                {/* Severity Filter */}
                <div className="space-y-2">
                  <label className="text-xs font-bold text-stone-500 uppercase tracking-widest">
                    {lang === "sw" ? "Ukali" : "Severity"}
                  </label>
                  <div className="space-y-2">
                    {["info", "warning", "error", "critical"].map((severity) => (
                      <label key={severity} className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={filters.severity.includes(severity)}
                          onChange={() => toggleSeverity(severity)}
                          className="w-4 h-4 rounded border-stone-300 text-emerald-600 focus:ring-emerald-500"
                        />
                        <span
                          className={cn(
                            "px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-widest border",
                            SEVERITY_COLORS[severity as keyof typeof SEVERITY_COLORS],
                          )}
                        >
                          {severity}
                        </span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Action Type Filter */}
                <div className="space-y-2">
                  <label className="text-xs font-bold text-stone-500 uppercase tracking-widest">
                    {lang === "sw" ? "Aina ya Kitendo" : "Action Type"}
                  </label>
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {Object.keys(ACTION_TYPE_COLORS).map((type) => (
                      <label key={type} className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={filters.actionType.includes(type)}
                          onChange={() => toggleActionType(type)}
                          className="w-4 h-4 rounded border-stone-300 text-emerald-600 focus:ring-emerald-500"
                        />
                        <span
                          className={cn(
                            "px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-widest",
                            ACTION_TYPE_COLORS[type as keyof typeof ACTION_TYPE_COLORS],
                          )}
                        >
                          {type}
                        </span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* User Role Filter */}
                <div className="space-y-2">
                  <label className="text-xs font-bold text-stone-500 uppercase tracking-widest">
                    {lang === "sw" ? "Wajibu" : "User Role"}
                  </label>
                  <div className="space-y-2">
                    {["admin", "staff", "citizen", "system"].map((role) => (
                      <label key={role} className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={filters.userRole.includes(role)}
                          onChange={() => toggleUserRole(role)}
                          className="w-4 h-4 rounded border-stone-300 text-emerald-600 focus:ring-emerald-500"
                        />
                        <span className="text-sm text-stone-700 capitalize">{role}</span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Status Filter */}
                <div className="space-y-2">
                  <label className="text-xs font-bold text-stone-500 uppercase tracking-widest">
                    {lang === "sw" ? "Hali" : "Status"}
                  </label>
                  <div className="space-y-2">
                    {["success", "pending", "failed"].map((status) => (
                      <label key={status} className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={filters.status.includes(status)}
                          onChange={() => toggleStatus(status)}
                          className="w-4 h-4 rounded border-stone-300 text-emerald-600 focus:ring-emerald-500"
                        />
                        <span
                          className={cn(
                            "px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-widest",
                            STATUS_COLORS[status as keyof typeof STATUS_COLORS],
                          )}
                        >
                          {status}
                        </span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>

              {/* Date Range */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-stone-500 uppercase tracking-widest">
                    {lang === "sw" ? "Kuanzia" : "From"}
                  </label>
                  <input
                    type="date"
                    title={lang === "sw" ? "Kuanzia tarehe" : "Start date"}
                    placeholder={lang === "sw" ? "Kuanzia tarehe" : "From"}
                    value={filters.dateRange.start?.toISOString().split("T")[0] || ""}
                    onChange={(e) =>
                      setFilters({
                        ...filters,
                        dateRange: {
                          ...filters.dateRange,
                          start: e.target.value ? new Date(e.target.value) : null,
                        },
                      })
                    }
                    className="w-full h-12 px-4 bg-stone-50 border border-stone-200 rounded-xl focus:ring-2 focus:ring-stone-900 transition-all"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-stone-500 uppercase tracking-widest">
                    {lang === "sw" ? "Mpaka" : "To"}
                  </label>
                  <input
                    type="date"
                    title={lang === "sw" ? "Hadi tarehe" : "End date"}
                    placeholder={lang === "sw" ? "Hadi tarehe" : "To"}
                    value={filters.dateRange.end?.toISOString().split("T")[0] || ""}
                    onChange={(e) =>
                      setFilters({
                        ...filters,
                        dateRange: {
                          ...filters.dateRange,
                          end: e.target.value ? new Date(e.target.value) : null,
                        },
                      })
                    }
                    className="w-full h-12 px-4 bg-stone-50 border border-stone-200 rounded-xl focus:ring-2 focus:ring-stone-900 transition-all"
                  />
                </div>
              </div>

              {/* Filter Actions */}
              <div className="flex items-center justify-end gap-3">
                <button
                  onClick={clearFilters}
                  className="px-6 h-12 bg-white border border-stone-200 rounded-xl font-medium text-stone-600 hover:bg-stone-50 transition-all"
                >
                  {lang === "sw" ? "Futa Vichujio" : "Clear Filters"}
                </button>
                <button
                  onClick={() => fetchLogs(1)}
                  className="px-6 h-12 bg-stone-900 text-white rounded-xl font-medium hover:bg-stone-800 transition-all"
                >
                  {lang === "sw" ? "Tumia Vichujio" : "Apply Filters"}
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Live Streaming Indicator */}
      {streaming && (
        <div className="flex items-center gap-2 text-emerald-600 bg-emerald-50 px-4 py-2 rounded-xl border border-emerald-100">
          <Activity size={16} className="animate-pulse" />
          <span className="text-sm font-medium">
            {lang === "sw" ? "Kumbukumbu mpya zinaingia..." : "New logs arriving..."}
          </span>
        </div>
      )}

      {/* Logs Table */}
      <div className="bg-white rounded-3xl border border-stone-100 shadow-xl overflow-hidden">
        {loading ? (
          <div className="p-12 text-center">
            <Loader2 className="animate-spin mx-auto text-emerald-600 mb-2" size={32} />
            <p className="text-stone-400 font-bold">
              {lang === "sw" ? "Inapakia kumbukumbu..." : "Loading logs..."}
            </p>
          </div>
        ) : filteredLogs.length === 0 ? (
          <div className="p-12 text-center">
            <div className="w-20 h-20 mx-auto mb-4 bg-stone-100 rounded-full flex items-center justify-center">
              <Activity className="text-stone-400" size={32} />
            </div>
            <p className="text-stone-900 font-bold text-lg mb-1">
              {lang === "sw" ? "Hakuna kumbukumbu" : "No logs found"}
            </p>
            <p className="text-stone-500 font-medium">
              {lang === "sw"
                ? "Jaribu kubadilisha vigezo vya utafutaji"
                : "Try adjusting your search filters"}
            </p>
          </div>
        ) : (
          <>
            {/* Desktop Table */}
            <div className="hidden lg:block overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-stone-50/50 border-b border-stone-100">
                    <th className="px-6 py-4 text-xs font-bold text-stone-500 uppercase tracking-widest">
                      {lang === "sw" ? "Muda" : "Timestamp"}
                    </th>
                    <th className="px-6 py-4 text-xs font-bold text-stone-500 uppercase tracking-widest">
                      {lang === "sw" ? "Mtumiaji" : "User"}
                    </th>
                    <th className="px-6 py-4 text-xs font-bold text-stone-500 uppercase tracking-widest">
                      {lang === "sw" ? "Kitendo" : "Action"}
                    </th>
                    <th className="px-6 py-4 text-xs font-bold text-stone-500 uppercase tracking-widest">
                      {lang === "sw" ? "Ukali" : "Severity"}
                    </th>
                    <th className="px-6 py-4 text-xs font-bold text-stone-500 uppercase tracking-widest">
                      {lang === "sw" ? "Hali" : "Status"}
                    </th>
                    <th className="px-6 py-4 text-xs font-bold text-stone-500 uppercase tracking-widest">
                      IP
                    </th>
                    <th className="px-6 py-4 text-xs font-bold text-stone-500 uppercase tracking-widest text-right">
                      {lang === "sw" ? "Vitendo" : "Actions"}
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-50">
                  {filteredLogs.map((log) => (
                    <tr
                      key={log.id}
                      className="hover:bg-stone-50/50 transition-colors cursor-pointer"
                      onClick={() => setSelectedLog(log)}
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2 text-stone-500 font-medium text-sm">
                          <Clock size={14} />
                          <span title={new Date(log.created_at).toLocaleString()}>
                            {formatTimeAgo(log.created_at)}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div
                            className={cn(
                              "w-8 h-8 rounded-lg flex items-center justify-center text-xs font-black",
                              log.users?.role === "admin"
                                ? "bg-red-50 text-red-600"
                                : log.users?.role === "staff"
                                  ? "bg-blue-50 text-blue-600"
                                  : log.users?.role === "citizen"
                                    ? "bg-emerald-50 text-emerald-600"
                                    : "bg-stone-100 text-stone-600",
                            )}
                          >
                            {log.users?.role === "admin"
                              ? "AD"
                              : log.users?.role === "staff"
                                ? "ST"
                                : log.users?.role === "citizen"
                                  ? "CZ"
                                  : "SY"}
                          </div>
                          <div>
                            <p className="font-bold text-stone-900">
                              {log.users?.first_name} {log.users?.last_name}
                            </p>
                            <p className="text-[10px] uppercase font-black tracking-widest text-stone-400">
                              {log.users?.role}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div>
                          <span
                            className={cn(
                              "px-2 py-1 rounded-md text-[10px] font-black uppercase tracking-widest",
                              ACTION_TYPE_COLORS[log.action_type],
                            )}
                          >
                            {log.action_type}
                          </span>
                          <p className="text-sm font-medium text-stone-700 mt-1 line-clamp-1">
                            {log.action}
                          </p>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={cn(
                            "px-2 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border flex items-center gap-1 w-fit",
                            SEVERITY_COLORS[log.severity],
                          )}
                        >
                          {getSeverityIcon(log.severity)}
                          {log.severity}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={cn(
                            "px-2 py-1 rounded-full text-[10px] font-black uppercase tracking-widest",
                            STATUS_COLORS[log.status],
                          )}
                        >
                          {log.status}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-1 text-stone-500">
                          {getDeviceIcon(log.device_type)}
                          <code className="text-xs font-mono">{log.ip_address || "N/A"}</code>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              copyLogToClipboard(log);
                            }}
                            className="p-2 hover:bg-stone-100 rounded-lg text-stone-400 transition-colors"
                            title={lang === "sw" ? "Nakili" : "Copy"}
                          >
                            <Copy size={16} />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedLog(log);
                            }}
                            className="p-2 hover:bg-stone-100 rounded-lg text-stone-400 transition-colors"
                            title={lang === "sw" ? "Angalia" : "View"}
                          >
                            <Eye size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Card View */}
            <div className="lg:hidden divide-y divide-stone-50">
              {filteredLogs.map((log) => (
                <div
                  key={log.id}
                  className="p-4 space-y-3 cursor-pointer hover:bg-stone-50/50 transition-colors"
                  onClick={() => setSelectedLog(log)}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div
                        className={cn(
                          "w-10 h-10 rounded-xl flex items-center justify-center text-sm font-black",
                          log.users?.role === "admin"
                            ? "bg-red-50 text-red-600"
                            : log.users?.role === "staff"
                              ? "bg-blue-50 text-blue-600"
                              : log.users?.role === "citizen"
                                ? "bg-emerald-50 text-emerald-600"
                                : "bg-stone-100 text-stone-600",
                        )}
                      >
                        {log.users?.role === "admin"
                          ? "AD"
                          : log.users?.role === "staff"
                            ? "ST"
                            : log.users?.role === "citizen"
                              ? "CZ"
                              : "SY"}
                      </div>
                      <div>
                        <p className="font-bold text-stone-900">
                          {log.users?.first_name} {log.users?.last_name}
                        </p>
                        <p className="text-xs text-stone-500">{log.users?.email}</p>
                      </div>
                    </div>
                    <div className="flex gap-1">
                      <span
                        className={cn(
                          "px-2 py-1 rounded-full text-[8px] font-black uppercase tracking-widest",
                          STATUS_COLORS[log.status],
                        )}
                      >
                        {log.status}
                      </span>
                    </div>
                  </div>

                  <div className="bg-stone-50 p-3 rounded-xl space-y-2">
                    <div className="flex items-center justify-between">
                      <span
                        className={cn(
                          "px-2 py-0.5 rounded-md text-[8px] font-black uppercase tracking-widest",
                          ACTION_TYPE_COLORS[log.action_type],
                        )}
                      >
                        {log.action_type}
                      </span>
                      <span className="text-xs text-stone-400 flex items-center gap-1">
                        <Clock size={12} />
                        {formatTimeAgo(log.created_at)}
                      </span>
                    </div>
                    <p className="text-sm font-medium text-stone-700">{log.action}</p>
                    <p className="text-xs text-stone-500 line-clamp-2">
                      {typeof log.details === "object"
                        ? JSON.stringify(log.details)
                        : String(log.details || "")}
                    </p>
                  </div>

                  <div className="flex items-center justify-between text-xs text-stone-400">
                    <div className="flex items-center gap-2">
                      {getDeviceIcon(log.device_type)}
                      <code className="font-mono">{log.ip_address || "N/A"}</code>
                    </div>
                    <span
                      className={cn(
                        "px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-widest border flex items-center gap-1",
                        SEVERITY_COLORS[log.severity],
                      )}
                    >
                      {getSeverityIcon(log.severity)}
                      {log.severity}
                    </span>
                  </div>
                </div>
              ))}
            </div>

            {/* Pagination */}
            <div className="px-6 py-4 border-t border-stone-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <select
                  title={lang === "sw" ? "Chagua idadi ya kumbukumbu" : "Select items per page"}
                  aria-label={lang === "sw" ? "Idadi kwa ukurasa" : "Items per page"}
                  value={itemsPerPage}
                  onChange={(e) => setItemsPerPage(Number(e.target.value))}
                  className="h-10 px-2 bg-stone-50 border border-stone-200 rounded-lg text-sm focus:ring-2 focus:ring-stone-900"
                >
                  <option value="25">25</option>
                  <option value="50">50</option>
                  <option value="100">100</option>
                  <option value="250">250</option>
                </select>
                <span className="text-sm text-stone-500">
                  {lang === "sw" ? "kwa ukurasa" : "per page"}
                </span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  title={lang === "sw" ? "Ukurasa uliopita" : "Previous page"}
                  aria-label={lang === "sw" ? "Nenda ukurasa uliopita" : "Go to previous page"}
                  onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                  className="p-2 hover:bg-stone-100 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ChevronLeft size={18} />
                </button>
                <span className="text-sm text-stone-600">
                  {currentPage} / {totalPages}
                </span>
                <button
                  title={lang === "sw" ? "Ukurasa inayofuata" : "Next page"}
                  aria-label={lang === "sw" ? "Nenda ukurasa inayofuata" : "Go to next page"}
                  onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
                  disabled={currentPage === totalPages}
                  className="p-2 hover:bg-stone-100 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ChevronRight size={18} />
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Log Detail Modal */}
      <AnimatePresence>
        {selectedLog && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedLog(null)}
              className="absolute inset-0 bg-stone-900/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-2xl bg-white rounded-3xl shadow-2xl overflow-hidden"
            >
              <div className="px-8 py-6 border-b border-stone-100 flex items-center justify-between">
                <h2 className="text-xl font-black text-stone-900 tracking-tight">
                  {lang === "sw" ? "Maelezo ya Kumbukumbu" : "Log Details"}
                </h2>
                <button
                  title={lang === "sw" ? "Funga" : "Close"}
                  aria-label={lang === "sw" ? "Funga modal" : "Close modal"}
                  onClick={() => setSelectedLog(null)}
                  className="p-2 hover:bg-stone-100 rounded-full transition-colors text-stone-400"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="p-8 space-y-6">
                {/* Log Header */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div
                      className={cn(
                        "w-12 h-12 rounded-xl flex items-center justify-center text-lg font-black",
                        selectedLog.users?.role === "admin"
                          ? "bg-red-50 text-red-600"
                          : selectedLog.users?.role === "staff"
                            ? "bg-blue-50 text-blue-600"
                            : selectedLog.users?.role === "citizen"
                              ? "bg-emerald-50 text-emerald-600"
                              : "bg-stone-100 text-stone-600",
                      )}
                    >
                      {selectedLog.users?.role === "admin"
                        ? "AD"
                        : selectedLog.users?.role === "staff"
                          ? "ST"
                          : selectedLog.users?.role === "citizen"
                            ? "CZ"
                            : "SY"}
                    </div>
                    <div>
                      <p className="font-bold text-stone-900 text-lg">
                        {selectedLog.users?.first_name} {selectedLog.users?.last_name}
                      </p>
                      <p className="text-sm text-stone-500">{selectedLog.users?.email}</p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <span
                      className={cn(
                        "px-3 py-1 rounded-full text-xs font-black uppercase tracking-widest",
                        STATUS_COLORS[selectedLog.status],
                      )}
                    >
                      {selectedLog.status}
                    </span>
                    <span
                      className={cn(
                        "px-3 py-1 rounded-full text-xs font-black uppercase tracking-widest border flex items-center gap-1",
                        SEVERITY_COLORS[selectedLog.severity],
                      )}
                    >
                      {getSeverityIcon(selectedLog.severity)}
                      {selectedLog.severity}
                    </span>
                  </div>
                </div>

                {/* Log Details Grid */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-stone-50 p-4 rounded-2xl">
                    <p className="text-xs text-stone-400 font-bold uppercase tracking-widest mb-1">
                      {lang === "sw" ? "Kitendo" : "Action"}
                    </p>
                    <p className="font-bold text-stone-900">{selectedLog.action}</p>
                  </div>
                  <div className="bg-stone-50 p-4 rounded-2xl">
                    <p className="text-xs text-stone-400 font-bold uppercase tracking-widest mb-1">
                      {lang === "sw" ? "Aina ya Kitendo" : "Action Type"}
                    </p>
                    <span
                      className={cn(
                        "px-3 py-1 rounded-full text-xs font-black uppercase tracking-widest inline-block",
                        ACTION_TYPE_COLORS[selectedLog.action_type],
                      )}
                    >
                      {selectedLog.action_type}
                    </span>
                  </div>
                </div>

                {/* Description */}
                <div className="bg-stone-50 p-4 rounded-2xl">
                  <p className="text-xs text-stone-400 font-bold uppercase tracking-widest mb-2">
                    {lang === "sw" ? "Maelezo" : "Description"}
                  </p>
                  <p className="text-stone-700">
                    {typeof selectedLog.details === "object"
                      ? JSON.stringify(selectedLog.details, null, 2)
                      : String(selectedLog.details || "—")}
                  </p>
                </div>

                {/* Technical Details */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-stone-50 p-4 rounded-2xl">
                    <p className="text-xs text-stone-400 font-bold uppercase tracking-widest mb-2">
                      {lang === "sw" ? "Maelezo ya Kiufundi" : "Technical Details"}
                    </p>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-stone-500">ID:</span>
                        <code className="font-mono text-stone-900">{selectedLog.id}</code>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-stone-500">User ID:</span>
                        <code className="font-mono text-stone-900">{selectedLog.user_id}</code>
                      </div>
                      {selectedLog.resource_id && (
                        <div className="flex justify-between">
                          <span className="text-stone-500">Resource ID:</span>
                          <code className="font-mono text-stone-900">
                            {selectedLog.resource_id}
                          </code>
                        </div>
                      )}
                      {selectedLog.resource_type && (
                        <div className="flex justify-between">
                          <span className="text-stone-500">Resource Type:</span>
                          <span className="text-stone-900">{selectedLog.resource_type}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="bg-stone-50 p-4 rounded-2xl">
                    <p className="text-xs text-stone-400 font-bold uppercase tracking-widest mb-2">
                      {lang === "sw" ? "Maelezo ya Mfumo" : "System Info"}
                    </p>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-stone-500">IP Address:</span>
                        <code className="font-mono text-stone-900">
                          {selectedLog.ip_address || "N/A"}
                        </code>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-stone-500">Device:</span>
                        <span className="text-stone-900 capitalize">
                          {selectedLog.device_type || "Unknown"}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-stone-500">Timestamp:</span>
                        <span className="text-stone-900">
                          {new Date(selectedLog.created_at).toLocaleString()}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* User Agent */}
                {selectedLog.user_agent && (
                  <div className="bg-stone-50 p-4 rounded-2xl">
                    <p className="text-xs text-stone-400 font-bold uppercase tracking-widest mb-2">
                      User Agent
                    </p>
                    <p className="text-xs text-stone-600 break-all">{selectedLog.user_agent}</p>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex gap-3 no-print">
                  <button
                    onClick={() => copyLogToClipboard(selectedLog)}
                    className="flex-1 h-12 bg-stone-100 text-stone-700 rounded-xl font-medium hover:bg-stone-200 transition-all flex items-center justify-center gap-2"
                  >
                    <Copy size={18} />
                    {lang === "sw" ? "Nakili" : "Copy"}
                  </button>
                  <button
                    onClick={() => {
                      // Print functionality
                      window.print();
                    }}
                    className="flex-1 h-12 bg-stone-100 text-stone-700 rounded-xl font-medium hover:bg-stone-200 transition-all flex items-center justify-center gap-2"
                  >
                    <Printer size={18} />
                    {lang === "sw" ? "Chapisha" : "Print"}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
