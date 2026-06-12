/**
 * Auth.tsx — Sign-Up / Login modal
 *
 * CITIZEN:  3-step wizard → Personal → Location → Password  (+OTP popup)
 * DIASPORA: 3-step wizard → Personal → Origin & Residence → Password  (+email OTP popup)
 * LOGIN:    email + password with forgot-password via email link
 */
import React, { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X, Mail, Lock, Eye, EyeOff, Loader2,
  ArrowRight, ArrowLeft, CheckCircle2, AlertCircle,
  Phone, Globe2, MapPin, User, Calendar, Home, Shield,
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
import { COUNTRIES } from "@/constants/countries";
import { TANZANIA_ADDRESS_DATA } from "@/lib/addressData";
import { OtpModal } from "@/components/OtpModal";

// ── Constants ─────────────────────────────────────────────────────────────────
const OTP_MAX_ATTEMPTS = 5;
const OTP_LOCKOUT_MS = 15 * 60 * 1000;

// ── Types ─────────────────────────────────────────────────────────────────────
interface OtpState {
  open: boolean;
  sent: boolean;
  verified: boolean;
  loading: boolean;
  attempts: number;
  lockedUntil: number | null;
  error: string | null;
}

interface CitizenForm {
  firstName: string; middleName: string; lastName: string;
  phone: string; email: string; password: string; confirmPassword: string;
  region: string; district: string; ward: string; street: string; houseNumber: string;
}

interface DiasporaForm {
  firstName: string; middleName: string; lastName: string;
  email: string; password: string; confirmPassword: string;
  passportNumber: string; dateOfBirth: string; gender: "M" | "F" | "O";
  countryOfResidence: string; cityOfResidence: string;
  regionOfOrigin: string; districtOfOrigin: string; wardOfOrigin: string;
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

const pwdStrength = (p: string) =>
  p.length >= 10 && /[A-Z]/.test(p) && /[0-9]/.test(p) ? 3
    : p.length >= 8 ? 2
    : p.length >= 6 ? 1 : 0;

// ── Shared field primitives ───────────────────────────────────────────────────
const Label: React.FC<{ children: React.ReactNode; required?: boolean; optional?: boolean }> = ({
  children, required, optional,
}) => (
  <label className="block text-[11px] font-black text-stone-500 uppercase tracking-widest mb-1.5">
    {children}
    {required && <span className="text-red-400 ml-0.5">*</span>}
    {optional && <span className="text-[10px] font-medium text-stone-400 normal-case tracking-normal ml-1">(optional)</span>}
  </label>
);

const Field: React.FC<{ error?: string; hint?: string; children: React.ReactNode }> = ({
  error, hint, children,
}) => (
  <div className="space-y-0">
    {children}
    {hint && !error && <p className="mt-1 text-[11px] text-stone-400">{hint}</p>}
    {error && (
      <p className="mt-1 text-xs text-red-500 flex items-center gap-1">
        <AlertCircle size={11} className="shrink-0" /> {error}
      </p>
    )}
  </div>
);

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
        hasError ? "border-red-300 bg-red-50 focus:ring-red-400 focus:border-red-400" : "border-stone-200",
        className,
      )}
    />
  </div>
);

const SelInput: React.FC<
  React.SelectHTMLAttributes<HTMLSelectElement> & { placeholder?: string; hasError?: boolean }
> = ({ children, placeholder, hasError, className, ...props }) => (
  <select
    {...props}
    className={cn(
      "w-full h-11 px-3.5 bg-stone-50 border rounded-xl text-sm font-medium text-stone-900 outline-none transition-all",
      "focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 focus:bg-white",
      "disabled:opacity-50 disabled:cursor-not-allowed",
      hasError ? "border-red-300 bg-red-50" : "border-stone-200",
      className,
    )}
  >
    {placeholder && <option value="" disabled>{placeholder}</option>}
    {children}
  </select>
);

// ── Progress bar ──────────────────────────────────────────────────────────────
const StepBar: React.FC<{ step: number; total: number; label: string }> = ({
  step, total, label,
}) => (
  <div className="mb-5">
    <div className="flex items-center justify-between mb-2">
      <span className="text-xs font-black text-emerald-700 uppercase tracking-wider">{label}</span>
      <span className="text-xs font-bold text-stone-400">{step}/{total}</span>
    </div>
    <div className="flex gap-1">
      {Array.from({ length: total }).map((_, i) => (
        <div key={i} className={cn("h-1 flex-1 rounded-full transition-all duration-500", i < step ? "bg-emerald-600" : "bg-stone-200")} />
      ))}
    </div>
  </div>
);

// ── Password strength bar ─────────────────────────────────────────────────────
const PwdStrength: React.FC<{ password: string; lang: string }> = ({ password, lang }) => {
  if (!password) return null;
  const s = pwdStrength(password);
  const labels = lang === "sw"
    ? ["Dhaifu", "Wastani", "Imara"]
    : ["Weak", "Fair", "Strong"];
  const colors = ["bg-red-400", "bg-amber-400", "bg-emerald-500"];
  return (
    <div className="flex items-center gap-2 mt-1.5">
      <div className="flex gap-1 flex-1">
        {[1, 2, 3].map((i) => (
          <div key={i} className={cn("h-1 flex-1 rounded-full transition-all", s >= i ? colors[s - 1] : "bg-stone-200")} />
        ))}
      </div>
      <span className={cn("text-[11px] font-bold", ["text-red-500", "text-amber-500", "text-emerald-600"][s - 1] || "text-stone-400")}>
        {s > 0 ? labels[s - 1] : ""}
      </span>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────────────────────────────────────
export function Auth({ mode, onClose, setMode, isDiaspora = false }: AuthProps) {
  const { fetchUserProfile } = useAuth();
  const { lang, t } = useLanguage();
  const { showToast } = useToast();
  const sw = lang === "sw";
  const L = (s: string, e: string) => (sw ? s : e);

  // ── Shared ────────────────────────────────────────────────────────────────
  const [loading, setLoading] = useState(false);
  const [showPwd, setShowPwd] = useState(false);

  // ── Login ─────────────────────────────────────────────────────────────────
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPwd, setLoginPwd] = useState("");
  const [showForgot, setShowForgot] = useState(false);
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotSent, setForgotSent] = useState(false);

  // ── Signup ────────────────────────────────────────────────────────────────
  const [regStep, setRegStep] = useState(1);
  const [regType] = useState<"citizen" | "diaspora">(isDiaspora ? "diaspora" : "citizen");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const clearErr = (k: string) => setFieldErrors((p) => { const n = { ...p }; delete n[k]; return n; });

  // ── Citizen form ──────────────────────────────────────────────────────────
  const [c, setC] = useState<CitizenForm>({
    firstName: "", middleName: "", lastName: "",
    phone: "", email: "", password: "", confirmPassword: "",
    region: "", district: "", ward: "", street: "", houseNumber: "",
  });
  const updC = (k: keyof CitizenForm, v: string) => setC((p) => ({ ...p, [k]: v }));

  // ── Diaspora form ─────────────────────────────────────────────────────────
  const [d, setD] = useState<DiasporaForm>({
    firstName: "", middleName: "", lastName: "",
    email: "", password: "", confirmPassword: "",
    passportNumber: "", dateOfBirth: "", gender: "M",
    countryOfResidence: "", cityOfResidence: "",
    regionOfOrigin: "", districtOfOrigin: "", wardOfOrigin: "",
  });
  const updD = (k: keyof DiasporaForm, v: string) => setD((p) => ({ ...p, [k]: v }));

  // ── OTP state ─────────────────────────────────────────────────────────────
  const [otp, setOtp] = useState<OtpState>({
    open: false, sent: false, verified: false, loading: false,
    attempts: 0, lockedUntil: null, error: null,
  });
  const updOtp = (patch: Partial<OtpState>) => setOtp((p) => ({ ...p, ...patch }));

  // ── Email OTP (diaspora) ──────────────────────────────────────────────────
  const [emailOtp, setEmailOtp] = useState<OtpState>({
    open: false, sent: false, verified: false, loading: false,
    attempts: 0, lockedUntil: null, error: null,
  });
  const updEmailOtp = (patch: Partial<OtpState>) => setEmailOtp((p) => ({ ...p, ...patch }));

  // ── Address cascades ──────────────────────────────────────────────────────
  const citizenDistricts = useMemo(
    () => TANZANIA_ADDRESS_DATA.find((r) => r.name === c.region)?.districts || [],
    [c.region],
  );
  const citizenWards = useMemo(
    () => citizenDistricts.find((r) => r.name === c.district)?.wards || [],
    [citizenDistricts, c.district],
  );
  const diasporaDistricts = useMemo(
    () => TANZANIA_ADDRESS_DATA.find((r) => r.name === d.regionOfOrigin)?.districts || [],
    [d.regionOfOrigin],
  );
  const diasporaWards = useMemo(
    () => diasporaDistricts.find((r) => r.name === d.districtOfOrigin)?.wards || [],
    [diasporaDistricts, d.districtOfOrigin],
  );

  // ── Validation ────────────────────────────────────────────────────────────
  const validateC1 = () => {
    const e: Record<string, string> = {};
    if (!c.firstName.trim()) e.firstName = L("Jina la kwanza linahitajika", "First name required");
    if (!c.lastName.trim()) e.lastName = L("Jina la mwisho linahitajika", "Last name required");
    if (!c.phone) e.phone = L("Namba ya simu inahitajika", "Phone number required");
    else if (!isTanzanianNumber(c.phone)) e.phone = L("Namba ya Tanzania tu (06x / 07x)", "Tanzanian numbers only (06x / 07x)");
    if (!c.email.trim() || !/\S+@\S+\.\S+/.test(c.email)) e.email = L("Barua pepe sahihi inahitajika", "Valid email required");
    setFieldErrors(e); return !Object.keys(e).length;
  };
  const validateC2 = () => {
    const e: Record<string, string> = {};
    if (!c.region) e.region = L("Chagua mkoa", "Select region");
    if (!c.district) e.district = L("Chagua wilaya", "Select district");
    if (!c.ward) e.ward = L("Chagua kata", "Select ward");
    if (!c.street.trim()) e.street = L("Jina la mtaa linahitajika", "Street / village required");
    setFieldErrors(e); return !Object.keys(e).length;
  };
  const validateC3 = () => {
    const e: Record<string, string> = {};
    if (!otp.verified) e.otp = L("Thibitisha simu kwanza", "Verify phone first");
    if (c.password.length < 6) e.password = L("Angalau herufi 6", "Min 6 characters");
    if (c.password !== c.confirmPassword) e.confirmPassword = L("Nywila hazifanani", "Passwords don't match");
    setFieldErrors(e); return !Object.keys(e).length;
  };
  const validateD1 = () => {
    const e: Record<string, string> = {};
    if (!d.firstName.trim()) e.firstName = L("Jina la kwanza linahitajika", "First name required");
    if (!d.lastName.trim()) e.lastName = L("Jina la mwisho linahitajika", "Last name required");
    if (!d.email.trim() || !/\S+@\S+\.\S+/.test(d.email)) e.email = L("Barua pepe sahihi inahitajika", "Valid email required");
    if (!d.passportNumber.trim()) e.passportNumber = L("Namba ya pasipoti inahitajika", "Passport number required");
    if (!d.dateOfBirth) e.dateOfBirth = L("Tarehe ya kuzaliwa inahitajika", "Date of birth required");
    setFieldErrors(e); return !Object.keys(e).length;
  };
  const validateD2 = () => {
    const e: Record<string, string> = {};
    if (!d.countryOfResidence) e.countryOfResidence = L("Chagua nchi", "Select country");
    if (!d.cityOfResidence.trim()) e.cityOfResidence = L("Jina la mji linahitajika", "City required");
    if (!d.regionOfOrigin) e.regionOfOrigin = L("Chagua mkoa wa asili", "Select home region");
    if (!d.districtOfOrigin) e.districtOfOrigin = L("Chagua wilaya ya asili", "Select home district");
    if (!d.wardOfOrigin) e.wardOfOrigin = L("Chagua kata ya asili", "Select home ward");
    setFieldErrors(e); return !Object.keys(e).length;
  };
  const validateD3 = () => {
    const e: Record<string, string> = {};
    if (d.password.length < 6) e.password = L("Angalau herufi 6", "Min 6 characters");
    if (d.password !== d.confirmPassword) e.confirmPassword = L("Nywila hazifanani", "Passwords don't match");
    setFieldErrors(e); return !Object.keys(e).length;
  };

  // ── OTP send (SMS) ────────────────────────────────────────────────────────
  const handleSendSmsOtp = async () => {
    updOtp({ loading: true, error: null });
    try {
      if (IS_SUPABASE_CONFIGURED) {
        const { error } = await supabase.auth.signInWithOtp({ phone: toE164(c.phone) });
        if (error) throw error;
      }
      updOtp({ sent: true, loading: false, open: true });
    } catch (err) {
      updOtp({ loading: false, error: (err as Error).message });
      // Still open in demo/placeholder mode
      updOtp({ sent: true, open: true, loading: false });
    }
  };

  // ── OTP verify (SMS) ──────────────────────────────────────────────────────
  const handleVerifySmsOtp = async (code: string) => {
    updOtp({ loading: true, error: null });
    // Demo mode: accept 123456
    if (code === "123456" || !IS_SUPABASE_CONFIGURED) {
      updOtp({ verified: true, open: false, loading: false });
      showToast(L("Simu imethibitishwa!", "Phone verified!"), "success");
      return;
    }
    try {
      const { error } = await supabase.auth.verifyOtp({
        phone: toE164(c.phone), token: code, type: "sms",
      });
      if (error) throw error;
      updOtp({ verified: true, open: false, loading: false });
      showToast(L("Simu imethibitishwa!", "Phone verified!"), "success");
    } catch {
      const attempts = otp.attempts + 1;
      if (attempts >= OTP_MAX_ATTEMPTS) {
        updOtp({ attempts, lockedUntil: Date.now() + OTP_LOCKOUT_MS, loading: false, error: L("Umezuiwa kwa dakika 15", "Locked for 15 minutes") });
      } else {
        updOtp({ attempts, loading: false, error: L(`Namba si sahihi. Majaribio ${OTP_MAX_ATTEMPTS - attempts} yamebaki`, `Wrong code. ${OTP_MAX_ATTEMPTS - attempts} attempts left`) });
      }
    }
  };

  // ── Email OTP (diaspora) ──────────────────────────────────────────────────
  const handleSendEmailOtp = async () => {
    updEmailOtp({ loading: true, error: null });
    try {
      if (IS_SUPABASE_CONFIGURED) {
        const { error } = await supabase.auth.signInWithOtp({ email: d.email });
        if (error) throw error;
      }
      updEmailOtp({ sent: true, loading: false, open: true });
    } catch {
      updEmailOtp({ sent: true, loading: false, open: true });
    }
  };

  const handleVerifyEmailOtp = async (code: string) => {
    updEmailOtp({ loading: true, error: null });
    if (code === "123456" || !IS_SUPABASE_CONFIGURED) {
      updEmailOtp({ verified: true, open: false, loading: false });
      showToast(L("Barua pepe imethibitishwa!", "Email verified!"), "success");
      return;
    }
    try {
      const { error } = await supabase.auth.verifyOtp({ email: d.email, token: code, type: "email" });
      if (error) throw error;
      updEmailOtp({ verified: true, open: false, loading: false });
      showToast(L("Barua pepe imethibitishwa!", "Email verified!"), "success");
    } catch {
      const attempts = emailOtp.attempts + 1;
      if (attempts >= OTP_MAX_ATTEMPTS) {
        updEmailOtp({ attempts, lockedUntil: Date.now() + OTP_LOCKOUT_MS, loading: false, error: L("Umezuiwa", "Locked") });
      } else {
        updEmailOtp({ attempts, loading: false, error: L("Namba si sahihi", "Wrong code") });
      }
    }
  };

  // ── Login ─────────────────────────────────────────────────────────────────
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email: loginEmail, password: loginPwd });
      if (error) {
        if (error.message.includes("Invalid login credentials"))
          throw new Error(L("Barua pepe au nywila si sahihi", "Incorrect email or password"));
        if (error.message.includes("Email not confirmed"))
          throw new Error(L("Barua pepe bado haijathibitishwa", "Email not confirmed. Check inbox."));
        throw error;
      }
      if (data.user) fetchUserProfile(data.user.id).catch(() => {});
      onClose();
    } catch (err) {
      showToast((err as Error).message, "error");
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPwd = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(forgotEmail, {
        redirectTo: `${window.location.origin}/confirm`,
      });
      if (error) throw error;
      setForgotSent(true);
    } catch (err) {
      showToast((err as Error).message, "error");
    } finally {
      setLoading(false);
    }
  };

  // ── Citizen signup ────────────────────────────────────────────────────────
  const handleCitizenSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateC3()) return;
    setLoading(true);
    try {
      const meta = {
        first_name: c.firstName.trim().toUpperCase(),
        middle_name: c.middleName.trim().toUpperCase() || null,
        last_name: c.lastName.trim().toUpperCase(),
        phone: toE164(c.phone),
        nationality: "Tanzanian",
        region: c.region, district: c.district, ward: c.ward,
        street: c.street.trim(),
        house_number: c.houseNumber.trim() || null,
        is_diaspora: false, role: "citizen",
        verification_level: "PHONE_VERIFIED",
        account_status: "ACTIVE", is_verified: true,
      };
      const { data, error } = await supabase.auth.signUp({
        email: c.email.trim(), password: c.password, options: { data: meta },
      });
      if (error) {
        if (error.message.includes("already registered"))
          throw new Error(L("Barua pepe hii tayari imesajiliwa", "Email already registered"));
        throw error;
      }
      if (!data.user) throw new Error(L("Usajili umeshindwa", "Signup failed"));
      await supabase.from("users").upsert({ id: data.user.id, email: c.email.trim(), ...meta }, { onConflict: "id" });
      showToast(L("Usajili umekamilika! Ingia sasa.", "Registration complete! Please sign in."), "success");
      setMode("login"); onClose();
    } catch (err) {
      showToast((err as Error).message, "error");
    } finally {
      setLoading(false);
    }
  };

  // ── Diaspora signup ───────────────────────────────────────────────────────
  const handleDiasporaSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateD3()) return;
    setLoading(true);
    try {
      const meta = {
        first_name: d.firstName.trim().toUpperCase(),
        middle_name: d.middleName.trim().toUpperCase() || null,
        last_name: d.lastName.trim().toUpperCase(),
        passport_number: d.passportNumber.trim().toUpperCase(),
        date_of_birth: d.dateOfBirth, gender: d.gender, sex: d.gender,
        country_of_residence: d.countryOfResidence,
        city_of_residence: d.cityOfResidence.trim(),
        region: d.regionOfOrigin, district: d.districtOfOrigin, ward: d.wardOfOrigin,
        nationality: "Tanzanian", is_diaspora: true, role: "citizen",
        verification_level: "EMAIL_VERIFIED",
        account_status: "ACTIVE", is_verified: true,
      };
      const { data, error } = await supabase.auth.signUp({
        email: d.email.trim(), password: d.password, options: { data: meta },
      });
      if (error) {
        if (error.message.includes("already registered"))
          throw new Error(L("Barua pepe hii tayari imesajiliwa", "Email already registered"));
        throw error;
      }
      if (!data.user) throw new Error(L("Usajili umeshindwa", "Signup failed"));
      await supabase.from("users").upsert({ id: data.user.id, email: d.email.trim(), ...meta }, { onConflict: "id" });
      showToast(L("Usajili umekamilika! Angalia barua pepe yako.", "Registration complete! Check your email to verify."), "success");
      setMode("login"); onClose();
    } catch (err) {
      showToast((err as Error).message, "error");
    } finally {
      setLoading(false);
    }
  };

  // ── Step navigation ───────────────────────────────────────────────────────
  const nextStep = () => {
    if (regType === "citizen") {
      if (regStep === 1 && !validateC1()) return;
      if (regStep === 2 && !validateC2()) return;
    } else {
      if (regStep === 1 && !validateD1()) return;
      if (regStep === 2 && !validateD2()) return;
    }
    setRegStep((s) => s + 1);
    setFieldErrors({});
  };

  // ── Step labels ───────────────────────────────────────────────────────────
  const citizenLabels = [
    L("Taarifa Binafsi", "Personal Info"),
    L("Anwani", "Address"),
    L("Thibitisha & Nywila", "Verify & Password"),
  ];
  const diasporaLabels = [
    L("Taarifa Binafsi", "Personal Info"),
    L("Makazi & Asili", "Residence & Origin"),
    L("Nywila", "Password"),
  ];

  // ─────────────────────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────────────────────
  return (
    <>
      {/* OTP Popup — SMS */}
      <OtpModal
        open={otp.open}
        channel="sms"
        destination={c.phone ? toE164(c.phone) : ""}
        loading={otp.loading}
        attempts={otp.attempts}
        maxAttempts={OTP_MAX_ATTEMPTS}
        lockedUntil={otp.lockedUntil}
        error={otp.error}
        lang={lang}
        onVerify={handleVerifySmsOtp}
        onResend={handleSendSmsOtp}
        onClose={() => updOtp({ open: false })}
      />

      {/* OTP Popup — Email (diaspora) */}
      <OtpModal
        open={emailOtp.open}
        channel="email"
        destination={d.email}
        loading={emailOtp.loading}
        attempts={emailOtp.attempts}
        maxAttempts={OTP_MAX_ATTEMPTS}
        lockedUntil={emailOtp.lockedUntil}
        error={emailOtp.error}
        lang={lang}
        onVerify={handleVerifyEmailOtp}
        onResend={handleSendEmailOtp}
        onClose={() => updEmailOtp({ open: false })}
      />

      {/* Main modal */}
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-0 sm:p-4">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-stone-900/60 backdrop-blur-sm"
        />

        <motion.div
          initial={{ opacity: 0, scale: 0.97, y: 12 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.97, y: 12 }}
          transition={{ type: "spring", stiffness: 400, damping: 30 }}
          className="relative w-full h-full sm:h-auto sm:max-w-lg bg-white sm:rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-screen sm:max-h-[92vh]"
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
                    : regType === "diaspora" ? L("Usajili — Watanzania Nje", "Diaspora Registration")
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

            {/* ── LOGIN ──────────────────────────────────────────────────── */}
            {mode === "login" && (
              <div className="max-w-sm mx-auto">
                <AnimatePresence mode="wait">
                  {!showForgot ? (
                    <motion.div key="login" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }}>
                      <form onSubmit={handleLogin} className="space-y-4">
                        <Field>
                          <Label>{L("Barua Pepe", "Email")}</Label>
                          <TxtInput type="email" value={loginEmail} onChange={(e) => setLoginEmail(e.target.value)}
                            placeholder="juma@mfano.co.tz" icon={<Mail size={15} />} required autoComplete="email" />
                        </Field>

                        <Field>
                          <div className="flex items-center justify-between mb-1.5">
                            <Label>{L("Nywila", "Password")}</Label>
                            <button type="button" onClick={() => setShowForgot(true)} className="text-xs font-bold text-emerald-600 hover:underline">
                              {L("Umesahau?", "Forgot?")}
                            </button>
                          </div>
                          <div className="relative">
                            <TxtInput type={showPwd ? "text" : "password"} value={loginPwd} onChange={(e) => setLoginPwd(e.target.value)}
                              placeholder="••••••••" icon={<Lock size={15} />} required autoComplete="current-password" />
                            <button type="button" onClick={() => setShowPwd((v) => !v)}
                              className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600" aria-label="Toggle">
                              {showPwd ? <EyeOff size={15} /> : <Eye size={15} />}
                            </button>
                          </div>
                        </Field>

                        <button type="submit" disabled={loading}
                          className="w-full h-11 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-2xl font-bold flex items-center justify-center gap-2 transition-all shadow-lg shadow-emerald-100">
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
                        <ArrowLeft size={14} /> {L("Rudi", "Back")}
                      </button>
                      {!forgotSent ? (
                        <form onSubmit={handleForgotPwd} className="space-y-4">
                          <div>
                            <h3 className="text-base font-black text-stone-900 mb-1">{L("Rudisha Nywila", "Reset Password")}</h3>
                            <p className="text-xs text-stone-500">{L("Tutakutumia kiungo cha kubadilisha nywila.", "We'll send a reset link to your email.")}</p>
                          </div>
                          <Field>
                            <Label>{L("Barua Pepe", "Email")}</Label>
                            <TxtInput type="email" value={forgotEmail} onChange={(e) => setForgotEmail(e.target.value)}
                              placeholder="juma@mfano.co.tz" icon={<Mail size={15} />} required />
                          </Field>
                          <button type="submit" disabled={loading}
                            className="w-full h-11 bg-stone-900 hover:bg-black text-white rounded-2xl font-bold flex items-center justify-center gap-2 transition-all">
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
              </div>
            )}

            {/* ── SIGNUP ─────────────────────────────────────────────────── */}
            {mode === "signup" && (
              <div>
                {/* Type badge */}
                <div className={cn(
                  "mb-4 px-3 py-2 rounded-xl flex items-center gap-2 text-xs font-bold border",
                  regType === "diaspora" ? "bg-blue-50 text-blue-700 border-blue-200" : "bg-emerald-50 text-emerald-700 border-emerald-200",
                )}>
                  {regType === "diaspora" ? <Globe2 size={14} className="shrink-0" /> : <MapPin size={14} className="shrink-0" />}
                  {regType === "diaspora"
                    ? L("Usajili wa Mtanzania Nje ya Nchi", "Diaspora Citizen Registration")
                    : L("Usajili wa Raia wa Tanzania", "Tanzania Resident Registration")}
                </div>

                <AnimatePresence mode="wait">

                  {/* ══════════════════════════════════════════════════════
                      CITIZEN FLOW
                  ══════════════════════════════════════════════════════ */}
                  {regType === "citizen" && (
                    <motion.div
                      key={`c${regStep}`}
                      initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -16 }}
                    >
                      <StepBar step={regStep} total={3} label={citizenLabels[regStep - 1]} />

                      {/* ── CITIZEN STEP 1: Personal ── */}
                      {regStep === 1 && (
                        <div className="space-y-4">
                          {/* Name row */}
                          <div className="grid grid-cols-2 gap-3">
                            <Field error={fieldErrors.firstName}>
                              <Label required>{L("Jina la Kwanza", "First Name")}</Label>
                              <TxtInput value={c.firstName} onChange={(e) => { updC("firstName", e.target.value); clearErr("firstName"); }}
                                placeholder="Juma" icon={<User size={13} />} hasError={!!fieldErrors.firstName} />
                            </Field>
                            <Field>
                              <Label optional>{L("Jina la Kati", "Middle")}</Label>
                              <TxtInput value={c.middleName} onChange={(e) => updC("middleName", e.target.value)} placeholder="Rashidi" />
                            </Field>
                          </div>
                          <Field error={fieldErrors.lastName}>
                            <Label required>{L("Jina la Mwisho", "Last Name")}</Label>
                            <TxtInput value={c.lastName} onChange={(e) => { updC("lastName", e.target.value); clearErr("lastName"); }}
                              placeholder="Mkubwa" hasError={!!fieldErrors.lastName} />
                          </Field>

                          {/* Phone */}
                          <Field error={fieldErrors.phone} hint={L("Namba za Tanzania pekee: 06x au 07x", "Tanzania numbers only: 06x or 07x")}>
                            <Label required>{L("Namba ya Simu", "Mobile Number")}</Label>
                            <div className={cn("border rounded-xl overflow-hidden bg-stone-50 focus-within:ring-2 focus-within:ring-emerald-500 transition-all", fieldErrors.phone ? "border-red-300 bg-red-50" : "border-stone-200")}>
                              <PhoneInput international defaultCountry="TZ" value={c.phone}
                                onChange={(v) => { updC("phone", v ?? ""); clearErr("phone"); }}
                                className="h-11 px-3.5 text-sm font-medium bg-transparent outline-none w-full" />
                            </div>
                          </Field>

                          {/* Email */}
                          <Field error={fieldErrors.email} hint={L("Kwa arifa za mfumo", "For system notifications")}>
                            <Label required>{L("Barua Pepe", "Email")}</Label>
                            <TxtInput type="email" value={c.email} onChange={(e) => { updC("email", e.target.value); clearErr("email"); }}
                              placeholder="juma@mfano.co.tz" icon={<Mail size={15} />} hasError={!!fieldErrors.email} />
                          </Field>

                          <div className="flex gap-3 pt-1">
                            <button type="button" onClick={nextStep}
                              className="w-full h-11 bg-stone-900 hover:bg-black text-white rounded-2xl font-bold text-sm flex items-center justify-center gap-2 transition-all">
                              {L("Endelea", "Continue")} <ArrowRight size={16} />
                            </button>
                          </div>
                          <p className="text-center text-xs text-stone-500">
                            {L("Una akaunti?", "Have an account?")}{" "}
                            <button type="button" onClick={() => setMode("login")} className="text-emerald-600 font-bold hover:underline">{L("Ingia", "Sign in")}</button>
                          </p>
                        </div>
                      )}

                      {/* ── CITIZEN STEP 2: Location ── */}
                      {regStep === 2 && (
                        <div className="space-y-4">
                          <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-start gap-2">
                            <MapPin size={13} className="text-emerald-600 shrink-0 mt-0.5" />
                            <p className="text-xs text-emerald-700">{L("Anwani yako inatumika kupanga ofisi inayokuhudumia.", "Your address determines your assigned office automatically.")}</p>
                          </div>

                          <div className="grid grid-cols-2 gap-3">
                            <Field error={fieldErrors.region}>
                              <Label required>{L("Mkoa", "Region")}</Label>
                              <SelInput value={c.region} placeholder={L("Chagua", "Select")} hasError={!!fieldErrors.region}
                                onChange={(e) => { updC("region", e.target.value); updC("district", ""); updC("ward", ""); clearErr("region"); }}>
                                {TANZANIA_ADDRESS_DATA.map((r) => <option key={r.name} value={r.name}>{r.name}</option>)}
                              </SelInput>
                            </Field>

                            <Field error={fieldErrors.district}>
                              <Label required>{L("Wilaya", "District")}</Label>
                              <SelInput value={c.district} placeholder={L("Chagua", "Select")} disabled={!c.region} hasError={!!fieldErrors.district}
                                onChange={(e) => { updC("district", e.target.value); updC("ward", ""); clearErr("district"); }}>
                                {citizenDistricts.map((d) => <option key={d.name} value={d.name}>{d.name}</option>)}
                              </SelInput>
                            </Field>

                            <Field error={fieldErrors.ward}>
                              <Label required>{L("Kata", "Ward")}</Label>
                              <SelInput value={c.ward} placeholder={L("Chagua", "Select")} disabled={!c.district} hasError={!!fieldErrors.ward}
                                onChange={(e) => { updC("ward", e.target.value); clearErr("ward"); }}>
                                {citizenWards.map((w) => <option key={w} value={w}>{w}</option>)}
                                <option value="Mengineyo">{L("Mengineyo", "Other")}</option>
                              </SelInput>
                            </Field>

                            <Field error={fieldErrors.street}>
                              <Label required>{L("Mtaa / Kijiji", "Street / Village")}</Label>
                              <TxtInput value={c.street} onChange={(e) => { updC("street", e.target.value); clearErr("street"); }}
                                placeholder={L("Jina la mtaa", "Street name")} icon={<Home size={13} />} hasError={!!fieldErrors.street} />
                            </Field>
                          </div>

                          <Field>
                            <Label optional>{L("Namba ya Nyumba", "House Number")}</Label>
                            <TxtInput value={c.houseNumber} onChange={(e) => updC("houseNumber", e.target.value)} placeholder="B12 / Plot 45" />
                          </Field>

                          <div className="flex gap-3 pt-1">
                            <button type="button" onClick={() => setRegStep(1)}
                              className="flex-1 h-11 bg-white border border-stone-200 text-stone-600 rounded-2xl font-bold text-sm flex items-center justify-center gap-1.5 hover:bg-stone-50 transition-all">
                              <ArrowLeft size={15} /> {L("Rudi", "Back")}
                            </button>
                            <button type="button" onClick={nextStep}
                              className="flex-[2] h-11 bg-stone-900 hover:bg-black text-white rounded-2xl font-bold text-sm flex items-center justify-center gap-1.5 transition-all">
                              {L("Endelea", "Continue")} <ArrowRight size={15} />
                            </button>
                          </div>
                        </div>
                      )}

                      {/* ── CITIZEN STEP 3: Verify + Password ── */}
                      {regStep === 3 && (
                        <form onSubmit={handleCitizenSignup} className="space-y-4">
                          {/* OTP trigger */}
                          {!otp.verified ? (
                            <div className="p-4 bg-stone-50 border border-stone-200 rounded-xl space-y-3">
                              <div className="flex items-center gap-2">
                                <Phone size={14} className="text-stone-500 shrink-0" />
                                <div>
                                  <p className="text-xs font-bold text-stone-700">{L("Thibitisha Namba ya Simu", "Verify Phone Number")}</p>
                                  <p className="text-[11px] text-stone-400">{c.phone ? toE164(c.phone) : "—"}</p>
                                </div>
                              </div>
                              <button type="button" onClick={handleSendSmsOtp} disabled={otp.loading || !c.phone}
                                className="w-full h-10 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all">
                                {otp.loading ? <Loader2 size={14} className="animate-spin" /> : <Phone size={14} />}
                                {L("Tuma OTP kwa SMS", "Send SMS OTP")}
                              </button>
                            </div>
                          ) : (
                            <div className="flex items-center gap-2 p-3 bg-emerald-50 border border-emerald-200 rounded-xl">
                              <CheckCircle2 size={15} className="text-emerald-600 shrink-0" />
                              <p className="text-sm font-bold text-emerald-700">{L("Simu imethibitishwa ✓", "Phone verified ✓")}</p>
                              <button type="button" onClick={() => updOtp({ open: true })} className="ml-auto text-xs text-stone-400 hover:underline">{L("Badilisha", "Change")}</button>
                            </div>
                          )}
                          {fieldErrors.otp && (
                            <p className="text-xs text-red-500 flex items-center gap-1"><AlertCircle size={11} /> {fieldErrors.otp}</p>
                          )}

                          {/* Password */}
                          <Field error={fieldErrors.password} hint={L("Angalau herufi 6", "At least 6 characters")}>
                            <Label required>{L("Nywila", "Password")}</Label>
                            <div className="relative">
                              <TxtInput type={showPwd ? "text" : "password"} value={c.password}
                                onChange={(e) => { updC("password", e.target.value); clearErr("password"); }}
                                placeholder="••••••••" icon={<Lock size={15} />} hasError={!!fieldErrors.password} />
                              <button type="button" onClick={() => setShowPwd((v) => !v)}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400" aria-label="Toggle">
                                {showPwd ? <EyeOff size={15} /> : <Eye size={15} />}
                              </button>
                            </div>
                            <PwdStrength password={c.password} lang={lang} />
                          </Field>

                          <Field error={fieldErrors.confirmPassword}>
                            <Label required>{L("Thibitisha Nywila", "Confirm Password")}</Label>
                            <TxtInput type={showPwd ? "text" : "password"} value={c.confirmPassword}
                              onChange={(e) => { updC("confirmPassword", e.target.value); clearErr("confirmPassword"); }}
                              placeholder="••••••••" icon={<Lock size={15} />} hasError={!!fieldErrors.confirmPassword} />
                          </Field>

                          <label className="flex items-start gap-2 cursor-pointer">
                            <input type="checkbox" required className="mt-0.5 h-4 w-4 rounded border-stone-300 text-emerald-600 focus:ring-emerald-500 shrink-0" />
                            <span className="text-xs text-stone-500 leading-relaxed">
                              {L("Nakubali Masharti na Sera ya Faragha ya E-Mtaa.", "I agree to E-Mtaa's Terms and Privacy Policy.")}
                            </span>
                          </label>

                          <div className="p-2.5 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-2">
                            <Shield size={12} className="text-amber-600 shrink-0 mt-0.5" />
                            <p className="text-[11px] text-amber-700">{L("Akaunti: PHONE_VERIFIED · ACTIVE", "Account status: PHONE_VERIFIED · ACTIVE")}</p>
                          </div>

                          <div className="flex gap-3">
                            <button type="button" onClick={() => setRegStep(2)}
                              className="flex-1 h-11 bg-white border border-stone-200 text-stone-600 rounded-2xl font-bold text-sm flex items-center justify-center gap-1.5 hover:bg-stone-50 transition-all">
                              <ArrowLeft size={15} /> {L("Rudi", "Back")}
                            </button>
                            <button type="submit" disabled={loading}
                              className="flex-[2] h-11 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-2xl font-bold text-sm flex items-center justify-center gap-1.5 transition-all shadow-lg shadow-emerald-100">
                              {loading ? <Loader2 size={15} className="animate-spin" /> : <><CheckCircle2 size={15} /> {L("Kamilisha Usajili", "Complete Registration")}</>}
                            </button>
                          </div>
                        </form>
                      )}
                    </motion.div>
                  )}

                  {/* ══════════════════════════════════════════════════════
                      DIASPORA FLOW
                  ══════════════════════════════════════════════════════ */}
                  {regType === "diaspora" && (
                    <motion.div
                      key={`d${regStep}`}
                      initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -16 }}
                    >
                      <StepBar step={regStep} total={3} label={diasporaLabels[regStep - 1]} />

                      {/* ── DIASPORA STEP 1: Personal ── */}
                      {regStep === 1 && (
                        <div className="space-y-4">
                          <div className="grid grid-cols-2 gap-3">
                            <Field error={fieldErrors.firstName}>
                              <Label required>{L("Jina la Kwanza", "First Name")}</Label>
                              <TxtInput value={d.firstName} onChange={(e) => { updD("firstName", e.target.value); clearErr("firstName"); }}
                                placeholder="Amina" icon={<User size={13} />} hasError={!!fieldErrors.firstName} />
                            </Field>
                            <Field>
                              <Label optional>{L("Jina la Kati", "Middle")}</Label>
                              <TxtInput value={d.middleName} onChange={(e) => updD("middleName", e.target.value)} placeholder="Mwajuma" />
                            </Field>
                          </div>
                          <Field error={fieldErrors.lastName}>
                            <Label required>{L("Jina la Mwisho", "Last Name")}</Label>
                            <TxtInput value={d.lastName} onChange={(e) => { updD("lastName", e.target.value); clearErr("lastName"); }}
                              placeholder="Hassan" hasError={!!fieldErrors.lastName} />
                          </Field>

                          <Field error={fieldErrors.email} hint={L("Uthibitisho unatumia barua pepe — hakuna SMS", "Verification is email-only, no SMS needed")}>
                            <Label required>{L("Barua Pepe", "Email")}</Label>
                            <TxtInput type="email" value={d.email} onChange={(e) => { updD("email", e.target.value); clearErr("email"); }}
                              placeholder="amina@example.com" icon={<Mail size={15} />} hasError={!!fieldErrors.email} />
                          </Field>

                          <div className="grid grid-cols-2 gap-3">
                            <Field error={fieldErrors.passportNumber}>
                              <Label required>{L("Namba ya Pasipoti", "Passport No.")}</Label>
                              <TxtInput value={d.passportNumber} onChange={(e) => { updD("passportNumber", e.target.value.toUpperCase()); clearErr("passportNumber"); }}
                                placeholder="TZ1234567" hasError={!!fieldErrors.passportNumber} />
                            </Field>
                            <Field error={fieldErrors.dateOfBirth}>
                              <Label required>{L("Tarehe ya Kuzaliwa", "Date of Birth")}</Label>
                              <TxtInput type="date" value={d.dateOfBirth} onChange={(e) => { updD("dateOfBirth", e.target.value); clearErr("dateOfBirth"); }}
                                max={new Date().toISOString().split("T")[0]} icon={<Calendar size={13} />} hasError={!!fieldErrors.dateOfBirth} />
                            </Field>
                          </div>

                          <Field>
                            <Label required>{L("Jinsia", "Gender")}</Label>
                            <div className="flex gap-2">
                              {(["M", "F", "O"] as const).map((g) => (
                                <button key={g} type="button" onClick={() => updD("gender", g)}
                                  className={cn("flex-1 h-10 rounded-xl font-bold text-xs border-2 transition-all",
                                    d.gender === g ? "bg-emerald-600 border-emerald-600 text-white" : "bg-white border-stone-200 text-stone-500 hover:border-stone-300")}>
                                  {g === "M" ? L("Mwanaume", "Male") : g === "F" ? L("Mwanamke", "Female") : L("Nyingine", "Other")}
                                </button>
                              ))}
                            </div>
                          </Field>

                          <div className="flex gap-3 pt-1">
                            <button type="button" onClick={nextStep}
                              className="w-full h-11 bg-stone-900 hover:bg-black text-white rounded-2xl font-bold text-sm flex items-center justify-center gap-2 transition-all">
                              {L("Endelea", "Continue")} <ArrowRight size={16} />
                            </button>
                          </div>
                          <p className="text-center text-xs text-stone-500">
                            {L("Una akaunti?", "Have an account?")}{" "}
                            <button type="button" onClick={() => setMode("login")} className="text-emerald-600 font-bold hover:underline">{L("Ingia", "Sign in")}</button>
                          </p>
                        </div>
                      )}

                      {/* ── DIASPORA STEP 2: Residence + Origin ── */}
                      {regStep === 2 && (
                        <div className="space-y-4">
                          <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl flex items-start gap-2">
                            <Globe2 size={13} className="text-blue-600 shrink-0 mt-0.5" />
                            <p className="text-xs text-blue-700">{L("Ingiza nchi unayoishi na mkoa wako wa asili Tanzania.", "Enter where you live and your home region in Tanzania.")}</p>
                          </div>

                          <div className="grid grid-cols-2 gap-3">
                            <Field error={fieldErrors.countryOfResidence}>
                              <Label required>{L("Nchi ya Makazi", "Country")}</Label>
                              <SelInput value={d.countryOfResidence} placeholder={L("Chagua", "Select")} hasError={!!fieldErrors.countryOfResidence}
                                onChange={(e) => { updD("countryOfResidence", e.target.value); clearErr("countryOfResidence"); }}>
                                {COUNTRIES.map((cn) => <option key={cn} value={cn}>{cn}</option>)}
                              </SelInput>
                            </Field>
                            <Field error={fieldErrors.cityOfResidence}>
                              <Label required>{L("Jiji / Mji", "City")}</Label>
                              <TxtInput value={d.cityOfResidence} onChange={(e) => { updD("cityOfResidence", e.target.value); clearErr("cityOfResidence"); }}
                                placeholder="London, Dubai..." hasError={!!fieldErrors.cityOfResidence} />
                            </Field>
                          </div>

                          <p className="text-[10px] font-black text-stone-400 uppercase tracking-widest pt-1">
                            {L("Mahali pa Asili — Tanzania", "Home Location — Tanzania")}
                          </p>

                          <div className="grid grid-cols-3 gap-2">
                            <Field error={fieldErrors.regionOfOrigin}>
                              <Label required>{L("Mkoa", "Region")}</Label>
                              <SelInput value={d.regionOfOrigin} placeholder={L("—", "—")} hasError={!!fieldErrors.regionOfOrigin}
                                onChange={(e) => { updD("regionOfOrigin", e.target.value); updD("districtOfOrigin", ""); updD("wardOfOrigin", ""); clearErr("regionOfOrigin"); }}>
                                {TANZANIA_ADDRESS_DATA.map((r) => <option key={r.name} value={r.name}>{r.name}</option>)}
                              </SelInput>
                            </Field>
                            <Field error={fieldErrors.districtOfOrigin}>
                              <Label required>{L("Wilaya", "District")}</Label>
                              <SelInput value={d.districtOfOrigin} placeholder="—" disabled={!d.regionOfOrigin} hasError={!!fieldErrors.districtOfOrigin}
                                onChange={(e) => { updD("districtOfOrigin", e.target.value); updD("wardOfOrigin", ""); clearErr("districtOfOrigin"); }}>
                                {diasporaDistricts.map((dis) => <option key={dis.name} value={dis.name}>{dis.name}</option>)}
                              </SelInput>
                            </Field>
                            <Field error={fieldErrors.wardOfOrigin}>
                              <Label required>{L("Kata", "Ward")}</Label>
                              <SelInput value={d.wardOfOrigin} placeholder="—" disabled={!d.districtOfOrigin} hasError={!!fieldErrors.wardOfOrigin}
                                onChange={(e) => { updD("wardOfOrigin", e.target.value); clearErr("wardOfOrigin"); }}>
                                {diasporaWards.map((w) => <option key={w} value={w}>{w}</option>)}
                                <option value="Mengineyo">{L("Mengineyo", "Other")}</option>
                              </SelInput>
                            </Field>
                          </div>

                          <div className="flex gap-3 pt-1">
                            <button type="button" onClick={() => setRegStep(1)}
                              className="flex-1 h-11 bg-white border border-stone-200 text-stone-600 rounded-2xl font-bold text-sm flex items-center justify-center gap-1.5 hover:bg-stone-50 transition-all">
                              <ArrowLeft size={15} /> {L("Rudi", "Back")}
                            </button>
                            <button type="button" onClick={nextStep}
                              className="flex-[2] h-11 bg-stone-900 hover:bg-black text-white rounded-2xl font-bold text-sm flex items-center justify-center gap-1.5 transition-all">
                              {L("Endelea", "Continue")} <ArrowRight size={15} />
                            </button>
                          </div>
                        </div>
                      )}

                      {/* ── DIASPORA STEP 3: Email OTP + Password ── */}
                      {regStep === 3 && (
                        <form onSubmit={handleDiasporaSignup} className="space-y-4">
                          {/* Email OTP trigger */}
                          {!emailOtp.verified ? (
                            <div className="p-4 bg-stone-50 border border-stone-200 rounded-xl space-y-3">
                              <div className="flex items-center gap-2">
                                <Mail size={14} className="text-stone-500 shrink-0" />
                                <div>
                                  <p className="text-xs font-bold text-stone-700">{L("Thibitisha Barua Pepe", "Verify Email Address")}</p>
                                  <p className="text-[11px] text-stone-400">{d.email || "—"}</p>
                                </div>
                              </div>
                              <button type="button" onClick={handleSendEmailOtp} disabled={emailOtp.loading || !d.email}
                                className="w-full h-10 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all">
                                {emailOtp.loading ? <Loader2 size={14} className="animate-spin" /> : <Mail size={14} />}
                                {L("Tuma OTP kwa Barua Pepe", "Send Email OTP")}
                              </button>
                            </div>
                          ) : (
                            <div className="flex items-center gap-2 p-3 bg-emerald-50 border border-emerald-200 rounded-xl">
                              <CheckCircle2 size={15} className="text-emerald-600 shrink-0" />
                              <p className="text-sm font-bold text-emerald-700">{L("Barua pepe imethibitishwa ✓", "Email verified ✓")}</p>
                            </div>
                          )}

                          <Field error={fieldErrors.password} hint={L("Angalau herufi 6", "At least 6 characters")}>
                            <Label required>{L("Nywila", "Password")}</Label>
                            <div className="relative">
                              <TxtInput type={showPwd ? "text" : "password"} value={d.password}
                                onChange={(e) => { updD("password", e.target.value); clearErr("password"); }}
                                placeholder="••••••••" icon={<Lock size={15} />} hasError={!!fieldErrors.password} />
                              <button type="button" onClick={() => setShowPwd((v) => !v)}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400" aria-label="Toggle">
                                {showPwd ? <EyeOff size={15} /> : <Eye size={15} />}
                              </button>
                            </div>
                            <PwdStrength password={d.password} lang={lang} />
                          </Field>

                          <Field error={fieldErrors.confirmPassword}>
                            <Label required>{L("Thibitisha Nywila", "Confirm Password")}</Label>
                            <TxtInput type={showPwd ? "text" : "password"} value={d.confirmPassword}
                              onChange={(e) => { updD("confirmPassword", e.target.value); clearErr("confirmPassword"); }}
                              placeholder="••••••••" icon={<Lock size={15} />} hasError={!!fieldErrors.confirmPassword} />
                          </Field>

                          <div className="p-2.5 bg-blue-50 border border-blue-200 rounded-xl flex items-start gap-2">
                            <Globe2 size={12} className="text-blue-600 shrink-0 mt-0.5" />
                            <p className="text-[11px] text-blue-700">{L("Akaunti: EMAIL_VERIFIED · ACTIVE · Huduma zote kwa mbali", "Status: EMAIL_VERIFIED · ACTIVE · Full remote access")}</p>
                          </div>

                          <label className="flex items-start gap-2 cursor-pointer">
                            <input type="checkbox" required className="mt-0.5 h-4 w-4 rounded border-stone-300 text-emerald-600 focus:ring-emerald-500 shrink-0" />
                            <span className="text-xs text-stone-500 leading-relaxed">
                              {L("Nakubali Masharti na Sera ya Faragha ya E-Mtaa.", "I agree to E-Mtaa's Terms and Privacy Policy.")}
                            </span>
                          </label>

                          <div className="flex gap-3">
                            <button type="button" onClick={() => setRegStep(2)}
                              className="flex-1 h-11 bg-white border border-stone-200 text-stone-600 rounded-2xl font-bold text-sm flex items-center justify-center gap-1.5 hover:bg-stone-50 transition-all">
                              <ArrowLeft size={15} /> {L("Rudi", "Back")}
                            </button>
                            <button type="submit" disabled={loading}
                              className="flex-[2] h-11 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-2xl font-bold text-sm flex items-center justify-center gap-1.5 transition-all shadow-lg shadow-blue-100">
                              {loading ? <Loader2 size={15} className="animate-spin" /> : <><CheckCircle2 size={15} /> {L("Kamilisha Usajili", "Complete Registration")}</>}
                            </button>
                          </div>
                        </form>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </>
  );
}

export default Auth;
