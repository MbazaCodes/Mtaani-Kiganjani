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
import { ApplicantSignatureBox, OfficerSignatureBox } from "./SignatureBlocks";
import { ReceiptPage } from "./ReceiptPage";
import { TANZANIA_LOGO_BASE64 } from "@/constants/logo";

const ls = StyleSheet.create({
  eventBanner: {
    backgroundColor: "#ffffff",
    borderBottomWidth: 0.75,
    borderBottomColor: "#111111",
    paddingVertical: 10,
    paddingHorizontal: 14,
    marginBottom: 10,
    alignItems: "center",
  },
  bannerTitle: {
    color: "#111111",
    fontSize: 14,
    fontWeight: "bold",
    textTransform: "uppercase",
    marginBottom: 3,
  },
  bannerSub: { color: "#6b6b6b", fontSize: 8, fontStyle: "italic" },
  guestsBox: {
    backgroundColor: "#f7f7f7",
    borderWidth: 0.5,
    borderColor: "#c0c0c0",
    padding: 8,
    alignItems: "center",
    marginBottom: 10,
  },
  guestsNum: { fontSize: 16, fontWeight: "bold", color: "#111111" },
  guestsLabel: { fontSize: 7, color: "#6b6b6b" },
  // QR placed inline (not absolute) so it never overlaps content
  qrRow: {
    flexDirection: "row",
    justifyContent: "flex-end",
    marginTop: 10,
    marginBottom: 4,
  },
  qrBox: {
    alignItems: "center",
    width: 76,
  },
  qrBorder: {
    borderWidth: 1,
    borderColor: "#ccc",
    padding: 3,
    backgroundColor: "#fff",
    marginBottom: 2,
  },
  qrImg: { width: 60, height: 60 },
  qrLabel: { fontSize: 5.5, color: "#999", textAlign: "center" },
  qrRef: { fontSize: 5, color: "#bbb", textAlign: "center" },
});

export const KibariSherehePDF: React.FC<DocumentPDFProps> = ({ application, lang, qrDataUrl }) => {
  const user = application.users;
  const fd = (application.form_data || {}) as Record<string, string | undefined>;
  const applicantSig = fd.applicant_signature;
  const weoSig = fd.weo_signature;
  const weoStamp = fd.weo_stamp;
  const weoName = fd.weo_name;
  const qr = qrDataUrl || generateQRCodeUrl(application, "KIB");
  const sw = lang === "sw";

  const L = {
    title: sw ? "KIBARI CHA MATUKIO / SHEREHE" : "EVENT / CELEBRATION PERMIT",
    venueTime: sw ? "ENEO NA MUDA" : "VENUE & TIME",
    organiser: sw ? "MSIMAMIZI / MAWASILIANO" : "ORGANISER / CONTACT",
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

  const Row = ({ label, value }: { label: string; value?: string }) => (
    <View style={s.infoRow}>
      <Text style={s.infoLabel}>{label}:</Text>
      <Text style={s.infoValue}>{String(value || "N/A")}</Text>
    </View>
  );

  const eventType = String(fd.event_type || "");
  const eventLabel = eventTypeLabels[eventType] || eventType;

  // Applicant name — prefer form organizer_name, fall back to joined user
  const applicantName = fd.organizer_name || formatFullName(user);
  const applicantNida = fd.organizer_nida || user?.nida_number;
  const applicantPhone = fd.organizer_phone || user?.phone;

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
          {fd.event_name ? <Text style={ls.bannerSub}>{String(fd.event_name)}</Text> : <View />}
        </View>

        {/* Guests box */}
        {fd.expected_guests ? (
          <View style={ls.guestsBox}>
            <Text style={ls.guestsNum}>{String(fd.expected_guests)}</Text>
            <Text style={ls.guestsLabel}>{sw ? "WAGENI WANAOTARAJIWA" : "EXPECTED GUESTS"}</Text>
          </View>
        ) : (
          <View />
        )}

        {/* Applicant info */}
        <View style={s.sectionHeader}>
          <Text style={s.sectionTitle}>{sw ? "MWOMBAJI" : "APPLICANT"}</Text>
        </View>
        <Row label={sw ? "Jina Kamili" : "Full Name"} value={applicantName} />
        <Row label={sw ? "NIDA" : "NIDA No."} value={applicantNida} />
        <Row label={sw ? "Simu" : "Phone"} value={applicantPhone} />

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
            <Row
              label={sw ? "Tarehe ya Mwisho" : "End Date"}
              value={fd.end_date ? formatDate(String(fd.end_date)) : undefined}
            />
          </View>
          <View style={s.colRight}>
            <Row label={sw ? "Jina la Ukumbi" : "Venue Name"} value={fd.venue_name} />
            <Row label={sw ? "Kata" : "Ward"} value={fd.venue_ward} />
            <Row label={sw ? "Wilaya" : "District"} value={fd.venue_district} />
          </View>
        </View>

        {/* Organiser / contact */}
        <View style={s.sectionHeader}>
          <Text style={s.sectionTitle}>{L.organiser}</Text>
        </View>
        <Row label={sw ? "Jina la Msimamizi" : "Organiser Name"} value={fd.organizer_name} />
        <Row label={sw ? "Simu ya Msimamizi" : "Organiser Phone"} value={fd.organizer_phone} />
        {fd.second_contact_name ? (
          <Row label={sw ? "Msimamizi 2" : "2nd Contact"} value={fd.second_contact_name} />
        ) : (
          <View />
        )}

        {/* Signatures */}
        <View style={[s.signatureSection, { marginTop: 20 }]}>
          <ApplicantSignatureBox
            signature={applicantSig}
            name={applicantName}
            title={sw ? "MWANDAAJI / MWOMBAJI" : "ORGANISER / APPLICANT"}
          />
          <OfficerSignatureBox
            signature={weoSig}
            stamp={weoStamp}
            name={weoName}
            title={sw ? "AFISA MTENDAJI WA MTAA" : "WARD EXECUTIVE OFFICER"}
          />
        </View>

        {/* QR — inline after signatures, NOT absolute */}
        <View style={ls.qrRow}>
          <View style={ls.qrBox}>
            <View style={ls.qrBorder}>
              <Image src={qr} style={ls.qrImg} />
            </View>
            <Text style={ls.qrLabel}>{L.scanVerify}</Text>
            <Text style={ls.qrRef}>{application.application_number}</Text>
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

export default KibariSherehePDF;
