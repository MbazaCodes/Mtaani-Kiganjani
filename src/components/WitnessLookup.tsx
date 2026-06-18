import React, { useState, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { Search, User, X, Loader2, Pencil } from "lucide-react";

interface WitnessData {
  name: string;
  phone: string;
  nida: string;
  userId?: string; // set if found in system
}

interface WitnessLookupProps {
  label: string;
  value: WitnessData;
  onChange: (data: WitnessData) => void;
  lang: string;
}

interface CitizenResult {
  id: string;
  first_name: string;
  last_name: string;
  phone: string;
  nida_number: string;
  citizen_id: string;
}

export const WitnessLookup: React.FC<WitnessLookupProps> = ({ label, value, onChange, lang }) => {
  const sw = lang === "sw";
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<CitizenResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [manualMode, setManualMode] = useState(false);

  const search = useCallback(async (q: string) => {
    if (q.length < 2) {
      setResults([]);
      return;
    }
    setSearching(true);
    try {
      const term = `%${q}%`;
      const { data } = await supabase
        .from("users")
        .select("id, first_name, last_name, phone, nida_number, citizen_id")
        .or(
          `first_name.ilike.${term},last_name.ilike.${term},nida_number.ilike.${term},phone.ilike.${term},citizen_id.ilike.${term}`,
        )
        .eq("role", "citizen")
        .limit(5);
      setResults((data as CitizenResult[]) || []);
      setShowResults(true);
    } catch {
      setResults([]);
    } finally {
      setSearching(false);
    }
  }, []);

  const handleSelect = (citizen: CitizenResult) => {
    onChange({
      name: `${citizen.first_name} ${citizen.last_name}`,
      phone: citizen.phone || "",
      nida: citizen.nida_number || "",
      userId: citizen.id,
    });
    setQuery("");
    setShowResults(false);
    setManualMode(false);
  };

  const handleClear = () => {
    onChange({ name: "", phone: "", nida: "", userId: undefined });
    setManualMode(false);
  };

  // If a witness is selected (has a name), show the selected state
  if (value.name && !manualMode) {
    return (
      <div className="border border-stone-200 rounded-xl p-3 bg-stone-50">
        <div className="flex items-center justify-between mb-1">
          <p className="text-[10px] font-bold text-stone-400 uppercase">{label}</p>
          <div className="flex gap-1">
            <button
              type="button"
              onClick={() => setManualMode(true)}
              className="text-stone-400 hover:text-blue-600"
              title={sw ? "Hariri" : "Edit"}
            >
              <Pencil size={12} />
            </button>
            <button
              type="button"
              onClick={handleClear}
              className="text-stone-400 hover:text-red-600"
            >
              <X size={12} />
            </button>
          </div>
        </div>
        <p className="text-sm font-bold text-stone-800">{value.name}</p>
        {value.phone && <p className="text-xs text-stone-500">{value.phone}</p>}
        {value.nida && <p className="text-[10px] text-stone-400 font-mono">{value.nida}</p>}
        {value.userId && (
          <span className="text-[9px] bg-emerald-50 text-emerald-700 px-1.5 py-0.5 rounded-full border border-emerald-200 mt-1 inline-block">
            {sw ? "✓ Mtumiaji wa mfumo" : "✓ System user"}
          </span>
        )}
      </div>
    );
  }

  // Manual entry mode
  if (manualMode) {
    return (
      <div className="border border-stone-200 rounded-xl p-3 space-y-2">
        <div className="flex items-center justify-between">
          <p className="text-[10px] font-bold text-stone-400 uppercase">{label}</p>
          <button
            type="button"
            onClick={() => setManualMode(false)}
            className="text-xs text-emerald-600 hover:underline"
          >
            {sw ? "Tafuta badala yake" : "Search instead"}
          </button>
        </div>
        <input
          type="text"
          value={value.name}
          onChange={(e) => onChange({ ...value, name: e.target.value })}
          placeholder={sw ? "Jina kamili" : "Full name"}
          className="w-full text-sm bg-white border border-stone-200 rounded-lg px-3 py-2"
        />
        <input
          type="tel"
          value={value.phone}
          onChange={(e) => onChange({ ...value, phone: e.target.value })}
          placeholder={sw ? "Namba ya simu" : "Phone number"}
          className="w-full text-sm bg-white border border-stone-200 rounded-lg px-3 py-2"
        />
        <input
          type="text"
          value={value.nida}
          onChange={(e) => onChange({ ...value, nida: e.target.value })}
          placeholder="NIDA"
          className="w-full text-sm bg-white border border-stone-200 rounded-lg px-3 py-2"
        />
      </div>
    );
  }

  // Search mode (default)
  return (
    <div className="relative">
      <p className="text-[10px] font-bold text-stone-400 uppercase mb-1">{label}</p>
      <div className="flex items-center gap-2 bg-white border border-stone-200 rounded-xl px-3 py-2">
        <Search size={14} className="text-stone-400 shrink-0" />
        <input
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            search(e.target.value);
          }}
          onFocus={() => query.length >= 2 && setShowResults(true)}
          placeholder={
            sw ? "Tafuta kwa jina, NIDA, au simu..." : "Search by name, NIDA, or phone..."
          }
          className="flex-1 text-sm outline-none placeholder-stone-400"
        />
        {searching && <Loader2 size={14} className="animate-spin text-stone-400" />}
      </div>

      {/* Search results */}
      {showResults && results.length > 0 && (
        <div className="absolute z-20 left-0 right-0 mt-1 bg-white border border-stone-200 rounded-xl shadow-lg max-h-40 overflow-y-auto">
          {results.map((r) => (
            <button
              key={r.id}
              type="button"
              onClick={() => handleSelect(r)}
              className="w-full px-3 py-2 hover:bg-stone-50 flex items-center gap-2 text-left border-b border-stone-50 last:border-0"
            >
              <User size={14} className="text-emerald-600 shrink-0" />
              <div className="min-w-0">
                <p className="text-xs font-bold text-stone-800 truncate">
                  {r.first_name} {r.last_name}
                </p>
                <p className="text-[10px] text-stone-400">
                  {r.citizen_id || ""} · {r.phone || ""}
                </p>
              </div>
            </button>
          ))}
        </div>
      )}

      {/* Manual entry option */}
      <button
        type="button"
        onClick={() => setManualMode(true)}
        className="mt-1.5 text-xs text-stone-500 hover:text-emerald-600"
      >
        {sw
          ? "↳ Ingiza kwa mkono (hapatikani kwenye mfumo)"
          : "↳ Enter manually (not found in system)"}
      </button>
    </div>
  );
};
