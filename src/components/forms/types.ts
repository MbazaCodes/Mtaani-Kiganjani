import { UserProfile } from "@/lib/supabase";
import type { AnyFormData } from "@/types";

export type FormLanguage = "sw" | "en";

export interface FormProps {
  onSubmit: (
    data: Record<string, unknown>,
    files?: File[],
    signature?: string,
  ) => Promise<void> | void;
  isLoading?: boolean;
  lang?: FormLanguage;
  userProfile?: UserProfile | null;
  draftId?: string;
}

export const labels = {
  sw: {
    submit: "Wasilisha",
    submitting: "Inawasilisha...",
    next: "Endelea",
    back: "Nyuma",
    required: "Sehemu inahitajika",
    optional: "Hiari",
    yes: "Ndiyo",
    no: "Hapana",
    select: "Chagua",
    selectOption: "Chagua chaguo",
    loading: "Inapakia...",
    error: "Hitilafu",
    success: "Imefanikiwa",
    cancel: "Ghairi",
    confirm: "Thibitisha",
    save: "Hifadhi",
    delete: "Futa",
    edit: "Hariri",
    view: "Tazama",
    search: "Tafuta",
    filter: "Chuja",
    clear: "Futa",
    close: "Funga",
    open: "Fungua",
    fee: "Ada",
  },
  en: {
    submit: "Submit",
    submitting: "Submitting...",
    next: "Next",
    back: "Back",
    required: "Required field",
    optional: "Optional",
    yes: "Yes",
    no: "No",
    select: "Select",
    selectOption: "Select an option",
    loading: "Loading...",
    error: "Error",
    success: "Success",
    cancel: "Cancel",
    confirm: "Confirm",
    save: "Save",
    delete: "Delete",
    edit: "Edit",
    view: "View",
    search: "Search",
    filter: "Filter",
    clear: "Clear",
    close: "Close",
    open: "Open",
    fee: "Fee",
  },
};
