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
    rollupOptions: {
      output: {
        manualChunks: {
          router: ["react-router-dom"],
          supabase: ["@supabase/supabase-js"],
          ui: ["framer-motion", "lucide-react"],
          pdf: ["@react-pdf/renderer"],
        },
      },
    },
    // The pdf chunk (@react-pdf/renderer) is legitimately large and already
    // isolated into its own chunk so it can be cached independently.
    chunkSizeWarningLimit: 1600,
  },
  optimizeDeps: {
    include: [
      "react",
      "react-dom",
      "react-router-dom",
      "@react-pdf/renderer",
    ],
  },
});
