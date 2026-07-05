/**
 * SkeletonScreens — Full-page skeleton loaders for every major view.
 * Uses the existing Skeleton primitive with pulse animation.
 */
import React from "react";
import { Skeleton } from "@/components/ui/skeleton";

// ─── Shared helpers ────────────────────────────────────────────────────────

const SkeletonStatCard = () => (
  <div className="bg-white rounded-2xl p-5 border border-stone-100 space-y-3">
    <div className="flex items-center justify-between">
      <Skeleton className="h-3 w-24" />
      <Skeleton className="h-9 w-9 rounded-xl" />
    </div>
    <Skeleton className="h-7 w-16" />
    <Skeleton className="h-2 w-20" />
  </div>
);

const SkeletonApplicationRow = ({ alt }: { alt?: boolean }) => (
  <div className={`flex items-center gap-4 p-4 rounded-xl ${alt ? "bg-stone-50" : ""}`}>
    <Skeleton className="h-10 w-10 rounded-xl shrink-0" />
    <div className="flex-1 space-y-2">
      <Skeleton className="h-3.5 w-48" />
      <Skeleton className="h-2.5 w-32" />
    </div>
    <Skeleton className="h-6 w-20 rounded-full" />
  </div>
);

const SkeletonServiceCard = () => (
  <div className="bg-white rounded-2xl p-5 border border-stone-100 space-y-3">
    <div className="flex items-start gap-3">
      <Skeleton className="h-11 w-11 rounded-xl shrink-0" />
      <div className="flex-1 space-y-2">
        <Skeleton className="h-4 w-36" />
        <Skeleton className="h-2.5 w-full" />
        <Skeleton className="h-2.5 w-3/4" />
      </div>
    </div>
    <div className="flex items-center justify-between pt-1">
      <Skeleton className="h-5 w-16 rounded-full" />
      <Skeleton className="h-8 w-24 rounded-xl" />
    </div>
  </div>
);

// ─── App-level splash (initial load / auth check) ──────────────────────────

export function AppSplashSkeleton() {
  return (
    <div className="min-h-screen bg-stone-50 flex flex-col items-center justify-center gap-6 p-8">
      {/* Logo */}
      <div className="flex flex-col items-center gap-3">
        <Skeleton className="h-16 w-16 rounded-2xl" />
        <Skeleton className="h-5 w-40" />
        <Skeleton className="h-3 w-28" />
      </div>
      {/* Animated bar */}
      <div className="w-48 h-1 bg-stone-200 rounded-full overflow-hidden">
        <div className="h-full w-1/2 bg-emerald-500 rounded-full animate-[shimmer_1.2s_ease-in-out_infinite]" />
      </div>
    </div>
  );
}

// ─── Sidebar layout wrapper skeleton ───────────────────────────────────────

export function SidebarSkeleton() {
  return (
    <div className="hidden md:flex flex-col w-64 shrink-0 bg-white border-r border-stone-100 h-screen p-4 gap-3">
      {/* Logo */}
      <div className="flex items-center gap-3 px-2 py-3 mb-2">
        <Skeleton className="h-9 w-9 rounded-xl" />
        <div className="space-y-1.5">
          <Skeleton className="h-3.5 w-24" />
          <Skeleton className="h-2.5 w-16" />
        </div>
      </div>
      {/* Nav items */}
      {Array.from({ length: 7 }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 px-3 py-2.5 rounded-xl">
          <Skeleton className="h-5 w-5 rounded-md" />
          <Skeleton className="h-3 w-28" />
        </div>
      ))}
      <div className="mt-auto pt-4 border-t border-stone-100 space-y-3">
        <div className="flex items-center gap-3 px-3 py-2">
          <Skeleton className="h-9 w-9 rounded-full" />
          <div className="space-y-1.5">
            <Skeleton className="h-3 w-24" />
            <Skeleton className="h-2.5 w-16" />
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Citizen Dashboard skeleton ─────────────────────────────────────────────

export function DashboardSkeleton() {
  return (
    <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6">
      {/* Welcome card */}
      <div className="bg-white rounded-2xl p-5 border border-stone-100">
        <div className="flex items-center gap-4">
          <Skeleton className="h-14 w-14 rounded-full shrink-0" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-5 w-48" />
            <Skeleton className="h-3 w-36" />
          </div>
          <Skeleton className="h-9 w-9 rounded-xl hidden sm:block" />
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <SkeletonStatCard key={i} />
        ))}
      </div>

      {/* Quick actions */}
      <div className="bg-white rounded-2xl p-5 border border-stone-100 space-y-3">
        <Skeleton className="h-4 w-32 mb-1" />
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex flex-col items-center gap-2 p-4 rounded-xl bg-stone-50">
              <Skeleton className="h-10 w-10 rounded-xl" />
              <Skeleton className="h-3 w-16" />
            </div>
          ))}
        </div>
      </div>

      {/* Recent applications */}
      <div className="bg-white rounded-2xl border border-stone-100 overflow-hidden">
        <div className="flex items-center justify-between p-5 border-b border-stone-100">
          <Skeleton className="h-4 w-40" />
          <Skeleton className="h-8 w-20 rounded-xl" />
        </div>
        <div className="divide-y divide-stone-50">
          {Array.from({ length: 4 }).map((_, i) => (
            <SkeletonApplicationRow key={i} alt={i % 2 === 1} />
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Services skeleton ──────────────────────────────────────────────────────

export function ServicesSkeleton() {
  return (
    <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-5">
      {/* Header */}
      <div className="space-y-2">
        <Skeleton className="h-6 w-48" />
        <Skeleton className="h-3.5 w-72" />
      </div>
      {/* Search bar */}
      <Skeleton className="h-12 w-full rounded-2xl" />
      {/* Category tabs */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-8 w-24 rounded-full shrink-0" />
        ))}
      </div>
      {/* Service cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {Array.from({ length: 9 }).map((_, i) => (
          <SkeletonServiceCard key={i} />
        ))}
      </div>
    </div>
  );
}

// ─── Applications list skeleton ─────────────────────────────────────────────

export function ApplicationsSkeleton() {
  return (
    <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <Skeleton className="h-6 w-40" />
          <Skeleton className="h-3.5 w-56" />
        </div>
        <Skeleton className="h-9 w-28 rounded-xl" />
      </div>
      {/* Filter tabs */}
      <div className="flex gap-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-8 w-20 rounded-full" />
        ))}
      </div>
      {/* Application rows */}
      <div className="bg-white rounded-2xl border border-stone-100 overflow-hidden divide-y divide-stone-50">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className={`p-4 ${i % 2 === 1 ? "bg-stone-50/50" : ""}`}>
            <div className="flex items-start gap-4">
              <Skeleton className="h-11 w-11 rounded-xl shrink-0" />
              <div className="flex-1 space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <Skeleton className="h-4 w-44" />
                  <Skeleton className="h-6 w-20 rounded-full" />
                </div>
                <Skeleton className="h-2.5 w-32" />
                <Skeleton className="h-2.5 w-48" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Staff Dashboard skeleton ────────────────────────────────────────────────

export function StaffDashboardSkeleton() {
  return (
    <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-3.5 w-36" />
        </div>
        <Skeleton className="h-10 w-10 rounded-full" />
      </div>
      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <SkeletonStatCard key={i} />
        ))}
      </div>
      {/* Pending queue */}
      <div className="bg-white rounded-2xl border border-stone-100 overflow-hidden">
        <div className="flex items-center justify-between p-5 border-b border-stone-100">
          <Skeleton className="h-4 w-44" />
          <Skeleton className="h-6 w-12 rounded-full" />
        </div>
        <div className="divide-y divide-stone-50">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-center gap-4 p-4">
              <Skeleton className="h-10 w-10 rounded-xl shrink-0" />
              <div className="flex-1 space-y-1.5">
                <Skeleton className="h-3.5 w-52" />
                <Skeleton className="h-2.5 w-36" />
              </div>
              <div className="flex gap-2">
                <Skeleton className="h-8 w-20 rounded-xl" />
                <Skeleton className="h-8 w-20 rounded-xl" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Admin Dashboard skeleton ────────────────────────────────────────────────

export function AdminDashboardSkeleton() {
  return (
    <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <Skeleton className="h-6 w-52" />
          <Skeleton className="h-3.5 w-40" />
        </div>
        <div className="flex gap-2">
          <Skeleton className="h-9 w-28 rounded-xl" />
          <Skeleton className="h-9 w-9 rounded-xl" />
        </div>
      </div>
      {/* Big stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="bg-white rounded-2xl p-5 border border-stone-100 space-y-3">
            <Skeleton className="h-3 w-24" />
            <Skeleton className="h-8 w-20" />
            <Skeleton className="h-1.5 w-full rounded-full" />
          </div>
        ))}
      </div>
      {/* Charts row */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {Array.from({ length: 2 }).map((_, i) => (
          <div key={i} className="bg-white rounded-2xl p-5 border border-stone-100 space-y-4">
            <Skeleton className="h-4 w-36" />
            <Skeleton className="h-48 w-full rounded-xl" />
          </div>
        ))}
      </div>
      {/* Table */}
      <div className="bg-white rounded-2xl border border-stone-100 overflow-hidden">
        <div className="p-5 border-b border-stone-100">
          <Skeleton className="h-4 w-40" />
        </div>
        <div className="divide-y divide-stone-50">
          {Array.from({ length: 5 }).map((_, i) => (
            <SkeletonApplicationRow key={i} alt={i % 2 === 1} />
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Profile skeleton ────────────────────────────────────────────────────────

export function ProfileSkeleton() {
  return (
    <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-5">
      {/* Avatar + name */}
      <div className="bg-white rounded-2xl p-6 border border-stone-100 flex items-center gap-5">
        <Skeleton className="h-20 w-20 rounded-full shrink-0" />
        <div className="space-y-2 flex-1">
          <Skeleton className="h-5 w-40" />
          <Skeleton className="h-3.5 w-28" />
          <Skeleton className="h-6 w-20 rounded-full" />
        </div>
      </div>
      {/* Form fields */}
      {Array.from({ length: 3 }).map((_, g) => (
        <div key={g} className="bg-white rounded-2xl p-5 border border-stone-100 space-y-4">
          <Skeleton className="h-4 w-32 mb-2" />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {Array.from({ length: 4 }).map((_, f) => (
              <div key={f} className="space-y-1.5">
                <Skeleton className="h-3 w-20" />
                <Skeleton className="h-11 w-full rounded-xl" />
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Full-page layout skeleton (sidebar + content) ───────────────────────────

export function PageLayoutSkeleton({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen overflow-hidden bg-stone-50">
      <SidebarSkeleton />
      <div className="flex flex-col flex-1 overflow-hidden">
        {/* Top bar */}
        <div className="h-14 border-b border-stone-100 bg-white flex items-center justify-between px-4 shrink-0">
          <Skeleton className="h-5 w-32" />
          <div className="flex items-center gap-2">
            <Skeleton className="h-8 w-8 rounded-full" />
            <Skeleton className="h-8 w-8 rounded-full" />
          </div>
        </div>
        {children}
      </div>
    </div>
  );
}
