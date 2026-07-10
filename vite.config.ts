import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig({
  plugins: [react(), tailwindcss(), tsconfigPaths()],
  resolve: {
    alias: {
      "@": "/src",
    },
    dedupe: ["react", "react-dom", "react-router-dom"],
  },
  build: {
    outDir: "dist",
    sourcemap: false,
    // Raise limit — pdf chunk is legitimately large and cached independently
    chunkSizeWarningLimit: 1600,
    // Enable module preload for critical chunks (Vite default, explicit for clarity)
    modulePreload: {
      polyfill: false, // No need for module preload polyfill in modern browsers
    },
    // Use esbuild minifier (faster than terser, nearly as good)
    minify: "esbuild",
    // Target modern browsers — avoids unnecessary polyfills and produces smaller output
    target: "es2020",
    // Enable CSS code splitting
    cssCodeSplit: true,
    rollupOptions: {
      output: {
        manualChunks(id) {
          // Core React runtime — loaded first, always cached
          if (id.includes("node_modules/react/") || id.includes("node_modules/react-dom/")) {
            return "react-vendor";
          }
          // Router
          if (
            id.includes("node_modules/react-router-dom") ||
            id.includes("node_modules/react-router/")
          ) {
            return "router";
          }
          // Supabase — auth + db, needed early
          if (id.includes("node_modules/@supabase/")) {
            return "supabase";
          }
          // Icons — very large, tree-shake but keep separate
          if (id.includes("node_modules/lucide-react")) {
            return "icons";
          }
          // Animation — heavy, defer
          if (id.includes("node_modules/framer-motion")) {
            return "animation";
          }
          // Charts / recharts — only on dashboard pages
          if (id.includes("node_modules/recharts") || id.includes("node_modules/d3-")) {
            return "charts";
          }
          // Radix UI primitives — used by shadcn components
          if (id.includes("node_modules/@radix-ui/")) {
            return "radix-ui";
          }
          // Form libraries
          if (
            id.includes("node_modules/react-hook-form") ||
            id.includes("node_modules/@hookform/")
          ) {
            return "forms-vendor";
          }
          // Toast notifications
          if (id.includes("node_modules/react-toastify")) {
            return "toast";
          }
          // PDF renderer — heavy, only loaded when user downloads a doc
          if (
            id.includes("node_modules/@react-pdf/") ||
            id.includes("node_modules/pdfkit") ||
            id.includes("node_modules/fontkit")
          ) {
            return "pdf";
          }
          // Date utilities
          if (id.includes("node_modules/date-fns")) {
            return "date-utils";
          }
          // Validation
          if (id.includes("node_modules/zod")) {
            return "validation";
          }
          // Admin pages — only staff/admin ever load these
          if (
            id.includes("/pages/admin/") ||
            id.includes("/pages/staff/") ||
            id.includes("/pages/department/")
          ) {
            return "admin-staff";
          }
          // Form components — only loaded on /apply route
          if (id.includes("/components/forms/")) {
            return "forms";
          }
          // PDF document templates
          if (id.includes("/components/documents/")) {
            return "pdf-docs";
          }
          // Tanzania address data — very large, only for profile
          if (id.includes("/lib/addressData")) {
            return "address-data";
          }
        },
      },
    },
  },
  optimizeDeps: {
    include: ["react", "react-dom", "react-router-dom"],
    // Exclude heavy deps from pre-bundling — they're lazy loaded
    exclude: ["@react-pdf/renderer", "recharts", "framer-motion"],
  },
});
