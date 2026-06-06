import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Building2,
  Store,
  Home,
  Users,
  FileText,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Clock,
  X,
  Search,
  Filter,
  Eye,
  XCircle,
  CheckCircle,
  ChevronDown,
  Calendar,
  MapPin,
  Phone,
  Mail,
  Briefcase,
  Award,
  ExternalLink,
  RefreshCw,
  Download,
  User,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { ApplicationChat } from "@/components/ApplicationChat";
import { useAuth } from "@/context/AuthContext";
import { useLanguage } from "@/context/LanguageContext";
import { useToast } from "@/context/ToastContext";

// Business type definitions
type BusinessType = "seller" | "landlord" | "broker";
type RegistrationStatus = "pending" | "approved" | "rejected" | "suspended";

interface BusinessRegistration {
  id: string;
  user_id: string;
  business_type: BusinessType;
  business_id: string | null;
  business_name: string;
  description: string;
  experience_years: number;
  specialization: string;
  region: string;
  district: string;
  ward: string;
  street: string;
  phone: string;
  alt_phone: string | null;
  email: string;
  id_document_url: string | null;
  proof_document_url: string | null;
  photo_url: string | null;
  status: RegistrationStatus;
  rejection_reason: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  approved_at: string | null;
  created_at: string;
  updated_at: string;
  // Joined user data
  user?: {
    first_name: string;
    middle_name: string | null;
    last_name: string;
    citizen_id: string;
    nida_number: string | null;
    photo_url: string | null;
  };
}

const BUSINESS_TYPES: {
  value: BusinessType;
  labelSw: string;
  labelEn: string;
  icon: React.ElementType;
  color: string;
}[] = [
  {
    value: "seller",
    labelSw: "Muuzaji",
    labelEn: "Seller",
    icon: Store,
    color: "from-blue-500 to-blue-600",
  },
  {
    value: "landlord",
    labelSw: "Mpangishaji",
    labelEn: "Landlord",
    icon: Home,
    color: "from-emerald-500 to-emerald-600",
  },
  {
    value: "broker",
    labelSw: "Dalali",
    labelEn: "Broker",
    icon: Users,
    color: "from-purple-500 to-purple-600",
  },
];

const SPECIALIZATIONS_LABELS: { [key: string]: { sw: string; en: string } } = {
  property: { sw: "Mali Isiyohamishika", en: "Real Estate" },
  vehicles: { sw: "Magari", en: "Vehicles" },
  land: { sw: "Ardhi/Viwanja", en: "Land/Plots" },
  general: { sw: "Bidhaa Mchanganyiko", en: "General Goods" },
  residential: { sw: "Nyumba za Kuishi", en: "Residential Houses" },
  rooms: { sw: "Vyumba", en: "Rooms" },
  commercial: { sw: "Maduka/Ofisi", en: "Shops/Offices" },
  warehouse: { sw: "Maghala", en: "Warehouses" },
  land_rent: { sw: "Ardhi ya Kukodisha", en: "Land for Rent" },
  property_broker: { sw: "Mali Isiyohamishika", en: "Real Estate" },
  vehicle_broker: { sw: "Magari", en: "Vehicles" },
  land_broker: { sw: "Ardhi", en: "Land" },
  general_broker: { sw: "Dalali wa Jumla", en: "General Broker" },
};

type StaffTab = "registrations" | "agreements" | "applications";

interface AgreementRow {
  id: string;
  application_number: string | null;
  service_name: string | null;
  status: string | null;
  agreement_status: string | null;
  user_id: string | null;
  second_party_user_id: string | null;
  created_at: string;
  user?: { first_name: string; last_name: string; citizen_id: string } | null;
  second_party?: { first_name: string; last_name: string; citizen_id: string } | null;
}

interface AppRow {
  id: string;
  application_number: string | null;
  service_name: string | null;
  status: string | null;
  user_id: string | null;
  created_at: string;
  district: string | null;
  region: string | null;
  user?: { first_name: string; last_name: string; citizen_id: string } | null;
}

export const BusinessApproval: React.FC = () => {
  const { user } = useAuth();
  const { lang } = useLanguage();
  const { showToast } = useToast();

  // Tab state
  const [activeTab, setActiveTab] = useState<StaffTab>("registrations");

  // Agreements state
  const [agreements, setAgreements] = useState<AgreementRow[]>([]);
  const [loadingAgreements, setLoadingAgreements] = useState(false);
  const [selectedAgreement, setSelectedAgreement] = useState<AgreementRow | null>(null);
  const [agrSearchQuery, setAgrSearchQuery] = useState("");

  // All applications state
  const [allApps, setAllApps] = useState<AppRow[]>([]);
  const [loadingApps, setLoadingApps] = useState(false);
  const [appSearchQuery, setAppSearchQuery] = useState("");
  const [appStatusFilter, setAppStatusFilter] = useState("all");

  const [registrations, setRegistrations] = useState<BusinessRegistration[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRegistration, setSelectedRegistration] = useState<BusinessRegistration | null>(
    null,
  );
  const [processing, setProcessing] = useState(false);
  const [rejectionReason, setRejectionReason] = useState("");
  const [showRejectModal, setShowRejectModal] = useState(false);

  // Filters
  const [statusFilter, setStatusFilter] = useState<RegistrationStatus | "all">("pending");
  const [typeFilter, setTypeFilter] = useState<BusinessType | "all">("all");
  const [searchQuery, setSearchQuery] = useState("");

  // Stats
  const [stats, setStats] = useState({
    pending: 0,
    approved: 0,
    rejected: 0,
    suspended: 0,
    total: 0,
  });

  useEffect(() => {
    if (activeTab === "registrations") fetchRegistrations();
    if (activeTab === "agreements") fetchAgreements();
    if (activeTab === "applications") fetchAllApps();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, statusFilter, typeFilter, appStatusFilter]);

  const fetchRegistrations = async () => {
    setLoading(true);
    try {
      // business_registrations.user_id references auth.users — join via public.users separately
      let query = supabase
        .from("business_registrations")
        .select("*")
        .order("created_at", { ascending: false });

      if (statusFilter !== "all") {
        query = query.eq("status", statusFilter);
      }
      if (typeFilter !== "all") {
        query = query.eq("business_type", typeFilter);
      }

      const { data, error } = await query;

      if (error) throw error;

      // Enrich with user profile from public.users (since business_registrations FK points to auth.users)
      const enriched = await Promise.all(
        (data || []).map(async (reg) => {
          if (!reg.user_id) return reg;
          const { data: userProfile } = await supabase
            .from("users")
            .select("first_name, middle_name, last_name, citizen_id, nida_number, photo_url")
            .eq("id", reg.user_id)
            .maybeSingle();
          return { ...reg, user: userProfile ?? null };
        }),
      );

      setRegistrations(enriched);

      // Calculate stats
      const allRegs = data || [];
      setStats({
        pending: allRegs.filter((r) => r.status === "pending").length,
        approved: allRegs.filter((r) => r.status === "approved").length,
        rejected: allRegs.filter((r) => r.status === "rejected").length,
        suspended: allRegs.filter((r) => r.status === "suspended").length,
        total: allRegs.length,
      });
    } catch (error) {
      console.error("Error fetching registrations:", error);
      showToast(lang === "sw" ? "Hitilafu katika kupakia data" : "Error loading data", "error");
    } finally {
      setLoading(false);
    }
  };

  // Fetch all agreement applications
  const fetchAgreements = async () => {
    setLoadingAgreements(true);
    try {
      const { data, error } = await supabase
        .from("applications")
        .select(
          "id, application_number, service_name, status, agreement_status, user_id, second_party_user_id, created_at",
        )
        .ilike("service_name", "%Makubaliano%")
        .order("created_at", { ascending: false });
      if (error) throw error;
      const enriched = await Promise.all(
        (data || []).map(async (row) => {
          const [{ data: u }, { data: sp }] = await Promise.all([
            supabase
              .from("users")
              .select("first_name, last_name, citizen_id")
              .eq("id", row.user_id)
              .maybeSingle(),
            row.second_party_user_id
              ? supabase
                  .from("users")
                  .select("first_name, last_name, citizen_id")
                  .eq("id", row.second_party_user_id)
                  .maybeSingle()
              : Promise.resolve({ data: null }),
          ]);
          return { ...row, user: u ?? null, second_party: sp ?? null };
        }),
      );
      setAgreements(enriched as AgreementRow[]);
    } catch (err) {
      console.error("fetch agreements", err);
    } finally {
      setLoadingAgreements(false);
    }
  };

  // Fetch all service applications
  const fetchAllApps = async () => {
    setLoadingApps(true);
    try {
      let query = supabase
        .from("applications")
        .select(
          "id, application_number, service_name, status, user_id, created_at, district, region",
        )
        .not("service_name", "ilike", "%Makubaliano%")
        .order("created_at", { ascending: false });
      if (appStatusFilter !== "all") query = query.eq("status", appStatusFilter);
      const { data, error } = await query;
      if (error) throw error;
      const enriched = await Promise.all(
        (data || []).map(async (row) => {
          const { data: u } = await supabase
            .from("users")
            .select("first_name, last_name, citizen_id")
            .eq("id", row.user_id)
            .maybeSingle();
          return { ...row, user: u ?? null };
        }),
      );
      setAllApps(enriched as AppRow[]);
    } catch (err) {
      console.error("fetch all apps", err);
    } finally {
      setLoadingApps(false);
    }
  };

  // Generate business ID
  const generateBusinessId = async (businessType: BusinessType): Promise<string> => {
    const prefix = businessType === "seller" ? "SL" : businessType === "landlord" ? "LL" : "BR";
    const year = new Date().getFullYear();
    const letter = String.fromCharCode(65 + Math.floor(Math.random() * 26));

    // Get count for sequence
    const { count } = await supabase
      .from("business_registrations")
      .select("*", { count: "exact", head: true })
      .eq("business_type", businessType)
      .not("business_id", "is", null);

    const seq = ((count || 0) + 1).toString().padStart(5, "0");
    return `${prefix}${year}${letter}${seq}`;
  };

  // Approve registration
  const handleApprove = async () => {
    if (!selectedRegistration || !user) return;

    setProcessing(true);
    try {
      // Generate business ID
      const businessId = await generateBusinessId(selectedRegistration.business_type);

      // Update registration
      const { error: regError } = await supabase
        .from("business_registrations")
        .update({
          status: "approved",
          business_id: businessId,
          reviewed_by: user.id,
          reviewed_at: new Date().toISOString(),
          approved_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("id", selectedRegistration.id);

      if (regError) throw regError;

      // Update user's business ID
      const updateField =
        selectedRegistration.business_type === "seller"
          ? "seller_id"
          : selectedRegistration.business_type === "landlord"
            ? "landlord_id"
            : "broker_id";

      const { error: userError } = await supabase
        .from("users")
        .update({ [updateField]: businessId })
        .eq("id", selectedRegistration.user_id);

      if (userError) throw userError;

      showToast(
        lang === "sw"
          ? `Usajili umeidhinishwa! ID: ${businessId}`
          : `Registration approved! ID: ${businessId}`,
        "success",
      );

      setSelectedRegistration(null);
      fetchRegistrations();
    } catch (error) {
      console.error("Approval error:", error);
      showToast(
        lang === "sw" ? "Hitilafu katika kuidhinisha" : "Error approving registration",
        "error",
      );
    } finally {
      setProcessing(false);
    }
  };

  // Reject registration
  const handleReject = async () => {
    if (!selectedRegistration || !user || !rejectionReason.trim()) return;

    setProcessing(true);
    try {
      const { error } = await supabase
        .from("business_registrations")
        .update({
          status: "rejected",
          rejection_reason: rejectionReason,
          reviewed_by: user.id,
          reviewed_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("id", selectedRegistration.id);

      if (error) throw error;

      showToast(lang === "sw" ? "Usajili umekataliwa" : "Registration rejected", "success");

      setShowRejectModal(false);
      setRejectionReason("");
      setSelectedRegistration(null);
      fetchRegistrations();
    } catch (error) {
      console.error("Rejection error:", error);
      showToast(
        lang === "sw" ? "Hitilafu katika kukataa" : "Error rejecting registration",
        "error",
      );
    } finally {
      setProcessing(false);
    }
  };

  // Status badge
  const getStatusBadge = (status: RegistrationStatus) => {
    const styles = {
      pending: "bg-yellow-100 text-yellow-800 border-yellow-200",
      approved: "bg-green-100 text-green-800 border-green-200",
      rejected: "bg-red-100 text-red-800 border-red-200",
      suspended: "bg-gray-100 text-gray-800 border-gray-200",
    };

    const icons = {
      pending: <Clock className="w-4 h-4" />,
      approved: <CheckCircle2 className="w-4 h-4" />,
      rejected: <XCircle className="w-4 h-4" />,
      suspended: <AlertCircle className="w-4 h-4" />,
    };

    const labels = {
      pending: { sw: "Inasubiri", en: "Pending" },
      approved: { sw: "Imeidhinishwa", en: "Approved" },
      rejected: { sw: "Imekataliwa", en: "Rejected" },
      suspended: { sw: "Imesimamishwa", en: "Suspended" },
    };

    return (
      <span
        className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium border ${styles[status]}`}
      >
        {icons[status]}
        {labels[status][lang === "sw" ? "sw" : "en"]}
      </span>
    );
  };

  // Filter registrations by search
  const filteredRegistrations = registrations.filter((reg) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      reg.business_name.toLowerCase().includes(query) ||
      reg.user?.first_name?.toLowerCase().includes(query) ||
      reg.user?.last_name?.toLowerCase().includes(query) ||
      reg.user?.citizen_id?.toLowerCase().includes(query) ||
      reg.business_id?.toLowerCase().includes(query)
    );
  });

  return (
    <div className="min-h-screen bg-linear-to-br from-gray-50 to-gray-100 py-8 px-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
                <div className="p-2 bg-linear-to-br from-emerald-500 to-teal-600 rounded-xl">
                  <Building2 className="w-6 h-6 text-white" />
                </div>
                {lang === "sw"
                  ? "Usimamizi wa Usajili wa Biashara"
                  : "Business Registration Management"}
              </h1>
              <p className="text-gray-600 mt-1">
                {lang === "sw"
                  ? "Idhinisha au kataa maombi ya usajili wa Wauza, Wapangishaji, na Madalali"
                  : "Approve or reject registration requests for Sellers, Landlords, and Brokers"}
              </p>
            </div>

            <button
              type="button"
              onClick={fetchRegistrations}
              className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
              {lang === "sw" ? "Onyesha upya" : "Refresh"}
            </button>
          </div>
        </motion.div>

        {/* Stats Cards */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8"
        >
          <div
            onClick={() => setStatusFilter("pending")}
            className={`p-4 bg-white rounded-xl border cursor-pointer transition-all ${
              statusFilter === "pending"
                ? "border-yellow-400 ring-2 ring-yellow-100"
                : "border-gray-200 hover:border-yellow-300"
            }`}
          >
            <div className="flex items-center gap-3">
              <div className="p-2 bg-yellow-100 rounded-lg">
                <Clock className="w-5 h-5 text-yellow-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{stats.pending}</p>
                <p className="text-sm text-gray-500">{lang === "sw" ? "Zinasubiri" : "Pending"}</p>
              </div>
            </div>
          </div>

          <div
            onClick={() => setStatusFilter("approved")}
            className={`p-4 bg-white rounded-xl border cursor-pointer transition-all ${
              statusFilter === "approved"
                ? "border-green-400 ring-2 ring-green-100"
                : "border-gray-200 hover:border-green-300"
            }`}
          >
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <CheckCircle2 className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{stats.approved}</p>
                <p className="text-sm text-gray-500">
                  {lang === "sw" ? "Zimeidhinishwa" : "Approved"}
                </p>
              </div>
            </div>
          </div>

          <div
            onClick={() => setStatusFilter("rejected")}
            className={`p-4 bg-white rounded-xl border cursor-pointer transition-all ${
              statusFilter === "rejected"
                ? "border-red-400 ring-2 ring-red-100"
                : "border-gray-200 hover:border-red-300"
            }`}
          >
            <div className="flex items-center gap-3">
              <div className="p-2 bg-red-100 rounded-lg">
                <XCircle className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{stats.rejected}</p>
                <p className="text-sm text-gray-500">
                  {lang === "sw" ? "Zimekataliwa" : "Rejected"}
                </p>
              </div>
            </div>
          </div>

          <div
            onClick={() => setStatusFilter("suspended")}
            className={`p-4 bg-white rounded-xl border cursor-pointer transition-all ${
              statusFilter === "suspended"
                ? "border-gray-400 ring-2 ring-gray-100"
                : "border-gray-200 hover:border-gray-300"
            }`}
          >
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gray-100 rounded-lg">
                <AlertCircle className="w-5 h-5 text-gray-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{stats.suspended}</p>
                <p className="text-sm text-gray-500">
                  {lang === "sw" ? "Zimesimamishwa" : "Suspended"}
                </p>
              </div>
            </div>
          </div>

          <div
            onClick={() => setStatusFilter("all")}
            className={`p-4 bg-white rounded-xl border cursor-pointer transition-all ${
              statusFilter === "all"
                ? "border-emerald-400 ring-2 ring-emerald-100"
                : "border-gray-200 hover:border-emerald-300"
            }`}
          >
            <div className="flex items-center gap-3">
              <div className="p-2 bg-emerald-100 rounded-lg">
                <Building2 className="w-5 h-5 text-emerald-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
                <p className="text-sm text-gray-500">{lang === "sw" ? "Jumla" : "Total"}</p>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6 bg-white rounded-xl border border-gray-200 p-1 w-fit">
          {(
            [
              { key: "registrations", sw: "Usajili wa Biashara", en: "Business Registrations" },
              { key: "agreements", sw: "Makubaliano", en: "Agreements" },
              { key: "applications", sw: "Maombi Yote", en: "All Applications" },
            ] as { key: StaffTab; sw: string; en: string }[]
          ).map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActiveTab(tab.key)}
              className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                activeTab === tab.key
                  ? "bg-emerald-600 text-white shadow-sm"
                  : "text-gray-600 hover:text-gray-800 hover:bg-gray-50"
              }`}
            >
              {lang === "sw" ? tab.sw : tab.en}
            </button>
          ))}
        </div>

        {/* ── AGREEMENTS TAB ───────────────────────────────────────────────── */}
        {activeTab === "agreements" && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden"
          >
            <div className="p-4 border-b border-gray-100 flex items-center gap-3">
              <div className="flex-1 relative">
                <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={agrSearchQuery}
                  onChange={(e) => setAgrSearchQuery(e.target.value)}
                  placeholder={lang === "sw" ? "Tafuta makubaliano..." : "Search agreements..."}
                  className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                />
              </div>
            </div>
            {loadingAgreements ? (
              <div className="p-12 flex items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                        {lang === "sw" ? "Mwanzilishi" : "Initiator"}
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                        {lang === "sw" ? "Pande ya Pili" : "Second Party"}
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                        {lang === "sw" ? "Aina" : "Type"}
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                        {lang === "sw" ? "Hali" : "Status"}
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                        {lang === "sw" ? "Tarehe" : "Date"}
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {agreements
                      .filter((a) => {
                        if (!agrSearchQuery) return true;
                        const q = agrSearchQuery.toLowerCase();
                        return (
                          a.application_number?.toLowerCase().includes(q) ||
                          a.user?.first_name?.toLowerCase().includes(q) ||
                          a.user?.last_name?.toLowerCase().includes(q) ||
                          a.user?.citizen_id?.toLowerCase().includes(q) ||
                          a.second_party?.citizen_id?.toLowerCase().includes(q)
                        );
                      })
                      .map((agr) => (
                        <tr key={agr.id} onClick={() => setSelectedAgreement(agr)} className="hover:bg-gray-50 transition-colors cursor-pointer">
                          <td className="px-6 py-4">
                            <p className="font-medium text-gray-900">
                              {agr.user ? `${agr.user.first_name} ${agr.user.last_name}` : "—"}
                            </p>
                            <p className="text-xs text-emerald-600 font-mono">
                              {agr.user?.citizen_id || "—"}
                            </p>
                          </td>
                          <td className="px-6 py-4">
                            <p className="font-medium text-gray-900">
                              {agr.second_party
                                ? `${agr.second_party.first_name} ${agr.second_party.last_name}`
                                : "—"}
                            </p>
                            <p className="text-xs text-emerald-600 font-mono">
                              {agr.second_party?.citizen_id || "—"}
                            </p>
                          </td>
                          <td className="px-6 py-4">
                            <p className="text-sm text-gray-700">{agr.service_name || "—"}</p>
                            <p className="text-xs text-gray-400 font-mono">
                              {agr.application_number}
                            </p>
                          </td>
                          <td className="px-6 py-4">
                            <span
                              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${
                                agr.status === "issued"
                                  ? "bg-green-50 text-green-700 border-green-200"
                                  : agr.status === "rejected"
                                    ? "bg-red-50 text-red-700 border-red-200"
                                    : agr.status === "processing"
                                      ? "bg-blue-50 text-blue-700 border-blue-200"
                                      : "bg-yellow-50 text-yellow-700 border-yellow-200"
                              }`}
                            >
                              {agr.status || "—"}
                            </span>
                            {agr.agreement_status && (
                              <p className="text-xs text-purple-600 mt-1">{agr.agreement_status}</p>
                            )}
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-500">
                            {new Date(agr.created_at).toLocaleDateString()}
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
                {agreements.length === 0 && (
                  <div className="p-12 text-center text-gray-400">
                    <FileText className="w-10 h-10 mx-auto mb-3 opacity-30" />
                    <p>{lang === "sw" ? "Hakuna makubaliano" : "No agreements found"}</p>
                  </div>
                )}
              </div>
            )}
          </motion.div>
        )}

        {/* ── ALL APPLICATIONS TAB ─────────────────────────────────────────── */}
        {activeTab === "applications" && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden"
          >
            <div className="p-4 border-b border-gray-100 flex flex-col md:flex-row gap-3">
              <div className="flex-1 relative">
                <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={appSearchQuery}
                  onChange={(e) => setAppSearchQuery(e.target.value)}
                  placeholder={lang === "sw" ? "Tafuta maombi..." : "Search applications..."}
                  className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                />
              </div>
              <select
                value={appStatusFilter}
                onChange={(e) => setAppStatusFilter(e.target.value)}
                aria-label={lang === "sw" ? "Chuja kwa hali" : "Filter by status"}
                title={lang === "sw" ? "Chuja kwa hali" : "Filter by status"}
                className="px-4 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500"
              >
                <option value="all">{lang === "sw" ? "Hali Zote" : "All Statuses"}</option>
                {[
                  "submitted",
                  "approved",
                  "pending_payment",
                  "paid",
                  "processing",
                  "issued",
                  "rejected",
                  "refunded",
                ].map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>
            {loadingApps ? (
              <div className="p-12 flex items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                        {lang === "sw" ? "Mwombaji" : "Applicant"}
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                        {lang === "sw" ? "Huduma" : "Service"}
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                        {lang === "sw" ? "Eneo" : "Location"}
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                        {lang === "sw" ? "Hali" : "Status"}
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                        {lang === "sw" ? "Tarehe" : "Date"}
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {allApps
                      .filter((a) => {
                        if (!appSearchQuery) return true;
                        const q = appSearchQuery.toLowerCase();
                        return (
                          a.application_number?.toLowerCase().includes(q) ||
                          a.service_name?.toLowerCase().includes(q) ||
                          a.user?.first_name?.toLowerCase().includes(q) ||
                          a.user?.last_name?.toLowerCase().includes(q) ||
                          a.user?.citizen_id?.toLowerCase().includes(q)
                        );
                      })
                      .map((app) => (
                        <tr key={app.id} className="hover:bg-gray-50 transition-colors">
                          <td className="px-6 py-4">
                            <p className="font-medium text-gray-900">
                              {app.user ? `${app.user.first_name} ${app.user.last_name}` : "—"}
                            </p>
                            <p className="text-xs text-emerald-600 font-mono">
                              {app.user?.citizen_id || "—"}
                            </p>
                          </td>
                          <td className="px-6 py-4">
                            <p className="text-sm text-gray-700">{app.service_name || "—"}</p>
                            <p className="text-xs text-gray-400 font-mono">
                              {app.application_number}
                            </p>
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-600">
                            {[app.district, app.region].filter(Boolean).join(", ") || "—"}
                          </td>
                          <td className="px-6 py-4">
                            <span
                              className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold border ${
                                app.status === "issued"
                                  ? "bg-green-50 text-green-700 border-green-200"
                                  : app.status === "rejected"
                                    ? "bg-red-50 text-red-700 border-red-200"
                                    : app.status === "paid" || app.status === "processing"
                                      ? "bg-blue-50 text-blue-700 border-blue-200"
                                      : app.status === "pending_payment"
                                        ? "bg-amber-50 text-amber-700 border-amber-200"
                                        : "bg-gray-50 text-gray-700 border-gray-200"
                              }`}
                            >
                              {app.status || "—"}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-500">
                            {new Date(app.created_at).toLocaleDateString()}
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
                {allApps.length === 0 && (
                  <div className="p-12 text-center text-gray-400">
                    <FileText className="w-10 h-10 mx-auto mb-3 opacity-30" />
                    <p>{lang === "sw" ? "Hakuna maombi" : "No applications found"}</p>
                  </div>
                )}
              </div>
            )}
          </motion.div>
        )}

        {/* Filters & Table — registrations tab only */}
        {activeTab === "registrations" && (
          <>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="flex flex-col md:flex-row gap-4 mb-6"
            >
              {/* Search */}
              <div className="flex-1 relative">
                <Search className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={
                    lang === "sw" ? "Tafuta kwa jina, CT ID..." : "Search by name, CT ID..."
                  }
                  className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                />
              </div>

              {/* Type Filter */}
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value as BusinessType | "all")}
                aria-label={lang === "sw" ? "Chagua aina ya biashara" : "Filter by business type"}
                className="px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
              >
                <option value="all">{lang === "sw" ? "Aina Zote" : "All Types"}</option>
                {BUSINESS_TYPES.map((type) => (
                  <option key={type.value} value={type.value}>
                    {lang === "sw" ? type.labelSw : type.labelEn}
                  </option>
                ))}
              </select>
            </motion.div>

            {/* Registrations Table */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden"
            >
              {loading ? (
                <div className="p-12 flex items-center justify-center">
                  <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
                </div>
              ) : filteredRegistrations.length === 0 ? (
                <div className="p-12 text-center">
                  <Building2 className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500">
                    {lang === "sw" ? "Hakuna maombi yaliyopatikana" : "No registrations found"}
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50 border-b border-gray-200">
                      <tr>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                          {lang === "sw" ? "Mwombaji" : "Applicant"}
                        </th>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                          {lang === "sw" ? "Aina" : "Type"}
                        </th>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                          {lang === "sw" ? "Biashara" : "Business"}
                        </th>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                          {lang === "sw" ? "Eneo" : "Location"}
                        </th>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                          {lang === "sw" ? "Hali" : "Status"}
                        </th>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                          {lang === "sw" ? "Tarehe" : "Date"}
                        </th>
                        <th className="px-6 py-4 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">
                          {lang === "sw" ? "Vitendo" : "Actions"}
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {filteredRegistrations.map((reg) => {
                        const typeInfo = BUSINESS_TYPES.find((t) => t.value === reg.business_type);
                        const TypeIcon = typeInfo?.icon || Building2;

                        return (
                          <tr key={reg.id} className="hover:bg-gray-50 transition-colors">
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center overflow-hidden">
                                  {reg.user?.photo_url ? (
                                    <img
                                      src={reg.user.photo_url}
                                      alt=""
                                      className="w-full h-full object-cover"
                                    />
                                  ) : (
                                    <User className="w-5 h-5 text-gray-400" />
                                  )}
                                </div>
                                <div>
                                  <p className="font-medium text-gray-900">
                                    {reg.user?.first_name} {reg.user?.middle_name}{" "}
                                    {reg.user?.last_name}
                                  </p>
                                  <p className="text-sm text-emerald-600 font-mono">
                                    {reg.user?.citizen_id}
                                  </p>
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-2">
                                <div
                                  className={`p-1.5 rounded-lg bg-linear-to-br ${typeInfo?.color}`}
                                >
                                  <TypeIcon className="w-4 h-4 text-white" />
                                </div>
                                <span className="text-sm text-gray-700">
                                  {lang === "sw" ? typeInfo?.labelSw : typeInfo?.labelEn}
                                </span>
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              <div>
                                <p className="font-medium text-gray-900">{reg.business_name}</p>
                                <p className="text-sm text-gray-500">
                                  {SPECIALIZATIONS_LABELS[reg.specialization]?.[
                                    lang === "sw" ? "sw" : "en"
                                  ] || reg.specialization}
                                </p>
                                {reg.business_id && (
                                  <p className="text-sm font-mono text-emerald-600 mt-1">
                                    {reg.business_id}
                                  </p>
                                )}
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              <p className="text-sm text-gray-700">
                                {reg.district}, {reg.region}
                              </p>
                            </td>
                            <td className="px-6 py-4">{getStatusBadge(reg.status)}</td>
                            <td className="px-6 py-4">
                              <p className="text-sm text-gray-500">
                                {new Date(reg.created_at).toLocaleDateString()}
                              </p>
                            </td>
                            <td className="px-6 py-4 text-right">
                              <button
                                type="button"
                                onClick={() => setSelectedRegistration(reg)}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg transition-colors"
                              >
                                <Eye className="w-4 h-4" />
                                {lang === "sw" ? "Angalia" : "View"}
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </motion.div>
          </>
        )}

        {/* Detail Modal */}
        <AnimatePresence>
          {selectedRegistration && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
              onClick={() => setSelectedRegistration(null)}
            >
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                className="bg-white rounded-2xl shadow-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto"
                onClick={(e) => e.stopPropagation()}
              >
                {(() => {
                  const typeInfo = BUSINESS_TYPES.find(
                    (t) => t.value === selectedRegistration.business_type,
                  );
                  const TypeIcon = typeInfo?.icon || Building2;

                  return (
                    <>
                      {/* Header */}
                      <div
                        className={`p-6 bg-linear-to-r ${typeInfo?.color || "from-gray-500 to-gray-600"}`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-4">
                            <TypeIcon className="w-8 h-8 text-white" />
                            <div>
                              <h2 className="text-xl font-bold text-white">
                                {selectedRegistration.business_name}
                              </h2>
                              <p className="text-white/80 text-sm">
                                {lang === "sw" ? typeInfo?.labelSw : typeInfo?.labelEn}
                              </p>
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => setSelectedRegistration(null)}
                            aria-label="Close"
                            title="Close"
                            className="p-2 hover:bg-white/20 rounded-lg transition-colors"
                          >
                            <X className="w-6 h-6 text-white" />
                          </button>
                        </div>
                      </div>

                      <div className="p-6 space-y-6">
                        {/* Status & Business ID */}
                        <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                          <div>
                            <p className="text-sm text-gray-500 mb-1">
                              {lang === "sw" ? "Hali" : "Status"}
                            </p>
                            {getStatusBadge(selectedRegistration.status)}
                          </div>
                          {selectedRegistration.business_id && (
                            <div className="text-right">
                              <p className="text-sm text-gray-500 mb-1">
                                {lang === "sw" ? "ID ya Biashara" : "Business ID"}
                              </p>
                              <p className="text-xl font-bold text-emerald-600 font-mono">
                                {selectedRegistration.business_id}
                              </p>
                            </div>
                          )}
                        </div>

                        {/* Applicant Info */}
                        <div>
                          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                            <User className="w-5 h-5 text-emerald-600" />
                            {lang === "sw" ? "Taarifa za Mwombaji" : "Applicant Information"}
                          </h3>
                          <div className="grid gap-4 md:grid-cols-3 p-4 bg-gray-50 rounded-xl">
                            <div className="flex items-center gap-3">
                              <div className="w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center overflow-hidden">
                                {selectedRegistration.user?.photo_url ? (
                                  <img
                                    src={selectedRegistration.user.photo_url}
                                    alt=""
                                    className="w-full h-full object-cover"
                                  />
                                ) : (
                                  <User className="w-8 h-8 text-gray-400" />
                                )}
                              </div>
                              <div>
                                <p className="font-semibold text-gray-900">
                                  {selectedRegistration.user?.first_name}{" "}
                                  {selectedRegistration.user?.middle_name}{" "}
                                  {selectedRegistration.user?.last_name}
                                </p>
                                <p className="text-sm text-emerald-600 font-mono">
                                  {selectedRegistration.user?.citizen_id}
                                </p>
                              </div>
                            </div>
                            <div>
                              <p className="text-sm text-gray-500">NIDA</p>
                              <p className="font-medium text-gray-900">
                                {selectedRegistration.user?.nida_number || "-"}
                              </p>
                            </div>
                          </div>
                        </div>

                        {/* Business Details */}
                        <div className="grid gap-4 md:grid-cols-2">
                          <div>
                            <p className="text-sm text-gray-500">
                              {lang === "sw" ? "Utaalamu" : "Specialization"}
                            </p>
                            <p className="font-medium text-gray-900">
                              {SPECIALIZATIONS_LABELS[selectedRegistration.specialization]?.[
                                lang === "sw" ? "sw" : "en"
                              ] || selectedRegistration.specialization}
                            </p>
                          </div>
                          <div>
                            <p className="text-sm text-gray-500">
                              {lang === "sw" ? "Miaka ya Uzoefu" : "Experience"}
                            </p>
                            <p className="font-medium text-gray-900">
                              {selectedRegistration.experience_years}{" "}
                              {lang === "sw" ? "miaka" : "years"}
                            </p>
                          </div>
                          <div>
                            <p className="text-sm text-gray-500">
                              {lang === "sw" ? "Eneo" : "Location"}
                            </p>
                            <p className="font-medium text-gray-900">
                              {selectedRegistration.ward}, {selectedRegistration.district},{" "}
                              {selectedRegistration.region}
                            </p>
                          </div>
                          <div>
                            <p className="text-sm text-gray-500">
                              {lang === "sw" ? "Simu" : "Phone"}
                            </p>
                            <p className="font-medium text-gray-900">
                              {selectedRegistration.phone}
                            </p>
                          </div>
                          <div>
                            <p className="text-sm text-gray-500">
                              {lang === "sw" ? "Barua pepe" : "Email"}
                            </p>
                            <p className="font-medium text-gray-900">
                              {selectedRegistration.email}
                            </p>
                          </div>
                          <div>
                            <p className="text-sm text-gray-500">
                              {lang === "sw" ? "Tarehe ya Usajili" : "Registration Date"}
                            </p>
                            <p className="font-medium text-gray-900">
                              {new Date(selectedRegistration.created_at).toLocaleDateString()}
                            </p>
                          </div>
                        </div>

                        {selectedRegistration.description && (
                          <div>
                            <p className="text-sm text-gray-500 mb-1">
                              {lang === "sw" ? "Maelezo" : "Description"}
                            </p>
                            <p className="text-gray-700 bg-gray-50 p-4 rounded-xl">
                              {selectedRegistration.description}
                            </p>
                          </div>
                        )}

                        {/* Documents */}
                        <div>
                          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                            <FileText className="w-5 h-5 text-emerald-600" />
                            {lang === "sw" ? "Nyaraka" : "Documents"}
                          </h3>
                          <div className="grid gap-4 md:grid-cols-3">
                            {selectedRegistration.id_document_url && (
                              <a
                                href={selectedRegistration.id_document_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-2 p-4 bg-blue-50 rounded-xl hover:bg-blue-100 transition-colors"
                              >
                                <FileText className="w-5 h-5 text-blue-600" />
                                <span className="text-sm font-medium text-blue-700">
                                  {lang === "sw" ? "Kitambulisho" : "ID Document"}
                                </span>
                                <ExternalLink className="w-4 h-4 text-blue-500 ml-auto" />
                              </a>
                            )}
                            {selectedRegistration.proof_document_url && (
                              <a
                                href={selectedRegistration.proof_document_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-2 p-4 bg-purple-50 rounded-xl hover:bg-purple-100 transition-colors"
                              >
                                <Award className="w-5 h-5 text-purple-600" />
                                <span className="text-sm font-medium text-purple-700">
                                  {lang === "sw" ? "Leseni/TIN" : "License/TIN"}
                                </span>
                                <ExternalLink className="w-4 h-4 text-purple-500 ml-auto" />
                              </a>
                            )}
                            {selectedRegistration.photo_url && (
                              <a
                                href={selectedRegistration.photo_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-2 p-4 bg-emerald-50 rounded-xl hover:bg-emerald-100 transition-colors"
                              >
                                <User className="w-5 h-5 text-emerald-600" />
                                <span className="text-sm font-medium text-emerald-700">
                                  {lang === "sw" ? "Picha" : "Photo"}
                                </span>
                                <ExternalLink className="w-4 h-4 text-emerald-500 ml-auto" />
                              </a>
                            )}
                          </div>
                        </div>

                        {/* Rejection Reason */}
                        {selectedRegistration.status === "rejected" &&
                          selectedRegistration.rejection_reason && (
                            <div className="p-4 bg-red-50 rounded-xl border border-red-200">
                              <p className="text-sm text-red-600 font-medium mb-1">
                                {lang === "sw" ? "Sababu ya Kukataliwa" : "Rejection Reason"}
                              </p>
                              <p className="text-red-700">
                                {selectedRegistration.rejection_reason}
                              </p>
                            </div>
                          )}

                        {/* Action Buttons */}
                        {selectedRegistration.status === "pending" && (
                          <div className="flex items-center justify-end gap-4 pt-6 border-t">
                            <button
                              type="button"
                              onClick={() => setShowRejectModal(true)}
                              disabled={processing}
                              className="px-6 py-2.5 bg-red-500 text-white font-medium rounded-xl hover:bg-red-600 disabled:opacity-50 flex items-center gap-2"
                            >
                              <XCircle className="w-5 h-5" />
                              {lang === "sw" ? "Kataa" : "Reject"}
                            </button>
                            <button
                              type="button"
                              onClick={handleApprove}
                              disabled={processing}
                              className="px-6 py-2.5 bg-linear-to-r from-emerald-500 to-teal-600 text-white font-medium rounded-xl hover:shadow-lg disabled:opacity-50 flex items-center gap-2"
                            >
                              {processing ? (
                                <Loader2 className="w-5 h-5 animate-spin" />
                              ) : (
                                <CheckCircle className="w-5 h-5" />
                              )}
                              {lang === "sw" ? "Idhinisha" : "Approve"}
                            </button>
                          </div>
                        )}
                      </div>
                    </>
                  );
                })()}
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>


        {/* Agreement Detail Slide-over */}
        <AnimatePresence>
          {selectedAgreement && (
            <>
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                onClick={() => setSelectedAgreement(null)}
                className="fixed inset-0 bg-stone-900/40 backdrop-blur-sm z-40" />
              <motion.div initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "100%" }}
                transition={{ type: "tween", duration: 0.25 }}
                className="fixed inset-y-0 right-0 w-full sm:w-[560px] max-w-full bg-white shadow-2xl z-50 flex flex-col">
                <div className="px-5 py-4 border-b border-stone-200 flex items-center justify-between shrink-0">
                  <div>
                    <p className="text-[10px] font-bold text-stone-400 uppercase tracking-wider">{selectedAgreement.service_name || "Agreement"}</p>
                    <p className="text-base font-black text-stone-900">{selectedAgreement.application_number}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${selectedAgreement.status === "issued" ? "bg-green-50 text-green-700 border border-green-200" : "bg-stone-100 text-stone-600 border border-stone-200"}`}>{selectedAgreement.status}</span>
                    <button onClick={() => setSelectedAgreement(null)} className="p-1.5 text-stone-400 hover:text-stone-800 hover:bg-stone-100 rounded-lg"><X size={20} /></button>
                  </div>
                </div>
                <div className="flex-1 overflow-y-auto p-5 space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-stone-50 border border-stone-200 rounded-xl p-3">
                      <p className="text-[10px] font-bold text-stone-400 uppercase mb-1">{lang === "sw" ? "Mwanzilishi" : "Initiator"}</p>
                      <p className="font-black text-stone-900 text-sm">{selectedAgreement.user ? `${selectedAgreement.user.first_name} ${selectedAgreement.user.last_name}` : "\u2014"}</p>
                      <p className="text-xs text-emerald-600 font-mono">{selectedAgreement.user?.citizen_id || ""}</p>
                    </div>
                    <div className="bg-stone-50 border border-stone-200 rounded-xl p-3">
                      <p className="text-[10px] font-bold text-stone-400 uppercase mb-1">{lang === "sw" ? "Pande ya Pili" : "Second Party"}</p>
                      <p className="font-black text-stone-900 text-sm">{selectedAgreement.second_party ? `${selectedAgreement.second_party.first_name} ${selectedAgreement.second_party.last_name}` : "\u2014"}</p>
                      <p className="text-xs text-emerald-600 font-mono">{selectedAgreement.second_party?.citizen_id || ""}</p>
                    </div>
                  </div>
                  <div className={`border rounded-xl p-4 ${!selectedAgreement.agreement_status || selectedAgreement.agreement_status === "pending" ? "bg-amber-50 border-amber-200" : selectedAgreement.agreement_status === "buyer_accepted" ? "bg-emerald-50 border-emerald-200" : "bg-red-50 border-red-200"}`}>
                    <p className="text-xs font-bold text-stone-600 uppercase mb-1">{lang === "sw" ? "Hali ya Mnunuzi" : "Buyer Acceptance Status"}</p>
                    <p className={`text-sm font-black ${!selectedAgreement.agreement_status || selectedAgreement.agreement_status === "pending" ? "text-amber-700" : selectedAgreement.agreement_status === "buyer_accepted" ? "text-emerald-700" : "text-red-700"}`}>
                      {!selectedAgreement.agreement_status || selectedAgreement.agreement_status === "pending" ? (lang === "sw" ? "\u23F3 Inasubiri Kukubaliwa" : "\u23F3 Awaiting Acceptance") : selectedAgreement.agreement_status === "buyer_accepted" ? (lang === "sw" ? "\u2705 Amekubali na Kusaini" : "\u2705 Accepted & Signed") : (lang === "sw" ? "\u274C Amekataa" : "\u274C Rejected")}
                    </p>
                    {(!selectedAgreement.agreement_status || selectedAgreement.agreement_status === "pending") && selectedAgreement.second_party_user_id && (
                      <button onClick={async () => { await supabase.from("notifications").insert({ user_id: selectedAgreement.second_party_user_id, title: lang === "sw" ? "Kumbusho: Makubaliano" : "Reminder: Agreement Awaiting", message: `${selectedAgreement.application_number}`, type: "agreement" }); alert(lang === "sw" ? "Kumbusho limetumwa!" : "Reminder sent!"); }}
                        className="mt-2 w-full py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold">
                        {lang === "sw" ? "\uD83D\uDCE9 Tuma Kumbusho" : "\uD83D\uDCE9 Send Reminder to Buyer"}
                      </button>
                    )}
                  </div>
                  <ApplicationChat applicationId={selectedAgreement.id} applicationNumber={selectedAgreement.application_number || ""} applicantId={selectedAgreement.user_id || ""} lang={lang} defaultExpanded />
                </div>
                <div className="px-5 py-3 border-t border-stone-100 bg-stone-50">
                  <button onClick={() => setSelectedAgreement(null)} className="w-full py-2.5 bg-stone-200 hover:bg-stone-300 rounded-xl text-sm font-bold text-stone-700">{lang === "sw" ? "Funga" : "Close"}</button>
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>

        {/* Rejection Modal */}
        <AnimatePresence>
          {showRejectModal && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/50"
              onClick={() => setShowRejectModal(false)}
            >
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6"
                onClick={(e) => e.stopPropagation()}
              >
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <XCircle className="w-5 h-5 text-red-500" />
                  {lang === "sw" ? "Kataa Usajili" : "Reject Registration"}
                </h3>

                <p className="text-gray-600 mb-4">
                  {lang === "sw"
                    ? "Tafadhali eleza sababu ya kukataa usajili huu."
                    : "Please provide a reason for rejecting this registration."}
                </p>

                <textarea
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  rows={4}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-red-500 focus:border-transparent resize-none mb-4"
                  placeholder={lang === "sw" ? "Sababu ya kukataa..." : "Reason for rejection..."}
                />

                <div className="flex items-center justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setShowRejectModal(false);
                      setRejectionReason("");
                    }}
                    className="px-4 py-2 text-gray-700 hover:text-gray-900 font-medium"
                    disabled={processing}
                  >
                    {lang === "sw" ? "Ghairi" : "Cancel"}
                  </button>
                  <button
                    type="button"
                    onClick={handleReject}
                    disabled={processing || !rejectionReason.trim()}
                    className="px-4 py-2 bg-red-500 text-white font-medium rounded-xl hover:bg-red-600 disabled:opacity-50 flex items-center gap-2"
                  >
                    {processing && <Loader2 className="w-4 h-4 animate-spin" />}
                    {lang === "sw" ? "Kataa" : "Reject"}
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default BusinessApproval;
