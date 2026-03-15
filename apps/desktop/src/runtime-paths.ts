import { join } from "node:path";

export type RuntimePaths = {
  runtimeRoot: string;
  configFile: string;
  secretsFile: string;
  dataDir: string;
  databaseFile: string;
  logsDir: string;
};

export function resolveRuntimePaths(userDataPath: string): RuntimePaths {
  const runtimeRoot = join(userDataPath, "runtime");
  const dataDir = join(runtimeRoot, "data");

  return {
    runtimeRoot,
    configFile: join(runtimeRoot, "config.json"),
    secretsFile: join(runtimeRoot, "secrets.json"),
    dataDir,
    databaseFile: join(dataDir, "chiron.db"),
    logsDir: join(runtimeRoot, "logs"),
  };
}
