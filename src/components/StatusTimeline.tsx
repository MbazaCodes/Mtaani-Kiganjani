import React from "react";
import {
  FileText,
  Search,
  CheckCircle,
  CreditCard,
  Award,
  XCircle,
} from "lucide-react";

interface StatusTimelineProps {
  status: string;
  lang: string;
  agreementStatus?: string | null;
  isPaid?: boolean;
}

const STEPS = (sw: boolean) => [
  {
    key: "submitted",
    label: sw ? "Imewasilishwa" : "Submitted",
    icon: FileText,
  },
  {
    key: "under_review",
    label: sw ? "Inakaguliwa" : "Under Review",
    icon: Search,
  },
  {
    key: "approved",
    label: sw ? "Imeidhinishwa" : "Approved",
    icon: CheckCircle,
  },
  {
    key: "pending_payment",
    label: sw ? "Inasubiri Malipo" : "Awaiting Payment",
    icon: CreditCard,
  },
  { key: "issued", label: sw ? "Imetolewa" : "Issued", icon: Award },
];

const statusIndex = (status: string): number => {
  const map: Record<string, number> = {
    submitted: 0,
    pending: 0,
    under_review: 1,
    reviewing: 1,
    approved: 2,
    pending_payment: 3,
    paid: 4,
    issued: 4,
    completed: 4,
  };
  return map[status] ?? 0;
};

export const StatusTimeline: React.FC<StatusTimelineProps> = ({
  status,
  lang,
  agreementStatus,
  isPaid,
}) => {
  const sw = lang === "sw";
  const steps = STEPS(sw);
  const isRejected = status === "rejected";
  const currentIdx = statusIndex(status);

  if (isRejected) {
    return (
      <div className="flex items-center gap-3 bg-red-50 border border-red-200 rounded-xl p-3">
        <div className="w-8 h-8 rounded-full bg-red-500 flex items-center justify-center shrink-0">
          <XCircle size={16} className="text-white" />
        </div>
        <div>
          <p className="text-sm font-bold text-red-700">
            {sw ? "Maombi Yamekataliwa" : "Application Rejected"}
          </p>
          <p className="text-xs text-red-500">
            {sw
              ? "Maombi yako hayakuidhinishwa. Angalia sababu kwenye maelezo."
              : "Your application was not approved. Check the details for the reason."}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="py-2">
      <div className="flex items-center justify-between relative">
        {/* Progress line */}
        <div className="absolute left-0 right-0 top-4 h-0.5 bg-stone-200 z-0" />
        <div
          className="absolute left-0 top-4 h-0.5 bg-emerald-500 z-0 transition-all duration-500"
          style={{ width: `${(currentIdx / (steps.length - 1)) * 100}%` }}
        />

        {steps.map((step, i) => {
          const done = i <= currentIdx;
          const active = i === currentIdx;
          const Icon = step.icon;
          return (
            <div key={step.key} className="flex flex-col items-center z-10 relative" style={{ width: `${100 / steps.length}%` }}>
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center border-2 transition-all ${
                  done
                    ? active
                      ? "bg-emerald-600 border-emerald-600 ring-4 ring-emerald-100"
                      : "bg-emerald-500 border-emerald-500"
                    : "bg-white border-stone-300"
                }`}
              >
                <Icon size={14} className={done ? "text-white" : "text-stone-400"} />
              </div>
              <p
                className={`text-[9px] mt-1.5 text-center font-bold leading-tight ${
                  done ? (active ? "text-emerald-700" : "text-emerald-600") : "text-stone-400"
                }`}
              >
                {step.label}
              </p>
            </div>
          );
        })}
      </div>

      {/* Agreement sub-status */}
      {agreementStatus && status === "issued" && (
        <div className={`mt-3 text-center text-xs font-bold px-3 py-1.5 rounded-full inline-flex items-center gap-1 ${
          agreementStatus === "buyer_accepted"
            ? "bg-emerald-50 text-emerald-700"
            : agreementStatus === "buyer_rejected"
              ? "bg-red-50 text-red-700"
              : "bg-amber-50 text-amber-700"
        }`}>
          {agreementStatus === "buyer_accepted"
            ? (sw ? "✅ Mnunuzi Amekubali" : "✅ Buyer Accepted")
            : agreementStatus === "buyer_rejected"
              ? (sw ? "❌ Mnunuzi Amekataa" : "❌ Buyer Rejected")
              : (sw ? "⏳ Inasubiri Mnunuzi" : "⏳ Awaiting Buyer")}
        </div>
      )}
    </div>
  );
};
