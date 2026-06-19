import React, { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { AnimatePresence } from "framer-motion";
import { AlertCircle } from "lucide-react";
import { Header } from "@/components/layout/Header";
import { Sidebar } from "@/components/layout/Sidebar";
import { MobileNav } from "@/components/layout/MobileNav";
import { PaymentGateway } from "@/components/PaymentGateway";
import { useAuth } from "@/context/AuthContext";
import { HelpPage } from "@/pages/HelpPage";
import { LegalPage } from "@/pages/LegalPage";
import { AboutPage } from "@/pages/AboutPage";
import { ServiceCharterPage } from "@/pages/ServiceCharterPage";
import { SecurityPolicyPage } from "@/pages/SecurityPolicyPage";
import { useLanguage } from "@/context/LanguageContext";
import { useAppContext } from "@/context/AppContext";
import { IS_SUPABASE_CONFIGURED } from "@/lib/config";
import { getCurrencyForUser, type CurrencyCode } from "@/lib/currency";
import type { ViewName } from "@/types";

/** Maps ViewName → URL path */
export const VIEW_PATHS: Record<ViewName, string> = {
  dashboard: "/dashboard",
  services: "/services",
  apply: "/apply",
  applications: "/applications",
  notifications: "/notifications",
  profile: "/profile",
  verify_documents: "/verify-docs",
  agreement: "/agreement",
  staff_dashboard: "/staff",
  customer_support: "/staff/support",
  manual_verification: "/staff/verification",
  application_review: "/staff/review",
  staff_management: "/admin/staff",
  business_approval: "/staff/business",
  admin_dashboard: "/admin",
  office_management: "/admin/offices",
  location_management: "/admin/locations",
  service_management: "/admin/services",
  admin_logs: "/admin/logs",
  departments: "/admin/departments",
  department_portal: "/department",
  citizen_support: "/support",
  staff_tickets: "/staff/tickets",
  community_reports: "/reports",
  staff_reports: "/staff/reports",
  announcements: "/announcements",
  staff_announcements: "/staff/announcements",
  my_payments: "/payments",
  messages: "/messages",
  citizen_management: "/citizens",
  help_faq: "/help",
  legal: "/legal",
  about: "/about",
  service_charter: "/charter",
  security_policy: "/security",
};

/** Maps URL path → ViewName (reverse of VIEW_PATHS) */
export const PATH_VIEWS: Record<string, ViewName> = Object.fromEntries(
  Object.entries(VIEW_PATHS).map(([k, v]) => [v, k as ViewName]),
);

/** Hook that gives setView/currentView using the router */
export const useRouterView = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const currentView: ViewName = PATH_VIEWS[location.pathname] ?? "dashboard";
  const setView = (view: ViewName) => navigate(VIEW_PATHS[view]);
  return { currentView, setView };
};

interface AppShellProps {
  children: React.ReactNode;
}

export const AppShell: React.FC<AppShellProps> = ({ children }) => {
  const { user } = useAuth();
  const { lang, currency: currencyString } = useLanguage();
  const { payingApplication, handlePaymentSuccess, handleCancelPayment, getPaymentAmount } =
    useAppContext();
  const { currentView, setView } = useRouterView();
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);

  const currency: CurrencyCode = user
    ? getCurrencyForUser(user.is_diaspora, user.country_of_residence)
    : currencyString;

  return (
    <div className="min-h-screen bg-stone-50 flex flex-col">
      {!IS_SUPABASE_CONFIGURED && (
        <div className="bg-amber-50 border-b border-amber-200 px-6 py-3 flex items-center justify-center gap-3 text-amber-800 text-sm font-medium animate-fade-in">
          <AlertCircle size={18} className="text-amber-600 shrink-0" />
          <p>
            {lang === "sw"
              ? "Supabase haijasanidiwa. Tafadhali weka VITE_SUPABASE_URL na VITE_SUPABASE_ANON_KEY kwenye .env"
              : "Supabase is not configured. Please set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in .env"}
          </p>
        </div>
      )}

      <Header onMenuClick={() => setIsMobileNavOpen(true)} />

      <MobileNav
        isOpen={isMobileNavOpen}
        onClose={() => setIsMobileNavOpen(false)}
        currentView={currentView}
        setView={setView}
      />

      <div className="flex flex-1 overflow-hidden">
        <Sidebar currentView={currentView} setView={setView} />
        <main className="flex-1 overflow-y-auto p-3 sm:p-4 lg:p-6">
          {currentView === "help_faq" ? (
            <HelpPage lang={lang} />
          ) : currentView === "legal" ? (
            <LegalPage lang={lang} />
          ) : currentView === "about" ? (
            <AboutPage lang={lang} />
          ) : currentView === "service_charter" ? (
            <ServiceCharterPage lang={lang} />
          ) : currentView === "security_policy" ? (
            <SecurityPolicyPage lang={lang} />
          ) : (
            children
          )}
          {/* Demonstration disclaimer footer */}
          <footer className="mt-8 pt-4 border-t border-stone-200">
            <p className="text-center text-[11px] leading-relaxed text-stone-400 max-w-3xl mx-auto px-4">
              {lang === "sw"
                ? "Mfumo huu ni wa MAONYESHO pekee. Si mfumo rasmi wa serikali na haujaidhinishwa kwa matumizi rasmi. Nyaraka, malipo, na huduma zote ni za majaribio na hazina nguvu za kisheria."
                : "This system is for DEMONSTRATION purposes only. It is not an official government system and is not approved for official operation. All documents, payments, and services are for testing and carry no legal authority."}
            </p>
            <p className="text-center text-[10px] text-stone-300 mt-1">
              Mtaani Kiganjani · E-Mtaa · {new Date().getFullYear()}
            </p>
          </footer>
        </main>
      </div>

      <AnimatePresence>
        {payingApplication && (
          <PaymentGateway
            applicationId={payingApplication.id}
            amount={getPaymentAmount(payingApplication)}
            serviceName={payingApplication.service_name}
            applicationNumber={payingApplication.application_number}
            onSuccess={handlePaymentSuccess}
            onCancel={handleCancelPayment}
            onGoToApplications={() => setView("applications")}
            lang={lang}
            currency={currency}
          />
        )}
      </AnimatePresence>
    </div>
  );
};
