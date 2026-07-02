import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    host: "127.0.0.1",
    port: 3000,
  },
  resolve: {
    alias: {
      "@teilfair/shared": path.resolve(__dirname, "../shared/src"),
    },
  },
  optimizeDeps: {
    include: ["@teilfair/shared"],
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id: string) {
          if (!id.includes("node_modules")) return undefined;
          if (/react|react-dom|react-router-dom/.test(id)) return "react";
          if (id.includes("@supabase")) return "supabase";
          if (/i18next|react-i18next/.test(id)) return "i18n";
          if (id.includes("@fortawesome")) return "fontawesome";
          return "vendor";
        },
      },
    },
  },
});
