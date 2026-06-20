/**
 * OmbiArdhiKijijiPDF — Ombi la Ardhi ya Kijiji / Village Land Request
 */
import React from "react";
import { Page, Text, View, Image, StyleSheet, Document } from "@react-pdf/renderer";
import { TANZANIA_LOGO_BASE64 } from "@/constants/logo";
import { Application } from "@/lib/supabase";
import { formatDate, generateQRCodeUrl } from "./types";
import { ReceiptPage } from "./ReceiptPage";

interface Props { application: Application; lang?: string; qrDataUrl?: string | null; }

const s = StyleSheet.create({
  page: { backgroundColor: "#ffffff", padding: 32, fontFamily: "Helvetica" },
  header: { alignItems: "center", marginBottom: 16, borderBottomWidth: 1, borderBottomColor: "#d1d5db", paddingBottom: 12 },
  logo: { width: 52, height: 52, marginBottom: 6 },
  country: { fontSize: 9, fontWeight: "bold", textAlign: "center", letterSpacing: 1 },
  office: { fontSize: 7.5, color: "#6b7280", textAlign: "center" },
  divider: { height: 1, backgroundColor: "#10b981", marginVertical: 10 },
  docTitle: { fontSize: 13, fontWeight: "bold", textAlign: "center", letterSpacing: 2, color: "#111827", marginBottom: 4 },
  refBox: { alignSelf: "center", borderWidth: 1, borderColor: "#d1d5db", paddingHorizontal: 12, paddingVertical: 3, borderRadius: 3, marginBottom: 12 },
  refText: { fontSize: 8, letterSpacing: 1, color: "#374151" },
  field: { flexDirection: "row", paddingVertical: 5, borderBottomWidth: 0.5, borderBottomColor: "#e5e7eb" },
  fieldLabel: { width: "40%", fontSize: 7.5, color: "#6b7280", fontWeight: "bold" },
  fieldValue: { width: "60%", fontSize: 8, color: "#111827", fontWeight: "bold" },
  sectionTitle: { fontSize: 8, fontWeight: "bold", letterSpacing: 1, color: "#374151", backgroundColor: "#f9fafb", padding: 6, marginTop: 10, marginBottom: 4 },
  infoBox: { borderWidth: 1, borderColor: "#d1d5db", borderRadius: 3, padding: 10, marginVertical: 8 },
  stamp: { marginTop: 20, borderTopWidth: 1, borderTopColor: "#d1d5db", paddingTop: 12, alignItems: "flex-end" },
  stampLabel: { fontSize: 7, color: "#6b7280" },
  stampName: { fontSize: 9, fontWeight: "bold", color: "#111827" },
  qr: { width: 60, height: 60 },
  validity: { fontSize: 7, color: "#6b7280", textAlign: "center", marginTop: 8 },
  feeBox: { backgroundColor: "#f0fdf4", borderWidth: 1, borderColor: "#bbf7d0", padding: 8, marginTop: 8, alignItems: "center" },
  feeText: { fontSize: 11, fontWeight: "bold", color: "#166534" },
});

export const OmbiArdhiKijijiPDF: React.FC<Props> = ({ application, lang = "sw", qrDataUrl }) => {
  const fd = (application.form_data || {}) as Record<string, unknown>;
  const sw = lang === "sw";
  const isApproved = ["approved","issued","paid"].includes(application.status);

  return (
    <Document>
      <Page size="A4" style={s.page}>
        <View style={s.header}>
          {TANZANIA_LOGO_BASE64 && <Image src={TANZANIA_LOGO_BASE64} style={s.logo} />}
          <Text style={s.country}>JAMHURI YA MUUNGANO WA TANZANIA</Text>
          <Text style={s.office}>OFISI YA RAIS — TAMISEMI</Text>
        </View>
        <View style={s.divider} />
        <Text style={s.docTitle}>ARDHI YA KIJIJI</Text>
        <View style={s.refBox}><Text style={s.refText}>{application.application_number}</Text></View>

        <Text style={s.sectionTitle}>{sw ? "TAARIFA ZA MWOMBAJI" : "APPLICANT INFORMATION"}</Text>
        <View style={s.infoBox}>
          <View style={s.field}><Text style={s.fieldLabel}>{"Mwombaji / Applicant"}</Text><Text style={s.fieldValue}>{String(fd.applicant_name || "")}</Text></View>
          <View style={s.field}><Text style={s.fieldLabel}>{"NIDA"}</Text><Text style={s.fieldValue}>{String(fd.applicant_nida || "")}</Text></View>
          <View style={s.field}><Text style={s.fieldLabel}>{"Simu / Phone"}</Text><Text style={s.fieldValue}>{String(fd.applicant_phone || "")}</Text></View>
          <View style={s.field}><Text style={s.fieldLabel}>{"Kata / Ward"}</Text><Text style={s.fieldValue}>{String(fd.ward || "")}</Text></View>
          <View style={s.field}><Text style={s.fieldLabel}>{"Maelezo / Details"}</Text><Text style={s.fieldValue}>{String(fd.details || "")}</Text></View>
          <View style={s.field}><Text style={s.fieldLabel}>{sw ? "Tarehe ya Ombi" : "Application Date"}</Text><Text style={s.fieldValue}>{formatDate(application.created_at)}</Text></View>
          <View style={s.field}><Text style={s.fieldLabel}>{sw ? "Hali" : "Status"}</Text><Text style={s.fieldValue}>{isApproved ? (sw ? "IMEIDHINISHWA" : "APPROVED") : (sw ? "INASUBIRI" : "PENDING")}</Text></View>
          <View style={s.feeBox}><Text style={s.feeText}>{sw ? "Ada: TSh 5,000" : "Fee: TSh 5,000"}</Text></View>
        </View>

        <View style={s.stamp}>
          <Text style={s.stampLabel}>{sw ? "Sahibu na:" : "Authorized by:"}</Text>
          <Text style={s.stampName}>{application.ward || "Ofisi ya Mtaa"}</Text>
          {qrDataUrl && <Image src={qrDataUrl} style={s.qr} />}
        </View>
        <Text style={s.validity}>{sw ? "Hati hii ni rasmi. Thibitisha kwa QR code." : "This document is official. Verify via QR code."}</Text>
      </Page>
      <ReceiptPage application={application} lang={lang} qrDataUrl={qrDataUrl} />
    </Document>
  );
};
export default OmbiArdhiKijijiPDF;
