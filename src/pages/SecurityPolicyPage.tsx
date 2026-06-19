/**
 * SecurityPolicyPage — Sera ya Usalama wa TEHAMA / ICT Security Policy
 *
 * Inatekeleza mahitaji ya:
 *   eGA ISA/003 — Uandaaji Sera ya Usalama wa TEHAMA
 *   eGA ISA/004 — Mwongozo wa Operesheni za Usalama
 *   OR-MUU 2014 §3.2.ii — Password policy (kubadilishwa kila mwezi)
 *   Sheria ya Makosa ya Kimtandao, 2015
 *   Sheria ya Miamala ya Kielekroni, 2015
 */
import React, { useState } from "react";
import {
  Shield,
  Lock,
  Eye,
  EyeOff,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  KeyRound,
  Server,
  Database,
  Smartphone,
  FileText,
  Clock,
  UserCheck,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  Globe2,
} from "lucide-react";

interface SecurityPolicyPageProps {
  lang: string;
}

const L = (lang: string, sw: string, en: string) => (lang === "sw" ? sw : en);

// ─── Password policy rules ───────────────────────────────────────────────────
const PASSWORD_RULES = [
  { icon: <CheckCircle2 size={14} className="text-emerald-600" />, rule: { sw: "Urefu wa herufi 8 hadi 64", en: "Length of 8 to 64 characters" } },
  { icon: <CheckCircle2 size={14} className="text-emerald-600" />, rule: { sw: "Angalau herufi moja kubwa (A–Z)", en: "At least one uppercase letter (A–Z)" } },
  { icon: <CheckCircle2 size={14} className="text-emerald-600" />, rule: { sw: "Angalau herufi moja ndogo (a–z)", en: "At least one lowercase letter (a–z)" } },
  { icon: <CheckCircle2 size={14} className="text-emerald-600" />, rule: { sw: "Angalau namba moja (0–9)", en: "At least one number (0–9)" } },
  { icon: <CheckCircle2 size={14} className="text-emerald-600" />, rule: { sw: "Angalau alama moja maalum (!@#$%^&*)", en: "At least one special character (!@#$%^&*)" } },
  { icon: <XCircle size={14} className="text-red-500" />, rule: { sw: "Usiwe na jina lako au tarehe ya kuzaliwa", en: "Must not contain your name or date of birth" } },
  { icon: <XCircle size={14} className="text-red-500" />, rule: { sw: "Isiwe sawa na nywila 5 zilizopita", en: "Must not match the last 5 passwords" } },
  { icon: <Clock size={14} className="text-amber-600" />, rule: { sw: "Lazima ibadilishwe kila siku 90 (watumishi: siku 30)", en: "Must be changed every 90 days (staff: 30 days)" } },
];

// ─── Security sections ───────────────────────────────────────────────────────
const SECURITY_SECTIONS = [
  {
    id: "data",
    icon: <Database size={20} className="text-blue-600" />,
    title: { sw: "Usalama wa Data", en: "Data Security" },
    color: "border-blue-200 dark:border-blue-800",
    points: [
      { sw: "Data zote za wananchi zinahifadhiwa katika hifadhidata iliyosimbwa (encrypted at rest)", en: "All citizen data is stored in encrypted databases (encrypted at rest)" },
      { sw: "Mawasiliano yote yanafanywa kupitia HTTPS/TLS 1.3", en: "All communications occur via HTTPS/TLS 1.3" },
      { sw: "Hakuna data ya kibinafsi inayoshirikiwa na mtu wa tatu bila idhini", en: "No personal data is shared with third parties without consent" },
      { sw: "Nakala rudufu (backup) zinafanywa kila siku na kuhifadhiwa salama", en: "Daily backups are performed and stored securely" },
      { sw: "Data zinaweza kufutwa kulingana na ombi la raia kwa mujibu wa sheria", en: "Data can be deleted upon citizen request in accordance with law" },
    ],
  },
  {
    id: "access",
    icon: <UserCheck size={20} className="text-emerald-600" />,
    title: { sw: "Udhibiti wa Upatikanaji", en: "Access Control" },
    color: "border-emerald-200 dark:border-emerald-800",
    points: [
      { sw: "Mfumo wa RBAC (Role-Based Access Control) — kila mtumiaji ana ruhusa za ngazi yake tu", en: "RBAC system — each user only has permissions for their role level" },
      { sw: "Vitambulisho vya mfumo (session) vinaisha baada ya dakika 30 za kutofanya kazi", en: "System sessions expire after 30 minutes of inactivity" },
      { sw: "Majaribio 5 ya kuingia yasiyofaulu yanasababisha kufungwa kwa akaunti kwa muda", en: "5 failed login attempts result in temporary account lockout" },
      { sw: "Watumishi wa kata wanapata ufikiaji wa kata yao tu", en: "Ward staff only access their designated ward" },
      { sw: "Logi za ufikiaji zimewekwa na zinaweza kukaguliwa na wasimamizi", en: "Access logs are maintained and can be audited by administrators" },
    ],
  },
  {
    id: "network",
    icon: <Globe2 size={20} className="text-purple-600" />,
    title: { sw: "Usalama wa Mtandao", en: "Network Security" },
    color: "border-purple-200 dark:border-purple-800",
    points: [
      { sw: "Vyeti halali vya SSL/TLS vimetumika kwenye mfumo wote", en: "Valid SSL/TLS certificates are used across the entire system" },
      { sw: "Content Security Policy (CSP) imewekwa kuzuia mashambulizi ya XSS", en: "Content Security Policy (CSP) is set to prevent XSS attacks" },
      { sw: "Vichwa vya usalama (security headers) vinasimamiwa kila wakati", en: "Security headers are continuously monitored" },
      { sw: "Firewall na DDoS protection zimewekwa", en: "Firewall and DDoS protection are in place" },
      { sw: "RLS (Row Level Security) ya Supabase inazuia ufikiaji usioidhinishwa wa data", en: "Supabase RLS prevents unauthorized data access" },
    ],
  },
  {
    id: "document",
    icon: <FileText size={20} className="text-amber-600" />,
    title: { sw: "Usalama wa Nyaraka", en: "Document Security" },
    color: "border-amber-200 dark:border-amber-800",
    points: [
      { sw: "Nyaraka zote za serikali hutolewa kwa muundo wa PDF unaozuia mabadiliko (OR-MUU §3.2.i)", en: "All government documents are issued in tamper-resistant PDF format (OR-MUU §3.2.i)" },
      { sw: "Kila hati ina QR code ya kipekee ya uthibitisho", en: "Every document has a unique verification QR code" },
      { sw: "Namba za marejeo (reference numbers) zinazalishwa kwa algoriti salama", en: "Reference numbers are generated using secure algorithms" },
      { sw: "Ukaguzi wa nyaraka unapatikana kwa umma kupitia ukurasa wa Hakiki Hati", en: "Document verification is publicly accessible via the Verify Document page" },
      { sw: "Saini za kidijitali za afisa na muhuri wa ofisi zimetumika", en: "Digital officer signatures and office stamps are applied" },
    ],
  },
  {
    id: "incident",
    icon: <AlertTriangle size={20} className="text-red-600" />,
    title: { sw: "Usimamizi wa Matukio ya Usalama", en: "Security Incident Management" },
    color: "border-red-200 dark:border-red-800",
    points: [
      { sw: "Matukio yote ya usalama yanakaguliwa na timu ya usalama ndani ya saa 4", en: "All security incidents are reviewed by the security team within 4 hours" },
      { sw: "Wananchi watafahamishwa ndani ya saa 72 kama data zao zimeathirika", en: "Citizens will be notified within 72 hours if their data is affected" },
      { sw: "Tukio lolote la uvunjaji wa data litaripotiwa kwa eGA na TCRA", en: "Any data breach will be reported to eGA and TCRA" },
      { sw: "Mfumo una uwezo wa kuzimwa haraka kwa usalama inapohitajika", en: "The system can be quickly secured/shut down if required" },
      { sw: "Mawasiliano ya dharura: usalama@e-mtaatz.xyz", en: "Emergency contact: security@e-mtaatz.xyz" },
    ],
  },
];

export const SecurityPolicyPage: React.FC<SecurityPolicyPageProps> = ({ lang }) => {
  const sw = lang === "sw";
  const [openSection, setOpenSection] = useState<string | null>("data");
  const [showPwd, setShowPwd] = useState(false);

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-10">

      {/* ── Header ── */}
      <div className="bg-gradient-to-br from-stone-900 to-red-950 rounded-3xl p-8 text-white">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 bg-red-900/50 rounded-2xl flex items-center justify-center border border-red-700">
            <Shield size={24} className="text-red-400" />
          </div>
          <div>
            <p className="text-red-400 text-xs font-bold uppercase tracking-widest">
              eGA ISA/003 · ISA/004 · OR-MUU §3.2
            </p>
            <p className="text-white/70 text-xs">Mtaani Kiganjani — E-Mtaa Portal</p>
          </div>
        </div>
        <h1 className="text-3xl font-black text-white mb-2">
          {sw ? "Sera ya Usalama wa TEHAMA" : "ICT Security Policy"}
        </h1>
        <p className="text-white/80 max-w-2xl leading-relaxed">
          {sw
            ? "Hii ni sera rasmi ya usalama wa Mtaani Kiganjani (E-Mtaa). Inabainisha jinsi tunavyolinda data za wananchi, kuhakikisha usalama wa mfumo, na kukabili matishio ya kiusalama."
            : "This is the official ICT Security Policy of Mtaani Kiganjani (E-Mtaa). It defines how we protect citizen data, ensure system security, and respond to security threats."}
        </p>
        <div className="flex flex-wrap gap-2 mt-4">
          {[
            { label: "eGA ISA/003", color: "bg-red-900/50 border-red-700" },
            { label: "eGA ISA/004", color: "bg-red-900/50 border-red-700" },
            { label: sw ? "Sheria ya Makosa ya Kimtandao, 2015" : "Cybercrime Act, 2015", color: "bg-white/10 border-white/20" },
            { label: sw ? "Sheria ya Miamala ya Kielekroni, 2015" : "Electronic Transactions Act, 2015", color: "bg-white/10 border-white/20" },
          ].map((b) => (
            <span key={b.label} className={`text-[9px] font-black border px-2 py-1 rounded uppercase tracking-wider ${b.color}`}>
              {b.label}
            </span>
          ))}
        </div>
      </div>

      {/* ── Password Policy (OR-MUU §3.2.ii) ── */}
      <section className="bg-white dark:bg-stone-900 rounded-3xl p-6 border border-stone-200 dark:border-stone-700 shadow-sm">
        <button
          className="w-full flex items-center justify-between"
          onClick={() => setShowPwd(!showPwd)}
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-amber-100 dark:bg-amber-900/30 rounded-xl flex items-center justify-center">
              <KeyRound size={20} className="text-amber-600" />
            </div>
            <div className="text-left">
              <h2 className="text-xl font-black text-stone-900 dark:text-stone-100">
                {sw ? "Sera ya Nywila (Passwords)" : "Password Policy"}
              </h2>
              <p className="text-xs text-stone-500 dark:text-stone-400">OR-MUU 2014 §3.2.ii</p>
            </div>
          </div>
          {showPwd ? <ChevronUp size={20} className="text-stone-400" /> : <ChevronDown size={20} className="text-stone-400" />}
        </button>

        {showPwd && (
          <div className="mt-6 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {[
                {
                  icon: <UserCheck size={16} className="text-emerald-600" />,
                  title: { sw: "Wananchi (Citizen)", en: "Citizens" },
                  rules: [
                    { sw: "Mabadiliko kila siku 90", en: "Change every 90 days" },
                    { sw: "Majaribio 5 → kufungwa kwa muda", en: "5 attempts → temporary lockout" },
                    { sw: "Kikao kinaisha dakika 60 bila kutenda", en: "Session expires after 60 min inactivity" },
                  ],
                  color: "bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800",
                },
                {
                  icon: <Shield size={16} className="text-blue-600" />,
                  title: { sw: "Watumishi wa Serikali (Staff/Admin)", en: "Government Staff (Staff/Admin)" },
                  rules: [
                    { sw: "Mabadiliko kila siku 30 (OR-MUU §3.2.ii)", en: "Change every 30 days (OR-MUU §3.2.ii)" },
                    { sw: "Majaribio 3 → kufungwa papo hapo", en: "3 attempts → immediate lockout" },
                    { sw: "Kikao kinaisha dakika 30 bila kutenda", en: "Session expires after 30 min inactivity" },
                  ],
                  color: "bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800",
                },
              ].map((g) => (
                <div key={g.title.en} className={`p-4 rounded-2xl border ${g.color}`}>
                  <div className="flex items-center gap-2 mb-3">
                    {g.icon}
                    <span className="font-black text-sm text-stone-800 dark:text-stone-200">
                      {sw ? g.title.sw : g.title.en}
                    </span>
                  </div>
                  <ul className="space-y-1.5">
                    {g.rules.map((r, i) => (
                      <li key={i} className="flex items-center gap-2 text-xs text-stone-700 dark:text-stone-300">
                        <span className="w-1.5 h-1.5 rounded-full bg-current shrink-0" />
                        {sw ? r.sw : r.en}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>

            <div className="p-4 bg-stone-50 dark:bg-stone-800 rounded-2xl">
              <h3 className="font-black text-sm text-stone-800 dark:text-stone-200 mb-3 flex items-center gap-2">
                <Lock size={14} />
                {sw ? "Mahitaji ya Nywila Yenye Nguvu" : "Strong Password Requirements"}
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {PASSWORD_RULES.map((r, i) => (
                  <div key={i} className="flex items-center gap-2 text-xs text-stone-700 dark:text-stone-300">
                    {r.icon}
                    {sw ? r.rule.sw : r.rule.en}
                  </div>
                ))}
              </div>
            </div>

            <div className="p-4 bg-amber-50 dark:bg-amber-900/20 rounded-2xl border border-amber-200 dark:border-amber-800 flex items-start gap-3">
              <AlertCircle size={16} className="text-amber-600 shrink-0 mt-0.5" />
              <p className="text-xs text-amber-800 dark:text-amber-300">
                {sw
                  ? "Kamwe usishiriki nywila yako na mtu yeyote, ikiwa ni pamoja na watumishi wa serikali. Ofisi ya E-Mtaa haitawahi kuuliza nywila yako."
                  : "Never share your password with anyone, including government staff. The E-Mtaa office will never ask for your password."}
              </p>
            </div>
          </div>
        )}
      </section>

      {/* ── Security Policy Sections ── */}
      {SECURITY_SECTIONS.map((section) => (
        <section key={section.id} className={`bg-white dark:bg-stone-900 rounded-3xl overflow-hidden border ${section.color} shadow-sm`}>
          <button
            className="w-full flex items-center justify-between p-6 hover:bg-stone-50 dark:hover:bg-stone-800 transition-colors"
            onClick={() => setOpenSection(openSection === section.id ? null : section.id)}
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-stone-100 dark:bg-stone-800 rounded-xl flex items-center justify-center">
                {section.icon}
              </div>
              <h2 className="text-lg font-black text-stone-900 dark:text-stone-100">
                {sw ? section.title.sw : section.title.en}
              </h2>
            </div>
            {openSection === section.id
              ? <ChevronUp size={20} className="text-stone-400 shrink-0" />
              : <ChevronDown size={20} className="text-stone-400 shrink-0" />}
          </button>

          {openSection === section.id && (
            <div className="px-6 pb-6 border-t border-stone-100 dark:border-stone-800">
              <ul className="space-y-3 mt-4">
                {section.points.map((p, i) => (
                  <li key={i} className="flex items-start gap-3">
                    <CheckCircle2 size={16} className="text-emerald-500 shrink-0 mt-0.5" />
                    <span className="text-sm text-stone-700 dark:text-stone-300 leading-relaxed">
                      {sw ? p.sw : p.en}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </section>
      ))}

      {/* ── Citizen Responsibilities ── */}
      <section className="bg-amber-50 dark:bg-amber-900/20 rounded-3xl p-6 border border-amber-200 dark:border-amber-800">
        <div className="flex items-center gap-3 mb-4">
          <AlertTriangle size={20} className="text-amber-600" />
          <h2 className="text-xl font-black text-amber-900 dark:text-amber-300">
            {sw ? "Wajibu Wako kama Mtumiaji" : "Your Responsibilities as a User"}
          </h2>
        </div>
        <ul className="space-y-2">
          {[
            { sw: "Hifadhi nywila yako salama na usimwachie mtu mwingine", en: "Keep your password secure and do not share it" },
            { sw: "Toka kwenye mfumo (log out) unapomaliza kutumia", en: "Always log out when you finish using the system" },
            { sw: "Usitumie mtandao wa umma (Wi-Fi ya bure) kuingia kwenye E-Mtaa", en: "Do not use public Wi-Fi to access E-Mtaa" },
            { sw: "Ripoti mara moja kama unashuku akaunti yako imetumika vibaya", en: "Report immediately if you suspect your account has been misused" },
            { sw: "Usijaribu kufikia akaunti za watumiaji wengine", en: "Do not attempt to access other users' accounts" },
          ].map((r, i) => (
            <li key={i} className="flex items-start gap-2 text-sm text-amber-800 dark:text-amber-300">
              <span className="font-black shrink-0">·</span>
              {sw ? r.sw : r.en}
            </li>
          ))}
        </ul>
      </section>

      {/* ── Legal references ── */}
      <section className="bg-stone-100 dark:bg-stone-800 rounded-3xl p-6">
        <h2 className="text-lg font-black text-stone-800 dark:text-stone-200 mb-4 flex items-center gap-2">
          <FileText size={16} />
          {sw ? "Msingi wa Kisheria" : "Legal Basis"}
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {[
            { law: sw ? "Sheria ya Serikali Mtandao, 2019" : "eGovernment Act, 2019", desc: { sw: "Msingi wa mfumo wa kidijitali wa serikali", en: "Foundation for government digital systems" } },
            { law: sw ? "Kanuni za Serikali Mtandao, 2020" : "eGovernment Regulations, 2020", desc: { sw: "Kanuni za utekelezaji wa mfumo", en: "System implementation regulations" } },
            { law: sw ? "Sheria ya Makosa ya Kimtandao, 2015" : "Cybercrime Act, 2015", desc: { sw: "Makosa ya jinai ya mtandao", en: "Computer crime offences" } },
            { law: sw ? "Sheria ya Miamala ya Kielekroni, 2015" : "Electronic Transactions Act, 2015", desc: { sw: "Saini na miamala ya kidijitali", en: "Digital signatures and transactions" } },
          ].map((l) => (
            <div key={l.law} className="bg-white dark:bg-stone-700 rounded-xl p-3">
              <p className="font-black text-sm text-stone-900 dark:text-stone-100">{l.law}</p>
              <p className="text-xs text-stone-500 dark:text-stone-400 mt-1">{sw ? l.desc.sw : l.desc.en}</p>
            </div>
          ))}
        </div>
        <p className="text-xs text-stone-500 dark:text-stone-400 mt-4">
          {sw
            ? "Sera hii inapitiwa kila mwaka na kusasishwa kulingana na mabadiliko ya kisheria na kiteknolojia. Toleo hili: Januari 2025."
            : "This policy is reviewed annually and updated according to legal and technological changes. Version: January 2025."}
        </p>
      </section>
    </div>
  );
};
