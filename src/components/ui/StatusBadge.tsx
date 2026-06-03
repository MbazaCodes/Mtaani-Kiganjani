import React from "react";

interface StatusBadgeProps {
  status: string;
  lang: string;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, lang }) => {
  const getStatusConfig = () => {
    switch (status) {
      case "submitted":
        return {
          label: lang === "sw" ? "Imetumwa" : "Submitted",
          className: "bg-blue-100 text-blue-800",
        };
      case "approved":
        return {
          label: lang === "sw" ? "Imeidhinishwa" : "Approved",
          className: "bg-green-100 text-green-800",
        };
      case "pending_payment":
        return {
          label: lang === "sw" ? "Inasubiri Malipo" : "Pending Payment",
          className: "bg-yellow-100 text-yellow-800",
        };
      case "paid":
        return {
          label: lang === "sw" ? "Imelipiwa" : "Paid",
          className: "bg-emerald-100 text-emerald-800",
        };
      case "processing":
        return {
          label: lang === "sw" ? "Inashughulikiwa" : "Processing",
          className: "bg-purple-100 text-purple-800",
        };
      case "issued":
        return {
          label: lang === "sw" ? "Imetolewa" : "Issued",
          className: "bg-teal-100 text-teal-800",
        };
      case "rejected":
        return {
          label: lang === "sw" ? "Imekataliwa" : "Rejected",
          className: "bg-red-100 text-red-800",
        };
      case "refunded":
        return {
          label: lang === "sw" ? "Imerejeshwa" : "Refunded",
          className: "bg-gray-100 text-gray-800",
        };
      default:
        return { label: status, className: "bg-gray-100 text-gray-800" };
    }
  };

  const config = getStatusConfig();

  return (
    <span className={`px-2 py-1 rounded-full text-xs font-semibold ${config.className}`}>
      {config.label}
    </span>
  );
};
