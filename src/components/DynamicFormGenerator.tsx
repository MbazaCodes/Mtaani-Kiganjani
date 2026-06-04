import React, { useState, useRef, useEffect } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { cn } from "@/lib/utils";
import {
  Upload,
  X,
  FileText,
  Loader2,
  ArrowRight,
  User,
  Users,
  UserPlus,
  RefreshCw,
  Search,
  CheckCircle,
  AlertCircle,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import type { AnyFormData } from "@/types";

interface FormField {
  name: string;
  label: string;
  type:
    | "text"
    | "textarea"
    | "select"
    | "date"
    | "tel"
    | "number"
    | "file"
    | "checkbox"
    | "header"
    | "time"
    | "url"
    | "datetime-local"
    | "nida_lookup"
    | "citizen_id_lookup";
  placeholder?: string;
  options?: { label: string; value: string }[];
  required?: boolean;
  disabled?: boolean;
  validation?: {
    min?: number;
    max?: number;
    pattern?: string;
  };
  showIf?: {
    field: string;
    value?: string | number | boolean;
    values?: (string | number | boolean)[]; // Support for multiple values (OR condition)
  };
}

interface UserProfile {
  id: string;
  first_name: string;
  middle_name?: string;
  last_name: string;
  email: string;
  phone: string;
  nida_number?: string;
  region?: string;
  district?: string;
  ward?: string;
  street?: string;
  [key: string]: unknown;
}

interface DynamicFormProps {
  schema: FormField[];
  // data is typed as Record internally (dynamic Zod schema); cast to AnyFormData at call site
  onSubmit: (
    data: Record<string, unknown>,
    attachments: string[],
    applicantType: string,
    representativeName?: string,
  ) => void;
  initialData?: Record<string, unknown>;
  isLoading?: boolean;
  lang?: "sw" | "en";
  userProfile?: UserProfile | null;
}

type ApplicantType = "self" | "minor" | "representative";

export const DynamicFormGenerator: React.FC<DynamicFormProps> = ({
  schema,
  onSubmit,
  initialData,
  isLoading,
  lang = "sw",
  userProfile,
}) => {
  const [attachments, setAttachments] = useState<string[]>([]);
  const [applicantType, setApplicantType] = useState<ApplicantType>("self");
  const [representativeName, setRepresentativeName] = useState("");
  const [useProfileData, setUseProfileData] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Minor-specific state
  const [minorRelationType, setMinorRelationType] = useState<"own_child" | "other">("own_child");
  const [minorIdType, setMinorIdType] = useState<"birth_certificate" | "school_registration">(
    "birth_certificate",
  );
  const [minorName, setMinorName] = useState("");
  const [minorIdNumber, setMinorIdNumber] = useState("");
  const [guardianIdType, setGuardianIdType] = useState("");
  const [guardianIdNumber, setGuardianIdNumber] = useState("");
  const [guardianRelationship, setGuardianRelationship] = useState("");

  // File upload state for specific fields
  const [fieldFiles, setFieldFiles] = useState<Record<string, File[]>>({});
  const fieldFileRefs = useRef<Record<string, HTMLInputElement | null>>({});

  // NIDA lookup state for approval workflow
  const [nidaLookupResults, setNidaLookupResults] = useState<
    Record<
      string,
      {
        found: boolean;
        user?: { id: string; full_name: string; phone: string; email: string; citizen_id?: string };
        searching: boolean;
        error?: string;
      }
    >
  >({});

  // Citizen ID lookup state for second party in agreements
  const [citizenIdLookupResults, setCitizenIdLookupResults] = useState<
    Record<
      string,
      {
        found: boolean;
        user?: { id: string; full_name: string; phone: string; email: string; citizen_id: string };
        searching: boolean;
        error?: string;
      }
    >
  >({});

  // Generate Zod schema dynamically
  const shape: Record<string, import("zod").ZodTypeAny> = {};
  schema.forEach((field) => {
    if (field.type === "header") return; // Skip headers in validation
    if (field.disabled) return; // Skip disabled (auto-calculated) fields from validation
    if (field.type === "file") return; // Skip file fields - handled separately

    let validator: z.ZodTypeAny = z.any();
    if (field.type === "text" || field.type === "textarea" || field.type === "tel") {
      let v = z.string();
      if (field.required && !field.showIf) v = v.min(1, `${field.label} is required`);
      validator = field.required && !field.showIf ? v : v.optional();
    } else if (field.type === "number") {
      validator = z.any().optional(); // Numbers can be auto-calculated
    } else if (field.type === "date") {
      validator =
        field.required && !field.showIf
          ? z.string().min(1, "Date is required")
          : z.string().optional();
    } else if (field.type === "select") {
      validator =
        field.required && !field.showIf
          ? z.string().min(1, `${field.label} is required`)
          : z.string().optional();
    } else if (field.type === "checkbox") {
      // Checkbox validation - required means it must be checked (true)
      if (field.required && !field.showIf) {
        validator = z.boolean().refine((val) => val === true, {
          message: `${field.label} is required`,
        });
      } else {
        validator = z.boolean().optional();
      }
    } else {
      validator = z.any().optional();
    }
    shape[field.name] = validator;
  });

  const formSchema = z.object(shape).passthrough(); // passthrough allows extra fields

  // Prepare default values from profile if available and useProfileData is true
  const getDefaultValues = () => {
    if (useProfileData && userProfile) {
      // Map user profile fields to form fields
      const profileMapped: Record<string, unknown> = {};

      // Common field mappings
      if (userProfile.first_name) profileMapped.first_name = userProfile.first_name;
      if (userProfile.middle_name) profileMapped.middle_name = userProfile.middle_name;
      if (userProfile.last_name) profileMapped.last_name = userProfile.last_name;
      if (userProfile.email) profileMapped.email = userProfile.email;
      if (userProfile.phone) profileMapped.phone = userProfile.phone;
      if (userProfile.nida_number) profileMapped.nida_number = userProfile.nida_number;
      if (userProfile.region) profileMapped.region = userProfile.region;
      if (userProfile.district) profileMapped.district = userProfile.district;
      if (userProfile.ward) profileMapped.ward = userProfile.ward;
      if (userProfile.street) profileMapped.street = userProfile.street;

      return { ...initialData, ...profileMapped };
    }
    return initialData || {};
  };

  const {
    control,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(formSchema),
    defaultValues: getDefaultValues(),
  });

  // Auto-calculation for rent and sales fields
  const watchMonthlyRent = watch("monthly_rent");
  const watchPaymentPeriod = watch("payment_period");
  const watchSalePrice = watch("sale_price");
  const watchAssetType = watch("asset_type");
  const watchTenantIsSelf = watch("tenant_is_self");
  const watchBuyerIsSelf = watch("buyer_is_self");

  // Auto-fill tenant fields when "SELF" is selected
  useEffect(() => {
    if (watchTenantIsSelf === "SELF" && userProfile) {
      const fullName = [userProfile.first_name, userProfile.middle_name, userProfile.last_name]
        .filter(Boolean)
        .join(" ");
      setValue("tenant_name", fullName);
      setValue("tenant_nida", userProfile.nida_number || "");
    }
  }, [watchTenantIsSelf, userProfile, setValue]);

  // Auto-fill buyer fields when "SELF" is selected
  useEffect(() => {
    if (watchBuyerIsSelf === "SELF" && userProfile) {
      const fullName = [userProfile.first_name, userProfile.middle_name, userProfile.last_name]
        .filter(Boolean)
        .join(" ");
      setValue("buyer_name", fullName);
      setValue("buyer_nida", userProfile.nida_number || "");
    }
  }, [watchBuyerIsSelf, userProfile, setValue]);

  useEffect(() => {
    // Rent calculations (PANGISHA)
    if (watchMonthlyRent && watchPaymentPeriod) {
      const monthly = Number(watchMonthlyRent);
      const period = Number(watchPaymentPeriod);
      if (!isNaN(monthly) && !isNaN(period)) {
        const base = monthly * period;
        const vat = Math.round(base * 0.18);
        const fee = Math.round(base * 0.03);
        const total = base + vat + fee;

        setValue("vat_amount", vat);
        setValue("service_fee", fee);
        setValue("total_rent", total);
      }
    }

    // Sales calculations (Mauziano)
    if (watchSalePrice) {
      const price = Number(watchSalePrice);
      if (!isNaN(price)) {
        const vat = Math.round(price * 0.18);
        const fee = Math.round(price * 0.05);
        const total = price + vat + fee;

        setValue("vat_amount", vat);
        setValue("service_fee", fee);
        setValue("total_amount", total);
      }
    }
  }, [watchMonthlyRent, watchPaymentPeriod, watchSalePrice, setValue]);

  // Reset form when useProfileData changes
  useEffect(() => {
    reset(getDefaultValues());
  }, [useProfileData, userProfile]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files) {
      const names = Array.from(files).map((f: File) => f.name);
      setAttachments((prev) => [...prev, ...names]);
    }
  };

  // Handle file upload for specific form field
  const handleFieldFileChange = (fieldName: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      setFieldFiles((prev) => ({
        ...prev,
        [fieldName]: Array.from(files),
      }));
    }
  };

  const removeFieldFile = (fieldName: string, fileName: string) => {
    setFieldFiles((prev) => ({
      ...prev,
      [fieldName]: (prev[fieldName] || []).filter((f) => f.name !== fileName),
    }));
  };

  const removeAttachment = (name: string) => {
    setAttachments((prev) => prev.filter((a) => a !== name));
  };

  // Search for user by NIDA number for approval workflow
  const handleNidaLookup = async (fieldName: string, nidaNumber: string) => {
    // Remove dashes for validation
    const cleanNida = nidaNumber.replace(/-/g, "").trim();
    if (!cleanNida || cleanNida.length < 10) {
      setNidaLookupResults((prev) => ({
        ...prev,
        [fieldName]: {
          found: false,
          searching: false,
          error:
            lang === "sw"
              ? "NIDA lazima iwe na angalau tarakimu 10"
              : "NIDA must have at least 10 digits",
        },
      }));
      return;
    }

    setNidaLookupResults((prev) => ({
      ...prev,
      [fieldName]: { found: false, searching: true },
    }));

    try {
      // Search for user in database by NIDA (remove dashes for search)
      const cleanNida = nidaNumber.replace(/-/g, "").trim();
      const { data, error } = await supabase
        .from("users")
        .select("id, first_name, middle_name, last_name, phone, email")
        .eq("nida_number", cleanNida)
        .single();

      if (error || !data) {
        setNidaLookupResults((prev) => ({
          ...prev,
          [fieldName]: {
            found: false,
            searching: false,
            error:
              lang === "sw"
                ? "Mtumiaji mwenye NIDA hii hajapatikana. Hakikisha NIDA ni sahihi au mtumiaji amesajiliwa kwenye mfumo."
                : "User with this NIDA not found. Ensure NIDA is correct or user is registered.",
          },
        }));
        // Clear target_user_id if not found
        setValue("target_user_id", null);
      } else {
        const fullName = [data.first_name, data.middle_name, data.last_name]
          .filter(Boolean)
          .join(" ");
        setNidaLookupResults((prev) => ({
          ...prev,
          [fieldName]: {
            found: true,
            searching: false,
            user: {
              id: data.id,
              full_name: fullName,
              phone: data.phone || "",
              email: data.email || "",
            },
          },
        }));
        // Set the target_user_id in the form
        setValue("target_user_id", data.id);
      }
    } catch (err) {
      console.error("NIDA lookup error:", err);
      setNidaLookupResults((prev) => ({
        ...prev,
        [fieldName]: {
          found: false,
          searching: false,
          error:
            lang === "sw" ? "Tatizo la mtandao. Jaribu tena." : "Network error. Please try again.",
        },
      }));
    }
  };

  // Search for user by Citizen ID (e.g., CT2026A12345) for agreement second party
  const handleCitizenIdLookup = async (fieldName: string, citizenId: string) => {
    const cleanCitizenId = citizenId.trim().toUpperCase();

    // Validate format: CT + 4 digits year + 1 letter + 5 digits (e.g., CT2026A12345)
    const citizenIdPattern = /^CT\d{4}[A-Z]\d{5}$/;
    if (!cleanCitizenId || !citizenIdPattern.test(cleanCitizenId)) {
      setCitizenIdLookupResults((prev) => ({
        ...prev,
        [fieldName]: {
          found: false,
          searching: false,
          error:
            lang === "sw"
              ? "Namba ya raia lazima iwe kama CT2026A12345"
              : "Citizen ID must be like CT2026A12345",
        },
      }));
      return;
    }

    setCitizenIdLookupResults((prev) => ({
      ...prev,
      [fieldName]: { found: false, searching: true },
    }));

    try {
      // Search for user in database by citizen_id
      const { data, error } = await supabase
        .from("users")
        .select("id, first_name, middle_name, last_name, phone, email, citizen_id")
        .eq("citizen_id", cleanCitizenId)
        .single();

      if (error || !data) {
        setCitizenIdLookupResults((prev) => ({
          ...prev,
          [fieldName]: {
            found: false,
            searching: false,
            error:
              lang === "sw"
                ? "Mtumiaji mwenye namba hii hajapatikana. Hakikisha namba ni sahihi na mtumiaji amesajiliwa."
                : "User with this Citizen ID not found. Ensure ID is correct and user is registered.",
          },
        }));
        // Clear second party fields if not found
        setValue("second_party_user_id", null);
        setValue("second_party_citizen_id", null);
      } else {
        const fullName = [data.first_name, data.middle_name, data.last_name]
          .filter(Boolean)
          .join(" ");
        setCitizenIdLookupResults((prev) => ({
          ...prev,
          [fieldName]: {
            found: true,
            searching: false,
            user: {
              id: data.id,
              full_name: fullName,
              phone: data.phone || "",
              email: data.email || "",
              citizen_id: data.citizen_id,
            },
          },
        }));
        // Set the second party details in the form
        setValue("second_party_user_id", data.id);
        setValue("second_party_citizen_id", data.citizen_id);
        setValue("second_party_name", fullName);
      }
    } catch (err) {
      console.error("Citizen ID lookup error:", err);
      setCitizenIdLookupResults((prev) => ({
        ...prev,
        [fieldName]: {
          found: false,
          searching: false,
          error:
            lang === "sw" ? "Tatizo la mtandao. Jaribu tena." : "Network error. Please try again.",
        },
      }));
    }
  };

  const onFormSubmit = (data: Record<string, unknown>) => {
    // typed loosely; cast to AnyFormData at submit

    // Include minor data if applicable
    const enrichedData = {
      ...data,
      // Add file field names
      ...Object.keys(fieldFiles).reduce(
        (acc, key) => {
          acc[key] = fieldFiles[key].map((f) => f.name).join(", ");
          return acc;
        },
        {} as Record<string, string>,
      ),
      // Add minor data if minor applicant type
      ...(applicantType === "minor" && {
        minor_relation_type: minorRelationType,
        minor_id_type: minorIdType,
        minor_name: minorName || representativeName,
        minor_id_number: minorIdNumber,
        ...(minorRelationType === "other" && {
          guardian_id_type: guardianIdType,
          guardian_id_number: guardianIdNumber,
          guardian_relationship: guardianRelationship,
        }),
      }),
    };

    // Include all file names in attachments
    const allAttachments = [
      ...attachments,
      ...Object.values(fieldFiles)
        .flat()
        .map((f) => f.name),
    ];

    onSubmit(
      enrichedData,
      allAttachments,
      applicantType,
      applicantType !== "self" ? representativeName : undefined,
    );
  };

  const onFormError = (errors: Record<string, unknown>) => {
    console.error("Form validation errors:", errors);
  };

  const handleUseProfileToggle = () => {
    setUseProfileData(!useProfileData);
  };

  return (
    <form onSubmit={handleSubmit(onFormSubmit, onFormError)} className="space-y-6">
      {/* Applicant Type Selection */}
      <div className="bg-stone-50 p-6 rounded-2xl border border-stone-200 space-y-4">
        <h3 className="text-sm font-bold text-stone-700 flex items-center gap-2">
          <Users className="h-4 w-4 text-emerald-600" />
          {lang === "sw" ? "Unatuma Maombi kwa ajili ya?" : "You are applying for?"}
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <button
            type="button"
            onClick={() => setApplicantType("self")}
            className={cn(
              "flex items-center gap-3 p-4 rounded-xl border-2 transition-all",
              applicantType === "self"
                ? "border-emerald-500 bg-emerald-50"
                : "border-stone-200 bg-white hover:border-stone-300",
            )}
          >
            <div
              className={cn(
                "h-10 w-10 rounded-full flex items-center justify-center",
                applicantType === "self"
                  ? "bg-emerald-500 text-white"
                  : "bg-stone-100 text-stone-500",
              )}
            >
              <User className="h-5 w-5" />
            </div>
            <div className="text-left">
              <p className="font-bold text-stone-800">
                {lang === "sw" ? "Mimi mwenyewe" : "Myself"}
              </p>
              <p className="text-xs text-stone-500">
                {lang === "sw" ? "Ninaomba kwa niaba yangu" : "Applying for myself"}
              </p>
            </div>
          </button>

          <button
            type="button"
            onClick={() => setApplicantType("minor")}
            className={cn(
              "flex items-center gap-3 p-4 rounded-xl border-2 transition-all",
              applicantType === "minor"
                ? "border-emerald-500 bg-emerald-50"
                : "border-stone-200 bg-white hover:border-stone-300",
            )}
          >
            <div
              className={cn(
                "h-10 w-10 rounded-full flex items-center justify-center",
                applicantType === "minor"
                  ? "bg-emerald-500 text-white"
                  : "bg-stone-100 text-stone-500",
              )}
            >
              <Users className="h-5 w-5" />
            </div>
            <div className="text-left">
              <p className="font-bold text-stone-800">{lang === "sw" ? "Mtoto mdogo" : "Minor"}</p>
              <p className="text-xs text-stone-500">
                {lang === "sw"
                  ? "Kwa ajili ya mtoto chini ya miaka 18"
                  : "For a child under 18 years"}
              </p>
            </div>
          </button>

          <button
            type="button"
            onClick={() => setApplicantType("representative")}
            className={cn(
              "flex items-center gap-3 p-4 rounded-xl border-2 transition-all",
              applicantType === "representative"
                ? "border-emerald-500 bg-emerald-50"
                : "border-stone-200 bg-white hover:border-stone-300",
            )}
          >
            <div
              className={cn(
                "h-10 w-10 rounded-full flex items-center justify-center",
                applicantType === "representative"
                  ? "bg-emerald-500 text-white"
                  : "bg-stone-100 text-stone-500",
              )}
            >
              <UserPlus className="h-5 w-5" />
            </div>
            <div className="text-left">
              <p className="font-bold text-stone-800">
                {lang === "sw" ? "Mtu mwingine" : "Someone else"}
              </p>
              <p className="text-xs text-stone-500">
                {lang === "sw"
                  ? "Ninaomba kwa niaba ya mtu mwingine"
                  : "Applying on behalf of someone"}
              </p>
            </div>
          </button>
        </div>

        {/* Representative Name Input (for minor or representative) */}
        {applicantType !== "self" && (
          <div className="mt-4 p-4 bg-white rounded-xl border border-stone-200">
            <label className="text-sm font-bold text-stone-700 mb-2 block">
              {lang === "sw"
                ? applicantType === "minor"
                  ? "Jina la Mtoto / Mteja"
                  : "Jina la Mtu unayemwakilisha"
                : applicantType === "minor"
                  ? "Name of Child / Client"
                  : "Name of person you represent"}{" "}
              <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-stone-400" />
              <input
                type="text"
                value={representativeName}
                onChange={(e) => setRepresentativeName(e.target.value)}
                placeholder={lang === "sw" ? "Ingiza jina kamili" : "Enter full name"}
                className="w-full h-12 pl-10 pr-4 rounded-xl border border-stone-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 outline-none transition-all"
                required={applicantType === "minor" || applicantType === "representative"}
              />
            </div>
            <p className="text-xs text-stone-500 mt-2">
              {lang === "sw"
                ? "Tafadhali hakikisha una mamlaka ya kuwakilisha mtu huyu"
                : "Please ensure you have authority to represent this person"}
            </p>
          </div>
        )}

        {/* Minor-specific detailed fields */}
        {applicantType === "minor" && (
          <div className="mt-4 space-y-4">
            {/* Is this your own child or someone else's? */}
            <div className="p-4 bg-amber-50 rounded-xl border border-amber-200">
              <label className="text-sm font-bold text-stone-700 mb-3 block">
                {lang === "sw" ? "Uhusiano na Mtoto" : "Relationship to Child"}{" "}
                <span className="text-red-500">*</span>
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setMinorRelationType("own_child")}
                  className={cn(
                    "p-3 rounded-xl border-2 text-left transition-all",
                    minorRelationType === "own_child"
                      ? "border-emerald-500 bg-emerald-50"
                      : "border-stone-200 bg-white",
                  )}
                >
                  <p className="font-bold text-stone-800">
                    {lang === "sw" ? "Mtoto wangu mwenyewe" : "My own child"}
                  </p>
                  <p className="text-xs text-stone-500">
                    {lang === "sw" ? "Mzazi/Mlezi wa mtoto" : "Parent/Guardian"}
                  </p>
                </button>
                <button
                  type="button"
                  onClick={() => setMinorRelationType("other")}
                  className={cn(
                    "p-3 rounded-xl border-2 text-left transition-all",
                    minorRelationType === "other"
                      ? "border-emerald-500 bg-emerald-50"
                      : "border-stone-200 bg-white",
                  )}
                >
                  <p className="font-bold text-stone-800">
                    {lang === "sw" ? "Mtoto wa mtu mwingine" : "Someone else's child"}
                  </p>
                  <p className="text-xs text-stone-500">
                    {lang === "sw" ? "Mwakilishi aliyeidhinishwa" : "Authorized representative"}
                  </p>
                </button>
              </div>
            </div>

            {/* Child ID Type Selection */}
            <div className="p-4 bg-white rounded-xl border border-stone-200">
              <label className="text-sm font-bold text-stone-700 mb-3 block">
                {lang === "sw" ? "Aina ya Utambulisho wa Mtoto" : "Child ID Type"}{" "}
                <span className="text-red-500">*</span>
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setMinorIdType("birth_certificate")}
                  className={cn(
                    "p-3 rounded-xl border-2 text-left transition-all",
                    minorIdType === "birth_certificate"
                      ? "border-emerald-500 bg-emerald-50"
                      : "border-stone-200 bg-white",
                  )}
                >
                  <p className="font-bold text-stone-800">
                    {lang === "sw" ? "Cheti cha Kuzaliwa" : "Birth Certificate"}
                  </p>
                </button>
                <button
                  type="button"
                  onClick={() => setMinorIdType("school_registration")}
                  className={cn(
                    "p-3 rounded-xl border-2 text-left transition-all",
                    minorIdType === "school_registration"
                      ? "border-emerald-500 bg-emerald-50"
                      : "border-stone-200 bg-white",
                  )}
                >
                  <p className="font-bold text-stone-800">
                    {lang === "sw" ? "Namba ya Usajili Shule" : "School Registration No."}
                  </p>
                </button>
              </div>

              {/* Child ID Number */}
              <div className="mt-3">
                <input
                  type="text"
                  value={minorIdNumber}
                  onChange={(e) => setMinorIdNumber(e.target.value)}
                  placeholder={
                    minorIdType === "birth_certificate"
                      ? lang === "sw"
                        ? "Namba ya Cheti cha Kuzaliwa"
                        : "Birth Certificate Number"
                      : lang === "sw"
                        ? "Namba ya Usajili Shule"
                        : "School Registration Number"
                  }
                  className="w-full h-12 px-4 rounded-xl border border-stone-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 outline-none transition-all"
                />
              </div>
            </div>

            {/* Guardian/Representative Details (if not own child) */}
            {minorRelationType === "other" && (
              <div className="p-4 bg-white rounded-xl border border-stone-200 space-y-3">
                <label className="text-sm font-bold text-stone-700 mb-2 block">
                  {lang === "sw" ? "Taarifa za Mwakilishi" : "Representative Details"}{" "}
                  <span className="text-red-500">*</span>
                </label>

                {/* ID Type */}
                <select
                  value={guardianIdType}
                  onChange={(e) => setGuardianIdType(e.target.value)}
                  aria-label={lang === "sw" ? "Aina ya Kitambulisho" : "ID Type"}
                  className="w-full h-12 px-4 rounded-xl border border-stone-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 outline-none transition-all bg-white"
                >
                  <option value="">
                    {lang === "sw" ? "Chagua Aina ya Kitambulisho" : "Select ID Type"}
                  </option>
                  <option value="NIDA">NIDA</option>
                  <option value="PASSPORT">Passport</option>
                  <option value="VOTER_ID">
                    {lang === "sw" ? "Kadi ya Mpiga Kura" : "Voter ID"}
                  </option>
                  <option value="DRIVING_LICENSE">
                    {lang === "sw" ? "Leseni ya Udereva" : "Driving License"}
                  </option>
                </select>

                {/* ID Number */}
                <input
                  type="text"
                  value={guardianIdNumber}
                  onChange={(e) => setGuardianIdNumber(e.target.value)}
                  placeholder={lang === "sw" ? "Namba ya Kitambulisho" : "ID Number"}
                  aria-label={lang === "sw" ? "Namba ya Kitambulisho" : "ID Number"}
                  className="w-full h-12 px-4 rounded-xl border border-stone-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 outline-none transition-all"
                />

                {/* Relationship */}
                <select
                  value={guardianRelationship}
                  onChange={(e) => setGuardianRelationship(e.target.value)}
                  aria-label={lang === "sw" ? "Uhusiano na Mtoto" : "Relationship to Child"}
                  className="w-full h-12 px-4 rounded-xl border border-stone-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 outline-none transition-all bg-white"
                >
                  <option value="">
                    {lang === "sw" ? "Uhusiano na Mtoto" : "Relationship to Child"}
                  </option>
                  <option value="UNCLE">{lang === "sw" ? "Mjomba/Baba Mdogo" : "Uncle"}</option>
                  <option value="AUNT">{lang === "sw" ? "Shangazi/Mama Mdogo" : "Aunt"}</option>
                  <option value="GRANDPARENT">{lang === "sw" ? "Babu/Bibi" : "Grandparent"}</option>
                  <option value="SIBLING">{lang === "sw" ? "Ndugu" : "Sibling"}</option>
                  <option value="LEGAL_GUARDIAN">
                    {lang === "sw" ? "Mlezi wa Kisheria" : "Legal Guardian"}
                  </option>
                  <option value="OTHER">{lang === "sw" ? "Nyingine" : "Other"}</option>
                </select>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Profile Data Toggle (only for self) */}
      {applicantType === "self" && userProfile && (
        <div className="flex items-center justify-between p-4 bg-blue-50 rounded-xl border border-blue-200">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center">
              <RefreshCw className="h-5 w-5" />
            </div>
            <div>
              <p className="font-bold text-blue-800">
                {lang === "sw" ? "Tumia taarifa za wasifu wako" : "Use your profile information"}
              </p>
              <p className="text-xs text-blue-600">
                {lang === "sw"
                  ? "Jaza fomu kiotomatiki kwa kutumia taarifa zako zilizohifadhiwa"
                  : "Auto-fill the form using your saved profile information"}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleUseProfileToggle}
            aria-label={`${lang === "sw" ? "Tumia taarifa za wasifu" : "Use profile data"}: ${useProfileData ? (lang === "sw" ? "Imewashwa" : "On") : lang === "sw" ? "Imezimwa" : "Off"}`}
            className={cn(
              "relative w-14 h-7 rounded-full transition-all",
              useProfileData ? "bg-blue-600" : "bg-stone-300",
            )}
          >
            <span
              className={cn(
                "absolute top-1 left-1 w-5 h-5 rounded-full bg-white shadow-md transition-all",
                useProfileData && "translate-x-7",
              )}
            />
          </button>
        </div>
      )}

      {/* Form Fields */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {schema.map((field) => {
          // Conditional rendering - support both single value and array of values
          if (field.showIf) {
            const watchedValue = watch(field.showIf.field);
            // Check if using array of values (OR condition)
            if (field.showIf.values && Array.isArray(field.showIf.values)) {
              if (!field.showIf.values.includes(watchedValue)) return null;
            } else if (field.showIf.value !== undefined) {
              if (watchedValue !== field.showIf.value) return null;
            }
          }

          if (field.type === "header") {
            return (
              <div key={field.name} className="md:col-span-2 pt-6 pb-2 border-b border-stone-100">
                <h3 className="text-sm font-bold text-emerald-700 tracking-wider uppercase">
                  {field.label}
                </h3>
              </div>
            );
          }

          return (
            <div
              key={field.name}
              className={cn("flex flex-col gap-2", field.type === "textarea" && "md:col-span-2")}
            >
              <label className="text-sm font-semibold text-stone-700">
                {field.label} {field.required && <span className="text-red-500">*</span>}
              </label>

              <Controller
                name={field.name}
                control={control}
                render={({ field: { onChange, value } }) => {
                  switch (field.type) {
                    case "textarea":
                      return (
                        <textarea
                          onChange={onChange}
                          value={(value as string) || ""}
                          placeholder={field.placeholder}
                          aria-label={field.label}
                          className="p-3 border border-stone-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none min-h-25 transition-all"
                        />
                      );
                    case "select":
                      return (
                        <select
                          onChange={onChange}
                          value={(value as string) || ""}
                          aria-label={field.label}
                          className="p-3 border border-stone-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none bg-white transition-all"
                        >
                          <option value="">
                            {lang === "sw" ? "Chagua..." : "Select..."} {field.label}
                          </option>
                          {field.options?.map((opt) => (
                            <option key={opt.value} value={opt.value}>
                              {opt.label}
                            </option>
                          ))}
                        </select>
                      );
                    case "checkbox":
                      return (
                        <input
                          type="checkbox"
                          checked={(value as boolean) || false}
                          onChange={(e) => onChange(e.target.checked)}
                          aria-label={field.label}
                          className="w-5 h-5 text-emerald-600 rounded focus:ring-emerald-500"
                        />
                      );
                    case "time":
                      return (
                        <input
                          type="time"
                          onChange={onChange}
                          value={(value as string) || ""}
                          aria-label={field.label}
                          className="p-3 border border-stone-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
                        />
                      );
                    case "datetime-local":
                      return (
                        <input
                          type="datetime-local"
                          onChange={onChange}
                          value={(value as string) || ""}
                          aria-label={field.label}
                          className="p-3 border border-stone-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
                        />
                      );
                    case "url":
                      return (
                        <input
                          type="url"
                          onChange={onChange}
                          value={(value as string) || ""}
                          placeholder={field.placeholder || "https://..."}
                          className="p-3 border border-stone-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
                        />
                      );
                    case "file":
                      return (
                        <div className="space-y-2">
                          <input
                            type="file"
                            ref={(el) => {
                              fieldFileRefs.current[field.name] = el;
                            }}
                            onChange={(e) => handleFieldFileChange(field.name, e)}
                            className="hidden"
                            multiple
                            accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                            aria-label={field.label}
                          />
                          <button
                            type="button"
                            onClick={() => fieldFileRefs.current[field.name]?.click()}
                            aria-label={
                              lang === "sw"
                                ? `Pakia faili za ${field.label}`
                                : `Upload files for ${field.label}`
                            }
                            className="w-full py-3 border-2 border-dashed border-stone-300 rounded-xl text-stone-600 hover:border-emerald-500 hover:text-emerald-600 transition-all flex items-center justify-center gap-2 bg-white"
                          >
                            <Upload className="h-5 w-5" />
                            <span className="font-semibold text-sm">
                              {lang === "sw"
                                ? "Bofya kupakia nyaraka"
                                : "Click to upload documents"}
                            </span>
                          </button>
                          {(fieldFiles[field.name] || []).length > 0 && (
                            <div className="space-y-1">
                              {fieldFiles[field.name].map((f) => (
                                <div
                                  key={f.name}
                                  className="flex items-center justify-between px-3 py-2 rounded-lg bg-emerald-50 border border-emerald-200 text-sm"
                                >
                                  <span className="truncate flex-1 font-medium text-emerald-700">
                                    {f.name}
                                  </span>
                                  <button
                                    type="button"
                                    onClick={() => removeFieldFile(field.name, f.name)}
                                    aria-label={
                                      lang === "sw" ? `Ondoa ${f.name}` : `Remove ${f.name}`
                                    }
                                    className="text-red-500 hover:bg-red-50 p-1 rounded-lg transition-colors ml-2"
                                  >
                                    <X className="h-4 w-4" />
                                  </button>
                                </div>
                              ))}
                            </div>
                          )}
                          <p className="text-xs text-stone-400">
                            {lang === "sw"
                              ? "PDF, JPG, PNG, DOC zinakubaliwa"
                              : "PDF, JPG, PNG, DOC accepted"}
                          </p>
                        </div>
                      );
                    case "nida_lookup":
                      // eslint-disable-next-line no-case-declarations
                      const lookupState = nidaLookupResults[field.name];
                      return (
                        <div className="space-y-3">
                          <div className="flex gap-2">
                            <input
                              type="text"
                              onChange={onChange}
                              value={(value as string) || ""}
                              placeholder={
                                lang === "sw"
                                  ? "Ingiza NIDA ya upande mwingine"
                                  : "Enter other party NIDA"
                              }
                              aria-label={field.label}
                              className="flex-1 p-3 border border-stone-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
                            />
                            <button
                              type="button"
                              onClick={() => handleNidaLookup(field.name, value as string)}
                              disabled={lookupState?.searching}
                              aria-label={lang === "sw" ? "Tafuta mtumiaji" : "Search user"}
                              className="px-4 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-xl font-semibold flex items-center gap-2 transition-all"
                            >
                              {lookupState?.searching ? (
                                <Loader2 className="h-5 w-5 animate-spin" />
                              ) : (
                                <Search className="h-5 w-5" />
                              )}
                              <span className="hidden sm:inline">
                                {lang === "sw" ? "Tafuta" : "Search"}
                              </span>
                            </button>
                          </div>

                          {/* User found result */}
                          {lookupState?.found && lookupState.user && (
                            <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl">
                              <div className="flex items-center gap-2 mb-2">
                                <CheckCircle className="h-5 w-5 text-emerald-600" />
                                <span className="font-bold text-emerald-700">
                                  {lang === "sw" ? "Mtumiaji amepatikana!" : "User found!"}
                                </span>
                              </div>
                              <div className="space-y-1 text-sm text-emerald-800">
                                <p>
                                  <span className="font-semibold">
                                    {lang === "sw" ? "Jina:" : "Name:"}
                                  </span>{" "}
                                  {lookupState.user.full_name}
                                </p>
                                <p>
                                  <span className="font-semibold">
                                    {lang === "sw" ? "Simu:" : "Phone:"}
                                  </span>{" "}
                                  {lookupState.user.phone || "N/A"}
                                </p>
                                <p>
                                  <span className="font-semibold">
                                    {lang === "sw" ? "Email:" : "Email:"}
                                  </span>{" "}
                                  {lookupState.user.email || "N/A"}
                                </p>
                              </div>
                              <p className="text-xs text-emerald-600 mt-2">
                                {lang === "sw"
                                  ? "Baada ya kutuma, mtumiaji huyu atapokea arifa ya kuidhinisha makubaliano."
                                  : "After submission, this user will receive approval notification."}
                              </p>
                            </div>
                          )}

                          {/* Error message */}
                          {lookupState?.error && (
                            <div className="p-4 bg-red-50 border border-red-200 rounded-xl">
                              <div className="flex items-center gap-2">
                                <AlertCircle className="h-5 w-5 text-red-600" />
                                <span className="text-sm text-red-700">{lookupState.error}</span>
                              </div>
                            </div>
                          )}

                          <p className="text-xs text-stone-500">
                            {lang === "sw"
                              ? "Ingiza NIDA ya mtu unayetaka kumtumia idhini ya makubaliano. Mtumiaji huyu lazima awe amesajiliwa kwenye mfumo."
                              : "Enter NIDA of the person you want to send for approval. User must be registered in the system."}
                          </p>
                        </div>
                      );
                    case "citizen_id_lookup":
                      // eslint-disable-next-line no-case-declarations
                      const citizenLookupState = citizenIdLookupResults[field.name];
                      return (
                        <div className="space-y-3">
                          {/* Info banner */}
                          <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl">
                            <p className="text-sm text-blue-700 font-medium">
                              {lang === "sw"
                                ? "🆔 Ingiza Namba ya Raia (Citizen ID) ya mtu unayetaka kuingia naye makubaliano. Namba hii inapatikana kwenye wasifu wa mtumiaji."
                                : "🆔 Enter the Citizen ID of the person you want to enter into agreement with. This number is found on the user's profile."}
                            </p>
                          </div>

                          <div className="flex gap-2">
                            <input
                              type="text"
                              onChange={(e) => onChange(e.target.value.toUpperCase())}
                              value={(value as string) || ""}
                              placeholder="CT2026A12345"
                              aria-label={field.label}
                              className="flex-1 p-3 border border-stone-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none transition-all font-mono uppercase tracking-wider"
                            />
                            <button
                              type="button"
                              onClick={() => handleCitizenIdLookup(field.name, value as string)}
                              disabled={citizenLookupState?.searching}
                              aria-label={lang === "sw" ? "Tafuta mtumiaji" : "Search user"}
                              className="px-4 py-3 bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-400 text-white rounded-xl font-semibold flex items-center gap-2 transition-all"
                            >
                              {citizenLookupState?.searching ? (
                                <Loader2 className="h-5 w-5 animate-spin" />
                              ) : (
                                <Search className="h-5 w-5" />
                              )}
                              <span className="hidden sm:inline">
                                {lang === "sw" ? "Tafuta" : "Search"}
                              </span>
                            </button>
                          </div>

                          {/* User found result */}
                          {citizenLookupState?.found && citizenLookupState.user && (
                            <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl">
                              <div className="flex items-center gap-2 mb-3">
                                <CheckCircle className="h-6 w-6 text-emerald-600" />
                                <span className="font-bold text-emerald-700 text-lg">
                                  {lang === "sw" ? "Mtumiaji Amepatikana!" : "User Found!"}
                                </span>
                              </div>
                              <div className="bg-white rounded-lg p-3 space-y-2 text-sm">
                                <div className="flex items-center gap-2">
                                  <span className="font-semibold text-stone-600 w-20">
                                    {lang === "sw" ? "Jina:" : "Name:"}
                                  </span>
                                  <span className="font-bold text-stone-900">
                                    {citizenLookupState.user.full_name}
                                  </span>
                                </div>
                                <div className="flex items-center gap-2">
                                  <span className="font-semibold text-stone-600 w-20">
                                    {lang === "sw" ? "Namba:" : "ID:"}
                                  </span>
                                  <span className="font-mono text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded">
                                    {citizenLookupState.user.citizen_id}
                                  </span>
                                </div>
                                <div className="flex items-center gap-2">
                                  <span className="font-semibold text-stone-600 w-20">
                                    {lang === "sw" ? "Simu:" : "Phone:"}
                                  </span>
                                  <span className="text-stone-700">
                                    {citizenLookupState.user.phone || "N/A"}
                                  </span>
                                </div>
                              </div>
                              <div className="mt-3 p-2 bg-amber-50 border border-amber-200 rounded-lg">
                                <p className="text-xs text-amber-700 font-medium">
                                  ⚠️{" "}
                                  {lang === "sw"
                                    ? "Baada ya kutuma ombi, mtumiaji huyu atapokea arifa ya KUIDHINISHA makubaliano haya. Makubaliano hayatakamilika mpaka pande zote mbili zikubali."
                                    : "After submission, this user will receive a notification to APPROVE this agreement. The agreement will not be finalized until both parties accept."}
                                </p>
                              </div>
                            </div>
                          )}

                          {/* Error message */}
                          {citizenLookupState?.error && (
                            <div className="p-4 bg-red-50 border border-red-200 rounded-xl">
                              <div className="flex items-start gap-2">
                                <AlertCircle className="h-5 w-5 text-red-600 shrink-0 mt-0.5" />
                                <div>
                                  <span className="text-sm text-red-700 font-medium">
                                    {citizenLookupState.error}
                                  </span>
                                  <p className="text-xs text-red-500 mt-1">
                                    {lang === "sw"
                                      ? "Hakikisha mtumiaji amesajiliwa kwenye E-Serikali Mtaa na umeingiza namba sahihi."
                                      : "Ensure the user is registered on E-Serikali Mtaa and you entered the correct number."}
                                  </p>
                                </div>
                              </div>
                            </div>
                          )}

                          <p className="text-xs text-stone-500">
                            {lang === "sw"
                              ? "Namba ya Raia (Citizen ID) inapatikana kwenye wasifu wa mtumiaji. Mfano: CT2026A12345"
                              : "Citizen ID is found on the user's profile page. Example: CT2026A12345"}
                          </p>
                        </div>
                      );
                    default:
                      return (
                        <input
                          type={field.type}
                          onChange={(e) =>
                            onChange(
                              field.type === "number" ? Number(e.target.value) : e.target.value,
                            )
                          }
                          value={(value as string) || ""}
                          placeholder={field.placeholder}
                          disabled={field.disabled}
                          className={cn(
                            "p-3 border border-stone-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none transition-all",
                            field.disabled && "bg-stone-100 text-stone-500 cursor-not-allowed",
                          )}
                        />
                      );
                  }
                }}
              />
              {errors[field.name] && (
                <span className="text-xs text-red-500">
                  {(errors[field.name] as { message?: string }).message}
                </span>
              )}
            </div>
          );
        })}
      </div>

      {/* Attachments Section */}
      <div className="space-y-3 pt-4 border-t border-stone-100">
        <label className="text-sm font-bold text-stone-700 flex items-center gap-2">
          <FileText className="h-4 w-4 text-emerald-600" />
          {lang === "sw" ? "Viambatisho / Nyaraka" : "Attachments / Documents"}
        </label>
        <input
          ref={fileInputRef}
          type="file"
          multiple
          className="hidden"
          onChange={handleFileChange}
          aria-label={lang === "sw" ? "Chagua faili" : "Choose files"}
        />
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="w-full py-4 border-2 border-dashed border-stone-200 rounded-2xl text-stone-500 hover:border-emerald-500 hover:text-emerald-600 transition-all flex items-center justify-center gap-2 group"
        >
          <Upload className="h-5 w-5 group-hover:-translate-y-1 transition-transform" />
          <span className="font-semibold">
            {lang === "sw" ? "Ambatisha Nyaraka" : "Attach Documents"}
          </span>
        </button>

        {attachments.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-3">
            {attachments.map((a) => (
              <div
                key={a}
                className="flex items-center justify-between px-4 py-2 rounded-xl bg-stone-50 border border-stone-100 text-sm"
              >
                <span className="truncate flex-1 font-medium text-stone-700">{a}</span>
                <button
                  type="button"
                  onClick={() => removeAttachment(a)}
                  aria-label={lang === "sw" ? `Ondoa ${a}` : `Remove ${a}`}
                  className="text-red-500 hover:bg-red-50 p-1 rounded-lg transition-colors"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Submit Button */}
      <button
        type="submit"
        disabled={isLoading || (applicantType !== "self" && !representativeName)}
        className="w-full h-16 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-2xl transition-all shadow-xl shadow-emerald-200 flex items-center justify-center gap-3 disabled:opacity-50 group mt-8"
      >
        {isLoading ? (
          <Loader2 className="h-6 w-6 animate-spin" />
        ) : (
          <>
            {lang === "sw" ? "Wasilisha Maombi" : "Submit Application"}
            <ArrowRight className="h-5 w-5 group-hover:translate-x-1 transition-transform" />
          </>
        )}
      </button>

      {/* Representative Disclaimer */}
      {applicantType !== "self" && (
        <div className="p-4 bg-amber-50 rounded-xl border border-amber-200 text-sm text-amber-800">
          <p className="font-bold mb-1">
            {lang === "sw" ? "Ujumbe muhimu:" : "Important message:"}
          </p>
          <p>
            {lang === "sw"
              ? "Unawasilisha maombi kwa niaba ya mtu mwingine. Tafadhali hakikisha una hati ya idhini au mamlaka ya kufanya hivyo."
              : "You are submitting an application on behalf of someone else. Please ensure you have a letter of authorization or authority to do so."}
          </p>
        </div>
      )}
    </form>
  );
};
interface DynamicFormProps {
  schema: FormField[];
  // data is typed as Record internally (dynamic Zod schema); cast to AnyFormData at call site
  onSubmit: (
    data: Record<string, unknown>,
    attachments: string[],
    applicantType: string,
    representativeName?: string,
  ) => void;
  initialData?: Record<string, unknown>;
  isLoading?: boolean;
  lang?: "sw" | "en";
  userProfile?: UserProfile | null;
  draftId?: string; // <-- ADD THIS LINE
}
