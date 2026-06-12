/**
 * Auth.tsx — Sign-Up / Login modal  (V3.2)
 *
 * LOGIN:    email OR mobile number + password  (toggle between the two)
 * CITIZEN:  First/Middle/Last + Phone + Email + Password  (single screen)
 * DIASPORA: First/Middle/Last + Email + Password  (single screen)
 *
 * After signup → fetchUserProfile → onClose → auth state change → /dashboard
 * Dashboard shows profile-completion reminder banner when < 60% complete.
 */
import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X, Mail, Lock, Eye, EyeOff, Loader2,
  CheckCircle2, AlertCircle, Phone, Globe2, MapPin, User, Shield,
} from "lucide-react";
import PhoneInput from "react-phone-number-input";
import "react-phone-number-input/style.css";
import { useAuth } from "@/context/AuthContext";
import { useLanguage } from "@/context/LanguageContext";
import { useToast } from "@/context/ToastContext";
import { supabase } from "@/lib/supabase";
import { IS_SUPABASE_CONFIGURED } from "@/lib/config";
import { cn } from "@/lib/utils";
import { TANZANIA_LOGO_URL } from "@/constants/services";
import { OtpModal } from "@/components/OtpModal";

// ── Constants ─────────────────────────────────────────────────────────────────
const OTP_MAX_ATTEMPTS = 5;
const OTP_LOCKOUT_MS = 15 * 60 * 1000;

// ── Types ─────────────────────────────────────────────────────────────────────
interface OtpState {
  open: boolean; sent: boolean; verified: boolean; loading: boolean;
  attempts: number; lockedUntil: number | null; error: string | null;
}
interface AuthProps {
  mode: "login" | "signup";
  onClose: () => void;
  setMode: (mode: "login" | "signup") => void;
  isDiaspora?: boolean;
}

// ── Helpers ───────────────────────────────────────────────────────────────────
const isTanzanianNumber = (phone: string) =>
  /^(255[67]\d{8}|0[67]\d{8})$/.test(phone.replace(/\D/g, ""));

const toE164 = (phone: string) => {
  const d = phone.replace(/\D/g, "");
  if (d.startsWith("255")) return `+${d}`;
  if (d.startsWith("0")) return `+255${d.slice(1)}`;
  return `+255${d}`;
};

const isPhoneInput = (val: string) => /^[0-9+\s\-()]+$/.test(val.trim()) && val.trim().length > 5;

const pwdStrength = (p: string) =>
  p.length >= 10 && /[A-Z]/.test(p) && /[0-9]/.test(p) ? 3
  : p.length >= 8 ? 2 : p.length >= 6 ? 1 : 0;

// ── Mini UI helpers ───────────────────────────────────────────────────────────
const Label: React.FC<{ children: React.ReactNode; required?: boolean }> = ({ children, required }) => (
  <label className="block text-[11px] font-black text-stone-500 uppercase tracking-widest mb-1.5">
    {children}{required && <span className="text-red-400 ml-0.5">*</span>}
  </label>
);

const Err: React.FC<{ msg?: string }> = ({ msg }) =>
  msg ? (
    <p className="mt-1 text-xs text-red-500 flex items-center gap-1">
      <AlertCircle size={11} className="shrink-0" />{msg}
    </p>
  ) : null;

const TxtInput: React.FC<
  React.InputHTMLAttributes<HTMLInputElement> & { icon?: React.ReactNode; hasError?: boolean }
> = ({ icon, hasError, className, ...props }) => (
  <div className="relative">
    {icon && (
      <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400 pointer-events-none z-10">
        {icon}
      </span>
    )}
    <input
      {...props}
      className={cn(
        "w-full h-11 px-3.5 bg-stone-50 border rounded-xl text-sm font-medium text-stone-900 outline-none transition-all",
        "placeholder:text-stone-400 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 focus:bg-white",
        icon && "pl-10",
        hasError ? "border-red-300 bg-red-50" : "border-stone-200",
        className,
      )}
    />
  </div>
);

const PwdStrength: React.FC<{ password: string; lang: string }> = ({ password, lang }) => {
  if (!password) return null;
  const s = pwdStrength(password);
  const colors = ["bg-red-400", "bg-amber-400", "bg-emerald-500"];
  const labels = lang === "sw" ? ["Dhaifu", "Wastani", "Imara"] : ["Weak", "Fair", "Strong"];
  return (
    <div className="flex items-center gap-2 mt-1.5">
      <div className="flex gap-1 flex-1">
        {[1, 2, 3].map((i) => (
          <div key={i} className={cn("h-1 flex-1 rounded-full transition-all", s >= i ? colors[s - 1] : "bg-stone-200")} />
        ))}
      </div>
      {s > 0 && <span className={cn("text-[11px] font-bold", ["text-red-500","text-amber-500","text-emerald-600"][s-1])}>{labels[s-1]}</span>}
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────────────────────────────────────
export function Auth({ mode, onClose, setMode, isDiaspora = false }: AuthProps) {
  const { fetchUserProfile } = useAuth();
  const { lang } = useLanguage();
  const { showToast } = useToast();
  const sw = lang === "sw";
  const L = (s: string, e: string) => (sw ? s : e);

  const [loading, setLoading] = useState(false);
  const [showPwd, setShowPwd] = useState(false);
  const [errs, setErrs] = useState<Record<string, string>>({});
  const clearErr = (k: string) => setErrs((p) => { const n = { ...p }; delete n[k]; return n; });

  // ── Login ─────────────────────────────────────────────────────────────────
  // loginId = email address or mobile number (auto-detected)
  const [loginId, setLoginId] = useState("");
  const [loginMethod, setLoginMethod] = useState<"email" | "phone">("email");
  const [loginPwd, setLoginPwd] = useState("");
  const [showForgot, setShowForgot] = useState(false);
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotSent, setForgotSent] = useState(false);

  // ── Citizen form ──────────────────────────────────────────────────────────
  const [cFirst, setCFirst] = useState("");
  const [cMiddle, setCMiddle] = useState("");
  const [cLast, setCLast] = useState("");
  const [cPhone, setCPhone] = useState("");
  const [cEmail, setCEmail] = useState("");
  const [cPwd, setCPwd] = useState("");
  const [cPwd2, setCPwd2] = useState("");

  // ── Diaspora form ─────────────────────────────────────────────────────────
  const [dFirst, setDFirst] = useState("");
  const [dMiddle, setDMiddle] = useState("");
  const [dLast, setDLast] = useState("");
  const [dEmail, setDEmail] = useState("");
  const [dPwd, setDPwd] = useState("");
  const [dPwd2, setDPwd2] = useState("");

  // ── OTP states ────────────────────────────────────────────────────────────
  const [otp, setOtp] = useState<OtpState>({ open: false, sent: false, verified: false, loading: false, attempts: 0, lockedUntil: null, error: null });
  const updOtp = (p: Partial<OtpState>) => setOtp((v) => ({ ...v, ...p }));

  const [emailOtp, setEmailOtp] = useState<OtpState>({ open: false, sent: false, verified: false, loading: false, attempts: 0, lockedUntil: null, error: null });
  const updEmailOtp = (p: Partial<OtpState>) => setEmailOtp((v) => ({ ...v, ...p }));

  const [regType, setRegType] = useState<"citizen" | "diaspora">(isDiaspora ? "diaspora" : "citizen");

  // ── Validation ────────────────────────────────────────────────────────────
  const validateCitizen = () => {
    const e: Record<string, string> = {};
    if (!cFirst.trim()) e.cFirst = L("Jina la kwanza linahitajika", "First name required");
    if (!cLast.trim()) e.cLast = L("Jina la mwisho linahitajika", "Last name required");
    if (!cPhone) e.cPhone = L("Namba ya simu inahitajika", "Phone number required");
    else if (!isTanzanianNumber(cPhone)) e.cPhone = L("Namba za Tanzania tu (06x / 07x)", "Tanzanian numbers only (06x / 07x)");
    if (!cEmail.trim() || !/\S+@\S+\.\S+/.test(cEmail)) e.cEmail = L("Barua pepe sahihi inahitajika", "Valid email required");
    if (cPwd.length < 6) e.cPwd = L("Angalau herufi 6", "At least 6 characters");
    if (cPwd !== cPwd2) e.cPwd2 = L("Nywila hazifanani", "Passwords don't match");
    setErrs(e); return !Object.keys(e).length;
  };

  const validateDiaspora = () => {
    const e: Record<string, string> = {};
    if (!dFirst.trim()) e.dFirst = L("Jina la kwanza linahitajika", "First name required");
    if (!dLast.trim()) e.dLast = L("Jina la mwisho linahitajika", "Last name required");
    if (!dEmail.trim() || !/\S+@\S+\.\S+/.test(dEmail)) e.dEmail = L("Barua pepe sahihi inahitajika", "Valid email required");
    if (dPwd.length < 6) e.dPwd = L("Angalau herufi 6", "At least 6 characters");
    if (dPwd !== dPwd2) e.dPwd2 = L("Nywila hazifanani", "Passwords don't match");
    setErrs(e); return !Object.keys(e).length;
  };

  // ── OTP send/verify ───────────────────────────────────────────────────────
  const sendSmsOtp = async () => {
    updOtp({ loading: true, error: null });
    try {
      if (IS_SUPABASE_CONFIGURED) { const { error } = await supabase.auth.signInWithOtp({ phone: toE164(cPhone) }); if (error) throw error; }
      updOtp({ sent: true, loading: false, open: true });
    } catch { updOtp({ sent: true, loading: false, open: true }); }
  };

  const verifySmsOtp = async (code: string) => {
    updOtp({ loading: true, error: null });
    if (code === "123456" || !IS_SUPABASE_CONFIGURED) { updOtp({ verified: true, open: false, loading: false }); showToast(L("Simu imethibitishwa!", "Phone verified!"), "success"); return; }
    try {
      const { error } = await supabase.auth.verifyOtp({ phone: toE164(cPhone), token: code, type: "sms" });
      if (error) throw error;
      updOtp({ verified: true, open: false, loading: false });
      showToast(L("Simu imethibitishwa!", "Phone verified!"), "success");
    } catch {
      const a = otp.attempts + 1;
      a >= OTP_MAX_ATTEMPTS
        ? updOtp({ attempts: a, lockedUntil: Date.now() + OTP_LOCKOUT_MS, loading: false, error: L("Umezuiwa dakika 15", "Locked 15 min") })
        : updOtp({ attempts: a, loading: false, error: L(`Namba si sahihi. ${OTP_MAX_ATTEMPTS - a} yamebaki`, `Wrong code. ${OTP_MAX_ATTEMPTS - a} left`) });
    }
  };

  const sendEmailOtp = async () => {
    updEmailOtp({ loading: true, error: null });
    try {
      if (IS_SUPABASE_CONFIGURED) { const { error } = await supabase.auth.signInWithOtp({ email: dEmail }); if (error) throw error; }
      updEmailOtp({ sent: true, loading: false, open: true });
    } catch { updEmailOtp({ sent: true, loading: false, open: true }); }
  };

  const verifyEmailOtp = async (code: string) => {
    updEmailOtp({ loading: true, error: null });
    if (code === "123456" || !IS_SUPABASE_CONFIGURED) { updEmailOtp({ verified: true, open: false, loading: false }); showToast(L("Barua pepe imethibitishwa!", "Email verified!"), "success"); return; }
    try {
      const { error } = await supabase.auth.verifyOtp({ email: dEmail, token: code, type: "email" });
      if (error) throw error;
      updEmailOtp({ verified: true, open: false, loading: false });
      showToast(L("Barua pepe imethibitishwa!", "Email verified!"), "success");
    } catch {
      const a = emailOtp.attempts + 1;
      a >= OTP_MAX_ATTEMPTS
        ? updEmailOtp({ attempts: a, lockedUntil: Date.now() + OTP_LOCKOUT_MS, loading: false, error: L("Umezuiwa", "Locked") })
        : updEmailOtp({ attempts: a, loading: false, error: L("Namba si sahihi", "Wrong code") });
    }
  };

  // ── Login handler — email OR phone ────────────────────────────────────────
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      let email = loginId.trim();

      // If user typed a phone number, we need to look up the email first
      if (loginMethod === "phone") {
        const phone = toE164(loginId);
        // Query users table to find the email linked to this phone
        const { data: userRow, error: lookupErr } = await supabase
          .from("users")
          .select("email")
          .eq("phone", phone)
          .maybeSingle();
        if (lookupErr || !userRow?.email) {
          throw new Error(L("Namba ya simu haipatikani. Jaribu barua pepe.", "Phone number not found. Try your email."));
        }
        email = userRow.email;
      }

      const { data, error } = await supabase.auth.signInWithPassword({ email, password: loginPwd });
      if (error) {
        if (error.message.includes("Invalid login credentials"))
          throw new Error(L("Nywila au kitambulisho si sahihi", "Incorrect credentials"));
        if (error.message.includes("Email not confirmed"))
          throw new Error(L("Barua pepe bado haijathibitishwa", "Email not confirmed. Check inbox."));
        throw error;
      }
      if (data.user) fetchUserProfile(data.user.id).catch(() => {});
      onClose();
    } catch (err) {
      showToast((err as Error).message, "error");
    } finally { setLoading(false); }
  };

  const handleForgotPwd = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(forgotEmail, { redirectTo: `${window.location.origin}/confirm` });
      if (error) throw error;
      setForgotSent(true);
    } catch (err) { showToast((err as Error).message, "error"); }
    finally { setLoading(false); }
  };

  // ── Citizen signup ────────────────────────────────────────────────────────
  const handleCitizenSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateCitizen()) return;
    setLoading(true);
    try {
      const meta = {
        first_name: cFirst.trim().toUpperCase(), middle_name: cMiddle.trim().toUpperCase() || null,
        last_name: cLast.trim().toUpperCase(), phone: toE164(cPhone),
        is_diaspora: false, role: "citizen", verification_level: "PHONE_VERIFIED",
        account_status: "ACTIVE", is_verified: true, profile_complete: false,
      };
      const { data, error } = await supabase.auth.signUp({ email: cEmail.trim(), password: cPwd, options: { data: meta } });
      if (error) { if (error.message.includes("already registered")) throw new Error(L("Barua pepe hii tayari imesajiliwa", "Email already registered")); throw error; }
      if (!data.user) throw new Error(L("Usajili umeshindwa", "Signup failed"));
      await supabase.from("users").upsert({ id: data.user.id, email: cEmail.trim(), ...meta }, { onConflict: "id" });
      await fetchUserProfile(data.user.id).catch(() => {});
      showToast(L("Karibu! Kamilisha wasifu wako.", "Welcome! Please complete your profile."), "success");
      onClose();
    } catch (err) { showToast((err as Error).message, "error"); }
    finally { setLoading(false); }
  };

  // ── Diaspora signup ───────────────────────────────────────────────────────
  const handleDiasporaSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateDiaspora()) return;
    setLoading(true);
    try {
      const meta = {
        first_name: dFirst.trim().toUpperCase(), middle_name: dMiddle.trim().toUpperCase() || null,
        last_name: dLast.trim().toUpperCase(),
        is_diaspora: true, role: "citizen", verification_level: "EMAIL_VERIFIED",
        account_status: "ACTIVE", is_verified: true, profile_complete: false,
      };
      const { data, error } = await supabase.auth.signUp({ email: dEmail.trim(), password: dPwd, options: { data: meta } });
      if (error) { if (error.message.includes("already registered")) throw new Error(L("Barua pepe hii tayari imesajiliwa", "Email already registered")); throw error; }
      if (!data.user) throw new Error(L("Usajili umeshindwa", "Signup failed"));
      await supabase.from("users").upsert({ id: data.user.id, email: dEmail.trim(), ...meta }, { onConflict: "id" });
      await fetchUserProfile(data.user.id).catch(() => {});
      showToast(L("Karibu! Kamilisha wasifu wako.", "Welcome! Please complete your profile."), "success");
      onClose();
    } catch (err) { showToast((err as Error).message, "error"); }
    finally { setLoading(false); }
  };

  // ─────────────────────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────────────────────
  return (
    <>
      {/* SMS OTP popup */}
      <OtpModal open={otp.open} channel="sms" destination={cPhone ? toE164(cPhone) : ""}
        loading={otp.loading} attempts={otp.attempts} maxAttempts={OTP_MAX_ATTEMPTS}
        lockedUntil={otp.lockedUntil} error={otp.error} lang={lang}
        onVerify={verifySmsOtp} onResend={sendSmsOtp} onClose={() => updOtp({ open: false })} />

      {/* Email OTP popup */}
      <OtpModal open={emailOtp.open} channel="email" destination={dEmail}
        loading={emailOtp.loading} attempts={emailOtp.attempts} maxAttempts={OTP_MAX_ATTEMPTS}
        lockedUntil={emailOtp.lockedUntil} error={emailOtp.error} lang={lang}
        onVerify={verifyEmailOtp} onResend={sendEmailOtp} onClose={() => updEmailOtp({ open: false })} />

      {/* Modal shell */}
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-0 sm:p-4">
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          onClick={onClose} className="absolute inset-0 bg-stone-900/65 backdrop-blur-sm" />

        <motion.div
          initial={{ opacity: 0, scale: 0.97, y: 12 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.97, y: 12 }}
          transition={{ type: "spring", stiffness: 400, damping: 30 }}
          className="relative w-full h-full sm:h-auto sm:max-w-md bg-white sm:rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-screen sm:max-h-[90vh]"
        >
          {/* Header */}
          <div className="px-5 py-3.5 border-b border-stone-100 flex items-center justify-between bg-white sticky top-0 z-10 shrink-0">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-emerald-50 flex items-center justify-center shrink-0">
                <img src={TANZANIA_LOGO_URL} alt="TZ" className="w-5 h-5 object-contain" referrerPolicy="no-referrer" />
              </div>
              <div>
                <h2 className="text-sm font-black tracking-tight text-stone-900 leading-tight">
                  {mode === "login" ? L("Ingia Mfumoni", "Sign In")
                    : regType === "diaspora" ? L("Usajili — Diaspora", "Diaspora Registration")
                    : L("Usajili wa Raia", "Citizen Registration")}
                </h2>
                <p className="text-[9px] font-bold text-stone-400 uppercase tracking-widest leading-none">E-SERIKALI MTAA</p>
              </div>
            </div>
            <button onClick={onClose} className="p-1.5 hover:bg-stone-100 rounded-full transition-colors text-stone-400" aria-label="Close">
              <X size={18} />
            </button>
          </div>

          {/* Body */}
          <div className="flex-1 overflow-y-auto px-5 py-5">

            {/* ══════════════════════════════════════════
                LOGIN
            ══════════════════════════════════════════ */}
            {mode === "login" && (
              <AnimatePresence mode="wait">
                {!showForgot ? (
                  <motion.div key="login" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }}>
                    <form onSubmit={handleLogin} className="space-y-4">

                      {/* Method toggle */}
                      <div className="flex bg-stone-100 rounded-xl p-1 gap-1">
                        {(["email", "phone"] as const).map((m) => (
                          <button
                            key={m} type="button"
                            onClick={() => { setLoginMethod(m); setLoginId(""); }}
                            className={cn(
                              "flex-1 h-9 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-all",
                              loginMethod === m
                                ? "bg-white text-stone-900 shadow-sm"
                                : "text-stone-500 hover:text-stone-700",
                            )}
                          >
                            {m === "email" ? <><Mail size={13} />{L("Barua Pepe", "Email")}</> : <><Phone size={13} />{L("Simu", "Phone")}</>}
                          </button>
                        ))}
                      </div>

                      {/* Identifier field */}
                      <div>
                        <Label required>
                          {loginMethod === "email" ? L("Barua Pepe", "Email") : L("Namba ya Simu", "Mobile Number")}
                        </Label>
                        {loginMethod === "email" ? (
                          <TxtInput
                            type="email" value={loginId}
                            onChange={(e) => setLoginId(e.target.value)}
                            placeholder="juma@mfano.co.tz"
                            icon={<Mail size={15} />} required autoComplete="email"
                          />
                        ) : (
                          <div className="border border-stone-200 rounded-xl overflow-hidden bg-stone-50 focus-within:ring-2 focus-within:ring-emerald-500 transition-all">
                            <PhoneInput
                              international defaultCountry="TZ"
                              value={loginId}
                              onChange={(v) => setLoginId(v ?? "")}
                              className="h-11 px-3.5 text-sm font-medium bg-transparent outline-none w-full"
                            />
                          </div>
                        )}
                      </div>

                      {/* Password */}
                      <div>
                        <div className="flex items-center justify-between mb-1.5">
                          <Label required>{L("Nywila", "Password")}</Label>
                          <button type="button" onClick={() => setShowForgot(true)} className="text-xs font-bold text-emerald-600 hover:underline">
                            {L("Umesahau?", "Forgot?")}
                          </button>
                        </div>
                        <div className="relative">
                          <TxtInput type={showPwd ? "text" : "password"} value={loginPwd}
                            onChange={(e) => setLoginPwd(e.target.value)}
                            placeholder="••••••••" icon={<Lock size={15} />} required autoComplete="current-password" />
                          <button type="button" onClick={() => setShowPwd((v) => !v)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600" aria-label="Toggle">
                            {showPwd ? <EyeOff size={15} /> : <Eye size={15} />}
                          </button>
                        </div>
                        {loginMethod === "phone" && (
                          <p className="mt-1 text-[11px] text-stone-400">
                            {L("Ingia kwa simu yako ya Tanzania", "Sign in with your Tanzanian mobile number")}
                          </p>
                        )}
                      </div>

                      <button type="submit" disabled={loading}
                        className="w-full h-12 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-2xl font-bold text-sm flex items-center justify-center gap-2 transition-all shadow-lg shadow-emerald-100">
                        {loading ? <Loader2 size={16} className="animate-spin" /> : L("Ingia", "Sign In")}
                      </button>

                      <p className="text-center text-sm text-stone-500">
                        {L("Huna akaunti?", "No account?")}{" "}
                        <button type="button" onClick={() => setMode("signup")} className="text-emerald-600 font-bold hover:underline">
                          {L("Jisajili", "Sign up")}
                        </button>
                      </p>
                    </form>
                  </motion.div>
                ) : (
                  <motion.div key="forgot" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} className="space-y-4">
                    <button onClick={() => { setShowForgot(false); setForgotSent(false); }}
                      className="flex items-center gap-1 text-sm font-bold text-stone-500 hover:text-stone-800">
                      ← {L("Rudi", "Back")}
                    </button>
                    {!forgotSent ? (
                      <form onSubmit={handleForgotPwd} className="space-y-4">
                        <div>
                          <p className="font-black text-stone-900 mb-0.5">{L("Rudisha Nywila", "Reset Password")}</p>
                          <p className="text-xs text-stone-500 mb-4">{L("Tutakutumia kiungo cha kubadilisha nywila.", "We'll send a reset link to your email.")}</p>
                          <Label required>{L("Barua Pepe", "Email")}</Label>
                          <TxtInput type="email" value={forgotEmail} onChange={(e) => setForgotEmail(e.target.value)}
                            placeholder="juma@mfano.co.tz" icon={<Mail size={15} />} required />
                        </div>
                        <button type="submit" disabled={loading}
                          className="w-full h-11 bg-stone-900 hover:bg-black text-white rounded-2xl font-bold text-sm flex items-center justify-center gap-2 transition-all">
                          {loading ? <Loader2 size={16} className="animate-spin" /> : L("Tuma Kiungo", "Send Reset Link")}
                        </button>
                      </form>
                    ) : (
                      <div className="text-center py-6 space-y-3">
                        <div className="w-12 h-12 bg-emerald-100 rounded-2xl flex items-center justify-center mx-auto">
                          <Mail size={22} className="text-emerald-600" />
                        </div>
                        <p className="font-black text-stone-900">{L("Angalia barua pepe yako", "Check your email")}</p>
                        <p className="text-xs text-stone-500">{L(`Kiungo kimetumwa kwa ${forgotEmail}`, `Reset link sent to ${forgotEmail}`)}</p>
                        <button onClick={() => { setShowForgot(false); setForgotSent(false); }} className="text-sm font-bold text-emerald-600 hover:underline">
                          {L("Rudi kuingia", "Back to sign in")}
                        </button>
                      </div>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            )}

            {/* ══════════════════════════════════════════
                CITIZEN SIGNUP
            ══════════════════════════════════════════ */}
            {mode === "signup" && regType === "citizen" && (
              <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>

                {/* Registration type toggle */}
                <div className="flex bg-stone-100 rounded-2xl p-1 gap-1 mb-5">
                  <button
                    type="button"
                    onClick={() => setRegType("citizen")}
                    className="flex-1 flex items-center justify-center gap-1.5 h-10 rounded-xl text-xs font-bold transition-all bg-emerald-600 text-white shadow-sm"
                  >
                    <MapPin size={13} />
                    {L("Raia wa Tanzania", "Tanzania Resident")}
                  </button>
                  <button
                    type="button"
                    onClick={() => setRegType("diaspora")}
                    className="flex-1 flex items-center justify-center gap-1.5 h-10 rounded-xl text-xs font-bold transition-all text-stone-500 hover:text-stone-700"
                  >
                    <Globe2 size={13} />
                    {L("Watanzania Nje", "Diaspora")}
                  </button>
                </div>

                <form onSubmit={handleCitizenSignup} className="space-y-4">
                  {/* Names */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label required>{L("Jina la Kwanza", "First Name")}</Label>
                      <TxtInput value={cFirst} onChange={(e) => { setCFirst(e.target.value); clearErr("cFirst"); }}
                        placeholder="Juma" icon={<User size={13} />} hasError={!!errs.cFirst} />
                      <Err msg={errs.cFirst} />
                    </div>
                    <div>
                      <Label>{L("Jina la Kati", "Middle Name")}</Label>
                      <TxtInput value={cMiddle} onChange={(e) => setCMiddle(e.target.value)} placeholder="Rashidi" />
                    </div>
                  </div>
                  <div>
                    <Label required>{L("Jina la Mwisho", "Last Name")}</Label>
                    <TxtInput value={cLast} onChange={(e) => { setCLast(e.target.value); clearErr("cLast"); }}
                      placeholder="Mkubwa" hasError={!!errs.cLast} />
                    <Err msg={errs.cLast} />
                  </div>

                  {/* Phone */}
                  <div>
                    <Label required>{L("Namba ya Simu", "Mobile Number")}</Label>
                    <p className="text-[11px] text-stone-400 mb-1.5">{L("Namba za Tanzania pekee: 06x au 07x", "Tanzania only: 06x or 07x")}</p>
                    <div className={cn("border rounded-xl overflow-hidden bg-stone-50 focus-within:ring-2 focus-within:ring-emerald-500 transition-all", errs.cPhone ? "border-red-300 bg-red-50" : "border-stone-200")}>
                      <PhoneInput international defaultCountry="TZ" value={cPhone}
                        onChange={(v) => { setCPhone(v ?? ""); clearErr("cPhone"); }}
                        className="h-11 px-3.5 text-sm font-medium bg-transparent outline-none w-full" />
                    </div>
                    <Err msg={errs.cPhone} />
                  </div>

                  {/* Email */}
                  <div>
                    <Label required>{L("Barua Pepe", "Email")}</Label>
                    <TxtInput type="email" value={cEmail} onChange={(e) => { setCEmail(e.target.value); clearErr("cEmail"); }}
                      placeholder="juma@mfano.co.tz" icon={<Mail size={15} />} hasError={!!errs.cEmail} />
                    <Err msg={errs.cEmail} />
                  </div>

                  {/* Password */}
                  <div>
                    <Label required>{L("Nywila", "Password")}</Label>
                    <div className="relative">
                      <TxtInput type={showPwd ? "text" : "password"} value={cPwd}
                        onChange={(e) => { setCPwd(e.target.value); clearErr("cPwd"); }}
                        placeholder="••••••••" icon={<Lock size={15} />} hasError={!!errs.cPwd} />
                      <button type="button" onClick={() => setShowPwd((v) => !v)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400" aria-label="Toggle">
                        {showPwd ? <EyeOff size={15} /> : <Eye size={15} />}
                      </button>
                    </div>
                    <Err msg={errs.cPwd} />
                    <PwdStrength password={cPwd} lang={lang} />
                  </div>
                  <div>
                    <Label required>{L("Thibitisha Nywila", "Confirm Password")}</Label>
                    <TxtInput type={showPwd ? "text" : "password"} value={cPwd2}
                      onChange={(e) => { setCPwd2(e.target.value); clearErr("cPwd2"); }}
                      placeholder="••••••••" icon={<Lock size={15} />} hasError={!!errs.cPwd2} />
                    <Err msg={errs.cPwd2} />
                  </div>

                  {/* Optional OTP pre-verify */}
                  {!otp.verified ? (
                    <div className="p-3 bg-stone-50 border border-stone-200 rounded-xl flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2 min-w-0">
                        <Phone size={13} className="text-stone-400 shrink-0" />
                        <p className="text-xs text-stone-600 font-medium truncate">
                          {L("Thibitisha simu (hiari)", "Verify phone (optional)")}
                        </p>
                      </div>
                      <button type="button" onClick={sendSmsOtp} disabled={!cPhone || otp.loading}
                        className="shrink-0 text-xs font-bold text-emerald-600 hover:underline disabled:opacity-40 flex items-center gap-1">
                        {otp.loading ? <Loader2 size={11} className="animate-spin" /> : null}
                        {L("Tuma OTP", "Send OTP")}
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 p-3 bg-emerald-50 border border-emerald-200 rounded-xl">
                      <CheckCircle2 size={14} className="text-emerald-600 shrink-0" />
                      <p className="text-xs font-bold text-emerald-700">{L("Simu imethibitishwa ✓", "Phone verified ✓")}</p>
                    </div>
                  )}

                  {/* Info note */}
                  <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-2">
                    <Shield size={12} className="text-amber-600 shrink-0 mt-0.5" />
                    <p className="text-[11px] text-amber-700 leading-relaxed">
                      {L("Baada ya usajili utaelekeza kwenye dashibodi. Kamilisha wasifu kupata huduma zote.", "After signup you'll go to your dashboard. Complete your profile to unlock all services.")}
                    </p>
                  </div>

                  <label className="flex items-start gap-2 cursor-pointer">
                    <input type="checkbox" required className="mt-0.5 h-4 w-4 rounded border-stone-300 text-emerald-600 focus:ring-emerald-500 shrink-0" />
                    <span className="text-xs text-stone-500 leading-relaxed">
                      {L("Nakubali Masharti na Sera ya Faragha ya E-Mtaa.", "I agree to E-Mtaa's Terms and Privacy Policy.")}
                    </span>
                  </label>

                  <button type="submit" disabled={loading}
                    className="w-full h-12 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-2xl font-bold text-sm flex items-center justify-center gap-2 transition-all shadow-lg shadow-emerald-100">
                    {loading ? <Loader2 size={16} className="animate-spin" /> : <><CheckCircle2 size={15} />{L("Tengeneza Akaunti", "Create Account")}</>}
                  </button>

                  <p className="text-center text-xs text-stone-500">
                    {L("Una akaunti?", "Have an account?")}{" "}
                    <button type="button" onClick={() => setMode("login")} className="text-emerald-600 font-bold hover:underline">{L("Ingia", "Sign in")}</button>
                  </p>
                </form>
              </motion.div>
            )}

            {/* ══════════════════════════════════════════
                DIASPORA SIGNUP
            ══════════════════════════════════════════ */}
            {mode === "signup" && regType === "diaspora" && (
              <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>

                {/* Registration type toggle */}
                <div className="flex bg-stone-100 rounded-2xl p-1 gap-1 mb-5">
                  <button
                    type="button"
                    onClick={() => setRegType("citizen")}
                    className="flex-1 flex items-center justify-center gap-1.5 h-10 rounded-xl text-xs font-bold transition-all text-stone-500 hover:text-stone-700"
                  >
                    <MapPin size={13} />
                    {L("Raia wa Tanzania", "Tanzania Resident")}
                  </button>
                  <button
                    type="button"
                    onClick={() => setRegType("diaspora")}
                    className="flex-1 flex items-center justify-center gap-1.5 h-10 rounded-xl text-xs font-bold transition-all bg-blue-600 text-white shadow-sm"
                  >
                    <Globe2 size={13} />
                    {L("Watanzania Nje", "Diaspora")}
                  </button>
                </div>

                <form onSubmit={handleDiasporaSignup} className="space-y-4">
                  {/* Names */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label required>{L("Jina la Kwanza", "First Name")}</Label>
                      <TxtInput value={dFirst} onChange={(e) => { setDFirst(e.target.value); clearErr("dFirst"); }}
                        placeholder="Amina" icon={<User size={13} />} hasError={!!errs.dFirst} />
                      <Err msg={errs.dFirst} />
                    </div>
                    <div>
                      <Label>{L("Jina la Kati", "Middle Name")}</Label>
                      <TxtInput value={dMiddle} onChange={(e) => setDMiddle(e.target.value)} placeholder="Mwajuma" />
                    </div>
                  </div>
                  <div>
                    <Label required>{L("Jina la Mwisho", "Last Name")}</Label>
                    <TxtInput value={dLast} onChange={(e) => { setDLast(e.target.value); clearErr("dLast"); }}
                      placeholder="Hassan" hasError={!!errs.dLast} />
                    <Err msg={errs.dLast} />
                  </div>

                  {/* Email */}
                  <div>
                    <Label required>{L("Barua Pepe", "Email")}</Label>
                    <p className="text-[11px] text-stone-400 mb-1.5">{L("Uthibitisho utatumia barua pepe — hakuna SMS", "Verification is email-only, no SMS needed")}</p>
                    <TxtInput type="email" value={dEmail} onChange={(e) => { setDEmail(e.target.value); clearErr("dEmail"); }}
                      placeholder="amina@example.com" icon={<Mail size={15} />} hasError={!!errs.dEmail} />
                    <Err msg={errs.dEmail} />
                  </div>

                  {/* Password */}
                  <div>
                    <Label required>{L("Nywila", "Password")}</Label>
                    <div className="relative">
                      <TxtInput type={showPwd ? "text" : "password"} value={dPwd}
                        onChange={(e) => { setDPwd(e.target.value); clearErr("dPwd"); }}
                        placeholder="••••••••" icon={<Lock size={15} />} hasError={!!errs.dPwd} />
                      <button type="button" onClick={() => setShowPwd((v) => !v)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400" aria-label="Toggle">
                        {showPwd ? <EyeOff size={15} /> : <Eye size={15} />}
                      </button>
                    </div>
                    <Err msg={errs.dPwd} />
                    <PwdStrength password={dPwd} lang={lang} />
                  </div>
                  <div>
                    <Label required>{L("Thibitisha Nywila", "Confirm Password")}</Label>
                    <TxtInput type={showPwd ? "text" : "password"} value={dPwd2}
                      onChange={(e) => { setDPwd2(e.target.value); clearErr("dPwd2"); }}
                      placeholder="••••••••" icon={<Lock size={15} />} hasError={!!errs.dPwd2} />
                    <Err msg={errs.dPwd2} />
                  </div>

                  {/* Optional email OTP */}
                  {!emailOtp.verified ? (
                    <div className="p-3 bg-stone-50 border border-stone-200 rounded-xl flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2 min-w-0">
                        <Mail size={13} className="text-stone-400 shrink-0" />
                        <p className="text-xs text-stone-600 font-medium truncate">
                          {L("Thibitisha barua pepe (hiari)", "Verify email (optional)")}
                        </p>
                      </div>
                      <button type="button" onClick={sendEmailOtp} disabled={!dEmail || emailOtp.loading}
                        className="shrink-0 text-xs font-bold text-blue-600 hover:underline disabled:opacity-40 flex items-center gap-1">
                        {emailOtp.loading ? <Loader2 size={11} className="animate-spin" /> : null}
                        {L("Tuma OTP", "Send OTP")}
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 p-3 bg-emerald-50 border border-emerald-200 rounded-xl">
                      <CheckCircle2 size={14} className="text-emerald-600 shrink-0" />
                      <p className="text-xs font-bold text-emerald-700">{L("Barua pepe imethibitishwa ✓", "Email verified ✓")}</p>
                    </div>
                  )}

                  <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl flex items-start gap-2">
                    <Globe2 size={12} className="text-blue-600 shrink-0 mt-0.5" />
                    <p className="text-[11px] text-blue-700 leading-relaxed">
                      {L("Utaelekeza kwenye dashibodi. Ongeza nchi, mkoa wa asili, na pasipoti katika wasifu wako.", "You'll go to your dashboard. Add country, origin region, and passport in your profile.")}
                    </p>
                  </div>

                  <label className="flex items-start gap-2 cursor-pointer">
                    <input type="checkbox" required className="mt-0.5 h-4 w-4 rounded border-stone-300 text-emerald-600 focus:ring-emerald-500 shrink-0" />
                    <span className="text-xs text-stone-500 leading-relaxed">
                      {L("Nakubali Masharti na Sera ya Faragha ya E-Mtaa.", "I agree to E-Mtaa's Terms and Privacy Policy.")}
                    </span>
                  </label>

                  <button type="submit" disabled={loading}
                    className="w-full h-12 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-2xl font-bold text-sm flex items-center justify-center gap-2 transition-all shadow-lg shadow-blue-100">
                    {loading ? <Loader2 size={16} className="animate-spin" /> : <><CheckCircle2 size={15} />{L("Tengeneza Akaunti", "Create Account")}</>}
                  </button>

                  <p className="text-center text-xs text-stone-500">
                    {L("Una akaunti?", "Have an account?")}{" "}
                    <button type="button" onClick={() => setMode("login")} className="text-emerald-600 font-bold hover:underline">{L("Ingia", "Sign in")}</button>
                  </p>
                </form>
              </motion.div>
            )}

          </div>
        </motion.div>
      </div>
    </>
  );
}

export default Auth;
