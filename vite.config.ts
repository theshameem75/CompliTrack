import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const keyPath = resolve(".cert/dev-key.pem");
const certPath = resolve(".cert/dev-cert.pem");
const hasCertificate = existsSync(keyPath) && existsSync(certPath);

export default defineConfig({
  plugins: [react()],
  resolve: { alias: { "@": resolve("src") } },
  server: {
    host: "0.0.0.0",
    port: 5174,
    strictPort: true,
    https: hasCertificate
      ? { key: readFileSync(keyPath), cert: readFileSync(certPath) }
      : undefined,
  },
  preview: { host: "0.0.0.0", port: 4173 },
  build: { outDir: "build", emptyOutDir: true },
});
