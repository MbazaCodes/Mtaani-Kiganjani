import type { Session as SupabaseSession, SupabaseClient } from "@supabase/supabase-js";
import type { AnyFormData, PaymentData, FormField, ApplicationStatus } from "@/types";
import { supabase as cloudSupabase } from "@/integrations/supabase/client";

// Supabase client
// Cast to untyped client so the existing app code (which queries custom
// tables not yet present in generated Database types) keeps compiling.
export const supabase = cloudSupabase as unknown as SupabaseClient;

// Re-export Session type
export type Session = SupabaseSession;

export interface Service {
  id: string;
  name: string;
  name_en?: string;
  description?: string;
  description_en?: string;
  fee: number;
  form_schema: FormField[];
  diaspora_form_schema?: FormField[];
  validity_months?: number;
  document_template?: Record<string, unknown>;
  extra_address_fee?: number;
  active?: boolean; // matches DB column name
  created_at: string;
}

export interface UserProfile {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  middle_name?: string;
  nida_number?: string;
  phone?: string;
  photo_url?: string;
  role: "citizen" | "staff" | "admin";
  is_verified: boolean;
  is_diaspora?: boolean;
  account_status: string;

  // Location fields
  region?: string;
  district?: string;
  ward?: string;
  street?: string;

  // Personal info
  birth_date?: string;
  date_of_birth?: string;
  gender?: string;
  sex?: string;
  nationality?: string;
  country_of_citizenship?: string;
  marital_status?: string;
  occupation?: string;
  education_level?: string;
  place_of_birth?: string;
  birth_region?: string;
  birth_district?: string;

  // Contact
  alternative_phone?: string;
  email_address?: string;
  alternative_email?: string;

  // Address details
  house_number?: string;
  postal_code?: string;
  landmark?: string;

  // Emergency contact
  emergency_contact_name?: string;
  emergency_contact_phone?: string;
  emergency_contact_relation?: string;

  // Identity
  id_type?: string;
  id_number?: string;
  passport_number?: string;
  voter_id_number?: string;
  driving_license_number?: string;
  citizen_id?: string;
  signature_url?: string;
  stamp_url?: string;
  seller_id?: string;
  landlord_id?: string;
  broker_id?: string;

  // Diaspora
  country_of_residence?: string;
  city_of_residence?: string;
  diaspora_region?: string;
  diaspora_district?: string;
  diaspora_ward?: string;

  // Staff fields
  assigned_region?: string;
  assigned_district?: string;
  office_id?: string;
  employee_id?: string;
  department?: string;
  position?: string;
  employment_date?: string;

  // Additional
  blood_group?: string;
  disability_status?: string;
  religious_affiliation?: string;
  tribe?: string;

  // Local officials
  mtaa_executive_officer?: string;
  ward_councillor?: string;
  ward_chairperson?: string;

  // Metadata
  last_login?: string;
  email_verified?: boolean;
  phone_verified?: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface Application {
  id: string;
  user_id: string;
  service_id: string;
  service_name: string;
  application_number: string;
  status: ApplicationStatus;
  created_at: string;
  updated_at?: string;
  approved_at?: string;
  paid_at?: string;
  issued_at?: string;
  form_data: AnyFormData;
  feedback?: string;
  buyer_accepted?: boolean;
  tenant_accepted?: boolean;
  region?: string;
  district?: string;
  ward?: string;
  street?: string;
  assigned_staff_id?: string;
  target_user_id?: string;
  target_user_nida?: string;
  target_user_role?: string;
  agreement_status?: string;
  payment_data?: PaymentData;
  confirmation_data?: Record<string, unknown>;
  is_confirmed?: boolean;
  approved_by?: string;
  rejected_by?: string;
  returned_by?: string;
  issued_by?: string;
  verified_by?: string;
  verified_at?: string;
  // Optional joined relations (populated by Supabase select with embedded resources)
  services?: Partial<Service> | null;
  users?: Partial<UserProfile> | null;
  second_party_user_id?: string;
}

export type UserRole = "citizen" | "staff" | "admin";

export type User = UserProfile;

export interface VirtualOffice {
  id: string;
  name: string;
  region: string;
  district?: string | null;
  address?: string;
  level?: string;
  created_at: string;
}
