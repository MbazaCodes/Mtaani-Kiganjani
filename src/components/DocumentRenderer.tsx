/**
 * DocumentRenderer — routes to the correct PDF component based on service_id/name
 * and pre-generates QR codes before rendering.
 */
import React, { useState, useEffect } from "react";
import { PDFDownloadLink } from "@react-pdf/renderer";
import { Application, Service } from "@/lib/supabase";
import { generateQRDataUrl } from "@/lib/qr";
import { X, Download, Loader2 } from "lucide-react";

// PDF components
import { UtambulishoMkaziPDF } from "./documents/UtambulishoMkaziPDF";
import { KibariMazishiPDF } from "./documents/KibariMazishiPDF";
import { KibariSherehePDF } from "./documents/KibariSherehePDF";
import { KibariUjeziMdogoPDF } from "./documents/KibariUjeziMdogoPDF";
import { BaruaUtambulishoPDF } from "./documents/BaruaUtambulishoPDF";
import { MakubalianoMauzianoPDF } from "./documents/MakubalianoMauzianoPDF";
import { MakubalianoPangoPDF } from "./documents/MakubalianoPangoPDF";
import { RisitiMalipoPDF } from "./documents/RisitiMalipoPDF";
import { MgogoroMashauriPDF } from "./documents/MgogoroMashauriPDF";
import type { DocumentPDFProps } from "./documents/types";

// Map service_id / name keywords to PDF component + service code
type PDFFactory = {
  Component: React.ComponentType<DocumentPDFProps>;
  code: string;
  filenamePrefix: string;
};

function resolvePDF(application: Application): PDFFactory {
  const name = (application.service_name || "").toUpperCase();
  const id = String(application.service_id || "");

  // Service 1 — Utambulisho wa Mkazi (Resident Identity)
  if (id === "1" || name.includes("MKAZI") || name.includes("UTAMBULISHO WA"))
    return { Component: UtambulishoMkaziPDF, code: "MKZ", filenamePrefix: "cheti-mkazi" };

  // Service 2 — Kibari cha Mazishi (Burial Permit)
  if (id === "2" || name.includes("MAZISHI"))
    return { Component: KibariMazishiPDF, code: "MAZ", filenamePrefix: "kibari-mazishi" };

  // Service 3 — Kibari cha Sherehe (Celebration Permit)
  if (id === "3" || name.includes("SHEREHE"))
    return { Component: KibariSherehePDF, code: "KIB", filenamePrefix: "kibari-sherehe" };

  // Service 4 — Kibari cha Ujezi Mdogo (Construction Permit)
  if (id === "4" || name.includes("UJEZI") || name.includes("CONSTRUCTION"))
    return { Component: KibariUjeziMdogoPDF, code: "CP", filenamePrefix: "kibari-ujezi" };

  // Service 5 — Barua ya Utambulisho (Introduction Letter)
  if (id === "5" || name.includes("BARUA"))
    return { Component: BaruaUtambulishoPDF, code: "IL", filenamePrefix: "barua-utambulisho" };

  // Service 6 — Makubaliano ya Mauzo (Sales Agreement)
  if (id === "6" || name.includes("MAUZO"))
    return { Component: MakubalianoMauzianoPDF, code: "SA", filenamePrefix: "makubaliano-mauzo" };

  // Service 7 — Makubaliano ya Pango (Rental Agreement)
  if (id === "7" || name.includes("PANGO"))
    return { Component: MakubalianoPangoPDF, code: "RA", filenamePrefix: "makubaliano-pango" };

  // Service 8 — Malipo na Michango (Payments & Contributions)
  if (id === "8" || name.includes("MALIPO") || name.includes("MICHANGO"))
    return { Component: RisitiMalipoPDF, code: "PY", filenamePrefix: "risiti-malipo" };

  // Service 9 — Migogoro na Mashauri (Disputes & Issues)
  if (id === "9" || name.includes("MIGOGORO") || name.includes("MASHAURI"))
    return { Component: MgogoroMashauriPDF, code: "DS", filenamePrefix: "taarifa-mgogoro" };

  // Default: receipt-style fallback
  return { Component: RisitiMalipoPDF, code: "DOC", filenamePrefix: "hati" };
}

// ── Hook: pre-generate QR data URL ──────────────────────────────────────────
function useQRCode(application: Application | null, code: string) {
  const [qr, setQr] = useState<string | null>(null);
  useEffect(() => {
    if (!application) return;
    generateQRDataUrl(application, code).then(setQr);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [application?.id, code]);
  return qr;
}

// ── Hook: convert any photo URL to base64 for react-pdf ────────────────────────
// react-pdf cannot fetch external URLs — needs base64 data URL
async function urlToBase64(url: string): Promise<string | null> {
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const blob = await res.blob();
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

function usePhotoBase64(rawPhoto: string | null | undefined): string | null {
  const [base64, setBase64] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!rawPhoto) { setBase64(null); return; }
    // Already base64 — use as-is
    if (rawPhoto.startsWith("data:")) { setBase64(rawPhoto); return; }
    // External URL — fetch and convert
    urlToBase64(rawPhoto).then(setBase64);
  }, [rawPhoto]);

  return base64;
}

// ── Pure react-pdf document (use this as the `document=` prop for PDFDownloadLink) ──
// CertificatePDFDocument accepts a pre-generated qrDataUrl so it has no async work
export const CertificatePDFDocument: React.FC<{
  application: Application;
  lang?: "sw" | "en";
  qrDataUrl: string;
  photoUrl?: string | null;
}> = ({ application, lang = "sw", qrDataUrl, photoUrl }) => {
  const { Component } = resolvePDF(application);
  return (
    <Component application={application} lang={lang} qrDataUrl={qrDataUrl} photoUrl={photoUrl} />
  );
};

// ── Inline download button ───────────────────────────────────────────────────
export const DocumentRenderer: React.FC<{
  application: Application;
  service?: Partial<Service> | null;
  lang?: "sw" | "en";
}> = ({ application, lang = "sw" }) => {
  const { Component, code, filenamePrefix } = resolvePDF(application);
  const qrDataUrl = useQRCode(application, code);
  const filename = `${filenamePrefix}-${application.application_number}.pdf`;

  // Resolve photo: prop chain matches what PDF components expect
  const fd = (application.form_data || {}) as Record<string, unknown>;
  const uploadedDocs = (fd.uploaded_documents || []) as { type?: string; dataUrl?: string; url?: string }[];
  const selfieDoc = uploadedDocs.find((d) => d.type === "selfie");
  // selfie may be base64 (dataUrl) or Supabase Storage URL (url)
  const rawPhoto =
    selfieDoc?.dataUrl ||
    selfieDoc?.url ||
    (application.users as Record<string, unknown> | null)?.photo_url as string | null ||
    fd.photo_url as string | null ||
    null;
  // Convert URL → base64 if needed (react-pdf can't fetch external URLs)
  const photoUrl = usePhotoBase64(rawPhoto);

  if (!qrDataUrl) {
    return (
      <span className="inline-flex items-center gap-2 text-sm text-stone-400">
        <Loader2 size={14} className="animate-spin" /> Inaandaa hati…
      </span>
    );
  }

  return (
    <PDFDownloadLink
      document={<Component application={application} lang={lang} qrDataUrl={qrDataUrl} photoUrl={photoUrl} />}
      fileName={filename}
    >
      {({ loading }) => (
        <button
          disabled={loading}
          className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white text-sm font-bold rounded-xl transition-all disabled:opacity-60"
        >
          {loading ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
          {loading
            ? lang === "sw"
              ? "Inaandaa…"
              : "Preparing…"
            : lang === "sw"
              ? "Pakua PDF"
              : "Download PDF"}
        </button>
      )}
    </PDFDownloadLink>
  );
};

// ── Document download modal (preview removed — PDFViewer causes crashes) ────
export const DocumentPreview: React.FC<{
  application: Application;
  service?: Partial<Service> | null;
  lang?: "sw" | "en";
  onClose: () => void;
}> = ({ application, lang = "sw", onClose }) => {
  const { Component, code, filenamePrefix } = resolvePDF(application);
  const qrDataUrl = useQRCode(application, code);
  const filename = `${filenamePrefix}-${application.application_number}.pdf`;
  const [ready, setReady] = React.useState(false);

  // Resolve photo: same chain as DocumentRenderer
  const fd = (application.form_data || {}) as Record<string, unknown>;
  const uploadedDocs = (fd.uploaded_documents || []) as { type?: string; dataUrl?: string }[];
  const selfieDoc = uploadedDocs.find((d) => d.type === "selfie");
  const photoUrl =
    selfieDoc?.dataUrl ||
    (application.users as Record<string, unknown> | null)?.photo_url as string | null ||
    fd.photo_url as string | null ||
    null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-stone-100">
          <div>
            <h2 className="text-lg font-bold text-stone-900">
              {lang === "sw" ? "Pakua Hati" : "Download Document"}
            </h2>
            <p className="text-xs text-stone-500 font-mono mt-0.5">
              {application.application_number}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-stone-100 rounded-xl text-stone-500 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-6 space-y-4">
          <div className="bg-emerald-50 rounded-xl p-4 flex items-center gap-3">
            <div className="w-10 h-10 bg-emerald-100 rounded-xl flex items-center justify-center shrink-0">
              <Download size={20} className="text-emerald-600" />
            </div>
            <div>
              <p className="font-bold text-stone-800 text-sm">
                {application.service_name || (lang === "sw" ? "Hati Rasmi" : "Official Document")}
              </p>
              <p className="text-xs text-stone-500 mt-0.5">
                {lang === "sw" ? "PDF · Imethibitishwa na QR Code" : "PDF · QR Code verified"}
              </p>
            </div>
          </div>

          {!qrDataUrl ? (
            <div className="flex items-center justify-center gap-3 py-4 text-stone-400">
              <Loader2 size={20} className="animate-spin" />
              <span className="text-sm">
                {lang === "sw" ? "Inaandaa hati…" : "Preparing document…"}
              </span>
            </div>
          ) : !ready ? (
            <button
              onClick={() => setReady(true)}
              className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2"
            >
              <Download size={18} />
              {lang === "sw" ? "Bonyeza Kupakua PDF" : "Click to Download PDF"}
            </button>
          ) : (
            <PDFDownloadLink
              document={<Component application={application} lang={lang} qrDataUrl={qrDataUrl} photoUrl={photoUrl} />}
              fileName={filename}
            >
              {({ loading, error }) =>
                error ? (
                  <div className="text-center py-3 text-red-500 text-sm font-medium">
                    {lang === "sw"
                      ? "Hitilafu ya hati. Jaribu tena."
                      : "Document error. Please try again."}
                  </div>
                ) : (
                  <button
                    disabled={loading}
                    className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-700 disabled:bg-stone-200 disabled:text-stone-400 text-white rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2"
                  >
                    {loading ? (
                      <>
                        <Loader2 size={16} className="animate-spin" />{" "}
                        {lang === "sw" ? "Inaandaa…" : "Preparing…"}
                      </>
                    ) : (
                      <>
                        <Download size={16} /> {lang === "sw" ? "Pakua Sasa" : "Download Now"}
                      </>
                    )}
                  </button>
                )
              }
            </PDFDownloadLink>
          )}

          <button
            onClick={onClose}
            className="w-full py-3 text-stone-500 hover:text-stone-700 text-sm font-medium transition-colors"
          >
            {lang === "sw" ? "Funga" : "Close"}
          </button>
        </div>
      </div>
    </div>
  );
};
