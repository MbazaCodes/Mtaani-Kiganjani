/**
 * Auth.tsx — Refactored Sign-Up / Login modal
 *
 * CITIZEN:  3-step wizard  →  Personal → Location → Account + SMS OTP
 * DIASPORA: 3-step wizard  →  Personal → Origin Location → Account (email verify)
 * LOGIN:    email + password with forgot-password flow
 */
import React, { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  Mail,
  Lock,
  Eye,
  EyeOff,
  Loader2,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  AlertCircle,
  Phone,
  Globe2,
  MapPin,
  User,
  Calendar,
  Home,
  Shield,
  MessageSquare,
} from "lucide-react";
import PhoneInput, { isValidPhoneNumber } from "react-phone-number-input";
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

// ── OTP state tracking ────────────────────────────────────────────────────────
interface OtpState {
  sent: boolean;
  verified: boolean;
  loading: boolean;
  attempts: number;
  lockedUntil: number | null; // timestamp ms
  code: string;
}

const OTP_MAX_ATTEMPTS = 5;
const OTP_LOCKOUT_MS = 15 * 60 * 1000; // 15 min

// ── Citizen registration form ─────────────────────────────────────────────────
interface CitizenForm {
  firstName: string;
  middleName: string;
  lastName: string;
  phone: string;
  email: string;
  password: string;
  confirmPassword: string;
  region: string;
  district: string;
  ward: string;
  street: string;
  houseNumber: string;
}

// ── Diaspora registration form ────────────────────────────────────────────────
interface DiasporaForm {
  firstName: string;
  middleName: string;
  lastName: string;
  email: string;
  password: string;
  confirmPassword: string;
  passportNumber: string;
  dateOfBirth: string;
  gender: "M" | "F" | "O";
  countryOfResidence: string;
  cityOfResidence: string;
  regionOfOrigin: string;
  districtOfOrigin: string;
  wardOfOrigin: string;
}

// ── Props ─────────────────────────────────────────────────────────────────────
interface AuthProps {
  mode: "login" | "signup";
  onClose: () => void;
  setMode: (mode: "login" | "signup") => void;
  isDiaspora?: boolean;
}

// ── Helpers ───────────────────────────────────────────────────────────────────
const isTanzanianNumber = (phone: string) => {
  const stripped = phone.replace(/\D/g, "");
  // +255 7xx / +255 6xx  or local 07xx / 06xx
  return /^(255[67]\d{8}|0[67]\d{8})$/.test(stripped);
};

const toE164 = (phone: string) => {
  const d = phone.replace(/\D/g, "");
  if (d.startsWith("255")) return `+${d}`;
  if (d.startsWith("0")) return `+255${d.slice(1)}`;
  return `+255${d}`;
};

// ─────────────────────────────────────────────────────────────────────────────
// Field components
// ─────────────────────────────────────────────────────────────────────────────
const FieldLabel: React.FC<{
  children: React.ReactNode;
  required?: boolean;
  optional?: boolean;
}> = ({ children, required, optional }) => (
  <label className="text-[11px] font-black text-stone-500 uppercase tracking-widest flex items-center gap-1">
    {children}
    {required && <span className="text-red-400">*</span>}
    {optional && (
      <span className="text-[10px] font-medium text-stone-400 normal-case tracking-normal">
        (hiari / optional)
      </span>
    )}
  </label>
);

const TextInput: React.FC<
  React.InputHTMLAttributes<HTMLInputElement> & { icon?: React.ReactNode; error?: string }
> = ({ icon, error, className, ...props }) => (
  <div className="relative">
    {icon && (
      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-400 pointer-events-none">
        {icon}
      </span>
    )}
    <input
      {...props}
      className={cn(
        "w-full h-13 px-4 bg-stone-50 border rounded-xl font-medium text-stone-900 transition-all outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 placeholder:text-stone-400",
        icon && "pl-11",
        error ? "border-red-300 bg-red-50" : "border-stone-200",
        className,
      )}
    />
    {error && (
      <p className="mt-1 text-xs text-red-500 flex items-center gap-1">
        <AlertCircle size={11} /> {error}
      </p>
    )}
  </div>
);

const SelectInput: React.FC<
  React.SelectHTMLAttributes<HTMLSelectElement> & { placeholder?: string }
> = ({ children, placeholder, className, ...props }) => (
  <select
    {...props}
    className={cn(
      "w-full h-13 px-4 bg-stone-50 border border-stone-200 rounded-xl font-medium text-stone-900 transition-all outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500",
      className,
    )}
  >
    {placeholder && (
      <option value="" disabled>
        {placeholder}
      </option>
    )}
    {children}
  </select>
);

// ─────────────────────────────────────────────────────────────────────────────
// Step indicator
// ─────────────────────────────────────────────────────────────────────────────
const StepBar: React.FC<{
  step: number;
  total: number;
  labels: string[];
}> = ({ step, total, labels }) => (
  <div className="mb-6">
    {/* Mobile: compact pill */}
    <div className="flex items-center justify-between mb-3">
      <span className="text-xs font-black text-emerald-700 uppercase tracking-widest">
        {labels[step - 1]}
      </span>
      <span className="text-xs font-bold text-stone-400">
        {step}/{total}
      </span>
    </div>
    <div className="flex gap-1.5">
      {Array.from({ length: total }).map((_, i) => (
        <div
          key={i}
          className={cn(
            "h-1 flex-1 rounded-full transition-all duration-500",
            i < step ? "bg-emerald-600" : "bg-stone-200",
          )}
        />
      ))}
    </div>
  </div>
);

// ─────────────────────────────────────────────────────────────────────────────
// OTP Box (SMS)
// ─────────────────────────────────────────────────────────────────────────────
const SmsOtpBox: React.FC<{
  phone: string;
  otp: OtpState;
  lang: string;
  onSend: () => void;
  onVerify: () => void;
  onCodeChange: (c: string) => void;
}> = ({ phone, otp, lang, onSend, onVerify, onCodeChange }) => {
  const sw = lang === "sw";
  const locked = otp.lockedUntil && Date.now() < otp.lockedUntil;
  const remainingMins = locked
    ? Math.ceil((otp.lockedUntil! - Date.now()) / 60000)
    : 0;

  if (otp.verified) {
    return (
      <div className="flex items-center gap-2 p-3 bg-emerald-50 border border-emerald-200 rounded-xl">
        <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
        <p className="text-sm font-bold text-emerald-700">
          {sw ? "Namba ya simu imethibitishwa ✓" : "Phone number verified ✓"}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3 p-4 bg-blue-50 border border-blue-200 rounded-xl">
      <div className="flex items-center gap-2">
        <MessageSquare size={14} className="text-blue-600 shrink-0" />
        <p className="text-xs font-bold text-blue-700 uppercase tracking-wide">
          {sw ? "Thibitisha Simu — OTP" : "Phone Verification — OTP"}
        </p>
      </div>

      {locked ? (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-xs text-red-600 font-medium">
            {sw
              ? `Umezuiwa kwa dakika ${remainingMins}. Majaribio mengi yamefeli.`
              : `Locked for ${remainingMins} min. Too many failed attempts.`}
          </p>
        </div>
      ) : !otp.sent ? (
        <button
          type="button"
          onClick={onSend}
          disabled={otp.loading || !phone}
          className="w-full h-11 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all"
        >
          {otp.loading ? <Loader2 size={14} className="animate-spin" /> : <Phone size={14} />}
          {sw ? `Tuma OTP kwa ${phone}` : `Send OTP to ${phone}`}
        </button>
      ) : (
        <div className="space-y-3">
          <p className="text-xs text-blue-600 font-medium">
            {sw
              ? `Namba 6 imetumwa kwa ${phone}. Halali kwa dakika 10.`
              : `6-digit code sent to ${phone}. Valid for 10 minutes.`}
          </p>
          <div className="flex gap-2">
            <input
              type="text"
              inputMode="numeric"
              maxLength={6}
              value={otp.code}
              onChange={(e) => onCodeChange(e.target.value.replace(/\D/g, "").slice(0, 6))}
              placeholder="000000"
              className="flex-1 h-13 px-4 bg-white border border-blue-300 rounded-xl text-center text-xl font-black tracking-[0.4em] font-mono outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              type="button"
              onClick={onVerify}
              disabled={otp.loading || otp.code.length < 6}
              className="px-5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-xl font-bold text-sm flex items-center gap-2 transition-all"
            >
              {otp.loading ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
              {sw ? "Hakiki" : "Verify"}
            </button>
          </div>
          {otp.attempts > 0 && (
            <p className="text-xs text-amber-600">
              {sw
                ? `Majaribio ${otp.attempts}/${OTP_MAX_ATTEMPTS}`
                : `Attempt ${otp.attempts}/${OTP_MAX_ATTEMPTS}`}
            </p>
          )}
          <button
            type="button"
            onClick={onSend}
            disabled={otp.loading}
            className="text-xs text-blue-500 hover:underline font-medium"
          >
            {sw ? "Tuma tena" : "Resend code"}
          </button>
        </div>
      )}
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// Main Auth component
// ─────────────────────────────────────────────────────────────────────────────
export function Auth({ mode, onClose, setMode, isDiaspora = false }: AuthProps) {
  const { fetchUserProfile } = useAuth();
  const { lang, t } = useLanguage();
  const { showToast } = useToast();
  const sw = lang === "sw";

  const L = (swText: string, enText: string) => (sw ? swText : enText);

  // ── Shared loading ─────────────────────────────────────────────────────────
  const [loading, setLoading] = useState(false);

  // ── Login form ─────────────────────────────────────────────────────────────
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [showLoginPwd, setShowLoginPwd] = useState(false);
  const [showForgot, setShowForgot] = useState(false);
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotSent, setForgotSent] = useState(false);

  // ── Signup state ───────────────────────────────────────────────────────────
  const [regStep, setRegStep] = useState(1);
  const [showRegPwd, setShowRegPwd] = useState(false);
  const [regType] = useState<"citizen" | "diaspora">(isDiaspora ? "diaspora" : "citizen");

  // ── Citizen form ───────────────────────────────────────────────────────────
  const [citizen, setCitizen] = useState<CitizenForm>({
    firstName: "",
    middleName: "",
    lastName: "",
    phone: "",
    email: "",
    password: "",
    confirmPassword: "",
    region: "",
    district: "",
    ward: "",
    street: "",
    houseNumber: "",
  });
  const updC = (k: keyof CitizenForm, v: string) =>
    setCitizen((p) => ({ ...p, [k]: v }));

  // ── Diaspora form ──────────────────────────────────────────────────────────
  const [diaspora, setDiaspora] = useState<DiasporaForm>({
    firstName: "",
    middleName: "",
    lastName: "",
    email: "",
    password: "",
    confirmPassword: "",
    passportNumber: "",
    dateOfBirth: "",
    gender: "M",
    countryOfResidence: "",
    cityOfResidence: "",
    regionOfOrigin: "",
    districtOfOrigin: "",
    wardOfOrigin: "",
  });
  const updD = (k: keyof DiasporaForm, v: string) =>
    setDiaspora((p) => ({ ...p, [k]: v }));

  // ── OTP state ──────────────────────────────────────────────────────────────
  const [otp, setOtp] = useState<OtpState>({
    sent: false,
    verified: false,
    loading: false,
    attempts: 0,
    lockedUntil: null,
    code: "",
  });
  const updOtp = (patch: Partial<OtpState>) => setOtp((p) => ({ ...p, ...patch }));

  // ── Derived address data ───────────────────────────────────────────────────
  const citizenDistricts = useMemo(
    () => TANZANIA_ADDRESS_DATA.find((r) => r.name === citizen.region)?.districts || [],
    [citizen.region],
  );
  const citizenWards = useMemo(
    () => citizenDistricts.find((d) => d.name === citizen.district)?.wards || [],
    [citizenDistricts, citizen.district],
  );

  const diasporaDistricts = useMemo(
    () => TANZANIA_ADDRESS_DATA.find((r) => r.name === diaspora.regionOfOrigin)?.districts || [],
    [diaspora.regionOfOrigin],
  );
  const diasporaWards = useMemo(
    () => diasporaDistricts.find((d) => d.name === diaspora.districtOfOrigin)?.wards || [],
    [diasporaDistricts, diaspora.districtOfOrigin],
  );

  // ── Validation helpers ─────────────────────────────────────────────────────
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const setErr = (key: string, msg: string) =>
    setFieldErrors((p) => ({ ...p, [key]: msg }));
  const clearErr = (key: string) =>
    setFieldErrors((p) => { const n = { ...p }; delete n[key]; return n; });

  const validateCitizenStep1 = () => {
    const errs: Record<string, string> = {};
    if (!citizen.firstName.trim()) errs.firstName = L("Jina la kwanza linahitajika", "First name required");
    if (!citizen.lastName.trim()) errs.lastName = L("Jina la mwisho linahitajika", "Last name required");
    if (!citizen.phone) errs.phone = L("Namba ya simu inahitajika", "Phone number required");
    else if (!isTanzanianNumber(citizen.phone))
      errs.phone = L("Lazima iwe namba ya Tanzania (06x au 07x)", "Must be a Tanzanian number (06x or 07x)");
    if (!citizen.email.trim() || !/\S+@\S+\.\S+/.test(citizen.email))
      errs.email = L("Barua pepe sahihi inahitajika", "Valid email required");
    setFieldErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const validateCitizenStep2 = () => {
    const errs: Record<string, string> = {};
    if (!citizen.region) errs.region = L("Chagua mkoa", "Select a region");
    if (!citizen.district) errs.district = L("Chagua wilaya", "Select a district");
    if (!citizen.ward) errs.ward = L("Chagua kata", "Select a ward");
    if (!citizen.street.trim()) errs.street = L("Jina la mtaa linahitajika", "Street/village name required");
    setFieldErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const validateCitizenStep3 = () => {
    const errs: Record<string, string> = {};
    if (!otp.verified) errs.otp = L("Thibitisha namba ya simu kwanza", "Verify your phone number first");
    if (citizen.password.length < 6) errs.password = L("Angalau herufi 6", "At least 6 characters");
    if (citizen.password !== citizen.confirmPassword) errs.confirmPassword = L("Nywila hazifanani", "Passwords don't match");
    setFieldErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const validateDiasporaStep1 = () => {
    const errs: Record<string, string> = {};
    if (!diaspora.firstName.trim()) errs.firstName = L("Jina la kwanza linahitajika", "First name required");
    if (!diaspora.lastName.trim()) errs.lastName = L("Last name required", "Last name required");
    if (!diaspora.email.trim() || !/\S+@\S+\.\S+/.test(diaspora.email))
      errs.email = L("Barua pepe sahihi inahitajika", "Valid email required");
    if (!diaspora.passportNumber.trim()) errs.passportNumber = L("Namba ya pasipoti inahitajika", "Passport number required");
    if (!diaspora.dateOfBirth) errs.dateOfBirth = L("Tarehe ya kuzaliwa inahitajika", "Date of birth required");
    setFieldErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const validateDiasporaStep2 = () => {
    const errs: Record<string, string> = {};
    if (!diaspora.countryOfResidence) errs.countryOfResidence = L("Chagua nchi ya makazi", "Select country of residence");
    if (!diaspora.cityOfResidence.trim()) errs.cityOfResidence = L("Jina la mji linahitajika", "City required");
    if (!diaspora.regionOfOrigin) errs.regionOfOrigin = L("Chagua mkoa wa asili", "Select home region");
    if (!diaspora.districtOfOrigin) errs.districtOfOrigin = L("Chagua wilaya ya asili", "Select home district");
    if (!diaspora.wardOfOrigin) errs.wardOfOrigin = L("Chagua kata ya asili", "Select home ward");
    setFieldErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const validateDiasporaStep3 = () => {
    const errs: Record<string, string> = {};
    if (diaspora.password.length < 6) errs.password = L("Angalau herufi 6", "At least 6 characters");
    if (diaspora.password !== diaspora.confirmPassword) errs.confirmPassword = L("Nywila hazifanani", "Passwords don't match");
    setFieldErrors(errs);
    return Object.keys(errs).length === 0;
  };

  // ── OTP handlers ───────────────────────────────────────────────────────────
  const handleSendOtp = async () => {
    if (!IS_SUPABASE_CONFIGURED) return;
    if (!citizen.phone || !isTanzanianNumber(citizen.phone)) {
      showToast(L("Ingiza namba sahihi ya Tanzania kwanza", "Enter a valid Tanzanian number first"), "error");
      return;
    }
    const e164 = toE164(citizen.phone);
    updOtp({ loading: true });
    try {
      const { error } = await supabase.auth.signInWithOtp({ phone: e164 });
      if (error) throw error;
      updOtp({ sent: true, loading: false });
      showToast(L(`OTP imetumwa kwa ${e164}`, `OTP sent to ${e164}`), "success");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to send OTP";
      showToast(msg, "error");
      updOtp({ loading: false });
    }
  };

  const handleVerifyOtp = async () => {
    if (otp.code.length < 6) return;
    const e164 = toE164(citizen.phone);
    updOtp({ loading: true });
    try {
      const { error } = await supabase.auth.verifyOtp({
        phone: e164,
        token: otp.code,
        type: "sms",
      });
      if (error) throw error;
      updOtp({ verified: true, loading: false });
      showToast(L("Namba ya simu imethibitishwa!", "Phone number verified!"), "success");
    } catch (err) {
      const attempts = otp.attempts + 1;
      if (attempts >= OTP_MAX_ATTEMPTS) {
        updOtp({ attempts, lockedUntil: Date.now() + OTP_LOCKOUT_MS, loading: false, code: "" });
        showToast(L("Umezuiwa kwa dakika 15", "Locked for 15 minutes"), "error");
      } else {
        updOtp({ attempts, loading: false, code: "" });
        showToast(
          L(`Namba si sahihi. Majaribio ${OTP_MAX_ATTEMPTS - attempts} yamebaki`, `Invalid code. ${OTP_MAX_ATTEMPTS - attempts} attempts remaining`),
          "error",
        );
      }
    }
  };

  // ── Login handler ──────────────────────────────────────────────────────────
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!IS_SUPABASE_CONFIGURED) {
      showToast(L("Mfumo haujasanidiwa", "System not configured"), "error");
      return;
    }
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: loginEmail,
        password: loginPassword,
      });
      if (error) {
        if (error.message.includes("Invalid login credentials"))
          throw new Error(L("Barua pepe au nywila si sahihi", "Incorrect email or password"));
        if (error.message.includes("Email not confirmed"))
          throw new Error(L("Barua pepe bado haijathibitishwa. Angalia inbox yako.", "Email not confirmed. Check your inbox."));
        throw error;
      }
      if (data.user) fetchUserProfile(data.user.id).catch(() => {});
      onClose();
    } catch (err) {
      showToast((err as Error).message ?? L("Imeshindwa", "Login failed"), "error");
    } finally {
      setLoading(false);
    }
  };

  // ── Forgot password ────────────────────────────────────────────────────────
  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!forgotEmail.trim()) return;
    setLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(forgotEmail, {
        redirectTo: `${window.location.origin}/confirm`,
      });
      if (error) throw error;
      setForgotSent(true);
    } catch (err) {
      showToast((err as Error).message ?? "Error", "error");
    } finally {
      setLoading(false);
    }
  };

  // ── Citizen signup ─────────────────────────────────────────────────────────
  const handleCitizenSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateCitizenStep3()) return;
    setLoading(true);
    try {
      const phone = toE164(citizen.phone);
      const meta = {
        first_name: citizen.firstName.trim().toUpperCase(),
        middle_name: citizen.middleName.trim().toUpperCase() || null,
        last_name: citizen.lastName.trim().toUpperCase(),
        phone,
        nationality: "Tanzanian",
        region: citizen.region,
        district: citizen.district,
        ward: citizen.ward,
        street: citizen.street.trim(),
        house_number: citizen.houseNumber.trim() || null,
        is_diaspora: false,
        role: "citizen",
        verification_level: "PHONE_VERIFIED",
        account_status: "ACTIVE",
        is_verified: true,
      };

      const { data, error } = await supabase.auth.signUp({
        email: citizen.email.trim(),
        password: citizen.password,
        options: { data: meta },
      });
      if (error) {
        if (error.message.includes("already registered"))
          throw new Error(L("Barua pepe hii tayari imesajiliwa", "This email is already registered"));
        throw error;
      }
      if (!data.user) throw new Error(L("Usajili umeshindwa", "Signup failed"));

      // Upsert profile
      const { error: upsertErr } = await supabase.from("users").upsert(
        { id: data.user.id, email: citizen.email.trim(), ...meta },
        { onConflict: "id" },
      );
      if (upsertErr) console.warn("[Signup] Profile upsert failed:", upsertErr.message);

      showToast(
        L("Usajili umekamilika! Angalia barua pepe yako kisha ingia.", "Registration complete! Check your email then login."),
        "success",
      );
      setMode("login");
      onClose();
    } catch (err) {
      showToast((err as Error).message ?? L("Hitilafu imetokea", "An error occurred"), "error");
    } finally {
      setLoading(false);
    }
  };

  // ── Diaspora signup ────────────────────────────────────────────────────────
  const handleDiasporaSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateDiasporaStep3()) return;
    setLoading(true);
    try {
      const meta = {
        first_name: diaspora.firstName.trim().toUpperCase(),
        middle_name: diaspora.middleName.trim().toUpperCase() || null,
        last_name: diaspora.lastName.trim().toUpperCase(),
        passport_number: diaspora.passportNumber.trim().toUpperCase(),
        date_of_birth: diaspora.dateOfBirth,
        gender: diaspora.gender,
        sex: diaspora.gender,
        country_of_residence: diaspora.countryOfResidence,
        city_of_residence: diaspora.cityOfResidence.trim(),
        region: diaspora.regionOfOrigin,
        district: diaspora.districtOfOrigin,
        ward: diaspora.wardOfOrigin,
        nationality: "Tanzanian",
        is_diaspora: true,
        role: "citizen",
        verification_level: "EMAIL_VERIFIED",
        account_status: "ACTIVE",
        is_verified: true,
      };

      const { data, error } = await supabase.auth.signUp({
        email: diaspora.email.trim(),
        password: diaspora.password,
        options: { data: meta },
      });
      if (error) {
        if (error.message.includes("already registered"))
          throw new Error(L("Barua pepe hii tayari imesajiliwa", "This email is already registered"));
        throw error;
      }
      if (!data.user) throw new Error(L("Usajili umeshindwa", "Signup failed"));

      const { error: upsertErr } = await supabase.from("users").upsert(
        { id: data.user.id, email: diaspora.email.trim(), ...meta },
        { onConflict: "id" },
      );
      if (upsertErr) console.warn("[Diaspora Signup] Profile upsert failed:", upsertErr.message);

      showToast(
        L("Usajili umekamilika! Angalia barua pepe yako ili kuthibitisha akaunti.", "Registration complete! Check your email to verify your account."),
        "success",
      );
      setMode("login");
      onClose();
    } catch (err) {
      showToast((err as Error).message ?? L("Hitilafu imetokea", "An error occurred"), "error");
    } finally {
      setLoading(false);
    }
  };

  // ── Step navigation ────────────────────────────────────────────────────────
  const handleCitizenNext = () => {
    if (regStep === 1 && !validateCitizenStep1()) return;
    if (regStep === 2 && !validateCitizenStep2()) return;
    setRegStep((s) => s + 1);
  };

  const handleDiasporaNext = () => {
    if (regStep === 1 && !validateDiasporaStep1()) return;
    if (regStep === 2 && !validateDiasporaStep2()) return;
    setRegStep((s) => s + 1);
  };

  // ── Citizen step labels ────────────────────────────────────────────────────
  const citizenStepLabels = [
    L("Hatua 1: Taarifa Binafsi", "Step 1: Personal Info"),
    L("Hatua 2: Mahali pa Kuishi", "Step 2: Location"),
    L("Hatua 3: Thibitisho & Nywila", "Step 3: Verification & Password"),
  ];
  const diasporaStepLabels = [
    L("Hatua 1: Taarifa Binafsi", "Step 1: Personal Info"),
    L("Hatua 2: Mahali pa Asili", "Step 2: Origin & Residence"),
    L("Hatua 3: Nywila", "Step 3: Password"),
  ];

  // ─────────────────────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-0 sm:p-4">
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-stone-900/60 backdrop-blur-sm"
      />

      {/* Modal */}
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 16 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 16 }}
        transition={{ type: "spring", stiffness: 400, damping: 30 }}
        className="relative w-full h-full sm:h-auto sm:max-w-xl bg-white sm:rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-screen sm:max-h-[92vh]"
      >
        {/* ── Header ── */}
        <div className="px-5 sm:px-7 py-4 border-b border-stone-100 flex items-center justify-between bg-white sticky top-0 z-10 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-50 flex items-center justify-center shrink-0">
              <img
                src={TANZANIA_LOGO_URL}
                alt="Coat of Arms"
                className="w-5 h-5 object-contain"
                referrerPolicy="no-referrer"
              />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black tracking-tight text-stone-900 leading-tight">
                {mode === "login"
                  ? L("Ingia Mfumoni", "Sign In")
                  : regType === "diaspora"
                    ? L("Usajili — Watanzania Nje", "Diaspora Registration")
                    : L("Usajili — Raia wa Tanzania", "Citizen Registration")}
              </h2>
              <p className="text-[9px] sm:text-[10px] font-bold text-stone-400 uppercase tracking-widest leading-none">
                E-SERIKALI MTAA · PORTAL
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-stone-100 rounded-full transition-colors text-stone-400 hover:text-stone-600 shrink-0"
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>

        {/* ── Body ── */}
        <div className="flex-1 overflow-y-auto px-5 sm:px-7 py-5">

          {/* ════════════════════════════════════════════════════════════════
              LOGIN
          ════════════════════════════════════════════════════════════════ */}
          {mode === "login" && (
            <div className="max-w-sm mx-auto">
              <AnimatePresence mode="wait">
                {!showForgot ? (
                  <motion.div
                    key="login"
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                  >
                    <form onSubmit={handleLogin} className="space-y-5">
                      <div className="space-y-1.5">
                        <FieldLabel>{L("Barua Pepe", "Email")}</FieldLabel>
                        <TextInput
                          type="email"
                          value={loginEmail}
                          onChange={(e) => setLoginEmail(e.target.value)}
                          placeholder="juma@mfano.co.tz"
                          icon={<Mail size={17} />}
                          required
                          autoComplete="email"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between">
                          <FieldLabel>{L("Nywila", "Password")}</FieldLabel>
                          <button
                            type="button"
                            onClick={() => setShowForgot(true)}
                            className="text-xs font-bold text-emerald-600 hover:underline"
                          >
                            {L("Umesahau?", "Forgot?")}
                          </button>
                        </div>
                        <div className="relative">
                          <TextInput
                            type={showLoginPwd ? "text" : "password"}
                            value={loginPassword}
                            onChange={(e) => setLoginPassword(e.target.value)}
                            placeholder="••••••••"
                            icon={<Lock size={17} />}
                            required
                            autoComplete="current-password"
                          />
                          <button
                            type="button"
                            onClick={() => setShowLoginPwd((v) => !v)}
                            className="absolute right-4 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600"
                            aria-label={showLoginPwd ? "Hide" : "Show"}
                          >
                            {showLoginPwd ? <EyeOff size={16} /> : <Eye size={16} />}
                          </button>
                        </div>
                      </div>

                      <button
                        type="submit"
                        disabled={loading}
                        className="w-full h-13 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-2xl font-bold text-base flex items-center justify-center gap-2 transition-all shadow-lg shadow-emerald-100"
                      >
                        {loading ? <Loader2 size={18} className="animate-spin" /> : L("Ingia", "Sign In")}
                      </button>

                      <p className="text-center text-sm text-stone-500">
                        {L("Huna akaunti?", "No account?")}{" "}
                        <button
                          type="button"
                          onClick={() => setMode("signup")}
                          className="text-emerald-600 font-bold hover:underline"
                        >
                          {L("Jisajili", "Sign up")}
                        </button>
                      </p>
                    </form>
                  </motion.div>
                ) : (
                  <motion.div
                    key="forgot"
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    className="space-y-5"
                  >
                    <button
                      onClick={() => { setShowForgot(false); setForgotSent(false); }}
                      className="flex items-center gap-1.5 text-sm font-bold text-stone-500 hover:text-stone-800"
                    >
                      <ArrowLeft size={15} /> {L("Rudi", "Back")}
                    </button>

                    {!forgotSent ? (
                      <form onSubmit={handleForgotPassword} className="space-y-4">
                        <div>
                          <h3 className="text-lg font-black text-stone-900 mb-1">
                            {L("Rudisha Nywila", "Reset Password")}
                          </h3>
                          <p className="text-sm text-stone-500">
                            {L("Tutakutumia kiungo cha kubadilisha nywila.", "We'll send a reset link to your email.")}
                          </p>
                        </div>
                        <div className="space-y-1.5">
                          <FieldLabel>{L("Barua Pepe", "Email")}</FieldLabel>
                          <TextInput
                            type="email"
                            value={forgotEmail}
                            onChange={(e) => setForgotEmail(e.target.value)}
                            placeholder="juma@mfano.co.tz"
                            icon={<Mail size={17} />}
                            required
                          />
                        </div>
                        <button
                          type="submit"
                          disabled={loading}
                          className="w-full h-13 bg-stone-900 hover:bg-black text-white rounded-2xl font-bold flex items-center justify-center gap-2 transition-all"
                        >
                          {loading ? <Loader2 size={16} className="animate-spin" /> : L("Tuma Kiungo", "Send Reset Link")}
                        </button>
                      </form>
                    ) : (
                      <div className="text-center py-6 space-y-3">
                        <div className="w-14 h-14 bg-emerald-100 rounded-2xl flex items-center justify-center mx-auto">
                          <Mail size={24} className="text-emerald-600" />
                        </div>
                        <h3 className="font-black text-stone-900">
                          {L("Angalia barua pepe yako", "Check your email")}
                        </h3>
                        <p className="text-sm text-stone-500">
                          {L(`Kiungo kimetumwa kwa ${forgotEmail}`, `Reset link sent to ${forgotEmail}`)}
                        </p>
                        <button
                          onClick={() => { setShowForgot(false); setForgotSent(false); }}
                          className="text-sm font-bold text-emerald-600 hover:underline"
                        >
                          {L("Rudi kuingia", "Back to sign in")}
                        </button>
                      </div>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}

          {/* ════════════════════════════════════════════════════════════════
              SIGNUP — shared type switcher only shown when not isDiaspora
          ════════════════════════════════════════════════════════════════ */}
          {mode === "signup" && (
            <div>
              {/* Registration type badge */}
              <div
                className={cn(
                  "mb-5 px-4 py-2.5 rounded-xl flex items-center gap-2.5 text-sm font-bold",
                  regType === "diaspora"
                    ? "bg-blue-50 text-blue-700 border border-blue-200"
                    : "bg-emerald-50 text-emerald-700 border border-emerald-200",
                )}
              >
                {regType === "diaspora" ? (
                  <Globe2 size={16} className="shrink-0" />
                ) : (
                  <MapPin size={16} className="shrink-0" />
                )}
                {regType === "diaspora"
                  ? L("Usajili wa Mtanzania Nje ya Nchi", "Diaspora Citizen Registration")
                  : L("Usajili wa Raia wa Tanzania", "Tanzania Resident Registration")}
              </div>

              <AnimatePresence mode="wait">
                {/* ════════════════════════════
                    CITIZEN FLOW
                ════════════════════════════ */}
                {regType === "citizen" && (
                  <motion.div key={`citizen-step-${regStep}`} initial={{ opacity: 0, x: 18 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -18 }}>
                    <StepBar step={regStep} total={3} labels={citizenStepLabels} />

                    {/* CITIZEN STEP 1 — Personal */}
                    {regStep === 1 && (
                      <div className="space-y-4">
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                          <div className="space-y-1.5">
                            <FieldLabel required>{L("Jina la Kwanza", "First Name")}</FieldLabel>
                            <TextInput
                              value={citizen.firstName}
                              onChange={(e) => { updC("firstName", e.target.value); clearErr("firstName"); }}
                              placeholder="Juma"
                              icon={<User size={15} />}
                              error={fieldErrors.firstName}
                            />
                          </div>
                          <div className="space-y-1.5">
                            <FieldLabel optional>{L("Jina la Kati", "Middle Name")}</FieldLabel>
                            <TextInput
                              value={citizen.middleName}
                              onChange={(e) => updC("middleName", e.target.value)}
                              placeholder="Rashidi"
                            />
                          </div>
                          <div className="space-y-1.5">
                            <FieldLabel required>{L("Jina la Mwisho", "Last Name")}</FieldLabel>
                            <TextInput
                              value={citizen.lastName}
                              onChange={(e) => { updC("lastName", e.target.value); clearErr("lastName"); }}
                              placeholder="Mkubwa"
                              error={fieldErrors.lastName}
                            />
                          </div>
                        </div>

                        <div className="space-y-1.5">
                          <FieldLabel required>{L("Namba ya Simu (Tanzania)", "Mobile Number (Tanzania)")}</FieldLabel>
                          <p className="text-[11px] text-stone-400 font-medium -mt-0.5">
                            {L("Lazima iwe 06xxxxxxx au 07xxxxxxx", "Must be 06xxxxxxx or 07xxxxxxx")}
                          </p>
                          <div className="relative">
                            <PhoneInput
                              international
                              defaultCountry="TZ"
                              value={citizen.phone}
                              onChange={(val) => { updC("phone", val ?? ""); clearErr("phone"); }}
                              className="w-full h-13 px-4 bg-stone-50 border border-stone-200 rounded-xl font-medium text-stone-900 focus-within:ring-2 focus-within:ring-emerald-500 transition-all"
                            />
                          </div>
                          {fieldErrors.phone && (
                            <p className="text-xs text-red-500 flex items-center gap-1">
                              <AlertCircle size={11} /> {fieldErrors.phone}
                            </p>
                          )}
                        </div>

                        <div className="space-y-1.5">
                          <FieldLabel required>{L("Barua Pepe", "Email")}</FieldLabel>
                          <p className="text-[11px] text-stone-400 font-medium -mt-0.5">
                            {L("Kwa arifa na kuthibitishwa", "For notifications and verification")}
                          </p>
                          <TextInput
                            type="email"
                            value={citizen.email}
                            onChange={(e) => { updC("email", e.target.value); clearErr("email"); }}
                            placeholder="juma@mfano.co.tz"
                            icon={<Mail size={17} />}
                            error={fieldErrors.email}
                          />
                        </div>

                        <button
                          type="button"
                          onClick={handleCitizenNext}
                          className="w-full h-13 bg-stone-900 hover:bg-black text-white rounded-2xl font-bold flex items-center justify-center gap-2 transition-all mt-2"
                        >
                          {L("Endelea", "Continue")} <ArrowRight size={18} />
                        </button>

                        <p className="text-center text-sm text-stone-500">
                          {L("Una akaunti?", "Have an account?")}{" "}
                          <button type="button" onClick={() => setMode("login")} className="text-emerald-600 font-bold hover:underline">
                            {L("Ingia", "Sign in")}
                          </button>
                        </p>
                      </div>
                    )}

                    {/* CITIZEN STEP 2 — Location */}
                    {regStep === 2 && (
                      <div className="space-y-4">
                        <div className="p-3 bg-stone-50 border border-stone-200 rounded-xl flex items-start gap-2.5">
                          <MapPin size={15} className="text-emerald-600 shrink-0 mt-0.5" />
                          <p className="text-xs text-stone-600 leading-relaxed">
                            {L("Anwani yako inatumika kupanga ofisi inayokuhudumia otomatiki.", "Your address is used to automatically assign the office that serves you.")}
                          </p>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div className="space-y-1.5">
                            <FieldLabel required>{L("Mkoa", "Region")}</FieldLabel>
                            <SelectInput
                              value={citizen.region}
                              onChange={(e) => { updC("region", e.target.value); updC("district", ""); updC("ward", ""); clearErr("region"); }}
                              placeholder={L("Chagua Mkoa", "Select Region")}
                            >
                              {TANZANIA_ADDRESS_DATA.map((r) => (
                                <option key={r.name} value={r.name}>{r.name}</option>
                              ))}
                            </SelectInput>
                            {fieldErrors.region && <p className="text-xs text-red-500 flex items-center gap-1"><AlertCircle size={11} /> {fieldErrors.region}</p>}
                          </div>

                          <div className="space-y-1.5">
                            <FieldLabel required>{L("Wilaya", "District")}</FieldLabel>
                            <SelectInput
                              value={citizen.district}
                              onChange={(e) => { updC("district", e.target.value); updC("ward", ""); clearErr("district"); }}
                              disabled={!citizen.region}
                              placeholder={L("Chagua Wilaya", "Select District")}
                            >
                              {citizenDistricts.map((d) => (
                                <option key={d.name} value={d.name}>{d.name}</option>
                              ))}
                            </SelectInput>
                            {fieldErrors.district && <p className="text-xs text-red-500 flex items-center gap-1"><AlertCircle size={11} /> {fieldErrors.district}</p>}
                          </div>

                          <div className="space-y-1.5">
                            <FieldLabel required>{L("Kata", "Ward")}</FieldLabel>
                            <SelectInput
                              value={citizen.ward}
                              onChange={(e) => { updC("ward", e.target.value); clearErr("ward"); }}
                              disabled={!citizen.district}
                              placeholder={L("Chagua Kata", "Select Ward")}
                            >
                              {citizenWards.map((w) => (
                                <option key={w} value={w}>{w}</option>
                              ))}
                              <option value="Mengineyo">{L("Mengineyo", "Other")}</option>
                            </SelectInput>
                            {fieldErrors.ward && <p className="text-xs text-red-500 flex items-center gap-1"><AlertCircle size={11} /> {fieldErrors.ward}</p>}
                          </div>

                          <div className="space-y-1.5">
                            <FieldLabel required>{L("Mtaa / Kijiji", "Street / Village")}</FieldLabel>
                            <TextInput
                              value={citizen.street}
                              onChange={(e) => { updC("street", e.target.value); clearErr("street"); }}
                              placeholder={L("Jina la mtaa au kijiji", "Street or village name")}
                              icon={<Home size={15} />}
                              error={fieldErrors.street}
                            />
                          </div>

                          <div className="space-y-1.5 sm:col-span-2">
                            <FieldLabel optional>{L("Namba ya Nyumba", "House Number")}</FieldLabel>
                            <TextInput
                              value={citizen.houseNumber}
                              onChange={(e) => updC("houseNumber", e.target.value)}
                              placeholder="e.g. B12 / Plot 45"
                            />
                          </div>
                        </div>

                        <div className="flex gap-3 mt-2">
                          <button type="button" onClick={() => setRegStep(1)} className="flex-1 h-13 bg-white border border-stone-200 text-stone-600 rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-stone-50 transition-all">
                            <ArrowLeft size={16} /> {L("Rudi", "Back")}
                          </button>
                          <button type="button" onClick={handleCitizenNext} className="flex-[2] h-13 bg-stone-900 hover:bg-black text-white rounded-2xl font-bold flex items-center justify-center gap-2 transition-all">
                            {L("Endelea", "Continue")} <ArrowRight size={16} />
                          </button>
                        </div>
                      </div>
                    )}

                    {/* CITIZEN STEP 3 — OTP + Password */}
                    {regStep === 3 && (
                      <form onSubmit={handleCitizenSignup} className="space-y-4">
                        {/* SMS OTP */}
                        <SmsOtpBox
                          phone={toE164(citizen.phone)}
                          otp={otp}
                          lang={lang}
                          onSend={handleSendOtp}
                          onVerify={handleVerifyOtp}
                          onCodeChange={(c) => updOtp({ code: c })}
                        />
                        {fieldErrors.otp && (
                          <p className="text-xs text-red-500 flex items-center gap-1"><AlertCircle size={11} /> {fieldErrors.otp}</p>
                        )}

                        <div className="pt-2 space-y-3">
                          <div className="space-y-1.5">
                            <FieldLabel required>{L("Nywila", "Password")}</FieldLabel>
                            <p className="text-[11px] text-stone-400 -mt-0.5">{L("Angalau herufi 6", "Minimum 6 characters")}</p>
                            <div className="relative">
                              <TextInput
                                type={showRegPwd ? "text" : "password"}
                                value={citizen.password}
                                onChange={(e) => { updC("password", e.target.value); clearErr("password"); }}
                                placeholder="••••••••"
                                icon={<Lock size={17} />}
                                error={fieldErrors.password}
                              />
                              <button type="button" onClick={() => setShowRegPwd((v) => !v)} className="absolute right-4 top-4 text-stone-400 hover:text-stone-600" aria-label="Toggle">
                                {showRegPwd ? <EyeOff size={16} /> : <Eye size={16} />}
                              </button>
                            </div>
                          </div>

                          <div className="space-y-1.5">
                            <FieldLabel required>{L("Thibitisha Nywila", "Confirm Password")}</FieldLabel>
                            <div className="relative">
                              <TextInput
                                type={showRegPwd ? "text" : "password"}
                                value={citizen.confirmPassword}
                                onChange={(e) => { updC("confirmPassword", e.target.value); clearErr("confirmPassword"); }}
                                placeholder="••••••••"
                                icon={<Lock size={17} />}
                                error={fieldErrors.confirmPassword}
                              />
                            </div>
                          </div>
                        </div>

                        {/* Password strength */}
                        {citizen.password.length > 0 && (
                          <div className="flex gap-1">
                            {[6, 8, 10].map((threshold, i) => (
                              <div key={i} className={cn("h-1 flex-1 rounded-full transition-all", citizen.password.length >= threshold ? ["bg-red-400", "bg-amber-400", "bg-emerald-500"][i] : "bg-stone-200")} />
                            ))}
                          </div>
                        )}

                        <label className="flex items-start gap-2.5 cursor-pointer">
                          <input type="checkbox" required className="mt-0.5 h-4 w-4 rounded text-emerald-600 border-stone-300 focus:ring-emerald-500" />
                          <span className="text-xs text-stone-500 leading-relaxed">
                            {L("Nakubali Masharti ya Matumizi na Sera ya Faragha ya E-Mtaa.", "I agree to E-Mtaa's Terms of Service and Privacy Policy.")}
                          </span>
                        </label>

                        <div className="flex gap-3">
                          <button type="button" onClick={() => setRegStep(2)} className="flex-1 h-13 bg-white border border-stone-200 text-stone-600 rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-stone-50 transition-all">
                            <ArrowLeft size={16} /> {L("Rudi", "Back")}
                          </button>
                          <button type="submit" disabled={loading} className="flex-[2] h-13 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-2xl font-bold flex items-center justify-center gap-2 transition-all shadow-lg shadow-emerald-100">
                            {loading ? <Loader2 size={16} className="animate-spin" /> : <><CheckCircle2 size={16} /> {L("Kamilisha Usajili", "Complete Registration")}</>}
                          </button>
                        </div>

                        {/* Info box */}
                        <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-2">
                          <Shield size={13} className="text-amber-600 shrink-0 mt-0.5" />
                          <p className="text-[11px] text-amber-700 leading-relaxed">
                            {L("Baada ya usajili, akaunti yako itakuwa na hali ya PHONE_VERIFIED na itaweza kutumia huduma zote.", "After registration your account will be PHONE_VERIFIED and can access all services.")}
                          </p>
                        </div>
                      </form>
                    )}
                  </motion.div>
                )}

                {/* ════════════════════════════
                    DIASPORA FLOW
                ════════════════════════════ */}
                {regType === "diaspora" && (
                  <motion.div key={`diaspora-step-${regStep}`} initial={{ opacity: 0, x: 18 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -18 }}>
                    <StepBar step={regStep} total={3} labels={diasporaStepLabels} />

                    {/* DIASPORA STEP 1 — Personal */}
                    {regStep === 1 && (
                      <div className="space-y-4">
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                          <div className="space-y-1.5">
                            <FieldLabel required>{L("Jina la Kwanza", "First Name")}</FieldLabel>
                            <TextInput value={diaspora.firstName} onChange={(e) => { updD("firstName", e.target.value); clearErr("firstName"); }} placeholder="Amina" icon={<User size={15} />} error={fieldErrors.firstName} />
                          </div>
                          <div className="space-y-1.5">
                            <FieldLabel optional>{L("Jina la Kati", "Middle Name")}</FieldLabel>
                            <TextInput value={diaspora.middleName} onChange={(e) => updD("middleName", e.target.value)} placeholder="Mwajuma" />
                          </div>
                          <div className="space-y-1.5">
                            <FieldLabel required>{L("Jina la Mwisho", "Last Name")}</FieldLabel>
                            <TextInput value={diaspora.lastName} onChange={(e) => { updD("lastName", e.target.value); clearErr("lastName"); }} placeholder="Hassan" error={fieldErrors.lastName} />
                          </div>
                        </div>

                        <div className="space-y-1.5">
                          <FieldLabel required>{L("Barua Pepe", "Email")}</FieldLabel>
                          <p className="text-[11px] text-stone-400 -mt-0.5">
                            {L("Uthibitisho unatumia barua pepe pekee — hakuna SMS", "Verification is by email only — no SMS required")}
                          </p>
                          <TextInput type="email" value={diaspora.email} onChange={(e) => { updD("email", e.target.value); clearErr("email"); }} placeholder="amina@example.com" icon={<Mail size={17} />} error={fieldErrors.email} />
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div className="space-y-1.5">
                            <FieldLabel required>{L("Namba ya Pasipoti", "Passport Number")}</FieldLabel>
                            <TextInput value={diaspora.passportNumber} onChange={(e) => { updD("passportNumber", e.target.value.toUpperCase()); clearErr("passportNumber"); }} placeholder="TZ1234567" error={fieldErrors.passportNumber} />
                          </div>
                          <div className="space-y-1.5">
                            <FieldLabel required>{L("Tarehe ya Kuzaliwa", "Date of Birth")}</FieldLabel>
                            <TextInput type="date" value={diaspora.dateOfBirth} onChange={(e) => { updD("dateOfBirth", e.target.value); clearErr("dateOfBirth"); }} max={new Date().toISOString().split("T")[0]} icon={<Calendar size={15} />} error={fieldErrors.dateOfBirth} />
                          </div>
                        </div>

                        <div className="space-y-1.5">
                          <FieldLabel required>{L("Jinsia", "Gender")}</FieldLabel>
                          <div className="flex gap-2">
                            {(["M", "F", "O"] as const).map((g) => (
                              <button
                                key={g}
                                type="button"
                                onClick={() => updD("gender", g)}
                                className={cn("flex-1 h-11 rounded-xl font-bold text-sm border-2 transition-all", diaspora.gender === g ? "bg-emerald-600 border-emerald-600 text-white" : "bg-white border-stone-200 text-stone-500 hover:border-stone-300")}
                              >
                                {g === "M" ? L("Mwanaume", "Male") : g === "F" ? L("Mwanamke", "Female") : L("Nyingine", "Other")}
                              </button>
                            ))}
                          </div>
                        </div>

                        <button type="button" onClick={handleDiasporaNext} className="w-full h-13 bg-stone-900 hover:bg-black text-white rounded-2xl font-bold flex items-center justify-center gap-2 transition-all">
                          {L("Endelea", "Continue")} <ArrowRight size={18} />
                        </button>
                        <p className="text-center text-sm text-stone-500">
                          {L("Una akaunti?", "Have an account?")}{" "}
                          <button type="button" onClick={() => setMode("login")} className="text-emerald-600 font-bold hover:underline">{L("Ingia", "Sign in")}</button>
                        </p>
                      </div>
                    )}

                    {/* DIASPORA STEP 2 — Residence + Origin */}
                    {regStep === 2 && (
                      <div className="space-y-4">
                        <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl flex items-start gap-2.5">
                          <Globe2 size={14} className="text-blue-600 shrink-0 mt-0.5" />
                          <p className="text-xs text-blue-700 leading-relaxed">
                            {L("Ingiza nchi na jiji unaloishi sasa, na mkoa wako wa asili Tanzania.", "Enter your current country and city of residence, and your home region in Tanzania.")}
                          </p>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div className="space-y-1.5">
                            <FieldLabel required>{L("Nchi ya Makazi", "Country of Residence")}</FieldLabel>
                            <SelectInput value={diaspora.countryOfResidence} onChange={(e) => { updD("countryOfResidence", e.target.value); clearErr("countryOfResidence"); }} placeholder={L("Chagua Nchi", "Select Country")}>
                              {COUNTRIES.map((c) => <option key={c} value={c}>{c}</option>)}
                            </SelectInput>
                            {fieldErrors.countryOfResidence && <p className="text-xs text-red-500 flex items-center gap-1"><AlertCircle size={11} /> {fieldErrors.countryOfResidence}</p>}
                          </div>
                          <div className="space-y-1.5">
                            <FieldLabel required>{L("Jiji la Makazi", "City of Residence")}</FieldLabel>
                            <TextInput value={diaspora.cityOfResidence} onChange={(e) => { updD("cityOfResidence", e.target.value); clearErr("cityOfResidence"); }} placeholder="London, Nairobi, Dubai..." error={fieldErrors.cityOfResidence} />
                          </div>
                        </div>

                        <div className="pt-1">
                          <p className="text-[11px] font-black text-stone-400 uppercase tracking-widest mb-3">
                            {L("Mahali pa Asili — Tanzania", "Home Location — Tanzania")}
                          </p>
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                            <div className="space-y-1.5">
                              <FieldLabel required>{L("Mkoa", "Region")}</FieldLabel>
                              <SelectInput value={diaspora.regionOfOrigin} onChange={(e) => { updD("regionOfOrigin", e.target.value); updD("districtOfOrigin", ""); updD("wardOfOrigin", ""); clearErr("regionOfOrigin"); }} placeholder={L("Chagua", "Select")}>
                                {TANZANIA_ADDRESS_DATA.map((r) => <option key={r.name} value={r.name}>{r.name}</option>)}
                              </SelectInput>
                              {fieldErrors.regionOfOrigin && <p className="text-xs text-red-500 flex items-center gap-1"><AlertCircle size={11} /> {fieldErrors.regionOfOrigin}</p>}
                            </div>
                            <div className="space-y-1.5">
                              <FieldLabel required>{L("Wilaya", "District")}</FieldLabel>
                              <SelectInput value={diaspora.districtOfOrigin} onChange={(e) => { updD("districtOfOrigin", e.target.value); updD("wardOfOrigin", ""); clearErr("districtOfOrigin"); }} disabled={!diaspora.regionOfOrigin} placeholder={L("Chagua", "Select")}>
                                {diasporaDistricts.map((d) => <option key={d.name} value={d.name}>{d.name}</option>)}
                              </SelectInput>
                              {fieldErrors.districtOfOrigin && <p className="text-xs text-red-500 flex items-center gap-1"><AlertCircle size={11} /> {fieldErrors.districtOfOrigin}</p>}
                            </div>
                            <div className="space-y-1.5">
                              <FieldLabel required>{L("Kata", "Ward")}</FieldLabel>
                              <SelectInput value={diaspora.wardOfOrigin} onChange={(e) => { updD("wardOfOrigin", e.target.value); clearErr("wardOfOrigin"); }} disabled={!diaspora.districtOfOrigin} placeholder={L("Chagua", "Select")}>
                                {diasporaWards.map((w) => <option key={w} value={w}>{w}</option>)}
                                <option value="Mengineyo">{L("Mengineyo", "Other")}</option>
                              </SelectInput>
                              {fieldErrors.wardOfOrigin && <p className="text-xs text-red-500 flex items-center gap-1"><AlertCircle size={11} /> {fieldErrors.wardOfOrigin}</p>}
                            </div>
                          </div>
                        </div>

                        <div className="flex gap-3">
                          <button type="button" onClick={() => setRegStep(1)} className="flex-1 h-13 bg-white border border-stone-200 text-stone-600 rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-stone-50 transition-all">
                            <ArrowLeft size={16} /> {L("Rudi", "Back")}
                          </button>
                          <button type="button" onClick={handleDiasporaNext} className="flex-[2] h-13 bg-stone-900 hover:bg-black text-white rounded-2xl font-bold flex items-center justify-center gap-2 transition-all">
                            {L("Endelea", "Continue")} <ArrowRight size={16} />
                          </button>
                        </div>
                      </div>
                    )}

                    {/* DIASPORA STEP 3 — Password */}
                    {regStep === 3 && (
                      <form onSubmit={handleDiasporaSignup} className="space-y-4">
                        <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl flex items-start gap-2">
                          <Mail size={13} className="text-blue-600 shrink-0 mt-0.5" />
                          <p className="text-xs text-blue-700 leading-relaxed">
                            {L(`Kiungo cha kuthibitisha kitatumwa kwa ${diaspora.email}. Halali kwa masaa 24.`, `A verification link will be sent to ${diaspora.email}. Valid for 24 hours.`)}
                          </p>
                        </div>

                        <div className="space-y-1.5">
                          <FieldLabel required>{L("Nywila", "Password")}</FieldLabel>
                          <p className="text-[11px] text-stone-400 -mt-0.5">{L("Angalau herufi 6", "Minimum 6 characters")}</p>
                          <div className="relative">
                            <TextInput type={showRegPwd ? "text" : "password"} value={diaspora.password} onChange={(e) => { updD("password", e.target.value); clearErr("password"); }} placeholder="••••••••" icon={<Lock size={17} />} error={fieldErrors.password} />
                            <button type="button" onClick={() => setShowRegPwd((v) => !v)} className="absolute right-4 top-4 text-stone-400 hover:text-stone-600" aria-label="Toggle">
                              {showRegPwd ? <EyeOff size={16} /> : <Eye size={16} />}
                            </button>
                          </div>
                        </div>

                        <div className="space-y-1.5">
                          <FieldLabel required>{L("Thibitisha Nywila", "Confirm Password")}</FieldLabel>
                          <div className="relative">
                            <TextInput type={showRegPwd ? "text" : "password"} value={diaspora.confirmPassword} onChange={(e) => { updD("confirmPassword", e.target.value); clearErr("confirmPassword"); }} placeholder="••••••••" icon={<Lock size={17} />} error={fieldErrors.confirmPassword} />
                          </div>
                        </div>

                        {diaspora.password.length > 0 && (
                          <div className="flex gap-1">
                            {[6, 8, 10].map((threshold, i) => (
                              <div key={i} className={cn("h-1 flex-1 rounded-full transition-all", diaspora.password.length >= threshold ? ["bg-red-400", "bg-amber-400", "bg-emerald-500"][i] : "bg-stone-200")} />
                            ))}
                          </div>
                        )}

                        <label className="flex items-start gap-2.5 cursor-pointer">
                          <input type="checkbox" required className="mt-0.5 h-4 w-4 rounded text-emerald-600 border-stone-300 focus:ring-emerald-500" />
                          <span className="text-xs text-stone-500 leading-relaxed">
                            {L("Nakubali Masharti ya Matumizi na Sera ya Faragha ya E-Mtaa.", "I agree to E-Mtaa's Terms of Service and Privacy Policy.")}
                          </span>
                        </label>

                        <div className="flex gap-3">
                          <button type="button" onClick={() => setRegStep(2)} className="flex-1 h-13 bg-white border border-stone-200 text-stone-600 rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-stone-50 transition-all">
                            <ArrowLeft size={16} /> {L("Rudi", "Back")}
                          </button>
                          <button type="submit" disabled={loading} className="flex-[2] h-13 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-2xl font-bold flex items-center justify-center gap-2 transition-all shadow-lg shadow-blue-100">
                            {loading ? <Loader2 size={16} className="animate-spin" /> : <><CheckCircle2 size={16} /> {L("Kamilisha Usajili", "Complete Registration")}</>}
                          </button>
                        </div>

                        <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-2">
                          <Globe2 size={13} className="text-amber-600 shrink-0 mt-0.5" />
                          <p className="text-[11px] text-amber-700 leading-relaxed">
                            {L("Akaunti ya Diaspora inaweza kupata huduma zote kwa mbali. Hali: EMAIL_VERIFIED.", "Diaspora accounts can access all services remotely. Status: EMAIL_VERIFIED.")}
                          </p>
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
  );
}

export default Auth;
