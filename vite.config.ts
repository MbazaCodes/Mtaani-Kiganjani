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
    rollupOptions: {
      output: {
        manualChunks(id) {
          // Core React runtime — loaded first, always cached
          if (id.includes("node_modules/react/") || id.includes("node_modules/react-dom/")) {
            return "react-vendor";
          }
          // Router
          if (id.includes("node_modules/react-router-dom") || id.includes("node_modules/react-router/")) {
            return "router";
          }
          // Supabase — auth + db, needed early
          if (id.includes("node_modules/@supabase/")) {
            return "supabase";
          }
          // Animation + icons — UI interactions
          if (id.includes("node_modules/framer-motion") || id.includes("node_modules/lucide-react")) {
            return "ui";
          }
          // PDF renderer — heavy, only loaded when user downloads a doc
          if (id.includes("node_modules/@react-pdf/") || id.includes("node_modules/pdfkit") || id.includes("node_modules/fontkit")) {
            return "pdf";
          }
          // Admin pages — only staff/admin ever load these
          if (id.includes("/pages/admin/") || id.includes("/pages/staff/") || id.includes("/pages/department/")) {
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
        },
      },
    },
  },
  optimizeDeps: {
    include: ["react", "react-dom", "react-router-dom"],
    // Exclude PDF from pre-bundling — it's lazy loaded
    exclude: ["@react-pdf/renderer"],
  },
});
