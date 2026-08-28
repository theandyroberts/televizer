import { defineConfig } from "vite";
import { resolve } from "node:path";

export default defineConfig({
  resolve: {
    alias: {
      "@televizer/core": resolve(
        import.meta.dirname,
        "../../packages/core/src/index.ts",
      ),
    },
  },
  build: {
    outDir: "dist",
    emptyOutDir: true,
    sourcemap: true,
    lib: {
      entry: resolve(import.meta.dirname, "src/content-script.ts"),
      name: "TelevizerExtensionContent",
      formats: ["iife"],
      fileName: () => "content-script.js",
    },
  },
});
