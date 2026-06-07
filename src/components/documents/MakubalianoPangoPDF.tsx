/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Makubaliano ya Pango — Rental Agreement
 * Two-party agreement: Landlord + Tenant + Witnesses + Office.
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
import { ReceiptPage } from "./ReceiptPage";
import { GovernmentStamp } from "./GovernmentStamp";
import { TANZANIA_LOGO_BASE64 } from "@/constants/logo";

const ls = StyleSheet.create({
  banner: {
    backgroundColor: "#ffffff",
    borderBottomWidth: 0.75,
    borderBottomColor: "#111111",
    paddingVertical: 10,
    paddingHorizontal: 14,
    marginBottom: 14,
    alignItems: "center",
  },
  bannerTitle: {
    color: "#111111",
    fontSize: 11,
    fontWeight: "bold",
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  partyBox: {
    borderWidth: 1,
    borderColor: "#0d9488",
    borderRadius: 4,
    padding: 8,
    marginVertical: 4,
  },
  partyLabel: {
    fontSize: 7.5,
    color: "#0d9488",
    fontWeight: "bold",
    marginBottom: 3,
    textTransform: "uppercase",
  },
  rentSummary: {
    backgroundColor: "#f7f7f7",
    borderWidth: 0.5,
    borderColor: "#c0c0c0",
    padding: 10,
    marginVertical: 4,
    alignItems: "center",
  },
  rentAmount: { fontSize: 14, fontWeight: "bold", color: "#111111" },
  rentLabel: { fontSize: 7, color: "#6b6b6b" },
  fourSigGrid: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 22,
    marginBottom: 6,
    flexWrap: "wrap",
  },
  fourSigBox: { width: "48%", marginBottom: 12, alignItems: "center" },
  fourSigLine: {
    borderBottomWidth: 1,
    borderBottomColor: "#78716c",
    marginBottom: 4,
    width: "100%",
  },
  fourSigName: {
    fontSize: 8.5,
    fontWeight: "bold",
    textTransform: "uppercase",
    textAlign: "center",
    marginBottom: 1,
  },
  fourSigSub: { fontSize: 7.5, color: "#78716c", textAlign: "center" },
});

const PROPERTY_LABELS: Record<string, { sw: string; en: string }> = {
  FULL_HOUSE: { sw: "Nyumba Nzima", en: "Full House" },
  ROOMS: { sw: "Vyumba", en: "Rooms / Bedsitter" },
  APARTMENT: { sw: "Apartment", en: "Apartment" },
  COMMERCIAL: { sw: "Eneo la Biashara", en: "Commercial Space" },
  WAREHOUSE: { sw: "Ghala", en: "Warehouse" },
  LAND: { sw: "Shamba / Kiwanja", en: "Land / Plot" },
  OTHER: { sw: "Nyingine", en: "Other" },
};

const DURATION_LABELS: Record<string, { sw: string; en: string }> = {
  "6M": { sw: "Miezi 6", en: "6 Months" },
  "1Y": { sw: "Mwaka 1", en: "1 Year" },
  "2Y": { sw: "Miaka 2", en: "2 Years" },
  "3Y": { sw: "Miaka 3", en: "3 Years" },
  OPEN: { sw: "Wazi", en: "Open-Ended" },
};

const NOTICE_LABELS: Record<string, { sw: string; en: string }> = {
  "14D": { sw: "Siku 14", en: "14 Days" },
  "30D": { sw: "Siku 30", en: "30 Days" },
  "60D": { sw: "Siku 60", en: "60 Days" },
};

const UTILITY_LABELS: Record<string, { sw: string; en: string }> = {
  water: { sw: "Maji", en: "Water" },
  electricity: { sw: "Umeme", en: "Electricity" },
  wifi: { sw: "Wifi", en: "Wifi" },
  security: { sw: "Usalama", en: "Security" },
  garbage: { sw: "Taka", en: "Garbage" },
};

export const MakubalianoPangoPDF: React.FC<DocumentPDFProps> = ({
  application,
  lang,
  qrDataUrl,
}) => {
  const fd = (application.form_data || {}) as Record<string, string | undefined>;
  const weoSig = fd.weo_signature;
  const weoStamp = fd.weo_stamp;
  const weoName = fd.weo_name;
  const qr = qrDataUrl || generateQRCodeUrl(application, "RA");
  const sw = lang === "sw";

  const Row = ({ label, value }: { label: string; value?: string | undefined }) => (
    <View style={s.infoRow}>
      <Text style={s.infoLabel}>{label}:</Text>
      <Text style={s.infoValue}>{String(value || "N/A")}</Text>
    </View>
  );

  const propType = String(fd.property_type || "");
  const propLabel = PROPERTY_LABELS[propType]
    ? PROPERTY_LABELS[propType][sw ? "sw" : "en"]
    : propType;
  const duration = String(fd.lease_duration || "");
  const durationLabel = DURATION_LABELS[duration]
    ? DURATION_LABELS[duration][sw ? "sw" : "en"]
    : duration;
  const notice = String(fd.notice_period || "");
  const noticeLabel = NOTICE_LABELS[notice] ? NOTICE_LABELS[notice][sw ? "sw" : "en"] : notice;
  const utilities = Array.isArray(fd.included_utilities) ? (fd.included_utilities as string[]) : [];
  const utilLabels = utilities
    .map((u) => (UTILITY_LABELS[u] ? UTILITY_LABELS[u][sw ? "sw" : "en"] : u))
    .join(", ");

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
          <Text style={s.title}>{sw ? "MAKUBALIANO YA PANGO" : "RENTAL AGREEMENT"}</Text>
          <View style={s.appNumberBadge}>
            <Text style={s.appNumberText}>{application.application_number}</Text>
          </View>
        </View>

        {/* Property banner */}
        <View style={ls.banner}>
          <Text style={ls.bannerTitle}>
            {propLabel || (sw ? "MALI YA KUKODISHWA" : "PROPERTY")}
          </Text>
        </View>

        {/* Rent summary */}
        <View style={ls.rentSummary}>
          <Text style={ls.rentAmount}>{formatCurrency(Number(fd.monthly_rent || 0))}/mwezi</Text>
          <Text style={ls.rentLabel}>
            {sw ? "KODI YA KILA MWEZI" : "MONTHLY RENT"} · {sw ? "Muda:" : "Duration:"}{" "}
            {durationLabel}
          </Text>
        </View>

        {/* Parties side-by-side */}
        <View style={s.twoCol}>
          <View style={[s.colLeft, ls.partyBox]}>
            <Text style={ls.partyLabel}>{sw ? "MPANGISHAJI" : "LANDLORD"}</Text>
            <Row
              label={sw ? "Jina" : "Name"}
              value={
                (fd as any).landlord_name ||
                (application.users
                  ? `${application.users.first_name || ""} ${application.users.middle_name || ""} ${application.users.last_name || ""}`.replace(/\s+/g, " ").trim()
                  : "") ||
                `${(fd as any).first_name || ""} ${(fd as any).last_name || ""}`.trim()
              }
            />
            <Row label="NIDA" value={(fd as any).landlord_nida || application.users?.nida_number || ""} />
            <Row label={sw ? "Simu" : "Phone"} value={(fd as any).landlord_phone || application.users?.phone || ""} />
          </View>
          <View style={[s.colRight, ls.partyBox]}>
            <Text style={ls.partyLabel}>{sw ? "MPANGAJI" : "TENANT"}</Text>
            <Row label={sw ? "Jina" : "Name"} value={fd.tenant_name ?? ""} />
            <Row label="NIDA" value={fd.tenant_nida ?? ""} />
            <Row label={sw ? "Simu" : "Phone"} value={fd.tenant_phone ?? ""} />
          </View>
        </View>

        {/* Property details */}
        <View style={s.sectionHeader}>
          <Text style={s.sectionTitle}>{sw ? "TAARIFA ZA NYUMBA" : "PROPERTY DETAILS"}</Text>
        </View>
        <Row label={sw ? "Aina" : "Type"} value={propLabel} />
        <Row label={sw ? "Anwani" : "Address"} value={fd.property_address ?? ""} />
        {fd.num_rooms ? (
          <Row label={sw ? "Vyumba" : "Rooms"} value={fd.num_rooms ?? ""} />
        ) : (
          <View />
        )}
        {fd.floor_level ? (
          <Row label={sw ? "Ghorofa" : "Floor"} value={fd.floor_level ?? ""} />
        ) : (
          <View />
        )}
        {utilLabels ? (
          <Row label={sw ? "Huduma Zilizojumuishwa" : "Utilities Included"} value={utilLabels} />
        ) : (
          <View />
        )}

        {/* Financial terms */}
        <View style={s.sectionHeader}>
          <Text style={s.sectionTitle}>{sw ? "MASHARTI YA KIFEDHA" : "FINANCIAL TERMS"}</Text>
        </View>
        <View style={s.twoCol}>
          <View style={s.colLeft}>
            <Row
              label={sw ? "Kodi ya Mwezi" : "Monthly Rent"}
              value={formatCurrency(Number(fd.monthly_rent || 0))}
            />
            <Row
              label={sw ? "Amana" : "Deposit"}
              value={formatCurrency(Number(fd.deposit_amount || 0))}
            />
            <Row label={sw ? "Siku ya Kulipa" : "Payment Day"} value={fd.payment_day ?? ""} />
          </View>
          <View style={s.colRight}>
            <Row label={sw ? "Mzunguko" : "Frequency"} value={fd.payment_frequency ?? ""} />
            <Row label={sw ? "Tarehe ya Kuanza" : "Lease Start"} value={fd.lease_start ?? ""} />
            <Row label={sw ? "Muda" : "Duration"} value={durationLabel} />
          </View>
        </View>
        <Row
          label={sw ? "Kipindi cha Taarifa ya Kutoka" : "Notice Period to Vacate"}
          value={noticeLabel}
        />

        {/* House rules */}
        {fd.house_rules ? (
          <View>
            <View style={s.sectionHeader}>
              <Text style={s.sectionTitle}>{sw ? "KANUNI ZA NYUMBA" : "HOUSE RULES"}</Text>
            </View>
            <Text style={[s.body, { fontSize: 8.5 }]}>{String(fd.house_rules)}</Text>
          </View>
        ) : (
          <View />
        )}

        {/* Special conditions */}
        {fd.special_conditions ? (
          <View>
            <View style={s.sectionHeader}>
              <Text style={s.sectionTitle}>{sw ? "MASHARTI MAALUM" : "SPECIAL CONDITIONS"}</Text>
            </View>
            <Text style={[s.body, { fontSize: 8.5 }]}>{String(fd.special_conditions)}</Text>
          </View>
        ) : (
          <View />
        )}

        {/* Terms & Conditions */}
        {(() => {
          const L = {
            terms: sw ? "MASHARTI YA MAKUBALIANO" : "TERMS & CONDITIONS",
            termsIntro: sw ? "Pande zote zinakubaliana na masharti yafuatayo:" : "Both parties agree to the following terms:",
            clause1: sw ? "Mpangaji atalipa kodi kwa wakati uliokubaliwa kila mwezi." : "The tenant shall pay rent on the agreed date each month.",
            clause2: sw ? "Mpangishaji atatoa nyumba katika hali nzuri na salama ya kuishi." : "The landlord shall provide the premises in good and habitable condition.",
            clause3: sw ? "Mpangaji hatafanya mabadiliko yoyote ya kudumu kwenye nyumba bila idhini ya mpangishaji." : "The tenant shall not make permanent modifications without the landlord\'s written consent.",
            clause4: sw ? "Notisi ya siku 30 inahitajika kutoka upande wowote kutaka kusitisha makubaliano." : "A 30-day notice is required from either party to terminate the agreement.",
            clause5: sw ? "Amana ya usalama itarudishwa ndani ya siku 14 baada ya kuondoka." : "The security deposit shall be returned within 14 days of vacating.",
            clause6: sw ? "Mgogoro wowote utatatuliwa kupitia ofisi ya serikali ya mtaa husika." : "Any disputes shall be resolved through the relevant local government office.",
            landlordObligations: sw ? "WAJIBU WA MPANGISHAJI" : "LANDLORD OBLIGATIONS",
            tenantObligations: sw ? "WAJIBU WA MPANGAJI" : "TENANT OBLIGATIONS",
            landlordOb1: sw ? "Kutoa nyumba katika hali nzuri." : "Provide the premises in good condition.",
            landlordOb2: sw ? "Kufanya matengenezo makubwa ya nyumba." : "Perform major repairs and maintenance.",
            landlordOb3: sw ? "Kuheshimu faragha ya mpangaji." : "Respect the tenant\'s privacy.",
            tenantOb1: sw ? "Kulipa kodi kwa wakati." : "Pay rent on time.",
            tenantOb2: sw ? "Kutunza nyumba kwa uangalifu." : "Maintain the premises with care.",
            tenantOb3: sw ? "Kurudisha nyumba katika hali nzuri mwishoni mwa mkataba." : "Return the premises in good condition at end of lease.",
            declaration: sw
              ? "Sisi wahusika tuliotajwa hapo juu tunashuhudia kwamba tumesoma, tumeelewa na tunakubaliana na masharti yote ya makubaliano haya ya upangaji. Tunasaini kwa hiari yetu."
              : "We, the undersigned parties, hereby declare that we have read, understood, and agree to all terms and conditions of this rental agreement. We sign of our own free will.",
          };
          return (<>
        <View style={s.sectionHeader}>
          <Text style={s.sectionTitle}>{L.terms}</Text>
        </View>
        <Text style={[s.body, { marginBottom: 5 }]}>{L.termsIntro}</Text>
        <Text style={[s.body, { marginBottom: 3, paddingLeft: 12 }]}>1. {L.clause1}</Text>
        <Text style={[s.body, { marginBottom: 3, paddingLeft: 12 }]}>2. {L.clause2}</Text>
        <Text style={[s.body, { marginBottom: 3, paddingLeft: 12 }]}>3. {L.clause3}</Text>
        <Text style={[s.body, { marginBottom: 3, paddingLeft: 12 }]}>4. {L.clause4}</Text>
        <Text style={[s.body, { marginBottom: 3, paddingLeft: 12 }]}>5. {L.clause5}</Text>
        <Text style={[s.body, { marginBottom: 5, paddingLeft: 12 }]}>6. {L.clause6}</Text>

        {/* Obligations */}
        <View style={s.sectionHeader}>
          <Text style={s.sectionTitle}>{L.landlordObligations}</Text>
        </View>
        <Text style={[s.body, { marginBottom: 3, paddingLeft: 12 }]}>a) {L.landlordOb1}</Text>
        <Text style={[s.body, { marginBottom: 3, paddingLeft: 12 }]}>b) {L.landlordOb2}</Text>
        <Text style={[s.body, { marginBottom: 5, paddingLeft: 12 }]}>c) {L.landlordOb3}</Text>

        <View style={s.sectionHeader}>
          <Text style={s.sectionTitle}>{L.tenantObligations}</Text>
        </View>
        <Text style={[s.body, { marginBottom: 3, paddingLeft: 12 }]}>a) {L.tenantOb1}</Text>
        <Text style={[s.body, { marginBottom: 3, paddingLeft: 12 }]}>b) {L.tenantOb2}</Text>
        <Text style={[s.body, { marginBottom: 5, paddingLeft: 12 }]}>c) {L.tenantOb3}</Text>

        {/* Declaration */}
        <View style={{ backgroundColor: "#f7f7f7", borderWidth: 0.5, borderColor: "#c0c0c0", padding: 8, marginVertical: 5, borderRadius: 4 }}>
          <Text style={[s.body, { fontStyle: "italic", lineHeight: 1.5 }]}>{L.declaration}</Text>
        </View>

          </>);
        })()}

        {/* Signature grid: Landlord, Tenant, 2 Witnesses, Office */}
        <View style={ls.fourSigGrid}>
          <View style={ls.fourSigBox}>
            {fd.applicant_signature ? (
              <Image src={fd.applicant_signature} style={{ width: 60, height: 30, marginBottom: 2 }} />
            ) : (
              <View />
            )}
            <View style={ls.fourSigLine} />
            <Text style={ls.fourSigName}>{sw ? "MPANGISHAJI" : "LANDLORD"}</Text>
            <Text style={ls.fourSigSub}>{String(fd.landlord_name || (application.users ? `${application.users.first_name || ""} ${application.users.last_name || ""}`.trim() : ""))}</Text>
          </View>
          <View style={ls.fourSigBox}>
            {fd.buyer_signature ? (
              <Image src={fd.buyer_signature} style={{ width: 60, height: 30, marginBottom: 2 }} />
            ) : (
              <View />
            )}
            <View style={ls.fourSigLine} />
            <Text style={ls.fourSigName}>{sw ? "MPANGAJI" : "TENANT"}</Text>
            <Text style={ls.fourSigSub}>{String(fd.tenant_name || "")}</Text>
          </View>
          <View style={ls.fourSigBox}>
            <View style={ls.fourSigLine} />
            <Text style={ls.fourSigName}>{sw ? "SHAHIDI 1" : "WITNESS 1"}</Text>
            <Text style={ls.fourSigSub}>{String(fd.witness1_name || "")}</Text>
          </View>
          <View style={ls.fourSigBox}>
            <View style={ls.fourSigLine} />
            <Text style={ls.fourSigName}>{sw ? "SHAHIDI 2" : "WITNESS 2"}</Text>
            <Text style={ls.fourSigSub}>{String(fd.witness2_name || "")}</Text>
          </View>
          <View style={[ls.fourSigBox, { width: "100%" }]}>
            {weoStamp ? (
              <Image src={weoStamp} style={s.stampImg} />
            ) : (
              <GovernmentStamp
                date={application.approved_at || application.issued_at}
                reference={application.application_number}
                lang={lang}
              />
            )}
            {weoSig ? (
              <Image src={weoSig} style={s.signatureImg} />
            ) : (
              <View style={{ height: 36 }} />
            )}
            <View style={ls.fourSigLine} />
            <Text style={ls.fourSigName}>
              {sw ? "AFISA MTENDAJI WA KATA" : "WARD EXECUTIVE OFFICER"}
            </Text>
            {weoName ? <Text style={ls.fourSigSub}>{String(weoName)}</Text> : <View />}
          </View>
        </View>

        {/* QR verification — compact, inline above footer */}
        <View
          style={{
            flexDirection: "row",
            justifyContent: "flex-end",
            alignItems: "center",
            marginTop: 6,
            gap: 8,
          }}
        >
          <Text style={{ fontSize: 6, color: "#6b6b6b", textAlign: "right" }}>
            {sw ? "Changanua kuthibitisha:" : "Scan to verify:"}
            {"\n"}
            {application.application_number}
          </Text>
          <View style={{ borderWidth: 0.5, borderColor: "#c0c0c0", padding: 2 }}>
            <Image src={qr} style={{ width: 46, height: 46 }} />
          </View>
        </View>

        {/* Footer */}
        <View style={s.footer}>
          <Text style={s.disclaimer}>
            {lang === "sw"
              ? "MAONYESHO PEKEE — Si mfumo rasmi wa serikali, haujaidhinishwa kwa matumizi rasmi"
              : "DEMONSTRATION ONLY — Not an official, approved government system"}
          </Text>
          <Text style={s.footerText}>
            {sw
              ? "Mkataba huu unalindwa kisheria. Nakala moja kwa kila upande."
              : "This agreement is legally binding. One copy per party."}
          </Text>
          <Text style={s.metadata}>{`ISSUED: ${formatDate(application.created_at)} | E-MTAA`}</Text>
        </View>
      </Page>
      {/* Page 2: Payment Receipt */}
      <ReceiptPage application={application} lang={lang} qrDataUrl={qrDataUrl} />
    </Document>
  );
};

export default MakubalianoPangoPDF;
