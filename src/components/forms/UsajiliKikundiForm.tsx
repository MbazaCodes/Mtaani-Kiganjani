/**
 * Usajili wa Kikundi / Chama — Group/Association Registration
 * Fee: TSh 5,000
 */
import React, { useState } from "react";
import { Loader2, CheckCircle2, ArrowLeft, ArrowRight, AlertCircle, Users, User, FileText, Check, Eye } from "lucide-react";
import { FormProps } from "./types";
import { ProgressFill } from "../ui/ProgressFill";
import { SignaturePad } from "@/components/ui/SignaturePad";

const SERVICE_FEE = 5000;
const L = (lang: string, sw: string, en: string) => lang === "sw" ? sw : en;
type Step = "kikundi" | "viongozi" | "preview";

interface FormVals {
  group_name: string; group_type: string; group_purpose: string;
  members_count: string; formation_date: string; meeting_location: string;
  chairman_name: string; chairman_nida: string; chairman_phone: string;
  secretary_name: string; secretary_nida: string; secretary_phone: string;
  treasurer_name: string; treasurer_phone: string;
  bank_account: string; signature: string;
}

const GROUP_TYPES = [
  { label: "Vikoba / SACCOS (Savings Group)", value: "VIKOBA" },
  { label: "Kikundi cha Wanawake (Women's Group)", value: "WANAWAKE" },
  { label: "Kikundi cha Vijana (Youth Group)", value: "VIJANA" },
  { label: "Kikundi cha Wakulima (Farmers' Group)", value: "WAKULIMA" },
  { label: "Chama cha Biashara (Business Association)", value: "BIASHARA" },
  { label: "Kikundi cha Dini (Religious Group)", value: "DINI" },
  { label: "Kikundi cha Mazingira (Environment Group)", value: "MAZINGIRA" },
  { label: "Kikundi cha Sanaa / Michezo (Arts / Sports)", value: "SANAA" },
  { label: "Nyingine (Other)", value: "OTHER" },
];

export const UsajiliKikundiForm: React.FC<FormProps> = ({ onSubmit, isLoading, lang = "sw", userProfile }) => {
  const [step, setStep] = useState<Step>("kikundi");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [vals, setVals] = useState<FormVals>({
    group_name: "", group_type: "", group_purpose: "", members_count: "10",
    formation_date: "", meeting_location: userProfile?.ward || "",
    chairman_name: `${userProfile?.first_name || ""} ${userProfile?.last_name || ""}`.trim(),
    chairman_nida: userProfile?.nida_number || "", chairman_phone: userProfile?.phone || "",
    secretary_name: "", secretary_nida: "", secretary_phone: "",
    treasurer_name: "", treasurer_phone: "", bank_account: "", signature: "",
  });

  const set = (k: keyof FormVals, v: string) => setVals(p => ({ ...p, [k]: v }));
  const clrErr = (k: string) => setErrors(p => { const n = { ...p }; delete n[k]; return n; });
  const STEPS: { key: Step; sw: string; en: string }[] = [
    { key: "kikundi", sw: "Kikundi", en: "Group" },
    { key: "viongozi", sw: "Viongozi", en: "Leaders" },
    { key: "preview", sw: "Hakiki", en: "Preview" },
  ];
  const stepIdx = STEPS.findIndex(s => s.key === step);

  const validate = () => {
    const e: Record<string, string> = {};
    if (step === "kikundi") {
      if (!vals.group_name.trim()) e.group_name = L(lang, "Jina la kikundi linahitajika", "Group name required");
      if (!vals.group_type) e.group_type = L(lang, "Aina ya kikundi inahitajika", "Group type required");
      if (!vals.group_purpose.trim()) e.group_purpose = L(lang, "Madhumuni yanahitajika", "Purpose required");
    }
    if (step === "viongozi") {
      if (!vals.chairman_name.trim()) e.chairman_name = L(lang, "Jina la mwenyekiti linahitajika", "Chairman name required");
      if (!vals.chairman_phone.trim()) e.chairman_phone = L(lang, "Simu ya mwenyekiti inahitajika", "Chairman phone required");
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const next = () => { if (validate()) { const n = STEPS[stepIdx + 1]; if (n) setStep(n.key as Step); } };
  const prev = () => { const p = STEPS[stepIdx - 1]; if (p) setStep(p.key as Step); };

  const handleSubmit = async () => {
    setSubmitting(true);
    try { await onSubmit({ ...vals, service_fee: SERVICE_FEE, total_fee: SERVICE_FEE }); setSubmitted(true); }
    finally { setSubmitting(false); }
  };

  const inputCls = (k: string) => `w-full px-4 py-3 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 ${errors[k] ? "border-red-400 bg-red-50" : "border-stone-200 bg-white"}`;
  const lbl = "block text-xs font-bold text-stone-600 uppercase tracking-wider mb-1.5";
  const secHdr = "bg-emerald-50 border border-emerald-100 rounded-xl px-4 py-3 mb-4";

  if (submitted) return (
    <div className="text-center py-10 space-y-4">
      <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto"><CheckCircle2 size={32} className="text-emerald-600" /></div>
      <h3 className="text-xl font-black">{L(lang, "Usajili Umefanikiwa!", "Registration Submitted!")}</h3>
      <p className="text-stone-500 text-sm">{L(lang, "Kikundi kitasajiliwa baada ya ukaguzi na ofisi ya mtaa.", "The group will be registered after review by the ward office.")}</p>
    </div>
  );

  return (
    <div className="space-y-5">
      <ProgressFill progress={((stepIdx + 1) / STEPS.length) * 100} />
      <div className="flex gap-2 justify-center">{STEPS.map((s, i) => <div key={s.key} className={`px-2 py-1 rounded-full text-[10px] font-bold flex items-center gap-1 ${i <= stepIdx ? "bg-emerald-100 text-emerald-700" : "bg-stone-100 text-stone-400"}`}>{i < stepIdx && <Check size={10} />}{lang === "sw" ? s.sw : s.en}</div>)}</div>

      {step === "kikundi" && <div className="space-y-4">
        <div className={secHdr}><p className="font-bold text-emerald-800 text-sm flex items-center gap-2"><Users size={16} />{L(lang, "TAARIFA ZA KIKUNDI", "GROUP INFORMATION")}</p></div>
        <div><label className={lbl}>{L(lang, "Jina la Kikundi / Chama *", "Group / Association Name *")}</label><input value={vals.group_name} onChange={e => { set("group_name", e.target.value); clrErr("group_name"); }} className={inputCls("group_name")} placeholder={L(lang, "Mfano: Kikundi cha Akiba Jijini", "E.g. City Savings Group")} /></div>
        {errors.group_name && <p className="text-red-500 text-xs flex items-center gap-1"><AlertCircle size={11}/>{errors.group_name}</p>}
        <div><label className={lbl}>{L(lang, "Aina ya Kikundi *", "Group Type *")}</label>
          <select value={vals.group_type} onChange={e => { set("group_type", e.target.value); clrErr("group_type"); }} className={inputCls("group_type")}>
            <option value="">{L(lang, "-- Chagua aina --", "-- Select type --")}</option>
            {GROUP_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
          </select>
        </div>
        {errors.group_type && <p className="text-red-500 text-xs flex items-center gap-1"><AlertCircle size={11}/>{errors.group_type}</p>}
        <div><label className={lbl}>{L(lang, "Madhumuni ya Kikundi *", "Group Purpose *")}</label><textarea value={vals.group_purpose} onChange={e => { set("group_purpose", e.target.value); clrErr("group_purpose"); }} rows={3} className={`${inputCls("group_purpose")} resize-none`} placeholder={L(lang, "Eleza madhumuni ya kikundi...", "Describe the group's purpose...")} /></div>
        {errors.group_purpose && <p className="text-red-500 text-xs flex items-center gap-1"><AlertCircle size={11}/>{errors.group_purpose}</p>}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div><label className={lbl}>{L(lang, "Idadi ya Wanachama", "Number of Members")}</label><input type="number" min="3" value={vals.members_count} onChange={e => set("members_count", e.target.value)} className={inputCls("members_count")} /></div>
          <div><label className={lbl}>{L(lang, "Tarehe ya Kuanzishwa", "Formation Date")}</label><input type="date" value={vals.formation_date} onChange={e => set("formation_date", e.target.value)} className={inputCls("formation_date")} /></div>
        </div>
        <div><label className={lbl}>{L(lang, "Mahali pa Mikutano", "Meeting Location")}</label><input value={vals.meeting_location} onChange={e => set("meeting_location", e.target.value)} className={inputCls("meeting_location")} placeholder={L(lang, "Mtaa/Kata/Jengo", "Street/Ward/Building")} /></div>
      </div>}

      {step === "viongozi" && <div className="space-y-4">
        <div className={secHdr}><p className="font-bold text-emerald-800 text-sm flex items-center gap-2"><User size={16} />{L(lang, "VIONGOZI VYA KIKUNDI", "GROUP LEADERS")}</p></div>
        <p className="text-xs font-black text-stone-400 uppercase tracking-widest">{L(lang, "Mwenyekiti", "Chairperson")}</p>
        <div><label className={lbl}>{L(lang, "Jina Kamili *", "Full Name *")}</label><input value={vals.chairman_name} onChange={e => { set("chairman_name", e.target.value); clrErr("chairman_name"); }} className={inputCls("chairman_name")} /></div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div><label className={lbl}>NIDA</label><input value={vals.chairman_nida} onChange={e => set("chairman_nida", e.target.value)} className={inputCls("chairman_nida")} /></div>
          <div><label className={lbl}>{L(lang, "Simu *", "Phone *")}</label><input value={vals.chairman_phone} onChange={e => { set("chairman_phone", e.target.value); clrErr("chairman_phone"); }} className={inputCls("chairman_phone")} /></div>
        </div>
        <p className="text-xs font-black text-stone-400 uppercase tracking-widest pt-2">{L(lang, "Katibu", "Secretary")}</p>
        <div><label className={lbl}>{L(lang, "Jina Kamili", "Full Name")}</label><input value={vals.secretary_name} onChange={e => set("secretary_name", e.target.value)} className={inputCls("secretary_name")} /></div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div><label className={lbl}>NIDA</label><input value={vals.secretary_nida} onChange={e => set("secretary_nida", e.target.value)} className={inputCls("secretary_nida")} /></div>
          <div><label className={lbl}>{L(lang, "Simu", "Phone")}</label><input value={vals.secretary_phone} onChange={e => set("secretary_phone", e.target.value)} className={inputCls("secretary_phone")} /></div>
        </div>
        <p className="text-xs font-black text-stone-400 uppercase tracking-widest pt-2">{L(lang, "Mweka Hazina", "Treasurer")}</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div><label className={lbl}>{L(lang, "Jina Kamili", "Full Name")}</label><input value={vals.treasurer_name} onChange={e => set("treasurer_name", e.target.value)} className={inputCls("treasurer_name")} /></div>
          <div><label className={lbl}>{L(lang, "Simu", "Phone")}</label><input value={vals.treasurer_phone} onChange={e => set("treasurer_phone", e.target.value)} className={inputCls("treasurer_phone")} /></div>
        </div>
        <div><label className={lbl}>{L(lang, "Namba ya Akaunti ya Benki (Hiari)", "Bank Account Number (Optional)")}</label><input value={vals.bank_account} onChange={e => set("bank_account", e.target.value)} className={inputCls("bank_account")} /></div>
        <SignaturePad value={vals.signature} onChange={v => set("signature", v || "")} lang={lang} label={L(lang, "Saini ya Mwenyekiti", "Chairperson Signature")} />
      </div>}

      {step === "preview" && <div className="space-y-4">
        <div className={secHdr}><p className="font-bold text-emerald-800 text-sm flex items-center gap-2"><Eye size={16}/>{L(lang, "HAKIKI TAARIFA", "PREVIEW")}</p></div>
        <div className="bg-white border border-stone-200 rounded-xl divide-y divide-stone-100">
          {[[L(lang,"Kikundi","Group"), vals.group_name],[L(lang,"Aina","Type"),GROUP_TYPES.find(t=>t.value===vals.group_type)?.label||""],[L(lang,"Wanachama","Members"),vals.members_count],[L(lang,"Mwenyekiti","Chairman"),vals.chairman_name],[L(lang,"Simu","Phone"),vals.chairman_phone],[L(lang,"Ada","Fee"),`TSh ${SERVICE_FEE.toLocaleString()}`]].map(([k,v])=>(<div key={String(k)} className="flex justify-between px-4 py-2.5 text-sm"><span className="text-stone-500">{k}</span><span className="font-bold">{v}</span></div>))}
        </div>
      </div>}

      <div className="flex gap-3 pt-2">
        {stepIdx > 0 && <button type="button" onClick={prev} className="flex items-center gap-2 px-4 py-3 border border-stone-200 rounded-xl font-bold text-stone-600 hover:bg-stone-50"><ArrowLeft size={16}/>{L(lang,"Rudi","Back")}</button>}
        {step !== "preview"
          ? <button type="button" onClick={next} className="flex-1 flex items-center justify-center gap-2 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl"><ArrowRight size={16}/>{L(lang,"Endelea","Continue")}</button>
          : <button type="button" onClick={handleSubmit} disabled={submitting||isLoading} className="flex-1 flex items-center justify-center gap-2 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl disabled:opacity-50">{submitting?<Loader2 size={16} className="animate-spin"/>:<FileText size={16}/>}{L(lang,"Wasilisha","Submit")}</button>}
      </div>
    </div>
  );
};
export default UsajiliKikundiForm;
