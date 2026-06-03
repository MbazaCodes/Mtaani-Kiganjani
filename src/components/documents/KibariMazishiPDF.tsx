/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Kibari cha Mazishi — Funeral Permit
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
import { TANZANIA_LOGO_BASE64 } from "@/constants/logo";

const ls = StyleSheet.create({
  mourningBar: {
    backgroundColor: "#1c1917",
    paddingVertical: 10,
    paddingHorizontal: 14,
    marginBottom: 10,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  arabicText: { color: "#d4b896", fontSize: 10, fontStyle: "italic" },
  condolence: { color: "#ffffff", fontSize: 11, fontWeight: "bold", letterSpacing: 0.5 },
  deceasedName: {
    fontSize: 17,
    fontWeight: "bold",
    textAlign: "center",
    textTransform: "uppercase",
    color: "#1c1917",
    marginBottom: 2,
  },
  lifespan: { fontSize: 9, textAlign: "center", color: "#78716c", marginBottom: 12 },
});

export const KibariMazishiPDF: React.FC<DocumentPDFProps> = ({ application, lang, qrDataUrl }) => {
  const user = (application as any).users;
  const fd = (application.form_data || {}) as Record<string, string | undefined>;
  const qr = qrDataUrl || generateQRCodeUrl(application, "MAZ");
  const sw = lang === "sw";

  const L = {
    title: sw ? "KIBARI CHA MAZISHI" : "FUNERAL PERMIT",
    deceasedInfo: sw ? "TAARIFA ZA MAREHEMU" : "DECEASED INFORMATION",
    schedule: sw ? "RATIBA YA MAZISHI" : "FUNERAL SCHEDULE",
    contact: sw ? "MAWASILIANO YA FAMILIA" : "FAMILY CONTACT",
    innalillahi: "إِنَّا لِلَّهِ وَإِنَّا إِلَيْهِ رَاجِعُونَ",
    condolence: sw ? "POLE KWA MSIBA" : "OUR CONDOLENCES",
    footer: sw
      ? "Mwenyezi Mungu ailaze roho yake mahala pema peponi. Amina."
      : "May God rest the soul of the deceased in eternal peace. Amen.",
    issued: sw ? "Imetolewa" : "Issued",
    scanVerify: sw ? "Changanua kuthibitisha" : "Scan to verify",
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

        {/* Title + App number */}
        <View style={s.titleBlock}>
          <Text style={s.title}>{L.title}</Text>
          <View style={s.appNumberBadge}>
            <Text style={s.appNumberText}>{application.application_number}</Text>
          </View>
        </View>

        {/* Mourning bar */}
        <View style={ls.mourningBar}>
          <Text style={ls.arabicText}>{L.innalillahi}</Text>
          <Text style={ls.condolence}>{L.condolence}</Text>
        </View>

        {/* Deceased name + dates */}
        <Text style={ls.deceasedName}>{String(fd.deceased_full_name || "N/A")}</Text>
        <Text style={ls.lifespan}>
          {fd.date_of_birth ? formatDate(String(fd.date_of_birth)) : "?"} —{" "}
          {fd.date_of_death ? formatDate(String(fd.date_of_death)) : "?"}
          {fd.age_at_death ? `  (${fd.age_at_death} ${sw ? "miaka" : "yrs"})` : ""}
        </Text>

        {/* Deceased Info */}
        <View style={s.sectionHeader}>
          <Text style={s.sectionTitle}>{L.deceasedInfo}</Text>
        </View>
        <View style={s.twoCol}>
          <View style={s.colLeft}>
            <Row label={sw ? "Jina la Baba" : "Father's Name"} value={fd.fathers_name} />
            <Row label={sw ? "Jina la Mama" : "Mother's Name"} value={fd.mothers_name} />
            <Row label={sw ? "Mume / Mke" : "Spouse"} value={fd.surviving_spouse} />
          </View>
          <View style={s.colRight}>
            <Row label={sw ? "Mahali Alipokufia" : "Place of Death"} value={fd.place_of_death} />
            <Row label={sw ? "Maiti Ipo" : "Body Location"} value={fd.body_location} />
          </View>
        </View>

        {/* Funeral Schedule */}
        <View style={s.sectionHeader}>
          <Text style={s.sectionTitle}>{L.schedule}</Text>
        </View>
        <View style={s.twoCol}>
          <View style={s.colLeft}>
            <Row
              label={sw ? "Tarehe ya Mazishi" : "Funeral Date"}
              value={fd.service_date ? formatDate(String(fd.service_date)) : undefined}
            />
            <Row label={sw ? "Muda" : "Time"} value={fd.service_time} />
            <Row label={sw ? "Mahali pa Ibada" : "Service Venue"} value={fd.service_location} />
          </View>
          <View style={s.colRight}>
            <Row label={sw ? "Mahali pa Kuzikwa" : "Burial Site"} value={fd.burial_location} />
          </View>
        </View>

        {/* Family Contact */}
        <View style={s.sectionHeader}>
          <Text style={s.sectionTitle}>{L.contact}</Text>
        </View>
        <Row label={sw ? "Mwakilishi" : "Representative"} value={fd.family_representative} />
        <Row label={sw ? "Simu" : "Phone"} value={fd.representative_phone} />
        {fd.children_names && <Row label={sw ? "Watoto" : "Children"} value={fd.children_names} />}

        {/* Stamp + signature */}
        <View style={s.signatureSection}>
          <View style={s.signatureBox}>
            <View style={s.signatureLine} />
            <Text style={s.signatureName}>{formatFullName(user)}</Text>
            <Text style={s.signatureTitle}>{sw ? "MWOMBAJI" : "APPLICANT"}</Text>
          </View>
          <View style={s.signatureBox}>
            <View style={s.stampBox}>
              <Text style={s.stampText}>MUHURI{"\n"}STAMP</Text>
            </View>
            <View style={s.signatureLine} />
            <Text style={s.signatureTitle}>
              {sw ? "AFISA MTENDAJI WA MTAA" : "WARD EXECUTIVE OFFICER"}
            </Text>
          </View>
        </View>

        {/* QR */}
        <View style={s.qrSection}>
          <View style={s.qrBorder}>
            <Image src={qr} style={s.qrCode} />
          </View>
          <Text style={s.qrLabel}>{L.scanVerify}</Text>
          <Text style={s.qrRef}>{application.application_number}</Text>
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

export default KibariMazishiPDF;
