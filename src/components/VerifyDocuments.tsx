import React, { useState, useRef, useCallback } from "react";
import { QRCodeSVG } from "qrcode.react";
import {
  ArrowLeft,
  QrCode,
  Upload,
  CheckCircle2,
  XCircle,
  Download,
  Search,
  Shield,
  Clock,
  FileText,
  User,
  MapPin,
  Calendar,
  CreditCard,
  Eye,
  EyeOff,
  ChevronDown,
  Fingerprint,
  Car,
  Plane,
  Baby,
  Vote,
  BadgeCheck,
  Wallet,
  Building2,
  Users,
  FileCheck,
  Lock,
  ShieldCheck,
  AlertCircle,
  ScanLine,
  ImageIcon,
  X,
  Loader2,
} from "lucide-react";
import jsQR from "jsqr";
import { Language } from "@/lib/i18n";
import { useTranslation } from "@/lib/i18n";
import { supabase, UserRole } from "@/lib/supabase";
import { cn } from "@/lib/utils";
import { verifyUrl } from "@/constants/site";

// ─── Verified document result shape ──────────────────────────────────────────
interface VerifiedDocument {
  documentType: string;
  id?: string;
  type?: string;
  name: string;
  issueDate?: string;
  issuedAt?: string;
  verificationCode?: string;
  status: string;
  applicantMasked?: string;
  applicantFull?: string;
  nidaNumber?: string;
  nidaMasked?: string;
  phone?: string;
  phoneMasked?: string;
  email?: string;
  region?: string;
  district?: string;
  ward?: string;
  street?: string;
  formData?: Record<string, unknown>;
  paidAt?: string;
  serviceFee?: number;
  documentNumber?: string;
  officeName?: string;
  officeRegion?: string;
  citizenId?: string;
  dateOfBirth?: string;
  gender?: string;
  isSimulated?: boolean;
  [key: string]: unknown;
}

// Safe accessor for verified document fields
const vf = (doc: Record<string, unknown> | null, key: string): string =>
  String(doc?.[key] ?? "");

// Document types for verification
const DOCUMENT_TYPES = [
  {
    id: "application",
    name: "E-Mtaa Application",
    nameSw: "Namba ya Maombi",
    icon: FileText,
    placeholder: "TZ-KIB-20260309-1234",
    description: "Verify an E-Mtaa service application",
    descriptionSw: "Hakiki ombi la huduma ya E-Mtaa",
  },
  {
    id: "ct_id",
    name: "Citizen ID (CT ID)",
    nameSw: "Namba ya Raia (CT ID)",
    icon: BadgeCheck,
    placeholder: "CT26A00001",
    description: "Verify a Citizen ID issued by E-Mtaa",
    descriptionSw: "Hakiki Namba ya Raia iliyotolewa na E-Mtaa",
  },
  {
    id: "nida",
    name: "NIDA (National ID)",
    nameSw: "NIDA (Kitambulisho cha Taifa)",
    icon: Fingerprint,
    placeholder: "19850101-12345-00001-00",
    description: "Verify a Tanzania National ID number",
    descriptionSw: "Hakiki namba ya Kitambulisho cha Taifa",
  },
  {
    id: "birth_certificate",
    name: "Birth Certificate",
    nameSw: "Cheti cha Kuzaliwa",
    icon: Baby,
    placeholder: "BC-2024-123456",
    description: "Verify a birth certificate",
    descriptionSw: "Hakiki cheti cha kuzaliwa",
  },
  {
    id: "passport",
    name: "Passport",
    nameSw: "Pasipoti",
    icon: Plane,
    placeholder: "AB1234567",
    description: "Verify a Tanzania passport",
    descriptionSw: "Hakiki pasipoti ya Tanzania",
  },
  {
    id: "voter_card",
    name: "E-NEC (Voter Card)",
    nameSw: "Kadi ya Mpiga Kura (E-NEC)",
    icon: Vote,
    placeholder: "NEC-12345678",
    description: "Verify a voter registration card",
    descriptionSw: "Hakiki kadi ya mpiga kura",
  },
  {
    id: "driving_license",
    name: "Driving License",
    nameSw: "Leseni ya Udereva",
    icon: Car,
    placeholder: "DL-2024-00001234",
    description: "Verify a driving license",
    descriptionSw: "Hakiki leseni ya udereva",
  },
  {
    id: "zanzibar_mkazi",
    name: "Zanzibar Mkazi ID",
    nameSw: "Kitambulisho cha Mkazi Zanzibar",
    icon: BadgeCheck,
    placeholder: "ZNZ-MKZ-123456",
    description: "Verify a Zanzibar resident ID",
    descriptionSw: "Hakiki kitambulisho cha mkazi Zanzibar",
  },
  {
    id: "jamii_id",
    name: "Jamii ID (Social ID)",
    nameSw: "Kitambulisho cha Jamii",
    icon: Users,
    placeholder: "JAMII-2024-12345",
    description: "Verify a Social ID",
    descriptionSw: "Hakiki Kitambulisho cha Jamii",
  },
  {
    id: "tin",
    name: "TIN Number",
    nameSw: "Namba ya TIN (Kodi)",
    icon: Wallet,
    placeholder: "123-456-789",
    description: "Verify a Tax Identification Number",
    descriptionSw: "Hakiki namba ya TIN",
  },
  {
    id: "business_license",
    name: "Business License",
    nameSw: "Leseni ya Biashara",
    icon: Building2,
    placeholder: "BL-DAR-2024-00123",
    description: "Verify a business license",
    descriptionSw: "Hakiki leseni ya biashara",
  },
  {
    id: "work_permit",
    name: "Work Permit",
    nameSw: "Kibali cha Kazi",
    icon: FileCheck,
    placeholder: "WP-2024-00001234",
    description: "Verify a work permit",
    descriptionSw: "Hakiki kibali cha kazi",
  },
  {
    id: "residence_permit",
    name: "Residence Permit",
    nameSw: "Kibali cha Makazi",
    icon: MapPin,
    placeholder: "RP-2024-00001234",
    description: "Verify a residence permit",
    descriptionSw: "Hakiki kibali cha makazi",
  },
  {
    id: "professional_cert",
    name: "Professional Certificate",
    nameSw: "Cheti cha Kitaaluma",
    icon: BadgeCheck,
    placeholder: "PROF-2024-12345",
    description: "Verify a professional certificate",
    descriptionSw: "Hakiki cheti cha kitaaluma",
  },
  {
    id: "marriage_cert",
    name: "Marriage Certificate",
    nameSw: "Cheti cha Ndoa",
    icon: Users,
    placeholder: "MC-2024-00001234",
    description: "Verify a marriage certificate",
    descriptionSw: "Hakiki cheti cha ndoa",
  },
  {
    id: "death_cert",
    name: "Death Certificate",
    nameSw: "Cheti cha Kifo",
    icon: FileText,
    placeholder: "DC-2024-00001234",
    description: "Verify a death certificate",
    descriptionSw: "Hakiki cheti cha kifo",
  },
];

// Public document types (citizens can only verify E-Mtaa apps and CT IDs)
const PUBLIC_DOCUMENT_TYPES = DOCUMENT_TYPES.filter(
  (d) => d.id === "application" || d.id === "ct_id",
);

// Masking helpers
const maskName = (firstName?: string, lastName?: string): string => {
  if (!firstName && !lastName) return "***";
  const first = firstName ? firstName.charAt(0) + "***" : "";
  const last = lastName ? lastName.charAt(0) + "***" : "";
  return `${first} ${last}`.trim();
};

const maskNida = (nida?: string): string => {
  if (!nida) return "***";
  if (nida.length < 8) return "***" + nida.slice(-3);
  return nida.slice(0, 4) + "****" + nida.slice(-4);
};

const maskPhone = (phone?: string): string => {
  if (!phone) return "***";
  if (phone.length < 6) return "***";
  return phone.slice(0, 4) + "****" + phone.slice(-2);
};

interface VerifyDocumentsProps {
  lang: Language;
  onBack: () => void;
  userRole?: UserRole;
}

export function VerifyDocuments({
  lang,
  onBack,
  userRole = "citizen",
}: VerifyDocumentsProps) {
  const t = useTranslation(lang);
  const sw = lang === "sw";
  const L = (s: string, e: string) => (sw ? s : e);

  const [qrInput, setQrInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [selectedDocType, setSelectedDocType] = useState("application");
  const [showDocTypeDropdown, setShowDocTypeDropdown] = useState(false);
  const [errorDetail, setErrorDetail] = useState<string | null>(null);

  // ── Upload state ──────────────────────────────────────────────────────────
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [uploadPreview, setUploadPreview] = useState<string | null>(null);
  const [uploadStatus, setUploadStatus] = useState<"idle" | "scanning" | "found" | "notfound">("idle");
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);

  const hasFullAccess = userRole === "admin" || userRole === "staff";
  const availableDocTypes = hasFullAccess ? DOCUMENT_TYPES : PUBLIC_DOCUMENT_TYPES;
  const selectedDocument =
    availableDocTypes.find((d) => d.id === selectedDocType) || availableDocTypes[0];

  const [verificationStatus, setVerificationStatus] = useState<
    "pending" | "verified" | "invalid" | null
  >(null);
  const [verifiedDocument, setVerifiedDocument] = useState<VerifiedDocument | null>(null);

  const resetSearch = () => {
    setVerificationStatus(null);
    setVerifiedDocument(null);
    setErrorDetail(null);
    setQrInput("");
  };

  // ── Upload & QR scan logic ────────────────────────────────────────────────

  /** Draw an image/canvas onto a hidden canvas and run jsQR over the pixels */
  const scanImageForQR = useCallback(
    async (dataUrl: string): Promise<string | null> => {
      return new Promise((resolve) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement("canvas");
          canvas.width = img.width;
          canvas.height = img.height;
          const ctx = canvas.getContext("2d");
          if (!ctx) return resolve(null);
          ctx.drawImage(img, 0, 0);
          const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
          const code = jsQR(imageData.data, imageData.width, imageData.height, {
            inversionAttempts: "dontInvert",
          });
          resolve(code ? code.data : null);
        };
        img.onerror = () => resolve(null);
        img.src = dataUrl;
      });
    },
    [],
  );

  /** Extract the application/reference number from a decoded QR payload string */
  const extractRefFromQR = (raw: string): string | null => {
    // Try JSON payload first (E-Mtaa format: { ref, id, svc, dt })
    try {
      const parsed = JSON.parse(raw) as Record<string, string>;
      if (parsed.ref) return parsed.ref;
      if (parsed.id) return parsed.id;
    } catch {
      // not JSON — treat as raw string
    }
    // Might be a plain app number or URL containing one
    const urlMatch = raw.match(/[?&]ref=([^&]+)/);
    if (urlMatch) return decodeURIComponent(urlMatch[1]);
    const appMatch = raw.match(/TZ-[A-Z0-9-]+/i);
    if (appMatch) return appMatch[0].toUpperCase();
    const ctMatch = raw.match(/CT\d{2}[A-Z]\d+/i);
    if (ctMatch) return ctMatch[0].toUpperCase();
    // Return the raw value if it looks like a code (not a long URL)
    if (raw.length < 60 && !/https?:\/\//.test(raw)) return raw.trim();
    return null;
  };

  const processFile = useCallback(
    async (file: File) => {
      setUploadedFile(file);
      setUploadStatus("scanning");
      setUploadError(null);

      const isPDF = file.type === "application/pdf";
      const isImage = file.type.startsWith("image/");

      if (!isPDF && !isImage) {
        setUploadStatus("notfound");
        setUploadError(L("Aina ya faili haikusuluhuliwa. Tumia PNG, JPG, au PDF.", "Unsupported file type. Use PNG, JPG, or PDF."));
        return;
      }

      if (file.size > 15 * 1024 * 1024) {
        setUploadStatus("notfound");
        setUploadError(L("Faili ni kubwa sana (max 15MB).", "File too large (max 15MB)."));
        return;
      }

      try {
        let dataUrl: string | null = null;

        if (isImage) {
          // Read image directly
          dataUrl = await new Promise<string>((res, rej) => {
            const reader = new FileReader();
            reader.onload = () => res(reader.result as string);
            reader.onerror = rej;
            reader.readAsDataURL(file);
          });
          setUploadPreview(dataUrl);
        } else {
          // PDF — render first page via pdf.js from CDN (loaded via script tag)
          setUploadPreview(null);
          try {
            const arrayBuffer = await file.arrayBuffer();
            // Load pdf.js via script tag to avoid Vite/TS issues with CDN imports
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const pdfjsLib: any = await new Promise((res, rej) => {
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              const win = window as any;
              if (win.pdfjsLib) return res(win.pdfjsLib);
              const script = document.createElement("script");
              script.src = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js";
              script.onload = () => res(win.pdfjsLib);
              script.onerror = () => rej(new Error("pdf.js failed to load"));
              document.head.appendChild(script);
            }).catch(() => null);

            if (pdfjsLib) {
              pdfjsLib.GlobalWorkerOptions.workerSrc =
                "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";
              const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
              const page = await pdf.getPage(1);
              const viewport = page.getViewport({ scale: 2 });
              const canvas = document.createElement("canvas");
              canvas.width = viewport.width;
              canvas.height = viewport.height;
              const ctx = canvas.getContext("2d")!;
              await page.render({ canvasContext: ctx, viewport }).promise;
              dataUrl = canvas.toDataURL("image/png");
              setUploadPreview(dataUrl);
            }
          } catch {
            // pdf.js failed — proceed with null dataUrl (QR scan will be skipped)
          }
        }

        // Scan for QR code in the image
        let qrValue: string | null = null;
        if (dataUrl) {
          qrValue = await scanImageForQR(dataUrl);
        }

        if (qrValue) {
          const ref = extractRefFromQR(qrValue);
          if (ref) {
            setUploadStatus("found");
            // Auto-fill the number field and trigger verification
            setQrInput(ref);
            setSelectedDocType(ref.startsWith("CT") ? "ct_id" : "application");
            // Short delay so user sees the "found" state before results load
            setTimeout(() => {
              setVerificationStatus("pending");
              setVerifiedDocument(null);
              setErrorDetail(null);
              setLoading(true);
              const fn = ref.toUpperCase().startsWith("CT")
                ? verifyCTID(ref)
                : verifyEMtaaApplication(ref);
              fn.finally(() => setLoading(false));
            }, 600);
            return;
          }
        }

        // No QR found
        setUploadStatus("notfound");
        setUploadError(
          L(
            "Hakuna QR Code iliyopatikana kwenye faili hili. Jaribu kutumia namba ya maombi moja kwa moja.",
            "No QR code found in this file. Try entering the application number directly.",
          ),
        );
      } catch (err) {
        console.error("File scan error:", err);
        setUploadStatus("notfound");
        setUploadError(L("Hitilafu wakati wa kusoma faili. Jaribu tena.", "Error reading file. Please try again."));
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [lang, scanImageForQR],
  );

  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) processFile(file);
      e.target.value = ""; // allow re-selecting same file
    },
    [processFile],
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragOver(false);
      const file = e.dataTransfer.files[0];
      if (file) processFile(file);
    },
    [processFile],
  );

  const handleDragOver = (e: React.DragEvent) => { e.preventDefault(); setIsDragOver(true); };
  const handleDragLeave = () => setIsDragOver(false);

  const clearUpload = () => {
    setUploadedFile(null);
    setUploadPreview(null);
    setUploadStatus("idle");
    setUploadError(null);
  };

  const handleVerify = async () => {
    const trimmed = qrInput.trim();
    if (!trimmed) return;

    setLoading(true);
    setVerificationStatus("pending");
    setVerifiedDocument(null);
    setErrorDetail(null);

    try {
      if (selectedDocType === "application") {
        await verifyEMtaaApplication(trimmed);
      } else if (selectedDocType === "ct_id") {
        await verifyCTID(trimmed);
      } else if (selectedDocType === "nida") {
        await verifyNIDA(trimmed);
      } else {
        await verifyOtherDocument(trimmed);
      }
    } catch (err) {
      console.error("VerifyDocuments error:", err);
      setVerificationStatus("invalid");
      setErrorDetail(
        L("Hitilafu ya mfumo. Tafadhali jaribu tena.", "System error. Please try again."),
      );
    } finally {
      setLoading(false);
    }
  };

  // ── E-Mtaa Application ────────────────────────────────────────────────────
  const verifyEMtaaApplication = async (searchTerm: string) => {
    const upper = searchTerm.toUpperCase();

    // Try exact → uppercase → ilike
    const queries = [
      () =>
        supabase
          .from("applications")
          .select(
            `*, users:user_id(id,first_name,middle_name,last_name,nida_number,phone,email,region,district,ward,street), services(id,name,name_en,fee)`,
          )
          .eq("application_number", searchTerm)
          .maybeSingle(),
      () =>
        supabase
          .from("applications")
          .select(
            `*, users:user_id(id,first_name,middle_name,last_name,nida_number,phone,email,region,district,ward,street), services(id,name,name_en,fee)`,
          )
          .eq("application_number", upper)
          .maybeSingle(),
      () =>
        supabase
          .from("applications")
          .select(
            `*, users:user_id(id,first_name,middle_name,last_name,nida_number,phone,email,region,district,ward,street), services(id,name,name_en,fee)`,
          )
          .ilike("application_number", `%${searchTerm}%`)
          .limit(1)
          .maybeSingle(),
    ];

    let data: Record<string, unknown> | null = null;
    for (const q of queries) {
      const result = await q();
      if (result.error) {
        console.warn("Application query error:", result.error);
        continue;
      }
      if (result.data) {
        data = result.data as Record<string, unknown>;
        break;
      }
    }

    if (!data) {
      setVerificationStatus("invalid");
      setErrorDetail(
        L(
          `Ombi lenye namba "${searchTerm}" halijapatikana. Angalia namba na ujaribu tena.`,
          `Application number "${searchTerm}" not found. Check the number and try again.`,
        ),
      );
      return;
    }

    const user = data.users as Record<string, unknown> | null;
    const service = data.services as Record<string, unknown> | null;
    const serviceName = String(service?.name || data.service_name || "Unknown Service");

    setVerificationStatus("verified");
    setVerifiedDocument({
      documentType: "application",
      id: String(data.id ?? ""),
      type: serviceName,
      name: serviceName,
      issueDate: new Date(
        String(data.updated_at || data.created_at || Date.now()),
      ).toLocaleDateString(),
      issuedAt: String(data.issued_at ?? ""),
      verificationCode: String(data.application_number ?? ""),
      status: String(data.status ?? ""),
      applicantMasked: maskName(String(user?.first_name ?? ""), String(user?.last_name ?? "")),
      applicantFull: `${user?.first_name ?? ""} ${user?.middle_name ?? ""} ${user?.last_name ?? ""}`.replace(/\s+/g, " ").trim(),
      nidaNumber: String(user?.nida_number ?? ""),
      nidaMasked: maskNida(String(user?.nida_number ?? "")),
      phone: String(user?.phone ?? ""),
      phoneMasked: maskPhone(String(user?.phone ?? "")),
      email: String(user?.email ?? ""),
      region: String(data.region ?? user?.region ?? ""),
      district: String(data.district ?? user?.district ?? ""),
      ward: String(data.ward ?? user?.ward ?? ""),
      street: String(data.street ?? user?.street ?? ""),
      formData: data.form_data as Record<string, unknown>,
      paidAt: String(data.paid_at ?? ""),
      serviceFee: Number(service?.fee ?? data.service_fee ?? 0),
    });
  };

  // ── CT ID ──────────────────────────────────────────────────────────────────
  const verifyCTID = async (searchTerm: string) => {
    const upper = searchTerm.toUpperCase();

    // Try exact match first, then case-insensitive
    const { data, error } = await supabase
      .from("users")
      .select(
        "id,citizen_id,first_name,middle_name,last_name,nida_number,phone,email,region,district,ward,street,is_verified,created_at,date_of_birth,gender,photo_url",
      )
      .or(`citizen_id.eq.${upper},citizen_id.ilike.${upper}`)
      .maybeSingle();

    if (error) {
      console.error("CT ID query error:", error);
      // RLS may block the query — show helpful message
      if (error.code === "PGRST301" || error.message?.includes("permission")) {
        setVerificationStatus("invalid");
        setErrorDetail(
          L(
            "Huna ruhusa ya kuhakiki CT ID hii. Wasiliana na ofisi ya serikali.",
            "You don't have permission to verify this CT ID. Contact the local government office.",
          ),
        );
      } else {
        setVerificationStatus("invalid");
        setErrorDetail(L("Hitilafu ya mfumo: " + error.message, "System error: " + error.message));
      }
      return;
    }

    if (!data) {
      setVerificationStatus("invalid");
      setErrorDetail(
        L(
          `CT ID "${upper}" haijapatikana. Hakikisha namba ni sahihi (mfano: CT26A00001).`,
          `CT ID "${upper}" not found. Ensure the number is correct (e.g., CT26A00001).`,
        ),
      );
      return;
    }

    setVerificationStatus("verified");
    setVerifiedDocument({
      documentType: "ct_id",
      id: String(data.id ?? ""),
      type: L("Namba ya Raia (CT ID)", "Citizen ID (CT ID)"),
      name: "CT ID",
      issueDate: data.created_at
        ? new Date(data.created_at).toLocaleDateString()
        : L("Haijulikani", "Unknown"),
      verificationCode: String(data.citizen_id ?? upper),
      status: data.is_verified ? "verified" : "pending",
      applicantMasked: maskName(String(data.first_name ?? ""), String(data.last_name ?? "")),
      applicantFull: `${data.first_name ?? ""} ${data.middle_name ?? ""} ${data.last_name ?? ""}`.replace(/\s+/g, " ").trim(),
      nidaNumber: String(data.nida_number ?? ""),
      nidaMasked: maskNida(String(data.nida_number ?? "")),
      phone: String(data.phone ?? ""),
      phoneMasked: maskPhone(String(data.phone ?? "")),
      email: String(data.email ?? ""),
      region: String(data.region ?? ""),
      district: String(data.district ?? ""),
      ward: String(data.ward ?? ""),
      street: String(data.street ?? ""),
      citizenId: String(data.citizen_id ?? ""),
      dateOfBirth: String(data.date_of_birth ?? ""),
      gender: String(data.gender ?? ""),
    });
  };

  // ── NIDA ──────────────────────────────────────────────────────────────────
  const verifyNIDA = async (searchTerm: string) => {
    const upper = searchTerm.toUpperCase();

    const { data, error } = await supabase
      .from("users")
      .select(
        "id,citizen_id,first_name,middle_name,last_name,nida_number,phone,email,region,district,ward,street,is_verified,created_at,date_of_birth,gender",
      )
      .eq("nida_number", upper)
      .maybeSingle();

    if (error) {
      console.error("NIDA query error:", error);
      setVerificationStatus("invalid");
      setErrorDetail(L("Hitilafu ya mfumo: " + error.message, "System error: " + error.message));
      return;
    }

    if (!data) {
      setVerificationStatus("invalid");
      setErrorDetail(
        L(
          `NIDA "${upper}" haijapatikana kwenye mfumo wetu.`,
          `NIDA "${upper}" not found in our system.`,
        ),
      );
      return;
    }

    setVerificationStatus("verified");
    setVerifiedDocument({
      documentType: "nida",
      type: L("Kitambulisho cha Taifa (NIDA)", "National ID (NIDA)"),
      name: L("NIDA", "National ID"),
      issueDate: data.created_at ? new Date(data.created_at).toLocaleDateString() : "—",
      verificationCode: String(data.nida_number ?? upper),
      status: "valid",
      applicantMasked: maskName(String(data.first_name ?? ""), String(data.last_name ?? "")),
      applicantFull: `${data.first_name ?? ""} ${data.middle_name ?? ""} ${data.last_name ?? ""}`.replace(/\s+/g, " ").trim(),
      nidaNumber: String(data.nida_number ?? ""),
      nidaMasked: maskNida(String(data.nida_number ?? "")),
      phone: String(data.phone ?? ""),
      phoneMasked: maskPhone(String(data.phone ?? "")),
      email: String(data.email ?? ""),
      region: String(data.region ?? ""),
      district: String(data.district ?? ""),
      ward: String(data.ward ?? ""),
      street: String(data.street ?? ""),
      dateOfBirth: String(data.date_of_birth ?? ""),
      gender: String(data.gender ?? ""),
      citizenId: String(data.citizen_id ?? ""),
    });
  };

  // ── Other government documents (simulated) ────────────────────────────────
  const verifyOtherDocument = async (searchTerm: string) => {
    await new Promise((r) => setTimeout(r, 1200));

    if (searchTerm.length < 5) {
      setVerificationStatus("invalid");
      setErrorDetail(
        L("Namba ni fupi sana. Angalia tena.", "Number is too short. Please check again."),
      );
      return;
    }

    const docType = DOCUMENT_TYPES.find((d) => d.id === selectedDocType);
    setVerificationStatus("verified");
    setVerifiedDocument({
      documentType: selectedDocType,
      type: L(docType?.nameSw ?? "", docType?.name ?? ""),
      name: docType?.name ?? "Unknown Document",
      issueDate: new Date(Date.now() - Math.random() * 31536000000 * 3).toLocaleDateString(),
      verificationCode: searchTerm.toUpperCase(),
      status: "valid",
      applicantMasked: "J*** M***",
      applicantFull: "John Mwangi Doe",
      nidaNumber: "19850101-12345-00001-00",
      nidaMasked: maskNida("19850101-12345-00001-00"),
      phone: "+255754123456",
      phoneMasked: maskPhone("+255754123456"),
      region: "Dar es Salaam",
      district: "Kinondoni",
      ward: "Mikocheni",
      isSimulated: true,
    });
  };

  // ── Status label helper ───────────────────────────────────────────────────
  const statusLabel = (status: string) => {
    const map: Record<string, [string, string]> = {
      issued: [L("Imetolewa", "Issued"), "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300"],
      approved: [L("Imekubaliwa", "Approved"), "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300"],
      rejected: [L("Imekataliwa", "Rejected"), "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300"],
      verified: [L("Imethibitishwa", "Verified"), "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300"],
      valid: [L("Halali", "Valid"), "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300"],
      pending: [L("Inasubiri", "Pending"), "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300"],
    };
    const entry = map[status?.toLowerCase()];
    return entry
      ? { label: entry[0], cls: entry[1] }
      : { label: status, cls: "bg-stone-100 text-stone-700" };
  };

  return (
    <div className="space-y-8 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button
          onClick={onBack}
          className="h-10 w-10 rounded-xl border border-stone-200 dark:border-stone-700 flex items-center justify-center hover:bg-stone-50 dark:hover:bg-stone-800 transition-all shadow-sm"
          aria-label="Go back"
        >
          <ArrowLeft className="h-5 w-5 text-stone-600 dark:text-stone-400" />
        </button>
        <div>
          <h1 className="text-3xl font-heading font-extrabold text-stone-900 dark:text-stone-100">
            {L("Hakiki Nyaraka", "Verify Documents")}
          </h1>
          <p className="text-stone-500 dark:text-stone-400">
            {L(
              "Hakiki ukweli wa nyaraka za serikali kwa kutumia namba ya uhakiki",
              "Verify government document authenticity using a verification number",
            )}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* ── Left: Search panel ── */}
        <div className="space-y-6">
          <h2 className="text-xl font-heading font-bold text-stone-800 dark:text-stone-200">
            {L("Njia za Uhakiki", "Verification Methods")}
          </h2>

          <div className="bg-white dark:bg-stone-900 rounded-3xl p-8 border border-stone-200 dark:border-stone-700 shadow-sm space-y-6">
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-2xl bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                <Search className="h-6 w-6" />
              </div>
              <div>
                <h3 className="font-heading font-bold text-stone-900 dark:text-stone-100">
                  {L("Tafuta kwa Namba", "Search by Number")}
                </h3>
                <p className="text-xs text-stone-500 dark:text-stone-400">
                  {L("Ingiza namba iliyo kwenye hati yako", "Enter the number on your document")}
                </p>
              </div>
            </div>

            {/* Document Type Selector */}
            <div className="space-y-2">
              <label className="text-sm font-bold text-stone-700 dark:text-stone-300">
                {L("Aina ya Nyaraka", "Document Type")}
              </label>
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setShowDocTypeDropdown(!showDocTypeDropdown)}
                  className="w-full h-14 px-4 rounded-2xl border border-stone-200 dark:border-stone-600 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/10 outline-none transition-all flex items-center justify-between bg-white dark:bg-stone-800 hover:bg-stone-50 dark:hover:bg-stone-700"
                >
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-xl bg-emerald-50 dark:bg-emerald-900/30 flex items-center justify-center">
                      {React.createElement(selectedDocument.icon, {
                        className: "h-5 w-5 text-emerald-600 dark:text-emerald-400",
                      })}
                    </div>
                    <div className="text-left">
                      <p className="font-medium text-stone-900 dark:text-stone-100 text-sm">
                        {L(selectedDocument.nameSw, selectedDocument.name)}
                      </p>
                      <p className="text-xs text-stone-400 dark:text-stone-500 hidden sm:block">
                        {L(
                          (selectedDocument as typeof DOCUMENT_TYPES[number]).descriptionSw,
                          (selectedDocument as typeof DOCUMENT_TYPES[number]).description,
                        )}
                      </p>
                    </div>
                  </div>
                  <ChevronDown
                    className={cn(
                      "h-5 w-5 text-stone-400 transition-transform shrink-0",
                      showDocTypeDropdown && "rotate-180",
                    )}
                  />
                </button>

                {showDocTypeDropdown && (
                  <div className="absolute z-50 mt-2 w-full bg-white dark:bg-stone-800 rounded-2xl border border-stone-200 dark:border-stone-700 shadow-xl max-h-80 overflow-auto">
                    {availableDocTypes.map((doc) => (
                      <button
                        key={doc.id}
                        type="button"
                        onClick={() => {
                          setSelectedDocType(doc.id);
                          setShowDocTypeDropdown(false);
                          resetSearch();
                        }}
                        className={cn(
                          "w-full px-4 py-3 flex items-center gap-3 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 transition-colors first:rounded-t-2xl last:rounded-b-2xl",
                          selectedDocType === doc.id && "bg-emerald-50 dark:bg-emerald-900/20",
                        )}
                      >
                        <div
                          className={cn(
                            "h-9 w-9 rounded-lg flex items-center justify-center shrink-0",
                            selectedDocType === doc.id
                              ? "bg-emerald-500 text-white"
                              : "bg-stone-100 dark:bg-stone-700 text-stone-600 dark:text-stone-300",
                          )}
                        >
                          {React.createElement(doc.icon, { className: "h-4 w-4" })}
                        </div>
                        <div className="text-left flex-1 min-w-0">
                          <p
                            className={cn(
                              "font-medium text-sm",
                              selectedDocType === doc.id
                                ? "text-emerald-700 dark:text-emerald-300"
                                : "text-stone-900 dark:text-stone-100",
                            )}
                          >
                            {L(doc.nameSw, doc.name)}
                          </p>
                          <p className="text-xs text-stone-400 dark:text-stone-500 truncate">
                            {L(doc.descriptionSw, doc.description)}
                          </p>
                        </div>
                        {selectedDocType === doc.id && (
                          <CheckCircle2 className="h-4 w-4 text-emerald-500 ml-auto shrink-0" />
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Number input */}
            <div className="space-y-4">
              <div>
                <label className="text-sm font-bold text-stone-700 dark:text-stone-300 mb-2 block">
                  {L("Namba ya Nyaraka", "Document Number")}
                </label>
                <input
                  type="text"
                  placeholder={selectedDocument.placeholder}
                  value={qrInput}
                  onChange={(e) => {
                    setQrInput(e.target.value);
                    if (verificationStatus) resetSearch();
                  }}
                  onKeyDown={(e) => e.key === "Enter" && handleVerify()}
                  className="w-full h-14 px-6 rounded-2xl border border-stone-200 dark:border-stone-600 bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100 placeholder-stone-400 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/10 outline-none transition-all font-mono text-base uppercase tracking-wider"
                />
                <p className="text-xs text-stone-400 dark:text-stone-500 mt-1.5 pl-1">
                  {L("Mfano:", "Example:")} <span className="font-mono">{selectedDocument.placeholder}</span>
                </p>
              </div>
              <button
                onClick={handleVerify}
                disabled={loading || !qrInput.trim()}
                className="w-full h-14 bg-emerald-600 hover:bg-emerald-700 disabled:bg-stone-300 dark:disabled:bg-stone-700 text-white rounded-2xl font-bold transition-all shadow-lg shadow-emerald-200/50 flex items-center justify-center gap-2 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <>
                    <Clock className="h-5 w-5 animate-spin" />
                    {L("Inahakiki...", "Verifying...")}
                  </>
                ) : (
                  <>
                    <Shield className="h-5 w-5" />
                    {L("Anza Uhakiki", "Start Verification")}
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Upload method */}
          <div className="bg-white dark:bg-stone-900 rounded-3xl p-8 border border-stone-200 dark:border-stone-700 shadow-sm space-y-6">
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-2xl bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                <ScanLine className="h-6 w-6" />
              </div>
              <div>
                <h3 className="font-heading font-bold text-stone-900 dark:text-stone-100">
                  {L("Pakia Nyaraka / Skena QR", "Upload & Scan QR")}
                </h3>
                <p className="text-xs text-stone-500 dark:text-stone-400">
                  {L("Pakia PDF au picha — QR Code itapatikana na kuthibitishwa moja kwa moja", "Upload PDF or image — QR Code will be detected and verified automatically")}
                </p>
              </div>
            </div>

            {/* Hidden file input */}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif,application/pdf"
              className="hidden"
              onChange={handleFileSelect}
            />

            {/* Drop zone — show when no file selected yet */}
            {!uploadedFile && (
              <div
                onClick={() => fileInputRef.current?.click()}
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                className={cn(
                  "border-2 border-dashed rounded-2xl p-10 text-center cursor-pointer transition-all",
                  isDragOver
                    ? "border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20 scale-[1.01]"
                    : "border-stone-200 dark:border-stone-700 hover:border-emerald-400 hover:bg-emerald-50/30 dark:hover:bg-emerald-900/10",
                )}
              >
                <div className={cn(
                  "h-16 w-16 rounded-full flex items-center justify-center mx-auto mb-4 transition-all",
                  isDragOver ? "bg-emerald-100 dark:bg-emerald-900/40 scale-110" : "bg-stone-50 dark:bg-stone-800",
                )}>
                  <Upload className={cn("h-8 w-8 transition-colors", isDragOver ? "text-emerald-600" : "text-stone-400 group-hover:text-emerald-600")} />
                </div>
                <p className="text-stone-900 dark:text-stone-100 font-bold mb-1">
                  {L("Buruta na uachie hapa", "Drag and drop here")}
                </p>
                <p className="text-sm text-stone-500 dark:text-stone-400 mb-3">
                  {L("au bonyeza kuchagua faili", "or click to browse files")}
                </p>
                <p className="text-xs text-stone-400 dark:text-stone-500">
                  PDF, PNG, JPG, WEBP · {L("Max", "Max")} 15MB
                </p>
              </div>
            )}

            {/* File selected — show preview & status */}
            {uploadedFile && (
              <div className="space-y-4">
                {/* File info bar */}
                <div className="flex items-center gap-3 p-3 bg-stone-50 dark:bg-stone-800 rounded-xl border border-stone-200 dark:border-stone-700">
                  <div className="h-10 w-10 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center shrink-0">
                    <ImageIcon className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-stone-900 dark:text-stone-100 text-sm truncate">
                      {uploadedFile.name}
                    </p>
                    <p className="text-xs text-stone-500 dark:text-stone-400">
                      {(uploadedFile.size / 1024).toFixed(1)} KB · {uploadedFile.type.split("/")[1]?.toUpperCase()}
                    </p>
                  </div>
                  <button
                    onClick={clearUpload}
                    className="p-1.5 text-stone-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                    title={L("Futa faili", "Remove file")}
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>

                {/* Preview (images and rendered PDFs) */}
                {uploadPreview && (
                  <div className="rounded-xl overflow-hidden border border-stone-200 dark:border-stone-700 max-h-48 bg-stone-100 dark:bg-stone-800 flex items-center justify-center">
                    <img
                      src={uploadPreview}
                      alt="Document preview"
                      className="max-h-48 w-auto object-contain"
                    />
                  </div>
                )}

                {/* Scanning status */}
                {uploadStatus === "scanning" && (
                  <div className="flex items-center gap-3 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-xl border border-blue-200 dark:border-blue-700">
                    <Loader2 className="h-5 w-5 text-blue-500 animate-spin shrink-0" />
                    <div>
                      <p className="font-bold text-blue-800 dark:text-blue-300 text-sm">
                        {L("Inatafuta QR Code...", "Scanning for QR Code...")}
                      </p>
                      <p className="text-xs text-blue-600 dark:text-blue-400">
                        {L("Tafadhali subiri", "Please wait")}
                      </p>
                    </div>
                  </div>
                )}

                {uploadStatus === "found" && (
                  <div className="flex items-center gap-3 p-4 bg-emerald-50 dark:bg-emerald-900/20 rounded-xl border border-emerald-200 dark:border-emerald-700">
                    <CheckCircle2 className="h-5 w-5 text-emerald-500 shrink-0" />
                    <div>
                      <p className="font-bold text-emerald-800 dark:text-emerald-300 text-sm">
                        {L("QR Code imepatikana!", "QR Code detected!")}
                      </p>
                      <p className="text-xs text-emerald-600 dark:text-emerald-400">
                        {L("Inahakiki moja kwa moja...", "Verifying automatically...")}
                      </p>
                    </div>
                  </div>
                )}

                {uploadStatus === "notfound" && (
                  <div className="space-y-3">
                    <div className="flex items-start gap-3 p-4 bg-amber-50 dark:bg-amber-900/20 rounded-xl border border-amber-200 dark:border-amber-700">
                      <AlertCircle className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
                      <div>
                        <p className="font-bold text-amber-800 dark:text-amber-300 text-sm">
                          {L("QR Code haikupatikana", "QR Code not found")}
                        </p>
                        <p className="text-xs text-amber-700 dark:text-amber-400 mt-1">
                          {uploadError}
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="w-full py-2.5 border border-stone-200 dark:border-stone-700 rounded-xl text-sm font-medium text-stone-600 dark:text-stone-400 hover:bg-stone-50 dark:hover:bg-stone-800 transition-colors"
                    >
                      {L("Jaribu faili lingine", "Try another file")}
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* ── Right: Results panel ── */}
        <div className="space-y-6">
          <h2 className="text-xl font-heading font-bold text-stone-800 dark:text-stone-200">
            {L("Matokeo ya Uhakiki", "Verification Results")}
          </h2>

          {/* Empty state */}
          {!verificationStatus && (
            <div className="bg-stone-50 dark:bg-stone-800/50 rounded-3xl p-12 border border-stone-200 dark:border-stone-700 text-center">
              <div className="h-20 w-20 bg-white dark:bg-stone-800 rounded-full flex items-center justify-center mx-auto mb-6 shadow-sm">
                <QrCode className="h-10 w-10 text-stone-300 dark:text-stone-600" />
              </div>
              <p className="text-stone-500 dark:text-stone-400 font-medium max-w-xs mx-auto">
                {L(
                  "Chagua aina ya nyaraka, ingiza namba, kisha bonyeza 'Anza Uhakiki'",
                  "Select a document type, enter the number, then click 'Start Verification'",
                )}
              </p>
            </div>
          )}

          {/* Loading state */}
          {verificationStatus === "pending" && (
            <div className="bg-white dark:bg-stone-900 rounded-3xl p-12 border border-stone-200 dark:border-stone-700 text-center">
              <div className="h-20 w-20 bg-emerald-50 dark:bg-emerald-900/30 rounded-full flex items-center justify-center mx-auto mb-6">
                <Clock className="h-10 w-10 text-emerald-500 animate-spin" />
              </div>
              <p className="text-stone-700 dark:text-stone-300 font-bold text-lg mb-1">
                {L("Inahakiki...", "Verifying...")}
              </p>
              <p className="text-stone-500 dark:text-stone-400 text-sm">
                {L("Tafadhali subiri kidogo", "Please wait a moment")}
              </p>
            </div>
          )}

          {/* ── Verified ── */}
          {verificationStatus === "verified" && verifiedDocument && (
            <div className="bg-white dark:bg-stone-900 rounded-3xl p-8 border-2 border-emerald-500 shadow-xl shadow-emerald-100/50 space-y-6 relative overflow-hidden">
              <div className="absolute top-0 right-0 p-4 opacity-20">
                <CheckCircle2 className="h-12 w-12 text-emerald-500" />
              </div>

              {/* Simulated data warning */}
              {verifiedDocument.isSimulated && (
                <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 text-amber-700 dark:text-amber-400 text-sm font-medium">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  {L(
                    "Matokeo ya maonyesho tu — si data halisi",
                    "Demo results only — not real data",
                  )}
                </div>
              )}

              {/* Success banner */}
              <div className="flex items-center gap-4 p-4 bg-emerald-50 dark:bg-emerald-900/20 rounded-2xl border border-emerald-100 dark:border-emerald-800">
                <CheckCircle2 className="h-8 w-8 text-emerald-600 dark:text-emerald-400 shrink-0" />
                <div>
                  <p className="font-heading font-bold text-emerald-900 dark:text-emerald-300 text-lg">
                    {L("Nyaraka ni Halali", "Document Verified")}
                  </p>
                  <p className="text-sm text-emerald-700 dark:text-emerald-400">
                    {L(
                      "Nyaraka hii imetolewa rasmi na Serikali",
                      "This document is officially issued by the Government",
                    )}
                  </p>
                </div>
              </div>

              {/* QR Code block */}
              <div className="bg-gradient-to-br from-stone-900 to-stone-800 rounded-2xl p-6 text-white">
                <div className="flex items-start gap-6">
                  <div className="bg-white p-3 rounded-xl shadow-lg shrink-0">
                    <QRCodeSVG
                      value={verifyUrl(
                        vf(verifiedDocument, "verificationCode"),
                        verifiedDocument.documentType || "application",
                      )}
                      size={110}
                      level="H"
                      includeMargin={false}
                      fgColor="#064e3b"
                      bgColor="#ffffff"
                    />
                  </div>
                  <div className="flex-1 space-y-3 min-w-0">
                    <div className="flex items-center gap-2">
                      <ShieldCheck className="h-5 w-5 text-emerald-400 shrink-0" />
                      <span className="font-bold text-emerald-400 uppercase tracking-wider text-sm">
                        {L("QR ya Usalama", "Security QR Code")}
                      </span>
                    </div>
                    <p className="text-sm text-stone-300 leading-relaxed">
                      {L(
                        "Skana QR hii kuthibitisha ukweli wa nyaraka hii.",
                        "Scan this QR code to verify document authenticity.",
                      )}
                    </p>
                    <div className="flex items-center gap-2 text-xs text-stone-400">
                      <Lock className="h-3 w-3 shrink-0" />
                      <span>{L("Data imehifadhiwa kwa usalama", "Data secured with encryption")}</span>
                    </div>
                    <div className="mt-2 pt-2 border-t border-stone-700">
                      <p className="text-xs text-stone-400 font-mono truncate">
                        ID: {vf(verifiedDocument, "verificationCode")}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Access mode indicator */}
              <div
                className={cn(
                  "flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold",
                  hasFullAccess
                    ? "bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-700"
                    : "bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-700",
                )}
              >
                {hasFullAccess ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                {hasFullAccess
                  ? L("Mtazamo Kamili (Admin/Staff)", "Full View (Admin/Staff)")
                  : L("Mtazamo wa Umma", "Public View")}
              </div>

              {/* Document details */}
              <div className="space-y-0 bg-stone-50 dark:bg-stone-800/50 rounded-2xl divide-y divide-stone-200 dark:divide-stone-700 overflow-hidden">
                {/* Document Type */}
                <div className="flex justify-between items-center px-5 py-3">
                  <span className="text-xs font-bold text-stone-500 dark:text-stone-400 uppercase tracking-wider flex items-center gap-2">
                    <FileText className="h-3.5 w-3.5" />
                    {L("Aina ya Hati", "Document Type")}
                  </span>
                  <span className="font-bold text-stone-900 dark:text-stone-100 text-sm text-right max-w-[55%]">
                    {vf(verifiedDocument, "type") || vf(verifiedDocument, "name")}
                  </span>
                </div>

                {/* Issued To */}
                <div className="flex justify-between items-center px-5 py-3">
                  <span className="text-xs font-bold text-stone-500 dark:text-stone-400 uppercase tracking-wider flex items-center gap-2">
                    <User className="h-3.5 w-3.5" />
                    {L("Miliki ya", "Issued To")}
                  </span>
                  <span className="font-bold text-stone-900 dark:text-stone-100 text-sm text-right max-w-[55%]">
                    {hasFullAccess
                      ? vf(verifiedDocument, "applicantFull")
                      : vf(verifiedDocument, "applicantMasked")}
                  </span>
                </div>

                {/* CT ID (if available) */}
                {verifiedDocument.citizenId && (
                  <div className="flex justify-between items-center px-5 py-3">
                    <span className="text-xs font-bold text-stone-500 dark:text-stone-400 uppercase tracking-wider flex items-center gap-2">
                      <BadgeCheck className="h-3.5 w-3.5" />
                      CT ID
                    </span>
                    <span className="font-mono font-bold text-stone-900 dark:text-stone-100 text-sm">
                      {vf(verifiedDocument, "citizenId")}
                    </span>
                  </div>
                )}

                {/* NIDA */}
                {(verifiedDocument.nidaNumber || verifiedDocument.nidaMasked) && (
                  <div className="flex justify-between items-center px-5 py-3">
                    <span className="text-xs font-bold text-stone-500 dark:text-stone-400 uppercase tracking-wider flex items-center gap-2">
                      <CreditCard className="h-3.5 w-3.5" />
                      NIDA
                    </span>
                    <span className="font-mono font-bold text-stone-900 dark:text-stone-100 text-sm">
                      {hasFullAccess
                        ? vf(verifiedDocument, "nidaNumber")
                        : vf(verifiedDocument, "nidaMasked")}
                    </span>
                  </div>
                )}

                {/* Phone (staff only) */}
                {hasFullAccess && verifiedDocument.phone && (
                  <div className="flex justify-between items-center px-5 py-3">
                    <span className="text-xs font-bold text-stone-500 dark:text-stone-400 uppercase tracking-wider">
                      {L("Simu", "Phone")}
                    </span>
                    <span className="font-bold text-stone-900 dark:text-stone-100 text-sm">
                      {vf(verifiedDocument, "phone")}
                    </span>
                  </div>
                )}

                {/* Location */}
                {(verifiedDocument.region || verifiedDocument.district) && (
                  <div className="flex justify-between items-center px-5 py-3">
                    <span className="text-xs font-bold text-stone-500 dark:text-stone-400 uppercase tracking-wider flex items-center gap-2">
                      <MapPin className="h-3.5 w-3.5" />
                      {L("Mahali", "Location")}
                    </span>
                    <span className="font-bold text-stone-900 dark:text-stone-100 text-sm text-right max-w-[55%]">
                      {hasFullAccess
                        ? [
                            verifiedDocument.region,
                            verifiedDocument.district,
                            verifiedDocument.ward,
                            verifiedDocument.street,
                          ]
                            .filter(Boolean)
                            .join(", ") || "—"
                        : vf(verifiedDocument, "region") || "Tanzania"}
                    </span>
                  </div>
                )}

                {/* Issue Date */}
                <div className="flex justify-between items-center px-5 py-3">
                  <span className="text-xs font-bold text-stone-500 dark:text-stone-400 uppercase tracking-wider flex items-center gap-2">
                    <Calendar className="h-3.5 w-3.5" />
                    {L("Tarehe ya Kutolewa", "Issue Date")}
                  </span>
                  <span className="font-bold text-stone-900 dark:text-stone-100 text-sm">
                    {verifiedDocument.issuedAt
                      ? new Date(verifiedDocument.issuedAt).toLocaleDateString()
                      : verifiedDocument.issueDate || "—"}
                  </span>
                </div>

                {/* Status */}
                <div className="flex justify-between items-center px-5 py-3">
                  <span className="text-xs font-bold text-stone-500 dark:text-stone-400 uppercase tracking-wider">
                    {L("Hali", "Status")}
                  </span>
                  {(() => {
                    const { label, cls } = statusLabel(verifiedDocument.status);
                    return (
                      <span className={cn("px-3 py-1 rounded-full text-xs font-bold", cls)}>
                        {label}
                      </span>
                    );
                  })()}
                </div>

                {/* Verification code */}
                <div className="flex justify-between items-center px-5 py-3">
                  <span className="text-xs font-bold text-stone-500 dark:text-stone-400 uppercase tracking-wider">
                    {L("Namba ya Uhakiki", "Verification Code")}
                  </span>
                  <span className="font-mono text-sm font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/30 px-3 py-1 rounded-lg border border-emerald-100 dark:border-emerald-800">
                    {vf(verifiedDocument, "verificationCode")}
                  </span>
                </div>

                {/* Payment info (staff only) */}
                {hasFullAccess && verifiedDocument.paidAt && (
                  <div className="flex justify-between items-center px-5 py-3">
                    <span className="text-xs font-bold text-stone-500 dark:text-stone-400 uppercase tracking-wider">
                      {L("Malipo", "Payment")}
                    </span>
                    <span className="font-bold text-emerald-600 dark:text-emerald-400 text-sm">
                      TZS {Number(verifiedDocument.serviceFee ?? 0).toLocaleString()} ·{" "}
                      {new Date(verifiedDocument.paidAt).toLocaleDateString()}
                    </span>
                  </div>
                )}
              </div>

              {/* Form data (staff only) */}
              {hasFullAccess &&
                verifiedDocument.formData &&
                Object.keys(verifiedDocument.formData).length > 0 && (
                  <div className="bg-blue-50 dark:bg-blue-900/20 rounded-2xl p-4 space-y-2">
                    <p className="text-sm font-bold text-blue-700 dark:text-blue-300 uppercase tracking-wider mb-3">
                      {L("Data ya Fomu (Staff Only)", "Form Data (Staff Only)")}
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
                      {Object.entries(verifiedDocument.formData)
                        .filter(([key]) => !key.includes("payment_data"))
                        .slice(0, 8)
                        .map(([key, value]) => (
                          <div key={key} className="flex flex-col">
                            <span className="text-blue-500 dark:text-blue-400 text-xs capitalize">
                              {key.replace(/_/g, " ")}
                            </span>
                            <span className="font-medium text-blue-900 dark:text-blue-200 truncate text-xs">
                              {String(value)}
                            </span>
                          </div>
                        ))}
                    </div>
                  </div>
                )}

              <div className="flex gap-3">
                <button className="flex-1 h-14 bg-stone-900 dark:bg-stone-100 text-white dark:text-stone-900 rounded-2xl font-bold hover:bg-black dark:hover:bg-white transition-all flex items-center justify-center gap-2 shadow-lg shadow-stone-200/50">
                  <Download className="h-5 w-5" />
                  {L("Pakua Nakala", "Download Copy")}
                </button>
                <button
                  onClick={resetSearch}
                  className="h-14 px-6 bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-300 rounded-2xl font-bold hover:bg-stone-200 dark:hover:bg-stone-700 transition-all"
                >
                  {L("Funga", "Close")}
                </button>
              </div>
            </div>
          )}

          {/* ── Invalid ── */}
          {verificationStatus === "invalid" && (
            <div className="bg-white dark:bg-stone-900 rounded-3xl p-8 border-2 border-red-400 shadow-xl shadow-red-100/50 space-y-6">
              <div className="flex items-center gap-4 p-4 bg-red-50 dark:bg-red-900/20 rounded-2xl border border-red-100 dark:border-red-800">
                <XCircle className="h-8 w-8 text-red-600 dark:text-red-400 shrink-0" />
                <div>
                  <p className="font-heading font-bold text-red-900 dark:text-red-300 text-lg">
                    {L("Haijapatikana", "Not Found")}
                  </p>
                  <p className="text-sm text-red-700 dark:text-red-400">
                    {errorDetail ||
                      L(
                        "Namba hii haipo kwenye mfumo wetu",
                        "This number was not found in our system",
                      )}
                  </p>
                </div>
              </div>

              <div className="p-4 bg-stone-800 dark:bg-stone-700 rounded-2xl">
                <p className="text-xs text-stone-400 uppercase tracking-wider mb-2">
                  {L("Ulichotafuta:", "You searched for:")}
                </p>
                <p className="font-mono text-base font-bold text-white">{qrInput}</p>
                <p className="text-xs text-stone-400 mt-1">
                  {L("Aina:", "Type:")} {L(selectedDocument.nameSw, selectedDocument.name)}
                </p>
              </div>

              <div className="p-4 bg-amber-50 dark:bg-amber-900/20 rounded-2xl border border-amber-200 dark:border-amber-700">
                <p className="text-sm text-amber-800 dark:text-amber-300 font-bold mb-2">
                  {L("Mambo ya kuangalia:", "Things to check:")}
                </p>
                <ul className="text-sm text-amber-700 dark:text-amber-400 space-y-1.5 list-disc list-inside">
                  <li>{L("Hakikisha ulichagua aina sahihi ya nyaraka", "Make sure you selected the correct document type")}</li>
                  <li>{L("Angalia namba haina makosa ya uandishi", "Check the number has no typos")}</li>
                  {selectedDocType === "ct_id" && (
                    <li>{L("CT ID inaanza na 'CT' ikifuatiwa na namba (mfano: CT26A00001)", "CT ID starts with 'CT' followed by numbers (e.g., CT26A00001)")}</li>
                  )}
                  {selectedDocType === "application" && (
                    <li>{L("Namba ya maombi inaanza na 'TZ-' (mfano: TZ-KIB-20260309-1234)", "Application number starts with 'TZ-' (e.g., TZ-KIB-20260309-1234)")}</li>
                  )}
                  <li>{L("Ombi lazima liwe limewasilishwa", "Application must have been submitted")}</li>
                </ul>
              </div>

              <button
                onClick={resetSearch}
                className="w-full h-14 bg-stone-900 dark:bg-stone-100 text-white dark:text-stone-900 rounded-2xl font-bold hover:bg-black dark:hover:bg-white transition-all"
              >
                {L("Jaribu Tena", "Try Again")}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* FAQ */}
      <div className="bg-white dark:bg-stone-900 rounded-3xl p-10 border border-stone-200 dark:border-stone-700 shadow-sm">
        <h2 className="text-2xl font-heading font-bold text-stone-900 dark:text-stone-100 mb-8 flex items-center gap-3">
          <FileText className="text-emerald-600" />
          {L("Maswali Yanayoulizwa Mara kwa Mara", "Frequently Asked Questions")}
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
          <div className="space-y-3">
            <p className="font-bold text-stone-800 dark:text-stone-200 text-lg">
              {L("Je, mfumo huu ni salama?", "Is this system secure?")}
            </p>
            <p className="text-stone-500 dark:text-stone-400 leading-relaxed">
              {L(
                "Ndiyo, kila hati inayotolewa na E-Mtaa ina saini ya kidijitali na kodi ya kipekee.",
                "Yes, every document issued by E-Mtaa features a digital signature and a unique code.",
              )}
            </p>
          </div>
          <div className="space-y-3">
            <p className="font-bold text-stone-800 dark:text-stone-200 text-lg">
              {L("Nifanye nini uhakiki ukifeli?", "What if verification fails?")}
            </p>
            <p className="text-stone-500 dark:text-stone-400 leading-relaxed">
              {L(
                "Hakikisha umechagua aina sahihi ya nyaraka na namba uliyoingiza haina makosa.",
                "Ensure you selected the correct document type and the code entered has no typos.",
              )}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
