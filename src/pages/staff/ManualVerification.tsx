/**
 * PhysicalVerification — /staff/verification
 *
 * Two tabs:
 * 1. MANUAL REVIEW — Applications from PHONE/EMAIL_VERIFIED citizens
 *    that need the 5-step officer checklist before approval.
 * 2. PHYSICAL (IN-PERSON) — Citizens who have booked/requested an
 *    office visit for NIDA_VERIFIED upgrade. Officer searches by
 *    phone/NIDA, captures document number, upgrades tier instantly.
 */
import React, { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search, CheckCircle2, XCircle, Loader2, Shield,
  User, MapPin, Phone, FileText, UserCheck, Clock,
  Building2, ChevronDown, ChevronUp, Camera, Calendar,
  AlertCircle, ShieldCheck, BadgeCheck,
} from "lucide-react";
import { supabase, UserProfile, Application } from "@/lib/supabase";
import { useLanguage } from "@/context/LanguageContext";
import { useToast } from "@/context/ToastContext";
import { useAuth } from "@/context/AuthContext";
import { createNotification } from "@/lib/notifications";
import { getUserTier, getTierInfo } from "@/lib/verification";
import { VerificationBadge } from "@/components/VerificationBadge";
import { VerificationChecklist } from "@/components/VerificationChecklist";
import { RefreshButton } from "@/components/ui/RefreshButton";
import { cn } from "@/lib/utils";

type Tab = "manual" | "physical";

// ─────────────────────────────────────────────────────────────────────────────
export function ManualVerification() {
  const { lang } = useLanguage();
  const { showToast } = useToast();
  const { user: officer } = useAuth();
  const sw = lang === "sw";
  const L = (s: string, e: string) => (sw ? s : e);

  const [tab, setTab] = useState<Tab>("manual");

  // ── Manual review state ───────────────────────────────────────────────────
  const [apps, setApps] = useState<(Application & { user?: Partial<UserProfile> })[]>([]);
  const [loadingApps, setLoadingApps] = useState(true);
  const [searchApp, setSearchApp] = useState("");
  const [expandedApp, setExpandedApp] = useState<string | null>(null);

  // ── Physical verification state ───────────────────────────────────────────
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResult, setSearchResult] = useState<UserProfile | null>(null);
  const [searching, setSearching] = useState(false);
  const [docType, setDocType] = useState("NIDA");
  const [docNumber, setDocNumber] = useState("");
  const [officerNotes, setOfficerNotes] = useState("");
  const [upgrading, setUpgrading] = useState(false);
  const [upgraded, setUpgraded] = useState(false);

  // ── Load apps needing manual review ──────────────────────────────────────
  const loadApps = useCallback(async () => {
    setLoadingApps(true);
    try {
      const { data, error } = await supabase
        .from("applications")
        .select(`
          *,
          user:users!applications_user_id_fkey (
            id, first_name, middle_name, last_name, phone, email,
            region, district, ward, nida_number, citizen_id,
            is_verified, is_diaspora, verification_level
          )
        `)
        .in("status", ["submitted", "pending_review", "returned"])
        .not("user_id", "is", null)
        .order("created_at", { ascending: true });

      if (error) throw error;

      // Only apps from non-NIDA citizens
      const filtered = (data || []).filter((a) => {
        const tier = getUserTier(a.user as Partial<UserProfile>);
        return tier !== "NIDA_VERIFIED";
      });
      setApps(filtered);
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingApps(false);
    }
  }, []);

  useEffect(() => { loadApps(); }, [loadApps]);

  // ── Physical search ───────────────────────────────────────────────────────
  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    setSearching(true);
    setSearchResult(null);
    setUpgraded(false);
    try {
      const q = searchQuery.trim();
      const { data } = await supabase
        .from("users")
        .select("*")
        .or(
          `phone.eq.${q},phone.eq.+255${q.replace(/^0/, "")},nida_number.eq.${q.replace(/-/g, "")},citizen_id.eq.${q},email.eq.${q.toLowerCase()}`
        )
        .limit(1)
        .maybeSingle();

      if (data) setSearchResult(data as UserProfile);
      else showToast(L("Raia hajapatikana. Jaribu namba nyingine.", "Citizen not found. Try a different number."), "error");
    } catch {
      showToast(L("Hitilafu ya utafutaji", "Search error"), "error");
    } finally {
      setSearching(false);
    }
  };

  // ── Physical upgrade to NIDA_VERIFIED ─────────────────────────────────────
  const handleUpgrade = async () => {
    if (!searchResult || !docNumber.trim()) {
      showToast(L("Ingiza namba ya kitambulisho", "Enter document number"), "error");
      return;
    }
    setUpgrading(true);
    try {
      const updates: Record<string, unknown> = {
        is_verified: true,
        verification_level: "NIDA_VERIFIED",
      };
      if (docType === "NIDA") updates.nida_number = docNumber.trim().replace(/-/g, "");
      else if (docType === "PASSPORT") updates.passport_number = docNumber.trim();

      const { error } = await supabase.from("users").update(updates).eq("id", searchResult.id);
      if (error) throw error;

      // Notify citizen
      await createNotification({
        user_id: searchResult.id,
        title: sw ? "Uthibitisho wa NIDA Umekamilika" : "NIDA Verification Complete",
        message: sw
          ? "Umethbitishwa na afisa. Sasa una ufikiaji kamili wa huduma zote."
          : "Verified by officer. You now have full access to all services.",
        type: "success",
      });

      // Log audit
      await supabase.from("audit_logs").insert({
        user_id: officer?.id,
        action: "physical_verification",
        details: {
          citizen_id: searchResult.id,
          doc_type: docType,
          doc_number: docNumber,
          notes: officerNotes,
          officer_id: officer?.id,
          officer_name: `${officer?.first_name} ${officer?.last_name}`,
        },
      }).then(() => {});

      setUpgraded(true);
      setSearchResult({ ...searchResult, verification_level: "NIDA_VERIFIED" } as UserProfile);
      showToast(L("Raia amethbitishwa kikamilifu!", "Citizen fully verified!"), "success");
    } catch (e) {
      showToast((e as Error).message || L("Imeshindwa", "Failed"), "error");
    } finally {
      setUpgrading(false);
    }
  };

  // ── Filter apps ───────────────────────────────────────────────────────────
  const filteredApps = apps.filter((a) => {
    const q = searchApp.toLowerCase();
    const name = `${a.user?.first_name || ""} ${a.user?.last_name || ""}`.toLowerCase();
    return !q || name.includes(q) || a.application_number.toLowerCase().includes(q) ||
      (a.user?.phone || "").includes(q) || (a.user?.nida_number || "").includes(q);
  });

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-5">

      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-black text-stone-900">
            {L("Uthibitisho wa Raia", "Citizen Verification")}
          </h1>
          <p className="text-xs text-stone-400 mt-0.5">
            {L("Kagua maombi yanayohitaji muda wa afisa na thibitisha raia kwa mwili", "Review applications needing officer time and verify citizens in person")}
          </p>
        </div>
        <RefreshButton onRefresh={loadApps} lang={lang} />
      </div>

      {/* Tab switcher */}
      <div className="flex bg-stone-100 rounded-2xl p-1 gap-1">
        <button
          onClick={() => setTab("manual")}
          className={cn("flex-1 flex items-center justify-center gap-2 h-10 rounded-xl text-sm font-bold transition-all",
            tab === "manual" ? "bg-white text-stone-900 shadow-sm" : "text-stone-500 hover:text-stone-700")}
        >
          <FileText size={15} />
          {L("Ukaguzi wa Mwongozo", "Manual Review")}
          {apps.length > 0 && (
            <span className="px-1.5 py-0.5 bg-amber-100 text-amber-700 rounded-full text-[10px] font-black">
              {filteredApps.length}
            </span>
          )}
        </button>
        <button
          onClick={() => setTab("physical")}
          className={cn("flex-1 flex items-center justify-center gap-2 h-10 rounded-xl text-sm font-bold transition-all",
            tab === "physical" ? "bg-white text-stone-900 shadow-sm" : "text-stone-500 hover:text-stone-700")}
        >
          <UserCheck size={15} />
          {L("Uthibitisho wa Kimwili", "Physical Verification")}
        </button>
      </div>

      {/* ══════════════════════════════════════════════════════════════════
          TAB 1 — MANUAL REVIEW
      ══════════════════════════════════════════════════════════════════ */}
      {tab === "manual" && (
        <div className="space-y-4">
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 flex items-start gap-2.5">
            <AlertCircle size={14} className="text-amber-600 shrink-0 mt-0.5" />
            <p className="text-xs text-amber-800">
              {L(
                "Maombi haya yametumwa na raia ambao hawajathbitishwa kikamilifu (simu/barua pepe tu). Kila ombi linahitaji orodha ya hatua 5 kabla ya kuidhinishwa.",
                "These applications are from citizens with basic verification only (phone/email). Each requires the 5-step checklist before approval.",
              )}
            </p>
          </div>

          {/* Search */}
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
            <input value={searchApp} onChange={(e) => setSearchApp(e.target.value)}
              placeholder={L("Tafuta jina, namba ya maombi, simu...", "Search name, app number, phone...")}
              className="w-full h-10 pl-9 pr-3 bg-white border border-stone-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-emerald-500" />
          </div>

          {loadingApps ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 size={24} className="animate-spin text-stone-400" />
            </div>
          ) : filteredApps.length === 0 ? (
            <div className="bg-white border border-stone-200 rounded-2xl p-10 text-center">
              <CheckCircle2 size={32} className="text-emerald-400 mx-auto mb-3" />
              <p className="font-bold text-stone-600">
                {L("Hakuna maombi yanayosubiri ukaguzi", "No applications pending manual review")}
              </p>
              <p className="text-xs text-stone-400 mt-1">
                {L("Maombi yote yamekaguliwa", "All applications have been reviewed")}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredApps.map((app) => {
                const tier = getUserTier(app.user as Partial<UserProfile>);
                const isOpen = expandedApp === app.id;
                const citizenName = `${app.user?.first_name || ""} ${app.user?.last_name || ""}`.trim() || L("Haajulikani", "Unknown");

                return (
                  <motion.div key={app.id}
                    initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
                    className="bg-white border border-stone-200 rounded-2xl overflow-hidden shadow-sm">

                    {/* App header */}
                    <button className="w-full text-left p-4 hover:bg-stone-50 transition-all"
                      onClick={() => setExpandedApp(isOpen ? null : app.id)}>
                      <div className="flex items-start gap-3">
                        <div className="w-10 h-10 bg-stone-100 rounded-xl flex items-center justify-center shrink-0">
                          <User size={16} className="text-stone-500" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2 flex-wrap">
                            <p className="font-black text-stone-900 text-sm">{citizenName}</p>
                            <VerificationBadge tier={tier} lang={lang} showDot />
                          </div>
                          <p className="text-xs text-stone-500 mt-0.5">
                            {app.service_name} · <span className="font-mono">{app.application_number}</span>
                          </p>
                          <div className="flex items-center gap-3 mt-1 text-[11px] text-stone-400 flex-wrap">
                            {app.user?.phone && <span className="flex items-center gap-1"><Phone size={9} />{app.user.phone}</span>}
                            {app.user?.region && <span className="flex items-center gap-1"><MapPin size={9} />{app.user.region}</span>}
                            <span className="flex items-center gap-1">
                              <Clock size={9} />
                              {new Date(app.created_at).toLocaleDateString(sw ? "sw-TZ" : "en-TZ", { day: "numeric", month: "short" })}
                            </span>
                          </div>
                        </div>
                        {isOpen ? <ChevronUp size={15} className="text-stone-400 shrink-0" /> : <ChevronDown size={15} className="text-stone-400 shrink-0" />}
                      </div>
                    </button>

                    {/* Checklist */}
                    <AnimatePresence>
                      {isOpen && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2 }}
                          className="overflow-hidden border-t border-stone-100">
                          <div className="p-4">
                            <VerificationChecklist
                              applicationId={app.id}
                              citizenId={app.user_id || ""}
                              citizenName={citizenName}
                              citizenPhone={app.user?.phone}
                              lang={lang}
                              onAllComplete={() => {
                                showToast(L("Ukaguzi umekamilika!", "Verification complete!"), "success");
                                loadApps();
                              }}
                            />
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════
          TAB 2 — PHYSICAL VERIFICATION
      ══════════════════════════════════════════════════════════════════ */}
      {tab === "physical" && (
        <div className="space-y-5 max-w-xl">
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 flex items-start gap-2.5">
            <Building2 size={14} className="text-blue-600 shrink-0 mt-0.5" />
            <p className="text-xs text-blue-800">
              {L(
                "Raia amekuja ofisini na vitambulisho vyake. Tafuta kwa simu, NIDA au CT ID, kisha thibitisha na pakia hati. Hali itasasishwa hadi NIDA_VERIFIED mara moja.",
                "Citizen has come to the office with their documents. Search by phone, NIDA or CT ID, then verify and enter the document details. Status upgrades to NIDA_VERIFIED instantly.",
              )}
            </p>
          </div>

          {/* Search citizen */}
          <div className="space-y-3">
            <p className="text-xs font-black text-stone-500 uppercase tracking-widest">
              {L("Tafuta Raia", "Search Citizen")}
            </p>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
                <input value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                  placeholder={L("Namba ya simu, NIDA, CT ID, au barua pepe...", "Phone, NIDA, CT ID, or email...")}
                  className="w-full h-11 pl-9 pr-3 bg-white border border-stone-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-emerald-500" />
              </div>
              <button onClick={handleSearch} disabled={searching || !searchQuery.trim()}
                className="flex items-center gap-1.5 px-4 h-11 bg-stone-900 hover:bg-black disabled:opacity-40 text-white rounded-xl font-bold text-sm transition-all">
                {searching ? <Loader2 size={14} className="animate-spin" /> : <Search size={14} />}
                {L("Tafuta", "Search")}
              </button>
            </div>
          </div>

          {/* Search result */}
          {searchResult && (
            <AnimatePresence>
              <motion.div key="result" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                className="bg-white border border-stone-200 rounded-2xl overflow-hidden shadow-sm">

                {/* Citizen info */}
                <div className="p-5 space-y-4">
                  <div className="flex items-start gap-3">
                    <div className="w-12 h-12 bg-emerald-50 rounded-xl flex items-center justify-center shrink-0">
                      <User size={20} className="text-emerald-600" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <p className="font-black text-stone-900">
                          {`${searchResult.first_name || ""} ${searchResult.middle_name || ""} ${searchResult.last_name || ""}`.trim()}
                        </p>
                        <VerificationBadge tier={getUserTier(searchResult as Partial<UserProfile>)} lang={lang} showDot />
                      </div>
                      <div className="grid grid-cols-2 gap-x-4 gap-y-1 mt-2 text-xs text-stone-500">
                        {searchResult.phone && <span className="flex items-center gap-1"><Phone size={10} />{searchResult.phone}</span>}
                        {searchResult.email && <span className="flex items-center gap-1 truncate">✉ {searchResult.email}</span>}
                        {searchResult.region && <span className="flex items-center gap-1"><MapPin size={10} />{searchResult.region}, {searchResult.district}</span>}
                        {searchResult.nida_number && <span className="flex items-center gap-1"><Shield size={10} />NIDA: {searchResult.nida_number}</span>}
                        {searchResult.citizen_id && <span>CT ID: {searchResult.citizen_id}</span>}
                      </div>
                    </div>
                  </div>

                  {/* Already NIDA_VERIFIED */}
                  {upgraded || getUserTier(searchResult as Partial<UserProfile>) === "NIDA_VERIFIED" ? (
                    <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 flex items-center gap-3">
                      <ShieldCheck size={20} className="text-emerald-600 shrink-0" />
                      <div>
                        <p className="font-black text-emerald-800">{L("Amethibitishwa Kikamilifu ✓", "Fully Verified ✓")}</p>
                        <p className="text-xs text-emerald-700 mt-0.5">{L("Raia huyu ana NIDA_VERIFIED — huduma zote zimefunguliwa.", "This citizen is NIDA_VERIFIED — all services unlocked.")}</p>
                      </div>
                    </div>
                  ) : (
                    <>
                      {/* Document entry */}
                      <div className="space-y-3 pt-2 border-t border-stone-100">
                        <p className="text-xs font-black text-stone-500 uppercase tracking-widest">
                          {L("Ingiza Kitambulisho", "Enter Identity Document")}
                        </p>

                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="text-[11px] font-black text-stone-500 uppercase tracking-widest mb-1.5 block">
                              {L("Aina ya Hati", "Document Type")}
                            </label>
                            <select value={docType} onChange={(e) => setDocType(e.target.value)}
                              className="w-full h-10 px-3 bg-stone-50 border border-stone-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-emerald-500">
                              <option value="NIDA">NIDA</option>
                              <option value="PASSPORT">{L("Pasipoti", "Passport")}</option>
                              <option value="VOTER_ID">{L("Kadi ya Kura", "Voter ID")}</option>
                              <option value="DRIVING_LICENSE">{L("Leseni ya Udereva", "Driving License")}</option>
                            </select>
                          </div>
                          <div>
                            <label className="text-[11px] font-black text-stone-500 uppercase tracking-widest mb-1.5 block">
                              {L("Namba ya Hati", "Document Number")}
                            </label>
                            <input value={docNumber} onChange={(e) => setDocNumber(e.target.value)}
                              placeholder={docType === "NIDA" ? "XXXX-XXXXX-XXXXX-XX" : "..."}
                              className="w-full h-10 px-3 bg-stone-50 border border-stone-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-emerald-500" />
                          </div>
                        </div>

                        <div>
                          <label className="text-[11px] font-black text-stone-500 uppercase tracking-widest mb-1.5 block">
                            {L("Maelezo ya Afisa (hiari)", "Officer Notes (optional)")}
                          </label>
                          <textarea value={officerNotes} onChange={(e) => setOfficerNotes(e.target.value)} rows={2}
                            placeholder={L("Maelezo yoyote ya ziada...", "Any additional notes...")}
                            className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-emerald-500 resize-none" />
                        </div>

                        <button onClick={handleUpgrade} disabled={upgrading || !docNumber.trim()}
                          className="w-full h-12 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 text-white rounded-2xl font-bold text-sm flex items-center justify-center gap-2 transition-all shadow-lg shadow-emerald-100">
                          {upgrading ? <Loader2 size={16} className="animate-spin" /> : <BadgeCheck size={16} />}
                          {L("Thibitisha & Sasishe hadi NIDA_VERIFIED", "Verify & Upgrade to NIDA_VERIFIED")}
                        </button>
                      </div>
                    </>
                  )}
                </div>
              </motion.div>
            </AnimatePresence>
          )}
        </div>
      )}
    </div>
  );
}

export default ManualVerification;
