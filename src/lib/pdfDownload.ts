/**
 * pdfDownload.ts — Shared utility for programmatic PDF generation and download.
 *
 * Eliminates the duplicated pdf().toBlob() + anchor-click pattern that was
 * spread across Agreement.tsx and pages/staff/BusinessApproval.tsx.
 *
 * Usage:
 *   await downloadAgreementPDF(application, serviceName, lang);
 *   await downloadPDF(<MyPDFComponent />, "my-filename.pdf");
 */
import React from "react";
import { pdf } from "@react-pdf/renderer";
import { Application } from "@/lib/supabase";
import { generateQRDataUrl } from "@/lib/qr";
import { MakubalianoMauzianoPDF } from "@/components/documents/MakubalianoMauzianoPDF";
import { MakubalianoPangoPDF } from "@/components/documents/MakubalianoPangoPDF";

/**
 * Render a react-pdf element to a Blob, then trigger a browser download.
 */
export async function downloadPDF(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  element: React.ReactElement<any>,
  filename: string,
): Promise<void> {
  // pdf() from @react-pdf/renderer expects a DocumentProps element; cast is safe here
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const blob = await pdf(element as any).toBlob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Fetch the full application row (with user join), generate QR, pick the right
 * agreement PDF component, and trigger download.
 *
 * Returns true on success, false on failure (logs error to console).
 */
export async function downloadAgreementPDF(
  supabase: import("@supabase/supabase-js").SupabaseClient,
  applicationId: string,
  applicationNumber: string,
  serviceName: string,
  lang: "sw" | "en" = "sw",
): Promise<boolean> {
  try {
    const { data: fullApp } = await supabase
      .from("applications")
      .select(
        "*, users:user_id(first_name, middle_name, last_name, nida_number, phone, region, district, ward, sex, date_of_birth)",
      )
      .eq("id", applicationId)
      .maybeSingle();

    if (!fullApp) throw new Error("Application not found");

    const qrUrl = await generateQRDataUrl(fullApp as Application, "DOC");

    const isSale =
      serviceName.includes("Mauzo") || serviceName.includes("Sale");
    const Comp = isSale ? MakubalianoMauzianoPDF : MakubalianoPangoPDF;

    await downloadPDF(
      React.createElement(Comp, {
        application: fullApp as Application,
        lang,
        qrDataUrl: qrUrl,
      }),
      `Agreement_${applicationNumber || "doc"}.pdf`,
    );

    return true;
  } catch (err) {
    console.error("PDF download error:", err);
    return false;
  }
}
