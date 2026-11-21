import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react-swc";
import path from "path";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./src/test/setup.ts"],
    include: ["src/**/*.{test,spec}.{ts,tsx}"],
    exclude: ['src/lib/__tests__/landingPrerender.test.ts', '**/node_modules/**'],
  },
  resolve: {
    alias: { "@": path.resolve(__dirname, "./src") },
  },
});
