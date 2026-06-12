/**
 * Kibari cha Sherehe — Celebration / Event Permit Form
 * Full rebuild: 5 steps, neighbor notification, noise/music,
 * security, alcohol flag, document upload, edit-in-preview,
 * consent, success screen
 *
 * Fee: TSh 10,000
 * Color theme: Pink/rose (festive)
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
  Calendar,
  MapPin,
  Users,
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
  Music,
  Utensils,
  Volume2,
  Star,
} from "lucide-react";
import { SignaturePad } from "@/components/ui/SignaturePad";
import { FormProps, labels } from "./types";
import { ProgressFill } from "../ui/ProgressFill";

// ─── Constants ───────────────────────────────────────────────────────────────

const SERVICE_FEE = 10000;

const EVENT_TYPES = [
  { label: "Harusi (Wedding)", value: "HARUSI" },
  { label: "Kuzaliwa / Siku ya Kuzaliwa (Birthday)", value: "BIRTHDAY" },
  { label: "Hitimu / Graduation (Graduation)", value: "HITIMU" },
  { label: "Sherehe ya Dini (Religious Celebration)", value: "DINI" },
  { label: "Eid / Idd", value: "EID" },
  { label: "Krismasi (Christmas)", value: "KRISMASI" },
  { label: "Mwaka Mpya (New Year)", value: "MWAKA_MPYA" },
  { label: "Tamasha la Muziki (Music Festival)", value: "TAMASHA" },
  { label: "Mkutano wa Biashara (Business Meeting/Launch)", value: "BIASHARA" },
  { label: "Sherehe ya Shule (School Event)", value: "SHULE" },
  { label: "Sherehe ya Mtaa (Community Event)", value: "MTAA" },
  { label: "Nyingine (Other)", value: "NYINGINE" },
];

const EVENT_SCALE = [
  { label: "Binafsi / Familia (Private — Family & Friends)", value: "PRIVATE" },
  { label: "Jamii (Community — Open to neighbourhood)", value: "COMMUNITY" },
  { label: "Hadharani (Public — Open to general public)", value: "PUBLIC" },
];

const GUEST_RANGES = [
  { label: "Chini ya 50", value: "BELOW_50" },
  { label: "50 – 100", value: "50_100" },
  { label: "100 – 200", value: "100_200" },
  { label: "200 – 500", value: "200_500" },
  { label: "500 – 1,000", value: "500_1000" },
  { label: "Zaidi ya 1,000", value: "ABOVE_1000" },
];

const NOISE_LEVELS = [
  { label: "Chini — Mazungumzo tu (Low — Conversation only)", value: "LOW" },
  { label: "Wastani — Muziki wa chini (Moderate — Soft music)", value: "MODERATE" },
  { label: "Juu — Muziki wa sauti (High — Loud music/DJ)", value: "HIGH" },
  { label: "Sauti Kubwa Sana — Matamasha (Very High — Concert/Festival)", value: "VERY_HIGH" },
];

const YES_NO = [
  { label: "Ndiyo (Yes)", value: "YES" },
  { label: "Hapana (No)", value: "NO" },
];

const ALLOWED_DOCS = ["image/jpeg", "image/png", "image/webp", "application/pdf"];
const MAX_DOC_SIZE = 10 * 1024 * 1024;

// ─── Types ────────────────────────────────────────────────────────────────────

type Step = "event" | "venue" | "arrangements" | "organizer" | "preview";

interface UploadedDoc {
  file: File;
  preview: string;
  label: string;
}

interface FormValues {
  // Step 1 — Event
  event_type: string;
  event_name: string;
  event_description: string;
  event_scale: string;
  // Step 2 — Venue & Date
  start_date: string;
  start_time: string;
  end_date: string;
  end_time: string;
  venue_name: string;
  venue_address: string;
  venue_ward: string;
  venue_district: string;
  expected_guests: string;
  // Step 3 — Arrangements
  has_music: string;
  music_details: string;
  noise_level: string;
  has_food_vendors: string;
  has_alcohol: string;
  has_security: string;
  security_details: string;
  neighbors_notified: string;
  neighbors_note: string;
  // Step 4 — Organizer
  organizer_name: string;
  organizer_phone: string;
  organizer_nida: string;
  second_contact_name: string;
  second_contact_phone: string;
  special_requests: string;
  // Preview — Consent
  terms_accepted: boolean;
  data_confirmed: boolean;
}

// ─── Component ───────────────────────────────────────────────────────────────

export const KibariShereheForm: React.FC<FormProps> = ({
  onSubmit,
  isLoading,
  lang = "sw",
  userProfile,
}) => {
  const t = labels[lang];
  const L = useCallback((sw: string, en: string) => (lang === "sw" ? sw : en), [lang]);

  const [step, setStep] = useState<Step>("event");
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

  const today = new Date().toISOString().split("T")[0];

  const [vals, setVals] = useState<FormValues>({
    event_type: "",
    event_name: "",
    event_description: "",
    event_scale: "",
    start_date: "",
    start_time: "",
    end_date: "",
    end_time: "",
    venue_name: "",
    venue_address: "",
    venue_ward: "",
    venue_district: "",
    expected_guests: "",
    has_music: "",
    music_details: "",
    noise_level: "",
    has_food_vendors: "",
    has_alcohol: "",
    has_security: "",
    security_details: "",
    neighbors_notified: "",
    neighbors_note: "",
    organizer_name: `${userProfile?.first_name || ""} ${userProfile?.last_name || ""}`.trim(),
    organizer_phone: userProfile?.phone || "",
    organizer_nida: userProfile?.nida_number || "",
    second_contact_name: "",
    second_contact_phone: "",
    special_requests: "",
    terms_accepted: false,
    data_confirmed: false,
  });

  // ─── Steps ───────────────────────────────────────────────────────────────
  const STEPS: { key: Step; label: string; sw: string }[] = [
    { key: "event", label: "Event", sw: "Tukio" },
    { key: "venue", label: "Venue", sw: "Mahali" },
    { key: "arrangements", label: "Arrangements", sw: "Mpangilio" },
    { key: "organizer", label: "Organizer", sw: "Msimamizi" },
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

    if (step === "event") {
      if (!vals.event_type) e.event_type = L("Chagua aina ya tukio", "Select event type");
      if (!vals.event_name.trim())
        e.event_name = L("Jina la tukio linahitajika", "Event name required");
      if (!vals.event_scale) e.event_scale = L("Chagua kiwango cha tukio", "Select event scale");
    }

    if (step === "venue") {
      if (!vals.start_date) e.start_date = L("Tarehe ya kuanza inahitajika", "Start date required");
      if (!vals.start_time) e.start_time = L("Muda wa kuanza unahitajika", "Start time required");
      if (!vals.venue_name.trim())
        e.venue_name = L("Jina la ukumbi linahitajika", "Venue name required");
      if (!vals.venue_ward.trim())
        e.venue_ward = L("Kata/Mtaa panahitajika", "Ward/Street required");
      if (!vals.expected_guests)
        e.expected_guests = L("Idadi ya wageni inahitajika", "Expected guests required");
    }

    if (step === "arrangements") {
      if (!vals.has_music) e.has_music = L("Jibu inahitajika", "Answer required");
      if (!vals.noise_level) e.noise_level = L("Chagua kiwango cha kelele", "Select noise level");
      if (!vals.neighbors_notified) e.neighbors_notified = L("Jibu inahitajika", "Answer required");
      if (!vals.has_security) e.has_security = L("Jibu inahitajika", "Answer required");
      // Security required for large events
      const largeEvent = ["200_500", "500_1000", "ABOVE_1000"].includes(vals.expected_guests);
      if (largeEvent && vals.has_security === "NO")
        e.has_security = L(
          "Usalama unahitajika kwa matukio ya wageni 200+",
          "Security required for events with 200+ guests",
        );
    }

    if (step === "organizer") {
      if (!vals.organizer_name.trim())
        e.organizer_name = L("Jina la msimamizi linahitajika", "Organizer name required");
      if (!vals.organizer_phone.trim())
        e.organizer_phone = L("Simu ya msimamizi inahitajika", "Organizer phone required");
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
      const ref = `EP-${new Date().getFullYear()}-${Math.floor(Math.random() * 900000 + 100000)}`;
      const files = docs.map((d) => d.file);
      await onSubmit(
        {
          ...vals,
          total_fee: SERVICE_FEE,
          service_name: "Kibari cha Sherehe",
          application_reference: ref,
          applicant_signature: signature,
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
      `w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-pink-500 focus:border-pink-500 outline-none transition-all bg-white text-sm ${
        err(name) ? "border-red-400 bg-red-50" : "border-stone-200"
      }`,
    [err],
  );
  const lbl = "block text-xs font-bold text-stone-600 uppercase tracking-wider mb-1.5";
  const secHdr =
    "bg-gradient-to-r from-pink-50 to-rose-50 px-4 py-3 rounded-xl border-l-4 border-pink-500 mb-4";

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

  // Yes/No toggle button pair
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
                ? "bg-pink-50 border-pink-500 text-pink-700"
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
            className={`flex flex-col items-center ${i <= stepIdx ? "text-pink-600" : "text-stone-300"}`}
          >
            <div
              className={`w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center font-bold text-[10px] sm:text-xs border-2 transition-all
              ${
                i < stepIdx
                  ? "bg-pink-600 border-pink-600 text-white"
                  : i === stepIdx
                    ? "bg-pink-50 border-pink-600 text-pink-700"
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
          className="bg-gradient-to-r from-pink-500 to-rose-500 h-2 rounded-full transition-all duration-500"
        />
      </div>
      <div className="flex justify-between mt-1.5">
        <span className="text-xs text-stone-500 font-medium">
          {L(
            `Hatua ${stepIdx + 1} kati ya ${STEPS.length}`,
            `Step ${stepIdx + 1} of ${STEPS.length}`,
          )}
        </span>
        <span className="text-xs font-bold text-pink-600">{Math.round(progress)}%</span>
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
      <div className="bg-pink-50 px-4 py-2.5 border-b border-pink-100 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-pink-600">{icon}</span>
          <h4 className="font-bold text-pink-900 text-sm">{title}</h4>
        </div>
        <button
          type="button"
          onClick={() => setStep(stepKey)}
          className="flex items-center gap-1 text-xs text-pink-600 hover:text-pink-800 font-bold hover:bg-pink-100 px-2 py-1 rounded-lg transition-colors"
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
        <div className="w-20 h-20 bg-pink-100 rounded-full flex items-center justify-center mx-auto">
          <CheckCircle2 size={40} className="text-pink-600" />
        </div>
        <div className="space-y-2">
          <h3 className="text-xl font-black text-stone-900">
            {L("Kibari Kimewasilishwa!", "Permit Submitted!")}
          </h3>
          <p className="text-stone-500 text-sm">
            {L(
              "Kibari cha Sherehe kimewasilishwa kwa Ofisi ya Serikali ya Mtaa.",
              "The Celebration Permit has been submitted to the Local Government Office.",
            )}
          </p>
        </div>
        <div className="bg-pink-50 border border-pink-200 rounded-2xl p-5 text-left space-y-3 max-w-sm mx-auto">
          <p className="text-xs font-black text-pink-700 uppercase tracking-wider">
            {L("Namba ya Maombi", "Application Reference")}
          </p>
          <p className="text-2xl font-black text-pink-800 font-mono">{appRef}</p>
          <div className="space-y-2 pt-2 border-t border-pink-200">
            {[
              [L("Tukio", "Event"), vals.event_name],
              [L("Tarehe", "Date"), vals.start_date],
              [L("Ukumbi", "Venue"), vals.venue_name],
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
                "Utapigiwa simu ndani ya siku 1–5 za kazi",
                "You will be called within 1–5 working days",
              ),
              L(
                `Lipa ada ya TSh ${SERVICE_FEE.toLocaleString()} unapokuja kuchukua kibari`,
                `Pay TSh ${SERVICE_FEE.toLocaleString()} when collecting the permit`,
              ),
              L(
                "Kibari lazima kiwepo tukioni siku yote",
                "The permit must be present at the event throughout",
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
      // STEP 1 — TUKIO (Event Details)
      // ══════════════════════════════════════════════════════════════════════
      case "event":
        return (
          <div className="space-y-5">
            <div className={secHdr}>
              <p className="font-bold text-pink-800 text-sm flex items-center gap-2">
                <Star size={16} /> {L("MAELEZO YA TUKIO", "EVENT DETAILS")}
              </p>
              <p className="text-xs text-pink-600 mt-0.5">
                {L("Taarifa za msingi za sherehe yako", "Basic information about your celebration")}
              </p>
            </div>

            <Field name="event_type" label={L("Aina ya Tukio", "Type of Event")} required>
              <Sel
                name="event_type"
                value={vals.event_type}
                onChange={(v) => {
                  set("event_type", v);
                  clrErr("event_type");
                }}
                options={EVENT_TYPES}
                placeholder={L("Chagua aina ya tukio", "Select event type")}
              />
            </Field>

            <Field
              name="event_name"
              label={L("Jina la Tukio", "Event Name")}
              required
              hint={L(
                "Mfano: Harusi ya John na Mary, Sherehe ya Siku ya Kuzaliwa ya Ali",
                "E.g. John & Mary's Wedding, Ali's Birthday Party",
              )}
            >
              <TI
                name="event_name"
                value={vals.event_name}
                onChange={(v) => {
                  set("event_name", v);
                  clrErr("event_name");
                }}
                placeholder={L("Jina la tukio lako", "Your event name")}
              />
            </Field>

            <Field name="event_scale" label={L("Kiwango cha Tukio", "Event Scale")} required>
              <Sel
                name="event_scale"
                value={vals.event_scale}
                onChange={(v) => {
                  set("event_scale", v);
                  clrErr("event_scale");
                }}
                options={EVENT_SCALE}
              />
            </Field>

            <Field
              name="event_description"
              label={L("Maelezo Mafupi (Hiari)", "Brief Description (Optional)")}
              hint={L("Eleza zaidi kuhusu tukio lako", "Describe your event in more detail")}
            >
              <textarea
                value={vals.event_description}
                onChange={(e) => set("event_description", e.target.value)}
                rows={3}
                placeholder={L(
                  "Maelezo ya ziada kuhusu sherehe yako...",
                  "Additional details about your celebration...",
                )}
                className={`${inputCls("event_description")} resize-none`}
              />
            </Field>
          </div>
        );

      // ══════════════════════════════════════════════════════════════════════
      // STEP 2 — MAHALI NA MUDA (Venue & Date)
      // ══════════════════════════════════════════════════════════════════════
      case "venue":
        return (
          <div className="space-y-5">
            <div className={secHdr}>
              <p className="font-bold text-pink-800 text-sm flex items-center gap-2">
                <Calendar size={16} /> {L("MAHALI NA MUDA WA TUKIO", "VENUE & DATE")}
              </p>
            </div>

            {/* Dates & Times */}
            <div className="grid grid-cols-2 gap-3">
              <Field name="start_date" label={L("Tarehe ya Kuanza", "Start Date")} required>
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
              <Field name="start_time" label={L("Muda wa Kuanza", "Start Time")} required>
                <TI
                  name="start_time"
                  value={vals.start_time}
                  type="time"
                  onChange={(v) => {
                    set("start_time", v);
                    clrErr("start_time");
                  }}
                />
              </Field>
              <Field name="end_date" label={L("Tarehe ya Mwisho (Hiari)", "End Date (Optional)")}>
                <TI
                  name="end_date"
                  value={vals.end_date}
                  type="date"
                  onChange={(v) => set("end_date", v)}
                />
              </Field>
              <Field name="end_time" label={L("Muda wa Mwisho (Hiari)", "End Time (Optional)")}>
                <TI
                  name="end_time"
                  value={vals.end_time}
                  type="time"
                  onChange={(v) => set("end_time", v)}
                />
              </Field>
            </div>

            {/* Venue */}
            <Field
              name="venue_name"
              label={L("Jina la Ukumbi / Eneo", "Venue Name")}
              required
              hint={L(
                "Mfano: Diamond Jubilee Hall, AICC, Nyumbani kwetu",
                "E.g. Diamond Jubilee Hall, AICC, Our Home",
              )}
            >
              <TI
                name="venue_name"
                value={vals.venue_name}
                onChange={(v) => {
                  set("venue_name", v);
                  clrErr("venue_name");
                }}
                placeholder={L(
                  "Jina la ukumbi au eneo la tukio",
                  "Name of venue or event location",
                )}
              />
            </Field>

            <div className="grid grid-cols-2 gap-3">
              <Field
                name="venue_ward"
                label={L("Kata / Mtaa", "Ward / Street")}
                required
                hint={L("Kata au mtaa wa ukumbi", "Ward or street of venue")}
              >
                <TI
                  name="venue_ward"
                  value={vals.venue_ward}
                  onChange={(v) => {
                    set("venue_ward", v);
                    clrErr("venue_ward");
                  }}
                  placeholder={L("Mfano: Kariakoo, Kinondoni", "E.g. Kariakoo, Kinondoni")}
                />
              </Field>
              <Field name="venue_district" label={L("Wilaya (Hiari)", "District (Optional)")}>
                <TI
                  name="venue_district"
                  value={vals.venue_district}
                  onChange={(v) => set("venue_district", v)}
                  placeholder={L("Mfano: Ilala, Ubungo", "E.g. Ilala, Ubungo")}
                />
              </Field>
            </div>

            <Field
              name="venue_address"
              label={L(
                "Anwani / Maelezo ya Eneo (Hiari)",
                "Full Address / Location Description (Optional)",
              )}
              hint={L("Alama za eneo, njia ya kufika, n.k.", "Landmarks, directions, etc.")}
            >
              <textarea
                value={vals.venue_address}
                onChange={(e) => set("venue_address", e.target.value)}
                rows={2}
                placeholder={L(
                  "Maelezo ya kina ya mahali pa tukio",
                  "Detailed description of event location",
                )}
                className={`${inputCls("venue_address")} resize-none`}
              />
            </Field>

            <Field
              name="expected_guests"
              label={L("Idadi ya Wageni Wanaotarajiwa", "Expected Number of Guests")}
              required
            >
              <Sel
                name="expected_guests"
                value={vals.expected_guests}
                onChange={(v) => {
                  set("expected_guests", v);
                  clrErr("expected_guests");
                }}
                options={GUEST_RANGES}
              />
            </Field>

            <div className="bg-amber-50 border border-amber-100 rounded-xl p-3 flex gap-2">
              <Info size={14} className="text-amber-500 shrink-0 mt-0.5" />
              <p className="text-xs text-amber-700">
                {L(
                  "Matukio ya wageni zaidi ya 200 yanahitaji mpangilio wa usalama. Ukumbi wa umma unaweza kuhitaji vibali zaidi.",
                  "Events with 200+ guests require security arrangements. Public venues may require additional permits.",
                )}
              </p>
            </div>
          </div>
        );

      // ══════════════════════════════════════════════════════════════════════
      // STEP 3 — MPANGILIO (Event Arrangements)
      // ══════════════════════════════════════════════════════════════════════
      case "arrangements":
        return (
          <div className="space-y-5">
            <div className={secHdr}>
              <p className="font-bold text-pink-800 text-sm flex items-center gap-2">
                <Music size={16} /> {L("MPANGILIO WA TUKIO", "EVENT ARRANGEMENTS")}
              </p>
              <p className="text-xs text-pink-600 mt-0.5">
                {L(
                  "Maelezo ya vifaa, huduma, na usalama",
                  "Details on equipment, services and safety",
                )}
              </p>
            </div>

            {/* Music */}
            <Field
              name="has_music"
              label={L("Je, kutakuwa na muziki au DJ?", "Will there be music or a DJ?")}
              required
            >
              <YesNo
                name="has_music"
                value={vals.has_music}
                onChange={(v) => {
                  set("has_music", v);
                  clrErr("has_music");
                }}
              />
            </Field>

            {vals.has_music === "YES" && (
              <Field
                name="music_details"
                label={L("Maelezo ya Muziki", "Music Details")}
                hint={L(
                  "Mfano: DJ, Orchestra, Band ya Taarab, n.k.",
                  "E.g. DJ, Orchestra, Taarab Band, etc.",
                )}
              >
                <TI
                  name="music_details"
                  value={vals.music_details}
                  onChange={(v) => set("music_details", v)}
                  placeholder={L("Aina ya muziki / mwimbaji", "Type of music / performer")}
                />
              </Field>
            )}

            <Field
              name="noise_level"
              label={L("Kiwango cha Kelele Kinachotarajiwa", "Expected Noise Level")}
              required
            >
              <Sel
                name="noise_level"
                value={vals.noise_level}
                onChange={(v) => {
                  set("noise_level", v);
                  clrErr("noise_level");
                }}
                options={NOISE_LEVELS}
              />
            </Field>

            {/* Food vendors */}
            <Field
              name="has_food_vendors"
              label={L(
                "Je, kutakuwa na wauzaji wa chakula au vinywaji?",
                "Will there be food or drink vendors?",
              )}
              required
            >
              <YesNo
                name="has_food_vendors"
                value={vals.has_food_vendors}
                onChange={(v) => {
                  set("has_food_vendors", v);
                  clrErr("has_food_vendors");
                }}
              />
            </Field>

            {/* Alcohol */}
            <Field
              name="has_alcohol"
              label={L("Je, kutakuwa na uuzaji wa pombe?", "Will alcohol be served or sold?")}
              required
            >
              <YesNo
                name="has_alcohol"
                value={vals.has_alcohol}
                onChange={(v) => {
                  set("has_alcohol", v);
                  clrErr("has_alcohol");
                }}
              />
            </Field>

            {vals.has_alcohol === "YES" && (
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 flex gap-2">
                <AlertCircle size={14} className="text-amber-500 shrink-0 mt-0.5" />
                <p className="text-xs text-amber-700">
                  {L(
                    "Uuzaji wa pombe unaweza kuhitaji leseni tofauti ya TRA / Halmashauri. Ofisi itakuarifu.",
                    "Serving alcohol may require a separate TRA / Council liquor licence. The office will inform you.",
                  )}
                </p>
              </div>
            )}

            {/* Security */}
            <Field
              name="has_security"
              label={L(
                "Je, kutakuwa na mpangilio wa usalama?",
                "Will there be security arrangements?",
              )}
              required
              hint={
                ["200_500", "500_1000", "ABOVE_1000"].includes(vals.expected_guests)
                  ? L(
                      "⚠ Inahitajika kwa tukio lako (wageni 200+)",
                      "⚠ Required for your event (200+ guests)",
                    )
                  : L("Inapendekezwa kwa matukio yote", "Recommended for all events")
              }
            >
              <YesNo
                name="has_security"
                value={vals.has_security}
                onChange={(v) => {
                  set("has_security", v);
                  clrErr("has_security");
                }}
              />
            </Field>

            {vals.has_security === "YES" && (
              <Field
                name="security_details"
                label={L("Maelezo ya Usalama", "Security Details")}
                hint={L(
                  "Mfano: Askari 2, Kampuni ya XYZ Security",
                  "E.g. 2 guards, XYZ Security Company",
                )}
              >
                <TI
                  name="security_details"
                  value={vals.security_details}
                  onChange={(v) => set("security_details", v)}
                  placeholder={L(
                    "Idadi ya askari au kampuni ya usalama",
                    "Number of guards or security company",
                  )}
                />
              </Field>
            )}

            {/* Neighbor notification */}
            <Field
              name="neighbors_notified"
              label={L(
                "Je, majirani wamearifiwa kuhusu tukio hili?",
                "Have neighbours been notified about this event?",
              )}
              required
              hint={L(
                "Inahitajika kisheria kwa matukio yenye kelele",
                "Legally required for noisy events",
              )}
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
              <Field name="neighbors_note" label={L("Maelezo (Hiari)", "Details (Optional)")}>
                <TI
                  name="neighbors_note"
                  value={vals.neighbors_note}
                  onChange={(v) => set("neighbors_note", v)}
                  placeholder={L(
                    "Mfano: Waliarifu kwa mdomo, waraka ulipigwa chini ya milango",
                    "E.g. Informed verbally, notice left at doors",
                  )}
                />
              </Field>
            )}

            {vals.neighbors_notified === "NO" && (
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 flex gap-2">
                <AlertCircle size={14} className="text-amber-500 shrink-0 mt-0.5" />
                <p className="text-xs text-amber-700">
                  {L(
                    "Inashauriwa kuarifu majirani kabla ya tukio. Ofisi inaweza kukuomba ufanye hivyo.",
                    "It is strongly advised to notify neighbours before the event. The office may require you to do so.",
                  )}
                </p>
              </div>
            )}
          </div>
        );

      // ══════════════════════════════════════════════════════════════════════
      // STEP 4 — MSIMAMIZI (Organizer)
      // ══════════════════════════════════════════════════════════════════════
      case "organizer":
        return (
          <div className="space-y-5">
            <div className={secHdr}>
              <p className="font-bold text-pink-800 text-sm flex items-center gap-2">
                <User size={16} /> {L("MSIMAMIZI WA TUKIO", "EVENT ORGANIZER")}
              </p>
            </div>

            {/* Profile card */}
            {userProfile && (
              <div className="bg-pink-50 border border-pink-100 rounded-xl p-3 flex items-center gap-3">
                <CheckCircle size={15} className="text-pink-600 shrink-0" />
                <p className="text-xs text-pink-700">
                  {L(
                    "Taarifa zako zimejazwa kiotomatiki. Unaweza kubadilisha kama msimamizi ni mtu mwingine.",
                    "Your details have been pre-filled. Change them if the organizer is someone else.",
                  )}
                </p>
              </div>
            )}

            <div className="border border-pink-200 rounded-xl overflow-hidden">
              <div className="bg-pink-50 px-4 py-2.5 border-b border-pink-100">
                <p className="text-xs font-bold text-pink-700 uppercase tracking-wide">
                  {L("MSIMAMIZI MKUU", "PRIMARY ORGANIZER")}
                </p>
              </div>
              <div className="p-4 space-y-4">
                <Field
                  name="organizer_name"
                  label={L("Jina Kamili la Msimamizi", "Organizer Full Name")}
                  required
                >
                  <TI
                    name="organizer_name"
                    value={vals.organizer_name}
                    onChange={(v) => {
                      set("organizer_name", v);
                      clrErr("organizer_name");
                    }}
                    placeholder={L("Jina kamili", "Full name")}
                  />
                </Field>
                <div className="grid grid-cols-2 gap-3">
                  <Field
                    name="organizer_phone"
                    label={L("Simu ya Msimamizi", "Phone Number")}
                    required
                  >
                    <TI
                      name="organizer_phone"
                      value={vals.organizer_phone}
                      onChange={(v) => {
                        set("organizer_phone", v);
                        clrErr("organizer_phone");
                      }}
                      placeholder="+255 7XX XXX XXX"
                    />
                  </Field>
                  <Field name="organizer_nida" label={L("NIDA (Hiari)", "NIDA (Optional)")}>
                    <TI
                      name="organizer_nida"
                      value={vals.organizer_nida}
                      onChange={(v) => set("organizer_nida", v)}
                      placeholder={L("Kama inajulikana", "If available")}
                    />
                  </Field>
                </div>
              </div>
            </div>

            {/* Second contact */}
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

            {/* Supporting documents */}
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
                    "Mfano: Barua ya idhini ya ukumbi, cheti cha leseni ya muziki, barua ya taarifa kwa majirani.",
                    "E.g. Venue approval letter, music licence, neighbour notification letter.",
                  )}
                </p>
                <div
                  onClick={() => docRef.current?.click()}
                  className={`border-2 border-dashed rounded-xl p-4 cursor-pointer transition-all text-center
                  ${docs.length > 0 ? "border-pink-400 bg-pink-50" : "border-stone-300 hover:border-pink-400 hover:bg-pink-50/40"}`}
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
                            <div className="w-9 h-9 bg-pink-100 rounded-lg flex items-center justify-center shrink-0">
                              <FileText size={16} className="text-pink-600" />
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
                      <p className="text-xs text-pink-600 font-medium">
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

            <Field
              name="special_requests"
              label={L(
                "Maombi Maalum / Maelezo ya Ziada (Hiari)",
                "Special Requests / Additional Notes (Optional)",
              )}
            >
              <textarea
                value={vals.special_requests}
                onChange={(e) => set("special_requests", e.target.value)}
                rows={3}
                placeholder={L(
                  "Maelezo yoyote ya ziada kuhusu tukio lako...",
                  "Any additional information about your event...",
                )}
                className={`${inputCls("special_requests")} resize-none`}
              />
            </Field>
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
              title={L("Mwaombaji", "Applicant")}
              stepKey="organizer"
            >
              <PRow
                label={L("Jina", "Name")}
                value={`${userProfile?.first_name || ""} ${userProfile?.last_name || ""}`.trim()}
              />
              <PRow label={L("Simu", "Phone")} value={userProfile?.phone} />
            </PSection>

            {/* Event */}
            <PSection icon={<Star size={14} />} title={L("Tukio", "Event")} stepKey="event">
              <PRow
                label={L("Aina", "Type")}
                value={EVENT_TYPES.find((e) => e.value === vals.event_type)?.label}
              />
              <PRow label={L("Jina", "Name")} value={vals.event_name} />
              <PRow
                label={L("Kiwango", "Scale")}
                value={EVENT_SCALE.find((s) => s.value === vals.event_scale)?.label}
              />
              {vals.event_description && (
                <PRow label={L("Maelezo", "Description")} value={vals.event_description} />
              )}
            </PSection>

            {/* Venue */}
            <PSection
              icon={<MapPin size={14} />}
              title={L("Mahali na Muda", "Venue & Date")}
              stepKey="venue"
            >
              <PRow
                label={L("Tarehe ya Kuanza", "Start Date")}
                value={`${vals.start_date} ${vals.start_time}`}
              />
              {vals.end_date && (
                <PRow
                  label={L("Tarehe ya Mwisho", "End Date")}
                  value={`${vals.end_date} ${vals.end_time}`}
                />
              )}
              <PRow label={L("Ukumbi", "Venue")} value={vals.venue_name} />
              <PRow
                label={L("Kata / Mtaa", "Ward")}
                value={`${vals.venue_ward}${vals.venue_district ? " · " + vals.venue_district : ""}`}
              />
              {vals.venue_address && (
                <PRow label={L("Anwani", "Address")} value={vals.venue_address} />
              )}
              <PRow
                label={L("Wageni", "Guests")}
                value={GUEST_RANGES.find((g) => g.value === vals.expected_guests)?.label}
              />
            </PSection>

            {/* Arrangements */}
            <PSection
              icon={<Music size={14} />}
              title={L("Mpangilio", "Arrangements")}
              stepKey="arrangements"
            >
              <PRow
                label={L("Muziki / DJ", "Music / DJ")}
                value={
                  vals.has_music === "YES"
                    ? `${L("Ndiyo", "Yes")}${vals.music_details ? " — " + vals.music_details : ""}`
                    : L("Hapana", "No")
                }
              />
              <PRow
                label={L("Kiwango cha Kelele", "Noise Level")}
                value={NOISE_LEVELS.find((n) => n.value === vals.noise_level)?.label}
              />
              <PRow
                label={L("Wauzaji wa Chakula", "Food Vendors")}
                value={vals.has_food_vendors === "YES" ? L("Ndiyo", "Yes") : L("Hapana", "No")}
              />
              <PRow
                label={L("Pombe", "Alcohol")}
                value={vals.has_alcohol === "YES" ? L("Ndiyo", "Yes") : L("Hapana", "No")}
              />
              <PRow
                label={L("Usalama", "Security")}
                value={
                  vals.has_security === "YES"
                    ? `${L("Ndiyo", "Yes")}${vals.security_details ? " — " + vals.security_details : ""}`
                    : L("Hapana", "No")
                }
              />
              <PRow
                label={L("Majirani Wamearifiwa", "Neighbours Notified")}
                value={vals.neighbors_notified === "YES" ? L("Ndiyo", "Yes") : L("Hapana", "No")}
              />
            </PSection>

            {/* Organizer */}
            <PSection
              icon={<User size={14} />}
              title={L("Msimamizi", "Organizer")}
              stepKey="organizer"
            >
              <PRow label={L("Jina", "Name")} value={vals.organizer_name} />
              <PRow label={L("Simu", "Phone")} value={vals.organizer_phone} />
              {vals.organizer_nida && <PRow label="NIDA" value={vals.organizer_nida} />}
              {vals.second_contact_name && (
                <PRow
                  label={L("Mawasiliano ya 2", "2nd Contact")}
                  value={`${vals.second_contact_name} · ${vals.second_contact_phone}`}
                />
              )}
              {vals.special_requests && (
                <PRow
                  label={L("Maombi Maalum", "Special Requests")}
                  value={vals.special_requests}
                />
              )}
            </PSection>

            {/* Docs */}
            {docs.length > 0 && (
              <PSection
                icon={<FileText size={14} />}
                title={L("Nyaraka", "Documents")}
                stepKey="organizer"
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
                      <div className="w-8 h-8 bg-pink-100 rounded-lg flex items-center justify-center shrink-0">
                        <FileText size={14} className="text-pink-600" />
                      </div>
                    )}
                    <p className="text-xs font-bold text-stone-700 flex-1 truncate">
                      {d.file.name}
                    </p>
                    <CheckCircle size={13} className="text-pink-500 shrink-0" />
                  </div>
                ))}
              </PSection>
            )}

            {/* Fee */}
            <div className="bg-pink-50 border border-pink-200 rounded-xl p-4 flex justify-between items-center">
              <span className="font-bold text-pink-800 text-sm">
                {L("Ada ya Kibari:", "Permit Fee:")}
              </span>
              <span className="text-xl font-black text-pink-700">
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
                  sw: "Ninakubali kufuata kanuni zote za Serikali ya Mtaa kuhusu matukio na sherehe.",
                  en: "I agree to comply with all Local Government regulations regarding events and celebrations.",
                },
              ].map((item) => (
                <label
                  key={item.key}
                  className={`flex items-start gap-3 cursor-pointer rounded-xl p-3 border transition-colors
                  ${vals[item.key] ? "bg-pink-50 border-pink-300" : "bg-stone-50 border-stone-200 hover:bg-pink-50/50"}`}
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
              className="flex-1 py-3.5 bg-gradient-to-r from-pink-600 to-rose-600 hover:from-pink-700 hover:to-rose-700 text-white rounded-xl font-bold shadow-lg transition-all flex items-center justify-center gap-2 text-sm"
            >
              {step === "organizer" ? (
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
              className="flex-1 py-3.5 bg-gradient-to-r from-pink-600 to-rose-600 hover:from-pink-700 hover:to-rose-700 text-white rounded-xl font-bold shadow-lg transition-all flex items-center justify-center gap-2 text-sm disabled:opacity-60 disabled:cursor-not-allowed"
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

export default KibariShereheForm;
