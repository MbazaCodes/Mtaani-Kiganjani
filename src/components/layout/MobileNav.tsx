import React, { useState, useEffect } from "react";
import type { ViewName } from "@/types";
import { motion, AnimatePresence } from "framer-motion";
import {
  LayoutDashboard,
  Plus,
  FileText,
  Search,
  Shield,
  User,
  Users,
  Building2,
  MapPin,
  Settings,
  HelpCircle,
  AlertTriangle,
  Megaphone,
  Wallet,
  Mail,
  MessageSquare,
  UserCheck,
  Activity,
  X,
  LogOut,
  Bell,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/lib/supabase";
import { useLanguage } from "@/context/LanguageContext";
import { cn } from "@/lib/utils";

interface MobileNavProps {
  isOpen: boolean;
  onClose: () => void;
  currentView: string;
  setView: (view: ViewName) => void;
}

export function MobileNav({ isOpen, onClose, currentView, setView }: MobileNavProps) {
  const { user, signOut } = useAuth();
  const { lang, t } = useLanguage();

  // Department membership: AuthContext flag + direct query fallback
  const [localDeptCheck, setLocalDeptCheck] = useState(false);
  useEffect(() => {
    if (user?.is_department_member) { setLocalDeptCheck(true); return; }
    if (!user?.id || user?.role === "citizen") return;
    const timer = setTimeout(() => {
      supabase.from("department_users").select("department_id").eq("user_id", user.id)
        .limit(1).maybeSingle().then(({ data }) => { if (data) setLocalDeptCheck(true); });
    }, 800);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, user?.is_department_member]);

  const menuItems = [
    {
      id: "dashboard",
      icon: <LayoutDashboard size={20} />,
      label: lang === "sw" ? "Dashibodi" : "Dashboard",
      roles: ["citizen", "staff", "admin"],
      view:
        user?.role === "admin"
          ? "admin_dashboard"
          : user?.role === "staff" && user?.is_department_member
            ? "department_portal"
            : user?.role === "staff"
              ? "staff_dashboard"
              : "dashboard",
    },
    {
      id: "services",
      icon: <Plus size={20} />,
      label: lang === "sw" ? "Omba" : "Apply",
      roles: ["citizen"],
      view: "services",
    },
    {
      id: "agreement",
      icon: <FileText size={20} />,
      label: lang === "sw" ? "Makubaliano" : "Agreement",
      roles: ["citizen"],
      view: "agreement",
    },
    {
      id: "applications",
      icon: <FileText size={20} />,
      label: lang === "sw" ? "Maombi Yangu" : "My Applications",
      roles: ["citizen"],
      view: "applications",
    },
    {
      id: "notifications",
      icon: <Bell size={20} />,
      label: lang === "sw" ? "Arifa" : "Notifications",
      roles: ["citizen", "staff", "admin"],
      view: "notifications",
      hideForDept: true,
    },
    {
      id: "department_portal",
      icon: <Building2 size={20} />,
      label: lang === "sw" ? "Portal ya Idara" : "Department Portal",
      roles: ["staff"],
      view: "department_portal",
      deptOnly: true,
    },
    {
      id: "staff_management",
      icon: <Shield size={20} />,
      label: lang === "sw" ? "Usimamizi wa Watumishi" : "Staff Management",
      roles: ["admin"],
      view: "staff_management",
    },
    {
      id: "office_management",
      icon: <Building2 size={20} />,
      label: lang === "sw" ? "Usimamizi wa Ofisi" : "Office Management",
      roles: ["admin"],
      view: "office_management",
    },
    {
      id: "location_management",
      icon: <MapPin size={20} />,
      label: lang === "sw" ? "Usimamizi wa Maeneo" : "Location Management",
      roles: ["admin"],
      view: "location_management",
    },
    {
      id: "service_management",
      icon: <Settings size={20} />,
      label: lang === "sw" ? "Usimamizi wa Huduma" : "Service Management",
      roles: ["admin"],
      view: "service_management",
    },
    {
      id: "admin_logs",
      icon: <Activity size={20} />,
      label: lang === "sw" ? "Kumbukumbu" : "Activity Logs",
      roles: ["admin"],
      view: "admin_logs",
    },
    {
      id: "application_review",
      hideForDept: true,
      icon: <Search size={20} />,
      label: lang === "sw" ? "Uhakiki wa Maombi" : "Application Review",
      roles: ["staff", "admin"],
      view: "application_review",
    },
    {
      id: "customer_support",
      hideForDept: true,
      icon: <HelpCircle size={20} />,
      label: lang === "sw" ? "Huduma kwa Wateja" : "Customer Support",
      roles: ["staff", "admin"],
      view: "customer_support",
    },
    {
      id: "manual_verification",
      hideForDept: true,
      icon: <UserCheck size={20} />,
      label: lang === "sw" ? "Uhakiki wa Mwongozo" : "Manual Verification",
      roles: ["staff", "admin"],
      view: "manual_verification",
    },
    {
      id: "business_approval",
      hideForDept: true,
      icon: <Building2 size={20} />,
      label: lang === "sw" ? "Idhini ya Biashara" : "Business Approval",
      roles: ["staff", "admin"],
      view: "business_approval",
    },
    {
      id: "messages",
      icon: <Mail size={20} />,
      label: lang === "sw" ? "Mawasiliano" : "Messages",
      roles: ["citizen", "staff", "admin"],
      view: "messages",
    },
    {
      id: "my_payments",
      icon: <Wallet size={20} />,
      label: lang === "sw" ? "Malipo" : "Payments",
      roles: ["citizen"],
      view: "my_payments",
    },
    {
      id: "announcements",
      icon: <Megaphone size={20} />,
      label: lang === "sw" ? "Matangazo" : "Announcements",
      roles: ["citizen"],
      view: "announcements",
    },
    {
      id: "staff_announcements",
      icon: <Megaphone size={20} />,
      label: lang === "sw" ? "Matangazo" : "Announcements",
      roles: ["staff", "admin"],
      view: "staff_announcements",
      hideForDept: true,
    },
    {
      id: "community_reports",
      icon: <AlertTriangle size={20} />,
      label: lang === "sw" ? "Taarifa za Jamii" : "Community Reports",
      roles: ["citizen"],
      view: "community_reports",
    },
    {
      id: "staff_reports",
      icon: <AlertTriangle size={20} />,
      label: lang === "sw" ? "Taarifa za Jamii" : "Community Reports",
      roles: ["staff", "admin"],
      view: "staff_reports",
      hideForDept: true,
    },
    {
      id: "citizen_support",
      icon: <HelpCircle size={20} />,
      label: lang === "sw" ? "Msaada wa Raia" : "Citizen Support",
      roles: ["citizen"],
      view: "citizen_support",
    },
    {
      id: "staff_tickets",
      icon: <HelpCircle size={20} />,
      label: lang === "sw" ? "Tiketi za Msaada" : "Support Tickets",
      roles: ["staff", "admin"],
      view: "staff_tickets",
      hideForDept: true,
    },
    {
      id: "verify_documents",
      icon: <Search size={20} />,
      label: lang === "sw" ? "Hakiki Hati" : "Verify Document",
      roles: ["citizen", "staff", "admin"],
      view: "verify_documents",
    },
    {
      id: "profile",
      icon: <User size={20} />,
      label: lang === "sw" ? "Wasifu" : "Profile",
      roles: ["citizen", "staff", "admin"],
      view: "profile",
    },
  ];

  const isDept = (user?.is_department_member || localDeptCheck) && user?.role === "staff";
  const filteredItems = menuItems.filter((item) => {
    if (!item.roles.includes(user?.role || "")) return false;
    // Department officers: hide regular staff items, show dept-only items
    if (isDept && (item as any).hideForDept) return false;
    if (!isDept && (item as any).deptOnly) return false;
    return true;
  });

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-100 lg:hidden">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-stone-900/60 backdrop-blur-sm"
          />

          {/* Drawer */}
          <motion.div
            initial={{ x: "-100%" }}
            animate={{ x: 0 }}
            exit={{ x: "-100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            className="absolute left-0 top-0 bottom-0 w-70 bg-white shadow-2xl flex flex-col"
          >
            <div className="p-6 border-b border-stone-100 flex items-center justify-between">
              <div className="flex flex-col">
                <span className="text-xl font-black tracking-tighter text-stone-900">
                  E-MTAA <span className="text-emerald-600">PORTAL</span>
                </span>
                <span className="text-[10px] font-bold text-stone-500 uppercase tracking-widest">
                  Menu
                </span>
              </div>
              <button
                onClick={onClose}
                className="p-2 hover:bg-stone-100 rounded-full transition-colors text-stone-400"
                aria-label={lang === "sw" ? "Funga menyu" : "Close menu"}
              >
                <X size={20} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-1">
              {filteredItems.map((item) => (
                <button
                  key={item.id}
                  onClick={() => {
                    setView(item.view as import("@/types").ViewName);
                    onClose();
                  }}
                  className={cn(
                    "w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold transition-all",
                    currentView === item.view
                      ? "bg-emerald-50 text-emerald-600"
                      : "text-stone-500 hover:bg-stone-50 hover:text-stone-900",
                  )}
                >
                  {item.icon}
                  <span className="text-sm">{item.label}</span>
                </button>
              ))}
            </div>

            <div className="p-4 border-t border-stone-100">
              <div className="flex items-center gap-3 p-3 bg-stone-50 rounded-2xl mb-4">
                <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600 font-bold">
                  {user?.first_name?.[0]}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-stone-900 truncate">
                    {user?.first_name} {user?.last_name}
                  </p>
                  <p className="text-xs text-stone-500 capitalize truncate">
                  {isDept
                    ? (lang === "sw" ? "Afisa wa Idara" : "Department Officer")
                    : user?.ward && user?.role === "staff"
                      ? (lang === "sw" ? "Afisa wa Kata" : "Ward Officer")
                      : user?.assigned_district && user?.role === "staff"
                        ? (lang === "sw" ? "Mtumishi wa Wilaya" : "District Staff")
                        : user?.assigned_region && user?.role === "staff"
                          ? (lang === "sw" ? "Mtumishi wa Mkoa" : "Regional Staff")
                          : user?.role === "admin"
                            ? (lang === "sw" ? "Msimamizi" : "Admin")
                            : user?.role}
                </p>
                </div>
              </div>
              <button
                onClick={() => {
                  signOut();
                  onClose();
                }}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold text-red-500 hover:bg-red-50 transition-all"
              >
                <LogOut size={20} />
                <span className="text-sm">{lang === "sw" ? "Ondoka" : "Sign Out"}</span>
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
