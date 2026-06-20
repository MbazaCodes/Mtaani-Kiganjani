/**
 * ChetiMwanafunziPDF — TSID Student ID Card
 * Portrait card rendered at A4 scale — matches official TSID design exactly
 */
import React from "react";
import { Page, Text, View, Image, StyleSheet, Document } from "@react-pdf/renderer";
import { TANZANIA_LOGO_BASE64 } from "@/constants/logo";
import { Application } from "@/lib/supabase";
import { formatDate } from "./types";
import { ReceiptPage } from "./ReceiptPage";

interface Props { application: Application; lang?: "sw" | "en"; qrDataUrl?: string; }

// Portrait card: 86mm wide × 136mm tall (like a tall ID card)
const CW = 244;
const CH = 386;

const NAVY    = "#0a1628";
const NAVY2   = "#102040";
const GREEN   = "#16a34a";
const WHITE   = "#ffffff";
const LGRAY   = "#f0f4f8";
const MGRAY   = "#64748b";
const DGRAY   = "#1e293b";
const BORDER  = "#cbd5e1";

const s = StyleSheet.create({
  page: { backgroundColor: "#dde3ea", padding: 28, fontFamily: "Helvetica", flexDirection: "row", gap: 32 },

  // ── Card wrapper (front or back)
  cardWrap: { alignItems: "center" },
  cardLabel: { fontSize: 9, fontWeight: "bold", color: MGRAY, letterSpacing: 2, marginBottom: 6 },
  card: { width: CW, borderRadius: 10, overflow: "hidden", shadowColor: "#000", shadowOpacity: 0.18, shadowRadius: 8, shadowOffset: { width: 0, height: 3 } },

  // ══════════════ FRONT ══════════════
  // Top strip: logo + TSID + flag
  fHeader: { backgroundColor: NAVY, paddingHorizontal: 14, paddingVertical: 8, flexDirection: "row", alignItems: "center", gap: 8 },
  fLogo: { width: 26, height: 26 },
  fBrand: { flex: 1 },
  fTsidWord: { fontSize: 18, fontWeight: "bold", color: WHITE, lineHeight: 1 },
  fTsidSub:  { fontSize: 5.5, color: "#93c5fd", letterSpacing: 0.6, lineHeight: 1.3 },
  fFlag: { width: 28, height: 19, borderRadius: 3, overflow: "hidden" },
  fFlagG: { height: 6.3, backgroundColor: "#1eb53a" },
  fFlagY: { height: 6.3, backgroundColor: "#fcd116" },
  fFlagB: { height: 6.3, backgroundColor: "#00a3dd" },

  // Photo section (large, left-aligned, gray bg)
  fPhotoArea: { backgroundColor: LGRAY, paddingHorizontal: 14, paddingTop: 14, paddingBottom: 10, flexDirection: "row", alignItems: "flex-start", gap: 0 },
  fPhoto: { width: 90, height: 114, borderRadius: 6, overflow: "hidden", borderWidth: 2, borderColor: NAVY },
  fPhotoImg: { width: 90, height: 114, objectFit: "cover" },
  fPhotoPlaceholder: { width: 90, height: 114, backgroundColor: "#cbd5e1", alignItems: "center", justifyContent: "center" },
  fPhotoPlText: { fontSize: 7, color: "#94a3b8", textAlign: "center" },

  // Info panel beside photo
  fInfo: { flex: 1, paddingLeft: 12, paddingTop: 2 },
  fTsidNumLabel: { fontSize: 6, color: MGRAY, fontWeight: "bold", letterSpacing: 0.8, textTransform: "uppercase" },
  fTsidNum: { fontSize: 11, fontWeight: "bold", color: GREEN, fontFamily: "Courier", letterSpacing: 0.3, marginBottom: 2, borderBottomWidth: 1, borderBottomColor: GREEN, paddingBottom: 4, marginBottom: 6 },
  fField: { marginBottom: 5 },
  fFieldLabel: { fontSize: 5.5, color: MGRAY, fontWeight: "bold", letterSpacing: 0.7, textTransform: "uppercase" },
  fFieldValue: { fontSize: 9, fontWeight: "bold", color: DGRAY, lineHeight: 1.2 },

  // School + QR row
  fSchoolQR: { backgroundColor: WHITE, paddingHorizontal: 14, paddingVertical: 10, flexDirection: "row", alignItems: "flex-end", justifyContent: "space-between", borderTopWidth: 1, borderTopColor: BORDER },
  fSchoolLeft: { flexDirection: "row", alignItems: "center", gap: 8, flex: 1 },
  fSchoolIcon: { width: 28, height: 28, backgroundColor: NAVY, borderRadius: 6, alignItems: "center", justifyContent: "center" },
  fSchoolIconTxt: { fontSize: 13, color: WHITE },
  fSchoolInfo: { flex: 1 },
  fSchoolName: { fontSize: 8, fontWeight: "bold", color: NAVY, lineHeight: 1.3 },
  fSchoolMeta: { fontSize: 6, color: MGRAY, marginTop: 1 },
  fQrBlock: { alignItems: "center" },
  fQrImg: { width: 52, height: 52 },
  fQrLbl: { fontSize: 5, color: MGRAY, letterSpacing: 0.5, marginTop: 2 },

  // Footer icons
  fFooterIcons: { backgroundColor: NAVY, paddingHorizontal: 10, paddingVertical: 7, flexDirection: "row", justifyContent: "space-around" },
  fFooterItem: { alignItems: "center", gap: 2 },
  fFooterTxt: { fontSize: 5, color: "#93c5fd", fontWeight: "bold", textAlign: "center", letterSpacing: 0.5, lineHeight: 1.4 },
  // Flag bar
  fBar: { flexDirection: "row", height: 5 },
  fBarG: { flex: 1, backgroundColor: "#1eb53a" },
  fBarY: { flex: 1, backgroundColor: "#fcd116" },
  fBarB: { flex: 1, backgroundColor: "#00a3dd" },

  // ══════════════ BACK ══════════════
  bCard: { width: CW, borderRadius: 10, overflow: "hidden" },
  bHeader: { backgroundColor: NAVY, paddingHorizontal: 14, paddingVertical: 10 },
  bHeaderNum: { fontSize: 16, fontWeight: "bold", color: WHITE, fontFamily: "Courier", letterSpacing: 0.5 },

  bBody: { backgroundColor: WHITE, paddingHorizontal: 14, paddingTop: 12, paddingBottom: 10, flexDirection: "row", gap: 10 },
  bLeft: { flex: 1 },
  bRight: { width: 68, alignItems: "center", gap: 8 },

  bSection: { marginBottom: 10 },
  bSectionTitle: { fontSize: 7, fontWeight: "bold", color: GREEN, letterSpacing: 1, textTransform: "uppercase", borderBottomWidth: 0.75, borderBottomColor: GREEN, paddingBottom: 2, marginBottom: 6 },
  bRow: { flexDirection: "row", marginBottom: 3.5 },
  bLabel: { fontSize: 5.5, color: MGRAY, fontWeight: "bold", textTransform: "uppercase", letterSpacing: 0.4, width: 72 },
  bValue: { flex: 1, fontSize: 7, color: DGRAY, fontWeight: "bold" },

  // Important box
  bImportant: { borderWidth: 0.75, borderColor: GREEN, borderRadius: 4, padding: 7, marginTop: 2 },
  bImportTitle: { fontSize: 6.5, fontWeight: "bold", color: GREEN, marginBottom: 4 },
  bImportItem: { fontSize: 5.5, color: MGRAY, marginBottom: 2, lineHeight: 1.4 },

  // Stamp
  bStamp: { width: 60, height: 60, borderRadius: 30, borderWidth: 1.5, borderColor: NAVY2, borderStyle: "dashed", alignItems: "center", justifyContent: "center" },
  bStampTxt: { fontSize: 5, color: NAVY2, textAlign: "center", letterSpacing: 0.3, lineHeight: 1.4 },
  bStampBig: { fontSize: 11, fontWeight: "bold", color: NAVY2 },
  bQr: { width: 52, height: 52 },

  bFooter: { backgroundColor: NAVY, paddingHorizontal: 14, paddingVertical: 8, flexDirection: "row", justifyContent: "space-between", alignItems: "flex-end" },
  bFootLeft: { gap: 1.5 },
  bFootLbl: { fontSize: 5, color: "#60a5fa", fontWeight: "bold", letterSpacing: 0.5 },
  bFootVal: { fontSize: 5.5, color: "#93c5fd" },
  bFootRight: { alignItems: "flex-end", gap: 1 },
  bFootDate: { fontSize: 6, color: WHITE, fontWeight: "bold" },
  bFootCountry: { fontSize: 5.5, color: "#93c5fd" },
});

const EDU_SHORT: Record<string, string> = {
  CHEKECHEA: "PRE-PRIMARY", MSINGI: "PRIMARY SCHOOL",
  SEKONDARI_O: "SECONDARY (O-LEVEL)", SEKONDARI_A: "SECONDARY (A-LEVEL)",
  STASHAHADA: "DIPLOMA", SHAHADA: "UNIVERSITY DEGREE", UZAMILI: "MASTERS/PHD",
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
  const school      = (fd.school_name || "").toUpperCase();
  const region      = (fd.student_region || application.region || "").toUpperCase();
  const district    = (fd.student_district || application.district || "").toUpperCase();
  const admNo       = fd.admission_number || fd.student_number || "";
  const level       = EDU_SHORT[fd.education_level] || (fd.education_level || "").toUpperCase();
  const classYear   = fd.class_year === "OTHER" ? fd.class_year_manual : (fd.class_year || "—");
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

  const FrontCard = () => (
    <View style={s.card}>
      {/* Header */}
      <View style={s.fHeader}>
        {TANZANIA_LOGO_BASE64 ? <Image src={TANZANIA_LOGO_BASE64} style={s.fLogo}/> : null}
        <View style={s.fBrand}>
          <Text style={s.fTsidWord}>TSID</Text>
          <Text style={s.fTsidSub}>TANZANIA STUDENT{"\n"}IDENTIFICATION SYSTEM</Text>
        </View>
        <View style={s.fFlag}>
          <View style={s.fFlagG}/><View style={s.fFlagY}/><View style={s.fFlagB}/>
        </View>
      </View>

      {/* Photo + info */}
      <View style={s.fPhotoArea}>
        {/* Photo */}
        <View style={s.fPhoto}>
          {photo
            ? <Image src={photo} style={s.fPhotoImg}/>
            : <View style={s.fPhotoPlaceholder}><Text style={s.fPhotoPlText}>{"PICHA\nPHOTO"}</Text></View>}
        </View>

        {/* Info */}
        <View style={s.fInfo}>
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
          <View style={s.fSchoolInfo}>
            <Text style={s.fSchoolName}>{school}</Text>
            {admNo ? <Text style={s.fSchoolMeta}>SCHOOL ID: {admNo}</Text> : null}
            <Text style={s.fSchoolMeta}>REGION:   {region}</Text>
            <Text style={s.fSchoolMeta}>DISTRICT: {district}</Text>
          </View>
        </View>
        <View style={s.fQrBlock}>
          {qrDataUrl
            ? <Image src={qrDataUrl} style={s.fQrImg}/>
            : <View style={[s.fQrImg, { backgroundColor: LGRAY, alignItems: "center", justifyContent: "center" }]}>
                <Text style={{ fontSize: 6, color: MGRAY }}>QR CODE</Text>
              </View>}
          <Text style={s.fQrLbl}>SCAN TO VERIFY</Text>
        </View>
      </View>

      {/* Footer icons */}
      <View style={s.fFooterIcons}>
        <View style={s.fFooterItem}>
          <Text style={{ fontSize: 14, color: "#60a5fa" }}>🛡</Text>
          <Text style={s.fFooterTxt}>{"LIFELONG\nSTUDENT ID"}</Text>
        </View>
        <View style={s.fFooterItem}>
          <Text style={{ fontSize: 14, color: "#60a5fa" }}>✦</Text>
          <Text style={s.fFooterTxt}>{"NATIONALY\nRECOGNIZED"}</Text>
        </View>
        <View style={s.fFooterItem}>
          <Text style={{ fontSize: 14, color: "#60a5fa" }}>✓</Text>
          <Text style={s.fFooterTxt}>{"SECURE\n& VERIFIED"}</Text>
        </View>
      </View>
      {/* Color bar */}
      <View style={s.fBar}>
        <View style={s.fBarG}/><View style={s.fBarY}/><View style={s.fBarB}/>
      </View>
    </View>
  );

  const BackCard = () => (
    <View style={s.bCard}>
      {/* Header */}
      <View style={s.bHeader}>
        <Text style={s.bHeaderNum}>{tsid}</Text>
      </View>

      {/* Body */}
      <View style={s.bBody}>
        <View style={s.bLeft}>
          {/* Student Info */}
          <View style={s.bSection}>
            <Text style={s.bSectionTitle}>STUDENT INFORMATION</Text>
            <View style={s.bRow}><Text style={s.bLabel}>DATE OF ENROLLMENT</Text><Text style={s.bValue}>{enrollDate}</Text></View>
            <View style={s.bRow}><Text style={s.bLabel}>CURRENT LEVEL</Text><Text style={s.bValue}>{level}</Text></View>
            <View style={s.bRow}><Text style={s.bLabel}>CLASS / YEAR</Text><Text style={s.bValue}>{classYear}</Text></View>
            <View style={s.bRow}><Text style={s.bLabel}>BLOOD GROUP</Text><Text style={s.bValue}>{bloodGroup}</Text></View>
            <View style={s.bRow}><Text style={s.bLabel}>PHONE (GUARDIAN)</Text><Text style={s.bValue}>{parentPhone}</Text></View>
          </View>

          {/* Parent / Guardian */}
          <View style={s.bSection}>
            <Text style={s.bSectionTitle}>PARENT / GUARDIAN</Text>
            <View style={s.bRow}><Text style={s.bLabel}>NAME</Text><Text style={s.bValue}>{parentName}</Text></View>
            <View style={s.bRow}><Text style={s.bLabel}>NIDA NUMBER</Text><Text style={s.bValue}>{parentNida}</Text></View>
            <View style={s.bRow}><Text style={s.bLabel}>RELATIONSHIP</Text><Text style={s.bValue}>{parentRel}</Text></View>
            <View style={s.bRow}><Text style={s.bLabel}>PHONE</Text><Text style={s.bValue}>{parentPhone}</Text></View>
          </View>

          {/* Important */}
          <View style={s.bImportant}>
            <Text style={s.bImportTitle}>IMPORTANT</Text>
            <Text style={s.bImportItem}>• This card is the property of the Government of Tanzania.</Text>
            <Text style={s.bImportItem}>• It is valid for educational identification nationwide.</Text>
            <Text style={s.bImportItem}>• Report loss of this card to your school immediately.</Text>
            <Text style={s.bImportItem}>• This card is not transferable.</Text>
          </View>
        </View>

        {/* Right: stamp + QR */}
        <View style={s.bRight}>
          <View style={s.bStamp}>
            <Text style={s.bStampTxt}>TANZANIA STUDENT</Text>
            <Text style={s.bStampBig}>TSID</Text>
            <Text style={s.bStampTxt}>IDENTIFICATION{"\n"}SYSTEM</Text>
          </View>
          {qrDataUrl ? <Image src={qrDataUrl} style={s.bQr}/> : null}
        </View>
      </View>

      {/* Footer */}
      <View style={s.bFooter}>
        <View style={s.bFootLeft}>
          <Text style={s.bFootLbl}>🌐 VERIFICATION PORTAL</Text>
          <Text style={s.bFootVal}>verify.tsid.go.tz</Text>
          <Text style={{ fontSize: 4.5, color: "#64748b", marginTop: 4 }}>🔒 This card contains secure data. Unauthorized use is prohibited by law.</Text>
        </View>
        <View style={s.bFootRight}>
          <Text style={s.bFootLbl}>ISSUED ON</Text>
          <Text style={s.bFootDate}>{issueDate}</Text>
          <Text style={s.bFootCountry}>JAMHURI YA MUUNGANO</Text>
          <Text style={[s.bFootDate, { marginTop: 0 }]}>WA TANZANIA</Text>
        </View>
      </View>
    </View>
  );

  return (
    <Document>
      <Page size="A4" style={s.page}>
        {/* FRONT */}
        <View style={s.cardWrap}>
          <Text style={s.cardLabel}>FRONT</Text>
          <FrontCard/>
        </View>
        {/* BACK */}
        <View style={s.cardWrap}>
          <Text style={s.cardLabel}>BACK</Text>
          <BackCard/>
        </View>
      </Page>
      <ReceiptPage application={application} lang={lang} qrDataUrl={qrDataUrl}/>
    </Document>
  );
};
export default ChetiMwanafunziPDF;
