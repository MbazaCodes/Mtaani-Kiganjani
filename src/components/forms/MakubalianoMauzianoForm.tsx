/**
 * Makubaliano ya Mauzo — Sales Agreement Form
 * Logic: Seller (logged-in) pulls Buyer by NIDA/phone.
 * Both must be registered & approved citizens.
 * After admin approval, both receive a copy.
 *
 * Fee: 3% of sale value (min TSh 5,000, max TSh 500,000)
 * Color: Blue/indigo
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
  MapPin,
  DollarSign,
  Calendar,
  FileSignature,
  UserCheck,
  UserX,
} from "lucide-react";
import { FormProps, labels } from "./types";
import { ProgressFill } from "../ui/ProgressFill";
import { supabase } from "../../lib/supabase";
import { createAgreementNotification, createNotification } from "../../lib/notifications";

// ─── Fee calculator ──────────────────────────────────────────────────────────
const FEE_RATE = 0.03;
const MIN_FEE = 5000;
const MAX_FEE = 500000;
const calcFee = (value: number) =>
  Math.min(MAX_FEE, Math.max(MIN_FEE, Math.round(value * FEE_RATE)));

// ─── Constants ───────────────────────────────────────────────────────────────
const ASSET_TYPES = [
  { label: "Nyumba (Residential House)", value: "HOUSE" },
  { label: "Ghorofa / Apartment (Apartment)", value: "APARTMENT" },
  { label: "Ardhi / Kiwanja (Land / Plot)", value: "LAND" },
  { label: "Gari / Pikipiki (Vehicle / Motorcycle)", value: "VEHICLE" },
  { label: "Biashara (Business / Going Concern)", value: "BUSINESS" },
  { label: "Vifaa / Samani (Equipment / Furniture)", value: "EQUIPMENT" },
  { label: "Mifugo (Livestock)", value: "LIVESTOCK" },
  { label: "Nyingine (Other)", value: "OTHER" },
];

const PAYMENT_TERMS = [
  { label: "Malipo Kamili Mara Moja (Full Payment — Lump Sum)", value: "FULL" },
  { label: "Awamu — Sehemu ya Kwanza + Malipo ya Baadaye (Installments)", value: "INSTALLMENTS" },
  { label: "Sehemu ya Kwanza + Mkopo wa Benki (Deposit + Bank Loan)", value: "DEPOSIT_LOAN" },
  { label: "Mkataba wa Kipindi (Deferred Payment)", value: "DEFERRED" },
];

const ALLOWED_DOCS = ["image/jpeg", "image/png", "image/webp", "application/pdf"];
const MAX_DOC_SIZE = 10 * 1024 * 1024;

type Step = "seller" | "buyer" | "asset" | "terms" | "preview";

interface BuyerProfile {
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

interface WitnessInfo {
  name: string;
  phone: string;
  nida: string;
}
interface UploadedDoc {
  file: File;
  preview: string;
  label: string;
}

interface FormValues {
  // Step 2 — Buyer lookup
  buyer_search_term: string;
  buyer_search_type: string; // NIDA | PHONE | CT_ID
  // Step 3 — Asset
  asset_type: string;
  asset_description: string;
  asset_location: string;
  asset_identifier: string; // plot no, reg plate, etc.
  sale_price: string;
  currency: string;
  payment_terms: string;
  installment_details: string;
  transfer_date: string;
  // Step 4 — Terms & Witnesses
  special_conditions: string;
  witness1_name: string;
  witness1_phone: string;
  witness1_nida: string;
  witness2_name: string;
  witness2_phone: string;
  witness2_nida: string;
  // Consent
  seller_confirmed: boolean;
  terms_accepted: boolean;
}

export const MakubalianoMauzianoForm: React.FC<FormProps> = ({
  onSubmit,
  isLoading,
  lang = "sw",
  userProfile,
}) => {
  const t = labels[lang];
  const L = useCallback((sw: string, en: string) => (lang === "sw" ? sw : en), [lang]);

  const [step, setStep] = useState<Step>("seller");
  const [submitted, setSubmitted] = useState(false);
  const [appRef, setAppRef] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [docs, setDocs] = useState<UploadedDoc[]>([]);
  const docRef = useRef<HTMLInputElement>(null);
  const [docErr, setDocErr] = useState("");

  // Buyer lookup state
  const [buyerFound, setBuyerFound] = useState<BuyerProfile | null>(null);
  const [buyerSearching, setBuyerSearching] = useState(false);
  const [buyerError, setBuyerError] = useState("");

  const [vals, setVals] = useState<FormValues>({
    buyer_search_term: "",
    buyer_search_type: "NIDA",
    asset_type: "",
    asset_description: "",
    asset_location: "",
    asset_identifier: "",
    sale_price: "",
    currency: "TZS",
    payment_terms: "",
    installment_details: "",
    transfer_date: "",
    special_conditions: "",
    witness1_name: "",
    witness1_phone: "",
    witness1_nida: "",
    witness2_name: "",
    witness2_phone: "",
    witness2_nida: "",
    seller_confirmed: false,
    terms_accepted: false,
  });

  const saleValue = parseFloat(vals.sale_price) || 0;
  const fee = calcFee(saleValue);
  const fmtTsh = (n: number) => `TSh ${n.toLocaleString()}`;

  const STEPS: { key: Step; label: string; sw: string }[] = [
    { key: "seller", label: "Seller", sw: "Muuzaji" },
    { key: "buyer", label: "Buyer", sw: "Mnunuzi" },
    { key: "asset", label: "Asset", sw: "Mali" },
    { key: "terms", label: "Terms", sw: "Masharti" },
    { key: "preview", label: "Preview", sw: "Hakiki" },
  ];
  const stepIdx = STEPS.findIndex((s) => s.key === step);
  const progress = ((stepIdx + 1) / STEPS.length) * 100;

  const set = (k: keyof FormValues, v: string | boolean) => setVals((p) => ({ ...p, [k]: v }));
  const clrErr = (k: string) =>
    setErrors((p) => {
      const n = { ...p };
      delete n[k];
      return n;
    });
  const err = (k: string) => errors[k];

  // ─── Buyer lookup ────────────────────────────────────────────────────────
  const searchBuyer = async () => {
    const term = vals.buyer_search_term.trim();
    if (!term) {
      setBuyerError(L("Ingiza namba ya kutafuta", "Enter a search term"));
      return;
    }
    setBuyerSearching(true);
    setBuyerError("");
    setBuyerFound(null);
    try {
      let query = supabase.from("profiles").select("*");
      if (vals.buyer_search_type === "NIDA") query = query.eq("nida_number", term);
      if (vals.buyer_search_type === "PHONE") query = query.eq("phone", term);
      if (vals.buyer_search_type === "CT_ID") query = query.eq("citizen_id", term);
      const { data, error } = await query.single();
      if (error || !data) {
        setBuyerError(
          L(
            "Mtu huyu hayupo kwenye mfumo. Lazima awe mwananchi aliyesajiliwa na kuthibitishwa.",
            "Person not found. They must be a registered and verified citizen.",
          ),
        );
        return;
      }
      if (data.account_status !== "active" || !data.is_verified) {
        setBuyerError(
          L(
            "Akaunti ya mtu huyu haijathibitishwa au imezuiwa. Hawezi kuwa mnunuzi.",
            "This person's account is not verified or has been suspended. They cannot be a buyer.",
          ),
        );
        return;
      }
      if (data.id === userProfile?.id) {
        setBuyerError(
          L(
            "Huwezi kuwa muuzaji na mnunuzi wa bidhaa moja.",
            "You cannot be both seller and buyer of the same asset.",
          ),
        );
        return;
      }
      setBuyerFound(data as BuyerProfile);
    } catch {
      setBuyerError(L("Hitilafu ya mtandao. Jaribu tena.", "Network error. Please try again."));
    } finally {
      setBuyerSearching(false);
    }
  };

  // ─── Doc helpers ─────────────────────────────────────────────────────────
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

  // ─── Validation ──────────────────────────────────────────────────────────
  const validate = (): boolean => {
    const e: Record<string, string> = {};
    if (step === "buyer") {
      if (!buyerFound)
        e.buyer = L(
          "Lazima utafute na uthibitishe mnunuzi kwanza",
          "You must search and confirm the buyer first",
        );
    }
    if (step === "asset") {
      if (!vals.asset_type) e.asset_type = L("Chagua aina ya mali", "Select asset type");
      if (!vals.asset_description.trim())
        e.asset_description = L("Maelezo ya mali yanahitajika", "Asset description required");
      if (!vals.sale_price.trim() || parseFloat(vals.sale_price) <= 0)
        e.sale_price = L("Bei ya mauzo inahitajika", "Sale price required");
      if (!vals.payment_terms)
        e.payment_terms = L("Chagua masharti ya malipo", "Select payment terms");
      if (!vals.transfer_date)
        e.transfer_date = L("Tarehe ya uhamisho inahitajika", "Transfer date required");
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
      if (!vals.seller_confirmed)
        e.seller_confirmed = L("Muuzaji lazima athibitishe", "Seller must confirm");
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
      const ref = `SA-${new Date().getFullYear()}-${Math.floor(Math.random() * 900000 + 100000)}`;
      await onSubmit(
        {
          ...vals,
          buyer_id: buyerFound?.id,
          buyer_name: `${buyerFound?.first_name} ${buyerFound?.last_name}`,
          buyer_nida: buyerFound?.nida_number,
          buyer_phone: buyerFound?.phone,
          seller_id: userProfile?.id,
          total_fee: fee,
          service_name: "Makubaliano ya Mauzo",
          application_reference: ref,
        },
        docs.map((d) => d.file),
      );

      // Notify buyer — best-effort, doesn't block success state
      if (buyerFound?.id && userProfile?.id) {
        const sellerName = `${userProfile.first_name || ""} ${userProfile.last_name || ""}`.trim();
        const assetLabel =
          ASSET_TYPES.find((a) => a.value === vals.asset_type)
            ?.label?.split("(")[0]
            .trim() || "mali";
        const msg =
          lang === "sw"
            ? `${sellerName} amekuwa amewasilisha Makubaliano ya Mauzo (${ref}) kukuhusisha wewe kama mnunuzi wa ${assetLabel} kwa bei ya TSh ${saleValue.toLocaleString()}. Tafadhali fungua Maombi Yangu kukubali au kukataa.`
            : `${sellerName} has filed a Sales Agreement (${ref}) naming you as buyer of ${assetLabel} for TSh ${saleValue.toLocaleString()}. Please open My Applications to accept or reject.`;
        await Promise.all([
          createNotification({
            user_id: buyerFound.id,
            title:
              lang === "sw"
                ? "Makubaliano ya Mauzo Yamewasilishwa Kwako"
                : "Sales Agreement Filed With You",
            message: msg,
            type: "info",
          }),
          createAgreementNotification({
            application_id: ref, // reference number stored as link
            sender_id: userProfile.id,
            recipient_id: buyerFound.id,
            recipient_citizen_id: buyerFound.citizen_id || null,
            notification_type: "sales_agreement_pending_acceptance",
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
  const inputCls = (name: string) =>
    `w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all bg-white text-sm ${err(name) ? "border-red-400 bg-red-50" : "border-stone-200"}`;
  const lbl = "block text-xs font-bold text-stone-600 uppercase tracking-wider mb-1.5";
  const secHdr =
    "bg-gradient-to-r from-blue-50 to-indigo-50 px-4 py-3 rounded-xl border-l-4 border-blue-500 mb-4";

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

  const ProgressBar = () => (
    <div className="mb-6">
      <div className="flex justify-between mb-2">
        {STEPS.map((s, i) => (
          <div
            key={s.key}
            className={`flex flex-col items-center ${i <= stepIdx ? "text-blue-600" : "text-stone-300"}`}
          >
            <div
              className={`w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center font-bold text-[10px] sm:text-xs border-2 transition-all
              ${i < stepIdx ? "bg-blue-600 border-blue-600 text-white" : i === stepIdx ? "bg-blue-50 border-blue-600 text-blue-700" : "bg-stone-100 border-stone-200 text-stone-400"}`}
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
          className="bg-gradient-to-r from-blue-500 to-indigo-500 h-2 rounded-full transition-all duration-500"
        />
      </div>
      <div className="flex justify-between mt-1.5">
        <span className="text-xs text-stone-500 font-medium">
          {L(
            `Hatua ${stepIdx + 1} kati ya ${STEPS.length}`,
            `Step ${stepIdx + 1} of ${STEPS.length}`,
          )}
        </span>
        <span className="text-xs font-bold text-blue-600">{Math.round(progress)}%</span>
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
      <div className="bg-blue-50 px-4 py-2.5 border-b border-blue-100 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-blue-600">{icon}</span>
          <h4 className="font-bold text-blue-900 text-sm">{title}</h4>
        </div>
        <button
          type="button"
          onClick={() => setStep(stepKey)}
          className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 font-bold hover:bg-blue-100 px-2 py-1 rounded-lg transition-colors"
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
        <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mx-auto">
          <CheckCircle2 size={40} className="text-blue-600" />
        </div>
        <div className="space-y-2">
          <h3 className="text-xl font-black text-stone-900">
            {L("Makubaliano Yamewasilishwa!", "Agreement Submitted!")}
          </h3>
          <p className="text-stone-500 text-sm">
            {L(
              "Makubaliano ya Mauzo yamewasilishwa. Baada ya idhini ya Ofisi, pande zote mbili zitapokea nakala.",
              "Sales Agreement submitted. After office approval, both parties will receive a copy.",
            )}
          </p>
        </div>
        <div className="bg-blue-50 border border-blue-200 rounded-2xl p-5 text-left space-y-3 max-w-sm mx-auto">
          <p className="text-xs font-black text-blue-700 uppercase tracking-wider">
            {L("Namba ya Makubaliano", "Agreement Reference")}
          </p>
          <p className="text-2xl font-black text-blue-800 font-mono">{appRef}</p>
          <div className="space-y-2 pt-2 border-t border-blue-200">
            {[
              [L("Muuzaji", "Seller"), `${userProfile?.first_name} ${userProfile?.last_name}`],
              [L("Mnunuzi", "Buyer"), `${buyerFound?.first_name} ${buyerFound?.last_name}`],
              [
                L("Mali", "Asset"),
                ASSET_TYPES.find((a) => a.value === vals.asset_type)
                  ?.label?.split("(")[0]
                  .trim(),
              ],
              [L("Bei", "Price"), saleValue > 0 ? `TSh ${saleValue.toLocaleString()}` : "—"],
              [L("Ada", "Fee"), fmtTsh(fee)],
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
                "Ofisi itakagua makubaliano na kuthibitisha utambulisho wa pande zote mbili",
                "Office will review agreement and verify both parties",
              ),
              L(
                "Muuzaji NA Mnunuzi wataarifiwa kwa simu/barua pepe",
                "Seller AND Buyer will be notified by phone/email",
              ),
              L(
                `Lipa ada ya ${fmtTsh(fee)} (3% ya thamani ya mauzo)`,
                `Pay fee of ${fmtTsh(fee)} (3% of sale value)`,
              ),
              L(
                "Pande zote mbili zitapata nakala rasmi ya makubaliano",
                "Both parties will receive an official copy of the agreement",
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
      case "seller":
        return (
          <div className="space-y-5">
            <div className={secHdr}>
              <p className="font-bold text-blue-800 text-sm flex items-center gap-2">
                <User size={16} /> {L("TAARIFA ZA MUUZAJI", "SELLER INFORMATION")}
              </p>
              <p className="text-xs text-blue-600 mt-0.5">
                {L(
                  "Wewe ndiye muuzaji — taarifa zako zimechukuliwa kutoka kwenye wasifu wako",
                  "You are the seller — your details are taken from your profile",
                )}
              </p>
            </div>
            {userProfile?.is_verified ? (
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-3">
                  <UserCheck size={16} className="text-blue-600" />
                  <span className="text-xs font-bold text-blue-700 uppercase tracking-wide">
                    {L("Muuzaji Aliyethibitishwa", "Verified Seller")}
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
            <div className="bg-blue-50 border border-blue-100 rounded-xl p-3 flex gap-2">
              <Info size={14} className="text-blue-500 shrink-0 mt-0.5" />
              <p className="text-xs text-blue-700">
                {L(
                  "Makubaliano ya Mauzo yanafanywa kati ya pande mbili zilizosajiliwa kwenye mfumo. Muuzaji (wewe) na Mnunuzi wote lazima wawe wananchi waliothibitishwa.",
                  "A Sales Agreement is made between two parties registered in the system. Both Seller (you) and Buyer must be verified citizens.",
                )}
              </p>
            </div>
          </div>
        );

      case "buyer":
        return (
          <div className="space-y-5">
            <div className={secHdr}>
              <p className="font-bold text-blue-800 text-sm flex items-center gap-2">
                <Search size={16} /> {L("TAFUTA MNUNUZI", "FIND THE BUYER")}
              </p>
              <p className="text-xs text-blue-600 mt-0.5">
                {L(
                  "Ingiza namba ya NIDA, simu, au CT ID ya mnunuzi kutafuta",
                  "Enter the buyer's NIDA, phone or CT ID to search",
                )}
              </p>
            </div>
            <Field name="buyer_search_type" label={L("Tafuta Kwa", "Search By")}>
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
                      set("buyer_search_type", opt.value);
                      setBuyerFound(null);
                      setBuyerError("");
                    }}
                    className={`py-2.5 rounded-xl border-2 text-xs font-bold transition-all ${vals.buyer_search_type === opt.value ? "bg-blue-50 border-blue-500 text-blue-700" : "bg-white border-stone-200 text-stone-500 hover:border-stone-300"}`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </Field>
            <Field
              name="buyer"
              label={L(
                `Namba ya ${vals.buyer_search_type === "PHONE" ? "Simu" : vals.buyer_search_type}`,
                `${vals.buyer_search_type === "PHONE" ? "Phone" : vals.buyer_search_type} Number`,
              )}
              required
            >
              <div className="flex gap-2">
                <input
                  value={vals.buyer_search_term}
                  onChange={(e) => {
                    set("buyer_search_term", e.target.value);
                    setBuyerFound(null);
                    setBuyerError("");
                    clrErr("buyer");
                  }}
                  placeholder={
                    vals.buyer_search_type === "NIDA"
                      ? "XXXX-XXXX-XXXX-XXXX-XXXX"
                      : vals.buyer_search_type === "PHONE"
                        ? "+255 7XX XXX XXX"
                        : "CT2026A00001"
                  }
                  className={`flex-1 ${inputCls("buyer")}`}
                  onKeyDown={(e) => e.key === "Enter" && searchBuyer()}
                />
                <button
                  type="button"
                  onClick={searchBuyer}
                  disabled={buyerSearching}
                  className="px-4 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-xl font-bold text-sm flex items-center gap-2 transition-colors"
                >
                  {buyerSearching ? (
                    <Loader2 size={15} className="animate-spin" />
                  ) : (
                    <Search size={15} />
                  )}
                  <span className="hidden sm:inline">{L("Tafuta", "Search")}</span>
                </button>
              </div>
            </Field>
            {buyerError && (
              <div className="bg-red-50 border border-red-200 rounded-xl p-3 flex gap-2">
                <UserX size={15} className="text-red-500 shrink-0 mt-0.5" />
                <p className="text-xs text-red-700 font-medium">{buyerError}</p>
              </div>
            )}
            {buyerFound && (
              <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-3">
                  <UserCheck size={16} className="text-emerald-600" />
                  <span className="text-xs font-bold text-emerald-700 uppercase tracking-wide">
                    {L("Mnunuzi Amepatikana na Kuthibitishwa", "Buyer Found & Verified")}
                  </span>
                  <span className="ml-auto text-[10px] font-black text-emerald-700 bg-emerald-200 px-2 py-0.5 rounded-full">
                    ✓ {L("AKTIV", "ACTIVE")}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    [
                      L("Jina Kamili", "Full Name"),
                      `${buyerFound.first_name} ${buyerFound.middle_name || ""} ${buyerFound.last_name}`.trim(),
                    ],
                    ["NIDA", buyerFound.nida_number || "—"],
                    [L("Simu", "Phone"), buyerFound.phone || "—"],
                    [L("Mkoa", "Region"), buyerFound.region || "—"],
                    [L("Wilaya", "District"), buyerFound.district || "—"],
                    [L("Kata", "Ward"), buyerFound.ward || "—"],
                  ].map(([l, v]) => (
                    <div key={String(l)} className="bg-white rounded-lg px-3 py-2">
                      <p className="text-[9px] text-stone-400 uppercase tracking-wide">{l}</p>
                      <p className="text-xs font-bold text-stone-800 truncate">{v}</p>
                    </div>
                  ))}
                </div>
                <p className="text-xs text-emerald-600 mt-3 font-medium">
                  {L(
                    "✓ Hii ndiyo taarifa za mnunuzi. Hakikisha ni sahihi kabla ya kuendelea.",
                    "✓ These are the buyer's details. Confirm they are correct before proceeding.",
                  )}
                </p>
              </div>
            )}
          </div>
        );

      case "asset":
        return (
          <div className="space-y-5">
            <div className={secHdr}>
              <p className="font-bold text-blue-800 text-sm flex items-center gap-2">
                <Home size={16} /> {L("TAARIFA ZA MALI INAYOUZWA", "ASSET BEING SOLD")}
              </p>
            </div>
            <Field name="asset_type" label={L("Aina ya Mali", "Type of Asset")} required>
              <Sel
                name="asset_type"
                value={vals.asset_type}
                onChange={(v) => {
                  set("asset_type", v);
                  clrErr("asset_type");
                }}
                options={ASSET_TYPES}
              />
            </Field>
            <Field
              name="asset_description"
              label={L("Maelezo ya Kina ya Mali", "Detailed Asset Description")}
              required
              hint={L(
                "Eleza mali kwa undani: hali, vipimo, sifa, n.k.",
                "Describe the asset in detail: condition, size, features, etc.",
              )}
            >
              <textarea
                value={vals.asset_description}
                onChange={(e) => {
                  set("asset_description", e.target.value);
                  clrErr("asset_description");
                }}
                rows={4}
                placeholder={L(
                  "Maelezo ya mali inayouzwa...",
                  "Description of the asset being sold...",
                )}
                className={`${inputCls("asset_description")} resize-none`}
              />
            </Field>
            <Field
              name="asset_location"
              label={L(
                "Mahali pa Mali (Kama Ni Ardhi/Nyumba)",
                "Asset Location (If Land/Property)",
              )}
              hint={L(
                "Anwani kamili: Kata, Mtaa, Namba ya Nyumba",
                "Full address: Ward, Street, House Number",
              )}
            >
              <TI
                name="asset_location"
                value={vals.asset_location}
                onChange={(v) => set("asset_location", v)}
                placeholder={L(
                  "Mfano: Sinza B, Dodoma Road, No. 45",
                  "E.g. Sinza B, Dodoma Road, No. 45",
                )}
              />
            </Field>
            <Field
              name="asset_identifier"
              label={L("Namba ya Utambulisho wa Mali (Hiari)", "Asset Identifier (Optional)")}
              hint={L(
                "Mfano: Namba ya Plot, Namba ya Usajili wa Gari, n.k.",
                "E.g. Plot number, vehicle registration, etc.",
              )}
            >
              <TI
                name="asset_identifier"
                value={vals.asset_identifier}
                onChange={(v) => set("asset_identifier", v)}
                placeholder={L("Namba ya plot, usajili, n.k.", "Plot no., registration no., etc.")}
              />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field name="sale_price" label={L("Bei ya Mauzo (TSh)", "Sale Price (TSh)")} required>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-400 text-xs font-bold pointer-events-none">
                    TSh
                  </span>
                  <input
                    type="number"
                    value={vals.sale_price}
                    onChange={(e) => {
                      set("sale_price", e.target.value);
                      clrErr("sale_price");
                    }}
                    placeholder="1,000,000"
                    className={`${inputCls("sale_price")} pl-12`}
                  />
                </div>
              </Field>
              <Field name="transfer_date" label={L("Tarehe ya Uhamisho", "Transfer Date")} required>
                <TI
                  name="transfer_date"
                  value={vals.transfer_date}
                  type="date"
                  onChange={(v) => {
                    set("transfer_date", v);
                    clrErr("transfer_date");
                  }}
                />
              </Field>
            </div>
            {saleValue > 0 && (
              <div className="bg-blue-50 border border-blue-100 rounded-xl px-4 py-3 flex justify-between items-center">
                <span className="text-xs text-stone-500">
                  {L("Ada ya Huduma (3% ya thamani)", "Service Fee (3% of value)")}
                </span>
                <span className="font-black text-blue-700">{fmtTsh(fee)}</span>
              </div>
            )}
            <Field name="payment_terms" label={L("Masharti ya Malipo", "Payment Terms")} required>
              <Sel
                name="payment_terms"
                value={vals.payment_terms}
                onChange={(v) => {
                  set("payment_terms", v);
                  clrErr("payment_terms");
                }}
                options={PAYMENT_TERMS}
              />
            </Field>
            {vals.payment_terms === "INSTALLMENTS" && (
              <Field
                name="installment_details"
                label={L("Maelezo ya Awamu za Malipo", "Installment Payment Details")}
                hint={L(
                  "Mfano: Awamu 3, kila mwezi TSh 200,000",
                  "E.g. 3 installments, TSh 200,000/month",
                )}
              >
                <textarea
                  value={vals.installment_details}
                  onChange={(e) => set("installment_details", e.target.value)}
                  rows={2}
                  placeholder={L("Eleza awamu za malipo...", "Describe installment schedule...")}
                  className={`${inputCls("installment_details")} resize-none`}
                />
              </Field>
            )}
            {/* Documents */}
            <div>
              <label className={lbl}>
                {L("Nyaraka za Mali (Hiari)", "Asset Documents (Optional)")}
              </label>
              <p className="text-xs text-stone-400 mb-2">
                {L(
                  "Mfano: Hati ya ardhi, hati ya gari, picha za mali",
                  "E.g. Title deed, vehicle logbook, asset photos",
                )}
              </p>
              <div
                onClick={() => docRef.current?.click()}
                className={`border-2 border-dashed rounded-xl p-4 cursor-pointer transition-all text-center ${docs.length > 0 ? "border-blue-400 bg-blue-50" : "border-stone-300 hover:border-blue-400 hover:bg-blue-50/40"}`}
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
                          <div className="w-9 h-9 bg-blue-100 rounded-lg flex items-center justify-center shrink-0">
                            <FileText size={15} className="text-blue-600" />
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
                    <p className="text-xs text-blue-600 font-medium">
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
              <p className="font-bold text-blue-800 text-sm flex items-center gap-2">
                <FileSignature size={16} /> {L("MASHARTI NA MASHAHIDI", "TERMS & WITNESSES")}
              </p>
            </div>
            <Field
              name="special_conditions"
              label={L(
                "Masharti Maalum ya Makubaliano (Hiari)",
                "Special Agreement Conditions (Optional)",
              )}
              hint={L(
                "Masharti yoyote ya ziada yanayokubaliana na pande zote mbili",
                "Any additional terms agreed by both parties",
              )}
            >
              <textarea
                value={vals.special_conditions}
                onChange={(e) => set("special_conditions", e.target.value)}
                rows={4}
                placeholder={L(
                  "Mfano: Mali itakabidhiwa baada ya malipo kamili. Muuzaji atahakikisha hati zote zisalimishwe ndani ya siku 30...",
                  "E.g. Asset will be handed over after full payment. Seller will ensure all documents are transferred within 30 days...",
                )}
                className={`${inputCls("special_conditions")} resize-none`}
              />
            </Field>
            {/* Witnesses */}
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
            <div className="bg-blue-50 border border-blue-100 rounded-xl p-3 flex gap-2">
              <Shield size={14} className="text-blue-500 shrink-0 mt-0.5" />
              <p className="text-xs text-blue-700">
                {L(
                  "Mashahidi wawili wanahitajika kisheria. Wasijuane na muuzaji au mnunuzi kwa karibu sana (si jamaa wa karibu).",
                  "Two witnesses are legally required. They should not be closely related to either the seller or buyer.",
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
            <PSection icon={<User size={14} />} title={L("Muuzaji", "Seller")} stepKey="seller">
              <PRow
                label={L("Jina", "Name")}
                value={`${userProfile?.first_name} ${userProfile?.last_name}`}
              />
              <PRow label="NIDA" value={userProfile?.nida_number} />
              <PRow label={L("Simu", "Phone")} value={userProfile?.phone} />
              <PRow label={L("Mkoa", "Region")} value={userProfile?.region} />
            </PSection>
            <PSection icon={<UserCheck size={14} />} title={L("Mnunuzi", "Buyer")} stepKey="buyer">
              <PRow
                label={L("Jina", "Name")}
                value={`${buyerFound?.first_name} ${buyerFound?.last_name}`}
              />
              <PRow label="NIDA" value={buyerFound?.nida_number} />
              <PRow label={L("Simu", "Phone")} value={buyerFound?.phone} />
              <PRow label={L("Mkoa", "Region")} value={buyerFound?.region} />
            </PSection>
            <PSection
              icon={<Home size={14} />}
              title={L("Mali Inayouzwa", "Asset Being Sold")}
              stepKey="asset"
            >
              <PRow
                label={L("Aina", "Type")}
                value={ASSET_TYPES.find((a) => a.value === vals.asset_type)?.label}
              />
              <PRow
                label={L("Bei", "Price")}
                value={saleValue > 0 ? `TSh ${saleValue.toLocaleString()}` : "—"}
              />
              <PRow label={L("Tarehe ya Uhamisho", "Transfer Date")} value={vals.transfer_date} />
              <PRow
                label={L("Masharti ya Malipo", "Payment Terms")}
                value={PAYMENT_TERMS.find((p) => p.value === vals.payment_terms)?.label}
              />
              {vals.asset_location && (
                <PRow label={L("Mahali", "Location")} value={vals.asset_location} />
              )}
              {vals.asset_identifier && (
                <PRow
                  label={L("Namba ya Utambulisho", "Identifier")}
                  value={vals.asset_identifier}
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
              {vals.special_conditions && (
                <>
                  <p className="col-span-2 text-xs text-stone-500">
                    {L("Masharti Maalum", "Special Terms")}
                  </p>
                  <p className="col-span-2 text-xs font-bold text-stone-800">
                    {vals.special_conditions}
                  </p>
                </>
              )}
            </PSection>
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex justify-between items-center">
              <div>
                <span className="font-bold text-blue-800 text-sm">
                  {L("Ada ya Huduma:", "Service Fee:")}
                </span>
                <p className="text-xs text-blue-600">
                  {L("3% ya thamani ya mauzo", "3% of sale value")}
                </p>
              </div>
              <span className="text-xl font-black text-blue-700">{fmtTsh(fee)}</span>
            </div>
            <div className="space-y-3">
              <p className="text-xs font-black text-stone-600 uppercase tracking-wider">
                {L("IDHINI NA UTHIBITISHO", "CONSENT & CONFIRMATION")}
              </p>
              {[
                {
                  key: "seller_confirmed" as const,
                  sw: "Mimi (Muuzaji) nathibitisha kwamba mimi ndiye mmiliki halali wa mali hii na nina haki ya kuiuza.",
                  en: "I (Seller) confirm that I am the rightful owner of this asset and have the right to sell it.",
                },
                {
                  key: "terms_accepted" as const,
                  sw: "Nathibitisha kwamba taarifa zote ni za kweli na ninakubaliana na masharti ya Serikali ya Mtaa kuhusiana na makubaliano haya.",
                  en: "I confirm all information is accurate and agree to Local Government terms regarding this agreement.",
                },
              ].map((item) => (
                <label
                  key={item.key}
                  className={`flex items-start gap-3 cursor-pointer rounded-xl p-3 border transition-colors ${vals[item.key] ? "bg-blue-50 border-blue-300" : "bg-stone-50 border-stone-200 hover:bg-blue-50/50"}`}
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
              {(errors.seller_confirmed || errors.terms_accepted) && (
                <p className="text-red-500 text-xs flex items-center gap-1">
                  <AlertCircle size={11} />
                  {errors.seller_confirmed || errors.terms_accepted}
                </p>
              )}
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
              className="flex-1 py-3.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl font-bold shadow-lg transition-all flex items-center justify-center gap-2 text-sm"
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
              className="flex-1 py-3.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl font-bold shadow-lg transition-all flex items-center justify-center gap-2 text-sm disabled:opacity-60 disabled:cursor-not-allowed"
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

export default MakubalianoMauzianoForm;
