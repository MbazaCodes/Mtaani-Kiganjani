import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  UserCheck,
  Search,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Loader2,
  FileText,
  Shield,
  User,
  Building2,
  MapPin,
} from "lucide-react";
import { supabase, UserProfile } from "@/lib/supabase";
import { IS_SUPABASE_CONFIGURED } from "@/lib/config";
import { useLanguage } from "@/context/LanguageContext";
import { useToast } from "@/context/ToastContext";
import { createNotification } from "@/lib/notifications";
import { cn } from "@/lib/utils";

export function ManualVerification() {
  const { lang } = useLanguage();
  const { showToast } = useToast();
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [processing, setProcessing] = useState<string | null>(null);
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState("");

  useEffect(() => {
    fetchUnverifiedUsers();
  }, []);

  const fetchUnverifiedUsers = async () => {
    setLoading(true);

    const isConfigured = IS_SUPABASE_CONFIGURED;

    if (!isConfigured) {
      await new Promise((resolve) => setTimeout(resolve, 1000));
      const demoCitizens = JSON.parse(localStorage.getItem("demo_citizens") || "[]");
      setUsers(demoCitizens.filter((c: import("@/lib/supabase").UserProfile) => !c.is_verified));
      setLoading(false);
      return;
    }

    const { data, error } = await supabase
      .from("users")
      .select("*")
      .eq("is_verified", false)
      .eq("role", "citizen")
      .order("created_at", { ascending: false });

    if (!error && data) {
      setUsers(data);
    }
    setLoading(false);
  };

  const handleVerify = async (userId: string) => {
    if (
      !confirm(
        lang === "sw"
          ? "Je, una uhakika unataka kumthibitisha raia huyu kwa mwongozo?"
          : "Are you sure you want to manually verify this citizen?",
      )
    )
      return;

    setProcessing(userId);
    const { error } = await supabase.from("users").update({ is_verified: true }).eq("id", userId);

    if (error) {
      showToast(error.message, "error");
    } else {
      await createNotification({
        user_id: userId,
        title: lang === "sw" ? "Akaunti Yako Imethibitishwa" : "Your Account Has Been Verified",
        message:
          lang === "sw"
            ? "Utambulisho wako umethibitishwa na wafanyakazi. Sasa unaweza kutumia huduma zote."
            : "Your identity has been verified by staff. You can now use all services.",
        type: "success",
      });
      setUsers((prev) => prev.filter((u) => u.id !== userId));
      showToast(
        lang === "sw" ? "Raia amethibitishwa kikamilifu." : "Citizen verified successfully.",
        "success",
      );
    }
    setProcessing(null);
  };

  const handleReject = async (userId: string) => {
    if (!rejectReason.trim()) return;
    setProcessing(userId);
    const { error } = await supabase
      .from("users")
      .update({ account_status: "verification_rejected" })
      .eq("id", userId);

    if (error) {
      showToast(error.message, "error");
    } else {
      await createNotification({
        user_id: userId,
        title: lang === "sw" ? "Uthibitisho Umekataliwa" : "Verification Rejected",
        message:
          (lang === "sw"
            ? "Uthibitisho wa kitambulisho chako umekataliwa. Sababu: "
            : "Your identity verification has been rejected. Reason: ") + rejectReason,
        type: "error",
      });
      setUsers((prev) => prev.filter((u) => u.id !== userId));
      showToast(lang === "sw" ? "Raia amekataliwa." : "Citizen verification rejected.", "success");
      setRejectingId(null);
      setRejectReason("");
    }
    setProcessing(null);
  };

  const filteredUsers = users.filter(
    (u) =>
      u.first_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.last_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (u.nida_number || "").includes(searchTerm),
  );

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-8"
    >
      <div className="flex items-center gap-4">
        <div className="h-14 w-14 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center">
          <UserCheck size={32} />
        </div>
        <div>
          <h1 className="text-3xl font-black text-stone-900 tracking-tight">
            {lang === "sw" ? "Uhakiki wa Mwongozo" : "Manual Verification"}
          </h1>
          <p className="text-stone-500 font-medium">
            {lang === "sw"
              ? "Thibitisha raia waliofeli uhakiki wa kawaida wa NIDA"
              : "Verify citizens who failed normal NIDA verification"}
          </p>
        </div>
      </div>

      <div className="bg-white rounded-4xl border border-stone-100 shadow-xl overflow-hidden">
        <div className="p-6 border-b border-stone-100 bg-stone-50/50">
          <div className="relative max-w-md">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-400" size={20} />
            <input
              type="text"
              placeholder={
                lang === "sw"
                  ? "Tafuta kwa jina au namba ya NIDA..."
                  : "Search by name or NIDA number..."
              }
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full h-12 pl-12 pr-4 bg-white border border-stone-200 rounded-xl focus:ring-2 focus:ring-blue-500 transition-all font-medium"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-stone-50/50 border-b border-stone-100">
                <th className="px-6 py-4 text-xs font-bold text-stone-500 uppercase tracking-widest">
                  {lang === "sw" ? "Raia" : "Citizen"}
                </th>
                <th className="px-6 py-4 text-xs font-bold text-stone-500 uppercase tracking-widest">
                  {lang === "sw" ? "NIDA / Pasipoti" : "NIDA / Passport"}
                </th>
                <th className="px-6 py-4 text-xs font-bold text-stone-500 uppercase tracking-widest">
                  {lang === "sw" ? "Mahali" : "Location"}
                </th>
                <th className="px-6 py-4 text-xs font-bold text-stone-500 uppercase tracking-widest text-right">
                  {lang === "sw" ? "Vitendo" : "Actions"}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-50">
              {loading ? (
                <tr>
                  <td colSpan={4} className="px-6 py-12 text-center">
                    <Loader2 className="animate-spin mx-auto text-blue-600 mb-2" />
                    <p className="text-stone-400 font-bold">
                      {lang === "sw" ? "Inapakia..." : "Loading..."}
                    </p>
                  </td>
                </tr>
              ) : filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-12 text-center text-stone-400 font-bold">
                    {lang === "sw"
                      ? "Hakuna raia wanaosubiri uhakiki."
                      : "No citizens pending verification."}
                  </td>
                </tr>
              ) : (
                filteredUsers.map((u) => (
                  <tr key={u.id} className="hover:bg-stone-50/50 transition-colors group">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-stone-100 flex items-center justify-center text-stone-500 group-hover:bg-blue-50 group-hover:text-blue-600 transition-colors">
                          <User size={20} />
                        </div>
                        <div>
                          <p className="font-bold text-stone-900">
                            {u.first_name} {u.last_name}
                          </p>
                          <p className="text-xs text-stone-400 font-medium">{u.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <p className="font-mono text-sm font-bold text-stone-600">
                        {u.nida_number || u.passport_number || "-"}
                      </p>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-1 text-xs font-bold text-stone-500">
                        <MapPin size={12} />
                        {u.region}, {u.district}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center gap-2 justify-end">
                        {rejectingId === u.id ? (
                          <div className="flex items-center gap-2">
                            <input
                              value={rejectReason}
                              onChange={(e) => setRejectReason(e.target.value)}
                              placeholder={lang === "sw" ? "Sababu..." : "Reason..."}
                              className="w-32 px-2 py-1.5 border border-stone-200 rounded-lg text-xs"
                            />
                            <button
                              onClick={() => handleReject(u.id)}
                              disabled={processing === u.id || !rejectReason.trim()}
                              className="px-3 py-1.5 bg-red-600 text-white rounded-lg font-bold text-xs disabled:opacity-50"
                            >
                              {processing === u.id ? (
                                <Loader2 className="h-3 w-3 animate-spin" />
                              ) : (
                                "✓"
                              )}
                            </button>
                            <button
                              onClick={() => {
                                setRejectingId(null);
                                setRejectReason("");
                              }}
                              className="px-2 py-1.5 bg-stone-200 text-stone-600 rounded-lg text-xs"
                            >
                              ✗
                            </button>
                          </div>
                        ) : (
                          <>
                            <button
                              onClick={() => setRejectingId(u.id)}
                              className="px-3 py-2 bg-red-50 text-red-600 rounded-xl font-bold text-xs hover:bg-red-100 transition-all border border-red-100 flex items-center gap-1.5"
                            >
                              <XCircle size={13} />
                              {lang === "sw" ? "Kataa" : "Reject"}
                            </button>
                            <button
                              onClick={() => handleVerify(u.id)}
                              disabled={processing === u.id}
                              className="px-4 py-2 bg-blue-600 text-white rounded-xl font-bold text-xs hover:bg-blue-700 transition-all shadow-lg shadow-blue-100 flex items-center gap-2 disabled:opacity-50"
                            >
                              {processing === u.id ? (
                                <Loader2 className="h-3 w-3 animate-spin" />
                              ) : (
                                <CheckCircle2 size={14} />
                              )}
                              {lang === "sw" ? "Thibitisha" : "Verify"}
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </motion.div>
  );
}
