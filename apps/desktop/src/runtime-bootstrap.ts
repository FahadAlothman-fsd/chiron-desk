import { pathToFileURL } from "node:url";

import {
  createDefaultRuntimeConfig,
  migrateRuntimeConfig,
  replaceRuntimePort,
  type RuntimeConfig,
} from "./runtime-config.js";
import { resolveRuntimePaths, type RuntimePaths } from "./runtime-paths.js";
import { createSecrets, readSecrets, type RuntimeSecrets } from "./runtime-secrets.js";

type CorruptJsonFile = {
  __chironCorruptJson: true;
  raw: string;
};

type BootstrapRuntimeStateOptions = {
  userDataPath: string;
  choosePort: (preferredPort?: number) => Promise<number>;
  readJson: (path: string) => Promise<unknown | undefined>;
  writeText: (path: string, value: string) => Promise<void>;
  writeJson: (path: string, value: unknown) => Promise<void>;
  ensureDir: (path: string) => Promise<void>;
};

export type BootstrapRuntimeState = {
  paths: RuntimePaths;
  config: RuntimeConfig;
  secrets: RuntimeSecrets;
};

export function createCorruptJsonFile(raw: string): CorruptJsonFile {
  return {
    __chironCorruptJson: true,
    raw,
  };
}

export function stringifyBackupValue(value: unknown): string {
  return `${JSON.stringify(value, null, 2)}\n`;
}

export async function bootstrapRuntimeState(
  options: BootstrapRuntimeStateOptions,
): Promise<BootstrapRuntimeState> {
  const paths = resolveRuntimePaths(options.userDataPath);

  await options.ensureDir(paths.runtimeRoot);
  await options.ensureDir(paths.dataDir);
  await options.ensureDir(paths.logsDir);

  const config = await loadConfig(options, paths);
  const secrets = await loadSecrets(options, paths);

  return {
    paths,
    config,
    secrets,
  };
}

async function loadConfig(
  options: BootstrapRuntimeStateOptions,
  paths: RuntimePaths,
): Promise<RuntimeConfig> {
  const storedConfig = await options.readJson(paths.configFile);

  if (storedConfig !== undefined) {
    if (isCorruptJsonFile(storedConfig)) {
      await options.writeText(`${paths.configFile}.bak`, storedConfig.raw);
    } else {
      const config = recoverPersistedConfig(storedConfig);

      if (config) {
        const port = await options.choosePort(config.server.port);

        if (port === config.server.port) {
          return config;
        }

        const recoveredConfig = replaceRuntimePort({ config, port });
        await options.writeJson(paths.configFile, recoveredConfig);
        return recoveredConfig;
      }

      await options.writeJson(`${paths.configFile}.bak`, storedConfig);
    }
  }

  const config = createDefaultRuntimeConfig({
    port: await options.choosePort(),
    databaseUrl: pathToFileURL(paths.databaseFile).href,
  });

  await options.writeJson(paths.configFile, config);
  return config;
}

function recoverPersistedConfig(storedConfig: unknown): RuntimeConfig | null {
  try {
    return migrateRuntimeConfig(storedConfig);
  } catch (error) {
    if (
      isExplicitUnsupportedRuntimeConfig(storedConfig) &&
      isUnsupportedRuntimeConfigError(error)
    ) {
      throw error;
    }

    return null;
  }
}

function isExplicitUnsupportedRuntimeConfig(config: unknown): boolean {
  if (!config || typeof config !== "object") {
    return false;
  }

  const candidate = config as { version?: unknown };
  return typeof candidate.version === "number" && candidate.version !== 1;
}

function isUnsupportedRuntimeConfigError(error: unknown): error is Error {
  return error instanceof Error && error.message.startsWith("Unsupported runtime config version:");
}

function isCorruptJsonFile(value: unknown): value is CorruptJsonFile {
  return Boolean(
    value &&
    typeof value === "object" &&
    "__chironCorruptJson" in value &&
    "raw" in value &&
    (value as { __chironCorruptJson?: unknown }).__chironCorruptJson === true &&
    typeof (value as { raw?: unknown }).raw === "string",
  );
}

async function loadSecrets(
  options: BootstrapRuntimeStateOptions,
  paths: RuntimePaths,
): Promise<RuntimeSecrets> {
  const storedSecrets = await options.readJson(paths.secretsFile);

  if (storedSecrets !== undefined) {
    return readSecrets(storedSecrets);
  }

  const secrets = createSecrets();
  await options.writeJson(paths.secretsFile, secrets);
  return secrets;
}
