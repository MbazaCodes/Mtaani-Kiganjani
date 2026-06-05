import React, { useEffect } from "react";
import { BrowserRouter, Routes, Route, Navigate, useNavigate } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { Check, Eye, EyeOff, Loader2, Lock, User as UserIcon } from "lucide-react";

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
import { DepartmentManagement } from "./pages/admin/DepartmentManagement";
import { DepartmentPortal } from "./pages/department/DepartmentPortal";
import { CitizenSupport } from "./pages/CitizenSupport";
import { StaffTicketInbox } from "./pages/staff/StaffTicketInbox";
import { CommunityReporting } from "./pages/CommunityReporting";
import { StaffReportsInbox } from "./pages/staff/StaffReportsInbox";
import { Announcements } from "./pages/Announcements";
import { MyPayments } from "./pages/MyPayments";
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
    <div className="min-h-screen bg-stone-50 flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <div className="w-12 h-12 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin" />
        <p className="text-stone-500 font-bold animate-pulse">E-MTAA PORTAL...</p>
      </div>
    </div>
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
function ApplicationsRoute() {
  const {
    applications,
    drafts,
    fetchApplications,
    handleInitiatePayment,
    setSelectedDraft,
    setSelectedService,
  } = useAppContext();
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

// Dashboard wrapper
function DashboardRoute() {
  const { applications, fetchApplications } = useAppContext();
  const { setView } = useRouterView();
  return <Dashboard applications={applications} setView={setView} onRefresh={fetchApplications} />;
}

// Services wrapper
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

// Admin routes with setView shim
function AdminDashboardRoute() {
  const { setView } = useRouterView();
  return <AdminDashboard setView={setView as (v: string) => void} />;
}

function StaffDashboardRoute() {
  const { setView } = useRouterView();
  return <StaffDashboard setView={setView as (v: string) => void} />;
}

// Citizens route (admin sees admin version, staff sees staff version)
function CitizensRoute() {
  const { user } = useAuth();
  if (user?.role === "admin") return <CitizenManagement />;
  if (user?.role === "staff") return <StaffCitizenManagement />;
  return null;
}

// Page transition wrapper
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
      // Update password in Supabase Auth
      const { createClient } = await import("@supabase/supabase-js");
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
      const supabaseKey = (import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
        import.meta.env.VITE_SUPABASE_ANON_KEY) as string;
      const sb = createClient(supabaseUrl, supabaseKey);

      const { error: pwdError } = await sb.auth.updateUser({ password: newPwd });
      if (pwdError) throw pwdError;

      // Mark account as verified
      if (user?.id) {
        await sb
          .from("users")
          .update({ is_verified: true, account_status: "active" })
          .eq("id", user.id);
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
            path="/payments"
            element={
              <ProtectedRoute allowedRoles={["citizen", "staff", "admin"]}>
                <AppShell>
                  <MyPayments />
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
          <Route path="/confirm" element={<EmailConfirm />} />

          {/* Fallback */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </AppProvider>
    </BrowserRouter>
  );
}
