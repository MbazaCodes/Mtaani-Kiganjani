/**
 * Shared signature & stamp blocks for PDF documents.
 *
 * Renders a citizen/applicant signature (drawn on screen) and the Ward Executive
 * Officer's signature + official stamp (applied on approval). All inputs are
 * optional base64/data-URL images stored in application.form_data:
 *   - applicant_signature  (citizen)
 *   - weo_signature         (approving officer)
 *   - weo_stamp             (officer's official stamp)
 *   - weo_name              (officer name)
 *
 * react-pdf cannot render falsy children, so every conditional returns a real
 * element (an empty <View/> when there is nothing to show).
 */
import React from "react";
import { View, Text, Image } from "@react-pdf/renderer";
import { commonStyles as s } from "./types";

interface ApplicantSigProps {
  /** drawn signature data URL */
  signature?: string | null;
  /** printed name under the line */
  name?: string | null;
  /** role label (e.g. "MWOMBAJI / APPLICANT") */
  title: string;
}

export const ApplicantSignatureBox: React.FC<ApplicantSigProps> = ({ signature, name, title }) => (
  <View style={s.signatureBox}>
    {signature ? <Image src={signature} style={s.signatureImg} /> : <View style={{ height: 44 }} />}
    <View style={s.signatureLine} />
    {name ? <Text style={s.signatureName}>{String(name)}</Text> : <View />}
    <Text style={s.signatureTitle}>{title}</Text>
  </View>
);

interface OfficerSigProps {
  /** officer signature data URL */
  signature?: string | null;
  /** official stamp data URL */
  stamp?: string | null;
  /** officer name */
  name?: string | null;
  /** role label (e.g. "AFISA MTENDAJI WA KATA / WARD EXECUTIVE OFFICER") */
  title: string;
}

export const OfficerSignatureBox: React.FC<OfficerSigProps> = ({
  signature,
  stamp,
  name,
  title,
}) => (
  <View style={s.signatureBox}>
    {stamp ? (
      <Image src={stamp} style={s.stampImg} />
    ) : (
      <View style={s.stampBox}>
        <Text style={s.stampText}>MUHURI{"\n"}STAMP</Text>
      </View>
    )}
    {signature ? <Image src={signature} style={s.signatureImg} /> : <View style={{ height: 44 }} />}
    <View style={s.signatureLine} />
    {name ? <Text style={s.signatureName}>{String(name)}</Text> : <View />}
    <Text style={s.signatureTitle}>{title}</Text>
  </View>
);
