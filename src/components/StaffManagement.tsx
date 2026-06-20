import React, { useState, useEffect } from "react";
import { supabase, UserProfile, VirtualOffice } from "@/lib/supabase";
import { motion, AnimatePresence } from "framer-motion";
import {
  Users,
  Plus,
  Search,
  Building2,
  MapPin,
  Shield,
  Mail,
  Phone,
  X,
  CheckCircle2,
  CheckCircle,
  AlertCircle,
  Loader2,
  ArrowRight,
  Database,
  Trash2,
  DatabaseZap,
  Globe,
  UserPlus,
  Edit2,
  User,
  Calendar,
  BadgeCheck,
  XCircle,
  KeyRound,
  Copy,
  Eye,
  EyeOff,
  RefreshCw,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Language, useTranslation } from "@/lib/i18n";
import { useToast } from "@/context/ToastContext";
import { useAuth } from "@/context/AuthContext";
import { INITIAL_SERVICES } from "@/constants/services";
import { adminCreateUser, adminResetPassword } from "@/lib/supabase-admin";

interface StaffManagementProps {
  lang: Language;
}

export const StaffManagement: React.FC<StaffManagementProps> = ({ lang }) => {
  const t = useTranslation(lang);
  const { showToast } = useToast();
  const { user } = useAuth();
  const [staff, setStaff] = useState<UserProfile[]>([]);
  const [offices, setOffices] = useState<VirtualOffice[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [seeding, setSeeding] = useState(false);
  const [createdTempPassword, setCreatedTempPassword] = useState("");
  const [selectedRegion, setSelectedRegion] = useState("");
  const [selectedDistrict, setSelectedDistrict] = useState("");
  const [officeLevel, setOfficeLevel] = useState<"region" | "district">("region");

  // Staff details modal state
  const [selectedStaff, setSelectedStaff] = useState<UserProfile | null>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [editingRole, setEditingRole] = useState(false);
  const [editingLocation, setEditingLocation] = useState(false);
  const [editFormData, setEditFormData] = useState({
    role: "" as "staff" | "admin",
    region: "",
    district: "",
    officeLevel: "region" as "region" | "district",
  });
  const [updating, setUpdating] = useState(false);

  // Reset password modal state
  const [showResetModal, setShowResetModal] = useState(false);
  const [resetPwd, setResetPwd] = useState("");
  const [resetPwdVisible, setResetPwdVisible] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [resetDone, setResetDone] = useState(false);

  // New staff password visibility toggle
  const [newPasswordVisible, setNewPasswordVisible] = useState(false);

  const [newStaff, setNewStaff] = useState({
    email: "",
    firstName: "",
    lastName: "",
    phone: "",
    employeeNumber: "",
    role: "staff" as "staff" | "admin",
    password: "",
    staffLevel: "ward" as "regional" | "district" | "ward",
    ward: "",
    departmentId: "",
  });
  const [departments, setDepartments] = useState<{ id: string; name: string; code: string }[]>([]);

  // Generate a default password when modal opens
  const generatePassword = () => {
    const array = new Uint8Array(8);
    crypto.getRandomValues(array);
    return (
      btoa(String.fromCharCode(...array))
        .replace(/[+/=]/g, "")
        .slice(0, 8) + "Tz1!"
    );
  };

  const [errors, setErrors] = useState<{ [key: string]: string }>({});

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
    "Tabora",
    "Kigoma",
    "Shinyanga",
    "Manyara",
    "Ruvuma",
  ];

  // Mock districts per region
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
    fetchStaff();
    // Fetch departments for the dropdown
    supabase
      .from("government_departments")
      .select("id, name, code")
      .eq("active", true)
      .order("name")
      .then(({ data }) => setDepartments(data || []));
    generateOffices();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const generateOffices = () => {
    // Generate virtual offices based on regions and districts
    const generatedOffices: VirtualOffice[] = [];

    regions.forEach((region, regionIndex) => {
      // Add regional office
      generatedOffices.push({
        id: `reg-${regionIndex}`,
        name: `${region} ${lang === "sw" ? "Ofisi ya Mkoa" : "Regional Office"}`,
        level: "region",
        region: region,
        district: region, // Use region as district for regional offices
        created_at: new Date().toISOString(),
      });

      // Add district offices
      const districts = getDistrictsForRegion(region);
      districts.forEach((district, districtIndex) => {
        generatedOffices.push({
          id: `dist-${regionIndex}-${districtIndex}`,
          name: `${district} ${lang === "sw" ? "Ofisi ya Wilaya" : "District Office"}`,
          level: "district",
          region: region,
          district: district,
          created_at: new Date().toISOString(),
        });
      });
    });

    setOffices(generatedOffices);
  };

  const fetchStaff = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("users")
        .select("*")
        .in("role", ["staff", "admin"]);

      if (error) {
        console.error("Error fetching staff:", error);
        showToast(lang === "sw" ? "Hitilafu kupakia watumishi" : "Error fetching staff", "error");
        setStaff([]);
        return;
      }
      setStaff(data || []);
    } catch (error) {
      console.error("Error fetching staff:", error);
      showToast(lang === "sw" ? "Hitilafu kupakia watumishi" : "Error fetching staff", "error");
      setStaff([]);
    } finally {
      setLoading(false);
    }
  };

  const validateForm = () => {
    const newErrors: { [key: string]: string } = {};

    if (!newStaff.email) {
      newErrors.email = lang === "sw" ? "Barua pepe inahitajika" : "Email is required";
    } else if (!/\S+@\S+\.\S+/.test(newStaff.email)) {
      newErrors.email = lang === "sw" ? "Barua pepe si sahihi" : "Email is invalid";
    }

    if (!selectedRegion) {
      newErrors.region = lang === "sw" ? "Mkoa unahitajika" : "Region is required";
    }

    if (officeLevel === "district" && !selectedDistrict) {
      newErrors.district = lang === "sw" ? "Wilaya inahitajika" : "District is required";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleCreateStaff = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) return;

    setLoading(true);

    try {
      // Find the selected office
      let officeId = "";
      let officeName = "";

      if (officeLevel === "region") {
        const regionalOffice = offices.find(
          (o) => o.level === "region" && o.region === selectedRegion,
        );
        if (regionalOffice) {
          officeId = regionalOffice.id;
          officeName = regionalOffice.name;
        }
      } else {
        const districtOffice = offices.find(
          (o) =>
            o.level === "district" &&
            o.region === selectedRegion &&
            o.district === selectedDistrict,
        );
        if (districtOffice) {
          officeId = districtOffice.id;
          officeName = districtOffice.name;
        }
      }

      // Check if user already exists in public.users
      const { data: existingUser } = await supabase
        .from("users")
        .select("id, role")
        .eq("email", newStaff.email)
        .maybeSingle();

      if (existingUser) {
        // User exists in public.users, just update their role
        const staffWard = newStaff.staffLevel === "ward" ? newStaff.ward : null;
        const staffDistrict = newStaff.staffLevel !== "regional" ? selectedDistrict : null;
        const { error: updateError } = await supabase
          .from("users")
          .update({
            role: newStaff.role,
            office_id: officeId,
            assigned_region: selectedRegion,
            assigned_district: staffDistrict,
            ward: staffWard,
            department_id: newStaff.departmentId || null,
            first_name: newStaff.firstName.trim() || undefined,
            last_name: newStaff.lastName.trim() || undefined,
            phone: newStaff.phone || undefined,
            employee_id: newStaff.employeeNumber || undefined,
            is_verified: true,
          })
          .eq("id", existingUser.id);

        if (updateError) throw updateError;

        showToast(
          lang === "sw"
            ? `Mtumishi amesasishwa! Wajibu wake sasa ni ${newStaff.role}`
            : `Staff updated! Role is now ${newStaff.role}`,
          "success",
        );

        setShowAddModal(false);
        resetForm();
        fetchStaff();
        return;
      }

      // Use the password from the form (admin can customize)
      const tempPassword = newStaff.password || generatePassword();

      // Use the admin API to create a confirmed user (no email confirmation needed)
      const { userId, error: createError } = await adminCreateUser({
        email: newStaff.email,
        password: tempPassword,
        role: newStaff.role,
        officeId,
      });

      if (createError) {
        // Fallback: if service role key not configured, inform admin
        if (createError.includes("SUPABASE_SERVICE_ROLE_KEY")) {
          showToast(
            lang === "sw"
              ? "Hatua ya ziada inahitajika: Ongeza SUPABASE_SERVICE_ROLE_KEY kwenye mipangilio ya Vercel."
              : "Extra step needed: Add SUPABASE_SERVICE_ROLE_KEY to your Vercel environment variables.",
            "error",
          );
          return;
        }
        if (
          createError.includes("already registered") ||
          createError.includes("already been registered")
        ) {
          showToast(
            lang === "sw"
              ? "Barua pepe hii tayari imesajiliwa."
              : "This email is already registered.",
            "info",
          );
          setShowAddModal(false);
          resetForm();
          return;
        }
        throw new Error(createError);
      }

      if (userId) {
        const firstName = newStaff.firstName.trim() || "Staff";
        const lastName = newStaff.lastName.trim() || "Member";

        // Determine ward and district based on staff level
        const staffWard = newStaff.staffLevel === "ward" ? newStaff.ward : null;
        const staffDistrict = newStaff.staffLevel !== "regional" ? selectedDistrict : null;
        const staffDeptId = newStaff.departmentId || null;

        // Create Profile
        const { error: profileError } = await supabase.from("users").insert({
          id: userId,
          first_name: firstName,
          last_name: lastName,
          email: newStaff.email,
          phone: newStaff.phone || null,
          employee_id: newStaff.employeeNumber || null,
          role: newStaff.role,
          office_id: officeId,
          assigned_region: selectedRegion,
          assigned_district: staffDistrict,
          ward: staffWard,
          department_id: staffDeptId,
          is_verified: false,
          account_status: "pending",
          nationality: "Tanzanian",
        });

        if (profileError) throw profileError;

        // Show the temp password to the admin so they can share it
        setCreatedTempPassword(tempPassword);
        showToast(
          lang === "sw"
            ? `Mtumishi amesajiliwa! Wajibu: ${newStaff.role}. Nywila ya muda imewekwa.`
            : `Staff created! Role: ${newStaff.role}. They can log in immediately.`,
          "success",
        );

        setShowAddModal(false);
        resetForm();
        fetchStaff();
      }
    } catch (err: unknown) {
      const _e = err as { message?: string };
      const _err = err as { message?: string };
      showToast(_err.message ?? "", "error");
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setNewStaff({
      email: "",
      firstName: "",
      lastName: "",
      phone: "",
      employeeNumber: "",
      role: "staff",
      password: "",
      staffLevel: "ward",
      ward: "",
      departmentId: "",
    });
    setSelectedRegion("");
    setSelectedDistrict("");
    setOfficeLevel("region");
    setErrors({});
  };

  const seedServices = async () => {
    if (
      !confirm(
        lang === "sw"
          ? "Je, unataka kuingiza huduma za awali kwenye mfumo?"
          : "Do you want to seed initial services into the system?",
      )
    )
      return;

    setSeeding(true);
    try {
      const { error } = await supabase
        .from("services")
        .upsert(INITIAL_SERVICES, { onConflict: "name" });
      if (error) throw error;
      showToast(
        lang === "sw" ? "Huduma zimeingizwa kikamilifu!" : "Services seeded successfully!",
        "success",
      );
    } catch (err: unknown) {
      const _e = err as { message?: string };
      const _err = err as { message?: string };
      showToast(_err.message ?? "", "error");
    } finally {
      setSeeding(false);
    }
  };

  const handleDeleteStaff = async (staffId: string) => {
    // Prevent admin from deleting themselves
    if (staffId === user?.id) {
      showToast(
        lang === "sw" ? "Huwezi kujifuta mwenyewe." : "You cannot delete yourself.",
        "error",
      );
      return;
    }

    if (
      !confirm(
        lang === "sw"
          ? "Je, una uhakika unataka kumzima mtumishi huyu? Akaunti yake itazimwa lakini data haitafutwa."
          : "Are you sure you want to deactivate this staff member? Their account will be disabled but data preserved.",
      )
    )
      return;

    try {
      // Soft delete: deactivate account + revoke role (preserves FK references)
      const { error } = await supabase
        .from("users")
        .update({
          account_status: "deactivated",
          role: "citizen", // Revoke staff/admin access
        })
        .eq("id", staffId);

      if (error) throw error;

      showToast(lang === "sw" ? "Mtumishi amezimwa" : "Staff deactivated", "success");
      setShowDetailsModal(false);
      setSelectedStaff(null);
      fetchStaff();
    } catch (err: unknown) {
      const _err = err as { message?: string };
      showToast(
        lang === "sw"
          ? `Imeshindwa: ${_err.message || "Hitilafu isiyojulikana"}`
          : `Failed: ${_err.message || "Unknown error"}`,
        "error",
      );
    }
  };

  const handleStaffClick = (staffMember: UserProfile) => {
    setSelectedStaff(staffMember);
    setEditFormData({
      role: staffMember.role as "staff" | "admin",
      region: staffMember.assigned_region || "",
      district: staffMember.assigned_district || "",
      officeLevel: staffMember.assigned_district ? "district" : "region",
    });
    setEditingRole(false);
    setEditingLocation(false);
    setShowDetailsModal(true);
  };

  const handleUpdateRole = async () => {
    if (!selectedStaff) return;

    setUpdating(true);
    try {
      const { error } = await supabase
        .from("users")
        .update({ role: editFormData.role })
        .eq("id", selectedStaff.id);

      if (error) throw error;

      showToast(lang === "sw" ? "Wajibu umesasishwa" : "Role updated successfully", "success");
      setEditingRole(false);
      setSelectedStaff({ ...selectedStaff, role: editFormData.role });
      fetchStaff();
    } catch (err: unknown) {
      const _e = err as { message?: string };
      const _err = err as { message?: string };
      showToast(_err.message ?? "", "error");
    } finally {
      setUpdating(false);
    }
  };

  const handleUpdateLocation = async () => {
    if (!selectedStaff) return;

    setUpdating(true);
    try {
      const updateData: Record<string, unknown> = {
        assigned_region: editFormData.region,
        assigned_district: editFormData.officeLevel === "district" ? editFormData.district : null,
      };

      const { error } = await supabase.from("users").update(updateData).eq("id", selectedStaff.id);

      if (error) throw error;

      showToast(lang === "sw" ? "Eneo limesasishwa" : "Location updated successfully", "success");
      setEditingLocation(false);
      setSelectedStaff({
        ...selectedStaff,
        assigned_region: editFormData.region,
        assigned_district:
          editFormData.officeLevel === "district" ? editFormData.district : undefined,
      });
      fetchStaff();
    } catch (err: unknown) {
      const _e = err as { message?: string };
      const _err = err as { message?: string };
      showToast(_err.message ?? "", "error");
    } finally {
      setUpdating(false);
    }
  };

  const handleResetStaffPassword = async () => {
    if (!selectedStaff || !resetPwd.trim()) return;
    if (resetPwd.length < 6) {
      showToast(
        lang === "sw"
          ? "Nywila lazima iwe na herufi 6 au zaidi"
          : "Password must be at least 6 characters",
        "error",
      );
      return;
    }

    setResetting(true);
    try {
      const { error: resetError } = await adminResetPassword({
        userId: selectedStaff.id,
        newPassword: resetPwd,
      });

      if (resetError) {
        if (resetError.includes("SUPABASE_SERVICE_ROLE_KEY")) {
          showToast(
            lang === "sw"
              ? "Hatua ya ziada: Ongeza SUPABASE_SERVICE_ROLE_KEY kwenye Vercel."
              : "Extra step: Add SUPABASE_SERVICE_ROLE_KEY to Vercel env vars.",
            "error",
          );
          return;
        }
        throw new Error(resetError);
      }

      // Mark account as pending so staff is forced to change password on next login
      await supabase
        .from("users")
        .update({ is_verified: false, account_status: "pending" })
        .eq("id", selectedStaff.id);

      showToast(
        lang === "sw"
          ? "Nywila imebadilishwa! Mtumishi atabadilisha anapoingia."
          : "Password reset! Staff will be prompted to change it on next login.",
        "success",
      );

      setResetDone(true);
      fetchStaff();
    } catch (err: unknown) {
      const _e = err as { message?: string };
      showToast(_e.message ?? "Reset failed", "error");
    } finally {
      setResetting(false);
    }
  };

  const openResetModal = (staffMember: UserProfile) => {
    setSelectedStaff(staffMember);
    setResetPwd(generatePassword());
    setResetPwdVisible(false);
    setResetDone(false);
    setShowDetailsModal(false);
    setShowResetModal(true);
  };

  const filteredStaff = staff.filter(
    (s) =>
      `${s.first_name} ${s.last_name}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (s.assigned_region || "").toLowerCase().includes(searchTerm.toLowerCase()),
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-stone-800">
            {lang === "sw" ? "Usimamizi wa Watumishi" : "Staff Management"}
          </h2>
          <p className="text-stone-500 text-sm">
            {lang === "sw"
              ? "Sajili na panga watumishi kwenye ofisi za mikoa na wilaya."
              : "Register and assign staff to regional and district offices."}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={seedServices}
            disabled={seeding}
            className="bg-stone-100 text-stone-600 px-6 py-3 rounded-2xl font-bold flex items-center gap-2 hover:bg-stone-200 transition-all"
          >
            {seeding ? <Loader2 className="animate-spin" /> : <DatabaseZap size={20} />}
            {lang === "sw" ? "Ingiza Huduma" : "Seed Services"}
          </button>
          <button
            onClick={() => {
              resetForm();
              setNewStaff((prev) => ({ ...prev, password: generatePassword() }));
              setShowAddModal(true);
            }}
            className="bg-emerald-600 text-white px-6 py-3 rounded-2xl font-bold flex items-center gap-2 hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-200"
          >
            <Plus size={20} /> {lang === "sw" ? "Ongeza Mtumishi" : "Add Staff"}
          </button>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-stone-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-stone-100 flex items-center gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-stone-400" />
            <input
              type="text"
              placeholder={lang === "sw" ? "Tafuta mtumishi..." : "Search staff..."}
              className="w-full pl-10 pr-4 py-2 rounded-xl border border-stone-200 focus:border-primary outline-none transition-all text-sm"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead className="bg-stone-50 text-stone-500 text-xs font-bold uppercase tracking-wider">
              <tr>
                <th className="px-6 py-4">{lang === "sw" ? "Mtumishi" : "Staff Member"}</th>
                <th className="px-6 py-4">
                  {lang === "sw" ? "Ofisi / Eneo" : "Office / Location"}
                </th>
                <th className="px-6 py-4">{lang === "sw" ? "Wajibu" : "Role"}</th>
                <th className="px-6 py-4">{lang === "sw" ? "Hali" : "Status"}</th>
                <th className="px-6 py-4 text-right">{lang === "sw" ? "Kitendo" : "Action"}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {loading && staff.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center">
                    <Loader2 className="h-8 w-8 text-primary animate-spin mx-auto" />
                  </td>
                </tr>
              ) : (
                filteredStaff.map((s) => (
                  <tr
                    key={s.id}
                    onClick={() => handleStaffClick(s)}
                    className="hover:bg-stone-50 transition-colors cursor-pointer"
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-full bg-stone-100 flex items-center justify-center text-stone-500 font-bold">
                          {s.first_name?.[0] || "S"}
                          {s.last_name?.[0] || "M"}
                        </div>
                        <div>
                          <p className="font-bold text-stone-800">
                            {s.first_name} {s.last_name}
                          </p>
                          <p className="text-xs text-stone-500">{s.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-stone-600">
                        <div className="flex items-center gap-2">
                          <Building2 size={14} className="text-stone-400" />
                          <span className="text-sm">
                            {s.assigned_region}
                            {s.assigned_district ? ` / ${s.assigned_district}` : ""}
                            {s.ward ? ` / ${s.ward}` : ""}
                          </span>
                        </div>
                        <span
                          className={cn(
                            "text-[10px] font-bold uppercase tracking-wider mt-0.5 inline-block px-1.5 py-0.5 rounded",
                            s.department_id
                              ? "bg-indigo-50 text-indigo-600"
                              : s.ward
                                ? "bg-emerald-50 text-emerald-600"
                                : s.assigned_district
                                  ? "bg-blue-50 text-blue-600"
                                  : "bg-amber-50 text-amber-600",
                          )}
                        >
                          {s.department_id
                            ? lang === "sw"
                              ? "Idara"
                              : "Department"
                            : s.ward
                              ? lang === "sw"
                                ? "Kata"
                                : "Ward"
                              : s.assigned_district
                                ? lang === "sw"
                                  ? "Wilaya"
                                  : "District"
                                : lang === "sw"
                                  ? "Mkoa"
                                  : "Regional"}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={cn(
                          "px-2 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider",
                          s.role === "admin"
                            ? "bg-purple-100 text-purple-600"
                            : "bg-emerald-100 text-emerald-600",
                        )}
                      >
                        {s.role === "admin"
                          ? lang === "sw"
                            ? "Msimamizi"
                            : "Admin"
                          : lang === "sw"
                            ? "Mtumishi"
                            : "Staff"}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="flex items-center gap-1.5 text-xs font-medium text-emerald-600">
                        <div className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                        Active
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            openResetModal(s);
                          }}
                          title={lang === "sw" ? "Weka upya nywila" : "Reset password"}
                          aria-label={lang === "sw" ? "Weka upya nywila" : "Reset password"}
                          className="p-2 text-stone-400 hover:text-blue-600 transition-colors"
                        >
                          <KeyRound size={16} />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteStaff(s.id);
                          }}
                          title={lang === "sw" ? "Zima mtumishi" : "Deactivate staff"}
                          aria-label={lang === "sw" ? "Zima mtumishi" : "Deactivate staff"}
                          className="p-2 text-stone-400 hover:text-red-500 transition-colors"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
              {filteredStaff.length === 0 && !loading && (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-stone-400">
                    {lang === "sw" ? "Hakuna watumishi waliopatikana." : "No staff members found."}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Staff Modal - Simplified with just email */}
      <AnimatePresence>
        {showAddModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl overflow-hidden"
            >
              <div className="px-8 py-6 border-b border-stone-100 flex items-center justify-between bg-stone-50/50">
                <h3 className="text-xl font-heading font-extrabold text-stone-900">
                  {lang === "sw" ? "Sajili Mtumishi Mpya" : "Register New Staff"}
                </h3>
                <button
                  onClick={() => setShowAddModal(false)}
                  title={lang === "sw" ? "Funga modal" : "Close modal"}
                  aria-label={lang === "sw" ? "Funga modal" : "Close modal"}
                  className="p-2 hover:bg-stone-200 rounded-full transition-colors"
                >
                  <X className="h-5 w-5 text-stone-500" />
                </button>
              </div>

              <form onSubmit={handleCreateStaff} className="p-8 space-y-6">
                <div className="space-y-6">
                  {/* Name Fields */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-stone-500 uppercase tracking-wider">
                        {lang === "sw" ? "Jina la Kwanza" : "First Name"} *
                      </label>
                      <input
                        required
                        placeholder={lang === "sw" ? "Jina" : "First name"}
                        className="w-full h-11 px-4 rounded-xl border border-stone-200 focus:border-emerald-500 outline-none text-sm"
                        value={newStaff.firstName}
                        onChange={(e) => setNewStaff({ ...newStaff, firstName: e.target.value })}
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-stone-500 uppercase tracking-wider">
                        {lang === "sw" ? "Jina la Mwisho" : "Last Name"} *
                      </label>
                      <input
                        required
                        placeholder={lang === "sw" ? "Ukoo" : "Last name"}
                        className="w-full h-11 px-4 rounded-xl border border-stone-200 focus:border-emerald-500 outline-none text-sm"
                        value={newStaff.lastName}
                        onChange={(e) => setNewStaff({ ...newStaff, lastName: e.target.value })}
                      />
                    </div>
                  </div>

                  {/* Email + Phone */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-stone-500 uppercase tracking-wider flex items-center gap-1">
                        <Mail size={14} /> {lang === "sw" ? "Barua Pepe" : "Email"} *
                      </label>
                      <input
                        required
                        type="email"
                        placeholder="staff@example.com"
                        className={cn(
                          "w-full h-11 px-4 rounded-xl border focus:border-emerald-500 outline-none text-sm",
                          errors.email ? "border-red-300 bg-red-50" : "border-stone-200",
                        )}
                        value={newStaff.email}
                        onChange={(e) => setNewStaff({ ...newStaff, email: e.target.value })}
                      />
                      {errors.email && (
                        <p className="text-xs text-red-500 flex items-center gap-1 mt-1">
                          <AlertCircle size={12} /> {errors.email}
                        </p>
                      )}
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-stone-500 uppercase tracking-wider">
                        {lang === "sw" ? "Simu" : "Phone"}
                      </label>
                      <input
                        type="tel"
                        placeholder="+255..."
                        className="w-full h-11 px-4 rounded-xl border border-stone-200 focus:border-emerald-500 outline-none text-sm"
                        value={newStaff.phone}
                        onChange={(e) => setNewStaff({ ...newStaff, phone: e.target.value })}
                      />
                    </div>
                  </div>

                  {/* Employee Number */}
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-stone-500 uppercase tracking-wider">
                      {lang === "sw" ? "Nambari ya Mfanyakazi" : "Employee Number"}
                    </label>
                    <input
                      placeholder={lang === "sw" ? "mfano: EMP-2026-001" : "e.g. EMP-2026-001"}
                      className="w-full h-11 px-4 rounded-xl border border-stone-200 focus:border-emerald-500 outline-none text-sm font-mono"
                      value={newStaff.employeeNumber}
                      onChange={(e) => setNewStaff({ ...newStaff, employeeNumber: e.target.value })}
                    />
                  </div>

                  {/* Password Input */}
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-stone-500 uppercase tracking-wider flex items-center gap-1">
                      <KeyRound size={13} />{" "}
                      {lang === "sw" ? "Nywila ya Muda" : "Temporary Password"}{" "}
                      <span className="text-red-500">*</span>
                    </label>
                    <div className="flex gap-2">
                      <div className="relative flex-1">
                        <input
                          required
                          type={newPasswordVisible ? "text" : "password"}
                          placeholder="e.g. Staff2026!"
                          className="w-full h-12 px-4 pr-10 rounded-xl border border-stone-200 focus:border-emerald-500 outline-none transition-all font-mono text-sm"
                          value={newStaff.password}
                          onChange={(e) => setNewStaff({ ...newStaff, password: e.target.value })}
                        />
                        <button
                          type="button"
                          onClick={() => setNewPasswordVisible((v) => !v)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600"
                          title={newPasswordVisible ? "Hide" : "Show"}
                        >
                          {newPasswordVisible ? <EyeOff size={16} /> : <Eye size={16} />}
                        </button>
                      </div>
                      <button
                        type="button"
                        onClick={() => setNewStaff({ ...newStaff, password: generatePassword() })}
                        className="px-3 h-12 bg-stone-100 hover:bg-stone-200 text-stone-600 rounded-xl transition-colors"
                        title={lang === "sw" ? "Tengeneza nywila mpya" : "Generate new password"}
                      >
                        <RefreshCw size={16} />
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          void navigator.clipboard.writeText(newStaff.password);
                          showToast(
                            lang === "sw" ? "Nywila imenakiliwa!" : "Password copied!",
                            "success",
                          );
                        }}
                        className="px-3 h-12 bg-stone-100 hover:bg-stone-200 text-stone-600 rounded-xl transition-colors"
                        title={lang === "sw" ? "Nakili nywila" : "Copy password"}
                      >
                        <Copy size={16} />
                      </button>
                    </div>
                    <p className="text-[10px] text-amber-600 font-medium flex items-center gap-1">
                      ⚠{" "}
                      {lang === "sw"
                        ? "Nywila hii ni ya muda. Mtumishi atalazimika kuibadilisha anapoingia kwa mara ya kwanza."
                        : "Temporary password. Staff must change it on first login — their account auto-verifies when they do."}
                    </p>
                  </div>

                  {/* Region Selection */}
                  <div className="space-y-2">
                    <label
                      htmlFor="staff-region-select"
                      className="text-xs font-bold text-stone-500 uppercase tracking-wider flex items-center gap-1"
                    >
                      <Globe size={14} /> {lang === "sw" ? "Mkoa" : "Region"}{" "}
                      <span className="text-red-500">*</span>
                    </label>
                    <select
                      id="staff-region-select"
                      required
                      title={lang === "sw" ? "Chagua mkoa" : "Select region"}
                      aria-label={lang === "sw" ? "Chagua mkoa" : "Select region"}
                      className={cn(
                        "w-full h-12 px-4 rounded-xl border focus:border-primary outline-none transition-all bg-white",
                        errors.region ? "border-red-300 bg-red-50" : "border-stone-200",
                      )}
                      value={selectedRegion}
                      onChange={(e) => {
                        setSelectedRegion(e.target.value);
                        setSelectedDistrict("");
                        setErrors({});
                      }}
                    >
                      <option value="">
                        {lang === "sw" ? "-- Chagua Mkoa --" : "-- Select Region --"}
                      </option>
                      {regions.map((r) => (
                        <option key={r} value={r}>
                          {r}
                        </option>
                      ))}
                    </select>
                    {errors.region && (
                      <p className="text-xs text-red-500 flex items-center gap-1 mt-1">
                        <AlertCircle size={12} /> {errors.region}
                      </p>
                    )}
                  </div>

                  {/* Staff Level */}
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-stone-500 uppercase tracking-wider">
                      {lang === "sw" ? "Kiwango cha Mtumishi" : "Staff Level"} *
                    </label>
                    <select
                      className="w-full h-11 px-4 rounded-xl border border-stone-200 focus:border-emerald-500 outline-none text-sm bg-white"
                      value={newStaff.staffLevel}
                      onChange={(e) => {
                        const level = e.target.value as "regional" | "district" | "ward";
                        setNewStaff({ ...newStaff, staffLevel: level, ward: "" });
                        if (level === "regional") {
                          setOfficeLevel("region");
                          setSelectedDistrict("");
                        } else {
                          setOfficeLevel("district");
                        }
                      }}
                    >
                      <option value="regional">
                        {lang === "sw" ? "Mtumishi wa Mkoa (Regional)" : "Regional Staff"}
                      </option>
                      <option value="district">
                        {lang === "sw" ? "Mtumishi wa Wilaya (District)" : "District Staff"}
                      </option>
                      <option value="ward">
                        {lang === "sw" ? "Afisa wa Kata (Ward Officer)" : "Ward Officer"}
                      </option>
                    </select>
                  </div>

                  {/* District Selection (if district level) */}
                  {selectedRegion && newStaff.staffLevel !== "regional" && (
                    <div className="space-y-2">
                      <label
                        htmlFor="staff-district-select"
                        className="text-xs font-bold text-stone-500 uppercase tracking-wider flex items-center gap-1"
                      >
                        <MapPin size={14} /> {lang === "sw" ? "Wilaya" : "District"}{" "}
                        <span className="text-red-500">*</span>
                      </label>
                      <select
                        id="staff-district-select"
                        required
                        title={lang === "sw" ? "Chagua wilaya" : "Select district"}
                        aria-label={lang === "sw" ? "Chagua wilaya" : "Select district"}
                        className={cn(
                          "w-full h-12 px-4 rounded-xl border focus:border-primary outline-none transition-all bg-white",
                          errors.district ? "border-red-300 bg-red-50" : "border-stone-200",
                        )}
                        value={selectedDistrict}
                        onChange={(e) => {
                          setSelectedDistrict(e.target.value);
                          setErrors({});
                        }}
                      >
                        <option value="">
                          {lang === "sw" ? "-- Chagua Wilaya --" : "-- Select District --"}
                        </option>
                        {getDistrictsForRegion(selectedRegion).map((d) => (
                          <option key={d} value={d}>
                            {d}
                          </option>
                        ))}
                      </select>
                      {errors.district && (
                        <p className="text-xs text-red-500 flex items-center gap-1 mt-1">
                          <AlertCircle size={12} /> {errors.district}
                        </p>
                      )}
                    </div>
                  )}

                  {/* Role Selection */}
                  <div className="space-y-2">
                    <label
                      htmlFor="staff-role-select"
                      className="text-xs font-bold text-stone-500 uppercase tracking-wider flex items-center gap-1"
                    >
                      <Shield size={14} /> {lang === "sw" ? "Wajibu" : "Role"}
                    </label>
                    <select
                      id="staff-role-select"
                      required
                      title={lang === "sw" ? "Chagua wajibu" : "Select role"}
                      aria-label={lang === "sw" ? "Chagua wajibu" : "Select role"}
                      className="w-full h-12 px-4 rounded-xl border border-stone-200 focus:border-primary outline-none transition-all bg-white"
                      value={newStaff.role}
                      onChange={(e) =>
                        setNewStaff({ ...newStaff, role: e.target.value as "staff" | "admin" })
                      }
                    >
                      <option value="staff">
                        {lang === "sw"
                          ? "Mtumishi - Kutazama, Kuidhinisha, Kuthibitisha"
                          : "Staff - View, Approve, Verify"}
                      </option>
                      <option value="admin">
                        {lang === "sw"
                          ? "Msimamizi - Kuunda, Kuidhinisha, Kudhibiti"
                          : "Admin - Create, Approve, Manage"}
                      </option>
                    </select>
                  </div>

                  {/* Office Preview */}
                  {selectedRegion && (
                    <div className="bg-emerald-50 p-4 rounded-xl border border-emerald-100">
                      <p className="text-xs font-bold text-emerald-700 uppercase tracking-wider mb-2">
                        {lang === "sw" ? "Ofisi Itakayopangwa" : "Assigned Office"}
                      </p>
                      <div className="flex items-center gap-2 text-emerald-800">
                        <Building2 size={16} />
                        <span className="font-medium">
                          {officeLevel === "region"
                            ? `${selectedRegion} ${lang === "sw" ? "Ofisi ya Mkoa" : "Regional Office"}`
                            : `${selectedDistrict} ${lang === "sw" ? "Ofisi ya Wilaya" : "District Office"}, ${selectedRegion}`}
                        </span>
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex gap-4 pt-6 border-t border-stone-100">
                  <button
                    type="button"
                    onClick={() => setShowAddModal(false)}
                    className="flex-1 h-14 bg-stone-100 text-stone-600 rounded-2xl font-bold hover:bg-stone-200 transition-all"
                  >
                    {lang === "sw" ? "Ghairi" : "Cancel"}
                  </button>
                  <button
                    disabled={loading}
                    type="submit"
                    className="flex-1 h-14 bg-emerald-600 text-white rounded-2xl font-bold hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-200 flex items-center justify-center gap-2"
                  >
                    {loading ? <Loader2 className="animate-spin" /> : <UserPlus size={20} />}
                    {lang === "sw" ? "Sajili" : "Register"}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Credentials Created Dialog */}
      <AnimatePresence>
        {createdTempPassword && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden"
            >
              <div className="bg-emerald-600 px-6 py-5 text-center">
                <div className="w-14 h-14 bg-white/20 rounded-2xl flex items-center justify-center mx-auto mb-3">
                  <CheckCircle size={28} className="text-white" />
                </div>
                <h3 className="text-lg font-black text-white">
                  {lang === "sw" ? "Mtumishi Amesajiliwa!" : "Staff Registered!"}
                </h3>
                <p className="text-emerald-100 text-xs mt-1">
                  {lang === "sw"
                    ? "Mpe taarifa hizi mtumishi"
                    : "Share these credentials with the staff member"}
                </p>
              </div>
              <div className="p-6 space-y-4">
                <div className="bg-stone-50 rounded-xl p-4 space-y-3">
                  <div>
                    <p className="text-[10px] font-bold text-stone-400 uppercase tracking-wider mb-0.5">
                      {lang === "sw" ? "Barua Pepe" : "Email"}
                    </p>
                    <p className="text-sm font-bold text-stone-800 font-mono">
                      {newStaff.email || "—"}
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-stone-400 uppercase tracking-wider mb-0.5">
                      {lang === "sw" ? "Nywila ya Muda" : "Temporary Password"}
                    </p>
                    <p className="text-lg font-black text-emerald-700 font-mono tracking-wider">
                      {createdTempPassword}
                    </p>
                  </div>
                </div>
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-3">
                  <p className="text-xs text-amber-700 font-medium">
                    {lang === "sw"
                      ? "⚠ Nywila hii ni ya muda. Mtumishi anapaswa kuibadilisha mara anapoingia kwa mara ya kwanza."
                      : "⚠ This is a temporary password. The staff member should change it on first login."}
                  </p>
                </div>
                <button
                  onClick={() => setCreatedTempPassword("")}
                  className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-sm transition-colors"
                >
                  {lang === "sw" ? "Nimekwisha — Funga" : "Done — Close"}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Staff Details Modal */}
      <AnimatePresence>
        {showDetailsModal && selectedStaff && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl overflow-hidden max-h-[90vh] overflow-y-auto"
            >
              {/* Header */}
              <div className="px-8 py-6 border-b border-stone-100 flex items-center justify-between bg-linear-to-r from-emerald-50 to-blue-50">
                <div className="flex items-center gap-4">
                  <div className="h-16 w-16 rounded-full bg-linear-to-br from-emerald-500 to-blue-600 flex items-center justify-center text-white text-xl font-bold shadow-lg">
                    {selectedStaff.first_name?.[0] || "S"}
                    {selectedStaff.last_name?.[0] || "M"}
                  </div>
                  <div>
                    <h3 className="text-xl font-heading font-extrabold text-stone-900">
                      {selectedStaff.first_name} {selectedStaff.last_name}
                    </h3>
                    <p className="text-sm text-stone-500">{selectedStaff.email}</p>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setShowDetailsModal(false);
                    setSelectedStaff(null);
                    setEditingRole(false);
                    setEditingLocation(false);
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
                {/* Staff Info Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Phone */}
                  <div className="p-4 bg-stone-50 rounded-2xl">
                    <div className="flex items-center gap-2 text-stone-400 mb-1">
                      <Phone size={14} />
                      <span className="text-xs font-bold uppercase tracking-wider">
                        {lang === "sw" ? "Simu" : "Phone"}
                      </span>
                    </div>
                    <p className="font-bold text-stone-800">
                      {selectedStaff.phone || (lang === "sw" ? "Haijasajiliwa" : "Not provided")}
                    </p>
                  </div>

                  {/* Gender */}
                  <div className="p-4 bg-stone-50 rounded-2xl">
                    <div className="flex items-center gap-2 text-stone-400 mb-1">
                      <User size={14} />
                      <span className="text-xs font-bold uppercase tracking-wider">
                        {lang === "sw" ? "Jinsia" : "Gender"}
                      </span>
                    </div>
                    <p className="font-bold text-stone-800">
                      {selectedStaff.gender === "M"
                        ? lang === "sw"
                          ? "Me"
                          : "Male"
                        : selectedStaff.gender === "F"
                          ? lang === "sw"
                            ? "Ke"
                            : "Female"
                          : lang === "sw"
                            ? "Haijulikani"
                            : "Unknown"}
                    </p>
                  </div>

                  {/* Nationality */}
                  <div className="p-4 bg-stone-50 rounded-2xl">
                    <div className="flex items-center gap-2 text-stone-400 mb-1">
                      <Globe size={14} />
                      <span className="text-xs font-bold uppercase tracking-wider">
                        {lang === "sw" ? "Uraia" : "Nationality"}
                      </span>
                    </div>
                    <p className="font-bold text-stone-800">
                      {selectedStaff.nationality || "Tanzania"}
                    </p>
                  </div>

                  {/* Verification Status */}
                  <div className="p-4 bg-stone-50 rounded-2xl">
                    <div className="flex items-center gap-2 text-stone-400 mb-1">
                      <BadgeCheck size={14} />
                      <span className="text-xs font-bold uppercase tracking-wider">
                        {lang === "sw" ? "Uhakiki" : "Verification"}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      {selectedStaff.is_verified ? (
                        <>
                          <CheckCircle2 size={16} className="text-emerald-500" />
                          <span className="font-bold text-emerald-600">
                            {lang === "sw" ? "Imethibitishwa" : "Verified"}
                          </span>
                        </>
                      ) : (
                        <>
                          <XCircle size={16} className="text-amber-500" />
                          <span className="font-bold text-amber-600">
                            {lang === "sw" ? "Haijahaikitiwa" : "Pending"}
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                {/* Role Section */}
                <div className="p-4 bg-purple-50 rounded-2xl border border-purple-100">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2 text-purple-600">
                      <Shield size={16} />
                      <span className="text-xs font-bold uppercase tracking-wider">
                        {lang === "sw" ? "Wajibu" : "Role"}
                      </span>
                    </div>
                    {!editingRole && (
                      <button
                        onClick={() => setEditingRole(true)}
                        title={lang === "sw" ? "Hariri wajibu" : "Edit role"}
                        aria-label={lang === "sw" ? "Hariri wajibu" : "Edit role"}
                        className="p-1.5 hover:bg-purple-100 rounded-lg text-purple-500 transition-colors"
                      >
                        <Edit2 size={14} />
                      </button>
                    )}
                  </div>

                  {editingRole ? (
                    <div className="space-y-3">
                      <select
                        title={lang === "sw" ? "Chagua wajibu" : "Select role"}
                        aria-label={lang === "sw" ? "Chagua wajibu" : "Select role"}
                        value={editFormData.role}
                        onChange={(e) =>
                          setEditFormData({
                            ...editFormData,
                            role: e.target.value as "staff" | "admin",
                          })
                        }
                        className="w-full h-12 px-4 rounded-xl border border-purple-200 focus:border-purple-500 outline-none transition-all bg-white"
                      >
                        <option value="staff">
                          {lang === "sw"
                            ? "Mtumishi - Kutazama, Kuidhinisha, Kuthibitisha"
                            : "Staff - View, Approve, Verify"}
                        </option>
                        <option value="admin">
                          {lang === "sw"
                            ? "Msimamizi - Kuunda, Kuidhinisha, Kudhibiti"
                            : "Admin - Create, Approve, Manage"}
                        </option>
                      </select>
                      <div className="flex gap-2">
                        <button
                          onClick={() => setEditingRole(false)}
                          className="flex-1 h-10 bg-stone-100 text-stone-600 rounded-xl font-bold hover:bg-stone-200 transition-all text-sm"
                        >
                          {lang === "sw" ? "Ghairi" : "Cancel"}
                        </button>
                        <button
                          onClick={handleUpdateRole}
                          disabled={updating}
                          className="flex-1 h-10 bg-purple-600 text-white rounded-xl font-bold hover:bg-purple-700 transition-all text-sm flex items-center justify-center gap-2"
                        >
                          {updating ? (
                            <Loader2 size={14} className="animate-spin" />
                          ) : (
                            <CheckCircle2 size={14} />
                          )}
                          {lang === "sw" ? "Hifadhi" : "Save"}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <span
                      className={cn(
                        "px-3 py-1.5 rounded-lg text-sm font-bold",
                        selectedStaff.role === "admin"
                          ? "bg-purple-200 text-purple-700"
                          : "bg-emerald-200 text-emerald-700",
                      )}
                    >
                      {selectedStaff.role === "admin"
                        ? lang === "sw"
                          ? "Msimamizi"
                          : "Admin"
                        : lang === "sw"
                          ? "Mtumishi"
                          : "Staff"}
                    </span>
                  )}
                </div>

                {/* Location Section */}
                <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-100">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2 text-emerald-600">
                      <Building2 size={16} />
                      <span className="text-xs font-bold uppercase tracking-wider">
                        {lang === "sw" ? "Ofisi / Eneo" : "Office / Location"}
                      </span>
                    </div>
                    {!editingLocation && (
                      <button
                        onClick={() => setEditingLocation(true)}
                        title={lang === "sw" ? "Hariri eneo" : "Edit location"}
                        aria-label={lang === "sw" ? "Hariri eneo" : "Edit location"}
                        className="p-1.5 hover:bg-emerald-100 rounded-lg text-emerald-500 transition-colors"
                      >
                        <Edit2 size={14} />
                      </button>
                    )}
                  </div>

                  {editingLocation ? (
                    <div className="space-y-4">
                      <select
                        title={lang === "sw" ? "Chagua mkoa" : "Select region"}
                        aria-label={lang === "sw" ? "Chagua mkoa" : "Select region"}
                        value={editFormData.region}
                        onChange={(e) =>
                          setEditFormData({ ...editFormData, region: e.target.value, district: "" })
                        }
                        className="w-full h-12 px-4 rounded-xl border border-emerald-200 focus:border-emerald-500 outline-none transition-all bg-white"
                      >
                        <option value="">
                          {lang === "sw" ? "-- Chagua Mkoa --" : "-- Select Region --"}
                        </option>
                        {regions.map((r) => (
                          <option key={r} value={r}>
                            {r}
                          </option>
                        ))}
                      </select>

                      {editFormData.region && (
                        <>
                          <div className="flex gap-4 p-3 bg-white rounded-xl">
                            <label className="flex items-center gap-2 cursor-pointer">
                              <input
                                type="radio"
                                name="editOfficeLevel"
                                value="region"
                                checked={editFormData.officeLevel === "region"}
                                onChange={() =>
                                  setEditFormData({
                                    ...editFormData,
                                    officeLevel: "region",
                                    district: "",
                                  })
                                }
                                className="w-4 h-4 text-emerald-600"
                              />
                              <span className="text-sm font-medium text-stone-700">
                                {lang === "sw" ? "Mkoa" : "Regional"}
                              </span>
                            </label>
                            <label className="flex items-center gap-2 cursor-pointer">
                              <input
                                type="radio"
                                name="editOfficeLevel"
                                value="district"
                                checked={editFormData.officeLevel === "district"}
                                onChange={() =>
                                  setEditFormData({ ...editFormData, officeLevel: "district" })
                                }
                                className="w-4 h-4 text-emerald-600"
                              />
                              <span className="text-sm font-medium text-stone-700">
                                {lang === "sw" ? "Wilaya" : "District"}
                              </span>
                            </label>
                          </div>

                          {editFormData.officeLevel === "district" && (
                            <select
                              title={lang === "sw" ? "Chagua wilaya" : "Select district"}
                              aria-label={lang === "sw" ? "Chagua wilaya" : "Select district"}
                              value={editFormData.district}
                              onChange={(e) =>
                                setEditFormData({ ...editFormData, district: e.target.value })
                              }
                              className="w-full h-12 px-4 rounded-xl border border-emerald-200 focus:border-emerald-500 outline-none transition-all bg-white"
                            >
                              <option value="">
                                {lang === "sw" ? "-- Chagua Wilaya --" : "-- Select District --"}
                              </option>
                              {getDistrictsForRegion(editFormData.region).map((d) => (
                                <option key={d} value={d}>
                                  {d}
                                </option>
                              ))}
                            </select>
                          )}
                        </>
                      )}

                      <div className="flex gap-2">
                        <button
                          onClick={() => setEditingLocation(false)}
                          className="flex-1 h-10 bg-stone-100 text-stone-600 rounded-xl font-bold hover:bg-stone-200 transition-all text-sm"
                        >
                          {lang === "sw" ? "Ghairi" : "Cancel"}
                        </button>
                        <button
                          onClick={handleUpdateLocation}
                          disabled={updating || !editFormData.region}
                          className="flex-1 h-10 bg-emerald-600 text-white rounded-xl font-bold hover:bg-emerald-700 transition-all text-sm flex items-center justify-center gap-2 disabled:opacity-50"
                        >
                          {updating ? (
                            <Loader2 size={14} className="animate-spin" />
                          ) : (
                            <CheckCircle2 size={14} />
                          )}
                          {lang === "sw" ? "Hifadhi" : "Save"}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 text-emerald-800">
                      <MapPin size={16} />
                      <span className="font-bold">
                        {selectedStaff.assigned_region ||
                          (lang === "sw" ? "Hakuna eneo" : "No location")}
                        {selectedStaff.assigned_district
                          ? ` / ${selectedStaff.assigned_district}`
                          : selectedStaff.assigned_region
                            ? ` (${lang === "sw" ? "Mkoa" : "Regional"})`
                            : ""}
                      </span>
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="flex gap-3 pt-4 border-t border-stone-100">
                  <button
                    onClick={() => {
                      setShowDetailsModal(false);
                      setSelectedStaff(null);
                    }}
                    className="flex-1 h-12 bg-stone-100 text-stone-600 rounded-2xl font-bold hover:bg-stone-200 transition-all"
                  >
                    {lang === "sw" ? "Funga" : "Close"}
                  </button>
                  <button
                    onClick={() => openResetModal(selectedStaff)}
                    className="h-12 px-5 bg-blue-50 text-blue-600 rounded-2xl font-bold hover:bg-blue-100 transition-all flex items-center gap-2"
                  >
                    <KeyRound size={16} />
                    {lang === "sw" ? "Nywila" : "Reset Pwd"}
                  </button>
                  <button
                    onClick={() => handleDeleteStaff(selectedStaff.id)}
                    className="h-12 px-5 bg-red-50 text-red-600 rounded-2xl font-bold hover:bg-red-100 transition-all flex items-center gap-2"
                  >
                    <Trash2 size={16} />
                    {lang === "sw" ? "Zima" : "Deactivate"}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ── Reset Password Modal ─────────────────────────────────────────── */}
      <AnimatePresence>
        {showResetModal && selectedStaff && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden"
            >
              {/* Header */}
              <div className="px-6 py-5 border-b border-stone-100 flex items-center justify-between bg-stone-50">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-blue-100 rounded-2xl flex items-center justify-center">
                    <KeyRound size={20} className="text-blue-600" />
                  </div>
                  <div>
                    <h3 className="font-bold text-stone-900">
                      {lang === "sw" ? "Weka Upya Nywila" : "Reset Password"}
                    </h3>
                    <p className="text-xs text-stone-500">
                      {selectedStaff.first_name} {selectedStaff.last_name}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setShowResetModal(false);
                    setResetDone(false);
                  }}
                  className="p-2 hover:bg-stone-200 rounded-full transition-colors"
                  aria-label="Close"
                >
                  <X size={18} className="text-stone-500" />
                </button>
              </div>

              <div className="p-6 space-y-5">
                {resetDone ? (
                  /* Success state */
                  <div className="text-center py-4 space-y-3">
                    <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto">
                      <CheckCircle2 size={32} className="text-emerald-600" />
                    </div>
                    <p className="font-bold text-stone-800">
                      {lang === "sw" ? "Nywila imewekwa upya!" : "Password reset done!"}
                    </p>
                    <p className="text-sm text-stone-500">
                      {lang === "sw"
                        ? "Mpe mtumishi nywila mpya hii. Atalazimika kuibadilisha anapoingia."
                        : "Share this new password with the staff member. They must change it on next login."}
                    </p>
                    <div className="bg-stone-50 rounded-xl p-4 flex items-center justify-between gap-3">
                      <span className="font-mono font-bold text-lg text-emerald-700 tracking-wider">
                        {resetPwd}
                      </span>
                      <button
                        onClick={() => {
                          void navigator.clipboard.writeText(resetPwd);
                          showToast(lang === "sw" ? "Nywila imenakiliwa!" : "Copied!", "success");
                        }}
                        className="p-2 bg-white border border-stone-200 rounded-lg hover:bg-stone-100 transition-colors"
                        title="Copy"
                      >
                        <Copy size={16} className="text-stone-500" />
                      </button>
                    </div>
                    <button
                      onClick={() => {
                        setShowResetModal(false);
                        setResetDone(false);
                      }}
                      className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold transition-colors"
                    >
                      {lang === "sw" ? "Sawa — Funga" : "Done — Close"}
                    </button>
                  </div>
                ) : (
                  /* Input state */
                  <>
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-stone-500 uppercase tracking-wider">
                        {lang === "sw" ? "Nywila Mpya" : "New Password"}
                      </label>
                      <div className="flex gap-2">
                        <div className="relative flex-1">
                          <input
                            type={resetPwdVisible ? "text" : "password"}
                            className="w-full h-12 px-4 pr-10 rounded-xl border border-stone-200 focus:border-blue-500 outline-none transition-all font-mono text-sm"
                            value={resetPwd}
                            onChange={(e) => setResetPwd(e.target.value)}
                            placeholder="Min. 6 characters"
                          />
                          <button
                            type="button"
                            onClick={() => setResetPwdVisible((v) => !v)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600"
                          >
                            {resetPwdVisible ? <EyeOff size={16} /> : <Eye size={16} />}
                          </button>
                        </div>
                        <button
                          type="button"
                          onClick={() => setResetPwd(generatePassword())}
                          className="px-3 h-12 bg-stone-100 hover:bg-stone-200 text-stone-600 rounded-xl transition-colors"
                          title="Generate"
                        >
                          <RefreshCw size={16} />
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            void navigator.clipboard.writeText(resetPwd);
                            showToast(lang === "sw" ? "Nywila imenakiliwa!" : "Copied!", "success");
                          }}
                          className="px-3 h-12 bg-stone-100 hover:bg-stone-200 text-stone-600 rounded-xl transition-colors"
                          title="Copy"
                        >
                          <Copy size={16} />
                        </button>
                      </div>
                      <p className="text-[10px] text-amber-600 font-medium">
                        ⚠{" "}
                        {lang === "sw"
                          ? "Mtumishi atalazimika kubadilisha nywila hii anapoingia kwa mara ya kwanza."
                          : "Staff must change this password on their next login — account auto-verifies when they do."}
                      </p>
                    </div>

                    <div className="bg-blue-50 border border-blue-100 rounded-xl p-3 text-xs text-blue-700">
                      <strong>{selectedStaff.email}</strong>
                      {" · "}
                      <span
                        className={
                          selectedStaff.is_verified ? "text-emerald-600" : "text-amber-600"
                        }
                      >
                        {selectedStaff.is_verified
                          ? lang === "sw"
                            ? "Imethibitishwa"
                            : "Verified"
                          : lang === "sw"
                            ? "Inasubiri"
                            : "Pending"}
                      </span>
                    </div>

                    <div className="flex gap-3">
                      <button
                        onClick={() => {
                          setShowResetModal(false);
                          setResetDone(false);
                        }}
                        className="flex-1 h-12 bg-stone-100 text-stone-600 rounded-2xl font-bold hover:bg-stone-200 transition-all"
                      >
                        {lang === "sw" ? "Ghairi" : "Cancel"}
                      </button>
                      <button
                        onClick={handleResetStaffPassword}
                        disabled={resetting || !resetPwd.trim()}
                        className="flex-1 h-12 bg-blue-600 text-white rounded-2xl font-bold hover:bg-blue-700 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                      >
                        {resetting ? (
                          <Loader2 size={18} className="animate-spin" />
                        ) : (
                          <KeyRound size={18} />
                        )}
                        {lang === "sw" ? "Weka Upya" : "Reset Password"}
                      </button>
                    </div>
                  </>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
