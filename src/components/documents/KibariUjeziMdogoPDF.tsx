/**
 * Kibari cha Ujezi Mdogo — Minor Construction Permit
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
import { ReceiptPage } from "./ReceiptPage";
import { TANZANIA_LOGO_BASE64 } from "@/constants/logo";

const ls = StyleSheet.create({
  banner: {
    backgroundColor: "#d97706",
    paddingVertical: 10,
    paddingHorizontal: 14,
    marginBottom: 14,
    alignItems: "center",
  },
  bannerTitle: {
    color: "#ffffff",
    fontSize: 11,
    fontWeight: "bold",
    textTransform: "uppercase",
    marginBottom: 2,
  },
  bannerSub: { color: "#fef3c7", fontSize: 9, fontStyle: "italic" },
  costBox: {
    backgroundColor: "#fef3c7",
    borderWidth: 2,
    borderColor: "#d97706",
    padding: 10,
    alignItems: "center",
    marginVertical: 10,
  },
  costAmount: { fontSize: 14, fontWeight: "bold", color: "#92400e" },
  costLabel: { fontSize: 8, color: "#a16207" },
  noticeBox: {
    backgroundColor: "#fef3c7",
    borderLeftWidth: 3,
    borderLeftColor: "#d97706",
    padding: 8,
    marginVertical: 8,
  },
  noticeText: { fontSize: 8, color: "#92400e", lineHeight: 1.5 },
});

const CONSTRUCTION_LABELS: Record<string, { sw: string; en: string }> = {
  UZIO: { sw: "Uzio / Ukuta", en: "Fence / Boundary Wall" },
  BARABAKA: { sw: "Barabaka Ndogo / Njia", en: "Small Road / Footpath" },
  MAREKEBISHO: { sw: "Marekebisho ya Nyumba", en: "House Renovation" },
  UPANUZI: { sw: "Chumba cha Ziada / Upanuzi", en: "Extension Room" },
  BWAWA: { sw: "Bwawa / Tangi / Kisima", en: "Water Tank / Well / Pond" },
  GARAGE: { sw: "Banda la Magari", en: "Car Shelter / Garage" },
  CHOO: { sw: "Choo cha Nje", en: "Outdoor Latrine" },
  NYINGINE: { sw: "Nyingine", en: "Other" },
};

const MATERIAL_LABELS: Record<string, { sw: string; en: string }> = {
  CONCRETE: { sw: "Zege / Simiti", en: "Concrete" },
  BRICKS: { sw: "Matofali", en: "Bricks" },
  TIMBER: { sw: "Mbao", en: "Timber" },
  METAL: { sw: "Chuma / Mabati", en: "Metal" },
  MIXED: { sw: "Mchanganyiko", en: "Mixed" },
  OTHER: { sw: "Nyingine", en: "Other" },
};

export const KibariUjeziMdogoPDF: React.FC<DocumentPDFProps> = ({
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
  const qr = qrDataUrl || generateQRCodeUrl(application, "CP");
  const sw = lang === "sw";

  const Row = ({ label, value }: { label: string; value?: string | undefined }) => (
    <View style={s.infoRow}>
      <Text style={s.infoLabel}>{label}:</Text>
      <Text style={s.infoValue}>{String(value || "N/A")}</Text>
    </View>
  );

  const constructionType = String(fd.construction_type || "");
  const constructionLabel = CONSTRUCTION_LABELS[constructionType]
    ? CONSTRUCTION_LABELS[constructionType][sw ? "sw" : "en"]
    : constructionType;
  const materialLabel = MATERIAL_LABELS[String(fd.primary_material || "")]
    ? MATERIAL_LABELS[String(fd.primary_material || "")][sw ? "sw" : "en"]
    : String(fd.primary_material || "");

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
          <Text style={s.title}>{sw ? "KIBARI CHA UJEZI MDOGO" : "MINOR CONSTRUCTION PERMIT"}</Text>
          <View style={s.appNumberBadge}>
            <Text style={s.appNumberText}>{application.application_number}</Text>
          </View>
        </View>

        {/* Construction banner */}
        <View style={ls.banner}>
          <Text style={ls.bannerTitle}>
            {constructionLabel || (sw ? "UJENZI" : "CONSTRUCTION")}
          </Text>
          {fd.construction_dimensions ? (
            <Text style={ls.bannerSub}>{String(fd.construction_dimensions)}</Text>
          ) : (
            <View />
          )}
        </View>

        {/* Cost summary */}
        {fd.estimated_cost ? (
          <View style={ls.costBox}>
            <Text style={ls.costAmount}>{formatCurrency(Number(fd.estimated_cost))}</Text>
            <Text style={ls.costLabel}>{sw ? "GHARAMA INAYOKADIRIWA" : "ESTIMATED COST"}</Text>
          </View>
        ) : (
          <View />
        )}

        {/* Owner section */}
        <View style={s.sectionHeader}>
          <Text style={s.sectionTitle}>{sw ? "MMILIKI / MUOMBAJI" : "OWNER / APPLICANT"}</Text>
        </View>
        <Row
          label={sw ? "Jina Kamili" : "Full Name"}
          value={fd.owner_name || formatFullName(user)}
        />
        <Row label={sw ? "Simu" : "Phone"} value={fd.owner_phone || user?.phone} />
        <Row label="NIDA" value={fd.owner_nida || user?.nida_number || "—"} />
        <Row label={sw ? "Hali ya Umiliki" : "Ownership"} value={fd.property_ownership ?? ""} />

        {/* Property section */}
        <View style={s.sectionHeader}>
          <Text style={s.sectionTitle}>{sw ? "ENEO LA UJENZI" : "CONSTRUCTION SITE"}</Text>
        </View>
        <View style={s.twoCol}>
          <View style={s.colLeft}>
            <Row label={sw ? "Mkoa" : "Region"} value={fd.property_region ?? ""} />
            <Row label={sw ? "Wilaya" : "District"} value={fd.property_district ?? ""} />
            <Row label={sw ? "Kata" : "Ward"} value={fd.property_ward ?? ""} />
          </View>
          <View style={s.colRight}>
            <Row label={sw ? "Mtaa" : "Street"} value={fd.property_street ?? ""} />
            <Row label={sw ? "Namba ya Nyumba" : "House No."} value={fd.house_number ?? ""} />
            <Row label="Plot" value={fd.plot_number ?? ""} />
          </View>
        </View>

        {/* Construction details */}
        <View style={s.sectionHeader}>
          <Text style={s.sectionTitle}>{sw ? "MAELEZO YA UJENZI" : "CONSTRUCTION DETAILS"}</Text>
        </View>
        <Row label={sw ? "Aina ya Ujenzi" : "Type"} value={constructionLabel} />
        <Row label={sw ? "Nyenzo Kuu" : "Primary Material"} value={materialLabel} />
        {fd.construction_dimensions ? (
          <Row label={sw ? "Kipimo" : "Dimensions"} value={fd.construction_dimensions ?? ""} />
        ) : (
          <View />
        )}
        <Row label={sw ? "Maelezo" : "Description"} value={fd.construction_description ?? ""} />

        {/* Timeline & contractor */}
        <View style={s.sectionHeader}>
          <Text style={s.sectionTitle}>{sw ? "RATIBA NA FUNDI" : "TIMELINE & CONTRACTOR"}</Text>
        </View>
        <View style={s.twoCol}>
          <View style={s.colLeft}>
            <Row label={sw ? "Tarehe ya Kuanza" : "Start Date"} value={fd.start_date ?? ""} />
            <Row
              label={sw ? "Tarehe ya Kukamilika" : "Completion Date"}
              value={fd.end_date ?? ""}
            />
          </View>
          <View style={s.colRight}>
            <Row label={sw ? "Fundi" : "Contractor"} value={fd.contractor_name ?? ""} />
            <Row
              label={sw ? "Simu ya Fundi" : "Contractor Phone"}
              value={fd.contractor_phone ?? ""}
            />
          </View>
        </View>

        {/* Notice */}
        <View style={ls.noticeBox}>
          <Text style={ls.noticeText}>
            {sw
              ? "⚠ Kibari hiki kinapaswa kuwepo eneo la ujenzi wakati wote. Ujenzi lazima ufuate masharti yaliyokubaliwa. Mkaguzi anaweza kutembelea wakati wowote."
              : "⚠ This permit must remain on the construction site throughout. Construction must follow approved conditions. An inspector may visit at any time."}
          </Text>
        </View>

        {/* Signature section */}
        <View style={s.signatureSection}>
          <ApplicantSignatureBox
            signature={applicantSig}
            name={fd.owner_name || formatFullName(user)}
            title={sw ? "MMILIKI / OWNER" : "OWNER"}
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
            {sw
              ? "Kibari hiki ni rasmi. Lazima kionyeshwe eneo la ujenzi wakati wote."
              : "This permit is official. It must be displayed at the site at all times."}
          </Text>
          <Text style={s.metadata}>{`ISSUED: ${formatDate(application.created_at)} | E-MTAA`}</Text>
        </View>
      </Page>
        {/* Page 2: Payment Receipt */}
        <ReceiptPage application={application} lang={lang} qrDataUrl={qrDataUrl} />
    </Document>
  );
};

export default KibariUjeziMdogoPDF;
