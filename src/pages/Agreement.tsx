import { cn } from "@/lib/utils";
import { SignaturePad } from "@/components/ui/SignaturePad";
import { pdf } from "@react-pdf/renderer";
import { CertificatePDFDocument } from "@/components/DocumentRenderer";
import { generateQRDataUrl } from "@/lib/qr";
import { ApplicationChat } from "@/components/ApplicationChat";
import { MakubalianoMauzianoPDF } from "@/components/documents/MakubalianoMauzianoPDF";
import { MakubalianoPangoPDF } from "@/components/documents/MakubalianoPangoPDF";
/**
 * Agreement / Business Portal
 *
 * Citizens apply to become Seller, Landlord, or Broker.
 * Multi-state page:
 *   - NONE      → landing + choose type → multi-step application
 *   - PENDING   → "under review" status card
 *   - APPROVED  → dashboard with stats + initiate Sale/Rental buttons
 *   - REJECTED  → reason shown + re-apply button
 *   - SUSPENDED → contact admin
 *
 * Writes to public.business_registrations.
 * Reads back current user's registrations to determine state.
 */
import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  Store,
  Home,
  Users,
  Building2,
  Briefcase,
  FileText,
  Download,
  Loader2,
  CheckCircle2,
  CheckCircle,
  AlertCircle,
  Clock,
  X,
  Upload,
  ArrowLeft,
  ArrowRight,
  Eye,
  Edit2,
  Check,
  MapPin,
  Phone,
  Mail,
  Award,
  Plus,
  ShoppingCart,
  Key,
  ExternalLink,
  RefreshCw,
  XCircle,
  ShieldCheck,
  FileSignature,
  Shield,
  Info,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useLanguage } from "@/context/LanguageContext";
import { useToast } from "@/context/ToastContext";
import { useRouterView } from "@/components/layout/AppShell";
import { supabase } from "@/lib/supabase";
import { TANZANIA_ADDRESS_DATA } from "@/lib/addressData";
import { ProgressFill } from "@/components/ui/ProgressFill";

// ─── Types ────────────────────────────────────────────────────────────────────
type BusinessType = "seller" | "landlord" | "broker";
type RegStatus = "pending" | "approved" | "rejected" | "suspended";

interface BusinessRegistration {
  id: string;
  user_id: string;
  business_type: BusinessType;
  business_id: string | null;
  business_name: string;
  description: string;
  experience_years: number;
  specialization: string;
  region: string;
  district: string;
  ward: string;
  street: string;
  phone: string;
  alt_phone: string | null;
  email: string;
  id_document_url: string | null;
  proof_document_url: string | null;
  photo_url: string | null;
  status: RegStatus;
  rejection_reason: string | null;
  reviewed_at: string | null;
  approved_at: string | null;
  created_at: string;
}

interface UploadedDoc {
  file: File;
  preview: string;
}

interface AgreementApp {
  id: string;
  application_number: string | null;
  service_name: string | null;
  status: string | null;
  agreement_status: string | null;
  user_id: string | null;
  second_party_user_id: string | null;
  created_at: string;
  form_data?: Record<string, unknown>;
  payment_data?: Record<string, unknown>;
  approved_at?: string | null;
  issued_at?: string | null;
  initiator?: { first_name: string; last_name: string; phone?: string; citizen_id?: string } | null;
}

// ─── Constants ───────────────────────────────────────────────────────────────
const BIZ_TYPES = [
  {
    value: "seller" as BusinessType,
    sw: "Muuzaji",
    en: "Seller",
    descSw: "Kuuza nyumba, ardhi, magari, biashara au bidhaa nyingine",
    descEn: "Sell houses, land, vehicles, businesses or other items",
    icon: Store,
    color: "from-blue-500 to-indigo-600",
    bgColor: "bg-blue-50",
    borderColor: "border-blue-300",
    textColor: "text-blue-700",
    services: ["Makubaliano ya Mauzo"],
  },
  {
    value: "landlord" as BusinessType,
    sw: "Mpangishaji",
    en: "Landlord",
    descSw: "Kupangisha nyumba, vyumba, maeneo ya biashara au mali",
    descEn: "Rent out houses, rooms, commercial spaces or property",
    icon: Key,
    color: "from-emerald-500 to-teal-600",
    bgColor: "bg-emerald-50",
    borderColor: "border-emerald-300",
    textColor: "text-emerald-700",
    services: ["Makubaliano ya Pango"],
  },
  {
    value: "broker" as BusinessType,
    sw: "Dalali",
    en: "Broker",
    descSw: "Kusaidia mauzo na ukodishaji kwa niaba ya wengine",
    descEn: "Facilitate sales and rentals on behalf of others",
    icon: Users,
    color: "from-purple-500 to-fuchsia-600",
    bgColor: "bg-purple-50",
    borderColor: "border-purple-300",
    textColor: "text-purple-700",
    services: ["Makubaliano ya Mauzo", "Makubaliano ya Pango"],
  },
];

const SPECIALIZATIONS: Record<BusinessType, { value: string; sw: string; en: string }[]> = {
  seller: [
    {
      value: "property",
      sw: "Mali Isiyohamishika (Nyumba/Ardhi)",
      en: "Real Estate (Houses/Land)",
    },
    { value: "vehicles", sw: "Magari na Pikipiki", en: "Vehicles & Motorcycles" },
    { value: "land", sw: "Ardhi na Viwanja", en: "Land & Plots" },
    { value: "general", sw: "Bidhaa Mchanganyiko", en: "General Goods" },
  ],
  landlord: [
    { value: "residential", sw: "Nyumba za Kuishi", en: "Residential Houses" },
    { value: "rooms", sw: "Vyumba na Studio", en: "Rooms & Studios" },
    { value: "commercial", sw: "Maduka na Ofisi", en: "Shops & Offices" },
    { value: "warehouse", sw: "Maghala na Stoo", en: "Warehouses & Storage" },
    { value: "land_rent", sw: "Ardhi ya Kukodisha", en: "Land for Rent" },
  ],
  broker: [
    { value: "property_broker", sw: "Mali Isiyohamishika", en: "Real Estate" },
    { value: "vehicle_broker", sw: "Magari", en: "Vehicles" },
    { value: "land_broker", sw: "Ardhi", en: "Land" },
    { value: "general_broker", sw: "Dalali wa Jumla", en: "General Broker" },
  ],
};

const ALLOWED_DOCS = ["image/jpeg", "image/png", "image/webp", "application/pdf"];
const MAX_DOC_SIZE = 5 * 1024 * 1024;

type FormStep = "type" | "business" | "address" | "documents" | "preview";

// ─── Component ────────────────────────────────────────────────────────────────
export function Agreement() {
  const { user } = useAuth();
  const { lang } = useLanguage();
  const { showToast } = useToast();
  const { setView } = useRouterView();
  const L = (sw: string, en: string) => (lang === "sw" ? sw : en);

  // Data state
  const [regs, setRegs] = useState<BusinessRegistration[]>([]);
  const [loadingRegs, setLoading] = useState(true);
  const [agreementApps, setAgreementApps] = useState<AgreementApp[]>([]);
  const [agrSearch, setAgrSearch] = useState("");
  const [agrTypeFilter, setAgrTypeFilter] = useState<"all" | "sales" | "rental">("all");
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [signingAgr, setSigningAgr] = useState<AgreementApp | null>(null);
  const [viewingAgr, setViewingAgr] = useState<AgreementApp | null>(null);
  const [downloading, setDownloading] = useState(false);

  const handleDownloadAgreement = async (agr: AgreementApp) => {
    setDownloading(true);
    try {
      // Fetch full application data
      const { data: fullApp } = await supabase
        .from("applications")
        .select("*, users:user_id(first_name, middle_name, last_name, nida_number, phone, region, district, ward, sex, date_of_birth)")
        .eq("id", agr.id)
        .maybeSingle();
      if (!fullApp) throw new Error("Application not found");

      // Generate QR
      const qrUrl = await generateQRDataUrl(fullApp, "DOC");

      // Choose the right PDF component
      const isSale = (agr.service_name || "").includes("Mauzo") || (agr.service_name || "").includes("Sale");
      const PdfComponent = isSale ? MakubalianoMauzianoPDF : MakubalianoPangoPDF;

      // Render to blob
      const blob = await pdf(
        <PdfComponent application={fullApp} lang={lang} qrDataUrl={qrUrl} />
      ).toBlob();

      // Trigger download
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `Agreement_${agr.application_number || "doc"}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("PDF download error:", err);
    } finally {
      setDownloading(false);
    }
  };
  const [buyerSignature, setBuyerSignature] = useState("");

  // Application mode
  const [applying, setApplying] = useState(false);
  const [step, setStep] = useState<FormStep>("type");

  // Form values
  const [bizType, setBizType] = useState<BusinessType | "">("");
  const [businessName, setBusinessName] = useState("");
  const [tin, setTin] = useState("");
  const [description, setDescription] = useState("");
  const [experienceYears, setExperienceYears] = useState("");
  const [specialization, setSpecialization] = useState("");
  const [phone, setPhone] = useState(user?.phone || "");
  const [altPhone, setAltPhone] = useState("");
  const [email, setEmail] = useState(user?.email || "");
  const [region, setRegion] = useState(user?.region || "");
  const [district, setDistrict] = useState(user?.district || "");
  const [ward, setWard] = useState(user?.ward || "");
  const [street, setStreet] = useState(user?.street || "");
  const [idDoc, setIdDoc] = useState<UploadedDoc | null>(null);
  const [proofDoc, setProofDoc] = useState<UploadedDoc | null>(null);
  const [photoDoc, setPhotoDoc] = useState<UploadedDoc | null>(null);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [dataConfirmed, setDataConfirmed] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  const idDocRef = useRef<HTMLInputElement>(null);
  const proofDocRef = useRef<HTMLInputElement>(null);
  const photoDocRef = useRef<HTMLInputElement>(null);

  // ─── Fetch user's registrations ─────────────────────────────────────────
  const fetchRegs = useCallback(async () => {
    if (!user?.id) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("business_registrations")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      setRegs((data as BusinessRegistration[]) || []);
    } catch (e) {
      console.error("fetch registrations", e);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  // ─── Fetch user's agreements ─────────────────────────────────────────────
  const handleAgreementAction = async (
    agr: AgreementApp,
    action: "accept" | "reject",
    signature?: string,
  ) => {
    if (!user) return;
    setProcessingId(agr.id);
    try {
      const newStatus = action === "accept" ? "buyer_accepted" : "buyer_rejected";

      // Update agreement_status + buyer signature on the application
      const patch: Record<string, unknown> = { agreement_status: newStatus };
      const { error } = await supabase.from("applications").update(patch).eq("id", agr.id);

      // Also save buyer signature into form_data via a separate update
      if (action === "accept" && signature) {
        // Fetch current form_data, merge buyer_signature, update
        const { data: current } = await supabase
          .from("applications")
          .select("form_data")
          .eq("id", agr.id)
          .single();
        if (current?.form_data) {
          const updatedFormData = { ...current.form_data, buyer_signature: signature };
          await supabase
            .from("applications")
            .update({ form_data: updatedFormData })
            .eq("id", agr.id);
        }
      }
      if (error) throw error;

      // Notify the seller
      const sellerMsg =
        action === "accept"
          ? lang === "sw"
            ? `Mnunuzi amekubali makubaliano ${agr.application_number}`
            : `Buyer has accepted agreement ${agr.application_number}`
          : lang === "sw"
            ? `Mnunuzi amekataa makubaliano ${agr.application_number}`
            : `Buyer has rejected agreement ${agr.application_number}`;

      await supabase.from("notifications").insert({
        user_id: agr.user_id,
        title:
          action === "accept"
            ? lang === "sw"
              ? "Makubaliano Yamekubaliwa"
              : "Agreement Accepted"
            : lang === "sw"
              ? "Makubaliano Yamekataliwa"
              : "Agreement Rejected",
        message: sellerMsg,
        type: "agreement_update",
      });

      showToast(
        action === "accept"
          ? L("Umekubali makubaliano!", "Agreement accepted!")
          : L("Umekataa makubaliano.", "Agreement rejected."),
        action === "accept" ? "success" : "info",
      );
      fetchAgreements();
    } catch (err: unknown) {
      showToast((err as { message?: string }).message || "Error", "error");
    } finally {
      setProcessingId(null);
    }
  };

  const fetchAgreements = useCallback(async () => {
    if (!user?.id) return;
    // Fetch agreements: try both Swahili and English service names
    // Also check form_data->buyer_id for this user
    const results: AgreementApp[] = [];

    // Query 1: where user is applicant, second party, or target AND service is agreement-type
    const { data: d1 } = await supabase
      .from("applications")
      .select(
        "id, application_number, service_name, status, agreement_status, user_id, second_party_user_id, created_at, form_data, payment_data, approved_at, issued_at, initiator:user_id(first_name, last_name, phone, citizen_id)",
      )
      .or(`user_id.eq.${user.id},second_party_user_id.eq.${user.id},target_user_id.eq.${user.id}`)
      .or(
        "service_name.ilike.%Makubaliano%,service_name.ilike.%Agreement%,service_name.ilike.%Mauzo%,service_name.ilike.%Pango%",
      )
      .order("created_at", { ascending: false });
    if (d1) results.push(...(d1 as unknown as AgreementApp[]));

    // Query 2: where buyer_id in form_data matches this user (fallback if second_party_user_id wasn't set)
    const { data: d2 } = await supabase
      .from("applications")
      .select(
        "id, application_number, service_name, status, agreement_status, user_id, second_party_user_id, created_at, form_data, payment_data, approved_at, issued_at, initiator:user_id(first_name, last_name, phone, citizen_id)",
      )
      .contains("form_data", { buyer_id: user.id })
      .order("created_at", { ascending: false });
    if (d2) {
      for (const app of d2 as unknown as AgreementApp[]) {
        if (!results.find((r) => r.id === app.id)) results.push(app);
      }
    }

    // Query 3: also check tenant_id in form_data
    const { data: d3 } = await supabase
      .from("applications")
      .select(
        "id, application_number, service_name, status, agreement_status, user_id, second_party_user_id, created_at, form_data, payment_data, approved_at, issued_at, initiator:user_id(first_name, last_name, phone, citizen_id)",
      )
      .contains("form_data", { tenant_id: user.id })
      .order("created_at", { ascending: false });
    if (d3) {
      for (const app of d3 as unknown as AgreementApp[]) {
        if (!results.find((r) => r.id === app.id)) results.push(app);
      }
    }

    setAgreementApps(results);
  }, [user?.id]);

  useEffect(() => {
    fetchRegs();
    fetchAgreements();
  }, [fetchRegs, fetchAgreements]);

  // ─── Address cascade ────────────────────────────────────────────────────
  const districts = region
    ? TANZANIA_ADDRESS_DATA.find((r) => r.name === region)?.districts.map((d) => d.name) || []
    : [];
  const wards =
    region && district
      ? TANZANIA_ADDRESS_DATA.find((r) => r.name === region)?.districts.find(
          (d) => d.name === district,
        )?.wards || []
      : [];

  // ─── Helpers ────────────────────────────────────────────────────────────
  const clrErr = (k: string) =>
    setErrors((p) => {
      const n = { ...p };
      delete n[k];
      return n;
    });
  const err = (k: string) => errors[k];

  const handleDocSelect = (file: File, setter: (d: UploadedDoc | null) => void): string | null => {
    if (!ALLOWED_DOCS.includes(file.type))
      return L("Aina ya faili haikushukuliwa. Tumia JPG, PNG, au PDF", "Invalid file type");
    if (file.size > MAX_DOC_SIZE)
      return L("Faili kubwa sana. Upeo ni 5MB", "File too large. Max 5MB");
    setter({ file, preview: URL.createObjectURL(file) });
    return null;
  };

  // ─── Validation ─────────────────────────────────────────────────────────
  const validate = (): boolean => {
    const e: Record<string, string> = {};
    if (step === "type") {
      if (!bizType) e.bizType = L("Chagua aina ya usajili", "Select registration type");
    }
    if (step === "business") {
      if (!businessName.trim())
        e.businessName = L("Jina la biashara linahitajika", "Business name required");
      if (!tin.trim()) e.tin = L("Namba ya TIN inahitajika", "TIN number required");
      if (!description.trim() || description.length < 20)
        e.description = L(
          "Maelezo (angalau herufi 20) yanahitajika",
          "Description (at least 20 chars) required",
        );
      if (!specialization) e.specialization = L("Chagua utaalamu", "Select specialization");
      if (!experienceYears || parseInt(experienceYears) < 0)
        e.experienceYears = L(
          "Idadi ya miaka ya uzoefu inahitajika",
          "Years of experience required",
        );
    }
    if (step === "address") {
      if (!phone.trim()) e.phone = L("Simu inahitajika", "Phone required");
      if (!email.trim()) e.email = L("Barua pepe inahitajika", "Email required");
      if (!region) e.region = L("Mkoa unahitajika", "Region required");
      if (!district) e.district = L("Wilaya inahitajika", "District required");
      if (!ward) e.ward = L("Kata inahitajika", "Ward required");
    }
    if (step === "documents") {
      if (!idDoc) e.idDoc = L("Picha ya kitambulisho inahitajika", "ID document required");
      if (!proofDoc)
        e.proofDoc = L("Uthibitisho wa biashara unahitajika", "Proof of business required");
    }
    if (step === "preview") {
      if (!termsAccepted) e.termsAccepted = L("Lazima ukubali masharti", "Must accept terms");
      if (!dataConfirmed) e.dataConfirmed = L("Lazima uthibitishe taarifa", "Must confirm data");
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  // ─── Submit application ─────────────────────────────────────────────────
  const handleSubmit = async () => {
    if (!validate() || !user) return;
    setSubmitting(true);
    try {
      // 1. Upload documents to Supabase Storage
      const uploadDoc = async (doc: UploadedDoc | null, kind: string): Promise<string | null> => {
        if (!doc) return null;
        const ext = doc.file.name.split(".").pop();
        const path = `business-docs/${user.id}/${kind}_${Date.now()}.${ext}`;
        const { error: upErr } = await supabase.storage
          .from("documents")
          .upload(path, doc.file, { upsert: true });
        if (upErr) {
          console.warn("upload err", upErr);
          return null;
        }
        const {
          data: { publicUrl },
        } = supabase.storage.from("documents").getPublicUrl(path);
        return publicUrl;
      };

      const [idUrl, proofUrl, photoUrl] = await Promise.all([
        uploadDoc(idDoc, "id"),
        uploadDoc(proofDoc, "proof"),
        uploadDoc(photoDoc, "photo"),
      ]);

      // 2. Insert into business_registrations
      const { error } = await supabase.from("business_registrations").insert({
        user_id: user.id,
        business_type: bizType,
        business_name: businessName,
        description: `${description}\n\nTIN: ${tin}`,
        experience_years: parseInt(experienceYears) || 0,
        specialization,
        region,
        district,
        ward,
        street,
        phone,
        alt_phone: altPhone || null,
        email,
        id_document_url: idUrl,
        proof_document_url: proofUrl,
        photo_url: photoUrl,
        status: "pending",
      });
      if (error) throw error;

      showToast(
        L(
          "Ombi limewasilishwa. Wafanyakazi watakagua na kuthibitisha.",
          "Application submitted. Staff will review and approve.",
        ),
        "success",
      );
      setApplying(false);
      setStep("type");
      // reset form
      setBizType("");
      setBusinessName("");
      setTin("");
      setDescription("");
      setExperienceYears("");
      setSpecialization("");
      setIdDoc(null);
      setProofDoc(null);
      setPhotoDoc(null);
      setTermsAccepted(false);
      setDataConfirmed(false);
      fetchRegs();
    } catch (e) {
      console.error("submit error", e);
      showToast(
        L("Imeshindwa kuwasilisha. Jaribu tena.", "Failed to submit. Please try again."),
        "error",
      );
    } finally {
      setSubmitting(false);
    }
  };

  // ─── Derived state ──────────────────────────────────────────────────────
  const approvedRegs = regs.filter((r) => r.status === "approved");
  const pendingRegs = regs.filter((r) => r.status === "pending");
  const rejectedRegs = regs.filter((r) => r.status === "rejected");
  const suspendedRegs = regs.filter((r) => r.status === "suspended");
  const hasAnyReg = regs.length > 0;
  const canApplyNew = !pendingRegs.length; // can't apply if one is already pending

  // ─── Loading ────────────────────────────────────────────────────────────
  if (loadingRegs) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 size={36} className="animate-spin text-stone-400" />
      </div>
    );
  }

  // ─── APPLICATION FORM (multi-step) ──────────────────────────────────────
  if (applying) {
    const STEPS: { key: FormStep; sw: string; en: string }[] = [
      { key: "type", sw: "Aina", en: "Type" },
      { key: "business", sw: "Biashara", en: "Business" },
      { key: "address", sw: "Anwani", en: "Address" },
      { key: "documents", sw: "Nyaraka", en: "Documents" },
      { key: "preview", sw: "Hakiki", en: "Preview" },
    ];
    const stepIdx = STEPS.findIndex((s) => s.key === step);
    const progress = ((stepIdx + 1) / STEPS.length) * 100;
    const goNext = () => {
      if (validate()) {
        const n = STEPS[stepIdx + 1];
        if (n) setStep(n.key);
      }
    };
    const goPrev = () => {
      const p = STEPS[stepIdx - 1];
      if (p) setStep(p.key);
    };
    const cancelApp = () => {
      setApplying(false);
      setStep("type");
    };

    const selectedType = BIZ_TYPES.find((t) => t.value === bizType);
    const inputCls = (name: string) =>
      `w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-stone-500 focus:border-stone-500 outline-none transition-all bg-white text-sm ${err(name) ? "border-red-400 bg-red-50" : "border-stone-200"}`;
    const lbl = "block text-xs font-bold text-stone-600 uppercase tracking-wider mb-1.5";

    return (
      <div className="max-w-3xl mx-auto px-3 sm:px-6 py-6 space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-black text-stone-900 mb-1">
              {L("Maombi ya Usajili wa Biashara", "Business Registration Application")}
            </h1>
            <p className="text-sm text-stone-500">
              {L(
                "Jaza fomu kwa ukamilifu. Wafanyakazi watakagua.",
                "Complete the form. Staff will review.",
              )}
            </p>
          </div>
          <button
            onClick={cancelApp}
            aria-label={L("Ghairi", "Cancel")}
            title={L("Ghairi", "Cancel")}
            className="p-2 text-stone-400 hover:text-stone-600 hover:bg-stone-100 rounded-lg"
          >
            <X size={20} />
          </button>
        </div>

        {/* Progress */}
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-stone-100">
          <div className="flex justify-between mb-2">
            {STEPS.map((s, i) => (
              <div
                key={s.key}
                className={`flex flex-col items-center ${i <= stepIdx ? "text-stone-700" : "text-stone-300"}`}
              >
                <div
                  className={`w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center font-bold text-[10px] sm:text-xs border-2 transition-all
                  ${
                    i < stepIdx
                      ? "bg-stone-700 border-stone-700 text-white"
                      : i === stepIdx
                        ? "bg-stone-50 border-stone-700 text-stone-700"
                        : "bg-stone-100 border-stone-200 text-stone-400"
                  }`}
                >
                  {i < stepIdx ? <Check size={12} /> : i + 1}
                </div>
                <span className="text-[8px] sm:text-[9px] font-semibold mt-0.5 hidden sm:block">
                  {lang === "sw" ? s.sw : s.en}
                </span>
              </div>
            ))}
          </div>
          <div className="w-full bg-stone-200 h-1.5 rounded-full overflow-hidden">
            <ProgressFill
              progress={progress}
              className="bg-linear-to-r from-stone-600 to-stone-700 h-1.5 rounded-full transition-all duration-500"
            />
          </div>
        </div>

        {/* Step content */}
        <div className="bg-white rounded-2xl p-5 sm:p-6 shadow-sm border border-stone-100">
          {/* STEP 1 — TYPE */}
          {step === "type" && (
            <div className="space-y-5">
              <div>
                <h2 className="text-lg font-black text-stone-900 mb-1">
                  {L("Chagua Aina ya Usajili", "Choose Registration Type")}
                </h2>
                <p className="text-sm text-stone-500">
                  {L(
                    "Unaweza kuomba aina zaidi ya moja baadaye",
                    "You can apply for more types later",
                  )}
                </p>
              </div>

              <div className="grid grid-cols-1 gap-3">
                {BIZ_TYPES.map((t) => {
                  const Icon = t.icon;
                  const exists = regs.find((r) => r.business_type === t.value);
                  const disabled = exists?.status === "approved" || exists?.status === "pending";
                  return (
                    <button
                      key={t.value}
                      type="button"
                      disabled={disabled}
                      onClick={() => {
                        if (!disabled) {
                          setBizType(t.value);
                          clrErr("bizType");
                        }
                      }}
                      className={`relative p-4 rounded-xl border-2 text-left transition-all ${
                        disabled
                          ? "border-stone-100 bg-stone-50 cursor-not-allowed opacity-60"
                          : bizType === t.value
                            ? `${t.borderColor} ${t.bgColor}`
                            : "border-stone-200 bg-white hover:border-stone-300"
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <div
                          className={`w-10 h-10 rounded-xl bg-linear-to-br ${t.color} flex items-center justify-center shrink-0`}
                        >
                          <Icon size={20} className="text-white" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h3
                              className={`font-black ${bizType === t.value ? t.textColor : "text-stone-800"}`}
                            >
                              {lang === "sw" ? t.sw : t.en}
                            </h3>
                            {exists?.status === "approved" && (
                              <span className="text-[9px] font-black text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">
                                ✓ {L("UMETHIBITISHWA", "APPROVED")}
                              </span>
                            )}
                            {exists?.status === "pending" && (
                              <span className="text-[9px] font-black text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full">
                                ⏳ {L("INASUBIRI", "PENDING")}
                              </span>
                            )}
                            {exists?.status === "rejected" && (
                              <span className="text-[9px] font-black text-red-700 bg-red-100 px-2 py-0.5 rounded-full">
                                ✗ {L("IMEKATALIWA", "REJECTED")}
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-stone-500 mt-1">
                            {lang === "sw" ? t.descSw : t.descEn}
                          </p>
                          <div className="flex gap-1 mt-2 flex-wrap">
                            {t.services.map((s) => (
                              <span
                                key={s}
                                className="text-[9px] font-bold text-stone-500 bg-stone-100 px-2 py-0.5 rounded"
                              >
                                {s}
                              </span>
                            ))}
                          </div>
                        </div>
                        {bizType === t.value && !disabled && (
                          <CheckCircle size={20} className={t.textColor} />
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
              {err("bizType") && (
                <p className="text-red-500 text-xs flex items-center gap-1">
                  <AlertCircle size={11} />
                  {err("bizType")}
                </p>
              )}
            </div>
          )}

          {/* STEP 2 — BUSINESS */}
          {step === "business" && selectedType && (
            <div className="space-y-5">
              <div
                className={`p-3 rounded-xl ${selectedType.bgColor} ${selectedType.borderColor} border flex items-center gap-3`}
              >
                <selectedType.icon size={18} className={selectedType.textColor} />
                <p className={`text-sm font-bold ${selectedType.textColor}`}>
                  {L("Aina:", "Type:")} {lang === "sw" ? selectedType.sw : selectedType.en}
                </p>
              </div>

              <div>
                <label htmlFor="biz-name" className={lbl}>
                  {L("Jina la Biashara / Kampuni", "Business / Company Name")}{" "}
                  <span className="text-red-500">*</span>
                </label>
                <input
                  id="biz-name"
                  value={businessName}
                  onChange={(e) => {
                    setBusinessName(e.target.value);
                    clrErr("businessName");
                  }}
                  placeholder={L(
                    "Mfano: ABC Properties, Mauzo ya Mbazza",
                    "E.g. ABC Properties, Mbazza Trading",
                  )}
                  className={inputCls("businessName")}
                />
                {err("businessName") && (
                  <p className="text-red-500 text-xs mt-1 flex items-center gap-1">
                    <AlertCircle size={11} />
                    {err("businessName")}
                  </p>
                )}
              </div>

              <div>
                <label htmlFor="biz-tin" className={lbl}>
                  {L("Namba ya TIN", "TIN Number")} <span className="text-red-500">*</span>
                </label>
                <input
                  id="biz-tin"
                  value={tin}
                  onChange={(e) => {
                    setTin(e.target.value);
                    clrErr("tin");
                  }}
                  placeholder="XXX-XXX-XXX"
                  className={inputCls("tin")}
                />
                <p className="text-xs text-stone-400 mt-1">
                  {L("Tax Identification Number kutoka TRA", "Tax Identification Number from TRA")}
                </p>
                {err("tin") && (
                  <p className="text-red-500 text-xs mt-1 flex items-center gap-1">
                    <AlertCircle size={11} />
                    {err("tin")}
                  </p>
                )}
              </div>

              <div>
                <label htmlFor="biz-desc" className={lbl}>
                  {L("Maelezo ya Biashara", "Business Description")}{" "}
                  <span className="text-red-500">*</span>
                </label>
                <textarea
                  id="biz-desc"
                  value={description}
                  onChange={(e) => {
                    setDescription(e.target.value);
                    clrErr("description");
                  }}
                  rows={4}
                  placeholder={L(
                    "Eleza biashara yako, unachofanya, na kwa nini unaomba usajili huu...",
                    "Describe your business, what you do, and why you are applying for this registration...",
                  )}
                  className={`${inputCls("description")} resize-none`}
                />
                <p className="text-xs text-stone-400 mt-1">
                  {description.length} / 500 {L("herufi", "characters")} (
                  {L("angalau 20", "min 20")})
                </p>
                {err("description") && (
                  <p className="text-red-500 text-xs mt-1 flex items-center gap-1">
                    <AlertCircle size={11} />
                    {err("description")}
                  </p>
                )}
              </div>

              <div>
                <label htmlFor="biz-spec" className={lbl}>
                  {L("Utaalamu", "Specialization")} <span className="text-red-500">*</span>
                </label>
                <select
                  id="biz-spec"
                  value={specialization}
                  onChange={(e) => {
                    setSpecialization(e.target.value);
                    clrErr("specialization");
                  }}
                  aria-label={L("Utaalamu", "Specialization")}
                  title={L("Utaalamu", "Specialization")}
                  className={inputCls("specialization")}
                >
                  <option value="">{L("Chagua", "Select")}</option>
                  {SPECIALIZATIONS[bizType as BusinessType]?.map((s) => (
                    <option key={s.value} value={s.value}>
                      {lang === "sw" ? s.sw : s.en}
                    </option>
                  ))}
                </select>
                {err("specialization") && (
                  <p className="text-red-500 text-xs mt-1 flex items-center gap-1">
                    <AlertCircle size={11} />
                    {err("specialization")}
                  </p>
                )}
              </div>

              <div>
                <label htmlFor="biz-exp" className={lbl}>
                  {L("Miaka ya Uzoefu", "Years of Experience")}{" "}
                  <span className="text-red-500">*</span>
                </label>
                <input
                  id="biz-exp"
                  type="number"
                  value={experienceYears}
                  onChange={(e) => {
                    setExperienceYears(e.target.value);
                    clrErr("experienceYears");
                  }}
                  placeholder="0"
                  min="0"
                  className={inputCls("experienceYears")}
                />
                {err("experienceYears") && (
                  <p className="text-red-500 text-xs mt-1 flex items-center gap-1">
                    <AlertCircle size={11} />
                    {err("experienceYears")}
                  </p>
                )}
              </div>
            </div>
          )}

          {/* STEP 3 — ADDRESS */}
          {step === "address" && (
            <div className="space-y-5">
              <h2 className="text-lg font-black text-stone-900">
                {L("Mawasiliano na Anwani", "Contact & Address")}
              </h2>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label htmlFor="biz-phone" className={lbl}>
                    {L("Simu Kuu", "Primary Phone")} <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="biz-phone"
                    value={phone}
                    onChange={(e) => {
                      setPhone(e.target.value);
                      clrErr("phone");
                    }}
                    placeholder="+255 7XX XXX XXX"
                    className={inputCls("phone")}
                  />
                  {err("phone") && (
                    <p className="text-red-500 text-xs mt-1 flex items-center gap-1">
                      <AlertCircle size={11} />
                      {err("phone")}
                    </p>
                  )}
                </div>
                <div>
                  <label htmlFor="biz-alt-phone" className={lbl}>
                    {L("Simu Mbadala (Hiari)", "Alternative Phone (Optional)")}
                  </label>
                  <input
                    id="biz-alt-phone"
                    value={altPhone}
                    onChange={(e) => setAltPhone(e.target.value)}
                    placeholder="+255 7XX XXX XXX"
                    className={inputCls("altPhone")}
                  />
                </div>
              </div>

              <div>
                <label htmlFor="biz-email" className={lbl}>
                  {L("Barua Pepe ya Biashara", "Business Email")}{" "}
                  <span className="text-red-500">*</span>
                </label>
                <input
                  id="biz-email"
                  type="email"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    clrErr("email");
                  }}
                  placeholder="business@example.com"
                  className={inputCls("email")}
                />
                {err("email") && (
                  <p className="text-red-500 text-xs mt-1 flex items-center gap-1">
                    <AlertCircle size={11} />
                    {err("email")}
                  </p>
                )}
              </div>

              <div>
                <label htmlFor="biz-region" className={lbl}>
                  {L("Mkoa", "Region")} <span className="text-red-500">*</span>
                </label>
                <select
                  id="biz-region"
                  value={region}
                  onChange={(e) => {
                    setRegion(e.target.value);
                    setDistrict("");
                    setWard("");
                    clrErr("region");
                  }}
                  aria-label={L("Mkoa", "Region")}
                  title={L("Mkoa", "Region")}
                  className={inputCls("region")}
                >
                  <option value="">{L("Chagua Mkoa", "Select Region")}</option>
                  {TANZANIA_ADDRESS_DATA.map((r) => (
                    <option key={r.name} value={r.name}>
                      {r.name}
                    </option>
                  ))}
                </select>
                {err("region") && (
                  <p className="text-red-500 text-xs mt-1 flex items-center gap-1">
                    <AlertCircle size={11} />
                    {err("region")}
                  </p>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label htmlFor="biz-district" className={lbl}>
                    {L("Wilaya", "District")} <span className="text-red-500">*</span>
                  </label>
                  <select
                    id="biz-district"
                    value={district}
                    onChange={(e) => {
                      setDistrict(e.target.value);
                      setWard("");
                      clrErr("district");
                    }}
                    aria-label={L("Wilaya", "District")}
                    title={L("Wilaya", "District")}
                    disabled={!region}
                    className={`${inputCls("district")} disabled:bg-stone-50`}
                  >
                    <option value="">{L("Chagua Wilaya", "Select District")}</option>
                    {districts.map((d) => (
                      <option key={d} value={d}>
                        {d}
                      </option>
                    ))}
                  </select>
                  {err("district") && (
                    <p className="text-red-500 text-xs mt-1 flex items-center gap-1">
                      <AlertCircle size={11} />
                      {err("district")}
                    </p>
                  )}
                </div>
                <div>
                  <label htmlFor="biz-ward" className={lbl}>
                    {L("Kata", "Ward")} <span className="text-red-500">*</span>
                  </label>
                  <select
                    id="biz-ward"
                    value={ward}
                    onChange={(e) => {
                      setWard(e.target.value);
                      clrErr("ward");
                    }}
                    aria-label={L("Kata", "Ward")}
                    title={L("Kata", "Ward")}
                    disabled={!district}
                    className={`${inputCls("ward")} disabled:bg-stone-50`}
                  >
                    <option value="">{L("Chagua Kata", "Select Ward")}</option>
                    {wards.map((w) => (
                      <option key={w} value={w}>
                        {w}
                      </option>
                    ))}
                  </select>
                  {err("ward") && (
                    <p className="text-red-500 text-xs mt-1 flex items-center gap-1">
                      <AlertCircle size={11} />
                      {err("ward")}
                    </p>
                  )}
                </div>
              </div>

              <div>
                <label htmlFor="biz-street" className={lbl}>
                  {L("Mtaa / Kijiji (Hiari)", "Street / Village (Optional)")}
                </label>
                <input
                  id="biz-street"
                  value={street}
                  onChange={(e) => setStreet(e.target.value)}
                  placeholder={L("Mfano: Mtaa wa Uhuru", "E.g. Uhuru Street")}
                  className={inputCls("street")}
                />
              </div>
            </div>
          )}

          {/* STEP 4 — DOCUMENTS */}
          {step === "documents" && (
            <div className="space-y-5">
              <h2 className="text-lg font-black text-stone-900">{L("Nyaraka", "Documents")}</h2>
              <p className="text-sm text-stone-500">
                {L("JPG, PNG, au PDF. Upeo wa 5MB kila moja.", "JPG, PNG or PDF. Max 5MB each.")}
              </p>

              {[
                {
                  key: "id",
                  doc: idDoc,
                  setter: setIdDoc,
                  ref: idDocRef,
                  required: true,
                  swLabel: "Kitambulisho cha NIDA",
                  enLabel: "NIDA ID Document",
                  errKey: "idDoc",
                  swHint: "Picha wazi ya pande zote mbili",
                  enHint: "Clear photo of both sides",
                },
                {
                  key: "proof",
                  doc: proofDoc,
                  setter: setProofDoc,
                  ref: proofDocRef,
                  required: true,
                  swLabel: "Cheti cha TIN au Leseni",
                  enLabel: "TIN Certificate or Business Licence",
                  errKey: "proofDoc",
                  swHint: "Cheti kutoka TRA au BRELA",
                  enHint: "Certificate from TRA or BRELA",
                },
                {
                  key: "photo",
                  doc: photoDoc,
                  setter: setPhotoDoc,
                  ref: photoDocRef,
                  required: false,
                  swLabel: "Picha ya Wewe (Hiari)",
                  enLabel: "Photo of Yourself (Optional)",
                  errKey: "photoDoc",
                  swHint: "Picha ya uso wako kwa utambulisho",
                  enHint: "Clear photo of your face for verification",
                },
              ].map((item) => (
                <div key={item.key}>
                  <label className={lbl}>
                    {lang === "sw" ? item.swLabel : item.enLabel}
                    {item.required && <span className="text-red-500 ml-0.5">*</span>}
                  </label>
                  <div
                    onClick={() => item.ref.current?.click()}
                    className={`border-2 border-dashed rounded-xl p-4 cursor-pointer transition-all text-center
                      ${
                        err(item.errKey)
                          ? "border-red-400 bg-red-50"
                          : item.doc
                            ? "border-emerald-400 bg-emerald-50"
                            : "border-stone-300 hover:border-stone-400 hover:bg-stone-50/40"
                      }`}
                  >
                    {item.doc ? (
                      <div className="flex items-center gap-3 bg-white rounded-lg p-2">
                        {item.doc.file.type.startsWith("image/") ? (
                          <img
                            src={item.doc.preview}
                            className="w-12 h-12 object-cover rounded-lg shrink-0"
                            alt=""
                          />
                        ) : (
                          <div className="w-12 h-12 bg-stone-100 rounded-lg flex items-center justify-center shrink-0">
                            <FileText size={20} className="text-stone-600" />
                          </div>
                        )}
                        <div className="flex-1 min-w-0 text-left">
                          <p className="text-xs font-bold text-stone-700 truncate">
                            {item.doc.file.name}
                          </p>
                          <p className="text-xs text-stone-400">
                            {(item.doc.file.size / 1024).toFixed(0)} KB
                          </p>
                        </div>
                        <button
                          type="button"
                          aria-label={L("Ondoa faili", "Remove file")}
                          title={L("Ondoa faili", "Remove file")}
                          onClick={(e) => {
                            e.stopPropagation();
                            URL.revokeObjectURL(item.doc!.preview);
                            item.setter(null);
                          }}
                          className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-full shrink-0"
                        >
                          <X size={13} />
                        </button>
                      </div>
                    ) : (
                      <div className="py-3">
                        <Upload size={22} className="mx-auto text-stone-400 mb-1" />
                        <p className="text-sm font-semibold text-stone-600">
                          {L("Bonyeza kupakia", "Click to upload")}
                        </p>
                        <p className="text-xs text-stone-400 mt-0.5">
                          {lang === "sw" ? item.swHint : item.enHint}
                        </p>
                      </div>
                    )}
                  </div>
                  <input
                    ref={item.ref as React.RefObject<HTMLInputElement>}
                    type="file"
                    aria-label={lang === "sw" ? item.swLabel : item.enLabel}
                    accept="image/jpeg,image/png,image/webp,application/pdf"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (!f) return;
                      const er = handleDocSelect(f, item.setter);
                      if (er) showToast(er, "error");
                      else clrErr(item.errKey);
                      e.target.value = "";
                    }}
                    className="hidden"
                  />
                  {err(item.errKey) && (
                    <p className="text-red-500 text-xs mt-1 flex items-center gap-1">
                      <AlertCircle size={11} />
                      {err(item.errKey)}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* STEP 5 — PREVIEW */}
          {step === "preview" && selectedType && (
            <div className="space-y-4">
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex gap-3">
                <Eye size={18} className="text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold text-amber-800 text-sm">
                    {L("Hakiki Kabla ya Kuwasilisha", "Review Before Submitting")}
                  </p>
                  <p className="text-xs text-amber-700 mt-0.5">
                    {L(
                      'Bonyeza "Hariri" kubadilisha sehemu yoyote',
                      'Click "Edit" to change any section',
                    )}
                  </p>
                </div>
              </div>

              {[
                {
                  title: L("Aina ya Usajili", "Registration Type"),
                  stepKey: "type" as FormStep,
                  rows: [[L("Aina", "Type"), lang === "sw" ? selectedType.sw : selectedType.en]],
                },
                {
                  title: L("Biashara", "Business"),
                  stepKey: "business" as FormStep,
                  rows: [
                    [L("Jina", "Name"), businessName],
                    ["TIN", tin],
                    [
                      L("Utaalamu", "Specialization"),
                      SPECIALIZATIONS[bizType as BusinessType]?.find(
                        (s) => s.value === specialization,
                      )?.[lang === "sw" ? "sw" : "en"] || "—",
                    ],
                    [L("Uzoefu", "Experience"), `${experienceYears} ${L("miaka", "years")}`],
                  ],
                },
                {
                  title: L("Mawasiliano", "Contact & Address"),
                  stepKey: "address" as FormStep,
                  rows: [
                    [L("Simu", "Phone"), phone],
                    ["Email", email],
                    [L("Mkoa", "Region"), region],
                    [L("Wilaya", "District"), district],
                    [L("Kata", "Ward"), ward],
                  ],
                },
                {
                  title: L("Nyaraka", "Documents"),
                  stepKey: "documents" as FormStep,
                  rows: [
                    [L("NIDA", "ID"), idDoc?.file.name || "—"],
                    [L("Cheti", "Certificate"), proofDoc?.file.name || "—"],
                    [L("Picha", "Photo"), photoDoc?.file.name || L("Hakuna", "None")],
                  ],
                },
              ].map((sec) => (
                <div
                  key={sec.stepKey}
                  className="bg-white border border-stone-100 rounded-xl overflow-hidden shadow-sm"
                >
                  <div className="bg-stone-50 px-4 py-2.5 border-b border-stone-100 flex items-center justify-between">
                    <h4 className="font-bold text-stone-800 text-sm">{sec.title}</h4>
                    <button
                      type="button"
                      onClick={() => setStep(sec.stepKey)}
                      className="flex items-center gap-1 text-xs text-stone-600 hover:text-stone-800 font-bold hover:bg-stone-200 px-2 py-1 rounded-lg transition-colors"
                    >
                      <Edit2 size={11} /> {L("Hariri", "Edit")}
                    </button>
                  </div>
                  <div className="p-4 space-y-1.5">
                    {sec.rows.map(([l, v]) => (
                      <div key={String(l)} className="flex justify-between gap-3">
                        <span className="text-xs text-stone-500">{l}</span>
                        <span className="text-xs font-bold text-stone-800 text-right">{v}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}

              {/* Description preview */}
              <div className="bg-white border border-stone-100 rounded-xl p-4">
                <p className="text-xs font-bold text-stone-500 mb-1">
                  {L("Maelezo ya Biashara", "Description")}
                </p>
                <p className="text-sm text-stone-700">{description}</p>
              </div>

              {/* Consent */}
              <div className="space-y-3">
                <p className="text-xs font-black text-stone-600 uppercase tracking-wider">
                  {L("IDHINI", "CONSENT")}
                </p>
                {[
                  {
                    state: termsAccepted,
                    set: setTermsAccepted,
                    key: "termsAccepted",
                    sw: "Nathibitisha kwamba taarifa zote nilizotoa ni za kweli na sahihi. Najua kwamba uongo unaweza kusababisha kufungiwa akaunti.",
                    en: "I confirm that all information I have provided is true and accurate. I understand that false information may result in account suspension.",
                  },
                  {
                    state: dataConfirmed,
                    set: setDataConfirmed,
                    key: "dataConfirmed",
                    sw: "Ninakubali kuwa Ofisi ya Serikali ya Mtaa ikague taarifa zangu na ithibitishe haki ya kufanya biashara hii.",
                    en: "I agree that the Local Government Office may verify my details and confirm my right to conduct this business.",
                  },
                ].map((item) => (
                  <label
                    key={item.key}
                    className={`flex items-start gap-3 cursor-pointer rounded-xl p-3 border transition-colors
                    ${item.state ? "bg-stone-100 border-stone-400" : "bg-stone-50 border-stone-200 hover:bg-stone-100/50"}`}
                  >
                    <input
                      type="checkbox"
                      checked={item.state}
                      onChange={(e) => {
                        item.set(e.target.checked);
                        clrErr(item.key);
                      }}
                      className="w-4 h-4 mt-0.5 rounded shrink-0"
                    />
                    <span className="text-xs text-stone-700 font-medium leading-relaxed">
                      {lang === "sw" ? item.sw : item.en}
                    </span>
                  </label>
                ))}
                {(errors.termsAccepted || errors.dataConfirmed) && (
                  <p className="text-red-500 text-xs flex items-center gap-1">
                    <AlertCircle size={11} /> {errors.termsAccepted || errors.dataConfirmed}
                  </p>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Nav buttons */}
        <div className="flex gap-3">
          {stepIdx > 0 && (
            <button
              type="button"
              onClick={goPrev}
              className="flex-1 py-3.5 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-xl font-bold transition-all flex items-center justify-center gap-2 text-sm"
            >
              <ArrowLeft size={17} /> {L("Nyuma", "Previous")}
            </button>
          )}
          {step !== "preview" ? (
            <button
              type="button"
              onClick={goNext}
              className="flex-1 py-3.5 bg-linear-to-r from-stone-700 to-stone-800 hover:from-stone-800 hover:to-stone-900 text-white rounded-xl font-bold shadow-lg transition-all flex items-center justify-center gap-2 text-sm"
            >
              {step === "documents" ? (
                <>
                  <Eye size={17} /> {L("Hakiki", "Preview")}
                </>
              ) : (
                <>
                  {L("Endelea", "Continue")} <ArrowRight size={17} />
                </>
              )}
            </button>
          ) : (
            <button
              type="button"
              onClick={handleSubmit}
              disabled={submitting}
              className="flex-1 py-3.5 bg-linear-to-r from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800 text-white rounded-xl font-bold shadow-lg transition-all flex items-center justify-center gap-2 text-sm disabled:opacity-60"
            >
              {submitting ? (
                <>
                  <Loader2 size={17} className="animate-spin" />{" "}
                  {L("Inawasilisha...", "Submitting...")}
                </>
              ) : (
                <>
                  <CheckCircle size={17} /> {L("Wasilisha Maombi", "Submit Application")}
                </>
              )}
            </button>
          )}
        </div>
      </div>
    );
  }

  // ─── DASHBOARD / STATUS PAGE ─────────────────────────────────────────────
  return (
    <div className="max-w-4xl mx-auto px-3 sm:px-6 py-6 space-y-6">
      {/* Hero */}
      <div className="bg-linear-to-br from-stone-800 via-stone-700 to-stone-800 rounded-3xl p-6 sm:p-8 text-white shadow-xl">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-white/10 backdrop-blur flex items-center justify-center shrink-0">
            <Briefcase size={24} className="text-white" />
          </div>
          <div className="flex-1">
            <h1 className="text-xl sm:text-2xl font-black mb-1">
              {L("Lango la Biashara", "Business Portal")}
            </h1>
            <p className="text-sm text-stone-300">
              {approvedRegs.length > 0
                ? L(
                    "Karibu! Tumia kibandiko kuanzisha makubaliano.",
                    "Welcome! Use the buttons below to initiate agreements.",
                  )
                : L(
                    "Omba kuwa Muuzaji, Mpangishaji, au Dalali ili kutumia huduma za makubaliano.",
                    "Apply to become a Seller, Landlord or Broker to use agreement services.",
                  )}
            </p>
          </div>
        </div>
      </div>

      {/* Agreements Filed With This User — show even without registration */}
      {agreementApps.filter((a) => a.user_id !== user?.id).length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5 space-y-3">
          <h2 className="text-base font-bold text-amber-900 flex items-center gap-2">
            <AlertCircle size={18} className="text-amber-600" />
            {lang === "sw" ? "Makubaliano Yanayokusubiri" : "Agreements Pending Your Action"}
          </h2>
          <div className="space-y-2">
            {agreementApps
              .filter((a) => a.user_id !== user?.id)
              .map((agr) => {
                const statusColor =
                  agr.status === "issued"
                    ? "bg-emerald-100 text-emerald-800"
                    : agr.status === "rejected"
                      ? "bg-red-100 text-red-800"
                      : agr.status === "submitted"
                        ? "bg-amber-100 text-amber-800"
                        : "bg-blue-100 text-blue-800";
                return (
                  <div key={agr.id} onClick={() => setViewingAgr(agr)} className="bg-white rounded-xl p-4 border border-amber-100 cursor-pointer hover:border-amber-300 hover:shadow-sm transition-all">
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs font-mono text-stone-400">
                            {agr.application_number}
                          </span>
                          <span
                            className={cn(
                              "px-2 py-0.5 text-[10px] font-bold rounded-md uppercase",
                              statusColor,
                            )}
                          >
                            {agr.status}
                          </span>
                          {agr.agreement_status && (
                            <span
                              className={cn(
                                "px-2 py-0.5 text-[10px] font-bold rounded-md uppercase",
                                agr.agreement_status === "buyer_accepted"
                                  ? "bg-emerald-100 text-emerald-800"
                                  : agr.agreement_status === "buyer_rejected"
                                    ? "bg-red-100 text-red-800"
                                    : "bg-stone-100 text-stone-600",
                              )}
                            >
                              {agr.agreement_status === "buyer_accepted"
                                ? lang === "sw"
                                  ? "Umekubali"
                                  : "Accepted"
                                : agr.agreement_status === "buyer_rejected"
                                  ? lang === "sw"
                                    ? "Umekataa"
                                    : "Rejected"
                                  : agr.agreement_status}
                            </span>
                          )}
                        </div>
                        <p className="text-sm font-bold text-stone-900">
                          {(agr.service_name || "").replace("Makubaliano ya ", "")}
                        </p>
                        <p className="text-xs text-stone-500 mt-0.5">
                          {lang === "sw" ? "Imetumwa:" : "Filed:"}{" "}
                          {new Date(agr.created_at).toLocaleDateString("sw-TZ")}
                        </p>
                      </div>
                      {/* Accept/Reject buttons — only show if not already responded */}
                      {(!agr.agreement_status || agr.agreement_status === "pending") && (
                        <div className="flex gap-2 shrink-0">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setSigningAgr(agr);
                              setBuyerSignature("");
                            }}
                            disabled={processingId === agr.id}
                            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold disabled:opacity-50 flex items-center gap-1.5"
                          >
                            <CheckCircle size={12} />
                            {lang === "sw" ? "Kubali na Saini" : "Accept & Sign"}
                          </button>
                          <button
                            onClick={(e) => { e.stopPropagation(); handleAgreementAction(agr, "reject"); }}
                            disabled={processingId === agr.id}
                            className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-xl text-xs font-bold disabled:opacity-50 flex items-center gap-1.5"
                          >
                            <X size={12} />
                            {lang === "sw" ? "Kataa" : "Reject"}
                          </button>
                        </div>
                      )}
                      {agr.agreement_status === "buyer_accepted" && (
                        <span className="px-3 py-1.5 bg-emerald-100 text-emerald-800 rounded-xl text-xs font-bold flex items-center gap-1.5">
                          <CheckCircle size={12} />
                          {lang === "sw" ? "Umekubali" : "Accepted"}
                        </span>
                      )}
                      {/* Chat thread for this agreement */}
                    </div>
                    <div className="mt-3">
                      <ApplicationChat
                        applicationId={agr.id}
                        applicationNumber={agr.application_number || ""}
                        applicantId={agr.user_id || ""}
                        lang={lang}
                      />
                    </div>
                  </div>
                );
              })}
          </div>
        </div>
      )}

      {/* User's own agreements (filed by them) */}
      {agreementApps.filter((a) => a.user_id === user?.id).length > 0 && (
        <div className="bg-white border border-stone-200 rounded-2xl p-5 space-y-3">
          <h2 className="text-base font-bold text-stone-800 flex items-center gap-2">
            <FileSignature size={18} className="text-stone-600" />
            {lang === "sw" ? "Makubaliano Niliyoanzisha" : "Agreements I Filed"}
            <span className="text-xs font-bold text-stone-400 bg-stone-100 px-2 py-0.5 rounded-full">
              {agreementApps.filter((a) => a.user_id === user?.id).length}
            </span>
          </h2>
          <div className="space-y-2">
            {agreementApps
              .filter((a) => a.user_id === user?.id)
              .map((agr) => {
                const statusColor =
                  agr.status === "issued"
                    ? "bg-emerald-100 text-emerald-800"
                    : agr.status === "rejected"
                      ? "bg-red-100 text-red-800"
                      : agr.status === "submitted"
                        ? "bg-amber-100 text-amber-800"
                        : "bg-blue-100 text-blue-800";
                return (
                  <div key={agr.id} className="bg-stone-50 rounded-xl p-4 border border-stone-100">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-mono text-stone-400">
                        {agr.application_number}
                      </span>
                      <span
                        className={cn(
                          "px-2 py-0.5 text-[10px] font-bold rounded-md uppercase",
                          statusColor,
                        )}
                      >
                        {agr.status}
                      </span>
                      {agr.agreement_status && (
                        <span className="px-2 py-0.5 text-[10px] font-bold rounded-md bg-stone-100 text-stone-600 uppercase">
                          {agr.agreement_status}
                        </span>
                      )}
                    </div>
                    <p className="text-sm font-bold text-stone-900">
                      {(agr.service_name || "").replace("Makubaliano ya ", "")}
                    </p>
                    <p className="text-xs text-stone-500 mt-0.5">
                      {new Date(agr.created_at).toLocaleDateString("sw-TZ")}
                    </p>
                  </div>
                );
              })}
          </div>
        </div>
      )}

      {/* ── Agreement Detail View (Second Party / Buyer) ── */}
      {viewingAgr && (() => {
        const fd = (viewingAgr.form_data || {}) as Record<string, string>;
        const isPending = !viewingAgr.agreement_status || viewingAgr.agreement_status === "pending";
        const isAccepted = viewingAgr.agreement_status === "buyer_accepted";
        const isSale = (viewingAgr.service_name || "").includes("Mauzo") || (viewingAgr.service_name || "").includes("Sale");
        const L2 = (s: string, e: string) => (lang === "sw" ? s : e);
        const fmtCurrency = (v: unknown) => {
          const n = Number(v);
          return isNaN(n) ? String(v || "—") : `TSh ${n.toLocaleString()}`;
        };
        return (
          <>
            <div className="fixed inset-0 bg-stone-900/40 backdrop-blur-sm z-40" onClick={() => setViewingAgr(null)} />
            <div className="fixed inset-y-0 right-0 w-full sm:w-[600px] max-w-full bg-white shadow-2xl z-50 flex flex-col">
              {/* Header */}
              <div className="px-5 py-4 border-b border-stone-200 flex items-center justify-between shrink-0 bg-emerald-50">
                <div>
                  <p className="text-[10px] font-bold text-stone-400 uppercase tracking-wider">{viewingAgr.service_name}</p>
                  <p className="text-lg font-black text-stone-900">{viewingAgr.application_number}</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`px-2.5 py-1 rounded-full text-xs font-bold border ${isPending ? "bg-amber-50 text-amber-700 border-amber-200" : isAccepted ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-red-50 text-red-700 border-red-200"}`}>
                    {isPending ? L2("Inasubiri", "Pending") : isAccepted ? L2("Imekubaliwa", "Accepted") : L2("Imekataliwa", "Rejected")}
                  </span>
                  <button onClick={() => setViewingAgr(null)} className="p-1.5 text-stone-400 hover:text-stone-800 hover:bg-stone-100 rounded-lg"><X size={20} /></button>
                </div>
              </div>

              {/* Body */}
              <div className="flex-1 overflow-y-auto p-5 space-y-4">
                {/* Parties */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-blue-50 border border-blue-100 rounded-xl p-3">
                    <p className="text-[10px] font-bold text-blue-600 uppercase mb-1">{isSale ? L2("Muuzaji", "Seller") : L2("Mwenye Nyumba", "Landlord")}</p>
                    <p className="font-black text-stone-900 text-sm">{fd.seller_name || fd.landlord_name || (viewingAgr.initiator ? `${viewingAgr.initiator.first_name} ${viewingAgr.initiator.last_name}` : "—")}</p>
                    {viewingAgr.initiator?.phone && <p className="text-xs text-stone-500 mt-1">{viewingAgr.initiator.phone}</p>}
                    {viewingAgr.initiator?.citizen_id && <p className="text-xs text-blue-600 font-mono">{viewingAgr.initiator.citizen_id}</p>}
                  </div>
                  <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-3">
                    <p className="text-[10px] font-bold text-emerald-600 uppercase mb-1">{isSale ? L2("Mnunuzi (Wewe)", "Buyer (You)") : L2("Mpangaji (Wewe)", "Tenant (You)")}</p>
                    <p className="font-black text-stone-900 text-sm">{fd.buyer_name || fd.tenant_name || user?.first_name || "—"}</p>
                  </div>
                </div>

                {/* Agreement Details */}
                <div className="bg-white border border-stone-200 rounded-xl p-4">
                  <p className="text-[10px] font-black text-stone-400 uppercase tracking-wider mb-3">{L2("Maelezo ya Makubaliano", "Agreement Details")}</p>
                  <div className="space-y-2.5">
                    {fd.asset_type && <div className="flex justify-between"><span className="text-xs text-stone-500">{L2("Aina ya Mali", "Asset Type")}</span><span className="text-sm font-bold text-right">{fd.asset_type}</span></div>}
                    {(fd.price || fd.monthly_rent) && <div className="flex justify-between"><span className="text-xs text-stone-500">{isSale ? L2("Bei", "Price") : L2("Kodi/Mwezi", "Monthly Rent")}</span><span className="text-sm font-black text-emerald-700">{fmtCurrency(fd.price || fd.monthly_rent)}</span></div>}
                    {fd.asset_description && <div><span className="text-xs text-stone-500 block mb-1">{L2("Maelezo", "Description")}</span><p className="text-sm text-stone-800 bg-stone-50 rounded-lg p-2">{fd.asset_description}</p></div>}
                    {fd.location && <div className="flex justify-between"><span className="text-xs text-stone-500">{L2("Mahali", "Location")}</span><span className="text-sm font-bold text-right">{fd.location}</span></div>}
                    {fd.duration && <div className="flex justify-between"><span className="text-xs text-stone-500">{L2("Muda", "Duration")}</span><span className="text-sm font-bold">{fd.duration}</span></div>}
                    {fd.start_date && <div className="flex justify-between"><span className="text-xs text-stone-500">{L2("Tarehe ya Kuanza", "Start Date")}</span><span className="text-sm font-bold">{fd.start_date}</span></div>}
                    {fd.end_date && <div className="flex justify-between"><span className="text-xs text-stone-500">{L2("Tarehe ya Mwisho", "End Date")}</span><span className="text-sm font-bold">{fd.end_date}</span></div>}
                    {fd.terms && <div><span className="text-xs text-stone-500 block mb-1">{L2("Masharti", "Terms")}</span><p className="text-sm text-stone-800 bg-stone-50 rounded-lg p-2 whitespace-pre-wrap">{fd.terms}</p></div>}
                    {fd.witness_1 && <div className="flex justify-between"><span className="text-xs text-stone-500">{L2("Shahidi 1", "Witness 1")}</span><span className="text-sm font-bold">{fd.witness_1}</span></div>}
                    {fd.witness_2 && <div className="flex justify-between"><span className="text-xs text-stone-500">{L2("Shahidi 2", "Witness 2")}</span><span className="text-sm font-bold">{fd.witness_2}</span></div>}
                  </div>
                </div>

                {/* Financials */}
                {(fd.total_amount || fd.service_fee || fd.vat_amount) && (
                  <div className="bg-stone-50 border border-stone-200 rounded-xl p-4">
                    <p className="text-[10px] font-black text-stone-400 uppercase tracking-wider mb-2">{L2("Fedha", "Financials")}</p>
                    {fd.total_amount && <div className="flex justify-between"><span className="text-xs text-stone-500">{L2("Jumla", "Total")}</span><span className="text-sm font-black">{fmtCurrency(fd.total_amount)}</span></div>}
                    {fd.vat_amount && <div className="flex justify-between"><span className="text-xs text-stone-500">VAT</span><span className="text-sm font-bold">{fmtCurrency(fd.vat_amount)}</span></div>}
                    {fd.service_fee && <div className="flex justify-between"><span className="text-xs text-stone-500">{L2("Ada", "Fee")}</span><span className="text-sm font-bold">{fmtCurrency(fd.service_fee)}</span></div>}
                  </div>
                )}

                {/* Attachments from form_data */}
                {fd.uploaded_documents && (() => {
                  try {
                    const docs = typeof fd.uploaded_documents === "string" ? JSON.parse(fd.uploaded_documents) : fd.uploaded_documents;
                    if (!Array.isArray(docs) || docs.length === 0) return null;
                    return (
                      <div className="bg-white border border-stone-200 rounded-xl p-4">
                        <p className="text-[10px] font-black text-stone-400 uppercase tracking-wider mb-2">{L2("Viambatisho", "Attachments")} ({docs.length})</p>
                        <div className="space-y-1.5">
                          {docs.map((doc: { name?: string; type?: string; dataUrl?: string }, i: number) => (
                            <a key={i} href={doc.dataUrl || "#"} download={doc.name || `document-${i}`} target="_blank" rel="noopener noreferrer"
                              className="flex items-center gap-2 bg-stone-50 rounded-lg px-3 py-2 text-sm hover:bg-stone-100">
                              {doc.type?.startsWith("image/") ? <img src={doc.dataUrl} alt="" className="w-8 h-8 rounded object-cover" /> : <FileText size={16} className="text-stone-400" />}
                              <span className="flex-1 truncate text-stone-700">{doc.name || `Document ${i + 1}`}</span>
                              <Download size={14} className="text-emerald-600" />
                            </a>
                          ))}
                        </div>
                      </div>
                    );
                  } catch { return null; }
                })()}

                {/* Download Agreement PDF (if issued) */}
                {viewingAgr.status === "issued" && (
                  <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4">
                    <p className="text-[10px] font-black text-emerald-600 uppercase tracking-wider mb-2">{L2("Hati ya Makubaliano", "Agreement Document")}</p>
                    <p className="text-xs text-stone-500 mb-3">{L2("Soma hati kamili ya makubaliano kabla ya kukubali au kukataa.", "Read the full agreement document before accepting or rejecting.")}</p>
                    <button
                      onClick={(e) => { e.stopPropagation(); handleDownloadAgreement(viewingAgr); }}
                      className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-bold flex items-center justify-center gap-2"
                    >
                      <Download size={16} />
                      {L2("Pakua Hati ya Makubaliano", "Download Agreement Document")}
                    </button>
                  </div>
                )}

                {/* Application Chat */}
                <ApplicationChat
                  applicationId={viewingAgr.id}
                  applicationNumber={viewingAgr.application_number || ""}
                  applicantId={viewingAgr.user_id || ""}
                  lang={lang}
                  defaultExpanded
                />
              </div>

              {/* Action Footer */}
              {isPending && (
                <div className="px-5 py-4 border-t border-stone-200 bg-stone-50 shrink-0 space-y-2">
                  <p className="text-[10px] text-stone-500 text-center">{L2("Soma makubaliano kwa makini kabla ya kukubali.", "Read the agreement carefully before accepting.")}</p>
                  <div className="flex gap-3">
                    <button
                      onClick={() => { setViewingAgr(null); setSigningAgr(viewingAgr); setBuyerSignature(""); }}
                      disabled={processingId === viewingAgr.id}
                      className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-sm flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                      <CheckCircle size={16} />
                      {L2("Kubali na Saini", "Accept & Sign")}
                    </button>
                    <button
                      onClick={() => { setViewingAgr(null); handleAgreementAction(viewingAgr, "reject"); }}
                      disabled={processingId === viewingAgr.id}
                      className="px-6 py-3 bg-red-500 hover:bg-red-600 text-white rounded-xl font-bold text-sm flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                      <X size={16} />
                      {L2("Kataa", "Reject")}
                    </button>
                  </div>
                </div>
              )}
              {!isPending && (
                <div className="px-5 py-3 border-t border-stone-100 bg-stone-50 shrink-0">
                  <button onClick={() => setViewingAgr(null)} className="w-full py-2.5 bg-stone-200 hover:bg-stone-300 rounded-xl text-sm font-bold text-stone-700">{L2("Funga", "Close")}</button>
                </div>
              )}
            </div>
          </>
        );
      })()}

      {/* Buyer Signature Modal */}
      {signingAgr && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-black text-stone-900">
                {lang === "sw" ? "Saini Kukubali Makubaliano" : "Sign to Accept Agreement"}
              </h3>
              <button
                onClick={() => setSigningAgr(null)}
                className="p-1.5 text-stone-400 hover:text-stone-600"
              >
                <X size={18} />
              </button>
            </div>
            <div className="bg-stone-50 rounded-xl p-3 text-sm text-stone-600">
              <p className="font-bold">{signingAgr.application_number}</p>
              <p className="text-xs text-stone-500 mt-0.5">
                {(signingAgr.service_name || "").replace("Makubaliano ya ", "")}
              </p>
            </div>
            <div>
              <label className="block text-xs font-bold text-stone-600 uppercase tracking-wider mb-2">
                {lang === "sw" ? "Saini Yako" : "Your Signature"} *
              </label>
              <SignaturePad
                value={buyerSignature}
                onChange={(v: string | null) => setBuyerSignature(v || "")}
                lang={lang}
              />
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setSigningAgr(null)}
                className="flex-1 py-3 border border-stone-200 rounded-xl font-bold text-sm text-stone-600 hover:bg-stone-50"
              >
                {lang === "sw" ? "Ghairi" : "Cancel"}
              </button>
              <button
                onClick={async () => {
                  if (!buyerSignature) {
                    showToast(
                      lang === "sw" ? "Tafadhali saini kwanza" : "Please sign first",
                      "error",
                    );
                    return;
                  }
                  await handleAgreementAction(signingAgr, "accept", buyerSignature);
                  setSigningAgr(null);
                }}
                disabled={!buyerSignature || processingId === signingAgr.id}
                className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-sm disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {processingId === signingAgr.id ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  <CheckCircle size={16} />
                )}
                {lang === "sw" ? "Kubali na Saini" : "Accept & Sign"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* APPROVED — Dashboard with initiate buttons */}
      {approvedRegs.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-black text-stone-800">
              {L("Hadhi Zako Zilizothibitishwa", "Your Approved Roles")}
            </h2>
            <span className="text-xs font-bold text-emerald-700 bg-emerald-100 px-2.5 py-1 rounded-full">
              {approvedRegs.length} {L("hai", "active")}
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {approvedRegs.map((reg) => {
              const meta = BIZ_TYPES.find((t) => t.value === reg.business_type)!;
              const Icon = meta.icon;
              const canStartService = meta.services.length > 0;
              return (
                <div
                  key={reg.id}
                  className={`${meta.bgColor} ${meta.borderColor} border-2 rounded-2xl p-5 space-y-3`}
                >
                  <div className="flex items-start gap-3">
                    <div
                      className={`w-10 h-10 rounded-xl bg-linear-to-br ${meta.color} flex items-center justify-center shrink-0`}
                    >
                      <Icon size={20} className="text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className={`font-black ${meta.textColor}`}>
                          {lang === "sw" ? meta.sw : meta.en}
                        </h3>
                        <span className="text-[9px] font-black text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">
                          ✓ {L("IMETHIBITISHWA", "VERIFIED")}
                        </span>
                      </div>
                      <p className="text-xs text-stone-600 mt-0.5 truncate">{reg.business_name}</p>
                      {reg.business_id && (
                        <p className={`text-[10px] font-mono font-bold ${meta.textColor} mt-1`}>
                          ID: {reg.business_id}
                        </p>
                      )}
                    </div>
                  </div>
                  {canStartService && (
                    <div className="space-y-2 pt-2 border-t border-white/40">
                      <p className="text-[10px] font-black text-stone-500 uppercase tracking-wide">
                        {L("Anzisha Huduma", "Start a Service")}
                      </p>
                      {meta.services.map((serviceName) => (
                        <button
                          key={serviceName}
                          type="button"
                          onClick={() => setView("services")}
                          className="w-full px-3 py-2 bg-white hover:bg-stone-50 rounded-lg flex items-center justify-between gap-2 text-xs font-bold text-stone-700 shadow-sm transition-all"
                        >
                          <span className="flex items-center gap-2">
                            <FileSignature size={13} className={meta.textColor} />
                            {serviceName}
                          </span>
                          <ArrowRight size={13} className="text-stone-400" />
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* PENDING */}
      {pendingRegs.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-base font-black text-stone-800">
            {L("Maombi Yanayoshughulikiwa", "Pending Applications")}
          </h2>
          {pendingRegs.map((reg) => {
            const meta = BIZ_TYPES.find((t) => t.value === reg.business_type)!;
            const Icon = meta.icon;
            return (
              <div key={reg.id} className="bg-amber-50 border-2 border-amber-200 rounded-2xl p-5">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center shrink-0">
                    <Clock size={20} className="text-amber-700" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-black text-amber-800">
                        {lang === "sw" ? meta.sw : meta.en}
                      </h3>
                      <span className="text-[9px] font-black text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full">
                        ⏳ {L("INASUBIRI UKAGUZI", "AWAITING REVIEW")}
                      </span>
                    </div>
                    <p className="text-xs text-stone-600 mt-0.5">{reg.business_name}</p>
                    <p className="text-xs text-amber-700 mt-2">
                      {L("Tuliyopokea ombi lako tarehe", "We received your application on")}{" "}
                      {new Date(reg.created_at).toLocaleDateString()}.
                      {L(
                        " Wafanyakazi watakagua ndani ya siku 1–3 za kazi.",
                        " Staff will review within 1–3 working days.",
                      )}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* REJECTED */}
      {rejectedRegs.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-base font-black text-stone-800">
            {L("Maombi Yaliyokataliwa", "Rejected Applications")}
          </h2>
          {rejectedRegs.map((reg) => {
            const meta = BIZ_TYPES.find((t) => t.value === reg.business_type)!;
            return (
              <div key={reg.id} className="bg-red-50 border-2 border-red-200 rounded-2xl p-5">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl bg-red-100 flex items-center justify-center shrink-0">
                    <XCircle size={20} className="text-red-700" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-black text-red-800">
                        {lang === "sw" ? meta.sw : meta.en}
                      </h3>
                      <span className="text-[9px] font-black text-red-700 bg-red-100 px-2 py-0.5 rounded-full">
                        ✗ {L("IMEKATALIWA", "REJECTED")}
                      </span>
                    </div>
                    {reg.rejection_reason && (
                      <div className="mt-2 bg-white border border-red-100 rounded-lg p-3">
                        <p className="text-[10px] font-bold text-red-600 uppercase tracking-wide mb-1">
                          {L("Sababu", "Reason")}
                        </p>
                        <p className="text-xs text-stone-700">{reg.rejection_reason}</p>
                      </div>
                    )}
                    <button
                      type="button"
                      onClick={() => {
                        setBizType(reg.business_type);
                        setApplying(true);
                        setStep("business");
                      }}
                      className="mt-3 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-bold text-xs flex items-center gap-1.5"
                    >
                      <RefreshCw size={12} /> {L("Omba Tena", "Re-apply")}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* SUSPENDED */}
      {suspendedRegs.length > 0 && (
        <div className="space-y-3">
          {suspendedRegs.map((reg) => {
            const meta = BIZ_TYPES.find((t) => t.value === reg.business_type)!;
            return (
              <div
                key={reg.id}
                className="bg-orange-50 border-2 border-orange-200 rounded-2xl p-5 flex items-start gap-3"
              >
                <Shield size={20} className="text-orange-700 shrink-0 mt-0.5" />
                <div>
                  <h3 className="font-black text-orange-800">
                    {lang === "sw" ? meta.sw : meta.en} — {L("Imesimamishwa", "Suspended")}
                  </h3>
                  <p className="text-xs text-orange-700 mt-1">
                    {L(
                      "Akaunti hii imesimamishwa kwa muda. Wasiliana na ofisi kwa msaada.",
                      "This role has been temporarily suspended. Contact the office for assistance.",
                    )}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* APPLY NEW button — always visible if user can */}
      <div className={`${hasAnyReg ? "" : "mt-2"}`}>
        {canApplyNew ? (
          <button
            type="button"
            onClick={() => {
              setApplying(true);
              setStep("type");
            }}
            className="w-full px-5 py-4 bg-white border-2 border-dashed border-stone-300 hover:border-stone-500 hover:bg-stone-50 rounded-2xl flex items-center justify-center gap-2 text-sm font-bold text-stone-600 hover:text-stone-800 transition-all"
          >
            <Plus size={18} />
            {hasAnyReg
              ? L("Omba Hadhi Nyingine ya Biashara", "Apply for Another Business Role")
              : L("Anza Maombi Mapya", "Start New Application")}
          </button>
        ) : (
          <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4 flex gap-3">
            <Info size={18} className="text-blue-600 shrink-0 mt-0.5" />
            <p className="text-xs text-blue-700">
              {L(
                "Una maombi yanayoshughulikiwa. Subiri yakamilike kabla ya kuomba aina nyingine.",
                "You have a pending application. Wait for it to be processed before applying for another type.",
              )}
            </p>
          </div>
        )}
      </div>

      {/* MY AGREEMENTS TABLE */}
      {(() => {
        const AGR_STATUS_STYLE: Record<string, string> = {
          submitted: "bg-blue-50 text-blue-700 border-blue-200",
          pending_payment: "bg-amber-50 text-amber-700 border-amber-200",
          paid: "bg-emerald-50 text-emerald-700 border-emerald-200",
          processing: "bg-indigo-50 text-indigo-700 border-indigo-200",
          issued: "bg-emerald-100 text-emerald-800 border-emerald-300",
          rejected: "bg-red-50 text-red-700 border-red-200",
        };
        const AGR_STATUS_LABEL: Record<string, { sw: string; en: string }> = {
          submitted: { sw: "Imetumwa", en: "Submitted" },
          pending_payment: { sw: "Inasubiri Malipo", en: "Pending Payment" },
          paid: { sw: "Imelipiwa", en: "Paid" },
          processing: { sw: "Inashughulikiwa", en: "Processing" },
          issued: { sw: "Imetolewa", en: "Issued" },
          rejected: { sw: "Imekataliwa", en: "Rejected" },
        };
        const isInitiatorOf = (a: AgreementApp) => a.user_id === user?.id;
        const filtered = agreementApps.filter((a) => {
          const q = agrSearch.toLowerCase();
          const matchSearch =
            !agrSearch ||
            (a.application_number || "").toLowerCase().includes(q) ||
            (a.service_name || "").toLowerCase().includes(q);
          const matchType =
            agrTypeFilter === "all" ||
            (agrTypeFilter === "sales" && (a.service_name || "").includes("Mauzo")) ||
            (agrTypeFilter === "rental" && (a.service_name || "").includes("Pango"));
          return matchSearch && matchType;
        });
        return (
          <div className="space-y-3">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <h2 className="text-base font-black text-stone-800 flex items-center gap-2">
                <FileSignature size={18} className="text-stone-600" />
                {L("Makubaliano Yangu", "My Agreements")}
                <span className="text-xs font-bold text-stone-400 bg-stone-100 px-2 py-0.5 rounded-full">
                  {agreementApps.length}
                </span>
              </h2>
              <button
                type="button"
                onClick={fetchAgreements}
                className="p-1.5 text-stone-400 hover:text-stone-600 hover:bg-stone-100 rounded-lg transition-colors"
                aria-label={L("Onyesha upya", "Refresh")}
                title={L("Onyesha upya", "Refresh")}
              >
                <RefreshCw size={14} />
              </button>
            </div>
            <div className="flex flex-col sm:flex-row gap-2">
              <input
                type="text"
                value={agrSearch}
                onChange={(e) => setAgrSearch(e.target.value)}
                placeholder={L("Tafuta kwa namba au aina...", "Search by ref or type...")}
                aria-label={L("Tafuta makubaliano", "Search agreements")}
                className="flex-1 px-4 py-2 border border-stone-200 rounded-xl text-sm focus:ring-2 focus:ring-stone-400 outline-none bg-white"
              />
              <select
                value={agrTypeFilter}
                onChange={(e) => setAgrTypeFilter(e.target.value as "all" | "sales" | "rental")}
                aria-label={L("Chagua aina", "Filter by type")}
                title={L("Chagua aina", "Filter by type")}
                className="px-3 py-2 border border-stone-200 rounded-xl text-sm bg-white focus:ring-2 focus:ring-stone-400 outline-none"
              >
                <option value="all">{L("Aina Zote", "All Types")}</option>
                <option value="sales">{L("Mauzo", "Sales")}</option>
                <option value="rental">{L("Pango", "Rental")}</option>
              </select>
            </div>
            <div className="bg-white rounded-2xl border border-stone-200 overflow-hidden shadow-sm">
              <div className="hidden sm:block overflow-x-auto">
                <table className="w-full text-left">
                  <thead className="bg-stone-50 border-b border-stone-200">
                    <tr>
                      <th className="px-5 py-3 text-[10px] font-black text-stone-500 uppercase tracking-wider">
                        {L("Aina", "Type")}
                      </th>
                      <th className="px-5 py-3 text-[10px] font-black text-stone-500 uppercase tracking-wider">
                        {L("Namba", "Ref #")}
                      </th>
                      <th className="px-5 py-3 text-[10px] font-black text-stone-500 uppercase tracking-wider">
                        {L("Nafsi Yako", "Your Role")}
                      </th>
                      <th className="px-5 py-3 text-[10px] font-black text-stone-500 uppercase tracking-wider">
                        {L("Hali", "Status")}
                      </th>
                      <th className="px-5 py-3 text-[10px] font-black text-stone-500 uppercase tracking-wider">
                        {L("Hali ya Makubaliano", "Agreement Status")}
                      </th>
                      <th className="px-5 py-3 text-[10px] font-black text-stone-500 uppercase tracking-wider">
                        {L("Tarehe", "Date")}
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-100">
                    {filtered.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="px-5 py-10 text-center text-stone-400">
                          <FileSignature size={28} className="mx-auto mb-2 opacity-30" />
                          <p className="text-sm">
                            {L("Hakuna makubaliano yaliyopatikana.", "No agreements found.")}
                          </p>
                          {agreementApps.length === 0 && (
                            <p className="text-xs mt-1 text-stone-300">
                              {L(
                                "Makubaliano yataonekana hapa baada ya kuanzisha.",
                                "Agreements will appear here once initiated.",
                              )}
                            </p>
                          )}
                        </td>
                      </tr>
                    ) : (
                      filtered.map((agr) => {
                        const isInitiator = isInitiatorOf(agr);
                        const isSales = (agr.service_name || "").includes("Mauzo");
                        const st = agr.status || "submitted";
                        const stStyle =
                          AGR_STATUS_STYLE[st] || "bg-stone-50 text-stone-600 border-stone-200";
                        const stLabel = AGR_STATUS_LABEL[st]?.[lang === "sw" ? "sw" : "en"] || st;
                        return (
                          <tr key={agr.id} className="hover:bg-stone-50 transition-colors">
                            <td className="px-5 py-3">
                              <div className="flex items-center gap-2">
                                <div
                                  className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${isSales ? "bg-blue-100" : "bg-emerald-100"}`}
                                >
                                  {isSales ? (
                                    <ShoppingCart size={13} className="text-blue-600" />
                                  ) : (
                                    <Key size={13} className="text-emerald-600" />
                                  )}
                                </div>
                                <span className="text-xs font-bold text-stone-700">
                                  {agr.service_name || L("Makubaliano", "Agreement")}
                                </span>
                              </div>
                            </td>
                            <td className="px-5 py-3 font-mono text-xs text-stone-500">
                              {agr.application_number || "—"}
                            </td>
                            <td className="px-5 py-3">
                              <span
                                className={`text-[10px] font-black px-2 py-0.5 rounded-full border ${isInitiator ? "bg-stone-100 text-stone-600 border-stone-200" : "bg-purple-50 text-purple-700 border-purple-200"}`}
                              >
                                {isInitiator
                                  ? L("Mwanzilishi", "Initiator")
                                  : L("Pande ya Pili", "Second Party")}
                              </span>
                            </td>
                            <td className="px-5 py-3">
                              <span
                                className={`text-[10px] font-black px-2 py-0.5 rounded-full border ${stStyle}`}
                              >
                                {stLabel}
                              </span>
                            </td>
                            <td className="px-5 py-3 text-xs text-stone-500">
                              {agr.agreement_status || "—"}
                            </td>
                            <td className="px-5 py-3 text-xs text-stone-400">
                              {new Date(agr.created_at).toLocaleDateString()}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
              <div className="sm:hidden divide-y divide-stone-100">
                {filtered.length === 0 ? (
                  <div className="px-4 py-8 text-center text-stone-400">
                    <FileSignature size={28} className="mx-auto mb-2 opacity-30" />
                    <p className="text-sm">{L("Hakuna makubaliano.", "No agreements found.")}</p>
                  </div>
                ) : (
                  filtered.map((agr) => {
                    const isInitiator = agr.user_id === user?.id;
                    const isSales = (agr.service_name || "").includes("Mauzo");
                    const st = agr.status || "submitted";
                    const stStyle =
                      AGR_STATUS_STYLE[st] || "bg-stone-50 text-stone-600 border-stone-200";
                    const stLabel = AGR_STATUS_LABEL[st]?.[lang === "sw" ? "sw" : "en"] || st;
                    return (
                      <div key={agr.id} className="p-4 space-y-2">
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <div
                              className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${isSales ? "bg-blue-100" : "bg-emerald-100"}`}
                            >
                              {isSales ? (
                                <ShoppingCart size={13} className="text-blue-600" />
                              ) : (
                                <Key size={13} className="text-emerald-600" />
                              )}
                            </div>
                            <p className="text-xs font-black text-stone-800">
                              {agr.service_name || L("Makubaliano", "Agreement")}
                            </p>
                          </div>
                          <span
                            className={`text-[10px] font-black px-2 py-0.5 rounded-full border ${stStyle}`}
                          >
                            {stLabel}
                          </span>
                        </div>
                        <p className="text-[10px] font-mono text-stone-400">
                          {agr.application_number}
                        </p>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span
                            className={`text-[10px] font-black px-2 py-0.5 rounded-full border ${isInitiator ? "bg-stone-100 text-stone-600 border-stone-200" : "bg-purple-50 text-purple-700 border-purple-200"}`}
                          >
                            {isInitiator
                              ? L("Mwanzilishi", "Initiator")
                              : L("Pande ya Pili", "Second Party")}
                          </span>
                          {agr.agreement_status && (
                            <span className="text-[10px] text-stone-500">
                              {agr.agreement_status}
                            </span>
                          )}
                          <span className="text-[10px] text-stone-400 ml-auto">
                            {new Date(agr.created_at).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        );
      })()}

      {/* Info box — what is this */}
      {!hasAnyReg && (
        <div className="bg-stone-50 border border-stone-200 rounded-2xl p-5">
          <h3 className="font-black text-stone-800 mb-3 flex items-center gap-2">
            <Info size={16} /> {L("Kuhusu Usajili wa Biashara", "About Business Registration")}
          </h3>
          <div className="space-y-2.5 text-xs text-stone-600">
            <p>
              {L(
                "Mfumo huu unahitaji uthibitisho wa biashara kabla ya kufanya makubaliano ya mauzo au pango. Hii inawalinda watumiaji wote dhidi ya udanganyifu.",
                "This system requires business verification before making sales or rental agreements. This protects all users from fraud.",
              )}
            </p>
            <p>{L("Baada ya usajili kuthibitishwa, utaweza:", "After verification, you can:")}</p>
            <ul className="ml-4 space-y-1">
              <li>
                •{" "}
                {L(
                  "Anzisha Makubaliano ya Mauzo (kama Muuzaji)",
                  "Initiate Sales Agreements (as Seller)",
                )}
              </li>
              <li>
                •{" "}
                {L(
                  "Anzisha Makubaliano ya Pango (kama Mpangishaji)",
                  "Initiate Rental Agreements (as Landlord)",
                )}
              </li>
              <li>
                •{" "}
                {L("Wasimamie wateja wako kupitia mfumo", "Manage your clients through the system")}
              </li>
              <li>
                •{" "}
                {L(
                  'Pata kibandiko cha "Imethibitishwa" kwenye akaunti yako',
                  'Receive a "Verified" badge on your account',
                )}
              </li>
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}

export default Agreement;
