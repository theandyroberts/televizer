import { defineConfig } from "vite";
import { resolve } from "node:path";

export default defineConfig({
  build: {
    lib: {
      entry: resolve(import.meta.dirname, "src/index.ts"),
      name: "TelevizerCore",
      formats: ["es", "iife"],
      fileName: (format) =>
        format === "es" ? "index.js" : "televizer.global.js",
    },
    sourcemap: true,
    emptyOutDir: false,
  },
});
