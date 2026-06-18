/**
 * ReceiptPDF — Re-exports the production-ready RisitiMalipoPDF component.
 *
 * The original minimal stub has been replaced by a re-export of the
 * full-featured bilingual (Swahili/English) payment receipt generator
 * which includes government letterhead, paid banner, fee distribution
 * breakdown, QR code, and official government stamp.
 *
 * @deprecated Use RisitiMalipoPDF from "@/components/documents" directly.
 */
import { RisitiMalipoPDF } from "@/components/documents/RisitiMalipoPDF";

export { RisitiMalipoPDF as ReceiptPDF };
export default RisitiMalipoPDF;
