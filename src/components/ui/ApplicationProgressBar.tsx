import React from "react";
import { ProgressFill } from "./ProgressFill";

interface ApplicationProgressBarProps {
  status: string;
  lang: string;
  compact?: boolean;
}

export const ApplicationProgressBar: React.FC<ApplicationProgressBarProps> = ({
  status,
  lang,
  compact,
}) => {
  const getProgress = () => {
    const steps = ["submitted", "approved", "pending_payment", "paid", "processing", "issued"];
    const currentIndex = steps.indexOf(status);
    if (currentIndex === -1) return 0;
    return ((currentIndex + 1) / steps.length) * 100;
  };

  const getStatusText = () => {
    switch (status) {
      case "submitted":
        return lang === "sw" ? "Imetumwa" : "Submitted";
      case "approved":
        return lang === "sw" ? "Imeidhinishwa" : "Approved";
      case "pending_payment":
        return lang === "sw" ? "Inasubiri Malipo" : "Pending Payment";
      case "paid":
        return lang === "sw" ? "Imelipiwa" : "Paid";
      case "processing":
        return lang === "sw" ? "Inashughulikiwa" : "Processing";
      case "issued":
        return lang === "sw" ? "Imetolewa" : "Issued";
      default:
        return status;
    }
  };

  if (compact) {
    return (
      <div className="w-full bg-gray-200 rounded-full h-1.5">
        <ProgressFill
          progress={getProgress()}
          className="bg-emerald-600 h-1.5 rounded-full transition-all duration-300"
        />
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex justify-between text-xs text-gray-600">
        <span>{getStatusText()}</span>
        <span>{Math.round(getProgress())}%</span>
      </div>
      <div className="w-full bg-gray-200 rounded-full h-2">
        <ProgressFill
          progress={getProgress()}
          className="bg-emerald-600 h-2 rounded-full transition-all duration-300"
        />
      </div>
    </div>
  );
};

export const PaymentStatusBadge: React.FC<{ status: string; lang: string }> = ({
  status,
  lang,
}) => {
  const isPaid = ["paid", "verified", "approved", "issued"].includes(status);
  return (
    <span className={`text-xs font-bold ${isPaid ? "text-emerald-600" : "text-orange-600"}`}>
      {isPaid ? (lang === "sw" ? "Imelipiwa" : "Paid") : lang === "sw" ? "Haijalipwa" : "Unpaid"}
    </span>
  );
};
