/**
 * GovernmentStamp — Official round certified stamp for PDF documents.
 * Renders a circular government stamp with:
 *   - Double border ring
 *   - "OFISI YA RAIS — TAMISEMI" header text
 *   - Tanzania coat of arms emblem in center
 *   - "CERTIFIED / IMETHIBITISHWA" text
 *   - Date and time of certification
 *   - Reference number
 */
import React from "react";
import { View, Text, Image, StyleSheet } from "@react-pdf/renderer";
import { TANZANIA_EMBLEM_BASE64 } from "@/constants/emblem";

const STAMP_SIZE = 90;

const ss = StyleSheet.create({
  // Outer container
  container: {
    width: STAMP_SIZE,
    height: STAMP_SIZE,
    alignSelf: "center",
  },
  // Outer ring
  outerRing: {
    width: STAMP_SIZE,
    height: STAMP_SIZE,
    borderRadius: STAMP_SIZE / 2,
    borderWidth: 2.5,
    borderColor: "#1a3d6b",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.85)",
  },
  // Inner ring
  innerRing: {
    width: STAMP_SIZE - 10,
    height: STAMP_SIZE - 10,
    borderRadius: (STAMP_SIZE - 10) / 2,
    borderWidth: 1,
    borderColor: "#1a3d6b",
    alignItems: "center",
    justifyContent: "center",
  },
  // Top text
  topText: {
    fontSize: 4.2,
    fontWeight: "bold",
    color: "#1a3d6b",
    textAlign: "center",
    textTransform: "uppercase",
    letterSpacing: 0.3,
    marginBottom: 1,
  },
  // Emblem
  emblem: {
    width: 28,
    height: 28,
    marginVertical: 1,
  },
  // Certified text
  certifiedText: {
    fontSize: 5.5,
    fontWeight: "bold",
    color: "#1a3d6b",
    textAlign: "center",
    textTransform: "uppercase",
    letterSpacing: 1.5,
    marginTop: 1,
  },
  certifiedSw: {
    fontSize: 3.8,
    color: "#1a3d6b",
    textAlign: "center",
    letterSpacing: 0.5,
    marginTop: 0.5,
  },
  // Date/time
  dateText: {
    fontSize: 3.5,
    color: "#1a3d6b",
    textAlign: "center",
    fontFamily: "Courier",
    marginTop: 1,
  },
  // Stars decoration
  stars: {
    fontSize: 4,
    color: "#1a3d6b",
    textAlign: "center",
    letterSpacing: 2,
  },
});

interface GovernmentStampProps {
  /** Date of certification — defaults to now */
  date?: string | null;
  /** Reference number to show */
  reference?: string;
  /** Language */
  lang?: "sw" | "en";
}

export const GovernmentStamp: React.FC<GovernmentStampProps> = ({
  date,
  reference,
  lang = "sw",
}) => {
  const stampDate = date ? new Date(date) : new Date();
  const dateStr = stampDate.toLocaleDateString("sw-TZ", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
  const timeStr = stampDate.toLocaleTimeString("sw-TZ", {
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <View style={ss.container}>
      <View style={ss.outerRing}>
        <View style={ss.innerRing}>
          <Text style={ss.topText}>OFISI YA RAIS — TAMISEMI</Text>
          <Text style={ss.stars}>★ ★ ★</Text>
          <Image src={TANZANIA_EMBLEM_BASE64} style={ss.emblem} />
          <Text style={ss.certifiedText}>CERTIFIED</Text>
          <Text style={ss.certifiedSw}>IMETHIBITISHWA</Text>
          <Text style={ss.dateText}>
            {dateStr} {timeStr}
          </Text>
        </View>
      </View>
    </View>
  );
};

export default GovernmentStamp;
