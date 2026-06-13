/**
 * Risiti ya Malipo — Official Payment Receipt
 */
import React from "react";
import { Document, Page, Text, View, Image, StyleSheet } from "@react-pdf/renderer";
import {
  DocumentPDFProps,
  commonStyles as s,
  generateQRCodeUrl,
  formatFullName,
  formatDate,
  formatCurrency,
} from "./types";
import { GovernmentStamp } from "./GovernmentStamp";
import { TANZANIA_LOGO_BASE64 } from "@/constants/logo";
import { distributeFee } from "@/lib/feeDistribution";

const ls = StyleSheet.create({
  paidBanner: {
    backgroundColor: "#ffffff",
    borderWidth: 1.5,
    borderColor: "#1a5632",
    padding: 12,
    alignItems: "center",
    marginBottom: 8,
    borderRadius: 2,
  },
  paidText: { color: "#1a5632", fontSize: 16, fontWeight: "bold", letterSpacing: 3 },
  receiptNo: { color: "#6b6b6b", fontSize: 8, marginTop: 4, fontFamily: "Courier" },
  amountCard: {
    backgroundColor: "#f7f7f7",
    borderWidth: 0.5,
    borderColor: "#c0c0c0",
    padding: 14,
    alignItems: "center",
    marginVertical: 12,
    borderRadius: 2,
  },
  amtLabel: { fontSize: 7, color: "#6b6b6b", marginBottom: 4 },
  amtValue: { fontSize: 22, fontWeight: "bold", color: "#111111", marginBottom: 3 },
  amtWords: { fontSize: 7, color: "#6b6b6b", fontStyle: "italic" },
  tableRow: {
    flexDirection: "row",
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderBottomWidth: 0.5,
    borderBottomColor: "#e5e7eb",
  },
  tableAlt: { backgroundColor: "#f9fafb" },
  tableLabel: { width: "40%", fontSize: 9, color: "#6b7280", fontWeight: "bold" },
  tableValue: { width: "60%", fontSize: 9, color: "#1c1917" },
  // Fee distribution
  distRow: {
    flexDirection: "row",
    paddingVertical: 5,
    paddingHorizontal: 8,
    borderBottomWidth: 0.5,
    borderBottomColor: "#e5e7eb",
    alignItems: "center",
  },
  distAlt: { backgroundColor: "#f9fafb" },
  distLabel: { width: "55%", fontSize: 8.5, color: "#374151" },
  distPct: { width: "20%", fontSize: 8.5, color: "#6b7280", textAlign: "right" },
  distAmt: { width: "25%", fontSize: 8.5, color: "#1c1917", fontWeight: "bold", textAlign: "right" },
  distTotalRow: {
    flexDirection: "row",
    paddingVertical: 6,
    paddingHorizontal: 8,
    backgroundColor: "#1a5632",
    alignItems: "center",
  },
  distTotalLabel: { width: "55%", fontSize: 9, color: "#ffffff", fontWeight: "bold" },
  distTotalPct: { width: "20%", fontSize: 9, color: "#d1fae5", textAlign: "right" },
  distTotalAmt: { width: "25%", fontSize: 9, color: "#ffffff", fontWeight: "bold", textAlign: "right" },
});

const PAYMENT_METHODS: Record<string, { sw: string; en: string }> = {
  mpesa: { sw: "M-Pesa", en: "M-Pesa" },
  tigopesa: { sw: "Tigo Pesa", en: "Tigo Pesa" },
  airtelmoney: { sw: "Airtel Money", en: "Airtel Money" },
  halopesa: { sw: "HaloPesa", en: "HaloPesa" },
  bank: { sw: "Benki", en: "Bank Transfer" },
  cash: { sw: "Taslimu", en: "Cash" },
};

export const RisitiMalipoPDF: React.FC<DocumentPDFProps> = ({ application, lang, qrDataUrl }) => {
  const user = application.users;
  const fd = (application.form_data || {}) as Record<string, string | undefined>;
  const pd = (fd.payment_data || application.payment_data || {}) as Record<
    string,
    string | undefined
  >;
  const qr = qrDataUrl || generateQRCodeUrl(application, "RCP");
  const sw = lang === "sw";

  // Fallbacks: application.users is not joined — read payer snapshot from form_data
  const payerName =
    formatFullName(user) !== "N/A" ? formatFullName(user) : String(fd.payer_name || "N/A");
  const payerNida = user?.nida_number || fd.payer_nida || "—";
  const payerCitizenId = user?.citizen_id || fd.payer_citizen_id || "—";
  const payerPhone = user?.phone || fd.payer_phone_snapshot || fd.payer_phone || "—";

  const amount = Number(pd.amount || fd.service_fee || application.services?.fee || 0);
  const method = String(pd.payment_method || "mpesa");
  const methodLabel = (PAYMENT_METHODS[method.toLowerCase()] || { sw: method, en: method })[lang];
  const txnId = String(pd.transaction_id || application.application_number || "—");
  const paidAt = String(
    pd.paid_at || application.paid_at || application.approved_at || application.created_at || "",
  );

  const L = {
    title: sw ? "RISITI YA MALIPO" : "PAYMENT RECEIPT",
    paymentInfo: sw ? "TAARIFA ZA MALIPO" : "PAYMENT DETAILS",
    applicantInfo: sw ? "TAARIFA ZA MLIPAJI" : "PAYER DETAILS",
    scanVerify: sw ? "Changanua kuthibitisha" : "Scan to verify",
    footer: sw
      ? "Risiti hii ni hati rasmi ya malipo ya serikali. Hushindwi kubadilishwa."
      : "This is an official government payment receipt. Non-transferable.",
  };

  const TRow = ({ label, value, alt }: { label: string; value: string; alt?: boolean }) => (
    <View style={[ls.tableRow, alt ? ls.tableAlt : {}]}>
      <Text style={ls.tableLabel}>{label}</Text>
      <Text style={ls.tableValue}>{value}</Text>
    </View>
  );

  return (
    <Document>
      <Page size="A4" style={s.page}>
        <Text style={s.watermark}>E-MTAA</Text>

        {/* Header */}
        <View style={[s.header, { paddingLeft: 0 }]}>
          <Image src={TANZANIA_LOGO_BASE64} style={s.logo} />
          <Text style={s.country}>JAMHURI YA MUUNGANO WA TANZANIA</Text>
          <Text style={s.office}>OFISI YA RAIS — TAMISEMI</Text>
          <View style={s.divider} />
        </View>

        {/* Title */}
        <View style={s.titleBlock}>
          <Text style={s.title}>{L.title}</Text>
          <View style={s.appNumberBadge}>
            <Text style={s.appNumberText}>{application.application_number}</Text>
          </View>
        </View>

        {/* Paid banner */}
        <View style={ls.paidBanner}>
          <Text style={ls.paidText}>{sw ? "IMELIPWA" : "PAID"}</Text>
          <Text style={ls.receiptNo}>{txnId}</Text>
        </View>

        {/* Amount card */}
        <View style={ls.amountCard}>
          <Text style={ls.amtLabel}>{sw ? "KIASI KILICHOLIPWA" : "AMOUNT PAID"}</Text>
          <Text style={ls.amtValue}>{formatCurrency(amount)}</Text>
        </View>

        {/* Payment details table */}
        <View style={s.sectionHeader}>
          <Text style={s.sectionTitle}>{L.paymentInfo}</Text>
        </View>
        <TRow label={sw ? "Namba ya Muamala" : "Transaction ID"} value={txnId} />
        <TRow label={sw ? "Njia ya Malipo" : "Payment Method"} value={methodLabel} alt />
        <TRow label={sw ? "Tarehe ya Malipo" : "Payment Date"} value={formatDate(paidAt)} />
        <TRow label={sw ? "Huduma" : "Service"} value={application.service_name || "—"} alt />
        <TRow
          label={sw ? "Namba ya Maombi" : "Application No."}
          value={application.application_number || "—"}
        />

        {/* Fee distribution breakdown */}
        <View style={s.sectionHeader}>
          <Text style={s.sectionTitle}>{sw ? "MGAWANYO WA ADA" : "FEE DISTRIBUTION"}</Text>
        </View>
        {distributeFee(amount).map((share, i) => (
          <View key={share.key} style={[ls.distRow, i % 2 === 1 ? ls.distAlt : {}]}>
            <Text style={ls.distLabel}>{sw ? share.label.sw : share.label.en}</Text>
            <Text style={ls.distPct}>{share.percent}%</Text>
            <Text style={ls.distAmt}>{formatCurrency(share.amount)}</Text>
          </View>
        ))}
        <View style={ls.distTotalRow}>
          <Text style={ls.distTotalLabel}>{sw ? "JUMLA" : "TOTAL"}</Text>
          <Text style={ls.distTotalPct}>100%</Text>
          <Text style={ls.distTotalAmt}>{formatCurrency(amount)}</Text>
        </View>

        {/* Payer details */}
        <View style={s.sectionHeader}>
          <Text style={s.sectionTitle}>{L.applicantInfo}</Text>
        </View>
        <TRow label={sw ? "Jina" : "Name"} value={payerName} />
        <TRow label="NIDA" value={payerNida} alt />
        <TRow label={sw ? "Namba ya Raia" : "Citizen ID"} value={payerCitizenId} />
        <TRow label={sw ? "Simu" : "Phone"} value={payerPhone} alt />

        {/* QR */}
        {/* Official Stamp */}
        <View style={{ alignItems: "center", marginVertical: 8 }}>
          <GovernmentStamp
            date={application.approved_at || application.issued_at}
            reference={application.application_number}
            lang={lang}
          />
        </View>

        <View style={s.qrSection}>
          <View style={s.qrInner}>
            <View style={s.qrBorder}>
              <Image src={qr} style={s.qrCode} />
            </View>
            <Text style={s.qrLabel}>{L.scanVerify}</Text>
            <Text style={s.qrRef}>{txnId}</Text>
          </View>
        </View>

        {/* Footer */}
        <View style={s.footer}>
          <Text style={s.disclaimer}>
            {lang === "sw"
              ? "MAONYESHO PEKEE — Si mfumo rasmi wa serikali, haujaidhinishwa kwa matumizi rasmi"
              : "DEMONSTRATION ONLY — Not an official, approved government system"}
          </Text>
          <Text style={s.footerText}>{L.footer}</Text>
          <Text style={s.metadata}>{formatDate(paidAt)}</Text>
        </View>
      </Page>
    </Document>
  );
};

export default RisitiMalipoPDF;
