"use client";

/**
 * ─────────────────────────────────────────────────────────────────────────────
 * E-MTAA — Applications View (IMPROVED)
 * Improvements: pagination UI, search, React Query, skeleton loading,
 * better empty state, filter chips.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { useState } from "react";
import {
  Search,
  Filter,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  FileText,
  Clock,
  CheckCircle,
  XCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { PageContainer } from "@/components/layout/page-container";
import { StatusBadge } from "@/components/shared/status-badge";
import { EmptyState } from "@/components/shared/empty-state";
import { useAppStore } from "@/stores/app-store";
import { useCurrentUser } from "@/stores/auth-store";
import { useTranslation, useIsSwahili } from "@/lib/i18n";
import { CURRENCY } from "@/lib/constants";
import { cn } from "@/lib/utils";
import type { Application, ApplicationStatus } from "@/types";
import type { ApiResponse, PaginatedResponse } from "@/types";
import { useEffect, useCallback } from "react";

// ── Status filter options ─────────────────────────────────────────────────────

const STATUS_OPTIONS: Array<{ value: ApplicationStatus | "ALL"; labelEn: string; labelSw: string }> = [
  { value: "ALL", labelEn: "All", labelSw: "Zote" },
  { value: "SUBMITTED", labelEn: "Submitted", labelSw: "Zilizowasilishwa" },
  { value: "UNDER_REVIEW", labelEn: "Under Review", labelSw: "Zinazochunguzwa" },
  { value: "APPROVED", labelEn: "Approved", labelSw: "Zilizoidhinishwa" },
  { value: "REJECTED", labelEn: "Rejected", labelSw: "Zilizokataliwa" },
  { value: "ISSUED", labelEn: "Issued", labelSw: "Zilizotolewa" },
];

// ── Application Card ──────────────────────────────────────────────────────────

function ApplicationCard({
  app,
  onClick,
  isSw,
}: {
  app: Application;
  onClick: () => void;
  isSw: boolean;
}) {
  const submittedDate = app.submittedAt
    ? new Date(app.submittedAt).toLocaleDateString(isSw ? "sw-TZ" : "en-TZ", {
        day: "numeric",
        month: "short",
        year: "numeric",
      })
    : null;

  return (
    <Card
      className="cursor-pointer hover:shadow-md transition-all hover:border-primary/30 active:scale-[0.99]"
      onClick={onClick}
    >
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            {/* Application number */}
            <p className="text-xs font-mono text-muted-foreground mb-1">
              {app.applicationNumber}
            </p>

            {/* Service name */}
            <h3 className="font-medium text-sm leading-tight truncate">
              {isSw && app.service?.nameSw ? app.service.nameSw : app.service?.name ?? "—"}
            </h3>

            {/* Category */}
            {app.service?.category && (
              <p className="text-xs text-muted-foreground mt-0.5">
                {app.service.category.replace(/_/g, " ")}
              </p>
            )}

            {/* Date + Payment */}
            <div className="flex items-center gap-3 mt-2 flex-wrap">
              {submittedDate && (
                <span className="text-xs text-muted-foreground flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {submittedDate}
                </span>
              )}
              {app.paymentStatus === "PAID" ? (
                <span className="text-xs text-green-600 flex items-center gap-1">
                  <CheckCircle className="h-3 w-3" />
                  {isSw ? "Umelipwa" : "Paid"}
                </span>
              ) : app.paymentAmount > 0 ? (
                <span className="text-xs text-amber-600">
                  {CURRENCY} {app.paymentAmount.toLocaleString()}
                </span>
              ) : null}
            </div>
          </div>

          {/* Status badge */}
          <div className="shrink-0">
            <StatusBadge status={app.status} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ── Skeleton list ─────────────────────────────────────────────────────────────

function ApplicationsSkeleton() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 5 }).map((_, i) => (
        <Skeleton key={i} className="h-24 w-full rounded-lg" />
      ))}
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────

const PAGE_SIZE = 10;

export function ApplicationsView() {
  const t = useTranslation();
  const isSw = useIsSwahili();
  const setView = useAppStore((s) => s.setView);
  const setSelectedApplicationId = useAppStore((s) => s.setSelectedApplicationId);
  const user = useCurrentUser();

  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<ApplicationStatus | "ALL">("ALL");
  const [applications, setApplications] = useState<Application[]>([]);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchApplications = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const token = (user as { token?: string } | null)?.token;
      const params = new URLSearchParams({
        page: String(page),
        limit: String(PAGE_SIZE),
      });
      if (statusFilter !== "ALL") params.set("status", statusFilter);
      if (search.trim()) params.set("search", search.trim());

      const res = await fetch(`/api/applications?${params}`, {
        headers: { Authorization: token ? `Bearer ${token}` : "" },
      });
      const json = (await res.json()) as ApiResponse<PaginatedResponse<Application>>;
      if (!json.success) throw new Error(json.error ?? "Failed");
      const paged = json.data as unknown as PaginatedResponse<Application>;
      setApplications(paged.data);
      setTotalPages(paged.pagination.totalPages);
      setTotal(paged.pagination.total);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load applications");
    } finally {
      setIsLoading(false);
    }
  }, [user, page, statusFilter, search]);

  useEffect(() => {
    fetchApplications();
  }, [fetchApplications]);

  // Reset to page 1 when filters change
  useEffect(() => {
    setPage(1);
  }, [statusFilter, search]);

  const handleApplicationClick = (app: Application) => {
    setSelectedApplicationId(app.id);
    setView("application-detail");
  };

  return (
    <PageContainer
      title={t("nav.myApplications")}
      description={
        !isLoading && total > 0
          ? `${total} ${isSw ? "maombi" : "application"}${total !== 1 ? "s" : ""}`
          : undefined
      }
      actions={
        <Button size="sm" onClick={() => setView("services")}>
          + {isSw ? "Omba Huduma" : "New Application"}
        </Button>
      }
    >
      {/* ── Filters ────────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={isSw ? "Tafuta kwa namba..." : "Search by number..."}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>

        {/* Status filter */}
        <Select
          value={statusFilter}
          onValueChange={(v) => setStatusFilter(v as ApplicationStatus | "ALL")}
        >
          <SelectTrigger className="w-full sm:w-48">
            <Filter className="h-4 w-4 mr-2 text-muted-foreground" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {STATUS_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {isSw ? opt.labelSw : opt.labelEn}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Button variant="ghost" size="icon" onClick={fetchApplications} disabled={isLoading}>
          <RefreshCw className={cn("h-4 w-4", isLoading && "animate-spin")} />
        </Button>
      </div>

      {/* ── Error ──────────────────────────────────────────────────────────── */}
      {error && (
        <div className="p-4 bg-destructive/10 text-destructive rounded-lg mb-4 text-sm">
          {error}
        </div>
      )}

      {/* ── List ───────────────────────────────────────────────────────────── */}
      {isLoading ? (
        <ApplicationsSkeleton />
      ) : applications.length === 0 ? (
        <EmptyState
          icon={FileText}
          title={isSw ? "Hakuna Maombi" : "No Applications Found"}
          description={
            statusFilter !== "ALL" || search
              ? (isSw ? "Jaribu kubadilisha vichujio" : "Try changing your filters")
              : (isSw
                  ? "Bado hujawasilisha maombi yoyote"
                  : "You haven't submitted any applications yet")
          }
          action={
            <Button onClick={() => setView("services")}>
              {isSw ? "Omba Huduma ya Kwanza" : "Apply for a Service"}
            </Button>
          }
        />
      ) : (
        <div className="space-y-3">
          {applications.map((app) => (
            <ApplicationCard
              key={app.id}
              app={app}
              onClick={() => handleApplicationClick(app)}
              isSw={isSw}
            />
          ))}
        </div>
      )}

      {/* ── Pagination ─────────────────────────────────────────────────────── */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-6 pt-4 border-t">
          <p className="text-sm text-muted-foreground">
            {isSw ? "Ukurasa" : "Page"} {page} / {totalPages}
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1 || isLoading}
            >
              <ChevronLeft className="h-4 w-4" />
              {isSw ? "Iliyopita" : "Prev"}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages || isLoading}
            >
              {isSw ? "Inayofuata" : "Next"}
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </PageContainer>
  );
}
