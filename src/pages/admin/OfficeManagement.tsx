/**
 * OfficeManagement.tsx — Office Registry (Phase 2)
 *
 * Full 5-level office hierarchy: Regional → District → Ward → Mtaa + Department.
 * Tabs: Directory (list+filters), Hierarchy (tree), each with create/edit/detail,
 * street mapping, and CSV bulk import.
 */
import React, { useState, useEffect, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Building2,
  Plus,
  Search,
  X,
  Loader2,
  Trash2,
  Edit2,
  MapPin,
  CheckCircle2,
  Upload,
  ChevronRight,
  ChevronDown,
  List,
  Network,
  Hash,
  RotateCcw,
  FileUp,
  AlertTriangle,
  Tag,
} from "lucide-react";
import { useLanguage } from "@/context/LanguageContext";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/context/ToastContext";
import { TANZANIA_ADDRESS_DATA } from "@/lib/addressData";
import { cn } from "@/lib/utils";
import {
  listOffices,
  createOffice,
  updateOffice,
  deactivateOffice,
  reactivateOffice,
  mapStreetsToOffice,
  buildHierarchyTree,
  parseOfficeCSV,
  bulkImportOffices,
  type Office,
  type OfficeType,
  type OfficeNode,
  type BulkImportResult,
} from "@/lib/officeRegistry";

const OFFICE_TYPES: { value: OfficeType; sw: string; en: string; color: string; icon: string }[] = [
  {
    value: "regional",
    sw: "Mkoa",
    en: "Regional",
    color: "bg-purple-100 text-purple-700 border-purple-300",
    icon: "🏛️",
  },
  {
    value: "district",
    sw: "Wilaya",
    en: "District",
    color: "bg-blue-100 text-blue-700 border-blue-300",
    icon: "🏢",
  },
  {
    value: "ward",
    sw: "Kata",
    en: "Ward",
    color: "bg-teal-100 text-teal-700 border-teal-300",
    icon: "🏬",
  },
  {
    value: "mtaa",
    sw: "Mtaa/Kijiji",
    en: "Mtaa/Village",
    color: "bg-emerald-100 text-emerald-700 border-emerald-300",
    icon: "🏠",
  },
  {
    value: "department",
    sw: "Idara",
    en: "Department",
    color: "bg-amber-100 text-amber-700 border-amber-300",
    icon: "🛡️",
  },
];
const typeInfo = (t: string) => OFFICE_TYPES.find((x) => x.value === t) ?? OFFICE_TYPES[0];

const DEPARTMENT_TYPES = [
  "Police",
  "Health",
  "Land",
  "Education",
  "Water",
  "Agriculture",
  "Revenue",
  "Social Welfare",
];

export function OfficeManagement() {
  const { lang } = useLanguage();
  const { user } = useAuth();
  const { showToast } = useToast();
  const sw = lang === "sw";
  const L = (s: string, e: string) => (sw ? s : e);
  const isAdmin = user?.role === "admin";

  const [offices, setOffices] = useState<Office[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<"directory" | "hierarchy">("directory");
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<OfficeType | "all">("all");
  const [regionFilter, setRegionFilter] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Office | null>(null);
  const [detail, setDetail] = useState<Office | null>(null);
  const [mapping, setMapping] = useState<Office | null>(null);
  const [showImport, setShowImport] = useState(false);

  // ── Load ────────────────────────────────────────────────────────────────
  const load = useCallback(async () => {
    setLoading(true);
    try {
      setOffices(await listOffices());
    } catch (e) {
      showToast((e as Error).message || L("Imeshindwa kupakia", "Failed to load"), "error");
    } finally {
      setLoading(false);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    load();
  }, [load]);

  // ── Filter ──────────────────────────────────────────────────────────────
  const filtered = useMemo(() => {
    return offices.filter((o) => {
      const mt = typeFilter === "all" || o.office_type === typeFilter;
      const mr = !regionFilter || o.region === regionFilter;
      const ms =
        !search ||
        o.name.toLowerCase().includes(search.toLowerCase()) ||
        o.office_code.toLowerCase().includes(search.toLowerCase()) ||
        (o.mtaa || "").toLowerCase().includes(search.toLowerCase());
      return mt && mr && ms;
    });
  }, [offices, typeFilter, regionFilter, search]);

  const tree = useMemo(() => buildHierarchyTree(offices), [offices]);

  // ── Actions ─────────────────────────────────────────────────────────────
  const handleDeactivate = async (o: Office) => {
    if (!confirm(L(`Zima ofisi "${o.name}"?`, `Deactivate office "${o.name}"?`))) return;
    try {
      if (o.active) {
        await deactivateOffice(o.id);
      } else {
        await reactivateOffice(o.id);
      }
      showToast(L("Imesasishwa", "Updated"), "success");
      load();
    } catch (e) {
      showToast((e as Error).message, "error");
    }
  };

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-xl font-black text-stone-900 flex items-center gap-2">
            <Building2 size={22} className="text-emerald-600" />
            {L("Sajili ya Ofisi", "Office Registry")}
          </h1>
          <p className="text-xs text-stone-400 mt-0.5">
            {offices.length} {L("ofisi", "offices")} ·{" "}
            {L(
              "Mkoa → Wilaya → Kata → Mtaa + Idara",
              "Regional → District → Ward → Mtaa + Departments",
            )}
          </p>
        </div>
        {isAdmin && (
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowImport(true)}
              className="flex items-center gap-1.5 px-3 h-9 bg-white border border-stone-200 rounded-xl text-sm font-bold text-stone-600 hover:bg-stone-50 transition-all"
            >
              <FileUp size={14} /> {L("Pakia CSV", "Import CSV")}
            </button>
            <button
              onClick={() => {
                setEditing(null);
                setShowForm(true);
              }}
              className="flex items-center gap-1.5 px-4 h-9 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-bold transition-all shadow-md"
            >
              <Plus size={15} /> {L("Ofisi Mpya", "New Office")}
            </button>
          </div>
        )}
      </div>

      {/* View switcher */}
      <div className="flex bg-stone-100 rounded-2xl p-1 gap-1 w-fit">
        <button
          onClick={() => setView("directory")}
          className={cn(
            "flex items-center gap-2 px-4 h-9 rounded-xl text-sm font-bold transition-all",
            view === "directory" ? "bg-white text-stone-900 shadow-sm" : "text-stone-500",
          )}
        >
          <List size={15} /> {L("Orodha", "Directory")}
        </button>
        <button
          onClick={() => setView("hierarchy")}
          className={cn(
            "flex items-center gap-2 px-4 h-9 rounded-xl text-sm font-bold transition-all",
            view === "hierarchy" ? "bg-white text-stone-900 shadow-sm" : "text-stone-500",
          )}
        >
          <Network size={15} /> {L("Muundo", "Hierarchy")}
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 size={28} className="animate-spin text-stone-400" />
        </div>
      ) : view === "directory" ? (
        <>
          {/* Filters */}
          <div className="flex gap-2 flex-wrap">
            <div className="relative flex-1 min-w-48">
              <Search
                size={14}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400"
              />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={L("Tafuta jina au msimbo...", "Search name or code...")}
                className="w-full h-10 pl-9 pr-3 bg-white border border-stone-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value as OfficeType | "all")}
              className="h-10 px-3 bg-white border border-stone-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-emerald-500"
            >
              <option value="all">{L("Aina Zote", "All Types")}</option>
              {OFFICE_TYPES.map((t) => (
                <option key={t.value} value={t.value}>
                  {sw ? t.sw : t.en}
                </option>
              ))}
            </select>
            <select
              value={regionFilter}
              onChange={(e) => setRegionFilter(e.target.value)}
              className="h-10 px-3 bg-white border border-stone-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-emerald-500"
            >
              <option value="">{L("Mikoa Yote", "All Regions")}</option>
              {TANZANIA_ADDRESS_DATA.map((r) => (
                <option key={r.name} value={r.name}>
                  {r.name}
                </option>
              ))}
            </select>
          </div>

          {/* Office list */}
          {filtered.length === 0 ? (
            <div className="bg-white border border-stone-200 rounded-2xl p-12 text-center">
              <Building2 size={32} className="text-stone-300 mx-auto mb-3" />
              <p className="font-bold text-stone-500">{L("Hakuna ofisi", "No offices found")}</p>
            </div>
          ) : (
            <div className="space-y-2">
              {filtered.map((o) => {
                const ti = typeInfo(o.office_type);
                return (
                  <div
                    key={o.id}
                    className={cn(
                      "bg-white border rounded-2xl p-4 flex items-center gap-4 transition-all hover:shadow-sm",
                      o.active ? "border-stone-200" : "border-stone-200 opacity-60",
                    )}
                  >
                    <div className="w-10 h-10 rounded-xl bg-stone-50 flex items-center justify-center text-lg shrink-0">
                      {ti.icon}
                    </div>
                    <button className="flex-1 min-w-0 text-left" onClick={() => setDetail(o)}>
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-black text-stone-900 text-sm truncate">
                          {sw ? o.name_sw || o.name : o.name_en || o.name}
                        </p>
                        <span
                          className={cn(
                            "text-[10px] font-bold px-2 py-0.5 rounded-full border",
                            ti.color,
                          )}
                        >
                          {sw ? ti.sw : ti.en}
                        </span>
                        {!o.active && (
                          <span className="text-[10px] font-bold text-red-500">
                            {L("Imezimwa", "Inactive")}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-3 mt-1 text-[11px] text-stone-400 flex-wrap">
                        <span className="font-mono">{o.office_code}</span>
                        {o.ward && (
                          <span className="flex items-center gap-0.5">
                            <MapPin size={9} />
                            {[o.mtaa, o.ward, o.district].filter(Boolean).join(", ")}
                          </span>
                        )}
                        {o.served_streets && o.served_streets.length > 0 && (
                          <span className="flex items-center gap-0.5">
                            <Tag size={9} />
                            {o.served_streets.length} {L("mitaa", "streets")}
                          </span>
                        )}
                      </div>
                    </button>
                    {isAdmin && (
                      <div className="flex items-center gap-1 shrink-0">
                        {o.office_type === "mtaa" && (
                          <button
                            onClick={() => setMapping(o)}
                            title={L("Ramani ya Mitaa", "Map Streets")}
                            className="w-8 h-8 rounded-lg flex items-center justify-center text-stone-400 hover:bg-emerald-50 hover:text-emerald-600 transition-all"
                          >
                            <Tag size={15} />
                          </button>
                        )}
                        <button
                          onClick={() => {
                            setEditing(o);
                            setShowForm(true);
                          }}
                          title={L("Hariri", "Edit")}
                          className="w-8 h-8 rounded-lg flex items-center justify-center text-stone-400 hover:bg-stone-100 transition-all"
                        >
                          <Edit2 size={14} />
                        </button>
                        <button
                          onClick={() => handleDeactivate(o)}
                          title={o.active ? L("Zima", "Deactivate") : L("Wezesha", "Reactivate")}
                          className={cn(
                            "w-8 h-8 rounded-lg flex items-center justify-center transition-all",
                            o.active
                              ? "text-stone-400 hover:bg-red-50 hover:text-red-600"
                              : "text-emerald-500 hover:bg-emerald-50",
                          )}
                        >
                          {o.active ? <Trash2 size={14} /> : <RotateCcw size={14} />}
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </>
      ) : (
        /* Hierarchy tree */
        <div className="bg-white border border-stone-200 rounded-2xl p-4">
          {tree.length === 0 ? (
            <p className="text-center text-stone-400 py-8 text-sm">
              {L("Hakuna ofisi za kuonyesha", "No offices to display")}
            </p>
          ) : (
            <div className="space-y-1">
              {tree.map((node) => (
                <TreeNode key={node.id} node={node} depth={0} lang={lang} onSelect={setDetail} />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Modals */}
      <AnimatePresence>
        {showForm && (
          <OfficeForm
            office={editing}
            offices={offices}
            lang={lang}
            userId={user?.id}
            onClose={() => setShowForm(false)}
            onSaved={() => {
              setShowForm(false);
              load();
            }}
          />
        )}
        {detail && (
          <OfficeDetail
            office={detail}
            offices={offices}
            lang={lang}
            onClose={() => setDetail(null)}
          />
        )}
        {mapping && (
          <StreetMappingManager
            office={mapping}
            lang={lang}
            onClose={() => setMapping(null)}
            onSaved={() => {
              setMapping(null);
              load();
            }}
          />
        )}
        {showImport && (
          <BulkImportModal
            lang={lang}
            onClose={() => setShowImport(false)}
            onDone={() => {
              setShowImport(false);
              load();
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

// ── Hierarchy tree node ────────────────────────────────────────────────────────
const TreeNode: React.FC<{
  node: OfficeNode;
  depth: number;
  lang: string;
  onSelect: (o: Office) => void;
}> = ({ node, depth, lang, onSelect }) => {
  const [open, setOpen] = useState(depth < 1);
  const sw = lang === "sw";
  const ti = typeInfo(node.office_type);
  const hasChildren = node.children.length > 0;
  return (
    <div>
      <div
        className="flex items-center gap-1.5 py-1.5 rounded-lg hover:bg-stone-50 transition-all"
        style={{ paddingLeft: depth * 20 }}
      >
        {hasChildren ? (
          <button
            onClick={() => setOpen(!open)}
            className="w-5 h-5 flex items-center justify-center text-stone-400"
          >
            {open ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
          </button>
        ) : (
          <span className="w-5" />
        )}
        <span className="text-sm">{ti.icon}</span>
        <button
          onClick={() => onSelect(node)}
          className="flex items-center gap-2 flex-1 text-left min-w-0"
        >
          <span className="font-bold text-stone-800 text-sm truncate">
            {sw ? node.name_sw || node.name : node.name_en || node.name}
          </span>
          <span className="text-[10px] text-stone-400 font-mono shrink-0">{node.office_code}</span>
          {hasChildren && (
            <span className="text-[10px] text-stone-400">({node.children.length})</span>
          )}
        </button>
      </div>
      {open && hasChildren && (
        <div>
          {node.children.map((c) => (
            <TreeNode key={c.id} node={c} depth={depth + 1} lang={lang} onSelect={onSelect} />
          ))}
        </div>
      )}
    </div>
  );
};

// ── Office create / edit form ────────────────────────────────────────────────────
const OfficeForm: React.FC<{
  office: Office | null;
  offices: Office[];
  lang: string;
  userId?: string;
  onClose: () => void;
  onSaved: () => void;
}> = ({ office, offices, lang, userId, onClose, onSaved }) => {
  const { showToast } = useToast();
  const sw = lang === "sw";
  const L = (s: string, e: string) => (sw ? s : e);
  const [saving, setSaving] = useState(false);

  const [f, setF] = useState({
    name: office?.name ?? "",
    name_sw: office?.name_sw ?? "",
    name_en: office?.name_en ?? "",
    office_type: (office?.office_type ?? "mtaa") as OfficeType,
    region: office?.region ?? "",
    district: office?.district ?? "",
    ward: office?.ward ?? "",
    mtaa: office?.mtaa ?? "",
    department_type: office?.department_type ?? "",
    parent_id: office?.parent_id ?? "",
    phone: office?.phone ?? "",
    email: office?.email ?? "",
    address: office?.address ?? "",
    head_officer_name: office?.head_officer_name ?? "",
  });
  const set = (k: keyof typeof f, v: string) => setF((p) => ({ ...p, [k]: v }));

  const districts = useMemo(
    () => TANZANIA_ADDRESS_DATA.find((r) => r.name === f.region)?.districts ?? [],
    [f.region],
  );
  const wards = useMemo(
    () => districts.find((d) => d.name === f.district)?.wards ?? [],
    [districts, f.district],
  );

  // Potential parents = offices one level up
  const parents = useMemo(() => {
    const order: OfficeType[] = ["regional", "district", "ward", "mtaa"];
    const idx = order.indexOf(f.office_type);
    if (f.office_type === "department")
      return offices.filter((o) => o.office_type === "ward" || o.office_type === "district");
    if (idx <= 0) return [];
    return offices.filter((o) => o.office_type === order[idx - 1]);
  }, [offices, f.office_type]);

  const needs = {
    district: ["district", "ward", "mtaa", "department"].includes(f.office_type),
    ward: ["ward", "mtaa", "department"].includes(f.office_type),
    mtaa: f.office_type === "mtaa",
    dept: f.office_type === "department",
  };

  const submit = async () => {
    if (!f.name.trim()) {
      showToast(L("Jina linahitajika", "Name required"), "error");
      return;
    }
    if (!f.region) {
      showToast(L("Mkoa unahitajika", "Region required"), "error");
      return;
    }
    setSaving(true);
    try {
      const payload = {
        name: f.name.trim(),
        name_sw: f.name_sw.trim() || f.name.trim(),
        name_en: f.name_en.trim() || f.name.trim(),
        office_type: f.office_type,
        region: f.region || null,
        district: needs.district ? f.district || null : null,
        ward: needs.ward ? f.ward || null : null,
        mtaa: needs.mtaa ? f.mtaa || null : null,
        department_type: needs.dept ? f.department_type || null : null,
        parent_id: f.parent_id || null,
        phone: f.phone.trim() || null,
        email: f.email.trim() || null,
        address: f.address.trim() || null,
        head_officer_name: f.head_officer_name.trim() || null,
        created_by: userId || null,
      };
      if (office) await updateOffice(office.id, payload);
      else await createOffice(payload);
      showToast(L("Ofisi imehifadhiwa", "Office saved"), "success");
      onSaved();
    } catch (e) {
      showToast((e as Error).message, "error");
    } finally {
      setSaving(false);
    }
  };

  return (
    <ModalShell
      onClose={onClose}
      title={office ? L("Hariri Ofisi", "Edit Office") : L("Ofisi Mpya", "New Office")}
    >
      <div className="space-y-4">
        {/* Office type */}
        <Field label={L("Aina ya Ofisi", "Office Type")} required>
          <div className="grid grid-cols-5 gap-1.5">
            {OFFICE_TYPES.map((t) => (
              <button
                key={t.value}
                type="button"
                onClick={() => set("office_type", t.value)}
                className={cn(
                  "flex flex-col items-center gap-1 py-2 rounded-xl border-2 transition-all text-[10px] font-bold",
                  f.office_type === t.value
                    ? "border-emerald-500 bg-emerald-50 text-emerald-700"
                    : "border-stone-200 text-stone-500 hover:border-stone-300",
                )}
              >
                <span className="text-base">{t.icon}</span>
                {sw ? t.sw : t.en}
              </button>
            ))}
          </div>
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <Field label={L("Jina (Kiswahili)", "Name (Swahili)")} required>
            <Input
              value={f.name_sw || f.name}
              onChange={(e) => {
                set("name_sw", e.target.value);
                set("name", e.target.value);
              }}
              placeholder="Ofisi ya Mtaa wa..."
            />
          </Field>
          <Field label={L("Jina (Kiingereza)", "Name (English)")}>
            <Input
              value={f.name_en}
              onChange={(e) => set("name_en", e.target.value)}
              placeholder="...Office"
            />
          </Field>
        </div>

        {/* Location cascade */}
        <div className="grid grid-cols-2 gap-3">
          <Field label={L("Mkoa", "Region")} required>
            <Select
              value={f.region}
              onChange={(e) => {
                set("region", e.target.value);
                set("district", "");
                set("ward", "");
              }}
            >
              <option value="">{L("Chagua", "Select")}</option>
              {TANZANIA_ADDRESS_DATA.map((r) => (
                <option key={r.name} value={r.name}>
                  {r.name}
                </option>
              ))}
            </Select>
          </Field>
          {needs.district && (
            <Field label={L("Wilaya", "District")}>
              <Select
                value={f.district}
                onChange={(e) => {
                  set("district", e.target.value);
                  set("ward", "");
                }}
                disabled={!f.region}
              >
                <option value="">{L("Chagua", "Select")}</option>
                {districts.map((d) => (
                  <option key={d.name} value={d.name}>
                    {d.name}
                  </option>
                ))}
              </Select>
            </Field>
          )}
          {needs.ward && (
            <Field label={L("Kata", "Ward")}>
              <Select
                value={f.ward}
                onChange={(e) => set("ward", e.target.value)}
                disabled={!f.district}
              >
                <option value="">{L("Chagua", "Select")}</option>
                {wards.map((w) => (
                  <option key={w} value={w}>
                    {w}
                  </option>
                ))}
              </Select>
            </Field>
          )}
          {needs.mtaa && (
            <Field label={L("Jina la Mtaa/Kijiji", "Mtaa/Village Name")}>
              <Input
                value={f.mtaa}
                onChange={(e) => set("mtaa", e.target.value)}
                placeholder="Mchikichini"
              />
            </Field>
          )}
          {needs.dept && (
            <Field label={L("Aina ya Idara", "Department Type")}>
              <Select
                value={f.department_type}
                onChange={(e) => set("department_type", e.target.value)}
              >
                <option value="">{L("Chagua", "Select")}</option>
                {DEPARTMENT_TYPES.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </Select>
            </Field>
          )}
        </div>

        {/* Parent */}
        {parents.length > 0 && (
          <Field label={L("Ofisi Mzazi (muundo)", "Parent Office (hierarchy)")}>
            <Select value={f.parent_id} onChange={(e) => set("parent_id", e.target.value)}>
              <option value="">{L("Hakuna / Juu kabisa", "None / Top level")}</option>
              {parents.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} ({p.office_code})
                </option>
              ))}
            </Select>
          </Field>
        )}

        {/* Contact */}
        <div className="grid grid-cols-2 gap-3">
          <Field label={L("Simu", "Phone")}>
            <Input
              value={f.phone}
              onChange={(e) => set("phone", e.target.value)}
              placeholder="+255..."
            />
          </Field>
          <Field label={L("Barua pepe", "Email")}>
            <Input
              value={f.email}
              onChange={(e) => set("email", e.target.value)}
              placeholder="office@..."
            />
          </Field>
        </div>
        <Field label={L("Anuani", "Address")}>
          <Input value={f.address} onChange={(e) => set("address", e.target.value)} />
        </Field>
        <Field label={L("Mkuu wa Ofisi", "Head Officer")}>
          <Input
            value={f.head_officer_name}
            onChange={(e) => set("head_officer_name", e.target.value)}
          />
        </Field>

        {!office && (
          <p className="text-[11px] text-stone-400 flex items-center gap-1.5">
            <Hash size={11} />{" "}
            {L("Msimbo wa ofisi utatengenezwa moja kwa moja", "Office code will be auto-generated")}
          </p>
        )}

        <div className="flex gap-3 pt-2">
          <button
            onClick={onClose}
            className="flex-1 h-11 border border-stone-200 rounded-xl font-bold text-sm text-stone-600 hover:bg-stone-50"
          >
            {L("Ghairi", "Cancel")}
          </button>
          <button
            onClick={submit}
            disabled={saving}
            className="flex-[2] h-11 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-xl font-bold text-sm flex items-center justify-center gap-2"
          >
            {saving ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle2 size={15} />}
            {L("Hifadhi", "Save Office")}
          </button>
        </div>
      </div>
    </ModalShell>
  );
};

// ── Office detail ──────────────────────────────────────────────────────────────
const OfficeDetail: React.FC<{
  office: Office;
  offices: Office[];
  lang: string;
  onClose: () => void;
}> = ({ office, offices, lang, onClose }) => {
  const sw = lang === "sw";
  const L = (s: string, e: string) => (sw ? s : e);
  const ti = typeInfo(office.office_type);
  const parent = offices.find((o) => o.id === office.parent_id);
  const children = offices.filter((o) => o.parent_id === office.id);

  const Row = ({ label, value }: { label: string; value?: string | null }) =>
    value ? (
      <div className="flex justify-between py-2 border-b border-stone-100 text-sm">
        <span className="text-stone-500">{label}</span>
        <span className="font-bold text-stone-800 text-right">{value}</span>
      </div>
    ) : null;

  return (
    <ModalShell
      onClose={onClose}
      title={sw ? office.name_sw || office.name : office.name_en || office.name}
    >
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-14 h-14 rounded-2xl bg-stone-50 flex items-center justify-center text-2xl">
            {ti.icon}
          </div>
          <div>
            <span className={cn("text-[11px] font-bold px-2 py-0.5 rounded-full border", ti.color)}>
              {sw ? ti.sw : ti.en}
            </span>
            <p className="font-mono text-xs text-stone-500 mt-1">{office.office_code}</p>
          </div>
        </div>

        <div className="bg-stone-50 rounded-xl p-3">
          <Row label={L("Mkoa", "Region")} value={office.region} />
          <Row label={L("Wilaya", "District")} value={office.district} />
          <Row label={L("Kata", "Ward")} value={office.ward} />
          <Row label={L("Mtaa/Kijiji", "Mtaa/Village")} value={office.mtaa} />
          <Row label={L("Idara", "Department")} value={office.department_type} />
          <Row label={L("Mkuu wa Ofisi", "Head Officer")} value={office.head_officer_name} />
          <Row label={L("Simu", "Phone")} value={office.phone} />
          <Row label={L("Barua pepe", "Email")} value={office.email} />
          <Row label={L("Anuani", "Address")} value={office.address} />
          {parent && (
            <Row
              label={L("Ofisi Mzazi", "Parent Office")}
              value={`${parent.name} (${parent.office_code})`}
            />
          )}
        </div>

        {office.served_streets && office.served_streets.length > 0 && (
          <div>
            <p className="text-xs font-black text-stone-500 uppercase tracking-widest mb-2">
              {L("Mitaa Inayohudumiwa", "Streets Served")}
            </p>
            <div className="flex flex-wrap gap-1.5">
              {office.served_streets.map((s) => (
                <span
                  key={s}
                  className="px-2 py-1 bg-emerald-50 text-emerald-700 rounded-lg text-xs font-medium"
                >
                  {s}
                </span>
              ))}
            </div>
          </div>
        )}

        {children.length > 0 && (
          <div>
            <p className="text-xs font-black text-stone-500 uppercase tracking-widest mb-2">
              {L("Ofisi Chini Yake", "Child Offices")} ({children.length})
            </p>
            <div className="space-y-1.5">
              {children.map((c) => (
                <div
                  key={c.id}
                  className="flex items-center gap-2 text-sm bg-white border border-stone-200 rounded-lg px-3 py-2"
                >
                  <span>{typeInfo(c.office_type).icon}</span>
                  <span className="font-bold text-stone-700">{c.name}</span>
                  <span className="text-[10px] text-stone-400 font-mono ml-auto">
                    {c.office_code}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </ModalShell>
  );
};

// ── Street mapping manager ───────────────────────────────────────────────────────
const StreetMappingManager: React.FC<{
  office: Office;
  lang: string;
  onClose: () => void;
  onSaved: () => void;
}> = ({ office, lang, onClose, onSaved }) => {
  const { showToast } = useToast();
  const sw = lang === "sw";
  const L = (s: string, e: string) => (sw ? s : e);
  const [streets, setStreets] = useState<string[]>(office.served_streets ?? []);
  const [input, setInput] = useState("");
  const [saving, setSaving] = useState(false);

  // Suggest streets from the ward (addressData has wards but not streets, so free text)
  const add = () => {
    const v = input.trim();
    if (v && !streets.includes(v)) {
      setStreets([...streets, v]);
      setInput("");
    }
  };
  const remove = (s: string) => setStreets(streets.filter((x) => x !== s));

  const save = async () => {
    setSaving(true);
    try {
      await mapStreetsToOffice(office.id, streets);
      showToast(L("Mitaa imehifadhiwa", "Streets mapped"), "success");
      onSaved();
    } catch (e) {
      showToast((e as Error).message, "error");
    } finally {
      setSaving(false);
    }
  };

  return (
    <ModalShell onClose={onClose} title={L("Ramani ya Mitaa", "Map Streets")}>
      <div className="space-y-4">
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3">
          <p className="text-sm font-bold text-emerald-800">{office.name}</p>
          <p className="text-xs text-emerald-600 mt-0.5">
            {[office.ward, office.district, office.region].filter(Boolean).join(", ")}
          </p>
        </div>
        <p className="text-xs text-stone-500">
          {L(
            "Ongeza mitaa inayohudumiwa na ofisi hii. Wananchi wa mitaa hii watapangiwa ofisi hii moja kwa moja.",
            "Add streets served by this office. Citizens in these streets are auto-assigned to this office.",
          )}
        </p>
        <div className="flex gap-2">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), add())}
            placeholder={L("Andika jina la mtaa...", "Type a street name...")}
          />
          <button
            onClick={add}
            className="px-4 bg-stone-900 hover:bg-black text-white rounded-xl font-bold text-sm shrink-0"
          >
            {L("Ongeza", "Add")}
          </button>
        </div>
        <div className="flex flex-wrap gap-2 min-h-12">
          {streets.length === 0 ? (
            <p className="text-sm text-stone-400 italic">
              {L("Hakuna mitaa bado", "No streets added yet")}
            </p>
          ) : (
            streets.map((s) => (
              <span
                key={s}
                className="flex items-center gap-1.5 px-2.5 py-1.5 bg-emerald-100 text-emerald-700 rounded-lg text-xs font-bold"
              >
                {s}
                <button onClick={() => remove(s)} className="hover:text-emerald-900">
                  <X size={12} />
                </button>
              </span>
            ))
          )}
        </div>
        <div className="flex gap-3 pt-2">
          <button
            onClick={onClose}
            className="flex-1 h-11 border border-stone-200 rounded-xl font-bold text-sm text-stone-600 hover:bg-stone-50"
          >
            {L("Ghairi", "Cancel")}
          </button>
          <button
            onClick={save}
            disabled={saving}
            className="flex-[2] h-11 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-xl font-bold text-sm flex items-center justify-center gap-2"
          >
            {saving ? <Loader2 size={16} className="animate-spin" /> : <Tag size={15} />}
            {L("Hifadhi Mitaa", "Save Streets")}
          </button>
        </div>
      </div>
    </ModalShell>
  );
};

// ── Bulk CSV import ──────────────────────────────────────────────────────────────
const BulkImportModal: React.FC<{ lang: string; onClose: () => void; onDone: () => void }> = ({
  lang,
  onClose,
  onDone,
}) => {
  const { showToast } = useToast();
  const sw = lang === "sw";
  const L = (s: string, e: string) => (sw ? s : e);
  const [rows, setRows] = useState<ReturnType<typeof parseOfficeCSV>>([]);
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<BulkImportResult | null>(null);

  const handleFile = async (file: File) => {
    const text = await file.text();
    setRows(parseOfficeCSV(text));
    setResult(null);
  };

  const doImport = async () => {
    setImporting(true);
    try {
      const r = await bulkImportOffices(rows);
      setResult(r);
      showToast(
        L(
          `Zimeingizwa ${r.inserted}, zimeshindwa ${r.failed}`,
          `${r.inserted} imported, ${r.failed} failed`,
        ),
        r.failed ? "info" : "success",
      );
      if (r.failed === 0) setTimeout(onDone, 1200);
    } catch (e) {
      showToast((e as Error).message, "error");
    } finally {
      setImporting(false);
    }
  };

  return (
    <ModalShell onClose={onClose} title={L("Pakia Ofisi (CSV)", "Bulk Import Offices (CSV)")}>
      <div className="space-y-4">
        <div className="bg-stone-50 border border-stone-200 rounded-xl p-3 text-xs text-stone-600">
          <p className="font-bold mb-1">{L("Safu za CSV:", "CSV columns:")}</p>
          <code className="text-[10px] text-stone-500">
            office_type,name,name_sw,region,district,ward,mtaa,department_type,phone,email,address
          </code>
          <p className="mt-2 text-stone-400">
            {L(
              "office_type: regional | district | ward | mtaa | department",
              "office_type: regional | district | ward | mtaa | department",
            )}
          </p>
        </div>

        <label className="block border-2 border-dashed border-stone-300 rounded-xl p-8 text-center cursor-pointer hover:border-emerald-400 transition-all">
          <Upload size={28} className="text-stone-400 mx-auto mb-2" />
          <p className="text-sm font-bold text-stone-600">
            {L("Bofya kuchagua faili la CSV", "Click to choose a CSV file")}
          </p>
          <input
            type="file"
            accept=".csv,text/csv"
            className="hidden"
            onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
          />
        </label>

        {rows.length > 0 && !result && (
          <div>
            <p className="text-sm font-bold text-stone-700 mb-2">
              {L("Hakiki", "Preview")} ({rows.length} {L("safu", "rows")})
            </p>
            <div className="max-h-40 overflow-y-auto border border-stone-200 rounded-xl divide-y divide-stone-100">
              {rows.slice(0, 20).map((r, i) => (
                <div key={i} className="px-3 py-2 text-xs flex items-center gap-2">
                  <span>{typeInfo(r.office_type).icon}</span>
                  <span className="font-bold text-stone-700">{r.name}</span>
                  <span className="text-stone-400">
                    {[r.mtaa, r.ward, r.district, r.region].filter(Boolean).join(", ")}
                  </span>
                </div>
              ))}
            </div>
            <button
              onClick={doImport}
              disabled={importing}
              className="w-full mt-3 h-11 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-xl font-bold text-sm flex items-center justify-center gap-2"
            >
              {importing ? <Loader2 size={16} className="animate-spin" /> : <FileUp size={15} />}
              {L("Ingiza Ofisi", "Import Offices")} ({rows.length})
            </button>
          </div>
        )}

        {result && (
          <div className="space-y-2">
            <div className="flex gap-2">
              <div className="flex-1 bg-emerald-50 border border-emerald-200 rounded-xl p-3 text-center">
                <p className="text-2xl font-black text-emerald-700">{result.inserted}</p>
                <p className="text-xs text-emerald-600 font-bold">{L("Zimeingizwa", "Imported")}</p>
              </div>
              <div className="flex-1 bg-red-50 border border-red-200 rounded-xl p-3 text-center">
                <p className="text-2xl font-black text-red-600">{result.failed}</p>
                <p className="text-xs text-red-500 font-bold">{L("Zimeshindwa", "Failed")}</p>
              </div>
            </div>
            {result.errors.length > 0 && (
              <div className="max-h-32 overflow-y-auto bg-red-50 rounded-xl p-2 text-xs space-y-1">
                {result.errors.map((e, i) => (
                  <p key={i} className="text-red-600">
                    <AlertTriangle size={10} className="inline mr-1" />
                    {L("Safu", "Row")} {e.row}: {e.reason}
                  </p>
                ))}
              </div>
            )}
            <button
              onClick={onDone}
              className="w-full h-11 bg-stone-900 text-white rounded-xl font-bold text-sm"
            >
              {L("Funga", "Done")}
            </button>
          </div>
        )}
      </div>
    </ModalShell>
  );
};

// ── Shared primitives ─────────────────────────────────────────────────────────────
const ModalShell: React.FC<{ title: string; onClose: () => void; children: React.ReactNode }> = ({
  title,
  onClose,
  children,
}) => (
  <>
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
      className="fixed inset-0 z-[150] bg-stone-900/60 backdrop-blur-sm"
    />
    <motion.div
      initial={{ opacity: 0, scale: 0.97, y: 12 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.97 }}
      className="fixed inset-0 z-[151] flex items-center justify-center p-0 sm:p-4 pointer-events-none"
    >
      <div
        className="pointer-events-auto w-full h-full sm:h-auto sm:max-w-lg bg-white sm:rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-screen sm:max-h-[92vh]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-5 py-4 border-b border-stone-100 flex items-center justify-between shrink-0">
          <h2 className="font-black text-stone-900">{title}</h2>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-stone-100 rounded-full text-stone-400"
          >
            <X size={18} />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-5">{children}</div>
      </div>
    </motion.div>
  </>
);

const Field: React.FC<{ label: string; required?: boolean; children: React.ReactNode }> = ({
  label,
  required,
  children,
}) => (
  <div>
    <label className="block text-[11px] font-black text-stone-500 uppercase tracking-widest mb-1.5">
      {label}
      {required && <span className="text-red-400 ml-0.5">*</span>}
    </label>
    {children}
  </div>
);
const Input: React.FC<React.InputHTMLAttributes<HTMLInputElement>> = (p) => (
  <input
    {...p}
    className="w-full h-10 px-3 bg-stone-50 border border-stone-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white"
  />
);
const Select: React.FC<React.SelectHTMLAttributes<HTMLSelectElement>> = (p) => (
  <select
    {...p}
    className="w-full h-10 px-3 bg-stone-50 border border-stone-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-emerald-500 disabled:opacity-50"
  />
);

export default OfficeManagement;
