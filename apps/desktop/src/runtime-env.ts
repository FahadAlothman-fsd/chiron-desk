import type { RuntimeConfig } from "./runtime-config.js";
import type { RuntimeSecrets } from "./runtime-secrets.js";

type BuildServerEnvOptions = {
  config: RuntimeConfig;
  secrets: RuntimeSecrets;
  rendererOrigin: string;
};

export function buildServerEnv(options: BuildServerEnvOptions) {
  const serverOrigin = `http://127.0.0.1:${options.config.server.port}`;

  return {
    PORT: String(options.config.server.port),
    DATABASE_URL: options.config.database.url,
    BETTER_AUTH_SECRET: options.secrets.betterAuthSecret,
    BETTER_AUTH_URL: serverOrigin,
    CORS_ORIGIN: options.rendererOrigin,
  };
}
