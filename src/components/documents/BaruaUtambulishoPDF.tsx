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
  letterMeta: { marginTop: 8, marginBottom: 5, fontSize: 9 },
  metaRow: { flexDirection: "row", marginBottom: 3 },
  metaLabel: { fontWeight: "bold", width: 70 },
  metaValue: { flex: 1 },
  recipientBlock: { marginVertical: 8 },
  recipientLine: { fontSize: 9.5, lineHeight: 1.3 },
  salutation: { fontSize: 9.5, marginBottom: 5, fontWeight: "bold" },
  signoff: { marginTop: 10, fontSize: 9.5 },
  multiNotice: {
    backgroundColor: "#f7f7f7",
    borderWidth: 0.5,
    borderColor: "#c0c0c0",
    borderLeftWidth: 3,
    borderLeftColor: "#d97706",
    padding: 6,
    marginVertical: 6,
  },
  multiText: { fontSize: 8, color: "#3a3a3a", lineHeight: 1.4 },
});

const PURPOSE_LABELS: Record<string, { sw: string; en: string }> = {
  BENKI: { sw: "kufungua akaunti ya benki", en: "opening a bank account" },
  KAZI: { sw: "maombi ya kazi", en: "job application" },
  AJIRA: { sw: "maombi ya kazi", en: "job application" },
  SHULE: { sw: "kuandikisha shuleni", en: "school enrollment" },
  CHUO: { sw: "maombi ya chuo / shule", en: "school/college application" },
  AFYA: { sw: "huduma za afya", en: "health services" },
  LESENI_BIASHARA: { sw: "leseni ya biashara", en: "business licence" },
  LESENI_UDEREVA: { sw: "leseni ya udereva", en: "driving licence" },
  LESENI_UENDESHAJI: { sw: "leseni ya uendeshaji", en: "driving licence" },
  SIM: { sw: "usajili wa namba ya simu", en: "SIM card registration" },
  PASIPOTI: { sw: "maombi ya pasipoti / visa", en: "passport / visa application" },
  PASSPORT: { sw: "maombi ya pasipoti", en: "passport application" },
  TRA: { sw: "usajili wa TIN/TRA", en: "TRA/TIN registration" },
  BIMA: { sw: "bima ya afya / maisha", en: "health/life insurance" },
  KUSAJILI_MTOTO: { sw: "usajili wa mtoto shuleni", en: "child school registration" },
  USAJILI_SHULE: { sw: "usajili wa mtoto shuleni", en: "child school registration" },
  MKOPO: { sw: "maombi ya mkopo", en: "loan application" },
  ARDHI: { sw: "ununuzi / upangaji wa ardhi au nyumba", en: "property purchase / rental" },
  MALI: { sw: "usajili wa mali isiyohamishika", en: "property registration" },
  HUDUMA_UMEME_MAJI: {
    sw: "huduma za umeme na maji (TANESCO/DAWASA)",
    en: "utilities (TANESCO/DAWASA)",
  },
  HUDUMA_ZA_KIMSINGI: {
    sw: "huduma za kimsingi (umeme, maji, n.k.)",
    en: "utilities (water, electricity)",
  },
  WAAJIRI: { sw: "uthibitisho wa kazi kutoka kwa mwajiri", en: "employer verification" },
  UTHIBITISHO_KAZI: { sw: "uthibitisho wa kazi kutoka kwa mwajiri", en: "employer verification" },
  SERIKALI: { sw: "huduma za serikali", en: "government services" },
  // Bail & Surety
  DHAMANA_POLISI: {
    sw: "dhamana ya kutoka polisi (bail bond)",
    en: "bail bond / release from police custody",
  },
  UDHAMINI: { sw: "udhamini wa mtu (personal surety)", en: "personal surety / guarantee" },
  NYINGINEZO: { sw: "madhumuni mengine", en: "other purposes" },
  NYINGINE: { sw: "madhumuni mengine", en: "other purposes" },
};

export const BaruaUtambulishoPDF: React.FC<DocumentPDFProps> = ({
  application,
  lang,
  qrDataUrl,
  photoUrl,
}) => {
  const user = application.users;
  const fd = (application.form_data || {}) as Record<string, string | undefined>;
  const weoSig = fd.weo_signature;
  const weoStamp = fd.weo_stamp;
  const weoName = fd.weo_name;
  const qr = qrDataUrl || generateQRCodeUrl(application, "IL");
  const sw = lang === "sw";

  // Photo: prop → uploaded selfie → profile photo_url → placeholder
  const uploadedDocs = (fd.uploaded_documents || []) as {
    type?: string;
    dataUrl?: string;
    url?: string;
  }[];
  const selfieDoc = uploadedDocs.find((d) => d.type === "selfie");
  const photo =
    photoUrl || selfieDoc?.dataUrl || selfieDoc?.url || user?.photo_url || fd.photo_url || null;

  const institutions = Array.isArray(fd.institutions) ? (fd.institutions as any[]) : [];
  const firstInst = institutions[0] || {};
  const globalPurpose = String(fd.purpose || "");

  // Resolve purpose for first institution: own purpose → global purpose → fallback
  const instPurpose = String(firstInst.purpose || globalPurpose || "");
  const instPurposeDetails = String(firstInst.purpose_details || fd.purpose_details || "");
  const purposeLabel = PURPOSE_LABELS[instPurpose]
    ? PURPOSE_LABELS[instPurpose][sw ? "sw" : "en"]
    : instPurposeDetails || (sw ? "madhumuni rasmi" : "official purposes");

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
      {/* ── One letter page per institution ── */}
      {(institutions.length > 0 ? institutions : [{}]).map((inst: any, idx: number) => {
        const thisPurposeKey = String(inst.purpose || globalPurpose || "");
        const thisPurposeDetails = String(inst.purpose_details || fd.purpose_details || "");
        const thisPurposeLabel = PURPOSE_LABELS[thisPurposeKey]
          ? PURPOSE_LABELS[thisPurposeKey][sw ? "sw" : "en"]
          : thisPurposeDetails || (sw ? "madhumuni rasmi" : "official purposes");
        const isBail = thisPurposeKey === "DHAMANA_POLISI" || thisPurposeKey === "UDHAMINI";

        return (
          <Page key={idx} size="A4" style={s.page}>
            <Text style={s.watermark}>E-MTAA</Text>

            {/* Photo box */}
            <View style={s.photoSection}>
              <View style={s.photoBox}>
                {photo ? (
                  <Image src={photo} style={s.photo} />
                ) : (
                  <Text style={s.photoPlaceholder}>{"PICHA\nPHOTO"}</Text>
                )}
              </View>
              <Text style={s.nidaLabel}>NIDA</Text>
              <Text style={s.nidaNumber}>{user?.nida_number || fd.applicant_nida || "—"}</Text>
            </View>

            {/* Government header */}
            <View style={s.header}>
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
                <Text style={s.appNumberText}>
                  {application.application_number}
                  {institutions.length > 1 ? ` (${idx + 1}/${institutions.length})` : ""}
                </Text>
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
              {institutions.length > 1 && (
                <View style={ls.metaRow}>
                  <Text style={ls.metaLabel}>{sw ? "Ukurasa:" : "Page:"}</Text>
                  <Text style={ls.metaValue}>
                    {sw
                      ? `Barua ${idx + 1} kati ya ${institutions.length}`
                      : `Letter ${idx + 1} of ${institutions.length}`}
                  </Text>
                </View>
              )}
            </View>

            {/* Recipient */}
            <View style={ls.recipientBlock}>
              <Text style={ls.recipientLine}>{sw ? "Kwa:" : "To:"}</Text>
              <Text style={[ls.recipientLine, { fontWeight: "bold" }]}>
                {inst.name || (sw ? "TAASISI HUSIKA" : "CONCERNED INSTITUTION")}
              </Text>
              {inst.department && !String(inst.department).includes("-") ? (
                <Text style={ls.recipientLine}>{String(inst.department)}</Text>
              ) : (
                <View />
              )}
              {inst.contact_person ? (
                <Text style={ls.recipientLine}>
                  {sw ? "Kwa: " : "Attn: "}
                  {String(inst.contact_person)}
                </Text>
              ) : (
                <View />
              )}
              {inst.address ? (
                <Text style={ls.recipientLine}>{String(inst.address)}</Text>
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

            {/* Body para 1 — residency confirmation */}
            <Text style={[s.body, { marginBottom: 8, lineHeight: 1.5 }]}>
              {sw
                ? `Ofisi ya Serikali ya Mtaa, Kata ya ${user?.ward || fd.applicant_ward || "_______"}, Wilaya ya ${user?.district || fd.applicant_district || "_______"}, inathibitisha kuwa ndugu ${subjectName} ni mkazi halali wa mtaa huu, na ametambuliwa rasmi katika kumbukumbu za Ofisi hii.`
                : `The Local Government Office of ${user?.ward || fd.applicant_ward || "_______"} Ward, ${user?.district || fd.applicant_district || "_______"} District, hereby confirms that ${subjectName} is a legitimate resident of this locality and is officially registered in our records.`}
            </Text>

            {/* Body para 2 — purpose */}
            <Text style={[s.body, { marginBottom: 8, lineHeight: 1.5 }]}>
              {sw
                ? `Barua hii imetolewa kwa ajili ya ${thisPurposeLabel}${inst.name ? ` katika taasisi ya ${inst.name}` : ""}. ${!isSelf ? `Muombaji wa barua hii ni ${formatFullName(user) !== "N/A" ? formatFullName(user) : fd.applicant_name || "N/A"}${appType === "MINOR" ? ", mlezi wa mtoto." : ", anayemsaidia ndugu yake."}` : ""}`
                : `This letter has been issued for the purpose of ${thisPurposeLabel}${inst.name ? ` at ${inst.name}` : ""}. ${!isSelf ? `The applicant of this letter is ${formatFullName(user) !== "N/A" ? formatFullName(user) : fd.applicant_name || "N/A"}${appType === "MINOR" ? ", the guardian of the child." : ", representing on their behalf."}` : ""}`}
            </Text>

            {/* Body para 3 — assistance */}
            <Text style={[s.body, { marginBottom: 8, lineHeight: 1.5 }]}>
              {sw
                ? "Tafadhali toa msaada wowote wa kisheria na kiutendaji unaohitajika kwa ndugu huyu. Ofisi yetu iko tayari kwa uthibitisho zaidi inapohitajika."
                : "Kindly extend any lawful and procedural assistance required to the bearer. Our office remains available for further verification if needed."}
            </Text>

            {/* Bail / surety special paragraph */}
            {isBail && (
              <Text style={[s.body, { marginBottom: 8, lineHeight: 1.5, fontStyle: "italic" }]}>
                {thisPurposeKey === "DHAMANA_POLISI"
                  ? sw
                    ? `Ofisi hii inathibitisha kuwa ndugu ${subjectName} anajulikana vizuri katika mtaa huu na ana tabia nzuri ya kuaminika. Ombi la dhamana (bail) linatolewa kwa heshima kwa mamlaka husika, kwa kuzingatia haki za kisheria za mtuhumiwa.`
                    : `This office confirms that ${subjectName} is well known in this community and is of good character. This letter respectfully supports a bail application to the relevant authority, in recognition of the accused's legal rights.`
                  : sw
                    ? `Ofisi hii inathibitisha kuwa ndugu ${subjectName} ni mkazi wa mtaa huu anayeaminika, na anaweza kuhudumia kama mdhamini (surety) kwa mtu mwingine kwa mujibu wa sheria.`
                    : `This office confirms that ${subjectName} is a trusted resident of this locality and is eligible to act as a surety/guarantor for another person in accordance with the law.`}
              </Text>
            )}

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
                    <Text style={s.infoValue}>
                      {user?.nida_number || fd.applicant_nida || "N/A"}
                    </Text>
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
                  <Text style={s.infoValue}>
                    {user?.district || fd.applicant_district || "N/A"}
                  </Text>
                </View>
                <View style={s.infoRow}>
                  <Text style={s.infoLabel}>{sw ? "Kata:" : "Ward:"}</Text>
                  <Text style={s.infoValue}>{user?.ward || fd.applicant_ward || "N/A"}</Text>
                </View>
              </View>
            </View>

            {/* Bundle notice on every page */}
            {institutions.length > 1 && (
              <View style={ls.multiNotice}>
                <Text style={ls.multiText}>
                  {sw
                    ? `Barua hii ni sehemu ya kifurushi cha taasisi ${institutions.length}. Ukurasa ${idx + 1} kati ya ${institutions.length} + risiti. Taasisi zote: ${institutions.map((i: any) => i.name || "?").join(" · ")}.`
                    : `This letter is part of a ${institutions.length}-institution bundle. Page ${idx + 1} of ${institutions.length} + receipt. All institutions: ${institutions.map((i: any) => i.name || "?").join(" · ")}.`}
                </Text>
              </View>
            )}

            {/* Signature + QR */}
            <Text style={ls.signoff}>{sw ? "Wenu Mwaminifu," : "Yours faithfully,"}</Text>
            <View
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                alignItems: "flex-start",
                marginTop: 10,
              }}
            >
              <View style={{ width: "55%" }}>
                <OfficerSignatureBox
                  signature={weoSig}
                  stamp={weoStamp}
                  name={weoName}
                  title={sw ? "AFISA MTENDAJI WA KATA" : "WARD EXECUTIVE OFFICER"}
                />
              </View>
              <View style={{ width: "35%", alignItems: "center", paddingTop: 8 }}>
                <View style={s.qrBorder}>
                  <Image src={qr} style={s.qrCode} />
                </View>
                <Text style={s.qrLabel}>{sw ? "Changanua kuthibitisha" : "Scan to verify"}</Text>
                <Text style={s.qrRef}>{application.application_number}</Text>
              </View>
            </View>

            {/* Footer */}
            <View
              style={{
                marginTop: 14,
                borderTopWidth: 0.5,
                borderTopColor: "#c0c0c0",
                paddingTop: 5,
              }}
            >
              <Text
                style={{
                  fontSize: 6,
                  color: "#999999",
                  fontWeight: "bold",
                  textAlign: "center",
                  textTransform: "uppercase",
                  letterSpacing: 0.3,
                  marginBottom: 3,
                }}
              >
                {sw
                  ? "MAONYESHO PEKEE — Si mfumo rasmi wa serikali, haujaidhinishwa kwa matumizi rasmi"
                  : "DEMONSTRATION ONLY — Not an official, approved government system"}
              </Text>
              <View
                style={{
                  flexDirection: "row",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <Text style={{ fontSize: 7, color: "#6b6b6b", fontStyle: "italic", flex: 1 }}>
                  {sw
                    ? `Barua hii ni rasmi. Inafaa kwa ${inst.name || "taasisi iliyoainishwa"} pekee.`
                    : `This letter is valid only for ${inst.name || "the institution stated"}.`}
                </Text>
                <Text
                  style={{
                    fontSize: 5.5,
                    color: "#c0c0c0",
                    fontFamily: "Courier",
                    textAlign: "right",
                  }}
                >
                  {`ISSUED: ${formatDate(application.created_at)} | E-MTAA`}
                </Text>
              </View>
            </View>
          </Page>
        );
      })}

      {/* ── Final page: Payment Receipt ── */}
      <ReceiptPage application={application} lang={lang} qrDataUrl={qrDataUrl} />
    </Document>
  );
};

export default BaruaUtambulishoPDF;
