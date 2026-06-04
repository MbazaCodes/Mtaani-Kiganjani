/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Migogoro na Mashauri — Dispute / Community Issue Report
 * Dual-purpose: citizen dispute (court-style) or community issue report.
 */
import React from "react";
import { Document, Page, Text, View, Image, StyleSheet } from "@react-pdf/renderer";
import {
  DocumentPDFProps,
  commonStyles as s,
  generateQRCodeUrl,
  formatFullName,
  formatDate,
  formatCurrency,
} from "./types";
import { ApplicantSignatureBox, OfficerSignatureBox } from "./SignatureBlocks";
import { TANZANIA_LOGO_BASE64 } from "@/constants/logo";

const ls = StyleSheet.create({
  banner: { paddingVertical: 10, paddingHorizontal: 14, marginBottom: 14, alignItems: "center" },
  bannerTitle: {
    color: "#ffffff",
    fontSize: 13,
    fontWeight: "bold",
    textTransform: "uppercase",
    marginBottom: 2,
  },
  bannerSub: { color: "#fecaca", fontSize: 9, fontStyle: "italic" },
  partyBox: { borderWidth: 1, borderRadius: 4, padding: 8, marginVertical: 4 },
  partyLabel: { fontSize: 7.5, fontWeight: "bold", marginBottom: 3, textTransform: "uppercase" },
  urgencyBadge: {
    paddingVertical: 3,
    paddingHorizontal: 10,
    alignSelf: "center",
    marginVertical: 8,
  },
  urgencyText: { fontSize: 10, fontWeight: "bold", color: "#ffffff" },
  descBox: {
    backgroundColor: "#fafaf8",
    borderWidth: 0.5,
    borderColor: "#d6d3d1",
    padding: 10,
    marginVertical: 8,
    minHeight: 60,
  },
  descText: { fontSize: 9, lineHeight: 1.6, color: "#0f0f0f" },
});

const DISPUTE_LABELS: Record<string, { sw: string; en: string }> = {
  ARDHI: { sw: "Mgogoro wa Ardhi", en: "Land Dispute" },
  MIPAKA: { sw: "Mipaka ya Ardhi", en: "Boundary Dispute" },
  URITHI: { sw: "Mali na Urithi", en: "Property / Inheritance" },
  NDOA: { sw: "Masuala ya Ndoa", en: "Marriage Issues" },
  WATOTO: { sw: "Watoto / Malezi", en: "Children / Custody" },
  FAMILIA: { sw: "Ndugu / Familia", en: "Family Relations" },
  BIASHARA: { sw: "Mgogoro wa Biashara", en: "Business Dispute" },
  MKOPO: { sw: "Mkopo / Madeni", en: "Debt / Loan" },
  KELELE: { sw: "Kelele za Majirani", en: "Noise from Neighbours" },
  UGOMVI: { sw: "Ugomvi wa Kibinafsi", en: "Personal Conflict" },
  MAUZO: { sw: "Mauzo / Ununuzi", en: "Sale / Purchase Disagreement" },
  PANGO: { sw: "Pango", en: "Rental Dispute" },
  NYINGINE: { sw: "Nyingine", en: "Other" },
};

const ISSUE_LABELS: Record<string, { sw: string; en: string }> = {
  USAFI: { sw: "Usafi wa Mazingira", en: "Environmental Sanitation" },
  TAKA: { sw: "Taka Zisizoinuliwa", en: "Uncollected Garbage" },
  BARABARA: { sw: "Barabara Mbovu", en: "Damaged Road" },
  MIFEREJI: { sw: "Mifereji ya Maji", en: "Drainage Blockage" },
  MAJI: { sw: "Maji Safi", en: "Water Supply Problem" },
  UMEME: { sw: "Umeme wa Barabara", en: "Street Lighting" },
  UJENZI_HARAMU: { sw: "Ujenzi Haramu", en: "Illegal Construction" },
  UHALIFU: { sw: "Tendo la Uhalifu", en: "Criminal Activity" },
  WANYAMA: { sw: "Wanyama Wapotevu", en: "Stray Animals" },
  UCHAFUZI: { sw: "Uchafuzi wa Hewa/Maji", en: "Pollution" },
  HATARI: { sw: "Sehemu ya Hatari", en: "Safety Hazard" },
  NYINGINE: { sw: "Nyingine", en: "Other" },
};

const RESOLUTION_LABELS: Record<string, { sw: string; en: string }> = {
  MEDIATION: { sw: "Mapatanisho ya Kirafiki", en: "Friendly Mediation" },
  TRIBUNAL: { sw: "Mahakama ya Mtaa", en: "Local Tribunal" },
  COURT: { sw: "Mahakama Kuu", en: "Formal Court" },
  ADVICE: { sw: "Ushauri Tu", en: "Advice Only" },
};

const URGENCY_COLORS: Record<string, { bg: string; sw: string; en: string }> = {
  NORMAL: { bg: "#78716c", sw: "KAWAIDA", en: "NORMAL" },
  URGENT: { bg: "#d97706", sw: "HARAKA", en: "URGENT" },
  EMERGENCY: { bg: "#dc2626", sw: "DHARURA", en: "EMERGENCY" },
};

export const MgogoroMashauriPDF: React.FC<DocumentPDFProps> = ({
  application,
  lang,
  qrDataUrl,
}) => {
  const user = application.users;
  const fd = (application.form_data || {}) as Record<string, string | undefined>;
  const applicantSig = fd.applicant_signature;
  const weoSig = fd.weo_signature;
  const weoStamp = fd.weo_stamp;
  const weoName = fd.weo_name;
  const qr = qrDataUrl || generateQRCodeUrl(application, "DS");
  const sw = lang === "sw";

  // Fallbacks: application.users is not joined — read complainant snapshot from form_data
  const compName =
    formatFullName(user) !== "N/A" ? formatFullName(user) : String(fd.complainant_name || "N/A");
  const compNida = user?.nida_number || fd.complainant_nida || "—";
  const compPhone = user?.phone || fd.complainant_phone || "—";
  const compWard = user?.ward || fd.complainant_ward || "—";

  const isDispute = fd.mode === "CITIZEN_DISPUTE";
  const typeKey = String(isDispute ? fd.dispute_type : fd.issue_type || "");
  const typeLabel = isDispute
    ? DISPUTE_LABELS[typeKey]?.[sw ? "sw" : "en"] || typeKey
    : ISSUE_LABELS[typeKey]?.[sw ? "sw" : "en"] || typeKey;
  const urgency = String(fd.urgency || "NORMAL");
  const urgMeta = URGENCY_COLORS[urgency] || URGENCY_COLORS.NORMAL;
  const resolution =
    RESOLUTION_LABELS[String(fd.resolution_preference || "")]?.[sw ? "sw" : "en"] || "";

  const Row = ({ label, value }: { label: string; value?: string | undefined }) => (
    <View style={s.infoRow}>
      <Text style={s.infoLabel}>{label}:</Text>
      <Text style={s.infoValue}>{String(value || "N/A")}</Text>
    </View>
  );

  return (
    <Document>
      <Page size="A4" style={s.page}>
        <Text style={s.watermark}>E-MTAA</Text>

        {/* Header */}
        <View style={[s.header, { paddingLeft: 0 }]}>
          <Image src={TANZANIA_LOGO_BASE64} style={s.logo} />
          <Text style={s.country}>JAMHURI YA MUUNGANO WA TANZANIA</Text>
          <Text style={s.office}>OFISI YA RAIS — TAMISEMI</Text>
          <View style={s.divider} />
        </View>

        {/* Title */}
        <View style={s.titleBlock}>
          <Text style={s.title}>
            {isDispute
              ? sw
                ? "TAARIFA YA MGOGORO WA RAIA"
                : "CITIZEN DISPUTE REPORT"
              : sw
                ? "RIPOTI YA TATIZO LA KIJAMII"
                : "COMMUNITY ISSUE REPORT"}
          </Text>
          <View style={s.appNumberBadge}>
            <Text style={s.appNumberText}>{application.application_number}</Text>
          </View>
        </View>

        {/* Type banner */}
        <View style={[ls.banner, { backgroundColor: isDispute ? "#e11d48" : "#d97706" }]}>
          <Text style={ls.bannerTitle}>{typeLabel}</Text>
          {fd.title ? <Text style={ls.bannerSub}>{String(fd.title)}</Text> : <View />}
        </View>

        {/* Urgency badge */}
        <View style={[ls.urgencyBadge, { backgroundColor: urgMeta.bg }]}>
          <Text style={ls.urgencyText}>{sw ? urgMeta.sw : urgMeta.en}</Text>
        </View>

        {/* Complainant */}
        <View style={s.sectionHeader}>
          <Text style={s.sectionTitle}>{sw ? "MLALAMIKAJI" : "COMPLAINANT"}</Text>
        </View>
        <View style={s.twoCol}>
          <View style={s.colLeft}>
            <Row label={sw ? "Jina" : "Name"} value={compName} />
            <Row label="NIDA" value={compNida} />
          </View>
          <View style={s.colRight}>
            <Row label={sw ? "Simu" : "Phone"} value={compPhone} />
            <Row label={sw ? "Kata" : "Ward"} value={compWard} />
          </View>
        </View>

        {/* Respondent (citizen dispute only) */}
        {isDispute ? (
          <View>
            <View style={s.sectionHeader}>
              <Text style={s.sectionTitle}>{sw ? "MLALAMIKIWA" : "RESPONDENT"}</Text>
            </View>
            {fd.respondent_in_system ? (
              <View style={s.twoCol}>
                <View style={s.colLeft}>
                  <Row label={sw ? "Jina" : "Name"} value={fd.respondent_name ?? ""} />
                  <Row label="NIDA" value={fd.respondent_nida || (fd as any).target_user_nida} />
                </View>
                <View style={s.colRight}>
                  <Row label={sw ? "Simu" : "Phone"} value={fd.respondent_phone ?? ""} />
                  <Row
                    label={sw ? "Hali" : "Status"}
                    value={sw ? "Yupo kwenye mfumo ✓" : "In system ✓"}
                  />
                </View>
              </View>
            ) : (
              <View>
                <Row
                  label={sw ? "Jina" : "Name"}
                  value={fd.respondent_name_manual || fd.respondent_name}
                />
                {fd.respondent_phone_manual ? (
                  <Row label={sw ? "Simu" : "Phone"} value={fd.respondent_phone_manual ?? ""} />
                ) : (
                  <View />
                )}
                {fd.respondent_address_manual ? (
                  <Row
                    label={sw ? "Anwani" : "Address"}
                    value={fd.respondent_address_manual ?? ""}
                  />
                ) : (
                  <View />
                )}
                <Row
                  label={sw ? "Hali" : "Status"}
                  value={sw ? "Hayupo kwenye mfumo" : "Not in system"}
                />
              </View>
            )}
          </View>
        ) : (
          <View />
        )}

        {/* Community issue location */}
        {!isDispute ? (
          <View>
            <View style={s.sectionHeader}>
              <Text style={s.sectionTitle}>{sw ? "ENEO LA TATIZO" : "ISSUE LOCATION"}</Text>
            </View>
            <Row label={sw ? "Mahali" : "Location"} value={fd.issue_location ?? ""} />
            <View style={s.twoCol}>
              <View style={s.colLeft}>
                <Row label={sw ? "Kata" : "Ward"} value={fd.issue_ward ?? ""} />
              </View>
              <View style={s.colRight}>
                <Row label={sw ? "Wilaya" : "District"} value={fd.issue_district ?? ""} />
              </View>
            </View>
          </View>
        ) : (
          <View />
        )}

        {/* Case details */}
        <View style={s.sectionHeader}>
          <Text style={s.sectionTitle}>{sw ? "MAELEZO YA SHAURI" : "CASE DETAILS"}</Text>
        </View>
        <Row label={sw ? "Kichwa" : "Title"} value={fd.title ?? ""} />
        {fd.incident_date ? (
          <Row label={sw ? "Tarehe ya Tukio" : "Incident Date"} value={fd.incident_date ?? ""} />
        ) : (
          <View />
        )}
        {isDispute && resolution ? (
          <Row
            label={sw ? "Suluhisho Linalopendekezwa" : "Preferred Resolution"}
            value={resolution}
          />
        ) : (
          <View />
        )}

        {/* Description box */}
        <View style={ls.descBox}>
          <Text style={ls.descText}>{String(fd.description || "")}</Text>
        </View>

        {/* Witnesses (citizen dispute only) */}
        {isDispute && (fd.witness1_name || fd.witness2_name) ? (
          <View>
            <View style={s.sectionHeader}>
              <Text style={s.sectionTitle}>{sw ? "MASHAHIDI" : "WITNESSES"}</Text>
            </View>
            {fd.witness1_name ? (
              <Row
                label={`${sw ? "Shahidi" : "Witness"} 1`}
                value={`${fd.witness1_name} · ${fd.witness1_phone || ""}`}
              />
            ) : (
              <View />
            )}
            {fd.witness2_name ? (
              <Row
                label={`${sw ? "Shahidi" : "Witness"} 2`}
                value={`${fd.witness2_name} · ${fd.witness2_phone || ""}`}
              />
            ) : (
              <View />
            )}
          </View>
        ) : (
          <View />
        )}

        {/* Fee (dispute only) */}
        {isDispute ? (
          <View style={s.noticeBox}>
            <Text style={s.noticeText}>
              {sw
                ? `Ada ya mapatanisho: TZS 5,000. Lipa ofisini wakati wa kupanga tarehe ya mapatanisho.`
                : `Mediation fee: TZS 5,000. Pay at the office when scheduling the mediation date.`}
            </Text>
          </View>
        ) : (
          <View />
        )}

        {/* Signature section */}
        <View style={s.signatureSection}>
          <ApplicantSignatureBox
            signature={applicantSig}
            name={compName}
            title={sw ? "MLALAMIKAJI / COMPLAINANT" : "COMPLAINANT"}
          />
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
            {isDispute
              ? sw
                ? "Shauri hili lipo chini ya uchunguzi. Pande zote zitaitwa."
                : "This case is under investigation. Both parties will be summoned."
              : sw
                ? "Ripoti hii imesajiliwa rasmi. Ofisi itashughulikia."
                : "This report has been officially registered. The office will follow up."}
          </Text>
          <Text style={s.metadata}>{`FILED: ${formatDate(application.created_at)} | E-MTAA`}</Text>
        </View>
      </Page>
    </Document>
  );
};

export default MgogoroMashauriPDF;
