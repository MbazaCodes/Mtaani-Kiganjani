/**
 * Migogoro na Mashauri — Disputes & Local Issues Form
 *
 * Two paths:
 *  A) CITIZEN-TO-CITIZEN dispute — must name respondent (lookup
 *     by NIDA/Phone/CT_ID like Sales/Rental forms)
 *  B) COMMUNITY ISSUE report — public/civic issue (sanitation,
 *     roads, lights, etc.) — no respondent
 *
 * Fee: TSh 5,000 (Mediation/processing fee)
 * Color: Rose/red (dispute)
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
  Search,
  UserCheck,
  Users,
  Scale,
  Megaphone,
  Gavel,
  Shield,
} from "lucide-react";
import { SignaturePad } from "@/components/ui/SignaturePad";
import { FormProps, labels } from "./types";
import { AddressFields } from "./AddressFields";
import { ProgressFill } from "../ui/ProgressFill";
import { supabase } from "../../lib/supabase";

// ─── Constants ───────────────────────────────────────────────────────────────

const SERVICE_FEE = 5000;

// Citizen-vs-citizen dispute types
const DISPUTE_TYPES = [
  { label: "Mgogoro wa Ardhi (Land Dispute)", value: "ARDHI" },
  { label: "Mipaka ya Ardhi (Boundary Dispute)", value: "MIPAKA" },
  { label: "Mali na Urithi (Property / Inheritance)", value: "URITHI" },
  { label: "Masuala ya Ndoa (Marriage Issues)", value: "NDOA" },
  { label: "Watoto / Malezi (Children / Custody)", value: "WATOTO" },
  { label: "Ndugu / Familia (Family Relations)", value: "FAMILIA" },
  { label: "Mgogoro wa Biashara (Business Dispute)", value: "BIASHARA" },
  { label: "Mkopo / Madeni (Debt / Loan)", value: "MKOPO" },
  { label: "Kelele za Majirani (Noise from Neighbours)", value: "KELELE" },
  { label: "Ugomvi wa Kibinafsi (Personal Conflict)", value: "UGOMVI" },
  { label: "Mauzo / Ununuzi (Sale / Purchase Disagreement)", value: "MAUZO" },
  { label: "Pango (Rental Dispute)", value: "PANGO" },
  { label: "Nyingine (Other)", value: "NYINGINE" },
];

// Community / civic issue types
const ISSUE_TYPES = [
  { label: "Usafi wa Mazingira (Environmental Sanitation)", value: "USAFI" },
  { label: "Taka Zisizoinuliwa (Uncollected Garbage)", value: "TAKA" },
  { label: "Barabara Mbovu (Damaged Road)", value: "BARABARA" },
  { label: "Mifereji ya Maji (Drainage Blockage)", value: "MIFEREJI" },
  { label: "Maji Safi (Water Supply Problem)", value: "MAJI" },
  { label: "Umeme wa Barabara (Street Lighting)", value: "UMEME" },
  { label: "Ujenzi Haramu (Illegal Construction)", value: "UJENZI_HARAMU" },
  { label: "Tendo la Uhalifu (Criminal Activity / Safety)", value: "UHALIFU" },
  { label: "Wanyama Wapotevu / Mifugo Mtaani (Stray Animals)", value: "WANYAMA" },
  { label: "Uchafuzi wa Hewa / Maji (Air / Water Pollution)", value: "UCHAFUZI" },
  { label: "Sehemu ya Hatari (Safety Hazard)", value: "HATARI" },
  { label: "Nyingine (Other)", value: "NYINGINE" },
];

const URGENCY_LEVELS = [
  { label: "Kawaida (Normal)", value: "NORMAL", color: "bg-stone-100 text-stone-700" },
  { label: "Haraka (Urgent)", value: "URGENT", color: "bg-amber-100 text-amber-700" },
  { label: "Dharura (Emergency)", value: "EMERGENCY", color: "bg-red-100 text-red-700" },
];

const RESOLUTION_PREFERENCES = [
  { label: "Mapatanisho ya Kirafiki (Friendly Reconciliation / Mediation)", value: "MEDIATION" },
  { label: "Mahakama ya Mtaa (Local Tribunal)", value: "TRIBUNAL" },
  { label: "Mahakama Kuu (Formal Court)", value: "COURT" },
  { label: "Ushauri Tu (Advice Only — No Action)", value: "ADVICE" },
];

const ALLOWED_DOCS = ["image/jpeg", "image/png", "image/webp", "application/pdf"];
const MAX_DOC_SIZE = 10 * 1024 * 1024;

// ─── Types ────────────────────────────────────────────────────────────────────

type Step = "mode" | "respondent" | "details" | "documents" | "preview";
type Mode = "CITIZEN_DISPUTE" | "COMMUNITY_ISSUE" | "";

interface RespondentProfile {
  id: string;
  first_name: string;
  last_name: string;
  middle_name?: string;
  nida_number?: string;
  phone?: string;
  email: string;
  region?: string;
  district?: string;
  ward?: string;
}

interface UploadedDoc {
  file: File;
  preview: string;
  label: string;
}

interface FormValues {
  mode: Mode;
  // CITIZEN_DISPUTE
  dispute_type: string;
  respondent_search_term: string;
  respondent_search_type: string;
  respondent_known_outside_system: boolean;
  respondent_name_manual: string;
  respondent_phone_manual: string;
  respondent_address_manual: string;
  // COMMUNITY_ISSUE
  issue_type: string;
  issue_location: string;
  issue_ward: string;
  issue_region: string;
  issue_district: string;
  // Both
  incident_date: string;
  title: string;
  description: string;
  urgency: string;
  resolution_preference: string;
  witness1_name: string;
  witness1_phone: string;
  witness2_name: string;
  witness2_phone: string;
  witness1_user_id?: string;
  witness2_user_id?: string;
  // Consent
  terms_accepted: boolean;
  data_confirmed: boolean;
}

// ─── Component ───────────────────────────────────────────────────────────────

export const MgogoroMashauriForm: React.FC<FormProps> = ({
  onSubmit,
  isLoading,
  lang = "sw",
  userProfile,
}) => {
  const t = labels[lang];
  const L = useCallback((sw: string, en: string) => (lang === "sw" ? sw : en), [lang]);

  const [step, setStep] = useState<Step>("mode");
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

  // Respondent lookup state (citizen-vs-citizen)
  const [respondentFound, setRespondentFound] = useState<RespondentProfile | null>(null);
  const [respondentSearching, setRSearching] = useState(false);
  const [respondentError, setRespondentError] = useState("");
  const [witnessSearch, setWitnessSearch] = useState<{ w1: string; w2: string }>({
    w1: "",
    w2: "",
  });
  const [witnessResults, setWitnessResults] = useState<{
    w1: { id: string; name: string; phone: string }[];
    w2: { id: string; name: string; phone: string }[];
  }>({ w1: [], w2: [] });
  const searchDisputeWitness = async (q: string, wKey: "w1" | "w2") => {
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
      .limit(4);
    setWitnessResults((prev) => ({
      ...prev,
      [wKey]: (data || []).map(
        (u: { id: string; first_name?: string; last_name?: string; phone?: string }) => ({
          id: u.id,
          name: (u.first_name || "") + " " + (u.last_name || ""),
          phone: u.phone || "",
        }),
      ),
    }));
  };
  const selectDisputeWitness = (wNum: 1 | 2, w: { id: string; name: string; phone: string }) => {
    setVals((p) => ({
      ...p,
      ["witness" + wNum + "_name"]: w.name,
      ["witness" + wNum + "_phone"]: w.phone,
      ["witness" + wNum + "_user_id"]: w.id,
    }));
    setWitnessSearch((prev) => ({ ...prev, ["w" + wNum]: "" }));
    setWitnessResults((prev) => ({ ...prev, ["w" + wNum]: [] }));
  };

  const [vals, setVals] = useState<FormValues>({
    mode: "",
    dispute_type: "",
    respondent_search_term: "",
    respondent_search_type: "NIDA",
    respondent_known_outside_system: false,
    respondent_name_manual: "",
    respondent_phone_manual: "",
    respondent_address_manual: "",
    issue_type: "",
    issue_location: "",
    issue_ward: userProfile?.ward || "",
    issue_region: userProfile?.region || "",
    issue_district: userProfile?.district || "",
    incident_date: "",
    title: "",
    description: "",
    urgency: "NORMAL",
    resolution_preference: "",
    witness1_name: "",
    witness1_user_id: "",
    witness2_user_id: "",
    witness1_phone: "",
    witness2_name: "",
    witness2_phone: "",
    terms_accepted: false,
    data_confirmed: false,
  });

  const isCitizenDispute = vals.mode === "CITIZEN_DISPUTE";
  const isCommunityIssue = vals.mode === "COMMUNITY_ISSUE";

  // ─── Steps depend on mode ────────────────────────────────────────────────
  // Citizen dispute: mode → respondent → details → documents → preview (5 steps)
  // Community issue: mode → details → documents → preview (4 steps — no respondent)
  const STEPS_CITIZEN: { key: Step; label: string; sw: string }[] = [
    { key: "mode", label: "Type", sw: "Aina" },
    { key: "respondent", label: "Respondent", sw: "Mlalamikiwa" },
    { key: "details", label: "Details", sw: "Maelezo" },
    { key: "documents", label: "Documents", sw: "Nyaraka" },
    { key: "preview", label: "Preview", sw: "Hakiki" },
  ];
  const STEPS_COMMUNITY: { key: Step; label: string; sw: string }[] = [
    { key: "mode", label: "Type", sw: "Aina" },
    { key: "details", label: "Details", sw: "Maelezo" },
    { key: "documents", label: "Documents", sw: "Nyaraka" },
    { key: "preview", label: "Preview", sw: "Hakiki" },
  ];
  const STEPS = isCitizenDispute
    ? STEPS_CITIZEN
    : isCommunityIssue
      ? STEPS_COMMUNITY
      : [{ key: "mode" as Step, label: "Type", sw: "Aina" }];
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

  // ─── Respondent lookup ───────────────────────────────────────────────────
  const searchRespondent = async () => {
    const term = vals.respondent_search_term.trim();
    if (!term) {
      setRespondentError(L("Ingiza namba ya kutafuta", "Enter a search term"));
      return;
    }
    setRSearching(true);
    setRespondentError("");
    setRespondentFound(null);
    try {
      let query = supabase.from("users").select("*");
      if (vals.respondent_search_type === "NIDA") query = query.eq("nida_number", term);
      if (vals.respondent_search_type === "PHONE") query = query.eq("phone", term);
      if (vals.respondent_search_type === "CT_ID") query = query.eq("citizen_id", term);
      const { data, error } = await query.single();
      if (error || !data) {
        setRespondentError(
          L(
            "Mtu huyu hayupo kwenye mfumo. Unaweza kuingiza taarifa zake kwa mkono hapo chini.",
            "Person not found in the system. You can enter their details manually below.",
          ),
        );
        return;
      }
      if (data.id === userProfile?.id) {
        setRespondentError(
          L(
            "Huwezi kuwasilisha mgogoro dhidi yako mwenyewe.",
            "You cannot file a dispute against yourself.",
          ),
        );
        return;
      }
      setRespondentFound(data as RespondentProfile);
    } catch {
      setRespondentError(
        L("Hitilafu ya mtandao. Jaribu tena.", "Network error. Please try again."),
      );
    } finally {
      setRSearching(false);
    }
  };

  // ─── Doc helpers ─────────────────────────────────────────────────────────
  const addDoc = useCallback(
    (file: File): string | null => {
      if (!ALLOWED_DOCS.includes(file.type))
        return L("Aina ya faili haikushukuliwa", "File type not allowed");
      if (file.size > MAX_DOC_SIZE)
        return L("Faili kubwa sana. Upeo ni 10MB", "File too large. Max 10MB");
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

  // ─── Validation ─────────────────────────────────────────────────────────
  const validate = (): boolean => {
    const e: Record<string, string> = {};
    if (step === "mode") {
      if (!vals.mode) e.mode = L("Chagua aina", "Choose type");
    }
    if (step === "respondent") {
      if (!respondentFound && !vals.respondent_known_outside_system)
        e.respondent = L(
          'Tafuta mlalamikiwa au teua "Ningewainisha kwa mkono"',
          'Search the respondent or check "Enter manually"',
        );
      if (vals.respondent_known_outside_system) {
        if (!vals.respondent_name_manual.trim())
          e.respondent_name_manual = L("Jina linahitajika", "Name required");
        if (!vals.respondent_phone_manual.trim() && !vals.respondent_address_manual.trim())
          e.respondent_phone_manual = L("Simu au anwani inahitajika", "Phone or address required");
      }
    }
    if (step === "details") {
      if (isCitizenDispute && !vals.dispute_type)
        e.dispute_type = L("Chagua aina ya mgogoro", "Select dispute type");
      if (isCommunityIssue && !vals.issue_type)
        e.issue_type = L("Chagua aina ya tatizo", "Select issue type");
      if (isCommunityIssue && !vals.issue_location.trim())
        e.issue_location = L("Mahali pa tatizo panahitajika", "Issue location required");
      if (!vals.title.trim()) e.title = L("Kichwa kifupi kinahitajika", "Short title required");
      if (!vals.description.trim() || vals.description.length < 30)
        e.description = L(
          "Maelezo (angalau herufi 30) yanahitajika",
          "Description (min 30 chars) required",
        );
      if (isCitizenDispute && !vals.resolution_preference)
        e.resolution_preference = L("Chagua njia ya utatuzi", "Select preferred resolution");
    }
    if (step === "preview") {
      if (!vals.terms_accepted) e.terms_accepted = L("Lazima uthibitishe", "Must confirm");
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
      const prefix = isCitizenDispute ? "DS" : "CI"; // Dispute or Community Issue
      const ref = `${prefix}-${new Date().getFullYear()}-${Math.floor(Math.random() * 900000 + 100000)}`;
      const files = docs.map((d) => d.file);
      await onSubmit(
        {
          ...vals,
          respondent_id: respondentFound?.id,
          second_party_user_id: respondentFound?.id,
          respondent_name: respondentFound
            ? `${respondentFound.first_name} ${respondentFound.last_name}`
            : vals.respondent_name_manual,
          respondent_in_system: !!respondentFound,
          total_fee: isCitizenDispute ? SERVICE_FEE : 0,
          service_name: "Migogoro na Mashauri",
          application_reference: ref,
          applicant_signature: signature,
          document_count: docs.length,
          complainant_name:
            `${userProfile?.first_name || ""} ${userProfile?.middle_name || ""} ${userProfile?.last_name || ""}`
              .replace(/\s+/g, " ")
              .trim(),
          complainant_nida: userProfile?.nida_number || "",
          complainant_phone: userProfile?.phone || "",
          complainant_ward: userProfile?.ward || "",
        },
        files,
      );

      // Notify the respondent (if a registered citizen) that a dispute was filed against them
      if (respondentFound?.id) {
        await supabase.from("notifications").insert({
          user_id: respondentFound.id,
          title:
            lang === "sw"
              ? "Malalamiko Yamewasilishwa Dhidi Yako"
              : "A Dispute Has Been Filed Against You",
          message:
            lang === "sw"
              ? `Malalamiko (${ref}) yamewasilishwa dhidi yako. Fungua kuona maelezo na kujibu.`
              : `A dispute (${ref}) has been filed naming you as respondent. Open to view details and respond.`,
          type: "warning",
        });
      }

      // Notify registered witnesses
      const witnessIds = [vals.witness1_user_id, vals.witness2_user_id].filter(
        (id): id is string => typeof id === "string" && id.length > 0,
      );
      for (const wId of witnessIds) {
        await supabase.from("notifications").insert({
          user_id: wId,
          title: lang === "sw" ? "Umetajwa kama Shahidi" : "You are Named as a Witness",
          message:
            lang === "sw"
              ? `Umetajwa kama shahidi kwenye malalamiko (${ref}).`
              : `You have been named as a witness in a dispute (${ref}).`,
          type: "info",
        });
      }
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
      `w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-rose-500 focus:border-rose-500 outline-none transition-all bg-white text-sm ${err(name) ? "border-red-400 bg-red-50" : "border-stone-200"}`,
    [err],
  );
  const lbl = "block text-xs font-bold text-stone-600 uppercase tracking-wider mb-1.5";
  const secHdr =
    "bg-gradient-to-r from-rose-50 to-red-50 px-4 py-3 rounded-xl border-l-4 border-rose-500 mb-4";

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
            className={`flex flex-col items-center ${i <= stepIdx ? "text-rose-600" : "text-stone-300"}`}
          >
            <div
              className={`w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center font-bold text-[10px] sm:text-xs border-2 transition-all
              ${i < stepIdx ? "bg-rose-600 border-rose-600 text-white" : i === stepIdx ? "bg-rose-50 border-rose-600 text-rose-700" : "bg-stone-100 border-stone-200 text-stone-400"}`}
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
          className="bg-gradient-to-r from-rose-500 to-red-500 h-2 rounded-full transition-all duration-500"
        />
      </div>
      <div className="flex justify-between mt-1.5">
        <span className="text-xs text-stone-500 font-medium">
          {L(
            `Hatua ${stepIdx + 1} kati ya ${STEPS.length}`,
            `Step ${stepIdx + 1} of ${STEPS.length}`,
          )}
        </span>
        <span className="text-xs font-bold text-rose-600">{Math.round(progress)}%</span>
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
      <div className="bg-rose-50 px-4 py-2.5 border-b border-rose-100 flex items-center justify-between">
        <h4 className="font-bold text-rose-900 text-sm">{title}</h4>
        <button
          type="button"
          onClick={() => setStep(stepKey)}
          className="flex items-center gap-1 text-xs text-rose-700 hover:text-rose-900 font-bold hover:bg-rose-100 px-2 py-1 rounded-lg transition-colors"
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
        <div className="w-20 h-20 bg-rose-100 rounded-full flex items-center justify-center mx-auto">
          <CheckCircle2 size={40} className="text-rose-600" />
        </div>
        <div className="space-y-2">
          <h3 className="text-xl font-black text-stone-900">
            {isCitizenDispute
              ? L("Mgogoro Umewasilishwa", "Dispute Filed")
              : L("Tatizo Limeripotiwa", "Issue Reported")}
          </h3>
          <p className="text-stone-500 text-sm">
            {isCitizenDispute
              ? L(
                  "Ofisi itaitisha pande zote kwa mapatanisho.",
                  "The office will summon both parties for mediation.",
                )
              : L(
                  "Ofisi itashughulikia tatizo lako haraka iwezekanavyo.",
                  "The office will address your issue as soon as possible.",
                )}
          </p>
        </div>
        <div className="bg-rose-50 border border-rose-200 rounded-2xl p-5 text-left space-y-3 max-w-sm mx-auto">
          <p className="text-xs font-black text-rose-700 uppercase tracking-wider">
            {L("Namba ya Rejea", "Reference Number")}
          </p>
          <p className="text-2xl font-black text-rose-800 font-mono">{appRef}</p>
          <div className="space-y-2 pt-2 border-t border-rose-200">
            {[
              [
                L("Aina", "Type"),
                isCitizenDispute
                  ? DISPUTE_TYPES.find((d) => d.value === vals.dispute_type)?.label
                  : ISSUE_TYPES.find((i) => i.value === vals.issue_type)?.label,
              ],
              [L("Kichwa", "Title"), vals.title],
              isCitizenDispute && [
                L("Mlalamikiwa", "Respondent"),
                respondentFound
                  ? `${respondentFound.first_name} ${respondentFound.last_name}`
                  : vals.respondent_name_manual,
              ],
              [L("Haraka", "Urgency"), URGENCY_LEVELS.find((u) => u.value === vals.urgency)?.label],
              isCitizenDispute && [L("Ada", "Fee"), `TSh ${SERVICE_FEE.toLocaleString()}`],
              [L("Hali", "Status"), L("Inasubiri Ufuatiliaji", "Pending Review")],
            ]
              .filter(Boolean)
              .map((row) => {
                const [l, v] = row as string[];
                return (
                  <div key={String(l)} className="flex justify-between text-sm">
                    <span className="text-stone-500">{l}</span>
                    <span className="font-bold text-stone-800 text-right">{v}</span>
                  </div>
                );
              })}
          </div>
        </div>
        <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 text-left max-w-sm mx-auto">
          <p className="text-xs font-bold text-blue-700 mb-2">
            {L("Hatua Zinazofuata", "What Happens Next")}
          </p>
          <ul className="space-y-1.5">
            {(isCitizenDispute
              ? [
                  L(
                    "Ofisi itakagua taarifa ulizotoa",
                    "Office will review the information you provided",
                  ),
                  L(
                    "Pande zote zitaitwa kwa mapatanisho ndani ya siku 7",
                    "Both parties will be summoned for mediation within 7 days",
                  ),
                  L(
                    "Kama mapatanisho yatashindwa, suala litapelekwa mahakama ya mtaa",
                    "If mediation fails, the case will be escalated to the local tribunal",
                  ),
                  L(
                    `Lipa ada ya TSh ${SERVICE_FEE.toLocaleString()} ofisini`,
                    `Pay TSh ${SERVICE_FEE.toLocaleString()} at the office`,
                  ),
                ]
              : [
                  L(
                    "Ofisi itathibitisha tatizo na kupanga kushughulikia",
                    "Office will verify the issue and plan a response",
                  ),
                  L("Utapokea taarifa kuhusu maendeleo", "You will receive updates on progress"),
                  L(
                    "Hakuna ada kwa kuripoti matatizo ya kijamii",
                    "No fee for reporting community issues",
                  ),
                  L(
                    "Tunza namba ya rejea kwa marejeleo",
                    "Keep your reference number for follow-up",
                  ),
                ]
            ).map((item, i) => (
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

  // ─── Steps ───────────────────────────────────────────────────────────────
  const renderStep = () => {
    switch (step) {
      // ─────────── STEP 1 — MODE SELECTOR ───────────
      case "mode":
        return (
          <div className="space-y-5">
            <div className={secHdr}>
              <p className="font-bold text-rose-800 text-sm flex items-center gap-2">
                <Scale size={16} /> {L("CHAGUA AINA YA SHAURI", "CHOOSE TYPE OF CASE")}
              </p>
              <p className="text-xs text-rose-600 mt-0.5">
                {L(
                  "Ni mgogoro kati yako na raia mwingine, au tatizo la kijamii?",
                  "Is it a dispute with another citizen, or a community issue?",
                )}
              </p>
            </div>

            <div className="grid grid-cols-1 gap-3">
              <button
                type="button"
                onClick={() => {
                  set("mode", "CITIZEN_DISPUTE");
                  clrErr("mode");
                }}
                className={`p-5 rounded-2xl border-2 text-left transition-all ${
                  vals.mode === "CITIZEN_DISPUTE"
                    ? "bg-rose-50 border-rose-500"
                    : "bg-white border-stone-200 hover:border-stone-300"
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-rose-500 to-red-600 flex items-center justify-center shrink-0">
                    <Users size={24} className="text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3
                        className={`font-black ${vals.mode === "CITIZEN_DISPUTE" ? "text-rose-700" : "text-stone-800"}`}
                      >
                        {L(
                          "A. Mgogoro Kati ya Raia (Citizen-to-Citizen Dispute)",
                          "A. Citizen-to-Citizen Dispute",
                        )}
                      </h3>
                      {vals.mode === "CITIZEN_DISPUTE" && (
                        <CheckCircle size={18} className="text-rose-600" />
                      )}
                    </div>
                    <p className="text-xs text-stone-600 mt-1">
                      {L(
                        "Mgogoro wa ardhi, mauzo, ndoa, biashara, ndugu, watoto, n.k. Lazima utaje raia mwenzako.",
                        "Land, sale, marriage, business, family, children, etc. You must name the other citizen.",
                      )}
                    </p>
                    <div className="flex flex-wrap gap-1 mt-2">
                      {["Ardhi", "Mali", "Ndoa", "Biashara", "Mkopo"].map((t) => (
                        <span
                          key={t}
                          className="text-[9px] font-bold text-rose-700 bg-rose-100 px-2 py-0.5 rounded"
                        >
                          {t}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => {
                  set("mode", "COMMUNITY_ISSUE");
                  clrErr("mode");
                }}
                className={`p-5 rounded-2xl border-2 text-left transition-all ${
                  vals.mode === "COMMUNITY_ISSUE"
                    ? "bg-amber-50 border-amber-500"
                    : "bg-white border-stone-200 hover:border-stone-300"
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center shrink-0">
                    <Megaphone size={24} className="text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3
                        className={`font-black ${vals.mode === "COMMUNITY_ISSUE" ? "text-amber-700" : "text-stone-800"}`}
                      >
                        {L(
                          "B. Ripoti Tatizo la Kijamii (Community Issue Report)",
                          "B. Community Issue Report",
                        )}
                      </h3>
                      {vals.mode === "COMMUNITY_ISSUE" && (
                        <CheckCircle size={18} className="text-amber-600" />
                      )}
                    </div>
                    <p className="text-xs text-stone-600 mt-1">
                      {L(
                        "Usafi, taka, barabara, maji, umeme, hatari ya jamii. Hauhitaji kutaja raia mwingine.",
                        "Sanitation, garbage, roads, water, lights, community hazards. No respondent needed.",
                      )}
                    </p>
                    <div className="flex flex-wrap gap-1 mt-2">
                      {["Usafi", "Taka", "Barabara", "Maji", "Umeme"].map((t) => (
                        <span
                          key={t}
                          className="text-[9px] font-bold text-amber-700 bg-amber-100 px-2 py-0.5 rounded"
                        >
                          {t}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </button>
            </div>
            {err("mode") && (
              <p className="text-red-500 text-xs flex items-center gap-1">
                <AlertCircle size={11} />
                {err("mode")}
              </p>
            )}

            <div className="bg-stone-50 border border-stone-200 rounded-xl p-3 flex gap-2">
              <Info size={14} className="text-stone-500 shrink-0 mt-0.5" />
              <p className="text-xs text-stone-600">
                {L(
                  "Ada ya mapatanisho kwa migogoro ya raia ni TSh 5,000. Ripoti za matatizo ya kijamii ni bure.",
                  "Mediation fee for citizen disputes is TSh 5,000. Community issue reports are free.",
                )}
              </p>
            </div>
          </div>
        );

      // ─────────── STEP 2 — RESPONDENT (citizen dispute only) ───────────
      case "respondent":
        return (
          <div className="space-y-5">
            <div className={secHdr}>
              <p className="font-bold text-rose-800 text-sm flex items-center gap-2">
                <Search size={16} /> {L("TAFUTA MLALAMIKIWA", "IDENTIFY THE RESPONDENT")}
              </p>
              <p className="text-xs text-rose-600 mt-0.5">
                {L("Mtu ambaye una mgogoro naye", "The person you have a dispute with")}
              </p>
            </div>

            <Field name="respondent_search_type" label={L("Tafuta Kwa", "Search By")}>
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
                      set("respondent_search_type", opt.value);
                      setRespondentFound(null);
                      setRespondentError("");
                    }}
                    className={`py-2.5 rounded-xl border-2 text-xs font-bold transition-all ${
                      vals.respondent_search_type === opt.value
                        ? "bg-rose-50 border-rose-500 text-rose-700"
                        : "bg-white border-stone-200 text-stone-500 hover:border-stone-300"
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </Field>

            <Field
              name="respondent"
              label={L(
                `Namba ya ${vals.respondent_search_type}`,
                `${vals.respondent_search_type} Number`,
              )}
            >
              <div className="flex gap-2">
                <input
                  value={vals.respondent_search_term}
                  disabled={vals.respondent_known_outside_system}
                  onChange={(e) => {
                    set("respondent_search_term", e.target.value);
                    setRespondentFound(null);
                    setRespondentError("");
                    clrErr("respondent");
                  }}
                  placeholder={
                    vals.respondent_search_type === "PHONE"
                      ? "+255 7XX XXX XXX"
                      : vals.respondent_search_type === "CT_ID"
                        ? "CT2026A00001"
                        : "XXXX-XXXX-XXXX-XXXX-XXXX"
                  }
                  className={`flex-1 ${inputCls("respondent")} disabled:bg-stone-50 disabled:text-stone-400`}
                  onKeyDown={(e) =>
                    e.key === "Enter" && !vals.respondent_known_outside_system && searchRespondent()
                  }
                />
                <button
                  type="button"
                  onClick={searchRespondent}
                  disabled={respondentSearching || vals.respondent_known_outside_system}
                  className="px-4 py-3 bg-rose-600 hover:bg-rose-700 disabled:bg-stone-300 text-white rounded-xl font-bold text-sm flex items-center gap-2 transition-colors"
                >
                  {respondentSearching ? (
                    <Loader2 size={15} className="animate-spin" />
                  ) : (
                    <Search size={15} />
                  )}
                  <span className="hidden sm:inline">{L("Tafuta", "Search")}</span>
                </button>
              </div>
            </Field>

            {respondentError && !vals.respondent_known_outside_system && (
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 flex gap-2">
                <AlertCircle size={15} className="text-amber-500 shrink-0 mt-0.5" />
                <p className="text-xs text-amber-700 font-medium">{respondentError}</p>
              </div>
            )}

            {respondentFound && (
              <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-3">
                  <UserCheck size={16} className="text-emerald-600" />
                  <span className="text-xs font-bold text-emerald-700 uppercase tracking-wide">
                    {L("Mlalamikiwa Amepatikana", "Respondent Found")}
                  </span>
                  <span className="ml-auto text-[10px] font-black text-emerald-700 bg-emerald-200 px-2 py-0.5 rounded-full">
                    ✓ {L("AMETHIBITISHWA", "VERIFIED")}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    [
                      L("Jina Kamili", "Full Name"),
                      `${respondentFound.first_name} ${respondentFound.middle_name || ""} ${respondentFound.last_name}`.trim(),
                    ],
                    ["NIDA", respondentFound.nida_number || "—"],
                    [L("Simu", "Phone"), respondentFound.phone || "—"],
                    [L("Wilaya", "District"), respondentFound.district || "—"],
                    [L("Kata", "Ward"), respondentFound.ward || "—"],
                  ].map(([l, v]) => (
                    <div key={String(l)} className="bg-white rounded-lg px-3 py-2">
                      <p className="text-[9px] text-stone-400 uppercase tracking-wide">{l}</p>
                      <p className="text-xs font-bold text-stone-800 truncate">{v}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Manual fallback */}
            <div className="border-t border-stone-100 pt-4">
              <label
                className={`flex items-start gap-2 cursor-pointer p-3 rounded-xl border transition-colors ${vals.respondent_known_outside_system ? "bg-amber-50 border-amber-300" : "bg-stone-50 border-stone-200 hover:bg-amber-50/50"}`}
              >
                <input
                  type="checkbox"
                  checked={vals.respondent_known_outside_system}
                  onChange={(e) => {
                    set("respondent_known_outside_system", e.target.checked);
                    setRespondentFound(null);
                    setRespondentError("");
                  }}
                  className="w-4 h-4 mt-0.5 rounded shrink-0"
                />
                <div className="flex-1">
                  <p className="text-xs font-bold text-stone-700">
                    {L(
                      "Mlalamikiwa hayupo kwenye mfumo — Ningewainisha kwa mkono",
                      "Respondent not in system — Enter manually",
                    )}
                  </p>
                  <p className="text-xs text-stone-500 mt-0.5">
                    {L(
                      "Tumia hii kama mlalamikiwa hawajasajiliwa kwenye E-MTAA",
                      "Use this if the respondent is not registered with E-MTAA",
                    )}
                  </p>
                </div>
              </label>
            </div>

            {vals.respondent_known_outside_system && (
              <div className="space-y-3 bg-amber-50/50 p-4 rounded-xl border border-amber-200">
                <Field
                  name="respondent_name_manual"
                  label={L("Jina Kamili la Mlalamikiwa", "Respondent's Full Name")}
                  required
                >
                  <TI
                    name="respondent_name_manual"
                    value={vals.respondent_name_manual}
                    onChange={(v) => {
                      set("respondent_name_manual", v);
                      clrErr("respondent_name_manual");
                    }}
                    placeholder={L("Jina kamili", "Full name")}
                  />
                </Field>
                <Field
                  name="respondent_phone_manual"
                  label={L("Simu (Hiari kama una anwani)", "Phone (Optional if you have address)")}
                >
                  <TI
                    name="respondent_phone_manual"
                    value={vals.respondent_phone_manual}
                    onChange={(v) => {
                      set("respondent_phone_manual", v);
                      clrErr("respondent_phone_manual");
                    }}
                    placeholder="+255 7XX XXX XXX"
                  />
                </Field>
                <Field
                  name="respondent_address_manual"
                  label={L("Anwani / Mahali Anaopatikana", "Address / Where to Find Them")}
                >
                  <textarea
                    value={vals.respondent_address_manual}
                    onChange={(e) => set("respondent_address_manual", e.target.value)}
                    rows={2}
                    placeholder={L("Mtaa, kata, alama za eneo", "Street, ward, landmarks")}
                    className={`${inputCls("respondent_address_manual")} resize-none`}
                  />
                </Field>
              </div>
            )}
          </div>
        );

      // ─────────── STEP 3 — DETAILS (varies by mode) ───────────
      case "details":
        return (
          <div className="space-y-5">
            <div className={secHdr}>
              <p className="font-bold text-rose-800 text-sm flex items-center gap-2">
                {isCitizenDispute ? <Gavel size={16} /> : <Megaphone size={16} />}
                {isCitizenDispute
                  ? L("MAELEZO YA MGOGORO", "DISPUTE DETAILS")
                  : L("MAELEZO YA TATIZO", "ISSUE DETAILS")}
              </p>
            </div>

            {/* Type dropdown */}
            {isCitizenDispute ? (
              <Field name="dispute_type" label={L("Aina ya Mgogoro", "Type of Dispute")} required>
                <Sel
                  name="dispute_type"
                  value={vals.dispute_type}
                  onChange={(v) => {
                    set("dispute_type", v);
                    clrErr("dispute_type");
                  }}
                  options={DISPUTE_TYPES}
                />
              </Field>
            ) : (
              <Field name="issue_type" label={L("Aina ya Tatizo", "Type of Issue")} required>
                <Sel
                  name="issue_type"
                  value={vals.issue_type}
                  onChange={(v) => {
                    set("issue_type", v);
                    clrErr("issue_type");
                  }}
                  options={ISSUE_TYPES}
                />
              </Field>
            )}

            {/* Community: location of issue */}
            {isCommunityIssue && (
              <>
                <Field
                  name="issue_location"
                  label={L("Mahali pa Tatizo (Eneo)", "Issue Location")}
                  required
                  hint={L(
                    "Eleza wapi tatizo lipo: mtaa, namba ya nyumba, alama",
                    "Describe where the issue is: street, house no, landmarks",
                  )}
                >
                  <textarea
                    value={vals.issue_location}
                    onChange={(e) => {
                      set("issue_location", e.target.value);
                      clrErr("issue_location");
                    }}
                    rows={2}
                    placeholder={L(
                      "Mfano: Mtaa wa Uhuru, karibu na shule ya msingi Sinza",
                      "E.g. Uhuru Street, near Sinza primary school",
                    )}
                    className={`${inputCls("issue_location")} resize-none`}
                  />
                </Field>
                <AddressFields
                  lang={lang}
                  region={vals.issue_region}
                  district={vals.issue_district}
                  ward={vals.issue_ward}
                  onRegion={(v) => {
                    set("issue_region", v);
                    set("issue_district", "");
                    set("issue_ward", "");
                  }}
                  onDistrict={(v) => {
                    set("issue_district", v);
                    set("issue_ward", "");
                  }}
                  onWard={(v) => set("issue_ward", v)}
                  errors={errors}
                  clearError={clrErr}
                  fieldPrefix="issue"
                  autofillFrom={userProfile}
                  optional={true}
                />
              </>
            )}

            <Field
              name="title"
              label={L("Kichwa Kifupi", "Short Title")}
              required
              hint={L(
                "Mfano: Mgogoro wa mpaka wa shamba la Sinza B",
                "E.g. Boundary dispute over Sinza B plot",
              )}
            >
              <TI
                name="title"
                value={vals.title}
                onChange={(v) => {
                  set("title", v);
                  clrErr("title");
                }}
                placeholder={L("Kichwa cha ufupi cha shauri", "Brief case title")}
              />
            </Field>

            <Field
              name="description"
              label={L("Maelezo Kamili", "Full Description")}
              required
              hint={L(
                `${vals.description.length}/1000 herufi (angalau 30)`,
                `${vals.description.length}/1000 chars (min 30)`,
              )}
            >
              <textarea
                value={vals.description}
                onChange={(e) => {
                  set("description", e.target.value.slice(0, 1000));
                  clrErr("description");
                }}
                rows={5}
                placeholder={
                  isCitizenDispute
                    ? L(
                        "Eleza mgogoro: nini kilitokea, lini, na kwa nini unahitaji msaada wa ofisi...",
                        "Describe the dispute: what happened, when, and why you need office intervention...",
                      )
                    : L(
                        "Eleza tatizo: ni nini, lipo wapi, ni nani anaathirika...",
                        "Describe the issue: what it is, where, who is affected...",
                      )
                }
                className={`${inputCls("description")} resize-none`}
              />
            </Field>

            <div className="grid grid-cols-2 gap-3">
              <Field
                name="incident_date"
                label={L("Tarehe ya Tukio (Hiari)", "Date of Incident (Optional)")}
              >
                <TI
                  name="incident_date"
                  value={vals.incident_date}
                  type="date"
                  onChange={(v) => set("incident_date", v)}
                />
              </Field>
              <Field name="urgency" label={L("Kiwango cha Haraka", "Urgency Level")}>
                <Sel
                  name="urgency"
                  value={vals.urgency}
                  onChange={(v) => set("urgency", v)}
                  options={URGENCY_LEVELS}
                />
              </Field>
            </div>

            {/* Citizen-dispute only: resolution preference + witnesses */}
            {isCitizenDispute && (
              <>
                <Field
                  name="resolution_preference"
                  label={L("Unapendelea Suluhisho Gani?", "Preferred Resolution Method")}
                  required
                >
                  <Sel
                    name="resolution_preference"
                    value={vals.resolution_preference}
                    onChange={(v) => {
                      set("resolution_preference", v);
                      clrErr("resolution_preference");
                    }}
                    options={RESOLUTION_PREFERENCES}
                  />
                </Field>

                <div className="border border-stone-200 rounded-xl overflow-hidden">
                  <div className="bg-stone-50 px-4 py-2.5 border-b border-stone-100 flex items-center gap-2">
                    <Users size={13} className="text-stone-500" />
                    <span className="text-xs font-bold text-stone-700 uppercase tracking-wide">
                      {L("MASHAHIDI (Hiari)", "WITNESSES (Optional)")}
                    </span>
                  </div>
                  <div className="p-4 space-y-3">
                    {[
                      {
                        num: 1,
                        nameKey: "witness1_name" as const,
                        phoneKey: "witness1_phone" as const,
                      },
                      {
                        num: 2,
                        nameKey: "witness2_name" as const,
                        phoneKey: "witness2_phone" as const,
                      },
                    ].map((w) => (
                      <div key={w.num} className="space-y-2">
                        {/* Witness citizen lookup */}
                        <div className="relative">
                          <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2">
                            <Search size={13} className="text-emerald-600 shrink-0" />
                            <input
                              value={witnessSearch[("w" + w.num) as "w1" | "w2"]}
                              onChange={(e) =>
                                searchDisputeWitness(e.target.value, ("w" + w.num) as "w1" | "w2")
                              }
                              placeholder={L(
                                `Tafuta shahidi ${w.num}...`,
                                `Search witness ${w.num}...`,
                              )}
                              className="flex-1 text-xs bg-transparent outline-none placeholder-emerald-400"
                            />
                          </div>
                          {witnessResults[("w" + w.num) as "w1" | "w2"].length > 0 && (
                            <div className="absolute z-20 left-0 right-0 mt-1 bg-white border border-stone-200 rounded-lg shadow-lg max-h-32 overflow-y-auto">
                              {witnessResults[("w" + w.num) as "w1" | "w2"].map((r) => (
                                <button
                                  key={r.id}
                                  type="button"
                                  onClick={() => selectDisputeWitness(w.num as 1 | 2, r)}
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
                        <div className="grid grid-cols-2 gap-3">
                          <Field
                            name={w.nameKey}
                            label={L(`Jina la Shahidi ${w.num}`, `Witness ${w.num} Name`)}
                          >
                            <TI
                              name={w.nameKey}
                              value={vals[w.nameKey]}
                              onChange={(v) => set(w.nameKey, v)}
                              placeholder={L("Jina kamili", "Full name")}
                            />
                          </Field>
                          <Field name={w.phoneKey} label={L("Simu", "Phone")}>
                            <TI
                              name={w.phoneKey}
                              value={vals[w.phoneKey]}
                              onChange={(v) => set(w.phoneKey, v)}
                              placeholder="+255 7XX XXX XXX"
                            />
                          </Field>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>
        );

      // ─────────── STEP 4 — DOCUMENTS ───────────
      case "documents":
        return (
          <div className="space-y-5">
            <div className={secHdr}>
              <p className="font-bold text-rose-800 text-sm flex items-center gap-2">
                <FileText size={16} /> {L("NYARAKA NA USHAHIDI", "DOCUMENTS & EVIDENCE")}
              </p>
              <p className="text-xs text-rose-600 mt-0.5">
                {L(
                  "Picha au nyaraka zinazounga mkono shauri lako",
                  "Photos or documents that support your case",
                )}
              </p>
            </div>

            <div className="bg-blue-50 border border-blue-100 rounded-xl p-3">
              <p className="text-xs font-bold text-blue-700 mb-1.5">
                {isCitizenDispute
                  ? L("Nyaraka zinazopendekezwa:", "Recommended documents:")
                  : L("Picha/nyaraka zinazopendekezwa:", "Recommended photos/documents:")}
              </p>
              <ul className="space-y-1 text-xs text-blue-600">
                {(isCitizenDispute
                  ? [
                      L(
                        "Hati ya umiliki (kwa migogoro ya ardhi/mali)",
                        "Title deed (for land/property disputes)",
                      ),
                      L(
                        "Risiti za malipo, mkataba, au makubaliano",
                        "Receipts, contracts, or agreements",
                      ),
                      L("Ujumbe mfupi au email zinazohusiana", "Related text messages or emails"),
                      L("Picha za uharibifu au ushahidi", "Photos of damage or evidence"),
                    ]
                  : [
                      L(
                        "Picha ya tatizo (taka, barabara, n.k.)",
                        "Photos of the issue (waste, roads, etc.)",
                      ),
                      L("Picha za uharibifu au athari", "Photos of damage or impact"),
                      L(
                        "Nyaraka za awali kuhusu tatizo (kama zipo)",
                        "Prior documentation about the issue (if any)",
                      ),
                    ]
                ).map((item, i) => (
                  <li key={i} className="flex items-start gap-1.5">
                    <span className="text-blue-400 mt-0.5">•</span>
                    {item}
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <label className={lbl}>{L("Pakia Nyaraka", "Upload Documents")}</label>
              <div
                onClick={() => docRef.current?.click()}
                className={`border-2 border-dashed rounded-xl p-4 cursor-pointer transition-all text-center ${docs.length > 0 ? "border-rose-400 bg-rose-50" : "border-stone-300 hover:border-rose-400 hover:bg-rose-50/40"}`}
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
                          <div className="w-10 h-10 bg-rose-100 rounded-lg flex items-center justify-center shrink-0">
                            <FileText size={18} className="text-rose-600" />
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
                    <p className="text-xs text-rose-600 font-medium">
                      {L("Bonyeza kuongeza zaidi", "Click to add more")}
                    </p>
                  </div>
                ) : (
                  <div className="py-4">
                    <Upload size={24} className="mx-auto text-stone-400 mb-2" />
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

            <div className="bg-stone-50 border border-stone-100 rounded-xl p-3 flex gap-2">
              <Shield size={14} className="text-stone-400 shrink-0 mt-0.5" />
              <p className="text-xs text-stone-500">
                {L(
                  "Nyaraka zako ni za siri na zitatumika tu kushughulikia shauri lako.",
                  "Your documents are confidential and will only be used to handle your case.",
                )}
              </p>
            </div>
          </div>
        );

      // ─────────── STEP 5 — PREVIEW ───────────
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

            <PSection title={L("Mlalamikaji (Wewe)", "Complainant (You)")} stepKey="mode">
              <PRow
                label={L("Jina", "Name")}
                value={`${userProfile?.first_name || ""} ${userProfile?.last_name || ""}`.trim()}
              />
              <PRow label={L("Simu", "Phone")} value={userProfile?.phone} />
              <PRow label="NIDA" value={userProfile?.nida_number} />
              <PRow label={L("Kata", "Ward")} value={userProfile?.ward} />
            </PSection>

            <PSection title={L("Aina ya Shauri", "Case Type")} stepKey="mode">
              <PRow
                label={L("Aina", "Type")}
                value={
                  isCitizenDispute
                    ? L("Mgogoro wa Raia", "Citizen Dispute")
                    : L("Tatizo la Kijamii", "Community Issue")
                }
              />
            </PSection>

            {isCitizenDispute && (
              <PSection title={L("Mlalamikiwa", "Respondent")} stepKey="respondent">
                {respondentFound ? (
                  <>
                    <PRow
                      label={L("Jina", "Name")}
                      value={`${respondentFound.first_name} ${respondentFound.last_name}`}
                    />
                    <PRow label="NIDA" value={respondentFound.nida_number} />
                    <PRow label={L("Simu", "Phone")} value={respondentFound.phone} />
                    <PRow
                      label={L("Hali", "Status")}
                      value={L("Yupo kwenye mfumo ✓", "In system ✓")}
                    />
                  </>
                ) : (
                  <>
                    <PRow label={L("Jina", "Name")} value={vals.respondent_name_manual} />
                    {vals.respondent_phone_manual && (
                      <PRow label={L("Simu", "Phone")} value={vals.respondent_phone_manual} />
                    )}
                    {vals.respondent_address_manual && (
                      <>
                        <p className="col-span-2 text-xs text-stone-500">
                          {L("Anwani", "Address")}
                        </p>
                        <p className="col-span-2 text-xs font-bold text-stone-800">
                          {vals.respondent_address_manual}
                        </p>
                      </>
                    )}
                    <PRow
                      label={L("Hali", "Status")}
                      value={L("Hayupo kwenye mfumo", "Not in system")}
                    />
                  </>
                )}
              </PSection>
            )}

            <PSection title={L("Maelezo", "Details")} stepKey="details">
              {isCitizenDispute && (
                <PRow
                  label={L("Aina ya Mgogoro", "Dispute Type")}
                  value={DISPUTE_TYPES.find((d) => d.value === vals.dispute_type)?.label}
                />
              )}
              {isCommunityIssue && (
                <>
                  <PRow
                    label={L("Aina", "Type")}
                    value={ISSUE_TYPES.find((i) => i.value === vals.issue_type)?.label}
                  />
                  <PRow label={L("Eneo", "Location")} value={vals.issue_location} />
                </>
              )}
              <PRow label={L("Kichwa", "Title")} value={vals.title} />
              {vals.incident_date && (
                <PRow label={L("Tarehe", "Date")} value={vals.incident_date} />
              )}
              <PRow
                label={L("Haraka", "Urgency")}
                value={URGENCY_LEVELS.find((u) => u.value === vals.urgency)?.label}
              />
              {isCitizenDispute && (
                <PRow
                  label={L("Suluhisho Linalopendekezwa", "Preferred Resolution")}
                  value={
                    RESOLUTION_PREFERENCES.find((r) => r.value === vals.resolution_preference)
                      ?.label
                  }
                />
              )}
              <p className="col-span-2 text-xs text-stone-500 mt-1">
                {L("Maelezo", "Description")}
              </p>
              <p className="col-span-2 text-xs font-bold text-stone-800">{vals.description}</p>
            </PSection>

            {isCitizenDispute && (vals.witness1_name || vals.witness2_name) && (
              <PSection title={L("Mashahidi", "Witnesses")} stepKey="details">
                {vals.witness1_name && (
                  <PRow
                    label="Shahidi 1"
                    value={`${vals.witness1_name} · ${vals.witness1_phone}`}
                  />
                )}
                {vals.witness2_name && (
                  <PRow
                    label="Shahidi 2"
                    value={`${vals.witness2_name} · ${vals.witness2_phone}`}
                  />
                )}
              </PSection>
            )}

            {docs.length > 0 && (
              <PSection title={L("Nyaraka", "Documents")} stepKey="documents">
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
                      <div className="w-8 h-8 bg-rose-100 rounded-lg flex items-center justify-center shrink-0">
                        <FileText size={14} className="text-rose-600" />
                      </div>
                    )}
                    <p className="text-xs font-bold text-stone-700 flex-1 truncate">
                      {d.file.name}
                    </p>
                    <CheckCircle size={13} className="text-rose-500 shrink-0" />
                  </div>
                ))}
              </PSection>
            )}

            <div
              className={`${isCitizenDispute ? "bg-rose-50 border-rose-200" : "bg-emerald-50 border-emerald-200"} border rounded-xl p-4 flex justify-between items-center`}
            >
              <span
                className={`font-bold text-sm ${isCitizenDispute ? "text-rose-800" : "text-emerald-800"}`}
              >
                {isCitizenDispute ? L("Ada ya Mapatanisho:", "Mediation Fee:") : L("Ada:", "Fee:")}
              </span>
              <span
                className={`text-xl font-black ${isCitizenDispute ? "text-rose-700" : "text-emerald-700"}`}
              >
                {isCitizenDispute ? `TSh ${SERVICE_FEE.toLocaleString()}` : L("BURE", "FREE")}
              </span>
            </div>

            <div className="space-y-3">
              <p className="text-xs font-black text-stone-600 uppercase tracking-wider">
                {L("IDHINI", "CONSENT")}
              </p>
              {[
                {
                  key: "terms_accepted" as const,
                  sw: "Nathibitisha kwamba taarifa zote nilizotoa ni za kweli na sahihi.",
                  en: "I confirm all information I have provided is true and accurate.",
                },
                {
                  key: "data_confirmed" as const,
                  sw: isCitizenDispute
                    ? "Ninakubali Ofisi iitishe pande zote mbili kwa mapatanisho, na nitoe ushirikiano wakati wa ukaguzi."
                    : "Ninakubali Ofisi ishughulikie tatizo hili, na nitoe ushirikiano kama unahitajika.",
                  en: isCitizenDispute
                    ? "I consent to the Office summoning both parties for mediation and will cooperate during the process."
                    : "I consent to the Office addressing this issue and will cooperate as needed.",
                },
              ].map((item) => (
                <label
                  key={item.key}
                  className={`flex items-start gap-3 cursor-pointer rounded-xl p-3 border transition-colors ${vals[item.key] ? "bg-rose-50 border-rose-300" : "bg-stone-50 border-stone-200 hover:bg-rose-50/50"}`}
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
                  <AlertCircle size={11} />
                  {errors.terms_accepted || errors.data_confirmed}
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
              className="flex-1 py-3.5 bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-700 hover:to-red-700 text-white rounded-xl font-bold shadow-lg transition-all flex items-center justify-center gap-2 text-sm"
            >
              {step === "documents" ? (
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
              className="flex-1 py-3.5 bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-700 hover:to-red-700 text-white rounded-xl font-bold shadow-lg transition-all flex items-center justify-center gap-2 text-sm disabled:opacity-60"
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

export default MgogoroMashauriForm;
