import { execSync } from "child_process";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

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
  plugins: [react()],
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
      },
    },
  },
  define: {
    "process.env.REACT_APP_COMMIT_HASH": JSON.stringify(
      process.env.REACT_APP_COMMIT_HASH || commitHash
    ),
    "process.env.REACT_APP_GITHUB_REPO": JSON.stringify(
      process.env.REACT_APP_GITHUB_REPO ||
        "https://github.com/openscan-explorer/explorer"
    ),
    "process.env.REACT_APP_VERSION": JSON.stringify(
      process.env.REACT_APP_VERSION || "1.0.0-alpha"
    ),
    "process.env.REACT_APP_OPENSCAN_NETWORKS": JSON.stringify(
      process.env.REACT_APP_OPENSCAN_NETWORKS || ""
    ),
    "process.env.REACT_APP_ENVIRONMENT": JSON.stringify(
      process.env.NODE_ENV || "development"
    ),
  },
});
