import { useState, useEffect, useCallback } from "react";

type Theme = "light" | "dark" | "system";

export function useDarkMode() {
  const [theme, setThemeState] = useState<Theme>(() => {
    try {
      return (localStorage.getItem("emtaa_theme") as Theme) || "system";
    } catch {
      return "system";
    }
  });

  const [isDark, setIsDark] = useState(false);

  const applyTheme = useCallback((t: Theme) => {
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    const dark = t === "dark" || (t === "system" && prefersDark);
    setIsDark(dark);

    if (dark) {
      document.documentElement.classList.add("dark");
      document.documentElement.style.colorScheme = "dark";
    } else {
      document.documentElement.classList.remove("dark");
      document.documentElement.style.colorScheme = "light";
    }
  }, []);

  const setTheme = useCallback(
    (t: Theme) => {
      setThemeState(t);
      try {
        localStorage.setItem("emtaa_theme", t);
      } catch {
        /* ignore */
      }
      applyTheme(t);
    },
    [applyTheme],
  );

  const toggle = useCallback(() => {
    setTheme(isDark ? "light" : "dark");
  }, [isDark, setTheme]);

  useEffect(() => {
    applyTheme(theme);
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const handler = () => {
      if (theme === "system") applyTheme("system");
    };
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, [theme, applyTheme]);

  return { theme, setTheme, isDark, toggle };
}
