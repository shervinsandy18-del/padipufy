import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";

declare const process: {
  env: Record<string, string | undefined>;
  cwd(): string;
};

declare const console: {
  info(message: string, fields: {
    processEnvHasViteApiUrl: boolean;
    loadedEnvHasViteApiUrl: boolean;
    productionMode: boolean;
  }): void;
};

export default defineConfig(({ command, mode }) => {
  if (command === "build") {
    const loadedEnv = loadEnv(mode, process.cwd(), "VITE_");

    console.info("[vite-env-diagnostic]", {
      processEnvHasViteApiUrl: typeof process.env.VITE_API_URL !== "undefined",
      loadedEnvHasViteApiUrl: Object.prototype.hasOwnProperty.call(
        loadedEnv,
        "VITE_API_URL"
      ),
      productionMode: mode === "production"
    });
  }

  return {
    plugins: [react()],
    server: { port: 5173 }
  };
});
