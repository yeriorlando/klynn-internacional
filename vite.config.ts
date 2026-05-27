import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import { nitro } from "nitro/vite";
import tsconfigPaths from "vite-tsconfig-paths";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [
    tanstackStart(),
    nitro({ preset: process.env.NITRO_PRESET || "node-server" }),
    react(),
    tailwindcss(),
    tsconfigPaths(),
  ],
  server: {
    port: 8080,
  },
});
