import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Users,
  Search,
  MoreVertical,
  Mail,
  Phone,
  MapPin,
  ShieldCheck,
  ShieldAlert,
  Loader2,
  Check,
  XCircle,
  X,
  User,
  Globe,
  BadgeCheck,
  Calendar,
  Edit2,
  Trash2,
  CreditCard,
  RefreshCw,
  Briefcase,
  BookOpen,
  Heart,
  Navigation,
  Map,
  Flag,
  Fingerprint,
  Hash,
} from "lucide-react";
import { supabase, UserProfile } from "@/lib/supabase";
import { IS_SUPABASE_CONFIGURED } from "@/lib/config";
import { useLanguage } from "@/context/LanguageContext";
import { useToast } from "@/context/ToastContext";
import { cn } from "@/lib/utils";

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

export function CitizenManagement() {
  const { lang } = useLanguage();
  const { showToast } = useToast();
  const [citizens, setCitizens] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [filter, setFilter] = useState<
    "all" | "verified" | "unverified" | "sellers" | "landlords" | "brokers"
  >("all");
  const [regionFilter, setRegionFilter] = useState("");
  const [districtFilter, setDistrictFilter] = useState("");
  const [activeTab, setActiveTab] = useState<"citizens" | "profile-changes">("citizens");
  const [pendingChanges, setPendingChanges] = useState<PendingProfileChange[]>([]);
  const [loadingChanges, setLoadingChanges] = useState(false);

  // Details modal state
  const [selectedCitizen, setSelectedCitizen] = useState<UserProfile | null>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [editingInfo, setEditingInfo] = useState(false);
  const [editFormData, setEditFormData] = useState({
    first_name: "",
    middle_name: "",
    last_name: "",
    phone: "",
    region: "",
    district: "",
  });

  const regions = [
    "Dar es Salaam",
    "Arusha",
    "Dodoma",
    "Mwanza",
    "Tanga",
    "Morogoro",
    "Mbeya",
    "Kilimanjaro",
    "Iringa",
    "Kagera",
  ];

  const getDistrictsForRegion = (region: string) => {
    const districtsMap: { [key: string]: string[] } = {
      "Dar es Salaam": ["Ilala", "Kinondoni", "Ubungo", "Temeke", "Kigamboni"],
      Arusha: ["Arusha CC", "Arusha DC", "Meru", "Longido", "Monduli"],
      Dodoma: ["Dodoma CC", "Bahi", "Chamwino", "Chemba", "Kondoa"],
      Mwanza: ["Nyamagana", "Ilemela", "Magu", "Kwimba", "Sengerema"],
      Tanga: ["Tanga CC", "Muheza", "Korogwe", "Lushoto", "Handeni"],
      Morogoro: ["Morogoro CC", "Morogoro DC", "Kilosa", "Ulanga", "Malinyi"],
      Mbeya: ["Mbeya CC", "Mbeya DC", "Rungwe", "Kyela", "Mbozi"],
      Kilimanjaro: ["Moshi CC", "Moshi DC", "Hai", "Siha", "Rombo"],
      Iringa: ["Iringa CC", "Iringa DC", "Kilolo", "Mufindi"],
      Kagera: ["Bukoba CC", "Bukoba DC", "Muleba", "Karagwe", "Kyerwa"],
    };
    return districtsMap[region] || ["Central", "North", "South", "East", "West"];
  };

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
      // Update the user's profile with the new value
      const { error: updateError } = await supabase
        .from("users")
        .update({ [change.field_name]: change.new_value })
        .eq("id", change.user_id);

      if (updateError) throw updateError;

      // Mark the change request as approved
      const { error: statusError } = await supabase
        .from("profile_change_requests")
        .update({
          status: "approved",
          reviewed_at: new Date().toISOString(),
          reviewed_by: (await supabase.auth.getUser()).data.user?.id,
        })
        .eq("id", change.id);

      if (statusError) throw statusError;

      // Remove from local state
      setPendingChanges((prev) => prev.filter((c) => c.id !== change.id));
      showToast(
        lang === "sw" ? "Mabadiliko yameidhinishwa" : "Change approved successfully",
        "success",
      );

      // Refresh citizens list to show updated data
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
      const { data, error } = await supabase
        .from("users")
        .select("id, first_name, middle_name, last_name, email, phone, nida_number, citizen_id, region, district, ward, street, is_verified, account_status, role, created_at, sex, occupation, date_of_birth, place_of_birth, nationality")
        .eq("role", "citizen")
        .order("created_at", { ascending: false })
        .limit(500);

      if (error) {
        console.error("Error fetching citizens:", error);
        showToast(lang === "sw" ? "Hitilafu kupata wananchi" : "Error fetching citizens", "error");
        setCitizens([]);
        return;
      }
      setCitizens(data || []);
    } catch (_error) {
      console.error("Exception in fetchCitizens:", _error);
      showToast(lang === "sw" ? "Hitilafu kupata wananchi" : "Error fetching citizens", "error");
      setCitizens([]);
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async (citizenId: string) => {
    try {
      const { error } = await supabase
        .from("users")
        .update({ is_verified: true })
        .eq("id", citizenId);

      if (error) throw error;
      setCitizens((prev) =>
        prev.map((c) => (c.id === citizenId ? { ...c, is_verified: true } : c)),
      );
      showToast(
        lang === "sw" ? "Mwananchi amethibitishwa." : "Citizen verified successfully.",
        "success",
      );
    } catch (error: unknown) {
      const _e = error as { message?: string };
      showToast(_e.message ?? "An error occurred", "error");
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
      // For decline, we delete the unverified user
      const { error } = await supabase.from("users").delete().eq("id", citizenId);

      if (error) throw error;
      setCitizens((prev) => prev.filter((c) => c.id !== citizenId));
      setShowDetailsModal(false);
      setSelectedCitizen(null);
      showToast(lang === "sw" ? "Uhakiki umekataliwa." : "Verification declined.", "info");
    } catch (error: unknown) {
      const _e = error as { message?: string };
      showToast(_e.message ?? "An error occurred", "error");
    }
  };

  const handleCitizenClick = async (citizen: UserProfile) => {
    // Show modal immediately with list data, then refresh with full DB record
    setSelectedCitizen(citizen);
    setEditFormData({
      first_name: citizen.first_name || "",
      middle_name: citizen.middle_name || "",
      last_name: citizen.last_name || "",
      phone: citizen.phone || "",
      region: citizen.region || "",
      district: citizen.district || "",
    });
    setEditingInfo(false);
    setShowDetailsModal(true);

    // Re-fetch full profile to ensure all signup fields are present
    try {
      const { data, error } = await supabase
        .from("users")
        .select("id, first_name, middle_name, last_name, email, phone, nida_number, citizen_id, region, district, ward, street, is_verified, account_status, role, created_at, sex, occupation, date_of_birth, place_of_birth, nationality, photo_url")
        .eq("id", citizen.id)
        .maybeSingle();
      if (!error && data) {
        setSelectedCitizen(data as UserProfile);
        setEditFormData({
          first_name: data.first_name || "",
          middle_name: data.middle_name || "",
          last_name: data.last_name || "",
          phone: data.phone || "",
          region: data.region || "",
          district: data.district || "",
        });
      }
    } catch (_err) {
      console.error("Error fetching full citizen profile:", _err);
    }
  };

  const handleUpdateInfo = async () => {
    if (!selectedCitizen) return;

    setUpdating(true);
    try {
      const isConfigured = IS_SUPABASE_CONFIGURED;

      if (!isConfigured) {
        // Demo mode - update localStorage
        const demoCitizens = JSON.parse(localStorage.getItem("demo_citizens") || "[]");
        const updated = demoCitizens.map((c: import("@/lib/supabase").UserProfile) =>
          c.id === selectedCitizen.id ? { ...c, ...editFormData } : c,
        );
        localStorage.setItem("demo_citizens", JSON.stringify(updated));
        setCitizens((prev) =>
          prev.map((c) => (c.id === selectedCitizen.id ? { ...c, ...editFormData } : c)),
        );
        setSelectedCitizen({ ...selectedCitizen, ...editFormData });
        setEditingInfo(false);
        showToast(lang === "sw" ? "Taarifa zimesasishwa" : "Information updated", "success");
        return;
      }

      const { error } = await supabase
        .from("users")
        .update({
          first_name: editFormData.first_name,
          middle_name: editFormData.middle_name,
          last_name: editFormData.last_name,
          phone: editFormData.phone,
          region: editFormData.region,
          district: editFormData.district,
        })
        .eq("id", selectedCitizen.id);

      if (error) throw error;

      setCitizens((prev) =>
        prev.map((c) => (c.id === selectedCitizen.id ? { ...c, ...editFormData } : c)),
      );
      setSelectedCitizen({ ...selectedCitizen, ...editFormData });
      setEditingInfo(false);
      showToast(
        lang === "sw" ? "Taarifa zimesasishwa" : "Information updated successfully",
        "success",
      );
    } catch (err: unknown) {
      const _e = err as { message?: string };
      showToast(_e.message ?? "An error occurred", "error");
    } finally {
      setUpdating(false);
    }
  };

  const handleDeleteCitizen = async (citizenId: string) => {
    if (
      !confirm(
        lang === "sw"
          ? "Je, una uhakika unataka kumfuta mwananchi huyu?"
          : "Are you sure you want to delete this citizen?",
      )
    )
      return;

    try {
      const isConfigured = IS_SUPABASE_CONFIGURED;

      if (!isConfigured) {
        const demoCitizens = JSON.parse(localStorage.getItem("demo_citizens") || "[]");
        const updated = demoCitizens.filter(
          (c: import("@/lib/supabase").UserProfile) => c.id !== citizenId,
        );
        localStorage.setItem("demo_citizens", JSON.stringify(updated));
        setCitizens((prev) => prev.filter((c) => c.id !== citizenId));
        setShowDetailsModal(false);
        setSelectedCitizen(null);
        showToast(lang === "sw" ? "Mwananchi amefutwa" : "Citizen deleted", "success");
        return;
      }

      const { error } = await supabase.from("users").delete().eq("id", citizenId);

      if (error) throw error;

      setCitizens((prev) => prev.filter((c) => c.id !== citizenId));
      setShowDetailsModal(false);
      setSelectedCitizen(null);
      showToast(lang === "sw" ? "Mwananchi amefutwa" : "Citizen deleted", "success");
    } catch (err: unknown) {
      const _e = err as { message?: string };
      showToast(_e.message ?? "An error occurred", "error");
    }
  };

  const filteredCitizens = citizens.filter((c) => {
    const q = searchQuery.toLowerCase();
    const matchesSearch =
      c.first_name.toLowerCase().includes(q) ||
      c.last_name.toLowerCase().includes(q) ||
      c.email.toLowerCase().includes(q) ||
      c.nida_number?.includes(searchQuery) ||
      c.phone?.includes(searchQuery) ||
      c.citizen_id?.toLowerCase().includes(q) ||
      c.seller_id?.toLowerCase().includes(q) ||
      c.landlord_id?.toLowerCase().includes(q);

    const matchesFilter =
      filter === "all" ||
      (filter === "verified" && c.is_verified) ||
      (filter === "unverified" && !c.is_verified) ||
      (filter === "sellers" && !!c.seller_id) ||
      (filter === "landlords" && !!c.landlord_id) ||
      (filter === "brokers" && !!c.broker_id);

    const matchesRegion = !regionFilter || c.region === regionFilter;
    const matchesDistrict = !districtFilter || c.district === districtFilter;

    return matchesSearch && matchesFilter && matchesRegion && matchesDistrict;
  });

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-4 sm:space-y-8"
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-3xl font-black text-stone-900 tracking-tight">
            {lang === "sw" ? "Usimamizi wa Wananchi" : "Citizen Management"}
          </h1>
          <p className="text-stone-500 font-medium">
            {lang === "sw"
              ? `Wananchi ${filteredCitizens.length} kati ya ${citizens.length}`
              : "View and manage all registered citizens"}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={fetchCitizens}
            disabled={loading}
            title={lang === "sw" ? "Onesha upya" : "Refresh"}
            aria-label={lang === "sw" ? "Onesha upya orodha" : "Refresh list"}
            className="h-12 w-12 bg-white border border-stone-200 rounded-xl flex items-center justify-center hover:bg-stone-50 transition-all"
          >
            <RefreshCw size={18} className={cn("text-stone-500", loading && "animate-spin")} />
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
          <select
            value={filter}
            onChange={(e) =>
              setFilter(
                e.target.value as
                  | "all"
                  | "verified"
                  | "unverified"
                  | "sellers"
                  | "landlords"
                  | "brokers",
              )
            }
            aria-label={lang === "sw" ? "Chuja kwa hali" : "Filter by verification status"}
            title={lang === "sw" ? "Chuja kwa hali" : "Filter by verification status"}
            className="h-12 px-4 bg-white border border-stone-200 rounded-xl focus:ring-2 focus:ring-emerald-500 transition-all font-medium"
          >
            <option value="all">{lang === "sw" ? "Wote" : "All"}</option>
            <option value="verified">{lang === "sw" ? "Waliothibitishwa" : "Verified"}</option>
            <option value="unverified">{lang === "sw" ? "Wasiohakikiwa" : "Unverified"}</option>
            <option value="sellers">{lang === "sw" ? "🏪 Wauzaji" : "🏪 Sellers"}</option>
            <option value="landlords">{lang === "sw" ? "🔑 Wapangishaji" : "🔑 Landlords"}</option>
            <option value="brokers">{lang === "sw" ? "👥 Madalali" : "👥 Brokers"}</option>
          </select>
          <select
            value={regionFilter}
            onChange={(e) => {
              setRegionFilter(e.target.value);
              setDistrictFilter("");
            }}
            className="h-12 px-4 bg-white border border-stone-200 rounded-xl focus:ring-2 focus:ring-emerald-500 transition-all font-medium"
          >
            <option value="">{lang === "sw" ? "Mkoa Wote" : "All Regions"}</option>
            {regions.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
          {regionFilter && (
            <select
              value={districtFilter}
              onChange={(e) => setDistrictFilter(e.target.value)}
              className="h-12 px-4 bg-white border border-stone-200 rounded-xl focus:ring-2 focus:ring-emerald-500 transition-all font-medium"
            >
              <option value="">{lang === "sw" ? "Wilaya Zote" : "All Districts"}</option>
              {getDistrictsForRegion(regionFilter).map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
          )}
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
          <Edit2 size={16} className="inline mr-2" />
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
                        <Edit2 size={20} className="text-amber-600" />
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
                    <tr
                      key={citizen.id}
                      onClick={() => handleCitizenClick(citizen)}
                      className="hover:bg-stone-50/50 transition-colors group cursor-pointer"
                    >
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
                            <p className="text-xs text-emerald-600 font-bold">
                              CT ID: {citizen.citizen_id || "N/A"}
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
                        <div className="space-y-1.5">
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
                          <div className="flex flex-wrap gap-1">
                            {citizen.seller_id && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[9px] font-black bg-gradient-to-r from-blue-500 to-indigo-600 text-white shadow-sm">
                                🏪 {lang === "sw" ? "Muuzaji" : "Seller"}
                              </span>
                            )}
                            {citizen.landlord_id && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[9px] font-black bg-gradient-to-r from-emerald-500 to-teal-600 text-white shadow-sm">
                                🔑 {lang === "sw" ? "Mpangishaji" : "Landlord"}
                              </span>
                            )}
                            {citizen.broker_id && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[9px] font-black bg-gradient-to-r from-purple-500 to-fuchsia-600 text-white shadow-sm">
                                👥 {lang === "sw" ? "Dalali" : "Broker"}
                              </span>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {!citizen.is_verified && (
                            <>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleVerify(citizen.id);
                                }}
                                className="p-2 hover:bg-emerald-50 rounded-lg transition-colors text-emerald-600"
                                title={lang === "sw" ? "Thibitisha" : "Verify"}
                                aria-label={
                                  lang === "sw" ? "Thibitisha mwananchi" : "Verify citizen"
                                }
                              >
                                <Check size={18} />
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDecline(citizen.id);
                                }}
                                className="p-2 hover:bg-red-50 rounded-lg transition-colors text-red-600"
                                title={lang === "sw" ? "Kataa" : "Decline"}
                                aria-label={
                                  lang === "sw" ? "Kataa uhakiki" : "Decline verification"
                                }
                              >
                                <XCircle size={18} />
                              </button>
                            </>
                          )}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleCitizenClick(citizen);
                            }}
                            className="p-2 hover:bg-stone-100 rounded-lg transition-colors text-stone-400"
                            title={lang === "sw" ? "Tazama zaidi" : "View details"}
                            aria-label={lang === "sw" ? "Tazama zaidi" : "View details"}
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

      {/* Citizen Details Modal */}
      <AnimatePresence>
        {showDetailsModal && selectedCitizen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl overflow-hidden max-h-[90vh] overflow-y-auto"
            >
              {/* Header */}
              <div className="px-8 py-6 border-b border-stone-100 flex items-center justify-between bg-linear-to-r from-emerald-50 to-blue-50">
                <div className="flex items-center gap-4">
                  {selectedCitizen.photo_url ? (
                    <img
                      src={selectedCitizen.photo_url}
                      alt="profile"
                      className="h-16 w-16 rounded-full object-cover border-2 border-white shadow-lg"
                    />
                  ) : (
                    <div className="h-16 w-16 rounded-full bg-gradient-to-br from-emerald-500 to-blue-600 flex items-center justify-center text-white text-xl font-bold shadow-lg">
                      {selectedCitizen.first_name?.[0] || "C"}
                      {selectedCitizen.last_name?.[0] || "Z"}
                    </div>
                  )}
                  <div>
                    <h3 className="text-xl font-heading font-extrabold text-stone-900">
                      {selectedCitizen.first_name} {selectedCitizen.middle_name}{" "}
                      {selectedCitizen.last_name}
                    </h3>
                    <p className="text-sm text-stone-500">{selectedCitizen.email}</p>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setShowDetailsModal(false);
                    setSelectedCitizen(null);
                    setEditingInfo(false);
                  }}
                  title={lang === "sw" ? "Funga" : "Close"}
                  aria-label={lang === "sw" ? "Funga modal" : "Close modal"}
                  className="p-2 hover:bg-white/80 rounded-full transition-colors"
                >
                  <X className="h-5 w-5 text-stone-500" />
                </button>
              </div>

              {/* Content */}
              <div className="p-8 space-y-6">
                {/* ── Row 1: CT ID & NIDA ── */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-100">
                    <div className="flex items-center gap-2 text-emerald-600 mb-1">
                      <CreditCard size={16} />
                      <span className="text-xs font-bold uppercase tracking-wider">CT ID</span>
                    </div>
                    <p className="font-bold text-emerald-800 text-lg font-mono">
                      {selectedCitizen.citizen_id ||
                        (lang === "sw" ? "Haijatolewa" : "Not assigned")}
                    </p>
                  </div>
                  <div className="p-4 bg-amber-50 rounded-2xl border border-amber-100">
                    <div className="flex items-center gap-2 text-amber-600 mb-1">
                      <Fingerprint size={16} />
                      <span className="text-xs font-bold uppercase tracking-wider">NIDA</span>
                    </div>
                    <p className="font-bold text-amber-800 text-lg font-mono break-all">
                      {selectedCitizen.nida_number
                        ? selectedCitizen.nida_number
                            .replace(/-/g, "")
                            .match(/.{1,4}/g)
                            ?.join("-") || selectedCitizen.nida_number
                        : lang === "sw"
                          ? "Haijasajiliwa"
                          : "Not registered"}
                    </p>
                  </div>
                </div>

                {/* ── Section: Personal Information ── */}
                <div>
                  <p className="text-[10px] font-black text-stone-400 uppercase tracking-widest mb-3">
                    {lang === "sw" ? "Taarifa Binafsi" : "Personal Information"}
                  </p>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-3 bg-stone-50 rounded-xl">
                      <div className="flex items-center gap-1.5 text-stone-400 mb-0.5">
                        <User size={12} />
                        <span className="text-[10px] font-bold uppercase tracking-wider">
                          {lang === "sw" ? "Jinsia" : "Gender"}
                        </span>
                      </div>
                      <p className="font-bold text-stone-800 text-sm">
                        {selectedCitizen.gender === "M" ||
                        selectedCitizen.gender === "Me" ||
                        selectedCitizen.sex === "M"
                          ? lang === "sw"
                            ? "Mwanaume"
                            : "Male"
                          : selectedCitizen.gender === "F" ||
                              selectedCitizen.gender === "Ke" ||
                              selectedCitizen.sex === "F"
                            ? lang === "sw"
                              ? "Mwanamke"
                              : "Female"
                            : lang === "sw"
                              ? "Haijulikani"
                              : "Unknown"}
                      </p>
                    </div>

                    <div className="p-3 bg-stone-50 rounded-xl">
                      <div className="flex items-center gap-1.5 text-stone-400 mb-0.5">
                        <Calendar size={12} />
                        <span className="text-[10px] font-bold uppercase tracking-wider">
                          {lang === "sw" ? "Tarehe ya Kuzaliwa" : "Date of Birth"}
                        </span>
                      </div>
                      <p className="font-bold text-stone-800 text-sm">
                        {selectedCitizen.date_of_birth
                          ? new Date(selectedCitizen.date_of_birth).toLocaleDateString(
                              lang === "sw" ? "sw-TZ" : "en-US",
                            )
                          : lang === "sw"
                            ? "Haijatolewa"
                            : "Not provided"}
                      </p>
                    </div>

                    <div className="p-3 bg-stone-50 rounded-xl">
                      <div className="flex items-center gap-1.5 text-stone-400 mb-0.5">
                        <Globe size={12} />
                        <span className="text-[10px] font-bold uppercase tracking-wider">
                          {lang === "sw" ? "Uraia" : "Nationality"}
                        </span>
                      </div>
                      <p className="font-bold text-stone-800 text-sm">
                        {selectedCitizen.nationality || "Tanzanian"}
                      </p>
                    </div>

                    <div className="p-3 bg-stone-50 rounded-xl">
                      <div className="flex items-center gap-1.5 text-stone-400 mb-0.5">
                        <Heart size={12} />
                        <span className="text-[10px] font-bold uppercase tracking-wider">
                          {lang === "sw" ? "Hali ya Ndoa" : "Marital Status"}
                        </span>
                      </div>
                      <p className="font-bold text-stone-800 text-sm capitalize">
                        {selectedCitizen.marital_status
                          ? {
                              single: lang === "sw" ? "Sijaoa" : "Single",
                              married: lang === "sw" ? "Ameoa" : "Married",
                              divorced: lang === "sw" ? "Ameachika" : "Divorced",
                              widowed: lang === "sw" ? "Mjane" : "Widowed",
                            }[selectedCitizen.marital_status] || selectedCitizen.marital_status
                          : lang === "sw"
                            ? "Haijatolewa"
                            : "Not provided"}
                      </p>
                    </div>

                    <div className="p-3 bg-stone-50 rounded-xl">
                      <div className="flex items-center gap-1.5 text-stone-400 mb-0.5">
                        <Briefcase size={12} />
                        <span className="text-[10px] font-bold uppercase tracking-wider">
                          {lang === "sw" ? "Kazi" : "Occupation"}
                        </span>
                      </div>
                      <p className="font-bold text-stone-800 text-sm">
                        {selectedCitizen.occupation ||
                          (lang === "sw" ? "Haijatolewa" : "Not provided")}
                      </p>
                    </div>

                    <div className="p-3 bg-stone-50 rounded-xl">
                      <div className="flex items-center gap-1.5 text-stone-400 mb-0.5">
                        <BookOpen size={12} />
                        <span className="text-[10px] font-bold uppercase tracking-wider">
                          {lang === "sw" ? "Elimu" : "Education"}
                        </span>
                      </div>
                      <p className="font-bold text-stone-800 text-sm capitalize">
                        {selectedCitizen.education_level
                          ? {
                              none: lang === "sw" ? "Hakuna" : "None",
                              primary: lang === "sw" ? "Msingi" : "Primary",
                              secondary: lang === "sw" ? "Sekondari" : "Secondary",
                              diploma: "Diploma",
                              degree: lang === "sw" ? "Shahada" : "Degree",
                              masters: lang === "sw" ? "Uzamili" : "Masters",
                              phd: "PhD",
                            }[selectedCitizen.education_level] || selectedCitizen.education_level
                          : lang === "sw"
                            ? "Haijatolewa"
                            : "Not provided"}
                      </p>
                    </div>

                    {selectedCitizen.place_of_birth && (
                      <div className="p-3 bg-stone-50 rounded-xl">
                        <div className="flex items-center gap-1.5 text-stone-400 mb-0.5">
                          <Map size={12} />
                          <span className="text-[10px] font-bold uppercase tracking-wider">
                            {lang === "sw" ? "Mahali pa Kuzaliwa" : "Place of Birth"}
                          </span>
                        </div>
                        <p className="font-bold text-stone-800 text-sm">
                          {selectedCitizen.place_of_birth}
                        </p>
                      </div>
                    )}

                    <div className="p-3 bg-stone-50 rounded-xl">
                      <div className="flex items-center gap-1.5 text-stone-400 mb-0.5">
                        <BadgeCheck size={12} />
                        <span className="text-[10px] font-bold uppercase tracking-wider">
                          {lang === "sw" ? "Uhakiki" : "Verification"}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        {selectedCitizen.is_verified ? (
                          <>
                            <ShieldCheck size={14} className="text-emerald-500" />
                            <span className="font-bold text-emerald-600 text-sm">
                              {lang === "sw" ? "Imethibitishwa" : "Verified"}
                            </span>
                          </>
                        ) : (
                          <>
                            <ShieldAlert size={14} className="text-amber-500" />
                            <span className="font-bold text-amber-600 text-sm">
                              {lang === "sw" ? "Inasubiri" : "Pending"}
                            </span>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Business Roles */}
                    {(selectedCitizen.seller_id ||
                      selectedCitizen.landlord_id ||
                      selectedCitizen.broker_id) && (
                      <div className="p-3 bg-stone-50 rounded-xl">
                        <div className="flex items-center gap-1.5 text-stone-400 mb-1.5">
                          <Briefcase size={12} />
                          <span className="text-[10px] font-bold uppercase tracking-wider">
                            {lang === "sw" ? "Hadhi ya Biashara" : "Business Roles"}
                          </span>
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          {selectedCitizen.seller_id && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-black bg-gradient-to-r from-blue-500 to-indigo-600 text-white">
                              🏪 {lang === "sw" ? "Muuzaji" : "Seller"}:{" "}
                              <span className="font-mono text-blue-100">
                                {selectedCitizen.seller_id}
                              </span>
                            </span>
                          )}
                          {selectedCitizen.landlord_id && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-black bg-gradient-to-r from-emerald-500 to-teal-600 text-white">
                              🔑 {lang === "sw" ? "Mpangishaji" : "Landlord"}:{" "}
                              <span className="font-mono text-emerald-100">
                                {selectedCitizen.landlord_id}
                              </span>
                            </span>
                          )}
                          {selectedCitizen.broker_id && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-black bg-gradient-to-r from-purple-500 to-fuchsia-600 text-white">
                              👥 {lang === "sw" ? "Dalali" : "Broker"}:{" "}
                              <span className="font-mono text-purple-100">
                                {selectedCitizen.broker_id}
                              </span>
                            </span>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* ── Section: Contact ── */}
                <div>
                  <p className="text-[10px] font-black text-stone-400 uppercase tracking-widest mb-3">
                    {lang === "sw" ? "Mawasiliano" : "Contact"}
                  </p>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-3 bg-stone-50 rounded-xl">
                      <div className="flex items-center gap-1.5 text-stone-400 mb-0.5">
                        <Mail size={12} />
                        <span className="text-[10px] font-bold uppercase tracking-wider">
                          {lang === "sw" ? "Barua Pepe" : "Email"}
                        </span>
                      </div>
                      <p className="font-bold text-stone-800 text-sm break-all">
                        {selectedCitizen.email}
                      </p>
                    </div>
                    <div className="p-3 bg-stone-50 rounded-xl">
                      <div className="flex items-center gap-1.5 text-stone-400 mb-0.5">
                        <Phone size={12} />
                        <span className="text-[10px] font-bold uppercase tracking-wider">
                          {lang === "sw" ? "Simu" : "Phone"}
                        </span>
                      </div>
                      <p className="font-bold text-stone-800 text-sm">
                        {selectedCitizen.phone || (lang === "sw" ? "Haijatolewa" : "Not provided")}
                      </p>
                    </div>
                    {selectedCitizen.alternative_phone && (
                      <div className="p-3 bg-stone-50 rounded-xl">
                        <div className="flex items-center gap-1.5 text-stone-400 mb-0.5">
                          <Phone size={12} />
                          <span className="text-[10px] font-bold uppercase tracking-wider">
                            {lang === "sw" ? "Simu Mbadala" : "Alt. Phone"}
                          </span>
                        </div>
                        <p className="font-bold text-stone-800 text-sm">
                          {selectedCitizen.alternative_phone}
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                {/* ── Section: Identity Documents ── */}
                {(selectedCitizen.id_type || selectedCitizen.passport_number) && (
                  <div>
                    <p className="text-[10px] font-black text-stone-400 uppercase tracking-widest mb-3">
                      {lang === "sw" ? "Vitambulisho" : "Identity Documents"}
                    </p>
                    <div className="grid grid-cols-2 gap-3">
                      {selectedCitizen.id_type && (
                        <div className="p-3 bg-stone-50 rounded-xl">
                          <div className="flex items-center gap-1.5 text-stone-400 mb-0.5">
                            <CreditCard size={12} />
                            <span className="text-[10px] font-bold uppercase tracking-wider">
                              {lang === "sw" ? "Aina ya ID" : "ID Type"}
                            </span>
                          </div>
                          <p className="font-bold text-stone-800 text-sm capitalize">
                            {{
                              birth_certificate:
                                lang === "sw" ? "Cheti cha Kuzaliwa" : "Birth Certificate",
                              voter_id: lang === "sw" ? "Kadi ya Mpiga Kura" : "Voter ID",
                              driving_license:
                                lang === "sw" ? "Leseni ya Udereva" : "Driving License",
                              zanzibar_id: lang === "sw" ? "ID ya Zanzibar" : "Zanzibar ID",
                              student_id: lang === "sw" ? "ID ya Mwanafunzi" : "Student ID",
                              employer_id: lang === "sw" ? "ID ya Kazi" : "Employer ID",
                            }[selectedCitizen.id_type] || selectedCitizen.id_type}
                          </p>
                        </div>
                      )}
                      {selectedCitizen.id_number && (
                        <div className="p-3 bg-stone-50 rounded-xl">
                          <div className="flex items-center gap-1.5 text-stone-400 mb-0.5">
                            <Hash size={12} />
                            <span className="text-[10px] font-bold uppercase tracking-wider">
                              {lang === "sw" ? "Namba ya ID" : "ID Number"}
                            </span>
                          </div>
                          <p className="font-bold text-stone-800 text-sm font-mono">
                            {selectedCitizen.id_number}
                          </p>
                        </div>
                      )}
                      {selectedCitizen.passport_number && (
                        <div className="p-3 bg-stone-50 rounded-xl">
                          <div className="flex items-center gap-1.5 text-stone-400 mb-0.5">
                            <Flag size={12} />
                            <span className="text-[10px] font-bold uppercase tracking-wider">
                              {lang === "sw" ? "Pasipoti" : "Passport"}
                            </span>
                          </div>
                          <p className="font-bold text-stone-800 text-sm font-mono">
                            {selectedCitizen.passport_number}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* ── Section: Location (editable) ── */}
                <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-100">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2 text-emerald-600">
                      <MapPin size={16} />
                      <span className="text-xs font-bold uppercase tracking-wider">
                        {lang === "sw" ? "Anwani" : "Address"}
                      </span>
                    </div>
                    {!editingInfo && (
                      <button
                        onClick={() => setEditingInfo(true)}
                        title={lang === "sw" ? "Hariri" : "Edit"}
                        aria-label={lang === "sw" ? "Hariri taarifa" : "Edit information"}
                        className="p-1.5 hover:bg-emerald-100 rounded-lg text-emerald-500 transition-colors"
                      >
                        <Edit2 size={14} />
                      </button>
                    )}
                  </div>

                  {editingInfo ? (
                    <div className="space-y-4">
                      <div className="grid grid-cols-3 gap-3">
                        <input
                          type="text"
                          placeholder={lang === "sw" ? "Jina la kwanza" : "First name"}
                          value={editFormData.first_name}
                          onChange={(e) =>
                            setEditFormData({ ...editFormData, first_name: e.target.value })
                          }
                          className="h-10 px-3 rounded-lg border border-emerald-200 focus:border-emerald-500 outline-none bg-white text-sm"
                        />
                        <input
                          type="text"
                          placeholder={lang === "sw" ? "Jina la kati" : "Middle name"}
                          value={editFormData.middle_name}
                          onChange={(e) =>
                            setEditFormData({ ...editFormData, middle_name: e.target.value })
                          }
                          className="h-10 px-3 rounded-lg border border-emerald-200 focus:border-emerald-500 outline-none bg-white text-sm"
                        />
                        <input
                          type="text"
                          placeholder={lang === "sw" ? "Jina la mwisho" : "Last name"}
                          value={editFormData.last_name}
                          onChange={(e) =>
                            setEditFormData({ ...editFormData, last_name: e.target.value })
                          }
                          className="h-10 px-3 rounded-lg border border-emerald-200 focus:border-emerald-500 outline-none bg-white text-sm"
                        />
                      </div>
                      <input
                        type="tel"
                        placeholder={lang === "sw" ? "Simu" : "Phone"}
                        value={editFormData.phone}
                        onChange={(e) =>
                          setEditFormData({ ...editFormData, phone: e.target.value })
                        }
                        className="w-full h-10 px-3 rounded-lg border border-emerald-200 focus:border-emerald-500 outline-none bg-white text-sm"
                      />
                      <div className="grid grid-cols-2 gap-3">
                        <select
                          title={lang === "sw" ? "Mkoa" : "Region"}
                          aria-label={lang === "sw" ? "Chagua mkoa" : "Select region"}
                          value={editFormData.region}
                          onChange={(e) =>
                            setEditFormData({
                              ...editFormData,
                              region: e.target.value,
                              district: "",
                            })
                          }
                          className="h-10 px-3 rounded-lg border border-emerald-200 focus:border-emerald-500 outline-none bg-white text-sm"
                        >
                          <option value="">{lang === "sw" ? "-- Mkoa --" : "-- Region --"}</option>
                          {regions.map((r) => (
                            <option key={r} value={r}>
                              {r}
                            </option>
                          ))}
                        </select>
                        <select
                          title={lang === "sw" ? "Wilaya" : "District"}
                          aria-label={lang === "sw" ? "Chagua wilaya" : "Select district"}
                          value={editFormData.district}
                          onChange={(e) =>
                            setEditFormData({ ...editFormData, district: e.target.value })
                          }
                          disabled={!editFormData.region}
                          className="h-10 px-3 rounded-lg border border-emerald-200 focus:border-emerald-500 outline-none bg-white text-sm disabled:opacity-50"
                        >
                          <option value="">
                            {lang === "sw" ? "-- Wilaya --" : "-- District --"}
                          </option>
                          {editFormData.region &&
                            getDistrictsForRegion(editFormData.region).map((d) => (
                              <option key={d} value={d}>
                                {d}
                              </option>
                            ))}
                        </select>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => setEditingInfo(false)}
                          className="flex-1 h-10 bg-stone-100 text-stone-600 rounded-xl font-bold hover:bg-stone-200 transition-all text-sm"
                        >
                          {lang === "sw" ? "Ghairi" : "Cancel"}
                        </button>
                        <button
                          onClick={handleUpdateInfo}
                          disabled={updating}
                          className="flex-1 h-10 bg-emerald-600 text-white rounded-xl font-bold hover:bg-emerald-700 transition-all text-sm flex items-center justify-center gap-2"
                        >
                          {updating ? (
                            <Loader2 size={14} className="animate-spin" />
                          ) : (
                            <Check size={14} />
                          )}
                          {lang === "sw" ? "Hifadhi" : "Save"}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <p className="text-[10px] text-emerald-600 font-bold uppercase tracking-wider mb-0.5">
                          {lang === "sw" ? "Mkoa" : "Region"}
                        </p>
                        <p className="font-bold text-emerald-900 text-sm">
                          {selectedCitizen.region || "—"}
                        </p>
                      </div>
                      <div>
                        <p className="text-[10px] text-emerald-600 font-bold uppercase tracking-wider mb-0.5">
                          {lang === "sw" ? "Wilaya" : "District"}
                        </p>
                        <p className="font-bold text-emerald-900 text-sm">
                          {selectedCitizen.district || "—"}
                        </p>
                      </div>
                      <div>
                        <p className="text-[10px] text-emerald-600 font-bold uppercase tracking-wider mb-0.5">
                          {lang === "sw" ? "Kata" : "Ward"}
                        </p>
                        <p className="font-bold text-emerald-900 text-sm">
                          {selectedCitizen.ward || "—"}
                        </p>
                      </div>
                      <div>
                        <p className="text-[10px] text-emerald-600 font-bold uppercase tracking-wider mb-0.5">
                          {lang === "sw" ? "Mtaa" : "Street"}
                        </p>
                        <p className="font-bold text-emerald-900 text-sm">
                          {selectedCitizen.street || "—"}
                        </p>
                      </div>
                    </div>
                  )}
                </div>

                {/* ── Emergency Contact ── */}
                {(selectedCitizen.emergency_contact_name ||
                  selectedCitizen.emergency_contact_phone) && (
                  <div>
                    <p className="text-[10px] font-black text-stone-400 uppercase tracking-widest mb-3">
                      {lang === "sw" ? "Mawasiliano ya Dharura" : "Emergency Contact"}
                    </p>
                    <div className="grid grid-cols-2 gap-3">
                      {selectedCitizen.emergency_contact_name && (
                        <div className="p-3 bg-stone-50 rounded-xl">
                          <div className="flex items-center gap-1.5 text-stone-400 mb-0.5">
                            <User size={12} />
                            <span className="text-[10px] font-bold uppercase tracking-wider">
                              {lang === "sw" ? "Jina" : "Name"}
                            </span>
                          </div>
                          <p className="font-bold text-stone-800 text-sm">
                            {selectedCitizen.emergency_contact_name}
                          </p>
                        </div>
                      )}
                      {selectedCitizen.emergency_contact_phone && (
                        <div className="p-3 bg-stone-50 rounded-xl">
                          <div className="flex items-center gap-1.5 text-stone-400 mb-0.5">
                            <Phone size={12} />
                            <span className="text-[10px] font-bold uppercase tracking-wider">
                              {lang === "sw" ? "Simu" : "Phone"}
                            </span>
                          </div>
                          <p className="font-bold text-stone-800 text-sm">
                            {selectedCitizen.emergency_contact_phone}
                          </p>
                        </div>
                      )}
                      {selectedCitizen.emergency_contact_relation && (
                        <div className="p-3 bg-stone-50 rounded-xl">
                          <div className="flex items-center gap-1.5 text-stone-400 mb-0.5">
                            <Users size={12} />
                            <span className="text-[10px] font-bold uppercase tracking-wider">
                              {lang === "sw" ? "Uhusiano" : "Relation"}
                            </span>
                          </div>
                          <p className="font-bold text-stone-800 text-sm">
                            {selectedCitizen.emergency_contact_relation}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* ── Quick Actions (unverified only) ── */}
                {!selectedCitizen.is_verified && (
                  <div className="p-4 bg-blue-50 rounded-2xl border border-blue-100">
                    <p className="text-xs font-bold text-blue-600 uppercase tracking-wider mb-3">
                      {lang === "sw" ? "Hatua za Haraka" : "Quick Actions"}
                    </p>
                    <div className="flex gap-3">
                      <button
                        onClick={() => {
                          handleVerify(selectedCitizen.id);
                          setSelectedCitizen({ ...selectedCitizen, is_verified: true });
                        }}
                        className="flex-1 h-10 bg-emerald-600 text-white rounded-xl font-bold hover:bg-emerald-700 transition-all text-sm flex items-center justify-center gap-2"
                      >
                        <ShieldCheck size={16} />
                        {lang === "sw" ? "Thibitisha" : "Verify"}
                      </button>
                      <button
                        onClick={() => handleDecline(selectedCitizen.id)}
                        className="flex-1 h-10 bg-red-50 text-red-600 rounded-xl font-bold hover:bg-red-100 transition-all text-sm flex items-center justify-center gap-2"
                      >
                        <XCircle size={16} />
                        {lang === "sw" ? "Kataa" : "Decline"}
                      </button>
                    </div>
                  </div>
                )}

                {/* ── Actions ── */}
                <div className="flex gap-3 pt-4 border-t border-stone-100">
                  <button
                    onClick={() => {
                      setShowDetailsModal(false);
                      setSelectedCitizen(null);
                    }}
                    className="flex-1 h-12 bg-stone-100 text-stone-600 rounded-2xl font-bold hover:bg-stone-200 transition-all"
                  >
                    {lang === "sw" ? "Funga" : "Close"}
                  </button>
                  <button
                    onClick={() => handleDeleteCitizen(selectedCitizen.id)}
                    className="h-12 px-6 bg-red-50 text-red-600 rounded-2xl font-bold hover:bg-red-100 transition-all flex items-center gap-2"
                  >
                    <Trash2 size={18} />
                    {lang === "sw" ? "Futa" : "Delete"}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
