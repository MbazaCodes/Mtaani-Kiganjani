/**
 * ChetiMwanafunziPDF — TSID Student ID Card
 * CR80: 85.60mm × 53.98mm
 * Scaled to fill A5 landscape page properly
 * Page 1 = Front, Page 2 = Back, Page 3 = Combined, Page 4 = Receipt
 */
import React from "react";
import { Page, Text, View, Image, StyleSheet, Document } from "@react-pdf/renderer";
import { TANZANIA_LOGO_BASE64 } from "@/constants/logo";
import { Application } from "@/lib/supabase";
import { formatDate } from "./types";
import { ReceiptPage } from "./ReceiptPage";

interface Props { application: Application; lang?: "sw" | "en"; qrDataUrl?: string; }

// Scale card up to fill a landscape A5 page nicely
// A5 landscape = 595 × 420pt. We render at 2× CR80 scale
const CW = 486;  // 85.60mm × 2 × 2.835 ≈ 486pt
const CH = 306;  // 53.98mm × 2 × 2.835 ≈ 306pt

// Colors from spec
const NAVY       = "#003366";
const GREEN      = "#1B8F3A";
const GREEN_L    = "#1A7A3A";
const YELLOW     = "#F5C400";
const RED        = "#D32F2F";
const WHITE      = "#FFFFFF";
const TEXT1      = "#111111";
const TEXT2      = "#444444";
const TEXT3      = "#777777";
const BG_LGRAY   = "#F2F4F8";
const BORDER_COL = "#E0E0E0";

const s = StyleSheet.create({
  // Single-card pages
  pageSingle: {
    backgroundColor: "#c8d0d8",
    padding: 0,
    fontFamily: "Helvetica",
    alignItems: "center",
    justifyContent: "center",
  },
  // Combined page (landscape A4)
  pageCombined: {
    backgroundColor: "#c8d0d8",
    padding: 24,
    fontFamily: "Helvetica",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 20,
  },
  labelWrap: { alignItems: "center", marginBottom: 8 },
  cardLabel: { fontSize: 11, fontWeight: "bold", color: "#4b5563", letterSpacing: 2 },

  // ═══ FRONT ═══
  fCard: {
    width: CW, height: CH,
    backgroundColor: WHITE,
    borderRadius: 10,
    overflow: "hidden",
    borderWidth: 2, borderColor: RED,
  },

  // Top strip
  fTop: {
    backgroundColor: NAVY,
    flexDirection: "row", alignItems: "center",
    paddingHorizontal: 12, paddingVertical: 8, gap: 8,
    height: 52,
  },
  fLogo: { width: 36, height: 36 },
  fBrand: { flex: 1 },
  fTsidWord: { fontSize: 22, fontWeight: "bold", color: WHITE, lineHeight: 1 },
  fTsidSub:  { fontSize: 7, color: "#9ab8d8", letterSpacing: 0.6, lineHeight: 1.5 },
  fFlag: { width: 40, height: 28, borderRadius: 3, overflow: "hidden" },
  fFlagG: { flex: 1, backgroundColor: "#1eb53a" },
  fFlagY: { flex: 1, backgroundColor: "#fcd116" },
  fFlagB: { flex: 1, backgroundColor: "#00a3dd" },

  // Body: 32% left | 68% right
  fBody: { flexDirection: "row", flex: 1 },

  // LEFT column
  fLeft: {
    width: CW * 0.33,
    borderRightWidth: 1, borderRightColor: BORDER_COL, borderRightStyle: "dashed",
    backgroundColor: BG_LGRAY,
    paddingTop: 10, paddingHorizontal: 10,
    alignItems: "center",
  },
  fPhotoBox: {
    width: 80, height: 100,
    borderWidth: 2, borderColor: GREEN_L,
    borderRadius: 4, overflow: "hidden",
    backgroundColor: "#D0DDD5",
    alignItems: "center", justifyContent: "center",
    marginBottom: 8,
  },
  fPhotoImg: { width: 80, height: 100, objectFit: "cover" },
  fPhotoTxt: { fontSize: 8, color: "#888", textAlign: "center" },
  fTsidLbl:  { fontSize: 6.5, fontWeight: "bold", color: TEXT3, letterSpacing: 0.5, textTransform: "uppercase", marginBottom: 2 },
  fTsidNum:  {
    fontSize: 9, fontWeight: "bold", color: RED,
    fontFamily: "Courier", letterSpacing: 0.3,
    borderBottomWidth: 1, borderBottomColor: RED,
    paddingBottom: 3, marginBottom: 5, textAlign: "center",
  },
  fNameLbl: { fontSize: 6, fontWeight: "bold", color: TEXT3, textTransform: "uppercase", marginBottom: 2 },
  fNameVal: { fontSize: 9, fontWeight: "bold", color: TEXT1, textAlign: "center", marginBottom: 6, lineHeight: 1.2 },
  // 3-col mini grid
  fMiniRow: { flexDirection: "row", width: "100%", gap: 2 },
  fMiniCell: { flex: 1, alignItems: "center" },
  fMiniLbl: { fontSize: 5, fontWeight: "bold", color: TEXT3, textTransform: "uppercase", textAlign: "center" },
  fMiniVal: { fontSize: 6.5, fontWeight: "bold", color: TEXT1, textAlign: "center", lineHeight: 1.3 },

  // RIGHT column
  fRight: {
    flex: 1,
    backgroundColor: WHITE,
    paddingTop: 10, paddingHorizontal: 10, paddingBottom: 6,
  },
  // School badge
  fSchoolBadge: {
    backgroundColor: GREEN_L,
    borderRadius: 4, padding: 7, marginBottom: 8,
    flexDirection: "row", alignItems: "flex-start", gap: 7,
  },
  fSchoolIcon: {
    width: 26, height: 26, backgroundColor: "#0F5020",
    borderRadius: 4, alignItems: "center", justifyContent: "center",
    flexShrink: 0,
  },
  fSchoolIconTxt: { fontSize: 14, color: WHITE },
  fSchoolInfo: { flex: 1 },
  fSchoolName: { fontSize: 8.5, fontWeight: "bold", color: WHITE, lineHeight: 1.35 },
  fSchoolMeta: { fontSize: 6.5, color: "#aee8be", marginTop: 2 },
  // Student info grid
  fInfoGrid: { flexDirection: "row", flexWrap: "wrap", marginBottom: 6 },
  fInfoCell: { width: "50%", marginBottom: 5, paddingRight: 4 },
  fInfoLbl: { fontSize: 5.5, fontWeight: "bold", color: TEXT3, textTransform: "uppercase", letterSpacing: 0.3 },
  fInfoVal: { fontSize: 8, fontWeight: "bold", color: TEXT1, lineHeight: 1.2 },
  fDivider: { height: 0.75, backgroundColor: BORDER_COL, marginVertical: 5 },
  // Guardian
  fGuardTitle: { fontSize: 6.5, fontWeight: "bold", color: GREEN_L, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 4 },
  fGuardGrid:  { flexDirection: "row", flexWrap: "wrap" },
  fGuardCell:  { width: "50%", marginBottom: 4, paddingRight: 4 },
  fGuardLbl:   { fontSize: 5, fontWeight: "bold", color: TEXT3, textTransform: "uppercase", letterSpacing: 0.3 },
  fGuardVal:   { fontSize: 7, fontWeight: "bold", color: TEXT1, lineHeight: 1.2 },
  // Important
  fImportBox: {
    backgroundColor: "#FFF8E1",
    borderLeftWidth: 3, borderLeftColor: YELLOW,
    padding: 5, marginTop: 4,
  },
  fImportTitle: { fontSize: 6, fontWeight: "bold", color: "#7a5800", marginBottom: 2 },
  fImportItem:  { fontSize: 5.5, color: TEXT2, marginBottom: 1.5, lineHeight: 1.4 },

  // Bottom bar
  fBottomBar: {
    backgroundColor: "rgba(26,122,58,0.05)",
    borderTopWidth: 3, borderTopColor: YELLOW,
    flexDirection: "row", alignItems: "center",
    paddingHorizontal: 10, paddingVertical: 5, gap: 8,
    height: 44,
  },
  fQrBox:  { alignItems: "center" },
  fQrImg:  { width: 30, height: 30 },
  fQrTxt:  { fontSize: 4.5, color: TEXT3, textAlign: "center", marginTop: 1 },
  fVerify: { flex: 1 },
  fVerifyLbl: { fontSize: 5.5, fontWeight: "bold", color: TEXT3 },
  fVerifyUrl: { fontSize: 7, fontWeight: "bold", color: GREEN_L },
  fIssued: {},
  fIssuedLbl: { fontSize: 5.5, fontWeight: "bold", color: TEXT3 },
  fIssuedVal: { fontSize: 6.5, fontWeight: "bold", color: TEXT1 },
  fLifelong: {
    backgroundColor: RED, borderRadius: 2,
    paddingHorizontal: 5, paddingVertical: 3,
  },
  fLifelongTxt: { fontSize: 5, fontWeight: "bold", color: WHITE, letterSpacing: 0.3, lineHeight: 1.5 },

  // ═══ BACK ═══
  bCard: {
    width: CW, height: CH,
    backgroundColor: WHITE,
    borderRadius: 10, overflow: "hidden",
    borderWidth: 2, borderColor: RED,
  },
  bHeader: {
    backgroundColor: NAVY,
    paddingHorizontal: 16, paddingVertical: 12, height: 52,
    justifyContent: "center",
  },
  bHeaderNum: { fontSize: 18, fontWeight: "bold", color: WHITE, fontFamily: "Courier", letterSpacing: 1 },

  bBody: {
    flex: 1, flexDirection: "row",
    paddingHorizontal: 14, paddingTop: 10, paddingBottom: 6, gap: 10,
  },
  bLeft: { flex: 1 },
  bSecTitle: {
    fontSize: 8, fontWeight: "bold", color: GREEN_L,
    textTransform: "uppercase", letterSpacing: 0.8,
    borderBottomWidth: 1, borderBottomColor: GREEN_L,
    paddingBottom: 3, marginBottom: 6,
  },
  bRow: { flexDirection: "row", marginBottom: 5 },
  bLbl: { width: 90, fontSize: 6, fontWeight: "bold", color: TEXT3, textTransform: "uppercase", letterSpacing: 0.3 },
  bVal: { flex: 1, fontSize: 8, fontWeight: "bold", color: TEXT1 },
  bDivider: { height: 0.75, backgroundColor: "#c0ced8", marginVertical: 6 },
  bImportBox: {
    borderWidth: 0.75, borderColor: "#a0cca0",
    backgroundColor: "#f4fff4", borderRadius: 3,
    padding: 6, marginTop: 4,
  },
  bImportTitle: { fontSize: 6.5, fontWeight: "bold", color: GREEN_L, marginBottom: 3 },
  bImportItem:  { fontSize: 5.5, color: TEXT2, marginBottom: 2, lineHeight: 1.5 },

  // Stamp
  bRight: { width: 80, alignItems: "center", paddingTop: 8 },
  bStamp: {
    width: 70, height: 70,
    borderRadius: 35,
    borderWidth: 2, borderColor: "#2a4a7a", borderStyle: "dashed",
    alignItems: "center", justifyContent: "center",
  },
  bStampSm:  { fontSize: 5, color: "#2a4a7a", textAlign: "center", letterSpacing: 0.3, lineHeight: 1.5 },
  bStampBig: { fontSize: 14, fontWeight: "bold", color: "#2a4a7a" },

  // Back footers
  bFootTop: {
    flexDirection: "row", justifyContent: "space-between",
    paddingHorizontal: 14, paddingVertical: 6,
    borderTopWidth: 0.75, borderTopColor: BORDER_COL,
  },
  bFootPortalLbl: { fontSize: 6.5, fontWeight: "bold", color: TEXT3, letterSpacing: 0.5 },
  bFootPortalVal: { fontSize: 8, fontWeight: "bold", color: GREEN_L },
  bFootIssuedLbl: { fontSize: 6.5, fontWeight: "bold", color: TEXT3, textAlign: "right" },
  bFootIssuedVal: { fontSize: 8, fontWeight: "bold", color: TEXT1, textAlign: "right" },

  bFootBottom: {
    backgroundColor: NAVY, flexDirection: "row",
    paddingHorizontal: 14, paddingVertical: 7,
    justifyContent: "space-between", alignItems: "center",
    height: 36,
  },
  bFootSecure:     { fontSize: 5.5, color: "#8ab4d8", flex: 1, lineHeight: 1.6 },
  bFootCountrySub: { fontSize: 6, color: "#8ab4d8", textAlign: "right" },
  bFootCountryMain:{ fontSize: 7.5, fontWeight: "bold", color: WHITE, textAlign: "right" },
});

const EDU: Record<string, string> = {
  CHEKECHEA: "PRE-PRIMARY", MSINGI: "PRIMARY SCHOOL",
  SEKONDARI_O: "SECONDARY (O-LEVEL)", SEKONDARI_A: "SECONDARY (A-LEVEL)",
  STASHAHADA: "DIPLOMA", SHAHADA: "UNIVERSITY DEGREE", UZAMILI: "MASTERS/PHD",
};

function getData(app: Application) {
  const fd = (app.form_data || {}) as Record<string, string>;
  return {
    studentName: (fd.student_name || `${fd.student_first || ""} ${fd.student_last || ""}`.trim()).toUpperCase(),
    tsid:        fd.generated_student_id || app.application_number,
    photo:       fd.student_photo || null,
    dob:         fd.student_dob ? new Date(fd.student_dob).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }).toUpperCase() : "—",
    gender:      fd.student_sex === "M" ? "MALE" : fd.student_sex === "F" ? "FEMALE" : "—",
    nationality: (fd.nationality || "TANZANIAN").toUpperCase(),
    school:      (fd.school_name || "—").toUpperCase(),
    admNo:       fd.admission_number || fd.student_number || "",
    region:      (fd.student_region || app.region || "—").toUpperCase(),
    district:    (fd.student_district || app.district || "—").toUpperCase(),
    level:       EDU[fd.education_level] || (fd.education_level || "—").toUpperCase(),
    classYear:   fd.class_year === "OTHER" ? (fd.class_year_manual || "—") : (fd.class_year || "—"),
    bloodGroup:  fd.blood_group || "—",
    enrollDate:  fd.enrollment_date ? new Date(fd.enrollment_date).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }).toUpperCase() : formatDate(app.created_at).toUpperCase(),
    parentName:  (fd.parent_name || "—").toUpperCase(),
    parentNida:  fd.parent_nida ? fd.parent_nida.replace(/^(\d{4})\d+(\d{3})$/, "$1***$2") : "—",
    parentPhone: fd.parent_phone || "—",
    parentRel:   fd.parent_relationship === "MAMA" ? "MOTHER" : fd.parent_relationship === "BABA" ? "FATHER" : (fd.parent_relationship || "GUARDIAN").toUpperCase(),
    issueDate:   formatDate(app.created_at).toUpperCase(),
  };
}

const Front: React.FC<{ d: ReturnType<typeof getData>; qr?: string }> = ({ d, qr }) => (
  <View style={s.fCard}>
    {/* Top strip */}
    <View style={s.fTop}>
      {TANZANIA_LOGO_BASE64 ? <Image src={TANZANIA_LOGO_BASE64} style={s.fLogo}/> : null}
      <View style={s.fBrand}>
        <Text style={s.fTsidWord}>TSID</Text>
        <Text style={s.fTsidSub}>TANZANIA STUDENT IDENTIFICATION SYSTEM</Text>
      </View>
      <View style={s.fFlag}>
        <View style={s.fFlagG}/><View style={s.fFlagY}/><View style={s.fFlagB}/>
      </View>
    </View>

    {/* Body */}
    <View style={s.fBody}>
      {/* LEFT */}
      <View style={s.fLeft}>
        <View style={s.fPhotoBox}>
          {d.photo ? <Image src={d.photo} style={s.fPhotoImg}/> : <Text style={s.fPhotoTxt}>{"[PHOTO]"}</Text>}
        </View>
        <Text style={s.fTsidLbl}>TSID NUMBER</Text>
        <Text style={s.fTsidNum}>{d.tsid}</Text>
        <Text style={s.fNameLbl}>FULL NAME</Text>
        <Text style={s.fNameVal}>{d.studentName}</Text>
        <View style={s.fMiniRow}>
          {[["DOB", d.dob], ["GENDER", d.gender], ["NATIONALITY", d.nationality]].map(([l, v]) => (
            <View key={l} style={s.fMiniCell}>
              <Text style={s.fMiniLbl}>{l}</Text>
              <Text style={s.fMiniVal}>{v}</Text>
            </View>
          ))}
        </View>
      </View>

      {/* RIGHT */}
      <View style={s.fRight}>
        {/* School badge */}
        <View style={s.fSchoolBadge}>
          <View style={s.fSchoolIcon}><Text style={s.fSchoolIconTxt}>📚</Text></View>
          <View style={s.fSchoolInfo}>
            <Text style={s.fSchoolName}>{d.school}</Text>
            <Text style={s.fSchoolMeta}>{d.admNo ? `SCHOOL ID: ${d.admNo}   ` : ""}{d.region} · {d.district}</Text>
          </View>
        </View>
        {/* Student info */}
        <View style={s.fInfoGrid}>
          {[["Enrollment", d.enrollDate], ["Level", d.level], ["Blood Group", d.bloodGroup], ["Guardian Phone", d.parentPhone]].map(([l, v]) => (
            <View key={l} style={s.fInfoCell}>
              <Text style={s.fInfoLbl}>{l}</Text>
              <Text style={s.fInfoVal}>{v}</Text>
            </View>
          ))}
        </View>
        <View style={s.fDivider}/>
        {/* Guardian */}
        <Text style={s.fGuardTitle}>PARENT / GUARDIAN</Text>
        <View style={s.fGuardGrid}>
          {[["Name", d.parentName], ["NIDA", d.parentNida], ["Relation", d.parentRel], ["Phone", d.parentPhone]].map(([l, v]) => (
            <View key={l} style={s.fGuardCell}>
              <Text style={s.fGuardLbl}>{l}</Text>
              <Text style={s.fGuardVal}>{v}</Text>
            </View>
          ))}
        </View>
        {/* Important */}
        <View style={s.fImportBox}>
          <Text style={s.fImportTitle}>IMPORTANT</Text>
          {["Property of Govt. of Tanzania.", "Valid nationwide.", "Report loss immediately.", "Not transferable."].map((t, i) => (
            <Text key={i} style={s.fImportItem}>• {t}</Text>
          ))}
        </View>
      </View>
    </View>

    {/* Bottom bar */}
    <View style={s.fBottomBar}>
      <View style={s.fQrBox}>
        {qr ? <Image src={qr} style={s.fQrImg}/> : <View style={[s.fQrImg, { backgroundColor: "#dde8dd", alignItems: "center", justifyContent: "center" }]}><Text style={{ fontSize: 7, color: "#888" }}>QR</Text></View>}
        <Text style={s.fQrTxt}>SCAN TO VERIFY</Text>
      </View>
      <View style={s.fVerify}>
        <Text style={s.fVerifyLbl}>VERIFY AT</Text>
        <Text style={s.fVerifyUrl}>verify.tsid.go.tz</Text>
      </View>
      <View style={s.fIssued}>
        <Text style={s.fIssuedLbl}>ISSUED</Text>
        <Text style={s.fIssuedVal}>{d.issueDate}</Text>
      </View>
      <View style={s.fLifelong}>
        <Text style={s.fLifelongTxt}>{"LIFELONG ·\nNATIONAL ·\nSECURE"}</Text>
      </View>
    </View>
  </View>
);

const Back: React.FC<{ d: ReturnType<typeof getData> }> = ({ d }) => (
  <View style={s.bCard}>
    <View style={s.bHeader}>
      <Text style={s.bHeaderNum}>{d.tsid}</Text>
    </View>
    <View style={s.bBody}>
      <View style={s.bLeft}>
        <Text style={s.bSecTitle}>STUDENT INFORMATION</Text>
        {[["DATE OF ENROLLMENT", d.enrollDate], ["CURRENT LEVEL", d.level], ["CLASS / YEAR", d.classYear], ["BLOOD GROUP", d.bloodGroup], ["PHONE (GUARDIAN)", d.parentPhone]].map(([l, v]) => (
          <View key={l} style={s.bRow}><Text style={s.bLbl}>{l}</Text><Text style={s.bVal}>{v}</Text></View>
        ))}
        <View style={s.bDivider}/>
        <Text style={s.bSecTitle}>PARENT / GUARDIAN</Text>
        {[["NAME", d.parentName], ["NIDA NUMBER", d.parentNida], ["RELATIONSHIP", d.parentRel], ["PHONE", d.parentPhone]].map(([l, v]) => (
          <View key={l} style={s.bRow}><Text style={s.bLbl}>{l}</Text><Text style={s.bVal}>{v}</Text></View>
        ))}
        <View style={s.bImportBox}>
          <Text style={s.bImportTitle}>IMPORTANT</Text>
          {["This card is the property of the Government of Tanzania.", "It is valid for educational identification nationwide.", "Report loss of this card to your school immediately.", "This card is not transferable."].map((t, i) => (
            <Text key={i} style={s.bImportItem}>• {t}</Text>
          ))}
        </View>
      </View>
      <View style={s.bRight}>
        <View style={s.bStamp}>
          <Text style={s.bStampSm}>TANZANIA STUDENT</Text>
          <Text style={s.bStampBig}>TSID</Text>
          <Text style={s.bStampSm}>IDENTIFICATION{"\n"}SYSTEM</Text>
        </View>
      </View>
    </View>
    <View style={s.bFootTop}>
      <View>
        <Text style={s.bFootPortalLbl}>🌐 VERIFICATION PORTAL</Text>
        <Text style={s.bFootPortalVal}>verify.tsid.go.tz</Text>
      </View>
      <View>
        <Text style={s.bFootIssuedLbl}>ISSUED ON</Text>
        <Text style={s.bFootIssuedVal}>{d.issueDate}</Text>
      </View>
    </View>
    <View style={s.bFootBottom}>
      <Text style={s.bFootSecure}>{"🔒 This card contains secure data.\nUnauthorized use is prohibited by law."}</Text>
      <View>
        <Text style={s.bFootCountrySub}>JAMHURI YA MUUNGANO</Text>
        <Text style={s.bFootCountryMain}>WA TANZANIA</Text>
      </View>
    </View>
  </View>
);

export const ChetiMwanafunziPDF: React.FC<Props> = ({ application, lang = "sw", qrDataUrl }) => {
  const d = getData(application);
  const qr = qrDataUrl || undefined;

  // A5 landscape = [595, 420]. Card fits with padding
  const cardPage = [CW + 48, CH + 48] as [number, number];

  return (
    <Document>
      {/* Page 1: Front */}
      <Page size={cardPage} style={s.pageSingle}>
        <Front d={d} qr={qr}/>
      </Page>

      {/* Page 2: Back */}
      <Page size={cardPage} style={s.pageSingle}>
        <Back d={d}/>
      </Page>

      {/* Page 3: Combined side-by-side on A4 landscape */}
      <Page size={[842, 380]} style={s.pageCombined}>
        <View style={s.labelWrap}><Text style={s.cardLabel}>FRONT</Text><Front d={d} qr={qr}/></View>
        <View style={s.labelWrap}><Text style={s.cardLabel}>BACK</Text><Back d={d}/></View>
      </Page>

      {/* Page 4: Receipt */}
      <ReceiptPage application={application} lang={lang} qrDataUrl={qr}/>
    </Document>
  );
};
export default ChetiMwanafunziPDF;
