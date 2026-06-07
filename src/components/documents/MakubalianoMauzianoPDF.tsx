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
import { ReceiptPage } from "./ReceiptPage";
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
    color: "#111111",
    textTransform: "uppercase",
    marginBottom: 4,
    letterSpacing: 0.5,
  },
  priceBox: {
    backgroundColor: "#f7f7f7",
    borderWidth: 0.5,
    borderColor: "#c0c0c0",
    padding: 8,
    marginVertical: 3,
    alignItems: "center",
  },
  priceLabel: { fontSize: 7, color: "#6b6b6b", marginBottom: 2 },
  priceAmt: { fontSize: 14, fontWeight: "bold", color: "#111111" },
  assetBox: {
    backgroundColor: "#f7f7f7",
    borderWidth: 0.5,
    borderColor: "#c0c0c0",
    borderLeftWidth: 3,
    borderLeftColor: "#059669",
    padding: 7,
    marginBottom: 6,
  },
  assetLabel: { fontSize: 7, color: "#6b6b6b", fontWeight: "bold", marginBottom: 2 },
  assetValue: { fontSize: 9, color: "#111111" },
  termsText: { fontSize: 7.5, color: "#57534e", lineHeight: 1.6 },
  witnessBox: { borderTopWidth: 1, borderTopColor: "#d6d3d1", paddingTop: 10, marginTop: 8 },
  witnessTitle: { fontSize: 7.5, fontWeight: "bold", color: "#78716c", marginBottom: 3 },
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
  const vatRate = 0.18;
  const vatAmount = Number(fd.vat_amount) || Math.round(price * vatRate);
  const serviceFee = Number(fd.service_fee) || 5000;
  const totalAmount = Number(fd.total_amount || fd.total_rent) || (price + vatAmount + serviceFee);

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
    preamble: sw
      ? "Makubaliano haya yanafanywa kati ya wahusika walioainishwa hapa chini, kwa ridhaa yao wenyewe na kwa masharti yaliyoelezwa katika hati hii. Pande zote mbili zinakubaliana kutekeleza wajibu wao kama ilivyoainishwa."
      : "This agreement is entered into by and between the parties identified below, of their own free will and subject to the terms and conditions set forth herein. Both parties agree to fulfil their respective obligations as outlined.",
    termsIntro: sw ? "Pande zote zinakubaliana na masharti yafuatayo:" : "Both parties agree to the following terms and conditions:",
    clause1: sw ? "Mali/kitu kilichoainishwa hapo juu kitahamishwa kutoka kwa muuzaji kwenda kwa mnunuzi baada ya malipo yote kukamilika." : "The asset/item described above shall be transferred from the seller to the buyer upon completion of all payments.",
    clause2: sw ? "Muuzaji anadhibitisha kuwa mali/kitu hiki ni chake halali na hana deni lolote juu yake." : "The seller confirms that the asset/item is their lawful property and is free from any encumbrances, liens, or debts.",
    clause3: sw ? "Mnunuzi amekagua mali/kitu na anakubali hali yake ya sasa." : "The buyer has inspected the asset/item and accepts it in its current condition.",
    clause4: sw ? "Mgogoro wowote utatatuliwa kwanza kwa mazungumzo, kisha kwa usuluhishi kupitia ofisi ya serikali ya mtaa husika." : "Any disputes shall be resolved first through negotiation, then by mediation through the relevant local government office.",
    clause5: sw ? "Makubaliano haya yanaongozwa na sheria za Jamhuri ya Muungano wa Tanzania." : "This agreement is governed by the laws of the United Republic of Tanzania.",
    clause6: sw ? "Makubaliano haya yanafanya kazi tangu tarehe ya kusainiwa na pande zote mbili." : "This agreement becomes effective from the date of signing by both parties.",
    sellerObligations: sw ? "WAJIBU WA MUUZAJI" : "SELLER OBLIGATIONS",
    buyerObligations: sw ? "WAJIBU WA MNUNUZI" : "BUYER OBLIGATIONS",
    sellerOb1: sw ? "Kuhamisha umiliki wa mali/kitu kwa mnunuzi baada ya malipo kukamilika." : "Transfer ownership of the asset/item to the buyer upon completion of payment.",
    sellerOb2: sw ? "Kutoa nyaraka zote zinazohusiana na mali/kitu." : "Provide all documents related to the asset/item.",
    sellerOb3: sw ? "Kuhakikisha mali/kitu hakina madeni au matatizo ya kisheria." : "Ensure the asset/item is free from debts or legal issues.",
    buyerOb1: sw ? "Kulipa bei iliyokubaliwa kwa wakati." : "Pay the agreed price on time.",
    buyerOb2: sw ? "Kupokea mali/kitu kwa hali iliyokubaliwa." : "Accept the asset/item in the agreed condition.",
    buyerOb3: sw ? "Kuheshimu masharti yote ya makubaliano haya." : "Respect all terms of this agreement.",
    declaration: sw
      ? "Sisi wahusika tuliotajwa hapo juu tunashuhudia kwamba tumesoma, tumeelewa na tunakubaliana na masharti yote ya makubaliano haya. Tunasaini kwa hiari yetu wenyewe bila kulazimishwa."
      : "We, the undersigned parties, hereby declare that we have read, understood, and agree to all terms and conditions of this agreement. We sign of our own free will without coercion.",
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

        {/* Preamble */}
        <Text style={[s.body, { marginVertical: 8, lineHeight: 1.5 }]}>{L.preamble}</Text>

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
          <Text style={{ fontSize: 8.5, color: "#1c1917", marginBottom: 6, lineHeight: 1.35 }}>
            {String(fd.asset_description)}
          </Text>
        ) : (
          <View />
        )}
        {fd.location && (
          <View style={s.infoRow}>
            <Text style={s.infoLabel}>{sw ? "Mahali:" : "Location:"}</Text>
            <Text style={s.infoValue}>{String(fd.location)}</Text>
          </View>
        )}
        {fd.plot_number && (
          <View style={s.infoRow}>
            <Text style={s.infoLabel}>{sw ? "Namba ya Kiwanja:" : "Plot Number:"}</Text>
            <Text style={s.infoValue}>{String(fd.plot_number)}</Text>
          </View>
        )}
        {fd.title_deed_number && (
          <View style={s.infoRow}>
            <Text style={s.infoLabel}>{sw ? "Namba ya Hati:" : "Title Deed No:"}</Text>
            <Text style={s.infoValue}>{String(fd.title_deed_number)}</Text>
          </View>
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
              {fd.seller_phone && <Row label={sw ? "Simu" : "Phone"} value={fd.seller_phone} />}
              {application.users?.ward && <Row label={sw ? "Kata" : "Ward"} value={`${application.users.ward}, ${application.users?.district || ""}`} />}
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
              {fd.buyer_phone && <Row label={sw ? "Simu" : "Phone"} value={fd.buyer_phone} />}
              {fd.buyer_ward && <Row label={sw ? "Kata" : "Ward"} value={`${fd.buyer_ward}, ${fd.buyer_district || ""}`} />}
            </View>
          </View>
        </View>

        {/* Financial Details — full section */}
        <View style={s.sectionHeader}>
          <Text style={s.sectionTitle}>{L.financials}</Text>
        </View>
        <View style={s.twoCol}>
          <View style={s.colLeft}>
            <Row label={sw ? "Bei / Kodi" : "Price / Rent"} value={formatCurrency(price)} />
            <Row label={sw ? "Jumla" : "Total Amount"} value={formatCurrency(totalAmount)} />
          </View>
          <View style={s.colRight}>
            <Row label="VAT (18%)" value={formatCurrency(vatAmount)} />
            <Row label={sw ? "Ada ya Huduma" : "Service Fee"} value={formatCurrency(serviceFee)} />
          </View>
        </View>
        {fd.payment_method && <Row label={sw ? "Njia ya Malipo" : "Payment Method"} value={fd.payment_method} />}
        {fd.payment_schedule && <Row label={sw ? "Ratiba ya Malipo" : "Payment Schedule"} value={fd.payment_schedule} />}

        {/* Terms & Conditions */}
        <View style={s.sectionHeader}>
          <Text style={s.sectionTitle}>{L.terms}</Text>
        </View>
        <Text style={[s.body, { marginBottom: 6 }]}>{L.termsIntro}</Text>
        <Text style={[s.body, { marginBottom: 4, paddingLeft: 12 }]}>1. {L.clause1}</Text>
        <Text style={[s.body, { marginBottom: 4, paddingLeft: 12 }]}>2. {L.clause2}</Text>
        <Text style={[s.body, { marginBottom: 4, paddingLeft: 12 }]}>3. {L.clause3}</Text>
        <Text style={[s.body, { marginBottom: 4, paddingLeft: 12 }]}>4. {L.clause4}</Text>
        <Text style={[s.body, { marginBottom: 4, paddingLeft: 12 }]}>5. {L.clause5}</Text>
        <Text style={[s.body, { marginBottom: 6, paddingLeft: 12 }]}>6. {L.clause6}</Text>

        {/* Obligations */}
        <View style={s.sectionHeader}>
          <Text style={s.sectionTitle}>{L.sellerObligations}</Text>
        </View>
        <Text style={[s.body, { marginBottom: 3, paddingLeft: 12 }]}>a) {L.sellerOb1}</Text>
        <Text style={[s.body, { marginBottom: 3, paddingLeft: 12 }]}>b) {L.sellerOb2}</Text>
        <Text style={[s.body, { marginBottom: 6, paddingLeft: 12 }]}>c) {L.sellerOb3}</Text>

        <View style={s.sectionHeader}>
          <Text style={s.sectionTitle}>{L.buyerObligations}</Text>
        </View>
        <Text style={[s.body, { marginBottom: 3, paddingLeft: 12 }]}>a) {L.buyerOb1}</Text>
        <Text style={[s.body, { marginBottom: 3, paddingLeft: 12 }]}>b) {L.buyerOb2}</Text>
        <Text style={[s.body, { marginBottom: 6, paddingLeft: 12 }]}>c) {L.buyerOb3}</Text>

        {/* Payment Reference — Full Details */}
        <View style={s.sectionHeader}>
          <Text style={s.sectionTitle}>{sw ? "KUMBUKUMBU YA MALIPO" : "PAYMENT REFERENCE"}</Text>
        </View>
        {(() => {
          const pd = (application.payment_data || {}) as Record<string, unknown>;
          const receiptNo = String(pd.receipt_number || `RCP-${application.application_number || ""}`);
          const txnId = String(pd.transaction_id || `TXN-${(application.id || "").slice(0, 8).toUpperCase()}`);
          const paidAt = pd.paid_at || application.approved_at || application.issued_at || application.created_at;
          const payAmount = Number(pd.amount || serviceFee);
          const payMethod = String(pd.payment_method || "E-Mtaa Portal");
          return (
            <View style={{ borderWidth: 0.5, borderColor: "#c0c0c0", borderRadius: 4, padding: 8, marginBottom: 6 }}>
              <View style={s.twoCol}>
                <View style={s.colLeft}>
                  <Row label={sw ? "Namba ya Risiti" : "Receipt Number"} value={receiptNo} />
                  <Row label={sw ? "Namba ya Muamala" : "Transaction ID"} value={txnId} />
                  <Row label={sw ? "Namba ya Maombi" : "Application Ref"} value={application.application_number ?? ""} />
                  <Row label={sw ? "Huduma" : "Service"} value={application.service_name ?? ""} />
                </View>
                <View style={s.colRight}>
                  <Row label={sw ? "Kiasi" : "Amount"} value={formatCurrency(payAmount)} />
                  <Row label={sw ? "Njia ya Malipo" : "Payment Method"} value={payMethod} />
                  <Row label={sw ? "Tarehe ya Malipo" : "Payment Date"} value={paidAt ? new Date(String(paidAt)).toLocaleDateString("sw-TZ") : "N/A"} />
                  <Row label={sw ? "Sarafu" : "Currency"} value="TZS (Shilingi ya Tanzania)" />
                </View>
              </View>
              <View style={s.infoRow}>
                <Text style={s.infoLabel}>{sw ? "Mlipaji:" : "Payer:"}</Text>
                <Text style={s.infoValue}>{sellerName}</Text>
              </View>
              <View style={s.infoRow}>
                <Text style={s.infoLabel}>{sw ? "Hali:" : "Status:"}</Text>
                <Text style={[s.infoValue, { color: "#059669", fontWeight: "bold" }]}>{sw ? "IMELIPWA" : "PAID"}</Text>
              </View>
            </View>
          );
        })()}

        {/* Declaration */}
        <View style={{ backgroundColor: "#f7f7f7", borderWidth: 0.5, borderColor: "#c0c0c0", padding: 8, marginVertical: 6, borderRadius: 4 }}>
          <Text style={[s.body, { fontStyle: "italic", lineHeight: 1.5 }]}>{L.declaration}</Text>
        </View>

        {/* Signatures — both parties aligned side by side */}
        <View style={[s.signatureSection, { alignItems: "flex-start" }]}>
          <View style={[s.signatureBox, { width: "44%" }]}>
            {applicantSig ? (
              <Image src={applicantSig} style={{ width: 80, height: 40, marginBottom: 4 }} />
            ) : (
              <View style={s.signatureLine} />
            )}
            <View style={s.signatureLine} />
            <Text style={s.signatureName}>{sellerName}</Text>
            <Text style={s.signatureTitle}>{L.sellerParty}</Text>
          </View>
          <View style={[s.signatureBox, { width: "44%" }]}>
            {fd.buyer_signature ? (
              <Image src={fd.buyer_signature} style={{ width: 80, height: 40, marginBottom: 4 }} />
            ) : (
              <View style={s.signatureLine} />
            )}
            <View style={s.signatureLine} />
            <Text style={s.signatureName}>
              {String(fd.second_party_name || fd.buyer_name || fd.tenant_name || "______________________")}
            </Text>
            <Text style={s.signatureTitle}>{L.buyerParty}</Text>
          </View>
        </View>
        {/* WEO */}
        <View
          style={{
            flexDirection: "row",
            justifyContent: "center",
            marginTop: 4,
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
          <Text style={s.disclaimer}>
            {lang === "sw"
              ? "MAONYESHO PEKEE — Si mfumo rasmi wa serikali, haujaidhinishwa kwa matumizi rasmi"
              : "DEMONSTRATION ONLY — Not an official, approved government system"}
          </Text>
          <Text style={s.footerText}>{L.footer}</Text>
          <Text style={s.metadata}>
            {L.issued}: {formatDate(application.approved_at || application.created_at)}
          </Text>
        </View>
      </Page>
      {/* Page 2: Payment Receipt */}
      <ReceiptPage application={application} lang={lang} qrDataUrl={qrDataUrl} />
    </Document>
  );
};

export default MakubalianoMauzianoPDF;
