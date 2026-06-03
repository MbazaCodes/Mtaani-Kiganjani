import React, { useState, useEffect } from "react";
import type { ViewName } from "@/types";
import {
  LayoutDashboard,
  Plus,
  FileText,
  Search,
  Eye,
  Shield,
  Users,
  User,
  Building2,
  MapPin,
  Settings,
  HelpCircle,
  UserCheck,
  Activity,
  Bell,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useLanguage } from "@/context/LanguageContext";
import { supabase } from "@/lib/supabase";
import { SidebarItem } from "@/components/ui/SidebarItem";

interface SidebarProps {
  currentView: string;
  setView: (view: ViewName) => void;
}

export function Sidebar({ currentView, setView }: SidebarProps) {
  const { user, session } = useAuth();
  const { lang, t } = useLanguage();
  const [actualRole, setActualRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Direct database check for actual role using RPC (bypasses RLS)
  useEffect(() => {
    if (!session || !session.user.id) {
      setActualRole(null);
      setLoading(false);
      return;
    }

    const fetchActualRole = async () => {
      try {
        const { data, error } = await supabase.rpc("get_user_profile", {
          user_id: session.user.id,
        });

        if (data && data.length > 0) {
          setActualRole(data[0].role);
        } else {
          setActualRole(user?.role || null);
        }
      } catch (err) {
        console.error("Error fetching role from DB:", err);
        setActualRole(user?.role || null);
      } finally {
        setLoading(false);
      }
    };

    fetchActualRole();
  }, [session?.user.id, user?.role]);

  // Use database role if available, otherwise fall back to context
  const displayRole = actualRole || user?.role;

  if (loading) {
    return (
      <aside className="w-64 bg-white border-r border-stone-200 hidden lg:flex flex-col p-4 gap-2">
        <div className="text-sm text-stone-500">Loading...</div>
      </aside>
    );
  }

  return (
    <aside className="w-64 bg-white border-r border-stone-200 hidden lg:flex flex-col p-4 gap-2">
      <SidebarItem
        icon={<LayoutDashboard size={20} />}
        label={lang === "sw" ? "Dashibodi" : "Dashboard"}
        active={
          currentView === "dashboard" ||
          currentView === "admin_dashboard" ||
          currentView === "staff_dashboard"
        }
        onClick={() => {
          if (displayRole === "admin") setView("admin_dashboard");
          else if (displayRole === "staff") setView("staff_dashboard");
          else setView("dashboard");
        }}
      />

      {displayRole === "citizen" && (
        <>
          <SidebarItem
            icon={<Plus size={20} />}
            label={lang === "sw" ? "Omba" : "Apply"}
            active={currentView === "services" || currentView === "apply"}
            onClick={() => setView("services")}
          />
          <SidebarItem
            icon={<FileText size={20} />}
            label={lang === "sw" ? "Makubaliano" : "Agreement"}
            active={currentView === "agreement"}
            onClick={() => setView("agreement")}
          />
          <SidebarItem
            icon={<FileText size={20} />}
            label={t("nav.myApplications")}
            active={currentView === "applications"}
            onClick={() => setView("applications")}
          />
          <SidebarItem
            icon={<Bell size={20} />}
            label={lang === "sw" ? "Arifa" : "Notifications"}
            active={currentView === "notifications"}
            onClick={() => setView("notifications")}
          />
        </>
      )}

      {displayRole === "admin" && (
        <>
          <SidebarItem
            icon={<Shield size={20} />}
            label={lang === "sw" ? "Usimamizi wa Watumishi" : "Staff Management"}
            active={currentView === "staff_management"}
            onClick={() => setView("staff_management")}
          />
          <SidebarItem
            icon={<Eye size={20} />}
            label={lang === "sw" ? "Kagua Maombi" : "Application Review"}
            active={currentView === "application_review"}
            onClick={() => setView("application_review")}
          />
          <SidebarItem
            icon={<Users size={20} />}
            label={lang === "sw" ? "Usimamizi wa Wananchi" : "Citizen Management"}
            active={currentView === "citizen_management"}
            onClick={() => setView("citizen_management")}
          />
          <SidebarItem
            icon={<Building2 size={20} />}
            label={lang === "sw" ? "Idhini ya Biashara" : "Business Approval"}
            active={currentView === "business_approval"}
            onClick={() => setView("business_approval")}
          />
          <SidebarItem
            icon={<Building2 size={20} />}
            label={lang === "sw" ? "Usimamizi wa Ofisi" : "Office Management"}
            active={currentView === "office_management"}
            onClick={() => setView("office_management")}
          />
          <SidebarItem
            icon={<MapPin size={20} />}
            label={lang === "sw" ? "Usimamizi wa Maeneo" : "Location Management"}
            active={currentView === "location_management"}
            onClick={() => setView("location_management")}
          />
          <SidebarItem
            icon={<Settings size={20} />}
            label={lang === "sw" ? "Usimamizi wa Huduma" : "Service Management"}
            active={currentView === "service_management"}
            onClick={() => setView("service_management")}
          />
          <SidebarItem
            icon={<Activity size={20} />}
            label={lang === "sw" ? "Kumbukumbu" : "Activity Logs"}
            active={currentView === "admin_logs"}
            onClick={() => setView("admin_logs")}
          />
        </>
      )}

      {displayRole === "staff" && (
        <>
          <SidebarItem
            icon={<Users size={20} />}
            label={lang === "sw" ? "Usimamizi wa Wananchi" : "Citizen Management"}
            active={currentView === "citizen_management"}
            onClick={() => setView("citizen_management")}
          />
          <SidebarItem
            icon={<Eye size={20} />}
            label={lang === "sw" ? "Uhakiki wa Maombi" : "Application Review"}
            active={currentView === "application_review"}
            onClick={() => setView("application_review")}
          />
          <SidebarItem
            icon={<Building2 size={20} />}
            label={lang === "sw" ? "Idhini ya Biashara" : "Business Approval"}
            active={currentView === "business_approval"}
            onClick={() => setView("business_approval")}
          />
          <SidebarItem
            icon={<HelpCircle size={20} />}
            label={lang === "sw" ? "Huduma kwa Wateja" : "Customer Support"}
            active={currentView === "customer_support"}
            onClick={() => setView("customer_support")}
          />
          <SidebarItem
            icon={<UserCheck size={20} />}
            label={lang === "sw" ? "Uhakiki wa Mwongozo" : "Manual Verification"}
            active={currentView === "manual_verification"}
            onClick={() => setView("manual_verification")}
          />
        </>
      )}

      <SidebarItem
        icon={<Search size={20} />}
        label={lang === "sw" ? "Hakiki Hati" : "Verify Document"}
        active={currentView === "verify_documents"}
        onClick={() => setView("verify_documents")}
      />
      <SidebarItem
        icon={<User size={20} />}
        label={lang === "sw" ? "Wasifu" : "Profile"}
        active={currentView === "profile"}
        onClick={() => setView("profile")}
      />
    </aside>
  );
}
