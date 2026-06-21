/**
 * ChetiMwanafunziLetterPDF — Official Introduction Letter for Student
 * A formal government letter introducing the student to institutions
 */
import React from "react";
import { Page, Text, View, Image, StyleSheet, Document } from "@react-pdf/renderer";
import { TANZANIA_LOGO_BASE64 } from "@/constants/logo";
import { generateQRDataUrl } from "@/lib/qr";
import { Application } from "@/lib/supabase";
import { formatDate } from "./types";

interface Props { application: Application; lang?: "sw" | "en"; qrDataUrl?: string; }

const NAVY  = "#0d1f3c";
const GREEN = "#1a7a3c";
const GRAY  = "#6b7280";
const DARK  = "#111827";
const LGRAY = "#f8fafc";

const s = StyleSheet.create({
  page: {
    backgroundColor: "#ffffff",
    padding: 50,
    fontFamily: "Helvetica",
    fontSize: 10,
    color: DARK,
  },

  // Letterhead
  letterhead: {
    flexDirection: "row", alignItems: "center",
    borderBottomWidth: 3, borderBottomColor: NAVY,
    paddingBottom: 12, marginBottom: 20, gap: 14,
  },
  logo: { width: 56, height: 56 },
  govInfo: { flex: 1 },
  govCountry: { fontSize: 11, fontWeight: "bold", color: NAVY, letterSpacing: 0.5 },
  govOffice1: { fontSize: 8.5, color: GRAY, marginTop: 2 },
  govOffice2: { fontSize: 8.5, color: GRAY },
  govRef:     { fontSize: 7.5, color: GRAY, marginTop: 4 },

  // Green accent bar under letterhead
  accentBar: { height: 2, backgroundColor: GREEN, marginBottom: 20 },

  // Reference + Date row
  refDateRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 20 },
  refBox: {},
  refLabel: { fontSize: 7.5, color: GRAY, fontWeight: "bold", letterSpacing: 0.5, textTransform: "uppercase" },
  refValue: { fontSize: 9, fontWeight: "bold", color: DARK, marginTop: 2 },
  dateBox: { alignItems: "flex-end" },

  // Recipient
  recipientBox: { marginBottom: 18 },
  recipientLine: { fontSize: 9.5, color: DARK, lineHeight: 1.6 },
  recipientBold: { fontSize: 9.5, fontWeight: "bold", color: DARK },

  // Subject line
  subjectRow: { flexDirection: "row", alignItems: "center", marginBottom: 20, gap: 6 },
  subjectLabel: { fontSize: 9, fontWeight: "bold", color: GRAY, textTransform: "uppercase", letterSpacing: 0.5 },
  subjectText:  { fontSize: 10, fontWeight: "bold", color: NAVY, flex: 1, textTransform: "uppercase" },

  // Body
  paragraph: { fontSize: 9.5, lineHeight: 1.75, marginBottom: 14, textAlign: "justify" },
  bold: { fontWeight: "bold" },

  // Student info box
  studentBox: {
    borderWidth: 1, borderColor: "#d1d9e0", borderRadius: 4,
    padding: 14, backgroundColor: LGRAY, marginBottom: 18,
  },
  studentBoxTitle: {
    fontSize: 8, fontWeight: "bold", color: NAVY,
    textTransform: "uppercase", letterSpacing: 0.8,
    borderBottomWidth: 0.5, borderBottomColor: "#d1d9e0",
    paddingBottom: 4, marginBottom: 8,
  },
  studentRow: { flexDirection: "row", marginBottom: 4 },
  studentLabel: { width: 120, fontSize: 8.5, color: GRAY, fontWeight: "bold" },
  studentValue: { flex: 1, fontSize: 8.5, fontWeight: "bold", color: DARK },

  // TSID highlight
  tsidBox: {
    backgroundColor: NAVY, borderRadius: 4,
    paddingHorizontal: 12, paddingVertical: 6,
    alignSelf: "flex-start", marginBottom: 18,
  },
  tsidLabel: { fontSize: 6, color: "#9ab8d8", fontWeight: "bold", letterSpacing: 1 },
  tsidNum:   { fontSize: 14, fontWeight: "bold", color: "#ffffff", fontFamily: "Courier" },

  // Closing
  closing: { marginTop: 24 },
  closingLine: { fontSize: 9.5, lineHeight: 1.6 },

  // Signature
  signatureBlock: { marginTop: 32 },
  signatureLine: { height: 0.5, backgroundColor: DARK, width: 160, marginBottom: 4 },
  signatureTitle: { fontSize: 8.5, fontWeight: "bold", color: DARK },
  signatureOffice: { fontSize: 8, color: GRAY },

  // Footer
  footer: {
    position: "absolute", bottom: 30, left: 50, right: 50,
    borderTopWidth: 0.5, borderTopColor: "#d1d9e0",
    paddingTop: 8, flexDirection: "row",
    justifyContent: "space-between", alignItems: "center",
  },
  footerLeft: { fontSize: 7, color: GRAY },
  footerRight: { fontSize: 7, color: GRAY, textAlign: "right" },
  footerGreen: { fontSize: 7, color: GREEN, fontWeight: "bold" },

  // QR
  qrBox: { position: "absolute", bottom: 50, right: 50, alignItems: "center" },
  qrImg: { width: 56, height: 56 },
  qrLabel: { fontSize: 5.5, color: GRAY, textAlign: "center", marginTop: 3 },

  // Watermark-style seal
  seal: {
    position: "absolute", top: 180, right: 50,
    width: 80, height: 80, opacity: 0.06,
  },
});

const EDU_FULL: Record<string, string> = {
  CHEKECHEA: "Chekechea / Pre-Primary", MSINGI: "Shule ya Msingi / Primary School",
  SEKONDARI_O: "Sekondari O-Level / Secondary (Form 1-4)",
  SEKONDARI_A: "Sekondari A-Level / Secondary (Form 5-6)",
  STASHAHADA: "Stashahada / Diploma", SHAHADA: "Shahada / University Degree",
  UZAMILI: "Uzamili/Uzamivu / Masters or PhD",
};

const PURPOSE_FULL: Record<string, string> = {
  BIMA: "kupata huduma za Bima ya Afya / NHIF (Health Insurance)",
  MKOPO: "kuomba mkopo wa elimu kupitia HESLB (Student Loan)",
  AJIRA: "maombi ya kazi au internship (Job / Internship Application)",
  BENKI: "kufungua akaunti ya benki (Bank Account Opening)",
  NAULI: "kupata punguzo la nauli (Transport Discount)",
  PASIPOTI: "kuomba pasipoti au visa (Passport / Visa Application)",
  USAJILI: "usajili wa mtandao au huduma (Online Registration / Services)",
  NYINGINE: "madhumuni maalum (Special Purpose)",
};

export const ChetiMwanafunziLetterPDF: React.FC<Props> = ({ application, lang = "sw", qrDataUrl }) => {
  const [internalQr, setInternalQr] = React.useState<string | undefined>(undefined);
  React.useEffect(() => {
    if (!qrDataUrl) {
      generateQRDataUrl(application, "CHE").then(url => setInternalQr(url || undefined));
    }
  }, [application, qrDataUrl]);
  const resolvedQr = qrDataUrl || internalQr;
  const fd = (application.form_data || {}) as Record<string, string>;
  const sw = lang !== "en";

  const studentName = (fd.student_name || `${fd.student_first || ""} ${fd.student_last || ""}`.trim()).toUpperCase();
  const tsid        = fd.generated_student_id || application.application_number;
  const dob         = fd.student_dob
    ? new Date(fd.student_dob).toLocaleDateString("en-GB", { day: "2-digit", month: "long", year: "numeric" })
    : "—";
  const gender      = fd.student_sex === "M" ? (sw ? "Mwanaume (Male)" : "Male") : fd.student_sex === "F" ? (sw ? "Mwanamke (Female)" : "Female") : "—";
  const school      = fd.school_name || "—";
  const level       = EDU_FULL[fd.education_level] || fd.education_level || "—";
  const classYear   = fd.class_year === "OTHER" ? fd.class_year_manual : (fd.class_year || "—");
  const region      = fd.student_region || application.region || "—";
  const district    = fd.student_district || application.district || "—";
  const ward        = fd.student_ward || application.ward || "—";
  const nationality = fd.nationality || "Mtanzania";
  const purpose     = PURPOSE_FULL[fd.purpose] || fd.purpose_other || "madhumuni maalum";
  const issueDate   = formatDate(application.created_at);
  const refNo       = `MTAA/${application.application_number}/STU/${new Date().getFullYear()}`;
  const parentName  = fd.parent_name || "—";
  const parentNida  = fd.parent_nida || "—";

  return (
    <Document>
      <Page size="A4" style={s.page}>

        {/* Watermark logo */}
        {TANZANIA_LOGO_BASE64 ? <Image src={TANZANIA_LOGO_BASE64} style={s.seal}/> : null}

        {/* Letterhead */}
        <View style={s.letterhead}>
          {TANZANIA_LOGO_BASE64 ? <Image src={TANZANIA_LOGO_BASE64} style={s.logo}/> : null}
          <View style={s.govInfo}>
            <Text style={s.govCountry}>JAMHURI YA MUUNGANO WA TANZANIA</Text>
            <Text style={s.govOffice1}>OFISI YA RAIS — TAMISEMI</Text>
            <Text style={s.govOffice2}>SERIKALI ZA MITAA — OFISI YA KATA / KIJIJI</Text>
            <Text style={s.govRef}>{ward} • {district} • {region}</Text>
          </View>
        </View>
        <View style={s.accentBar}/>

        {/* Ref + Date */}
        <View style={s.refDateRow}>
          <View style={s.refBox}>
            <Text style={s.refLabel}>Kumbukumbu Namba / Reference No.</Text>
            <Text style={s.refValue}>{refNo}</Text>
          </View>
          <View style={s.dateBox}>
            <Text style={s.refLabel}>Tarehe / Date</Text>
            <Text style={s.refValue}>{issueDate}</Text>
          </View>
        </View>

        {/* Recipient */}
        <View style={s.recipientBox}>
          <Text style={s.recipientLine}>Kwa Ndugu / To Whom It May Concern,</Text>
          <Text style={s.recipientLine}>Mkurugenzi / Meneja / Mhusika Yeyote,</Text>
          <Text style={s.recipientLine}>Taasisi Husika / Concerned Institution</Text>
        </View>

        {/* Subject */}
        <View style={s.subjectRow}>
          <Text style={s.subjectLabel}>KUMB: / RE:</Text>
          <Text style={s.subjectText}>BARUA YA UTAMBULISHO WA MWANAFUNZI / STUDENT INTRODUCTION LETTER</Text>
        </View>

        {/* Body paragraph 1 */}
        <Text style={s.paragraph}>
          {"Ofisi ya Kata / Kijiji inathibitisha kwamba mwanafunzi aliyetajwa hapa chini amepewa Kitambulisho cha Mwanafunzi (Tanzania Student Identification System — TSID) kupitia mfumo wa E-Mtaa. Kitambulisho hiki ni cha maisha yote na kinatambulika kitaifa."}
          {"\n\n"}
          {"The Ward / Village Office hereby confirms that the student named below has been issued a Tanzania Student Identification (TSID) through the E-Mtaa digital government services platform. This identification is lifelong and nationally recognized."}
        </Text>

        {/* TSID highlight box */}
        <View style={s.tsidBox}>
          <Text style={s.tsidLabel}>TSID NUMBER / NAMBA YA MWANAFUNZI</Text>
          <Text style={s.tsidNum}>{tsid}</Text>
        </View>

        {/* Student info box */}
        <View style={s.studentBox}>
          <Text style={s.studentBoxTitle}>Taarifa za Mwanafunzi / Student Particulars</Text>
          {[
            ["Jina Kamili / Full Name",           studentName],
            ["Tarehe ya Kuzaliwa / Date of Birth", dob],
            ["Jinsia / Gender",                    gender],
            ["Uraia / Nationality",                nationality],
            ["Shule / Institution",                school],
            ["Ngazi ya Elimu / Education Level",   level],
            ["Darasa / Mwaka / Class Year",        classYear],
            ["Mkoa / Region",                      region],
            ["Wilaya / District",                  district],
            ["Kata / Ward",                        ward],
            ["Mzazi / Mlezi / Parent Guardian",    parentName],
            ["NIDA ya Mzazi / Parent NIDA",        parentNida],
          ].map(([label, value]) => (
            <View key={label} style={s.studentRow}>
              <Text style={s.studentLabel}>{label}</Text>
              <Text style={s.studentValue}>{value || "—"}</Text>
            </View>
          ))}
        </View>

        {/* Body paragraph 2 */}
        <Text style={s.paragraph}>
          {"Barua hii imetolewa kwa lengo la kumwezesha mwanafunzi huyu "}
          <Text style={s.bold}>{purpose}</Text>
          {". Ofisi inaomba ushirikiano wako katika kutoa huduma inayohusika kwa mwanafunzi huyu."}
          {"\n\n"}
          {"This letter has been issued to enable the above-named student to "}
          <Text style={s.bold}>{purpose}</Text>
          {". The Office requests your cooperation in providing the relevant services to this student."}
        </Text>

        {/* Purpose-specific note for NHIF */}
        {fd.purpose === "BIMA" && (
          <Text style={s.paragraph}>
            {"Kwa madhumuni ya NHIF: Mwanafunzi anastahili kupata bima ya afya ya wanafunzi kulingana na sheria za Tanzania. Tafadhali thibitisha namba ya TSID: "}
            <Text style={s.bold}>{tsid}</Text>
            {" kwenye mfumo wako."}
          </Text>
        )}

        {/* Closing */}
        <View style={s.closing}>
          <Text style={s.closingLine}>Wako kwa uaminifu / Yours faithfully,</Text>
        </View>

        {/* Signature */}
        <View style={s.signatureBlock}>
          <View style={s.signatureLine}/>
          <Text style={s.signatureTitle}>Afisa Mtendaji wa Kata / Ward Executive Officer</Text>
          <Text style={s.signatureOffice}>{ward} Ward, {district}</Text>
          <Text style={[s.signatureOffice, { marginTop: 2 }]}>Mhuri Rasmi / Official Seal: _______________</Text>
        </View>

        {/* QR code */}
        {resolvedQr ? (
          <View style={s.qrBox}>
            <Image src={resolvedQr} style={s.qrImg}/>
            <Text style={s.qrLabel}>Thibitisha / Verify</Text>
          </View>
        ) : null}

        {/* Footer */}
        <View style={s.footer}>
          <View>
            <Text style={s.footerLeft}>Barua hii imetolewa kidigitali kupitia E-Mtaa · verify.tsid.go.tz</Text>
            <Text style={s.footerLeft}>Ref: {refNo} · TSID: {tsid}</Text>
          </View>
          <Text style={s.footerGreen}>E-MTAA · TAMISEMI</Text>
        </View>

      </Page>
    </Document>
  );
};
export default ChetiMwanafunziLetterPDF;
