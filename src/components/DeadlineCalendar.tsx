import React, { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { Calendar, AlertTriangle, Clock, ChevronLeft, ChevronRight } from "lucide-react";
import { useAuth } from "@/context/AuthContext";

interface Deadline {
  id: string;
  title: string;
  date: string;
  type: "event" | "permit" | "agreement" | "expiry";
  applicationNumber: string;
  daysLeft: number;
}

interface DeadlineCalendarProps {
  lang: string;
}

export const DeadlineCalendar: React.FC<DeadlineCalendarProps> = ({ lang }) => {
  const sw = lang === "sw";
  const { user } = useAuth();
  const [deadlines, setDeadlines] = useState<Deadline[]>([]);
  const [loading, setLoading] = useState(true);
  const [month, setMonth] = useState(new Date());

  useEffect(() => {
    if (!user?.id) return;
    const fetch = async () => {
      setLoading(true);
      const { data } = await supabase
        .from("applications")
        .select("id, application_number, service_name, form_data, status")
        .eq("user_id", user.id)
        .in("status", ["issued", "approved"])
        .limit(50);

      const now = new Date();
      const items: Deadline[] = [];

      for (const app of data || []) {
        const fd = (app.form_data || {}) as Record<string, string>;
        const dateStr = fd.end_date || fd.event_date || fd.expiry_date || fd.valid_until;
        if (!dateStr) continue;

        const date = new Date(dateStr);
        if (isNaN(date.getTime())) continue;

        const daysLeft = Math.ceil((date.getTime() - now.getTime()) / (86400000));
        const svc = app.service_name || "";
        items.push({
          id: app.id,
          title: svc,
          date: dateStr,
          type: svc.includes("Sherehe") ? "event"
            : svc.includes("Ujezi") ? "permit"
            : svc.includes("Pango") || svc.includes("Mauzo") ? "agreement"
            : "expiry",
          applicationNumber: app.application_number || "",
          daysLeft,
        });
      }

      setDeadlines(items.sort((a, b) => a.daysLeft - b.daysLeft));
      setLoading(false);
    };
    fetch();
  }, [user?.id]);

  const monthStr = month.toLocaleDateString(sw ? "sw-TZ" : "en", {
    month: "long",
    year: "numeric",
  });

  const typeColor = (t: string) => {
    const colors: Record<string, string> = {
      event: "bg-purple-50 text-purple-700 border-purple-200",
      permit: "bg-blue-50 text-blue-700 border-blue-200",
      agreement: "bg-emerald-50 text-emerald-700 border-emerald-200",
      expiry: "bg-amber-50 text-amber-700 border-amber-200",
    };
    return colors[t] || "bg-stone-50 text-stone-700 border-stone-200";
  };

  // Filter deadlines for the selected month
  const monthDeadlines = deadlines.filter((d) => {
    const dd = new Date(d.date);
    return dd.getMonth() === month.getMonth() && dd.getFullYear() === month.getFullYear();
  });

  return (
    <div className="bg-white border border-stone-200 rounded-xl p-4">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Calendar size={16} className="text-emerald-600" />
          <p className="text-xs font-black text-stone-600 uppercase">
            {sw ? "Tarehe Muhimu" : "Key Dates & Deadlines"}
          </p>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1))}
            className="p-1 hover:bg-stone-100 rounded"
          >
            <ChevronLeft size={14} />
          </button>
          <span className="text-xs font-bold text-stone-700 w-28 text-center">{monthStr}</span>
          <button
            onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1))}
            className="p-1 hover:bg-stone-100 rounded"
          >
            <ChevronRight size={14} />
          </button>
        </div>
      </div>

      {loading ? (
        <p className="text-xs text-stone-400 text-center py-4">Loading...</p>
      ) : deadlines.length === 0 ? (
        <p className="text-xs text-stone-400 text-center py-4">
          {sw ? "Hakuna tarehe muhimu" : "No upcoming deadlines"}
        </p>
      ) : (
        <>
          {/* Urgent alerts */}
          {deadlines.filter((d) => d.daysLeft <= 7 && d.daysLeft >= 0).length > 0 && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-2 mb-3">
              <div className="flex items-center gap-1 mb-1">
                <AlertTriangle size={12} className="text-red-600" />
                <p className="text-[10px] font-bold text-red-700 uppercase">
                  {sw ? "Inakaribia Kumalizika" : "Expiring Soon"}
                </p>
              </div>
              {deadlines
                .filter((d) => d.daysLeft <= 7 && d.daysLeft >= 0)
                .map((d) => (
                  <p key={d.id} className="text-xs text-red-600">
                    {d.title} — {d.daysLeft === 0 ? (sw ? "Leo!" : "Today!") : `${d.daysLeft} ${sw ? "siku" : "days"}`}
                  </p>
                ))}
            </div>
          )}

          {/* Month deadlines */}
          <div className="space-y-1.5">
            {(monthDeadlines.length > 0 ? monthDeadlines : deadlines.slice(0, 5)).map((d) => (
              <div
                key={d.id}
                className={`flex items-center justify-between p-2 rounded-lg border text-xs ${typeColor(d.type)}`}
              >
                <div className="min-w-0">
                  <p className="font-bold truncate">{d.title}</p>
                  <p className="text-[10px] opacity-70 font-mono">{d.applicationNumber}</p>
                </div>
                <div className="text-right shrink-0 ml-2">
                  <p className="font-bold">{new Date(d.date).toLocaleDateString()}</p>
                  <p className="flex items-center gap-0.5 text-[10px]">
                    <Clock size={8} />
                    {d.daysLeft < 0
                      ? sw ? "Imepita" : "Expired"
                      : d.daysLeft === 0
                        ? sw ? "Leo" : "Today"
                        : `${d.daysLeft} ${sw ? "siku" : "days"}`}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
};
