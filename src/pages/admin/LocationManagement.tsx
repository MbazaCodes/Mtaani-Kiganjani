import React, { useState, useEffect, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  MapPin,
  Plus,
  Search,
  X,
  Loader2,
  Trash2,
  ChevronRight,
  Building2,
  Home,
  Edit2,
  AlertTriangle,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { IS_SUPABASE_CONFIGURED } from "@/lib/config";
import { useLanguage } from "@/context/LanguageContext";
import { useToast } from "@/context/ToastContext";
import { TANZANIA_ADDRESS_DATA } from "@/lib/addressData";
import { cn } from "@/lib/utils";

type LocationLevel = "region" | "district" | "ward" | "street";

interface Location {
  id: string;
  name: string;
  level: LocationLevel;
  parent_id: string | null;
  created_at?: string;
  updated_at?: string;
}

interface LocationFormData {
  name: string;
  level: LocationLevel;
  parent_id: string | null;
}

interface DemoLocation extends Location {
  isDemo?: boolean;
}

// Build demo locations from real TANZANIA_ADDRESS_DATA
const DEMO_LOCATIONS: DemoLocation[] = (() => {
  const locs: DemoLocation[] = [];
  let counter = 1;
  for (const region of TANZANIA_ADDRESS_DATA) {
    const regionId = `tz-r-${counter++}`;
    locs.push({ id: regionId, name: region.name, level: "region", parent_id: null, isDemo: true });
    for (const district of region.districts) {
      const districtId = `tz-d-${counter++}`;
      locs.push({
        id: districtId,
        name: district.name,
        level: "district",
        parent_id: regionId,
        isDemo: true,
      });
      for (const ward of district.wards) {
        locs.push({
          id: `tz-w-${counter++}`,
          name: ward,
          level: "ward",
          parent_id: districtId,
          isDemo: true,
        });
      }
    }
  }
  return locs;
})();

const INITIAL_FORM_DATA: LocationFormData = {
  name: "",
  level: "region",
  parent_id: null,
};

const LEVEL_LABELS = {
  region: { en: "Region", sw: "Mkoa" },
  district: { en: "District", sw: "Wilaya" },
  ward: { en: "Ward", sw: "Kata" },
  street: { en: "Street", sw: "Mtaa" },
};

const LEVEL_ICONS = {
  region: MapPin,
  district: Building2,
  ward: Home,
  street: MapPin,
};

export function LocationManagement() {
  const { lang } = useLanguage();
  const { showToast } = useToast();

  // State management
  const [locations, setLocations] = useState<Location[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [processing, setProcessing] = useState(false);
  const [activeLevel, setActiveLevel] = useState<LocationLevel>("region");
  const [selectedParentId, setSelectedParentId] = useState<string | null>(null);
  const [editingLocation, setEditingLocation] = useState<Location | null>(null);
  const [formData, setFormData] = useState<LocationFormData>(INITIAL_FORM_DATA);
  const [formErrors, setFormErrors] = useState<Partial<Record<keyof LocationFormData, string>>>({});

  // Computed properties
  const isSupabaseConfigured = useMemo(() => {
    return IS_SUPABASE_CONFIGURED;
  }, []);

  const filteredLocations = useMemo(() => {
    return locations.filter((l) => l.name.toLowerCase().includes(searchTerm.toLowerCase()));
  }, [locations, searchTerm]);

  const parentLocations = useMemo(() => {
    if (activeLevel === "region") return [];
    const parentLevelMap: Record<LocationLevel, LocationLevel> = {
      region: "region",
      district: "region",
      ward: "district",
      street: "ward",
    };
    const parentLevel = parentLevelMap[activeLevel];
    return locations.filter((l) => l.level === parentLevel);
  }, [locations, activeLevel]);

  // Data fetching
  const fetchLocations = useCallback(async () => {
    setLoading(true);
    try {
      if (!isSupabaseConfigured) {
        // Simulate API delay
        await new Promise((resolve) => setTimeout(resolve, 500));
        setLocations(DEMO_LOCATIONS);
        return;
      }

      let query = supabase.from("locations").select("*").order("name", { ascending: true });

      if (selectedParentId) {
        query = query.eq("parent_id", selectedParentId);
      }

      const { data, error } = await query;

      if (error) {
        console.error("Error fetching locations:", error);
        showToast(lang === "sw" ? "Hitilafu kupakia maeneo" : "Error loading locations", "error");
        setLocations(DEMO_LOCATIONS);
        return;
      }

      setLocations(data && data.length > 0 ? data : DEMO_LOCATIONS);
    } catch (error) {
      console.error("Exception in fetchLocations:", error);
      showToast(lang === "sw" ? "Hitilafu ya mfumo" : "System error", "error");
      setLocations(DEMO_LOCATIONS);
    } finally {
      setLoading(false);
    }
  }, [isSupabaseConfigured, selectedParentId, lang, showToast]);

  useEffect(() => {
    fetchLocations();
  }, [fetchLocations, activeLevel, selectedParentId]);

  // Form validation
  const validateForm = useCallback((): boolean => {
    const errors: Partial<Record<keyof LocationFormData, string>> = {};

    if (!formData.name.trim()) {
      errors.name = lang === "sw" ? "Jina linahitajika" : "Name is required";
    } else if (formData.name.length < 2) {
      errors.name =
        lang === "sw" ? "Jina liwe na herufi 2 au zaidi" : "Name must be at least 2 characters";
    }

    if (!editingLocation) {
      const exists = locations.some(
        (l) =>
          l.name.toLowerCase() === formData.name.toLowerCase() &&
          l.level === formData.level &&
          l.parent_id === formData.parent_id,
      );
      if (exists) {
        errors.name = lang === "sw" ? "Eneo tayari lipo" : "Location already exists";
      }
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  }, [formData, locations, editingLocation, lang]);

  // CRUD operations
  const handleAddLocation = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setProcessing(true);

    try {
      if (!isSupabaseConfigured) {
        // Demo mode - save to localStorage
        await new Promise((resolve) => setTimeout(resolve, 500));

        const newLocation: Location = {
          id: `demo-${Date.now()}`,
          name: formData.name,
          level: formData.level,
          parent_id: formData.parent_id,
        };

        if (editingLocation) {
          // Update in demo locations
          setLocations((prev) =>
            prev.map((l) => (l.id === editingLocation.id ? { ...l, ...newLocation } : l)),
          );
          showToast(lang === "sw" ? "Eneo limebadilishwa" : "Location updated", "success");
        } else {
          // Add to demo locations
          setLocations((prev) => [...prev, newLocation]);
          showToast(lang === "sw" ? "Eneo limeongezwa" : "Location added", "success");
        }

        resetForm();
        return;
      }

      // Supabase operations
      if (editingLocation) {
        const { error } = await supabase
          .from("locations")
          .update({
            name: formData.name,
            updated_at: new Date().toISOString(),
          })
          .eq("id", editingLocation.id);

        if (error) throw error;

        showToast(lang === "sw" ? "Eneo limebadilishwa" : "Location updated", "success");
      } else {
        const { error } = await supabase.from("locations").insert([
          {
            name: formData.name,
            level: formData.level,
            parent_id: formData.parent_id,
          },
        ]);

        if (error) throw error;

        showToast(lang === "sw" ? "Eneo limeongezwa" : "Location added", "success");
      }

      resetForm();
      await fetchLocations();
    } catch (error: unknown) {
      const _e = error as { message?: string };
      console.error("Error saving location:", error);
      showToast(
        _e.message || (lang === "sw" ? "Hitilafu ya kuhifadhi" : "Error saving location"),
        "error",
      );
    } finally {
      setProcessing(false);
    }
  };

  const handleDeleteLocation = async (id: string) => {
    if (
      !confirm(
        lang === "sw"
          ? "Je, una uhakika unataka kufuta eneo hili? Hatua hii haiwezi kutenduliwa."
          : "Are you sure you want to delete this location? This action cannot be undone.",
      )
    ) {
      return;
    }

    setProcessing(true);

    try {
      if (!isSupabaseConfigured) {
        // Demo mode - remove from state
        await new Promise((resolve) => setTimeout(resolve, 300));
        setLocations((prev) => prev.filter((l) => l.id !== id));
        showToast(lang === "sw" ? "Eneo limefutwa" : "Location deleted", "success");
        return;
      }

      const { error } = await supabase.from("locations").delete().eq("id", id);

      if (error) throw error;

      showToast(lang === "sw" ? "Eneo limefutwa" : "Location deleted", "success");
      await fetchLocations();
    } catch (error: unknown) {
      const _e = error as { message?: string };
      console.error("Error deleting location:", error);
      showToast(
        _e.message || (lang === "sw" ? "Hitilafu ya kufuta" : "Error deleting location"),
        "error",
      );
    } finally {
      setProcessing(false);
    }
  };

  const handleEditClick = (location: Location) => {
    setEditingLocation(location);
    setFormData({
      name: location.name,
      level: location.level,
      parent_id: location.parent_id,
    });
    setShowAddModal(true);
  };

  const handleViewSublocations = (location: Location) => {
    if (location.level !== "street") {
      const nextLevelMap: Record<LocationLevel, LocationLevel> = {
        region: "district",
        district: "ward",
        ward: "street",
        street: "street",
      };
      setActiveLevel(nextLevelMap[location.level]);
      setSelectedParentId(location.id);
    }
  };

  const resetForm = () => {
    setShowAddModal(false);
    setEditingLocation(null);
    setFormData(INITIAL_FORM_DATA);
    setFormErrors({});
  };

  const openAddModal = () => {
    setEditingLocation(null);
    setFormData({
      ...INITIAL_FORM_DATA,
      level: activeLevel,
      parent_id: selectedParentId,
    });
    setShowAddModal(true);
  };

  const LevelIcon = LEVEL_ICONS[activeLevel];

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
            {lang === "sw" ? "Usimamizi wa Maeneo" : "Location Management"}
          </h1>
          <p className="text-stone-500 font-medium">
            {lang === "sw"
              ? "Simamia mikoa, wilaya, kata na mitaa"
              : "Manage regions, districts, wards and streets"}
          </p>
        </div>
        <button
          onClick={openAddModal}
          disabled={processing}
          className="h-14 px-8 bg-emerald-600 text-white rounded-2xl font-bold hover:bg-emerald-700 transition-all shadow-xl shadow-emerald-200 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Plus size={20} />
          {lang === "sw"
            ? `Ongeza ${LEVEL_LABELS[activeLevel][lang]}`
            : `Add ${LEVEL_LABELS[activeLevel].en}`}
        </button>
      </div>

      {/* Level Navigation */}
      <div className="flex items-center gap-2 p-1 bg-stone-100 rounded-2xl w-fit">
        {(Object.keys(LEVEL_LABELS) as LocationLevel[]).map((level) => (
          <button
            key={level}
            onClick={() => {
              setActiveLevel(level);
              setSelectedParentId(null);
              setSearchTerm("");
            }}
            disabled={processing}
            className={cn(
              "px-6 py-3 rounded-xl font-bold text-sm transition-all uppercase tracking-widest",
              activeLevel === level
                ? "bg-white text-emerald-600 shadow-sm"
                : "text-stone-500 hover:text-stone-700",
              processing && "opacity-50 cursor-not-allowed",
            )}
          >
            {LEVEL_LABELS[level][lang === "sw" ? "sw" : "en"]}
          </button>
        ))}
      </div>

      {/* Search and Filter */}
      <div className="bg-white rounded-3xl border border-stone-100 shadow-xl overflow-hidden">
        <div className="p-6 border-b border-stone-100 bg-stone-50/50">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-400" size={20} />
            <input
              type="text"
              placeholder={lang === "sw" ? "Tafuta eneo..." : "Search locations..."}
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
        {!loading && filteredLocations.length === 0 && (
          <div className="p-12 text-center">
            <div className="w-20 h-20 mx-auto mb-4 bg-stone-100 rounded-full flex items-center justify-center">
              <LevelIcon className="text-stone-400" size={32} />
            </div>
            <p className="text-stone-900 font-bold text-lg mb-1">
              {lang === "sw" ? "Hakuna maeneo" : "No locations found"}
            </p>
            <p className="text-stone-500 font-medium">
              {lang === "sw"
                ? `Bado hakuna ${LEVEL_LABELS[activeLevel][lang].toLowerCase()} zilizoongezwa`
                : `No ${LEVEL_LABELS[activeLevel].en.toLowerCase()}s have been added yet`}
            </p>
            <button
              onClick={openAddModal}
              className="mt-4 px-6 py-3 bg-emerald-600 text-white rounded-xl font-bold hover:bg-emerald-700 transition-all"
            >
              {lang === "sw"
                ? `Ongeza ${LEVEL_LABELS[activeLevel][lang]}`
                : `Add ${LEVEL_LABELS[activeLevel].en}`}
            </button>
          </div>
        )}

        {/* Desktop Table View */}
        {!loading && filteredLocations.length > 0 && (
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-stone-50/50 border-b border-stone-100">
                  <th className="px-6 py-4 text-xs font-bold text-stone-500 uppercase tracking-widest">
                    {lang === "sw" ? "Jina" : "Name"}
                  </th>
                  <th className="px-6 py-4 text-xs font-bold text-stone-500 uppercase tracking-widest">
                    {lang === "sw" ? "Ngazi" : "Level"}
                  </th>
                  <th className="px-6 py-4 text-xs font-bold text-stone-500 uppercase tracking-widest text-right">
                    {lang === "sw" ? "Vitendo" : "Actions"}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-50">
                {filteredLocations.map((location) => {
                  const Icon = LEVEL_ICONS[location.level];
                  return (
                    <tr key={location.id} className="hover:bg-stone-50/50 transition-colors group">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div
                            className={cn(
                              "w-10 h-10 rounded-xl flex items-center justify-center transition-colors",
                              "group-hover:bg-emerald-50 group-hover:text-emerald-600",
                              location.level === "region"
                                ? "bg-blue-50 text-blue-600"
                                : location.level === "district"
                                  ? "bg-purple-50 text-purple-600"
                                  : location.level === "ward"
                                    ? "bg-amber-50 text-amber-600"
                                    : "bg-stone-100 text-stone-600",
                            )}
                          >
                            <Icon size={20} />
                          </div>
                          <span className="font-bold text-stone-900">{location.name}</span>
                          {location.parent_id && (
                            <span className="text-xs text-stone-400">
                              ({locations.find((l) => l.id === location.parent_id)?.name})
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={cn(
                            "px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border",
                            location.level === "region"
                              ? "bg-blue-50 text-blue-600 border-blue-100"
                              : location.level === "district"
                                ? "bg-purple-50 text-purple-600 border-purple-100"
                                : location.level === "ward"
                                  ? "bg-amber-50 text-amber-600 border-amber-100"
                                  : "bg-stone-50 text-stone-600 border-stone-100",
                          )}
                        >
                          {LEVEL_LABELS[location.level][lang === "sw" ? "sw" : "en"]}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => handleEditClick(location)}
                            disabled={processing}
                            className="p-2 hover:bg-stone-100 rounded-lg text-stone-400 hover:text-stone-900 transition-all disabled:opacity-50"
                            title={lang === "sw" ? "Hariri" : "Edit"}
                          >
                            <Edit2 size={18} />
                          </button>
                          {location.level !== "street" && (
                            <button
                              onClick={() => handleViewSublocations(location)}
                              disabled={processing}
                              className="p-2 hover:bg-emerald-50 rounded-lg text-emerald-600 transition-all flex items-center gap-1 text-xs font-bold disabled:opacity-50"
                              title={lang === "sw" ? "Tazama maeneo madogo" : "View sub-locations"}
                            >
                              {lang === "sw" ? "Tazama" : "View"} <ChevronRight size={14} />
                            </button>
                          )}
                          <button
                            onClick={() => handleDeleteLocation(location.id)}
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
        {!loading && filteredLocations.length > 0 && (
          <div className="md:hidden divide-y divide-stone-50">
            {filteredLocations.map((location) => {
              const Icon = LEVEL_ICONS[location.level];
              return (
                <div key={location.id} className="p-4 space-y-3">
                  <div className="flex justify-between items-start">
                    <div className="flex items-center gap-3">
                      <div
                        className={cn(
                          "w-10 h-10 rounded-xl flex items-center justify-center",
                          location.level === "region"
                            ? "bg-blue-50 text-blue-600"
                            : location.level === "district"
                              ? "bg-purple-50 text-purple-600"
                              : location.level === "ward"
                                ? "bg-amber-50 text-amber-600"
                                : "bg-stone-100 text-stone-600",
                        )}
                      >
                        <Icon size={20} />
                      </div>
                      <div>
                        <h3 className="font-bold text-stone-900">{location.name}</h3>
                        {location.parent_id && (
                          <p className="text-xs text-stone-400">
                            {locations.find((l) => l.id === location.parent_id)?.name}
                          </p>
                        )}
                        <span
                          className={cn(
                            "inline-block mt-1 px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-widest border",
                            location.level === "region"
                              ? "bg-blue-50 text-blue-600 border-blue-100"
                              : location.level === "district"
                                ? "bg-purple-50 text-purple-600 border-purple-100"
                                : location.level === "ward"
                                  ? "bg-amber-50 text-amber-600 border-amber-100"
                                  : "bg-stone-50 text-stone-600 border-stone-100",
                          )}
                        >
                          {LEVEL_LABELS[location.level][lang === "sw" ? "sw" : "en"]}
                        </span>
                      </div>
                    </div>
                    <div className="flex gap-1">
                      <button
                        title={lang === "sw" ? "Hariri" : "Edit"}
                        aria-label={lang === "sw" ? "Hariri mahali" : "Edit location"}
                        onClick={() => handleEditClick(location)}
                        disabled={processing}
                        className="p-2 hover:bg-stone-100 rounded-lg text-stone-400 disabled:opacity-50"
                      >
                        <Edit2 size={18} />
                      </button>
                      <button
                        title={lang === "sw" ? "Futa" : "Delete"}
                        aria-label={lang === "sw" ? "Futa mahali" : "Delete location"}
                        onClick={() => handleDeleteLocation(location.id)}
                        disabled={processing}
                        className="p-2 hover:bg-red-50 rounded-lg text-stone-400 disabled:opacity-50"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </div>
                  {location.level !== "street" && (
                    <button
                      onClick={() => handleViewSublocations(location)}
                      disabled={processing}
                      className="w-full py-2 bg-emerald-50 text-emerald-600 rounded-xl text-xs font-bold flex items-center justify-center gap-1 disabled:opacity-50"
                    >
                      {lang === "sw" ? "Tazama maeneo madogo" : "View Sub-locations"}{" "}
                      <ChevronRight size={14} />
                    </button>
                  )}
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
              className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl overflow-hidden"
            >
              <div className="px-8 py-6 border-b border-stone-100 flex items-center justify-between">
                <h2 className="text-xl font-black text-stone-900 tracking-tight">
                  {editingLocation
                    ? lang === "sw"
                      ? `Hariri ${LEVEL_LABELS[formData.level][lang]}`
                      : `Edit ${LEVEL_LABELS[formData.level].en}`
                    : lang === "sw"
                      ? `Ongeza ${LEVEL_LABELS[formData.level][lang]}`
                      : `Add New ${LEVEL_LABELS[formData.level].en}`}
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

              <form onSubmit={handleAddLocation} className="p-8 space-y-6">
                {/* Parent Location Selection (for non-regions) */}
                {activeLevel !== "region" && parentLocations.length > 0 && (
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-stone-500 uppercase tracking-widest ml-1">
                      {lang === "sw" ? "Eneo Kuu" : "Parent Location"}
                    </label>
                    <select
                      value={formData.parent_id || ""}
                      title={lang === "sw" ? "Chagua eneo kuu" : "Select parent location"}
                      aria-label={lang === "sw" ? "Eneo kuu" : "Parent location"}
                      onChange={(e) =>
                        setFormData({ ...formData, parent_id: e.target.value || null })
                      }
                      className="w-full h-14 px-4 bg-stone-50 border border-stone-200 rounded-2xl focus:ring-2 focus:ring-emerald-500 transition-all font-medium"
                    >
                      <option value="">
                        {lang === "sw" ? "Chagua eneo kuu" : "Select parent location"}
                      </option>
                      {parentLocations.map((location) => (
                        <option key={location.id} value={location.id}>
                          {location.name}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Name Input */}
                <div className="space-y-2">
                  <label className="text-xs font-bold text-stone-500 uppercase tracking-widest ml-1">
                    {lang === "sw" ? "Jina" : "Name"}
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => {
                      setFormData({ ...formData, name: e.target.value });
                      if (formErrors.name) {
                        setFormErrors({ ...formErrors, name: undefined });
                      }
                    }}
                    className={cn(
                      "w-full h-14 px-4 bg-stone-50 border rounded-2xl focus:ring-2 focus:ring-emerald-500 transition-all font-medium",
                      formErrors.name ? "border-red-300 bg-red-50" : "border-stone-200",
                    )}
                    placeholder={
                      lang === "sw"
                        ? `Mf. ${activeLevel === "region" ? "Dar es Salaam" : activeLevel === "district" ? "Kinondoni" : activeLevel === "ward" ? "Kijitonyama" : "Mabibo"}`
                        : `e.g. ${activeLevel === "region" ? "Dar es Salaam" : activeLevel === "district" ? "Kinondoni" : activeLevel === "ward" ? "Kijitonyama" : "Mabibo"}`
                    }
                    disabled={processing}
                  />
                  {formErrors.name && (
                    <p className="text-xs text-red-600 font-medium flex items-center gap-1 mt-1">
                      <AlertTriangle size={12} />
                      {formErrors.name}
                    </p>
                  )}
                </div>

                {/* Submit Button */}
                <button
                  disabled={processing}
                  className="w-full h-16 bg-stone-900 text-white rounded-2xl font-bold text-lg hover:bg-stone-800 transition-all flex items-center justify-center gap-2 shadow-xl shadow-stone-200 disabled:opacity-50 disabled:cursor-not-allowed"
                  type="submit"
                >
                  {processing ? (
                    <>
                      <Loader2 className="animate-spin" size={20} />
                      {lang === "sw" ? "Inahifadhi..." : "Saving..."}
                    </>
                  ) : editingLocation ? (
                    lang === "sw" ? (
                      "Hifadhi Mabadiliko"
                    ) : (
                      "Save Changes"
                    )
                  ) : lang === "sw" ? (
                    "Ongeza"
                  ) : (
                    "Add Location"
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
