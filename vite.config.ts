import { defineConfig, Plugin } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { createServer } from "./server";

// https://vitejs.dev/config/
export default defineConfig(({ command }) => ({
  server: {
    host: "::",
    port: 8080,
    fs: {
      allow: [
        ".", // allow project root (index.html)
        "./client",
        "./shared",
      ],
      deny: [
        ".env",
        ".env.*",
        "*.{crt,pem}",
        "**/.git/**",
        "server/**",
      ],
    },
  },

  build: {
    outDir: "dist/spa",
    emptyOutDir: true,
  },

  plugins: [
    react(),
    command === "serve" && expressPlugin(),
  ].filter(Boolean) as Plugin[],

  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./client"),
      "@shared": path.resolve(__dirname, "./shared"),
    },
  },
}));

/* ----------------------------------------------------
   Express middleware (DEV ONLY)
---------------------------------------------------- */
function expressPlugin(): Plugin {
  return {
    name: "express-plugin",
    apply: "serve",
    configureServer(viteServer) {
      const app = createServer();
      viteServer.middlewares.use(app);
    },
  };
}
