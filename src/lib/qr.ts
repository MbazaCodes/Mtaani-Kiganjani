/**
 * QR code generation for PDF documents.
 * Uses the `qrcode` npm package (server-side / build-time compatible)
 * to produce a base64 PNG data URL that @react-pdf/renderer can embed via <Image>.
 *
 * Falls back to the external qrserver.com API if canvas is unavailable
 * (e.g. during SSR, though this app is purely client-side).
 */
import QRCode from "qrcode";
import { Application } from "@/lib/supabase";

export interface QRPayload {
  ref: string; // application_number — short, readable
  id: string; // full UUID — for exact DB lookup
  svc: string; // service code abbreviation
  dt: string; // issue date YYYY-MM-DD
}

/**
 * Generate a QR code as a base64 PNG data URL.
 * Encodes a compact JSON payload that the VerifyDocuments page can decode.
 */
export async function generateQRDataUrl(
  application: Application,
  serviceCode: string,
): Promise<string> {
  const payload: QRPayload = {
    ref: application.application_number ?? "",
    id: application.id,
    svc: serviceCode,
    dt: new Date().toISOString().split("T")[0],
  };

  try {
    const dataUrl = await QRCode.toDataURL(JSON.stringify(payload), {
      width: 160,
      margin: 1,
      color: { dark: "#1c1917", light: "#ffffff" },
      errorCorrectionLevel: "M",
    });
    return dataUrl;
  } catch {
    // Fallback: external API (requires internet)
    return `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(JSON.stringify(payload))}`;
  }
}

/**
 * Synchronous version for use in render functions that can't await.
 * Returns a placeholder and starts async generation (use the async version instead
 * when possible — i.e. generate in useEffect before rendering the PDF).
 */
export function generateQRDataUrlSync(application: Application, serviceCode: string): string {
  // Return external API URL as a synchronous fallback
  const payload: QRPayload = {
    ref: application.application_number ?? "",
    id: application.id,
    svc: serviceCode,
    dt: new Date().toISOString().split("T")[0],
  };
  return `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(JSON.stringify(payload))}`;
}
