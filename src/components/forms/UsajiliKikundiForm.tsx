/**
 * Usajili wa Kikundi / Chama — Group/Association Registration
 * Fee: TSh 5,000
 * Steps: Kikundi → Mahali → Viongozi → Wanachama → Benki → Preview
 */
import React, { useState, useMemo } from "react";
import {
  Loader2, CheckCircle2, ArrowLeft, ArrowRight, AlertCircle,
  FileText, Check, Eye, Users, MapPin, Building2, Plus, X, User
} from "lucide-react";
import { FormProps } from "./types";
import { ProgressFill } from "../ui/ProgressFill";
import { SignaturePad } from "@/components/ui/SignaturePad";
import { TANZANIA_ADDRESS_DATA } from "@/lib/addressData";

const SERVICE_FEE = 5000;
const L = (lang: string, sw: string, en: string) => lang === "sw" ? sw : en;

const GROUP_TYPES = [
  { value: "VIKOBA", label: "Vikoba / SACCOS (Savings & Credit Group)" },
  { value: "WANAWAKE", label: "Kikundi cha Wanawake (Women's Group)" },
  { value: "VIJANA", label: "Kikundi cha Vijana (Youth Group)" },
  { value: "WAKULIMA", label: "Kikundi cha Wakulima (Farmers' Group)" },
  { value: "BIASHARA", label: "Chama cha Biashara (Business Association)" },
  { value: "DINI", label: "Kikundi cha Dini (Religious Group)" },
  { value: "MAZINGIRA", label: "Kikundi cha Mazingira (Environment Group)" },
  { value: "SANAA", label: "Kikundi cha Sanaa / Michezo (Arts / Sports)" },
  { value: "AFYA", label: "Kikundi cha Afya (Health Group)" },
  { value: "NYINGINE", label: "Nyingine (Other)" },
];

const BANKS = [
  "NMB Bank", "CRDB Bank", "Stanbic Bank", "Standard Chartered", "KCB Bank",
  "Absa Bank", "Equity Bank", "NBC Bank", "Azania Bank", "Diamond Trust Bank",
  "People's Bank of Zanzibar", "Mkombozi Bank", "Akiba Commercial Bank",
  "Tanzania Commercial Bank (TCB)", "FINCA Tanzania", "Nyingine (Other)",
];

type Step = "kikundi" | "mahali" | "viongozi" | "wanachama" | "benki" | "preview";

interface Leader {
  first_name: string; last_name: string;
  nida: string; ct_id: string; phone: string; role: string;
}

interface Member {
  first_name: string; last_name: string;
  nida: string; ct_id: string; phone: string;
}

interface FormVals {
  // Group info
  group_name: string; group_type: string; group_type_other: string;
  group_purpose: string; formation_date: string; members_count: string;
  // Location
  region: string; district: string; ward: string; street: string;
  meeting_location_detail: string;
  // Leaders
  leaders: Leader[];
  // Members
  members: Member[];
  // Bank
  bank_name: string; bank_branch: string;
  account_number: string; account_name: string;
  // Signature
  signature: string;
}

const emptyLeader = (role: string): Leader => ({ first_name: "", last_name: "", nida: "", ct_id: "", phone: "", role });
const emptyMember = (): Member => ({ first_name: "", last_name: "", nida: "", ct_id: "", phone: "" });

export const UsajiliKikundiForm: React.FC<FormProps> = ({ onSubmit, isLoading, lang = "sw", userProfile }) => {
  const [step, setStep] = useState<Step>("kikundi");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const [vals, setVals] = useState<FormVals>({
    group_name: "", group_type: "", group_type_other: "", group_purpose: "",
    formation_date: "", members_count: "10",
    region: userProfile?.region || "", district: userProfile?.district || "",
    ward: userProfile?.ward || "", street: userProfile?.street || "",
    meeting_location_detail: "",
    leaders: [
      emptyLeader(L(lang, "Mwenyekiti", "Chairperson")),
      emptyLeader(L(lang, "Katibu", "Secretary")),
      emptyLeader(L(lang, "Mweka Hazina", "Treasurer")),
    ],
    members: [emptyMember(), emptyMember(), emptyMember()],
    bank_name: "", bank_branch: "", account_number: "", account_name: "",
    signature: "",
  });

  const set = (k: keyof FormVals, v: string) => setVals(p => ({ ...p, [k]: v }));
  const setLeader = (i: number, k: keyof Leader, v: string) =>
    setVals(p => { const l = [...p.leaders]; l[i] = { ...l[i], [k]: v }; return { ...p, leaders: l }; });
  const setMember = (i: number, k: keyof Member, v: string) =>
    setVals(p => { const m = [...p.members]; m[i] = { ...m[i], [k]: v }; return { ...p, members: m }; });
  const addMember = () => setVals(p => ({ ...p, members: [...p.members, emptyMember()] }));
  const removeMember = (i: number) => setVals(p => ({ ...p, members: p.members.filter((_, idx) => idx !== i) }));
  const clrErr = (k: string) => setErrors(p => { const n = { ...p }; delete n[k]; return n; });

  // Address cascading
  const regions = useMemo(() => TANZANIA_ADDRESS_DATA.map(r => r.name), []);
  const districts = useMemo(() => {
    const r = TANZANIA_ADDRESS_DATA.find(r => r.name === vals.region);
    return r ? r.districts.map(d => d.name) : [];
  }, [vals.region]);
  const wards = useMemo(() => {
    const r = TANZANIA_ADDRESS_DATA.find(r => r.name === vals.region);
    const d = r?.districts.find(d => d.name === vals.district);
    return d ? d.wards : [];
  }, [vals.region, vals.district]);

  const STEPS: { key: Step; sw: string; en: string }[] = [
    { key: "kikundi", sw: "Kikundi", en: "Group" },
    { key: "mahali", sw: "Mahali", en: "Location" },
    { key: "viongozi", sw: "Viongozi", en: "Leaders" },
    { key: "wanachama", sw: "Wanachama", en: "Members" },
    { key: "benki", sw: "Benki", en: "Bank" },
    { key: "preview", sw: "Hakiki", en: "Preview" },
  ];
  const stepIdx = STEPS.findIndex(s => s.key === step);

  const validate = (): boolean => {
    const e: Record<string, string> = {};
    if (step === "kikundi") {
      if (!vals.group_name.trim()) e.group_name = L(lang, "Jina la kikundi linahitajika", "Group name required");
      if (!vals.group_type) e.group_type = L(lang, "Aina ya kikundi inahitajika", "Group type required");
      if (!vals.group_purpose.trim()) e.group_purpose = L(lang, "Madhumuni yanahitajika", "Purpose required");
    }
    if (step === "mahali") {
      if (!vals.region) e.region = L(lang, "Mkoa unahitajika", "Region required");
      if (!vals.district) e.district = L(lang, "Wilaya inahitajika", "District required");
      if (!vals.ward) e.ward = L(lang, "Kata inahitajika", "Ward required");
    }
    if (step === "viongozi") {
      vals.leaders.forEach((l, i) => {
        if (!l.first_name.trim()) e[`lfn_${i}`] = L(lang, "Jina la kwanza linahitajika", "First name required");
        if (!l.last_name.trim()) e[`lln_${i}`] = L(lang, "Jina la mwisho linahitajika", "Last name required");
        if (!l.nida.trim()) e[`lnida_${i}`] = L(lang, "NIDA inahitajika", "NIDA required");
        if (!l.ct_id.trim()) e[`lct_${i}`] = L(lang, "CT ID inahitajika — kiongozi lazima awe mwanachama wa E-Mtaa", "CT ID required — leader must be registered on E-Mtaa");
        if (!l.phone.trim()) e[`lphone_${i}`] = L(lang, "Simu inahitajika", "Phone required");
      });
    }
    if (step === "wanachama") {
      vals.members.forEach((m, i) => {
        if (!m.first_name.trim()) e[`mfn_${i}`] = L(lang, "Jina linahitajika", "Name required");
        if (!m.ct_id.trim()) e[`mct_${i}`] = L(lang, "CT ID inahitajika", "CT ID required");
      });
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const next = () => { if (validate()) { const n = STEPS[stepIdx + 1]; if (n) setStep(n.key as Step); } };
  const prev = () => { const p = STEPS[stepIdx - 1]; if (p) setStep(p.key as Step); };

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      await onSubmit({
        ...vals,
        leaders: JSON.stringify(vals.leaders),
        members: JSON.stringify(vals.members),
        service_fee: SERVICE_FEE, total_fee: SERVICE_FEE,
      });
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
      <h3 className="text-xl font-black">{L(lang, "Usajili Umefanikiwa!", "Registration Submitted!")}</h3>
      <p className="text-stone-500 text-sm">{L(lang, "Kikundi kitasajiliwa rasmi baada ya ukaguzi na ofisi ya kata.", "Group will be officially registered after ward office review.")}</p>
      <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 max-w-xs mx-auto">
        <p className="font-bold text-emerald-700">{vals.group_name}</p>
        <p className="text-xs text-emerald-600">{vals.members.length + vals.leaders.length} {L(lang, "wanachama walisajiliwa", "members registered")}</p>
        <p className="text-xs text-emerald-600 mt-1">Ada: TSh {SERVICE_FEE.toLocaleString()}</p>
      </div>
    </div>
  );

  return (
    <div className="space-y-5">
      <ProgressFill progress={((stepIdx + 1) / STEPS.length) * 100}/>
      <div className="flex gap-1 justify-center flex-wrap">
        {STEPS.map((s, i) => (
          <div key={s.key} className={`px-2 py-1 rounded-full text-[9px] font-bold flex items-center gap-0.5 ${i <= stepIdx ? "bg-emerald-100 text-emerald-700" : "bg-stone-100 text-stone-400"}`}>
            {i < stepIdx && <Check size={9}/>}{lang === "sw" ? s.sw : s.en}
          </div>
        ))}
      </div>

      {/* ── STEP 1: Group info ── */}
      {step === "kikundi" && (
        <div className="space-y-4">
          <div className={secHdr}><p className="font-bold text-emerald-800 text-sm flex items-center gap-2"><Users size={15}/>{L(lang, "TAARIFA ZA KIKUNDI", "GROUP INFORMATION")}</p></div>
          <div>
            <label className={lbl}>{L(lang, "Jina la Kikundi / Chama *", "Group / Association Name *")}</label>
            <input value={vals.group_name} onChange={e => { set("group_name", e.target.value); clrErr("group_name"); }} className={inputCls("group_name")} placeholder={L(lang, "Mfano: Kikundi cha Akiba Jijini", "E.g. City Savings Group")}/>
            <ErrMsg k="group_name"/>
          </div>
          <div>
            <label className={lbl}>{L(lang, "Aina ya Kikundi *", "Group Type *")}</label>
            <select value={vals.group_type} onChange={e => { set("group_type", e.target.value); clrErr("group_type"); }} className={inputCls("group_type")}>
              <option value="">{L(lang, "-- Chagua aina --", "-- Select type --")}</option>
              {GROUP_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
            <ErrMsg k="group_type"/>
          </div>
          {vals.group_type === "NYINGINE" && (
            <div>
              <label className={lbl}>{L(lang, "Eleza Aina", "Describe Type")}</label>
              <input value={vals.group_type_other} onChange={e => set("group_type_other", e.target.value)} className={inputCls()}/>
            </div>
          )}
          <div>
            <label className={lbl}>{L(lang, "Madhumuni ya Kikundi *", "Group Purpose *")}</label>
            <textarea value={vals.group_purpose} onChange={e => { set("group_purpose", e.target.value); clrErr("group_purpose"); }} rows={3} className={`${inputCls("group_purpose")} resize-none`} placeholder={L(lang, "Eleza madhumuni makuu ya kikundi...", "Describe the main objectives of the group...")}/>
            <ErrMsg k="group_purpose"/>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={lbl}>{L(lang, "Tarehe ya Kuanzishwa", "Formation Date")}</label>
              <input type="date" value={vals.formation_date} onChange={e => set("formation_date", e.target.value)} className={inputCls()}/>
            </div>
            <div>
              <label className={lbl}>{L(lang, "Jumla ya Wanachama", "Total Members")}</label>
              <input type="number" min="3" value={vals.members_count} onChange={e => set("members_count", e.target.value)} className={inputCls()}/>
            </div>
          </div>
        </div>
      )}

      {/* ── STEP 2: Location ── */}
      {step === "mahali" && (
        <div className="space-y-4">
          <div className={secHdr}><p className="font-bold text-emerald-800 text-sm flex items-center gap-2"><MapPin size={15}/>{L(lang, "MAHALI PA MIKUTANO", "MEETING LOCATION")}</p></div>
          <div>
            <label className={lbl}>{L(lang, "Mkoa *", "Region *")}</label>
            <select value={vals.region} onChange={e => { set("region", e.target.value); set("district", ""); set("ward", ""); clrErr("region"); }} className={inputCls("region")}>
              <option value="">{L(lang, "-- Chagua mkoa --", "-- Select region --")}</option>
              {regions.map(r => <option key={r} value={r}>{r}</option>)}
            </select>
            <ErrMsg k="region"/>
          </div>
          <div>
            <label className={lbl}>{L(lang, "Wilaya *", "District *")}</label>
            <select value={vals.district} onChange={e => { set("district", e.target.value); set("ward", ""); clrErr("district"); }} className={inputCls("district")} disabled={!vals.region}>
              <option value="">{L(lang, "-- Chagua wilaya --", "-- Select district --")}</option>
              {districts.map(d => <option key={d} value={d}>{d}</option>)}
            </select>
            <ErrMsg k="district"/>
          </div>
          <div>
            <label className={lbl}>{L(lang, "Kata *", "Ward *")}</label>
            <select value={vals.ward} onChange={e => { set("ward", e.target.value); clrErr("ward"); }} className={inputCls("ward")} disabled={!vals.district}>
              <option value="">{L(lang, "-- Chagua kata --", "-- Select ward --")}</option>
              {wards.map(w => <option key={w} value={w}>{w}</option>)}
            </select>
            <ErrMsg k="ward"/>
          </div>
          <div>
            <label className={lbl}>{L(lang, "Mtaa / Kijiji", "Street / Village")}</label>
            <input value={vals.street} onChange={e => set("street", e.target.value)} className={inputCls()} placeholder={L(lang, "Jina la mtaa au kijiji", "Street or village name")}/>
          </div>
          <div>
            <label className={lbl}>{L(lang, "Mahali Halisi pa Mikutano", "Exact Meeting Venue")}</label>
            <input value={vals.meeting_location_detail} onChange={e => set("meeting_location_detail", e.target.value)} className={inputCls()} placeholder={L(lang, "Mfano: Kanisa la Pasua, Jengo la Jumuiya, Ukumbi wa Kata...", "E.g. Pasua Church Hall, Community Center, Ward Hall...")}/>
          </div>
        </div>
      )}

      {/* ── STEP 3: Leaders — must have CT ID ── */}
      {step === "viongozi" && (
        <div className="space-y-5">
          <div className={secHdr}>
            <p className="font-bold text-emerald-800 text-sm flex items-center gap-2"><User size={15}/>{L(lang, "VIONGOZI VYA KIKUNDI", "GROUP LEADERS")}</p>
            <p className="text-xs text-emerald-600 mt-1">{L(lang, "Viongozi wote lazima wawe wamesajiliwa kwenye E-Mtaa na wana CT ID", "All leaders must be registered on E-Mtaa and have a CT ID")}</p>
          </div>
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 flex gap-2">
            <AlertCircle size={13} className="text-amber-500 shrink-0 mt-0.5"/>
            <p className="text-xs text-amber-700">{L(lang, "CT ID inapatikana kutoka kwa ofisi ya mtaa au akaunti ya E-Mtaa ya kiongozi husika.", "CT ID is obtained from the ward office or the leader's E-Mtaa account.")}</p>
          </div>
          {vals.leaders.map((leader, i) => (
            <div key={i} className="border border-stone-200 rounded-2xl p-4 space-y-3">
              <p className="text-xs font-black text-emerald-700 uppercase tracking-wide">{leader.role}</p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={lbl}>{L(lang, "Jina la Kwanza *", "First Name *")}</label>
                  <input value={leader.first_name} onChange={e => { setLeader(i, "first_name", e.target.value); clrErr(`lfn_${i}`); }} className={inputCls(`lfn_${i}`)} placeholder={L(lang, "Jina la kwanza", "First name")}/>
                  <ErrMsg k={`lfn_${i}`}/>
                </div>
                <div>
                  <label className={lbl}>{L(lang, "Jina la Mwisho *", "Last Name *")}</label>
                  <input value={leader.last_name} onChange={e => { setLeader(i, "last_name", e.target.value); clrErr(`lln_${i}`); }} className={inputCls(`lln_${i}`)} placeholder={L(lang, "Jina la mwisho", "Last name")}/>
                  <ErrMsg k={`lln_${i}`}/>
                </div>
              </div>
              <div>
                <label className={lbl}>{L(lang, "CT ID (Utambulisho wa Mkazi) *", "CT ID (Citizen ID) *")}</label>
                <input value={leader.ct_id} onChange={e => { setLeader(i, "ct_id", e.target.value.toUpperCase()); clrErr(`lct_${i}`); }} className={inputCls(`lct_${i}`)} placeholder="CT-XXXXXX"/>
                <ErrMsg k={`lct_${i}`}/>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={lbl}>NIDA *</label>
                  <input value={leader.nida} onChange={e => { setLeader(i, "nida", e.target.value); clrErr(`lnida_${i}`); }} className={inputCls(`lnida_${i}`)} placeholder="20XXXXXXXXXXXXXXXXX"/>
                  <ErrMsg k={`lnida_${i}`}/>
                </div>
                <div>
                  <label className={lbl}>{L(lang, "Simu *", "Phone *")}</label>
                  <input value={leader.phone} onChange={e => { setLeader(i, "phone", e.target.value); clrErr(`lphone_${i}`); }} className={inputCls(`lphone_${i}`)} placeholder="+255 7XX XXX XXX"/>
                  <ErrMsg k={`lphone_${i}`}/>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── STEP 4: Members ── */}
      {step === "wanachama" && (
        <div className="space-y-4">
          <div className={secHdr}>
            <p className="font-bold text-emerald-800 text-sm flex items-center gap-2"><Users size={15}/>{L(lang, "WANACHAMA WA KIKUNDI", "GROUP MEMBERS")}</p>
            <p className="text-xs text-emerald-600 mt-1">{L(lang, "Wanachama wote lazima wawe wamesajiliwa kwenye E-Mtaa", "All members must be registered on E-Mtaa")}</p>
          </div>
          <div className="bg-stone-50 border border-stone-200 rounded-xl p-3 flex justify-between items-center">
            <span className="text-xs font-bold text-stone-600">{L(lang, "Wanachama waliowekwa", "Members entered")}: {vals.members.length}</span>
            <span className="text-xs text-stone-500">{L(lang, "Jumla iliyotajwa", "Declared total")}: {vals.members_count}</span>
          </div>
          <div className="space-y-4">
            {vals.members.map((m, i) => (
              <div key={i} className="border border-stone-200 rounded-2xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-black text-stone-600">{L(lang, `Mwanachama #${i + 1}`, `Member #${i + 1}`)}</p>
                  {vals.members.length > 3 && (
                    <button type="button" onClick={() => removeMember(i)} className="p-1 text-red-400 hover:text-red-600 rounded-lg"><X size={14}/></button>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className={lbl}>{L(lang, "Jina la Kwanza *", "First Name *")}</label>
                    <input value={m.first_name} onChange={e => { setMember(i, "first_name", e.target.value); clrErr(`mfn_${i}`); }} className={inputCls(`mfn_${i}`)}/>
                    <ErrMsg k={`mfn_${i}`}/>
                  </div>
                  <div>
                    <label className={lbl}>{L(lang, "Jina la Mwisho", "Last Name")}</label>
                    <input value={m.last_name} onChange={e => setMember(i, "last_name", e.target.value)} className={inputCls()}/>
                  </div>
                </div>
                <div>
                  <label className={lbl}>{L(lang, "CT ID *", "CT ID *")}</label>
                  <input value={m.ct_id} onChange={e => { setMember(i, "ct_id", e.target.value.toUpperCase()); clrErr(`mct_${i}`); }} className={inputCls(`mct_${i}`)} placeholder="CT-XXXXXX"/>
                  <ErrMsg k={`mct_${i}`}/>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className={lbl}>NIDA</label>
                    <input value={m.nida} onChange={e => setMember(i, "nida", e.target.value)} className={inputCls()} placeholder="20XXXXXXXXXXXXXXXXX"/>
                  </div>
                  <div>
                    <label className={lbl}>{L(lang, "Simu", "Phone")}</label>
                    <input value={m.phone} onChange={e => setMember(i, "phone", e.target.value)} className={inputCls()} placeholder="+255 7XX XXX XXX"/>
                  </div>
                </div>
              </div>
            ))}
          </div>
          <button type="button" onClick={addMember} className="w-full py-3 border-2 border-dashed border-emerald-300 rounded-xl text-sm font-bold text-emerald-600 hover:bg-emerald-50 flex items-center justify-center gap-2 transition-colors">
            <Plus size={16}/>{L(lang, "Ongeza Mwanachama", "Add Member")}
          </button>
        </div>
      )}

      {/* ── STEP 5: Bank details ── */}
      {step === "benki" && (
        <div className="space-y-4">
          <div className={secHdr}><p className="font-bold text-emerald-800 text-sm flex items-center gap-2"><Building2 size={15}/>{L(lang, "TAARIFA ZA BENKI YA KIKUNDI", "GROUP BANK ACCOUNT DETAILS")}</p>
            <p className="text-xs text-emerald-600 mt-1">{L(lang, "Taarifa hizi ni hiari lakini zinahitajika kwa vikoba na SACCOS", "Optional but required for savings groups / SACCOS")}</p>
          </div>
          <div>
            <label className={lbl}>{L(lang, "Jina la Benki", "Bank Name")}</label>
            <select value={vals.bank_name} onChange={e => set("bank_name", e.target.value)} className={inputCls()}>
              <option value="">{L(lang, "-- Chagua benki --", "-- Select bank --")}</option>
              {BANKS.map(b => <option key={b} value={b}>{b}</option>)}
            </select>
          </div>
          <div>
            <label className={lbl}>{L(lang, "Tawi la Benki", "Bank Branch")}</label>
            <input value={vals.bank_branch} onChange={e => set("bank_branch", e.target.value)} className={inputCls()} placeholder={L(lang, "Mfano: Tawi la Kariakoo", "E.g. Kariakoo Branch")}/>
          </div>
          <div>
            <label className={lbl}>{L(lang, "Namba ya Akaunti", "Account Number")}</label>
            <input value={vals.account_number} onChange={e => set("account_number", e.target.value)} className={inputCls()} placeholder="XXXX-XXXX-XXXX"/>
          </div>
          <div>
            <label className={lbl}>{L(lang, "Jina la Akaunti (Account Name)", "Account Name")}</label>
            <input value={vals.account_name} onChange={e => set("account_name", e.target.value)} className={inputCls()} placeholder={L(lang, "Mfano: KIKUNDI CHA AKIBA JIJINI", "E.g. CITY SAVINGS GROUP")}/>
          </div>
          <SignaturePad value={vals.signature} onChange={v => set("signature", v || "")} lang={lang} label={L(lang, "Saini ya Mwenyekiti", "Chairperson Signature")}/>
        </div>
      )}

      {/* ── STEP 6: Preview ── */}
      {step === "preview" && (
        <div className="space-y-4">
          <div className={secHdr}><p className="font-bold text-emerald-800 text-sm flex items-center gap-2"><Eye size={15}/>{L(lang, "HAKIKI TAARIFA", "PREVIEW & CONFIRM")}</p></div>

          <p className="text-[10px] font-black text-stone-400 uppercase tracking-widest">{L(lang, "Taarifa za Kikundi", "Group Info")}</p>
          <div className="bg-white border border-stone-200 rounded-xl divide-y divide-stone-100">
            {[["Jina / Name", vals.group_name], ["Aina / Type", GROUP_TYPES.find(t => t.value === vals.group_type)?.label || ""], ["Wanachama / Members", vals.members_count], ["Mahali / Location", `${vals.ward}, ${vals.district}, ${vals.region}`], ["Mkutano / Venue", vals.meeting_location_detail || "—"]].map(([k, v]) => (
              <div key={k} className="flex justify-between px-4 py-2.5 text-sm"><span className="text-stone-500">{k}</span><span className="font-bold text-right max-w-[60%]">{v}</span></div>
            ))}
          </div>

          <p className="text-[10px] font-black text-stone-400 uppercase tracking-widest">{L(lang, "Viongozi", "Leaders")}</p>
          <div className="space-y-2">
            {vals.leaders.map((l, i) => (
              <div key={i} className="bg-stone-50 rounded-xl px-4 py-3">
                <p className="text-xs font-black text-emerald-700">{l.role}</p>
                <p className="text-sm font-bold">{l.first_name} {l.last_name}</p>
                <p className="text-xs text-stone-500">CT ID: {l.ct_id} · NIDA: {l.nida} · {l.phone}</p>
              </div>
            ))}
          </div>

          <p className="text-[10px] font-black text-stone-400 uppercase tracking-widest">{L(lang, "Wanachama", "Members")} ({vals.members.length})</p>
          <div className="space-y-1.5 max-h-40 overflow-y-auto">
            {vals.members.map((m, i) => (
              <div key={i} className="bg-stone-50 rounded-xl px-4 py-2.5 flex items-center justify-between">
                <div>
                  <p className="text-sm font-bold">{m.first_name} {m.last_name}</p>
                  <p className="text-xs text-stone-500">CT: {m.ct_id} · {m.phone || "—"}</p>
                </div>
              </div>
            ))}
          </div>

          {vals.bank_name && (
            <>
              <p className="text-[10px] font-black text-stone-400 uppercase tracking-widest">{L(lang, "Benki", "Bank")}</p>
              <div className="bg-white border border-stone-200 rounded-xl divide-y divide-stone-100">
                {[["Benki", vals.bank_name], ["Tawi / Branch", vals.bank_branch || "—"], ["Namba / Account No.", vals.account_number], ["Jina / Account Name", vals.account_name]].map(([k, v]) => (
                  <div key={k} className="flex justify-between px-4 py-2.5 text-sm"><span className="text-stone-500">{k}</span><span className="font-bold">{v}</span></div>
                ))}
              </div>
            </>
          )}

          <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 flex justify-between items-center">
            <span className="text-sm font-bold text-emerald-800">{L(lang, "Ada ya Usajili", "Registration Fee")}</span>
            <span className="text-lg font-black text-emerald-700">TSh {SERVICE_FEE.toLocaleString()}</span>
          </div>
        </div>
      )}

      <div className="flex gap-3 pt-2">
        {stepIdx > 0 && <button type="button" onClick={prev} className="flex items-center gap-2 px-4 py-3 border border-stone-200 rounded-xl font-bold text-stone-600 hover:bg-stone-50 transition-colors"><ArrowLeft size={16}/>{L(lang, "Rudi", "Back")}</button>}
        {step !== "preview"
          ? <button type="button" onClick={next} className="flex-1 flex items-center justify-center gap-2 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl transition-colors"><ArrowRight size={16}/>{L(lang, "Endelea", "Continue")}</button>
          : <button type="button" onClick={handleSubmit} disabled={submitting || isLoading} className="flex-1 flex items-center justify-center gap-2 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl disabled:opacity-50 transition-colors">{submitting ? <Loader2 size={16} className="animate-spin"/> : <FileText size={16}/>}{L(lang, "Wasilisha Ombi", "Submit Application")}</button>}
      </div>
    </div>
  );
};
export default UsajiliKikundiForm;
