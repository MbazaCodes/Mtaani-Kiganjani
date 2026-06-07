/**
 * WhatsApp Integration Utility
 * Generates WhatsApp deep links for notifications.
 * When proper WhatsApp Business API is available, replace with actual API calls.
 */

const WHATSAPP_BASE = "https://wa.me";

/** Generate a WhatsApp message link for a phone number */
export function whatsappLink(phone: string, message: string): string {
  // Normalize Tanzania phone numbers
  let clean = phone.replace(/\D/g, "");
  if (clean.startsWith("0")) clean = "255" + clean.slice(1);
  if (!clean.startsWith("255")) clean = "255" + clean;
  return `${WHATSAPP_BASE}/${clean}?text=${encodeURIComponent(message)}`;
}

/** Generate a notification message for application status updates */
export function applicationStatusMessage(
  lang: string,
  appNumber: string,
  status: string,
  serviceName: string,
): string {
  const sw = lang === "sw";
  const statusLabels: Record<string, { sw: string; en: string }> = {
    submitted: { sw: "Imewasilishwa", en: "Submitted" },
    approved: { sw: "Imeidhinishwa", en: "Approved" },
    issued: { sw: "Imetolewa", en: "Issued" },
    rejected: { sw: "Imekataliwa", en: "Rejected" },
    pending_payment: { sw: "Inasubiri Malipo", en: "Awaiting Payment" },
  };
  const label = statusLabels[status] || { sw: status, en: status };

  return sw
    ? `🏛️ E-MTAA\n\nMaombi yako ya ${serviceName} (${appNumber}) yamebadilika hali:\n\n📋 Hali: ${label.sw}\n\nTembelea https://www.e-mtaatz.xyz kwa maelezo zaidi.`
    : `🏛️ E-MTAA\n\nYour ${serviceName} application (${appNumber}) status update:\n\n📋 Status: ${label.en}\n\nVisit https://www.e-mtaatz.xyz for details.`;
}

/** Open WhatsApp with a pre-filled notification message */
export function sendWhatsAppNotification(
  phone: string,
  lang: string,
  appNumber: string,
  status: string,
  serviceName: string,
): void {
  const message = applicationStatusMessage(lang, appNumber, status, serviceName);
  window.open(whatsappLink(phone, message), "_blank");
}
