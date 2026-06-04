import React, { useState } from "react";
import type { PaymentResult } from "@/types";
import { motion, AnimatePresence } from "framer-motion";
import {
  CreditCard,
  Smartphone,
  Building2,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  X,
  Loader2,
  ChevronRight,
  ShieldCheck,
  Download,
  Share2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Language, useTranslation } from "@/lib/i18n";
import { formatCurrency, CurrencyCode } from "@/lib/currency";

interface PaymentGatewayProps {
  amount: number;
  applicationId: string;
  serviceName?: string;
  applicationNumber?: string;
  onSuccess: (paymentData: PaymentResult) => void;
  onCancel: () => void;
  lang: Language;
  currency: CurrencyCode;
}

type PaymentMethod = "mobile" | "bank" | "card";
type MobileProvider = "mpesa" | "tigopesa" | "airtelmoney";
type BankProvider = "nmb" | "crdb";

export const PaymentGateway: React.FC<PaymentGatewayProps> = ({
  amount,
  applicationId,
  serviceName,
  applicationNumber,
  onSuccess,
  onCancel,
  lang,
  currency,
}) => {
  const t = useTranslation(lang);
  const [step, setStep] = useState<"method" | "details" | "processing" | "success">("method");
  const [method, setMethod] = useState<PaymentMethod | null>(null);
  const [mobileProvider, setMobileProvider] = useState<MobileProvider | null>(null);
  const [bankProvider, setBankProvider] = useState<BankProvider | null>(null);
  const [phoneNumber, setPhoneNumber] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [cardDetails, setCardDetails] = useState({
    number: "",
    expiry: "",
    cvv: "",
    name: "",
  });
  const [paymentResult, setPaymentResult] = useState<Record<string, unknown> | null>(null);

  const handlePayment = async () => {
    setStep("processing");
    // Mock processing delay
    await new Promise((resolve) => setTimeout(resolve, 2500));

    const mockPaymentData = {
      application_id: applicationId,
      amount: amount,
      payment_method:
        method === "mobile" ? mobileProvider : method === "bank" ? bankProvider : "card",
      card_brand:
        method === "card" ? (cardDetails.number.startsWith("4") ? "Visa" : "Mastercard") : null,
      transaction_id: `TXN-${Math.random().toString(36).substr(2, 9).toUpperCase()}`,
      paid_at: new Date().toISOString(),
      status: "completed",
    };

    setPaymentResult(mockPaymentData);
    setStep("success");
  };

  return (
    <div className="fixed inset-0 z-100 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden"
      >
        {/* Header */}
        <div className="px-8 py-6 border-b border-stone-100 flex items-center justify-between bg-stone-50/50">
          <div>
            <h3 className="text-xl font-heading font-extrabold text-stone-900">
              {lang === "sw" ? "Malipo ya Huduma" : "Service Payment"}
            </h3>
            <p className="text-sm text-stone-500">
              Application ID: {applicationId.split("-")[0]}...
            </p>
          </div>
          <button
            onClick={onCancel}
            aria-label={lang === "sw" ? "Funga" : "Close"}
            className="p-2 hover:bg-stone-200 rounded-full transition-colors"
          >
            <X className="h-5 w-5 text-stone-500" />
          </button>
        </div>

        <div className="p-8">
          <AnimatePresence mode="wait">
            {step === "method" && (
              <motion.div
                key="method"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
              >
                <div className="bg-primary/5 rounded-2xl p-6 flex items-center justify-between border border-primary/10">
                  <span className="text-stone-600 font-medium">
                    {lang === "sw" ? "Kiasi Unachopaswa Kulipa" : "Amount to Pay"}
                  </span>
                  <span className="text-2xl font-heading font-black text-primary">
                    {formatCurrency(amount, currency)}
                  </span>
                </div>

                <div className="grid grid-cols-1 gap-4">
                  <button
                    onClick={() => {
                      setMethod("mobile");
                      setStep("details");
                    }}
                    className="flex items-center gap-4 p-5 rounded-2xl border-2 border-stone-100 hover:border-primary hover:bg-primary/5 transition-all text-left group"
                  >
                    <div className="h-12 w-12 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center shrink-0">
                      <Smartphone className="h-6 w-6" />
                    </div>
                    <div className="flex-1">
                      <p className="font-bold text-stone-900">
                        {lang === "sw" ? "Mtandao wa Simu" : "Mobile Money"}
                      </p>
                      <p className="text-xs text-stone-500">M-Pesa, Tigo Pesa, Airtel Money</p>
                    </div>
                    <ChevronRight className="h-5 w-5 text-stone-300 group-hover:text-primary transition-colors" />
                  </button>

                  <button
                    onClick={() => {
                      setMethod("bank");
                      setStep("details");
                    }}
                    className="flex items-center gap-4 p-5 rounded-2xl border-2 border-stone-100 hover:border-primary hover:bg-primary/5 transition-all text-left group"
                  >
                    <div className="h-12 w-12 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center shrink-0">
                      <Building2 className="h-6 w-6" />
                    </div>
                    <div className="flex-1">
                      <p className="font-bold text-stone-900">
                        {lang === "sw" ? "Benki (Bank Transfer)" : "Bank Transfer"}
                      </p>
                      <p className="text-xs text-stone-500">NMB, CRDB, NBC</p>
                    </div>
                    <ChevronRight className="h-5 w-5 text-stone-300 group-hover:text-primary transition-colors" />
                  </button>

                  <button
                    onClick={() => {
                      setMethod("card");
                      setStep("details");
                    }}
                    className="flex items-center gap-4 p-5 rounded-2xl border-2 border-stone-100 hover:border-primary hover:bg-primary/5 transition-all text-left group"
                  >
                    <div className="h-12 w-12 rounded-xl bg-purple-100 text-purple-600 flex items-center justify-center shrink-0">
                      <CreditCard className="h-6 w-6" />
                    </div>
                    <div className="flex-1">
                      <p className="font-bold text-stone-900">
                        {lang === "sw" ? "Kadi (Visa/Mastercard)" : "Card (Visa/Mastercard)"}
                      </p>
                      <p className="text-xs text-stone-500">Credit or Debit Card</p>
                    </div>
                    <ChevronRight className="h-5 w-5 text-stone-300 group-hover:text-primary transition-colors" />
                  </button>
                </div>
              </motion.div>
            )}

            {step === "details" && (
              <motion.div
                key="details"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
              >
                <button
                  onClick={() => setStep("method")}
                  className="text-sm font-bold text-primary flex items-center gap-1 hover:underline"
                >
                  <X className="h-3 w-3" />{" "}
                  {lang === "sw" ? "Badili Njia ya Malipo" : "Change Payment Method"}
                </button>

                {method === "mobile" ? (
                  <div className="space-y-6">
                    <div className="grid grid-cols-3 gap-3">
                      {[
                        { id: "mpesa", name: "M-Pesa", color: "bg-red-500" },
                        { id: "tigopesa", name: "Tigo Pesa", color: "bg-blue-600" },
                        { id: "airtelmoney", name: "Airtel Money", color: "bg-red-600" },
                      ].map((p) => (
                        <button
                          key={p.id}
                          onClick={() => setMobileProvider(p.id as MobileProvider)}
                          className={cn(
                            "p-3 rounded-xl border-2 transition-all text-center",
                            mobileProvider === p.id
                              ? "border-primary bg-primary/5 ring-4 ring-primary/10"
                              : "border-stone-100 hover:border-stone-200",
                          )}
                        >
                          <div className={cn("h-2 w-full rounded-full mb-2", p.color)} />
                          <span className="text-xs font-bold">{p.name}</span>
                        </button>
                      ))}
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-bold text-stone-700">
                        {lang === "sw" ? "Namba ya Simu" : "Phone Number"}
                      </label>
                      <input
                        type="tel"
                        placeholder="07XX XXX XXX"
                        className="w-full h-14 px-5 rounded-2xl border border-stone-200 focus:border-primary focus:ring-4 focus:ring-primary/10 outline-none transition-all"
                        value={phoneNumber}
                        onChange={(e) => setPhoneNumber(e.target.value)}
                      />
                    </div>
                  </div>
                ) : method === "bank" ? (
                  <div className="space-y-6">
                    <div className="grid grid-cols-2 gap-3">
                      {[
                        { id: "nmb", name: "NMB Bank" },
                        { id: "crdb", name: "CRDB Bank" },
                      ].map((p) => (
                        <button
                          key={p.id}
                          onClick={() => setBankProvider(p.id as BankProvider)}
                          className={cn(
                            "p-4 rounded-xl border-2 transition-all text-center font-bold",
                            bankProvider === p.id
                              ? "border-primary bg-primary/5 ring-4 ring-primary/10"
                              : "border-stone-100 hover:border-stone-200",
                          )}
                        >
                          {p.name}
                        </button>
                      ))}
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-bold text-stone-700">
                        {lang === "sw" ? "Namba ya Akaunti / Kadi" : "Account / Card Number"}
                      </label>
                      <input
                        type="text"
                        placeholder="XXXX XXXX XXXX XXXX"
                        className="w-full h-14 px-5 rounded-2xl border border-stone-200 focus:border-primary focus:ring-4 focus:ring-primary/10 outline-none transition-all"
                        value={accountNumber}
                        onChange={(e) => setAccountNumber(e.target.value)}
                      />
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <label className="text-sm font-bold text-stone-700">
                        {lang === "sw" ? "Jina Kwenye Kadi" : "Name on Card"}
                      </label>
                      <input
                        type="text"
                        placeholder="JOHN DOE"
                        className="w-full h-14 px-5 rounded-2xl border border-stone-200 focus:border-primary focus:ring-4 focus:ring-primary/10 outline-none transition-all uppercase"
                        value={cardDetails.name}
                        onChange={(e) => setCardDetails({ ...cardDetails, name: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-bold text-stone-700">
                        {lang === "sw" ? "Namba ya Kadi" : "Card Number"}
                      </label>
                      <div className="relative">
                        <input
                          type="text"
                          placeholder="0000 0000 0000 0000"
                          maxLength={19}
                          className="w-full h-14 px-5 rounded-2xl border border-stone-200 focus:border-primary focus:ring-4 focus:ring-primary/10 outline-none transition-all"
                          value={cardDetails.number}
                          onChange={(e) =>
                            setCardDetails({ ...cardDetails, number: e.target.value })
                          }
                        />
                        <div className="absolute right-4 top-1/2 -translate-y-1/2 flex gap-2">
                          <img
                            src="https://upload.wikimedia.org/wikipedia/commons/5/5e/Visa_Inc._logo.svg"
                            alt="Visa"
                            className="h-4"
                            referrerPolicy="no-referrer"
                          />
                          <img
                            src="https://upload.wikimedia.org/wikipedia/commons/2/2a/Mastercard-logo.svg"
                            alt="Mastercard"
                            className="h-4"
                            referrerPolicy="no-referrer"
                          />
                        </div>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-sm font-bold text-stone-700">
                          {lang === "sw" ? "Muda wa Kuisha" : "Expiry Date"}
                        </label>
                        <input
                          type="text"
                          placeholder="MM/YY"
                          maxLength={5}
                          className="w-full h-14 px-5 rounded-2xl border border-stone-200 focus:border-primary focus:ring-4 focus:ring-primary/10 outline-none transition-all"
                          value={cardDetails.expiry}
                          onChange={(e) =>
                            setCardDetails({ ...cardDetails, expiry: e.target.value })
                          }
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-bold text-stone-700">CVV</label>
                        <input
                          type="password"
                          placeholder="***"
                          maxLength={3}
                          className="w-full h-14 px-5 rounded-2xl border border-stone-200 focus:border-primary focus:ring-4 focus:ring-primary/10 outline-none transition-all"
                          value={cardDetails.cvv}
                          onChange={(e) => setCardDetails({ ...cardDetails, cvv: e.target.value })}
                        />
                      </div>
                    </div>
                  </div>
                )}

                <button
                  disabled={
                    method === "mobile"
                      ? !mobileProvider || !phoneNumber
                      : method === "bank"
                        ? !bankProvider || !accountNumber
                        : !cardDetails.number ||
                          !cardDetails.expiry ||
                          !cardDetails.cvv ||
                          !cardDetails.name
                  }
                  onClick={handlePayment}
                  className="w-full h-14 bg-primary text-white rounded-2xl font-bold text-lg hover:bg-tz-blue transition-all shadow-xl shadow-primary/20 flex items-center justify-center gap-3 disabled:opacity-50"
                >
                  {t.payNow} <ArrowRight className="h-5 w-5" />
                </button>
              </motion.div>
            )}

            {step === "processing" && (
              <motion.div
                key="processing"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="py-12 text-center space-y-6"
              >
                <div className="relative inline-block">
                  <Loader2 className="h-16 w-16 text-primary animate-spin mx-auto" />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <ShieldCheck className="h-6 w-6 text-primary/40" />
                  </div>
                </div>
                <div>
                  <h4 className="text-xl font-heading font-extrabold text-stone-900">
                    {lang === "sw" ? "Tunachakata Malipo" : "Processing Payment"}
                  </h4>
                  <p className="text-stone-500">
                    {lang === "sw"
                      ? "Tafadhali usifunge dirisha hili..."
                      : "Please do not close this window..."}
                  </p>
                </div>
              </motion.div>
            )}

            {step === "success" && (
              <motion.div
                key="success"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="py-12 text-center space-y-6"
              >
                <div className="h-20 w-20 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto animate-bounce">
                  <CheckCircle2 className="h-12 w-12" />
                </div>
                <div>
                  <h4 className="text-2xl font-heading font-extrabold text-stone-900">
                    {lang === "sw" ? "Malipo Yamekamilika!" : "Payment Completed!"}
                  </h4>
                  <p className="text-stone-500">
                    {lang === "sw"
                      ? "Asante, maombi yako yamepokelewa rasmi."
                      : "Thank you, your application has been officially received."}
                  </p>
                </div>

                {/* Transaction Details */}
                {paymentResult && (
                  <div className="bg-stone-50 rounded-xl p-4 text-left space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-stone-500">
                        {lang === "sw" ? "Namba ya Muamala:" : "Transaction ID:"}
                      </span>
                      <span className="font-bold text-stone-900">
                        {(paymentResult as Record<string, unknown>).transaction_id as string}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-stone-500">{lang === "sw" ? "Kiasi:" : "Amount:"}</span>
                      <span className="font-bold text-emerald-600">
                        {formatCurrency(
                          (paymentResult as Record<string, unknown>).amount as number,
                          currency,
                        )}
                      </span>
                    </div>
                  </div>
                )}

                {/* Download + Share actions */}
                <div className="space-y-3 w-full">
                  <button
                    onClick={() =>
                      onSuccess(paymentResult as unknown as import("@/types").PaymentResult)
                    }
                    className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2"
                  >
                    <Download className="h-4 w-4" />
                    {lang === "sw" ? "Pakua Cheti" : "Download Certificate"}
                  </button>
                  <button
                    onClick={async () => {
                      const shareData = {
                        title:
                          serviceName || (lang === "sw" ? "Hati Rasmi" : "Official Certificate"),
                        text:
                          lang === "sw"
                            ? `Hati yangu rasmi ya ${serviceName} — Namba: ${applicationNumber}`
                            : `My official ${serviceName} certificate — Ref: ${applicationNumber}`,
                        url: `${window.location.origin}/verify?ref=${applicationNumber}`,
                      };
                      if (navigator.share && navigator.canShare?.(shareData)) {
                        try {
                          await navigator.share(shareData);
                        } catch {
                          /* user cancelled share */
                        }
                      } else {
                        await navigator.clipboard.writeText(shareData.url);
                        alert(lang === "sw" ? "Kiungo kimekopwa!" : "Link copied!");
                      }
                    }}
                    className="w-full py-3 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2"
                  >
                    <Share2 className="h-4 w-4" />
                    {lang === "sw" ? "Shiriki Cheti" : "Share Certificate"}
                  </button>
                  <button
                    onClick={onCancel}
                    className="w-full py-2 text-stone-400 hover:text-stone-600 text-sm transition-colors"
                  >
                    {lang === "sw" ? "Funga" : "Close"}
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Footer */}
        <div className="px-8 py-4 bg-stone-50 border-t border-stone-100 flex items-center justify-center gap-2 text-[10px] text-stone-400 font-bold uppercase tracking-widest">
          <ShieldCheck className="h-3 w-3" /> Secured by Government Payment Gateway (GePG)
        </div>
      </motion.div>
    </div>
  );
};
