/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * DocumentRenderer — routes to the correct PDF component based on service_id/name
 * and pre-generates QR codes before rendering.
 */
import React, { useState, useEffect } from "react";
import { PDFDownloadLink, PDFViewer } from "@react-pdf/renderer";
import { Application, Service } from "@/lib/supabase";
import { generateQRDataUrl } from "@/lib/qr";
import { X, Download, ExternalLink, Loader2 } from "lucide-react";

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

// Map service_id / name keywords to PDF component + service code
type PDFFactory = {
  Component: React.ComponentType<{
    application: Application;
    lang: "sw" | "en";
    qrDataUrl?: string;
  }>;
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
  const [qr, setQr] = useState("");
  useEffect(() => {
    if (!application) return;
    generateQRDataUrl(application, code).then(setQr);
  }, [application?.id, code]);
  return qr;
}

// ── Inline download button ───────────────────────────────────────────────────
export const DocumentRenderer: React.FC<{
  application: Application;
  service: Service;
  lang?: "sw" | "en";
}> = ({ application, lang = "sw" }) => {
  const { Component, code, filenamePrefix } = resolvePDF(application);
  const qrDataUrl = useQRCode(application, code);
  const filename = `${filenamePrefix}-${application.application_number}.pdf`;

  if (!qrDataUrl) {
    return (
      <span className="inline-flex items-center gap-2 text-sm text-stone-400">
        <Loader2 size={14} className="animate-spin" /> Inaandaa hati…
      </span>
    );
  }

  return (
    <PDFDownloadLink
      document={<Component application={application} lang={lang} qrDataUrl={qrDataUrl} />}
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

// ── Full modal preview ───────────────────────────────────────────────────────
export const DocumentPreview: React.FC<{
  application: Application;
  service: Service;
  lang?: "sw" | "en";
  onClose: () => void;
}> = ({ application, service, lang = "sw", onClose }) => {
  const { Component, code, filenamePrefix } = resolvePDF(application);
  const qrDataUrl = useQRCode(application, code);
  const filename = `${filenamePrefix}-${application.application_number}.pdf`;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl flex flex-col"
        style={{ height: "90vh" }}
      >
        {/* Modal header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-stone-200">
          <div>
            <h2 className="text-lg font-bold text-stone-900">
              {lang === "sw" ? "Hakiki Hati" : "Document Preview"}
            </h2>
            <p className="text-xs text-stone-500 font-mono">{application.application_number}</p>
          </div>
          <div className="flex items-center gap-3">
            {qrDataUrl && (
              <PDFDownloadLink
                document={<Component application={application} lang={lang} qrDataUrl={qrDataUrl} />}
                fileName={filename}
              >
                {({ loading }) => (
                  <button
                    disabled={loading}
                    className="flex items-center gap-2 px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white text-sm font-bold rounded-xl disabled:opacity-60"
                  >
                    {loading ? (
                      <Loader2 size={14} className="animate-spin" />
                    ) : (
                      <Download size={14} />
                    )}
                    {lang === "sw" ? "Pakua" : "Download"}
                  </button>
                )}
              </PDFDownloadLink>
            )}
            <button
              onClick={onClose}
              className="p-2 hover:bg-stone-100 rounded-xl text-stone-500 transition-colors"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* PDF viewer */}
        <div className="flex-1 overflow-hidden rounded-b-2xl">
          {!qrDataUrl ? (
            <div className="h-full flex items-center justify-center text-stone-400">
              <Loader2 size={28} className="animate-spin mr-3" />
              <span>{lang === "sw" ? "Inaandaa QR code…" : "Preparing QR code…"}</span>
            </div>
          ) : (
            <PDFViewer width="100%" height="100%" style={{ border: "none" }}>
              <Component application={application} lang={lang} qrDataUrl={qrDataUrl} />
            </PDFViewer>
          )}
        </div>
      </div>
    </div>
  );
};
