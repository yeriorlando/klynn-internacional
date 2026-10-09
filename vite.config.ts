import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import { nitro } from "nitro/vite";
import tsconfigPaths from "vite-tsconfig-paths";
import tailwindcss from "@tailwindcss/vite";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function autoUpdatePlugin(): Plugin {
  const buildId = Date.now().toString();
  return {
    name: "klynn-auto-update",
    apply: "build",
    buildStart() {
      try {
        const publicDir = path.resolve(__dirname, "public");
        if (!fs.existsSync(publicDir)) {
          fs.mkdirSync(publicDir, { recursive: true });
        }

        // 1. Escribir public/version.json
        const versionData = {
          version: buildId,
          builtAt: new Date().toISOString(),
        };
        fs.writeFileSync(
          path.join(publicDir, "version.json"),
          JSON.stringify(versionData, null, 2),
          "utf-8"
        );

        // 2. Estampar BUILD_ID en public/sw.js
        const swPath = path.join(publicDir, "sw.js");
        if (fs.existsSync(swPath)) {
          let content = fs.readFileSync(swPath, "utf-8");
          if (/const BUILD_ID\s*=\s*"[^"]*";/.test(content)) {
            content = content.replace(
              /const BUILD_ID\s*=\s*"[^"]*";/,
              `const BUILD_ID = "${buildId}";`
            );
          } else if (/const CACHE_NAME\s*=\s*"[^"]*";/.test(content)) {
            content = content.replace(
              /const CACHE_NAME\s*=\s*"[^"]*";/,
              `const BUILD_ID = "${buildId}";\nconst CACHE_NAME = "klynn-pwa-" + BUILD_ID;`
            );
          }
          fs.writeFileSync(swPath, content, "utf-8");
        }
        console.log(`[klynn-auto-update] Estampada versión de build: ${buildId}`);
      } catch (err) {
        console.warn("[klynn-auto-update] Error durante buildStart:", err);
      }
    },
    closeBundle() {
      try {
        const outDir = path.resolve(__dirname, ".output/public");
        const pubDir = path.resolve(__dirname, "public");
        if (fs.existsSync(outDir)) {
          const verSrc = path.join(pubDir, "version.json");
          const verDest = path.join(outDir, "version.json");
          if (fs.existsSync(verSrc)) {
            fs.copyFileSync(verSrc, verDest);
          }
          const swSrc = path.join(pubDir, "sw.js");
          const swDest = path.join(outDir, "sw.js");
          if (fs.existsSync(swSrc)) {
            fs.copyFileSync(swSrc, swDest);
          }
        }
      } catch (err) {
        console.warn("[klynn-auto-update] Error durante closeBundle:", err);
      }
    },
  };
}

export default defineConfig({
  plugins: [
    autoUpdatePlugin(),
    tanstackStart(),
    nitro({ 
      preset: process.env.NITRO_PRESET || (process.env.VERCEL ? "vercel" : "node-server") 
    }),
    react(),
    tailwindcss(),
    tsconfigPaths(),
  ],
  server: {
    port: 8080,
  },
});
