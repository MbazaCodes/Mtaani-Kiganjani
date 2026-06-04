/**
 * Makubaliano ya Mauziano / Pangisha — Sales / Rental Agreement
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
  partyBox: {
    borderWidth: 1,
    borderColor: "#d6d3d1",
    padding: 10,
    marginBottom: 10,
    borderRadius: 2,
    backgroundColor: "#fafaf9",
  },
  partyRole: {
    fontSize: 7.5,
    fontWeight: "bold",
    color: "#059669",
    textTransform: "uppercase",
    marginBottom: 4,
    letterSpacing: 0.5,
  },
  priceBox: {
    backgroundColor: "#fef9ee",
    borderWidth: 2,
    borderColor: "#d97706",
    padding: 12,
    marginVertical: 10,
    alignItems: "center",
  },
  priceLabel: { fontSize: 8, color: "#92400e", marginBottom: 3 },
  priceAmt: { fontSize: 20, fontWeight: "bold", color: "#92400e" },
  assetBox: {
    backgroundColor: "#f0fdf4",
    borderLeftWidth: 3,
    borderLeftColor: "#059669",
    padding: 10,
    marginBottom: 10,
  },
  assetLabel: { fontSize: 7.5, color: "#065f46", fontWeight: "bold", marginBottom: 3 },
  assetValue: { fontSize: 9.5, color: "#1c1917" },
  termsText: { fontSize: 7.5, color: "#57534e", lineHeight: 1.6 },
  witnessBox: { borderTopWidth: 1, borderTopColor: "#d6d3d1", paddingTop: 10, marginTop: 8 },
  witnessTitle: { fontSize: 7.5, fontWeight: "bold", color: "#78716c", marginBottom: 6 },
});

const ASSET_LABELS: Record<string, { sw: string; en: string }> = {
  ARDHI: { sw: "Ardhi / Kiwanja", en: "Land / Plot" },
  GARI: { sw: "Gari", en: "Vehicle" },
  NYUMBA: { sw: "Nyumba", en: "House" },
  KODI_PANGO_MAKAZI: { sw: "Pango — Makazi", en: "Residential Rent" },
  KODI_PANGO_BIASHARA: { sw: "Pango — Biashara", en: "Commercial Rent" },
  NYINGINEZO: { sw: "Nyinginezo", en: "Other" },
};

export const MakubalianoMauzianoPDF: React.FC<DocumentPDFProps> = ({
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
  const qr = qrDataUrl || generateQRCodeUrl(application, "MUZ");
  const sw = lang === "sw";

  // Fallbacks: application.users is not joined — read seller snapshot from form_data
  const sellerName =
    formatFullName(user) !== "N/A" ? formatFullName(user) : String(fd.seller_name || "N/A");
  const sellerNida = user?.nida_number || fd.seller_nida || "—";
  const sellerCitizenId = user?.citizen_id || fd.seller_citizen_id || "—";

  const assetType = String(fd.asset_type || "");
  const isRental = assetType.startsWith("KODI");
  const assetLabel = (ASSET_LABELS[assetType] || { sw: assetType, en: assetType })[lang];
  const price = Number(fd.sale_price || fd.monthly_rent || 0);

  const L = {
    title: isRental
      ? sw
        ? "MAKUBALIANO YA UPANGISHAJI"
        : "RENTAL AGREEMENT"
      : sw
        ? "MAKUBALIANO YA MAUZIANO"
        : "SALES AGREEMENT",
    sellerParty: isRental
      ? sw
        ? "MPANGISHAJI (MWENYE NYUMBA)"
        : "LANDLORD"
      : sw
        ? "MUUZAJI"
        : "SELLER",
    buyerParty: isRental ? (sw ? "MPANGAJI" : "TENANT") : sw ? "MNUNUZI" : "BUYER",
    assetDetails: sw ? "TAARIFA ZA MALI / KITU" : "ASSET DETAILS",
    financials: sw ? "FEDHA NA MALIPO" : "FINANCIAL TERMS",
    terms: sw ? "MASHARTI YA MAKUBALIANO" : "AGREEMENT TERMS",
    signatures: sw ? "SAINI NA USHAHIDI" : "SIGNATURES & WITNESSES",
    scanVerify: sw ? "Changanua kuthibitisha" : "Scan to verify",
    footer: sw
      ? "Makubaliano haya ni rasmi na yamethibitishwa na E-Mtaa."
      : "This agreement is official and has been notarised via E-Mtaa.",
    issued: sw ? "Tarehe ya Makubaliano" : "Agreement Date",
    priceLabel: isRental
      ? sw
        ? "KODI KWA MWEZI"
        : "MONTHLY RENT"
      : sw
        ? "BEI YA MAUZO"
        : "SALE PRICE",
  };

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
          <Text style={s.title}>{L.title}</Text>
          <View style={s.appNumberBadge}>
            <Text style={s.appNumberText}>{application.application_number}</Text>
          </View>
        </View>

        {/* Asset type banner */}
        <View style={ls.assetBox}>
          <Text style={ls.assetLabel}>{sw ? "AINA YA MALI" : "ASSET TYPE"}</Text>
          <Text style={ls.assetValue}>{assetLabel}</Text>
        </View>

        {/* Price */}
        <View style={ls.priceBox}>
          <Text style={ls.priceLabel}>{L.priceLabel}</Text>
          <Text style={ls.priceAmt}>{formatCurrency(price)}</Text>
          {isRental && fd.payment_period ? (
            <Text style={{ fontSize: 8, color: "#92400e", marginTop: 3 }}>
              {sw
                ? `Muda wa Pango: ${fd.payment_period ?? ""} miezi`
                : `Rental Period: ${fd.payment_period ?? ""} months`}
            </Text>
          ) : (
            <View />
          )}
        </View>

        {/* Asset description */}
        <View style={s.sectionHeader}>
          <Text style={s.sectionTitle}>{L.assetDetails}</Text>
        </View>
        {fd.asset_description ? (
          <Text style={{ fontSize: 9, color: "#1c1917", marginBottom: 10, lineHeight: 1.5 }}>
            {String(fd.asset_description)}
          </Text>
        ) : (
          <View />
        )}

        {/* Parties */}
        <View style={s.sectionHeader}>
          <Text style={s.sectionTitle}>
            {sw ? "WAHUSIKA WA MAKUBALIANO" : "PARTIES TO THE AGREEMENT"}
          </Text>
        </View>
        <View style={s.twoCol}>
          <View style={s.colLeft}>
            <View style={ls.partyBox}>
              <Text style={ls.partyRole}>{L.sellerParty}</Text>
              <Row label={sw ? "Jina" : "Name"} value={sellerName} />
              <Row label="NIDA" value={sellerNida} />
              <Row label={sw ? "Raia ID" : "Cit. ID"} value={sellerCitizenId} />
              {fd.seller_tin ? <Row label="TIN" value={fd.seller_tin ?? ""} /> : <View />}
            </View>
          </View>
          <View style={s.colRight}>
            <View style={ls.partyBox}>
              <Text style={ls.partyRole}>{L.buyerParty}</Text>
              <Row
                label={sw ? "Jina" : "Name"}
                value={fd.second_party_name || fd.buyer_name || fd.tenant_name}
              />
              <Row label="NIDA" value={fd.buyer_nida || fd.tenant_nida || fd.target_user_nida} />
              <Row label={sw ? "Raia ID" : "Cit. ID"} value={fd.second_party_citizen_id ?? ""} />
            </View>
          </View>
        </View>

        {/* Financials */}
        <View style={s.sectionHeader}>
          <Text style={s.sectionTitle}>{L.financials}</Text>
        </View>
        <View style={s.twoCol}>
          <View style={s.colLeft}>
            <Row
              label={sw ? "Jumla" : "Total"}
              value={formatCurrency(Number(fd.total_amount || fd.total_rent || price))}
            />
            <Row
              label={sw ? "VAT (18%)" : "VAT (18%)"}
              value={formatCurrency(Number(fd.vat_amount || 0))}
            />
          </View>
          <View style={s.colRight}>
            <Row
              label={sw ? "Ada ya Huduma" : "Service Fee"}
              value={formatCurrency(Number(fd.service_fee || 0))}
            />
          </View>
        </View>

        {/* Signatures */}
        <View style={s.signatureSection}>
          <ApplicantSignatureBox signature={applicantSig} name={sellerName} title={L.sellerParty} />
          <View style={s.signatureBox}>
            <View style={s.signatureLine} />
            <Text style={s.signatureName}>
              {String(
                fd.second_party_name || fd.buyer_name || fd.tenant_name || "______________________",
              )}
            </Text>
            <Text style={s.signatureTitle}>{L.buyerParty}</Text>
          </View>
        </View>
        {/* WEO */}
        <View
          style={{
            flexDirection: "row",
            justifyContent: "center",
            marginTop: 10,
          }}
        >
          <OfficerSignatureBox
            signature={weoSig}
            stamp={weoStamp}
            name={weoName}
            title={sw ? "AFISA MTENDAJI WA MTAA" : "WARD EXECUTIVE OFFICER"}
          />
        </View>

        {/* QR */}
        <View style={s.qrSection}>
          <View style={s.qrInner}>
            <View style={s.qrBorder}>
              <Image src={qr} style={s.qrCode} />
            </View>
            <Text style={s.qrLabel}>{L.scanVerify}</Text>
            <Text style={s.qrRef}>{application.application_number}</Text>
          </View>
        </View>

        {/* Footer */}
        <View style={s.footer}>
          <Text style={s.footerText}>{L.footer}</Text>
          <Text style={s.metadata}>
            {L.issued}: {formatDate(application.approved_at || application.created_at)}
          </Text>
        </View>
      </Page>
    </Document>
  );
};

export default MakubalianoMauzianoPDF;
