import React, { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { useLanguage } from "@/context/LanguageContext";
import { supabase } from "@/lib/supabase";

type GuestRecord = {
  id: string;
  reference_number: string;
  guest_type: string;
  guest_name: string;
  nationality: string;
  phone: string;
  identity_type: string;
  identity_number: string;
  origin: string;
  purpose: string;
  arrival_date: string;
  departure_date: string | null;
  premises: string;
  host_name: string;
  host_phone: string;
  region: string;
  district: string;
  ward: string;
  street: string;
  created_at: string;
};
const types = [
  ["family", "Ndugu", "Family"],
  ["friend", "Rafiki", "Friend"],
  ["business", "Kikazi", "Business visitor"],
  ["other", "Mwingine", "Other"],
];
const inputClass = "w-full rounded-xl border border-stone-200 bg-white p-3 text-sm";

export function IntroduceGuest({
  onBack,
  register = false,
}: {
  onBack: () => void;
  register?: boolean;
}) {
  const { user } = useAuth();
  const { lang } = useLanguage();
  const L = (sw: string, en: string) => (lang === "sw" ? sw : en);
  const [records, setRecords] = useState<GuestRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [reference, setReference] = useState("");
  const [search, setSearch] = useState("");
  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    let query = supabase
      .from("guest_introductions")
      .select("*")
      .order("created_at", { ascending: false });
    if (!register) query = query.eq("citizen_id", user.id);
    const { data, error: failure } = await query;
    if (failure)
      setError(
        lang === "sw"
          ? "Rejesta haipatikani. Jaribu tena au wasiliana na ofisi."
          : "Guest register unavailable. Retry or contact the office.",
      );
    else {
      setRecords(data || []);
      setError("");
    }
    setLoading(false);
  }, [user?.id, register, lang]);
  useEffect(() => {
    void load();
  }, [load]);
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!user || saving) return;
    const form = event.currentTarget;
    const values = Object.fromEntries(new FormData(form).entries());
    const arrival = String(values.arrival_date);
    const departure = String(values.departure_date);
    if (departure && departure < arrival) {
      setError(
        L(
          "Tarehe ya kuondoka haiwezi kuwa kabla ya kuwasili.",
          "Departure cannot be before arrival.",
        ),
      );
      return;
    }
    setSaving(true);
    setError("");
    setReference("");
    try {
      const { data, error: failure } = await supabase
        .from("guest_introductions")
        .insert({
          ...values,
          departure_date: departure || null,
          citizen_id: user.id,
          host_name: `${user.first_name} ${user.last_name}`,
          host_phone: user.phone || "",
        })
        .select("reference_number")
        .single();
      if (failure) throw failure;
      setReference(data.reference_number);
      form.reset();
      await load();
    } catch {
      setError(
        L(
          "Taarifa hazijahifadhiwa. Jaribu tena au wasiliana na ofisi.",
          "Record was not saved. Retry or contact the office.",
        ),
      );
    } finally {
      setSaving(false);
    }
  }
  const fields = [
    ["guest_name", "Jina kamili la mgeni", "Guest full name", "text", true],
    ["nationality", "Uraia", "Nationality", "text", true],
    ["phone", "Simu ya mgeni (hiari)", "Guest phone (optional)", "tel", false],
    [
      "identity_number",
      "Namba ya kitambulisho (hiari)",
      "Identity number (optional)",
      "text",
      false,
    ],
    ["origin", "Anakotoka", "Usual residence / coming from", "text", true],
    ["purpose", "Sababu ya ziara", "Purpose of visit", "text", true],
    ["arrival_date", "Tarehe ya kuwasili", "Arrival date", "date", true],
    [
      "departure_date",
      "Tarehe ya kuondoka (hiari)",
      "Expected departure (optional)",
      "date",
      false,
    ],
    ["premises", "Namba ya nyumba / anuani", "House number / premises address", "text", true],
    ["region", "Mkoa", "Region", "text", true],
    ["district", "Wilaya", "District", "text", true],
    ["ward", "Kata", "Ward", "text", true],
    ["street", "Mtaa / kijiji", "Street / village", "text", true],
  ] as const;
  return (
    <div className="space-y-5">
      <button type="button" onClick={onBack} className="font-bold text-emerald-700">
        ← {L("Rudi", "Back")}
      </button>
      <h2 className="text-2xl font-black">
        {register
          ? L("Rejesta ya Wageni", "Guest Register")
          : L("Tambulisha Mgeni", "Introduce Guest")}
      </h2>
      <p className="rounded-xl bg-emerald-50 p-4 text-sm text-emerald-900">
        {L(
          "Huduma ya bure. Taarifa zinahifadhiwa kwa kumbukumbu za serikali ya mtaa. Hakuna idhini inayohitajika.",
          "Free service. Information is filed for local government reference. No approval is required.",
        )}
      </p>
      {error && (
        <div role="alert" className="rounded-xl bg-red-50 p-4 text-red-700">
          {error}{" "}
          <button type="button" onClick={() => void load()} className="underline">
            {L("Jaribu tena", "Retry")}
          </button>
        </div>
      )}
      {reference && (
        <div role="status" className="rounded-xl bg-emerald-100 p-4 font-bold">
          {L("Imehifadhiwa. Kumbukumbu:", "Filed. Reference:")} {reference}
        </div>
      )}
      {!register && (
        <form onSubmit={submit} className="rounded-2xl border bg-white p-5 space-y-4">
          <p className="text-sm font-bold">
            {L("Mwenyeji", "Host")}: {user?.first_name} {user?.last_name} · {user?.phone}
          </p>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="text-sm font-bold">
              {L("Aina ya mgeni", "Guest type")}
              <select name="guest_type" required className={inputClass}>
                <option value="">{L("Chagua", "Select")}</option>
                {types.map(([value, sw, en]) => (
                  <option key={value} value={value}>
                    {L(sw, en)}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-sm font-bold">
              {L("Aina ya kitambulisho (hiari)", "Identity type (optional)")}
              <select name="identity_type" className={inputClass}>
                <option value="">{L("Hakuna", "Not provided")}</option>
                <option>NIDA</option>
                <option>Passport</option>
                <option>Voter ID</option>
                <option>Other</option>
              </select>
            </label>
            {fields.map(([name, sw, en, type, required]) => (
              <label key={name} className="text-sm font-bold">
                {L(sw, en)}
                {required ? " *" : ""}
                <input
                  className={inputClass}
                  name={name}
                  type={type}
                  required={required}
                  maxLength={type === "date" ? undefined : 500}
                  defaultValue={
                    name === "premises"
                      ? user?.house_number
                      : ["region", "district", "ward", "street"].includes(name)
                        ? user?.[name as "region"]
                        : undefined
                  }
                />
              </label>
            ))}
          </div>
          <label className="flex gap-2 text-sm">
            <input type="checkbox" required />
            {L(
              "Nathibitisha taarifa ni sahihi na mgeni amejulishwa kuwa zitahifadhiwa kwa kumbukumbu za serikali ya mtaa.",
              "I confirm the details are accurate and the guest has been informed that they will be filed for local government reference.",
            )}
          </label>
          <button
            disabled={saving || loading}
            className="rounded-xl bg-emerald-700 px-5 py-3 font-bold text-white disabled:opacity-50"
          >
            {saving
              ? L("Inahifadhi...", "Saving...")
              : L("Hifadhi Taarifa", "File Guest Information")}
          </button>
        </form>
      )}
      <h3 className="text-lg font-bold">
        {register
          ? L("Taarifa zilizohifadhiwa", "Filed guest records")
          : L("Wageni Wangu", "My Guest Records")}
      </h3>
      <input
        aria-label={L("Tafuta kumbukumbu", "Search records")}
        placeholder={L("Tafuta jina au namba ya kumbukumbu", "Search name or reference")}
        className={inputClass}
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />
      {loading ? (
        <p>{L("Inapakia...", "Loading...")}</p>
      ) : records.length === 0 ? (
        <p>{L("Hakuna kumbukumbu bado.", "No guest records yet.")}</p>
      ) : (
        records
          .filter((r) =>
            `${r.guest_name} ${r.reference_number} ${r.host_name}`
              .toLowerCase()
              .includes(search.toLowerCase()),
          )
          .map((r) => (
            <details key={r.id} className="rounded-xl border bg-white p-4">
              <summary className="cursor-pointer font-bold break-words">
                {r.guest_name} · {r.reference_number}{" "}
                <span className="text-emerald-700">{L("Imehifadhiwa", "Filed")}</span>
              </summary>
              <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
                {[
                  [
                    L("Aina", "Type"),
                    types.find((t) => t[0] === r.guest_type)?.[lang === "sw" ? 1 : 2] ||
                      r.guest_type,
                  ],
                  ...fields.map(([name, sw, en]) => [L(sw, en), r[name]]),
                  [L("Kitambulisho", "Identity type"), r.identity_type],
                  [L("Mwenyeji", "Host"), r.host_name],
                  [L("Simu ya mwenyeji", "Host phone"), r.host_phone],
                  [
                    L("Ilihifadhiwa", "Filed at"),
                    new Date(r.created_at).toLocaleString(lang === "sw" ? "sw-TZ" : "en-TZ"),
                  ],
                ].map(([label, value]) => (
                  <div key={label}>
                    <dt className="text-stone-500">{label}</dt>
                    <dd className="font-medium break-words">{value || "—"}</dd>
                  </div>
                ))}
              </dl>
            </details>
          ))
      )}
    </div>
  );
}
