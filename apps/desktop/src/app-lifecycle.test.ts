import { describe, expect, it, vi } from "vitest";
import { resolveRendererTarget, startDesktopApp } from "../main";

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
      onStartupError: vi.fn(),
    });

    expect(whenReady).toHaveBeenCalledOnce();
    expect(handle).toHaveBeenCalledTimes(2);
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
      onStartupError: vi.fn(),
    });

    expect(browserWindow.loadFile).toHaveBeenCalledWith(
      "/opt/Chiron/resources/web-dist/index.html",
    );
    expect(browserWindow.show).toHaveBeenCalledOnce();
  });
});
