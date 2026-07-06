/**
 * AppContext — Application-level state provider
 *
 * Orchestrates the three Zustand stores:
 *   useApplyStore    → selectedService, selectedDraft
 *   usePaymentStore  → payingApplication, payment handlers
 *   useServicesStore → service catalogue, fee calculation
 *
 * This context layer adds:
 *   - submitApplication (needs auth user + lang + toast — cross-store)
 *   - fetchApplications (delegates to useApplications hook)
 *   - isLoading
 *
 * All existing consumers (useAppContext()) continue to work unchanged.
 * New code can also import stores directly for better tree-shaking.
 */

import React, { createContext, useContext, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import type { Service, Application } from "@/lib/supabase";
import { logActivity } from "@/lib/activity-log";
import type { AnyFormData, PaymentResult, ApplicationDraft } from "@/types";
import { IS_SUPABASE_CONFIGURED } from "@/lib/config";
import { uploadFiles } from "@/lib/fileStorage";
import { useAuth } from "@/context/AuthContext";
import { useLanguage } from "@/context/LanguageContext";
import { useApplications } from "@/hooks/useApplications";
import { useToast } from "@/context/ToastContext";
import { useApplyStore } from "@/stores/useApplyStore";
import { usePaymentStore } from "@/stores/usePaymentStore";
import { useServicesStore } from "@/stores/useServicesStore";

interface AppContextType {
  // Applications
  applications: Application[];
  drafts: ApplicationDraft[];
  fetchApplications: () => void;
  isLoading: boolean;
  // Apply flow (from useApplyStore)
  selectedService: Service | null;
  setSelectedService: (s: Service | null) => void;
  selectedDraft: ApplicationDraft | null;
  setSelectedDraft: (d: ApplicationDraft | null) => void;
  submitApplication: (formData: AnyFormData, files?: File[]) => Promise<void>;
  // Payment flow (from usePaymentStore)
  payingApplication: Application | null;
  handleInitiatePayment: (app: Application) => void;
  handlePaymentSuccess: (paymentData: PaymentResult) => Promise<void>;
  handleCancelPayment: () => void;
  getPaymentAmount: (app: Application) => number;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const { lang } = useLanguage();
  const { showToast } = useToast();
  const { applications, drafts, fetchApplications, loading: isLoading } = useApplications(user);

  // ── Zustand stores ──────────────────────────────────────────────────────────
  const { selectedService, selectedDraft, setSelectedService, setSelectedDraft } = useApplyStore();
  const {
    payingApplication,
    handleInitiatePayment,
    handleCancelPayment,
    handlePaymentSuccess: _handlePaymentSuccess,
  } = usePaymentStore();
  const { getPaymentAmount } = useServicesStore();

  // ── Payment success — bridge store action with context dependencies ─────────
  const handlePaymentSuccess = useCallback(
    async (paymentData: PaymentResult) => {
      await _handlePaymentSuccess(paymentData, user?.id, lang, showToast, fetchApplications);
    },
    [_handlePaymentSuccess, user?.id, lang, showToast, fetchApplications],
  );

  // ── Submit application ──────────────────────────────────────────────────────
  const submitApplication = useCallback(
    async (formData: AnyFormData, files?: File[]) => {
      if (!user || !selectedService) {
        showToast(
          lang === "sw"
            ? "Hitilafu: Mtumiaji au huduma haijachaguliwa"
            : "Error: User or service not selected",
          "error",
        );
        return;
      }

      const getServiceCode = (name: string): string => {
        const u = name.toUpperCase();
        if (u.includes("MKAZI")) return "MKZ";
        if (u.includes("UTAMBULISHO")) return "UTB";
        if (u.includes("TUKIO")) return "KIB";
        if (u.includes("MAZISHI")) return "MAZ";
        if (u.includes("MAUZIANO")) return "MUZ";
        if (u.includes("PANGISHA") || u.includes("PANGO")) return "PNG";
        return (
          name
            .replace(/[^A-Z]/gi, "")
            .substring(0, 3)
            .toUpperCase() || "APP"
        );
      };

      // Upload files to storage (URL stored in form_data, not base64)
      if (files && files.length > 0) {
        const docTypes = (formData.document_types as string[] | undefined) ?? [];
        const tempAppId = "app-" + Math.random().toString(36).substring(7);
        const uploaded = await uploadFiles(files, user.id, tempAppId, docTypes);
        if (uploaded.length > 0) {
          (formData as Record<string, unknown>).uploaded_documents = uploaded;
        }
      }

      // Embed citizen photo so PDFs render correctly regardless of viewer
      if (user.photo_url && !(formData as Record<string, unknown>).photo_url) {
        (formData as Record<string, unknown>).photo_url = (
          user as unknown as Record<string, unknown>
        )?.photo_url;
      }
      if (!(formData as Record<string, unknown>).applicant_name) {
        (formData as Record<string, unknown>).applicant_name =
          `${user.first_name ?? ""} ${user.middle_name ?? ""} ${user.last_name ?? ""}`
            .replace(/\s+/g, " ")
            .trim();
      }

      const now = new Date();
      const dateStr = now.toISOString().slice(0, 10).replace(/-/g, "");
      const randomNum = Math.floor(1000 + Math.random() * 9000);
      const applicationNumber = `TZ-${getServiceCode(selectedService.name)}-${dateStr}-${randomNum}`;

      let officeRegistryId: string | null =
        ((user as unknown as Record<string, unknown>).assigned_office_id as string) ?? null;
      if (!officeRegistryId && user.region && user.district && user.ward && !user.is_diaspora) {
        try {
          const { data: oid } = await supabase.rpc("find_office_for_address", {
            p_region: user.region,
            p_district: user.district,
            p_ward: user.ward,
            p_street: user.street || "",
          });
          officeRegistryId = (oid as string) || null;
        } catch {
          /* optional */
        }
      }

      const isMalipo =
        selectedService.name.toLowerCase().includes("malipo") ||
        selectedService.name.toLowerCase().includes("michango");

      const newApp = {
        id: "app-" + Math.random().toString(36).substring(7),
        user_id: user.id,
        service_id: selectedService.id,
        service_name: selectedService.name,
        application_number: applicationNumber,
        form_data: formData,
        status: isMalipo ? ("paid" as const) : ("submitted" as const),
        region: user.region,
        district: user.district,
        ward: user.ward,
        street: user.street,
        office_registry_id: officeRegistryId,
        created_at: new Date().toISOString(),
      };

      if (!IS_SUPABASE_CONFIGURED || user.id.startsWith("demo-")) {
        const existing: Application[] = JSON.parse(
          localStorage.getItem("demo_applications") || "[]",
        );
        localStorage.setItem("demo_applications", JSON.stringify([newApp, ...existing]));
        showToast(
          lang === "sw"
            ? "Maombi yametumwa kikamilifu! (Hifadhi ya Ndani)"
            : "Application submitted! (Offline)",
          "success",
        );
        fetchApplications();
        return;
      }

      try {
        const targetUserId =
          formData.target_user_id ??
          formData.second_party_user_id ??
          formData.buyer_id ??
          formData.tenant_id ??
          null;
        const hasSecondParty = !!(
          formData.second_party_user_id ??
          formData.buyer_id ??
          formData.tenant_id
        );
        const sendForApproval = formData.send_for_approval === "YES" || hasSecondParty;

        let targetUserRole: string | null = null;
        if (sendForApproval && formData.submitter_role) {
          const roleMap: Record<string, string> = {
            LANDLORD: "TENANT",
            TENANT: "LANDLORD",
            SELLER: "BUYER",
            BUYER: "SELLER",
          };
          targetUserRole = roleMap[formData.submitter_role] ?? null;
        } else if (sendForApproval && formData.asset_type) {
          targetUserRole = formData.asset_type.includes("PANGO") ? "TENANT" : "BUYER";
        }

        const isRealUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
          selectedService.id ?? "",
        );

        const { error, data: insertedApp } = await supabase
          .from("applications")
          .insert({
            user_id: user.id,
            service_id: isRealUuid ? selectedService.id : null,
            service_name: selectedService.name ?? selectedService.name_en,
            application_number: applicationNumber,
            form_data: formData,
            status: isMalipo ? "paid" : "submitted",
            region: user.region ?? null,
            district: user.district ?? null,
            ward: user.ward ?? null,
            street: user.street ?? null,
            office_registry_id: officeRegistryId,
            target_user_id: sendForApproval ? targetUserId : null,
            second_party_user_id: sendForApproval ? targetUserId : null,
            target_user_nida: sendForApproval ? (formData.target_user_nida ?? null) : null,
            target_user_role: sendForApproval ? targetUserRole : null,
            agreement_status: sendForApproval && targetUserId ? "pending" : null,
            approved_at: isMalipo ? new Date().toISOString() : null,
          })
          .select()
          .single();

        if (error) {
          const isNetworkError = [
            "ERR_NAME_NOT_RESOLVED",
            "NetworkError",
            "Failed to fetch",
            "net::",
          ].some((s) => error.message?.includes(s));
          if (isNetworkError) {
            const existing: Application[] = JSON.parse(
              localStorage.getItem("demo_applications") || "[]",
            );
            localStorage.setItem("demo_applications", JSON.stringify([newApp, ...existing]));
            showToast(
              lang === "sw"
                ? "Maombi yametumwa (Hakuna Mtandao)"
                : "Application submitted (Offline)",
              "warning",
            );
            fetchApplications();
            return;
          }
          showToast(
            lang === "sw" ? `Hitilafu: ${error.message}` : `Error: ${error.message}`,
            "error",
          );
          return;
        }

        // Notify counterparty for agreements
        if (sendForApproval && targetUserId && insertedApp) {
          const isRental = (formData.asset_type ?? "").includes("PANGO");
          try {
            await supabase.from("notifications").insert({
              user_id: targetUserId,
              title:
                lang === "sw"
                  ? `${isRental ? "Makubaliano ya Upangishaji" : "Makubaliano ya Mauziano"} - Idhini Inahitajika`
                  : `${isRental ? "Rental Agreement" : "Sales Agreement"} - Approval Required`,
              message:
                lang === "sw"
                  ? `Umechaguliwa kama ${isRental ? "Mpangaji" : "Mnunuzi"} katika makubaliano (${applicationNumber}).`
                  : `You have been selected as ${isRental ? "Tenant" : "Buyer"} in agreement (${applicationNumber}).`,
              type: "info",
            });
          } catch {
            /* notifications are non-critical */
          }
        }

        logActivity(user.id, "submit_application", {
          applicationId: insertedApp?.id,
          service: newApp.service_name,
          number: newApp.application_number,
        });
        showToast(
          lang === "sw" ? "Maombi yametumwa kikamilifu!" : "Application submitted successfully!",
          "success",
        );
        fetchApplications();
      } catch (err: unknown) {
        const e = err as { message?: string };
        const isNetworkError =
          !navigator.onLine ||
          ["ERR_NAME_NOT_RESOLVED", "NetworkError", "Failed to fetch"].some((s) =>
            e.message?.includes(s),
          );
        if (isNetworkError) {
          const existing: Application[] = JSON.parse(
            localStorage.getItem("demo_applications") || "[]",
          );
          localStorage.setItem("demo_applications", JSON.stringify([newApp, ...existing]));
          showToast(
            lang === "sw"
              ? "Maombi yametumwa (Hifadhi ya Ndani)"
              : "Application submitted (Offline)",
            "warning",
          );
          fetchApplications();
          return;
        }
        showToast(lang === "sw" ? `Hitilafu: ${e.message}` : `Error: ${e.message}`, "error");
      }
    },
    [user, selectedService, lang, showToast, fetchApplications],
  );

  return (
    <AppContext.Provider
      value={{
        applications,
        drafts,
        fetchApplications,
        selectedService,
        setSelectedService,
        selectedDraft,
        setSelectedDraft,
        submitApplication,
        payingApplication,
        handleInitiatePayment,
        handlePaymentSuccess,
        handleCancelPayment,
        getPaymentAmount,
        isLoading,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useAppContext = () => {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useAppContext must be used within AppProvider");
  return ctx;
};
