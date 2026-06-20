/**
 * ─────────────────────────────────────────────────────────────────────────────
 * E-MTAA — Data Fetching Hooks (React Query)
 * Replaces raw useEffect+useState patterns in all views.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import {
  useQuery,
  useMutation,
  useQueryClient,
  type UseQueryResult,
} from "@tanstack/react-query";
import { useAuthStore } from "@/stores/auth-store";
import type {
  ApiResponse,
  Application,
  Service,
  DashboardStats,
  Notification,
  Announcement,
  PaginatedResponse,
} from "@/types";

// ── Auth header helper ────────────────────────────────────────────────────────

function getAuthHeaders(): HeadersInit {
  const user = useAuthStore.getState().user;
  const token = (user as { token?: string } | null)?.token;
  if (!token) return { "Content-Type": "application/json" };
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  };
}

async function apiFetch<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    headers: getAuthHeaders(),
    ...init,
  });
  const json = (await res.json()) as ApiResponse<T>;
  if (!json.success) {
    throw new Error(json.error ?? json.message ?? "Request failed");
  }
  return json.data as T;
}

// ── Query Keys ────────────────────────────────────────────────────────────────

export const queryKeys = {
  dashboard: ["dashboard"] as const,
  services: (category?: string) => ["services", category] as const,
  service: (id: string) => ["service", id] as const,
  applications: (params?: Record<string, unknown>) =>
    ["applications", params] as const,
  application: (id: string) => ["application", id] as const,
  notifications: ["notifications"] as const,
  notificationCount: ["notifications", "unread-count"] as const,
  announcements: ["announcements"] as const,
  adminStats: ["admin", "stats"] as const,
  adminUsers: (params?: Record<string, unknown>) =>
    ["admin", "users", params] as const,
};

// ── Dashboard ─────────────────────────────────────────────────────────────────

export function useDashboard(): UseQueryResult<DashboardStats> {
  return useQuery({
    queryKey: queryKeys.dashboard,
    queryFn: () => apiFetch<DashboardStats>("/api/dashboard"),
    staleTime: 2 * 60 * 1000, // 2 minutes
    refetchOnWindowFocus: false,
  });
}

// ── Services ──────────────────────────────────────────────────────────────────

export function useServices(category?: string): UseQueryResult<Service[]> {
  return useQuery({
    queryKey: queryKeys.services(category),
    queryFn: () => {
      const url = category
        ? `/api/services?category=${encodeURIComponent(category)}&limit=100`
        : "/api/services?limit=100";
      return apiFetch<{ data: Service[] }>(url).then((r) =>
        (r as unknown as { data: Service[] }).data
      );
    },
    staleTime: 10 * 60 * 1000, // 10 minutes — services rarely change
    gcTime: 30 * 60 * 1000,
  });
}

export function useService(id: string): UseQueryResult<Service> {
  return useQuery({
    queryKey: queryKeys.service(id),
    queryFn: () => apiFetch<Service>(`/api/services/${id}`),
    enabled: !!id,
    staleTime: 10 * 60 * 1000,
  });
}

// ── Applications ─────────────────────────────────────────────────────────────

interface ApplicationsParams {
  page?: number;
  limit?: number;
  status?: string;
  search?: string;
}

export function useApplications(
  params: ApplicationsParams = {}
): UseQueryResult<PaginatedResponse<Application>> {
  const searchParams = new URLSearchParams();
  if (params.page) searchParams.set("page", String(params.page));
  if (params.limit) searchParams.set("limit", String(params.limit));
  if (params.status) searchParams.set("status", params.status);
  if (params.search) searchParams.set("search", params.search);

  return useQuery({
    queryKey: queryKeys.applications(params),
    queryFn: () =>
      apiFetch<PaginatedResponse<Application>>(
        `/api/applications?${searchParams.toString()}`
      ),
    staleTime: 30 * 1000, // 30 seconds
    placeholderData: (prev) => prev, // keep previous data while fetching next page
  });
}

export function useApplication(id: string): UseQueryResult<Application> {
  return useQuery({
    queryKey: queryKeys.application(id),
    queryFn: () => apiFetch<Application>(`/api/applications/${id}`),
    enabled: !!id,
    staleTime: 30 * 1000,
  });
}

// ── Submit Application ────────────────────────────────────────────────────────

export function useSubmitApplication() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: { serviceId: string; formData: Record<string, unknown> }) =>
      apiFetch<Application>("/api/applications", {
        method: "POST",
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      // Invalidate all application lists
      queryClient.invalidateQueries({ queryKey: ["applications"] });
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboard });
    },
  });
}

// ── Update Application Status (Staff/Admin) ───────────────────────────────────

export function useUpdateApplication() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      ...data
    }: {
      id: string;
      status?: string;
      rejectionReason?: string;
      staffNotes?: string;
      assignedStaffId?: string;
    }) =>
      apiFetch<Application>(`/api/applications/${id}`, {
        method: "PATCH",
        body: JSON.stringify(data),
      }),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.application(id) });
      queryClient.invalidateQueries({ queryKey: ["applications"] });
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboard });
    },
  });
}

// ── Notifications ─────────────────────────────────────────────────────────────

export function useNotifications(): UseQueryResult<Notification[]> {
  return useQuery({
    queryKey: queryKeys.notifications,
    queryFn: () =>
      apiFetch<{ data: Notification[] }>("/api/notifications?limit=50").then(
        (r) => (r as unknown as { data: Notification[] }).data
      ),
    // Poll every 30 seconds for real-time-ish updates
    refetchInterval: 30 * 1000,
    staleTime: 15 * 1000,
  });
}

export function useMarkNotificationRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) =>
      apiFetch(`/api/notifications/${id}`, { method: "PATCH" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.notifications });
    },
  });
}

export function useMarkAllNotificationsRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () =>
      apiFetch("/api/notifications/read-all", { method: "POST" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.notifications });
    },
  });
}

// ── Announcements ─────────────────────────────────────────────────────────────

export function useAnnouncements(): UseQueryResult<Announcement[]> {
  return useQuery({
    queryKey: queryKeys.announcements,
    queryFn: () =>
      apiFetch<{ data: Announcement[] }>("/api/announcements?limit=20").then(
        (r) => (r as unknown as { data: Announcement[] }).data
      ),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

// ── Admin Stats ───────────────────────────────────────────────────────────────

export function useAdminStats(): UseQueryResult<{
  totalUsers: number;
  totalApplications: number;
  pendingApplications: number;
  approvedToday: number;
  applicationsByStatus: Array<{ status: string; count: number }>;
  applicationsByCategory: Array<{ category: string; count: number }>;
  recentActivity: Array<{ date: string; count: number }>;
}> {
  return useQuery({
    queryKey: queryKeys.adminStats,
    queryFn: () => apiFetch("/api/admin/stats"),
    staleTime: 60 * 1000, // 1 minute
    refetchOnWindowFocus: false,
  });
}
