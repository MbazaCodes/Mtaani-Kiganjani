/**
 * Documents Index
 *
 * Central export for all service-specific PDF documents
 */

export { UtambulishoMkaziPDF } from "./UtambulishoMkaziPDF";
export { KibariMazishiPDF } from "./KibariMazishiPDF";
export { KibariSherehePDF } from "./KibariSherehePDF";
export { KibariUjeziMdogoPDF } from "./KibariUjeziMdogoPDF";
export { BaruaUtambulishoPDF } from "./BaruaUtambulishoPDF";
export { MakubalianoMauzianoPDF } from "./MakubalianoMauzianoPDF";
export { MakubalianoPangoPDF } from "./MakubalianoPangoPDF";
export { RisitiMalipoPDF } from "./RisitiMalipoPDF";
export { MgogoroMashauriPDF } from "./MgogoroMashauriPDF";
export { KibariaBiasharaNdogoPDF } from "./KibariaBiasharaNdogoPDF";
export { UsajiliKikundiPDF } from "./UsajiliKikundiPDF";
export { OmbiMsaadaJamiiPDF } from "./OmbiMsaadaJamiiPDF";
export { UsajiliMifugoPDF } from "./UsajiliMifugoPDF";
export { ChetiUzawaPDF } from "./ChetiUzawaPDF";
export { OmbiArdhiKijijiPDF } from "./OmbiArdhiKijijiPDF";

export * from "./types";

import { UtambulishoMkaziPDF } from "./UtambulishoMkaziPDF";
import { KibariMazishiPDF } from "./KibariMazishiPDF";
import { KibariSherehePDF } from "./KibariSherehePDF";
import { KibariUjeziMdogoPDF } from "./KibariUjeziMdogoPDF";
import { BaruaUtambulishoPDF } from "./BaruaUtambulishoPDF";
import { MakubalianoMauzianoPDF } from "./MakubalianoMauzianoPDF";
import { MakubalianoPangoPDF } from "./MakubalianoPangoPDF";
import { RisitiMalipoPDF } from "./RisitiMalipoPDF";
import { MgogoroMashauriPDF } from "./MgogoroMashauriPDF";
import { KibariaBiasharaNdogoPDF } from "./KibariaBiasharaNdogoPDF";
import { UsajiliKikundiPDF } from "./UsajiliKikundiPDF";
import { OmbiMsaadaJamiiPDF } from "./OmbiMsaadaJamiiPDF";
import { UsajiliMifugoPDF } from "./UsajiliMifugoPDF";
import { ChetiUzawaPDF } from "./ChetiUzawaPDF";
import { OmbiArdhiKijijiPDF } from "./OmbiArdhiKijijiPDF";
import type { DocumentPDFProps } from "./types";
import React from "react";

/**
 * Mapping of service names to their PDF document components
 * IMPORTANT: These names must match exactly with HARDCODED_SERVICES in services.ts
 */
export const SERVICE_DOCUMENTS: Record<string, React.FC<DocumentPDFProps>> = {
  "Utambulisho wa Mkazi": UtambulishoMkaziPDF,
  "Kibari cha Mazishi": KibariMazishiPDF,
  "Kibari cha Sherehe": KibariSherehePDF,
  "Kibari cha Ujezi Mdogo": KibariUjeziMdogoPDF,
  "Barua ya Utambulisho": BaruaUtambulishoPDF,
  "Makubaliano ya Mauzo": MakubalianoMauzianoPDF,
  "Makubaliano ya Pango": MakubalianoPangoPDF,
  "Malipo na Michango": RisitiMalipoPDF,
  "Migogoro na Mashauri": MgogoroMashauriPDF,
  "Kibari cha Biashara Ndogo": KibariaBiasharaNdogoPDF,
  "Usajili wa Kikundi": UsajiliKikundiPDF,
  "Ombi la Msaada wa Jamii": OmbiMsaadaJamiiPDF,
  "Usajili wa Mifugo": UsajiliMifugoPDF,
  "Cheti cha Uzawa": ChetiUzawaPDF,
  "Ombi la Ardhi ya Kijiji": OmbiArdhiKijijiPDF,
};

export function getServiceDocument(serviceName: string): React.FC<DocumentPDFProps> | undefined {
  return SERVICE_DOCUMENTS[serviceName];
}

export function hasServiceDocument(serviceName: string): boolean {
  return serviceName in SERVICE_DOCUMENTS;
}

export function getReceiptDocument(): React.FC<DocumentPDFProps> {
  return RisitiMalipoPDF;
}

export const AVAILABLE_PDF_SERVICES = Object.keys(SERVICE_DOCUMENTS);
