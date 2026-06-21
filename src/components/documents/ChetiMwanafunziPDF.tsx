/**
 * ChetiMwanafunziPDF — TSID Student ID Card
 * Pixel-accurate match to official TSID reference design
 */
import React from "react";
import { Page, Text, View, Image, StyleSheet, Document } from "@react-pdf/renderer";
import { TANZANIA_LOGO_BASE64 } from "@/constants/logo";
import { Application } from "@/lib/supabase";
import { formatDate } from "./types";

interface Props { application: Application; lang?: "sw" | "en"; qrDataUrl?: string; }

// Portrait card: ~86mm wide × ~136mm tall at 72dpi
const CW = 246;
const CH = 390;

// Colors from reference image
const NAVY   = "#0d1f3c";   // dark navy header
const NAVY2  = "#1a3a5c";   // medium navy stamp/icons
const GREEN  = "#1a7a3c";   // section title green
const WHITE  = "#ffffff";
const LGRAY  = "#eef2f7";   // photo side background
const MGRAY  = "#6b7280";   // label color
const DGRAY  = "#111827";   // value color
const BORDER = "#d1d9e0";

const s = StyleSheet.create({
  // Page: side by side
  page: {
    backgroundColor: "#cfd8e3",
    padding: 24,
    fontFamily: "Helvetica",
    flexDirection: "row",
    justifyContent: "center",
    gap: 28,
  },
  cardWrap: { alignItems: "center" },
  cardLabel: { fontSize: 10, fontWeight: "bold", color: "#4b5563", letterSpacing: 2, marginBottom: 8 },

  // ═══ FRONT CARD ═══
  fCard: {
    width: CW, backgroundColor: WHITE,
    borderRadius: 12, overflow: "hidden",
    borderWidth: 1, borderColor: "#c0ccd8",
  },

  // Header strip
  fHeader: {
    backgroundColor: NAVY,
    paddingHorizontal: 12, paddingTop: 10, paddingBottom: 8,
    flexDirection: "row", alignItems: "center", gap: 8,
  },
  fLogoImg: { width: 28, height: 28 },
  fBrandBox: { flex: 1 },
  fBrandTSID: { fontSize: 20, fontWeight: "bold", color: WHITE, lineHeight: 1 },
  fBrandSub:  { fontSize: 5, color: "#9ab8d8", letterSpacing: 0.5, lineHeight: 1.5 },
  // TZ flag (3 horizontal stripes in a rectangle)
  fFlag: { width: 30, height: 20, borderRadius: 3, overflow: "hidden" },
  fFlagG: { flex: 1, backgroundColor: "#1eb53a" },
  fFlagY: { flex: 1, backgroundColor: "#fcd116" },
  fFlagB: { flex: 1, backgroundColor: "#00a3dd" },

  // Photo + Info row (main body)
  fBody: { flexDirection: "row", flex: 1 },

  // Left: photo column (gray background)
  fPhotoCol: {
    width: 104, backgroundColor: LGRAY,
    paddingTop: 14, paddingBottom: 10,
    paddingHorizontal: 8,
    alignItems: "center",
  },
  fPhotoFrame: {
    width: 88, height: 112, borderRadius: 6,
    overflow: "hidden",
    borderWidth: 1.5, borderColor: "#8fa8c0",
  },
  fPhotoImg:  { width: 88, height: 112, objectFit: "cover" },
  fPhotoPlaceholder: {
    width: 88, height: 112,
    backgroundColor: "#c9d5e0",
    alignItems: "center", justifyContent: "center",
  },
  fPhotoPlaceholderTxt: { fontSize: 7, color: "#7a8fa0", textAlign: "center" },

  // Right: info column (white background)
  fInfoCol: {
    flex: 1, backgroundColor: WHITE,
    paddingTop: 12, paddingHorizontal: 10,
  },
  fTsidNumLabel: {
    fontSize: 6, color: MGRAY, fontWeight: "bold",
    letterSpacing: 0.8, textTransform: "uppercase", marginBottom: 2,
  },
  fTsidNum: {
    fontSize: 12, fontWeight: "bold", color: GREEN,
    fontFamily: "Courier", letterSpacing: 0.3,
    borderBottomWidth: 1.5, borderBottomColor: GREEN,
    paddingBottom: 5, marginBottom: 8,
  },
  fField: { marginBottom: 6 },
  fFieldLabel: {
    fontSize: 5.5, color: MGRAY, fontWeight: "bold",
    letterSpacing: 0.7, textTransform: "uppercase",
  },
  fFieldValue: {
    fontSize: 9.5, fontWeight: "bold", color: DGRAY, lineHeight: 1.2,
  },

  // School + QR section
  fSchoolQR: {
    flexDirection: "row", alignItems: "flex-start",
    paddingHorizontal: 10, paddingTop: 10, paddingBottom: 8,
    backgroundColor: WHITE,
    borderTopWidth: 1, borderTopColor: BORDER,
  },
  fSchoolLeft: { flex: 1, flexDirection: "row", alignItems: "flex-start", gap: 8 },
  fSchoolIcon: {
    width: 32, height: 32, backgroundColor: NAVY,
    borderRadius: 6, alignItems: "center", justifyContent: "center",
    marginTop: 2,
  },
  fSchoolIconTxt: { fontSize: 15, color: WHITE },
  fSchoolText: { flex: 1 },
  fSchoolName:  { fontSize: 8, fontWeight: "bold", color: NAVY, lineHeight: 1.4 },
  fSchoolMeta:  { fontSize: 6, color: MGRAY, marginTop: 1 },
  // QR on right
  fQrWrap: { alignItems: "center" },
  fQrImg:  { width: 64, height: 64, borderWidth: 2, borderColor: BORDER },
  fQrTxt:  { fontSize: 5, color: MGRAY, letterSpacing: 0.5, marginTop: 3, textAlign: "center" },

  // Footer icons
  fFooterIcons: {
    backgroundColor: NAVY, flexDirection: "row",
    paddingHorizontal: 6, paddingVertical: 10,
    justifyContent: "space-around",
  },
  fFooterItem: { alignItems: "center", gap: 3 },
  fFooterIcon: { width: 20, height: 20, borderWidth: 1.5, borderColor: "#5a7fa0", borderRadius: 10, alignItems: "center", justifyContent: "center" },
  fFooterIconTxt: { fontSize: 8, color: WHITE },
  fFooterTxt: {
    fontSize: 5.5, color: "#8ab4d4", fontWeight: "bold",
    textAlign: "center", letterSpacing: 0.3, lineHeight: 1.4,
  },
  // Color bar
  fColorBar: { flexDirection: "row", height: 5 },
  fBarG: { flex: 1, backgroundColor: "#1eb53a" },
  fBarY: { flex: 1, backgroundColor: "#fcd116" },
  fBarB: { flex: 1, backgroundColor: "#00a3dd" },

  // ═══ BACK CARD ═══
  bCard: {
    width: CW, backgroundColor: WHITE,
    borderRadius: 12, overflow: "hidden",
    borderWidth: 1, borderColor: "#c0ccd8",
  },

  // Back header — full navy strip with TSID number
  bHeader: {
    backgroundColor: NAVY,
    paddingHorizontal: 14, paddingVertical: 12,
  },
  bHeaderNum: {
    fontSize: 16, fontWeight: "bold", color: WHITE,
    fontFamily: "Courier", letterSpacing: 0.5,
  },

  // Back body: two columns
  bBody: {
    flex: 1, flexDirection: "row",
    paddingHorizontal: 14, paddingTop: 12, paddingBottom: 8, gap: 10,
  },
  bLeft: { flex: 1 },

  // Section title (green, underlined)
  bSectionTitle: {
    fontSize: 7.5, fontWeight: "bold", color: GREEN,
    letterSpacing: 0.8, textTransform: "uppercase",
    borderBottomWidth: 0.75, borderBottomColor: GREEN,
    paddingBottom: 3, marginBottom: 7,
  },

  // Data rows
  bRow: { flexDirection: "row", marginBottom: 5 },
  bLabel: {
    width: 82, fontSize: 6, color: MGRAY,
    fontWeight: "bold", textTransform: "uppercase", letterSpacing: 0.3,
  },
  bValue: { flex: 1, fontSize: 7.5, color: DGRAY, fontWeight: "bold" },

  // Divider between sections
  bDivider: { height: 0.75, backgroundColor: "#dce4ed", marginVertical: 8 },

  // Important box
  bImportantBox: {
    borderWidth: 0.75, borderColor: "#a3c4a3", borderRadius: 4,
    padding: 8, marginTop: 8, backgroundColor: "#f8fff8",
  },
  bImportTitle: { fontSize: 7, fontWeight: "bold", color: GREEN, marginBottom: 5 },
  bImportItem:  { fontSize: 5.5, color: MGRAY, marginBottom: 2.5, lineHeight: 1.4 },

  // Right side: stamp circle
  bRight: { width: 64, alignItems: "center", paddingTop: 6 },
  bStamp: {
    width: 62, height: 62, borderRadius: 31,
    borderWidth: 1.5, borderColor: "#2a4a7a", borderStyle: "dashed",
    alignItems: "center", justifyContent: "center",
  },
  bStampTxtSm:  { fontSize: 4.5, color: "#2a4a7a", textAlign: "center", letterSpacing: 0.3 },
  bStampTxtBig: { fontSize: 13, fontWeight: "bold", color: "#2a4a7a" },

  // Back lower footer (two sections)
  bFooterTop: {
    flexDirection: "row", justifyContent: "space-between",
    paddingHorizontal: 14, paddingVertical: 8,
    borderTopWidth: 0.75, borderTopColor: BORDER,
  },
  bFootTopLeft: {},
  bFootPortalLabel: { fontSize: 6, color: MGRAY, fontWeight: "bold", letterSpacing: 0.5 },
  bFootPortalVal:   { fontSize: 7, color: GREEN, fontWeight: "bold" },
  bFootTopRight: { alignItems: "flex-end" },
  bFootIssuedLbl: { fontSize: 6, color: MGRAY, fontWeight: "bold" },
  bFootIssuedVal: { fontSize: 7.5, color: DGRAY, fontWeight: "bold" },

  // Back bottom dark bar
  bFooterBottom: {
    backgroundColor: NAVY, flexDirection: "row",
    paddingHorizontal: 14, paddingVertical: 8,
    justifyContent: "space-between", alignItems: "center",
  },
  bFootSecure:  { fontSize: 5, color: "#7a9abb", flex: 1 },
  bFootCountry: { alignItems: "flex-end" },
  bFootCtryTxt: { fontSize: 6, color: "#8ab4d4", fontWeight: "bold" },
});

const EDU_SHORT: Record<string, string> = {
  CHEKECHEA: "PRE-PRIMARY", MSINGI: "PRIMARY SCHOOL",
  SEKONDARI_O: "SECONDARY (O-LEVEL)", SEKONDARI_A: "SECONDARY (A-LEVEL)",
  STASHAHADA: "DIPLOMA / CERTIFICATE", SHAHADA: "UNIVERSITY DEGREE",
  UZAMILI: "MASTERS / PHD",
};

export const ChetiMwanafunziPDF: React.FC<Props> = ({ application, lang = "sw", qrDataUrl }) => {
  const fd = (application.form_data || {}) as Record<string, string>;

  const studentName = (fd.student_name || `${fd.student_first || ""} ${fd.student_last || ""}`.trim()).toUpperCase();
  const tsid        = fd.generated_student_id || application.application_number;
  const photo       = fd.student_photo || null;
  const dob         = fd.student_dob
    ? new Date(fd.student_dob).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }).toUpperCase()
    : "—";
  const gender      = fd.student_sex === "M" ? "MALE" : fd.student_sex === "F" ? "FEMALE" : "—";
  const nationality = (fd.nationality || "TANZANIAN").toUpperCase();
  const school      = (fd.school_name || "SCHOOL NAME").toUpperCase();
  const region      = (fd.student_region || application.region || "—").toUpperCase();
  const district    = (fd.student_district || application.district || "—").toUpperCase();
  const admNo       = fd.admission_number || fd.student_number || "";
  const level       = EDU_SHORT[fd.education_level] || (fd.education_level || "—").toUpperCase();
  const classYear   = fd.class_year === "OTHER" ? (fd.class_year_manual || "—") : (fd.class_year || "—");
  const bloodGroup  = fd.blood_group || "—";
  const enrollDate  = fd.enrollment_date
    ? new Date(fd.enrollment_date).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }).toUpperCase()
    : formatDate(application.created_at).toUpperCase();
  const parentName  = (fd.parent_name || "—").toUpperCase();
  const parentNida  = fd.parent_nida || "—";
  const parentPhone = fd.parent_phone || "—";
  const parentRel   = fd.parent_relationship === "MAMA" ? "MOTHER"
    : fd.parent_relationship === "BABA" ? "FATHER"
    : (fd.parent_relationship || "GUARDIAN").toUpperCase();
  const issueDate   = formatDate(application.created_at).toUpperCase();

  return (
    <Document>
      <Page size="A4" style={s.page}>

        {/* ════════ FRONT ════════ */}
        <View style={s.cardWrap}>
          <Text style={s.cardLabel}>FRONT</Text>
          <View style={s.fCard}>

            {/* Header */}
            <View style={s.fHeader}>
              {TANZANIA_LOGO_BASE64 ? <Image src={TANZANIA_LOGO_BASE64} style={s.fLogoImg}/> : null}
              <View style={s.fBrandBox}>
                <Text style={s.fBrandTSID}>TSID</Text>
                <Text style={s.fBrandSub}>TANZANIA STUDENT{"\n"}IDENTIFICATION SYSTEM</Text>
              </View>
              <View style={s.fFlag}>
                <View style={s.fFlagG}/><View style={s.fFlagY}/><View style={s.fFlagB}/>
              </View>
            </View>

            {/* Photo + Info */}
            <View style={s.fBody}>
              {/* Left: photo */}
              <View style={s.fPhotoCol}>
                <View style={s.fPhotoFrame}>
                  {photo
                    ? <Image src={photo} style={s.fPhotoImg}/>
                    : <View style={s.fPhotoPlaceholder}>
                        <Text style={s.fPhotoPlaceholderTxt}>{"PICHA\nPHOTO"}</Text>
                      </View>}
                </View>
              </View>

              {/* Right: info */}
              <View style={s.fInfoCol}>
                <Text style={s.fTsidNumLabel}>TSID NUMBER</Text>
                <Text style={s.fTsidNum}>{tsid}</Text>

                <View style={s.fField}>
                  <Text style={s.fFieldLabel}>FULL NAME</Text>
                  <Text style={s.fFieldValue}>{studentName}</Text>
                </View>
                <View style={s.fField}>
                  <Text style={s.fFieldLabel}>DATE OF BIRTH</Text>
                  <Text style={s.fFieldValue}>{dob}</Text>
                </View>
                <View style={s.fField}>
                  <Text style={s.fFieldLabel}>GENDER</Text>
                  <Text style={s.fFieldValue}>{gender}</Text>
                </View>
                <View style={s.fField}>
                  <Text style={s.fFieldLabel}>NATIONALITY</Text>
                  <Text style={s.fFieldValue}>{nationality}</Text>
                </View>
              </View>
            </View>

            {/* School + QR */}
            <View style={s.fSchoolQR}>
              <View style={s.fSchoolLeft}>
                <View style={s.fSchoolIcon}>
                  <Text style={s.fSchoolIconTxt}>📚</Text>
                </View>
                <View style={s.fSchoolText}>
                  <Text style={s.fSchoolName}>{school}</Text>
                  {admNo ? <Text style={s.fSchoolMeta}>SCHOOL ID: {admNo}</Text> : null}
                  <Text style={s.fSchoolMeta}>REGION:   {region}</Text>
                  <Text style={s.fSchoolMeta}>DISTRICT: {district}</Text>
                </View>
              </View>
              <View style={s.fQrWrap}>
                {qrDataUrl
                  ? <Image src={qrDataUrl} style={s.fQrImg}/>
                  : <View style={[s.fQrImg, { backgroundColor: LGRAY, alignItems: "center", justifyContent: "center" }]}>
                      <Text style={{ fontSize: 7, color: MGRAY }}>QR CODE</Text>
                    </View>}
                <Text style={s.fQrTxt}>SCAN TO VERIFY</Text>
              </View>
            </View>

            {/* Footer icons */}
            <View style={s.fFooterIcons}>
              {[
                { icon: "⛨", label: "LIFELONG\nSTUDENT ID" },
                { icon: "✦", label: "NATIONALY\nRECOGNIZED" },
                { icon: "✓", label: "SECURE\n& VERIFIED" },
              ].map((item, i) => (
                <View key={i} style={s.fFooterItem}>
                  <View style={s.fFooterIcon}>
                    <Text style={s.fFooterIconTxt}>{item.icon}</Text>
                  </View>
                  <Text style={s.fFooterTxt}>{item.label}</Text>
                </View>
              ))}
            </View>
            <View style={s.fColorBar}>
              <View style={s.fBarG}/><View style={s.fBarY}/><View style={s.fBarB}/>
            </View>

          </View>
        </View>

        {/* ════════ BACK ════════ */}
        <View style={s.cardWrap}>
          <Text style={s.cardLabel}>BACK</Text>
          <View style={s.bCard}>

            {/* Header */}
            <View style={s.bHeader}>
              <Text style={s.bHeaderNum}>{tsid}</Text>
            </View>

            {/* Body */}
            <View style={s.bBody}>
              {/* Left column */}
              <View style={s.bLeft}>

                {/* Student Information */}
                <Text style={s.bSectionTitle}>STUDENT INFORMATION</Text>
                {[
                  ["DATE OF ENROLLMENT", enrollDate],
                  ["CURRENT LEVEL",      level],
                  ["CLASS / YEAR",       classYear],
                  ["BLOOD GROUP",        bloodGroup],
                  ["PHONE (GUARDIAN)",   parentPhone],
                ].map(([label, value]) => (
                  <View key={label} style={s.bRow}>
                    <Text style={s.bLabel}>{label}</Text>
                    <Text style={s.bValue}>{value}</Text>
                  </View>
                ))}

                <View style={s.bDivider}/>

                {/* Parent / Guardian */}
                <Text style={s.bSectionTitle}>PARENT / GUARDIAN</Text>
                {[
                  ["NAME",         parentName],
                  ["NIDA NUMBER",  parentNida],
                  ["RELATIONSHIP", parentRel],
                  ["PHONE",        parentPhone],
                ].map(([label, value]) => (
                  <View key={label} style={s.bRow}>
                    <Text style={s.bLabel}>{label}</Text>
                    <Text style={s.bValue}>{value}</Text>
                  </View>
                ))}

                {/* Important */}
                <View style={s.bImportantBox}>
                  <Text style={s.bImportTitle}>IMPORTANT</Text>
                  {[
                    "This card is the property of the Government of Tanzania.",
                    "It is valid for educational identification nationwide.",
                    "Report loss of this card to your school immediately.",
                    "This card is not transferable.",
                  ].map((item, i) => (
                    <Text key={i} style={s.bImportItem}>• {item}</Text>
                  ))}
                </View>
              </View>

              {/* Right: stamp circle */}
              <View style={s.bRight}>
                <View style={s.bStamp}>
                  <Text style={s.bStampTxtSm}>TANZANIA STUDENT</Text>
                  <Text style={s.bStampTxtBig}>TSID</Text>
                  <Text style={s.bStampTxtSm}>IDENTIFICATION{"\n"}SYSTEM</Text>
                </View>
              </View>
            </View>

            {/* Footer top: portal + issued on */}
            <View style={s.bFooterTop}>
              <View style={s.bFootTopLeft}>
                <Text style={s.bFootPortalLabel}>🌐  VERIFICATION PORTAL</Text>
                <Text style={s.bFootPortalVal}>verify.tsid.go.tz</Text>
              </View>
              <View style={s.bFootTopRight}>
                <Text style={s.bFootIssuedLbl}>ISSUED ON</Text>
                <Text style={s.bFootIssuedVal}>{issueDate}</Text>
              </View>
            </View>

            {/* Footer bottom: dark bar */}
            <View style={s.bFooterBottom}>
              <Text style={s.bFootSecure}>
                🔒  This card contains secure data.{"\n"}
                Unauthorized use is prohibited by law.
              </Text>
              <View style={s.bFootCountry}>
                <Text style={s.bFootCtryTxt}>JAMHURI YA MUUNGANO</Text>
                <Text style={[s.bFootCtryTxt, { color: WHITE, fontWeight: "bold" }]}>WA TANZANIA</Text>
              </View>
            </View>

          </View>
        </View>

      </Page>
    </Document>
  );
};
export default ChetiMwanafunziPDF;
