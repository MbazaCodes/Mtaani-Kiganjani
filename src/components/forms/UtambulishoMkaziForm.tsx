/**
 * Utambulisho wa Mkazi — Resident Identity Form
 * Full rebuild v2: spouse/children, landlord, VEO/MEO, purpose,
 * file validation, edit-in-preview, consent on preview, success screen
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
  Phone,
  Mail,
  Calendar,
  Users,
  Heart,
  Briefcase,
  FileText,
  Home,
  Zap,
  Droplet,
  Globe,
  AlertCircle,
  Shield,
  Info,
  CreditCard,
  Camera,
  Upload,
  X,
  Check,
  BookOpen,
  Hash,
  Baby,
  UserPlus,
  Edit2,
  Trash2,
  Plus,
  Building2,
  Key,
  Star,
  Activity,
} from "lucide-react";
import { SignaturePad } from "@/components/ui/SignaturePad";
import { FormProps, labels } from "./types";
import { ProgressFill } from "../ui/ProgressFill";
import { TANZANIA_ADDRESS_DATA } from "@/lib/addressData";

// ─── Constants ───────────────────────────────────────────────────────────────

const MARITAL_STATUS = [
  { label: "Hajaoa / Hajaolewa (Single)", value: "SINGLE" },
  { label: "Ndoa (Married)", value: "MARRIED" },
  { label: "Talaka (Divorced)", value: "DIVORCED" },
  { label: "Mjane / Mgane (Widowed)", value: "WIDOWED" },
];

const OCCUPATIONS = [
  { label: "Mfanyabiashara (Business Owner)", value: "mfanyabiashara" },
  { label: "Mwalimu (Teacher)", value: "mwalimu" },
  { label: "Daktari (Doctor)", value: "daktari" },
  { label: "Muuguzi (Nurse)", value: "muuguzi" },
  { label: "Mhandisi (Engineer)", value: "mhandisi" },
  { label: "Mwanasheria (Lawyer)", value: "mwanasheria" },
  { label: "Mhasibu (Accountant)", value: "mhasibu" },
  { label: "Askari Polisi (Police Officer)", value: "askari_polisi" },
  { label: "Askari Jeshi (Military Officer)", value: "askari_jeshi" },
  { label: "Mtumishi wa Serikali (Government Employee)", value: "mtumishi_serikali" },
  { label: "Mkulima (Farmer)", value: "mkulima" },
  { label: "Mvuvi (Fisherman)", value: "mvuvi" },
  { label: "Mfugaji (Livestock Keeper)", value: "mfugaji" },
  { label: "Fundi / Artisan", value: "fundi" },
  { label: "Dereva (Driver)", value: "dereva" },
  { label: "Bodaboda / Bajaj Driver", value: "bodaboda" },
  { label: "Mchuuzi / Muuzaji (Vendor)", value: "mchuuzi" },
  { label: "Mama Lishe / Mama Ntilie", value: "mama_lishe" },
  { label: "Mtaalamu wa TEHAMA (IT Professional)", value: "mtaalamu_ict" },
  { label: "Mfanyakazi wa Benki (Bank Employee)", value: "mfanyakazi_benki" },
  { label: "Mfanyakazi wa NGO (NGO Worker)", value: "mfanyakazi_ngo" },
  { label: "Mwandishi wa Habari (Journalist)", value: "mwandishi" },
  { label: "Mwanafunzi (Student)", value: "mwanafunzi" },
  { label: "Mstaafu (Retired)", value: "mstaafu" },
  { label: "Mama wa Nyumbani (Homemaker)", value: "mama_nyumbani" },
  { label: "Hana Kazi (Unemployed)", value: "hana_kazi" },
  { label: "Nyingine (Other)", value: "nyingine" },
];

const APPLICATION_PURPOSES = [
  { label: "Utambulisho wa Mtaa (Resident ID)", value: "UTAMBULISHO" },
  { label: "Kufungua Akaunti ya Benki (Bank Account)", value: "BENKI" },
  { label: "Maombi ya Ajira (Job Application)", value: "AJIRA" },
  { label: "Maombi ya Chuo / Shule (Education)", value: "KUSOMA" },
  { label: "Huduma za Afya (Health Services)", value: "HUDUMA_YA_AFYA" },
  { label: "Hati ya Kusafiri / Pasipoti (Passport/Travel)", value: "HATI_YA_KUSAFIRI" },
  { label: "Kuomba Leseni (License Application)", value: "LESENI" },
  { label: "Biashara (Business Registration)", value: "BIASHARA" },
  { label: "Kupata Huduma za Serikali (Government Services)", value: "SERIKALI" },
  { label: "Kuomba Mkopo (Loan Application)", value: "MKOPO" },
  { label: "Kununua / Kupanga Nyumba (Property)", value: "MALI" },
  { label: "Nyinginezo (Other)", value: "NYINGINEZO" },
];

const RESIDENCY_STATUS = [
  { label: "Mkazi wa Kawaida (Regular Resident)", value: "REGULAR" },
  { label: "Mgeni (Foreigner)", value: "FOREIGNER" },
  { label: "Diaspora (Tanzanian Living Abroad)", value: "DIASPORA" },
];

const OWNERSHIP_STATUS = [
  { label: "Namiliki Nyumba (I Own the House)", value: "OWN" },
  { label: "Nakodi (I Rent)", value: "RENT" },
  { label: "Naishi na Familia / Ndugu (Live with Family)", value: "FAMILY" },
  { label: "Naishi Kwa Biashara (Business Accommodation)", value: "BUSINESS" },
  { label: "Nyingine (Other)", value: "OTHER" },
];

const WORK_PERMIT_OPTIONS = [
  { label: "Ndiyo — Nina Work Permit", value: "YES" },
  { label: "Hapana — Sina Work Permit", value: "NO" },
  { label: "Sihitaji (Not Applicable)", value: "NA" },
];

const YES_NO = [
  { label: "Ndiyo (Yes)", value: "YES" },
  { label: "Hapana (No)", value: "NO" },
];

const YEARS_OPTIONS = Array.from({ length: 51 }, (_, i) => ({
  label: i === 0 ? i + " (Chini ya mwaka 1)" : `${i} ${i === 1 ? "mwaka" : "miaka"}`,
  value: String(i),
}));
const COUNT_OPTIONS = Array.from({ length: 21 }, (_, i) => ({
  label: String(i),
  value: String(i),
}));
const CHILD_COUNT_OPTIONS = Array.from({ length: 11 }, (_, i) => ({
  label: String(i),
  value: String(i),
}));

const MAX_SELFIE_SIZE = 5 * 1024 * 1024; // 5MB
const MAX_ID_SIZE = 5 * 1024 * 1024; // 5MB
const MAX_DOC_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_IMAGES = ["image/jpeg", "image/png", "image/webp"];
const ALLOWED_DOCS = [...ALLOWED_IMAGES, "application/pdf"];

// ─── Types ────────────────────────────────────────────────────────────────────

type Step =
  | "location"
  | "personal"
  | "residence"
  | "utilities"
  | "family"
  | "status"
  | "documents"
  | "preview";

interface ChildInfo {
  name: string;
  dob: string;
}

interface UploadedDoc {
  file: File;
  preview: string;
  type: "selfie" | "id_front" | "id_back" | "proof_residence" | "support";
  label: string;
}

interface FormValues {
  // Step 1 – Location
  region: string;
  district: string;
  ward: string;
  village_street: string;
  mtaa_officer: string;
  // Step 2 – Personal
  marital_status: string;
  occupation: string;
  employer_name: string;
  spouse_name: string;
  spouse_nida: string;
  spouse_dob: string;
  spouse_phone: string;
  spouse_occupation: string;
  has_children: string;
  children_number: string;
  // Step 3 – Residence
  neighborhood: string;
  house_number: string;
  plot_number: string;
  block_number: string;
  ownership_status: string;
  landlord_name: string;
  landlord_phone: string;
  owner_name: string;
  move_in_date: string;
  years_at_residence: string;
  // Step 4 – Utilities
  electricity_bill: string;
  water_bill: string;
  property_tax: string;
  // Step 5 – Family
  family_count: string;
  dependents_count: string;
  children_count: string;
  elderly_count: string;
  has_disability: string;
  // Step 6 – Status + Purpose
  purpose: string;
  purpose_details: string;
  residency_status: string;
  work_permit: string;
  passport_number: string;
  country_of_origin: string;
  // Step 8 – Consent
  terms_accepted: boolean;
  data_confirmed: boolean;
}

// ─── Component ───────────────────────────────────────────────────────────────

export const UtambulishoMkaziForm: React.FC<FormProps> = ({
  onSubmit,
  isLoading,
  lang = "sw",
  userProfile,
}) => {
  const t = labels[lang];
  const L = useCallback((sw: string, en: string) => (lang === "sw" ? sw : en), [lang]);

  const [step, setStep] = useState<Step>("location");
  const [submitted, setSubmitted] = useState(false);
  const [signature, setSignature] = useState<string | null>(null);
  const [applicationRef, setApplicationRef] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<Partial<Record<string, string>>>({});
  const errorsRef = useRef(errors);
  errorsRef.current = errors;
  const [children, setChildren] = useState<ChildInfo[]>([]);
  const [docs, setDocs] = useState<UploadedDoc[]>([]);

  const selfieRef = useRef<HTMLInputElement>(null);
  const idFrontRef = useRef<HTMLInputElement>(null);
  const idBackRef = useRef<HTMLInputElement>(null);
  const proofRef = useRef<HTMLInputElement>(null);
  const supportRef = useRef<HTMLInputElement>(null);

  const [vals, setVals] = useState<FormValues>({
    region: userProfile?.region || "",
    district: userProfile?.district || "",
    ward: userProfile?.ward || "",
    village_street: userProfile?.street || "",
    mtaa_officer: userProfile?.mtaa_executive_officer || "",
    marital_status: userProfile?.marital_status || "",
    occupation: userProfile?.occupation || "",
    employer_name: "",
    spouse_name: "",
    spouse_nida: "",
    spouse_dob: "",
    spouse_phone: "",
    spouse_occupation: "",
    has_children: "",
    children_number: "0",
    neighborhood: "",
    house_number: userProfile?.house_number || "",
    plot_number: "",
    block_number: "",
    ownership_status: "",
    landlord_name: "",
    landlord_phone: "",
    owner_name: "",
    move_in_date: "",
    years_at_residence: "0",
    electricity_bill: "",
    water_bill: "",
    property_tax: "",
    family_count: "1",
    dependents_count: "0",
    children_count: "0",
    elderly_count: "0",
    has_disability: "NO",
    purpose: "UTAMBULISHO",
    purpose_details: "",
    residency_status: userProfile?.is_diaspora ? "DIASPORA" : "REGULAR",
    work_permit: "NA",
    passport_number: userProfile?.passport_number || "",
    country_of_origin: userProfile?.country_of_citizenship || "",
    terms_accepted: false,
    data_confirmed: false,
  });

  // ─── Address cascades (memoised — TANZANIA_ADDRESS_DATA is 4000+ lines) ──
  const regions = React.useMemo(() => TANZANIA_ADDRESS_DATA.map((r) => r.name), []);
  const districts = React.useMemo(
    () =>
      vals.region
        ? (TANZANIA_ADDRESS_DATA.find((r) => r.name === vals.region)?.districts.map(
            (d) => d.name,
          ) ?? [])
        : [],
    [vals.region],
  );
  const wards = React.useMemo(
    () =>
      vals.region && vals.district
        ? (TANZANIA_ADDRESS_DATA.find((r) => r.name === vals.region)?.districts.find(
            (d) => d.name === vals.district,
          )?.wards ?? [])
        : [],
    [vals.region, vals.district],
  );

  // ─── Helpers ────────────────────────────────────────────────────────────
  const set = (key: keyof FormValues, value: string | boolean) =>
    setVals((prev) => ({ ...prev, [key]: value }));
  const clrErr = useCallback((key: string) => {
    setErrors((prev) => {
      const n = { ...prev };
      delete n[key];
      return n;
    });
  }, []);
  const err = useCallback((key: string) => errorsRef.current[key], []);

  // ─── Document helpers ────────────────────────────────────────────────────
  const addDoc = useCallback(
    (
      file: File,
      type: UploadedDoc["type"],
      label: string,
      maxSize: number,
      allowedTypes: string[],
    ): string | null => {
      if (!allowedTypes.includes(file.type)) {
        return L(
          `Aina ya faili haikushukuliwa. Tumia: ${allowedTypes.map((t) => t.split("/")[1]).join(", ")}`,
          `File type not allowed. Use: ${allowedTypes.map((t) => t.split("/")[1]).join(", ")}`,
        );
      }
      if (file.size > maxSize) {
        return L(
          `Faili ni kubwa sana. Upeo ni ${maxSize / (1024 * 1024)}MB`,
          `File too large. Max ${maxSize / (1024 * 1024)}MB`,
        );
      }
      const preview = URL.createObjectURL(file);
      setDocs((prev) => {
        const filtered = type === "support" ? prev : prev.filter((d) => d.type !== type);
        return [...filtered, { file, preview, type, label }];
      });
      return null;
    },
    [L],
  );

  const removeDoc = (idx: number) =>
    setDocs((prev) => {
      URL.revokeObjectURL(prev[idx].preview);
      return prev.filter((_, i) => i !== idx);
    });
  const getDoc = (type: UploadedDoc["type"]) => docs.find((d) => d.type === type);

  // ─── Children helpers ───────────────────────────────────────────────────
  const addChild = () => setChildren((prev) => [...prev, { name: "", dob: "" }]);
  const removeChild = (i: number) => setChildren((prev) => prev.filter((_, idx) => idx !== i));
  const updateChild = (i: number, field: keyof ChildInfo, value: string) =>
    setChildren((prev) => prev.map((c, idx) => (idx === i ? { ...c, [field]: value } : c)));

  // Auto-sync children count when children array changes
  const syncChildCount = (count: number) => {
    set("children_count", String(count));
    set("children_number", String(count));
  };

  // ─── Steps ───────────────────────────────────────────────────────────────
  const STEPS: { key: Step; label: string; sw: string }[] = [
    { key: "location", label: "Location", sw: "Eneo" },
    { key: "personal", label: "Personal", sw: "Binafsi" },
    { key: "residence", label: "Residence", sw: "Makazi" },
    { key: "utilities", label: "Utilities", sw: "Huduma" },
    { key: "family", label: "Family", sw: "Familia" },
    { key: "status", label: "Status", sw: "Hadhi" },
    { key: "documents", label: "Documents", sw: "Nyaraka" },
    { key: "preview", label: "Preview", sw: "Hakiki" },
  ];
  const stepIdx = STEPS.findIndex((s) => s.key === step);
  const progress = ((stepIdx + 1) / STEPS.length) * 100;

  // ─── Validation ─────────────────────────────────────────────────────────
  const validate = (): boolean => {
    const e: Record<string, string> = {};
    const req = (key: string, label: string) => {
      if (!vals[key as keyof FormValues]) e[key] = `${label} ${L("inahitajika", "is required")}`;
    };

    if (step === "location") {
      req("region", L("Mkoa", "Region"));
      req("district", L("Wilaya", "District"));
      req("ward", L("Kata", "Ward"));
      if (!vals.village_street.trim())
        e.village_street = L("Mtaa unahitajika", "Street is required");
    }

    if (step === "personal") {
      req("marital_status", L("Hali ya ndoa", "Marital status"));
      req("occupation", L("Kazi", "Occupation"));
      if (vals.marital_status === "MARRIED") {
        if (!vals.spouse_name.trim())
          e.spouse_name = L("Jina la mke/mume linahitajika", "Spouse name required");
        if (!vals.spouse_phone.trim())
          e.spouse_phone = L("Simu ya mke/mume inahitajika", "Spouse phone required");
      }
      if (vals.has_children === "YES") {
        children.forEach((c, i) => {
          if (!c.name.trim())
            e[`child_name_${i}`] = L("Jina la mtoto linahitajika", "Child name required");
        });
      }
      if (!vals.has_children) e.has_children = L("Chagua jibu", "Select an answer");
    }

    if (step === "residence") {
      if (!vals.neighborhood.trim())
        e.neighborhood = L("Kitongoji kinahitajika", "Neighborhood required");
      if (!vals.house_number.trim())
        e.house_number = L("Namba ya nyumba inahitajika", "House number required");
      req("ownership_status", L("Hali ya umiliki", "Ownership status"));
      if (vals.ownership_status === "RENT") {
        if (!vals.landlord_name.trim())
          e.landlord_name = L("Jina la mpangishaji linahitajika", "Landlord name required");
        if (!vals.landlord_phone.trim())
          e.landlord_phone = L("Simu ya mpangishaji inahitajika", "Landlord phone required");
      }
      if (["FAMILY", "BUSINESS"].includes(vals.ownership_status)) {
        if (!vals.owner_name.trim())
          e.owner_name = L("Jina la mwenye nyumba linahitajika", "Property owner name required");
      }
    }

    if (step === "status") {
      req("residency_status", L("Hadhi ya ukazi", "Residency status"));
    }

    if (step === "documents") {
      if (!getDoc("selfie")) e.selfie = L("Picha ya uso inahitajika", "Selfie photo required");
      if (!getDoc("id_front"))
        e.id_front = L("Picha ya mbele ya ID inahitajika", "ID front photo required");
    }

    if (step === "preview") {
      if (!vals.terms_accepted)
        e.terms_accepted = L("Lazima uthibitishe taarifa", "You must confirm the information");
      if (!vals.data_confirmed) e.data_confirmed = L("Lazima ukubali", "You must consent");
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
      const ref = `RI-${new Date().getFullYear()}-${Math.floor(Math.random() * 900000 + 100000)}`;
      const files = docs.map((d) => d.file);
      const payload: Record<string, unknown> = {
        ...vals,
        children: children,
        family_count: Number(vals.family_count),
        dependents_count: Number(vals.dependents_count),
        children_count: Number(vals.children_count),
        elderly_count: Number(vals.elderly_count),
        years_at_residence: Number(vals.years_at_residence),
        document_types: docs.map((d) => d.type),
        applicant_signature: signature,
        service_name: "Utambulisho wa Mkazi",
        application_reference: ref,
      };
      await onSubmit(payload, files);
      setApplicationRef(ref);
      setSubmitted(true);
    } catch (e) {
      console.error("Submit error:", e);
    } finally {
      setSubmitting(false);
    }
  };

  // ─── Shared UI atoms ─────────────────────────────────────────────────────
  const inputCls = useCallback(
    (name: string) =>
      `w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all bg-white text-sm ${
        err(name) ? "border-red-400 bg-red-50" : "border-stone-200"
      }`,
    [err],
  );
  const lbl = "block text-xs font-bold text-stone-600 uppercase tracking-wider mb-1.5";
  const sectionHdr =
    "bg-gradient-to-r from-emerald-50 to-teal-50 px-4 py-3 rounded-xl border-l-4 border-emerald-500 mb-4";

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
    [clrErr, inputCls, t],
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
    [clrErr, inputCls],
  );

  // Document upload box
  const DocBox = ({
    type,
    label,
    hint,
    inputRef,
    maxSize,
    allowedTypes,
    accept,
    multiple = false,
    required = false,
  }: {
    type: UploadedDoc["type"];
    label: string;
    hint: string;
    inputRef: React.RefObject<HTMLInputElement | null>;
    maxSize: number;
    allowedTypes: string[];
    accept: string;
    multiple?: boolean;
    required?: boolean;
  }) => {
    const [fileErr, setFileErr] = useState("");
    const existing =
      type === "support"
        ? docs.filter((d) => d.type === "support")
        : ([getDoc(type)].filter(Boolean) as UploadedDoc[]);
    const hasDoc = existing.length > 0;

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = Array.from(e.target.files || []);
      let lastErr = "";
      files.forEach((f) => {
        const e = addDoc(f, type, label, maxSize, allowedTypes);
        if (e) lastErr = e;
        else clrErr(type);
      });
      if (lastErr) setFileErr(lastErr);
      else setFileErr("");
      e.target.value = "";
    };

    return (
      <div>
        <label className={lbl}>
          {label}
          {required && <span className="text-red-500 ml-0.5">*</span>}
        </label>
        <div
          onClick={() => inputRef.current?.click()}
          className={`border-2 border-dashed rounded-xl p-4 cursor-pointer transition-all
            ${hasDoc ? "border-emerald-400 bg-emerald-50" : err(type) || fileErr ? "border-red-400 bg-red-50" : "border-stone-300 hover:border-emerald-400 hover:bg-emerald-50/40"}`}
        >
          {hasDoc ? (
            <div className="space-y-2">
              {existing.map((doc, i) => (
                <div key={i} className="flex items-center gap-3 bg-white rounded-lg p-2 shadow-sm">
                  {doc.file.type.startsWith("image/") ? (
                    <img
                      src={doc.preview}
                      className="w-12 h-12 object-cover rounded-lg shrink-0"
                      alt=""
                    />
                  ) : (
                    <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center shrink-0">
                      <FileText size={20} className="text-red-600" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0 text-left">
                    <p className="text-xs font-bold text-stone-700 truncate">{doc.file.name}</p>
                    <p className="text-xs text-stone-400">{(doc.file.size / 1024).toFixed(0)} KB</p>
                  </div>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      removeDoc(docs.findIndex((d) => d === doc));
                    }}
                    className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-full shrink-0"
                  >
                    <X size={14} />
                  </button>
                </div>
              ))}
              <p className="text-xs text-emerald-600 font-medium">
                {multiple
                  ? L("Bonyeza kuongeza zaidi", "Click to add more")
                  : L("Bonyeza kubadilisha", "Click to change")}
              </p>
            </div>
          ) : (
            <div className="py-3 text-center">
              <Upload size={22} className="mx-auto text-stone-400 mb-2" />
              <p className="text-sm font-semibold text-stone-600">
                {L("Bonyeza kupakia", "Click to upload")}
              </p>
              <p className="text-xs text-stone-400 mt-1">{hint}</p>
            </div>
          )}
        </div>
        <input
          ref={inputRef}
          type="file"
          accept={accept}
          multiple={multiple}
          onChange={handleChange}
          className="hidden"
        />
        {(err(type) || fileErr) && (
          <p className="text-red-500 text-xs mt-1 flex items-center gap-1">
            <AlertCircle size={11} />
            {err(type) || fileErr}
          </p>
        )}
      </div>
    );
  };

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
      <div className="text-center space-y-6 py-6">
        <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mx-auto">
          <CheckCircle2 size={40} className="text-emerald-600" />
        </div>
        <div className="space-y-2">
          <h3 className="text-xl font-black text-stone-900">
            {L("Maombi Yamewasilishwa!", "Application Submitted!")}
          </h3>
          <p className="text-stone-500 text-sm">
            {L(
              "Maombi yako ya Utambulisho wa Mkazi yamewasilishwa kikamilifu.",
              "Your Resident Identity application has been submitted successfully.",
            )}
          </p>
        </div>
        <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-5 text-left space-y-3 max-w-sm mx-auto">
          <p className="text-xs font-black text-emerald-700 uppercase tracking-wider">
            {L("Namba ya Maombi", "Application Reference")}
          </p>
          <p className="text-2xl font-black text-emerald-800 font-mono">{applicationRef}</p>
          <div className="space-y-2 pt-2 border-t border-emerald-200">
            {[
              [L("Huduma", "Service"), L("Utambulisho wa Mkazi", "Resident Identity")],
              [L("Ada", "Fee"), "TSh 5,000"],
              [
                L("Tarehe", "Date"),
                new Date().toLocaleDateString(lang === "sw" ? "sw-TZ" : "en-US"),
              ],
              [L("Hali", "Status"), L("Inasubiri Ukaguzi", "Pending Review")],
            ].map(([lbl, val]) => (
              <div key={String(lbl)} className="flex justify-between text-sm">
                <span className="text-stone-500">{lbl}</span>
                <span className="font-bold text-stone-800">{val}</span>
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
                "Utapigiwa simu ndani ya siku 3–5 za kazi",
                "You will be called within 3–5 working days",
              ),
              L(
                "Hati itatolewa baada ya kulipa ada ya TSh 5,000",
                "Document will be issued after paying TSh 5,000 fee",
              ),
              L(
                "Hifadhi namba yako ya maombi kwa ajili ya ufuatiliaji",
                "Keep your reference number for follow-up",
              ),
            ].map((item, i) => (
              <li key={i} className="flex items-start gap-2 text-xs text-blue-700">
                <span className="w-4 h-4 rounded-full bg-blue-200 text-blue-700 flex items-center justify-center font-bold text-[10px] shrink-0 mt-0.5">
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
      // STEP 1 — ENEO LA MAKAZI (Location)
      // ══════════════════════════════════════════════════════════════════════
      case "location":
        return (
          <div className="space-y-5">
            <div className={sectionHdr}>
              <p className="font-bold text-emerald-800 text-sm flex items-center gap-2">
                <MapPin size={16} /> {L("ENEO LA MAKAZI", "RESIDENCE LOCATION")}
              </p>
              <p className="text-xs text-emerald-600 mt-0.5">
                {L(
                  "Chagua mkoa, wilaya, kata na mtaa wako wa sasa",
                  "Select your current region, district, ward and street",
                )}
              </p>
            </div>

            <Field name="region" label={L("Mkoa", "Region")} required>
              <Sel
                name="region"
                value={vals.region}
                onChange={(v) => {
                  set("region", v);
                  set("district", "");
                  set("ward", "");
                  clrErr("region");
                }}
                options={regions.map((r) => ({ label: r, value: r }))}
                placeholder={L("Chagua Mkoa", "Select Region")}
              />
            </Field>

            <Field name="district" label={L("Wilaya", "District")} required>
              <Sel
                name="district"
                value={vals.district}
                onChange={(v) => {
                  set("district", v);
                  set("ward", "");
                  clrErr("district");
                }}
                options={districts.map((d) => ({ label: d, value: d }))}
                placeholder={L("Chagua Wilaya", "Select District")}
              />
            </Field>

            <Field name="ward" label={L("Kata", "Ward")} required>
              <Sel
                name="ward"
                value={vals.ward}
                onChange={(v) => {
                  set("ward", v);
                  clrErr("ward");
                }}
                options={wards.map((w) => ({ label: w, value: w }))}
                placeholder={L("Chagua Kata", "Select Ward")}
              />
            </Field>

            <Field
              name="village_street"
              label={L("Kijiji / Mtaa", "Village / Street")}
              required
              hint={L(
                "Mfano: Mtaa wa Uhuru, Kijiji cha Makonde",
                "E.g. Uhuru Street, Makonde Village",
              )}
            >
              <TI
                name="village_street"
                value={vals.village_street}
                onChange={(v) => {
                  set("village_street", v);
                  clrErr("village_street");
                }}
                placeholder={L("Ingiza jina la mtaa au kijiji", "Enter street or village name")}
              />
            </Field>

            <Field
              name="mtaa_officer"
              label={L(
                "Jina la Mtendaji wa Mtaa (VEO/MEO)",
                "Village/Street Executive Officer (VEO/MEO)",
              )}
              hint={L(
                "Mfano: Bw. Juma Ali — Si lazima lakini husaidia ukaguzi",
                "E.g. Mr. Juma Ali — Optional but helps verification",
              )}
            >
              <TI
                name="mtaa_officer"
                value={vals.mtaa_officer}
                onChange={(v) => set("mtaa_officer", v)}
                placeholder={L("Jina la VEO/MEO wa mtaa wako", "Name of your local VEO/MEO")}
              />
            </Field>

            <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-3 flex gap-2">
              <Info size={15} className="text-emerald-600 shrink-0 mt-0.5" />
              <p className="text-xs text-emerald-700">
                {L(
                  "Madhumuni ya fomu hii ni KUJITAMBULISHA MKAZI kupitia Ofisi ya Serikali ya Mtaa.",
                  "This form is for RESIDENCY IDENTIFICATION through the Local Government Office.",
                )}
              </p>
            </div>
          </div>
        );

      // ══════════════════════════════════════════════════════════════════════
      // STEP 2 — TAARIFA BINAFSI (Personal)
      // ══════════════════════════════════════════════════════════════════════
      case "personal":
        return (
          <div className="space-y-5">
            <div className={sectionHdr}>
              <p className="font-bold text-emerald-800 text-sm flex items-center gap-2">
                <User size={16} /> {L("TAARIFA BINAFSI", "PERSONAL INFORMATION")}
              </p>
            </div>

            {/* NIDA Read-only card */}
            {userProfile && (
              <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-3">
                  <CheckCircle size={15} className="text-emerald-600" />
                  <span className="text-xs font-bold text-emerald-700 uppercase tracking-wide">
                    {L("Taarifa kutoka NIDA (Hazibadilishwi)", "From NIDA / Profile (Read-only)")}
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
                    [L("Jinsia", "Gender"), userProfile.gender || userProfile.sex || "—"],
                    [
                      L("Tarehe ya Kuzaliwa", "Date of Birth"),
                      userProfile?.date_of_birth
                        ? new Date(userProfile.date_of_birth).toLocaleDateString(
                            lang === "sw" ? "sw-TZ" : "en-GB",
                          )
                        : "—",
                    ],
                  ].map(([lbl, val]) => (
                    <div key={String(lbl)} className="bg-white rounded-lg px-3 py-2">
                      <p className="text-[9px] text-stone-400 uppercase tracking-wide">{lbl}</p>
                      <p className="text-xs font-bold text-stone-800 truncate">{val}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <Field name="marital_status" label={L("Hali ya Ndoa", "Marital Status")} required>
              <Sel
                name="marital_status"
                value={vals.marital_status}
                onChange={(v) => {
                  set("marital_status", v);
                  clrErr("marital_status");
                }}
                options={MARITAL_STATUS}
              />
            </Field>

            {/* Spouse section — shown only when MARRIED */}
            {vals.marital_status === "MARRIED" && (
              <div className="border border-emerald-200 rounded-xl overflow-hidden">
                <div className="bg-emerald-50 px-4 py-2.5 border-b border-emerald-100 flex items-center gap-2">
                  <Heart size={14} className="text-emerald-600" />
                  <span className="text-xs font-bold text-emerald-700 uppercase tracking-wide">
                    {L("TAARIFA ZA MKE / MUME", "SPOUSE INFORMATION")}
                  </span>
                </div>
                <div className="p-4 space-y-4">
                  <Field
                    name="spouse_name"
                    label={L("Jina Kamili la Mke/Mume", "Spouse Full Name")}
                    required
                  >
                    <TI
                      name="spouse_name"
                      value={vals.spouse_name}
                      onChange={(v) => {
                        set("spouse_name", v);
                        clrErr("spouse_name");
                      }}
                      placeholder={L("Jina kamili", "Full name")}
                    />
                  </Field>
                  <div className="grid grid-cols-2 gap-3">
                    <Field
                      name="spouse_nida"
                      label={L("NIDA ya Mke/Mume", "Spouse NIDA")}
                      hint={L("Hiari", "Optional")}
                    >
                      <TI
                        name="spouse_nida"
                        value={vals.spouse_nida}
                        onChange={(v) => set("spouse_nida", v)}
                        placeholder="XXXX-XXXX-XXXX-XXXX-XXXX"
                      />
                    </Field>
                    <Field
                      name="spouse_dob"
                      label={L("Tarehe ya Kuzaliwa", "Date of Birth")}
                      hint={L("Hiari", "Optional")}
                    >
                      <TI
                        name="spouse_dob"
                        value={vals.spouse_dob}
                        type="date"
                        onChange={(v) => set("spouse_dob", v)}
                      />
                    </Field>
                  </div>
                  <Field name="spouse_phone" label={L("Namba ya Simu", "Phone Number")} required>
                    <TI
                      name="spouse_phone"
                      value={vals.spouse_phone}
                      onChange={(v) => {
                        set("spouse_phone", v);
                        clrErr("spouse_phone");
                      }}
                      placeholder="+255 7XX XXX XXX"
                    />
                  </Field>
                  <Field
                    name="spouse_occupation"
                    label={L("Kazi/Shughuli ya Mke/Mume", "Spouse Occupation")}
                  >
                    <Sel
                      name="spouse_occupation"
                      value={vals.spouse_occupation}
                      onChange={(v) => set("spouse_occupation", v)}
                      options={OCCUPATIONS}
                      placeholder={L("Chagua Kazi", "Select Occupation")}
                    />
                  </Field>
                </div>
              </div>
            )}

            <Field name="occupation" label={L("Kazi / Shughuli Yako", "Your Occupation")} required>
              <Sel
                name="occupation"
                value={vals.occupation}
                onChange={(v) => {
                  set("occupation", v);
                  clrErr("occupation");
                }}
                options={OCCUPATIONS}
                placeholder={L("Chagua Kazi", "Select Occupation")}
              />
            </Field>

            <Field
              name="employer_name"
              label={L("Jina la Mwajiri / Kampuni (Hiari)", "Employer / Company Name (Optional)")}
            >
              <TI
                name="employer_name"
                value={vals.employer_name}
                onChange={(v) => set("employer_name", v)}
                placeholder={L("Mfano: Serikali, Kampuni XYZ", "E.g. Government, XYZ Company")}
              />
            </Field>

            {/* Children section */}
            <div className="border border-stone-200 rounded-xl overflow-hidden">
              <div className="bg-stone-50 px-4 py-2.5 border-b border-stone-100 flex items-center gap-2">
                <Baby size={14} className="text-stone-600" />
                <span className="text-xs font-bold text-stone-700 uppercase tracking-wide">
                  {L("TAARIFA ZA WATOTO", "CHILDREN INFORMATION")}
                </span>
              </div>
              <div className="p-4 space-y-4">
                <Field
                  name="has_children"
                  label={L("Je, una watoto?", "Do you have children?")}
                  required
                >
                  <Sel
                    name="has_children"
                    value={vals.has_children}
                    onChange={(v) => {
                      set("has_children", v);
                      clrErr("has_children");
                      if (v === "NO") {
                        setChildren([]);
                        syncChildCount(0);
                      }
                    }}
                    options={YES_NO}
                  />
                </Field>

                {vals.has_children === "YES" && (
                  <div className="space-y-4">
                    {children.map((child, i) => (
                      <div
                        key={i}
                        className="bg-stone-50 rounded-xl p-3 space-y-3 border border-stone-100"
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-stone-600">
                            {L(`Mtoto ${i + 1}`, `Child ${i + 1}`)}
                          </span>
                          <button
                            type="button"
                            onClick={() => {
                              removeChild(i);
                              syncChildCount(children.length - 1);
                            }}
                            className="p-1 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-full transition-colors"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <Field
                            name={`child_name_${i}`}
                            label={L("Jina Kamili", "Full Name")}
                            required
                          >
                            <input
                              value={child.name}
                              onChange={(e) => {
                                updateChild(i, "name", e.target.value);
                                clrErr(`child_name_${i}`);
                              }}
                              placeholder={L("Jina la mtoto", "Child's name")}
                              className={inputCls(`child_name_${i}`)}
                            />
                          </Field>
                          <Field
                            name={`child_dob_${i}`}
                            label={L("Tarehe ya Kuzaliwa", "Date of Birth")}
                          >
                            <input
                              type="date"
                              value={child.dob}
                              onChange={(e) => updateChild(i, "dob", e.target.value)}
                              className={inputCls(`child_dob_${i}`)}
                            />
                          </Field>
                        </div>
                      </div>
                    ))}
                    {children.length < 10 && (
                      <button
                        type="button"
                        onClick={() => {
                          addChild();
                          syncChildCount(children.length + 1);
                        }}
                        className="w-full py-2.5 border-2 border-dashed border-emerald-300 text-emerald-600 rounded-xl text-sm font-bold hover:bg-emerald-50 transition-colors flex items-center justify-center gap-2"
                      >
                        <Plus size={15} /> {L("Ongeza Mtoto", "Add Child")}
                      </button>
                    )}
                    {children.length === 0 && (
                      <p className="text-xs text-amber-600 bg-amber-50 rounded-lg p-3">
                        {L(
                          'Bonyeza "Ongeza Mtoto" kuandika majina ya watoto wako',
                          'Click "Add Child" to enter your children\'s details',
                        )}
                      </p>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        );

      // ══════════════════════════════════════════════════════════════════════
      // STEP 3 — TAARIFA ZA MAKAZI (Residence)
      // ══════════════════════════════════════════════════════════════════════
      case "residence":
        return (
          <div className="space-y-5">
            <div className={sectionHdr}>
              <p className="font-bold text-emerald-800 text-sm flex items-center gap-2">
                <Home size={16} /> {L("TAARIFA ZA MAKAZI", "RESIDENCE DETAILS")}
              </p>
            </div>

            <Field
              name="neighborhood"
              label={L("Kitongoji", "Neighborhood / Sub-area")}
              required
              hint={L("Mfano: Upanga, Kariakoo, Sinza B", "E.g. Upanga, Kariakoo, Sinza B")}
            >
              <TI
                name="neighborhood"
                value={vals.neighborhood}
                onChange={(v) => {
                  set("neighborhood", v);
                  clrErr("neighborhood");
                }}
                placeholder={L("Kitongoji unachokaa", "Neighborhood you live in")}
              />
            </Field>

            <div className="grid grid-cols-2 gap-3">
              <Field name="house_number" label={L("Namba ya Nyumba", "House Number")} required>
                <TI
                  name="house_number"
                  value={vals.house_number}
                  onChange={(v) => {
                    set("house_number", v);
                    clrErr("house_number");
                  }}
                  placeholder="HN 123"
                />
              </Field>
              <Field name="plot_number" label={L("Namba ya Plot", "Plot Number")}>
                <TI
                  name="plot_number"
                  value={vals.plot_number}
                  onChange={(v) => set("plot_number", v)}
                  placeholder="Plot 45"
                />
              </Field>
              <Field name="block_number" label="Block / Area">
                <TI
                  name="block_number"
                  value={vals.block_number}
                  onChange={(v) => set("block_number", v)}
                  placeholder="Block F"
                />
              </Field>
              <Field name="move_in_date" label={L("Tarehe ya Kuhamia", "Move-in Date")}>
                <TI
                  name="move_in_date"
                  value={vals.move_in_date}
                  type="date"
                  onChange={(v) => set("move_in_date", v)}
                />
              </Field>
            </div>

            <Field
              name="years_at_residence"
              label={L("Miaka ya Kukaa Hapa", "Years at this Residence")}
              required
            >
              <Sel
                name="years_at_residence"
                value={vals.years_at_residence}
                onChange={(v) => set("years_at_residence", v)}
                options={YEARS_OPTIONS}
              />
            </Field>

            <Field
              name="ownership_status"
              label={L("Hali ya Umiliki wa Nyumba", "House Ownership Status")}
              required
            >
              <Sel
                name="ownership_status"
                value={vals.ownership_status}
                onChange={(v) => {
                  set("ownership_status", v);
                  clrErr("ownership_status");
                  set("landlord_name", "");
                  set("landlord_phone", "");
                  set("owner_name", "");
                }}
                options={OWNERSHIP_STATUS}
              />
            </Field>

            {/* Landlord details — shown when RENT */}
            {vals.ownership_status === "RENT" && (
              <div className="border border-amber-200 rounded-xl overflow-hidden">
                <div className="bg-amber-50 px-4 py-2.5 border-b border-amber-100 flex items-center gap-2">
                  <Key size={14} className="text-amber-600" />
                  <span className="text-xs font-bold text-amber-700 uppercase tracking-wide">
                    {L("TAARIFA ZA MPANGISHAJI", "LANDLORD INFORMATION")}
                  </span>
                </div>
                <div className="p-4 space-y-4">
                  <Field
                    name="landlord_name"
                    label={L("Jina Kamili la Mpangishaji", "Landlord Full Name")}
                    required
                  >
                    <TI
                      name="landlord_name"
                      value={vals.landlord_name}
                      onChange={(v) => {
                        set("landlord_name", v);
                        clrErr("landlord_name");
                      }}
                      placeholder={L("Jina la mwenye nyumba", "Landlord's name")}
                    />
                  </Field>
                  <Field
                    name="landlord_phone"
                    label={L("Simu ya Mpangishaji", "Landlord Phone")}
                    required
                  >
                    <TI
                      name="landlord_phone"
                      value={vals.landlord_phone}
                      onChange={(v) => {
                        set("landlord_phone", v);
                        clrErr("landlord_phone");
                      }}
                      placeholder="+255 7XX XXX XXX"
                    />
                  </Field>
                </div>
              </div>
            )}

            {/* Property owner — shown when FAMILY or BUSINESS */}
            {["FAMILY", "BUSINESS"].includes(vals.ownership_status) && (
              <div className="border border-blue-200 rounded-xl overflow-hidden">
                <div className="bg-blue-50 px-4 py-2.5 border-b border-blue-100 flex items-center gap-2">
                  <Building2 size={14} className="text-blue-600" />
                  <span className="text-xs font-bold text-blue-700 uppercase tracking-wide">
                    {vals.ownership_status === "FAMILY"
                      ? L("TAARIFA ZA MWENYE NYUMBA (NDUGU)", "PROPERTY OWNER (RELATIVE)")
                      : L("TAARIFA ZA MWENYE NYUMBA / MWAJIRI", "PROPERTY OWNER / EMPLOYER")}
                  </span>
                </div>
                <div className="p-4">
                  <Field
                    name="owner_name"
                    label={L("Jina la Mwenye Nyumba", "Property Owner Name")}
                    required
                  >
                    <TI
                      name="owner_name"
                      value={vals.owner_name}
                      onChange={(v) => {
                        set("owner_name", v);
                        clrErr("owner_name");
                      }}
                      placeholder={L("Jina kamili la mwenye nyumba", "Property owner's full name")}
                    />
                  </Field>
                </div>
              </div>
            )}
          </div>
        );

      // ══════════════════════════════════════════════════════════════════════
      // STEP 4 — HUDUMA NA BILI (Utilities — Optional)
      // ══════════════════════════════════════════════════════════════════════
      case "utilities":
        return (
          <div className="space-y-5">
            <div className={sectionHdr}>
              <p className="font-bold text-emerald-800 text-sm flex items-center gap-2">
                <Zap size={16} /> {L("HUDUMA NA BILI (Hiari)", "UTILITIES & BILLS (Optional)")}
              </p>
              <p className="text-xs text-emerald-600 mt-0.5">
                {L(
                  "Kujaza sehemu hii husaidia kuthibitisha makazi yako haraka zaidi",
                  "Filling this section helps verify your residence faster",
                )}
              </p>
            </div>

            <Field
              name="electricity_bill"
              label={L("Namba ya Akaunti ya Stima (TANESCO)", "Electricity Account No. (TANESCO)")}
              hint={L("Inaonekana kwenye ankara yako ya stima", "Found on your electricity bill")}
            >
              <div className="relative">
                <Zap
                  size={15}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-amber-500 pointer-events-none"
                />
                <input
                  value={vals.electricity_bill}
                  onChange={(e) => set("electricity_bill", e.target.value)}
                  placeholder="Mfano: 12345678"
                  className="w-full pl-9 pr-4 py-3 border border-stone-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none bg-white text-sm transition-all"
                />
              </div>
            </Field>

            <Field
              name="water_bill"
              label={L(
                "Namba ya Akaunti ya Maji (DAWASA/DAWASCO)",
                "Water Account No. (DAWASA/DAWASCO)",
              )}
              hint={L("Inaonekana kwenye ankara yako ya maji", "Found on your water bill")}
            >
              <div className="relative">
                <Droplet
                  size={15}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-blue-500 pointer-events-none"
                />
                <input
                  value={vals.water_bill}
                  onChange={(e) => set("water_bill", e.target.value)}
                  placeholder="Mfano: 87654321"
                  className="w-full pl-9 pr-4 py-3 border border-stone-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none bg-white text-sm transition-all"
                />
              </div>
            </Field>

            <Field
              name="property_tax"
              label={L(
                "Namba ya Kodi ya Nyumba (TRA/Halmashauri)",
                "Property Tax Reference (TRA/Council)",
              )}
              hint={L(
                "Inaonekana kwenye stakabadhi ya kodi ya nyumba",
                "Found on your property tax receipt",
              )}
            >
              <div className="relative">
                <Hash
                  size={15}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400 pointer-events-none"
                />
                <input
                  value={vals.property_tax}
                  onChange={(e) => set("property_tax", e.target.value)}
                  placeholder="Mfano: PT-2024-12345"
                  className="w-full pl-9 pr-4 py-3 border border-stone-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none bg-white text-sm transition-all"
                />
              </div>
            </Field>

            <div className="bg-blue-50 border border-blue-100 rounded-xl p-3 flex gap-2">
              <Shield size={15} className="text-blue-500 shrink-0 mt-0.5" />
              <p className="text-xs text-blue-700">
                {L(
                  "Taarifa hizi zinalindwa kisheria na hazitumiki kwa madhumuni mengine isipokuwa uthibitisho wa makazi yako.",
                  "This information is legally protected and only used to verify your residence.",
                )}
              </p>
            </div>
          </div>
        );

      // ══════════════════════════════════════════════════════════════════════
      // STEP 5 — FAMILIA NA WATEGEMEZI (Family & Dependents)
      // ══════════════════════════════════════════════════════════════════════
      case "family":
        return (
          <div className="space-y-5">
            <div className={sectionHdr}>
              <p className="font-bold text-emerald-800 text-sm flex items-center gap-2">
                <Users size={16} /> {L("FAMILIA NA WATEGEMEZI", "FAMILY AND DEPENDENTS")}
              </p>
              <p className="text-xs text-emerald-600 mt-0.5">
                {L(
                  "Hesabu ya watu wote wanaoishi pamoja nawe",
                  "Count of all people living with you",
                )}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Field
                name="family_count"
                label={L("Jumla ya Wanafamilia", "Total Family Members")}
                required
              >
                <Sel
                  name="family_count"
                  value={vals.family_count}
                  onChange={(v) => set("family_count", v)}
                  options={COUNT_OPTIONS}
                />
              </Field>
              <Field
                name="dependents_count"
                label={L("Idadi ya Wategemezi", "Number of Dependents")}
                required
              >
                <Sel
                  name="dependents_count"
                  value={vals.dependents_count}
                  onChange={(v) => set("dependents_count", v)}
                  options={COUNT_OPTIONS}
                />
              </Field>
              <Field
                name="children_count"
                label={L("Watoto (chini ya miaka 18)", "Children (under 18)")}
              >
                <Sel
                  name="children_count"
                  value={vals.children_count}
                  onChange={(v) => set("children_count", v)}
                  options={CHILD_COUNT_OPTIONS}
                />
              </Field>
              <Field
                name="elderly_count"
                label={L("Wazee (zaidi ya miaka 60)", "Elderly (over 60)")}
              >
                <Sel
                  name="elderly_count"
                  value={vals.elderly_count}
                  onChange={(v) => set("elderly_count", v)}
                  options={CHILD_COUNT_OPTIONS}
                />
              </Field>
            </div>

            <Field
              name="has_disability"
              label={L(
                "Je, kuna mwanafamilia mwenye ulemavu?",
                "Any family member with a disability?",
              )}
            >
              <Sel
                name="has_disability"
                value={vals.has_disability}
                onChange={(v) => set("has_disability", v)}
                options={YES_NO}
              />
            </Field>

            <div className="bg-stone-50 rounded-xl p-3 border border-stone-100">
              <p className="text-xs text-stone-500 leading-relaxed">
                {L(
                  "Kumbuka: Hesabu ya wanafamilia inajumuisha wewe mwenyewe, mke/mume, watoto, wazee, na wategemezi wote wanaoishi katika nyumba moja nawe.",
                  "Note: Family count includes yourself, spouse, children, elderly, and all dependents living in the same house.",
                )}
              </p>
            </div>
          </div>
        );

      // ══════════════════════════════════════════════════════════════════════
      // STEP 6 — HADHI YA UKAZI + SABABU (Status & Purpose)
      // ══════════════════════════════════════════════════════════════════════
      case "status":
        return (
          <div className="space-y-5">
            <div className={sectionHdr}>
              <p className="font-bold text-emerald-800 text-sm flex items-center gap-2">
                <Star size={16} /> {L("SABABU NA HADHI YA UKAZI", "PURPOSE & RESIDENCY STATUS")}
              </p>
            </div>

            {/* Purpose — locked: this service is purely for resident identification */}
            <div>
              <label className={lbl}>{L("Madhumuni ya Maombi", "Purpose of Application")}</label>
              <div className="w-full px-4 py-3 border border-emerald-300 rounded-xl bg-emerald-50 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CheckCircle size={15} className="text-emerald-600 shrink-0" />
                  <div>
                    <p className="text-sm font-bold text-emerald-800">
                      {L("Kujitambulisha Mkazi", "Resident Self-Introduction")}
                    </p>
                    <p className="text-xs text-emerald-600">
                      {L(
                        "Uthibitisho rasmi wa kuishi katika mtaa/kijiji hiki",
                        "Official confirmation of residing in this street/village",
                      )}
                    </p>
                  </div>
                </div>
                <span className="text-[10px] font-bold text-emerald-600 bg-emerald-200 px-2 py-0.5 rounded-full uppercase tracking-wide shrink-0">
                  {L("Imewekwa", "Fixed")}
                </span>
              </div>
            </div>

            <div className="bg-blue-50 border border-blue-100 rounded-xl p-3 flex gap-2">
              <Info size={14} className="text-blue-500 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <p className="text-xs font-bold text-blue-700">
                  {L(
                    "Unahitaji barua kwa ajili ya Benki, Kazi, Shule, n.k.?",
                    "Need a letter for Bank, Employment, School, etc.?",
                  )}
                </p>
                <p className="text-xs text-blue-600">
                  {L(
                    'Omba huduma ya "Barua ya Utambulisho" baada ya kupata Utambulisho huu wa Mkazi.',
                    'Apply for the "Introduction Letter" service after receiving this Resident Identity.',
                  )}
                </p>
              </div>
            </div>

            <Field name="residency_status" label={L("Hadhi ya Ukazi", "Residency Status")} required>
              <Sel
                name="residency_status"
                value={vals.residency_status}
                onChange={(v) => {
                  set("residency_status", v);
                  clrErr("residency_status");
                }}
                options={RESIDENCY_STATUS}
              />
            </Field>

            {/* Work permit — only for FOREIGNER */}
            {vals.residency_status === "FOREIGNER" && (
              <Field name="work_permit" label={L("Kibali cha Kazi (Work Permit)", "Work Permit")}>
                <Sel
                  name="work_permit"
                  value={vals.work_permit}
                  onChange={(v) => set("work_permit", v)}
                  options={WORK_PERMIT_OPTIONS}
                />
              </Field>
            )}

            {/* Passport + country — for FOREIGNER or DIASPORA */}
            {["FOREIGNER", "DIASPORA"].includes(vals.residency_status) && (
              <div className="border border-stone-200 rounded-xl overflow-hidden">
                <div className="bg-stone-50 px-4 py-2.5 border-b border-stone-100 flex items-center gap-2">
                  <Globe size={14} className="text-stone-600" />
                  <span className="text-xs font-bold text-stone-700 uppercase tracking-wide">
                    {L("TAARIFA ZA NCHI YA ASILI", "COUNTRY OF ORIGIN DETAILS")}
                  </span>
                </div>
                <div className="p-4 space-y-4">
                  <Field name="passport_number" label={L("Namba ya Pasipoti", "Passport Number")}>
                    <TI
                      name="passport_number"
                      value={vals.passport_number}
                      onChange={(v) => set("passport_number", v)}
                      placeholder="Mfano: AB123456"
                    />
                  </Field>
                  <Field
                    name="country_of_origin"
                    label={L("Nchi ya Asili / Uraia", "Country of Origin / Citizenship")}
                  >
                    <TI
                      name="country_of_origin"
                      value={vals.country_of_origin}
                      onChange={(v) => set("country_of_origin", v)}
                      placeholder={L("Mfano: Kenya, Uganda, India", "E.g. Kenya, Uganda, India")}
                    />
                  </Field>
                </div>
              </div>
            )}
          </div>
        );

      // ══════════════════════════════════════════════════════════════════════
      // STEP 7 — PAKIA NYARAKA (Documents)
      // ══════════════════════════════════════════════════════════════════════
      case "documents":
        return (
          <div className="space-y-5">
            <div className={sectionHdr}>
              <p className="font-bold text-emerald-800 text-sm flex items-center gap-2">
                <Camera size={16} /> {L("PAKIA NYARAKA", "UPLOAD DOCUMENTS")}
              </p>
              <p className="text-xs text-emerald-600 mt-0.5">
                {L(
                  "Picha na nyaraka lazima ziwe wazi, kamili na zinazosomeka",
                  "Photos and documents must be clear, complete and legible",
                )}
              </p>
            </div>

            {/* Selfie — REQUIRED */}
            <DocBox
              type="selfie"
              label={L(
                "Picha ya Uso Wako (Selfie) — LAZIMA",
                "Your Face Photo (Selfie) — REQUIRED",
              )}
              hint={L(
                "Picha yako wazi ukitazama kamera moja kwa moja · JPG/PNG · Max 5MB",
                "Clear face photo looking straight at camera · JPG/PNG · Max 5MB",
              )}
              inputRef={selfieRef}
              maxSize={MAX_SELFIE_SIZE}
              allowedTypes={ALLOWED_IMAGES}
              accept="image/jpeg,image/png,image/webp"
              required
            />

            {/* ID Front — REQUIRED */}
            <DocBox
              type="id_front"
              label={L("Picha ya Mbele ya Kitambulisho — LAZIMA", "ID Front Photo — REQUIRED")}
              hint={L(
                "NIDA, Pasipoti, Kadi ya Mpiga Kura, au kitambulisho kingine · JPG/PNG/PDF · Max 5MB",
                "NIDA, Passport, Voter ID, or other valid ID · JPG/PNG/PDF · Max 5MB",
              )}
              inputRef={idFrontRef}
              maxSize={MAX_ID_SIZE}
              allowedTypes={ALLOWED_DOCS}
              accept="image/jpeg,image/png,image/webp,application/pdf"
              required
            />

            {/* ID Back — Optional */}
            <DocBox
              type="id_back"
              label={L("Picha ya Nyuma ya Kitambulisho (Hiari)", "ID Back Photo (Optional)")}
              hint={L(
                "Upande wa nyuma wa kitambulisho chako · JPG/PNG/PDF · Max 5MB",
                "Back side of your ID document · JPG/PNG/PDF · Max 5MB",
              )}
              inputRef={idBackRef}
              maxSize={MAX_ID_SIZE}
              allowedTypes={ALLOWED_DOCS}
              accept="image/jpeg,image/png,image/webp,application/pdf"
            />

            {/* Proof of residence — Optional */}
            <DocBox
              type="proof_residence"
              label={L("Uthibitisho wa Makazi (Hiari)", "Proof of Residence (Optional)")}
              hint={L(
                "Ankara ya stima/maji, risiti ya kodi ya nyumba · JPG/PNG/PDF · Max 10MB",
                "Electricity/water bill, property tax receipt · JPG/PNG/PDF · Max 10MB",
              )}
              inputRef={proofRef}
              maxSize={MAX_DOC_SIZE}
              allowedTypes={ALLOWED_DOCS}
              accept="image/jpeg,image/png,image/webp,application/pdf"
            />

            {/* Additional support docs — Optional, multiple */}
            <DocBox
              type="support"
              label={L("Nyaraka za Ziada (Hiari)", "Additional Support Documents (Optional)")}
              hint={L(
                "Nyaraka nyingine zinazohusiana na maombi yako · Max 10MB kila moja",
                "Any other documents relevant to your application · Max 10MB each",
              )}
              inputRef={supportRef}
              maxSize={MAX_DOC_SIZE}
              allowedTypes={ALLOWED_DOCS}
              accept="image/jpeg,image/png,image/webp,application/pdf"
              multiple
            />

            <div className="bg-blue-50 border border-blue-100 rounded-xl p-3 flex gap-2">
              <Shield size={14} className="text-blue-500 shrink-0 mt-0.5" />
              <p className="text-xs text-blue-700">
                {L(
                  "Nyaraka zako zinalindwa kikamilifu na hazishirikishwi na mtu yeyote bila idhini yako.",
                  "Your documents are fully protected and not shared with anyone without your consent.",
                )}
              </p>
            </div>
          </div>
        );

      // ══════════════════════════════════════════════════════════════════════
      // STEP 8 — HAKIKI NA WASILISHA (Preview & Submit)
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
                    'Angalia kwa makini. Bonyeza "Hariri" kwenye sehemu yoyote kubadilisha taarifa.',
                    'Check carefully. Click "Edit" on any section to change information.',
                  )}
                </p>
              </div>
            </div>

            {/* Applicant from profile */}
            <PSection
              icon={<User size={14} />}
              title={L("Taarifa za Muombaji", "Applicant Details")}
              stepKey="personal"
            >
              <PRow
                label={L("Jina Kamili", "Full Name")}
                value={`${userProfile?.first_name || ""} ${userProfile?.middle_name || ""} ${userProfile?.last_name || ""}`.trim()}
              />
              <PRow label="NIDA" value={userProfile?.nida_number} />
              <PRow label={L("Simu", "Phone")} value={userProfile?.phone} />
              <PRow label="Email" value={userProfile?.email} />
              <PRow label={L("Jinsia", "Gender")} value={userProfile?.gender} />
              <PRow
                label={L("Tarehe ya Kuzaliwa", "Date of Birth")}
                value={userProfile?.date_of_birth}
              />
            </PSection>

            {/* Location */}
            <PSection
              icon={<MapPin size={14} />}
              title={L("Eneo la Makazi", "Residence Location")}
              stepKey="location"
            >
              <PRow label={L("Mkoa", "Region")} value={vals.region} />
              <PRow label={L("Wilaya", "District")} value={vals.district} />
              <PRow label={L("Kata", "Ward")} value={vals.ward} />
              <PRow label={L("Kijiji/Mtaa", "Village/Street")} value={vals.village_street} />
              {vals.mtaa_officer && (
                <PRow
                  label={L("Mtendaji (VEO/MEO)", "VEO/MEO Officer")}
                  value={vals.mtaa_officer}
                />
              )}
            </PSection>

            {/* Personal */}
            <PSection
              icon={<Briefcase size={14} />}
              title={L("Taarifa Binafsi", "Personal Info")}
              stepKey="personal"
            >
              <PRow
                label={L("Hali ya Ndoa", "Marital Status")}
                value={MARITAL_STATUS.find((m) => m.value === vals.marital_status)?.label}
              />
              <PRow
                label={L("Kazi", "Occupation")}
                value={OCCUPATIONS.find((o) => o.value === vals.occupation)?.label}
              />
              {vals.employer_name && (
                <PRow label={L("Mwajiri", "Employer")} value={vals.employer_name} />
              )}
              {vals.marital_status === "MARRIED" && (
                <>
                  <PRow label={L("Jina la Mke/Mume", "Spouse Name")} value={vals.spouse_name} />
                  <PRow label={L("Simu ya Mke/Mume", "Spouse Phone")} value={vals.spouse_phone} />
                  {vals.spouse_occupation && (
                    <PRow
                      label={L("Kazi ya Mke/Mume", "Spouse Occupation")}
                      value={OCCUPATIONS.find((o) => o.value === vals.spouse_occupation)?.label}
                    />
                  )}
                </>
              )}
              <PRow
                label={L("Watoto", "Children")}
                value={
                  vals.has_children === "YES"
                    ? `${L("Ndiyo", "Yes")} (${children.length})`
                    : L("Hapana", "No")
                }
              />
              {children.length > 0 &&
                children.map((c, i) => (
                  <PRow
                    key={i}
                    label={L(`Mtoto ${i + 1}`, `Child ${i + 1}`)}
                    value={`${c.name}${c.dob ? ` · ${c.dob}` : ""}`}
                  />
                ))}
            </PSection>

            {/* Residence */}
            <PSection
              icon={<Home size={14} />}
              title={L("Makazi", "Residence")}
              stepKey="residence"
            >
              <PRow label={L("Kitongoji", "Neighborhood")} value={vals.neighborhood} />
              <PRow label={L("Namba ya Nyumba", "House No.")} value={vals.house_number} />
              {vals.plot_number && <PRow label="Plot No." value={vals.plot_number} />}
              {vals.block_number && <PRow label="Block" value={vals.block_number} />}
              <PRow
                label={L("Umiliki", "Ownership")}
                value={OWNERSHIP_STATUS.find((o) => o.value === vals.ownership_status)?.label}
              />
              {vals.ownership_status === "RENT" && (
                <>
                  <PRow label={L("Jina la Mpangishaji", "Landlord")} value={vals.landlord_name} />
                  <PRow
                    label={L("Simu ya Mpangishaji", "Landlord Phone")}
                    value={vals.landlord_phone}
                  />
                </>
              )}
              {["FAMILY", "BUSINESS"].includes(vals.ownership_status) && (
                <PRow label={L("Mwenye Nyumba", "Owner")} value={vals.owner_name} />
              )}
              <PRow label={L("Miaka ya Kukaa", "Years Here")} value={vals.years_at_residence} />
              {vals.move_in_date && (
                <PRow label={L("Tarehe ya Kuhamia", "Move-in Date")} value={vals.move_in_date} />
              )}
            </PSection>

            {/* Utilities */}
            <PSection
              icon={<Zap size={14} />}
              title={L("Huduma za Umma", "Utilities")}
              stepKey="utilities"
            >
              <PRow
                label={L("Namba ya Stima", "Electricity No.")}
                value={vals.electricity_bill || "—"}
              />
              <PRow label={L("Namba ya Maji", "Water No.")} value={vals.water_bill || "—"} />
              <PRow
                label={L("Kodi ya Nyumba", "Property Tax No.")}
                value={vals.property_tax || "—"}
              />
            </PSection>

            {/* Family */}
            <PSection icon={<Users size={14} />} title={L("Familia", "Family")} stepKey="family">
              <PRow label={L("Jumla Familia", "Total Family")} value={vals.family_count} />
              <PRow label={L("Wategemezi", "Dependents")} value={vals.dependents_count} />
              <PRow label={L("Watoto (<18)", "Children (<18)")} value={vals.children_count} />
              <PRow label={L("Wazee (>60)", "Elderly (>60)")} value={vals.elderly_count} />
              <PRow
                label={L("Ulemavu", "Disability in Family")}
                value={vals.has_disability === "YES" ? L("Ndiyo", "Yes") : L("Hapana", "No")}
              />
            </PSection>

            {/* Status & Purpose */}
            <PSection
              icon={<Activity size={14} />}
              title={L("Sababu na Hadhi", "Purpose & Status")}
              stepKey="status"
            >
              <PRow
                label={L("Aina ya Hati", "Document Type")}
                value={L("Utambulisho wa Mkazi", "Resident Identity")}
              />
              <PRow
                label={L("Madhumuni", "Purpose")}
                value={L("Kujitambulisha Mkazi", "Resident Self-Introduction")}
              />
              <PRow
                label={L("Hadhi ya Ukazi", "Residency Status")}
                value={RESIDENCY_STATUS.find((r) => r.value === vals.residency_status)?.label}
              />
              {vals.residency_status === "FOREIGNER" && (
                <PRow
                  label="Work Permit"
                  value={WORK_PERMIT_OPTIONS.find((w) => w.value === vals.work_permit)?.label}
                />
              )}
              {vals.passport_number && (
                <PRow label={L("Pasipoti", "Passport")} value={vals.passport_number} />
              )}
              {vals.country_of_origin && (
                <PRow
                  label={L("Nchi ya Asili", "Country of Origin")}
                  value={vals.country_of_origin}
                />
              )}
            </PSection>

            {/* Documents */}
            <PSection
              icon={<FileText size={14} />}
              title={L("Nyaraka Zilizopakiwa", "Uploaded Documents")}
              stepKey="documents"
            >
              {docs.length === 0 ? (
                <p className="col-span-2 text-xs text-stone-400">
                  {L("Hakuna nyaraka zilizopakiwa", "No documents uploaded")}
                </p>
              ) : (
                docs.map((d, i) => (
                  <div
                    key={i}
                    className="col-span-2 flex items-center gap-3 py-1.5 border-b border-stone-50 last:border-0"
                  >
                    {d.file.type.startsWith("image/") ? (
                      <img
                        src={d.preview}
                        className="w-9 h-9 object-cover rounded-lg border border-stone-200 shrink-0"
                        alt=""
                      />
                    ) : (
                      <div className="w-9 h-9 bg-red-100 rounded-lg flex items-center justify-center shrink-0">
                        <FileText size={16} className="text-red-500" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold text-stone-700 truncate">{d.label}</p>
                      <p className="text-xs text-stone-400 truncate">{d.file.name}</p>
                    </div>
                    <CheckCircle size={14} className="text-emerald-500 shrink-0" />
                  </div>
                ))
              )}
            </PSection>

            {/* Fee */}
            <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 flex justify-between items-center">
              <span className="font-bold text-emerald-800 text-sm">
                {L("Ada ya Maombi:", "Application Fee:")}
              </span>
              <span className="text-xl font-black text-emerald-600">TSh 5,000</span>
            </div>

            {/* Consent checkboxes */}
            <div className="space-y-3 pt-1">
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
                  sw: "Ninakubali kutoa taarifa hizi kwa Serikali ya Mtaa kwa madhumuni ya utambulisho wa mkazi pekee.",
                  en: "I consent to provide this information to the Local Government for residency identification purposes only.",
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

            {/* Applicant electronic signature */}
            <div className="bg-white border border-stone-200 rounded-2xl p-4">
              <p className="text-sm font-bold text-stone-700 mb-1">
                {L("Saini ya Kielektroniki", "Electronic Signature")}
              </p>
              <p className="text-xs text-stone-400 mb-3">
                {L(
                  "Saini hapa chini kuthibitisha maombi haya.",
                  "Sign below to confirm this application.",
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

export default UtambulishoMkaziForm;
