import { useEffect, useState, type ComponentType } from "react";

// Client-only polyfills required by some browser libs (e.g. @react-pdf/renderer)
async function installBrowserPolyfills() {
  if (typeof window === "undefined") return;
  const w = window as unknown as { Buffer?: unknown; global?: Window };
  if (!w.Buffer) {
    const { Buffer } = await import("buffer/");
    w.Buffer = Buffer;
  }
  w.global = window;
  if (typeof crypto !== "undefined" && !crypto.randomUUID) {
    (
      crypto as Crypto & { randomUUID: () => `${string}-${string}-${string}-${string}-${string}` }
    ).randomUUID = function () {
      return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
        const r = (Math.random() * 16) | 0;
        const v = c === "x" ? r : (r & 0x3) | 0x8;
        return v.toString(16);
      }) as `${string}-${string}-${string}-${string}-${string}`;
    };
  }
}

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
    installBrowserPolyfills().then(() =>
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
      }),
    );
    return () => {
      cancelled = true;
    };
  }, []);

  if (!mods) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-stone-50">
        <div className="w-12 h-12 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin" />
      </div>
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
