import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Merge class names with Tailwind CSS classes
 * @param inputs - Class names to merge
 * @returns Merged class string
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Tanzanian Government Branding Constants
 */
export const TanzanianBranding = {
  colors: {
    gold: "#FCD34D",
    green: "#10B981",
    blue: "#3B82F6",
    cream: "#FDF5E6",
    brown: "#8B4513",
    black: "#000000",
    // Additional Tanzanian flag colors
    flag: {
      green: "#1EBE53",
      yellow: "#FCD116",
      blue: "#00A3DD",
      black: "#000000",
    },
    // Government official colors
    government: {
      primary: "#1A4D2E", // Dark green
      secondary: "#1E3A5F", // Dark blue
      accent: "#D4AF37", // Gold
      background: "#F5F5DC", // Cream
    },
  },
  text: {
    republic: "JAMHURI YA MUUNGANO WA TANZANIA",
    republicShort: "JAMHURI YA TANZANIA",
    office: "OFISI YA RAIS - TAMISEMI",
    officeFull: "OFISI YA RAIS - TAWALA ZA MIKOA NA SERIKALI ZA MITAA",
    motto: "UHURU NA UMOJA",
    mottoEnglish: "FREEDOM AND UNITY",
  },
  // Form labels and messages
  labels: {
    sw: {
      apply: "OMBA",
      status: "HALI",
      payment: "MALIPO",
      documents: "NYARAKA",
      verify: "THIBITISHA",
      download: "PAKUA",
      print: "CHAPISHA",
      submit: "WASILISHA",
      cancel: "GHAIRI",
      save: "HIFADHI",
      edit: "HARIRI",
      delete: "FUTA",
      back: "NYUMA",
      next: "ENDELEA",
      confirm: "THIBITISHA",
      reject: "KATAA",
      approve: "IDHINISHA",
    },
    en: {
      apply: "APPLY",
      status: "STATUS",
      payment: "PAYMENT",
      documents: "DOCUMENTS",
      verify: "VERIFY",
      download: "DOWNLOAD",
      print: "PRINT",
      submit: "SUBMIT",
      cancel: "CANCEL",
      save: "SAVE",
      edit: "EDIT",
      delete: "DELETE",
      back: "BACK",
      next: "NEXT",
      confirm: "CONFIRM",
      reject: "REJECT",
      approve: "APPROVE",
    },
  },
  // Document types
  documentTypes: {
    nida: "NIDA ID Card",
    passport: "Passport",
    birthCertificate: "Birth Certificate",
    deathCertificate: "Death Certificate",
    landTitle: "Land Title Deed",
    businessLicense: "Business License",
    taxClearance: "Tax Clearance Certificate",
    utilityBill: "Utility Bill",
    passportPhoto: "Passport Photo",
    leaseAgreement: "Lease Agreement",
    saleAgreement: "Sale Agreement",
  },
  // Service categories
  serviceCategories: {
    sw: {
      identification: "Vitambulisho na Hati",
      land: "Ardhi na Majengo",
      business: "Biashara na Leseni",
      marriage: "Ndoa na Familia",
      death: "Vifo na Mazishi",
      permits: "Vibali na Ruhusa",
      complaints: "Malalamiko na Maoni",
    },
    en: {
      identification: "Identification & Documents",
      land: "Land & Property",
      business: "Business & Licenses",
      marriage: "Marriage & Family",
      death: "Death & Burials",
      permits: "Permits & Authorizations",
      complaints: "Complaints & Feedback",
    },
  },
  // Payment status
  paymentStatus: {
    sw: {
      pending: "Inasubiri",
      paid: "Imelipwa",
      failed: "Imeshindikana",
      refunded: "Imerejeshwa",
      processing: "Inachakatwa",
    },
    en: {
      pending: "Pending",
      paid: "Paid",
      failed: "Failed",
      refunded: "Refunded",
      processing: "Processing",
    },
  },
  // Application status
  applicationStatus: {
    sw: {
      draft: "Rasimu",
      submitted: "Imetumwa",
      under_review: "Inakaguliwa",
      payment_pending: "Malipo Yanasubiri",
      payment_verified: "Malipo Yamethibitishwa",
      approved: "Imeidhinishwa",
      rejected: "Imekataliwa",
      completed: "Imekamilika",
      expired: "Imeisha",
    },
    en: {
      draft: "Draft",
      submitted: "Submitted",
      under_review: "Under Review",
      payment_pending: "Payment Pending",
      payment_verified: "Payment Verified",
      approved: "Approved",
      rejected: "Rejected",
      completed: "Completed",
      expired: "Expired",
    },
  },
  // Office locations
  regions: {
    sw: [
      "Arusha",
      "Dar es Salaam",
      "Dodoma",
      "Geita",
      "Iringa",
      "Kagera",
      "Katavi",
      "Kigoma",
      "Kilimanjaro",
      "Lindi",
      "Manyara",
      "Mara",
      "Mbeya",
      "Morogoro",
      "Mtwara",
      "Mwanza",
      "Njombe",
      "Pemba Kaskazini",
      "Pemba Kusini",
      "Pwani",
      "Rukwa",
      "Ruvuma",
      "Shinyanga",
      "Simiyu",
      "Singida",
      "Songwe",
      "Tabora",
      "Tanga",
      "Unguja Kaskazini",
      "Unguja Kusini",
      "Unguja Mjini Magharibi",
    ],
    en: [
      "Arusha",
      "Dar es Salaam",
      "Dodoma",
      "Geita",
      "Iringa",
      "Kagera",
      "Katavi",
      "Kigoma",
      "Kilimanjaro",
      "Lindi",
      "Manyara",
      "Mara",
      "Mbeya",
      "Morogoro",
      "Mtwara",
      "Mwanza",
      "Njombe",
      "North Pemba",
      "South Pemba",
      "Coast",
      "Rukwa",
      "Ruvuma",
      "Shinyanga",
      "Simiyu",
      "Singida",
      "Songwe",
      "Tabora",
      "Tanga",
      "North Unguja",
      "South Unguja",
      "Urban West Unguja",
    ],
  },
  // File size limits
  fileSizeLimits: {
    image: 5 * 1024 * 1024, // 5MB
    document: 10 * 1024 * 1024, // 10MB
    pdf: 15 * 1024 * 1024, // 15MB
  },
  // Supported file types
  supportedFileTypes: {
    images: ["image/jpeg", "image/png", "image/jpg", "image/webp"],
    documents: [
      "application/pdf",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ],
    all: ["image/jpeg", "image/png", "image/jpg", "image/webp", "application/pdf"],
  },
};

/**
 * Format currency in Tanzanian Shillings
 * @param amount - Amount to format
 * @param locale - Locale (sw or en)
 * @returns Formatted currency string
 */
export const formatTZS = (amount: number, locale: "sw" | "en" = "en"): string => {
  if (locale === "sw") {
    return `TSh ${amount.toLocaleString("sw-TZ")}`;
  }
  return `TZS ${amount.toLocaleString("en-TZ")}`;
};

/**
 * Format date in Tanzanian format
 * @param date - Date to format
 * @param locale - Locale (sw or en)
 * @returns Formatted date string
 */
export const formatDate = (date: Date | string, locale: "sw" | "en" = "en"): string => {
  const d = new Date(date);
  return d.toLocaleDateString(locale === "sw" ? "sw-TZ" : "en-TZ", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
};

/**
 * Generate application reference number
 * @param serviceCode - Service code (e.g., 'MKZ', 'UTB')
 * @returns Application reference number
 */
export const generateReferenceNumber = (serviceCode: string): string => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const random = Math.floor(Math.random() * 10000)
    .toString()
    .padStart(4, "0");
  return `TZ/${serviceCode}/${year}${month}/${random}`;
};

/**
 * Validate Tanzanian phone number
 * @param phone - Phone number to validate
 * @returns Boolean indicating if valid
 */
export const isValidTanzanianPhone = (phone: string): boolean => {
  // Tanzanian phone numbers: 07xx xxx xxx or +2557xx xxx xxx
  const tzPhoneRegex = /^(?:(?:255|\+255|0)?(?:7[3-9]\d{7})|(?:255|\+255|0)?(?:6[5-9]\d{7}))$/;
  return tzPhoneRegex.test(phone.replace(/\s/g, ""));
};

/**
 * Validate NIDA number
 * @param nidaNumber - NIDA number to validate
 * @returns Boolean indicating if valid
 */
export const isValidNIDA = (nidaNumber: string): boolean => {
  // NIDA number format: 200101000000000000 (18 digits) or similar
  const nidaRegex = /^\d{15,20}$/;
  return nidaRegex.test(nidaNumber);
};

/**
 * Get status color for UI
 * @param status - Status string
 * @returns Tailwind color class
 */
export const getStatusColor = (status: string): string => {
  const statusColors: Record<string, string> = {
    draft: "bg-gray-100 text-gray-800",
    submitted: "bg-blue-100 text-blue-800",
    under_review: "bg-yellow-100 text-yellow-800",
    payment_pending: "bg-orange-100 text-orange-800",
    payment_verified: "bg-purple-100 text-purple-800",
    approved: "bg-green-100 text-green-800",
    rejected: "bg-red-100 text-red-800",
    completed: "bg-emerald-100 text-emerald-800",
    expired: "bg-stone-100 text-stone-800",
  };
  return statusColors[status] || "bg-gray-100 text-gray-800";
};

/**
 * Truncate text with ellipsis
 * @param text - Text to truncate
 * @param length - Maximum length
 * @returns Truncated text
 */
export const truncateText = (text: string, length: number = 50): string => {
  if (text.length <= length) return text;
  return text.substring(0, length) + "...";
};

/**
 * Download blob as file
 * @param blob - Blob to download
 * @param filename - Filename
 */
export const downloadBlob = (blob: Blob, filename: string): void => {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

/**
 * Copy text to clipboard
 * @param text - Text to copy
 * @returns Promise resolving to boolean
 */
export const copyToClipboard = async (text: string): Promise<boolean> => {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch (_err) {
    console.error("Failed to copy:", err);
    return false;
  }
};

/**
 * Get file extension from filename
 * @param filename - Filename
 * @returns File extension
 */
export const getFileExtension = (filename: string): string => {
  return filename.slice(((filename.lastIndexOf(".") - 1) >>> 0) + 2);
};

/**
 * Format file size
 * @param bytes - Size in bytes
 * @returns Formatted file size
 */
export const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
};

// Define Timeout type for browser environment
type TimeoutId = ReturnType<typeof setTimeout>;

/**
 * Debounce function for search inputs
 * @param func - Function to debounce
 * @param delay - Delay in milliseconds
 * @returns Debounced function
 */
export const debounce = <T extends (...args: never[]) => unknown>(
  func: T,
  delay: number,
): ((...args: Parameters<T>) => void) => {
  let timeoutId: TimeoutId | undefined;
  return (...args: Parameters<T>) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => func(...args), delay);
  };
};
