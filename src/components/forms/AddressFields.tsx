/**
 * AddressFields — Shared cascading Region → District → Ward selector
 *
 * Features:
 *  - Auto-fills from the logged-in user's profile on mount
 *  - Cascading: selecting Region clears District; selecting District clears Ward
 *  - Full TANZANIA_ADDRESS_DATA dropdown (30 regions, 184 districts, 3900+ wards)
 *  - Bilingual labels (Swahili / English)
 *  - Optional street/village text input
 *  - Optional "venue" mode (labels become Venue Region / Venue District / Venue Ward)
 *  - Error display per field
 *
 * Usage:
 *   <AddressFields
 *     lang="sw"
 *     region={vals.region}       district={vals.district}       ward={vals.ward}
 *     onRegion={(v) => set("region", v)}
 *     onDistrict={(v) => set("district", v)}
 *     onWard={(v) => set("ward", v)}
 *     errors={errors}
 *     autofillFrom={user}         // pass UserProfile to auto-fill on mount
 *   />
 */

import React, { useMemo, useEffect, useRef } from "react";
import { TANZANIA_ADDRESS_DATA } from "@/lib/addressData";
import type { UserProfile } from "@/lib/supabase";
import { MapPin } from "lucide-react";

export interface AddressFieldsProps {
  lang: "sw" | "en";
  region: string;
  district: string;
  ward: string;
  street?: string;
  onRegion: (v: string) => void;
  onDistrict: (v: string) => void;
  onWard: (v: string) => void;
  onStreet?: (v: string) => void;
  errors?: Record<string, string>;
  clearError?: (field: string) => void;

  /** Auto-fill from user profile on first render (only if fields are empty) */
  autofillFrom?: Partial<UserProfile> | null;

  /** Field name prefixes (default: "region", "district", "ward", "street") */
  fieldPrefix?: string;

  /** Show venue-style labels: "Venue Region" instead of "Region" */
  venueMode?: boolean;

  /** Make region/district/ward optional (no asterisk) */
  optional?: boolean;

  /** Show/hide street input */
  showStreet?: boolean;

  /** Extra class on the wrapper */
  className?: string;
}

const cls = (err?: string) =>
  [
    "w-full h-11 px-3 rounded-xl border text-sm outline-none transition-all",
    err
      ? "border-red-400 bg-red-50 focus:ring-2 focus:ring-red-300"
      : "border-stone-200 bg-white focus:ring-2 focus:ring-emerald-500 focus:border-transparent",
  ].join(" ");

export const AddressFields: React.FC<AddressFieldsProps> = ({
  lang,
  region,
  district,
  ward,
  street = "",
  onRegion,
  onDistrict,
  onWard,
  onStreet,
  errors = {},
  clearError,
  autofillFrom,
  fieldPrefix = "",
  venueMode = false,
  optional = false,
  showStreet = false,
  className = "",
}) => {
  const sw = lang === "sw";
  const L = (s: string, e: string) => (sw ? s : e);
  const didAutofill = useRef(false);
  const pfx = (n: string) => (fieldPrefix ? `${fieldPrefix}_${n}` : n);

  // ── Autofill from user profile once ───────────────────────────────────────
  useEffect(() => {
    if (didAutofill.current || !autofillFrom) return;
    if (!region && autofillFrom.region) {
      onRegion(autofillFrom.region);
    }
    if (!district && autofillFrom.district) {
      onDistrict(autofillFrom.district);
    }
    if (!ward && autofillFrom.ward) {
      onWard(autofillFrom.ward);
    }
    if (!street && autofillFrom.street && onStreet) {
      onStreet(autofillFrom.street);
    }
    didAutofill.current = true;
  }, [autofillFrom?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Cascading options ─────────────────────────────────────────────────────
  const regions = useMemo(() => TANZANIA_ADDRESS_DATA.map((r) => r.name), []);

  const districts = useMemo(
    () =>
      region
        ? (TANZANIA_ADDRESS_DATA.find((r) => r.name === region)?.districts.map((d) => d.name) ?? [])
        : [],
    [region],
  );

  const wards = useMemo(
    () =>
      region && district
        ? (TANZANIA_ADDRESS_DATA.find((r) => r.name === region)?.districts.find(
            (d) => d.name === district,
          )?.wards ?? [])
        : [],
    [region, district],
  );

  const required = !optional;
  const vLabel = venueMode ? L("ya Tukio", "of Venue") : "";

  return (
    <div className={`space-y-3 ${className}`}>
      {/* Section header */}
      <div className="flex items-center gap-2 pt-1">
        <MapPin size={13} className="text-emerald-600" />
        <span className="text-[11px] font-black uppercase tracking-widest text-stone-400">
          {venueMode ? L("Eneo la Tukio", "Venue Location") : L("Anwani", "Address")}
        </span>
      </div>

      {/* Region */}
      <div>
        <label className="block text-xs font-semibold text-stone-600 mb-1.5">
          {L("Mkoa", "Region")} {vLabel}
          {required && <span className="text-red-500 ml-0.5">*</span>}
        </label>
        <select
          value={region}
          onChange={(e) => {
            onRegion(e.target.value);
            onDistrict("");
            onWard("");
            clearError?.(pfx("region"));
          }}
          className={cls(errors[pfx("region")])}
        >
          <option value="">{L("— Chagua Mkoa —", "— Select Region —")}</option>
          {regions.map((r) => (
            <option key={r} value={r}>
              {r}
            </option>
          ))}
        </select>
        {errors[pfx("region")] && (
          <p className="text-xs text-red-500 mt-1">{errors[pfx("region")]}</p>
        )}
      </div>

      {/* District */}
      <div>
        <label className="block text-xs font-semibold text-stone-600 mb-1.5">
          {L("Wilaya", "District")} {vLabel}
          {required && <span className="text-red-500 ml-0.5">*</span>}
        </label>
        <select
          value={district}
          disabled={!region}
          onChange={(e) => {
            onDistrict(e.target.value);
            onWard("");
            clearError?.(pfx("district"));
          }}
          className={cls(errors[pfx("district")])}
        >
          <option value="">
            {!region
              ? L("Chagua mkoa kwanza", "Select region first")
              : L("— Chagua Wilaya —", "— Select District —")}
          </option>
          {districts.map((d) => (
            <option key={d} value={d}>
              {d}
            </option>
          ))}
        </select>
        {errors[pfx("district")] && (
          <p className="text-xs text-red-500 mt-1">{errors[pfx("district")]}</p>
        )}
      </div>

      {/* Ward */}
      <div>
        <label className="block text-xs font-semibold text-stone-600 mb-1.5">
          {L("Kata", "Ward")} {vLabel}
          {required && <span className="text-red-500 ml-0.5">*</span>}
        </label>
        <select
          value={ward}
          disabled={!district}
          onChange={(e) => {
            onWard(e.target.value);
            clearError?.(pfx("ward"));
          }}
          className={cls(errors[pfx("ward")])}
        >
          <option value="">
            {!district
              ? L("Chagua wilaya kwanza", "Select district first")
              : L("— Chagua Kata —", "— Select Ward —")}
          </option>
          {wards.map((w) => (
            <option key={w} value={w}>
              {w}
            </option>
          ))}
        </select>
        {errors[pfx("ward")] && <p className="text-xs text-red-500 mt-1">{errors[pfx("ward")]}</p>}
      </div>

      {/* Street (optional) */}
      {showStreet && onStreet && (
        <div>
          <label className="block text-xs font-semibold text-stone-600 mb-1.5">
            {L("Mtaa / Kijiji", "Street / Village")}
          </label>
          <input
            type="text"
            value={street}
            onChange={(e) => onStreet(e.target.value)}
            placeholder={L("Mfano: Mtaa wa Uhuru", "E.g. Uhuru Street")}
            className={cls(errors[pfx("street")])}
          />
        </div>
      )}

      {/* Autofill indicator */}
      {autofillFrom?.region && region === autofillFrom.region && (
        <p className="text-[10px] text-emerald-600 flex items-center gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block" />
          {L("Imejazwa kutoka kwenye wasifu wako", "Auto-filled from your profile")}
        </p>
      )}
    </div>
  );
};
