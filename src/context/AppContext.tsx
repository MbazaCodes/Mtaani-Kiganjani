import React, { createContext, useContext, useState, useCallback } from "react";
import { supabase, Service, Application } from "@/lib/supabase";
import type { AnyFormData, PaymentResult, ApplicationDraft } from "@/types";
import { HARDCODED_SERVICES } from "@/constants/services";
import { IS_SUPABASE_CONFIGURED } from "@/lib/config";
import { useAuth } from "@/context/AuthContext";
import { useLanguage } from "@/context/LanguageContext";
import { useApplications } from "@/hooks/useApplications";
import { useToast } from "@/context/ToastContext";

interface AppContextType {
  // Applications
  applications: Application[];
  drafts: ApplicationDraft[];
  fetchApplications: () => void;
  // Apply flow
  selectedService: Service | null;
  setSelectedService: (s: Service | null) => void;
  selectedDraft: ApplicationDraft | null;
  setSelectedDraft: (d: ApplicationDraft | null) => void;
  submitApplication: (formData: AnyFormData) => Promise<void>;
  // Payment flow
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
  const { applications, drafts, fetchApplications } = useApplications(user);

  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [selectedDraft, setSelectedDraft] = useState<ApplicationDraft | null>(null);
  const [payingApplication, setPayingApplication] = useState<Application | null>(null);

  const getPaymentAmount = useCallback((app: Application): number => {
    const serviceFee = (app as Application & { services?: { fee?: number } }).services?.fee ?? 0;
    const formServiceFee = app.form_data?.service_fee;
    if (serviceFee > 0) return serviceFee;
    if (typeof formServiceFee === "number" && formServiceFee > 0) return formServiceFee;
    if (typeof formServiceFee === "string") {
      const parsed = parseFloat(formServiceFee);
      if (!isNaN(parsed) && parsed > 0) return parsed;
    }
    return 0;
  }, []);

  const submitApplication = useCallback(
    async (formData: AnyFormData) => {
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

      const now = new Date();
      const dateStr = now.toISOString().slice(0, 10).replace(/-/g, "");
      const randomNum = Math.floor(1000 + Math.random() * 9000);
      const applicationNumber = `TZ-${getServiceCode(selectedService.name)}-${dateStr}-${randomNum}`;

      const newApp = {
        id: "app-" + Math.random().toString(36).substring(7),
        user_id: user.id,
        service_id: selectedService.id,
        service_name: selectedService.name,
        application_number: applicationNumber,
        form_data: formData,
        status: "submitted" as const,
        region: user.region,
        district: user.district,
        ward: user.ward,
        street: user.street,
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
        const targetUserId = formData.target_user_id ?? formData.second_party_user_id ?? null;
        const hasSecondParty = !!formData.second_party_user_id;
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

        // Use service_id only if it's a real UUID (hardcoded services have ids like "1","2")
        const isRealUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
          .test(selectedService.id ?? "");

        const { error, data: insertedApp } = await supabase
          .from("applications")
          .insert({
            user_id: user.id,
            service_id: isRealUuid ? selectedService.id : null,
            service_name: selectedService.name ?? selectedService.name_en,
            application_number: applicationNumber,
            form_data: formData,
            status: "submitted",
            region: user.region ?? null,
            district: user.district ?? null,
            ward: user.ward ?? null,
            street: user.street ?? null,
            target_user_id: sendForApproval ? targetUserId : null,
            target_user_nida: sendForApproval ? (formData.target_user_nida ?? null) : null,
            target_user_role: sendForApproval ? targetUserRole : null,
            agreement_status: sendForApproval && targetUserId ? "pending" : null,
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

  const handleInitiatePayment = useCallback(
    (app: Application) => {
      // For approved applications, always open payment gateway
      // (fee may be 0 for free services — still show the confirmation flow)
      setPayingApplication(app);
    },
    [],
  );

  const handlePaymentSuccess = useCallback(
    async (paymentData: PaymentResult) => {
      if (!payingApplication) return;
      const paymentInfo = {
        transaction_id: paymentData.transaction_id ?? `TXN-${Date.now()}`,
        amount: paymentData.amount ?? 0,
        payment_method: paymentData.payment_method ?? "unknown",
        paid_at: paymentData.paid_at ?? new Date().toISOString(),
      };

      if (!IS_SUPABASE_CONFIGURED || user?.id.startsWith("demo-")) {
        const existing: Application[] = JSON.parse(
          localStorage.getItem("demo_applications") || "[]",
        );
        localStorage.setItem(
          "demo_applications",
          JSON.stringify(
            existing.map((app) =>
              app.id === payingApplication.id
                ? {
                    ...app,
                    status: "issued",
                    paid_at: new Date().toISOString(),
                    issued_at: new Date().toISOString(),
                    payment_data: paymentInfo,
                  }
                : app,
            ),
          ),
        );
        setPayingApplication(null);
        fetchApplications();
        showToast(lang === "sw" ? "Malipo yamepokelewa!" : "Payment received!", "success");
        return;
      }

      const { error } = await supabase
        .from("applications")
        .update({
          status: "issued",
          issued_at: new Date().toISOString(),
          form_data: { ...(payingApplication.form_data ?? {}), payment_data: paymentInfo },
        })
        .eq("id", payingApplication.id);

      if (error) {
        showToast(
          lang === "sw" ? "Hitilafu wakati wa kusasisha malipo." : "Error updating payment.",
          "error",
        );
        return;
      }
      setPayingApplication(null);
      fetchApplications();
      showToast(
        lang === "sw"
          ? "Malipo yamepokelewa! Inasubiri uthibitisho wa Mtumishi."
          : "Payment received! Awaiting staff verification.",
        "success",
      );
    },
    [payingApplication, user, lang, showToast, fetchApplications],
  );

  const handleCancelPayment = useCallback(() => setPayingApplication(null), []);

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
