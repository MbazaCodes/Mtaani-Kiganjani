import React, { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  User,
  CheckCircle2,
  Building2,
  MapPin,
  RefreshCw,
  LogOut,
  Camera,
  Loader2,
  Upload,
  Edit2,
  X,
  Save,
  AlertCircle,
  Clock,
  Shield,
  ChevronDown,
  Eye,
  EyeOff,
  Mail,
  Phone,
  Fingerprint,
  Globe,
  Home,
  Briefcase,
  Calendar,
  Hash,
  Award,
  BookOpen,
  Heart,
  Users,
  Baby,
  Flag,
  FileText,
  CreditCard,
  Map,
  Navigation,
  Store,
  Church,
  Info,
  Check,
  AlertTriangle,
  Trash2,
  Download,
  Plus,
  FileImage,
  FileBadge,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";
import { useLanguage } from "@/context/LanguageContext";
import { useToast } from "@/context/ToastContext";
import { InfoItem } from "../components/ui/InfoItem";
import { TANZANIA_ADDRESS_DATA } from "@/lib/addressData";

// Types based on signup form
interface UserProfile {
  // Basic Info
  id: string;
  email: string;
  role: "citizen" | "staff" | "admin";
  is_verified: boolean;
  photo_url?: string;

  // Personal Information
  first_name: string;
  middle_name?: string;
  last_name: string;
  gender: "Me" | "Ke" | "Other";
  date_of_birth?: string;
  place_of_birth?: string;
  birth_region?: string;
  birth_district?: string;
  marital_status?: "single" | "married" | "divorced" | "widowed";
  occupation?: string;
  education_level?: "none" | "primary" | "secondary" | "diploma" | "degree" | "masters" | "phd";

  // Identity Information
  nationality: string;
  nida_number?: string;
  id_type?:
    | "birth_certificate"
    | "voter_id"
    | "driving_license"
    | "zanzibar_id"
    | "student_id"
    | "employer_id"
    | "refugee_id";
  id_number?: string;
  passport_number?: string;
  voter_id_number?: string;
  driving_license_number?: string;

  // Contact Information
  phone: string;
  alternative_phone?: string;
  email_address?: string;
  alternative_email?: string;

  // Residential Address
  region: string;
  district: string;
  ward: string;
  street: string;
  house_number?: string;
  postal_code?: string;
  landmark?: string;

  // Local Government Officials
  mtaa_executive_officer?: string;
  ward_councillor?: string;
  ward_chairperson?: string;

  // Diaspora Information
  is_diaspora: boolean;
  country_of_residence?: string;
  city_of_residence?: string;
  diaspora_region?: string; // Home region in Tanzania
  diaspora_district?: string; // Home district in Tanzania
  diaspora_ward?: string; // Home ward in Tanzania

  // Emergency Contact
  emergency_contact_name?: string;
  emergency_contact_phone?: string;
  emergency_contact_relation?: string;

  // Staff/Work Information
  assigned_region?: string;
  assigned_district?: string;
  office_id?: string;
  employee_id?: string;
  department?: string;
  position?: string;
  employment_date?: string;

  // Additional Information
  blood_group?: "A+" | "A-" | "B+" | "B-" | "AB+" | "AB-" | "O+" | "O-";
  disability_status?: "none" | "physical" | "visual" | "hearing" | "speech" | "multiple";
  religious_affiliation?: string;
  tribe?: string;

  // Metadata
  created_at: string;
  updated_at: string;
  last_login?: string;
  account_status: "active" | "suspended" | "pending";
  email_verified: boolean;
  phone_verified: boolean;
}

interface PendingChange {
  id: string;
  field_name: string;
  old_value: string;
  new_value: string;
  status: string;
  created_at: string;
  reviewed_by?: string;
  reviewed_at?: string;
  comments?: string;
}

interface Document {
  id: string;
  document_type: string;
  document_category: "id" | "certificate" | "support";
  document_name: string;
  document_url: string;
  file_type: string;
  verified: boolean;
  uploaded_at: string;
}

// Document type options by category
const DOCUMENT_TYPES = {
  id: [
    { value: "nida_card", label: { en: "NIDA Card", sw: "Kadi ya NIDA" } },
    { value: "passport", label: { en: "Passport", sw: "Pasipoti" } },
    { value: "voter_id", label: { en: "Voter ID", sw: "Kadi ya Mpiga Kura" } },
    { value: "driving_license", label: { en: "Driving License", sw: "Leseni ya Udereva" } },
    { value: "zanzibar_id", label: { en: "Zanzibar ID", sw: "Kitambulisho cha Zanzibar" } },
    { value: "birth_certificate", label: { en: "Birth Certificate", sw: "Cheti cha Kuzaliwa" } },
  ],
  certificate: [
    {
      value: "education_certificate",
      label: { en: "Education Certificate", sw: "Cheti cha Elimu" },
    },
    {
      value: "professional_certificate",
      label: { en: "Professional Certificate", sw: "Cheti cha Kitaalamu" },
    },
    { value: "marriage_certificate", label: { en: "Marriage Certificate", sw: "Cheti cha Ndoa" } },
    { value: "death_certificate", label: { en: "Death Certificate", sw: "Cheti cha Kifo" } },
    { value: "award_certificate", label: { en: "Award/Achievement", sw: "Cheti cha Tuzo" } },
    { value: "other_certificate", label: { en: "Other Certificate", sw: "Cheti Kingine" } },
  ],
  support: [
    {
      value: "proof_of_residence",
      label: { en: "Proof of Residence", sw: "Uthibitisho wa Makazi" },
    },
    { value: "employment_letter", label: { en: "Employment Letter", sw: "Barua ya Ajira" } },
    { value: "bank_statement", label: { en: "Bank Statement", sw: "Taarifa ya Benki" } },
    { value: "utility_bill", label: { en: "Utility Bill", sw: "Bili ya Huduma" } },
    {
      value: "recommendation_letter",
      label: { en: "Recommendation Letter", sw: "Barua ya Pendekezo" },
    },
    { value: "police_clearance", label: { en: "Police Clearance", sw: "Barua ya Polisi" } },
    { value: "other_document", label: { en: "Other Document", sw: "Nyaraka Nyingine" } },
  ],
};

const DOCUMENT_CATEGORIES = [
  { value: "id", label: { en: "ID Documents", sw: "Vitambulisho" }, icon: "IdCard" },
  { value: "certificate", label: { en: "Certificates", sw: "Vyeti" }, icon: "Award" },
  {
    value: "support",
    label: { en: "Support Documents", sw: "Nyaraka za Msaada" },
    icon: "FileText",
  },
];

const ALLOWED_DOCUMENT_TYPES = ["image/jpeg", "image/png", "image/webp", "application/pdf"];
const MAX_DOCUMENT_SIZE = 10 * 1024 * 1024; // 10MB

interface FormData {
  // Personal Information
  first_name: string;
  middle_name: string;
  last_name: string;
  gender: string;
  date_of_birth: string;
  place_of_birth: string;
  birth_region: string;
  birth_district: string;
  marital_status: string;
  occupation: string;
  education_level: string;

  // Identity Information
  nationality: string;
  nida_number: string;
  id_type: string;
  id_number: string;
  passport_number: string;
  voter_id_number: string;
  driving_license_number: string;

  // Contact Information
  phone: string;
  alternative_phone: string;
  alternative_email: string;

  // Residential Address
  region: string;
  district: string;
  ward: string;
  street: string;
  house_number: string;
  postal_code: string;
  landmark: string;

  // Street/Local Government Officials
  mtaa_executive_officer: string;
  ward_councillor: string;
  ward_chairperson: string;

  // Diaspora Information
  is_diaspora: boolean;
  country_of_residence: string;
  city_of_residence: string;
  diaspora_region: string;
  diaspora_district: string;
  diaspora_ward: string;

  // Emergency Contact
  emergency_contact_name: string;
  emergency_contact_phone: string;
  emergency_contact_relation: string;

  // Additional Information
  blood_group: string;
  disability_status: string;
  religious_affiliation: string;
  tribe: string;
}

// Constants
const SENSITIVE_FIELDS = [
  "first_name",
  "middle_name",
  "last_name",
  "nida_number",
  "nationality",
  "gender",
  "date_of_birth",
  "id_number",
  "passport_number",
  "voter_id_number",
  "driving_license_number",
];

// Fields that can be directly updated in the users table
const UPDATABLE_FIELDS = [
  "first_name",
  "middle_name",
  "last_name",
  "gender",
  "sex",
  "nationality",
  "country_of_citizenship",
  "nida_number",
  "id_type",
  "id_number",
  "phone",
  "email",
  "photo_url",
  "is_diaspora",
  "country_of_residence",
  "passport_number",
  "region",
  "district",
  "ward",
  "street",
  "birth_region",
  "birth_district",
  "mtaa_executive_officer",
  "ward_councillor",
  "ward_chairperson",
  "assigned_region",
  "assigned_district",
  "date_of_birth",
  "place_of_birth",
  "marital_status",
  "occupation",
  "education_level",
  "alternative_phone",
  "email_address",
  "alternative_email",
  "house_number",
  "postal_code",
  "landmark",
  "emergency_contact_name",
  "emergency_contact_phone",
  "emergency_contact_relation",
  "employee_id",
  "department",
  "position",
  "employment_date",
  "blood_group",
  "disability_status",
  "religious_affiliation",
  "tribe",
  "last_login",
  "account_status",
  "email_verified",
  "phone_verified",
  "voter_id_number",
  "driving_license_number",
  "city_of_residence",
  "diaspora_region",
  "diaspora_district",
  "diaspora_ward",
];

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];

const FIELD_LABELS: Record<string, { en: string; sw: string }> = {
  // Personal
  first_name: { en: "First Name", sw: "Jina la Kwanza" },
  middle_name: { en: "Middle Name", sw: "Jina la Kati" },
  last_name: { en: "Last Name", sw: "Jina la Mwisho" },
  gender: { en: "Gender", sw: "Jinsia" },
  date_of_birth: { en: "Date of Birth", sw: "Tarehe ya Kuzaliwa" },
  place_of_birth: { en: "Place of Birth", sw: "Mahali pa Kuzaliwa" },
  birth_region: { en: "Birth Region", sw: "Mkoa wa Kuzaliwa" },
  birth_district: { en: "Birth District", sw: "Wilaya ya Kuzaliwa" },
  marital_status: { en: "Marital Status", sw: "Hali ya Ndoa" },
  occupation: { en: "Occupation", sw: "Kazi" },
  education_level: { en: "Education Level", sw: "Kiwango cha Elimu" },

  // Identity
  nationality: { en: "Nationality", sw: "Uraia" },
  nida_number: { en: "NIDA Number", sw: "Namba ya NIDA" },
  id_type: { en: "ID Type", sw: "Aina ya Kitambulisho" },
  id_number: { en: "ID Number", sw: "Namba ya Kitambulisho" },
  passport_number: { en: "Passport Number", sw: "Namba ya Pasipoti" },
  voter_id_number: { en: "Voter ID Number", sw: "Namba ya Kadi ya Mpiga Kura" },
  driving_license_number: { en: "Driving License", sw: "Namba ya Leseni ya Udereva" },

  // Contact
  phone: { en: "Phone Number", sw: "Namba ya Simu" },
  alternative_phone: { en: "Alternative Phone", sw: "Namba Mbadala ya Simu" },
  alternative_email: { en: "Alternative Email", sw: "Barua Pepe Mbadala" },

  // Address
  region: { en: "Region", sw: "Mkoa" },
  district: { en: "District", sw: "Wilaya" },
  ward: { en: "Ward", sw: "Kata" },
  street: { en: "Street/Village", sw: "Mtaa/Kijiji" },
  house_number: { en: "House Number", sw: "Namba ya Nyumba" },
  postal_code: { en: "Postal Code", sw: "Namba ya Posta" },
  landmark: { en: "Landmark", sw: "Alama ya Eneo" },

  // Local Government Officials
  mtaa_executive_officer: {
    en: "Village/Street Executive Officer (VEO/MEO)",
    sw: "Mtendaji wa Kijiji/Mtaa (VEO/MEO)",
  },
  ward_councillor: { en: "Ward Councillor", sw: "Diwani wa Kata" },
  ward_chairperson: { en: "Ward Chairperson (Optional)", sw: "Mwenyekiti wa Kata (Si Lazima)" },

  // Diaspora
  country_of_residence: { en: "Country of Residence", sw: "Nchi Unayoishi" },
  city_of_residence: { en: "City of Residence", sw: "Mji Unayoishi" },
  diaspora_region: { en: "Home Region", sw: "Mkoa wa Nyumbani" },
  diaspora_district: { en: "Home District", sw: "Wilaya ya Nyumbani" },
  diaspora_ward: { en: "Home Ward", sw: "Kata ya Nyumbani" },

  // Emergency
  emergency_contact_name: { en: "Emergency Contact", sw: "Mtu wa Dharura" },
  emergency_contact_phone: { en: "Emergency Phone", sw: "Simu ya Dharura" },
  emergency_contact_relation: { en: "Relationship", sw: "Uhusiano" },

  // Additional
  blood_group: { en: "Blood Group", sw: "Kundi la Damu" },
  disability_status: { en: "Disability Status", sw: "Hali ya Ulemavu" },
  religious_affiliation: { en: "Religion", sw: "Dini" },
  tribe: { en: "Tribe", sw: "Kabila" },
};

const MARITAL_STATUS_OPTIONS = [
  { value: "single", en: "Single", sw: "Haijaolewa/Haijaozwa" },
  { value: "married", en: "Married", sw: "Ameolewa/Ameoa" },
  { value: "divorced", en: "Divorced", sw: "Ameachika" },
  { value: "widowed", en: "Widowed", sw: "Mjane/Mgane" },
];

const EDUCATION_LEVELS = [
  { value: "none", en: "No Formal Education", sw: "Hakuna Elimu Rasmi" },
  { value: "primary", en: "Primary Education", sw: "Elimu ya Msingi" },
  { value: "secondary", en: "Secondary Education", sw: "Elimu ya Sekondari" },
  { value: "diploma", en: "Diploma", sw: "Stashahada" },
  { value: "degree", en: "Bachelor's Degree", sw: "Shahada ya Kwanza" },
  { value: "masters", en: "Master's Degree", sw: "Shahada ya Uzamili" },
  { value: "phd", en: "PhD", sw: "Uzamivu" },
];

const BLOOD_GROUPS = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];

const DISABILITY_STATUS = [
  { value: "none", en: "No Disability", sw: "Hakuna Ulemavu" },
  { value: "physical", en: "Physical Disability", sw: "Ulemavu wa Mwili" },
  { value: "visual", en: "Visual Impairment", sw: "Ulemavu wa Macho" },
  { value: "hearing", en: "Hearing Impairment", sw: "Ulemavu wa Kusikia" },
  { value: "speech", en: "Speech Impairment", sw: "Ulemavu wa Kuongea" },
  { value: "multiple", en: "Multiple Disabilities", sw: "Ulemavu Mwingi" },
];

export function Profile() {
  const { user, signOut, refreshProfile } = useAuth();
  const { lang } = useLanguage();
  const { showToast } = useToast();

  // State
  const [uploading, setUploading] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [pendingChanges, setPendingChanges] = useState<PendingChange[]>([]);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  const [showNidaFormat, setShowNidaFormat] = useState(false);
  const [isDirty, setIsDirty] = useState(false);
  const [activeTab, setActiveTab] = useState("personal");
  const [loading, setLoading] = useState(true);
  const [isProfileImageBroken, setIsProfileImageBroken] = useState(false);
  const [failedDocumentPreviews, setFailedDocumentPreviews] = useState<Record<string, boolean>>({});

  // Document upload state
  const [documentUploading, setDocumentUploading] = useState(false);
  const [selectedDocCategory, setSelectedDocCategory] = useState<"id" | "certificate" | "support">(
    "id",
  );
  const [selectedDocType, setSelectedDocType] = useState("");
  const [showDocumentUpload, setShowDocumentUpload] = useState(false);

  // Citizen ID (auto-generated, read-only)
  const [citizenId, setCitizenId] = useState<string>("");

  // Business IDs (for registered sellers, landlords, brokers)
  const [sellerId, setSellerId] = useState<string>("");
  const [landlordId, setLandlordId] = useState<string>("");
  const [brokerId, setBrokerId] = useState<string>("");

  const fileInputRef = useRef<HTMLInputElement>(null);
  const documentInputRef = useRef<HTMLInputElement>(null);
  const hasShownProfileFetchErrorRef = useRef(false);

  // Form state - initialize with all signup fields
  const [formData, setFormData] = useState<FormData>({
    // Personal Information
    first_name: "",
    middle_name: "",
    last_name: "",
    gender: "",
    date_of_birth: "",
    place_of_birth: "",
    birth_region: "",
    birth_district: "",
    marital_status: "",
    occupation: "",
    education_level: "",

    // Identity Information
    nationality: "Tanzanian",
    nida_number: "",
    id_type: "",
    id_number: "",
    passport_number: "",
    voter_id_number: "",
    driving_license_number: "",

    // Contact Information
    phone: "",
    alternative_phone: "",
    alternative_email: "",

    // Residential Address
    region: "",
    district: "",
    ward: "",
    street: "",
    house_number: "",
    postal_code: "",
    landmark: "",

    // Street/Local Government Officials
    mtaa_executive_officer: "",
    ward_councillor: "",
    ward_chairperson: "",

    // Diaspora Information
    is_diaspora: false,
    country_of_residence: "",
    city_of_residence: "",
    diaspora_region: "",
    diaspora_district: "",
    diaspora_ward: "",

    // Emergency Contact
    emergency_contact_name: "",
    emergency_contact_phone: "",
    emergency_contact_relation: "",

    // Additional Information
    blood_group: "",
    disability_status: "none",
    religious_affiliation: "",
    tribe: "",
  });

  // Fetch complete user profile
  useEffect(() => {
    if (user?.id) {
      fetchCompleteProfile();
      fetchPendingChanges();
      fetchDocuments();
    }
  }, [user?.id]);

  useEffect(() => {
    if (!loading && user) {
      setFormData((prev) => ({
        ...prev,
        first_name: prev.first_name || user.first_name || "",
        middle_name: prev.middle_name || user.middle_name || "",
        last_name: prev.last_name || user.last_name || "",
        phone: prev.phone || user.phone || "",
        nationality: prev.nationality || user.nationality || "",
        is_diaspora: prev.is_diaspora || user.is_diaspora || false,
        country_of_residence: prev.country_of_residence || user.country_of_residence || "",
      }));
    }
  }, [user, loading]);

  const fetchCompleteProfile = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("users")
        .select("*")
        .eq("id", user?.id)
        .maybeSingle();

      if (error) {
        throw error;
      }

      if (!data) {
        // Keep existing form values when profile row is unavailable.
        setFormData((prev) => ({
          ...prev,
          first_name: user?.first_name || prev.first_name,
          middle_name: user?.middle_name || prev.middle_name,
          last_name: user?.last_name || prev.last_name,
          phone: user?.phone || prev.phone,
          nationality: user?.nationality || prev.nationality,
          is_diaspora: user?.is_diaspora || prev.is_diaspora,
          country_of_residence: user?.country_of_residence || prev.country_of_residence,
        }));
        setLoading(false);
        return;
      }

      // Reset error-toast guard once a successful profile fetch happens.
      hasShownProfileFetchErrorRef.current = false;
      setIsProfileImageBroken(false);

      // Set citizen_id (read-only, auto-generated)
      setCitizenId(data.citizen_id || "");

      // Set business IDs if registered
      setSellerId(data.seller_id || "");
      setLandlordId(data.landlord_id || "");
      setBrokerId(data.broker_id || "");

      setFormData({
        // Personal Information
        first_name: data.first_name || "",
        middle_name: data.middle_name || "",
        last_name: data.last_name || "",
        gender: data.gender || "",
        date_of_birth: data.date_of_birth || "",
        place_of_birth: data.place_of_birth || "",
        birth_region: data.birth_region || "",
        birth_district: data.birth_district || "",
        marital_status: data.marital_status || "",
        occupation: data.occupation || "",
        education_level: data.education_level || "",

        // Identity Information
        nationality: data.nationality || "Tanzanian",
        nida_number: data.nida_number || "",
        id_type: data.id_type || "",
        id_number: data.id_number || "",
        passport_number: data.passport_number || "",
        voter_id_number: data.voter_id_number || "",
        driving_license_number: data.driving_license_number || "",

        // Contact Information
        phone: data.phone || "",
        alternative_phone: data.alternative_phone || "",
        alternative_email: data.alternative_email || "",

        // Residential Address
        region: data.region || "",
        district: data.district || "",
        ward: data.ward || "",
        street: data.street || "",
        house_number: data.house_number || "",
        postal_code: data.postal_code || "",
        landmark: data.landmark || "",

        // Street/Local Government Officials
        mtaa_executive_officer: data.mtaa_executive_officer || "",
        ward_councillor: data.ward_councillor || "",
        ward_chairperson: data.ward_chairperson || "",

        // Diaspora Information
        is_diaspora: data.is_diaspora || false,
        country_of_residence: data.country_of_residence || "",
        city_of_residence: data.city_of_residence || "",
        diaspora_region: data.diaspora_region || "",
        diaspora_district: data.diaspora_district || "",
        diaspora_ward: data.diaspora_ward || "",

        // Emergency Contact
        emergency_contact_name: data.emergency_contact_name || "",
        emergency_contact_phone: data.emergency_contact_phone || "",
        emergency_contact_relation: data.emergency_contact_relation || "",

        // Additional Information
        blood_group: data.blood_group || "",
        disability_status: data.disability_status || "none",
        religious_affiliation: data.religious_affiliation || "",
        tribe: data.tribe || "",
      });
    } catch (error) {
      console.error("Error fetching profile:", error);

      // React StrictMode can trigger duplicate effects in dev; show at most one toast until success.
      if (!hasShownProfileFetchErrorRef.current) {
        hasShownProfileFetchErrorRef.current = true;
        showToast(
          lang === "sw"
            ? "Imeshindikana kusawazisha wasifu kwa sasa. Tunaonyesha taarifa zilizopo."
            : "Failed to sync profile right now. Showing available profile data.",
          "warning",
        );
      }
    } finally {
      setLoading(false);
    }
  };

  const fetchDocuments = async () => {
    try {
      const { data, error } = await supabase
        .from("user_documents")
        .select("*")
        .eq("user_id", user?.id)
        .order("uploaded_at", { ascending: false });

      if (error) throw error;
      if (data) {
        setDocuments(data);
        setFailedDocumentPreviews({});
      }
    } catch (error) {
      console.error("Error fetching documents:", error);
    }
  };

  const fetchPendingChanges = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from("profile_change_requests")
        .select("*")
        .eq("user_id", user.id)
        .eq("status", "pending")
        .order("created_at", { ascending: false });

      if (error) throw error;
      if (data) setPendingChanges(data);
    } catch (error) {
      console.error("Error fetching pending changes:", error);
    }
  };

  // Helper: update form data and mark dirty
  const updateForm = (updates: Partial<FormData>) => {
    setFormData((prev) => ({ ...prev, ...updates }));
    setIsDirty(true);
  };

  // Derived data for address fields
  const regions = useMemo(() => TANZANIA_ADDRESS_DATA.map((r) => r.name), []);

  const districts = useMemo(() => {
    if (!formData.region) return [];
    return (
      TANZANIA_ADDRESS_DATA.find((r) => r.name === formData.region)?.districts.map((d) => d.name) ||
      []
    );
  }, [formData.region]);

  const wards = useMemo(() => {
    if (!formData.region || !formData.district) return [];
    return (
      TANZANIA_ADDRESS_DATA.find((r) => r.name === formData.region)?.districts.find(
        (d) => d.name === formData.district,
      )?.wards || []
    );
  }, [formData.region, formData.district]);

  // Validation functions
  const validateNidaNumber = (nida: string): { isValid: boolean; message: string } => {
    if (!nida) return { isValid: true, message: "" };

    const cleanNida = nida.replace(/-/g, "");

    if (cleanNida.length !== 20) {
      return {
        isValid: false,
        message:
          lang === "sw"
            ? "Namba ya NIDA lazima iwe na tarakimu 20"
            : "NIDA number must be 20 digits",
      };
    }

    if (!/^\d+$/.test(cleanNida)) {
      return {
        isValid: false,
        message:
          lang === "sw"
            ? "Namba ya NIDA lazima iwe na tarakimu pekee"
            : "NIDA number must contain only digits",
      };
    }

    return { isValid: true, message: "" };
  };

  const validatePhoneNumber = (phone: string): { isValid: boolean; message: string } => {
    if (!phone) return { isValid: true, message: "" };

    const tzPhoneRegex = /^(?:(?:\+255|0)[67]\d{8})$/;
    if (!tzPhoneRegex.test(phone)) {
      return {
        isValid: false,
        message:
          lang === "sw"
            ? "Namba ya simu sio sahihi. Tumia +255XXXXXXXXX au 0XXXXXXXXX"
            : "Invalid phone number. Use +255XXXXXXXXX or 0XXXXXXXXX",
      };
    }

    return { isValid: true, message: "" };
  };

  // Handle refresh
  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    try {
      await fetchCompleteProfile();
      await fetchPendingChanges();
      await fetchDocuments();
      showToast(lang === "sw" ? "Wasifu umeonyeshwa upya" : "Profile refreshed", "success");
    } catch (error) {
      showToast(
        lang === "sw" ? "Hitilafu kuonyesha upya wasifu" : "Error refreshing profile",
        "error",
      );
    } finally {
      setTimeout(() => setIsRefreshing(false), 500);
    }
  }, [lang, showToast]);

  // Handle file upload
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
      showToast(
        lang === "sw"
          ? "Aina ya faili haikubaliki. Tumia JPG, PNG, WEBP, au GIF"
          : "File type not allowed. Use JPG, PNG, WEBP, or GIF",
        "error",
      );
      return;
    }

    if (file.size > MAX_FILE_SIZE) {
      showToast(
        lang === "sw" ? "Faili ni kubwa sana. Maximum 5MB" : "File too large. Maximum 5MB",
        "error",
      );
      return;
    }

    setUploading(true);
    try {
      const reader = new FileReader();

      const base64data = await new Promise<string>((resolve, reject) => {
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });

      const { error } = await supabase
        .from("users")
        .update({ photo_url: base64data })
        .eq("id", user?.id);

      if (error) throw error;

      showToast(
        lang === "sw" ? "Picha imepakiwa kikamilifu!" : "Profile picture uploaded successfully!",
        "success",
      );

      await fetchCompleteProfile();
    } catch (error) {
      console.error("Error uploading photo:", error);
      showToast(
        lang === "sw" ? "Hitilafu imetokea wakati wa kupakia." : "Error occurred during upload.",
        "error",
      );
    } finally {
      setUploading(false);
    }
  };

  // Handle document upload
  const handleDocumentUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedDocType) {
      showToast(
        lang === "sw" ? "Tafadhali chagua aina ya nyaraka" : "Please select document type",
        "error",
      );
      return;
    }

    if (!ALLOWED_DOCUMENT_TYPES.includes(file.type)) {
      showToast(
        lang === "sw"
          ? "Aina ya faili haikubaliki. Tumia JPG, PNG, WEBP, au PDF"
          : "File type not allowed. Use JPG, PNG, WEBP, or PDF",
        "error",
      );
      return;
    }

    if (file.size > MAX_DOCUMENT_SIZE) {
      showToast(
        lang === "sw" ? "Faili ni kubwa sana. Maximum 10MB" : "File too large. Maximum 10MB",
        "error",
      );
      return;
    }

    setDocumentUploading(true);
    try {
      const reader = new FileReader();

      const base64data = await new Promise<string>((resolve, reject) => {
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });

      // Find the label for the selected document type
      const docTypeOption = DOCUMENT_TYPES[selectedDocCategory].find(
        (t) => t.value === selectedDocType,
      );
      const documentName = docTypeOption
        ? docTypeOption.label[lang === "sw" ? "sw" : "en"]
        : selectedDocType;

      const { error } = await supabase.from("user_documents").insert({
        user_id: user?.id,
        document_type: selectedDocType,
        document_category: selectedDocCategory,
        document_name: documentName,
        document_url: base64data,
        file_type: file.type,
        file_size: file.size,
        verified: false,
      });

      if (error) throw error;

      showToast(
        lang === "sw" ? "Nyaraka imepakiwa kikamilifu!" : "Document uploaded successfully!",
        "success",
      );

      // Reset form and refresh documents
      setSelectedDocType("");
      setShowDocumentUpload(false);
      if (documentInputRef.current) {
        documentInputRef.current.value = "";
      }
      await fetchDocuments();
    } catch (error) {
      console.error("Error uploading document:", error);
      showToast(
        lang === "sw"
          ? "Hitilafu imetokea wakati wa kupakia nyaraka."
          : "Error occurred during document upload.",
        "error",
      );
    } finally {
      setDocumentUploading(false);
    }
  };

  // Handle document delete
  const handleDeleteDocument = async (documentId: string) => {
    if (
      !confirm(
        lang === "sw"
          ? "Una uhakika unataka kufuta nyaraka hii?"
          : "Are you sure you want to delete this document?",
      )
    ) {
      return;
    }

    try {
      const { error } = await supabase
        .from("user_documents")
        .delete()
        .eq("id", documentId)
        .eq("user_id", user?.id);

      if (error) throw error;

      showToast(
        lang === "sw" ? "Nyaraka imefutwa kikamilifu!" : "Document deleted successfully!",
        "success",
      );

      await fetchDocuments();
    } catch (error) {
      console.error("Error deleting document:", error);
      showToast(
        lang === "sw"
          ? "Hitilafu imetokea wakati wa kufuta nyaraka."
          : "Error occurred while deleting document.",
        "error",
      );
    }
  };

  // Get document type label
  const getDocumentTypeLabel = (docType: string, category: string) => {
    const categoryTypes = DOCUMENT_TYPES[category as keyof typeof DOCUMENT_TYPES] || [];
    const typeOption = categoryTypes.find((t) => t.value === docType);
    return typeOption ? typeOption.label[lang === "sw" ? "sw" : "en"] : docType;
  };

  // Get category label
  const getCategoryLabel = (category: string) => {
    const cat = DOCUMENT_CATEGORIES.find((c) => c.value === category);
    return cat ? cat.label[lang === "sw" ? "sw" : "en"] : category;
  };

  // Form validation
  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};

    if (formData.nida_number) {
      const nidaValidation = validateNidaNumber(formData.nida_number);
      if (!nidaValidation.isValid) {
        errors.nida_number = nidaValidation.message;
      }
    }

    if (formData.phone) {
      const phoneValidation = validatePhoneNumber(formData.phone);
      if (!phoneValidation.isValid) {
        errors.phone = phoneValidation.message;
      }
    }

    if (formData.alternative_phone) {
      const altPhoneValidation = validatePhoneNumber(formData.alternative_phone);
      if (!altPhoneValidation.isValid) {
        errors.alternative_phone = altPhoneValidation.message;
      }
    }

    if (!formData.first_name) {
      errors.first_name = lang === "sw" ? "Jina la kwanza linahitajika" : "First name is required";
    }

    if (!formData.last_name) {
      errors.last_name = lang === "sw" ? "Jina la mwisho linahitajika" : "Last name is required";
    }

    if (!formData.phone) {
      errors.phone = lang === "sw" ? "Namba ya simu inahitajika" : "Phone number is required";
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Handle save
  const handleSaveProfile = async () => {
    if (!validateForm()) {
      showToast(
        lang === "sw"
          ? "Tafadhali sahihisha makosa kabla ya kuendelea"
          : "Please fix errors before proceeding",
        "error",
      );
      return;
    }

    setSaving(true);
    try {
      // Format NIDA number by removing dashes for storage
      const formattedNida = formData.nida_number.replace(/-/g, "");

      const sensitiveUpdates: { field: string; oldValue: string; newValue: string }[] = [];
      const directUpdates: Record<string, any> = {};

      // Get current user data for comparison
      const { data: currentUser } = await supabase
        .from("users")
        .select("*")
        .eq("id", user?.id)
        .single();

      // Check which fields changed
      for (const [field, newValue] of Object.entries(formData)) {
        // Skip fields that are not in the database
        if (!UPDATABLE_FIELDS.includes(field)) continue;

        const compareValue = field === "nida_number" ? formattedNida : newValue;
        const oldValue = currentUser?.[field] || "";

        if (compareValue !== oldValue) {
          if (SENSITIVE_FIELDS.includes(field)) {
            sensitiveUpdates.push({ field, oldValue, newValue: compareValue });
          } else {
            directUpdates[field] = compareValue;
          }
        }
      }

      // Direct updates for non-sensitive fields
      if (Object.keys(directUpdates).length > 0) {
        const { error } = await supabase.from("users").update(directUpdates).eq("id", user?.id);

        if (error) throw error;
      }

      // Create change requests for sensitive fields
      if (sensitiveUpdates.length > 0) {
        const changeRequests = sensitiveUpdates.map(({ field, oldValue, newValue }) => ({
          user_id: user?.id,
          field_name: field,
          old_value: oldValue,
          new_value: newValue,
          status: "pending",
        }));

        const { error } = await supabase.from("profile_change_requests").insert(changeRequests);

        if (error) throw error;

        showToast(
          lang === "sw"
            ? `Mabadiliko ${sensitiveUpdates.length} ya taarifa nyeti yamewasilishwa kwa idhini.`
            : `${sensitiveUpdates.length} sensitive field change(s) submitted for approval.`,
          "info",
        );
      }

      if (Object.keys(directUpdates).length > 0) {
        showToast(lang === "sw" ? "Wasifu umesasishwa!" : "Profile updated!", "success");
      }

      setIsEditing(false);
      setIsDirty(false);
      await fetchCompleteProfile();
      await fetchPendingChanges();
    } catch (error: unknown) {
      const _e = error as { message?: string };
      console.error("Error saving profile:", error);
      showToast(
        _e.message || (lang === "sw" ? "Hitilafu kuhifadhi wasifu" : "Error saving profile"),
        "error",
      );
    } finally {
      setSaving(false);
    }
  };

  // Handle cancel
  const handleCancel = () => {
    fetchCompleteProfile(); // Reset to original data
    setValidationErrors({});
    setIsEditing(false);
    setIsDirty(false);
  };

  // Format NIDA for display
  const formatNidaForDisplay = (nida: string) => {
    if (!nida) return "";
    const clean = nida.replace(/-/g, "");
    return clean.match(/.{1,4}/g)?.join("-") || clean;
  };

  // Handle NIDA change
  const handleNidaChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawValue = e.target.value.replace(/[^\d-]/g, "");

    if (showNidaFormat) {
      const digits = rawValue.replace(/-/g, "");
      if (digits.length <= 20) {
        const formatted = digits.match(/.{1,4}/g)?.join("-") || digits;
        setFormData({ ...formData, nida_number: formatted });
      }
    } else {
      setFormData({ ...formData, nida_number: rawValue });
    }
  };

  // Get field label
  const getFieldLabel = (field: string) => {
    return FIELD_LABELS[field]?.[lang] || field;
  };

  // Render tabs
  const renderTabs = () => (
    <div className="border-b border-stone-200 mb-4 sm:mb-6">
      <div className="flex gap-1 overflow-x-auto scrollbar-none pb-px -mb-px">
        {[
          { id: "personal", label: lang === "sw" ? "Binafsi" : "Personal", icon: User },
          { id: "identity", label: lang === "sw" ? "Utambulisho" : "Identity", icon: CreditCard },
          { id: "contact", label: lang === "sw" ? "Mawasiliano" : "Contact", icon: Phone },
          { id: "address", label: lang === "sw" ? "Anwani" : "Address", icon: MapPin },
          { id: "diaspora", label: lang === "sw" ? "Diaspora" : "Diaspora", icon: Globe },
          { id: "emergency", label: lang === "sw" ? "Dharura" : "Emergency", icon: AlertCircle },
          { id: "additional", label: lang === "sw" ? "Nyongeza" : "Additional", icon: Info },
          { id: "documents", label: lang === "sw" ? "Nyaraka" : "Documents", icon: FileText },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-1.5 px-3 py-2 font-medium text-xs sm:text-sm whitespace-nowrap rounded-t-lg transition-all flex-shrink-0 border-b-2 ${
              activeTab === tab.id
                ? "bg-emerald-50 text-emerald-700 border-emerald-500"
                : "text-stone-500 hover:text-stone-900 hover:bg-stone-50 border-transparent"
            }`}
          >
            <tab.icon size={14} />
            {tab.label}
          </button>
        ))}
      </div>
    </div>
  );

  // Render loading state
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="text-center">
          <Loader2 size={40} className="animate-spin text-emerald-600 mx-auto mb-4" />
          <p className="text-stone-600">
            {lang === "sw" ? "Inapakia wasifu..." : "Loading profile..."}
          </p>
        </div>
      </div>
    );
  }

  return (
    <motion.div
      key="profile"
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="max-w-6xl mx-auto space-y-4 sm:space-y-8"
    >
      {/* Header with refresh */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-stone-900">
          {lang === "sw" ? "Wasifu Wangu" : "My Profile"}
        </h1>
        <div className="flex items-center gap-3">
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-50 text-emerald-600 rounded-xl font-semibold text-sm hover:bg-emerald-100 transition-all disabled:opacity-50"
          >
            <RefreshCw size={16} className={isRefreshing ? "animate-spin" : ""} />
            {lang === "sw" ? "Onyesha Upya" : "Refresh"}
          </motion.button>
        </div>
      </div>

      {/* Main profile card */}
      <div className="bg-white rounded-4xl border border-stone-100 shadow-xl overflow-hidden">
        {/* Profile header */}
        <div className="bg-linear-to-br from-emerald-600 to-emerald-700 p-5 sm:p-8 md:p-12 text-white relative overflow-hidden">
          <div className="absolute inset-0 bg-black/10" />
          <div className="relative z-10 flex flex-col md:flex-row items-center gap-8">
            <div className="relative group">
              <motion.div
                whileHover={{ scale: 1.05 }}
                className="w-32 h-32 rounded-full bg-white/20 backdrop-blur-md border-4 border-white/30 flex items-center justify-center text-4xl font-black overflow-hidden shadow-2xl"
              >
                {user?.photo_url && !isProfileImageBroken ? (
                  <img
                    src={user.photo_url}
                    alt="Profile"
                    className="w-full h-full object-cover"
                    referrerPolicy="no-referrer"
                    onError={() => {
                      setIsProfileImageBroken(true);
                    }}
                  />
                ) : (
                  <span>
                    {(formData.first_name?.[0] || user?.first_name?.[0] || "").toUpperCase()}
                    {(formData.last_name?.[0] || user?.last_name?.[0] || "").toUpperCase()}
                  </span>
                )}
              </motion.div>
              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="absolute bottom-0 right-0 p-2 bg-white text-emerald-600 rounded-full shadow-lg hover:shadow-xl transition-all disabled:opacity-50"
                title={lang === "sw" ? "Badilisha picha" : "Change photo"}
              >
                {uploading ? <Loader2 size={16} className="animate-spin" /> : <Camera size={16} />}
              </motion.button>
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                accept={ALLOWED_IMAGE_TYPES.join(",")}
                className="hidden"
                aria-label="Upload profile picture"
              />
            </div>
            <div className="text-center md:text-left space-y-2 flex-1">
              <h2 className="text-3xl md:text-4xl font-black tracking-tight">
                {formData.first_name || user?.first_name}{" "}
                {formData.middle_name || user?.middle_name || ""}{" "}
                {formData.last_name || user?.last_name}
              </h2>
              <div className="flex flex-wrap justify-center md:justify-start gap-3">
                <motion.span
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="bg-white/20 backdrop-blur-md px-4 py-1 rounded-full text-sm font-bold border border-white/30"
                >
                  {user?.role === "citizen"
                    ? lang === "sw"
                      ? "Mwananchi"
                      : "Citizen"
                    : user?.role === "admin"
                      ? lang === "sw"
                        ? "Msimamizi"
                        : "Administrator"
                      : lang === "sw"
                        ? "Mtumishi"
                        : "Staff"}
                </motion.span>
                {user?.is_verified && (
                  <motion.span
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="bg-emerald-400/20 backdrop-blur-md px-4 py-1 rounded-full text-sm font-bold border border-emerald-400/30 flex items-center gap-2"
                  >
                    <CheckCircle2 size={14} />
                    {lang === "sw" ? "Akaunti Imethibitishwa" : "Verified Account"}
                  </motion.span>
                )}
                {user?.account_status === "pending" && (
                  <motion.span
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="bg-amber-400/20 backdrop-blur-md px-4 py-1 rounded-full text-sm font-bold border border-amber-400/30 flex items-center gap-2"
                  >
                    <Clock size={14} />
                    {lang === "sw" ? "Inasubiri Uthibitisho" : "Pending Verification"}
                  </motion.span>
                )}
              </div>
              <p className="text-white/80 text-sm flex items-center gap-2 justify-center md:justify-start">
                <Mail size={14} />
                {user?.email}
              </p>
              <p className="text-white/80 text-sm flex items-center gap-2 justify-center md:justify-start">
                <Phone size={14} />
                {formData.phone ||
                  user?.phone ||
                  (lang === "sw" ? "Simu haijatolewa" : "Phone not provided")}
              </p>
            </div>
          </div>
          <Building2 className="absolute -right-10 -bottom-10 h-64 w-64 text-white/10 rotate-12" />
        </div>

        {/* Incomplete profile banner */}
        {!loading && !formData.last_name && (
          <div className="bg-red-50 border-l-4 border-red-500 p-4 mx-4 sm:mx-8 mt-4 sm:mt-8 rounded-lg">
            <div className="flex items-start gap-3">
              <AlertCircle className="text-red-500 shrink-0 mt-0.5" size={20} />
              <div className="flex-1">
                <h4 className="font-bold text-red-800 text-sm">
                  {lang === "sw" ? "Wasifu Wako Haujakamilika" : "Your Profile is Incomplete"}
                </h4>
                <p className="text-sm text-red-700 mt-1">
                  {lang === "sw"
                    ? "Taarifa zako za usajili hazikuhifadhiwa ipasavyo. Tafadhali hariri wasifu wako na ujaze taarifa zako kamili."
                    : "Your registration details were not saved correctly. Please edit your profile and fill in your complete details."}
                </p>
                <button
                  onClick={() => {
                    setIsEditing(true);
                    setActiveTab("personal");
                  }}
                  className="mt-2 inline-flex items-center gap-1.5 text-xs font-bold text-red-700 bg-red-100 hover:bg-red-200 px-3 py-1.5 rounded-lg transition-colors"
                >
                  <Edit2 size={12} />
                  {lang === "sw" ? "Kamilisha Wasifu" : "Complete Profile Now"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Pending changes alert */}
        <AnimatePresence>
          {pendingChanges.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="bg-amber-50 border-l-4 border-amber-500 p-4 mx-8 mt-8 rounded-lg"
            >
              <div className="flex items-start gap-3">
                <Clock className="text-amber-600 shrink-0 mt-0.5" size={20} />
                <div className="flex-1">
                  <h4 className="font-bold text-amber-800">
                    {lang === "sw"
                      ? "Mabadiliko Yanasubiri Idhini"
                      : "Pending Changes Awaiting Approval"}
                  </h4>
                  <ul className="mt-2 space-y-1">
                    {pendingChanges.map((change) => (
                      <li key={change.id} className="text-sm text-amber-700">
                        <span className="font-medium">{getFieldLabel(change.field_name)}:</span>{" "}
                        <span className="line-through text-amber-500">
                          {change.old_value || "-"}
                        </span>{" "}
                        → <span className="font-medium">{change.new_value}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Tabs */}
        {renderTabs()}

        {/* Tab content */}
        <div className="p-4 sm:p-8">
          {/* Personal Information Tab */}
          {activeTab === "personal" && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold text-stone-900 flex items-center gap-2">
                  <User size={20} className="text-emerald-600" />
                  {lang === "sw" ? "Taarifa Binafsi" : "Personal Information"}
                </h3>
                {!isEditing && (
                  <button
                    onClick={() => setIsEditing(true)}
                    className="text-emerald-600 hover:text-emerald-700 font-medium text-sm flex items-center gap-1"
                  >
                    <Edit2 size={14} />
                    {lang === "sw" ? "Hariri" : "Edit"}
                  </button>
                )}
              </div>

              {isEditing ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  <div className="space-y-2">
                    <label
                      htmlFor="first_name"
                      className="text-xs font-bold text-stone-500 uppercase tracking-wider"
                    >
                      {getFieldLabel("first_name")} <span className="text-red-500">*</span>
                    </label>
                    <input
                      id="first_name"
                      type="text"
                      value={formData.first_name}
                      onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                      className={`w-full h-12 px-4 bg-stone-50 border rounded-xl focus:ring-2 focus:ring-emerald-500 transition-all ${
                        validationErrors.first_name
                          ? "border-red-300 bg-red-50"
                          : "border-stone-200"
                      }`}
                    />
                    {validationErrors.first_name && (
                      <p className="text-xs text-red-500 flex items-center gap-1">
                        <AlertCircle size={12} />
                        {validationErrors.first_name}
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <label
                      htmlFor="middle_name"
                      className="text-xs font-bold text-stone-500 uppercase tracking-wider"
                    >
                      {getFieldLabel("middle_name")}
                    </label>
                    <input
                      id="middle_name"
                      type="text"
                      value={formData.middle_name}
                      onChange={(e) => setFormData({ ...formData, middle_name: e.target.value })}
                      className="w-full h-12 px-4 bg-stone-50 border border-stone-200 rounded-xl focus:ring-2 focus:ring-emerald-500 transition-all"
                    />
                  </div>

                  <div className="space-y-2">
                    <label
                      htmlFor="last_name"
                      className="text-xs font-bold text-stone-500 uppercase tracking-wider"
                    >
                      {getFieldLabel("last_name")} <span className="text-red-500">*</span>
                    </label>
                    <input
                      id="last_name"
                      type="text"
                      value={formData.last_name}
                      onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                      className={`w-full h-12 px-4 bg-stone-50 border rounded-xl focus:ring-2 focus:ring-emerald-500 transition-all ${
                        validationErrors.last_name ? "border-red-300 bg-red-50" : "border-stone-200"
                      }`}
                    />
                    {validationErrors.last_name && (
                      <p className="text-xs text-red-500 flex items-center gap-1">
                        <AlertCircle size={12} />
                        {validationErrors.last_name}
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <label
                      htmlFor="gender"
                      className="text-xs font-bold text-stone-500 uppercase tracking-wider"
                    >
                      {getFieldLabel("gender")}
                    </label>
                    <select
                      id="gender"
                      value={formData.gender}
                      onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                      className="w-full h-12 px-4 bg-stone-50 border border-stone-200 rounded-xl focus:ring-2 focus:ring-emerald-500 transition-all"
                    >
                      <option value="">{lang === "sw" ? "Chagua" : "Select"}</option>
                      <option value="Me">{lang === "sw" ? "Mwanaume" : "Male"}</option>
                      <option value="Ke">{lang === "sw" ? "Mwanamke" : "Female"}</option>
                      <option value="Other">{lang === "sw" ? "Nyingine" : "Other"}</option>
                    </select>
                  </div>

                  <div className="space-y-2">
                    <label
                      htmlFor="date_of_birth"
                      className="text-xs font-bold text-stone-500 uppercase tracking-wider"
                    >
                      {getFieldLabel("date_of_birth")}
                    </label>
                    <input
                      id="date_of_birth"
                      type="date"
                      value={formData.date_of_birth}
                      onChange={(e) => setFormData({ ...formData, date_of_birth: e.target.value })}
                      className="w-full h-12 px-4 bg-stone-50 border border-stone-200 rounded-xl focus:ring-2 focus:ring-emerald-500 transition-all"
                    />
                  </div>

                  <div className="space-y-2">
                    <label
                      htmlFor="birth_region"
                      className="text-xs font-bold text-stone-500 uppercase tracking-wider"
                    >
                      {getFieldLabel("birth_region")}
                    </label>
                    <select
                      id="birth_region"
                      value={formData.birth_region}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          birth_region: e.target.value,
                          birth_district: "",
                        })
                      }
                      className="w-full h-12 px-4 bg-stone-50 border border-stone-200 rounded-xl focus:ring-2 focus:ring-emerald-500 transition-all"
                    >
                      <option value="">{lang === "sw" ? "Chagua Mkoa" : "Select Region"}</option>
                      {regions.map((r) => (
                        <option key={r} value={r}>
                          {r}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-2">
                    <label
                      htmlFor="birth_district"
                      className="text-xs font-bold text-stone-500 uppercase tracking-wider"
                    >
                      {getFieldLabel("birth_district")}
                    </label>
                    <select
                      id="birth_district"
                      value={formData.birth_district}
                      onChange={(e) => setFormData({ ...formData, birth_district: e.target.value })}
                      disabled={!formData.birth_region}
                      className="w-full h-12 px-4 bg-stone-50 border border-stone-200 rounded-xl focus:ring-2 focus:ring-emerald-500 transition-all disabled:opacity-50"
                    >
                      <option value="">
                        {lang === "sw" ? "Chagua Wilaya" : "Select District"}
                      </option>
                      {formData.birth_region &&
                        TANZANIA_ADDRESS_DATA.find(
                          (r) => r.name === formData.birth_region,
                        )?.districts.map((d) => (
                          <option key={d.name} value={d.name}>
                            {d.name}
                          </option>
                        ))}
                    </select>
                  </div>

                  <div className="space-y-2">
                    <label
                      htmlFor="place_of_birth"
                      className="text-xs font-bold text-stone-500 uppercase tracking-wider"
                    >
                      {getFieldLabel("place_of_birth")}
                    </label>
                    <input
                      id="place_of_birth"
                      type="text"
                      value={formData.place_of_birth}
                      onChange={(e) => setFormData({ ...formData, place_of_birth: e.target.value })}
                      className="w-full h-12 px-4 bg-stone-50 border border-stone-200 rounded-xl focus:ring-2 focus:ring-emerald-500 transition-all"
                      placeholder={
                        lang === "sw" ? "Kituo cha Afya/Hospitali" : "Hospital/Health Center"
                      }
                    />
                  </div>

                  <div className="space-y-2">
                    <label
                      htmlFor="marital_status"
                      className="text-xs font-bold text-stone-500 uppercase tracking-wider"
                    >
                      {getFieldLabel("marital_status")}
                    </label>
                    <select
                      id="marital_status"
                      value={formData.marital_status}
                      onChange={(e) => setFormData({ ...formData, marital_status: e.target.value })}
                      className="w-full h-12 px-4 bg-stone-50 border border-stone-200 rounded-xl focus:ring-2 focus:ring-emerald-500 transition-all"
                    >
                      <option value="">{lang === "sw" ? "Chagua" : "Select"}</option>
                      {MARITAL_STATUS_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option[lang]}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-2">
                    <label
                      htmlFor="occupation"
                      className="text-xs font-bold text-stone-500 uppercase tracking-wider"
                    >
                      {getFieldLabel("occupation")}
                    </label>
                    <input
                      id="occupation"
                      type="text"
                      value={formData.occupation}
                      onChange={(e) => setFormData({ ...formData, occupation: e.target.value })}
                      className="w-full h-12 px-4 bg-stone-50 border border-stone-200 rounded-xl focus:ring-2 focus:ring-emerald-500 transition-all"
                      placeholder={lang === "sw" ? "Mf. Mwalimu, Mkulima" : "E.g. Teacher, Farmer"}
                    />
                  </div>

                  <div className="space-y-2">
                    <label
                      htmlFor="education_level"
                      className="text-xs font-bold text-stone-500 uppercase tracking-wider"
                    >
                      {getFieldLabel("education_level")}
                    </label>
                    <select
                      id="education_level"
                      value={formData.education_level}
                      onChange={(e) =>
                        setFormData({ ...formData, education_level: e.target.value })
                      }
                      className="w-full h-12 px-4 bg-stone-50 border border-stone-200 rounded-xl focus:ring-2 focus:ring-emerald-500 transition-all"
                    >
                      <option value="">{lang === "sw" ? "Chagua" : "Select"}</option>
                      {EDUCATION_LEVELS.map((level) => (
                        <option key={level.value} value={level.value}>
                          {level[lang]}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                  <InfoItem
                    icon={<User size={16} />}
                    label={getFieldLabel("first_name")}
                    value={formData.first_name}
                  />
                  <InfoItem
                    icon={<User size={16} />}
                    label={getFieldLabel("middle_name")}
                    value={formData.middle_name || "-"}
                  />
                  <InfoItem
                    icon={<User size={16} />}
                    label={getFieldLabel("last_name")}
                    value={formData.last_name}
                  />
                  <InfoItem
                    icon={<User size={16} />}
                    label={getFieldLabel("gender")}
                    value={
                      formData.gender
                        ? formData.gender === "Me"
                          ? lang === "sw"
                            ? "Mwanaume"
                            : "Male"
                          : formData.gender === "Ke"
                            ? lang === "sw"
                              ? "Mwanamke"
                              : "Female"
                            : formData.gender
                        : "-"
                    }
                  />
                  <InfoItem
                    icon={<Calendar size={16} />}
                    label={getFieldLabel("date_of_birth")}
                    value={
                      formData.date_of_birth
                        ? new Date(formData.date_of_birth).toLocaleDateString()
                        : "-"
                    }
                  />
                  <InfoItem
                    icon={<Map size={16} />}
                    label={getFieldLabel("birth_region")}
                    value={formData.birth_region || "-"}
                  />
                  <InfoItem
                    icon={<Map size={16} />}
                    label={getFieldLabel("birth_district")}
                    value={formData.birth_district || "-"}
                  />
                  <InfoItem
                    icon={<MapPin size={16} />}
                    label={getFieldLabel("place_of_birth")}
                    value={formData.place_of_birth || "-"}
                  />
                  <InfoItem
                    icon={<Heart size={16} />}
                    label={getFieldLabel("marital_status")}
                    value={
                      formData.marital_status
                        ? MARITAL_STATUS_OPTIONS.find((o) => o.value === formData.marital_status)?.[
                            lang
                          ] || formData.marital_status
                        : "-"
                    }
                  />
                  <InfoItem
                    icon={<Briefcase size={16} />}
                    label={getFieldLabel("occupation")}
                    value={formData.occupation || "-"}
                  />
                  <InfoItem
                    icon={<BookOpen size={16} />}
                    label={getFieldLabel("education_level")}
                    value={
                      formData.education_level
                        ? EDUCATION_LEVELS.find((l) => l.value === formData.education_level)?.[
                            lang
                          ] || formData.education_level
                        : "-"
                    }
                  />
                </div>
              )}
            </motion.div>
          )}

          {/* Identity Tab */}
          {activeTab === "identity" && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold text-stone-900 flex items-center gap-2">
                  <CreditCard size={20} className="text-emerald-600" />
                  {lang === "sw" ? "Taarifa za Utambulisho" : "Identity Information"}
                </h3>
              </div>

              {/* Citizen ID Card - Prominent Display */}
              {citizenId && (
                <div className="bg-linear-to-br from-emerald-600 to-teal-600 rounded-2xl p-6 text-white shadow-xl">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-emerald-100 text-sm font-medium mb-1">
                        {lang === "sw"
                          ? "Namba Yako ya Raia (Citizen ID)"
                          : "Your Citizen ID Number"}
                      </p>
                      <p className="text-3xl font-mono font-bold tracking-wider">{citizenId}</p>
                      <p className="text-emerald-100 text-xs mt-3">
                        {lang === "sw"
                          ? "🔒 Namba hii ni ya kipekee kwako. Itumie kwa makubaliano na wengine."
                          : "🔒 This number is unique to you. Use it for agreements with others."}
                      </p>
                    </div>
                    <div className="bg-white/20 rounded-xl p-3">
                      <Users size={32} className="text-white" />
                    </div>
                  </div>
                  <div className="mt-4 pt-4 border-t border-white/20">
                    <p className="text-xs text-emerald-100">
                      {lang === "sw"
                        ? "💡 Mpe mtu unayeomba huduma pamoja naye namba hii ili aweze kukuingiza kwenye makubaliano."
                        : "💡 Share this number with someone you want to enter into an agreement with."}
                    </p>
                  </div>
                </div>
              )}

              {/* Business Registration IDs */}
              {(sellerId || landlordId || brokerId) && (
                <div className="space-y-4">
                  <h4 className="text-md font-semibold text-stone-700 flex items-center gap-2">
                    <Award size={18} className="text-purple-600" />
                    {lang === "sw" ? "Vitambulisho vya Biashara" : "Business IDs"}
                  </h4>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {/* Seller ID */}
                    {sellerId && (
                      <div className="bg-linear-to-br from-blue-500 to-blue-700 rounded-xl p-4 text-white shadow-lg">
                        <div className="flex items-center gap-2 mb-2">
                          <Store size={20} />
                          <span className="text-blue-100 text-sm font-medium">
                            {lang === "sw" ? "Namba ya Muuzaji" : "Seller ID"}
                          </span>
                        </div>
                        <p className="text-xl font-mono font-bold tracking-wider">{sellerId}</p>
                        <p className="text-blue-100 text-xs mt-2">
                          {lang === "sw" ? "✓ Umesajiliwa kama Muuzaji" : "✓ Registered as Seller"}
                        </p>
                      </div>
                    )}

                    {/* Landlord ID */}
                    {landlordId && (
                      <div className="bg-linear-to-br from-amber-500 to-orange-600 rounded-xl p-4 text-white shadow-lg">
                        <div className="flex items-center gap-2 mb-2">
                          <Home size={20} />
                          <span className="text-amber-100 text-sm font-medium">
                            {lang === "sw" ? "Namba ya Mpangishaji" : "Landlord ID"}
                          </span>
                        </div>
                        <p className="text-xl font-mono font-bold tracking-wider">{landlordId}</p>
                        <p className="text-amber-100 text-xs mt-2">
                          {lang === "sw"
                            ? "✓ Umesajiliwa kama Mpangishaji"
                            : "✓ Registered as Landlord"}
                        </p>
                      </div>
                    )}

                    {/* Broker ID */}
                    {brokerId && (
                      <div className="bg-linear-to-br from-purple-500 to-purple-700 rounded-xl p-4 text-white shadow-lg">
                        <div className="flex items-center gap-2 mb-2">
                          <Users size={20} />
                          <span className="text-purple-100 text-sm font-medium">
                            {lang === "sw" ? "Namba ya Dalali" : "Broker ID"}
                          </span>
                        </div>
                        <p className="text-xl font-mono font-bold tracking-wider">{brokerId}</p>
                        <p className="text-purple-100 text-xs mt-2">
                          {lang === "sw" ? "✓ Umesajiliwa kama Dalali" : "✓ Registered as Broker"}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {isEditing ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label
                      htmlFor="nationality"
                      className="text-xs font-bold text-stone-500 uppercase tracking-wider"
                    >
                      {getFieldLabel("nationality")}
                    </label>
                    <input
                      id="nationality"
                      type="text"
                      value={formData.nationality}
                      onChange={(e) => setFormData({ ...formData, nationality: e.target.value })}
                      className="w-full h-12 px-4 bg-stone-50 border border-stone-200 rounded-xl focus:ring-2 focus:ring-emerald-500 transition-all"
                    />
                  </div>

                  <div className="space-y-2">
                    <label
                      htmlFor="nida_number"
                      className="text-xs font-bold text-stone-500 uppercase tracking-wider flex items-center gap-1"
                    >
                      {getFieldLabel("nida_number")}
                      <Shield size={10} className="text-amber-500" />
                    </label>
                    <div className="relative">
                      <input
                        id="nida_number"
                        type="text"
                        value={formData.nida_number}
                        onChange={handleNidaChange}
                        placeholder={
                          showNidaFormat ? "XXXX-XXXX-XXXX-XXXX-XXXX" : "20 digit number"
                        }
                        className={`w-full h-12 px-4 bg-stone-50 border rounded-xl focus:ring-2 focus:ring-emerald-500 transition-all font-mono pr-10 ${
                          validationErrors.nida_number
                            ? "border-red-300 bg-red-50"
                            : "border-stone-200"
                        }`}
                        maxLength={showNidaFormat ? 24 : 20}
                      />
                      <button
                        type="button"
                        onClick={() => setShowNidaFormat(!showNidaFormat)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600"
                      >
                        {showNidaFormat ? <Eye size={18} /> : <EyeOff size={18} />}
                      </button>
                    </div>
                    {validationErrors.nida_number && (
                      <p className="text-xs text-red-500 flex items-center gap-1">
                        <AlertCircle size={12} />
                        {validationErrors.nida_number}
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <label
                      htmlFor="id_type"
                      className="text-xs font-bold text-stone-500 uppercase tracking-wider"
                    >
                      {getFieldLabel("id_type")}
                    </label>
                    <select
                      id="id_type"
                      value={formData.id_type}
                      onChange={(e) => setFormData({ ...formData, id_type: e.target.value })}
                      className="w-full h-12 px-4 bg-stone-50 border border-stone-200 rounded-xl focus:ring-2 focus:ring-emerald-500 transition-all"
                    >
                      <option value="">{lang === "sw" ? "Chagua" : "Select"}</option>
                      <option value="birth_certificate">
                        {lang === "sw" ? "Cheti cha Kuzaliwa" : "Birth Certificate"}
                      </option>
                      <option value="voter_id">
                        {lang === "sw" ? "Kadi ya Mpiga Kura" : "Voter ID"}
                      </option>
                      <option value="driving_license">
                        {lang === "sw" ? "Leseni ya Udereva" : "Driving License"}
                      </option>
                      <option value="zanzibar_id">
                        {lang === "sw" ? "Kitambulisho cha Zanzibar" : "Zanzibar ID"}
                      </option>
                      <option value="student_id">
                        {lang === "sw" ? "Kitambulisho cha Mwanafunzi" : "Student ID"}
                      </option>
                      <option value="employer_id">
                        {lang === "sw" ? "Kitambulisho cha Mwajiri" : "Employer ID"}
                      </option>
                      <option value="refugee_id">
                        {lang === "sw" ? "Kitambulisho cha Mkimbizi" : "Refugee ID"}
                      </option>
                    </select>
                  </div>

                  <div className="space-y-2">
                    <label
                      htmlFor="id_number"
                      className="text-xs font-bold text-stone-500 uppercase tracking-wider"
                    >
                      {getFieldLabel("id_number")}
                    </label>
                    <input
                      id="id_number"
                      type="text"
                      value={formData.id_number}
                      onChange={(e) => setFormData({ ...formData, id_number: e.target.value })}
                      className="w-full h-12 px-4 bg-stone-50 border border-stone-200 rounded-xl focus:ring-2 focus:ring-emerald-500 transition-all"
                    />
                  </div>

                  <div className="space-y-2">
                    <label
                      htmlFor="passport_number"
                      className="text-xs font-bold text-stone-500 uppercase tracking-wider"
                    >
                      {getFieldLabel("passport_number")}
                    </label>
                    <input
                      id="passport_number"
                      type="text"
                      value={formData.passport_number}
                      onChange={(e) =>
                        setFormData({ ...formData, passport_number: e.target.value })
                      }
                      className="w-full h-12 px-4 bg-stone-50 border border-stone-200 rounded-xl focus:ring-2 focus:ring-emerald-500 transition-all"
                    />
                  </div>

                  <div className="space-y-2">
                    <label
                      htmlFor="voter_id_number"
                      className="text-xs font-bold text-stone-500 uppercase tracking-wider"
                    >
                      {getFieldLabel("voter_id_number")}
                    </label>
                    <input
                      id="voter_id_number"
                      type="text"
                      value={formData.voter_id_number}
                      onChange={(e) =>
                        setFormData({ ...formData, voter_id_number: e.target.value })
                      }
                      className="w-full h-12 px-4 bg-stone-50 border border-stone-200 rounded-xl focus:ring-2 focus:ring-emerald-500 transition-all"
                    />
                  </div>

                  <div className="space-y-2">
                    <label
                      htmlFor="driving_license_number"
                      className="text-xs font-bold text-stone-500 uppercase tracking-wider"
                    >
                      {getFieldLabel("driving_license_number")}
                    </label>
                    <input
                      id="driving_license_number"
                      type="text"
                      value={formData.driving_license_number}
                      onChange={(e) =>
                        setFormData({ ...formData, driving_license_number: e.target.value })
                      }
                      className="w-full h-12 px-4 bg-stone-50 border border-stone-200 rounded-xl focus:ring-2 focus:ring-emerald-500 transition-all"
                    />
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                  <InfoItem
                    icon={<Flag size={16} />}
                    label={getFieldLabel("nationality")}
                    value={formData.nationality}
                  />

                  {formData.nida_number && (
                    <InfoItem
                      icon={<Fingerprint size={16} />}
                      label={getFieldLabel("nida_number")}
                      value={formatNidaForDisplay(formData.nida_number)}
                    />
                  )}

                  {formData.id_type && formData.id_number && (
                    <InfoItem
                      icon={<CreditCard size={16} />}
                      label={
                        formData.id_type === "birth_certificate"
                          ? lang === "sw"
                            ? "Cheti cha Kuzaliwa"
                            : "Birth Certificate"
                          : formData.id_type === "voter_id"
                            ? lang === "sw"
                              ? "Kadi ya Mpiga Kura"
                              : "Voter ID"
                            : formData.id_type === "driving_license"
                              ? lang === "sw"
                                ? "Leseni ya Udereva"
                                : "Driving License"
                              : formData.id_type === "zanzibar_id"
                                ? lang === "sw"
                                  ? "Kitambulisho cha Zanzibar"
                                  : "Zanzibar ID"
                                : formData.id_type === "student_id"
                                  ? lang === "sw"
                                    ? "Kitambulisho cha Mwanafunzi"
                                    : "Student ID"
                                  : formData.id_type === "employer_id"
                                    ? lang === "sw"
                                      ? "Kitambulisho cha Mwajiri"
                                      : "Employer ID"
                                    : formData.id_type === "refugee_id"
                                      ? lang === "sw"
                                        ? "Kitambulisho cha Mkimbizi"
                                        : "Refugee ID"
                                      : formData.id_type
                      }
                      value={formData.id_number}
                    />
                  )}

                  {formData.passport_number && (
                    <InfoItem
                      icon={<Globe size={16} />}
                      label={getFieldLabel("passport_number")}
                      value={formData.passport_number}
                    />
                  )}

                  {formData.voter_id_number && (
                    <InfoItem
                      icon={<Award size={16} />}
                      label={getFieldLabel("voter_id_number")}
                      value={formData.voter_id_number}
                    />
                  )}

                  {formData.driving_license_number && (
                    <InfoItem
                      icon={<Award size={16} />}
                      label={getFieldLabel("driving_license_number")}
                      value={formData.driving_license_number}
                    />
                  )}
                </div>
              )}
            </motion.div>
          )}

          {/* Contact Tab */}
          {activeTab === "contact" && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
              <h3 className="text-lg font-bold text-stone-900 flex items-center gap-2">
                <Phone size={20} className="text-emerald-600" />
                {lang === "sw" ? "Mawasiliano" : "Contact Information"}
              </h3>

              {isEditing ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-stone-500 uppercase tracking-wider">
                      {getFieldLabel("phone")} <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="tel"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      placeholder="+255 XXX XXX XXX"
                      className={`w-full h-12 px-4 bg-stone-50 border rounded-xl focus:ring-2 focus:ring-emerald-500 transition-all ${
                        validationErrors.phone ? "border-red-300 bg-red-50" : "border-stone-200"
                      }`}
                    />
                    {validationErrors.phone && (
                      <p className="text-xs text-red-500 flex items-center gap-1">
                        <AlertCircle size={12} />
                        {validationErrors.phone}
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-bold text-stone-500 uppercase tracking-wider">
                      {getFieldLabel("alternative_phone")}
                    </label>
                    <input
                      type="tel"
                      value={formData.alternative_phone}
                      onChange={(e) =>
                        setFormData({ ...formData, alternative_phone: e.target.value })
                      }
                      placeholder="+255 XXX XXX XXX"
                      className={`w-full h-12 px-4 bg-stone-50 border rounded-xl focus:ring-2 focus:ring-emerald-500 transition-all ${
                        validationErrors.alternative_phone
                          ? "border-red-300 bg-red-50"
                          : "border-stone-200"
                      }`}
                    />
                    {validationErrors.alternative_phone && (
                      <p className="text-xs text-red-500 flex items-center gap-1">
                        <AlertCircle size={12} />
                        {validationErrors.alternative_phone}
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-bold text-stone-500 uppercase tracking-wider">
                      {getFieldLabel("alternative_email")}
                    </label>
                    <input
                      type="email"
                      value={formData.alternative_email}
                      onChange={(e) =>
                        setFormData({ ...formData, alternative_email: e.target.value })
                      }
                      placeholder="email@example.com"
                      className="w-full h-12 px-4 bg-stone-50 border border-stone-200 rounded-xl focus:ring-2 focus:ring-emerald-500 transition-all"
                    />
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <InfoItem
                    icon={<Phone size={16} />}
                    label={getFieldLabel("phone")}
                    value={formData.phone || "-"}
                  />
                  <InfoItem
                    icon={<Phone size={16} />}
                    label={getFieldLabel("alternative_phone")}
                    value={formData.alternative_phone || "-"}
                  />
                  <InfoItem
                    icon={<Mail size={16} />}
                    label={getFieldLabel("alternative_email")}
                    value={formData.alternative_email || "-"}
                  />
                </div>
              )}
            </motion.div>
          )}

          {/* Address Tab */}
          {activeTab === "address" && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
              <h3 className="text-lg font-bold text-stone-900 flex items-center gap-2">
                <Home size={20} className="text-emerald-600" />
                {lang === "sw" ? "Anwani" : "Address Information"}
              </h3>

              {isEditing ? (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    <div className="space-y-2">
                      <label
                        htmlFor="region"
                        className="text-xs font-bold text-stone-500 uppercase tracking-wider"
                      >
                        {getFieldLabel("region")}
                      </label>
                      <select
                        id="region"
                        value={formData.region}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            region: e.target.value,
                            district: "",
                            ward: "",
                          })
                        }
                        className="w-full h-12 px-4 bg-stone-50 border border-stone-200 rounded-xl focus:ring-2 focus:ring-emerald-500 transition-all"
                      >
                        <option value="">{lang === "sw" ? "Chagua Mkoa" : "Select Region"}</option>
                        {regions.map((r) => (
                          <option key={r} value={r}>
                            {r}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="space-y-2">
                      <label
                        htmlFor="district"
                        className="text-xs font-bold text-stone-500 uppercase tracking-wider"
                      >
                        {getFieldLabel("district")}
                      </label>
                      <select
                        id="district"
                        value={formData.district}
                        onChange={(e) =>
                          setFormData({ ...formData, district: e.target.value, ward: "" })
                        }
                        disabled={!formData.region}
                        className="w-full h-12 px-4 bg-stone-50 border border-stone-200 rounded-xl focus:ring-2 focus:ring-emerald-500 transition-all disabled:opacity-50"
                      >
                        <option value="">
                          {lang === "sw" ? "Chagua Wilaya" : "Select District"}
                        </option>
                        {districts.map((d) => (
                          <option key={d} value={d}>
                            {d}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="space-y-2">
                      <label
                        htmlFor="ward"
                        className="text-xs font-bold text-stone-500 uppercase tracking-wider"
                      >
                        {getFieldLabel("ward")}
                      </label>
                      <select
                        id="ward"
                        value={formData.ward}
                        onChange={(e) => setFormData({ ...formData, ward: e.target.value })}
                        disabled={!formData.district}
                        className="w-full h-12 px-4 bg-stone-50 border border-stone-200 rounded-xl focus:ring-2 focus:ring-emerald-500 transition-all disabled:opacity-50"
                      >
                        <option value="">{lang === "sw" ? "Chagua Kata" : "Select Ward"}</option>
                        {wards.map((w) => (
                          <option key={w} value={w}>
                            {w}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="space-y-2">
                      <label
                        htmlFor="street"
                        className="text-xs font-bold text-stone-500 uppercase tracking-wider"
                      >
                        {getFieldLabel("street")}
                      </label>
                      <input
                        id="street"
                        type="text"
                        value={formData.street}
                        onChange={(e) => setFormData({ ...formData, street: e.target.value })}
                        className="w-full h-12 px-4 bg-stone-50 border border-stone-200 rounded-xl focus:ring-2 focus:ring-emerald-500 transition-all"
                      />
                    </div>

                    <div className="space-y-2">
                      <label
                        htmlFor="house_number"
                        className="text-xs font-bold text-stone-500 uppercase tracking-wider"
                      >
                        {getFieldLabel("house_number")}
                      </label>
                      <input
                        id="house_number"
                        type="text"
                        value={formData.house_number}
                        onChange={(e) => setFormData({ ...formData, house_number: e.target.value })}
                        className="w-full h-12 px-4 bg-stone-50 border border-stone-200 rounded-xl focus:ring-2 focus:ring-emerald-500 transition-all"
                      />
                    </div>

                    <div className="space-y-2">
                      <label
                        htmlFor="postal_code"
                        className="text-xs font-bold text-stone-500 uppercase tracking-wider"
                      >
                        {getFieldLabel("postal_code")}
                      </label>
                      <input
                        id="postal_code"
                        type="text"
                        value={formData.postal_code}
                        onChange={(e) => setFormData({ ...formData, postal_code: e.target.value })}
                        className="w-full h-12 px-4 bg-stone-50 border border-stone-200 rounded-xl focus:ring-2 focus:ring-emerald-500 transition-all"
                      />
                    </div>

                    <div className="space-y-2">
                      <label
                        htmlFor="landmark"
                        className="text-xs font-bold text-stone-500 uppercase tracking-wider"
                      >
                        {getFieldLabel("landmark")}
                      </label>
                      <input
                        id="landmark"
                        type="text"
                        value={formData.landmark}
                        onChange={(e) => setFormData({ ...formData, landmark: e.target.value })}
                        className="w-full h-12 px-4 bg-stone-50 border border-stone-200 rounded-xl focus:ring-2 focus:ring-emerald-500 transition-all"
                        placeholder={lang === "sw" ? "Karibu na..." : "Near..."}
                      />
                    </div>
                  </div>

                  {/* Local Government Officials Section */}
                  <div className="mt-6 pt-6 border-t border-stone-200">
                    <h4 className="text-md font-bold text-stone-700 mb-4 flex items-center gap-2">
                      <Users size={18} className="text-emerald-600" />
                      {lang === "sw" ? "Viongozi wa Mtaa/Kijiji" : "Local Government Officials"}
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      <div className="space-y-2">
                        <label
                          htmlFor="mtaa_executive_officer"
                          className="text-xs font-bold text-stone-500 uppercase tracking-wider"
                        >
                          {getFieldLabel("mtaa_executive_officer")}
                        </label>
                        <input
                          id="mtaa_executive_officer"
                          type="text"
                          value={formData.mtaa_executive_officer}
                          onChange={(e) =>
                            setFormData({ ...formData, mtaa_executive_officer: e.target.value })
                          }
                          className="w-full h-12 px-4 bg-stone-50 border border-stone-200 rounded-xl focus:ring-2 focus:ring-emerald-500 transition-all"
                          placeholder={lang === "sw" ? "Jina la Mtendaji" : "VEO/MEO Name"}
                        />
                      </div>

                      <div className="space-y-2">
                        <label
                          htmlFor="ward_councillor"
                          className="text-xs font-bold text-stone-500 uppercase tracking-wider"
                        >
                          {getFieldLabel("ward_councillor")}
                        </label>
                        <input
                          id="ward_councillor"
                          type="text"
                          value={formData.ward_councillor}
                          onChange={(e) =>
                            setFormData({ ...formData, ward_councillor: e.target.value })
                          }
                          className="w-full h-12 px-4 bg-stone-50 border border-stone-200 rounded-xl focus:ring-2 focus:ring-emerald-500 transition-all"
                          placeholder={lang === "sw" ? "Jina la Diwani" : "Councillor Name"}
                        />
                      </div>

                      <div className="space-y-2">
                        <label
                          htmlFor="ward_chairperson"
                          className="text-xs font-bold text-stone-500 uppercase tracking-wider"
                        >
                          {getFieldLabel("ward_chairperson")}
                        </label>
                        <input
                          id="ward_chairperson"
                          type="text"
                          value={formData.ward_chairperson}
                          onChange={(e) =>
                            setFormData({ ...formData, ward_chairperson: e.target.value })
                          }
                          className="w-full h-12 px-4 bg-stone-50 border border-stone-200 rounded-xl focus:ring-2 focus:ring-emerald-500 transition-all"
                          placeholder={
                            lang === "sw"
                              ? "Jina la Mwenyekiti (Si Lazima)"
                              : "Chairperson Name (Optional)"
                          }
                        />
                      </div>
                    </div>
                  </div>
                </>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                  <InfoItem
                    icon={<Map size={16} />}
                    label={getFieldLabel("region")}
                    value={formData.region || "-"}
                  />
                  <InfoItem
                    icon={<Map size={16} />}
                    label={getFieldLabel("district")}
                    value={formData.district || "-"}
                  />
                  <InfoItem
                    icon={<Map size={16} />}
                    label={getFieldLabel("ward")}
                    value={formData.ward || "-"}
                  />
                  <InfoItem
                    icon={<Navigation size={16} />}
                    label={getFieldLabel("street")}
                    value={formData.street || "-"}
                  />
                  <InfoItem
                    icon={<Hash size={16} />}
                    label={getFieldLabel("house_number")}
                    value={formData.house_number || "-"}
                  />
                  <InfoItem
                    icon={<Hash size={16} />}
                    label={getFieldLabel("postal_code")}
                    value={formData.postal_code || "-"}
                  />
                  <InfoItem
                    icon={<MapPin size={16} />}
                    label={getFieldLabel("landmark")}
                    value={formData.landmark || "-"}
                  />
                  <InfoItem
                    icon={<Users size={16} />}
                    label={getFieldLabel("mtaa_executive_officer")}
                    value={formData.mtaa_executive_officer || "-"}
                  />
                  <InfoItem
                    icon={<Users size={16} />}
                    label={getFieldLabel("ward_councillor")}
                    value={formData.ward_councillor || "-"}
                  />
                  <InfoItem
                    icon={<Users size={16} />}
                    label={getFieldLabel("ward_chairperson")}
                    value={formData.ward_chairperson || "-"}
                  />
                </div>
              )}
            </motion.div>
          )}

          {/* Diaspora Tab */}
          {activeTab === "diaspora" && formData.is_diaspora && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
              <h3 className="text-lg font-bold text-stone-900 flex items-center gap-2">
                <Globe size={20} className="text-emerald-600" />
                {lang === "sw" ? "Maelezo ya Diaspora" : "Diaspora Information"}
              </h3>

              {isEditing ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label
                      htmlFor="country_of_residence"
                      className="text-xs font-bold text-stone-500 uppercase tracking-wider"
                    >
                      {getFieldLabel("country_of_residence")}
                    </label>
                    <input
                      id="country_of_residence"
                      type="text"
                      value={formData.country_of_residence}
                      onChange={(e) =>
                        setFormData({ ...formData, country_of_residence: e.target.value })
                      }
                      className="w-full h-12 px-4 bg-stone-50 border border-stone-200 rounded-xl focus:ring-2 focus:ring-emerald-500 transition-all"
                    />
                  </div>

                  <div className="space-y-2">
                    <label
                      htmlFor="city_of_residence"
                      className="text-xs font-bold text-stone-500 uppercase tracking-wider"
                    >
                      {getFieldLabel("city_of_residence")}
                    </label>
                    <input
                      id="city_of_residence"
                      type="text"
                      value={formData.city_of_residence}
                      onChange={(e) =>
                        setFormData({ ...formData, city_of_residence: e.target.value })
                      }
                      className="w-full h-12 px-4 bg-stone-50 border border-stone-200 rounded-xl focus:ring-2 focus:ring-emerald-500 transition-all"
                    />
                  </div>

                  <div className="space-y-2">
                    <label
                      htmlFor="diaspora_region"
                      className="text-xs font-bold text-stone-500 uppercase tracking-wider"
                    >
                      {getFieldLabel("diaspora_region")}
                    </label>
                    <select
                      id="diaspora_region"
                      value={formData.diaspora_region}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          diaspora_region: e.target.value,
                          diaspora_district: "",
                          diaspora_ward: "",
                        })
                      }
                      className="w-full h-12 px-4 bg-stone-50 border border-stone-200 rounded-xl focus:ring-2 focus:ring-emerald-500 transition-all"
                    >
                      <option value="">
                        {lang === "sw" ? "Chagua Mkoa wa Nyumbani" : "Select Home Region"}
                      </option>
                      {regions.map((r) => (
                        <option key={r} value={r}>
                          {r}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-2">
                    <label
                      htmlFor="diaspora_district"
                      className="text-xs font-bold text-stone-500 uppercase tracking-wider"
                    >
                      {getFieldLabel("diaspora_district")}
                    </label>
                    <select
                      id="diaspora_district"
                      value={formData.diaspora_district}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          diaspora_district: e.target.value,
                          diaspora_ward: "",
                        })
                      }
                      disabled={!formData.diaspora_region}
                      className="w-full h-12 px-4 bg-stone-50 border border-stone-200 rounded-xl focus:ring-2 focus:ring-emerald-500 transition-all disabled:opacity-50"
                    >
                      <option value="">
                        {lang === "sw" ? "Chagua Wilaya ya Nyumbani" : "Select Home District"}
                      </option>
                      {formData.diaspora_region &&
                        TANZANIA_ADDRESS_DATA.find(
                          (r) => r.name === formData.diaspora_region,
                        )?.districts.map((d) => (
                          <option key={d.name} value={d.name}>
                            {d.name}
                          </option>
                        ))}
                    </select>
                  </div>

                  <div className="space-y-2">
                    <label
                      htmlFor="diaspora_ward"
                      className="text-xs font-bold text-stone-500 uppercase tracking-wider"
                    >
                      {getFieldLabel("diaspora_ward")}
                    </label>
                    <select
                      id="diaspora_ward"
                      value={formData.diaspora_ward}
                      onChange={(e) => setFormData({ ...formData, diaspora_ward: e.target.value })}
                      disabled={!formData.diaspora_district}
                      className="w-full h-12 px-4 bg-stone-50 border border-stone-200 rounded-xl focus:ring-2 focus:ring-emerald-500 transition-all disabled:opacity-50"
                    >
                      <option value="">
                        {lang === "sw" ? "Chagua Kata ya Nyumbani" : "Select Home Ward"}
                      </option>
                      {formData.diaspora_region &&
                        formData.diaspora_district &&
                        TANZANIA_ADDRESS_DATA.find((r) => r.name === formData.diaspora_region)
                          ?.districts.find((d) => d.name === formData.diaspora_district)
                          ?.wards.map((w) => (
                            <option key={w} value={w}>
                              {w}
                            </option>
                          ))}
                    </select>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                  <InfoItem
                    icon={<Globe size={16} />}
                    label={getFieldLabel("country_of_residence")}
                    value={formData.country_of_residence || "-"}
                  />
                  <InfoItem
                    icon={<MapPin size={16} />}
                    label={getFieldLabel("city_of_residence")}
                    value={formData.city_of_residence || "-"}
                  />
                  <InfoItem
                    icon={<Map size={16} />}
                    label={getFieldLabel("diaspora_region")}
                    value={formData.diaspora_region || "-"}
                  />
                  <InfoItem
                    icon={<Map size={16} />}
                    label={getFieldLabel("diaspora_district")}
                    value={formData.diaspora_district || "-"}
                  />
                  <InfoItem
                    icon={<Map size={16} />}
                    label={getFieldLabel("diaspora_ward")}
                    value={formData.diaspora_ward || "-"}
                  />
                </div>
              )}
            </motion.div>
          )}

          {/* Emergency Contact Tab */}
          {activeTab === "emergency" && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
              <h3 className="text-lg font-bold text-stone-900 flex items-center gap-2">
                <AlertCircle size={20} className="text-emerald-600" />
                {lang === "sw" ? "Mawasiliano ya Dharura" : "Emergency Contact"}
              </h3>

              {isEditing ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label
                      htmlFor="emergency_contact_name"
                      className="text-xs font-bold text-stone-500 uppercase tracking-wider"
                    >
                      {getFieldLabel("emergency_contact_name")}
                    </label>
                    <input
                      id="emergency_contact_name"
                      type="text"
                      value={formData.emergency_contact_name}
                      onChange={(e) =>
                        setFormData({ ...formData, emergency_contact_name: e.target.value })
                      }
                      className="w-full h-12 px-4 bg-stone-50 border border-stone-200 rounded-xl focus:ring-2 focus:ring-emerald-500 transition-all"
                    />
                  </div>

                  <div className="space-y-2">
                    <label
                      htmlFor="emergency_contact_phone"
                      className="text-xs font-bold text-stone-500 uppercase tracking-wider"
                    >
                      {getFieldLabel("emergency_contact_phone")}
                    </label>
                    <input
                      id="emergency_contact_phone"
                      type="tel"
                      value={formData.emergency_contact_phone}
                      onChange={(e) =>
                        setFormData({ ...formData, emergency_contact_phone: e.target.value })
                      }
                      placeholder="+255 XXX XXX XXX"
                      className="w-full h-12 px-4 bg-stone-50 border border-stone-200 rounded-xl focus:ring-2 focus:ring-emerald-500 transition-all"
                    />
                  </div>

                  <div className="space-y-2">
                    <label
                      htmlFor="emergency_contact_relation"
                      className="text-xs font-bold text-stone-500 uppercase tracking-wider"
                    >
                      {getFieldLabel("emergency_contact_relation")}
                    </label>
                    <input
                      id="emergency_contact_relation"
                      type="text"
                      value={formData.emergency_contact_relation}
                      onChange={(e) =>
                        setFormData({ ...formData, emergency_contact_relation: e.target.value })
                      }
                      placeholder={
                        lang === "sw" ? "Mf. Mke, Mume, Mwana" : "E.g. Spouse, Parent, Child"
                      }
                      className="w-full h-12 px-4 bg-stone-50 border border-stone-200 rounded-xl focus:ring-2 focus:ring-emerald-500 transition-all"
                    />
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <InfoItem
                    icon={<User size={16} />}
                    label={getFieldLabel("emergency_contact_name")}
                    value={formData.emergency_contact_name || "-"}
                  />
                  <InfoItem
                    icon={<Phone size={16} />}
                    label={getFieldLabel("emergency_contact_phone")}
                    value={formData.emergency_contact_phone || "-"}
                  />
                  <InfoItem
                    icon={<Users size={16} />}
                    label={getFieldLabel("emergency_contact_relation")}
                    value={formData.emergency_contact_relation || "-"}
                  />
                </div>
              )}
            </motion.div>
          )}

          {/* Additional Information Tab */}
          {activeTab === "additional" && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
              <h3 className="text-lg font-bold text-stone-900 flex items-center gap-2">
                <Info size={20} className="text-emerald-600" />
                {lang === "sw" ? "Maelezo ya Ziada" : "Additional Information"}
              </h3>

              {isEditing ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label
                      htmlFor="blood_group"
                      className="text-xs font-bold text-stone-500 uppercase tracking-wider"
                    >
                      {getFieldLabel("blood_group")}
                    </label>
                    <select
                      id="blood_group"
                      value={formData.blood_group}
                      onChange={(e) => setFormData({ ...formData, blood_group: e.target.value })}
                      className="w-full h-12 px-4 bg-stone-50 border border-stone-200 rounded-xl focus:ring-2 focus:ring-emerald-500 transition-all"
                    >
                      <option value="">{lang === "sw" ? "Chagua" : "Select"}</option>
                      {BLOOD_GROUPS.map((bg) => (
                        <option key={bg} value={bg}>
                          {bg}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-2">
                    <label
                      htmlFor="disability_status"
                      className="text-xs font-bold text-stone-500 uppercase tracking-wider"
                    >
                      {getFieldLabel("disability_status")}
                    </label>
                    <select
                      id="disability_status"
                      value={formData.disability_status}
                      onChange={(e) =>
                        setFormData({ ...formData, disability_status: e.target.value })
                      }
                      className="w-full h-12 px-4 bg-stone-50 border border-stone-200 rounded-xl focus:ring-2 focus:ring-emerald-500 transition-all"
                    >
                      {DISABILITY_STATUS.map((d) => (
                        <option key={d.value} value={d.value}>
                          {d[lang]}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-2">
                    <label
                      htmlFor="religious_affiliation"
                      className="text-xs font-bold text-stone-500 uppercase tracking-wider"
                    >
                      {getFieldLabel("religious_affiliation")}
                    </label>
                    <input
                      id="religious_affiliation"
                      type="text"
                      value={formData.religious_affiliation}
                      onChange={(e) =>
                        setFormData({ ...formData, religious_affiliation: e.target.value })
                      }
                      className="w-full h-12 px-4 bg-stone-50 border border-stone-200 rounded-xl focus:ring-2 focus:ring-emerald-500 transition-all"
                    />
                  </div>

                  <div className="space-y-2">
                    <label
                      htmlFor="tribe"
                      className="text-xs font-bold text-stone-500 uppercase tracking-wider"
                    >
                      {getFieldLabel("tribe")}
                    </label>
                    <input
                      id="tribe"
                      type="text"
                      value={formData.tribe}
                      onChange={(e) => setFormData({ ...formData, tribe: e.target.value })}
                      className="w-full h-12 px-4 bg-stone-50 border border-stone-200 rounded-xl focus:ring-2 focus:ring-emerald-500 transition-all"
                    />
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                  <InfoItem
                    icon={<Heart size={16} />}
                    label={getFieldLabel("blood_group")}
                    value={formData.blood_group || "-"}
                  />
                  <InfoItem
                    icon={<AlertTriangle size={16} />}
                    label={getFieldLabel("disability_status")}
                    value={
                      formData.disability_status
                        ? DISABILITY_STATUS.find((d) => d.value === formData.disability_status)?.[
                            lang
                          ] || formData.disability_status
                        : "-"
                    }
                  />
                  <InfoItem
                    icon={<Church size={16} />}
                    label={getFieldLabel("religious_affiliation")}
                    value={formData.religious_affiliation || "-"}
                  />
                  <InfoItem
                    icon={<Users size={16} />}
                    label={getFieldLabel("tribe")}
                    value={formData.tribe || "-"}
                  />
                </div>
              )}
            </motion.div>
          )}

          {/* Documents Tab */}
          {activeTab === "documents" && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
              {/* Header with Upload Button */}
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <h3 className="text-lg font-bold text-stone-900 flex items-center gap-2">
                  <FileText size={20} className="text-emerald-600" />
                  {lang === "sw" ? "Nyaraka Zangu" : "My Documents"}
                </h3>
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setShowDocumentUpload(!showDocumentUpload)}
                  className="bg-emerald-600 text-white px-4 py-2 rounded-xl font-medium hover:bg-emerald-700 transition-all flex items-center gap-2"
                >
                  <Plus size={18} />
                  {lang === "sw" ? "Pakia Nyaraka" : "Upload Document"}
                </motion.button>
              </div>

              {/* Document Upload Form */}
              <AnimatePresence>
                {showDocumentUpload && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="bg-linear-to-br from-emerald-50 to-teal-50 border border-emerald-200 rounded-2xl p-6 space-y-4"
                  >
                    <h4 className="font-bold text-stone-800 flex items-center gap-2">
                      <Upload size={18} className="text-emerald-600" />
                      {lang === "sw" ? "Pakia Nyaraka Mpya" : "Upload New Document"}
                    </h4>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Category Selection */}
                      <div className="space-y-2">
                        <label
                          htmlFor="doc_category"
                          className="text-xs font-bold text-stone-500 uppercase tracking-wider"
                        >
                          {lang === "sw" ? "Aina ya Nyaraka" : "Document Category"}
                        </label>
                        <select
                          id="doc_category"
                          value={selectedDocCategory}
                          onChange={(e) => {
                            setSelectedDocCategory(
                              e.target.value as "id" | "certificate" | "support",
                            );
                            setSelectedDocType("");
                          }}
                          className="w-full h-12 px-4 bg-white border border-stone-200 rounded-xl focus:ring-2 focus:ring-emerald-500 transition-all"
                        >
                          {DOCUMENT_CATEGORIES.map((cat) => (
                            <option key={cat.value} value={cat.value}>
                              {cat.label[lang === "sw" ? "sw" : "en"]}
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Document Type Selection */}
                      <div className="space-y-2">
                        <label
                          htmlFor="doc_type"
                          className="text-xs font-bold text-stone-500 uppercase tracking-wider"
                        >
                          {lang === "sw" ? "Chagua Nyaraka" : "Select Document"}
                        </label>
                        <select
                          id="doc_type"
                          value={selectedDocType}
                          onChange={(e) => setSelectedDocType(e.target.value)}
                          className="w-full h-12 px-4 bg-white border border-stone-200 rounded-xl focus:ring-2 focus:ring-emerald-500 transition-all"
                        >
                          <option value="">
                            {lang === "sw" ? "-- Chagua --" : "-- Select --"}
                          </option>
                          {DOCUMENT_TYPES[selectedDocCategory].map((type) => (
                            <option key={type.value} value={type.value}>
                              {type.label[lang === "sw" ? "sw" : "en"]}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    {/* File Upload */}
                    <div className="space-y-2">
                      <label
                        htmlFor="document-upload"
                        className="text-xs font-bold text-stone-500 uppercase tracking-wider"
                      >
                        {lang === "sw" ? "Chagua Faili" : "Select File"}
                      </label>
                      <div className="flex items-center gap-4">
                        <input
                          id="document-upload"
                          ref={documentInputRef}
                          type="file"
                          onChange={handleDocumentUpload}
                          accept={ALLOWED_DOCUMENT_TYPES.join(",")}
                          disabled={!selectedDocType || documentUploading}
                          className="flex-1 h-12 px-4 bg-white border border-stone-200 rounded-xl focus:ring-2 focus:ring-emerald-500 transition-all file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-emerald-100 file:text-emerald-700 hover:file:bg-emerald-200 disabled:opacity-50"
                        />
                        {documentUploading && (
                          <Loader2 size={24} className="animate-spin text-emerald-600" />
                        )}
                      </div>
                      <p className="text-xs text-stone-500">
                        {lang === "sw"
                          ? "Aina zinazokubalika: JPG, PNG, WEBP, PDF. Ukubwa wa juu: 10MB"
                          : "Allowed types: JPG, PNG, WEBP, PDF. Max size: 10MB"}
                      </p>
                    </div>

                    {/* Close Button */}
                    <div className="flex justify-end">
                      <button
                        onClick={() => {
                          setShowDocumentUpload(false);
                          setSelectedDocType("");
                        }}
                        className="text-stone-500 hover:text-stone-700 text-sm font-medium"
                      >
                        {lang === "sw" ? "Funga" : "Close"}
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Document Categories */}
              {DOCUMENT_CATEGORIES.map((category) => {
                const categoryDocs = documents.filter(
                  (doc) => doc.document_category === category.value,
                );
                const CategoryIcon =
                  category.value === "id"
                    ? CreditCard
                    : category.value === "certificate"
                      ? Award
                      : FileText;

                return (
                  <div key={category.value} className="space-y-3">
                    <h4 className="font-semibold text-stone-700 flex items-center gap-2 border-b border-stone-100 pb-2">
                      <CategoryIcon size={18} className="text-emerald-600" />
                      {category.label[lang === "sw" ? "sw" : "en"]}
                      <span className="text-xs text-stone-400 font-normal">
                        ({categoryDocs.length} {lang === "sw" ? "nyaraka" : "documents"})
                      </span>
                    </h4>

                    {categoryDocs.length > 0 ? (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {categoryDocs.map((doc) => (
                          <motion.div
                            key={doc.id}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="bg-white border border-stone-200 rounded-xl p-4 hover:shadow-md transition-all"
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div className="flex items-start gap-3 flex-1 min-w-0">
                                {/* Document Icon/Preview */}
                                <div className="shrink-0">
                                  {doc.file_type?.includes("pdf") ? (
                                    <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center">
                                      <FileText size={24} className="text-red-600" />
                                    </div>
                                  ) : (
                                    <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center overflow-hidden">
                                      {doc.document_url && !failedDocumentPreviews[doc.id] ? (
                                        <img
                                          src={doc.document_url}
                                          alt={doc.document_name}
                                          className="w-full h-full object-cover rounded-lg"
                                          onError={() => {
                                            setFailedDocumentPreviews((prev) => ({
                                              ...prev,
                                              [doc.id]: true,
                                            }));
                                          }}
                                        />
                                      ) : (
                                        <FileImage size={24} className="text-blue-600" />
                                      )}
                                    </div>
                                  )}
                                </div>

                                {/* Document Info */}
                                <div className="flex-1 min-w-0">
                                  <p className="font-medium text-stone-800 truncate">
                                    {getDocumentTypeLabel(doc.document_type, doc.document_category)}
                                  </p>
                                  <p className="text-xs text-stone-500">
                                    {new Date(doc.uploaded_at).toLocaleDateString(
                                      lang === "sw" ? "sw-TZ" : "en-US",
                                      {
                                        year: "numeric",
                                        month: "short",
                                        day: "numeric",
                                      },
                                    )}
                                  </p>
                                  {/* Verification Status */}
                                  <div className="mt-2">
                                    {doc.verified ? (
                                      <span className="inline-flex items-center gap-1 bg-green-100 text-green-700 px-2 py-0.5 rounded-full text-xs font-medium">
                                        <Check size={12} />
                                        {lang === "sw" ? "Imethibitishwa" : "Verified"}
                                      </span>
                                    ) : (
                                      <span className="inline-flex items-center gap-1 bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full text-xs font-medium">
                                        <Clock size={12} />
                                        {lang === "sw"
                                          ? "Inasubiri Uthibitisho"
                                          : "Pending Verification"}
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </div>

                              {/* Actions */}
                              <div className="flex flex-col gap-1">
                                {/* View/Download */}
                                <a
                                  href={doc.document_url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  download={`${doc.document_type}.${doc.file_type?.includes("pdf") ? "pdf" : "jpg"}`}
                                  className="p-2 text-stone-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-all"
                                  title={lang === "sw" ? "Pakua" : "Download"}
                                >
                                  <Download size={16} />
                                </a>
                                {/* Delete */}
                                {!doc.verified && (
                                  <button
                                    onClick={() => handleDeleteDocument(doc.id)}
                                    className="p-2 text-stone-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                                    title={lang === "sw" ? "Futa" : "Delete"}
                                  >
                                    <Trash2 size={16} />
                                  </button>
                                )}
                              </div>
                            </div>
                          </motion.div>
                        ))}
                      </div>
                    ) : (
                      <div className="bg-stone-50 rounded-xl p-6 text-center">
                        <CategoryIcon size={32} className="mx-auto text-stone-300 mb-2" />
                        <p className="text-stone-500 text-sm">
                          {lang === "sw"
                            ? `Hakuna ${category.label.sw.toLowerCase()} zilizopakiwa`
                            : `No ${category.label.en.toLowerCase()} uploaded`}
                        </p>
                      </div>
                    )}
                  </div>
                );
              })}
            </motion.div>
          )}
        </div>

        {/* Action buttons */}
        <div className="border-t border-stone-100 p-4 sm:p-8">
          <div className="flex flex-col sm:flex-row gap-4">
            {isEditing ? (
              <>
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={handleSaveProfile}
                  disabled={saving}
                  className="bg-emerald-600 text-white px-8 py-3 rounded-xl font-bold hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-100 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {saving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
                  {lang === "sw" ? "Hifadhi Mabadiliko" : "Save Changes"}
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={handleCancel}
                  className="bg-stone-100 text-stone-600 px-8 py-3 rounded-xl font-bold hover:bg-stone-200 transition-all flex items-center justify-center gap-2"
                >
                  <X size={18} />
                  {lang === "sw" ? "Ghairi" : "Cancel"}
                </motion.button>
              </>
            ) : (
              <>
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setIsEditing(true)}
                  className="bg-emerald-600 text-white px-8 py-3 rounded-xl font-bold hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-100 flex items-center justify-center gap-2"
                >
                  <Edit2 size={18} />
                  {lang === "sw" ? "Hariri Wasifu" : "Edit Profile"}
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={async () => {
                    await signOut();
                  }}
                  className="bg-stone-100 text-stone-600 px-8 py-3 rounded-xl font-bold hover:bg-stone-200 transition-all flex items-center justify-center gap-2"
                >
                  <LogOut size={18} />
                  {lang === "sw" ? "Ondoka" : "Sign Out"}
                </motion.button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Unsaved changes warning */}
      <AnimatePresence>
        {isDirty && isEditing && (
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            className="fixed bottom-4 right-4 bg-amber-50 border border-amber-200 rounded-lg p-4 shadow-lg max-w-sm z-50"
          >
            <div className="flex items-start gap-2">
              <AlertCircle size={20} className="text-amber-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-amber-800">
                  {lang === "sw" ? "Mabadiliko ambayo hayajahifadhiwa" : "Unsaved changes"}
                </p>
                <p className="text-sm text-amber-700 mt-1">
                  {lang === "sw"
                    ? "Una mabadiliko ambayo hayajahifadhiwa. Tafadhali hifadhi au ghairi."
                    : "You have unsaved changes. Please save or cancel."}
                </p>
                <div className="flex gap-2 mt-2">
                  <button
                    onClick={handleSaveProfile}
                    className="text-xs bg-amber-600 text-white px-3 py-1 rounded-lg hover:bg-amber-700"
                  >
                    {lang === "sw" ? "Hifadhi" : "Save"}
                  </button>
                  <button
                    onClick={handleCancel}
                    className="text-xs bg-stone-200 text-stone-700 px-3 py-1 rounded-lg hover:bg-stone-300"
                  >
                    {lang === "sw" ? "Ghairi" : "Cancel"}
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
