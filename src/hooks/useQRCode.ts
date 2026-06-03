/**
 * Hook to pre-generate a QR code data URL before rendering a PDF.
 * PDF components receive the data URL as a prop so they don't need async logic.
 */
import { useState, useEffect } from "react";
import { generateQRDataUrl } from "@/lib/qr";
import { Application } from "@/lib/supabase";

export function useQRCode(application: Application | null, serviceCode: string) {
  const [qrDataUrl, setQrDataUrl] = useState<string>("");

  useEffect(() => {
    if (!application) return;
    generateQRDataUrl(application, serviceCode).then(setQrDataUrl);
  }, [application?.id, serviceCode]);

  return qrDataUrl;
}
