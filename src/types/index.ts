/**
 * Shared application types.
 * Import from here instead of using `any` for domain objects.
 */

// ─── Navigation ───────────────────────────────────────────────────────────────

export type ViewName =
  | "dashboard"
  | "services"
  | "agreement"
  | "apply"
  | "applications"
  | "notifications"
  | "profile"
  | "verify_documents"
  // Staff
  | "staff_dashboard"
  | "customer_support"
  | "manual_verification"
  | "application_review"
  | "staff_management"
  | "business_approval"
  // Admin
  | "admin_dashboard"
  | "office_management"
  | "location_management"
  | "service_management"
  | "admin_logs"
  | "citizen_management";

// ─── Application status ────────────────────────────────────────────────────────

export type ApplicationStatus =
  | "submitted"
  | "pending_review"
  | "pending_payment"
  | "paid"
  | "verified"
  | "approved"
  | "issued"
  | "returned"
  | "rejected"
  | "refunded";

// ─── Payment ───────────────────────────────────────────────────────────────────

export interface PaymentData {
  transaction_id: string;
  amount: number;
  payment_method: string;
  paid_at: string;
}

export interface PaymentResult extends PaymentData {
  receipt_number?: string;
}

// ─── Form schema ───────────────────────────────────────────────────────────────

export interface FormFieldOption {
  label: string;
  value: string;
}

export interface FormFieldShowIf {
  field: string;
  value?: string;
  values?: string[]; // for multi-value showIf conditions
}

export interface FormField {
  name: string;
  label: string;
  type:
    | "text"
    | "number"
    | "date"
    | "select"
    | "textarea"
    | "file"
    | "header"
    | "phone"
    | "email"
    | "checkbox"
    | "citizen_id_lookup";
  required?: boolean;
  placeholder?: string;
  options?: FormFieldOption[];
  showIf?: FormFieldShowIf;
  value?: string | number | boolean;
}

// ─── Form data (per service) ───────────────────────────────────────────────────

/** Base fields present in all submitted forms */
export interface BaseFormData {
  service_fee?: number;
  vat_amount?: number;
  total_amount?: number;
  payment_data?: PaymentData;
  target_user_id?: string;
  target_user_nida?: string;
  second_party_user_id?: string;
  second_party_name?: string;
  submitter_role?: "LANDLORD" | "TENANT" | "SELLER" | "BUYER";
  send_for_approval?: "YES" | "NO";
  asset_type?: string;
}

/** Resident Identity (Utambulisho wa Mkazi) */
export interface UtambulishoFormData extends BaseFormData {
  council: string;
  occupation: string;
  marital_status: "SINGLE" | "MARRIED" | "DIVORCED" | "WIDOWED";
  neighborhood: string;
  house_number?: string;
  housing_status: "RENTING" | "OWNER" | "OTHER";
  has_children: "YES" | "NO";
  number_of_children?: number;
  spouse_1_name?: string;
  spouse_1_nida?: string;
  spouse_1_dob?: string;
  child_1_name?: string;
  child_1_dob?: string;
}

/** Sales / Rental Agreement (Makubaliano ya Mauziano / Pangisha) */
export interface AgreementFormData extends BaseFormData {
  asset_type: string;
  asset_description: string;
  sale_price: number;
  monthly_rent?: number;
  payment_period?: number;
  total_rent?: number;
  seller_tin?: string;
  agreement_file?: string;
  second_party_citizen_id?: string;
}

/** Union of all possible form_data shapes.
 * Includes an index signature so service-specific fields (event_type, deceased_full_name,
 * council, occupation, etc.) don't require explicit typing in every PDF component.
 */
export type AnyFormData = (UtambulishoFormData | AgreementFormData | BaseFormData) &
  Record<string, unknown>;

// ─── Draft ─────────────────────────────────────────────────────────────────────

export interface ApplicationDraft {
  id: string;
  user_id: string;
  service_id: string;
  service_name: string;
  form_data: AnyFormData;
  saved_at: string;
  last_saved?: string; // timestamp of last auto-save
  current_step?: number; // which form step was active when draft was saved
}

// ─── Staff signup data ─────────────────────────────────────────────────────────

export interface SignUpUserData {
  first_name: string;
  middle_name?: string;
  last_name: string;
  sex: string;
  nationality: string;
  nida_number?: string;
  phone: string;
  region?: string;
  district?: string;
  ward?: string;
  street?: string;
  role?: "citizen" | "staff" | "admin";
  is_diaspora?: boolean;
  country_of_residence?: string;
  passport_number?: string;
  country_of_citizenship?: string;
  id_type?: string;
  id_number?: string;
}

// ─── Supabase error ────────────────────────────────────────────────────────────

export interface SupabaseError {
  message: string;
  code?: string;
  details?: string;
  hint?: string;
}
