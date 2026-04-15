import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);

export default defineConfig({
  resolve: {
    alias: { "@": path.resolve(__dirname, "./src") },
  },
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",

      // Garante que o SW seja registrado imediatamente
      injectRegister: "auto",

      includeAssets: [
        "icons/icon-192.png",
        "icons/icon-512.png",
        "offline.html",
      ],

      manifest: {
        name:             "FitCoach — Seu Treino",
        short_name:       "FitCoach",
        description:      "Plataforma para personal trainers e alunos",
        theme_color:      "#FF5722",
        background_color: "#1A1A2E",
        display:          "standalone",
        orientation:      "portrait-primary",
        start_url:        "/",
        icons: [
          { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any maskable" },
          { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any maskable" },
        ],
      },

      workbox: {
        // Cacheia todos os assets do build
        globPatterns: ["**/*.{js,css,html,ico,png,svg,woff2}"],

        // Página de fallback quando offline e rota não está em cache
        navigateFallback: "/offline.html",

        // Não usa fallback para rotas de API/Firebase
        navigateFallbackDenylist: [
          /^\/api\//,
          /^\/invite\//,
          /firestore\.googleapis\.com/,
          /identitytoolkit\.googleapis\.com/,
          /securetoken\.googleapis\.com/,
        ],

        runtimeCaching: [
          // ── Fontes Google ────────────────────────────────
          {
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
            handler: "CacheFirst",
            options: {
              cacheName: "google-fonts-cache",
              expiration: { maxEntries: 10, maxAgeSeconds: 60 * 60 * 24 * 365 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          {
            urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
            handler: "CacheFirst",
            options: {
              cacheName: "gstatic-fonts-cache",
              expiration: { maxEntries: 10, maxAgeSeconds: 60 * 60 * 24 * 365 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },

          // ── Thumbnails Cloudinary ─────────────────────────
          {
            urlPattern: /res\.cloudinary\.com.*\.(jpg|webp|png)/,
            handler: "CacheFirst",
            options: {
              cacheName: "cloudinary-images",
              expiration: { maxEntries: 100, maxAgeSeconds: 60 * 60 * 24 * 30 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },

          // ── Thumbnails YouTube ────────────────────────────
          {
            urlPattern: /img\.youtube\.com\/.*/,
            handler: "CacheFirst",
            options: {
              cacheName: "youtube-thumbnails",
              expiration: { maxEntries: 50, maxAgeSeconds: 60 * 60 * 24 * 7 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },

          // ── Firebase Auth (network first, fallback cache) ─
          {
            urlPattern: /identitytoolkit\.googleapis\.com/,
            handler: "NetworkFirst",
            options: {
              cacheName: "firebase-auth",
              networkTimeoutSeconds: 5,
              cacheableResponse: { statuses: [0, 200] },
            },
          },

          // ── Firestore (network first, 5s timeout) ─────────
          // Dados ficam no IndexedDB do Firebase SDK — não cacheamos aqui.
          // O SDK já tem suporte offline nativo via enableIndexedDbPersistence.
          {
            urlPattern: /firestore\.googleapis\.com/,
            handler: "NetworkOnly",
          },
        ],
      },
    }),
  ],
});