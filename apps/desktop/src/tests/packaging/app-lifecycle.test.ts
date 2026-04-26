import { describe, expect, it, vi } from "vitest";
import type { DesktopRuntimeStatus } from "@chiron/contracts/desktop-runtime";
import { resolveRendererTarget, runDesktopApp, startDesktopApp } from "../../../main";

function restoreRendererUrl(originalRendererUrl: string | undefined): void {
  if (originalRendererUrl === undefined) {
    delete process.env.ELECTRON_RENDERER_URL;
    return;
  }

  process.env.ELECTRON_RENDERER_URL = originalRendererUrl;
}

describe("desktop app lifecycle", () => {
  it("boots the shell after Electron is ready", async () => {
    const whenReady = vi.fn().mockResolvedValue(undefined);
    const handle = vi.fn();
    const probe = vi.fn().mockResolvedValue(true);
    const sleep = vi.fn().mockResolvedValue(undefined);
    const browserWindow = {
      loadURL: vi.fn().mockResolvedValue(undefined),
      loadFile: vi.fn().mockResolvedValue(undefined),
      show: vi.fn(),
    };
    const createBrowserWindow = vi.fn().mockReturnValue(browserWindow);

    const status = await startDesktopApp({
      app: { whenReady },
      ipcMain: { handle },
      createBrowserWindow,
      rendererTarget: { mode: "url", target: "http://localhost:3001" },
      rendererReadiness: { probe, sleep, timeoutMs: 1000 },
      runtime: {
        probe: vi.fn().mockResolvedValue(true),
        startServer: vi.fn(),
        waitForReady: vi.fn(),
      },
      getRuntimeStatus: () => ({ backend: "attached" }),
      recoverLocalServices: vi.fn().mockResolvedValue(undefined),
      selectProjectRootDirectory: vi.fn().mockResolvedValue(null),
      selectFiles: vi.fn().mockResolvedValue(null),
      onStartupError: vi.fn(),
    });

    expect(whenReady).toHaveBeenCalledOnce();
    expect(handle).toHaveBeenCalledTimes(4);
    expect(probe).toHaveBeenCalledOnce();
    expect(createBrowserWindow).toHaveBeenCalledOnce();
    expect(browserWindow.loadURL).toHaveBeenCalledWith("http://localhost:3001");
    expect(browserWindow.show).toHaveBeenCalledOnce();
    expect(status).toEqual({ backend: "attached" });
  });

  it("reports startup failures instead of swallowing them", async () => {
    const onStartupError = vi.fn();

    await expect(
      startDesktopApp({
        app: { whenReady: vi.fn().mockResolvedValue(undefined) },
        ipcMain: { handle: vi.fn() },
        createBrowserWindow: vi.fn().mockReturnValue({
          loadURL: vi.fn().mockResolvedValue(undefined),
          loadFile: vi.fn().mockResolvedValue(undefined),
          show: vi.fn(),
        }),
        rendererTarget: { mode: "url", target: "http://localhost:3001" },
        runtime: {
          probe: vi.fn().mockResolvedValue(false),
          startServer: vi.fn().mockResolvedValue({ owned: true }),
          waitForReady: vi.fn().mockRejectedValue(new Error("timeout")),
        },
        getRuntimeStatus: () => ({ backend: "attached" }),
        recoverLocalServices: vi.fn().mockResolvedValue(undefined),
        selectProjectRootDirectory: vi.fn().mockResolvedValue(null),
        selectFiles: vi.fn().mockResolvedValue(null),
        onStartupError,
      }),
    ).rejects.toThrow(/Failed to start required local service/);

    expect(onStartupError).toHaveBeenCalledOnce();
  });

  it("loads packaged renderer assets before showing the window", async () => {
    const browserWindow = {
      loadURL: vi.fn().mockResolvedValue(undefined),
      loadFile: vi.fn().mockResolvedValue(undefined),
      show: vi.fn(),
    };

    await startDesktopApp({
      app: { whenReady: vi.fn().mockResolvedValue(undefined) },
      ipcMain: { handle: vi.fn() },
      createBrowserWindow: vi.fn().mockReturnValue(browserWindow),
      rendererTarget: resolveRendererTarget({
        appRoot: "/opt/Chiron/resources/app.asar",
        resourcesPath: "/opt/Chiron/resources",
      }),
      runtime: {
        probe: vi.fn().mockResolvedValue(false),
        startServer: vi.fn().mockResolvedValue({ owned: true }),
        waitForReady: vi.fn().mockResolvedValue(undefined),
      },
      getRuntimeStatus: () => ({ backend: "attached" }),
      recoverLocalServices: vi.fn().mockResolvedValue(undefined),
      selectProjectRootDirectory: vi.fn().mockResolvedValue(null),
      selectFiles: vi.fn().mockResolvedValue(null),
      onStartupError: vi.fn(),
    });

    expect(browserWindow.loadURL).toHaveBeenCalledWith("chiron://app/");
    expect(browserWindow.show).toHaveBeenCalledOnce();
  });

  it("uses bootstrap-derived packaged runtime state without shell env", async () => {
    const originalRendererUrl = process.env.ELECTRON_RENDERER_URL;
    process.env.ELECTRON_RENDERER_URL = "http://localhost:3001";
    const startDesktopAppImpl: typeof startDesktopApp = vi.fn(async (options) => {
      expect(options.desktopRuntime).toEqual({
        backendUrl: "http://127.0.0.1:43110",
      });
      expect(options.rendererTarget).toEqual({
        mode: "url",
        target: "chiron://app/",
      });

      await options.runtime.startServer();

      const status: DesktopRuntimeStatus = { backend: "started" };
      return status;
    });
    const createOwnedRuntimeHandleImpl = vi.fn().mockResolvedValue({
      owned: true,
      stop: vi.fn().mockResolvedValue(undefined),
    });
    const app = {
      getPath: vi.fn().mockReturnValue("/tmp/chiron"),
      on: vi.fn(),
      quit: vi.fn(),
      whenReady: vi.fn().mockResolvedValue(undefined),
    };

    await runDesktopApp({
      appRoot: "/opt/Chiron/resources/app.asar",
      resourcesPath: "/opt/Chiron/resources",
      electronModule: {
        app,
        ipcMain: { handle: vi.fn() },
        BrowserWindow: vi.fn(),
        dialog: {
          showErrorBox: vi.fn(),
          showOpenDialog: vi.fn().mockResolvedValue({ canceled: true, filePaths: [] }),
        },
      },
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
      startDesktopAppImpl,
      createOwnedRuntimeHandleImpl,
    }).finally(() => {
      restoreRendererUrl(originalRendererUrl);
    });

    expect(app.getPath).toHaveBeenCalledWith("userData");
    expect(startDesktopAppImpl).toHaveBeenCalledOnce();
    expect(createOwnedRuntimeHandleImpl).toHaveBeenCalledWith(
      "/opt/Chiron/resources/app.asar",
      expect.objectContaining({
        resourcesPath: "/opt/Chiron/resources",
        logFilePath: "/tmp/chiron/runtime/logs/server.log",
        env: expect.objectContaining({
          PORT: "43110",
          DATABASE_URL: "file:///tmp/chiron/runtime/data/chiron.db",
          BETTER_AUTH_SECRET: "secret",
          BETTER_AUTH_URL: "http://127.0.0.1:43110",
          CORS_ORIGIN: "chiron://app",
        }),
      }),
    );
  });

  it("restores ELECTRON_RENDERER_URL when packaged startup fails", async () => {
    const originalRendererUrl = process.env.ELECTRON_RENDERER_URL;
    process.env.ELECTRON_RENDERER_URL = "http://localhost:3001";

    const failingStartup = runDesktopApp({
      appRoot: "/opt/Chiron/resources/app.asar",
      resourcesPath: "/opt/Chiron/resources",
      electronModule: {
        app: {
          getPath: vi.fn().mockReturnValue("/tmp/chiron"),
          on: vi.fn(),
          quit: vi.fn(),
          whenReady: vi.fn().mockResolvedValue(undefined),
        },
        ipcMain: { handle: vi.fn() },
        BrowserWindow: vi.fn(),
        dialog: {
          showErrorBox: vi.fn(),
          showOpenDialog: vi.fn().mockResolvedValue({ canceled: true, filePaths: [] }),
        },
      },
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
      startDesktopAppImpl: vi.fn(async () => {
        throw new Error("boom");
      }),
      createOwnedRuntimeHandleImpl: vi.fn().mockResolvedValue({
        owned: true,
        stop: vi.fn().mockResolvedValue(undefined),
      }),
    });

    await failingStartup
      .then(() => {
        throw new Error("expected startup to fail");
      })
      .catch((error: unknown) => {
        expect(error).toBeInstanceOf(Error);
        expect((error as Error).message).toContain("boom");
      });

    expect(process.env.ELECTRON_RENDERER_URL).toBe("http://localhost:3001");
    restoreRendererUrl(originalRendererUrl);
  });
});
