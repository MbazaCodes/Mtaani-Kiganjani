import React from "react";
import { cn } from "@/lib/utils";

interface SidebarItemProps {
  icon: React.ReactNode;
  label: string;
  active: boolean;
  onClick: () => void;
}

export function SidebarItem({ icon, label, active, onClick }: SidebarItemProps) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex items-center gap-3 px-4 py-3 rounded-xl transition-all text-sm font-semibold w-full text-left",
        active
          ? "bg-emerald-50 text-emerald-600 shadow-sm"
          : "text-stone-500 hover:bg-stone-50 hover:text-stone-800",
      )}
    >
      {icon}
      {label}
    </button>
  );
}
