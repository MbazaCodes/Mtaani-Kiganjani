/**
 * ChetiMwanafunziPDF — TSID Card using react-pdf
 * Fixed: explicit pixel dimensions, no flex body height issues
 */
import React from "react";
import { Page, Text, View, Image, StyleSheet, Document } from "@react-pdf/renderer";
import { TANZANIA_LOGO_BASE64 } from "@/constants/logo";
import { Application } from "@/lib/supabase";
import { formatDate } from "./types";
import { ReceiptPage } from "./ReceiptPage";

interface Props { application: Application; lang?: "sw"|"en"; qrDataUrl?: string; }

// A5 landscape = 595 × 420 pt
// Each card: ~260 × 180 pt (fills A5 with padding)
const CW = 520;
const CH = 328;
const PHOTO_W = 120;
const PHOTO_H = 150;
const LEFT_W = 168;
const HEADER_H = 56;
const FOOTER_H = 32;
const ICONS_H = 36;
const BAR_H = 5;
const BODY_H = CH - HEADER_H - FOOTER_H - ICONS_H - BAR_H;

const NAVY="#003366", GREEN="#1A7A3A", YELLOW="#F5C400", RED="#D32F2F";
const WHITE="#ffffff", T1="#111111", T2="#444444", T3="#666666";
const BGRAY="#f0f4f8", BORD="#dddddd";

const s = StyleSheet.create({
  page1: { backgroundColor:"#aab4c0", padding:20, fontFamily:"Helvetica", alignItems:"center", justifyContent:"center" },
  page2: { backgroundColor:"#aab4c0", padding:20, fontFamily:"Helvetica", alignItems:"center", justifyContent:"center" },
  page3: { backgroundColor:"#aab4c0", padding:16, fontFamily:"Helvetica", flexDirection:"row", justifyContent:"center", alignItems:"center", gap:14 },
  lbl: { fontSize:9, fontWeight:"bold", color:"#445", letterSpacing:2, marginBottom:5, textAlign:"center" },

  // ── FRONT ──
  fc: { width:CW, borderRadius:8, overflow:"hidden", borderWidth:2, borderColor:RED, backgroundColor:WHITE },

  // Header
  fHeader: { width:CW, height:HEADER_H, backgroundColor:NAVY, flexDirection:"row", alignItems:"center", paddingHorizontal:14, gap:10 },
  fHLogo: { width:38, height:38 },
  fHBrand: { flex:1 },
  fHTsid: { fontSize:26, fontWeight:"bold", color:WHITE, lineHeight:1 },
  fHSub: { fontSize:6.5, color:"#90b8d8", letterSpacing:0.5 },
  fHFlag: { width:36, height:24, borderRadius:3, overflow:"hidden" },
  fHFg: { height:8, backgroundColor:"#1eb53a" },
  fHFy: { height:8, backgroundColor:"#fcd116" },
  fHFb: { height:8, backgroundColor:"#00a3dd" },

  // Body row — explicit height, no flex
  fBody: { width:CW, height:BODY_H, flexDirection:"row" },

  // Left col
  fLeft: { width:LEFT_W, height:BODY_H, backgroundColor:BGRAY, borderRightWidth:1, borderRightColor:BORD, borderRightStyle:"dashed", paddingTop:10, paddingHorizontal:10, alignItems:"center" },
  fPhoto: { width:PHOTO_W, height:PHOTO_H, borderWidth:2, borderColor:GREEN, borderRadius:4, overflow:"hidden", backgroundColor:"#c0d4c0", alignItems:"center", justifyContent:"center", marginBottom:8 },
  fPhotoImg: { width:PHOTO_W, height:PHOTO_H, objectFit:"cover" },
  fPhotoTxt: { fontSize:9, color:"#888", textAlign:"center" },
  fSchoolIcon: { width:26, height:26, backgroundColor:NAVY, borderRadius:4, alignItems:"center", justifyContent:"center", marginBottom:3 },
  fSchoolIconTxt: { fontSize:13, color:WHITE },
  fSchoolName: { fontSize:7.5, fontWeight:"bold", color:NAVY, textAlign:"center", lineHeight:1.35, marginBottom:2 },
  fSchoolMeta: { fontSize:6.5, color:T3, textAlign:"center", lineHeight:1.5 },

  // Right col
  fRight: { width:CW-LEFT_W, height:BODY_H, backgroundColor:WHITE, paddingTop:12, paddingHorizontal:12, paddingBottom:6 },
  fTsidLbl: { fontSize:6.5, fontWeight:"bold", color:T3, textTransform:"uppercase", letterSpacing:0.8, marginBottom:2 },
  fTsidNum: { fontSize:13, fontWeight:"bold", color:RED, fontFamily:"Courier", letterSpacing:0.5, borderBottomWidth:1.5, borderBottomColor:RED, paddingBottom:4, marginBottom:8 },
  fField: { marginBottom:6 },
  fFieldLbl: { fontSize:6, fontWeight:"bold", color:T3, textTransform:"uppercase", letterSpacing:0.5 },
  fFieldVal: { fontSize:11, fontWeight:"bold", color:T1, lineHeight:1.2 },
  fQrWrap: { position:"absolute", bottom:6, right:10, alignItems:"center" },
  fQrImg: { width:52, height:52 },
  fQrTxt: { fontSize:5.5, color:T3, textAlign:"center", marginTop:2 },

  // Bottom verify bar
  fBar: { width:CW, height:FOOTER_H, backgroundColor:"rgba(26,122,58,0.06)", borderTopWidth:2.5, borderTopColor:YELLOW, flexDirection:"row", alignItems:"center", paddingHorizontal:12, gap:8 },
  fVerify: { flex:1 },
  fVerifyLbl: { fontSize:6, fontWeight:"bold", color:T3 },
  fVerifyUrl: { fontSize:8, fontWeight:"bold", color:GREEN },
  fIssued: { alignItems:"flex-end" },
  fIssuedLbl: { fontSize:6, fontWeight:"bold", color:T3 },
  fIssuedVal: { fontSize:7.5, fontWeight:"bold", color:T1 },
  fBadge: { backgroundColor:RED, borderRadius:3, paddingHorizontal:5, paddingVertical:3 },
  fBadgeTxt: { fontSize:5.5, fontWeight:"bold", color:WHITE, lineHeight:1.6 },

  // Icons row
  fIcons: { width:CW, height:ICONS_H, backgroundColor:NAVY, flexDirection:"row", justifyContent:"space-around", alignItems:"center" },
  fIconItem: { alignItems:"center" },
  fIconCircle: { width:20, height:20, borderRadius:10, borderWidth:1.5, borderColor:"#5a7fa0", alignItems:"center", justifyContent:"center", marginBottom:2 },
  fIconTxt: { fontSize:9, color:WHITE },
  fIconLbl: { fontSize:5.5, color:"#8ab4d4", fontWeight:"bold", textAlign:"center", letterSpacing:0.3 },
  fColorBar: { width:CW, height:BAR_H, flexDirection:"row" },
  fBarG: { flex:1, backgroundColor:"#1eb53a" },
  fBarY: { flex:1, backgroundColor:"#fcd116" },
  fBarB: { flex:1, backgroundColor:"#00a3dd" },

  // ── BACK ──
  BACK_HEADER_H: 56,
  bc: { width:CW, borderRadius:8, overflow:"hidden", borderWidth:2, borderColor:RED, backgroundColor:WHITE },
  bHeader: { width:CW, height:56, backgroundColor:NAVY, justifyContent:"center", paddingHorizontal:16 },
  bHeaderNum: { fontSize:22, fontWeight:"bold", color:WHITE, fontFamily:"Courier", letterSpacing:1 },
  bBody: { width:CW, height:CH-56-40-36, flexDirection:"row", paddingHorizontal:14, paddingTop:10, paddingBottom:6, gap:10 },
  bLeft: { flex:1 },
  bSecTitle: { fontSize:8, fontWeight:"bold", color:GREEN, textTransform:"uppercase", letterSpacing:0.8, borderBottomWidth:1, borderBottomColor:GREEN, paddingBottom:2, marginBottom:6 },
  bRow: { flexDirection:"row", marginBottom:4.5 },
  bLbl: { width:96, fontSize:6.5, fontWeight:"bold", color:T3, textTransform:"uppercase", letterSpacing:0.3 },
  bVal: { flex:1, fontSize:8.5, fontWeight:"bold", color:T1 },
  bDiv: { height:0.75, backgroundColor:"#c0ccd8", marginVertical:6 },
  bImpBox: { borderWidth:0.75, borderColor:"#90c890", backgroundColor:"#f4fff4", borderRadius:3, padding:6, marginTop:4 },
  bImpTitle: { fontSize:7, fontWeight:"bold", color:GREEN, marginBottom:3 },
  bImpItem: { fontSize:6, color:T2, marginBottom:2, lineHeight:1.5 },
  bRight: { width:84, alignItems:"center", paddingTop:8 },
  bStamp: { width:76, height:76, borderRadius:38, borderWidth:2, borderColor:"#1a3a6a", borderStyle:"dashed", alignItems:"center", justifyContent:"center" },
  bStampSm: { fontSize:5.5, color:"#1a3a6a", textAlign:"center", lineHeight:1.5 },
  bStampBig: { fontSize:17, fontWeight:"bold", color:"#1a3a6a" },
  bFootTop: { width:CW, height:36, flexDirection:"row", justifyContent:"space-between", alignItems:"center", paddingHorizontal:14, borderTopWidth:0.75, borderTopColor:BORD },
  bFtPL: { fontSize:7, fontWeight:"bold", color:T3 },
  bFtPV: { fontSize:9, fontWeight:"bold", color:GREEN },
  bFtIL: { fontSize:7, fontWeight:"bold", color:T3, textAlign:"right" },
  bFtIV: { fontSize:9, fontWeight:"bold", color:T1, textAlign:"right" },
  bFootBot: { width:CW, height:36, backgroundColor:NAVY, flexDirection:"row", justifyContent:"space-between", alignItems:"center", paddingHorizontal:14 },
  bFbSec: { fontSize:6, color:"#8ab4d8", flex:1, lineHeight:1.7 },
  bFbCS: { fontSize:6.5, color:"#8ab4d8", textAlign:"right" },
  bFbCM: { fontSize:8.5, fontWeight:"bold", color:WHITE, textAlign:"right" },
});

const EDU:Record<string,string> = {
  CHEKECHEA:"PRE-PRIMARY",MSINGI:"PRIMARY SCHOOL",SEKONDARI_O:"SECONDARY (O-LEVEL)",
  SEKONDARI_A:"SECONDARY (A-LEVEL)",STASHAHADA:"DIPLOMA",SHAHADA:"UNIVERSITY DEGREE",UZAMILI:"MASTERS/PHD",
};

function gd(app:Application) {
  const fd=(app.form_data||{}) as Record<string,string>;
  return {
    name:(fd.student_name||`${fd.student_first||""} ${fd.student_last||""}`.trim()).toUpperCase(),
    tsid:fd.generated_student_id||app.application_number,
    photo:fd.student_photo||null,
    dob:fd.student_dob?new Date(fd.student_dob).toLocaleDateString("en-GB",{day:"2-digit",month:"short",year:"numeric"}).toUpperCase():"—",
    sex:fd.student_sex==="M"?"MALE":fd.student_sex==="F"?"FEMALE":"—",
    nat:(fd.nationality||"TANZANIAN").toUpperCase(),
    school:(fd.school_name||"—").toUpperCase(),
    admNo:fd.admission_number||fd.student_number||"",
    region:(fd.student_region||app.region||"—").toUpperCase(),
    district:(fd.student_district||app.district||"—").toUpperCase(),
    level:EDU[fd.education_level]||(fd.education_level||"—").toUpperCase(),
    cls:fd.class_year==="OTHER"?(fd.class_year_manual||"—"):(fd.class_year||"—"),
    blood:fd.blood_group||"—",
    enroll:fd.enrollment_date?new Date(fd.enrollment_date).toLocaleDateString("en-GB",{day:"2-digit",month:"short",year:"numeric"}).toUpperCase():formatDate(app.created_at).toUpperCase(),
    pName:(fd.parent_name||"—").toUpperCase(),
    pNida:fd.parent_nida?fd.parent_nida.replace(/^(\d{4})\d+(\d{3})$/,"$1***$2"):"—",
    pPhone:fd.parent_phone||"—",
    pRel:fd.parent_relationship==="MAMA"?"MOTHER":fd.parent_relationship==="BABA"?"FATHER":(fd.parent_relationship||"GUARDIAN").toUpperCase(),
    issued:formatDate(app.created_at).toUpperCase(),
  };
}

const Front:React.FC<{d:ReturnType<typeof gd>;qr?:string}> = ({d,qr}) => (
  <View style={s.fc}>
    {/* HEADER */}
    <View style={s.fHeader}>
      {TANZANIA_LOGO_BASE64?<Image src={TANZANIA_LOGO_BASE64} style={s.fHLogo}/>:null}
      <View style={s.fHBrand}>
        <Text style={s.fHTsid}>TSID</Text>
        <Text style={s.fHSub}>TANZANIA STUDENT IDENTIFICATION SYSTEM</Text>
      </View>
      <View style={s.fHFlag}>
        <View style={s.fHFg}/><View style={s.fHFy}/><View style={s.fHFb}/>
      </View>
    </View>

    {/* BODY: fixed height row */}
    <View style={s.fBody}>
      {/* LEFT */}
      <View style={s.fLeft}>
        <View style={s.fPhoto}>
          {d.photo?<Image src={d.photo} style={s.fPhotoImg}/>:<Text style={s.fPhotoTxt}>PHOTO</Text>}
        </View>
        <View style={s.fSchoolIcon}><Text style={s.fSchoolIconTxt}>B</Text></View>
        <Text style={s.fSchoolName} numberOfLines={3}>{d.school}</Text>
        {d.admNo?<Text style={s.fSchoolMeta}>ID: {d.admNo}</Text>:null}
        <Text style={s.fSchoolMeta}>REGION: {d.region}</Text>
        <Text style={s.fSchoolMeta}>DISTRICT: {d.district}</Text>
      </View>

      {/* RIGHT */}
      <View style={s.fRight}>
        <Text style={s.fTsidLbl}>TSID NUMBER</Text>
        <Text style={s.fTsidNum}>{d.tsid}</Text>
        <View style={s.fField}><Text style={s.fFieldLbl}>FULL NAME</Text><Text style={s.fFieldVal}>{d.name}</Text></View>
        <View style={s.fField}><Text style={s.fFieldLbl}>DATE OF BIRTH</Text><Text style={s.fFieldVal}>{d.dob}</Text></View>
        <View style={s.fField}><Text style={s.fFieldLbl}>GENDER</Text><Text style={s.fFieldVal}>{d.sex}</Text></View>
        <View style={s.fField}><Text style={s.fFieldLbl}>NATIONALITY</Text><Text style={s.fFieldVal}>{d.nat}</Text></View>
        {/* QR bottom-right absolute */}
        <View style={s.fQrWrap}>
          {qr?<Image src={qr} style={s.fQrImg}/>:<View style={[s.fQrImg,{backgroundColor:"#d8e8d8",alignItems:"center",justifyContent:"center"}]}><Text style={{fontSize:10,color:"#888"}}>QR</Text></View>}
          <Text style={s.fQrTxt}>SCAN TO VERIFY</Text>
        </View>
      </View>
    </View>

    {/* VERIFY BAR */}
    <View style={s.fBar}>
      <View style={s.fVerify}>
        <Text style={s.fVerifyLbl}>VERIFY AT</Text>
        <Text style={s.fVerifyUrl}>verify.tsid.go.tz</Text>
      </View>
      <View style={s.fIssued}>
        <Text style={s.fIssuedLbl}>ISSUED</Text>
        <Text style={s.fIssuedVal}>{d.issued}</Text>
      </View>
      <View style={s.fBadge}>
        <Text style={s.fBadgeTxt}>{"LIFELONG\nNATIONAL\nSECURE"}</Text>
      </View>
    </View>

    {/* ICONS */}
    <View style={s.fIcons}>
      {[["S","LIFELONG\nSTUDENT ID"],["N","NATIONALY\nRECOGNIZED"],["V","SECURE\n& VERIFIED"]].map(([ic,lbl],i)=>(
        <View key={i} style={s.fIconItem}>
          <View style={s.fIconCircle}><Text style={s.fIconTxt}>{ic}</Text></View>
          <Text style={s.fIconLbl}>{lbl}</Text>
        </View>
      ))}
    </View>
    <View style={s.fColorBar}><View style={s.fBarG}/><View style={s.fBarY}/><View style={s.fBarB}/></View>
  </View>
);

const Back:React.FC<{d:ReturnType<typeof gd>}> = ({d}) => (
  <View style={s.bc}>
    <View style={s.bHeader}><Text style={s.bHeaderNum}>{d.tsid}</Text></View>
    <View style={s.bBody}>
      <View style={s.bLeft}>
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
      <View style={s.bRight}>
        <View style={s.bStamp}>
          <Text style={s.bStampSm}>TANZANIA STUDENT</Text>
          <Text style={s.bStampBig}>TSID</Text>
          <Text style={s.bStampSm}>{"IDENTIFICATION\nSYSTEM"}</Text>
        </View>
      </View>
    </View>
    <View style={s.bFootTop}>
      <View><Text style={s.bFtPL}>VERIFICATION PORTAL</Text><Text style={s.bFtPV}>verify.tsid.go.tz</Text></View>
      <View><Text style={s.bFtIL}>ISSUED ON</Text><Text style={s.bFtIV}>{d.issued}</Text></View>
    </View>
    <View style={s.bFootBot}>
      <Text style={s.bFbSec}>{"This card contains secure data.\nUnauthorized use is prohibited by law."}</Text>
      <View><Text style={s.bFbCS}>JAMHURI YA MUUNGANO</Text><Text style={s.bFbCM}>WA TANZANIA</Text></View>
    </View>
  </View>
);

export const ChetiMwanafunziPDF:React.FC<Props> = ({application,lang="sw",qrDataUrl}) => {
  const d=gd(application);
  const qr=qrDataUrl||undefined;
  const PW=CW+40, PH=CH+40;
  return (
    <Document>
      <Page size={[PW,PH]} style={s.page1}><Front d={d} qr={qr}/></Page>
      <Page size={[PW,PH]} style={s.page2}><Back d={d}/></Page>
      <Page size={[PW*2+52,PH]} style={s.page3}>
        <View><Text style={s.lbl}>FRONT</Text><Front d={d} qr={qr}/></View>
        <View><Text style={s.lbl}>BACK</Text><Back d={d}/></View>
      </Page>
      <ReceiptPage application={application} lang={lang} qrDataUrl={qr}/>
    </Document>
  );
};
export default ChetiMwanafunziPDF;
