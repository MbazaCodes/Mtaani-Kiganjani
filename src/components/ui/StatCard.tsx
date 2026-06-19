import React from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface StatCardProps {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  trend?: number;
  description?: string;
  className?: string;
}

export function StatCard({ icon, label, value, trend, description, className }: StatCardProps) {
  return (
    <motion.div
      whileHover={{ y: -2 }}
      className={cn("bg-white rounded-3xl p-6 border border-stone-100 shadow-xl", className)}
    >
      <div className="flex items-center justify-between mb-4">
        <div className="p-3 rounded-2xl bg-stone-50">{icon}</div>
        {trend !== undefined && (
          <span
            className={cn(
              "text-xs font-black px-2 py-1 rounded-lg",
              trend >= 0 ? "bg-emerald-50 text-emerald-600" : "bg-red-50 text-red-600",
            )}
          >
            {trend > 0 ? "+" : ""}
            {trend}%
          </span>
        )}
      </div>
      <p className="text-sm font-bold text-stone-500 uppercase tracking-widest mb-1">{label}</p>
      <p className="text-3xl font-black text-stone-900">{value}</p>
      {description && <p className="text-xs text-stone-400 mt-2">{description}</p>}
    </motion.div>
  );
}
