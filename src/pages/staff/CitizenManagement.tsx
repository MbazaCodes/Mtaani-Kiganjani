import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Users,
  Search,
  Filter,
  MoreVertical,
  Mail,
  Phone,
  MapPin,
  ShieldCheck,
  ShieldAlert,
  Loader2,
  Plus,
  X,
  UserPlus,
  CheckCircle2,
  Check,
  XCircle,
  MailCheck,
} from "lucide-react";
import { supabase, UserProfile } from "@/lib/supabase";
import { adminConfirmUserEmail } from "@/lib/supabase-admin";
import { IS_SUPABASE_CONFIGURED } from "@/lib/config";
import { useLanguage } from "@/context/LanguageContext";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/context/ToastContext";
import { TANZANIA_ADDRESS_DATA } from "@/lib/addressData";
import { cn } from "@/lib/utils";
import { RefreshButton } from "@/components/ui/RefreshButton";

interface PendingProfileChange {
  id: string;
  user_id: string;
  field_name: string;
  old_value: string | null;
  new_value: string;
  status: "pending" | "approved" | "rejected";
  created_at: string;
  users?: {
    first_name: string;
    last_name: string;
    email: string;
  };
}

export function StaffCitizenManagement() {
  const { lang, t } = useLanguage();
  const { showToast } = useToast();
  const { user: staffUser } = useAuth();
  const [citizens, setCitizens] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [filter, setFilter] = useState<"all" | "verified" | "unverified">("all");
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedCitizen, setSelectedCitizen] = useState<UserProfile | null>(null);
  const [citizenApps, setCitizenApps] = useState<{id:string;service_name:string;status:string;created_at:string;application_number:string}[]>([]);
  const [loadingApps, setLoadingApps] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState<"citizens" | "profile-changes">("citizens");
  const [pendingChanges, setPendingChanges] = useState<PendingProfileChange[]>([]);
  const [loadingChanges, setLoadingChanges] = useState(false);
  const [confirmingId, setConfirmingId] = useState<string | null>(null);

  const [newCitizen, setNewCitizen] = useState({
    firstName: "",
    middleName: "",
    lastName: "",
    email: "",
    phone: "",
    nidaNumber: "",
    sex: "Me",
    region: "",
    district: "",
    ward: "",
    street: "",
  });

  useEffect(() => {
    fetchCitizens();
    fetchPendingProfileChanges();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchPendingProfileChanges = async () => {
    setLoadingChanges(true);
    try {
      const { data, error } = await supabase
        .from("profile_change_requests")
        .select(
          `
          *,
          users:user_id (
            first_name,
            last_name,
            email
          )
        `,
        )
        .eq("status", "pending")
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error fetching profile changes:", error);
        setPendingChanges([]);
        return;
      }

      setPendingChanges(data || []);
    } catch (_error) {
      console.error("Exception fetching profile changes:", error);
      setPendingChanges([]);
    } finally {
      setLoadingChanges(false);
    }
  };

  const handleApproveChange = async (change: PendingProfileChange) => {
    try {
      const { error: updateError } = await supabase
        .from("users")
        .update({ [change.field_name]: change.new_value })
        .eq("id", change.user_id);

      if (updateError) throw updateError;

      const { error: statusError } = await supabase
        .from("profile_change_requests")
        .update({
          status: "approved",
          reviewed_at: new Date().toISOString(),
          reviewed_by: (await supabase.auth.getUser()).data.user?.id,
        })
        .eq("id", change.id);

      if (statusError) throw statusError;

      setPendingChanges((prev) => prev.filter((c) => c.id !== change.id));
      showToast(
        lang === "sw" ? "Mabadiliko yameidhinishwa" : "Change approved successfully",
        "success",
      );
      fetchCitizens();
    } catch (error: unknown) {
      const _e = error as { message?: string };
      console.error("Error approving change:", error);
      showToast(
        _e.message ?? (lang === "sw" ? "Hitilafu kuidhinisha" : "Error approving change"),
        "error",
      );
    }
  };

  const handleRejectChange = async (change: PendingProfileChange) => {
    try {
      const { error } = await supabase
        .from("profile_change_requests")
        .update({
          status: "rejected",
          reviewed_at: new Date().toISOString(),
          reviewed_by: (await supabase.auth.getUser()).data.user?.id,
        })
        .eq("id", change.id);

      if (error) throw error;

      setPendingChanges((prev) => prev.filter((c) => c.id !== change.id));
      showToast(lang === "sw" ? "Mabadiliko yamekataliwa" : "Change rejected", "info");
    } catch (error: unknown) {
      const _e = error as { message?: string };
      console.error("Error rejecting change:", error);
      showToast(
        _e.message ?? (lang === "sw" ? "Hitilafu kukataa" : "Error rejecting change"),
        "error",
      );
    }
  };

  const getFieldLabel = (field: string): string => {
    const labels: Record<string, { en: string; sw: string }> = {
      first_name: { en: "First Name", sw: "Jina la Kwanza" },
      middle_name: { en: "Middle Name", sw: "Jina la Kati" },
      last_name: { en: "Last Name", sw: "Jina la Mwisho" },
      nida_number: { en: "NIDA Number", sw: "Namba ya NIDA" },
      nationality: { en: "Nationality", sw: "Uraia" },
      gender: { en: "Gender", sw: "Jinsia" },
      phone: { en: "Phone", sw: "Simu" },
      region: { en: "Region", sw: "Mkoa" },
      district: { en: "District", sw: "Wilaya" },
      ward: { en: "Ward", sw: "Kata" },
      street: { en: "Street", sw: "Mtaa" },
    };
    return labels[field]?.[lang] || field;
  };

  const fetchCitizens = async () => {
    setLoading(true);
    try {
      // Only fetch columns needed for the list view — skip photo_url (base64, large)
      // photo_url is fetched on-demand when a citizen row is clicked (openCitizen)
      let query = supabase
        .from("users")
        .select("id, first_name, middle_name, last_name, email, phone, nida_number, citizen_id, region, district, ward, street, is_verified, account_status, role, created_at, sex, occupation, birth_date, date_of_birth, place_of_birth, nationality")
        .eq("role", "citizen")
        .order("created_at", { ascending: false })
        .limit(200);

      if (staffUser?.assigned_region) {
        query = query.eq("region", staffUser.assigned_region);
      }
      if (staffUser?.assigned_district) {
        query = query.eq("district", staffUser.assigned_district);
      }
      if (staffUser?.ward) {
        query = query.eq("ward", staffUser.ward);
      }

      const { data, error } = await query;

      if (error) {
        console.error("Error fetching citizens:", error);
        showToast(lang === "sw" ? "Hitilafu kupata wananchi" : "Error fetching citizens", "error");
        setCitizens([]);
        return;
      }

      setCitizens(data || []);
    } catch (_error) {
      console.error("Error fetching citizens:", _error);
      setCitizens([]);
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async (citizenId: string) => {
    try {
      // 1. Confirm auth email so citizen can log in immediately
      const { error: confirmError } = await adminConfirmUserEmail({ userId: citizenId });
      if (confirmError && !confirmError.includes("SERVICE_ROLE_KEY")) {
        throw new Error(confirmError);
      }

      // 2. Mark profile as verified and active
      const { error } = await supabase
        .from("users")
        .update({ is_verified: true, account_status: "active" })
        .eq("id", citizenId);

      if (error) throw error;

      setCitizens((prev) =>
        prev.map((c) =>
          c.id === citizenId ? { ...c, is_verified: true, account_status: "active" } : c,
        ),
      );
      showToast(
        lang === "sw"
          ? "Mwananchi amehakikiwa! Sasa anaweza kuingia mfumoni."
          : "Citizen verified! They can now log in.",
        "success",
      );
    } catch (error: unknown) {
      const _e = error as { message?: string };
      showToast(_e.message ?? "An error occurred", "error");
    }
  };

  // Confirm email only (without full verification) — for citizens who registered
  // but never received or clicked the confirmation email
  const openCitizen = async (citizen: UserProfile) => {
    setSelectedCitizen(citizen);
    setLoadingApps(true);
    // Fetch full profile (including photo_url) + applications in parallel
    const [profileRes, appsRes] = await Promise.all([
      supabase.from("users").select("photo_url, email_confirmed_at").eq("id", citizen.id).single(),
      supabase
        .from("applications")
        .select("id, service_name, status, created_at, application_number")
        .eq("user_id", citizen.id)
        .order("created_at", { ascending: false })
        .limit(10),
    ]);
    // Merge photo_url into selected citizen
    if (profileRes.data) {
      setSelectedCitizen(prev => prev ? { ...prev, photo_url: profileRes.data.photo_url } : prev);
    }
    setCitizenApps(appsRes.data || []);
    setLoadingApps(false);
  };

  const handleConfirmEmail = async (citizen: UserProfile) => {
    setConfirmingId(citizen.id);
    try {
      const { error } = await adminConfirmUserEmail({ userId: citizen.id });

      if (error) {
        if (error.includes("SERVICE_ROLE_KEY")) {
          showToast(
            lang === "sw"
              ? "Hatua ya ziada: Ongeza VITE_SUPABASE_SERVICE_ROLE_KEY kwenye Vercel."
              : "Add VITE_SUPABASE_SERVICE_ROLE_KEY to Vercel env vars to use this feature.",
            "error",
          );
          return;
        }
        throw new Error(error);
      }

      // Also activate account so they can log in
      await supabase.from("users").update({ account_status: "active" }).eq("id", citizen.id);

      setCitizens((prev) =>
        prev.map((c) => (c.id === citizen.id ? { ...c, account_status: "active" } : c)),
      );

      showToast(
        lang === "sw"
          ? `Barua pepe ya ${citizen.first_name} imethibitishwa. Sasa anaweza kuingia.`
          : `${citizen.first_name}'s email confirmed. They can now log in.`,
        "success",
      );
    } catch (err: unknown) {
      const _e = err as { message?: string };
      showToast(_e.message ?? "Failed to confirm email", "error");
    } finally {
      setConfirmingId(null);
    }
  };

  const handleDecline = async (citizenId: string) => {
    if (
      !confirm(
        lang === "sw"
          ? "Je, una uhakika unataka kukataa uhakiki huu?"
          : "Are you sure you want to decline this verification?",
      )
    )
      return;

    try {
      const { error } = await supabase.from("users").delete().eq("id", citizenId);

      if (error) throw error;
      setCitizens((prev) => prev.filter((c) => c.id !== citizenId));
      showToast(lang === "sw" ? "Uhakiki umekataliwa." : "Verification declined.", "success");
    } catch (error: unknown) {
      const _e = error as { message?: string };
      showToast(_e.message ?? "An error occurred", "error");
    }
  };

  const handleAddCitizen = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const isConfigured = IS_SUPABASE_CONFIGURED;

      if (!isConfigured) {
        await new Promise((resolve) => setTimeout(resolve, 1500));
        const citizen: UserProfile = {
          id: "demo-" + Math.random().toString(36).substring(7),
          first_name: newCitizen.firstName.toUpperCase(),
          middle_name: newCitizen.middleName.toUpperCase(),
          last_name: newCitizen.lastName.toUpperCase(),
          email: newCitizen.email,
          phone: newCitizen.phone,
          nida_number: newCitizen.nidaNumber,
          sex: newCitizen.sex,
          region: newCitizen.region,
          district: newCitizen.district,
          ward: newCitizen.ward,
          street: newCitizen.street,
          role: "citizen",
          account_status: "active",
          is_verified: true, // Staff created citizens are verified by default
        };

        const existing = JSON.parse(localStorage.getItem("demo_citizens") || "[]");
        localStorage.setItem("demo_citizens", JSON.stringify([citizen, ...existing]));

        setCitizens((prev) => [citizen, ...prev]);
        setShowAddModal(false);
        setNewCitizen({
          firstName: "",
          middleName: "",
          lastName: "",
          email: "",
          phone: "",
          nidaNumber: "",
          sex: "Me",
          region: "",
          district: "",
          ward: "",
          street: "",
        });
        showToast(
          lang === "sw" ? "Mwananchi amesajiliwa kikamilifu!" : "Citizen registered successfully!",
          "success",
        );
        return;
      }

      // In real mode, we'd probably use a service role or a specific function to create users
      // For now, we'll simulate the insert into the users table
      // Note: Supabase Auth requires a user to be created in auth.users first.
      // In a real app, this would be an Edge Function.
      throw new Error(
        "Manual registration requires backend integration (Edge Functions). Please use Demo Mode for this feature.",
      );
    } catch (error: unknown) {
      const _e = error as { message?: string };
      showToast(_e.message ?? "An error occurred", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredCitizens = citizens.filter((c) => {
    const matchesSearch =
      c.first_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.last_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.nida_number?.includes(searchQuery);

    const matchesFilter =
      filter === "all" ||
      (filter === "verified" && c.is_verified) ||
      (filter === "unverified" && !c.is_verified);

    return matchesSearch && matchesFilter;
  });

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-8"
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-stone-900 tracking-tight">
            {lang === "sw" ? "Usimamizi wa Wananchi" : "Citizen Management"}
          </h1>
          <p className="text-stone-500 font-medium">
            {lang === "sw"
              ? "Sajili na dhibiti wananchi wanaofika ofisini"
              : "Register and manage walk-in citizens"}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <RefreshButton onRefresh={fetchCitizens} lang={lang} variant="labeled" />
          <button
            onClick={() => setShowAddModal(true)}
            className="h-12 px-6 bg-emerald-600 text-white rounded-xl font-bold hover:bg-emerald-700 transition-all flex items-center gap-2 shadow-lg shadow-emerald-100"
          >
            <Plus size={20} />
            {lang === "sw" ? "Sajili Mwananchi" : "Register Citizen"}
          </button>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" size={18} />
            <input
              type="text"
              placeholder={lang === "sw" ? "Tafuta..." : "Search..."}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 pr-4 h-12 bg-white border border-stone-200 rounded-xl focus:ring-2 focus:ring-emerald-500 transition-all w-full sm:w-64 font-medium"
            />
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-stone-200">
        <button
          onClick={() => setActiveTab("citizens")}
          className={cn(
            "px-6 py-3 font-bold text-sm border-b-2 transition-all",
            activeTab === "citizens"
              ? "border-emerald-600 text-emerald-600"
              : "border-transparent text-stone-500 hover:text-stone-700",
          )}
        >
          <Users size={16} className="inline mr-2" />
          {lang === "sw" ? "Wananchi" : "Citizens"} ({filteredCitizens.length})
        </button>
        <button
          onClick={() => setActiveTab("profile-changes")}
          className={cn(
            "px-6 py-3 font-bold text-sm border-b-2 transition-all relative",
            activeTab === "profile-changes"
              ? "border-emerald-600 text-emerald-600"
              : "border-transparent text-stone-500 hover:text-stone-700",
          )}
        >
          <CheckCircle2 size={16} className="inline mr-2" />
          {lang === "sw" ? "Mabadiliko ya Wasifu" : "Profile Changes"}
          {pendingChanges.length > 0 && (
            <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
              {pendingChanges.length}
            </span>
          )}
        </button>
      </div>

      {activeTab === "profile-changes" ? (
        <div className="bg-white rounded-3xl border border-stone-100 shadow-xl overflow-hidden">
          {loadingChanges ? (
            <div className="p-20 flex flex-col items-center justify-center gap-4">
              <Loader2 className="animate-spin text-emerald-600" size={40} />
              <p className="text-stone-500 font-bold">
                {lang === "sw" ? "Inapakia..." : "Loading changes..."}
              </p>
            </div>
          ) : pendingChanges.length === 0 ? (
            <div className="p-20 text-center">
              <div className="w-20 h-20 bg-stone-50 rounded-full flex items-center justify-center mx-auto mb-4">
                <Check className="text-stone-300" size={40} />
              </div>
              <h3 className="text-xl font-bold text-stone-900">
                {lang === "sw" ? "Hakuna Mabadiliko Yanayosubiri" : "No Pending Changes"}
              </h3>
              <p className="text-stone-500 font-medium">
                {lang === "sw"
                  ? "Mabadiliko yote ya wasifu yameshughulikiwa"
                  : "All profile changes have been processed"}
              </p>
            </div>
          ) : (
            <div className="divide-y divide-stone-100">
              {pendingChanges.map((change) => (
                <div key={change.id} className="p-6 hover:bg-stone-50 transition-colors">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-4">
                      <div className="w-12 h-12 rounded-full bg-amber-100 flex items-center justify-center">
                        <CheckCircle2 size={20} className="text-amber-600" />
                      </div>
                      <div>
                        <p className="font-bold text-stone-900">
                          {change.users?.first_name} {change.users?.last_name}
                        </p>
                        <p className="text-xs text-stone-500">{change.users?.email}</p>
                        <div className="mt-2 bg-stone-50 rounded-lg p-3">
                          <p className="text-xs font-bold text-stone-400 uppercase tracking-wider mb-1">
                            {getFieldLabel(change.field_name)}
                          </p>
                          <div className="flex items-center gap-2">
                            <span className="text-stone-500 line-through">
                              {change.old_value || "-"}
                            </span>
                            <span className="text-stone-400">→</span>
                            <span className="font-bold text-emerald-600">{change.new_value}</span>
                          </div>
                        </div>
                        <p className="text-xs text-stone-400 mt-2">
                          {new Date(change.created_at).toLocaleString(
                            lang === "sw" ? "sw-TZ" : "en-US",
                          )}
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleApproveChange(change)}
                        className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-xl font-bold hover:bg-emerald-700 transition-all"
                      >
                        <Check size={16} />
                        {lang === "sw" ? "Idhinisha" : "Approve"}
                      </button>
                      <button
                        onClick={() => handleRejectChange(change)}
                        className="flex items-center gap-2 px-4 py-2 bg-stone-100 text-stone-600 rounded-xl font-bold hover:bg-stone-200 transition-all"
                      >
                        <X size={16} />
                        {lang === "sw" ? "Kataa" : "Reject"}
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        <div className="bg-white rounded-3xl border border-stone-100 shadow-xl overflow-hidden">
          {loading ? (
            <div className="p-20 flex flex-col items-center justify-center gap-4">
              <Loader2 className="animate-spin text-emerald-600" size={40} />
              <p className="text-stone-500 font-bold">
                {lang === "sw" ? "Inapakia..." : "Loading citizens..."}
              </p>
            </div>
          ) : filteredCitizens.length === 0 ? (
            <div className="p-20 text-center">
              <div className="w-20 h-20 bg-stone-50 rounded-full flex items-center justify-center mx-auto mb-4">
                <Users className="text-stone-300" size={40} />
              </div>
              <h3 className="text-xl font-bold text-stone-900">
                {lang === "sw" ? "Hakuna Wananchi" : "No Citizens Found"}
              </h3>
              <p className="text-stone-500 font-medium">
                {lang === "sw"
                  ? "Jaribu kubadilisha vigezo vya utafutaji"
                  : "Try adjusting your search or filter"}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-stone-50 border-b border-stone-100">
                    <th className="px-6 py-4 text-[10px] font-black text-stone-400 uppercase tracking-widest">
                      {lang === "sw" ? "Mwananchi" : "Citizen"}
                    </th>
                    <th className="px-6 py-4 text-[10px] font-black text-stone-400 uppercase tracking-widest">
                      {lang === "sw" ? "Mawasiliano" : "Contact"}
                    </th>
                    <th className="px-6 py-4 text-[10px] font-black text-stone-400 uppercase tracking-widest">
                      {lang === "sw" ? "Mahali" : "Location"}
                    </th>
                    <th className="px-6 py-4 text-[10px] font-black text-stone-400 uppercase tracking-widest">
                      {lang === "sw" ? "Hali" : "Status"}
                    </th>
                    <th className="px-6 py-4 text-[10px] font-black text-stone-400 uppercase tracking-widest"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-50">
                  {filteredCitizens.map((citizen) => (
                    <tr key={citizen.id} onClick={() => openCitizen(citizen)} className="hover:bg-stone-50/50 transition-colors group cursor-pointer">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          {citizen.photo_url ? (
                            <img
                              src={citizen.photo_url}
                              alt="profile"
                              className="w-10 h-10 rounded-full object-cover border border-stone-200 shrink-0"
                            />
                          ) : (
                            <div className="w-10 h-10 rounded-full bg-stone-100 flex items-center justify-center text-stone-500 font-bold shrink-0">
                              {citizen.first_name?.[0]}{citizen.last_name?.[0]}
                            </div>
                          )}
                          <div>
                            <p className="font-bold text-stone-900">
                              {citizen.first_name} {citizen.last_name}
                            </p>
                            <p className="text-xs text-stone-500 font-medium">
                              NIDA: {citizen.nida_number || "N/A"}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2 text-sm text-stone-600 font-medium">
                            <Mail size={14} className="text-stone-400" />
                            {citizen.email}
                          </div>
                          <div className="flex items-center gap-2 text-sm text-stone-600 font-medium">
                            <Phone size={14} className="text-stone-400" />
                            {citizen.phone}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2 text-sm text-stone-600 font-medium">
                          <MapPin size={14} className="text-stone-400" />
                          {citizen.region}, {citizen.district}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        {citizen.is_verified ? (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-600 text-xs font-bold">
                            <ShieldCheck size={14} />
                            {lang === "sw" ? "Imehakikiwa" : "Verified"}
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-50 text-amber-600 text-xs font-bold">
                            <ShieldAlert size={14} />
                            {lang === "sw" ? "Inasubiri" : "Pending"}
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {/* Confirm email button — always visible for unconfirmed citizens */}
                          <button
                            onClick={(e) => { e.stopPropagation(); handleConfirmEmail(citizen); }}
                            disabled={confirmingId === citizen.id}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg text-xs font-bold transition-colors disabled:opacity-50"
                            title={
                              lang === "sw"
                                ? "Thibitisha barua pepe — mwananchi ataweza kuingia"
                                : "Confirm email — unblocks login"
                            }
                          >
                            {confirmingId === citizen.id ? (
                              <Loader2 size={13} className="animate-spin" />
                            ) : (
                              <MailCheck size={13} />
                            )}
                            {lang === "sw" ? "Thibitisha Email" : "Confirm Email"}
                          </button>

                          {!citizen.is_verified && (
                            <>
                              <button
                                onClick={(e) => { e.stopPropagation(); handleVerify(citizen.id); }}
                                className="p-2 hover:bg-emerald-50 rounded-lg transition-colors text-emerald-600"
                                title={lang === "sw" ? "Hakiki akaunti" : "Verify account"}
                              >
                                <Check size={18} />
                              </button>
                              <button
                                onClick={(e) => { e.stopPropagation(); handleDecline(citizen.id); }}
                                className="p-2 hover:bg-red-50 rounded-lg transition-colors text-red-600"
                                title={lang === "sw" ? "Kataa" : "Decline"}
                              >
                                <XCircle size={18} />
                              </button>
                            </>
                          )}
                          <button
                            className="p-2 hover:bg-stone-100 rounded-lg transition-colors text-stone-400"
                            title={lang === "sw" ? "Chaguo zaidi" : "More options"}
                            aria-label={lang === "sw" ? "Chaguo zaidi" : "More options"}
                          >
                            <MoreVertical size={18} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Add Citizen Modal */}
      <AnimatePresence>
        {showAddModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowAddModal(false)}
              className="absolute inset-0 bg-stone-900/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-2xl bg-white rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
            >
              <div className="px-8 py-6 border-b border-stone-100 flex items-center justify-between bg-white sticky top-0 z-10">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600">
                    <UserPlus size={24} />
                  </div>
                  <div>
                    <h2 className="text-xl font-black tracking-tight text-stone-900">
                      {lang === "sw" ? "Usajili wa Mwananchi" : "Citizen Registration"}
                    </h2>
                    <p className="text-[10px] font-bold text-stone-400 uppercase tracking-widest leading-none">
                      WALK-IN REGISTRATION
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setShowAddModal(false)}
                  className="p-2 hover:bg-stone-100 rounded-full transition-colors text-stone-400"
                  title={lang === "sw" ? "Funga" : "Close"}
                  aria-label={lang === "sw" ? "Funga" : "Close"}
                >
                  <X size={20} />
                </button>
              </div>

              <form onSubmit={handleAddCitizen} className="flex-1 overflow-y-auto p-8 space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-stone-500 uppercase tracking-widest ml-1">
                      {lang === "sw" ? "Jina la Kwanza" : "First Name"}
                    </label>
                    <input
                      type="text"
                      required
                      value={newCitizen.firstName}
                      onChange={(e) => setNewCitizen({ ...newCitizen, firstName: e.target.value })}
                      className="w-full h-12 px-4 bg-stone-50 border border-stone-200 rounded-xl focus:ring-2 focus:ring-emerald-500 transition-all font-medium"
                      aria-label={lang === "sw" ? "Jina la Kwanza" : "First Name"}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-stone-500 uppercase tracking-widest ml-1">
                      {lang === "sw" ? "Jina la Kati" : "Middle Name"}
                    </label>
                    <input
                      type="text"
                      value={newCitizen.middleName}
                      onChange={(e) => setNewCitizen({ ...newCitizen, middleName: e.target.value })}
                      className="w-full h-12 px-4 bg-stone-50 border border-stone-200 rounded-xl focus:ring-2 focus:ring-emerald-500 transition-all font-medium"
                      aria-label={lang === "sw" ? "Jina la Kati" : "Middle Name"}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-stone-500 uppercase tracking-widest ml-1">
                      {lang === "sw" ? "Jina la Mwisho" : "Last Name"}
                    </label>
                    <input
                      type="text"
                      required
                      value={newCitizen.lastName}
                      onChange={(e) => setNewCitizen({ ...newCitizen, lastName: e.target.value })}
                      className="w-full h-12 px-4 bg-stone-50 border border-stone-200 rounded-xl focus:ring-2 focus:ring-emerald-500 transition-all font-medium"
                      aria-label={lang === "sw" ? "Jina la Mwisho" : "Last Name"}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-stone-500 uppercase tracking-widest ml-1">
                      {lang === "sw" ? "Barua Pepe" : "Email"}
                    </label>
                    <input
                      type="email"
                      required
                      value={newCitizen.email}
                      onChange={(e) => setNewCitizen({ ...newCitizen, email: e.target.value })}
                      className="w-full h-12 px-4 bg-stone-50 border border-stone-200 rounded-xl focus:ring-2 focus:ring-emerald-500 transition-all font-medium"
                      aria-label={lang === "sw" ? "Barua Pepe" : "Email"}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-stone-500 uppercase tracking-widest ml-1">
                      {lang === "sw" ? "Namba ya Simu" : "Phone Number"}
                    </label>
                    <input
                      type="tel"
                      required
                      value={newCitizen.phone}
                      onChange={(e) => setNewCitizen({ ...newCitizen, phone: e.target.value })}
                      className="w-full h-12 px-4 bg-stone-50 border border-stone-200 rounded-xl focus:ring-2 focus:ring-emerald-500 transition-all font-medium"
                      aria-label={lang === "sw" ? "Namba ya Simu" : "Phone Number"}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-stone-500 uppercase tracking-widest ml-1">
                      {lang === "sw" ? "Namba ya NIDA" : "NIDA Number"}
                    </label>
                    <input
                      type="text"
                      required
                      value={newCitizen.nidaNumber}
                      onChange={(e) => setNewCitizen({ ...newCitizen, nidaNumber: e.target.value })}
                      className="w-full h-12 px-4 bg-stone-50 border border-stone-200 rounded-xl focus:ring-2 focus:ring-emerald-500 transition-all font-medium"
                      placeholder="20-digit number"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-stone-500 uppercase tracking-widest ml-1">
                      {lang === "sw" ? "Jinsia" : "Gender"}
                    </label>
                    <div className="flex gap-2">
                      {["Me", "Ke"].map((s) => (
                        <button
                          key={s}
                          type="button"
                          onClick={() => setNewCitizen({ ...newCitizen, sex: s })}
                          className={cn(
                            "flex-1 h-12 rounded-xl font-bold border-2 transition-all",
                            newCitizen.sex === s
                              ? "bg-emerald-50 border-emerald-600 text-emerald-600"
                              : "bg-white border-stone-100 text-stone-400",
                          )}
                        >
                          {s === "Me"
                            ? lang === "sw"
                              ? "Mwanaume"
                              : "Male"
                            : lang === "sw"
                              ? "Mwanamke"
                              : "Female"}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-stone-500 uppercase tracking-widest ml-1">
                      {lang === "sw" ? "Mkoa" : "Region"}
                    </label>
                    <select
                      required
                      value={newCitizen.region}
                      onChange={(e) =>
                        setNewCitizen({
                          ...newCitizen,
                          region: e.target.value,
                          district: "",
                          ward: "",
                        })
                      }
                      className="w-full h-12 px-4 bg-stone-50 border border-stone-200 rounded-xl focus:ring-2 focus:ring-emerald-500 transition-all font-medium"
                      aria-label={lang === "sw" ? "Mkoa" : "Region"}
                    >
                      <option value="">Select Region</option>
                      {TANZANIA_ADDRESS_DATA.map((r) => (
                        <option key={r.name} value={r.name}>
                          {r.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-stone-500 uppercase tracking-widest ml-1">
                      {lang === "sw" ? "Wilaya" : "District"}
                    </label>
                    <select
                      required
                      value={newCitizen.district}
                      onChange={(e) =>
                        setNewCitizen({ ...newCitizen, district: e.target.value, ward: "" })
                      }
                      disabled={!newCitizen.region}
                      className="w-full h-12 px-4 bg-stone-50 border border-stone-200 rounded-xl focus:ring-2 focus:ring-emerald-500 transition-all font-medium disabled:opacity-50"
                      aria-label={lang === "sw" ? "Wilaya" : "District"}
                    >
                      <option value="">Select District</option>
                      {TANZANIA_ADDRESS_DATA.find(
                        (r) => r.name === newCitizen.region,
                      )?.districts.map((d) => (
                        <option key={d.name} value={d.name}>
                          {d.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-stone-500 uppercase tracking-widest ml-1">
                      {lang === "sw" ? "Kata" : "Ward"}
                    </label>
                    <input
                      type="text"
                      required
                      value={newCitizen.ward}
                      onChange={(e) => setNewCitizen({ ...newCitizen, ward: e.target.value })}
                      className="w-full h-12 px-4 bg-stone-50 border border-stone-200 rounded-xl focus:ring-2 focus:ring-emerald-500 transition-all font-medium"
                      aria-label={lang === "sw" ? "Kata" : "Ward"}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-stone-500 uppercase tracking-widest ml-1">
                      {lang === "sw" ? "Mtaa" : "Street"}
                    </label>
                    <input
                      type="text"
                      required
                      value={newCitizen.street}
                      onChange={(e) => setNewCitizen({ ...newCitizen, street: e.target.value })}
                      className="w-full h-12 px-4 bg-stone-50 border border-stone-200 rounded-xl focus:ring-2 focus:ring-emerald-500 transition-all font-medium"
                      aria-label={lang === "sw" ? "Mtaa" : "Street"}
                    />
                  </div>
                </div>

                <div className="pt-4">
                  <button
                    disabled={isSubmitting}
                    className="w-full h-14 bg-emerald-600 text-white rounded-2xl font-bold text-lg hover:bg-emerald-700 transition-all shadow-xl shadow-emerald-100 flex items-center justify-center gap-2 disabled:opacity-50"
                    type="submit"
                  >
                    {isSubmitting ? (
                      <Loader2 className="animate-spin" />
                    ) : lang === "sw" ? (
                      "Kamilisha Usajili"
                    ) : (
                      "Complete Registration"
                    )}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
