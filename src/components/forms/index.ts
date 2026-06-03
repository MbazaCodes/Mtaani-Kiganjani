/**
 * Forms Index
 *
 * Export all service-specific forms for easy import
 */

export * from "./types";

export { UtambulishoMkaziForm } from "./UtambulishoMkaziForm";
export { BaruaUtambulishoForm } from "./BaruaUtambulishoForm";
export { KibariMazishiForm } from "./KibariMazishiForm";
export { KibariShereheForm } from "./KibariShereheForm";
export { KibariUjeziMdogoForm } from "./KibariUjeziMdogoForm";
export { MakubalianoMauzianoForm } from "./MakubalianoMauzianoForm";
export { MakubalianoPangoForm } from "./MakubalianoPangoForm";
export { MalipoMichangoForm } from "./MalipoMichangoForm";
export { MgogoroMashauriForm } from "./MgogoroMashauriForm";

import { UtambulishoMkaziForm } from "./UtambulishoMkaziForm";
import { BaruaUtambulishoForm } from "./BaruaUtambulishoForm";
import { KibariMazishiForm } from "./KibariMazishiForm";
import { KibariShereheForm } from "./KibariShereheForm";
import { KibariUjeziMdogoForm } from "./KibariUjeziMdogoForm";
import { MakubalianoMauzianoForm } from "./MakubalianoMauzianoForm";
import { MakubalianoPangoForm } from "./MakubalianoPangoForm";
import { MalipoMichangoForm } from "./MalipoMichangoForm";
import { MgogoroMashauriForm } from "./MgogoroMashauriForm";
import React from "react";
import { FormProps } from "./types";

export const SERVICE_FORMS: Record<string, React.FC<FormProps>> = {
  "Utambulisho wa Mkazi": UtambulishoMkaziForm,
  "Kibari cha Mazishi": KibariMazishiForm,
  "Kibari cha Sherehe": KibariShereheForm,
  "Kibari cha Ujezi Mdogo": KibariUjeziMdogoForm,
  "Barua ya Utambulisho": BaruaUtambulishoForm,
  "Makubaliano ya Mauzo": MakubalianoMauzianoForm,
  "Makubaliano ya Pango": MakubalianoPangoForm,
  "Malipo na Michango": MalipoMichangoForm,
  "Migogoro na Mashauri": MgogoroMashauriForm,
};

export const getServiceForm = (serviceName: string): React.FC<FormProps> | null => {
  return SERVICE_FORMS[serviceName] || null;
};

export const hasServiceForm = (serviceName: string): boolean => {
  return serviceName in SERVICE_FORMS;
};
