import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { resolveDesktopRuntimeMetadata } from "@chiron/contracts/desktop-runtime";
import { getBrowserWindowOptions, resolvePackagedRuntimeContext } from "../../../main";
import { pathToFileURL } from "node:url";

describe("packaged bootstrap smoke contract", () => {
  beforeEach(() => {
    vi.stubEnv("CHIRON_BACKEND_URL", "http://localhost:9999");
    vi.stubEnv("BETTER_AUTH_URL", "http://localhost:9999");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
    vi.unmock("@chiron/env/web");
    delete (globalThis as typeof globalThis & { window?: unknown }).window;
  });

  it("derives packaged runtime metadata from bootstrap state instead of shell env or baked web env", async () => {
    const runtimePaths = {
      runtimeRoot: "/tmp/chiron/runtime",
      configFile: "/tmp/chiron/runtime/config.json",
      secretsFile: "/tmp/chiron/runtime/secrets.json",
      dataDir: "/tmp/chiron/runtime/data",
      databaseFile: "/tmp/chiron/runtime/data/chiron.db",
      logsDir: "/tmp/chiron/runtime/logs",
    };
    const bootstrapRuntimeState = vi.fn().mockResolvedValue({
      paths: runtimePaths,
      config: {
        version: 1,
        mode: "local",
        server: { kind: "bundled", port: 43110 },
        database: {
          kind: "local",
          url: pathToFileURL(runtimePaths.databaseFile).href,
        },
      },
      secrets: { betterAuthSecret: "secret" },
    });

    const packagedRuntime = await resolvePackagedRuntimeContext({
      appRoot: "/opt/Chiron/resources/app.asar",
      resourcesPath: "/opt/Chiron/resources",
      userDataPath: "/tmp/chiron",
      bootstrapRuntimeState,
    });
    const browserWindowOptions = getBrowserWindowOptions({
      backendUrl: packagedRuntime.backendUrl,
    });
    const runtimeArgument = browserWindowOptions.webPreferences?.additionalArguments?.[0];

    vi.doMock("@chiron/env/web", () => ({
      env: { VITE_SERVER_URL: "http://localhost:3000" },
    }));

    (
      globalThis as typeof globalThis & {
        window: { desktop: { runtime: ReturnType<typeof resolveDesktopRuntimeMetadata> } };
      }
    ).window = {
      desktop: {
        runtime: resolveDesktopRuntimeMetadata(["electron", "app", runtimeArgument ?? ""]),
      },
    };

    const { resolveRuntimeBackendUrl } = await import("../../../../web/src/lib/runtime-backend");

    expect(bootstrapRuntimeState).toHaveBeenCalledWith(
      expect.objectContaining({ userDataPath: "/tmp/chiron" }),
    );
    expect(packagedRuntime.backendUrl).toBe("http://127.0.0.1:43110");
    expect(packagedRuntime.runtimeEnv).toMatchObject({
      DATABASE_URL: pathToFileURL(runtimePaths.databaseFile).href,
      BETTER_AUTH_SECRET: "secret",
      BETTER_AUTH_URL: "http://127.0.0.1:43110",
      CORS_ORIGIN: "http://127.0.0.1:43110",
    });
    expect(runtimeArgument).toBeTruthy();
    expect(resolveDesktopRuntimeMetadata(["electron", "app", runtimeArgument ?? ""])).toEqual({
      backendUrl: "http://127.0.0.1:43110",
    });
    expect(resolveRuntimeBackendUrl()).toBe("http://127.0.0.1:43110");
  });
});
