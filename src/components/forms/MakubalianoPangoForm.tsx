/**
 * Makubaliano ya Pango — Rental Agreement Form
 * Logic: Landlord (logged-in) pulls Tenant by NIDA/phone.
 * Both must be registered & approved citizens.
 * After admin approval, both receive a copy.
 *
 * Fee: TSh 10,000 flat (or 1 month rent if > 10,000)
 * Color: Teal/cyan
 */
import React, { useState, useRef, useCallback } from "react";
import {
  Loader2,
  CheckCircle2,
  ArrowLeft,
  ArrowRight,
  Eye,
  FileCheck,
  Users,
  AlertCircle,
  Shield,
  Info,
  Upload,
  X,
  Edit2,
  FileText,
  Check,
  Search,
  Home,
  Key,
  UserCheck,
  UserX,
} from "lucide-react";
import { SignaturePad } from "@/components/ui/SignaturePad";
import { FormProps, labels } from "./types";
import { AddressFields } from "./AddressFields";
import { ProgressFill } from "../ui/ProgressFill";
import { supabase } from "../../lib/supabase";
import { createAgreementNotification, createNotification } from "../../lib/notifications";
import { findAgreementCounterparty } from "../../lib/agreementLookup";

// ─── Constants ───────────────────────────────────────────────────────────────
const PROPERTY_TYPES = [
  { label: "Nyumba Nzima ya Kuishi (Full Residential House)", value: "FULL_HOUSE" },
  { label: "Vyumba (Rooms / Bedsitter)", value: "ROOMS" },
  { label: "Apartment / Ghorofa (Apartment / Flat)", value: "APARTMENT" },
  { label: "Eneo la Biashara (Commercial Space / Shop)", value: "COMMERCIAL" },
  { label: "Ghala / Stoo (Warehouse / Storage)", value: "WAREHOUSE" },
  { label: "Shamba / Kiwanja (Farm / Plot)", value: "LAND" },
  { label: "Nyingine (Other)", value: "OTHER" },
];

const PAYMENT_FREQ = [
  { label: "Kila Mwezi (Monthly)", value: "MONTHLY" },
  { label: "Kila Robo Mwaka (Quarterly)", value: "QUARTERLY" },
  { label: "Kila Mwaka (Annually)", value: "ANNUALLY" },
];

const LEASE_DURATION = [
  { label: "Miezi 6 (6 Months)", value: "6M" },
  { label: "Mwaka 1 (1 Year)", value: "1Y" },
  { label: "Miaka 2 (2 Years)", value: "2Y" },
  { label: "Miaka 3 (3 Years)", value: "3Y" },
  { label: "Wazi / Miezi kwa Miezi (Open-ended / Month-to-Month)", value: "OPEN" },
];

const NOTICE_PERIODS = [
  { label: "Siku 14 (14 Days)", value: "14D" },
  { label: "Siku 30 (30 Days)", value: "30D" },
  { label: "Siku 60 (60 Days)", value: "60D" },
];

const UTILITIES_OPTIONS = [
  { key: "water", label: "Maji (Water)", icon: "💧" },
  { key: "electricity", label: "Umeme (Electricity)", icon: "⚡" },
  { key: "wifi", label: "Wifi / Internet", icon: "📶" },
  { key: "security", label: "Usalama (Security)", icon: "🔒" },
  { key: "garbage", label: "Taka (Garbage Collection)", icon: "🗑" },
];

const ALLOWED_DOCS = ["image/jpeg", "image/png", "image/webp", "application/pdf"];
const MAX_DOC_SIZE = 10 * 1024 * 1024;

type Step = "landlord" | "tenant" | "property" | "terms" | "preview";

interface TenantProfile {
  id: string;
  citizen_id?: string;
  first_name: string;
  last_name: string;
  middle_name?: string;
  nida_number?: string;
  phone?: string;
  email: string;
  region?: string;
  district?: string;
  ward?: string;
  is_verified: boolean;
  account_status: string;
}

interface UploadedDoc {
  file: File;
  preview: string;
  label: string;
}

interface FormValues {
  tenant_search_term: string;
  tenant_search_type: string;
  property_type: string;
  property_address: string;
  property_ward: string;
  property_district: string;
  property_region: string;
  house_number: string;
  floor_level: string;
  num_rooms: string;
  property_description: string;
  monthly_rent: string;
  deposit_amount: string;
  payment_day: string;
  payment_frequency: string;
  lease_start: string;
  lease_duration: string;
  notice_period: string;
  included_utilities: string[]; // array of utility keys
  house_rules: string;
  witness1_name: string;
  witness1_phone: string;
  witness1_nida: string;
  witness2_name: string;
  witness2_phone: string;
  witness2_nida: string;
  witness1_user_id?: string;
  witness2_user_id?: string;
  special_conditions: string;
  landlord_confirmed: boolean;
  terms_accepted: boolean;
}

export const MakubalianoPangoForm: React.FC<FormProps> = ({
  onSubmit,
  isLoading,
  lang = "sw",
  userProfile,
}) => {
  const t = labels[lang];
  const L = useCallback((sw: string, en: string) => (lang === "sw" ? sw : en), [lang]);

  const [step, setStep] = useState<Step>("landlord");
  const [submitted, setSubmitted] = useState(false);
  const [appRef, setAppRef] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [signature, setSignature] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const errorsRef = useRef(errors);
  errorsRef.current = errors;
  const [docs, setDocs] = useState<UploadedDoc[]>([]);
  const docRef = useRef<HTMLInputElement>(null);
  const [docErr, setDocErr] = useState("");

  const [tenantFound, setTenantFound] = useState<TenantProfile | null>(null);
  const [tenantSearching, setTenantSearching] = useState(false);
  const [tenantError, setTenantError] = useState("");

  const [vals, setVals] = useState<FormValues>({
    tenant_search_term: "",
    tenant_search_type: "NIDA",
    property_type: "",
    property_address: "",
    property_ward: userProfile?.ward || "",
    property_district: userProfile?.district || "",
    property_region: userProfile?.region || "",
    house_number: userProfile?.house_number || "",
    floor_level: "",
    num_rooms: "",
    property_description: "",
    monthly_rent: "",
    deposit_amount: "",
    payment_day: "1",
    payment_frequency: "MONTHLY",
    lease_start: "",
    lease_duration: "1Y",
    notice_period: "30D",
    included_utilities: [],
    house_rules: "",
    witness1_name: "",
    witness1_phone: "",
    witness1_nida: "",
    witness2_name: "",
    witness2_phone: "",
    witness2_nida: "",
    witness1_user_id: "",
    witness2_user_id: "",
    special_conditions: "",
    landlord_confirmed: false,
    terms_accepted: false,
  });

  const monthlyRent = parseFloat(vals.monthly_rent) || 0;
  const deposit = parseFloat(vals.deposit_amount) || 0;
  const serviceFee = Math.max(10000, monthlyRent);
  const fmtTsh = (n: number) => `TSh ${n.toLocaleString()}`;

  const STEPS: { key: Step; label: string; sw: string }[] = [
    { key: "landlord", label: "Landlord", sw: "Mpangishaji" },
    { key: "tenant", label: "Tenant", sw: "Mpangaji" },
    { key: "property", label: "Property", sw: "Nyumba" },
    { key: "terms", label: "Terms", sw: "Masharti" },
    { key: "preview", label: "Preview", sw: "Hakiki" },
  ];
  const stepIdx = STEPS.findIndex((s) => s.key === step);
  const progress = ((stepIdx + 1) / STEPS.length) * 100;

  const set = (k: keyof FormValues, v: string | boolean | string[]) =>
    setVals((p) => ({ ...p, [k]: v }));

  // Witness citizen lookup
  const [witnessSearch, setWitnessSearch] = useState<{ w1: string; w2: string }>({
    w1: "",
    w2: "",
  });
  const [witnessResults, setWitnessResults] = useState<{
    w1: { id: string; name: string; phone: string; nida: string }[];
    w2: { id: string; name: string; phone: string; nida: string }[];
  }>({ w1: [], w2: [] });

  const searchWitness = async (q: string, wKey: "w1" | "w2") => {
    setWitnessSearch((prev) => ({ ...prev, [wKey]: q }));
    if (q.length < 2) {
      setWitnessResults((prev) => ({ ...prev, [wKey]: [] }));
      return;
    }
    const term = "%" + q + "%";
    const { data } = await supabase
      .from("users")
      .select("id, first_name, last_name, phone, nida_number")
      .or(
        "first_name.ilike." +
          term +
          ",last_name.ilike." +
          term +
          ",nida_number.ilike." +
          term +
          ",phone.ilike." +
          term,
      )
      .eq("role", "citizen")
      .limit(4);
    setWitnessResults((prev) => ({
      ...prev,
      [wKey]: (data || []).map((u) => ({
        id: u.id,
        name: ((u.first_name as string) || "") + " " + ((u.last_name as string) || ""),
        phone: (u.phone as string) || "",
        nida: (u.nida_number as string) || "",
      })),
    }));
  };

  const selectWitness = (
    wNum: 1 | 2,
    w: { id: string; name: string; phone: string; nida: string },
  ) => {
    setVals((p) => ({
      ...p,
      ["witness" + wNum + "_name"]: w.name,
      ["witness" + wNum + "_phone"]: w.phone,
      ["witness" + wNum + "_nida"]: w.nida,
      ["witness" + wNum + "_user_id"]: w.id,
    }));
    setWitnessSearch((prev) => ({ ...prev, ["w" + wNum]: "" }));
    setWitnessResults((prev) => ({ ...prev, ["w" + wNum]: [] }));
  };

  const clrErr = useCallback((k: string) => {
    setErrors((p) => {
      const n = { ...p };
      delete n[k];
      return n;
    });
  }, []);
  const err = useCallback((k: string) => errorsRef.current[k], []);

  const toggleUtility = (key: string) => {
    const curr = vals.included_utilities;
    set("included_utilities", curr.includes(key) ? curr.filter((k) => k !== key) : [...curr, key]);
  };

  // ─── Tenant lookup ───────────────────────────────────────────────────────
  const searchTenant = async () => {
    const term = vals.tenant_search_term.trim();
    if (!term) {
      setTenantError(L("Ingiza namba ya kutafuta", "Enter a search term"));
      return;
    }
    setTenantSearching(true);
    setTenantError("");
    setTenantFound(null);
    try {
      const data = await findAgreementCounterparty(
        vals.tenant_search_type as "NIDA" | "PHONE" | "CT_ID",
        term,
      );
      if (!data) {
        setTenantError(
          L(
            "Mtu huyu hayupo kwenye mfumo. Lazima awe mwananchi aliyesajiliwa na kuthibitishwa.",
            "Person not found. They must be a registered and verified citizen.",
          ),
        );
        return;
      }
      if (data.account_status !== "active" || !data.is_verified) {
        setTenantError(
          L(
            "Akaunti ya mtu huyu haijathibitishwa. Hawezi kuwa mpangaji.",
            "This person's account is not verified. They cannot be a tenant.",
          ),
        );
        return;
      }
      if (data.id === userProfile?.id) {
        setTenantError(
          L(
            "Huwezi kuwa mpangishaji na mpangaji wa nyumba moja.",
            "You cannot be both landlord and tenant of the same property.",
          ),
        );
        return;
      }
      setTenantFound(data as TenantProfile);
    } catch (error) {
      console.error("tenant lookup failed", error);
      setTenantError(L("Hitilafu ya mtandao. Jaribu tena.", "Network error. Please try again."));
    } finally {
      setTenantSearching(false);
    }
  };

  const addDoc = useCallback(
    (file: File): string | null => {
      if (!ALLOWED_DOCS.includes(file.type))
        return L("Aina ya faili haikushukuliwa", "File type not allowed");
      if (file.size > MAX_DOC_SIZE)
        return L("Faili ni kubwa sana. Upeo ni 10MB", "File too large. Max 10MB");
      setDocs((p) => [...p, { file, preview: URL.createObjectURL(file), label: file.name }]);
      return null;
    },
    [L],
  );
  const removeDoc = (i: number) =>
    setDocs((p) => {
      URL.revokeObjectURL(p[i].preview);
      return p.filter((_, idx) => idx !== i);
    });

  const validate = (): boolean => {
    const e: Record<string, string> = {};
    if (step === "tenant" && !tenantFound)
      e.tenant = L(
        "Lazima utafute na uthibitishe mpangaji kwanza",
        "You must search and confirm the tenant first",
      );
    if (step === "property") {
      if (!vals.property_type) e.property_type = L("Chagua aina ya mali", "Select property type");
      if (!vals.property_address.trim())
        e.property_address = L("Anwani ya nyumba inahitajika", "Property address required");
      if (!vals.monthly_rent.trim() || parseFloat(vals.monthly_rent) <= 0)
        e.monthly_rent = L("Kodi ya kila mwezi inahitajika", "Monthly rent required");
      if (!vals.lease_start)
        e.lease_start = L("Tarehe ya kuanza inahitajika", "Start date required");
    }
    if (step === "terms") {
      if (!vals.witness1_name.trim())
        e.witness1_name = L("Jina la shahidi 1 linahitajika", "Witness 1 name required");
      if (!vals.witness1_phone.trim())
        e.witness1_phone = L("Simu ya shahidi 1 inahitajika", "Witness 1 phone required");
      if (!vals.witness2_name.trim())
        e.witness2_name = L("Jina la shahidi 2 linahitajika", "Witness 2 name required");
      if (!vals.witness2_phone.trim())
        e.witness2_phone = L("Simu ya shahidi 2 inahitajika", "Witness 2 phone required");
    }
    if (step === "preview") {
      if (!vals.landlord_confirmed)
        e.landlord_confirmed = L("Mpangishaji lazima athibitishe", "Landlord must confirm");
      if (!vals.terms_accepted)
        e.terms_accepted = L("Lazima ukubali masharti", "Must accept terms");
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
      const ref = `RA-${new Date().getFullYear()}-${Math.floor(Math.random() * 900000 + 100000)}`;
      await onSubmit(
        {
          ...vals,
          tenant_id: tenantFound?.id,
          tenant_name: `${tenantFound?.first_name} ${tenantFound?.last_name}`,
          tenant_nida: tenantFound?.nida_number,
          tenant_phone: tenantFound?.phone,
          landlord_id: userProfile?.id,
          landlord_name:
            `${userProfile?.first_name || ""} ${userProfile?.middle_name || ""} ${userProfile?.last_name || ""}`
              .replace(/\s+/g, " ")
              .trim(),
          landlord_nida: userProfile?.nida_number || "",
          landlord_phone: userProfile?.phone || "",
          total_fee: serviceFee,
          service_name: "Makubaliano ya Pango",
          application_reference: ref,
          applicant_signature: signature,
        },
        docs.map((d) => d.file),
      );

      // Notify tenant — best-effort
      if (tenantFound?.id && userProfile?.id) {
        const landlordName =
          `${userProfile.first_name || ""} ${userProfile.last_name || ""}`.trim();
        const propLabel =
          PROPERTY_TYPES.find((p) => p.value === vals.property_type)
            ?.label?.split("(")[0]
            .trim() || "mali";
        const msg =
          lang === "sw"
            ? `${landlordName} amekuwasilisha Makubaliano ya Pango (${ref}) kukuhusisha wewe kama mpangaji wa ${propLabel} kwa kodi ya TSh ${monthlyRent.toLocaleString()}/mwezi. Tafadhali fungua Maombi Yangu kukubali au kukataa.`
            : `${landlordName} has filed a Rental Agreement (${ref}) naming you as tenant of ${propLabel} at TSh ${monthlyRent.toLocaleString()}/month. Please open My Applications to accept or reject.`;
        await Promise.all([
          createNotification({
            user_id: tenantFound.id,
            title:
              lang === "sw"
                ? "Makubaliano ya Pango Yamewasilishwa Kwako"
                : "Rental Agreement Filed With You",
            message: msg,
            type: "info",
          }),
          createAgreementNotification({
            application_id: ref,
            sender_id: userProfile.id,
            recipient_id: tenantFound.id,
            recipient_citizen_id: tenantFound.citizen_id || null,
            notification_type: "rental_agreement_pending_acceptance",
            message: msg,
          }),
        ]);
      }

      setAppRef(ref);
      setSubmitted(true);
    } catch {
      // submission errors are surfaced via UI toast
    } finally {
      setSubmitting(false);
    }
  };

  // ─── Shared UI ───────────────────────────────────────────────────────────
  const inputCls = useCallback(
    (name: string) =>
      `w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none transition-all bg-white text-sm ${err(name) ? "border-red-400 bg-red-50" : "border-stone-200"}`,
    [err],
  );
  const lbl = "block text-xs font-bold text-stone-600 uppercase tracking-wider mb-1.5";
  const secHdr =
    "bg-gradient-to-r from-teal-50 to-cyan-50 px-4 py-3 rounded-xl border-l-4 border-teal-500 mb-4";

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
            className={`flex flex-col items-center ${i <= stepIdx ? "text-teal-600" : "text-stone-300"}`}
          >
            <div
              className={`w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center font-bold text-[10px] sm:text-xs border-2 transition-all
              ${i < stepIdx ? "bg-teal-600 border-teal-600 text-white" : i === stepIdx ? "bg-teal-50 border-teal-600 text-teal-700" : "bg-stone-100 border-stone-200 text-stone-400"}`}
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
          className="bg-gradient-to-r from-teal-500 to-cyan-500 h-2 rounded-full transition-all duration-500"
        />
      </div>
      <div className="flex justify-between mt-1.5">
        <span className="text-xs text-stone-500 font-medium">
          {L(
            `Hatua ${stepIdx + 1} kati ya ${STEPS.length}`,
            `Step ${stepIdx + 1} of ${STEPS.length}`,
          )}
        </span>
        <span className="text-xs font-bold text-teal-600">{Math.round(progress)}%</span>
      </div>
    </div>
  );

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
      <div className="bg-teal-50 px-4 py-2.5 border-b border-teal-100 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-teal-600">{icon}</span>
          <h4 className="font-bold text-teal-900 text-sm">{title}</h4>
        </div>
        <button
          type="button"
          onClick={() => setStep(stepKey)}
          className="flex items-center gap-1 text-xs text-teal-600 hover:text-teal-800 font-bold hover:bg-teal-100 px-2 py-1 rounded-lg transition-colors"
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
  if (submitted)
    return (
      <div className="text-center space-y-6 py-4">
        <div className="w-20 h-20 bg-teal-100 rounded-full flex items-center justify-center mx-auto">
          <CheckCircle2 size={40} className="text-teal-600" />
        </div>
        <div className="space-y-2">
          <h3 className="text-xl font-black text-stone-900">
            {L("Makubaliano Yamewasilishwa!", "Agreement Submitted!")}
          </h3>
          <p className="text-stone-500 text-sm">
            {L(
              "Makubaliano ya Pango yamewasilishwa. Baada ya idhini ya Ofisi, pande zote mbili zitapokea nakala.",
              "Rental Agreement submitted. After office approval, both parties will receive a copy.",
            )}
          </p>
        </div>
        <div className="bg-teal-50 border border-teal-200 rounded-2xl p-5 text-left space-y-3 max-w-sm mx-auto">
          <p className="text-xs font-black text-teal-700 uppercase tracking-wider">
            {L("Namba ya Makubaliano", "Agreement Reference")}
          </p>
          <p className="text-2xl font-black text-teal-800 font-mono">{appRef}</p>
          <div className="space-y-2 pt-2 border-t border-teal-200">
            {[
              [
                L("Mpangishaji", "Landlord"),
                `${userProfile?.first_name} ${userProfile?.last_name}`,
              ],
              [L("Mpangaji", "Tenant"), `${tenantFound?.first_name} ${tenantFound?.last_name}`],
              [
                L("Kodi ya Kila Mwezi", "Monthly Rent"),
                monthlyRent > 0 ? fmtTsh(monthlyRent) : "—",
              ],
              [L("Amana", "Deposit"), deposit > 0 ? fmtTsh(deposit) : "—"],
              [L("Ada ya Huduma", "Service Fee"), fmtTsh(serviceFee)],
              [L("Hali", "Status"), L("Inasubiri Idhini ya Ofisi", "Pending Office Approval")],
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
                "Ofisi itakagua makubaliano na kuthibitisha pande zote mbili",
                "Office will review agreement and verify both parties",
              ),
              L(
                "Mpangishaji NA Mpangaji wataarifiwa kwa simu/barua pepe",
                "Landlord AND Tenant will be notified by phone/email",
              ),
              L(
                `Lipa ada ya ${fmtTsh(serviceFee)} unapokuja kuchukua nakala`,
                `Pay ${fmtTsh(serviceFee)} when collecting copies`,
              ),
              L(
                "Pande zote mbili zitapata nakala rasmi iliyosainiwa na Ofisi",
                "Both parties will receive an official copy signed by the Office",
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

  const renderStep = () => {
    switch (step) {
      case "landlord":
        return (
          <div className="space-y-5">
            <div className={secHdr}>
              <p className="font-bold text-teal-800 text-sm flex items-center gap-2">
                <Key size={16} /> {L("TAARIFA ZA MPANGISHAJI", "LANDLORD INFORMATION")}
              </p>
              <p className="text-xs text-teal-600 mt-0.5">
                {L(
                  "Wewe ndiye mpangishaji — taarifa zako zimechukuliwa kutoka kwenye wasifu wako",
                  "You are the landlord — your details are taken from your profile",
                )}
              </p>
            </div>
            {userProfile?.is_verified ? (
              <div className="bg-teal-50 border border-teal-200 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-3">
                  <UserCheck size={16} className="text-teal-600" />
                  <span className="text-xs font-bold text-teal-700 uppercase tracking-wide">
                    {L("Mpangishaji Aliyethibitishwa", "Verified Landlord")}
                  </span>
                  <span className="ml-auto text-[10px] font-black text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">
                    ✓ {L("IMETHIBITISHWA", "VERIFIED")}
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
                      L("Wilaya / Kata", "District / Ward"),
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
              <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex gap-3">
                <UserX size={18} className="text-red-500 shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-bold text-red-700">
                    {L("Akaunti Yako Haijathibitishwa", "Your Account is Not Verified")}
                  </p>
                  <p className="text-xs text-red-600 mt-1">
                    {L(
                      "Lazima akaunti yako ithibitishwe kabla ya kutumia huduma hii.",
                      "Your account must be verified before using this service.",
                    )}
                  </p>
                </div>
              </div>
            )}
            <div className="bg-teal-50 border border-teal-100 rounded-xl p-3 flex gap-2">
              <Info size={14} className="text-teal-500 shrink-0 mt-0.5" />
              <p className="text-xs text-teal-700">
                {L(
                  "Makubaliano ya Pango yanafanywa kati ya Mpangishaji (mwenye nyumba) na Mpangaji (mtumiaji wa nyumba). Wote lazima wawe wananchi waliothibitishwa kwenye mfumo.",
                  "A Rental Agreement is between a Landlord (property owner) and Tenant (occupier). Both must be verified citizens in the system.",
                )}
              </p>
            </div>
          </div>
        );

      case "tenant":
        return (
          <div className="space-y-5">
            <div className={secHdr}>
              <p className="font-bold text-teal-800 text-sm flex items-center gap-2">
                <Search size={16} /> {L("TAFUTA MPANGAJI", "FIND THE TENANT")}
              </p>
              <p className="text-xs text-teal-600 mt-0.5">
                {L(
                  "Ingiza namba ya NIDA, simu, au CT ID ya mpangaji",
                  "Enter the tenant's NIDA, phone or CT ID to search",
                )}
              </p>
            </div>
            <Field name="tenant_search_type" label={L("Tafuta Kwa", "Search By")}>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { value: "NIDA", label: "NIDA" },
                  { value: "PHONE", label: L("Simu", "Phone") },
                  { value: "CT_ID", label: "CT ID" },
                ].map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => {
                      set("tenant_search_type", opt.value);
                      setTenantFound(null);
                      setTenantError("");
                    }}
                    className={`py-2.5 rounded-xl border-2 text-xs font-bold transition-all ${vals.tenant_search_type === opt.value ? "bg-teal-50 border-teal-500 text-teal-700" : "bg-white border-stone-200 text-stone-500 hover:border-stone-300"}`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </Field>
            <Field
              name="tenant"
              label={L(
                `Namba ya ${vals.tenant_search_type === "PHONE" ? "Simu" : vals.tenant_search_type}`,
                `${vals.tenant_search_type === "PHONE" ? "Phone" : vals.tenant_search_type} Number`,
              )}
              required
            >
              <div className="flex gap-2">
                <input
                  value={vals.tenant_search_term}
                  onChange={(e) => {
                    set("tenant_search_term", e.target.value);
                    setTenantFound(null);
                    setTenantError("");
                    clrErr("tenant");
                  }}
                  placeholder={
                    vals.tenant_search_type === "PHONE"
                      ? "+255 7XX XXX XXX"
                      : vals.tenant_search_type === "CT_ID"
                        ? "CT2026A00001"
                        : "XXXX-XXXX-XXXX-XXXX-XXXX"
                  }
                  className={`flex-1 ${inputCls("tenant")}`}
                  onKeyDown={(e) => e.key === "Enter" && searchTenant()}
                />
                <button
                  type="button"
                  onClick={searchTenant}
                  disabled={tenantSearching}
                  className="px-4 py-3 bg-teal-600 hover:bg-teal-700 disabled:bg-teal-400 text-white rounded-xl font-bold text-sm flex items-center gap-2 transition-colors"
                >
                  {tenantSearching ? (
                    <Loader2 size={15} className="animate-spin" />
                  ) : (
                    <Search size={15} />
                  )}
                  <span className="hidden sm:inline">{L("Tafuta", "Search")}</span>
                </button>
              </div>
            </Field>
            {tenantError && (
              <div className="bg-red-50 border border-red-200 rounded-xl p-3 flex gap-2">
                <UserX size={15} className="text-red-500 shrink-0 mt-0.5" />
                <p className="text-xs text-red-700 font-medium">{tenantError}</p>
              </div>
            )}
            {tenantFound && (
              <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-3">
                  <UserCheck size={16} className="text-emerald-600" />
                  <span className="text-xs font-bold text-emerald-700 uppercase tracking-wide">
                    {L("Mpangaji Amepatikana na Kuthibitishwa", "Tenant Found & Verified")}
                  </span>
                  <span className="ml-auto text-[10px] font-black text-emerald-700 bg-emerald-200 px-2 py-0.5 rounded-full">
                    ✓ {L("AKTIV", "ACTIVE")}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    [
                      L("Jina Kamili", "Full Name"),
                      `${tenantFound.first_name} ${tenantFound.middle_name || ""} ${tenantFound.last_name}`.trim(),
                    ],
                    ["NIDA", tenantFound.nida_number || "—"],
                    [L("Simu", "Phone"), tenantFound.phone || "—"],
                    [L("Mkoa", "Region"), tenantFound.region || "—"],
                    [L("Wilaya", "District"), tenantFound.district || "—"],
                    [L("Kata", "Ward"), tenantFound.ward || "—"],
                  ].map(([l, v]) => (
                    <div key={String(l)} className="bg-white rounded-lg px-3 py-2">
                      <p className="text-[9px] text-stone-400 uppercase tracking-wide">{l}</p>
                      <p className="text-xs font-bold text-stone-800 truncate">{v}</p>
                    </div>
                  ))}
                </div>
                <p className="text-xs text-emerald-600 mt-3 font-medium">
                  {L(
                    "✓ Hii ndiyo taarifa za mpangaji. Hakikisha ni sahihi kabla ya kuendelea.",
                    "✓ These are the tenant's details. Confirm they are correct before proceeding.",
                  )}
                </p>
              </div>
            )}
          </div>
        );

      case "property":
        return (
          <div className="space-y-5">
            <div className={secHdr}>
              <p className="font-bold text-teal-800 text-sm flex items-center gap-2">
                <Home size={16} /> {L("TAARIFA ZA NYUMBA / MALI", "PROPERTY DETAILS")}
              </p>
            </div>
            <Field name="property_type" label={L("Aina ya Mali", "Property Type")} required>
              <Sel
                name="property_type"
                value={vals.property_type}
                onChange={(v) => {
                  set("property_type", v);
                  clrErr("property_type");
                }}
                options={PROPERTY_TYPES}
              />
            </Field>
            <Field
              name="property_address"
              label={L("Mtaa / Namba ya Nyumba", "Street / House Number")}
              required
              hint={L("Mfano: Makonde St, No. 12", "E.g. Makonde St, No. 12")}
            >
              <TI
                name="property_address"
                value={vals.property_address}
                onChange={(v) => {
                  set("property_address", v);
                  clrErr("property_address");
                }}
                placeholder={L("Mtaa na namba ya nyumba", "Street and house number")}
              />
            </Field>
            <AddressFields
              lang={lang}
              region={vals.property_region}
              district={vals.property_district}
              ward={vals.property_ward}
              onRegion={(v) => {
                set("property_region", v);
                set("property_district", "");
                set("property_ward", "");
              }}
              onDistrict={(v) => {
                set("property_district", v);
                set("property_ward", "");
              }}
              onWard={(v) => set("property_ward", v)}
              errors={errors}
              clearError={clrErr}
              fieldPrefix="property"
              autofillFrom={userProfile}
            />
            <div className="grid grid-cols-2 gap-3">
              <Field
                name="num_rooms"
                label={L("Idadi ya Vyumba (Hiari)", "Number of Rooms (Optional)")}
              >
                <TI
                  name="num_rooms"
                  value={vals.num_rooms}
                  onChange={(v) => set("num_rooms", v)}
                  placeholder={L("Mfano: 3", "E.g. 3")}
                />
              </Field>
              <Field name="floor_level" label={L("Ghorofa (Hiari)", "Floor Level (Optional)")}>
                <TI
                  name="floor_level"
                  value={vals.floor_level}
                  onChange={(v) => set("floor_level", v)}
                  placeholder={L("Mfano: Ghorofa 2", "E.g. Floor 2")}
                />
              </Field>
            </div>
            {/* Utilities included */}
            <Field
              name="utilities"
              label={L("Huduma Zilizojumuishwa katika Kodi", "Utilities Included in Rent")}
            >
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mt-1">
                {UTILITIES_OPTIONS.map((u) => (
                  <button
                    key={u.key}
                    type="button"
                    onClick={() => toggleUtility(u.key)}
                    className={`py-2 px-3 rounded-xl border-2 text-xs font-bold transition-all flex items-center gap-1.5 ${vals.included_utilities.includes(u.key) ? "bg-teal-50 border-teal-500 text-teal-700" : "bg-white border-stone-200 text-stone-500"}`}
                  >
                    <span>{u.icon}</span>{" "}
                    {lang === "sw"
                      ? u.label.split("(")[0].trim()
                      : u.label.split("(")[1]?.replace(")", "") || u.label.split("(")[0].trim()}
                  </button>
                ))}
              </div>
            </Field>
            {/* Rent & financial */}
            <div className="border border-teal-200 rounded-xl overflow-hidden">
              <div className="bg-teal-50 px-4 py-2.5 border-b border-teal-100">
                <p className="text-xs font-bold text-teal-700 uppercase tracking-wide">
                  {L("MALIPO NA MUDA WA MKATABA", "PAYMENT & LEASE TERMS")}
                </p>
              </div>
              <div className="p-4 space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <Field
                    name="monthly_rent"
                    label={L("Kodi ya Kila Mwezi (TSh)", "Monthly Rent (TSh)")}
                    required
                  >
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-400 text-xs font-bold pointer-events-none">
                        TSh
                      </span>
                      <input
                        type="number"
                        value={vals.monthly_rent}
                        onChange={(e) => {
                          set("monthly_rent", e.target.value);
                          clrErr("monthly_rent");
                        }}
                        placeholder="300,000"
                        className={`${inputCls("monthly_rent")} pl-12`}
                      />
                    </div>
                  </Field>
                  <Field
                    name="deposit_amount"
                    label={L("Amana (TSh)", "Deposit (TSh)")}
                    hint={L("Kawaida miezi 1-3 ya kodi", "Usually 1–3 months rent")}
                  >
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-400 text-xs font-bold pointer-events-none">
                        TSh
                      </span>
                      <input
                        type="number"
                        value={vals.deposit_amount}
                        onChange={(e) => set("deposit_amount", e.target.value)}
                        placeholder="600,000"
                        className={`${inputCls("deposit_amount")} pl-12`}
                      />
                    </div>
                  </Field>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <Field
                    name="payment_frequency"
                    label={L("Mzunguko wa Malipo", "Payment Frequency")}
                  >
                    <Sel
                      name="payment_frequency"
                      value={vals.payment_frequency}
                      onChange={(v) => set("payment_frequency", v)}
                      options={PAYMENT_FREQ}
                    />
                  </Field>
                  <Field
                    name="payment_day"
                    label={L("Siku ya Kulipa (ya Mwezi)", "Payment Day (of Month)")}
                    hint={L("Mfano: 1, 5, au 15", "E.g. 1st, 5th, or 15th")}
                  >
                    <TI
                      name="payment_day"
                      value={vals.payment_day}
                      onChange={(v) => set("payment_day", v)}
                      placeholder="1"
                    />
                  </Field>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <Field
                    name="lease_start"
                    label={L("Tarehe ya Kuanza", "Lease Start Date")}
                    required
                  >
                    <TI
                      name="lease_start"
                      value={vals.lease_start}
                      type="date"
                      onChange={(v) => {
                        set("lease_start", v);
                        clrErr("lease_start");
                      }}
                    />
                  </Field>
                  <Field name="lease_duration" label={L("Muda wa Mkataba", "Lease Duration")}>
                    <Sel
                      name="lease_duration"
                      value={vals.lease_duration}
                      onChange={(v) => set("lease_duration", v)}
                      options={LEASE_DURATION}
                    />
                  </Field>
                </div>
                <Field
                  name="notice_period"
                  label={L("Kipindi cha Taarifa ya Kutoka", "Notice Period to Vacate")}
                >
                  <Sel
                    name="notice_period"
                    value={vals.notice_period}
                    onChange={(v) => set("notice_period", v)}
                    options={NOTICE_PERIODS}
                  />
                </Field>
              </div>
            </div>
            {monthlyRent > 0 && (
              <div className="bg-teal-50 border border-teal-100 rounded-xl px-4 py-3 flex justify-between items-center">
                <div>
                  <span className="text-xs text-stone-500">
                    {L("Ada ya Huduma", "Service Fee")}
                  </span>
                  <p className="text-xs text-teal-600">
                    {L(
                      "(kodi 1 mwezi au TSh 10,000 — kilicho kikubwa)",
                      "(1 month rent or TSh 10,000 — whichever is greater)",
                    )}
                  </p>
                </div>
                <span className="font-black text-teal-700">{fmtTsh(serviceFee)}</span>
              </div>
            )}
            {/* Documents */}
            <div>
              <label className={lbl}>
                {L("Nyaraka za Nyumba (Hiari)", "Property Documents (Optional)")}
              </label>
              <p className="text-xs text-stone-400 mb-2">
                {L(
                  "Mfano: Picha za nyumba, hati ya umiliki, risiti ya kodi iliyopita",
                  "E.g. Property photos, ownership certificate, previous rent receipt",
                )}
              </p>
              <div
                onClick={() => docRef.current?.click()}
                className={`border-2 border-dashed rounded-xl p-4 cursor-pointer transition-all text-center ${docs.length > 0 ? "border-teal-400 bg-teal-50" : "border-stone-300 hover:border-teal-400 hover:bg-teal-50/40"}`}
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
                          <div className="w-9 h-9 bg-teal-100 rounded-lg flex items-center justify-center shrink-0">
                            <FileText size={15} className="text-teal-600" />
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
                          className="p-1.5 text-red-400 hover:text-red-600 rounded-full"
                        >
                          <X size={13} />
                        </button>
                      </div>
                    ))}
                    <p className="text-xs text-teal-600 font-medium">
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
                  let le = "";
                  files.forEach((f) => {
                    const er = addDoc(f);
                    if (er) le = er;
                  });
                  if (le) setDocErr(le);
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
        );

      case "terms":
        return (
          <div className="space-y-5">
            <div className={secHdr}>
              <p className="font-bold text-teal-800 text-sm flex items-center gap-2">
                <FileCheck size={16} /> {L("MASHARTI NA SHAHIDI", "TERMS & WITNESSES")}
              </p>
            </div>
            <Field
              name="house_rules"
              label={L("Kanuni za Nyumba (Hiari)", "House Rules (Optional)")}
              hint={L(
                "Mfano: Marufuku ya kelele baada ya saa 4 usiku, marufuku ya wanyama wa kufugwa, n.k.",
                "E.g. No noise after 10pm, no pets, etc.",
              )}
            >
              <textarea
                value={vals.house_rules}
                onChange={(e) => set("house_rules", e.target.value)}
                rows={3}
                placeholder={L(
                  "Kanuni za nyumba zinazokubaliana na pande zote...",
                  "House rules agreed by both parties...",
                )}
                className={`${inputCls("house_rules")} resize-none`}
              />
            </Field>
            <Field
              name="special_conditions"
              label={L("Masharti Maalum Mengine (Hiari)", "Other Special Conditions (Optional)")}
            >
              <textarea
                value={vals.special_conditions}
                onChange={(e) => set("special_conditions", e.target.value)}
                rows={3}
                placeholder={L(
                  "Masharti yoyote ya ziada yanayokubaliana na pande zote mbili...",
                  "Any additional terms agreed by both parties...",
                )}
                className={`${inputCls("special_conditions")} resize-none`}
              />
            </Field>
            {[
              {
                num: 1,
                nameKey: "witness1_name" as const,
                phoneKey: "witness1_phone" as const,
                nidaKey: "witness1_nida" as const,
              },
              {
                num: 2,
                nameKey: "witness2_name" as const,
                phoneKey: "witness2_phone" as const,
                nidaKey: "witness2_nida" as const,
              },
            ].map((w) => (
              <div key={w.num} className="border border-stone-200 rounded-xl overflow-hidden">
                <div className="bg-stone-50 px-4 py-2.5 border-b border-stone-100 flex items-center gap-2">
                  <Users size={13} className="text-stone-500" />
                  <span className="text-xs font-bold text-stone-700 uppercase tracking-wide">
                    {L(`SHAHIDI ${w.num}`, `WITNESS ${w.num}`)} *
                  </span>
                </div>
                <div className="p-4 space-y-3">
                  <div className="relative">
                    <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2">
                      <Search size={13} className="text-emerald-600 shrink-0" />
                      <input
                        value={witnessSearch[("w" + w.num) as "w1" | "w2"]}
                        onChange={(e) =>
                          searchWitness(e.target.value, ("w" + w.num) as "w1" | "w2")
                        }
                        placeholder={L("Tafuta shahidi...", "Search witness...")}
                        className="flex-1 text-xs bg-transparent outline-none placeholder-emerald-400"
                      />
                    </div>
                    {witnessResults[("w" + w.num) as "w1" | "w2"].length > 0 && (
                      <div className="absolute z-20 left-0 right-0 mt-1 bg-white border border-stone-200 rounded-lg shadow-lg max-h-32 overflow-y-auto">
                        {witnessResults[("w" + w.num) as "w1" | "w2"].map((r) => (
                          <button
                            key={r.id}
                            type="button"
                            onClick={() => selectWitness(w.num as 1 | 2, r)}
                            className="w-full px-3 py-2 hover:bg-emerald-50 flex items-center gap-2 text-left border-b border-stone-50"
                          >
                            <Users size={12} className="text-emerald-600" />
                            <div>
                              <p className="text-xs font-bold">{r.name}</p>
                              <p className="text-[10px] text-stone-400">{r.phone}</p>
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                    <p className="text-[9px] text-stone-400 mt-0.5">
                      {L("Au ingiza kwa mkono", "Or enter manually below")}
                    </p>
                  </div>
                  <Field name={w.nameKey} label={L("Jina Kamili", "Full Name")} required>
                    <TI
                      name={w.nameKey}
                      value={vals[w.nameKey]}
                      onChange={(v) => {
                        set(w.nameKey, v);
                        clrErr(w.nameKey);
                      }}
                      placeholder={L("Jina kamili la shahidi", "Witness's full name")}
                    />
                  </Field>
                  <div className="grid grid-cols-2 gap-3">
                    <Field name={w.phoneKey} label={L("Simu", "Phone")} required>
                      <TI
                        name={w.phoneKey}
                        value={vals[w.phoneKey]}
                        onChange={(v) => {
                          set(w.phoneKey, v);
                          clrErr(w.phoneKey);
                        }}
                        placeholder="+255 7XX XXX XXX"
                      />
                    </Field>
                    <Field name={w.nidaKey} label={L("NIDA (Hiari)", "NIDA (Optional)")}>
                      <TI
                        name={w.nidaKey}
                        value={vals[w.nidaKey]}
                        onChange={(v) => set(w.nidaKey, v)}
                        placeholder="XXXX-XXXX..."
                      />
                    </Field>
                  </div>
                </div>
              </div>
            ))}
            <div className="bg-teal-50 border border-teal-100 rounded-xl p-3 flex gap-2">
              <Shield size={14} className="text-teal-500 shrink-0 mt-0.5" />
              <p className="text-xs text-teal-700">
                {L(
                  "Mashahidi wawili wanahitajika kisheria. Wasijuane na mpangishaji au mpangaji kwa karibu sana.",
                  "Two witnesses are legally required. They should not be closely related to either the landlord or tenant.",
                )}
              </p>
            </div>
          </div>
        );

      case "preview":
        return (
          <div className="space-y-4">
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex gap-3">
              <Eye size={18} className="text-amber-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold text-amber-800 text-sm">
                  {L(
                    "Hakiki Makubaliano Kabla ya Kuwasilisha",
                    "Review Agreement Before Submitting",
                  )}
                </p>
                <p className="text-xs text-amber-700 mt-0.5">
                  {L(
                    "Baada ya kuwasilisha, Ofisi itakagua na kutoa nakala kwa pande zote mbili.",
                    "After submission, the Office will review and issue copies to both parties.",
                  )}
                </p>
              </div>
            </div>
            <PSection
              icon={<Key size={14} />}
              title={L("Mpangishaji", "Landlord")}
              stepKey="landlord"
            >
              <PRow
                label={L("Jina", "Name")}
                value={`${userProfile?.first_name} ${userProfile?.last_name}`}
              />
              <PRow label="NIDA" value={userProfile?.nida_number} />
              <PRow label={L("Simu", "Phone")} value={userProfile?.phone} />
            </PSection>
            <PSection
              icon={<UserCheck size={14} />}
              title={L("Mpangaji", "Tenant")}
              stepKey="tenant"
            >
              <PRow
                label={L("Jina", "Name")}
                value={`${tenantFound?.first_name} ${tenantFound?.last_name}`}
              />
              <PRow label="NIDA" value={tenantFound?.nida_number} />
              <PRow label={L("Simu", "Phone")} value={tenantFound?.phone} />
            </PSection>
            <PSection icon={<Home size={14} />} title={L("Nyumba", "Property")} stepKey="property">
              <PRow
                label={L("Aina", "Type")}
                value={PROPERTY_TYPES.find((p) => p.value === vals.property_type)?.label}
              />
              <PRow label={L("Anwani", "Address")} value={vals.property_address} />
              {vals.num_rooms && <PRow label={L("Vyumba", "Rooms")} value={vals.num_rooms} />}
              <PRow
                label={L("Kodi ya Mwezi", "Monthly Rent")}
                value={monthlyRent > 0 ? fmtTsh(monthlyRent) : "—"}
              />
              <PRow label={L("Amana", "Deposit")} value={deposit > 0 ? fmtTsh(deposit) : "—"} />
              <PRow label={L("Tarehe ya Kuanza", "Start Date")} value={vals.lease_start} />
              <PRow
                label={L("Muda wa Mkataba", "Lease Duration")}
                value={LEASE_DURATION.find((l) => l.value === vals.lease_duration)?.label}
              />
              <PRow
                label={L("Taarifa ya Kutoka", "Notice Period")}
                value={NOTICE_PERIODS.find((n) => n.value === vals.notice_period)?.label}
              />
              {vals.included_utilities.length > 0 && (
                <PRow
                  label={L("Huduma Zilizojumuishwa", "Included Utilities")}
                  value={vals.included_utilities
                    .map((u) => UTILITIES_OPTIONS.find((o) => o.key === u)?.icon)
                    .join(" ")}
                />
              )}
            </PSection>
            <PSection
              icon={<Users size={14} />}
              title={L("Mashahidi", "Witnesses")}
              stepKey="terms"
            >
              <PRow
                label={L("Shahidi 1", "Witness 1")}
                value={`${vals.witness1_name} · ${vals.witness1_phone}`}
              />
              <PRow
                label={L("Shahidi 2", "Witness 2")}
                value={`${vals.witness2_name} · ${vals.witness2_phone}`}
              />
              {vals.house_rules && (
                <>
                  <p className="col-span-2 text-xs text-stone-500">
                    {L("Kanuni za Nyumba", "House Rules")}
                  </p>
                  <p className="col-span-2 text-xs font-bold text-stone-800">{vals.house_rules}</p>
                </>
              )}
            </PSection>
            <div className="bg-teal-50 border border-teal-200 rounded-xl p-4 flex justify-between items-center">
              <div>
                <span className="font-bold text-teal-800 text-sm">
                  {L("Ada ya Huduma:", "Service Fee:")}
                </span>
                <p className="text-xs text-teal-600">
                  {L(
                    "Kodi 1 mwezi au TSh 10,000 — kilicho kikubwa",
                    "1 month rent or TSh 10,000 — whichever is greater",
                  )}
                </p>
              </div>
              <span className="text-xl font-black text-teal-700">{fmtTsh(serviceFee)}</span>
            </div>
            <div className="space-y-3">
              <p className="text-xs font-black text-stone-600 uppercase tracking-wider">
                {L("IDHINI NA UTHIBITISHO", "CONSENT & CONFIRMATION")}
              </p>
              {[
                {
                  key: "landlord_confirmed" as const,
                  sw: "Mimi (Mpangishaji) nathibitisha kwamba mimi ndiye mmiliki halali wa mali hii na nina haki ya kuipangisha.",
                  en: "I (Landlord) confirm that I am the rightful owner of this property and have the right to rent it out.",
                },
                {
                  key: "terms_accepted" as const,
                  sw: "Nathibitisha kwamba taarifa zote ni za kweli na ninakubaliana na masharti ya Serikali ya Mtaa kuhusiana na makubaliano haya ya pango.",
                  en: "I confirm all information is accurate and agree to the Local Government terms for this rental agreement.",
                },
              ].map((item) => (
                <label
                  key={item.key}
                  className={`flex items-start gap-3 cursor-pointer rounded-xl p-3 border transition-colors ${vals[item.key] ? "bg-teal-50 border-teal-300" : "bg-stone-50 border-stone-200 hover:bg-teal-50/50"}`}
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
              {(errors.landlord_confirmed || errors.terms_accepted) && (
                <p className="text-red-500 text-xs flex items-center gap-1">
                  <AlertCircle size={11} />
                  {errors.landlord_confirmed || errors.terms_accepted}
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
                  "Saini hapa chini kuthibitisha makubaliano haya.",
                  "Sign below to confirm this agreement.",
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
              className="flex-1 py-3.5 bg-gradient-to-r from-teal-600 to-cyan-600 hover:from-teal-700 hover:to-cyan-700 text-white rounded-xl font-bold shadow-lg transition-all flex items-center justify-center gap-2 text-sm"
            >
              {step === "terms" ? (
                <>
                  <Eye size={17} /> {L("Hakiki Makubaliano", "Preview Agreement")}
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
              className="flex-1 py-3.5 bg-gradient-to-r from-teal-600 to-cyan-600 hover:from-teal-700 hover:to-cyan-700 text-white rounded-xl font-bold shadow-lg transition-all flex items-center justify-center gap-2 text-sm disabled:opacity-60 disabled:cursor-not-allowed"
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

export default MakubalianoPangoForm;
