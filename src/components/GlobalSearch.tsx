import React, { useState, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { Search, X, FileText, User, Loader2 } from "lucide-react";

interface SearchResult {
  type: "application" | "citizen" | "ticket" | "report";
  id: string;
  title: string;
  subtitle: string;
  status?: string;
}

interface GlobalSearchProps {
  lang: string;
  onSelectApp?: (id: string) => void;
  onSelectCitizen?: (id: string) => void;
}

export const GlobalSearch: React.FC<GlobalSearchProps> = ({
  lang,
  onSelectApp,
  onSelectCitizen,
}) => {
  const sw = lang === "sw";
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);

  const search = useCallback(async (q: string) => {
    if (q.length < 2) {
      setResults([]);
      return;
    }
    setLoading(true);
    try {
      const items: SearchResult[] = [];
      const term = `%${q}%`;

      // Search applications
      const { data: apps } = await supabase
        .from("applications")
        .select("id, application_number, service_name, status")
        .or(`application_number.ilike.${term},service_name.ilike.${term}`)
        .limit(5);
      (apps || []).forEach((a) =>
        items.push({
          type: "application",
          id: a.id,
          title: a.application_number || "",
          subtitle: a.service_name || "",
          status: a.status,
        }),
      );

      // Search citizens
      const { data: citizens } = await supabase
        .from("users")
        .select("id, first_name, last_name, citizen_id, nida_number, phone")
        .or(
          `first_name.ilike.${term},last_name.ilike.${term},citizen_id.ilike.${term},nida_number.ilike.${term},phone.ilike.${term}`,
        )
        .eq("role", "citizen")
        .limit(5);
      (citizens || []).forEach((c) =>
        items.push({
          type: "citizen",
          id: c.id,
          title: `${c.first_name} ${c.last_name}`,
          subtitle: c.citizen_id || c.nida_number || c.phone || "",
        }),
      );

      // Search tickets
      const { data: tickets } = await supabase
        .from("support_tickets")
        .select("id, ticket_number, subject, status")
        .or(`ticket_number.ilike.${term},subject.ilike.${term}`)
        .limit(3);
      (tickets || []).forEach((t) =>
        items.push({
          type: "ticket",
          id: t.id,
          title: t.ticket_number || "",
          subtitle: t.subject || "",
          status: t.status,
        }),
      );

      setResults(items);
    } catch {
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleChange = (val: string) => {
    setQuery(val);
    setOpen(true);
    search(val);
  };

  const typeIcon = (t: string) => {
    if (t === "citizen") return <User size={14} className="text-emerald-600" />;
    return <FileText size={14} className="text-blue-600" />;
  };

  const typeLabel = (t: string) => {
    const labels: Record<string, string> = {
      application: sw ? "Maombi" : "Application",
      citizen: sw ? "Raia" : "Citizen",
      ticket: sw ? "Tiketi" : "Ticket",
      report: sw ? "Taarifa" : "Report",
    };
    return labels[t] || t;
  };

  return (
    <div className="relative">
      <div className="flex items-center bg-stone-100 rounded-xl px-3 py-2 gap-2">
        <Search size={16} className="text-stone-400 shrink-0" />
        <input
          value={query}
          onChange={(e) => handleChange(e.target.value)}
          onFocus={() => query.length >= 2 && setOpen(true)}
          placeholder={
            sw ? "Tafuta maombi, raia, tiketi..." : "Search applications, citizens, tickets..."
          }
          className="flex-1 bg-transparent text-sm outline-none placeholder-stone-400"
        />
        {query && (
          <button
            onClick={() => {
              setQuery("");
              setResults([]);
              setOpen(false);
            }}
          >
            <X size={14} className="text-stone-400" />
          </button>
        )}
        {loading && <Loader2 size={14} className="animate-spin text-stone-400" />}
      </div>

      {open && results.length > 0 && (
        <div className="absolute z-30 left-0 right-0 mt-1 bg-white border border-stone-200 rounded-xl shadow-xl max-h-72 overflow-y-auto">
          {results.map((r, i) => (
            <button
              key={`${r.type}-${r.id}-${i}`}
              onClick={() => {
                setOpen(false);
                if (r.type === "citizen" && onSelectCitizen) onSelectCitizen(r.id);
                else if (onSelectApp) onSelectApp(r.id);
              }}
              className="w-full px-3 py-2.5 hover:bg-stone-50 flex items-start gap-2 border-b border-stone-50 last:border-0 text-left"
            >
              {typeIcon(r.type)}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-stone-800 truncate">{r.title}</span>
                  <span className="text-[9px] bg-stone-100 text-stone-500 px-1.5 py-0.5 rounded-full">
                    {typeLabel(r.type)}
                  </span>
                </div>
                <p className="text-[10px] text-stone-400 truncate">{r.subtitle}</p>
              </div>
              {r.status && (
                <span
                  className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full shrink-0 ${
                    r.status === "issued"
                      ? "bg-emerald-50 text-emerald-700"
                      : r.status === "rejected"
                        ? "bg-red-50 text-red-700"
                        : "bg-amber-50 text-amber-700"
                  }`}
                >
                  {r.status}
                </span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};
