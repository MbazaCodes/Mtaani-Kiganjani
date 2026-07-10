/**
 * FormShell — consistent chrome for all multi-step service forms.
 * Provides: step progress bar, section header style, field wrapper,
 * error display, and navigation buttons.
 */
import React from "react";
import { ChevronLeft, ChevronRight, CheckCircle, Loader2 } from "lucide-react";

// ── CSS helpers ──────────────────────────────────────────────────────────────
export const F = {
  input:
    "w-full px-3.5 py-2.5 border border-stone-200 rounded-xl bg-white text-sm text-stone-900 placeholder:text-stone-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-400 transition-all",
  inputError: "border-red-400 focus:ring-red-400 focus:border-red-400 bg-red-50",
  label: "block text-xs font-bold text-stone-600 uppercase tracking-wide mb-1.5",
  error: "mt-1.5 text-xs text-red-500 flex items-center gap-1",
  required: "text-red-400 ml-0.5",
  section: "bg-emerald-50/60 border-l-4 border-emerald-500 rounded-r-xl px-4 py-3 mb-6",
  sectionTitle: "text-sm font-bold text-emerald-800 uppercase tracking-wide",
  card: "bg-white border border-stone-200 rounded-2xl p-6 shadow-sm",
  row2: "grid grid-cols-1 sm:grid-cols-2 gap-4",
  row3: "grid grid-cols-1 sm:grid-cols-3 gap-4",
  fieldGroup: "space-y-1",
};

// ── Field wrapper ────────────────────────────────────────────────────────────
export const Field: React.FC<{
  label: string;
  required?: boolean;
  error?: string;
  children: React.ReactNode;
  hint?: string;
}> = ({ label, required, error, children, hint }) => (
  <div className="space-y-1">
    <label className={F.label}>
      {label}
      {required && <span className={F.required}>*</span>}
    </label>
    {children}
    {hint && !error && <p className="text-xs text-stone-400">{hint}</p>}
    {error && (
      <p className={F.error}>
        <span className="w-3 h-3 rounded-full bg-red-400 text-white text-[9px] flex items-center justify-center">
          !
        </span>
        {error}
      </p>
    )}
  </div>
);

// ── Section header ───────────────────────────────────────────────────────────
export const Section: React.FC<{ title: string; children: React.ReactNode }> = ({
  title,
  children,
}) => (
  <div>
    <div className={F.section}>
      <p className={F.sectionTitle}>{title}</p>
    </div>
    {children}
  </div>
);

// ── Progress bar ─────────────────────────────────────────────────────────────
export const StepProgress: React.FC<{
  steps: { key: string; label: string; swLabel: string }[];
  currentIndex: number;
  lang: "sw" | "en";
}> = ({ steps, currentIndex, lang }) => {
  const progress = (currentIndex / (steps.length - 1)) * 100;
  return (
    <div className="mb-8">
      <div className="flex items-center justify-between mb-3">
        {steps.map((step, i) => (
          <React.Fragment key={step.key}>
            <div className="flex flex-col items-center gap-1 min-w-0">
              <div
                className={`
                w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0 transition-all
                ${
                  i < currentIndex
                    ? "bg-emerald-600 text-white shadow-sm shadow-emerald-200"
                    : i === currentIndex
                      ? "bg-white text-emerald-700 border-2 border-emerald-500 shadow-sm"
                      : "bg-stone-100 text-stone-400"
                }
              `}
              >
                {i < currentIndex ? <CheckCircle size={14} /> : i + 1}
              </div>
              <span
                className={`text-[10px] font-semibold hidden sm:block truncate max-w-16 text-center ${i === currentIndex ? "text-emerald-700" : i < currentIndex ? "text-emerald-500" : "text-stone-400"}`}
              >
                {lang === "sw" ? step.swLabel : step.label}
              </span>
            </div>
            {i < steps.length - 1 && (
              <div
                className={`flex-1 h-0.5 mx-1 rounded transition-all ${i < currentIndex ? "bg-emerald-500" : "bg-stone-200"}`}
              />
            )}
          </React.Fragment>
        ))}
      </div>
      <div className="text-right">
        <span className="text-xs text-stone-400">
          {lang === "sw" ? "Hatua" : "Step"} {currentIndex + 1}/{steps.length}
        </span>
        <span className="text-xs font-bold text-emerald-600 ml-2">{Math.round(progress)}%</span>
      </div>
    </div>
  );
};

// ── Navigation buttons ───────────────────────────────────────────────────────
export const NavButtons: React.FC<{
  onBack?: () => void;
  onNext?: () => void;
  onSubmit?: () => void;
  isFirst?: boolean;
  isLast?: boolean;
  isLoading?: boolean;
  lang: "sw" | "en";
  nextLabel?: string;
}> = ({ onBack, onNext, onSubmit, isFirst, isLast, isLoading, lang, nextLabel }) => (
  <div className="flex justify-between items-center pt-6 border-t border-stone-100 mt-8">
    <button
      type="button"
      onClick={onBack}
      disabled={isFirst}
      className="flex items-center gap-2 px-5 py-2.5 text-sm font-bold text-stone-600 hover:text-stone-900 disabled:opacity-0 transition-all rounded-xl hover:bg-stone-100"
    >
      <ChevronLeft size={16} />
      {lang === "sw" ? "Nyuma" : "Back"}
    </button>
    {isLast ? (
      <button
        type="button"
        onClick={onSubmit}
        disabled={isLoading}
        className="flex items-center gap-2 px-8 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white text-sm font-bold rounded-xl transition-all shadow-lg shadow-emerald-200 disabled:opacity-60"
      >
        {isLoading ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle size={16} />}
        {isLoading
          ? lang === "sw"
            ? "Inawasilisha…"
            : "Submitting…"
          : lang === "sw"
            ? "Wasilisha Maombi"
            : "Submit Application"}
      </button>
    ) : (
      <button
        type="button"
        onClick={onNext}
        className="flex items-center gap-2 px-6 py-2.5 bg-stone-900 hover:bg-stone-800 text-white text-sm font-bold rounded-xl transition-all"
      >
        {nextLabel || (lang === "sw" ? "Endelea" : "Next")}
        <ChevronRight size={16} />
      </button>
    )}
  </div>
);

// ── Review row ───────────────────────────────────────────────────────────────
export const ReviewRow: React.FC<{ label: string; value?: unknown }> = ({ label, value }) => (
  <div className="flex justify-between items-start py-2.5 border-b border-stone-100 last:border-0">
    <span className="text-xs font-bold text-stone-500 uppercase tracking-wide w-2/5 shrink-0">
      {label}
    </span>
    <span className="text-sm text-stone-900 text-right font-medium">{String(value || "—")}</span>
  </div>
);
