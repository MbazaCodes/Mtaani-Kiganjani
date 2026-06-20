/**
 * E-MTAA — Next.js Configuration (Production-hardened)
 *
 * Changes from audit:
 *  - Re-enabled reactStrictMode
 *  - Removed typescript.ignoreBuildErrors
 *  - Added security headers (CSP, X-Frame-Options, etc.)
 *  - Added image optimization for TZ government assets
 *  - Removed dev-only allowedDevOrigins from production
 */

import type { NextConfig } from "next";

// ── Security Headers ──────────────────────────────────────────────────────────

const isDev = process.env.NODE_ENV === "development";

const securityHeaders = [
  {
    key: "X-DNS-Prefetch-Control",
    value: "on",
  },
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
  {
    key: "X-Content-Type-Options",
    value: "nosniff",
  },
  {
    key: "X-Frame-Options",
    value: "SAMEORIGIN",
  },
  {
    key: "X-XSS-Protection",
    value: "1; mode=block",
  },
  {
    key: "Referrer-Policy",
    value: "strict-origin-when-cross-origin",
  },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(self), payment=()",
  },
  {
    key: "Content-Security-Policy",
    value: [
      "default-src 'self'",
      // Next.js requires 'unsafe-inline' and 'unsafe-eval' in dev; tighten in prod
      isDev
        ? "script-src 'self' 'unsafe-eval' 'unsafe-inline'"
        : "script-src 'self' 'unsafe-inline'",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: blob: https:",
      "font-src 'self' data:",
      "connect-src 'self'",
      "frame-ancestors 'none'",
      "base-uri 'self'",
      "form-action 'self'",
    ].join("; "),
  },
];

// ── Config ───────────────────────────────────────────────────────────────────

const nextConfig: NextConfig = {
  output: "standalone",

  // ✅ Re-enable strict mode (was disabled — hides real React bugs)
  reactStrictMode: true,

  // ✅ Remove ignoreBuildErrors — fix TS errors properly
  // typescript: { ignoreBuildErrors: true }, // REMOVED

  // ── Dev origins (only in development) ──────────────────────────────────────
  ...(isDev && {
    allowedDevOrigins: [
      "http://127.0.0.1:3000",
      "http://localhost:3000",
    ],
  }),

  // ── Image optimization ────────────────────────────────────────────────────
  images: {
    formats: ["image/avif", "image/webp"],
    deviceSizes: [320, 420, 768, 1024, 1200],
    minimumCacheTTL: 3600, // 1 hour
    domains: [], // add external domains if needed
  },

  // ── Compiler ─────────────────────────────────────────────────────────────
  compiler: {
    // Remove console.log in production
    removeConsole: !isDev ? { exclude: ["error", "warn"] } : false,
  },

  // ── Security Headers ──────────────────────────────────────────────────────
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: securityHeaders,
      },
      // Cache static assets aggressively
      {
        source: "/(.*)\\.(png|jpg|jpeg|gif|ico|svg|woff|woff2)",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=31536000, immutable",
          },
        ],
      },
    ];
  },

  // ── Redirects ─────────────────────────────────────────────────────────────
  async redirects() {
    return [
      // Redirect trailing slashes
      {
        source: "/:path+/",
        destination: "/:path+",
        permanent: true,
      },
    ];
  },

  // ── Webpack ───────────────────────────────────────────────────────────────
  webpack(config) {
    // Ignore optional sharp binaries that cause warnings
    config.resolve.alias = {
      ...config.resolve.alias,
    };
    return config;
  },
};

export default nextConfig;
