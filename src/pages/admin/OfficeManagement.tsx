import React, { useState, useEffect, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Building2,
  Plus,
  Search,
  X,
  Loader2,
  Trash2,
  Edit2,
  MapPin,
  AlertTriangle,
  CheckCircle2,
  Users,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { IS_SUPABASE_CONFIGURED } from "@/lib/config";
import { useLanguage } from "@/context/LanguageContext";
import { useToast } from "@/context/ToastContext";
import { cn } from "@/lib/utils";

interface VirtualOffice {
  id: string;
  name: string;
  name_en?: string;
  name_sw?: string;
  level: "region" | "district";
  region: string;
  region_id?: string;
  district?: string | null;
  district_id?: string | null;
  address?: string | null;
  phone?: string | null;
  email?: string | null;
  active: boolean;
  created_at?: string;
  updated_at?: string;
}

interface OfficeFormData {
  name: string;
  name_en: string;
  name_sw: string;
  level: "region" | "district";
  region: string;
  region_id: string;
  district: string;
  district_id: string;
  address: string;
  phone: string;
  email: string;
  active: boolean;
}

interface DemoOffice extends VirtualOffice {
  isDemo?: boolean;
}

const DEMO_OFFICES: DemoOffice[] = [
  {
    id: "demo-1",
    name: "Dar es Salaam Regional Office",
    name_en: "Dar es Salaam Regional Office",
    name_sw: "Ofisi ya Mkoa wa Dar es Salaam",
    level: "region",
    region: "Dar es Salaam",
    region_id: "demo-1",
    address: "Samora Avenue, Dar es Salaam",
    phone: "+255 22 2123456",
    email: "regional.dar@emtaa.go.tz",
    active: true,
  },
  {
    id: "demo-2",
    name: "Kinondoni District Office",
    name_en: "Kinondoni District Office",
    name_sw: "Ofisi ya Wilaya ya Kinondoni",
    level: "district",
    region: "Dar es Salaam",
    region_id: "demo-1",
    district: "Kinondoni",
    district_id: "demo-3",
    address: "Morogoro Road, Kinondoni",
    phone: "+255 22 2765432",
    email: "district.kinondoni@emtaa.go.tz",
    active: true,
  },
  {
    id: "demo-3",
    name: "Ilala District Office",
    name_en: "Ilala District Office",
    name_sw: "Ofisi ya Wilaya ya Ilala",
    level: "district",
    region: "Dar es Salaam",
    region_id: "demo-1",
    district: "Ilala",
    district_id: "demo-4",
    address: "Gerezani Street, Ilala",
    phone: "+255 22 2123457",
    email: "district.ilala@emtaa.go.tz",
    active: true,
  },
];

const INITIAL_FORM_DATA: OfficeFormData = {
  name: "",
  name_en: "",
  name_sw: "",
  level: "region",
  region: "",
  region_id: "",
  district: "",
  district_id: "",
  address: "",
  phone: "",
  email: "",
  active: true,
};

interface Location {
  id: string;
  name: string;
  level: string;
  parent_id?: string;
}

export function OfficeManagement() {
  const { lang, currency } = useLanguage();
  const { showToast } = useToast();

  // State management
  const [offices, setOffices] = useState<VirtualOffice[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [loading, setLoading] = useState(true);
  const [locationsLoading, setLocationsLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [processing, setProcessing] = useState(false);
  const [editingOffice, setEditingOffice] = useState<VirtualOffice | null>(null);
  const [formData, setFormData] = useState<OfficeFormData>(INITIAL_FORM_DATA);
  const [formErrors, setFormErrors] = useState<Partial<Record<keyof OfficeFormData, string>>>({});
  const [expandedOfficeId, setExpandedOfficeId] = useState<string | null>(null);
  const [officeStaff, setOfficeStaff] = useState<
    {
      id: string;
      first_name: string;
      last_name: string;
      email: string;
      phone?: string;
      role: string;
      position?: string;
    }[]
  >([]);
  const [loadingStaff, setLoadingStaff] = useState(false);

  // Fetch staff assigned to an office (by office_id or matching region/district)
  const fetchOfficeStaff = async (office: VirtualOffice) => {
    if (expandedOfficeId === office.id) {
      setExpandedOfficeId(null);
      setOfficeStaff([]);
      return;
    }
    setExpandedOfficeId(office.id);
    setLoadingStaff(true);
    try {
      let query = supabase
        .from("users")
        .select("id, first_name, last_name, email, phone, role, position, department")
        .in("role", ["staff", "admin"])
        .order("first_name");

      // Match by office_id OR by assigned region/district
      if (office.district) {
        query = query.or(
          `office_id.eq.${office.id},and(assigned_region.eq.${office.region},assigned_district.eq.${office.district})`,
        );
      } else {
        query = query.or(`office_id.eq.${office.id},assigned_region.eq.${office.region}`);
      }

      const { data, error } = await query;
      if (error) {
        console.error("Error fetching staff:", error);
        setOfficeStaff([]);
      } else {
        setOfficeStaff(data || []);
      }
    } catch {
      setOfficeStaff([]);
    } finally {
      setLoadingStaff(false);
    }
  };

  // Computed properties
  const isSupabaseConfigured = useMemo(() => {
    return IS_SUPABASE_CONFIGURED;
  }, []);

  const filteredOffices = useMemo(() => {
    return offices.filter((office) => {
      const searchLower = searchTerm.toLowerCase();
      return (
        office.name.toLowerCase().includes(searchLower) ||
        office.name_en?.toLowerCase().includes(searchLower) ||
        office.name_sw?.toLowerCase().includes(searchLower) ||
        office.region.toLowerCase().includes(searchLower) ||
        office.district?.toLowerCase().includes(searchLower) ||
        office.email?.toLowerCase().includes(searchLower) ||
        office.phone?.includes(searchTerm)
      );
    });
  }, [offices, searchTerm]);

  const regions = useMemo(() => {
    return locations.filter((l) => l.level === "region");
  }, [locations]);

  const districts = useMemo(() => {
    if (!formData.region_id) return [];
    return locations.filter((l) => l.level === "district" && l.parent_id === formData.region_id);
  }, [locations, formData.region_id]);

  // Data fetching
  const fetchOffices = useCallback(async () => {
    setLoading(true);
    try {
      if (!isSupabaseConfigured) {
        // Demo mode - load from localStorage or use defaults
        await new Promise((resolve) => setTimeout(resolve, 500));
        const savedOffices = localStorage.getItem("demo_offices");
        if (savedOffices) {
          setOffices(JSON.parse(savedOffices));
        } else {
          setOffices(DEMO_OFFICES);
          localStorage.setItem("demo_offices", JSON.stringify(DEMO_OFFICES));
        }
        return;
      }

      const { data, error } = await supabase
        .from("offices")
        .select("*")
        .order("name", { ascending: true });

      if (error) {
        console.error("Error fetching offices:", error);
        showToast(lang === "sw" ? "Hitilafu kupakia ofisi" : "Error loading offices", "error");
        setOffices(DEMO_OFFICES);
        return;
      }

      if (data && data.length > 0) {
        setOffices(data);
      } else {
        setOffices(DEMO_OFFICES);
      }
    } catch (error) {
      console.error("Exception in fetchOffices:", error);
      showToast(lang === "sw" ? "Hitilafu ya mfumo" : "System error", "error");
      setOffices(DEMO_OFFICES);
    } finally {
      setLoading(false);
    }
  }, [isSupabaseConfigured, lang, showToast]);

  const fetchLocations = useCallback(async () => {
    setLocationsLoading(true);
    try {
      if (!isSupabaseConfigured) {
        // Demo mode - create sample locations
        await new Promise((resolve) => setTimeout(resolve, 300));
        const demoLocations = [
          { id: "demo-1", name: "Dar es Salaam", level: "region" },
          { id: "demo-2", name: "Arusha", level: "region" },
          { id: "demo-3", name: "Kinondoni", level: "district", parent_id: "demo-1" },
          { id: "demo-4", name: "Ilala", level: "district", parent_id: "demo-1" },
          { id: "demo-5", name: "Arusha MJ", level: "district", parent_id: "demo-2" },
        ];
        setLocations(demoLocations);
        return;
      }

      const { data, error } = await supabase
        .from("locations")
        .select("id, name, level, parent_id")
        .in("level", ["region", "district"])
        .order("name");

      if (error) {
        console.error("Error fetching locations:", error);
        return;
      }

      if (data) {
        setLocations(data);
      }
    } catch (error) {
      console.error("Exception in fetchLocations:", error);
    } finally {
      setLocationsLoading(false);
    }
  }, [isSupabaseConfigured]);

  useEffect(() => {
    Promise.all([fetchOffices(), fetchLocations()]);
  }, [fetchOffices, fetchLocations]);

  // Form validation
  const validateForm = useCallback((): boolean => {
    const errors: Partial<Record<keyof OfficeFormData, string>> = {};

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

    // Region validation
    if (!formData.region_id) {
      errors.region_id = lang === "sw" ? "Mkoa unahitajika" : "Region is required";
    }

    // District validation for district level
    if (formData.level === "district" && !formData.district_id) {
      errors.district_id = lang === "sw" ? "Wilaya inahitajika" : "District is required";
    }

    // Email validation (optional but must be valid if provided)
    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      errors.email = lang === "sw" ? "Barua pepe si sahihi" : "Invalid email format";
    }

    // Phone validation (optional)
    if (formData.phone && !/^[\d\s+\-()]{8,}$/.test(formData.phone)) {
      errors.phone = lang === "sw" ? "Namba ya simu si sahihi" : "Invalid phone number";
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  }, [formData, lang]);

  // CRUD operations
  const handleSaveOffice = async (e: React.FormEvent) => {
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
      // Construct office data
      const officeData = {
        name: formData.name_en, // Default to English name
        name_en: formData.name_en,
        name_sw: formData.name_sw,
        level: formData.level,
        region: regions.find((r) => r.id === formData.region_id)?.name || formData.region,
        region_id: formData.region_id,
        district:
          formData.level === "district"
            ? districts.find((d) => d.id === formData.district_id)?.name || formData.district
            : null,
        district_id: formData.level === "district" ? formData.district_id : null,
        address: formData.address || null,
        phone: formData.phone || null,
        email: formData.email || null,
        active: formData.active,
      };

      if (!isSupabaseConfigured) {
        // Demo mode - save to localStorage
        await new Promise((resolve) => setTimeout(resolve, 500));

        let updatedOffices: VirtualOffice[];

        if (editingOffice) {
          // Update existing office
          updatedOffices = offices.map((office) =>
            office.id === editingOffice.id ? { ...office, ...officeData, id: office.id } : office,
          );
          showToast(lang === "sw" ? "Ofisi imebadilishwa" : "Office updated", "success");
        } else {
          // Add new office
          const newOffice: VirtualOffice = {
            ...officeData,
            id: `demo-${Date.now()}`,
          };
          updatedOffices = [...offices, newOffice];
          showToast(lang === "sw" ? "Ofisi imeongezwa" : "Office added", "success");
        }

        setOffices(updatedOffices);
        localStorage.setItem("demo_offices", JSON.stringify(updatedOffices));
        resetForm();
        return;
      }

      // Supabase operations
      if (editingOffice) {
        const { error } = await supabase
          .from("offices")
          .update({
            ...officeData,
            updated_at: new Date().toISOString(),
          })
          .eq("id", editingOffice.id);

        if (error) throw error;

        showToast(lang === "sw" ? "Ofisi imebadilishwa" : "Office updated", "success");
      } else {
        const { error } = await supabase.from("offices").insert([
          {
            ...officeData,
            created_at: new Date().toISOString(),
          },
        ]);

        if (error) throw error;

        showToast(lang === "sw" ? "Ofisi imeongezwa" : "Office added", "success");
      }

      resetForm();
      await fetchOffices();
    } catch (error: unknown) {
      const _e = error as { message?: string };
      console.error("Error saving office:", error);
      showToast(
        _e.message || (lang === "sw" ? "Hitilafu ya kuhifadhi" : "Error saving office"),
        "error",
      );
    } finally {
      setProcessing(false);
    }
  };

  const handleDeleteOffice = async (id: string) => {
    if (
      !confirm(
        lang === "sw"
          ? "Je, una uhakika unataka kufuta ofisi hii? Hatua hii haiwezi kutenduliwa."
          : "Are you sure you want to delete this office? This action cannot be undone.",
      )
    ) {
      return;
    }

    setProcessing(true);

    try {
      if (!isSupabaseConfigured) {
        // Demo mode - remove from localStorage
        await new Promise((resolve) => setTimeout(resolve, 300));
        const updatedOffices = offices.filter((office) => office.id !== id);
        setOffices(updatedOffices);
        localStorage.setItem("demo_offices", JSON.stringify(updatedOffices));
        showToast(lang === "sw" ? "Ofisi imefutwa" : "Office deleted", "success");
        return;
      }

      const { error } = await supabase.from("offices").delete().eq("id", id);

      if (error) throw error;

      showToast(lang === "sw" ? "Ofisi imefutwa" : "Office deleted", "success");
      await fetchOffices();
    } catch (error: unknown) {
      const _e = error as { message?: string };
      console.error("Error deleting office:", error);
      showToast(
        _e.message || (lang === "sw" ? "Hitilafu ya kufuta" : "Error deleting office"),
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
        const updatedOffices = offices.map((office) =>
          office.id === id ? { ...office, active: !currentStatus } : office,
        );
        setOffices(updatedOffices);
        localStorage.setItem("demo_offices", JSON.stringify(updatedOffices));
        showToast(
          !currentStatus
            ? lang === "sw"
              ? "Ofisi imewashwa"
              : "Office activated"
            : lang === "sw"
              ? "Ofisi imezimwa"
              : "Office deactivated",
          "success",
        );
        return;
      }

      const { error } = await supabase
        .from("offices")
        .update({ active: !currentStatus })
        .eq("id", id);

      if (error) throw error;

      showToast(
        !currentStatus
          ? lang === "sw"
            ? "Ofisi imewashwa"
            : "Office activated"
          : lang === "sw"
            ? "Ofisi imezimwa"
            : "Office deactivated",
        "success",
      );
      await fetchOffices();
    } catch (error: unknown) {
      const _e = error as { message?: string };
      console.error("Error toggling office status:", error);
      showToast(_e.message || (lang === "sw" ? "Hitilafu" : "Error"), "error");
    } finally {
      setProcessing(false);
    }
  };

  const handleEditClick = (office: VirtualOffice) => {
    setEditingOffice(office);
    setFormData({
      name: office.name,
      name_en: office.name_en || office.name,
      name_sw: office.name_sw || office.name,
      level: office.level,
      region: office.region,
      region_id: office.region_id || "",
      district: office.district || "",
      district_id: office.district_id || "",
      address: office.address || "",
      phone: office.phone || "",
      email: office.email || "",
      active: office.active,
    });
    setShowAddModal(true);
  };

  const resetForm = () => {
    setShowAddModal(false);
    setEditingOffice(null);
    setFormData(INITIAL_FORM_DATA);
    setFormErrors({});
  };

  const openAddModal = () => {
    setEditingOffice(null);
    setFormData(INITIAL_FORM_DATA);
    setShowAddModal(true);
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
            {lang === "sw" ? "Usimamizi wa Ofisi" : "Office Management"}
          </h1>
          <p className="text-stone-500 font-medium">
            {lang === "sw"
              ? "Simamia ofisi za mikoa na wilaya za E-Mtaa"
              : "Manage E-Mtaa regional and district offices"}
          </p>
        </div>
        <button
          onClick={openAddModal}
          disabled={processing || locationsLoading}
          className="h-14 px-8 bg-emerald-600 text-white rounded-2xl font-bold hover:bg-emerald-700 transition-all shadow-xl shadow-emerald-200 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Plus size={20} />
          {lang === "sw" ? "Sajili Ofisi Mpya" : "Register New Office"}
        </button>
      </div>

      {/* Search */}
      <div className="bg-white rounded-4xl border border-stone-100 shadow-xl overflow-hidden">
        <div className="p-6 border-b border-stone-100 bg-stone-50/50">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-400" size={20} />
            <input
              type="text"
              placeholder={lang === "sw" ? "Tafuta ofisi..." : "Search offices..."}
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
        {!loading && filteredOffices.length === 0 && (
          <div className="p-12 text-center">
            <div className="w-20 h-20 mx-auto mb-4 bg-stone-100 rounded-full flex items-center justify-center">
              <Building2 className="text-stone-400" size={32} />
            </div>
            <p className="text-stone-900 font-bold text-lg mb-1">
              {lang === "sw" ? "Hakuna ofisi" : "No offices found"}
            </p>
            <p className="text-stone-500 font-medium">
              {lang === "sw"
                ? "Bado hakuna ofisi zilizosajiliwa"
                : "No offices have been registered yet"}
            </p>
            <button
              onClick={openAddModal}
              className="mt-4 px-6 py-3 bg-emerald-600 text-white rounded-xl font-bold hover:bg-emerald-700 transition-all"
            >
              {lang === "sw" ? "Sajili Ofisi Mpya" : "Register New Office"}
            </button>
          </div>
        )}

        {/* Desktop Table View */}
        {!loading && filteredOffices.length > 0 && (
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-stone-50/50 border-b border-stone-100">
                  <th className="px-6 py-4 text-xs font-bold text-stone-500 uppercase tracking-widest">
                    {lang === "sw" ? "Jina la Ofisi" : "Office Name"}
                  </th>
                  <th className="px-6 py-4 text-xs font-bold text-stone-500 uppercase tracking-widest">
                    {lang === "sw" ? "Ngazi" : "Level"}
                  </th>
                  <th className="px-6 py-4 text-xs font-bold text-stone-500 uppercase tracking-widest">
                    {lang === "sw" ? "Mahali" : "Location"}
                  </th>
                  <th className="px-6 py-4 text-xs font-bold text-stone-500 uppercase tracking-widest">
                    {lang === "sw" ? "Mawasiliano" : "Contact"}
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
                {filteredOffices.map((office) => (
                  <React.Fragment key={office.id}>
                    <tr
                      className="hover:bg-stone-50/50 transition-colors group cursor-pointer"
                      onClick={() => fetchOfficeStaff(office)}
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div
                            className={cn(
                              "w-10 h-10 rounded-xl flex items-center justify-center transition-colors",
                              "group-hover:bg-emerald-50 group-hover:text-emerald-600",
                              office.level === "region"
                                ? "bg-blue-50 text-blue-600"
                                : "bg-purple-50 text-purple-600",
                            )}
                          >
                            <Building2 size={20} />
                          </div>
                          <div>
                            <p className="font-bold text-stone-900">
                              {lang === "sw"
                                ? office.name_sw || office.name
                                : office.name_en || office.name}
                            </p>
                            {office.address && (
                              <p className="text-xs text-stone-400 flex items-center gap-1">
                                <MapPin size={10} />
                                {office.address}
                              </p>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={cn(
                            "px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border",
                            office.level === "region"
                              ? "bg-blue-50 text-blue-600 border-blue-100"
                              : "bg-purple-50 text-purple-600 border-purple-100",
                          )}
                        >
                          {office.level === "region"
                            ? lang === "sw"
                              ? "Mkoa"
                              : "Region"
                            : lang === "sw"
                              ? "Wilaya"
                              : "District"}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <p className="font-medium text-stone-900">{office.region}</p>
                        {office.district && (
                          <p className="text-xs text-stone-500">{office.district}</p>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        {office.email && <p className="text-xs text-stone-600">{office.email}</p>}
                        {office.phone && <p className="text-xs text-stone-500">{office.phone}</p>}
                        {!office.email && !office.phone && (
                          <p className="text-xs text-stone-400">-</p>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <button
                          onClick={() => handleToggleStatus(office.id, office.active)}
                          disabled={processing}
                          className={cn(
                            "px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border transition-all",
                            office.active
                              ? "bg-emerald-50 text-emerald-600 border-emerald-100 hover:bg-red-50 hover:text-red-600 hover:border-red-100"
                              : "bg-red-50 text-red-600 border-red-100 hover:bg-emerald-50 hover:text-emerald-600 hover:border-emerald-100",
                            processing && "opacity-50 cursor-not-allowed",
                          )}
                          title={
                            office.active
                              ? lang === "sw"
                                ? "Zima ofisi"
                                : "Deactivate office"
                              : lang === "sw"
                                ? "Washa ofisi"
                                : "Activate office"
                          }
                        >
                          {office.active
                            ? lang === "sw"
                              ? "Inatumika"
                              : "Active"
                            : lang === "sw"
                              ? "Haifanyi kazi"
                              : "Inactive"}
                        </button>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => handleEditClick(office)}
                            disabled={processing}
                            className="p-2 hover:bg-stone-100 rounded-lg text-stone-400 hover:text-stone-900 transition-all disabled:opacity-50"
                            title={lang === "sw" ? "Hariri" : "Edit"}
                          >
                            <Edit2 size={18} />
                          </button>
                          <button
                            onClick={() => handleDeleteOffice(office.id)}
                            disabled={processing}
                            className="p-2 hover:bg-red-50 rounded-lg text-stone-400 hover:text-red-600 transition-all disabled:opacity-50"
                            title={lang === "sw" ? "Futa" : "Delete"}
                          >
                            <Trash2 size={18} />
                          </button>
                        </div>
                      </td>
                    </tr>
                    {expandedOfficeId === office.id && (
                      <tr>
                        <td
                          colSpan={5}
                          className="px-6 py-4 bg-emerald-50/50 border-b border-emerald-100"
                        >
                          <div className="space-y-2">
                            <p className="text-xs font-bold text-emerald-700 uppercase tracking-wider flex items-center gap-1.5">
                              <Users size={13} />
                              {lang === "sw"
                                ? `Wafanyakazi (${officeStaff.length})`
                                : `Staff Members (${officeStaff.length})`}
                            </p>
                            {loadingStaff ? (
                              <div className="flex items-center gap-2 py-3 text-stone-400 text-sm">
                                <Loader2 size={14} className="animate-spin" />
                                {lang === "sw" ? "Inapakia..." : "Loading..."}
                              </div>
                            ) : officeStaff.length === 0 ? (
                              <p className="text-sm text-stone-400 py-2">
                                {lang === "sw"
                                  ? "Hakuna wafanyakazi waliokabidhiwa ofisi hii."
                                  : "No staff assigned to this office."}
                              </p>
                            ) : (
                              <div className="grid gap-2">
                                {officeStaff.map((s) => (
                                  <div
                                    key={s.id}
                                    className="flex items-center justify-between bg-white rounded-lg px-3 py-2.5 border border-stone-100"
                                  >
                                    <div className="flex items-center gap-3">
                                      <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center text-xs font-bold">
                                        {s.first_name?.[0]}
                                        {s.last_name?.[0]}
                                      </div>
                                      <div>
                                        <p className="text-sm font-bold text-stone-800">
                                          {s.first_name} {s.last_name}
                                        </p>
                                        <p className="text-xs text-stone-400">
                                          {s.position || s.role} {s.email ? `· ${s.email}` : ""}
                                        </p>
                                      </div>
                                    </div>
                                    {s.phone && (
                                      <span className="text-xs text-stone-400">{s.phone}</span>
                                    )}
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Mobile Card View */}
        {!loading && filteredOffices.length > 0 && (
          <div className="md:hidden divide-y divide-stone-50">
            {filteredOffices.map((office) => (
              <div key={office.id} className="p-4 space-y-3">
                <div className="flex justify-between items-start">
                  <div className="flex items-center gap-3">
                    <div
                      className={cn(
                        "w-10 h-10 rounded-xl flex items-center justify-center",
                        office.level === "region"
                          ? "bg-blue-50 text-blue-600"
                          : "bg-purple-50 text-purple-600",
                      )}
                    >
                      <Building2 size={20} />
                    </div>
                    <div>
                      <h3 className="font-bold text-stone-900">
                        {lang === "sw"
                          ? office.name_sw || office.name
                          : office.name_en || office.name}
                      </h3>
                      <p className="text-xs text-stone-500">{office.region}</p>
                      {office.district && (
                        <p className="text-xs text-stone-400">{office.district}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <button
                      title={lang === "sw" ? "Hariri" : "Edit"}
                      aria-label={lang === "sw" ? "Hariri ofisi" : "Edit office"}
                      onClick={() => handleEditClick(office)}
                      disabled={processing}
                      className="p-2 hover:bg-stone-100 rounded-lg text-stone-400 disabled:opacity-50"
                    >
                      <Edit2 size={18} />
                    </button>
                    <button
                      title={lang === "sw" ? "Futa" : "Delete"}
                      aria-label={lang === "sw" ? "Futa ofisi" : "Delete office"}
                      onClick={() => handleDeleteOffice(office.id)}
                      disabled={processing}
                      className="p-2 hover:bg-red-50 rounded-lg text-stone-400 disabled:opacity-50"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 bg-stone-50 p-3 rounded-xl border border-stone-100">
                  <div>
                    <p className="text-[10px] text-stone-400 font-bold uppercase tracking-widest mb-1">
                      {lang === "sw" ? "Hali" : "Status"}
                    </p>
                    <button
                      onClick={() => handleToggleStatus(office.id, office.active)}
                      disabled={processing}
                      className={cn(
                        "px-2 py-1 rounded-full text-[8px] font-black uppercase tracking-widest border transition-all",
                        office.active
                          ? "bg-emerald-50 text-emerald-600 border-emerald-100"
                          : "bg-red-50 text-red-600 border-red-100",
                        processing && "opacity-50 cursor-not-allowed",
                      )}
                    >
                      {office.active
                        ? lang === "sw"
                          ? "Inatumika"
                          : "Active"
                        : lang === "sw"
                          ? "Haifanyi kazi"
                          : "Inactive"}
                    </button>
                  </div>
                  <div>
                    <p className="text-[10px] text-stone-400 font-bold uppercase tracking-widest mb-1">
                      {lang === "sw" ? "Ngazi" : "Level"}
                    </p>
                    <span
                      className={cn(
                        "px-2 py-1 rounded-full text-[8px] font-black uppercase tracking-widest border",
                        office.level === "region"
                          ? "bg-blue-50 text-blue-600 border-blue-100"
                          : "bg-purple-50 text-purple-600 border-purple-100",
                      )}
                    >
                      {office.level === "region"
                        ? lang === "sw"
                          ? "Mkoa"
                          : "Region"
                        : lang === "sw"
                          ? "Wilaya"
                          : "District"}
                    </span>
                  </div>
                </div>

                {(office.email || office.phone || office.address) && (
                  <div className="text-xs space-y-1 bg-stone-50 p-3 rounded-xl border border-stone-100">
                    {office.email && <p className="text-stone-600">{office.email}</p>}
                    {office.phone && <p className="text-stone-600">{office.phone}</p>}
                    {office.address && (
                      <p className="text-stone-500 flex items-center gap-1">
                        <MapPin size={10} />
                        {office.address}
                      </p>
                    )}
                  </div>
                )}
              </div>
            ))}
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
              className="relative w-full max-w-2xl bg-white rounded-4xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col"
            >
              <div className="px-8 py-6 border-b border-stone-100 flex items-center justify-between">
                <h2 className="text-xl font-black text-stone-900 tracking-tight">
                  {editingOffice
                    ? lang === "sw"
                      ? "Hariri Ofisi"
                      : "Edit Office"
                    : lang === "sw"
                      ? "Sajili Ofisi Mpya"
                      : "Register New Office"}
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

              <form onSubmit={handleSaveOffice} className="p-8 space-y-6 overflow-y-auto">
                {/* Office Level Selection */}
                <div className="space-y-2">
                  <label className="text-xs font-bold text-stone-500 uppercase tracking-widest ml-1">
                    {lang === "sw" ? "Ngazi ya Ofisi" : "Office Level"}{" "}
                    <span className="text-red-500">*</span>
                  </label>
                  <div className="flex gap-4">
                    {(["region", "district"] as const).map((level) => (
                      <button
                        key={level}
                        type="button"
                        onClick={() =>
                          setFormData({ ...formData, level, district_id: "", district: "" })
                        }
                        disabled={processing}
                        className={cn(
                          "flex-1 h-14 rounded-2xl font-bold border-2 transition-all",
                          formData.level === level
                            ? "bg-emerald-50 border-emerald-600 text-emerald-600"
                            : "bg-white border-stone-100 text-stone-400 hover:border-stone-200",
                          processing && "opacity-50 cursor-not-allowed",
                        )}
                      >
                        {level === "region"
                          ? lang === "sw"
                            ? "Mkoa"
                            : "Region"
                          : lang === "sw"
                            ? "Wilaya"
                            : "District"}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Office Names */}
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
                      placeholder="e.g. Dar es Salaam Regional Office"
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
                      placeholder="Mf. Ofisi ya Mkoa wa Dar es Salaam"
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

                {/* Location Selection */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-stone-500 uppercase tracking-widest ml-1">
                      {lang === "sw" ? "Mkoa" : "Region"} <span className="text-red-500">*</span>
                    </label>
                    <select
                      required
                      title={lang === "sw" ? "Chagua mkoa" : "Select region"}
                      aria-label={lang === "sw" ? "Mkoa" : "Region"}
                      value={formData.region_id}
                      onChange={(e) => {
                        const regionId = e.target.value;
                        const region = regions.find((r) => r.id === regionId);
                        setFormData({
                          ...formData,
                          region_id: regionId,
                          region: region?.name || "",
                          district_id: "",
                          district: "",
                        });
                        if (formErrors.region_id) {
                          setFormErrors({ ...formErrors, region_id: undefined });
                        }
                      }}
                      disabled={processing || locationsLoading}
                      className={cn(
                        "w-full h-14 px-4 bg-stone-50 border rounded-2xl focus:ring-2 focus:ring-emerald-500 transition-all font-medium",
                        formErrors.region_id ? "border-red-300 bg-red-50" : "border-stone-200",
                        (processing || locationsLoading) && "opacity-50 cursor-not-allowed",
                      )}
                    >
                      <option value="">
                        {locationsLoading
                          ? lang === "sw"
                            ? "Inapakia..."
                            : "Loading..."
                          : lang === "sw"
                            ? "Chagua Mkoa"
                            : "Select Region"}
                      </option>
                      {regions.map((region) => (
                        <option key={region.id} value={region.id}>
                          {region.name}
                        </option>
                      ))}
                    </select>
                    {formErrors.region_id && (
                      <p className="text-xs text-red-600 font-medium flex items-center gap-1 mt-1">
                        <AlertTriangle size={12} />
                        {formErrors.region_id}
                      </p>
                    )}
                  </div>

                  {formData.level === "district" && (
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-stone-500 uppercase tracking-widest ml-1">
                        {lang === "sw" ? "Wilaya" : "District"}{" "}
                        <span className="text-red-500">*</span>
                      </label>
                      <select
                        required={formData.level === "district"}
                        title={lang === "sw" ? "Chagua wilaya" : "Select district"}
                        aria-label={lang === "sw" ? "Wilaya" : "District"}
                        value={formData.district_id}
                        onChange={(e) => {
                          const districtId = e.target.value;
                          const district = districts.find((d) => d.id === districtId);
                          setFormData({
                            ...formData,
                            district_id: districtId,
                            district: district?.name || "",
                          });
                          if (formErrors.district_id) {
                            setFormErrors({ ...formErrors, district_id: undefined });
                          }
                        }}
                        disabled={processing || !formData.region_id || locationsLoading}
                        className={cn(
                          "w-full h-14 px-4 bg-stone-50 border rounded-2xl focus:ring-2 focus:ring-emerald-500 transition-all font-medium",
                          formErrors.district_id ? "border-red-300 bg-red-50" : "border-stone-200",
                          (processing || !formData.region_id || locationsLoading) &&
                            "opacity-50 cursor-not-allowed",
                        )}
                      >
                        <option value="">
                          {!formData.region_id
                            ? lang === "sw"
                              ? "Chagua Mkoa Kwanza"
                              : "Select Region First"
                            : locationsLoading
                              ? lang === "sw"
                                ? "Inapakia..."
                                : "Loading..."
                              : lang === "sw"
                                ? "Chagua Wilaya"
                                : "Select District"}
                        </option>
                        {districts.map((district) => (
                          <option key={district.id} value={district.id}>
                            {district.name}
                          </option>
                        ))}
                      </select>
                      {formErrors.district_id && (
                        <p className="text-xs text-red-600 font-medium flex items-center gap-1 mt-1">
                          <AlertTriangle size={12} />
                          {formErrors.district_id}
                        </p>
                      )}
                    </div>
                  )}
                </div>

                {/* Contact Information */}
                <div className="space-y-4">
                  <h3 className="text-sm font-bold text-stone-700">
                    {lang === "sw" ? "Maelezo ya Mawasiliano" : "Contact Information"}
                  </h3>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-stone-500 uppercase tracking-widest ml-1">
                        {lang === "sw" ? "Anwani" : "Address"}
                      </label>
                      <input
                        type="text"
                        value={formData.address}
                        onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                        className="w-full h-14 px-4 bg-stone-50 border border-stone-200 rounded-2xl focus:ring-2 focus:ring-emerald-500 transition-all font-medium"
                        placeholder={lang === "sw" ? "Mf. Samora Avenue" : "e.g. Samora Avenue"}
                        disabled={processing}
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-stone-500 uppercase tracking-widest ml-1">
                        {lang === "sw" ? "Simu" : "Phone"}
                      </label>
                      <input
                        type="tel"
                        value={formData.phone}
                        onChange={(e) => {
                          setFormData({ ...formData, phone: e.target.value });
                          if (formErrors.phone) {
                            setFormErrors({ ...formErrors, phone: undefined });
                          }
                        }}
                        className={cn(
                          "w-full h-14 px-4 bg-stone-50 border rounded-2xl focus:ring-2 focus:ring-emerald-500 transition-all font-medium",
                          formErrors.phone ? "border-red-300 bg-red-50" : "border-stone-200",
                        )}
                        placeholder="+255 22 2123456"
                        disabled={processing}
                      />
                      {formErrors.phone && (
                        <p className="text-xs text-red-600 font-medium flex items-center gap-1 mt-1">
                          <AlertTriangle size={12} />
                          {formErrors.phone}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-bold text-stone-500 uppercase tracking-widest ml-1">
                      {lang === "sw" ? "Barua Pepe" : "Email"}
                    </label>
                    <input
                      type="email"
                      value={formData.email}
                      onChange={(e) => {
                        setFormData({ ...formData, email: e.target.value });
                        if (formErrors.email) {
                          setFormErrors({ ...formErrors, email: undefined });
                        }
                      }}
                      className={cn(
                        "w-full h-14 px-4 bg-stone-50 border rounded-2xl focus:ring-2 focus:ring-emerald-500 transition-all font-medium",
                        formErrors.email ? "border-red-300 bg-red-50" : "border-stone-200",
                      )}
                      placeholder="office@emtaa.go.tz"
                      disabled={processing}
                    />
                    {formErrors.email && (
                      <p className="text-xs text-red-600 font-medium flex items-center gap-1 mt-1">
                        <AlertTriangle size={12} />
                        {formErrors.email}
                      </p>
                    )}
                  </div>
                </div>

                {/* Status Toggle */}
                <div className="flex items-center gap-3 p-4 bg-stone-50 rounded-2xl border border-stone-200">
                  <div
                    className={cn(
                      "w-12 h-6 rounded-full transition-colors relative cursor-pointer",
                      formData.active ? "bg-emerald-600" : "bg-stone-300",
                    )}
                  >
                    <div
                      className={cn(
                        "absolute top-1 w-4 h-4 bg-white rounded-full transition-all",
                        formData.active ? "right-1" : "left-1",
                      )}
                    />
                  </div>
                  <div>
                    <p className="font-bold text-stone-900">
                      {formData.active
                        ? lang === "sw"
                          ? "Ofisi Inatumika"
                          : "Office Active"
                        : lang === "sw"
                          ? "Ofisi Haifanyi kazi"
                          : "Office Inactive"}
                    </p>
                    <p className="text-xs text-stone-500">
                      {formData.active
                        ? lang === "sw"
                          ? "Wananchi wataweza kuona ofisi hii"
                          : "Citizens will be able to see this office"
                        : lang === "sw"
                          ? "Ofisi haitaonekana kwa wananchi"
                          : "Office will be hidden from citizens"}
                    </p>
                  </div>
                </div>

                {/* Submit Button */}
                <button
                  disabled={processing || locationsLoading}
                  className="w-full h-16 bg-stone-900 text-white rounded-2xl font-bold text-lg hover:bg-stone-800 transition-all flex items-center justify-center gap-2 shadow-xl shadow-stone-200 disabled:opacity-50 disabled:cursor-not-allowed"
                  type="submit"
                >
                  {processing ? (
                    <>
                      <Loader2 className="animate-spin" size={20} />
                      {lang === "sw" ? "Inahifadhi..." : "Saving..."}
                    </>
                  ) : editingOffice ? (
                    lang === "sw" ? (
                      "Hifadhi Mabadiliko"
                    ) : (
                      "Save Changes"
                    )
                  ) : lang === "sw" ? (
                    "Sajili Ofisi"
                  ) : (
                    "Register Office"
                  )}
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
