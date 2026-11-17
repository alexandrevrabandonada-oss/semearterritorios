import { defineConfig } from "vitest/config";
import { join } from "node:path";

export default defineConfig({
  resolve: {
    tsconfigPaths: true,
    // Next.js compiles this marker to its empty server-only entry in server tests.
    alias: {
      "server-only": join(process.cwd(), "node_modules/next/dist/compiled/server-only/empty.js"),
    },
  },
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
    globals: true,
    restoreMocks: true,
    clearMocks: true
  }
});
