/**
 * ChetiMwanafunziPDF — Student ID Card (both sides)
 * Front: Photo, Name, ID, School, Class
 * Back: Parent, NIDA, QR, Barcode
 */
import React from "react";
import { Page, Text, View, Image, StyleSheet, Document } from "@react-pdf/renderer";
import { TANZANIA_LOGO_BASE64 } from "@/constants/logo";
import { Application } from "@/lib/supabase";
import { formatDate } from "./types";
import { ReceiptPage } from "./ReceiptPage";

interface Props { application: Application; lang?: "sw" | "en"; qrDataUrl?: string; }

const ID_W = 243; // 85.6mm × 2.835px/mm ≈ 243px (credit card width A7)
const ID_H = 153; // 54mm height

const s = StyleSheet.create({
  // Document page
  page: { backgroundColor: "#f8fafc", padding: 30, fontFamily: "Helvetica", alignItems: "center" },
  card: { width: ID_W, height: ID_H, borderRadius: 8, overflow: "hidden", marginBottom: 12, shadowColor: "#000", shadowOpacity: 0.15, shadowRadius: 4 },

  // FRONT CARD
  front: { width: ID_W, height: ID_H, backgroundColor: "#065f46", flexDirection: "column" },
  frontTop: { backgroundColor: "#064e3b", paddingHorizontal: 10, paddingVertical: 6, flexDirection: "row", alignItems: "center", gap: 6 },
  govLogo: { width: 18, height: 18 },
  govText: { flex: 1 },
  govCountry: { fontSize: 5.5, color: "#6ee7b7", fontWeight: "bold", letterSpacing: 0.3 },
  govOffice: { fontSize: 4.5, color: "#a7f3d0" },
  cardTitle: { fontSize: 7, color: "#ffffff", fontWeight: "bold", letterSpacing: 1 },

  frontBody: { flex: 1, flexDirection: "row", padding: 8, gap: 8 },
  photoBox: { width: 52, height: 68, borderRadius: 4, backgroundColor: "#ffffff20", borderWidth: 1.5, borderColor: "#ffffff30", overflow: "hidden", alignItems: "center", justifyContent: "center" },
  photoImg: { width: 52, height: 68, objectFit: "cover" },
  photoPlaceholder: { fontSize: 6, color: "#ffffff50", textAlign: "center" },

  infoBox: { flex: 1 },
  studentName: { fontSize: 9, fontWeight: "bold", color: "#ffffff", marginBottom: 2, lineHeight: 1.2 },
  infoRow: { flexDirection: "row", marginBottom: 2 },
  infoLabel: { fontSize: 5.5, color: "#6ee7b7", width: 40 },
  infoValue: { fontSize: 6, color: "#ffffff", flex: 1, fontWeight: "bold" },

  frontBottom: { backgroundColor: "#064e3b", paddingHorizontal: 10, paddingVertical: 5, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  idNumberLabel: { fontSize: 5, color: "#6ee7b7", letterSpacing: 0.5 },
  idNumber: { fontSize: 8, color: "#ffffff", fontWeight: "bold", fontFamily: "Courier", letterSpacing: 0.5 },
  validText: { fontSize: 5, color: "#a7f3d0" },

  // BACK CARD
  back: { width: ID_W, height: ID_H, backgroundColor: "#ffffff", borderWidth: 1, borderColor: "#d1d5db" },
  backTop: { backgroundColor: "#065f46", height: 18, alignItems: "center", justifyContent: "center" },
  backTitle: { fontSize: 6, color: "#ffffff", fontWeight: "bold", letterSpacing: 1 },
  backBody: { flex: 1, flexDirection: "row", padding: 8, gap: 8 },
  backLeft: { flex: 1 },
  backRow: { marginBottom: 3 },
  backLabel: { fontSize: 5, color: "#6b7280", fontWeight: "bold", letterSpacing: 0.3, textTransform: "uppercase" },
  backValue: { fontSize: 6.5, color: "#111827", fontWeight: "bold" },
  qrBox: { width: 52, alignItems: "center", justifyContent: "center" },
  qrImg: { width: 48, height: 48 },
  qrLabel: { fontSize: 5, color: "#6b7280", textAlign: "center", marginTop: 2 },

  backBottom: { backgroundColor: "#f9fafb", borderTopWidth: 0.5, borderTopColor: "#e5e7eb", paddingHorizontal: 8, paddingVertical: 4, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  disclaimer: { fontSize: 4.5, color: "#9ca3af", flex: 1 },
  tzFlag: { fontSize: 5, color: "#065f46", fontWeight: "bold" },

  // Section divider
  sectionLabel: { fontSize: 7, fontWeight: "bold", color: "#374151", letterSpacing: 1, marginTop: 16, marginBottom: 6, alignSelf: "flex-start" },
  divider: { width: "100%", height: 0.5, backgroundColor: "#e5e7eb", marginBottom: 6 },
});

const EDUCATION_SHORT: Record<string, string> = {
  CHEKECHEA: "Pre-Primary", MSINGI: "Primary", SEKONDARI_O: "O-Level",
  SEKONDARI_A: "A-Level", STASHAHADA: "Diploma", SHAHADA: "Degree", UZAMILI: "Masters/PhD",
};

export const ChetiMwanafunziPDF: React.FC<Props> = ({ application, lang = "sw", qrDataUrl }) => {
  const fd = (application.form_data || {}) as Record<string, unknown>;
  const sw = lang === "sw";

  const studentName = fd.student_name as string || `${fd.student_first || ""} ${fd.student_last || ""}`.trim();
  const studentId = fd.generated_student_id as string || application.application_number;
  const photo = fd.student_photo as string || null;
  const schoolName = fd.school_name as string || "";
  const educLevel = EDUCATION_SHORT[fd.education_level as string] || fd.education_level as string || "";
  const classYear = fd.class_year === "OTHER" ? fd.class_year_manual as string : fd.class_year as string || "";
  const region = fd.student_region as string || application.region || "";
  const district = fd.student_district as string || application.district || "";
  const ward = fd.student_ward as string || application.ward || "";
  const nida = fd.student_nida as string || "";
  const parentName = fd.parent_name as string || "";
  const parentPhone = fd.parent_phone as string || "";
  const issueDate = formatDate(application.created_at);
  const purpose = fd.purpose as string || "";

  return (
    <Document>
      <Page size="A4" style={s.page}>

        {/* ═══ FRONT OF ID CARD ═══ */}
        <Text style={s.sectionLabel}>{sw ? "MBELE YA KITAMBULISHO" : "FRONT OF ID CARD"}</Text>
        <View style={s.divider}/>
        <View style={s.card}>
          <View style={s.front}>
            {/* Header */}
            <View style={s.frontTop}>
              {TANZANIA_LOGO_BASE64 && <Image src={TANZANIA_LOGO_BASE64} style={s.govLogo}/>}
              <View style={s.govText}>
                <Text style={s.govCountry}>JAMHURI YA MUUNGANO WA TANZANIA</Text>
                <Text style={s.govOffice}>OFISI YA RAIS — TAMISEMI</Text>
              </View>
              <Text style={s.cardTitle}>KITAMBULISHO CHA MWANAFUNZI</Text>
            </View>

            {/* Body: photo + info */}
            <View style={s.frontBody}>
              <View style={s.photoBox}>
                {photo
                  ? <Image src={photo} style={s.photoImg}/>
                  : <Text style={s.photoPlaceholder}>{"PICHA\nPHOTO"}</Text>}
              </View>
              <View style={s.infoBox}>
                <Text style={s.studentName}>{studentName}</Text>
                <View style={s.infoRow}><Text style={s.infoLabel}>{sw ? "Shule" : "School"}:</Text><Text style={s.infoValue} numberOfLines={2}>{schoolName}</Text></View>
                <View style={s.infoRow}><Text style={s.infoLabel}>{sw ? "Ngazi" : "Level"}:</Text><Text style={s.infoValue}>{educLevel}</Text></View>
                <View style={s.infoRow}><Text style={s.infoLabel}>{sw ? "Darasa" : "Class"}:</Text><Text style={s.infoValue}>{classYear}</Text></View>
                <View style={s.infoRow}><Text style={s.infoLabel}>{sw ? "Mkoa" : "Region"}:</Text><Text style={s.infoValue}>{region}</Text></View>
                <View style={s.infoRow}><Text style={s.infoLabel}>{sw ? "Imetolewa" : "Issued"}:</Text><Text style={s.infoValue}>{issueDate}</Text></View>
              </View>
            </View>

            {/* Footer: ID number */}
            <View style={s.frontBottom}>
              <View>
                <Text style={s.idNumberLabel}>{sw ? "NAMBA YA MWANAFUNZI (MAISHA YOTE)" : "LIFETIME STUDENT ID NUMBER"}</Text>
                <Text style={s.idNumber}>{studentId}</Text>
              </View>
              <Text style={s.validText}>{sw ? "Namba hii ni ya kudumu" : "Permanent ID"}</Text>
            </View>
          </View>
        </View>

        {/* ═══ BACK OF ID CARD ═══ */}
        <Text style={[s.sectionLabel, { marginTop: 20 }]}>{sw ? "NYUMA YA KITAMBULISHO" : "BACK OF ID CARD"}</Text>
        <View style={s.divider}/>
        <View style={s.card}>
          <View style={s.back}>
            <View style={s.backTop}>
              <Text style={s.backTitle}>TAARIFA ZA ZIADA / ADDITIONAL INFORMATION</Text>
            </View>
            <View style={s.backBody}>
              <View style={s.backLeft}>
                <View style={s.backRow}><Text style={s.backLabel}>{sw ? "Jina Kamili" : "Full Name"}</Text><Text style={s.backValue}>{studentName}</Text></View>
                <View style={s.backRow}><Text style={s.backLabel}>NIDA</Text><Text style={s.backValue}>{nida || "—"}</Text></View>
                <View style={s.backRow}><Text style={s.backLabel}>{sw ? "Wilaya / Kata" : "District / Ward"}</Text><Text style={s.backValue}>{district}{ward ? ` / ${ward}` : ""}</Text></View>
                <View style={s.backRow}><Text style={s.backLabel}>{sw ? "Mzazi / Mlezi" : "Parent / Guardian"}</Text><Text style={s.backValue}>{parentName || "—"}</Text></View>
                <View style={s.backRow}><Text style={s.backLabel}>{sw ? "Simu ya Mzazi" : "Parent Phone"}</Text><Text style={s.backValue}>{parentPhone || "—"}</Text></View>
                <View style={s.backRow}><Text style={s.backLabel}>{sw ? "Sababu ya Cheti" : "Purpose"}</Text><Text style={s.backValue}>{purpose}</Text></View>
              </View>
              <View style={s.qrBox}>
                {qrDataUrl ? <Image src={qrDataUrl} style={s.qrImg}/> : <View style={[s.qrImg, { backgroundColor: "#f3f4f6", alignItems: "center", justifyContent: "center" }]}><Text style={{ fontSize: 5, color: "#9ca3af" }}>QR Code</Text></View>}
                <Text style={s.qrLabel}>{sw ? "Thibitisha hapa" : "Verify here"}</Text>
              </View>
            </View>
            <View style={s.backBottom}>
              <Text style={s.disclaimer}>{sw ? "Kitambulisho hiki ni rasmi. Kwa uthibitisho, scan QR code au wasiliana na ofisi ya mtaa." : "This ID is official. To verify, scan QR code or contact the ward office."}</Text>
              <Text style={s.tzFlag}>🇹🇿 TZ</Text>
            </View>
          </View>
        </View>

      </Page>
      <ReceiptPage application={application} lang={lang} qrDataUrl={qrDataUrl}/>
    </Document>
  );
};
export default ChetiMwanafunziPDF;
