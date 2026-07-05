/**
 * AboutPage — Kuhusu Sisi / About Us
 *
 * Inatekeleza mahitaji ya OR-MUU 2014:
 *   §2.1.v.a — Maelezo ya taasisi (lini ilianzishwa, mamlaka, majukumu)
 *   §2.1.v.b — Muundo wa taasisi (org chart ya mfumo)
 *   §2.1.v.c — Mpango mkakati wa taasisi
 *   §2.1.v.e — Mawasiliano ya taasisi
 */
import React, { useState } from "react";
import {
  Building2,
  Target,
  Eye,
  Heart,
  Users,
  Shield,
  Smartphone,
  Globe2,
  Calendar,
  Award,
  ChevronDown,
  ChevronUp,
  ArrowRight,
  MapPin,
  Mail,
  Clock,
  FileText,
  CheckCircle2,
  Layers,
  TrendingUp,
} from "lucide-react";

interface AboutPageProps {
  lang: string;
}

const L = (lang: string, sw: string, en: string) => (lang === "sw" ? sw : en);

// ─── Org chart nodes ────────────────────────────────────────────────────────
const ORG_NODES = [
  {
    level: 0,
    title: { sw: "Ofisi ya Rais — TAMISEMI", en: "President's Office — TAMISEMI" },
    role: { sw: "Mamlaka ya Juu Zaidi", en: "Supreme Authority" },
    color: "bg-emerald-700",
  },
  {
    level: 1,
    title: { sw: "Mamlaka ya Serikali Mtandao (eGA)", en: "e-Government Authority (eGA)" },
    role: { sw: "Viwango na Usimamizi wa Kiufundi", en: "Standards & Technical Oversight" },
    color: "bg-blue-700",
  },
  {
    level: 2,
    title: { sw: "Halmashauri za Wilaya / Miji", en: "District / City Councils" },
    role: { sw: "Usimamizi wa Ofisi za Kata", en: "Ward Office Management" },
    color: "bg-stone-700",
  },
  {
    level: 3,
    title: { sw: "Ofisi za Kata (WEO)", en: "Ward Offices (WEO)" },
    role: { sw: "Utoaji wa Huduma kwa Wananchi", en: "Service Delivery to Citizens" },
    color: "bg-amber-700",
  },
  {
    level: 4,
    title: { sw: "Mtaani Kiganjani (E-Mtaa)", en: "Mtaani Kiganjani (E-Mtaa)" },
    role: { sw: "Mfumo wa Kidijitali wa Kufikia Huduma", en: "Digital Interface for Services" },
    color: "bg-emerald-600",
  },
];

// ─── Strategic plan pillars ─────────────────────────────────────────────────
const PILLARS = [
  {
    icon: <Smartphone size={22} />,
    title: { sw: "Upatikanaji wa Huduma", en: "Service Accessibility" },
    desc: {
      sw: "Kuhakikisha kila raia wa Tanzania anaweza kupata huduma za serikali ya mtaa kwa simu yake bila kulazimika kwenda ofisini.",
      en: "Ensure every Tanzanian citizen can access local government services via mobile phone without visiting an office.",
    },
    target: { sw: "Maombi 50,000+ ifikapo 2026", en: "50,000+ applications by 2026" },
    color: "bg-emerald-50 border-emerald-200 text-emerald-700",
  },
  {
    icon: <Globe2 size={22} />,
    title: { sw: "Upanuzi wa Kitaifa", en: "National Expansion" },
    desc: {
      sw: "Kufikia halmashauri zote 185 za Tanzania ikiwa ni pamoja na Zanzibar na maeneo ya pembezoni.",
      en: "Reach all 185 councils of Tanzania including Zanzibar and remote areas.",
    },
    target: { sw: "Halmashauri 185 ifikapo 2027", en: "185 councils by 2027" },
    color: "bg-blue-50 border-blue-200 text-blue-700",
  },
  {
    icon: <Shield size={22} />,
    title: { sw: "Usalama na Uwazi", en: "Security & Transparency" },
    desc: {
      sw: "Kutekeleza viwango vya usalama vya eGA, kuhakikisha data za wananchi zinalindwa na nyaraka zote zinaweza kuthibitishwa.",
      en: "Implement eGA security standards, ensuring citizen data is protected and all documents are verifiable.",
    },
    target: { sw: "ISO 27001 ifikapo 2026", en: "ISO 27001 by 2026" },
    color: "bg-amber-50 border-amber-200 text-amber-700",
  },
  {
    icon: <Users size={22} />,
    title: { sw: "Nguvu Kazi ya Kidigitali", en: "Digital Workforce" },
    desc: {
      sw: "Kutoa mafunzo kwa watumishi wa kata wote ili kutumia mfumo huu kwa ufanisi na kuwawezesha wananchi.",
      en: "Train all ward staff to use this system efficiently and enable citizens to use digital services.",
    },
    target: { sw: "Watumishi 10,000+ waliofunzwa", en: "10,000+ trained staff" },
    color: "bg-purple-50 border-purple-200 text-purple-700",
  },
];

// ─── Timeline milestones ────────────────────────────────────────────────────
const MILESTONES = [
  {
    year: "2024",
    event: {
      sw: "Kuanzishwa kwa mfumo — huduma 9 za kwanza",
      en: "System launched — first 9 services",
    },
    done: true,
  },
  {
    year: "2025",
    event: {
      sw: "Upanuzi hadi halmashauri 30 za majaribio",
      en: "Expansion to 30 pilot councils",
    },
    done: true,
  },
  {
    year: "2025 Q3",
    event: {
      sw: "Ujumuishaji na GOVESB na NIDA Live API",
      en: "Integration with GOVESB and NIDA Live API",
    },
    done: false,
  },
  {
    year: "2026",
    event: { sw: "Domain ya go.tz na hosting ya eGA", en: "go.tz domain and eGA hosting" },
    done: false,
  },
  {
    year: "2026 Q2",
    event: { sw: "Malipo ya M-Pesa na benki ya kweli", en: "Live M-Pesa and bank payments" },
    done: false,
  },
  {
    year: "2027",
    event: { sw: "Halmashauri zote 185 — Tanzania nzima", en: "All 185 councils — nationwide" },
    done: false,
  },
];

export const AboutPage: React.FC<AboutPageProps> = ({ lang }) => {
  const sw = lang === "sw";
  const [openPillar, setOpenPillar] = useState<number | null>(null);

  return (
    <div className="max-w-4xl mx-auto space-y-10 pb-10">
      {/* Back to Home */}
      <div className="pt-4">
        <a
          href="/"
          className="inline-flex items-center gap-2 text-sm font-bold text-stone-500 hover:text-emerald-600 transition-colors group"
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="group-hover:-translate-x-1 transition-transform"
          >
            <path d="M19 12H5M12 5l-7 7 7 7" />
          </svg>
          {L(lang, "Rudi Nyumbani", "Back to Home")}
        </a>
      </div>

      {/* ── Header ── */}
      <div className="bg-gradient-to-br from-emerald-800 to-stone-900 rounded-3xl p-8 text-white relative overflow-hidden">
        <div className="absolute inset-0 opacity-10 bg-[url('/tz-coat-of-arms.png')] bg-no-repeat bg-right bg-contain" />
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-4">
            <img
              src="/tz-coat-of-arms.png"
              alt="Nembo ya Tanzania"
              className="w-12 h-12 object-contain"
            />
            <div>
              <p className="text-emerald-300 text-xs font-bold uppercase tracking-widest">
                {sw ? "Jamhuri ya Muungano wa Tanzania" : "United Republic of Tanzania"}
              </p>
              <p className="text-white/70 text-xs">
                {sw ? "Ofisi ya Rais — TAMISEMI / eGA" : "President's Office — TAMISEMI / eGA"}
              </p>
            </div>
          </div>
          <h1 className="text-3xl font-black text-white mb-2">
            {sw ? "Kuhusu Mtaani Kiganjani" : "About Mtaani Kiganjani"}
          </h1>
          <p className="text-white/80 max-w-2xl leading-relaxed">
            {sw
              ? "Mtaani Kiganjani (E-Mtaa) ni mfumo rasmi wa kidijitali wa Serikali za Mitaa Tanzania, unaowiwezesha wananchi kupata huduma za kata bila kuacha nyumbani — haraka, salama, na kwa gharama nafuu."
              : "Mtaani Kiganjani (E-Mtaa) is Tanzania's official digital local government portal, enabling citizens to access ward-level services without leaving home — fast, secure, and affordable."}
          </p>
          <div className="flex flex-wrap gap-2 mt-4">
            {["PO-RALG / TAMISEMI", "eGA Compliant", "eGA/APA/009", "ISO 9001:2015"].map((b) => (
              <span
                key={b}
                className="text-[10px] font-black bg-white/10 border border-white/20 px-2 py-1 rounded uppercase tracking-wider"
              >
                {b}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* ── §2.1.v.a — Maelezo ya taasisi ── */}
      <section className="bg-white dark:bg-stone-900 rounded-3xl p-8 border border-stone-200 dark:border-stone-700 shadow-sm">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 bg-emerald-100 dark:bg-emerald-900/30 rounded-xl flex items-center justify-center">
            <Building2 size={20} className="text-emerald-600" />
          </div>
          <h2 className="text-xl font-black text-stone-900 dark:text-stone-100">
            {sw ? "Maelezo ya Taasisi" : "About the Institution"}
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {[
            {
              label: { sw: "Jina Kamili", en: "Full Name" },
              value: "Mtaani Kiganjani — E-Mtaa Portal",
            },
            {
              label: { sw: "Ilianzishwa", en: "Established" },
              value: sw ? "Mwaka 2024" : "Year 2024",
            },
            {
              label: { sw: "Mamlaka Iliyoanzisha", en: "Establishing Authority" },
              value: "Ofisi ya Rais — TAMISEMI / eGA",
            },
            {
              label: { sw: "Aina ya Taasisi", en: "Institution Type" },
              value: sw ? "Mfumo wa Serikali Mtandao" : "e-Government System",
            },
            {
              label: { sw: "Eneo la Makao Makuu", en: "Headquarters" },
              value: "Dodoma, Tanzania",
            },
            {
              label: { sw: "Mfumo wa Kisheria", en: "Legal Framework" },
              value: sw ? "Sheria ya Serikali Mtandao, 2019" : "eGovernment Act, 2019",
            },
            {
              label: { sw: "Idadi ya Huduma", en: "Number of Services" },
              value: sw ? "Huduma 9 (zinaongezeka)" : "9 Services (growing)",
            },
            {
              label: { sw: "Lugha", en: "Languages" },
              value: "Kiswahili / English",
            },
          ].map((item) => (
            <div
              key={item.label.en}
              className="flex flex-col gap-1 p-3 bg-stone-50 dark:bg-stone-800 rounded-xl"
            >
              <span className="text-xs font-bold text-stone-500 dark:text-stone-400 uppercase tracking-wider">
                {sw ? item.label.sw : item.label.en}
              </span>
              <span className="text-sm font-bold text-stone-900 dark:text-stone-100">
                {item.value}
              </span>
            </div>
          ))}
        </div>

        {/* Majukumu */}
        <div className="mt-6 p-4 bg-emerald-50 dark:bg-emerald-900/20 rounded-2xl border border-emerald-100 dark:border-emerald-800">
          <h3 className="font-black text-emerald-800 dark:text-emerald-300 text-sm mb-3 flex items-center gap-2">
            <FileText size={16} />
            {sw ? "Majukumu Muhimu" : "Key Mandates"}
          </h3>
          <ul className="space-y-2">
            {[
              {
                sw: "Kutoa huduma za serikali ya mtaa kwa njia ya kidijitali",
                en: "Deliver local government services digitally",
              },
              {
                sw: "Kupunguza foleni na usumbufu wa wananchi kwenye ofisi za kata",
                en: "Reduce queues and citizen inconvenience at ward offices",
              },
              {
                sw: "Kuhifadhi kumbukumbu sahihi za nyaraka zote za kata",
                en: "Maintain accurate records of all ward documents",
              },
              {
                sw: "Kuwezesha uwazi na uwajibikaji katika utawala wa mtaa",
                en: "Enable transparency and accountability in local governance",
              },
              {
                sw: "Kutoa takwimu za mwenendo kwa viongozi wa halmashauri",
                en: "Provide trend analytics to council leadership",
              },
            ].map((item, i) => (
              <li
                key={i}
                className="flex items-start gap-2 text-sm text-emerald-800 dark:text-emerald-300"
              >
                <CheckCircle2 size={14} className="text-emerald-500 mt-0.5 shrink-0" />
                {sw ? item.sw : item.en}
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* ── Vision, Mission, Values ── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
          {
            icon: <Eye size={20} />,
            title: { sw: "Dira", en: "Vision" },
            text: {
              sw: "Tanzania ambapo kila raia anapata huduma za serikali ya mtaa bila kizuizi, kwa dakika, kutoka mahali popote.",
              en: "A Tanzania where every citizen accesses ward government services without barriers, in minutes, from anywhere.",
            },
            color: "bg-blue-600",
            bg: "bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800",
          },
          {
            icon: <Target size={20} />,
            title: { sw: "Dhamira", en: "Mission" },
            text: {
              sw: "Kutoa mfumo salama, wa haraka, na wa bei nafuu wa kidijitali unaounganisha wananchi na serikali ya mtaa.",
              en: "Provide a secure, fast, and affordable digital platform connecting citizens with their local government.",
            },
            color: "bg-emerald-600",
            bg: "bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800",
          },
          {
            icon: <Heart size={20} />,
            title: { sw: "Maadili", en: "Values" },
            text: {
              sw: "Uwazi · Uwajibikaji · Uaminifu · Ufanisi · Usawa · Ubunifu",
              en: "Transparency · Accountability · Integrity · Efficiency · Equity · Innovation",
            },
            color: "bg-amber-600",
            bg: "bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800",
          },
        ].map((item) => (
          <div key={item.title.en} className={`rounded-2xl p-6 border ${item.bg}`}>
            <div
              className={`w-10 h-10 ${item.color} text-white rounded-xl flex items-center justify-center mb-4`}
            >
              {item.icon}
            </div>
            <h3 className="font-black text-stone-900 dark:text-stone-100 mb-2">
              {sw ? item.title.sw : item.title.en}
            </h3>
            <p className="text-sm text-stone-600 dark:text-stone-400 leading-relaxed">
              {sw ? item.text.sw : item.text.en}
            </p>
          </div>
        ))}
      </div>

      {/* ── §2.1.v.b — Muundo wa Taasisi ── */}
      <section className="bg-white dark:bg-stone-900 rounded-3xl p-8 border border-stone-200 dark:border-stone-700 shadow-sm">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-xl flex items-center justify-center">
            <Layers size={20} className="text-blue-600" />
          </div>
          <div>
            <h2 className="text-xl font-black text-stone-900 dark:text-stone-100">
              {sw ? "Muundo wa Taasisi" : "Organisational Structure"}
            </h2>
            <p className="text-xs text-stone-500 dark:text-stone-400">
              {sw ? "Mnyororo wa mamlaka na uwajibikaji" : "Chain of authority and accountability"}
            </p>
          </div>
        </div>

        <div className="space-y-2">
          {ORG_NODES.map((node, i) => (
            <div
              key={i}
              className="flex items-center gap-3"
              style={{ paddingLeft: `${node.level * 28}px` }}
            >
              {node.level > 0 && (
                <div className="flex flex-col items-center shrink-0">
                  <div className="w-px h-4 bg-stone-300 dark:bg-stone-600" />
                  <ArrowRight size={12} className="text-stone-400 -ml-1" />
                </div>
              )}
              <div
                className={`flex-1 flex items-center gap-3 p-3 ${node.color} text-white rounded-xl`}
              >
                <div>
                  <p className="font-black text-sm">{sw ? node.title.sw : node.title.en}</p>
                  <p className="text-white/70 text-xs">{sw ? node.role.sw : node.role.en}</p>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Internal system roles */}
        <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-3">
          {[
            {
              role: { sw: "Raia", en: "Citizen" },
              desc: { sw: "Omba huduma, lipa, pakua hati", en: "Apply, pay, download documents" },
              color: "bg-stone-100 dark:bg-stone-800",
            },
            {
              role: { sw: "Afisa wa Kata (Staff)", en: "Ward Officer (Staff)" },
              desc: { sw: "Pitia na idhinisha maombi", en: "Review and approve applications" },
              color: "bg-blue-100 dark:bg-blue-900/30",
            },
            {
              role: { sw: "Msimamizi (Admin)", en: "Administrator (Admin)" },
              desc: { sw: "Simamia mfumo na takwimu", en: "Manage system and analytics" },
              color: "bg-emerald-100 dark:bg-emerald-900/30",
            },
          ].map((r) => (
            <div key={r.role.en} className={`p-3 rounded-xl ${r.color}`}>
              <p className="font-black text-sm text-stone-900 dark:text-stone-100">
                {sw ? r.role.sw : r.role.en}
              </p>
              <p className="text-xs text-stone-600 dark:text-stone-400 mt-1">
                {sw ? r.desc.sw : r.desc.en}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* ── §2.1.v.c — Mpango Mkakati ── */}
      <section className="bg-white dark:bg-stone-900 rounded-3xl p-8 border border-stone-200 dark:border-stone-700 shadow-sm">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 bg-amber-100 dark:bg-amber-900/30 rounded-xl flex items-center justify-center">
            <TrendingUp size={20} className="text-amber-600" />
          </div>
          <div>
            <h2 className="text-xl font-black text-stone-900 dark:text-stone-100">
              {sw ? "Mpango Mkakati 2024–2027" : "Strategic Plan 2024–2027"}
            </h2>
            <p className="text-xs text-stone-500 dark:text-stone-400">
              {sw ? "Malengo ya kimkakati ya mfumo" : "System strategic objectives"}
            </p>
          </div>
        </div>

        {/* Pillars */}
        <div className="space-y-3 mb-8">
          {PILLARS.map((p, i) => (
            <div key={i} className={`rounded-2xl border ${p.color} overflow-hidden`}>
              <button
                className="w-full flex items-center gap-3 p-4 text-left"
                onClick={() => setOpenPillar(openPillar === i ? null : i)}
              >
                <div className="shrink-0">{p.icon}</div>
                <div className="flex-1">
                  <p className="font-black text-sm">{sw ? p.title.sw : p.title.en}</p>
                  <p className="text-xs opacity-70 font-bold">{sw ? p.target.sw : p.target.en}</p>
                </div>
                {openPillar === i ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
              </button>
              {openPillar === i && (
                <div className="px-4 pb-4 border-t border-current/10">
                  <p className="text-sm leading-relaxed mt-3">{sw ? p.desc.sw : p.desc.en}</p>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Timeline */}
        <h3 className="font-black text-stone-800 dark:text-stone-200 mb-4 flex items-center gap-2">
          <Calendar size={16} />
          {sw ? "Ratiba ya Utekelezaji" : "Implementation Timeline"}
        </h3>
        <div className="space-y-3">
          {MILESTONES.map((m, i) => (
            <div key={i} className="flex items-start gap-3">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 text-xs font-black ${
                  m.done
                    ? "bg-emerald-600 text-white"
                    : "bg-stone-200 dark:bg-stone-700 text-stone-500 dark:text-stone-400"
                }`}
              >
                {m.done ? "✓" : "○"}
              </div>
              <div className="flex-1 pb-3 border-b border-stone-100 dark:border-stone-800">
                <span className="text-xs font-black text-stone-400 dark:text-stone-500 uppercase tracking-wider">
                  {m.year}
                </span>
                <p
                  className={`text-sm font-bold mt-0.5 ${m.done ? "text-stone-900 dark:text-stone-100" : "text-stone-500 dark:text-stone-400"}`}
                >
                  {sw ? m.event.sw : m.event.en}
                </p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── §2.1.v.e — Mawasiliano ya Taasisi ── */}
      <section className="bg-white dark:bg-stone-900 rounded-3xl p-8 border border-stone-200 dark:border-stone-700 shadow-sm">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 bg-stone-100 dark:bg-stone-800 rounded-xl flex items-center justify-center">
            <MapPin size={20} className="text-stone-600 dark:text-stone-400" />
          </div>
          <h2 className="text-xl font-black text-stone-900 dark:text-stone-100">
            {sw ? "Mawasiliano ya Taasisi" : "Contact Information"}
          </h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {[
            {
              icon: <Building2 size={16} className="text-emerald-600" />,
              label: { sw: "Taasisi", en: "Institution" },
              value: "Ofisi ya Rais — TAMISEMI / Mamlaka ya Serikali Mtandao (eGA)",
            },
            {
              icon: <MapPin size={16} className="text-blue-600" />,
              label: { sw: "Anwani ya Ofisi", en: "Office Address" },
              value: "Mtaa wa Magogoni, Dodoma, Tanzania",
            },
            {
              icon: <Mail size={16} className="text-amber-600" />,
              label: { sw: "Barua Pepe ya Msaada", en: "Support Email" },
              value: "msaada@e-mtaatz.xyz",
            },
            {
              icon: <Globe2 size={16} className="text-purple-600" />,
              label: { sw: "Tovuti Rasmi", en: "Official Website" },
              value: "e-mtaatz.xyz (inahamia e-mtaa.go.tz)",
            },
            {
              icon: <Clock size={16} className="text-stone-600" />,
              label: { sw: "Saa za Kazi", en: "Working Hours" },
              value: sw ? "Jumatatu–Ijumaa: 07:30–15:30 (EAT)" : "Monday–Friday: 07:30–15:30 (EAT)",
            },
            {
              icon: <Globe2 size={16} className="text-emerald-600" />,
              label: { sw: "Mfumo wa Kidijitali", en: "Digital System" },
              value: sw ? "Inapatikana masaa 24 / siku 7" : "Available 24 hours / 7 days",
            },
          ].map((c) => (
            <div
              key={c.label.en}
              className="flex items-start gap-3 p-3 bg-stone-50 dark:bg-stone-800 rounded-xl"
            >
              <div className="mt-0.5 shrink-0">{c.icon}</div>
              <div>
                <p className="text-xs font-bold text-stone-500 dark:text-stone-400 uppercase tracking-wider">
                  {sw ? c.label.sw : c.label.en}
                </p>
                <p className="text-sm font-bold text-stone-900 dark:text-stone-100 mt-0.5">
                  {c.value}
                </p>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-4 p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-2xl">
          <p className="text-xs font-bold text-amber-700 dark:text-amber-400">
            {sw
              ? "⚠️ Mfumo huu ni wa maonyesho. Kwa huduma rasmi za kisheria, wasiliana na ofisi ya kata yako moja kwa moja."
              : "⚠️ This system is for demonstration. For legally binding official services, contact your ward office directly."}
          </p>
        </div>
      </section>

      {/* Awards / compliance */}
      <section className="bg-stone-900 dark:bg-stone-950 rounded-3xl p-8 text-white">
        <div className="flex items-center gap-3 mb-6">
          <Award size={20} className="text-amber-400" />
          <h2 className="text-xl font-black">
            {sw ? "Viwango na Uthibitisho" : "Standards & Compliance"}
          </h2>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            {
              name: "OR-MUU 2014",
              desc: { sw: "Mwongozo wa Tovuti za Serikali", en: "Government Website Guidelines" },
            },
            {
              name: "eGA/APA/009 v2.0",
              desc: { sw: "Viwango vya Kiufundi vya Tovuti", en: "Technical Website Standards" },
            },
            { name: "ISO 9001:2015", desc: { sw: "Usimamizi wa Ubora", en: "Quality Management" } },
            {
              name: "Sheria 2019",
              desc: { sw: "Sheria ya Serikali Mtandao", en: "eGovernment Act" },
            },
          ].map((c) => (
            <div
              key={c.name}
              className="bg-white/10 rounded-2xl p-4 text-center border border-white/10"
            >
              <p className="font-black text-emerald-400 text-sm">{c.name}</p>
              <p className="text-white/60 text-xs mt-1">{sw ? c.desc.sw : c.desc.en}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
};
