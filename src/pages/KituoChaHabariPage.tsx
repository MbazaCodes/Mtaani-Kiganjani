/**
 * KituoChaHabariPage — Kituo cha Habari / News Centre
 * E-Mtaa news, announcements and updates, with link to eGA news.
 */
import React from "react";
import { Newspaper, ExternalLink, Calendar, ArrowRight, Radio, Megaphone } from "lucide-react";

interface KituoChaHabariPageProps {
  lang?: string;
}

const news = [
  {
    date: "2025-06-01",
    tag: { sw: "Uzinduzi", en: "Launch" },
    tagColor: "emerald",
    title: { sw: "E-Mtaa Inazinduliwa Rasmi Tanzania", en: "E-Mtaa Officially Launched in Tanzania" },
    body: { sw: "Mfumo wa Mtaani Kiganjani umezinduliwa rasmi kwa wananchi wote wa Tanzania, ukiwezesha kuomba huduma za serikali ya mtaa bila kwenda ofisini. Huduma tisa za awali zinajumuisha cheti cha mkazi, vibali vya ujenzi, mazishi, sherehe, na zaidi.", en: "The Mtaani Kiganjani system has been officially launched for all Tanzanian citizens, enabling ward-level government service applications without visiting offices. Nine initial services include residency certificates, construction, burial and celebration permits, and more." },
  },
  {
    date: "2025-05-15",
    tag: { sw: "Sasisho", en: "Update" },
    tagColor: "blue",
    title: { sw: "Malipo ya M-Pesa, Tigo Pesa na Airtel Money Sasa Yanafanya Kazi", en: "M-Pesa, Tigo Pesa and Airtel Money Payments Now Live" },
    body: { sw: "Wananchi wanaweza sasa kulipa ada za huduma kupitia M-Pesa, Tigo Pesa, au Airtel Money moja kwa moja ndani ya mfumo wa E-Mtaa. Malipo ya benki (NMB, CRDB, NBC) na kadi za Visa/Mastercard pia yanakubaliwa.", en: "Citizens can now pay service fees via M-Pesa, Tigo Pesa, or Airtel Money directly within E-Mtaa. Bank transfers (NMB, CRDB, NBC) and Visa/Mastercard payments are also accepted." },
  },
  {
    date: "2025-04-20",
    tag: { sw: "Ushirikiano", en: "Partnership" },
    tagColor: "purple",
    title: { sw: "E-Mtaa Inaunganishwa na Mfumo wa NIDA", en: "E-Mtaa Integrated with NIDA System" },
    body: { sw: "Ushirikiano na Mamlaka ya Vitambulisho vya Taifa (NIDA) unawezesha uthibitishaji wa haraka wa utambulisho wa wananchi ndani ya mfumo, kuongeza usalama na kuzuia udanganyifu.", en: "Partnership with the National Identification Authority (NIDA) enables fast citizen identity verification within the system, enhancing security and preventing fraud." },
  },
  {
    date: "2025-03-10",
    tag: { sw: "Majaribio", en: "Pilot" },
    tagColor: "orange",
    title: { sw: "Majaribio Yanakamilika Mafanikio Dar es Salaam", en: "Pilot Completes Successfully in Dar es Salaam" },
    body: { sw: "Kipindi cha majaribio katika wilaya tatu za Dar es Salaam kilikamilika kwa mafanikio, wakihusu wananchi 2,400 na maombi 1,800 yaliyoshughulikiwa kwa muda wa wiki nane.", en: "The pilot period across three Dar es Salaam districts concluded successfully, involving 2,400 citizens and 1,800 applications processed over eight weeks." },
  },
];

const tagColorMap: Record<string, string> = {
  emerald: "bg-emerald-100 text-emerald-700",
  blue: "bg-blue-100 text-blue-700",
  purple: "bg-purple-100 text-purple-700",
  orange: "bg-orange-100 text-orange-700",
};

export function KituoChaHabariPage({ lang = "sw" }: KituoChaHabariPageProps) {
  const sw = lang === "sw";

  return (
    <div className="max-w-4xl mx-auto py-8 px-4 space-y-8">
      {/* Back to Home */}
      <div className="mb-6">
        <a
          href="/"
          className="inline-flex items-center gap-2 text-sm font-bold text-stone-500 hover:text-emerald-600 transition-colors group"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="group-hover:-translate-x-1 transition-transform">
            <path d="M19 12H5M12 5l-7 7 7 7"/>
          </svg>
          {lang === "sw" ? "Rudi Nyumbani" : "Back to Home"}
        </a>
      </div>

      {/* Header */}
      <div className="text-center space-y-3">
        <span className="inline-block px-3 py-1 bg-blue-100 text-blue-700 text-xs font-black uppercase tracking-widest rounded-full">
          {sw ? "Kituo cha Habari" : "News Centre"}
        </span>
        <h1 className="text-2xl sm:text-3xl font-black text-stone-900 tracking-tight">
          {sw ? "Habari na Matangazo" : "News & Announcements"}
        </h1>
        <p className="text-stone-500 text-sm sm:text-base max-w-xl mx-auto leading-relaxed">
          {sw
            ? "Habari za hivi karibuni, maboresho ya mfumo, na matangazo muhimu kuhusu huduma za E-Mtaa."
            : "Latest news, system updates and important announcements about E-Mtaa services."}
        </p>
        <a
          href="https://www.ega.go.tz/standard/3"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 mt-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold rounded-xl transition-colors"
        >
          <ExternalLink size={14} />
          {sw ? "Habari za eGA" : "eGA News"}
        </a>
      </div>

      {/* Breaking / Featured */}
      <div className="bg-gradient-to-br from-emerald-600 to-teal-700 rounded-3xl p-6 sm:p-8 text-white">
        <div className="flex items-center gap-2 mb-4">
          <Radio size={16} className="animate-pulse" />
          <span className="text-xs font-black uppercase tracking-widest text-emerald-200">
            {sw ? "Habari Mpya" : "Latest News"}
          </span>
        </div>
        <h2 className="text-xl sm:text-2xl font-black mb-3 leading-tight">
          {sw
            ? "E-Mtaa Sasa Inapatikana Mikoa Yote 31 ya Tanzania"
            : "E-Mtaa Now Available Across All 31 Regions of Tanzania"}
        </h2>
        <p className="text-emerald-100 text-sm leading-relaxed mb-5">
          {sw
            ? "Baada ya majaribio yaliyofanikisha katika mikoa ya Dar es Salaam, Dodoma na Arusha, mfumo wa E-Mtaa sasa unaweza kutumika na wananchi kutoka mikoa yote 31 ya Tanzania Bara na Zanzibar."
            : "Following successful pilots in Dar es Salaam, Dodoma and Arusha regions, the E-Mtaa system is now accessible to citizens from all 31 regions of mainland Tanzania and Zanzibar."}
        </p>
        <div className="flex items-center gap-2 text-emerald-200 text-xs font-bold">
          <Calendar size={13} />
          <span>{sw ? "Juni 2025" : "June 2025"}</span>
        </div>
      </div>

      {/* News list */}
      <div className="space-y-4">
        <h2 className="font-black text-stone-900 text-lg flex items-center gap-2">
          <Newspaper size={20} className="text-emerald-600" />
          {sw ? "Habari Zilizopita" : "Previous News"}
        </h2>
        {news.map((item, i) => (
          <div key={i} className="bg-white border border-stone-100 rounded-2xl p-5 hover:border-emerald-200 hover:shadow-sm transition-all">
            <div className="flex items-center gap-2 mb-3 flex-wrap">
              <span className={`text-[10px] font-black px-2 py-0.5 rounded-full uppercase tracking-wide ${tagColorMap[item.tagColor]}`}>
                {sw ? item.tag.sw : item.tag.en}
              </span>
              <span className="text-stone-400 text-xs flex items-center gap-1">
                <Calendar size={11} />
                {new Date(item.date).toLocaleDateString(sw ? "sw-TZ" : "en-GB", { day: "numeric", month: "long", year: "numeric" })}
              </span>
            </div>
            <h3 className="font-black text-stone-900 text-sm sm:text-base mb-2">
              {sw ? item.title.sw : item.title.en}
            </h3>
            <p className="text-stone-500 text-sm leading-relaxed">
              {sw ? item.body.sw : item.body.en}
            </p>
          </div>
        ))}
      </div>

      {/* External eGA news */}
      <div className="bg-stone-900 rounded-2xl p-6 text-white text-center space-y-3">
        <Megaphone size={28} className="mx-auto text-blue-400" />
        <h3 className="font-black text-lg">
          {sw ? "Habari Zaidi kutoka eGA" : "More News from eGA"}
        </h3>
        <p className="text-stone-400 text-sm">
          {sw
            ? "Tembelea tovuti ya Serikali Mtandao (eGA) kupata habari zote za serikali mtandao Tanzania."
            : "Visit the eGovernment Authority (eGA) website for all e-government news in Tanzania."}
        </p>
        <a
          href="https://www.ega.go.tz/standard/3"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl transition-colors text-sm"
        >
          <ArrowRight size={14} />
          {sw ? "Nenda eGA Kituo cha Habari" : "Go to eGA News Centre"}
        </a>
      </div>
    </div>
  );
}

export default KituoChaHabariPage;
