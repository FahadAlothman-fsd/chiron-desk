import { describe, expect, it, vi } from "vitest";
import {
  desktopApi,
  desktopApiKeys,
  exposeDesktopBridge,
  resolveDesktopRuntimeMetadata,
} from "../../../preload";

describe("preload bridge contract", () => {
  it("exposes only the approved desktop api surface", () => {
    expect(desktopApiKeys).toEqual([
      "runtime",
      "getRuntimeStatus",
      "recoverLocalServices",
      "selectProjectRootDirectory",
    ]);
  });

  it("reads packaged runtime metadata from desktop launch arguments", () => {
    expect(
      resolveDesktopRuntimeMetadata([
        "electron",
        "app",
        "--chiron-runtime-backend-url=http%3A%2F%2F127.0.0.1%3A43110",
      ]),
    ).toEqual({
      backendUrl: "http://127.0.0.1:43110",
    });
  });

  it("exposes the bridge through contextBridge when isolation is enabled", () => {
    const exposeInMainWorld = vi.fn();

    exposeDesktopBridge(desktopApi, {
      contextIsolated: true,
      exposeInMainWorld,
      logger: {
        warn: vi.fn(),
        error: vi.fn(),
      },
    });

    expect(exposeInMainWorld).toHaveBeenCalledWith("desktop", desktopApi);
  });

  it("falls back to direct assignment when isolation is disabled", () => {
    const warn = vi.fn();
    const error = vi.fn();

    delete (globalThis as { desktop?: typeof desktopApi }).desktop;

    exposeDesktopBridge(desktopApi, {
      contextIsolated: false,
      logger: {
        warn,
        error,
      },
    });

    expect((globalThis as { desktop?: typeof desktopApi }).desktop).toBe(desktopApi);
    expect(warn).toHaveBeenCalledOnce();
    expect(error).not.toHaveBeenCalled();

    delete (globalThis as { desktop?: typeof desktopApi }).desktop;
  });
});
