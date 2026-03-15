import { join } from "node:path";
import { describe, expect, it } from "vitest";

import { resolveRuntimePaths } from "../../runtime-paths";

describe("resolveRuntimePaths", () => {
  it("derives runtime files under Electron userData", () => {
    const paths = resolveRuntimePaths("/home/alice/.config/Chiron");
    const runtimeRoot = join("/home/alice/.config/Chiron", "runtime");

    expect(paths.runtimeRoot).toBe(runtimeRoot);
    expect(paths.configFile).toBe(join(runtimeRoot, "config.json"));
    expect(paths.secretsFile).toBe(join(runtimeRoot, "secrets.json"));
    expect(paths.dataDir).toBe(join(runtimeRoot, "data"));
    expect(paths.databaseFile).toBe(join(runtimeRoot, "data", "chiron.db"));
    expect(paths.logsDir).toBe(join(runtimeRoot, "logs"));
  });
});
