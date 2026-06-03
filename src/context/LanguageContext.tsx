import React, { createContext, useContext, useState, useEffect } from "react";

type Language = "en" | "sw";
type CurrencyCode = "TZS" | "USD" | "EUR" | "GBP";

interface LanguageContextType {
  lang: Language;
  setLang: (lang: Language) => void;
  t: (key: string) => string;
  currency: CurrencyCode; // Change from string to CurrencyCode
}

const translations: Record<Language, Record<string, string>> = {
  en: {
    // App
    "app.name": "E-MTAA Portal",
    "app.tagline": "Digital Government Services",
    "app.welcome": "Welcome to E-MTAA",
    "app.description": "Your digital gateway to government services",

    // Navigation
    "nav.home": "Home",
    "nav.services": "Services",
    "nav.applications": "Applications",
    "nav.myApplications": "My Applications",
    "nav.profile": "Profile",
    "nav.dashboard": "Dashboard",
    "nav.logout": "Logout",
    "nav.login": "Login",
    "nav.signup": "Sign Up",
    "nav.forgotPassword": "Forgot Password?",
    "nav.admin": "Admin Panel",
    "nav.staff": "Staff Panel",

    // Auth
    "auth.email": "Email",
    "auth.password": "Password",
    "auth.confirmPassword": "Confirm Password",
    "auth.phoneNumber": "Phone Number",
    "auth.firstName": "First Name",
    "auth.lastName": "Last Name",
    "auth.signIn": "Sign In",
    "auth.signUp": "Sign Up",
    "auth.dontHaveAccount": "Don't have an account?",
    "auth.alreadyHaveAccount": "Already have an account?",
    "auth.rememberMe": "Remember me",
    "auth.invalidCredentials": "Incorrect email or password",
    "auth.emailNotConfirmed": "Your email is not confirmed yet. Please check your inbox.",
    "auth.passwordMismatch": "Passwords do not match",
    "auth.success": "Login successful!",
    "auth.signupSuccess": "Signup successful! Please check your email for confirmation.",
    "auth.passwordReset": "Password reset successfully!",
    "auth.resetPassword": "Reset Password",
    "auth.verifyIdentity": "Verify Identity",
    "auth.verifyEmail": "Verify Email",
    "auth.nidaNumber": "NIDA Number",
    "auth.newPassword": "New Password",
    "auth.confirmNewPassword": "Confirm New Password",

    // Errors
    "error.notConfigured": "Backend is not configured. Please check the project settings.",
    "error.cannotReachServer":
      "The sign-in service did not respond in time. Please try again in a moment.",
    "error.invalidApiKey": "Configuration error: invalid backend key.",
    "error.failed": "Operation failed. Please try again.",
    "error.tryAgain": "Please try again.",

    // Dashboard
    "dashboard.title": "Dashboard",
    "dashboard.welcome": "Welcome",
    "dashboard.recentApplications": "Recent Applications",
    "dashboard.totalApplications": "Total Applications",
    "dashboard.status": "Status",
    "dashboard.submittedDate": "Submitted Date",
    "dashboard.progress": "Progress",
    "dashboard.noApplications": "No applications yet",
    "dashboard.startNewApplication": "Start a new application",

    // Services
    "services.title": "Services",
    "services.allServices": "All Services",
    "services.availableServices": "Available Services",
    "services.selectService": "Select a service to continue",
    "services.fee": "Fee",
    "services.applyNow": "Apply Now",
    "services.learnMore": "Learn More",
    "services.duration": "Processing Time",
    "services.documents": "Required Documents",

    // Applications
    "applications.title": "My Applications",
    "applications.allApplications": "All Applications",
    "applications.approved": "Approved",
    "applications.rejected": "Rejected",
    "applications.pending": "Pending",
    "applications.paid": "Paid",
    "applications.submitted": "Submitted",
    "applications.inProgress": "In Progress",
    "applications.viewDetails": "View Details",
    "applications.download": "Download",
    "applications.pay": "Pay",
    "applications.cancel": "Cancel",
    "applications.empty": "No applications found",

    // Profile
    "profile.title": "My Profile",
    "profile.personalInfo": "Personal Information",
    "profile.editProfile": "Edit Profile",
    "profile.changePassword": "Change Password",
    "profile.phoneNumber": "Phone Number",
    "profile.nationality": "Nationality",
    "profile.address": "Address",
    "profile.region": "Region",
    "profile.district": "District",
    "profile.ward": "Ward",
    "profile.street": "Street",
    "profile.verified": "Verified",
    "profile.notVerified": "Not Verified",
    "profile.save": "Save Changes",
    "profile.saved": "Profile updated successfully",

    // Admin
    "admin.title": "Admin Dashboard",
    "admin.overview": "Overview",
    "admin.analytics": "Analytics",
    "admin.reports": "Reports",
    "admin.totalUsers": "Total Users",
    "admin.totalCitizens": "Total Citizens",
    "admin.totalStaff": "Total Staff",
    "admin.totalAdmins": "Total Admins",
    "admin.verifiedUsers": "Verified Users",
    "admin.pendingVerification": "Pending Verification",
    "admin.totalApplications": "Total Applications",
    "admin.approvedApplications": "Approved Applications",
    "admin.pendingApplications": "Pending Applications",
    "admin.rejectedApplications": "Rejected Applications",
    "admin.totalRevenue": "Total Revenue",
    "admin.todayRevenue": "Today Revenue",
    "admin.monthlyRevenue": "Monthly Revenue",
    "admin.locations": "Locations",
    "admin.regions": "Regions",
    "admin.districts": "Districts",
    "admin.wards": "Wards",
    "admin.streets": "Streets",
    "admin.uptime": "System Uptime",
    "admin.activeSessions": "Active Sessions",
    "admin.responseTime": "Avg Response Time",
    "admin.manageUsers": "Manage Users",
    "admin.manageServices": "Manage Services",
    "admin.manageLocations": "Manage Locations",
    "admin.viewLogs": "View Logs",

    // Common
    "common.save": "Save",
    "common.cancel": "Cancel",
    "common.delete": "Delete",
    "common.edit": "Edit",
    "common.back": "Back",
    "common.next": "Next",
    "common.previous": "Previous",
    "common.submit": "Submit",
    "common.search": "Search",
    "common.filter": "Filter",
    "common.loading": "Loading...",
    "common.error": "Error",
    "common.success": "Success",
    "common.warning": "Warning",
    "common.info": "Information",
    "common.noData": "No data found",
    "common.refresh": "Refresh",
    "common.export": "Export",
    "common.import": "Import",
  },
  sw: {
    // App
    "app.name": "Lango la E-MTAA",
    "app.tagline": "Huduma za Kiserikali za Kidijitali",
    "app.welcome": "Karibu kwenye E-MTAA",
    "app.description": "Mlango wako wa dijitali wa huduma za serikali",

    // Navigation
    "nav.home": "Nyumbani",
    "nav.services": "Huduma",
    "nav.applications": "Maombi",
    "nav.myApplications": "Maombi Yangu",
    "nav.profile": "Wasifu",
    "nav.dashboard": "Dashibodi",
    "nav.logout": "Toka",
    "nav.login": "Ingia",
    "nav.signup": "Jisajili",
    "nav.forgotPassword": "Umesahau Nywila?",
    "nav.admin": "Paneli ya Msimamizi",
    "nav.staff": "Paneli ya Wafanyakazi",

    // Auth
    "auth.email": "Barua Pepe",
    "auth.password": "Nywila",
    "auth.confirmPassword": "Thibitisha Nywila",
    "auth.phoneNumber": "Namba ya Simu",
    "auth.firstName": "Jina la Kwanza",
    "auth.lastName": "Jina la Ukoo",
    "auth.signIn": "Ingia",
    "auth.signUp": "Jisajili",
    "auth.dontHaveAccount": "Hauna akaunti?",
    "auth.alreadyHaveAccount": "Tayari una akaunti?",
    "auth.rememberMe": "Nikumbuke",
    "auth.invalidCredentials": "Barua pepe au nywila si sahihi",
    "auth.emailNotConfirmed":
      "Barua pepe yako bado haijathibitishwa. Tafadhali kagua barua pepe yako.",
    "auth.passwordMismatch": "Nywila hazifanani",
    "auth.success": "Umeingia kikamilifu!",
    "auth.signupSuccess": "Usajili umekamilika! Tafadhali kagua barua pepe yako kwa uthibitisho.",
    "auth.passwordReset": "Nywila imebadilishwa kikamilifu!",
    "auth.resetPassword": "Rudisha Nywila",
    "auth.verifyIdentity": "Thibitisha Utambulisho",
    "auth.verifyEmail": "Thibitisha Barua Pepe",
    "auth.nidaNumber": "Namba ya NIDA",
    "auth.newPassword": "Nywila Mpya",
    "auth.confirmNewPassword": "Thibitisha Nywila Mpya",

    // Errors
    "error.notConfigured": "Backend haijasanidiwa. Tafadhali kagua mipangilio ya mradi.",
    "error.cannotReachServer":
      "Huduma ya kuingia haikujibu kwa wakati. Tafadhali jaribu tena baada ya muda mfupi.",
    "error.invalidApiKey": "Hitilafu ya usanidi: ufunguo wa backend si sahihi.",
    "error.failed": "Operesheni haikufaulu. Tafadhali jaribu tena.",
    "error.tryAgain": "Tafadhali jaribu tena.",

    // Dashboard
    "dashboard.title": "Dashibodi",
    "dashboard.welcome": "Karibu",
    "dashboard.recentApplications": "Maombi ya Karibuni",
    "dashboard.totalApplications": "Maombi Yote",
    "dashboard.status": "Hali",
    "dashboard.submittedDate": "Tarehe ya Kuwasilisha",
    "dashboard.progress": "Mwendelezo",
    "dashboard.noApplications": "Hamna maombi bado",
    "dashboard.startNewApplication": "Anza ombi jipya",

    // Services
    "services.title": "Huduma",
    "services.allServices": "Huduma Zote",
    "services.availableServices": "Huduma Inayopatikana",
    "services.selectService": "Chagua huduma kuendelea",
    "services.fee": "Leseni",
    "services.applyNow": "Omba Sasa",
    "services.learnMore": "Jifunze Zaidi",
    "services.duration": "Muda wa Uprosessing",
    "services.documents": "Hati Zinazohitajika",

    // Applications
    "applications.title": "Maombi Yangu",
    "applications.allApplications": "Maombi Yote",
    "applications.approved": "Yameidhinishwa",
    "applications.rejected": "Yamerasiwa",
    "applications.pending": "Inasubiri",
    "applications.paid": "Iliyolipiwa",
    "applications.submitted": "Imewasilishwa",
    "applications.inProgress": "Inaendelea",
    "applications.viewDetails": "Angalia Maelezo",
    "applications.download": "Pakua",
    "applications.pay": "Lipa",
    "applications.cancel": "Ghairi",
    "applications.empty": "Hamna maombi yaliyopatikana",

    // Profile
    "profile.title": "Wasifu Wangu",
    "profile.personalInfo": "Taarifa Binafsi",
    "profile.editProfile": "Hariri Wasifu",
    "profile.changePassword": "Badilisha Nywila",
    "profile.phoneNumber": "Namba ya Simu",
    "profile.nationality": "Uraia",
    "profile.address": "Anwani",
    "profile.region": "Mkoa",
    "profile.district": "Wilaya",
    "profile.ward": "Kata",
    "profile.street": "Barabara",
    "profile.verified": "Imethibitishwa",
    "profile.notVerified": "Haijathibitishwa",
    "profile.save": "Hifadhi Mabadiliko",
    "profile.saved": "Wasifu umebadilishwa kikamilifu",

    // Admin
    "admin.title": "Dashibodi ya Msimamizi",
    "admin.overview": "Muhtasari",
    "admin.analytics": "Uchambuzi",
    "admin.reports": "Ripoti",
    "admin.totalUsers": "Watumiaji Wote",
    "admin.totalCitizens": "Raia Wote",
    "admin.totalStaff": "Wafanyakazi Wote",
    "admin.totalAdmins": "Wasimamiaji Wote",
    "admin.verifiedUsers": "Watumiaji Wanachothibitishwa",
    "admin.pendingVerification": "Insubiri Uthibitisho",
    "admin.totalApplications": "Maombi Yote",
    "admin.approvedApplications": "Maombi Yameidhinishwa",
    "admin.pendingApplications": "Maombi Inasubira",
    "admin.rejectedApplications": "Maombi Yamerasiwa",
    "admin.totalRevenue": "Matakwimu Yote",
    "admin.todayRevenue": "Matakwimu ya Leo",
    "admin.monthlyRevenue": "Matakwimu ya Mwezi",
    "admin.locations": "Mahali",
    "admin.regions": "Maeneo",
    "admin.districts": "Wilaya",
    "admin.wards": "Kata",
    "admin.streets": "Barabara",
    "admin.uptime": "Wakati wa Uendeshaji wa Mfumo",
    "admin.activeSessions": "Vikao Vinavyofanya Kazi",
    "admin.responseTime": "Wastani wa Wakati wa Jibu",
    "admin.manageUsers": "Simamia Watumiaji",
    "admin.manageServices": "Simamia Huduma",
    "admin.manageLocations": "Simamia Mahali",
    "admin.viewLogs": "Tazama Zibezi",

    // Common
    "common.save": "Hifadhi",
    "common.cancel": "Ghairi",
    "common.delete": "Futa",
    "common.edit": "Hariri",
    "common.back": "Nyuma",
    "common.next": "Ifuatayo",
    "common.previous": "Iliyotangulia",
    "common.submit": "Wasilisha",
    "common.search": "Tafuta",
    "common.filter": "Chujia",
    "common.loading": "Inapakia...",
    "common.error": "Hitilafu",
    "common.success": "Mafanikio",
    "common.warning": "Onyo",
    "common.info": "Taarifa",
    "common.noData": "Hakuna data iliyopatikana",
    "common.refresh": "Onyesha Tena",
    "common.export": "Hamisha",
    "common.import": "Ingiza",
  },
};

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [lang, setLang] = useState<Language>(() => {
    const saved = localStorage.getItem("language") as Language;
    return saved && (saved === "en" || saved === "sw") ? saved : "en";
  });

  useEffect(() => {
    localStorage.setItem("language", lang);
    document.documentElement.lang = lang;
  }, [lang]);

  const t = (key: string): string => {
    return translations[lang][key] || key;
  };

  // Return proper CurrencyCode type
  const currency: CurrencyCode = "TZS";

  return (
    <LanguageContext.Provider value={{ lang, setLang, t, currency }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error("useLanguage must be used within LanguageProvider");
  }
  return context;
};
