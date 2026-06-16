import path from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "apps/web/src"),
      "@aios/proxy-core": path.resolve(
        __dirname,
        "packages/proxy-core/src/index.ts",
      ),
      "@aios/domain": path.resolve(__dirname, "packages/domain/src/index.ts"),
      "@aios/application": path.resolve(
        __dirname,
        "packages/application/src/index.ts",
      ),
    },
  },
  test: {
    globals: true,
    environment: "node",
    hookTimeout: 30_000,
    include: ["tests/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}"],
    exclude: ["node_modules", "dist", ".next", "**/node_modules/**"],
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "html"],
      exclude: ["node_modules/", "dist/", ".next/"],
    },
  },
});
