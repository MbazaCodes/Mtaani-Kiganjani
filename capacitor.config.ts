import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "tz.go.e_serikali_mtaa",
  appName: "E-Serikali Mtaa",
  webDir: "dist",
  server: {
    androidScheme: "https",
    allowNavigation: ["*.supabase.co"],
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      backgroundColor: "#1c1917",
      showSpinner: false,
      splashFullScreen: true,
      splashImmersive: true,
    },
    StatusBar: {
      backgroundColor: "#1c1917",
      style: "LIGHT",
    },
  },
};

export default config;
