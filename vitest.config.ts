import { coverageConfigDefaults, defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    coverage: {
      exclude: ["src/__demo__/**", ...coverageConfigDefaults.exclude]
    }
  }
});
