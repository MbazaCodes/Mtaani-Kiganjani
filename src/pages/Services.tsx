/**
 * Services Catalog — citizen selects which service to apply for.
 *
 * Categories: Vibali (Permits), Nyaraka (Documents),
 *   Makubaliano (Agreements), Malipo & Migogoro (Payments & Disputes)
 * Search, emoji icons, dynamic fee labels, verification gate.
 */
import React, { useState, useMemo } from "react";
import { motion } from "framer-motion";
import { ArrowRight, Lock, Search } from "lucide-react";
import { useLanguage } from "@/context/LanguageContext";
import { HARDCODED_SERVICES } from "@/constants/services";
import { Service } from "@/lib/supabase";
import { formatCurrency, getCurrencyForUser } from "@/lib/currency";
import { useAuth } from "@/context/AuthContext";

interface ServicesProps {
  onSelectService: (service: Service) => void;
  onRefresh?: () => void;
}

const SERVICE_META: Record<
  string,
  { icon: string; category: string; feeLabelSw?: string; feeLabelEn?: string }
> = {
  "Utambulisho wa Mkazi": { icon: "🪪", category: "documents" },
  "Kibari cha Mazishi": { icon: "🕊", category: "permits" },
  "Kibari cha Sherehe": { icon: "🎉", category: "permits" },
  "Kibari cha Ujezi Mdogo": { icon: "🏗", category: "permits" },
  "Barua ya Utambulisho": {
    icon: "📝",
    category: "documents",
    feeLabelSw: "TSh 3,000 – 10,000",
    feeLabelEn: "TSh 3,000 – 10,000",
  },
  "Makubaliano ya Mauzo": {
    icon: "🤝",
    category: "agreements",
    feeLabelSw: "3% ya thamani",
    feeLabelEn: "3% of value",
  },
  "Makubaliano ya Pango": {
    icon: "🔑",
    category: "agreements",
    feeLabelSw: "TSh 10,000+",
    feeLabelEn: "TSh 10,000+",
  },
  "Malipo na Michango": {
    icon: "💰",
    category: "payments",
    feeLabelSw: "Kiasi kinachobadilika",
    feeLabelEn: "Variable amount",
  },
  "Migogoro na Mashauri": {
    icon: "⚖",
    category: "disputes",
    feeLabelSw: "TSh 5,000 / Bure",
    feeLabelEn: "TSh 5,000 / Free",
  },
};

const CATEGORIES = [
  { id: "all", sw: "Zote", en: "All", icon: "📋" },
  { id: "permits", sw: "Vibali", en: "Permits", icon: "📜" },
  { id: "documents", sw: "Nyaraka", en: "Documents & ID", icon: "📄" },
  { id: "agreements", sw: "Makubaliano", en: "Agreements", icon: "🤝" },
  { id: "payments", sw: "Malipo", en: "Payments", icon: "💰" },
  { id: "disputes", sw: "Migogoro", en: "Disputes & Issues", icon: "⚖" },
];

export function Services({ onSelectService }: ServicesProps) {
  const { lang } = useLanguage();
  const { user } = useAuth();
  const displayCurrency = getCurrencyForUser(user?.is_diaspora, user?.country_of_residence);
  const L = (sw: string, en: string) => (lang === "sw" ? sw : en);

  const [searchQuery, setSearchQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState("all");

  const filteredServices = useMemo(() => {
    return HARDCODED_SERVICES.filter((s) => {
      const meta = SERVICE_META[s.name];
      if (activeCategory !== "all" && meta?.category !== activeCategory) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return (
          s.name.toLowerCase().includes(q) ||
          (s.name_en || "").toLowerCase().includes(q) ||
          (s.description || "").toLowerCase().includes(q) ||
          (s.description_en || "").toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [searchQuery, activeCategory]);

  const getFeeLabel = (service: Service): string => {
    const meta = SERVICE_META[service.name];
    if (meta?.feeLabelSw && lang === "sw") return meta.feeLabelSw;
    if (meta?.feeLabelEn && lang === "en") return meta.feeLabelEn;
    if (service.fee > 0) return formatCurrency(service.fee, displayCurrency);
    return L("Bure / Kinachobadilika", "Free / Variable");
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-5"
    >
      {/* Header */}
      <div>
        <h2 className="text-xl sm:text-2xl font-black text-stone-900">
          {L("Huduma Zinazopatikana", "Available Services")}
        </h2>
        <p className="text-sm text-stone-500 font-medium mt-0.5">
          {L(
            "Chagua huduma unayoihitaji na ufanye maombi.",
            "Choose the service you need and apply.",
          )}
        </p>
      </div>

      {/* Search */}
      <div className="relative">
        <Search
          size={16}
          className="absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400 pointer-events-none"
        />
        <input
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder={L("Tafuta huduma...", "Search services...")}
          className="w-full pl-10 pr-4 py-3 border border-stone-200 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none bg-white"
        />
      </div>

      {/* Category tabs */}
      <div className="flex gap-1.5 overflow-x-auto pb-1 -mx-3 px-3 sm:mx-0 sm:px-0">
        {CATEGORIES.map((cat) => (
          <button
            key={cat.id}
            onClick={() => setActiveCategory(cat.id)}
            className={`px-3 sm:px-4 py-2 rounded-full text-xs sm:text-sm font-bold whitespace-nowrap transition-all flex items-center gap-1.5 ${
              activeCategory === cat.id
                ? "bg-stone-800 text-white shadow"
                : "bg-stone-100 text-stone-600 hover:bg-stone-200"
            }`}
          >
            <span>{cat.icon}</span>
            {lang === "sw" ? cat.sw : cat.en}
          </button>
        ))}
      </div>

      {/* Verification warning */}
      {!user?.is_verified && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3">
          <Lock size={18} className="text-amber-600 shrink-0 mt-0.5" />
          <div>
            <p className="font-bold text-amber-800 text-sm">
              {L("Akaunti Yako Haijathibitishwa", "Your Account is Not Verified")}
            </p>
            <p className="text-xs text-amber-700 mt-0.5">
              {L(
                "Lazima akaunti yako ithibitishwe kabla ya kutumia huduma. Wasiliana na ofisi.",
                "Your account must be verified before using services. Contact the office.",
              )}
            </p>
          </div>
        </div>
      )}

      {/* Service Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
        {filteredServices.length === 0 ? (
          <div className="col-span-2 bg-white rounded-2xl border border-stone-200 p-8 text-center">
            <p className="text-stone-500 font-bold">
              {L("Hakuna huduma zinazolingana", "No matching services")}
            </p>
          </div>
        ) : (
          filteredServices.map((service) => {
            const meta = SERVICE_META[service.name] || { icon: "📋", category: "other" };
            const verified = user?.is_verified;
            return (
              <div
                key={service.id}
                className={`bg-white rounded-2xl border border-stone-100 shadow-sm overflow-hidden transition-all flex flex-col ${
                  verified
                    ? "hover:shadow-lg hover:border-emerald-400 cursor-pointer group"
                    : "opacity-75 cursor-not-allowed"
                }`}
                onClick={() => verified && onSelectService(service)}
              >
                <div className="p-5 flex-1">
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="w-11 h-11 rounded-xl bg-stone-100 group-hover:bg-emerald-50 flex items-center justify-center text-xl transition-colors">
                      {meta.icon}
                    </div>
                    <span className="bg-amber-50 text-amber-800 px-2.5 py-1 rounded-full text-[10px] font-bold border border-amber-100 shrink-0">
                      {getFeeLabel(service)}
                    </span>
                  </div>
                  <h3 className="font-black text-stone-900 text-base leading-snug mb-0.5">
                    {lang === "sw" ? service.name : service.name_en || service.name}
                  </h3>
                  <p className="text-[10px] text-stone-400 font-medium mb-2">
                    {lang === "sw" ? service.name_en || "" : service.name}
                  </p>
                  <p className="text-xs text-stone-500 line-clamp-2 leading-relaxed">
                    {lang === "sw"
                      ? service.description
                      : service.description_en || service.description}
                  </p>
                </div>
                <div className="px-5 pb-5">
                  <button
                    disabled={!verified}
                    className={`w-full py-3 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition-all ${
                      verified
                        ? "bg-emerald-600 text-white hover:bg-emerald-700 shadow-lg shadow-emerald-100 group-hover:scale-[1.01]"
                        : "bg-stone-200 text-stone-500"
                    }`}
                  >
                    {verified ? (
                      <>
                        {L("Omba Sasa", "Apply Now")}{" "}
                        <ArrowRight
                          size={14}
                          className="group-hover:translate-x-0.5 transition-transform"
                        />
                      </>
                    ) : (
                      <>
                        <Lock size={13} /> {L("Inasubiri Uhakiki", "Pending Verification")}
                      </>
                    )}
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </motion.div>
  );
}

export default Services;
