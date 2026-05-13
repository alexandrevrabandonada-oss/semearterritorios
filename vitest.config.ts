import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    tsconfigPaths: true
  },
  test: {
    environment: "node",
    include: ["tests/transparencia/**/*.test.ts"],
    globals: true,
    restoreMocks: true,
    clearMocks: true
  }
});
