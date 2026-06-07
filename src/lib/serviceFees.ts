/**
 * Service Fee Lookup
 * Maps service names to their standard fees (in TSh).
 * Used as a fallback when payment_data.amount / form_data.total_fee aren't set.
 */

const SERVICE_FEES: Record<string, number> = {
  "Utambulisho wa Mkazi": 5000,
  "Kibari cha Mazishi": 2000,
  "Kibari cha Sherehe": 10000,
  "Kibari cha Ujezi Mdogo": 15000,
  "Barua ya Utambulisho": 3000,
  "Makubaliano ya Mauzo": 5000, // min for sales (3% of value, min 5000)
  "Makubaliano ya Pango": 10000, // min for rental
  "Migogoro na Mashauri": 5000, // citizen disputes
  // Malipo na Michango is variable (amount = the payment itself)
};

interface FeeSource {
  service_name?: string | null;
  form_data?: Record<string, unknown> | null;
  payment_data?: Record<string, unknown> | null;
}

/**
 * Get the payment amount for an application.
 * Priority: paid amount → stored total_fee/service_fee → service name lookup.
 */
export function getApplicationAmount(app: FeeSource): number {
  const pd = (app.payment_data || {}) as Record<string, unknown>;
  const fd = (app.form_data || {}) as Record<string, unknown>;

  // 1. Actual paid amount
  if (pd.amount && Number(pd.amount) > 0) return Number(pd.amount);

  // 2. Stored fee (forms store total_fee; some legacy use service_fee)
  if (fd.total_fee && Number(fd.total_fee) > 0) return Number(fd.total_fee);
  if (fd.service_fee && Number(fd.service_fee) > 0) return Number(fd.service_fee);

  // 3. For payments service, the amount is the contribution itself
  if (fd.amount && Number(fd.amount) > 0) return Number(fd.amount);
  if (fd.payment_amount && Number(fd.payment_amount) > 0) return Number(fd.payment_amount);

  // 4. Sale agreements: 3% of sale price (min 5000, max 500000)
  if (app.service_name === "Makubaliano ya Mauzo" && fd.sale_price) {
    const calc = Math.round(Number(fd.sale_price) * 0.03);
    return Math.min(Math.max(calc, 5000), 500000);
  }

  // 5. Lookup standard fee by service name
  if (app.service_name && SERVICE_FEES[app.service_name] !== undefined) {
    return SERVICE_FEES[app.service_name];
  }

  return 0;
}

/** Get the standard fee for a service by name */
export function getServiceFee(serviceName: string): number {
  return SERVICE_FEES[serviceName] ?? 0;
}

export { SERVICE_FEES };
