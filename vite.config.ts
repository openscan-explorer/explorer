import { execSync } from "child_process";
import { readFileSync } from "fs";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import { devArtifactsPlugin } from "./vite-plugin-artifacts";

// Get version from package.json
const packageJson = JSON.parse(readFileSync("./package.json", "utf-8"));
const appVersion = packageJson.version || "0.0.0";

// Get git commit hash
let commitHash = "development";
try {
  commitHash = execSync("git rev-parse HEAD").toString().trim();
} catch {
  console.warn("Could not get git commit hash");
}

const isGhPages = process.env.GITHUB_PAGES === "true";
const base = isGhPages ? "/explorer/" : "/";

export default defineConfig({
  base,
  plugins: [react(), devArtifactsPlugin()],
  server: {
    port: 3030,
    open: true,
  },
  preview: {
    port: 3030,
  },
  build: {
    outDir: "dist",
    sourcemap: false,
    minify: "terser",
    terserOptions: {
      mangle: {
        safari10: true,
      },
      compress: {
        drop_console: false,
        drop_debugger: false,
        pure_funcs: process.env.NODE_ENV === "production" ? ["console.log"] : [],
      },
    },
  },
  envPrefix: "OPENSCAN_",
  define: {
    "import.meta.env.OPENSCAN_COMMIT_HASH": JSON.stringify(
      process.env.OPENSCAN_COMMIT_HASH || commitHash
    ),
    "import.meta.env.OPENSCAN_VERSION": JSON.stringify(
      process.env.OPENSCAN_VERSION || appVersion
    ),
    "import.meta.env.OPENSCAN_ENVIRONMENT": JSON.stringify(
      process.env.NODE_ENV || "development"
    ),
  },
});
