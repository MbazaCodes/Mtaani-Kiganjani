/**
 * BottomNav — Persistent mobile bottom navigation bar.
 * Shown on small screens only (hidden md:hidden).
 * Provides quick access to the 4-5 most used views per role.
 */
import React from "react";
import { LayoutDashboard, Plus, FileText, Bell, User, ClipboardList, Users, BarChart2, CreditCard } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useLanguage } from "@/context/LanguageContext";
import { useRouterView } from "./AppShell";
import { cn } from "@/lib/utils";
import type { ViewName } from "@/types";

export function BottomNav() {
  const { user } = useAuth();
  const { lang } = useLanguage();
  const { currentView, setView } = useRouterView();
  const sw = lang === "sw";

  if (!user) return null;

  type NavItem = { icon: React.ReactNode; label: string; view: ViewName };

  const citizenItems: NavItem[] = [
    { icon: <LayoutDashboard size={22} />, label: sw ? "Nyumbani" : "Home",       view: "dashboard" },
    { icon: <Plus size={22} />,            label: sw ? "Omba" : "Apply",           view: "services" },
    { icon: <FileText size={22} />,        label: sw ? "Maombi" : "Apps",          view: "applications" },
    { icon: <CreditCard size={22} />,      label: sw ? "Malipo" : "Payments",      view: "my_payments" },
    { icon: <User size={22} />,            label: sw ? "Profaili" : "Profile",     view: "profile" },
  ];

  const staffItems: NavItem[] = [
    { icon: <LayoutDashboard size={22} />, label: sw ? "Dashibodi" : "Dashboard",  view: "staff_dashboard" },
    { icon: <ClipboardList size={22} />,   label: sw ? "Maombi" : "Apps",          view: "application_review" },
    { icon: <Users size={22} />,           label: sw ? "Wananchi" : "Citizens",    view: "manual_verification" },
    { icon: <User size={22} />,            label: sw ? "Profaili" : "Profile",     view: "profile" },
  ];

  const adminItems: NavItem[] = [
    { icon: <LayoutDashboard size={22} />, label: sw ? "Dashibodi" : "Dashboard",  view: "admin_dashboard" },
    { icon: <ClipboardList size={22} />,   label: sw ? "Maombi" : "Apps",          view: "application_review" },
    { icon: <Users size={22} />,           label: sw ? "Wananchi" : "Citizens",    view: "citizen_management" },
    { icon: <User size={22} />,            label: sw ? "Profaili" : "Profile",     view: "profile" },
  ];

  const items =
    user.role === "admin" ? adminItems :
    user.role === "staff" ? staffItems :
    citizenItems;

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 md:hidden bg-white border-t border-stone-200 safe-area-pb shadow-[0_-4px_20px_rgba(0,0,0,0.06)]">
      <div className="flex items-stretch">
        {items.map((item) => {
          const isActive = currentView === item.view;
          return (
            <button
              key={item.view}
              onClick={() => setView(item.view)}
              type="button"
              className={cn(
                "flex-1 flex flex-col items-center justify-center gap-1 py-2.5 px-1 min-h-[60px] transition-colors relative",
                isActive
                  ? "text-emerald-600"
                  : "text-stone-400 hover:text-stone-600 active:bg-stone-50"
              )}
              aria-label={item.label}
            >
              {isActive && (
                <span className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 bg-emerald-500 rounded-full" />
              )}
              <span className={cn("transition-transform", isActive && "scale-110")}>
                {item.icon}
              </span>
              <span className={cn(
                "text-[10px] font-bold tracking-tight leading-none",
                isActive ? "text-emerald-600" : "text-stone-400"
              )}>
                {item.label}
              </span>
            </button>
          );
        })}
      </div>
      {/* iOS safe area spacer */}
      <div className="h-safe-bottom bg-white" />
    </nav>
  );
}
