/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Utambulisho wa Mkazi — Residency Certificate
 * Layout: A4, government letterhead, photo top-left, QR bottom-right
 */
import React from "react";
import { Document, Page, Text, View, Image } from "@react-pdf/renderer";
import {
  DocumentPDFProps,
  commonStyles,
  generateQRCodeUrl,
  formatFullName,
  formatDate,
} from "./types";
import { TANZANIA_LOGO_BASE64 } from "@/constants/logo";

export const UtambulishoMkaziPDF: React.FC<DocumentPDFProps> = ({
  application,
  lang,
  qrDataUrl,
}) => {
  const user = (application as any).users;
  const fd = (application.form_data || {}) as Record<string, string | undefined>;
  const qr = qrDataUrl || generateQRCodeUrl(application, "MKZ");
  const s = commonStyles;
  const sw = lang === "sw";

  const L = {
    title: sw ? "CHETI CHA UTAMBULISHO WA MKAZI" : "CERTIFICATE OF RESIDENCY",
    personal: sw ? "TAARIFA BINAFSI" : "PERSONAL INFORMATION",
    address: sw ? "TAARIFA ZA MAKAZI" : "RESIDENCE DETAILS",
    purpose: sw ? "SABABU YA MAOMBI" : "PURPOSE OF APPLICATION",
    fullName: sw ? "Jina Kamili" : "Full Name",
    nida: sw ? "Namba ya NIDA" : "NIDA Number",
    citizenId: sw ? "Namba ya Raia" : "Citizen ID",
    marital: sw ? "Hali ya Ndoa" : "Marital Status",
    dob: sw ? "Tarehe ya Kuzaliwa" : "Date of Birth",
    sex: sw ? "Jinsi" : "Sex",
    occupation: sw ? "Kazi / Shughuli" : "Occupation",
    council: sw ? "Halmashauri" : "Council",
    region: sw ? "Mkoa" : "Region",
    district: sw ? "Wilaya" : "District",
    ward: sw ? "Kata" : "Ward",
    street: sw ? "Mtaa" : "Street",
    neighborhood: sw ? "Kitongoji" : "Neighborhood",
    houseNo: sw ? "Namba ya Nyumba" : "House Number",
    purposeLabel: sw ? "Sababu" : "Purpose",
    institution: sw ? "Taasisi" : "Institution",
    applicantSig: sw ? "SAHIHI YA MWOMBAJI" : "APPLICANT SIGNATURE",
    weoSig: sw ? "AFISA MTENDAJI WA MTAA / KIJIJI" : "WARD / VILLAGE EXECUTIVE OFFICER",
    scanVerify: sw ? "Changanua kuthibitisha" : "Scan to verify",
    footer: sw
      ? "Cheti hiki ni rasmi cha serikali na kinaweza kuthibitishwa kupitia QR code au tovuti ya E-Mtaa."
      : "This is an official government certificate. Verify via QR code or the E-Mtaa portal.",
    issued: sw ? "Imetolewa" : "Issued",
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

        {/* ── Photo box ── */}
        <View style={s.photoSection}>
          <View style={s.photoBox}>
            {user?.photo_url ? (
              <Image src={user.photo_url} style={s.photo} />
            ) : (
              <Text style={s.photoPlaceholder}>{"PICHA\nPHOTO"}</Text>
            )}
          </View>
          <Text style={s.nidaLabel}>{L.nida}</Text>
          <Text style={s.nidaNumber}>{user?.nida_number || "—"}</Text>
        </View>

        {/* ── Government header ── */}
        <View style={s.header}>
          <Image src={TANZANIA_LOGO_BASE64} style={s.logo} />
          <Text style={s.country}>JAMHURI YA MUUNGANO WA TANZANIA</Text>
          <Text style={s.office}>
            OFISI YA RAIS — TAWALA ZA MIKOA NA SERIKALI ZA MITAA (TAMISEMI)
          </Text>
          {fd.council ? <Text style={s.council}>{String(fd.council)}</Text> : <View/>}
          <View style={s.divider} />
        </View>

        {/* ── Title + application number badge ── */}
        <View style={s.titleBlock}>
          <Text style={s.title}>{L.title}</Text>
          <View style={s.appNumberBadge}>
            <Text style={s.appNumberText}>{application.application_number}</Text>
          </View>
        </View>

        {/* ── Personal Information ── */}
        <View style={s.sectionHeader}>
          <Text style={s.sectionTitle}>{L.personal}</Text>
        </View>
        <View style={s.twoCol}>
          <View style={s.colLeft}>
            <Row label={L.fullName} value={formatFullName(user)} />
            <Row label={L.nida} value={user?.nida_number} />
            <Row label={L.citizenId} value={user?.citizen_id} />
            <Row
              label={L.dob}
              value={user?.date_of_birth ? formatDate(user.date_of_birth) : undefined}
            />
          </View>
          <View style={s.colRight}>
            <Row
              label={L.sex}
              value={
                user?.sex === "M"
                  ? sw
                    ? "Mume"
                    : "Male"
                  : user?.sex === "F"
                    ? sw
                      ? "Mke"
                      : "Female"
                    : user?.sex
              }
            />
            <Row label={L.marital} value={fd.marital_status ?? ""} />
            <Row label={L.occupation} value={fd.occupation ?? ""} />
          </View>
        </View>

        {/* ── Residence Details ── */}
        <View style={s.sectionHeader}>
          <Text style={s.sectionTitle}>{L.address}</Text>
        </View>
        <View style={s.twoCol}>
          <View style={s.colLeft}>
            <Row label={L.region} value={user?.region} />
            <Row label={L.district} value={user?.district} />
            <Row label={L.ward} value={user?.ward} />
            <Row label={L.street} value={user?.street} />
          </View>
          <View style={s.colRight}>
            <Row label={L.neighborhood} value={fd.neighborhood ?? ""} />
            <Row label={L.houseNo} value={fd.house_number ?? ""} />
          </View>
        </View>

        {/* ── Purpose ── */}
        {(fd.purpose || fd.institution_name) ? (
          <View>
            <View style={s.sectionHeader}>
              <Text style={s.sectionTitle}>{L.purpose}</Text>
            </View>
            <Row label={L.purposeLabel} value={fd.purpose ?? ""} />
            {fd.institution_name ? <Row label={L.institution} value={fd.institution_name ?? ""} /> : <View/>}
          </View>
        ) : <View/>}

        {/* ── Signatures ── */}
        <View style={s.signatureSection}>
          <View style={s.signatureBox}>
            <View style={s.signatureLine} />
            <Text style={s.signatureName}>{formatFullName(user)}</Text>
            <Text style={s.signatureTitle}>{L.applicantSig}</Text>
          </View>
          <View style={s.signatureBox}>
            <View style={s.stampBox}>
              <Text style={s.stampText}>MUHURI{"\n"}STAMP</Text>
            </View>
            <View style={s.signatureLine} />
            <Text style={s.signatureTitle}>{L.weoSig}</Text>
          </View>
        </View>

        {/* ── QR code ── */}
        <View style={s.qrSection}>
          <View style={s.qrBorder}>
            <Image src={qr} style={s.qrCode} />
          </View>
          <Text style={s.qrLabel}>{L.scanVerify}</Text>
          <Text style={s.qrRef}>{application.application_number}</Text>
        </View>

        {/* ── Footer ── */}
        <View style={s.footer}>
          <Text style={s.footerText}>{L.footer}</Text>
          <Text style={s.metadata}>
            {L.issued}:{" "}
            {formatDate(application.issued_at || application.approved_at || application.created_at)}
          </Text>
        </View>
      </Page>
    </Document>
  );
};

export default UtambulishoMkaziPDF;
