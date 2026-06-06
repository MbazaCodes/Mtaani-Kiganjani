/**
 * SITE CONFIGURATION
 * ==================
 * Central place for the public site URL. Used for QR verification links,
 * document verification URLs, email redirects, and asset URLs.
 *
 * Reads VITE_SITE_URL from the environment; falls back to the development /
 * testing domain. Set VITE_SITE_URL in Vercel/.env when the domain changes.
 */

const env = (import.meta as { env?: Record<string, string> }).env;

/** The canonical public URL of the app (no trailing slash). */
export const SITE_URL: string = (
  env?.VITE_SITE_URL ||
  // Prefer the runtime origin in the browser, else the configured default.
  (typeof window !== "undefined" && window.location?.origin) ||
  "https://www.e-mtaatz.xyz"
).replace(/\/$/, "");

/** Build an absolute URL on the site from a path. */
export const siteUrl = (path = ""): string => {
  const p = path.startsWith("/") ? path : `/${path}`;
  return `${SITE_URL}${path ? p : ""}`;
};

/** Document/application verification link. */
export const verifyUrl = (ref: string, type = "application"): string =>
  `${SITE_URL}/verify?ref=${encodeURIComponent(ref)}&type=${encodeURIComponent(type)}`;

/** Coat-of-arms logo asset URL. */
export const COAT_OF_ARMS_URL = `${SITE_URL}/tz-coat-of-arms.png`;
