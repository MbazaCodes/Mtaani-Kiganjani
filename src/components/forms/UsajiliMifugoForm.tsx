/**
 * Usajili wa Mifugo — Livestock Registration
 * Fee: TSh 3,000
 * Steps: Mmiliki (auto-filled) → Mifugo (category, type, quantity, health) → Picha → Preview
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
  Upload,
  X,
  Heart,
} from "lucide-react";
import { FormProps } from "./types";
import { ProgressFill } from "../ui/ProgressFill";
import { SignaturePad } from "@/components/ui/SignaturePad";

const SERVICE_FEE = 3000;
const L = (lang: string, sw: string, en: string) => (lang === "sw" ? sw : en);

const LIVESTOCK_CATEGORIES = [
  { value: "NG_OMBE", label: "Ng'ombe (Cattle)" },
  { value: "MBUZI", label: "Mbuzi (Goats)" },
  { value: "KONDOO", label: "Kondoo (Sheep)" },
  { value: "NGURUWE", label: "Nguruwe (Pigs)" },
  { value: "KUKU", label: "Kuku (Poultry / Chickens)" },
  { value: "BATA", label: "Bata (Ducks)" },
  { value: "SUNGURA", label: "Sungura (Rabbits)" },
  { value: "NYUKI", label: "Nyuki (Bees)" },
  { value: "SAMAKI", label: "Samaki (Fish - Aquaculture)" },
  { value: "NYINGINE", label: "Nyingine (Other)" },
];

const HEALTH_STATUS = [
  { value: "NZURI", label: "Nzuri — Hana ugonjwa wowote (Healthy)" },
  { value: "CHANJO", label: "Amepata chanjo (Vaccinated)" },
  { value: "UGONJWA", label: "Ana ugonjwa / Dalili (Sick / Symptoms)" },
  { value: "KARANTINI", label: "Anakagua daktari (Under veterinary care)" },
];

const PURPOSE = [
  { value: "NYUMBANI", label: "Matumizi ya Nyumbani (Home use)" },
  { value: "BIASHARA", label: "Biashara (Commercial)" },
  { value: "MAZIWA", label: "Mazao — Maziwa / Mayai (Dairy / Eggs)" },
  { value: "DAMU", label: "Damu / Nyama (Meat)" },
  { value: "KAZI", label: "Kazi — Kilimo / Usafiri (Work)" },
];

type Step = "mmiliki" | "mifugo" | "afya" | "picha" | "preview";

interface MifugoEntry {
  category: string;
  quantity: string;
  breed: string;
  purpose: string;
  health_status: string;
  health_notes: string;
  photo: string;
}

interface FormVals {
  owner_name: string;
  owner_nida: string;
  owner_phone: string;
  owner_ward: string;
  owner_street: string;
  owner_district: string;
  location_description: string;
  mifugo: MifugoEntry[];
  identification_marks: string;
  signature: string;
}

const emptyMifugo = (): MifugoEntry => ({
  category: "",
  quantity: "1",
  breed: "",
  purpose: "",
  health_status: "",
  health_notes: "",
  photo: "",
});

export const UsajiliMifugoForm: React.FC<FormProps> = ({
  onSubmit,
  isLoading,
  lang = "sw",
  userProfile,
}) => {
  const [step, setStep] = useState<Step>("mmiliki");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [vals, setVals] = useState<FormVals>({
    owner_name:
      `${userProfile?.first_name || ""} ${userProfile?.middle_name || ""} ${userProfile?.last_name || ""}`.trim(),
    owner_nida: userProfile?.nida_number || "",
    owner_phone: userProfile?.phone || "",
    owner_ward: userProfile?.ward || "",
    owner_street: userProfile?.street || "",
    owner_district: userProfile?.district || "",
    location_description: "",
    mifugo: [emptyMifugo()],
    identification_marks: "",
    signature: "",
  });

  const set = (k: keyof FormVals, v: string) => setVals((p) => ({ ...p, [k]: v }));
  const setMifugo = (i: number, k: keyof MifugoEntry, v: string) =>
    setVals((p) => {
      const m = [...p.mifugo];
      m[i] = { ...m[i], [k]: v };
      return { ...p, mifugo: m };
    });
  const addMifugo = () => setVals((p) => ({ ...p, mifugo: [...p.mifugo, emptyMifugo()] }));
  const removeMifugo = (i: number) =>
    setVals((p) => ({ ...p, mifugo: p.mifugo.filter((_, idx) => idx !== i) }));

  const STEPS: { key: Step; sw: string; en: string }[] = [
    { key: "mmiliki", sw: "Mmiliki", en: "Owner" },
    { key: "mifugo", sw: "Mifugo", en: "Livestock" },
    { key: "afya", sw: "Afya", en: "Health" },
    { key: "picha", sw: "Picha", en: "Photos" },
    { key: "preview", sw: "Hakiki", en: "Preview" },
  ];
  const stepIdx = STEPS.findIndex((s) => s.key === step);

  const validate = (): boolean => {
    const e: Record<string, string> = {};
    if (step === "mmiliki") {
      if (!vals.owner_name.trim()) e.owner_name = L(lang, "Jina linahitajika", "Name required");
      if (!vals.owner_nida.trim()) e.owner_nida = L(lang, "NIDA inahitajika", "NIDA required");
      if (!vals.owner_phone.trim()) e.owner_phone = L(lang, "Simu inahitajika", "Phone required");
    }
    if (step === "mifugo") {
      vals.mifugo.forEach((m, i) => {
        if (!m.category) e[`cat_${i}`] = L(lang, "Chagua aina ya mnyama", "Select animal type");
        if (!m.quantity || Number(m.quantity) < 1)
          e[`qty_${i}`] = L(lang, "Idadi inahitajika", "Quantity required");
        if (!m.purpose) e[`purpose_${i}`] = L(lang, "Chagua madhumuni", "Select purpose");
      });
    }
    if (step === "afya") {
      vals.mifugo.forEach((m, i) => {
        if (!m.health_status)
          e[`health_${i}`] = L(lang, "Hali ya afya inahitajika", "Health status required");
      });
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

  const handlePhotoUpload = (i: number, file: File) => {
    const reader = new FileReader();
    reader.onload = () => setMifugo(i, "photo", reader.result as string);
    reader.readAsDataURL(file);
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      await onSubmit({
        ...vals,
        service_fee: SERVICE_FEE,
        total_fee: SERVICE_FEE,
        mifugo: JSON.stringify(vals.mifugo),
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

  if (submitted)
    return (
      <div className="text-center py-10 space-y-4">
        <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto">
          <CheckCircle2 size={32} className="text-emerald-600" />
        </div>
        <h3 className="text-xl font-black">
          {L(lang, "Usajili Umefanikiwa!", "Registration Successful!")}
        </h3>
        <p className="text-stone-500 text-sm">
          {L(
            lang,
            "Mifugo yako imesajiliwa. Cheti kitatolewa baada ya ukaguzi.",
            "Your livestock has been registered. Certificate will be issued after inspection.",
          )}
        </p>
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 max-w-xs mx-auto">
          <p className="font-bold text-emerald-700 text-sm">
            Ada: TSh {SERVICE_FEE.toLocaleString()}
          </p>
          <p className="text-xs text-emerald-600 mt-1">
            {L(
              lang,
              `Mifugo ${vals.mifugo.length} aina iliyosajiliwa`,
              `${vals.mifugo.length} livestock type(s) registered`,
            )}
          </p>
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

      {/* STEP 1: Owner — auto-filled from profile */}
      {step === "mmiliki" && (
        <div className="space-y-4">
          <div className={secHdr}>
            <p className="font-bold text-emerald-800 text-sm">
              {L(lang, "TAARIFA ZA MMILIKI WA MIFUGO", "LIVESTOCK OWNER INFORMATION")}
            </p>
            <p className="text-xs text-emerald-600 mt-1">
              {L(
                lang,
                "Taarifa zimejazwa kutoka kwenye profaili yako",
                "Details pre-filled from your profile",
              )}
            </p>
          </div>
          <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 flex items-center gap-2 text-xs text-emerald-700">
            <Check size={13} className="shrink-0" />
            {L(lang, "Rekebisha ikiwa taarifa si sahihi", "Edit if details are incorrect")}
          </div>
          <div>
            <label className={lbl}>{L(lang, "Jina Kamili *", "Full Name *")}</label>
            <input
              value={vals.owner_name}
              onChange={(e) => set("owner_name", e.target.value)}
              className={inputCls("owner_name")}
            />
          </div>
          {errors.owner_name && (
            <p className="text-red-500 text-xs flex items-center gap-1">
              <AlertCircle size={11} />
              {errors.owner_name}
            </p>
          )}
          <div>
            <label className={lbl}>{L(lang, "Namba ya NIDA *", "NIDA Number *")}</label>
            <input
              value={vals.owner_nida}
              onChange={(e) => set("owner_nida", e.target.value)}
              className={inputCls("owner_nida")}
              placeholder="20XXXXXXXXXXXXXXXXX"
            />
          </div>
          {errors.owner_nida && (
            <p className="text-red-500 text-xs flex items-center gap-1">
              <AlertCircle size={11} />
              {errors.owner_nida}
            </p>
          )}
          <div>
            <label className={lbl}>{L(lang, "Namba ya Simu *", "Phone Number *")}</label>
            <input
              value={vals.owner_phone}
              onChange={(e) => set("owner_phone", e.target.value)}
              className={inputCls("owner_phone")}
              placeholder="+255 7XX XXX XXX"
            />
          </div>
          {errors.owner_phone && (
            <p className="text-red-500 text-xs flex items-center gap-1">
              <AlertCircle size={11} />
              {errors.owner_phone}
            </p>
          )}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className={lbl}>{L(lang, "Kata", "Ward")}</label>
              <input
                value={vals.owner_ward}
                onChange={(e) => set("owner_ward", e.target.value)}
                className={inputCls()}
              />
            </div>
            <div>
              <label className={lbl}>{L(lang, "Wilaya", "District")}</label>
              <input
                value={vals.owner_district}
                onChange={(e) => set("owner_district", e.target.value)}
                className={inputCls()}
              />
            </div>
          </div>
          <div>
            <label className={lbl}>
              {L(lang, "Mahali Mifugo Ilipo (Boma/Shamba)", "Livestock Location (Pen/Farm)")}
            </label>
            <input
              value={vals.location_description}
              onChange={(e) => set("location_description", e.target.value)}
              className={inputCls()}
              placeholder={L(
                lang,
                "Mfano: Boma la Amina, Mtaa wa Mji Mpya",
                "E.g. Amina's farm, Mji Mpya Street",
              )}
            />
          </div>
        </div>
      )}

      {/* STEP 2: Livestock details */}
      {step === "mifugo" && (
        <div className="space-y-5">
          <div className={secHdr}>
            <p className="font-bold text-emerald-800 text-sm">
              {L(lang, "AINA NA IDADI YA MIFUGO", "LIVESTOCK TYPES & QUANTITIES")}
            </p>
          </div>
          {vals.mifugo.map((m, i) => (
            <div key={i} className="border border-stone-200 rounded-2xl p-4 space-y-3 relative">
              <div className="flex items-center justify-between">
                <p className="text-xs font-black text-emerald-700 uppercase tracking-wide">
                  {L(lang, `Mnyama #${i + 1}`, `Animal #${i + 1}`)}
                </p>
                {vals.mifugo.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeMifugo(i)}
                    className="p-1 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                  >
                    <X size={14} />
                  </button>
                )}
              </div>
              <div>
                <label className={lbl}>{L(lang, "Aina ya Mnyama *", "Animal Type *")}</label>
                <select
                  value={m.category}
                  onChange={(e) => setMifugo(i, "category", e.target.value)}
                  className={inputCls(`cat_${i}`)}
                >
                  <option value="">{L(lang, "-- Chagua mnyama --", "-- Select animal --")}</option>
                  {LIVESTOCK_CATEGORIES.map((c) => (
                    <option key={c.value} value={c.value}>
                      {c.label}
                    </option>
                  ))}
                </select>
              </div>
              {errors[`cat_${i}`] && (
                <p className="text-red-500 text-xs flex items-center gap-1">
                  <AlertCircle size={11} />
                  {errors[`cat_${i}`]}
                </p>
              )}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={lbl}>{L(lang, "Idadi *", "Quantity *")}</label>
                  <input
                    type="number"
                    min="1"
                    value={m.quantity}
                    onChange={(e) => setMifugo(i, "quantity", e.target.value)}
                    className={inputCls(`qty_${i}`)}
                  />
                </div>
                <div>
                  <label className={lbl}>{L(lang, "Uzao / Mbari", "Breed / Variety")}</label>
                  <input
                    value={m.breed}
                    onChange={(e) => setMifugo(i, "breed", e.target.value)}
                    className={inputCls()}
                    placeholder={L(lang, "Mfano: Friesian, Local", "E.g. Friesian, Local")}
                  />
                </div>
              </div>
              {errors[`qty_${i}`] && (
                <p className="text-red-500 text-xs flex items-center gap-1">
                  <AlertCircle size={11} />
                  {errors[`qty_${i}`]}
                </p>
              )}
              <div>
                <label className={lbl}>{L(lang, "Madhumuni *", "Purpose *")}</label>
                <select
                  value={m.purpose}
                  onChange={(e) => setMifugo(i, "purpose", e.target.value)}
                  className={inputCls(`purpose_${i}`)}
                >
                  <option value="">
                    {L(lang, "-- Chagua madhumuni --", "-- Select purpose --")}
                  </option>
                  {PURPOSE.map((p) => (
                    <option key={p.value} value={p.value}>
                      {p.label}
                    </option>
                  ))}
                </select>
              </div>
              {errors[`purpose_${i}`] && (
                <p className="text-red-500 text-xs flex items-center gap-1">
                  <AlertCircle size={11} />
                  {errors[`purpose_${i}`]}
                </p>
              )}
            </div>
          ))}
          <button
            type="button"
            onClick={addMifugo}
            className="w-full py-2.5 border-2 border-dashed border-emerald-300 rounded-xl text-sm font-bold text-emerald-600 hover:bg-emerald-50 transition-colors"
          >
            + {L(lang, "Ongeza Aina Nyingine ya Mnyama", "Add Another Animal Type")}
          </button>
          <div>
            <label className={lbl}>
              {L(
                lang,
                "Alama za Utambuzi (Rangi, Nywele, Alama)",
                "Identification Marks (Color, Markings)",
              )}
            </label>
            <textarea
              value={vals.identification_marks}
              onChange={(e) => set("identification_marks", e.target.value)}
              rows={2}
              className={`${inputCls()} resize-none`}
              placeholder={L(
                lang,
                "Mfano: Ng'ombe rangi nyekundu, pembe moja iliyovunjika",
                "E.g. Red cow, one broken horn",
              )}
            />
          </div>
        </div>
      )}

      {/* STEP 3: Health status per animal */}
      {step === "afya" && (
        <div className="space-y-5">
          <div className={secHdr}>
            <p className="font-bold text-emerald-800 text-sm flex items-center gap-2">
              <Heart size={15} />
              {L(lang, "HALI YA AFYA YA MIFUGO", "LIVESTOCK HEALTH STATUS")}
            </p>
          </div>
          {vals.mifugo.map((m, i) => (
            <div key={i} className="border border-stone-100 rounded-2xl p-4 space-y-3 bg-stone-50">
              <p className="text-xs font-black text-stone-600">
                {LIVESTOCK_CATEGORIES.find((c) => c.value === m.category)?.label ||
                  `Mnyama #${i + 1}`}{" "}
                — {m.quantity} {L(lang, "jumla", "total")}
              </p>
              <div>
                <label className={lbl}>{L(lang, "Hali ya Afya *", "Health Status *")}</label>
                <select
                  value={m.health_status}
                  onChange={(e) => setMifugo(i, "health_status", e.target.value)}
                  className={inputCls(`health_${i}`)}
                >
                  <option value="">{L(lang, "-- Chagua hali --", "-- Select status --")}</option>
                  {HEALTH_STATUS.map((h) => (
                    <option key={h.value} value={h.value}>
                      {h.label}
                    </option>
                  ))}
                </select>
              </div>
              {errors[`health_${i}`] && (
                <p className="text-red-500 text-xs flex items-center gap-1">
                  <AlertCircle size={11} />
                  {errors[`health_${i}`]}
                </p>
              )}
              {m.health_status === "UGONJWA" && (
                <div>
                  <label className={lbl}>
                    {L(lang, "Eleza Dalili za Ugonjwa", "Describe Symptoms / Disease")}
                  </label>
                  <textarea
                    value={m.health_notes}
                    onChange={(e) => setMifugo(i, "health_notes", e.target.value)}
                    rows={2}
                    className={`${inputCls()} resize-none`}
                    placeholder={L(lang, "Dalili, muda wa ugonjwa...", "Symptoms, duration...")}
                  />
                </div>
              )}
              {m.health_status === "UGONJWA" && (
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 flex gap-2">
                  <AlertCircle size={13} className="text-amber-500 shrink-0 mt-0.5" />
                  <p className="text-xs text-amber-700">
                    {L(
                      lang,
                      "Mifugo wenye magonjwa itahitaji kukaguliwa na daktari wa mifugo kabla ya kusajiliwa.",
                      "Sick livestock will require veterinary inspection before registration.",
                    )}
                  </p>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* STEP 4: Photos */}
      {step === "picha" && (
        <div className="space-y-5">
          <div className={secHdr}>
            <p className="font-bold text-emerald-800 text-sm">
              {L(lang, "PICHA ZA MIFUGO (HIARI)", "LIVESTOCK PHOTOS (OPTIONAL)")}
            </p>
            <p className="text-xs text-emerald-600 mt-1">
              {L(
                lang,
                "Picha husaidia kutambua mifugo yako.",
                "Photos help identify your livestock.",
              )}
            </p>
          </div>
          {vals.mifugo.map((m, i) => (
            <div key={i} className="space-y-2">
              <p className="text-xs font-black text-stone-600">
                {LIVESTOCK_CATEGORIES.find((c) => c.value === m.category)?.label ||
                  `Mnyama #${i + 1}`}
              </p>
              {m.photo ? (
                <div className="relative">
                  <img
                    src={m.photo}
                    alt={`mifugo-${i}`}
                    className="w-full h-40 object-cover rounded-xl border border-stone-200"
                  />
                  <button
                    type="button"
                    onClick={() => setMifugo(i, "photo", "")}
                    className="absolute top-2 right-2 w-7 h-7 bg-red-500 text-white rounded-full flex items-center justify-center"
                  >
                    <X size={12} />
                  </button>
                </div>
              ) : (
                <label className="flex flex-col items-center justify-center h-32 border-2 border-dashed border-stone-300 rounded-xl cursor-pointer hover:border-emerald-400 hover:bg-emerald-50/30 transition-all">
                  <Upload size={20} className="text-stone-400 mb-1" />
                  <span className="text-xs text-stone-400 font-medium">
                    {L(lang, "Pakia picha ya mnyama huyu", "Upload photo of this animal")}
                  </span>
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    className="hidden"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) handlePhotoUpload(i, f);
                      e.target.value = "";
                    }}
                  />
                </label>
              )}
            </div>
          ))}
          <SignaturePad
            value={vals.signature}
            onChange={(v) => set("signature", v || "")}
            lang={lang}
            label={L(lang, "Saini ya Mmiliki", "Owner Signature")}
          />
        </div>
      )}

      {/* STEP 5: Preview */}
      {step === "preview" && (
        <div className="space-y-4">
          <div className={secHdr}>
            <p className="font-bold text-emerald-800 text-sm flex items-center gap-2">
              <Eye size={15} />
              {L(lang, "HAKIKI TAARIFA", "PREVIEW & CONFIRM")}
            </p>
          </div>
          <div className="bg-white border border-stone-200 rounded-xl divide-y divide-stone-100">
            {[
              ["Mmiliki / Owner", vals.owner_name],
              ["NIDA", vals.owner_nida],
              ["Simu / Phone", vals.owner_phone],
              ["Kata / Ward", vals.owner_ward],
              ["Mahali / Location", vals.location_description],
            ].map(([k, v]) => (
              <div key={k} className="flex justify-between px-4 py-2.5 text-sm">
                <span className="text-stone-500">{k}</span>
                <span className="font-bold text-right max-w-[60%]">{v || "—"}</span>
              </div>
            ))}
          </div>
          <p className="text-xs font-black text-stone-400 uppercase tracking-widest">
            {L(lang, "Mifugo Iliyosajiliwa", "Registered Livestock")}
          </p>
          <div className="space-y-2">
            {vals.mifugo.map((m, i) => (
              <div
                key={i}
                className="bg-stone-50 rounded-xl px-4 py-3 flex items-center justify-between"
              >
                <div>
                  <p className="text-sm font-bold text-stone-800">
                    {LIVESTOCK_CATEGORIES.find((c) => c.value === m.category)?.label || m.category}
                  </p>
                  <p className="text-xs text-stone-500">
                    {L(lang, "Idadi", "Qty")}: {m.quantity} ·{" "}
                    {HEALTH_STATUS.find((h) => h.value === m.health_status)?.label?.split("—")[0]}
                  </p>
                </div>
                {m.photo && (
                  <img
                    src={m.photo}
                    alt=""
                    className="w-12 h-12 object-cover rounded-lg border border-stone-200"
                  />
                )}
              </div>
            ))}
          </div>
          <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 flex justify-between items-center">
            <span className="text-sm font-bold text-emerald-800">
              {L(lang, "Ada ya Usajili", "Registration Fee")}
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
export default UsajiliMifugoForm;
