/**
 * Ombi la Ardhi ya Kijiji — Village Land Allocation Request
 * Fee: TSh 5,000
 * Steps: Mwombaji → Ardhi → Matumizi → Ushahidi → Preview
 */
import React, { useState, useMemo } from "react";
import {
  Loader2,
  CheckCircle2,
  ArrowLeft,
  ArrowRight,
  AlertCircle,
  FileText,
  Check,
  Eye,
  MapPin,
  Home,
  Layers,
  Upload,
  X,
} from "lucide-react";
import { FormProps } from "./types";
import { ProgressFill } from "../ui/ProgressFill";
import { SignaturePad } from "@/components/ui/SignaturePad";
import { TANZANIA_ADDRESS_DATA } from "@/lib/addressData";

const SERVICE_FEE = 5000;
const L = (lang: string, sw: string, en: string) => (lang === "sw" ? sw : en);

const LAND_TYPES = [
  { value: "HATI_MILIKI", label: "Hati Miliki (Certificate of Title)" },
  { value: "HATI_ARDHI", label: "Hati ya Ardhi ya Kijiji (Village Land Certificate)" },
  { value: "SKWATA", label: "Skwata / Kukaa tu (Squatter / Occupancy)" },
  { value: "KUKODISHA", label: "Kukodisha / Kupanga (Leasehold)" },
  { value: "KUPEWA", label: "Ardhi ya Kupewa (Granted / Allocated Land)" },
];

const LAND_SIZES = [
  { value: "CHINI_EKTARI_1", label: "Chini ya Ektari 1 (Below 1 Acre)" },
  { value: "EKTARI_1_5", label: "Ektari 1 – 5" },
  { value: "EKTARI_5_10", label: "Ektari 5 – 10" },
  { value: "EKTARI_10_50", label: "Ektari 10 – 50" },
  { value: "ZAIDI_EKTARI_50", label: "Zaidi ya Ektari 50 (Above 50 Acres)" },
  { value: "MITA_MRABA", label: "Mita za Mraba (specify sq metres below)" },
];

const LAND_PURPOSE = [
  { value: "KILIMO", label: "Kilimo — Mazao / Bustani (Farming / Horticulture)" },
  { value: "MIFUGO", label: "Ufugaji wa Mifugo (Livestock Grazing)" },
  { value: "MAKAZI", label: "Makazi — Ujenzi wa Nyumba (Residential / Housing)" },
  { value: "BIASHARA", label: "Biashara — Duka / Ofisi (Commercial / Shop / Office)" },
  { value: "VIWANDA", label: "Viwanda Vidogo (Small Industry / Workshop)" },
  { value: "SHULE", label: "Elimu — Shule / Chuo (School / College)" },
  { value: "KANISA_MSIKITI", label: "Kanisa / Msikiti (Church / Mosque)" },
  { value: "BUSTANI", label: "Bustani / Mbuga (Garden / Park)" },
  { value: "NYINGINE", label: "Nyingine (Other)" },
];

const TERRAIN = [
  { value: "TAMBARARE", label: "Tambarare (Flat)" },
  { value: "KILIMA", label: "Kilima / Mtelemko (Hilly / Slope)" },
  { value: "BONDE", label: "Bonde (Valley)" },
  { value: "MWAMBAO", label: "Karibu na Mto / Ziwa (Near River / Lake)" },
  { value: "MSITU", label: "Eneo la Msitu (Forested Area)" },
];

type Step = "mwombaji" | "ardhi" | "matumizi" | "ushahidi" | "preview";

interface FormVals {
  // Applicant
  applicant_name: string;
  applicant_nida: string;
  applicant_phone: string;
  applicant_sex: string;
  applicant_dob: string;
  applicant_region: string;
  applicant_district: string;
  applicant_ward: string;
  applicant_street: string;
  // Land location
  land_region: string;
  land_district: string;
  land_ward: string;
  land_street: string;
  land_plot_name: string;
  land_nearby: string;
  // Land details
  land_type: string;
  land_size_category: string;
  land_size_manual: string;
  terrain: string;
  water_access: string;
  road_access: string;
  current_state: string;
  // Purpose
  land_purpose: string;
  land_purpose_other: string;
  business_description: string;
  expected_start: string;
  annual_income_expected: string;
  // Evidence
  existing_occupants: string;
  boundary_description: string;
  supporting_doc: string;
  witness_name: string;
  witness_nida: string;
  witness_phone: string;
  // Signature
  signature: string;
}

export const OmbiArdhiKijijiForm: React.FC<FormProps> = ({
  onSubmit,
  isLoading,
  lang = "sw",
  userProfile,
}) => {
  const [step, setStep] = useState<Step>("mwombaji");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [docFile, setDocFile] = useState<string>("");
  const [sameAsApplicant, setSameAsApplicant] = useState(true);

  const fullName =
    `${userProfile?.first_name || ""} ${userProfile?.middle_name || ""} ${userProfile?.last_name || ""}`.trim();

  const [vals, setVals] = useState<FormVals>({
    applicant_name: fullName,
    applicant_nida: userProfile?.nida_number || "",
    applicant_phone: userProfile?.phone || "",
    applicant_sex: userProfile?.sex || "",
    applicant_dob: userProfile?.date_of_birth || "",
    applicant_region: userProfile?.region || "",
    applicant_district: userProfile?.district || "",
    applicant_ward: userProfile?.ward || "",
    applicant_street: userProfile?.street || "",
    land_region: userProfile?.region || "",
    land_district: userProfile?.district || "",
    land_ward: "",
    land_street: "",
    land_plot_name: "",
    land_nearby: "",
    land_type: "",
    land_size_category: "",
    land_size_manual: "",
    terrain: "",
    water_access: "",
    road_access: "",
    current_state: "",
    land_purpose: "",
    land_purpose_other: "",
    business_description: "",
    expected_start: "",
    annual_income_expected: "",
    existing_occupants: "",
    boundary_description: "",
    supporting_doc: "",
    witness_name: "",
    witness_nida: "",
    witness_phone: "",
    signature: "",
  });

  const set = (k: keyof FormVals, v: string) => setVals((p) => ({ ...p, [k]: v }));
  const clrErr = (k: string) =>
    setErrors((p) => {
      const n = { ...p };
      delete n[k];
      return n;
    });

  // Cascading address for applicant
  const aRegions = useMemo(() => TANZANIA_ADDRESS_DATA.map((r) => r.name), []);
  const aDistricts = useMemo(
    () =>
      TANZANIA_ADDRESS_DATA.find((r) => r.name === vals.applicant_region)?.districts.map(
        (d) => d.name,
      ) || [],
    [vals.applicant_region],
  );
  const aWards = useMemo(
    () =>
      TANZANIA_ADDRESS_DATA.find((r) => r.name === vals.applicant_region)?.districts.find(
        (d) => d.name === vals.applicant_district,
      )?.wards || [],
    [vals.applicant_region, vals.applicant_district],
  );

  // Cascading address for land
  const lDistricts = useMemo(
    () =>
      TANZANIA_ADDRESS_DATA.find((r) => r.name === vals.land_region)?.districts.map(
        (d) => d.name,
      ) || [],
    [vals.land_region],
  );
  const lWards = useMemo(
    () =>
      TANZANIA_ADDRESS_DATA.find((r) => r.name === vals.land_region)?.districts.find(
        (d) => d.name === vals.land_district,
      )?.wards || [],
    [vals.land_region, vals.land_district],
  );

  const STEPS: { key: Step; sw: string; en: string }[] = [
    { key: "mwombaji", sw: "Mwombaji", en: "Applicant" },
    { key: "ardhi", sw: "Ardhi", en: "Land" },
    { key: "matumizi", sw: "Matumizi", en: "Purpose" },
    { key: "ushahidi", sw: "Ushahidi", en: "Evidence" },
    { key: "preview", sw: "Hakiki", en: "Preview" },
  ];
  const stepIdx = STEPS.findIndex((s) => s.key === step);

  const validate = (): boolean => {
    const e: Record<string, string> = {};
    if (step === "mwombaji") {
      if (!vals.applicant_name.trim())
        e.applicant_name = L(lang, "Jina linahitajika", "Name required");
      if (!vals.applicant_nida.trim())
        e.applicant_nida = L(lang, "NIDA inahitajika", "NIDA required");
      if (!vals.applicant_phone.trim())
        e.applicant_phone = L(lang, "Simu inahitajika", "Phone required");
      if (!vals.applicant_region)
        e.applicant_region = L(lang, "Mkoa inahitajika", "Region required");
    }
    if (step === "ardhi") {
      if (!vals.land_region)
        e.land_region = L(lang, "Mkoa wa ardhi inahitajika", "Land region required");
      if (!vals.land_district) e.land_district = L(lang, "Wilaya inahitajika", "District required");
      if (!vals.land_ward) e.land_ward = L(lang, "Kata inahitajika", "Ward required");
      if (!vals.land_type)
        e.land_type = L(lang, "Aina ya hati inahitajika", "Land tenure type required");
      if (!vals.land_size_category)
        e.land_size_category = L(lang, "Ukubwa wa ardhi unahitajika", "Land size required");
    }
    if (step === "matumizi") {
      if (!vals.land_purpose)
        e.land_purpose = L(lang, "Matumizi ya ardhi yanahitajika", "Land purpose required");
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const next = () => {
    if (validate()) {
      const n = STEPS[stepIdx + 1];
      if (n) setStep(n.key as Step);
    }
  };
  const prev = () => {
    const p = STEPS[stepIdx - 1];
    if (p) setStep(p.key as Step);
  };

  const handleDocUpload = (file: File) => {
    const reader = new FileReader();
    reader.onload = () => setDocFile(reader.result as string);
    reader.readAsDataURL(file);
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      await onSubmit({
        ...vals,
        supporting_doc: docFile,
        service_fee: SERVICE_FEE,
        total_fee: SERVICE_FEE,
      });
      setSubmitted(true);
    } finally {
      setSubmitting(false);
    }
  };

  const inputCls = (k?: string) =>
    `w-full px-4 py-3 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-colors ${k && errors[k] ? "border-red-400 bg-red-50" : "border-stone-200 bg-white"}`;
  const lbl = "block text-xs font-bold text-stone-600 uppercase tracking-wider mb-1.5";
  const secHdr = "bg-emerald-50 border border-emerald-100 rounded-xl px-4 py-3 mb-4";
  const ErrMsg = ({ k }: { k: string }) =>
    errors[k] ? (
      <p className="text-red-500 text-xs flex items-center gap-1 mt-1">
        <AlertCircle size={11} />
        {errors[k]}
      </p>
    ) : null;

  const AddressBlock = ({
    prefix,
    rVal,
    dVal,
    wVal,
    rOpts,
    dOpts,
    wOpts,
    onRegion,
    onDistrict,
    onWard,
    showStreet,
    streetVal,
    onStreet,
  }: {
    prefix: string;
    rVal: string;
    dVal: string;
    wVal: string;
    rOpts: string[];
    dOpts: string[];
    wOpts: string[];
    onRegion: (v: string) => void;
    onDistrict: (v: string) => void;
    onWard: (v: string) => void;
    showStreet?: boolean;
    streetVal?: string;
    onStreet?: (v: string) => void;
  }) => (
    <div className="space-y-3">
      <div>
        <label className={lbl}>{L(lang, "Mkoa *", "Region *")}</label>
        <select
          value={rVal}
          onChange={(e) => onRegion(e.target.value)}
          className={inputCls(`${prefix}_region`)}
        >
          <option value="">{L(lang, "-- Chagua mkoa --", "-- Select region --")}</option>
          {rOpts.map((r) => (
            <option key={r} value={r}>
              {r}
            </option>
          ))}
        </select>
        <ErrMsg k={`${prefix}_region`} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={lbl}>{L(lang, "Wilaya *", "District *")}</label>
          <select
            value={dVal}
            onChange={(e) => onDistrict(e.target.value)}
            className={inputCls(`${prefix}_district`)}
            disabled={!rVal}
          >
            <option value="">{L(lang, "-- Wilaya --", "-- District --")}</option>
            {dOpts.map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>
          <ErrMsg k={`${prefix}_district`} />
        </div>
        <div>
          <label className={lbl}>{L(lang, "Kata *", "Ward *")}</label>
          <select
            value={wVal}
            onChange={(e) => onWard(e.target.value)}
            className={inputCls(`${prefix}_ward`)}
            disabled={!dVal}
          >
            <option value="">{L(lang, "-- Kata --", "-- Ward --")}</option>
            {wOpts.map((w) => (
              <option key={w} value={w}>
                {w}
              </option>
            ))}
          </select>
          <ErrMsg k={`${prefix}_ward`} />
        </div>
      </div>
      {showStreet && (
        <div>
          <label className={lbl}>{L(lang, "Mtaa / Kijiji", "Street / Village")}</label>
          <input
            value={streetVal || ""}
            onChange={(e) => onStreet?.(e.target.value)}
            className={inputCls()}
            placeholder={L(lang, "Jaza jina la mtaa au kijiji", "Enter street or village name")}
          />
        </div>
      )}
    </div>
  );

  if (submitted)
    return (
      <div className="text-center py-10 space-y-4">
        <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto">
          <CheckCircle2 size={32} className="text-emerald-600" />
        </div>
        <h3 className="text-xl font-black">
          {L(lang, "Ombi Limewasilishwa!", "Application Submitted!")}
        </h3>
        <p className="text-stone-500 text-sm">
          {L(
            lang,
            "Ombi lako la ardhi litashughulikiwa na Baraza la Kijiji / Kata.",
            "Your land request will be processed by the Village / Ward Council.",
          )}
        </p>
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 max-w-xs mx-auto space-y-1 text-left">
          {[
            ["Mwombaji", vals.applicant_name],
            ["Ardhi", `${vals.land_ward}, ${vals.land_district}`],
            [
              "Aina",
              LAND_TYPES.find((t) => t.value === vals.land_type)?.label?.split("(")[0] || "",
            ],
            [
              "Matumizi",
              LAND_PURPOSE.find((p) => p.value === vals.land_purpose)?.label?.split("(")[0] || "",
            ],
            ["Ada", `TSh ${SERVICE_FEE.toLocaleString()}`],
          ].map(([k, v]) => (
            <div key={k} className="flex justify-between text-sm">
              <span className="text-stone-500">{k}</span>
              <span className="font-bold">{v}</span>
            </div>
          ))}
        </div>
      </div>
    );

  return (
    <div className="space-y-5">
      <ProgressFill progress={((stepIdx + 1) / STEPS.length) * 100} />
      <div className="flex gap-1.5 justify-center flex-wrap">
        {STEPS.map((s, i) => (
          <div
            key={s.key}
            className={`px-2 py-1 rounded-full text-[10px] font-bold flex items-center gap-1 ${i <= stepIdx ? "bg-emerald-100 text-emerald-700" : "bg-stone-100 text-stone-400"}`}
          >
            {i < stepIdx && <Check size={10} />}
            {lang === "sw" ? s.sw : s.en}
          </div>
        ))}
      </div>

      {/* ── STEP 1: Applicant ── */}
      {step === "mwombaji" && (
        <div className="space-y-4">
          <div className={secHdr}>
            <p className="font-bold text-emerald-800 text-sm flex items-center gap-2">
              <Home size={15} />
              {L(lang, "TAARIFA ZA MWOMBAJI", "APPLICANT INFORMATION")}
            </p>
            <p className="text-xs text-emerald-600 mt-1">
              {L(lang, "Taarifa zimejazwa kutoka profaili yako", "Pre-filled from your profile")}
            </p>
          </div>
          <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 flex items-center gap-2 text-xs text-emerald-700">
            <Check size={13} className="shrink-0" />
            {L(lang, "Rekebisha taarifa ikiwa si sahihi", "Edit details if incorrect")}
          </div>
          <div>
            <label className={lbl}>{L(lang, "Jina Kamili *", "Full Name *")}</label>
            <input
              value={vals.applicant_name}
              onChange={(e) => {
                set("applicant_name", e.target.value);
                clrErr("applicant_name");
              }}
              className={inputCls("applicant_name")}
            />
            <ErrMsg k="applicant_name" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={lbl}>{L(lang, "Namba ya NIDA *", "NIDA Number *")}</label>
              <input
                value={vals.applicant_nida}
                onChange={(e) => {
                  set("applicant_nida", e.target.value);
                  clrErr("applicant_nida");
                }}
                className={inputCls("applicant_nida")}
                placeholder="20XXXXXXXXXXXXXXXXX"
              />
              <ErrMsg k="applicant_nida" />
            </div>
            <div>
              <label className={lbl}>{L(lang, "Simu *", "Phone *")}</label>
              <input
                value={vals.applicant_phone}
                onChange={(e) => {
                  set("applicant_phone", e.target.value);
                  clrErr("applicant_phone");
                }}
                className={inputCls("applicant_phone")}
                placeholder="+255 7XX XXX XXX"
              />
              <ErrMsg k="applicant_phone" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={lbl}>{L(lang, "Jinsia", "Sex")}</label>
              <select
                value={vals.applicant_sex}
                onChange={(e) => set("applicant_sex", e.target.value)}
                className={inputCls()}
              >
                <option value="">{L(lang, "-- Chagua --", "-- Select --")}</option>
                <option value="M">{L(lang, "Mme (Male)", "Male")}</option>
                <option value="F">{L(lang, "Mke (Female)", "Female")}</option>
              </select>
            </div>
            <div>
              <label className={lbl}>{L(lang, "Tarehe ya Kuzaliwa", "Date of Birth")}</label>
              <input
                type="date"
                value={vals.applicant_dob}
                onChange={(e) => set("applicant_dob", e.target.value)}
                className={inputCls()}
              />
            </div>
          </div>
          <p className="text-xs font-black text-stone-400 uppercase tracking-widest">
            {L(lang, "Anwani ya Mwombaji", "Applicant Address")}
          </p>
          <AddressBlock
            prefix="applicant"
            rVal={vals.applicant_region}
            dVal={vals.applicant_district}
            wVal={vals.applicant_ward}
            rOpts={aRegions}
            dOpts={aDistricts}
            wOpts={aWards}
            onRegion={(v) => {
              set("applicant_region", v);
              set("applicant_district", "");
              set("applicant_ward", "");
              clrErr("applicant_region");
            }}
            onDistrict={(v) => {
              set("applicant_district", v);
              set("applicant_ward", "");
            }}
            onWard={(v) => set("applicant_ward", v)}
            showStreet
            streetVal={vals.applicant_street}
            onStreet={(v) => set("applicant_street", v)}
          />
        </div>
      )}

      {/* ── STEP 2: Land ── */}
      {step === "ardhi" && (
        <div className="space-y-4">
          <div className={secHdr}>
            <p className="font-bold text-emerald-800 text-sm flex items-center gap-2">
              <MapPin size={15} />
              {L(lang, "MAHALI PA ARDHI INAYOOMBWA", "LAND LOCATION")}
            </p>
          </div>

          {/* Toggle same as applicant */}
          <div className="flex items-center gap-3 bg-stone-50 border border-stone-200 rounded-xl p-3">
            <input
              type="checkbox"
              id="same_loc"
              checked={sameAsApplicant}
              onChange={(e) => {
                setSameAsApplicant(e.target.checked);
                if (e.target.checked) {
                  set("land_region", vals.applicant_region);
                  set("land_district", vals.applicant_district);
                  set("land_ward", vals.applicant_ward);
                }
              }}
              className="w-4 h-4 text-emerald-600"
            />
            <label htmlFor="same_loc" className="text-xs font-bold text-stone-700">
              {L(lang, "Ardhi iko kata moja na mwombaji", "Land is in the same ward as applicant")}
            </label>
          </div>

          {!sameAsApplicant && (
            <AddressBlock
              prefix="land"
              rVal={vals.land_region}
              dVal={vals.land_district}
              wVal={vals.land_ward}
              rOpts={aRegions}
              dOpts={lDistricts}
              wOpts={lWards}
              onRegion={(v) => {
                set("land_region", v);
                set("land_district", "");
                set("land_ward", "");
                clrErr("land_region");
              }}
              onDistrict={(v) => {
                set("land_district", v);
                set("land_ward", "");
                clrErr("land_district");
              }}
              onWard={(v) => {
                set("land_ward", v);
                clrErr("land_ward");
              }}
              showStreet
              streetVal={vals.land_street}
              onStreet={(v) => set("land_street", v)}
            />
          )}
          {sameAsApplicant && (
            <div className="space-y-3">
              <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-3 text-xs text-emerald-700">
                <p className="font-bold">{L(lang, "Eneo:", "Location:")}</p>
                <p>
                  {vals.applicant_ward}, {vals.applicant_district}, {vals.applicant_region}
                </p>
              </div>
              <div>
                <label className={lbl}>
                  {L(lang, "Mtaa / Kijiji halisi", "Exact Street / Village")}
                </label>
                <input
                  value={vals.land_street}
                  onChange={(e) => set("land_street", e.target.value)}
                  className={inputCls()}
                  placeholder={L(lang, "Jina la mtaa au sehemu ya ardhi", "Street name or area")}
                />
              </div>
            </div>
          )}

          <div>
            <label className={lbl}>{L(lang, "Jina la Eneo / Kiwanja", "Plot / Area Name")}</label>
            <input
              value={vals.land_plot_name}
              onChange={(e) => set("land_plot_name", e.target.value)}
              className={inputCls()}
              placeholder={L(
                lang,
                "Mfano: Shamba la Juu, Kiwanja cha Sokoni",
                "E.g. Upper Farm, Market Plot",
              )}
            />
          </div>
          <div>
            <label className={lbl}>
              {L(lang, "Maeneo Jirani / Alama za Mipaka", "Neighbouring Areas / Boundary Marks")}
            </label>
            <textarea
              value={vals.land_nearby}
              onChange={(e) => set("land_nearby", e.target.value)}
              rows={2}
              className={`${inputCls()} resize-none`}
              placeholder={L(
                lang,
                "Mfano: Kaskazini — Shamba la Ali, Kusini — Barabara kuu...",
                "E.g. North — Ali's farm, South — Main road...",
              )}
            />
          </div>

          {/* Land type */}
          <div>
            <label className={lbl}>
              {L(lang, "Aina ya Hati / Umiliki wa Ardhi *", "Land Tenure / Title Type *")}
            </label>
            <select
              value={vals.land_type}
              onChange={(e) => {
                set("land_type", e.target.value);
                clrErr("land_type");
              }}
              className={inputCls("land_type")}
            >
              <option value="">
                {L(lang, "-- Chagua aina ya hati --", "-- Select tenure type --")}
              </option>
              {LAND_TYPES.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
            <ErrMsg k="land_type" />
          </div>

          {/* Land size */}
          <div>
            <label className={lbl}>{L(lang, "Ukubwa wa Ardhi *", "Land Size *")}</label>
            <select
              value={vals.land_size_category}
              onChange={(e) => {
                set("land_size_category", e.target.value);
                clrErr("land_size_category");
              }}
              className={inputCls("land_size_category")}
            >
              <option value="">{L(lang, "-- Chagua ukubwa --", "-- Select size --")}</option>
              {LAND_SIZES.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>
            <ErrMsg k="land_size_category" />
          </div>
          {(vals.land_size_category === "MITA_MRABA" || vals.land_size_category) && (
            <div>
              <label className={lbl}>
                {L(
                  lang,
                  "Ukubwa Halisi (Ektari / Mita za Mraba)",
                  "Exact Size (Acres / Square Metres)",
                )}
              </label>
              <input
                value={vals.land_size_manual}
                onChange={(e) => set("land_size_manual", e.target.value)}
                className={inputCls()}
                placeholder={L(lang, "Mfano: 2.5 ektari / 1000 m²", "E.g. 2.5 acres / 1000 m²")}
              />
            </div>
          )}

          {/* Terrain */}
          <div>
            <label className={lbl}>
              {L(lang, "Hali ya Ardhi / Mteremko", "Terrain / Topography")}
            </label>
            <select
              value={vals.terrain}
              onChange={(e) => set("terrain", e.target.value)}
              className={inputCls()}
            >
              <option value="">
                {L(lang, "-- Chagua hali ya ardhi --", "-- Select terrain --")}
              </option>
              {TERRAIN.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={lbl}>{L(lang, "Upatikanaji wa Maji", "Water Access")}</label>
              <select
                value={vals.water_access}
                onChange={(e) => set("water_access", e.target.value)}
                className={inputCls()}
              >
                <option value="">{L(lang, "-- Maji --", "-- Water --")}</option>
                <option value="NDO">{L(lang, "Ndiyo — mto / kisima", "Yes — river / well")}</option>
                <option value="MWENDO">
                  {L(lang, "Karibu — mwendo mfupi", "Nearby — short walk")}
                </option>
                <option value="HAPANA">{L(lang, "Hapana", "No")}</option>
              </select>
            </div>
            <div>
              <label className={lbl}>{L(lang, "Upatikanaji wa Barabara", "Road Access")}</label>
              <select
                value={vals.road_access}
                onChange={(e) => set("road_access", e.target.value)}
                className={inputCls()}
              >
                <option value="">{L(lang, "-- Barabara --", "-- Road --")}</option>
                <option value="LAMI">{L(lang, "Barabara ya lami", "Tarmac road")}</option>
                <option value="CHANGARAWE">
                  {L(lang, "Changarawe / Udongo", "Gravel / Dirt road")}
                </option>
                <option value="NJIA">{L(lang, "Njia ya miguu tu", "Footpath only")}</option>
                <option value="HAPANA">{L(lang, "Hakuna barabara", "No road access")}</option>
              </select>
            </div>
          </div>

          <div>
            <label className={lbl}>
              {L(lang, "Hali ya Sasa ya Ardhi", "Current State of Land")}
            </label>
            <select
              value={vals.current_state}
              onChange={(e) => set("current_state", e.target.value)}
              className={inputCls()}
            >
              <option value="">{L(lang, "-- Hali ya ardhi --", "-- Current state --")}</option>
              <option value="WAZI">
                {L(lang, "Ardhi tupu / wazi (Bare / Vacant)", "Bare / Vacant")}
              </option>
              <option value="MSITU">
                {L(lang, "Msitu / Vichaka (Bush / Forest)", "Bush / Forest")}
              </option>
              <option value="INAYOFANYWA">
                {L(lang, "Inafanyiwa kazi (In use / Cultivated)", "In use / Cultivated")}
              </option>
              <option value="INAENDELEA">
                {L(lang, "Ujenzi unaendelea (Under construction)", "Under construction")}
              </option>
            </select>
          </div>
        </div>
      )}

      {/* ── STEP 3: Purpose ── */}
      {step === "matumizi" && (
        <div className="space-y-4">
          <div className={secHdr}>
            <p className="font-bold text-emerald-800 text-sm flex items-center gap-2">
              <Layers size={15} />
              {L(lang, "MATUMIZI YA ARDHI", "INTENDED LAND USE")}
            </p>
          </div>
          <div>
            <label className={lbl}>
              {L(lang, "Matumizi Makuu ya Ardhi *", "Primary Land Purpose *")}
            </label>
            <select
              value={vals.land_purpose}
              onChange={(e) => {
                set("land_purpose", e.target.value);
                clrErr("land_purpose");
              }}
              className={inputCls("land_purpose")}
            >
              <option value="">{L(lang, "-- Chagua matumizi --", "-- Select purpose --")}</option>
              {LAND_PURPOSE.map((p) => (
                <option key={p.value} value={p.value}>
                  {p.label}
                </option>
              ))}
            </select>
            <ErrMsg k="land_purpose" />
          </div>
          {vals.land_purpose === "NYINGINE" && (
            <div>
              <label className={lbl}>{L(lang, "Eleza Matumizi", "Describe Purpose")}</label>
              <input
                value={vals.land_purpose_other}
                onChange={(e) => set("land_purpose_other", e.target.value)}
                className={inputCls()}
              />
            </div>
          )}

          {/* Purpose-specific questions */}
          {["BIASHARA", "VIWANDA"].includes(vals.land_purpose) && (
            <div>
              <label className={lbl}>
                {L(lang, "Aina ya Biashara / Kiwanda", "Type of Business / Industry")}
              </label>
              <textarea
                value={vals.business_description}
                onChange={(e) => set("business_description", e.target.value)}
                rows={3}
                className={`${inputCls()} resize-none`}
                placeholder={L(
                  lang,
                  "Eleza kwa undani aina ya biashara au kiwanda unachopanga kuanzisha...",
                  "Describe in detail the type of business or industry you plan to start...",
                )}
              />
            </div>
          )}
          {["KILIMO", "MIFUGO"].includes(vals.land_purpose) && (
            <div>
              <label className={lbl}>
                {L(lang, "Mazao / Mifugo Inayopangwa", "Planned Crops / Livestock")}
              </label>
              <textarea
                value={vals.business_description}
                onChange={(e) => set("business_description", e.target.value)}
                rows={2}
                className={`${inputCls()} resize-none`}
                placeholder={L(
                  lang,
                  "Mfano: Mahindi, mpunga, mifugo ya ng'ombe...",
                  "E.g. Maize, rice, cattle farming...",
                )}
              />
            </div>
          )}
          {["MAKAZI", "SHULE", "KANISA_MSIKITI"].includes(vals.land_purpose) && (
            <div>
              <label className={lbl}>{L(lang, "Maelezo ya Mradi", "Project Description")}</label>
              <textarea
                value={vals.business_description}
                onChange={(e) => set("business_description", e.target.value)}
                rows={2}
                className={`${inputCls()} resize-none`}
                placeholder={L(
                  lang,
                  "Eleza mpango wako wa ujenzi...",
                  "Describe your construction plan...",
                )}
              />
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={lbl}>
                {L(lang, "Tarehe Inayotarajiwa ya Kuanza", "Expected Start Date")}
              </label>
              <input
                type="date"
                value={vals.expected_start}
                onChange={(e) => set("expected_start", e.target.value)}
                className={inputCls()}
              />
            </div>
            <div>
              <label className={lbl}>
                {L(lang, "Mapato Yanayotarajiwa / Mwaka (TSh)", "Expected Annual Income (TSh)")}
              </label>
              <input
                type="number"
                min="0"
                value={vals.annual_income_expected}
                onChange={(e) => set("annual_income_expected", e.target.value)}
                className={inputCls()}
                placeholder="0"
              />
            </div>
          </div>
        </div>
      )}

      {/* ── STEP 4: Evidence ── */}
      {step === "ushahidi" && (
        <div className="space-y-4">
          <div className={secHdr}>
            <p className="font-bold text-emerald-800 text-sm">
              {L(lang, "USHAHIDI NA UTHIBITISHO", "EVIDENCE & VERIFICATION")}
            </p>
          </div>
          <div>
            <label className={lbl}>
              {L(
                lang,
                "Je, Kuna Watu wanaokaa Ardhini Sasa?",
                "Are There Current Occupants on This Land?",
              )}
            </label>
            <select
              value={vals.existing_occupants}
              onChange={(e) => set("existing_occupants", e.target.value)}
              className={inputCls()}
            >
              <option value="">{L(lang, "-- Chagua --", "-- Select --")}</option>
              <option value="HAPANA">
                {L(lang, "Hapana — Ardhi ipo wazi", "No — Land is vacant")}
              </option>
              <option value="NDIO_KIBALI">
                {L(lang, "Ndiyo — Wana kibali / ruhusa", "Yes — With permission")}
              </option>
              <option value="NDIO_BILA">
                {L(lang, "Ndiyo — Bila ruhusa (Squatters)", "Yes — Without permission (Squatters)")}
              </option>
            </select>
          </div>
          <div>
            <label className={lbl}>
              {L(lang, "Maelezo ya Mipaka ya Ardhi", "Land Boundary Description")}
            </label>
            <textarea
              value={vals.boundary_description}
              onChange={(e) => set("boundary_description", e.target.value)}
              rows={3}
              className={`${inputCls()} resize-none`}
              placeholder={L(
                lang,
                "Eleza mipaka yote ya ardhi (Kaskazini, Kusini, Mashariki, Magharibi)...",
                "Describe all land boundaries (North, South, East, West)...",
              )}
            />
          </div>

          {/* Supporting doc */}
          <div>
            <label className={lbl}>
              {L(
                lang,
                "Hati za Kusaidia Ombi (Ramani, Picha, n.k.) — Hiari",
                "Supporting Documents (Map, Photo, etc.) — Optional",
              )}
            </label>
            {docFile ? (
              <div className="flex items-center gap-3 p-3 bg-stone-50 border border-stone-200 rounded-xl">
                <FileText size={20} className="text-emerald-600" />
                <span className="text-sm font-bold text-stone-700 flex-1">
                  {L(lang, "Hati imepakiwa", "Document uploaded")}
                </span>
                <button
                  type="button"
                  onClick={() => setDocFile("")}
                  className="text-red-400 hover:text-red-600"
                >
                  <X size={16} />
                </button>
              </div>
            ) : (
              <label className="flex flex-col items-center justify-center h-24 border-2 border-dashed border-stone-300 rounded-xl cursor-pointer hover:border-emerald-400 hover:bg-emerald-50/30 transition-all">
                <Upload size={18} className="text-stone-400 mb-1" />
                <span className="text-xs text-stone-400 font-medium">
                  {L(lang, "Pakia ramani au picha ya ardhi", "Upload map or photo of land")}
                </span>
                <input
                  type="file"
                  accept="image/jpeg,image/png,application/pdf"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) handleDocUpload(f);
                    e.target.value = "";
                  }}
                />
              </label>
            )}
          </div>

          <p className="text-xs font-black text-stone-400 uppercase tracking-widest">
            {L(lang, "Shahidi", "Witness")}
          </p>
          <div>
            <label className={lbl}>
              {L(
                lang,
                "Jina la Shahidi (Jirani / Kiongozi wa Mtaa)",
                "Witness Name (Neighbour / Local Leader)",
              )}
            </label>
            <input
              value={vals.witness_name}
              onChange={(e) => set("witness_name", e.target.value)}
              className={inputCls()}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={lbl}>NIDA</label>
              <input
                value={vals.witness_nida}
                onChange={(e) => set("witness_nida", e.target.value)}
                className={inputCls()}
              />
            </div>
            <div>
              <label className={lbl}>{L(lang, "Simu", "Phone")}</label>
              <input
                value={vals.witness_phone}
                onChange={(e) => set("witness_phone", e.target.value)}
                className={inputCls()}
              />
            </div>
          </div>
          <SignaturePad
            value={vals.signature}
            onChange={(v) => set("signature", v || "")}
            lang={lang}
            label={L(lang, "Saini ya Mwombaji", "Applicant Signature")}
          />
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 flex gap-2">
            <AlertCircle size={13} className="text-amber-500 shrink-0 mt-0.5" />
            <p className="text-xs text-amber-700">
              {L(
                lang,
                "Ombi hili litawasilishwa kwa Baraza la Kijiji / Kata kwa kujadiliwa. Maamuzi yanaweza kuchukua wiki 2–4.",
                "This request will be submitted to the Village / Ward Council for deliberation. Decision may take 2–4 weeks.",
              )}
            </p>
          </div>
        </div>
      )}

      {/* ── PREVIEW ── */}
      {step === "preview" && (
        <div className="space-y-4">
          <div className={secHdr}>
            <p className="font-bold text-emerald-800 text-sm flex items-center gap-2">
              <Eye size={15} />
              {L(lang, "HAKIKI OMBI", "PREVIEW APPLICATION")}
            </p>
          </div>
          <p className="text-[10px] font-black text-stone-400 uppercase tracking-widest">
            {L(lang, "Mwombaji", "Applicant")}
          </p>
          <div className="bg-white border border-stone-200 rounded-xl divide-y divide-stone-100">
            {[
              ["Jina / Name", vals.applicant_name],
              ["NIDA", vals.applicant_nida],
              ["Simu / Phone", vals.applicant_phone],
              [
                "Anwani / Address",
                `${vals.applicant_ward}, ${vals.applicant_district}, ${vals.applicant_region}`,
              ],
            ].map(([k, v]) => (
              <div key={k} className="flex justify-between px-4 py-2.5 text-sm">
                <span className="text-stone-500">{k}</span>
                <span className="font-bold text-right max-w-[55%]">{v || "—"}</span>
              </div>
            ))}
          </div>
          <p className="text-[10px] font-black text-stone-400 uppercase tracking-widest">
            {L(lang, "Ardhi Inayoombwa", "Requested Land")}
          </p>
          <div className="bg-white border border-stone-200 rounded-xl divide-y divide-stone-100">
            {[
              [
                "Eneo / Location",
                `${vals.land_ward || vals.applicant_ward}, ${vals.land_district || vals.applicant_district}, ${vals.land_region || vals.applicant_region}`,
              ],
              ["Mtaa / Street", vals.land_street || "—"],
              ["Kiwanja / Plot", vals.land_plot_name || "—"],
              [
                "Aina / Tenure",
                LAND_TYPES.find((t) => t.value === vals.land_type)?.label?.split("(")[0] || "—",
              ],
              [
                "Ukubwa / Size",
                vals.land_size_manual ||
                  LAND_SIZES.find((s) => s.value === vals.land_size_category)?.label?.split(
                    "(",
                  )[0] ||
                  "—",
              ],
              ["Hali / Terrain", TERRAIN.find((t) => t.value === vals.terrain)?.label || "—"],
              ["Maji / Water", vals.water_access || "—"],
              ["Barabara / Road", vals.road_access || "—"],
            ].map(([k, v]) => (
              <div key={k} className="flex justify-between px-4 py-2.5 text-sm">
                <span className="text-stone-500">{k}</span>
                <span className="font-bold text-right max-w-[55%]">{v}</span>
              </div>
            ))}
          </div>
          <p className="text-[10px] font-black text-stone-400 uppercase tracking-widest">
            {L(lang, "Matumizi", "Purpose")}
          </p>
          <div className="bg-white border border-stone-200 rounded-xl divide-y divide-stone-100">
            {[
              [
                "Matumizi / Use",
                LAND_PURPOSE.find((p) => p.value === vals.land_purpose)?.label?.split("(")[0] ||
                  "—",
              ],
              ["Maelezo / Details", vals.business_description || "—"],
              ["Kuanza / Start", vals.expected_start || "—"],
            ].map(([k, v]) => (
              <div key={k} className="flex justify-between px-4 py-2.5 text-sm">
                <span className="text-stone-500">{k}</span>
                <span className="font-bold text-right max-w-[60%]">{v}</span>
              </div>
            ))}
          </div>
          <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 flex justify-between items-center">
            <span className="text-sm font-bold text-emerald-800">
              {L(lang, "Ada ya Ombi", "Application Fee")}
            </span>
            <span className="text-lg font-black text-emerald-700">
              TSh {SERVICE_FEE.toLocaleString()}
            </span>
          </div>
        </div>
      )}

      <div className="flex gap-3 pt-2">
        {stepIdx > 0 && (
          <button
            type="button"
            onClick={prev}
            className="flex items-center gap-2 px-4 py-3 border border-stone-200 rounded-xl font-bold text-stone-600 hover:bg-stone-50 transition-colors"
          >
            <ArrowLeft size={16} />
            {L(lang, "Rudi", "Back")}
          </button>
        )}
        {step !== "preview" ? (
          <button
            type="button"
            onClick={next}
            className="flex-1 flex items-center justify-center gap-2 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl transition-colors"
          >
            <ArrowRight size={16} />
            {L(lang, "Endelea", "Continue")}
          </button>
        ) : (
          <button
            type="button"
            onClick={handleSubmit}
            disabled={submitting || isLoading}
            className="flex-1 flex items-center justify-center gap-2 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl disabled:opacity-50 transition-colors"
          >
            {submitting ? <Loader2 size={16} className="animate-spin" /> : <FileText size={16} />}
            {L(lang, "Wasilisha Ombi", "Submit Application")}
          </button>
        )}
      </div>
    </div>
  );
};
export default OmbiArdhiKijijiForm;
