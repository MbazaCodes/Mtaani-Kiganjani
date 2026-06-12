/**
 * CompleteProfileModal — Quick profile completion popup
 *
 * Shown when citizen clicks "Complete Profile" from dashboard banner
 * or VerificationStatusCard. Collects all key fields in one place,
 * saves directly to users table on submit.
 */
import React, { useState, useMemo, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X, User, Phone, Mail, MapPin, Calendar, Shield,
  Loader2, CheckCircle2, AlertCircle, ChevronDown, Globe2,
} from "lucide-react";
import PhoneInput from "react-phone-number-input";
import "react-phone-number-input/style.css";
import { cn } from "@/lib/utils";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/context/ToastContext";
import { TANZANIA_ADDRESS_DATA } from "@/lib/addressData";
import type { UserProfile } from "@/lib/supabase";

interface CompleteProfileModalProps {
  open: boolean;
  user: Partial<UserProfile> | null;
  lang: string;
  onClose: () => void;
  onSaved: (updated: Partial<UserProfile>) => void;
}

// ── Mini primitives ────────────────────────────────────────────────────────────
const Label: React.FC<{ children: React.ReactNode; required?: boolean }> = ({ children, required }) => (
  <label className="block text-[11px] font-black text-stone-500 uppercase tracking-widest mb-1.5">
    {children}{required && <span className="text-red-400 ml-0.5">*</span>}
  </label>
);

const Err: React.FC<{ msg?: string }> = ({ msg }) =>
  msg ? <p className="mt-1 text-xs text-red-500 flex items-center gap-1"><AlertCircle size={11} />{msg}</p> : null;

const Input: React.FC<React.InputHTMLAttributes<HTMLInputElement> & { icon?: React.ReactNode; hasError?: boolean }> = ({
  icon, hasError, className, ...props
}) => (
  <div className="relative">
    {icon && <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400 pointer-events-none">{icon}</span>}
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

const Select: React.FC<React.SelectHTMLAttributes<HTMLSelectElement> & { placeholder?: string; hasError?: boolean }> = ({
  children, placeholder, hasError, ...props
}) => (
  <select
    {...props}
    className={cn(
      "w-full h-11 px-3.5 bg-stone-50 border rounded-xl text-sm font-medium text-stone-900 outline-none transition-all",
      "focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 focus:bg-white disabled:opacity-50",
      hasError ? "border-red-300 bg-red-50" : "border-stone-200",
    )}
  >
    {placeholder && <option value="">{placeholder}</option>}
    {children}
  </select>
);

export const CompleteProfileModal: React.FC<CompleteProfileModalProps> = ({
  open, user, lang, onClose, onSaved,
}) => {
  const { showToast } = useToast();
  const sw = lang === "sw";
  const L = (s: string, e: string) => (sw ? s : e);

  const [saving, setSaving] = useState(false);
  const [errs, setErrs] = useState<Record<string, string>>({});

  // ── sessionStorage key scoped to this user ────────────────────────────────
  const DRAFT_KEY = `e-mtaa:profile-draft:${user?.id ?? "anon"}`;

  // Load draft from sessionStorage or fall back to user prop
  const loadDraft = useCallback(() => {
    try {
      const raw = sessionStorage.getItem(DRAFT_KEY);
      if (raw) return JSON.parse(raw) as Record<string, string>;
    } catch {}
    return null;
  }, [DRAFT_KEY]);

  const draft = loadDraft();

  const [firstName, setFirstName] = useState(draft?.firstName ?? user?.first_name ?? "");
  const [middleName, setMiddleName] = useState(draft?.middleName ?? user?.middle_name ?? "");
  const [lastName, setLastName] = useState(draft?.lastName ?? user?.last_name ?? "");
  const [phone, setPhone] = useState(draft?.phone ?? user?.phone ?? "");
  const [gender, setGender] = useState(draft?.gender ?? user?.gender ?? "");
  const [dob, setDob] = useState(draft?.dob ?? user?.date_of_birth ?? user?.birth_date ?? "");
  const [marital, setMarital] = useState(draft?.marital ?? user?.marital_status ?? "");
  const [occupation, setOccupation] = useState(draft?.occupation ?? user?.occupation ?? "");
  const [region, setRegion] = useState(draft?.region ?? user?.region ?? "");
  const [district, setDistrict] = useState(draft?.district ?? user?.district ?? "");
  const [ward, setWard] = useState(draft?.ward ?? user?.ward ?? "");
  const [street, setStreet] = useState(draft?.street ?? user?.street ?? "");
  const [nida, setNida] = useState(draft?.nida ?? user?.nida_number ?? "");
  const [countryResidence, setCountryResidence] = useState(draft?.countryResidence ?? user?.country_of_residence ?? "");
  const [cityResidence, setCityResidence] = useState(draft?.cityResidence ?? (user as Record<string, unknown>)?.city_of_residence as string ?? "");

  // ── Auto-save draft to sessionStorage on every change ────────────────────
  const saveDraft = useCallback((patch: Record<string, string>) => {
    try {
      const current = loadDraft() ?? {};
      sessionStorage.setItem(DRAFT_KEY, JSON.stringify({ ...current, ...patch }));
    } catch {}
  }, [DRAFT_KEY, loadDraft]);

  // ── Clear draft after successful save ─────────────────────────────────────
  const clearDraft = useCallback(() => {
    try { sessionStorage.removeItem(DRAFT_KEY); } catch {}
  }, [DRAFT_KEY]);

  const isDiaspora = !!user?.is_diaspora;

  // Cascading address
  const districts = useMemo(
    () => TANZANIA_ADDRESS_DATA.find((r) => r.name === region)?.districts || [],
    [region],
  );
  const wards = useMemo(
    () => districts.find((d) => d.name === district)?.wards || [],
    [districts, district],
  );

  // When modal opens fresh (no draft) reset from user prop
  useEffect(() => {
    if (open && user) {
      const existing = loadDraft();
      // Only reset to user values if no draft exists
      if (!existing) {
        setFirstName(user.first_name ?? "");
        setMiddleName(user.middle_name ?? "");
        setLastName(user.last_name ?? "");
        setPhone(user.phone ?? "");
        setGender(user.gender ?? "");
        setDob(user.date_of_birth ?? user.birth_date ?? "");
        setMarital(user.marital_status ?? "");
        setOccupation(user.occupation ?? "");
        setRegion(user.region ?? "");
        setDistrict(user.district ?? "");
        setWard(user.ward ?? "");
        setStreet(user.street ?? "");
        setNida(user.nida_number ?? "");
        setCountryResidence(user.country_of_residence ?? "");
        setCityResidence((user as Record<string, unknown>)?.city_of_residence as string ?? "");
      }
    }
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  const validate = () => {
    const e: Record<string, string> = {};
    if (!firstName.trim()) e.firstName = L("Jina la kwanza linahitajika", "First name required");
    if (!lastName.trim()) e.lastName = L("Jina la mwisho linahitajika", "Last name required");
    if (!isDiaspora && !phone) e.phone = L("Namba ya simu inahitajika", "Phone required");
    if (!isDiaspora && !region) e.region = L("Chagua mkoa", "Select region");
    if (!isDiaspora && !district) e.district = L("Chagua wilaya", "Select district");
    if (!isDiaspora && !ward) e.ward = L("Chagua kata", "Select ward");
    if (!isDiaspora && !street.trim()) e.street = L("Jina la mtaa linahitajika", "Street required");
    if (isDiaspora && !countryResidence) e.countryResidence = L("Chagua nchi", "Select country");
    setErrs(e);
    return !Object.keys(e).length;
  };

  const handleSave = async () => {
    if (!validate()) return;
    if (!user?.id) return;
    setSaving(true);

    // Safety: always stop spinning after 10s no matter what
    const safetyTimer = setTimeout(() => setSaving(false), 10000);

    try {
      const updates: Record<string, unknown> = {};

      if (firstName.trim()) updates.first_name = firstName.trim().toUpperCase();
      updates.middle_name = middleName.trim() ? middleName.trim().toUpperCase() : null;
      if (lastName.trim()) updates.last_name = lastName.trim().toUpperCase();
      if (phone) updates.phone = phone;
      if (gender) { updates.gender = gender; updates.sex = gender; }
      if (dob) updates.date_of_birth = dob;
      if (marital) updates.marital_status = marital.toLowerCase();
      if (occupation.trim()) updates.occupation = occupation.trim();
      if (region) updates.region = region;
      if (district) updates.district = district;
      if (ward) updates.ward = ward;
      if (street.trim()) updates.street = street.trim();
      if (countryResidence) updates.country_of_residence = countryResidence;
      if (cityResidence.trim()) updates.city_of_residence = cityResidence.trim();
      const cleanNida = nida.trim().replace(/-/g, "");
      if (cleanNida) updates.nida_number = cleanNida;

      if (Object.keys(updates).length === 0) {
        showToast(L("Hakuna mabadiliko ya kuhifadhi", "No changes to save"), "info");
        return;
      }

      // Race the DB call against a 8s timeout
      const dbPromise = supabase.from("users").update(updates).eq("id", user.id);
      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error(L("Muda umeisha. Angalia mtandao wako.", "Request timed out. Check your connection."))), 8000)
      );

      const { error } = await Promise.race([dbPromise, timeoutPromise]) as Awaited<typeof dbPromise>;

      if (error) {
        // RLS might be blocking — try upsert as fallback
        if (error.code === "42501" || error.message?.includes("policy")) {
          const { error: upsertErr } = await supabase
            .from("users")
            .upsert({ id: user.id, ...updates }, { onConflict: "id" });
          if (upsertErr) throw new Error(upsertErr.message);
        } else {
          throw new Error(
            (error as { details?: string }).details || error.message || "Update failed"
          );
        }
      }

      showToast(L("Wasifu umehifadhiwa! ✓", "Profile saved! ✓"), "success");
      clearDraft();
      onSaved({ ...user, ...updates } as Partial<UserProfile>);
      onClose();
    } catch (err) {
      showToast((err as Error).message || L("Hitilafu imetokea", "An error occurred"), "error");
    } finally {
      clearTimeout(safetyTimer);
      setSaving(false);
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            key="cp-backdrop"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-[150] bg-stone-900/60 backdrop-blur-sm"
          />

          {/* Modal */}
          <motion.div
            key="cp-modal"
            initial={{ opacity: 0, scale: 0.97, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.97, y: 12 }}
            transition={{ type: "spring", stiffness: 400, damping: 30 }}
            className="fixed inset-0 z-[151] flex items-center justify-center p-0 sm:p-4 pointer-events-none"
          >
            <div
              className="pointer-events-auto w-full h-full sm:h-auto sm:max-w-2xl bg-white sm:rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-screen sm:max-h-[92vh]"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="px-5 py-4 border-b border-stone-100 flex items-center justify-between bg-white sticky top-0 z-10 shrink-0">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 bg-emerald-100 rounded-xl flex items-center justify-center">
                    <User size={18} className="text-emerald-600" />
                  </div>
                  <div>
                    <h2 className="text-sm font-black text-stone-900">{L("Kamilisha Wasifu Wako", "Complete Your Profile")}</h2>
                    <p className="text-[10px] text-stone-400 font-medium">
                      {draft
                        ? <span className="text-amber-600 font-bold">↩ {L("Unaendelea ulipoacha", "Continuing where you left off")}</span>
                        : L("Jaza taarifa zako — utahifadhiwa moja kwa moja", "Fill in your details — saved automatically")}
                    </p>
                  </div>
                </div>
                <button onClick={onClose} className="p-1.5 hover:bg-stone-100 rounded-full text-stone-400" aria-label="Close">
                  <X size={18} />
                </button>
              </div>

              {/* Body */}
              <div className="flex-1 overflow-y-auto px-5 py-5 space-y-5">

                {/* Personal info */}
                <div>
                  <p className="text-[10px] font-black text-stone-400 uppercase tracking-widest mb-3 flex items-center gap-1.5">
                    <User size={11} /> {L("Taarifa Binafsi", "Personal Information")}
                  </p>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label required>{L("Jina la Kwanza", "First Name")}</Label>
                      <Input value={firstName} onChange={(e) => { setFirstName(e.target.value); saveDraft({ firstName: e.target.value }); setErrs((p) => { const n={...p}; delete n.firstName; return n; }); }}
                        placeholder="Juma" icon={<User size={13} />} hasError={!!errs.firstName} />
                      <Err msg={errs.firstName} />
                    </div>
                    <div>
                      <Label>{L("Jina la Kati", "Middle Name")}</Label>
                      <Input value={middleName} onChange={(e) => { setMiddleName(e.target.value); saveDraft({ middleName: e.target.value }); }} placeholder="Rashidi" />
                    </div>
                  </div>
                  <div className="mt-3">
                    <Label required>{L("Jina la Mwisho", "Last Name")}</Label>
                    <Input value={lastName} onChange={(e) => { setLastName(e.target.value); saveDraft({ lastName: e.target.value }); setErrs((p) => { const n={...p}; delete n.lastName; return n; }); }}
                      placeholder="Mkubwa" hasError={!!errs.lastName} />
                    <Err msg={errs.lastName} />
                  </div>

                  <div className="grid grid-cols-2 gap-3 mt-3">
                    <div>
                      <Label>{L("Jinsia", "Gender")}</Label>
                      <Select value={gender} onChange={(e) => { setGender(e.target.value); saveDraft({ gender: e.target.value }); }} placeholder={L("Chagua", "Select")}>
                        <option value="M">{L("Mwanaume", "Male")}</option>
                        <option value="F">{L("Mwanamke", "Female")}</option>
                        <option value="O">{L("Nyingine", "Other")}</option>
                      </Select>
                    </div>
                    <div>
                      <Label>{L("Tarehe ya Kuzaliwa", "Date of Birth")}</Label>
                      <Input type="date" value={dob} onChange={(e) => { setDob(e.target.value); saveDraft({ dob: e.target.value }); }}
                        max={new Date().toISOString().split("T")[0]} icon={<Calendar size={13} />} />
                    </div>
                    <div>
                      <Label>{L("Hali ya Ndoa", "Marital Status")}</Label>
                      <Select value={marital} onChange={(e) => { setMarital(e.target.value); saveDraft({ marital: e.target.value }); }} placeholder={L("Chagua", "Select")}>
                        <option value="single">{L("Sijaoana", "Single")}</option>
                        <option value="married">{L("Nimeoa/Olewa", "Married")}</option>
                        <option value="divorced">{L("Talaka", "Divorced")}</option>
                        <option value="widowed">{L("Mjane", "Widowed")}</option>
                      </Select>
                    </div>
                    <div>
                      <Label>{L("Kazi / Taaluma", "Occupation")}</Label>
                      <Input value={occupation} onChange={(e) => { setOccupation(e.target.value); saveDraft({ occupation: e.target.value }); }} placeholder={L("Mfanyabiashara", "Business person")} />
                    </div>
                  </div>
                </div>

                {/* Phone */}
                {!isDiaspora && (
                  <div>
                    <p className="text-[10px] font-black text-stone-400 uppercase tracking-widest mb-3 flex items-center gap-1.5">
                      <Phone size={11} /> {L("Mawasiliano", "Contact")}
                    </p>
                    <Label required>{L("Namba ya Simu", "Phone Number")}</Label>
                    <div className={cn("border rounded-xl overflow-hidden bg-stone-50 focus-within:ring-2 focus-within:ring-emerald-500 transition-all", errs.phone ? "border-red-300" : "border-stone-200")}>
                      <PhoneInput international defaultCountry="TZ" value={phone}
                        onChange={(v) => { setPhone(v ?? ""); saveDraft({ phone: v ?? "" }); setErrs((p) => { const n={...p}; delete n.phone; return n; }); }}
                        className="h-11 px-3.5 text-sm font-medium bg-transparent outline-none w-full" />
                    </div>
                    <Err msg={errs.phone} />
                  </div>
                )}

                {/* Address — Tanzania residents */}
                {!isDiaspora && (
                  <div>
                    <p className="text-[10px] font-black text-stone-400 uppercase tracking-widest mb-3 flex items-center gap-1.5">
                      <MapPin size={11} /> {L("Anwani ya Makazi", "Residential Address")}
                    </p>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label required>{L("Mkoa", "Region")}</Label>
                        <Select value={region} onChange={(e) => { setRegion(e.target.value); setDistrict(""); setWard(""); saveDraft({ region: e.target.value, district: "", ward: "" }); }} hasError={!!errs.region} placeholder={L("Chagua Mkoa", "Select Region")}>
                          {TANZANIA_ADDRESS_DATA.map((r) => <option key={r.name} value={r.name}>{r.name}</option>)}
                        </Select>
                        <Err msg={errs.region} />
                      </div>
                      <div>
                        <Label required>{L("Wilaya", "District")}</Label>
                        <Select value={district} onChange={(e) => { setDistrict(e.target.value); setWard(""); saveDraft({ district: e.target.value, ward: "" }); }} disabled={!region} hasError={!!errs.district} placeholder={L("Chagua Wilaya", "Select District")}>
                          {districts.map((d) => <option key={d.name} value={d.name}>{d.name}</option>)}
                        </Select>
                        <Err msg={errs.district} />
                      </div>
                      <div>
                        <Label required>{L("Kata", "Ward")}</Label>
                        <Select value={ward} onChange={(e) => { setWard(e.target.value); saveDraft({ ward: e.target.value }); }} disabled={!district} hasError={!!errs.ward} placeholder={L("Chagua Kata", "Select Ward")}>
                          {wards.map((w) => <option key={w} value={w}>{w}</option>)}
                          <option value="Mengineyo">{L("Mengineyo", "Other")}</option>
                        </Select>
                        <Err msg={errs.ward} />
                      </div>
                      <div>
                        <Label required>{L("Mtaa / Kijiji", "Street / Village")}</Label>
                        <Input value={street} onChange={(e) => { setStreet(e.target.value); saveDraft({ street: e.target.value }); setErrs((p) => { const n={...p}; delete n.street; return n; }); }}
                          placeholder={L("Jina la mtaa", "Street name")} hasError={!!errs.street} />
                        <Err msg={errs.street} />
                      </div>
                    </div>
                  </div>
                )}

                {/* Diaspora address */}
                {isDiaspora && (
                  <div>
                    <p className="text-[10px] font-black text-stone-400 uppercase tracking-widest mb-3 flex items-center gap-1.5">
                      <Globe2 size={11} /> {L("Makazi ya Nje", "Residence Abroad")}
                    </p>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label required>{L("Nchi ya Makazi", "Country of Residence")}</Label>
                        <Input value={countryResidence} onChange={(e) => { setCountryResidence(e.target.value); saveDraft({ countryResidence: e.target.value }); setErrs((p) => { const n={...p}; delete n.countryResidence; return n; }); }}
                          placeholder="UK, USA, UAE..." hasError={!!errs.countryResidence} />
                        <Err msg={errs.countryResidence} />
                      </div>
                      <div>
                        <Label>{L("Mji wa Makazi", "City of Residence")}</Label>
                        <Input value={cityResidence} onChange={(e) => { setCityResidence(e.target.value); saveDraft({ cityResidence: e.target.value }); }} placeholder="London, Dubai..." />
                      </div>
                      <div>
                        <Label>{L("Mkoa wa Asili", "Home Region")}</Label>
                        <Select value={region} onChange={(e) => { setRegion(e.target.value); setDistrict(""); setWard(""); saveDraft({ region: e.target.value, district: "", ward: "" }); }} placeholder={L("Chagua Mkoa", "Select Region")}>
                          {TANZANIA_ADDRESS_DATA.map((r) => <option key={r.name} value={r.name}>{r.name}</option>)}
                        </Select>
                      </div>
                      <div>
                        <Label>{L("Wilaya ya Asili", "Home District")}</Label>
                        <Select value={district} onChange={(e) => { setDistrict(e.target.value); setWard(""); saveDraft({ district: e.target.value, ward: "" }); }} disabled={!region} placeholder={L("Chagua", "Select")}>
                          {districts.map((d) => <option key={d.name} value={d.name}>{d.name}</option>)}
                        </Select>
                      </div>
                    </div>
                  </div>
                )}

                {/* Identity document */}
                <div>
                  <p className="text-[10px] font-black text-stone-400 uppercase tracking-widest mb-3 flex items-center gap-1.5">
                    <Shield size={11} /> {L("Kitambulisho", "Identity Document")} <span className="normal-case text-stone-400 font-medium">({L("hiari", "optional")})</span>
                  </p>
                  <Label>{isDiaspora ? L("Namba ya Pasipoti", "Passport Number") : "NIDA"}</Label>
                  <Input value={nida} onChange={(e) => { setNida(e.target.value); saveDraft({ nida: e.target.value }); }}
                    placeholder={isDiaspora ? "TZ1234567" : "XXXX-XXXXX-XXXXX-XX"}
                    icon={<Shield size={13} />} />
                  {!isDiaspora && (
                    <p className="mt-1 text-[11px] text-stone-400">{L("Kuingiza NIDA kutawezesha usindikaji wa papo hapo", "Adding NIDA enables instant processing")}</p>
                  )}
                </div>

              </div>

              {/* Footer */}
              <div className="px-5 pb-5 pt-3 border-t border-stone-100 bg-white sticky bottom-0 shrink-0">
                <div className="flex gap-3">
                  <button onClick={onClose}
                    className="flex-1 h-11 bg-white border border-stone-200 text-stone-600 rounded-2xl font-bold text-sm hover:bg-stone-50 transition-all">
                    {L("Baadaye", "Later")}
                  </button>
                  <button onClick={handleSave} disabled={saving}
                    className="flex-[2] h-11 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-2xl font-bold text-sm flex items-center justify-center gap-2 transition-all shadow-lg shadow-emerald-100">
                    {saving ? <Loader2 size={16} className="animate-spin" /> : <><CheckCircle2 size={15} />{L("Hifadhi Wasifu", "Save Profile")}</>}
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

export default CompleteProfileModal;
