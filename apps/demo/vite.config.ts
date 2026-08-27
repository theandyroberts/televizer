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
});
