/**
 * useServicesStore — Zustand store for the service catalogue
 *
 * Caches the service list so it's fetched once per session,
 * not on every mount of any component that needs services.
 *
 * Usage:
 *   const { services, getPaymentAmount } = useServicesStore();
 */

import { create } from "zustand";
import type { Service, Application } from "@/lib/supabase";
import { HARDCODED_SERVICES } from "@/constants/services";
import { getApplicationAmount } from "@/lib/serviceFees";

interface ServicesState {
  services: Service[];
  getPaymentAmount: (app: Application) => number;
}

export const useServicesStore = create<ServicesState>(() => ({
  services: HARDCODED_SERVICES as Service[],

  getPaymentAmount: (app: Application): number => {
    const serviceFee = (app as Application & { services?: { fee?: number } }).services?.fee ?? 0;
    const formServiceFee = app.form_data?.service_fee;
    if (serviceFee > 0) return serviceFee;
    if (typeof formServiceFee === "number" && formServiceFee > 0) return formServiceFee;
    if (typeof formServiceFee === "string") {
      const parsed = parseFloat(formServiceFee);
      if (!isNaN(parsed) && parsed > 0) return parsed;
    }
    return getApplicationAmount(app);
  },
}));
