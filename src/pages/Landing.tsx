import React, { useState } from "react";
import { motion } from "framer-motion";
import {
  Building2,
  ArrowRight,
  ShieldCheck,
  Shield,
  Globe2,
  Moon,
  Sun,
  Users2,
  FileCheck2,
  Smartphone,
  MapPin,
  Clock,
  CheckCircle2,
  Search,
  Menu,
  X,
  Eye,
  ExternalLink,
  Mail,
  MessageSquare,
} from "lucide-react";
import { useLanguage } from "@/context/LanguageContext";
import { useDarkMode } from "@/hooks/useDarkMode";
import { useOnlineCount, useSiteVisits, useLiveAppCount } from "@/hooks/useSiteStats";
import { TANZANIA_LOGO_URL } from "@/constants/services";

interface LandingProps {
  onShowAuth: (mode: "login" | "signup", isDiaspora?: boolean) => void;
  onShowVerify?: () => void;
}

export function Landing({ onShowAuth, onShowVerify }: LandingProps) {
  const { lang, setLang, t } = useLanguage();
  const { isDark, toggle: toggleDark } = useDarkMode();
  const onlineCount = useOnlineCount();
  const siteVisits = useSiteVisits();
  const liveAppCount = useLiveAppCount();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="min-h-screen bg-stone-50 selection:bg-emerald-100 selection:text-emerald-900">
      {/* ── Navigation ──────────────────────────────────────────────────── */}
      <nav className="fixed top-0 w-full bg-white/90 backdrop-blur-xl border-b border-stone-200 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between">
          {/* Logo */}
          <div className="flex items-center gap-2">
            <img
              src={TANZANIA_LOGO_URL}
              alt="Coat of Arms"
              className="w-8 h-8 object-contain"
              referrerPolicy="no-referrer"
            />
            <div className="flex flex-col leading-none">
              <span className="text-base font-black tracking-tighter text-stone-900">E-MTAA</span>
              <span className="text-[7px] font-bold text-stone-500 uppercase tracking-widest hidden sm:block">
                Digital Local Government
              </span>
            </div>
          </div>

          {/* Desktop nav items */}
          <div className="hidden sm:flex items-center gap-2">
            {/* Lang switcher */}
            <div className="flex items-center gap-0.5 bg-stone-100 rounded-full p-1">
              {(["sw", "en"] as const).map((l) => (
                <button
                  key={l}
                  onClick={() => setLang(l)}
                  type="button"
                  className={`px-2.5 py-1 rounded-full text-[10px] font-bold transition-all ${lang === l ? "bg-white shadow-sm text-emerald-700" : "text-stone-500 hover:bg-stone-200"}`}
                >
                  {l.toUpperCase()}
                </button>
              ))}
            </div>
            <button
              onClick={toggleDark}
              type="button"
              className="p-2 text-stone-400 hover:text-stone-600 hover:bg-stone-100 rounded-full transition-colors"
              title={isDark ? "Light mode" : "Dark mode"}
            >
              {isDark ? <Sun size={16} /> : <Moon size={16} />}
            </button>
            {/* About Us */}
            <a
              href="/about"
              className="text-sm font-bold text-stone-600 hover:text-stone-900 px-3 py-2 rounded-xl hover:bg-stone-50 transition-colors"
            >
              {lang === "sw" ? "Kuhusu Sisi" : "About Us"}
            </a>
            {/* Machapisho */}
            <a
              href="/machapisho"
              className="text-sm font-bold text-stone-600 hover:text-stone-900 px-3 py-2 rounded-xl hover:bg-stone-50 transition-colors"
            >
              {lang === "sw" ? "Machapisho" : "Publications"}
            </a>
            {/* Kituo cha Habari */}
            <a
              href="/habari"
              className="text-sm font-bold text-stone-600 hover:text-stone-900 px-3 py-2 rounded-xl hover:bg-stone-50 transition-colors"
            >
              {lang === "sw" ? "Kituo cha Habari" : "News Centre"}
            </a>
            {onShowVerify && (
              <button
                onClick={onShowVerify}
                type="button"
                className="text-sm font-bold text-emerald-600 hover:text-emerald-700 px-3 py-2 flex items-center gap-1.5 rounded-xl hover:bg-emerald-50 transition-colors"
              >
                <Search size={15} /> {lang === "sw" ? "Hakiki Hati" : "Verify Doc"}
              </button>
            )}
            <button
              onClick={() => onShowAuth("login")}
              type="button"
              className="text-sm font-bold text-stone-600 hover:text-stone-900 px-3 py-2 rounded-xl hover:bg-stone-50 transition-colors"
            >
              {t("nav.login")}
            </button>
            <button
              onClick={() => onShowAuth("signup")}
              type="button"
              className="bg-stone-900 text-white text-sm font-bold px-5 py-2 rounded-full hover:bg-stone-800 transition-all shadow-md active:scale-95"
            >
              {t("nav.signup")}
            </button>
          </div>

          {/* Mobile: lang + hamburger */}
          <div className="flex sm:hidden items-center gap-2">
            <div className="flex items-center gap-0.5 bg-stone-100 rounded-full p-0.5">
              {(["sw", "en"] as const).map((l) => (
                <button
                  key={l}
                  onClick={() => setLang(l)}
                  type="button"
                  className={`px-2 py-1 rounded-full text-[9px] font-bold transition-all ${lang === l ? "bg-white shadow-sm text-emerald-700" : "text-stone-500"}`}
                >
                  {l.toUpperCase()}
                </button>
              ))}
            </div>
            <button
              onClick={() => setMobileMenuOpen((v) => !v)}
              type="button"
              className="p-2 rounded-xl hover:bg-stone-100 text-stone-600 transition-colors"
              aria-label="Open menu"
            >
              {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
        </div>

        {/* Mobile dropdown menu */}
        {mobileMenuOpen && (
          <div className="sm:hidden bg-white border-t border-stone-100 px-4 py-3 space-y-1">
            <button
              onClick={toggleDark}
              type="button"
              className="p-2 text-stone-400 hover:text-stone-600 hover:bg-stone-100 rounded-full transition-colors"
              title={isDark ? "Light mode" : "Dark mode"}
            >
              {isDark ? <Sun size={16} /> : <Moon size={16} />}
            </button>
            <a
              href="/about"
              onClick={() => setMobileMenuOpen(false)}
              className="w-full text-left text-sm font-bold text-stone-700 flex items-center gap-2 py-2.5 px-3 rounded-xl hover:bg-stone-50"
            >
              {lang === "sw" ? "Kuhusu Sisi" : "About Us"}
            </a>
            <a
              href="/machapisho"
              onClick={() => setMobileMenuOpen(false)}
              className="w-full text-left text-sm font-bold text-stone-700 flex items-center gap-2 py-2.5 px-3 rounded-xl hover:bg-stone-50"
            >
              {lang === "sw" ? "Machapisho" : "Publications"}
            </a>
            <a
              href="/habari"
              onClick={() => setMobileMenuOpen(false)}
              className="w-full text-left text-sm font-bold text-stone-700 flex items-center gap-2 py-2.5 px-3 rounded-xl hover:bg-stone-50"
            >
              {lang === "sw" ? "Kituo cha Habari" : "News Centre"}
            </a>
            {onShowVerify && (
              <button
                onClick={() => {
                  onShowVerify();
                  setMobileMenuOpen(false);
                }}
                type="button"
                className="w-full text-left text-sm font-bold text-emerald-600 flex items-center gap-2 py-2.5 px-3 rounded-xl hover:bg-emerald-50"
              >
                <Search size={16} /> {lang === "sw" ? "Hakiki Hati" : "Verify Document"}
              </button>
            )}
            <button
              onClick={() => {
                onShowAuth("login");
                setMobileMenuOpen(false);
              }}
              type="button"
              className="w-full text-left text-sm font-bold text-stone-700 py-2.5 px-3 rounded-xl hover:bg-stone-50"
            >
              {t("nav.login")}
            </button>
            <button
              onClick={() => {
                onShowAuth("signup");
                setMobileMenuOpen(false);
              }}
              type="button"
              className="w-full text-sm font-bold bg-stone-900 text-white py-2.5 px-3 rounded-xl hover:bg-stone-800 text-center"
            >
              {t("nav.signup")}
            </button>
          </div>
        )}
      </nav>

      {/* ── Hero Section ────────────────────────────────────────────────── */}
      <section className="pt-20 sm:pt-28 pb-10 sm:pb-16 px-4 sm:px-6 overflow-hidden">
        <div className="max-w-7xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-8 lg:gap-16 items-center">
            {/* Text content */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="space-y-5 sm:space-y-7 text-center sm:text-left"
            >
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-50 border border-emerald-100 text-emerald-700 text-xs font-bold mx-auto sm:mx-0">
                <ShieldCheck size={13} />
                {lang === "sw" ? "Mfumo Rasmi wa Serikali" : "Official Government Portal"}
              </div>

              <h1 className="text-3xl sm:text-5xl lg:text-7xl font-black tracking-tight text-stone-900 leading-[1] sm:leading-[0.95]">
                {lang === "sw" ? "Huduma za Mtaa" : "Local Services"}
                <span className="block text-emerald-600 italic font-heading font-normal">
                  Kiganjani Mwako.
                </span>
              </h1>

              <p className="text-base sm:text-lg text-stone-600 leading-relaxed font-medium max-w-lg mx-auto sm:mx-0">
                {lang === "sw"
                  ? "Pata vibali, barua za utambulisho, na huduma zote za serikali ya mtaa kwa urahisi, haraka na usalama."
                  : "Access permits, introduction letters, and all local government services easily, quickly and securely."}
              </p>

              {/* CTA buttons */}
              <div className="flex flex-col sm:flex-row gap-3">
                <button
                  onClick={() => onShowAuth("signup")}
                  type="button"
                  className="w-full sm:w-auto bg-emerald-600 text-white px-7 py-3.5 rounded-2xl font-bold text-base hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-200 flex items-center justify-center gap-2 group"
                >
                  {lang === "sw" ? "Anza Sasa" : "Get Started"}
                  <ArrowRight
                    size={18}
                    className="group-hover:translate-x-1 transition-transform"
                  />
                </button>
                <button
                  onClick={toggleDark}
                  type="button"
                  className="p-2 text-stone-400 hover:text-stone-600 hover:bg-stone-100 rounded-full transition-colors"
                  title={isDark ? "Light mode" : "Dark mode"}
                >
                  {isDark ? <Sun size={16} /> : <Moon size={16} />}
                </button>
                {onShowVerify && (
                  <button
                    onClick={onShowVerify}
                    type="button"
                    className="w-full sm:w-auto bg-white text-emerald-700 border-2 border-emerald-600 px-7 py-3.5 rounded-2xl font-bold text-base hover:bg-emerald-50 transition-all flex items-center justify-center gap-2"
                  >
                    <Search size={18} />
                    {lang === "sw" ? "Hakiki Hati" : "Verify Document"}
                  </button>
                )}
              </div>

              {/* Social proof */}
              <div className="flex items-center gap-4 justify-center sm:justify-start pt-2">
                <div className="flex -space-x-2.5">
                  {[1, 2, 3, 4].map((i) => (
                    <div
                      key={i}
                      className="w-9 h-9 rounded-full border-2 border-white bg-stone-200 overflow-hidden"
                    >
                      <img
                        src={`https://i.pravatar.cc/100?img=${i + 10}`}
                        alt="User"
                        referrerPolicy="no-referrer"
                      />
                    </div>
                  ))}
                </div>
                <p className="text-sm font-bold text-stone-500">
                  <span className="text-stone-900">50,000+</span>{" "}
                  {lang === "sw" ? "Watanzania wamesajiliwa" : "Tanzanians registered"}
                </p>
              </div>
            </motion.div>

            {/* Hero image — hidden on very small screens to save space */}
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.8, delay: 0.2 }}
              className="relative hidden sm:block"
            >
              <div className="relative z-10 bg-white rounded-[2rem] border border-stone-200 shadow-2xl overflow-hidden aspect-4/5 lg:aspect-square max-h-[420px] lg:max-h-none">
                <img
                  src="/hero-image.png"
                  alt="Mtaani Kiganjani — Huduma za Serikali za Mtaa Tanzania"
                  className="w-full h-full object-cover object-center"
                />
              </div>
              <div className="absolute -top-10 -right-10 w-40 h-40 bg-emerald-100 rounded-full blur-3xl opacity-50 -z-10" />
              <div className="absolute -bottom-10 -left-10 w-56 h-56 bg-blue-100 rounded-full blur-3xl opacity-50 -z-10" />
            </motion.div>
          </div>
        </div>
      </section>

      {/* ── Stats Section ───────────────────────────────────────────────── */}
      <section className="py-10 sm:py-16 bg-stone-900 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          {/* Live stats: online now + total visits */}
          <div className="flex flex-wrap items-center justify-center gap-x-8 gap-y-3 mb-8 sm:mb-10">
            <div className="flex items-center gap-2">
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-400"></span>
              </span>
              <span className="text-sm font-bold text-emerald-300">
                {onlineCount} {lang === "sw" ? "mtandaoni sasa" : "online now"}
              </span>
            </div>
            {siteVisits !== null && (
              <div className="flex items-center gap-2 text-sm font-bold text-stone-300">
                <Eye size={15} className="text-stone-400" />
                {siteVisits.toLocaleString()}{" "}
                {lang === "sw" ? "matembezi ya tovuti" : "site visits"}
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 sm:gap-10">
            {[
              {
                // Tanzania has 31 regions (26 mainland + 5 Zanzibar) per TAMISEMI
                num: "31",
                lbl: lang === "sw" ? "Mikoa" : "Regions",
              },
              {
                // 185 LGAs in Tanzania per TAMISEMI 2024 data
                num: "185",
                lbl: lang === "sw" ? "Halmashauri" : "Councils",
              },
              {
                // 9 services currently live on E-Mtaa
                num: "9",
                lbl: lang === "sw" ? "Huduma Zilizopo" : "Live Services",
              },
              {
                // Live count from DB — shows real number or "—" while loading
                num: liveAppCount !== null ? liveAppCount.toLocaleString() : "—",
                lbl: lang === "sw" ? "Maombi Yaliyowasilishwa" : "Applications Filed",
              },
            ].map(({ num, lbl }) => (
              <div key={lbl} className="text-center space-y-1">
                <div className="text-2xl sm:text-4xl lg:text-5xl font-black text-emerald-400">
                  {num}
                </div>
                <p className="text-stone-400 font-bold uppercase tracking-widest text-[9px] sm:text-[10px]">
                  {lbl}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── All 9 Services ─────────────────────────────────────────────── */}
      <section className="py-14 sm:py-24 px-4 sm:px-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center space-y-3 mb-10 sm:mb-16">
            <h2 className="text-2xl sm:text-4xl font-black tracking-tight text-stone-900">
              {lang === "sw" ? "Huduma Zote Zinazopatikana" : "All Available Services"}
            </h2>
            <p className="text-stone-500 font-medium max-w-xl mx-auto text-sm sm:text-base">
              {lang === "sw"
                ? "Huduma 9 za serikali ya mtaa — zote zinapatikana kidijitali kupitia E-MTAA."
                : "9 local government services — all available digitally through E-MTAA."}
            </p>
          </div>

          {/* Category groups */}
          {[
            {
              category: lang === "sw" ? "📜 Vibali na Nyaraka" : "📜 Permits & Documents",
              services: [
                {
                  icon: "🪪",
                  sw: "Utambulisho wa Mkazi",
                  en: "Resident Identity",
                  descSw: "Pata uthibitisho rasmi wa makazi yako kwenye mtaa wako.",
                  descEn: "Official proof of residence for banks, schools, passports.",
                  fee: "TSh 5,000",
                },
                {
                  icon: "📝",
                  sw: "Barua ya Utambulisho",
                  en: "Introduction Letter",
                  descSw: "Barua rasmi ya utambulisho kwa taasisi — binafsi, mtoto, au kwa niaba.",
                  descEn:
                    "Official introduction letter for institutions — self, minor, or on behalf.",
                  fee: "TSh 3,000–10,000",
                },
                {
                  icon: "🕊",
                  sw: "Kibari cha Mazishi",
                  en: "Burial Permit",
                  descSw: "Kibali cha kuzika marehemu kwa heshima na sheria.",
                  descEn: "Permit to bury the deceased with dignity and legal compliance.",
                  fee: "TSh 2,000",
                },
                {
                  icon: "🎉",
                  sw: "Kibari cha Sherehe",
                  en: "Celebration Permit",
                  descSw: "Kibali cha sherehe, harusi, tamasha, au mkutano.",
                  descEn: "Permit for celebrations, weddings, festivals, or gatherings.",
                  fee: "TSh 10,000",
                },
                {
                  icon: "🏗",
                  sw: "Kibari cha Ujezi Mdogo",
                  en: "Construction Permit",
                  descSw: "Kibali cha ujenzi mdogo — uzio, choo, upanuzi, n.k.",
                  descEn: "Permit for minor construction — fence, latrine, extension, etc.",
                  fee: "TSh 15,000",
                },
              ],
            },
            {
              category: lang === "sw" ? "🤝 Makubaliano na Malipo" : "🤝 Agreements & Payments",
              services: [
                {
                  icon: "🤝",
                  sw: "Makubaliano ya Mauzo",
                  en: "Sales Agreement",
                  descSw: "Mkataba rasmi wa mauzo kati ya muuzaji na mnunuzi waliothibitishwa.",
                  descEn: "Official sales contract between verified seller and buyer.",
                  fee: "3%",
                },
                {
                  icon: "🔑",
                  sw: "Makubaliano ya Pango",
                  en: "Rental Agreement",
                  descSw: "Mkataba wa kukodi nyumba kati ya mpangishaji na mpangaji.",
                  descEn: "Rental contract between verified landlord and tenant.",
                  fee: "TSh 10,000+",
                },
                {
                  icon: "💰",
                  sw: "Malipo na Michango",
                  en: "Payments & Contributions",
                  descSw: "Lipa faini, ada ya usafi, michango ya maendeleo, na malipo mengine.",
                  descEn: "Pay fines, sanitation fees, development contributions, and more.",
                  fee: lang === "sw" ? "Inabadilika" : "Variable",
                },
                {
                  icon: "⚖",
                  sw: "Migogoro na Mashauri",
                  en: "Disputes & Issues",
                  descSw: "Wasilisha mgogoro wa raia au ripoti tatizo la kijamii.",
                  descEn: "File a citizen dispute or report a community issue.",
                  fee: lang === "sw" ? "TSh 5,000 / Bure" : "TSh 5,000 / Free",
                },
              ],
            },
          ].map((group, gi) => (
            <div key={gi} className="mb-10 sm:mb-14 last:mb-0">
              <h3 className="text-base sm:text-lg font-black text-stone-800 mb-4 sm:mb-6">
                {group.category}
              </h3>
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                {group.services.map((svc, si) => (
                  <motion.div
                    key={si}
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: si * 0.06 }}
                    className="bg-white p-5 sm:p-6 rounded-2xl border border-stone-200 shadow-sm hover:shadow-lg hover:border-emerald-400 transition-all group"
                  >
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <div className="w-10 h-10 rounded-xl bg-stone-100 group-hover:bg-emerald-50 flex items-center justify-center text-xl transition-colors">
                        {svc.icon}
                      </div>
                      <span className="bg-amber-50 text-amber-800 px-2 py-0.5 rounded-full text-[10px] font-bold border border-amber-100 shrink-0">
                        {svc.fee}
                      </span>
                    </div>
                    <h4 className="font-black text-stone-900 text-sm sm:text-base leading-snug mb-1">
                      {lang === "sw" ? svc.sw : svc.en}
                    </h4>
                    <p className="text-xs text-stone-500 leading-relaxed mb-4">
                      {lang === "sw" ? svc.descSw : svc.descEn}
                    </p>
                    <button
                      onClick={() => onShowAuth("signup")}
                      type="button"
                      className="text-emerald-600 font-bold flex items-center gap-1.5 text-xs group-hover:gap-2.5 transition-all"
                    >
                      {lang === "sw" ? "Omba Sasa" : "Apply Now"} <ArrowRight size={14} />
                    </button>
                  </motion.div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── How It Works ─────────────────────────────────────────────────── */}
      <section className="py-14 sm:py-20 px-4 sm:px-6 bg-emerald-50">
        <div className="max-w-5xl mx-auto">
          <div className="text-center space-y-3 mb-10 sm:mb-14">
            <h2 className="text-2xl sm:text-4xl font-black tracking-tight text-stone-900">
              {lang === "sw" ? "Jinsi Inavyofanya Kazi" : "How It Works"}
            </h2>
            <p className="text-stone-500 font-medium max-w-lg mx-auto text-sm sm:text-base">
              {lang === "sw"
                ? "Hatua 4 rahisi — kutoka kwenye simu yako hadi hati rasmi."
                : "4 simple steps — from your phone to an official document."}
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              {
                num: "1",
                icon: <Smartphone size={24} />,
                sw: "Jisajili",
                en: "Register",
                descSw: "Fungua akaunti kwa NIDA yako na uthibitishwe kwa dakika chache.",
                descEn: "Create an account with your NIDA and get verified in minutes.",
              },
              {
                num: "2",
                icon: <FileCheck2 size={24} />,
                sw: "Omba Huduma",
                en: "Apply",
                descSw: "Jaza fomu ya huduma unayoihitaji — moja kwa moja kwenye simu yako.",
                descEn: "Fill the service form — directly on your phone.",
              },
              {
                num: "3",
                icon: <Users2 size={24} />,
                sw: "Ofisi Inakagua",
                en: "Office Reviews",
                descSw: "Wafanyakazi wa serikali ya mtaa wanakagua na kuidhinisha maombi yako.",
                descEn: "Local government staff review and approve your application.",
              },
              {
                num: "4",
                icon: <CheckCircle2 size={24} />,
                sw: "Pokea Hati",
                en: "Get Document",
                descSw: "Pakua hati rasmi au ichukue ofisini — tayari na muhuri.",
                descEn:
                  "Download your official document or collect at the office — sealed and signed.",
              },
            ].map((step, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="bg-white rounded-2xl p-6 text-center shadow-sm border border-emerald-100 relative"
              >
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 w-7 h-7 rounded-full bg-emerald-600 text-white flex items-center justify-center text-xs font-black shadow">
                  {step.num}
                </div>
                <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto mb-4 mt-2">
                  {step.icon}
                </div>
                <h4 className="font-black text-stone-900 mb-2">
                  {lang === "sw" ? step.sw : step.en}
                </h4>
                <p className="text-xs text-stone-500 leading-relaxed">
                  {lang === "sw" ? step.descSw : step.descEn}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Features Section ─────────────────────────────────────────────── */}
      <section className="py-14 sm:py-24 px-4 sm:px-6 bg-stone-100">
        <div className="max-w-7xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-10 lg:gap-20 items-center">
            <div className="space-y-8 sm:space-y-10 order-2 lg:order-1">
              <div className="space-y-3">
                <h2 className="text-2xl sm:text-4xl font-black tracking-tight text-stone-900">
                  {lang === "sw" ? "Kwanini Utumie E-MTAA?" : "Why Use E-MTAA?"}
                </h2>
                <p className="text-stone-500 font-medium text-sm sm:text-base">
                  {lang === "sw"
                    ? "Tumerahisisha upatikanaji wa huduma za serikali kwa kila mwananchi."
                    : "We have simplified access to government services for every citizen."}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-5 sm:gap-7">
                {[
                  {
                    icon: <Clock size={18} />,
                    title: lang === "sw" ? "Okoa Muda" : "Save Time",
                    desc:
                      lang === "sw"
                        ? "Hakuna haja ya kupanga foleni ofisini."
                        : "No need to queue at the office.",
                  },
                  {
                    icon: <ShieldCheck size={18} />,
                    title: lang === "sw" ? "Salama" : "Secure",
                    desc:
                      lang === "sw"
                        ? "Taarifa zako zinalindwa kwa teknolojia ya kisasa."
                        : "Your data is protected with modern technology.",
                  },
                  {
                    icon: <Smartphone size={18} />,
                    title: lang === "sw" ? "Rahisi" : "Easy to Use",
                    desc:
                      lang === "sw"
                        ? "Tumia simu yako popote ulipo."
                        : "Use your phone wherever you are.",
                  },
                  {
                    icon: <MapPin size={18} />,
                    title: lang === "sw" ? "Popote" : "Everywhere",
                    desc:
                      lang === "sw"
                        ? "Inapatikana mitaa yote Tanzania."
                        : "Available in all streets in Tanzania.",
                  },
                ].map((f, i) => (
                  <div key={i} className="space-y-2">
                    <div className="w-9 h-9 rounded-xl bg-white text-emerald-600 flex items-center justify-center shadow-sm">
                      {f.icon}
                    </div>
                    <h4 className="font-bold text-stone-900 text-sm">{f.title}</h4>
                    <p className="text-xs text-stone-500 leading-relaxed font-medium">{f.desc}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Diaspora CTA card */}
            <div className="bg-stone-900 rounded-3xl p-7 sm:p-10 text-white relative overflow-hidden order-1 lg:order-2">
              <div className="relative z-10 space-y-5">
                <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 border border-white/20 text-white text-xs font-bold">
                  <Globe2 size={13} /> {lang === "sw" ? "Huduma za Diaspora" : "Diaspora Services"}
                </div>
                <h3 className="text-xl sm:text-3xl font-black leading-tight">
                  {lang === "sw"
                    ? "Upo Nje ya Nchi? Bado Unaweza Kupata Huduma."
                    : "Living Abroad? You Can Still Access Services."}
                </h3>
                <p className="text-stone-400 leading-relaxed font-medium text-sm">
                  {lang === "sw"
                    ? "E-MTAA inawawezesha Watanzania waishio nje ya nchi kupata vibali na utambulisho bila kulazimika kusafiri."
                    : "E-MTAA enables Tanzanians living abroad to access permits and identification without having to travel."}
                </p>
                <button
                  onClick={() => onShowAuth("signup", true)}
                  type="button"
                  className="w-full bg-white text-stone-900 py-3.5 rounded-2xl font-bold hover:bg-stone-100 transition-all flex items-center justify-center gap-2 text-sm sm:text-base"
                >
                  {lang === "sw" ? "Jisajili kama Diaspora" : "Register as Diaspora"}
                  <ArrowRight size={18} />
                </button>
              </div>
              <Building2 className="absolute -right-8 -bottom-8 h-48 w-48 text-white/5 rotate-12" />
            </div>
          </div>
        </div>
      </section>

      {/* ── Footer (OR-MUU 2014 §2.1.v — mawasiliano, muundo, mkataba wa huduma) ─── */}
      <footer className="bg-stone-900 text-white pt-14 pb-8 px-4 sm:px-6">
        <div className="max-w-7xl mx-auto">

          {/* Top grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-10 mb-12">

            {/* Brand + about */}
            <div className="lg:col-span-1 space-y-4">
              <div className="flex items-center gap-3">
                <img src={TANZANIA_LOGO_URL} alt="Nembo ya Tanzania" className="w-10 h-10 object-contain" />
                <div>
                  <p className="font-black text-lg tracking-tight text-white">MTAANI KIGANJANI</p>
                  <p className="text-[9px] font-bold text-emerald-400 uppercase tracking-widest">E-Mtaa Portal</p>
                </div>
              </div>
              <p className="text-stone-400 text-sm leading-relaxed">
                {lang === "sw"
                  ? "Mfumo rasmi wa kidijitali wa Serikali za Mitaa Tanzania — unaowezesha wananchi kupata huduma za serikali ya mtaa bila kuacha nyumbani."
                  : "Tanzania's official digital local government portal — enabling citizens to access ward-level services from anywhere."}
              </p>
              {/* eGA compliance badge */}
              <div className="flex flex-wrap gap-2 pt-1">
                <span className="text-[9px] font-black bg-emerald-900 text-emerald-400 border border-emerald-700 px-2 py-1 rounded uppercase tracking-widest">PO-RALG / TAMISEMI</span>
                <span className="text-[9px] font-black bg-stone-800 text-stone-400 border border-stone-600 px-2 py-1 rounded uppercase tracking-widest">eGA Compliant</span>
              </div>
            </div>

            {/* Services (§2.1.xiii — Nifanyeje) */}
            <div className="space-y-4">
              <h4 className="font-black text-xs uppercase tracking-widest text-stone-300 flex items-center gap-2">
                <span className="w-4 h-0.5 bg-emerald-500 inline-block" />
                {lang === "sw" ? "Huduma Zetu" : "Our Services"}
              </h4>
              <ul className="space-y-2 text-sm text-stone-400">
                {[
                  lang === "sw" ? "Cheti cha Mkazi" : "Residency Certificate",
                  lang === "sw" ? "Kibali cha Mazishi" : "Burial Permit",
                  lang === "sw" ? "Kibali cha Sherehe" : "Celebration Permit",
                  lang === "sw" ? "Kibali cha Ujenzi" : "Construction Permit",
                  lang === "sw" ? "Barua ya Utambulisho" : "Introduction Letter",
                  lang === "sw" ? "Makubaliano ya Mauzo/Pango" : "Sale/Rental Agreement",
                  lang === "sw" ? "Taarifa ya Mgogoro" : "Dispute Report",
                ].map((s) => (
                  <li key={s} className="flex items-center gap-1.5 hover:text-emerald-400 transition-colors cursor-pointer">
                    <span className="w-1 h-1 rounded-full bg-emerald-500 shrink-0" />
                    {s}
                  </li>
                ))}
              </ul>
            </div>

            {/* Government links (§2.1.v.a — taasisi iliyoanzishwa na mamlaka) */}
            <div className="space-y-4">
              <h4 className="font-black text-xs uppercase tracking-widest text-stone-300 flex items-center gap-2">
                <span className="w-4 h-0.5 bg-emerald-500 inline-block" />
                {lang === "sw" ? "Serikali ya Tanzania" : "Government of Tanzania"}
              </h4>
              <ul className="space-y-2.5 text-sm text-stone-400">
                {[
                  { label: "PO-RALG (TAMISEMI)", href: "https://www.tamisemi.go.tz" },
                  { label: "eGA (Serikali Mtandao)", href: "https://www.ega.go.tz" },
                  { label: "NIDA", href: "https://www.nida.go.tz" },
                  { label: "Ofisi ya Rais (OR-TAMISEMI)", href: "https://www.tamisemi.go.tz" },
                  { label: "Serikali.go.tz", href: "https://www.serikali.go.tz" },
                ].map((l) => (
                  <li key={l.href}>
                    <a href={l.href} target="_blank" rel="noopener noreferrer"
                      className="hover:text-emerald-400 transition-colors flex items-center gap-1.5">
                      <ExternalLink size={11} className="shrink-0" />
                      {l.label}
                    </a>
                  </li>
                ))}
              </ul>

              {/* Wadau Katika Utendaji */}
              <h4 className="font-black text-xs uppercase tracking-widest text-stone-300 flex items-center gap-2 pt-2">
                <span className="w-4 h-0.5 bg-emerald-500 inline-block" />
                {lang === "sw" ? "Wadau Katika Utendaji" : "Implementation Partners"}
              </h4>
              <ul className="space-y-2.5 text-sm text-stone-400">
                {[
                  { label: "RITA — Wakala wa Usajili, Ufilisi na Udhamini", href: "https://www.rita.go.tz" },
                  { label: lang === "sw" ? "Idara ya Uhamiaji" : "Immigration Department", href: "https://www.immigration.go.tz" },
                  { label: lang === "sw" ? "Jeshi la Polisi Tanzania" : "Tanzania Police Force", href: "https://www.polisi.go.tz" },
                  { label: lang === "sw" ? "Wizara ya Mambo ya Ndani ya Nchi" : "Ministry of Home Affairs", href: "https://www.mhome.go.tz" },
                  { label: lang === "sw" ? "Mahakama ya Tanzania" : "Judiciary of Tanzania", href: "https://www.judiciary.go.tz" },
                ].map((l) => (
                  <li key={l.href}>
                    <a href={l.href} target="_blank" rel="noopener noreferrer"
                      className="hover:text-emerald-400 transition-colors flex items-center gap-1.5">
                      <ExternalLink size={11} className="shrink-0" />
                      {l.label}
                    </a>
                  </li>
                ))}
              </ul>

              {/* TEHAMA na Mawasiliano */}
              <h4 className="font-black text-xs uppercase tracking-widest text-stone-300 flex items-center gap-2 pt-3">
                <span className="w-4 h-0.5 bg-emerald-500 inline-block" />
                {lang === "sw" ? "TEHAMA na Mawasiliano" : "ICT & Communications"}
              </h4>
              <ul className="space-y-2.5 text-sm text-stone-400">
                {[
                  { label: lang === "sw" ? "Ofisi ya Rais — MCIT" : "President's Office — MCIT", href: "https://www.mcit.go.tz" },
                  { label: "TCRA — Mamlaka ya Mawasiliano", href: "https://www.tcra.go.tz" },
                  { label: "COSTECH — Sayansi na Teknolojia", href: "https://www.costech.or.tz" },
                  { label: "TTCL — Tanzania Telecom", href: "https://www.ttcl.co.tz" },
                  { label: lang === "sw" ? "Tume ya TEHAMA Tanzania" : "ICT Commission Tanzania", href: "https://www.ega.go.tz" },
                ].map((l) => (
                  <li key={l.href}>
                    <a href={l.href} target="_blank" rel="noopener noreferrer"
                      className="hover:text-emerald-400 transition-colors flex items-center gap-1.5">
                      <ExternalLink size={11} className="shrink-0" />
                      {l.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>

            {/* Contact info (§2.1.v.e — Mawasiliano ya Taasisi) */}
            <div className="space-y-4">
              <h4 className="font-black text-xs uppercase tracking-widest text-stone-300 flex items-center gap-2">
                <span className="w-4 h-0.5 bg-emerald-500 inline-block" />
                {lang === "sw" ? "Mawasiliano" : "Contact Us"}
              </h4>
              <ul className="space-y-3 text-sm text-stone-400">
                <li className="flex items-start gap-2">
                  <MapPin size={14} className="text-emerald-500 shrink-0 mt-0.5" />
                  <span>Ofisi ya Rais — TAMISEMI<br />Mtaa wa Magogoni, Dodoma</span>
                </li>
                <li className="flex items-center gap-2">
                  <Mail size={14} className="text-emerald-500 shrink-0" />
                  <a href="mailto:msaada@e-mtaatz.xyz" className="hover:text-emerald-400 transition-colors">
                    msaada@e-mtaatz.xyz
                  </a>
                </li>
                <li className="flex items-start gap-2">
                  <Shield size={14} className="text-emerald-500 shrink-0 mt-0.5" />
                  <span className="text-xs leading-relaxed">
                    {lang === "sw"
                      ? "Mfumo huu una hifadhi salama ya data kwa mujibu wa Sheria ya Serikali Mtandao, 2019."
                      : "This system complies with the eGovernment Act, 2019 for data protection."}
                  </span>
                </li>
              </ul>

              {/* Feedback link (OR-MUU §2.1.xi — sehemu ya mrejesho) */}
              <a href="mailto:mrejesho@e-mtaatz.xyz"
                className="inline-flex items-center gap-2 mt-2 px-3 py-2 bg-emerald-700 hover:bg-emerald-600 text-white text-xs font-bold rounded-lg transition-colors">
                <MessageSquare size={12} />
                {lang === "sw" ? "Tuma Mrejesho" : "Send Feedback"}
              </a>
            </div>
          </div>

          {/* Divider */}
          <div className="border-t border-stone-700 pt-8">
            <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
              <div className="text-xs text-stone-500 text-center sm:text-left space-y-1">
                <p>
                  © {new Date().getFullYear()} Mtaani Kiganjani (E-Mtaa) —{" "}
                  {lang === "sw" ? "Haki zote zimehifadhiwa." : "All rights reserved."}
                </p>
                <p className="text-[10px]">
                  {lang === "sw"
                    ? "Inatekelezwa kwa mujibu wa Mwongozo wa Kusimamia na Kuendesha Tovuti za Serikali (OR-MUU, 2014) na Viwango vya eGA (2025)."
                    : "Operated in compliance with the Government Website Management Guidelines (OR-MUU, 2014) and eGA Standards (2025)."}
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2 justify-center">
                <span className="text-[9px] font-black bg-stone-800 text-stone-400 px-2 py-1 rounded uppercase tracking-widest">ISO 9001:2015</span>
                <span className="text-[9px] font-black bg-stone-800 text-stone-400 px-2 py-1 rounded uppercase tracking-widest">eGA&#x2F;APA&#x2F;009</span>
                <span className="text-[9px] font-black bg-emerald-900 text-emerald-400 px-2 py-1 rounded uppercase tracking-widest">Tanzania Digital</span>
              </div>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
