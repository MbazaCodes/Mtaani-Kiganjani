/**
 * Cheti cha Mwanafunzi — Student Identity Certificate
 * Fee: TSh 2,000
 */
import React, { useState } from "react";
import { Loader2, CheckCircle2, ArrowLeft, ArrowRight, AlertCircle, FileText, Check, Eye, BookOpen, User } from "lucide-react";
import { FormProps } from "./types";
import { ProgressFill } from "../ui/ProgressFill";
import { SignaturePad } from "@/components/ui/SignaturePad";

const SERVICE_FEE = 2000;
const L = (lang: string, sw: string, en: string) => lang === "sw" ? sw : en;

const EDUCATION_LEVELS = [
  { value: "CHEKECHEA", label: "Chekechea / Pre-Primary" },
  { value: "MSINGI", label: "Shule ya Msingi (Primary School) — Darasa 1-7" },
  { value: "SEKONDARI_O", label: "Sekondari — Kidato 1-4 (O-Level)" },
  { value: "SEKONDARI_A", label: "Sekondari — Kidato 5-6 (A-Level)" },
  { value: "STASHAHADA", label: "Chuo — Stashahada (Certificate / Diploma)" },
  { value: "SHAHADA", label: "Chuo Kikuu — Shahada (Degree)" },
  { value: "UZAMILI", label: "Chuo Kikuu — Uzamili / Uzamivu (Masters / PhD)" },
];

const PURPOSE = [
  { value: "BIMA", label: "Bima ya Afya / NHIF (Health Insurance)" },
  { value: "MKOPO", label: "Mkopo wa Elimu / HESLB (Student Loan)" },
  { value: "AJIRA", label: "Maombi ya Kazi / Internship" },
  { value: "BENKI", label: "Kufungua Akaunti ya Benki (Bank Account)" },
  { value: "NAULI", label: "Punguzo la Nauli (Transport Discount)" },
  { value: "PASIPOTI", label: "Pasipoti / Visa (Passport / Visa)" },
  { value: "USAJILI", label: "Usajili wa Mtandao / Huduma (Online Registration)" },
  { value: "NYINGINE", label: "Nyingine (Other)" },
];

type Step = "mwanafunzi" | "shule" | "mzazi" | "preview";

interface FormVals {
  student_name: string; student_dob: string; student_sex: string;
  student_nida: string; student_phone: string;
  student_ward: string; student_district: string;
  school_name: string; education_level: string; class_year: string;
  student_number: string; admission_number: string;
  school_district: string; school_region: string;
  purpose: string; purpose_other: string;
  parent_name: string; parent_nida: string; parent_phone: string;
  parent_relationship: string;
  signature: string;
}

export const ChetiMwanafunziForm: React.FC<FormProps> = ({ onSubmit, isLoading, lang = "sw", userProfile }) => {
  const [step, setStep] = useState<Step>("mwanafunzi");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const fullName = `${userProfile?.first_name || ""} ${userProfile?.middle_name || ""} ${userProfile?.last_name || ""}`.trim();
  const [vals, setVals] = useState<FormVals>({
    student_name: fullName, student_dob: userProfile?.date_of_birth || "",
    student_sex: userProfile?.sex || "", student_nida: userProfile?.nida_number || "",
    student_phone: userProfile?.phone || "", student_ward: userProfile?.ward || "",
    student_district: userProfile?.district || "",
    school_name: "", education_level: "", class_year: "",
    student_number: "", admission_number: "",
    school_district: userProfile?.district || "", school_region: userProfile?.region || "",
    purpose: "", purpose_other: "",
    parent_name: "", parent_nida: "", parent_phone: "", parent_relationship: "BABA",
    signature: "",
  });

  const set = (k: keyof FormVals, v: string) => setVals(p => ({ ...p, [k]: v }));
  const clrErr = (k: string) => setErrors(p => { const n = { ...p }; delete n[k]; return n; });

  const STEPS: { key: Step; sw: string; en: string }[] = [
    { key: "mwanafunzi", sw: "Mwanafunzi", en: "Student" },
    { key: "shule", sw: "Shule", en: "School" },
    { key: "mzazi", sw: "Mzazi", en: "Parent" },
    { key: "preview", sw: "Hakiki", en: "Preview" },
  ];
  const stepIdx = STEPS.findIndex(s => s.key === step);

  const validate = (): boolean => {
    const e: Record<string, string> = {};
    if (step === "mwanafunzi") {
      if (!vals.student_name.trim()) e.student_name = L(lang, "Jina linahitajika", "Name required");
      if (!vals.student_dob) e.student_dob = L(lang, "Tarehe ya kuzaliwa inahitajika", "DOB required");
      if (!vals.student_sex) e.student_sex = L(lang, "Jinsia inahitajika", "Sex required");
      if (!vals.purpose) e.purpose = L(lang, "Sababu ya cheti inahitajika", "Purpose required");
    }
    if (step === "shule") {
      if (!vals.school_name.trim()) e.school_name = L(lang, "Jina la shule linahitajika", "School name required");
      if (!vals.education_level) e.education_level = L(lang, "Ngazi ya elimu inahitajika", "Education level required");
      if (!vals.class_year.trim()) e.class_year = L(lang, "Darasa/Mwaka inahitajika", "Class/Year required");
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

  const inputCls = (k?: string) => `w-full px-4 py-3 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 ${k && errors[k] ? "border-red-400 bg-red-50" : "border-stone-200 bg-white"}`;
  const lbl = "block text-xs font-bold text-stone-600 uppercase tracking-wider mb-1.5";
  const secHdr = "bg-emerald-50 border border-emerald-100 rounded-xl px-4 py-3 mb-4";

  if (submitted) return (
    <div className="text-center py-10 space-y-4">
      <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto"><CheckCircle2 size={32} className="text-emerald-600" /></div>
      <h3 className="text-xl font-black">{L(lang, "Ombi Limewasilishwa!", "Application Submitted!")}</h3>
      <p className="text-stone-500 text-sm">{L(lang, "Cheti cha mwanafunzi kitatolewa baada ya uthibitisho wa shule.", "Student certificate will be issued after school verification.")}</p>
    </div>
  );

  return (
    <div className="space-y-5">
      <ProgressFill progress={((stepIdx + 1) / STEPS.length) * 100} />
      <div className="flex gap-1.5 justify-center flex-wrap">
        {STEPS.map((s, i) => <div key={s.key} className={`px-2 py-1 rounded-full text-[10px] font-bold flex items-center gap-1 ${i <= stepIdx ? "bg-emerald-100 text-emerald-700" : "bg-stone-100 text-stone-400"}`}>{i < stepIdx && <Check size={10}/>}{lang === "sw" ? s.sw : s.en}</div>)}
      </div>

      {step === "mwanafunzi" && (
        <div className="space-y-4">
          <div className={secHdr}><p className="font-bold text-emerald-800 text-sm flex items-center gap-2"><User size={15}/>{L(lang, "TAARIFA ZA MWANAFUNZI", "STUDENT INFORMATION")}</p>
            <p className="text-xs text-emerald-600 mt-1">{L(lang, "Taarifa zimejazwa kutoka profaili yako", "Pre-filled from your profile")}</p>
          </div>
          <div><label className={lbl}>{L(lang, "Jina Kamili *", "Full Name *")}</label><input value={vals.student_name} onChange={e => { set("student_name", e.target.value); clrErr("student_name"); }} className={inputCls("student_name")} /></div>
          {errors.student_name && <p className="text-red-500 text-xs flex items-center gap-1"><AlertCircle size={11}/>{errors.student_name}</p>}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div><label className={lbl}>{L(lang, "Tarehe ya Kuzaliwa *", "Date of Birth *")}</label><input type="date" value={vals.student_dob} onChange={e => { set("student_dob", e.target.value); clrErr("student_dob"); }} className={inputCls("student_dob")} /></div>
            <div><label className={lbl}>{L(lang, "Jinsia *", "Sex *")}</label>
              <select value={vals.student_sex} onChange={e => { set("student_sex", e.target.value); clrErr("student_sex"); }} className={inputCls("student_sex")}>
                <option value="">{L(lang, "-- Chagua --", "-- Select --")}</option>
                <option value="M">{L(lang, "Mvulana (Male)", "Male")}</option>
                <option value="F">{L(lang, "Msichana (Female)", "Female")}</option>
              </select>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div><label className={lbl}>NIDA</label><input value={vals.student_nida} onChange={e => set("student_nida", e.target.value)} className={inputCls()} /></div>
            <div><label className={lbl}>{L(lang, "Simu", "Phone")}</label><input value={vals.student_phone} onChange={e => set("student_phone", e.target.value)} className={inputCls()} /></div>
          </div>
          <div><label className={lbl}>{L(lang, "Sababu ya Cheti *", "Purpose of Certificate *")}</label>
            <select value={vals.purpose} onChange={e => { set("purpose", e.target.value); clrErr("purpose"); }} className={inputCls("purpose")}>
              <option value="">{L(lang, "-- Chagua sababu --", "-- Select purpose --")}</option>
              {PURPOSE.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
            </select>
          </div>
          {errors.purpose && <p className="text-red-500 text-xs flex items-center gap-1"><AlertCircle size={11}/>{errors.purpose}</p>}
          {vals.purpose === "NYINGINE" && <div><label className={lbl}>{L(lang, "Eleza Sababu", "Describe Purpose")}</label><input value={vals.purpose_other} onChange={e => set("purpose_other", e.target.value)} className={inputCls()} /></div>}
        </div>
      )}

      {step === "shule" && (
        <div className="space-y-4">
          <div className={secHdr}><p className="font-bold text-emerald-800 text-sm flex items-center gap-2"><BookOpen size={15}/>{L(lang, "TAARIFA ZA SHULE / CHUO", "SCHOOL / INSTITUTION INFORMATION")}</p></div>
          <div><label className={lbl}>{L(lang, "Jina la Shule / Chuo *", "School / Institution Name *")}</label><input value={vals.school_name} onChange={e => { set("school_name", e.target.value); clrErr("school_name"); }} className={inputCls("school_name")} placeholder={L(lang, "Mfano: Shule ya Msingi Jangwani", "E.g. Jangwani Primary School")} /></div>
          {errors.school_name && <p className="text-red-500 text-xs flex items-center gap-1"><AlertCircle size={11}/>{errors.school_name}</p>}
          <div><label className={lbl}>{L(lang, "Ngazi ya Elimu *", "Education Level *")}</label>
            <select value={vals.education_level} onChange={e => { set("education_level", e.target.value); clrErr("education_level"); }} className={inputCls("education_level")}>
              <option value="">{L(lang, "-- Chagua ngazi --", "-- Select level --")}</option>
              {EDUCATION_LEVELS.map(l => <option key={l.value} value={l.value}>{l.label}</option>)}
            </select>
          </div>
          {errors.education_level && <p className="text-red-500 text-xs flex items-center gap-1"><AlertCircle size={11}/>{errors.education_level}</p>}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div><label className={lbl}>{L(lang, "Darasa / Mwaka wa Masomo *", "Class / Academic Year *")}</label><input value={vals.class_year} onChange={e => { set("class_year", e.target.value); clrErr("class_year"); }} className={inputCls("class_year")} placeholder={L(lang, "Mfano: Darasa 6 / Mwaka 2 / Form III", "E.g. Class 6 / Year 2 / Form III")} /></div>
            <div><label className={lbl}>{L(lang, "Namba ya Usajili wa Shule", "School Registration Number")}</label><input value={vals.admission_number} onChange={e => set("admission_number", e.target.value)} className={inputCls()} placeholder={L(lang, "Namba ya madhehebu", "Admission number")} /></div>
          </div>
          <div><label className={lbl}>{L(lang, "Namba ya Taifa ya Mwanafunzi (NECTA/TCU)", "National Student Number (NECTA/TCU)")}</label><input value={vals.student_number} onChange={e => set("student_number", e.target.value)} className={inputCls()} placeholder="S0XXX/XXXX/XXXX" /></div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div><label className={lbl}>{L(lang, "Wilaya ya Shule", "School District")}</label><input value={vals.school_district} onChange={e => set("school_district", e.target.value)} className={inputCls()} /></div>
            <div><label className={lbl}>{L(lang, "Mkoa wa Shule", "School Region")}</label><input value={vals.school_region} onChange={e => set("school_region", e.target.value)} className={inputCls()} /></div>
          </div>
        </div>
      )}

      {step === "mzazi" && (
        <div className="space-y-4">
          <div className={secHdr}><p className="font-bold text-emerald-800 text-sm">{L(lang, "MZAZI / MLEZI (kwa wanafunzi wa msingi)", "PARENT / GUARDIAN (for primary school students)")}</p>
            <p className="text-xs text-emerald-600 mt-1">{L(lang, "Wanafunzi wa sekondari au chuo wanaweza kuruka hatua hii", "Secondary/university students may skip this step")}</p>
          </div>
          <div><label className={lbl}>{L(lang, "Jina la Mzazi / Mlezi", "Parent / Guardian Name")}</label><input value={vals.parent_name} onChange={e => set("parent_name", e.target.value)} className={inputCls()} /></div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div><label className={lbl}>NIDA</label><input value={vals.parent_nida} onChange={e => set("parent_nida", e.target.value)} className={inputCls()} /></div>
            <div><label className={lbl}>{L(lang, "Simu", "Phone")}</label><input value={vals.parent_phone} onChange={e => set("parent_phone", e.target.value)} className={inputCls()} /></div>
          </div>
          <div><label className={lbl}>{L(lang, "Uhusiano na Mwanafunzi", "Relationship to Student")}</label>
            <select value={vals.parent_relationship} onChange={e => set("parent_relationship", e.target.value)} className={inputCls()}>
              <option value="BABA">{L(lang, "Baba (Father)", "Father")}</option>
              <option value="MAMA">{L(lang, "Mama (Mother)", "Mother")}</option>
              <option value="MLEZI">{L(lang, "Mlezi (Guardian)", "Guardian")}</option>
            </select>
          </div>
          <SignaturePad value={vals.signature} onChange={v => set("signature", v || "")} lang={lang} label={L(lang, "Saini ya Mwanafunzi / Mzazi", "Student / Parent Signature")} />
        </div>
      )}

      {step === "preview" && (
        <div className="space-y-4">
          <div className={secHdr}><p className="font-bold text-emerald-800 text-sm flex items-center gap-2"><Eye size={15}/>{L(lang, "HAKIKI TAARIFA", "PREVIEW")}</p></div>
          <div className="bg-white border border-stone-200 rounded-xl divide-y divide-stone-100">
            {[["Mwanafunzi / Student", vals.student_name], ["Shule / School", vals.school_name], ["Ngazi / Level", EDUCATION_LEVELS.find(l => l.value === vals.education_level)?.label || ""], ["Darasa / Class", vals.class_year], ["Namba / Number", vals.student_number || "—"], ["Sababu / Purpose", PURPOSE.find(p => p.value === vals.purpose)?.label || ""], ["Ada / Fee", `TSh ${SERVICE_FEE.toLocaleString()}`]].map(([k, v]) => (
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
export default ChetiMwanafunziForm;
