/**
 * ReceiptPage — Shared payment receipt page for all PDF documents.
 * Add as page 2 of any certificate/permit document.
 */
import React from "react";
import { Page, Text, View, Image, StyleSheet } from "@react-pdf/renderer";
import { Application } from "@/lib/supabase";
import { formatDate, formatCurrency, generateQRCodeUrl } from "./types";
import { TANZANIA_LOGO_BASE64 } from "@/constants/logo";
import { distributeFee } from "@/lib/feeDistribution";
import { getApplicationAmount } from "@/lib/serviceFees";

const rs = StyleSheet.create({
  page: {
    paddingTop: 30,
    paddingBottom: 40,
    paddingHorizontal: 40,
    fontFamily: "Helvetica",
    fontSize: 10,
    color: "#111111",
    backgroundColor: "#ffffff",
  },
  header: { alignItems: "center", marginBottom: 10 },
  logo: { width: 40, height: 40, marginBottom: 4, backgroundColor: "#ffffff" },
  country: { fontSize: 9, fontWeight: "bold", textAlign: "center", marginBottom: 1 },
  office: { fontSize: 7.5, color: "#3a3a3a", textAlign: "center", marginBottom: 4 },
  divider: { width: 40, height: 1, backgroundColor: "#111", marginBottom: 10 },

  titleBlock: { alignItems: "center", marginBottom: 12 },
  title: { fontSize: 14, fontWeight: "bold", letterSpacing: 2, textTransform: "uppercase" },
  subtitle: { fontSize: 8, color: "#6b6b6b", marginTop: 2 },

  receiptNo: {
    textAlign: "center",
    fontSize: 9,
    fontFamily: "Courier",
    fontWeight: "bold",
    color: "#3a3a3a",
    marginBottom: 12,
    letterSpacing: 1,
  },

  statusBadge: {
    alignSelf: "center",
    paddingVertical: 4,
    paddingHorizontal: 20,
    borderWidth: 1.5,
    borderColor: "#1a5632",
    marginBottom: 14,
  },
  statusText: { fontSize: 11, fontWeight: "bold", color: "#1a5632", letterSpacing: 2 },

  amountBlock: {
    alignItems: "center",
    paddingVertical: 10,
    borderTopWidth: 0.5,
    borderBottomWidth: 0.5,
    borderColor: "#c0c0c0",
    marginBottom: 14,
  },
  amountLabel: {
    fontSize: 7,
    color: "#6b6b6b",
    marginBottom: 2,
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  amountValue: { fontSize: 22, fontWeight: "bold", color: "#111" },
  amountWords: { fontSize: 7.5, color: "#6b6b6b", fontStyle: "italic", marginTop: 3 },

  table: { marginBottom: 14 },
  tableRow: {
    flexDirection: "row",
    borderBottomWidth: 0.3,
    borderBottomColor: "#e8e8e8",
    paddingVertical: 5,
    paddingHorizontal: 6,
  },
  tableRowAlt: { backgroundColor: "#f7f7f7" },
  tableLabel: { width: "40%", fontSize: 8.5, color: "#6b6b6b" },
  tableValue: { width: "60%", fontSize: 9, color: "#111", fontWeight: "bold" },

  qrSection: { flexDirection: "row", justifyContent: "flex-end", marginTop: 8 },
  qrInner: { alignItems: "center", width: 72 },
  qrBorder: { borderWidth: 0.5, borderColor: "#c0c0c0", padding: 2, marginBottom: 2 },
  qrCode: { width: 56, height: 56 },
  qrLabel: { fontSize: 5, color: "#6b6b6b", textAlign: "center" },

  // Fee distribution
  distHeader: {
    flexDirection: "row",
    backgroundColor: "#f3f4f6",
    paddingVertical: 4,
    paddingHorizontal: 6,
    borderBottomWidth: 0.5,
    borderBottomColor: "#d1d5db",
    marginTop: 12,
    marginBottom: 0,
  },
  distHeaderText: { fontSize: 8, fontWeight: "bold", color: "#374151", textTransform: "uppercase", letterSpacing: 0.5 },
  distSectionTitle: { fontSize: 8.5, fontWeight: "bold", color: "#1c1917", marginBottom: 2 },
  distRow: {
    flexDirection: "row",
    paddingVertical: 4,
    paddingHorizontal: 6,
    borderBottomWidth: 0.3,
    borderBottomColor: "#e5e7eb",
  },
  distAlt: { backgroundColor: "#f9fafb" },
  distLabel: { flex: 1, fontSize: 8, color: "#374151" },
  distPct: { width: 36, fontSize: 8, color: "#6b7280", textAlign: "right" },
  distAmt: { width: 72, fontSize: 8, fontWeight: "bold", color: "#1c1917", textAlign: "right" },
  distTotal: {
    flexDirection: "row",
    paddingVertical: 5,
    paddingHorizontal: 6,
    backgroundColor: "#1a5632",
  },
  distTotalLabel: { flex: 1, fontSize: 8.5, fontWeight: "bold", color: "#ffffff" },
  distTotalPct: { width: 36, fontSize: 8.5, color: "#d1fae5", textAlign: "right" },
  distTotalAmt: { width: 72, fontSize: 8.5, fontWeight: "bold", color: "#ffffff", textAlign: "right" },

  footer: {
    position: "absolute",
    bottom: 20,
    left: 40,
    right: 40,
    borderTopWidth: 0.5,
    borderTopColor: "#c0c0c0",
    paddingTop: 4,
  },
  footerText: { fontSize: 6.5, color: "#6b6b6b", fontStyle: "italic", textAlign: "center" },
});

interface ReceiptPageProps {
  application: Application;
  lang: "sw" | "en";
  qrDataUrl?: string;
}

export const ReceiptPage: React.FC<ReceiptPageProps> = ({ application, lang, qrDataUrl }) => {
  const fd = (application.form_data || {}) as {
    service_fee?: number;
    amount?: number;
    applicant_name?: string;
  };
  const pd = (application.payment_data || {}) as {
    amount?: number;
    receipt_number?: string;
    payment_method?: string;
    transaction_id?: string;
    paid_at?: string;
  };
  const sw = lang === "sw";
  const qr = qrDataUrl || generateQRCodeUrl(application, "RCP");

  const amount = pd.amount || fd.service_fee || fd.amount || getApplicationAmount(application);
  const receiptNo = pd.receipt_number || `RCP-${application.application_number}`;

  const TableRow = ({ label, value, alt }: { label: string; value: string; alt?: boolean }) => (
    <View style={[rs.tableRow, alt ? rs.tableRowAlt : {}]}>
      <Text style={rs.tableLabel}>{label}</Text>
      <Text style={rs.tableValue}>{value}</Text>
    </View>
  );

  const user = application.users;
  const payerName =
    fd.applicant_name || (user ? `${user.first_name || ""} ${user.last_name || ""}`.trim() : "N/A");

  return (
    <Page size="A4" style={rs.page}>
      {/* Header */}
      <View style={rs.header}>
        <Image src={TANZANIA_LOGO_BASE64} style={rs.logo} />
        <Text style={rs.country}>JAMHURI YA MUUNGANO WA TANZANIA</Text>
        <Text style={rs.office}>
          OFISI YA RAIS — TAWALA ZA MIKOA NA SERIKALI ZA MITAA (TAMISEMI)
        </Text>
        <View style={rs.divider} />
      </View>

      {/* Title */}
      <View style={rs.titleBlock}>
        <Text style={rs.title}>{sw ? "RISITI YA MALIPO" : "PAYMENT RECEIPT"}</Text>
        <Text style={rs.subtitle}>
          {sw ? "Stakabadhi Rasmi ya Serikali" : "Official Government Receipt"}
        </Text>
      </View>

      <Text style={rs.receiptNo}>{receiptNo}</Text>

      {/* Status */}
      <View style={rs.statusBadge}>
        <Text style={rs.statusText}>{sw ? "IMELIPWA" : "PAID"}</Text>
      </View>

      {/* Amount */}
      <View style={rs.amountBlock}>
        <Text style={rs.amountLabel}>{sw ? "Kiasi Kilicholipwa" : "Amount Paid"}</Text>
        <Text style={rs.amountValue}>TSh {Number(amount).toLocaleString("en-US")}</Text>
      </View>

      {/* Details table */}
      <View style={rs.table}>
        <TableRow label={sw ? "Nambari ya Risiti" : "Receipt Number"} value={receiptNo} />
        <TableRow
          label={sw ? "Nambari ya Maombi" : "Application Ref"}
          value={application.application_number || "—"}
          alt
        />
        <TableRow label={sw ? "Huduma" : "Service"} value={application.service_name || "—"} />
        <TableRow label={sw ? "Mlipaji" : "Payer"} value={payerName} alt />
        <TableRow
          label={sw ? "Njia ya Malipo" : "Payment Method"}
          value={pd.payment_method || "E-Mtaa Portal"}
        />
        {pd.transaction_id && (
          <TableRow
            label={sw ? "Nambari ya Muamala" : "Transaction ID"}
            value={pd.transaction_id}
            alt
          />
        )}
        <TableRow
          label={sw ? "Tarehe ya Malipo" : "Payment Date"}
          value={formatDate(pd.paid_at || application.updated_at || application.created_at)}
          alt={!pd.transaction_id}
        />
        <TableRow label={sw ? "Sarafu" : "Currency"} value="TZS (Shilingi ya Tanzania)" alt />
        <TableRow label={sw ? "Hali" : "Status"} value={sw ? "Imelipwa" : "Completed"} />
      </View>

      {/* Fee distribution breakdown */}
      {amount > 0 && (
        <View style={{ marginBottom: 10 }}>
          <View style={rs.distHeader}>
            <Text style={rs.distHeaderText}>{sw ? "MGAWANYO WA ADA" : "FEE DISTRIBUTION"}</Text>
          </View>
          {distributeFee(amount).map((share, i) => (
            <View key={share.key} style={[rs.distRow, i % 2 === 1 ? rs.distAlt : {}]}>
              <Text style={rs.distLabel}>{sw ? share.label.sw : share.label.en}</Text>
              <Text style={rs.distPct}>{share.percent}%</Text>
              <Text style={rs.distAmt}>{formatCurrency(share.amount)}</Text>
            </View>
          ))}
          <View style={rs.distTotal}>
            <Text style={rs.distTotalLabel}>{sw ? "JUMLA" : "TOTAL"}</Text>
            <Text style={rs.distTotalPct}>100%</Text>
            <Text style={rs.distTotalAmt}>{formatCurrency(amount)}</Text>
          </View>
        </View>
      )}
      {amount === 0 && (
        <View style={{ paddingHorizontal: 6, paddingVertical: 8, backgroundColor: "#f3f4f6", marginBottom: 10 }}>
          <Text style={{ fontSize: 8, color: "#6b7280", fontStyle: "italic", textAlign: "center" }}>
            {sw ? "Huduma hii haina ada (bure)." : "This service has no fee (free of charge)."}
          </Text>
        </View>
      )}

      {/* QR */}
      <View style={rs.qrSection}>
        <View style={rs.qrInner}>
          <View style={rs.qrBorder}>
            <Image src={qr} style={rs.qrCode} />
          </View>
          <Text style={rs.qrLabel}>{sw ? "Changanua kuthibitisha" : "Scan to verify"}</Text>
        </View>
      </View>

      {/* Footer */}
      <View style={rs.footer}>
        <Text style={rs.footerText}>
          {sw
            ? "Risiti hii ni stakabadhi rasmi ya serikali. Thibitisha kupitia QR code au tovuti ya E-Mtaa."
            : "This receipt is an official government document. Verify via QR code or E-Mtaa portal."}
        </Text>
        <Text style={[rs.footerText, { marginTop: 2, fontWeight: "bold" }]}>
          {sw
            ? "MAONYESHO PEKEE — Si mfumo rasmi wa serikali, haujaidhinishwa."
            : "DEMONSTRATION ONLY — Not an official, approved government system."}
        </Text>
      </View>
    </Page>
  );
};
