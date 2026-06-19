import { useEffect, useState, type ComponentType } from "react";
import { AppSplashSkeleton } from "@/components/ui/SkeletonScreens";

type AppShape = ComponentType<Record<string, never>>;

export function ClonedApp() {
  const [mods, setMods] = useState<null | {
    App: AppShape;
    LanguageProvider: ComponentType<{ children: React.ReactNode }>;
    AuthProvider: ComponentType<{ children: React.ReactNode }>;
    ToastProvider: ComponentType<{ children: React.ReactNode }>;
  }>(null);

  useEffect(() => {
    let cancelled = false;

    // PERF: Removed installBrowserPolyfills() waterfall.
    // The Buffer polyfill is ONLY needed by @react-pdf/renderer which is
    // already lazy-loaded. No need to block initial render for it.
    // Install it in the background without blocking the app shell.
    if (typeof window !== "undefined") {
      const w = window as unknown as { Buffer?: unknown; global?: Window };
      if (!w.Buffer) {
        import("buffer/").then(({ Buffer }) => {
          w.Buffer = Buffer;
        }).catch(() => {});
      }
      w.global = window;
    }

    // PERF: All 4 module imports start in parallel immediately — no waterfall
    Promise.all([
      import("@/clone-app"),
      import("@/context/LanguageContext"),
      import("@/context/AuthContext"),
      import("@/context/ToastContext"),
    ]).then(([app, lang, auth, toast]) => {
      if (cancelled) return;
      setMods({
        App: app.default as AppShape,
        LanguageProvider: lang.LanguageProvider,
        AuthProvider: auth.AuthProvider,
        ToastProvider: toast.ToastProvider,
      });
    });

    return () => {
      cancelled = true;
    };
  }, []);

  if (!mods) {
    return (
      <AppSplashSkeleton />
    );
  }

  const { App, LanguageProvider, AuthProvider, ToastProvider } = mods;
  return (
    <LanguageProvider>
      <AuthProvider>
        <ToastProvider>
          <App />
        </ToastProvider>
      </AuthProvider>
    </LanguageProvider>
  );
}