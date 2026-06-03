import React from "react";

interface InfoItemProps {
  label: string;
  value: string;
  icon?: React.ReactNode;
}

export function InfoItem({ label, value, icon }: InfoItemProps) {
  return (
    <div className="space-y-1">
      <div className="flex items-center gap-2">
        {icon && <span className="text-stone-400">{icon}</span>}
        <p className="text-xs font-bold text-stone-400 uppercase tracking-widest">{label}</p>
      </div>
      <p className="text-stone-800 font-medium">{value}</p>
    </div>
  );
}
