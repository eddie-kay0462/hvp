import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
  },
  plugins: [react(), mode === "development" && componentTagger()].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    rollupOptions: {
      output: {
        // Split heavy vendors into their own long-cacheable chunks. Recharts in
        // particular is large and only used by the seller dashboard, so it stays
        // out of the initial load and is shared across the seller pages.
        manualChunks(id) {
          if (!id.includes("node_modules")) return;
          // Keep heic2any in its own chunk so it stays lazy (it is only ever
          // dynamically imported); a catch-all name would pull it into the
          // eager vendor bundle and defeat that.
          if (id.includes("heic2any") || id.includes("libheif")) return "heic2any";
          if (id.includes("recharts") || id.includes("d3-")) return "charts";
          if (id.includes("@radix-ui")) return "radix";
          if (id.includes("@supabase")) return "supabase";
          if (id.includes("react-router") || id.includes("@remix-run")) return "router";
          // React itself stays in `vendor` alongside the libs that depend on it —
          // splitting it into its own chunk creates a circular chunk reference.
          return "vendor";
        },
      },
    },
  },
}));
