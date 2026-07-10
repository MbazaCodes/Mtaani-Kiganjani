/**
 * ServiceCharterPage — Mkataba wa Huduma kwa Mteja
 *
 * OR-MUU 2014 §2.1.v.d — Kila taasisi ya serikali lazima iwe na
 * Mkataba wa Huduma unaoweka wazi haki, majukumu, na viwango
 * vya huduma kwa wananchi.
 */
import React, { useState } from "react";
import {
  FileCheck2,
  Clock,
  CheckCircle2,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  Shield,
  Star,
  MessageSquare,
  RefreshCw,
  Award,
  Users,
  Zap,
} from "lucide-react";

interface ServiceCharterPageProps {
  lang: string;
}

const L = (lang: string, sw: string, en: string) => (lang === "sw" ? sw : en);

// ─── Service delivery standards ─────────────────────────────────────────────
const SERVICE_STANDARDS = [
  {
    service: { sw: "Cheti cha Utambulisho wa Mkazi", en: "Resident Identity Certificate" },
    submitTime: { sw: "Papo hapo", en: "Immediate" },
    approvalTime: { sw: "Siku 1–3 za kazi", en: "1–3 working days" },
    fee: "TZS 5,000",
    availability: "24/7",
  },
  {
    service: { sw: "Kibali cha Mazishi", en: "Burial Permit" },
    submitTime: { sw: "Papo hapo", en: "Immediate" },
    approvalTime: { sw: "Masaa 2–24", en: "2–24 hours" },
    fee: "TZS 2,000",
    availability: "24/7",
  },
  {
    service: { sw: "Kibali cha Sherehe", en: "Celebration/Event Permit" },
    submitTime: { sw: "Papo hapo", en: "Immediate" },
    approvalTime: { sw: "Siku 2–5 za kazi", en: "2–5 working days" },
    fee: "TZS 10,000",
    availability: "24/7",
  },
  {
    service: { sw: "Kibali cha Ujenzi (Mdogo)", en: "Minor Construction Permit" },
    submitTime: { sw: "Papo hapo", en: "Immediate" },
    approvalTime: { sw: "Siku 3–7 za kazi", en: "3–7 working days" },
    fee: "TZS 15,000",
    availability: "24/7",
  },
  {
    service: { sw: "Barua ya Utambulisho", en: "Introduction Letter" },
    submitTime: { sw: "Papo hapo", en: "Immediate" },
    approvalTime: { sw: "Siku 1–3 za kazi", en: "1–3 working days" },
    fee: "TZS 3,000",
    availability: "24/7",
  },
  {
    service: { sw: "Makubaliano ya Mauzo", en: "Sales Agreement" },
    submitTime: { sw: "Papo hapo", en: "Immediate" },
    approvalTime: { sw: "Siku 3–5 za kazi", en: "3–5 working days" },
    fee: "TZS 20,000",
    availability: "24/7",
  },
  {
    service: { sw: "Makubaliano ya Upangaji", en: "Rental Agreement" },
    submitTime: { sw: "Papo hapo", en: "Immediate" },
    approvalTime: { sw: "Siku 3–5 za kazi", en: "3–5 working days" },
    fee: "TZS 15,000",
    availability: "24/7",
  },
  {
    service: { sw: "Taarifa ya Mgogoro", en: "Dispute Report" },
    submitTime: { sw: "Papo hapo", en: "Immediate" },
    approvalTime: { sw: "Siku 5–14 za kazi", en: "5–14 working days" },
    fee: "TZS 5,000",
    availability: "24/7",
  },
  {
    service: { sw: "Risiti ya Malipo", en: "Payment Receipt" },
    submitTime: { sw: "Papo hapo", en: "Immediate" },
    approvalTime: { sw: "Papo hapo baada ya malipo", en: "Immediately after payment" },
    fee: (lang: string) => L(lang, "Bila ada", "Free"),
    availability: "24/7",
  },
];

// ─── Citizen rights ──────────────────────────────────────────────────────────
const CITIZEN_RIGHTS = [
  {
    icon: <Zap size={18} className="text-emerald-600" />,
    title: { sw: "Haki ya Huduma ya Haraka", en: "Right to Fast Service" },
    desc: {
      sw: "Kupata huduma ndani ya muda uliowekwa kwenye mkataba huu bila kuchelewa bila sababu.",
      en: "Receive service within the time standards set in this charter without unreasonable delay.",
    },
  },
  {
    icon: <Shield size={18} className="text-blue-600" />,
    title: { sw: "Haki ya Faragha na Usalama wa Data", en: "Right to Data Privacy & Security" },
    desc: {
      sw: "Data zako za kibinafsi zinalindwa kwa mujibu wa Sheria ya Serikali Mtandao, 2019. Hazitashirikiwa na mtu yeyote bila idhini yako.",
      en: "Your personal data is protected under the eGovernment Act, 2019. It will not be shared without your consent.",
    },
  },
  {
    icon: <MessageSquare size={18} className="text-amber-600" />,
    title: { sw: "Haki ya Kupata Maelezo", en: "Right to Explanation" },
    desc: {
      sw: "Kama maombi yako yamekataliwa, una haki ya kupata sababu ya ukataji kwa maandishi.",
      en: "If your application is rejected, you have the right to receive the reason in writing.",
    },
  },
  {
    icon: <RefreshCw size={18} className="text-purple-600" />,
    title: { sw: "Haki ya Kukata Rufaa", en: "Right to Appeal" },
    desc: {
      sw: "Una haki ya kuwasilisha malalamiko au kuomba mapitio ya uamuzi kupitia mfumo wa msaada.",
      en: "You have the right to submit a complaint or request review of a decision through the support system.",
    },
  },
  {
    icon: <Star size={18} className="text-amber-600" />,
    title: { sw: "Haki ya Huduma Sawa", en: "Right to Equal Service" },
    desc: {
      sw: "Kila raia anapaswa kupata huduma sawa bila ubaguzi wa aina yoyote.",
      en: "Every citizen deserves equal service without discrimination of any kind.",
    },
  },
  {
    icon: <Award size={18} className="text-rose-600" />,
    title: { sw: "Haki ya Malalamiko", en: "Right to Complain" },
    desc: {
      sw: "Una haki ya kutoa malalamiko yoyote kupitia mfumo wa msaada au kwa Msimamizi wa Halmashauri.",
      en: "You have the right to file any complaint through the support system or to the Council Administrator.",
    },
  },
];

// ─── Our commitments ─────────────────────────────────────────────────────────
const OUR_COMMITMENTS = [
  {
    sw: "Kujibu maombi yote ndani ya muda ulioainishwa",
    en: "Respond to all applications within stated timeframes",
  },
  {
    sw: "Kutoa sababu wazi za ukataji wa maombi",
    en: "Provide clear reasons for rejected applications",
  },
  {
    sw: "Kuhakikisha mfumo unapatikana masaa 24, siku 7",
    en: "Ensure system availability 24 hours, 7 days a week",
  },
  {
    sw: "Kulinda data za wananchi kwa kiwango cha juu cha usalama",
    en: "Protect citizen data with the highest security standards",
  },
  {
    sw: "Kuboresha mfumo kwa mujibu wa maoni ya watumiaji",
    en: "Continuously improve the system based on user feedback",
  },
  {
    sw: "Kuhakikisha nyaraka zote zinaweza kuthibitishwa kwa QR code",
    en: "Ensure all documents are verifiable via QR code",
  },
  {
    sw: "Kutoa taarifa za hali ya maombi kwa wakati halisi",
    en: "Provide real-time application status notifications",
  },
  { sw: "Kufanya mafunzo ya watumishi kila robo mwaka", en: "Train staff every quarter" },
];

export const ServiceCharterPage: React.FC<ServiceCharterPageProps> = ({ lang }) => {
  const sw = lang === "sw";
  const [openRight, setOpenRight] = useState<number | null>(null);

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-10">
      {/* ── Header ── */}
      <div className="bg-gradient-to-br from-blue-800 to-emerald-900 rounded-3xl p-8 text-white">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center">
            <FileCheck2 size={24} className="text-white" />
          </div>
          <div>
            <p className="text-blue-300 text-xs font-bold uppercase tracking-widest">
              OR-MUU 2014 §2.1.v.d
            </p>
            <p className="text-white/70 text-xs">Mtaani Kiganjani — E-Mtaa Portal</p>
          </div>
        </div>
        <h1 className="text-3xl font-black text-white mb-2">
          {sw ? "Mkataba wa Huduma kwa Mteja" : "Customer Service Charter"}
        </h1>
        <p className="text-white/80 max-w-2xl leading-relaxed">
          {sw
            ? "Hii ni ahadi yetu rasmi kwako kama raia wa Tanzania. Mkataba huu unaeleza viwango vya huduma, haki zako, na majukumu yetu kwa mujibu wa Mwongozo wa Kusimamia Tovuti za Serikali (OR-MUU, 2014)."
            : "This is our formal commitment to you as a Tanzanian citizen. This charter outlines service standards, your rights, and our obligations under the Government Website Management Guidelines (OR-MUU, 2014)."}
        </p>
        <div className="mt-4 flex items-center gap-2">
          <CheckCircle2 size={16} className="text-emerald-400" />
          <span className="text-sm text-white/80 font-bold">
            {sw ? "Imethibitishwa: Desemba 2024" : "Approved: December 2024"}
          </span>
        </div>
      </div>

      {/* ── Service Standards Table ── */}
      <section className="bg-white dark:bg-stone-900 rounded-3xl p-6 border border-stone-200 dark:border-stone-700 shadow-sm">
        <div className="flex items-center gap-3 mb-6">
          <Clock size={20} className="text-blue-600" />
          <h2 className="text-xl font-black text-stone-900 dark:text-stone-100">
            {sw ? "Viwango vya Muda wa Huduma" : "Service Time Standards"}
          </h2>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-stone-50 dark:bg-stone-800 text-left">
                <th className="px-4 py-3 font-black text-stone-600 dark:text-stone-400 text-xs uppercase tracking-wider rounded-tl-xl">
                  {sw ? "Huduma" : "Service"}
                </th>
                <th className="px-4 py-3 font-black text-stone-600 dark:text-stone-400 text-xs uppercase tracking-wider">
                  {sw ? "Kuwasilisha" : "Submission"}
                </th>
                <th className="px-4 py-3 font-black text-stone-600 dark:text-stone-400 text-xs uppercase tracking-wider">
                  {sw ? "Muda wa Idhini" : "Approval Time"}
                </th>
                <th className="px-4 py-3 font-black text-stone-600 dark:text-stone-400 text-xs uppercase tracking-wider">
                  {sw ? "Ada" : "Fee"}
                </th>
                <th className="px-4 py-3 font-black text-stone-600 dark:text-stone-400 text-xs uppercase tracking-wider rounded-tr-xl">
                  {sw ? "Upatikanaji" : "Availability"}
                </th>
              </tr>
            </thead>
            <tbody>
              {SERVICE_STANDARDS.map((s, i) => (
                <tr
                  key={i}
                  className={`border-t border-stone-100 dark:border-stone-800 ${i % 2 === 1 ? "bg-stone-50 dark:bg-stone-800/50" : ""}`}
                >
                  <td className="px-4 py-3 font-bold text-stone-800 dark:text-stone-200">
                    {sw ? s.service.sw : s.service.en}
                  </td>
                  <td className="px-4 py-3 text-stone-600 dark:text-stone-400">
                    {sw ? s.submitTime.sw : s.submitTime.en}
                  </td>
                  <td className="px-4 py-3">
                    <span className="inline-flex items-center gap-1 text-emerald-700 dark:text-emerald-400 font-bold text-xs bg-emerald-50 dark:bg-emerald-900/30 px-2 py-0.5 rounded-full">
                      <Clock size={10} />
                      {sw ? s.approvalTime.sw : s.approvalTime.en}
                    </span>
                  </td>
                  <td className="px-4 py-3 font-bold text-stone-800 dark:text-stone-200">
                    {typeof s.fee === "function" ? s.fee(lang) : s.fee}
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-xs font-black text-blue-700 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30 px-2 py-0.5 rounded-full">
                      {s.availability}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <p className="text-xs text-stone-400 dark:text-stone-500 mt-4 flex items-center gap-1.5">
          <AlertCircle size={12} />
          {sw
            ? "Muda unaweza kutofautiana kulingana na wingi wa maombi na maamuzi ya afisa wa kata. Ada zinaonyeshwa kwa madhumuni ya maonyesho."
            : "Times may vary based on application volume and ward officer decisions. Fees shown for demonstration purposes."}
        </p>
      </section>

      {/* ── Citizen Rights ── */}
      <section className="bg-white dark:bg-stone-900 rounded-3xl p-6 border border-stone-200 dark:border-stone-700 shadow-sm">
        <div className="flex items-center gap-3 mb-6">
          <Users size={20} className="text-emerald-600" />
          <h2 className="text-xl font-black text-stone-900 dark:text-stone-100">
            {sw ? "Haki Zako kama Raia" : "Your Rights as a Citizen"}
          </h2>
        </div>

        <div className="space-y-2">
          {CITIZEN_RIGHTS.map((r, i) => (
            <div
              key={i}
              className="border border-stone-200 dark:border-stone-700 rounded-xl overflow-hidden"
            >
              <button
                className="w-full flex items-center gap-3 px-4 py-3.5 hover:bg-stone-50 dark:hover:bg-stone-800 text-left transition-colors"
                onClick={() => setOpenRight(openRight === i ? null : i)}
              >
                <div className="shrink-0">{r.icon}</div>
                <span className="flex-1 font-bold text-sm text-stone-800 dark:text-stone-200">
                  {sw ? r.title.sw : r.title.en}
                </span>
                {openRight === i ? (
                  <ChevronUp size={16} className="text-stone-400 shrink-0" />
                ) : (
                  <ChevronDown size={16} className="text-stone-400 shrink-0" />
                )}
              </button>
              {openRight === i && (
                <div className="px-4 pb-4 pt-1 border-t border-stone-100 dark:border-stone-800">
                  <p className="text-sm text-stone-600 dark:text-stone-400 leading-relaxed pl-9">
                    {sw ? r.desc.sw : r.desc.en}
                  </p>
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* ── Our Commitments ── */}
      <section className="bg-emerald-50 dark:bg-emerald-900/20 rounded-3xl p-6 border border-emerald-200 dark:border-emerald-800">
        <div className="flex items-center gap-3 mb-5">
          <CheckCircle2 size={20} className="text-emerald-600" />
          <h2 className="text-xl font-black text-emerald-900 dark:text-emerald-300">
            {sw ? "Ahadi Zetu Kwako" : "Our Commitments to You"}
          </h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {OUR_COMMITMENTS.map((c, i) => (
            <div key={i} className="flex items-start gap-2">
              <CheckCircle2 size={14} className="text-emerald-500 mt-0.5 shrink-0" />
              <span className="text-sm text-emerald-800 dark:text-emerald-300">
                {sw ? c.sw : c.en}
              </span>
            </div>
          ))}
        </div>
      </section>

      {/* ── Complaints & Escalation ── */}
      <section className="bg-white dark:bg-stone-900 rounded-3xl p-6 border border-stone-200 dark:border-stone-700 shadow-sm">
        <div className="flex items-center gap-3 mb-5">
          <MessageSquare size={20} className="text-red-600" />
          <h2 className="text-xl font-black text-stone-900 dark:text-stone-100">
            {sw ? "Malalamiko na Mapitio" : "Complaints & Escalation"}
          </h2>
        </div>

        <div className="space-y-4">
          {[
            {
              step: "1",
              title: { sw: "Tumia Mfumo wa Msaada", en: "Use the Support System" },
              desc: {
                sw: "Wasiliana kupitia 'Msaada' ndani ya E-Mtaa. Tunajibu ndani ya saa 24.",
                en: "Contact via 'Support' within E-Mtaa. We respond within 24 hours.",
              },
              color: "bg-blue-600",
            },
            {
              step: "2",
              title: { sw: "Wasiliana na Afisa WEO", en: "Contact WEO Officer" },
              desc: {
                sw: "Kama hujaridhika, wasiliana na Afisa Mtendaji wa Kata (WEO) wako moja kwa moja.",
                en: "If unsatisfied, contact your Ward Executive Officer (WEO) directly.",
              },
              color: "bg-amber-600",
            },
            {
              step: "3",
              title: { sw: "Kata Rufaa kwa Halmashauri", en: "Appeal to Council" },
              desc: {
                sw: "Kwa matatizo makubwa, wasiliana na Mkurugenzi wa Halmashauri kwa maandishi.",
                en: "For serious issues, contact the Council Director in writing.",
              },
              color: "bg-red-600",
            },
          ].map((s) => (
            <div key={s.step} className="flex gap-4">
              <div
                className={`w-8 h-8 ${s.color} text-white rounded-full flex items-center justify-center font-black text-sm shrink-0`}
              >
                {s.step}
              </div>
              <div className="flex-1 pb-4 border-b border-stone-100 dark:border-stone-800 last:border-0">
                <p className="font-black text-stone-800 dark:text-stone-200 text-sm">
                  {sw ? s.title.sw : s.title.en}
                </p>
                <p className="text-sm text-stone-500 dark:text-stone-400 mt-1">
                  {sw ? s.desc.sw : s.desc.en}
                </p>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-4 flex gap-3">
          <a
            href="mailto:mlalamiko@e-mtaatz.xyz"
            className="flex-1 text-center py-3 bg-red-600 hover:bg-red-700 text-white rounded-xl font-bold text-sm transition-colors"
          >
            {sw ? "Tuma Malalamiko" : "File Complaint"}
          </a>
          <a
            href="mailto:msaada@e-mtaatz.xyz"
            className="flex-1 text-center py-3 bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 dark:hover:bg-stone-700 text-stone-700 dark:text-stone-300 rounded-xl font-bold text-sm transition-colors"
          >
            {sw ? "Msaada wa Jumla" : "General Support"}
          </a>
        </div>
      </section>

      {/* Signature / Approval */}
      <section className="bg-stone-900 dark:bg-stone-950 rounded-3xl p-6 text-white text-center">
        <p className="text-white/70 text-sm mb-2">
          {sw ? "Imeidhinishwa na kutolewa na:" : "Approved and issued by:"}
        </p>
        <p className="font-black text-lg text-white">
          {sw
            ? "Ofisi ya Rais — TAMISEMI / Mamlaka ya Serikali Mtandao"
            : "President's Office — TAMISEMI / eGovernment Authority"}
        </p>
        <p className="text-emerald-400 text-sm font-bold mt-1">
          {sw
            ? "Imesainiwa: Desemba 2024 · Inapitiwa: Kila Mwaka"
            : "Signed: December 2024 · Review: Annually"}
        </p>
        <div className="flex justify-center gap-3 mt-4">
          <span className="text-[10px] bg-white/10 border border-white/20 px-2 py-1 rounded font-black uppercase tracking-wider">
            OR-MUU 2014 §2.1.v.d
          </span>
          <span className="text-[10px] bg-emerald-900 border border-emerald-700 px-2 py-1 rounded font-black uppercase tracking-wider text-emerald-400">
            eGA Compliant
          </span>
        </div>
      </section>
    </div>
  );
};
