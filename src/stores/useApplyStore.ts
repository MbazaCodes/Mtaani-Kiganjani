/**
 * useApplyStore — Zustand store for the Apply flow
 *
 * Replaces the selectedService / selectedDraft state that lived in AppContext.
 * Using Zustand means any component can read/write without prop drilling
 * or requiring AppProvider wrapping.
 *
 * Usage:
 *   const { selectedService, setSelectedService } = useApplyStore();
 */

import { create } from "zustand";
import type { Service } from "@/lib/supabase";
import type { ApplicationDraft } from "@/types";

interface ApplyState {
  selectedService: Service | null;
  selectedDraft: ApplicationDraft | null;
  setSelectedService: (service: Service | null) => void;
  setSelectedDraft: (draft: ApplicationDraft | null) => void;
  reset: () => void;
}

export const useApplyStore = create<ApplyState>((set) => ({
  selectedService: null,
  selectedDraft: null,

  setSelectedService: (service) => set({ selectedService: service }),
  setSelectedDraft: (draft) => set({ selectedDraft: draft }),

  reset: () => set({ selectedService: null, selectedDraft: null }),
}));
