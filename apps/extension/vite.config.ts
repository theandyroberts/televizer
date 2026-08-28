import { defineConfig } from "vite";
import { resolve } from "node:path";

export default defineConfig({
  publicDir: "static",
  build: {
    outDir: "dist",
    emptyOutDir: false,
    sourcemap: true,
    rollupOptions: {
      input: {
        options: resolve(import.meta.dirname, "options.html"),
        "service-worker": resolve(
          import.meta.dirname,
          "src/service-worker.ts",
        ),
      },
      output: {
        entryFileNames: "[name].js",
        chunkFileNames: "chunks/[name]-[hash].js",
        assetFileNames: "assets/[name]-[hash][extname]",
      },
    },
  },
});
