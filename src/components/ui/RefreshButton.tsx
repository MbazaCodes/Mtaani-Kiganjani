/**
 * RefreshButton — reusable refresh control
 *
 * Usage:
 *   <RefreshButton onRefresh={async () => { await loadData(); }} lang={lang} />
 *   <RefreshButton onRefresh={fn} variant="labeled" lang={lang} />
 */
import React, { useState } from "react";
import { RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";

interface RefreshButtonProps {
  onRefresh: () => void | Promise<void>;
  lang?: string;
  variant?: "icon" | "labeled";
  className?: string;
}

export const RefreshButton: React.FC<RefreshButtonProps> = ({
  onRefresh, lang = "en", variant = "icon", className,
}) => {
  const [spinning, setSpinning] = useState(false);
  const label = lang === "sw" ? "Sasisha" : "Refresh";

  const handleClick = async () => {
    if (spinning) return;
    setSpinning(true);
    try {
      await onRefresh();
    } finally {
      // keep the spin visible for a beat so it feels responsive
      setTimeout(() => setSpinning(false), 600);
    }
  };

  if (variant === "labeled") {
    return (
      <button
        onClick={handleClick}
        disabled={spinning}
        className={cn(
          "flex items-center gap-1.5 px-3 h-9 bg-white border border-stone-200 rounded-xl",
          "text-stone-600 hover:bg-stone-50 text-sm font-bold transition-all disabled:opacity-50",
          className,
        )}
      >
        <RefreshCw size={14} className={spinning ? "animate-spin" : ""} />
        {label}
      </button>
    );
  }

  return (
    <button
      onClick={handleClick}
      disabled={spinning}
      aria-label={label}
      title={label}
      className={cn(
        "w-9 h-9 bg-white border border-stone-200 rounded-xl flex items-center justify-center",
        "text-stone-500 hover:bg-stone-50 transition-all disabled:opacity-50",
        className,
      )}
    >
      <RefreshCw size={15} className={spinning ? "animate-spin" : ""} />
    </button>
  );
};

export default RefreshButton;
