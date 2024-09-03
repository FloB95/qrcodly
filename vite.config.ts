/* eslint-disable @typescript-eslint/no-unsafe-call */
import { defineConfig, loadEnv } from "vite";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    globals: true,
    environment: "node",
    env: loadEnv("", process.cwd(), ""),
  },
});
