import React, { useState } from "react";
import { ChevronDown, ChevronUp, HelpCircle, FileText, Clock, Shield, CreditCard, MessageCircle, Phone } from "lucide-react";

interface HelpPageProps {
  lang: string;
}

interface FaqItem {
  q: { sw: string; en: string };
  a: { sw: string; en: string };
  icon: React.ReactNode;
}

const FAQS: FaqItem[] = [
  {
    q: { sw: "Jinsi ya kuomba huduma?", en: "How do I apply for a service?" },
    a: {
      sw: "1. Ingia kwenye akaunti yako\n2. Bonyeza 'Omba' kwenye menyu\n3. Chagua huduma unayoihitaji\n4. Jaza fomu na taarifa zako\n5. Wasilisha na subiri mchakato",
      en: "1. Log into your account\n2. Click 'Apply' in the menu\n3. Choose the service you need\n4. Fill in the form with your details\n5. Submit and wait for processing",
    },
    icon: <FileText size={16} className="text-emerald-600" />,
  },
  {
    q: { sw: "Muda gani wa kupata jibu?", en: "How long does approval take?" },
    a: {
      sw: "Muda wa kawaida ni siku 1-3 za kazi. Huduma za dharura zinaweza kushughulikiwa ndani ya saa 24. Unaweza kufuatilia hali ya maombi yako kwenye 'Maombi Yangu'.",
      en: "Typical processing time is 1-3 business days. Urgent services may be processed within 24 hours. You can track your application status in 'My Applications'.",
    },
    icon: <Clock size={16} className="text-blue-600" />,
  },
  {
    q: { sw: "Nyaraka gani ninahitaji?", en: "What documents do I need?" },
    a: {
      sw: "Nyaraka zinazohitajika hutofautiana kwa kila huduma:\n• Utambulisho wa Mkazi: Picha ya NIDA, picha ya uso\n• Barua ya Utambulisho: NIDA, sababu ya barua\n• Makubaliano ya Mauzo/Pango: NIDA za pande zote, maelezo ya mali\n• Kibali cha Sherehe/Mazishi/Ujenzi: Taarifa husika\n\nMfumo utakuonyesha nyaraka zinazohitajika wakati wa kujaza fomu.",
      en: "Required documents vary by service:\n• Resident Certificate: NIDA photo, selfie photo\n• Introduction Letter: NIDA, purpose of letter\n• Sales/Rental Agreement: Both parties' NIDA, asset details\n• Event/Burial/Construction Permit: Relevant details\n\nThe system will show you what's needed when you fill the form.",
    },
    icon: <FileText size={16} className="text-amber-600" />,
  },
  {
    q: { sw: "Ninawezaje kulipa?", en: "How do I pay?" },
    a: {
      sw: "Baada ya maombi yako kuidhinishwa, utapokea arifa ya malipo. Bonyeza 'Lipa Sasa' na ufuate maelekezo. Kwa sasa mfumo unatumia njia ya maonyesho. Malipo ya M-Pesa na benki yataongezwa hivi karibuni.",
      en: "After your application is approved, you'll receive a payment notification. Click 'Pay Now' and follow the instructions. Currently the system uses demo mode. M-Pesa and bank payments will be added soon.",
    },
    icon: <CreditCard size={16} className="text-purple-600" />,
  },
  {
    q: { sw: "Jinsi ya kupakua hati yangu?", en: "How do I download my document?" },
    a: {
      sw: "1. Nenda 'Maombi Yangu'\n2. Bonyeza maombi yenye hali 'Imetolewa'\n3. Bonyeza 'Pakua Hati' au 'Pakua Risiti'\n4. Hati ya PDF itapakuliwa kwenye simu/kompyuta yako",
      en: "1. Go to 'My Applications'\n2. Click the application with 'Issued' status\n3. Click 'Download Document' or 'Download Receipt'\n4. A PDF document will download to your phone/computer",
    },
    icon: <FileText size={16} className="text-emerald-600" />,
  },
  {
    q: { sw: "Jinsi ya kuthibitisha hati?", en: "How do I verify a document?" },
    a: {
      sw: "Kila hati ina QR code. Changanua QR code kwa kamera ya simu yako au nenda 'Hakiki Hati' kwenye menyu na uingize namba ya kumbukumbu. Mfumo utakuonyesha kama hati ni halali.",
      en: "Every document has a QR code. Scan it with your phone camera or go to 'Verify Document' in the menu and enter the reference number. The system will show you if the document is valid.",
    },
    icon: <Shield size={16} className="text-blue-600" />,
  },
  {
    q: { sw: "Nifanye nini kama maombi yangu yamekataliwa?", en: "What if my application is rejected?" },
    a: {
      sw: "Ukipokea arifa ya kukataliwa, angalia sababu iliyotolewa. Unaweza:\n1. Kurekebisha taarifa na kuwasilisha tena\n2. Kuwasiliana na ofisi ya kata kupitia 'Msaada'\n3. Kutuma ujumbe kupitia 'Mazungumzo ya Maombi' kuuliza maelezo zaidi",
      en: "If you receive a rejection notification, check the reason provided. You can:\n1. Correct the information and resubmit\n2. Contact the ward office through 'Support'\n3. Send a message via 'Application Chat' to ask for more details",
    },
    icon: <MessageCircle size={16} className="text-red-600" />,
  },
  {
    q: { sw: "Namba ya simu ya msaada?", en: "Support contact number?" },
    a: {
      sw: "Kwa msaada, tumia:\n• Mfumo wa Msaada ndani ya E-Mtaa (bonyeza 'Msaada')\n• Tuma ujumbe kwenye 'Mawasiliano'\n• Tembelea ofisi ya kata yako\n\nE-Mtaa ni mfumo wa maonyesho. Kwa huduma rasmi, wasiliana na ofisi ya serikali ya mtaa wako.",
      en: "For support, use:\n• The Support system within E-Mtaa (click 'Support')\n• Send a message via 'Communications'\n• Visit your local ward office\n\nE-Mtaa is a demonstration system. For official services, contact your local government office.",
    },
    icon: <Phone size={16} className="text-stone-600" />,
  },
];

export const HelpPage: React.FC<HelpPageProps> = ({ lang }) => {
  const sw = lang === "sw";
  const [openIdx, setOpenIdx] = useState<number | null>(null);

  return (
    <div className="max-w-3xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 bg-emerald-100 rounded-xl flex items-center justify-center">
          <HelpCircle size={22} className="text-emerald-600" />
        </div>
        <div>
          <h1 className="text-xl font-black text-stone-900">
            {sw ? "Msaada na Maswali" : "Help & FAQ"}
          </h1>
          <p className="text-sm text-stone-500">
            {sw ? "Maswali yanayoulizwa mara kwa mara" : "Frequently asked questions"}
          </p>
        </div>
      </div>

      <div className="space-y-2">
        {FAQS.map((faq, i) => (
          <div
            key={i}
            className="bg-white border border-stone-200 rounded-xl overflow-hidden"
          >
            <button
              onClick={() => setOpenIdx(openIdx === i ? null : i)}
              className="w-full flex items-center justify-between px-4 py-3.5 hover:bg-stone-50 transition-colors text-left"
            >
              <div className="flex items-center gap-3">
                {faq.icon}
                <span className="text-sm font-bold text-stone-800">
                  {sw ? faq.q.sw : faq.q.en}
                </span>
              </div>
              {openIdx === i ? (
                <ChevronUp size={16} className="text-stone-400 shrink-0" />
              ) : (
                <ChevronDown size={16} className="text-stone-400 shrink-0" />
              )}
            </button>
            {openIdx === i && (
              <div className="px-4 pb-4 pt-1 border-t border-stone-100">
                <p className="text-sm text-stone-600 whitespace-pre-wrap leading-relaxed pl-8">
                  {sw ? faq.a.sw : faq.a.en}
                </p>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};
