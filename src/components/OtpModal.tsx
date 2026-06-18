/**
 * OtpModal — Reusable OTP popup
 *
 * - Shows a centred modal overlay with 6 individual digit boxes
 * - Default placeholder: 123456 (dev/demo mode)
 * - Supports phone (SMS) and email channels
 * - Confirm button triggers onVerify(code)
 * - Resend triggers onResend()
 * - Lockout display when attempts exhausted
 */
import React, { useRef, useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  Phone,
  Mail,
  CheckCircle2,
  AlertCircle,
  Loader2,
  RefreshCw,
  ShieldCheck,
} from "lucide-react";
import { cn } from "@/lib/utils";

export interface OtpModalProps {
  open: boolean;
  channel: "sms" | "email";
  destination: string; // phone number or email
  loading?: boolean;
  attempts?: number;
  maxAttempts?: number;
  lockedUntil?: number | null; // ms timestamp
  error?: string | null;
  onVerify: (code: string) => void;
  onResend: () => void;
  onClose: () => void;
  lang?: string;
}

const DEFAULT_OTP = "123456";
const DIGIT_COUNT = 6;

export const OtpModal: React.FC<OtpModalProps> = ({
  open,
  channel,
  destination,
  loading = false,
  attempts = 0,
  maxAttempts = 5,
  lockedUntil = null,
  error = null,
  onVerify,
  onResend,
  onClose,
  lang = "en",
}) => {
  const sw = lang === "sw";
  const L = (s: string, e: string) => (sw ? s : e);

  const [digits, setDigits] = useState<string[]>(Array(DIGIT_COUNT).fill(""));
  const [resendCooldown, setResendCooldown] = useState(0);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Pre-fill with default 123456 placeholder when modal opens
  useEffect(() => {
    if (open) {
      setDigits(DEFAULT_OTP.split(""));
      // focus first box after a tick
      setTimeout(() => inputRefs.current[0]?.focus(), 80);
    } else {
      setDigits(Array(DIGIT_COUNT).fill(""));
    }
  }, [open]);

  // Resend cooldown timer (30s)
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const t = setTimeout(() => setResendCooldown((v) => v - 1), 1000);
    return () => clearTimeout(t);
  }, [resendCooldown]);

  const currentCode = digits.join("");
  const isComplete = currentCode.length === DIGIT_COUNT;
  const isLocked = lockedUntil != null && Date.now() < lockedUntil;
  const lockMins = isLocked ? Math.ceil((lockedUntil! - Date.now()) / 60000) : 0;

  // ── Digit input handling ──────────────────────────────────────────────────
  const handleDigitChange = useCallback(
    (idx: number, value: string) => {
      // Paste handling — accept full 6-digit paste on any box
      if (value.length > 1) {
        const clean = value.replace(/\D/g, "").slice(0, DIGIT_COUNT);
        if (clean.length === DIGIT_COUNT) {
          setDigits(clean.split(""));
          inputRefs.current[DIGIT_COUNT - 1]?.focus();
          return;
        }
      }
      const digit = value.replace(/\D/g, "").slice(-1);
      const next = [...digits];
      next[idx] = digit;
      setDigits(next);
      if (digit && idx < DIGIT_COUNT - 1) {
        inputRefs.current[idx + 1]?.focus();
      }
    },
    [digits],
  );

  const handleKeyDown = useCallback(
    (idx: number, e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Backspace") {
        if (digits[idx]) {
          const next = [...digits];
          next[idx] = "";
          setDigits(next);
        } else if (idx > 0) {
          inputRefs.current[idx - 1]?.focus();
        }
      }
      if (e.key === "ArrowLeft" && idx > 0) inputRefs.current[idx - 1]?.focus();
      if (e.key === "ArrowRight" && idx < DIGIT_COUNT - 1) inputRefs.current[idx + 1]?.focus();
    },
    [digits],
  );

  const handleConfirm = () => {
    if (!isComplete || loading || isLocked) return;
    onVerify(currentCode);
  };

  const handleResend = () => {
    if (resendCooldown > 0 || loading) return;
    setDigits(DEFAULT_OTP.split(""));
    setResendCooldown(30);
    onResend();
  };

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            key="otp-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] bg-stone-900/70 backdrop-blur-sm"
            onClick={onClose}
          />

          {/* Modal */}
          <motion.div
            key="otp-modal"
            initial={{ opacity: 0, scale: 0.9, y: 24 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 24 }}
            transition={{ type: "spring", stiffness: 420, damping: 28 }}
            className="fixed inset-0 z-[201] flex items-center justify-center p-4 pointer-events-none"
          >
            <div
              className="pointer-events-auto w-full max-w-sm bg-white rounded-3xl shadow-2xl overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div
                className={cn(
                  "px-6 py-5 flex items-start justify-between",
                  channel === "sms"
                    ? "bg-gradient-to-br from-emerald-600 to-emerald-700"
                    : "bg-gradient-to-br from-blue-600 to-blue-700",
                )}
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-white/20 rounded-2xl flex items-center justify-center shrink-0">
                    {channel === "sms" ? (
                      <Phone size={20} className="text-white" />
                    ) : (
                      <Mail size={20} className="text-white" />
                    )}
                  </div>
                  <div>
                    <h3 className="font-black text-white text-base leading-tight">
                      {channel === "sms"
                        ? L("Thibitisha Simu", "Verify Phone")
                        : L("Thibitisha Barua Pepe", "Verify Email")}
                    </h3>
                    <p className="text-white/70 text-xs mt-0.5 font-medium">
                      {channel === "sms"
                        ? L("Namba 6 imetumwa kwa SMS", "6-digit code sent via SMS")
                        : L("Namba 6 imetumwa kwa barua pepe", "6-digit code sent via email")}
                    </p>
                  </div>
                </div>
                <button
                  onClick={onClose}
                  className="p-1.5 hover:bg-white/20 rounded-xl transition-colors text-white/80 hover:text-white"
                  aria-label="Close"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Body */}
              <div className="px-6 py-6 space-y-5">
                {/* Destination */}
                <div className="flex items-center gap-2 p-3 bg-stone-50 rounded-xl border border-stone-200">
                  {channel === "sms" ? (
                    <Phone size={14} className="text-stone-400 shrink-0" />
                  ) : (
                    <Mail size={14} className="text-stone-400 shrink-0" />
                  )}
                  <p className="text-sm text-stone-600 font-medium truncate">{destination}</p>
                </div>

                {/* Dev/demo hint */}
                <div className="flex items-center gap-2 px-3 py-2 bg-amber-50 border border-amber-200 rounded-xl">
                  <ShieldCheck size={13} className="text-amber-600 shrink-0" />
                  <p className="text-[11px] text-amber-700 font-medium">
                    {L("Demo: Namba ya default ni 123456", "Demo mode: default code is 123456")}
                  </p>
                </div>

                {/* Lockout state */}
                {isLocked ? (
                  <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-center">
                    <AlertCircle size={20} className="text-red-500 mx-auto mb-2" />
                    <p className="text-sm font-bold text-red-700">
                      {L(
                        `Umezuiwa kwa dakika ${lockMins}`,
                        `Locked for ${lockMins} minute${lockMins !== 1 ? "s" : ""}`,
                      )}
                    </p>
                    <p className="text-xs text-red-500 mt-1">
                      {L("Majaribio mengi yamefeli.", "Too many failed attempts.")}
                    </p>
                  </div>
                ) : (
                  <>
                    {/* 6 digit boxes */}
                    <div className="flex gap-2 justify-center">
                      {Array.from({ length: DIGIT_COUNT }).map((_, idx) => (
                        <input
                          key={idx}
                          ref={(el) => {
                            inputRefs.current[idx] = el;
                          }}
                          type="text"
                          inputMode="numeric"
                          maxLength={6}
                          value={digits[idx]}
                          onChange={(e) => handleDigitChange(idx, e.target.value)}
                          onKeyDown={(e) => handleKeyDown(idx, e)}
                          onFocus={(e) => e.target.select()}
                          placeholder={DEFAULT_OTP[idx]}
                          className={cn(
                            "w-11 h-14 text-center text-2xl font-black font-mono rounded-xl border-2 outline-none transition-all",
                            digits[idx]
                              ? "border-emerald-500 bg-emerald-50 text-emerald-700"
                              : "border-stone-200 bg-stone-50 text-stone-400",
                            "focus:border-emerald-500 focus:bg-white focus:text-stone-900 focus:shadow-lg focus:shadow-emerald-100",
                            error && !digits[idx] && "border-red-300 bg-red-50",
                          )}
                        />
                      ))}
                    </div>

                    {/* Error */}
                    {error && (
                      <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-xl">
                        <AlertCircle size={14} className="text-red-500 shrink-0" />
                        <p className="text-xs text-red-600 font-medium">{error}</p>
                      </div>
                    )}

                    {/* Attempts indicator */}
                    {attempts > 0 && (
                      <div className="flex gap-1 justify-center">
                        {Array.from({ length: maxAttempts }).map((_, i) => (
                          <div
                            key={i}
                            className={cn(
                              "w-2 h-2 rounded-full transition-all",
                              i < attempts ? "bg-red-400" : "bg-stone-200",
                            )}
                          />
                        ))}
                      </div>
                    )}

                    {/* Confirm button */}
                    <button
                      type="button"
                      onClick={handleConfirm}
                      disabled={!isComplete || loading}
                      className={cn(
                        "w-full h-13 rounded-2xl font-bold text-base flex items-center justify-center gap-2 transition-all",
                        channel === "sms"
                          ? "bg-emerald-600 hover:bg-emerald-700 shadow-lg shadow-emerald-100"
                          : "bg-blue-600 hover:bg-blue-700 shadow-lg shadow-blue-100",
                        "text-white disabled:opacity-40",
                      )}
                    >
                      {loading ? (
                        <Loader2 size={18} className="animate-spin" />
                      ) : (
                        <>
                          <CheckCircle2 size={17} />
                          {L("Thibitisha", "Confirm")}
                        </>
                      )}
                    </button>
                  </>
                )}

                {/* Resend + validity */}
                <div className="flex items-center justify-between text-xs text-stone-400 pt-1">
                  <span>
                    {channel === "sms"
                      ? L("Halali dakika 10", "Valid for 10 min")
                      : L("Halali masaa 24", "Valid for 24 hrs")}
                  </span>
                  <button
                    type="button"
                    onClick={handleResend}
                    disabled={resendCooldown > 0 || loading || isLocked}
                    className="flex items-center gap-1 font-bold text-emerald-600 hover:underline disabled:text-stone-400 disabled:no-underline transition-colors"
                  >
                    <RefreshCw size={11} />
                    {resendCooldown > 0
                      ? L(`Tuma tena (${resendCooldown}s)`, `Resend (${resendCooldown}s)`)
                      : L("Tuma tena", "Resend")}
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default OtpModal;
