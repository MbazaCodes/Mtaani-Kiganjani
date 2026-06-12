/**
 * verification.ts — E-MTAA V3.0 Verification Tier System
 *
 * Tier 1: PHONE_VERIFIED / EMAIL_VERIFIED  → Basic access, manual review (2-5 days)
 * Tier 2: PROFILE_COMPLETED               → Standard access, faster review (1-3 days)
 * Tier 3: NIDA_VERIFIED                   → Full access, instant auto-processing
 */

import type { UserProfile } from "@/lib/supabase";

// ── Tier definitions ─────────────────────────────────────────────────────────
export type VerificationTier =
  | "UNVERIFIED"
  | "PHONE_VERIFIED"
  | "EMAIL_VERIFIED"
  | "PROFILE_COMPLETED"
  | "PENDING_OFFICE_VISIT"
  | "NIDA_VERIFIED";

export interface TierInfo {
  tier: VerificationTier;
  label: { en: string; sw: string };
  color: "red" | "yellow" | "orange" | "gray" | "green";
  badgeBg: string;
  badgeText: string;
  badgeBorder: string;
  dotColor: string;
  processingDays: string;
  autoApprove: boolean;
  staffChecklist: boolean;
  premiumServices: boolean;
  businessServices: boolean;
}

export const TIER_CONFIG: Record<VerificationTier, TierInfo> = {
  UNVERIFIED: {
    tier: "UNVERIFIED",
    label: { en: "Unverified", sw: "Haijathibitishwa" },
    color: "red",
    badgeBg: "bg-red-100", badgeText: "text-red-700", badgeBorder: "border-red-300",
    dotColor: "bg-red-500",
    processingDays: "5-7", autoApprove: false, staffChecklist: true,
    premiumServices: false, businessServices: false,
  },
  PHONE_VERIFIED: {
    tier: "PHONE_VERIFIED",
    label: { en: "Phone Verified", sw: "Simu Imethibitishwa" },
    color: "yellow",
    badgeBg: "bg-amber-100", badgeText: "text-amber-700", badgeBorder: "border-amber-300",
    dotColor: "bg-amber-400",
    processingDays: "2-5", autoApprove: false, staffChecklist: true,
    premiumServices: false, businessServices: false,
  },
  EMAIL_VERIFIED: {
    tier: "EMAIL_VERIFIED",
    label: { en: "Email Verified", sw: "Barua Pepe Imethibitishwa" },
    color: "yellow",
    badgeBg: "bg-amber-100", badgeText: "text-amber-700", badgeBorder: "border-amber-300",
    dotColor: "bg-amber-400",
    processingDays: "2-5", autoApprove: false, staffChecklist: true,
    premiumServices: false, businessServices: false,
  },
  PROFILE_COMPLETED: {
    tier: "PROFILE_COMPLETED",
    label: { en: "Profile Completed", sw: "Wasifu Umekamilika" },
    color: "orange",
    badgeBg: "bg-orange-100", badgeText: "text-orange-700", badgeBorder: "border-orange-300",
    dotColor: "bg-orange-500",
    processingDays: "1-3", autoApprove: false, staffChecklist: false,
    premiumServices: false, businessServices: false,
  },
  PENDING_OFFICE_VISIT: {
    tier: "PENDING_OFFICE_VISIT",
    label: { en: "Pending Office Visit", sw: "Inasubiri Ziara ya Ofisi" },
    color: "gray",
    badgeBg: "bg-stone-100", badgeText: "text-stone-600", badgeBorder: "border-stone-300",
    dotColor: "bg-stone-400",
    processingDays: "1-2", autoApprove: false, staffChecklist: false,
    premiumServices: false, businessServices: false,
  },
  NIDA_VERIFIED: {
    tier: "NIDA_VERIFIED",
    label: { en: "NIDA Verified", sw: "NIDA Imethibitishwa" },
    color: "green",
    badgeBg: "bg-emerald-100", badgeText: "text-emerald-700", badgeBorder: "border-emerald-300",
    dotColor: "bg-emerald-500",
    processingDays: "Instant", autoApprove: true, staffChecklist: false,
    premiumServices: true, businessServices: true,
  },
};

// ── Derive tier from UserProfile ─────────────────────────────────────────────
export function getUserTier(user: Partial<UserProfile> | null | undefined): VerificationTier {
  if (!user) return "UNVERIFIED";

  // Explicit verification_level field (preferred)
  const lvl = (user as Record<string, unknown>).verification_level as string | undefined;
  if (lvl === "NIDA_VERIFIED") return "NIDA_VERIFIED";
  if (lvl === "PENDING_OFFICE_VISIT") return "PENDING_OFFICE_VISIT";
  if (lvl === "PROFILE_COMPLETED") return "PROFILE_COMPLETED";
  if (lvl === "EMAIL_VERIFIED") return "EMAIL_VERIFIED";
  if (lvl === "PHONE_VERIFIED") return "PHONE_VERIFIED";

  // Fallback: derive from existing flags
  if (user.nida_number && user.is_verified) return "NIDA_VERIFIED";

  if (user.is_verified) {
    // Check profile completeness
    const hasProfile = !!(
      user.first_name && user.last_name && user.region &&
      user.district && user.ward && (user.phone || user.is_diaspora)
    );
    if (hasProfile) return "PROFILE_COMPLETED";
    return user.is_diaspora ? "EMAIL_VERIFIED" : "PHONE_VERIFIED";
  }

  return "UNVERIFIED";
}

// ── Profile completion score (0–100) ─────────────────────────────────────────
export function getProfileCompletion(user: Partial<UserProfile> | null | undefined): number {
  if (!user) return 0;
  const checks = [
    !!user.first_name, !!user.last_name,
    !!user.phone || !!user.is_diaspora,
    !!user.email,
    !!user.region, !!user.district, !!user.ward,
    !!user.street,
    !!user.date_of_birth || !!user.birth_date,
    !!user.nida_number || !!user.passport_number,
  ];
  return Math.round((checks.filter(Boolean).length / checks.length) * 100);
}

// ── Service access gating ────────────────────────────────────────────────────
export type ServiceAccessLevel = "full" | "limited" | "locked";

// Services locked until NIDA_VERIFIED
const PREMIUM_SERVICE_IDS = [
  "Makubaliano ya Mauzo",
  "Makubaliano ya Pango",
  "Malipo na Michango",
  "Migogoro na Mashauri",
];

export function getServiceAccess(
  serviceName: string,
  tier: VerificationTier,
): ServiceAccessLevel {
  if (tier === "NIDA_VERIFIED") return "full";
  if (PREMIUM_SERVICE_IDS.includes(serviceName)) return "locked";
  if (tier === "UNVERIFIED") return "locked";
  return "limited"; // can submit but goes to manual review
}

export function getTierInfo(tier: VerificationTier): TierInfo {
  return TIER_CONFIG[tier];
}
