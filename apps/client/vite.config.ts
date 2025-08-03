import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import { readFileSync } from "fs";

// package.json を読み込む
const packageJson = JSON.parse(
  readFileSync(path.resolve(__dirname, "./package.json"), "utf-8")
);

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
  define: {
    "import.meta.env.APP_VERSION": JSON.stringify(packageJson.version),
    "import.meta.env.APP_NAME": JSON.stringify(packageJson.name),
  },
});
