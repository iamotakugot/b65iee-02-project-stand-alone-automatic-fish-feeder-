import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tsconfigPaths from "vite-tsconfig-paths";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react(), tsconfigPaths()],
  optimizeDeps: {
    // Pre-bundle these dependencies to ensure proper loading order
    include: ["react", "react-dom", "react/jsx-runtime"],
    // Force rebuild to ensure clean dependencies
    force: true,
  },
  build: {
    // Ignore TypeScript errors during build for deployment
    rollupOptions: {
      onwarn(warning, warn) {
        if (warning.code === "UNUSED_EXTERNAL_IMPORT") return;
        warn(warning);
      },
      output: {
        // Remove ALL manual chunking - let Vite handle it automatically
        // This prevents loading order issues with React context
        manualChunks: undefined,
      },
    },
    // Use esbuild for faster builds
    minify: "esbuild",
    target: "esnext",
    chunkSizeWarningLimit: 1000,
  },
  server: {
    port: 3000,
    host: true,
  },
});
