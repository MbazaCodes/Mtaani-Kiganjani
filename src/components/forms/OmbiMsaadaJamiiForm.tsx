/**
 * Ombi la Msaada wa Jamii — Social Welfare Assistance Request
 * Fee: FREE
 */
import React, { useState } from "react";
import { Loader2, CheckCircle2, ArrowLeft, ArrowRight, AlertCircle, FileText, Check, Eye, Heart, Users } from "lucide-react";
import { FormProps } from "./types";
import { ProgressFill } from "../ui/ProgressFill";
import { SignaturePad } from "@/components/ui/SignaturePad";

const L = (lang: string, sw: string, en: string) => lang === "sw" ? sw : en;

const ASSISTANCE_TYPES = [
  { value: "CHAKULA", label: "Msaada wa Chakula (Food Assistance)" },
  { value: "MATIBABU", label: "Msaada wa Matibabu (Medical Assistance)" },
  { value: "ELIMU", label: "Msaada wa Elimu — Ada za Shule (School Fees)" },
  { value: "MAKAZI", label: "Makazi / Nyumba (Housing / Shelter)" },
  { value: "UZEE", label: "Msaada wa Wazee (Elderly Care Support)" },
  { value: "ULEMAVU", label: "Msaada kwa Mtu mwenye Ulemavu (Disability Support)" },
  { value: "YATIMA", label: "Msaada kwa Yatima (Orphan Support)" },
  { value: "MAAFA", label: "Msaada wa Dharura / Maafa (Disaster / Emergency Relief)" },
  { value: "NYINGINE", label: "Nyingine (Other)" },
];

const FAMILY_STATUS = [
  { value: "MJANE", label: "Mjane — Mke/Mume amefariki (Widow / Widower)" },
  { value: "TALAKA", label: "Talaka (Divorced)" },
  { value: "FAMILIA_MOJA", label: "Mzazi Mmoja (Single Parent)" },
  { value: "MASKINI", label: "Familia Maskini Sana (Extremely Poor)" },
  { value: "MGONJWA", label: "Mhusika Mgonjwa / Ugonjwa wa Kudumu (Chronically Ill)" },
  { value: "MLEMAVU", label: "Mhusika ana Ulemavu (Person with Disability)" },
  { value: "MZEE", label: "Mzee asiye na Msaada (Unsupported Elderly)" },
];

type Step = "mombaji" | "hali" | "ombi" | "preview";

interface FormVals {
  applicant_name: string; applicant_nida: string; applicant_phone: string;
  applicant_dob: string; applicant_sex: string;
  applicant_ward: string; applicant_street: string; applicant_district: string;
  assistance_type: string; assistance_other: string;
  family_status: string; family_members: string; dependents: string;
  monthly_income: string; income_source: string;
  problem_description: string; assistance_needed: string;
  previous_assistance: string;
  witness_name: string; witness_phone: string;
  signature: string;
}

export const OmbiMsaadaJamiiForm: React.FC<FormProps> = ({ onSubmit, isLoading, lang = "sw", userProfile }) => {
  const [step, setStep] = useState<Step>("mombaji");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const fullName = `${userProfile?.first_name || ""} ${userProfile?.middle_name || ""} ${userProfile?.last_name || ""}`.trim();
  const [vals, setVals] = useState<FormVals>({
    applicant_name: fullName, applicant_nida: userProfile?.nida_number || "",
    applicant_phone: userProfile?.phone || "", applicant_dob: userProfile?.date_of_birth || "",
    applicant_sex: userProfile?.sex || "", applicant_ward: userProfile?.ward || "",
    applicant_street: userProfile?.street || "", applicant_district: userProfile?.district || "",
    assistance_type: "", assistance_other: "", family_status: "",
    family_members: "", dependents: "", monthly_income: "0", income_source: "",
    problem_description: "", assistance_needed: "", previous_assistance: "",
    witness_name: "", witness_phone: "", signature: "",
  });

  const set = (k: keyof FormVals, v: string) => setVals(p => ({ ...p, [k]: v }));
  const clrErr = (k: string) => setErrors(p => { const n = { ...p }; delete n[k]; return n; });

  const STEPS: { key: Step; sw: string; en: string }[] = [
    { key: "mombaji", sw: "Mwombaji", en: "Applicant" },
    { key: "hali", sw: "Hali ya Maisha", en: "Situation" },
    { key: "ombi", sw: "Ombi", en: "Request" },
    { key: "preview", sw: "Hakiki", en: "Preview" },
  ];
  const stepIdx = STEPS.findIndex(s => s.key === step);

  const validate = (): boolean => {
    const e: Record<string, string> = {};
    if (step === "mombaji") {
      if (!vals.applicant_name.trim()) e.applicant_name = L(lang, "Jina linahitajika", "Name required");
      if (!vals.applicant_nida.trim()) e.applicant_nida = L(lang, "NIDA inahitajika", "NIDA required");
      if (!vals.applicant_phone.trim()) e.applicant_phone = L(lang, "Simu inahitajika", "Phone required");
    }
    if (step === "hali") {
      if (!vals.assistance_type) e.assistance_type = L(lang, "Aina ya msaada inahitajika", "Assistance type required");
      if (!vals.family_status) e.family_status = L(lang, "Hali ya familia inahitajika", "Family status required");
      if (!vals.problem_description.trim()) e.problem_description = L(lang, "Maelezo ya tatizo yanahitajika", "Problem description required");
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const next = () => { if (validate()) { const n = STEPS[stepIdx + 1]; if (n) setStep(n.key as Step); } };
  const prev = () => { const p = STEPS[stepIdx - 1]; if (p) setStep(p.key as Step); };

  const handleSubmit = async () => {
    setSubmitting(true);
    try { await onSubmit({ ...vals, service_fee: 0, total_fee: 0 }); setSubmitted(true); }
    finally { setSubmitting(false); }
  };

  const inputCls = (k?: string) => `w-full px-4 py-3 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 ${k && errors[k] ? "border-red-400 bg-red-50" : "border-stone-200 bg-white"}`;
  const lbl = "block text-xs font-bold text-stone-600 uppercase tracking-wider mb-1.5";
  const secHdr = "bg-emerald-50 border border-emerald-100 rounded-xl px-4 py-3 mb-4";

  if (submitted) return (
    <div className="text-center py-10 space-y-4">
      <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto"><CheckCircle2 size={32} className="text-emerald-600" /></div>
      <h3 className="text-xl font-black">{L(lang, "Ombi Limewasilishwa!", "Application Submitted!")}</h3>
      <p className="text-stone-500 text-sm">{L(lang, "Ombi lako la msaada litashughulikiwa na Afisa Ustawi wa Jamii wa kata yako.", "Your welfare request will be handled by your ward Social Welfare Officer.")}</p>
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 max-w-xs mx-auto text-xs text-blue-700">
        {L(lang, "Huduma hii ni bure. Utapigiwa simu ndani ya siku 3-5 za kazi.", "This service is free. You will be called within 3-5 working days.")}
      </div>
    </div>
  );

  return (
    <div className="space-y-5">
      <ProgressFill progress={((stepIdx + 1) / STEPS.length) * 100} />
      <div className="flex gap-1.5 justify-center flex-wrap">
        {STEPS.map((s, i) => <div key={s.key} className={`px-2 py-1 rounded-full text-[10px] font-bold flex items-center gap-1 ${i <= stepIdx ? "bg-emerald-100 text-emerald-700" : "bg-stone-100 text-stone-400"}`}>{i < stepIdx && <Check size={10}/>}{lang === "sw" ? s.sw : s.en}</div>)}
      </div>
      <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 text-center">
        <p className="text-xs font-bold text-emerald-700">✅ {L(lang, "Huduma hii ni BURE — Hakuna ada", "This service is FREE — No fee charged")}</p>
      </div>

      {step === "mombaji" && (
        <div className="space-y-4">
          <div className={secHdr}><p className="font-bold text-emerald-800 text-sm flex items-center gap-2"><Heart size={15}/>{L(lang, "TAARIFA ZA MWOMBAJI", "APPLICANT INFORMATION")}</p>
            <p className="text-xs text-emerald-600 mt-1">{L(lang, "Taarifa zimejazwa kutoka profaili yako", "Pre-filled from your profile")}</p>
          </div>
          <div><label className={lbl}>{L(lang, "Jina Kamili *", "Full Name *")}</label><input value={vals.applicant_name} onChange={e => { set("applicant_name", e.target.value); clrErr("applicant_name"); }} className={inputCls("applicant_name")} /></div>
          {errors.applicant_name && <p className="text-red-500 text-xs flex items-center gap-1"><AlertCircle size={11}/>{errors.applicant_name}</p>}
          <div><label className={lbl}>NIDA *</label><input value={vals.applicant_nida} onChange={e => { set("applicant_nida", e.target.value); clrErr("applicant_nida"); }} className={inputCls("applicant_nida")} /></div>
          {errors.applicant_nida && <p className="text-red-500 text-xs flex items-center gap-1"><AlertCircle size={11}/>{errors.applicant_nida}</p>}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div><label className={lbl}>{L(lang, "Simu *", "Phone *")}</label><input value={vals.applicant_phone} onChange={e => { set("applicant_phone", e.target.value); clrErr("applicant_phone"); }} className={inputCls("applicant_phone")} /></div>
            <div><label className={lbl}>{L(lang, "Jinsia", "Sex")}</label>
              <select value={vals.applicant_sex} onChange={e => set("applicant_sex", e.target.value)} className={inputCls()}>
                <option value="">{L(lang, "-- Chagua --", "-- Select --")}</option>
                <option value="M">{L(lang, "Mme (Male)", "Male")}</option>
                <option value="F">{L(lang, "Mke (Female)", "Female")}</option>
              </select>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div><label className={lbl}>{L(lang, "Kata", "Ward")}</label><input value={vals.applicant_ward} onChange={e => set("applicant_ward", e.target.value)} className={inputCls()} /></div>
            <div><label className={lbl}>{L(lang, "Mtaa", "Street")}</label><input value={vals.applicant_street} onChange={e => set("applicant_street", e.target.value)} className={inputCls()} /></div>
          </div>
        </div>
      )}

      {step === "hali" && (
        <div className="space-y-4">
          <div className={secHdr}><p className="font-bold text-emerald-800 text-sm flex items-center gap-2"><Users size={15}/>{L(lang, "HALI YA FAMILIA NA MAISHA", "FAMILY & LIVING SITUATION")}</p></div>
          <div><label className={lbl}>{L(lang, "Aina ya Msaada Unaohitajika *", "Type of Assistance Needed *")}</label>
            <select value={vals.assistance_type} onChange={e => { set("assistance_type", e.target.value); clrErr("assistance_type"); }} className={inputCls("assistance_type")}>
              <option value="">{L(lang, "-- Chagua aina --", "-- Select type --")}</option>
              {ASSISTANCE_TYPES.map(a => <option key={a.value} value={a.value}>{a.label}</option>)}
            </select>
          </div>
          {errors.assistance_type && <p className="text-red-500 text-xs flex items-center gap-1"><AlertCircle size={11}/>{errors.assistance_type}</p>}
          {vals.assistance_type === "NYINGINE" && <div><label className={lbl}>{L(lang, "Eleza Aina ya Msaada", "Describe Assistance Type")}</label><input value={vals.assistance_other} onChange={e => set("assistance_other", e.target.value)} className={inputCls()} /></div>}
          <div><label className={lbl}>{L(lang, "Hali ya Familia *", "Family Situation *")}</label>
            <select value={vals.family_status} onChange={e => { set("family_status", e.target.value); clrErr("family_status"); }} className={inputCls("family_status")}>
              <option value="">{L(lang, "-- Chagua hali --", "-- Select situation --")}</option>
              {FAMILY_STATUS.map(f => <option key={f.value} value={f.value}>{f.label}</option>)}
            </select>
          </div>
          {errors.family_status && <p className="text-red-500 text-xs flex items-center gap-1"><AlertCircle size={11}/>{errors.family_status}</p>}
          <div className="grid grid-cols-2 gap-3">
            <div><label className={lbl}>{L(lang, "Wanafamilia Wote", "Total Family Members")}</label><input type="number" min="1" value={vals.family_members} onChange={e => set("family_members", e.target.value)} className={inputCls()} /></div>
            <div><label className={lbl}>{L(lang, "Watoto / Wategemezi", "Children / Dependents")}</label><input type="number" min="0" value={vals.dependents} onChange={e => set("dependents", e.target.value)} className={inputCls()} /></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className={lbl}>{L(lang, "Mapato ya Kila Mwezi (TSh)", "Monthly Income (TSh)")}</label><input type="number" min="0" value={vals.monthly_income} onChange={e => set("monthly_income", e.target.value)} className={inputCls()} placeholder="0" /></div>
            <div><label className={lbl}>{L(lang, "Chanzo cha Mapato", "Income Source")}</label><input value={vals.income_source} onChange={e => set("income_source", e.target.value)} className={inputCls()} placeholder={L(lang, "Kilimo, biashara ndogo...", "Farming, petty trade...")} /></div>
          </div>
          <div><label className={lbl}>{L(lang, "Maelezo ya Tatizo / Hali Ngumu *", "Description of Problem / Hardship *")}</label><textarea value={vals.problem_description} onChange={e => { set("problem_description", e.target.value); clrErr("problem_description"); }} rows={4} className={`${inputCls("problem_description")} resize-none`} placeholder={L(lang, "Eleza kwa undani hali yako na sababu ya kuomba msaada...", "Describe your situation and reason for requesting assistance in detail...")} /></div>
          {errors.problem_description && <p className="text-red-500 text-xs flex items-center gap-1"><AlertCircle size={11}/>{errors.problem_description}</p>}
        </div>
      )}

      {step === "ombi" && (
        <div className="space-y-4">
          <div className={secHdr}><p className="font-bold text-emerald-800 text-sm">{L(lang, "MAELEZO YA OMBI", "REQUEST DETAILS")}</p></div>
          <div><label className={lbl}>{L(lang, "Msaada Halisi Unaohitajika", "Specific Assistance Requested")}</label><textarea value={vals.assistance_needed} onChange={e => set("assistance_needed", e.target.value)} rows={3} className={`${inputCls()} resize-none`} placeholder={L(lang, "Mfano: Msaada wa chakula kwa miezi 3, au chakula kwa watoto 4 wadogo...", "E.g. Food assistance for 3 months, or food for 4 young children...")} /></div>
          <div><label className={lbl}>{L(lang, "Je, Umewahi Kupata Msaada wa Serikali Awali?", "Have You Previously Received Government Assistance?")}</label><textarea value={vals.previous_assistance} onChange={e => set("previous_assistance", e.target.value)} rows={2} className={`${inputCls()} resize-none`} placeholder={L(lang, "Ndiyo / Hapana. Ikiwa ndiyo, eleza aina na mwaka...", "Yes / No. If yes, describe type and year...")} /></div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div><label className={lbl}>{L(lang, "Jina la Shahidi / Jirani", "Witness / Neighbour Name")}</label><input value={vals.witness_name} onChange={e => set("witness_name", e.target.value)} className={inputCls()} /></div>
            <div><label className={lbl}>{L(lang, "Simu ya Shahidi", "Witness Phone")}</label><input value={vals.witness_phone} onChange={e => set("witness_phone", e.target.value)} className={inputCls()} /></div>
          </div>
          <SignaturePad value={vals.signature} onChange={v => set("signature", v || "")} lang={lang} label={L(lang, "Saini ya Mwombaji", "Applicant Signature")} />
          <div className="bg-stone-50 border border-stone-200 rounded-xl p-3 text-xs text-stone-600">
            {L(lang, "Ninakiri kwamba taarifa nilizotoa ni za kweli. Ninajua kwamba kutoa taarifa za uongo ni kosa la kisheria.", "I certify that the information I have provided is true. I understand that providing false information is a legal offense.")}
          </div>
        </div>
      )}

      {step === "preview" && (
        <div className="space-y-4">
          <div className={secHdr}><p className="font-bold text-emerald-800 text-sm flex items-center gap-2"><Eye size={15}/>{L(lang, "HAKIKI TAARIFA", "PREVIEW")}</p></div>
          <div className="bg-white border border-stone-200 rounded-xl divide-y divide-stone-100">
            {[["Mwombaji / Applicant", vals.applicant_name], ["NIDA", vals.applicant_nida], ["Simu / Phone", vals.applicant_phone], ["Kata / Ward", vals.applicant_ward], ["Aina ya Msaada / Type", ASSISTANCE_TYPES.find(a => a.value === vals.assistance_type)?.label || ""], ["Hali ya Familia / Status", FAMILY_STATUS.find(f => f.value === vals.family_status)?.label || ""], ["Wanafamilia / Members", vals.family_members], ["Mapato / Income", `TSh ${Number(vals.monthly_income || 0).toLocaleString()}/mwezi`], ["Ada / Fee", "BURE / FREE"]].map(([k, v]) => (
              <div key={k} className="flex justify-between px-4 py-2.5 text-sm"><span className="text-stone-500">{k}</span><span className="font-bold text-right max-w-[55%]">{v || "—"}</span></div>
            ))}
          </div>
        </div>
      )}

      <div className="flex gap-3 pt-2">
        {stepIdx > 0 && <button type="button" onClick={prev} className="flex items-center gap-2 px-4 py-3 border border-stone-200 rounded-xl font-bold text-stone-600 hover:bg-stone-50"><ArrowLeft size={16}/>{L(lang, "Rudi", "Back")}</button>}
        {step !== "preview"
          ? <button type="button" onClick={next} className="flex-1 flex items-center justify-center gap-2 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl"><ArrowRight size={16}/>{L(lang, "Endelea", "Continue")}</button>
          : <button type="button" onClick={handleSubmit} disabled={submitting || isLoading} className="flex-1 flex items-center justify-center gap-2 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl disabled:opacity-50">{submitting ? <Loader2 size={16} className="animate-spin"/> : <FileText size={16}/>}{L(lang, "Wasilisha Ombi", "Submit Application")}</button>}
      </div>
    </div>
  );
};
export default OmbiMsaadaJamiiForm;
