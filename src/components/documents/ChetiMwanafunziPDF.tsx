/**
 * ChetiMwanafunziPDF — TSID Student ID Card
 * Page 1: Front | Page 2: Back | Page 3: Combined A4 landscape | Page 4: Receipt
 */
import React from "react";
import { Page, Text, View, Image, StyleSheet, Document } from "@react-pdf/renderer";
import { TANZANIA_LOGO_BASE64 } from "@/constants/logo";
import { Application } from "@/lib/supabase";
import { formatDate } from "./types";
import { ReceiptPage } from "./ReceiptPage";

interface Props { application: Application; lang?: "sw" | "en"; qrDataUrl?: string; }

// Card rendered at ~2.5x CR80 so text is readable
const CW = 530;
const CH = 334;

const NAVY  = "#003366";
const GREEN = "#1A7A3A";
const YELLOW= "#F5C400";
const RED   = "#D32F2F";
const WHITE = "#FFFFFF";
const T1    = "#111111";
const T2    = "#444444";
const T3    = "#666666";
const BGRAY = "#F0F4F8";
const BORD  = "#DDDDDD";

const s = StyleSheet.create({
  pageSingle: {
    backgroundColor: "#b0bcc8",
    fontFamily: "Helvetica",
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
  },
  pageCombined: {
    backgroundColor: "#b0bcc8",
    fontFamily: "Helvetica",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
    gap: 16,
  },
  lbl: { fontSize: 10, fontWeight: "bold", color: "#4a5568", letterSpacing: 2, marginBottom: 6, textAlign: "center" },

  // ══ FRONT ══
  fc: { width: CW, backgroundColor: WHITE, borderRadius: 8, overflow: "hidden", borderWidth: 2, borderColor: RED },

  // Header strip
  fh: { backgroundColor: NAVY, flexDirection: "row", alignItems: "center", paddingHorizontal: 14, paddingVertical: 9, gap: 10, height: 58 },
  fhLogo: { width: 38, height: 38 },
  fhBrand: { flex: 1 },
  fhTsid: { fontSize: 24, fontWeight: "bold", color: WHITE, lineHeight: 1 },
  fhSub:  { fontSize: 7, color: "#90b8d8", letterSpacing: 0.6, lineHeight: 1.6 },
  fhFlag: { width: 38, height: 26, borderRadius: 3, overflow: "hidden" },
  fhFg: { flex: 1, backgroundColor: "#1eb53a" },
  fhFy: { flex: 1, backgroundColor: "#fcd116" },
  fhFb: { flex: 1, backgroundColor: "#00a3dd" },

  // Body: LEFT photo col | RIGHT info col
  fb: { flexDirection: "row", height: CH - 58 - 48 }, // subtract header and footer heights

  // LEFT: photo + school
  fl: {
    width: 160,
    backgroundColor: BGRAY,
    borderRightWidth: 1, borderRightColor: BORD, borderRightStyle: "dashed",
    paddingTop: 12, paddingHorizontal: 12,
    alignItems: "center",
  },
  flPhoto: {
    width: 108, height: 136,
    borderWidth: 2, borderColor: GREEN,
    borderRadius: 4, overflow: "hidden",
    backgroundColor: "#c8d8c8",
    alignItems: "center", justifyContent: "center",
    marginBottom: 10,
  },
  flPhotoImg: { width: 108, height: 136, objectFit: "cover" },
  flPhotoTxt: { fontSize: 9, color: "#888", textAlign: "center" },

  // School under photo
  flSchoolIcon: {
    width: 28, height: 28, backgroundColor: NAVY,
    borderRadius: 4, alignItems: "center", justifyContent: "center", marginBottom: 4,
  },
  flSchoolIconTxt: { fontSize: 14, color: WHITE },
  flSchoolName: { fontSize: 8, fontWeight: "bold", color: NAVY, textAlign: "center", lineHeight: 1.3, marginBottom: 2 },
  flSchoolMeta: { fontSize: 7, color: T3, textAlign: "center", lineHeight: 1.4 },

  // RIGHT: TSID + fields
  fr: { flex: 1, paddingTop: 12, paddingHorizontal: 12, paddingBottom: 8 },

  // TSID number at top
  frTsidLbl: { fontSize: 7, fontWeight: "bold", color: T3, letterSpacing: 0.8, textTransform: "uppercase", marginBottom: 2 },
  frTsidNum: {
    fontSize: 14, fontWeight: "bold", color: RED,
    fontFamily: "Courier", letterSpacing: 0.5,
    borderBottomWidth: 1.5, borderBottomColor: RED,
    paddingBottom: 4, marginBottom: 8,
  },

  // Field rows
  frField: { marginBottom: 7 },
  frLbl:   { fontSize: 6.5, fontWeight: "bold", color: T3, textTransform: "uppercase", letterSpacing: 0.5 },
  frVal:   { fontSize: 11, fontWeight: "bold", color: T1, lineHeight: 1.2 },

  // Divider
  frDiv:   { height: 0.75, backgroundColor: BORD, marginVertical: 8 },

  // Guardian section
  frGTitle:{ fontSize: 7, fontWeight: "bold", color: GREEN, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 5 },
  frGGrid: { flexDirection: "row", flexWrap: "wrap" },
  frGCell: { width: "50%", marginBottom: 5, paddingRight: 4 },
  frGLbl:  { fontSize: 6, fontWeight: "bold", color: T3, textTransform: "uppercase", letterSpacing: 0.3 },
  frGVal:  { fontSize: 8.5, fontWeight: "bold", color: T1 },

  // Important box
  frImpBox: { backgroundColor: "#FFF8E1", borderLeftWidth: 3, borderLeftColor: YELLOW, padding: 6, marginTop: 6 },
  frImpTitle: { fontSize: 7, fontWeight: "bold", color: "#7a5800", marginBottom: 3 },
  frImpItem:  { fontSize: 6, color: T2, marginBottom: 2, lineHeight: 1.4 },

  // QR in right col bottom
  frQrBlock: { alignItems: "flex-end", marginTop: 4 },
  frQrImg:   { width: 48, height: 48 },
  frQrTxt:   { fontSize: 5.5, color: T3, textAlign: "right", marginTop: 2 },

  // FOOTER BAR
  ff: {
    backgroundColor: "rgba(26,122,58,0.06)",
    borderTopWidth: 3, borderTopColor: YELLOW,
    flexDirection: "row", alignItems: "center",
    paddingHorizontal: 12, paddingVertical: 6, gap: 10, height: 48,
  },
  ffVerify: { flex: 1 },
  ffVerifyLbl: { fontSize: 6, fontWeight: "bold", color: T3 },
  ffVerifyUrl: { fontSize: 8.5, fontWeight: "bold", color: GREEN },
  ffIssued: {},
  ffIssuedLbl: { fontSize: 6, fontWeight: "bold", color: T3 },
  ffIssuedVal: { fontSize: 8, fontWeight: "bold", color: T1 },
  ffBadge: { backgroundColor: RED, borderRadius: 3, paddingHorizontal: 6, paddingVertical: 4 },
  ffBadgeTxt: { fontSize: 6, fontWeight: "bold", color: WHITE, letterSpacing: 0.3, lineHeight: 1.6 },

  // Footer icons
  ffIcons: { backgroundColor: NAVY, flexDirection: "row", justifyContent: "space-around", paddingVertical: 7 },
  ffIcon: { alignItems: "center", gap: 3 },
  ffIconCircle: { width: 22, height: 22, borderWidth: 1.5, borderColor: "#5a7fa0", borderRadius: 11, alignItems: "center", justifyContent: "center" },
  ffIconTxt: { fontSize: 9, color: WHITE },
  ffIconLabel: { fontSize: 6, color: "#8ab4d4", fontWeight: "bold", textAlign: "center", letterSpacing: 0.3, lineHeight: 1.4 },
  ffColorBar: { flexDirection: "row", height: 6 },
  ffBarG: { flex: 1, backgroundColor: "#1eb53a" },
  ffBarY: { flex: 1, backgroundColor: "#fcd116" },
  ffBarB: { flex: 1, backgroundColor: "#00a3dd" },

  // ══ BACK ══
  bc: { width: CW, backgroundColor: WHITE, borderRadius: 8, overflow: "hidden", borderWidth: 2, borderColor: RED },
  bh: { backgroundColor: NAVY, paddingHorizontal: 16, paddingVertical: 12, height: 58, justifyContent: "center" },
  bhNum: { fontSize: 20, fontWeight: "bold", color: WHITE, fontFamily: "Courier", letterSpacing: 1 },

  // Back body
  bb: { flex: 1, flexDirection: "row", paddingHorizontal: 14, paddingTop: 12, paddingBottom: 8, gap: 12 },
  bbl: { flex: 1 },
  bSecTitle: {
    fontSize: 8.5, fontWeight: "bold", color: GREEN,
    textTransform: "uppercase", letterSpacing: 0.8,
    borderBottomWidth: 1, borderBottomColor: GREEN,
    paddingBottom: 3, marginBottom: 7,
  },
  bRow: { flexDirection: "row", marginBottom: 5.5 },
  bLbl: { width: 100, fontSize: 7, fontWeight: "bold", color: T3, textTransform: "uppercase", letterSpacing: 0.3 },
  bVal: { flex: 1, fontSize: 9, fontWeight: "bold", color: T1 },
  bDiv: { height: 0.75, backgroundColor: "#c8d8e8", marginVertical: 7 },
  bImpBox: { borderWidth: 0.75, borderColor: "#90c890", backgroundColor: "#f4fff4", borderRadius: 3, padding: 7, marginTop: 5 },
  bImpTitle: { fontSize: 7.5, fontWeight: "bold", color: GREEN, marginBottom: 4 },
  bImpItem:  { fontSize: 6.5, color: T2, marginBottom: 2.5, lineHeight: 1.5 },

  // Stamp
  bbr: { width: 90, alignItems: "center", paddingTop: 10 },
  bStamp: { width: 78, height: 78, borderRadius: 39, borderWidth: 2, borderColor: "#1a3a6a", borderStyle: "dashed", alignItems: "center", justifyContent: "center" },
  bStampSm: { fontSize: 5.5, color: "#1a3a6a", textAlign: "center", letterSpacing: 0.3, lineHeight: 1.5 },
  bStampBig: { fontSize: 16, fontWeight: "bold", color: "#1a3a6a" },

  // Back footers
  bft: { flexDirection: "row", justifyContent: "space-between", paddingHorizontal: 14, paddingVertical: 7, borderTopWidth: 0.75, borderTopColor: BORD },
  bftPLbl: { fontSize: 7, fontWeight: "bold", color: T3 },
  bftPVal: { fontSize: 9, fontWeight: "bold", color: GREEN },
  bftILbl: { fontSize: 7, fontWeight: "bold", color: T3, textAlign: "right" },
  bftIVal: { fontSize: 9, fontWeight: "bold", color: T1, textAlign: "right" },
  bfb: { backgroundColor: NAVY, flexDirection: "row", paddingHorizontal: 14, paddingVertical: 8, justifyContent: "space-between", alignItems: "center", height: 40 },
  bfbSec: { fontSize: 6.5, color: "#8ab4d8", flex: 1, lineHeight: 1.7 },
  bfbCtryS: { fontSize: 7, color: "#8ab4d8", textAlign: "right" },
  bfbCtryM: { fontSize: 9, fontWeight: "bold", color: WHITE, textAlign: "right" },
});

const EDU: Record<string, string> = {
  CHEKECHEA:"PRE-PRIMARY",MSINGI:"PRIMARY SCHOOL",SEKONDARI_O:"SECONDARY (O-LEVEL)",
  SEKONDARI_A:"SECONDARY (A-LEVEL)",STASHAHADA:"DIPLOMA",SHAHADA:"UNIVERSITY DEGREE",UZAMILI:"MASTERS/PHD",
};

function gd(app: Application) {
  const fd = (app.form_data||{}) as Record<string,string>;
  return {
    name:    (fd.student_name||`${fd.student_first||""} ${fd.student_last||""}`.trim()).toUpperCase(),
    tsid:    fd.generated_student_id||app.application_number,
    photo:   fd.student_photo||null,
    dob:     fd.student_dob ? new Date(fd.student_dob).toLocaleDateString("en-GB",{day:"2-digit",month:"short",year:"numeric"}).toUpperCase() : "—",
    sex:     fd.student_sex==="M"?"MALE":fd.student_sex==="F"?"FEMALE":"—",
    nat:     (fd.nationality||"TANZANIAN").toUpperCase(),
    school:  (fd.school_name||"—").toUpperCase(),
    admNo:   fd.admission_number||fd.student_number||"",
    region:  (fd.student_region||app.region||"—").toUpperCase(),
    district:(fd.student_district||app.district||"—").toUpperCase(),
    level:   EDU[fd.education_level]||(fd.education_level||"—").toUpperCase(),
    cls:     fd.class_year==="OTHER"?(fd.class_year_manual||"—"):(fd.class_year||"—"),
    blood:   fd.blood_group||"—",
    enroll:  fd.enrollment_date ? new Date(fd.enrollment_date).toLocaleDateString("en-GB",{day:"2-digit",month:"short",year:"numeric"}).toUpperCase() : formatDate(app.created_at).toUpperCase(),
    pName:   (fd.parent_name||"—").toUpperCase(),
    pNida:   fd.parent_nida ? fd.parent_nida.replace(/^(\d{4})\d+(\d{3})$/,"$1***$2") : "—",
    pPhone:  fd.parent_phone||"—",
    pRel:    fd.parent_relationship==="MAMA"?"MOTHER":fd.parent_relationship==="BABA"?"FATHER":(fd.parent_relationship||"GUARDIAN").toUpperCase(),
    issued:  formatDate(app.created_at).toUpperCase(),
  };
}

const F: React.FC<{d:ReturnType<typeof gd>;qr?:string}> = ({d,qr}) => (
  <View style={s.fc}>
    {/* Header */}
    <View style={s.fh}>
      {TANZANIA_LOGO_BASE64?<Image src={TANZANIA_LOGO_BASE64} style={s.fhLogo}/>:null}
      <View style={s.fhBrand}><Text style={s.fhTsid}>TSID</Text><Text style={s.fhSub}>TANZANIA STUDENT IDENTIFICATION SYSTEM</Text></View>
      <View style={s.fhFlag}><View style={s.fhFg}/><View style={s.fhFy}/><View style={s.fhFb}/></View>
    </View>

    {/* Body */}
    <View style={s.fb}>
      {/* LEFT: photo + school */}
      <View style={s.fl}>
        <View style={s.flPhoto}>
          {d.photo?<Image src={d.photo} style={s.flPhotoImg}/>:<Text style={s.flPhotoTxt}>{"[PHOTO]"}</Text>}
        </View>
        <View style={s.flSchoolIcon}><Text style={s.flSchoolIconTxt}>📚</Text></View>
        <Text style={s.flSchoolName} numberOfLines={3}>{d.school}</Text>
        {d.admNo?<Text style={s.flSchoolMeta}>ID: {d.admNo}</Text>:null}
        <Text style={s.flSchoolMeta}>REGION: {d.region}</Text>
        <Text style={s.flSchoolMeta}>DISTRICT: {d.district}</Text>
      </View>

      {/* RIGHT: info */}
      <View style={s.fr}>
        <Text style={s.frTsidLbl}>TSID NUMBER</Text>
        <Text style={s.frTsidNum}>{d.tsid}</Text>

        {[["FULL NAME",d.name],["DATE OF BIRTH",d.dob],["GENDER",d.sex],["NATIONALITY",d.nat]].map(([l,v])=>(
          <View key={l} style={s.frField}><Text style={s.frLbl}>{l}</Text><Text style={s.frVal}>{v}</Text></View>
        ))}

        {/* QR at bottom right */}
        <View style={s.frQrBlock}>
          {qr?<Image src={qr} style={s.frQrImg}/>:<View style={[s.frQrImg,{backgroundColor:"#dde8dd",alignItems:"center",justifyContent:"center"}]}><Text style={{fontSize:8,color:"#888"}}>QR</Text></View>}
          <Text style={s.frQrTxt}>SCAN TO VERIFY</Text>
        </View>
      </View>
    </View>

    {/* Footer bottom bar */}
    <View style={s.ff}>
      <View style={s.ffVerify}><Text style={s.ffVerifyLbl}>VERIFY AT</Text><Text style={s.ffVerifyUrl}>verify.tsid.go.tz</Text></View>
      <View style={s.ffIssued}><Text style={s.ffIssuedLbl}>ISSUED</Text><Text style={s.ffIssuedVal}>{d.issued}</Text></View>
      <View style={s.ffBadge}><Text style={s.ffBadgeTxt}>{"LIFELONG ·\nNATIONAL ·\nSECURE"}</Text></View>
    </View>
    <View style={s.ffIcons}>
      {[["⛨","LIFELONG\nSTUDENT ID"],["✦","NATIONALY\nRECOGNIZED"],["✓","SECURE\n& VERIFIED"]].map(([ic,lbl],i)=>(
        <View key={i} style={s.ffIcon}><View style={s.ffIconCircle}><Text style={s.ffIconTxt}>{ic}</Text></View><Text style={s.ffIconLabel}>{lbl}</Text></View>
      ))}
    </View>
    <View style={s.ffColorBar}><View style={s.ffBarG}/><View style={s.ffBarY}/><View style={s.ffBarB}/></View>
  </View>
);

const B: React.FC<{d:ReturnType<typeof gd>}> = ({d}) => (
  <View style={s.bc}>
    <View style={s.bh}><Text style={s.bhNum}>{d.tsid}</Text></View>
    <View style={s.bb}>
      <View style={s.bbl}>
        <Text style={s.bSecTitle}>STUDENT INFORMATION</Text>
        {[["DATE OF ENROLLMENT",d.enroll],["CURRENT LEVEL",d.level],["CLASS / YEAR",d.cls],["BLOOD GROUP",d.blood],["PHONE (GUARDIAN)",d.pPhone]].map(([l,v])=>(
          <View key={l} style={s.bRow}><Text style={s.bLbl}>{l}</Text><Text style={s.bVal}>{v}</Text></View>
        ))}
        <View style={s.bDiv}/>
        <Text style={s.bSecTitle}>PARENT / GUARDIAN</Text>
        {[["NAME",d.pName],["NIDA NUMBER",d.pNida],["RELATIONSHIP",d.pRel],["PHONE",d.pPhone]].map(([l,v])=>(
          <View key={l} style={s.bRow}><Text style={s.bLbl}>{l}</Text><Text style={s.bVal}>{v}</Text></View>
        ))}
        <View style={s.bImpBox}>
          <Text style={s.bImpTitle}>IMPORTANT</Text>
          {["This card is the property of the Government of Tanzania.","It is valid for educational identification nationwide.","Report loss of this card to your school immediately.","This card is not transferable."].map((t,i)=>(
            <Text key={i} style={s.bImpItem}>• {t}</Text>
          ))}
        </View>
      </View>
      <View style={s.bbr}>
        <View style={s.bStamp}>
          <Text style={s.bStampSm}>TANZANIA STUDENT</Text>
          <Text style={s.bStampBig}>TSID</Text>
          <Text style={s.bStampSm}>IDENTIFICATION{"\n"}SYSTEM</Text>
        </View>
      </View>
    </View>
    <View style={s.bft}>
      <View><Text style={s.bftPLbl}>🌐 VERIFICATION PORTAL</Text><Text style={s.bftPVal}>verify.tsid.go.tz</Text></View>
      <View><Text style={s.bftILbl}>ISSUED ON</Text><Text style={s.bftIVal}>{d.issued}</Text></View>
    </View>
    <View style={s.bfb}>
      <Text style={s.bfbSec}>{"🔒 This card contains secure data.\nUnauthorized use is prohibited by law."}</Text>
      <View><Text style={s.bfbCtryS}>JAMHURI YA MUUNGANO</Text><Text style={s.bfbCtryM}>WA TANZANIA</Text></View>
    </View>
  </View>
);

export const ChetiMwanafunziPDF: React.FC<Props> = ({application,lang="sw",qrDataUrl}) => {
  const d = gd(application);
  const qr = qrDataUrl||undefined;
  const W = CW+40, H = CH+40;
  return (
    <Document>
      <Page size={[W,H]} style={s.pageSingle}><F d={d} qr={qr}/></Page>
      <Page size={[W,H]} style={s.pageSingle}><B d={d}/></Page>
      <Page size={[W*2+56,H]} style={s.pageCombined}>
        <View><Text style={s.lbl}>FRONT</Text><F d={d} qr={qr}/></View>
        <View><Text style={s.lbl}>BACK</Text><B d={d}/></View>
      </Page>
      <ReceiptPage application={application} lang={lang} qrDataUrl={qr}/>
    </Document>
  );
};
export default ChetiMwanafunziPDF;
