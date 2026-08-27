import { defineConfig } from "vite";
import { resolve } from "node:path";

export default defineConfig({
  base: process.env.TELEVIZER_BASE_PATH ?? "/",
  resolve: {
    alias: {
      "@televizer/core": resolve(
        import.meta.dirname,
        "../../packages/core/src/index.ts",
      ),
    },
  },
});
