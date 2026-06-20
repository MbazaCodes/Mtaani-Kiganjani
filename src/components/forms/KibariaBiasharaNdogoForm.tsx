/**
 * Kibari cha Biashara Ndogo — Small Business Permit Form
 * Fee: TSh 10,000
 */
import React, { useState } from "react";
import { Loader2, CheckCircle2, ArrowLeft, ArrowRight, Eye, AlertCircle, Store, MapPin, User, Phone, Check, FileText } from "lucide-react";
import { FormProps } from "./types";
import { ProgressFill } from "../ui/ProgressFill";
import { SignaturePad } from "@/components/ui/SignaturePad";

const SERVICE_FEE = 10000;
const L = (lang: string, sw: string, en: string) => lang === "sw" ? sw : en;

type Step = "biashara" | "mmiliki" | "preview";

interface FormVals {
  business_name: string;
  business_type: string;
  business_type_other: string;
  business_activity: string;
  location_address: string;
  ward: string;
  street: string;
  employees_count: string;
  start_date: string;
  owner_name: string;
  owner_nida: string;
  owner_phone: string;
  owner_dob: string;
  owner_sex: string;
  signature: string;
}

const BUSINESS_TYPES = [
  { label: "Duka la Rejareja (Retail Shop)", value: "RETAIL" },
  { label: "Mgahawa / Chakula (Restaurant / Food)", value: "FOOD" },
  { label: "Mama Lishe / Chakula cha Mtaani (Street Food)", value: "STREET_FOOD" },
  { label: "Kinyozi / Salon (Barber / Salon)", value: "SALON" },
  { label: "Fundi Nguo (Tailor)", value: "TAILOR" },
  { label: "Fundi Viatu (Cobbler)", value: "COBBLER" },
  { label: "Bodaboda / Pikipiki (Motorcycle Taxi)", value: "BODABODA" },
  { label: "Mkokoteni / Usafiri (Cart / Transport)", value: "TRANSPORT" },
  { label: "Kilimo / Bustani (Farming / Garden)", value: "FARMING" },
  { label: "Bidhaa za Ujenzi (Hardware)", value: "HARDWARE" },
  { label: "Maduka ya Dawa (Pharmacy / Chemist)", value: "PHARMACY" },
  { label: "Teknolojia / Simu (Tech / Mobile)", value: "TECH" },
  { label: "Nyingine (Other)", value: "OTHER" },
];

export const KibariaBiasharaNdogoForm: React.FC<FormProps> = ({ onSubmit, isLoading, lang = "sw", userProfile }) => {
  const [step, setStep] = useState<Step>("biashara");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [vals, setVals] = useState<FormVals>({
    business_name: "", business_type: "", business_type_other: "",
    business_activity: "", location_address: "", ward: userProfile?.ward || "",
    street: userProfile?.street || "", employees_count: "1", start_date: "",
    owner_name: userProfile ? `${userProfile.first_name || ""} ${userProfile.last_name || ""}`.trim() : "",
    owner_nida: userProfile?.nida_number || "", owner_phone: userProfile?.phone || "",
    owner_dob: userProfile?.date_of_birth || "", owner_sex: userProfile?.sex || "",
    signature: "",
  });

  const set = (k: keyof FormVals, v: string) => setVals(p => ({ ...p, [k]: v }));
  const clrErr = (k: string) => setErrors(p => { const n = { ...p }; delete n[k]; return n; });

  const STEPS: { key: Step; label: string; sw: string }[] = [
    { key: "biashara", label: "Business", sw: "Biashara" },
    { key: "mmiliki", label: "Owner", sw: "Mmiliki" },
    { key: "preview", label: "Preview", sw: "Hakiki" },
  ];
  const stepIdx = STEPS.findIndex(s => s.key === step);
  const progress = ((stepIdx + 1) / STEPS.length) * 100;

  const validate = (): boolean => {
    const e: Record<string, string> = {};
    if (step === "biashara") {
      if (!vals.business_name.trim()) e.business_name = L(lang, "Jina la biashara linahitajika", "Business name required");
      if (!vals.business_type) e.business_type = L(lang, "Aina ya biashara inahitajika", "Business type required");
      if (!vals.location_address.trim()) e.location_address = L(lang, "Anwani ya biashara inahitajika", "Business address required");
    }
    if (step === "mmiliki") {
      if (!vals.owner_name.trim()) e.owner_name = L(lang, "Jina la mmiliki linahitajika", "Owner name required");
      if (!vals.owner_nida.trim()) e.owner_nida = L(lang, "Namba ya NIDA inahitajika", "NIDA number required");
      if (!vals.owner_phone.trim()) e.owner_phone = L(lang, "Namba ya simu inahitajika", "Phone number required");
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const next = () => { if (validate()) { const n = STEPS[stepIdx + 1]; if (n) setStep(n.key); } };
  const prev = () => { const p = STEPS[stepIdx - 1]; if (p) setStep(p.key); };

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      await onSubmit({ ...vals, service_fee: SERVICE_FEE, total_fee: SERVICE_FEE });
      setSubmitted(true);
    } finally { setSubmitting(false); }
  };

  const inputCls = (k: string) => `w-full px-4 py-3 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-colors ${errors[k] ? "border-red-400 bg-red-50" : "border-stone-200 bg-white"}`;
  const lbl = "block text-xs font-bold text-stone-600 uppercase tracking-wider mb-1.5";
  const secHdr = "bg-emerald-50 border border-emerald-100 rounded-xl px-4 py-3 mb-4";

  if (submitted) return (
    <div className="text-center py-10 space-y-4">
      <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto">
        <CheckCircle2 size={32} className="text-emerald-600" />
      </div>
      <h3 className="text-xl font-black text-stone-900">{L(lang, "Ombi Limewasilishwa!", "Application Submitted!")}</h3>
      <p className="text-stone-500 text-sm">{L(lang, "Kibari cha biashara kitashughulikiwa na ofisi ya mtaa.", "Your business permit will be processed by the ward office.")}</p>
      <div className="bg-stone-50 rounded-xl p-4 text-left max-w-sm mx-auto space-y-2">
        {[[L(lang, "Biashara", "Business"), vals.business_name], [L(lang, "Aina", "Type"), BUSINESS_TYPES.find(t => t.value === vals.business_type)?.label || ""], ["Ada / Fee", `TSh ${SERVICE_FEE.toLocaleString()}`]].map(([k, v]) => (
          <div key={k} className="flex justify-between text-sm"><span className="text-stone-500">{k}</span><span className="font-bold">{v}</span></div>
        ))}
      </div>
    </div>
  );

  return (
    <div className="space-y-5">
      <ProgressFill progress={progress} />
      <div className="flex gap-2 justify-center">
        {STEPS.map((s, i) => (
          <div key={s.key} className={`flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-bold ${i <= stepIdx ? "bg-emerald-100 text-emerald-700" : "bg-stone-100 text-stone-400"}`}>
            {i < stepIdx && <Check size={10} />}{lang === "sw" ? s.sw : s.label}
          </div>
        ))}
      </div>

      {step === "biashara" && (
        <div className="space-y-4">
          <div className={secHdr}><p className="font-bold text-emerald-800 text-sm flex items-center gap-2"><Store size={16} />{L(lang, "TAARIFA ZA BIASHARA", "BUSINESS INFORMATION")}</p></div>
          <div><label className={lbl}>{L(lang, "Jina la Biashara *", "Business Name *")}</label><input value={vals.business_name} onChange={e => { set("business_name", e.target.value); clrErr("business_name"); }} className={inputCls("business_name")} placeholder={L(lang, "Mfano: Duka la Amina", "E.g. Amina's Shop")} /></div>
          {errors.business_name && <p className="text-red-500 text-xs flex items-center gap-1"><AlertCircle size={11} />{errors.business_name}</p>}
          <div><label className={lbl}>{L(lang, "Aina ya Biashara *", "Business Type *")}</label>
            <select value={vals.business_type} onChange={e => { set("business_type", e.target.value); clrErr("business_type"); }} className={inputCls("business_type")}>
              <option value="">{L(lang, "-- Chagua aina --", "-- Select type --")}</option>
              {BUSINESS_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          </div>
          {errors.business_type && <p className="text-red-500 text-xs flex items-center gap-1"><AlertCircle size={11} />{errors.business_type}</p>}
          {vals.business_type === "OTHER" && <div><label className={lbl}>{L(lang, "Eleza Aina ya Biashara *", "Describe Business Type *")}</label><input value={vals.business_type_other} onChange={e => set("business_type_other", e.target.value)} className={inputCls("business_type_other")} /></div>}
          <div><label className={lbl}>{L(lang, "Shughuli Kuu ya Biashara", "Main Business Activity")}</label><textarea value={vals.business_activity} onChange={e => set("business_activity", e.target.value)} rows={2} className={`${inputCls("business_activity")} resize-none`} placeholder={L(lang, "Eleza biashara yako kwa ufupi...", "Briefly describe your business...")} /></div>
          <div><label className={lbl}>{L(lang, "Anwani ya Biashara *", "Business Address *")}</label><input value={vals.location_address} onChange={e => { set("location_address", e.target.value); clrErr("location_address"); }} className={inputCls("location_address")} placeholder={L(lang, "Mtaa, Kata, Wilaya", "Street, Ward, District")} /></div>
          {errors.location_address && <p className="text-red-500 text-xs flex items-center gap-1"><AlertCircle size={11} />{errors.location_address}</p>}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div><label className={lbl}>{L(lang, "Idadi ya Wafanyakazi", "Number of Employees")}</label><input type="number" min="1" value={vals.employees_count} onChange={e => set("employees_count", e.target.value)} className={inputCls("employees_count")} /></div>
            <div><label className={lbl}>{L(lang, "Tarehe ya Kuanza", "Start Date")}</label><input type="date" value={vals.start_date} onChange={e => set("start_date", e.target.value)} className={inputCls("start_date")} /></div>
          </div>
        </div>
      )}

      {step === "mmiliki" && (
        <div className="space-y-4">
          <div className={secHdr}><p className="font-bold text-emerald-800 text-sm flex items-center gap-2"><User size={16} />{L(lang, "TAARIFA ZA MMILIKI", "OWNER INFORMATION")}</p></div>
          <div><label className={lbl}>{L(lang, "Jina Kamili la Mmiliki *", "Full Owner Name *")}</label><input value={vals.owner_name} onChange={e => { set("owner_name", e.target.value); clrErr("owner_name"); }} className={inputCls("owner_name")} /></div>
          {errors.owner_name && <p className="text-red-500 text-xs flex items-center gap-1"><AlertCircle size={11} />{errors.owner_name}</p>}
          <div><label className={lbl}>{L(lang, "Namba ya NIDA *", "NIDA Number *")}</label><input value={vals.owner_nida} onChange={e => { set("owner_nida", e.target.value); clrErr("owner_nida"); }} className={inputCls("owner_nida")} placeholder="20XXXXXXXXXXXXXXXXX" /></div>
          {errors.owner_nida && <p className="text-red-500 text-xs flex items-center gap-1"><AlertCircle size={11} />{errors.owner_nida}</p>}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div><label className={lbl}>{L(lang, "Namba ya Simu *", "Phone Number *")}</label><input value={vals.owner_phone} onChange={e => { set("owner_phone", e.target.value); clrErr("owner_phone"); }} className={inputCls("owner_phone")} placeholder="+255 7XX XXX XXX" /></div>
            <div><label className={lbl}>{L(lang, "Jinsia", "Sex")}</label>
              <select value={vals.owner_sex} onChange={e => set("owner_sex", e.target.value)} className={inputCls("owner_sex")}>
                <option value="">{L(lang, "-- Chagua --", "-- Select --")}</option>
                <option value="M">{L(lang, "Mme", "Male")}</option>
                <option value="F">{L(lang, "Mke", "Female")}</option>
              </select>
            </div>
          </div>
          <SignaturePad value={vals.signature} onChange={v => set("signature", v || "")} lang={lang} label={L(lang, "Saini ya Mmiliki", "Owner Signature")} />
        </div>
      )}

      {step === "preview" && (
        <div className="space-y-4">
          <div className={secHdr}><p className="font-bold text-emerald-800 text-sm flex items-center gap-2"><Eye size={16} />{L(lang, "HAKIKI TAARIFA", "PREVIEW INFORMATION")}</p></div>
          <div className="bg-white border border-stone-200 rounded-xl divide-y divide-stone-100">
            {[[L(lang, "Jina la Biashara", "Business Name"), vals.business_name], [L(lang, "Aina", "Type"), BUSINESS_TYPES.find(t => t.value === vals.business_type)?.label || vals.business_type_other], [L(lang, "Anwani", "Address"), vals.location_address], [L(lang, "Mmiliki", "Owner"), vals.owner_name], [L(lang, "NIDA", "NIDA"), vals.owner_nida], [L(lang, "Simu", "Phone"), vals.owner_phone], [L(lang, "Ada", "Fee"), `TSh ${SERVICE_FEE.toLocaleString()}`]].map(([k, v]) => (
              <div key={k} className="flex justify-between px-4 py-2.5 text-sm"><span className="text-stone-500">{k}</span><span className="font-bold text-stone-800 text-right max-w-[60%]">{v}</span></div>
            ))}
          </div>
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 flex gap-2">
            <AlertCircle size={14} className="text-amber-500 shrink-0 mt-0.5" />
            <p className="text-xs text-amber-700">{L(lang, "Taarifa zote ni sahihi. Utumie namba ya ombi kupata kibari baada ya idhini.", "All information is accurate. Use your reference number to collect the permit after approval.")}</p>
          </div>
        </div>
      )}

      <div className="flex gap-3 pt-2">
        {stepIdx > 0 && <button type="button" onClick={prev} className="flex items-center gap-2 px-4 py-3 border border-stone-200 rounded-xl font-bold text-stone-600 hover:bg-stone-50 transition-colors"><ArrowLeft size={16} />{L(lang, "Rudi", "Back")}</button>}
        {step !== "preview" ? (
          <button type="button" onClick={next} className="flex-1 flex items-center justify-center gap-2 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl transition-colors"><ArrowRight size={16} />{L(lang, "Endelea", "Continue")}</button>
        ) : (
          <button type="button" onClick={handleSubmit} disabled={submitting || isLoading} className="flex-1 flex items-center justify-center gap-2 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl transition-colors disabled:opacity-50">
            {submitting ? <Loader2 size={16} className="animate-spin" /> : <FileText size={16} />}{L(lang, "Wasilisha Ombi", "Submit Application")}
          </button>
        )}
      </div>
    </div>
  );
};

export default KibariaBiasharaNdogoForm;
