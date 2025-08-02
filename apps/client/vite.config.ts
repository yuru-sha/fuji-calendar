import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  root: __dirname,
  publicDir: "public",
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      "@fuji-calendar/types": path.resolve(
        __dirname,
        "../../packages/types/src",
      ),
      "@fuji-calendar/utils": path.resolve(
        __dirname,
        "../../packages/utils/src",
      ),
      "@fuji-calendar/ui": path.resolve(__dirname, "../../packages/ui/src"),
    },
  },
  server: {
    port: 3000,
    proxy: {
      "/api": {
        target: "http://localhost:3001",
        changeOrigin: true,
      },
    },
  },
  build: {
    outDir: "dist",
    sourcemap: true,
  },
});
