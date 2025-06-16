/// <reference types="vitest" />
import path from "path";

import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: "jsdom",
    setupFiles: "./src/tests/setup.ts",
    css: true,
    reporters: ["verbose", "html"],
    outputFile: {
      html: "./test-results/index.html",
    },
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "html"],
      reportsDirectory: "./coverage",
      exclude: [
        "node_modules/",
        "src/tests/",
        "**/*.d.ts",
        "**/*.config.*",
        "dist/",
        "build/",
        "public/",
        "**/*.test.*",
        "**/*.spec.*",
      ],
      include: ["src/**/*.{ts,tsx}", "src/**/*.{js,jsx}"],
      statements: 80,
      branches: 75,
      functions: 80,
      lines: 80,
    },
    // Test timeout for async operations
    testTimeout: 10000,
    hookTimeout: 10000,
    // Mock external dependencies
    deps: {
      inline: [
        "firebase",
        "@firebase/app",
        "@firebase/database",
        "@firebase/auth",
      ],
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      "@components": path.resolve(__dirname, "./src/components"),
      "@hooks": path.resolve(__dirname, "./src/hooks"),
      "@utils": path.resolve(__dirname, "./src/utils"),
      "@config": path.resolve(__dirname, "./src/config"),
      "@types": path.resolve(__dirname, "./src/types"),
    },
  },
});
