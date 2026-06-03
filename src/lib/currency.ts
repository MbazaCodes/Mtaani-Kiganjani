export type CurrencyCode = "TZS" | "USD" | "EUR" | "GBP" | "KES";

export const formatCurrency = (amount: number, currency: string = "TZS") => {
  return new Intl.NumberFormat("sw-TZ", {
    style: "currency",
    currency: currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
};

export const getCurrencyForUser = (
  isDiaspora?: boolean,
  countryOfResidence?: string | null,
): CurrencyCode => {
  if (isDiaspora) return "USD";
  if (
    countryOfResidence &&
    countryOfResidence.trim() !== "" &&
    countryOfResidence.trim().toLowerCase() !== "tanzania"
  ) {
    return "USD";
  }
  return "TZS";
};
