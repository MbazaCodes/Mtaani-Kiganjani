/* eslint-disable @typescript-eslint/no-explicit-any */
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
import { TANZANIA_LOGO_BASE64 } from "@/constants/logo";

const ls = StyleSheet.create({
  paidBanner: {
    backgroundColor: "#059669",
    padding: 12,
    alignItems: "center",
    marginBottom: 14,
    borderRadius: 2,
  },
  paidText: { color: "#ffffff", fontSize: 20, fontWeight: "bold", letterSpacing: 3 },
  receiptNo: { color: "#d1fae5", fontSize: 8, marginTop: 4, fontFamily: "Courier" },
  amountCard: {
    backgroundColor: "#f0fdf4",
    borderWidth: 2,
    borderColor: "#059669",
    padding: 14,
    alignItems: "center",
    marginVertical: 12,
    borderRadius: 2,
  },
  amtLabel: { fontSize: 8, color: "#065f46", marginBottom: 4 },
  amtValue: { fontSize: 28, fontWeight: "bold", color: "#059669", marginBottom: 3 },
  amtWords: { fontSize: 8, color: "#065f46", fontStyle: "italic" },
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
  const user = (application as any).users;
  const fd = (application.form_data || {}) as Record<string, string | undefined>;
  const pd = (fd.payment_data || application.payment_data || {}) as Record<string, string | undefined>;
  const qr = qrDataUrl || generateQRCodeUrl(application, "RCP");
  const sw = lang === "sw";

  const amount = Number(pd.amount || fd.service_fee || (application as any).services?.fee || 0);
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

        {/* Payer details */}
        <View style={s.sectionHeader}>
          <Text style={s.sectionTitle}>{L.applicantInfo}</Text>
        </View>
        <TRow label={sw ? "Jina" : "Name"} value={formatFullName(user)} />
        <TRow label="NIDA" value={user?.nida_number || "—"} alt />
        <TRow label={sw ? "Namba ya Raia" : "Citizen ID"} value={user?.citizen_id || "—"} />
        <TRow label={sw ? "Simu" : "Phone"} value={user?.phone || "—"} alt />

        {/* QR */}
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
          <Text style={s.footerText}>{L.footer}</Text>
          <Text style={s.metadata}>{formatDate(paidAt)}</Text>
        </View>
      </Page>
    </Document>
  );
};

export default RisitiMalipoPDF;
