/**
 * ChetiMwanafunziPDF — TSID Student ID Card
 * Matches the official TSID design:
 * Front: Photo, TSID#, Name, DOB, Gender, Nationality, School, QR, Region, District
 * Back: TSID# header, Student Info, Parent/Guardian, Important notes, Verification
 */
import React from "react";
import { Page, Text, View, Image, StyleSheet, Document, Svg, Circle, Rect } from "@react-pdf/renderer";
import { TANZANIA_LOGO_BASE64 } from "@/constants/logo";
import { Application } from "@/lib/supabase";
import { formatDate } from "./types";
import { ReceiptPage } from "./ReceiptPage";

interface Props { application: Application; lang?: "sw" | "en"; qrDataUrl?: string; }

// Card dimensions in points (85.6mm x 53.98mm at 72dpi)
const CW = 242; // card width
const CH = 153; // card height

const DARK_NAVY = "#0a1628";
const MID_NAVY  = "#1a2e4a";
const GREEN     = "#16a34a";
const GOLD      = "#ca8a04";
const LIGHT_BG  = "#f0f4f8";
const BORDER    = "#d1d9e0";
const TEXT_DARK = "#0f172a";
const TEXT_MID  = "#475569";
const TEXT_LIGHT= "#94a3b8";

const s = StyleSheet.create({
  page: { backgroundColor: "#e8edf2", padding: 24, fontFamily: "Helvetica", alignItems: "center" },
  pageTitle: { fontSize: 9, fontWeight: "bold", color: TEXT_MID, letterSpacing: 2, marginBottom: 8, alignSelf: "flex-start", marginLeft: 4 },

  // ── FRONT ──────────────────────────────────────────────────────────────────
  frontCard: { width: CW, height: CH, backgroundColor: "#ffffff", borderRadius: 8, overflow: "hidden", borderWidth: 1, borderColor: BORDER },

  // Top strip
  frontHeader: { backgroundColor: DARK_NAVY, paddingHorizontal: 10, paddingVertical: 5, flexDirection: "row", alignItems: "center", gap: 6 },
  logoImg: { width: 20, height: 20 },
  headerText: { flex: 1 },
  tsidBig: { fontSize: 13, fontWeight: "bold", color: "#ffffff", letterSpacing: 0.5 },
  tsidSub: { fontSize: 5.5, color: "#93c5fd", letterSpacing: 0.8 },
  flagBox: { width: 22, height: 15, borderRadius: 2, overflow: "hidden" },
  flagStripe1: { height: 5, backgroundColor: "#1eb53a" },
  flagStripe2: { height: 5, backgroundColor: "#fcd116" },
  flagStripe3: { height: 5, backgroundColor: "#00a3dd" },

  // Body
  frontBody: { flex: 1, flexDirection: "row" },

  // Left: photo
  photoSide: { width: 76, backgroundColor: "#f1f5f9", padding: 8, justifyContent: "flex-start", alignItems: "center", gap: 6 },
  photoFrame: { width: 58, height: 72, borderRadius: 4, overflow: "hidden", borderWidth: 1.5, borderColor: DARK_NAVY },
  photoImg: { width: 58, height: 72, objectFit: "cover" },
  photoPlaceholder: { width: 58, height: 72, backgroundColor: "#cbd5e1", alignItems: "center", justifyContent: "center" },
  photoPlaceholderText: { fontSize: 5, color: "#94a3b8", textAlign: "center" },

  schoolBlock: { alignItems: "center" },
  schoolIcon: { width: 20, height: 20, backgroundColor: DARK_NAVY, borderRadius: 3, alignItems: "center", justifyContent: "center", marginBottom: 2 },
  schoolIconText: { fontSize: 8, color: "#ffffff" },
  schoolName: { fontSize: 5.5, fontWeight: "bold", color: DARK_NAVY, textAlign: "center", lineHeight: 1.3 },
  regionLine: { fontSize: 4.5, color: TEXT_MID, textAlign: "center" },

  // Right: info
  infoSide: { flex: 1, padding: 8, gap: 0 },
  tsidLabel: { fontSize: 5, color: TEXT_LIGHT, fontWeight: "bold", letterSpacing: 0.8, textTransform: "uppercase", marginBottom: 1 },
  tsidNumber: { fontSize: 9, fontWeight: "bold", color: GREEN, fontFamily: "Courier", letterSpacing: 0.3, marginBottom: 5, borderBottomWidth: 0.5, borderBottomColor: GREEN, paddingBottom: 4 },

  infoGroup: { marginBottom: 4 },
  infoLabel: { fontSize: 4.5, color: TEXT_LIGHT, fontWeight: "bold", letterSpacing: 0.8, textTransform: "uppercase" },
  infoValue: { fontSize: 7, color: TEXT_DARK, fontWeight: "bold", lineHeight: 1.2 },

  // QR
  qrBlock: { alignItems: "center", marginTop: 2 },
  qrImg: { width: 40, height: 40 },
  qrText: { fontSize: 4, color: TEXT_LIGHT, letterSpacing: 0.5, marginTop: 1 },

  // Bottom strip
  frontFooter: { backgroundColor: DARK_NAVY, paddingHorizontal: 10, paddingVertical: 4, flexDirection: "row", justifyContent: "space-around" },
  footerItem: { alignItems: "center", gap: 1 },
  footerIcon: { fontSize: 9, color: "#60a5fa" },
  footerText: { fontSize: 4, color: "#93c5fd", fontWeight: "bold", letterSpacing: 0.5, textAlign: "center" },
  footerBar: { flexDirection: "row", height: 3 },
  footerBar1: { flex: 1, backgroundColor: "#1eb53a" },
  footerBar2: { flex: 1, backgroundColor: "#fcd116" },
  footerBar3: { flex: 1, backgroundColor: "#00a3dd" },

  // ── BACK ───────────────────────────────────────────────────────────────────
  backCard: { width: CW, height: CH, backgroundColor: "#ffffff", borderRadius: 8, overflow: "hidden", borderWidth: 1, borderColor: BORDER },

  backHeader: { backgroundColor: DARK_NAVY, paddingHorizontal: 10, paddingVertical: 6 },
  backTsidNumber: { fontSize: 13, fontWeight: "bold", color: "#ffffff", fontFamily: "Courier", letterSpacing: 0.5 },

  backBody: { flex: 1, flexDirection: "row", padding: 8, gap: 8 },
  backLeft: { flex: 1 },

  sectionTitle: { fontSize: 6, fontWeight: "bold", color: GREEN, letterSpacing: 1, textTransform: "uppercase", marginBottom: 4, borderBottomWidth: 0.5, borderBottomColor: GREEN, paddingBottom: 2 },

  backRow: { flexDirection: "row", marginBottom: 2.5 },
  backLabel: { width: 58, fontSize: 5, color: TEXT_LIGHT, fontWeight: "bold", textTransform: "uppercase", letterSpacing: 0.3 },
  backValue: { flex: 1, fontSize: 5.5, color: TEXT_DARK, fontWeight: "bold" },

  // Important box
  importantBox: { marginTop: 6, borderWidth: 0.5, borderColor: GREEN, borderRadius: 3, padding: 4 },
  importantTitle: { fontSize: 5, fontWeight: "bold", color: GREEN, marginBottom: 3 },
  importantItem: { fontSize: 4.5, color: TEXT_MID, marginBottom: 1.5 },

  // Right side: stamp + QR
  backRight: { width: 58, alignItems: "center", gap: 6 },
  stampCircle: { width: 52, height: 52, borderRadius: 26, borderWidth: 1.5, borderColor: MID_NAVY, alignItems: "center", justifyContent: "center", borderStyle: "dashed" },
  stampInner: { alignItems: "center" },
  stampTsid: { fontSize: 9, fontWeight: "bold", color: MID_NAVY },
  stampLabel: { fontSize: 4, color: MID_NAVY, letterSpacing: 1, textAlign: "center" },
  backQr: { width: 40, height: 40 },

  // Back footer
  backFooter: { backgroundColor: DARK_NAVY, paddingHorizontal: 10, paddingVertical: 5, flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  backFooterLeft: { gap: 1 },
  backFooterText: { fontSize: 4, color: "#93c5fd" },
  backFooterRight: { alignItems: "flex-end" },
  backFooterCountry: { fontSize: 5, color: "#ffffff", fontWeight: "bold" },

  // Separator
  separator: { height: 16 },
});

const EDUCATION_SHORT: Record<string, string> = {
  CHEKECHEA: "PRE-PRIMARY", MSINGI: "PRIMARY SCHOOL", SEKONDARI_O: "SECONDARY (O-LEVEL)",
  SEKONDARI_A: "SECONDARY (A-LEVEL)", STASHAHADA: "DIPLOMA / CERTIFICATE",
  SHAHADA: "UNIVERSITY DEGREE", UZAMILI: "MASTERS / PHD",
};

export const ChetiMwanafunziPDF: React.FC<Props> = ({ application, lang = "sw", qrDataUrl }) => {
  const fd = (application.form_data || {}) as Record<string, string>;
  const sw = lang === "sw";

  const studentName = fd.student_name || `${fd.student_first || ""} ${fd.student_last || ""}`.trim();
  const tsid = fd.generated_student_id || application.application_number;
  const photo = fd.student_photo || null;
  const dob = fd.student_dob ? new Date(fd.student_dob).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }).toUpperCase() : "—";
  const sex = fd.student_sex === "M" ? (sw ? "MWANAUME / MALE" : "MALE") : fd.student_sex === "F" ? (sw ? "MWANAMKE / FEMALE" : "FEMALE") : "—";
  const schoolName = (fd.school_name || "").toUpperCase();
  const region = (fd.student_region || application.region || "").toUpperCase();
  const district = (fd.student_district || application.district || "").toUpperCase();
  const ward = (fd.student_ward || application.ward || "").toUpperCase();
  const educLevel = EDUCATION_SHORT[fd.education_level] || (fd.education_level || "").toUpperCase();
  const classYear = fd.class_year === "OTHER" ? fd.class_year_manual : (fd.class_year || "");
  const bloodGroup = fd.blood_group || "—";
  const nationality = (fd.nationality || "TANZANIAN").toUpperCase();
  const enrollDate = fd.enrollment_date ? new Date(fd.enrollment_date).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }).toUpperCase() : formatDate(application.created_at).toUpperCase();
  const parentName = (fd.parent_name || "—").toUpperCase();
  const parentNida = fd.parent_nida || "—";
  const parentPhone = fd.parent_phone || "—";
  const parentRel = fd.parent_relationship === "MAMA" ? "MOTHER" : fd.parent_relationship === "BABA" ? "FATHER" : (fd.parent_relationship || "GUARDIAN").toUpperCase();
  const issueDate = formatDate(application.created_at).toUpperCase();
  const admNo = fd.admission_number || fd.student_number || "—";

  return (
    <Document>
      <Page size="A4" style={s.page}>

        {/* ═══════════ FRONT ═══════════ */}
        <Text style={s.pageTitle}>FRONT</Text>
        <View style={s.frontCard}>
          {/* Header */}
          <View style={s.frontHeader}>
            {TANZANIA_LOGO_BASE64 ? <Image src={TANZANIA_LOGO_BASE64} style={s.logoImg}/> : null}
            <View style={s.headerText}>
              <Text style={s.tsidBig}>TSID</Text>
              <Text style={s.tsidSub}>TANZANIA STUDENT IDENTIFICATION SYSTEM</Text>
            </View>
            {/* Simplified flag */}
            <View style={s.flagBox}>
              <View style={s.flagStripe1}/>
              <View style={s.flagStripe2}/>
              <View style={s.flagStripe3}/>
            </View>
          </View>

          {/* Body */}
          <View style={s.frontBody}>
            {/* Left: Photo + School */}
            <View style={s.photoSide}>
              <View style={s.photoFrame}>
                {photo
                  ? <Image src={photo} style={s.photoImg}/>
                  : <View style={s.photoPlaceholder}><Text style={s.photoPlaceholderText}>{"PICHA\nPHOTO"}</Text></View>}
              </View>
              <View style={s.schoolBlock}>
                <View style={s.schoolIcon}><Text style={s.schoolIconText}>📚</Text></View>
                <Text style={s.schoolName} numberOfLines={3}>{schoolName}</Text>
                <Text style={s.regionLine}>{region}</Text>
                <Text style={s.regionLine}>{district}</Text>
                {admNo !== "—" && <Text style={[s.regionLine, { marginTop: 2 }]}>ID: {admNo}</Text>}
              </View>
            </View>

            {/* Right: Info */}
            <View style={s.infoSide}>
              <Text style={s.tsidLabel}>TSID NUMBER</Text>
              <Text style={s.tsidNumber}>{tsid}</Text>

              <View style={s.infoGroup}>
                <Text style={s.infoLabel}>FULL NAME</Text>
                <Text style={s.infoValue}>{studentName.toUpperCase()}</Text>
              </View>
              <View style={s.infoGroup}>
                <Text style={s.infoLabel}>DATE OF BIRTH</Text>
                <Text style={s.infoValue}>{dob}</Text>
              </View>
              <View style={s.infoGroup}>
                <Text style={s.infoLabel}>GENDER</Text>
                <Text style={s.infoValue}>{sex}</Text>
              </View>
              <View style={s.infoGroup}>
                <Text style={s.infoLabel}>NATIONALITY</Text>
                <Text style={s.infoValue}>{nationality}</Text>
              </View>

              {/* QR */}
              <View style={s.qrBlock}>
                {qrDataUrl
                  ? <Image src={qrDataUrl} style={s.qrImg}/>
                  : <View style={[s.qrImg, { backgroundColor: "#f1f5f9", alignItems: "center", justifyContent: "center" }]}><Text style={{ fontSize: 5, color: "#94a3b8" }}>QR Code</Text></View>}
                <Text style={s.qrText}>SCAN TO VERIFY</Text>
              </View>
            </View>
          </View>

          {/* Footer */}
          <View style={s.frontFooter}>
            <View style={s.footerItem}><Text style={s.footerIcon}>🛡</Text><Text style={s.footerText}>{"LIFELONG\nSTUDENT ID"}</Text></View>
            <View style={s.footerItem}><Text style={s.footerIcon}>✦</Text><Text style={s.footerText}>{"NATIONALLY\nRECOGNIZED"}</Text></View>
            <View style={s.footerItem}><Text style={s.footerIcon}>✓</Text><Text style={s.footerText}>{"SECURE\n& VERIFIED"}</Text></View>
          </View>
          <View style={s.footerBar}>
            <View style={s.footerBar1}/><View style={s.footerBar2}/><View style={s.footerBar3}/>
          </View>
        </View>

        <View style={s.separator}/>

        {/* ═══════════ BACK ═══════════ */}
        <Text style={s.pageTitle}>BACK</Text>
        <View style={s.backCard}>
          {/* Header */}
          <View style={s.backHeader}>
            <Text style={s.backTsidNumber}>{tsid}</Text>
          </View>

          {/* Body */}
          <View style={s.backBody}>
            <View style={s.backLeft}>
              {/* Student Information */}
              <Text style={s.sectionTitle}>STUDENT INFORMATION</Text>
              <View style={s.backRow}><Text style={s.backLabel}>DATE OF ENROLLMENT</Text><Text style={s.backValue}>{enrollDate}</Text></View>
              <View style={s.backRow}><Text style={s.backLabel}>CURRENT LEVEL</Text><Text style={s.backValue}>{educLevel}</Text></View>
              <View style={s.backRow}><Text style={s.backLabel}>CLASS / YEAR</Text><Text style={s.backValue}>{classYear || "—"}</Text></View>
              <View style={s.backRow}><Text style={s.backLabel}>BLOOD GROUP</Text><Text style={s.backValue}>{bloodGroup}</Text></View>
              <View style={s.backRow}><Text style={s.backLabel}>PHONE (GUARDIAN)</Text><Text style={s.backValue}>{parentPhone}</Text></View>

              {/* Parent / Guardian */}
              <Text style={[s.sectionTitle, { marginTop: 6 }]}>PARENT / GUARDIAN</Text>
              <View style={s.backRow}><Text style={s.backLabel}>NAME</Text><Text style={s.backValue}>{parentName}</Text></View>
              <View style={s.backRow}><Text style={s.backLabel}>NIDA NUMBER</Text><Text style={s.backValue}>{parentNida}</Text></View>
              <View style={s.backRow}><Text style={s.backLabel}>RELATIONSHIP</Text><Text style={s.backValue}>{parentRel}</Text></View>

              {/* Important */}
              <View style={s.importantBox}>
                <Text style={s.importantTitle}>IMPORTANT</Text>
                <Text style={s.importantItem}>• This card is the property of the Government of Tanzania.</Text>
                <Text style={s.importantItem}>• It is valid for educational identification nationwide.</Text>
                <Text style={s.importantItem}>• Report loss of this card to your school immediately.</Text>
                <Text style={s.importantItem}>• This card is not transferable.</Text>
              </View>
            </View>

            {/* Right: Stamp + QR */}
            <View style={s.backRight}>
              <View style={s.stampCircle}>
                <View style={s.stampInner}>
                  <Text style={{ fontSize: 4, color: MID_NAVY, letterSpacing: 0.5 }}>TANZANIA STUDENT</Text>
                  <Text style={s.stampTsid}>TSID</Text>
                  <Text style={{ fontSize: 4, color: MID_NAVY, letterSpacing: 0.5 }}>IDENTIFICATION</Text>
                  <Text style={{ fontSize: 3.5, color: MID_NAVY }}>SYSTEM</Text>
                </View>
              </View>
              {qrDataUrl
                ? <Image src={qrDataUrl} style={s.backQr}/>
                : null}
            </View>
          </View>

          {/* Back footer */}
          <View style={s.backFooter}>
            <View style={s.backFooterLeft}>
              <Text style={s.backFooterText}>🌐 VERIFICATION PORTAL: verify.tsid.go.tz</Text>
              <Text style={[s.backFooterText, { marginTop: 1 }]}>🔒 This card contains secure data. Unauthorized use is prohibited by law.</Text>
            </View>
            <View style={s.backFooterRight}>
              <Text style={{ fontSize: 4.5, color: "#60a5fa", fontWeight: "bold" }}>ISSUED ON</Text>
              <Text style={s.backFooterCountry}>{issueDate}</Text>
              <Text style={[s.backFooterText, { marginTop: 2 }]}>JAMHURI YA MUUNGANO</Text>
              <Text style={s.backFooterCountry}>WA TANZANIA</Text>
            </View>
          </View>
        </View>

      </Page>
      <ReceiptPage application={application} lang={lang} qrDataUrl={qrDataUrl}/>
    </Document>
  );
};
export default ChetiMwanafunziPDF;
