import { defineConfig } from "vitest/config"
import path from "path"

export default defineConfig({
  test: {
    coverage: {
      provider: "v8",
      include: ["lib/reportes/semanal/*.ts"],
      thresholds: {
        statements: 80,
        branches: 80,
        functions: 80,
        lines: 80,
      },
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname),
    },
  },
})
