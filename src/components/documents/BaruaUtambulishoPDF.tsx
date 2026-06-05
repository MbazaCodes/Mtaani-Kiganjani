/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Barua ya Utambulisho — Introduction Letter
 * Letter-format document (subject + body) — one PDF per institution.
 * Defaults to the FIRST institution if multiple were requested.
 */
import React from "react";
import { Document, Page, Text, View, Image, StyleSheet } from "@react-pdf/renderer";
import {
  DocumentPDFProps,
  commonStyles as s,
  generateQRCodeUrl,
  formatFullName,
  formatDate,
} from "./types";
import { OfficerSignatureBox } from "./SignatureBlocks";
import { ReceiptPage } from "./ReceiptPage";
import { TANZANIA_LOGO_BASE64 } from "@/constants/logo";

const ls = StyleSheet.create({
  letterMeta: { marginTop: 14, marginBottom: 14, fontSize: 9.5 },
  metaRow: { flexDirection: "row", marginBottom: 3 },
  metaLabel: { fontWeight: "bold", width: 70 },
  metaValue: { flex: 1 },
  recipientBlock: { marginVertical: 14 },
  recipientLine: { fontSize: 10, lineHeight: 1.4 },
  salutation: { fontSize: 10, marginBottom: 8, fontWeight: "bold" },
  signoff: { marginTop: 18, fontSize: 9.5 },
  multiNotice: {
    backgroundColor: "#fef3c7",
    borderLeftWidth: 3,
    borderLeftColor: "#d97706",
    padding: 8,
    marginVertical: 10,
  },
  multiText: { fontSize: 8, color: "#92400e", lineHeight: 1.4 },
});

const PURPOSE_LABELS: Record<string, { sw: string; en: string }> = {
  BENKI: { sw: "kufungua akaunti ya benki", en: "opening a bank account" },
  KAZI: { sw: "maombi ya kazi", en: "job application" },
  SHULE: { sw: "kuandikisha shuleni", en: "school enrollment" },
  AFYA: { sw: "huduma za afya", en: "health services" },
  LESENI_BIASHARA: { sw: "leseni ya biashara", en: "business licence" },
  LESENI_UENDESHAJI: { sw: "leseni ya uendeshaji", en: "driving licence" },
  SIM: { sw: "usajili wa namba ya simu", en: "SIM card registration" },
  PASSPORT: { sw: "maombi ya passport", en: "passport application" },
  TRA: { sw: "usajili wa TIN/TRA", en: "TRA/TIN registration" },
  BIMA: { sw: "bima ya afya/maisha", en: "health/life insurance" },
  USAJILI_SHULE: { sw: "usajili wa mtoto shuleni", en: "child school registration" },
  MKOPO: { sw: "maombi ya mkopo", en: "loan application" },
  MALI: { sw: "usajili wa mali isiyohamishika", en: "property registration" },
  HUDUMA_ZA_KIMSINGI: {
    sw: "huduma za kimsingi (umeme, maji, n.k.)",
    en: "utilities (water, electricity)",
  },
  UTHIBITISHO_KAZI: { sw: "uthibitisho wa kazi kutoka kwa mwajiri", en: "employer verification" },
  SERIKALI: { sw: "huduma za serikali", en: "government services" },
  NYINGINE: { sw: "madhumuni mengine", en: "other purposes" },
};

export const BaruaUtambulishoPDF: React.FC<DocumentPDFProps> = ({
  application,
  lang,
  qrDataUrl,
}) => {
  const user = application.users;
  const fd = (application.form_data || {}) as Record<string, string | undefined>;
  const weoSig = fd.weo_signature;
  const weoStamp = fd.weo_stamp;
  const weoName = fd.weo_name;
  const qr = qrDataUrl || generateQRCodeUrl(application, "IL");
  const sw = lang === "sw";

  const institutions = Array.isArray(fd.institutions) ? (fd.institutions as any[]) : [];
  const firstInst = institutions[0] || {};
  const purpose = String(fd.purpose || "");
  const purposeLabel = PURPOSE_LABELS[purpose]
    ? PURPOSE_LABELS[purpose][sw ? "sw" : "en"]
    : sw
      ? "madhumuni rasmi"
      : "official purposes";

  // Resolve beneficiary name (Self/Minor/Behalf)
  const appType = String(fd.application_type || "SELF");
  const beneficiaryName =
    appType === "MINOR"
      ? String(fd.minor_full_name || "")
      : appType === "BEHALF"
        ? String(fd.behalf_full_name || "")
        : formatFullName(user) !== "N/A"
          ? formatFullName(user)
          : fd.applicant_name || "N/A";
  const isSelf = appType === "SELF";

  // Genitive form for context
  const subjectName =
    beneficiaryName ||
    (formatFullName(user) !== "N/A" ? formatFullName(user) : fd.applicant_name || "N/A");

  return (
    <Document>
      <Page size="A4" style={s.page}>
        <Text style={s.watermark}>E-MTAA</Text>

        {/* Header */}
        <View style={[s.header, { paddingLeft: 0 }]}>
          <Image src={TANZANIA_LOGO_BASE64} style={s.logo} />
          <Text style={s.country}>JAMHURI YA MUUNGANO WA TANZANIA</Text>
          <Text style={s.office}>OFISI YA RAIS — TAMISEMI</Text>
          <Text style={s.council}>
            {user?.ward || fd.applicant_ward
              ? `OFISI YA SERIKALI YA MTAA — KATA YA ${String(user?.ward || fd.applicant_ward).toUpperCase()}`
              : "OFISI YA SERIKALI YA MTAA"}
          </Text>
          <View style={s.divider} />
        </View>

        {/* Title */}
        <View style={s.titleBlock}>
          <Text style={s.title}>{sw ? "BARUA YA UTAMBULISHO" : "LETTER OF INTRODUCTION"}</Text>
          <View style={s.appNumberBadge}>
            <Text style={s.appNumberText}>{application.application_number}</Text>
          </View>
        </View>

        {/* Letter metadata */}
        <View style={ls.letterMeta}>
          <View style={ls.metaRow}>
            <Text style={ls.metaLabel}>{sw ? "Kumb. Na.:" : "Ref. No.:"}</Text>
            <Text style={ls.metaValue}>{application.application_number}</Text>
          </View>
          <View style={ls.metaRow}>
            <Text style={ls.metaLabel}>{sw ? "Tarehe:" : "Date:"}</Text>
            <Text style={ls.metaValue}>
              {formatDate(application.approved_at || application.created_at)}
            </Text>
          </View>
        </View>

        {/* Recipient */}
        <View style={ls.recipientBlock}>
          <Text style={ls.recipientLine}>{sw ? "Kwa:" : "To:"}</Text>
          <Text style={[ls.recipientLine, { fontWeight: "bold" }]}>
            {firstInst.name || (sw ? "TAASISI HUSIKA" : "CONCERNED INSTITUTION")}
          </Text>
          {firstInst.department && !firstInst.department.includes("-") ? (
            <Text style={ls.recipientLine}>{String(firstInst.department)}</Text>
          ) : (
            <View />
          )}
          {firstInst.address ? (
            <Text style={ls.recipientLine}>{String(firstInst.address ?? "")}</Text>
          ) : (
            <View />
          )}
        </View>

        {/* Subject */}
        <Text style={s.subject}>
          {sw
            ? `YAH: UTAMBULISHO WA ${subjectName.toUpperCase()}`
            : `RE: INTRODUCTION OF ${subjectName.toUpperCase()}`}
        </Text>

        <Text style={ls.salutation}>{sw ? "Mpendwa Mhusika," : "Dear Sir/Madam,"}</Text>

        {/* Body */}
        <Text style={s.body}>
          {sw
            ? `Ofisi ya Serikali ya Mtaa, Kata ya ${user?.ward || fd.applicant_ward || "_______"}, Wilaya ya ${user?.district || fd.applicant_district || "_______"}, inathibitisha kuwa ndugu ${subjectName} ni mkazi halali wa mtaa huu, na ametambuliwa rasmi katika kumbukumbu za Ofisi hii.`
            : `The Local Government Office of ${user?.ward || fd.applicant_ward || "_______"} Ward, ${user?.district || fd.applicant_district || "_______"} District, hereby confirms that ${subjectName} is a legitimate resident of this locality and is officially registered in our records.`}
        </Text>

        <Text style={s.body}>
          {sw
            ? `Barua hii imetolewa kwa ajili ya ${purposeLabel}${firstInst.name ? ` katika taasisi ya ${firstInst.name}` : ""}. ${
                !isSelf
                  ? `Muombaji wa barua hii ni ${formatFullName(user) !== "N/A" ? formatFullName(user) : fd.applicant_name || "N/A"}${appType === "MINOR" ? ", mlezi wa mtoto." : ", anayemsaidia ndugu yake."}`
                  : ""
              }`
            : `This letter has been issued for the purpose of ${purposeLabel}${firstInst.name ? ` at ${firstInst.name}` : ""}. ${
                !isSelf
                  ? `The applicant of this letter is ${formatFullName(user) !== "N/A" ? formatFullName(user) : fd.applicant_name || "N/A"}${appType === "MINOR" ? ", the guardian of the child." : ", representing on their behalf."}`
                  : ""
              }`}
        </Text>

        <Text style={s.body}>
          {sw
            ? "Tafadhali toa msaada wowote wa kisheria na kiutendaji unaohitajika kwa ndugu huyu. Ofisi yetu iko tayari kwa uthibitisho zaidi inapohitajika."
            : "Kindly extend any lawful and procedural assistance required to the bearer. Our office remains available for further verification if needed."}
        </Text>

        {/* Applicant details panel */}
        <View style={s.sectionHeader}>
          <Text style={s.sectionTitle}>{sw ? "TAARIFA ZA MUOMBAJI" : "APPLICANT DETAILS"}</Text>
        </View>
        <View style={s.twoCol}>
          <View style={s.colLeft}>
            <View style={s.infoRow}>
              <Text style={s.infoLabel}>{sw ? "Jina Kamili:" : "Full Name:"}</Text>
              <Text style={s.infoValue}>{subjectName}</Text>
            </View>
            {isSelf ? (
              <View style={s.infoRow}>
                <Text style={s.infoLabel}>NIDA:</Text>
                <Text style={s.infoValue}>{user?.nida_number || fd.applicant_nida || "N/A"}</Text>
              </View>
            ) : (
              <View />
            )}
            {isSelf ? (
              <View style={s.infoRow}>
                <Text style={s.infoLabel}>{sw ? "Simu:" : "Phone:"}</Text>
                <Text style={s.infoValue}>{user?.phone || fd.applicant_phone || "N/A"}</Text>
              </View>
            ) : (
              <View />
            )}
          </View>
          <View style={s.colRight}>
            <View style={s.infoRow}>
              <Text style={s.infoLabel}>{sw ? "Mkoa:" : "Region:"}</Text>
              <Text style={s.infoValue}>{user?.region || fd.applicant_region || "N/A"}</Text>
            </View>
            <View style={s.infoRow}>
              <Text style={s.infoLabel}>{sw ? "Wilaya:" : "District:"}</Text>
              <Text style={s.infoValue}>{user?.district || fd.applicant_district || "N/A"}</Text>
            </View>
            <View style={s.infoRow}>
              <Text style={s.infoLabel}>{sw ? "Kata:" : "Ward:"}</Text>
              <Text style={s.infoValue}>{user?.ward || fd.applicant_ward || "N/A"}</Text>
            </View>
          </View>
        </View>

        {/* Multi-institution notice */}
        {institutions.length > 1 ? (
          <View style={ls.multiNotice}>
            <Text style={ls.multiText}>
              {sw
                ? `Kumbuka: Maombi haya yalihusu taasisi ${institutions.length}. Barua tofauti zinapatikana kwa kila taasisi: ${institutions.map((i: any) => i.name).join(", ")}.`
                : `Note: This request covered ${institutions.length} institutions. A separate letter is available for each: ${institutions.map((i: any) => i.name).join(", ")}.`}
            </Text>
          </View>
        ) : (
          <View />
        )}

        {/* Signature section */}
        <Text style={ls.signoff}>{sw ? "Wenu Mwaminifu," : "Yours faithfully,"}</Text>

        <View style={s.signatureSection}>
          <OfficerSignatureBox
            signature={weoSig}
            stamp={weoStamp}
            name={weoName}
            title={sw ? "AFISA MTENDAJI WA KATA" : "WARD EXECUTIVE OFFICER"}
          />
        </View>

        {/* QR code */}
        <View style={s.qrSection}>
          <View style={s.qrInner}>
            <View style={s.qrBorder}>
              <Image src={qr} style={s.qrCode} />
            </View>
            <Text style={s.qrLabel}>{sw ? "Changanua kuthibitisha" : "Scan to verify"}</Text>
            <Text style={s.qrRef}>{application.application_number}</Text>
          </View>
        </View>

        {/* Footer */}
        <View style={s.footer}>
          <Text style={s.footerText}>
            {sw
              ? "Barua hii ni rasmi. Inafaa kwa taasisi iliyoainishwa pekee."
              : "This letter is official. It is valid only for the institution stated above."}
          </Text>
          <Text style={s.metadata}>{`ISSUED: ${formatDate(application.created_at)} | E-MTAA`}</Text>
        </View>
      </Page>
        {/* Page 2: Payment Receipt */}
        <ReceiptPage application={application} lang={lang} qrDataUrl={qrDataUrl} />
    </Document>
  );
};

export default BaruaUtambulishoPDF;
