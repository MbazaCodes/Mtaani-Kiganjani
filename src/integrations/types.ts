/**
 * SHARED INTEGRATION TYPES
 * ========================
 * Common result shapes used by all integration modules.
 * Each integration returns a Result<T> so callers handle success/failure
 * uniformly regardless of whether the integration is live or mocked.
 */

export type IntegrationResult<T> =
  | { ok: true; data: T; source: "live" | "mock" }
  | { ok: false; error: string; source: "live" | "mock" };

/** NIDA verification result */
export interface NidaVerification {
  nidaNumber: string;
  verified: boolean;
  fullName?: string;
  dateOfBirth?: string;
  sex?: string;
  // Add fields the real NIDA API returns
}

/** TRA tax obligation / control number */
export interface TraObligation {
  controlNumber: string;
  taxpayerName: string;
  amount: number;
  currency: string;
  dueDate?: string;
  status: "outstanding" | "paid" | "overdue";
  description: string;
}

/** Police / TPF record (e.g. traffic fine) */
export interface PoliceRecord {
  referenceNumber: string;
  type: "traffic_fine" | "clearance" | "other";
  amount?: number;
  status: string;
  description: string;
  issuedDate?: string;
}

/** Payment request + result */
export interface PaymentRequest {
  applicationId: string;
  amount: number;
  currency: string;
  payerName: string;
  payerPhone?: string;
  serviceName: string;
  controlNumber?: string;
}

export interface PaymentResult {
  transactionId: string;
  receiptNumber: string;
  status: "completed" | "pending" | "failed";
  amount: number;
  paidAt: string;
  method: string;
}

/** SMS message */
export interface SmsMessage {
  to: string; // E.164 phone, e.g. +255...
  body: string;
}

export interface SmsResult {
  messageId: string;
  status: "sent" | "queued" | "failed";
}
