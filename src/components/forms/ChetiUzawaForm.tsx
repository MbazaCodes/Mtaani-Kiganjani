/**
 * Cheti cha Uzawa — Birth Certificate Application
 * Fee: TSh 3,000
 * Steps: Mzazi (auto-filled) → Mtoto → Ushahidi → Preview
 */
import React, { useState } from "react";
import {
  Loader2,
  CheckCircle2,
  ArrowLeft,
  ArrowRight,
  AlertCircle,
  FileText,
  Check,
  Eye,
  Baby,
  User,
  Upload,
  X,
} from "lucide-react";
import { FormProps } from "./types";
import { AddressFields } from "./AddressFields";
import { compressImage } from "@/lib/imageCompression";
import { ProgressFill } from "../ui/ProgressFill";
import { SignaturePad } from "@/components/ui/SignaturePad";

const SERVICE_FEE = 3000;
const L = (lang: string, sw: string, en: string) => (lang === "sw" ? sw : en);

const BIRTH_PLACES = [
  { value: "HOSPITALI", label: "Hospitali / Zahanati (Hospital / Clinic)" },
  { value: "NYUMBANI", label: "Nyumbani (Home Birth)" },
  { value: "NJIANI", label: "Njiani / Dharura (Emergency / Transit)" },
  { value: "NYINGINE", label: "Nyingine (Other)" },
];

const REASON_LATE = [
  { value: "HAKUJUA", label: "Hakujua utaratibu (Didn't know procedure)" },
  { value: "MBALI", label: "Umbali na ofisi (Distance from office)" },
  { value: "FEDHA", label: "Ukosefu wa fedha (Financial difficulties)" },
  { value: "NYINGINE", label: "Sababu nyingine (Other reason)" },
];

type Step = "mzazi" | "mtoto" | "ushahidi" | "preview";

interface FormVals {
  // Parent
  parent_name: string;
  parent_nida: string;
  parent_phone: string;
  parent_ward: string;
  parent_district: string;
  parent_region: string;
  parent_relationship: string;
  // Father
  father_name: string;
  father_nida: string;
  // Mother
  mother_name: string;
  mother_nida: string;
  // Child
  child_name: string;
  child_dob: string;
  child_sex: string;
  birth_place: string;
  birth_place_name: string;
  birth_place_district: string;
  birth_weight: string;
  // Registration
  reason_late: string;
  reason_late_other: string;
  witness_name: string;
  witness_nida: string;
  witness_phone: string;
  hospital_letter: string;
  signature: string;
}

export const ChetiUzawaForm: React.FC<FormProps> = ({
  onSubmit,
  isLoading,
  lang = "sw",
  userProfile,
}) => {
  const [step, setStep] = useState<Step>("mzazi");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [hospitalDoc, setHospitalDoc] = useState<string>("");

  const fullName =
    `${userProfile?.first_name || ""} ${userProfile?.middle_name || ""} ${userProfile?.last_name || ""}`.trim();
  const [vals, setVals] = useState<FormVals>({
    parent_name: fullName,
    parent_nida: userProfile?.nida_number || "",
    parent_phone: userProfile?.phone || "",
    parent_ward: userProfile?.ward || "",
    parent_district: userProfile?.district || "",
    parent_region: userProfile?.region || "",
    parent_relationship: "MAMA",
    father_name: "",
    father_nida: "",
    mother_name: userProfile?.sex === "F" ? fullName : "",
    mother_nida: userProfile?.sex === "F" ? userProfile?.nida_number || "" : "",
    child_name: "",
    child_dob: "",
    child_sex: "",
    birth_place: "",
    birth_place_name: "",
    birth_place_district: "",
    birth_weight: "",
    reason_late: "",
    reason_late_other: "",
    witness_name: "",
    witness_nida: "",
    witness_phone: "",
    hospital_letter: "",
    signature: "",
  });

  const set = (k: keyof FormVals, v: string) => setVals((p) => ({ ...p, [k]: v }));
  const clrErr = (k: string) =>
    setErrors((p) => {
      const n = { ...p };
      delete n[k];
      return n;
    });

  const STEPS: { key: Step; sw: string; en: string }[] = [
    { key: "mzazi", sw: "Mzazi", en: "Parent" },
    { key: "mtoto", sw: "Mtoto", en: "Child" },
    { key: "ushahidi", sw: "Ushahidi", en: "Evidence" },
    { key: "preview", sw: "Hakiki", en: "Preview" },
  ];
  const stepIdx = STEPS.findIndex((s) => s.key === step);

  const validate = (): boolean => {
    const e: Record<string, string> = {};
    if (step === "mzazi") {
      if (!vals.parent_name.trim()) e.parent_name = L(lang, "Jina linahitajika", "Name required");
      if (!vals.parent_nida.trim()) e.parent_nida = L(lang, "NIDA inahitajika", "NIDA required");
      if (!vals.parent_phone.trim()) e.parent_phone = L(lang, "Simu inahitajika", "Phone required");
      if (!vals.mother_name.trim())
        e.mother_name = L(lang, "Jina la mama linahitajika", "Mother's name required");
      if (!vals.father_name.trim())
        e.father_name = L(lang, "Jina la baba linahitajika", "Father's name required");
    }
    if (step === "mtoto") {
      if (!vals.child_name.trim())
        e.child_name = L(lang, "Jina la mtoto linahitajika", "Child's name required");
      if (!vals.child_dob)
        e.child_dob = L(lang, "Tarehe ya kuzaliwa inahitajika", "Date of birth required");
      if (!vals.child_sex) e.child_sex = L(lang, "Jinsia inahitajika", "Sex required");
      if (!vals.birth_place)
        e.birth_place = L(lang, "Mahali pa kuzaliwa inahitajika", "Birth place required");
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
    compressImage(file).then((c) => setHospitalDoc(c));
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      await onSubmit({
        ...vals,
        hospital_letter: hospitalDoc,
        service_fee: SERVICE_FEE,
        total_fee: SERVICE_FEE,
      });
      setSubmitted(true);
    } finally {
      setSubmitting(false);
    }
  };

  const inputCls = (k?: string) =>
    `w-full px-4 py-3 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 ${k && errors[k] ? "border-red-400 bg-red-50" : "border-stone-200 bg-white"}`;
  const lbl = "block text-xs font-bold text-stone-600 uppercase tracking-wider mb-1.5";
  const secHdr = "bg-emerald-50 border border-emerald-100 rounded-xl px-4 py-3 mb-4";

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
            "Cheti cha uzawa kitashughulikiwa na ofisi ya mtaa na kupelekwa RITA.",
            "Birth certificate will be processed by the ward office and forwarded to RITA.",
          )}
        </p>
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

      {step === "mzazi" && (
        <div className="space-y-4">
          <div className={secHdr}>
            <p className="font-bold text-emerald-800 text-sm flex items-center gap-2">
              <User size={15} />
              {L(lang, "TAARIFA ZA WAZAZI", "PARENTS INFORMATION")}
            </p>
            <p className="text-xs text-emerald-600 mt-1">
              {L(
                lang,
                "Taarifa zimejazwa kutoka kwenye profaili yako",
                "Pre-filled from your profile",
              )}
            </p>
          </div>
          <p className="text-xs font-black text-stone-400 uppercase tracking-widest">
            {L(lang, "Mwasiliana (Wewe)", "Contact Person (You)")}
          </p>
          <div>
            <label className={lbl}>{L(lang, "Jina Lako *", "Your Full Name *")}</label>
            <input
              value={vals.parent_name}
              onChange={(e) => {
                set("parent_name", e.target.value);
                clrErr("parent_name");
              }}
              className={inputCls("parent_name")}
            />
          </div>
          {errors.parent_name && (
            <p className="text-red-500 text-xs flex items-center gap-1">
              <AlertCircle size={11} />
              {errors.parent_name}
            </p>
          )}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className={lbl}>NIDA *</label>
              <input
                value={vals.parent_nida}
                onChange={(e) => {
                  set("parent_nida", e.target.value);
                  clrErr("parent_nida");
                }}
                className={inputCls("parent_nida")}
              />
            </div>
            <div>
              <label className={lbl}>{L(lang, "Simu *", "Phone *")}</label>
              <input
                value={vals.parent_phone}
                onChange={(e) => {
                  set("parent_phone", e.target.value);
                  clrErr("parent_phone");
                }}
                className={inputCls("parent_phone")}
              />
            </div>
          </div>
          <div>
            <label className={lbl}>
              {L(lang, "Uhusiano na Mtoto *", "Relationship to Child *")}
            </label>
            <select
              value={vals.parent_relationship}
              onChange={(e) => set("parent_relationship", e.target.value)}
              className={inputCls()}
            >
              <option value="MAMA">{L(lang, "Mama (Mother)", "Mother")}</option>
              <option value="BABA">{L(lang, "Baba (Father)", "Father")}</option>
              <option value="MLEZI">
                {L(lang, "Mlezi / Ndugu (Guardian / Relative)", "Guardian / Relative")}
              </option>
            </select>
          </div>
          <AddressFields
            lang={lang === "sw" ? "sw" : "en"}
            region={vals.parent_region}
            district={vals.parent_district}
            ward={vals.parent_ward}
            onRegion={(v) => {
              set("parent_region", v);
              set("parent_district", "");
              set("parent_ward", "");
            }}
            onDistrict={(v) => {
              set("parent_district", v);
              set("parent_ward", "");
            }}
            onWard={(v) => set("parent_ward", v)}
            errors={errors}
            clearError={clrErr}
            fieldPrefix="parent"
            autofillFrom={userProfile}
          />
          <p className="text-xs font-black text-stone-400 uppercase tracking-widest pt-2">
            {L(lang, "Baba wa Mtoto", "Father")}
          </p>
          <div>
            <label className={lbl}>
              {L(lang, "Jina Kamili la Baba *", "Father's Full Name *")}
            </label>
            <input
              value={vals.father_name}
              onChange={(e) => {
                set("father_name", e.target.value);
                clrErr("father_name");
              }}
              className={inputCls("father_name")}
            />
          </div>
          {errors.father_name && (
            <p className="text-red-500 text-xs flex items-center gap-1">
              <AlertCircle size={11} />
              {errors.father_name}
            </p>
          )}
          <div>
            <label className={lbl}>{L(lang, "NIDA ya Baba", "Father's NIDA")}</label>
            <input
              value={vals.father_nida}
              onChange={(e) => set("father_nida", e.target.value)}
              className={inputCls()}
            />
          </div>
          <p className="text-xs font-black text-stone-400 uppercase tracking-widest pt-2">
            {L(lang, "Mama wa Mtoto", "Mother")}
          </p>
          <div>
            <label className={lbl}>
              {L(lang, "Jina Kamili la Mama *", "Mother's Full Name *")}
            </label>
            <input
              value={vals.mother_name}
              onChange={(e) => {
                set("mother_name", e.target.value);
                clrErr("mother_name");
              }}
              className={inputCls("mother_name")}
            />
          </div>
          {errors.mother_name && (
            <p className="text-red-500 text-xs flex items-center gap-1">
              <AlertCircle size={11} />
              {errors.mother_name}
            </p>
          )}
          <div>
            <label className={lbl}>{L(lang, "NIDA ya Mama", "Mother's NIDA")}</label>
            <input
              value={vals.mother_nida}
              onChange={(e) => set("mother_nida", e.target.value)}
              className={inputCls()}
            />
          </div>
        </div>
      )}

      {step === "mtoto" && (
        <div className="space-y-4">
          <div className={secHdr}>
            <p className="font-bold text-emerald-800 text-sm flex items-center gap-2">
              <Baby size={15} />
              {L(lang, "TAARIFA ZA MTOTO", "CHILD INFORMATION")}
            </p>
          </div>
          <div>
            <label className={lbl}>
              {L(lang, "Jina Kamili la Mtoto *", "Child's Full Name *")}
            </label>
            <input
              value={vals.child_name}
              onChange={(e) => {
                set("child_name", e.target.value);
                clrErr("child_name");
              }}
              className={inputCls("child_name")}
              placeholder={L(
                lang,
                "Jina la kwanza, la kati na la mwisho",
                "First, middle and last name",
              )}
            />
          </div>
          {errors.child_name && (
            <p className="text-red-500 text-xs flex items-center gap-1">
              <AlertCircle size={11} />
              {errors.child_name}
            </p>
          )}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className={lbl}>{L(lang, "Tarehe ya Kuzaliwa *", "Date of Birth *")}</label>
              <input
                type="date"
                value={vals.child_dob}
                onChange={(e) => {
                  set("child_dob", e.target.value);
                  clrErr("child_dob");
                }}
                className={inputCls("child_dob")}
              />
            </div>
            <div>
              <label className={lbl}>{L(lang, "Jinsia *", "Sex *")}</label>
              <select
                value={vals.child_sex}
                onChange={(e) => {
                  set("child_sex", e.target.value);
                  clrErr("child_sex");
                }}
                className={inputCls("child_sex")}
              >
                <option value="">{L(lang, "-- Chagua --", "-- Select --")}</option>
                <option value="M">{L(lang, "Mvulana (Male)", "Male")}</option>
                <option value="F">{L(lang, "Msichana (Female)", "Female")}</option>
              </select>
            </div>
          </div>
          <div>
            <label className={lbl}>{L(lang, "Mahali pa Kuzaliwa *", "Place of Birth *")}</label>
            <select
              value={vals.birth_place}
              onChange={(e) => {
                set("birth_place", e.target.value);
                clrErr("birth_place");
              }}
              className={inputCls("birth_place")}
            >
              <option value="">{L(lang, "-- Chagua --", "-- Select --")}</option>
              {BIRTH_PLACES.map((p) => (
                <option key={p.value} value={p.value}>
                  {p.label}
                </option>
              ))}
            </select>
          </div>
          {errors.birth_place && (
            <p className="text-red-500 text-xs flex items-center gap-1">
              <AlertCircle size={11} />
              {errors.birth_place}
            </p>
          )}
          <div>
            <label className={lbl}>
              {L(lang, "Jina la Hospitali / Mahali Halisi", "Hospital Name / Exact Location")}
            </label>
            <input
              value={vals.birth_place_name}
              onChange={(e) => set("birth_place_name", e.target.value)}
              className={inputCls()}
              placeholder={L(
                lang,
                "Mfano: Hospitali ya Muhimbili, Dar es Salaam",
                "E.g. Muhimbili Hospital, Dar es Salaam",
              )}
            />
          </div>
          <div>
            <label className={lbl}>
              {L(lang, "Uzito wa Mtoto Wakati wa Kuzaliwa (kg)", "Birth Weight (kg)")}
            </label>
            <input
              type="number"
              step="0.1"
              min="0.5"
              max="8"
              value={vals.birth_weight}
              onChange={(e) => set("birth_weight", e.target.value)}
              className={inputCls()}
              placeholder="3.2"
            />
          </div>
        </div>
      )}

      {step === "ushahidi" && (
        <div className="space-y-4">
          <div className={secHdr}>
            <p className="font-bold text-emerald-800 text-sm">
              {L(lang, "USHAHIDI NA SHAHIDI", "EVIDENCE & WITNESS")}
            </p>
          </div>
          {vals.birth_place === "HOSPITALI" && (
            <div className="space-y-2">
              <label className={lbl}>
                {L(
                  lang,
                  "Barua ya Hospitali / Kadi ya Kuzaliwa (Hiari)",
                  "Hospital Letter / Birth Card (Optional)",
                )}
              </label>
              {hospitalDoc ? (
                <div className="flex items-center gap-3 p-3 bg-stone-50 border border-stone-200 rounded-xl">
                  <FileText size={20} className="text-emerald-600" />
                  <span className="text-sm font-bold text-stone-700 flex-1">
                    {L(lang, "Hati imepakiwa", "Document uploaded")}
                  </span>
                  <button
                    type="button"
                    onClick={() => setHospitalDoc("")}
                    className="text-red-400 hover:text-red-600"
                  >
                    <X size={16} />
                  </button>
                </div>
              ) : (
                <label className="flex flex-col items-center justify-center h-28 border-2 border-dashed border-stone-300 rounded-xl cursor-pointer hover:border-emerald-400 hover:bg-emerald-50/30 transition-all">
                  <Upload size={20} className="text-stone-400 mb-1" />
                  <span className="text-xs text-stone-400">
                    {L(
                      lang,
                      "Pakia barua ya hospitali au kadi ya kuzaliwa",
                      "Upload hospital letter or birth card",
                    )}
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
          )}
          {/* Late registration reason */}
          {(() => {
            const dob = new Date(vals.child_dob);
            const now = new Date();
            const monthsOld =
              (now.getFullYear() - dob.getFullYear()) * 12 + (now.getMonth() - dob.getMonth());
            return monthsOld > 3;
          })() && (
            <div className="space-y-2">
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 flex gap-2">
                <AlertCircle size={13} className="text-amber-500 shrink-0 mt-0.5" />
                <p className="text-xs text-amber-700">
                  {L(
                    lang,
                    "Usajili wa mtoto unafanywa zaidi ya miezi 3 — toa sababu ya kuchelewa.",
                    "Registration is being done more than 3 months after birth — provide reason for delay.",
                  )}
                </p>
              </div>
              <div>
                <label className={lbl}>
                  {L(lang, "Sababu ya Kuchelewa *", "Reason for Late Registration *")}
                </label>
                <select
                  value={vals.reason_late}
                  onChange={(e) => set("reason_late", e.target.value)}
                  className={inputCls()}
                >
                  <option value="">{L(lang, "-- Chagua sababu --", "-- Select reason --")}</option>
                  {REASON_LATE.map((r) => (
                    <option key={r.value} value={r.value}>
                      {r.label}
                    </option>
                  ))}
                </select>
              </div>
              {vals.reason_late === "NYINGINE" && (
                <div>
                  <label className={lbl}>{L(lang, "Eleza", "Explain")}</label>
                  <textarea
                    value={vals.reason_late_other}
                    onChange={(e) => set("reason_late_other", e.target.value)}
                    rows={2}
                    className={`${inputCls()} resize-none`}
                  />
                </div>
              )}
            </div>
          )}
          <p className="text-xs font-black text-stone-400 uppercase tracking-widest pt-2">
            {L(lang, "Shahidi (Jirani / Mzazi Mwingine)", "Witness (Neighbour / Other Parent)")}
          </p>
          <div>
            <label className={lbl}>{L(lang, "Jina la Shahidi", "Witness Name")}</label>
            <input
              value={vals.witness_name}
              onChange={(e) => set("witness_name", e.target.value)}
              className={inputCls()}
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className={lbl}>{L(lang, "NIDA ya Shahidi", "Witness NIDA")}</label>
              <input
                value={vals.witness_nida}
                onChange={(e) => set("witness_nida", e.target.value)}
                className={inputCls()}
              />
            </div>
            <div>
              <label className={lbl}>{L(lang, "Simu ya Shahidi", "Witness Phone")}</label>
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
            label={L(lang, "Saini ya Mzazi / Mlezi", "Parent / Guardian Signature")}
          />
        </div>
      )}

      {step === "preview" && (
        <div className="space-y-4">
          <div className={secHdr}>
            <p className="font-bold text-emerald-800 text-sm flex items-center gap-2">
              <Eye size={15} />
              {L(lang, "HAKIKI TAARIFA", "PREVIEW")}
            </p>
          </div>
          <div className="bg-white border border-stone-200 rounded-xl divide-y divide-stone-100">
            {[
              ["Mtoto / Child", vals.child_name],
              ["Tarehe ya Kuzaliwa / DOB", vals.child_dob],
              ["Jinsia / Sex", vals.child_sex === "M" ? "Mvulana / Male" : "Msichana / Female"],
              ["Mahali / Birth Place", vals.birth_place_name || vals.birth_place],
              ["Baba / Father", vals.father_name],
              ["Mama / Mother", vals.mother_name],
              ["Mwasiliana / Contact", vals.parent_name],
              ["Simu / Phone", vals.parent_phone],
              ["Ada / Fee", `TSh ${SERVICE_FEE.toLocaleString()}`],
            ].map(([k, v]) => (
              <div key={k} className="flex justify-between px-4 py-2.5 text-sm">
                <span className="text-stone-500">{k}</span>
                <span className="font-bold text-right max-w-[55%]">{v || "—"}</span>
              </div>
            ))}
          </div>
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 text-xs text-blue-700">
            {L(
              lang,
              "Ombi hili litapelekwa RITA kwa usajili rasmi wa cheti cha uzawa.",
              "This application will be forwarded to RITA for official birth certificate registration.",
            )}
          </div>
        </div>
      )}

      <div className="flex gap-3 pt-2">
        {stepIdx > 0 && (
          <button
            type="button"
            onClick={prev}
            className="flex items-center gap-2 px-4 py-3 border border-stone-200 rounded-xl font-bold text-stone-600 hover:bg-stone-50"
          >
            <ArrowLeft size={16} />
            {L(lang, "Rudi", "Back")}
          </button>
        )}
        {step !== "preview" ? (
          <button
            type="button"
            onClick={next}
            className="flex-1 flex items-center justify-center gap-2 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl"
          >
            <ArrowRight size={16} />
            {L(lang, "Endelea", "Continue")}
          </button>
        ) : (
          <button
            type="button"
            onClick={handleSubmit}
            disabled={submitting || isLoading}
            className="flex-1 flex items-center justify-center gap-2 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl disabled:opacity-50"
          >
            {submitting ? <Loader2 size={16} className="animate-spin" /> : <FileText size={16} />}
            {L(lang, "Wasilisha Ombi", "Submit Application")}
          </button>
        )}
      </div>
    </div>
  );
};
export default ChetiUzawaForm;
