import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import { VitePWA } from "vite-plugin-pwa";
import path from "path";

// https://vitejs.dev/config/
export default defineConfig({
  server: {
    host: "::",
    port: 8080,
  },
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      workbox: {
        globPatterns: ["**/*.{js,css,html,ico,png,svg,woff,woff2}"],
        navigateFallback: "/local-ledger/index.html",
        navigateFallbackDenylist: [/^\/local-ledger\/api/],
      },
      manifest: {
        name: "LocalLedger - Local-First Personal Finance",
        short_name: "LocalLedger",
        description:
          "A powerful local-first personal finance dashboard. Import CSV bank statements, auto-categorize transactions, and visualize spending.",
        theme_color: "#1d2b3a",
        background_color: "#f5f7fa",
        display: "standalone",
        start_url: "/local-ledger/",
        scope: "/local-ledger/",
        icons: [
          {
            src: "pwa-192x192.png",
            sizes: "192x192",
            type: "image/png",
          },
          {
            src: "pwa-512x512.png",
            sizes: "512x512",
            type: "image/png",
          },
          {
            src: "pwa-512x512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "any maskable",
          },
        ],
      },
    }),
  ],
  base: "/local-ledger/",
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
