/**
 * Kibari cha Mazishi — Burial Permit Form
 * Full rebuild: 5 steps, cause of death, family contacts,
 * document upload, edit-in-preview, consent, success screen
 *
 * Fee: TSh 2,000
 * Color theme: Stone (respectful of context)
 */
import React, { useState, useRef, useCallback, useMemo } from "react";
import {
  Loader2,
  CheckCircle,
  CheckCircle2,
  ArrowLeft,
  ArrowRight,
  Eye,
  FileCheck,
  Heart,
  Users,
  Calendar,
  MapPin,
  Phone,
  User,
  AlertCircle,
  Shield,
  Info,
  Upload,
  X,
  Edit2,
  FileText,
  Check,
  Clock,
  Home,
  BookOpen,
} from "lucide-react";
import { FormProps, labels } from "./types";
import { ProgressFill } from "../ui/ProgressFill";

// ─── Constants ───────────────────────────────────────────────────────────────

const SERVICE_FEE = 2000;

const CAUSE_OF_DEATH_OPTIONS = [
  { label: "Ugonjwa (Illness)", value: "UGONJWA" },
  { label: "Ajali (Accident)", value: "AJALI" },
  { label: "Uzee (Old Age)", value: "UZEE" },
  { label: "Kifo cha Mama Wakati wa Kujifungua (Maternal Death)", value: "MAMA_KUJIFUNGUA" },
  { label: "Kifo cha Mtoto Mchanga (Infant Death)", value: "MTOTO_MCHANGA" },
  { label: "Haijulikani (Unknown)", value: "HAIJULIKANI" },
  { label: "Nyingine (Other)", value: "NYINGINE" },
];

const BURIAL_TYPE_OPTIONS = [
  { label: "Kiislamu (Islamic)", value: "ISLAMIC" },
  { label: "Kikristo (Christian)", value: "CHRISTIAN" },
  { label: "Kimila / Kijadi (Traditional / Cultural)", value: "TRADITIONAL" },
  { label: "Nyingine (Other)", value: "OTHER" },
];

const RELATIONSHIP_OPTIONS = [
  { label: "Mtoto (Son/Daughter)", value: "CHILD" },
  { label: "Mke / Mume (Spouse)", value: "SPOUSE" },
  { label: "Kaka / Dada (Sibling)", value: "SIBLING" },
  { label: "Baba / Mama (Parent)", value: "PARENT" },
  { label: "Jamaa wa Karibu (Close Relative)", value: "RELATIVE" },
  { label: "Rafiki / Jirani (Friend / Neighbour)", value: "FRIEND" },
  { label: "Wakili (Legal Representative)", value: "LEGAL_REP" },
  { label: "Nyingine (Other)", value: "OTHER" },
];

const ALLOWED_DOCS = ["image/jpeg", "image/png", "image/webp", "application/pdf"];
const MAX_DOC_SIZE = 10 * 1024 * 1024; // 10MB

// ─── Types ────────────────────────────────────────────────────────────────────

type Step = "deceased" | "funeral" | "family" | "documents" | "preview";

interface UploadedDoc {
  file: File;
  preview: string;
  label: string;
}

interface FormValues {
  // Step 1 — Deceased
  deceased_full_name: string;
  deceased_nida: string;
  fathers_name: string;
  mothers_name: string;
  date_of_birth: string;
  date_of_death: string;
  place_of_death: string;
  cause_of_death: string;
  cause_details: string;
  surviving_spouse: string;
  // Step 2 — Funeral / Burial
  body_location: string;
  burial_type: string;
  funeral_date: string;
  funeral_time: string;
  service_location: string;
  burial_date: string;
  burial_time: string;
  burial_location: string;
  burial_district: string;
  // Step 3 — Family
  representative_name: string;
  representative_phone: string;
  representative_relationship: string;
  representative_nida: string;
  second_contact_name: string;
  second_contact_phone: string;
  children_names: string;
  // Step 5 — Consent
  terms_accepted: boolean;
  data_confirmed: boolean;
}

// ─── Component ───────────────────────────────────────────────────────────────

export const KibariMazishiForm: React.FC<FormProps> = ({
  onSubmit,
  isLoading,
  lang = "sw",
  userProfile,
}) => {
  const t = labels[lang];
  const L = useCallback((sw: string, en: string) => (lang === "sw" ? sw : en), [lang]);

  const [step, setStep] = useState<Step>("deceased");
  const [submitted, setSubmitted] = useState(false);
  const [appRef, setAppRef] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const errorsRef = useRef(errors);
  errorsRef.current = errors;
  const [docs, setDocs] = useState<UploadedDoc[]>([]);
  const docRef = useRef<HTMLInputElement>(null);
  const [docErr, setDocErr] = useState("");

  const today = new Date().toISOString().split("T")[0];

  const [vals, setVals] = useState<FormValues>({
    deceased_full_name: "",
    deceased_nida: "",
    fathers_name: "",
    mothers_name: "",
    date_of_birth: "",
    date_of_death: "",
    place_of_death: "",
    cause_of_death: "",
    cause_details: "",
    surviving_spouse: "",
    body_location: "",
    burial_type: "",
    funeral_date: "",
    funeral_time: "",
    service_location: "",
    burial_date: "",
    burial_time: "",
    burial_location: "",
    burial_district: "",
    representative_name: `${userProfile?.first_name || ""} ${userProfile?.last_name || ""}`.trim(),
    representative_phone: userProfile?.phone || "",
    representative_relationship: "",
    representative_nida: userProfile?.nida_number || "",
    second_contact_name: "",
    second_contact_phone: "",
    children_names: "",
    terms_accepted: false,
    data_confirmed: false,
  });

  // ─── Age auto-calculation ───────────────────────────────────────────────
  const calculatedAge = useMemo(() => {
    if (!vals.date_of_birth || !vals.date_of_death) return null;
    const dob = new Date(vals.date_of_birth);
    const dod = new Date(vals.date_of_death);
    let age = dod.getFullYear() - dob.getFullYear();
    const m = dod.getMonth() - dob.getMonth();
    if (m < 0 || (m === 0 && dod.getDate() < dob.getDate())) age--;
    return age >= 0 ? age : null;
  }, [vals.date_of_birth, vals.date_of_death]);

  // ─── Steps ───────────────────────────────────────────────────────────────
  const STEPS: { key: Step; label: string; sw: string }[] = [
    { key: "deceased", label: "Deceased", sw: "Marehemu" },
    { key: "funeral", label: "Funeral", sw: "Mazishi" },
    { key: "family", label: "Family", sw: "Familia" },
    { key: "documents", label: "Documents", sw: "Nyaraka" },
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
    [L],
  );

  const removeDoc = (i: number) =>
    setDocs((p) => {
      URL.revokeObjectURL(p[i].preview);
      return p.filter((_, idx) => idx !== i);
    });

  // ─── Validation ─────────────────────────────────────────────────────────
  const validate = (): boolean => {
    const e: Record<string, string> = {};

    if (step === "deceased") {
      if (!vals.deceased_full_name.trim())
        e.deceased_full_name = L("Jina la marehemu linahitajika", "Deceased name required");
      if (!vals.date_of_death)
        e.date_of_death = L("Tarehe ya kufariki inahitajika", "Date of death required");
      if (!vals.place_of_death.trim())
        e.place_of_death = L("Mahali pa kufariki panahitajika", "Place of death required");
      if (!vals.cause_of_death)
        e.cause_of_death = L("Sababu ya kifo inahitajika", "Cause of death required");
      if (vals.cause_of_death === "NYINGINE" && !vals.cause_details.trim())
        e.cause_details = L("Tafadhali eleza sababu", "Please describe the cause");
    }

    if (step === "funeral") {
      if (!vals.body_location.trim())
        e.body_location = L("Mahali ilipo maiti panahitajika", "Body location required");
      if (!vals.burial_type)
        e.burial_type = L("Aina ya mazishi inahitajika", "Burial type required");
      if (!vals.burial_date)
        e.burial_date = L("Tarehe ya kuzikwa inahitajika", "Burial date required");
      if (!vals.burial_time)
        e.burial_time = L("Muda wa kuzikwa unahitajika", "Burial time required");
      if (!vals.burial_location.trim())
        e.burial_location = L("Mahali pa kuzikwa panahitajika", "Burial location required");
    }

    if (step === "family") {
      if (!vals.representative_name.trim())
        e.representative_name = L(
          "Jina la mwakilishi linahitajika",
          "Representative name required",
        );
      if (!vals.representative_phone.trim())
        e.representative_phone = L(
          "Simu ya mwakilishi inahitajika",
          "Representative phone required",
        );
      if (!vals.representative_relationship)
        e.representative_relationship = L("Uhusiano unahitajika", "Relationship required");
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
      const ref = `BP-${new Date().getFullYear()}-${Math.floor(Math.random() * 900000 + 100000)}`;
      const files = docs.map((d) => d.file);
      await onSubmit(
        {
          ...vals,
          age_at_death: calculatedAge,
          total_fee: SERVICE_FEE,
          service_name: "Kibari cha Mazishi",
          application_reference: ref,
          document_count: docs.length,
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
      `w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-stone-500 focus:border-stone-500 outline-none transition-all bg-white text-sm ${
        err(name) ? "border-red-400 bg-red-50" : "border-stone-200"
      }`,
    [err],
  );
  const lbl = "block text-xs font-bold text-stone-600 uppercase tracking-wider mb-1.5";
  const secHdr =
    "bg-gradient-to-r from-stone-100 to-stone-50 px-4 py-3 rounded-xl border-l-4 border-stone-500 mb-4";

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

  // ─── Progress Bar ────────────────────────────────────────────────────────
  const ProgressBar = () => (
    <div className="mb-6">
      <div className="flex justify-between mb-2">
        {STEPS.map((s, i) => (
          <div
            key={s.key}
            className={`flex flex-col items-center ${i <= stepIdx ? "text-stone-700" : "text-stone-300"}`}
          >
            <div
              className={`w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center font-bold text-[10px] sm:text-xs border-2 transition-all
              ${
                i < stepIdx
                  ? "bg-stone-600 border-stone-600 text-white"
                  : i === stepIdx
                    ? "bg-stone-50 border-stone-600 text-stone-700"
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
          className="bg-gradient-to-r from-stone-500 to-stone-600 h-2 rounded-full transition-all duration-500"
        />
      </div>
      <div className="flex justify-between mt-1.5">
        <span className="text-xs text-stone-500 font-medium">
          {L(
            `Hatua ${stepIdx + 1} kati ya ${STEPS.length}`,
            `Step ${stepIdx + 1} of ${STEPS.length}`,
          )}
        </span>
        <span className="text-xs font-bold text-stone-600">{Math.round(progress)}%</span>
      </div>
    </div>
  );

  // ─── Preview helpers ─────────────────────────────────────────────────────
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
      <div className="bg-stone-50 px-4 py-2.5 border-b border-stone-100 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-stone-600">{icon}</span>
          <h4 className="font-bold text-stone-900 text-sm">{title}</h4>
        </div>
        <button
          type="button"
          onClick={() => setStep(stepKey)}
          className="flex items-center gap-1 text-xs text-stone-600 hover:text-stone-800 font-bold hover:bg-stone-100 px-2 py-1 rounded-lg transition-colors"
        >
          <Edit2 size={11} /> {L("Hariri", "Edit")}
        </button>
      </div>
      <div className="p-4 grid grid-cols-2 gap-x-4 gap-y-2">{ch}</div>
    </div>
  );

  const PRow = ({ label, value }: { label: string; value: string | number | undefined | null }) => (
    <>
      <p className="text-xs text-stone-500">{label}</p>
      <p className="text-xs font-bold text-stone-800 text-right break-words">{value ?? "—"}</p>
    </>
  );

  // ─── Success Screen ──────────────────────────────────────────────────────
  if (submitted) {
    return (
      <div className="text-center space-y-6 py-4">
        <div className="w-20 h-20 bg-stone-100 rounded-full flex items-center justify-center mx-auto">
          <CheckCircle2 size={40} className="text-stone-600" />
        </div>
        <div className="space-y-2">
          <h3 className="text-xl font-black text-stone-900">
            {L("Kibari Kimewasilishwa", "Permit Submitted")}
          </h3>
          <p className="text-stone-500 text-sm">
            {L(
              "Kibari cha Mazishi kimewasilishwa kwa Ofisi ya Serikali ya Mtaa.",
              "The Burial Permit has been submitted to the Local Government Office.",
            )}
          </p>
        </div>
        <div className="bg-stone-50 border border-stone-200 rounded-2xl p-5 text-left space-y-3 max-w-sm mx-auto">
          <p className="text-xs font-black text-stone-600 uppercase tracking-wider">
            {L("Namba ya Maombi", "Application Reference")}
          </p>
          <p className="text-2xl font-black text-stone-800 font-mono">{appRef}</p>
          <div className="space-y-2 pt-2 border-t border-stone-200">
            {[
              [L("Marehemu", "Deceased"), vals.deceased_full_name],
              [L("Tarehe ya Kufariki", "Date of Death"), vals.date_of_death],
              [L("Mahali pa Kuzikwa", "Burial Location"), vals.burial_location],
              [L("Ada", "Fee"), `TSh ${SERVICE_FEE.toLocaleString()}`],
              [L("Hali", "Status"), L("Inasubiri Idhini", "Pending Approval")],
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
              L(
                "Ofisi ya Serikali ya Mtaa itakagua maombi yako",
                "The Local Government office will review your application",
              ),
              L(
                "Kibari kitaidhinishwa haraka kwa kuzingatia hali ya dharura",
                "The permit will be approved quickly given the urgent nature",
              ),
              L(
                `Lipa ada ya TSh ${SERVICE_FEE.toLocaleString()} unapokuja kuchukua kibari`,
                `Pay TSh ${SERVICE_FEE.toLocaleString()} when collecting the permit`,
              ),
              L(
                "Lete namba ya maombi na kitambulisho chochote",
                "Bring the reference number and any ID",
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
      // ══════════════════════════════════════════════════════════════════════
      // STEP 1 — MAREHEMU (Deceased Information)
      // ══════════════════════════════════════════════════════════════════════
      case "deceased":
        return (
          <div className="space-y-5">
            <div className={secHdr}>
              <p className="font-bold text-stone-800 text-sm flex items-center gap-2">
                <Heart size={16} /> {L("TAARIFA ZA MAREHEMU", "DECEASED INFORMATION")}
              </p>
              <p className="text-xs text-stone-500 mt-0.5">
                {L("Taarifa kamili za mtu aliyefariki", "Complete details of the deceased person")}
              </p>
            </div>

            <Field
              name="deceased_full_name"
              label={L("Jina Kamili la Marehemu", "Full Name of Deceased")}
              required
            >
              <TI
                name="deceased_full_name"
                value={vals.deceased_full_name}
                onChange={(v) => {
                  set("deceased_full_name", v);
                  clrErr("deceased_full_name");
                }}
                placeholder={L("Mfano: Juma Mohamed Juma", "E.g. Juma Mohamed Juma")}
              />
            </Field>

            <Field
              name="deceased_nida"
              label={L("NIDA ya Marehemu (Hiari)", "Deceased NIDA (Optional)")}
              hint={L("Kama inajulikana", "If known")}
            >
              <TI
                name="deceased_nida"
                value={vals.deceased_nida}
                onChange={(v) => set("deceased_nida", v)}
                placeholder="XXXX-XXXX-XXXX-XXXX-XXXX"
              />
            </Field>

            <div className="grid grid-cols-2 gap-3">
              <Field name="fathers_name" label={L("Jina la Baba", "Father's Name")}>
                <TI
                  name="fathers_name"
                  value={vals.fathers_name}
                  onChange={(v) => set("fathers_name", v)}
                  placeholder={L("Jina la baba", "Father's name")}
                />
              </Field>
              <Field name="mothers_name" label={L("Jina la Mama", "Mother's Name")}>
                <TI
                  name="mothers_name"
                  value={vals.mothers_name}
                  onChange={(v) => set("mothers_name", v)}
                  placeholder={L("Jina la mama", "Mother's name")}
                />
              </Field>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Field
                name="date_of_birth"
                label={L("Tarehe ya Kuzaliwa", "Date of Birth")}
                hint={L("Hiari — itasaidia kukokotoa umri", "Optional — used to calculate age")}
              >
                <TI
                  name="date_of_birth"
                  value={vals.date_of_birth}
                  type="date"
                  onChange={(v) => set("date_of_birth", v)}
                />
              </Field>
              <Field name="date_of_death" label={L("Tarehe ya Kufariki", "Date of Death")} required>
                <TI
                  name="date_of_death"
                  value={vals.date_of_death}
                  type="date"
                  onChange={(v) => {
                    set("date_of_death", v);
                    clrErr("date_of_death");
                  }}
                />
              </Field>
            </div>

            {/* Age auto-display */}
            {calculatedAge !== null && (
              <div className="bg-stone-50 border border-stone-100 rounded-xl px-4 py-3 flex items-center gap-3">
                <CheckCircle size={15} className="text-stone-500 shrink-0" />
                <p className="text-xs text-stone-600">
                  {L(
                    `Umri uliokokotolewa: miaka ${calculatedAge}`,
                    `Calculated age: ${calculatedAge} years old`,
                  )}
                </p>
              </div>
            )}

            <Field
              name="place_of_death"
              label={L("Mahali pa Kufariki", "Place of Death")}
              required
              hint={L(
                "Mfano: Hospitali ya Muhimbili, Nyumbani, Barabarani",
                "E.g. Muhimbili Hospital, Home, Road",
              )}
            >
              <TI
                name="place_of_death"
                value={vals.place_of_death}
                onChange={(v) => {
                  set("place_of_death", v);
                  clrErr("place_of_death");
                }}
                placeholder={L("Mahali alipokufa marehemu", "Where the deceased passed away")}
              />
            </Field>

            <Field name="cause_of_death" label={L("Sababu ya Kifo", "Cause of Death")} required>
              <Sel
                name="cause_of_death"
                value={vals.cause_of_death}
                onChange={(v) => {
                  set("cause_of_death", v);
                  clrErr("cause_of_death");
                }}
                options={CAUSE_OF_DEATH_OPTIONS}
              />
            </Field>

            {vals.cause_of_death === "NYINGINE" && (
              <Field
                name="cause_details"
                label={L("Eleza Sababu ya Kifo", "Describe Cause of Death")}
                required
              >
                <textarea
                  value={vals.cause_details}
                  onChange={(e) => {
                    set("cause_details", e.target.value);
                    clrErr("cause_details");
                  }}
                  rows={2}
                  placeholder={L("Maelezo mafupi...", "Brief description...")}
                  className={`${inputCls("cause_details")} resize-none`}
                />
              </Field>
            )}

            <Field
              name="surviving_spouse"
              label={L("Jina la Mke / Mume Aliye Hai (Hiari)", "Surviving Spouse (Optional)")}
            >
              <TI
                name="surviving_spouse"
                value={vals.surviving_spouse}
                onChange={(v) => set("surviving_spouse", v)}
                placeholder={L("Jina la mke au mume aliyebaki", "Surviving spouse's name")}
              />
            </Field>
          </div>
        );

      // ══════════════════════════════════════════════════════════════════════
      // STEP 2 — MAZISHI / KUZIKWA (Funeral & Burial)
      // ══════════════════════════════════════════════════════════════════════
      case "funeral":
        return (
          <div className="space-y-5">
            <div className={secHdr}>
              <p className="font-bold text-stone-800 text-sm flex items-center gap-2">
                <Calendar size={16} />{" "}
                {L("RATIBA YA MAZISHI NA KUZIKWA", "FUNERAL & BURIAL SCHEDULE")}
              </p>
            </div>

            <Field
              name="body_location"
              label={L("Mahali Ilipo Maiti Sasa Hivi", "Current Body Location")}
              required
              hint={L(
                "Mfano: Chumba cha Maiti cha Hospitali ya Muhimbili",
                "E.g. Muhimbili Hospital Mortuary",
              )}
            >
              <TI
                name="body_location"
                value={vals.body_location}
                onChange={(v) => {
                  set("body_location", v);
                  clrErr("body_location");
                }}
                placeholder={L(
                  "Hospitali, nyumbani, au mahali pengine",
                  "Hospital, home, or other location",
                )}
              />
            </Field>

            <Field name="burial_type" label={L("Aina ya Mazishi", "Type of Burial")} required>
              <Sel
                name="burial_type"
                value={vals.burial_type}
                onChange={(v) => {
                  set("burial_type", v);
                  clrErr("burial_type");
                }}
                options={BURIAL_TYPE_OPTIONS}
              />
            </Field>

            {/* Funeral service (optional) */}
            <div className="border border-stone-200 rounded-xl overflow-hidden">
              <div className="bg-stone-50 px-4 py-2.5 border-b border-stone-100">
                <p className="text-xs font-bold text-stone-600 uppercase tracking-wide">
                  {L("HUDUMA YA MSIBA (Hiari)", "FUNERAL SERVICE (Optional)")}
                </p>
              </div>
              <div className="p-4 space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <Field name="funeral_date" label={L("Tarehe ya Huduma", "Service Date")}>
                    <TI
                      name="funeral_date"
                      value={vals.funeral_date}
                      type="date"
                      onChange={(v) => set("funeral_date", v)}
                    />
                  </Field>
                  <Field name="funeral_time" label={L("Muda wa Huduma", "Service Time")}>
                    <TI
                      name="funeral_time"
                      value={vals.funeral_time}
                      type="time"
                      onChange={(v) => set("funeral_time", v)}
                    />
                  </Field>
                </div>
                <Field
                  name="service_location"
                  label={L("Mahali pa Huduma", "Service Location")}
                  hint={L(
                    "Mfano: Msikiti wa Kariakoo, Kanisa la KKKT",
                    "E.g. Kariakoo Mosque, KKKT Church",
                  )}
                >
                  <TI
                    name="service_location"
                    value={vals.service_location}
                    onChange={(v) => set("service_location", v)}
                    placeholder={L(
                      "Msikiti, Kanisa, au mahali pengine",
                      "Mosque, Church, or other venue",
                    )}
                  />
                </Field>
              </div>
            </div>

            {/* Burial — required */}
            <div className="border border-stone-300 rounded-xl overflow-hidden">
              <div className="bg-stone-100 px-4 py-2.5 border-b border-stone-200">
                <p className="text-xs font-bold text-stone-700 uppercase tracking-wide">
                  {L("KUZIKWA (Inahitajika)", "BURIAL (Required)")}
                </p>
              </div>
              <div className="p-4 space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <Field name="burial_date" label={L("Tarehe ya Kuzikwa", "Burial Date")} required>
                    <TI
                      name="burial_date"
                      value={vals.burial_date}
                      type="date"
                      onChange={(v) => {
                        set("burial_date", v);
                        clrErr("burial_date");
                      }}
                    />
                  </Field>
                  <Field name="burial_time" label={L("Muda wa Kuzikwa", "Burial Time")} required>
                    <TI
                      name="burial_time"
                      value={vals.burial_time}
                      type="time"
                      onChange={(v) => {
                        set("burial_time", v);
                        clrErr("burial_time");
                      }}
                    />
                  </Field>
                </div>
                <Field
                  name="burial_location"
                  label={L("Jina la Makaburi", "Cemetery Name")}
                  required
                  hint={L(
                    "Mfano: Makaburi ya Kinondoni, Makaburi ya Yombo",
                    "E.g. Kinondoni Cemetery, Yombo Cemetery",
                  )}
                >
                  <TI
                    name="burial_location"
                    value={vals.burial_location}
                    onChange={(v) => {
                      set("burial_location", v);
                      clrErr("burial_location");
                    }}
                    placeholder={L("Jina la makaburi", "Cemetery name")}
                  />
                </Field>
                <Field
                  name="burial_district"
                  label={L("Wilaya / Kata ya Makaburi", "Cemetery District / Ward")}
                >
                  <TI
                    name="burial_district"
                    value={vals.burial_district}
                    onChange={(v) => set("burial_district", v)}
                    placeholder={L("Mfano: Kinondoni, Ilala", "E.g. Kinondoni, Ilala")}
                  />
                </Field>
              </div>
            </div>

            <div className="bg-amber-50 border border-amber-100 rounded-xl p-3 flex gap-2">
              <AlertCircle size={14} className="text-amber-500 shrink-0 mt-0.5" />
              <p className="text-xs text-amber-700">
                {L(
                  "Hakikisha makaburi unayochagua yana nafasi. Baadhi ya makaburi yanahitaji idhini tofauti.",
                  "Ensure the cemetery you choose has space. Some cemeteries require separate permissions.",
                )}
              </p>
            </div>
          </div>
        );

      // ══════════════════════════════════════════════════════════════════════
      // STEP 3 — FAMILIA (Family Contact)
      // ══════════════════════════════════════════════════════════════════════
      case "family":
        return (
          <div className="space-y-5">
            <div className={secHdr}>
              <p className="font-bold text-stone-800 text-sm flex items-center gap-2">
                <Users size={16} /> {L("MAWASILIANO YA FAMILIA", "FAMILY CONTACT")}
              </p>
            </div>

            {/* Primary representative */}
            <div className="border border-stone-300 rounded-xl overflow-hidden">
              <div className="bg-stone-100 px-4 py-2.5 border-b border-stone-200">
                <p className="text-xs font-bold text-stone-700 uppercase tracking-wide">
                  {L("MWAKILISHI MKUU WA FAMILIA", "PRIMARY FAMILY REPRESENTATIVE")}
                </p>
              </div>
              <div className="p-4 space-y-4">
                <Field
                  name="representative_name"
                  label={L("Jina Kamili la Mwakilishi", "Representative Full Name")}
                  required
                >
                  <TI
                    name="representative_name"
                    value={vals.representative_name}
                    onChange={(v) => {
                      set("representative_name", v);
                      clrErr("representative_name");
                    }}
                    placeholder={L("Jina kamili", "Full name")}
                  />
                </Field>
                <div className="grid grid-cols-2 gap-3">
                  <Field
                    name="representative_phone"
                    label={L("Simu ya Mwakilishi", "Phone Number")}
                    required
                  >
                    <TI
                      name="representative_phone"
                      value={vals.representative_phone}
                      onChange={(v) => {
                        set("representative_phone", v);
                        clrErr("representative_phone");
                      }}
                      placeholder="+255 7XX XXX XXX"
                    />
                  </Field>
                  <Field
                    name="representative_nida"
                    label={L("NIDA ya Mwakilishi (Hiari)", "Representative NIDA (Optional)")}
                  >
                    <TI
                      name="representative_nida"
                      value={vals.representative_nida}
                      onChange={(v) => set("representative_nida", v)}
                      placeholder={L("Kama inajulikana", "If available")}
                    />
                  </Field>
                </div>
                <Field
                  name="representative_relationship"
                  label={L("Uhusiano na Marehemu", "Relationship to Deceased")}
                  required
                >
                  <Sel
                    name="representative_relationship"
                    value={vals.representative_relationship}
                    onChange={(v) => {
                      set("representative_relationship", v);
                      clrErr("representative_relationship");
                    }}
                    options={RELATIONSHIP_OPTIONS}
                  />
                </Field>
              </div>
            </div>

            {/* Second contact — optional */}
            <div className="border border-stone-200 rounded-xl overflow-hidden">
              <div className="bg-stone-50 px-4 py-2.5 border-b border-stone-100">
                <p className="text-xs font-bold text-stone-600 uppercase tracking-wide">
                  {L("MAWASILIANO YA PILI (Hiari)", "SECONDARY CONTACT (Optional)")}
                </p>
              </div>
              <div className="p-4 space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <Field name="second_contact_name" label={L("Jina", "Name")}>
                    <TI
                      name="second_contact_name"
                      value={vals.second_contact_name}
                      onChange={(v) => set("second_contact_name", v)}
                      placeholder={L("Jina kamili", "Full name")}
                    />
                  </Field>
                  <Field name="second_contact_phone" label={L("Simu", "Phone")}>
                    <TI
                      name="second_contact_phone"
                      value={vals.second_contact_phone}
                      onChange={(v) => set("second_contact_phone", v)}
                      placeholder="+255 7XX XXX XXX"
                    />
                  </Field>
                </div>
              </div>
            </div>

            {/* Children / relatives list */}
            <Field
              name="children_names"
              label={L(
                "Majina ya Watoto / Ndugu Waliobaki (Hiari)",
                "Surviving Children / Relatives (Optional)",
              )}
              hint={L("Orodhesha majina, moja kwa mstari", "List names, one per line")}
            >
              <textarea
                value={vals.children_names}
                onChange={(e) => set("children_names", e.target.value)}
                rows={4}
                placeholder={L(
                  "Mfano:\nAli Juma\nAsha Juma\nHassan Juma",
                  "E.g.:\nAli Juma\nAsha Juma\nHassan Juma",
                )}
                className={`${inputCls("children_names")} resize-none`}
              />
            </Field>

            <div className="bg-blue-50 border border-blue-100 rounded-xl p-3 flex gap-2">
              <Phone size={14} className="text-blue-500 shrink-0 mt-0.5" />
              <p className="text-xs text-blue-700">
                {L(
                  "Simu ya mwakilishi ni muhimu. Ofisi itawasiliana na wewe kuhusu kibali haraka iwezekanavyo.",
                  "The representative's phone is essential. The office will contact you regarding the permit as quickly as possible.",
                )}
              </p>
            </div>
          </div>
        );

      // ══════════════════════════════════════════════════════════════════════
      // STEP 4 — NYARAKA (Documents)
      // ══════════════════════════════════════════════════════════════════════
      case "documents":
        return (
          <div className="space-y-5">
            <div className={secHdr}>
              <p className="font-bold text-stone-800 text-sm flex items-center gap-2">
                <FileText size={16} />{" "}
                {L("NYARAKA ZA MSAADA (Hiari)", "SUPPORTING DOCUMENTS (Optional)")}
              </p>
              <p className="text-xs text-stone-500 mt-0.5">
                {L(
                  "Nyaraka zinazoweza kusaidia kupata kibari haraka",
                  "Documents that may help obtain the permit faster",
                )}
              </p>
            </div>

            <div className="bg-blue-50 border border-blue-100 rounded-xl p-3">
              <p className="text-xs font-bold text-blue-700 mb-1.5">
                {L("Nyaraka zinazopendekezwa:", "Recommended documents:")}
              </p>
              <ul className="space-y-1 text-xs text-blue-600">
                {[
                  L(
                    "Cheti cha kifo kutoka hospitali au daktari",
                    "Death certificate from hospital or doctor",
                  ),
                  L(
                    "Barua ya kuthibitisha kifo (kama inapatikana)",
                    "Death notification letter (if available)",
                  ),
                  L("Kitambulisho cha mwakilishi wa familia", "ID of family representative"),
                  L(
                    "Hati ya kuhifadhi maiti (kama ipo)",
                    "Body storage documentation (if applicable)",
                  ),
                ].map((item, i) => (
                  <li key={i} className="flex items-start gap-1.5">
                    <span className="text-blue-400 mt-0.5">•</span> {item}
                  </li>
                ))}
              </ul>
            </div>

            {/* Upload area */}
            <div>
              <label className={lbl}>{L("Pakia Nyaraka", "Upload Documents")}</label>
              <div
                onClick={() => docRef.current?.click()}
                className={`border-2 border-dashed rounded-xl p-4 cursor-pointer transition-all text-center
                ${docs.length > 0 ? "border-stone-400 bg-stone-50" : "border-stone-300 hover:border-stone-400 hover:bg-stone-50/40"}`}
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
                          <div className="w-10 h-10 bg-stone-100 rounded-lg flex items-center justify-center shrink-0">
                            <FileText size={18} className="text-stone-600" />
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
                    <p className="text-xs text-stone-600 font-medium">
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

            <div className="bg-stone-50 border border-stone-100 rounded-xl p-3 flex gap-2">
              <Shield size={14} className="text-stone-400 shrink-0 mt-0.5" />
              <p className="text-xs text-stone-500">
                {L(
                  "Nyaraka za msaada si lazima. Zinaweza kupunguza muda wa kupata kibari.",
                  "Supporting documents are not required but may speed up permit approval.",
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
                  {L("Hakiki Taarifa Kabla ya Kuwasilisha", "Review Information Before Submitting")}
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
              title={L("Mwaombaji", "Applicant")}
              stepKey="family"
            >
              <PRow
                label={L("Jina", "Name")}
                value={`${userProfile?.first_name || ""} ${userProfile?.last_name || ""}`.trim()}
              />
              <PRow label={L("Simu", "Phone")} value={userProfile?.phone} />
              <PRow label="NIDA" value={userProfile?.nida_number} />
            </PSection>

            {/* Deceased */}
            <PSection
              icon={<Heart size={14} />}
              title={L("Taarifa za Marehemu", "Deceased Information")}
              stepKey="deceased"
            >
              <PRow label={L("Jina Kamili", "Full Name")} value={vals.deceased_full_name} />
              {vals.deceased_nida && <PRow label="NIDA" value={vals.deceased_nida} />}
              <PRow label={L("Tarehe ya Kufariki", "Date of Death")} value={vals.date_of_death} />
              {vals.date_of_birth && (
                <PRow label={L("Tarehe ya Kuzaliwa", "Date of Birth")} value={vals.date_of_birth} />
              )}
              {calculatedAge !== null && (
                <PRow label={L("Umri", "Age")} value={`${calculatedAge} ${L("miaka", "years")}`} />
              )}
              <PRow label={L("Mahali pa Kufariki", "Place of Death")} value={vals.place_of_death} />
              <PRow
                label={L("Sababu ya Kifo", "Cause of Death")}
                value={CAUSE_OF_DEATH_OPTIONS.find((c) => c.value === vals.cause_of_death)?.label}
              />
              {vals.cause_of_death === "NYINGINE" && vals.cause_details && (
                <PRow label={L("Maelezo", "Details")} value={vals.cause_details} />
              )}
              {vals.fathers_name && <PRow label={L("Baba", "Father")} value={vals.fathers_name} />}
              {vals.mothers_name && <PRow label={L("Mama", "Mother")} value={vals.mothers_name} />}
              {vals.surviving_spouse && (
                <PRow
                  label={L("Mke/Mume Aliye Hai", "Surviving Spouse")}
                  value={vals.surviving_spouse}
                />
              )}
            </PSection>

            {/* Funeral & Burial */}
            <PSection
              icon={<Calendar size={14} />}
              title={L("Mazishi na Kuzikwa", "Funeral & Burial")}
              stepKey="funeral"
            >
              <PRow label={L("Mahali Ilipo Maiti", "Body Location")} value={vals.body_location} />
              <PRow
                label={L("Aina ya Mazishi", "Burial Type")}
                value={BURIAL_TYPE_OPTIONS.find((b) => b.value === vals.burial_type)?.label}
              />
              {vals.funeral_date && (
                <PRow label={L("Tarehe ya Huduma", "Service Date")} value={vals.funeral_date} />
              )}
              {vals.funeral_time && (
                <PRow label={L("Muda wa Huduma", "Service Time")} value={vals.funeral_time} />
              )}
              {vals.service_location && (
                <PRow
                  label={L("Mahali pa Huduma", "Service Location")}
                  value={vals.service_location}
                />
              )}
              <PRow label={L("Tarehe ya Kuzikwa", "Burial Date")} value={vals.burial_date} />
              <PRow label={L("Muda wa Kuzikwa", "Burial Time")} value={vals.burial_time} />
              <PRow label={L("Makaburi", "Cemetery")} value={vals.burial_location} />
              {vals.burial_district && (
                <PRow
                  label={L("Wilaya ya Makaburi", "Cemetery District")}
                  value={vals.burial_district}
                />
              )}
            </PSection>

            {/* Family */}
            <PSection icon={<Users size={14} />} title={L("Familia", "Family")} stepKey="family">
              <PRow label={L("Mwakilishi", "Representative")} value={vals.representative_name} />
              <PRow label={L("Simu", "Phone")} value={vals.representative_phone} />
              <PRow
                label={L("Uhusiano", "Relationship")}
                value={
                  RELATIONSHIP_OPTIONS.find((r) => r.value === vals.representative_relationship)
                    ?.label
                }
              />
              {vals.second_contact_name && (
                <PRow
                  label={L("Mawasiliano ya 2", "2nd Contact")}
                  value={`${vals.second_contact_name} · ${vals.second_contact_phone}`}
                />
              )}
              {vals.children_names && (
                <PRow
                  label={L("Watoto / Ndugu", "Children / Relatives")}
                  value={vals.children_names.split("\n").join(", ")}
                />
              )}
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
                      <div className="w-8 h-8 bg-stone-100 rounded-lg flex items-center justify-center shrink-0">
                        <FileText size={14} className="text-stone-600" />
                      </div>
                    )}
                    <p className="text-xs font-bold text-stone-700 flex-1 truncate">
                      {d.file.name}
                    </p>
                    <CheckCircle size={13} className="text-stone-500 shrink-0" />
                  </div>
                ))}
              </PSection>
            )}

            {/* Fee */}
            <div className="bg-stone-50 border border-stone-200 rounded-xl p-4 flex justify-between items-center">
              <span className="font-bold text-stone-700 text-sm">
                {L("Ada ya Kibari:", "Permit Fee:")}
              </span>
              <span className="text-xl font-black text-stone-700">
                TSh {SERVICE_FEE.toLocaleString()}
              </span>
            </div>

            {/* Consent */}
            <div className="space-y-3">
              <p className="text-xs font-black text-stone-600 uppercase tracking-wider">
                {L("IDHINI NA UTHIBITISHO", "CONSENT & CONFIRMATION")}
              </p>
              {[
                {
                  key: "terms_accepted" as const,
                  sw: "Nathibitisha kwamba taarifa zote nilizotoa katika fomu hii ni za kweli na sahihi.",
                  en: "I confirm that all information I have provided in this form is true and accurate.",
                },
                {
                  key: "data_confirmed" as const,
                  sw: "Ninakubali kutoa taarifa hizi kwa Serikali ya Mtaa kwa madhumuni ya Kibari cha Mazishi pekee.",
                  en: "I consent to provide this information to the Local Government for Burial Permit purposes only.",
                },
              ].map((item) => (
                <label
                  key={item.key}
                  className={`flex items-start gap-3 cursor-pointer rounded-xl p-3 border transition-colors
                  ${vals[item.key] ? "bg-stone-100 border-stone-400" : "bg-stone-50 border-stone-200 hover:bg-stone-100/50"}`}
                >
                  <input
                    type="checkbox"
                    checked={vals[item.key]}
                    onChange={(e) => {
                      set(item.key, e.target.checked);
                      clrErr(item.key);
                    }}
                    className="w-4 h-4 mt-0.5 rounded shrink-0"
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
              className="flex-1 py-3.5 bg-gradient-to-r from-stone-600 to-stone-700 hover:from-stone-700 hover:to-stone-800 text-white rounded-xl font-bold shadow-lg transition-all flex items-center justify-center gap-2 text-sm"
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
              className="flex-1 py-3.5 bg-gradient-to-r from-stone-600 to-stone-700 hover:from-stone-700 hover:to-stone-800 text-white rounded-xl font-bold shadow-lg transition-all flex items-center justify-center gap-2 text-sm disabled:opacity-60 disabled:cursor-not-allowed"
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

export default KibariMazishiForm;
