import React, { useState } from "react";
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
  Globe2,
  Building2,
  MapPin,
  Phone,
} from "lucide-react";
import PhoneInput, { isValidPhoneNumber } from "react-phone-number-input";
import "react-phone-number-input/style.css";
import { useAuth } from "@/context/AuthContext";
import { useLanguage } from "@/context/LanguageContext";
import { useToast } from "@/context/ToastContext";
import { supabase, UserProfile } from "@/lib/supabase";
import { IS_SUPABASE_CONFIGURED } from "@/lib/config";
import { cn, TanzanianBranding } from "@/lib/utils";
import { TANZANIA_LOGO_URL } from "@/constants/services";

import { COUNTRIES } from "@/constants/countries";
import { TANZANIA_ADDRESS_DATA } from "@/lib/addressData";

interface AuthProps {
  mode: "login" | "signup";
  onClose: () => void;
  setMode: (mode: "login" | "signup") => void;
  isDiaspora?: boolean;
}

export function Auth({ mode, onClose, setMode, isDiaspora = false }: AuthProps) {
  const { fetchUserProfile } = useAuth();
  const { lang, t } = useLanguage();
  const { showToast } = useToast();

  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [forgotPasswordStep, setForgotPasswordStep] = useState(1);
  const [forgotPasswordForm, setForgotPasswordForm] = useState({
    email: "",
    nidaNumber: "",
    phone: "",
    firstName: "",
    newPassword: "",
    confirmNewPassword: "",
  });
  const [regStep, setRegStep] = useState(1);
  const [nidaVerifying, setNidaVerifying] = useState(false);
  const [nidaVerified, setNidaVerified] = useState(false);
  const [nidaError, setNidaError] = useState<string | null>(null);

  // OTP login state
  const [otpMode, setOtpMode] = useState<"none" | "phone" | "email">("none");
  const [otpPhone, setOtpPhone] = useState("");
  const [otpEmail, setOtpEmail] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [otpLoading, setOtpLoading] = useState(false);

  const [regForm, setRegForm] = useState({
    firstName: "",
    middleName: "",
    lastName: "",
    sex: "M",
    nationality: "Mtanzania",
    nidaNumber: "",
    country: isDiaspora ? "" : "Tanzania",
    region: "",
    district: "",
    ward: "",
    street: "",
    phone: "",
    email: "",
    password: "",
    confirmPassword: "",
    lat: null as number | null,
    lng: null as number | null,
    isDiaspora: isDiaspora,
    countryOfResidence: "",
    passportNumber: "",
    countryOfCitizenship: "Tanzania",
    hasNida: true,
    idType: "" as string,
    idNumber: "" as string,
    dateOfBirth: "",
    placeOfBirth: "",
    maritalStatus: "",
    occupation: "",
    educationLevel: "",
  });

  const formatNIDA = (value: string) => {
    const digits = value.replace(/\D/g, "").slice(0, 20);
    const groups = digits.match(/.{1,4}/g) || [];
    return groups.join("-");
  };

  const handleLocationSelect = (
    location: Partial<{ region: string; district: string; ward: string; street: string }>,
  ) => {
    setRegForm((prev) => ({
      ...prev,
      region: location.region || prev.region,
      district: location.district || prev.district,
      ward: location.ward || prev.ward,
      street: location.street || prev.street,
    }));
  };

  const updateRegForm = (key: string, value: unknown) =>
    setRegForm((p) => ({ ...p, [key]: value }) as typeof p);

  const isSupabaseConfigured = IS_SUPABASE_CONFIGURED;

  const verifyNIDA = async () => {
    const cleanNida = regForm.nidaNumber.replace(/\D/g, "");
    if (cleanNida.length !== 20) {
      setNidaError(
        lang === "sw" ? "Namba ya NIDA lazima iwe na tarakimu 20" : "NIDA number must be 20 digits",
      );
      return;
    }

    setNidaVerifying(true);
    setNidaError(null);
    setNidaVerified(false);

    try {
      await new Promise((resolve) => setTimeout(resolve, 2000));

      if (cleanNida.startsWith("000")) {
        throw new Error(lang === "sw" ? "Namba ya NIDA haijapatikana" : "NIDA number not found");
      }

      setNidaVerified(true);
      // NOTE: In production, replace this with a real NIDA API call.
      // The API response should return verified name fields to pre-fill below.
      // setRegForm(prev => ({ ...prev, firstName: res.first_name, ... }));
    } catch (err: unknown) {
      const _e = err as { message?: string };
      setNidaError(_e.message ?? null);
    } finally {
      setNidaVerifying(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isSupabaseConfigured) {
      showToast(
        lang === "sw"
          ? "Mfumo wa Supabase haujasanidiwa. Weka VITE_SUPABASE_URL na VITE_SUPABASE_ANON_KEY kwenye .env."
          : "Supabase is not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in .env.",
        "error",
      );
      return;
    }

    setLoading(true);
    try {
      // --- Fast-fail if backend env wasn't loaded (avoids confusing 20s timeout) ---
      const cfgUrl = import.meta.env.VITE_SUPABASE_URL;
      const cfgKey =
        import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || import.meta.env.VITE_SUPABASE_ANON_KEY;
      if (!cfgUrl || !cfgKey || cfgUrl.includes("placeholder")) {
        throw new Error(
          lang === "sw"
            ? "Mfumo haujasanidiwa. Tafadhali hakikisha mipangilio ya backend imewekwa, kisha jaribu tena."
            : "Backend is not configured. Please check the backend settings and try again.",
        );
      }

      // --- Auth call with a guarded timeout — always clear it after a response ---
      const unreachableError = new Error(
        lang === "sw"
          ? "Huduma ya kuingia haikujibu kwa wakati. Tafadhali jaribu tena."
          : "The sign-in service did not respond in time. Please try again.",
      );
      (unreachableError as any).__isTimeout = true;

      let loginTimeoutId: ReturnType<typeof setTimeout> | undefined;
      const { data, error } = await Promise.race([
        supabase.auth.signInWithPassword({ email, password }),
        new Promise<never>(
          (_, reject) =>
            (loginTimeoutId = setTimeout(() => {
              reject(unreachableError);
            }, 20000)),
        ),
      ]).finally(() => {
        if (loginTimeoutId) clearTimeout(loginTimeoutId);
      });

      // --- Handle auth response ---

      if (error) {
        console.error("Auth error:", (error as { message?: string }).message);
        // 404/503/0 = project paused or infrastructure down
        if (error.status === 503 || error.status === 0) {
          throw unreachableError;
        }
        // 401 means wrong API key — show a clearer message
        if (error.status === 401) {
          throw new Error(
            lang === "sw"
              ? "Hitilafu ya usanidi: API key si sahihi. Angalia faili yako ya .env."
              : "Configuration error: Invalid API key. Check your .env file.",
          );
        }
        if ((error.message ?? "").includes("Email not confirmed")) {
          throw new Error(
            lang === "sw"
              ? "Barua pepe yako bado haijathibitishwa. Tafadhali kagua barua pepe yako."
              : "Your email is not confirmed yet. Please check your inbox.",
          );
        }
        if ((error.message ?? "").includes("Invalid login credentials")) {
          throw new Error(
            lang === "sw" ? "Barua pepe au nywila si sahihi." : "Incorrect email or password.",
          );
        }
        throw error;
      }

      if (data.user) {
        const adminEmails = ["mbazzacodes@gmail.com"];
        const userEmail = data.user.email?.toLowerCase() || "";
        const isAdminEmail = adminEmails.includes(userEmail);

        // Non-blocking: ensure profile exists and backfill any missing fields from metadata
        (async () => {
          try {
            const meta = data.user!.user_metadata || {};

            // Check existing profile — select all key fields
            const { data: existingProfile } = await supabase
              .from("users")
              .select(
                "id, role, first_name, last_name, phone, gender, date_of_birth, region, nida_number",
              )
              .eq("id", data.user!.id)
              .maybeSingle();

            if (!existingProfile) {
              // No profile at all — create full one from metadata
              await supabase.from("users").upsert(
                {
                  id: data.user!.id,
                  email: userEmail,
                  first_name: meta.first_name || userEmail.split("@")[0] || "User",
                  last_name: meta.last_name || "",
                  middle_name: meta.middle_name || null,
                  phone: meta.phone || null,
                  sex: meta.sex || null,
                  gender: meta.gender || meta.sex || null,
                  date_of_birth: meta.date_of_birth || null,
                  place_of_birth: meta.place_of_birth || null,
                  marital_status: meta.marital_status || null,
                  occupation: meta.occupation || null,
                  education_level: meta.education_level || null,
                  nationality: meta.nationality || "Tanzanian",
                  country_of_citizenship: meta.country_of_citizenship || "Tanzania",
                  nida_number: meta.nida_number || null,
                  id_type: meta.id_type || null,
                  id_number: meta.id_number || null,
                  region: meta.region || null,
                  district: meta.district || null,
                  ward: meta.ward || null,
                  street: meta.street || null,
                  is_diaspora: meta.is_diaspora || false,
                  country_of_residence: meta.country_of_residence || null,
                  passport_number: meta.passport_number || null,
                  is_verified: meta.is_verified || false,
                  role: isAdminEmail ? "admin" : meta.role || "citizen",
                  account_status: "active",
                },
                { onConflict: "id" },
              );
            } else {
              // Profile exists — backfill fields that are still empty
              // (covers case where trigger created a minimal row from empty metadata)
              const backfill: Record<string, unknown> = {};
              const isMinimalProfile =
                existingProfile.first_name === userEmail.split("@")[0] ||
                existingProfile.first_name === "User" ||
                (!existingProfile.last_name && !existingProfile.phone);

              if (isMinimalProfile && Object.keys(meta).length > 2) {
                // Overwrite minimal placeholder with real signup data
                if (meta.first_name) backfill.first_name = meta.first_name;
                if (meta.middle_name) backfill.middle_name = meta.middle_name;
                if (meta.last_name) backfill.last_name = meta.last_name;
                if (meta.phone) backfill.phone = meta.phone;
                if (meta.sex) backfill.sex = meta.sex;
                if (meta.gender || meta.sex) backfill.gender = meta.gender || meta.sex;
                if (meta.date_of_birth) backfill.date_of_birth = meta.date_of_birth;
                if (meta.place_of_birth) backfill.place_of_birth = meta.place_of_birth;
                if (meta.marital_status) backfill.marital_status = meta.marital_status;
                if (meta.occupation) backfill.occupation = meta.occupation;
                if (meta.education_level) backfill.education_level = meta.education_level;
                if (meta.nationality) backfill.nationality = meta.nationality;
                if (meta.country_of_citizenship)
                  backfill.country_of_citizenship = meta.country_of_citizenship;
                if (meta.nida_number) backfill.nida_number = meta.nida_number;
                if (meta.id_type) backfill.id_type = meta.id_type;
                if (meta.id_number) backfill.id_number = meta.id_number;
                if (meta.region) backfill.region = meta.region;
                if (meta.district) backfill.district = meta.district;
                if (meta.ward) backfill.ward = meta.ward;
                if (meta.street) backfill.street = meta.street;
                if (meta.is_diaspora !== undefined) backfill.is_diaspora = meta.is_diaspora;
                if (meta.country_of_residence)
                  backfill.country_of_residence = meta.country_of_residence;
                if (meta.passport_number) backfill.passport_number = meta.passport_number;
                if (meta.is_verified !== undefined) backfill.is_verified = meta.is_verified;
              }

              if (isAdminEmail && existingProfile.role !== "admin") {
                backfill.role = "admin";
              }

              if (Object.keys(backfill).length > 0) {
                await supabase.from("users").update(backfill).eq("id", data.user!.id);
              }
            }
          } catch {
            // Profile init is non-blocking — login still succeeds
          }
        })();

        // Do not block login UX on profile refresh.
        // Non-blocking profile refresh — fully silent, never throws
        fetchUserProfile(data.user.id).catch(() => {});
      }

      onClose();
    } catch (err: unknown) {
      const _e = err as { message?: string };
      console.error("Login error:", _e.message);

      const isTimeout = !!(err as any).__isTimeout;
      const isNetworkError =
        isTimeout ||
        _e.message?.includes("Failed to fetch") ||
        _e.message?.includes("NetworkError") ||
        _e.message?.includes("ERR_NAME_NOT_RESOLVED");

      if (isNetworkError) {
        showToast(
          lang === "sw"
            ? "Huduma ya kuingia haikujibu kwa wakati. Tafadhali jaribu tena baada ya muda mfupi."
            : "The sign-in service did not respond in time. Please try again in a moment.",
          "error",
        );
      } else {
        showToast(
          _e.message ??
            (lang === "sw" ? "Imeshindwa. Jaribu tena." : "Login failed. Please try again."),
          "error",
        );
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: window.location.origin,
      },
    });
    if (error) showToast((error as { message?: string }).message ?? "Error", "error");
  };

  const handleAppleLogin = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "apple",
      options: {
        redirectTo: window.location.origin,
      },
    });
    if (error) showToast((error as { message?: string }).message ?? "Error", "error");
  };

  // ── OTP Handlers ──────────────────────────────────────────────────
  const handleSendPhoneOtp = async () => {
    const phone = otpPhone.trim().replace(/\s/g, "");
    if (!phone || phone.length < 10) {
      showToast(
        lang === "sw" ? "Ingiza namba sahihi ya simu" : "Enter a valid phone number",
        "error",
      );
      return;
    }
    // Ensure +255 prefix for Tanzania
    const formattedPhone = phone.startsWith("+")
      ? phone
      : phone.startsWith("0")
        ? `+255${phone.slice(1)}`
        : `+255${phone}`;
    setOtpLoading(true);
    try {
      const { error } = await supabase.auth.signInWithOtp({ phone: formattedPhone });
      if (error) throw error;
      setOtpPhone(formattedPhone);
      setOtpSent(true);
      showToast(
        lang === "sw" ? `OTP imetumwa kwa ${formattedPhone}` : `OTP sent to ${formattedPhone}`,
        "success",
      );
    } catch (err: any) {
      showToast(err.message || "Failed to send OTP", "error");
    } finally {
      setOtpLoading(false);
    }
  };

  const handleSendEmailOtp = async () => {
    const emailAddr = otpEmail.trim();
    if (!emailAddr || !/\S+@\S+\.\S+/.test(emailAddr)) {
      showToast(
        lang === "sw" ? "Ingiza barua pepe sahihi" : "Enter a valid email address",
        "error",
      );
      return;
    }
    setOtpLoading(true);
    try {
      const { error } = await supabase.auth.signInWithOtp({ email: emailAddr });
      if (error) throw error;
      setOtpSent(true);
      showToast(
        lang === "sw" ? `OTP imetumwa kwa ${emailAddr}` : `OTP sent to ${emailAddr}`,
        "success",
      );
    } catch (err: any) {
      showToast(err.message || "Failed to send OTP", "error");
    } finally {
      setOtpLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (!otpCode.trim() || otpCode.length < 6) {
      showToast(lang === "sw" ? "Ingiza namba 6 za OTP" : "Enter the 6-digit OTP code", "error");
      return;
    }
    setOtpLoading(true);
    try {
      const verifyPayload =
        otpMode === "phone"
          ? { phone: otpPhone, token: otpCode, type: "sms" as const }
          : { email: otpEmail, token: otpCode, type: "email" as const };
      const { error } = await supabase.auth.verifyOtp(verifyPayload);
      if (error) throw error;
      showToast(lang === "sw" ? "Umeingia kwa mafanikio!" : "Logged in successfully!", "success");
      // Auth state change will redirect automatically
    } catch (err: any) {
      showToast(err.message || (lang === "sw" ? "OTP si sahihi" : "Invalid OTP code"), "error");
    } finally {
      setOtpLoading(false);
    }
  };

  const resetOtp = () => {
    setOtpMode("none");
    setOtpPhone("");
    setOtpEmail("");
    setOtpCode("");
    setOtpSent(false);
  };

  const handleVerifySecurity = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Verify security details against the database (clean NIDA by removing dashes)
      const cleanNida = forgotPasswordForm.nidaNumber.replace(/-/g, "");
      const { data, error } = await supabase
        .from("users")
        .select("*")
        .eq("email", forgotPasswordForm.email)
        .eq("nida_number", cleanNida)
        .eq("phone", forgotPasswordForm.phone)
        .eq("first_name", forgotPasswordForm.firstName.toUpperCase())
        .single();

      if (error || !data) {
        throw new Error(
          lang === "sw"
            ? "Taarifa hazijalingana na rekodi zetu"
            : "Information does not match our records",
        );
      }

      setForgotPasswordStep(2);
    } catch (err: unknown) {
      const _e = err as { message?: string };
      showToast(_e.message ?? "An error occurred", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (forgotPasswordForm.newPassword !== forgotPasswordForm.confirmNewPassword) {
      showToast(lang === "sw" ? "Nywila hazifanani" : "Passwords do not match", "error");
      return;
    }

    setLoading(true);
    try {
      // In a real app, we'd use supabase.auth.updateUser or a secure edge function
      // For this demo, we'll simulate the success
      const { error } = await supabase.auth.updateUser({
        password: forgotPasswordForm.newPassword,
      });

      if (error) throw error;

      showToast(
        lang === "sw" ? "Nywila imebadilishwa kikamilifu!" : "Password reset successfully!",
        "success",
      );
      setShowForgotPassword(false);
      setMode("login");
    } catch (err: unknown) {
      const _e = err as { message?: string };
      showToast(_e.message ?? "An error occurred", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log("[Signup] === SUBMIT CLICKED ===");
    console.log(
      "[Signup] Form data:",
      JSON.stringify({
        firstName: regForm.firstName,
        lastName: regForm.lastName,
        email: regForm.email,
        phone: regForm.phone,
        sex: regForm.sex,
        nationality: regForm.nationality,
        hasNida: regForm.hasNida,
        dateOfBirth: regForm.dateOfBirth,
        region: regForm.region,
      }),
    );

    // --- Validation ---
    if (!regForm.firstName.trim() || !regForm.lastName.trim()) {
      showToast(
        lang === "sw"
          ? "Tafadhali ingiza jina la kwanza na la mwisho"
          : "Please enter your first and last name",
        "error",
      );
      setRegStep(1);
      return;
    }
    if (regForm.password !== regForm.confirmPassword) {
      showToast(lang === "sw" ? "Nywila hazifanani" : "Passwords do not match", "error");
      return;
    }
    if (regForm.password.length < 6) {
      showToast(
        lang === "sw"
          ? "Nywila lazima iwe na herufi 6 au zaidi"
          : "Password must be at least 6 characters",
        "error",
      );
      return;
    }
    if (!regForm.phone) {
      showToast(
        lang === "sw" ? "Tafadhali ingiza namba ya simu" : "Please enter your phone number",
        "error",
      );
      setRegStep(1);
      return;
    }

    setLoading(true);
    try {
      // ── Step 1: Create auth user ──────────────────────────────────
      console.log("[Signup] Step 1: Creating auth user...");
      const { data, error } = await supabase.auth.signUp({
        email: regForm.email,
        password: regForm.password,
        options: {
          data: {
            // Pass ALL form fields as metadata so handle_new_user trigger
            // can create a full profile even without the RPC
            first_name: regForm.firstName.trim().toUpperCase(),
            middle_name: regForm.middleName.trim().toUpperCase() || null,
            last_name: regForm.lastName.trim().toUpperCase(),
            phone: regForm.phone ? regForm.phone.replace(/[\s\-().]/g, "") : null,
            sex: regForm.sex,
            gender: regForm.sex,
            date_of_birth: regForm.dateOfBirth || null,
            place_of_birth: regForm.placeOfBirth || null,
            marital_status: regForm.maritalStatus || null,
            occupation: regForm.occupation || null,
            education_level: regForm.educationLevel || null,
            nationality: regForm.nationality === "Mtanzania" ? "Tanzanian" : "Foreigner",
            country_of_citizenship:
              regForm.nationality === "Mtanzania" ? "Tanzania" : regForm.countryOfCitizenship,
            nida_number: regForm.hasNida ? regForm.nidaNumber.replace(/-/g, "") : null,
            id_type: !regForm.hasNida ? regForm.idType || null : null,
            id_number: !regForm.hasNida ? regForm.idNumber || null : null,
            region: regForm.region || null,
            district: regForm.district || null,
            ward: regForm.ward || null,
            street: regForm.street || null,
            is_diaspora: regForm.country !== "Tanzania",
            country_of_residence: regForm.country || null,
            passport_number: regForm.passportNumber || null,
            is_verified:
              nidaVerified || regForm.country !== "Tanzania" || regForm.nationality === "Mwingine",
            role: "citizen",
          },
        },
      });

      console.log("[Signup] signUp response:", {
        userId: data?.user?.id,
        session: !!data?.session,
        error: error?.message,
      });

      if (error) {
        console.error("[Signup] Auth error:", error.message);
        if (error.message.includes("already registered")) {
          throw new Error(
            lang === "sw"
              ? "Barua pepe hii tayari imesajiliwa. Tafadhali ingia."
              : "This email is already registered. Please login.",
          );
        }
        throw error;
      }

      if (!data.user) {
        console.error("[Signup] No user returned — email may already exist");
        throw new Error(
          lang === "sw"
            ? "Usajili umeshindwa. Barua pepe inaweza kuwa imesajiliwa tayari."
            : "Signup failed. Email may already be registered.",
        );
      }

      // ── Step 2: Create profile ────────────────────────────────────
      console.log("[Signup] Step 2: Creating profile for user:", data.user.id);
      const isDiaspora = regForm.country !== "Tanzania";
      const profileRow = {
        id: data.user.id,
        first_name: regForm.firstName.trim().toUpperCase(),
        middle_name: regForm.middleName.trim().toUpperCase() || null,
        last_name: regForm.lastName.trim().toUpperCase(),
        email: regForm.email,
        phone: regForm.phone ? regForm.phone.replace(/[\s\-().]/g, "") : null,
        sex: regForm.sex,
        gender: regForm.sex,
        date_of_birth: regForm.dateOfBirth || null,
        place_of_birth: regForm.placeOfBirth || null,
        marital_status: regForm.maritalStatus || null,
        occupation: regForm.occupation || null,
        education_level: regForm.educationLevel || null,
        nationality: regForm.nationality === "Mtanzania" ? "Tanzanian" : "Foreigner",
        country_of_citizenship:
          regForm.nationality === "Mtanzania" ? "Tanzania" : regForm.countryOfCitizenship,
        nida_number: regForm.hasNida ? regForm.nidaNumber.replace(/-/g, "") : null,
        id_type: !regForm.hasNida ? regForm.idType || null : null,
        id_number: !regForm.hasNida ? regForm.idNumber || null : null,
        region: regForm.region || null,
        district: regForm.district || null,
        ward: regForm.ward || null,
        street: regForm.street || null,
        is_diaspora: isDiaspora,
        country_of_residence: regForm.country || null,
        passport_number: regForm.passportNumber || null,
        role: "citizen",
        is_verified: nidaVerified || isDiaspora || regForm.nationality === "Mwingine",
      };

      // Try Method A: RPC function (bypasses RLS — works without session)
      let profileOk = false;
      try {
        console.log("[Signup] Trying RPC create_citizen_profile...");
        const { error: rpcErr } = await supabase.rpc("create_citizen_profile", {
          p_id: profileRow.id,
          p_first_name: profileRow.first_name,
          p_middle_name: profileRow.middle_name,
          p_last_name: profileRow.last_name,
          p_email: profileRow.email,
          p_phone: profileRow.phone,
          p_sex: profileRow.sex,
          p_gender: profileRow.gender,
          p_date_of_birth: profileRow.date_of_birth,
          p_place_of_birth: profileRow.place_of_birth,
          p_marital_status: profileRow.marital_status,
          p_occupation: profileRow.occupation,
          p_education_level: profileRow.education_level,
          p_nationality: profileRow.nationality,
          p_country_of_citizenship: profileRow.country_of_citizenship,
          p_nida_number: profileRow.nida_number,
          p_id_type: profileRow.id_type,
          p_id_number: profileRow.id_number,
          p_region: profileRow.region,
          p_district: profileRow.district,
          p_ward: profileRow.ward,
          p_street: profileRow.street,
          p_is_diaspora: profileRow.is_diaspora,
          p_country_of_residence: profileRow.country_of_residence,
          p_passport_number: profileRow.passport_number,
          p_is_verified: profileRow.is_verified,
        });
        if (rpcErr) {
          console.warn("[Signup] RPC failed:", rpcErr.message, "— trying direct INSERT");
        } else {
          profileOk = true;
          console.log("[Signup] Profile created via RPC ✓");
        }
      } catch (rpcCatch) {
        console.warn("[Signup] RPC exception:", rpcCatch);
      }

      // Try Method B: Direct UPSERT (overwrites the minimal row the trigger created)
      if (!profileOk) {
        console.log("[Signup] Trying direct UPSERT...");
        const { error: insertErr } = await supabase.from("users").upsert(profileRow, {
          onConflict: "id",
          ignoreDuplicates: false,
        });
        if (insertErr) {
          console.warn("[Signup] Direct INSERT failed:", insertErr.message);
          // Profile creation failed entirely — auth user exists but no profile.
          // This is OK — profile will be auto-created on first login.
          console.log("[Signup] Profile will be created on first login instead");
        } else {
          profileOk = true;
          console.log("[Signup] Profile created via direct INSERT ✓");
        }
      }

      // ── Step 3: Success ───────────────────────────────────────────
      console.log("[Signup] ✅ DONE. Profile created:", profileOk);
      showToast(
        lang === "sw"
          ? "Usajili umekamilika! Tafadhali kagua barua pepe yako kisha ingia."
          : "Registration complete! Please check your email then login.",
        "success",
      );
      setMode("login");
      onClose();
    } catch (err: unknown) {
      const _e = err as { message?: string };
      console.error("[Signup] ❌ ERROR:", _e.message, err);
      showToast(_e.message ?? (lang === "sw" ? "Hitilafu imetokea" : "An error occurred"), "error");
    } finally {
      setLoading(false);
      console.log("[Signup] Loading state reset");
    }
  };

  return (
    <div className="fixed inset-0 z-100 flex items-center justify-center p-0 sm:p-6">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-stone-900/60 backdrop-blur-sm"
      />

      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="relative w-full h-full sm:h-auto sm:max-w-2xl bg-white sm:rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col max-h-screen sm:max-h-[90vh]"
      >
        {/* Header */}
        <div className="px-6 sm:px-8 py-4 sm:py-6 border-b border-stone-100 flex items-center justify-between bg-white sticky top-0 z-10">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl bg-emerald-50 flex items-center justify-center">
              <img
                src={TANZANIA_LOGO_URL}
                alt="Coat of Arms"
                className="w-5 h-5 sm:w-6 sm:h-6 object-contain"
                referrerPolicy="no-referrer"
              />
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-black tracking-tight text-stone-900">
                {mode === "login" ? t("nav.login") : t("nav.signup")}
              </h2>
              <p className="text-[8px] sm:text-[10px] font-bold text-stone-400 uppercase tracking-widest leading-none">
                E-MTAA PORTAL
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-stone-100 rounded-full transition-colors text-stone-400"
            title="Close"
            aria-label="Close dialog"
          >
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 sm:p-8">
          {mode === "login" ? (
            <div className="max-w-md mx-auto py-4">
              <AnimatePresence mode="wait">
                {!showForgotPassword ? (
                  <motion.div
                    key="login-form"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                  >
                    <form onSubmit={handleLogin} className="space-y-6">
                      <div className="space-y-2">
                        <label className="text-xs font-bold text-stone-500 uppercase tracking-widest ml-1">
                          {lang === "sw" ? "Barua pepe" : "Email"}
                        </label>
                        <div className="relative">
                          <Mail
                            className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-400"
                            size={20}
                          />
                          <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="w-full h-14 pl-12 pr-4 bg-stone-50 border border-stone-200 rounded-2xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all font-medium"
                            placeholder="juma@example.com"
                            required
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <div className="flex items-center justify-between ml-1">
                          <label className="text-xs font-bold text-stone-500 uppercase tracking-widest">
                            {lang === "sw" ? "Nenosiri" : "Password"}
                          </label>
                          <button
                            type="button"
                            onClick={() => setShowForgotPassword(true)}
                            className="text-xs font-bold text-emerald-600 hover:underline"
                          >
                            {lang === "sw" ? "Umesahau Nywila?" : "Forgot Password?"}
                          </button>
                        </div>
                        <div className="relative">
                          <Lock
                            className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-400"
                            size={20}
                          />
                          <input
                            type={showPassword ? "text" : "password"}
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="w-full h-14 pl-12 pr-12 bg-stone-50 border border-stone-200 rounded-2xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all font-medium"
                            placeholder="••••••••"
                            required
                          />
                          <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute right-4 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600"
                            title={showPassword ? "Hide password" : "Show password"}
                            aria-label={showPassword ? "Hide password" : "Show password"}
                          >
                            {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                          </button>
                        </div>
                      </div>

                      <button
                        disabled={loading}
                        className="w-full h-14 bg-emerald-600 text-white rounded-2xl font-bold text-lg hover:bg-emerald-700 transition-all shadow-xl shadow-emerald-200 flex items-center justify-center gap-2 disabled:opacity-50"
                        type="submit"
                      >
                        {loading ? <Loader2 className="animate-spin" /> : t("nav.login")}
                      </button>

                      {/* Social Login Divider */}
                      <div className="flex items-center gap-3">
                        <div className="flex-1 h-px bg-stone-200" />
                        <span className="text-xs font-bold text-stone-400 uppercase tracking-wider">
                          {lang === "sw" ? "au endelea na" : "or continue with"}
                        </span>
                        <div className="flex-1 h-px bg-stone-200" />
                      </div>

                      {/* Social Login Buttons */}
                      <div className="grid grid-cols-2 gap-3">
                        <button
                          type="button"
                          onClick={handleGoogleLogin}
                          className="h-12 bg-white border-2 border-stone-200 rounded-xl font-bold text-sm text-stone-700 hover:bg-stone-50 hover:border-stone-300 transition-all flex items-center justify-center gap-2.5"
                        >
                          <svg width="18" height="18" viewBox="0 0 24 24">
                            <path
                              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
                              fill="#4285F4"
                            />
                            <path
                              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                              fill="#34A853"
                            />
                            <path
                              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                              fill="#FBBC05"
                            />
                            <path
                              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                              fill="#EA4335"
                            />
                          </svg>
                          Google
                        </button>
                        <button
                          type="button"
                          onClick={handleAppleLogin}
                          className="h-12 bg-black border-2 border-black rounded-xl font-bold text-sm text-white hover:bg-stone-800 transition-all flex items-center justify-center gap-2.5"
                        >
                          <svg width="16" height="18" viewBox="0 0 17 20" fill="white">
                            <path d="M13.545 10.239c-.021-2.088 1.704-3.092 1.782-3.141-0.97-1.418-2.482-1.612-3.02-1.634-1.285-.13-2.509.756-3.162.756-.652 0-1.662-.737-2.731-.718-1.406.02-2.703.817-3.427 2.076-1.461 2.534-.374 6.292 1.05 8.348.696 1.006 1.525 2.136 2.614 2.095 1.049-.042 1.445-.679 2.714-.679 1.269 0 1.625.679 2.731.658 1.128-.019 1.843-1.024 2.534-2.033.799-1.166 1.128-2.294 1.148-2.352-.025-.011-2.203-.846-2.225-3.356zM11.483 3.492c.578-.702.969-1.676.862-2.647-.832.034-1.841.554-2.438 1.253-.535.619-1.004 1.607-.878 2.555.929.072 1.878-.472 2.454-1.161z" />
                          </svg>
                          Apple
                        </button>
                      </div>

                      {/* OTP Login Options */}
                      {otpMode === "none" ? (
                        <div className="grid grid-cols-2 gap-3">
                          <button
                            type="button"
                            onClick={() => setOtpMode("phone")}
                            className="h-12 bg-emerald-50 border-2 border-emerald-200 rounded-xl font-bold text-sm text-emerald-700 hover:bg-emerald-100 hover:border-emerald-300 transition-all flex items-center justify-center gap-2"
                          >
                            <Phone size={16} /> {lang === "sw" ? "SMS OTP" : "Phone OTP"}
                          </button>
                          <button
                            type="button"
                            onClick={() => setOtpMode("email")}
                            className="h-12 bg-blue-50 border-2 border-blue-200 rounded-xl font-bold text-sm text-blue-700 hover:bg-blue-100 hover:border-blue-300 transition-all flex items-center justify-center gap-2"
                          >
                            <Mail size={16} /> {lang === "sw" ? "Email OTP" : "Email OTP"}
                          </button>
                        </div>
                      ) : (
                        <div className="bg-stone-50 border border-stone-200 rounded-2xl p-4 space-y-3">
                          <div className="flex items-center justify-between">
                            <p className="text-xs font-bold text-stone-600 uppercase tracking-wider flex items-center gap-1.5">
                              {otpMode === "phone" ? (
                                <>
                                  <Phone size={13} />{" "}
                                  {lang === "sw" ? "Ingia kwa SMS" : "Login via SMS"}
                                </>
                              ) : (
                                <>
                                  <Mail size={13} />{" "}
                                  {lang === "sw" ? "Ingia kwa Email OTP" : "Login via Email OTP"}
                                </>
                              )}
                            </p>
                            <button
                              type="button"
                              onClick={resetOtp}
                              className="text-xs text-stone-400 hover:text-stone-600 font-bold"
                              aria-label="Close OTP"
                            >
                              ✕
                            </button>
                          </div>

                          {!otpSent ? (
                            <>
                              {otpMode === "phone" ? (
                                <input
                                  type="tel"
                                  value={otpPhone}
                                  onChange={(e) => setOtpPhone(e.target.value)}
                                  placeholder="+255 7XX XXX XXX"
                                  aria-label="Phone number"
                                  className="w-full h-12 px-4 bg-white border border-stone-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none text-sm font-mono"
                                />
                              ) : (
                                <input
                                  type="email"
                                  value={otpEmail}
                                  onChange={(e) => setOtpEmail(e.target.value)}
                                  placeholder="juma@example.com"
                                  aria-label="Email address"
                                  className="w-full h-12 px-4 bg-white border border-stone-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-sm"
                                />
                              )}
                              <button
                                type="button"
                                disabled={otpLoading}
                                onClick={
                                  otpMode === "phone" ? handleSendPhoneOtp : handleSendEmailOtp
                                }
                                className={`w-full h-11 rounded-xl font-bold text-sm text-white flex items-center justify-center gap-2 transition-all disabled:opacity-50 ${
                                  otpMode === "phone"
                                    ? "bg-emerald-600 hover:bg-emerald-700"
                                    : "bg-blue-600 hover:bg-blue-700"
                                }`}
                              >
                                {otpLoading ? <Loader2 size={16} className="animate-spin" /> : null}
                                {lang === "sw" ? "Tuma OTP" : "Send OTP"}
                              </button>
                            </>
                          ) : (
                            <>
                              <p className="text-xs text-stone-500">
                                {otpMode === "phone"
                                  ? lang === "sw"
                                    ? `Namba 6 za OTP zimetumwa kwa ${otpPhone}`
                                    : `6-digit OTP sent to ${otpPhone}`
                                  : lang === "sw"
                                    ? `Namba 6 za OTP zimetumwa kwa ${otpEmail}`
                                    : `6-digit OTP sent to ${otpEmail}`}
                              </p>
                              <input
                                type="text"
                                value={otpCode}
                                onChange={(e) =>
                                  setOtpCode(e.target.value.replace(/\D/g, "").slice(0, 6))
                                }
                                placeholder="000000"
                                maxLength={6}
                                aria-label="OTP code"
                                className="w-full h-14 px-4 bg-white border border-stone-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none text-center text-2xl font-mono font-bold tracking-[0.5em]"
                              />
                              <div className="flex gap-2">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setOtpSent(false);
                                    setOtpCode("");
                                  }}
                                  className="flex-1 h-11 bg-stone-100 text-stone-600 rounded-xl font-bold text-xs hover:bg-stone-200"
                                >
                                  {lang === "sw" ? "Tuma Tena" : "Resend"}
                                </button>
                                <button
                                  type="button"
                                  disabled={otpLoading || otpCode.length < 6}
                                  onClick={handleVerifyOtp}
                                  className="flex-[2] h-11 bg-emerald-600 text-white rounded-xl font-bold text-sm hover:bg-emerald-700 disabled:opacity-50 flex items-center justify-center gap-2"
                                >
                                  {otpLoading ? (
                                    <Loader2 size={14} className="animate-spin" />
                                  ) : (
                                    <CheckCircle2 size={14} />
                                  )}
                                  {lang === "sw" ? "Thibitisha" : "Verify"}
                                </button>
                              </div>
                            </>
                          )}
                        </div>
                      )}

                      <div className="text-center">
                        <p className="text-sm text-stone-500">
                          {lang === "sw" ? "Hauna akaunti?" : "Don't have an account?"}{" "}
                          <button
                            type="button"
                            onClick={() => setMode("signup")}
                            className="text-emerald-600 font-bold hover:underline"
                          >
                            {t("nav.signup")}
                          </button>
                        </p>
                      </div>
                    </form>
                  </motion.div>
                ) : (
                  <motion.div
                    key="forgot-password-form"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="space-y-6"
                  >
                    <div className="flex items-center gap-2 mb-4">
                      <button
                        onClick={() => {
                          setShowForgotPassword(false);
                          setForgotPasswordStep(1);
                        }}
                        className="p-2 hover:bg-stone-100 rounded-full text-stone-400"
                        title="Back"
                        aria-label="Back to login"
                      >
                        <ArrowLeft size={20} />
                      </button>
                      <h3 className="text-lg font-bold text-stone-900">
                        {lang === "sw" ? "Rudisha Nywila" : "Reset Password"}
                      </h3>
                    </div>

                    {forgotPasswordStep === 1 ? (
                      <form onSubmit={handleVerifySecurity} className="space-y-4">
                        <p className="text-sm text-stone-500 mb-4">
                          {lang === "sw"
                            ? "Tafadhali jibu maswali yafuatayo ili kuthibitisha utambulisho wako."
                            : "Please answer the following questions to verify your identity."}
                        </p>

                        <div className="space-y-2">
                          <label className="text-xs font-bold text-stone-500 uppercase tracking-widest ml-1">
                            {lang === "sw" ? "Barua pepe" : "Email"}
                          </label>
                          <input
                            type="email"
                            required
                            value={forgotPasswordForm.email}
                            onChange={(e) =>
                              setForgotPasswordForm({
                                ...forgotPasswordForm,
                                email: e.target.value,
                              })
                            }
                            className="w-full h-12 px-4 bg-stone-50 border border-stone-200 rounded-xl focus:ring-2 focus:ring-emerald-500 transition-all"
                            placeholder="Email"
                          />
                        </div>

                        <div className="space-y-2">
                          <label className="text-xs font-bold text-stone-500 uppercase tracking-widest ml-1">
                            {lang === "sw" ? "Namba ya NIDA" : "NIDA Number"}
                          </label>
                          <input
                            type="text"
                            required
                            value={forgotPasswordForm.nidaNumber}
                            onChange={(e) =>
                              setForgotPasswordForm({
                                ...forgotPasswordForm,
                                nidaNumber: e.target.value,
                              })
                            }
                            className="w-full h-12 px-4 bg-stone-50 border border-stone-200 rounded-xl focus:ring-2 focus:ring-emerald-500 transition-all"
                            placeholder="NIDA Number"
                            aria-label="NIDA Number"
                          />
                        </div>

                        <div className="space-y-2">
                          <label className="text-xs font-bold text-stone-500 uppercase tracking-widest ml-1">
                            {lang === "sw" ? "Jina la Kwanza" : "First Name"}
                          </label>
                          <input
                            type="text"
                            required
                            value={forgotPasswordForm.firstName}
                            onChange={(e) =>
                              setForgotPasswordForm({
                                ...forgotPasswordForm,
                                firstName: e.target.value,
                              })
                            }
                            className="w-full h-12 px-4 bg-stone-50 border border-stone-200 rounded-xl focus:ring-2 focus:ring-emerald-500 transition-all"
                            placeholder="First Name"
                            aria-label="First Name"
                          />
                        </div>

                        <div className="space-y-2">
                          <label className="text-xs font-bold text-stone-500 uppercase tracking-widest ml-1">
                            {lang === "sw" ? "Namba ya Simu" : "Phone Number"}
                          </label>
                          <input
                            type="text"
                            required
                            value={forgotPasswordForm.phone}
                            onChange={(e) =>
                              setForgotPasswordForm({
                                ...forgotPasswordForm,
                                phone: e.target.value,
                              })
                            }
                            className="w-full h-12 px-4 bg-stone-50 border border-stone-200 rounded-xl focus:ring-2 focus:ring-emerald-500 transition-all"
                            placeholder="Phone Number"
                            aria-label="Phone Number"
                          />
                        </div>

                        <button
                          disabled={loading}
                          className="w-full h-14 bg-stone-900 text-white rounded-2xl font-bold hover:bg-black transition-all flex items-center justify-center gap-2"
                          type="submit"
                        >
                          {loading ? (
                            <Loader2 className="animate-spin" />
                          ) : lang === "sw" ? (
                            "Thibitisha"
                          ) : (
                            "Verify Identity"
                          )}
                        </button>
                      </form>
                    ) : (
                      <form onSubmit={handleResetPassword} className="space-y-4">
                        <div className="space-y-2">
                          <label className="text-xs font-bold text-stone-500 uppercase tracking-widest ml-1">
                            {lang === "sw" ? "Nywila Mpya" : "New Password"}
                          </label>
                          <input
                            type="password"
                            required
                            value={forgotPasswordForm.newPassword}
                            onChange={(e) =>
                              setForgotPasswordForm({
                                ...forgotPasswordForm,
                                newPassword: e.target.value,
                              })
                            }
                            className="w-full h-12 px-4 bg-stone-50 border border-stone-200 rounded-xl focus:ring-2 focus:ring-emerald-500 transition-all"
                            placeholder="••••••••"
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-xs font-bold text-stone-500 uppercase tracking-widest ml-1">
                            {lang === "sw" ? "Thibitisha Nywila Mpya" : "Confirm New Password"}
                          </label>
                          <input
                            type="password"
                            required
                            value={forgotPasswordForm.confirmNewPassword}
                            onChange={(e) =>
                              setForgotPasswordForm({
                                ...forgotPasswordForm,
                                confirmNewPassword: e.target.value,
                              })
                            }
                            className="w-full h-12 px-4 bg-stone-50 border border-stone-200 rounded-xl focus:ring-2 focus:ring-emerald-500 transition-all"
                            placeholder="••••••••"
                          />
                        </div>
                        <button
                          disabled={loading}
                          className="w-full h-14 bg-emerald-600 text-white rounded-2xl font-bold hover:bg-emerald-700 transition-all flex items-center justify-center gap-2"
                          type="submit"
                        >
                          {loading ? (
                            <Loader2 className="animate-spin" />
                          ) : lang === "sw" ? (
                            "Badilisha Nywila"
                          ) : (
                            "Reset Password"
                          )}
                        </button>
                      </form>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ) : (
            <div className="space-y-8">
              {/* Signup Progress */}
              <div className="hidden sm:flex items-center justify-between mb-12 relative">
                <div className="absolute top-1/2 left-0 w-full h-0.5 bg-stone-100 -translate-y-1/2 -z-10"></div>
                {[1, 2, 3].map((step) => (
                  <div key={step} className="flex flex-col items-center gap-2 bg-white px-4">
                    <div
                      className={cn(
                        "w-10 h-10 rounded-full flex items-center justify-center font-bold transition-all border-2",
                        regStep === step
                          ? "bg-emerald-600 border-emerald-600 text-white shadow-lg shadow-emerald-200"
                          : regStep > step
                            ? "bg-emerald-100 border-emerald-100 text-emerald-600"
                            : "bg-white border-stone-200 text-stone-400",
                      )}
                    >
                      {regStep > step ? <CheckCircle2 size={20} /> : step}
                    </div>
                    <span
                      className={cn(
                        "text-[10px] font-bold uppercase tracking-widest",
                        regStep === step ? "text-emerald-600" : "text-stone-400",
                      )}
                    >
                      {step === 1
                        ? lang === "sw"
                          ? "Binafsi"
                          : "Personal"
                        : step === 2
                          ? lang === "sw"
                            ? "Mahali"
                            : "Location"
                          : lang === "sw"
                            ? "Akaunti"
                            : "Account"}
                    </span>
                  </div>
                ))}
              </div>

              {/* Mobile Progress Bar */}
              <div className="sm:hidden mb-8">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">
                    {regStep === 1
                      ? lang === "sw"
                        ? "Hatua ya 1: Binafsi"
                        : "Step 1: Personal"
                      : regStep === 2
                        ? lang === "sw"
                          ? "Hatua ya 2: Mahali"
                          : "Step 2: Location"
                        : lang === "sw"
                          ? "Hatua ya 3: Akaunti"
                          : "Step 3: Account"}
                  </span>
                  <span className="text-[10px] font-black text-stone-400 uppercase tracking-widest">
                    {regStep}/3
                  </span>
                </div>
                <div className="h-1.5 w-full bg-stone-100 rounded-full overflow-hidden">
                  <div
                    className={`h-full bg-emerald-600 transition-all duration-500 ${regStep === 1 ? "w-1/3" : regStep === 2 ? "w-2/3" : "w-full"}`}
                  ></div>
                </div>
              </div>

              <AnimatePresence mode="wait">
                {regStep === 1 && (
                  <motion.div
                    key="step1"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    className="space-y-6"
                  >
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-xs font-bold text-stone-500 uppercase tracking-widest ml-1">
                          {lang === "sw" ? "Uraia" : "Nationality"}
                        </label>
                        <select
                          value={regForm.nationality}
                          onChange={(e) => {
                            const val = e.target.value;
                            updateRegForm("nationality", val);
                            if (val === "Mtanzania") {
                              updateRegForm("countryOfCitizenship", "Tanzania");
                              updateRegForm("country", "Tanzania");
                            } else {
                              updateRegForm("nidaNumber", "");
                              setNidaVerified(false);
                            }
                          }}
                          className="w-full h-14 px-4 bg-stone-50 border border-stone-200 rounded-2xl focus:ring-2 focus:ring-emerald-500 transition-all font-medium"
                          aria-label="Nationality"
                        >
                          <option value="Mtanzania">
                            {lang === "sw" ? "Mtanzania" : "Tanzanian"}
                          </option>
                          <option value="Mwingine">
                            {lang === "sw" ? "Mgeni / Mkaazi" : "Foreigner / Resident"}
                          </option>
                        </select>
                      </div>

                      {regForm.nationality === "Mwingine" && (
                        <div className="space-y-2">
                          <label className="text-xs font-bold text-stone-500 uppercase tracking-widest ml-1">
                            {lang === "sw" ? "Nchi ya Uraia" : "Country of Citizenship"}
                          </label>
                          <select
                            value={regForm.countryOfCitizenship}
                            onChange={(e) => updateRegForm("countryOfCitizenship", e.target.value)}
                            className="w-full h-14 px-4 bg-stone-50 border border-stone-200 rounded-2xl focus:ring-2 focus:ring-emerald-500 transition-all font-medium"
                            aria-label="Country of Citizenship"
                          >
                            <option value="">
                              {lang === "sw" ? "Chagua Nchi" : "Select Country"}
                            </option>
                            {COUNTRIES.map((c) => (
                              <option key={c} value={c}>
                                {c}
                              </option>
                            ))}
                          </select>
                        </div>
                      )}
                    </div>

                    {regForm.nationality === "Mtanzania" ? (
                      <div className="space-y-4">
                        {/* Toggle: Has NIDA or Not */}
                        <div className="flex gap-4 items-center">
                          <button
                            type="button"
                            onClick={() => updateRegForm("hasNida", true)}
                            className={`flex-1 h-12 rounded-xl font-bold transition-all ${regForm.hasNida ? "bg-emerald-600 text-white" : "bg-stone-100 text-stone-600"}`}
                          >
                            {lang === "sw" ? "Nina NIDA" : "I have NIDA"}
                          </button>
                          <button
                            type="button"
                            onClick={() => updateRegForm("hasNida", false)}
                            className={`flex-1 h-12 rounded-xl font-bold transition-all ${!regForm.hasNida ? "bg-amber-600 text-white" : "bg-stone-100 text-stone-600"}`}
                          >
                            {lang === "sw" ? "Sina NIDA" : "I don't have NIDA"}
                          </button>
                        </div>

                        {regForm.hasNida ? (
                          <div className="space-y-2">
                            <label className="text-xs font-bold text-stone-500 uppercase tracking-widest ml-1">
                              {lang === "sw" ? "Namba ya NIDA" : "NIDA Number"}
                            </label>
                            <div className="flex gap-2">
                              <input
                                type="text"
                                value={regForm.nidaNumber}
                                onChange={(e) =>
                                  updateRegForm("nidaNumber", formatNIDA(e.target.value))
                                }
                                className="flex-1 h-14 px-4 bg-stone-50 border border-stone-200 rounded-2xl focus:ring-2 focus:ring-emerald-500 transition-all font-medium"
                                placeholder="XXXX-XXXX-XXXX-XXXX-XXXX"
                                aria-label="NIDA Number"
                              />
                              <button
                                type="button"
                                onClick={verifyNIDA}
                                disabled={
                                  nidaVerifying ||
                                  regForm.nidaNumber.replace(/\D/g, "").length !== 20
                                }
                                className="px-6 bg-stone-900 text-white rounded-2xl font-bold hover:bg-stone-800 transition-all disabled:opacity-50"
                              >
                                {nidaVerifying ? (
                                  <Loader2 className="animate-spin" />
                                ) : lang === "sw" ? (
                                  "Hakiki"
                                ) : (
                                  "Verify"
                                )}
                              </button>
                            </div>
                            {nidaError && (
                              <p className="text-xs text-red-500 font-bold flex items-center gap-1">
                                <AlertCircle size={12} /> {nidaError}
                              </p>
                            )}
                            {nidaVerified && (
                              <p className="text-xs text-emerald-600 font-bold flex items-center gap-1">
                                <CheckCircle2 size={12} />{" "}
                                {lang === "sw"
                                  ? "NIDA imehakikiwa kikamilifu"
                                  : "NIDA verified successfully"}
                              </p>
                            )}
                          </div>
                        ) : (
                          <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl">
                            <p className="text-xs text-amber-700">
                              <AlertCircle size={12} className="inline mr-1" />
                              {lang === "sw"
                                ? "Akaunti bila NIDA itahitaji uthibitisho wa ziada. Huduma zingine zinaweza kuwa na vikwazo."
                                : "Accounts without NIDA require additional verification. Some services may be restricted."}
                            </p>
                          </div>
                        )}

                        {/* ID Type & ID Number — only when no NIDA */}
                        {!regForm.hasNida && (
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <label className="text-xs font-bold text-stone-500 uppercase tracking-widest ml-1">
                                {lang === "sw" ? "Aina ya Kitambulisho" : "ID Type"}{" "}
                                <span className="text-red-400 ml-0.5">*</span>
                              </label>
                              <select
                                value={regForm.idType}
                                onChange={(e) => updateRegForm("idType", e.target.value)}
                                className="w-full h-14 px-4 bg-stone-50 border border-stone-200 rounded-2xl focus:ring-2 focus:ring-emerald-500 transition-all font-medium"
                                aria-label="ID Type"
                              >
                                <option value="">
                                  {lang === "sw" ? "Chagua Aina ya Kitambulisho" : "Select ID Type"}
                                </option>
                                <option value="birth_certificate">
                                  {lang === "sw" ? "Cheti cha Kuzaliwa" : "Birth Certificate"}
                                </option>
                                <option value="voter_id">
                                  {lang === "sw"
                                    ? "Kadi ya Mpiga Kura (E-NEC)"
                                    : "Voter ID (E-NEC)"}
                                </option>
                                <option value="driving_license">
                                  {lang === "sw" ? "Leseni ya Udereva" : "Driving License"}
                                </option>
                                <option value="zanzibar_id">
                                  {lang === "sw" ? "Kitambulisho cha Zanzibar" : "Zanzibar ID"}
                                </option>
                                <option value="student_id">
                                  {lang === "sw" ? "Kitambulisho cha Mwanafunzi" : "Student ID"}
                                </option>
                                <option value="employer_id">
                                  {lang === "sw" ? "Kitambulisho cha Kazi" : "Employer ID"}
                                </option>
                              </select>
                            </div>
                            <div className="space-y-2">
                              <label className="text-xs font-bold text-stone-500 uppercase tracking-widest ml-1">
                                {lang === "sw" ? "Namba ya Kitambulisho" : "ID Number"}
                                {!regForm.hasNida && <span className="text-red-400 ml-0.5">*</span>}
                              </label>
                              <input
                                type="text"
                                value={regForm.idNumber}
                                onChange={(e) => updateRegForm("idNumber", e.target.value)}
                                className="w-full h-14 px-4 bg-stone-50 border border-stone-200 rounded-2xl focus:ring-2 focus:ring-emerald-500 transition-all font-medium"
                                placeholder={
                                  lang === "sw" ? "Ingiza Namba ya Kitambulisho" : "Enter ID Number"
                                }
                                aria-label="ID Number"
                              />
                            </div>
                          </div>
                        )}

                        {/* Phone number — collected early in Step 1 */}
                        <div className="space-y-2">
                          <label className="text-xs font-bold text-stone-500 uppercase tracking-widest ml-1">
                            {lang === "sw" ? "Namba ya Simu" : "Phone Number"}{" "}
                            <span className="text-red-400">*</span>
                          </label>
                          <div className="relative">
                            <Phone
                              className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-400 z-10"
                              size={20}
                            />
                            <PhoneInput
                              international
                              defaultCountry="TZ"
                              value={regForm.phone}
                              onChange={(val) => updateRegForm("phone", val)}
                              className="w-full h-14 pl-12 pr-4 bg-stone-50 border border-stone-200 rounded-2xl focus-within:ring-2 focus-within:ring-emerald-500 transition-all font-medium"
                              aria-label="Phone Number"
                            />
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <label className="text-xs font-bold text-stone-500 uppercase tracking-widest ml-1">
                          {lang === "sw" ? "Namba ya Pasipoti" : "Passport Number"}
                        </label>
                        <input
                          type="text"
                          value={regForm.passportNumber}
                          onChange={(e) => updateRegForm("passportNumber", e.target.value)}
                          className="w-full h-14 px-4 bg-stone-50 border border-stone-200 rounded-2xl focus:ring-2 focus:ring-emerald-500 transition-all font-medium"
                          placeholder={
                            lang === "sw" ? "Ingiza Namba ya Pasipoti" : "Enter Passport Number"
                          }
                          aria-label="Passport Number"
                        />
                      </div>
                    )}

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div className="space-y-2">
                        <label className="text-xs font-bold text-stone-500 uppercase tracking-widest ml-1">
                          {lang === "sw" ? "Jina la Kwanza" : "First Name"}
                        </label>
                        <input
                          type="text"
                          value={regForm.firstName}
                          onChange={(e) => updateRegForm("firstName", e.target.value)}
                          className="w-full h-14 px-4 bg-stone-50 border border-stone-200 rounded-2xl focus:ring-2 focus:ring-emerald-500 transition-all font-medium"
                          placeholder={lang === "sw" ? "Jina la Kwanza" : "First Name"}
                          required
                          aria-label="First Name"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs font-bold text-stone-500 uppercase tracking-widest ml-1">
                          {lang === "sw" ? "Jina la Kati" : "Middle Name"}
                        </label>
                        <input
                          type="text"
                          value={regForm.middleName}
                          onChange={(e) => updateRegForm("middleName", e.target.value)}
                          className="w-full h-14 px-4 bg-stone-50 border border-stone-200 rounded-2xl focus:ring-2 focus:ring-emerald-500 transition-all font-medium"
                          placeholder={lang === "sw" ? "Jina la Kati" : "Middle Name"}
                          aria-label="Middle Name"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs font-bold text-stone-500 uppercase tracking-widest ml-1">
                          {lang === "sw" ? "Jina la Mwisho" : "Last Name"}
                        </label>
                        <input
                          type="text"
                          value={regForm.lastName}
                          onChange={(e) => updateRegForm("lastName", e.target.value)}
                          className="w-full h-14 px-4 bg-stone-50 border border-stone-200 rounded-2xl focus:ring-2 focus:ring-emerald-500 transition-all font-medium"
                          placeholder={lang === "sw" ? "Jina la Mwisho" : "Last Name"}
                          required
                          aria-label="Last Name"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="text-xs font-bold text-stone-500 uppercase tracking-widest ml-1">
                        {lang === "sw" ? "Jinsia" : "Gender"}
                      </label>
                      <div className="flex gap-4">
                        {["M", "F"].map((s) => (
                          <button
                            key={s}
                            type="button"
                            onClick={() => updateRegForm("sex", s)}
                            className={cn(
                              "flex-1 h-14 rounded-2xl font-bold border-2 transition-all",
                              regForm.sex === s
                                ? "bg-emerald-50 border-emerald-600 text-emerald-600"
                                : "bg-white border-stone-100 text-stone-400",
                            )}
                          >
                            {s === "M"
                              ? lang === "sw"
                                ? "Mwanaume"
                                : "Male"
                              : lang === "sw"
                                ? "Mwanamke"
                                : "Female"}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Date of Birth */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-xs font-bold text-stone-500 uppercase tracking-widest ml-1">
                          {lang === "sw" ? "Tarehe ya Kuzaliwa" : "Date of Birth"}{" "}
                          <span className="text-red-400">*</span>
                        </label>
                        <input
                          type="date"
                          value={regForm.dateOfBirth}
                          onChange={(e) => updateRegForm("dateOfBirth", e.target.value)}
                          max={new Date().toISOString().split("T")[0]}
                          className="w-full h-14 px-4 bg-stone-50 border border-stone-200 rounded-2xl focus:ring-2 focus:ring-emerald-500 transition-all font-medium"
                          aria-label="Date of Birth"
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs font-bold text-stone-500 uppercase tracking-widest ml-1">
                          {lang === "sw" ? "Mahali pa Kuzaliwa (Mkoa)" : "Place of Birth (Region)"}
                        </label>
                        <select
                          value={regForm.placeOfBirth}
                          onChange={(e) => updateRegForm("placeOfBirth", e.target.value)}
                          className="w-full h-14 px-4 bg-stone-50 border border-stone-200 rounded-2xl focus:ring-2 focus:ring-emerald-500 transition-all font-medium"
                          aria-label="Place of Birth"
                        >
                          <option value="">
                            {lang === "sw" ? "Chagua Mkoa" : "Select Region"}
                          </option>
                          {TanzanianBranding.regions[lang].map((r: string) => (
                            <option key={r} value={r}>
                              {r}
                            </option>
                          ))}
                          <option value="Nje ya Tanzania">
                            {lang === "sw" ? "Nje ya Tanzania" : "Outside Tanzania"}
                          </option>
                        </select>
                      </div>
                    </div>

                    {/* Marital Status, Occupation, Education */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div className="space-y-2">
                        <label className="text-xs font-bold text-stone-500 uppercase tracking-widest ml-1">
                          {lang === "sw" ? "Hali ya Ndoa" : "Marital Status"}
                        </label>
                        <select
                          value={regForm.maritalStatus}
                          onChange={(e) => updateRegForm("maritalStatus", e.target.value)}
                          className="w-full h-14 px-4 bg-stone-50 border border-stone-200 rounded-2xl focus:ring-2 focus:ring-emerald-500 transition-all font-medium"
                          aria-label="Marital Status"
                        >
                          <option value="">{lang === "sw" ? "Chagua" : "Select"}</option>
                          <option value="single">
                            {lang === "sw" ? "Sijaoa/Sijaolewa" : "Single"}
                          </option>
                          <option value="married">
                            {lang === "sw" ? "Nimeoa/Nimeolewa" : "Married"}
                          </option>
                          <option value="divorced">
                            {lang === "sw" ? "Nimetaliki" : "Divorced"}
                          </option>
                          <option value="widowed">{lang === "sw" ? "Mjane" : "Widowed"}</option>
                        </select>
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs font-bold text-stone-500 uppercase tracking-widest ml-1">
                          {lang === "sw" ? "Kazi / Shughuli" : "Occupation"}
                        </label>
                        <select
                          value={regForm.occupation}
                          onChange={(e) => updateRegForm("occupation", e.target.value)}
                          className="w-full h-14 px-4 bg-stone-50 border border-stone-200 rounded-2xl focus:ring-2 focus:ring-emerald-500 transition-all font-medium"
                          aria-label="Occupation"
                        >
                          <option value="">
                            {lang === "sw" ? "Chagua Kazi" : "Select Occupation"}
                          </option>
                          <option value="mfanyabiashara">
                            {lang === "sw" ? "Mfanyabiashara" : "Business Owner"}
                          </option>
                          <option value="mwalimu">{lang === "sw" ? "Mwalimu" : "Teacher"}</option>
                          <option value="daktari">{lang === "sw" ? "Daktari" : "Doctor"}</option>
                          <option value="muuguzi">{lang === "sw" ? "Muuguzi" : "Nurse"}</option>
                          <option value="mhandisi">
                            {lang === "sw" ? "Mhandisi" : "Engineer"}
                          </option>
                          <option value="mwanasheria">
                            {lang === "sw" ? "Mwanasheria" : "Lawyer"}
                          </option>
                          <option value="mhasibu">
                            {lang === "sw" ? "Mhasibu" : "Accountant"}
                          </option>
                          <option value="askari_polisi">
                            {lang === "sw" ? "Askari Polisi" : "Police Officer"}
                          </option>
                          <option value="askari_jeshi">
                            {lang === "sw" ? "Askari Jeshi" : "Military Officer"}
                          </option>
                          <option value="mtumishi_serikali">
                            {lang === "sw" ? "Mtumishi wa Serikali" : "Government Employee"}
                          </option>
                          <option value="mkulima">{lang === "sw" ? "Mkulima" : "Farmer"}</option>
                          <option value="mvuvi">{lang === "sw" ? "Mvuvi" : "Fisherman"}</option>
                          <option value="mfugaji">
                            {lang === "sw" ? "Mfugaji" : "Livestock Keeper"}
                          </option>
                          <option value="fundi">
                            {lang === "sw"
                              ? "Fundi (Seremala/Mashi/Umeme)"
                              : "Technician / Artisan"}
                          </option>
                          <option value="dereva">{lang === "sw" ? "Dereva" : "Driver"}</option>
                          <option value="bodaboda">
                            {lang === "sw"
                              ? "Dereva Bodaboda / Bajaji"
                              : "Motorcycle / Bajaj Driver"}
                          </option>
                          <option value="mpishi">{lang === "sw" ? "Mpishi" : "Cook / Chef"}</option>
                          <option value="mchuuzi">
                            {lang === "sw" ? "Mchuuzi / Muuzaji" : "Vendor / Trader"}
                          </option>
                          <option value="mama_lishe">
                            {lang === "sw" ? "Mama Lishe / Mama Ntilie" : "Food Vendor"}
                          </option>
                          <option value="mtaalamu_ict">
                            {lang === "sw" ? "Mtaalamu wa TEHAMA" : "IT Professional"}
                          </option>
                          <option value="mwandishi">
                            {lang === "sw" ? "Mwandishi wa Habari" : "Journalist"}
                          </option>
                          <option value="mshauri">
                            {lang === "sw" ? "Mshauri / Consultant" : "Consultant"}
                          </option>
                          <option value="mfanyakazi_benki">
                            {lang === "sw" ? "Mfanyakazi wa Benki" : "Bank Employee"}
                          </option>
                          <option value="mfanyakazi_ngo">
                            {lang === "sw" ? "Mfanyakazi wa NGO" : "NGO Worker"}
                          </option>
                          <option value="mwanafunzi">
                            {lang === "sw" ? "Mwanafunzi" : "Student"}
                          </option>
                          <option value="mstaafu">{lang === "sw" ? "Mstaafu" : "Retired"}</option>
                          <option value="mama_nyumbani">
                            {lang === "sw" ? "Mama wa Nyumbani" : "Homemaker"}
                          </option>
                          <option value="hana_kazi">
                            {lang === "sw" ? "Hana Kazi (Anasubiri)" : "Unemployed (Job Seeker)"}
                          </option>
                          <option value="nyingine">{lang === "sw" ? "Nyingine" : "Other"}</option>
                        </select>
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs font-bold text-stone-500 uppercase tracking-widest ml-1">
                          {lang === "sw" ? "Kiwango cha Elimu" : "Education Level"}
                        </label>
                        <select
                          value={regForm.educationLevel}
                          onChange={(e) => updateRegForm("educationLevel", e.target.value)}
                          className="w-full h-14 px-4 bg-stone-50 border border-stone-200 rounded-2xl focus:ring-2 focus:ring-emerald-500 transition-all font-medium"
                          aria-label="Education Level"
                        >
                          <option value="">{lang === "sw" ? "Chagua" : "Select"}</option>
                          <option value="none">{lang === "sw" ? "Hakuna" : "None"}</option>
                          <option value="primary">{lang === "sw" ? "Msingi" : "Primary"}</option>
                          <option value="secondary">
                            {lang === "sw" ? "Sekondari" : "Secondary"}
                          </option>
                          <option value="diploma">{lang === "sw" ? "Diploma" : "Diploma"}</option>
                          <option value="degree">{lang === "sw" ? "Shahada" : "Degree"}</option>
                          <option value="masters">{lang === "sw" ? "Uzamili" : "Masters"}</option>
                          <option value="phd">{lang === "sw" ? "Uzamivu" : "PhD"}</option>
                        </select>
                      </div>
                    </div>

                    <button
                      onClick={() => setRegStep(2)}
                      className="w-full h-16 bg-stone-900 text-white rounded-2xl font-bold text-lg hover:bg-stone-800 transition-all flex items-center justify-center gap-2 mt-4"
                    >
                      {lang === "sw" ? "Endelea" : "Continue"} <ArrowRight size={20} />
                    </button>
                  </motion.div>
                )}

                {regStep === 2 && (
                  <motion.div
                    key="step2"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    className="space-y-6"
                  >
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <label className="text-xs font-bold text-stone-500 uppercase tracking-widest ml-1">
                          {lang === "sw" ? "Nchi" : "Country"}
                        </label>
                        <select
                          value={regForm.country}
                          onChange={(e) => {
                            updateRegForm("country", e.target.value);
                            if (e.target.value !== "Tanzania") {
                              updateRegForm("region", "");
                              updateRegForm("district", "");
                              updateRegForm("ward", "");
                            }
                          }}
                          className="w-full h-14 px-4 bg-stone-50 border border-stone-200 rounded-2xl focus:ring-2 focus:ring-emerald-500 transition-all font-medium"
                          aria-label="Country"
                        >
                          <option value="">
                            {lang === "sw" ? "Chagua Nchi" : "Select Country"}
                          </option>
                          {COUNTRIES.map((c) => (
                            <option key={c} value={c}>
                              {c}
                            </option>
                          ))}
                        </select>
                      </div>

                      {regForm.country === "Tanzania" ? (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <label className="text-xs font-bold text-stone-500 uppercase tracking-widest ml-1">
                              {lang === "sw" ? "Mkoa" : "Region"}
                            </label>
                            <select
                              value={regForm.region}
                              onChange={(e) => {
                                updateRegForm("region", e.target.value);
                                updateRegForm("district", "");
                                updateRegForm("ward", "");
                              }}
                              className="w-full h-14 px-4 bg-stone-50 border border-stone-200 rounded-2xl focus:ring-2 focus:ring-emerald-500 transition-all font-medium"
                              aria-label="Region"
                            >
                              <option value="">
                                {lang === "sw" ? "Chagua Mkoa" : "Select Region"}
                              </option>
                              {TANZANIA_ADDRESS_DATA.map((r) => (
                                <option key={r.name} value={r.name}>
                                  {r.name}
                                </option>
                              ))}
                            </select>
                          </div>

                          <div className="space-y-2">
                            <label className="text-xs font-bold text-stone-500 uppercase tracking-widest ml-1">
                              {lang === "sw" ? "Wilaya" : "District"}
                            </label>
                            <select
                              value={regForm.district}
                              onChange={(e) => {
                                updateRegForm("district", e.target.value);
                                updateRegForm("ward", "");
                              }}
                              disabled={!regForm.region}
                              className="w-full h-14 px-4 bg-stone-50 border border-stone-200 rounded-2xl focus:ring-2 focus:ring-emerald-500 transition-all font-medium disabled:opacity-50"
                              aria-label="District"
                            >
                              <option value="">
                                {lang === "sw" ? "Chagua Wilaya" : "Select District"}
                              </option>
                              {TANZANIA_ADDRESS_DATA.find(
                                (r) => r.name === regForm.region,
                              )?.districts.map((d) => (
                                <option key={d.name} value={d.name}>
                                  {d.name}
                                </option>
                              ))}
                            </select>
                          </div>

                          <div className="space-y-2">
                            <label className="text-xs font-bold text-stone-500 uppercase tracking-widest ml-1">
                              {lang === "sw" ? "Kata" : "Ward"}
                            </label>
                            <select
                              value={regForm.ward}
                              onChange={(e) => updateRegForm("ward", e.target.value)}
                              disabled={!regForm.district}
                              className="w-full h-14 px-4 bg-stone-50 border border-stone-200 rounded-2xl focus:ring-2 focus:ring-emerald-500 transition-all font-medium disabled:opacity-50"
                              aria-label="Ward"
                            >
                              <option value="">
                                {lang === "sw" ? "Chagua Kata" : "Select Ward"}
                              </option>
                              {TANZANIA_ADDRESS_DATA.find((r) => r.name === regForm.region)
                                ?.districts.find((d) => d.name === regForm.district)
                                ?.wards.map((w) => (
                                  <option key={w} value={w}>
                                    {w}
                                  </option>
                                ))}
                              <option value="Mengineyo">
                                {lang === "sw" ? "Mengineyo" : "Other"}
                              </option>
                            </select>
                          </div>

                          <div className="space-y-2">
                            <label className="text-xs font-bold text-stone-500 uppercase tracking-widest ml-1">
                              {lang === "sw" ? "Mtaa" : "Street"}
                            </label>
                            <input
                              type="text"
                              value={regForm.street}
                              onChange={(e) => updateRegForm("street", e.target.value)}
                              className="w-full h-14 px-4 bg-stone-50 border border-stone-200 rounded-2xl focus:ring-2 focus:ring-emerald-500 transition-all font-medium"
                              placeholder={lang === "sw" ? "Ingiza Mtaa" : "Enter Street"}
                              aria-label="Street"
                            />
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          <label className="text-xs font-bold text-stone-500 uppercase tracking-widest ml-1">
                            {lang === "sw" ? "Anwani" : "Address"}
                          </label>
                          <textarea
                            value={regForm.street}
                            onChange={(e) => updateRegForm("street", e.target.value)}
                            className="w-full p-4 bg-stone-50 border border-stone-200 rounded-2xl focus:ring-2 focus:ring-emerald-500 transition-all font-medium min-h-24"
                            placeholder={
                              lang === "sw"
                                ? "Ingiza anwani yako kamili"
                                : "Enter your full address"
                            }
                            aria-label="Address"
                          />
                        </div>
                      )}

                      <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-100 flex gap-3">
                        <CheckCircle2 className="text-emerald-600 shrink-0" size={20} />
                        <p className="text-xs text-emerald-800 leading-relaxed font-medium">
                          {lang === "sw"
                            ? "Tafadhali hakikisha anwani yako ni sahihi kwa ajili ya mawasiliano."
                            : "Please ensure your address is accurate for communication purposes."}
                        </p>
                      </div>
                    </div>

                    <div className="flex gap-4">
                      <button
                        onClick={() => setRegStep(1)}
                        className="flex-1 h-16 bg-white border border-stone-200 text-stone-600 rounded-2xl font-bold text-lg hover:bg-stone-50 transition-all flex items-center justify-center gap-2"
                      >
                        <ArrowLeft size={20} /> {lang === "sw" ? "Rudi" : "Back"}
                      </button>
                      <button
                        onClick={() => setRegStep(3)}
                        className="flex-2 h-16 bg-stone-900 text-white rounded-2xl font-bold text-lg hover:bg-stone-800 transition-all flex items-center justify-center gap-2"
                      >
                        {lang === "sw" ? "Endelea" : "Continue"} <ArrowRight size={20} />
                      </button>
                    </div>
                  </motion.div>
                )}

                {regStep === 3 && (
                  <motion.div
                    key="step3"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    className="space-y-6"
                  >
                    <form onSubmit={handleSignup} className="space-y-6">
                      <div className="space-y-2">
                        <label className="text-xs font-bold text-stone-500 uppercase tracking-widest ml-1">
                          {lang === "sw" ? "Barua pepe" : "Email"}
                        </label>
                        <div className="relative">
                          <Mail
                            className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-400"
                            size={20}
                          />
                          <input
                            type="email"
                            value={regForm.email}
                            onChange={(e) => updateRegForm("email", e.target.value)}
                            className="w-full h-14 pl-12 pr-4 bg-stone-50 border border-stone-200 rounded-2xl focus:ring-2 focus:ring-emerald-500 transition-all font-medium"
                            placeholder="juma@example.com"
                            required
                            aria-label="Email Address"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <label className="text-xs font-bold text-stone-500 uppercase tracking-widest ml-1">
                            {lang === "sw" ? "Nenosiri" : "Password"}
                          </label>
                          <div className="relative">
                            <Lock
                              className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-400"
                              size={20}
                            />
                            <input
                              type={showPassword ? "text" : "password"}
                              value={regForm.password}
                              onChange={(e) => updateRegForm("password", e.target.value)}
                              className="w-full h-14 pl-12 pr-12 bg-stone-50 border border-stone-200 rounded-2xl focus:ring-2 focus:ring-emerald-500 transition-all font-medium"
                              placeholder="••••••••"
                              required
                              aria-label="Password"
                            />
                            <button
                              type="button"
                              onClick={() => setShowPassword(!showPassword)}
                              className="absolute right-4 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600 transition-colors"
                              title={
                                showPassword
                                  ? lang === "sw"
                                    ? "Ficha nenosiri"
                                    : "Hide password"
                                  : lang === "sw"
                                    ? "Onyesha nenosiri"
                                    : "Show password"
                              }
                              aria-label={showPassword ? "Hide password" : "Show password"}
                            >
                              {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                            </button>
                          </div>
                        </div>
                        <div className="space-y-2">
                          <label className="text-xs font-bold text-stone-500 uppercase tracking-widest ml-1">
                            {lang === "sw" ? "Thibitisha Nywila" : "Confirm Password"}
                          </label>
                          <div className="relative">
                            <Lock
                              className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-400"
                              size={20}
                            />
                            <input
                              type={showPassword ? "text" : "password"}
                              value={regForm.confirmPassword}
                              onChange={(e) => updateRegForm("confirmPassword", e.target.value)}
                              className="w-full h-14 pl-12 pr-12 bg-stone-50 border border-stone-200 rounded-2xl focus:ring-2 focus:ring-emerald-500 transition-all font-medium"
                              placeholder="••••••••"
                              required
                              aria-label="Confirm Password"
                            />
                            <button
                              type="button"
                              onClick={() => setShowPassword(!showPassword)}
                              className="absolute right-4 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600 transition-colors"
                              title={
                                showPassword
                                  ? lang === "sw"
                                    ? "Ficha nenosiri"
                                    : "Hide password"
                                  : lang === "sw"
                                    ? "Onyesha nenosiri"
                                    : "Show password"
                              }
                              aria-label={showPassword ? "Hide password" : "Show password"}
                            >
                              {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                            </button>
                          </div>
                        </div>
                      </div>

                      <div className="space-y-4 pt-4">
                        <label className="flex items-start gap-3 cursor-pointer group">
                          <input
                            type="checkbox"
                            required
                            className="mt-1 h-5 w-5 rounded border-stone-300 text-emerald-600 focus:ring-emerald-500"
                          />
                          <span className="text-xs text-stone-500 leading-relaxed font-medium group-hover:text-stone-700 transition-colors">
                            {lang === "sw"
                              ? "Ninakubali Vigezo na Masharti ya E-Mtaa na Sera ya Faragha ya Serikali ya Tanzania."
                              : "I agree to the E-Mtaa Terms and Conditions and the Government of Tanzania Privacy Policy."}
                          </span>
                        </label>

                        <div className="flex gap-4">
                          <button
                            className="flex-1 h-16 bg-white border border-stone-200 text-stone-600 rounded-2xl font-bold text-lg hover:bg-stone-50 transition-all flex items-center justify-center gap-2"
                            type="button"
                            onClick={() => setRegStep(2)}
                          >
                            <ArrowLeft size={20} /> {lang === "sw" ? "Rudi" : "Back"}
                          </button>
                          <button
                            disabled={loading}
                            className="flex-2 h-16 bg-emerald-600 text-white rounded-2xl font-bold text-lg hover:bg-emerald-700 transition-all shadow-xl shadow-emerald-200 flex items-center justify-center gap-3 disabled:opacity-50 group"
                            type="submit"
                          >
                            {loading ? (
                              <Loader2 className="animate-spin" />
                            ) : (
                              <>
                                {lang === "sw" ? "Kamilisha Usajili" : "Complete Registration"}
                                <CheckCircle2
                                  size={20}
                                  className="group-hover:scale-110 transition-transform"
                                />
                              </>
                            )}
                          </button>
                        </div>

                        {/* Social Signup Divider */}
                        <div className="flex items-center gap-3 pt-2">
                          <div className="flex-1 h-px bg-stone-200" />
                          <span className="text-xs font-bold text-stone-400 uppercase tracking-wider">
                            {lang === "sw" ? "au jisajili na" : "or sign up with"}
                          </span>
                          <div className="flex-1 h-px bg-stone-200" />
                        </div>

                        {/* Social Signup Buttons */}
                        <div className="grid grid-cols-2 gap-3">
                          <button
                            type="button"
                            onClick={handleGoogleLogin}
                            className="h-12 bg-white border-2 border-stone-200 rounded-xl font-bold text-sm text-stone-700 hover:bg-stone-50 hover:border-stone-300 transition-all flex items-center justify-center gap-2.5"
                          >
                            <svg width="18" height="18" viewBox="0 0 24 24">
                              <path
                                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
                                fill="#4285F4"
                              />
                              <path
                                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                                fill="#34A853"
                              />
                              <path
                                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                                fill="#FBBC05"
                              />
                              <path
                                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                                fill="#EA4335"
                              />
                            </svg>
                            Google
                          </button>
                          <button
                            type="button"
                            onClick={handleAppleLogin}
                            className="h-12 bg-black border-2 border-black rounded-xl font-bold text-sm text-white hover:bg-stone-800 transition-all flex items-center justify-center gap-2.5"
                          >
                            <svg width="16" height="18" viewBox="0 0 17 20" fill="white">
                              <path d="M13.545 10.239c-.021-2.088 1.704-3.092 1.782-3.141-0.97-1.418-2.482-1.612-3.02-1.634-1.285-.13-2.509.756-3.162.756-.652 0-1.662-.737-2.731-.718-1.406.02-2.703.817-3.427 2.076-1.461 2.534-.374 6.292 1.05 8.348.696 1.006 1.525 2.136 2.614 2.095 1.049-.042 1.445-.679 2.714-.679 1.269 0 1.625.679 2.731.658 1.128-.019 1.843-1.024 2.534-2.033.799-1.166 1.128-2.294 1.148-2.352-.025-.011-2.203-.846-2.225-3.356zM11.483 3.492c.578-.702.969-1.676.862-2.647-.832.034-1.841.554-2.438 1.253-.535.619-1.004 1.607-.878 2.555.929.072 1.878-.472 2.454-1.161z" />
                            </svg>
                            Apple
                          </button>
                        </div>
                      </div>
                    </form>
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
