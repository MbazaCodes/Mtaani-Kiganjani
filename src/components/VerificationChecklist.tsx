/**
 * VerificationChecklist — Officer 5-step manual verification panel
 *
 * Shown when officer opens an application from a NON-NIDA_VERIFIED citizen.
 * All 5 steps must be completed before approval is enabled.
 */
import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Phone, MapPin, FileText, Users, CheckCircle2,
  Circle, ChevronDown, ChevronUp, Loader2, AlertCircle,
  UserCheck, Camera, Calendar,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/context/ToastContext";

export interface ChecklistState {
  phone_verified: boolean;
  address_verified: boolean;
  id_verified: boolean;
  witnesses_added: boolean;
  final_approved: boolean;
}

interface WitnessInfo {
  name: string;
  phone: string;
  nida: string;
}

interface VerificationChecklistProps {
  applicationId: string;
  citizenId: string;
  citizenName: string;
  citizenPhone?: string;
  lang: string;
  onAllComplete?: (state: ChecklistState) => void;
}

const STEPS = [
  {
    key: "phone_verified" as keyof ChecklistState,
    icon: <Phone size={16} />,
    label: { en: "Verify Phone Number", sw: "Thibitisha Namba ya Simu" },
    desc: { en: "Call citizen to confirm identity", sw: "Mpigie simu raia kuthibitisha utambulisho" },
    color: "emerald",
  },
  {
    key: "address_verified" as keyof ChecklistState,
    icon: <MapPin size={16} />,
    label: { en: "Verify Physical Address", sw: "Thibitisha Anwani ya Nyumbani" },
    desc: { en: "Home visit or address document", sw: "Ziara ya nyumbani au hati ya anwani" },
    color: "blue",
  },
  {
    key: "id_verified" as keyof ChecklistState,
    icon: <FileText size={16} />,
    label: { en: "Verify Identity Document", sw: "Thibitisha Kitambulisho" },
    desc: { en: "NIDA / Passport / Voter ID", sw: "NIDA / Pasipoti / Kadi ya Kura" },
    color: "violet",
  },
  {
    key: "witnesses_added" as keyof ChecklistState,
    icon: <Users size={16} />,
    label: { en: "Witness Confirmation", sw: "Uthibitisho wa Mashahidi" },
    desc: { en: "Two witnesses required", sw: "Mashahidi wawili wanahitajika" },
    color: "orange",
  },
  {
    key: "final_approved" as keyof ChecklistState,
    icon: <CheckCircle2 size={16} />,
    label: { en: "Final Officer Approval", sw: "Idhini ya Mwisho ya Afisa" },
    desc: { en: "Complete all steps above first", sw: "Kamilisha hatua zote kwanza" },
    color: "emerald",
  },
] as const;

export const VerificationChecklist: React.FC<VerificationChecklistProps> = ({
  applicationId, citizenId, citizenName, citizenPhone, lang, onAllComplete,
}) => {
  const { showToast } = useToast();
  const sw = lang === "sw";
  const L = (s: string, e: string) => (sw ? s : e);

  const [checklist, setChecklist] = useState<ChecklistState>({
    phone_verified: false, address_verified: false, id_verified: false,
    witnesses_added: false, final_approved: false,
  });
  const [expanded, setExpanded] = useState<keyof ChecklistState | null>("phone_verified");
  const [saving, setSaving] = useState(false);
  const [witnesses, setWitnesses] = useState<[WitnessInfo, WitnessInfo]>([
    { name: "", phone: "", nida: "" },
    { name: "", phone: "", nida: "" },
  ]);
  const [visitDate, setVisitDate] = useState("");
  const [docNumber, setDocNumber] = useState("");
  const [notes, setNotes] = useState("");

  const completedCount = Object.values(checklist).filter(Boolean).length;
  const allDone = completedCount === 5;

  const markStep = async (key: keyof ChecklistState) => {
    setSaving(true);
    try {
      const updated = { ...checklist, [key]: true };
      setChecklist(updated);
      // Persist to DB — silently ignore if checklist columns not yet migrated
      supabase.from("applications").update({
        [`checklist_${key}`]: true,
      }).eq("id", applicationId).then(({ error }) => {
        if (error) console.warn("[Checklist] Column may be missing — run migration:", error.message);
      });

      if (Object.values(updated).every(Boolean)) {
        // All 5 steps done — mark the CITIZEN as verified so future
        // applications from them skip the checklist entirely
        if (citizenId) {
          supabase.from("users").update({
            is_verified: true,
            verification_level: "PROFILE_COMPLETED",
          }).eq("id", citizenId).then(({ error }) => {
            if (error) console.warn("[Checklist] Could not mark citizen verified:", error.message);
          });
        }
        onAllComplete?.(updated);
        showToast(L("Raia amethibitishwa! Maombi yajayo hayatahitaji ukaguzi.", "Citizen verified! Future applications won't need this checklist."), "success");
      } else {
        showToast(L("Hatua imewekwa alama ✓", "Step marked complete ✓"), "success");
      }
      // Move to next incomplete step
      const nextStep = STEPS.find((s) => !updated[s.key]);
      setExpanded(nextStep?.key ?? null);
    } catch {
      // offline / demo — still update local state
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="bg-white border border-stone-200 rounded-2xl overflow-hidden shadow-sm">
      {/* Header */}
      <div className="px-5 py-4 bg-stone-900 text-white flex items-center justify-between">
        <div>
          <p className="text-xs font-bold text-stone-400 uppercase tracking-widest mb-0.5">
            {L("Orodha ya Uthibitisho", "Verification Checklist")}
          </p>
          <p className="font-black text-base">{citizenName}</p>
        </div>
        <div className="text-right">
          <p className="text-2xl font-black text-white">{completedCount}<span className="text-stone-500 text-base">/5</span></p>
          <p className="text-[10px] text-stone-400">{L("Zimekamilika", "Complete")}</p>
        </div>
      </div>

      {/* Progress */}
      <div className="h-1.5 bg-stone-200">
        <motion.div
          animate={{ width: `${(completedCount / 5) * 100}%` }}
          transition={{ duration: 0.5 }}
          className={cn("h-full transition-colors", allDone ? "bg-emerald-500" : "bg-amber-400")}
        />
      </div>

      {!allDone && (
        <div className="px-5 py-2.5 bg-amber-50 border-b border-amber-200 flex items-center gap-2">
          <AlertCircle size={13} className="text-amber-600 shrink-0" />
          <p className="text-xs text-amber-700 font-medium">
            {L("Maombi hayawezi kuidhinishwa hadi hatua zote 5 zikamilike.", "Application cannot be approved until all 5 steps are completed.")}
          </p>
        </div>
      )}

      {/* Steps */}
      <div className="divide-y divide-stone-100">
        {STEPS.map((step, idx) => {
          const done = checklist[step.key];
          const isOpen = expanded === step.key;
          const canExpand = idx === 0 || checklist[STEPS[idx - 1].key];

          return (
            <div key={step.key} className={cn("transition-colors", done ? "bg-emerald-50/50" : "bg-white")}>
              {/* Step header */}
              <button
                type="button"
                onClick={() => canExpand && setExpanded(isOpen ? null : step.key)}
                disabled={!canExpand}
                className={cn(
                  "w-full flex items-center gap-3 px-5 py-3.5 text-left transition-all",
                  canExpand && !done ? "hover:bg-stone-50" : "",
                  !canExpand ? "opacity-40 cursor-not-allowed" : "",
                )}
              >
                <div className={cn(
                  "w-8 h-8 rounded-xl flex items-center justify-center shrink-0",
                  done ? "bg-emerald-500 text-white" : "bg-stone-100 text-stone-500",
                )}>
                  {done ? <CheckCircle2 size={15} /> : step.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <p className={cn("text-sm font-bold", done ? "text-emerald-700" : "text-stone-800")}>
                    {idx + 1}. {lang === "sw" ? step.label.sw : step.label.en}
                  </p>
                  <p className="text-[11px] text-stone-400">
                    {lang === "sw" ? step.desc.sw : step.desc.en}
                  </p>
                </div>
                {done
                  ? <span className="text-[10px] font-black text-emerald-600 bg-emerald-100 px-2 py-0.5 rounded-full">{L("IMEKAMILIKA", "DONE")}</span>
                  : canExpand
                    ? isOpen ? <ChevronUp size={14} className="text-stone-400" /> : <ChevronDown size={14} className="text-stone-400" />
                    : <span className="text-[10px] font-bold text-stone-400">{L("IMEFUNGWA", "LOCKED")}</span>
                }
              </button>

              {/* Step detail panel */}
              <AnimatePresence>
                {isOpen && !done && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="overflow-hidden"
                  >
                    <div className="px-5 pb-4 pt-1 space-y-3 bg-stone-50 border-t border-stone-100">

                      {/* STEP 1: Phone */}
                      {step.key === "phone_verified" && (
                        <div className="space-y-3">
                          <div className="flex items-center gap-2 p-3 bg-white border border-stone-200 rounded-xl">
                            <Phone size={14} className="text-stone-400" />
                            <span className="text-sm font-bold text-stone-700">{citizenPhone || L("Namba haipatikani", "Phone unavailable")}</span>
                          </div>
                          <div className="flex gap-2">
                            <a href={`tel:${citizenPhone}`}
                              className="flex-1 h-9 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all">
                              <Phone size={12} /> {L("Piga Simu", "Call Citizen")}
                            </a>
                            <button onClick={() => markStep("phone_verified")} disabled={saving}
                              className="flex-1 h-9 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all">
                              {saving ? <Loader2 size={12} className="animate-spin" /> : <CheckCircle2 size={12} />}
                              {L("Weka Alama ✓", "Mark Verified")}
                            </button>
                          </div>
                        </div>
                      )}

                      {/* STEP 2: Address */}
                      {step.key === "address_verified" && (
                        <div className="space-y-3">
                          <div className="space-y-1.5">
                            <label className="text-[11px] font-black text-stone-500 uppercase tracking-widest">
                              {L("Tarehe ya Ziara", "Visit Date")}
                            </label>
                            <input type="date" value={visitDate} onChange={(e) => setVisitDate(e.target.value)}
                              className="w-full h-9 px-3 bg-white border border-stone-200 rounded-xl text-xs font-medium outline-none focus:ring-2 focus:ring-emerald-500" />
                          </div>
                          <div className="flex gap-2">
                            <button
                              className="flex-1 h-9 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all">
                              <Calendar size={12} /> {L("Panga Ziara", "Schedule Visit")}
                            </button>
                            <button onClick={() => markStep("address_verified")} disabled={saving}
                              className="flex-1 h-9 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all">
                              {saving ? <Loader2 size={12} className="animate-spin" /> : <CheckCircle2 size={12} />}
                              {L("Weka Alama ✓", "Mark Verified")}
                            </button>
                          </div>
                        </div>
                      )}

                      {/* STEP 3: ID Document */}
                      {step.key === "id_verified" && (
                        <div className="space-y-3">
                          <div className="space-y-1.5">
                            <label className="text-[11px] font-black text-stone-500 uppercase tracking-widest">
                              {L("Namba ya Kitambulisho", "Document Number")}
                            </label>
                            <input type="text" value={docNumber} onChange={(e) => setDocNumber(e.target.value)}
                              placeholder="NIDA / Passport / Voter ID"
                              className="w-full h-9 px-3 bg-white border border-stone-200 rounded-xl text-xs font-medium outline-none focus:ring-2 focus:ring-emerald-500" />
                          </div>
                          <div className="flex gap-2">
                            <button
                              className="flex-1 h-9 bg-violet-600 hover:bg-violet-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all">
                              <Camera size={12} /> {L("Omba Upakiaji", "Request Upload")}
                            </button>
                            <button onClick={() => markStep("id_verified")} disabled={saving}
                              className="flex-1 h-9 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all">
                              {saving ? <Loader2 size={12} className="animate-spin" /> : <CheckCircle2 size={12} />}
                              {L("Weka Alama ✓", "Mark Verified")}
                            </button>
                          </div>
                        </div>
                      )}

                      {/* STEP 4: Witnesses */}
                      {step.key === "witnesses_added" && (
                        <div className="space-y-3">
                          {witnesses.map((w, i) => (
                            <div key={i} className="space-y-2 p-3 bg-white border border-stone-200 rounded-xl">
                              <p className="text-[11px] font-black text-stone-500 uppercase tracking-widest">
                                {L(`Shahidi ${i + 1}`, `Witness ${i + 1}`)}
                              </p>
                              <div className="grid grid-cols-3 gap-2">
                                {(["name", "phone", "nida"] as const).map((field) => (
                                  <input key={field} type="text" placeholder={field === "name" ? L("Jina", "Name") : field === "phone" ? L("Simu", "Phone") : "NIDA"}
                                    value={w[field]}
                                    onChange={(e) => setWitnesses((prev) => {
                                      const updated = [...prev] as [WitnessInfo, WitnessInfo];
                                      updated[i] = { ...updated[i], [field]: e.target.value };
                                      return updated;
                                    })}
                                    className="h-8 px-2.5 bg-stone-50 border border-stone-200 rounded-lg text-xs font-medium outline-none focus:ring-1 focus:ring-emerald-500" />
                                ))}
                              </div>
                            </div>
                          ))}
                          <button onClick={() => markStep("witnesses_added")} disabled={saving}
                            className="w-full h-9 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all">
                            {saving ? <Loader2 size={12} className="animate-spin" /> : <Users size={12} />}
                            {L("Weka Alama Mashahidi ✓", "Mark Witnesses Complete")}
                          </button>
                        </div>
                      )}

                      {/* STEP 5: Final Approval */}
                      {step.key === "final_approved" && (
                        <div className="space-y-3">
                          <div className="space-y-1.5">
                            <label className="text-[11px] font-black text-stone-500 uppercase tracking-widest">
                              {L("Maelezo ya Afisa (hiari)", "Officer Notes (optional)")}
                            </label>
                            <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2}
                              className="w-full px-3 py-2 bg-white border border-stone-200 rounded-xl text-xs font-medium outline-none focus:ring-2 focus:ring-emerald-500 resize-none"
                              placeholder={L("Maelezo yoyote ya ziada...", "Any additional notes...")} />
                          </div>
                          <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 flex items-start gap-2">
                            <CheckCircle2 size={13} className="text-emerald-600 shrink-0 mt-0.5" />
                            <p className="text-xs text-emerald-700">{L("Hatua zote 4 zimekamilika. Uko tayari kutoa idhini ya mwisho.", "All 4 prior steps complete. You can now give final approval.")}</p>
                          </div>
                          <button onClick={() => markStep("final_approved")} disabled={saving}
                            className="w-full h-10 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-xl text-sm font-black flex items-center justify-center gap-2 transition-all shadow-lg shadow-emerald-100">
                            {saving ? <Loader2 size={14} className="animate-spin" /> : <UserCheck size={14} />}
                            {L("Idhinisha Maombi", "Approve Application")}
                          </button>
                        </div>
                      )}

                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default VerificationChecklist;
