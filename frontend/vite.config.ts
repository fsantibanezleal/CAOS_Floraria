import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
export default defineConfig({
  plugins: [react()],
  server: { host: "127.0.0.1", port: 5902, strictPort: true },
  preview: { host: "127.0.0.1", port: 4902, strictPort: true },
  build: {
    target: "es2022",
    rollupOptions: {
      output: {
        manualChunks: {
          three: ["three"],
          shell: ["@fasl-work/caos-app-shell"],
        },
      },
    },
  },
});
