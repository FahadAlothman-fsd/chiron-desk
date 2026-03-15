export type RuntimeConfig = {
  version: 1;
  mode: "local";
  server: {
    kind: "bundled";
    port: number;
  };
  database: {
    kind: "local";
    url: string;
  };
};

type CreateDefaultRuntimeConfigOptions = {
  port: number;
  databaseUrl: string;
};

type ReplaceRuntimePortOptions = {
  config: RuntimeConfig;
  port: number;
};

export function createDefaultRuntimeConfig(
  options: CreateDefaultRuntimeConfigOptions,
): RuntimeConfig {
  if (!isValidPort(options.port)) {
    throw new Error("Invalid runtime config payload");
  }

  return {
    version: 1,
    mode: "local",
    server: {
      kind: "bundled",
      port: options.port,
    },
    database: {
      kind: "local",
      url: options.databaseUrl,
    },
  };
}

export function migrateRuntimeConfig(config: unknown): RuntimeConfig {
  const version = readConfigVersion(config);

  if (version !== 1) {
    throw new Error(`Unsupported runtime config version: ${version}`);
  }

  if (!isRuntimeConfigV1(config)) {
    throw new Error("Invalid runtime config payload");
  }

  return config;
}

export function replaceRuntimePort(options: ReplaceRuntimePortOptions): RuntimeConfig {
  if (!isValidPort(options.port)) {
    throw new Error("Invalid runtime config payload");
  }

  return {
    ...options.config,
    server: {
      ...options.config.server,
      port: options.port,
    },
  };
}

function isRuntimeConfigV1(config: unknown): config is RuntimeConfig {
  if (!config || typeof config !== "object") {
    return false;
  }

  const candidate = config as Record<string, unknown>;

  return (
    candidate.version === 1 &&
    candidate.mode === "local" &&
    isBundledServerConfig(candidate.server) &&
    isLocalDatabaseConfig(candidate.database)
  );
}

function isBundledServerConfig(value: unknown): value is RuntimeConfig["server"] {
  if (!value || typeof value !== "object") {
    return false;
  }

  const candidate = value as Record<string, unknown>;
  return candidate.kind === "bundled" && isValidPort(candidate.port);
}

function isLocalDatabaseConfig(value: unknown): value is RuntimeConfig["database"] {
  if (!value || typeof value !== "object") {
    return false;
  }

  const candidate = value as Record<string, unknown>;
  return candidate.kind === "local" && typeof candidate.url === "string";
}

function readConfigVersion(config: unknown): string | number {
  if (!config || typeof config !== "object") {
    return "unknown";
  }

  const candidate = config as Record<string, unknown>;
  return typeof candidate.version === "number" ? candidate.version : "unknown";
}

function isValidPort(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value) && value > 0 && value <= 65_535;
}
