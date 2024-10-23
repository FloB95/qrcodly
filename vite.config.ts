// Import from 'vitest/config' instead of 'vite'
import { defineConfig } from "vitest/config";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    globals: true,
    environment: "node",
    env: process.env, // Vitest will automatically load environment variables
  },
});
