import { defineConfig } from "vitest/config"
import path from "path"

export default defineConfig({
  test: {
    coverage: {
      provider: "v8",
      include: [
        "app/api/v1/agentes/**/*.ts",
        "app/api/v1/sync/**/*.ts",
        "lib/**/*.ts",
      ],
      exclude: [
        "**/node_modules/**",
        "**/.next/**",
        "**/agentes/[id]/alcoholemias/**",
        "**/agentes/[id]/observaciones/**",
        "**/agentes/[id]/route.ts",
        "**/agentes/legajo/[legajo]/observaciones/reporte/**",
      ],
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
