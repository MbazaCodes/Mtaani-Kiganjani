/**
 * QR code generation for PDF documents.
 * Uses the `qrcode` npm package (client-side) to produce a base64 PNG data URL
 * that @react-pdf/renderer can embed via <Image>.
 *
 * The external qrserver.com fallback has been removed — it was unreliable inside
 * the PDF renderer (network calls during render are async and unpredictable).
 * If the qrcode library fails, we return a 1×1 transparent PNG placeholder so the
 * PDF still renders cleanly.
 */
import QRCode from "qrcode";
import { Application } from "@/lib/supabase";

export interface QRPayload {
  ref: string; // application_number — short, readable
  id: string; // full UUID — for exact DB lookup
  svc: string; // service code abbreviation
  dt: string; // issue date YYYY-MM-DD
}

/** 1×1 transparent PNG — safe placeholder when QR generation fails */
const BLANK_PNG =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==";

/**
 * Generate a QR code as a base64 PNG data URL.
 * Encodes a compact JSON payload that the VerifyDocuments page can decode.
 * Always resolves — never rejects.
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
    return await QRCode.toDataURL(JSON.stringify(payload), {
      width: 160,
      margin: 1,
      color: { dark: "#1c1917", light: "#ffffff" },
      errorCorrectionLevel: "M",
    });
  } catch {
    // Return a transparent placeholder so the PDF still renders without crashing
    return BLANK_PNG;
  }
}

/**
 * Synchronous version — returns the blank placeholder immediately.
 * Always use the async version (generateQRDataUrl) via useQRCode hook instead;
 * this exists only for legacy call-sites that cannot await.
 */
export function generateQRDataUrlSync(_application: Application, _serviceCode: string): string {
  return BLANK_PNG;
}
