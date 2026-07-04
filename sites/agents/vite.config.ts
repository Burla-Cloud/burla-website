import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// The site ships under https://burla-cloud.github.io/burla-website/agents/ by
// default; flip BASE_PATH to "/" for a custom domain like agents.burla.dev.
const BASE_PATH = "/burla-website/agents/";

export default defineConfig({
  base: BASE_PATH,
  plugins: [react()],
  server: {
    host: "127.0.0.1",
    port: 5173,
  },
});
