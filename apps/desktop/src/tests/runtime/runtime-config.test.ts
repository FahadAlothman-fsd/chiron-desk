import { describe, expect, it } from "vitest";

import { createDefaultRuntimeConfig, migrateRuntimeConfig } from "../../runtime-config";

describe("runtime config", () => {
  it("creates default local config", () => {
    const config = createDefaultRuntimeConfig({
      port: 43110,
      databaseUrl: "file:/tmp/chiron.db",
    });

    expect(config).toEqual({
      version: 1,
      mode: "local",
      server: { kind: "bundled", port: 43110 },
      database: { kind: "local", url: "file:/tmp/chiron.db" },
    });
  });

  it("rejects invalid default port values", () => {
    expect(() =>
      createDefaultRuntimeConfig({
        port: 0,
        databaseUrl: "file:/tmp/chiron.db",
      }),
    ).toThrow("Invalid runtime config payload");
  });

  it("keeps version 1 configs unchanged", () => {
    const config = {
      version: 1,
      mode: "local",
      server: { kind: "bundled", port: 43110 },
      database: { kind: "local", url: "file:/tmp/chiron.db" },
    };

    expect(migrateRuntimeConfig(config)).toEqual(config);
  });

  it("rejects unsupported persisted config", () => {
    expect(() =>
      migrateRuntimeConfig({
        version: 2,
        mode: "remote",
      }),
    ).toThrow("Unsupported runtime config version: 2");

    expect(() =>
      migrateRuntimeConfig({
        mode: "local",
      }),
    ).toThrow("Unsupported runtime config version: unknown");
  });

  it("rejects malformed version 1 configs", () => {
    expect(() =>
      migrateRuntimeConfig({
        version: 1,
        mode: "local",
        server: { kind: "bundled", port: 43110 },
      }),
    ).toThrow("Invalid runtime config payload");
  });

  it("rejects invalid persisted port values", () => {
    expect(() =>
      migrateRuntimeConfig({
        version: 1,
        mode: "local",
        server: { kind: "bundled", port: -1 },
        database: { kind: "local", url: "file:/tmp/chiron.db" },
      }),
    ).toThrow("Invalid runtime config payload");

    expect(() =>
      migrateRuntimeConfig({
        version: 1,
        mode: "local",
        server: { kind: "bundled", port: 0 },
        database: { kind: "local", url: "file:/tmp/chiron.db" },
      }),
    ).toThrow("Invalid runtime config payload");

    expect(() =>
      migrateRuntimeConfig({
        version: 1,
        mode: "local",
        server: { kind: "bundled", port: 65_536 },
        database: { kind: "local", url: "file:/tmp/chiron.db" },
      }),
    ).toThrow("Invalid runtime config payload");

    expect(() =>
      migrateRuntimeConfig({
        version: 1,
        mode: "local",
        server: { kind: "bundled", port: 43_110.5 },
        database: { kind: "local", url: "file:/tmp/chiron.db" },
      }),
    ).toThrow("Invalid runtime config payload");
  });
});
