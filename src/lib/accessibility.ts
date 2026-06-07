/**
 * Accessibility (WCAG) Helpers
 * Utilities for improving keyboard navigation, screen reader support, and focus management.
 */

/** Trap focus within a container (for modals/dialogs) */
export function trapFocus(container: HTMLElement): () => void {
  const focusable = container.querySelectorAll<HTMLElement>(
    'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
  );
  const first = focusable[0];
  const last = focusable[focusable.length - 1];

  const handler = (e: KeyboardEvent) => {
    if (e.key !== "Tab") return;
    if (e.shiftKey) {
      if (document.activeElement === first) {
        e.preventDefault();
        last?.focus();
      }
    } else {
      if (document.activeElement === last) {
        e.preventDefault();
        first?.focus();
      }
    }
  };

  container.addEventListener("keydown", handler);
  first?.focus();

  return () => container.removeEventListener("keydown", handler);
}

/** Announce a message to screen readers via aria-live */
export function announceToScreenReader(message: string, priority: "polite" | "assertive" = "polite"): void {
  let el = document.getElementById("sr-announcer");
  if (!el) {
    el = document.createElement("div");
    el.id = "sr-announcer";
    el.setAttribute("aria-live", priority);
    el.setAttribute("aria-atomic", "true");
    el.setAttribute("role", "status");
    el.style.cssText = "position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0,0,0,0);";
    document.body.appendChild(el);
  }
  el.setAttribute("aria-live", priority);
  el.textContent = "";
  requestAnimationFrame(() => { el!.textContent = message; });
}

/** Skip to main content link (call once on app mount) */
export function setupSkipLink(): void {
  const main = document.querySelector("main") || document.getElementById("main-content");
  if (!main) return;

  let skip = document.getElementById("skip-to-main");
  if (skip) return;

  skip = document.createElement("a");
  skip.id = "skip-to-main";
  (skip as HTMLAnchorElement).href = "#main-content";
  skip.textContent = "Skip to main content";
  skip.className = "sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 focus:bg-emerald-600 focus:text-white focus:px-4 focus:py-2 focus:rounded-lg";
  skip.addEventListener("click", (e) => {
    e.preventDefault();
    main.setAttribute("tabindex", "-1");
    main.focus();
  });

  document.body.insertBefore(skip, document.body.firstChild);
}

/** Ensure color contrast meets WCAG AA (4.5:1 for normal text) */
export function meetsContrastRatio(hex1: string, hex2: string, minRatio = 4.5): boolean {
  const luminance = (hex: string) => {
    const rgb = hex.replace("#", "").match(/.{2}/g)!.map((c) => {
      const v = parseInt(c, 16) / 255;
      return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
    });
    return 0.2126 * rgb[0] + 0.7152 * rgb[1] + 0.0722 * rgb[2];
  };
  const l1 = luminance(hex1);
  const l2 = luminance(hex2);
  const ratio = (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
  return ratio >= minRatio;
}
