/**
 * VerificationStatusCard — Citizen dashboard widget
 *
 * Shows current tier, profile completion %, tier benefits,
 * and actionable next steps to upgrade.
 */
import React from "react";
import { motion } from "framer-motion";
import {
  ShieldCheck,
  Shield,
  ShieldAlert,
  Phone,
  Mail,
  Clock,
  CheckCircle2,
  Lock,
  ChevronRight,
  ArrowUpRight,
  Zap,
  Star,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  type VerificationTier,
  type TierInfo,
  getUserTier,
  getProfileCompletion,
  getTierInfo,
} from "@/lib/verification";
import type { UserProfile } from "@/lib/supabase";

interface VerificationStatusCardProps {
  user: Partial<UserProfile> | null;
  lang: string;
  onCompleteProfile?: () => void;
  onUploadId?: () => void;
  onBookVisit?: () => void;
}

// ── Tier step items ───────────────────────────────────────────────────────────
interface Step {
  id: VerificationTier;
  icon: React.ReactNode;
  label: { en: string; sw: string };
  desc: { en: string; sw: string };
  action?: { en: string; sw: string };
}

const STEPS: Step[] = [
  {
    id: "PHONE_VERIFIED",
    icon: <Phone size={14} />,
    label: { en: "Phone / Email Verified", sw: "Simu / Barua Pepe" },
    desc: { en: "Basic account created", sw: "Akaunti ya msingi imeundwa" },
  },
  {
    id: "PROFILE_COMPLETED",
    icon: <Shield size={14} />,
    label: { en: "Profile Completed", sw: "Wasifu Umekamilika" },
    desc: { en: "Fill all profile fields", sw: "Jaza sehemu zote za wasifu" },
    action: { en: "Complete Profile", sw: "Kamilisha Wasifu" },
  },
  {
    id: "NIDA_VERIFIED",
    icon: <ShieldCheck size={14} />,
    label: { en: "NIDA Verified", sw: "NIDA Imethibitishwa" },
    desc: { en: "Upload NIDA or visit office", sw: "Pakia NIDA au tembelea ofisi" },
    action: { en: "Get Verified", sw: "Thibitisha" },
  },
];

const TIER_ORDER: VerificationTier[] = [
  "UNVERIFIED",
  "PHONE_VERIFIED",
  "EMAIL_VERIFIED",
  "PROFILE_COMPLETED",
  "PENDING_OFFICE_VISIT",
  "NIDA_VERIFIED",
];

function tierRank(t: VerificationTier): number {
  return TIER_ORDER.indexOf(t);
}

// ── Benefits by tier ──────────────────────────────────────────────────────────
const BENEFITS: Record<
  "basic" | "standard" | "full",
  { en: string; sw: string; locked?: boolean }[]
> = {
  basic: [
    { en: "Submit all applications", sw: "Wasilisha maombi yote" },
    { en: "Track application status", sw: "Fuatilia hali ya maombi" },
    { en: "Chat with support", sw: "Zungumza na msaada" },
    { en: "1–5 working day processing", sw: "Muda wa usindikaji: siku 1–5 za kazi" },
  ],
  standard: [
    { en: "Faster processing (1–5 working days)", sw: "Kasi zaidi (siku 1–5 za kazi)" },
    { en: "Reduced info requests", sw: "Maombi machache ya nyongeza" },
    { en: "Higher trust score", sw: "Alama ya juu ya uaminifu" },
  ],
  full: [
    { en: "Instant auto-approval", sw: "Idhini ya papo hapo" },
    { en: "Same-day document issuance", sw: "Hati siku hiyo hiyo" },
    { en: "All services unlocked", sw: "Huduma zote zimefunguliwa" },
    { en: "Business & land services", sw: "Huduma za biashara na ardhi" },
    { en: "Priority support", sw: "Msaada wa kipaumbele" },
  ],
};

export const VerificationStatusCard: React.FC<VerificationStatusCardProps> = ({
  user,
  lang,
  onCompleteProfile,
  onUploadId,
  onBookVisit,
}) => {
  const tier = getUserTier(user);
  const info = getTierInfo(tier);
  const completion = getProfileCompletion(user);
  const isNida = tier === "NIDA_VERIFIED";
  const isPending = tier === "PENDING_OFFICE_VISIT";
  const L = (s: string, e: string) => (lang === "sw" ? s : e);

  // ── NIDA_VERIFIED — success card ──────────────────────────────────────────
  if (isNida) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-gradient-to-br from-emerald-600 to-emerald-700 rounded-2xl p-5 text-white shadow-lg shadow-emerald-200"
      >
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 bg-white/20 rounded-xl flex items-center justify-center">
              <ShieldCheck size={18} className="text-white" />
            </div>
            <div>
              <p className="font-black text-sm">{L("NIDA Imethibitishwa", "NIDA Verified")}</p>
              <p className="text-emerald-200 text-[11px] font-medium">
                {L("Ufikiaji Kamili", "Full Access")}
              </p>
            </div>
          </div>
          <span className="px-2 py-1 bg-white/20 rounded-lg text-[10px] font-black uppercase tracking-wide">
            {L("TIER 3", "TIER 3")}
          </span>
        </div>
        <div className="grid grid-cols-2 gap-2">
          {BENEFITS.full.map((b, i) => (
            <div
              key={i}
              className="flex items-center gap-1.5 text-[11px] font-medium text-emerald-100"
            >
              <Zap size={10} className="text-emerald-300 shrink-0" />
              {lang === "sw" ? b.sw : b.en}
            </div>
          ))}
        </div>
      </motion.div>
    );
  }

  // ── Pending office visit ──────────────────────────────────────────────────
  if (isPending) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-stone-50 border border-stone-200 rounded-2xl p-5"
      >
        <div className="flex items-center gap-3 mb-3">
          <div className="w-9 h-9 bg-stone-200 rounded-xl flex items-center justify-center">
            <Clock size={16} className="text-stone-500" />
          </div>
          <div>
            <p className="font-black text-sm text-stone-800">
              {L("Inasubiri Ziara ya Ofisi", "Office Visit Scheduled")}
            </p>
            <p className="text-stone-500 text-xs">
              {L("Tembelea ofisi ulete vitambulisho vyako", "Visit office with your ID documents")}
            </p>
          </div>
        </div>
        <button
          onClick={onBookVisit}
          className="w-full h-9 bg-stone-900 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 hover:bg-black transition-all"
        >
          <ArrowUpRight size={13} /> {L("Angalia Miadi", "View Appointment")}
        </button>
      </motion.div>
    );
  }

  // ── Main progress card ────────────────────────────────────────────────────
  const tierRankCurrent = tierRank(tier);

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white border border-stone-200 rounded-2xl overflow-hidden shadow-sm"
    >
      {/* Header */}
      <div className="px-5 py-4 border-b border-stone-100 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center", info.badgeBg)}>
            {tier === "UNVERIFIED" ? (
              <ShieldAlert size={15} className={info.badgeText} />
            ) : (
              <Shield size={15} className={info.badgeText} />
            )}
          </div>
          <div>
            <p className="text-sm font-black text-stone-900">
              {L("Hali ya Uthibitisho", "Verification Status")}
            </p>
            <p className={cn("text-[11px] font-bold", info.badgeText)}>
              {lang === "sw" ? info.label.sw : info.label.en}
            </p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-[10px] text-stone-400 font-medium">{L("Wasifu", "Profile")}</p>
          <p className="text-lg font-black text-stone-900">{completion}%</p>
        </div>
      </div>

      {/* Profile completion bar */}
      <div className="px-5 pt-3 pb-1">
        <div className="h-2 bg-stone-100 rounded-full overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${completion}%` }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            className={cn(
              "h-full rounded-full",
              isNida ? "bg-emerald-500" : completion >= 60 ? "bg-amber-400" : "bg-red-400",
            )}
          />
        </div>
      </div>

      {/* Tier step progress */}
      <div className="px-5 py-4 space-y-2">
        {STEPS.map((step, idx) => {
          const stepRank = tierRank(step.id);
          const done = tierRankCurrent >= stepRank;
          const active = tierRankCurrent === stepRank - 1; // next step
          return (
            <div
              key={step.id}
              className={cn(
                "flex items-center gap-3 p-2.5 rounded-xl transition-all",
                done
                  ? "bg-emerald-50"
                  : active
                    ? "bg-amber-50 border border-amber-200"
                    : "bg-stone-50",
              )}
            >
              <div
                className={cn(
                  "w-7 h-7 rounded-lg flex items-center justify-center shrink-0",
                  done
                    ? "bg-emerald-500 text-white"
                    : active
                      ? "bg-amber-400 text-white"
                      : "bg-stone-200 text-stone-400",
                )}
              >
                {done ? <CheckCircle2 size={14} /> : <Lock size={12} />}
              </div>
              <div className="flex-1 min-w-0">
                <p
                  className={cn(
                    "text-xs font-bold",
                    done ? "text-emerald-700" : active ? "text-amber-700" : "text-stone-400",
                  )}
                >
                  {lang === "sw" ? step.label.sw : step.label.en}
                </p>
                <p className="text-[10px] text-stone-400">
                  {lang === "sw" ? step.desc.sw : step.desc.en}
                </p>
              </div>
              {active && step.action && (
                <button
                  onClick={idx === 1 ? onCompleteProfile : onUploadId}
                  className="shrink-0 flex items-center gap-0.5 text-[11px] font-black text-amber-700 hover:text-amber-900"
                >
                  {lang === "sw" ? step.action.sw : step.action.en}
                  <ChevronRight size={12} />
                </button>
              )}
            </div>
          );
        })}
      </div>

      {/* Current tier benefits */}
      <div className="px-5 pb-4">
        <p className="text-[10px] font-black text-stone-400 uppercase tracking-widest mb-2">
          {L("Faida Zako Sasa", "Your Current Benefits")}
        </p>
        <div className="space-y-1">
          {(tier === "UNVERIFIED" || tier === "PHONE_VERIFIED" || tier === "EMAIL_VERIFIED"
            ? BENEFITS.basic
            : tier === "PROFILE_COMPLETED"
              ? [...BENEFITS.basic, ...BENEFITS.standard]
              : BENEFITS.full
          )
            .slice(0, 3)
            .map((b, i) => (
              <div key={i} className="flex items-center gap-1.5 text-[11px] text-stone-600">
                <CheckCircle2 size={10} className="text-emerald-500 shrink-0" />
                {lang === "sw" ? b.sw : b.en}
              </div>
            ))}
        </div>
      </div>

      {/* CTAs */}
      {tier !== "NIDA_VERIFIED" && (
        <div className="px-5 pb-5 flex gap-2">
          {tier !== "PROFILE_COMPLETED" && (
            <button
              onClick={onCompleteProfile}
              className="flex-1 h-9 bg-stone-900 hover:bg-black text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1 transition-all"
            >
              <Star size={11} /> {L("Kamilisha Wasifu", "Complete Profile")}
            </button>
          )}
          <button
            onClick={onUploadId}
            className="flex-1 h-9 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1 transition-all"
          >
            <Shield size={11} /> {L("Pakia NIDA", "Upload ID")}
          </button>
          <button
            onClick={onBookVisit}
            className="flex-1 h-9 bg-white border border-stone-200 hover:bg-stone-50 text-stone-700 rounded-xl text-xs font-bold flex items-center justify-center gap-1 transition-all"
          >
            <ArrowUpRight size={11} /> {L("Tembelea Ofisi", "Book Visit")}
          </button>
        </div>
      )}
    </motion.div>
  );
};

export default VerificationStatusCard;
