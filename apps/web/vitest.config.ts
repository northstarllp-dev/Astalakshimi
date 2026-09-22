import { defineConfig } from "vitest/config"
import path from "node:path"

// React 19 only exposes `act` in its development build. When NODE_ENV=production
// leaks in (machine/CI), vitest loads react's production build and
// @testing-library/react throws "React.act is not a function". Force test mode
// before any react module is resolved (main process + worker env below).
process.env.NODE_ENV = "test"

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
    env: { NODE_ENV: "test" },
    setupFiles: ["./vitest.setup.ts"],
    include: ["src/**/*.{test,spec}.{ts,tsx}"],
    css: false,
  },
})
