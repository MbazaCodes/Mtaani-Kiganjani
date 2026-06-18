/**
 * feeDistribution.ts — Government fee allocation
 *
 * Every fee paid is split across government levels:
 *   VAT (Kodi ya Ongezeko la Thamani)    5%
 *   Regional (Mkoa)                       5%
 *   District (Wilaya)                    10%
 *   Ward (Kata)                          20%
 *   Street / Village (Mtaa/Kijiji)       50%
 *   Service Fee (Ada ya Huduma)          10%
 *   ────────────────────────────────────────
 *   Total                               100%
 */

export interface FeeShare {
  key: string;
  label: { sw: string; en: string };
  percent: number;
  amount: number;
}

export const FEE_DISTRIBUTION: {
  key: string;
  label: { sw: string; en: string };
  percent: number;
}[] = [
  { key: "street", label: { sw: "Mtaa / Kijiji", en: "Street / Village" }, percent: 50 },
  { key: "ward", label: { sw: "Kata", en: "Ward" }, percent: 20 },
  { key: "district", label: { sw: "Wilaya", en: "District" }, percent: 10 },
  { key: "service", label: { sw: "Ada ya Huduma", en: "Service Fee" }, percent: 10 },
  { key: "regional", label: { sw: "Mkoa", en: "Regional" }, percent: 5 },
  { key: "vat", label: { sw: "VAT (Kodi)", en: "VAT (Tax)" }, percent: 5 },
];

/**
 * Split a total amount into its constituent shares.
 * The largest share (street) absorbs any rounding remainder so the
 * parts always sum exactly to the total.
 */
export function distributeFee(total: number): FeeShare[] {
  const t = Math.max(0, Math.round(Number(total) || 0));
  const shares = FEE_DISTRIBUTION.map((d) => ({
    ...d,
    amount: Math.round((t * d.percent) / 100),
  }));
  // Reconcile rounding: adjust the first (largest) share
  const sum = shares.reduce((s, x) => s + x.amount, 0);
  const diff = t - sum;
  if (diff !== 0 && shares.length > 0) shares[0].amount += diff;
  return shares;
}
