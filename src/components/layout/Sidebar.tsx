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
  MessageSquare,
  AlertTriangle,
  Megaphone,
  Wallet,
  Mail,
  MapPin,
  Settings,
  HelpCircle,
  UserCheck,
  Activity,
  Bell,
  ChevronDown,
  ChevronRight,
  MessageCircle,
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
  // Department membership: read from AuthContext flag, with direct query fallback
  const [localDeptCheck, setLocalDeptCheck] = useState(false);
  useEffect(() => {
    if (user?.is_department_member) {
      setLocalDeptCheck(true);
      return;
    }
    if (!user?.id || user?.role === "citizen") return;
    // Fallback: same query as DepartmentPortal (which works)
    const timer = setTimeout(() => {
      supabase
        .from("department_users")
        .select("department_id")
        .eq("user_id", user.id)
        .limit(1)
        .maybeSingle()
        .then(({ data }) => {
          if (data) setLocalDeptCheck(true);
        });
    }, 800); // Small delay to ensure auth is warmed up
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, user?.is_department_member]);
  const [loading, setLoading] = useState(true);

  // Direct database check for actual role using RPC (bypasses RLS)
  useEffect(() => {
    if (!session || !session.user.id) {
      setActualRole(null);
      setLoading(false);
      return;
    }

    const fetchActualRole = async (): Promise<void> => {
      try {
        const { data, error } = await supabase.rpc("get_user_profile", {
          user_id: session.user.id,
        });

        if (data && data.length > 0) {
          setActualRole(data[0].role);
        } else {
          setActualRole(user?.role || null);
        }
      } catch (_err) {
        console.error("Error fetching role from DB:", _err);
        setActualRole(user?.role || null);
      } finally {
        setLoading(false);
      }
    };

    fetchActualRole();

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.user.id, user?.role]);

  // Use database role if available, otherwise fall back to context
  const displayRole = actualRole || user?.role;

  // Communication folder — auto-open when any child view is active
  const commViews = [
    "notifications", "announcements", "community_reports", "messages",
    "citizen_support", "staff_tickets", "staff_announcements", "staff_reports",
    "help_faq",
  ];
  const [commOpen, setCommOpen] = useState(() => commViews.includes(currentView));

  // Keep open when navigating to a comm view
  useEffect(() => {
    if (commViews.includes(currentView)) setCommOpen(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentView]);

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
          currentView === "staff_dashboard" ||
          currentView === "department_portal"
        }
        onClick={() => {
          if (displayRole === "admin") setView("admin_dashboard");
          else if (displayRole === "staff" && (user?.is_department_member || localDeptCheck))
            setView("department_portal");
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
            icon={<Building2 size={20} />}
            label={lang === "sw" ? "Idara za Serikali" : "Gov. Departments"}
            active={currentView === "departments"}
            onClick={() => setView("departments")}
          />
          <SidebarItem
            icon={<Activity size={20} />}
            label={lang === "sw" ? "Kumbukumbu" : "Activity Logs"}
            active={currentView === "admin_logs"}
            onClick={() => setView("admin_logs")}
          />
        </>
      )}

      {/* Department Portal — shown for any staff/admin who is a department member */}
      {(user?.is_department_member || localDeptCheck) && displayRole !== "staff" && (
        <>
          <div className="px-3 pt-4 pb-1">
            <p className="text-[10px] font-bold text-stone-400 uppercase tracking-widest">
              {lang === "sw" ? "Idara" : "Department"}
            </p>
          </div>
          <SidebarItem
            icon={<Building2 size={20} />}
            label={lang === "sw" ? "Portal ya Idara" : "Department Portal"}
            active={currentView === "department_portal"}
            onClick={() => setView("department_portal")}
          />
        </>
      )}

      {displayRole === "staff" && !(user?.is_department_member || localDeptCheck) && (
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

      {/* My Payments — citizens */}
      {displayRole === "citizen" && (
        <SidebarItem
          icon={<Wallet size={20} />}
          label={lang === "sw" ? "Malipo" : "Payments"}
          active={currentView === "my_payments"}
          onClick={() => setView("my_payments")}
        />
      )}

      {/* ── Communication (collapsible folder) ── */}
      {(() => {
        // Build the child items visible to this role
        const commItems: { icon: React.ReactNode; label: string; view: ViewName; active: boolean }[] = [];

        // Notifications — all roles
        commItems.push({
          icon: <Bell size={16} />,
          label: lang === "sw" ? "Arifa" : "Notifications",
          view: "notifications",
          active: currentView === "notifications",
        });

        // Announcements
        if (displayRole === "citizen") {
          commItems.push({
            icon: <Megaphone size={16} />,
            label: lang === "sw" ? "Matangazo" : "Announcements",
            view: "announcements",
            active: currentView === "announcements",
          });
        }
        if (displayRole === "admin" || displayRole === "staff") {
          commItems.push({
            icon: <Megaphone size={16} />,
            label: lang === "sw" ? "Matangazo" : "Announcements",
            view: "staff_announcements",
            active: currentView === "staff_announcements",
          });
        }

        // Community Reports
        if (displayRole === "citizen") {
          commItems.push({
            icon: <AlertTriangle size={16} />,
            label: lang === "sw" ? "Taarifa za Jamii" : "Community Reports",
            view: "community_reports",
            active: currentView === "community_reports",
          });
        }
        if (displayRole === "staff" && !(user?.is_department_member || localDeptCheck)) {
          commItems.push({
            icon: <AlertTriangle size={16} />,
            label: lang === "sw" ? "Taarifa za Jamii" : "Community Reports",
            view: "staff_reports",
            active: currentView === "staff_reports",
          });
        }

        // Messages — all roles
        commItems.push({
          icon: <Mail size={16} />,
          label: lang === "sw" ? "Ujumbe" : "Messages",
          view: "messages",
          active: currentView === "messages",
        });

        // Support
        if (
          displayRole === "citizen" ||
          (displayRole === "staff" && !(user?.is_department_member || localDeptCheck))
        ) {
          commItems.push({
            icon: <MessageSquare size={16} />,
            label: lang === "sw" ? "Msaada" : "Support",
            view: displayRole === "citizen" ? "citizen_support" : "staff_tickets",
            active: currentView === "citizen_support" || currentView === "staff_tickets",
          });
        }

        // Help & FAQ — all roles (inside Communication folder)
        commItems.push({
          icon: <HelpCircle size={16} />,
          label: lang === "sw" ? "Msaada & Maswali" : "Help & FAQ",
          view: "help_faq",
          active: currentView === "help_faq",
        });

        const anyChildActive = commItems.some((i) => i.active);

        return (
          <div>
            {/* Folder header button */}
            <button
              type="button"
              onClick={() => setCommOpen((v) => !v)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-bold transition-all ${
                anyChildActive
                  ? "bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300"
                  : "text-stone-600 dark:text-stone-400 hover:bg-stone-100 dark:hover:bg-stone-800 hover:text-stone-900 dark:hover:text-stone-100"
              }`}
            >
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                anyChildActive
                  ? "bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400"
                  : "bg-stone-100 dark:bg-stone-800 text-stone-500 dark:text-stone-400"
              }`}>
                <MessageCircle size={18} />
              </div>
              <span className="flex-1 text-left">
                {lang === "sw" ? "Mawasiliano" : "Communication"}
              </span>
              {commOpen
                ? <ChevronDown size={14} className="shrink-0 opacity-60" />
                : <ChevronRight size={14} className="shrink-0 opacity-60" />
              }
            </button>

            {/* Child items */}
            {commOpen && (
              <div className="ml-4 mt-1 space-y-0.5 border-l-2 border-stone-100 dark:border-stone-800 pl-3">
                {commItems.map((item) => (
                  <button
                    key={item.view}
                    type="button"
                    onClick={() => setView(item.view)}
                    className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold transition-all ${
                      item.active
                        ? "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300"
                        : "text-stone-500 dark:text-stone-400 hover:bg-stone-100 dark:hover:bg-stone-800 hover:text-stone-800 dark:hover:text-stone-200"
                    }`}
                  >
                    <span className={item.active ? "text-emerald-600 dark:text-emerald-400" : ""}>
                      {item.icon}
                    </span>
                    {item.label}
                    {item.active && (
                      <span className="ml-auto w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>
        );
      })()}

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
