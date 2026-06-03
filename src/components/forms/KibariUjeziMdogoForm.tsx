/**
 * Kibari cha Ujezi Mdogo — Minor Construction Permit Form
 * Built from scratch: 5 steps, property details, construction type,
 * contractor, neighbor consent, document upload, edit-in-preview,
 * consent, success screen
 *
 * Fee: TSh 15,000
 * Color theme: Amber/orange (construction)
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
  Home,
  User,
  AlertCircle,
  Shield,
  Info,
  Upload,
  X,
  Edit2,
  FileText,
  Check,
  Hammer,
  MapPin,
  Calendar,
  Users,
  Ruler,
  DollarSign,
  Wrench,
} from "lucide-react";
import { FormProps, labels } from "./types";
import { ProgressFill } from "../ui/ProgressFill";
import { TANZANIA_ADDRESS_DATA } from "@/lib/addressData";

// ─── Constants ───────────────────────────────────────────────────────────────

const SERVICE_FEE = 15000;

const CONSTRUCTION_TYPES = [
  { label: "Uzio / Ukuta (Fence / Boundary Wall)", value: "UZIO" },
  { label: "Barabaka Ndogo / Njia (Small Road / Footpath)", value: "BARABAKA" },
  { label: "Marekebisho ya Nyumba (House Renovation / Repairs)", value: "MAREKEBISHO" },
  { label: "Chumba cha Ziada / Upanuzi (Extension Room)", value: "UPANUZI" },
  { label: "Bwawa / Tangi / Kisima (Water Tank / Well / Pond)", value: "BWAWA" },
  { label: "Banda la Magari (Car Shelter / Garage)", value: "GARAGE" },
  { label: "Choo cha Nje (Outdoor Latrine / Toilet)", value: "CHOO" },
  { label: "Nyingine (Other — specify)", value: "NYINGINE" },
];

const OWNERSHIP_TYPES = [
  { label: "Nimiliki (I am the owner)", value: "OWNER" },
  {
    label: "Nakodi — Nimepata Idhini ya Mwenye Nyumba (Tenant — with owner approval)",
    value: "TENANT",
  },
  { label: "Familia (Family property)", value: "FAMILY" },
];

const MATERIAL_OPTIONS = [
  { label: "Zege / Simiti (Concrete)", value: "CONCRETE" },
  { label: "Matofali (Bricks)", value: "BRICKS" },
  { label: "Mbao (Timber / Wood)", value: "TIMBER" },
  { label: "Chuma / Mabati (Metal / Iron Sheets)", value: "METAL" },
  { label: "Mchanganyiko (Mixed Materials)", value: "MIXED" },
  { label: "Nyingine (Other)", value: "OTHER" },
];

const YES_NO = [
  { label: "Ndiyo (Yes)", value: "YES" },
  { label: "Hapana (No)", value: "NO" },
];

const ALLOWED_DOCS = ["image/jpeg", "image/png", "image/webp", "application/pdf"];
const MAX_DOC_SIZE = 10 * 1024 * 1024;

// ─── Types ────────────────────────────────────────────────────────────────────

type Step = "property" | "construction" | "timeline" | "neighbors" | "preview";

interface UploadedDoc {
  file: File;
  preview: string;
  label: string;
}

interface FormValues {
  // Step 1 — Property
  property_ownership: string;
  property_region: string;
  property_district: string;
  property_ward: string;
  property_street: string;
  house_number: string;
  plot_number: string;
  owner_name: string;
  owner_phone: string;
  // Step 2 — Construction
  construction_type: string;
  construction_description: string;
  construction_dimensions: string;
  estimated_cost: string;
  primary_material: string;
  // Step 3 — Timeline & Contractor
  start_date: string;
  end_date: string;
  contractor_name: string;
  contractor_phone: string;
  contractor_license: string;
  // Step 4 — Neighbors & Compliance
  neighbors_notified: string;
  neighbors_consent: string;
  boundary_clear: string;
  affects_road: string;
  affects_drainage: string;
  special_conditions: string;
  // Preview — Consent
  terms_accepted: boolean;
  data_confirmed: boolean;
}

// ─── Component ───────────────────────────────────────────────────────────────

export const KibariUjeziMdogoForm: React.FC<FormProps> = ({
  onSubmit,
  isLoading,
  lang = "sw",
  userProfile,
}) => {
  const t = labels[lang];
  const L = (sw: string, en: string) => (lang === "sw" ? sw : en);

  const [step, setStep] = useState<Step>("property");
  const [submitted, setSubmitted] = useState(false);
  const [appRef, setAppRef] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [docs, setDocs] = useState<UploadedDoc[]>([]);
  const docRef = useRef<HTMLInputElement>(null);
  const [docErr, setDocErr] = useState("");

  // Address cascade
  const regions = TANZANIA_ADDRESS_DATA.map((r) => r.name);
  const [vals, setVals] = useState<FormValues>({
    property_ownership: "",
    property_region: userProfile?.region || "",
    property_district: userProfile?.district || "",
    property_ward: userProfile?.ward || "",
    property_street: userProfile?.street || "",
    house_number: (userProfile as any)?.house_number || "",
    plot_number: "",
    owner_name: `${userProfile?.first_name || ""} ${userProfile?.last_name || ""}`.trim(),
    owner_phone: userProfile?.phone || "",
    construction_type: "",
    construction_description: "",
    construction_dimensions: "",
    estimated_cost: "",
    primary_material: "",
    start_date: "",
    end_date: "",
    contractor_name: "",
    contractor_phone: "",
    contractor_license: "",
    neighbors_notified: "",
    neighbors_consent: "",
    boundary_clear: "",
    affects_road: "",
    affects_drainage: "",
    special_conditions: "",
    terms_accepted: false,
    data_confirmed: false,
  });

  const districts = vals.property_region
    ? TANZANIA_ADDRESS_DATA.find((r) => r.name === vals.property_region)?.districts.map(
        (d) => d.name,
      ) || []
    : [];
  const wards =
    vals.property_region && vals.property_district
      ? TANZANIA_ADDRESS_DATA.find((r) => r.name === vals.property_region)?.districts.find(
          (d) => d.name === vals.property_district,
        )?.wards || []
      : [];

  // ─── Steps ───────────────────────────────────────────────────────────────
  const STEPS: { key: Step; label: string; sw: string }[] = [
    { key: "property", label: "Property", sw: "Mali" },
    { key: "construction", label: "Construction", sw: "Ujenzi" },
    { key: "timeline", label: "Timeline", sw: "Ratiba" },
    { key: "neighbors", label: "Neighbors", sw: "Majirani" },
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

    if (step === "property") {
      if (!vals.property_ownership)
        e.property_ownership = L("Chagua hali ya umiliki", "Select ownership type");
      if (!vals.property_region) e.property_region = L("Mkoa unahitajika", "Region required");
      if (!vals.property_district)
        e.property_district = L("Wilaya inahitajika", "District required");
      if (!vals.property_ward) e.property_ward = L("Kata inahitajika", "Ward required");
      if (!vals.house_number.trim())
        e.house_number = L("Namba ya nyumba inahitajika", "House number required");
      if (!vals.owner_name.trim())
        e.owner_name = L("Jina la mmiliki linahitajika", "Owner name required");
      if (!vals.owner_phone.trim())
        e.owner_phone = L("Simu ya mmiliki inahitajika", "Owner phone required");
    }

    if (step === "construction") {
      if (!vals.construction_type)
        e.construction_type = L("Chagua aina ya ujenzi", "Select construction type");
      if (!vals.construction_description.trim())
        e.construction_description = L(
          "Maelezo ya ujenzi yanahitajika",
          "Construction description required",
        );
      if (!vals.estimated_cost.trim())
        e.estimated_cost = L("Gharama inayokadiriwa inahitajika", "Estimated cost required");
      if (!vals.primary_material)
        e.primary_material = L("Chagua nyenzo kuu", "Select primary material");
    }

    if (step === "timeline") {
      if (!vals.start_date) e.start_date = L("Tarehe ya kuanza inahitajika", "Start date required");
      if (!vals.end_date)
        e.end_date = L("Tarehe ya kukamilika inahitajika", "Completion date required");
      if (!vals.contractor_name.trim())
        e.contractor_name = L("Jina la fundi linahitajika", "Contractor name required");
      if (!vals.contractor_phone.trim())
        e.contractor_phone = L("Simu ya fundi inahitajika", "Contractor phone required");
    }

    if (step === "neighbors") {
      if (!vals.neighbors_notified) e.neighbors_notified = L("Jibu inahitajika", "Answer required");
      if (!vals.boundary_clear) e.boundary_clear = L("Jibu inahitajika", "Answer required");
      if (!vals.affects_road) e.affects_road = L("Jibu inahitajika", "Answer required");
      if (!vals.affects_drainage) e.affects_drainage = L("Jibu inahitajika", "Answer required");
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
      const ref = `CP-${new Date().getFullYear()}-${Math.floor(Math.random() * 900000 + 100000)}`;
      const files = docs.map((d) => d.file);
      await onSubmit(
        {
          ...vals,
          total_fee: SERVICE_FEE,
          service_name: "Kibari cha Ujezi Mdogo",
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
  const inputCls = (name: string) =>
    `w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none transition-all bg-white text-sm ${
      err(name) ? "border-red-400 bg-red-50" : "border-stone-200"
    }`;
  const lbl = "block text-xs font-bold text-stone-600 uppercase tracking-wider mb-1.5";
  const secHdr =
    "bg-gradient-to-r from-amber-50 to-orange-50 px-4 py-3 rounded-xl border-l-4 border-amber-500 mb-4";

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

  const YesNo = ({
    name,
    value,
    onChange,
  }: {
    name: string;
    value: string;
    onChange: (v: string) => void;
  }) => (
    <div className="grid grid-cols-2 gap-2">
      {YES_NO.map((opt) => (
        <button
          key={opt.value}
          type="button"
          onClick={() => {
            onChange(opt.value);
            clrErr(name);
          }}
          className={`py-2.5 rounded-xl border-2 text-sm font-bold transition-all ${
            value === opt.value
              ? opt.value === "YES"
                ? "bg-amber-50 border-amber-500 text-amber-700"
                : "bg-stone-100 border-stone-400 text-stone-700"
              : "bg-white border-stone-200 text-stone-500 hover:border-stone-300"
          }`}
        >
          {opt.value === "YES" ? "✓ " : "✗ "}
          {lang === "sw" ? opt.label.split(" ")[0] : opt.label.split(" ")[0]}
        </button>
      ))}
    </div>
  );

  // ─── Progress Bar ────────────────────────────────────────────────────────
  const ProgressBar = () => (
    <div className="mb-6">
      <div className="flex justify-between mb-2">
        {STEPS.map((s, i) => (
          <div
            key={s.key}
            className={`flex flex-col items-center ${i <= stepIdx ? "text-amber-600" : "text-stone-300"}`}
          >
            <div
              className={`w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center font-bold text-[10px] sm:text-xs border-2 transition-all
              ${
                i < stepIdx
                  ? "bg-amber-500 border-amber-500 text-white"
                  : i === stepIdx
                    ? "bg-amber-50 border-amber-500 text-amber-700"
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
          className="bg-gradient-to-r from-amber-500 to-orange-500 h-2 rounded-full transition-all duration-500"
        />
      </div>
      <div className="flex justify-between mt-1.5">
        <span className="text-xs text-stone-500 font-medium">
          {L(
            `Hatua ${stepIdx + 1} kati ya ${STEPS.length}`,
            `Step ${stepIdx + 1} of ${STEPS.length}`,
          )}
        </span>
        <span className="text-xs font-bold text-amber-600">{Math.round(progress)}%</span>
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
      <div className="bg-amber-50 px-4 py-2.5 border-b border-amber-100 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-amber-600">{icon}</span>
          <h4 className="font-bold text-amber-900 text-sm">{title}</h4>
        </div>
        <button
          type="button"
          onClick={() => setStep(stepKey)}
          className="flex items-center gap-1 text-xs text-amber-600 hover:text-amber-800 font-bold hover:bg-amber-100 px-2 py-1 rounded-lg transition-colors"
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

  // ─── Success Screen ──────────────────────────────────────────────────────
  if (submitted) {
    return (
      <div className="text-center space-y-6 py-4">
        <div className="w-20 h-20 bg-amber-100 rounded-full flex items-center justify-center mx-auto">
          <CheckCircle2 size={40} className="text-amber-600" />
        </div>
        <div className="space-y-2">
          <h3 className="text-xl font-black text-stone-900">
            {L("Kibari Kimewasilishwa!", "Permit Submitted!")}
          </h3>
          <p className="text-stone-500 text-sm">
            {L(
              "Ombi lako la Kibari cha Ujezi Mdogo limewasilishwa kikamilifu.",
              "Your Minor Construction Permit application has been submitted successfully.",
            )}
          </p>
        </div>
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5 text-left space-y-3 max-w-sm mx-auto">
          <p className="text-xs font-black text-amber-700 uppercase tracking-wider">
            {L("Namba ya Maombi", "Application Reference")}
          </p>
          <p className="text-2xl font-black text-amber-800 font-mono">{appRef}</p>
          <div className="space-y-2 pt-2 border-t border-amber-200">
            {[
              [
                L("Aina ya Ujenzi", "Construction Type"),
                CONSTRUCTION_TYPES.find((c) => c.value === vals.construction_type)
                  ?.label?.split("(")[0]
                  .trim(),
              ],
              [L("Eneo", "Location"), `${vals.property_ward}, ${vals.property_district}`],
              [L("Tarehe ya Kuanza", "Start Date"), vals.start_date],
              [L("Ada", "Fee"), `TSh ${SERVICE_FEE.toLocaleString()}`],
              [L("Hali", "Status"), L("Inasubiri Ukaguzi", "Pending Review")],
            ].map(([l, v]) => (
              <div key={String(l)} className="flex justify-between text-sm">
                <span className="text-stone-500">{l}</span>
                <span className="font-bold text-stone-800 text-right">{v || "—"}</span>
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
                "Mkaguzi anaweza kufika eneo kuangalia ujenzi unaokusudiwa",
                "An inspector may visit the site to assess the proposed construction",
              ),
              L(
                `Lipa ada ya TSh ${SERVICE_FEE.toLocaleString()} unapokuja kuchukua kibari`,
                `Pay TSh ${SERVICE_FEE.toLocaleString()} when collecting the permit`,
              ),
              L(
                "Kibari lazima kiwepo kwenye eneo la ujenzi wakati wote",
                "The permit must be on site throughout construction",
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
      // STEP 1 — MALI (Property Details)
      // ══════════════════════════════════════════════════════════════════════
      case "property":
        return (
          <div className="space-y-5">
            <div className={secHdr}>
              <p className="font-bold text-amber-800 text-sm flex items-center gap-2">
                <Home size={16} /> {L("TAARIFA ZA MALI / ENEO LA UJENZI", "PROPERTY DETAILS")}
              </p>
              <p className="text-xs text-amber-600 mt-0.5">
                {L(
                  "Taarifa za mahali ambapo ujenzi utafanyika",
                  "Details of where the construction will take place",
                )}
              </p>
            </div>

            <Field
              name="property_ownership"
              label={L("Hali ya Umiliki wa Mali", "Property Ownership Status")}
              required
            >
              <Sel
                name="property_ownership"
                value={vals.property_ownership}
                onChange={(v) => {
                  set("property_ownership", v);
                  clrErr("property_ownership");
                }}
                options={OWNERSHIP_TYPES}
              />
            </Field>

            {vals.property_ownership === "TENANT" && (
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 flex gap-2">
                <AlertCircle size={14} className="text-amber-500 shrink-0 mt-0.5" />
                <p className="text-xs text-amber-700">
                  {L(
                    "Utahitaji barua ya idhini kutoka kwa mwenye nyumba. Pakia kama nyaraka ya msaada.",
                    "You will need a written consent letter from the property owner. Upload it as a supporting document.",
                  )}
                </p>
              </div>
            )}

            {/* Address */}
            <Field name="property_region" label={L("Mkoa", "Region")} required>
              <Sel
                name="property_region"
                value={vals.property_region}
                onChange={(v) => {
                  set("property_region", v);
                  set("property_district", "");
                  set("property_ward", "");
                  clrErr("property_region");
                }}
                options={regions.map((r) => ({ label: r, value: r }))}
                placeholder={L("Chagua Mkoa", "Select Region")}
              />
            </Field>

            <div className="grid grid-cols-2 gap-3">
              <Field name="property_district" label={L("Wilaya", "District")} required>
                <Sel
                  name="property_district"
                  value={vals.property_district}
                  onChange={(v) => {
                    set("property_district", v);
                    set("property_ward", "");
                    clrErr("property_district");
                  }}
                  options={(vals.property_region
                    ? TANZANIA_ADDRESS_DATA.find(
                        (r) => r.name === vals.property_region,
                      )?.districts.map((d) => d.name) || []
                    : []
                  ).map((d) => ({ label: d, value: d }))}
                  placeholder={L("Chagua Wilaya", "Select District")}
                />
              </Field>
              <Field name="property_ward" label={L("Kata", "Ward")} required>
                <Sel
                  name="property_ward"
                  value={vals.property_ward}
                  onChange={(v) => {
                    set("property_ward", v);
                    clrErr("property_ward");
                  }}
                  options={(vals.property_region && vals.property_district
                    ? TANZANIA_ADDRESS_DATA.find(
                        (r) => r.name === vals.property_region,
                      )?.districts.find((d) => d.name === vals.property_district)?.wards || []
                    : []
                  ).map((w) => ({ label: w, value: w }))}
                  placeholder={L("Chagua Kata", "Select Ward")}
                />
              </Field>
            </div>

            <Field
              name="property_street"
              label={L("Mtaa / Kijiji", "Street / Village")}
              hint={L("Mfano: Mtaa wa Uhuru", "E.g. Uhuru Street")}
            >
              <TI
                name="property_street"
                value={vals.property_street}
                onChange={(v) => set("property_street", v)}
                placeholder={L("Jina la mtaa au kijiji", "Street or village name")}
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
              <Field
                name="plot_number"
                label={L("Namba ya Plot (Hiari)", "Plot Number (Optional)")}
              >
                <TI
                  name="plot_number"
                  value={vals.plot_number}
                  onChange={(v) => set("plot_number", v)}
                  placeholder="Plot 45A"
                />
              </Field>
            </div>

            {/* Owner info */}
            <div className="border border-amber-200 rounded-xl overflow-hidden">
              <div className="bg-amber-50 px-4 py-2.5 border-b border-amber-100">
                <p className="text-xs font-bold text-amber-700 uppercase tracking-wide">
                  {L("TAARIFA ZA MMILIKI / MUOMBAJI", "PROPERTY OWNER / APPLICANT")}
                </p>
              </div>
              <div className="p-4 space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <Field name="owner_name" label={L("Jina Kamili", "Full Name")} required>
                    <TI
                      name="owner_name"
                      value={vals.owner_name}
                      onChange={(v) => {
                        set("owner_name", v);
                        clrErr("owner_name");
                      }}
                      placeholder={L("Jina kamili", "Full name")}
                    />
                  </Field>
                  <Field name="owner_phone" label={L("Simu", "Phone")} required>
                    <TI
                      name="owner_phone"
                      value={vals.owner_phone}
                      onChange={(v) => {
                        set("owner_phone", v);
                        clrErr("owner_phone");
                      }}
                      placeholder="+255 7XX XXX XXX"
                    />
                  </Field>
                </div>
                {userProfile && (
                  <p className="text-xs text-stone-400">
                    {L(
                      "Imejazwa kiotomatiki kutoka kwenye wasifu wako",
                      "Pre-filled from your profile",
                    )}
                  </p>
                )}
              </div>
            </div>
          </div>
        );

      // ══════════════════════════════════════════════════════════════════════
      // STEP 2 — UJENZI (Construction Details)
      // ══════════════════════════════════════════════════════════════════════
      case "construction":
        return (
          <div className="space-y-5">
            <div className={secHdr}>
              <p className="font-bold text-amber-800 text-sm flex items-center gap-2">
                <Hammer size={16} /> {L("MAELEZO YA UJENZI", "CONSTRUCTION DETAILS")}
              </p>
            </div>

            <Field
              name="construction_type"
              label={L("Aina ya Ujenzi", "Type of Construction")}
              required
            >
              <Sel
                name="construction_type"
                value={vals.construction_type}
                onChange={(v) => {
                  set("construction_type", v);
                  clrErr("construction_type");
                }}
                options={CONSTRUCTION_TYPES}
              />
            </Field>

            <Field
              name="construction_description"
              label={L("Maelezo ya Kina ya Ujenzi", "Detailed Description of Construction")}
              required
              hint={L(
                "Eleza kwa undani ni nini kitajengwa, jinsi na kwa nini",
                "Describe in detail what will be built, how and why",
              )}
            >
              <textarea
                value={vals.construction_description}
                onChange={(e) => {
                  set("construction_description", e.target.value);
                  clrErr("construction_description");
                }}
                rows={4}
                placeholder={L(
                  "Mfano: Ujenzi wa uzio wa matofali urefu wa mita 30 unaozunguka nyumba ili kulinda mali na watoto...",
                  "E.g. Construction of a 30-metre brick fence surrounding the house for security and child safety...",
                )}
                className={`${inputCls("construction_description")} resize-none`}
              />
            </Field>

            <Field
              name="construction_dimensions"
              label={L("Kipimo / Ukubwa (Hiari)", "Dimensions / Size (Optional)")}
              hint={L(
                "Mfano: Urefu 10m × Upana 5m, au Mita 30 za mstari",
                "E.g. 10m × 5m, or 30 linear metres",
              )}
            >
              <TI
                name="construction_dimensions"
                value={vals.construction_dimensions}
                onChange={(v) => set("construction_dimensions", v)}
                placeholder={L("Vipimo vya ujenzi", "Construction dimensions")}
              />
            </Field>

            <Field
              name="primary_material"
              label={L("Nyenzo Kuu Zitatumiwa", "Primary Building Material")}
              required
            >
              <Sel
                name="primary_material"
                value={vals.primary_material}
                onChange={(v) => {
                  set("primary_material", v);
                  clrErr("primary_material");
                }}
                options={MATERIAL_OPTIONS}
              />
            </Field>

            <Field
              name="estimated_cost"
              label={L("Gharama Inayokadiriwa (TSh)", "Estimated Cost (TSh)")}
              required
              hint={L("Jumla ya gharama ya vifaa na kazi", "Total cost of materials and labour")}
            >
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-400 text-sm font-bold pointer-events-none">
                  TSh
                </span>
                <input
                  type="number"
                  value={vals.estimated_cost}
                  onChange={(e) => {
                    set("estimated_cost", e.target.value);
                    clrErr("estimated_cost");
                  }}
                  placeholder="500,000"
                  className={`${inputCls("estimated_cost")} pl-14`}
                />
              </div>
            </Field>
          </div>
        );

      // ══════════════════════════════════════════════════════════════════════
      // STEP 3 — RATIBA NA FUNDI (Timeline & Contractor)
      // ══════════════════════════════════════════════════════════════════════
      case "timeline":
        return (
          <div className="space-y-5">
            <div className={secHdr}>
              <p className="font-bold text-amber-800 text-sm flex items-center gap-2">
                <Calendar size={16} />{" "}
                {L("RATIBA NA TAARIFA ZA FUNDI", "TIMELINE & CONTRACTOR DETAILS")}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Field
                name="start_date"
                label={L("Tarehe ya Kuanza Ujenzi", "Construction Start Date")}
                required
              >
                <TI
                  name="start_date"
                  value={vals.start_date}
                  type="date"
                  onChange={(v) => {
                    set("start_date", v);
                    clrErr("start_date");
                  }}
                />
              </Field>
              <Field
                name="end_date"
                label={L("Tarehe ya Kukamilika (Inayokadiriwa)", "Estimated Completion Date")}
                required
              >
                <TI
                  name="end_date"
                  value={vals.end_date}
                  type="date"
                  onChange={(v) => {
                    set("end_date", v);
                    clrErr("end_date");
                  }}
                />
              </Field>
            </div>

            {vals.start_date &&
              vals.end_date &&
              new Date(vals.end_date) < new Date(vals.start_date) && (
                <div className="bg-red-50 border border-red-200 rounded-xl p-3 flex gap-2">
                  <AlertCircle size={14} className="text-red-500 shrink-0 mt-0.5" />
                  <p className="text-xs text-red-600">
                    {L(
                      "Tarehe ya kukamilika lazima iwe baada ya tarehe ya kuanza",
                      "Completion date must be after the start date",
                    )}
                  </p>
                </div>
              )}

            {/* Contractor */}
            <div className="border border-amber-200 rounded-xl overflow-hidden">
              <div className="bg-amber-50 px-4 py-2.5 border-b border-amber-100 flex items-center gap-2">
                <Wrench size={14} className="text-amber-600" />
                <p className="text-xs font-bold text-amber-700 uppercase tracking-wide">
                  {L("TAARIFA ZA FUNDI / MKANDARASI", "CONTRACTOR / BUILDER DETAILS")}
                </p>
              </div>
              <div className="p-4 space-y-4">
                <Field
                  name="contractor_name"
                  label={L("Jina Kamili la Fundi", "Contractor Full Name")}
                  required
                  hint={L(
                    "Jina la fundi au kampuni itakayofanya kazi",
                    "Name of contractor or company doing the work",
                  )}
                >
                  <TI
                    name="contractor_name"
                    value={vals.contractor_name}
                    onChange={(v) => {
                      set("contractor_name", v);
                      clrErr("contractor_name");
                    }}
                    placeholder={L(
                      "Mfano: Juma Fundi, XYZ Construction Ltd",
                      "E.g. Juma Fundi, XYZ Construction Ltd",
                    )}
                  />
                </Field>
                <div className="grid grid-cols-2 gap-3">
                  <Field
                    name="contractor_phone"
                    label={L("Simu ya Fundi", "Contractor Phone")}
                    required
                  >
                    <TI
                      name="contractor_phone"
                      value={vals.contractor_phone}
                      onChange={(v) => {
                        set("contractor_phone", v);
                        clrErr("contractor_phone");
                      }}
                      placeholder="+255 7XX XXX XXX"
                    />
                  </Field>
                  <Field
                    name="contractor_license"
                    label={L("Namba ya Leseni (Hiari)", "Licence Number (Optional)")}
                    hint={L("Kama ana leseni ya ujenzi", "If registered contractor")}
                  >
                    <TI
                      name="contractor_license"
                      value={vals.contractor_license}
                      onChange={(v) => set("contractor_license", v)}
                      placeholder="REG-2024-XXXX"
                    />
                  </Field>
                </div>
              </div>
            </div>

            <div className="bg-blue-50 border border-blue-100 rounded-xl p-3 flex gap-2">
              <Info size={14} className="text-blue-500 shrink-0 mt-0.5" />
              <p className="text-xs text-blue-700">
                {L(
                  "Ujenzi lazima uendelee kwa mujibu wa kibari. Kubadilisha ratiba au fundi kunahitaji arifa ya awali kwa ofisi.",
                  "Construction must proceed as per the permit. Changing timeline or contractor requires prior notice to the office.",
                )}
              </p>
            </div>
          </div>
        );

      // ══════════════════════════════════════════════════════════════════════
      // STEP 4 — MAJIRANI NA KUFUATA SHERIA (Neighbors & Compliance)
      // ══════════════════════════════════════════════════════════════════════
      case "neighbors":
        return (
          <div className="space-y-5">
            <div className={secHdr}>
              <p className="font-bold text-amber-800 text-sm flex items-center gap-2">
                <Users size={16} /> {L("MAJIRANI NA KUFUATA SHERIA", "NEIGHBORS & COMPLIANCE")}
              </p>
              <p className="text-xs text-amber-600 mt-0.5">
                {L(
                  "Maswali haya yanahitajika kisheria kwa ujenzi wote",
                  "These questions are legally required for all construction",
                )}
              </p>
            </div>

            {/* Neighbors notified */}
            <Field
              name="neighbors_notified"
              label={L(
                "Je, majirani wamearifiwa kuhusu ujenzi huu?",
                "Have neighbours been informed about this construction?",
              )}
              required
              hint={L("Inahitajika kisheria", "Legally required")}
            >
              <YesNo
                name="neighbors_notified"
                value={vals.neighbors_notified}
                onChange={(v) => {
                  set("neighbors_notified", v);
                  clrErr("neighbors_notified");
                }}
              />
            </Field>

            {vals.neighbors_notified === "YES" && (
              <Field
                name="neighbors_consent"
                label={L("Maelezo ya Idhini ya Majirani", "Neighbour Consent Details")}
                hint={L(
                  "Mfano: Waliarifu na kukubaliana, waraka uliandikwa",
                  "E.g. Informed and agreed, written notice given",
                )}
              >
                <textarea
                  value={vals.neighbors_consent}
                  onChange={(e) => set("neighbors_consent", e.target.value)}
                  rows={2}
                  placeholder={L("Jinsi idhini ilivyotolewa...", "How consent was obtained...")}
                  className={`${inputCls("neighbors_consent")} resize-none`}
                />
              </Field>
            )}

            {vals.neighbors_notified === "NO" && (
              <div className="bg-red-50 border border-red-200 rounded-xl p-3 flex gap-2">
                <AlertCircle size={14} className="text-red-500 shrink-0 mt-0.5" />
                <p className="text-xs text-red-700">
                  {L(
                    "Inahitajika kisheria kuarifu majirani. Ofisi inaweza kukuomba ufanye hivyo kabla ya kutoa kibari.",
                    "It is legally required to inform neighbours. The office may require you to do so before issuing the permit.",
                  )}
                </p>
              </div>
            )}

            {/* Boundary clear */}
            <Field
              name="boundary_clear"
              label={L(
                "Je, mipaka ya ardhi iko wazi na haiingiliani na ardhi ya jirani?",
                "Are the land boundaries clear and not overlapping with neighbours' land?",
              )}
              required
            >
              <YesNo
                name="boundary_clear"
                value={vals.boundary_clear}
                onChange={(v) => {
                  set("boundary_clear", v);
                  clrErr("boundary_clear");
                }}
              />
            </Field>

            {vals.boundary_clear === "NO" && (
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 flex gap-2">
                <AlertCircle size={14} className="text-amber-500 shrink-0 mt-0.5" />
                <p className="text-xs text-amber-700">
                  {L(
                    "Mipaka isiyokuwa wazi inaweza kusababisha matatizo. Unahitaji kupima ardhi kwanza.",
                    "Unclear boundaries may cause disputes. You may need to have land surveyed first.",
                  )}
                </p>
              </div>
            )}

            {/* Affects road */}
            <Field
              name="affects_road"
              label={L(
                "Je, ujenzi utaathiri barabara au njia ya umma?",
                "Will the construction affect any road or public pathway?",
              )}
              required
            >
              <YesNo
                name="affects_road"
                value={vals.affects_road}
                onChange={(v) => {
                  set("affects_road", v);
                  clrErr("affects_road");
                }}
              />
            </Field>

            {vals.affects_road === "YES" && (
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 flex gap-2">
                <AlertCircle size={14} className="text-amber-500 shrink-0 mt-0.5" />
                <p className="text-xs text-amber-700">
                  {L(
                    "Ujenzi unaathiri barabara unahitaji idhini ya ziada kutoka TANROADS au Halmashauri ya Barabara.",
                    "Construction affecting roads requires additional approval from TANROADS or the Roads Authority.",
                  )}
                </p>
              </div>
            )}

            {/* Affects drainage */}
            <Field
              name="affects_drainage"
              label={L(
                "Je, ujenzi utaathiri mfumo wa maji ya mvua au mifereji?",
                "Will the construction affect drainage or water channels?",
              )}
              required
            >
              <YesNo
                name="affects_drainage"
                value={vals.affects_drainage}
                onChange={(v) => {
                  set("affects_drainage", v);
                  clrErr("affects_drainage");
                }}
              />
            </Field>

            {vals.affects_drainage === "YES" && (
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 flex gap-2">
                <AlertCircle size={14} className="text-amber-500 shrink-0 mt-0.5" />
                <p className="text-xs text-amber-700">
                  {L(
                    "Ujenzi unaathiri mfereji unahitaji idhini ya Idara ya Maji. Ofisi itakusaidia.",
                    "Construction affecting drainage requires approval from the Water Department. The office will assist.",
                  )}
                </p>
              </div>
            )}

            {/* Special conditions */}
            <Field
              name="special_conditions"
              label={L(
                "Masharti Maalum / Taarifa za Ziada (Hiari)",
                "Special Conditions / Additional Notes (Optional)",
              )}
            >
              <textarea
                value={vals.special_conditions}
                onChange={(e) => set("special_conditions", e.target.value)}
                rows={3}
                placeholder={L(
                  "Taarifa yoyote ya ziada inayohusiana na ujenzi wako...",
                  "Any additional information relevant to your construction...",
                )}
                className={`${inputCls("special_conditions")} resize-none`}
              />
            </Field>

            {/* Document upload */}
            <div className="border border-stone-200 rounded-xl overflow-hidden">
              <div className="bg-stone-50 px-4 py-2.5 border-b border-stone-100 flex items-center gap-2">
                <FileText size={13} className="text-stone-500" />
                <p className="text-xs font-bold text-stone-600 uppercase tracking-wide">
                  {L("NYARAKA ZA MSAADA (Hiari)", "SUPPORTING DOCUMENTS (Optional)")}
                </p>
              </div>
              <div className="p-4 space-y-3">
                <p className="text-xs text-stone-500">
                  {L(
                    "Mfano: Hati ya ardhi/plot, mchoro wa ujenzi, barua ya idhini ya mwenye nyumba (kama unakodi), picha za eneo.",
                    "E.g. Land/plot certificate, construction sketch/plan, landlord consent letter (if tenant), site photos.",
                  )}
                </p>
                <div
                  onClick={() => docRef.current?.click()}
                  className={`border-2 border-dashed rounded-xl p-4 cursor-pointer transition-all text-center
                  ${docs.length > 0 ? "border-amber-400 bg-amber-50" : "border-stone-300 hover:border-amber-400 hover:bg-amber-50/40"}`}
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
                              className="w-9 h-9 object-cover rounded-lg shrink-0"
                              alt=""
                            />
                          ) : (
                            <div className="w-9 h-9 bg-amber-100 rounded-lg flex items-center justify-center shrink-0">
                              <FileText size={15} className="text-amber-600" />
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
                      <p className="text-xs text-amber-600 font-medium">
                        {L("Bonyeza kuongeza zaidi", "Click to add more")}
                      </p>
                    </div>
                  ) : (
                    <div className="py-3">
                      <Upload size={22} className="mx-auto text-stone-400 mb-2" />
                      <p className="text-sm font-semibold text-stone-600">
                        {L("Bonyeza kupakia", "Click to upload")}
                      </p>
                      <p className="text-xs text-stone-400 mt-1">JPG, PNG, PDF · Max 10MB</p>
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
              title={L("Mwaombaji / Mmiliki", "Applicant / Owner")}
              stepKey="property"
            >
              <PRow label={L("Jina", "Name")} value={vals.owner_name} />
              <PRow label={L("Simu", "Phone")} value={vals.owner_phone} />
              <PRow label="NIDA" value={userProfile?.nida_number} />
              <PRow
                label={L("Umiliki", "Ownership")}
                value={OWNERSHIP_TYPES.find((o) => o.value === vals.property_ownership)?.label}
              />
            </PSection>

            {/* Property */}
            <PSection
              icon={<MapPin size={14} />}
              title={L("Eneo la Mali", "Property Location")}
              stepKey="property"
            >
              <PRow label={L("Mkoa", "Region")} value={vals.property_region} />
              <PRow label={L("Wilaya", "District")} value={vals.property_district} />
              <PRow label={L("Kata", "Ward")} value={vals.property_ward} />
              {vals.property_street && (
                <PRow label={L("Mtaa", "Street")} value={vals.property_street} />
              )}
              <PRow label={L("Namba ya Nyumba", "House No.")} value={vals.house_number} />
              {vals.plot_number && <PRow label="Plot No." value={vals.plot_number} />}
            </PSection>

            {/* Construction */}
            <PSection
              icon={<Hammer size={14} />}
              title={L("Maelezo ya Ujenzi", "Construction Details")}
              stepKey="construction"
            >
              <PRow
                label={L("Aina", "Type")}
                value={CONSTRUCTION_TYPES.find((c) => c.value === vals.construction_type)?.label}
              />
              <PRow
                label={L("Nyenzo Kuu", "Material")}
                value={MATERIAL_OPTIONS.find((m) => m.value === vals.primary_material)?.label}
              />
              {vals.construction_dimensions && (
                <PRow label={L("Kipimo", "Dimensions")} value={vals.construction_dimensions} />
              )}
              <PRow
                label={L("Gharama", "Est. Cost")}
                value={
                  vals.estimated_cost ? `TSh ${Number(vals.estimated_cost).toLocaleString()}` : "—"
                }
              />
              <p className="col-span-2 text-xs text-stone-500 mt-1">
                {L("Maelezo", "Description")}
              </p>
              <p className="col-span-2 text-xs font-bold text-stone-800">
                {vals.construction_description}
              </p>
            </PSection>

            {/* Timeline */}
            <PSection
              icon={<Calendar size={14} />}
              title={L("Ratiba na Fundi", "Timeline & Contractor")}
              stepKey="timeline"
            >
              <PRow label={L("Tarehe ya Kuanza", "Start Date")} value={vals.start_date} />
              <PRow label={L("Tarehe ya Kukamilika", "End Date")} value={vals.end_date} />
              <PRow label={L("Fundi", "Contractor")} value={vals.contractor_name} />
              <PRow label={L("Simu ya Fundi", "Contractor Phone")} value={vals.contractor_phone} />
              {vals.contractor_license && (
                <PRow label={L("Leseni", "Licence")} value={vals.contractor_license} />
              )}
            </PSection>

            {/* Compliance */}
            <PSection
              icon={<Shield size={14} />}
              title={L("Majirani na Kufuata Sheria", "Compliance")}
              stepKey="neighbors"
            >
              <PRow
                label={L("Majirani Wamearifiwa", "Neighbours Notified")}
                value={vals.neighbors_notified === "YES" ? L("Ndiyo", "Yes") : L("Hapana", "No")}
              />
              <PRow
                label={L("Mipaka Wazi", "Boundary Clear")}
                value={vals.boundary_clear === "YES" ? L("Ndiyo", "Yes") : L("Hapana", "No")}
              />
              <PRow
                label={L("Inaathiri Barabara", "Affects Road")}
                value={vals.affects_road === "YES" ? L("Ndiyo", "Yes") : L("Hapana", "No")}
              />
              <PRow
                label={L("Inaathiri Mfereji", "Affects Drainage")}
                value={vals.affects_drainage === "YES" ? L("Ndiyo", "Yes") : L("Hapana", "No")}
              />
            </PSection>

            {/* Docs */}
            {docs.length > 0 && (
              <PSection
                icon={<FileText size={14} />}
                title={L("Nyaraka", "Documents")}
                stepKey="neighbors"
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
                      <div className="w-8 h-8 bg-amber-100 rounded-lg flex items-center justify-center shrink-0">
                        <FileText size={14} className="text-amber-600" />
                      </div>
                    )}
                    <p className="text-xs font-bold text-stone-700 flex-1 truncate">
                      {d.file.name}
                    </p>
                    <CheckCircle size={13} className="text-amber-500 shrink-0" />
                  </div>
                ))}
              </PSection>
            )}

            {/* Fee */}
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex justify-between items-center">
              <span className="font-bold text-amber-800 text-sm">
                {L("Ada ya Kibari:", "Permit Fee:")}
              </span>
              <span className="text-xl font-black text-amber-700">
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
                  sw: "Nathibitisha kwamba taarifa zote nilizotoa ni za kweli na sahihi, na kwamba ninajua na kukubaliana na sheria za ujenzi za eneo hili.",
                  en: "I confirm all information provided is true and accurate, and that I am aware of and agree to comply with local construction regulations.",
                },
                {
                  key: "data_confirmed" as const,
                  sw: "Ninakubali kutoa taarifa hizi kwa Serikali ya Mtaa na kukubali ukaguzi wa eneo wakati wowote unaohitajika.",
                  en: "I consent to provide this information to the Local Government and agree to site inspections at any time required.",
                },
              ].map((item) => (
                <label
                  key={item.key}
                  className={`flex items-start gap-3 cursor-pointer rounded-xl p-3 border transition-colors
                  ${vals[item.key] ? "bg-amber-50 border-amber-300" : "bg-stone-50 border-stone-200 hover:bg-amber-50/50"}`}
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
              className="flex-1 py-3.5 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white rounded-xl font-bold shadow-lg transition-all flex items-center justify-center gap-2 text-sm"
            >
              {step === "neighbors" ? (
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
              className="flex-1 py-3.5 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white rounded-xl font-bold shadow-lg transition-all flex items-center justify-center gap-2 text-sm disabled:opacity-60 disabled:cursor-not-allowed"
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

export default KibariUjeziMdogoForm;
