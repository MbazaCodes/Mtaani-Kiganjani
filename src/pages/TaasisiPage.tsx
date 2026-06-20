import React, { useState, useMemo } from "react";
import {
  TrendingUp, MapPin, BookOpen, Heart, Truck, Wifi, Shield,
  Leaf, Building2, Search, ExternalLink, Phone, Mail, ChevronRight,
  ArrowLeft, X,
} from "lucide-react";
import { CATEGORIES, type Category, type Taasisi } from "@/data/taasisi";

interface TaasisiPageProps { lang?: string; }

const ICON_MAP: Record<string, React.ReactNode> = {
  TrendingUp: <TrendingUp size={22} />, MapPin: <MapPin size={22} />,
  BookOpen: <BookOpen size={22} />, Heart: <Heart size={22} />,
  Truck: <Truck size={22} />, Wifi: <Wifi size={22} />,
  Shield: <Shield size={22} />, Leaf: <Leaf size={22} />,
  Building2: <Building2 size={22} />,
};

const COLOR: Record<string, { bg: string; text: string; border: string; pill: string }> = {
  emerald: { bg: "bg-emerald-50", text: "text-emerald-700", border: "border-emerald-200", pill: "bg-emerald-100 text-emerald-700" },
  amber:   { bg: "bg-amber-50",   text: "text-amber-700",   border: "border-amber-200",   pill: "bg-amber-100 text-amber-700" },
  blue:    { bg: "bg-blue-50",    text: "text-blue-700",    border: "border-blue-200",    pill: "bg-blue-100 text-blue-700" },
  red:     { bg: "bg-red-50",     text: "text-red-700",     border: "border-red-200",     pill: "bg-red-100 text-red-700" },
  orange:  { bg: "bg-orange-50",  text: "text-orange-700",  border: "border-orange-200",  pill: "bg-orange-100 text-orange-700" },
  purple:  { bg: "bg-purple-50",  text: "text-purple-700",  border: "border-purple-200",  pill: "bg-purple-100 text-purple-700" },
  slate:   { bg: "bg-slate-50",   text: "text-slate-700",   border: "border-slate-200",   pill: "bg-slate-100 text-slate-700" },
  lime:    { bg: "bg-lime-50",    text: "text-lime-700",    border: "border-lime-200",    pill: "bg-lime-100 text-lime-700" },
  teal:    { bg: "bg-teal-50",    text: "text-teal-700",    border: "border-teal-200",    pill: "bg-teal-100 text-teal-700" },
};

export function TaasisiPage({ lang = "sw" }: TaasisiPageProps) {
  const sw = lang === "sw";
  const [selectedCat, setSelectedCat] = useState<Category | null>(null);
  const [selectedTaasisi, setSelectedTaasisi] = useState<Taasisi | null>(null);
  const [search, setSearch] = useState("");

  // Global search across all taasisi
  const searchResults = useMemo(() => {
    if (!search.trim()) return [];
    const q = search.toLowerCase();
    const results: (Taasisi & { catColor: string; catName: string })[] = [];
    CATEGORIES.forEach(cat => {
      cat.taasisi.forEach(t => {
        if (
          t.name.toLowerCase().includes(q) ||
          (t.nameFull || "").toLowerCase().includes(q) ||
          t.descSw.toLowerCase().includes(q) ||
          t.descEn.toLowerCase().includes(q)
        ) {
          results.push({ ...t, catColor: cat.color, catName: sw ? cat.nameSw : cat.nameEn });
        }
      });
    });
    return results;
  }, [search, sw]);

  const c = selectedCat ? COLOR[selectedCat.color] : COLOR.teal;

  // ── Detail modal ────────────────────────────────────────────────────────
  if (selectedTaasisi && selectedCat) {
    const col = COLOR[selectedCat.color];
    return (
      <div className="max-w-2xl mx-auto py-6 px-4">
        <button onClick={() => setSelectedTaasisi(null)} className="inline-flex items-center gap-2 text-sm font-bold text-stone-500 hover:text-stone-800 mb-6 transition-colors">
          <ArrowLeft size={15} /> {sw ? "Rudi kwenye orodha" : "Back to list"}
        </button>
        <div className={`rounded-3xl p-6 sm:p-8 border ${col.border} ${col.bg} space-y-5`}>
          {/* Header */}
          <div className="flex items-start gap-4">
            <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-xl font-black ${col.pill} shrink-0`}>
              {selectedTaasisi.name.slice(0, 2)}
            </div>
            <div>
              <h1 className="text-xl font-black text-stone-900">{selectedTaasisi.name}</h1>
              {selectedTaasisi.nameFull && <p className={`text-sm font-bold ${col.text} mt-0.5`}>{selectedTaasisi.nameFull}</p>}
              <span className={`inline-block mt-2 text-[10px] font-black px-2 py-0.5 rounded-full ${col.pill}`}>
                {sw ? selectedCat.nameSw : selectedCat.nameEn}
              </span>
            </div>
          </div>

          {/* Description */}
          <p className="text-stone-600 text-sm leading-relaxed">
            {sw ? selectedTaasisi.descSw : selectedTaasisi.descEn}
          </p>

          {/* Contact info */}
          <div className="space-y-2.5">
            {selectedTaasisi.location && (
              <div className="flex items-center gap-2.5 text-sm text-stone-600">
                <MapPin size={15} className={col.text} />
                {selectedTaasisi.location}
              </div>
            )}
            {selectedTaasisi.phone && (
              <a href={`tel:${selectedTaasisi.phone}`} className="flex items-center gap-2.5 text-sm text-stone-600 hover:text-stone-900 transition-colors">
                <Phone size={15} className={col.text} />
                {selectedTaasisi.phone}
              </a>
            )}
            {selectedTaasisi.email && (
              <a href={`mailto:${selectedTaasisi.email}`} className="flex items-center gap-2.5 text-sm text-stone-600 hover:text-stone-900 transition-colors">
                <Mail size={15} className={col.text} />
                {selectedTaasisi.email}
              </a>
            )}
          </div>

          {/* CTA */}
          <a
            href={selectedTaasisi.href}
            target="_blank"
            rel="noopener noreferrer"
            className={`flex items-center justify-center gap-2 w-full py-3 px-5 rounded-2xl font-bold text-sm text-white transition-colors ${
              selectedCat.color === "emerald" ? "bg-emerald-600 hover:bg-emerald-700" :
              selectedCat.color === "blue"    ? "bg-blue-600 hover:bg-blue-700" :
              selectedCat.color === "red"     ? "bg-red-600 hover:bg-red-700" :
              selectedCat.color === "purple"  ? "bg-purple-600 hover:bg-purple-700" :
              "bg-stone-800 hover:bg-stone-900"
            }`}
          >
            <ExternalLink size={15} />
            {sw ? "Tembelea Tovuti Rasmi" : "Visit Official Website"}
          </a>
        </div>
      </div>
    );
  }

  // ── Category institutions list ──────────────────────────────────────────
  if (selectedCat) {
    return (
      <div className="max-w-3xl mx-auto py-6 px-4 space-y-5">
        {/* Back */}
        <button onClick={() => setSelectedCat(null)} className="inline-flex items-center gap-2 text-sm font-bold text-stone-500 hover:text-stone-800 transition-colors">
          <ArrowLeft size={15} /> {sw ? "Rudi kwenye makundi" : "Back to categories"}
        </button>

        {/* Category header */}
        <div className={`rounded-2xl p-5 border ${c.border} ${c.bg} flex items-center gap-4`}>
          <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${c.pill}`}>
            {ICON_MAP[selectedCat.icon]}
          </div>
          <div>
            <h1 className="text-lg font-black text-stone-900">{sw ? selectedCat.nameSw : selectedCat.nameEn}</h1>
            <p className="text-sm text-stone-500">{selectedCat.taasisi.length} {sw ? "taasisi" : "institutions"}</p>
          </div>
        </div>

        {/* Institution cards */}
        <div className="space-y-3">
          {selectedCat.taasisi.map(t => (
            <button
              key={t.id}
              onClick={() => setSelectedTaasisi(t)}
              className={`w-full text-left flex items-center gap-4 p-4 bg-white border border-stone-100 rounded-2xl hover:border-stone-300 hover:shadow-sm transition-all group`}
            >
              <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 text-sm font-black ${c.pill} group-hover:scale-105 transition-transform`}>
                {t.name.slice(0, 2)}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-black text-stone-900 text-sm">{t.name}</p>
                {t.nameFull && <p className={`text-xs font-medium ${c.text} truncate`}>{t.nameFull}</p>}
                <p className="text-xs text-stone-400 mt-0.5 line-clamp-1">{sw ? t.descSw : t.descEn}</p>
              </div>
              <ChevronRight size={16} className="text-stone-300 group-hover:text-stone-500 shrink-0 transition-colors" />
            </button>
          ))}
        </div>
      </div>
    );
  }

  // ── Categories grid (home) ──────────────────────────────────────────────
  return (
    <div className="max-w-4xl mx-auto py-6 px-4 space-y-6">
      {/* Back to home */}
      <a href="/" className="inline-flex items-center gap-2 text-sm font-bold text-stone-500 hover:text-emerald-600 transition-colors group">
        <ArrowLeft size={15} className="group-hover:-translate-x-1 transition-transform" />
        {sw ? "Rudi Nyumbani" : "Back to Home"}
      </a>

      {/* Header */}
      <div className="text-center space-y-2">
        <span className="inline-block px-3 py-1 bg-teal-100 text-teal-700 text-xs font-black uppercase tracking-widest rounded-full">
          {sw ? "Taasisi za Serikali" : "Government Institutions"}
        </span>
        <h1 className="text-2xl sm:text-3xl font-black text-stone-900 tracking-tight">
          {sw ? "Chagua Idara ya Serikali" : "Select Government Department"}
        </h1>
        <p className="text-stone-500 text-sm max-w-md mx-auto">
          {sw ? "Chagua mkundo ili uone taasisi zote zilizo ndani yake na mawasiliano yao rasmi." : "Select a category to see all institutions and their official contacts."}
        </p>
      </div>

      {/* Search */}
      <div className="relative">
        <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-400" />
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder={sw ? "Tafuta taasisi... (mfano: TRA, NIDA, Mahakama)" : "Search institutions... (e.g. TRA, NIDA, Police)"}
          className="w-full pl-11 pr-10 py-3 rounded-2xl border border-stone-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
        />
        {search && (
          <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600">
            <X size={15} />
          </button>
        )}
      </div>

      {/* Search results */}
      {search.trim() && (
        <div className="space-y-2">
          <p className="text-xs font-bold text-stone-400 uppercase tracking-wide">
            {searchResults.length} {sw ? "matokeo" : "results"}
          </p>
          {searchResults.length === 0 ? (
            <div className="text-center py-10 text-stone-400 text-sm">
              {sw ? "Hakuna taasisi inayolingana na utafutaji wako." : "No institutions match your search."}
            </div>
          ) : (
            searchResults.map(t => {
              const cat = CATEGORIES.find(c => c.taasisi.some(ti => ti.id === t.id))!;
              const col = COLOR[t.catColor];
              return (
                <button
                  key={t.id}
                  onClick={() => { setSelectedCat(cat); setSelectedTaasisi(t); setSearch(""); }}
                  className="w-full text-left flex items-center gap-3 p-4 bg-white border border-stone-100 rounded-2xl hover:border-stone-300 hover:shadow-sm transition-all group"
                >
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-xs font-black shrink-0 ${col.pill}`}>
                    {t.name.slice(0, 2)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-black text-stone-900 text-sm">{t.name}</p>
                    <p className={`text-xs font-bold ${col.text}`}>{t.catName}</p>
                  </div>
                  <ChevronRight size={15} className="text-stone-300 group-hover:text-stone-500 shrink-0" />
                </button>
              );
            })
          )}
        </div>
      )}

      {/* Categories grid */}
      {!search.trim() && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {CATEGORIES.map(cat => {
            const col = COLOR[cat.color];
            return (
              <button
                key={cat.id}
                onClick={() => setSelectedCat(cat)}
                className={`text-left p-5 rounded-2xl border ${col.border} ${col.bg} hover:shadow-md transition-all group space-y-3`}
              >
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${col.pill} group-hover:scale-110 transition-transform`}>
                  {ICON_MAP[cat.icon]}
                </div>
                <div>
                  <p className="font-black text-stone-900 text-sm leading-tight">{sw ? cat.nameSw : cat.nameEn}</p>
                  <p className={`text-xs font-bold mt-1 ${col.text}`}>
                    {cat.taasisi.length} {sw ? "taasisi" : "institutions"}
                  </p>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex -space-x-1">
                    {cat.taasisi.slice(0, 3).map(t => (
                      <span key={t.id} className={`w-6 h-6 rounded-full border-2 border-white flex items-center justify-center text-[9px] font-black ${col.pill}`}>
                        {t.name.slice(0, 1)}
                      </span>
                    ))}
                    {cat.taasisi.length > 3 && (
                      <span className="w-6 h-6 rounded-full border-2 border-white bg-stone-200 flex items-center justify-center text-[9px] font-black text-stone-500">
                        +{cat.taasisi.length - 3}
                      </span>
                    )}
                  </div>
                  <ChevronRight size={15} className={`${col.text} group-hover:translate-x-1 transition-transform`} />
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default TaasisiPage;
