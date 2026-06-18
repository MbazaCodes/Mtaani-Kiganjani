/**
 * VerificationBadge — Compact tier badge for lists, cards, and headers
 */
import React from "react";
import { Shield, ShieldCheck, ShieldAlert, Clock, Mail, Phone } from "lucide-react";
import { cn } from "@/lib/utils";
import { type VerificationTier, getTierInfo } from "@/lib/verification";

interface VerificationBadgeProps {
  tier: VerificationTier;
  lang?: string;
  size?: "sm" | "md";
  showDot?: boolean;
}

const TIER_ICON: Record<VerificationTier, React.ReactNode> = {
  UNVERIFIED: <ShieldAlert size={11} />,
  PHONE_VERIFIED: <Phone size={11} />,
  EMAIL_VERIFIED: <Mail size={11} />,
  PROFILE_COMPLETED: <Shield size={11} />,
  PENDING_OFFICE_VISIT: <Clock size={11} />,
  NIDA_VERIFIED: <ShieldCheck size={11} />,
};

export const VerificationBadge: React.FC<VerificationBadgeProps> = ({
  tier,
  lang = "en",
  size = "sm",
  showDot = false,
}) => {
  const info = getTierInfo(tier);
  const label = lang === "sw" ? info.label.sw : info.label.en;

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 font-bold border rounded-full whitespace-nowrap",
        info.badgeBg,
        info.badgeText,
        info.badgeBorder,
        size === "sm" ? "px-2 py-0.5 text-[10px]" : "px-2.5 py-1 text-xs",
      )}
    >
      {showDot && <span className={cn("w-1.5 h-1.5 rounded-full shrink-0", info.dotColor)} />}
      {TIER_ICON[tier]}
      {label}
    </span>
  );
};

export default VerificationBadge;
