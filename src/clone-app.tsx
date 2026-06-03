import React, { useEffect } from "react";
import { BrowserRouter, Routes, Route, Navigate, useNavigate } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";

import { useAuth } from "./context/AuthContext";
import { useLanguage } from "./context/LanguageContext";
import { AppProvider } from "./context/AppContext";
import { AppShell } from "./components/layout/AppShell";
import { ProtectedRoute } from "./components/layout/ProtectedRoute";

// Public pages
import { Landing } from "./pages/Landing";
import { NotFound } from "./pages/NotFound";
import { EmailConfirm } from "./pages/EmailConfirm";

// Citizen pages
import { Dashboard } from "./pages/Dashboard";
import { Services } from "./pages/Services";
import { Apply } from "./pages/Apply";
import { Applications } from "./pages/Applications";
import { Agreement } from "./pages/Agreement";
import { Notifications } from "./pages/Notifications";
import { Profile } from "./pages/Profile";
import { Auth } from "./pages/Auth";
import { VerifyDocuments } from "./components/VerifyDocuments";

// Admin pages
import { AdminDashboard } from "./pages/admin/AdminDashboard";
import { OfficeManagement } from "./pages/admin/OfficeManagement";
import { LocationManagement } from "./pages/admin/LocationManagement";
import { ServiceManagement } from "./pages/admin/ServiceManagement";
import { AdminLogs } from "./pages/admin/AdminLogs";
import { CitizenManagement } from "./pages/admin/CitizenManagement";

// Staff pages
import { StaffDashboard } from "./pages/staff/StaffDashboard";
import { CustomerSupport } from "./pages/staff/CustomerSupport";
import { ManualVerification } from "./pages/staff/ManualVerification";
import { StaffCitizenManagement } from "./pages/staff/CitizenManagement";
import { BusinessApproval } from "./pages/staff/BusinessApproval";

// Shared staff+admin
import { StaffManagement } from "./components/StaffManagement";
import { ApplicationReview } from "./components/ApplicationReview";

// Apply page needs AppContext
import { useAppContext } from "./context/AppContext";
import { HARDCODED_SERVICES } from "./constants/services";
import { useRouterView } from "./components/layout/AppShell";

// ─── Authenticated root: redirects to role-based home ─────────────────────────
function AuthenticatedRoot() {
  const { user } = useAuth();
  if (!user) return <Navigate to="/" replace />;
  if (user.role === "admin") return <Navigate to="/admin" replace />;
  if (user.role === "staff") return <Navigate to="/staff" replace />;
  return <Navigate to="/dashboard" replace />;
}

// ─── Loading screen ────────────────────────────────────────────────────────────
function LoadingScreen() {
  return (
    <div className="min-h-screen bg-stone-50 flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <div className="w-12 h-12 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin" />
        <p className="text-stone-500 font-bold animate-pulse">E-MTAA PORTAL...</p>
      </div>
    </div>
  );
}

// ─── Public landing with auth modal ───────────────────────────────────────────
function PublicHome() {
  const { user, isLoading } = useAuth();
  const navigate = useNavigate();
  const [showAuth, setShowAuth] = React.useState(false);
  const [authMode, setAuthMode] = React.useState<"login" | "signup">("login");
  const [authDiaspora, setAuthDiaspora] = React.useState(false);

  useEffect(() => {
    if (!isLoading && user) {
      if (user.role === "admin") navigate("/admin", { replace: true });
      else if (user.role === "staff") navigate("/staff", { replace: true });
      else navigate("/dashboard", { replace: true });
    }
  }, [user, isLoading, navigate]);

  if (isLoading) return <LoadingScreen />;
  if (user) return null; // redirecting

  return (
    <>
      <Landing
        onShowAuth={(mode, isDiaspora) => {
          setAuthMode(mode);
          setAuthDiaspora(!!isDiaspora);
          setShowAuth(true);
        }}
        onShowVerify={() => navigate("/verify")}
      />
      <AnimatePresence>
        {showAuth && (
          <Auth
            mode={authMode}
            onClose={() => {
              setShowAuth(false);
              setAuthDiaspora(false);
            }}
            setMode={setAuthMode}
            isDiaspora={authDiaspora}
          />
        )}
      </AnimatePresence>
    </>
  );
}

// ─── Apply page wrapper (needs AppContext state) ───────────────────────────────
function ApplyRoute() {
  const { selectedService, selectedDraft, submitApplication, setSelectedDraft } = useAppContext();
  const { setView } = useRouterView();
  const { lang } = useLanguage();

  if (!selectedService) return <Navigate to="/services" replace />;

  return (
    <Apply
      selectedService={selectedService}
      onBack={() => {
        setSelectedDraft(null);
        setView("services");
      }}
      onSubmit={async (formData) => {
        await submitApplication(formData as import("./types").AnyFormData);
        setView("applications");
      }}
      draft={selectedDraft}
    />
  );
}

// ─── Applications page wrapper ─────────────────────────────────────────────────
function ApplicationsRoute() {
  const {
    applications,
    drafts,
    fetchApplications,
    handleInitiatePayment,
    setSelectedDraft,
    setSelectedService,
  } = useAppContext();
  const { setView } = useRouterView();
  const navigate = useNavigate();

  return (
    <Applications
      applications={applications}
      drafts={drafts}
      onPay={handleInitiatePayment}
      onRefresh={fetchApplications}
      onResumeDraft={(draft) => {
        setSelectedDraft(draft);
        const realService = HARDCODED_SERVICES.find((s) => s.id === draft.service_id);
        setSelectedService(
          realService ?? {
            id: draft.service_id,
            name: draft.service_name,
            name_en: draft.service_name,
            description: "",
            fee: 0,
            form_schema: [],
            active: true,
            created_at: new Date().toISOString(),
          },
        );
        navigate("/apply");
      }}
    />
  );
}

// ─── Dashboard wrapper ─────────────────────────────────────────────────────────
function DashboardRoute() {
  const { applications, fetchApplications } = useAppContext();
  const { setView } = useRouterView();
  return <Dashboard applications={applications} setView={setView} onRefresh={fetchApplications} />;
}

// ─── Services wrapper ──────────────────────────────────────────────────────────
function ServicesRoute() {
  const { setSelectedService, fetchApplications } = useAppContext();
  const navigate = useNavigate();
  return (
    <Services
      onSelectService={(service) => {
        setSelectedService(service);
        navigate("/apply");
      }}
      onRefresh={fetchApplications}
    />
  );
}

// ─── Admin routes with setView shim ───────────────────────────────────────────
function AdminDashboardRoute() {
  const { setView } = useRouterView();
  return <AdminDashboard setView={setView as (v: string) => void} />;
}

function StaffDashboardRoute() {
  const { setView } = useRouterView();
  return <StaffDashboard setView={setView as (v: string) => void} />;
}

// ─── Citizens route (admin sees admin version, staff sees staff version) ────────
function CitizensRoute() {
  const { user } = useAuth();
  if (user?.role === "admin") return <CitizenManagement />;
  if (user?.role === "staff") return <StaffCitizenManagement />;
  return null;
}

// ─── Page transition wrapper ───────────────────────────────────────────────────
const PageTransition: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <motion.div
    initial={{ opacity: 0, x: 16 }}
    animate={{ opacity: 1, x: 0 }}
    exit={{ opacity: 0, x: -16 }}
    transition={{ duration: 0.18 }}
  >
    {children}
  </motion.div>
);

// ─── Main router ───────────────────────────────────────────────────────────────
export default function App() {
  const { isLoading } = useAuth();
  const { lang } = useLanguage();

  if (isLoading) return <LoadingScreen />;

  return (
    <BrowserRouter>
      <AppProvider>
        <Routes>
          {/* Public */}
          <Route path="/" element={<PublicHome />} />
          <Route
            path="/verify"
            element={
              <div className="min-h-screen bg-stone-50">
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="py-8 px-4 max-w-5xl mx-auto"
                >
                  <VerifyDocuments
                    lang={lang}
                    onBack={() => window.history.back()}
                    userRole="citizen"
                  />
                </motion.div>
              </div>
            }
          />

          {/* Authenticated root — redirects by role */}
          <Route
            path="/app"
            element={
              <ProtectedRoute>
                <AuthenticatedRoot />
              </ProtectedRoute>
            }
          />

          {/* Citizen routes */}
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute allowedRoles={["citizen"]}>
                <AppShell>
                  <PageTransition>
                    <DashboardRoute />
                  </PageTransition>
                </AppShell>
              </ProtectedRoute>
            }
          />
          <Route
            path="/services"
            element={
              <ProtectedRoute allowedRoles={["citizen"]}>
                <AppShell>
                  <PageTransition>
                    <ServicesRoute />
                  </PageTransition>
                </AppShell>
              </ProtectedRoute>
            }
          />
          <Route
            path="/apply"
            element={
              <ProtectedRoute allowedRoles={["citizen"]}>
                <AppShell>
                  <PageTransition>
                    <ApplyRoute />
                  </PageTransition>
                </AppShell>
              </ProtectedRoute>
            }
          />
          <Route
            path="/applications"
            element={
              <ProtectedRoute allowedRoles={["citizen"]}>
                <AppShell>
                  <PageTransition>
                    <ApplicationsRoute />
                  </PageTransition>
                </AppShell>
              </ProtectedRoute>
            }
          />
          <Route
            path="/profile"
            element={
              <ProtectedRoute>
                <AppShell>
                  <PageTransition>
                    <Profile />
                  </PageTransition>
                </AppShell>
              </ProtectedRoute>
            }
          />
          <Route
            path="/agreement"
            element={
              <ProtectedRoute allowedRoles={["citizen"]}>
                <AppShell>
                  <PageTransition>
                    <Agreement />
                  </PageTransition>
                </AppShell>
              </ProtectedRoute>
            }
          />
          <Route
            path="/notifications"
            element={
              <ProtectedRoute>
                <AppShell>
                  <PageTransition>
                    <Notifications />
                  </PageTransition>
                </AppShell>
              </ProtectedRoute>
            }
          />
          <Route
            path="/verify-docs"
            element={
              <ProtectedRoute>
                <AppShell>
                  <PageTransition>
                    <VerifyDocuments
                      lang={lang}
                      onBack={() => window.history.back()}
                      userRole="citizen"
                    />
                  </PageTransition>
                </AppShell>
              </ProtectedRoute>
            }
          />

          {/* Staff routes */}
          <Route
            path="/staff"
            element={
              <ProtectedRoute allowedRoles={["staff", "admin"]}>
                <AppShell>
                  <PageTransition>
                    <StaffDashboardRoute />
                  </PageTransition>
                </AppShell>
              </ProtectedRoute>
            }
          />
          <Route
            path="/staff/support"
            element={
              <ProtectedRoute allowedRoles={["staff", "admin"]}>
                <AppShell>
                  <PageTransition>
                    <CustomerSupport />
                  </PageTransition>
                </AppShell>
              </ProtectedRoute>
            }
          />
          <Route
            path="/staff/verification"
            element={
              <ProtectedRoute allowedRoles={["staff", "admin"]}>
                <AppShell>
                  <PageTransition>
                    <ManualVerification />
                  </PageTransition>
                </AppShell>
              </ProtectedRoute>
            }
          />
          <Route
            path="/staff/business"
            element={
              <ProtectedRoute allowedRoles={["staff", "admin"]}>
                <AppShell>
                  <PageTransition>
                    <BusinessApproval />
                  </PageTransition>
                </AppShell>
              </ProtectedRoute>
            }
          />
          <Route
            path="/staff/review"
            element={
              <ProtectedRoute allowedRoles={["staff", "admin"]}>
                <AppShell>
                  <PageTransition>
                    <ApplicationReview lang={lang} />
                  </PageTransition>
                </AppShell>
              </ProtectedRoute>
            }
          />

          {/* Admin routes */}
          <Route
            path="/admin"
            element={
              <ProtectedRoute allowedRoles={["admin"]}>
                <AppShell>
                  <PageTransition>
                    <AdminDashboardRoute />
                  </PageTransition>
                </AppShell>
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/offices"
            element={
              <ProtectedRoute allowedRoles={["admin"]}>
                <AppShell>
                  <PageTransition>
                    <OfficeManagement />
                  </PageTransition>
                </AppShell>
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/locations"
            element={
              <ProtectedRoute allowedRoles={["admin"]}>
                <AppShell>
                  <PageTransition>
                    <LocationManagement />
                  </PageTransition>
                </AppShell>
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/services"
            element={
              <ProtectedRoute allowedRoles={["admin"]}>
                <AppShell>
                  <PageTransition>
                    <ServiceManagement />
                  </PageTransition>
                </AppShell>
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/logs"
            element={
              <ProtectedRoute allowedRoles={["admin"]}>
                <AppShell>
                  <PageTransition>
                    <AdminLogs />
                  </PageTransition>
                </AppShell>
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/staff"
            element={
              <ProtectedRoute allowedRoles={["admin"]}>
                <AppShell>
                  <PageTransition>
                    <StaffManagement lang={lang} />
                  </PageTransition>
                </AppShell>
              </ProtectedRoute>
            }
          />

          {/* Shared: citizens — renders admin or staff version based on role */}
          <Route
            path="/citizens"
            element={
              <ProtectedRoute allowedRoles={["admin", "staff"]}>
                <AppShell>
                  <PageTransition>
                    <CitizensRoute />
                  </PageTransition>
                </AppShell>
              </ProtectedRoute>
            }
          />

          {/* Email confirmation redirect */}
          <Route path="/confirm" element={<EmailConfirm />} />

          {/* Fallback */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </AppProvider>
    </BrowserRouter>
  );
}
