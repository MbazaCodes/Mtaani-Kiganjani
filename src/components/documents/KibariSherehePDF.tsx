/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Kibari cha Matukio / Sherehe — Event / Celebration Permit
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
  eventBanner: {
    backgroundColor: "#7c3aed",
    paddingVertical: 10,
    paddingHorizontal: 14,
    marginBottom: 14,
    alignItems: "center",
  },
  bannerTitle: {
    color: "#ffffff",
    fontSize: 14,
    fontWeight: "bold",
    textTransform: "uppercase",
    marginBottom: 3,
  },
  bannerSub: { color: "#ede9fe", fontSize: 9, fontStyle: "italic" },
  guestsBox: {
    backgroundColor: "#f5f3ff",
    borderWidth: 2,
    borderColor: "#7c3aed",
    padding: 10,
    alignItems: "center",
    marginVertical: 10,
  },
  guestsNum: { fontSize: 22, fontWeight: "bold", color: "#5b21b6" },
  guestsLabel: { fontSize: 8, color: "#6d28d9" },
});

export const KibariSherehePDF: React.FC<DocumentPDFProps> = ({ application, lang, qrDataUrl }) => {
  const user = (application as any).users;
  const fd = (application.form_data || {}) as Record<string, string | undefined>;
  const qr = qrDataUrl || generateQRCodeUrl(application, "KIB");
  const sw = lang === "sw";

  const L = {
    title: sw ? "KIBARI CHA MATUKIO / SHEREHE" : "EVENT / CELEBRATION PERMIT",
    eventInfo: sw ? "TAARIFA ZA TUKIO" : "EVENT INFORMATION",
    venueTime: sw ? "ENEO NA MUDA" : "VENUE & TIME",
    organiser: sw ? "MWANDAAJI / MAWASILIANO" : "ORGANISER / CONTACT",
    scanVerify: sw ? "Changanua kuthibitisha" : "Scan to verify",
    footer: sw
      ? "Kibari hiki ni rasmi na lazima kionyeshwe wakati wote wa tukio."
      : "This permit is official and must be displayed throughout the event.",
    issued: sw ? "Imetolewa" : "Issued",
  };

  const eventTypeLabels: Record<string, string> = {
    HARUSI: sw ? "Harusi" : "Wedding",
    MAZIKO: sw ? "Maziko" : "Burial Ceremony",
    BIRTHDAY: sw ? "Siku ya Kuzaliwa" : "Birthday",
    GRADUATION: sw ? "Kuhitimu" : "Graduation",
    CULTURAL: sw ? "Sherehe za Kitamaduni" : "Cultural Event",
    RELIGIOUS: sw ? "Ibada / Mkutano wa Dini" : "Religious Gathering",
    CONCERT: sw ? "Tamasha" : "Concert",
    CONFERENCE: sw ? "Mkutano / Semina" : "Conference / Seminar",
    POLITICAL: sw ? "Mkutano wa Kisiasa" : "Political Rally",
    OTHER: sw ? "Nyingine" : "Other",
  };

  const Row = ({ label, value }: { label: string; value?: string | undefined }) => (
    <View style={s.infoRow}>
      <Text style={s.infoLabel}>{label}:</Text>
      <Text style={s.infoValue}>{String(value || "N/A")}</Text>
    </View>
  );

  const eventType = String(fd.event_type || "");
  const eventLabel = eventTypeLabels[eventType] || eventType;

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

        {/* Event banner */}
        <View style={ls.eventBanner}>
          <Text style={ls.bannerTitle}>{eventLabel || (sw ? "TUKIO" : "EVENT")}</Text>
          {fd.event_name && <Text style={ls.bannerSub}>{String(fd.event_name)}</Text>}
        </View>

        {/* Guests box */}
        {fd.expected_guests && (
          <View style={ls.guestsBox}>
            <Text style={ls.guestsNum}>{String(fd.expected_guests)}</Text>
            <Text style={ls.guestsLabel}>{sw ? "WAGENI WANAOTARAJIWA" : "EXPECTED GUESTS"}</Text>
          </View>
        )}

        {/* Applicant info */}
        <View style={s.sectionHeader}>
          <Text style={s.sectionTitle}>{sw ? "MWOMBAJI" : "APPLICANT"}</Text>
        </View>
        <Row label={sw ? "Jina Kamili" : "Full Name"} value={formatFullName(user)} />
        <Row label={sw ? "NIDA" : "NIDA No."} value={user?.nida_number} />
        <Row label={sw ? "Namba ya Raia" : "Citizen ID"} value={user?.citizen_id} />

        {/* Venue & time */}
        <View style={s.sectionHeader}>
          <Text style={s.sectionTitle}>{L.venueTime}</Text>
        </View>
        <View style={s.twoCol}>
          <View style={s.colLeft}>
            <Row
              label={sw ? "Tarehe ya Kuanza" : "Start Date"}
              value={fd.start_date ? formatDate(String(fd.start_date)) : undefined}
            />
            <Row label={sw ? "Muda wa Kuanza" : "Start Time"} value={fd.start_time} />
          </View>
          <View style={s.colRight}>
            <Row label={sw ? "Eneo la Tukio" : "Venue"} value={fd.venue} />
          </View>
        </View>

        {/* Organiser / contact */}
        <View style={s.sectionHeader}>
          <Text style={s.sectionTitle}>{L.organiser}</Text>
        </View>
        <Row label={sw ? "Mwasiliano" : "Contact Person"} value={fd.contact_person} />
        <Row label={sw ? "Simu" : "Phone"} value={fd.contact_phone} />
        {fd.whatsapp_group && <Row label="WhatsApp" value={fd.whatsapp_group} />}

        {/* Signatures */}
        <View style={s.signatureSection}>
          <View style={s.signatureBox}>
            <View style={s.signatureLine} />
            <Text style={s.signatureName}>{formatFullName(user)}</Text>
            <Text style={s.signatureTitle}>
              {sw ? "MWANDAAJI / MWOMBAJI" : "ORGANISER / APPLICANT"}
            </Text>
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

export default KibariSherehePDF;
