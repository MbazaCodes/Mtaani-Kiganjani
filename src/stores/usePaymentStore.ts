/**
 * usePaymentStore — Zustand store for the Payment flow
 *
 * Replaces payingApplication state that lived in AppContext.
 * Keeps payment initiation, success, and cancellation in one place.
 *
 * Usage:
 *   const { payingApplication, handleInitiatePayment } = usePaymentStore();
 */

import { create } from "zustand";
import { supabase } from "@/lib/supabase";
import type { Application } from "@/lib/supabase";
import type { PaymentResult } from "@/types";
import { IS_SUPABASE_CONFIGURED } from "@/lib/config";

interface PaymentState {
  payingApplication: Application | null;
  handleInitiatePayment: (app: Application) => void;
  handlePaymentSuccess: (
    paymentData: PaymentResult,
    userId: string | undefined,
    lang: string,
    showToast: (msg: string, type: "success" | "error" | "warning") => void,
    onDone: () => void,
  ) => Promise<void>;
  handleCancelPayment: () => void;
}

export const usePaymentStore = create<PaymentState>((set, get) => ({
  payingApplication: null,

  handleInitiatePayment: (app) => set({ payingApplication: app }),

  handleCancelPayment: () => set({ payingApplication: null }),

  handlePaymentSuccess: async (paymentData, userId, lang, showToast, onDone) => {
    const { payingApplication } = get();
    if (!payingApplication) return;

    const paymentInfo = {
      transaction_id: paymentData.transaction_id ?? `TXN-${Date.now()}`,
      amount: paymentData.amount ?? 0,
      payment_method: paymentData.payment_method ?? "unknown",
      paid_at: paymentData.paid_at ?? new Date().toISOString(),
    };

    // Demo / offline mode
    if (!IS_SUPABASE_CONFIGURED || userId?.startsWith("demo-")) {
      const existing: Application[] = JSON.parse(localStorage.getItem("demo_applications") || "[]");
      localStorage.setItem(
        "demo_applications",
        JSON.stringify(
          existing.map((app) =>
            app.id === payingApplication.id
              ? {
                  ...app,
                  status: "issued",
                  paid_at: new Date().toISOString(),
                  payment_data: paymentInfo,
                }
              : app,
          ),
        ),
      );
      set({ payingApplication: null });
      onDone();
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

    set({ payingApplication: null });
    onDone();
    showToast(
      lang === "sw"
        ? "Malipo yamepokelewa! Inasubiri uthibitisho wa Mtumishi."
        : "Payment received! Awaiting staff verification.",
      "success",
    );
  },
}));
