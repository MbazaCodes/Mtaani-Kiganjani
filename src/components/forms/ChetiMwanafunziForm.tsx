/**
 * Cheti cha Mwanafunzi — Student Identity Certificate
 * Fee: TSh 2,000
 * Student ID format: ST-{YEAR}-{REGION_CODE}-{UNIQUE6}
 * Steps: Mode → Mwanafunzi → Shule → Mzazi → Preview
 */
import React, { useState, useMemo } from "react";
import {
  Loader2, CheckCircle2, ArrowLeft, ArrowRight, AlertCircle,
  FileText, Check, Eye, BookOpen, User, Search, Upload, X, Camera,
} from "lucide-react";
import { FormProps } from "./types";
import { ProgressFill } from "../ui/ProgressFill";
import { SignaturePad } from "@/components/ui/SignaturePad";
import { TANZANIA_ADDRESS_DATA } from "@/lib/addressData";
import { supabase } from "@/lib/supabase";

const SERVICE_FEE = 2000;
const L = (lang: string, sw: string, en: string) => lang === "sw" ? sw : en;

// Region abbreviations for ID generation
const REGION_CODES: Record<string, string> = {
  "Dar es Salaam": "DS", "Dodoma": "DO", "Arusha": "AR", "Kilimanjaro": "KL",
  "Tanga": "TA", "Morogoro": "MO", "Pwani": "PW", "Lindi": "LI", "Mtwara": "MT",
  "Ruvuma": "RU", "Iringa": "IR", "Mbeya": "MB", "Singida": "SI", "Tabora": "TB",
  "Rukwa": "RK", "Kigoma": "KG", "Shinyanga": "SH", "Kagera": "KA", "Mwanza": "MW",
  "Mara": "MA", "Manyara": "MY", "Geita": "GE", "Simiyu": "SM", "Katavi": "KV",
  "Njombe": "NJ", "Songwe": "SW", "Kaskazini Unguja": "ZN", "Kusini Unguja": "ZS",
  "Kaskazini Pemba": "PN", "Kusini Pemba": "PS", "Mjini Magharibi": "ZM",
};

const generateStudentId = (region: string): string => {
  const year = new Date().getFullYear();
  const regionCode = REGION_CODES[region] || "TZ";
  const unique = Math.random().toString(36).substring(2, 8).toUpperCase();
  return `TSID-${year}-${unique}`;
};

const EDUCATION_LEVELS = [
  { value: "CHEKECHEA", label: "Chekechea / Pre-Primary", classes: ["Chekechea Kwanza", "Chekechea Pili"] },
  { value: "MSINGI", label: "Shule ya Msingi (Primary)", classes: ["Darasa 1","Darasa 2","Darasa 3","Darasa 4","Darasa 5","Darasa 6","Darasa 7"] },
  { value: "SEKONDARI_O", label: "Sekondari O-Level (Form 1-4)", classes: ["Form I","Form II","Form III","Form IV"] },
  { value: "SEKONDARI_A", label: "Sekondari A-Level (Form 5-6)", classes: ["Form V","Form VI"] },
  { value: "STASHAHADA", label: "Chuo — Stashahada / Diploma", classes: ["Mwaka 1","Mwaka 2","Mwaka 3"] },
  { value: "SHAHADA", label: "Chuo Kikuu — Shahada (Degree)", classes: ["Year 1","Year 2","Year 3","Year 4","Year 5"] },
  { value: "UZAMILI", label: "Uzamili / Uzamivu (Masters/PhD)", classes: ["Semester 1","Semester 2","Mwaka 1","Mwaka 2","Mwaka 3"] },
];

const PURPOSE = [
  { value: "BIMA", label: "Bima ya Afya / NHIF (Health Insurance)" },
  { value: "MKOPO", label: "Mkopo wa Elimu / HESLB (Student Loan)" },
  { value: "AJIRA", label: "Maombi ya Kazi / Internship (Job Application)" },
  { value: "BENKI", label: "Kufungua Akaunti ya Benki (Bank Account)" },
  { value: "NAULI", label: "Punguzo la Nauli (Transport Discount)" },
  { value: "PASIPOTI", label: "Pasipoti / Visa (Passport / Visa)" },
  { value: "USAJILI", label: "Usajili wa Mtandao / Huduma (Online Services)" },
  { value: "NYINGINE", label: "Nyingine (Other)" },
];

type Step = "mode" | "mwanafunzi" | "shule" | "mzazi" | "preview";
type InputMode = "" | "self" | "manual" | "search";

interface FormVals {
  input_mode: InputMode;
  student_name: string; student_first: string; student_last: string;
  student_dob: string; student_sex: string;
  student_nida: string; student_phone: string; student_ct_id: string;
  student_region: string; student_district: string; student_ward: string;
  student_photo: string;
  school_name: string; education_level: string; class_year: string;
  class_year_manual: string;
  student_number: string; admission_number: string;
  blood_group: string; nationality: string; enrollment_date: string;
  school_district: string; school_region: string;
  generated_student_id: string;
  purpose: string; purpose_other: string;
  parent_use_profile: boolean;
  parent_name: string; parent_nida: string; parent_phone: string;
  parent_relationship: string;
  signature: string;
}

export const ChetiMwanafunziForm: React.FC<FormProps> = ({ onSubmit, isLoading, lang = "sw", userProfile }) => {
  const [step, setStep] = useState<Step>("mode");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [searching, setSearching] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResult, setSearchResult] = useState<{ name: string; ct_id: string; nida: string; phone: string } | null>(null);

  const fullName = `${userProfile?.first_name || ""} ${userProfile?.last_name || ""}`.trim();
  const parentFullName = `${userProfile?.first_name || ""} ${userProfile?.last_name || ""}`.trim();

  const [vals, setVals] = useState<FormVals>({
    input_mode: "",
    student_name: "", student_first: "", student_last: "",
    student_dob: "", student_sex: "", student_nida: "", student_phone: "",
    student_ct_id: "", student_region: userProfile?.region || "",
    student_district: userProfile?.district || "", student_ward: userProfile?.ward || "",
    student_photo: "",
    school_name: "", education_level: "", class_year: "", class_year_manual: "",
    student_number: "", admission_number: "",
    blood_group: "", nationality: "Mtanzania", enrollment_date: "",
    school_district: userProfile?.district || "", school_region: userProfile?.region || "",
    generated_student_id: "",
    purpose: "", purpose_other: "",
    parent_use_profile: true,
    parent_name: parentFullName, parent_nida: userProfile?.nida_number || "",
    parent_phone: userProfile?.phone || "", parent_relationship: "MAMA",
    signature: "",
  });

  const set = (k: keyof FormVals, v: string | boolean) => setVals(p => ({ ...p, [k]: v }));
  const clrErr = (k: string) => setErrors(p => { const n = { ...p }; delete n[k]; return n; });

  // Address cascades
  const regions = useMemo(() => TANZANIA_ADDRESS_DATA.map(r => r.name), []);
  const districts = useMemo(() => TANZANIA_ADDRESS_DATA.find(r => r.name === vals.student_region)?.districts.map(d => d.name) || [], [vals.student_region]);
  const wards = useMemo(() => TANZANIA_ADDRESS_DATA.find(r => r.name === vals.student_region)?.districts.find(d => d.name === vals.student_district)?.wards || [], [vals.student_region, vals.student_district]);

  const schoolRegions = useMemo(() => TANZANIA_ADDRESS_DATA.map(r => r.name), []);
  const schoolDistricts = useMemo(() => TANZANIA_ADDRESS_DATA.find(r => r.name === vals.school_region)?.districts.map(d => d.name) || [], [vals.school_region]);

  // Classes based on education level
  const classOptions = useMemo(() => EDUCATION_LEVELS.find(e => e.value === vals.education_level)?.classes || [], [vals.education_level]);

  // Auto-fill self
  const fillSelf = () => {
    setVals(p => ({
      ...p, input_mode: "self",
      student_first: userProfile?.first_name || "",
      student_last: userProfile?.last_name || "",
      student_name: fullName,
      student_dob: userProfile?.date_of_birth || "",
      student_sex: userProfile?.sex || "",
      student_nida: userProfile?.nida_number || "",
      student_phone: userProfile?.phone || "",
      student_ct_id: (userProfile as any)?.citizen_id || "",
      student_region: userProfile?.region || "",
      student_district: userProfile?.district || "",
      student_ward: userProfile?.ward || "",
    }));
    setStep("mwanafunzi");
  };

  // Search by CT ID
  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    setSearching(true);
    try {
      const { data } = await supabase
        .from("users")
        .select("first_name, last_name, citizen_id, nida_number, phone, date_of_birth, sex, region, district, ward")
        .ilike("citizen_id", `%${searchQuery.trim()}%`)
        .limit(1)
        .single();
      if (data) {
        setSearchResult({ name: `${data.first_name} ${data.last_name}`, ct_id: data.citizen_id || "", nida: data.nida_number || "", phone: data.phone || "" });
        setVals(p => ({
          ...p,
          student_first: data.first_name || "", student_last: data.last_name || "",
          student_name: `${data.first_name} ${data.last_name}`,
          student_dob: data.date_of_birth || "", student_sex: data.sex || "",
          student_nida: data.nida_number || "", student_phone: data.phone || "",
          student_ct_id: data.citizen_id || "", student_region: data.region || "",
          student_district: data.district || "", student_ward: data.ward || "",
        }));
      } else {
        setSearchResult(null);
      }
    } finally { setSearching(false); }
  };

  const STEPS: { key: Step; sw: string; en: string }[] = [
    { key: "mode", sw: "Aina", en: "Mode" },
    { key: "mwanafunzi", sw: "Mwanafunzi", en: "Student" },
    { key: "shule", sw: "Shule", en: "School" },
    { key: "mzazi", sw: "Mzazi", en: "Parent" },
    { key: "preview", sw: "Hakiki", en: "Preview" },
  ];
  const stepIdx = STEPS.findIndex(s => s.key === step);

  const validate = (): boolean => {
    const e: Record<string, string> = {};
    if (step === "mwanafunzi") {
      if (!vals.student_first.trim()) e.student_first = L(lang, "Jina la kwanza linahitajika", "First name required");
      if (!vals.student_last.trim()) e.student_last = L(lang, "Jina la mwisho linahitajika", "Last name required");
      if (!vals.student_dob) e.student_dob = L(lang, "Tarehe ya kuzaliwa inahitajika", "Date of birth required");
      if (!vals.student_sex) e.student_sex = L(lang, "Jinsia inahitajika", "Sex required");
      if (!vals.student_region) e.student_region = L(lang, "Mkoa inahitajika", "Region required");
      if (!vals.purpose) e.purpose = L(lang, "Sababu ya cheti inahitajika", "Certificate purpose required");
    }
    if (step === "shule") {
      if (!vals.school_name.trim()) e.school_name = L(lang, "Jina la shule linahitajika", "School name required");
      if (!vals.education_level) e.education_level = L(lang, "Ngazi ya elimu inahitajika", "Education level required");
      if (!vals.class_year && !vals.class_year_manual.trim()) e.class_year = L(lang, "Darasa/Mwaka inahitajika", "Class/Year required");
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const next = () => {
    if (step === "mode" && !vals.input_mode) {
      setErrors({ mode: L(lang, "Chagua njia ya kuingiza taarifa", "Select how to fill in details") });
      return;
    }
    if (validate()) {
      // Generate student ID when moving from shule → mzazi
      if (step === "shule" && !vals.generated_student_id) {
        set("generated_student_id", generateStudentId(vals.student_region));
      }
      const n = STEPS[stepIdx + 1]; if (n) setStep(n.key as Step);
    }
  };
  const prev = () => { const p = STEPS[stepIdx - 1]; if (p) setStep(p.key as Step); };

  const handlePhotoUpload = (file: File) => {
    const reader = new FileReader();
    reader.onload = () => set("student_photo", reader.result as string);
    reader.readAsDataURL(file);
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      await onSubmit({ ...vals, student_name: `${vals.student_first} ${vals.student_last}`.trim(), service_fee: SERVICE_FEE, total_fee: SERVICE_FEE });
      setSubmitted(true);
    } finally { setSubmitting(false); }
  };

  const inputCls = (k?: string) => `w-full px-4 py-3 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-colors ${k && errors[k] ? "border-red-400 bg-red-50" : "border-stone-200 bg-white"}`;
  const lbl = "block text-xs font-bold text-stone-600 uppercase tracking-wider mb-1.5";
  const secHdr = "bg-emerald-50 border border-emerald-100 rounded-xl px-4 py-3 mb-4";
  const ErrMsg = ({ k }: { k: string }) => errors[k] ? <p className="text-red-500 text-xs flex items-center gap-1 mt-1"><AlertCircle size={11}/>{errors[k]}</p> : null;

  if (submitted) return (
    <div className="text-center py-10 space-y-4">
      <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto"><CheckCircle2 size={32} className="text-emerald-600"/></div>
      <h3 className="text-xl font-black">{L(lang, "Ombi Limewasilishwa!", "Application Submitted!")}</h3>
      <p className="text-stone-500 text-sm">{L(lang, "Cheti cha mwanafunzi kitatolewa baada ya uthibitisho.", "Student certificate will be issued after verification.")}</p>
      <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 max-w-xs mx-auto space-y-1">
        <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">{L(lang, "Namba ya Mwanafunzi", "Student ID")}</p>
        <p className="text-lg font-black text-emerald-800 font-mono">{vals.generated_student_id}</p>
        <p className="text-xs text-emerald-600">{L(lang, "Hii ni namba yako ya maisha yote", "This is your lifetime student ID")}</p>
      </div>
    </div>
  );

  return (
    <div className="space-y-5">
      <ProgressFill progress={((stepIdx + 1) / STEPS.length) * 100}/>
      <div className="flex gap-1.5 justify-center flex-wrap">
        {STEPS.map((s, i) => (
          <div key={s.key} className={`px-2 py-1 rounded-full text-[10px] font-bold flex items-center gap-1 ${i <= stepIdx ? "bg-emerald-100 text-emerald-700" : "bg-stone-100 text-stone-400"}`}>
            {i < stepIdx && <Check size={10}/>}{lang === "sw" ? s.sw : s.en}
          </div>
        ))}
      </div>

      {/* ── MODE SELECTION ── */}
      {step === "mode" && (
        <div className="space-y-4">
          <div className={secHdr}><p className="font-bold text-emerald-800 text-sm flex items-center gap-2"><User size={15}/>{L(lang, "TAARIFA ZA MWANAFUNZI", "STUDENT INFORMATION")}</p>
            <p className="text-xs text-emerald-600 mt-1">{L(lang, "Chagua njia ya kuingiza taarifa za mwanafunzi", "Choose how to enter student details")}</p>
          </div>
          {errors.mode && <p className="text-red-500 text-xs flex items-center gap-1"><AlertCircle size={11}/>{errors.mode}</p>}
          <div className="space-y-3">
            {/* Option 1: Self */}
            <button type="button" onClick={fillSelf} className={`w-full p-4 rounded-2xl border-2 text-left transition-all ${vals.input_mode === "self" ? "bg-emerald-50 border-emerald-500" : "bg-white border-stone-200 hover:border-emerald-300"}`}>
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center shrink-0"><User size={18} className="text-emerald-600"/></div>
                <div>
                  <p className="font-black text-stone-900 text-sm">{L(lang, "Mimi Mwenyewe ndiye Mwanafunzi", "I am the Student")}</p>
                  <p className="text-xs text-stone-500 mt-0.5">{L(lang, "Taarifa zako zitajazwa kiotomatiki kutoka kwenye profaili yako", "Your details will be auto-filled from your profile")}</p>
                  {userProfile && <p className="text-xs text-emerald-600 font-bold mt-1">→ {fullName}</p>}
                </div>
              </div>
            </button>

            {/* Option 2: Manual */}
            <button type="button" onClick={() => { set("input_mode", "manual"); setStep("mwanafunzi"); }} className={`w-full p-4 rounded-2xl border-2 text-left transition-all ${vals.input_mode === "manual" ? "bg-blue-50 border-blue-500" : "bg-white border-stone-200 hover:border-blue-300"}`}>
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center shrink-0"><FileText size={18} className="text-blue-600"/></div>
                <div>
                  <p className="font-black text-stone-900 text-sm">{L(lang, "Jaza Taarifa za Mtu Mwingine (Ndugu / Mwanao)", "Enter Details Manually (Relative / Child)")}</p>
                  <p className="text-xs text-stone-500 mt-0.5">{L(lang, "Mzazi au mlezi anajaza taarifa za mwanafunzi mwingine", "Parent or guardian fills in another student's details")}</p>
                </div>
              </div>
            </button>

            {/* Option 3: Search by CT ID */}
            <button type="button" onClick={() => set("input_mode", "search")} className={`w-full p-4 rounded-2xl border-2 text-left transition-all ${vals.input_mode === "search" ? "bg-purple-50 border-purple-500" : "bg-white border-stone-200 hover:border-purple-300"}`}>
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-purple-100 flex items-center justify-center shrink-0"><Search size={18} className="text-purple-600"/></div>
                <div>
                  <p className="font-black text-stone-900 text-sm">{L(lang, "Tafuta kwa CT ID", "Search by CT ID")}</p>
                  <p className="text-xs text-stone-500 mt-0.5">{L(lang, "Mwanafunzi amesajiliwa kwenye E-Mtaa — tafuta kwa namba yake ya CT", "Student is registered on E-Mtaa — search by their CT number")}</p>
                </div>
              </div>
            </button>

            {/* Search box */}
            {vals.input_mode === "search" && (
              <div className="space-y-3">
                <div className="flex gap-2">
                  <input value={searchQuery} onChange={e => setSearchQuery(e.target.value)} onKeyDown={e => e.key === "Enter" && handleSearch()} className="flex-1 px-4 py-3 border border-stone-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-purple-500" placeholder="CT-XXXXXX"/>
                  <button type="button" onClick={handleSearch} disabled={searching} className="px-4 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-xl font-bold text-sm disabled:opacity-50">
                    {searching ? <Loader2 size={16} className="animate-spin"/> : <Search size={16}/>}
                  </button>
                </div>
                {searchResult && (
                  <div className="bg-purple-50 border border-purple-200 rounded-xl p-4 space-y-2">
                    <p className="font-black text-purple-800">{searchResult.name}</p>
                    <p className="text-xs text-purple-600">CT: {searchResult.ct_id} · NIDA: {searchResult.nida}</p>
                    <button type="button" onClick={() => setStep("mwanafunzi")} className="w-full py-2 bg-purple-600 text-white rounded-xl font-bold text-sm">
                      {L(lang, "Tumia Taarifa Hizi →", "Use These Details →")}
                    </button>
                  </div>
                )}
                {!searching && searchQuery && !searchResult && (
                  <div className="bg-stone-50 border border-stone-200 rounded-xl p-3 text-center">
                    <p className="text-xs text-stone-500">{L(lang, "Hakuna mtumiaji aliyepatikana. Jaza taarifa mwenyewe.", "No user found. Fill in details manually.")}</p>
                    <button type="button" onClick={() => { set("input_mode", "manual"); setStep("mwanafunzi"); }} className="mt-2 text-xs font-bold text-emerald-600 underline">{L(lang, "Jaza mwenyewe →", "Fill manually →")}</button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── STUDENT DETAILS ── */}
      {step === "mwanafunzi" && (
        <div className="space-y-4">
          <div className={secHdr}>
            <p className="font-bold text-emerald-800 text-sm flex items-center gap-2"><User size={15}/>{L(lang, "TAARIFA ZA MWANAFUNZI", "STUDENT DETAILS")}</p>
            {vals.input_mode === "self" && <p className="text-xs text-emerald-600 mt-1">{L(lang, "✓ Taarifa zimejazwa kutoka profaili yako — rekebisha ikiwa si sahihi", "✓ Pre-filled from your profile — edit if incorrect")}</p>}
          </div>

          {/* Photo upload */}
          <div className="flex flex-col items-center gap-3">
            <p className="text-xs font-black text-stone-600 uppercase tracking-wider self-start">{L(lang, "Picha ya Mwanafunzi *", "Student Photo *")}</p>
            {vals.student_photo ? (
              <div className="relative w-28 h-36">
                <img src={vals.student_photo} alt="student" className="w-28 h-36 object-cover rounded-2xl border-4 border-emerald-200 shadow-lg"/>
                <button type="button" onClick={() => set("student_photo", "")} className="absolute -top-2 -right-2 w-7 h-7 bg-red-500 text-white rounded-full flex items-center justify-center shadow-lg"><X size={12}/></button>
              </div>
            ) : (
              <label className="w-28 h-36 border-2 border-dashed border-emerald-300 rounded-2xl flex flex-col items-center justify-center cursor-pointer hover:border-emerald-500 hover:bg-emerald-50 transition-all">
                <Camera size={24} className="text-stone-400 mb-1"/>
                <span className="text-[10px] text-stone-400 font-bold text-center px-2">{L(lang, "Pakia picha ya pasipoti", "Upload passport photo")}</span>
                <input type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) handlePhotoUpload(f); e.target.value = ""; }}/>
              </label>
            )}
            <p className="text-[10px] text-stone-400">{L(lang, "Picha ya mwili wa juu (passport style)", "Upper body photo (passport style)")}</p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={lbl}>{L(lang, "Jina la Kwanza *", "First Name *")}</label>
              <input value={vals.student_first} onChange={e => { set("student_first", e.target.value); clrErr("student_first"); }} className={inputCls("student_first")} placeholder={L(lang, "Jina la kwanza", "First name")}/>
              <ErrMsg k="student_first"/>
            </div>
            <div>
              <label className={lbl}>{L(lang, "Jina la Mwisho *", "Last Name *")}</label>
              <input value={vals.student_last} onChange={e => { set("student_last", e.target.value); clrErr("student_last"); }} className={inputCls("student_last")} placeholder={L(lang, "Jina la mwisho", "Last name")}/>
              <ErrMsg k="student_last"/>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={lbl}>{L(lang, "Tarehe ya Kuzaliwa *", "Date of Birth *")}</label>
              <input type="date" value={vals.student_dob} onChange={e => { set("student_dob", e.target.value); clrErr("student_dob"); }} className={inputCls("student_dob")}/>
              <ErrMsg k="student_dob"/>
            </div>
            <div>
              <label className={lbl}>{L(lang, "Jinsia *", "Sex *")}</label>
              <select value={vals.student_sex} onChange={e => { set("student_sex", e.target.value); clrErr("student_sex"); }} className={inputCls("student_sex")}>
                <option value="">{L(lang, "-- Chagua --", "-- Select --")}</option>
                <option value="M">{L(lang, "Mvulana (Male)", "Male")}</option>
                <option value="F">{L(lang, "Msichana (Female)", "Female")}</option>
              </select>
              <ErrMsg k="student_sex"/>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={lbl}>NIDA</label>
              <input value={vals.student_nida} onChange={e => set("student_nida", e.target.value)} className={inputCls()} placeholder="20XXXXXXXXXXXXXXXXX"/>
            </div>
            <div>
              <label className={lbl}>{L(lang, "Simu", "Phone")}</label>
              <input value={vals.student_phone} onChange={e => set("student_phone", e.target.value)} className={inputCls()} placeholder="+255 7XX XXX XXX"/>
            </div>
          </div>

          {/* Address */}
          <div>
            <label className={lbl}>{L(lang, "Mkoa wa Makazi *", "Home Region *")}</label>
            <select value={vals.student_region} onChange={e => { set("student_region", e.target.value); set("student_district", ""); set("student_ward", ""); clrErr("student_region"); }} className={inputCls("student_region")}>
              <option value="">{L(lang, "-- Chagua mkoa --", "-- Select region --")}</option>
              {regions.map(r => <option key={r} value={r}>{r}</option>)}
            </select>
            <ErrMsg k="student_region"/>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={lbl}>{L(lang, "Wilaya", "District")}</label>
              <select value={vals.student_district} onChange={e => { set("student_district", e.target.value); set("student_ward", ""); }} className={inputCls()} disabled={!vals.student_region}>
                <option value="">{L(lang, "-- Wilaya --", "-- District --")}</option>
                {districts.map(d => <option key={d} value={d}>{d}</option>)}
              </select>
            </div>
            <div>
              <label className={lbl}>{L(lang, "Kata", "Ward")}</label>
              <select value={vals.student_ward} onChange={e => set("student_ward", e.target.value)} className={inputCls()} disabled={!vals.student_district}>
                <option value="">{L(lang, "-- Kata --", "-- Ward --")}</option>
                {wards.map(w => <option key={w} value={w}>{w}</option>)}
              </select>
            </div>
          </div>

          {/* Purpose */}
          <div>
            <label className={lbl}>{L(lang, "Sababu ya Cheti *", "Certificate Purpose *")}</label>
            <select value={vals.purpose} onChange={e => { set("purpose", e.target.value); clrErr("purpose"); }} className={inputCls("purpose")}>
              <option value="">{L(lang, "-- Chagua sababu --", "-- Select purpose --")}</option>
              {PURPOSE.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
            </select>
            <ErrMsg k="purpose"/>
          </div>
          {vals.purpose === "NYINGINE" && (
            <div>
              <label className={lbl}>{L(lang, "Eleza Sababu", "Describe Purpose")}</label>
              <input value={vals.purpose_other} onChange={e => set("purpose_other", e.target.value)} className={inputCls()}/>
            </div>
          )}
        </div>
      )}

      {/* ── SCHOOL DETAILS ── */}
      {step === "shule" && (
        <div className="space-y-4">
          <div className={secHdr}><p className="font-bold text-emerald-800 text-sm flex items-center gap-2"><BookOpen size={15}/>{L(lang, "TAARIFA ZA SHULE / CHUO", "SCHOOL / INSTITUTION")}</p></div>

          <div>
            <label className={lbl}>{L(lang, "Jina la Shule / Chuo *", "School / Institution Name *")}</label>
            <input value={vals.school_name} onChange={e => { set("school_name", e.target.value); clrErr("school_name"); }} className={inputCls("school_name")} placeholder={L(lang, "Mfano: Shule ya Msingi Jangwani", "E.g. Jangwani Primary School")}/>
            <ErrMsg k="school_name"/>
          </div>

          <div>
            <label className={lbl}>{L(lang, "Ngazi ya Elimu *", "Education Level *")}</label>
            <select value={vals.education_level} onChange={e => { set("education_level", e.target.value); set("class_year", ""); clrErr("education_level"); }} className={inputCls("education_level")}>
              <option value="">{L(lang, "-- Chagua ngazi --", "-- Select level --")}</option>
              {EDUCATION_LEVELS.map(l => <option key={l.value} value={l.value}>{l.label}</option>)}
            </select>
            <ErrMsg k="education_level"/>
          </div>

          {/* Class dropdown — triggered by education level */}
          {vals.education_level && (
            <div>
              <label className={lbl}>{L(lang, "Darasa / Mwaka wa Masomo *", "Class / Academic Year *")}</label>
              <select value={vals.class_year} onChange={e => { set("class_year", e.target.value); set("class_year_manual", ""); clrErr("class_year"); }} className={inputCls("class_year")}>
                <option value="">{L(lang, "-- Chagua darasa --", "-- Select class --")}</option>
                {classOptions.map(c => <option key={c} value={c}>{c}</option>)}
                <option value="OTHER">{L(lang, "Nyingine — Jaza mwenyewe", "Other — Enter manually")}</option>
              </select>
              <ErrMsg k="class_year"/>
            </div>
          )}
          {vals.class_year === "OTHER" && (
            <div>
              <label className={lbl}>{L(lang, "Ingiza Darasa / Mwaka", "Enter Class / Year")}</label>
              <input value={vals.class_year_manual} onChange={e => set("class_year_manual", e.target.value)} className={inputCls()} placeholder={L(lang, "Mfano: Darasa 8 / Semester 3", "E.g. Class 8 / Semester 3")}/>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={lbl}>{L(lang, "Namba ya Taifa (NECTA/TCU)", "National No. (NECTA/TCU)")}</label>
              <input value={vals.student_number} onChange={e => set("student_number", e.target.value)} className={inputCls()} placeholder="S0XXX/XXXX"/>
            </div>
            <div>
              <label className={lbl}>{L(lang, "Namba ya Madhehebu", "Admission Number")}</label>
              <input value={vals.admission_number} onChange={e => set("admission_number", e.target.value)} className={inputCls()} placeholder="ADM/XXXX"/>
            </div>
          </div>

          {/* School location */}
          <div>
            <label className={lbl}>{L(lang, "Mkoa wa Shule", "School Region")}</label>
            <select value={vals.school_region} onChange={e => { set("school_region", e.target.value); set("school_district", ""); }} className={inputCls()}>
              <option value="">{L(lang, "-- Chagua mkoa --", "-- Select region --")}</option>
              {schoolRegions.map(r => <option key={r} value={r}>{r}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={lbl}>{L(lang, "Kikundi cha Damu", "Blood Group")}</label>
              <select value={vals.blood_group} onChange={e => set("blood_group", e.target.value)} className={inputCls()}>
                <option value="">{L(lang, "-- Chagua --", "-- Select --")}</option>
                {["A+","A-","B+","B-","AB+","AB-","O+","O-"].map(bg => <option key={bg} value={bg}>{bg}</option>)}
              </select>
            </div>
            <div>
              <label className={lbl}>{L(lang, "Tarehe ya Kuandikishwa", "Enrollment Date")}</label>
              <input type="date" value={vals.enrollment_date} onChange={e => set("enrollment_date", e.target.value)} className={inputCls()}/>
            </div>
          </div>
          <div>
            <label className={lbl}>{L(lang, "Uraia", "Nationality")}</label>
            <input value={vals.nationality} onChange={e => set("nationality", e.target.value)} className={inputCls()} placeholder={L(lang, "Mfano: Mtanzania", "E.g. Tanzanian")}/>
          </div>
          <div>
            <label className={lbl}>{L(lang, "Wilaya ya Shule", "School District")}</label>
            <select value={vals.school_district} onChange={e => set("school_district", e.target.value)} className={inputCls()} disabled={!vals.school_region}>
              <option value="">{L(lang, "-- Chagua wilaya --", "-- Select district --")}</option>
              {schoolDistricts.map(d => <option key={d} value={d}>{d}</option>)}
            </select>
          </div>
        </div>
      )}

      {/* ── PARENT / GUARDIAN ── */}
      {step === "mzazi" && (
        <div className="space-y-4">
          <div className={secHdr}>
            <p className="font-bold text-emerald-800 text-sm">{L(lang, "MZAZI / MLEZI", "PARENT / GUARDIAN")}</p>
            {(() => {
              const age = vals.student_dob ? Math.floor((Date.now() - new Date(vals.student_dob).getTime()) / (365.25 * 24 * 60 * 60 * 1000)) : 99;
              return age < 18 ? (
                <div className="flex items-center gap-2 mt-2 bg-red-50 border border-red-200 rounded-xl p-2">
                  <AlertCircle size={13} className="text-red-500 shrink-0"/>
                  <p className="text-xs text-red-700 font-bold">{L(lang, "Mwanafunzi ana umri chini ya miaka 18 — taarifa za mzazi/mlezi ni lazima", "Student is under 18 — parent/guardian details are mandatory")}</p>
                </div>
              ) : (
                <p className="text-xs text-emerald-600 mt-1">{L(lang, "Inahitajika kwa wanafunzi chini ya miaka 18", "Required for students under 18")}</p>
              );
            })()}
          </div>

          {/* Toggle: use profile or different person */}
          <div className="grid grid-cols-2 gap-3">
            <button type="button" onClick={() => {
              set("parent_use_profile", true);
              set("parent_name", parentFullName);
              set("parent_nida", userProfile?.nida_number || "");
              set("parent_phone", userProfile?.phone || "");
            }} className={`py-3 rounded-xl border-2 text-xs font-bold transition-all ${vals.parent_use_profile ? "bg-emerald-50 border-emerald-500 text-emerald-700" : "bg-white border-stone-200 text-stone-600"}`}>
              {L(lang, "✓ Mimi ni Mzazi / Mlezi", "✓ I am the Parent")}
            </button>
            <button type="button" onClick={() => {
              set("parent_use_profile", false);
              set("parent_name", ""); set("parent_nida", ""); set("parent_phone", "");
            }} className={`py-3 rounded-xl border-2 text-xs font-bold transition-all ${!vals.parent_use_profile ? "bg-blue-50 border-blue-500 text-blue-700" : "bg-white border-stone-200 text-stone-600"}`}>
              {L(lang, "Mzazi Mwingine", "Different Parent")}
            </button>
          </div>

          <div>
            <label className={lbl}>{L(lang, "Jina Kamili la Mzazi / Mlezi", "Parent / Guardian Full Name")}</label>
            <input value={vals.parent_name} onChange={e => set("parent_name", e.target.value)} className={inputCls()} readOnly={vals.parent_use_profile} style={vals.parent_use_profile ? { background: "#f9fafb" } : {}}/>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={lbl}>NIDA</label>
              <input value={vals.parent_nida} onChange={e => set("parent_nida", e.target.value)} className={inputCls()} readOnly={vals.parent_use_profile} style={vals.parent_use_profile ? { background: "#f9fafb" } : {}}/>
            </div>
            <div>
              <label className={lbl}>{L(lang, "Simu", "Phone")}</label>
              <input value={vals.parent_phone} onChange={e => set("parent_phone", e.target.value)} className={inputCls()} readOnly={vals.parent_use_profile} style={vals.parent_use_profile ? { background: "#f9fafb" } : {}}/>
            </div>
          </div>
          <div>
            <label className={lbl}>{L(lang, "Uhusiano na Mwanafunzi", "Relationship to Student")}</label>
            <select value={vals.parent_relationship} onChange={e => set("parent_relationship", e.target.value)} className={inputCls()}>
              <option value="MAMA">{L(lang, "Mama (Mother)", "Mother")}</option>
              <option value="BABA">{L(lang, "Baba (Father)", "Father")}</option>
              <option value="MLEZI">{L(lang, "Mlezi (Guardian)", "Guardian")}</option>
              <option value="NDUGU">{L(lang, "Ndugu / Shangazi / Mjomba", "Relative")}</option>
            </select>
          </div>
          <SignaturePad value={vals.signature} onChange={v => set("signature", v || "")} lang={lang} label={L(lang, "Saini ya Mwanafunzi / Mzazi", "Student / Parent Signature")}/>
        </div>
      )}

      {/* ── PREVIEW ── */}
      {step === "preview" && (
        <div className="space-y-4">
          <div className={secHdr}><p className="font-bold text-emerald-800 text-sm flex items-center gap-2"><Eye size={15}/>{L(lang, "HAKIKI — ID YA MWANAFUNZI", "PREVIEW — STUDENT ID")}</p></div>

          {/* ID Card Preview */}
          <div className="bg-gradient-to-br from-emerald-700 to-teal-800 rounded-2xl p-4 text-white shadow-xl">
            <div className="flex items-start gap-3">
              {vals.student_photo ? (
                <img src={vals.student_photo} alt="student" className="w-16 h-20 object-cover rounded-xl border-2 border-white/40 shrink-0"/>
              ) : (
                <div className="w-16 h-20 bg-white/20 rounded-xl flex items-center justify-center shrink-0"><User size={28} className="text-white/60"/></div>
              )}
              <div className="flex-1 min-w-0">
                <p className="text-[9px] font-black tracking-widest opacity-70">JAMHURI YA MUUNGANO WA TANZANIA</p>
                <p className="text-[9px] font-bold opacity-70">CHETI CHA MWANAFUNZI</p>
                <p className="font-black text-base mt-1 leading-tight">{vals.student_first} {vals.student_last}</p>
                <p className="text-[10px] opacity-80 mt-0.5">{EDUCATION_LEVELS.find(e => e.value === vals.education_level)?.label}</p>
                <p className="text-[10px] opacity-80">{vals.school_name}</p>
              </div>
            </div>
            <div className="mt-3 pt-3 border-t border-white/20 space-y-1">
              <div className="flex justify-between">
                <span className="text-[9px] opacity-70">{L(lang, "NAMBA YA MWANAFUNZI", "STUDENT ID")}</span>
                <span className="text-[10px] font-black font-mono">{vals.generated_student_id || L(lang, "Itatolewa baada ya kukubaliwa", "Generated on approval")}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[9px] opacity-70">{L(lang, "DARASA", "CLASS")}</span>
                <span className="text-[10px] font-bold">{vals.class_year === "OTHER" ? vals.class_year_manual : vals.class_year}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[9px] opacity-70">{L(lang, "MKOA", "REGION")}</span>
                <span className="text-[10px] font-bold">{vals.student_region}</span>
              </div>
            </div>
          </div>

          <div className="bg-white border border-stone-200 rounded-xl divide-y divide-stone-100">
            {[["Mwanafunzi / Student", `${vals.student_first} ${vals.student_last}`], ["NIDA", vals.student_nida || "—"], ["Mkoa / Region", vals.student_region], ["Shule / School", vals.school_name], ["Ngazi / Level", EDUCATION_LEVELS.find(l => l.value === vals.education_level)?.label || ""], ["Darasa / Class", vals.class_year === "OTHER" ? vals.class_year_manual : vals.class_year], ["Mzazi / Parent", vals.parent_name || "—"], ["Sababu / Purpose", PURPOSE.find(p => p.value === vals.purpose)?.label || ""], ["Ada / Fee", `TSh ${SERVICE_FEE.toLocaleString()}`]].map(([k, v]) => (
              <div key={k} className="flex justify-between px-4 py-2.5 text-sm"><span className="text-stone-500">{k}</span><span className="font-bold text-right max-w-[55%]">{v || "—"}</span></div>
            ))}
          </div>

          <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 text-xs text-emerald-700">
            <p className="font-bold">{L(lang, "ℹ️ Kuhusu Namba ya ID", "ℹ️ About Student ID")}</p>
            <p className="mt-1">{L(lang, `TSID ni mfumo wa kitaifa wa utambulisho wa wanafunzi. Namba (mfano: TSID-2026-A1B2C3) ni ya maisha yote na inatumika kuhusu elimu, NHIF, mikopo na huduma zote za serikali.`, `TSID is Tanzania's nationwide student ID system. The number (e.g. TSID-2026-A1B2C3) is for lifetime use across education, NHIF, loans and all government services.`)}</p>
          </div>
        </div>
      )}

      <div className="flex gap-3 pt-2">
        {stepIdx > 0 && <button type="button" onClick={prev} className="flex items-center gap-2 px-4 py-3 border border-stone-200 rounded-xl font-bold text-stone-600 hover:bg-stone-50 transition-colors"><ArrowLeft size={16}/>{L(lang, "Rudi", "Back")}</button>}
        {step !== "mode" && step !== "preview" && (
          <button type="button" onClick={next} className="flex-1 flex items-center justify-center gap-2 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl transition-colors"><ArrowRight size={16}/>{L(lang, "Endelea", "Continue")}</button>
        )}
        {step === "mode" && vals.input_mode === "search" && !searchResult && (
          <button type="button" onClick={next} className="flex-1 py-3 bg-stone-200 text-stone-500 font-bold rounded-xl text-sm cursor-not-allowed" disabled>{L(lang, "Tafuta kwanza...", "Search first...")}</button>
        )}
        {step === "preview" && (
          <button type="button" onClick={handleSubmit} disabled={submitting || isLoading} className="flex-1 flex items-center justify-center gap-2 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl disabled:opacity-50 transition-colors">{submitting ? <Loader2 size={16} className="animate-spin"/> : <FileText size={16}/>}{L(lang, "Wasilisha Ombi", "Submit Application")}</button>
        )}
      </div>
    </div>
  );
};
export default ChetiMwanafunziForm;
