import tailwindcss from "@tailwindcss/vite";
import { tanstackRouter } from "@tanstack/router-plugin/vite";
import react from "@vitejs/plugin-react";
import path from "node:path";
import { defineConfig, loadEnv } from "vite";

const isDesktopBuild = process.env.CHIRON_DESKTOP_BUILD === "true";

export default defineConfig(({ mode }) => {
  const rootDir = path.resolve(__dirname, "../..");
  const env = loadEnv(mode, rootDir, "");

  return {
    base: isDesktopBuild ? "./" : "/",
    envDir: rootDir,
    define: {
      "import.meta.env.VITE_SERVER_URL": JSON.stringify(
        env.VITE_SERVER_URL ?? env.API_URL ?? "http://localhost:3000",
      ),
    },
    plugins: [tailwindcss(), tanstackRouter({}), react()],
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
    server: {
      port: 3001,
    },
  };
});
