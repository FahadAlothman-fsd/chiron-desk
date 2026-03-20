import { mkdtemp, readFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { describe, expect, it, vi } from "vitest";
import serverPackage from "../../../../server/package.json";
import {
  chooseAvailablePort,
  createOwnedRuntimeHandle,
  ensureRuntimeReady,
  resolvePackagedRuntimeContext,
  resolveRendererOrigin,
  resolveRuntimeLaunch,
  resolveServerScript,
  writeTextFile,
  writeJsonFile,
} from "../../../main";

describe("runtime orchestration contract", () => {
  it("requires the server headless start contract", () => {
    expect(serverPackage.scripts["start:headless"]).toBeTruthy();
  });

  it("attaches when the backend probe is already healthy", async () => {
    const result = await ensureRuntimeReady({
      probe: vi.fn().mockResolvedValue(true),
      startServer: vi.fn(),
      waitForReady: vi.fn(),
    });

    expect(result.mode).toBe("attached");
  });

  it("starts and waits when the backend is absent", async () => {
    const startServer = vi.fn().mockResolvedValue({ owned: true });
    const waitForReady = vi.fn().mockResolvedValue(undefined);

    const result = await ensureRuntimeReady({
      probe: vi.fn().mockResolvedValue(false),
      startServer,
      waitForReady,
    });

    expect(startServer).toHaveBeenCalledOnce();
    expect(waitForReady).toHaveBeenCalledOnce();
    expect(result.mode).toBe("started");
  });

  it("fails clearly when readiness never succeeds", async () => {
    await expect(
      ensureRuntimeReady({
        probe: vi.fn().mockResolvedValue(false),
        startServer: vi.fn().mockResolvedValue({ owned: true }),
        waitForReady: vi.fn().mockRejectedValue(new Error("timeout")),
      }),
    ).rejects.toThrow(/Failed to start required local service/);
  });

  it("uses the dev server script when running against a dev renderer", () => {
    expect(resolveServerScript({ devServerUrl: "http://localhost:3001" })).toBe("dev");
  });

  it("uses the headless built server script for packaged startup", () => {
    expect(resolveServerScript({})).toBe("start:headless");
  });

  it("starts the dev server from the source workspace when using a dev renderer", () => {
    expect(
      resolveRuntimeLaunch({
        appRoot: "/repo/apps/desktop",
        devServerUrl: "http://localhost:3001",
      }),
    ).toEqual({
      command: "bun",
      args: ["run", "dev"],
      cwd: "/repo/apps/server",
    });
  });

  it("starts the packaged server binary from bundled resources", () => {
    expect(
      resolveRuntimeLaunch({
        appRoot: "/opt/Chiron/resources/app.asar",
        resourcesPath: "/opt/Chiron/resources",
      }),
    ).toEqual({
      command: "/opt/Chiron/resources/server-dist/bun",
      args: ["server.mjs"],
      cwd: "/opt/Chiron/resources/server-dist",
    });
  });

  it("derives packaged backend env from bootstrap state", async () => {
    const result = await resolvePackagedRuntimeContext({
      appRoot: "/opt/Chiron/resources/app.asar",
      resourcesPath: "/opt/Chiron/resources",
      userDataPath: "/tmp/chiron",
      bootstrapRuntimeState: vi.fn().mockResolvedValue({
        paths: {
          runtimeRoot: "/tmp/chiron/runtime",
          configFile: "/tmp/chiron/runtime/config.json",
          secretsFile: "/tmp/chiron/runtime/secrets.json",
          dataDir: "/tmp/chiron/runtime/data",
          databaseFile: "/tmp/chiron/runtime/data/chiron.db",
          logsDir: "/tmp/chiron/runtime/logs",
        },
        config: {
          version: 1,
          mode: "local",
          server: { kind: "bundled", port: 43110 },
          database: {
            kind: "local",
            url: "file:///tmp/chiron/runtime/data/chiron.db",
          },
        },
        secrets: { betterAuthSecret: "secret" },
      }),
    });

    expect(result.backendUrl).toBe("http://127.0.0.1:43110");
    expect(result.rendererTarget).toEqual({
      mode: "file",
      target: "/opt/Chiron/resources/web-dist/index.html",
    });
    expect(result.runtimeEnv).toMatchObject({
      DATABASE_URL: "file:///tmp/chiron/runtime/data/chiron.db",
      BETTER_AUTH_SECRET: "secret",
      BETTER_AUTH_URL: "http://127.0.0.1:43110",
      CORS_ORIGIN: "http://127.0.0.1:43110",
    });
  });

  it("launches the packaged server with bootstrap-derived env", async () => {
    const originalMarker = process.env.CHIRON_TEST_LEAK;
    process.env.CHIRON_TEST_LEAK = "should-not-leak";
    const spawn = vi.fn().mockReturnValue({
      exitCode: 0,
      kill: vi.fn(),
      once: vi.fn(),
      on: vi.fn(),
    });

    await createOwnedRuntimeHandle("/opt/Chiron/resources/app.asar", {
      resourcesPath: "/opt/Chiron/resources",
      env: {
        DATABASE_URL: "file:///tmp/chiron/runtime/data/chiron.db",
        BETTER_AUTH_SECRET: "secret",
        BETTER_AUTH_URL: "http://127.0.0.1:43110",
        CORS_ORIGIN: "http://127.0.0.1:43110",
      },
      spawn,
    });

    expect(spawn).toHaveBeenCalledWith("/opt/Chiron/resources/server-dist/bun", ["server.mjs"], {
      cwd: "/opt/Chiron/resources/server-dist",
      env: {
        DATABASE_URL: "file:///tmp/chiron/runtime/data/chiron.db",
        BETTER_AUTH_SECRET: "secret",
        BETTER_AUTH_URL: "http://127.0.0.1:43110",
        CORS_ORIGIN: "http://127.0.0.1:43110",
      },
      stdio: "inherit",
    });
    expect(spawn.mock.calls[0]?.[2]?.env.CHIRON_TEST_LEAK).toBeUndefined();
    process.env.CHIRON_TEST_LEAK = originalMarker;
  });

  it("derives a null origin for packaged file renderers", () => {
    expect(
      resolveRendererOrigin({
        mode: "file",
        target: "/opt/Chiron/resources/web-dist/index.html",
      }),
    ).toBe("null");
  });

  it("reuses the preferred port when it is available", async () => {
    const net = await import("node:net");
    const server = await new Promise<import("node:net").AddressInfo>((resolve, reject) => {
      const netServer = net.default.createServer();
      netServer.once("error", reject);
      netServer.listen(0, "127.0.0.1", () => {
        const address = netServer.address();

        if (!address || typeof address === "string") {
          netServer.close(() => reject(new Error("failed to allocate preferred port")));
          return;
        }

        netServer.close((error) => {
          if (error) {
            reject(error);
            return;
          }

          resolve(address);
        });
      });
    });

    await expect(chooseAvailablePort(server.port)).resolves.toBe(server.port);
  });

  it("falls back when the preferred port is occupied", async () => {
    const net = await import("node:net");
    const occupiedServer = net.default.createServer();

    const address = await new Promise<import("node:net").AddressInfo>((resolve, reject) => {
      occupiedServer.once("error", reject);
      occupiedServer.listen(0, "127.0.0.1", () => {
        const currentAddress = occupiedServer.address();

        if (!currentAddress || typeof currentAddress === "string") {
          occupiedServer.close(() => reject(new Error("failed to occupy preferred port")));
          return;
        }

        resolve(currentAddress);
      });
    });

    await chooseAvailablePort(address.port)
      .then((port) => {
        expect(port).not.toBe(address.port);
      })
      .finally(async () => {
        await new Promise<void>((resolve, reject) => {
          occupiedServer.close((error) => {
            if (error) {
              reject(error);
              return;
            }

            resolve();
          });
        });
      });
  });

  it("propagates non-EADDRINUSE preferred-port errors", async () => {
    const error = Object.assign(new Error("denied"), { code: "EACCES" });
    const reserve = vi.fn().mockRejectedValueOnce(error).mockResolvedValueOnce(43111);

    await expect(chooseAvailablePort(43110, reserve)).rejects.toThrow("denied");
    expect(reserve).toHaveBeenCalledOnce();
    expect(reserve).toHaveBeenCalledWith(43110);
  });

  it("writes json strings through the json writer", async () => {
    const directory = await mkdtemp(join(tmpdir(), "chiron-desktop-"));
    const filePath = join(directory, "config.json.bak");

    await writeJsonFile(filePath, "oops");

    await expect(readFile(filePath, "utf8")).resolves.toBe('"oops"\n');
  });

  it("writes raw backup strings without JSON re-encoding", async () => {
    const directory = await mkdtemp(join(tmpdir(), "chiron-desktop-"));
    const filePath = join(directory, "config.json.bak");

    await writeTextFile(filePath, "{");

    await expect(readFile(filePath, "utf8")).resolves.toBe("{");
  });

  it("writes parsed string backups as valid json strings", async () => {
    const directory = await mkdtemp(join(tmpdir(), "chiron-desktop-"));
    const filePath = join(directory, "config.json.bak");

    await writeTextFile(filePath, '"oops"\n');

    await expect(readFile(filePath, "utf8")).resolves.toBe('"oops"\n');
  });
});
