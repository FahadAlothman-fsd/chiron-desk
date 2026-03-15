import { describe, expect, it, vi } from "vitest";
import { bootstrapDesktopShell } from "../../../main";

describe("desktop shell bootstrap", () => {
  it("attaches to an already running backend before loading the renderer", async () => {
    const loadURL = vi.fn().mockResolvedValue(undefined);
    const loadFile = vi.fn().mockResolvedValue(undefined);
    const show = vi.fn();
    const probe = vi.fn().mockResolvedValue(true);
    const sleep = vi.fn().mockResolvedValue(undefined);

    const status = await bootstrapDesktopShell({
      window: { loadURL, loadFile, show },
      rendererTarget: { mode: "url", target: "http://localhost:3001" },
      rendererReadiness: { probe, sleep, timeoutMs: 1000 },
      runtime: {
        probe: vi.fn().mockResolvedValue(true),
        startServer: vi.fn(),
        waitForReady: vi.fn(),
      },
    });

    expect(status).toEqual({ backend: "attached" });
    expect(probe).toHaveBeenCalledOnce();
    expect(loadURL).toHaveBeenCalledWith("http://localhost:3001");
    expect(show).toHaveBeenCalledOnce();
  });

  it("starts the backend before loading packaged renderer assets", async () => {
    const loadURL = vi.fn().mockResolvedValue(undefined);
    const loadFile = vi.fn().mockResolvedValue(undefined);
    const show = vi.fn();

    const status = await bootstrapDesktopShell({
      window: { loadURL, loadFile, show },
      rendererTarget: { mode: "file", target: "/repo/apps/web/dist/index.html" },
      runtime: {
        probe: vi.fn().mockResolvedValue(false),
        startServer: vi.fn().mockResolvedValue({ owned: true }),
        waitForReady: vi.fn().mockResolvedValue(undefined),
      },
    });

    expect(status).toEqual({ backend: "started" });
    expect(loadFile).toHaveBeenCalledWith("/repo/apps/web/dist/index.html");
    expect(show).toHaveBeenCalledOnce();
  });

  it("fails before showing the window when runtime startup fails", async () => {
    const loadURL = vi.fn().mockResolvedValue(undefined);
    const loadFile = vi.fn().mockResolvedValue(undefined);
    const show = vi.fn();

    await expect(
      bootstrapDesktopShell({
        window: { loadURL, loadFile, show },
        rendererTarget: { mode: "url", target: "http://localhost:3001" },
        runtime: {
          probe: vi.fn().mockResolvedValue(false),
          startServer: vi.fn().mockResolvedValue({ owned: true }),
          waitForReady: vi.fn().mockRejectedValue(new Error("timeout")),
        },
      }),
    ).rejects.toThrow(/Failed to start required local service/);

    expect(show).not.toHaveBeenCalled();
  });
});
