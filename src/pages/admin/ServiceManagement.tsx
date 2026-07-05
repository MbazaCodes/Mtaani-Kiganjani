import React, { useState, useEffect, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Settings,
  Plus,
  Search,
  X,
  Loader2,
  Trash2,
  Edit2,
  FileText,
  DollarSign,
  AlertTriangle,
  CheckCircle2,
  Clock,
  ToggleLeft,
  ToggleRight,
  Layers,
  PlusCircle,
  MinusCircle,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { IS_SUPABASE_CONFIGURED } from "@/lib/config";
import { useLanguage } from "@/context/LanguageContext";
import { useToast } from "@/context/ToastContext";
import { cn } from "@/lib/utils";
import { formatCurrency } from "@/lib/currency";

interface Service {
  id: string;
  name: string;
  name_en: string;
  name_sw: string;
  description: string;
  description_en: string;
  description_sw: string;
  fee: number;
  currency?: string;
  active: boolean;
  form_schema: FormField[];
  document_template?: Record<string, unknown>;
  processing_time?: number; // in days
  required_documents?: string[];
  category?: string;
  created_at?: string;
  updated_at?: string;
}

interface FormField {
  id: string;
  type: "text" | "number" | "email" | "tel" | "date" | "select" | "checkbox" | "file";
  label: string;
  label_en: string;
  label_sw: string;
  required: boolean;
  options?: string[]; // for select fields
  validation?: {
    min?: number;
    max?: number;
    pattern?: string;
  };
}

interface ServiceFormData {
  name_en: string;
  name_sw: string;
  description_en: string;
  description_sw: string;
  fee: number;
  currency: string;
  active: boolean;
  processing_time: number;
  category: string;
  required_documents: string[];
  form_schema: FormField[];
}

interface DemoService extends Service {
  isDemo?: boolean;
}

const DEMO_SERVICES: DemoService[] = [
  {
    id: "1",
    name: "Utambulisho wa Mkazi",
    name_en: "Resident Identity",
    name_sw: "Utambulisho wa Mkazi",
    description: "Cheti rasmi cha utambulisho wa mkazi wa mtaa",
    description_en: "Official resident identity certificate",
    description_sw: "Cheti rasmi cha utambulisho wa mkazi wa mtaa",
    fee: 5000,
    currency: "TZS",
    active: true,
    processing_time: 3,
    category: "identification",
    required_documents: ["nida", "selfie", "proof_of_residence"],
    form_schema: [],
    isDemo: true,
  },
  {
    id: "2",
    name: "Kibari cha Mazishi",
    name_en: "Burial Permit",
    name_sw: "Kibari cha Mazishi",
    description: "Kibari rasmi cha kuzika marehemu",
    description_en: "Official burial permit",
    description_sw: "Kibari rasmi cha kuzika marehemu",
    fee: 2000,
    currency: "TZS",
    active: true,
    processing_time: 1,
    category: "permits",
    required_documents: ["death_certificate", "id"],
    form_schema: [],
    isDemo: true,
  },
  {
    id: "3",
    name: "Kibari cha Sherehe",
    name_en: "Celebration Permit",
    name_sw: "Kibari cha Sherehe",
    description: "Kibari cha kufanya sherehe au matukio",
    description_en: "Event / celebration permit",
    description_sw: "Kibari cha kufanya sherehe au matukio",
    fee: 10000,
    currency: "TZS",
    active: true,
    processing_time: 3,
    category: "permits",
    required_documents: ["venue_approval"],
    form_schema: [],
    isDemo: true,
  },
  {
    id: "4",
    name: "Kibari cha Ujezi Mdogo",
    name_en: "Minor Construction Permit",
    name_sw: "Kibari cha Ujezi Mdogo",
    description: "Kibari cha ujenzi mdogo wa nyumba au ardhi",
    description_en: "Minor construction permit",
    description_sw: "Kibari cha ujenzi mdogo wa nyumba au ardhi",
    fee: 15000,
    currency: "TZS",
    active: true,
    processing_time: 5,
    category: "permits",
    required_documents: ["land_cert", "sketch", "id"],
    form_schema: [],
    isDemo: true,
  },
  {
    id: "5",
    name: "Barua ya Utambulisho",
    name_en: "Introduction Letter",
    name_sw: "Barua ya Utambulisho",
    description: "Barua ya utambulisho kwa taasisi mbalimbali",
    description_en: "Introduction letter for institutions",
    description_sw: "Barua ya utambulisho kwa taasisi mbalimbali",
    fee: 3000,
    currency: "TZS",
    active: true,
    processing_time: 2,
    category: "certificates",
    required_documents: ["id"],
    form_schema: [],
    isDemo: true,
  },
  {
    id: "6",
    name: "Makubaliano ya Mauzo",
    name_en: "Sales Agreement",
    name_sw: "Makubaliano ya Mauzo",
    description: "Makubaliano rasmi ya mauzo ya mali",
    description_en: "Official sales agreement",
    description_sw: "Makubaliano rasmi ya mauzo ya mali",
    fee: 0,
    currency: "TZS",
    active: true,
    processing_time: 5,
    category: "agreements",
    required_documents: ["title_deed", "id", "buyer_id"],
    form_schema: [],
    isDemo: true,
  },
  {
    id: "7",
    name: "Makubaliano ya Pango",
    name_en: "Rental Agreement",
    name_sw: "Makubaliano ya Pango",
    description: "Mkataba rasmi wa kukodisha nyumba",
    description_en: "Official rental agreement",
    description_sw: "Mkataba rasmi wa kukodisha nyumba",
    fee: 10000,
    currency: "TZS",
    active: true,
    processing_time: 3,
    category: "agreements",
    required_documents: ["ownership_cert", "id", "tenant_id"],
    form_schema: [],
    isDemo: true,
  },
  {
    id: "8",
    name: "Malipo na Michango",
    name_en: "Payments & Contributions",
    name_sw: "Malipo na Michango",
    description: "Lipa faini, ada ya usafi, michango",
    description_en: "Pay fines, fees, and contributions",
    description_sw: "Lipa faini, ada ya usafi, michango",
    fee: 0,
    currency: "TZS",
    active: true,
    processing_time: 1,
    category: "payments",
    required_documents: [],
    form_schema: [],
    isDemo: true,
  },
  {
    id: "9",
    name: "Migogoro na Mashauri",
    name_en: "Disputes & Issues",
    name_sw: "Migogoro na Mashauri",
    description: "Wasilisha mgogoro au ripoti tatizo la kijamii",
    description_en: "File disputes or report community issues",
    description_sw: "Wasilisha mgogoro au ripoti tatizo la kijamii",
    fee: 5000,
    currency: "TZS",
    active: true,
    processing_time: 7,
    category: "civil_registration",
    required_documents: ["id", "evidence"],
    form_schema: [],
    isDemo: true,
  },
];

const INITIAL_FORM_DATA: ServiceFormData = {
  name_en: "",
  name_sw: "",
  description_en: "",
  description_sw: "",
  fee: 0,
  currency: "TZS",
  active: true,
  processing_time: 3,
  category: "general",
  required_documents: [],
  form_schema: [],
};

const SERVICE_CATEGORIES = [
  { id: "identification", en: "Identification", sw: "Utambulisho" },
  { id: "permits", en: "Permits", sw: "Vibali" },
  { id: "certificates", en: "Letters & Certificates", sw: "Barua na Vyeti" },
  { id: "agreements", en: "Agreements & Contracts", sw: "Makubaliano na Mikataba" },
  { id: "payments", en: "Payments & Contributions", sw: "Malipo na Michango" },
  { id: "civil_registration", en: "Disputes & Civil Registration", sw: "Migogoro na Usajili" },
  { id: "general", en: "General Services", sw: "Huduma za Jumla" },
];

export function ServiceManagement() {
  const { lang, currency: userCurrency } = useLanguage();
  const { showToast } = useToast();

  // State management
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showSchemaModal, setShowSchemaModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [processing, setProcessing] = useState(false);
  const [editingService, setEditingService] = useState<Service | null>(null);
  const [formData, setFormData] = useState<ServiceFormData>(INITIAL_FORM_DATA);
  const [formErrors, setFormErrors] = useState<Partial<Record<keyof ServiceFormData, string>>>({});
  const [activeTab, setActiveTab] = useState<"basic" | "schema" | "documents">("basic");

  // Computed properties
  const isSupabaseConfigured = useMemo(() => {
    return IS_SUPABASE_CONFIGURED;
  }, []);

  const filteredServices = useMemo(() => {
    return services.filter((service) => {
      const searchLower = searchTerm.toLowerCase();
      return (
        service.name_en.toLowerCase().includes(searchLower) ||
        service.name_sw.toLowerCase().includes(searchLower) ||
        service.description_en.toLowerCase().includes(searchLower) ||
        service.description_sw.toLowerCase().includes(searchLower) ||
        service.category?.toLowerCase().includes(searchLower)
      );
    });
  }, [services, searchTerm]);

  const activeServices = useMemo(() => {
    return services.filter((s) => s.active);
  }, [services]);

  const inactiveServices = useMemo(() => {
    return services.filter((s) => !s.active);
  }, [services]);

  // Data fetching
  const fetchServices = useCallback(async () => {
    setLoading(true);
    try {
      if (!isSupabaseConfigured) {
        // Demo mode - load from localStorage or use defaults
        await new Promise((resolve) => setTimeout(resolve, 500));
        const savedServices = localStorage.getItem("demo_services");
        if (savedServices) {
          setServices(JSON.parse(savedServices));
        } else {
          setServices(DEMO_SERVICES);
          localStorage.setItem("demo_services", JSON.stringify(DEMO_SERVICES));
        }
        return;
      }

      const { data, error } = await supabase
        .from("services")
        .select("*")
        .order("name_en", { ascending: true });

      if (error) {
        console.error("Error fetching services:", error);
        showToast(lang === "sw" ? "Hitilafu kupakia huduma" : "Error loading services", "error");
        setServices(DEMO_SERVICES);
        return;
      }

      if (data && data.length > 0) {
        setServices(data);
      } else {
        setServices(DEMO_SERVICES);
      }
    } catch (error) {
      console.error("Exception in fetchServices:", error);
      showToast(lang === "sw" ? "Hitilafu ya mfumo" : "System error", "error");
      setServices(DEMO_SERVICES);
    } finally {
      setLoading(false);
    }
  }, [isSupabaseConfigured, lang, showToast]);

  useEffect(() => {
    fetchServices();
  }, [fetchServices]);

  // Form validation
  const validateForm = useCallback((): boolean => {
    const errors: Partial<Record<keyof ServiceFormData, string>> = {};

    // Name validation
    if (!formData.name_en.trim()) {
      errors.name_en =
        lang === "sw" ? "Jina la Kiingereza linahitajika" : "English name is required";
    } else if (formData.name_en.length < 3) {
      errors.name_en =
        lang === "sw" ? "Jina liwe na herufi 3 au zaidi" : "Name must be at least 3 characters";
    }

    if (!formData.name_sw.trim()) {
      errors.name_sw =
        lang === "sw" ? "Jina la Kiswahili linahitajika" : "Swahili name is required";
    }

    // Description validation
    if (!formData.description_en.trim()) {
      errors.description_en =
        lang === "sw" ? "Maelezo ya Kiingereza yanahitajika" : "English description is required";
    }

    if (!formData.description_sw.trim()) {
      errors.description_sw =
        lang === "sw" ? "Maelezo ya Kiswahili yanahitajika" : "Swahili description is required";
    }

    // Fee validation
    if (formData.fee < 0) {
      errors.fee = lang === "sw" ? "Gharama haiwezi kuwa chini ya 0" : "Fee cannot be negative";
    }

    // Processing time validation
    if (formData.processing_time < 1) {
      errors.processing_time =
        lang === "sw"
          ? "Muda wa usindikaji hauwezi kuwa chini ya siku 1"
          : "Processing time cannot be less than 1 day";
    }

    // Category validation
    if (!formData.category) {
      errors.category =
        lang === "sw" ? "Aina ya huduma inahitajika" : "Service category is required";
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  }, [formData, lang]);

  // CRUD operations
  const handleSaveService = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      showToast(
        lang === "sw"
          ? "Tafadhali jaza taarifa zote zinazohitajika"
          : "Please fill all required fields",
        "error",
      );
      return;
    }

    setProcessing(true);

    try {
      // Construct service data
      const serviceData = {
        name: formData.name_en, // Default to English name
        name_en: formData.name_en,
        name_sw: formData.name_sw,
        description: formData.description_en,
        description_en: formData.description_en,
        description_sw: formData.description_sw,
        fee: formData.fee,
        currency: formData.currency,
        active: formData.active,
        processing_time: formData.processing_time,
        category: formData.category,
        required_documents: formData.required_documents || [],
        form_schema: formData.form_schema || [],
      };

      if (!isSupabaseConfigured) {
        // Demo mode - save to localStorage
        await new Promise((resolve) => setTimeout(resolve, 500));

        let updatedServices: Service[];

        if (editingService) {
          // Update existing service
          updatedServices = services.map((service) =>
            service.id === editingService.id
              ? { ...service, ...serviceData, id: service.id }
              : service,
          );
          showToast(lang === "sw" ? "Huduma imebadilishwa" : "Service updated", "success");
        } else {
          // Add new service
          const newService: Service = {
            ...serviceData,
            id: `demo-${Date.now()}`,
          };
          updatedServices = [...services, newService];
          showToast(lang === "sw" ? "Huduma imeongezwa" : "Service added", "success");
        }

        setServices(updatedServices);
        localStorage.setItem("demo_services", JSON.stringify(updatedServices));
        resetForm();
        return;
      }

      // Supabase operations
      if (editingService) {
        const { error } = await supabase
          .from("services")
          .update({
            ...serviceData,
            updated_at: new Date().toISOString(),
          })
          .eq("id", editingService.id);

        if (error) throw error;

        showToast(lang === "sw" ? "Huduma imebadilishwa" : "Service updated", "success");
      } else {
        const { error } = await supabase.from("services").insert([
          {
            ...serviceData,
            created_at: new Date().toISOString(),
          },
        ]);

        if (error) throw error;

        showToast(lang === "sw" ? "Huduma imeongezwa" : "Service added", "success");
      }

      resetForm();
      await fetchServices();
    } catch (error: unknown) {
      const _e = error as { message?: string };
      console.error("Error saving service:", error);
      showToast(
        _e.message || (lang === "sw" ? "Hitilafu ya kuhifadhi" : "Error saving service"),
        "error",
      );
    } finally {
      setProcessing(false);
    }
  };

  const handleDeleteService = async (id: string) => {
    if (
      !confirm(
        lang === "sw"
          ? "Je, una uhakika unataka kufuta huduma hii? Hatua hii haiwezi kutenduliwa."
          : "Are you sure you want to delete this service? This action cannot be undone.",
      )
    ) {
      return;
    }

    setProcessing(true);

    try {
      if (!isSupabaseConfigured) {
        // Demo mode - remove from localStorage
        await new Promise((resolve) => setTimeout(resolve, 300));
        const updatedServices = services.filter((service) => service.id !== id);
        setServices(updatedServices);
        localStorage.setItem("demo_services", JSON.stringify(updatedServices));
        showToast(lang === "sw" ? "Huduma imefutwa" : "Service deleted", "success");
        return;
      }

      const { error } = await supabase.from("services").delete().eq("id", id);

      if (error) throw error;

      showToast(lang === "sw" ? "Huduma imefutwa" : "Service deleted", "success");
      await fetchServices();
    } catch (error: unknown) {
      const _e = error as { message?: string };
      console.error("Error deleting service:", error);
      showToast(
        _e.message || (lang === "sw" ? "Hitilafu ya kufuta" : "Error deleting service"),
        "error",
      );
    } finally {
      setProcessing(false);
    }
  };

  const handleToggleStatus = async (id: string, currentStatus: boolean) => {
    setProcessing(true);

    try {
      if (!isSupabaseConfigured) {
        // Demo mode - update localStorage
        await new Promise((resolve) => setTimeout(resolve, 300));
        const updatedServices = services.map((service) =>
          service.id === id ? { ...service, active: !currentStatus } : service,
        );
        setServices(updatedServices);
        localStorage.setItem("demo_services", JSON.stringify(updatedServices));
        showToast(
          !currentStatus
            ? lang === "sw"
              ? "Huduma imewashwa"
              : "Service activated"
            : lang === "sw"
              ? "Huduma imezimwa"
              : "Service deactivated",
          "success",
        );
        return;
      }

      const { error } = await supabase
        .from("services")
        .update({ active: !currentStatus })
        .eq("id", id);

      if (error) throw error;

      showToast(
        !currentStatus
          ? lang === "sw"
            ? "Huduma imewashwa"
            : "Service activated"
          : lang === "sw"
            ? "Huduma imezimwa"
            : "Service deactivated",
        "success",
      );
      await fetchServices();
    } catch (error: unknown) {
      const _e = error as { message?: string };
      console.error("Error toggling service status:", error);
      showToast(_e.message || (lang === "sw" ? "Hitilafu" : "Error"), "error");
    } finally {
      setProcessing(false);
    }
  };

  const handleEditClick = (service: Service) => {
    setEditingService(service);
    setFormData({
      name_en: service.name_en,
      name_sw: service.name_sw,
      description_en: service.description_en,
      description_sw: service.description_sw,
      fee: service.fee,
      currency: service.currency || "TZS",
      active: service.active,
      processing_time: service.processing_time || 3,
      category: service.category || "general",
      required_documents: service.required_documents || [],
      form_schema: service.form_schema || [],
    });
    setShowAddModal(true);
  };

  const resetForm = () => {
    setShowAddModal(false);
    setEditingService(null);
    setFormData(INITIAL_FORM_DATA);
    setFormErrors({});
    setActiveTab("basic");
  };

  const openAddModal = () => {
    setEditingService(null);
    setFormData(INITIAL_FORM_DATA);
    setShowAddModal(true);
  };

  // Form schema management
  const addFormField = () => {
    const newField: FormField = {
      id: `field-${Date.now()}`,
      type: "text",
      label: "",
      label_en: "",
      label_sw: "",
      required: false,
    };
    setFormData({
      ...formData,
      form_schema: [...formData.form_schema, newField],
    });
  };

  const updateFormField = (index: number, field: Partial<FormField>) => {
    const updatedSchema = [...formData.form_schema];
    updatedSchema[index] = { ...updatedSchema[index], ...field };
    setFormData({ ...formData, form_schema: updatedSchema });
  };

  const removeFormField = (index: number) => {
    const updatedSchema = formData.form_schema.filter((_, i) => i !== index);
    setFormData({ ...formData, form_schema: updatedSchema });
  };

  // Required documents management
  const addRequiredDocument = (doc: string) => {
    if (!formData.required_documents.includes(doc)) {
      setFormData({
        ...formData,
        required_documents: [...formData.required_documents, doc],
      });
    }
  };

  const removeRequiredDocument = (doc: string) => {
    setFormData({
      ...formData,
      required_documents: formData.required_documents.filter((d) => d !== doc),
    });
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-8"
    >
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-stone-900 tracking-tight">
            {lang === "sw" ? "Usimamizi wa Huduma" : "Service Management"}
          </h1>
          <p className="text-stone-500 font-medium">
            {lang === "sw"
              ? "Simamia huduma na gharama za maombi"
              : "Manage services and application fees"}
          </p>
        </div>
        <button
          onClick={openAddModal}
          disabled={processing}
          className="h-14 px-8 bg-emerald-600 text-white rounded-2xl font-bold hover:bg-emerald-700 transition-all shadow-xl shadow-emerald-200 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Plus size={20} />
          {lang === "sw" ? "Ongeza Huduma Mpya" : "Add New Service"}
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-3xl border border-stone-100 shadow-xl">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-blue-50 text-blue-600 rounded-2xl">
              <FileText size={24} />
            </div>
            <span className="text-xs font-black text-stone-400">Total</span>
          </div>
          <p className="text-stone-500 text-sm font-bold uppercase tracking-widest">
            {lang === "sw" ? "Jumla ya Huduma" : "Total Services"}
          </p>
          <p className="text-3xl font-black text-stone-900 mt-1">{services.length}</p>
        </div>

        <div className="bg-white p-6 rounded-3xl border border-stone-100 shadow-xl">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-emerald-50 text-emerald-600 rounded-2xl">
              <CheckCircle2 size={24} />
            </div>
            <span className="text-xs font-black text-emerald-600 bg-emerald-50 px-2 py-1 rounded-lg">
              Active
            </span>
          </div>
          <p className="text-stone-500 text-sm font-bold uppercase tracking-widest">
            {lang === "sw" ? "Huduma Zinazotumika" : "Active Services"}
          </p>
          <p className="text-3xl font-black text-stone-900 mt-1">{activeServices.length}</p>
        </div>

        <div className="bg-white p-6 rounded-3xl border border-stone-100 shadow-xl">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-amber-50 text-amber-600 rounded-2xl">
              <Clock size={24} />
            </div>
            <span className="text-xs font-black text-amber-600 bg-amber-50 px-2 py-1 rounded-lg">
              Avg
            </span>
          </div>
          <p className="text-stone-500 text-sm font-bold uppercase tracking-widest">
            {lang === "sw" ? "Muda wa Usindikaji" : "Avg Processing"}
          </p>
          <p className="text-3xl font-black text-stone-900 mt-1">
            {services.length > 0
              ? Math.round(
                  services.reduce((acc, s) => acc + (s.processing_time || 3), 0) / services.length,
                )
              : 0}{" "}
            {lang === "sw" ? "siku" : "days"}
          </p>
        </div>
      </div>

      {/* Search */}
      <div className="bg-white rounded-3xl border border-stone-100 shadow-xl overflow-hidden">
        <div className="p-6 border-b border-stone-100 bg-stone-50/50">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-400" size={20} />
            <input
              type="text"
              placeholder={lang === "sw" ? "Tafuta huduma..." : "Search services..."}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              disabled={processing}
              className="w-full h-12 pl-12 pr-4 bg-white border border-stone-200 rounded-xl focus:ring-2 focus:ring-emerald-500 transition-all font-medium disabled:opacity-50"
            />
          </div>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="p-12 text-center">
            <Loader2 className="animate-spin mx-auto text-emerald-600 mb-2" size={32} />
            <p className="text-stone-400 font-bold">
              {lang === "sw" ? "Inapakia..." : "Loading..."}
            </p>
          </div>
        )}

        {/* Empty State */}
        {!loading && filteredServices.length === 0 && (
          <div className="p-12 text-center">
            <div className="w-20 h-20 mx-auto mb-4 bg-stone-100 rounded-full flex items-center justify-center">
              <Settings className="text-stone-400" size={32} />
            </div>
            <p className="text-stone-900 font-bold text-lg mb-1">
              {lang === "sw" ? "Hakuna huduma" : "No services found"}
            </p>
            <p className="text-stone-500 font-medium">
              {lang === "sw"
                ? "Bado hakuna huduma zilizoongezwa"
                : "No services have been added yet"}
            </p>
            <button
              onClick={openAddModal}
              className="mt-4 px-6 py-3 bg-emerald-600 text-white rounded-xl font-bold hover:bg-emerald-700 transition-all"
            >
              {lang === "sw" ? "Ongeza Huduma Mpya" : "Add New Service"}
            </button>
          </div>
        )}

        {/* Desktop Table View */}
        {!loading && filteredServices.length > 0 && (
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-stone-50/50 border-b border-stone-100">
                  <th className="px-6 py-4 text-xs font-bold text-stone-500 uppercase tracking-widest">
                    {lang === "sw" ? "Huduma" : "Service"}
                  </th>
                  <th className="px-6 py-4 text-xs font-bold text-stone-500 uppercase tracking-widest">
                    {lang === "sw" ? "Gharama" : "Fee"}
                  </th>
                  <th className="px-6 py-4 text-xs font-bold text-stone-500 uppercase tracking-widest">
                    {lang === "sw" ? "Muda" : "Processing"}
                  </th>
                  <th className="px-6 py-4 text-xs font-bold text-stone-500 uppercase tracking-widest">
                    {lang === "sw" ? "Aina" : "Category"}
                  </th>
                  <th className="px-6 py-4 text-xs font-bold text-stone-500 uppercase tracking-widest">
                    {lang === "sw" ? "Hali" : "Status"}
                  </th>
                  <th className="px-6 py-4 text-xs font-bold text-stone-500 uppercase tracking-widest text-right">
                    {lang === "sw" ? "Vitendo" : "Actions"}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-50">
                {filteredServices.map((service) => {
                  const category = SERVICE_CATEGORIES.find((c) => c.id === service.category);
                  return (
                    <tr key={service.id} className="hover:bg-stone-50/50 transition-colors group">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div
                            className={cn(
                              "w-10 h-10 rounded-xl flex items-center justify-center transition-colors",
                              "group-hover:bg-emerald-50 group-hover:text-emerald-600",
                              service.active
                                ? "bg-emerald-50 text-emerald-600"
                                : "bg-stone-100 text-stone-400",
                            )}
                          >
                            <FileText size={20} />
                          </div>
                          <div>
                            <p className="font-bold text-stone-900">
                              {lang === "sw" ? service.name_sw : service.name_en}
                            </p>
                            <p className="text-xs text-stone-400 line-clamp-1">
                              {lang === "sw" ? service.description_sw : service.description_en}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <p className="font-bold text-stone-900">
                          {formatCurrency(service.fee, userCurrency)}
                        </p>
                      </td>
                      <td className="px-6 py-4">
                        <p className="text-sm text-stone-600">
                          {service.processing_time || 3} {lang === "sw" ? "siku" : "days"}
                        </p>
                      </td>
                      <td className="px-6 py-4">
                        <span className="px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border bg-stone-50 text-stone-600 border-stone-100">
                          {category
                            ? lang === "sw"
                              ? category.sw
                              : category.en
                            : lang === "sw"
                              ? "Jumla"
                              : "General"}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <button
                          onClick={() => handleToggleStatus(service.id, service.active)}
                          disabled={processing}
                          className={cn(
                            "px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border transition-all flex items-center gap-1",
                            service.active
                              ? "bg-emerald-50 text-emerald-600 border-emerald-100 hover:bg-red-50 hover:text-red-600 hover:border-red-100"
                              : "bg-red-50 text-red-600 border-red-100 hover:bg-emerald-50 hover:text-emerald-600 hover:border-emerald-100",
                            processing && "opacity-50 cursor-not-allowed",
                          )}
                          title={
                            service.active
                              ? lang === "sw"
                                ? "Zima huduma"
                                : "Deactivate service"
                              : lang === "sw"
                                ? "Washa huduma"
                                : "Activate service"
                          }
                        >
                          {service.active ? (
                            <>
                              <CheckCircle2 size={12} />
                              {lang === "sw" ? "Inatumika" : "Active"}
                            </>
                          ) : (
                            <>
                              <AlertTriangle size={12} />
                              {lang === "sw" ? "Haiko" : "Inactive"}
                            </>
                          )}
                        </button>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => handleEditClick(service)}
                            disabled={processing}
                            className="p-2 hover:bg-stone-100 rounded-lg text-stone-400 hover:text-stone-900 transition-all disabled:opacity-50"
                            title={lang === "sw" ? "Hariri" : "Edit"}
                          >
                            <Edit2 size={18} />
                          </button>
                          <button
                            onClick={() => handleDeleteService(service.id)}
                            disabled={processing}
                            className="p-2 hover:bg-red-50 rounded-lg text-stone-400 hover:text-red-600 transition-all disabled:opacity-50"
                            title={lang === "sw" ? "Futa" : "Delete"}
                          >
                            <Trash2 size={18} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Mobile Card View */}
        {!loading && filteredServices.length > 0 && (
          <div className="md:hidden divide-y divide-stone-50">
            {filteredServices.map((service) => {
              const category = SERVICE_CATEGORIES.find((c) => c.id === service.category);
              return (
                <div key={service.id} className="p-4 space-y-3">
                  <div className="flex justify-between items-start">
                    <div className="flex items-center gap-3">
                      <div
                        className={cn(
                          "w-10 h-10 rounded-xl flex items-center justify-center",
                          service.active
                            ? "bg-emerald-50 text-emerald-600"
                            : "bg-stone-100 text-stone-400",
                        )}
                      >
                        <FileText size={20} />
                      </div>
                      <div>
                        <h3 className="font-bold text-stone-900">
                          {lang === "sw" ? service.name_sw : service.name_en}
                        </h3>
                        <p className="text-xs text-stone-500">
                          {formatCurrency(service.fee, userCurrency)} •{" "}
                          {service.processing_time || 3} {lang === "sw" ? "siku" : "days"}
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-1">
                      <button
                        title={lang === "sw" ? "Hariri" : "Edit"}
                        aria-label={lang === "sw" ? "Hariri huduma" : "Edit service"}
                        onClick={() => handleEditClick(service)}
                        disabled={processing}
                        className="p-2 hover:bg-stone-100 rounded-lg text-stone-400 disabled:opacity-50"
                      >
                        <Edit2 size={18} />
                      </button>
                      <button
                        title={lang === "sw" ? "Futa" : "Delete"}
                        aria-label={lang === "sw" ? "Futa huduma" : "Delete service"}
                        onClick={() => handleDeleteService(service.id)}
                        disabled={processing}
                        className="p-2 hover:bg-red-50 rounded-lg text-stone-400 disabled:opacity-50"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center justify-between bg-stone-50 p-3 rounded-xl border border-stone-100">
                    <div>
                      <p className="text-[10px] text-stone-400 font-bold uppercase tracking-widest mb-1">
                        {lang === "sw" ? "Aina" : "Category"}
                      </p>
                      <p className="text-xs font-medium text-stone-700">
                        {category
                          ? lang === "sw"
                            ? category.sw
                            : category.en
                          : lang === "sw"
                            ? "Jumla"
                            : "General"}
                      </p>
                    </div>
                    <button
                      onClick={() => handleToggleStatus(service.id, service.active)}
                      disabled={processing}
                      className={cn(
                        "px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest border transition-all flex items-center gap-1",
                        service.active
                          ? "bg-emerald-50 text-emerald-600 border-emerald-100"
                          : "bg-red-50 text-red-600 border-red-100",
                        processing && "opacity-50 cursor-not-allowed",
                      )}
                    >
                      {service.active ? (
                        <>
                          <CheckCircle2 size={12} />
                          {lang === "sw" ? "Inatumika" : "Active"}
                        </>
                      ) : (
                        <>
                          <AlertTriangle size={12} />
                          {lang === "sw" ? "Haiko" : "Inactive"}
                        </>
                      )}
                    </button>
                  </div>

                  <p className="text-xs text-stone-600 bg-stone-50 p-3 rounded-xl border border-stone-100">
                    {lang === "sw" ? service.description_sw : service.description_en}
                  </p>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Add/Edit Modal */}
      <AnimatePresence>
        {showAddModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={resetForm}
              className="absolute inset-0 bg-stone-900/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-4xl bg-white rounded-3xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col"
            >
              <div className="px-8 py-6 border-b border-stone-100 flex items-center justify-between">
                <h2 className="text-xl font-black text-stone-900 tracking-tight">
                  {editingService
                    ? lang === "sw"
                      ? "Hariri Huduma"
                      : "Edit Service"
                    : lang === "sw"
                      ? "Ongeza Huduma Mpya"
                      : "Add New Service"}
                </h2>
                <button
                  title={lang === "sw" ? "Funga" : "Close"}
                  aria-label={lang === "sw" ? "Funga fomu" : "Close form"}
                  onClick={resetForm}
                  disabled={processing}
                  className="p-2 hover:bg-stone-100 rounded-full transition-colors text-stone-400 disabled:opacity-50"
                >
                  <X size={20} />
                </button>
              </div>

              {/* Tab Navigation */}
              <div className="flex gap-2 px-8 pt-4 border-b border-stone-100">
                {(["basic", "schema", "documents"] as const).map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={cn(
                      "px-4 py-2 font-bold text-sm transition-all rounded-t-lg",
                      activeTab === tab
                        ? "text-emerald-600 border-b-2 border-emerald-600"
                        : "text-stone-400 hover:text-stone-600",
                    )}
                  >
                    {tab === "basic" && (lang === "sw" ? "Msingi" : "Basic Info")}
                    {tab === "schema" && (lang === "sw" ? "Fomu" : "Form Schema")}
                    {tab === "documents" && (lang === "sw" ? "Nyaraka" : "Documents")}
                  </button>
                ))}
              </div>

              <form onSubmit={handleSaveService} className="flex-1 overflow-y-auto">
                <div className="p-8 space-y-6">
                  {/* Basic Info Tab */}
                  {activeTab === "basic" && (
                    <>
                      {/* Service Names */}
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <label className="text-xs font-bold text-stone-500 uppercase tracking-widest ml-1">
                            {lang === "sw" ? "Jina (Kiingereza)" : "Name (English)"}{" "}
                            <span className="text-red-500">*</span>
                          </label>
                          <input
                            type="text"
                            required
                            value={formData.name_en}
                            onChange={(e) => {
                              setFormData({ ...formData, name_en: e.target.value });
                              if (formErrors.name_en) {
                                setFormErrors({ ...formErrors, name_en: undefined });
                              }
                            }}
                            className={cn(
                              "w-full h-14 px-4 bg-stone-50 border rounded-2xl focus:ring-2 focus:ring-emerald-500 transition-all font-medium",
                              formErrors.name_en ? "border-red-300 bg-red-50" : "border-stone-200",
                            )}
                            placeholder="e.g. Birth Certificate"
                            disabled={processing}
                          />
                          {formErrors.name_en && (
                            <p className="text-xs text-red-600 font-medium flex items-center gap-1 mt-1">
                              <AlertTriangle size={12} />
                              {formErrors.name_en}
                            </p>
                          )}
                        </div>
                        <div className="space-y-2">
                          <label className="text-xs font-bold text-stone-500 uppercase tracking-widest ml-1">
                            {lang === "sw" ? "Jina (Kiswahili)" : "Name (Swahili)"}{" "}
                            <span className="text-red-500">*</span>
                          </label>
                          <input
                            type="text"
                            required
                            value={formData.name_sw}
                            onChange={(e) => {
                              setFormData({ ...formData, name_sw: e.target.value });
                              if (formErrors.name_sw) {
                                setFormErrors({ ...formErrors, name_sw: undefined });
                              }
                            }}
                            className={cn(
                              "w-full h-14 px-4 bg-stone-50 border rounded-2xl focus:ring-2 focus:ring-emerald-500 transition-all font-medium",
                              formErrors.name_sw ? "border-red-300 bg-red-50" : "border-stone-200",
                            )}
                            placeholder="Mf. Cheti cha Kuzaliwa"
                            disabled={processing}
                          />
                          {formErrors.name_sw && (
                            <p className="text-xs text-red-600 font-medium flex items-center gap-1 mt-1">
                              <AlertTriangle size={12} />
                              {formErrors.name_sw}
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Descriptions */}
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <label className="text-xs font-bold text-stone-500 uppercase tracking-widest ml-1">
                            {lang === "sw" ? "Maelezo (Kiingereza)" : "Description (English)"}{" "}
                            <span className="text-red-500">*</span>
                          </label>
                          <textarea
                            required
                            value={formData.description_en}
                            onChange={(e) => {
                              setFormData({ ...formData, description_en: e.target.value });
                              if (formErrors.description_en) {
                                setFormErrors({ ...formErrors, description_en: undefined });
                              }
                            }}
                            className={cn(
                              "w-full h-32 p-4 bg-stone-50 border rounded-2xl focus:ring-2 focus:ring-emerald-500 transition-all font-medium resize-none",
                              formErrors.description_en
                                ? "border-red-300 bg-red-50"
                                : "border-stone-200",
                            )}
                            placeholder="Enter service description in English"
                            disabled={processing}
                          />
                          {formErrors.description_en && (
                            <p className="text-xs text-red-600 font-medium flex items-center gap-1 mt-1">
                              <AlertTriangle size={12} />
                              {formErrors.description_en}
                            </p>
                          )}
                        </div>
                        <div className="space-y-2">
                          <label className="text-xs font-bold text-stone-500 uppercase tracking-widest ml-1">
                            {lang === "sw" ? "Maelezo (Kiswahili)" : "Description (Swahili)"}{" "}
                            <span className="text-red-500">*</span>
                          </label>
                          <textarea
                            required
                            value={formData.description_sw}
                            onChange={(e) => {
                              setFormData({ ...formData, description_sw: e.target.value });
                              if (formErrors.description_sw) {
                                setFormErrors({ ...formErrors, description_sw: undefined });
                              }
                            }}
                            className={cn(
                              "w-full h-32 p-4 bg-stone-50 border rounded-2xl focus:ring-2 focus:ring-emerald-500 transition-all font-medium resize-none",
                              formErrors.description_sw
                                ? "border-red-300 bg-red-50"
                                : "border-stone-200",
                            )}
                            placeholder="Ingiza maelezo ya huduma kwa Kiswahili"
                            disabled={processing}
                          />
                          {formErrors.description_sw && (
                            <p className="text-xs text-red-600 font-medium flex items-center gap-1 mt-1">
                              <AlertTriangle size={12} />
                              {formErrors.description_sw}
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Fee and Processing Time */}
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <label className="text-xs font-bold text-stone-500 uppercase tracking-widest ml-1">
                            {lang === "sw" ? "Gharama" : "Fee"}{" "}
                            <span className="text-red-500">*</span>
                          </label>
                          <div className="relative">
                            <DollarSign
                              className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-400"
                              size={20}
                            />
                            <input
                              type="number"
                              required
                              min="0"
                              step="100"
                              value={formData.fee}
                              onChange={(e) => {
                                setFormData({ ...formData, fee: Number(e.target.value) });
                                if (formErrors.fee) {
                                  setFormErrors({ ...formErrors, fee: undefined });
                                }
                              }}
                              className={cn(
                                "w-full h-14 pl-12 pr-4 bg-stone-50 border rounded-2xl focus:ring-2 focus:ring-emerald-500 transition-all font-medium",
                                formErrors.fee ? "border-red-300 bg-red-50" : "border-stone-200",
                              )}
                              placeholder="5000"
                              disabled={processing}
                            />
                          </div>
                          {formErrors.fee && (
                            <p className="text-xs text-red-600 font-medium flex items-center gap-1 mt-1">
                              <AlertTriangle size={12} />
                              {formErrors.fee}
                            </p>
                          )}
                        </div>
                        <div className="space-y-2">
                          <label className="text-xs font-bold text-stone-500 uppercase tracking-widest ml-1">
                            {lang === "sw" ? "Muda wa Usindikaji (siku)" : "Processing Time (days)"}{" "}
                            <span className="text-red-500">*</span>
                          </label>
                          <input
                            type="number"
                            required
                            min="1"
                            value={formData.processing_time}
                            onChange={(e) => {
                              setFormData({ ...formData, processing_time: Number(e.target.value) });
                              if (formErrors.processing_time) {
                                setFormErrors({ ...formErrors, processing_time: undefined });
                              }
                            }}
                            className={cn(
                              "w-full h-14 px-4 bg-stone-50 border rounded-2xl focus:ring-2 focus:ring-emerald-500 transition-all font-medium",
                              formErrors.processing_time
                                ? "border-red-300 bg-red-50"
                                : "border-stone-200",
                            )}
                            placeholder="3"
                            disabled={processing}
                          />
                          {formErrors.processing_time && (
                            <p className="text-xs text-red-600 font-medium flex items-center gap-1 mt-1">
                              <AlertTriangle size={12} />
                              {formErrors.processing_time}
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Category */}
                      <div className="space-y-2">
                        <label className="text-xs font-bold text-stone-500 uppercase tracking-widest ml-1">
                          {lang === "sw" ? "Aina ya Huduma" : "Service Category"}{" "}
                          <span className="text-red-500">*</span>
                        </label>
                        <select
                          required
                          title={
                            lang === "sw" ? "Chagua aina ya huduma" : "Select service category"
                          }
                          aria-label={lang === "sw" ? "Aina ya huduma" : "Service category"}
                          value={formData.category}
                          onChange={(e) => {
                            setFormData({ ...formData, category: e.target.value });
                            if (formErrors.category) {
                              setFormErrors({ ...formErrors, category: undefined });
                            }
                          }}
                          disabled={processing}
                          className={cn(
                            "w-full h-14 px-4 bg-stone-50 border rounded-2xl focus:ring-2 focus:ring-emerald-500 transition-all font-medium",
                            formErrors.category ? "border-red-300 bg-red-50" : "border-stone-200",
                          )}
                        >
                          <option value="">
                            {lang === "sw" ? "Chagua aina ya huduma" : "Select category"}
                          </option>
                          {SERVICE_CATEGORIES.map((cat) => (
                            <option key={cat.id} value={cat.id}>
                              {lang === "sw" ? cat.sw : cat.en}
                            </option>
                          ))}
                        </select>
                        {formErrors.category && (
                          <p className="text-xs text-red-600 font-medium flex items-center gap-1 mt-1">
                            <AlertTriangle size={12} />
                            {formErrors.category}
                          </p>
                        )}
                      </div>

                      {/* Status Toggle */}
                      <div className="flex items-center gap-3 p-4 bg-stone-50 rounded-2xl border border-stone-200">
                        <button
                          type="button"
                          onClick={() => setFormData({ ...formData, active: !formData.active })}
                          className="focus:outline-none"
                        >
                          {formData.active ? (
                            <ToggleRight size={32} className="text-emerald-600" />
                          ) : (
                            <ToggleLeft size={32} className="text-stone-400" />
                          )}
                        </button>
                        <div>
                          <p className="font-bold text-stone-900">
                            {formData.active
                              ? lang === "sw"
                                ? "Huduma Inatumika"
                                : "Service Active"
                              : lang === "sw"
                                ? "Huduma Haifanyi kazi"
                                : "Service Inactive"}
                          </p>
                          <p className="text-xs text-stone-500">
                            {formData.active
                              ? lang === "sw"
                                ? "Wananchi wataweza kuomba huduma hii"
                                : "Citizens can apply for this service"
                              : lang === "sw"
                                ? "Huduma haitaonekana kwa wananchi"
                                : "Service will be hidden from citizens"}
                          </p>
                        </div>
                      </div>
                    </>
                  )}

                  {/* Form Schema Tab */}
                  {activeTab === "schema" && (
                    <div className="space-y-6">
                      <div className="flex items-center justify-between">
                        <h3 className="text-lg font-bold text-stone-900">
                          {lang === "sw" ? "Sehemu za Fomu" : "Form Fields"}
                        </h3>
                        <button
                          type="button"
                          onClick={addFormField}
                          className="px-4 py-2 bg-emerald-600 text-white rounded-xl font-bold hover:bg-emerald-700 transition-all flex items-center gap-2"
                        >
                          <PlusCircle size={18} />
                          {lang === "sw" ? "Ongeza Sehemu" : "Add Field"}
                        </button>
                      </div>

                      {formData.form_schema.length === 0 ? (
                        <div className="p-8 text-center bg-stone-50 rounded-3xl border-2 border-dashed border-stone-200">
                          <Layers size={40} className="mx-auto text-stone-300 mb-3" />
                          <p className="text-stone-500 font-medium">
                            {lang === "sw"
                              ? 'Bado hakuna sehemu za fomu. Bonyeza "Ongeza Sehemu" kuongeza.'
                              : 'No form fields yet. Click "Add Field" to add fields.'}
                          </p>
                        </div>
                      ) : (
                        <div className="space-y-4">
                          {formData.form_schema.map((field, index) => (
                            <div
                              key={field.id}
                              className="p-4 bg-stone-50 rounded-2xl border border-stone-200 space-y-4"
                            >
                              <div className="flex items-center justify-between">
                                <h4 className="font-bold text-stone-700">
                                  {lang === "sw" ? "Sehemu" : "Field"} #{index + 1}
                                </h4>
                                <button
                                  type="button"
                                  title={lang === "sw" ? "Ondoa sehemu" : "Remove field"}
                                  aria-label={lang === "sw" ? "Ondoa sehemu" : "Remove form field"}
                                  onClick={() => removeFormField(index)}
                                  className="p-1 hover:bg-red-100 rounded-lg text-red-600 transition-colors"
                                >
                                  <MinusCircle size={18} />
                                </button>
                              </div>

                              <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                  <label className="text-xs font-bold text-stone-500 uppercase tracking-widest">
                                    {lang === "sw" ? "Aina" : "Type"}
                                  </label>
                                  <select
                                    title={
                                      lang === "sw" ? "Chagua aina ya sehemu" : "Select field type"
                                    }
                                    aria-label={lang === "sw" ? "Aina ya sehemu" : "Field type"}
                                    value={field.type}
                                    onChange={(e) =>
                                      updateFormField(index, {
                                        type: e.target.value as FormField["type"],
                                      })
                                    }
                                    className="w-full h-10 px-3 bg-white border border-stone-200 rounded-xl focus:ring-2 focus:ring-emerald-500 transition-all"
                                  >
                                    <option value="text">Text</option>
                                    <option value="number">Number</option>
                                    <option value="email">Email</option>
                                    <option value="tel">Phone</option>
                                    <option value="date">Date</option>
                                    <option value="select">Select</option>
                                    <option value="checkbox">Checkbox</option>
                                    <option value="file">File</option>
                                  </select>
                                </div>

                                <div className="space-y-2">
                                  <label className="text-xs font-bold text-stone-500 uppercase tracking-widest">
                                    {lang === "sw" ? "Lazima" : "Required"}
                                  </label>
                                  <div className="flex items-center h-10">
                                    <label className="flex items-center gap-2">
                                      <input
                                        type="checkbox"
                                        checked={field.required}
                                        onChange={(e) =>
                                          updateFormField(index, { required: e.target.checked })
                                        }
                                        className="w-5 h-5 rounded border-stone-300 text-emerald-600 focus:ring-emerald-500"
                                      />
                                      <span className="text-sm text-stone-700">
                                        {lang === "sw" ? "Lazima ijazwe" : "Required field"}
                                      </span>
                                    </label>
                                  </div>
                                </div>
                              </div>

                              <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                  <label className="text-xs font-bold text-stone-500 uppercase tracking-widest">
                                    {lang === "sw" ? "Lebo (Kiingereza)" : "Label (English)"}
                                  </label>
                                  <input
                                    type="text"
                                    value={field.label_en}
                                    onChange={(e) =>
                                      updateFormField(index, {
                                        label_en: e.target.value,
                                        label: e.target.value,
                                      })
                                    }
                                    className="w-full h-10 px-3 bg-white border border-stone-200 rounded-xl focus:ring-2 focus:ring-emerald-500 transition-all"
                                    placeholder="Full Name"
                                  />
                                </div>
                                <div className="space-y-2">
                                  <label className="text-xs font-bold text-stone-500 uppercase tracking-widest">
                                    {lang === "sw" ? "Lebo (Kiswahili)" : "Label (Swahili)"}
                                  </label>
                                  <input
                                    type="text"
                                    value={field.label_sw}
                                    onChange={(e) =>
                                      updateFormField(index, { label_sw: e.target.value })
                                    }
                                    className="w-full h-10 px-3 bg-white border border-stone-200 rounded-xl focus:ring-2 focus:ring-emerald-500 transition-all"
                                    placeholder="Jina Kamili"
                                  />
                                </div>
                              </div>

                              {field.type === "select" && (
                                <div className="space-y-2">
                                  <label className="text-xs font-bold text-stone-500 uppercase tracking-widest">
                                    {lang === "sw" ? "Chaguzi" : "Options"}
                                  </label>
                                  <input
                                    type="text"
                                    value={field.options?.join(", ") || ""}
                                    onChange={(e) =>
                                      updateFormField(index, {
                                        options: e.target.value.split(",").map((opt) => opt.trim()),
                                      })
                                    }
                                    className="w-full h-10 px-3 bg-white border border-stone-200 rounded-xl focus:ring-2 focus:ring-emerald-500 transition-all"
                                    placeholder="Option 1, Option 2, Option 3"
                                  />
                                  <p className="text-xs text-stone-400">
                                    {lang === "sw"
                                      ? "Tenganisha chaguzi kwa koma"
                                      : "Separate options with commas"}
                                  </p>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Documents Tab */}
                  {activeTab === "documents" && (
                    <div className="space-y-6">
                      <h3 className="text-lg font-bold text-stone-900">
                        {lang === "sw" ? "Nyaraka Zinazohitajika" : "Required Documents"}
                      </h3>

                      <div className="grid grid-cols-2 gap-4">
                        {[
                          "nida",
                          "birth_certificate",
                          "passport",
                          "photo",
                          "parent_id",
                          "parent_consent",
                          "marriage_certificate",
                          "death_certificate",
                        ].map((doc) => {
                          const docLabels: Record<string, { en: string; sw: string }> = {
                            nida: { en: "NIDA ID", sw: "Kitambulisho cha NIDA" },
                            birth_certificate: {
                              en: "Birth Certificate",
                              sw: "Cheti cha Kuzaliwa",
                            },
                            passport: { en: "Passport", sw: "Pasipoti" },
                            photo: { en: "Passport Photo", sw: "Picha ya Pasipoti" },
                            parent_id: { en: "Parent ID", sw: "Kitambulisho cha Mzazi" },
                            parent_consent: { en: "Parent Consent", sw: "Idhini ya Mzazi" },
                            marriage_certificate: {
                              en: "Marriage Certificate",
                              sw: "Cheti cha Ndoa",
                            },
                            death_certificate: { en: "Death Certificate", sw: "Cheti cha Kifo" },
                          };

                          const isSelected = formData.required_documents.includes(doc);

                          return (
                            <button
                              key={doc}
                              type="button"
                              onClick={() =>
                                isSelected ? removeRequiredDocument(doc) : addRequiredDocument(doc)
                              }
                              className={cn(
                                "p-4 rounded-2xl border-2 transition-all text-left",
                                isSelected
                                  ? "bg-emerald-50 border-emerald-600"
                                  : "bg-white border-stone-200 hover:border-emerald-300",
                              )}
                            >
                              <p className="font-bold text-stone-900">
                                {lang === "sw" ? docLabels[doc].sw : docLabels[doc].en}
                              </p>
                              {isSelected && (
                                <p className="text-xs text-emerald-600 font-medium mt-1">
                                  {lang === "sw" ? "Imechaguliwa" : "Selected"}
                                </p>
                              )}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>

                {/* Form Actions */}
                <div className="px-8 py-6 border-t border-stone-100 bg-stone-50/50">
                  <div className="flex gap-4">
                    <button
                      type="button"
                      onClick={resetForm}
                      disabled={processing}
                      className="flex-1 h-14 bg-white border border-stone-200 text-stone-700 rounded-2xl font-bold hover:bg-stone-50 transition-all disabled:opacity-50"
                    >
                      {lang === "sw" ? "Ghairi" : "Cancel"}
                    </button>
                    <button
                      disabled={processing}
                      className="flex-1 h-14 bg-stone-900 text-white rounded-2xl font-bold text-lg hover:bg-stone-800 transition-all flex items-center justify-center gap-2 shadow-xl shadow-stone-200 disabled:opacity-50 disabled:cursor-not-allowed"
                      type="submit"
                    >
                      {processing ? (
                        <>
                          <Loader2 className="animate-spin" size={20} />
                          {lang === "sw" ? "Inahifadhi..." : "Saving..."}
                        </>
                      ) : editingService ? (
                        lang === "sw" ? (
                          "Hifadhi Mabadiliko"
                        ) : (
                          "Save Changes"
                        )
                      ) : lang === "sw" ? (
                        "Ongeza Huduma"
                      ) : (
                        "Add Service"
                      )}
                    </button>
                  </div>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
