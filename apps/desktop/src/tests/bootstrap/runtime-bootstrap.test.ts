import { pathToFileURL } from "node:url";

import { describe, expect, it, vi } from "vitest";

import { bootstrapRuntimeState, createCorruptJsonFile } from "../../runtime-bootstrap";

describe("bootstrapRuntimeState", () => {
  it("creates first-run config and secrets when missing", async () => {
    const ensureDir = vi.fn().mockResolvedValue(undefined);
    const choosePort = vi.fn().mockResolvedValue(43110);
    const readJson = vi.fn().mockResolvedValueOnce(undefined).mockResolvedValueOnce(undefined);
    const writeText = vi.fn().mockResolvedValue(undefined);
    const writeJson = vi.fn().mockResolvedValue(undefined);

    const result = await bootstrapRuntimeState({
      userDataPath: "/tmp/chiron",
      choosePort,
      readJson,
      writeText,
      writeJson,
      ensureDir,
    });

    expect(ensureDir).toHaveBeenNthCalledWith(1, "/tmp/chiron/runtime");
    expect(ensureDir).toHaveBeenNthCalledWith(2, "/tmp/chiron/runtime/data");
    expect(ensureDir).toHaveBeenNthCalledWith(3, "/tmp/chiron/runtime/logs");
    expect(choosePort).toHaveBeenCalledOnce();
    expect(readJson).toHaveBeenNthCalledWith(1, "/tmp/chiron/runtime/config.json");
    expect(readJson).toHaveBeenNthCalledWith(2, "/tmp/chiron/runtime/secrets.json");
    expect(result.paths).toEqual({
      runtimeRoot: "/tmp/chiron/runtime",
      configFile: "/tmp/chiron/runtime/config.json",
      secretsFile: "/tmp/chiron/runtime/secrets.json",
      dataDir: "/tmp/chiron/runtime/data",
      databaseFile: "/tmp/chiron/runtime/data/chiron.db",
      logsDir: "/tmp/chiron/runtime/logs",
    });
    expect(result.config.mode).toBe("local");
    expect(result.config.server.port).toBe(43110);
    expect(result.config.database.url).toBe(
      pathToFileURL("/tmp/chiron/runtime/data/chiron.db").href,
    );
    expect(result.secrets.betterAuthSecret.length).toBeGreaterThan(20);
    expect(writeJson).toHaveBeenNthCalledWith(
      1,
      "/tmp/chiron/runtime/config.json",
      expect.objectContaining({
        version: 1,
        mode: "local",
        server: { kind: "bundled", port: 43110 },
        database: {
          kind: "local",
          url: pathToFileURL("/tmp/chiron/runtime/data/chiron.db").href,
        },
      }),
    );
    expect(writeJson).toHaveBeenNthCalledWith(
      2,
      "/tmp/chiron/runtime/secrets.json",
      expect.objectContaining({
        betterAuthSecret: expect.any(String),
      }),
    );
    expect(writeText).not.toHaveBeenCalled();
  });

  it("reuses persisted config and secrets without rewriting", async () => {
    const persistedConfig = {
      version: 1 as const,
      mode: "local" as const,
      server: { kind: "bundled" as const, port: 43110 },
      database: {
        kind: "local" as const,
        url: pathToFileURL("/tmp/chiron/runtime/data/chiron.db").href,
      },
    };
    const persistedSecrets = { betterAuthSecret: "fixed" };
    const choosePort = vi.fn().mockResolvedValue(43110);
    const writeText = vi.fn();
    const writeJson = vi.fn();

    const result = await bootstrapRuntimeState({
      userDataPath: "/tmp/chiron",
      choosePort,
      readJson: vi
        .fn()
        .mockResolvedValueOnce(persistedConfig)
        .mockResolvedValueOnce(persistedSecrets),
      writeText,
      writeJson,
      ensureDir: vi.fn().mockResolvedValue(undefined),
    });

    expect(result.config).toEqual(persistedConfig);
    expect(result.secrets).toEqual(persistedSecrets);
    expect(choosePort).toHaveBeenCalledOnce();
    expect(choosePort).toHaveBeenCalledWith(43110);
    expect(writeText).not.toHaveBeenCalled();
    expect(writeJson).not.toHaveBeenCalled();
  });

  it("rejects invalid persisted secrets instead of silently regenerating", async () => {
    await expect(
      bootstrapRuntimeState({
        userDataPath: "/tmp/chiron",
        choosePort: vi.fn().mockResolvedValue(43110),
        readJson: vi
          .fn()
          .mockResolvedValueOnce({
            version: 1,
            mode: "local",
            server: { kind: "bundled", port: 43110 },
            database: {
              kind: "local",
              url: pathToFileURL("/tmp/chiron/runtime/data/chiron.db").href,
            },
          })
          .mockResolvedValueOnce(null),
        writeText: vi.fn(),
        writeJson: vi.fn(),
        ensureDir: vi.fn().mockResolvedValue(undefined),
      }),
    ).rejects.toThrow("Invalid runtime secrets payload");
  });

  it("backs up corrupt config and regenerates it", async () => {
    const choosePort = vi.fn().mockResolvedValue(43110);
    const writeText = vi.fn().mockResolvedValue(undefined);
    const writeJson = vi.fn().mockResolvedValue(undefined);
    const persistedSecrets = { betterAuthSecret: "fixed" };

    const result = await bootstrapRuntimeState({
      userDataPath: "/tmp/chiron",
      choosePort,
      readJson: vi.fn().mockResolvedValueOnce(null).mockResolvedValueOnce(persistedSecrets),
      writeText,
      writeJson,
      ensureDir: vi.fn().mockResolvedValue(undefined),
    });

    expect(result.config).toEqual({
      version: 1,
      mode: "local",
      server: { kind: "bundled", port: 43110 },
      database: {
        kind: "local",
        url: pathToFileURL("/tmp/chiron/runtime/data/chiron.db").href,
      },
    });
    expect(result.secrets).toEqual(persistedSecrets);
    expect(writeText).not.toHaveBeenCalled();
    expect(writeJson).toHaveBeenNthCalledWith(1, "/tmp/chiron/runtime/config.json.bak", null);
    expect(writeJson).toHaveBeenNthCalledWith(2, "/tmp/chiron/runtime/config.json", {
      version: 1,
      mode: "local",
      server: { kind: "bundled", port: 43110 },
      database: {
        kind: "local",
        url: pathToFileURL("/tmp/chiron/runtime/data/chiron.db").href,
      },
    });
  });

  it("backs up malformed config json and regenerates it", async () => {
    const choosePort = vi.fn().mockResolvedValue(43110);
    const writeText = vi.fn().mockResolvedValue(undefined);
    const writeJson = vi.fn().mockResolvedValue(undefined);
    const persistedSecrets = { betterAuthSecret: "fixed" };

    const result = await bootstrapRuntimeState({
      userDataPath: "/tmp/chiron",
      choosePort,
      readJson: vi
        .fn()
        .mockResolvedValueOnce(createCorruptJsonFile("{"))
        .mockResolvedValueOnce(persistedSecrets),
      writeText,
      writeJson,
      ensureDir: vi.fn().mockResolvedValue(undefined),
    });

    expect(result.config).toEqual({
      version: 1,
      mode: "local",
      server: { kind: "bundled", port: 43110 },
      database: {
        kind: "local",
        url: pathToFileURL("/tmp/chiron/runtime/data/chiron.db").href,
      },
    });
    expect(writeText).toHaveBeenNthCalledWith(1, "/tmp/chiron/runtime/config.json.bak", "{");
    expect(writeJson).toHaveBeenNthCalledWith(1, "/tmp/chiron/runtime/config.json", {
      version: 1,
      mode: "local",
      server: { kind: "bundled", port: 43110 },
      database: {
        kind: "local",
        url: pathToFileURL("/tmp/chiron/runtime/data/chiron.db").href,
      },
    });
  });

  it("backs up parsed string configs without losing json encoding", async () => {
    const choosePort = vi.fn().mockResolvedValue(43110);
    const writeText = vi.fn().mockResolvedValue(undefined);
    const writeJson = vi.fn().mockResolvedValue(undefined);
    const persistedSecrets = { betterAuthSecret: "fixed" };

    const result = await bootstrapRuntimeState({
      userDataPath: "/tmp/chiron",
      choosePort,
      readJson: vi.fn().mockResolvedValueOnce("oops").mockResolvedValueOnce(persistedSecrets),
      writeText,
      writeJson,
      ensureDir: vi.fn().mockResolvedValue(undefined),
    });

    expect(result.config.server.port).toBe(43110);
    expect(result.secrets).toEqual(persistedSecrets);
    expect(writeText).not.toHaveBeenCalled();
    expect(writeJson).toHaveBeenNthCalledWith(1, "/tmp/chiron/runtime/config.json.bak", "oops");
    expect(writeJson).toHaveBeenNthCalledWith(
      2,
      "/tmp/chiron/runtime/config.json",
      expect.objectContaining({
        server: { kind: "bundled", port: 43110 },
      }),
    );
  });

  it("creates secrets when config exists but secrets are missing", async () => {
    const persistedConfig = {
      version: 1 as const,
      mode: "local" as const,
      server: { kind: "bundled" as const, port: 43110 },
      database: {
        kind: "local" as const,
        url: pathToFileURL("/tmp/chiron/runtime/data/chiron.db").href,
      },
    };
    const choosePort = vi.fn().mockResolvedValue(43110);
    const writeText = vi.fn().mockResolvedValue(undefined);
    const writeJson = vi.fn().mockResolvedValue(undefined);

    const result = await bootstrapRuntimeState({
      userDataPath: "/tmp/chiron",
      choosePort,
      readJson: vi.fn().mockResolvedValueOnce(persistedConfig).mockResolvedValueOnce(undefined),
      writeText,
      writeJson,
      ensureDir: vi.fn().mockResolvedValue(undefined),
    });

    expect(result.config).toEqual(persistedConfig);
    expect(result.secrets.betterAuthSecret).toEqual(expect.any(String));
    expect(result.secrets.betterAuthSecret.length).toBeGreaterThan(20);
    expect(choosePort).toHaveBeenCalledOnce();
    expect(choosePort).toHaveBeenCalledWith(43110);
    expect(writeText).not.toHaveBeenCalled();
    expect(writeJson).toHaveBeenCalledOnce();
    expect(writeJson).toHaveBeenCalledWith(
      "/tmp/chiron/runtime/secrets.json",
      expect.objectContaining({
        betterAuthSecret: expect.any(String),
      }),
    );
  });

  it("creates config when secrets exist but config is missing", async () => {
    const persistedSecrets = { betterAuthSecret: "fixed" };
    const choosePort = vi.fn().mockResolvedValue(43110);
    const writeText = vi.fn().mockResolvedValue(undefined);
    const writeJson = vi.fn().mockResolvedValue(undefined);

    const result = await bootstrapRuntimeState({
      userDataPath: "/tmp/chiron",
      choosePort,
      readJson: vi.fn().mockResolvedValueOnce(undefined).mockResolvedValueOnce(persistedSecrets),
      writeText,
      writeJson,
      ensureDir: vi.fn().mockResolvedValue(undefined),
    });

    expect(result.config).toEqual({
      version: 1,
      mode: "local",
      server: { kind: "bundled", port: 43110 },
      database: {
        kind: "local",
        url: pathToFileURL("/tmp/chiron/runtime/data/chiron.db").href,
      },
    });
    expect(result.secrets).toEqual(persistedSecrets);
    expect(choosePort).toHaveBeenCalledOnce();
    expect(writeText).not.toHaveBeenCalled();
    expect(writeJson).toHaveBeenCalledOnce();
    expect(writeJson).toHaveBeenCalledWith("/tmp/chiron/runtime/config.json", {
      version: 1,
      mode: "local",
      server: { kind: "bundled", port: 43110 },
      database: {
        kind: "local",
        url: pathToFileURL("/tmp/chiron/runtime/data/chiron.db").href,
      },
    });
  });

  it("falls back to a new port when the persisted one is unavailable", async () => {
    const persistedConfig = {
      version: 1 as const,
      mode: "local" as const,
      server: { kind: "bundled" as const, port: 43110 },
      database: {
        kind: "local" as const,
        url: pathToFileURL("/tmp/chiron/runtime/data/chiron.db").href,
      },
    };
    const persistedSecrets = { betterAuthSecret: "fixed" };
    const choosePort = vi.fn().mockResolvedValue(43111);
    const writeText = vi.fn().mockResolvedValue(undefined);
    const writeJson = vi.fn().mockResolvedValue(undefined);

    const result = await bootstrapRuntimeState({
      userDataPath: "/tmp/chiron",
      choosePort,
      readJson: vi
        .fn()
        .mockResolvedValueOnce(persistedConfig)
        .mockResolvedValueOnce(persistedSecrets),
      writeText,
      writeJson,
      ensureDir: vi.fn().mockResolvedValue(undefined),
    });

    expect(choosePort).toHaveBeenCalledWith(43110);
    expect(result.config).toEqual({
      version: 1,
      mode: "local",
      server: { kind: "bundled", port: 43111 },
      database: {
        kind: "local",
        url: pathToFileURL("/tmp/chiron/runtime/data/chiron.db").href,
      },
    });
    expect(result.secrets).toEqual(persistedSecrets);
    expect(writeText).not.toHaveBeenCalled();
    expect(writeJson).toHaveBeenCalledOnce();
    expect(writeJson).toHaveBeenCalledWith("/tmp/chiron/runtime/config.json", {
      version: 1,
      mode: "local",
      server: { kind: "bundled", port: 43111 },
      database: {
        kind: "local",
        url: pathToFileURL("/tmp/chiron/runtime/data/chiron.db").href,
      },
    });
  });

  it("propagates port selection failures for valid persisted config", async () => {
    const persistedConfig = {
      version: 1 as const,
      mode: "local" as const,
      server: { kind: "bundled" as const, port: 43110 },
      database: {
        kind: "local" as const,
        url: "file:///custom.db",
      },
    };
    const writeJson = vi.fn().mockResolvedValue(undefined);
    const writeText = vi.fn().mockResolvedValue(undefined);

    await expect(
      bootstrapRuntimeState({
        userDataPath: "/tmp/chiron",
        choosePort: vi.fn().mockRejectedValue(new Error("port failed")),
        readJson: vi
          .fn()
          .mockResolvedValueOnce(persistedConfig)
          .mockResolvedValueOnce({ betterAuthSecret: "fixed" }),
        writeText,
        writeJson,
        ensureDir: vi.fn().mockResolvedValue(undefined),
      }),
    ).rejects.toThrow("port failed");

    expect(writeText).not.toHaveBeenCalled();
    expect(writeJson).not.toHaveBeenCalledWith(
      "/tmp/chiron/runtime/config.json.bak",
      expect.anything(),
    );
  });

  it("propagates config rewrite failures for valid persisted config", async () => {
    const persistedConfig = {
      version: 1 as const,
      mode: "local" as const,
      server: { kind: "bundled" as const, port: 43110 },
      database: {
        kind: "local" as const,
        url: "file:///custom.db",
      },
    };

    const writeText = vi.fn().mockResolvedValue(undefined);
    const writeJson = vi.fn().mockRejectedValue(new Error("write failed"));

    await expect(
      bootstrapRuntimeState({
        userDataPath: "/tmp/chiron",
        choosePort: vi.fn().mockResolvedValue(43111),
        readJson: vi
          .fn()
          .mockResolvedValueOnce(persistedConfig)
          .mockResolvedValueOnce({ betterAuthSecret: "fixed" }),
        writeText,
        writeJson,
        ensureDir: vi.fn().mockResolvedValue(undefined),
      }),
    ).rejects.toThrow("write failed");

    expect(writeText).not.toHaveBeenCalled();
    expect(writeJson).not.toHaveBeenCalledWith(
      "/tmp/chiron/runtime/config.json.bak",
      expect.anything(),
    );
  });

  it("propagates unsupported config versions instead of regenerating them", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    const writeJson = vi.fn().mockResolvedValue(undefined);

    await expect(
      bootstrapRuntimeState({
        userDataPath: "/tmp/chiron",
        choosePort: vi.fn().mockResolvedValue(43110),
        readJson: vi
          .fn()
          .mockResolvedValueOnce({ version: 2, mode: "local" })
          .mockResolvedValueOnce({ betterAuthSecret: "fixed" }),
        writeText,
        writeJson,
        ensureDir: vi.fn().mockResolvedValue(undefined),
      }),
    ).rejects.toThrow("Unsupported runtime config version: 2");

    expect(writeText).not.toHaveBeenCalled();
    expect(writeJson).not.toHaveBeenCalled();
  });
});
