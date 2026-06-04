/**
 * Malipo na Michango — Payments & Contributions Form
 *
 * Citizens pay fines, sanitation fees, community contributions, and
 * other municipal payments through this single service.
 *
 * 4 payment categories:
 *   - Faini (Fines) — must enter reference of issued fine
 *   - Usafi (Sanitation fee) — monthly or one-off community cleaning fee
 *   - Michango (Community contributions) — local development projects
 *   - Malipo Mengine (Other municipal fees) — free text + amount
 *
 * Fee: zero (no service fee — the amount the citizen pays IS the deliverable)
 * Color: Green (money/payment)
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
  AlertCircle,
  Info,
  Upload,
  X,
  Edit2,
  FileText,
  Check,
  DollarSign,
  HandCoins,
  Trash2,
  HeartHandshake,
  ReceiptText,
  User,
  Calendar,
} from "lucide-react";
import { SignaturePad } from "@/components/ui/SignaturePad";
import { FormProps, labels } from "./types";
import { ProgressFill } from "../ui/ProgressFill";

// ─── Constants ───────────────────────────────────────────────────────────────

const PAYMENT_CATEGORIES = [
  {
    value: "FAINI",
    icon: ReceiptText,
    sw: "Faini",
    en: "Fine Payment",
    descSw: "Lipa faini iliyotolewa na ofisi ya serikali ya mtaa",
    descEn: "Pay a fine issued by the local government office",
    color: "from-red-500 to-orange-600",
    bg: "bg-red-50",
    border: "border-red-300",
    text: "text-red-700",
  },
  {
    value: "USAFI",
    icon: Trash2,
    sw: "Ada ya Usafi",
    en: "Sanitation Fee",
    descSw: "Mchango wa kila mwezi wa usafi wa mazingira ya mtaa",
    descEn: "Monthly community sanitation and waste management fee",
    color: "from-emerald-500 to-teal-600",
    bg: "bg-emerald-50",
    border: "border-emerald-300",
    text: "text-emerald-700",
  },
  {
    value: "MICHANGO",
    icon: HeartHandshake,
    sw: "Mchango wa Maendeleo",
    en: "Development Contribution",
    descSw: "Mchango wa miradi ya maendeleo ya mtaa (shule, barabara, n.k.)",
    descEn: "Contribute to local development projects (schools, roads, etc.)",
    color: "from-blue-500 to-indigo-600",
    bg: "bg-blue-50",
    border: "border-blue-300",
    text: "text-blue-700",
  },
  {
    value: "NYINGINE",
    icon: HandCoins,
    sw: "Malipo Mengine",
    en: "Other Payment",
    descSw: "Malipo mengine kwa ofisi ya serikali ya mtaa",
    descEn: "Other payments to the local government office",
    color: "from-stone-500 to-stone-700",
    bg: "bg-stone-50",
    border: "border-stone-300",
    text: "text-stone-700",
  },
];

// Fine types (when category = FAINI)
const FINE_TYPES = [
  { label: "Faini ya Ujenzi Bila Kibari (No Construction Permit)", value: "UJENZI" },
  { label: "Faini ya Sherehe Bila Kibari (No Celebration Permit)", value: "SHEREHE" },
  { label: "Faini ya Uchafuzi (Pollution / Improper Waste Disposal)", value: "UCHAFUZI" },
  { label: "Faini ya Kelele (Noise Violation)", value: "KELELE" },
  { label: "Faini ya Biashara Bila Leseni (Unlicensed Business)", value: "BIASHARA" },
  { label: "Faini ya Ukiukaji wa Kanuni Nyingine (Other Bylaw Violation)", value: "NYINGINE" },
];

// Usafi periods
const USAFI_PERIODS = [
  { label: "Mwezi Mmoja (1 Month)", value: "1M" },
  { label: "Miezi 3 (3 Months)", value: "3M" },
  { label: "Miezi 6 (6 Months)", value: "6M" },
  { label: "Mwaka 1 (1 Year)", value: "12M" },
];

// Suggested USAFI monthly rates
const USAFI_RATES = {
  "1M": 3000,
  "3M": 9000,
  "6M": 18000,
  "12M": 36000,
};

// Michango categories
const MICHANGO_CATEGORIES = [
  { label: "Mradi wa Shule (School Project)", value: "SHULE" },
  { label: "Ujenzi wa Barabara / Daraja (Road / Bridge)", value: "BARABARA" },
  { label: "Maji Safi (Clean Water Project)", value: "MAJI" },
  { label: "Mradi wa Afya / Zahanati (Health / Dispensary)", value: "AFYA" },
  { label: "Ulinzi wa Mtaa (Community Security)", value: "ULINZI" },
  { label: "Tukio la Kijamii (Community Event)", value: "TUKIO" },
  { label: "Msaada wa Dharura (Emergency Relief)", value: "DHARURA" },
  { label: "Nyingine (Other)", value: "NYINGINE" },
];

const PAYMENT_METHODS = [
  { label: "M-Pesa", value: "MPESA", icon: "📱" },
  { label: "Tigo Pesa", value: "TIGOPESA", icon: "📱" },
  { label: "Airtel Money", value: "AIRTEL", icon: "📱" },
  { label: "Halopesa", value: "HALOPESA", icon: "📱" },
  { label: "CRDB Bank", value: "CRDB", icon: "🏦" },
  { label: "NMB Bank", value: "NMB", icon: "🏦" },
  { label: "Cash (Ofisini)", value: "CASH", icon: "💵" },
];

const ALLOWED_DOCS = ["image/jpeg", "image/png", "image/webp", "application/pdf"];
const MAX_DOC_SIZE = 5 * 1024 * 1024;

// ─── Types ────────────────────────────────────────────────────────────────────

type Step = "category" | "details" | "payment" | "preview";
type CategoryVal = "FAINI" | "USAFI" | "MICHANGO" | "NYINGINE";

interface UploadedDoc {
  file: File;
  preview: string;
}

interface FormValues {
  category: CategoryVal | "";
  // FAINI
  fine_type: string;
  fine_reference: string;
  fine_issued_date: string;
  // USAFI
  usafi_period: string;
  usafi_for_month: string;
  // MICHANGO
  michango_category: string;
  michango_purpose: string;
  // NYINGINE
  other_description: string;
  // All
  amount: string;
  payment_method: string;
  payer_phone: string;
  notes: string;
  // Consent
  terms_accepted: boolean;
}

// ─── Component ───────────────────────────────────────────────────────────────

export const MalipoMichangoForm: React.FC<FormProps> = ({
  onSubmit,
  isLoading,
  lang = "sw",
  userProfile,
}) => {
  const t = labels[lang];
  const L = (sw: string, en: string) => (lang === "sw" ? sw : en);

  const [step, setStep] = useState<Step>("category");
  const [submitted, setSubmitted] = useState(false);
  const [appRef, setAppRef] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [signature, setSignature] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const errorsRef = useRef(errors);
  errorsRef.current = errors;
  const [proofDoc, setProofDoc] = useState<UploadedDoc | null>(null);
  const proofRef = useRef<HTMLInputElement>(null);

  const [vals, setVals] = useState<FormValues>({
    category: "",
    fine_type: "",
    fine_reference: "",
    fine_issued_date: "",
    usafi_period: "",
    usafi_for_month: "",
    michango_category: "",
    michango_purpose: "",
    other_description: "",
    amount: "",
    payment_method: "",
    payer_phone: userProfile?.phone || "",
    notes: "",
    terms_accepted: false,
  });

  // ─── Auto-fill usafi amount when period changes ─────────────────────────
  const setUsafiPeriod = (period: string) => {
    setVals((p) => ({
      ...p,
      usafi_period: period,
      amount:
        period && USAFI_RATES[period as keyof typeof USAFI_RATES]
          ? String(USAFI_RATES[period as keyof typeof USAFI_RATES])
          : p.amount,
    }));
  };

  // ─── Steps ───────────────────────────────────────────────────────────────
  const STEPS: { key: Step; label: string; sw: string }[] = [
    { key: "category", label: "Category", sw: "Aina" },
    { key: "details", label: "Details", sw: "Maelezo" },
    { key: "payment", label: "Payment", sw: "Malipo" },
    { key: "preview", label: "Preview", sw: "Hakiki" },
  ];
  const stepIdx = STEPS.findIndex((s) => s.key === step);
  const progress = ((stepIdx + 1) / STEPS.length) * 100;

  // ─── Helpers ────────────────────────────────────────────────────────────
  const set = (k: keyof FormValues, v: string | boolean) => setVals((p) => ({ ...p, [k]: v }));
  const clrErr = useCallback((k: string) => {
    setErrors((p) => {
      const n = { ...p };
      delete n[k];
      return n;
    });
  }, []);
  const err = useCallback((k: string) => errorsRef.current[k], []);

  const handleProofSelect = (file: File): string | null => {
    if (!ALLOWED_DOCS.includes(file.type))
      return L("Aina ya faili haikushukuliwa", "File type not allowed");
    if (file.size > MAX_DOC_SIZE)
      return L("Faili kubwa sana. Upeo ni 5MB", "File too large. Max 5MB");
    setProofDoc({ file, preview: URL.createObjectURL(file) });
    return null;
  };

  // ─── Validation ─────────────────────────────────────────────────────────
  const validate = (): boolean => {
    const e: Record<string, string> = {};
    if (step === "category") {
      if (!vals.category) e.category = L("Chagua aina ya malipo", "Select payment category");
    }
    if (step === "details") {
      if (vals.category === "FAINI") {
        if (!vals.fine_type) e.fine_type = L("Chagua aina ya faini", "Select fine type");
        if (!vals.fine_reference.trim())
          e.fine_reference = L(
            "Namba ya rejea ya faini inahitajika",
            "Fine reference number required",
          );
      }
      if (vals.category === "USAFI") {
        if (!vals.usafi_period) e.usafi_period = L("Chagua kipindi", "Select period");
        if (!vals.usafi_for_month)
          e.usafi_for_month = L("Chagua mwezi wa kuanza", "Select start month");
      }
      if (vals.category === "MICHANGO") {
        if (!vals.michango_category)
          e.michango_category = L("Chagua aina ya mchango", "Select contribution category");
      }
      if (vals.category === "NYINGINE") {
        if (!vals.other_description.trim() || vals.other_description.length < 10)
          e.other_description = L(
            "Eleza malipo (angalau herufi 10)",
            "Describe payment (min 10 chars)",
          );
      }
      if (!vals.amount.trim() || parseFloat(vals.amount) <= 0)
        e.amount = L("Kiasi cha malipo kinahitajika", "Payment amount required");
    }
    if (step === "payment") {
      if (!vals.payment_method)
        e.payment_method = L("Chagua njia ya malipo", "Select payment method");
      if (
        ["MPESA", "TIGOPESA", "AIRTEL", "HALOPESA"].includes(vals.payment_method) &&
        !vals.payer_phone.trim()
      )
        e.payer_phone = L("Simu inahitajika", "Phone required");
    }
    if (step === "preview") {
      if (!vals.terms_accepted) e.terms_accepted = L("Lazima uthibitishe", "Must confirm");
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
      const ref = `PY-${new Date().getFullYear()}-${Math.floor(Math.random() * 900000 + 100000)}`;
      const files = proofDoc ? [proofDoc.file] : [];
      await onSubmit(
        {
          ...vals,
          total_fee: parseFloat(vals.amount) || 0,
          service_name: "Malipo na Michango",
          application_reference: ref,
          applicant_signature: signature,
          document_count: proofDoc ? 1 : 0,
        },
        files,
      );
      setAppRef(ref);
      setSubmitted(true);
    } catch (e) {
      console.error("Submit error:", e);
    } finally {
      setSubmitting(false);
    }
  };

  // ─── Shared UI ───────────────────────────────────────────────────────────
  const inputCls = useCallback(
    (name: string) =>
      `w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all bg-white text-sm ${err(name) ? "border-red-400 bg-red-50" : "border-stone-200"}`,
    [err],
  );
  const lbl = "block text-xs font-bold text-stone-600 uppercase tracking-wider mb-1.5";

  const Field = useCallback(
    ({
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
    ),
    [err],
  );
  const Sel = useCallback(
    ({
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
    ),
    [inputCls, clrErr, t],
  );
  const TI = useCallback(
    ({
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
    ),
    [inputCls, clrErr],
  );

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
              ${i < stepIdx ? "bg-emerald-600 border-emerald-600 text-white" : i === stepIdx ? "bg-emerald-50 border-emerald-600 text-emerald-700" : "bg-stone-100 border-stone-200 text-stone-400"}`}
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

  const PSection = ({
    title,
    stepKey,
    children: ch,
  }: {
    title: string;
    stepKey: Step;
    children: React.ReactNode;
  }) => (
    <div className="bg-white border border-stone-100 rounded-xl overflow-hidden shadow-sm">
      <div className="bg-emerald-50 px-4 py-2.5 border-b border-emerald-100 flex items-center justify-between">
        <h4 className="font-bold text-emerald-900 text-sm">{title}</h4>
        <button
          type="button"
          onClick={() => setStep(stepKey)}
          className="flex items-center gap-1 text-xs text-emerald-700 hover:text-emerald-900 font-bold hover:bg-emerald-100 px-2 py-1 rounded-lg transition-colors"
        >
          <Edit2 size={11} /> {L("Hariri", "Edit")}
        </button>
      </div>
      <div className="p-4 grid grid-cols-2 gap-x-4 gap-y-2">{ch}</div>
    </div>
  );
  const PRow = ({ label, value }: { label: string; value: string | undefined }) => (
    <>
      <p className="text-xs text-stone-500">{label}</p>
      <p className="text-xs font-bold text-stone-800 text-right break-words">{value || "—"}</p>
    </>
  );

  // ─── Success screen ───────────────────────────────────────────────────────
  if (submitted) {
    const catMeta = PAYMENT_CATEGORIES.find((c) => c.value === vals.category);
    return (
      <div className="text-center space-y-6 py-4">
        <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mx-auto">
          <CheckCircle2 size={40} className="text-emerald-600" />
        </div>
        <div className="space-y-2">
          <h3 className="text-xl font-black text-stone-900">
            {L("Malipo Yamewasilishwa!", "Payment Submitted!")}
          </h3>
          <p className="text-stone-500 text-sm">
            {L(
              "Tutathibitisha malipo na kukutumia risiti rasmi.",
              "We will confirm the payment and send you an official receipt.",
            )}
          </p>
        </div>
        <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-5 text-left space-y-3 max-w-sm mx-auto">
          <p className="text-xs font-black text-emerald-700 uppercase tracking-wider">
            {L("Namba ya Rejea", "Payment Reference")}
          </p>
          <p className="text-2xl font-black text-emerald-800 font-mono">{appRef}</p>
          <div className="space-y-2 pt-2 border-t border-emerald-200">
            {[
              [L("Aina", "Type"), catMeta ? (lang === "sw" ? catMeta.sw : catMeta.en) : "—"],
              [L("Kiasi", "Amount"), `TSh ${parseFloat(vals.amount || "0").toLocaleString()}`],
              [
                L("Njia ya Malipo", "Method"),
                PAYMENT_METHODS.find((m) => m.value === vals.payment_method)?.label || "—",
              ],
              [
                L("Tarehe", "Date"),
                new Date().toLocaleDateString(lang === "sw" ? "sw-TZ" : "en-US"),
              ],
              [L("Hali", "Status"), L("Inasubiri Uthibitisho", "Pending Confirmation")],
            ].map(([l, v]) => (
              <div key={String(l)} className="flex justify-between text-sm">
                <span className="text-stone-500">{l}</span>
                <span className="font-bold text-stone-800 text-right">{v}</span>
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
              L("Ofisi itathibitisha malipo yako", "Office will verify your payment"),
              L(
                "Utapokea risiti rasmi kwa email/SMS",
                "You will receive an official receipt by email/SMS",
              ),
              vals.category === "FAINI"
                ? L(
                    "Faini yako itafutwa kutoka kwenye rekodi",
                    "The fine will be cleared from your record",
                  )
                : L(
                    "Malipo yako yatarekodi kwenye historia ya akaunti",
                    "The payment will be recorded in your account history",
                  ),
              L(
                "Tunzia namba ya rejea kwa marejeleo",
                "Keep this reference number for future reference",
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

  // ─── Steps ───────────────────────────────────────────────────────────────
  const renderStep = () => {
    switch (step) {
      // ──────────────── STEP 1 — CATEGORY ────────────────
      case "category":
        return (
          <div className="space-y-5">
            <div className="bg-gradient-to-r from-emerald-50 to-teal-50 px-4 py-3 rounded-xl border-l-4 border-emerald-500">
              <p className="font-bold text-emerald-800 text-sm flex items-center gap-2">
                <DollarSign size={16} /> {L("CHAGUA AINA YA MALIPO", "CHOOSE PAYMENT TYPE")}
              </p>
              <p className="text-xs text-emerald-600 mt-0.5">
                {L("Tunatoa njia mbalimbali za malipo", "Multiple payment categories available")}
              </p>
            </div>

            <div className="grid grid-cols-1 gap-3">
              {PAYMENT_CATEGORIES.map((c) => {
                const Icon = c.icon;
                const selected = vals.category === c.value;
                return (
                  <button
                    key={c.value}
                    type="button"
                    onClick={() => {
                      set("category", c.value);
                      clrErr("category");
                    }}
                    className={`p-4 rounded-xl border-2 text-left transition-all ${
                      selected
                        ? `${c.border} ${c.bg}`
                        : "border-stone-200 bg-white hover:border-stone-300"
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div
                        className={`w-10 h-10 rounded-xl bg-gradient-to-br ${c.color} flex items-center justify-center shrink-0`}
                      >
                        <Icon size={20} className="text-white" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className={`font-black ${selected ? c.text : "text-stone-800"}`}>
                          {lang === "sw" ? c.sw : c.en}
                        </h3>
                        <p className="text-xs text-stone-500 mt-0.5">
                          {lang === "sw" ? c.descSw : c.descEn}
                        </p>
                      </div>
                      {selected && <CheckCircle size={20} className={c.text} />}
                    </div>
                  </button>
                );
              })}
            </div>
            {err("category") && (
              <p className="text-red-500 text-xs flex items-center gap-1">
                <AlertCircle size={11} />
                {err("category")}
              </p>
            )}
          </div>
        );

      // ──────────────── STEP 2 — DETAILS (varies by category) ────────────────
      case "details":
        return (
          <div className="space-y-5">
            {/* Selected category banner */}
            {vals.category &&
              (() => {
                const cat = PAYMENT_CATEGORIES.find((c) => c.value === vals.category)!;
                const Icon = cat.icon;
                return (
                  <div
                    className={`${cat.bg} ${cat.border} border rounded-xl p-3 flex items-center gap-3`}
                  >
                    <Icon size={18} className={cat.text} />
                    <p className={`text-sm font-bold ${cat.text}`}>
                      {L("Aina:", "Type:")} {lang === "sw" ? cat.sw : cat.en}
                    </p>
                  </div>
                );
              })()}

            {/* FAINI fields */}
            {vals.category === "FAINI" && (
              <>
                <Field name="fine_type" label={L("Aina ya Faini", "Type of Fine")} required>
                  <Sel
                    name="fine_type"
                    value={vals.fine_type}
                    onChange={(v) => {
                      set("fine_type", v);
                      clrErr("fine_type");
                    }}
                    options={FINE_TYPES}
                  />
                </Field>
                <Field
                  name="fine_reference"
                  label={L("Namba ya Rejea ya Faini", "Fine Reference Number")}
                  required
                  hint={L(
                    "Mfano: FN-2026-XXXXXX (kutoka kwenye barua ya faini)",
                    "E.g. FN-2026-XXXXXX (from fine notice)",
                  )}
                >
                  <TI
                    name="fine_reference"
                    value={vals.fine_reference}
                    onChange={(v) => {
                      set("fine_reference", v.toUpperCase());
                      clrErr("fine_reference");
                    }}
                    placeholder="FN-2026-XXXXXX"
                  />
                </Field>
                <Field
                  name="fine_issued_date"
                  label={L("Tarehe Faini Ilipotolewa (Hiari)", "Date Fine Was Issued (Optional)")}
                >
                  <TI
                    name="fine_issued_date"
                    value={vals.fine_issued_date}
                    type="date"
                    onChange={(v) => set("fine_issued_date", v)}
                  />
                </Field>
              </>
            )}

            {/* USAFI fields */}
            {vals.category === "USAFI" && (
              <>
                <Field
                  name="usafi_period"
                  label={L("Kipindi cha Malipo", "Payment Period")}
                  required
                >
                  <Sel
                    name="usafi_period"
                    value={vals.usafi_period}
                    onChange={(v) => {
                      setUsafiPeriod(v);
                      clrErr("usafi_period");
                    }}
                    options={USAFI_PERIODS}
                  />
                </Field>
                <Field
                  name="usafi_for_month"
                  label={L("Kuanzia Mwezi Gani", "Starting From")}
                  required
                >
                  <TI
                    name="usafi_for_month"
                    value={vals.usafi_for_month}
                    type="month"
                    onChange={(v) => {
                      set("usafi_for_month", v);
                      clrErr("usafi_for_month");
                    }}
                  />
                </Field>
                {vals.usafi_period && (
                  <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-3 flex gap-2">
                    <Info size={14} className="text-emerald-500 shrink-0 mt-0.5" />
                    <p className="text-xs text-emerald-700">
                      {L(
                        `Kiasi kilichowekwa kiotomatiki: TSh ${USAFI_RATES[vals.usafi_period as keyof typeof USAFI_RATES]?.toLocaleString()}. Unaweza kubadilisha hapo chini.`,
                        `Auto-set amount: TSh ${USAFI_RATES[vals.usafi_period as keyof typeof USAFI_RATES]?.toLocaleString()}. You can change below.`,
                      )}
                    </p>
                  </div>
                )}
              </>
            )}

            {/* MICHANGO fields */}
            {vals.category === "MICHANGO" && (
              <>
                <Field
                  name="michango_category"
                  label={L("Aina ya Mchango", "Type of Contribution")}
                  required
                >
                  <Sel
                    name="michango_category"
                    value={vals.michango_category}
                    onChange={(v) => {
                      set("michango_category", v);
                      clrErr("michango_category");
                    }}
                    options={MICHANGO_CATEGORIES}
                  />
                </Field>
                <Field
                  name="michango_purpose"
                  label={L(
                    "Madhumuni / Mradi Maalum (Hiari)",
                    "Specific Purpose / Project (Optional)",
                  )}
                  hint={L(
                    "Mfano: Ukarabati wa shule ya msingi Sinza",
                    "E.g. Sinza primary school renovation",
                  )}
                >
                  <textarea
                    value={vals.michango_purpose}
                    onChange={(e) => set("michango_purpose", e.target.value)}
                    rows={2}
                    placeholder={L(
                      "Eleza mradi maalum unaopendelea",
                      "Describe the specific project you support",
                    )}
                    className={`${inputCls("michango_purpose")} resize-none`}
                  />
                </Field>
              </>
            )}

            {/* NYINGINE fields */}
            {vals.category === "NYINGINE" && (
              <Field
                name="other_description"
                label={L("Eleza Malipo", "Describe the Payment")}
                required
                hint={L("Angalau herufi 10", "At least 10 characters")}
              >
                <textarea
                  value={vals.other_description}
                  onChange={(e) => {
                    set("other_description", e.target.value);
                    clrErr("other_description");
                  }}
                  rows={3}
                  placeholder={L(
                    "Maelezo ya malipo unayofanya...",
                    "Description of what you are paying for...",
                  )}
                  className={`${inputCls("other_description")} resize-none`}
                />
              </Field>
            )}

            {/* Amount — always shown */}
            <Field name="amount" label={L("Kiasi (TSh)", "Amount (TSh)")} required>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-400 text-sm font-bold pointer-events-none">
                  TSh
                </span>
                <input
                  type="number"
                  value={vals.amount}
                  onChange={(e) => {
                    set("amount", e.target.value);
                    clrErr("amount");
                  }}
                  placeholder="10,000"
                  className={`${inputCls("amount")} pl-14`}
                />
              </div>
            </Field>

            {/* Optional proof upload */}
            <div>
              <label className={lbl}>
                {L("Pakia Uthibitisho (Hiari)", "Upload Proof (Optional)")}
              </label>
              <p className="text-xs text-stone-400 mb-2">
                {vals.category === "FAINI"
                  ? L("Mfano: Picha ya barua ya faini", "E.g. Photo of fine notice")
                  : L(
                      "Mfano: Nyaraka inayohusiana na malipo",
                      "E.g. Document related to the payment",
                    )}
              </p>
              <div
                onClick={() => proofRef.current?.click()}
                className={`border-2 border-dashed rounded-xl p-4 cursor-pointer transition-all text-center ${proofDoc ? "border-emerald-400 bg-emerald-50" : "border-stone-300 hover:border-emerald-400 hover:bg-emerald-50/40"}`}
              >
                {proofDoc ? (
                  <div className="flex items-center gap-3 bg-white rounded-lg p-2">
                    {proofDoc.file.type.startsWith("image/") ? (
                      <img
                        src={proofDoc.preview}
                        className="w-10 h-10 object-cover rounded-lg shrink-0"
                        alt=""
                      />
                    ) : (
                      <div className="w-10 h-10 bg-emerald-100 rounded-lg flex items-center justify-center shrink-0">
                        <FileText size={16} className="text-emerald-600" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0 text-left">
                      <p className="text-xs font-bold text-stone-700 truncate">
                        {proofDoc.file.name}
                      </p>
                      <p className="text-xs text-stone-400">
                        {(proofDoc.file.size / 1024).toFixed(0)} KB
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        URL.revokeObjectURL(proofDoc.preview);
                        setProofDoc(null);
                      }}
                      className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-full shrink-0"
                    >
                      <X size={13} />
                    </button>
                  </div>
                ) : (
                  <div className="py-3">
                    <Upload size={22} className="mx-auto text-stone-400 mb-2" />
                    <p className="text-sm font-semibold text-stone-600">
                      {L("Bonyeza kupakia", "Click to upload")}
                    </p>
                    <p className="text-xs text-stone-400 mt-1">JPG, PNG, PDF · Max 5MB</p>
                  </div>
                )}
              </div>
              <input
                ref={proofRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,application/pdf"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (!f) return;
                  const er = handleProofSelect(f);
                  if (er) console.warn(er);
                  e.target.value = "";
                }}
                className="hidden"
              />
            </div>
          </div>
        );

      // ──────────────── STEP 3 — PAYMENT METHOD ────────────────
      case "payment":
        return (
          <div className="space-y-5">
            <div className="bg-gradient-to-r from-emerald-50 to-teal-50 px-4 py-3 rounded-xl border-l-4 border-emerald-500">
              <p className="font-bold text-emerald-800 text-sm flex items-center gap-2">
                <DollarSign size={16} /> {L("NJIA YA MALIPO", "PAYMENT METHOD")}
              </p>
            </div>

            {/* Amount summary card */}
            <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 flex justify-between items-center">
              <span className="text-sm font-bold text-emerald-800">
                {L("Jumla Itakayolipwa:", "Total to Pay:")}
              </span>
              <span className="text-2xl font-black text-emerald-700">
                TSh {parseFloat(vals.amount || "0").toLocaleString()}
              </span>
            </div>

            <Field
              name="payment_method"
              label={L("Chagua Njia ya Malipo", "Choose Payment Method")}
              required
            >
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {PAYMENT_METHODS.map((m) => (
                  <button
                    key={m.value}
                    type="button"
                    onClick={() => {
                      set("payment_method", m.value);
                      clrErr("payment_method");
                    }}
                    className={`py-3 px-3 rounded-xl border-2 text-xs font-bold transition-all flex flex-col items-center gap-1 ${
                      vals.payment_method === m.value
                        ? "bg-emerald-50 border-emerald-500 text-emerald-700"
                        : "bg-white border-stone-200 text-stone-600 hover:border-stone-300"
                    }`}
                  >
                    <span className="text-lg">{m.icon}</span>
                    <span>{m.label}</span>
                  </button>
                ))}
              </div>
            </Field>

            {["MPESA", "TIGOPESA", "AIRTEL", "HALOPESA"].includes(vals.payment_method) && (
              <Field
                name="payer_phone"
                label={L("Namba ya Simu ya Malipo", "Payment Phone Number")}
                required
                hint={L("Namba utakayotumia kufanya malipo", "Number you will use to make payment")}
              >
                <TI
                  name="payer_phone"
                  value={vals.payer_phone}
                  onChange={(v) => {
                    set("payer_phone", v);
                    clrErr("payer_phone");
                  }}
                  placeholder="+255 7XX XXX XXX"
                />
              </Field>
            )}

            {vals.payment_method === "CASH" && (
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 flex gap-2">
                <Info size={14} className="text-amber-500 shrink-0 mt-0.5" />
                <p className="text-xs text-amber-700">
                  {L(
                    "Lazima ufike Ofisi ya Serikali ya Mtaa kati ya saa 8:00 asubuhi na saa 11:00 jioni kwa malipo ya cash. Lete namba ya rejea.",
                    "You must visit the Local Government Office between 8 AM and 5 PM to pay in cash. Bring your reference number.",
                  )}
                </p>
              </div>
            )}

            {["CRDB", "NMB"].includes(vals.payment_method) && (
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 flex gap-2">
                <Info size={14} className="text-blue-500 shrink-0 mt-0.5" />
                <p className="text-xs text-blue-700">
                  {L(
                    'Maelezo ya akaunti ya benki yatatumwa kwa SMS baada ya kuwasilisha. Tumia namba ya rejea kama "kumbukumbu".',
                    "Bank account details will be sent by SMS after submission. Use the reference number as the deposit reference.",
                  )}
                </p>
              </div>
            )}

            <Field
              name="notes"
              label={L("Maelezo ya Ziada (Hiari)", "Additional Notes (Optional)")}
            >
              <textarea
                value={vals.notes}
                onChange={(e) => set("notes", e.target.value)}
                rows={2}
                placeholder={L("Taarifa yoyote ya ziada...", "Any extra information...")}
                className={`${inputCls("notes")} resize-none`}
              />
            </Field>
          </div>
        );

      // ──────────────── STEP 4 — PREVIEW ────────────────
      case "preview":
        return (
          <div className="space-y-4">
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex gap-3">
              <Eye size={18} className="text-amber-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold text-amber-800 text-sm">
                  {L("Hakiki Kabla ya Kuwasilisha", "Review Before Submitting")}
                </p>
                <p className="text-xs text-amber-700 mt-0.5">
                  {L(
                    'Bonyeza "Hariri" kubadilisha sehemu yoyote',
                    'Click "Edit" to change any section',
                  )}
                </p>
              </div>
            </div>

            <PSection title={L("Malipaji", "Payer")} stepKey="category">
              <PRow
                label={L("Jina", "Name")}
                value={`${userProfile?.first_name || ""} ${userProfile?.last_name || ""}`.trim()}
              />
              <PRow label={L("Simu", "Phone")} value={userProfile?.phone} />
            </PSection>

            <PSection title={L("Aina ya Malipo", "Payment Type")} stepKey="category">
              <PRow
                label={L("Aina", "Type")}
                value={(() => {
                  const cat = PAYMENT_CATEGORIES.find((c) => c.value === vals.category);
                  return cat ? (lang === "sw" ? cat.sw : cat.en) : "—";
                })()}
              />
            </PSection>

            <PSection title={L("Maelezo", "Details")} stepKey="details">
              {vals.category === "FAINI" && (
                <>
                  <PRow
                    label={L("Aina ya Faini", "Fine Type")}
                    value={FINE_TYPES.find((f) => f.value === vals.fine_type)?.label}
                  />
                  <PRow label={L("Namba ya Rejea", "Fine Reference")} value={vals.fine_reference} />
                  {vals.fine_issued_date && (
                    <PRow
                      label={L("Tarehe Ilipotolewa", "Issued Date")}
                      value={vals.fine_issued_date}
                    />
                  )}
                </>
              )}
              {vals.category === "USAFI" && (
                <>
                  <PRow
                    label={L("Kipindi", "Period")}
                    value={USAFI_PERIODS.find((p) => p.value === vals.usafi_period)?.label}
                  />
                  <PRow label={L("Kuanzia", "Starting")} value={vals.usafi_for_month} />
                </>
              )}
              {vals.category === "MICHANGO" && (
                <>
                  <PRow
                    label={L("Aina ya Mchango", "Contribution Type")}
                    value={
                      MICHANGO_CATEGORIES.find((c) => c.value === vals.michango_category)?.label
                    }
                  />
                  {vals.michango_purpose && (
                    <>
                      <p className="col-span-2 text-xs text-stone-500">
                        {L("Madhumuni", "Purpose")}
                      </p>
                      <p className="col-span-2 text-xs font-bold text-stone-800">
                        {vals.michango_purpose}
                      </p>
                    </>
                  )}
                </>
              )}
              {vals.category === "NYINGINE" && (
                <>
                  <p className="col-span-2 text-xs text-stone-500">{L("Maelezo", "Description")}</p>
                  <p className="col-span-2 text-xs font-bold text-stone-800">
                    {vals.other_description}
                  </p>
                </>
              )}
              <PRow
                label={L("Kiasi", "Amount")}
                value={`TSh ${parseFloat(vals.amount || "0").toLocaleString()}`}
              />
            </PSection>

            <PSection title={L("Njia ya Malipo", "Payment Method")} stepKey="payment">
              <PRow
                label={L("Njia", "Method")}
                value={PAYMENT_METHODS.find((m) => m.value === vals.payment_method)?.label}
              />
              {vals.payer_phone && <PRow label={L("Simu", "Phone")} value={vals.payer_phone} />}
              {vals.notes && (
                <>
                  <p className="col-span-2 text-xs text-stone-500">{L("Maelezo", "Notes")}</p>
                  <p className="col-span-2 text-xs font-bold text-stone-800">{vals.notes}</p>
                </>
              )}
            </PSection>

            {proofDoc && (
              <PSection title={L("Uthibitisho", "Proof")} stepKey="details">
                <div className="col-span-2 flex items-center gap-3 py-1">
                  {proofDoc.file.type.startsWith("image/") ? (
                    <img
                      src={proofDoc.preview}
                      className="w-8 h-8 object-cover rounded-lg border border-stone-200 shrink-0"
                      alt=""
                    />
                  ) : (
                    <div className="w-8 h-8 bg-emerald-100 rounded-lg flex items-center justify-center shrink-0">
                      <FileText size={14} className="text-emerald-600" />
                    </div>
                  )}
                  <p className="text-xs font-bold text-stone-700 flex-1 truncate">
                    {proofDoc.file.name}
                  </p>
                  <CheckCircle size={13} className="text-emerald-500 shrink-0" />
                </div>
              </PSection>
            )}

            {/* Total */}
            <div className="bg-emerald-50 border-2 border-emerald-300 rounded-xl p-5 flex justify-between items-center">
              <div>
                <span className="font-bold text-emerald-800 text-base">
                  {L("JUMLA:", "TOTAL:")}
                </span>
                <p className="text-xs text-emerald-600 mt-0.5">
                  {L("Kiasi utakacholipa", "Amount you will pay")}
                </p>
              </div>
              <span className="text-3xl font-black text-emerald-700">
                TSh {parseFloat(vals.amount || "0").toLocaleString()}
              </span>
            </div>

            {/* Consent */}
            <label
              className={`flex items-start gap-3 cursor-pointer rounded-xl p-3 border transition-colors ${vals.terms_accepted ? "bg-emerald-50 border-emerald-300" : "bg-stone-50 border-stone-200 hover:bg-emerald-50/50"}`}
            >
              <input
                type="checkbox"
                checked={vals.terms_accepted}
                onChange={(e) => {
                  set("terms_accepted", e.target.checked);
                  clrErr("terms_accepted");
                }}
                className="w-4 h-4 mt-0.5 rounded shrink-0"
              />
              <span className="text-xs text-stone-700 font-medium leading-relaxed">
                {L(
                  "Nathibitisha kwamba taarifa hizi za malipo ni sahihi na ninakubaliana kufanya malipo kupitia njia niliyochagua.",
                  "I confirm these payment details are accurate and agree to pay through the selected method.",
                )}
              </span>
            </label>
            {err("terms_accepted") && (
              <p className="text-red-500 text-xs flex items-center gap-1">
                <AlertCircle size={11} />
                {err("terms_accepted")}
              </p>
            )}

            {/* Applicant electronic signature */}
            <div className="bg-white border border-stone-200 rounded-2xl p-4">
              <p className="text-sm font-bold text-stone-700 mb-1">
                {L("Saini ya Kielektroniki", "Electronic Signature")}
              </p>
              <p className="text-xs text-stone-400 mb-3">
                {L(
                  "Saini hapa chini kuthibitisha malipo haya.",
                  "Sign below to confirm this payment.",
                )}
              </p>
              <SignaturePad value={signature} onChange={setSignature} lang={lang} />
            </div>
          </div>
        );

      default:
        return null;
    }
  };

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
              {step === "payment" ? (
                <>
                  <Eye size={17} /> {L("Hakiki", "Preview")}
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
              className="flex-1 py-3.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white rounded-xl font-bold shadow-lg transition-all flex items-center justify-center gap-2 text-sm disabled:opacity-60"
            >
              {submitting || isLoading ? (
                <>
                  <Loader2 size={17} className="animate-spin" />{" "}
                  {L("Inawasilisha...", "Submitting...")}
                </>
              ) : (
                <>
                  <FileCheck size={17} /> {L("Thibitisha na Lipa", "Confirm & Pay")}
                </>
              )}
            </button>
          )}
        </div>
      )}
    </div>
  );
};

export default MalipoMichangoForm;
