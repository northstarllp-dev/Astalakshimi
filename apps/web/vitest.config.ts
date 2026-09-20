import { defineConfig } from "vitest/config"
import path from "node:path"

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      "@astalakshimi/reference": path.resolve(__dirname, "../../packages/reference/src/index.ts"),
      "@astalakshimi/validation": path.resolve(__dirname, "../../packages/validation/src/index.ts"),
      "@astalakshimi/types": path.resolve(__dirname, "../../packages/types/src/index.ts"),
    },
  },
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./vitest.setup.ts"],
    include: ["src/**/*.{test,spec}.{ts,tsx}"],
    css: false,
  },
})
