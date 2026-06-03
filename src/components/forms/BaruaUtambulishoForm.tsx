/**
 * Barua ya Utambulisho — Introduction Letter Form
 * Full rebuild: 5 steps, 17 purposes, dynamic institutions + live fee,
 * optional CT ID reference, doc upload, edit-in-preview, success screen
 *
 * Fee structure:
 *   Base: TSh 3,000 (covers 1 institution)
 *   Each additional institution: +TSh 1,000
 *   Max 6 institutions total → max TSh 8,000
 */
import React, { useState, useRef, useCallback } from "react";
import {
  Loader2,
  CheckCircle,
  CheckCircle2,
  ArrowLeft,
  ArrowRight,
  Eye,
  FileCheck,
  User,
  MapPin,
  Briefcase,
  FileText,
  Building2,
  AlertCircle,
  Shield,
  Info,
  Upload,
  X,
  Edit2,
  Plus,
  Trash2,
  CreditCard,
  Hash,
  Phone,
  Mail,
  Check,
  Activity,
  Calendar,
} from "lucide-react";
import { FormProps, labels } from "./types";
import { ProgressFill } from "../ui/ProgressFill";

// ─── Constants ───────────────────────────────────────────────────────────────

const BASE_FEE = 3000;
const MAX_INSTITUTIONS = 10;

// Tiered flat fee: 1 = 3,000 / 2–4 = 5,000 / 5–10 = 10,000
const calcFee = (count: number): number => {
  if (count === 1) return 3000;
  if (count <= 4) return 5000;
  return 10000;
};

const PURPOSES = [
  { label: "Kufungua Akaunti ya Benki (Bank Account Opening)", value: "BENKI" },
  { label: "Maombi ya Ajira (Job Application)", value: "AJIRA" },
  { label: "Maombi ya Chuo / Shule (School/College Application)", value: "CHUO" },
  { label: "Kupata Huduma za Afya (Health Services)", value: "AFYA" },
  { label: "Kuomba Leseni ya Biashara (Business License)", value: "LESENI_BIASHARA" },
  { label: "Kuomba Leseni ya Udereva (Driving License)", value: "LESENI_UDEREVA" },
  { label: "Kusajili SIM Card / Simu (SIM Registration)", value: "SIM" },
  { label: "Kuomba Pasipoti / Visa (Passport / Visa)", value: "PASIPOTI" },
  { label: "Kupata Huduma za TRA (Tax/TRA Services)", value: "TRA" },
  { label: "Kupata Huduma za Bima (Insurance Services)", value: "BIMA" },
  { label: "Kusajili Mtoto Shuleni (School Enrollment)", value: "KUSAJILI_MTOTO" },
  { label: "Kuomba Mkopo (Loan Application)", value: "MKOPO" },
  { label: "Kununua / Kupanga Ardhi au Nyumba (Property)", value: "ARDHI" },
  { label: "Kupata Umeme / Maji (Utilities — TANESCO/DAWASA)", value: "HUDUMA_UMEME_MAJI" },
  { label: "Uthibitisho kwa Mwajiri (Employer Verification)", value: "WAAJIRI" },
  { label: "Maombi ya Serikali (Government Application)", value: "SERIKALI" },
  { label: "Nyinginezo (Other — specify below)", value: "NYINGINEZO" },
];

const ALLOWED_DOCS = ["image/jpeg", "image/png", "image/webp", "application/pdf"];
const MAX_DOC_SIZE = 10 * 1024 * 1024; // 10MB

// ─── Types ────────────────────────────────────────────────────────────────────

type Step = "applicant" | "purpose" | "institutions" | "documents" | "preview";

interface Institution {
  name: string;
  address: string;
  contact_person: string;
  department: string;
}

interface UploadedDoc {
  file: File;
  preview: string;
  label: string;
}

interface FormValues {
  // Step 1 – Applicant
  application_type: string; // SELF / MINOR / BEHALF
  ct_id_reference: string;
  has_resident_id: string;
  // Minor details
  minor_full_name: string;
  minor_dob: string;
  minor_relationship: string;
  minor_nida: string;
  // On-behalf details
  behalf_full_name: string;
  behalf_nida: string;
  behalf_phone: string;
  behalf_relationship: string;
  // Step 2 – Purpose
  purpose: string;
  purpose_details: string;
  urgency: string;
  // Step 5 – Consent
  terms_accepted: boolean;
  data_confirmed: boolean;
}

// ─── Component ───────────────────────────────────────────────────────────────

export const BaruaUtambulishoForm: React.FC<FormProps> = ({
  onSubmit,
  isLoading,
  lang = "sw",
  userProfile,
}) => {
  const t = labels[lang];
  const L = (sw: string, en: string) => (lang === "sw" ? sw : en);

  const [step, setStep] = useState<Step>("applicant");
  const [submitted, setSubmitted] = useState(false);
  const [appRef, setAppRef] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Institutions — always start with 1 empty slot
  const [institutions, setInstitutions] = useState<Institution[]>([
    { name: "", address: "", contact_person: "", department: "" },
  ]);

  // Uploaded support docs
  const [docs, setDocs] = useState<UploadedDoc[]>([]);
  const docRef = useRef<HTMLInputElement>(null);
  const [docErr, setDocErr] = useState("");

  const [vals, setVals] = useState<FormValues>({
    application_type: "SELF",
    ct_id_reference: (userProfile as any)?.citizen_id || "",
    has_resident_id: (userProfile as any)?.citizen_id ? "YES" : "",
    minor_full_name: "",
    minor_dob: "",
    minor_relationship: "",
    minor_nida: "",
    behalf_full_name: "",
    behalf_nida: "",
    behalf_phone: "",
    behalf_relationship: "",
    purpose: "",
    purpose_details: "",
    urgency: "NORMAL",
    terms_accepted: false,
    data_confirmed: false,
  });

  // ─── Fee calculator ─────────────────────────────────────────────────────
  const totalFee = calcFee(institutions.length);
  const fmtFee = (n: number) => `TSh ${n.toLocaleString()}`;

  // ─── Steps ───────────────────────────────────────────────────────────────
  const STEPS: { key: Step; label: string; sw: string }[] = [
    { key: "applicant", label: "Applicant", sw: "Muombaji" },
    { key: "purpose", label: "Purpose", sw: "Sababu" },
    { key: "institutions", label: "Institutions", sw: "Taasisi" },
    { key: "documents", label: "Documents", sw: "Nyaraka" },
    { key: "preview", label: "Preview", sw: "Hakiki" },
  ];
  const stepIdx = STEPS.findIndex((s) => s.key === step);
  const progress = ((stepIdx + 1) / STEPS.length) * 100;

  // ─── Helpers ────────────────────────────────────────────────────────────
  const set = (k: keyof FormValues, v: string | boolean) => setVals((p) => ({ ...p, [k]: v }));
  const clrErr = (k: string) =>
    setErrors((p) => {
      const n = { ...p };
      delete n[k];
      return n;
    });
  const err = (k: string) => errors[k];

  // Institution helpers
  const setInst = (i: number, k: keyof Institution, v: string) =>
    setInstitutions((p) => p.map((inst, idx) => (idx === i ? { ...inst, [k]: v } : inst)));

  const addInst = () => {
    if (institutions.length < MAX_INSTITUTIONS)
      setInstitutions((p) => [...p, { name: "", address: "", contact_person: "", department: "" }]);
  };

  const removeInst = (i: number) => {
    if (institutions.length > 1) setInstitutions((p) => p.filter((_, idx) => idx !== i));
  };

  // Doc helpers
  const addDoc = useCallback(
    (file: File): string | null => {
      if (!ALLOWED_DOCS.includes(file.type))
        return L(
          "Aina ya faili haikushukuliwa. Tumia JPG, PNG, au PDF",
          "File type not allowed. Use JPG, PNG or PDF",
        );
      if (file.size > MAX_DOC_SIZE)
        return L("Faili ni kubwa sana. Upeo ni 10MB", "File too large. Max 10MB");
      const preview = URL.createObjectURL(file);
      setDocs((p) => [...p, { file, preview, label: file.name }]);
      return null;
    },
    [lang],
  );

  const removeDoc = (i: number) =>
    setDocs((p) => {
      URL.revokeObjectURL(p[i].preview);
      return p.filter((_, idx) => idx !== i);
    });

  // ─── Validation ─────────────────────────────────────────────────────────
  const validate = (): boolean => {
    const e: Record<string, string> = {};

    if (step === "applicant") {
      if (vals.application_type === "MINOR") {
        if (!vals.minor_full_name.trim())
          e.minor_full_name = L("Jina la mtoto linahitajika", "Child's name required");
        if (!vals.minor_dob)
          e.minor_dob = L("Tarehe ya kuzaliwa inahitajika", "Date of birth required");
        if (!vals.minor_relationship.trim())
          e.minor_relationship = L("Uhusiano unahitajika", "Relationship required");
      }
      if (vals.application_type === "BEHALF") {
        if (!vals.behalf_full_name.trim())
          e.behalf_full_name = L("Jina la mtu linahitajika", "Person's name required");
        if (!vals.behalf_phone.trim())
          e.behalf_phone = L("Simu inahitajika", "Phone number required");
        if (!vals.behalf_relationship.trim())
          e.behalf_relationship = L("Uhusiano unahitajika", "Relationship required");
      }
    }

    if (step === "purpose") {
      if (!vals.purpose) e.purpose = L("Chagua sababu ya maombi", "Select purpose of application");
      if (vals.purpose === "NYINGINEZO" && !vals.purpose_details.trim())
        e.purpose_details = L("Tafadhali eleza sababu", "Please describe the purpose");
    }

    if (step === "institutions") {
      institutions.forEach((inst, i) => {
        if (!inst.name.trim())
          e[`inst_name_${i}`] = L("Jina la taasisi linahitajika", "Institution name required");
      });
    }

    if (step === "preview") {
      if (!vals.terms_accepted) e.terms_accepted = L("Lazima uthibitishe", "Confirmation required");
      if (!vals.data_confirmed) e.data_confirmed = L("Lazima ukubali", "Consent required");
    }

    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const goNext = () => {
    if (validate()) {
      const n = STEPS[stepIdx + 1];
      if (n) setStep(n.key);
    }
  };
  const goPrev = () => {
    const p = STEPS[stepIdx - 1];
    if (p) setStep(p.key);
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    setSubmitting(true);
    try {
      const ref = `IL-${new Date().getFullYear()}-${Math.floor(Math.random() * 900000 + 100000)}`;
      const files = docs.map((d) => d.file);
      const payload: Record<string, unknown> = {
        ...vals,
        institutions,
        total_fee: totalFee,
        service_name: "Barua ya Utambulisho",
        application_reference: ref,
        document_count: docs.length,
        beneficiary_name:
          vals.application_type === "MINOR"
            ? vals.minor_full_name
            : vals.application_type === "BEHALF"
              ? vals.behalf_full_name
              : `${userProfile?.first_name || ""} ${userProfile?.last_name || ""}`.trim(),
      };
      await onSubmit(payload, files);
      setAppRef(ref);
      setSubmitted(true);
    } catch (e) {
      console.error("Submit error:", e);
    } finally {
      setSubmitting(false);
    }
  };

  // ─── Shared styles ───────────────────────────────────────────────────────
  const inputCls = (name: string) =>
    `w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all bg-white text-sm ${
      err(name) ? "border-red-400 bg-red-50" : "border-stone-200"
    }`;
  const lbl = "block text-xs font-bold text-stone-600 uppercase tracking-wider mb-1.5";
  const secHdr =
    "bg-gradient-to-r from-emerald-50 to-teal-50 px-4 py-3 rounded-xl border-l-4 border-emerald-500 mb-4";

  const Field = ({
    name,
    label,
    required,
    hint,
    children: ch,
  }: {
    name: string;
    label: string;
    required?: boolean;
    hint?: string;
    children: React.ReactNode;
  }) => (
    <div>
      <label className={lbl}>
        {label}
        {required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      {ch}
      {err(name) && (
        <p className="text-red-500 text-xs mt-1 flex items-center gap-1">
          <AlertCircle size={11} />
          {err(name)}
        </p>
      )}
      {hint && !err(name) && <p className="text-stone-400 text-xs mt-1">{hint}</p>}
    </div>
  );

  const Sel = ({
    name,
    value,
    onChange,
    options,
    placeholder,
  }: {
    name: string;
    value: string;
    onChange: (v: string) => void;
    options: { label: string; value: string }[];
    placeholder?: string;
  }) => (
    <select
      value={value}
      onChange={(e) => {
        onChange(e.target.value);
        clrErr(name);
      }}
      className={inputCls(name)}
    >
      <option value="">{placeholder || t.select}</option>
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  );

  const TI = ({
    name,
    value,
    onChange,
    placeholder,
    type = "text",
  }: {
    name: string;
    value: string;
    onChange: (v: string) => void;
    placeholder?: string;
    type?: string;
  }) => (
    <input
      type={type}
      value={value}
      onChange={(e) => {
        onChange(e.target.value);
        clrErr(name);
      }}
      placeholder={placeholder}
      className={inputCls(name)}
    />
  );

  // ─── Progress Bar ────────────────────────────────────────────────────────
  const ProgressBar = () => (
    <div className="mb-6">
      <div className="flex justify-between mb-2">
        {STEPS.map((s, i) => (
          <div
            key={s.key}
            className={`flex flex-col items-center ${i <= stepIdx ? "text-emerald-600" : "text-stone-300"}`}
          >
            <div
              className={`w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center font-bold text-[10px] sm:text-xs border-2 transition-all
              ${
                i < stepIdx
                  ? "bg-emerald-600 border-emerald-600 text-white"
                  : i === stepIdx
                    ? "bg-emerald-50 border-emerald-600 text-emerald-600"
                    : "bg-stone-100 border-stone-200 text-stone-400"
              }`}
            >
              {i < stepIdx ? <Check size={12} /> : i + 1}
            </div>
            <span className="text-[8px] sm:text-[9px] font-semibold mt-0.5 hidden sm:block">
              {lang === "sw" ? s.sw : s.label}
            </span>
          </div>
        ))}
      </div>
      <div className="w-full bg-stone-200 h-2 rounded-full overflow-hidden">
        <ProgressFill
          progress={progress}
          className="bg-gradient-to-r from-emerald-500 to-teal-500 h-2 rounded-full transition-all duration-500"
        />
      </div>
      <div className="flex justify-between mt-1.5">
        <span className="text-xs text-stone-500 font-medium">
          {L(
            `Hatua ${stepIdx + 1} kati ya ${STEPS.length}`,
            `Step ${stepIdx + 1} of ${STEPS.length}`,
          )}
        </span>
        <span className="text-xs font-bold text-emerald-600">{Math.round(progress)}%</span>
      </div>
    </div>
  );

  // ─── Preview section helpers ─────────────────────────────────────────────
  const PSection = ({
    icon,
    title,
    stepKey,
    children: ch,
  }: {
    icon: React.ReactNode;
    title: string;
    stepKey: Step;
    children: React.ReactNode;
  }) => (
    <div className="bg-white border border-stone-100 rounded-xl overflow-hidden shadow-sm">
      <div className="bg-emerald-50 px-4 py-2.5 border-b border-emerald-100 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-emerald-600">{icon}</span>
          <h4 className="font-bold text-emerald-900 text-sm">{title}</h4>
        </div>
        <button
          type="button"
          onClick={() => setStep(stepKey)}
          className="flex items-center gap-1 text-xs text-emerald-600 hover:text-emerald-800 font-bold hover:bg-emerald-100 px-2 py-1 rounded-lg transition-colors"
        >
          <Edit2 size={11} /> {L("Hariri", "Edit")}
        </button>
      </div>
      <div className="p-4 grid grid-cols-2 gap-x-4 gap-y-2">{ch}</div>
    </div>
  );

  const PRow = ({ label, value }: { label: string; value: string | number | undefined }) => (
    <>
      <p className="text-xs text-stone-500">{label}</p>
      <p className="text-xs font-bold text-stone-800 text-right break-words">{value || "—"}</p>
    </>
  );

  // ─── Success Screen ──────────────────────────────────────────────────────
  if (submitted) {
    return (
      <div className="text-center space-y-6 py-4">
        <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mx-auto">
          <CheckCircle2 size={40} className="text-emerald-600" />
        </div>
        <div className="space-y-2">
          <h3 className="text-xl font-black text-stone-900">
            {L("Maombi Yamewasilishwa!", "Application Submitted!")}
          </h3>
          <p className="text-stone-500 text-sm">
            {L(
              "Maombi yako ya Barua ya Utambulisho yamewasilishwa kikamilifu.",
              "Your Introduction Letter application has been submitted successfully.",
            )}
          </p>
        </div>
        <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-5 text-left space-y-3 max-w-sm mx-auto">
          <p className="text-xs font-black text-emerald-700 uppercase tracking-wider">
            {L("Namba ya Maombi", "Application Reference")}
          </p>
          <p className="text-2xl font-black text-emerald-800 font-mono">{appRef}</p>
          <div className="space-y-2 pt-2 border-t border-emerald-200">
            {[
              [L("Huduma", "Service"), L("Barua ya Utambulisho", "Introduction Letter")],
              [
                L("Barua kwa Jina la", "Letter in Name of"),
                vals.application_type === "MINOR"
                  ? vals.minor_full_name
                  : vals.application_type === "BEHALF"
                    ? vals.behalf_full_name
                    : `${userProfile?.first_name || ""} ${userProfile?.last_name || ""}`.trim(),
              ],
              [L("Idadi ya Taasisi", "Institutions"), String(institutions.length)],
              [L("Ada ya Jumla", "Total Fee"), fmtFee(totalFee)],
              [
                L("Tarehe", "Date"),
                new Date().toLocaleDateString(lang === "sw" ? "sw-TZ" : "en-US"),
              ],
              [L("Hali", "Status"), L("Inasubiri Ukaguzi", "Pending Review")],
            ].map(([l, v]) => (
              <div key={String(l)} className="flex justify-between text-sm">
                <span className="text-stone-500">{l}</span>
                <span className="font-bold text-stone-800">{v}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 text-left max-w-sm mx-auto">
          <p className="text-xs font-bold text-blue-700 mb-2">
            {L("Hatua Zinazofuata", "What Happens Next")}
          </p>
          <ul className="space-y-1.5">
            {[
              L(
                "Ofisi ya Serikali ya Mtaa itakagua maombi yako",
                "The Local Government office will review your application",
              ),
              L(
                `Barua ${institutions.length > 1 ? institutions.length + " " : ""}itatolewa ndani ya siku 1–3 za kazi`,
                `Letter${institutions.length > 1 ? "s" : ""} will be issued within 1–3 working days`,
              ),
              L(
                `Lipa ada ya ${fmtFee(totalFee)} unapokuja kuchukua barua`,
                `Pay ${fmtFee(totalFee)} when collecting the letter`,
              ),
              L(
                "Lete namba yako ya maombi na kitambulisho chochote",
                "Bring your reference number and any ID",
              ),
            ].map((item, i) => (
              <li key={i} className="flex items-start gap-2 text-xs text-blue-700">
                <span className="w-4 h-4 rounded-full bg-blue-200 flex items-center justify-center font-bold text-[10px] shrink-0 mt-0.5">
                  {i + 1}
                </span>
                {item}
              </li>
            ))}
          </ul>
        </div>
      </div>
    );
  }

  // ─── Step Renderers ──────────────────────────────────────────────────────
  const renderStep = () => {
    switch (step) {
      // ══════════════════════════════════════════════════════════════════════
      // STEP 1 — MUOMBAJI (Applicant)
      // ══════════════════════════════════════════════════════════════════════
      case "applicant":
        return (
          <div className="space-y-5">
            <div className={secHdr}>
              <p className="font-bold text-emerald-800 text-sm flex items-center gap-2">
                <User size={16} /> {L("TAARIFA ZA MUOMBAJI", "APPLICANT INFORMATION")}
              </p>
              <p className="text-xs text-emerald-600 mt-0.5">
                {L(
                  "Barua hii inaombwa kwa ajili ya nani?",
                  "Who is this letter being applied for?",
                )}
              </p>
            </div>

            {/* ── Application type selector ── */}
            <Field name="application_type" label={L("Aina ya Maombi", "Application Type")} required>
              <div className="grid grid-cols-3 gap-2">
                {[
                  {
                    value: "SELF",
                    icon: "👤",
                    sw: "Mwenyewe",
                    en: "Self",
                    sw2: "Wewe mwenyewe",
                    en2: "For yourself",
                  },
                  {
                    value: "MINOR",
                    icon: "👶",
                    sw: "Mtoto/Mdogo",
                    en: "Minor",
                    sw2: "Mtoto wako (<18)",
                    en2: "Your child (<18)",
                  },
                  {
                    value: "BEHALF",
                    icon: "🤝",
                    sw: "Kwa Niaba",
                    en: "On Behalf",
                    sw2: "Msaada kwa mtu mwingine",
                    en2: "Helping another citizen",
                  },
                ].map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => {
                      set("application_type", opt.value);
                      clrErr("application_type");
                    }}
                    className={`py-3 px-2 rounded-xl border-2 text-center transition-all flex flex-col items-center gap-1 ${
                      vals.application_type === opt.value
                        ? "bg-emerald-50 border-emerald-500"
                        : "bg-white border-stone-200 hover:border-stone-300"
                    }`}
                  >
                    <span className="text-xl">{opt.icon}</span>
                    <span
                      className={`text-xs font-black ${vals.application_type === opt.value ? "text-emerald-700" : "text-stone-600"}`}
                    >
                      {lang === "sw" ? opt.sw : opt.en}
                    </span>
                    <span
                      className={`text-[9px] leading-tight ${vals.application_type === opt.value ? "text-emerald-600" : "text-stone-400"}`}
                    >
                      {lang === "sw" ? opt.sw2 : opt.en2}
                    </span>
                  </button>
                ))}
              </div>
            </Field>

            {/* ── SELF: show profile card ── */}
            {vals.application_type === "SELF" && (
              <>
                {userProfile ? (
                  <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <CheckCircle size={15} className="text-emerald-600" />
                      <span className="text-xs font-bold text-emerald-700 uppercase tracking-wide">
                        {L("Taarifa za Wasifu (Hazibadilishwi)", "Profile Details (Read-only)")}
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      {[
                        [
                          L("Jina Kamili", "Full Name"),
                          `${userProfile.first_name || ""} ${userProfile.middle_name || ""} ${userProfile.last_name || ""}`.trim(),
                        ],
                        ["NIDA", userProfile.nida_number || "—"],
                        [L("Simu", "Phone"), userProfile.phone || "—"],
                        ["Email", userProfile.email || "—"],
                        [L("Mkoa", "Region"), userProfile.region || "—"],
                        [
                          L("Wilaya/Kata", "District/Ward"),
                          `${userProfile.district || ""} / ${userProfile.ward || ""}`.replace(
                            /^ \/ $/,
                            "—",
                          ),
                        ],
                      ].map(([l, v]) => (
                        <div key={String(l)} className="bg-white rounded-lg px-3 py-2">
                          <p className="text-[9px] text-stone-400 uppercase tracking-wide">{l}</p>
                          <p className="text-xs font-bold text-stone-800 truncate">{v}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex gap-3">
                    <AlertCircle size={18} className="text-amber-600 shrink-0 mt-0.5" />
                    <p className="text-sm text-amber-700">
                      {L(
                        "Wasifu wako haukupatikana. Taarifa zako zitahitajika kujaza kwa mkono.",
                        "Your profile was not found. Your details will need to be entered manually.",
                      )}
                    </p>
                  </div>
                )}
              </>
            )}

            {/* ── MINOR: child details ── */}
            {vals.application_type === "MINOR" && (
              <div className="border border-blue-200 rounded-xl overflow-hidden">
                <div className="bg-blue-50 px-4 py-2.5 border-b border-blue-100 flex items-center gap-2">
                  <span className="text-base">👶</span>
                  <span className="text-xs font-bold text-blue-700 uppercase tracking-wide">
                    {L("TAARIFA ZA MTOTO / MDOGO", "MINOR'S DETAILS")}
                  </span>
                </div>
                <div className="p-4 space-y-4">
                  <div className="bg-blue-50 rounded-xl p-3 flex gap-2">
                    <Info size={13} className="text-blue-500 shrink-0 mt-0.5" />
                    <p className="text-xs text-blue-700">
                      {L(
                        "Wewe (mlezi/mzazi) ndiyo muombaji mkuu. Barua itatolewa kwa jina la mtoto.",
                        "You (guardian/parent) are the main applicant. The letter will be issued in the child's name.",
                      )}
                    </p>
                  </div>

                  <Field
                    name="minor_full_name"
                    label={L("Jina Kamili la Mtoto", "Child's Full Name")}
                    required
                  >
                    <TI
                      name="minor_full_name"
                      value={vals.minor_full_name}
                      onChange={(v) => {
                        set("minor_full_name", v);
                        clrErr("minor_full_name");
                      }}
                      placeholder={L("Jina kamili la mtoto", "Child's full name")}
                    />
                  </Field>

                  <div className="grid grid-cols-2 gap-3">
                    <Field
                      name="minor_dob"
                      label={L("Tarehe ya Kuzaliwa", "Date of Birth")}
                      required
                    >
                      <TI
                        name="minor_dob"
                        value={vals.minor_dob}
                        type="date"
                        onChange={(v) => {
                          set("minor_dob", v);
                          clrErr("minor_dob");
                        }}
                      />
                    </Field>
                    <Field
                      name="minor_nida"
                      label={L("NIDA ya Mtoto (Hiari)", "Child's NIDA (Optional)")}
                    >
                      <TI
                        name="minor_nida"
                        value={vals.minor_nida}
                        onChange={(v) => set("minor_nida", v)}
                        placeholder={L("Kama ana", "If available")}
                      />
                    </Field>
                  </div>

                  <Field
                    name="minor_relationship"
                    label={L("Uhusiano Wako na Mtoto", "Your Relationship to the Child")}
                    required
                    hint={L(
                      "Mfano: Baba, Mama, Mlezi, Ndugu",
                      "E.g. Father, Mother, Guardian, Sibling",
                    )}
                  >
                    <TI
                      name="minor_relationship"
                      value={vals.minor_relationship}
                      onChange={(v) => {
                        set("minor_relationship", v);
                        clrErr("minor_relationship");
                      }}
                      placeholder={L(
                        "Mfano: Baba / Mama / Mlezi",
                        "E.g. Father / Mother / Guardian",
                      )}
                    />
                  </Field>

                  {/* Applicant's own profile reminder */}
                  {userProfile && (
                    <div className="bg-stone-50 border border-stone-100 rounded-xl p-3">
                      <p className="text-[10px] font-bold text-stone-400 uppercase tracking-wider mb-1">
                        {L("Mlezi / Mzazi (Wewe)", "Guardian / Parent (You)")}
                      </p>
                      <p className="text-xs font-bold text-stone-700">
                        {`${userProfile.first_name || ""} ${userProfile.last_name || ""}`.trim()} ·{" "}
                        {userProfile.phone || "—"}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* ── ON BEHALF: other citizen's details ── */}
            {vals.application_type === "BEHALF" && (
              <div className="border border-amber-200 rounded-xl overflow-hidden">
                <div className="bg-amber-50 px-4 py-2.5 border-b border-amber-100 flex items-center gap-2">
                  <span className="text-base">🤝</span>
                  <span className="text-xs font-bold text-amber-700 uppercase tracking-wide">
                    {L("TAARIFA ZA MTU UNAYEMSAIDIA", "DETAILS OF PERSON BEING HELPED")}
                  </span>
                </div>
                <div className="p-4 space-y-4">
                  <div className="bg-amber-50 rounded-xl p-3 flex gap-2">
                    <Info size={13} className="text-amber-500 shrink-0 mt-0.5" />
                    <p className="text-xs text-amber-700">
                      {L(
                        "Wewe unasaidia raia mwingine. Barua itatolewa kwa jina lake. Taarifa zako (msaidizi) zitaandikwa pia.",
                        "You are helping another citizen. The letter will be in their name. Your details (helper) will also be recorded.",
                      )}
                    </p>
                  </div>

                  <Field
                    name="behalf_full_name"
                    label={L("Jina Kamili la Mtu Unayemsaidia", "Full Name of Person Being Helped")}
                    required
                  >
                    <TI
                      name="behalf_full_name"
                      value={vals.behalf_full_name}
                      onChange={(v) => {
                        set("behalf_full_name", v);
                        clrErr("behalf_full_name");
                      }}
                      placeholder={L("Jina kamili", "Full name")}
                    />
                  </Field>

                  <div className="grid grid-cols-2 gap-3">
                    <Field
                      name="behalf_nida"
                      label={L("NIDA yake (Hiari)", "Their NIDA (Optional)")}
                    >
                      <TI
                        name="behalf_nida"
                        value={vals.behalf_nida}
                        onChange={(v) => set("behalf_nida", v)}
                        placeholder="XXXX-XXXX-XXXX"
                      />
                    </Field>
                    <Field
                      name="behalf_phone"
                      label={L("Simu yake", "Their Phone Number")}
                      required
                    >
                      <TI
                        name="behalf_phone"
                        value={vals.behalf_phone}
                        onChange={(v) => {
                          set("behalf_phone", v);
                          clrErr("behalf_phone");
                        }}
                        placeholder="+255 7XX XXX XXX"
                      />
                    </Field>
                  </div>

                  <Field
                    name="behalf_relationship"
                    label={L("Uhusiano Wako Naye", "Your Relationship to Them")}
                    required
                    hint={L(
                      "Mfano: Ndugu, Jirani, Rafiki, Wakili",
                      "E.g. Relative, Neighbour, Friend, Legal Representative",
                    )}
                  >
                    <TI
                      name="behalf_relationship"
                      value={vals.behalf_relationship}
                      onChange={(v) => {
                        set("behalf_relationship", v);
                        clrErr("behalf_relationship");
                      }}
                      placeholder={L(
                        "Mfano: Kaka / Jirani / Wakili",
                        "E.g. Brother / Neighbour / Legal Rep",
                      )}
                    />
                  </Field>

                  {/* Helper's own profile */}
                  {userProfile && (
                    <div className="bg-stone-50 border border-stone-100 rounded-xl p-3">
                      <p className="text-[10px] font-bold text-stone-400 uppercase tracking-wider mb-1">
                        {L("Msaidizi (Wewe)", "Helper (You)")}
                      </p>
                      <p className="text-xs font-bold text-stone-700">
                        {`${userProfile.first_name || ""} ${userProfile.last_name || ""}`.trim()} ·{" "}
                        {userProfile.phone || "—"}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* ── CT ID reference (all types) ── */}
            <div className="border border-stone-200 rounded-xl overflow-hidden">
              <div className="bg-stone-50 px-4 py-2.5 border-b border-stone-100 flex items-center gap-2">
                <CreditCard size={14} className="text-stone-600" />
                <span className="text-xs font-bold text-stone-700 uppercase tracking-wide">
                  {L(
                    "NAMBA YA UTAMBULISHO WA MKAZI (Hiari)",
                    "RESIDENT IDENTITY NUMBER (Optional)",
                  )}
                </span>
              </div>
              <div className="p-4 space-y-4">
                <Field
                  name="has_resident_id"
                  label={
                    vals.application_type === "MINOR"
                      ? L(
                          "Je, mtoto ana Utambulisho wa Mkazi (CT ID)?",
                          "Does the child have a Resident Identity (CT ID)?",
                        )
                      : vals.application_type === "BEHALF"
                        ? L(
                            "Je, mtu huyu ana Utambulisho wa Mkazi (CT ID)?",
                            "Does this person have a Resident Identity (CT ID)?",
                          )
                        : L(
                            "Je, una Utambulisho wa Mkazi (CT ID)?",
                            "Do you have a Resident Identity (CT ID)?",
                          )
                  }
                  hint={L(
                    'Kupata kutoka Huduma ya "Utambulisho wa Mkazi"',
                    'Obtained from the "Resident Identity" service',
                  )}
                >
                  <Sel
                    name="has_resident_id"
                    value={vals.has_resident_id}
                    onChange={(v) => {
                      set("has_resident_id", v);
                      if (v !== "YES") set("ct_id_reference", "");
                      clrErr("has_resident_id");
                    }}
                    options={[
                      { label: L("Ndiyo — Nina CT ID", "Yes — Has a CT ID"), value: "YES" },
                      {
                        label: L("Hapana — Hana CT ID", "No — Does not have a CT ID"),
                        value: "NO",
                      },
                      {
                        label: L(
                          "Inasubiri — Maombi yako njiani",
                          "Pending — Application in progress",
                        ),
                        value: "PENDING",
                      },
                    ]}
                  />
                </Field>

                {vals.has_resident_id === "YES" && (
                  <Field
                    name="ct_id_reference"
                    label={L("Namba ya CT ID", "CT ID Number")}
                    hint={L("Mfano: CT2026A00001", "E.g. CT2026A00001")}
                  >
                    <TI
                      name="ct_id_reference"
                      value={vals.ct_id_reference}
                      onChange={(v) => set("ct_id_reference", v.toUpperCase())}
                      placeholder="CT2026A00001"
                    />
                  </Field>
                )}

                {vals.has_resident_id === "NO" && (
                  <div className="bg-blue-50 border border-blue-100 rounded-xl p-3 flex gap-2">
                    <Info size={14} className="text-blue-500 shrink-0 mt-0.5" />
                    <p className="text-xs text-blue-700">
                      {L(
                        "Unaweza bado kuomba Barua ya Utambulisho. Hata hivyo, kupata Utambulisho wa Mkazi kwanza kutasaidia kupata barua haraka na kwa urahisi zaidi.",
                        "You can still apply. However, getting a Resident Identity first will make the process faster and easier.",
                      )}
                    </p>
                  </div>
                )}

                {vals.has_resident_id === "PENDING" && (
                  <div className="bg-amber-50 border border-amber-100 rounded-xl p-3 flex gap-2">
                    <AlertCircle size={14} className="text-amber-500 shrink-0 mt-0.5" />
                    <p className="text-xs text-amber-700">
                      {L(
                        "Maombi ya Utambulisho wa Mkazi yakikamilika, taarifa zitahuishwa kiotomatiki.",
                        "Once the Resident Identity application completes, details will be automatically updated.",
                      )}
                    </p>
                  </div>
                )}
              </div>
            </div>

            <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-3 flex gap-2">
              <Info size={14} className="text-emerald-600 shrink-0 mt-0.5" />
              <p className="text-xs text-emerald-700">
                {L(
                  "Barua ya Utambulisho ni barua rasmi inayotolewa na Serikali ya Mtaa inayokutambulisha kwa taasisi kama benki, shule, hospitali, na nyinginezo.",
                  "An Introduction Letter is an official letter issued by the Local Government introducing you to institutions such as banks, schools, hospitals, and others.",
                )}
              </p>
            </div>
          </div>
        );

      // ══════════════════════════════════════════════════════════════════════
      // STEP 2 — SABABU YA MAOMBI (Purpose)
      // ══════════════════════════════════════════════════════════════════════
      case "purpose":
        return (
          <div className="space-y-5">
            <div className={secHdr}>
              <p className="font-bold text-emerald-800 text-sm flex items-center gap-2">
                <Activity size={16} /> {L("SABABU YA MAOMBI", "PURPOSE OF APPLICATION")}
              </p>
              <p className="text-xs text-emerald-600 mt-0.5">
                {L("Barua hii inahitajika kwa ajili ya nini?", "What is this letter needed for?")}
              </p>
            </div>

            <Field name="purpose" label={L("Sababu ya Maombi", "Purpose of Application")} required>
              <Sel
                name="purpose"
                value={vals.purpose}
                onChange={(v) => {
                  set("purpose", v);
                  clrErr("purpose");
                }}
                options={PURPOSES}
                placeholder={L("Chagua sababu ya barua", "Select reason for the letter")}
              />
            </Field>

            {vals.purpose === "NYINGINEZO" && (
              <Field
                name="purpose_details"
                label={L("Eleza Sababu", "Describe the Purpose")}
                required
                hint={L("Eleza kwa undani sababu ya maombi yako", "Describe your reason in detail")}
              >
                <textarea
                  value={vals.purpose_details}
                  onChange={(e) => {
                    set("purpose_details", e.target.value);
                    clrErr("purpose_details");
                  }}
                  rows={3}
                  placeholder={L("Maelezo ya kina...", "Detailed description...")}
                  className={`${inputCls("purpose_details")} resize-none`}
                />
              </Field>
            )}

            {vals.purpose && vals.purpose !== "NYINGINEZO" && (
              <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-3">
                <p className="text-xs font-bold text-emerald-700 mb-1">
                  {L("Barua itaandikwa kwa ajili ya:", "Letter will be written for:")}
                </p>
                <p className="text-sm font-bold text-emerald-900">
                  {PURPOSES.find((p) => p.value === vals.purpose)?.label}
                </p>
              </div>
            )}

            <Field name="urgency" label={L("Kiwango cha Haraka", "Urgency Level")}>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { value: "NORMAL", sw: "Kawaida (Siku 1–3)", en: "Normal (1–3 days)" },
                  { value: "URGENT", sw: "Haraka (Siku moja)", en: "Urgent (Same day)" },
                ].map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => set("urgency", opt.value)}
                    className={`py-3 px-4 rounded-xl border-2 text-sm font-bold transition-all text-left ${
                      vals.urgency === opt.value
                        ? "bg-emerald-50 border-emerald-500 text-emerald-700"
                        : "bg-white border-stone-200 text-stone-600 hover:border-stone-300"
                    }`}
                  >
                    {lang === "sw" ? opt.sw : opt.en}
                  </button>
                ))}
              </div>
            </Field>

            {vals.urgency === "URGENT" && (
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 flex gap-2">
                <AlertCircle size={14} className="text-amber-500 shrink-0 mt-0.5" />
                <p className="text-xs text-amber-700">
                  {L(
                    "Maombi ya haraka yanaweza kuhitaji ada ya ziada ya TSh 2,000. Ofisi itakuarifu.",
                    "Urgent applications may require an additional TSh 2,000 fee. The office will inform you.",
                  )}
                </p>
              </div>
            )}
          </div>
        );

      // ══════════════════════════════════════════════════════════════════════
      // STEP 3 — TAASISI (Institutions)
      // ══════════════════════════════════════════════════════════════════════
      case "institutions":
        return (
          <div className="space-y-5">
            <div className={secHdr}>
              <p className="font-bold text-emerald-800 text-sm flex items-center gap-2">
                <Building2 size={16} /> {L("TAASISI ZA KUPATA BARUA", "RECIPIENT INSTITUTIONS")}
              </p>
              <p className="text-xs text-emerald-600 mt-0.5">
                {L(
                  "Barua itaandikwa kwa taasisi uliyoichagua hapa chini",
                  "The letter will be addressed to the institution(s) below",
                )}
              </p>
            </div>

            {/* Live fee display */}
            <div className="bg-white border border-emerald-200 rounded-xl p-4">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <p className="text-xs text-stone-500 font-medium">
                    {L("Ada ya sasa", "Current fee")} — {institutions.length}{" "}
                    {L(`taasisi`, `institution${institutions.length !== 1 ? "s" : ""}`)}:
                  </p>
                  <span className="text-2xl font-black text-emerald-600">{fmtFee(totalFee)}</span>
                </div>
                <div className="text-right text-xs text-stone-400 space-y-0.5">
                  <p
                    className={`px-2 py-0.5 rounded-full font-bold ${institutions.length === 1 ? "bg-emerald-100 text-emerald-700" : "text-stone-400"}`}
                  >
                    1 → {fmtFee(3000)}
                  </p>
                  <p
                    className={`px-2 py-0.5 rounded-full font-bold ${institutions.length >= 2 && institutions.length <= 4 ? "bg-emerald-100 text-emerald-700" : "text-stone-400"}`}
                  >
                    2–4 → {fmtFee(5000)}
                  </p>
                  <p
                    className={`px-2 py-0.5 rounded-full font-bold ${institutions.length >= 5 ? "bg-emerald-100 text-emerald-700" : "text-stone-400"}`}
                  >
                    5–10 → {fmtFee(10000)}
                  </p>
                </div>
              </div>
              {/* Tier progress bar */}
              <div className="flex gap-1 mt-1">
                {[
                  { label: "1", active: institutions.length === 1, fee: "3K" },
                  { label: "2", active: institutions.length === 2, tier: true },
                  { label: "3", active: institutions.length === 3, tier: true },
                  { label: "4", active: institutions.length === 4, tier: true },
                  { label: "5", active: institutions.length === 5, tier2: true },
                  { label: "6", active: institutions.length === 6, tier2: true },
                  { label: "7", active: institutions.length === 7, tier2: true },
                  { label: "8", active: institutions.length === 8, tier2: true },
                  { label: "9", active: institutions.length === 9, tier2: true },
                  { label: "10", active: institutions.length === 10, tier2: true },
                ].map((slot, i) => (
                  <div
                    key={i}
                    className={`flex-1 h-1.5 rounded-full transition-all ${
                      i < institutions.length
                        ? institutions.length <= 1
                          ? "bg-emerald-400"
                          : institutions.length <= 4
                            ? "bg-blue-400"
                            : "bg-purple-400"
                        : "bg-stone-200"
                    }`}
                  />
                ))}
              </div>
              <div className="flex justify-between text-[9px] text-stone-400 mt-1">
                <span>1</span>
                <span>2</span>
                <span>4</span>
                <span className="ml-1">5</span>
                <span>10</span>
              </div>
            </div>

            {/* Institution cards */}
            {institutions.map((inst, i) => (
              <div
                key={i}
                className={`border rounded-xl overflow-hidden ${i === 0 ? "border-emerald-200" : "border-stone-200"}`}
              >
                <div
                  className={`px-4 py-2.5 border-b flex items-center justify-between ${i === 0 ? "bg-emerald-50 border-emerald-100" : "bg-stone-50 border-stone-100"}`}
                >
                  <div className="flex items-center gap-2">
                    <Building2
                      size={14}
                      className={i === 0 ? "text-emerald-600" : "text-stone-500"}
                    />
                    <span
                      className={`text-xs font-bold uppercase tracking-wide ${i === 0 ? "text-emerald-700" : "text-stone-600"}`}
                    >
                      {i === 0
                        ? L("TAASISI YA KWANZA (MSINGI)", "PRIMARY INSTITUTION")
                        : `${L("TAASISI YA", "INSTITUTION")} ${i + 1}`}
                    </span>
                  </div>
                  {i > 0 && (
                    <button
                      type="button"
                      onClick={() => removeInst(i)}
                      className="p-1 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-full transition-colors"
                    >
                      <Trash2 size={13} />
                    </button>
                  )}
                </div>
                <div className="p-4 space-y-3">
                  <Field
                    name={`inst_name_${i}`}
                    label={L("Jina la Taasisi / Ofisi", "Institution / Office Name")}
                    required
                  >
                    <input
                      value={inst.name}
                      onChange={(e) => {
                        setInst(i, "name", e.target.value);
                        clrErr(`inst_name_${i}`);
                      }}
                      placeholder={L(
                        "Mfano: NMB Bank, Chuo Kikuu cha Dar es Salaam",
                        "E.g. NMB Bank, University of Dar es Salaam",
                      )}
                      className={inputCls(`inst_name_${i}`)}
                    />
                  </Field>
                  <div className="grid grid-cols-2 gap-3">
                    <Field
                      name={`inst_dept_${i}`}
                      label={L("Idara / Kitengo", "Department (Optional)")}
                    >
                      <input
                        value={inst.department}
                        onChange={(e) => setInst(i, "department", e.target.value)}
                        placeholder={L("Mfano: HR, Fedha", "E.g. HR, Finance")}
                        className={inputCls(`inst_dept_${i}`)}
                      />
                    </Field>
                    <Field
                      name={`inst_contact_${i}`}
                      label={L("Jina la Anayehusika", "Contact Person (Optional)")}
                    >
                      <input
                        value={inst.contact_person}
                        onChange={(e) => setInst(i, "contact_person", e.target.value)}
                        placeholder={L("Jina (si lazima)", "Name (optional)")}
                        className={inputCls(`inst_contact_${i}`)}
                      />
                    </Field>
                  </div>
                  <Field
                    name={`inst_addr_${i}`}
                    label={L("Anwani ya Taasisi", "Institution Address (Optional)")}
                  >
                    <input
                      value={inst.address}
                      onChange={(e) => setInst(i, "address", e.target.value)}
                      placeholder={L(
                        "Mfano: Dar es Salaam, Posta 12345",
                        "E.g. Dar es Salaam, P.O. Box 12345",
                      )}
                      className={inputCls(`inst_addr_${i}`)}
                    />
                  </Field>
                </div>
              </div>
            ))}

            {/* Add institution button */}
            {institutions.length < MAX_INSTITUTIONS && (
              <button
                type="button"
                onClick={addInst}
                className="w-full py-3 border-2 border-dashed border-emerald-300 text-emerald-600 rounded-xl text-sm font-bold hover:bg-emerald-50 transition-colors flex items-center justify-center gap-2"
              >
                <Plus size={15} />
                {institutions.length === 1
                  ? L(
                      `Ongeza Taasisi (Ada: ${fmtFee(5000)})`,
                      `Add Institution (Fee becomes ${fmtFee(5000)})`,
                    )
                  : institutions.length === 4
                    ? L(
                        `Ongeza Taasisi (Ada: ${fmtFee(10000)})`,
                        `Add Institution (Fee becomes ${fmtFee(10000)})`,
                      )
                    : L("Ongeza Taasisi Nyingine", "Add Another Institution")}
              </button>
            )}

            {institutions.length === MAX_INSTITUTIONS && (
              <p className="text-xs text-stone-400 text-center">
                {L(
                  `Upeo wa taasisi ${MAX_INSTITUTIONS} umefikiwa`,
                  `Maximum of ${MAX_INSTITUTIONS} institutions reached`,
                )}
              </p>
            )}

            {/* Fee breakdown */}
            <div className="bg-stone-50 border border-stone-100 rounded-xl p-3">
              <p className="text-xs font-bold text-stone-500 uppercase tracking-wider mb-2">
                {L("Jedwali la Ada", "Fee Schedule")}
              </p>
              <div className="space-y-1">
                {[
                  { range: "1", fee: 3000, active: institutions.length === 1 },
                  {
                    range: "2 – 4",
                    fee: 5000,
                    active: institutions.length >= 2 && institutions.length <= 4,
                  },
                  { range: "5 – 10", fee: 10000, active: institutions.length >= 5 },
                ].map((tier) => (
                  <div
                    key={tier.range}
                    className={`flex justify-between items-center text-xs px-2 py-1.5 rounded-lg transition-colors ${tier.active ? "bg-emerald-100 font-bold text-emerald-800" : "text-stone-500"}`}
                  >
                    <span>
                      {tier.active && "▶ "}
                      {L(
                        `Taasisi ${tier.range}`,
                        `Institution${tier.range === "1" ? "" : "s"} ${tier.range}`,
                      )}
                    </span>
                    <span className={tier.active ? "text-emerald-700 font-black" : "font-semibold"}>
                      {fmtFee(tier.fee)}
                    </span>
                  </div>
                ))}
              </div>
              <div className="flex justify-between text-sm border-t border-stone-200 pt-2 mt-2">
                <span className="font-bold text-stone-700">{L("UNALIPA SASA", "YOU PAY NOW")}</span>
                <span className="font-black text-emerald-600">{fmtFee(totalFee)}</span>
              </div>
            </div>
          </div>
        );

      // ══════════════════════════════════════════════════════════════════════
      // STEP 4 — NYARAKA (Documents — Optional)
      // ══════════════════════════════════════════════════════════════════════
      case "documents":
        return (
          <div className="space-y-5">
            <div className={secHdr}>
              <p className="font-bold text-emerald-800 text-sm flex items-center gap-2">
                <FileText size={16} />{" "}
                {L("NYARAKA ZA MSAADA (Hiari)", "SUPPORTING DOCUMENTS (Optional)")}
              </p>
              <p className="text-xs text-emerald-600 mt-0.5">
                {L(
                  "Pakia nyaraka zinazohusiana na sababu yako ya maombi",
                  "Upload documents related to your purpose",
                )}
              </p>
            </div>

            {/* Guidance by purpose */}
            {vals.purpose && (
              <div className="bg-blue-50 border border-blue-100 rounded-xl p-3">
                <p className="text-xs font-bold text-blue-700 mb-1.5">
                  {L("Nyaraka zinazopendekezwa kwa", "Suggested documents for")}{" "}
                  {PURPOSES.find((p) => p.value === vals.purpose)?.label?.split("(")[0]}:
                </p>
                <p className="text-xs text-blue-600">
                  {(
                    {
                      BENKI: L(
                        "Karatasi ya akaunti, namba ya akaunti iliyopo (hiari)",
                        "Account card, existing account number (optional)",
                      ),
                      AJIRA: L(
                        "CV/Resume, barua ya maombi ya kazi (hiari)",
                        "CV/Resume, job application letter (optional)",
                      ),
                      CHUO: L(
                        "Barua ya kukubaliwa, fomu ya maombi ya chuo (hiari)",
                        "Acceptance letter, college application form (optional)",
                      ),
                      AFYA: L(
                        "Kadi ya hospitali, cheti cha daktari (hiari)",
                        "Hospital card, doctor's note (optional)",
                      ),
                      LESENI_BIASHARA: L(
                        "Fomu ya usajili wa biashara (hiari)",
                        "Business registration form (optional)",
                      ),
                      LESENI_UDEREVA: L(
                        "Cheti cha mtihani wa udereva (hiari)",
                        "Driving test certificate (optional)",
                      ),
                      PASIPOTI: L(
                        "Fomu ya pasipoti iliyojazwa (hiari)",
                        "Filled passport form (optional)",
                      ),
                      MKOPO: L(
                        "Fomu ya mkopo, cheti cha mapato (hiari)",
                        "Loan form, income certificate (optional)",
                      ),
                      ARDHI: L(
                        "Hati ya ardhi au nyumba (hiari)",
                        "Land or property deed (optional)",
                      ),
                      SERIKALI: L(
                        "Fomu ya serikali inayohusika (hiari)",
                        "Relevant government form (optional)",
                      ),
                    } as Record<string, string>
                  )[vals.purpose] ||
                    L(
                      "Nyaraka yoyote inayohusiana na maombi yako (hiari)",
                      "Any documents related to your application (optional)",
                    )}
                </p>
              </div>
            )}

            {/* Upload area */}
            <div>
              <label className={lbl}>{L("Pakia Nyaraka", "Upload Documents")}</label>
              <div
                onClick={() => docRef.current?.click()}
                className={`border-2 border-dashed rounded-xl p-4 cursor-pointer transition-all text-center
                ${docs.length > 0 ? "border-emerald-400 bg-emerald-50" : "border-stone-300 hover:border-emerald-400 hover:bg-emerald-50/40"}`}
              >
                {docs.length > 0 ? (
                  <div className="space-y-2">
                    {docs.map((doc, i) => (
                      <div
                        key={i}
                        className="flex items-center gap-3 bg-white rounded-lg p-2 shadow-sm"
                      >
                        {doc.file.type.startsWith("image/") ? (
                          <img
                            src={doc.preview}
                            className="w-10 h-10 object-cover rounded-lg shrink-0"
                            alt=""
                          />
                        ) : (
                          <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center shrink-0">
                            <FileText size={18} className="text-red-600" />
                          </div>
                        )}
                        <div className="flex-1 min-w-0 text-left">
                          <p className="text-xs font-bold text-stone-700 truncate">
                            {doc.file.name}
                          </p>
                          <p className="text-xs text-stone-400">
                            {(doc.file.size / 1024).toFixed(0)} KB
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            removeDoc(i);
                          }}
                          className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-full shrink-0"
                        >
                          <X size={13} />
                        </button>
                      </div>
                    ))}
                    <p className="text-xs text-emerald-600 font-medium">
                      {L("Bonyeza kuongeza nyaraka zaidi", "Click to add more documents")}
                    </p>
                  </div>
                ) : (
                  <div className="py-4">
                    <Upload size={24} className="mx-auto text-stone-400 mb-2" />
                    <p className="text-sm font-semibold text-stone-600">
                      {L("Bonyeza kupakia", "Click to upload")}
                    </p>
                    <p className="text-xs text-stone-400 mt-1">
                      JPG, PNG, PDF · {L("Max 10MB kila moja", "Max 10MB each")}
                    </p>
                  </div>
                )}
              </div>
              <input
                ref={docRef}
                type="file"
                multiple
                accept="image/jpeg,image/png,image/webp,application/pdf"
                onChange={(e) => {
                  const files = Array.from(e.target.files || []);
                  let lastErr = "";
                  files.forEach((f) => {
                    const er = addDoc(f);
                    if (er) lastErr = er;
                  });
                  if (lastErr) setDocErr(lastErr);
                  else setDocErr("");
                  e.target.value = "";
                }}
                className="hidden"
              />
              {docErr && (
                <p className="text-red-500 text-xs mt-1 flex items-center gap-1">
                  <AlertCircle size={11} />
                  {docErr}
                </p>
              )}
            </div>

            <div className="bg-blue-50 border border-blue-100 rounded-xl p-3 flex gap-2">
              <Shield size={14} className="text-blue-500 shrink-0 mt-0.5" />
              <p className="text-xs text-blue-700">
                {L(
                  "Nyaraka za msaada si lazima. Zinaweza kusaidia kupunguza muda wa ukaguzi.",
                  "Supporting documents are not required. They may help reduce review time.",
                )}
              </p>
            </div>
          </div>
        );

      // ══════════════════════════════════════════════════════════════════════
      // STEP 5 — HAKIKI NA WASILISHA (Preview & Submit)
      // ══════════════════════════════════════════════════════════════════════
      case "preview":
        return (
          <div className="space-y-4">
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex gap-3">
              <Eye size={18} className="text-amber-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold text-amber-800 text-sm">
                  {L(
                    "Hakiki Maombi Yako Kabla ya Kuwasilisha",
                    "Review Your Application Before Submitting",
                  )}
                </p>
                <p className="text-xs text-amber-700 mt-0.5">
                  {L(
                    'Angalia kwa makini. Bonyeza "Hariri" kubadilisha sehemu yoyote.',
                    'Check carefully. Click "Edit" to change any section.',
                  )}
                </p>
              </div>
            </div>

            {/* Applicant */}
            <PSection
              icon={<User size={14} />}
              title={L("Muombaji", "Applicant")}
              stepKey="applicant"
            >
              <PRow
                label={L("Aina ya Maombi", "Application Type")}
                value={
                  vals.application_type === "SELF"
                    ? L("Mwenyewe", "Self")
                    : vals.application_type === "MINOR"
                      ? L("Mtoto/Mdogo", "Minor")
                      : L("Kwa Niaba", "On Behalf")
                }
              />
              <PRow
                label={L("Muombaji (Wewe)", "Applicant (You)")}
                value={`${userProfile?.first_name || ""} ${userProfile?.last_name || ""}`.trim()}
              />
              <PRow label={L("Simu", "Phone")} value={userProfile?.phone} />
              <PRow label="NIDA" value={userProfile?.nida_number} />
              <PRow
                label={L("Mkoa / Wilaya", "Region / District")}
                value={`${userProfile?.region || ""} / ${userProfile?.district || ""}`.replace(
                  /^ \/ $/,
                  "—",
                )}
              />
              <PRow
                label="CT ID"
                value={
                  vals.ct_id_reference ||
                  (vals.has_resident_id === "NO"
                    ? L("Hana", "None")
                    : vals.has_resident_id === "PENDING"
                      ? L("Inasubiri", "Pending")
                      : "—")
                }
              />
              {vals.application_type === "MINOR" && (
                <>
                  <p className="col-span-2 text-[10px] font-black text-stone-400 uppercase tracking-widest pt-1">
                    {L("MTOTO / MDOGO", "MINOR")}
                  </p>
                  <PRow label={L("Jina la Mtoto", "Child's Name")} value={vals.minor_full_name} />
                  <PRow label={L("Tarehe ya Kuzaliwa", "Date of Birth")} value={vals.minor_dob} />
                  <PRow label={L("Uhusiano", "Relationship")} value={vals.minor_relationship} />
                  {vals.minor_nida && (
                    <PRow label={L("NIDA ya Mtoto", "Child's NIDA")} value={vals.minor_nida} />
                  )}
                </>
              )}
              {vals.application_type === "BEHALF" && (
                <>
                  <p className="col-span-2 text-[10px] font-black text-stone-400 uppercase tracking-widest pt-1">
                    {L("MTU ANAYESAIDIWA", "PERSON BEING HELPED")}
                  </p>
                  <PRow label={L("Jina", "Name")} value={vals.behalf_full_name} />
                  <PRow label={L("Simu", "Phone")} value={vals.behalf_phone} />
                  {vals.behalf_nida && <PRow label="NIDA" value={vals.behalf_nida} />}
                  <PRow label={L("Uhusiano", "Relationship")} value={vals.behalf_relationship} />
                </>
              )}
            </PSection>

            {/* Purpose */}
            <PSection
              icon={<Activity size={14} />}
              title={L("Sababu ya Maombi", "Purpose")}
              stepKey="purpose"
            >
              <PRow
                label={L("Sababu", "Purpose")}
                value={PURPOSES.find((p) => p.value === vals.purpose)?.label}
              />
              {vals.purpose === "NYINGINEZO" && vals.purpose_details && (
                <PRow label={L("Maelezo", "Details")} value={vals.purpose_details} />
              )}
              <PRow
                label={L("Kiwango cha Haraka", "Urgency")}
                value={vals.urgency === "URGENT" ? L("Haraka", "Urgent") : L("Kawaida", "Normal")}
              />
            </PSection>

            {/* Institutions */}
            <PSection
              icon={<Building2 size={14} />}
              title={L("Taasisi", "Institutions")}
              stepKey="institutions"
            >
              {institutions.map((inst, i) => (
                <React.Fragment key={i}>
                  <p className="col-span-2 text-[10px] font-black text-stone-400 uppercase tracking-widest pt-1">
                    {i === 0
                      ? L("TAASISI YA KWANZA", "PRIMARY")
                      : `${L("TAASISI", "INSTITUTION")} ${i + 1}`}
                  </p>
                  <PRow label={L("Jina", "Name")} value={inst.name} />
                  {inst.department && <PRow label={L("Idara", "Dept")} value={inst.department} />}
                  {inst.contact_person && (
                    <PRow label={L("Anayehusika", "Contact")} value={inst.contact_person} />
                  )}
                  {inst.address && <PRow label={L("Anwani", "Address")} value={inst.address} />}
                </React.Fragment>
              ))}
            </PSection>

            {/* Documents */}
            {docs.length > 0 && (
              <PSection
                icon={<FileText size={14} />}
                title={L("Nyaraka Zilizopakiwa", "Uploaded Documents")}
                stepKey="documents"
              >
                {docs.map((d, i) => (
                  <div
                    key={i}
                    className="col-span-2 flex items-center gap-3 py-1.5 border-b border-stone-50 last:border-0"
                  >
                    {d.file.type.startsWith("image/") ? (
                      <img
                        src={d.preview}
                        className="w-8 h-8 object-cover rounded-lg border border-stone-200 shrink-0"
                        alt=""
                      />
                    ) : (
                      <div className="w-8 h-8 bg-red-100 rounded-lg flex items-center justify-center shrink-0">
                        <FileText size={14} className="text-red-500" />
                      </div>
                    )}
                    <p className="text-xs font-bold text-stone-700 flex-1 truncate">
                      {d.file.name}
                    </p>
                    <CheckCircle size={13} className="text-emerald-500 shrink-0" />
                  </div>
                ))}
              </PSection>
            )}

            {/* Fee summary */}
            <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4">
              <div className="flex justify-between items-center mb-2">
                <span className="font-bold text-emerald-800 text-sm">
                  {L("Ada ya Jumla:", "Total Fee:")}
                </span>
                <span className="text-2xl font-black text-emerald-600">{fmtFee(totalFee)}</span>
              </div>
              <p className="text-xs text-emerald-700">
                {institutions.length === 1
                  ? L("Taasisi 1 — kiwango cha chini", "1 institution — minimum tier")
                  : institutions.length <= 4
                    ? L(
                        `Taasisi ${institutions.length} — kiwango cha kati (2–4)`,
                        `${institutions.length} institutions — mid tier (2–4)`,
                      )
                    : L(
                        `Taasisi ${institutions.length} — kiwango cha juu (5–10)`,
                        `${institutions.length} institutions — top tier (5–10)`,
                      )}
              </p>
            </div>

            {/* Consent */}
            <div className="space-y-3">
              <p className="text-xs font-black text-stone-600 uppercase tracking-wider">
                {L("IDHINI NA UTHIBITISHO", "CONSENT & CONFIRMATION")}
              </p>
              {[
                {
                  key: "terms_accepted" as const,
                  sw: "Nathibitisha kwamba taarifa zote nilizotoa katika fomu hii ni za kweli, sahihi na kamili.",
                  en: "I confirm that all information I have provided in this form is true, accurate and complete.",
                },
                {
                  key: "data_confirmed" as const,
                  sw: "Ninakubali kutoa taarifa hizi kwa Serikali ya Mtaa kwa madhumuni ya utambulisho pekee.",
                  en: "I consent to provide this information to the Local Government for identification purposes only.",
                },
              ].map((item) => (
                <label
                  key={item.key}
                  className={`flex items-start gap-3 cursor-pointer rounded-xl p-3 border transition-colors
                  ${vals[item.key] ? "bg-emerald-50 border-emerald-300" : "bg-stone-50 border-stone-200 hover:bg-emerald-50/50"}`}
                >
                  <input
                    type="checkbox"
                    checked={vals[item.key]}
                    onChange={(e) => {
                      set(item.key, e.target.checked);
                      clrErr(item.key);
                    }}
                    className="w-4 h-4 mt-0.5 text-emerald-600 rounded shrink-0"
                  />
                  <span className="text-xs text-stone-700 font-medium leading-relaxed">
                    {lang === "sw" ? item.sw : item.en}
                  </span>
                </label>
              ))}
              {(errors.terms_accepted || errors.data_confirmed) && (
                <p className="text-red-500 text-xs flex items-center gap-1">
                  <AlertCircle size={11} /> {errors.terms_accepted || errors.data_confirmed}
                </p>
              )}
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  // ─── Main render ──────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      {!submitted && <ProgressBar />}
      <div className="min-h-[280px]">{renderStep()}</div>

      {!submitted && (
        <div className="flex gap-3 pt-4 border-t border-stone-100">
          {stepIdx > 0 && (
            <button
              type="button"
              onClick={goPrev}
              className="flex-1 py-3.5 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-xl font-bold transition-all flex items-center justify-center gap-2 text-sm"
            >
              <ArrowLeft size={17} /> {L("Nyuma", "Previous")}
            </button>
          )}
          {step !== "preview" ? (
            <button
              type="button"
              onClick={goNext}
              className="flex-1 py-3.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white rounded-xl font-bold shadow-lg transition-all flex items-center justify-center gap-2 text-sm"
            >
              {step === "documents" ? (
                <>
                  <Eye size={17} /> {L("Hakiki Maombi", "Preview Application")}
                </>
              ) : (
                <>
                  {L("Endelea", "Continue")} <ArrowRight size={17} />
                </>
              )}
            </button>
          ) : (
            <button
              type="button"
              onClick={handleSubmit}
              disabled={submitting || isLoading}
              className="flex-1 py-3.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white rounded-xl font-bold shadow-lg transition-all flex items-center justify-center gap-2 text-sm disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {submitting || isLoading ? (
                <>
                  <Loader2 size={17} className="animate-spin" />{" "}
                  {L("Inawasilisha...", "Submitting...")}
                </>
              ) : (
                <>
                  <FileCheck size={17} /> {L("Thibitisha na Wasilisha", "Confirm & Submit")}
                </>
              )}
            </button>
          )}
        </div>
      )}
    </div>
  );
};

export default BaruaUtambulishoForm;
