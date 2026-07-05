/**
 * MachapishoPage — Machapisho / Publications
 * Lists key government publications, guidelines, and legal documents
 * relevant to E-Mtaa and local government digital services in Tanzania.
 */
import React from "react";
import {
  FileText,
  Download,
  ExternalLink,
  BookOpen,
  Scale,
  Smartphone,
  Shield,
} from "lucide-react";

interface MachapishoPageProps {
  lang?: string;
}

const publications = [
  {
    category: { sw: "Sheria na Kanuni", en: "Laws & Regulations" },
    icon: <Scale size={18} />,
    color: "emerald",
    items: [
      {
        title: { sw: "Sheria ya Serikali Mtandao, 2019", en: "Electronic Government Act, 2019" },
        desc: {
          sw: "Sheria inayosimamia utoaji wa huduma za serikali kwa njia ya kidijitali Tanzania.",
          en: "Act governing the provision of government services through digital means in Tanzania.",
        },
        href: "https://www.ega.go.tz/documents",
        type: "PDF",
      },
      {
        title: { sw: "Sheria ya Uhifadhi wa Data, 2022", en: "Personal Data Protection Act, 2022" },
        desc: {
          sw: "Sheria inayolinda data za kibinafsi za wananchi katika mifumo ya kidijitali.",
          en: "Act protecting citizens' personal data in digital systems.",
        },
        href: "https://www.tcra.go.tz",
        type: "PDF",
      },
      {
        title: { sw: "Sheria ya Serikali za Mitaa, Sura 287", en: "Local Government Act, Cap 287" },
        desc: {
          sw: "Sheria mama inayosimamia utendaji wa Serikali za Mitaa Tanzania.",
          en: "Principal act governing the operations of Local Government Authorities in Tanzania.",
        },
        href: "https://www.tamisemi.go.tz",
        type: "PDF",
      },
    ],
  },
  {
    category: { sw: "Miongozo na Viwango", en: "Guidelines & Standards" },
    icon: <BookOpen size={18} />,
    color: "blue",
    items: [
      {
        title: {
          sw: "Mwongozo wa Kusimamia Tovuti za Serikali (OR-MUU, 2014)",
          en: "Government Website Management Guidelines (OR-MUU, 2014)",
        },
        desc: {
          sw: "Mwongozo rasmi unaosimamia muundo, maudhui na utendaji wa tovuti zote za serikali Tanzania.",
          en: "Official guidelines governing the structure, content and operation of all Tanzanian government websites.",
        },
        href: "https://www.ega.go.tz/documents",
        type: "PDF",
      },
      {
        title: { sw: "Viwango vya eGA, 2025", en: "eGA Standards, 2025" },
        desc: {
          sw: "Viwango vya kiufundi vya mifumo ya serikali mtandao ikiwemo usalama, upatikanaji na muundo.",
          en: "Technical standards for e-government systems including security, accessibility and architecture.",
        },
        href: "https://www.ega.go.tz/standard/3",
        type: "WEB",
      },
      {
        title: {
          sw: "Mwongozo wa Upatikanaji wa Huduma kwa Watu Wenye Ulemavu",
          en: "Accessibility Guidelines for Persons with Disabilities",
        },
        desc: {
          sw: "Viwango vya kuhakikisha mifumo ya kidijitali inaweza kutumika na watu wote, ikiwemo wenye ulemavu.",
          en: "Standards ensuring digital systems are usable by everyone, including persons with disabilities.",
        },
        href: "https://www.ega.go.tz/documents",
        type: "PDF",
      },
    ],
  },
  {
    category: { sw: "Ripoti za Serikali", en: "Government Reports" },
    icon: <FileText size={18} />,
    color: "purple",
    items: [
      {
        title: {
          sw: "Ripoti ya Hali ya TEHAMA Tanzania, 2024",
          en: "Tanzania ICT Status Report, 2024",
        },
        desc: {
          sw: "Tathmini ya hali ya matumizi ya teknolojia ya habari na mawasiliano nchini Tanzania.",
          en: "Assessment of the state of information and communication technology use in Tanzania.",
        },
        href: "https://www.ega.go.tz/documents",
        type: "PDF",
      },
      {
        title: {
          sw: "Mpango wa Maendeleo wa TEHAMA Tanzania, 2023–2028",
          en: "Tanzania ICT Development Plan, 2023–2028",
        },
        desc: {
          sw: "Mpango wa miaka mitano wa kuendeleza matumizi ya teknolojia katika sekta zote nchini Tanzania.",
          en: "Five-year plan for advancing technology use across all sectors in Tanzania.",
        },
        href: "https://www.mcit.go.tz",
        type: "PDF",
      },
    ],
  },
  {
    category: { sw: "Miongozo ya Usalama", en: "Security Guidelines" },
    icon: <Shield size={18} />,
    color: "red",
    items: [
      {
        title: {
          sw: "Mwongozo wa Usalama wa Mtandao wa Serikali",
          en: "Government Cybersecurity Framework",
        },
        desc: {
          sw: "Mwongozo wa kulinda mifumo na data za serikali dhidi ya vitisho vya mtandao.",
          en: "Framework for protecting government systems and data against cyber threats.",
        },
        href: "https://www.tcra.go.tz",
        type: "PDF",
      },
    ],
  },
  {
    category: { sw: "Mifumo ya Serikali Mtandao", en: "E-Government Systems" },
    icon: <Smartphone size={18} />,
    color: "orange",
    items: [
      {
        title: {
          sw: "Mfumo wa Malipo ya Serikali (GEPG)",
          en: "Government e-Payment Gateway (GEPG)",
        },
        desc: {
          sw: "Mfumo rasmi wa malipo ya serikali mtandaoni, unaounganisha benki na watoa huduma wa simu.",
          en: "Official government online payment system connecting banks and mobile money providers.",
        },
        href: "https://gepg.go.tz",
        type: "WEB",
      },
      {
        title: {
          sw: "Mfumo wa Utambulisho wa Taifa (NIDA)",
          en: "National Identification System (NIDA)",
        },
        desc: {
          sw: "Mfumo wa utambulisho wa taifa unaotumika kuthibitisha utambulisho wa wananchi.",
          en: "National identification system used to verify citizens' identity in government services.",
        },
        href: "https://www.nida.go.tz",
        type: "WEB",
      },
    ],
  },
];

const colorMap: Record<string, string> = {
  emerald: "bg-emerald-100 text-emerald-700",
  blue: "bg-blue-100 text-blue-700",
  purple: "bg-purple-100 text-purple-700",
  red: "bg-red-100 text-red-700",
  orange: "bg-orange-100 text-orange-700",
};

export function MachapishoPage({ lang = "sw" }: MachapishoPageProps) {
  const sw = lang === "sw";

  return (
    <div className="max-w-4xl mx-auto py-8 px-4 space-y-8">
      {/* Back to Home */}
      <div className="mb-6">
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
          {lang === "sw" ? "Rudi Nyumbani" : "Back to Home"}
        </a>
      </div>

      {/* Header */}
      <div className="text-center space-y-3">
        <span className="inline-block px-3 py-1 bg-emerald-100 text-emerald-700 text-xs font-black uppercase tracking-widest rounded-full">
          {sw ? "Machapisho" : "Publications"}
        </span>
        <h1 className="text-2xl sm:text-3xl font-black text-stone-900 tracking-tight">
          {sw ? "Machapisho na Nyaraka Rasmi" : "Official Publications & Documents"}
        </h1>
        <p className="text-stone-500 text-sm sm:text-base max-w-xl mx-auto leading-relaxed">
          {sw
            ? "Sheria, miongozo, viwango na ripoti zinazosimamia mfumo wa E-Mtaa na huduma za serikali za mitaa Tanzania."
            : "Laws, guidelines, standards and reports governing the E-Mtaa system and local government services in Tanzania."}
        </p>
        <a
          href="https://www.ega.go.tz/documents"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 mt-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold rounded-xl transition-colors"
        >
          <ExternalLink size={14} />
          {sw ? "Tembelea Maktaba ya eGA" : "Visit eGA Document Library"}
        </a>
      </div>

      {/* Publication categories */}
      {publications.map((cat, ci) => (
        <div key={ci} className="space-y-3">
          <div
            className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-xl text-sm font-bold ${colorMap[cat.color]}`}
          >
            {cat.icon}
            {sw ? cat.category.sw : cat.category.en}
          </div>
          <div className="space-y-3">
            {cat.items.map((item, ii) => (
              <a
                key={ii}
                href={item.href}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-start gap-4 p-4 bg-white border border-stone-100 rounded-2xl hover:border-emerald-200 hover:shadow-sm transition-all group"
              >
                <div className="shrink-0 w-10 h-10 bg-stone-100 rounded-xl flex items-center justify-center group-hover:bg-emerald-100 transition-colors">
                  {item.type === "PDF" ? (
                    <Download size={18} className="text-stone-500 group-hover:text-emerald-600" />
                  ) : (
                    <ExternalLink
                      size={18}
                      className="text-stone-500 group-hover:text-emerald-600"
                    />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-bold text-stone-900 text-sm group-hover:text-emerald-700 transition-colors">
                      {sw ? item.title.sw : item.title.en}
                    </p>
                    <span className="text-[10px] font-black px-1.5 py-0.5 bg-stone-100 text-stone-500 rounded uppercase">
                      {item.type}
                    </span>
                  </div>
                  <p className="text-stone-500 text-xs mt-1 leading-relaxed">
                    {sw ? item.desc.sw : item.desc.en}
                  </p>
                </div>
              </a>
            ))}
          </div>
        </div>
      ))}

      {/* External library link */}
      <div className="bg-stone-900 rounded-2xl p-6 text-white text-center space-y-3">
        <BookOpen size={28} className="mx-auto text-emerald-400" />
        <h3 className="font-black text-lg">
          {sw ? "Maktaba Kamili ya eGA" : "Full eGA Document Library"}
        </h3>
        <p className="text-stone-400 text-sm">
          {sw
            ? "Tembelea tovuti ya eGA kupata machapisho yote, miongozo, na viwango vya serikali mtandao Tanzania."
            : "Visit the eGA website for all publications, guidelines and e-government standards for Tanzania."}
        </p>
        <a
          href="https://www.ega.go.tz/documents"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl transition-colors text-sm"
        >
          <ExternalLink size={14} />
          ega.go.tz/documents
        </a>
      </div>
    </div>
  );
}

export default MachapishoPage;
