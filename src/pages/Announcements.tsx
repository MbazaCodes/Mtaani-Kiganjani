import React, { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Megaphone,
  Plus,
  Loader2,
  X,
  Clock,
  MapPin,
  ChevronDown,
  ChevronRight,
  Trash2,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";
import { useLanguage } from "@/context/LanguageContext";
import { useToast } from "@/context/ToastContext";
import { cn } from "@/lib/utils";
import { TANZANIA_ADDRESS_DATA } from "@/lib/addressData";

const CATEGORIES = [
  { value: "public_notice", en: "Public Notice", sw: "Tangazo la Umma", icon: "📢" },
  { value: "community_meeting", en: "Community Meeting", sw: "Mkutano wa Jamii", icon: "🤝" },
  { value: "emergency_alert", en: "Emergency Alert", sw: "Tahadhari ya Dharura", icon: "🚨" },
  { value: "security_alert", en: "Security Alert", sw: "Tahadhari ya Usalama", icon: "🔒" },
  { value: "health_notice", en: "Health Notice", sw: "Tangazo la Afya", icon: "🏥" },
  { value: "education_notice", en: "Education Notice", sw: "Tangazo la Elimu", icon: "📚" },
  {
    value: "infrastructure_update",
    en: "Infrastructure Update",
    sw: "Habari za Miundombinu",
    icon: "🏗️",
  },
];

// Preset title templates per category — user picks one or writes custom
const TITLE_TEMPLATES: Record<string, { sw: string; en: string }[]> = {
  public_notice: [
    { sw: "Tangazo la Huduma za Ofisi", en: "Office Service Notice" },
    { sw: "Mabadiliko ya Saa za Kazi", en: "Change in Working Hours" },
    { sw: "Usajili wa Wakazi", en: "Resident Registration" },
    { sw: "Tangazo la Malipo ya Ushuru", en: "Tax Payment Notice" },
  ],
  community_meeting: [
    { sw: "Mkutano wa Mtaa/Kitongoji", en: "Street/Neighborhood Meeting" },
    { sw: "Mkutano Mkuu wa Kata", en: "Ward General Meeting" },
    { sw: "Mkutano wa Maendeleo ya Jamii", en: "Community Development Meeting" },
    { sw: "Mkutano wa Dharura", en: "Emergency Meeting" },
  ],
  emergency_alert: [
    { sw: "Tahadhari ya Mafuriko", en: "Flood Warning" },
    { sw: "Tahadhari ya Hali ya Hewa", en: "Weather Alert" },
    { sw: "Dharura ya Moto", en: "Fire Emergency" },
    { sw: "Tahadhari ya Jumla", en: "General Emergency Alert" },
  ],
  security_alert: [
    { sw: "Tahadhari ya Usalama Mtaani", en: "Neighborhood Security Alert" },
    { sw: "Onyo la Wizi", en: "Theft Warning" },
    { sw: "Doria za Usalama", en: "Security Patrol Notice" },
    { sw: "Tahadhari ya Watu Wenye Mashaka", en: "Suspicious Persons Alert" },
  ],
  health_notice: [
    { sw: "Kampeni ya Chanjo", en: "Vaccination Campaign" },
    { sw: "Tahadhari ya Mlipuko wa Ugonjwa", en: "Disease Outbreak Alert" },
    { sw: "Huduma za Afya za Bure", en: "Free Health Services" },
    { sw: "Usafi wa Mazingira", en: "Environmental Sanitation" },
  ],
  education_notice: [
    { sw: "Usajili wa Wanafunzi", en: "Student Registration" },
    { sw: "Ratiba ya Mitihani", en: "Examination Schedule" },
    { sw: "Ufadhili wa Masomo", en: "Scholarship Opportunity" },
    { sw: "Mkutano wa Wazazi", en: "Parents Meeting" },
  ],
  infrastructure_update: [
    { sw: "Ukarabati wa Barabara", en: "Road Maintenance" },
    { sw: "Kukatika kwa Maji", en: "Water Supply Interruption" },
    { sw: "Kukatika kwa Umeme", en: "Power Outage" },
    { sw: "Mradi wa Maendeleo", en: "Development Project" },
  ],
};

const PRIORITY_STYLES: Record<string, { bg: string; border: string; badge: string }> = {
  normal: { bg: "bg-white", border: "border-stone-200", badge: "bg-stone-100 text-stone-600" },
  important: { bg: "bg-blue-50/50", border: "border-blue-200", badge: "bg-blue-100 text-blue-700" },
  urgent: { bg: "bg-red-50/50", border: "border-red-200", badge: "bg-red-100 text-red-700" },
};

interface Announcement {
  id: string;
  title: string;
  body: string;
  category: string;
  level: string;
  region?: string;
  district?: string;
  ward?: string;
  priority: string;
  published_by?: string;
  published_at: string;
  expires_at?: string;
  is_active: boolean;
  publisher?: {
    first_name: string;
    last_name: string;
    position?: string;
    ward?: string;
    assigned_district?: string;
    assigned_region?: string;
    role?: string;
  };
}

export function Announcements({ isStaff = false }: { isStaff?: boolean }) {
  const { user } = useAuth();
  const { lang } = useLanguage();
  const { showToast } = useToast();
  const L = useCallback((sw: string, en: string) => (lang === "sw" ? sw : en), [lang]);
  const sw = lang === "sw";

  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Create form
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [category, setCategory] = useState("public_notice");
  const [titleMode, setTitleMode] = useState<"preset" | "custom">("preset");
  const [level, setLevel] = useState("ward");
  const [priority, setPriority] = useState("normal");
  const [region, setRegion] = useState(user?.assigned_region || user?.region || "");
  const [district, setDistrict] = useState(user?.assigned_district || user?.district || "");
  const [ward, setWard] = useState(user?.ward || "");

  const fetchAnnouncements = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      let query = supabase
        .from("announcements")
        .select(
          "*, publisher:published_by(first_name, last_name, position, ward, assigned_district, assigned_region, role)",
        )
        .eq("is_active", true)
        .order("published_at", { ascending: false })
        .limit(100);

      if (!isStaff) {
        // Citizens: filter by their location (show national + their region/district/ward)
        // We use OR filter: national announcements + matching location
        query = query.or(
          `level.eq.national,region.eq.${user.region || "NONE"},district.eq.${user.district || "NONE"},ward.eq.${user.ward || "NONE"}`,
        );
      } else {
        // Staff: show announcements in their area
        if (user.ward && user.role === "staff") {
          query = query.or(
            `ward.eq.${user.ward},district.eq.${user.assigned_district},region.eq.${user.assigned_region},level.eq.national`,
          );
        } else if (user.assigned_district) {
          query = query.or(
            `district.eq.${user.assigned_district},region.eq.${user.assigned_region},level.eq.national`,
          );
        } else if (user.assigned_region) {
          query = query.or(`region.eq.${user.assigned_region},level.eq.national`);
        }
      }

      const { data } = await query;
      setAnnouncements((data as Announcement[]) || []);
    } catch {
      setAnnouncements([]);
    } finally {
      setLoading(false);
    }
  }, [user, isStaff]);

  useEffect(() => {
    fetchAnnouncements();
  }, [fetchAnnouncements]);

  const handleCreate = async () => {
    if (!user || !title.trim() || !body.trim()) {
      showToast(L("Jaza sehemu zote", "Fill all fields"), "error");
      return;
    }
    // Validate cascading location based on target level
    if (level !== "national" && !region) {
      showToast(L("Chagua mkoa", "Select a region"), "error");
      return;
    }
    if ((level === "district" || level === "ward") && !district) {
      showToast(L("Chagua wilaya", "Select a district"), "error");
      return;
    }
    if (level === "ward" && !ward) {
      showToast(L("Chagua kata", "Select a ward"), "error");
      return;
    }
    setSubmitting(true);
    try {
      const { error } = await supabase.from("announcements").insert({
        title: title.trim(),
        body: body.trim(),
        category,
        level,
        region: level !== "national" ? region : null,
        district: ["district", "ward", "street"].includes(level) ? district : null,
        ward: ["ward", "street"].includes(level) ? ward : null,
        priority,
        published_by: user.id,
        is_active: true,
      });
      if (error) throw error;
      showToast(L("Tangazo limechapishwa!", "Announcement published!"), "success");
      setTitle("");
      setTitleMode("preset");
      setBody("");
      setShowCreate(false);
      fetchAnnouncements();
    } catch (err: unknown) {
      showToast((err as { message?: string }).message || "Error", "error");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await supabase.from("announcements").update({ is_active: false }).eq("id", id);
      showToast(L("Tangazo limefutwa", "Announcement removed"), "success");
      fetchAnnouncements();
    } catch (err: unknown) {
      showToast((err as { message?: string }).message || "Error", "error");
    }
  };

  const getOffice = (a: Announcement) => {
    const p = a.publisher;
    if (!p) return null;
    const name = `${p.first_name || ""} ${p.last_name || ""}`.trim();
    // Determine office/role label
    let office = "";
    if (p.role === "admin") office = sw ? "Msimamizi wa Mfumo" : "System Administrator";
    else if (p.ward)
      office = sw ? `Afisa Mtendaji wa Kata — ${p.ward}` : `Ward Executive Officer — ${p.ward}`;
    else if (p.assigned_district)
      office = sw
        ? `Ofisi ya Wilaya — ${p.assigned_district}`
        : `District Office — ${p.assigned_district}`;
    else if (p.assigned_region)
      office = sw
        ? `Ofisi ya Mkoa — ${p.assigned_region}`
        : `Regional Office — ${p.assigned_region}`;
    else office = p.position || (sw ? "Ofisi ya Serikali" : "Government Office");
    return { name, office };
  };

  const getCatLabel = (val: string) => {
    const cat = CATEGORIES.find((c) => c.value === val);
    return cat ? `${cat.icon} ${sw ? cat.sw : cat.en}` : val;
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-stone-900 tracking-tight flex items-center gap-2">
            <Megaphone size={24} className="text-emerald-600" />
            {L("Matangazo", "Announcements")}
          </h1>
          <p className="text-sm text-stone-500 mt-0.5">
            {isStaff
              ? L("Chapisha na simamia matangazo", "Publish and manage announcements")
              : L("Matangazo ya eneo lako", "Announcements for your area")}
          </p>
        </div>
        {isStaff && (
          <button
            onClick={() => setShowCreate(!showCreate)}
            className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-sm flex items-center gap-2"
          >
            {showCreate ? <X size={16} /> : <Plus size={16} />}
            {showCreate ? L("Ghairi", "Cancel") : L("Tangazo Jipya", "New Announcement")}
          </button>
        )}
      </div>

      {/* Create form (staff only) */}
      <AnimatePresence>
        {showCreate && isStaff && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="bg-white rounded-2xl border border-stone-200 p-6 space-y-4 overflow-hidden"
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* STEP 1: Category first */}
              <div className="sm:col-span-2">
                <label className="block text-xs font-bold text-stone-600 uppercase tracking-wider mb-1.5">
                  1. {L("Aina ya Tangazo", "Category")} *
                </label>
                <select
                  value={category}
                  onChange={(e) => {
                    setCategory(e.target.value);
                    setTitle("");
                    setTitleMode("preset");
                  }}
                  className="w-full px-4 py-3 border border-stone-200 rounded-xl text-sm bg-white"
                  aria-label="Category"
                >
                  {CATEGORIES.map((c) => (
                    <option key={c.value} value={c.value}>
                      {c.icon} {sw ? c.sw : c.en}
                    </option>
                  ))}
                </select>
              </div>

              {/* STEP 2: Title — pick a preset for this category or write custom */}
              <div className="sm:col-span-2">
                <label className="block text-xs font-bold text-stone-600 uppercase tracking-wider mb-1.5">
                  2. {L("Kichwa", "Title")} *
                </label>
                <select
                  value={titleMode === "custom" ? "__custom__" : title}
                  onChange={(e) => {
                    if (e.target.value === "__custom__") {
                      setTitleMode("custom");
                      setTitle("");
                    } else {
                      setTitleMode("preset");
                      setTitle(e.target.value);
                    }
                  }}
                  className="w-full px-4 py-3 border border-stone-200 rounded-xl text-sm bg-white"
                  aria-label="Title preset"
                >
                  <option value="">{L("-- Chagua Kichwa --", "-- Select Title --")}</option>
                  {(TITLE_TEMPLATES[category] || []).map((t, i) => (
                    <option key={i} value={sw ? t.sw : t.en}>
                      {sw ? t.sw : t.en}
                    </option>
                  ))}
                  <option value="__custom__">
                    {L("✏️ Andika kichwa chako...", "✏️ Write custom title...")}
                  </option>
                </select>
                {titleMode === "custom" && (
                  <input
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder={L("Andika kichwa cha tangazo...", "Type announcement title...")}
                    className="w-full mt-2 px-4 py-3 border border-stone-200 rounded-xl text-sm"
                    autoFocus
                  />
                )}
              </div>

              {/* STEP 3: Message */}
              <div className="sm:col-span-2">
                <label className="block text-xs font-bold text-stone-600 uppercase tracking-wider mb-1.5">
                  3. {L("Ujumbe", "Message")} *
                </label>
                <textarea
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  rows={4}
                  placeholder={L("Maelezo ya tangazo...", "Announcement details...")}
                  className="w-full px-4 py-3 border border-stone-200 rounded-xl text-sm resize-none"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-stone-600 uppercase tracking-wider mb-1.5">
                  {L("Umuhimu", "Priority")}
                </label>
                <select
                  value={priority}
                  onChange={(e) => setPriority(e.target.value)}
                  className="w-full px-4 py-3 border border-stone-200 rounded-xl text-sm bg-white"
                  aria-label="Priority"
                >
                  <option value="normal">{L("Kawaida", "Normal")}</option>
                  <option value="important">{L("Muhimu", "Important")}</option>
                  <option value="urgent">{L("Haraka", "Urgent")}</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-stone-600 uppercase tracking-wider mb-1.5">
                  {L("Kiwango", "Target Level")}
                </label>
                <select
                  value={level}
                  onChange={(e) => {
                    setLevel(e.target.value);
                    setRegion("");
                    setDistrict("");
                    setWard("");
                  }}
                  className="w-full px-4 py-3 border border-stone-200 rounded-xl text-sm bg-white"
                  aria-label="Level"
                >
                  <option value="national">{L("Kitaifa", "National")}</option>
                  <option value="region">{L("Mkoa", "Region")}</option>
                  <option value="district">{L("Wilaya", "District")}</option>
                  <option value="ward">{L("Kata", "Ward")}</option>
                </select>
              </div>

              {/* Cascading location: Region → District → Ward */}
              {level !== "national" && (
                <div>
                  <label className="block text-xs font-bold text-stone-600 uppercase tracking-wider mb-1.5">
                    {L("Mkoa", "Region")} *
                  </label>
                  <select
                    value={region}
                    onChange={(e) => {
                      setRegion(e.target.value);
                      setDistrict("");
                      setWard("");
                    }}
                    className="w-full px-4 py-3 border border-stone-200 rounded-xl text-sm bg-white"
                    aria-label="Region"
                  >
                    <option value="">{L("-- Chagua Mkoa --", "-- Select Region --")}</option>
                    {TANZANIA_ADDRESS_DATA.map((r) => (
                      <option key={r.name} value={r.name}>
                        {r.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {(level === "district" || level === "ward") && region && (
                <div>
                  <label className="block text-xs font-bold text-stone-600 uppercase tracking-wider mb-1.5">
                    {L("Wilaya", "District")} *
                  </label>
                  <select
                    value={district}
                    onChange={(e) => {
                      setDistrict(e.target.value);
                      setWard("");
                    }}
                    className="w-full px-4 py-3 border border-stone-200 rounded-xl text-sm bg-white"
                    aria-label="District"
                  >
                    <option value="">{L("-- Chagua Wilaya --", "-- Select District --")}</option>
                    {(TANZANIA_ADDRESS_DATA.find((r) => r.name === region)?.districts || []).map(
                      (d) => (
                        <option key={d.name} value={d.name}>
                          {d.name}
                        </option>
                      ),
                    )}
                  </select>
                </div>
              )}

              {level === "ward" && region && district && (
                <div>
                  <label className="block text-xs font-bold text-stone-600 uppercase tracking-wider mb-1.5">
                    {L("Kata", "Ward")} *
                  </label>
                  <select
                    value={ward}
                    onChange={(e) => setWard(e.target.value)}
                    className="w-full px-4 py-3 border border-stone-200 rounded-xl text-sm bg-white"
                    aria-label="Ward"
                  >
                    <option value="">{L("-- Chagua Kata --", "-- Select Ward --")}</option>
                    {(
                      TANZANIA_ADDRESS_DATA.find((r) => r.name === region)?.districts.find(
                        (d) => d.name === district,
                      )?.wards || []
                    ).map((w) => (
                      <option key={w} value={w}>
                        {w}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>
            <button
              onClick={handleCreate}
              disabled={submitting || !title.trim() || !body.trim()}
              className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-sm flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {submitting ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <Megaphone size={16} />
              )}
              {L("Chapisha Tangazo", "Publish Announcement")}
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Announcements feed */}
      {loading ? (
        <div className="flex items-center justify-center py-16 text-stone-400">
          <Loader2 size={24} className="animate-spin" />
        </div>
      ) : announcements.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-2xl border border-stone-200">
          <Megaphone size={40} className="mx-auto text-stone-300 mb-3" />
          <p className="font-bold text-stone-600">{L("Hakuna matangazo", "No announcements")}</p>
          <p className="text-sm text-stone-400 mt-1">
            {L(
              "Hakuna matangazo kwa eneo lako kwa sasa",
              "No announcements for your area right now",
            )}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {announcements.map((a) => {
            const ps = PRIORITY_STYLES[a.priority] || PRIORITY_STYLES.normal;
            const isExpanded = expandedId === a.id;
            return (
              <div
                key={a.id}
                className={cn(
                  "rounded-2xl border overflow-hidden transition-colors",
                  ps.bg,
                  ps.border,
                )}
              >
                <div
                  className="flex items-start justify-between p-4 cursor-pointer hover:bg-stone-50/30"
                  onClick={() => setExpandedId(isExpanded ? null : a.id)}
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span
                        className={cn(
                          "px-2 py-0.5 text-[10px] font-bold rounded-md uppercase",
                          ps.badge,
                        )}
                      >
                        {a.priority}
                      </span>
                      <span className="text-xs text-stone-400">{getCatLabel(a.category)}</span>
                      {a.ward && (
                        <span className="text-xs text-stone-400 flex items-center gap-0.5">
                          <MapPin size={10} /> {a.ward}
                        </span>
                      )}
                    </div>
                    <p className="font-bold text-stone-900 text-sm">{a.title}</p>
                    {(() => {
                      const off = getOffice(a);
                      return off ? (
                        <p className="text-xs text-emerald-700 font-bold mt-0.5">
                          {sw ? "Imetolewa na: " : "Issued by: "}
                          {off.office}
                        </p>
                      ) : null;
                    })()}
                    <p className="text-xs text-stone-400 mt-0.5 flex items-center gap-1">
                      <Clock size={10} />
                      {new Date(a.published_at).toLocaleDateString("sw-TZ")}
                      {(() => {
                        const off = getOffice(a);
                        return off?.name ? <span className="ml-1">· {off.name}</span> : null;
                      })()}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0 ml-2">
                    {isStaff && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDelete(a.id);
                        }}
                        className="p-1.5 text-stone-400 hover:text-red-500 transition-colors"
                        aria-label="Delete announcement"
                      >
                        <Trash2 size={14} />
                      </button>
                    )}
                    {isExpanded ? (
                      <ChevronDown size={16} className="text-stone-400" />
                    ) : (
                      <ChevronRight size={16} className="text-stone-400" />
                    )}
                  </div>
                </div>
                <AnimatePresence>
                  {isExpanded && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="border-t border-stone-100 px-4 py-3"
                    >
                      <p className="text-sm text-stone-700 whitespace-pre-wrap">{a.body}</p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </div>
      )}
    </motion.div>
  );
}
