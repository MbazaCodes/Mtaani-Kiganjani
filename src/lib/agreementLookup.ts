import { supabase } from "@/lib/supabase";

export type AgreementCounterpartySearchType = "NIDA" | "PHONE" | "CT_ID";

export interface AgreementCounterpartyProfile {
  id: string;
  citizen_id?: string | null;
  first_name: string;
  last_name: string;
  middle_name?: string | null;
  nida_number?: string | null;
  phone?: string | null;
  email?: string | null;
  region?: string | null;
  district?: string | null;
  ward?: string | null;
  is_verified: boolean;
  account_status: string;
}

const normalizeSearchTerm = (searchType: AgreementCounterpartySearchType, term: string) => {
  const trimmed = term.trim();
  if (searchType === "CT_ID") return trimmed.toUpperCase();
  return trimmed;
};

const queryLookupTable = async (
  table: "users" | "profiles",
  searchType: AgreementCounterpartySearchType,
  term: string,
) => {
  const column =
    searchType === "NIDA" ? "nida_number" : searchType === "PHONE" ? "phone" : "citizen_id";

  const { data, error } = await supabase
    .from(table)
    .select(
      "id, citizen_id, first_name, middle_name, last_name, nida_number, phone, email, region, district, ward, is_verified, account_status",
    )
    .eq(column, normalizeSearchTerm(searchType, term))
    .maybeSingle();

  if (error) throw error;
  return data as AgreementCounterpartyProfile | null;
};

export async function findAgreementCounterparty(
  searchType: AgreementCounterpartySearchType,
  term: string,
) {
  const normalizedTerm = normalizeSearchTerm(searchType, term);

  try {
    const { data, error } = await supabase
      .rpc("search_agreement_counterparty", {
        p_search_type: searchType,
        p_search_term: normalizedTerm,
      })
      .maybeSingle();

    if (!error && data) return data as AgreementCounterpartyProfile;

    // Function missing means the SQL patch has not been applied yet. Fall back
    // to table reads for local/dev databases that allow direct lookup.
    if (error && !["PGRST202", "42883"].includes(String(error.code))) throw error;
  } catch (_error) {
    const code = (error as { code?: string }).code;
    if (!["PGRST202", "42883"].includes(String(code))) throw error;
  }

  try {
    return await queryLookupTable("users", searchType, normalizedTerm);
  } catch (usersError) {
    try {
      return await queryLookupTable("profiles", searchType, normalizedTerm);
    } catch {
      throw usersError;
    }
  }
}
