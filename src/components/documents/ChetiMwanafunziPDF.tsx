/**
 * ChetiMwanafunziPDF — TSID Student ID Card
 * CR80 Standard: 85.60mm × 53.98mm = 242.6pt × 153pt at 72dpi
 * Exact match to TSID sample design spec
 * Pages: 1=Front, 2=Back, 3=Combined
 */
import React from "react";
import { Page, Text, View, Image, StyleSheet, Document } from "@react-pdf/renderer";
import { TANZANIA_LOGO_BASE64 } from "@/constants/logo";
import { Application } from "@/lib/supabase";
import { formatDate } from "./types";
import { ReceiptPage } from "./ReceiptPage";

interface Props { application: Application; lang?: "sw" | "en"; qrDataUrl?: string; }

// CR80 card dimensions at 72dpi
const CW = 243; // 85.60mm
const CH = 154; // 53.98mm

// Official color palette from spec
const NAVY        = "#003366";
const GREEN       = "#1B8F3A";
const GREEN_DARK  = "#0F4C24";
const GREEN_LIGHT = "#1A7A3A";
const YELLOW      = "#F5C400";
const RED         = "#D32F2F";
const WHITE       = "#FFFFFF";
const TEXT_PRI    = "#111111";
const TEXT_SEC    = "#444444";
const TEXT_MUT    = "#777777";
const BG_LIGHT    = "#F2F4F8";
const BORDER_COL  = "#E0E0E0";

const f = StyleSheet.create({
  // ─── Page wrapper for each card page ──────────────────────────────────────
  page: {
    backgroundColor: "#c8d0d8",
    padding: 28,
    fontFamily: "Helvetica",
    alignItems: "center",
    justifyContent: "center",
  },
  combinedPage: {
    backgroundColor: "#c8d0d8",
    padding: 24,
    fontFamily: "Helvetica",
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "center",
    gap: 20,
  },
  cardLabel: {
    fontSize: 9, fontWeight: "bold",
    color: "#4b5563", letterSpacing: 2,
    marginBottom: 6, textAlign: "center",
  },

  // ─── FRONT CARD ────────────────────────────────────────────────────────────
  frontCard: {
    width: CW, height: CH,
    backgroundColor: WHITE,
    borderRadius: 6,
    overflow: "hidden",
    borderWidth: 1.5, borderColor: RED,
    // shadow via wrapping
  },

  // TOP STRIP: logo | TSID brand | flag
  fTopStrip: {
    backgroundColor: NAVY,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 7, paddingVertical: 5,
    gap: 5,
  },
  fLogo: { width: 20, height: 20 },
  fBrand: { flex: 1 },
  fTsidWord: { fontSize: 13, fontWeight: "bold", color: WHITE, letterSpacing: 1, lineHeight: 1 },
  fTsidSub: { fontSize: 4.5, color: "#9ab8d8", letterSpacing: 0.5, lineHeight: 1.4 },
  fFlag: { width: 24, height: 16, borderRadius: 2, overflow: "hidden" },
  fFlagG: { flex: 1, backgroundColor: "#1eb53a" },
  fFlagY: { flex: 1, backgroundColor: "#fcd116" },
  fFlagB: { flex: 1, backgroundColor: "#00a3dd" },

  // BODY: left col (32%) | right col (68%)
  fBody: { flexDirection: "row", flex: 1 },

  // ── LEFT COLUMN (32%) ──
  fLeft: {
    width: CW * 0.32,
    borderRightWidth: 1, borderRightColor: BORDER_COL, borderRightStyle: "dashed",
    paddingTop: 6, paddingHorizontal: 5,
    alignItems: "center",
    backgroundColor: BG_LIGHT,
  },
  fPhotoBox: {
    width: 40, height: 52,
    borderWidth: 1.5, borderColor: GREEN_LIGHT,
    borderRadius: 2, overflow: "hidden",
    backgroundColor: "#D8E4DC",
    alignItems: "center", justifyContent: "center",
    marginBottom: 4,
  },
  fPhotoImg: { width: 40, height: 52, objectFit: "cover" },
  fPhotoPlaceholder: { fontSize: 5, color: "#888", textAlign: "center" },

  fTsidLabel: {
    fontSize: 4.5, fontWeight: "bold", color: TEXT_MUT,
    letterSpacing: 0.5, textTransform: "uppercase", marginBottom: 1,
  },
  fTsidNum: {
    fontSize: 6.5, fontWeight: "bold", color: RED,
    fontFamily: "Courier", letterSpacing: 0.3,
    borderBottomWidth: 0.5, borderBottomColor: RED,
    paddingBottom: 2, marginBottom: 3,
    textAlign: "center",
  },
  fNameLabel: { fontSize: 4.5, fontWeight: "bold", color: TEXT_MUT, textTransform: "uppercase", marginBottom: 1 },
  fNameVal:   { fontSize: 6, fontWeight: "bold", color: TEXT_PRI, textAlign: "center", marginBottom: 3, lineHeight: 1.2 },

  // DOB / GENDER / NATIONALITY 3-col mini grid
  fMiniGrid: { flexDirection: "row", gap: 2, width: "100%" },
  fMiniCell: { flex: 1, alignItems: "center" },
  fMiniLabel: { fontSize: 3.8, fontWeight: "bold", color: TEXT_MUT, textTransform: "uppercase", textAlign: "center" },
  fMiniVal:   { fontSize: 5, fontWeight: "bold", color: TEXT_PRI, textAlign: "center", lineHeight: 1.2 },

  // ── RIGHT COLUMN (68%) ──
  fRight: {
    flex: 1,
    paddingTop: 5, paddingHorizontal: 6, paddingBottom: 4,
    backgroundColor: WHITE,
  },

  // School badge (green header box)
  fSchoolBadge: {
    backgroundColor: GREEN_LIGHT,
    borderRadius: 2, paddingHorizontal: 5, paddingVertical: 3,
    marginBottom: 4, flexDirection: "row", alignItems: "center", gap: 4,
  },
  fSchoolIcon: {
    width: 16, height: 16, backgroundColor: "#0F5020",
    borderRadius: 2, alignItems: "center", justifyContent: "center",
  },
  fSchoolIconTxt: { fontSize: 8, color: WHITE },
  fSchoolInfo: { flex: 1 },
  fSchoolName: { fontSize: 6, fontWeight: "bold", color: WHITE, lineHeight: 1.3 },
  fSchoolMeta: { fontSize: 4.5, color: "#a0e0b0", marginTop: 0.5 },

  // Student info 2-col grid
  fInfoGrid: { flexDirection: "row", flexWrap: "wrap", gap: 1, marginBottom: 3 },
  fInfoCell: { width: "48%", marginBottom: 2 },
  fInfoLabel: { fontSize: 4.5, fontWeight: "bold", color: TEXT_MUT, textTransform: "uppercase", letterSpacing: 0.3 },
  fInfoVal:   { fontSize: 6, fontWeight: "bold", color: TEXT_PRI },

  // Divider
  fDivider: { height: 0.5, backgroundColor: BORDER_COL, marginVertical: 3 },

  // Guardian section
  fGuardTitle: {
    fontSize: 5, fontWeight: "bold", color: GREEN_LIGHT,
    textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 2,
  },
  fGuardGrid: { flexDirection: "row", flexWrap: "wrap", gap: 1 },
  fGuardCell: { width: "48%", marginBottom: 1.5 },
  fGuardLabel: { fontSize: 4, fontWeight: "bold", color: TEXT_MUT, textTransform: "uppercase", letterSpacing: 0.3 },
  fGuardVal:   { fontSize: 5.5, fontWeight: "bold", color: TEXT_PRI },

  // Important / warning box
  fImportBox: {
    backgroundColor: "#FFF8E1",
    borderLeftWidth: 2, borderLeftColor: YELLOW,
    paddingHorizontal: 4, paddingVertical: 2.5,
    marginTop: 2,
  },
  fImportTitle: { fontSize: 4.5, fontWeight: "bold", color: "#7a5800", marginBottom: 1.5 },
  fImportItem:  { fontSize: 4, color: TEXT_SEC, marginBottom: 1, lineHeight: 1.3 },

  // BOTTOM BAR
  fBottomBar: {
    backgroundColor: "rgba(26, 122, 58, 0.05)",
    borderTopWidth: 2, borderTopColor: YELLOW,
    flexDirection: "row", alignItems: "center",
    paddingHorizontal: 6, paddingVertical: 3, gap: 4,
  },
  fQrWrap: { alignItems: "center" },
  fQrImg:  { width: 22, height: 22 },
  fQrTxt:  { fontSize: 3.5, color: TEXT_MUT, textAlign: "center", letterSpacing: 0.3, marginTop: 1 },
  fVerifyWrap: { flex: 1 },
  fVerifyLabel: { fontSize: 4, color: TEXT_MUT, fontWeight: "bold" },
  fVerifyUrl:   { fontSize: 5, color: GREEN_LIGHT, fontWeight: "bold" },
  fIssuedWrap: {},
  fIssuedLabel: { fontSize: 4, color: TEXT_MUT, fontWeight: "bold" },
  fIssuedVal:   { fontSize: 4.5, color: TEXT_PRI, fontWeight: "bold" },
  fLifelongBadge: {
    backgroundColor: RED, borderRadius: 1.5,
    paddingHorizontal: 3, paddingVertical: 1.5,
  },
  fLifelongTxt: { fontSize: 4, fontWeight: "bold", color: WHITE, letterSpacing: 0.3 },

  // ─── BACK CARD ─────────────────────────────────────────────────────────────
  backCard: {
    width: CW, height: CH,
    backgroundColor: WHITE,
    borderRadius: 6, overflow: "hidden",
    borderWidth: 1.5, borderColor: RED,
  },

  // HEADER: full navy with TSID number
  bHeader: {
    backgroundColor: NAVY,
    paddingHorizontal: 10, paddingVertical: 7,
  },
  bHeaderNum: {
    fontSize: 13, fontWeight: "bold", color: WHITE,
    fontFamily: "Courier", letterSpacing: 0.5,
  },

  // BACK BODY: left (info) + right (stamp)
  bBody: {
    flex: 1, flexDirection: "row",
    paddingHorizontal: 8, paddingTop: 6, paddingBottom: 4, gap: 6,
  },
  bLeft: { flex: 1 },

  bSecTitle: {
    fontSize: 5.5, fontWeight: "bold", color: GREEN_LIGHT,
    textTransform: "uppercase", letterSpacing: 0.7,
    borderBottomWidth: 0.5, borderBottomColor: GREEN_LIGHT,
    paddingBottom: 1.5, marginBottom: 4,
  },
  bRow: { flexDirection: "row", marginBottom: 3 },
  bLabel: { width: 65, fontSize: 4.5, fontWeight: "bold", color: TEXT_MUT, textTransform: "uppercase", letterSpacing: 0.3 },
  bVal:   { flex: 1, fontSize: 6, fontWeight: "bold", color: TEXT_PRI },

  bDivider: { height: 0.5, backgroundColor: "#c8d8e0", marginVertical: 4 },

  bImportBox: {
    borderWidth: 0.5, borderColor: "#b0d8b0",
    backgroundColor: "#f6fff6", borderRadius: 2,
    padding: 4, marginTop: 3,
  },
  bImportTitle: { fontSize: 5, fontWeight: "bold", color: GREEN_LIGHT, marginBottom: 2.5 },
  bImportItem:  { fontSize: 4.5, color: TEXT_SEC, marginBottom: 1.5, lineHeight: 1.4 },

  // Right: stamp
  bRight: { width: 52, alignItems: "center", paddingTop: 4, gap: 5 },
  bStamp: {
    width: 48, height: 48,
    borderRadius: 24,
    borderWidth: 1.5, borderColor: "#2a4a7a",
    borderStyle: "dashed",
    alignItems: "center", justifyContent: "center",
  },
  bStampRow: { alignItems: "center" },
  bStampSm: { fontSize: 3.8, color: "#2a4a7a", textAlign: "center", letterSpacing: 0.3, lineHeight: 1.4 },
  bStampBig: { fontSize: 10, fontWeight: "bold", color: "#2a4a7a" },

  // BACK FOOTER: two-tone
  bFooterTop: {
    flexDirection: "row", justifyContent: "space-between",
    paddingHorizontal: 8, paddingVertical: 4,
    borderTopWidth: 0.5, borderTopColor: BORDER_COL,
  },
  bFootPortalLabel: { fontSize: 5, fontWeight: "bold", color: TEXT_MUT, letterSpacing: 0.4 },
  bFootPortalVal:   { fontSize: 5.5, fontWeight: "bold", color: GREEN_LIGHT },
  bFootIssuedLabel: { fontSize: 5, fontWeight: "bold", color: TEXT_MUT, textAlign: "right" },
  bFootIssuedVal:   { fontSize: 6, fontWeight: "bold", color: TEXT_PRI, textAlign: "right" },

  bFooterBottom: {
    backgroundColor: NAVY,
    flexDirection: "row", justifyContent: "space-between", alignItems: "center",
    paddingHorizontal: 8, paddingVertical: 5,
  },
  bFootSecure: { fontSize: 4, color: "#7a9abb", flex: 1, lineHeight: 1.5 },
  bFootCountryTxt: { fontSize: 5, fontWeight: "bold", color: WHITE, textAlign: "right" },
  bFootCountrySub: { fontSize: 4, color: "#8ab4d4", textAlign: "right" },
});

// ─── Helpers ──────────────────────────────────────────────────────────────────
const EDU: Record<string, string> = {
  CHEKECHEA: "PRE-PRIMARY", MSINGI: "PRIMARY SCHOOL",
  SEKONDARI_O: "SECONDARY (O-LEVEL)", SEKONDARI_A: "SECONDARY (A-LEVEL)",
  STASHAHADA: "DIPLOMA", SHAHADA: "UNIVERSITY DEGREE", UZAMILI: "MASTERS/PHD",
};

function extractData(application: Application) {
  const fd = (application.form_data || {}) as Record<string, string>;
  return {
    studentName: (fd.student_name || `${fd.student_first || ""} ${fd.student_last || ""}`.trim()).toUpperCase(),
    tsid:        fd.generated_student_id || application.application_number,
    photo:       fd.student_photo || null,
    dob:         fd.student_dob
      ? new Date(fd.student_dob).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }).toUpperCase()
      : "—",
    gender:      fd.student_sex === "M" ? "MALE" : fd.student_sex === "F" ? "FEMALE" : "—",
    nationality: (fd.nationality || "TANZANIAN").toUpperCase(),
    school:      (fd.school_name || "—").toUpperCase(),
    admNo:       fd.admission_number || fd.student_number || "",
    region:      (fd.student_region || application.region || "—").toUpperCase(),
    district:    (fd.student_district || application.district || "—").toUpperCase(),
    level:       EDU[fd.education_level] || (fd.education_level || "—").toUpperCase(),
    classYear:   fd.class_year === "OTHER" ? (fd.class_year_manual || "—") : (fd.class_year || "—"),
    bloodGroup:  fd.blood_group || "—",
    enrollDate:  fd.enrollment_date
      ? new Date(fd.enrollment_date).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }).toUpperCase()
      : formatDate(application.created_at).toUpperCase(),
    parentName:  (fd.parent_name || "—").toUpperCase(),
    parentNida:  fd.parent_nida ? fd.parent_nida.replace(/(\d{4})\d+(\d{3})/, "$1***$2") : "—",
    parentPhone: fd.parent_phone || "—",
    parentRel:   fd.parent_relationship === "MAMA" ? "MOTHER"
               : fd.parent_relationship === "BABA" ? "FATHER"
               : (fd.parent_relationship || "GUARDIAN").toUpperCase(),
    issueDate:   formatDate(application.created_at).toUpperCase(),
  };
}

// ─── FRONT component ──────────────────────────────────────────────────────────
const FrontCard: React.FC<{ d: ReturnType<typeof extractData>; qrDataUrl?: string }> = ({ d, qrDataUrl }) => (
  <View style={f.frontCard}>

    {/* TOP STRIP */}
    <View style={f.fTopStrip}>
      {TANZANIA_LOGO_BASE64 ? <Image src={TANZANIA_LOGO_BASE64} style={f.fLogo}/> : null}
      <View style={f.fBrand}>
        <Text style={f.fTsidWord}>TSID</Text>
        <Text style={f.fTsidSub}>TANZANIA STUDENT{"\n"}IDENTIFICATION SYSTEM</Text>
      </View>
      <View style={f.fFlag}>
        <View style={f.fFlagG}/><View style={f.fFlagY}/><View style={f.fFlagB}/>
      </View>
    </View>

    {/* BODY */}
    <View style={f.fBody}>

      {/* LEFT 32% */}
      <View style={f.fLeft}>
        {/* Photo */}
        <View style={f.fPhotoBox}>
          {d.photo
            ? <Image src={d.photo} style={f.fPhotoImg}/>
            : <Text style={f.fPhotoPlaceholder}>{"[PHOTO]"}</Text>}
        </View>
        {/* TSID number */}
        <Text style={f.fTsidLabel}>TSID NUMBER</Text>
        <Text style={f.fTsidNum}>{d.tsid}</Text>
        {/* Full name */}
        <Text style={f.fNameLabel}>FULL NAME</Text>
        <Text style={f.fNameVal}>{d.studentName}</Text>
        {/* DOB / GENDER / NATIONALITY mini-grid */}
        <View style={f.fMiniGrid}>
          {[["DOB", d.dob], ["GENDER", d.gender], ["NATIONALITY", d.nationality]].map(([lbl, val]) => (
            <View key={lbl} style={f.fMiniCell}>
              <Text style={f.fMiniLabel}>{lbl}</Text>
              <Text style={f.fMiniVal}>{val}</Text>
            </View>
          ))}
        </View>
      </View>

      {/* RIGHT 68% */}
      <View style={f.fRight}>
        {/* School badge */}
        <View style={f.fSchoolBadge}>
          <View style={f.fSchoolIcon}><Text style={f.fSchoolIconTxt}>📚</Text></View>
          <View style={f.fSchoolInfo}>
            <Text style={f.fSchoolName} numberOfLines={2}>{d.school}</Text>
            <Text style={f.fSchoolMeta}>
              {d.admNo ? `ID: ${d.admNo}  ` : ""}{d.region} · {d.district}
            </Text>
          </View>
        </View>

        {/* Student info 2-col */}
        <View style={f.fInfoGrid}>
          {[["ENROLLMENT", d.enrollDate], ["LEVEL", d.level], ["BLOOD GROUP", d.bloodGroup], ["GUARDIAN PHONE", d.parentPhone]].map(([lbl, val]) => (
            <View key={lbl} style={f.fInfoCell}>
              <Text style={f.fInfoLabel}>{lbl}</Text>
              <Text style={f.fInfoVal}>{val}</Text>
            </View>
          ))}
        </View>

        <View style={f.fDivider}/>

        {/* Guardian */}
        <Text style={f.fGuardTitle}>PARENT / GUARDIAN</Text>
        <View style={f.fGuardGrid}>
          {[["NAME", d.parentName], ["NIDA", d.parentNida], ["RELATION", d.parentRel], ["PHONE", d.parentPhone]].map(([lbl, val]) => (
            <View key={lbl} style={f.fGuardCell}>
              <Text style={f.fGuardLabel}>{lbl}</Text>
              <Text style={f.fGuardVal}>{val}</Text>
            </View>
          ))}
        </View>

        {/* Important box */}
        <View style={f.fImportBox}>
          <Text style={f.fImportTitle}>IMPORTANT</Text>
          {["Property of Govt. of Tanzania.", "Valid nationwide.", "Report loss immediately.", "Not transferable."].map((item, i) => (
            <Text key={i} style={f.fImportItem}>• {item}</Text>
          ))}
        </View>
      </View>
    </View>

    {/* BOTTOM BAR */}
    <View style={f.fBottomBar}>
      <View style={f.fQrWrap}>
        {qrDataUrl
          ? <Image src={qrDataUrl} style={f.fQrImg}/>
          : <View style={[f.fQrImg, { backgroundColor: "#e0e8e0", alignItems: "center", justifyContent: "center" }]}>
              <Text style={{ fontSize: 5, color: "#888" }}>QR</Text>
            </View>}
        <Text style={f.fQrTxt}>SCAN TO VERIFY</Text>
      </View>
      <View style={f.fVerifyWrap}>
        <Text style={f.fVerifyLabel}>VERIFY AT</Text>
        <Text style={f.fVerifyUrl}>verify.tsid.go.tz</Text>
      </View>
      <View style={f.fIssuedWrap}>
        <Text style={f.fIssuedLabel}>ISSUED</Text>
        <Text style={f.fIssuedVal}>{d.issueDate}</Text>
      </View>
      <View style={f.fLifelongBadge}>
        <Text style={f.fLifelongTxt}>{"LIFELONG ·\nNATIONAL ·\nSECURE"}</Text>
      </View>
    </View>
  </View>
);

// ─── BACK component ───────────────────────────────────────────────────────────
const BackCard: React.FC<{ d: ReturnType<typeof extractData>; qrDataUrl?: string }> = ({ d }) => (
  <View style={f.backCard}>
    {/* HEADER */}
    <View style={f.bHeader}>
      <Text style={f.bHeaderNum}>{d.tsid}</Text>
    </View>

    {/* BODY */}
    <View style={f.bBody}>
      <View style={f.bLeft}>
        {/* Student Information */}
        <Text style={f.bSecTitle}>STUDENT INFORMATION</Text>
        {[["DATE OF ENROLLMENT", d.enrollDate], ["CURRENT LEVEL", d.level], ["BLOOD GROUP", d.bloodGroup], ["PHONE (GUARDIAN)", d.parentPhone]].map(([lbl, val]) => (
          <View key={lbl} style={f.bRow}>
            <Text style={f.bLabel}>{lbl}</Text>
            <Text style={f.bVal}>{val}</Text>
          </View>
        ))}
        <View style={f.bDivider}/>
        {/* Parent / Guardian */}
        <Text style={f.bSecTitle}>PARENT / GUARDIAN</Text>
        {[["NAME", d.parentName], ["NIDA NUMBER", d.parentNida], ["RELATIONSHIP", d.parentRel], ["PHONE", d.parentPhone]].map(([lbl, val]) => (
          <View key={lbl} style={f.bRow}>
            <Text style={f.bLabel}>{lbl}</Text>
            <Text style={f.bVal}>{val}</Text>
          </View>
        ))}
        {/* Important */}
        <View style={f.bImportBox}>
          <Text style={f.bImportTitle}>IMPORTANT</Text>
          {["This card is the property of the Government of Tanzania.", "It is valid for educational identification nationwide.", "Report loss of this card to your school immediately.", "This card is not transferable."].map((item, i) => (
            <Text key={i} style={f.bImportItem}>• {item}</Text>
          ))}
        </View>
      </View>

      {/* Stamp */}
      <View style={f.bRight}>
        <View style={f.bStamp}>
          <View style={f.bStampRow}>
            <Text style={f.bStampSm}>TANZANIA STUDENT</Text>
            <Text style={f.bStampBig}>TSID</Text>
            <Text style={f.bStampSm}>IDENTIFICATION{"\n"}SYSTEM</Text>
          </View>
        </View>
      </View>
    </View>

    {/* FOOTER TOP */}
    <View style={f.bFooterTop}>
      <View>
        <Text style={f.bFootPortalLabel}>🌐 VERIFICATION PORTAL</Text>
        <Text style={f.bFootPortalVal}>verify.tsid.go.tz</Text>
      </View>
      <View>
        <Text style={f.bFootIssuedLabel}>ISSUED ON</Text>
        <Text style={f.bFootIssuedVal}>{d.issueDate}</Text>
      </View>
    </View>

    {/* FOOTER BOTTOM */}
    <View style={f.bFooterBottom}>
      <Text style={f.bFootSecure}>{"🔒 This card contains secure data.\nUnauthorized use is prohibited by law."}</Text>
      <View>
        <Text style={f.bFootCountrySub}>JAMHURI YA MUUNGANO</Text>
        <Text style={f.bFootCountryTxt}>WA TANZANIA</Text>
      </View>
    </View>
  </View>
);

// ─── Main Document ────────────────────────────────────────────────────────────
export const ChetiMwanafunziPDF: React.FC<Props> = ({ application, lang = "sw", qrDataUrl }) => {
  const d = extractData(application);
  const qr = qrDataUrl || undefined;

  return (
    <Document>
      {/* Page 1: Front only */}
      <Page size="A6" style={f.page}>
        <Text style={f.cardLabel}>FRONT</Text>
        <FrontCard d={d} qrDataUrl={qr}/>
      </Page>

      {/* Page 2: Back only */}
      <Page size="A6" style={f.page}>
        <Text style={f.cardLabel}>BACK</Text>
        <BackCard d={d} qrDataUrl={qr}/>
      </Page>

      {/* Page 3: Combined printable (side by side on A5 landscape) */}
      <Page size={[420, 210]} style={f.combinedPage}>
        <View>
          <Text style={f.cardLabel}>FRONT</Text>
          <FrontCard d={d} qrDataUrl={qr}/>
        </View>
        <View>
          <Text style={f.cardLabel}>BACK</Text>
          <BackCard d={d} qrDataUrl={qr}/>
        </View>
      </Page>

      {/* Page 4: Receipt */}
      <ReceiptPage application={application} lang={lang} qrDataUrl={qr}/>
    </Document>
  );
};
export default ChetiMwanafunziPDF;
