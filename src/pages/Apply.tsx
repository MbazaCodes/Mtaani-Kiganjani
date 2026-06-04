import React, { useEffect, useState } from "react";
import type { AnyFormData, ApplicationDraft } from "@/types";
import { motion } from "framer-motion";
import { ArrowLeft, CreditCard, ShieldAlert, Briefcase, Loader2 } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useLanguage } from "@/context/LanguageContext";
import { TANZANIA_LOGO_URL } from "@/constants/services";
import { Service, supabase } from "@/lib/supabase";
import { formatCurrency, getCurrencyForUser } from "@/lib/currency";
import { DynamicFormGenerator } from "@/components/DynamicFormGenerator";
import { SERVICE_FORMS, hasServiceForm } from "@/components/forms";
import { useRouterView } from "@/components/layout/AppShell";

interface ApplyProps {
  selectedService: Service;
  onBack: () => void;
  onSubmit: (formData: Record<string, unknown>) => void;
  draft?: ApplicationDraft | null;
}

export function Apply({ selectedService, onBack, onSubmit, draft }: ApplyProps) {
  const { user } = useAuth();
  const { lang } = useLanguage();
  const { setView } = useRouterView();
  const displayCurrency = getCurrencyForUser(user?.is_diaspora, user?.country_of_residence);

  // ─── Business registration gate (Services 6 & 7) ─────────────────────────
  const requiresSeller = selectedService.name === "Makubaliano ya Mauzo";
  const requiresLandlord = selectedService.name === "Makubaliano ya Pango";
  const requiresBusinessReg = requiresSeller || requiresLandlord;

  const [gateLoading, setGateLoading] = useState(requiresBusinessReg);
  const [gateBlocked, setGateBlocked] = useState(false);
  const [gateReason, setGateReason] = useState<"none" | "pending" | "rejected" | "suspended">(
    "none",
  );

  useEffect(() => {
    if (!requiresBusinessReg || !user?.id) {
      setGateLoading(false);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const requiredType = requiresSeller ? "seller" : "landlord";
        const { data } = await supabase
          .from("business_registrations")
          .select("business_type, status")
          .eq("user_id", user.id)
          .in("business_type", [requiredType, "broker"])
          .order("created_at", { ascending: false });
        if (cancelled) return;
        const approved = data?.find((r) => r.status === "approved");
        if (approved) {
          setGateBlocked(false);
        } else {
          const pending = data?.find((r) => r.status === "pending");
          const suspended = data?.find((r) => r.status === "suspended");
          const rejected = data?.find((r) => r.status === "rejected");
          setGateBlocked(true);
          setGateReason(
            suspended ? "suspended" : pending ? "pending" : rejected ? "rejected" : "none",
          );
        }
      } catch (e) {
        console.error("gate check failed", e);
      } finally {
        if (!cancelled) setGateLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user?.id, requiresBusinessReg, requiresSeller]);

  // Ensure user profile has all required fields, provide defaults
  const userProfileForForm = user
    ? {
        id: user.id,
        first_name: user.first_name || "",
        middle_name: user.middle_name,
        last_name: user.last_name || "",
        email: user.email || "",
        phone: user.phone || "",
        nida_number: user.nida_number,
        region: user.region,
        district: user.district,
        ward: user.ward,
        street: user.street,
        is_diaspora: user.is_diaspora,
        role: user.role,
        is_verified: user.is_verified,
        account_status: user.account_status,
      }
    : null;

  // ─── Gate: loading state ────────────────────────────────────────────────
  if (gateLoading) {
    return (
      <div className="flex items-center justify-center min-h-[40vh]">
        <Loader2 size={32} className="animate-spin text-stone-400" />
      </div>
    );
  }

  // ─── Gate: blocked — show "must register" screen ────────────────────────
  if (gateBlocked) {
    const L = (sw: string, en: string) => (lang === "sw" ? sw : en);
    const roleLabelSw = requiresSeller ? "Muuzaji" : "Mpangishaji";
    const roleLabelEn = requiresSeller ? "Seller" : "Landlord";

    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-2xl mx-auto px-3 sm:px-6 py-6"
      >
        <button
          onClick={onBack}
          className="mb-4 flex items-center gap-2 text-stone-500 hover:text-stone-800 text-sm font-bold"
        >
          <ArrowLeft size={16} /> {L("Rudi Nyuma", "Go Back")}
        </button>

        <div className="bg-white rounded-2xl p-6 sm:p-8 shadow-sm border border-stone-200 text-center space-y-5">
          <div className="w-20 h-20 mx-auto bg-amber-100 rounded-full flex items-center justify-center">
            <ShieldAlert size={36} className="text-amber-700" />
          </div>

          <div>
            <h2 className="text-xl font-black text-stone-900 mb-2">
              {L(
                `Lazima Usajiliwe Kama ${roleLabelSw} Kwanza`,
                `You Must Register as a ${roleLabelEn} First`,
              )}
            </h2>
            <p className="text-sm text-stone-500 max-w-sm mx-auto">
              {L(
                `Huduma ya "${selectedService.name}" ni kwa watumiaji waliosajiliwa na kuthibitishwa pekee.`,
                `The "${selectedService.name_en || selectedService.name}" service is only available to verified business users.`,
              )}
            </p>
          </div>

          {gateReason === "pending" && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-left flex gap-2">
              <ShieldAlert size={16} className="text-amber-600 shrink-0 mt-0.5" />
              <p className="text-xs text-amber-700">
                {L(
                  "Maombi yako ya usajili yanaendelea kushughulikiwa. Subiri yakamilike.",
                  "Your registration application is being processed. Please wait for it to be reviewed.",
                )}
              </p>
            </div>
          )}
          {gateReason === "rejected" && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-left flex gap-2">
              <ShieldAlert size={16} className="text-red-600 shrink-0 mt-0.5" />
              <p className="text-xs text-red-700">
                {L(
                  "Maombi yako yalikataliwa. Tafadhali omba tena.",
                  "Your previous application was rejected. Please re-apply.",
                )}
              </p>
            </div>
          )}
          {gateReason === "suspended" && (
            <div className="bg-orange-50 border border-orange-200 rounded-xl p-3 text-left flex gap-2">
              <ShieldAlert size={16} className="text-orange-600 shrink-0 mt-0.5" />
              <p className="text-xs text-orange-700">
                {L(
                  "Akaunti yako ya biashara imesimamishwa. Wasiliana na ofisi.",
                  "Your business account has been suspended. Contact the office.",
                )}
              </p>
            </div>
          )}

          <button
            onClick={() => setView("agreement")}
            className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-stone-700 to-stone-900 hover:from-stone-800 hover:to-stone-950 text-white rounded-xl font-bold text-sm shadow-lg transition-all"
          >
            <Briefcase size={16} />
            {gateReason === "none"
              ? L("Anza Maombi ya Usajili", "Start Registration Application")
              : L("Nenda kwenye Lango la Biashara", "Go to Business Portal")}
          </button>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      className="max-w-3xl mx-auto space-y-6"
    >
      <button
        onClick={onBack}
        className="text-sm text-stone-500 hover:text-emerald-600 flex items-center gap-2 transition-colors font-bold"
      >
        <ArrowLeft className="h-4 w-4" />{" "}
        {lang === "sw" ? "Rudi kwenye Huduma" : "Back to Services"}
      </button>

      {/* Official Form Header */}
      <div className="bg-white p-4 sm:p-8 rounded-2xl sm:rounded-3xl border border-stone-200 shadow-sm text-center relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-1.5 bg-emerald-600" />
        <img
          src={TANZANIA_LOGO_URL}
          alt="Nembo ya Tanzania"
          className="h-20 w-20 mx-auto mb-4 object-contain"
          referrerPolicy="no-referrer"
        />
        <p className="text-[10px] font-black text-stone-500 uppercase tracking-[0.3em] mb-1">
          {lang === "sw" ? "JAMHURI YA MUUNGANO WA TANZANIA" : "THE UNITED REPUBLIC OF TANZANIA"}
        </p>
        <p className="text-[9px] font-bold text-stone-400 uppercase tracking-widest mb-4">
          {lang === "sw"
            ? "OFISI YA RAIS — TAWALA ZA MIKOA NA SERIKALI ZA MITAA"
            : "PRESIDENT'S OFFICE — REGIONAL ADMINISTRATION AND LOCAL GOVERNMENT"}
        </p>

        <div className="h-px bg-stone-100 w-24 mx-auto mb-6" />

        <h2 className="text-2xl font-heading font-black text-stone-900 uppercase tracking-tight mb-1">
          {lang === "sw" ? selectedService.name : selectedService.name_en || selectedService.name}
        </h2>
        <p className="text-xs font-bold text-stone-400 uppercase tracking-widest mb-6">
          {lang === "sw" ? selectedService.name_en || selectedService.name : selectedService.name}
        </p>

        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-50 text-emerald-700 text-xs font-bold border border-emerald-100">
          <CreditCard className="h-3 w-3" />
          {lang === "sw" ? "Ada ya Huduma:" : "Service Fee:"}{" "}
          {formatCurrency(selectedService.fee, displayCurrency)}
        </div>
      </div>

      <div className="bg-white p-4 sm:p-8 rounded-2xl sm:rounded-3xl border border-stone-200 shadow-sm">
        <div className="mb-8">
          <h3 className="text-lg font-bold text-stone-800">
            {lang === "sw" ? "Taarifa za Maombi" : "Application Details"}
          </h3>
          <p className="text-sm text-stone-500 mt-1">
            {lang === "sw"
              ? "Tafadhali jaza maelezo yote yanayohitajika kwa usahihi."
              : "Please fill in all required details accurately."}
          </p>
        </div>

        {/* Use dedicated service form if available, otherwise fall back to dynamic form */}
        {hasServiceForm(selectedService.name) ? (
          (() => {
            const FormComponent = SERVICE_FORMS[selectedService.name];
            return (
              <FormComponent
                onSubmit={onSubmit}
                lang={lang}
                userProfile={userProfileForForm}
                draftId={draft?.id}
              />
            );
          })()
        ) : (
          <DynamicFormGenerator
            schema={
              userProfileForForm?.is_diaspora
                ? selectedService.diaspora_form_schema || selectedService.form_schema
                : selectedService.form_schema
            }
            onSubmit={onSubmit}
            lang={lang}
            userProfile={userProfileForForm}
            draftId={draft?.id}
          />
        )}
      </div>
    </motion.div>
  );
}
