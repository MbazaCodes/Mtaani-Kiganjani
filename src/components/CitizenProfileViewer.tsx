import React, { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import {
  X,
  User,
  Phone,
  Mail,
  MapPin,
  Hash,
  FileText,
  Calendar,
  Shield,
  Loader2,
  Search,
} from "lucide-react";

interface CitizenData {
  id: string;
  first_name: string;
  middle_name?: string;
  last_name: string;
  email?: string;
  phone?: string;
  nida_number?: string;
  citizen_id?: string;
  date_of_birth?: string;
  sex?: string;
  nationality?: string;
  region?: string;
  district?: string;
  ward?: string;
  role?: string;
  account_status?: string;
  created_at?: string;
  id_number?: string;
  passport_number?: string;
  voter_id_number?: string;
  driving_license_number?: string;
}

interface CitizenApp {
  id: string;
  application_number: string;
  service_name: string;
  status: string;
  created_at: string;
}

interface CitizenProfileViewerProps {
  /** Pass ONE of these to look up the citizen */
  citizenId?: string;
  nidaNumber?: string;
  citizenCode?: string; // CT number
  /** Language */
  lang: string;
  /** Close handler */
  onClose: () => void;
}

export const CitizenProfileViewer: React.FC<CitizenProfileViewerProps> = ({
  citizenId,
  nidaNumber,
  citizenCode,
  lang,
  onClose,
}) => {
  const sw = lang === "sw";
  const L = (s: string, e: string) => (sw ? s : e);

  const [citizen, setCitizen] = useState<CitizenData | null>(null);
  const [apps, setApps] = useState<CitizenApp[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    const lookup = async () => {
      setLoading(true);
      setNotFound(false);
      try {
        let query = supabase.from("users").select("*");

        if (citizenId) {
          query = query.eq("id", citizenId);
        } else if (nidaNumber) {
          query = query.eq("nida_number", nidaNumber);
        } else if (citizenCode) {
          query = query.eq("citizen_id", citizenCode);
        } else {
          setNotFound(true);
          setLoading(false);
          return;
        }

        const { data, error } = await query.maybeSingle();
        if (error || !data) {
          setNotFound(true);
          setLoading(false);
          return;
        }
        setCitizen(data as CitizenData);

        // Fetch their applications
        const { data: appData } = await supabase
          .from("applications")
          .select("id, application_number, service_name, status, created_at")
          .eq("user_id", data.id)
          .order("created_at", { ascending: false })
          .limit(20);
        setApps((appData as CitizenApp[]) || []);
      } catch {
        setNotFound(true);
      } finally {
        setLoading(false);
      }
    };
    lookup();
  }, [citizenId, nidaNumber, citizenCode]);

  const statusColor = (s: string) => {
    if (s === "issued" || s === "approved")
      return "bg-emerald-50 text-emerald-700 border-emerald-200";
    if (s === "rejected") return "bg-red-50 text-red-700 border-red-200";
    if (s === "submitted" || s === "pending") return "bg-amber-50 text-amber-700 border-amber-200";
    return "bg-stone-50 text-stone-600 border-stone-200";
  };

  const Row = ({
    icon,
    label,
    value,
  }: {
    icon: React.ReactNode;
    label: string;
    value?: string | null;
  }) => {
    if (!value) return null;
    return (
      <div className="flex items-start gap-3 py-2 border-b border-stone-100 last:border-0">
        <span className="text-stone-400 shrink-0 mt-0.5">{icon}</span>
        <div className="flex-1 min-w-0">
          <p className="text-[10px] text-stone-400 uppercase tracking-wider">{label}</p>
          <p className="text-sm font-bold text-stone-800 break-words">{value}</p>
        </div>
      </div>
    );
  };

  return (
    <>
      <div className="fixed inset-0 bg-stone-900/40 backdrop-blur-sm z-40" onClick={onClose} />
      <div className="fixed inset-y-0 right-0 w-full sm:w-[520px] max-w-full bg-white shadow-2xl z-50 flex flex-col">
        {/* Header */}
        <div className="px-5 py-4 border-b border-stone-200 flex items-center justify-between shrink-0 bg-stone-50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center">
              <User size={20} className="text-emerald-600" />
            </div>
            <div>
              <p className="text-[10px] font-bold text-stone-400 uppercase tracking-wider">
                {L("Wasifu wa Raia", "Citizen Profile")}
              </p>
              {citizen && (
                <p className="text-base font-black text-stone-900">
                  {citizen.first_name} {citizen.middle_name || ""} {citizen.last_name}
                </p>
              )}
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-stone-400 hover:text-stone-800 hover:bg-stone-100 rounded-lg"
          >
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 size={24} className="animate-spin text-emerald-500" />
            </div>
          ) : notFound ? (
            <div className="text-center py-12">
              <Search size={32} className="mx-auto text-stone-300 mb-3" />
              <p className="text-stone-500 font-bold">
                {L("Raia hajapatikana", "Citizen not found")}
              </p>
              <p className="text-xs text-stone-400 mt-1">
                {citizenId || nidaNumber || citizenCode}
              </p>
            </div>
          ) : citizen ? (
            <>
              {/* Personal Info */}
              <div className="bg-white border border-stone-200 rounded-xl p-4">
                <p className="text-[10px] font-black text-stone-400 uppercase tracking-wider mb-2">
                  {L("Taarifa Binafsi", "Personal Information")}
                </p>
                <Row
                  icon={<User size={14} />}
                  label={L("Jina Kamili", "Full Name")}
                  value={`${citizen.first_name} ${citizen.middle_name || ""} ${citizen.last_name}`.trim()}
                />
                <Row icon={<Hash size={14} />} label="NIDA" value={citizen.nida_number} />
                <Row
                  icon={<Shield size={14} />}
                  label={L("Namba ya Raia", "Citizen ID")}
                  value={citizen.citizen_id}
                />
                <Row icon={<Phone size={14} />} label={L("Simu", "Phone")} value={citizen.phone} />
                <Row
                  icon={<Mail size={14} />}
                  label={L("Barua pepe", "Email")}
                  value={citizen.email}
                />
                <Row
                  icon={<Calendar size={14} />}
                  label={L("Tarehe ya Kuzaliwa", "Date of Birth")}
                  value={citizen.date_of_birth}
                />
                <Row icon={<User size={14} />} label={L("Jinsia", "Sex")} value={citizen.sex} />
                <Row
                  icon={<FileText size={14} />}
                  label={L("Uraia", "Nationality")}
                  value={citizen.nationality}
                />
              </div>

              {/* Location */}
              <div className="bg-white border border-stone-200 rounded-xl p-4">
                <p className="text-[10px] font-black text-stone-400 uppercase tracking-wider mb-2">
                  {L("Mahali", "Location")}
                </p>
                <Row
                  icon={<MapPin size={14} />}
                  label={L("Mkoa", "Region")}
                  value={citizen.region}
                />
                <Row
                  icon={<MapPin size={14} />}
                  label={L("Wilaya", "District")}
                  value={citizen.district}
                />
                <Row icon={<MapPin size={14} />} label={L("Kata", "Ward")} value={citizen.ward} />
              </div>

              {/* ID Documents */}
              {(citizen.id_number ||
                citizen.passport_number ||
                citizen.voter_id_number ||
                citizen.driving_license_number) && (
                <div className="bg-white border border-stone-200 rounded-xl p-4">
                  <p className="text-[10px] font-black text-stone-400 uppercase tracking-wider mb-2">
                    {L("Vitambulisho", "ID Documents")}
                  </p>
                  <Row
                    icon={<FileText size={14} />}
                    label={L("Namba ya Kitambulisho", "ID Number")}
                    value={citizen.id_number}
                  />
                  <Row
                    icon={<FileText size={14} />}
                    label={L("Pasipoti", "Passport")}
                    value={citizen.passport_number}
                  />
                  <Row
                    icon={<FileText size={14} />}
                    label={L("Kadi ya Mpiga Kura", "Voter ID")}
                    value={citizen.voter_id_number}
                  />
                  <Row
                    icon={<FileText size={14} />}
                    label={L("Leseni ya Udereva", "Driving License")}
                    value={citizen.driving_license_number}
                  />
                </div>
              )}

              {/* Account */}
              <div className="bg-white border border-stone-200 rounded-xl p-4">
                <p className="text-[10px] font-black text-stone-400 uppercase tracking-wider mb-2">
                  {L("Akaunti", "Account")}
                </p>
                <Row
                  icon={<Shield size={14} />}
                  label={L("Hali", "Status")}
                  value={citizen.account_status}
                />
                <Row icon={<User size={14} />} label={L("Jukumu", "Role")} value={citizen.role} />
                <Row
                  icon={<Calendar size={14} />}
                  label={L("Tarehe ya Kusajiliwa", "Registered")}
                  value={
                    citizen.created_at ? new Date(citizen.created_at).toLocaleDateString() : null
                  }
                />
              </div>

              {/* Applications History */}
              <div className="bg-white border border-stone-200 rounded-xl p-4">
                <p className="text-[10px] font-black text-stone-400 uppercase tracking-wider mb-2">
                  {L("Historia ya Maombi", "Application History")} ({apps.length})
                </p>
                {apps.length === 0 ? (
                  <p className="text-xs text-stone-400 py-2">
                    {L("Hakuna maombi", "No applications")}
                  </p>
                ) : (
                  <div className="space-y-1.5">
                    {apps.map((a) => (
                      <div
                        key={a.id}
                        className="flex items-center justify-between py-1.5 border-b border-stone-50 last:border-0"
                      >
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-stone-700 truncate">
                            {a.service_name}
                          </p>
                          <p className="text-[10px] text-stone-400 font-mono">
                            {a.application_number}
                          </p>
                        </div>
                        <div className="text-right shrink-0 ml-2">
                          <span
                            className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${statusColor(a.status)}`}
                          >
                            {a.status}
                          </span>
                          <p className="text-[9px] text-stone-400 mt-0.5">
                            {new Date(a.created_at).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          ) : null}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-stone-100 bg-stone-50 shrink-0">
          <button
            onClick={onClose}
            className="w-full py-2.5 bg-stone-200 hover:bg-stone-300 rounded-xl text-sm font-bold text-stone-700"
          >
            {L("Funga", "Close")}
          </button>
        </div>
      </div>
    </>
  );
};
