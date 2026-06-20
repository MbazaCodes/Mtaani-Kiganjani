import React, { useEffect, useState } from "react";
import { BrowserRouter, Routes, Route, Navigate, useNavigate } from "react-router-dom";
import { Check, Eye, EyeOff, Loader2, Lock, User as UserIcon } from "lucide-react";

import { useAuth } from "./context/AuthContext";
import { supabase } from "./lib/supabase";
import { useLanguage } from "./context/LanguageContext";
import { AppProvider } from "./context/AppContext";
import { AppShell } from "./components/layout/AppShell";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { SessionTimeout } from "./components/SessionTimeout";
import { ProtectedRoute } from "./components/layout/ProtectedRoute";

// Public pages
const Landing = React.lazy(() => import("./pages/Landing").then(m => ({ default: m.Landing })));
const NotFound = React.lazy(() => import("./pages/NotFound").then(m => ({ default: m.NotFound })));
const MachapishoPage = React.lazy(() => import("./pages/MachapishoPage").then(m => ({ default: m.MachapishoPage })));
const KituoChaHabariPage = React.lazy(() => import("./pages/KituoChaHabariPage").then(m => ({ default: m.KituoChaHabariPage })));
const HelpPage = React.lazy(() => import("./pages/HelpPage").then(m => ({ default: m.HelpPage })));
const LegalPage = React.lazy(() => import("./pages/LegalPage").then(m => ({ default: m.LegalPage })));
const EmailConfirm = React.lazy(() => import("./pages/EmailConfirm").then(m => ({ default: m.EmailConfirm })));

// Citizen pages
const Dashboard = React.lazy(() => import("./pages/Dashboard").then(m => ({ default: m.Dashboard })));
const Services = React.lazy(() => import("./pages/Services").then(m => ({ default: m.Services })));
const Apply = React.lazy(() => import("./pages/Apply").then(m => ({ default: m.Apply })));
const Applications = React.lazy(() => import("./pages/Applications").then(m => ({ default: m.Applications })));
const Agreement = React.lazy(() => import("./pages/Agreement").then(m => ({ default: m.Agreement })));
const Notifications = React.lazy(() => import("./pages/Notifications").then(m => ({ default: m.Notifications })));
const Profile = React.lazy(() => import("./pages/Profile").then(m => ({ default: m.Profile })));
const Auth = React.lazy(() => import("./pages/Auth").then(m => ({ default: m.Auth })));
const VerifyDocuments = React.lazy(() => import("./components/VerifyDocuments").then(m => ({ default: m.VerifyDocuments })));

// Admin pages
const AdminDashboard = React.lazy(() => import("./pages/admin/AdminDashboard").then(m => ({ default: m.AdminDashboard })));
const OfficeManagement = React.lazy(() => import("./pages/admin/OfficeManagement").then(m => ({ default: m.OfficeManagement })));
const LocationManagement = React.lazy(() => import("./pages/admin/LocationManagement").then(m => ({ default: m.LocationManagement })));
const ServiceManagement = React.lazy(() => import("./pages/admin/ServiceManagement").then(m => ({ default: m.ServiceManagement })));
const AdminLogs = React.lazy(() => import("./pages/admin/AdminLogs").then(m => ({ default: m.AdminLogs })));
const DepartmentManagement = React.lazy(() => import("./pages/admin/DepartmentManagement").then(m => ({ default: m.DepartmentManagement })));
const DepartmentPortal = React.lazy(() => import("./pages/department/DepartmentPortal").then(m => ({ default: m.DepartmentPortal })));
const CitizenSupport = React.lazy(() => import("./pages/CitizenSupport").then(m => ({ default: m.CitizenSupport })));
const StaffTicketInbox = React.lazy(() => import("./pages/staff/StaffTicketInbox").then(m => ({ default: m.StaffTicketInbox })));
const CommunityReporting = React.lazy(() => import("./pages/CommunityReporting").then(m => ({ default: m.CommunityReporting })));
const StaffReportsInbox = React.lazy(() => import("./pages/staff/StaffReportsInbox").then(m => ({ default: m.StaffReportsInbox })));
const Announcements = React.lazy(() => import("./pages/Announcements").then(m => ({ default: m.Announcements })));
const MyPayments = React.lazy(() => import("./pages/MyPayments").then(m => ({ default: m.MyPayments })));
const CommunicationsCenter = React.lazy(() => import("./pages/CommunicationsCenter").then(m => ({ default: m.CommunicationsCenter })));
const CitizenManagement = React.lazy(() => import("./pages/admin/CitizenManagement").then(m => ({ default: m.CitizenManagement })));

// Staff pages
const StaffDashboard = React.lazy(() => import("./pages/staff/StaffDashboard").then(m => ({ default: m.StaffDashboard })));
const CustomerSupport = React.lazy(() => import("./pages/staff/CustomerSupport").then(m => ({ default: m.CustomerSupport })));
const ManualVerification = React.lazy(() => import("./pages/staff/ManualVerification").then(m => ({ default: m.ManualVerification })));
const StaffCitizenManagement = React.lazy(() => import("./pages/staff/CitizenManagement").then(m => ({ default: m.StaffCitizenManagement })));
const BusinessApproval = React.lazy(() => import("./pages/staff/BusinessApproval").then(m => ({ default: m.BusinessApproval })));

// Shared staff+admin
const StaffManagement = React.lazy(() => import("./components/StaffManagement").then(m => ({ default: m.StaffManagement })));
const ApplicationReview = React.lazy(() => import("./components/ApplicationReview").then(m => ({ default: m.ApplicationReview })));

// Apply page needs AppContext
import { useAppContext } from "./context/AppContext";
import { useRouterView } from "./components/layout/AppShell";

// Lazy-load heavy services data — only needed when viewing applications
let _HARDCODED_SERVICES: typeof import("./constants/services").HARDCODED_SERVICES | null = null;
function getHardcodedServices() {
  if (!_HARDCODED_SERVICES) {
    // Dynamic import cached after first load
    import("./constants/services").then(m => { _HARDCODED_SERVICES = m.HARDCODED_SERVICES; });
  }
  return _HARDCODED_SERVICES;
}
import {
  AppSplashSkeleton,
  DashboardSkeleton,
  ServicesSkeleton,
  ApplicationsSkeleton,
  StaffDashboardSkeleton,
  AdminDashboardSkeleton,
} from "./components/ui/SkeletonScreens";

// Authenticated root: redirects to role-based home
function AuthenticatedRoot() {
  const { user } = useAuth();
  if (!user) return <Navigate to="/" replace />;
  if (user.role === "admin") return <Navigate to="/admin" replace />;
  if (user.role === "staff") return <Navigate to="/staff" replace />;
  return <Navigate to="/dashboard" replace />;
}

// Loading screen
function LoadingScreen() {
  return (
    <AppSplashSkeleton />
  );
}

// Public landing with auth modal
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
      {showAuth && (
        <Auth
          mode={authMode}
          onClose={() => {
            setShowAuth(false);
            setAuthDiaspora(false);
          }}
          onSuccess={(role?: string) => {
            setShowAuth(false);
            setAuthDiaspora(false);
            if (role === "admin") navigate("/admin", { replace: true });
            else if (role === "staff") navigate("/staff", { replace: true });
            else navigate("/dashboard", { replace: true });
          }}
          setMode={setAuthMode}
          isDiaspora={authDiaspora}
        />
      )}
    </>
  );
}

// Apply page wrapper (needs AppContext state)
function ApplyRoute() {
  const { selectedService, selectedDraft, submitApplication, setSelectedDraft } = useAppContext();
  const { setView } = useRouterView();

  if (!selectedService) return <Navigate to="/services" replace />;

  return (
    <Apply
      selectedService={selectedService}
      onBack={() => {
        setSelectedDraft(null);
        setView("services");
      }}
      onSubmit={async (formData, files) => {
        await submitApplication(formData as import("./types").AnyFormData, files);
        setView("applications");
      }}
      draft={selectedDraft}
    />
  );
}

// Applications page wrapper
// Payments page wrapper with payment gateway wired
function MyPaymentsRoute() {
  const { handleInitiatePayment } = useAppContext();
  return <MyPayments onPay={handleInitiatePayment} />;
}

function ApplicationsRoute() {
  const {
    applications,
    drafts,
    fetchApplications,
    handleInitiatePayment,
    setSelectedDraft,
    setSelectedService,
    isLoading,
  } = useAppContext();
  if (isLoading) return <ApplicationsSkeleton />;
  const navigate = useNavigate();

  return (
    <Applications
      applications={applications}
      drafts={drafts}
      onPay={handleInitiatePayment}
      onRefresh={fetchApplications}
      onResumeDraft={(draft) => {
        setSelectedDraft(draft);
        const services = getHardcodedServices();
        const realService = services?.find((s) => s.id === draft.service_id);
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

// Dashboard wrapper
function DashboardRoute() {
  const { applications, fetchApplications, isLoading } = useAppContext();
  const { setView } = useRouterView();
  if (isLoading) return <DashboardSkeleton />;
  return <Dashboard applications={applications} setView={setView} onRefresh={fetchApplications} />;
}

// Services wrapper
function ServicesRoute() {
  const { setSelectedService, fetchApplications, isLoading } = useAppContext();
  const navigate = useNavigate();
  if (isLoading) return <ServicesSkeleton />;
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

// Admin routes with setView shim
function AdminDashboardRoute() {
  const { setView } = useRouterView();
  const { isLoading } = useAppContext();
  if (isLoading) return <AdminDashboardSkeleton />;
  return <AdminDashboard setView={setView as (v: string) => void} />;
}

function StaffDashboardRoute() {
  const { setView } = useRouterView();
  const { isLoading } = useAppContext();
  if (isLoading) return <StaffDashboardSkeleton />;
  return <StaffDashboard setView={setView as (v: string) => void} />;
}

// Citizens route (admin sees admin version, staff sees staff version)
function CitizensRoute() {
  const { user } = useAuth();
  if (user?.role === "admin") return <CitizenManagement />;
  if (user?.role === "staff") return <StaffCitizenManagement />;
  return null;
}

// Page transition wrapper — pure CSS, no framer-motion needed
const PageTransition: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="animate-[fade-in_0.15s_ease-out]">
    {children}
  </div>
);

// Main router

// Force password change for new staff accounts
function ForcePasswordChange() {
  const { user, refreshProfile, signOut } = useAuth();
  const { lang } = useLanguage();
  const [newPwd, setNewPwd] = React.useState("");
  const [confirmPwd, setConfirmPwd] = React.useState("");
  const [showPwd, setShowPwd] = React.useState(false);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (newPwd.length < 6) {
      setError(
        lang === "sw"
          ? "Nywila lazima iwe na herufi 6 au zaidi"
          : "Password must be at least 6 characters",
      );
      return;
    }
    if (newPwd !== confirmPwd) {
      setError(lang === "sw" ? "Nywila hazifanani" : "Passwords do not match");
      return;
    }

    setLoading(true);
    try {
      // Update password using the AUTHENTICATED client (has the user's session)
      const { error: pwdError } = await supabase.auth.updateUser({ password: newPwd });
      if (pwdError) throw pwdError;

      // Mark account as verified — must use the authenticated client so RLS
      // (auth.uid() = id) allows the update; a fresh anon client would be
      // blocked and the flag would never persist (causing the prompt to
      // reappear on every load).
      if (user?.id) {
        const { error: updErr } = await supabase
          .from("users")
          .update({ is_verified: true, account_status: "active" })
          .eq("id", user.id);
        if (updErr) throw updErr;
      }

      // Refresh profile so the gate lifts
      await refreshProfile();
    } catch (err: unknown) {
      const e = err as { message?: string };
      setError(e.message ?? "Failed to update password");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-stone-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-3xl shadow-xl overflow-hidden">
        {/* Header */}
        <div className="bg-emerald-600 px-8 py-7 text-center">
          <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center mx-auto mb-3">
            <Lock className="h-8 w-8 text-white" aria-hidden="true" />
          </div>
          <h1 className="text-xl font-black text-white">
            {lang === "sw" ? "Badilisha Nywila Yako" : "Change Your Password"}
          </h1>
          <p className="text-emerald-100 text-sm mt-1">
            {lang === "sw"
              ? "Karibu! Lazima ubadilishe nywila yako ya muda kabla ya kuendelea."
              : "Welcome! You must change your temporary password before continuing."}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="p-8 space-y-5">
          {/* Account info */}
          <div className="bg-stone-50 rounded-xl p-3 text-sm text-stone-600 flex items-center gap-2">
            <UserIcon className="h-4 w-4 shrink-0 text-stone-400" aria-hidden="true" />
            <span>
              <strong>
                {user?.first_name} {user?.last_name}
              </strong>{" "}
              &middot; {user?.email}
            </span>
          </div>

          {/* New password */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-stone-500 uppercase tracking-wider">
              {lang === "sw" ? "Nywila Mpya" : "New Password"}
            </label>
            <div className="relative">
              <input
                required
                type={showPwd ? "text" : "password"}
                className="w-full h-12 px-4 pr-10 rounded-xl border border-stone-200 focus:border-emerald-500 outline-none transition-all"
                value={newPwd}
                onChange={(e) => {
                  setNewPwd(e.target.value);
                  setError("");
                }}
                placeholder={lang === "sw" ? "Angalau herufi 6" : "At least 6 characters"}
              />
              <button
                type="button"
                onClick={() => setShowPwd((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600"
                aria-label={showPwd ? "Hide password" : "Show password"}
              >
                {showPwd ? (
                  <EyeOff className="h-4 w-4" aria-hidden="true" />
                ) : (
                  <Eye className="h-4 w-4" aria-hidden="true" />
                )}
              </button>
            </div>
          </div>

          {/* Confirm password */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-stone-500 uppercase tracking-wider">
              {lang === "sw" ? "Thibitisha Nywila" : "Confirm Password"}
            </label>
            <input
              required
              type={showPwd ? "text" : "password"}
              className="w-full h-12 px-4 rounded-xl border border-stone-200 focus:border-emerald-500 outline-none transition-all"
              value={confirmPwd}
              onChange={(e) => {
                setConfirmPwd(e.target.value);
                setError("");
              }}
              placeholder={lang === "sw" ? "Rudia nywila mpya" : "Repeat new password"}
            />
          </div>

          {/* Error */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-sm text-red-600">
              {error}
            </div>
          )}

          {/* Strength hint */}
          {newPwd && (
            <p
              className={`text-xs font-medium ${newPwd.length >= 8 && /[A-Z]/.test(newPwd) && /[0-9]/.test(newPwd) ? "text-emerald-600" : "text-amber-600"}`}
            >
              {newPwd.length >= 8 && /[A-Z]/.test(newPwd) && /[0-9]/.test(newPwd)
                ? lang === "sw"
                  ? "Nywila imara"
                  : "Strong password"
                : lang === "sw"
                  ? "Ongeza namba na herufi kubwa kwa usalama zaidi"
                  : "Add numbers and uppercase for a stronger password"}
            </p>
          )}

          <button
            type="submit"
            disabled={loading || !newPwd || !confirmPwd}
            className="w-full h-14 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-2xl font-black text-base transition-all flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />{" "}
                {lang === "sw" ? "Inabadilisha..." : "Updating..."}
              </>
            ) : lang === "sw" ? (
              <>
                <Check className="h-4 w-4" aria-hidden="true" /> Badilisha na Ingia
              </>
            ) : (
              <>
                <Check className="h-4 w-4" aria-hidden="true" /> Change Password and Continue
              </>
            )}
          </button>

          <button
            type="button"
            onClick={signOut}
            className="w-full text-sm text-stone-400 hover:text-stone-600 transition-colors py-1"
          >
            {lang === "sw" ? "Toka mfumoni" : "Sign out instead"}
          </button>
        </form>
      </div>
    </div>
  );
}

export default function App() {
  const { isLoading, user } = useAuth();
  const { lang } = useLanguage();

  if (isLoading) return <LoadingScreen />;

  // New staff/admin accounts must change their temporary password before accessing the system
  const needsPasswordChange =
    user && (user.role === "staff" || user.role === "admin") && user.is_verified === false;

  if (needsPasswordChange) return <ForcePasswordChange />;

  return (
    <ErrorBoundary lang={lang}>
      <BrowserRouter>
        <AppProvider>
          <React.Suspense fallback={<AppSplashSkeleton />}>
          <Routes>
            {/* Public */}
            <Route path="/" element={<PublicHome />} />
            <Route
              path="/verify"
              element={
                <div className="min-h-screen bg-stone-50">
                  <div className="py-8 px-4 max-w-5xl mx-auto">
                    <VerifyDocuments
                      lang={lang}
                      onBack={() => window.history.back()}
                      userRole="citizen"
                    />
                  </div>
                </div>
              }
            />

            {/* Authenticated root: redirects by role */}
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
              path="/support"
              element={
                <ProtectedRoute allowedRoles={["citizen", "staff", "admin"]}>
                  <AppShell>
                    <CitizenSupport />
                  </AppShell>
                </ProtectedRoute>
              }
            />
            <Route
              path="/reports"
              element={
                <ProtectedRoute allowedRoles={["citizen", "staff", "admin"]}>
                  <AppShell>
                    <CommunityReporting />
                  </AppShell>
                </ProtectedRoute>
              }
            />
            <Route
              path="/messages"
              element={
                <ProtectedRoute allowedRoles={["citizen", "staff", "admin"]}>
                  <AppShell>
                    <CommunicationsCenter />
                  </AppShell>
                </ProtectedRoute>
              }
            />
            <Route
              path="/payments"
              element={
                <ProtectedRoute allowedRoles={["citizen", "staff", "admin"]}>
                  <AppShell>
                    <MyPaymentsRoute />
                  </AppShell>
                </ProtectedRoute>
              }
            />
            <Route
              path="/announcements"
              element={
                <ProtectedRoute allowedRoles={["citizen", "staff", "admin"]}>
                  <AppShell>
                    <Announcements />
                  </AppShell>
                </ProtectedRoute>
              }
            />
            <Route
              path="/staff/announcements"
              element={
                <ProtectedRoute allowedRoles={["staff", "admin"]}>
                  <AppShell>
                    <Announcements isStaff />
                  </AppShell>
                </ProtectedRoute>
              }
            />
            <Route
              path="/staff/reports"
              element={
                <ProtectedRoute allowedRoles={["staff", "admin"]}>
                  <AppShell>
                    <StaffReportsInbox />
                  </AppShell>
                </ProtectedRoute>
              }
            />
            <Route
              path="/staff/tickets"
              element={
                <ProtectedRoute allowedRoles={["staff", "admin"]}>
                  <AppShell>
                    <StaffTicketInbox />
                  </AppShell>
                </ProtectedRoute>
              }
            />
            <Route
              path="/department"
              element={
                <ProtectedRoute allowedRoles={["staff", "admin"]}>
                  <AppShell>
                    <DepartmentPortal />
                  </AppShell>
                </ProtectedRoute>
              }
            />
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
              path="/admin/departments"
              element={
                <ProtectedRoute allowedRoles={["admin"]}>
                  <AppShell>
                    <DepartmentManagement />
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

            {/* Shared: citizens: renders admin or staff version based on role */}
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
            {/* Public info pages */}
            <Route path="/machapisho" element={
              <React.Suspense fallback={<AppSplashSkeleton />}>
                <MachapishoPage lang={lang} />
              </React.Suspense>
            } />
            <Route path="/habari" element={
              <React.Suspense fallback={<AppSplashSkeleton />}>
                <KituoChaHabariPage lang={lang} />
              </React.Suspense>
            } />
            <Route path="/confirm" element={<EmailConfirm />} />

            {/* Fallback */}
            <Route
              path="/help"
              element={
                <ProtectedRoute allowedRoles={["citizen", "staff", "admin"]}>
                  <AppShell>
                    <HelpPage lang={lang} />
                  </AppShell>
                </ProtectedRoute>
              }
            />
            <Route
              path="/legal"
              element={
                <ProtectedRoute allowedRoles={["citizen", "staff", "admin"]}>
                  <AppShell>
                    <LegalPage lang={lang} />
                  </AppShell>
                </ProtectedRoute>
              }
            />
            <Route path="*" element={<NotFound />} />
          </Routes>
          </React.Suspense>
        </AppProvider>
      </BrowserRouter>
      <SessionTimeout lang={lang} />
    </ErrorBoundary>
  );
}
