import React, { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Building,
  Search,
  Plus,
  X,
  Loader2,
  ChevronDown,
  ChevronRight,
  Users,
  Shield,
  MapPin,
  Phone,
  Mail,
  Trash2,
  Edit3,
  UserPlus,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";
import { supabase, UserProfile } from "@/lib/supabase";
import { useLanguage } from "@/context/LanguageContext";
import { useToast } from "@/context/ToastContext";
import { useAuth } from "@/context/AuthContext";
import { logActivity } from "@/lib/activity-log";
import { cn } from "@/lib/utils";

// ── Types ────────────────────────────────────────────────────────────────────
interface Department {
  id: string;
  name: string;
  name_sw?: string;
  code: string;
  level: "national" | "regional" | "district";
  parent_department_id?: string;
  region?: string;
  district?: string;
  contact_email?: string;
  contact_phone?: string;
  address?: string;
  description?: string;
  active: boolean;
  created_at: string;
}

interface DeptUser {
  id: string;
  user_id: string;
  department_id: string;
  role: "head" | "officer" | "clerk";
  assigned_at: string;
  users?: Partial<UserProfile>;
}

const INITIAL_FORM = {
  name: "",
  name_sw: "",
  code: "",
  level: "district" as "national" | "regional" | "district",
  region: "",
  district: "",
  contact_email: "",
  contact_phone: "",
  address: "",
  description: "",
};

const LEVEL_COLORS = {
  national: "bg-red-50 text-red-700 border-red-200",
  regional: "bg-blue-50 text-blue-700 border-blue-200",
  district: "bg-purple-50 text-purple-700 border-purple-200",
};

// Pre-defined department categories with auto-fill data
const DEPARTMENT_CATEGORIES = [
  // Security & Law Enforcement
  { name: "Tanzania Police Force", name_sw: "Jeshi la Polisi Tanzania", code: "TPF" },
  { name: "Immigration Department", name_sw: "Idara ya Uhamiaji", code: "IMM" },
  { name: "Fire and Rescue Force", name_sw: "Jeshi la Zimamoto na Uokoaji", code: "FRF" },
  { name: "Tanzania Prisons Service", name_sw: "Jeshi la Magereza Tanzania", code: "TPS" },
  // Judiciary & Legal
  { name: "Judiciary of Tanzania", name_sw: "Mahakama ya Tanzania", code: "JUD" },
  { name: "Attorney General Office", name_sw: "Ofisi ya Mwanasheria Mkuu", code: "AGO" },
  // Finance & Revenue
  { name: "Tanzania Revenue Authority", name_sw: "Mamlaka ya Mapato Tanzania", code: "TRA" },
  { name: "Ministry of Finance", name_sw: "Wizara ya Fedha", code: "MOF" },
  // Health
  { name: "Ministry of Health", name_sw: "Wizara ya Afya", code: "MOH" },
  { name: "NHIF (Health Insurance)", name_sw: "Mfuko wa Bima ya Afya (NHIF)", code: "NHIF" },
  // Education
  { name: "Ministry of Education", name_sw: "Wizara ya Elimu", code: "MOE" },
  { name: "NECTA (Examinations)", name_sw: "Baraza la Mitihani (NECTA)", code: "NECTA" },
  { name: "HESLB (Student Loans)", name_sw: "Bodi ya Mikopo (HESLB)", code: "HESLB" },
  // Land & Environment
  { name: "Ministry of Lands", name_sw: "Wizara ya Ardhi", code: "MOL" },
  { name: "NEMC (Environment)", name_sw: "Baraza la Mazingira (NEMC)", code: "NEMC" },
  // Transport
  { name: "TANROADS", name_sw: "Wakala wa Barabara Tanzania", code: "TNR" },
  { name: "LATRA (Transport)", name_sw: "Mamlaka ya Usafiri (LATRA)", code: "LATRA" },
  // Business & Industry
  { name: "BRELA (Business Registration)", name_sw: "Usajili wa Biashara (BRELA)", code: "BRELA" },
  { name: "Tanzania Investment Centre", name_sw: "Kituo cha Uwekezaji", code: "TIC" },
  // Social & Labour
  { name: "Social Welfare Department", name_sw: "Idara ya Ustawi wa Jamii", code: "SWD" },
  { name: "Ministry of Labour", name_sw: "Wizara ya Kazi na Ajira", code: "MOLAB" },
  { name: "NSSF (Social Security)", name_sw: "Mfuko wa Hifadhi ya Jamii (NSSF)", code: "NSSF" },
  // Registration & Identity
  { name: "RITA (Births & Deaths)", name_sw: "Usajili wa Vizazi/Vifo (RITA)", code: "RITA" },
  { name: "NIDA (National ID)", name_sw: "Vitambulisho vya Taifa (NIDA)", code: "NIDA" },
  { name: "TCRA (Communications)", name_sw: "Mamlaka ya Mawasiliano (TCRA)", code: "TCRA" },
  // Agriculture & Resources
  { name: "Ministry of Agriculture", name_sw: "Wizara ya Kilimo", code: "MOA" },
  { name: "Ministry of Water", name_sw: "Wizara ya Maji", code: "MOW" },
  { name: "Ministry of Energy", name_sw: "Wizara ya Nishati", code: "MOEN" },
  { name: "Mining Commission", name_sw: "Tume ya Madini", code: "MC" },
  // Utilities
  { name: "TANESCO (Electricity)", name_sw: "Shirika la Umeme (TANESCO)", code: "TANESCO" },
  { name: "DAWASA (Water Supply)", name_sw: "Majisafi Dar es Salaam", code: "DAWASA" },
  // Anti-Corruption & Governance
  { name: "TAKUKURU (Anti-Corruption)", name_sw: "Kupambana na Rushwa", code: "TAKUKURU" },
  { name: "Drug Control Commission", name_sw: "Tume ya Dawa za Kulevya", code: "DCC" },
  { name: "TAMISEMI (Local Government)", name_sw: "Ofisi ya Rais — TAMISEMI", code: "TAMISEMI" },
  // Custom
  { name: "Other", name_sw: "Nyingine", code: "" },
];

// Tanzania regions and districts
const TZ_REGIONS = [
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
  "Mara",
  "Kigoma",
  "Tabora",
  "Rukwa",
  "Ruvuma",
  "Shinyanga",
  "Singida",
  "Lindi",
  "Mtwara",
  "Pwani",
  "Songwe",
  "Geita",
  "Katavi",
  "Njombe",
  "Simiyu",
  "Zanzibar Urban/West",
  "Zanzibar North",
  "Zanzibar South",
  "Pemba North",
  "Pemba South",
];

const TZ_DISTRICTS: Record<string, string[]> = {
  "Dar es Salaam": ["Ilala", "Kinondoni", "Ubungo", "Temeke", "Kigamboni"],
  Arusha: ["Arusha CC", "Arusha DC", "Meru", "Longido", "Monduli", "Karatu", "Ngorongoro"],
  Dodoma: ["Dodoma CC", "Bahi", "Chamwino", "Chemba", "Kondoa", "Kongwa", "Mpwapwa"],
  Mwanza: ["Nyamagana", "Ilemela", "Magu", "Kwimba", "Sengerema", "Misungwi", "Ukerewe", "Buchosa"],
  Tanga: [
    "Tanga CC",
    "Muheza",
    "Korogwe TC",
    "Korogwe DC",
    "Lushoto",
    "Handeni",
    "Kilindi",
    "Pangani",
    "Mkinga",
  ],
  Morogoro: [
    "Morogoro CC",
    "Morogoro DC",
    "Kilosa",
    "Ulanga",
    "Malinyi",
    "Mvomero",
    "Kilombero",
    "Gairo",
    "Ifakara",
  ],
  Mbeya: ["Mbeya CC", "Mbeya DC", "Rungwe", "Kyela", "Mbozi", "Chunya", "Mbarali"],
  Kilimanjaro: ["Moshi CC", "Moshi DC", "Hai", "Siha", "Rombo", "Same", "Mwanga"],
  Iringa: ["Iringa CC", "Iringa DC", "Kilolo", "Mufindi"],
  Kagera: [
    "Bukoba CC",
    "Bukoba DC",
    "Muleba",
    "Karagwe",
    "Kyerwa",
    "Missenyi",
    "Ngara",
    "Biharamulo",
  ],
  Mara: ["Musoma CC", "Musoma DC", "Bunda", "Tarime", "Serengeti", "Rorya", "Butiama"],
  Kigoma: ["Kigoma CC", "Kigoma DC", "Kasulu", "Kibondo", "Kakonko", "Buhigwe", "Uvinza"],
  Tabora: ["Tabora CC", "Tabora DC", "Uyui", "Nzega", "Igunga", "Sikonge", "Urambo", "Kaliua"],
  Rukwa: ["Sumbawanga CC", "Sumbawanga DC", "Nkasi", "Kalambo"],
  Ruvuma: ["Songea CC", "Songea DC", "Mbinga", "Nyasa", "Tunduru", "Namtumbo"],
  Shinyanga: ["Shinyanga CC", "Shinyanga DC", "Kahama TC", "Kahama DC", "Kishapu", "Ushetu"],
  Singida: ["Singida CC", "Singida DC", "Manyoni", "Iramba", "Ikungi"],
  Lindi: ["Lindi CC", "Lindi DC", "Kilwa", "Liwale", "Nachingwea", "Ruangwa"],
  Mtwara: ["Mtwara CC", "Mtwara DC", "Newala", "Tandahimba", "Masasi", "Nanyumbu"],
  Pwani: ["Kibaha TC", "Kibaha DC", "Bagamoyo", "Kisarawe", "Mkuranga", "Mafia", "Rufiji"],
  Songwe: ["Tunduma", "Songwe DC", "Mbozi"],
  Geita: ["Geita TC", "Geita DC", "Bukombe", "Chato", "Mbogwe", "Nyang'hwale"],
  Katavi: ["Mpanda TC", "Mpanda DC", "Mlele"],
  Njombe: ["Njombe TC", "Njombe DC", "Makete", "Ludewa", "Wanging'ombe"],
  Simiyu: ["Bariadi", "Busega", "Itilima", "Maswa", "Meatu"],
  "Zanzibar Urban/West": ["Zanzibar City", "West A", "West B"],
  "Zanzibar North": ["Kaskazini A", "Kaskazini B"],
  "Zanzibar South": ["Kusini", "Kati"],
  "Pemba North": ["Wete", "Micheweni"],
  "Pemba South": ["Chake Chake", "Mkoani"],
};

// ── Component ────────────────────────────────────────────────────────────────
export function DepartmentManagement() {
  const { lang } = useLanguage();
  const { showToast } = useToast();
  const { user } = useAuth();
  const L = (sw: string, en: string) => (lang === "sw" ? sw : en);

  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingDept, setEditingDept] = useState<Department | null>(null);
  const [form, setForm] = useState(INITIAL_FORM);
  const [selectedCategory, setSelectedCategory] = useState("");
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");

  // Expandable: staff list
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [deptStaff, setDeptStaff] = useState<DeptUser[]>([]);
  const [loadingStaff, setLoadingStaff] = useState(false);

  // Add staff to department
  const [showAddStaff, setShowAddStaff] = useState(false);
  const [staffEmail, setStaffEmail] = useState("");
  const [staffPassword, setStaffPassword] = useState("Mtaani@2026");
  const [staffName, setStaffName] = useState("");
  const [staffRole, setStaffRole] = useState<"head" | "officer" | "clerk">("officer");
  const [addingStaff, setAddingStaff] = useState(false);

  // ── Fetch ────────────────────────────────────────────────────────────────
  const fetchDepartments = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("government_departments")
        .select("*")
        .order("name");
      if (error) throw error;
      setDepartments(data || []);
    } catch {
      showToast(L("Hitilafu kupata idara", "Error fetching departments"), "error");
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    fetchDepartments();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchStaff = async (deptId: string) => {
    if (expandedId === deptId) {
      setExpandedId(null);
      return;
    }
    setExpandedId(deptId);
    setLoadingStaff(true);
    try {
      const { data, error } = await supabase
        .from("department_users")
        .select("*, users:user_id(id, first_name, last_name, email, phone, role, position)")
        .eq("department_id", deptId)
        .order("assigned_at");
      if (error) throw error;
      setDeptStaff((data as DeptUser[]) || []);
    } catch {
      setDeptStaff([]);
    } finally {
      setLoadingStaff(false);
    }
  };

  // ── Create / Edit ────────────────────────────────────────────────────────
  const openCreate = () => {
    setEditingDept(null);
    setForm(INITIAL_FORM);
    setShowModal(true);
  };

  const openEdit = (d: Department) => {
    setEditingDept(d);
    setForm({
      name: d.name,
      name_sw: d.name_sw || "",
      code: d.code,
      level: d.level,
      region: d.region || "",
      district: d.district || "",
      contact_email: d.contact_email || "",
      contact_phone: d.contact_phone || "",
      address: d.address || "",
      description: d.description || "",
    });
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!form.name.trim() || !form.code.trim()) {
      showToast(L("Jina na msimbo vinahitajika", "Name and code are required"), "error");
      return;
    }
    if (form.level === "district" && !form.contact_email.trim()) {
      showToast(
        L("Email inahitajika kwa idara ya wilaya", "Email required for district department"),
        "error",
      );
      return;
    }
    setSaving(true);
    try {
      const payload = {
        name: form.name.trim(),
        name_sw: form.name_sw.trim() || null,
        code: form.code.trim().toUpperCase(),
        level: form.level,
        region: form.region || null,
        district: form.district || null,
        contact_email: form.contact_email || null,
        contact_phone: form.contact_phone || null,
        address: form.address || null,
        description: form.description || null,
      };

      if (editingDept) {
        const { error } = await supabase
          .from("government_departments")
          .update(payload)
          .eq("id", editingDept.id);
        if (error) throw error;
        showToast(L("Idara imesasishwa!", "Department updated!"), "success");
      } else {
        const { error } = await supabase
          .from("government_departments")
          .insert({ ...payload, created_by: user?.id });
        if (error) throw error;
        logActivity(user?.id, "create_office", { department: form.name, code: form.code });
        showToast(L("Idara imeundwa!", "Department created!"), "success");
      }
      setShowModal(false);
      fetchDepartments();
    } catch (err: unknown) {
      const e = err as { message?: string };
      showToast(e.message || "Error", "error");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (
      !confirm(
        L(
          "Una uhakika unataka kufuta idara hii?",
          "Are you sure you want to delete this department?",
        ),
      )
    )
      return;
    try {
      const { error } = await supabase.from("government_departments").delete().eq("id", id);
      if (error) throw error;
      showToast(L("Idara imefutwa", "Department deleted"), "success");
      setDepartments((prev) => prev.filter((d) => d.id !== id));
      if (expandedId === id) setExpandedId(null);
    } catch {
      showToast(L("Hitilafu kufuta", "Error deleting"), "error");
    }
  };

  const toggleActive = async (d: Department) => {
    try {
      const { error } = await supabase
        .from("government_departments")
        .update({ active: !d.active })
        .eq("id", d.id);
      if (error) throw error;
      setDepartments((prev) =>
        prev.map((dep) => (dep.id === d.id ? { ...dep, active: !dep.active } : dep)),
      );
    } catch {
      showToast(L("Hitilafu", "Error"), "error");
    }
  };

  // ── Add staff to department ──────────────────────────────────────────────
  // Refresh the staff list for a department WITHOUT toggling the panel
  const refreshStaffList = async (deptId: string) => {
    setLoadingStaff(true);
    try {
      const { data, error } = await supabase
        .from("department_users")
        .select("*, users:user_id(id, first_name, last_name, email, phone, role, position)")
        .eq("department_id", deptId)
        .order("assigned_at");
      if (error) throw error;
      setDeptStaff((data as DeptUser[]) || []);
    } catch {
      setDeptStaff([]);
    } finally {
      setLoadingStaff(false);
    }
  };

  const handleAddStaff = async () => {
    if (!staffEmail.trim() || !expandedId) return;
    if (!staffPassword.trim() || staffPassword.length < 6) {
      showToast(
        L("Nenosiri lazima liwe angalau herufi 6", "Password must be at least 6 characters"),
        "error",
      );
      return;
    }
    const deptId = expandedId; // capture before any async state changes
    setAddingStaff(true);
    try {
      // Fresh token (refreshSession returns { error } rather than throwing)
      const { data: refreshed, error: refreshErr } = await supabase.auth.refreshSession();
      if (refreshErr || !refreshed.session) {
        await supabase.auth.signOut();
        showToast(
          L(
            "Kipindi kimeisha. Umetolewa, ingia tena.",
            "Session expired. You have been signed out — please sign in again.",
          ),
          "error",
        );
        setTimeout(() => {
          window.location.href = "/auth";
        }, 1500);
        return;
      }
      const token = refreshed.session.access_token;

      const nameParts = staffName.trim().split(" ");
      const firstName = nameParts[0] || "Department";
      const lastName = nameParts.slice(1).join(" ") || "Staff";

      // Single atomic server-side operation: find-or-create user + link to department
      const res = await fetch("/api/admin", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          action: "addDepartmentStaff",
          email: staffEmail.trim().toLowerCase(),
          password: staffPassword,
          departmentId: deptId,
          deptRole: staffRole,
          firstName,
          lastName,
        }),
      });
      const result = await res.json();

      if (!res.ok) {
        const msg = result.error || L("Imeshindwa", "Failed to add staff");
        const detail = result.detail ? ` (${result.detail})` : "";
        showToast(msg + detail, "error");
        console.error("addDepartmentStaff failed:", result);
        return;
      }

      showToast(
        result.created
          ? L("Akaunti imeundwa na kuongezwa!", "Account created and added to department!")
          : L("Mtumiaji ameongezwa kwenye idara!", "User added to department!"),
        "success",
      );
      setStaffEmail("");
      setStaffName("");
      setStaffPassword("Mtaani@2026");
      setShowAddStaff(false);
      // Refresh the staff list in place (panel stays open)
      await refreshStaffList(deptId);
    } catch (err: unknown) {
      const e = err as { message?: string };
      showToast(e.message || "Error", "error");
    } finally {
      setAddingStaff(false);
    }
  };

  const removeStaff = async (assignmentId: string) => {
    try {
      await supabase.from("department_users").delete().eq("id", assignmentId);
      setDeptStaff((prev) => prev.filter((s) => s.id !== assignmentId));
      showToast(L("Mtumiaji ameondolewa", "Staff removed"), "success");
    } catch {
      showToast(L("Hitilafu", "Error"), "error");
    }
  };

  // ── Filter ───────────────────────────────────────────────────────────────
  const filtered = departments.filter((d) => {
    const q = search.toLowerCase();
    return (
      d.name.toLowerCase().includes(q) ||
      d.code.toLowerCase().includes(q) ||
      d.name_sw?.toLowerCase().includes(q) ||
      d.region?.toLowerCase().includes(q) ||
      d.district?.toLowerCase().includes(q)
    );
  });

  // ── Render ───────────────────────────────────────────────────────────────
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-3xl font-black text-stone-900 tracking-tight flex items-center gap-2">
            <Building size={28} className="text-emerald-600" />
            {L("Idara za Serikali", "Government Departments")}
          </h1>
          <p className="text-stone-500 font-medium mt-1">
            {L(
              `Idara ${filtered.length} kati ya ${departments.length}`,
              `${filtered.length} of ${departments.length} departments`,
            )}
          </p>
        </div>
        <button
          onClick={openCreate}
          className="inline-flex items-center gap-2 px-5 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-sm transition-all shadow-lg shadow-emerald-200"
        >
          <Plus size={18} />
          {L("Ongeza Idara", "Add Department")}
        </button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" size={18} />
        <input
          type="text"
          placeholder={L("Tafuta idara...", "Search departments...")}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-10 pr-4 h-12 w-full sm:w-80 bg-white border border-stone-200 rounded-xl focus:ring-2 focus:ring-emerald-500 transition-all font-medium"
        />
      </div>

      {/* List */}
      {loading ? (
        <div className="flex items-center justify-center py-20 text-stone-400">
          <Loader2 size={24} className="animate-spin mr-2" />
          {L("Inapakia...", "Loading...")}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20">
          <Building size={48} className="mx-auto text-stone-300 mb-4" />
          <p className="text-stone-500 font-bold">{L("Hakuna idara", "No departments found")}</p>
          <p className="text-stone-400 text-sm mt-1">
            {L(
              "Ongeza idara ya kwanza ili kuanza.",
              "Create your first department to get started.",
            )}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((dept) => (
            <div
              key={dept.id}
              className="bg-white border border-stone-200 rounded-2xl overflow-hidden"
            >
              {/* Department Row */}
              <div
                className="flex items-center justify-between px-4 sm:px-6 py-4 cursor-pointer hover:bg-stone-50/50 transition-colors"
                onClick={() => fetchStaff(dept.id)}
              >
                <div className="flex items-center gap-3 sm:gap-4 min-w-0 flex-1">
                  <div className="w-11 h-11 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                    <Building size={22} />
                  </div>
                  <div className="min-w-0">
                    <p className="font-bold text-stone-900 truncate">{dept.name}</p>
                    {dept.name_sw && dept.name_sw !== dept.name && (
                      <p className="text-xs text-stone-400 truncate">{dept.name_sw}</p>
                    )}
                    <div className="flex flex-wrap items-center gap-2 mt-1">
                      <span
                        className={cn(
                          "px-2 py-0.5 text-[10px] font-bold uppercase rounded-md border",
                          LEVEL_COLORS[dept.level],
                        )}
                      >
                        {dept.level}
                      </span>
                      <span className="text-xs font-mono text-stone-400">{dept.code}</span>
                      {dept.region && (
                        <span className="text-xs text-stone-400 flex items-center gap-0.5">
                          <MapPin size={10} />
                          {dept.region}
                          {dept.district ? ` · ${dept.district}` : ""}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0 ml-2">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleActive(dept);
                    }}
                    className={cn(
                      "px-2.5 py-1 text-xs font-bold rounded-lg border transition-all",
                      dept.active
                        ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                        : "bg-stone-100 text-stone-400 border-stone-200",
                    )}
                  >
                    {dept.active ? L("Hai", "Active") : L("Haipo", "Inactive")}
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      openEdit(dept);
                    }}
                    className="p-2 hover:bg-blue-50 rounded-lg text-stone-400 hover:text-blue-600 transition-all"
                  >
                    <Edit3 size={16} />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDelete(dept.id);
                    }}
                    className="p-2 hover:bg-red-50 rounded-lg text-stone-400 hover:text-red-600 transition-all"
                  >
                    <Trash2 size={16} />
                  </button>
                  {expandedId === dept.id ? (
                    <ChevronDown size={18} className="text-stone-400" />
                  ) : (
                    <ChevronRight size={18} className="text-stone-400" />
                  )}
                </div>
              </div>

              {/* Expanded Staff Panel */}
              <AnimatePresence>
                {expandedId === dept.id && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="border-t border-stone-100 bg-emerald-50/30 px-4 sm:px-6 py-4"
                  >
                    <div className="flex items-center justify-between mb-3">
                      <p className="text-xs font-bold text-emerald-700 uppercase tracking-wider flex items-center gap-1.5">
                        <Users size={13} />
                        {L(
                          `Wafanyakazi (${deptStaff.length})`,
                          `Department Staff (${deptStaff.length})`,
                        )}
                      </p>
                      <button
                        onClick={() => setShowAddStaff(!showAddStaff)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-emerald-700 bg-emerald-100 hover:bg-emerald-200 rounded-lg transition-colors"
                      >
                        <UserPlus size={13} />
                        {L("Ongeza", "Add Staff")}
                      </button>
                    </div>

                    {/* Add staff form */}
                    {showAddStaff && (
                      <div className="mb-4 p-4 bg-white rounded-xl border border-stone-200 space-y-3">
                        <p className="text-xs font-bold text-stone-500 uppercase tracking-wider">
                          {L("Ongeza Mfanyakazi Mpya", "Add Staff Member")}
                        </p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          <input
                            type="text"
                            placeholder={L("Jina kamili...", "Full name...")}
                            value={staffName}
                            onChange={(e) => setStaffName(e.target.value)}
                            className="px-3 py-2.5 border border-stone-200 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500"
                          />
                          <input
                            type="email"
                            placeholder={L("Email...", "Email address...")}
                            value={staffEmail}
                            onChange={(e) => setStaffEmail(e.target.value)}
                            className="px-3 py-2.5 border border-stone-200 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500"
                          />
                          <input
                            type="text"
                            placeholder={L("Nenosiri la msingi", "Default password")}
                            value={staffPassword}
                            onChange={(e) => setStaffPassword(e.target.value)}
                            className="px-3 py-2.5 border border-stone-200 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 font-mono"
                          />
                          <select
                            value={staffRole}
                            onChange={(e) =>
                              setStaffRole(e.target.value as "head" | "officer" | "clerk")
                            }
                            className="px-3 py-2.5 border border-stone-200 rounded-lg text-sm"
                          >
                            <option value="head">{L("Mkuu", "Head")}</option>
                            <option value="officer">{L("Afisa", "Officer")}</option>
                            <option value="clerk">{L("Karani", "Clerk")}</option>
                          </select>
                        </div>
                        <p className="text-[10px] text-stone-400">
                          {L(
                            "Mtumiaji aliyopo ataunganishwa tu. Mtumiaji mpya ataundwa na nenosiri hili.",
                            "Existing user will be linked. New user created with this password.",
                          )}
                        </p>
                        <button
                          onClick={handleAddStaff}
                          disabled={addingStaff || !staffEmail.trim()}
                          className="w-full px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-bold disabled:opacity-50 flex items-center justify-center gap-1.5 transition-colors"
                        >
                          {addingStaff ? (
                            <Loader2 size={14} className="animate-spin" />
                          ) : (
                            <CheckCircle2 size={14} />
                          )}
                          {L("Ongeza Mfanyakazi", "Add Staff Member")}
                        </button>
                      </div>
                    )}

                    {loadingStaff ? (
                      <div className="flex items-center gap-2 py-4 text-stone-400 text-sm">
                        <Loader2 size={14} className="animate-spin" />{" "}
                        {L("Inapakia...", "Loading...")}
                      </div>
                    ) : deptStaff.length === 0 ? (
                      <p className="text-sm text-stone-400 py-3">
                        {L("Hakuna wafanyakazi bado.", "No staff assigned yet.")}
                      </p>
                    ) : (
                      <div className="grid gap-2">
                        {deptStaff.map((s) => (
                          <div
                            key={s.id}
                            className="flex items-center justify-between bg-white rounded-lg px-3 py-2.5 border border-stone-100"
                          >
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center text-xs font-bold">
                                {s.users?.first_name?.[0]}
                                {s.users?.last_name?.[0]}
                              </div>
                              <div>
                                <p className="text-sm font-bold text-stone-800">
                                  {s.users?.first_name} {s.users?.last_name}
                                </p>
                                <p className="text-xs text-stone-400">
                                  <span className="capitalize">{s.role}</span>
                                  {s.users?.email ? ` · ${s.users.email}` : ""}
                                </p>
                              </div>
                            </div>
                            <button
                              onClick={() => removeStaff(s.id)}
                              className="p-1.5 hover:bg-red-50 rounded-lg text-stone-300 hover:text-red-500 transition-all"
                            >
                              <X size={14} />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Contact info */}
                    {(dept.contact_email || dept.contact_phone || dept.address) && (
                      <div className="mt-3 pt-3 border-t border-stone-100 flex flex-wrap gap-4 text-xs text-stone-400">
                        {dept.contact_email && (
                          <span className="flex items-center gap-1">
                            <Mail size={11} /> {dept.contact_email}
                          </span>
                        )}
                        {dept.contact_phone && (
                          <span className="flex items-center gap-1">
                            <Phone size={11} /> {dept.contact_phone}
                          </span>
                        )}
                        {dept.address && (
                          <span className="flex items-center gap-1">
                            <MapPin size={11} /> {dept.address}
                          </span>
                        )}
                      </div>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ))}
        </div>
      )}

      {/* Create/Edit Modal */}
      <AnimatePresence>
        {showModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4"
            onClick={() => setShowModal(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between px-6 py-4 border-b border-stone-100">
                <h2 className="text-lg font-black text-stone-900">
                  {editingDept
                    ? L("Hariri Idara", "Edit Department")
                    : L("Ongeza Idara Mpya", "Add New Department")}
                </h2>
                <button
                  onClick={() => setShowModal(false)}
                  className="p-2 hover:bg-stone-100 rounded-lg"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="p-6 space-y-4">
                {/* Department Category */}
                <div>
                  <label className="block text-xs font-bold text-stone-600 uppercase tracking-wider mb-1.5">
                    {L("Aina ya Idara", "Department Category")} *
                  </label>
                  <select
                    value={selectedCategory}
                    onChange={(e) => {
                      const cat = DEPARTMENT_CATEGORIES.find((c) => c.name === e.target.value);
                      setSelectedCategory(e.target.value);
                      if (cat && cat.name !== "Other") {
                        setForm((prev) => ({
                          ...prev,
                          name: cat.name,
                          name_sw: cat.name_sw,
                          code: cat.code,
                        }));
                      }
                    }}
                    className="w-full px-4 py-3 border border-stone-200 rounded-xl focus:ring-2 focus:ring-emerald-500 text-sm"
                  >
                    <option value="">{L("-- Chagua Aina --", "-- Select Category --")}</option>
                    {DEPARTMENT_CATEGORIES.map((cat) => (
                      <option key={cat.code || cat.name} value={cat.name}>
                        {lang === "sw" ? cat.name_sw : cat.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2 sm:col-span-1">
                    <label className="block text-xs font-bold text-stone-600 uppercase tracking-wider mb-1.5">
                      {L("Jina (Kiingereza)", "Name (English)")} *
                    </label>
                    <input
                      value={form.name}
                      onChange={(e) => setForm({ ...form, name: e.target.value })}
                      placeholder="e.g. Tanzania Police Force"
                      className="w-full px-4 py-3 border border-stone-200 rounded-xl focus:ring-2 focus:ring-emerald-500 text-sm"
                    />
                  </div>
                  <div className="col-span-2 sm:col-span-1">
                    <label className="block text-xs font-bold text-stone-600 uppercase tracking-wider mb-1.5">
                      {L("Jina (Kiswahili)", "Name (Swahili)")}
                    </label>
                    <input
                      value={form.name_sw}
                      onChange={(e) => setForm({ ...form, name_sw: e.target.value })}
                      placeholder="mfano: Jeshi la Polisi Tanzania"
                      className="w-full px-4 py-3 border border-stone-200 rounded-xl focus:ring-2 focus:ring-emerald-500 text-sm"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-stone-600 uppercase tracking-wider mb-1.5">
                      {L("Msimbo", "Code")} *
                    </label>
                    <input
                      value={form.code}
                      onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })}
                      placeholder="e.g. TPF"
                      maxLength={10}
                      className="w-full px-4 py-3 border border-stone-200 rounded-xl focus:ring-2 focus:ring-emerald-500 text-sm font-mono uppercase"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-stone-600 uppercase tracking-wider mb-1.5">
                      {L("Ngazi", "Level")}
                    </label>
                    <select
                      value={form.level}
                      onChange={(e) =>
                        setForm({
                          ...form,
                          level: e.target.value as "national" | "regional" | "district",
                        })
                      }
                      className="w-full px-4 py-3 border border-stone-200 rounded-xl focus:ring-2 focus:ring-emerald-500 text-sm"
                    >
                      <option value="national">{L("Kitaifa", "National")}</option>
                      <option value="regional">{L("Mkoa", "Regional")}</option>
                      <option value="district">{L("Wilaya", "District")}</option>
                    </select>
                  </div>
                </div>

                {form.level !== "national" && (
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-stone-600 uppercase tracking-wider mb-1.5">
                        {L("Mkoa", "Region")} *
                      </label>
                      <select
                        value={form.region}
                        onChange={(e) => setForm({ ...form, region: e.target.value, district: "" })}
                        className="w-full px-4 py-3 border border-stone-200 rounded-xl focus:ring-2 focus:ring-emerald-500 text-sm"
                      >
                        <option value="">{L("-- Chagua Mkoa --", "-- Select Region --")}</option>
                        {TZ_REGIONS.map((r) => (
                          <option key={r} value={r}>
                            {r}
                          </option>
                        ))}
                      </select>
                    </div>
                    {form.level === "district" && (
                      <div>
                        <label className="block text-xs font-bold text-stone-600 uppercase tracking-wider mb-1.5">
                          {L("Wilaya", "District")} *
                        </label>
                        <select
                          value={form.district}
                          onChange={(e) => setForm({ ...form, district: e.target.value })}
                          disabled={!form.region}
                          className="w-full px-4 py-3 border border-stone-200 rounded-xl focus:ring-2 focus:ring-emerald-500 text-sm disabled:opacity-50"
                        >
                          <option value="">
                            {L("-- Chagua Wilaya --", "-- Select District --")}
                          </option>
                          {(TZ_DISTRICTS[form.region] || []).map((d) => (
                            <option key={d} value={d}>
                              {d}
                            </option>
                          ))}
                        </select>
                      </div>
                    )}
                  </div>
                )}

                {/* Default email required for district-level departments */}
                {form.level === "district" && (
                  <div className="bg-amber-50 border border-amber-200 rounded-xl p-3">
                    <p className="text-xs text-amber-700 font-medium flex items-center gap-1.5">
                      <AlertCircle size={12} />
                      {L(
                        "Email ya msingi inahitajika kwa idara za wilaya. Mtumiaji anaweza kubadilisha baada ya kuingia.",
                        "A default email is required for district departments. Users can change it after first login.",
                      )}
                    </p>
                  </div>
                )}

                <div>
                  <label className="block text-xs font-bold text-stone-600 uppercase tracking-wider mb-1.5">
                    {L("Maelezo", "Description")}
                  </label>
                  <textarea
                    value={form.description}
                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                    rows={2}
                    className="w-full px-4 py-3 border border-stone-200 rounded-xl focus:ring-2 focus:ring-emerald-500 text-sm resize-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-stone-600 uppercase tracking-wider mb-1.5">
                      Email
                    </label>
                    <input
                      value={form.contact_email}
                      onChange={(e) => setForm({ ...form, contact_email: e.target.value })}
                      type="email"
                      className="w-full px-4 py-3 border border-stone-200 rounded-xl focus:ring-2 focus:ring-emerald-500 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-stone-600 uppercase tracking-wider mb-1.5">
                      {L("Simu", "Phone")}
                    </label>
                    <input
                      value={form.contact_phone}
                      onChange={(e) => setForm({ ...form, contact_phone: e.target.value })}
                      className="w-full px-4 py-3 border border-stone-200 rounded-xl focus:ring-2 focus:ring-emerald-500 text-sm"
                    />
                  </div>
                </div>
              </div>

              <div className="px-6 py-4 border-t border-stone-100 flex justify-end gap-3">
                <button
                  onClick={() => setShowModal(false)}
                  className="px-5 py-2.5 text-sm font-bold text-stone-600 hover:bg-stone-100 rounded-xl transition-all"
                >
                  {L("Ghairi", "Cancel")}
                </button>
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-sm disabled:opacity-50 flex items-center gap-2 transition-all"
                >
                  {saving && <Loader2 size={14} className="animate-spin" />}
                  {editingDept ? L("Sasisha", "Update") : L("Unda", "Create")}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
