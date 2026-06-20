/**
 * Ombi la Msaada wa Jamii — Social Welfare Assistance Request
 * Fee: TSh 0
 */
import React, { useState } from "react";
import { Loader2, CheckCircle2, ArrowLeft, ArrowRight, FileText, Eye } from "lucide-react";
import { FormProps } from "./types";
import { ProgressFill } from "../ui/ProgressFill";
import { SignaturePad } from "@/components/ui/SignaturePad";

const SERVICE_FEE = 0;
const L = (lang: string, sw: string, en: string) => lang === "sw" ? sw : en;

export const OmbiMsaadaJamiiForm: React.FC<FormProps> = ({ onSubmit, isLoading, lang = "sw", userProfile }) => {
  const [step, setStep] = useState<"details" | "preview">("details");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [vals, setVals] = useState<Record<string, string>>({
    applicant_name: `${userProfile?.first_name || ""} ${userProfile?.last_name || ""}`.trim(),
    applicant_nida: userProfile?.nida_number || "",
    applicant_phone: userProfile?.phone || "",
    ward: userProfile?.ward || "",
    details: "", field1: "", field2: "", signature: "",
  });
  const set = (k: string, v: string) => setVals(p => ({ ...p, [k]: v }));
  const inputCls = "w-full px-4 py-3 border border-stone-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white";
  const lbl = "block text-xs font-bold text-stone-600 uppercase tracking-wider mb-1.5";
  const secHdr = "bg-emerald-50 border border-emerald-100 rounded-xl px-4 py-3 mb-4";

  const handleSubmit = async () => {
    setSubmitting(true);
    try { await onSubmit({ ...vals, service_fee: SERVICE_FEE, total_fee: SERVICE_FEE }); setSubmitted(true); }
    finally { setSubmitting(false); }
  };

  if (submitted) return (
    <div className="text-center py-10 space-y-4">
      <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto"><CheckCircle2 size={32} className="text-emerald-600" /></div>
      <h3 className="text-xl font-black">{L(lang, "Ombi Limewasilishwa!", "Application Submitted!")}</h3>
      <p className="text-stone-500 text-sm">{L(lang, "Ombi la Msaada wa Jamii litashughulikiwa na ofisi.", "Social Welfare Assistance Request will be processed by the office.")}</p>
      {SERVICE_FEE > 0 && <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 max-w-xs mx-auto"><p className="font-bold text-emerald-700 text-sm">Ada: TSh {SERVICE_FEE.toLocaleString()}</p></div>}
    </div>
  );

  return (
    <div className="space-y-5">
      <ProgressFill progress={step === "details" ? 50 : 100} />
      {step === "details" && (
        <div className="space-y-4">
          <div className={secHdr}><p className="font-bold text-emerald-800 text-sm">OMBI LA MSAADA WA JAMII / SOCIAL WELFARE ASSISTANCE REQUEST</p></div>
          <div><label className={lbl}>{L(lang, "Jina Kamili *", "Full Name *")}</label><input value={vals.applicant_name} onChange={e => set("applicant_name", e.target.value)} className={inputCls} /></div>
          <div><label className={lbl}>{L(lang, "Namba ya NIDA *", "NIDA Number *")}</label><input value={vals.applicant_nida} onChange={e => set("applicant_nida", e.target.value)} className={inputCls} placeholder="20XXXXXXXXXXXXXXXXX" /></div>
          <div><label className={lbl}>{L(lang, "Namba ya Simu *", "Phone Number *")}</label><input value={vals.applicant_phone} onChange={e => set("applicant_phone", e.target.value)} className={inputCls} placeholder="+255 7XX XXX XXX" /></div>
          <div><label className={lbl}>{L(lang, "Maelezo ya Ombi *", "Request Details *")}</label><textarea value={vals.details} onChange={e => set("details", e.target.value)} rows={4} className={`${inputCls} resize-none`} placeholder={L(lang, "Eleza kwa undani...", "Describe in detail...")} /></div>
          <div><label className={lbl}>{L(lang, "Taarifa za Ziada", "Additional Information")}</label><textarea value={vals.field1} onChange={e => set("field1", e.target.value)} rows={2} className={`${inputCls} resize-none`} /></div>
          <SignaturePad value={vals.signature} onChange={v => set("signature", v || "")} lang={lang} label={L(lang, "Saini ya Mwombaji", "Applicant Signature")} />
          <button type="button" onClick={() => setStep("preview")} className="w-full flex items-center justify-center gap-2 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl"><ArrowRight size={16}/>{L(lang,"Endelea","Continue")}</button>
        </div>
      )}
      {step === "preview" && (
        <div className="space-y-4">
          <div className={secHdr}><p className="font-bold text-emerald-800 text-sm flex items-center gap-2"><Eye size={16}/>{L(lang,"HAKIKI","PREVIEW")}</p></div>
          <div className="bg-white border border-stone-200 rounded-xl divide-y divide-stone-100">
            {[["Jina / Name", vals.applicant_name],["NIDA", vals.applicant_nida],["Simu / Phone", vals.applicant_phone],["Maelezo", vals.details.slice(0,80)],["Ada / Fee", SERVICE_FEE > 0 ? `TSh ${SERVICE_FEE.toLocaleString()}` : "Bila Ada / Free"]].map(([k,v])=>(<div key={String(k)} className="flex justify-between px-4 py-2.5 text-sm"><span className="text-stone-500">{k}</span><span className="font-bold text-right max-w-[60%]">{v}</span></div>))}
          </div>
          <div className="flex gap-3">
            <button type="button" onClick={() => setStep("details")} className="flex items-center gap-2 px-4 py-3 border border-stone-200 rounded-xl font-bold text-stone-600 hover:bg-stone-50"><ArrowLeft size={16}/>{L(lang,"Rudi","Back")}</button>
            <button type="button" onClick={handleSubmit} disabled={submitting||isLoading} className="flex-1 flex items-center justify-center gap-2 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl disabled:opacity-50">{submitting?<Loader2 size={16} className="animate-spin"/>:<FileText size={16}/>}{L(lang,"Wasilisha","Submit")}</button>
          </div>
        </div>
      )}
    </div>
  );
};
export default OmbiMsaadaJamiiForm;
